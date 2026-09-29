import { DragEvent, ReactElement, ReactNode, useRef, useState } from "react";
import { ActionIcon, CloseButton, ScrollArea, Text, Tooltip } from "@mantine/core";
import {
  IconChevronLeft,
  IconChevronRight,
  IconCode,
  IconFileText,
  IconPhoto,
  IconStack,
  IconWorld
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { DeskTabType } from "types";
import { useDeskTabsContext } from "app/context";
import { EmptyResults, ExtensionIcon, StackableScreen } from "app/components";
import DeskTabContent from "./components/DeskTabContent.tsx";

import style from "./DeskScreen.module.scss";


export default function DeskScreen(): ReactElement
{
  const [ t ] = useTranslation();
  const { tabs, activeTab, setActiveTab, removeTab, reorderTabs } = useDeskTabsContext();

  const [ draggedTabId, setDraggedTabId ] = useState<string | null>(null);
  const [ dropTargetTabId, setDropTargetTabId ] = useState<string | null>(null);
  const scrollViewportReference = useRef<HTMLDivElement>(null);

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
  }

  function handleDragEnd(): void
  {
    setDraggedTabId(null);
    setDropTargetTabId(null);
  }

  function renderTabIcon(tabItem: DeskTabType): ReactNode
  {
    if (tabItem.extensionId)
    {
      return <ExtensionIcon idOrExtension={tabItem.extensionId} size="sm"/>;
    }

    if (tabItem.header.icon && "url" in tabItem.header.icon)
    {
      return (
        <img
          src={tabItem.header.icon.url}
          alt=""
          style={{ width: 16, height: 16, objectFit: "contain" }}
        />
      );
    }

    if (tabItem.content.kind === "images")
    {
      return <IconPhoto size={16} stroke={1.5}/>;
    }
    if (tabItem.content.kind === "url")
    {
      return <IconWorld size={16} stroke={1.5}/>;
    }
    if (tabItem.content.kind === "html")
    {
      return <IconCode size={16} stroke={1.5}/>;
    }
    if (tabItem.content.kind === "markdown")
    {
      return <IconFileText size={16} stroke={1.5}/>;
    }

    return <IconStack size={16} stroke={1.5}/>;
  }

  if (tabs.length === 0)
  {
    return (
      <div className={style.emptyContainer}>
        <EmptyResults
          icon={IconStack}
          title={t("emptyDesk.title")}
          description={t("emptyDesk.description")}
        />
      </div>
    );
  }

  const selectedTab = tabs.find((tabItem) => tabItem.id === activeTab) ?? tabs[0];

  return (
    <StackableScreen resetTrigger={activeTab} className={style.container}>
      <div className={style.topBar}>
        <ActionIcon
          variant="subtle"
          size="sm"
          className={style.shiftButton}
          onClick={() => handleScroll("left")}
        >
          <IconChevronLeft size={16}/>
        </ActionIcon>
        <ScrollArea
          className={style.scrollArea}
          viewportRef={scrollViewportReference}
          type="never"
        >
          <div className={style.tabsList}>
            {tabs.map((tabItem) =>
            {
              const isTabActive = tabItem.id === activeTab;
              const isTabDragging = tabItem.id === draggedTabId;
              const isTabDropTarget = tabItem.id === dropTargetTabId;

              const tooltipLabel = tabItem.header.description
                ? `${tabItem.header.title} — ${tabItem.header.description}`
                : tabItem.header.title;

              return (
                <div
                  key={tabItem.id}
                  className={style.tabItem}
                  data-active={isTabActive === true ? "true" : undefined}
                  data-dragging={isTabDragging === true ? "true" : undefined}
                  data-drop-target={isTabDropTarget === true ? "true" : undefined}
                  draggable={tabItem.isShiftable !== false}
                  onDragStart={(event) => handleDragStart(event, tabItem.id)}
                  onDragOver={(event) => handleDragOver(event, tabItem.id)}
                  onDragLeave={() => handleDragLeave(tabItem.id)}
                  onDrop={(event) => handleDrop(event, tabItem.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => setActiveTab(tabItem.id)}
                >
                  {renderTabIcon(tabItem)}

                  <Tooltip
                    label={tooltipLabel}
                    openDelay={500}
                    withArrow
                    withinPortal
                  >
                    <Text size="sm" className={style.label}>
                      {tabItem.header.title || "Tab"}
                    </Text>
                  </Tooltip>

                  {tabItem.isClosable !== false && (
                    <CloseButton
                      size="xs"
                      aria-label="Close tab"
                      className={style.closeButton}
                      onClick={(event) =>
                      {
                        event.stopPropagation();
                        removeTab(tabItem.id);
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
        <ActionIcon
          variant="subtle"
          size="sm"
          className={style.shiftButton}
          onClick={() => handleScroll("right")}
        >
          <IconChevronRight size={16}/>
        </ActionIcon>
      </div>
      <div className={style.contentArea}>
        {selectedTab && <DeskTabContent tab={selectedTab}/>}
      </div>
    </StackableScreen>
  );
}
