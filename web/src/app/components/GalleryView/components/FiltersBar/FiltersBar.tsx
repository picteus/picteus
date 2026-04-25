import React, { useEffect, useState } from "react";
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
  TextInput,
  Tooltip
} from "@mantine/core";
import { IconFilter, IconSearch, IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import {
  Collection,
  ImageFeatureFormat,
  ImageFeatureType,
  Repository,
  SearchFilter,
  SearchFilterFromJSON
} from "@picteus/ws-client";

import { FilterOrCollectionId, LocalFiltersType, LocalFiltersTypeFeature } from "types";
import { capitalizeText, notifyErrorWithError } from "utils";
import { useDebouncedCallback } from "app/hooks";
import { CollectionService, FeaturesNamesOption, FiltersService, RepositoriesService } from "app/services";
import { FilterSelect } from "app/components";
import { CollectionsBar } from "../index.ts";


const {
  defaultFilter,
  sortByOptions,
  sortOrderOptions,
  searchInOptions,
  formatsOptions,
  computeFeaturesNamesOptions,
  computeTagsOptions
} = FiltersService;


type FiltersBarType = {
  filterOrCollectionId: FilterOrCollectionId;
  onChange: (filterOrCollectionId: FilterOrCollectionId) => void;
};

export default function FiltersBar({ filterOrCollectionId, onChange }: FiltersBarType) {
  const [t] = useTranslation();
  const [searchText, setSearchText] = useState<string>();
  const [featuresOptions, setFeaturesOptions] = useState<FeaturesNamesOption[]>([]);
  const [tagsOptions, setTagsOptions] = useState<{ value: string, label: string }[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [popoverOpened, setPopoverOpened] = useState(false);
  const [localFilters, setLocalFilters] = useState<LocalFiltersType>();
  const [searchFilter, setSearchFilter] = useState<SearchFilter>();
  const [selectedCollection, setSelectedCollection] = useState<Collection>();

  const debouncedSearchCallback = useDebouncedCallback(async () => {
    setLocalFilters({...localFilters, keyword: searchText, searchIn: localFilters.searchIn ?? ((searchText === undefined || searchText === "") ? undefined : ["inName"])});
  }, 400);

  useEffect(() => {
    const updatedFilterOrCollectionId = filterOrCollectionId;
    if (updatedFilterOrCollectionId.collectionId !== undefined) {
      CollectionService.get(updatedFilterOrCollectionId.collectionId).then(collection => {
        setSelectedCollection(collection);
        setLocalFilters(FiltersService.searchFilterToLocalFilters(collection.filter));
      }).catch(() => {
        // In case the collection does not exist anymore, we do nothing
      });
    }
    else {
      setSelectedCollection(undefined);
      setLocalFilters(FiltersService.searchFilterToLocalFilters(updatedFilterOrCollectionId.filter));
    }
  }, [filterOrCollectionId]);

  useEffect(() =>
  {
    if (searchText !== undefined) {
      debouncedSearchCallback(searchText);
    }
  }, [searchText]);

  useEffect(() => {
    async function load() {
      setRepositories(RepositoriesService.list());
      {
        const options = await computeFeaturesNamesOptions();
        const builtInOptions: FeaturesNamesOption[] = [];
        const types: ImageFeatureType[] = [ImageFeatureType.Recipe, ImageFeatureType.Annotation, ImageFeatureType.Comment, ImageFeatureType.Description, ImageFeatureType.Caption];
        const formats: ImageFeatureFormat[] = [ImageFeatureFormat.Json, ImageFeatureFormat.Markdown, ImageFeatureFormat.Html, ImageFeatureFormat.Xml, ImageFeatureFormat.String];
        for (const type of types)
        {
          for (const format of formats)
          {
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

    load().catch(notifyErrorWithError);
  }, []);

  useEffect(() => {
    if (localFilters !== undefined && localFilters.repositories !== undefined) {
      // We remove the repositories that no longer exist
      const existingRepositories = localFilters.repositories.filter(repositoryId =>
        repositories.find((repository) => repository.id === repositoryId)
      );
      if (existingRepositories.length !== localFilters.repositories.length) {
        setLocalFilters({ ...localFilters, repositories: existingRepositories });
      }
    }
  }, [repositories, localFilters]);

  useEffect(() => {
    const updatedSearchFilter = localFilters === undefined ? undefined : FiltersService.localFiltersToSearchFilter(localFilters);
    setSearchFilter(updatedSearchFilter);
    let chooseCollection: boolean;
    if (localFilters !== undefined) {
      if (selectedCollection === undefined || JSON.stringify(SearchFilterFromJSON(selectedCollection.filter)) !== JSON.stringify(SearchFilterFromJSON(updatedSearchFilter))) {
        chooseCollection = false;
        const filterOrCollectionId = { filter: updatedSearchFilter };
        onChange(filterOrCollectionId);
      }
      else if (selectedCollection !== undefined) {
        chooseCollection = true;
      }
    }
    if (chooseCollection === true || (chooseCollection !== false && selectedCollection !== undefined)) {
      onChange({ collectionId: selectedCollection.id });
    }
  }, [selectedCollection, localFilters]);

  function handleOnClearAll() {
    setLocalFilters(FiltersService.searchFilterToLocalFilters(defaultFilter));
    setSearchText("");
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
              value={localFilters.sortBy}
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
              value={localFilters.sortOrder}
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
            selectedValues={localFilters.searchIn}
            options={searchInOptions}
            onChange={(values: string[]) =>
              handleOnChangeFilter("searchIn", values)
            }
          />
        </Stack>
        <Stack mt="xs">
          <FilterSelect
            label={t("field.repositories")}
            selectedValues={localFilters.repositories}
            options={repositories.map((repository) => ({
              value: repository.id,
              label: repository.name
            }))}
            onChange={(values: string[]) =>
              handleOnChangeFilter("repositories", values)
            }
          />
        </Stack>
        <Stack mt="xs">
          <FilterSelect
            label={t("field.formats")}
            selectedValues={localFilters.formats}
            options={formatsOptions}
            onChange={(values: string[]) =>
              handleOnChangeFilter("formats", values)
            }
          />
        </Stack>
        <Stack mt="xs">
          <FilterSelect
            label={t("field.features")}
            selectedValues={localFilters.features?.map(feature => computeFeatureOptionValue(feature)).filter((feature, index, array) => array.indexOf(feature) == index) || []}
            options={featuresOptions.filter((option, index, array) => array.map(item => item.category).indexOf(option.category) == index).map(option => {
              return { value: computeFeatureOptionValue(option), label: option.category };
            })}
            onChange={(values: string[]) =>
            {
              const matchingOptions = featuresOptions.filter(option => values.indexOf(option.category) !== -1);
              handleOnChangeFilter("features", matchingOptions);
            }
            }
          />
        </Stack>
        <Stack mt="xs">
          <FilterSelect
            label={t("field.tags")}
            selectedValues={localFilters.tags}
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

  function computeSortingLabelDisplay()
  {
    const sortBy = sortByOptions.find(
      (option) => option.value === localFilters.sortBy
    );
    const sortOrder = sortOrderOptions.find(
      (option) => option.value === localFilters.sortOrder
    );
    return `${t("sort.sortedBy")} "${sortBy.label}" - ${sortOrder.label}`;
  }

  function handleOnChangeFilter(filterKey: string, value?: string | string [] | FeaturesNamesOption[]) {
    const updatedFilter = { ...localFilters, [filterKey]: value };
    if (filterKey === "searchIn" && value === undefined) {
      delete updatedFilter.keyword;
      setSearchText("");
    }
    setLocalFilters(updatedFilter);
  }

  function computeSearchInLabelDisplay() {
    return searchInOptions
      .filter((option) => localFilters.searchIn?.includes(option.value)) // Only selected
      .map((option) => option.label) // Map to label
      .join(", ");
  }

  const commonPillProps = {
    size: "md" as MantineSize,
    onClick: () => setPopoverOpened(true),
    withRemoveButton: true
  };

  return (
    <div>
      <Flex gap={10} align="center">
        <TextInput
          defaultValue={localFilters?.keyword}
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
            <Tooltip label={t("filters.title")}>
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
            </Tooltip>
          </Popover.Target>
          <Popover.Dropdown>{localFilters !== undefined && renderFiltersDropdown()}</Popover.Dropdown>
        </Popover>
        <CollectionsBar
          currentFilter={searchFilter}
          selectedCollection={selectedCollection}
          onApplyCollection={(collection) => {
            const updatedLocalFilters = FiltersService.searchFilterToLocalFilters(collection === undefined ? defaultFilter : collection.filter);
            setLocalFilters(updatedLocalFilters);
            setSearchText(updatedLocalFilters.keyword ?? "");
            setSelectedCollection(collection);
          }}
        />
      </Flex>
      <Space h="sm" />
      {localFilters !== undefined && <Group>
        <Pill {...commonPillProps} withRemoveButton={false}>
          {computeSortingLabelDisplay()}
        </Pill>
        {localFilters.searchIn?.length > 0 && (
          <Pill
            size="md"
            withRemoveButton
            onRemove={() => handleOnChangeFilter("searchIn")}
          >
            {`${t("filters.searchTextIn")} : ${computeSearchInLabelDisplay()}`}
          </Pill>
        )}
        {localFilters.repositories?.length > 0 && (
          <Pill
            {...commonPillProps}
            onRemove={() => handleOnChangeFilter("repositories")}
          >
            {`${t("field.repositories")} : ${repositories
              .filter((r) => localFilters.repositories?.includes(r.id))
              .map((r) => r.name)
              .join(", ")}`}
          </Pill>
        )}
        {localFilters.formats?.length > 0 && (
          <Pill
            {...commonPillProps}
            onRemove={() => handleOnChangeFilter("formats")}
          >
            {`${t("field.formats")} : ${[...localFilters.formats]?.join(", ")}`}
          </Pill>
        )}
        {localFilters.features?.length > 0 && (
          <Pill
            {...commonPillProps}
            onRemove={() => handleOnChangeFilter("features")}
          >
            {`${t("field.features")} : ${[...localFilters.features]?.map(feature => feature.category).filter((feature, index, array) => array.indexOf(feature) == index).join(", ")}`}
          </Pill>
        )}
        {localFilters.tags?.length > 0 && (
          <Pill
            {...commonPillProps}
            onRemove={() => handleOnChangeFilter("tags")}
          >
            {`${t("field.tags")} : ${[...localFilters.tags]?.join(", ")}`}
          </Pill>
        )}
      </Group>
      }
    </div>
  );
}
