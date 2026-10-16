
import { Dish, UserProfile } from '../types';

const DB_NAME = 'NooshAppDB_v5';
const DB_VERSION = 1;
const STORES = {
  USERS: 'users',
  DISHES: 'dishes',
  SETTINGS: 'settings'
};

let cachedDbInstance: IDBDatabase | null = null;

export const DB = {
  init: (): Promise<IDBDatabase> => {
    if (cachedDbInstance) {
      return Promise.resolve(cachedDbInstance);
    }
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("IndexedDB initialization timeout"));
      }, 1500);

      try {
        if (!window.indexedDB) {
          clearTimeout(timeout);
          reject(new Error("IndexedDB not supported"));
          return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onblocked = () => {
          clearTimeout(timeout);
          reject(new Error("IndexedDB blocked by another tab"));
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORES.USERS)) {
            db.createObjectStore(STORES.USERS, { keyPath: 'username' });
          }
          if (!db.objectStoreNames.contains(STORES.DISHES)) {
            db.createObjectStore(STORES.DISHES, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
            db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
          }
        };

        request.onsuccess = () => {
          clearTimeout(timeout);
          cachedDbInstance = request.result;
          resolve(request.result);
        };

        request.onerror = () => {
          clearTimeout(timeout);
          reject(request.error || new Error("IndexedDB opening failed"));
        };
      } catch (err) {
        clearTimeout(timeout);
        reject(err);
      }
    });
  },

  // متدهای عمومی برای کار با جداول
  put: async (storeName: string, data: any): Promise<void> => {
    const db = await DB.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  get: async (storeName: string, key: string): Promise<any> => {
    const db = await DB.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  getAll: async (storeName: string): Promise<any[]> => {
    const db = await DB.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  delete: async (storeName: string, key: string): Promise<void> => {
    const db = await DB.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
};
