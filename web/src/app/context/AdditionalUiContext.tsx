import React, { createContext, useCallback, useContext, useState } from "react";

import { AdditionalUi } from "types";
import { ExtensionsService } from "app/services";

type AdditionalUiContextValue = {
  sidebar: AdditionalUi[];
};

type AdditionalUiContextType = [
  AdditionalUiContextValue,
  React.Dispatch<React.SetStateAction<AdditionalUiContextValue>>,
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

  // TODO: handle the case of the paused or uninstalled extensions
  function computeAdditionalUi() {
    return {
      sidebar: ExtensionsService.getAdditionalUi()
    };
  }
  const [value, setValue] = useState<AdditionalUiContextValue>(computeAdditionalUi());

  const refresh = useCallback(() => {
    setValue(computeAdditionalUi());
  }, []);

  // TODO: handle the case of the "refresh" callback, which deletes all the transient items
  const addTransient = useCallback((additionalUi: AdditionalUi) => {
    setValue({ sidebar: [...value.sidebar, additionalUi]  });
  }, []);

  return (
    <AdditionalUiContext.Provider value={[value, setValue, refresh, addTransient]}>
      {children}
    </AdditionalUiContext.Provider>
  );
}
