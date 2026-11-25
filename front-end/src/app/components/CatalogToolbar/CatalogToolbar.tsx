import { ReactElement, ReactNode } from "react";
import { Box, Flex, MantineSpacing } from "@mantine/core";

import { CatalogViewModeType } from "types";
import CountedSegmentedControl, {
  CountedSegmentedControlItemType
} from "../CountedSegmentedControl/CountedSegmentedControl.tsx";
import SearchInput from "../SearchInput/SearchInput.tsx";
import SortControl, { SortCriterionOptionType } from "../SortControl/SortControl.tsx";
import ViewModeSwitch from "../ViewModeSwitch/ViewModeSwitch.tsx";


type CatalogToolbarPropsType<TSegment extends string, TSort extends string> = {
  readonly searchText: string;
  readonly searchPlaceholder: string;
  readonly onSearchTextChange: (searchText: string) => void;
  readonly segmentValue: TSegment;
  readonly segmentItems: readonly CountedSegmentedControlItemType<TSegment>[];
  readonly onSegmentChange: (value: TSegment) => void;
  readonly extraFilters?: ReactNode;
  readonly viewMode: CatalogViewModeType;
  readonly onViewModeChange: (viewMode: CatalogViewModeType) => void;
  readonly sortCriteria: readonly SortCriterionOptionType<TSort>[];
  readonly sortCriterion: TSort;
  readonly isSortAscending: boolean;
  readonly onSortCriterionChange: (criterion: TSort) => void;
  readonly onSortDirectionToggle: () => void;
  readonly sortMenuWidth?: number;
  readonly gap?: MantineSpacing;
};

export default function CatalogToolbar<TSegment extends string, TSort extends string>({
  searchText,
  searchPlaceholder,
  onSearchTextChange,
  segmentValue,
  segmentItems,
  onSegmentChange,
  extraFilters,
  viewMode,
  onViewModeChange,
  sortCriteria,
  sortCriterion,
  isSortAscending,
  onSortCriterionChange,
  onSortDirectionToggle,
  sortMenuWidth,
  gap = "sm"
}: CatalogToolbarPropsType<TSegment, TSort>): ReactElement
{
  return (
    <Flex gap={gap} align="center" wrap="wrap">
      <SearchInput
        value={searchText}
        onChange={onSearchTextChange}
        placeholder={searchPlaceholder}
      />
      <CountedSegmentedControl
        value={segmentValue}
        onChange={onSegmentChange}
        items={segmentItems}
      />
      {extraFilters}
      <Box flex={1}/>
      <Flex gap="xs" align="center" wrap="wrap">
        <ViewModeSwitch value={viewMode} onChange={onViewModeChange}/>
        <SortControl
          criteria={sortCriteria}
          value={sortCriterion}
          isAscending={isSortAscending}
          onCriterionChange={onSortCriterionChange}
          onDirectionToggle={onSortDirectionToggle}
          menuWidth={sortMenuWidth}
        />
      </Flex>
    </Flex>
  );
}
