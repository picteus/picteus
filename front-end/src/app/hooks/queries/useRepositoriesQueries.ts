import { useMemo } from "react";
import {
  useMutation,
  UseMutationResult,
  useQueries,
  useQuery,
  useQueryClient,
  UseQueryResult
} from "@tanstack/react-query";

import {
  ExtensionIdImageEmbeddingName,
  ExtensionImageFeatureName,
  ExtensionImageTag,
  Repository,
  RepositoryActivity,
  RepositoryApiRepositoryCreateRequest,
  RepositoryApiRepositoryUpdateRequest,
  SearchImageSummaryResult,
  SearchOriginNature,
  SearchSortingProperty
} from "@picteus/ws-client";

import { ImageService, RepositoriesService } from "app/services";
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

export interface UseRepositoryOptionsType
{

  readonly enabled?: boolean;

}

export function useRepository(
  repositoryId?: string,
  options?: UseRepositoryOptionsType
): UseQueryResult<Repository, Error>
{
  const queryClient = useQueryClient();
  const isEnabled = options?.enabled ?? true;

  return useQuery(
    {
      queryKey: queryKeys.repositories.detail(repositoryId ?? ""),
      queryFn: (): Promise<Repository> => RepositoriesService.get({ id: repositoryId! }),
      enabled: isEnabled,
      initialData: (): Repository | undefined => repositoryId ? queryClient.getQueryData<Repository[]>(queryKeys.repositories.all)?.find(repository => repository.id === repositoryId) : undefined
    }
  );
}

function fetchRepositorySummaries(repositoryId: string, count: number): Promise<SearchImageSummaryResult>
{
  return ImageService.searchSummaries(
    {
      filter: {
        origin: { kind: SearchOriginNature.Repositories, ids: [ repositoryId ] },
        sorting: { property: SearchSortingProperty.UpdateDate, isAscending: false }
      },
      range: { take: count }
    }
  );
}

export function useRepositorySummaries(repositoryId: string, count: number): UseQueryResult<SearchImageSummaryResult, Error>
{
  return useQuery(
    {
      queryKey: queryKeys.repositories.summaries(repositoryId, count),
      queryFn: (): Promise<SearchImageSummaryResult> => fetchRepositorySummaries(repositoryId, count)
    }
  );
}

export function useRepositoriesImageCounts(repositories: Repository[]): Record<string, number>
{
  const take = 1;
  const results = useQueries(
    {
      queries: repositories.map((repository) => ({
        queryKey: queryKeys.repositories.summaries(repository.id, take),
        queryFn: (): Promise<SearchImageSummaryResult> => fetchRepositorySummaries(repository.id, take)
      }))
    }
  );

  return useMemo(
    () =>
    {
      const counts: Record<string, number> = {};
      repositories.forEach((repository, index) =>
      {
        const totalCount = results[index]?.data?.totalCount;
        if (totalCount !== undefined)
        {
          counts[repository.id] = totalCount;
        }
      });
      return counts;
    },
    [ repositories, results ]
  );
}

export function useRepositoryActivities(): UseQueryResult<RepositoryActivity[], Error>
{
  return useQuery(
    {
      queryKey: queryKeys.repositories.activities,
      queryFn: (): Promise<RepositoryActivity[]> =>
      {
        return RepositoriesService.getActivities();
      },
      refetchInterval: POLLING_INTERVAL_MILLISECONDS,
      refetchIntervalInBackground: false
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

export function useWatchRepositoryMutation(): UseMutationResult<void, Error, { id: string; isStart: boolean }>
{
  const queryClient = useQueryClient();

  return useMutation(
    {
      mutationFn: (parameters: { id: string; isStart: boolean }): Promise<void> =>
      {
        return RepositoriesService.watch(parameters);
      },
      onSuccess: (_data, parameters): void =>
      {
        void queryClient.invalidateQueries({ queryKey: queryKeys.repositories.all });
        void queryClient.invalidateQueries({ queryKey: queryKeys.repositories.detail(parameters.id) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.repositories.activities });
      }
    }
  );
}
