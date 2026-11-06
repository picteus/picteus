import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from "@tanstack/react-query";
import {
  Extension,
  MarketplaceApiMarketplaceInstallRequest,
  MarketplaceExtension,
  MarketplaceExtensionDetails
} from "@picteus/ws-client";

import { MarketplaceService } from "app/services";
import { queryKeys } from "app/query";


export function useMarketplaceExtensions(): UseQueryResult<MarketplaceExtension[], Error>
{
  return useQuery(
    {
      queryKey: queryKeys.marketplace.all,
      queryFn: (): Promise<MarketplaceExtension[]> =>
      {
        return MarketplaceService.list();
      }
    }
  );
}

export function useMarketplaceExtensionDetails(id: string): UseQueryResult<MarketplaceExtensionDetails, Error>
{
  return useQuery(
    {
      queryKey: [ ...queryKeys.marketplace.all, id ],
      queryFn: (): Promise<MarketplaceExtensionDetails> =>
      {
        return MarketplaceService.get({ id });
      },
      enabled: id.length > 0
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
