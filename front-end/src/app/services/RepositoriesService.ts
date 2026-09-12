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

export default {
  fetchAll,
  get,
  add,
  update,
  delete: deleteRepository,
  synchronize,
  getFeatureNames,
  getTags,
  getEmbeddingsNames
};
