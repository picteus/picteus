import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from "@tanstack/react-query";
import { Extension, Manifest, MarketplaceApiMarketplaceInstallRequest } from "@picteus/ws-client";

import { MarketplaceService } from "app/services";
import { queryKeys } from "app/query";


export function useMarketplaceExtensions(): UseQueryResult<Manifest[], Error>
{
  return useQuery(
    {
      queryKey: queryKeys.marketplace.all,
      queryFn: (): Promise<Manifest[]> =>
      {
        return MarketplaceService.list();
      }
    }
  );
}

export function useInstallMarketplaceExtensionMutation(): UseMutationResult<
  Extension,
  Error,
  MarketplaceApiMarketplaceInstallRequest
>
{
  const queryClient = useQueryClient();

  return useMutation(
    {
      mutationFn: (parameters: MarketplaceApiMarketplaceInstallRequest): Promise<Extension> =>
      {
        return MarketplaceService.install(parameters);
      },
      onSuccess: (): void =>
      {
        void queryClient.invalidateQueries({ queryKey: queryKeys.extensions.all });
        void queryClient.invalidateQueries({ queryKey: queryKeys.marketplace.all });
        void queryClient.invalidateQueries({ queryKey: queryKeys.extensions.configuration });
      }
    }
  );
}
