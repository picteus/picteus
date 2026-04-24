import React, { createContext, useCallback, useContext, useRef, useState } from "react";

import { UserInterfaceAnchor } from "@picteus/ws-client";

import { AdditionalUi } from "types";
import { notifyErrorWithError } from "utils";
import { ExtensionsService } from "app/services";
import useOpenWindow from "../hooks/useOpenWindow.tsx";


type AdditionalUiContextValue = {
  sidebar: AdditionalUi[];
};

type AdditionalUiContextType = [
  AdditionalUiContextValue,
  () => void,
  (additionalUi: AdditionalUi) => void,
];

const AdditionalUiContext = createContext<AdditionalUiContextType | undefined>(
  undefined,
);

export function useAdditionalUiContext() {
  const context = useContext(AdditionalUiContext);
  if (!context) {
    throw new Error(
      "useAdditionalUiContext must be used within an AdditionalUiProvider"
    );
  }
  return context;
}

export function AdditionalUiProvider({ children }) {

  const openWindow = useOpenWindow();
  const windowsOpened = useRef<boolean>(false);

  function openWindows(additionalUis: AdditionalUi[]): void {
    if (windowsOpened.current === true) {
      return;
    }
    // We open the extensions UI fragments with a "window" integration
    for (const additionalUi of additionalUis) {
      if (additionalUi.integration.anchor === UserInterfaceAnchor.Window) {
        openWindow(additionalUi.uuid, additionalUi.content, true).catch(error => notifyErrorWithError(error, `Could not open the window with uuid '${additionalUi.uuid}'`));
      }
    }
    windowsOpened.current = true;
  }

  function computeAdditionalUi(): AdditionalUiContextValue {
    const additionalUis = ExtensionsService.getAdditionalUis();
    openWindows(additionalUis);
    return { sidebar: additionalUis.filter(additionalUi => additionalUi.integration.anchor !== UserInterfaceAnchor.Window) };
  }

  const [additionalContextValue, setAdditionalContextValue] = useState<AdditionalUiContextValue>(computeAdditionalUi());
  const [transientUis, setTransientUis] = useState<AdditionalUi[]>([]);

  const refresh = useCallback(() => {
    const newAdditionalUis = transientUis.filter(transientUi => ExtensionsService.isPaused(transientUi.extensionId) === false);
    setTransientUis(newAdditionalUis);
    const additionalUis = [...computeAdditionalUi().sidebar, ...newAdditionalUis];
    setAdditionalContextValue({ sidebar: [...additionalUis] });
  }, [transientUis]);

  const addTransient = useCallback((additionalUi: AdditionalUi) => {
    if (transientUis.find(ui => ui.extensionId === additionalUi.extensionId && ui.uuid === additionalUi.uuid) === undefined) {
      setTransientUis(transientUis.concat(additionalUi));
      const additionalUis = [...additionalContextValue.sidebar, additionalUi];
      setAdditionalContextValue({ sidebar: additionalUis });
    }
  }, [additionalContextValue, transientUis]);

  return (
    <AdditionalUiContext.Provider value={[additionalContextValue, refresh, addTransient]}>
      {children}
    </AdditionalUiContext.Provider>
  );
}
