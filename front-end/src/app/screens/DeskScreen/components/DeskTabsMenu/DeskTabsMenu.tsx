import React, { ReactElement, useEffect, useMemo, useRef, useState } from "react";
import {
  Badge,
  Box,
  Button,
  CloseButton,
  Divider,
  Group,
  Kbd,
  NavLink,
  Popover,
  ScrollArea,
  Stack,
  Text,
  TextInput
} from "@mantine/core";
import { IconChevronDown, IconSearch } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { DeskTabType } from "types";
import { ShortcutBadge } from "app/components";
import { DeskTabIcon, TabSubtitle } from "../index";

import classes from "./DeskTabsMenu.module.scss";


function matchesTabSearch(tab: DeskTabType, searchCriterion: string): boolean
{
  const normalizedCriterion = searchCriterion.trim().toLowerCase();
  if (normalizedCriterion.length === 0)
  {
    return true;
  }

  const searchableValues: string[] = [
    tab.label,
    tab.header?.title ?? "",
    tab.header?.subtitle ?? "",
    tab.header?.description ?? "",
    tab.header?.details ?? ""
  ];

  return searchableValues.some(searchableValue =>
  {
    return searchableValue.toLowerCase().includes(normalizedCriterion);
  });
}

export interface DeskTabsMenuPropsType
{

  tabs: DeskTabType[];
  activeTabId: string | null;
  isOpened: boolean;
  onOpenedChange: (isOpened: boolean) => void;
  onSelectTab: (tabIdentifier: string) => void;
  onCloseTab: (tabIdentifier: string) => void;

}

