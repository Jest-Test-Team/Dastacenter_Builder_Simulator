/**
 * Curriculum progress.
 *
 * The IndexedDB `progress` store has existed since the persistence layer was
 * written and nothing ever wrote to it; `/learn` had no memory at all. It does
 * now, because the Compact track ends in a credential and a credential needs
 * something to gate on.
 *
 * Progress is local-only and per-browser, like every other artifact this app
 * stores. Nothing is sent anywhere — which is the same claim the curriculum
 * itself teaches, so it had better hold here too.
 */

'use client';

import { useEffect } from 'react';
import { create } from 'zustand';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { ensureDatabaseReady, progressStore } from '@/lib/persist/database';
import { modulesInTrack, type ModuleTrack } from '@/lib/content/modules';

const PROGRESS_KEY = 'curriculum';

export interface ModuleProgress {
  /** When the module was marked read. */
  completedAt: number;
  /** Highest quiz result recorded, if the module has a quiz. */
  quizCorrect?: number;
  quizTotal?: number;
}

export type ProgressMap = Record<string, ModuleProgress>;

interface ProgressState {
  progress: ProgressMap;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  markComplete: (moduleId: string, quiz?: { correct: number; total: number }) => void;
  clear: (moduleId: string) => void;
}

async function persist(progress: ProgressMap): Promise<void> {
  await ensureDatabaseReady();
  await idbSet(PROGRESS_KEY, progress, progressStore);
}

export const useCurriculumProgress = create<ProgressState>((set, get) => ({
  progress: {},
  hydrated: false,
  hydrate: async () => {
    if (get().hydrated) return;
    await ensureDatabaseReady();
    const stored = (await idbGet<ProgressMap>(PROGRESS_KEY, progressStore)) ?? {};
    set({ progress: stored, hydrated: true });
  },
  markComplete: (moduleId, quiz) => {
    const previous = get().progress[moduleId];
    const next: ModuleProgress = {
      completedAt: previous?.completedAt ?? Date.now(),
      // Never downgrade a recorded score: a retake that goes worse is still practice.
      quizCorrect: Math.max(quiz?.correct ?? 0, previous?.quizCorrect ?? 0),
      quizTotal: quiz?.total ?? previous?.quizTotal,
    };
    if (next.quizTotal === undefined) delete next.quizCorrect;
    const progress = { ...get().progress, [moduleId]: next };
    set({ progress });
    void persist(progress);
  },
  clear: (moduleId) => {
    const progress = { ...get().progress };
    delete progress[moduleId];
    set({ progress });
    void persist(progress);
  },
}));

/** Hydrate once per mount; safe to call from several components on a page. */
export function useHydratedProgress(): ProgressState {
  const state = useCurriculumProgress();
  useEffect(() => {
    void state.hydrate();
    // `hydrate` is a stable zustand action and self-guards on `hydrated`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return state;
}

/** How much of a track is done, for a progress bar or a credential gate. */
export function trackCompletion(
  progress: ProgressMap,
  track: ModuleTrack,
): { done: number; total: number; complete: boolean } {
  const ids = modulesInTrack(track).map((m) => m.id);
  const done = ids.filter((id) => progress[id]).length;
  return { done, total: ids.length, complete: ids.length > 0 && done === ids.length };
}
