import path from "node:path";
import fs from "node:fs";
import Timers from "node:timers";

import { FSWatcher, watch } from "chokidar";

import { logger } from "../../logger";
import { Stats } from "fs";
import { ChokidarOptions } from "chokidar/esm";


export enum WatcherEvent
{
  Added = "added",
  Deleted = "deleted",
  Changed = "changed"
}

export type WatcherTerminator = () => Promise<void>;

export async function watchPath(nodePath: string, onEvent: (event: WatcherEvent, relativePath: string) => Promise<void>, onError?: (error: Error) => void, finishOptions?: {
  stabilityThresholdInMilliseconds: number;
  pollIntervalInMilliseconds: number
}): Promise<WatcherTerminator>
{
  if (fs.existsSync(nodePath) === false)
  {
    throw new Error("Cannot watch for the files under the path '" + nodePath + "' because that file system node does not exist");
  }
  const isFile = fs.lstatSync(nodePath).isFile() === true;
  const onEventInternal = async (event: WatcherEvent, relativePath: string) =>
  {
    logger.debug("Received the '" + event + "' event for the file with relative path '" + relativePath + "'");
    await onEvent(event, relativePath);
  };
  const options: ChokidarOptions =
    {
      cwd: isFile === false ? nodePath : path.join(nodePath, ".."),
      ignoreInitial: true,
      awaitWriteFinish:
        {
          stabilityThreshold: finishOptions?.stabilityThresholdInMilliseconds ?? 250,
          pollInterval: finishOptions?.pollIntervalInMilliseconds ?? 100
        },
      depth: undefined,
      ignored: (_relativePath: string, _stats?: Stats) =>
      {
        return false;
      }
    };


  function createAsynchronousQueue(): (callback: () => Promise<void>) => Promise<void>
  {
    let executionChain: Promise<any> = Promise.resolve();
    return function enqueue(callback: () => Promise<void>): Promise<void>
    {
      const nextStep = executionChain.then(() =>
      {
        return callback();
      });
      executionChain = nextStep.catch(() =>
      {
        return undefined;
      });
      return nextStep;
    };
  }

  const enqueue = createAsynchronousQueue();
  const logFragment = `${isFile === false ? "files under the directory" : "file with"} path '${nodePath}'`;
  logger.info(`Preparing to watch to the events for the ${logFragment}`);
  return new Promise<WatcherTerminator>((resolve, _reject) =>
  {
    const watcher: FSWatcher = watch(isFile === false ? nodePath : path.basename(nodePath), options)
      .on("add", (relativePath) =>
      {
        enqueue(async () => await onEventInternal(WatcherEvent.Added, relativePath));
      }).on("unlink", (relativePath) =>
      {
        enqueue(async () => await onEventInternal(WatcherEvent.Deleted, relativePath));
      }).on("change", (relativePath) =>
      {
        enqueue(async () => await onEventInternal(WatcherEvent.Changed, relativePath));
      }).on("ready", () =>
      {
        // We wait for the next tick before returning, otherwise some file events may be missed
        Timers.setTimeout(() =>
        {
          logger.info(`Now watching the events for the ${logFragment}`);
          resolve(async () =>
          {
            logger.info(`Stopping from watching the events for the ${logFragment}`);
            await watcher.close();
          });
        }, 0);
      }).on("error", (error: unknown) =>
      {
        onError?.(error as Error);
      });
  });

}
