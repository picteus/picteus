import path from "node:path";
import Timers from "node:timers";

import {
  computeImageFormatsExtensions,
  fileWithProtocol,
  ImageFormat,
  ImageFormats,
  Repository
} from "../../dtos/app.dtos";
import { logger } from "../../logger";
import { parametersChecker } from "./parametersChecker";
import { EventEntity, ExtensionEventProcess, ImageEventAction, Notifier, RepositoryEventAction } from "../../notifier";
import { ImageDeclarationManager } from "../../threads/managers";
import { VectorDatabaseAccessor } from "../databaseProviders";
import { PersistenceProvider } from "../../persistence";
import { SearchFileStats, SearchService } from "../imageServices";
import { ExtensionTaskExecutor } from "../extensionTaskExecutor";
import { WatcherEvent, WatcherTerminator, watchPath } from "./pathWatcher";


export class RepositoryWatcher
{

  private static readonly instances: Record<string, RepositoryWatcher> = {};

  private static readonly startedRepositories: Repository[] = [];

  private static readonly pollIntervalInMilliseconds = 100;

  private static readonly stabilityThresholdInMilliseconds = 500;

  static get(repositoryId: string): RepositoryWatcher | undefined
  {
    return RepositoryWatcher.instances[repositoryId];
  }

  static async start(repository: Repository, persistenceProvider: PersistenceProvider, vectorDatabaseAccessor: VectorDatabaseAccessor, notifier: Notifier, extensionTaskExecutor: ExtensionTaskExecutor): Promise<void>
  {
    const id = repository.id;
    if (RepositoryWatcher.get(id) !== undefined)
    {
      parametersChecker.throwInternalError(`There is already a watcher for the repository with id '${id}'`);
    }
    logger.info(`Starting a watcher for the repository with id '${id}'`);
    const watcher = new RepositoryWatcher(id, repository.getLocation().toFilePath(), ImageFormats, vectorDatabaseAccessor);
    RepositoryWatcher.instances[id] = watcher;
    RepositoryWatcher.startedRepositories.push(repository);
    await watcher.start(persistenceProvider, notifier);
    notifier.emit(EventEntity.Repository, RepositoryEventAction.Watch, ExtensionEventProcess.Started, { id });
  }

  static async stop(repository: Repository, notifier: Notifier): Promise<void>
  {
    const id = repository.id;
    const watcher = RepositoryWatcher.get(id);
    if (watcher === undefined)
    {
      parametersChecker.throwInternalError(`There is no watcher for the repository with id '${id}'`);
    }
    logger.info(`Stopping the watcher for the repository with id '${id}'`);
    await watcher.stop();
    delete RepositoryWatcher.instances[id];
    RepositoryWatcher.startedRepositories.splice(RepositoryWatcher.startedRepositories.indexOf(repository), 1);
    notifier.emit(EventEntity.Repository, RepositoryEventAction.Watch, ExtensionEventProcess.Stopped, { id });
  }

  static async ignore<T>(id: string, relativeFilePath: string, callback: () => Promise<T>): Promise<T>
  {
    const watcher = RepositoryWatcher.get(id);
    if (watcher === undefined)
    {
      return await callback();
    }
    else
    {
      return await watcher.ignore<T>(relativeFilePath, callback);
    }
  }

  private watcherTerminator?: WatcherTerminator;

  private timeout: NodeJS.Timeout | undefined;

  // Indicates whether a cycle is running following a file event
  private isRunningCycle: boolean = false;

  private onCycleComplete: ((value: void | PromiseLike<void>) => void) | undefined;

  private ignoredRelativeFilePaths: string[] = [];

  private constructor(private readonly repositoryId: string, private readonly directoryPath: string, private readonly imageFormats: ImageFormat[], private readonly vectorDatabaseAccessor: VectorDatabaseAccessor)
  {
  }

