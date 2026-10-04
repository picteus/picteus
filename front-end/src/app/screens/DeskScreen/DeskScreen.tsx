import React, { DragEvent, ReactElement, ReactNode, useEffect, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { ActionIcon, Box, Center, CloseButton, Group, ScrollArea, Stack, Text, Tooltip } from "@mantine/core";
import {
  IconChevronLeft,
  IconChevronRight,
  IconCode,
  IconFileText,
  IconPhoto,
  IconStack2,
  IconWorld
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { DeskTabType } from "types";
import { DESK_TAB_QUERY_PARAMETER_NAME, ROUTES } from "utils";
import { useDeskTabsContext } from "app/context";
import { Common, EmptyResults, ExtensionIcon, ResourceIcon, StackableScreen } from "app/components";
import { DeskTabContent, TabHeader } from "./components";

import style from "./DeskScreen.module.scss";


function findMostRecentTab(availableTabs: DeskTabType[]): DeskTabType | undefined
{
  if (availableTabs.length === 0)
  {
    return undefined;
  }
  return availableTabs.reduce((mostRecentTab, currentTab) => currentTab.timestampInMilliseconds >= mostRecentTab.timestampInMilliseconds ? currentTab : mostRecentTab, availableTabs[0]
  );
}

export default function DeskScreen(): ReactElement
{
  const [ t ] = useTranslation();
  const location = useLocation();
  const [ searchParameters, setSearchParameters ] = useSearchParams();
  const { tabs, activeTab, setActiveTab, removeTab, reorderTabs } = useDeskTabsContext();

  const [ draggedTabId, setDraggedTabId ] = useState<string | null>(null);
  const [ dropTargetTabId, setDropTargetTabId ] = useState<string | null>(null);
  const scrollViewportReference = useRef<HTMLDivElement>(null);
  const tabElementsReference = useRef<Map<string, HTMLDivElement>>(new Map());

  const queryTabIdentifier = searchParameters.get(DESK_TAB_QUERY_PARAMETER_NAME) || searchParameters.get("tab");
  const tabMatchingQuery = queryTabIdentifier ? tabs.find((tabItem) => tabItem.id === queryTabIdentifier) : undefined;
  const tabMatchingActive = tabs.find((tabItem) => tabItem.id === activeTab);
  const mostRecentTab = findMostRecentTab(tabs);
  const selectedTab = (queryTabIdentifier ? (tabMatchingQuery ?? mostRecentTab) : undefined) ?? tabMatchingActive ??
    mostRecentTab ?? tabs[0];

  function scrollTabIntoView(tabIdentifier: string): void
  {
    const viewportElement = scrollViewportReference.current;
    if (viewportElement === null)
    {
      return;
    }

    const tabElement = tabElementsReference.current.get(tabIdentifier) ?? (viewportElement.querySelector(`[data-tab-id="${tabIdentifier}"]`) as HTMLDivElement | null);
    if (tabElement === null)
    {
      return;
    }

    const viewportRectangle = viewportElement.getBoundingClientRect();
    const tabRectangle = tabElement.getBoundingClientRect();

    // We do not scroll if the container or tab has zero dimensions (e.g., before layout or while hidden)
    if (viewportRectangle.width === 0 || tabRectangle.width === 0)
    {
      return;
    }

    const marginInPixels = 8;
    const left: number | undefined = tabRectangle.left < viewportRectangle.left ? (tabRectangle.left - viewportRectangle.left - marginInPixels) : (tabRectangle.right > viewportRectangle.right ? (tabRectangle.right - viewportRectangle.right + marginInPixels) : undefined);
    if (left !== undefined)
    {
      viewportElement.scrollBy({ left, behavior: "smooth" });
    }
  }

  function handleSelectTab(tabIdentifier: string): void
  {
    setActiveTab(tabIdentifier);
    setSearchParameters((previousParameters) =>
      {
        const nextParameters = new URLSearchParams(previousParameters);
        nextParameters.set(DESK_TAB_QUERY_PARAMETER_NAME, tabIdentifier);
        return nextParameters;
      },
      { replace: true }
    );
    scrollTabIntoView(tabIdentifier);
  }

  useEffect(() =>
  {
    if (tabs.length === 0)
    {
      if (queryTabIdentifier)
      {
        setSearchParameters((previousParameters) =>
          {
            const nextParameters = new URLSearchParams(previousParameters);
            nextParameters.delete(DESK_TAB_QUERY_PARAMETER_NAME);
            nextParameters.delete("tab");
            return nextParameters;
          },
          { replace: true }
        );
      }
      return;
    }

    if (queryTabIdentifier)
    {
      if (tabMatchingQuery)
      {
        if (activeTab !== tabMatchingQuery.id)
        {
          setActiveTab(tabMatchingQuery.id);
        }
      }
      else if (mostRecentTab)
      {
        // We display the most recent tab as a fallback if the query parameter identifier does not correspond to any tab
        if (activeTab !== mostRecentTab.id)
        {
          setActiveTab(mostRecentTab.id);
        }

        setSearchParameters(
          (previousParameters) =>
          {
            const nextParameters = new URLSearchParams(previousParameters);
            nextParameters.set(DESK_TAB_QUERY_PARAMETER_NAME, mostRecentTab.id);
            return nextParameters;
          },
          { replace: true }
        );
      }
    }
    else if (!tabMatchingActive && mostRecentTab)
    {
      if (activeTab !== mostRecentTab.id)
      {
        setActiveTab(mostRecentTab.id);
      }
    }
  }, [
    queryTabIdentifier,
    tabMatchingQuery,
    tabMatchingActive,
    mostRecentTab,
    tabs.length,
    activeTab,
    setActiveTab,
    setSearchParameters
  ]);

  useEffect(() =>
  {
    if (location.pathname === ROUTES.desk && selectedTab?.id)
    {
      const tabIdentifier = selectedTab.id;
      const animationFrameIdentifier = requestAnimationFrame(() =>
      {
        scrollTabIntoView(tabIdentifier);
      });

      const timeoutIdentifier = window.setTimeout(() =>
      {
        scrollTabIntoView(tabIdentifier);
      }, 100);

      return () =>
      {
        cancelAnimationFrame(animationFrameIdentifier);
        window.clearTimeout(timeoutIdentifier);
      };
    }
  }, [ location.pathname, selectedTab?.id, tabs.length ]);

  useEffect(() =>
  {
    function handleResize(): void
    {
      if (location.pathname === ROUTES.desk && selectedTab?.id)
      {
        scrollTabIntoView(selectedTab.id);
      }
    }

    window.addEventListener("resize", handleResize);
    return () =>
    {
      window.removeEventListener("resize", handleResize);
    };
  }, [ location.pathname, selectedTab?.id ]);

  function handleScroll(direction: "left" | "right"): void
  {
    if (scrollViewportReference.current)
    {
      const scrollStep = 220;
      scrollViewportReference.current.scrollBy({
        left: direction === "left" ? -scrollStep : scrollStep,
        behavior: "smooth"
      });
    }
  }

  function handleDragStart(event: DragEvent<HTMLDivElement>, tabId: string): void
  {
    event.dataTransfer.setData("text/plain", tabId);
    setDraggedTabId(tabId);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>, tabId: string): void
  {
    if (draggedTabId && draggedTabId !== tabId)
    {
      event.preventDefault();
      setDropTargetTabId(tabId);
    }
  }

  function handleDragLeave(tabId: string): void
  {
    if (dropTargetTabId === tabId)
    {
      setDropTargetTabId(null);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>, targetTabId: string): void
  {
    event.preventDefault();
    const sourceTabId = event.dataTransfer.getData("text/plain") || draggedTabId;
    if (sourceTabId && sourceTabId !== targetTabId)
    {
      const sourceIndex = tabs.findIndex((tabItem) => tabItem.id === sourceTabId);
      const destinationIndex = tabs.findIndex((tabItem) => tabItem.id === targetTabId);
      if (sourceIndex !== -1 && destinationIndex !== -1)
      {
        reorderTabs(sourceIndex, destinationIndex);
      }
    }
    setDraggedTabId(null);
    setDropTargetTabId(null);
    if (sourceTabId)
    {
      scrollTabIntoView(sourceTabId);
    }
  }

  function handleDragEnd(): void
  {
    setDraggedTabId(null);
    setDropTargetTabId(null);
  }

  function renderTabIcon(tab: DeskTabType): ReactNode
  {
    if (tab.extensionId)
    {
      return <ExtensionIcon idOrExtension={tab.extensionId} size="sm"/>;
    }

    if (tab.header?.icon)
    {
      return <ResourceIcon icon={tab.header.icon} isCompact={false}/>;
    }

    if (tab.content.kind === "image")
    {
      return <IconPhoto size={Common.IconSmallSize} stroke={1.5}/>;
    }
    if (tab.content.kind === "images")
    {
      return <IconPhoto size={Common.IconSmallSize} stroke={1.5}/>;
    }
    if (tab.content.kind === "url")
    {
      return <IconWorld size={Common.IconSmallSize} stroke={1.5}/>;
    }
    if (tab.content.kind === "html")
    {
      return <IconCode size={Common.IconSmallSize} stroke={1.5}/>;
    }
    if (tab.content.kind === "markdown")
    {
      return <IconFileText size={Common.IconSmallSize} stroke={1.5}/>;
    }

    return <IconStack2 size={Common.IconSmallSize} stroke={1.5}/>;
  }

  if (tabs.length === 0)
  {
    return (
      <Center h="100%" w="100%">
        <EmptyResults
          icon={IconStack2}
          title={t("emptyDesk.title")}
          description={t("emptyDesk.description")}
        />
      </Center>
    );
  }

  return (
    <StackableScreen resetTrigger={selectedTab?.id} className={style.container}>
      <Group
        h={42}
        px="xs"
        gap="xs"
        wrap="nowrap"
        className={style.topBar}
      >
        <ActionIcon
          variant="subtle"
          size="sm"
          onClick={() => handleScroll("left")}
        >
          <IconChevronLeft size={Common.IconSmallSize}/>
        </ActionIcon>
        <ScrollArea
          flex={1}
          viewportRef={scrollViewportReference}
          type="never"
        >
          <Group gap="xs" align="flex-end" h="100%" pt="xs" wrap="nowrap">
            {tabs.map((tab) =>
            {
              const isTabActive = tab.id === selectedTab?.id;
              const isTabDragging = tab.id === draggedTabId;
              const isTabDropTarget = tab.id === dropTargetTabId;
              const tooltipLabel = tab.header === undefined ? tab.label : (tab.header.description ? `${tab.header.title} — ${tab.header.description}` : tab.header.title);

              return (
                <Group
                  key={tab.id}
                  ref={(element) =>
                  {
                    if (element)
                    {
                      tabElementsReference.current.set(tab.id, element);
                    }
                    else
                    {
                      tabElementsReference.current.delete(tab.id);
                    }
                  }}
                  gap="xs"
                  px={10}
                  h={36}
                  wrap="nowrap"
                  className={style.tabItem}
                  data-active={isTabActive === true ? "true" : undefined}
                  data-tab-id={tab.id}
                  data-dragging={isTabDragging === true ? "true" : undefined}
                  data-drop-target={isTabDropTarget === true ? "true" : undefined}
                  draggable={tab.isShiftable !== false}
                  onDragStart={(event) => handleDragStart(event, tab.id)}
                  onDragOver={(event) => handleDragOver(event, tab.id)}
                  onDragLeave={() => handleDragLeave(tab.id)}
                  onDrop={(event) => handleDrop(event, tab.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => handleSelectTab(tab.id)}
                >
                  {renderTabIcon(tab)}

                  <Tooltip
                    label={tooltipLabel}
                    withinPortal
                  >
                    <Text size="sm" maw={140} truncate>
                      {tab.label}
                    </Text>
                  </Tooltip>

                  {tab.isClosable !== false && (
                    <CloseButton
                      size="xs"
                      className={style.closeButton}
                      onClick={(event) =>
                      {
                        event.stopPropagation();
                        removeTab(tab.id);
                      }}
                    />
                  )}
                </Group>
              );
            })}
          </Group>
        </ScrollArea>
        <ActionIcon
          variant="subtle"
          size="sm"
          onClick={() => handleScroll("right")}
        >
          <IconChevronRight size={Common.IconSmallSize}/>
        </ActionIcon>
      </Group>

      <Box flex={1} pos="relative" style={{ overflow: "hidden" }}>
        {selectedTab && (
          <Stack h="100%" w="100%" gap={0} style={{ overflow: "hidden" }}>
            <TabHeader tab={selectedTab}/>
            <Box flex={1} pos="relative" style={{ overflow: "hidden" }}>
              <DeskTabContent tab={selectedTab}/>
            </Box>
          </Stack>
        )}
      </Box>
    </StackableScreen>
  );
}
