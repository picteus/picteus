import path from "node:path";
import fs from "node:fs";
import { ChildProcess } from "node:child_process";
import Timers from "node:timers";

import { ChromaClient, Collection, GetResult, IncludeEnum } from "chromadb";
import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";

import { Prisma, PrismaClient } from ".prisma/client";
import { paths } from "../paths";
import { logger } from "../logger";
import { killProcess, spawn } from "./utils/processWrapper";
import { ApplicationSettings } from "../dtos/app.dtos";
import { Persistence, PersistenceProvider } from "../persistence";
import {
  computeVirtualEnvironmentBinaryDirectoryPath,
  ensureViaVirtualEnvironmentPip,
  ensureVirtualEnvironment,
  pythonVersion
} from "./utils/pythonWrapper";
import { parametersChecker } from "./utils/parametersChecker";


@Injectable()
export class EntitiesProvider implements OnModuleInit, OnModuleDestroy, PersistenceProvider
{

  private _persistence?: Persistence;

  public get persistence(): Persistence
  {
    if (this._persistence === undefined)
    {
      throw new Error("The persistence has not been initialized");
    }
    return this._persistence;
  }

  async onModuleInit(): Promise<void>
  {
    // We initialize the persistence
    await this.initialize();
    logger.debug("The initializing of an EntitiesProvider is over");
  }

  async onModuleDestroy(): Promise<void>
  {
    logger.debug("Destroying an EntitiesProvider");
    // We terminate the persistence
    await this.terminate();
    logger.debug("Destroyed an EntitiesProvider");
  }

  async initialize(): Promise<void>
  {
    this._persistence = new Persistence();
    await this.persistence.initialize();
  }

  async terminate(): Promise<void>
  {
    await this.persistence.terminate();
    this._persistence = undefined;
  }

  get prisma(): PrismaClient
  {
    return this.persistence.prisma;
  }

  get applicationSettings(): Promise<ApplicationSettings>
  {
    return this.persistence.applicationSettings;
  }

  setApplicationSettings(settings: ApplicationSettings): Promise<void>
  {
    return this.persistence.setApplicationSettings(settings);
  }

  get apiSecrets(): Prisma.ApiSecretDelegate
  {
    return this.persistence.apiSecrets;
  }

  get extensionSettings(): Prisma.ExtensionSettingsDelegate
  {
    return this.persistence.extensionSettings;
  }

  get repositories(): Prisma.RepositoryDelegate
  {
    return this.persistence.repositories;
  }

  get collections(): Prisma.CollectionDelegate
  {
    return this.persistence.collections;
  }

  get images(): Prisma.ImageDelegate
  {
    return this.persistence.images;
  }

  get imageMetadata(): Prisma.ImageMetadataDelegate
  {
    return this.persistence.imageMetadata;
  }

  get imageFeature(): Prisma.ImageFeatureDelegate
  {
    return this.persistence.imageFeature;
  }

  get imageTag(): Prisma.ImageTagDelegate
  {
    return this.persistence.imageTag;
  }

  get imageAttachment(): Prisma.ImageAttachmentDelegate
  {
    return this.persistence.imageAttachment;
  }

}

class ChromaProvider
{

  protected readonly enabled;

  protected readonly localLoopBack = "127.0.0.1";

  constructor()
  {
    this.enabled = paths.useVectorDatabase;
  }

}

// Chroma alternatives are: https://github.com/weaviate/weaviate; https://github.com/qdrant/qdrant, https://github.com/facebookresearch/faiss
@Injectable()
export class VectorDatabaseProvider extends ChromaProvider implements OnModuleInit, OnModuleDestroy
{

  private readonly chromaDbVersion = "1.0.20";

  private childProcess?: ChildProcess;

  async onModuleInit(): Promise<void>
  {
    await this.initialize();
    logger.debug("The initializing of a VectorDatabaseProvider is over");
  }

  async onModuleDestroy(): Promise<void>
  {
    logger.debug("Destroying a VectorDatabaseProvider");
    await this.terminate();
    logger.debug("Destroyed a VectorDatabaseProvider");
  }

