import crypto from "node:crypto";
import Timers from "node:timers";

import { ModuleRef } from "@nestjs/core";
import { FactoryProvider, Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ChromaClient, ChromaValueError, Collection, EmbeddingFunction, GetResult, IncludeEnum } from "chromadb";

import { paths } from "../paths";
import { logger } from "../logger";
import { parametersChecker } from "./utils/parametersChecker";
import { RegularDatabaseService } from "./regularDatabaseService";


export type ImageIdAndDistance =
  {
    imageId: string,
    distance: number
  };

export type EmbeddingIdAndValues = { id: string, values: number[] };

export type ExtensionIdAndEmbeddingName = { id: string, name: string };

@Injectable()
export abstract class VectorDatabaseAccessor implements OnModuleInit, OnModuleDestroy
{

  public static readonly localLoopBack = "127.0.0.1";

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
    return this.doGetExtensionIds();
  }

  async getExtensionEmbeddingsNames(restrictedRepositoryIds?: string[]): Promise<ExtensionIdAndEmbeddingName[]>
  {
    logger.debug("Getting all the extension identifiers and embeddings names registered to the vector database");
    if (restrictedRepositoryIds !== undefined && restrictedRepositoryIds.length === 0)
    {
      return [];
    }
    return this.doGetExtensionEmbeddingsNames(restrictedRepositoryIds);
  }

  async getImageIds(extensionId: string, embeddingId?: string): Promise<string[]>
  {
    logger.debug(`Getting the image ids computed by the extension with id '${extensionId}'${embeddingId === undefined ? "" : ` and embedding id '${embeddingId}'`}`);
    return this.doGetImageIds(extensionId, embeddingId);
  }

  async getEmbeddings(imageId: string, extensionId: string): Promise<EmbeddingIdAndValues[]>
  {
    logger.debug(`Getting the embeddings for the image with id '${imageId}' computed by the extension with id '${extensionId}'`);
    return this.doGetEmbeddings(imageId, extensionId);
  }

  async setEmbeddings(imageId: string, repositoryId: string, extensionId: string, idAndValues: EmbeddingIdAndValues[], isEnsure: boolean = false): Promise<void>
  {
    logger.debug(`Setting the embeddings for the image with id '${imageId}' computed by the extension with id '${extensionId}'`);
    return this.doSetEmbeddings(imageId, repositoryId, extensionId, idAndValues, isEnsure);
  }

  async queryEmbeddings(extensionIdAndEmbeddingName: ExtensionIdAndEmbeddingName, embeddings: number[], count: number, restrictedRepositoryIds?: string[]): Promise<ImageIdAndDistance[]>
  {
    const { id: extensionId, name } = extensionIdAndEmbeddingName;
    logger.debug(`Querying the closest ${count} embedding(s) relative to some given embeddings, computed by the extension with id '${extensionId}' and name '${name}'`);
    if (restrictedRepositoryIds !== undefined && restrictedRepositoryIds.length === 0)
    {
      return [];
    }
    return this.doQueryEmbeddings(extensionIdAndEmbeddingName, embeddings, count, restrictedRepositoryIds);
  }

  async deleteImagesEmbeddings(imageIds: string[], extensionId?: string): Promise<void>
  {
    const imageIdsLogFragment = `${imageIds.join(", ")}`;
    logger.debug(`Deleting the embeddings for the image with id '${imageIdsLogFragment}'${extensionId !== undefined ? ` for the extension with id '${extensionId}'` : ""}`);
    return this.doDeleteImagesEmbeddings(imageIds, extensionId);
  }

  async deleteExtensionEmbeddings(extensionId: string): Promise<void>
  {
    logger.debug(`Deleting the collection for the extension with id '${extensionId}'`);
    return this.doDeleteExtensionEmbeddings(extensionId);
  }

  async migrate(previousVersion: string): Promise<void>
  {
    logger.debug("Migrating the vector database if needed");
    return this.doMigrate(previousVersion);
  }

  protected abstract doGetExtensionIds(): Promise<string[]>;

  protected abstract doGetExtensionEmbeddingsNames(restrictedRepositoryIds?: string[]): Promise<ExtensionIdAndEmbeddingName[]>;

  protected abstract doGetImageIds(extensionId: string, embeddingId?: string): Promise<string[]>;

  protected abstract doGetEmbeddings(imageId: string, extensionId: string): Promise<EmbeddingIdAndValues[]>;

  protected abstract doSetEmbeddings(imageId: string, repositoryId: string, extensionId: string, idAndValues: EmbeddingIdAndValues[], isEnsure?: boolean): Promise<void>;

  protected abstract doQueryEmbeddings(extensionIdAndEmbeddingName: ExtensionIdAndEmbeddingName, embeddings: number[], count: number, restrictedRepositoryIds?: string[]): Promise<ImageIdAndDistance[]>;

  protected abstract doDeleteImagesEmbeddings(imageIds: string[], extensionId?: string): Promise<void>;

  protected abstract doDeleteExtensionEmbeddings(extensionId: string): Promise<void>;

  protected abstract doMigrate(previousVersion: string): Promise<void>;

  protected async initialize(): Promise<void>
  {
  }

  protected async terminate(): Promise<void>
  {
  }

}

