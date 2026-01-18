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
];

const AdditionalUiContext = createContext<AdditionalUiContextType | undefined>(
  undefined,
);

export function useAdditionalUiContext() {
  return useContext(AdditionalUiContext);
}

export function AdditionalUiProvider({ children }) {

  function computeAdditionalUi()
  {
    return {
      sidebar: ExtensionsService.getAdditionalUi()
    };
  }
  const [value, setValue] = useState<AdditionalUiContextValue>(computeAdditionalUi());

  const refresh = useCallback(() => {
    setValue(computeAdditionalUi());
  }, []);

  return (
    <AdditionalUiContext.Provider value={[value, setValue, refresh]}>
      {children}
    </AdditionalUiContext.Provider>
  );
}
