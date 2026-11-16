import {
  ExtensionIdImageEmbeddingName,
  ExtensionImageFeatureName,
  ExtensionImageTag,
  Repository,
  RepositoryActivity,
  RepositoryApi,
  RepositoryApiRepositoryCreateRequest,
  RepositoryApiRepositoryDeleteRequest,
  RepositoryApiRepositoryGetRequest,
  RepositoryApiRepositorySynchronizeRequest,
  RepositoryApiRepositoryUpdateRequest,
  RepositoryApiRepositoryWatchRequest
} from "@picteus/ws-client";


const repositoryApi = new RepositoryApi();

async function fetchAll(): Promise<Repository[]>
{
  return await repositoryApi.repositoryList();
}

async function get(parameters: RepositoryApiRepositoryGetRequest): Promise<Repository>
{
  return repositoryApi.repositoryGet(parameters);
}

async function add(parameters: RepositoryApiRepositoryCreateRequest): Promise<Repository>
{
  return repositoryApi.repositoryCreate({ ...parameters, watch: true });
}

async function update(parameters: RepositoryApiRepositoryUpdateRequest): Promise<Repository>
{
  return repositoryApi.repositoryUpdate(parameters);
}

async function deleteRepository(parameters: RepositoryApiRepositoryDeleteRequest): Promise<void>
{
  await repositoryApi.repositoryDelete(parameters);
}

async function synchronize(parameters: RepositoryApiRepositorySynchronizeRequest): Promise<void>
{
  return repositoryApi.repositorySynchronize(parameters);
}

async function watch(parameters: RepositoryApiRepositoryWatchRequest): Promise<void>
{
  return repositoryApi.repositoryWatch(parameters);
}

async function getActivities(): Promise<RepositoryActivity[]>
{
  return repositoryApi.repositoryActivities();
}

async function getFeatureNames(): Promise<ExtensionImageFeatureName[]>
{
  return repositoryApi.repositoryGetFeatureNames();
}

async function getTags(): Promise<ExtensionImageTag[]>
{
  return repositoryApi.repositoryGetTags();
}

async function getEmbeddingsNames(): Promise<ExtensionIdImageEmbeddingName[]>
{
  return repositoryApi.repositoryGetEmbeddingsNames();
}

function isFromExtension(repository: Repository): boolean
{
  return repository.extensionId !== undefined;
}

export default {
  fetchAll,
  get,
  add,
  update,
  delete: deleteRepository,
  synchronize,
  watch,
  getActivities,
  getFeatureNames,
  getTags,
  getEmbeddingsNames,
  isFromExtension
};
