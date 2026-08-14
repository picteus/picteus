import { NotificationType } from "types";
import { getObjectStore, StoreKind } from "./IndexDbService.ts";


const notificationsKind: StoreKind = "notifications";

let latestNotification: NotificationType | undefined = undefined;
const notificationListeners: Set<() => void> = new Set();

async function upgrade(_previousVersion: string, currentVersion: string): Promise<void>
{
  if (currentVersion === "0.7.0")
  {
    await deleteAllNotifications();
  }
}

async function getNotifications(): Promise<NotificationType []>
{
  const store = await getObjectStore(notificationsKind, "readonly");
  return new Promise<NotificationType[]>((resolve, reject) =>
  {
    const request = store.getAll();
    request.onsuccess = () =>
    {
      const notifications: NotificationType[] = request.result;
      resolve(notifications.sort((notification1, notification2) => notification2.milliseconds - notification1.milliseconds));
    };
    request.onerror = () => reject(request.error);
  });
}

async function storeNotification(notification: NotificationType): Promise<void>
{
  const store = await getObjectStore(notificationsKind, "readwrite");
  store.add(notification);
  latestNotification = notification;
  for (const listener of notificationListeners)
  {
    listener();
  }
}

function subscribeToNotifications(callback: () => void): () => boolean
{
  notificationListeners.add(callback);
  return () => notificationListeners.delete(callback);
}

function getNotification(): NotificationType | undefined
{
  return latestNotification;
}

async function deleteNotification(id: string): Promise<void>
{
  const store = await getObjectStore(notificationsKind, "readwrite");
  return new Promise<void>((resolve, reject) =>
  {
    const deleteRequest = store.delete(id);
    deleteRequest.onsuccess = () =>
    {
      resolve();
    };
    deleteRequest.onerror = () => reject(deleteRequest.error);
  });
}

async function deleteAllNotifications(): Promise<void>
{
  const store = await getObjectStore(notificationsKind, "readwrite");
  return new Promise<void>((resolve, reject) =>
  {
    const clearRequest = store.clear();
    clearRequest.onsuccess = () =>
    {
      resolve();
    };
    clearRequest.onerror = () => reject(clearRequest.error);
  });
}

export default {
  upgrade,
  deleteNotification,
  deleteAllNotifications,
  getNotifications,
  storeNotification,
  subscribeToNotifications,
  getNotification
};
