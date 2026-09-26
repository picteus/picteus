import React, { useMemo } from "react";
import { ActionIcon, Flex, Tooltip } from "@mantine/core";
import {
  IconAdjustmentsHorizontal,
  IconPlayerPause,
  IconPlayerPlay,
  IconReload,
  IconTrash,
  IconUpload
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Extension, ExtensionState } from "@picteus/ws-client";

import { ToastService } from "utils";
import { ExtensionsService } from "app/services";
import {
  useChangeExtensionStateMutation,
  useConfirmAction,
  useSynchronizeExtension,
  useUninstallExtensionMutation
} from "app/hooks";


interface ExtensionActionsType
{
  extension: Extension;

  onUpdate: (extension: Extension) => void;

  onSettings: (extension: Extension) => void;

  onUninstalled: () => void;
}

export default function ExtensionActions({
  extension,
  onUpdate,
  onSettings,
  onUninstalled
}: ExtensionActionsType)
{
  const [ t ] = useTranslation();
  const confirmAction = useConfirmAction();
  const synchronizeExtension = useSynchronizeExtension();
  const uninstallExtensionMutation = useUninstallExtensionMutation();
  const changeExtensionStateMutation = useChangeExtensionStateMutation();

  const hasEligibleCapabilities = useMemo<boolean>(() =>
  {
    return ExtensionsService.computeCapabilities(extension).length > 0;
  }, [ extension ]);

  const iconSizeAndStroke = { size: 20, stroke: 1 };

  async function handleOnUninstallExtension(extensionId: string): Promise<void>
  {
    try
    {
      await uninstallExtensionMutation.mutateAsync(extensionId);
      ToastService.success(t("extensionsScreen.successUninstall"));
      onUninstalled();
    }
    catch (error)
    {
      ToastService.apiCallI18nError(error, "extensionsScreen.errorUninstall");
    }
  }

  async function handleOnToggleExtensionState(extension: Extension): Promise<void>
  {
    try
    {
      await changeExtensionStateMutation.mutateAsync({
        id: extension.manifest.id,
        state: extension.state === ExtensionState.Enabled ? ExtensionState.Paused : ExtensionState.Enabled
      });
      onUninstalled();
    }
    catch (error)
    {
      ToastService.apiCallI18nError(error, "extensionsScreen.errorToggleStatus");
    }
  }

  function handleOnSynchronize(extension: Extension): void
  {
    synchronizeExtension(extension);
  }

  return (
    <Flex gap={10} justify="flex-end" onClick={(event) => event.stopPropagation()}>
      <Tooltip label={t("button.update")}>
        <ActionIcon
          size="md"
          variant="default"
          onClick={() => onUpdate(extension)}
        >
          <IconUpload {...iconSizeAndStroke} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label={t("button.synchronize")}>
        <ActionIcon
          size="md"
          variant="default"
          onClick={() => handleOnSynchronize(extension)}
          disabled={extension.state === ExtensionState.Paused || hasEligibleCapabilities === false}
        >
          <IconReload {...iconSizeAndStroke} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label={t("button.settings")}>
        <ActionIcon
          size="md"
          variant="default"
          onClick={() => onSettings(extension)}
          disabled={extension.state === ExtensionState.Paused || extension.manifest.settings === undefined || extension.manifest.settings["properties"] === undefined}
        >
          <IconAdjustmentsHorizontal {...iconSizeAndStroke} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label={t(extension.state === ExtensionState.Paused ? "button.resume" : "button.pause")}>
        <ActionIcon
          size="md"
          variant="default"
          loading={changeExtensionStateMutation.isPending}
          onClick={() => handleOnToggleExtensionState(extension)}
        >
          {extension.state === ExtensionState.Paused ? (
            <IconPlayerPlay {...iconSizeAndStroke} />
          ) : (
            <IconPlayerPause {...iconSizeAndStroke} />
          )}
        </ActionIcon>
      </Tooltip>
      <Tooltip label={t("button.uninstall")}>
        <ActionIcon
          size="md"
          variant="default"
          loading={uninstallExtensionMutation.isPending}
          onClick={() =>
            confirmAction({
              onConfirm: () => handleOnUninstallExtension(extension.manifest.id),
              options: {
                title: t("extensionsScreen.confirmDeleteTitle"),
                message: t("extensionsScreen.confirmDeleteMessage", {
                  name: extension.manifest.name
                })
              }
            })
          }
        >
          <IconTrash color="red" {...iconSizeAndStroke} />
        </ActionIcon>
      </Tooltip>
    </Flex>
  );
}
