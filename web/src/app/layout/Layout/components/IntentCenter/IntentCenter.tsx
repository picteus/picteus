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

  function respondWithValue(value:any) {
    eventData.onResult({ value });
  }

  function respondWithCancel() {
    eventData.onResult({ cancel: "Cancelled" });
  }

  function handleOnSend(parameters: any, modalId: string)
  {
    try {
      respondWithValue(parameters);
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
        respondWithValue(show.id);
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
      const intent = value.intent;
      const extensionName = ExtensionsService.list().find(
        (extension) => extension.manifest.id === value.id,
      )?.manifest.name;

      const modalId = randomId();

      const iconUrl = ExtensionsService.getSidebarAnchorIconURL(value.id);
      const addCommandFormModal = () =>
        addModal({
          id: modalId,
          iconUrl,
          component: (
            <CommandForm
              command={intent}
              extensionId={value.id}
              imageIds={intent.context?.imageIds}
              onSend={(extensionId, commandId, parameters) =>
                handleOnSend(parameters, modalId)
              }
              onCancel={() => {
                respondWithCancel();
                removeModal(modalId);
              }}
            />
          ),
          title: intent.dialogContent?.title || t("extensionIntent.modalTitle", {
            extension: extensionName,
          }),
          onBeforeClose: respondWithCancel,
        });

      const addFullscreenURLModal = () => {
        addModal({
          fullScreen: true,
          component: <FullscreenURLModal url={intent.ui.url} />,
          title: intent.ui.dialogContent?.title,
          onBeforeClose: respondWithCancel
        });
        respondWithValue({});
      };

      const addDialogFormModal = () =>
        addModal({
          id: modalId,
          iconUrl,
          component: (
            <DialogForm
              onSend={(isYes) =>
                handleOnSend(isYes, modalId)
              }
              dialog={intent.dialog}
              imageIds={intent.context?.imageIds}
            />
          ),
          title: intent.dialog.title,
          onBeforeClose: respondWithCancel,
        });

      const addImagesTab = () => {
        const data = intent.images;
        addTab({
          label: data.title,
          description: data.description,
          type: "Masonry",
          data: {
            imageIds: data.images,
          },
        });
        respondWithValue({});
      };

      // Determine which modal to show
      if (intent.parameters) {
        addCommandFormModal();
      } else if (intent.ui) {
        addFullscreenURLModal();
      } else if (intent.dialog) {
        addDialogFormModal();
      } else if (intent.show) {
        void handleOnIntentShow(intent.show);
      } else if (intent.images) {
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
