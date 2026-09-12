import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from "@tanstack/react-query";
import {
  ExtensionIdImageEmbeddingName,
  ExtensionImageFeatureName,
  ExtensionImageTag,
  Repository,
  RepositoryApiRepositoryCreateRequest,
  RepositoryApiRepositoryUpdateRequest
} from "@picteus/ws-client";

import { RepositoriesService } from "app/services";
import { queryKeys } from "app/query";


const POLLING_INTERVAL_MILLISECONDS = 20_000;

export function useRepositories(): UseQueryResult<Repository[], Error>
{
  return useQuery(
    {
      queryKey: queryKeys.repositories.all,
      queryFn: (): Promise<Repository[]> =>
      {
        return RepositoriesService.fetchAll();
      }
    }
  );
}

export function useRepository(repositoryId: string): UseQueryResult<Repository, Error>
{
  const queryClient = useQueryClient();

  return useQuery(
    {
      queryKey: queryKeys.repositories.detail(repositoryId),
      queryFn: (): Promise<Repository> =>
      {
        return RepositoriesService.get({ id: repositoryId });
      },
      initialData: (): Repository | undefined =>
      {
        return queryClient.getQueryData<Repository[]>(queryKeys.repositories.all)?.find(repository => repository.id === repositoryId);
      }
    }
  );
}

export function useTags(): UseQueryResult<ExtensionImageTag[], Error>
{
  return useQuery(
    {
      queryKey: queryKeys.repositories.tags,
      queryFn: (): Promise<ExtensionImageTag[]> =>
      {
        return RepositoriesService.getTags();
      },
      refetchInterval: POLLING_INTERVAL_MILLISECONDS,
      refetchIntervalInBackground: false
    }
  );
}

export function useFeatureNames(): UseQueryResult<ExtensionImageFeatureName[], Error>
{
  return useQuery(
    {
      queryKey: queryKeys.repositories.features,
      queryFn: (): Promise<ExtensionImageFeatureName[]> =>
      {
        return RepositoriesService.getFeatureNames();
      },
      refetchInterval: POLLING_INTERVAL_MILLISECONDS,
      refetchIntervalInBackground: false
    }
  );
}

export function useEmbeddingsNames(): UseQueryResult<ExtensionIdImageEmbeddingName[], Error>
{
  return useQuery(
    {
      queryKey: queryKeys.repositories.embeddings,
      queryFn: (): Promise<ExtensionIdImageEmbeddingName[]> =>
      {
        return RepositoriesService.getEmbeddingsNames();
      },
      refetchInterval: POLLING_INTERVAL_MILLISECONDS,
      refetchIntervalInBackground: false
    }
  );
}

export function useAddRepositoryMutation(): UseMutationResult<Repository, Error, RepositoryApiRepositoryCreateRequest>
{
  const queryClient = useQueryClient();

  return useMutation(
    {
      mutationFn: (parameters: RepositoryApiRepositoryCreateRequest): Promise<Repository> =>
      {
        return RepositoriesService.add(parameters);
      },
      onSuccess: (): void =>
      {
        void queryClient.invalidateQueries({ queryKey: queryKeys.repositories.all });
      }
    }
  );
}

export function useUpdateRepositoryMutation(): UseMutationResult<Repository, Error, RepositoryApiRepositoryUpdateRequest>
{
  const queryClient = useQueryClient();

  return useMutation(
    {
      mutationFn: (parameters: RepositoryApiRepositoryUpdateRequest): Promise<Repository> =>
      {
        return RepositoriesService.update(parameters);
      },
      onSuccess: (updatedRepository: Repository): void =>
      {
        void queryClient.invalidateQueries({ queryKey: queryKeys.repositories.all });
        void queryClient.invalidateQueries({ queryKey: queryKeys.repositories.detail(updatedRepository.id) });
      }
    }
  );
}

export function useDeleteRepositoryMutation(): UseMutationResult<void, Error, string>
{
  const queryClient = useQueryClient();

  return useMutation(
    {
      mutationFn: (parameters: string): Promise<void> =>
      {
        return RepositoriesService.delete({ id: parameters });
      },
      onSuccess: (_data, parameters): void =>
      {
        void queryClient.invalidateQueries({ queryKey: queryKeys.repositories.all });
        void queryClient.removeQueries({ queryKey: queryKeys.repositories.detail(parameters) });
      }
    }
  );
}
