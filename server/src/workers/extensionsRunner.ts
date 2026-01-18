import fs from "node:fs";
import path from "node:path";
import { ChildProcess } from "node:child_process";
import { parentPort } from "node:worker_threads";

import { NestFactory } from "@nestjs/core";
import { INestApplicationContext, Module, NestApplicationOptions, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { WinstonModule } from "nest-winston";

import { logger } from "../logger";
import { paths } from "../paths";
import { stringify } from "../utils";
import { Image, ManifestEvent, ManifestRuntimeEnvironment } from "../dtos/app.dtos";
import { fromImageEventActionToManifestEvent } from "../bos";
import { ensureDirectory } from "../services/utils/downloader";
import { fork, spawn, stopProcessGracefully } from "../services/utils/processWrapper";
import { computeVirtualEnvironmentPythonFilePath } from "../services/utils/pythonWrapper";
import { EntitiesProvider, VectorDatabaseAccessor } from "../services/databaseProviders";
import { ExtensionsApiKeys } from "../app.guards";
import { ImageService } from "../services/imageServices";
import { ExtendedManifest, ExtensionMessage, ExtensionRegistry, ImageEvent } from "../services/extensionRegistry";


@Module({
  providers: [EntitiesProvider, VectorDatabaseAccessor, ImageService, ExtensionRegistry]
})
class ExtensionsRunnerModule implements OnModuleInit, OnModuleDestroy
{

  async onModuleInit(): Promise<void>
  {
    logger.debug("The initializing of the ExtensionsRunnerModule is over");
  }

  async onModuleDestroy(): Promise<void>
  {
    logger.info("Destroying the ExtensionsRunnerModule");
    logger.info("Destroyed the ExtensionsRunnerModule");
  }

}

enum RunnerState
{
  Stopped = "stopped",
  Starting = "starting",
  Started = "started",
  Stopping = "stopping"
}

class ExtensionsRunner
{

  private static instance?: ExtensionsRunner;

  private readonly manifests: ExtendedManifest[] = [];

  private readonly perExtensionIdProcesses: Map<string, ChildProcess[]> = new Map<string, ChildProcess[]>();

  private readonly perExtensionIdProcessStartedExitedProcessesCount: Map<string, number> = new Map<string, number>();

  private state: RunnerState = RunnerState.Stopped;

  private webServicesBaseUrl?: string;

  private readonly extensionsApiKeys: ExtensionsApiKeys = [];

  static async create(): Promise<ExtensionsRunner>
  {
    if (ExtensionsRunner.instance !== undefined)
    {
      const log = "Cannot create the ExtensionsRunner because it is currently already instantiated";
      logger.error(log);
      throw new Error(log);
    }
    logger.debug("Creating an ExtensionsRunner");
    const options: NestApplicationOptions =
      {
        // We use the same logger as for the rest of the application
        logger: WinstonModule.createLogger({ instance: logger })
      };
    const applicationContext = await NestFactory.createApplicationContext(ExtensionsRunnerModule, options);
    ExtensionsRunner.instance = new ExtensionsRunner(applicationContext, applicationContext.get(ImageService), applicationContext.get(ExtensionRegistry));
    return ExtensionsRunner.instance;
  }

  static forget(): void
  {
    logger.debug("Forgetting the ExtensionsRunner");
    if (ExtensionsRunner.instance === undefined)
    {
      const log = "Cannot forget the ExtensionsRunner because it is currently not instantiated";
      logger.error(log);
      throw new Error(log);
    }
    ExtensionsRunner.instance = undefined;
  }

  static get(): ExtensionsRunner
  {
    if (ExtensionsRunner.instance === undefined)
    {
      const log = "Cannot get the ExtensionsRunner because it is currently already instantiated";
      logger.error(log);
      throw new Error(log);
    }
    return ExtensionsRunner.instance;
  }

  private constructor(private readonly applicationContext: INestApplicationContext, private readonly imageService: ImageService, private readonly extensionsRegistry: ExtensionRegistry)
  {
    logger.debug("Instantiating the ExtensionsRunner");
  }

  async start(webServicesBaseUrl: string, extensionsApiKeys: ExtensionsApiKeys): Promise<void>
  {
    this.checkState([RunnerState.Stopped], "start");
    this.state = RunnerState.Starting;
    logger.info("Starting the ExtensionsRunner");
    if (webServicesBaseUrl === undefined || extensionsApiKeys === undefined)
    {
      throw new Error("Cannot start the ExtensionsRunner because of missing parameters");
    }
    this.webServicesBaseUrl = webServicesBaseUrl;
    this.startProcesses(extensionsApiKeys);
    this.state = RunnerState.Started;
    logger.debug("The ExtensionsRunner is now started");
  }

  async stop(): Promise<void>
  {
    this.checkState([RunnerState.Starting, RunnerState.Started], "stop");
    this.state = RunnerState.Stopping;
    logger.info("Stopping the ExtensionsRunner");
    logger.debug("Killing the remaining processes");
    await this.stopProcesses(this.manifests.map((manifest) =>
    {
      return manifest.id;
    }));
    this.perExtensionIdProcessStartedExitedProcessesCount.clear();
    this.extensionsApiKeys.length = 0;
    this.state = RunnerState.Stopped;
    await this.applicationContext.close();
    logger.debug("The ExtensionsRunner is now stopped");
  }

  startProcesses(extensionsApiKeys: ExtensionsApiKeys): void
  {
    this.checkState([RunnerState.Starting, RunnerState.Started], "start some processes");
    for (const extensionsApiKey of extensionsApiKeys)
    {
      logger.info(`Starting the extension with id '${extensionsApiKey.id}' and API key '${extensionsApiKey.key}'`);
      const manifest: ExtendedManifest | undefined = this.extensionsRegistry.get(extensionsApiKey.id);
      if (manifest === undefined)
      {
        throw new Error(`Cannot start the extension with id '${extensionsApiKey.id}' because it does not exist`);
      }
      // We forget the previous extension API key if it existed
      this.extensionsApiKeys.push(extensionsApiKey);
      this.manifests.push(manifest);
      this.writeParametersFileAndCache(manifest);
      this.runStartProcess(manifest);
    }
  }

  async stopProcesses(extensionIds: string[]): Promise<void>
  {
    this.checkState([RunnerState.Starting, RunnerState.Started, RunnerState.Stopping], "stop some processes");
    for (const extensionId of extensionIds)
    {
      await this.stopExtensionProcesses(extensionId);
    }
  }

  async onImageEvent(event: ImageEvent): Promise<void>
  {
    logger.debug(`The '${event.action}' event occurred on image with id '${event.imageId}'`);
    for (const manifest of this.manifests)
    {
      for (const instructions of manifest.instructions)
      {
        if (instructions.events.indexOf(ManifestEvent.ProcessStarted) !== -1)
        {
          // We do not handle the image events for the extensions that are started along with the server process
          continue;
        }
        const manifestEvent: ManifestEvent | null | undefined = fromImageEventActionToManifestEvent(event.action);
        if (manifestEvent === undefined)
        {
          throw new Error(`Cannot handle the image event action '${event.action}' at the level of the ExtensionsRunner`);
        }
        if (manifestEvent !== null)
        {
          // We need to handle the special case of the image deletion, because we do not have the image object anymore
          this.runProcess(manifest, manifestEvent, manifestEvent === ManifestEvent.ImageDeleted ? event.imageId : (await this.imageService.get(event.imageId)));
        }
      }
    }
  }

  private checkState(allowedStates: RunnerState[], logFragment: string): void
  {
    if (allowedStates.indexOf(this.state) === -1)
    {
      const log = `Cannot ${logFragment} the ExtensionsRunner because its state is '${this.state}'`;
      logger.error(log);
      throw new Error(log);
    }
  }

  private computeParametersProperties(manifest: ExtendedManifest): Record<string, string>
  {
    return {
      extensionId: manifest.id,
      webServicesBaseUrl: this.webServicesBaseUrl!,
      apiKey: this.getApiKey(manifest)
    };
  }

  private computeCommandProperties(manifest: ExtendedManifest, imageOrId: Image | string | undefined): Record<string, string | undefined>
  {
    const map: Record<string, string | undefined> = this.computeParametersProperties(manifest);
    map["extensionDirectoryPath"] = manifest.directoryPath;
    if (manifest.runtimes.find((runtime) =>
    {
      return runtime.environment === ManifestRuntimeEnvironment.Node;
    }) !== undefined)
    {
      map[ExtensionRegistry.nodeVariableName] = process.argv[0];
    }
    if (manifest.runtimes.find((runtime) =>
    {
      return runtime.environment === ManifestRuntimeEnvironment.Python;
    }) !== undefined)
    {
      map[ExtensionRegistry.venvPythonVariableName] = computeVirtualEnvironmentPythonFilePath(manifest.directoryPath);
    }
    map.imageId = typeof imageOrId === "string" ? imageOrId : imageOrId?.id;
    if (imageOrId !== undefined && typeof imageOrId !== "string")
    {
      map.imageUrl = imageOrId?.url;
    }
    return map;
  }

  private resolveCommandToken(map: Record<string, string | undefined>, string: string): string
  {
    for (const key of Object.keys(map))
    {
      const value = map[key];
      if (value !== undefined)
      {
        string = string.replaceAll(ExtensionRegistry.computeVariablePlaceholder(key), value);
      }
    }
    return string;
  }

  private writeParametersFileAndCache(manifest: ExtendedManifest): void
  {
    {
      const fileName = "parameters.json";
      // We store the extension parameters
      const parameters = this.computeParametersProperties(manifest);
      const data = stringify(parameters);
      const filePath = path.join(manifest.directoryPath, fileName);
      const currentData = fs.existsSync(filePath) === false ? undefined : fs.readFileSync(filePath, { encoding: "utf8" });
      const shouldWrite = data !== currentData;
      if (shouldWrite === true)
      {
        fs.writeFileSync(filePath, data);
      }
      const logFragment = `the parameters file '${filePath}' for the extension with id '${manifest.id}'`;
      logger.debug(shouldWrite === true ? `Wrote ${logFragment}` : `Ensured that ${logFragment} is up to date`);
    }
    {
      const directoryPath = path.join(manifest.directoryPath, ".cache");
      const targetDirectoryPath = paths.modelsCacheDirectoryPath;
      logger.debug(`Ensuring that the models cache directory for extension with id '${manifest.id}' exists'`);
      ensureDirectory(directoryPath, targetDirectoryPath, true);
    }
  }

  private runStartProcess(manifest: ExtendedManifest): void
  {
    this.runProcess(manifest, ManifestEvent.ProcessStarted);
  }

  private runProcess(manifest: ExtendedManifest, event: ManifestEvent, imageOrId?: Image | string): void
  {
    const instructions = manifest.instructions.find((instruction) =>
    {
      return instruction.events.indexOf(event) !== -1;
    });
    if (instructions !== undefined)
    {
      this.checkState([RunnerState.Starting, RunnerState.Started], "run a process");
      logger.debug(`Starting for the extension with id '${manifest.id}' the process related to the '${event}' event`);
      const map: Record<string, string | undefined> = this.computeCommandProperties(manifest, imageOrId);
      const execution = instructions.execution;
      const resolvedParameters = execution.arguments.map((argument) =>
      {
        return this.resolveCommandToken(map, argument);
      });
      let process: ChildProcess;
      try
      {
        if (execution.executable === ExtensionRegistry.computeVariablePlaceholder(ExtensionRegistry.nodeVariableName))
        {
          process = fork(resolvedParameters[0], resolvedParameters.slice(1), manifest.directoryPath, null);
        }
        else if (execution.executable === ExtensionRegistry.computeVariablePlaceholder(ExtensionRegistry.shellVariableName))
        {
          process = spawn(resolvedParameters[0], resolvedParameters.slice(1), manifest.directoryPath, undefined, true);
        }
        else
        {
          process = spawn(this.resolveCommandToken(map, execution.executable), resolvedParameters, manifest.directoryPath, undefined, false);
        }
      }
      catch (error)
      {
        const log = `The start of the process of the extension with id '${manifest.id}' related to the event '${event}' failed`;
        logger.error(log, error);
        this.postMessage({ extensionId: manifest.id, eventKind: event, type: "error", value: log });
        return;
      }
      process.on("error", (error) =>
      {
        logger.error(`The subprocess of the extension with id '${manifest.id}' failed`, error);
      });
      process.on("exit", (exitCode: number | null, signal: string | null) =>
      {
        const log = `The process related to the extension with id '${manifest.id}', with id '${process.pid}' has exited with ${exitCode !== null ? `code ${exitCode}` : `signal '${signal}'`}`;
        logger.debug(log);
        const extensionProcesses = this.perExtensionIdProcesses.get(manifest.id);
        // That even may happen after the "stop()" method has been invoked, hence we have to take into account that the "this.processes" may have been cleared
        if (extensionProcesses !== undefined)
        {
          const index = extensionProcesses.indexOf(process);
          if (index !== -1)
          {
            // In case the process was not registered, we ignore it
            extensionProcesses.splice(index, 1);
            // In case of a long-lived process, we restart it
            if (this.state === RunnerState.Started && event === ManifestEvent.ProcessStarted)
            {
              this.postMessage({ extensionId: manifest.id, eventKind: event, type: "stopped", value: log });
              let count = this.perExtensionIdProcessStartedExitedProcessesCount.get(manifest.id);
              if (count === undefined)
              {
                count = 1;
              }
              else
              {
                count++;
              }
              this.perExtensionIdProcessStartedExitedProcessesCount.set(manifest.id, count);
              if (count >= 3)
              {
                const log = `The process of the extension with id '${manifest.id}' regarding the '${event}' event has exited ${count} times in a row, it will not be restarted anymore`;
                logger.warn(log);
                this.postMessage({ extensionId: manifest.id, eventKind: event, type: "fatal", value: log });
              }
              else
              {
                this.runProcess(manifest, event, imageOrId);
              }
            }
          }
        }
      });

      // We send the event that the process was started
      this.postMessage({
        extensionId: manifest.id,
        eventKind: event,
        type: "started",
        value: `The extension with id ${manifest.id} has started`
      });

      let extensionProcesses = this.perExtensionIdProcesses.get(manifest.id);
      if (extensionProcesses === undefined)
      {
        extensionProcesses = [];
        this.perExtensionIdProcesses.set(manifest.id, extensionProcesses);
      }
      extensionProcesses.push(process);
    }
  }

  private async stopExtensionProcesses(extensionId: string): Promise<void>
  {
    logger.info(`Stopping the processes of the extension with id '${extensionId}'`);
    this.perExtensionIdProcessStartedExitedProcessesCount.delete(extensionId);
    const processes = this.perExtensionIdProcesses.get(extensionId);
    if (processes !== undefined)
    {
      if (processes.length > 0)
      {
        logger.debug(`Killing ${processes.length} remaining process(es) for the extension with id '${extensionId}'`);
      }
      const gracePeriodDurationInMilliseconds = 1_000;
      for (const process of processes)
      {
        // We remove the process from the extension processes list because we do not want to restart it automatically
        processes.splice(0, 1);
        // TODO: think of notifying the process even more gracefully via the socket
        try
        {
          await stopProcessGracefully(process, gracePeriodDurationInMilliseconds, ` related to the extension with id '${extensionId}'`);
        }
        catch (error)
        {
          // We still want the process stopping to cause the extension stop process to fail, but we want also to log it
          logger.error(`Failed to stop gracefully the process with id '${process.pid}' related to the extension with id '${extensionId}'`, error);
          throw error;
        }
      }
      this.perExtensionIdProcesses.delete(extensionId);
    }
    const index = this.manifests.findIndex((manifest: ExtendedManifest) =>
    {
      return manifest.id === extensionId;
    });
    if (index !== -1)
    {
      this.manifests.splice(index, 1);
    }
    {
      let index = 0;
      for (const aKey of this.extensionsApiKeys)
      {
        if (aKey.id === extensionId)
        {
          this.extensionsApiKeys.splice(index, 1);
          break;
        }
        index++;
      }
    }
  }

  private getApiKey(manifest: ExtendedManifest): string
  {
    const item = this.extensionsApiKeys.find((permission) =>
    {
      return permission.id === manifest.id;
    });
    if (item === undefined)
    {
      throw new Error(`No API key is attached to the extension with id '${manifest.id}'`);
    }
    return item.key;
  }

  private postMessage(message: ExtensionMessage)
  {
    parentPort!.postMessage(message);
  }

}

// noinspection JSUnusedGlobalSymbols
export async function start({ webServicesBaseUrl, extensionsApiKeys }: {
  webServicesBaseUrl: string,
  extensionsApiKeys: ExtensionsApiKeys
}): Promise<void>
{
  return (await ExtensionsRunner.create()).start(webServicesBaseUrl, extensionsApiKeys);
}

// noinspection JSUnusedGlobalSymbols
export async function stop(): Promise<void>
{
  await ExtensionsRunner.get().stop();
  ExtensionsRunner.forget();
}

// noinspection JSUnusedGlobalSymbols
export async function startProcesses({ extensionsApiKeys }: {
  extensionsApiKeys: ExtensionsApiKeys
}): Promise<void>
{
  return ExtensionsRunner.get().startProcesses(extensionsApiKeys);
}

// noinspection JSUnusedGlobalSymbols
export async function stopProcesses({ extensionIds }: {
  extensionIds: string[]
}): Promise<void>
{
  return await ExtensionsRunner.get().stopProcesses(extensionIds);
}

// noinspection JSUnusedGlobalSymbols
export async function onImageEvent({ event }: { event: ImageEvent }): Promise<void>
{
  return await ExtensionsRunner.get().onImageEvent(event);
}
