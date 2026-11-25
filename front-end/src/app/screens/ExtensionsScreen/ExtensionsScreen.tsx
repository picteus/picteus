import { ReactElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Stack } from "@mantine/core";
import { IconBox, IconPuzzle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import {
  Extension,
  ExtensionActivity as ApiExtensionActivity,
  ExtensionCategory,
  ExtensionState,
  MarketplaceExtension
} from "@picteus/ws-client";

import {
  ContentIconType,
  ExtensionsInstallScopeType,
  ExtensionsSortCriterionType,
  ExtensionsViewSettingsType
} from "types";
import { ToastService } from "utils";
import { useActionModalContext } from "app/context";
import {
  useCatalogViewSettings,
  useExtensionActivities,
  useExtensionLifecycleActions,
  useExtensions,
  useMarketplaceExtensions,
  useSynchronizeExtension
} from "app/hooks";
import {
  ExtensionFilterableStatusType,
  ExtensionsService,
  StorageService,
  UnifiedExtensionItemType
} from "app/services";
import {
  CatalogScreenLayout,
  Common,
  EmptyResults,
  ExtensionPage,
  ExtensionPageTabType,
  ExtensionSettingsModal,
  OpenExtensionNavigationStateType,
  StackableScreen,
  useStackNavigator
} from "app/components";
import {
  CreateExtensionModal,
  ExtensionsActiveFiltersBar,
  ExtensionsGrid,
  ExtensionsHeader,
  ExtensionsScopeCountsType,
  ExtensionsTable,
  ExtensionsToolbar
} from "./components";


export default function ExtensionsScreen(): ReactElement
{
  const [ t ] = useTranslation();

  return (
    <StackableScreen title={t("menu.extensions")} icon={IconPuzzle}>
      <ExtensionsScreenContent/>
    </StackableScreen>
  );
}

function ExtensionsScreenContent(): ReactElement
{
  const [ t ] = useTranslation();
  const {
    data: extensions = [],
    isLoading,
    isFetching,
    refetch: refetchExtensions
  } = useExtensions();
  const {
    data: marketplaceExtensions = [],
    isLoading: isMarketplaceLoading,
    isFetching: isMarketplaceFetching,
    isError: isMarketplaceError,
    error: marketplaceError,
    refetch: refetchMarketplace
  } = useMarketplaceExtensions();
  const { data: activities = [], refetch: refetchActivities } = useExtensionActivities();

  const {
    installingIds,
    updatingIds,
    togglingIds,
    uninstallingIds,
    installMarketplaceExtension,
    toggleExtensionState,
    updateMarketplaceExtension,
    openInstallOrUpdateModal,
    uninstallExtension
  } = useExtensionLifecycleActions();
  const synchronizeExtension = useSynchronizeExtension();
  const { addModal } = useActionModalContext();
  const stackNavigator = useStackNavigator();

  const {
    viewSettings,
    updateSettings,
    setViewMode,
    setSortCriterion,
    toggleSortDirection,
    handleHeaderSort
  } = useCatalogViewSettings<ExtensionsViewSettingsType, ExtensionsSortCriterionType>({
    load: StorageService.getExtensionsViewSettings,
    save: StorageService.setExtensionsViewSettings
  });

  const setInstallScope = useCallback((installScope: ExtensionsInstallScopeType): void =>
  {
    updateSettings(previous => ({ ...previous, installScope }));
  }, [ updateSettings ]);

  const [ searchText, setSearchText ] = useState<string>("");
  const [ selectedCategories, setSelectedCategories ] = useState<ExtensionCategory[]>([]);
  const [ selectedStatuses, setSelectedStatuses ] = useState<ExtensionFilterableStatusType[]>([]);

  useEffect(() =>
  {
    if (marketplaceError)
    {
      ToastService.failureAndMessage(marketplaceError, t("extensionsScreen.errorLoading"));
    }
  }, [ marketplaceError, t ]);

  const refetchAll = useCallback((): void =>
  {
    void refetchExtensions();
    void refetchMarketplace();
    void refetchActivities();
  }, [ refetchExtensions, refetchMarketplace, refetchActivities ]);

  const activitiesById = useMemo<Map<string, ApiExtensionActivity>>(
    () => new Map(activities.map(activity => [ activity.id, activity ])),
    [ activities ]
  );

  const allItems = useMemo<UnifiedExtensionItemType[]>(() =>
  {
    const availableMarketplace = isMarketplaceError === true ? [] : marketplaceExtensions;
    const marketplaceById = new Map<string, MarketplaceExtension>(
      availableMarketplace.map(marketplaceExtension => [ marketplaceExtension.manifest.id, marketplaceExtension ])
    );
    const installedIds = new Set<string>();
    const items: UnifiedExtensionItemType[] = [];

    for (const extension of extensions)
    {
      const id = extension.manifest.id;
      installedIds.add(id);
      const marketplaceExtension = marketplaceById.get(id);
      const activity = activitiesById.get(id);
      items.push({
        id,
        manifest: extension.manifest,
        extension,
        marketplaceExtension,
        activity,
        isInstalled: true,
        status: ExtensionsService.deriveStatus(extension, activity, installingIds.has(id), updatingIds.has(id)),
        availableUpdateVersion: ExtensionsService.findMarketplaceUpdateVersion(extension, marketplaceExtension)
      });
    }

    for (const marketplaceExtension of availableMarketplace)
    {
      const id = marketplaceExtension.manifest.id;
      if (installedIds.has(id) === true)
      {
        continue;
      }
      items.push({
        id,
        manifest: marketplaceExtension.manifest,
        marketplaceExtension,
        isInstalled: false,
        status: ExtensionsService.deriveStatus(undefined, undefined, installingIds.has(id), updatingIds.has(id))
      });
    }

    return items;
  }, [ extensions, marketplaceExtensions, isMarketplaceError, activitiesById, installingIds, updatingIds ]);

  const scopeCounts = useMemo<ExtensionsScopeCountsType>(() =>
  {
    let installed = 0;
    let notInstalled = 0;
    for (const item of allItems)
    {
      if (item.isInstalled === true)
      {
        installed += 1;
      }
      else
      {
        notInstalled += 1;
      }
    }
    return {
      installed,
      notInstalled,
      all: allItems.length
    };
  }, [ allItems ]);

  const scopedItems = useMemo<UnifiedExtensionItemType[]>(() =>
  {
    if (viewSettings.installScope === "installed")
    {
      return allItems.filter(item => item.isInstalled === true);
    }
    if (viewSettings.installScope === "notInstalled")
    {
      return allItems.filter(item => item.isInstalled === false);
    }
    return allItems;
  }, [ allItems, viewSettings.installScope ]);

  const scopedSearchItems = useMemo<UnifiedExtensionItemType[]>(() =>
  {
    const normalizedSearch = searchText.trim().toLowerCase();
    if (normalizedSearch.length === 0)
    {
      return scopedItems;
    }
    return scopedItems.filter(item => ExtensionsService.matchesSearch(item.manifest, normalizedSearch));
  }, [ scopedItems, searchText ]);

  const effectiveStatuses = useMemo<ExtensionFilterableStatusType[]>(
    () => (viewSettings.installScope === "notInstalled" ? [] : selectedStatuses),
    [ viewSettings.installScope, selectedStatuses ]
  );

  const categoryCounts = useMemo<Record<ExtensionCategory, number>>(() =>
  {
    const counts = {} as Record<ExtensionCategory, number>;
    for (const category of ExtensionsService.allExtensionCategories)
    {
      counts[category] = 0;
    }
    const statusFilteredItems = effectiveStatuses.length === 0
      ? scopedSearchItems
      : scopedSearchItems.filter(item => effectiveStatuses.includes(item.status as ExtensionFilterableStatusType));

    for (const item of statusFilteredItems)
    {
      for (const category of item.manifest.categories)
      {
        if (counts[category] !== undefined)
        {
          counts[category] += 1;
        }
      }
    }
    return counts;
  }, [ scopedSearchItems, effectiveStatuses ]);

  const statusCounts = useMemo<Record<ExtensionFilterableStatusType, number>>(() =>
  {
    const counts: Record<ExtensionFilterableStatusType, number> = {
      running: 0,
      starting: 0,
      paused: 0,
      error: 0
    };
    const categoryFilteredItems = selectedCategories.length === 0
      ? scopedSearchItems
      : scopedSearchItems.filter(item =>
        item.manifest.categories.some(category => selectedCategories.includes(category))
      );

    for (const item of categoryFilteredItems)
    {
      if (ExtensionsService.filterableExtensionStatuses.includes(item.status as ExtensionFilterableStatusType))
      {
        counts[item.status as ExtensionFilterableStatusType] += 1;
      }
    }
    return counts;
  }, [ scopedSearchItems, selectedCategories ]);

  const visibleItems = useMemo<UnifiedExtensionItemType[]>(() =>
  {
    const filtered = scopedSearchItems.filter(item =>
    {
      if (selectedCategories.length > 0 &&
        item.manifest.categories.some(category => selectedCategories.includes(category)) === false)
      {
        return false;
      }
      return !(effectiveStatuses.length > 0 && effectiveStatuses.includes(item.status as ExtensionFilterableStatusType) === false);
    });

    return [ ...filtered ].sort((firstItem, secondItem) =>
      ExtensionsService.compareItems(firstItem, secondItem, viewSettings.sortCriterion, viewSettings.isSortAscending)
    );
  }, [
    scopedSearchItems,
    selectedCategories,
    effectiveStatuses,
    viewSettings.sortCriterion,
    viewSettings.isSortAscending
  ]);

  const handleToggleCategory = useCallback((category: ExtensionCategory): void =>
  {
    setSelectedCategories(previous =>
      previous.includes(category)
        ? previous.filter(existing => existing !== category)
        : [ ...previous, category ]
    );
  }, []);

  const handleToggleStatus = useCallback((status: ExtensionFilterableStatusType): void =>
  {
    setSelectedStatuses(previous =>
      previous.includes(status)
        ? previous.filter(existing => existing !== status)
        : [ ...previous, status ]
    );
  }, []);

  const handleClearFilters = useCallback((): void =>
  {
    setSelectedCategories([]);
    setSelectedStatuses([]);
  }, []);

  const handleClearAllFiltersAndSearch = useCallback((): void =>
  {
    setSearchText("");
    setSelectedCategories([]);
    setSelectedStatuses([]);
  }, []);

  const pushStackedExtension = useCallback((
    extensionId: string,
    title: string,
    icon: ContentIconType,
    initialTab: ExtensionPageTabType = "overview",
    initialMarketplaceExtension?: MarketplaceExtension
  ): void =>
  {
    stackNavigator.push({
      id: `extension-${extensionId}-${initialTab}`,
      title,
      icon,
      body: (
        <ExtensionPage
          extensionId={extensionId}
          initialTab={initialTab}
          initialMarketplaceExtension={initialMarketplaceExtension}
        />
      )
    });
  }, [ stackNavigator ]);

  const handleOpenConfiguration = useCallback((extension: Extension): void =>
  {
    if (ExtensionsService.hasSettings(extension) === false)
    {
      pushStackedExtension(
        extension.manifest.id,
        extension.manifest.name,
        { url: ExtensionsService.getIconURL(extension.manifest.id) },
        "aiModels"
      );
      return;
    }
    if (extension.state !== ExtensionState.Enabled)
    {
      return;
    }

    addModal({
      title: t("extensionSettingsModal.title", { name: extension.manifest.name }),
      icon: { url: ExtensionsService.getIconURL(extension.manifest.id) },
      size: "m",
      body: (
        <ExtensionSettingsModal
          extension={extension}
          onSuccess={refetchAll}
          onOpenFullPage={() =>
          {
            pushStackedExtension(
              extension.manifest.id,
              extension.manifest.name,
              { url: ExtensionsService.getIconURL(extension.manifest.id) },
              "settings"
            );
          }}
        />
      )
    });
  }, [ addModal, pushStackedExtension, refetchAll, t ]);

  const handleOpenInstallOrUpdateModal = useCallback((extension?: Extension): void =>
  {
    openInstallOrUpdateModal(extension, {
      onSuccess: (extensionItem: Extension) =>
      {
        if (extensionItem.state === ExtensionState.Enabled && ExtensionsService.hasSettings(extensionItem) === true)
        {
          handleOpenConfiguration(extensionItem);
        }
      }
    });
  }, [ handleOpenConfiguration, openInstallOrUpdateModal ]);

  const handleOpenExtension = useCallback((item: UnifiedExtensionItemType): void =>
  {
    const icon: ContentIconType = item.isInstalled === true
      ? { url: ExtensionsService.getIconURL(item.id) }
      : (item.marketplaceExtension?.icon !== undefined
        ? { url: item.marketplaceExtension.icon }
        : { icon: IconPuzzle });

    pushStackedExtension(item.id, item.manifest.name, icon, "overview", item.marketplaceExtension);
  }, [ pushStackedExtension ]);

  const location = useLocation();
  const navigate = useNavigate();
  const handledNavigationTimestampRef = useRef<number | undefined>(undefined);

  useEffect(() =>
  {
    const navigationState = location.state as OpenExtensionNavigationStateType | null;
    const targetExtensionId = navigationState?.openExtensionId;
    if (targetExtensionId === undefined || targetExtensionId.length === 0)
    {
      return;
    }
    const requestKey = navigationState?.requestTimestamp ?? 0;
    if (handledNavigationTimestampRef.current === requestKey && requestKey !== 0)
    {
      return;
    }

    const matchedItem = allItems.find(item => item.id === targetExtensionId);
    if (matchedItem === undefined && (isLoading === true || isMarketplaceLoading === true))
    {
      return;
    }

    handledNavigationTimestampRef.current = requestKey;
    const title = matchedItem?.manifest.name ?? targetExtensionId;
    const icon: ContentIconType = matchedItem?.isInstalled === true
      ? { url: ExtensionsService.getIconURL(targetExtensionId) }
      : (matchedItem?.marketplaceExtension?.icon !== undefined
        ? { url: matchedItem.marketplaceExtension.icon }
        : { icon: IconPuzzle });

    pushStackedExtension(
      targetExtensionId,
      title,
      icon,
      navigationState?.initialTab ?? "overview",
      matchedItem?.marketplaceExtension
    );
    navigate(location.pathname, { replace: true, state: null });
  }, [ location.pathname, location.state, allItems, isLoading, isMarketplaceLoading, pushStackedExtension, navigate ]);

  const handleOpenCreateExtensionModal = useCallback((): void =>
  {
    addModal({
      title: t("createExtensionModal.title"),
      icon: {
        icon: <IconBox stroke={Common.IconStrokeSize}/>
      },
      size: "m",
      body: (
        <CreateExtensionModal
          onSuccess={(createdExtension: Extension) =>
          {
            pushStackedExtension(
              createdExtension.manifest.id,
              createdExtension.manifest.name,
              { url: ExtensionsService.getIconURL(createdExtension.manifest.id) }
            );
          }}
        />
      )
    });
  }, [ addModal, pushStackedExtension, t ]);

  const isBusyLoading = isLoading === true || isFetching === true || isMarketplaceLoading === true || isMarketplaceFetching === true;
  const isInitialLoading = isLoading === true || isMarketplaceLoading === true;
  const hasActiveFiltersOrSearch = searchText.trim().length > 0 || selectedCategories.length > 0 || effectiveStatuses.length > 0;

  return (
    <CatalogScreenLayout
      header={(
        <ExtensionsHeader
          extensionsCount={scopeCounts.installed}
          onCreateExtension={handleOpenCreateExtensionModal}
          onInstallExtension={() => handleOpenInstallOrUpdateModal()}
        />
      )}
      toolbar={(
        <Stack gap="xs">
          <ExtensionsToolbar
            searchText={searchText}
            onSearchTextChange={setSearchText}
            installScope={viewSettings.installScope}
            onInstallScopeChange={setInstallScope}
            scopeCounts={scopeCounts}
            selectedCategories={selectedCategories}
            selectedStatuses={selectedStatuses}
            categoryCounts={categoryCounts}
            statusCounts={statusCounts}
            onToggleCategory={handleToggleCategory}
            onToggleStatus={handleToggleStatus}
            onClearFilters={handleClearFilters}
            viewMode={viewSettings.viewMode}
            onViewModeChange={setViewMode}
            sortCriterion={viewSettings.sortCriterion}
            isSortAscending={viewSettings.isSortAscending}
            onSortCriterionChange={setSortCriterion}
            onSortDirectionToggle={toggleSortDirection}
          />
          <ExtensionsActiveFiltersBar
            installScope={viewSettings.installScope}
            selectedCategories={selectedCategories}
            selectedStatuses={selectedStatuses}
            shownCount={visibleItems.length}
            totalCount={scopedItems.length}
            onClearCategories={() => setSelectedCategories([])}
            onClearStatuses={() => setSelectedStatuses([])}
            onClearAllFilters={handleClearFilters}
          />
        </Stack>
      )}
      isInitialLoading={isInitialLoading}
      isBusyLoading={isBusyLoading}
      totalCount={allItems.length}
      visibleCount={visibleItems.length}
      hasActiveFilters={hasActiveFiltersOrSearch}
      emptyIcon={IconPuzzle}
      emptyState={{
        title: t("emptyExtensions.title"),
        description: t("emptyExtensions.description"),
        buttonText: t("emptyExtensions.buttonText"),
        buttonAction: () => handleOpenInstallOrUpdateModal()
      }}
      filteredEmptyState={{
        title: t("extensionsScreen.emptyFiltered.title"),
        description: t("extensionsScreen.emptyFiltered.description"),
        clearButtonText: t("extensionsScreen.filters.clearFilters"),
        onClear: handleClearAllFiltersAndSearch
      }}
      emptyScopeFallback={
        viewSettings.installScope === "installed" && scopeCounts.installed === 0 ? (
          <EmptyResults
            icon={IconPuzzle}
            isSmall={true}
            title={t("emptyExtensions.title")}
            description={t("emptyExtensions.description")}
            buttonText={t("emptyExtensions.buttonText")}
            buttonAction={() => handleOpenInstallOrUpdateModal()}
          />
        ) : undefined
      }
    >
      {viewSettings.viewMode === "cards" ? (
        <ExtensionsGrid
          items={visibleItems}
          togglingIds={togglingIds}
          installingIds={installingIds}
          updatingIds={updatingIds}
          uninstallingIds={uninstallingIds}
          onOpen={handleOpenExtension}
          onToggleState={extension => void toggleExtensionState(extension)}
          onInstall={installMarketplaceExtension}
          onMarketplaceUpdate={updateMarketplaceExtension}
          onManualUpdate={handleOpenInstallOrUpdateModal}
          onSettings={handleOpenConfiguration}
          onSynchronize={synchronizeExtension}
          onUninstall={uninstallExtension}
        />
      ) : (
        <ExtensionsTable
          items={visibleItems}
          sortCriterion={viewSettings.sortCriterion}
          isSortAscending={viewSettings.isSortAscending}
          togglingIds={togglingIds}
          installingIds={installingIds}
          updatingIds={updatingIds}
          uninstallingIds={uninstallingIds}
          onSort={handleHeaderSort}
          onOpen={handleOpenExtension}
          onToggleState={extension => void toggleExtensionState(extension)}
          onInstall={installMarketplaceExtension}
          onMarketplaceUpdate={updateMarketplaceExtension}
          onManualUpdate={handleOpenInstallOrUpdateModal}
          onSettings={handleOpenConfiguration}
          onSynchronize={synchronizeExtension}
          onUninstall={uninstallExtension}
        />
      )}
    </CatalogScreenLayout>
  );
}
