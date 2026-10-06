import React, { ReactElement, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  CloseButton,
  Divider,
  Group,
  NavLink,
  Popover,
  ScrollArea,
  Text,
  TextInput
} from "@mantine/core";
import {
  IconChevronDown,
  IconCode,
  IconFileText,
  IconPhoto,
  IconSearch,
  IconStack2,
  IconWorld
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { DeskTabType } from "types";
import { Common, ExtensionIcon, FormatedDate, ResourceIcon } from "app/components";


export interface DeskTabsMenuPropsType
{

  tabs: DeskTabType[];
  activeTabId: string | null;
  onSelectTab: (tabIdentifier: string) => void;
  onCloseTab: (tabIdentifier: string) => void;

}

function renderDeskTabIcon(tab: DeskTabType): ReactElement
{
  if (tab.extensionId)
  {
    return <ExtensionIcon idOrExtension={tab.extensionId} size="sm"/>;
  }

  if (tab.header?.icon)
  {
    return <ResourceIcon icon={tab.header.icon} isCompact={false}/>;
  }

  if (tab.content.kind === "image" || tab.content.kind === "images")
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

  return searchableValues.some((searchableValue) =>
  {
    return searchableValue.toLowerCase().includes(normalizedCriterion);
  });
}

function findNewestTabId(availableTabs: DeskTabType[]): string | undefined
{
  if (availableTabs.length === 0)
  {
    return undefined;
  }

  return availableTabs.reduce((mostRecentTab, currentTab) =>
  {
    return currentTab.timestampInMilliseconds >= mostRecentTab.timestampInMilliseconds ? currentTab : mostRecentTab;
  }, availableTabs[0]).id;
}

export default function DeskTabsMenu({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab
}: DeskTabsMenuPropsType): ReactElement
{
  const [ t ] = useTranslation();
  const [ isOpened, setIsOpened ] = useState<boolean>(false);
  const [ searchCriterion, setSearchCriterion ] = useState<string>("");

  const newestTabId = useMemo(() =>
  {
    return findNewestTabId(tabs);
  }, [ tabs ]);

  const filteredTabs = useMemo(() =>
  {
    return tabs
      .filter((tabItem) =>
      {
        return matchesTabSearch(tabItem, searchCriterion);
      })
      .sort((firstTab, secondTab) =>
      {
        return secondTab.timestampInMilliseconds - firstTab.timestampInMilliseconds;
      });
  }, [ tabs, searchCriterion ]);

  function handleOpenChange(nextOpened: boolean): void
  {
    setIsOpened(nextOpened);
    if (nextOpened === false)
    {
      setSearchCriterion("");
    }
  }

  function handleSelect(tabIdentifier: string): void
  {
    onSelectTab(tabIdentifier);
    setIsOpened(false);
    setSearchCriterion("");
  }

  function handleClose(event: React.MouseEvent, tabIdentifier: string): void
  {
    event.stopPropagation();
    onCloseTab(tabIdentifier);
  }

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
        w={360}
        maw="calc(100vw - 32px)"
      >
        <Box p="xs">
          <TextInput
            placeholder={t("deskTabsMenu.searchPlaceholder", "Search open tabs")}
            value={searchCriterion}
            onChange={(event) =>
            {
              setSearchCriterion(event.currentTarget.value);
            }}
            leftSection={<IconSearch size={14} stroke={1.5}/>}
            rightSection={
              searchCriterion.length > 0 ? (
                <CloseButton
                  size="xs"
                  onClick={() =>
                  {
                    setSearchCriterion("");
                  }}
                />
              ) : undefined
            }
            size="xs"
            variant="filled"
            autoFocus
          />
        </Box>

        <Divider/>

        <ScrollArea.Autosize
          mah="calc(75vh - 85px)"
          scrollbars="y"
          type="hover"
        >
          {filteredTabs.length === 0 ? (
            <Text size="xs" c="dimmed" ta="center" py="lg" px="md">
              {t("deskTabsMenu.noTabsFound", "No matching tabs found")}
            </Text>
          ) : (
            filteredTabs.map((tabItem) =>
            {
              const isTabActive = tabItem.id === activeTabId;
              const isNewestTab = tabItem.id === newestTabId;
              const tabTitle = tabItem.header?.title || tabItem.label;

              return (
                <NavLink
                  key={tabItem.id}
                  component="button"
                  active={isTabActive}
                  variant="light"
                  color="blue"
                  w="100%"
                  noWrap
                  leftSection={renderDeskTabIcon(tabItem)}
                  label={
                    <Group gap="xs" wrap="nowrap" miw={0} w="100%">
                      <Text
                        size="xs"
                        fw={isTabActive ? 600 : 500}
                        truncate
                        title={tabTitle}
                        flex={1}
                        miw={0}
                      >
                        {tabTitle}
                      </Text>
                      {isNewestTab === true && (
                        <Badge size="xs" variant="light" color="blue" flex="none">
                          {t("deskTabsMenu.newBadge", "New")}
                        </Badge>
                      )}
                    </Group>
                  }
                  description={
                    <Text size="xs" c="dimmed" truncate miw={0}>
                      {Boolean(tabItem.header?.subtitle && tabItem.header.subtitle.trim().length > 0) && (
                        <span>{tabItem.header.subtitle.trim()} · </span>
                      )}
                      <FormatedDate timestamp={tabItem.timestampInMilliseconds}/>
                    </Text>
                  }
                  rightSection={
                    tabItem.isClosable !== false ? (
                      <CloseButton
                        size="xs"
                        onClick={(event) =>
                        {
                          handleClose(event, tabItem.id);
                        }}
                      />
                    ) : undefined
                  }
                  onClick={() =>
                  {
                    handleSelect(tabItem.id);
                  }}
                />
              );
            })
          )}
        </ScrollArea.Autosize>
      </Popover.Dropdown>
    </Popover>
  );
}