  private async initialize(): Promise<void>
  {
    if (this.enabled === true)
    {
      const chromaDirectoryPath = paths.vectorDatabaseDirectoryPath;
      const chromaBinaryFileName = "chroma" + (process.platform === "win32" ? ".exe" : "");
      const vectorDatabaseDirectoryPath = await this.installChroma(chromaDirectoryPath, chromaBinaryFileName);
      const portNumber = paths.vectorDatabasePortNumber;
      logger.info(`Starting the Chroma server on port ${portNumber} and waiting for it to be ready`);
      const childProcess: ChildProcess = spawn(path.join(computeVirtualEnvironmentBinaryDirectoryPath(chromaDirectoryPath), chromaBinaryFileName), [ "run", "--path", ".", "--host", this.localLoopBack, "--port", portNumber.toString() ], vectorDatabaseDirectoryPath, { "ANONYMIZED_TELEMETRY": "False" }, false, "pipe");
      if (childProcess.stdout === null)
      {
        throw new Error("The Chroma server stdout is null");
      }
      this.childProcess = childProcess;

      await new Promise<void>((resolve, reject) =>
      {
        let resolvedOrRejected = false;
        // We keep on listening to the vector database server forever
        childProcess.once("exit", (code: number | null, signal: NodeJS.Signals | null) =>
        {
          const hasErrorExitCode = code !== null && code !== 0;
          const hasUnexpectedSignal = signal !== null && signal !== "SIGTERM";
          const message = `The Chroma server running through the process with id '${childProcess.pid}' exited${(hasErrorExitCode === true) ? ` with code ${code}` : hasUnexpectedSignal === true ? ` with signal '${signal}'` : ""}`;
          if (resolvedOrRejected === false && (hasErrorExitCode === true || hasUnexpectedSignal === true))
          {
            resolvedOrRejected = true;
            reject(new Error(message));
          }
          else
          {
            if (hasErrorExitCode === true || hasUnexpectedSignal === true)
            {
              logger.error(message);
            }
            else
            {
              logger.info(message);
            }
          }
        });
        const stdout = childProcess.stdout!;
        const stderr = childProcess.stderr!;
        const listener = (chunk: any) =>
        {
          const log = chunk.toString();
          if (log.indexOf("is not available") !== -1)
          {
            if (resolvedOrRejected === false)
            {
              resolvedOrRejected = true;
              reject(new Error(`The Chroma server could not start because the port ${portNumber} is already in use`));
            }
          }
          else if (log.indexOf("Uvicorn running on") !== -1 || log.indexOf("Listening on ") !== -1 || log.indexOf("Connect to Chroma at") !== -1)
          {
            logger.info("The Chroma server is up and running");
            stdout.removeListener("data", listener);
            stderr.removeListener("data", listener);
            if (resolvedOrRejected === false)
            {
              resolvedOrRejected = true;
              resolve();
            }
          }
        };
        stdout.addListener("data", listener);
        stderr.addListener("data", listener);
      });
    }
  }

  private async terminate(): Promise<void>
  {
    if (this.childProcess !== undefined)
    {
      logger.info("Stopping the Chroma server");
      await killProcess(this.childProcess);
      this.childProcess = undefined;
    }
  }

  private async installChroma(chromaDirectoryPath: string, chromaBinaryFileName: string): Promise<string>
  {
    try
    {
      logger.info("Ensuring that Chroma is installed as a vector database");
      await ensureVirtualEnvironment(pythonVersion, chromaDirectoryPath);
      await ensureViaVirtualEnvironmentPip(chromaDirectoryPath, [ "chromadb==" + this.chromaDbVersion ], chromaBinaryFileName);
    }
    catch (error)
    {
      logger.error("Could not ensure the Chroma runtime environment", error);
      throw error;
    }

    const vectorDatabaseDirectoryPath = paths.vectorDatabaseDirectoryPath;
    if (fs.existsSync(vectorDatabaseDirectoryPath) === false)
    {
      fs.mkdirSync(vectorDatabaseDirectoryPath, { recursive: true });
    }
    return vectorDatabaseDirectoryPath;
  }

}

export type ImageIdAndDistance =
  {
    imageId: string,
    distance: number
  };

