import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { ChannelEnum, EventInformationType } from "types";
import { useEventSocket } from "app/context";
import { queryKeys } from "./queryKeys.ts";


export function SocketCacheSync(): null
{
  const queryClient = useQueryClient();
  const { eventStore } = useEventSocket();

  useEffect(() =>
  {
    const unsubscribe = eventStore.subscribeToSocketEvents((event: EventInformationType) =>
    {
      const channel = event.channel;

      if (channel.startsWith(ChannelEnum.COLLECTION_PREFIX))
      {
        void queryClient.invalidateQueries({ queryKey: queryKeys.collections.all });
      }
      else if (channel.startsWith(ChannelEnum.REPOSITORY_PREFIX))
      {
        void queryClient.invalidateQueries({ queryKey: queryKeys.repositories.all });
      }
      else if (channel === ChannelEnum.EXTENSION_INSTALLED || channel === ChannelEnum.EXTENSION_UPDATED || channel === ChannelEnum.EXTENSION_UNINSTALLED)
      {
        void queryClient.invalidateQueries({ queryKey: queryKeys.extensions.all });
        void queryClient.invalidateQueries({ queryKey: queryKeys.extensions.configuration });
      }
      else if (channel === ChannelEnum.EXTENSION_STATE_STARTED || channel === ChannelEnum.EXTENSION_STATE_STOPPED || channel === ChannelEnum.EXTENSION_PROCESS_STARTED || channel === ChannelEnum.EXTENSION_PROCESS_STOPPED || channel === ChannelEnum.EXTENSION_CONNECTION_STARTED || channel === ChannelEnum.EXTENSION_CONNECTION_STOPPED)
      {
        void queryClient.invalidateQueries({ queryKey: queryKeys.extensions.activities });
      }
    });

    return () =>
    {
      unsubscribe();
    };
  }, [ eventStore, queryClient ]);

  return null;
}
