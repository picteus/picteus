import { useEffect, useRef } from "react";
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { Image } from "@picteus/ws-client";

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
