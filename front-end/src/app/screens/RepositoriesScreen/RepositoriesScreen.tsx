import { ReactElement, useCallback, useEffect, useMemo, useState } from "react";
import { Stack } from "@mantine/core";
import { IconFolderOpen, IconFolderSearch } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Repository, RepositoryActivity } from "@picteus/ws-client";

import { FolderTypes, RepositoriesSortCriterionType, RepositoriesViewSettingsType } from "types";
import { computeMainRoute, computeRepositoryRoute } from "utils";
import { useActionModalContext } from "app/context";
import {
  useCatalogViewSettings,
  useFolderPicker,
  useOpenWindow,
  useRepositories,
  useRepositoriesImageCounts,
  useRepositoryActivities
} from "app/hooks";
import { RepositoriesService, StorageService } from "app/services";
import {
  CatalogScreenLayout,
  Common,
  Drawer,
  EntityIcons,
  LoadingView,
  RepositoryIdentity,
  StackableScreen,
  useStackNavigator
} from "app/components";
import RepositoryImagesScreen from "../RepositoryImagesScreen/RepositoryImagesScreen.tsx";
import {
  AddOrUpdateRepository,
  FirstLaunchSlot,
  RepositoriesGrid,
  RepositoriesHeader,
  RepositoriesTable,
  RepositoriesToolbar,
  RepositoryDrawerContent,
  RepositoryMenu
} from "./components";


export default function RepositoriesScreen(): ReactElement
{
  return (
    <StackableScreen screen="repositories">
      <RepositoriesScreenContent/>
    </StackableScreen>
  );
}

