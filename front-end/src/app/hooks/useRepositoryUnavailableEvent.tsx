import { ChannelEnum, EventInformationType } from "types";
import { useSocketEvents } from "app/context";
import { EventService } from "app/services";


const REPOSITORY_UNAVAILABLE_CHANNELS = [
  ChannelEnum.REPOSITORY_MODE_DISABLED,
  ChannelEnum.REPOSITORY_DELETED
] as const;

export default function useRepositoryUnavailableEvent(callback: (repositoryId: string, event: EventInformationType) => void): void
{
  useSocketEvents(REPOSITORY_UNAVAILABLE_CHANNELS, (event: EventInformationType): void =>
  {
    const repositoryId = EventService.computeEventEntityId<string>(event);
    if (repositoryId !== undefined)
    {
      callback(repositoryId, event);
    }
  });
}
