import React, { createContext, useContext, useEffect, useState } from "react";
import { randomId } from "@mantine/hooks";

import { TabsType } from "types";
import { StorageService } from "app/services";


type GalleryTabsContextType = {
  tabs: TabsType[],
  addTab: (tab: TabsType) => void,
  removeTab: (id: string) => void,
  state: {
    activeTab: string;
    setActiveTab: (id: string) => void;
    renameTab: (tabId: string, newName: string) => void;
  },
  galleryTabValue: string,
};

const GalleryTabsContext = createContext<GalleryTabsContextType | undefined>(
  undefined,
);

export function useGalleryTabsContext() {
  const context = useContext(GalleryTabsContext);
  if (!context) {
    throw new Error(
      "useGalleryTabsContext must be used within GalleryTabsProvider",
    );
  }
  return context;
}

const galleryTabValue = "gallery";

export function GalleryTabsProvider({ children }) {
  const [stack, setStack] = useState<TabsType[]>(StorageService.getGalleryTabs());
  const [activeTab, setActiveTab] = useState<string>(galleryTabValue);

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
    <GalleryTabsContext.Provider
      value={{
        tabs: stack,
        addTab: addToStack,
        removeTab: removeFromStack,
        state: { activeTab, setActiveTab, renameTab },
        galleryTabValue
      }}
    >
      {children}
    </GalleryTabsContext.Provider>
  );
}
