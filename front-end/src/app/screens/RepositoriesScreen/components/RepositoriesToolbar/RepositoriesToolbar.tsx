import { ReactElement, useMemo } from "react";
import { IconCalendarPlus, IconLetterCase, IconPhoto } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { CatalogViewModeType, RepositoriesOriginFilterType, RepositoriesSortCriterionType } from "types";
import { CatalogToolbar, Common, CountedSegmentedControlItemType, SortCriterionOptionType } from "app/components";


type OriginCountsType = {
  readonly all: number;
  readonly user: number;
  readonly extensions: number;
};

type RepositoriesToolbarPropsType = {
  readonly searchText: string;
  readonly onSearchTextChange: (searchText: string) => void;
  readonly originFilter: RepositoriesOriginFilterType;
  readonly onOriginFilterChange: (originFilter: RepositoriesOriginFilterType) => void;
  readonly originCounts: OriginCountsType;
  readonly viewMode: CatalogViewModeType;
  readonly onViewModeChange: (viewMode: CatalogViewModeType) => void;
  readonly sortCriterion: RepositoriesSortCriterionType;
  readonly isSortAscending: boolean;
  readonly onSortCriterionChange: (criterion: RepositoriesSortCriterionType) => void;
  readonly onSortDirectionToggle: () => void;
};

export default function RepositoriesToolbar({
  searchText,
  onSearchTextChange,
  originFilter,
  onOriginFilterChange,
  originCounts,
  viewMode,
  onViewModeChange,
  sortCriterion,
  isSortAscending,
  onSortCriterionChange,
  onSortDirectionToggle
}: RepositoriesToolbarPropsType): ReactElement
{
  const [ t ] = useTranslation();

  const originItems = useMemo<readonly CountedSegmentedControlItemType<RepositoriesOriginFilterType>[]>(() => [
    { value: "all", label: t("repositoryScreen.origin.all"), count: originCounts.all },
    { value: "user", label: t("repositoryScreen.origin.user"), count: originCounts.user },
    { value: "extensions", label: t("repositoryScreen.origin.extensions"), count: originCounts.extensions }
  ], [ originCounts.all, originCounts.extensions, originCounts.user, t ]);

  const sortCriteria = useMemo<readonly SortCriterionOptionType<RepositoriesSortCriterionType>[]>(() => [
    {
      value: "name",
      label: t("field.name"),
      icon: <IconLetterCase size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/>
    },
    {
      value: "imageCount",
      label: t("field.imageCount"),
      icon: <IconPhoto size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/>
    },
    {
      value: "createdOn",
      label: t("field.createdOn"),
      icon: <IconCalendarPlus size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/>
    }
  ], [ t ]);

  return (
    <CatalogToolbar
      gap="md"
      searchText={searchText}
      searchPlaceholder={t("repositoryScreen.searchPlaceholder")}
      onSearchTextChange={onSearchTextChange}
      segmentValue={originFilter}
      segmentItems={originItems}
      onSegmentChange={onOriginFilterChange}
      viewMode={viewMode}
      onViewModeChange={onViewModeChange}
      sortCriteria={sortCriteria}
      sortCriterion={sortCriterion}
      isSortAscending={isSortAscending}
      onSortCriterionChange={onSortCriterionChange}
      onSortDirectionToggle={onSortDirectionToggle}
      sortMenuWidth={200}
    />
  );
}
