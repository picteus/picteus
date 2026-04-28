import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActionIcon, Flex, Group, MantineSize, Pill, Popover, Stack, TextInput, Tooltip } from "@mantine/core";
import { IconFilter, IconSearch, IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Collection, Repository, SearchFilter, SearchFilterFromJSON } from "@picteus/ws-client";

import { FilterOrCollectionId, LocalFiltersType } from "types";
import { useDebouncedCallback, useInterceptedState } from "app/hooks";
import { CollectionService, FeaturesNamesOption, FiltersService, RepositoriesService } from "app/services";
import { CollectionsBar, Filters } from "../index.ts";


const { defaultFilter, sortByOptions, sortOrderOptions, searchInOptions } = FiltersService;


type FiltersBarType = {
  filterOrCollectionId: FilterOrCollectionId;
  setFilterOrCollectionId: React.Dispatch<React.SetStateAction<FilterOrCollectionId>>;
};

export default function FiltersBar({ filterOrCollectionId, setFilterOrCollectionId }: FiltersBarType) {
  const [t] = useTranslation();
  const [searchText, setSearchText] = useState<string>();
  const repositories = useMemo<Repository []>(() => (RepositoriesService.list()), []);
  const [popoverOpened, setPopoverOpened] = useState<boolean>(false);
  const [localFilters, setLocalFilters] = useInterceptedState<LocalFiltersType>(undefined);
  const [searchFilter, setSearchFilter] = useInterceptedState<SearchFilter>(undefined);
  const [selectedCollection, setSelectedCollection] = useState<Collection | undefined>();

  const setFilterOrCollectionIdWrapper = useCallback((updatedFilterOrCollectionId: FilterOrCollectionId) => {
    setFilterOrCollectionId((previousFilterOrCollectionId: FilterOrCollectionId) => {
      if (JSON.stringify(updatedFilterOrCollectionId) !== JSON.stringify(previousFilterOrCollectionId)) {
        return updatedFilterOrCollectionId;
      }
      else {
        return previousFilterOrCollectionId;
      }
    })
  }, [setFilterOrCollectionId]);

  useEffect(() => {
    if ("collectionId" in filterOrCollectionId) {
      CollectionService.get(filterOrCollectionId.collectionId).then(collection => {
        setSelectedCollection((previousCollection: Collection) => {
          if (JSON.stringify(previousCollection) !== JSON.stringify(collection)) {
            return collection;
          }
          else {
            return previousCollection;
          }
        });
        setLocalFilters(FiltersService.searchFilterToLocalFilters(collection.filter));
      });
    }
    else if ("filter" in filterOrCollectionId) {
      setLocalFilters(FiltersService.searchFilterToLocalFilters(filterOrCollectionId.filter));
    }
  }, [filterOrCollectionId, setLocalFilters]);

  useEffect(() => {
    setSearchFilter(localFilters === undefined ? undefined : FiltersService.localFiltersToSearchFilter(localFilters));
  }, [localFilters, setSearchFilter]);

  useEffect(() => {
    const updatedSearchFilter = localFilters === undefined ? undefined : FiltersService.localFiltersToSearchFilter(localFilters);
    if (selectedCollection !== undefined) {
      if (JSON.stringify(SearchFilterFromJSON(updatedSearchFilter)) === JSON.stringify(SearchFilterFromJSON(selectedCollection.filter))) {
        setFilterOrCollectionIdWrapper({collectionId: selectedCollection.id});
        return;
      }
    }
    if (updatedSearchFilter !== undefined) {
      setFilterOrCollectionIdWrapper({filter: updatedSearchFilter});
    }
  }, [selectedCollection, localFilters, setFilterOrCollectionIdWrapper]);

  const onChangeFilterWrapper = useCallback((key: string, value?: string | string [] | FeaturesNamesOption[]) => {
    setLocalFilters((previousLocalFilters: LocalFiltersType) => {
      const updatedLocalFilters = { ...previousLocalFilters, [key]: value };
      if (key === "searchIn" && value === undefined) {
        delete updatedLocalFilters.keyword;
      }
      else if (Array.isArray(value) === true && value.length === 0) {
        delete updatedLocalFilters[key];
      }
      return updatedLocalFilters;
    });
  }, [setLocalFilters]);

  const debouncedSearchCallback = useDebouncedCallback(async (searchText: string) => {
    setLocalFilters(previousValue => ({
      ...previousValue,
      keyword: searchText,
      searchIn: previousValue.searchIn ?? ((searchText === undefined || searchText === "") ? undefined : ["inName"])
    }));
  }, 400);

  useEffect(() => {
    if (searchText !== undefined) {
      debouncedSearchCallback(searchText);
    }
  }, [searchText]);

  const setSelectedCollectionWrapper = useCallback((updatedCollection: Collection | undefined) => {
    if (updatedCollection !== undefined) {
      setLocalFilters(FiltersService.searchFilterToLocalFilters(updatedCollection.filter));
    }
    setSelectedCollection((previousCollection: Collection) => {
      if (JSON.stringify(previousCollection) !== JSON.stringify(updatedCollection)) {
        return updatedCollection;
      }
      else {
        return previousCollection;
      }
    });
  }, [setLocalFilters]);

  function handleOnClearAll() {
    setLocalFilters(FiltersService.searchFilterToLocalFilters(defaultFilter));
    setSearchText("");
    setSelectedCollection(undefined);
  }

  function computeSortingLabelDisplay() {
    const sortBy = sortByOptions.find(
      (option) => option.value === localFilters.sortBy
    );
    const sortOrder = sortOrderOptions.find(
      (option) => option.value === localFilters.sortOrder
    );
    return `${t("sort.sortedBy")} "${sortBy.label}" - ${sortOrder.label}`;
  }

  function computeSearchInLabelDisplay() {
    return searchInOptions
      .filter((option) => localFilters.searchIn?.includes(option.value)) // Only selected
      .map((option) => option.label) // Map to label
      .join(", ");
  }

  const commonPillProps = { size: "md" as MantineSize, withRemoveButton: true };

  return (
    <Stack>
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
              >
                <IconFilter stroke={1.3} />
              </ActionIcon>
            </Tooltip>
          </Popover.Target>
          <Popover.Dropdown>
            {localFilters &&
              <Filters repositories={repositories} localFilters={localFilters} onChangeFilter={onChangeFilterWrapper}
                       handleOnClearAll={handleOnClearAll} />}
          </Popover.Dropdown>
        </Popover>
        {searchFilter && <CollectionsBar
          searchFilter={searchFilter}
          selectedCollection={selectedCollection}
          setSelectedCollection={setSelectedCollectionWrapper}
        />
        }
      </Flex>
      {localFilters && <Group>
        <Pill {...commonPillProps} withRemoveButton={false}>
          {computeSortingLabelDisplay()}
        </Pill>
        {localFilters.searchIn?.length > 0 && (
          <Pill
            size="md"
            withRemoveButton
            onRemove={() => onChangeFilterWrapper("searchIn")}
          >
            {`${t("filters.searchTextIn")} : ${computeSearchInLabelDisplay()}`}
          </Pill>
        )}
        {localFilters.repositories?.length > 0 && (
          <Pill
            {...commonPillProps}
            onRemove={() => onChangeFilterWrapper("repositories")}
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
            onRemove={() => onChangeFilterWrapper("formats")}
          >
            {`${t("field.formats")} : ${[...localFilters.formats]?.join(", ")}`}
          </Pill>
        )}
        {localFilters.features?.length > 0 && (
          <Pill
            {...commonPillProps}
            onRemove={() => onChangeFilterWrapper("features")}
          >
            {`${t("field.features")} : ${[...localFilters.features]?.map(feature => feature.category).filter((feature, index, array) => array.indexOf(feature) == index).join(", ")}`}
          </Pill>
        )}
        {localFilters.tags?.length > 0 && (
          <Pill
            {...commonPillProps}
            onRemove={() => onChangeFilterWrapper("tags")}
          >
            {`${t("field.tags")} : ${[...localFilters.tags]?.join(", ")}`}
          </Pill>
        )}
      </Group>
      }
    </Stack>
  );

}
