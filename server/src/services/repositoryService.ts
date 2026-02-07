import path from "node:path";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import Timers from "node:timers";

import { plainToInstance } from "class-transformer";
import { ModuleRef } from "@nestjs/core";
import { forwardRef, Inject, Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { Prisma, Repository as PersistedRepository } from ".prisma/client";
import { logger } from "../logger";
import { paths } from "../paths";
import {
  AllExtensionImageTags,
  ApplicationMetadata,
  ExtensionImageTag,
  fileWithProtocol,
  Image,
  Repository,
  RepositoryActivities,
  RepositoryActivity,
  RepositoryActivityKind,
  RepositoryList,
  RepositoryLocationType,
  RepositoryStatus,
  toFileExtension
} from "../dtos/app.dtos";
import { Json } from "../bos";
import { EntitiesProvider, VectorDatabaseAccessor } from "./databaseProviders";
import { ImageDeclarationManager } from "../threads/managers";
import { EventEntity, ImageEventAction, Notifier, RepositoryEventAction } from "../notifier";
import { parametersChecker, StringLengths, StringNature } from "./utils/parametersChecker";
import { RepositoryWatcher } from "./utils/repositoryWatcher";
import {
  computeFormat,
  readApplicationMetadata,
  supportsApplicationMedata,
  writeApplicationMetadata
} from "./utils/images";
import { plainToInstanceViaJSON } from "../utils";
import { ExtensionRegistry } from "./extensionRegistry";
import { ExtensionTaskExecutor } from "./extensionTaskExecutor";
import { ImageService, SearchService } from "./imageServices";


@Injectable()
export class RepositoryService implements OnModuleInit, OnModuleDestroy
{

  // The identifiers of the currently synchronizing repositories
  private static synchronizingRepositoryIds: Set<string> = new Set<string>();

  private readonly perPathFileRepositories: Map<string, Repository> = new Map<string, Repository>();

  // @ts-ignore
  private notifier: Notifier;

  constructor(private readonly entitiesProvider: EntitiesProvider, @Inject(forwardRef(() => ExtensionRegistry)) private readonly extensionsRegistry: ExtensionRegistry, private readonly extensionTaskExecutor: ExtensionTaskExecutor, private readonly vectorDatabaseAccessor: VectorDatabaseAccessor, private readonly eventEmitter: EventEmitter2, private readonly moduleRef: ModuleRef)
  {
    logger.debug("Instantiating a RepositoryService");
  }

  async onModuleInit(): Promise<void>
  {
    this.notifier = new Notifier(this.eventEmitter);
    // We start the repositories
    await this.startOrStopAll(true);
    logger.debug("The initializing of a RepositoryService is over");
  }

  async onModuleDestroy(): Promise<void>
  {
    logger.debug("Destroying a RepositoryService");
    await this.startOrStopAll(false);
    RepositoryService.synchronizingRepositoryIds.clear();
    await ImageDeclarationManager.destroyAll();
    this.notifier.destroy();
    logger.debug("Destroyed a RepositoryService");
  }

  getImageRepositoryStatus(nodePath: string): undefined | RepositoryStatus
  {
    for (const [path, repository] of this.perPathFileRepositories.entries())
    {
      if (nodePath.startsWith(path) === true)
      {
        return repository.status;
      }
    }
    return undefined;
  }

  async get(id: string): Promise<Repository>
  {
    logger.info(`Getting the repository with id '${id}'`);
    const repository = await this.getRepository(id);
    return plainToInstanceViaJSON(Repository, repository);
  }

  async create(type: RepositoryLocationType, url: string, technicalId: string | undefined, name: string, comment: string | undefined, watch: boolean | undefined): Promise<Repository>
  {
    const doNotWatch = watch !== true;
    logger.info(`Creating the repository with name '${name}'${comment === undefined ? "" : `, with comment '${comment}'`}, of type '${type}', URL '${url}' ${doNotWatch === true ? "but does not watch it" : "and starts watching it"}`);
    parametersChecker.checkString("technicalId", technicalId, StringLengths.Length32, StringNature.Technical, true);
    parametersChecker.checkFileUrl("url", url);
    parametersChecker.checkString("name", name, StringLengths.Length64);
    parametersChecker.checkString("comment", comment, StringLengths.Length256, StringNature.Free, true);
    if ((await this.entitiesProvider.repositories.findUnique({ where: { name } })) !== null)
    {
      parametersChecker.throwBadParameter("name", name, "a repository with the same name already exists");
    }
    if (technicalId != undefined && (await this.entitiesProvider.repositories.findUnique({ where: { technicalId } })) !== null)
    {
      parametersChecker.throwBadParameter("technicalId", technicalId, "a repository with the same technical identifier already exists");
    }
    let directoryPath = path.resolve(url.substring(fileWithProtocol.length));
    {
      {
        // We translate the URL according to the repository mapping paths
        for (const [key, value] of paths.repositoryMappingPaths.entries())
        {
          if (directoryPath.startsWith(value) === true)
          {
            const mappedDirectoryPath = key + url.substring(fileWithProtocol.length + value.length);
            logger.debug(`The repository with path '${directoryPath}' is mapped to the path '${mappedDirectoryPath}'`);
            directoryPath = mappedDirectoryPath;
            break;
          }
        }
      }
      if (fs.existsSync(directoryPath) === false)
      {
        let stats: fs.Stats | undefined;
        try
        {
          stats = fs.lstatSync(directoryPath);
        }
        catch (error)
        {
          // This is expected and means that the node does not exist
        }
        if (stats !== undefined && stats.isSymbolicLink() === true)
        {
          parametersChecker.throwBadParameterError(`The directory with path '${directoryPath}' is a broken symbolic link`);
        }
        parametersChecker.throwBadParameterError(`The directory with path '${directoryPath}' does not exist`);
      }
      const stats = fs.lstatSync(directoryPath);
      if (stats.isDirectory() === false && stats.isSymbolicLink() === false)
      {
        parametersChecker.throwBadParameterError(`The node with path '${directoryPath}' is not a directory`);
      }
      if (stats.isSymbolicLink() === true)
      {
        const realPath = fs.realpathSync(directoryPath);
        if (fs.lstatSync(realPath).isDirectory() === false)
        {
          parametersChecker.throwBadParameterError(`The directory with path '${directoryPath}' is a symbolic link pointing to the path '${realPath}' which is not a directory`);
        }
      }
    }
    const repositories = await this.entitiesProvider.repositories.findMany();
    // This way, we remove any URL trailing slash
    const effectiveUrl = fileWithProtocol + directoryPath;
    for (const repository of repositories)
    {
      if (repository.url === effectiveUrl)
      {
        parametersChecker.throwBadParameter("url", url, "a repository with the same URL already exists");
      }
      if (repository.url.startsWith(effectiveUrl) === true || effectiveUrl.startsWith(repository.url) === true)
      {
        if (path.resolve(directoryPath, "..") !== path.resolve(repository.url.substring(fileWithProtocol.length), ".."))
        {
          parametersChecker.throwBadParameterError(`The repository with id '${repository.id}' is in conflict with the URL '${url}'`);
        }
      }
    }

    const repositoryObject = { technicalId, name, type, url: effectiveUrl, comment, status: RepositoryStatus.INDEXING };
    const persistedRepository = await this.entitiesProvider.repositories.create({ data: repositoryObject });

    const repository = plainToInstanceViaJSON(Repository, persistedRepository);
    this.notifier.emit(EventEntity.Repository, RepositoryEventAction.Created, undefined, { id: repository.id });
    await this.internalSynchronize(repository, undefined, doNotWatch === true ? undefined : async (repository: Repository, updateStatus: () => Promise<Repository>): Promise<void> =>
    {
      repository = await updateStatus();
      await this.startOrStop(repository, true);
      return Promise.resolve();
    });
    return repository;
  }

  async ensure(technicalId: string, name: string, comment: string | undefined, watch: boolean = true): Promise<Repository>
  {
    logger.info(`Ensuring that the repository with technical identifier '${technicalId}' exists, with name '${name}'${comment === undefined ? "" : `, with comment '${comment}'`}`);
    const entity = await this.entitiesProvider.repositories.findUnique({ where: { technicalId } });
    if (entity !== null)
    {
      return plainToInstanceViaJSON(Repository, entity);
    }
    else
    {
      const directoryPath = path.join(paths.repositoriesDirectoryPath, technicalId);
      fs.mkdirSync(directoryPath, { recursive: true });
      try
      {
        return await this.create(RepositoryLocationType.File, fileWithProtocol + directoryPath, technicalId, name, comment, watch);
      }
      catch (error)
      {
        // In case of error, we want to make sure that the repository directory is deleted
        fs.rmSync(directoryPath, { recursive: true });
        throw error;
      }
    }
  }

  async startOrStopAll(isStart: boolean): Promise<void>
  {
    logger.info(`${isStart === true ? "Starts" : "Stops"} all the repositories`);
    const repositories = await this.list();
    for (const repository of repositories)
    {
      await this.startOrStop(repository, isStart);
    }
  }

  async startOrStop(repository: Repository, isStart: boolean): Promise<void>
  {
    const { id, type } = repository;
    logger.info(`${isStart === true ? "Starts" : "Stops"} the repository with id '${id}'`);
    if (type === RepositoryLocationType.File)
    {
      this.perPathFileRepositories.set(repository.getLocation().toFilePath(), repository);
      if (fs.existsSync(repository.getLocation().toFilePath()) === false)
      {
        // The repository is not accessible
        await this.entitiesProvider.repositories.update({
          where: { id },
          data:
            {
              status: repository.status === RepositoryStatus.INDEXING ? RepositoryStatus.UNAVAILABLE_INDEXING : RepositoryStatus.UNAVAILABLE
            }
        });
        return;
      }
    }
    if (repository.status === RepositoryStatus.UNAVAILABLE || repository.status === RepositoryStatus.UNAVAILABLE_INDEXING)
    {
      await this.entitiesProvider.repositories.update({
        where: { id },
        data:
          {
            status: repository.status === RepositoryStatus.UNAVAILABLE_INDEXING ? RepositoryStatus.INDEXING : RepositoryStatus.READY
          }
      });
      repository = await this.get(id);
    }
    if (repository.status !== RepositoryStatus.READY)
    {
      // We do nothing if the repository is synchronizing, and it is asked to stop
      if (isStart === true)
      {
        if (RepositoryService.synchronizingRepositoryIds.has(id) === true)
        {
          parametersChecker.throwBadParameterError(`The repository with id '${id}' is already synchronizing`);
        }
        // We resume the synchronization
        await this.synchronize(repository, async (updatedRepository) =>
        {
          await this.watch(updatedRepository, isStart);
        });
      }
    }
    else
    {
      await this.watch(repository, isStart);
    }
  }

  async synchronize(repositoryOrId: string | Repository, onSuccess?: (repository: Repository) => Promise<void>): Promise<void>
  {
    let wasWatching: boolean = false;
    return this.internalSynchronize(repositoryOrId, async (repository: Repository): Promise<void> =>
    {
      wasWatching = RepositoryWatcher.get(repository.id) !== undefined;
      if (wasWatching === true)
      {
        // The repository is being watched
        await RepositoryWatcher.stop(repository, this.notifier);
      }
    }, async (repository: Repository, updateStatus: () => Promise<Repository>): Promise<void> =>
    {
      if (wasWatching === true)
      {
        // We resume the watching, in case the synchronization was successful
        await RepositoryWatcher.start(repository, this.entitiesProvider, this.vectorDatabaseAccessor, this.notifier, this.extensionTaskExecutor);
      }
      const updatedRepository = await updateStatus();
      if (onSuccess !== undefined)
      {
        await onSuccess(updatedRepository);
      }
    });
  }

  async watch(repositoryOrId: string | Repository, isStart: boolean, checkState: boolean = false): Promise<void>
  {
    logger.info(`${isStart === true ? "Starts" : "Stops"} watching for the repository with id '${repositoryOrId instanceof Repository ? repositoryOrId.id : repositoryOrId}'`);
    const repository = repositoryOrId instanceof Repository ? repositoryOrId : await this.get(repositoryOrId);
    const repositoryId = repository.id;
    if (repository.type !== RepositoryLocationType.File)
    {
      parametersChecker.throwBadParameterError(`The repository with id '${repositoryId}' is not based on the file system`);
    }
    if (repository.status === RepositoryStatus.UNAVAILABLE || repository.status === RepositoryStatus.UNAVAILABLE_INDEXING)
    {
      parametersChecker.throwBadParameterError(`The repository with id '${repositoryId}' is not available`);
    }
    else if (repository.status === RepositoryStatus.INDEXING)
    {
      parametersChecker.throwBadParameterError(`The repository with id '${repositoryId}' is synchronizing`);
    }
    if (isStart === true)
    {
      await RepositoryWatcher.start(repository, this.entitiesProvider, this.vectorDatabaseAccessor, this.notifier, this.extensionTaskExecutor);
    }
    else
    {
      if (checkState === true || RepositoryWatcher.get(repository.id) !== undefined)
      {
        await RepositoryWatcher.stop(repository, this.notifier);
      }
    }
  }

  async delete(repository: Repository): Promise<void>
  {
    const id = repository.id;
    logger.info(`Deleting the repository with id '${id}'`);
    if (repository.status === RepositoryStatus.INDEXING && RepositoryService.synchronizingRepositoryIds.has(id) === true)
    {
      parametersChecker.throwBadParameterError("Cannot delete a repository which is synchronizing");
    }
    if (repository.type === RepositoryLocationType.File)
    {
      this.perPathFileRepositories.delete(repository.getLocation().toFilePath());
    }
    if (RepositoryWatcher.get(id) !== undefined)
    {
      // We stop any pending watcher
      await RepositoryWatcher.stop(repository, this.notifier);
    }
    const imageIds: string[] = (await this.entitiesProvider.images.findMany({
      where: { repositoryId: id },
      select: { id: true }
    })).map((imageSummary) =>
    {
      return imageSummary.id;
    });
    // We delete the images' embeddings
    await this.vectorDatabaseAccessor.deleteImagesEmbeddings(imageIds);
    // Thanks to the cascading effect, we do not need to delete the "metadata" nor the "feature" entities
    const deleteRepository = this.entitiesProvider.repositories.delete({ where: { id } });
    await this.entitiesProvider.prisma.$transaction([deleteRepository]);
    for (const imageId of imageIds)
    {
      this.notifier.emit(EventEntity.Image, RepositoryEventAction.Deleted, undefined, { id: imageId });
    }
    this.notifier.emit(EventEntity.Repository, RepositoryEventAction.Deleted, undefined, { id });
  }

  async list(ids?: string[]): Promise<RepositoryList>
  {
    logger.info(`Listing ${ids === undefined ? "all the repositories" : (`the repositories with ids [${ids.join(",")}]`)}`);
    const where: Prisma.RepositoryWhereInput | undefined = ids === undefined ? undefined : { id: { in: ids } };
    const entities = await this.entitiesProvider.repositories.findMany({ where, orderBy: { name: "asc" } });
    if (ids !== undefined && entities.length !== ids.length)
    {
      parametersChecker.throwBadParameter("ids", ids.join(","), "some of those identifiers do not correspond to an existing repository");
    }
    return plainToInstance(Repository, entities);
  }

  async activities(): Promise<RepositoryActivities>
  {
    logger.info("Getting the repositories activities");
    const repositories = await this.entitiesProvider.repositories.findMany();
    return repositories.map((repository) =>
    {
      return new RepositoryActivity(repository.id, repository.status === RepositoryStatus.INDEXING ? RepositoryActivityKind.Synchronizing : (RepositoryWatcher.get(repository.id) !== undefined ? RepositoryActivityKind.Watching : RepositoryActivityKind.None));
    });
  }

  async getTags(): Promise<AllExtensionImageTags>
  {
    logger.info("Getting the tags");
    const tags = await this.entitiesProvider.imageTag.findMany({
      distinct: ["extensionId", "value"],
      where: { value: { not: ImageService.emptyImageTag } },
      orderBy: { extensionId: "asc" }
    });
    return tags.map((tag) =>
    {
      return new ExtensionImageTag(tag.extensionId, tag.value);
    });
  }

  async renameImage(id: string, imageId: string, nameWithoutExtension: string, relativeDirectoryPath: string | undefined): Promise<Image>
  {
    logger.info(`Renaming the image with id '${id}' to '${nameWithoutExtension}'${relativeDirectoryPath === undefined ? "" : ` with the relative directory path '${relativeDirectoryPath}'`}`);
    parametersChecker.checkString("nameWithoutExtension", nameWithoutExtension, StringLengths.Length256, StringNature.FileSystemFileName);
    parametersChecker.checkString("relativeDirectoryPath", relativeDirectoryPath, StringLengths.Length256, StringNature.FileSystemRelativeDirectoryPath, true, true);

    const entity = await this.getRepository(id);
    if (entity.status === RepositoryStatus.UNAVAILABLE || entity.status === RepositoryStatus.UNAVAILABLE_INDEXING)
    {
      parametersChecker.throwBadParameterError(`The repository with id '${id}' is not available`);
    }
    const imageEntity = await this.entitiesProvider.images.findUnique({ where: { id: imageId } });
    if (imageEntity === null)
    {
      parametersChecker.throwBadParameter("imageId", imageId, "there is no image with that identifier");
    }

    const currentFilePath = imageEntity.url.substring(fileWithProtocol.length);
    const currentExtension = path.extname(currentFilePath);
    const repositoryDirectoryPath = entity.url.substring(fileWithProtocol.length);
    const futureDirectoryPath = relativeDirectoryPath === undefined ? repositoryDirectoryPath : path.join(repositoryDirectoryPath, relativeDirectoryPath);
    const futureFilePath = path.join(futureDirectoryPath, `${nameWithoutExtension}${currentExtension}`);
    if (futureFilePath === currentFilePath)
    {
      parametersChecker.throwBadParameterError("The image file path is the same as the current one");
    }
    if (fs.existsSync(futureFilePath) === true)
    {
      parametersChecker.throwBadParameterError("There is already a file with the same name in the repository");
    }

    // We now rename the file
    if (fs.existsSync(futureDirectoryPath) === false)
    {
      fs.mkdirSync(futureDirectoryPath, { recursive: true });
    }
    fs.renameSync(currentFilePath, futureFilePath);

    // We wait for the image "renamed" event, with a time-out in order to prevent the method from hanging indefinitely
    await new Promise<void>((resolve, reject) =>
    {
      const timeoutInMilliseconds = 5_000;
      const timeout = Timers.setTimeout(() =>
      {
        reject(new Error(`The image rename event did not occur after a time-out of ${timeoutInMilliseconds} ms`));
      }, timeoutInMilliseconds);
      this.notifier.once(EventEntity.Image, ImageEventAction.Renamed, undefined, async (_event: string, value: Record<string, any>) =>
      {
        if (value.id === imageId)
        {
          Timers.clearInterval(timeout);
          // If the reject happened earlier, this will be ignored
          resolve();
        }
      });
    });
    return await this.moduleRef.get(ImageService).get(imageId);
  }

  async storeImage(id: string, buffer: Buffer, nameWithoutExtension?: string, relativeDirectoryPath?: string, applicationMetadata?: string, parentId?: string, sourceUrl?: string): Promise<Image>
  {
    const actualNameWithoutExtension = nameWithoutExtension === undefined ? `image-${randomUUID()}` : nameWithoutExtension;
    logger.info(`Storing an image with name '${actualNameWithoutExtension}' in the the repository with id '${id}'${relativeDirectoryPath === undefined ? "" : ` in relative path '${relativeDirectoryPath}'`}${parentId === undefined ? "" : ` with the parent image with id '${parentId}'`}${sourceUrl === undefined ? "" : ` from the source URL '${sourceUrl}'`}`);
    if (buffer.length > Image.IMAGE_MAXIMUM_BINARY_WEIGHT_IN_BYTES)
    {
      parametersChecker.throwBadParameterError(`The provided image exceeds the maximum allowed binary weight of ${Image.IMAGE_MAXIMUM_BINARY_WEIGHT_IN_BYTES} bytes`);
    }
    parametersChecker.checkString("nameWithoutExtension", nameWithoutExtension, StringLengths.Length256, StringNature.FileSystemFileName, true);
    parametersChecker.checkString("relativeDirectoryPath", relativeDirectoryPath, StringLengths.Length256, StringNature.FileSystemRelativeDirectoryPath, true, true);
    if (parentId !== undefined && (await this.entitiesProvider.images.findUnique({ where: { id: parentId } })) === null)
    {
      parametersChecker.throwBadParameter("parentImageId", parentId, "it does not correspond to an existing image");
    }
    parametersChecker.checkString("sourceUrl", sourceUrl, StringLengths.Length4096, StringNature.Url, true);
    let imageFormat;
    try
    {
      imageFormat = await computeFormat(buffer);
    }
    catch (error)
    {
      parametersChecker.throwBadParameterError(`The provided file is not a supported image. Reason: '${(error as Error).message}'`);
    }
    const fileExtension = toFileExtension(imageFormat);
    if (nameWithoutExtension !== undefined && path.extname(nameWithoutExtension) === fileExtension)
    {
      parametersChecker.throwBadParameter("nameWithoutExtension", nameWithoutExtension, "it contains a file extension");
    }
    const fileName = `${actualNameWithoutExtension}.${fileExtension}`;
    const repository = await this.getRepository(id);
    if (repository.status === RepositoryStatus.UNAVAILABLE || repository.status === RepositoryStatus.UNAVAILABLE_INDEXING)
    {
      parametersChecker.throwBadParameterError(`The repository with id '${id}' is not available`);
    }
    const repositoryDirectoryPath = repository.url.substring(fileWithProtocol.length);
    const fileDirectoryPath = relativeDirectoryPath === undefined ? repositoryDirectoryPath : path.resolve(repositoryDirectoryPath, relativeDirectoryPath);
    const filePath = path.resolve(fileDirectoryPath, fileName);
    if (fs.existsSync(filePath) === true)
    {
      parametersChecker.throwBadParameter("nameWithoutExtension", actualNameWithoutExtension, "a file with the same name already exists in the repository");
    }
    let parsedApplicationMetadata: ApplicationMetadata | undefined;
    if (applicationMetadata !== undefined)
    {
      const applicationMetadataParameterName = "applicationMetadata";
      if (supportsApplicationMedata(imageFormat) === false)
      {
        parametersChecker.throwBadParameter(applicationMetadataParameterName, JSON.stringify(applicationMetadata), "because only PNG and JPEG images are supported for application metadata");
      }
      let json: Json;
      try
      {
        json = JSON.parse(applicationMetadata);
      }
      catch (error)
      {
        parametersChecker.throwBadParameter(applicationMetadataParameterName, applicationMetadata, "it is not a valid JSON string");
      }
      try
      {
        parsedApplicationMetadata = await this.moduleRef.get(SearchService).computeApplicationMetadata(json, true);
      }
      catch (error)
      {
        parametersChecker.throwBadParameter(applicationMetadataParameterName, applicationMetadata, "because it does not comply with the application metadata schema");
      }

      // We check that the referenced extensions exist
      for (let index = 0; index < parsedApplicationMetadata.items.length; index++)
      {
        const item = parsedApplicationMetadata.items[index];
        if (this.extensionsRegistry.exists(item.extensionId) === false)
        {
          parametersChecker.throwBadParameter(`${applicationMetadataParameterName}.items[${index}]`, item.extensionId, "that extension is not installed");
        }
      }
    }

    return RepositoryWatcher.ignore<Image>(repository.id, path.relative(repositoryDirectoryPath, filePath), async () =>
    {
      if (parsedApplicationMetadata !== undefined)
      {
        const previousMetadata = await readApplicationMetadata(buffer, imageFormat);
        if (previousMetadata !== undefined)
        {
          // We merge with the already existing metadata
          logger.debug(`Merging the application metadata for the image with path '${filePath}'`);
          parsedApplicationMetadata.items.splice(0, 0, ...previousMetadata.items);
        }
        buffer = await writeApplicationMetadata(buffer, imageFormat, parsedApplicationMetadata);
      }
      // We ensure that the image parent directory exists
      fs.mkdirSync(path.join(filePath, ".."), { recursive: true });
      fs.writeFileSync(filePath, buffer);
      const imageDeclarationManager = new ImageDeclarationManager(1);
      try
      {
        const imageId = (await imageDeclarationManager.declareImage({
          repositoryId: repository.id,
          filePath,
          parentId,
          sourceUrl
        })).id;
        this.notifier.emit(EventEntity.Image, ImageEventAction.Created, undefined, { id: imageId });
        return await this.moduleRef.get(ImageService).get(imageId);
      }
      finally
      {
        await imageDeclarationManager.destroy();
      }
    });
  }

  async getRepository(id: string): Promise<PersistedRepository>
  {
    const entity = await this.entitiesProvider.repositories.findUnique({ where: { id } });
    if (entity === null)
    {
      parametersChecker.throwBadParameter("id", id, `there is no repository with that identifier`);
    }
    return entity;
  }

  private async internalSynchronize(repositoryOrId: string | Repository, onRepository?: (repository: Repository) => Promise<void>, onSuccess?: (repository: Repository, updateStatus: () => Promise<Repository>) => Promise<void>, onFailure?: (repository: Repository) => Promise<void>): Promise<void>
  {
    logger.info(`Synchronizing the repository with id '${repositoryOrId instanceof Repository ? repositoryOrId.id : repositoryOrId}'`);
    const repository = repositoryOrId instanceof Repository ? repositoryOrId : await this.get(repositoryOrId);
    const repositoryId = repository.id;
    if (repository.status === RepositoryStatus.UNAVAILABLE || repository.status === RepositoryStatus.UNAVAILABLE_INDEXING)
    {
      parametersChecker.throwBadParameterError(`The repository with id '${repositoryId}' is not available`);
    }
    const wasAlreadyIndexing = repository.status === RepositoryStatus.INDEXING;
    if (wasAlreadyIndexing === true && RepositoryService.synchronizingRepositoryIds.has(repositoryId) === true)
    {
      parametersChecker.throwBadParameterError(`The repository with id '${repositoryId}' is already synchronizing`);
    }
    this.notifier.emit(EventEntity.Repository, RepositoryEventAction.Synchronize, "started", { id: repositoryId });
    if (onRepository !== undefined)
    {
      await onRepository(repository);
    }
    try
    {
      if (wasAlreadyIndexing === false)
      {
        await this.entitiesProvider.repositories.update({
          where: { id: repositoryId },
          data: { status: RepositoryStatus.INDEXING }
        });
      }
      RepositoryService.synchronizingRepositoryIds.add(repositoryId);
      const imageDeclarationManager = new ImageDeclarationManager();
      let caughtError: Error | undefined;
      imageDeclarationManager.listFiles(repository.type as RepositoryLocationType, repository.url).then((filePaths: string[]): {
        filePaths: string[],
        results: Promise<(string | Error)[]>
      } =>
      {
        logger.info(`Analyzing the ${filePaths.length} image(s) for the repository with id '${repositoryId}'`);
        const promises: Promise<string | Error> [] = filePaths.map(async (filePath: string) =>
        {
          try
          {
            const event = await imageDeclarationManager.synchronizeImage({ repositoryId, filePath });
            const { id, action } = event;
            if (action !== undefined)
            {
              this.notifier.emit(EventEntity.Image, action, undefined, { id });
            }
            return id;
          }
          catch (error)
          {
            logger.error(`Could not properly synchronize the image with file '${filePath}'`, error);
            return new Error(error as string);
          }
        });
        return { filePaths, results: Promise.all<string | Error>(promises) };
      }).then(async ({ filePaths, results }): Promise<void> =>
      {
        return results.then((results) =>
        {
          const errors = results.filter((object) =>
          {
            return object instanceof Error;
          });
          if (errors.length !== 0)
          {
            logger.warn(`Could not synchronize properly ${errors.length} image(s)`);
          }
          return this.entitiesProvider.images.findMany({ where: { repositoryId } });
        }).then((images): void =>
        {
          const toDeletedImageIds: string[] = [];
          for (const image of images)
          {
            const filePath = image.url.substring(fileWithProtocol.length);
            if (filePaths.indexOf(filePath) === -1)
            {
              // The image must have been deleted in the meantime
              logger.info(`The image with id '${image.id}' in file '${filePath}' has been deleted from the back-end`);
              toDeletedImageIds.push(image.id);
            }
          }
          if (toDeletedImageIds.length > 0)
          {
            logger.info(`Deleting ${toDeletedImageIds.length} image(s) from the repository with id '${repositoryId}'`);
            this.vectorDatabaseAccessor.deleteImagesEmbeddings(toDeletedImageIds).then(() =>
            {
              this.entitiesProvider.images.deleteMany({ where: { id: { in: toDeletedImageIds } } }).then(() =>
              {
                for (const imageId of toDeletedImageIds)
                {
                  this.notifier.emit(EventEntity.Image, ImageEventAction.Deleted, undefined, { id: imageId });
                }
              });
            });
          }
        });
      }).catch((error: Error): void =>
      {
        caughtError = error;
        logger.error(`An unexpected error occurred during the synchronization of the repository with id '${repositoryId}'`, error);
      }).finally((): Promise<void> =>
      {
        async function terminate(service: RepositoryService): Promise<void>
        {
          RepositoryService.synchronizingRepositoryIds.delete(repositoryId);
          await imageDeclarationManager.destroy();
          // We let the caller update the repository status at the right moment
          const updateStatus = async (): Promise<Repository> =>
          {
            logger.debug(`Setting the repository with id '${repositoryId}' to the '${RepositoryStatus.READY}' status`);
            await service.entitiesProvider.repositories.update({
              where: { id: repositoryId },
              data:
                {
                  status: RepositoryStatus.READY
                }
            });
            return await service.get(repository.id);
          };
          if (onSuccess === undefined || caughtError !== undefined)
          {
            await updateStatus();
          }
          logger.debug(`The synchronization of the repository with id '${repositoryId}' is now over`);
          if (onSuccess !== undefined && caughtError === undefined)
          {
            await onSuccess(repository, updateStatus);
          }
          service.notifier.emit(EventEntity.Repository, RepositoryEventAction.Synchronize, "stopped", { id: repositoryId });
        }

        return new Promise((resolve, reject) =>
        {
          return terminate(this).then(resolve).catch(reject);
        });
      });
    }
    catch (error)
    {
      logger.debug(`The synchronization of the repository with id '${repositoryId}' threw an error`);
      if (onFailure !== undefined)
      {
        await onFailure(repository);
      }
      throw error;
    }
  }

}
