import {
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

let repositories: Repository[] = [];

async function fetchAll(): Promise<Repository[]> {
  repositories = await repositoryApi.repositoryList();
  return repositories;
}

function list(): Repository[] {
  return repositories;
}

async function get(
  parameters: RepositoryApiRepositoryGetRequest,
): Promise<Repository> {
  return repositoryApi.repositoryGet(parameters);
}

async function add(
  parameters: RepositoryApiRepositoryCreateRequest,
): Promise<Repository> {
  return repositoryApi.repositoryCreate({ ...parameters, watch: true });
}

async function update(
  parameters: RepositoryApiRepositoryUpdateRequest,
): Promise<Repository> {
  return repositoryApi.repositoryUpdate(parameters);
}

async function remove(
  parameters: RepositoryApiRepositoryDeleteRequest,
): Promise<void> {
  await repositoryApi.repositoryDelete(parameters);
}

async function synchronize(
  parameters: RepositoryApiRepositorySynchronizeRequest,
): Promise<void> {
  return repositoryApi.repositorySynchronize(parameters);
}

async function getFeatureNames(): Promise<ExtensionImageFeatureName[]> {
  return repositoryApi.repositoryGetFeatureNames();
}

async function getTags(): Promise<ExtensionImageTag[]> {
  return repositoryApi.repositoryGetTags();
}

function getRepositoryInformation(repositoryId: string): Repository {
  return repositories.find((repository) => {
    if (repository.id === repositoryId) {
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
  getFeatureNames,
  getTags,
  remove,
};
