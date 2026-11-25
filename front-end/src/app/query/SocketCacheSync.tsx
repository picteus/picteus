import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { ChannelEnum, EventInformationType } from "types";
import { EventService } from "app/services";
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

      if (channel === ChannelEnum.IMAGE_CREATED || channel === ChannelEnum.IMAGE_DELETED || channel === ChannelEnum.IMAGE_UPDATED)
      {
        const imageId = EventService.computeEventEntityId<string>(event);
        if (imageId)
        {
          void queryClient.invalidateQueries({ queryKey: queryKeys.images.detail(imageId) });
        }
        void queryClient.invalidateQueries({ queryKey: queryKeys.images.all });
      }
      else if (channel === ChannelEnum.IMAGE_EMBEDDINGS_UPDATED)
      {
        const imageId = EventService.computeEventEntityId<string>(event);
        if (imageId)
        {
          void queryClient.invalidateQueries({ queryKey: queryKeys.images.allEmbeddings(imageId) });
        }
        void queryClient.invalidateQueries({ queryKey: queryKeys.repositories.embeddings });
      }

      if (channel.startsWith(ChannelEnum.COLLECTION_PREFIX) || channel === ChannelEnum.IMAGE_DELETED)
      {
        void queryClient.invalidateQueries({ queryKey: queryKeys.collections.all });
      }
      else if (channel.startsWith(ChannelEnum.REPOSITORY_PREFIX))
      {
        const repositoryId = EventService.computeEventEntityId<string>(event);
        if (repositoryId)
        {
          void queryClient.invalidateQueries({ queryKey: queryKeys.repositories.detail(repositoryId) });
        }
        void queryClient.invalidateQueries({ queryKey: queryKeys.repositories.all });
        if (channel.startsWith(ChannelEnum.REPOSITORY_MODE_PREFIX) || channel === ChannelEnum.REPOSITORY_DELETED)
        {
          void queryClient.invalidateQueries({ queryKey: queryKeys.repositories.activities });
        }
        if (channel.startsWith(ChannelEnum.REPOSITORY_MODE_PREFIX))
        {
          void queryClient.invalidateQueries({ queryKey: queryKeys.images.all });
        }
      }
      else if (channel.startsWith(ChannelEnum.EXTENSION_PREFIX))
      {
        const isLifecycleEvent = channel === ChannelEnum.EXTENSION_INSTALLED || channel === ChannelEnum.EXTENSION_UPDATED || channel === ChannelEnum.EXTENSION_UNINSTALLED || channel === ChannelEnum.EXTENSION_STATE_STARTED || channel === ChannelEnum.EXTENSION_STATE_STOPPED;
        const isActivityEvent = channel === ChannelEnum.EXTENSION_STATE_STARTED || channel === ChannelEnum.EXTENSION_STATE_STOPPED || channel === ChannelEnum.EXTENSION_PROCESS_STARTED || channel === ChannelEnum.EXTENSION_PROCESS_STOPPED || channel === ChannelEnum.EXTENSION_CONNECTION_STARTED || channel === ChannelEnum.EXTENSION_CONNECTION_STOPPED || channel === ChannelEnum.EXTENSION_ERROR;

        if (isLifecycleEvent === true)
        {
          const extensionId = EventService.computeEventEntityId<string>(event);
          if (extensionId)
          {
            void queryClient.invalidateQueries({ queryKey: queryKeys.extensions.detail(extensionId) });
          }
          void queryClient.invalidateQueries({ queryKey: queryKeys.extensions.all });
          void queryClient.invalidateQueries({ queryKey: queryKeys.extensions.aiModels });
        }
        if (isActivityEvent === true)
        {
          void queryClient.invalidateQueries({ queryKey: queryKeys.extensions.activities });
        }
      }
    });

    return () =>
    {
      unsubscribe();
    };
  }, [ eventStore, queryClient ]);

  return null;
}
