import { NotificationType } from "types";
import { getObjectStore, StoreKind } from "./IndexDbService.ts";


const notificationsKind: StoreKind = "notifications";

let latestNotification: NotificationType | undefined = undefined;
const latestNotificationListeners: Set<() => void> = new Set();
const notificationsChangedListeners: Set<() => void> = new Set();

function notifyListeners(): void
{
  function internalNotifyListeners(listeners: Set<() => void>): void
  {
    for (const listener of listeners)
    {
      listener();
    }
  }

  internalNotifyListeners(latestNotificationListeners);
  internalNotifyListeners(notificationsChangedListeners);
}

async function upgrade(_previousVersion: string, currentVersion: string): Promise<void>
{
  if (currentVersion === "0.7.0")
  {
    await deleteAllNotifications();
  }
}

function subscribeToLatestNotifications(callback: () => void): () => void
{
  latestNotificationListeners.add(callback);
  return () => latestNotificationListeners.delete(callback);
}

function subscribeToNotificationsChanged(callback: () => void): () => void
{
  notificationsChangedListeners.add(callback);
  return () => notificationsChangedListeners.delete(callback);
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
  notifyListeners();
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
      notifyListeners();
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
      notifyListeners();
      resolve();
    };
    clearRequest.onerror = () => reject(clearRequest.error);
  });
}

export default {
  upgrade,
  subscribeToLatestNotifications,
  subscribeToNotificationsChanged,
  deleteNotification,
  deleteAllNotifications,
  getNotifications,
  storeNotification,
  getNotification
};
