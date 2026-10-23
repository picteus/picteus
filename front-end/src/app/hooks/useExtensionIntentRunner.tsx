import React, { useCallback } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Container, ScrollArea } from "@mantine/core";

import {
  IntentDocumentNature,
  IntentOpenBrowser,
  IntentProcessCommand,
  IntentShow,
  IntentUi,
  IntentUiAnchor,
  isOpenBrowserIntent,
  isProcessCommandIntent,
  isShowIntent,
  isUiIntent,
  OpenBrowserIntent,
  ProcessCommandIntent,
  ShowIntent,
  UiIntent
} from "@picteus/shared-core";
import { CommandEntity, ExtensionSettings, Image, UserInterfaceAnchor } from "@picteus/ws-client";

import {
  DeskTabHtmlInlineContentType,
  DeskTabHtmlUrlContentType,
  DeskTabMarkdownInlineContentType,
  DeskTabMarkdownUrlContentType,
  EventOnResultType
} from "types";
import { computeDeskRoute, computeExtensionSidebarRoute, computeExtensionSidebarUuid, ToastService } from "utils";
import { useActionModalContext, useAdditionalUiContext, useDeskTabsContext } from "app/context";
import { ExtensionsService, ImageService, StorageService } from "app/services";
import {
  ConfirmOptions,
  useConfirmAction,
  useExtensionCommandRunner,
  useExtensionCommands,
  useExtensions,
  useOpenBrowser,
  useOpenWindow,
  useRepositories
} from "app/hooks";
import { Iframe, Markdown } from "app/components";
import { ExtensionConfiguration } from "app/screens/ExtensionsScreen/components";
import { RepositoryDetail, RepositoryTop } from "app/screens/RepositoriesScreen/components";


const commandEntities = [ CommandEntity.Process ];

export interface IntentListener
{
  onSuccess: EventOnResultType;
  onCancel: () => void;
  onFailure: (message: string) => void;
}

