import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { randomId } from "@mantine/hooks";
import { useNavigate } from "react-router-dom";

import { ExtensionsService, ImageService, StorageService } from "app/services";
import { CommandForm, DialogForm } from "app/components";
import { FullscreenURLModal } from "app/components/ActionModal";
import { ActionModalValue, ChannelEnum, ShowType, UiCommandType } from "types";
import {
  useActionModalContext,
  useConfirmAction,
  useEventSocket,
  useGalleryTabsContext,
  useImageVisualizerContext
} from "app/context";
import { notifyError } from "utils";

import { ImageVisualizerWrapper, ModalComponent } from "./components";

type ExtensionIntent = {
  id: string;
  intent: UiCommandType;
};

export default function IntentCenter() {
  const [modalStack, addModal, removeModal] = useActionModalContext();
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

  function onCloseActionModal(modalId: string) {
    removeModal(modalId);
  }

  function handleOnSend(onResult: any, parameters: any, modalId: string) {
    try {
      onResult({ value: parameters });
      onCloseActionModal(modalId);
    } catch (error) {
      console.error(error);
      notifyError(t("extensionIntent.onResultError"));
    }
  }

  async function handleOnIntentShow(show: ShowType) {
    const shouldConfirm = StorageService.getExtensionIntentShowShouldConfirm();

    if (show.type === "ExtensionSettings") {
      const action = () => {
        eventData.onResult({ value: show.id });
        return navigate(`/extensions?settings=${show.id}`);
      };
      if (shouldConfirm) {
        return confirmAction(action, {
          title: t("extensionIntent.settingsRedirectTitle"),
          message: t("extensionIntent.settingsRedirectDescription"),
        });
      }
      return action();
    }

    if (show.type === "Image") {
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
  }

  useEffect(() => {
    if (eventData?.rawData?.channel === ChannelEnum.EXTENSION_INTENT) {
      const value = eventData.rawData.value as ExtensionIntent;
      const extensionName = ExtensionsService.list().find(
        (extension) => extension.manifest.id === value.id,
      )?.manifest.name;

      const modalId = randomId();

      const addCommandFormModal = () =>
        addModal({
          id: modalId,
          component: (
            <CommandForm
              extensionId={value.id}
              command={value.intent}
              onSend={(extensionId, commandId, parameters) =>
                handleOnSend(eventData.onResult, parameters, modalId)
              }
            />
          ),
          title: t("extensionIntent.modalTitle", {
            extension: extensionName,
          }),
          onBeforeClose: () => eventData.onResult({ cancel: "Cancelled" }),
        });

      const addFullscreenURLModal = () =>
        addModal({
          fullScreen: true,
          component: <FullscreenURLModal url={value.intent.ui.url} />,
          title: "",
          onBeforeClose: () => eventData.onResult({ cancel: "Cancelled" }),
        });

      const addDialogFormModal = () =>
        addModal({
          id: modalId,
          component: (
            <DialogForm
              onSend={(isYes) =>
                handleOnSend(eventData.onResult, isYes, modalId)
              }
              dialog={value.intent.dialog}
            />
          ),
          title: value.intent.dialog.title,
          onBeforeClose: () => eventData.onResult({ cancel: "Cancelled" }),
        });

      const addImagesTab = () => {
        const data = value.intent.images;
        addTab({
          label: data.title,
          description: data.description,
          type: "Masonry",
          data: {
            imageIds: data.images,
          },
        });
        eventData.onResult({ value: {} });
      };

      // Determine which modal to show
      //TODO return eventData.onResult when the command is done.
      if (value.intent.parameters) {
        addCommandFormModal();
      } else if (value.intent.ui) {
        addFullscreenURLModal();
      } else if (value.intent.dialog) {
        addDialogFormModal();
      } else if (value.intent.show) {
        void handleOnIntentShow(value.intent.show);
      } else if (value.intent.images) {
        addImagesTab();
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
