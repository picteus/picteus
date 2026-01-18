import React, { createContext, useContext, useEffect, useState } from "react";
import { randomId } from "@mantine/hooks";

import { TabsType } from "types";
import { StorageService } from "app/services";

type GalleryTabsContextType = [
  stack: TabsType[],
  addToStack: (tab: TabsType) => void,
  removeFromStack: (id: string) => void,
  activeTabState: {
    activeTab: string;
    setActiveTab: (id: string) => void;
    renameTab: (tabId: string, newName: string) => void;
  },
];

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

export function GalleryTabsProvider({ children }) {
  const [stack, setStack] = useState<TabsType[]>(
    StorageService.getGalleryTabs(),
  );
  const [activeTab, setActiveTab] = useState<string>("gallery");

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
      value={[
        stack,
        addToStack,
        removeFromStack,
        { activeTab, setActiveTab, renameTab },
      ]}
    >
      {children}
    </GalleryTabsContext.Provider>
  );
}
