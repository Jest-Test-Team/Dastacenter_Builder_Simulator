/**
 * IndexedDB persistence layer.
 *
 * Stores builds (BuildSnapshot), progress, settings. Pure browser storage.
 * No server needed for the v1 path; can be extended to support wallet-signed
 * writes to Cloudflare R2 in a future phase.
 */

'use client';

import { useEffect } from 'react';
import { create } from 'zustand';
import { get as idbGet, set as idbSet, del as idbDel, keys as idbKeys, createStore as idbCreateStore } from 'idb-keyval';
import type { BuildSnapshot } from '@/lib/store/build-store';
import { useBuildStore } from '@/lib/store/build-store';

const buildStore = idbCreateStore('dcb-builder', 'builds');
const progressStore = idbCreateStore('dcb-builder', 'progress');
const settingsStore = idbCreateStore('dcb-builder', 'settings');

export interface PersistedBuild {
  id: string;
  name: string;
  scenarioId: string;
  scenarioName: string;
  createdAt: number;
  updatedAt: number;
  /** Compressed snapshot. */
  snapshot: BuildSnapshot;
  /** Cached rating summary (recomputed on load). */
  cachedScore?: number;
  cachedTier?: string;
}

export async function saveBuildToIDB(snapshot: BuildSnapshot): Promise<void> {
  const record: PersistedBuild = {
    id: snapshot.buildId,
    name: snapshot.name,
    scenarioId: snapshot.scenarioId,
    scenarioName: snapshot.scenarioName,
    createdAt: snapshot.createdAt,
    updatedAt: snapshot.updatedAt,
    snapshot,
  };
  await idbSet(snapshot.buildId, record, buildStore);
}

export async function loadBuildFromIDB(id: string): Promise<PersistedBuild | null> {
  const record = (await idbGet<PersistedBuild>(id, buildStore)) ?? null;
  return record;
}

export async function listBuildsFromIDB(): Promise<PersistedBuild[]> {
  const allKeys = (await idbKeys(buildStore)) as string[];
  const records: PersistedBuild[] = [];
  for (const k of allKeys) {
    const r = (await idbGet<PersistedBuild>(k, buildStore)) ?? null;
    if (r) records.push(r);
  }
  return records.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function deleteBuildFromIDB(id: string): Promise<void> {
  await idbDel(id, buildStore);
}

// ----------------------------------------------------------------------------
// Settings store
// ----------------------------------------------------------------------------

export interface Settings {
  theme: 'dark' | 'light';
  locale: string;
  reducedMotion: boolean;
  telemetryOptIn: boolean;
  lastWallet?: string;
  lastChain?: string;
}

const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  locale: 'en',
  reducedMotion: false,
  telemetryOptIn: false,
};

export const useSettings = create<Settings & {
  setSetting: <K extends keyof Settings>(k: K, v: Settings[K]) => void;
  hydrate: () => Promise<void>;
}>((set) => ({
  ...DEFAULT_SETTINGS,
  setSetting: (k, v) => {
    set({ [k]: v } as Partial<Settings>);
    void idbSet('settings', { ...useSettings.getState(), [k]: v }, settingsStore);
  },
  hydrate: async () => {
    const stored = (await idbGet<Settings>('settings', settingsStore)) ?? null;
    if (stored) set({ ...DEFAULT_SETTINGS, ...stored });
  },
}));

// ----------------------------------------------------------------------------
// Auto-save hook
// ----------------------------------------------------------------------------

const AUTOSAVE_DEBOUNCE_MS = 1500;

export function useAutoSave(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsub = useBuildStore.subscribe((state, prev) => {
      if (state.voxels === prev.voxels && state.policies === prev.policies) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void saveBuildToIDB(useBuildStore.getState().exportSnapshot());
      }, AUTOSAVE_DEBOUNCE_MS);
    });
    return () => {
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, [enabled]);
}

/** Hook that wires the manual "save" button. */
export function useSaveBuild() {
  return async () => {
    const snap = useBuildStore.getState().exportSnapshot();
    await saveBuildToIDB(snap);
  };
}

/** Hook that loads a build by id on mount. */
export function useLoadBuild(buildId: string | null) {
  useEffect(() => {
    if (!buildId) return;
    void (async () => {
      const record = await loadBuildFromIDB(buildId);
      if (record) {
        useBuildStore.getState().loadBuild(record.snapshot);
      }
    })();
  }, [buildId]);
}