type EmbeddingNameAndValues = { name: string, values: number[] };

class MemoryEmbeddingsManager
{

  private static readonly instance: MemoryEmbeddingsManager = new MemoryEmbeddingsManager();

  static get(): MemoryEmbeddingsManager
  {
    return MemoryEmbeddingsManager.instance;
  }

  private readonly perExtensionIdPerEmbeddingNameMapPerImageIdEmbeddingMap: Map<string, Map<string, Map<string, number[]>>> = new Map();

  extensionIds(): string[]
  {
    return Array.from(this.perExtensionIdPerEmbeddingNameMapPerImageIdEmbeddingMap.keys());
  }

  async extensionEmbeddingsNames(): Promise<ExtensionIdAndEmbeddingName[]>
  {
    const extensionIds = this.extensionIds();
    const embeddingNames: ExtensionIdAndEmbeddingName[] = [];
    for (const extensionId of extensionIds)
    {
      const perEmbeddingNameMap = this.perExtensionIdPerEmbeddingNameMapPerImageIdEmbeddingMap.get(extensionId);
      if (perEmbeddingNameMap)
      {
        for (const name of perEmbeddingNameMap.keys())
        {
          embeddingNames.push({ id: extensionId, name });
        }
      }
    }
    return embeddingNames;
  }

  getImageIds(extensionId: string): string[]
  {
    const perEmbeddingNameMap = this.perExtensionIdPerEmbeddingNameMapPerImageIdEmbeddingMap.get(extensionId);
    if (perEmbeddingNameMap === undefined)
    {
      return [];
    }
    const imageIds = new Set<string>();
    for (const perImageIdEmbeddingMap of perEmbeddingNameMap.values())
    {
      for (const imageId of perImageIdEmbeddingMap.keys())
      {
        imageIds.add(imageId);
      }
    }
    return Array.from(imageIds);
  }

  get(imageId: string, extensionId: string): EmbeddingNameAndValues[]
  {
    const perEmbeddingNameMap = this.perExtensionIdPerEmbeddingNameMapPerImageIdEmbeddingMap.get(extensionId);
    if (perEmbeddingNameMap === undefined)
    {
      return [];
    }
    const result: EmbeddingNameAndValues[] = [];
    for (const [ name, perImageIdEmbeddingMap ] of perEmbeddingNameMap.entries())
    {
      const values = perImageIdEmbeddingMap.get(imageId);
      if (values !== undefined)
      {
        result.push({ name, values });
      }
    }
    return result;
  }

  set(imageId: string, extensionId: string, embeddings: EmbeddingNameAndValues[]): void
  {
    let perEmbeddingNameMap = this.perExtensionIdPerEmbeddingNameMapPerImageIdEmbeddingMap.get(extensionId);
    if (perEmbeddingNameMap === undefined)
    {
      perEmbeddingNameMap = new Map();
      this.perExtensionIdPerEmbeddingNameMapPerImageIdEmbeddingMap.set(extensionId, perEmbeddingNameMap);
    }

    for (const perImageIdEmbeddingMap of perEmbeddingNameMap.values())
    {
      perImageIdEmbeddingMap.delete(imageId);
    }

    for (const embedding of embeddings)
    {
      let perImageIdEmbeddingMap = perEmbeddingNameMap.get(embedding.name);
      if (perImageIdEmbeddingMap === undefined)
      {
        perImageIdEmbeddingMap = new Map();
        perEmbeddingNameMap.set(embedding.name, perImageIdEmbeddingMap);
      }
      else
      {
        const nameValues = perImageIdEmbeddingMap.entries().next().value;
        if (nameValues !== undefined)
        {
          const value: number[] = nameValues[1];
          if (value.length !== embedding.values.length)
          {
            parametersChecker.throwBadParameterError(`The embeddings length ${embedding.values.length} is not the expected one ${value.length}`);
          }
        }
      }
      perImageIdEmbeddingMap.set(imageId, embedding.values);
    }
  }

