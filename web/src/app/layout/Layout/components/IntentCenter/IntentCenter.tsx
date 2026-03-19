import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { randomId } from "@mantine/hooks";
import { useNavigate } from "react-router-dom";

import { UserInterfaceAnchor } from "@picteus/ws-client";

import { ExtensionsService, ImageService, StorageService } from "app/services";
import { CommandForm, DialogForm } from "app/components";
import { FullscreenURLModal } from "app/components/ActionModal";
import { ActionModalValue, ChannelEnum, ShowType, UiCommandType } from "types";
import {
  useActionModalContext,
  useAdditionalUiContext,
  useConfirmAction,
  useEventSocket,
  useGalleryTabsContext,
  useImageVisualizerContext
} from "app/context";
import { computeExtensionSidebarRoute, notifyError } from "utils";

import { ImageVisualizerWrapper, ModalComponent } from "./components";

type ExtensionIntent = {
  id: string;
  intent: UiCommandType;
};

export default function IntentCenter() {
  const [modalStack, addModal, removeModal] = useActionModalContext();
  const [, , , addTransient] = useAdditionalUiContext();
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

  async function handleShow(show: ShowType) {
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
      const extensionId = value.id;
      const extensionName = ExtensionsService.list().find(
        (extension) => extension.manifest.id === extensionId,
      )?.manifest.name;
      const iconUrl = ExtensionsService.getSidebarAnchorIconURL(extensionId);
      const modalId = randomId();

      const handleParameters = () => {
        addModal({
          id: modalId,
          iconUrl,
          component: (
            <CommandForm
              command={intent}
              extensionId={extensionId}
              imageIds={intent.context?.imageIds}
              onSend={(_extensionId, commandId, parameters) =>
                handleOnSend(parameters, modalId)
              }
              onCancel={() => {
                respondWithCancel();
                removeModal(modalId);
              }}
            />
          ),
          title: intent.dialogContent?.title || t("extensionIntent.modalTitle", {
            extension: extensionName
          }),
          onBeforeClose: respondWithCancel
        });
      };

      const handleUi = () => {
        const ui = intent.ui;
        if (ui.anchor === UserInterfaceAnchor.Sidebar) {
          // TODO: handle the case of a transient already added
          const uuid = `${extensionId}-${modalId}`;
          addTransient({
            uuid,
            anchor: UserInterfaceAnchor.Sidebar,
            // TODO: handle the case of the "html" attribute
            url: "url" in ui.frameContent ? ui.frameContent.url : "",
            iconURL: iconUrl,
            title: ui.dialogContent?.title,
            extensionId
          });
          navigate(computeExtensionSidebarRoute(uuid));
          respondWithValue({});
        }
        else {
          addModal({
            fullScreen: true,
            component: <FullscreenURLModal content={ui.frameContent} />,
            title: ui.dialogContent?.title,
            onBeforeClose: respondWithCancel
          });
          respondWithValue({});
        }
      };

      const handleDialog = () => {
        const dialog = intent.dialog;
        addModal({
          id: modalId,
          iconUrl,
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
          label: images.title,
          description: images.description,
          type: "Masonry",
          data: {
            imageIds: images.images,
          },
        });
        respondWithValue({});
      };

      // Determine which modal to show
      if (intent.parameters) {
        handleParameters();
      } else if (intent.ui) {
        handleUi();
      } else if (intent.dialog) {
        handleDialog();
      } else if (intent.show) {
        void handleShow(intent.show);
      } else if (intent.images) {
        handleImages();
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
