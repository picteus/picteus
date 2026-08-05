import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import Bottleneck from "bottleneck";

import { logger } from "../logger";
import { ManifestThrottlingPolicy } from "../dtos/extension.dtos";


class ExtensionLimiters
{

  readonly perEventThrottlingPoliciesMap: Map<string, ManifestThrottlingPolicy> = new Map<string, ManifestThrottlingPolicy>();

  readonly perEventBottlenecksMap: Map<string, Bottleneck> = new Map<string, Bottleneck>();

}

export class ExtensionTaskExecutorError extends Error
{

}

@Injectable()
export class ExtensionTaskExecutor
  implements OnModuleInit, OnModuleDestroy
{

  private readonly perExtensionIdLimitersMap = new Map<string, ExtensionLimiters>();

  private readonly perExtensionIdControllerMap = new Map<string, AbortController>();

  private readonly gernalAbortController = new AbortController();

  constructor()
  {
    logger.debug("Instantiating an ExtensionTaskManager");
  }

  async onModuleInit(): Promise<void>
  {
    logger.debug("The initializing of an ExtensionTaskExecutor is over");
  }

  async onModuleDestroy(): Promise<void>
  {
    logger.debug("Destroying an ExtensionTaskExecutor");
    this.gernalAbortController.abort();
    const extensionIds = [ ...this.perExtensionIdLimitersMap.keys() ];
    for (const extensionId of extensionIds)
    {
      await this.offExtension(extensionId);
    }
    logger.debug("Destroyed an ExtensionTaskExecutor");
  }

  onExtension(extensionId: string, _index: number, throttlingPolicies: ManifestThrottlingPolicy[] | undefined): void
  {
    logger.info(`Registering the throttling for the extension with id '${extensionId}'`);
    this.perExtensionIdControllerMap.set(extensionId, new AbortController());
    if (throttlingPolicies !== undefined && this.perExtensionIdLimitersMap.get(extensionId) === undefined)
    {
      const limiters = new ExtensionLimiters();
      this.perExtensionIdLimitersMap.set(extensionId, limiters);
      for (const throttling of throttlingPolicies)
      {
        for (const event of throttling.events)
        {
          limiters.perEventThrottlingPoliciesMap.set(event, throttling);
        }
        logger.info(`Registering the throttling policy instructions for the extension with id '${extensionId}' and the events [${throttling.events.map(event => `'${event}'`).join(", ")}]`);
      }
    }
  }

  async offExtension(extensionId: string): Promise<void>
  {
    logger.info(`Unregistering the throttling for the extension with id '${extensionId}'`);
    const limiters = this.perExtensionIdLimitersMap.get(extensionId);
    if (limiters !== undefined)
    {
      // We immediately remove the limiters from the map to avoid new tasks being scheduled while we stop the bottlenecks
      this.perExtensionIdLimitersMap.delete(extensionId);
      const controller = this.perExtensionIdControllerMap.get(extensionId)!;
      this.perExtensionIdControllerMap.delete(extensionId);
      const alreadyStoppedBottlenecks = new Set<Bottleneck>();
      for (const bottleneck of limiters.perEventBottlenecksMap.values())
      {
        // Since the bottlenecks are mutually shared between events, we must ensure we stop each only once
        if (alreadyStoppedBottlenecks.has(bottleneck) === false)
        {
          controller.abort();
          const counts = bottleneck.counts();
          logger.debug(`Stopping a throttling bottleneck for the extension with id '${extensionId}' with ${counts.QUEUED} queued job(s), ${counts.RUNNING} running job(s), ${counts.EXECUTING} executing job(s)`);
          await bottleneck.stop({ dropWaitingJobs: true, dropErrorMessage: null, enqueueErrorMessage: null });
          alreadyStoppedBottlenecks.add(bottleneck);
        }
      }
    }
  }

  async run(extensionId: string | undefined, event: string, callback: (signal: AbortSignal) => Promise<void>): Promise<void>
  {
    const controller = extensionId === undefined ? this.gernalAbortController : this.perExtensionIdControllerMap.get(extensionId);
    if (controller === undefined)
    {
      throw new Error(extensionId === undefined ? "There is no general abort controller" : ("There is no abort controller for extension '" + extensionId + "'"));
    }

    function handleError(error: unknown)
    {
      // We swallow the error if the job was dropped due to the bottleneck being stopped
      if (!((error instanceof Bottleneck.BottleneckError && error.message === "This limiter has been stopped.") || (error instanceof ExtensionTaskExecutorError)))
      {
        logger.error(`An unexpected error occurred while executing a task for the extension with id '${extensionId}' and for the '${event}' event through a throttling bottleneck${error instanceof Error ? `. Reason: '${error.message}'` : ""}`);
      }
    }

    if (extensionId === undefined)
    {
      try
      {
        await callback(controller.signal);
      }
      catch (error)
      {
        handleError(error);
      }
    }
    else
    {
      const bottleneck = this.computeBottleneck(extensionId, event);
      if (bottleneck === undefined)
      {
        try
        {
          await callback(controller.signal);
        }
        catch (error)
        {
          handleError(error);
        }
      }
      else
      {
        logger.debug(`Scheduling a task through a throttling bottleneck for the extension with id '${extensionId}' and for the '${event}' event`);
        bottleneck.schedule(() => callback(controller.signal)).catch(handleError);
      }
    }
  }

  private computeBottleneck(extensionId: string, event: string): Bottleneck | undefined
  {
    const extensionLimiters = this.perExtensionIdLimitersMap.get(extensionId);
    if (extensionLimiters === undefined)
    {
      return undefined;
    }
    const bottleneck = extensionLimiters.perEventBottlenecksMap.get(event);
    if (bottleneck !== undefined)
    {
      return bottleneck;
    }
    const throttlingPolicy = extensionLimiters.perEventThrottlingPoliciesMap.get(event);
    if (throttlingPolicy === undefined)
    {
      return undefined;
    }
    const options: Bottleneck.ConstructorOptions =
      {
        minTime: throttlingPolicy.durationInMilliseconds ?? (throttlingPolicy.maximumCount === undefined ? 100 : (1_000 / throttlingPolicy.maximumCount)),
        maxConcurrent: throttlingPolicy.maximumCount
      };
    const newBottleneck = new Bottleneck(options);
    const events = Array.from(extensionLimiters.perEventThrottlingPoliciesMap.keys());
    for (const anEvent of events)
    {
      extensionLimiters.perEventBottlenecksMap.set(anEvent, newBottleneck);
    }
    logger.debug(`Created a throttling bottleneck for the extension with id '${extensionId}' and for the events [${[ ...events.map(event => `'${event}'`) ].join(", ")}] with a maximum of ${options.maxConcurrent} call(s) every ${options.minTime} milliseconds`);
    return newBottleneck;
  }

}