  async query(extensionId: string, name: string, _embeddings: number[], _count: number): Promise<ImageIdAndDistance[]>
  {
    const perEmbeddingNameMap = this.perExtensionIdPerEmbeddingNameMapPerImageIdEmbeddingMap.get(extensionId);
    if (perEmbeddingNameMap === undefined)
    {
      return [];
    }
    const perImageIdEmbeddingMap = perEmbeddingNameMap.get(name);
    if (perImageIdEmbeddingMap === undefined)
    {
      return [];
    }
    const imageId: string | undefined = perImageIdEmbeddingMap.keys().next().value;
    return imageId === undefined ? [] : [ { imageId, distance: 0.12345 } ];
  }

  deleteImage(imageIds: string[], extensionId?: string): void
  {
    for (const [ _extensionId, perEmbeddingNameMap ] of this.perExtensionIdPerEmbeddingNameMapPerImageIdEmbeddingMap)
    {
      if (extensionId !== undefined && extensionId !== _extensionId)
      {
        continue;
      }
      for (const perImageIdEmbeddingMap of perEmbeddingNameMap.values())
      {
        for (const imageId of imageIds)
        {
          perImageIdEmbeddingMap.delete(imageId);
        }
      }
    }
  }

  deleteExtension(extensionId: string): void
  {
    this.perExtensionIdPerEmbeddingNameMapPerImageIdEmbeddingMap.delete(extensionId);
  }

}

export type ExtensionIdAndEmbeddingName = { id: string, name: string };

@Injectable()
export class VectorDatabaseAccessor extends ChromaProvider implements OnModuleInit, OnModuleDestroy
{

  private client: ChromaClient | undefined;

  private readonly perExtensionIdEmbeddingNameCollectionsMap: Map<string, Collection> = new Map();

  async onModuleInit(): Promise<void>
  {
    await this.initialize();
    logger.debug("The initializing of a VectorDatabaseAccessor is over");
  }

  async onModuleDestroy(): Promise<void>
  {
    logger.debug("Destroying a VectorDatabaseAccessor");
    await this.terminate();
    logger.debug("Destroyed a VectorDatabaseAccessor");
  }

  async getExtensionIds(): Promise<string[]>
  {
    logger.debug("Getting all the extension identifiers registered to the vector database");
    if (this.enabled === true)
    {
      const collection: Collection[] = await (await this.getClient()).listCollections({});
      return collection.map((collectionType) =>
      {
        return collectionType.metadata!.id as string;
      });
    }
    else
    {
      return MemoryEmbeddingsManager.get().extensionIds();
    }
  }

  async getExtensionEmbeddingsNames(): Promise<ExtensionIdAndEmbeddingName[]>
  {
    logger.debug("Getting all the extension identifiers and embeddings names registered to the vector database");
    if (this.enabled === true)
    {
      const collections: Collection[] = await (await this.getClient()).listCollections({});
      // TODO: remove this filter once the migration is over
      const filteredCollections = collections.filter(collection => collection.metadata?.name !== undefined);
      return filteredCollections.map((collection) =>
      {
        const metadata = collection.metadata!;
        return { id: metadata.id as string, name: metadata.name as string };
      });
    }
    else
    {
      return MemoryEmbeddingsManager.get().extensionEmbeddingsNames();
    }
  }

  async getImageIds(extensionId: string): Promise<string[]>
  {
    logger.debug(`Getting the image ids computed by the extension with id '${extensionId}'`);
    if (this.enabled === true)
    {
      const collections = await this.getExtensionCollections(extensionId);
      const imageIds = new Set<string>();
      for (const collection of collections)
      {
        const response: GetResult = await collection.get({});
        for (const id of response.ids)
        {
          imageIds.add(id);
        }
      }
      return Array.from(imageIds);
    }
    else
    {
      return MemoryEmbeddingsManager.get().getImageIds(extensionId);
    }
  }

  async getEmbeddings(imageId: string, extensionId: string): Promise<EmbeddingNameAndValues[]>
  {
    logger.debug(`Getting the embeddings for the image with id '${imageId}' computed by the extension with id '${extensionId}'`);
    if (this.enabled === true)
    {
      const collections = await this.getExtensionCollections(extensionId);
      const result: EmbeddingNameAndValues[] = [];
      for (const collection of collections)
      {
        const response: GetResult = await collection.get({ ids: [ imageId ], include: [ IncludeEnum.embeddings ] });
        const embeddingsArray = response.embeddings;
        if (embeddingsArray !== null && embeddingsArray.length > 0)
        {
          result.push({ name: collection.metadata!.name as string, values: embeddingsArray[0] });
        }
      }
      return result;
    }
    else
    {
      return MemoryEmbeddingsManager.get().get(imageId, extensionId);
    }
  }