  private async start(persistenceProvider: PersistenceProvider, notifier: Notifier): Promise<void>
  {
    const extensions = computeImageFormatsExtensions(this.imageFormats).map((extension) =>
    {
      return "." + extension;
    });
    // We are forced to use a value greater than 2 seconds, because the Chokidar library takes about 500 milliseconds to notify from a final "write"
    const timeoutInMilliseconds = RepositoryWatcher.stabilityThresholdInMilliseconds + RepositoryWatcher.pollIntervalInMilliseconds;
    const ledgerEvents: Map<string, string[]> = new Map<string, string[]>();
    const repositoryDirectoryPath = this.directoryPath;
    const handleEvent = async (event: WatcherEvent, relativeFilePath: string) =>
    {
      if (this.ignoredRelativeFilePaths.indexOf(relativeFilePath) !== -1)
      {
        // We should ignore the file event for this relative path
        return;
      }
      if (extensions.findIndex((extension) =>
      {
        return relativeFilePath.toLowerCase().endsWith(extension) === true;
      }) === -1)
      {
        // We do not take into accounts files which do not have the right extension
        return;
      }
      logger.debug(`The event '${event}' occurred on file '${relativeFilePath}'`);
      let events: string[] | undefined = ledgerEvents.get(relativeFilePath);
      if (events === undefined)
      {
        events = [];
        ledgerEvents.set(relativeFilePath, events);
      }
      events.push(event);
      await this.clearTimeout();
      // We throttle the events in order to prevent from synchronizing with the persistence too often
      const repositoryId = this.repositoryId;
      const timeout = Timers.setTimeout(async () =>
      {
        logger.debug(`Running for the watcher attached to the repository with id '${repositoryId}' time-out function with id ${timeout} for the watcher following the '${event}' on file '${relativeFilePath}'`);
        this.isRunningCycle = true;
        try
        {
          const imageDelegate = persistenceProvider.images;
          const searchService = new SearchService();
          const toBeUpdatedFilePaths = [];
          const unlinkedImages = [];
          {
            const addedFilePaths = [];
            const addedStatss: Record<string, SearchFileStats> = {};
            const unlinkedFilePaths = [];
            // We inspect the added and deleted files
            for (const [relativeFilePath, events] of ledgerEvents.entries())
            {
              const addedIndex = events.indexOf(WatcherEvent.Added);
              const unlinkedIndex = events.indexOf(WatcherEvent.Deleted);
              if (addedIndex === -1 && unlinkedIndex === -1)
              {
                continue;
              }
              if (addedIndex !== -1 && unlinkedIndex !== -1 && unlinkedIndex > addedIndex)
              {
                // The file has been added and then destroyed, hence we discard it
                ledgerEvents.delete(relativeFilePath);
                continue;
              }
              const filePath = path.join(repositoryDirectoryPath, relativeFilePath);
              if (addedIndex !== -1)
              {
                addedFilePaths.push(filePath);
                addedStatss[filePath] = searchService.computeImageStats(filePath);
              }
              if (unlinkedIndex !== -1)
              {
                unlinkedFilePaths.push(filePath);
                const image = await imageDelegate.findFirst({ where: { url: fileWithProtocol + filePath } });
                if (image !== null)
                {
                  unlinkedImages.push(image);
                }
              }
            }
            // We handle the renamed or moved files
            for (const filePath of addedFilePaths)
            {
              const addedStats = addedStatss[filePath];
              const unlinkedImage = unlinkedImages.find((image) =>
              {
                return image.internalId === addedStats.internalId;
              });
              if (unlinkedImage !== undefined)
              {
                // The files have not been destroyed and added, but instead the same one has been renamed
                const url = unlinkedImage.url;
                const previousFilePath = url.substring(fileWithProtocol.length);
                if (unlinkedImage.fileModificationDate.getTime() === addedStats.fileDates.modificationDate)
                {
                  logger.debug(`The file '${previousFilePath}' has been renamed as '${filePath}'`);
                  await imageDelegate.update({
                    where: { id: unlinkedImage.id },
                    data: { name: path.basename(filePath), url: fileWithProtocol + filePath }
                  });
                  notifier.emit(EventEntity.Image, ImageEventAction.Renamed, undefined, { id: unlinkedImage.id });
                }
                else
                {
                  logger.debug(`The file '${previousFilePath}' has been changed and renamed as '${filePath}'`);
                  toBeUpdatedFilePaths.push(filePath);
                }
                ledgerEvents.delete(path.relative(this.directoryPath, previousFilePath));
                ledgerEvents.delete(path.relative(this.directoryPath, filePath));
              }
            }
          }
          const toBeDeclaredFilePaths = [];
          for (const [relativeFilePath, events] of ledgerEvents.entries())
          {
            const filePath = path.join(repositoryDirectoryPath, relativeFilePath);
            if (events.length === 1 && events[0] === WatcherEvent.Added)
            {
              // This is a file addition
              logger.debug(`The file '${filePath}' has been added`);
              toBeDeclaredFilePaths.push(filePath);
            }
            else if (events.length === 1 && events[0] === WatcherEvent.Deleted)
            {
              // This is a file deletion
              const image = unlinkedImages.find((image) =>
              {
                return image.url === (fileWithProtocol + filePath);
              });
              logger.debug(`The file '${filePath}' has been deleted${image !== undefined ? "" : " but it was not indexed"}`);
              if (image !== undefined)
              {
                await this.vectorDatabaseAccessor.deleteImagesEmbeddings([image.id]);
                await imageDelegate.delete({ where: { id: image.id } });
                notifier.emit(EventEntity.Image, ImageEventAction.Deleted, undefined, { id: image.id });
              }
            }
            else if (events.length === 1 && events[0] === WatcherEvent.Changed)
            {
              // This is a file modification
              const image = await imageDelegate.findFirst({ where: { url: fileWithProtocol + filePath } });
              logger.debug(`The file '${filePath}' has been modified${image !== null ? "" : " but it was not indexed"}`);
              if (image !== null)
              {
                toBeUpdatedFilePaths.push(filePath);
              }
            }
          }
          if (toBeUpdatedFilePaths.length > 0 || toBeDeclaredFilePaths.length > 0)
          {
            const imageDeclarationManager = new ImageDeclarationManager(toBeUpdatedFilePaths.length + toBeDeclaredFilePaths.length);
            const promises: Promise<void>[] = [];
            try
            {
              for (const filePath of toBeUpdatedFilePaths)
              {
                try
                {
                  promises.push(imageDeclarationManager.updateImage({ repositoryId, filePath }).then(({ id }) =>
                  {
                    notifier.emit(EventEntity.Image, ImageEventAction.Updated, undefined, { id });
                  }));
                }
                catch (error)
                {
                  logger.error(`Could not properly update the image with file '${filePath}'`, error);
                }
              }
              for (const filePath of toBeDeclaredFilePaths)
              {
                try
                {
                  promises.push(imageDeclarationManager.declareImage({ repositoryId, filePath }).then(async ({ id }) =>
                  {
                    notifier.emit(EventEntity.Image, ImageEventAction.Created, undefined, { id });
                  }));
                }
                catch (error)
                {
                  logger.error(`Could not properly declare the image with file '${filePath}'`, error);
                }
              }
            }
            finally
            {
              await Promise.all(promises);
              await imageDeclarationManager.destroy();
            }
          }
        }
        finally
        {
          // We eventually empty the events ledger
          ledgerEvents.clear();
          this.timeout = undefined;
          if (this.onCycleComplete !== undefined)
          {
            this.onCycleComplete(undefined);
          }
          this.isRunningCycle = false;
        }
      }, timeoutInMilliseconds);
      this.timeout = timeout;
      logger.debug(`Set a time-out function with id ${timeout} for the watcher attached to the repository with id '${repositoryId}' following the '${event}' on file '${relativeFilePath}'`);
    };

    this.watcherTerminator = await watchPath(repositoryDirectoryPath, handleEvent, (error: Error) =>
    {
      logger.error(`An unexpected error occurred in the watcher attached to the repository with id '${this.repositoryId}' while watching for the files`, error);
    });
  }

