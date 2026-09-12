import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { Extension, ExtensionState, UserInterfaceAnchor } from "@picteus/ws-client";

import { AdditionalUi, ChannelEnum } from "types";
import { computeExtensionSidebarUuid, ToastService } from "utils";
import { ExtensionsService } from "app/services";
import useOpenWindow from "../hooks/useOpenWindow.tsx";
import createHmrStableContext from "./createHmrStableContext.ts";
import { useExtensions } from "../hooks";
import { useSocketEvents } from "./EventSocketContext.tsx";


type AdditionalUiContextValue = {
  sidebar: AdditionalUi[];
};

type AdditionalUiContextType = [
  AdditionalUiContextValue,
  () => void,
  (additionalUi: AdditionalUi) => void,
];

const AdditionalUiContext = createHmrStableContext<AdditionalUiContextType | undefined>(import.meta.hot, "additionalUiContext", undefined);

export function useAdditionalUiContext(): AdditionalUiContextType
{
  const context = useContext(AdditionalUiContext);
  if (!context)
  {
    throw new Error("useAdditionalUiContext must be used within an AdditionalUiProvider");
  }
  return context;
}

export function AdditionalUiProvider({ children }: { children?: React.ReactNode }): JSX.Element
{
  const { data: extensions = [] } = useExtensions();
  const openWindow = useOpenWindow();
  const windowsOpened = useRef<boolean>(false);

  function openWindows(additionalUis: AdditionalUi[]): void
  {
    if (windowsOpened.current === true)
    {
      return;
    }
    // We open the extensions' UI fragments with a "window" integration
    for (const additionalUi of additionalUis)
    {
      if (additionalUi.integration.anchor === UserInterfaceAnchor.Window)
      {
        openWindow(additionalUi.uuid, additionalUi.content, true).catch(
          (error) =>
          {
            return ToastService.failureAndMessage(error, `Could not open the window with uuid '${additionalUi.uuid}'`);
          }
        );
      }
    }
    windowsOpened.current = true;
  }

  function getAdditionalUis(extensions: Extension[]): AdditionalUi[]
  {
    return extensions.flatMap(
      (extension) =>
      {
        return extension.manifest.ui?.elements
          ?.filter(
            (element) =>
            {
              return (element.integration.anchor === UserInterfaceAnchor.Sidebar || element.integration.anchor === UserInterfaceAnchor.Window) &&
                extension.state === ExtensionState.Enabled;
            }
          )
          .map(
            (element) =>
            {
              const integration = element.integration;
              return {
                uuid: computeExtensionSidebarUuid(extension.manifest.id, element.id),
                integration,
                content: {
                  url: (integration.anchor === UserInterfaceAnchor.Window || (integration.anchor === UserInterfaceAnchor.Sidebar && integration.isExternal === true))
                    ? element.url
                    : ExtensionsService.buildUiURL(extension.manifest.id, element.url)
                },
                icon: { url: ExtensionsService.getIconURL(extension) },
                title: extension.manifest.name,
                extensionId: extension.manifest.id,
                automaticallyReopen: true
              };
            }
          ) || [];
      }
    );
  }

  function computeAdditionalUi(): AdditionalUiContextValue
  {
    const additionalUis = getAdditionalUis(extensions);
    openWindows(additionalUis);
    return {
      sidebar: additionalUis.filter(
        (additionalUi) =>
        {
          return additionalUi.integration.anchor !== UserInterfaceAnchor.Window;
        }
      )
    };
  }

  const [ additionalContextValue, setAdditionalContextValue ] = useState<AdditionalUiContextValue>(computeAdditionalUi());
  const [ transientUis, setTransientUis ] = useState<AdditionalUi[]>([]);

  const refresh = useCallback(
    (): void =>
    {
      const newAdditionalUis = transientUis.filter(
        (transientUi) =>
        {
          return extensions.find(
            (extension) =>
            {
              return extension.manifest.id === transientUi.extensionId;
            }
          )?.state !== ExtensionState.Paused;
        }
      );
      setTransientUis(newAdditionalUis);
      const additionalUis = [ ...computeAdditionalUi().sidebar, ...newAdditionalUis ];
      setAdditionalContextValue({ sidebar: [ ...additionalUis ] });
    },
    [ transientUis, extensions ]
  );

  const addTransient = useCallback(
    (additionalUi: AdditionalUi): void =>
    {
      if (transientUis.find((item) =>
      {
        return item.extensionId === additionalUi.extensionId && item.uuid === additionalUi.uuid;
      }) === undefined)
      {
        setTransientUis(transientUis.concat(additionalUi));
        const additionalUis = [ ...additionalContextValue.sidebar, additionalUi ];
        setAdditionalContextValue({ sidebar: additionalUis });
      }
    },
    [ additionalContextValue, transientUis ]
  );

  const extensionLifecycleChannels = useMemo(
    () =>
    {
      return [
        ChannelEnum.EXTENSION_UPDATED,
        ChannelEnum.EXTENSION_INSTALLED,
        ChannelEnum.EXTENSION_UNINSTALLED,
        ChannelEnum.EXTENSION_CONNECTION_STARTED,
        ChannelEnum.EXTENSION_CONNECTION_STOPPED
      ] as const;
    },
    []
  );

  useSocketEvents(
    extensionLifecycleChannels,
    () =>
    {
      refresh();
    }
  );

  useEffect(
    () =>
    {
      refresh();
    },
    [ extensions ]
  );

  return (
    <AdditionalUiContext.Provider value={[ additionalContextValue, refresh, addTransient ]}>
      {children}
    </AdditionalUiContext.Provider>
  );
}