export default function useExtensionIntentRunner(): (extensionId: string, intent: ShowIntent | UiIntent | OpenBrowserIntent | ProcessCommandIntent, listener: IntentListener) => void
{
  const [ t ] = useTranslation();
  const navigate = useNavigate();
  const { addModal } = useActionModalContext();
  const { addTab } = useDeskTabsContext();
  const [ additionalUiContextValue, , addTransient ] = useAdditionalUiContext();
  const commandRunner = useExtensionCommandRunner();
  const openBrowser = useOpenBrowser();
  const openWindow = useOpenWindow();
  const confirmAction = useConfirmAction();
  const processCommands = useExtensionCommands(commandEntities);
  const { data: repositories = [] } = useRepositories();
  const { data: extensions = [] } = useExtensions();
  const triggerToast = useCallback(() =>
  {
    ToastService.withTitleAndSubtitle("info", t("extensionIntent.onAction"));
  }, []);
  const confirmActionWrapper = useCallback((onConfirm: () => void, options: ConfirmOptions, listener: IntentListener, extensionId: string, actuallyAsk = false): void =>
  {
    const shouldConfirm = actuallyAsk === true && StorageService.getExtensionIntentShowShouldConfirm();

    function onConfirmWrapper()
    {
      triggerToast();
      onConfirm();
    }

    if (shouldConfirm)
    {
      confirmAction({
        onConfirm: onConfirmWrapper,
        onCancel: () =>
        {
          ToastService.cancel();
          listener.onCancel();
        },
        options: { ...options, question: t("extensionIntent.question") },
        extensionId
      });
    }
    else
    {
      onConfirmWrapper();
    }
  }, [ confirmAction ]);

  return (extensionId: string, intent: ShowIntent | UiIntent | ProcessCommandIntent, listener: IntentListener): void =>
  {
    const title = t("extensionIntent.title");

    async function handleUi(ui: IntentUi): Promise<void>
    {
      const integration = ui.integration;
      const documentContent = integration.content;
      const openWindowFromUi = (id: string): void =>
      {
        openWindow(id, documentContent, false).then(() =>
        {
          listener.onSuccess();
        }).catch(error => listener.onFailure(error.message));
      };
      if (integration.anchor === IntentUiAnchor.Window)
      {
        openWindowFromUi(ui.id);
        triggerToast();
      }
      else if (integration.anchor === IntentUiAnchor.Sidebar)
      {
        const uuid = computeExtensionSidebarUuid(extensionId, ui.id);
        addTransient({
          uuid,
          integration: { anchor: UserInterfaceAnchor.Sidebar, isExternal: integration.isExternal },
          content: documentContent,
          icon: ui.headerContent?.icon ?? { url: ExtensionsService.getIconURL(extensionId) },
          title: ui.headerContent?.title,
          extensionId,
          automaticallyReopen: false
        });
        if (integration.isExternal === false)
        {
          navigate(computeExtensionSidebarRoute(uuid));
          listener.onSuccess();
        }
        else
        {
          openWindowFromUi(uuid);
        }
        triggerToast();
      }
      else if (integration.anchor === IntentUiAnchor.Modal)
      {
        const body = integration.nature === IntentDocumentNature.Markdown
          ? (
            <ScrollArea h="100%" w="100%">
              <Container size="md" py="xl">
                <Markdown content={"inline" in documentContent ? documentContent.inline : ""}/>
              </Container>
            </ScrollArea>
          )
          : <Iframe content={documentContent}/>;
        addModal({
          fullScreen: true,
          body,
          icon: ui.headerContent?.icon,
          title: ui.headerContent?.title
        });
        triggerToast();
        listener.onSuccess();
      }
      else if (integration.anchor === IntentUiAnchor.Tab)
      {
        let content: DeskTabHtmlUrlContentType | DeskTabHtmlInlineContentType | DeskTabMarkdownUrlContentType | DeskTabMarkdownInlineContentType;
        if (integration.nature === IntentDocumentNature.Markdown)
        {
          content = "url" in documentContent ? { kind: "markdown", url: documentContent.url } : {
            kind: "markdown",
            markdown: documentContent.inline
          };
        }
        else if (integration.nature === IntentDocumentNature.Html)
        {
          content = "url" in documentContent ? { kind: "html", url: documentContent.url } : {
            kind: "html",
            html: documentContent.inline
          };
        }
        const tabId = addTab({
          extensionId,
          icon: ui.headerContent?.icon ?? { url: ExtensionsService.getIconURL(extensionId) },
          label: ui.headerContent?.title ?? ui.id,
          content
        }, true);
        navigate(computeDeskRoute(tabId));
        triggerToast();
        listener.onSuccess();
      }
      else
      {
        ToastService.failure("Cannot handle a UI intent with integration '" + JSON.stringify(integration) + "'");
      }
    }

    async function handleOpenBrowser(intentOpenBrowser: IntentOpenBrowser): Promise<void>
    {
      const url = intentOpenBrowser.url;
      confirmActionWrapper(
        () => openBrowser(url).catch((error: Error) =>
        {
          ToastService.failureAndMessage(error);
          listener.onFailure(error.message);
        }),
        {
          title,
          message: t("extensionIntent.openBrowserMessage", { url })
        }, listener, extensionId, true
      );
    }

    async function handleShow(show: IntentShow): Promise<void>
    {
      if (show.type === "extensionSettings")
      {
        return confirmActionWrapper(() =>
          {
            const extension = extensions.find((extensionItem) => extensionItem.manifest.id === show.id);
            if (extension === undefined)
            {
              return listener.onFailure(`The extension with id '${show.id}' is not installed`);
            }
            addModal({
              title: t("extensionConfiguration.title"),
              size: "m",
              body: (
                <ExtensionConfiguration
                  extension={extension}
                  onSuccess={(settings?: ExtensionSettings) =>
                  {
                    if (settings)
                    {
                      listener.onSuccess(settings);
                    }
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
          },
          {
            title,
            message: t("extensionIntent.settingsMessage")
          }, listener, extensionId);
      }
      else if (show.type === "repository")
      {
        return confirmActionWrapper(() =>
          {
            const repository = repositories.find((repositoryItem) => repositoryItem.id === show.id);
            if (repository === undefined)
            {
              return listener.onFailure(`The repository with id '${show.id}' does not exist`);
            }

            addModal({
              title: <RepositoryTop repository={repository} onDeleted={() =>
              {
              }}/>,
              size: "m",
              body: <RepositoryDetail repository={repository}/>,
              onBeforeClose: (viaOnSuccess: boolean) =>
              {
                if (viaOnSuccess === false)
                {
                  listener.onCancel();
                }
              }
            });
          },
          {
            title,
            message: t("extensionIntent.repositoryMessage")
          }, listener, extensionId);
      }
      else if (show.type === "image")
      {
        return confirmActionWrapper(async () =>
          {
            let image: Image;
            try
            {
              image = await ImageService.get({ id: show.id });
            }
            catch (error)
            {
              return ToastService.apiCallError(error);
            }
            addTab({
              extensionId,
              label: image.name,
              content: {
                kind: "image",
                imageId: show.id
              }
            }, true);
            listener.onSuccess();
          },
          {
            title,
            message: t("extensionIntent.showImageMessage")
          }, listener, extensionId);
      }
      else if (show.type === "sidebar")
      {
        return confirmActionWrapper(async () =>
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
          },
          {
            title,
            message: t("extensionIntent.showSidebarMessage")
          }, listener, extensionId);
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
      triggerToast();
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
    else if (isOpenBrowserIntent(intent) === true)
    {
      void handleOpenBrowser(intent.openBrowser);
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
