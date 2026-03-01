import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActionIcon,
  Button,
  Flex,
  Group,
  MantineSize,
  Pill,
  Popover,
  Select,
  Space,
  Stack,
  Text,
  TextInput
} from "@mantine/core";
import { IconFilter, IconSearch, IconX } from "@tabler/icons-react";
import { Collection, ImageFeatureFormat, ImageFeatureType, ImageFormat, Repository } from "@picteus/ws-client";

import { useDebouncedCallback } from "app/hooks";
import { FiltersService, RepositoriesService, StorageService } from "app/services";
import { FilterSelect } from "app/components";
import { CollectionsDropdown } from "../CollectionsDropdown";
import { LocalFiltersType, LocalFiltersTypeFeature } from "types";
import { FeaturesNamesOption } from "../../../../services/FiltersService.ts";
import { capitalizeText } from "../../../../../utils";

export default function FiltersBar({
  initialFilters,
  onChange,
}: {
  initialFilters: LocalFiltersType;
  onChange: (filters: LocalFiltersType) => void;
}) {
  const [t] = useTranslation();
  const [searchText, setSearchText] = useState(undefined);
  const [featuresOptions, setFeaturesOptions] = useState<FeaturesNamesOption[]>([]);
  const [tagsOptions, setTagsOptions] = useState<{ value: string, label: string }[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [popoverOpened, setPopoverOpened] = useState(false);

  const {
    defaultFilters,
    sortByOptions,
    sortOrderOptions,
    searchInOptions,
    formatsOptions,
    computeFeaturesNamesOptions,
    computeTagsOptions,
  } = FiltersService;

  const [filters, setFilters] = useState<LocalFiltersType>(
    initialFilters
      ? { ...defaultFilters, ...initialFilters }
      : StorageService.getSearchFilters() || defaultFilters,
  );
  const [selectedCollection, setSelectedCollection] = useState<Collection | undefined>(undefined);

  const debouncedSearchCallback = useDebouncedCallback(async () => {
    setFilters({
      ...filters,
      keyword: searchText,
    });
  }, 400);

  useEffect(() => {
    if (searchText !== undefined) {
      debouncedSearchCallback(searchText);
    }
  }, [searchText]);

  useEffect(() => {
    StorageService.setSearchFilters(filters);
    onChange(filters);
  }, [filters]);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    async function load() {
      {
        const options = await computeFeaturesNamesOptions();
        const builtInOptions: FeaturesNamesOption[] = [];
        const types: ImageFeatureType[] = [ImageFeatureType.Recipe, ImageFeatureType.Annotation, ImageFeatureType.Comment, ImageFeatureType.Description, ImageFeatureType.Caption];
        const formats: ImageFeatureFormat[] = [ImageFeatureFormat.Json, ImageFeatureFormat.Markdown, ImageFeatureFormat.Html, ImageFeatureFormat.Xml, ImageFeatureFormat.String];
        for (const type of types) {
          for (const format of formats) {
            builtInOptions.push({
              value: type,
              category: capitalizeText(type),
              format: format,
              type: type
            });
          }
        }
        const allOptions = builtInOptions.concat(...options);
        setFeaturesOptions(allOptions);
      }
      setTagsOptions(await computeTagsOptions());
    }

    load().catch(console.error);
  }, []);

  // Removing repositories that no longer exist
  useEffect(() => {
    if (repositories.length) {
      const repositoriesStillExisting = filters.repositories?.filter(
        (repositoryId) =>
          repositories.find((repository) => repository.id === repositoryId),
      );
      setFilters({
        ...filters,
        repositories: repositoriesStillExisting,
      });
    }
  }, [repositories]);

  function load() {
    const _repositories = RepositoriesService.list();
    setRepositories(_repositories);
  }

  function handleOnClearAll() {
    setFilters(defaultFilters);
    setSelectedCollection(undefined);
  }

  function computeFeatureOptionValue(feature: LocalFiltersTypeFeature): string {
    return feature.category;
  }

  function renderFiltersDropdown() {
    return (
      <Stack>
        <Group>
          <Stack gap={5}>
            <Text size="sm">{t("sort.sortBy")}</Text>
            <Select
              onChange={(value) => handleOnChangeFilter("sortBy", value)}
              value={filters.sortBy}
              placeholder={t("sort.sortByPlaceholder")}
              comboboxProps={{ withinPortal: false }}
              width={200}
              data={sortByOptions}
              allowDeselect={false}
            />
          </Stack>
          <Stack gap={5}>
            <Text size="sm">{t("sort.sortOrder")}</Text>
            <Select
              onChange={(value) => handleOnChangeFilter("sortOrder", value)}
              value={filters.sortOrder}
              placeholder={t("sort.sortOrderPlaceholder")}
              data={sortOrderOptions}
              comboboxProps={{ withinPortal: false }}
              allowDeselect={false}
            />
          </Stack>
        </Group>
        <Stack mt="xs">
          <FilterSelect
            label={t("filters.searchTextIn")}
            selectedValues={filters.searchIn}
            options={searchInOptions}
            onChange={(values: string[]) =>
              handleOnChangeFilter("searchIn", values)
            }
          />
        </Stack>
        <Stack mt="xs">
          <FilterSelect
            label={t("field.repositories")}
            selectedValues={filters.repositories}
            options={repositories.map((repository) => ({
              value: repository.id,
              label: repository.name,
            }))}
            onChange={(values: string[]) =>
              handleOnChangeFilter("repositories", values)
            }
          />
        </Stack>
        <Stack mt="xs">
          <FilterSelect
            label={t("field.formats")}
            selectedValues={filters.formats}
            options={formatsOptions}
            onChange={(values: string[]) =>
              handleOnChangeFilter("formats", values)
            }
          />
        </Stack>
        <Stack mt="xs">
          <FilterSelect
            label={t("field.features")}
            selectedValues={filters.features?.map(feature => computeFeatureOptionValue(feature)).filter((feature, index, array) => array.indexOf(feature) == index) || []}
            options={featuresOptions.filter((option, index, array) => array.map(item => item.category).indexOf(option.category) == index).map(option => { return { value: computeFeatureOptionValue(option), label: option.category }; })}
            onChange={(values: string[]) => {
              const matchingOptions = featuresOptions.filter(option => values.indexOf(option.category) !== -1);
              handleOnChangeFilter("features", matchingOptions);
            }
            }
          />
        </Stack>
        <Stack mt="xs">
          <FilterSelect
            label={t("field.tags")}
            selectedValues={filters.tags}
            options={tagsOptions}
            onChange={(values: string[]) =>
              handleOnChangeFilter("tags", values)
            }
          />
        </Stack>
        <Flex justify="flex-end">
          <Button onClick={handleOnClearAll} variant="default" size={"xs"}>
            {t("button.clearAll")}
          </Button>
        </Flex>
      </Stack>
    );
  }

  function computeSortingLabelDisplay() {
    const sortBy = sortByOptions.find(
      (option) => option.value === filters.sortBy,
    );
    const sortOrder = sortOrderOptions.find(
      (option) => option.value === filters.sortOrder,
    );
    return `${t("sort.sortedBy")} "${sortBy.label}" - ${sortOrder.label}`;
  }

  function handleOnChangeFilter(filterKey: string, value?: any) {
    setFilters({
      ...filters,
      [filterKey]: value,
    });
  }

  function computeSearchInLabelDisplay() {
    if (
      searchInOptions.every((option) =>
        filters.searchIn?.includes(option.value),
      )
    ) {
      return;
    }
    return searchInOptions
      .filter((option) => filters.searchIn?.includes(option.value)) // Only selected
      .map((option) => option.label) // Map to label
      .join(", ");
  }

  const commonPillProps = {
    size: "md" as MantineSize,
    onClick: () => setPopoverOpened(true),
    withRemoveButton: true,
  };

  return (
    <div>
      <Flex gap={10} align="center">
        <TextInput
          defaultValue={filters?.keyword}
          leftSectionPointerEvents="none"
          leftSection={<IconSearch stroke={1.5} />}
          rightSection={
            <ActionIcon
              onClick={() => setSearchText("")}
              size="xs"
              variant="transparent"
              c="dimmed"
            >
              <IconX stroke={1.5} />
            </ActionIcon>
          }
          placeholder={t("field.search")}
          style={{ width: 400 }}
          onChange={(event) => setSearchText(event.target.value)}
          value={searchText}
        />
        <Popover
          width={500}
          position="bottom-start"
          withArrow
          shadow="md"
          opened={popoverOpened}
          onChange={setPopoverOpened}
        >
          <Popover.Target>
            <ActionIcon
              onClick={() =>
                popoverOpened ? setPopoverOpened(false) : setPopoverOpened(true)
              }
              size="lg"
              variant="default"
              title={t("filters.title")}
            >
              <IconFilter stroke={1.3} />
            </ActionIcon>
          </Popover.Target>
          <Popover.Dropdown>{renderFiltersDropdown()}</Popover.Dropdown>
        </Popover>
        <CollectionsDropdown
          currentFilters={filters}
          selectedCollection={selectedCollection}
          onApplyCollection={(col) => {
            setFilters(FiltersService.searchFilterToFilters(col.filter));
            setSelectedCollection(col);
          }}
        />
      </Flex>

      <Space h="sm" />
      <Group>
        {selectedCollection && (
          <Pill {...commonPillProps} onRemove={() => setSelectedCollection(undefined)}>
            {`${t("collections.current", { defaultValue: "Collection" })} : ${selectedCollection.name}`}
          </Pill>
        )}
        <Pill {...commonPillProps} withRemoveButton={false}>
          {computeSortingLabelDisplay()}
        </Pill>

        {filters.searchIn?.length &&
          filters.searchIn.length !== searchInOptions.length && (
            <Pill
              size="md"
              withRemoveButton
              onRemove={() => handleOnChangeFilter("searchIn")}
            >
              {`${t("filters.searchTextIn")} : ${computeSearchInLabelDisplay()}`}
            </Pill>
          )}

        {filters.repositories?.length &&
          repositories.length !== filters.repositories?.length && (
            <Pill
              {...commonPillProps}
              onRemove={() => handleOnChangeFilter("repositories")}
            >
              {`${t("field.repositories")} : ${repositories
                .filter((r) => filters.repositories?.includes(r.id))
                .map((r) => r.name)
                .join(", ")}`}
            </Pill>
          )}
        {filters.formats?.length &&
          filters.formats?.length !==
          Object.keys(ImageFormat).length && (
            <Pill
              {...commonPillProps}
              onRemove={() => handleOnChangeFilter("formats")}
            >
              {`${t("field.formats")} : ${[...filters.formats]?.join(", ")}`}
            </Pill>
          )}
        {filters.features?.length && (
          <Pill
            {...commonPillProps}
            onRemove={() => handleOnChangeFilter("features")}
          >
            {`${t("field.features")} : ${[...filters.features]?.map(feature => feature.category).filter((feature, index, array) => array.indexOf(feature) == index).join(", ")}`}
          </Pill>
        )}
        {filters.tags?.length && (
          <Pill
            {...commonPillProps}
            onRemove={() => handleOnChangeFilter("tags")}
          >
            {`${t("field.tags")} : ${[...filters.tags]?.join(", ")}`}
          </Pill>
        )}
      </Group>
    </div>
  );
}
