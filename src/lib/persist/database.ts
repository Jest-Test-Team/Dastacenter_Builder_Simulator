'use client';

import { createStore } from 'idb-keyval';

const DATABASE_NAME = 'dcb-builder';
const DATABASE_VERSION = 2;
const STORE_NAMES = ['builds', 'progress', 'settings', 'block-plugins'] as const;

export const buildStore = createStore(DATABASE_NAME, 'builds');
export const progressStore = createStore(DATABASE_NAME, 'progress');
export const settingsStore = createStore(DATABASE_NAME, 'settings');
export const pluginStore = createStore(DATABASE_NAME, 'block-plugins');

let databaseReady: Promise<void> | null = null;

/** Ensure every logical store exists before idb-keyval opens a transaction. */
export function ensureDatabaseReady(): Promise<void> {
  if (typeof indexedDB === 'undefined') return Promise.resolve();
  if (!databaseReady) {
    databaseReady = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        for (const storeName of STORE_NAMES) {
          if (!database.objectStoreNames.contains(storeName)) database.createObjectStore(storeName);
        }
      };
      request.onsuccess = () => {
        request.result.close();
        resolve();
      };
      request.onerror = () => reject(request.error ?? new Error('Failed to open local database.'));
      request.onblocked = () =>
        reject(new Error('Local database upgrade is blocked by another open tab. Close it and retry.'));
    });
  }
  return databaseReady;
}
