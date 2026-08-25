import i18n from "i18n/i18n.ts";

import {
  isActionIntent,
  isDialogIntent,
  isFormIntent,
  isImagesIntent,
  isNotificationIntent,
  isShowIntent,
  isToastIntent,
  isUiIntent
} from "@picteus/shared-core";

import { ChannelEnum, ExtensionIntentType, LogType, NotificationType, SocketEventType } from "types";
import { ImageService } from "app/services";
import { Common } from "app/components";
import { getObjectStore, INDEXED_DB_NAME, StoreKind } from "./IndexDbService.ts";


const socketEventsKind: StoreKind = "socketEvents";

async function upgrade(_previousVersion: string, currentVersion: string): Promise<void>
{
  if (currentVersion === "0.4.0" || currentVersion === "0.5.0")
  {
    indexedDB.deleteDatabase(INDEXED_DB_NAME);
  }
}

async function getSocketEvents(): Promise<SocketEventType []>
{
  const store = await getObjectStore(socketEventsKind, "readonly");
  return new Promise<SocketEventType[]>((resolve, reject) =>
  {
    const request = store.getAll();
    request.onsuccess = () =>
    {
      const events: SocketEventType[] = request.result;
      resolve(events.sort((event1, event2) => event2.milliseconds - event1.milliseconds));
    };
    request.onerror = () => reject(request.error);
  });
}

async function storeSocketEvent(event: SocketEventType): Promise<void>
{
  const store = await getObjectStore(socketEventsKind, "readwrite");
  store.add(event);
}

function computeLogLevelColor(logLevel: string): string
{
  if (logLevel === "info")
  {
    return "blue";
  }
  else if (logLevel === "warn")
  {
    return "orange";
  }
  else if (logLevel === "error")
  {
    return "red";
  }
  else
  {
    return "gray";
  }
}

function computeEventEntityId<T>(event: SocketEventType): T | undefined
{
  return event.value["id"] as T;
}

function computeEventExtensionId(event: SocketEventType): string | undefined
{
  if (event.channel.startsWith(ChannelEnum.EXTENSION_PREFIX))
  {
    return computeEventEntityId<string>(event);
  }
  return undefined;
}

function computeLog(event: SocketEventType): LogType
{
  const { id, milliseconds, channel, value } = event;
  const entityId = computeEventEntityId<string | number>(event);
  let type: "image" | "repository" | "collection" | "extension" | "unknown";
  if (channel.startsWith(ChannelEnum.EXTENSION_PREFIX))
  {
    type = "extension";
  }
  else if (channel.startsWith(ChannelEnum.IMAGE_PREFIX))
  {
    type = "image";
  }
  else if (channel.startsWith(ChannelEnum.REPOSITORY_PREFIX))
  {
    type = "repository";
  }
  else if (channel.startsWith(ChannelEnum.COLLECTION_PREFIX))
  {
    type = "collection";
  }
  else
  {
    type = "unknown";
  }

  let extensionId: string;
  if (channel.startsWith(ChannelEnum.EXTENSION_PREFIX))
  {
    extensionId = entityId as string;
  }

  if (channel === ChannelEnum.EXTENSION_LOG)
  {
    const message = value.message;
    return { type, id, milliseconds, text: message.message, level: message.level, entityId, extensionId };
  }

  const i18nMnemonic = `eventInformation.${channel}`;
  const level = "info";

  if (channel === ChannelEnum.EXTENSION_INTENT)
  {
    const intent = (value as ExtensionIntentType).intent;
    let intentType: string;
    if (isFormIntent(intent))
    {
      intentType = "a form";
    }
    else if (isUiIntent(intent))
    {
      intentType = "a ui";
    }
    else if (isDialogIntent(intent))
    {
      intentType = "a dialog";
    }
    else if (isImagesIntent(intent))
    {
      intentType = "some images";
    }
    else if (isShowIntent(intent))
    {
      intentType = "a show";
    }
    else if (isToastIntent(intent))
    {
      intentType = "a toast";
    }
    else if (isNotificationIntent(intent))
    {
      intentType = "a notification";
    }
    else if (isActionIntent(intent))
    {
      intentType = "an action";
    }
    else
    {
      intentType = "an unknown";
    }
    return {
      type,
      id,
      milliseconds,
      text: i18n.t(i18nMnemonic, { id: entityId, type: intentType }),
      level,
      entityId,
      extensionId
    };
  }

  return { type, id, milliseconds, text: i18n.t(i18nMnemonic, { id: entityId }), level, entityId, extensionId };
}

async function generateImageCreatedOrUpdatedNotification(event: SocketEventType): Promise<NotificationType>
{
  const imageId = event?.value?.id;
  const image = await ImageService.get({ id: imageId });
  const suffix = event.channel === ChannelEnum.IMAGE_CREATED ? "imageCreated" : "imageUpdated";
  const title = i18n.t(`notifications.${suffix}`);
  const subtitle = i18n.t(`notifications.${suffix}Description`, { imageName: image.name });
  const imageUrl = ImageService.getImageSrc(image.url, Common.NotificationIllustrationEdge, Common.NotificationIllustrationEdge);
  let illustrationUri = imageUrl;
  try
  {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    illustrationUri = await new Promise<string>(
      (resolve) =>
      {
        const reader = new FileReader();
        reader.onloadend = () =>
        {
          resolve(reader.result as string);
        };
        reader.onerror = () =>
        {
          resolve(illustrationUri);
        };
        reader.readAsDataURL(blob);
      }
    );
  }
  catch (error)
  {
    console.warn(`Failed to convert the image with URL '${imageUrl}' into a data URI`, error);
  }
  return {
    id: event.id,
    milliseconds: event.milliseconds,
    type: "image",
    title,
    subtitle,
    data: { id: imageId },
    illustrationUri
  };
}

/*async function generateRepositoryNotification(
  rawData: SocketResponseType,
): Promise<EventNotificationType> {
  const title = i18n.t(`notifications.repositoryEvent`);
  const iconUrl = "repository";
  const description = (await getEventText(rawData.channel, rawData.value))
    .statusText;

  return {
    title,
    type: "repository",
    iconUrl,
    description,
    timeInMilliseconds: rawData.milliseconds,
    seen: false,
  };
}*/

async function generateNotification(event: SocketEventType): Promise<NotificationType | undefined>
{
  const channel = event.channel;
  if (channel === ChannelEnum.IMAGE_CREATED || channel === ChannelEnum.IMAGE_UPDATED)
  {
    return generateImageCreatedOrUpdatedNotification(event);
  }
  /*  if (channel.startsWith("repository")) {
    return generateRepositoryNotification(rawData);
  }*/
}

export default {
  upgrade,
  getSocketEvents,
  storeSocketEvent,
  generateNotification,
  computeEventEntityId,
  computeEventExtensionId,
  computeLog,
  computeLogLevelColor
};
