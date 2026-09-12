import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from "@tanstack/react-query";
import { Collection, SearchFilter } from "@picteus/ws-client";

import { CollectionService } from "app/services";
import { queryKeys } from "app/query";


export function useCollections(): UseQueryResult<Collection[], Error>
{
  return useQuery(
    {
      queryKey: queryKeys.collections.all,
      queryFn: (): Promise<Collection[]> =>
      {
        return CollectionService.fetchAll();
      }
    }
  );
}

export function useCollection(collectionId?: number): UseQueryResult<Collection, Error>
{
  return useQuery(
    {
      queryKey: queryKeys.collections.detail(collectionId ?? 0),
      queryFn: (): Promise<Collection> =>
      {
        return CollectionService.get(collectionId!);
      },
      enabled: collectionId !== undefined
    }
  );
}

export function useCreateCollectionMutation(): UseMutationResult<Collection, Error, {
  name: string;
  searchFilter: SearchFilter;
  comment?: string
}>
{
  const queryClient = useQueryClient();

  return useMutation(
    {
      mutationFn: ({ name, searchFilter, comment }): Promise<Collection> =>
      {
        return CollectionService.create(name, searchFilter, comment);
      },
      onSuccess: (): void =>
      {
        void queryClient.invalidateQueries({ queryKey: queryKeys.collections.all });
      }
    }
  );
}

export function useUpdateCollectionMutation(): UseMutationResult<Collection, Error, {
  id: number;
  name?: string;
  searchFilter?: SearchFilter;
  comment?: string
}>
{
  const queryClient = useQueryClient();

  return useMutation(
    {
      mutationFn: ({ id, name, searchFilter, comment }): Promise<Collection> =>
      {
        return CollectionService.update(id, name, searchFilter, comment);
      },
      onSuccess: (updatedCollection: Collection): void =>
      {
        void queryClient.invalidateQueries({ queryKey: queryKeys.collections.all });
        void queryClient.invalidateQueries({ queryKey: queryKeys.collections.detail(updatedCollection.id) });
      }
    }
  );
}

export function useDeleteCollectionMutation(): UseMutationResult<void, Error, number>
{
  const queryClient = useQueryClient();

  return useMutation(
    {
      mutationFn: (collectionId: number): Promise<void> =>
      {
        return CollectionService.delete(collectionId);
      },
      onSuccess: (): void =>
      {
        void queryClient.invalidateQueries({ queryKey: queryKeys.collections.all });
      }
    }
  );
}
