import React, { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  ActionIcon,
  Box,
  ComboboxItem,
  ComboboxLikeRenderOptionInput,
  Flex,
  Group,
  HoverCard,
  Input,
  Pill,
  ScrollArea,
  Stack,
  Tabs,
  Tooltip
} from "@mantine/core";
import {
  IconAdjustmentsHorizontal,
  IconBulb,
  IconFilter,
  IconListDetails,
  IconSearch,
  IconTags,
  IconX
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { ExtensionImageTag, Repository } from "@picteus/ws-client";

import { LocalFiltersType } from "types";
import { ToastService } from "utils";
import { useContainerDimensions, useDebouncedCallback } from "app/hooks";
import { FiltersService, RepositoriesService, WithValueAndLabel } from "app/services";

import { Common, ExtensionIcon, ImageTag } from "app/components";
import { FeaturesQueryBuilder, GeneralFilters, PropertiesFilters } from "../../components";
import { FilterSelect } from "..";

import style from "./SearchFilters.module.scss";


type SearchFiltersType = {
  filters?: LocalFiltersType;
  setFilters: React.Dispatch<React.SetStateAction<LocalFiltersType | undefined>>;
  onFilterChange: (key: string, value?: any) => void;
  onClearAll: () => void;
};

export function SearchFilters({
  filters,
  setFilters,
  onFilterChange,
  onClearAll
}: SearchFiltersType)
{
  const [ t ] = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const { width } = useContainerDimensions(containerRef);
  const [ searchText, setSearchText ] = useState<string>();
  const repositories = useMemo<Repository[]>(() => (RepositoriesService.list()), []);
  const [ tags, setTags ] = useState<ExtensionImageTag[]>([]);
  const [ tagOptions, setTagOptions ] = useState<WithValueAndLabel[]>([]);

  useEffect(() =>
  {
    return FiltersService.subscribeToTagsOptions((tags) =>
    {
      setTags(tags);
      const uniqueValues = new Set<string>();
      const options: WithValueAndLabel[] = [];
      for (const tag of tags)
      {
        if (uniqueValues.has(tag.value) === false)
        {
          uniqueValues.add(tag.value);
          options.push({ value: tag.value, label: tag.value });
        }
      }
      setTagOptions(options);
    }, ToastService.apiCallError);
  }, []);

  useEffect(() =>
  {
    setSearchText(filters?.keyword ?? "");
  }, [ filters ]);

  const debouncedSearchCallback = useDebouncedCallback(async (searchText: string) =>
  {
    setFilters((previousValue: LocalFiltersType | undefined) => ({
      ...previousValue,
      keyword: searchText,
      searchIn: previousValue?.searchIn ?? ((searchText === undefined || searchText === "") ? undefined : [ "inName", "inMetadata", "inFeatures" ])
    }));
  }, 400);

  useEffect(() =>
  {
    if (searchText !== undefined)
    {
      debouncedSearchCallback(searchText);
    }
  }, [ searchText ]);

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
        <Pill key="searchIn" withRemoveButton onRemove={() => onFilterChange("searchIn")}>
          {`In: ${filters.searchIn.map(field => FiltersService.searchInOptions.find(option => option.value === field)?.label).join(", ")}`}
        </Pill>
      );
    }
    if (filters.repositories?.length > 0)
    {
      pills.push(
        <Pill key="repositories" withRemoveButton onRemove={() => onFilterChange("repositories")}>
          {`${t("field.repositories")}: ${repositories.filter((repository) => filters.repositories?.includes(repository.id)).map((repository) => repository.name).join(", ")}`}
        </Pill>
      );
    }
    if (filters.formats?.length > 0)
    {
      pills.push(
        <Pill key="formats" withRemoveButton onRemove={() => onFilterChange("formats")}>
          {`${t("field.formats")}: ${[ ...filters.formats ].join(", ")}`}
        </Pill>
      );
    }
    if (filters.tags?.length > 0)
    {
      pills.push(
        <Pill key="tags" withRemoveButton onRemove={() => onFilterChange("tags")}>
          <Group gap={4} wrap="nowrap">
            <span>{t("field.tags")}:</span>
            {filters.tags?.flatMap(tag =>
            {
              const extensionTags = tags.filter(anExtensionTag => anExtensionTag.value === tag);
              return extensionTags.map(extensionTag => (
                <ImageTag key={`${tag}-${extensionTag.id}`} tag={extensionTag} kind="plain"/>
              ));
            })}
          </Group>
        </Pill>
      );
    }
    if (filters.properties && Object.keys(filters.properties).length > 0)
    {
      pills.push(
        <Pill key="properties" withRemoveButton onRemove={() => onFilterChange("properties")}>
          {t("field.properties")} ({Object.keys(filters.properties).length})
        </Pill>
      );
    }
    if (filters.features && filters.features.conditions && filters.features.conditions.length > 0)
    {
      pills.push(
        <Pill key="features" withRemoveButton onRemove={() => onFilterChange("features")}>
          {t("field.features")} ({filters.features.conditions.length})
        </Pill>
      );
    }

    return pills;
  }

  const renderTagOption = ({ option }: ComboboxLikeRenderOptionInput<ComboboxItem>) =>
  {
    const extensionTags = tags.filter(tag => tag.value === option.value);
    return (
      <Group gap="sm">
        <Group gap={4}>
          {extensionTags.map(extensionTag => <ExtensionIcon key={extensionTag.id} idOrExtension={extensionTag.id}
                                                            size="sm"/>)}
        </Group>
        <span>{option.label}</span>
      </Group>
    );
  };

  return (<div ref={containerRef}>
    <HoverCard
      width={width}
      position="bottom-end"
      withArrow
      shadow="xl"
      closeDelay={Common.HoverCloseDelayInMilliseconds}
    >
      <HoverCard.Target>
        <Box w="100%" miw={0}>
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
                              onClick={onClearAll}>
                    <IconX stroke={1.5} size={Common.IconSmallSize}/>
                  </ActionIcon>
                ) : null}
                <Tooltip label={t("filters.title")}>
                  <ActionIcon size="md" variant="light">
                    <IconFilter stroke={1.5} size={Common.IconSmallSize}/>
                  </ActionIcon>
                </Tooltip>
              </Flex>
            }
          >
            <Flex wrap="wrap" gap={6} align="center" className={style.wrapper}>
              <IconSearch stroke={1.5} size={Common.IconSmallSize} color="gray"/>
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
                leftSection={<IconAdjustmentsHorizontal size={Common.IconSmallSize}
                                                        color="var(--mantine-color-blue-filled)"/>}
              >
                {t("field.essentials")}
              </Tabs.Tab>
              <Tabs.Tab
                value="tags"
                leftSection={<IconTags size={Common.IconSmallSize} color="var(--mantine-color-orange-filled)"/>}
              >
                {t("field.tags")}
              </Tabs.Tab>
              <Tabs.Tab
                value="features"
                leftSection={<IconBulb size={Common.IconSmallSize} color="var(--mantine-color-violet-filled)"/>}
              >
                {t("field.features")}
              </Tabs.Tab>
              <Tabs.Tab
                value="properties"
                leftSection={<IconListDetails size={Common.IconSmallSize}
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
                  onChangeFilter={onFilterChange}
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
                    const extensionTags = tags.filter(anExtensionTag => anExtensionTag.value === option.value);
                    return (<Pill withRemoveButton onRemove={onRemove}>
                      <Group gap={4}>
                        {extensionTags.map(extensionTag => (
                          <ImageTag key={`${option.value}-${extensionTag.id}`} tag={extensionTag} kind="plain"/>
                        ))}
                      </Group>
                    </Pill>);
                  }}
                  onChange={(values: string[]) => onFilterChange("tags", values)}
                />
              </Stack>
            </Tabs.Panel>
            <Tabs.Panel value="features" p="md">
              <FeaturesQueryBuilder
                searchFeatures={filters?.features}
                onChange={(features) => onFilterChange("features", features)}
              />
            </Tabs.Panel>
            <Tabs.Panel value="properties" p="md">
              <PropertiesFilters
                properties={filters?.properties}
                onChange={(props) => onFilterChange("properties", props)}
              />
            </Tabs.Panel>
          </ScrollArea>
        </Tabs>
      </HoverCard.Dropdown>
    </HoverCard>
  </div>);
}
