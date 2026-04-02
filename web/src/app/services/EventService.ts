import { ChannelEnum, EventInformationType, EventNotificationType, ExtensionIntentType, SocketEventType } from "types";
import i18n from "i18n/i18n.ts";
import { ImageService, RepositoriesService } from "app/services";

const INDEXED_DB_NAME = "PicteusDatabase";
const INDEXED_DB_STORE = "ActivityStore";

let indexedDbInstance: IDBDatabase | null = null;

const initializeIndexedDB = (): Promise<IDBDatabase> => {
  if (indexedDbInstance) {
    return Promise.resolve(indexedDbInstance);
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(INDEXED_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(INDEXED_DB_STORE)) {
        db.createObjectStore(INDEXED_DB_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => {
      indexedDbInstance = request.result;
      resolve(indexedDbInstance);
    };
    request.onerror = () => reject(request.error);
  });
};

async function pushEventIntoIndexedDB(event: EventInformationType) {
  const db = await initializeIndexedDB();
  const transaction = db.transaction(INDEXED_DB_STORE, "readwrite");
  const store = transaction.objectStore(INDEXED_DB_STORE);
  const { onResult, ...toStore } = event;
  store.add(toStore);
}

async function getEventsFromIndexedDB() {
  const db = await initializeIndexedDB();
  const transaction = db.transaction(INDEXED_DB_STORE, "readonly");
  const store = transaction.objectStore(INDEXED_DB_STORE);
  return new Promise<EventInformationType[] | null>((resolve, reject) => {
    const request = store.getAll();

    request.onsuccess = () => {
      const events: EventInformationType[] = request.result;
      resolve(
        events.sort((a, b) => b.rawData.milliseconds - a.rawData.milliseconds),
      );
    };
    request.onerror = () => reject(request.error);
  });
}

type getEventTextReturnType = {
  statusText: string;
  logLevel: string;
};

function computeLogLevelColor(logLevel: string) {
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

async function getEventText(channel: string, value: Record<string, any>): Promise<getEventTextReturnType> {
  if (channel === ChannelEnum.EXTENSION_LOG) {
    return { statusText: `Extension "${value.id}" : ${value.message.message}`, logLevel: value.message.level };
  }

  async function computeId() {
    if (channel.startsWith(ChannelEnum.REPOSITORY_PREFIX)) {
      const repository = RepositoriesService.getRepositoryInformation(
        value["id"],
      );
      return repository.name;
    }
    else if (channel.startsWith(ChannelEnum.IMAGE_PREFIX)) {
      try {
        const image = await ImageService.get({ id: value["id"] });
        return image.name;
      } catch (error) {
        console.warn("Can't fetch the image, probably deleted", error);
        return "Image";
      }
    }
    else if (channel.startsWith(ChannelEnum.EXTENSION_PREFIX)) {
      return value["id"];
    }
  }
  const i18nMnemonic = `eventInformation.${channel}`;
  const id = await computeId();
  const logLevel = "info";

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
      type = "an images";
    }
    else {
      type = "an unknown";
    }
    return { statusText: i18n.t(i18nMnemonic, { id, type}), logLevel };
  }

  const statusText = i18n.t(i18nMnemonic, { id });
  return { statusText, logLevel };
}

async function generateImageCreatedOrUpdatedNotification(
  rawData: SocketEventType,
): Promise<EventNotificationType> {
  const imageId = rawData?.value?.id;
  const image = await ImageService.get({ id: imageId });
  const intlPrefix =
    rawData.channel === ChannelEnum.IMAGE_CREATED
      ? "imageCreated"
      : "imageUpdated";

  const title = i18n.t(`notifications.${intlPrefix}`);
  const iconUrl = ImageService.getImageSrc(image.uri, undefined, 32);
  const description = i18n.t(`notifications.${intlPrefix}Description`, {
    imageName: image.name,
  });
  /*
  const onClick = () => setImageVisualizerContext({ imageSummary: image });
*/

  return {
    title,
    type: "image",
    iconUrl,
    description,
    timeInMilliseconds: rawData.milliseconds,
    seen: false,
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

async function generateNotification(
  rawData: SocketEventType,
): Promise<EventNotificationType> {
  const channel = rawData.channel;
  if (
    channel === ChannelEnum.IMAGE_CREATED ||
    channel === ChannelEnum.IMAGE_UPDATED
  ) {
    return generateImageCreatedOrUpdatedNotification(rawData);
  }
  /*  if (channel.startsWith("repository")) {
    return generateRepositoryNotification(rawData);
  }*/
}

async function clearNotification(id: string) {
  const db = await initializeIndexedDB();
  const transaction = db.transaction(INDEXED_DB_STORE, "readwrite");
  const store = transaction.objectStore(INDEXED_DB_STORE);

  return new Promise<void>((resolve, reject) => {
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const event: EventInformationType = getRequest.result;
      if (event) {
        const updated: EventInformationType = {
          ...event,
          notification: { ...event.notification, seen: true },
        };
        const updateRequest = store.put(updated);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(updateRequest.error);
      } else {
        reject(new Error("Event not found"));
      }
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
}

async function markAllNotificationsAsSeen() {
  const db = await initializeIndexedDB();
  const transaction = db.transaction(INDEXED_DB_STORE, "readwrite");
  const store = transaction.objectStore(INDEXED_DB_STORE);

  return new Promise<void>((resolve, reject) => {
    const getAllRequest = store.getAll();

    getAllRequest.onsuccess = () => {
      const events: EventInformationType[] = getAllRequest.result;

      if (events.length > 0) {
        const updateTransaction = db.transaction(INDEXED_DB_STORE, "readwrite");
        const updateStore = updateTransaction.objectStore(INDEXED_DB_STORE);

        events.forEach((event) => {
          if (event.notification) {
            const updated: EventInformationType = {
              ...event,
              notification: { ...event.notification, seen: true },
            };
            updateStore.put(updated);
          }
        });

        updateTransaction.oncomplete = () => resolve();
        updateTransaction.onerror = () => reject(updateTransaction.error);
      } else {
        resolve(); // No events to update
      }
    };

    getAllRequest.onerror = () => reject(getAllRequest.error);
  });
}
export default {
  pushEventIntoIndexedDB,
  clearNotification,
  markAllNotificationsAsSeen,
  computeLogLevelColor,
  getEventsFromIndexedDB,
  getEventText,
  generateNotification,
};
