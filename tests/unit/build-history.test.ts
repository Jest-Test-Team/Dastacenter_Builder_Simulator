/**
 * Undo/redo history semantics.
 *
 * Two regressions live here, both found by driving the deployed builder:
 *
 * 1. History must record one entry per WORLD change, not one per set. The
 *    temporal `equality` used to be strict identity over a freshly-built
 *    partialized object — never true — so hover churn flooded pastStates with
 *    duplicates, an undo peeled a duplicate instead of a change, and the next
 *    UI set wiped futureStates so redo never enabled.
 *
 * 2. zundo's `undo(steps)` must never receive a DOM event. `onClick={undo}`
 *    passed a MouseEvent, `splice(-MouseEvent)` sliced nothing, and
 *    `userSet(undefined)` replaced the whole store with undefined — a full
 *    page crash. The UI calls `() => undo()`; this file pins the store-level
 *    consequence so the crash shape is never reintroduced.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { useBuildStore } from '@/lib/store/build-store';

const temporal = () => useBuildStore.temporal.getState();
const blockCount = () => Object.keys(useBuildStore.getState().voxels).length;

beforeEach(() => {
  useBuildStore.getState().startBuild('free', 'Free build', { server_rack: 10, ups: 10 });
});

describe('build history', () => {
  it('records one entry per world change, ignoring UI-only sets', () => {
    useBuildStore.getState().placeBlock('server_rack', { x: 1, y: 0, z: 1 }, 0);
    useBuildStore.getState().placeBlock('ups', { x: 3, y: 0, z: 3 }, 0);
    for (let i = 0; i < 25; i++) {
      useBuildStore.getState().setHoveredCell({ x: i % 5, y: 0, z: i % 5 });
    }
    expect(temporal().pastStates.length).toBe(2);
  });

  it('one undo reverts the last placement even after hover churn', () => {
    useBuildStore.getState().placeBlock('server_rack', { x: 1, y: 0, z: 1 }, 0);
    useBuildStore.getState().placeBlock('ups', { x: 3, y: 0, z: 3 }, 0);
    for (let i = 0; i < 25; i++) {
      useBuildStore.getState().setHoveredCell({ x: i % 5, y: 0, z: i % 5 });
    }
    expect(blockCount()).toBe(2);
    temporal().undo();
    expect(blockCount()).toBe(1);
    expect(temporal().futureStates.length).toBe(1);
  });

  it('redo survives UI-only sets after an undo', () => {
    useBuildStore.getState().placeBlock('server_rack', { x: 1, y: 0, z: 1 }, 0);
    temporal().undo();
    // Post-undo pointer movement must not wipe the future stack.
    useBuildStore.getState().setHoveredCell({ x: 2, y: 0, z: 2 });
    expect(temporal().futureStates.length).toBe(1);
    temporal().redo();
    expect(blockCount()).toBe(1);
  });

  it('the store never becomes undefined, even with empty history', () => {
    temporal().clear();
    temporal().undo();
    temporal().redo();
    expect(useBuildStore.getState()).toBeDefined();
    expect(typeof useBuildStore.getState().setScenario).toBe('function');
  });
});
