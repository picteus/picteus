import React from "react";
import { randomId } from "@mantine/hooks";
import { useTranslation } from "react-i18next";

import { SearchFilter } from "@picteus/ws-client";

import { UiCommandType } from "types";
import { ToastService } from "utils";
import { useActionModalContext } from "app/context";
import { ExtensionsService } from "app/services";
import { CommandForm } from "app/components";


export default function useExtensionCommandRunner(): (extensionId: string, command: UiCommandType, searchFilter?: SearchFilter, onRunning?: () => void, onCompleted?: (wasAborted: boolean) => void) => Promise<void>
{
  const [ t ] = useTranslation();
  const [ , addModal, removeModal ] = useActionModalContext();

  async function handleOnSendCommand(extensionId: string, commandId: string, parameters?: object, searchFilter?: SearchFilter, onRunning?: () => void, modalId?: string): Promise<void>
  {
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
        await ExtensionsService.runProcessCommand({ ...commonParameters, body: parameters });
      }
      if (modalId)
      {
        removeModal(modalId);
      }
    }
    catch (error)
    {
      ToastService.failure(t("commands.extensionCommandFailed", { command: commandId, extension: extensionId }));
    }
  }

  function callCommand(extensionId: string, command: UiCommandType, searchFilter?: SearchFilter, onRunning?: () => void, onCompleted?: (wasAborted: boolean) => void)
  {
    console.debug(`Triggering command '${command.id}' of extension '${extensionId}'`);
    const form = command.form;

    const modalId = randomId();

    const handleOnCompleted = (wasAborted: boolean) =>
    {
      if (onCompleted)
      {
        onCompleted(wasAborted);
      }
    };
    if (form?.parameters === undefined)
    {
      return handleOnSendCommand(extensionId, command.id, undefined, searchFilter, onRunning).then(() => handleOnCompleted(false));
    }

    addModal({
      id: modalId,
      title: command.label,
      icon: form?.dialogContent?.icon ?? { url: command.iconUri ? ExtensionsService.getCommandIconURL(extensionId, command.iconUri) : ExtensionsService.getIconURL(extensionId) },
      // TODO: make this customizable in the definition of a command
      size: "m",
      component: (
        <CommandForm
          extensionId={extensionId}
          searchFilter={searchFilter}
          command={command}
          onSend={(extensionId, commandId, commandParameters) =>
            handleOnSendCommand(extensionId, commandId, commandParameters, searchFilter, onRunning, modalId)
          }
          onCancel={() =>
          {
            removeModal(modalId);
            handleOnCompleted(true);
          }}
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
