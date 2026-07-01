import { beforeEach, describe, expect, it } from 'vitest';
import {
  createDefaultNetwork,
  evaluateIntent,
  findNetworkPath,
  findRedundantPath,
  makePort,
  validateTopology,
  type ControllerIntent,
  type NetworkNode,
  type NetworkState,
} from '@/lib/network';
import { useBuildStore } from '@/lib/store/build-store';

function node(id: string, x: number): NetworkNode {
  return {
    id,
    name: id,
    kind: 'switch',
    spaceId: 'hall-a',
    position: { x, y: 1, z: 1 },
    ports: [makePort(id, 0), makePort(id, 1), makePort(id, 2)],
  };
}

function network(): NetworkState {
  const state = createDefaultNetwork();
  for (const item of [node('a', 1), node('b', 2), node('c', 3), node('d', 4)])
    state.nodes[item.id] = item;
  const add = (
    id: string,
    source: string,
    target: string,
    sourcePort: number,
    targetPort: number,
    bandwidthGbps = 100,
  ) => {
    state.links[id] = {
      id,
      sourceNodeId: source,
      sourcePortId: state.nodes[source]!.ports[sourcePort]!.id,
      targetNodeId: target,
      targetPortId: state.nodes[target]!.ports[targetPort]!.id,
      medium: 'fiber',
      bandwidthGbps,
      vlanIds: [10],
      vrf: 'enterprise',
      enabled: true,
    };
  };
  add('ab', 'a', 'b', 0, 0, 40);
  add('bd', 'b', 'd', 1, 0, 40);
  add('ac', 'a', 'c', 1, 0);
  add('cd', 'c', 'd', 1, 1);
  return state;
}

describe('enterprise network topology', () => {
  beforeEach(() => useBuildStore.getState().startBuild('free', 'Free Build'));

  it('traces a path and finds a link-disjoint backup', () => {
    const state = network();
    const primary = findNetworkPath(state, 'a', 'd');
    expect(primary?.nodeIds).toEqual(['a', 'b', 'd']);
    expect(primary?.bottleneckGbps).toBe(40);
    expect(findRedundantPath(state, primary!)?.nodeIds).toEqual(['a', 'c', 'd']);
  });

  it('reroutes after a failed link', () => {
    const state = network();
    state.links.ab!.enabled = false;
    expect(findNetworkPath(state, 'a', 'd')?.nodeIds).toEqual(['a', 'c', 'd']);
  });

  it('validates ports, spaces, bandwidth, and redundancy intents', () => {
    const state = network();
    expect(validateTopology(state)).toEqual([]);
    const intent: ControllerIntent = {
      id: 'intent',
      name: 'Resilient path',
      controllerNodeId: 'a',
      sourceNodeId: 'a',
      destinationNodeId: 'd',
      requiredBandwidthGbps: 30,
      requireRedundancy: true,
      status: 'draft',
    };
    expect(evaluateIntent(state, intent)).toMatchObject({ ok: true });
    expect(evaluateIntent(state, { ...intent, requiredBandwidthGbps: 50 })).toMatchObject({
      ok: false,
      message: 'Path bottleneck is 40 Gbps.',
    });
  });

  it('loads, persists, validates, and deploys the reference SDN fabric', () => {
    const store = useBuildStore.getState();
    store.loadNetworkTemplate();
    const loaded = useBuildStore.getState();
    expect(Object.keys(loaded.network.spaces)).toContain('hall-a');
    expect(Object.keys(loaded.network.nodes)).toHaveLength(8);
    expect(Object.keys(loaded.network.links)).toHaveLength(11);
    loaded.validateControllerIntent('intent-app-db', true);
    const deployed = useBuildStore.getState();
    expect(deployed.network.intents['intent-app-db']).toMatchObject({ status: 'deployed' });
    expect(deployed.exportSnapshot().network?.nodes['server-1']?.name).toBe('Application Server');
  });
});
