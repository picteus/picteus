import React from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";

import {
  IntentProcessCommand,
  IntentShow,
  IntentUi,
  isProcessCommandIntent,
  isShowIntent,
  isUiIntent,
  ProcessCommandIntent,
  ShowIntent,
  UiIntent
} from "@picteus/shared-core";
import { CommandEntity, ExtensionSettings, UserInterfaceAnchor } from "@picteus/ws-client";

import { computeExtensionSidebarRoute, computeExtensionSidebarUuid } from "utils";
import { useActionModalContext, useAdditionalUiContext } from "app/context";
import { ExtensionsService, ImageService, RepositoriesService, StorageService } from "app/services";
import {
  useConfirmAction,
  useExtensionCommandRunner,
  useExtensionCommandsWithEntities,
  useOpenWindow
} from "app/hooks";
import { Iframe, ImageDetail } from "app/components";
import { ExtensionSettingsModal } from "app/screens/ExtensionsScreen/components";
import { RepositoryDetail, RepositoryTop } from "app/screens/RepositoriesScreen/components";


const commandEntities = [ CommandEntity.Process ];

export interface IntentListener
{
  onSuccess: (result?: any) => void;
  onCancel: () => void;
  onFailure: (message: string) => void;
}

export default function useExtensionIntentRunner(): (extensionId: string, intent: ShowIntent | UiIntent | ProcessCommandIntent, listener: IntentListener) => void
{
  const [ t ] = useTranslation();
  const navigate = useNavigate();
  const [ , addModal, removeModal ] = useActionModalContext();
  const [ additionalUiContextValue, , addTransient ] = useAdditionalUiContext();
  const commandRunner = useExtensionCommandRunner();
  const openWindow = useOpenWindow();
  const confirmAction = useConfirmAction();
  const processCommands = useExtensionCommandsWithEntities(commandEntities);

  return (extensionId: string, intent: ShowIntent | UiIntent | ProcessCommandIntent, listener: IntentListener): void =>
  {
    async function handleUi(ui: IntentUi): Promise<void>
    {
      const frameContent = ui.frameContent;
      const openWindowFromUi = (id: string) =>
      {
        let parameters: { url: string } | { html: string; };
        if ("url" in frameContent)
        {
          parameters = { url: frameContent.url };
        }
        else if ("html" in frameContent)
        {
          parameters = { html: frameContent.html };
        }
        else
        {
          listener.onFailure("Cannot handle the 'ui' intent with no 'frameContent.url' nor 'frameContent.html' property");
          return;
        }
        openWindow(id, parameters, false).then(() =>
        {
          listener.onSuccess();
        }).catch(error => listener.onFailure(error.message));
      };
      if (ui.integration.anchor === UserInterfaceAnchor.Window)
      {
        openWindowFromUi(ui.id);
      }
      else if (ui.integration.anchor === UserInterfaceAnchor.Sidebar)
      {
        const uuid = computeExtensionSidebarUuid(extensionId, ui.id);
        addTransient({
          uuid,
          integration: { anchor: UserInterfaceAnchor.Sidebar, isExternal: ui.integration.isExternal },
          content: frameContent,
          icon: ui.dialogContent?.icon ?? { url: ExtensionsService.getIconURL(extensionId) },
          title: ui.dialogContent?.title,
          extensionId,
          automaticallyReopen: false
        });
        if (ui.integration.isExternal === false)
        {
          navigate(computeExtensionSidebarRoute(uuid));
          listener.onSuccess();
        }
        else
        {
          openWindowFromUi(uuid);
        }
      }
      else
      {
        addModal({
          fullScreen: true,
          component: <Iframe content={frameContent}/>,
          icon: ui.dialogContent?.icon,
          title: ui.dialogContent?.title
        });
        listener.onSuccess();
      }
    }

    async function handleShow(show: IntentShow): Promise<void>
    {
      const shouldConfirm = StorageService.getExtensionIntentShowShouldConfirm();

      if (show.type === "extensionSettings")
      {
        const action = () =>
        {
          const extension = ExtensionsService.list().find(extension => extension.manifest.id === show.id);
          if (extension === undefined)
          {
            return listener.onFailure(`The extension with id '${show.id}' is not installed`);
          }

          addModal({
            title: t("extensionSettingsModal.title"),
            size: "m",
            component: (
              <ExtensionSettingsModal
                extension={extension}
                onSuccess={(settings: ExtensionSettings) =>
                {
                  listener.onSuccess(settings);
                }}
              />
            ),
            onBeforeClose: (viaOnSuccess: boolean) =>
            {
              if (viaOnSuccess === false)
              {
                listener.onCancel();
              }
            }
          });
        };
        if (shouldConfirm)
        {
          return confirmAction(action, {
            title: t("extensionIntent.settingsRedirectTitle"),
            message: t("extensionIntent.settingsRedirectDescription")
          });
        }
        return action();
      }
      else if (show.type === "repository")
      {
        const action = () =>
        {
          const repository = RepositoriesService.list().find(aRepository => aRepository.id === show.id);
          if (repository === undefined)
          {
            return listener.onFailure(`The repository with id '${show.id}' does not exist`);
          }

          addModal({
            title: <RepositoryTop repository={repository} onDeleted={() =>
            {
            }}/>,
            size: "m",
            component: <RepositoryDetail repository={repository}/>,
            onBeforeClose: (viaOnSuccess: boolean) =>
            {
              if (viaOnSuccess === false)
              {
                listener.onCancel();
              }
            }
          });
        };
        if (shouldConfirm)
        {
          return confirmAction(action, {
            title: t("extensionIntent.settingsRedirectTitle"),
            message: t("extensionIntent.settingsRedirectDescription")
          });
        }
        return action();
      }
      else if (show.type === "image")
      {
        const action = async () =>
        {
          const image = await ImageService.get({ id: show.id });
          const id = addModal({
            component: (
              <ImageDetail
                image={image}
                images={[ image ]}
                viewMode="masonry"
                onClose={() =>
                {
                  removeModal(id);
                }}
              />),
            withCloseButton: false,
            fullScreen: true
          });
          listener.onSuccess();
        };
        if (shouldConfirm)
        {
          return confirmAction(action, {
            title: t("extensionIntent.showImageTitle"),
            message: t("extensionIntent.showImageDescription")
          });
        }
        return action();
      }
      else if (show.type === "sidebar")
      {
        const action = async () =>
        {
          const additionalUi = additionalUiContextValue.sidebar.find((element) => element.uuid === show.id);
          if (additionalUi === undefined)
          {
            listener.onFailure(`There is no sidebar element with uuid '${show.id}'`);
          }
          else if (additionalUi.integration.anchor === "window")
          {
            listener.onFailure(`Cannot handle the sidebar 'window' integration with uuid '${additionalUi.uuid}'`);
          }
          else
          {
            if (additionalUi.integration.isExternal === false)
            {
              navigate(computeExtensionSidebarRoute(show.id));
              listener.onSuccess();
            }
            else
            {
              openWindow(show.id, additionalUi.content, false).then(() =>
              {
                listener.onSuccess();
              }).catch(error => listener.onFailure(error.message));
            }
          }
        };
        if (shouldConfirm)
        {
          return confirmAction(action, {
            title: t("extensionIntent.showSidebarTitle"),
            message: t("extensionIntent.showSidebarDescription")
          });
        }
        return action();
      }
      else
      {
        listener.onFailure(`Unhandled '${JSON.stringify(show)}' show intent`);
      }
    }

    async function handleProcessCommand(command: IntentProcessCommand): Promise<void>
    {
      const processCommand = processCommands.find(processCommand => processCommand.extension.manifest.id === extensionId && processCommand.command.id === command.commandId);
      if (processCommand === undefined)
      {
        return listener.onFailure(`Could not find the command with id '${command.commandId}' on extension with id '${extensionId}'`);
      }
      await commandRunner(command.extensionId, processCommand.command, undefined, undefined, (wasAborted: boolean) =>
      {
        if (wasAborted === true)
        {
          listener.onCancel();
        }
        else
        {
          listener.onSuccess();
        }
      });
    }

    if (isUiIntent(intent) === true)
    {
      void handleUi(intent.ui);
    }
    else if (isShowIntent(intent) === true)
    {
      void handleShow(intent.show);
    }
    else if (isProcessCommandIntent(intent) === true)
    {
      void handleProcessCommand(intent.processCommand);
    }
  };
}
