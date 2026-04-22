import React, { useEffect, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { randomId } from "@mantine/hooks";

import { ExtensionSettings, UserInterfaceAnchor } from "@picteus/ws-client";

import { ChannelEnum, EventOnResultValueType, ExtensionIntentType, ResourceType, ShowType } from "types";
import { computeExtensionSidebarRoute, computeExtensionSidebarUuid, notifyErrorWithError } from "utils";
import {
  useActionModalContext,
  useAdditionalUiContext,
  useConfirmAction,
  useEventSocket,
  useGalleryTabsContext,
  useImageVisualizerContext
} from "app/context";
import { ExtensionsService, ImageService, StorageService } from "app/services";
import { useOpenWindow } from "app/hooks";
import { CommandForm, DialogForm, Iframe } from "app/components";
import { ExtensionSettingsModal } from "../../../../screens/ExtensionsScreen/components";


export default function IntentCenter() {
  const [, addModal, removeModal] = useActionModalContext();
  const [additionalUiContextValue, , addTransient] = useAdditionalUiContext();
  const openWindow = useOpenWindow();
  const { addTab } = useGalleryTabsContext();

  const confirmAction = useConfirmAction();
  const { eventStore } = useEventSocket();
  const event = useSyncExternalStore(eventStore.subscribe, eventStore.getEvent);
  const [t] = useTranslation();
  const showImageVisualizer = useImageVisualizerContext();
  const navigate = useNavigate();

  function respondWithValue(value: EventOnResultValueType = {}): void {
    event.onResult({ value });
  }

  function respondWithCancel(): void {
    event.onResult({ cancel: "Cancelled" });
  }

  function respondWithError(message: string): void {
    event.onResult({ error: message });
  }

  function handleOnSend(value: EventOnResultValueType, modalId: string): void {
    try {
      respondWithValue(value);
      removeModal(modalId);
    } catch (error) {
      notifyErrorWithError(error, t("extensionIntent.onResultError"));
    }
  }

  async function handleShow(show: ShowType): Promise<void> {
    const shouldConfirm = StorageService.getExtensionIntentShowShouldConfirm();

    if (show.type === "extensionSettings") {
      const action = () => {
        const extension = ExtensionsService.list().find(extension => extension.manifest.id === show.id);
        if (extension === undefined) {
          return respondWithError(`The extension with id '${show.id}' is not installed`);
        }

        addModal({
          title: t("extensionSettingsModal.title"),
          size: "m",
          component: (
            <ExtensionSettingsModal
              extension={extension}
              onSuccess={(settings: ExtensionSettings) => {
                respondWithValue(settings);
              }}
            />
          ),
          onBeforeClose: (viaOnSuccess: boolean) => {
            if (viaOnSuccess === false) {
              respondWithCancel();
            }
          }
        })
      };
      if (shouldConfirm) {
        return confirmAction(action, {
          title: t("extensionIntent.settingsRedirectTitle"),
          message: t("extensionIntent.settingsRedirectDescription"),
        });
      }
      return action();
    }
    else if (show.type === "image") {
      const action = async () => {
        const image = await ImageService.get({ id: show.id });
        showImageVisualizer({ selectedImage: image, images: [image] });
        respondWithValue();
      };
      if (shouldConfirm) {
        return confirmAction(action, {
          title: t("extensionIntent.showImageTitle"),
          message: t("extensionIntent.showImageDescription"),
        });
      }
      return action();
    }
    else if (show.type === "sidebar") {
      const action = async () => {
        const additionalUi = additionalUiContextValue.sidebar.find((element) => element.uuid === show.id);
        if (additionalUi === undefined) {
          respondWithError(`There is no sidebar element with uuid '${show.id}'`);
        }
        else if (additionalUi.integration.anchor === "window") {
          respondWithError(`Cannot handle the sidebar 'window' integration with uuid '${additionalUi.uuid}'`);
        }
        else {
          if (additionalUi.integration.isExternal === false) {
            navigate(computeExtensionSidebarRoute(show.id));
            respondWithValue();
          }
          else {
            openWindow(show.id, additionalUi.content, false).then(() => {
              respondWithValue();
            }).catch(error => respondWithError(error.message));
          }
        }
      };
      if (shouldConfirm) {
        return confirmAction(action, {
          title: t("extensionIntent.showSidebarTitle"),
          message: t("extensionIntent.showSidebarDescription"),
        });
      }
      return action();
    }
    else {
      respondWithError(`Unhandled '${show}' show intent`);
    }
  }

  useEffect(() => {
    if (event?.rawData?.channel === ChannelEnum.EXTENSION_INTENT) {
      const value = event.rawData.value as ExtensionIntentType;
      const intent = value.intent;
      const extensionId = value.id;
      const extensionName = ExtensionsService.list().find(
        (extension) => extension.manifest.id === extensionId,
      )?.manifest.name;
      const computeIcon = (resourceType: ResourceType) => {
        return resourceType ?? { url: ExtensionsService.getIconURL(extensionId) };
      }
      const modalId = randomId();

      const handleForm = () => {
        const form = intent.form;
        addModal({
          id: modalId,
          icon: computeIcon(form?.dialogContent?.icon),
          component: (
            <CommandForm
              command={intent}
              extensionId={extensionId}
              imageIds={intent.context?.imageIds}
              onSend={(_extensionId, _commandId, parameters) =>
                handleOnSend(parameters, modalId)
              }
              onCancel={() => {
                respondWithCancel();
                removeModal(modalId);
              }}
            />
          ),
          title: form.dialogContent?.title || t("extensionIntent.modalTitle", { extension: extensionName }),
          size: form.dialogContent?.size,
          onBeforeClose: (viaOnSuccess: boolean) => {
            if (viaOnSuccess === false) {
              respondWithCancel();
            }
          }
        });
      };

      const handleUi = () => {
        const ui = intent.ui;
        const frameContent = ui.frameContent;
        const openWindowFromUi = (id: string) => {
          let parameters;
          if ("url" in frameContent) {
            parameters = { url: frameContent.url };
          }
          else if ("html" in frameContent) {
            parameters = { html: frameContent.html };
          }
          else {
            respondWithError("Cannot handle the 'ui' intent with no 'frameContent.url' nor 'frameContent.html' property");
            return;
          }
          openWindow(id, parameters, false).then(() => {
            respondWithValue();
          }).catch(error => respondWithError(error.message));
        };
        if (ui.integration.anchor === UserInterfaceAnchor.Window) {
          openWindowFromUi(ui.id);
        }
        else if (ui.integration.anchor === UserInterfaceAnchor.Sidebar) {
          const uuid = computeExtensionSidebarUuid(extensionId, ui.id);
          addTransient({
            uuid,
            integration: { anchor: UserInterfaceAnchor.Sidebar, isExternal: ui.integration.isExternal },
            content: frameContent,
            icon: computeIcon(ui.dialogContent?.icon),
            title: ui.dialogContent?.title,
            extensionId,
            automaticallyReopen: false
          });
          if (ui.integration.isExternal === false) {
            navigate(computeExtensionSidebarRoute(uuid));
            respondWithValue();
          }
          else {
            openWindowFromUi(uuid);
          }
        }
        else {
          addModal({
            fullScreen: true,
            component: <Iframe content={frameContent} />,
            icon: ui.dialogContent?.icon,
            title: ui.dialogContent?.title,
          });
          respondWithValue();
        }
      };

      const handleDialog = () => {
        const dialog = intent.dialog;
        addModal({
          id: modalId,
          icon: computeIcon(dialog.icon),
          component: (
            <DialogForm
              onSend={(isYes) =>
                handleOnSend(isYes, modalId)
              }
              dialog={dialog}
              imageIds={intent.context?.imageIds}
            />
          ),
          title: dialog.title,
          size: dialog.size,
          onBeforeClose: (viaOnSuccess: boolean) => {
            if (viaOnSuccess === false) {
              handleOnSend({}, modalId);
            }
          }
        });
      };

      const handleImages = () => {
        const images = intent.images;
        addTab({
          extensionId,
          content: images.dialogContent,
          type: "Masonry",
          data: {
            imageIds: images.images,
          },
        });
        respondWithValue();
      };

      // Determine which modal to show
      if (intent.form) {
        handleForm();
      } else if (intent.ui) {
        handleUi();
      } else if (intent.dialog) {
        handleDialog();
      } else if (intent.show) {
        void handleShow(intent.show);
      } else if (intent.images) {
        handleImages();
      }
      else {
        respondWithError(`Cannot handle the unexpected intent '${JSON.stringify(intent)}'`);
      }
    }
  }, [event]);

  return <></>;
}
