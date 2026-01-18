import React from "react";
import { randomId } from "@mantine/hooks";
import { useTranslation } from "react-i18next";

import { useActionModalContext } from "app/context";
import { ExtensionsService } from "app/services";
import { notifyError } from "utils";
import { UiCommandType } from "types";
import { CommandForm } from "app/components";

export default function useExtensionCommand() {
  const [, addModal, removeModal] = useActionModalContext();
  const [t] = useTranslation();

  async function handleOnSendCommand(
    extensionId: string,
    commandId: string,
    parameters?: object,
    imageIds?: string[],
    modalId?: string,
  ) {
    try {
      const commonParameters = {
        id: extensionId,
        commandId,
        body: parameters,
      };
      if (imageIds) {
        await ExtensionsService.runImageCommand({
          ...commonParameters,
          imageIds,
        });
      } else {
        await ExtensionsService.runProcessCommand({
          ...commonParameters,
        });
      }
      if (modalId) {
        removeModal(modalId);
      }
    } catch (error) {
      notifyError(
        t("commands.extensionCommandFailed", {
          command: commandId,
          extension: extensionId,
        }),
      );
    }
  }

  function callCommand(
    extensionId: string,
    command: UiCommandType,
    imageIds?: string[],
  ) {
    console.debug(
      "Triggering command '" +
        command.id +
        "' of extension '" +
        extensionId +
        "' with imageIds : " +
        imageIds?.join(", "),
    );
    if (!command.parameters) {
      return handleOnSendCommand(extensionId, command.id, undefined, imageIds);
    }

    const modalId = randomId();

    addModal({
      id: modalId,
      component: (
        <CommandForm
          extensionId={extensionId}
          command={command}
          onSend={(extensionId, commandId, commandParameters) =>
            handleOnSendCommand(
              extensionId,
              commandId,
              commandParameters,
              imageIds,
              modalId,
            )
          }
        />
      ),
      title: command.label,
    });
  }
  return callCommand;
}