export default function DeskTabsMenu({
  tabs,
  activeTabId,
  isOpened,
  onOpenedChange,
  onSelectTab,
  onCloseTab
}: DeskTabsMenuPropsType): ReactElement
{
  const [ t ] = useTranslation();
  const [ searchCriterion, setSearchCriterion ] = useState<string>("");
  const [ highlightedIndex, setHighlightedIndex ] = useState<number>(0);
  const tabElementsReference = useRef<Map<string, HTMLDivElement>>(new Map());
  const viewportReference = useRef<HTMLDivElement>(null);

  const filteredTabs = useMemo(() =>
  {
    return tabs
      .filter(tabItem =>
      {
        return matchesTabSearch(tabItem, searchCriterion);
      })
      .sort((firstTab, secondTab) =>
      {
        return secondTab.timestampInMilliseconds - firstTab.timestampInMilliseconds;
      });
  }, [ tabs, searchCriterion ]);

  const safeHighlightedIndex = filteredTabs.length > 0
    ? Math.max(0, Math.min(highlightedIndex, filteredTabs.length - 1))
    : 0;

  useEffect(() =>
  {
    if (isOpened === true)
    {
      const initialIndex = filteredTabs.findIndex(tabItem => tabItem.id === activeTabId);
      setHighlightedIndex(initialIndex >= 0 ? initialIndex : 0);
    }
  }, [ isOpened ]);

  useEffect(() =>
  {
    setHighlightedIndex(0);
  }, [ searchCriterion ]);

  useEffect(() =>
  {
    if (isOpened === false || filteredTabs.length === 0)
    {
      return;
    }
    const highlightedTab = filteredTabs[safeHighlightedIndex];
    if (highlightedTab)
    {
      const element = tabElementsReference.current.get(highlightedTab.id);
      const viewport = viewportReference.current;
      if (element && viewport)
      {
        const elementTop = element.offsetTop;
        const elementBottom = elementTop + element.offsetHeight;
        const viewportTop = viewport.scrollTop;
        const viewportBottom = viewportTop + viewport.clientHeight;

        if (elementTop < viewportTop)
        {
          viewport.scrollTop = elementTop;
        }
        else if (elementBottom > viewportBottom)
        {
          viewport.scrollTop = elementBottom - viewport.clientHeight;
        }
      }
    }
  }, [ safeHighlightedIndex, filteredTabs, isOpened ]);

  function handleOpenChange(nextOpened: boolean): void
  {
    onOpenedChange(nextOpened);
    if (nextOpened === false)
    {
      setSearchCriterion("");
    }
  }

  function handleSelect(tabIdentifier: string): void
  {
    onSelectTab(tabIdentifier);
    onOpenedChange(false);
    setSearchCriterion("");
  }

  function handleClose(event: React.MouseEvent, tabIdentifier: string): void
  {
    event.stopPropagation();
    onCloseTab(tabIdentifier);
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>): void
  {
    if (filteredTabs.length === 0)
    {
      return;
    }

    if (event.key === "ArrowDown")
    {
      event.preventDefault();
      setHighlightedIndex(previousIndex => (previousIndex + 1) % filteredTabs.length);
    }
    else if (event.key === "ArrowUp")
    {
      event.preventDefault();
      setHighlightedIndex(previousIndex => (previousIndex - 1 + filteredTabs.length) % filteredTabs.length);
    }
    else if (event.key === "Enter")
    {
      event.preventDefault();
      const targetTab = filteredTabs[safeHighlightedIndex];
      if (targetTab)
      {
        handleSelect(targetTab.id);
      }
    }
  }

  const isSearching = searchCriterion.length > 0;
  const trimmedSearchCriterion = searchCriterion.trim();
  const hasSearchCriterion = trimmedSearchCriterion.length > 0;
  const tabCountLabel = isSearching === true ? t("deskTabsMenu.filteredTabCount", {
    filteredCount: filteredTabs.length,
    totalCount: tabs.length
  }) : tabs.length === 1 ? t("deskTabsMenu.tabCountSingle") : t("deskTabsMenu.tabCount", { count: tabs.length });

  return (
    <Popover
      opened={isOpened}
      onChange={handleOpenChange}
      position="bottom-end"
      radius="md"
      shadow="md"
      withinPortal
      trapFocus
    >
      <Popover.Target>
        <Button
          variant="default"
          size="xs"
          radius="sm"
          rightSection={<IconChevronDown size={14} stroke={1.5}/>}
          onClick={() =>
          {
            handleOpenChange(!isOpened);
          }}
        >
          {t("deskTabsMenu.allTabs", "All tabs")} · {tabs.length}
        </Button>
      </Popover.Target>

      <Popover.Dropdown
        p={0}
        w={460}
        maw="calc(100vw - 32px)"
      >
        <Box p="xs">
          <TextInput
            placeholder={t("deskTabsMenu.searchPlaceholder", "Search open tabs")}
            value={searchCriterion}
            onChange={event =>
            {
              setSearchCriterion(event.currentTarget.value);
            }}
            onKeyDown={handleInputKeyDown}
            leftSection={<IconSearch size={14} stroke={1.5}/>}
            rightSection={
              isSearching ? (
                <CloseButton
                  size="xs"
                  onClick={() =>
                  {
                    setSearchCriterion("");
                  }}
                />
              ) : (
                <ShortcutBadge combo="mod + d" size="xs"/>
              )
            }
            rightSectionWidth={isSearching ? undefined : 70}
            rightSectionPointerEvents={isSearching ? "all" : "none"}
            size="xs"
            variant="filled"
            autoFocus
          />
        </Box>

        <Divider/>

        <Box mah="calc(90vh - 85px)" display="flex">
          <ScrollArea scrollbars="y" type="hover" flex={1} viewportRef={viewportReference}>
            {filteredTabs.length === 0 ? (
              hasSearchCriterion === true ? (
                <Stack align="center" justify="center" gap={4} py={32} px="md">
                  <Text size="sm" fw={500} ta="center" className={classes.emptyStateTitle}>
                    {t("deskTabsMenu.noTabMatches", { criterion: trimmedSearchCriterion })}
                  </Text>
                  <Text size="sm" c="dimmed" ta="center">
                    {t("deskTabsMenu.searchDescription")}
                  </Text>
                </Stack>
              ) : (
                <Text size="xs" c="dimmed" ta="center" py="lg" px="md">
                  {t("deskTabsMenu.noTabsFound")}
                </Text>
              )
            ) : (
              filteredTabs.map((tab, index) =>
              {
                const isTabActive = tab.id === activeTabId;
                const isHighlighted = index === safeHighlightedIndex;
                const tabTitle = tab.label;

                return (
                  <NavLink
                    key={tab.id}
                    ref={element =>
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
                    component="div"
                    active={isHighlighted}
                    variant="light"
                    color="gray"
                    w="100%"
                    noWrap
                    tabIndex={-1}
                    className={classes.navLink}
                    onMouseMove={() =>
                    {
                      if (highlightedIndex !== index)
                      {
                        setHighlightedIndex(index);
                      }
                    }}
                    leftSection={<DeskTabIcon tab={tab} location="menu"/>}
                    label={
                      <Group gap="xs" wrap="nowrap" miw={0} w="100%">
                        <Text
                          size="sm"
                          fw={500}
                          truncate
                          title={tabTitle}
                          flex={1}
                          miw={0}
                        >
                          {tabTitle}
                        </Text>
                        {isTabActive === true && (
                          <Badge
                            size="xs"
                            variant="white"
                            color="gray"
                            flex="none"
                          >
                            {t("deskTabsMenu.current")}
                          </Badge>
                        )}
                      </Group>
                    }
                    description={<TabSubtitle tab={tab} location="menu"/>}
                    rightSection={
                      (isHighlighted === true || tab.isClosable !== false) ? (
                        <div className={classes.rightSection}>
                          {isHighlighted === true && (
                            <Kbd size="xs" className={classes.enterHint}>↵</Kbd>
                          )}
                          {tab.isClosable !== false && (
                            <CloseButton
                              size="xs"
                              className={classes.closeButton}
                              onClick={event =>
                              {
                                handleClose(event, tab.id);
                              }}
                            />
                          )}
                        </div>
                      ) : undefined
                    }
                    onClick={() =>
                    {
                      handleSelect(tab.id);
                    }}
                  />
                );
              })
            )}
          </ScrollArea>
        </Box>

        <Divider/>

        <Group justify="space-between" px="sm" py={8} wrap="nowrap">
          <Text size="xs" c="dimmed">
            {tabCountLabel}
          </Text>
          <Group gap="md" wrap="nowrap" align="center">
            <Group gap={4} wrap="nowrap" align="center">
              <Kbd size="xs">↑</Kbd>
              <Kbd size="xs">↓</Kbd>
              <Text size="xs" c="dimmed">
                {t("deskTabsMenu.navigate")}
              </Text>
            </Group>
            <Group gap={4} wrap="nowrap" align="center">
              <Kbd size="xs">↵</Kbd>
              <Text size="xs" c="dimmed">
                {t("deskTabsMenu.open")}
              </Text>
            </Group>
          </Group>
        </Group>
      </Popover.Dropdown>
    </Popover>
  );
}
