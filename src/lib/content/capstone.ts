/**
 * The privacy track's capstone evidence.
 *
 * The last module is not assessed by a quiz. It is assessed by the reader
 * actually producing a zero-knowledge proof that their design cleared the bar —
 * which is the only assessment that cannot be passed by recognising the right
 * multiple-choice option.
 *
 * So this records one fact: a real proof was generated on this machine and
 * verified locally before submission. It is written from `src/lib/zk/client.ts`
 * at the moment local verification succeeds, because that is the only point in
 * the app that knows it happened. Deliberately no zustand and no React here —
 * it is imported into the proving path, which is bundle-sensitive.
 *
 * Like every other record this app keeps, it is local to the browser.
 */

'use client';

import { get as idbGet, set as idbSet } from 'idb-keyval';
import { ensureDatabaseReady, progressStore } from '@/lib/persist/database';

const CAPSTONE_KEY = 'capstone-proof';

export interface CapstoneEvidence {
  /** When the proof verified locally. */
  at: number;
  /** Which prover produced it, named so a mock can never pass as a real one. */
  backend: string;
  /** The bar the design cleared. Not the score — that stays private here too. */
  threshold: number;
}

export async function recordProofProduced(evidence: CapstoneEvidence): Promise<void> {
  try {
    await ensureDatabaseReady();
    const existing = await idbGet<CapstoneEvidence>(CAPSTONE_KEY, progressStore);
    // Keep the first proof: the capstone is about having done it, and a later
    // run at a lower threshold should not quietly rewrite the record.
    if (existing && existing.threshold >= evidence.threshold) return;
    await idbSet(CAPSTONE_KEY, evidence, progressStore);
  } catch {
    // Progress is a convenience. Never let it break a proof that succeeded.
  }
}

export async function readProofProduced(): Promise<CapstoneEvidence | null> {
  try {
    await ensureDatabaseReady();
    return (await idbGet<CapstoneEvidence>(CAPSTONE_KEY, progressStore)) ?? null;
  } catch {
    return null;
  }
}
