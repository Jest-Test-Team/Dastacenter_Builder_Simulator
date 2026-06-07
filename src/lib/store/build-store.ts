/**
 * Build store.
 *
 * Holds the entire state of one in-progress build:
 *  - the voxel world (block instances by cell key)
 *  - the policy panel state (deterrence, 5-function controls, ESG, privacy)
 *  - the inventory (counts of each block type the user has available)
 *  - UI state (selected block, hover, mode, camera)
 *
 * Wrapped with zundo for time-travel (undo/redo). History is in-memory only;
 * the saved build is persisted separately via lib/persist.
 */

import { create } from 'zustand';
import { temporal } from 'zundo';
import { useStore } from 'zustand';
import { nanoid } from 'nanoid';
import type { TemporalState } from 'zundo';
import {
  type BlockInstance,
  type BlockDef,
  type BuildState as PureBuildState,
  getBlock,
  CATEGORIES,
  BLOCK_REGISTRY,
} from '@/lib/blocks';
import { cellKey, type Cell, type GridSize, DEFAULT_GRID_SIZE } from '@/lib/grid';
import { defaultPolicyState, type PolicyState, type PolicyKey } from '@/lib/scoring/policy';

export type BuildMode = 'build' | 'sim' | 'inspect';

export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
  zoom: number;
}

export interface BuildState extends PureBuildState {
  // Identity
  scenarioName: string;

  // World
  gridSize: GridSize;

  // UI
  mode: BuildMode;
  selectedInstanceId: string | null;
  hoveredCell: Cell | null;
  activeBlockType: string | null; // for placement
  rotation: 0 | 1 | 2 | 3;
  camera: CameraState;
}

export interface BuildActions {
  // World
  placeBlock: (
    type: string,
    position: Cell,
    rotation?: 0 | 1 | 2 | 3,
  ) => { ok: true; id: string } | { ok: false; reason: string };
  removeBlock: (instanceId: string) => void;
  removeAt: (cell: Cell) => void;
  moveBlock: (instanceId: string, to: Cell) => void;
  rotateBlock: (instanceId: string) => void;
  clearAll: () => void;

  // Inventory
  decrementInventory: (type: string, n?: number) => void;
  incrementInventory: (type: string, n?: number) => void;
  resetInventory: (counts?: Record<string, number>) => void;

  // Policies
  setPolicy: (key: PolicyKey, value: boolean | number | string) => void;

  // UI
  setMode: (mode: BuildMode) => void;
  setSelected: (id: string | null) => void;
  setHoveredCell: (cell: Cell | null) => void;
  setActiveBlockType: (type: string | null) => void;
  setRotation: (r: 0 | 1 | 2 | 3) => void;
  setCamera: (camera: Partial<CameraState>) => void;

  // Meta
  rename: (name: string) => void;
  setScenario: (id: string, name: string) => void;
  startBuild: (
    scenarioId: string,
    scenarioName: string,
    inventory?: Record<string, number>,
  ) => void;

  // Bulk
  loadBuild: (snapshot: BuildSnapshot) => void;
  exportSnapshot: () => BuildSnapshot;
}

/** Snapshot of a build that can be persisted or shared.
 *  Uses the pure data BuildState (no UI fields). */
export type BuildSnapshot = PureBuildState;

export type BuildStore = BuildState & BuildActions;

function defaultInventory(): Record<string, number> {
  const inv: Record<string, number> = {};
  for (const b of BLOCK_REGISTRY) {
    inv[b.id] = b.defaultInventory;
  }
  return inv;
}

function makeId() {
  return nanoid(10);
}

function cellsForBlock(type: string, position: Cell, rotation: 0 | 1 | 2 | 3): Cell[] {
  const def = getBlock(type);
  if (!def) return [];
  let [w, h, d] = def.size;
  // rotation: 1 swaps w and d
  if (rotation % 2 === 1) [w, d] = [d, w];
  const cells: Cell[] = [];
  for (let dx = 0; dx < w; dx++) {
    for (let dy = 0; dy < h; dy++) {
      for (let dz = 0; dz < d; dz++) {
        cells.push({ x: position.x + dx, y: position.y + dy, z: position.z + dz });
      }
    }
  }
  return cells;
}

