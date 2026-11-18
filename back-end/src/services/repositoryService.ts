import path from "node:path";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { ModuleRef } from "@nestjs/core";
import { forwardRef, Inject, Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";

import { Prisma, Repository as PersistedRepository } from ".prisma/client";
import { logger } from "../logger";
import { paths } from "../paths";
import {
  ApplicationMetadata,
  ExtensionIdImageEmbeddingName,
  ExtensionImageFeatureName,
  ExtensionImageTag,
  FieldLengths,
  fileWithProtocol,
  Image,
  ImageFeatureFormat,
  ImageFeatureType,
  Repository,
  RepositoryActivities,
  RepositoryActivity,
  RepositoryActivityKind,
  RepositoryList,
  RepositoryLocationType,
  RepositoryMode,
  RepositoryState,
  SearchOriginKind,
  toFileExtension
} from "../dtos/app.dtos";
import { Json } from "../bos";
import { RegularDatabaseService } from "./regularDatabaseService";
import { VectorDatabaseAccessor } from "./vectorDatabaseAccessor";
import { ImageDeclarationManager } from "../threads/managers";
import { EventEntity, ImageEventAction, NotifierService, RepositoryEventAction } from "./notifierService";
import { parametersChecker, StringNature } from "./utils/parametersChecker";
import { RepositoryWatcher } from "./utils/repositoryWatcher";
import {
  computeFormat,
  readApplicationMetadata,
  supportsApplicationMedata,
  writeApplicationMetadata
} from "./utils/images";
import { plainToInstanceViaJSON } from "../utils";
import { fixUtimesSync } from "./utils/downloader";
import { ExtensionRegistry } from "./extensionRegistry";
import { ImageService, SearchService } from "./imageServices";
import { CollectionService } from "./collectionService";


@Injectable()
export class RepositoryService implements OnModuleInit, OnModuleDestroy
{

  // The identifiers of the currently synchronizing repositories
  private static synchronizingRepositoryIds: Set<string> = new Set<string>();

  static checkNotDisabled(id: string, mode: RepositoryMode): void
  {
    if (mode === RepositoryMode.Disabled)
    {
      parametersChecker.throwBadParameterError(`The repository with id '${id}' is disabled`);
    }
  }

  static checkAvailable(id: string, available: boolean): void
  {
    if (available === false)
    {
      parametersChecker.throwBadParameterError(`The repository with id '${id}' is not available`);
    }
  }

  static checkNotSynchronizing(id: string, state: RepositoryState): void
  {
    if (state === RepositoryState.Indexing || RepositoryService.synchronizingRepositoryIds.has(id) === true)
    {
      parametersChecker.throwBadParameterError(`The repository with id '${id}' is synchronizing`);
    }
  }

  static checkNotAlreadySynchronizing(id: string): void
  {
    if (RepositoryService.synchronizingRepositoryIds.has(id) === true)
    {
      parametersChecker.throwBadParameterError(`The repository with id '${id}' is already synchronizing`);
    }
  }

  static checkOperable(repository: PersistedRepository): void
  {
    RepositoryService.checkNotDisabled(repository.id, repository.mode as RepositoryMode);
    RepositoryService.checkAvailable(repository.id, repository.available);
    RepositoryService.checkNotSynchronizing(repository.id, repository.state as RepositoryState);
  }

  private readonly perPathFileRepositories: Map<string, Repository> = new Map<string, Repository>();

  constructor(private readonly regularDatabaseService: RegularDatabaseService, private readonly collectionService: CollectionService, @Inject(forwardRef(() => ExtensionRegistry)) private readonly extensionsRegistry: ExtensionRegistry, private readonly vectorDatabaseAccessor: VectorDatabaseAccessor, private readonly notifierService: NotifierService, private readonly moduleRef: ModuleRef)
  {
    logger.debug("Instantiating a RepositoryService");
  }

  async onModuleInit(): Promise<void>
  {
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
    logger.debug("Destroyed a RepositoryService");
  }

  getImageRepository(nodePath: string): undefined | Repository
  {
    for (const [ path, repository ] of this.perPathFileRepositories.entries())
    {
      if (nodePath.startsWith(path) === true)
      {
        return repository;
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

  async create(type: RepositoryLocationType, url: string, name: string, comment: string | undefined, mode: RepositoryMode, extensionId: string | undefined): Promise<Repository>
  {
    logger.info(`Creating the repository with name '${name}'${comment === undefined ? "" : `, with comment '${comment}'`}, of type '${type}', URL '${url}'${extensionId === undefined ? "" : `, attached to the extension with id '${extensionId}'`} in mode '${mode}'`);
    parametersChecker.checkString("extensionId", extensionId, FieldLengths.l32, StringNature.Technical, true);
    parametersChecker.checkString("url", url, FieldLengths.l4k, StringNature.FileUrl);
    parametersChecker.checkString("name", name, FieldLengths.l128, StringNature.Name);
    parametersChecker.checkString("comment", comment, FieldLengths.l1k, StringNature.Free, true);
    parametersChecker.checkEnum("mode", mode, RepositoryMode);
    if (extensionId !== undefined)
    {
      if (this.extensionsRegistry.exists(extensionId) === false)
      {
        parametersChecker.throwBadParameter("extensionId", extensionId, "that extension is not installed");
      }
      if ((await this.regularDatabaseService.repositories.findUnique({ where: { extensionId } })) !== null)
      {
        parametersChecker.throwBadParameter("extensionId", extensionId, "the repository attached to the extension with that identifier already exists");
      }
    }
    let directoryPath = path.resolve(url.substring(fileWithProtocol.length));
    {
      {
        // We translate the URL according to the repository mapping paths
        for (const [ key, value ] of paths.repositoryMappingPaths.entries())
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
    const repositories = await this.regularDatabaseService.repositories.findMany();

    function isParentDirectory(directoryPath: string, toAssessDirectoryPath: string): boolean
    {
      const relativePath = path.relative(directoryPath, toAssessDirectoryPath);
      return relativePath.length > 0 && relativePath.startsWith("..") === false && path.isAbsolute(relativePath) === false;
    }

    // This way, we remove any URL trailing slash
    const effectiveUrl = fileWithProtocol + directoryPath;
    for (const repository of repositories)
    {
      if (repository.url === effectiveUrl)
      {
        parametersChecker.throwBadParameter("url", url, "a repository with the same URL already exists");
      }
      const repositoryDirectoryPath = repository.url.substring(fileWithProtocol.length);
      if (isParentDirectory(repositoryDirectoryPath, directoryPath) === true)
      {
        parametersChecker.throwBadParameter("url", url, `the already existing repository with id '${repository.id}' and URL '${repository.url}' is in conflict with it`);
      }
    }

    const state = mode === RepositoryMode.Disabled ? RepositoryState.Unindexed : RepositoryState.Indexing;
    const persistedRepository = await this.regularDatabaseService.repositories.create({
      data: {
        extensionId,
        name,
        type,
        url: effectiveUrl,
        comment,
        mode,
        available: true,
        state
      }
    });

    const repository = plainToInstanceViaJSON(Repository, persistedRepository);
    if (type === RepositoryLocationType.File)
    {
      this.perPathFileRepositories.set(repository.getLocation().toFilePath(), repository);
    }
    this.notifierService.emit(EventEntity.Repository, RepositoryEventAction.Created, undefined, { id: repository.id });
    if (mode !== RepositoryMode.Disabled)
    {
      await this.internalSynchronize(repository, undefined, mode !== RepositoryMode.Watching ? undefined : async (repository: Repository, updateStatus: () => Promise<Repository>): Promise<void> =>
      {
        repository = await updateStatus();
        await this.startOrStop(repository, true);
        return Promise.resolve();
      });
    }
    return repository;
  }

  async update(id: string, name: string | undefined, comment: string | undefined): Promise<Repository>
  {
    logger.info(`Updating that the repository with id '${id}''${name === undefined ? "" : `, with name '${name}'`}'${comment === undefined ? "" : `, with comment '${comment}'`}`);
    const repository = await this.getRepository(id);
    parametersChecker.checkString("name", name, FieldLengths.l128, StringNature.Free, true);
    parametersChecker.checkString("comment", comment, FieldLengths.l1k, StringNature.Free, true);
    const updatedPersistedRepository = await this.regularDatabaseService.repositories.update({
      where: { id },
      data: { name, comment }
    });
    const updatedRepository = plainToInstanceViaJSON(Repository, updatedPersistedRepository);
    if (updatedRepository.type === RepositoryLocationType.File)
    {
      this.perPathFileRepositories.set(updatedRepository.getLocation().toFilePath(), updatedRepository);
    }
    this.notifierService.emit(EventEntity.Repository, RepositoryEventAction.Updated, undefined, { id: repository.id });
    return updatedRepository;
  }

  async ensure(extensionId: string, name: string, comment: string | undefined): Promise<Repository>
  {
    logger.info(`Ensuring that the repository attached to the extension with id '${extensionId}' exists, with name '${name}'${comment === undefined ? "" : `, with comment '${comment}'`}`);
    parametersChecker.checkString("extensionId", extensionId, FieldLengths.l32, StringNature.Technical);
    if (this.extensionsRegistry.exists(extensionId) === false)
    {
      parametersChecker.throwBadParameter("extensionId", extensionId, "that extension is not installed");
    }
    const entity = await this.regularDatabaseService.repositories.findUnique({ where: { extensionId } });
    if (entity !== null)
    {
      return plainToInstanceViaJSON(Repository, entity);
    }
    else
    {
      const directoryPath = path.join(paths.repositoriesDirectoryPath, extensionId);
      const wasDirectoryExisting = fs.existsSync(directoryPath);
      if (wasDirectoryExisting === false)
      {
        fs.mkdirSync(directoryPath, { recursive: true });
      }
      try
      {
        return await this.create(RepositoryLocationType.File, fileWithProtocol + directoryPath, name, comment, RepositoryMode.Watching, extensionId);
      }
      catch (error)
      {
        // In case of error, we want to make sure that the repository directory is deleted
        if (wasDirectoryExisting === false)
        {
          fs.rmSync(directoryPath, { recursive: true });
        }
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
      const available = fs.existsSync(repository.getLocation().toFilePath());
      if (available !== repository.available)
      {
        const updatedEntity = await this.regularDatabaseService.repositories.update({
          where: { id },
          data: { available }
        });
        repository = plainToInstanceViaJSON(Repository, updatedEntity);
        this.notifierService.emit(EventEntity.Repository, RepositoryEventAction.Available, String(available), { id });
      }
      this.perPathFileRepositories.set(repository.getLocation().toFilePath(), repository);
    }
    if (isStart === false)
    {
      if (RepositoryWatcher.get(id) !== undefined)
      {
        await RepositoryWatcher.stop(repository, this.notifierService);
      }
      return;
    }
    if (repository.mode === RepositoryMode.Disabled || repository.available === false)
    {
      return;
    }
    const startWatching = async (targetRepository: Repository): Promise<void> =>
    {
      if (targetRepository.mode === RepositoryMode.Watching && RepositoryWatcher.get(id) === undefined)
      {
        await RepositoryWatcher.start(targetRepository, this.regularDatabaseService, this.notifierService, this.moduleRef.get(ImageService));
      }
    };
    if (repository.state !== RepositoryState.Ready)
    {
      RepositoryService.checkNotAlreadySynchronizing(id);
      // We resume the synchronization
      await this.synchronize(repository, startWatching);
    }
    else
    {
      await startWatching(repository);
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
        await RepositoryWatcher.stop(repository, this.notifierService);
      }
    }, async (repository: Repository, updateStatus: () => Promise<Repository>): Promise<void> =>
    {
      if (wasWatching === true)
      {
        // We resume the watching, in case the synchronization was successful
        await RepositoryWatcher.start(repository, this.regularDatabaseService, this.notifierService, this.moduleRef.get(ImageService));
      }
      const updatedRepository = await updateStatus();
      if (onSuccess !== undefined)
      {
        await onSuccess(updatedRepository);
      }
    });
  }

  async setMode(repositoryOrId: string | Repository, mode: RepositoryMode): Promise<Repository>
  {
    logger.info(`Setting the mode to '${mode}' for the repository with id '${repositoryOrId instanceof Repository ? repositoryOrId.id : repositoryOrId}'`);
    let repository = repositoryOrId instanceof Repository ? repositoryOrId : await this.get(repositoryOrId);
    const id = repository.id;
    if (repository.mode === mode)
    {
      parametersChecker.throwBadParameter("mode", mode, `the repository with id '${id}' is already in this mode`);
    }
    parametersChecker.checkEnum("mode", mode, RepositoryMode);
    RepositoryService.checkNotSynchronizing(id, repository.state);
    const available = repository.type === RepositoryLocationType.File ? fs.existsSync(repository.getLocation().toFilePath()) : repository.available;
    const availableChanged = available !== repository.available;
    const updateRepository = async (data: Prisma.RepositoryUpdateInput): Promise<Repository> =>
    {
      const updatedEntity = await this.regularDatabaseService.repositories.update({
        where: { id },
        data
      });
      const updatedRepository = plainToInstanceViaJSON(Repository, updatedEntity);
      if (updatedRepository.type === RepositoryLocationType.File)
      {
        this.perPathFileRepositories.set(updatedRepository.getLocation().toFilePath(), updatedRepository);
      }
      if (availableChanged === true)
      {
        this.notifierService.emit(EventEntity.Repository, RepositoryEventAction.Available, String(available), { id });
      }
      return updatedRepository;
    };
    if (mode !== RepositoryMode.Disabled)
    {
      if (available === false)
      {
        if (availableChanged === true)
        {
          repository = await updateRepository({ available: false });
        }
        RepositoryService.checkAvailable(id, available);
      }
      if (mode === RepositoryMode.Watching && repository.type !== RepositoryLocationType.File)
      {
        parametersChecker.throwBadParameterError(`The repository with id '${id}' is not based on the file system`);
      }
    }
    if (mode !== RepositoryMode.Watching && RepositoryWatcher.get(id) !== undefined)
    {
      await RepositoryWatcher.stop(repository, this.notifierService);
    }
    repository = await updateRepository({ mode, available });
    this.notifierService.emit(EventEntity.Repository, RepositoryEventAction.Mode, mode, { id });
    if (mode !== RepositoryMode.Disabled)
    {
      const startWatching = async (targetRepository: Repository): Promise<void> =>
      {
        await RepositoryWatcher.start(targetRepository, this.regularDatabaseService, this.notifierService, this.moduleRef.get(ImageService));
      };
      if (repository.state === RepositoryState.Unindexed)
      {
        await this.internalSynchronize(repository, undefined, mode !== RepositoryMode.Watching ? undefined : async (_synchronizedRepository: Repository, updateStatus: () => Promise<Repository>): Promise<void> =>
        {
          const updatedRepository = await updateStatus();
          await startWatching(updatedRepository);
        });
        repository = await this.get(id);
      }
      else if (mode === RepositoryMode.Watching)
      {
        await startWatching(repository);
      }
    }
    return repository;
  }

  async delete(repository: Repository): Promise<void>
  {
    const id = repository.id;
    logger.info(`Deleting the repository with id '${id}'`);
    if (repository.state === RepositoryState.Indexing && RepositoryService.synchronizingRepositoryIds.has(id) === true)
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
      await RepositoryWatcher.stop(repository, this.notifierService);
    }
    // We remove the repository from the collections
    await this.collectionService.clearFromOrigin(SearchOriginKind.Repositories, id);
    const imageIds: string[] = (await this.regularDatabaseService.images.findMany({
      where: { repositoryId: id },
      select: { id: true }
    })).map((imageSummary) =>
    {
      return imageSummary.id;
    });
    // We delete the images' embeddings
    await this.vectorDatabaseAccessor.deleteImagesEmbeddings(imageIds);
    // Thanks to the cascading effect, we do not need to delete the "metadata" nor the "feature" entities
    const deleteRepository = this.regularDatabaseService.repositories.delete({ where: { id } });
    await this.regularDatabaseService.prisma.$transaction([ deleteRepository ]);
    for (const imageId of imageIds)
    {
      this.notifierService.emit(EventEntity.Image, RepositoryEventAction.Deleted, undefined, { id: imageId });
    }
    this.notifierService.emit(EventEntity.Repository, RepositoryEventAction.Deleted, undefined, { id });
  }

  async list(ids?: string[]): Promise<RepositoryList>
  {
    logger.info(`Listing ${ids === undefined ? "all the repositories" : (`the repositories with ids ${parametersChecker.stringify(ids)}`)}`);
    if (ids !== undefined && new Set(ids).size !== ids.length)
    {
      parametersChecker.throwBadParameter("ids", ids, "a repository identifier is repeated");
    }
    const where: Prisma.RepositoryWhereInput | undefined = ids === undefined ? undefined : { id: { in: ids } };
    const entities = await this.regularDatabaseService.repositories.findMany({ where, orderBy: { name: "asc" } });
    if (ids !== undefined && entities.length !== ids.length)
    {
      parametersChecker.throwBadParameter("ids", ids, "some of those identifiers do not correspond to an existing repository");
    }
    return entities.map(entity => plainToInstanceViaJSON(Repository, entity));
  }

  async activities(): Promise<RepositoryActivities>
  {
    logger.info("Getting the repositories activities");
    const repositories = await this.regularDatabaseService.repositories.findMany();
    return repositories.map((repository) =>
    {
      return new RepositoryActivity(repository.id, repository.state === RepositoryState.Indexing ? RepositoryActivityKind.Synchronizing : (RepositoryWatcher.get(repository.id) !== undefined ? RepositoryActivityKind.Watching : RepositoryActivityKind.None));
    });
  }

  async getFeatureNames(): Promise<ExtensionImageFeatureName []>
  {
    logger.info("Getting all the extensions image feature names");
    const features = await this.regularDatabaseService.imageFeature.findMany({
      distinct: [ "extensionId", "format", "type", "name" ],
      where: { name: { not: null }, image: { repository: { mode: { not: RepositoryMode.Disabled } } } },
      orderBy: [ { extensionId: "asc" }, { name: "asc" } ]
    });
    return features.map((feature) =>
    {
      return new ExtensionImageFeatureName(feature.extensionId, feature.type as ImageFeatureType, feature.format as ImageFeatureFormat, feature.name!);
    });
  }

  async getTags(): Promise<ExtensionImageTag []>
  {
    logger.info("Getting all the extensions image tags");
    const tags = await this.regularDatabaseService.imageTag.findMany({
      distinct: [ "extensionId", "value" ],
      where: {
        value: { not: ImageService.emptyImageTag },
        image: { repository: { mode: { not: RepositoryMode.Disabled } } }
      },
      orderBy: { extensionId: "asc" }
    });
    return tags.map((tag) =>
    {
      return new ExtensionImageTag(tag.extensionId, tag.value);
    });
  }

  async getEmbeddingsNames(): Promise<ExtensionIdImageEmbeddingName []>
  {
    logger.info("Getting all the embeddings identifiers and names");
    const allRepositories = await this.regularDatabaseService.repositories.findMany({
      select: {
        id: true,
        mode: true
      }
    });
    const enabledRepositoryIds = allRepositories.filter(repository => repository.mode !== RepositoryMode.Disabled).map(repository => repository.id);
    if (enabledRepositoryIds.length === 0)
    {
      return [];
    }
    const embeddingsNames = await this.vectorDatabaseAccessor.getExtensionEmbeddingsNames(enabledRepositoryIds.length === allRepositories.length ? undefined : enabledRepositoryIds);
    return embeddingsNames.map(embeddingsName => plainToInstanceViaJSON(ExtensionIdImageEmbeddingName, {
      extensionId: embeddingsName.id,
      name: embeddingsName.name
    }));
  }

  async renameImage(id: string, imageId: string, nameWithoutExtension: string, relativeDirectoryPath: string | undefined): Promise<Image>
  {
    logger.info(`Renaming the image with id '${id}' to '${nameWithoutExtension}'${relativeDirectoryPath === undefined ? "" : ` with the relative directory path '${relativeDirectoryPath}'`}`);
    parametersChecker.checkString("nameWithoutExtension", nameWithoutExtension, FieldLengths.l512, StringNature.FileSystemFileName);
    parametersChecker.checkString("relativeDirectoryPath", relativeDirectoryPath, FieldLengths.l4k, StringNature.FileSystemRelativeDirectoryPath, true, true);

    const repository = await this.getRepository(id);
    RepositoryService.checkOperable(repository);
    const imageEntity = await this.regularDatabaseService.images.findUnique({ where: { id: imageId } });
    if (imageEntity === null)
    {
      parametersChecker.throwBadParameter("imageId", imageId, "there is no image with that identifier");
    }
    if (imageEntity.repositoryId !== id)
    {
      parametersChecker.throwBadParameter("imageId", imageId, `it does not belong to the repository with id '${id}'`);
    }

    const currentFilePath = imageEntity.url.substring(fileWithProtocol.length);
    const currentExtension = path.extname(currentFilePath);
    const repositoryDirectoryPath = repository.url.substring(fileWithProtocol.length);
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

    const imageService = this.moduleRef.get(ImageService);
    await RepositoryWatcher.ignore(repository.id, [ path.relative(repositoryDirectoryPath, currentFilePath), path.relative(repositoryDirectoryPath, futureFilePath) ], async () =>
    {
      // We now rename the file
      if (fs.existsSync(futureDirectoryPath) === false)
      {
        fs.mkdirSync(futureDirectoryPath, { recursive: true });
      }
      fs.renameSync(currentFilePath, futureFilePath);
      await imageService.renamePersistedImage(imageId, futureFilePath);
    });
    return await imageService.get(imageId);
  }

  async storeImage(id: string, buffer: Buffer, nameWithoutExtension?: string, relativeDirectoryPath?: string, applicationMetadata?: string, parentId?: string, sourceUrl?: string, inceptionDate?: number): Promise<Image>
  {
    const actualNameWithoutExtension = nameWithoutExtension === undefined ? `image-${randomUUID()}` : nameWithoutExtension;
    const actualInceptionDate = inceptionDate === undefined ? undefined : new Date(inceptionDate);
    logger.info(`Storing an image with name '${actualNameWithoutExtension}' in the the repository with id '${id}'${relativeDirectoryPath === undefined ? "" : ` in relative path '${relativeDirectoryPath}'`}${parentId === undefined ? "" : ` with the parent image with id '${parentId}'`}${sourceUrl === undefined ? "" : ` from the source URL '${sourceUrl}'`}${actualInceptionDate === undefined ? "" : ` with inception date '${actualInceptionDate}'`}`);
    if (buffer.length > Image.IMAGE_MAXIMUM_BINARY_WEIGHT_IN_BYTES)
    {
      parametersChecker.throwBadParameterError(`The provided image exceeds the maximum allowed binary weight of ${Image.IMAGE_MAXIMUM_BINARY_WEIGHT_IN_BYTES} bytes`);
    }
    parametersChecker.checkString("nameWithoutExtension", nameWithoutExtension, FieldLengths.l512, StringNature.FileSystemFileName, true);
    parametersChecker.checkString("relativeDirectoryPath", relativeDirectoryPath, FieldLengths.l4k, StringNature.FileSystemRelativeDirectoryPath, true, true);
    if (parentId !== undefined)
    {
      const parentImage = await this.regularDatabaseService.images.findUnique({
        where: { id: parentId },
        select: { id: true, repositoryId: true, repository: { select: { mode: true } } }
      });
      if (parentImage === null)
      {
        parametersChecker.throwBadParameter("parentImageId", parentId, "it does not correspond to an existing image");
      }
      RepositoryService.checkNotDisabled(parentImage.repositoryId, parentImage.repository.mode as RepositoryMode);
    }
    parametersChecker.checkString("sourceUrl", sourceUrl, FieldLengths.l4k, StringNature.Url, true);
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
    const repository = await this.getRepository(id);
    RepositoryService.checkOperable(repository);
    const repositoryDirectoryPath = repository.url.substring(fileWithProtocol.length);
    const fileDirectoryPath = relativeDirectoryPath === undefined ? repositoryDirectoryPath : path.resolve(repositoryDirectoryPath, relativeDirectoryPath);
    const fileName = `${actualNameWithoutExtension}.${fileExtension}`;
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
        parametersChecker.throwBadParameter(applicationMetadataParameterName, applicationMetadata, "only PNG and JPEG images are supported for application metadata");
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
        parametersChecker.throwBadParameter(applicationMetadataParameterName, applicationMetadata, "it does not comply with the application metadata schema");
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

    return RepositoryWatcher.ignore<Image>(repository.id, [ path.relative(repositoryDirectoryPath, filePath) ], async () =>
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
      if (actualInceptionDate !== undefined)
      {
        fixUtimesSync(filePath, actualInceptionDate);
      }
      const imageDeclarationManager = new ImageDeclarationManager(1);
      try
      {
        const imageId = (await imageDeclarationManager.declareImage({
          repositoryId: repository.id,
          filePath,
          parentId,
          sourceUrl
        })).id;
        this.notifierService.emit(EventEntity.Image, ImageEventAction.Created, undefined, { id: imageId });
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
    const entity = await this.regularDatabaseService.repositories.findUnique({ where: { id } });
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
    RepositoryService.checkNotDisabled(repositoryId, repository.mode);
    RepositoryService.checkAvailable(repositoryId, repository.available);
    const wasAlreadyIndexing = repository.state === RepositoryState.Indexing;
    if (wasAlreadyIndexing === true)
    {
      RepositoryService.checkNotAlreadySynchronizing(repositoryId);
    }
    this.notifierService.emit(EventEntity.Repository, RepositoryEventAction.Synchronize, "started", { id: repositoryId });
    if (onRepository !== undefined)
    {
      await onRepository(repository);
    }
    try
    {
      if (wasAlreadyIndexing === false)
      {
        const updatedPersistedRepository = await this.regularDatabaseService.repositories.update({
          where: { id: repositoryId },
          data: { state: RepositoryState.Indexing }
        });
        const updatedRepository = plainToInstanceViaJSON(Repository, updatedPersistedRepository);
        if (updatedRepository.type === RepositoryLocationType.File)
        {
          this.perPathFileRepositories.set(updatedRepository.getLocation().toFilePath(), updatedRepository);
        }
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
              this.notifierService.emit(EventEntity.Image, action, undefined, { id });
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
          return this.regularDatabaseService.images.findMany({ where: { repositoryId } });
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
              this.regularDatabaseService.images.deleteMany({ where: { id: { in: toDeletedImageIds } } }).then(() =>
              {
                for (const imageId of toDeletedImageIds)
                {
                  this.notifierService.emit(EventEntity.Image, ImageEventAction.Deleted, undefined, { id: imageId });
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
            logger.debug(`Setting the repository with id '${repositoryId}' to the '${RepositoryState.Ready}' status`);
            await service.regularDatabaseService.repositories.update({
              where: { id: repositoryId },
              data:
                {
                  state: RepositoryState.Ready
                }
            });
            const updatedRepository = await service.get(repository.id);
            if (updatedRepository.type === RepositoryLocationType.File)
            {
              service.perPathFileRepositories.set(updatedRepository.getLocation().toFilePath(), updatedRepository);
            }
            return updatedRepository;
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
          service.notifierService.emit(EventEntity.Repository, RepositoryEventAction.Synchronize, "stopped", { id: repositoryId });
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
