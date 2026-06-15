import React, { createContext, useContext, useEffect, useState } from "react";
import { randomId } from "@mantine/hooks";

import { TabsType } from "types";
import { StorageService } from "app/services";


type ImagesTabsContextType = {
  tabs: TabsType[],
  addTab: (tab: TabsType) => void,
  removeTab: (id: string) => void,
  state: {
    activeTab: string;
    setActiveTab: (id: string) => void;
    renameTab: (tabId: string, newName: string) => void;
  },
  mainTabValue: string,
};

const ImagesTabsContext = createContext<ImagesTabsContextType | undefined>(
  undefined,
);

export function useImagesTabsContext() {
  const context = useContext(ImagesTabsContext);
  if (!context) {
    throw new Error(
      "useImagesTabsContext must be used within ImagesTabsProvider",
    );
  }
  return context;
}

const mainTabValue = "explorer";

export function ImagesTabsProvider({ children }) {
  const [stack, setStack] = useState<TabsType[]>(StorageService.getGalleryTabs());
  const [activeTab, setActiveTab] = useState<string>(mainTabValue);

  useEffect(() => {
    StorageService.setGalleryTabs(stack);
  }, [stack]);

  function addToStack(tab: TabsType) {
    if (!tab.id) {
      tab.id = randomId();
    }
    setStack((prev) => [...prev, tab]);
    setActiveTab(tab.id);
  }

  function removeFromStack(id: string) {
    setStack((prev) => prev.filter((item) => item.id !== id));
  }

  function renameTab(tabId: string, newName: string) {
    setStack((prev) =>
      prev.map((tab) => {
        if (tab.id === tabId) {
          return { ...tab, label: newName };
        }
        return tab;
      }),
    );
  }

  return (
    <ImagesTabsContext.Provider
      value={{
        tabs: stack,
        addTab: addToStack,
        removeTab: removeFromStack,
        state: { activeTab, setActiveTab, renameTab },
        mainTabValue
      }}
    >
      {children}
    </ImagesTabsContext.Provider>
  );
}
