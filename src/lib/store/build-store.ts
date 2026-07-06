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
import { useShallow } from 'zustand/react/shallow';
import { nanoid } from 'nanoid';
import type { TemporalState } from 'zundo';
import {
  type BlockInstance,
  type BlockDef,
  type BuildState as PureBuildState,
  getBlock,
  CATEGORIES,
  getAllBlocks,
} from '@/lib/blocks';
import { cellKey, type Cell, type GridSize, DEFAULT_GRID_SIZE } from '@/lib/grid';
import { defaultPolicyState, type PolicyKey } from '@/lib/scoring/policy';
import {
  createDefaultNetwork,
  evaluateIntent,
  type ControllerIntent,
  type NetworkLayer,
  type NetworkLink,
  type NetworkNode,
  type NetworkPolicy,
  type SpatialUnit,
} from '@/lib/network';

export type BuildMode = 'build' | 'sim' | 'inspect';
export type VisualMode = 'standard' | 'thermal';

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
  network: ReturnType<typeof createDefaultNetwork>;

  // UI
  mode: BuildMode;
  selectedInstanceId: string | null;
  hoveredCell: Cell | null;
  activeBlockType: string | null; // for placement
  rotation: 0 | 1 | 2 | 3;
  camera: CameraState;
  visualMode: VisualMode;
  networkLayer: NetworkLayer;
  selectedNetworkNodeId: string | null;
  selectedSpatialFloorId: string | null;
  highlightedLinkIds: string[];
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
  setVisualMode: (mode: VisualMode) => void;
  setNetworkLayer: (layer: NetworkLayer) => void;
  setSelectedNetworkNode: (id: string | null) => void;
  setSelectedSpatialFloor: (id: string | null) => void;
  setHighlightedLinks: (ids: string[]) => void;

  // Spatial and SDN graph
  upsertSpace: (space: SpatialUnit) => void;
  toggleSpaceVisibility: (id: string) => void;
  upsertNetworkNode: (node: NetworkNode) => void;
  removeNetworkNode: (id: string) => void;
  upsertNetworkLink: (link: NetworkLink) => void;
  toggleNetworkLink: (id: string) => void;
  upsertNetworkPolicy: (policy: NetworkPolicy) => void;
  upsertControllerIntent: (intent: ControllerIntent) => void;
  validateControllerIntent: (id: string, deploy?: boolean) => void;
  loadNetworkTemplate: () => void;

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
 *  Uses the full store shape because exportSnapshot preserves scenario and UI context. */
export type BuildSnapshot = PureBuildState &
  Partial<
    Pick<
      BuildState,
      | 'scenarioName'
      | 'gridSize'
      | 'mode'
      | 'selectedInstanceId'
      | 'hoveredCell'
      | 'activeBlockType'
      | 'rotation'
      | 'camera'
      | 'visualMode'
      | 'networkLayer'
      | 'selectedNetworkNodeId'
      | 'highlightedLinkIds'
    >
  >;

export type BuildStore = BuildState & BuildActions;

