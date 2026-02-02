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
import { Settings } from "../dtos/app.dtos";
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

  get settings(): Promise<Settings>
  {
    return this.persistence.settings;
  }

  setSettings(settings: Settings): Promise<void>
  {
    return this.persistence.setSettings(settings);
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
      const childProcess: ChildProcess = spawn(path.join(computeVirtualEnvironmentBinaryDirectoryPath(chromaDirectoryPath), chromaBinaryFileName), ["run", "--path", ".", "--host", this.localLoopBack, "--port", portNumber.toString()], vectorDatabaseDirectoryPath, { "ANONYMIZED_TELEMETRY": "False" }, false, "pipe");
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
      await ensureViaVirtualEnvironmentPip(chromaDirectoryPath, ["chromadb==" + this.chromaDbVersion], chromaBinaryFileName);
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

class MemoryEmbeddingsManager
{

  private static readonly instance: MemoryEmbeddingsManager = new MemoryEmbeddingsManager();

  static get(): MemoryEmbeddingsManager
  {
    return MemoryEmbeddingsManager.instance;
  }

  private readonly map: Map<string, Map<string, Array<number>>> = new Map();

  extensionIds(): string[]
  {
    return Array.from(this.map.keys());
  }

  getImageIds(extensionId: string): string[]
  {
    const perExtensionEmbeddings: Map<string, Array<number>> | undefined = this.map.get(extensionId);
    return perExtensionEmbeddings === undefined ? [] : Array.from(perExtensionEmbeddings.keys());
  }

  get(imageId: string, extensionId: string): Array<number> | undefined
  {
    const perExtensionEmbeddings: Map<string, Array<number>> | undefined = this.map.get(extensionId);
    return perExtensionEmbeddings === undefined ? undefined : perExtensionEmbeddings.get(imageId);
  }

  set(imageId: string, extensionId: string, embeddings: Array<number>): void
  {
    let perExtensionEmbeddings = this.map.get(extensionId);
    if (perExtensionEmbeddings === undefined)
    {
      perExtensionEmbeddings = new Map();
      this.map.set(extensionId, perExtensionEmbeddings);
    }
    else
    {
      const extensionValues = perExtensionEmbeddings.entries().next().value;
      if (extensionValues !== undefined)
      {
        const value: Array<number> = extensionValues[1];
        if (value.length !== embeddings.length)
        {
          parametersChecker.throwBadParameterError(`The embeddings length ${embeddings.length} is not the expected one ${value.length}`);
        }
      }
    }
    perExtensionEmbeddings.set(imageId, embeddings);
  }

  async query(extensionId: string, _embeddings: Array<number>, _count: number): Promise<ImageIdAndDistance[]>
  {
    const perExtensionEmbeddings: Map<string, Array<number>> | undefined = this.map.get(extensionId);
    if (perExtensionEmbeddings === undefined)
    {
      return [];
    }
    else
    {
      const imageId: string | undefined = perExtensionEmbeddings.keys().next().value;
      return imageId === undefined ? [] : [{ imageId, distance: 0.12345 }];
    }
  }

  deleteImage(imageIds: string[], extensionId?: string): void
  {
    for (const [_extensionId, perExtensionEmbeddings] of this.map)
    {
      if (extensionId !== undefined && extensionId !== _extensionId)
      {
        continue;
      }
      for (const imageId of imageIds)
      {
        perExtensionEmbeddings.delete(imageId);
      }
    }
  }

  deleteExtension(extensionId: string): void
  {
    this.map.delete(extensionId);
  }

}

@Injectable()
export class VectorDatabaseAccessor extends ChromaProvider implements OnModuleInit, OnModuleDestroy
{

  private client: ChromaClient | undefined;

  private readonly collections: Map<string, Collection> = new Map();

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

  async ensureCollection(extensionId: string): Promise<void>
  {
    logger.debug(`Ensuring that the collection for the extension with id '${extensionId}' exists`);
    if (this.enabled)
    {
      await this.getCollection(extensionId);
    }
  }

  async getImageIds(extensionId: string): Promise<string[]>
  {
    logger.debug(`Getting the image ids computed by the extension with id '${extensionId}'`);
    if (this.enabled === true)
    {
      const response: GetResult = await (await this.getCollection(extensionId)).get({});
      return response.ids;
    }
    else
    {
      return MemoryEmbeddingsManager.get().getImageIds(extensionId);
    }
  }

  async getEmbeddings(imageId: string, extensionId: string): Promise<number[] | undefined>
  {
    logger.debug(`Getting the embeddings for the image with id '${imageId}' computed by the extension with id '${extensionId}'`);
    if (this.enabled === true)
    {
      const response: GetResult = await (await this.getCollection(extensionId)).get({
        ids: [imageId],
        include: [IncludeEnum.embeddings]
      });
      const embeddingsArray = response.embeddings;
      return embeddingsArray === null ? undefined : embeddingsArray[0];
    }
    else
    {
      return MemoryEmbeddingsManager.get().get(imageId, extensionId);
    }
  }

  async setEmbeddings(imageId: string, extensionId: string, embeddings: number[]): Promise<void>
  {
    logger.debug(`Setting the embeddings for the image with id '${imageId}' computed by the extension with id '${extensionId}'`);
    if (this.enabled === true)
    {
      try
      {
        await (await this.getCollection(extensionId)).upsert({ ids: [imageId], embeddings: [embeddings] });
      }
      catch (error)
      {
        const firstElement = await (await this.getCollection(extensionId)).get({
          ids: [imageId],
          include: [IncludeEnum.embeddings, IncludeEnum.metadatas],
          limit: 1
        });
        const firstEmbeddings = firstElement.embeddings;
        const firstEmbedding = firstEmbeddings === null ? undefined : firstEmbeddings[0];
        parametersChecker.throwBadParameterError(firstEmbedding !== undefined ? `The embeddings length ${embeddings.length} is not the expected one ${firstEmbedding.length}` : `The provided embeddings are invalid. Reason: '${(error as Error).message}'`);
      }
    }
    else
    {
      MemoryEmbeddingsManager.get().set(imageId, extensionId, embeddings);
    }
  }

  async queryEmbeddings(extensionId: string, embeddings: number[], count: number): Promise<ImageIdAndDistance[]>
  {
    logger.debug(`Querying the closest ${count} embedding(s) relative to some given embeddings, computed by the extension with id '${extensionId}'`);
    if (this.enabled === true)
    {
      const result = await (await this.getCollection(extensionId)).query({
        queryEmbeddings: [embeddings],
        nResults: count,
        include: [IncludeEnum.embeddings, IncludeEnum.distances]
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
      return MemoryEmbeddingsManager.get().query(extensionId, embeddings, count);
    }
  }

  async deleteImagesEmbeddings(imageIds: string[], extensionId?: string): Promise<void>
  {
    const imageIdsLogFragment = `${imageIds.join(", ")}`;
    logger.debug(`Deleting the embeddings for the image with id '${imageIdsLogFragment}'${extensionId !== undefined ? ` for the extension with id '${extensionId}'` : ""}`);
    if (this.enabled === true)
    {
      const extensionIds = extensionId !== undefined ? [extensionId] : await this.getExtensionIds();
      for (const extensionId of extensionIds)
      {
        const collection = await this.getCollection(extensionId);
        logger.debug(`Deleting the embeddings for the image with '${imageIdsLogFragment}' for the extension with id '${extensionId}'`);
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
              await collection.delete({ ids: [imageId] });
            }
            catch (error)
            {
              // This happens when the embedding does not exist
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
      // We check whether the collection exists, otherwise the "Collection.delete()" fails when the collection does not exist
      const name = this.computeExtensionCollectionName(extensionId);
      const client = await this.getClient();
      let collection: Collection | undefined;
      try
      {
        collection = await client.getCollection({ name });
      }
      catch (error)
      {
        if ((error as Error).message === `Collection ${name} does not exist.`)
        {
          // This occurs because the collection does not exist
        }
        else
        {
          throw error;
        }
      }
      if (collection !== undefined)
      {
        await client.deleteCollection({ name: collection.name });
      }
      this.collections.delete(extensionId);
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

  private async getCollection(extensionId: string): Promise<Collection>
  {
    logger.debug(`Getting the vector database collection for the extension with id '${extensionId}'`);
    let collection = this.collections.get(extensionId);
    if (collection === undefined)
    {
      logger.info(`Initializing the Chroma collection for the extension with id '${extensionId}'`);
      collection = await (await this.getClient()).getOrCreateCollection({
        name: this.computeExtensionCollectionName(extensionId),
        metadata:
          {
            id: extensionId,
            description: `The images embeddings for the extension with id '${extensionId}'`,
            "hnsw:space": "cosine"
          }
      });
      this.collections.set(extensionId, collection);
    }
    return collection;
  }

  private computeExtensionCollectionName(extensionId: string): string
  {
    return `images.${extensionId}`;
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
