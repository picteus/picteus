import React, { forwardRef, ReactNode, useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react";
import {
  ActionIcon,
  Box,
  Button,
  ComboboxItem,
  ComboboxLikeRenderOptionInput,
  Flex,
  Group,
  HoverCard,
  Input,
  Menu,
  Pill,
  ScrollArea,
  Stack,
  Tabs,
  Text,
  Tooltip
} from "@mantine/core";
import {
  IconAdjustmentsHorizontal,
  IconArrowsHorizontal,
  IconArrowsVertical,
  IconBulb,
  IconCalendarPlus,
  IconCalendarTime,
  IconChevronDown,
  IconFilter,
  IconLetterCase,
  IconListDetails,
  IconSearch,
  IconSortAscending,
  IconSortDescending,
  IconTags,
  IconWeight,
  IconX
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import {
  ExtensionImageTag,
  Repository,
  SearchFeatures,
  SearchFilter,
  SearchProperties,
  SearchSortingProperty
} from "@picteus/ws-client";

import { FilterOrCollectionId, LocalFiltersType } from "types";
import { NotificationsService } from "utils";
import { useDebouncedCallback, useInterceptedState } from "app/hooks";
import { FiltersService, RepositoriesService } from "app/services";

import { Common, ExtensionIcon, ImageTag } from "app/components";
import { FeaturesQueryBuilder, GeneralFilters, PropertiesFilters } from "./components";
import { FilterSelect } from "../../components";
import { WithValueAndLabel } from "../../../../services/FiltersService.ts";

import style from "./FiltersBar.module.scss";


export interface FiltersBarRef
{
  setFilter: (filter: SearchFilter) => void;
}

type FiltersBarType = {
  initialFilterOrCollectionId: FilterOrCollectionId;
  onFilterOrCollectionId: (filterOrCollectionId: FilterOrCollectionId) => void;
  onClearAll: () => void;
  children?: React.ReactNode;
};

const edge = 16;
const SORT_ICONS: Record<string, React.ReactNode> = {
  [SearchSortingProperty.Name]: <IconLetterCase size={edge}/>,
  [SearchSortingProperty.CreationDate]: <IconCalendarPlus size={edge}/>,
  [SearchSortingProperty.ModificationDate]: <IconCalendarTime size={edge}/>,
  [SearchSortingProperty.ImportDate]: <IconCalendarPlus size={edge}/>,
  [SearchSortingProperty.UpdateDate]: <IconCalendarTime size={edge}/>,
  [SearchSortingProperty.BinarySize]: <IconWeight size={edge}/>,
  [SearchSortingProperty.Width]: <IconArrowsHorizontal size={edge}/>,
  [SearchSortingProperty.Height]: <IconArrowsVertical size={edge}/>
};

export const FiltersBar = forwardRef<FiltersBarRef, FiltersBarType>(({
  initialFilterOrCollectionId,
  onFilterOrCollectionId,
  onClearAll,
  children
}, ref) =>
{
  const [t] = useTranslation();
  const [searchText, setSearchText] = useState<string>();
  const repositories = useMemo<Repository[]>(() => (RepositoriesService.list()), []);
  const [filters, setFilters] = useInterceptedState<LocalFiltersType>("filter" in initialFilterOrCollectionId ? FiltersService.searchFilterToLocalFilters(initialFilterOrCollectionId.filter) : undefined);
  const [tags, setTags] = useState<ExtensionImageTag[]>([]);
  const [tagOptions, setTagOptions] = useState<WithValueAndLabel[]>([]);
  const [sortingMenuOpened, setSortingMenuOpened] = useState<boolean>(false);

  useEffect(() =>
  {
    async function load()
    {
      const tags = await FiltersService.computeTagsOptions();
      setTags(tags);
      setTagOptions(tags.map(tag => ({ value: tag.value, label: tag.value })));
    }

    load().catch(NotificationsService.apiCallError);
  }, []);

  useImperativeHandle(ref, () => ({
    setFilter: (filter: SearchFilter) =>
    {
      setFilters(FiltersService.searchFilterToLocalFilters(filter));
    }
  }));

  useEffect(() =>
  {
    setSearchText(filters?.keyword ?? "");
    const updatedSearchFilter = filters === undefined ? undefined : FiltersService.localFiltersToSearchFilter(filters);
    if (updatedSearchFilter !== undefined)
    {
      onFilterOrCollectionId({ filter: updatedSearchFilter });
    }
  }, [filters, onFilterOrCollectionId]);

  const onChangeFilterWrapper = useCallback((key: string, value?: string[] | SearchProperties | SearchFeatures | SearchSortingProperty | ("-1" | "1")) =>
  {
    setFilters((previousLocalFilters: LocalFiltersType) =>
    {
      const updatedLocalFilters = { ...previousLocalFilters, [key]: value };
      if (key === "searchIn" && value === undefined)
      {
        delete updatedLocalFilters.keyword;
      }
      else if (Array.isArray(value) === true && value.length === 0)
      {
        delete updatedLocalFilters[key];
      }
      return updatedLocalFilters;
    });
  }, [setFilters]);

  const debouncedSearchCallback = useDebouncedCallback(async (searchText: string) =>
  {
    setFilters(previousValue => ({
      ...previousValue,
      keyword: searchText,
      searchIn: previousValue.searchIn ?? ((searchText === undefined || searchText === "") ? undefined : ["inName", "inMetadata", "inFeatures"])
    }));
  }, 400);

  useEffect(() =>
  {
    if (searchText !== undefined)
    {
      debouncedSearchCallback(searchText);
    }
  }, [searchText]);

  function handleOnClearAll()
  {
    setFilters(FiltersService.searchFilterToLocalFilters(FiltersService.defaultFilter));
    setSearchText("");
    onClearAll();
  }

  function renderActiveFiltersPills()
  {
    if (!filters)
    {
      return null;
    }
    const pills: ReactNode[] = [];

    if (filters.searchIn?.length > 0)
    {
      pills.push(
        <Pill key="searchIn" withRemoveButton onRemove={() => onChangeFilterWrapper("searchIn")}>
          {`In: ${filters.searchIn.map(field => FiltersService.searchInOptions.find(option => option.value === field)?.label).join(", ")}`}
        </Pill>
      );
    }
    if (filters.repositories?.length > 0)
    {
      pills.push(
        <Pill key="repositories" withRemoveButton onRemove={() => onChangeFilterWrapper("repositories")}>
          {`${t("field.repositories")}: ${repositories.filter((repository) => filters.repositories?.includes(repository.id)).map((repository) => repository.name).join(", ")}`}
        </Pill>
      );
    }
    if (filters.formats?.length > 0)
    {
      pills.push(
        <Pill key="formats" withRemoveButton onRemove={() => onChangeFilterWrapper("formats")}>
          {`${t("field.formats")}: ${[...filters.formats].join(", ")}`}
        </Pill>
      );
    }
    if (filters.tags?.length > 0)
    {
      pills.push(
        <Pill key="tags" withRemoveButton onRemove={() => onChangeFilterWrapper("tags")}>
          <Group gap={4} wrap="nowrap">
            <span>{t("field.tags")}:</span>
            {filters.tags?.map(tag =>
            {
              const extensionTag = tags.find(anExtensionTag => anExtensionTag.value === tag);
              return (extensionTag && <ImageTag key={tag} tag={extensionTag} kind="plain"/>
              );
            })}
          </Group>
        </Pill>
      );
    }
    if (filters.properties && Object.keys(filters.properties).length > 0)
    {
      pills.push(
        <Pill key="properties" withRemoveButton onRemove={() => onChangeFilterWrapper("properties")}>
          {t("field.properties")} ({Object.keys(filters.properties).length})
        </Pill>
      );
    }
    if (filters.features && filters.features.conditions && filters.features.conditions.length > 0)
    {
      pills.push(
        <Pill key="features" withRemoveButton onRemove={() => onChangeFilterWrapper("features")}>
          {t("field.features")} ({filters.features.conditions.length})
        </Pill>
      );
    }

    return pills;
  }

  const toggleSortOrder = () =>
  {
    onChangeFilterWrapper("sortOrder", filters?.sortOrder === "1" ? "-1" : "1");
  };

  const renderTagOption = ({ option }: ComboboxLikeRenderOptionInput<ComboboxItem>) =>
  {
    const extensionTag = tags.find(tag => tag.value === option.value);
    return (
      <Group gap="sm">
        {extensionTag && <ExtensionIcon idOrExtension={extensionTag.id} size="sm"/>}
        <span>{option.label}</span>
      </Group>
    );
  };

  const width = 600;
  return (
    <Flex gap={10} align="flex-end">
      <HoverCard
        width={width}
        position="bottom-end"
        withArrow
        shadow="xl"
        closeDelay={Common.HoverCloseDelayInMilliseconds}
      >
        <HoverCard.Target>
          <Box w={width}>
            <Input
              component="div"
              multiline
              pointer
              radius="md"
              rightSectionPointerEvents="all"
              rightSectionWidth={64}
              classNames={{ input: style.container }}
              rightSection={
                <Flex gap={4} wrap="nowrap" align="center">
                  {searchText || filters ? (
                    <ActionIcon size="sm" variant="transparent" c="dimmed"
                                onClick={handleOnClearAll}>
                      <IconX stroke={1.5} size={edge}/>
                    </ActionIcon>
                  ) : null}
                  <Tooltip label={t("filters.title")}>
                    <ActionIcon size="md" variant="light">
                      <IconFilter stroke={1.5} size={18}/>
                    </ActionIcon>
                  </Tooltip>
                </Flex>
              }
            >
              <Flex wrap="wrap" gap={6} align="center" className={style.wrapper}>
                <IconSearch stroke={1.5} size={edge} color="gray"/>
                {renderActiveFiltersPills()}
                <input
                  placeholder={renderActiveFiltersPills()?.length ? "" : t("field.search")}
                  value={searchText || ""}
                  onChange={(event) => setSearchText(event.target.value)}
                  className={style.input}
                />
              </Flex>
            </Input>
          </Box>
        </HoverCard.Target>
        <HoverCard.Dropdown p={0}>
          <Tabs defaultValue="general">
            <Group justify="space-between" align="center" pr="sm">
              <Tabs.List flex={1}>
                <Tabs.Tab
                  value="general"
                  leftSection={<IconAdjustmentsHorizontal size={edge}
                                                          color="var(--mantine-color-blue-filled)"/>}
                >
                  {t("field.essentials")}
                </Tabs.Tab>
                <Tabs.Tab
                  value="tags"
                  leftSection={<IconTags size={edge} color="var(--mantine-color-orange-filled)"/>}
                >
                  {t("field.tags")}
                </Tabs.Tab>
                <Tabs.Tab
                  value="features"
                  leftSection={<IconBulb size={edge} color="var(--mantine-color-violet-filled)"/>}
                >
                  {t("field.features")}
                </Tabs.Tab>
                <Tabs.Tab
                  value="properties"
                  leftSection={<IconListDetails size={edge}
                                                color="var(--mantine-color-green-filled)"/>}
                >
                  {t("field.properties")}
                </Tabs.Tab>
              </Tabs.List>
            </Group>
            <ScrollArea h={500}>
              <Tabs.Panel value="general" p="md">
                {filters && (
                  <GeneralFilters
                    repositories={repositories}
                    filters={filters}
                    onChangeFilter={onChangeFilterWrapper}
                  />
                )}
              </Tabs.Panel>
              <Tabs.Panel value="tags" p="md">
                <Stack gap="xs">
                  <FilterSelect
                    selectedValues={filters?.tags || []}
                    options={tagOptions}
                    renderOption={renderTagOption}
                    renderPill={({ option, onRemove }) =>
                    {
                      const extensionTag = tags.find(anExtensionTag => anExtensionTag.value === option.value);
                      return (<Pill withRemoveButton onRemove={onRemove}>
                        <ImageTag tag={extensionTag} kind="plain"/>
                      </Pill>);
                    }}
                    onChange={(values: string[]) => onChangeFilterWrapper("tags", values)}
                  />
                </Stack>
              </Tabs.Panel>
              <Tabs.Panel value="features" p="md">
                <FeaturesQueryBuilder
                  searchFeatures={filters?.features}
                  onChange={(features) => onChangeFilterWrapper("features", features)}
                />
              </Tabs.Panel>
              <Tabs.Panel value="properties" p="md">
                <PropertiesFilters
                  properties={filters?.properties}
                  onChange={(props) => onChangeFilterWrapper("properties", props)}
                />
              </Tabs.Panel>
            </ScrollArea>
          </Tabs>
        </HoverCard.Dropdown>
      </HoverCard>
      <Button.Group>
        <Menu shadow="md" width={160} position="bottom" trigger="click-hover" opened={sortingMenuOpened}
              onChange={setSortingMenuOpened}>
          <Menu.Target>
            <Button variant="default" w={160}
                    leftSection={filters?.sortBy ? SORT_ICONS[filters.sortBy] : null}
                    rightSection={<IconChevronDown size={14}/>}>
              {FiltersService.sortByOptions.find(option => option.value === filters?.sortBy)?.label}
            </Button>
          </Menu.Target>
          <Menu.Dropdown style={{ maxHeight: "75%", overflowY: "auto" }}>
            {FiltersService.sortByOptions.map((option) => (
              <Menu.Item key={option.value}
                         leftSection={filters?.sortBy ? SORT_ICONS[option.value] : null}
                         onClick={() => onChangeFilterWrapper("sortBy", option.value)}>
                <Text size="sm">{option.label}</Text>
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
        <Tooltip label={filters?.sortOrder === "1" ? t("sort.asc") : t("sort.desc")}>
          <Button variant="default" px="xs" onClick={toggleSortOrder}>
            {filters?.sortOrder === "1" ? <IconSortAscending size={16}/> : <IconSortDescending size={16}/>}
          </Button>
        </Tooltip>
      </Button.Group>
      {children}
    </Flex>
  );
});
FiltersBar.displayName = "FiltersBar";
