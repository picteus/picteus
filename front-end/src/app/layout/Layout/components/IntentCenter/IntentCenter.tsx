import React, { useEffect, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { randomId } from "@mantine/hooks";

import {
  ActionIntent,
  DialogIntent,
  FormIntent,
  ImagesIntent,
  isActionIntent,
  isDialogIntent,
  isFormIntent,
  isImagesIntent,
  isNotificationIntent,
  isShowIntent,
  isUiIntent,
  NotificationIntent
} from "@picteus/shared-core";
import { detectImageMimeType } from "@picteus/shared-front-end";
import { SearchOriginNature } from "@picteus/ws-client";

import { ChannelEnum, ContentIconType, EventOnResultValueType, ExtensionIntentType, ResourceType } from "types";
import { NotificationsService } from "utils";
import { useActionModalContext, useEventSocket, useImagesTabsContext } from "app/context";
import { useExtensionIntentRunner } from "app/hooks";
import { ExtensionsService, NotificationService } from "app/services";
import { CommandForm, DialogForm } from "app/components";


export default function IntentCenter()
{
  const [ t ] = useTranslation();
  const [ , addModal, removeModal ] = useActionModalContext();
  const intentRunner = useExtensionIntentRunner();
  const { addTab } = useImagesTabsContext();
  const { eventStore } = useEventSocket();
  const event = useSyncExternalStore(eventStore.subscribeToSocketEvents, eventStore.getSocketEvent);

  useEffect(() =>
  {
    if (event?.channel === ChannelEnum.EXTENSION_INTENT)
    {
      const value = event.value as ExtensionIntentType;
      const intent = value.intent;
      const extensionId = value.id;
      const extensionName = ExtensionsService.list().find(
        (extension) => extension.manifest.id === extensionId
      )?.manifest.name;

      function computeIcon(resourceType: ResourceType): ResourceType | ContentIconType
      {
        return resourceType ?? { url: ExtensionsService.getIconURL(extensionId) };
      }

      function respondWithValue(value: EventOnResultValueType = {}): void
      {
        event.onResult({ value });
      }

      function respondWithCancel(): void
      {
        event.onResult({ cancel: "Cancelled" });
      }

      function respondWithError(message: string): void
      {
        event.onResult({ error: message });
      }

      function handleOnSend(value: EventOnResultValueType, modalId: string): void
      {
        try
        {
          respondWithValue(value);
          removeModal(modalId);
        }
        catch (error)
        {
          NotificationsService.errorWithMessage(error, t("extensionIntent.onResultError"));
        }
      }

      async function computeIllustrationUriViaBlob(arrayBuffer: ArrayBuffer): Promise<string>
      {
        return new Promise<string>((resolve, reject) =>
        {
          let mimeType: string;
          try
          {
            mimeType = detectImageMimeType(arrayBuffer);
          }
          catch (error)
          {
            reject(error);
          }
          const blob = new Blob([ arrayBuffer ], { type: mimeType });
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

      }

      function handleForm(formIntent: FormIntent): void
      {
        const form = formIntent.form;
        const modalId = randomId();
        addModal({
          id: modalId,
          icon: computeIcon(form?.dialogContent?.icon),
          component: (
            <CommandForm
              command={intent}
              extensionId={extensionId}
              searchFilter={formIntent.context?.imageIds === undefined ? undefined : {
                origin: {
                  kind: SearchOriginNature.Images,
                  ids: formIntent.context?.imageIds
                }
              }}
              onSend={(_extensionId, _commandId, parameters) =>
                handleOnSend(parameters, modalId)
              }
              onCancel={() =>
              {
                respondWithCancel();
                removeModal(modalId);
              }}
            />
          ),
          title: form.dialogContent?.title || t("extensionIntent.modalTitle", { extension: extensionName }),
          size: form.dialogContent?.size,
          onBeforeClose: (viaOnSuccess: boolean) =>
          {
            if (viaOnSuccess === false)
            {
              respondWithCancel();
            }
          }
        });
      }

      function handleDialog(dialogIntent: DialogIntent): void
      {
        const dialog = dialogIntent.dialog;
        const modalId = randomId();
        addModal({
          id: modalId,
          icon: computeIcon(dialog.icon),
          component: (
            <DialogForm
              onSend={(isYes) =>
                handleOnSend(isYes, modalId)
              }
              dialog={dialog}
              imageIds={dialogIntent.context?.imageIds}
            />
          ),
          title: dialog.title,
          size: dialog.size,
          onBeforeClose: (viaOnSuccess: boolean) =>
          {
            if (viaOnSuccess === false)
            {
              handleOnSend({}, modalId);
            }
          }
        });
      }

      function handleImages(imagesIntent: ImagesIntent): void
      {
        const images = imagesIntent.images;
        addTab({
          extensionId,
          content: images.dialogContent,
          data: {
            mode: "masonry",
            pinnable: false,
            filterOrCollectionId: {
              filter: {
                origin: {
                  kind: "images",
                  ids: images.images.map(image => image.imageId)
                }
              }
            }
          }
        });
        respondWithValue();
      }

      async function handleNotification(notificationIntent: NotificationIntent): Promise<void>
      {
        const notification = notificationIntent.notification;
        const illustrationIcon: ArrayBuffer = notification.icon === undefined ? undefined : notification.icon as unknown as ArrayBuffer;
        void NotificationService.storeNotification({
          id: event.id,
          milliseconds: event.milliseconds,
          type: "notification",
          title: notification.title,
          subtitle: notification.subtitle,
          body: notification.body,
          data: {},
          illustrationUri: illustrationIcon === undefined ? undefined : await computeIllustrationUriViaBlob(illustrationIcon)
        });
        respondWithValue();
      }

      async function handleAction(actionIntent: ActionIntent): Promise<void>
      {
        const action = actionIntent.action;
        const dialogContent = action.dialogContent;
        const illustrationIcon: ArrayBuffer = "content" in dialogContent.icon === false ? undefined : dialogContent.icon.content as unknown as ArrayBuffer;
        void NotificationService.storeNotification({
          id: event.id,
          milliseconds: event.milliseconds,
          type: "action",
          title: dialogContent.title,
          subtitle: dialogContent.description,
          body: dialogContent.details,
          extensionId: extensionId,
          data: { extensionId, intent: action.intent },
          illustrationUri: illustrationIcon === undefined ? ("url" in dialogContent.icon ? dialogContent.icon.url : undefined) : await computeIllustrationUriViaBlob(illustrationIcon),
          actionLabel: action.label
        });
        respondWithValue();
      }

      // Determine which modal to show
      if (isFormIntent(intent))
      {
        handleForm(intent);
      }
      else if (isUiIntent(intent) === true || isShowIntent(intent) === true)
      {
        void intentRunner(extensionId, intent, {
          onSuccess: respondWithValue,
          onCancel: respondWithCancel,
          onFailure: respondWithError
        });
      }
      else if (isDialogIntent(intent))
      {
        handleDialog(intent);
      }
      else if (isImagesIntent(intent))
      {
        handleImages(intent);
      }
      else if (isNotificationIntent(intent))
      {
        void handleNotification(intent);
      }
      else if (isActionIntent(intent))
      {
        void handleAction(intent);
      }
      else
      {
        respondWithError(`Cannot handle the unexpected intent '${JSON.stringify(intent)}'`);
      }
    }
  }, [ event ]);

  return <></>;
}
