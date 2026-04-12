import React, { useEffect, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { randomId } from "@mantine/hooks";
import { useNavigate } from "react-router-dom";

import { UserInterfaceAnchor } from "@picteus/ws-client";

import { ExtensionsService, ImageService, StorageService } from "app/services";
import { useOpenWindow } from "app/hooks";
import { CommandForm, DialogForm } from "app/components";
import { FullscreenURLModal } from "app/components/ActionModal";
import { ImageVisualizerWrapper, ModalComponent } from "./components";
import {
  ActionModalValue,
  ChannelEnum,
  EventOnResultValueType,
  ExtensionIntentType,
  ResourceType,
  ShowType
} from "types";
import {
  useActionModalContext,
  useAdditionalUiContext,
  useConfirmAction,
  useEventSocket,
  useGalleryTabsContext,
  useImageVisualizerContext
} from "app/context";
import { computeExtensionSidebarRoute, computeExtensionSidebarUuid, notifyErrorWithError, ROUTES } from "utils";


export default function IntentCenter() {
  const [modalStack, addModal, removeModal] = useActionModalContext();
  const [additionalUiContextValue, , addTransient] = useAdditionalUiContext();
  const openWindow = useOpenWindow();
  const { addTab } = useGalleryTabsContext();

  const confirmAction = useConfirmAction();
  const { eventStore } = useEventSocket();
  const event = useSyncExternalStore(eventStore.subscribe, eventStore.getEvent);
  const [t] = useTranslation();
  const [imageVisualizer, setImageVisualizer] = useImageVisualizerContext();
  const navigate = useNavigate();

  function handleOnCloseVisualizer() {
    setImageVisualizer({ selectedImage: undefined, images: [] });
  }

  function onCloseActionModal(modalId: string): void {
    removeModal(modalId);
  }

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
      onCloseActionModal(modalId);
    } catch (error) {
      notifyErrorWithError(error, t("extensionIntent.onResultError"));
    }
  }

  async function handleShow(show: ShowType): Promise<void> {
    const shouldConfirm = StorageService.getExtensionIntentShowShouldConfirm();

    if (show.type === "extensionSettings") {
      const action = () => {
        navigate(`${ROUTES.extensions}?settings=${show.id}`);
        respondWithValue();
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
        setImageVisualizer({ selectedImage: image, images: [image] });
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
        return resourceType ?? { url: ExtensionsService.getSidebarAnchorIconURL(extensionId) };
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
          onBeforeClose: respondWithCancel
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
            component: <FullscreenURLModal content={frameContent} />,
            icon: ui.dialogContent?.icon,
            title: ui.dialogContent?.title,
            onBeforeClose: respondWithValue
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
          onBeforeClose: () => {
            handleOnSend({}, modalId);
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

  useEffect(() => {
    if (imageVisualizer?.selectedImage) {
      addModal({
        component: (
          <ImageVisualizerWrapper
            imageVisualizerContext={imageVisualizer}
            onClose={handleOnCloseVisualizer}
          />
        ),
        withCloseButton: false,
        onBeforeClose: handleOnCloseVisualizer,
        fullScreen: true,
      });
    }
  }, [imageVisualizer?.selectedImage]);

  return (
    <>
      {modalStack.map((modal: ActionModalValue) =>
        modal.component ? (
          <ModalComponent
            key={"modal-" + modal.id}
            modal={modal}
            onCloseActionModal={onCloseActionModal}
          />
        ) : (
          <></>
        ),
      )}
    </>
  );
}
