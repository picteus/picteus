import React, { createContext, useCallback, useContext, useState } from "react";

import { AdditionalUi } from "types";
import { ExtensionsService } from "app/services";

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
  return useContext(AdditionalUiContext);
}

export function AdditionalUiProvider({ children }) {

  function computeAdditionalUi() {
    return {
      sidebar: ExtensionsService.getAdditionalUi()
    };
  }
  const [additionalContextValue, setAdditionalContextValue] = useState<AdditionalUiContextValue>(computeAdditionalUi());
  const [transientUis, setTransientUis] = useState<AdditionalUi[]>([]);

  const refresh = useCallback(() => {
    const newAdditionalUis = transientUis.filter(transientUi => ExtensionsService.isPaused(transientUi.extensionId) === false);
    setTransientUis(newAdditionalUis);
    setAdditionalContextValue({ sidebar:[...computeAdditionalUi().sidebar, ...newAdditionalUis] });
  }, [transientUis]);

  const addTransient = useCallback((additionalUi: AdditionalUi) => {
    setTransientUis(transientUis.concat(additionalUi));
    setAdditionalContextValue({ sidebar: [...additionalContextValue.sidebar, additionalUi]  });
  }, [additionalContextValue, transientUis]);

  return (
    <AdditionalUiContext.Provider value={[additionalContextValue, refresh, addTransient]}>
      {children}
    </AdditionalUiContext.Provider>
  );
}