  async setEmbeddings(imageId: string, extensionId: string, nameAndValues: EmbeddingNameAndValues[]): Promise<void>
  {
    logger.debug(`Setting the embeddings for the image with id '${imageId}' computed by the extension with id '${extensionId}'`);
    if (this.enabled === true)
    {
      // We first delete the image from all perExtensionIdEmbeddingNameCollectionsMap of this extension
      const collections = await this.getExtensionCollections(extensionId);
      const imageIds = [ imageId ];
      for (const collection of collections)
      {
        try
        {
          await collection.delete({ ids: imageIds });
        }
        catch (error)
        {
          // We ignore this error if the image does not exist
        }
      }

      // Then, we upsert the new embeddings
      for (const embedding of nameAndValues)
      {
        const extensionIdAndEmbeddingName = { id: extensionId, name: embedding.name };
        const collection = await this.ensureCollection(extensionIdAndEmbeddingName);
        try
        {
          await collection.upsert({ ids: imageIds, embeddings: [ embedding.values ] });
        }
        catch (error)
        {
          const firstElement = await collection.get({
            ids: imageIds,
            include: [ IncludeEnum.embeddings, IncludeEnum.metadatas ],
            limit: 1
          });
          const firstEmbeddings = firstElement.embeddings;
          const firstEmbedding = firstEmbeddings === null ? undefined : firstEmbeddings[0];
          parametersChecker.throwBadParameterError(firstEmbedding !== undefined ? `The embeddings length ${embedding.values.length} is not the expected one ${firstEmbedding.length}` : `The provided embeddings are invalid. Reason: '${(error as Error).message}'`);
        }
      }
    }
    else
    {
      MemoryEmbeddingsManager.get().set(imageId, extensionId, nameAndValues);
    }
  }

  async queryEmbeddings(extensionIdAndEmbeddingName: ExtensionIdAndEmbeddingName, embeddings: number[], count: number): Promise<ImageIdAndDistance[]>
  {
    const { id: extensionId, name } = extensionIdAndEmbeddingName;
    logger.debug(`Querying the closest ${count} embedding(s) relative to some given embeddings, computed by the extension with id '${extensionId}' and name '${name}'`);
    if (this.enabled === true)
    {
      const collection = await this.getCollection(extensionIdAndEmbeddingName);
      if (collection === undefined)
      {
        return [];
      }
      const result = await collection.query({
        queryEmbeddings: [ embeddings ],
        nResults: count,
        include: [ IncludeEnum.embeddings, IncludeEnum.distances ]
      });
      const ids: string[] = result.ids![0];
      const distances: (number | null)[] = result.distances![0];
      return ids.map((id, index) =>
      {
        return { imageId: id, distance: distances[index]! };
      });
    }
    else
    {
      return MemoryEmbeddingsManager.get().query(extensionId, name, embeddings, count);
    }
  }

  async deleteImagesEmbeddings(imageIds: string[], extensionId?: string): Promise<void>
  {
    const imageIdsLogFragment = `${imageIds.join(", ")}`;
    logger.debug(`Deleting the embeddings for the image with id '${imageIdsLogFragment}'${extensionId !== undefined ? ` for the extension with id '${extensionId}'` : ""}`);
    if (this.enabled === true)
    {
      const extensionIds = extensionId !== undefined ? [ extensionId ] : await this.getExtensionIds();
      for (const extId of extensionIds)
      {
        const collections = await this.getExtensionCollections(extId);
        for (const collection of collections)
        {
          logger.debug(`Deleting the embeddings for the image with '${imageIdsLogFragment}' for the collection '${collection.name}'`);
          try
          {
            await collection.delete({ ids: imageIds });
          }
          catch (error)
          {
            // When an embedding does not exist, Chroma raises an error
            for (const imageId of imageIds)
            {
              try
              {
                await collection.delete({ ids: [ imageId ] });
              }
              catch (error)
              {
                // This happens when the embedding does not exist
              }
            }
          }
        }
      }
    }
    else
    {
      return MemoryEmbeddingsManager.get().deleteImage(imageIds, extensionId);
    }
  }

