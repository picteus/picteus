import { ReactElement, useMemo } from "react";
import { IconActivity, IconLetterCase } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { ExtensionCategory } from "@picteus/ws-client";

import { CatalogViewModeType, ExtensionsInstallScopeType, ExtensionsSortCriterionType } from "types";
import { ExtensionFilterableStatusType } from "app/services";
import { CatalogToolbar, Common, CountedSegmentedControlItemType, SortCriterionOptionType } from "app/components";
import ExtensionsFiltersPopover from "../ExtensionsFiltersPopover/ExtensionsFiltersPopover.tsx";


export type ExtensionsScopeCountsType = {
  readonly installed: number;
  readonly notInstalled: number;
  readonly all: number;
};

type ExtensionsToolbarPropsType = {
  readonly searchText: string;
  readonly onSearchTextChange: (searchText: string) => void;
  readonly installScope: ExtensionsInstallScopeType;
  readonly onInstallScopeChange: (installScope: ExtensionsInstallScopeType) => void;
  readonly scopeCounts: ExtensionsScopeCountsType;
  readonly selectedCategories: ExtensionCategory[];
  readonly selectedStatuses: ExtensionFilterableStatusType[];
  readonly categoryCounts: Record<ExtensionCategory, number>;
  readonly statusCounts: Record<ExtensionFilterableStatusType, number>;
  readonly onToggleCategory: (category: ExtensionCategory) => void;
  readonly onToggleStatus: (status: ExtensionFilterableStatusType) => void;
  readonly onClearFilters: () => void;
  readonly viewMode: CatalogViewModeType;
  readonly onViewModeChange: (viewMode: CatalogViewModeType) => void;
  readonly sortCriterion: ExtensionsSortCriterionType;
  readonly isSortAscending: boolean;
  readonly onSortCriterionChange: (criterion: ExtensionsSortCriterionType) => void;
  readonly onSortDirectionToggle: () => void;
};

export default function ExtensionsToolbar({
  searchText,
  onSearchTextChange,
  installScope,
  onInstallScopeChange,
  scopeCounts,
  selectedCategories,
  selectedStatuses,
  categoryCounts,
  statusCounts,
  onToggleCategory,
  onToggleStatus,
  onClearFilters,
  viewMode,
  onViewModeChange,
  sortCriterion,
  isSortAscending,
  onSortCriterionChange,
  onSortDirectionToggle
}: ExtensionsToolbarPropsType): ReactElement
{
  const [ t ] = useTranslation();

  const scopeItems = useMemo<readonly CountedSegmentedControlItemType<ExtensionsInstallScopeType>[]>(() => [
    { value: "all", label: t("extensionsScreen.scope.all"), count: scopeCounts.all },
    { value: "installed", label: t("extensionsScreen.scope.installed"), count: scopeCounts.installed },
    { value: "notInstalled", label: t("extensionsScreen.scope.notInstalled"), count: scopeCounts.notInstalled }
  ], [ scopeCounts.all, scopeCounts.installed, scopeCounts.notInstalled, t ]);

  const sortCriteria = useMemo<readonly SortCriterionOptionType<ExtensionsSortCriterionType>[]>(() => [
    {
      value: "name",
      label: t("field.name"),
      icon: <IconLetterCase size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/>
    },
    {
      value: "status",
      label: t("field.status"),
      icon: <IconActivity size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/>
    }
  ], [ t ]);

  return (
    <CatalogToolbar
      searchText={searchText}
      searchPlaceholder={t("extensionsScreen.searchPlaceholder")}
      onSearchTextChange={onSearchTextChange}
      segmentValue={installScope}
      segmentItems={scopeItems}
      onSegmentChange={onInstallScopeChange}
      extraFilters={(
        <ExtensionsFiltersPopover
          installScope={installScope}
          selectedCategories={selectedCategories}
          selectedStatuses={selectedStatuses}
          categoryCounts={categoryCounts}
          statusCounts={statusCounts}
          onToggleCategory={onToggleCategory}
          onToggleStatus={onToggleStatus}
          onClearAll={onClearFilters}
        />
      )}
      viewMode={viewMode}
      onViewModeChange={onViewModeChange}
      sortCriteria={sortCriteria}
      sortCriterion={sortCriterion}
      isSortAscending={isSortAscending}
      onSortCriterionChange={onSortCriterionChange}
      onSortDirectionToggle={onSortDirectionToggle}
    />
  );
}
