import React from "react";
import { Flex, Text } from "@mantine/core";
import { randomId } from "@mantine/hooks";
import { useTranslation } from "react-i18next";

import { SearchFilter } from "@picteus/ws-client";

import { UiCommandType } from "types";
import { ToastService } from "utils";
import { useActionModalContext } from "app/context";
import { ExtensionsService, StorageService } from "app/services";
import { CommandForm, ExtensionBadge } from "app/components";


export default function useExtensionCommandRunner(): (extensionId: string, command: UiCommandType, searchFilter?: SearchFilter, onRunning?: () => void, onCompleted?: (wasAborted: boolean) => void) => Promise<void>
{
  const { t } = useTranslation();
  const [ , addModal, removeModal ] = useActionModalContext();

  async function handleOnSendCommand(
    extensionId: string,
    commandId: string,
    parameters?: object,
    searchFilter?: SearchFilter,
    onRunning?: () => void,
    modalId?: string,
    onCompleted?: (wasAborted: boolean) => void
  ): Promise<void>
  {
    let wasError = false;
    try
    {
      const commonParameters = { id: extensionId, commandId };
      if (onRunning)
      {
        onRunning();
      }
      if (searchFilter)
      {
        await ExtensionsService.runImageCommand({
          ...commonParameters,
          runCommandParameters: { command: parameters, search: { filter: searchFilter } }
        });
      }
      else
      {
        await ExtensionsService.runProcessCommand({ ...commonParameters, requestBody: parameters });
      }
    }
    catch (error)
    {
      wasError = true;
      ToastService.apiCallI18nError(error, "commands.extensionCommandFailed", {
        command: commandId,
        extension: extensionId
      });
    }
    if (modalId)
    {
      removeModal(modalId);
    }
    if (onCompleted)
    {
      onCompleted(wasError);
    }
  }

  async function callCommand(
    extensionId: string,
    command: UiCommandType,
    searchFilter?: SearchFilter,
    onRunning?: () => void,
    onCompleted?: (wasAborted: boolean) => void
  ): Promise<void>
  {
    console.debug(`Triggering command '${command.id}' of extension '${extensionId}'`);
    const form = command.form;
    const hasNoParameters = form === undefined || form.parameters === undefined;

    let hasCompletedBeenCalled = false;
    const handleOnCompleted = (wasAborted: boolean): void =>
    {
      if (hasCompletedBeenCalled === false)
      {
        hasCompletedBeenCalled = true;
        if (onCompleted)
        {
          onCompleted(wasAborted);
        }
      }
    };

    if (command.id !== undefined && hasNoParameters === true && StorageService.isCommandDoNotAskAgain(extensionId, command.id) === true)
    {
      await handleOnSendCommand(
        extensionId,
        command.id,
        undefined,
        searchFilter,
        onRunning,
        undefined,
        handleOnCompleted
      );
      return;
    }

    const modalId = randomId();
    addModal({
      id: modalId,
      title: command.label,
      subtitle: (<Flex>
        <Text size="sm" c="dimmed" mr="xs">{t("commands.providedBy")}</Text>
        <ExtensionBadge idOrExtension={extensionId} color="gray"/>
      </Flex>),
      icon: form?.dialogContent?.icon ?? {
        url: command.iconUri
          ? ExtensionsService.getCommandIconURL(extensionId, command.iconUri)
          : ExtensionsService.getIconURL(extensionId)
      },
      // TODO: make this customizable in the definition of a command
      size: "m",
      component: (
        <CommandForm
          extensionId={extensionId}
          searchFilter={searchFilter}
          command={command}
          onSend={(extensionId, commandId, commandParameters) =>
            void handleOnSendCommand(
              extensionId,
              commandId,
              commandParameters,
              searchFilter,
              onRunning,
              modalId,
              handleOnCompleted
            )
          }
        />
      ),
      onBeforeClose: (viaOnSuccess: boolean) =>
      {
        handleOnCompleted(viaOnSuccess === false);
      }
    });
  }

  return callCommand;
}
