import React, { ReactNode, useEffect, useMemo, useState } from "react";
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
import { useDebouncedCallback } from "app/hooks";
import { FiltersService, RepositoriesService, WithValueAndLabel } from "app/services";

import { Common, ExtensionIcon, ImageTag } from "app/components";
import { FeaturesQueryBuilder, GeneralFilters, PropertiesFilters } from "../../components";
import { FilterSelect } from "..";

import style from "./SearchFilters.module.scss";


type SearchFiltersType = {
  filters?: LocalFiltersType;
  setFilters: React.Dispatch<React.SetStateAction<LocalFiltersType | undefined>>;
  onChangeFilterWrapper: (key: string, value?: any) => void;
  onClearAll: () => void;
};

export function SearchFilters({
  filters,
  setFilters,
  onChangeFilterWrapper,
  onClearAll
}: SearchFiltersType)
{
  const [ t ] = useTranslation();
  const [ searchText, setSearchText ] = useState<string>();
  const repositories = useMemo<Repository[]>(() => (RepositoriesService.list()), []);
  const [ tags, setTags ] = useState<ExtensionImageTag[]>([]);
  const [ tagOptions, setTagOptions ] = useState<WithValueAndLabel[]>([]);

  useEffect(() =>
  {
    async function load()
    {
      const tags = await FiltersService.computeTagsOptions();
      setTags(tags);
      setTagOptions(tags.map(tag => ({ value: tag.value, label: tag.value })));
    }

    load().catch(ToastService.apiCallError);
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
          {`${t("field.formats")}: ${[ ...filters.formats ].join(", ")}`}
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
  return (<HoverCard
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
  </HoverCard>);
}
