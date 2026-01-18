import {
  ExtensionImageTag,
  Repository,
  RepositoryApi,
  RepositoryApiRepositoryCreateRequest,
  RepositoryApiRepositoryDeleteRequest,
  RepositoryApiRepositorySynchronizeRequest
} from "@picteus/ws-client";
import { StorageService } from "./index.ts";

const repositoryApi = new RepositoryApi();

let repositories: Repository[] = [];

async function fetchAll(): Promise<Repository[]> {
  repositories = await repositoryApi.repositoryList();
  return repositories;
}

function list(): Repository[] {
  return repositories;
}

async function add(
  parameters: RepositoryApiRepositoryCreateRequest,
): Promise<Repository> {
  return repositoryApi.repositoryCreate({ ...parameters, watch: true });
}

async function remove(
  parameters: RepositoryApiRepositoryDeleteRequest,
): Promise<void> {
  await repositoryApi.repositoryDelete(parameters);
  const searchFilters = StorageService.getSearchFilters();
  StorageService.setSearchFilters({
    ...searchFilters,
    repositories: searchFilters?.repositories?.filter(
      (id) => id !== parameters.id,
    ),
  });
  return;
}

async function synchronize(
  parameters: RepositoryApiRepositorySynchronizeRequest,
): Promise<void> {
  return repositoryApi.repositorySynchronize(parameters);
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
  add,
  getRepositoryInformation,
  synchronize,
  getTags,
  remove,
};
