import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react";
import {
  ActionIcon,
  CloseButton,
  Flex,
  Group,
  MantineSize,
  Pill,
  Popover,
  Stack,
  TextInput,
  Tooltip
} from "@mantine/core";
import { IconFilter, IconSearch } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Repository, SearchFilter } from "@picteus/ws-client";

import { FilterOrCollectionId, LocalFiltersType } from "types";
import { useDebouncedCallback, useInterceptedState } from "app/hooks";
import { FeaturesNamesOption, FiltersService, RepositoriesService } from "app/services";
import { Filters } from "../index.ts";

import style from "./FiltersBar.module.scss";


const { defaultFilter, sortByOptions, sortOrderOptions, searchInOptions } = FiltersService;


export interface FiltersBarRef {
  setFilter: (filter: SearchFilter) => void;
}

type FiltersBarType = {
  initialFilterOrCollectionId: FilterOrCollectionId;
  onFilterOrCollectionId: (filterOrCollectionId: FilterOrCollectionId) => void;
  onClearAll: () => void;
  children?: React.ReactNode;
};

export const FiltersBar = forwardRef<FiltersBarRef, FiltersBarType>(({ initialFilterOrCollectionId, onFilterOrCollectionId, onClearAll, children }, ref) => {
  const [t] = useTranslation();
  const [searchText, setSearchText] = useState<string>();
  const repositories = useMemo<Repository []>(() => (RepositoriesService.list()), []);
  const [popoverOpened, setPopoverOpened] = useState<boolean>(false);
  const [filters, setFilters] = useInterceptedState<LocalFiltersType>("filter" in initialFilterOrCollectionId ? FiltersService.searchFilterToLocalFilters(initialFilterOrCollectionId.filter) : undefined );

  useImperativeHandle(ref, () => ({
    setFilter: (filter: SearchFilter) => {
      setFilters(FiltersService.searchFilterToLocalFilters(filter));
    }
  }));

  useEffect(() => {
    const updatedSearchFilter = filters === undefined ? undefined : FiltersService.localFiltersToSearchFilter(filters);
    if (updatedSearchFilter !== undefined) {
      onFilterOrCollectionId({ filter: updatedSearchFilter });
    }
  }, [filters, onFilterOrCollectionId]);

  const onChangeFilterWrapper = useCallback((key: string, value?: string | string [] | FeaturesNamesOption[]) => {
    setFilters((previousLocalFilters: LocalFiltersType) => {
      const updatedLocalFilters = { ...previousLocalFilters, [key]: value };
      if (key === "searchIn" && value === undefined) {
        delete updatedLocalFilters.keyword;
      }
      else if (Array.isArray(value) === true && value.length === 0) {
        delete updatedLocalFilters[key];
      }
      return updatedLocalFilters;
    });
  }, [setFilters]);

  const debouncedSearchCallback = useDebouncedCallback(async (searchText: string) => {
    setFilters(previousValue => ({
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

  function handleOnClearAll() {
    setFilters(FiltersService.searchFilterToLocalFilters(defaultFilter));
    setSearchText("");
    onClearAll();
  }

  function computeSortingLabelDisplay() {
    const sortBy = sortByOptions.find(
      (option) => option.value === filters.sortBy
    );
    const sortOrder = sortOrderOptions.find(
      (option) => option.value === filters.sortOrder
    );
    return `${t("sort.sortedBy")} "${sortBy.label}" - ${sortOrder.label}`;
  }

  function computeSearchInLabelDisplay() {
    return searchInOptions
      .filter((option) => filters.searchIn?.includes(option.value))
      .map((option) => option.label)
      .join(", ");
  }

  const commonPillProps = { size: "md" as MantineSize, withRemoveButton: true };

  return (
    <Stack>
      <Flex gap={10} align="center">
        <TextInput
          defaultValue={filters?.keyword}
          value={searchText}
          leftSectionPointerEvents="none"
          leftSection={<IconSearch stroke={1.5} />}
          rightSection={<CloseButton size="xs" variant="transparent" c="dimmed" onClick={() => setSearchText("")} />}
          placeholder={t("field.search")}
          className={style.textSearch}
          classNames={{ section: style.section }}
          onChange={(event) => setSearchText(event.target.value)}
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
                size="lg"
                variant="default"
                onClick={() => popoverOpened ? setPopoverOpened(false) : setPopoverOpened(true)}
              >
                <IconFilter stroke={1.3} />
              </ActionIcon>
            </Tooltip>
          </Popover.Target>
          <Popover.Dropdown>
            {filters &&
              <Filters repositories={repositories} localFilters={filters} onChangeFilter={onChangeFilterWrapper}
                       handleOnClearAll={handleOnClearAll} />}
          </Popover.Dropdown>
        </Popover>
        {children}
      </Flex>
      {filters && <Group>
        {filters.sortBy && <Pill {...commonPillProps} withRemoveButton={false}>
          {computeSortingLabelDisplay()}
        </Pill>}
        {filters.searchIn?.length > 0 && (
          <Pill
            size="md"
            withRemoveButton
            onRemove={() => onChangeFilterWrapper("searchIn")}
          >
            {`${t("filters.searchTextIn")} : ${computeSearchInLabelDisplay()}`}
          </Pill>
        )}
        {filters.repositories?.length > 0 && (
          <Pill
            {...commonPillProps}
            onRemove={() => onChangeFilterWrapper("repositories")}
          >
            {`${t("field.repositories")} : ${repositories
              .filter((r) => filters.repositories?.includes(r.id))
              .map((r) => r.name)
              .join(", ")}`}
          </Pill>
        )}
        {filters.formats?.length > 0 && (
          <Pill
            {...commonPillProps}
            onRemove={() => onChangeFilterWrapper("formats")}
          >
            {`${t("field.formats")} : ${[...filters.formats]?.join(", ")}`}
          </Pill>
        )}
        {filters.features?.length > 0 && (
          <Pill
            {...commonPillProps}
            onRemove={() => onChangeFilterWrapper("features")}
          >
            {`${t("field.features")} : ${[...filters.features]?.map(feature => feature.category).filter((feature, index, array) => array.indexOf(feature) == index).join(", ")}`}
          </Pill>
        )}
        {filters.tags?.length > 0 && (
          <Pill
            {...commonPillProps}
            onRemove={() => onChangeFilterWrapper("tags")}
          >
            {`${t("field.tags")} : ${[...filters.tags]?.join(", ")}`}
          </Pill>
        )}
      </Group>
      }
    </Stack>
  );
});
FiltersBar.displayName = "FiltersBar";
