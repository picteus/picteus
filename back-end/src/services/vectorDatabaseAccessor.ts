import Timers from "node:timers";

import { ChromaClient, ChromaValueError, Collection, EmbeddingFunction, GetResult, IncludeEnum } from "chromadb";
import { FactoryProvider, Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { paths } from "../paths";
import { logger } from "../logger";
import { parametersChecker } from "./utils/parametersChecker";


export type ImageIdAndDistance =
  {
    imageId: string,
    distance: number
  };

type EmbeddingNameAndValues = { name: string, values: number[] };

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

  async getExtensionEmbeddingsNames(): Promise<ExtensionIdAndEmbeddingName[]>
  {
    logger.debug("Getting all the extension identifiers and embeddings names registered to the vector database");
    return this.doGetExtensionEmbeddingsNames();
  }

  async getImageIds(extensionId: string): Promise<string[]>
  {
    logger.debug(`Getting the image ids computed by the extension with id '${extensionId}'`);
    return this.doGetImageIds(extensionId);
  }

  async getEmbeddings(imageId: string, extensionId: string): Promise<EmbeddingNameAndValues[]>
  {
    logger.debug(`Getting the embeddings for the image with id '${imageId}' computed by the extension with id '${extensionId}'`);
    return this.doGetEmbeddings(imageId, extensionId);
  }

  async setEmbeddings(imageId: string, extensionId: string, nameAndValues: EmbeddingNameAndValues[]): Promise<void>
  {
    logger.debug(`Setting the embeddings for the image with id '${imageId}' computed by the extension with id '${extensionId}'`);
    return this.doSetEmbeddings(imageId, extensionId, nameAndValues);
  }

  async queryEmbeddings(extensionIdAndEmbeddingName: ExtensionIdAndEmbeddingName, embeddings: number[], count: number): Promise<ImageIdAndDistance[]>
  {
    const { id: extensionId, name } = extensionIdAndEmbeddingName;
    logger.debug(`Querying the closest ${count} embedding(s) relative to some given embeddings, computed by the extension with id '${extensionId}' and name '${name}'`);
    return this.doQueryEmbeddings(extensionIdAndEmbeddingName, embeddings, count);
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

  protected abstract doGetExtensionIds(): Promise<string[]>;

  protected abstract doGetExtensionEmbeddingsNames(): Promise<ExtensionIdAndEmbeddingName[]>;

  protected abstract doGetImageIds(extensionId: string): Promise<string[]>;

  protected abstract doGetEmbeddings(imageId: string, extensionId: string): Promise<EmbeddingNameAndValues[]>;

  protected abstract doSetEmbeddings(imageId: string, extensionId: string, nameAndValues: EmbeddingNameAndValues[]): Promise<void>;

  protected abstract doQueryEmbeddings(extensionIdAndEmbeddingName: ExtensionIdAndEmbeddingName, embeddings: number[], count: number): Promise<ImageIdAndDistance[]>;

  protected abstract doDeleteImagesEmbeddings(imageIds: string[], extensionId?: string): Promise<void>;

  protected abstract doDeleteExtensionEmbeddings(extensionId: string): Promise<void>;

  protected async initialize(): Promise<void>
  {
  }

  protected async terminate(): Promise<void>
  {
  }

}

@Injectable()
export class MemoryVectorDatabaseAccessor extends VectorDatabaseAccessor
{

  private readonly perExtensionIdPerEmbeddingNameMapPerImageIdEmbeddingMap: Map<string, Map<string, Map<string, number[]>>> = new Map();

  protected async doGetExtensionIds(): Promise<string[]>
  {
    return Array.from(this.perExtensionIdPerEmbeddingNameMapPerImageIdEmbeddingMap.keys());
  }

  protected async doGetExtensionEmbeddingsNames(): Promise<ExtensionIdAndEmbeddingName[]>
  {
    const extensionIds = Array.from(this.perExtensionIdPerEmbeddingNameMapPerImageIdEmbeddingMap.keys());
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

  protected async doGetImageIds(extensionId: string): Promise<string[]>
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

  protected async doGetEmbeddings(imageId: string, extensionId: string): Promise<EmbeddingNameAndValues[]>
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

  protected async doSetEmbeddings(imageId: string, extensionId: string, nameAndValues: EmbeddingNameAndValues[]): Promise<void>
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

    for (const embedding of nameAndValues)
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

  protected async doQueryEmbeddings(extensionIdAndEmbeddingName: ExtensionIdAndEmbeddingName, embeddings: number[], count: number): Promise<ImageIdAndDistance[]>
  {
    const { id: extensionId, name } = extensionIdAndEmbeddingName;
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
    const results: ImageIdAndDistance[] = [];
    for (const [ imageId, storedEmbeddings ] of perImageIdEmbeddingMap.entries())
    {
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

  protected async doDeleteExtensionEmbeddings(extensionId: string): Promise<void>
  {
    this.perExtensionIdPerEmbeddingNameMapPerImageIdEmbeddingMap.delete(extensionId);
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

  private readonly perExtensionIdEmbeddingNameCollectionsMap: Map<string, Collection> = new Map();

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
    const collections: Collection[] = await (await this.getClient()).listCollections({});
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

  protected async doGetExtensionEmbeddingsNames(): Promise<ExtensionIdAndEmbeddingName[]>
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

  protected async doGetImageIds(extensionId: string): Promise<string[]>
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

  protected async doGetEmbeddings(imageId: string, extensionId: string): Promise<EmbeddingNameAndValues[]>
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

  protected async doSetEmbeddings(imageId: string, extensionId: string, nameAndValues: EmbeddingNameAndValues[]): Promise<void>
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

  protected async doQueryEmbeddings(extensionIdAndEmbeddingName: ExtensionIdAndEmbeddingName, embeddings: number[], count: number): Promise<ImageIdAndDistance[]>
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
  }

  private async getExtensionCollections(extensionId: string): Promise<Collection[]>
  {
    const collections = await (await this.getClient()).listCollections({});
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

export const vectorDatabaseAccessorProvider: FactoryProvider<VectorDatabaseAccessor> =
  {
    provide: VectorDatabaseAccessor,
    useFactory: (): VectorDatabaseAccessor =>
    {
      return paths.useVectorDatabase === true ? new ChromaVectorDatabaseAccessor() : new MemoryVectorDatabaseAccessor();
    }
  };
