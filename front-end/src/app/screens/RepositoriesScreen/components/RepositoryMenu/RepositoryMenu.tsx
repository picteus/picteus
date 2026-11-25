import { ReactElement } from "react";
import { Menu } from "@mantine/core";
import {
  IconAppWindow,
  IconEdit,
  IconExternalLink,
  IconEye,
  IconEyeOff,
  IconPlayerPause,
  IconPlayerPlay,
  IconReload,
  IconTrash
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Repository, RepositoryMode, RepositoryState } from "@picteus/ws-client";

import { removeFilePrefixFromUrl, ToastService } from "utils";
import {
  useConfirmAction,
  useDeleteRepositoryMutation,
  useOpenExplorer,
  useSetRepositoryModeMutation
} from "app/hooks";
import { RepositoriesService } from "app/services";
import { Common, EntityIcons, OverflowMenu } from "app/components";
import { REPOSITORY_OPEN_IN_NEW_WINDOW_ENABLED } from "../../RepositoriesConstants.ts";


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
  const setRepositoryModeMutation = useSetRepositoryModeMutation();
  const openExplorer = useOpenExplorer();

  const isDisabled = repository.mode === RepositoryMode.Disabled;
  const isWatching = repository.mode === RepositoryMode.Watching;
  const isIndexing = repository.state === RepositoryState.Indexing;
  const canSynchronize = !isDisabled && repository.available === true && !isIndexing;

  async function handleOnSynchronizeRepository(repositoryId: string): Promise<void>
  {
    await RepositoriesService.synchronize({ id: repositoryId });
  }

  async function handleOnSetRepositoryMode(repositoryId: string, mode: RepositoryMode, successKey: string): Promise<void>
  {
    try
    {
      await setRepositoryModeMutation.mutateAsync({ id: repositoryId, mode });
      ToastService.success(t(successKey));
    }
    catch (error)
    {
      ToastService.apiCallI18nError(error, "repositoryScreen.errorMode");
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

  const ImageIcon = EntityIcons.image;

  return (
    <OverflowMenu width={220}>
      {onViewImages !== undefined && (
        <Menu.Item
          disabled={isDisabled}
          leftSection={<ImageIcon size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/>}
          onClick={onViewImages}
        >
          {t("repositoryScreen.drawer.viewImages")}
        </Menu.Item>
      )}
      {REPOSITORY_OPEN_IN_NEW_WINDOW_ENABLED && onOpenInNewWindow !== undefined && (
        <Menu.Item
          disabled={isDisabled}
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
        disabled={!canSynchronize}
        leftSection={<IconReload size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/>}
        onClick={() =>
          confirmAction({
            onConfirm: () => void handleOnSynchronizeRepository(repository.id),
            options: {
              title: t("repositoryScreen.confirmSynchronizeTitle"),
              message: t("repositoryScreen.confirmSynchronizeMessage", {
                name: repository.name
              }),
              content: t("repositoryScreen.confirmSynchronizeConsequences")
            }
          })
        }
      >
        {t("button.synchronize")}
      </Menu.Item>
      {isDisabled ? (
        <Menu.Item
          leftSection={<IconPlayerPlay size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/>}
          onClick={() => void handleOnSetRepositoryMode(repository.id, RepositoryMode.Enabled, "repositoryScreen.successEnable")}
        >
          {t("repositoryScreen.menu.enable")}
        </Menu.Item>
      ) : (
        <Menu.Item
          leftSection={<IconPlayerPause size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/>}
          onClick={() =>
            confirmAction({
              onConfirm: () => void handleOnSetRepositoryMode(repository.id, RepositoryMode.Disabled, "repositoryScreen.successDisable"),
              options: {
                title: t("repositoryScreen.confirmDisableTitle"),
                message: t("repositoryScreen.confirmDisableMessage", {
                  name: repository.name
                }),
                content: t("repositoryScreen.confirmDisableConsequences")
              }
            })
          }
        >
          {t("repositoryScreen.menu.disable")}
        </Menu.Item>
      )}
      <Menu.Item
        leftSection={isWatching === true ?
          <IconEyeOff size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/> :
          <IconEye size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/>}
        onClick={() =>
          confirmAction({
            onConfirm: () => void handleOnSetRepositoryMode(
              repository.id,
              isWatching === true ? RepositoryMode.Enabled : RepositoryMode.Watching,
              isWatching === true ? "repositoryScreen.successStopWatching" : "repositoryScreen.successWatch"
            ),
            options: {
              title: t(isWatching === true ? "repositoryScreen.confirmStopWatchingTitle" : "repositoryScreen.confirmWatchTitle"),
              message: t(isWatching === true ? "repositoryScreen.confirmStopWatchingMessage" : "repositoryScreen.confirmWatchMessage", {
                name: repository.name
              }),
              content: t(isWatching === true ? "repositoryScreen.confirmStopWatchingConsequences" : "repositoryScreen.confirmWatchConsequences")
            }
          })
        }
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
              }),
              content: t("repositoryScreen.confirmDeleteConsequences")
            }
          })
        }
      >
        {t("button.delete")}
      </Menu.Item>
    </OverflowMenu>
  );
}
