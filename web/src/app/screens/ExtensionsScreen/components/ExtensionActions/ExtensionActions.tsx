import React from "react";
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

import { Extension, ExtensionStatus } from "@picteus/ws-client";

import { notifyApiCallI18nError, notifySuccess } from "utils";
import { useConfirmAction } from "app/hooks";
import { ExtensionsService } from "app/services";


interface ExtensionActionsType {
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
}: ExtensionActionsType) {
  const [t] = useTranslation();
  const confirmAction = useConfirmAction();

  const iconSizeAndStroke = {
    size: 20,
    stroke: 1,
  };

  async function handleOnUninstallExtension(extensionId: string) {
    try {
      await ExtensionsService.uninstall({ id: extensionId });
      notifySuccess(t("extensionsScreen.successUninstall"));
      onUninstalled();
    } catch (error) {
      notifyApiCallI18nError(error, "extensionsScreen.errorUninstall");
    }
  }

  async function handleOnToggleExtensionStatus(extension: Extension) {
    try {
      await ExtensionsService.startOrStop({
        id: extension.manifest.id,
        isPause: extension.status === ExtensionStatus.Enabled,
      });
      onUninstalled();
    } catch (error) {
      notifyApiCallI18nError(error, "extensionsScreen.errorToggleStatus");
    }
  }

  async function handleOnSynchronize(extension: Extension) {
    try {
      await ExtensionsService.synchronize({ id: extension.manifest.id });
      notifySuccess(
        t("extensionsScreen.successSynchronize", {
          name: extension.manifest.name,
        }),
      );
    } catch (error) {
      notifyApiCallI18nError(error, "extensionsScreen.errorToggleStatus");
    }
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
          disabled={extension.status === ExtensionStatus.Paused}
        >
          <IconReload {...iconSizeAndStroke} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label={t("button.settings")}>
        <ActionIcon
          size="md"
          variant="default"
          onClick={() => onSettings(extension)}
          disabled={extension.status === ExtensionStatus.Paused || extension.manifest.settings === undefined || extension.manifest.settings["properties"] === undefined}
        >
          <IconAdjustmentsHorizontal {...iconSizeAndStroke} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label={t(extension.status === ExtensionStatus.Paused ? "button.resume" : "button.pause")}>
        <ActionIcon
          size="md"
          variant="default"
          onClick={() => handleOnToggleExtensionStatus(extension)}
        >
          {extension.status === ExtensionStatus.Paused ? (
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
          onClick={() =>
            confirmAction(
              () => handleOnUninstallExtension(extension.manifest.id),
              {
                title: t("extensionsScreen.confirmDeleteTitle"),
                message: t("extensionsScreen.confirmDeleteMessage", {
                  name: extension.manifest.name,
                }),
              },
            )
          }
        >
          <IconTrash color="red" {...iconSizeAndStroke} />
        </ActionIcon>
      </Tooltip>
    </Flex>
  );
}
