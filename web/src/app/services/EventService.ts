import i18n from "i18n/i18n.ts";

import { ChannelEnum, EventLogType, EventNotificationType, ExtensionIntentType, SocketEventType } from "types";
import { formatDate } from "utils";
import { ImageService } from "app/services";


const INDEXED_DB_NAME = "picteus";
const INDEXED_DB_SOCKET_EVENTS_STORE = "socketEvents";
const INDEXED_DB_NOTIFICATIONS_STORE = "notifications";

type StoreKind = "socketEvents" | "notifications";

let indexedDbSocketEventsInstance: IDBDatabase | null = null;
let indexedDbNotificationsInstance: IDBDatabase | null = null;

const upgrade = (_previousVersion: string, currentVersion: string)=>{
  if (currentVersion === "0.4.0" || currentVersion === "0.5.0") {
    indexedDB.deleteDatabase(INDEXED_DB_NAME);
  }
}

const initializeIndexedDB = (kind: StoreKind): Promise<IDBDatabase> => {
  let instance: IDBDatabase | null = kind === "socketEvents" ? indexedDbSocketEventsInstance : indexedDbNotificationsInstance;
  if (instance) {
    return Promise.resolve(instance);
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(INDEXED_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      const stores = [INDEXED_DB_SOCKET_EVENTS_STORE, INDEXED_DB_NOTIFICATIONS_STORE];
      for (const store of stores) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: "id" });
        }
      }
    };
    request.onsuccess = () => {
      instance = request.result;
      if (kind === "socketEvents") {
        indexedDbSocketEventsInstance = instance;
      }
      else if (kind === "notifications") {
        indexedDbNotificationsInstance = instance;
      }
      resolve(instance);
    };
    request.onerror = () => reject(request.error);
  });
};

async function getSocketEvents(): Promise<SocketEventType []> {
  const db = await initializeIndexedDB("socketEvents");
  const transaction = db.transaction(INDEXED_DB_SOCKET_EVENTS_STORE, "readonly");
  const store = transaction.objectStore(INDEXED_DB_SOCKET_EVENTS_STORE);
  return new Promise<SocketEventType[]>((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => {
      const events: SocketEventType[] = request.result;
      resolve(events.sort((event1, event2) => event2.milliseconds - event1.milliseconds));
    };
    request.onerror = () => reject(request.error);
  });
}

async function storeSocketEvent(event: SocketEventType) {
  const db = await initializeIndexedDB("socketEvents");
  const transaction = db.transaction(INDEXED_DB_SOCKET_EVENTS_STORE, "readwrite");
  const store = transaction.objectStore(INDEXED_DB_SOCKET_EVENTS_STORE);
  store.add(event);
}

async function getNotifications(): Promise<EventNotificationType []> {
  const db = await initializeIndexedDB("notifications");
  const transaction = db.transaction(INDEXED_DB_NOTIFICATIONS_STORE, "readonly");
  const store = transaction.objectStore(INDEXED_DB_NOTIFICATIONS_STORE);
  return new Promise<EventNotificationType[]>((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => {
      const events: EventNotificationType[] = request.result;
      resolve(events.sort((event1, event2) => event2.milliseconds - event1.milliseconds));
    };
    request.onerror = () => reject(request.error);
  });
}

async function storeNotification(notification: EventNotificationType) {
  const db = await initializeIndexedDB("notifications");
  const transaction = db.transaction(INDEXED_DB_NOTIFICATIONS_STORE, "readwrite");
  const store = transaction.objectStore(INDEXED_DB_NOTIFICATIONS_STORE);
  store.add(notification);
}

function computeLogLevelColor(logLevel: string): string {
  if (logLevel === "info") {
    return "blue";
  } else if (logLevel === "warn") {
    return "orange";
  } else if (logLevel === "error") {
    return "red";
  } else {
    return "gray";
  }
}

function computeEventExtensionId(event: SocketEventType): string | undefined {
  if (event.channel.startsWith(ChannelEnum.EXTENSION_PREFIX)) {
    return event.value["id"];
  }
  return undefined;
}