function defaultInventory(): Record<string, number> {
  const inv: Record<string, number> = {};
  for (const b of getAllBlocks()) {
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
  const [sw, h, sd] = def.size;
  const w = rotation % 2 === 1 ? sd : sw;
  const d = rotation % 2 === 1 ? sw : sd;
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

function buildCellIndex(voxels: PureBuildState['voxels']): Record<string, string> {
  const index: Record<string, string> = {};
  for (const instance of Object.values(voxels)) {
    for (const cell of cellsForBlock(instance.type, instance.position, instance.rotation)) {
      index[cellKey(cell)] = instance.id;
    }
  }
  return index;
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
    visualMode: 'standard',
    network: createDefaultNetwork(),
    networkLayer: 'physical',
    selectedNetworkNodeId: null,
    selectedSpatialFloorId: 'main-floor',
    highlightedLinkIds: [],
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
          const { [instanceId]: _, ...rest } = s.voxels; // eslint-disable-line @typescript-eslint/no-unused-vars
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
        const oldCells = cellsForBlock(inst.type, inst.position, inst.rotation);
        const newCells = cellsForBlock(inst.type, to, inst.rotation);
        const { gridSize, byCell } = get();
        const valid = newCells.every((cell) =>
          cell.x >= 0 && cell.x < gridSize.w && cell.y >= 0 && cell.y < gridSize.h &&
          cell.z >= 0 && cell.z < gridSize.d && (!byCell[cellKey(cell)] || byCell[cellKey(cell)] === instanceId),
        );
        if (!valid) return;
        set((state) => {
          const nextByCell = { ...state.byCell };
          oldCells.forEach((cell) => delete nextByCell[cellKey(cell)]);
          newCells.forEach((cell) => { nextByCell[cellKey(cell)] = instanceId; });
          return {
            voxels: { ...state.voxels, [instanceId]: { ...inst, position: to } },
            byCell: nextByCell,
            updatedAt: Date.now(),
          };
        });
      },

      rotateBlock: (instanceId) => {
        const inst = get().voxels[instanceId];
        if (!inst) return;
        const nextRot = ((inst.rotation + 1) % 4) as 0 | 1 | 2 | 3;
        const oldCells = cellsForBlock(inst.type, inst.position, inst.rotation);
        const newCells = cellsForBlock(inst.type, inst.position, nextRot);
        const { gridSize, byCell } = get();
        const valid = newCells.every((cell) =>
          cell.x >= 0 && cell.x < gridSize.w && cell.y >= 0 && cell.y < gridSize.h &&
          cell.z >= 0 && cell.z < gridSize.d && (!byCell[cellKey(cell)] || byCell[cellKey(cell)] === instanceId),
        );
        if (!valid) return;
        set((state) => {
          const nextByCell = { ...state.byCell };
          oldCells.forEach((cell) => delete nextByCell[cellKey(cell)]);
          newCells.forEach((cell) => { nextByCell[cellKey(cell)] = instanceId; });
          return {
            voxels: { ...state.voxels, [instanceId]: { ...inst, rotation: nextRot } },
            byCell: nextByCell,
            updatedAt: Date.now(),
          };
        });
      },

      clearAll: () => {
        set(() => ({
          voxels: {},
          byCell: {},
          inventory: defaultInventory(),
          selectedInstanceId: null,
          hoveredCell: null,
          network: createDefaultNetwork(),
          selectedNetworkNodeId: null,
          selectedSpatialFloorId: 'main-floor',
          highlightedLinkIds: [],
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
      setVisualMode: (visualMode) => set({ visualMode }),
      setNetworkLayer: (networkLayer) => set({ networkLayer }),
      setSelectedNetworkNode: (selectedNetworkNodeId) => set({ selectedNetworkNodeId }),
      setSelectedSpatialFloor: (selectedSpatialFloorId) => set({ selectedSpatialFloorId }),
      setHighlightedLinks: (highlightedLinkIds) => set({ highlightedLinkIds }),

      upsertSpace: (space) =>
        set((s) => ({
          network: { ...s.network, spaces: { ...s.network.spaces, [space.id]: space } },
          updatedAt: Date.now(),
        })),
      toggleSpaceVisibility: (id) =>
        set((s) => {
          const space = s.network.spaces[id];
          if (!space) return s;
          return {
            network: {
              ...s.network,
              spaces: { ...s.network.spaces, [id]: { ...space, visible: !space.visible } },
            },
          };
        }),
      upsertNetworkNode: (node) =>
        set((s) => ({
          network: { ...s.network, nodes: { ...s.network.nodes, [node.id]: node } },
          updatedAt: Date.now(),
        })),
      removeNetworkNode: (id) =>
        set((s) => {
          const nodes = { ...s.network.nodes };
          delete nodes[id];
          const links = Object.fromEntries(
            Object.entries(s.network.links).filter(
              ([, link]) => link.sourceNodeId !== id && link.targetNodeId !== id,
            ),
          );
          return {
            network: { ...s.network, nodes, links },
            selectedNetworkNodeId: s.selectedNetworkNodeId === id ? null : s.selectedNetworkNodeId,
            updatedAt: Date.now(),
          };
        }),
      upsertNetworkLink: (link) =>
        set((s) => ({
          network: { ...s.network, links: { ...s.network.links, [link.id]: link } },
          updatedAt: Date.now(),
        })),
      toggleNetworkLink: (id) =>
        set((s) => {
          const link = s.network.links[id];
          if (!link) return s;
          return {
            network: {
              ...s.network,
              links: { ...s.network.links, [id]: { ...link, enabled: !link.enabled } },
            },
            updatedAt: Date.now(),
          };
        }),
      upsertNetworkPolicy: (policy) =>
        set((s) => ({
          network: { ...s.network, policies: { ...s.network.policies, [policy.id]: policy } },
          updatedAt: Date.now(),
        })),
      upsertControllerIntent: (intent) =>
        set((s) => ({
          network: { ...s.network, intents: { ...s.network.intents, [intent.id]: intent } },
          updatedAt: Date.now(),
        })),
      validateControllerIntent: (id, deploy = false) =>
        set((s) => {
          const intent = s.network.intents[id];
          if (!intent) return s;
          const result = evaluateIntent(s.network, intent);
          return {
            network: {
              ...s.network,
              intents: {
                ...s.network.intents,
                [id]: {
                  ...intent,
                  status: result.ok ? (deploy ? 'deployed' : 'validated') : 'failed',
                  lastMessage: result.message,
                },
              },
            },
            highlightedLinkIds: result.primary?.linkIds ?? [],
            updatedAt: Date.now(),
          };
        }),
      loadNetworkTemplate: () =>
        set((s) => ({
          network: createEnterpriseTemplate(s.network.spaces),
          updatedAt: Date.now(),
        })),

      rename: (name) => set({ name, updatedAt: Date.now() }),
      setScenario: (id, name) => set({ scenarioId: id, scenarioName: name, updatedAt: Date.now() }),
      startBuild: (scenarioId, scenarioName, inventory) => {
        set(() => ({
          ...createInitial(scenarioId, scenarioName),
          inventory: { ...defaultInventory(), ...(inventory ?? {}) },
        }));
        useBuildStore.temporal.getState().clear();
      },

      loadBuild: (snapshot) =>
        set(() => ({
          ...snapshot,
          byCell: buildCellIndex(snapshot.voxels),
          network: snapshot.network ?? createDefaultNetwork(),
          networkLayer: snapshot.networkLayer ?? 'physical',
          selectedNetworkNodeId: null,
          selectedSpatialFloorId:
            snapshot.network?.spaces['main-floor'] ? 'main-floor' :
              Object.values(snapshot.network?.spaces ?? {}).find((space) => space.kind === 'floor')?.id ?? null,
          highlightedLinkIds: [],
          updatedAt: Date.now(),
        })),

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
          visualMode: 'standard',
          network: s.network,
          networkLayer: s.networkLayer,
          selectedNetworkNodeId: null,
          highlightedLinkIds: [],
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
          network: state.network,
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
  return useStore(
    useBuildStore.temporal,
    useShallow((s: TemporalState<BuildState>) => ({
      pastCount: s.pastStates.length,
      futureCount: s.futureStates.length,
      undo: s.undo,
      redo: s.redo,
      clear: s.clear,
    })),
  );
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

function createEnterpriseTemplate(spaces: BuildState['network']['spaces']): BuildState['network'] {
  const node = (
    id: string,
    name: string,
    kind: NetworkNode['kind'],
    x: number,
    z: number,
    spaceId = 'main-floor-hall',
  ): NetworkNode => ({
    id,
    name,
    kind,
    spaceId,
    position: { x, y: 1, z },
    ports: [0, 1, 2, 3].map((index) => ({
      id: `${id}-p${index}`,
      name: `Eth${index}`,
      kind: 'fiber',
      speedGbps: kind === 'server' ? 25 : 100,
      adminUp: true,
    })),
  });
  const nodes = [
    node('sdn-1', 'SDN Controller', 'controller', 4, 4, 'main-floor-west'),
    node('fw-1', 'Edge Firewall', 'firewall', 7, 4, 'main-floor-west'),
    node('spine-1', 'Spine A', 'spine', 15, 7),
    node('spine-2', 'Spine B', 'spine', 15, 12),
    node('leaf-1', 'Leaf A', 'leaf', 21, 7),
    node('leaf-2', 'Leaf B', 'leaf', 21, 12),
    node('server-1', 'Application Server', 'server', 27, 7),
    node('server-2', 'Database Server', 'server', 27, 12),
  ];
  const nodeMap = Object.fromEntries(nodes.map((item) => [item.id, item]));
  const pairs: Array<[string, string, string, number, number]> = [
    ['l1', 'sdn-1', 'fw-1', 0, 0],
    ['l2', 'fw-1', 'spine-1', 1, 0],
    ['l3', 'fw-1', 'spine-2', 2, 0],
    ['l4', 'spine-1', 'leaf-1', 1, 0],
    ['l5', 'spine-1', 'leaf-2', 2, 0],
    ['l6', 'spine-2', 'leaf-1', 1, 1],
    ['l7', 'spine-2', 'leaf-2', 2, 1],
    ['l8', 'leaf-1', 'server-1', 2, 0],
    ['l9', 'leaf-2', 'server-1', 2, 1],
    ['l10', 'leaf-1', 'server-2', 3, 0],
    ['l11', 'leaf-2', 'server-2', 3, 1],
  ];
  const links = Object.fromEntries(
    pairs.map(([id, a, b, ap, bp]) => [
      id,
      {
        id,
        sourceNodeId: a,
        sourcePortId: nodeMap[a]!.ports[ap]!.id,
        targetNodeId: b,
        targetPortId: nodeMap[b]!.ports[bp]!.id,
        medium: 'fiber' as const,
        bandwidthGbps: 100,
        redundancyGroup: a.includes('spine') || b.includes('spine') ? 'fabric' : undefined,
        vlanIds: [10, 20],
        vrf: 'enterprise',
        vxlanVni: 10010,
        securityZone: b.startsWith('server') ? 'application' : 'infrastructure',
        enabled: true,
      },
    ]),
  );
  const policy: NetworkPolicy = {
    id: 'policy-app-db',
    name: 'Application to database',
    sourceZone: 'application',
    destinationZone: 'database',
    action: 'allow',
    protocol: 'tcp',
    destinationPort: 5432,
    priority: 100,
    enabled: true,
  };
  const intent: ControllerIntent = {
    id: 'intent-app-db',
    name: 'Resilient application path',
    controllerNodeId: 'sdn-1',
    sourceNodeId: 'server-1',
    destinationNodeId: 'server-2',
    requiredBandwidthGbps: 20,
    requireRedundancy: true,
    status: 'draft',
  };
  return {
    spaces,
    nodes: nodeMap,
    links,
    policies: { [policy.id]: policy },
    intents: { [intent.id]: intent },
  };
}
