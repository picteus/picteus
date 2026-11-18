import React, { ReactElement, useEffect, useMemo, useState } from "react";
import { Box, ScrollArea, Stack } from "@mantine/core";
import { IconFolder, IconFolderOpen, IconFolders, IconFolderSearch } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Repository, RepositoryActivity } from "@picteus/ws-client";

import { FolderTypes, RepositoriesSortCriterionType, RepositoriesViewSettingsType } from "types";
import variables from "assets/style/variablesExport.module.scss";
import { computeMainRoute, computeRepositoryRoute } from "utils";
import { useActionModalContext } from "app/context";
import {
  useFolderPicker,
  useOpenWindow,
  useRepositories,
  useRepositoriesImageCounts,
  useRepositoryActivities
} from "app/hooks";
import { RepositoriesService, StorageService } from "app/services";
import {
  Common,
  Container,
  Drawer,
  EmptyResults,
  LoadingView,
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
  RepositoryIdentity,
  RepositoryMenu
} from "./components";


export default function RepositoriesScreen(): ReactElement
{
  const [ t ] = useTranslation();

  return (
    <StackableScreen title={t("menu.repositories")} icon={IconFolders}>
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

  const [ viewSettings, setViewSettings ] = useState<RepositoriesViewSettingsType>(() => StorageService.getRepositoriesViewSettings());

  useEffect(() =>
  {
    StorageService.setRepositoriesViewSettings(viewSettings);
  }, [ viewSettings ]);

  useEffect(() =>
  {
    if (selectedRepository)
    {
      const updated = repositories.find((repositoryItem) => repositoryItem.id === selectedRepository.id);
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
    () => new Map<string, RepositoryActivity>(activities.map((activity) => [ activity.id, activity ])),
    [ activities ]
  );

  const imageCounts = useRepositoriesImageCounts(repositories);

  const originCounts = useMemo(
    () => ({
      all: repositories.length,
      user: repositories.filter((repository) => RepositoriesService.isFromExtension(repository) === false).length,
      extensions: repositories.filter((repository) => RepositoriesService.isFromExtension(repository) === true).length
    }),
    [ repositories ]
  );

  const visibleRepositories = useMemo(
    () =>
    {
      const searchText = viewSettings.searchText.trim().toLowerCase();
      const filtered = repositories.filter((repository) =>
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
      icon: { icon: IconFolder },
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

  function handleOnViewModeChange(viewMode: RepositoriesViewSettingsType["viewMode"]): void
  {
    setViewSettings((previous) => ({ ...previous, viewMode }));
  }

  function handleOnSearchTextChange(searchText: string): void
  {
    setViewSettings((previous) => ({ ...previous, searchText }));
  }

  function handleOnOriginFilterChange(originFilter: RepositoriesViewSettingsType["originFilter"]): void
  {
    setViewSettings((previous) => ({ ...previous, originFilter }));
  }

  function handleOnSortCriterionChange(sortCriterion: RepositoriesSortCriterionType): void
  {
    setViewSettings((previous) => ({ ...previous, sortCriterion }));
  }

  function handleOnSortDirectionToggle(): void
  {
    setViewSettings((previous) => ({ ...previous, isSortAscending: !previous.isSortAscending }));
  }

  function handleOnHeaderSort(criterion: RepositoriesSortCriterionType): void
  {
    setViewSettings((previous) =>
    {
      if (previous.sortCriterion === criterion)
      {
        return { ...previous, isSortAscending: !previous.isSortAscending };
      }
      // A new criterion starts with its natural direction: A to Z for the name, most first for counts and dates
      return { ...previous, sortCriterion: criterion, isSortAscending: criterion === "name" };
    });
  }

  const margin = 6;
  return (
    <>
      <Container>
        <Stack gap="lg" h="100%">
          <RepositoriesHeader
            repositoriesCount={repositories.length}
            viewMode={viewSettings.viewMode}
            onViewModeChange={handleOnViewModeChange}
            onAddRepository={() => openAddOrUpdateRepositoryModal()}
          />
          <RepositoriesToolbar
            searchText={viewSettings.searchText}
            onSearchTextChange={handleOnSearchTextChange}
            originFilter={viewSettings.originFilter}
            onOriginFilterChange={handleOnOriginFilterChange}
            originCounts={originCounts}
            sortCriterion={viewSettings.sortCriterion}
            isSortAscending={viewSettings.isSortAscending}
            onSortCriterionChange={handleOnSortCriterionChange}
            onSortDirectionToggle={handleOnSortDirectionToggle}
          />
          <ScrollArea
            flex={1}
            mt={-margin}
            ml={-margin}
            mb={-margin}
            mr={`-${variables.contentPaddingHorizontal}`}
          >
            <Box
              pt={margin}
              pl={margin}
              pb={margin}
              pr={variables.contentPaddingHorizontal}
            >
              {repositories.length === 0 ? (
                <EmptyResults
                  icon={IconFolderSearch}
                  description={t("emptyRepositories.description")}
                  title={t("emptyRepositories.title")}
                  buttonText={t("emptyRepositories.buttonText")}
                  buttonAction={() => openAddOrUpdateRepositoryModal()}
                />
              ) : (
                <LoadingView visible={isLoading || isFetching}>
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
                        onSort={handleOnHeaderSort}
                        onOpen={setSelectedRepository}
                        onViewImages={handleOnViewImages}
                        onOpenInNewWindow={handleOnOpenInNewWindow}
                        onEdit={openAddOrUpdateRepositoryModal}
                        onDeleted={nothing}
                      />
                    )}
                  </Stack>
                </LoadingView>
              )}
            </Box>
          </ScrollArea>
        </Stack>
      </Container>
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