function computeEventLog(event: SocketEventType): EventLogType {
  const date = formatDate(event.milliseconds);
  const { channel, value } = event;
  if (channel === ChannelEnum.EXTENSION_LOG) {
    const extensionId = value["id"];
    const message = value.message;
    return { id: event.id, milliseconds: event.milliseconds, text: message.message, level: message.level, date, extensionId };
  }

  function computeI18nId(): string {
    const valueId = value["id"];
    if (channel.startsWith(ChannelEnum.REPOSITORY_PREFIX) || channel.startsWith(ChannelEnum.IMAGE_PREFIX)) {
      return valueId;
    }
    return computeEventExtensionId(event);
  }

  const i18nMnemonic = `eventInformation.${channel}`;
  const id = computeI18nId();
  const level = "info";

  if (channel === ChannelEnum.EXTENSION_INTENT) {
    const intent = (value as ExtensionIntentType).intent;
    let type: string;
    if (intent.form) {
      type = "a form";
    } else if (intent.ui) {
      type = "a ui";
    } else if (intent.dialog) {
      type = "a dialog";
    } else if (intent.show) {
      type = "a show";
    } else if (intent.images) {
      type = "some images";
    }
    else {
      type = "an unknown";
    }
    return { id: event.id, milliseconds: event.milliseconds, text: i18n.t(i18nMnemonic, { id, type}), level, date, extensionId: id };
  }

  const result: EventLogType = { id: event.id, milliseconds: event.milliseconds, text: i18n.t(i18nMnemonic, { id }), level, date };
  if (channel.startsWith(ChannelEnum.EXTENSION_PREFIX)) {
    result.extensionId = id;
  }

  return result;
}

async function generateImageCreatedOrUpdatedNotification(event: SocketEventType): Promise<EventNotificationType> {
  const imageId = event?.value?.id;
  const image = await ImageService.get({ id: imageId });
  const suffix = event.channel === ChannelEnum.IMAGE_CREATED ? "imageCreated" : "imageUpdated";
  const title = i18n.t(`notifications.${suffix}`);
  const iconUrl = ImageService.getImageSrc(image.uri, undefined, 32);
  const description = i18n.t(`notifications.${suffix}Description`, { imageName: image.name });
  return { id: event.id, title, type: "image", iconUrl, description, milliseconds: event.milliseconds, entityId: imageId };
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

async function generateNotification(event: SocketEventType): Promise<EventNotificationType | undefined> {
  const channel = event.channel;
  if (channel === ChannelEnum.IMAGE_CREATED || channel === ChannelEnum.IMAGE_UPDATED) {
    return generateImageCreatedOrUpdatedNotification(event);
  }
  /*  if (channel.startsWith("repository")) {
    return generateRepositoryNotification(rawData);
  }*/
}

async function deleteNotification(id: string) {
  const db = await initializeIndexedDB("notifications");
  const transaction = db.transaction(INDEXED_DB_NOTIFICATIONS_STORE, "readwrite");
  const store = transaction.objectStore(INDEXED_DB_NOTIFICATIONS_STORE);

  return new Promise<void>((resolve, reject) => {
    const deleteRequest = store.delete(id);
    deleteRequest.onsuccess = () => {
      resolve();
    };
    deleteRequest.onerror = () => reject(deleteRequest.error);
  });
}

async function deleteAllNotifications() {
  const db = await initializeIndexedDB("notifications");
  const transaction = db.transaction(INDEXED_DB_NOTIFICATIONS_STORE, "readwrite");
  const store = transaction.objectStore(INDEXED_DB_NOTIFICATIONS_STORE);

  return new Promise<void>((resolve, reject) => {
    const clearRequest = store.clear();
    clearRequest.onsuccess = () => {
      resolve();
    };
    clearRequest.onerror = () => reject(clearRequest.error);
  });
}
export default {
  upgrade,
  getSocketEvents,
  storeSocketEvent,
  generateNotification,
  deleteNotification,
  deleteAllNotifications,
  getNotifications,
  storeNotification,
  computeEventExtensionId,
  computeEventLog,
  computeLogLevelColor
};