  private async stop(): Promise<void>
  {
    if (this.watcherTerminator === undefined)
    {
      parametersChecker.throwInternalError(`The watcher on directory '${this.directoryPath}' is not started`);
    }
    await this.watcherTerminator();
    this.watcherTerminator = undefined;
    await this.clearTimeout();
  }

  private async ignore<T>(relativeFilePath: string, callback: () => Promise<T>): Promise<T>
  {
    logger.debug(`The watcher attached to the repository with id '${this.repositoryId}' will temporarily ignore the events on the file '${relativeFilePath}'`);
    this.ignoredRelativeFilePaths.push(relativeFilePath);
    try
    {
      const result = await callback();
      // We need to wait for the stability threshold, because file events might occur in the meantime
      await new Promise((resolve) =>
      {
        Timers.setTimeout(resolve, RepositoryWatcher.stabilityThresholdInMilliseconds);
      });
      return result;
    }
    finally
    {
      this.ignoredRelativeFilePaths.splice(this.ignoredRelativeFilePaths.indexOf(relativeFilePath), 1);
    }
  }

  private async clearTimeout(): Promise<void>
  {
    if (this.timeout !== undefined)
    {
      logger.debug(`Cancelling for the watcher attached to repository with id '${this.repositoryId}' the time-out function with id ${this.timeout}`);
      const promise = this.isRunningCycle === false ? undefined : new Promise<void>((resolve) =>
      {
        this.onCycleComplete = resolve;
      });
      clearTimeout(this.timeout);
      if (promise !== undefined)
      {
        await promise;
      }
      this.onCycleComplete = undefined;
      this.timeout = undefined;
    }
  }

}
