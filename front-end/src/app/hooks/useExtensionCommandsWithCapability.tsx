import { useEffect, useState, useSyncExternalStore } from "react";

import { Extension, ManifestCapabilityId } from "@picteus/ws-client";

import { useEventSocket } from "app/context";
import { ExtensionsService } from "app/services";


export default function useExtensionCommandsWithCapability(capabilityId: ManifestCapabilityId): Extension[]
{
  const { eventStore } = useEventSocket();
  const event = useSyncExternalStore(eventStore.subscribeToSocketEvents, eventStore.getSocketEvent);
  const [ extensions, setExtensions ] = useState<Extension[]>(ExtensionsService.getExtensionsWithCapability(capabilityId));

  useEffect(() =>
  {
    if (ExtensionsService.requiresCommandReload(event) === true)
    {
       ExtensionsService.fetchAll().then(() =>
      {
        setExtensions(ExtensionsService.getExtensionsWithCapability(capabilityId));
      });
    }
  }, [ event, capabilityId ]);

  return extensions;
}
