import { useEffect, useState, useSyncExternalStore } from "react";

import { CommandEntity } from "@picteus/ws-client";

import { UiExtensionCommandType } from "types";
import { useEventSocket } from "app/context";
import { ExtensionsService } from "app/services";


export default function useExtensionCommandsWithEntities(commandEntities: CommandEntity[]): UiExtensionCommandType[]
{
  const { eventStore } = useEventSocket();
  const event = useSyncExternalStore(eventStore.subscribeToSocketEvents, eventStore.getSocketEvent);
  const [ extensionsCommands, setExtensionsCommands ] = useState<UiExtensionCommandType[]>(ExtensionsService.getExtensionsCommands(commandEntities)
  );

  useEffect(() =>
  {
    if (ExtensionsService.requiresCommandReload(event) === true)
    {
      ExtensionsService.fetchAll().then(() =>
      {
        setExtensionsCommands(ExtensionsService.getExtensionsCommands(commandEntities));
      });
    }
  }, [ event, commandEntities ]);

  return extensionsCommands;
}
