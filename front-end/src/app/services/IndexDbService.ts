export const INDEXED_DB_NAME = "picteus";
const INDEXED_DB_SOCKET_EVENTS_STORE = "socketEvents";
const INDEXED_DB_NOTIFICATIONS_STORE = "notifications";

const socketEventsKind = "socketEvents";
const notificationsKind = "notifications";

export type StoreKind = typeof socketEventsKind | typeof notificationsKind;

let indexedDbSocketEventsInstance: IDBDatabase | null = null;
let indexedDbNotificationsInstance: IDBDatabase | null = null;

function initializeIndexedDB(kind: StoreKind): Promise<IDBDatabase>
{
  let instance: IDBDatabase | null = kind === "socketEvents" ? indexedDbSocketEventsInstance : indexedDbNotificationsInstance;
  if (instance)
  {
    return Promise.resolve(instance);
  }
  return new Promise((resolve, reject) =>
  {
    const request = indexedDB.open(INDEXED_DB_NAME, 1);
    request.onupgradeneeded = () =>
    {
      const db = request.result;
      const stores = [ INDEXED_DB_SOCKET_EVENTS_STORE, INDEXED_DB_NOTIFICATIONS_STORE ];
      for (const store of stores)
      {
        if (!db.objectStoreNames.contains(store))
        {
          db.createObjectStore(store, { keyPath: "id" });
        }
      }
    };
    request.onsuccess = () =>
    {
      instance = request.result;
      if (kind === "socketEvents")
      {
        indexedDbSocketEventsInstance = instance;
      }
      else if (kind === "notifications")
      {
        indexedDbNotificationsInstance = instance;
      }
      resolve(instance);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getObjectStore(kind: StoreKind, mode: IDBTransactionMode): Promise<IDBObjectStore>
{
  const database = await initializeIndexedDB(kind);
  const storeNames = kind === socketEventsKind ? INDEXED_DB_SOCKET_EVENTS_STORE : INDEXED_DB_NOTIFICATIONS_STORE;
  const transaction = database.transaction(storeNames, mode);
  return transaction.objectStore(storeNames);
}
