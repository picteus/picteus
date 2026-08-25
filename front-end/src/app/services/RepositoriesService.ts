import {
  ExtensionIdImageEmbeddingName,
  ExtensionImageFeatureName,
  ExtensionImageTag,
  Repository,
  RepositoryApi,
  RepositoryApiRepositoryCreateRequest,
  RepositoryApiRepositoryDeleteRequest,
  RepositoryApiRepositoryGetRequest,
  RepositoryApiRepositorySynchronizeRequest,
  RepositoryApiRepositoryUpdateRequest
} from "@picteus/ws-client";

import { ApiCallError } from "utils";


const repositoryApi = new RepositoryApi();

type FeatureNamesCallback = (names: ExtensionImageFeatureName[]) => void;
type TagsCallback = (tags: ExtensionImageTag[]) => void;
type EmbeddingsNamesCallback = (names: ExtensionIdImageEmbeddingName[]) => void;
type ErrorCallback = (error: ApiCallError) => void;

let featureNamesSubscribers: { onData: FeatureNamesCallback, onError?: ErrorCallback }[] = [];
let tagsSubscribers: { onData: TagsCallback, onError?: ErrorCallback }[] = [];
let embeddingsNamesSubscribers: { onData: EmbeddingsNamesCallback, onError?: ErrorCallback }[] = [];

let cachedFeatureNames: ExtensionImageFeatureName[] = [];
let cachedTags: ExtensionImageTag[] = [];
let cachedEmbeddingsNames: ExtensionIdImageEmbeddingName[] = [];

type SubscriptionType = ExtensionImageFeatureName[] | ExtensionImageTag[] | ExtensionIdImageEmbeddingName[];

type SubscriptionCacheSetter<type> = (newValue: type) => void;

interface SubscriberType<type>
{
  onData: SubscriptionCacheSetter<type>;
  onError?: ErrorCallback;
}

type SubscriptionProvider<type> = () => Promise<type>;
type SubscriptionCacheGetter<type> = () => type;

let isPolling = false;

function startPolling(): void
{
  if (isPolling)
  {
    return;
  }
  isPolling = true;

  async function fetchData<type = SubscriptionType>(subscribers: SubscriberType<type>[], provider: SubscriptionProvider<type>, cacheGetter: SubscriptionCacheGetter<type>, cacheSetter: SubscriptionCacheSetter<type>): Promise<void>
  {
    if (subscribers.length > 0)
    {
      let newValue: type;
      try
      {
        newValue = await provider();
      }
      catch (error)
      {
        return subscribers.forEach(subscriber => subscriber.onError && subscriber.onError(error));
      }
      if (JSON.stringify(newValue) !== JSON.stringify(cacheGetter()))
      {
        cacheSetter(newValue);
        subscribers.forEach(subscriber => subscriber.onData(newValue));
      }
    }
  }

  const intervalInMilliseconds = 20_000;
  setInterval(() =>
  {
    void fetchData(featureNamesSubscribers, repositoryApi.repositoryGetFeatureNames.bind(repositoryApi), () => cachedFeatureNames, (newValue) =>
    {
      cachedFeatureNames = newValue;
    });

    void fetchData(tagsSubscribers, repositoryApi.repositoryGetTags.bind(repositoryApi), () => cachedTags, (newValue) =>
    {
      cachedTags = newValue;
    });

    void fetchData(embeddingsNamesSubscribers, repositoryApi.repositoryGetEmbeddingsNames.bind(repositoryApi), () => cachedEmbeddingsNames, (newValue) =>
    {
      cachedEmbeddingsNames = newValue;
    });
  }, intervalInMilliseconds);
}

let repositories: Repository[] = [];

async function fetchAll(): Promise<Repository[]>
{
  repositories = await repositoryApi.repositoryList();
  return repositories;
}

function list(): Repository[]
{
  return repositories;
}

async function get(
  parameters: RepositoryApiRepositoryGetRequest
): Promise<Repository>
{
  return repositoryApi.repositoryGet(parameters);
}

async function add(
  parameters: RepositoryApiRepositoryCreateRequest
): Promise<Repository>
{
  return repositoryApi.repositoryCreate({ ...parameters, watch: true });
}

async function update(
  parameters: RepositoryApiRepositoryUpdateRequest
): Promise<Repository>
{
  return repositoryApi.repositoryUpdate(parameters);
}

async function remove(
  parameters: RepositoryApiRepositoryDeleteRequest
): Promise<void>
{
  await repositoryApi.repositoryDelete(parameters);
}

async function synchronize(
  parameters: RepositoryApiRepositorySynchronizeRequest
): Promise<void>
{
  return repositoryApi.repositorySynchronize(parameters);
}

function subscribeToFeatureNames(onData: FeatureNamesCallback, onError?: ErrorCallback): () => void
{
  return subscribeTo<ExtensionImageFeatureName[]>(featureNamesSubscribers, (newSubscribers) =>
  {
    featureNamesSubscribers = newSubscribers;
  }, (newValue: ExtensionImageFeatureName[]) =>
  {
    cachedFeatureNames = newValue;
  }, repositoryApi.repositoryGetFeatureNames.bind(repositoryApi), onData, onError);
}

function subscribeToTags(onData: TagsCallback, onError?: ErrorCallback): () => void
{
  return subscribeTo<ExtensionImageTag[]>(tagsSubscribers, (newSubscribers) =>
  {
    tagsSubscribers = newSubscribers;
  }, (newValue: ExtensionImageTag[]) =>
  {
    cachedTags = newValue;
  }, repositoryApi.repositoryGetTags.bind(repositoryApi), onData, onError);
}

function subscribeToEmbeddingsNames(onData: EmbeddingsNamesCallback, onError?: ErrorCallback): () => void
{
  return subscribeTo<ExtensionIdImageEmbeddingName[]>(embeddingsNamesSubscribers, (newSubscribers) =>
  {
    embeddingsNamesSubscribers = newSubscribers;
  }, (newValue: ExtensionIdImageEmbeddingName[]) =>
  {
    cachedEmbeddingsNames = newValue;
  }, repositoryApi.repositoryGetEmbeddingsNames.bind(repositoryApi), onData, onError);
}

function subscribeTo<type = SubscriptionType>(subscribers: SubscriberType<type>[], subscribersSetter: (newSubscribers: SubscriberType<type>[]) => void, cacheSetter: SubscriptionCacheSetter<type>, provider: SubscriptionProvider<type>, onData: SubscriptionCacheSetter<type>, onError?: ErrorCallback): () => void
{
  const subscriber = { onData, onError };
  subscribers.push(subscriber);

  provider().then((newValue: type) =>
  {
    cacheSetter(newValue);
    onData(newValue);
  }).catch(error =>
  {
    if (onError)
    {
      onError(error);
    }
  });

  startPolling();

  return () =>
  {
    subscribersSetter(subscribers = subscribers.filter(aSubscriber => aSubscriber !== subscriber));
  };
}

function getRepositoryInformation(repositoryId: string): Repository
{
  return repositories.find((repository) =>
  {
    if (repository.id === repositoryId)
    {
      return repository;
    }
  });
}

export default {
  fetchAll,
  list,
  get,
  add,
  update,
  getRepositoryInformation,
  synchronize,
  subscribeToFeatureNames,
  subscribeToTags,
  subscribeToEmbeddingsNames,
  remove
};
