import 'fake-indexeddb/auto';

import { describe, expect, it } from 'vitest';
import { emptyState } from '@/lib/blocks';
import { loadBuildFromIDB, saveBuildToIDB } from '@/lib/persist';

const DATABASE_NAME = 'dcb-builder';

describe('IndexedDB persistence', () => {
  it('upgrades a partial version-1 database before saving a build', async () => {
    await deleteDatabase(DATABASE_NAME);
    await createLegacyDatabase();

    const snapshot = emptyState();
    snapshot.buildId = 'migration-test';
    snapshot.name = 'Migration test';

    await expect(saveBuildToIDB(snapshot)).resolves.toBeUndefined();
    await expect(loadBuildFromIDB(snapshot.buildId)).resolves.toMatchObject({
      id: snapshot.buildId,
      name: snapshot.name,
    });

    const stores = await getStoreNames();
    expect(stores).toEqual(['block-plugins', 'builds', 'progress', 'settings']);
  });
});

function createLegacyDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('settings');
    request.onsuccess = () => {
      request.result.close();
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

function getStoreNames(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME);
    request.onsuccess = () => {
      const stores = Array.from(request.result.objectStoreNames).sort();
      request.result.close();
      resolve(stores);
    };
    request.onerror = () => reject(request.error);
  });
}

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error(`Database ${name} is still open.`));
  });
}
