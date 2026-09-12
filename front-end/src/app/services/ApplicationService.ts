import { CollectionService, ExtensionsService, RepositoriesService } from "app/services";
import { queryClient, queryKeys } from "app/query";


function swallowError(): void
{
  // We intentionally swallow prefetch errors so application initialization is not blocked.
}

async function initialize(): Promise<void>
{
  await Promise.all([
    queryClient.query(
      {
        queryKey: queryKeys.repositories.all,
        queryFn: (): Promise<unknown> =>
        {
          return RepositoriesService.fetchAll();
        }
      }
    ).catch(swallowError),
    queryClient.query(
      {
        queryKey: queryKeys.extensions.all,
        queryFn: (): Promise<unknown> =>
        {
          return ExtensionsService.fetchAll();
        }
      }
    ).catch(swallowError),
    queryClient.query(
      {
        queryKey: queryKeys.collections.all,
        queryFn: (): Promise<unknown> =>
        {
          return CollectionService.fetchAll();
        }
      }
    ).catch(swallowError)
  ]);
}

export default {
  initialize
};
