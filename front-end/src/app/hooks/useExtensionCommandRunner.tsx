import { useCallback } from "react";
import { randomId } from "@mantine/hooks";

import { SearchFilter } from "@picteus/ws-client";

import { ImagePickerSelectionModeType, UiCommandType } from "types";
import { ToastService } from "utils";
import { useActionModalContext } from "app/context";
import { ExtensionsService, StorageService } from "app/services";
import { CommandForm, CommandModalHeader } from "app/components";


export default function useExtensionCommandRunner(): (
  extensionId: string,
  command: UiCommandType,
  searchFilter?: SearchFilter,
  onRunning?: () => void,
  onCompleted?: (wasAborted: boolean) => void,
  imageSelectionMode?: ImagePickerSelectionModeType
) => Promise<void>
{
  const { addModal, removeModal } = useActionModalContext();

  const handleOnSendCommand = useCallback(async (
    extensionId: string,
    commandId: string,
    parameters?: object,
    searchFilter?: SearchFilter,
    onRunning?: () => void,
    modalId?: string,
    onCompleted?: (wasAborted: boolean) => void
  ): Promise<void> =>
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
  }, [ removeModal ]);

  return useCallback(async (
    extensionId: string,
    command: UiCommandType,
    searchFilter?: SearchFilter,
    onRunning?: () => void,
    onCompleted?: (wasAborted: boolean) => void,
    imageSelectionMode?: ImagePickerSelectionModeType
  ): Promise<void> =>
  {
    console.debug(`Triggering command '${command.id}' of extension '${extensionId}'`);
    const form = command.form;
    const hasNoParameters = form === undefined || form.parameters === undefined;
    const needsImageSelection = searchFilter === undefined && imageSelectionMode !== undefined;

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

    if (
      needsImageSelection === false &&
      command.id !== undefined &&
      hasNoParameters === true &&
      StorageService.isCommandDoNotAskAgain(extensionId, command.id) === true
    )
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

    const isInlineManualMode =
      hasNoParameters === true &&
      needsImageSelection === false &&
      form?.dialogContent === undefined;

    const modalId = randomId();
    addModal({
      id: modalId,
      size: "m",
      isFullHeight: needsImageSelection === true ? true : undefined,
      title: (
        <CommandModalHeader
          command={command}
          extensionId={extensionId}
          showHowItWorks={isInlineManualMode === false}
        />
      ),
      body: (
        <CommandForm
          extensionId={extensionId}
          searchFilter={searchFilter}
          imageSelectionMode={needsImageSelection === true ? imageSelectionMode : undefined}
          command={command}
          onSend={(targetExtensionId, commandId, commandParameters, selectedSearchFilter) =>
            void handleOnSendCommand(
              targetExtensionId,
              commandId,
              commandParameters,
              selectedSearchFilter ?? searchFilter,
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
  }, [ addModal, handleOnSendCommand ]);
}
