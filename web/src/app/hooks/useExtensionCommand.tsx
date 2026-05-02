import React from "react";
import { randomId } from "@mantine/hooks";
import { useTranslation } from "react-i18next";

import { UiCommandType } from "types";
import { notifyError } from "utils";
import { useActionModalContext } from "app/context";
import { ExtensionsService } from "app/services";
import { CommandForm } from "app/components";


type CallCommandType = (extensionId: string, command: UiCommandType, imageIds?: string[], onRunning?: () => void, onCompleted?: (wasAborted: boolean) => void) => Promise<void>;

export default function useExtensionCommand(): CallCommandType {
  const [t] = useTranslation();
  const [, addModal, removeModal] = useActionModalContext();

  async function handleOnSendCommand(extensionId: string, commandId: string, parameters?: object, imageIds?: string[], onRunning?: () => void, modalId?: string): Promise<void> {
    try {
      const commonParameters = { id: extensionId, commandId, body: parameters };
      if (onRunning) {
        onRunning();
      }
      if (imageIds) {
        await ExtensionsService.runImageCommand({ ...commonParameters, imageIds });
      } else {
        await ExtensionsService.runProcessCommand({ ...commonParameters });
      }
      if (modalId) {
        removeModal(modalId);
      }
    }
    catch (error) {
      notifyError(t("commands.extensionCommandFailed", { command: commandId, extension: extensionId }));
    }
  }

  function callCommand(extensionId: string, command: UiCommandType, imageIds?: string[], onRunning?: () => void, onCompleted?: (wasAborted: boolean) => void) {
    console.debug(`Triggering command '${command.id}' of extension '${extensionId}' with imageIds : ${imageIds?.join(", ")}`);
    const form = command.form;

    const modalId = randomId();

    const handleOnCompleted = (wasAborted: boolean) => {
      if (onCompleted) {
        onCompleted(wasAborted);
      }
    };
    if (!form.parameters) {
      return handleOnSendCommand(extensionId, command.id, undefined, imageIds, onRunning).then(() => handleOnCompleted(false));
    }

    addModal({
      id: modalId,
      title: command.label,
      icon: form?.dialogContent?.icon ?? { url: ExtensionsService.getIconURL(extensionId) },
      // TODO: make this customizable in the definition of a command
      size: "m",
      component: (
        <CommandForm
          extensionId={extensionId}
          imageIds={imageIds}
          command={command}
          onSend={(extensionId, commandId, commandParameters) =>
            handleOnSendCommand(extensionId, commandId, commandParameters, imageIds, onRunning, modalId)
          }
          onCancel={() => {
            removeModal(modalId);
            handleOnCompleted(true);
          }}
        />
      ),
      onBeforeClose: (viaOnSuccess: boolean)=> {
        handleOnCompleted(viaOnSuccess === false);
      }
    });
  }

  return callCommand;
}