function createInitial(scenarioId = 'free', scenarioName = 'Free Build'): BuildState {
  return {
    buildId: makeId(),
    scenarioId,
    scenarioName,
    gridSize: DEFAULT_GRID_SIZE,
    voxels: {},
    byCell: {},
    inventory: defaultInventory(),
    policies: defaultPolicyState(),
    mode: 'build',
    selectedInstanceId: null,
    hoveredCell: null,
    activeBlockType: null,
    rotation: 0,
    camera: {
      position: [20, 20, 20],
      target: [8, 2, 8],
      zoom: 1,
    },
    name: 'Untitled Build',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export const useBuildStore = create<BuildStore>()(
  temporal(
    (set, get) => ({
      ...createInitial(),

      placeBlock: (type, position, rotation) => {
        const def = getBlock(type) as BlockDef | undefined;
        if (!def) return { ok: false, reason: `Unknown block type: ${type}` };

        const rot = rotation ?? get().rotation;
        const cells = cellsForBlock(type, position, rot);
        if (cells.length === 0) return { ok: false, reason: 'No cells for block' };

        const { gridSize, byCell, inventory } = get();
        for (const c of cells) {
          if (
            c.x < 0 ||
            c.x >= gridSize.w ||
            c.y < 0 ||
            c.y >= gridSize.h ||
            c.z < 0 ||
            c.z >= gridSize.d
          ) {
            return { ok: false, reason: 'Out of bounds' };
          }
          if (byCell[cellKey(c)]) {
            return { ok: false, reason: 'Cell occupied' };
          }
        }

        if ((inventory[type] ?? 0) <= 0 && !def.decorative) {
          return { ok: false, reason: 'No inventory' };
        }

        // For multi-cell blocks, clear cells of the new block
        for (const c of cells) {
          // occupied checks already done above
        }

        const id = makeId();
        set((s) => {
          const newByCell: Record<string, string> = { ...s.byCell };
          for (const c of cells) newByCell[cellKey(c)] = id;
          const inv2 = { ...s.inventory };
          if (inv2[type] !== undefined && inv2[type] > 0) inv2[type] -= 1;
          return {
            voxels: { ...s.voxels, [id]: { id, type, position, rotation: rot, metadata: {} } },
            byCell: newByCell,
            inventory: inv2,
            updatedAt: Date.now(),
          };
        });
        return { ok: true, id };
      },

      removeBlock: (instanceId) => {
        const inst = get().voxels[instanceId];
        if (!inst) return;
        const cells = cellsForBlock(inst.type, inst.position, inst.rotation);
        set((s) => {
          const { [instanceId]: _, ...rest } = s.voxels;
          const newByCell: Record<string, string> = { ...s.byCell };
          for (const c of cells) delete newByCell[cellKey(c)];
          const inv2 = { ...s.inventory };
          inv2[inst.type] = (inv2[inst.type] ?? 0) + 1;
          return {
            voxels: rest,
            byCell: newByCell,
            inventory: inv2,
            selectedInstanceId: s.selectedInstanceId === instanceId ? null : s.selectedInstanceId,
            updatedAt: Date.now(),
          };
        });
      },

      removeAt: (cell) => {
        const id = get().byCell[cellKey(cell)];
        if (id) get().removeBlock(id);
      },

      moveBlock: (instanceId, to) => {
        const inst = get().voxels[instanceId];
        if (!inst) return;
        // simple move: remove + place (preserves history granularity)
        const type = inst.type;
        const rotation = inst.rotation;
        get().removeBlock(instanceId);
        get().placeBlock(type, to, rotation);
      },

      rotateBlock: (instanceId) => {
        const inst = get().voxels[instanceId];
        if (!inst) return;
        const nextRot = ((inst.rotation + 1) % 4) as 0 | 1 | 2 | 3;
        const type = inst.type;
        get().removeBlock(instanceId);
        get().placeBlock(type, inst.position, nextRot);
      },

      clearAll: () => {
        set((s) => ({
          voxels: {},
          byCell: {},
          inventory: defaultInventory(),
          selectedInstanceId: null,
          hoveredCell: null,
          updatedAt: Date.now(),
        }));
      },

      decrementInventory: (type, n = 1) =>
        set((s) => ({
          inventory: { ...s.inventory, [type]: Math.max(0, (s.inventory[type] ?? 0) - n) },
        })),

      incrementInventory: (type, n = 1) =>
        set((s) => ({ inventory: { ...s.inventory, [type]: (s.inventory[type] ?? 0) + n } })),

      resetInventory: (counts) =>
        set(() => ({ inventory: { ...defaultInventory(), ...(counts ?? {}) } })),

      setPolicy: (key, value) =>
        set((s) => ({ policies: { ...s.policies, [key]: value }, updatedAt: Date.now() })),

      setMode: (mode) => set({ mode }),
      setSelected: (id) => set({ selectedInstanceId: id }),
      setHoveredCell: (cell) => set({ hoveredCell: cell }),
      setActiveBlockType: (type) => set({ activeBlockType: type }),
      setRotation: (r) => set({ rotation: r }),
      setCamera: (camera) => set((s) => ({ camera: { ...s.camera, ...camera } })),

      rename: (name) => set({ name, updatedAt: Date.now() }),
      setScenario: (id, name) => set({ scenarioId: id, scenarioName: name, updatedAt: Date.now() }),
      startBuild: (scenarioId, scenarioName, inventory) => {
        set(() => ({
          ...createInitial(scenarioId, scenarioName),
          inventory: { ...defaultInventory(), ...(inventory ?? {}) },
        }));
        useBuildStore.temporal.getState().clear();
      },

      loadBuild: (snapshot) => set(() => ({ ...snapshot, updatedAt: Date.now() })),

      exportSnapshot: () => {
        const s = get();
        return {
          buildId: s.buildId,
          scenarioId: s.scenarioId,
          scenarioName: s.scenarioName,
          gridSize: s.gridSize,
          voxels: s.voxels,
          byCell: s.byCell,
          inventory: s.inventory,
          policies: s.policies,
          mode: s.mode,
          selectedInstanceId: null,
          hoveredCell: null,
          activeBlockType: null,
          rotation: 0,
          camera: s.camera,
          name: s.name,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        };
      },
    }),
    {
      // Only track world + policies in history (skip UI)
      partialize: (state) =>
        ({
          voxels: state.voxels,
          byCell: state.byCell,
          inventory: state.inventory,
          policies: state.policies,
          name: state.name,
          scenarioId: state.scenarioId,
          scenarioName: state.scenarioName,
        }) as BuildState,
      limit: 100,
      equality: (a, b) => a === b,
    },
  ),
);

/** Hook for undo/redo controls. */
export function useBuildHistory() {
  return useStore(useBuildStore.temporal, (s: TemporalState<BuildState>) => ({
    pastCount: s.pastStates.length,
    futureCount: s.futureStates.length,
    undo: s.undo,
    redo: s.redo,
    clear: s.clear,
  }));
}

/** Helper: get a block instance by cell. */
export function getInstanceAtCell(state: BuildState, cell: Cell): BlockInstance | undefined {
  const id = state.byCell[cellKey(cell)];
  return id ? state.voxels[id] : undefined;
}

/** Helper: count placed blocks by type. */
export function countByType(state: BuildState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of Object.values(state.voxels)) {
    out[v.type] = (out[v.type] ?? 0) + 1;
  }
  return out;
}

/** Categories export for UI. */
export { CATEGORIES };