type RepositoryIdAndValues = {
  repositoryId: string,
  values: number[]
};

@Injectable()
export class MemoryVectorDatabaseAccessor extends VectorDatabaseAccessor
{

  private readonly perExtensionIdPerEmbeddingNameMapPerImageIdRepositoryIdAndValuesMap: Map<string, Map<string, Map<string, RepositoryIdAndValues>>> = new Map();

  protected async doGetExtensionIds(): Promise<string[]>
  {
    return Array.from(this.perExtensionIdPerEmbeddingNameMapPerImageIdRepositoryIdAndValuesMap.keys());
  }

  protected async doGetExtensionEmbeddingsNames(restrictedRepositoryIds?: string[]): Promise<ExtensionIdAndEmbeddingName[]>
  {
    const extensionIds = Array.from(this.perExtensionIdPerEmbeddingNameMapPerImageIdRepositoryIdAndValuesMap.keys());
    const embeddingNames: ExtensionIdAndEmbeddingName[] = [];
    for (const extensionId of extensionIds)
    {
      const perEmbeddingNameMap = this.perExtensionIdPerEmbeddingNameMapPerImageIdRepositoryIdAndValuesMap.get(extensionId);
      if (perEmbeddingNameMap)
      {
        for (const [ name, perImageIdEmbeddingMap ] of perEmbeddingNameMap.entries())
        {
          if (restrictedRepositoryIds === undefined)
          {
            embeddingNames.push({ id: extensionId, name });
          }
          else
          {
            const hasEnabledRepository = Array.from(perImageIdEmbeddingMap.values()).some(item => restrictedRepositoryIds.includes(item.repositoryId));
            if (hasEnabledRepository === true)
            {
              embeddingNames.push({ id: extensionId, name });
            }
          }
        }
      }
    }
    return embeddingNames;
  }

