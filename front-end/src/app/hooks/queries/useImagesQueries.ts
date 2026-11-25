import { useEffect, useMemo, useRef } from "react";
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import {
  ExtensionImageEmbeddings,
  Image,
  ImageDistance,
  ImageSummary,
  SearchFilter,
  SearchImageSummaryResult,
  SearchOriginNature
} from "@picteus/ws-client";

import { ApiCallError, ToastService } from "utils";
import { ImageService } from "app/services";
import { queryKeys } from "app/query";


export interface UseImageOptionsType
{

  readonly enabled?: boolean;
  readonly initialData?: Image;
  readonly showToastOnError?: boolean;
  readonly onError?: (error: Error) => void;

}

export function useImage(
  imageId?: string,
  options?: UseImageOptionsType
): UseQueryResult<Image, Error>
{
  const { enabled = true, initialData, showToastOnError = false, onError } = options ?? {};
  const lastHandledErrorUpdatedAt = useRef<number>(0);

  const queryResult = useQuery(
    {
      queryKey: queryKeys.images.detail(imageId ?? ""),
      queryFn: (): Promise<Image> =>
      {
        return ImageService.get({ id: imageId! });
      },
      enabled: Boolean(enabled && imageId && imageId.length > 0),
      initialData
    }
  );

  useEffect(() =>
  {
    if (queryResult.error && queryResult.errorUpdatedAt !== lastHandledErrorUpdatedAt.current)
    {
      lastHandledErrorUpdatedAt.current = queryResult.errorUpdatedAt;
      if (showToastOnError)
      {
        ToastService.apiCallError(queryResult.error as unknown as ApiCallError);
      }
      onError?.(queryResult.error);
    }
  }, [ queryResult.error, queryResult.errorUpdatedAt, showToastOnError, onError ]);

  return queryResult;
}

export function useImageAllEmbeddings(
  imageId?: string,
  enabled = true
): UseQueryResult<ExtensionImageEmbeddings[], Error>
{
  return useQuery(
    {
      queryKey: queryKeys.images.allEmbeddings(imageId ?? ""),
      queryFn: (): Promise<ExtensionImageEmbeddings[]> =>
      {
        return ImageService.getAllEmbeddings(imageId!);
      },
      enabled: Boolean(enabled && imageId && imageId.length > 0)
    }
  );
}

export function useClosestImages(
  imageId: string,
  extensionId: string,
  aiModelTechnicalId: string,
  count: number,
  enabled = true
): UseQueryResult<ImageDistance[], Error>
{
  return useQuery(
    {
      queryKey: queryKeys.images.closestImages(imageId, extensionId, aiModelTechnicalId, count),
      queryFn: (): Promise<ImageDistance[]> =>
      {
        return ImageService.getClosestImages({
          id: imageId,
          extensionId,
          aiModelTechnicalId,
          count
        });
      },
      enabled: Boolean(enabled && imageId && extensionId && aiModelTechnicalId)
    }
  );
}

export function useLibraryHasImages(): UseQueryResult<boolean, Error>
{
  return useQuery(
    {
      queryKey: queryKeys.images.hasAny,
      queryFn: async (): Promise<boolean> =>
      {
        const result = await ImageService.searchIds({ range: { take: 1 } });
        return result.totalCount > 0;
      }
    }
  );
}

export type UseImageSummariesByIdsOptionsType =
  {
    readonly scope: string;
    readonly withTags?: readonly string[];
    readonly keepPreviousData?: boolean;
  };

export type UseImageSummariesByIdsResultType =
  {
    readonly summaries: ImageSummary[];
    readonly isLoading: boolean;
  };

function orderSummariesByIds(
  ids: readonly string[],
  summaries: readonly ImageSummary[]
): ImageSummary[]
{
  const byId = new Map<string, ImageSummary>();
  for (const summary of summaries)
  {
    byId.set(summary.id, summary);
  }
  const ordered: ImageSummary[] = [];
  for (const id of ids)
  {
    const found = byId.get(id);
    if (found !== undefined)
    {
      ordered.push(found);
    }
  }
  return ordered;
}

export function useImageSummariesByIds(
  ids: readonly string[],
  { scope, withTags, keepPreviousData = false }: UseImageSummariesByIdsOptionsType
): UseImageSummariesByIdsResultType
{
  const tagsKey = withTags !== undefined && withTags.length > 0
    ? [ ...withTags ].sort().join(",")
    : "";
  const cacheKey = tagsKey.length > 0 ? `${ids.join(",")}|${tagsKey}` : ids.join(",");

  const { data, isLoading } = useQuery<SearchImageSummaryResult, Error>({
    queryKey: queryKeys.images.pickerSummaries(scope, cacheKey),
    queryFn: (): Promise<SearchImageSummaryResult> =>
    {
      const filter: SearchFilter = {
        origin: {
          kind: SearchOriginNature.Images,
          ids: [ ...ids ]
        },
        ...(withTags !== undefined && withTags.length > 0
          ? { criteria: { tags: { values: [ ...withTags ] } } }
          : undefined)
      };
      return ImageService.searchSummaries({
        filter,
        range: { take: ids.length }
      });
    },
    enabled: ids.length > 0,
    placeholderData: keepPreviousData === true ? (previousData) => previousData : undefined
  });

  const summaries = useMemo<ImageSummary[]>(
    () => (ids.length === 0 ? [] : orderSummariesByIds(ids, data?.items ?? [])),
    [ ids, data ]
  );

  return { summaries, isLoading };
}
