import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { randomId } from "@mantine/hooks";
import { useNavigate } from "react-router-dom";

import { UserInterfaceAnchor } from "@picteus/ws-client";

import { ExtensionsService, ImageService, StorageService } from "app/services";
import { useOpenWindow } from "app/hooks";
import { CommandForm, DialogForm } from "app/components";
import { FullscreenURLModal } from "app/components/ActionModal";
import { ActionModalValue, ChannelEnum, ResourceType, ShowType, UiCommandType } from "types";
import {
  useActionModalContext,
  useAdditionalUiContext,
  useConfirmAction,
  useEventSocket,
  useGalleryTabsContext,
  useImageVisualizerContext
} from "app/context";
import { computeExtensionSidebarRoute, computeExtensionSidebarUuid, notifyError, ROUTES } from "utils";

import { ImageVisualizerWrapper, ModalComponent } from "./components";

type ExtensionIntent = {
  id: string;
  intent: UiCommandType;
};

export default function IntentCenter() {
  const [modalStack, addModal, removeModal] = useActionModalContext();
  const [additionalUiContextValue, , addTransient] = useAdditionalUiContext();
  const openWindow = useOpenWindow();
  const [, addTab] = useGalleryTabsContext();

  const confirmAction = useConfirmAction();
  const eventData = useEventSocket();
  const [t] = useTranslation();
  const [imageVisualizerContext, setImageVisualizerContext] =
    useImageVisualizerContext();
  const navigate = useNavigate();

  function handleOnCloseVisualizer() {
    setImageVisualizerContext({
      imageSummary: undefined,
    });
  }

  function onCloseActionModal(modalId: string): void {
    removeModal(modalId);
  }

  function respondWithValue(value: any= {}): void {
    eventData.onResult({ value });
  }

  function respondWithCancel(): void {
    eventData.onResult({ cancel: "Cancelled" });
  }

  function respondWithError(message: string): void {
    eventData.onResult({ error: message });
  }

  function handleOnSend(parameters: any, modalId: string): void {
    try {
      respondWithValue(parameters);
      onCloseActionModal(modalId);
    } catch (error) {
      console.error(error);
      notifyError(t("extensionIntent.onResultError"));
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
        setImageVisualizerContext({ imageSummary: image });
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
        else {
          if (additionalUi.anchor === UserInterfaceAnchor.Sidebar) {
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
    if (eventData?.rawData?.channel === ChannelEnum.EXTENSION_INTENT) {
      const value = eventData.rawData.value as ExtensionIntent;
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
        if (ui.anchor === UserInterfaceAnchor.Window) {
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
          openWindow(ui.id, parameters, false).then(() => {
            respondWithValue();
          }).catch(error => respondWithError(error.message));
        }
        else if (ui.anchor === UserInterfaceAnchor.Sidebar) {
          const uuid = computeExtensionSidebarUuid(extensionId, ui.id);
          addTransient({
            uuid,
            anchor: UserInterfaceAnchor.Sidebar,
            content: frameContent,
            icon: computeIcon(ui.dialogContent?.icon),
            title: ui.dialogContent?.title,
            extensionId,
            automaticallyReopen: false
          });
          navigate(computeExtensionSidebarRoute(uuid));
          respondWithValue();
        }
        else {
          addModal({
            fullScreen: true,
            component: <FullscreenURLModal content={frameContent} />,
            icon: ui.dialogContent?.icon,
            title: ui.dialogContent?.title,
            onBeforeClose: respondWithCancel
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
          onBeforeClose: respondWithCancel
        });
      };

      const handleImages = () => {
        const images = intent.images;
        addTab({
          label: images.dialogContent.title,
          description: images.dialogContent.description,
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
        respondWithError(`Cannot handel the unexpected intent '${JSON.stringify(intent)}'`);
      }
    }
  }, [eventData]);

  useEffect(() => {
    if (imageVisualizerContext?.imageSummary) {
      addModal({
        component: (
          <ImageVisualizerWrapper
            imageVisualizerContext={imageVisualizerContext}
            onClose={handleOnCloseVisualizer}
          />
        ),
        withCloseButton: false,
        onBeforeClose: handleOnCloseVisualizer,
        fullScreen: true,
      });
    }
  }, [imageVisualizerContext?.imageSummary]);

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