  protected async doGetImageIds(extensionId: string, embeddingId?: string): Promise<string[]>
  {
    const perEmbeddingNameMap = this.perExtensionIdPerEmbeddingNameMapPerImageIdRepositoryIdAndValuesMap.get(extensionId);
    if (perEmbeddingNameMap === undefined)
    {
      return [];
    }
    if (embeddingId !== undefined)
    {
      const perImageIdEmbeddingMap = perEmbeddingNameMap.get(embeddingId);
      if (perImageIdEmbeddingMap === undefined)
      {
        return [];
      }
      return Array.from(perImageIdEmbeddingMap.keys());
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

  protected async doGetEmbeddings(imageId: string, extensionId: string): Promise<EmbeddingIdAndValues[]>
  {
    const perEmbeddingNameMap = this.perExtensionIdPerEmbeddingNameMapPerImageIdRepositoryIdAndValuesMap.get(extensionId);
    if (perEmbeddingNameMap === undefined)
    {
      return [];
    }
    const result: EmbeddingIdAndValues[] = [];
    for (const [ name, perImageIdEmbeddingMap ] of perEmbeddingNameMap.entries())
    {
      const entry = perImageIdEmbeddingMap.get(imageId);
      if (entry !== undefined)
      {
        result.push({ id: name, values: entry.values });
      }
    }
    return result;
  }

  protected async doSetEmbeddings(imageId: string, repositoryId: string, extensionId: string, idAndValues: EmbeddingIdAndValues[], isEnsure: boolean = false): Promise<void>
  {
    let perEmbeddingNameMap = this.perExtensionIdPerEmbeddingNameMapPerImageIdRepositoryIdAndValuesMap.get(extensionId);
    if (perEmbeddingNameMap === undefined)
    {
      perEmbeddingNameMap = new Map();
      this.perExtensionIdPerEmbeddingNameMapPerImageIdRepositoryIdAndValuesMap.set(extensionId, perEmbeddingNameMap);
    }

    if (isEnsure === false)
    {
      for (const perImageIdEmbeddingMap of perEmbeddingNameMap.values())
      {
        perImageIdEmbeddingMap.delete(imageId);
      }
    }

    for (const embedding of idAndValues)
    {
      const embeddingName = embedding.id;
      let perImageIdEmbeddingMap = perEmbeddingNameMap.get(embeddingName);
      if (perImageIdEmbeddingMap === undefined)
      {
        perImageIdEmbeddingMap = new Map();
        perEmbeddingNameMap.set(embeddingName, perImageIdEmbeddingMap);
      }
      else
      {
        const nameValues = perImageIdEmbeddingMap.entries().next().value;
        if (nameValues !== undefined)
        {
          const value: number[] = nameValues[1].values;
          if (value.length !== embedding.values.length)
          {
            parametersChecker.throwBadParameterError(`The embeddings length ${embedding.values.length} is not the expected one ${value.length}`);
          }
        }
      }
      perImageIdEmbeddingMap.set(imageId, { repositoryId, values: embedding.values });
    }
  }

  protected async doQueryEmbeddings(extensionIdAndEmbeddingName: ExtensionIdAndEmbeddingName, embeddings: number[], count: number, restrictedRepositoryIds?: string[]): Promise<ImageIdAndDistance[]>
  {
    const { id: extensionId, name } = extensionIdAndEmbeddingName;
    const perEmbeddingNameMap = this.perExtensionIdPerEmbeddingNameMapPerImageIdRepositoryIdAndValuesMap.get(extensionId);
    if (perEmbeddingNameMap === undefined)
    {
      return [];
    }
    const perImageIdEmbeddingMap = perEmbeddingNameMap.get(name);
    if (perImageIdEmbeddingMap === undefined)
    {
      return [];
    }
    const results: ImageIdAndDistance[] = [];
    for (const [ imageId, storedEntry ] of perImageIdEmbeddingMap.entries())
    {
      if (restrictedRepositoryIds !== undefined && restrictedRepositoryIds.includes(storedEntry.repositoryId) === false)
      {
        continue;
      }
      const storedEmbeddings = storedEntry.values;
      let distance = 0;
      for (let index = 0; index < embeddings.length; index++)
      {
        distance += Math.pow(embeddings[index] - (storedEmbeddings[index] || 0), 2);
      }
      distance = Math.sqrt(distance);
      results.push({ imageId, distance });
    }
    results.sort((item1, item2) => item1.distance - item2.distance);
    return results.slice(0, count);
  }

  protected async doDeleteImagesEmbeddings(imageIds: string[], extensionId?: string): Promise<void>
  {
    for (const [ theExtensionId, perEmbeddingNameMap ] of this.perExtensionIdPerEmbeddingNameMapPerImageIdRepositoryIdAndValuesMap)
    {
      if (extensionId !== undefined && extensionId !== theExtensionId)
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

  protected async doDeleteExtensionEmbeddings(extensionId: string): Promise<void>
  {
    this.perExtensionIdPerEmbeddingNameMapPerImageIdRepositoryIdAndValuesMap.delete(extensionId);
  }

  protected async doMigrate(_previousVersion: string): Promise<void>
  {
  }

}

interface NopeEmbeddingConfig
{
}

class NopeEmbeddingFunction implements EmbeddingFunction
{

  public readonly name = "nope-embedding-function";

  constructor(_args: {})
  {
  }

  async generate(texts: string[]): Promise<number[][]>
  {
    return [];
  }

  getConfig(): NopeEmbeddingConfig
  {
    return {};
  }

  validateConfigUpdate(_config: Record<string, any>)
  {
    throw new ChromaValueError("Model cannot be updated");
  }

  static buildFromConfig(config: NopeEmbeddingConfig, _client?: ChromaClient): NopeEmbeddingFunction
  {
    return new NopeEmbeddingFunction(config);
  }
}

@Injectable()
export class ChromaVectorDatabaseAccessor extends VectorDatabaseAccessor
{

  private client: ChromaClient | undefined;

  private readonly perKeyCollectionNamesMap: Map<string, string> = new Map();

  private readonly perExtensionIdEmbeddingNameCollectionsMap: Map<string, Collection> = new Map();

  constructor(private readonly moduleRef: ModuleRef)
  {
    super();
    logger.debug("Instantiating a ChromaVectorDatabaseAccessor");
  }

  protected override async initialize(): Promise<void>
  {
    logger.info("Initializing a Chroma client");
    const { ChromaClient } = await import("chromadb");
    this.client = new ChromaClient({
      host: VectorDatabaseAccessor.localLoopBack,
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

  protected async doGetExtensionIds(): Promise<string[]>
  {
    const collections = await this.getCollections();
    const extensionIds = new Set<string>();
    for (const collection of collections)
    {
      const extensionId = collection.metadata?.id as string | undefined;
      if (extensionId !== undefined)
      {
        extensionIds.add(extensionId);
      }
    }
    return Array.from(extensionIds);
  }

  protected async doGetExtensionEmbeddingsNames(restrictedRepositoryIds?: string[]): Promise<ExtensionIdAndEmbeddingName[]>
  {
    const collections = await this.getCollections();
    if (restrictedRepositoryIds === undefined)
    {
      return collections.map((collection) =>
      {
        const metadata = collection.metadata!;
        return { id: metadata.id as string, name: metadata.name as string };
      });
    }
    const result: ExtensionIdAndEmbeddingName[] = [];
    for (const collection of collections)
    {
      const response = await collection.get({
        where: { repositoryId: { $in: restrictedRepositoryIds } },
        limit: 1,
        include: []
      });
      if (response.ids.length > 0)
      {
        const metadata = collection.metadata!;
        result.push({ id: metadata.id as string, name: metadata.name as string });
      }
    }
    return result;
  }

  protected async doGetImageIds(extensionId: string, embeddingId?: string): Promise<string[]>
  {
    if (embeddingId !== undefined)
    {
      const collection = await this.getCollection({ id: extensionId, name: embeddingId });
      if (collection === undefined)
      {
        return [];
      }
      const response: GetResult = await collection.get({ include: [] });
      return response.ids;
    }
    const collections = await this.getExtensionCollections(extensionId);
    const imageIds = new Set<string>();
    for (const collection of collections)
    {
      const response: GetResult = await collection.get({ include: [] });
      for (const id of response.ids)
      {
        imageIds.add(id);
      }
    }
    return Array.from(imageIds);
  }

  protected async doGetEmbeddings(imageId: string, extensionId: string): Promise<EmbeddingIdAndValues[]>
  {
    const collections = await this.getExtensionCollections(extensionId);
    const result: EmbeddingIdAndValues[] = [];
    for (const collection of collections)
    {
      const response: GetResult = await collection.get({ ids: [ imageId ], include: [ IncludeEnum.embeddings ] });
      const embeddingsArray = response.embeddings;
      if (embeddingsArray !== null && embeddingsArray.length > 0)
      {
        const embeddingName = collection.metadata!.name as string;
        result.push({ id: embeddingName, values: embeddingsArray[0] });
      }
    }
    return result;
  }

  protected async doSetEmbeddings(imageId: string, repositoryId: string, extensionId: string, idAndValues: EmbeddingIdAndValues[], isEnsure: boolean = false): Promise<void>
  {
    const imageIds = [ imageId ];
    if (isEnsure === false)
    {
      // We first delete the image from all perExtensionIdEmbeddingNameCollectionsMap of this extension
      const collections = await this.getExtensionCollections(extensionId);
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
    }

    // Then, we upsert the new embeddings
    for (const embedding of idAndValues)
    {
      const embeddingName = embedding.id;
      const extensionIdAndEmbeddingName = { id: extensionId, name: embeddingName };
      const collection = await this.ensureCollection(extensionIdAndEmbeddingName);
      try
      {
        await collection.upsert({ ids: imageIds, embeddings: [ embedding.values ], metadatas: [ { repositoryId } ] });
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

  protected async doQueryEmbeddings(extensionIdAndEmbeddingName: ExtensionIdAndEmbeddingName, embeddings: number[], count: number, restrictedRepositoryIds?: string[]): Promise<ImageIdAndDistance[]>
  {
    const collection = await this.getCollection(extensionIdAndEmbeddingName);
    if (collection === undefined)
    {
      return [];
    }
    const result = await collection.query({
      queryEmbeddings: [ embeddings ],
      nResults: count,
      where: restrictedRepositoryIds === undefined ? undefined : { repositoryId: { $in: restrictedRepositoryIds } },
      include: [ IncludeEnum.embeddings, IncludeEnum.distances ]
    });
    const ids: string[] = result.ids![0];
    const distances: (number | null)[] = result.distances![0];
    return ids.map((id, index) =>
    {
      return { imageId: id, distance: distances[index]! };
    });
  }

  protected async doDeleteImagesEmbeddings(imageIds: string[], extensionId?: string): Promise<void>
  {
    const imageIdsLogFragment = `${imageIds.join(", ")}`;
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

  protected async doDeleteExtensionEmbeddings(extensionId: string): Promise<void>
  {
    const collections = await this.getExtensionCollections(extensionId);
    const client = await this.getClient();
    for (const collection of collections)
    {
      await client.deleteCollection({ name: collection.name });
      this.perExtensionIdEmbeddingNameCollectionsMap.delete(collection.name);
    }
    for (const [ key ] of this.perKeyCollectionNamesMap)
    {
      if (key.startsWith(`${extensionId}:`))
      {
        this.perKeyCollectionNamesMap.delete(key);
      }
    }
  }

  protected async doMigrate(previousVersion: string): Promise<void>
  {
    if (previousVersion === "0.17.0")
    {
      {
        logger.info("Migrating the Chroma DB collections from legacy naming scheme");
        const collections = await this.getCollections();
        for (const collection of collections)
        {
          const metadata: ExtensionIdAndEmbeddingName = collection.metadata as ExtensionIdAndEmbeddingName;
          const extensionId = metadata.id;
          const embeddingName = metadata.name;
          const newCollectionName = this.computeExtensionCollectionName({ id: extensionId, name: embeddingName });
          if (collection.name !== newCollectionName)
          {
            logger.debug(`Migrating the Chroma collection from '${collection.name}' to '${newCollectionName}'`);
            await collection.modify({
              name: newCollectionName,
              metadata: { ...collection.metadata, name: embeddingName }
            });
            this.perExtensionIdEmbeddingNameCollectionsMap.delete(collection.name);
            this.perExtensionIdEmbeddingNameCollectionsMap.set(newCollectionName, collection);
          }
        }
      }
      {
        logger.info("Adding to the Chroma DB images their repository");
        const regularDatabaseService: RegularDatabaseService = this.moduleRef.get(RegularDatabaseService);
        const collections = await this.getCollections();
        let imageRepositoryMap: Map<string, string> | undefined;
        for (const collection of collections)
        {
          const existing = await collection.get({ include: [ IncludeEnum.metadatas ] });
          const missingIds = existing.ids.filter((_, index) => existing.metadatas?.[index]?.repositoryId === undefined);
          if (missingIds.length > 0)
          {
            if (imageRepositoryMap === undefined)
            {
              const images = await regularDatabaseService.images.findMany({ select: { id: true, repositoryId: true } });
              imageRepositoryMap = new Map(images.map(image => [ image.id, image.repositoryId ]));
            }
            const idsToUpdate: string[] = [];
            const metadatasToUpdate: { repositoryId: string }[] = [];
            for (const id of missingIds)
            {
              const repositoryId = imageRepositoryMap.get(id);
              if (repositoryId !== undefined)
              {
                idsToUpdate.push(id);
                metadatasToUpdate.push({ repositoryId });
              }
            }
            if (idsToUpdate.length > 0)
            {
              logger.debug(`Backfilling the 'repositoryId' metadata for ${idsToUpdate.length} embedding(s) in Chroma collection '${collection.name}'`);
              await collection.update({ ids: idsToUpdate, metadatas: metadatasToUpdate });
            }
          }
        }
      }
    }
  }

  private async getExtensionCollections(extensionId: string): Promise<Collection[]>
  {
    const collections = await this.getCollections();
    return collections.filter(collection => collection.metadata?.id === extensionId);
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
    let collection = this.perExtensionIdEmbeddingNameCollectionsMap.get(collectionName);
    if (collection === undefined)
    {
      try
      {
        collection = await (await this.getClient()).getCollection({ name: collectionName });
        this.perExtensionIdEmbeddingNameCollectionsMap.set(collectionName, collection);
      }
      catch (error)
      {
        // This means that the collection does not exist
      }
    }
    return collection;
  }

  private async createCollection(extensionIdAndEmbeddingName: ExtensionIdAndEmbeddingName): Promise<Collection>
  {
    const { id: extensionId, name } = extensionIdAndEmbeddingName;
    const collectionName = this.computeExtensionCollectionName(extensionIdAndEmbeddingName);
    logger.info(`Initializing the Chroma collection for the extension with id '${extensionId}' and name '${name}'`);
    const collection: Collection = await (await this.getClient()).getOrCreateCollection({
      name: collectionName,
      embeddingFunction: new NopeEmbeddingFunction({}),
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
    const key = `${extensionIdAndEmbeddingName.id}:${extensionIdAndEmbeddingName.name}`;
    let collectionName = this.perKeyCollectionNamesMap.get(key);
    if (collectionName === undefined)
    {
      const hash = crypto.createHash("sha256").update(key).digest("hex").substring(0, 20);
      collectionName = `images.${extensionIdAndEmbeddingName.id}.${hash}`;
      this.perKeyCollectionNamesMap.set(key, collectionName);
    }
    return collectionName;
  }

  private async getCollections(): Promise<Collection[]>
  {
    const collections = await (await this.getClient()).listCollections({});
    for (const collection of collections)
    {
      this.perExtensionIdEmbeddingNameCollectionsMap.set(collection.name, collection);
    }
    return collections;
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

export const vectorDatabaseAccessorProvider: FactoryProvider<VectorDatabaseAccessor> =
  {
    provide: VectorDatabaseAccessor,
    useFactory: (moduleRef: ModuleRef): VectorDatabaseAccessor =>
    {
      return paths.useVectorDatabase === true ? new ChromaVectorDatabaseAccessor(moduleRef) : new MemoryVectorDatabaseAccessor();
    },
    inject: [ ModuleRef ]
  };