function RepositoriesScreenContent(): ReactElement
{
  const [ t ] = useTranslation();
  const { data: repositories = [], isLoading, isFetching } = useRepositories();
  const { data: activities = [] } = useRepositoryActivities();
  const [ selectedRepository, setSelectedRepository ] = useState<Repository>();
  const { addModal } = useActionModalContext();
  const openFolderPicker = useFolderPicker();
  const stackNavigator = useStackNavigator();
  const openWindow = useOpenWindow();

  const {
    viewSettings,
    updateSettings,
    setViewMode,
    setSortCriterion,
    toggleSortDirection,
    handleHeaderSort
  } = useCatalogViewSettings<RepositoriesViewSettingsType, RepositoriesSortCriterionType>({
    load: StorageService.getRepositoriesViewSettings,
    save: StorageService.setRepositoriesViewSettings,
    // A new criterion starts with its natural direction: A to Z for the name, most first for counts and dates
    getDefaultAscending: criterion => criterion === "name"
  });

  useEffect(() =>
  {
    if (selectedRepository)
    {
      const updated = repositories.find(repositoryItem => repositoryItem.id === selectedRepository.id);
      if (updated && updated !== selectedRepository)
      {
        setSelectedRepository(updated);
      }
      else if (!updated)
      {
        setSelectedRepository(undefined);
      }
    }
  }, [ repositories, selectedRepository ]);

  const activitiesByRepositoryId = useMemo(
    () => new Map<string, RepositoryActivity>(activities.map(activity => [ activity.id, activity ])),
    [ activities ]
  );

  const imageCounts = useRepositoriesImageCounts(repositories);

  const originCounts = useMemo(
    () => ({
      all: repositories.length,
      user: repositories.filter(repository => RepositoriesService.isFromExtension(repository) === false).length,
      extensions: repositories.filter(repository => RepositoriesService.isFromExtension(repository) === true).length
    }),
    [ repositories ]
  );

  const visibleRepositories = useMemo(
    () =>
    {
      const searchText = viewSettings.searchText.trim().toLowerCase();
      const filtered = repositories.filter(repository =>
      {
        if (viewSettings.originFilter === "user" && RepositoriesService.isFromExtension(repository) === true)
        {
          return false;
        }
        if (viewSettings.originFilter === "extensions" && RepositoriesService.isFromExtension(repository) === false)
        {
          return false;
        }
        return !(searchText !== "" && repository.name.toLowerCase().includes(searchText) === false && (repository.comment ?? "").toLowerCase().includes(searchText) === false);
      });
      const direction = viewSettings.isSortAscending === true ? 1 : -1;
      return filtered.sort((repositoryA, repositoryB) =>
      {
        switch (viewSettings.sortCriterion)
        {
          case "name":
            return direction * repositoryA.name.localeCompare(repositoryB.name);
          case "createdOn":
            return direction * (repositoryA.creationDate - repositoryB.creationDate);
          case "imageCount":
            return direction * ((imageCounts[repositoryA.id] ?? -1) - (imageCounts[repositoryB.id] ?? -1));
        }
      });
    },
    [ repositories, viewSettings, imageCounts ]
  );

  const showFirstLaunchSlot = repositories.length > 0 && originCounts.user === 0;

  function nothing(): void
  {
  }

  function handleOnViewImages(repository: Repository): void
  {
    setSelectedRepository(undefined);
    stackNavigator.push({
      title: repository.name,
      icon: { icon: EntityIcons.repository },
      body: <RepositoryImagesScreen repositoryId={repository.id}/>
    });
  }

  function handleOnOpenInNewWindow(repository: Repository): void
  {
    const url = `${computeMainRoute()}${computeRepositoryRoute(repository.id)}`;
    void openWindow(`repository-${repository.id}`, { url }, false);
  }

  function openAddOrUpdateRepositoryModal(repository?: Repository, initialUrl?: string): void
  {
    addModal({
      title: t(`addOrUpdateRepositoryModal.${repository ? "updateTitle" : "addTitle"}`),
      icon: { icon: <IconFolderOpen stroke={Common.IconStrokeSize}/> },
      size: "m",
      body: <AddOrUpdateRepository repository={repository} initialUrl={initialUrl}/>
    });
  }

  async function handleOnChooseFolder(): Promise<void>
  {
    const directoryPath = await openFolderPicker(FolderTypes.REPOSITORY);
    if (directoryPath === undefined || directoryPath === "")
    {
      return;
    }
    openAddOrUpdateRepositoryModal(undefined, directoryPath);
  }

  const handleOnSearchTextChange = useCallback((searchText: string): void =>
  {
    updateSettings(previous => ({ ...previous, searchText }));
  }, [ updateSettings ]);

  const handleOnOriginFilterChange = useCallback((originFilter: RepositoriesViewSettingsType["originFilter"]): void =>
  {
    updateSettings(previous => ({ ...previous, originFilter }));
  }, [ updateSettings ]);

  const isBusyLoading = isLoading === true || isFetching === true;
  const hasSearchText = viewSettings.searchText.trim().length > 0;

  return (
    <>
      <CatalogScreenLayout
        header={(
          <RepositoriesHeader
            repositoriesCount={repositories.length}
            onAddRepository={() => openAddOrUpdateRepositoryModal()}
          />
        )}
        toolbar={(
          <RepositoriesToolbar
            searchText={viewSettings.searchText}
            onSearchTextChange={handleOnSearchTextChange}
            originFilter={viewSettings.originFilter}
            onOriginFilterChange={handleOnOriginFilterChange}
            originCounts={originCounts}
            viewMode={viewSettings.viewMode}
            onViewModeChange={setViewMode}
            sortCriterion={viewSettings.sortCriterion}
            isSortAscending={viewSettings.isSortAscending}
            onSortCriterionChange={setSortCriterion}
            onSortDirectionToggle={toggleSortDirection}
          />
        )}
        isInitialLoading={isLoading}
        isBusyLoading={isBusyLoading}
        totalCount={repositories.length}
        visibleCount={visibleRepositories.length}
        hasActiveFilters={hasSearchText}
        emptyIcon={IconFolderSearch}
        emptyState={{
          title: t("emptyRepositories.title"),
          description: t("emptyRepositories.description"),
          buttonText: t("emptyRepositories.buttonText"),
          buttonAction: () => openAddOrUpdateRepositoryModal()
        }}
        filteredEmptyState={{
          title: t("repositoryScreen.emptyFiltered.title"),
          description: t("repositoryScreen.emptyFiltered.description"),
          clearButtonText: t("button.clearSearch"),
          onClear: () => handleOnSearchTextChange("")
        }}
        emptyScopeFallback={
          showFirstLaunchSlot === true ? (
            <LoadingView visible={isBusyLoading}>
              <FirstLaunchSlot onChooseFolder={() => void handleOnChooseFolder()}/>
            </LoadingView>
          ) : undefined
        }
      >
        <Stack gap="lg">
          {showFirstLaunchSlot === true && (
            <FirstLaunchSlot onChooseFolder={() => void handleOnChooseFolder()}/>
          )}
          {viewSettings.viewMode === "cards" ? (
            <RepositoriesGrid
              repositories={visibleRepositories}
              imageCounts={imageCounts}
              activities={activitiesByRepositoryId}
              onOpen={setSelectedRepository}
              onViewImages={handleOnViewImages}
              onOpenInNewWindow={handleOnOpenInNewWindow}
              onEdit={openAddOrUpdateRepositoryModal}
              onDeleted={nothing}
            />
          ) : (
            <RepositoriesTable
              repositories={visibleRepositories}
              imageCounts={imageCounts}
              activities={activitiesByRepositoryId}
              sortCriterion={viewSettings.sortCriterion}
              isSortAscending={viewSettings.isSortAscending}
              onSort={handleHeaderSort}
              onOpen={setSelectedRepository}
              onViewImages={handleOnViewImages}
              onOpenInNewWindow={handleOnOpenInNewWindow}
              onEdit={openAddOrUpdateRepositoryModal}
              onDeleted={nothing}
            />
          )}
        </Stack>
      </CatalogScreenLayout>
      <Drawer
        opened={selectedRepository !== undefined}
        onClose={() => setSelectedRepository(undefined)}
        size={480}
        title={
          selectedRepository && (
            <RepositoryIdentity
              repository={selectedRepository}
              footer={
                <RepositoryMenu
                  repository={selectedRepository}
                  onEdit={openAddOrUpdateRepositoryModal}
                  onViewImages={() => handleOnViewImages(selectedRepository)}
                  onOpenInNewWindow={() => handleOnOpenInNewWindow(selectedRepository)}
                  onDeleted={nothing}
                />
              }
            />
          )
        }
      >
        {selectedRepository && (
          <RepositoryDrawerContent
            repository={selectedRepository}
            activity={activitiesByRepositoryId.get(selectedRepository.id)}
            imageCount={imageCounts[selectedRepository.id]}
            onViewImages={() => handleOnViewImages(selectedRepository)}
            onOpenInNewWindow={() => handleOnOpenInNewWindow(selectedRepository)}
          />
        )}
      </Drawer>
    </>
  );
}
