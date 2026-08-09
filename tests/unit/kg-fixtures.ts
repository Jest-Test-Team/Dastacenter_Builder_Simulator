/**
 * Shared fixtures for the knowledge-graph unit tests.
 *
 * Builds are constructed with the same `placeBlock` helper the app uses, so a
 * fixture can never drift from a state the builder could actually produce.
 */

import { emptyState, placeBlock, type BuildState } from '@/lib/blocks';
import { createDefaultNetwork, linkNodes, makePort, type NetworkNode } from '@/lib/network';
import type { ExtractContext } from '@/lib/kg';

/** Fixed clock, so provenance and digests are stable across runs. */
export const FIXED_NOW = 1_700_000_000_000;

export function ctx(rootId = 'Build:test'): ExtractContext {
  return { now: FIXED_NOW, rootId };
}

export interface Placement {
  type: string;
  at: { x: number; y: number; z: number };
}

/**
 * Places blocks and then rewrites the nanoid-generated instance ids to stable,
 * readable ones (`server_rack-0`). Determinism matters here beyond tidiness: the
 * ZK digest commits to node ids, so a random id would make it unreproducible.
 */
export function buildWith(placements: Placement[], buildId = 'test'): BuildState {
  const state: BuildState = { ...emptyState(), buildId, name: 'Test build' };
  const counts: Record<string, number> = {};

  for (const placement of placements) {
    const id = placeBlock(state, { typeId: placement.type, cell: placement.at });
    if (!id)
      throw new Error(
        `fixture could not place ${placement.type} at ${placement.at.x},${placement.at.y},${placement.at.z}`,
      );
    const stable = `${placement.type}-${counts[placement.type] ?? 0}`;
    counts[placement.type] = (counts[placement.type] ?? 0) + 1;

    const instance = state.voxels[id]!;
    delete state.voxels[id];
    state.voxels[stable] = { ...instance, id: stable };
    for (const [cell, owner] of Object.entries(state.byCell))
      if (owner === id) state.byCell[cell] = stable;
  }
  return state;
}

/** The instance id `buildWith` assigned to the nth block of a type. */
export function instanceId(type: string, index = 0): string {
  return `${type}-${index}`;
}

/**
 * A small but complete power chain: utility -> transformer -> switchgear -> UPS
 * -> PDU -> two racks, with a CRAC in range of both racks.
 */
export function powerChainBuild(): BuildState {
  return buildWith([
    { type: 'utility_feed', at: { x: 20, y: 1, z: 20 } },
    { type: 'transformer', at: { x: 20, y: 1, z: 19 } },
    { type: 'switchgear', at: { x: 20, y: 1, z: 18 } },
    { type: 'ups', at: { x: 20, y: 1, z: 17 } },
    { type: 'pdu', at: { x: 20, y: 1, z: 16 } },
    { type: 'server_rack', at: { x: 20, y: 1, z: 15 } },
    { type: 'server_rack', at: { x: 21, y: 1, z: 15 } },
    { type: 'crac', at: { x: 22, y: 1, z: 16 } },
  ]);
}

/** Adds a minimal network fabric: controller, two switches, one link. */
export function withFabric(state: BuildState): BuildState {
  const network = state.network ?? createDefaultNetwork();
  const device = (id: string, kind: NetworkNode['kind'], x: number): NetworkNode => ({
    id,
    name: id,
    kind,
    spaceId: 'main-floor-hall',
    position: { x, y: 1, z: 16 },
    ports: [makePort(id, 0), makePort(id, 1)],
  });

  const controller = device('ctl-1', 'controller', 10);
  const leafA = { ...device('leaf-a', 'leaf', 11), controllerId: 'ctl-1' };
  const leafB = { ...device('leaf-b', 'leaf', 12), controllerId: 'ctl-1' };
  for (const node of [controller, leafA, leafB]) network.nodes[node.id] = node;

  const link = { ...linkNodes('link-a-b', leafA, leafB), securityZone: 'Trusted' };
  network.links[link.id] = link;

  network.policies['pol-1'] = {
    id: 'pol-1',
    name: 'Block DMZ to management',
    sourceZone: 'DMZ',
    destinationZone: 'management',
    action: 'deny',
    protocol: 'any',
    priority: 10,
    enabled: true,
  };

  network.intents['int-1'] = {
    id: 'int-1',
    name: 'Leaf A to Leaf B',
    controllerNodeId: 'ctl-1',
    sourceNodeId: 'leaf-a',
    destinationNodeId: 'leaf-b',
    requiredBandwidthGbps: 10,
    requireRedundancy: false,
    status: 'deployed',
    lastMessage: 'Primary path validated.',
  };

  return { ...state, network };
}