  async deleteExtensionEmbeddings(extensionId: string): Promise<void>
  {
    logger.debug(`Deleting the collection for the extension with id '${extensionId}'`);
    if (this.enabled === true)
    {
      const collections = await this.getExtensionCollections(extensionId);
      const client = await this.getClient();
      for (const collection of collections)
      {
        await client.deleteCollection({ name: collection.name });
        this.perExtensionIdEmbeddingNameCollectionsMap.delete(collection.name);
      }
    }
    else
    {
      MemoryEmbeddingsManager.get().deleteExtension(extensionId);
    }
  }

  private async initialize(): Promise<void>
  {
    if (this.enabled === true)
    {
      logger.info("Initializing a Chroma client");
      const { ChromaClient } = await import("chromadb");
      this.client = new ChromaClient({
        host: this.localLoopBack,
        port: paths.vectorDatabasePortNumber,
        ssl: false
        // TODO: secure the database connection
        // auth:
        //   {
        //     provider: "basic",
        //     credentials: "admin:admin"
        //   }
      });
      logger.debug("The Chroma client is now ready");
    }
  }

  private async terminate(): Promise<void>
  {
  }

  private async getExtensionCollections(extensionId: string): Promise<Collection[]>
  {
    if (this.enabled === true)
    {
      const collections = await (await this.getClient()).listCollections({});
      return collections.filter(collection => collection.metadata?.id === extensionId);
    }
    return [];
  }

  private async ensureCollection(extensionIdAndEmbeddingName: ExtensionIdAndEmbeddingName): Promise<Collection>
  {
    let collection = await this.getCollection(extensionIdAndEmbeddingName);
    if (collection === undefined)
    {
      collection = await this.createCollection(extensionIdAndEmbeddingName);
    }
    return collection;
  }

  private async getCollection(extensionIdAndEmbeddingName: ExtensionIdAndEmbeddingName): Promise<Collection | undefined>
  {
    const { id: extensionId, name } = extensionIdAndEmbeddingName;
    const collectionName = this.computeExtensionCollectionName(extensionIdAndEmbeddingName);
    logger.debug(`Getting the vector database collection for the extension with id '${extensionId}' and name '${name}'`);
    return this.perExtensionIdEmbeddingNameCollectionsMap.get(collectionName);
  }

  private async createCollection(extensionIdAndEmbeddingName: ExtensionIdAndEmbeddingName): Promise<Collection>
  {
    const { id: extensionId, name } = extensionIdAndEmbeddingName;
    const collectionName = this.computeExtensionCollectionName(extensionIdAndEmbeddingName);
    logger.info(`Initializing the Chroma collection for the extension with id '${extensionId}' and name '${name}'`);
    const collection: Collection = await (await this.getClient()).getOrCreateCollection({
      name: collectionName,
      metadata:
        {
          id: extensionId,
          name,
          description: `The images embeddings for the extension with id '${extensionId}' and name '${name}'`,
          "hnsw:space": "cosine"
        }
    });
    this.perExtensionIdEmbeddingNameCollectionsMap.set(collectionName, collection);
    return collection;
  }

  private computeExtensionCollectionName(extensionIdAndEmbeddingName: ExtensionIdAndEmbeddingName): string
  {
    return `images.${extensionIdAndEmbeddingName.id}.${extensionIdAndEmbeddingName.name}`;
  }

  private async getClient(): Promise<ChromaClient>
  {
    if (this.client === undefined)
    {
      // We wait for the client to be ready, probably because of the Chroma dynamical library import
      return await new Promise<ChromaClient>((resolve) =>
      {
        const interval = Timers.setInterval(() =>
        {
          if (this.client !== undefined)
          {
            clearInterval(interval);
            resolve(this.client);
          }
        }, 1000 / 60);
      });
    }
    else
    {
      return this.client;
    }
  }

}
