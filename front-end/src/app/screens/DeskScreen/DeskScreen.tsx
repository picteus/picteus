import { DragEvent, ReactElement, ReactNode, useRef, useState } from "react";
import {
  ActionIcon,
  Box,
  Center,
  CloseButton,
  Collapse,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Title,
  Tooltip
} from "@mantine/core";
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconCode,
  IconFileText,
  IconPhoto,
  IconStack2,
  IconWorld
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { DeskTabType } from "types";
import { useDeskTabsContext } from "app/context";
import {
  Common,
  EmptyResults,
  ExtensionBadge,
  ExtensionIcon,
  Markdown,
  ResourceIcon,
  StackableScreen
} from "app/components";
import DeskTabContent from "./components/DeskTabContent.tsx";

import style from "./DeskScreen.module.scss";


export default function DeskScreen(): ReactElement
{
  const [ t ] = useTranslation();
  const { tabs, activeTab, setActiveTab, removeTab, reorderTabs } = useDeskTabsContext();

  const [ isHeaderExpanded, setIsHeaderExpanded ] = useState<boolean>(true);
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

    if (tabItem.header.icon)
    {
      return <ResourceIcon icon={tabItem.header.icon} isCompact={false}/>;
    }

    if (tabItem.content.kind === "images")
    {
      return <IconPhoto size={Common.IconSmallSize} stroke={1.5}/>;
    }
    if (tabItem.content.kind === "url")
    {
      return <IconWorld size={Common.IconSmallSize} stroke={1.5}/>;
    }
    if (tabItem.content.kind === "html")
    {
      return <IconCode size={Common.IconSmallSize} stroke={1.5}/>;
    }
    if (tabItem.content.kind === "markdown")
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

  const selectedTab = tabs.find((tabItem) => tabItem.id === activeTab) ?? tabs[0];
  const hasTitle = Boolean(selectedTab?.header?.title);
  const hasDescription = Boolean(selectedTab?.header?.description);
  const hasDetails = Boolean(selectedTab?.header?.details);
  const hasHeader = hasTitle === true || hasDescription === true || hasDetails === true;
  const isCollapsible = hasDescription === true || hasDetails === true;

  return (
    <StackableScreen resetTrigger={activeTab} className={style.container}>
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
            {tabs.map((tabItem) =>
            {
              const isTabActive = tabItem.id === activeTab;
              const isTabDragging = tabItem.id === draggedTabId;
              const isTabDropTarget = tabItem.id === dropTargetTabId;

              const tooltipLabel = tabItem.header.description
                ? `${tabItem.header.title} — ${tabItem.header.description}`
                : tabItem.header.title;

              return (
                <Group
                  key={tabItem.id}
                  gap="xs"
                  px={10}
                  h={36}
                  wrap="nowrap"
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
                    withinPortal
                  >
                    <Text size="sm" maw={140} truncate>
                      {tabItem.header.title || "Tab"}
                    </Text>
                  </Tooltip>

                  {tabItem.isClosable !== false && (
                    <CloseButton
                      size="xs"
                      className={style.closeButton}
                      onClick={(event) =>
                      {
                        event.stopPropagation();
                        removeTab(tabItem.id);
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
            {hasHeader === true && (
              <Box
                p="xs"
                px="md"
                bg="var(--mantine-color-body)"
                className={style.tabHeader}
              >
                <Group justify="space-between" align="center" gap="md" wrap="nowrap">
                  <Group gap="xs" align="center" wrap="nowrap" style={{ minWidth: 0 }}>
                    <Title order={1} lineClamp={1}>
                      {selectedTab.header.title}
                    </Title>
                    {selectedTab.extensionId && (
                      <ExtensionBadge idOrExtension={selectedTab.extensionId} size="lg" color="gray"/>)}
                  </Group>

                  {isCollapsible === true && (
                    <ActionIcon
                      variant="subtle"
                      size="sm"
                      onClick={() =>
                      {
                        setIsHeaderExpanded((previousState) => !previousState);
                      }}
                    >
                      {isHeaderExpanded === true ? <IconChevronUp size={Common.IconSmallSize}/> :
                        <IconChevronDown size={Common.IconSmallSize}/>}
                    </ActionIcon>
                  )}
                </Group>

                {isCollapsible === true && (
                  <Collapse expanded={isHeaderExpanded === true}>
                    <Stack gap="xs" pt="md">
                      {hasDescription === true && (
                        <Text size="sm" c="dimmed" lh={1.4}>
                          {selectedTab.header.description}
                        </Text>
                      )}

                      {hasDetails === true && selectedTab.header.details && (
                        <Paper
                          p="xs"
                          px="sm"
                          withBorder
                          radius="sm"
                          bg="var(--mantine-color-default)"
                          fz="xs"
                        >
                          <ScrollArea.Autosize mah={160}>
                            <Markdown content={selectedTab.header.details} size="xs"/>
                          </ScrollArea.Autosize>
                        </Paper>
                      )}
                    </Stack>
                  </Collapse>
                )}
              </Box>
            )}
            <Box flex={1} pos="relative" style={{ overflow: "hidden" }}>
              <DeskTabContent tab={selectedTab}/>
            </Box>
          </Stack>
        )}
      </Box>
    </StackableScreen>
  );
}
