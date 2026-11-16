import { ReactElement } from "react";
import { ActionIcon, Box, Menu } from "@mantine/core";
import {
  IconAppWindow,
  IconDots,
  IconEdit,
  IconExternalLink,
  IconEye,
  IconEyeOff,
  IconPhoto,
  IconReload,
  IconTrash
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Repository, RepositoryActivityKind } from "@picteus/ws-client";

import { removeFilePrefixFromUrl, REPOSITORY_OPEN_IN_NEW_WINDOW_ENABLED, ToastService } from "utils";
import {
  useConfirmAction,
  useDeleteRepositoryMutation,
  useOpenExplorer,
  useRepositoryActivities,
  useWatchRepositoryMutation
} from "app/hooks";
import { RepositoriesService } from "app/services";
import { Common } from "app/components";


interface RepositoryMenuType
{
  repository: Repository;

  onEdit?: (repository: Repository) => void;

  onViewImages?: () => void;

  onOpenInNewWindow?: () => void;

  onDeleted: () => void;
}

export default function RepositoryMenu({
  repository,
  onEdit,
  onViewImages,
  onOpenInNewWindow,
  onDeleted
}: RepositoryMenuType): ReactElement
{
  const [ t ] = useTranslation();
  const confirmAction = useConfirmAction();
  const deleteRepositoryMutation = useDeleteRepositoryMutation();
  const watchRepositoryMutation = useWatchRepositoryMutation();
  const openExplorer = useOpenExplorer();
  const { data: activities = [] } = useRepositoryActivities();

  const isWatching = activities.some((activity) => activity.id === repository.id && activity.kind === RepositoryActivityKind.Watching);

  async function handleOnSynchronizeRepository(repositoryId: string): Promise<void>
  {
    await RepositoriesService.synchronize({ id: repositoryId });
  }

  async function handleOnWatchRepository(repositoryId: string, isStart: boolean): Promise<void>
  {
    try
    {
      await watchRepositoryMutation.mutateAsync({ id: repositoryId, isStart });
      ToastService.success(t(isStart === true ? "repositoryScreen.successWatch" : "repositoryScreen.successStopWatching"));
    }
    catch (error)
    {
      ToastService.apiCallI18nError(error, "repositoryScreen.errorWatch");
    }
  }

  async function handleOnDeleteRepository(repositoryId: string): Promise<void>
  {
    try
    {
      await deleteRepositoryMutation.mutateAsync(repositoryId);
      ToastService.success(t("repositoryScreen.successRemove"));
      onDeleted();
    }
    catch (error)
    {
      ToastService.apiCallI18nError(error, "repositoryScreen.errorRemove");
    }
  }

  return (
    // The wrapper stops the click from bubbling to a clickable ancestor (card, table row);
    // the dropdown handler does the same for menu item clicks, which bubble through the React tree despite the portal
    <Box onClick={(event) => event.stopPropagation()}>
      <Menu shadow="md" width={220} withinPortal>
        <Menu.Target>
          <ActionIcon variant="subtle" color="gray">
            <IconDots size={Common.IconSmallSize} stroke={Common.IconStrokeSize}/>
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown onClick={(event) => event.stopPropagation()}>
          {onViewImages !== undefined && (
            <Menu.Item
              leftSection={<IconPhoto size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/>}
              onClick={onViewImages}
            >
              {t("repositoryScreen.drawer.viewImages")}
            </Menu.Item>
          )}
          {REPOSITORY_OPEN_IN_NEW_WINDOW_ENABLED && onOpenInNewWindow !== undefined && (
            <Menu.Item
              leftSection={<IconAppWindow size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/>}
              onClick={onOpenInNewWindow}
            >
              {t("repositoryScreen.drawer.openInNewWindow")}
            </Menu.Item>
          )}
          <Menu.Item
            leftSection={<IconExternalLink size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/>}
            onClick={() => void openExplorer(removeFilePrefixFromUrl(repository.url) ?? repository.url)}
          >
            {t("button.externalLinkOpen")}
          </Menu.Item>
          {onEdit && (
            <Menu.Item
              leftSection={<IconEdit size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/>}
              onClick={() => onEdit(repository)}
            >
              {t("button.edit")}
            </Menu.Item>
          )}
          <Menu.Item
            leftSection={<IconReload size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/>}
            onClick={() => void handleOnSynchronizeRepository(repository.id)}
          >
            {t("button.synchronize")}
          </Menu.Item>
          <Menu.Item
            leftSection={isWatching === true ?
              <IconEyeOff size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/> :
              <IconEye size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/>}
            onClick={() => void handleOnWatchRepository(repository.id, !isWatching)}
          >
            {isWatching === true ? t("repositoryScreen.menu.stopWatching") : t("repositoryScreen.menu.watch")}
          </Menu.Item>
          <Menu.Item
            color="red"
            leftSection={<IconTrash size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/>}
            onClick={() =>
              confirmAction({
                onConfirm: () => void handleOnDeleteRepository(repository.id),
                options: {
                  title: t("repositoryScreen.confirmDeleteTitle"),
                  message: t("repositoryScreen.confirmDeleteMessage", {
                    name: repository.name
                  })
                }
              })
            }
          >
            {t("button.delete")}
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Box>
  );
}
