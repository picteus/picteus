import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import { Box, Button, Flex, Menu, Text, Tooltip } from "@mantine/core";
import {
  IconArrowsHorizontal,
  IconArrowsVertical,
  IconCalendarPlus,
  IconCalendarTime,
  IconChevronDown,
  IconLetterCase,
  IconSortAscending,
  IconSortDescending,
  IconWeight
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { SearchFeatures, SearchFilter, SearchProperties, SearchSortingProperty } from "@picteus/ws-client";

import { FilterOrCollectionId, LocalFiltersType } from "types";
import { useInterceptedState } from "app/hooks";
import { FiltersService } from "app/services";
import { Common } from "app/components";
import { SearchFilters } from "./components";


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

const SORT_ICONS: Record<string, React.ReactNode> = {
  [SearchSortingProperty.Name]: <IconLetterCase size={Common.IconSmallSize}/>,
  [SearchSortingProperty.CreationDate]: <IconCalendarPlus size={Common.IconSmallSize}/>,
  [SearchSortingProperty.ModificationDate]: <IconCalendarTime size={Common.IconSmallSize}/>,
  [SearchSortingProperty.ImportDate]: <IconCalendarPlus size={Common.IconSmallSize}/>,
  [SearchSortingProperty.UpdateDate]: <IconCalendarTime size={Common.IconSmallSize}/>,
  [SearchSortingProperty.BinarySize]: <IconWeight size={Common.IconSmallSize}/>,
  [SearchSortingProperty.Width]: <IconArrowsHorizontal size={Common.IconSmallSize}/>,
  [SearchSortingProperty.Height]: <IconArrowsVertical size={Common.IconSmallSize}/>
};

export const FiltersBar = forwardRef<FiltersBarRef, FiltersBarType>(({
  initialFilterOrCollectionId,
  onFilterOrCollectionId,
  onClearAll,
  children
}, ref) =>
{
  const [ t ] = useTranslation();
  const [ filters, setFilters ] = useInterceptedState<LocalFiltersType | undefined>("filter" in initialFilterOrCollectionId ? FiltersService.searchFilterToLocalFilters(initialFilterOrCollectionId.filter) : undefined);
  const [ sortingMenuOpened, setSortingMenuOpened ] = useState<boolean>(false);

  useImperativeHandle(ref, () => ({
    setFilter: (filter: SearchFilter) =>
    {
      setFilters(FiltersService.searchFilterToLocalFilters(filter));
    }
  }));

  const onChangeFilterWrapper = useCallback((key: string, value?: string[] | SearchProperties | SearchFeatures | SearchSortingProperty | ("-1" | "1")) =>
  {
    setFilters((previousLocalFilters: LocalFiltersType | undefined) =>
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
  }, [ setFilters ]);

  useEffect(() =>
  {
    const updatedSearchFilter = filters === undefined ? undefined : FiltersService.localFiltersToSearchFilter(filters);
    if (updatedSearchFilter !== undefined)
    {
      onFilterOrCollectionId({ filter: updatedSearchFilter });
    }
  }, [ filters, onFilterOrCollectionId ]);

  function handleOnClearAll()
  {
    setFilters(FiltersService.searchFilterToLocalFilters(FiltersService.defaultFilter));
    onClearAll();
  }

  const toggleSortOrder = () =>
  {
    onChangeFilterWrapper("sortOrder", filters?.sortOrder === "1" ? "-1" : "1");
  };

  const sortWidth = 160;
  return (
    <Flex gap="xs" align="end">
      {children}
      <Button.Group>
        <Menu shadow="md" width={sortWidth} position="bottom" trigger="click-hover" opened={sortingMenuOpened}
              onChange={setSortingMenuOpened}>
          <Menu.Target>
            <Button variant="default" w={sortWidth}
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
      {filters?.images === undefined && <Box flex={1} miw={0}>
        <SearchFilters
          filters={filters}
          setFilters={setFilters}
          onChangeFilterWrapper={onChangeFilterWrapper}
          onClearAll={handleOnClearAll}
        />
      </Box>}
    </Flex>
  );
});
FiltersBar.displayName = "FiltersBar";
