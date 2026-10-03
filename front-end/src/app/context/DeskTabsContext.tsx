import { ReactNode, useContext, useEffect, useState } from "react";
import { randomId } from "@mantine/hooks";

import { DeskTabType } from "types";
import { StorageService } from "app/services";
import createHmrStableContext from "./createHmrStableContext.ts";


export type DeskTabsContextType = {
  tabs: DeskTabType[];
  activeTab: string | null;
  addTab: (tab: Omit<DeskTabType, "id" | "timestampInMilliseconds"> & {
    id?: string,
    timestampInMilliseconds?: number
  }, isShow: boolean) => string;
  removeTab: (id: string) => void;
  setActiveTab: (id: string | null) => void;
  reorderTabs: (sourceIndex: number, destinationIndex: number) => void;
  shiftTab: (id: string, direction: "left" | "right") => void;
  renameTab: (tabId: string, newTitle: string) => void;
  closeAllTabs: () => void;
};

const DeskTabsContext = createHmrStableContext<DeskTabsContextType | undefined>(
  import.meta.hot,
  "deskTabsContext",
  undefined
);

export function useDeskTabsContext(): DeskTabsContextType
{
  const context = useContext(DeskTabsContext);
  if (!context)
  {
    throw new Error(
      "useDeskTabsContext must be used within DeskTabsProvider"
    );
  }
  return context;
}

export function DeskTabsProvider({ children }: { children?: ReactNode }): ReactNode
{
  const [ tabs, setTabs ] = useState<DeskTabType[]>(() => StorageService.getDeskTabs());
  const [ activeTab, setActiveTab ] = useState<string | null>(() =>
  {
    const storedActiveTab = StorageService.getDeskActiveTab();
    const initialTabs = StorageService.getDeskTabs();
    if (storedActiveTab && initialTabs.some((tab) => tab.id === storedActiveTab))
    {
      return storedActiveTab;
    }
    return initialTabs.length > 0 ? initialTabs[0].id : null;
  });

  useEffect(() =>
  {
    StorageService.setDeskTabs(tabs);
  }, [ tabs ]);

  useEffect(() =>
  {
    if (activeTab !== null)
    {
      StorageService.setDeskActiveTab(activeTab);
    }
  }, [ activeTab ]);

  function addTab(tab: Omit<DeskTabType, "id" | "timestampInMilliseconds"> & {
    id?: string,
    timestampInMilliseconds?: number
  }, isShow: boolean): string
  {
    const tabId = tab.id || randomId();
    const timestampInMilliseconds = tab.timestampInMilliseconds ?? Date.now();
    const newTab: DeskTabType = { ...tab, id: tabId, timestampInMilliseconds };
    setTabs((previousTabs) => [ ...previousTabs, newTab ]);
    if (isShow === true)
    {
      setActiveTab(tabId);
    }
    return tabId;
  }

  function removeTab(id: string): void
  {
    setTabs((previousTabs) =>
    {
      const tabIndex = previousTabs.findIndex((tab) => tab.id === id);
      const remainingTabs = previousTabs.filter((tab) => tab.id !== id);

      if (id === activeTab)
      {
        if (remainingTabs.length === 0)
        {
          setActiveTab(null);
        }
        else if (tabIndex < remainingTabs.length)
        {
          setActiveTab(remainingTabs[tabIndex].id);
        }
        else
        {
          setActiveTab(remainingTabs[remainingTabs.length - 1].id);
        }
      }

      return remainingTabs;
    });
  }

  function reorderTabs(sourceIndex: number, destinationIndex: number): void
  {
    if (sourceIndex === destinationIndex)
    {
      return;
    }

    setTabs((previousTabs) =>
    {
      if (
        sourceIndex < 0 ||
        sourceIndex >= previousTabs.length ||
        destinationIndex < 0 ||
        destinationIndex >= previousTabs.length
      )
      {
        return previousTabs;
      }

      const updatedTabs = [ ...previousTabs ];
      const [ movedTab ] = updatedTabs.splice(sourceIndex, 1);
      updatedTabs.splice(destinationIndex, 0, movedTab);
      return updatedTabs;
    });
  }

  function shiftTab(id: string, direction: "left" | "right"): void
  {
    setTabs((previousTabs) =>
    {
      const currentIndex = previousTabs.findIndex((tab) => tab.id === id);
      if (currentIndex === -1)
      {
        return previousTabs;
      }

      const targetIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= previousTabs.length)
      {
        return previousTabs;
      }

      const updatedTabs = [ ...previousTabs ];
      const currentTab = updatedTabs[currentIndex];
      updatedTabs[currentIndex] = updatedTabs[targetIndex];
      updatedTabs[targetIndex] = currentTab;
      return updatedTabs;
    });
  }

  function renameTab(tabId: string, newTitle: string): void
  {
    setTabs((previousTabs) =>
      previousTabs.map((tab) =>
      {
        if (tab.id === tabId)
        {
          return {
            ...tab,
            header: {
              ...tab.header,
              title: newTitle
            }
          };
        }
        return tab;
      })
    );
  }

  function closeAllTabs(): void
  {
    setTabs([]);
    setActiveTab(null);
  }

  return (
    <DeskTabsContext.Provider
      value={{
        tabs,
        activeTab,
        addTab,
        removeTab,
        setActiveTab,
        reorderTabs,
        shiftTab,
        renameTab,
        closeAllTabs
      }}
    >
      {children}
    </DeskTabsContext.Provider>
  );
}
