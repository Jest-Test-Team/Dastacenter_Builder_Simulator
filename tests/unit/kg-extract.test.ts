import { describe, expect, it } from 'vitest';
import { emptyState } from '@/lib/blocks';
import {
  COOLING_RADIUS_CELLS,
  buildKnowledgeGraph,
  nodeId,
  powerTierOf,
  resolveSpaceForCell,
  standardOfIssue,
} from '@/lib/kg';
import { extractSpaces } from '@/lib/kg/extract/spaces';
import { extractAssets } from '@/lib/kg/extract/assets';
import { extractCooling, extractPower } from '@/lib/kg/extract/power';
import { extractNetwork } from '@/lib/kg/extract/network';
import { extractEvents } from '@/lib/kg/extract/events';
import { FIXED_NOW, buildWith, ctx, instanceId, powerChainBuild, withFabric } from './kg-fixtures';

describe('extract: spaces', () => {
  const state = emptyState();
  const result = extractSpaces(state, ctx());

  it('emits one Space node per SpatialUnit', () => {
    const spaces = Object.keys(state.network!.spaces).length;
    expect(result.nodes).toHaveLength(spaces);
    expect(result.nodes.every((node) => node.type === 'Space')).toBe(true);
  });

  it('reconstructs the containment tree from parentId', () => {
    const contains = result.edges.filter((edge) => edge.relation === 'CONTAINS');
    expect(contains).toContainEqual(
      expect.objectContaining({
        sourceId: nodeId('Space', 'building-a'),
        targetId: nodeId('Space', 'main-floor'),
      }),
    );
  });

  it('anchors the root space to the build rather than to a parent', () => {
    const partOf = result.edges.filter((edge) => edge.relation === 'PART_OF');
    expect(partOf).toHaveLength(1);
    expect(partOf[0]!.sourceId).toBe(nodeId('Space', 'site-main'));
  });

  it('stamps provenance pointing back into the source data', () => {
    for (const node of result.nodes) {
      expect(node.provenance.extractor).toBe('spaces');
      expect(node.provenance.source).toMatch(/^network\/spaces\//);
      expect(node.provenance.extractedAt).toBe(FIXED_NOW);
    }
    for (const edge of result.edges) expect(edge.provenance.source).toMatch(/^network\/spaces\//);
  });
});

describe('extract: resolveSpaceForCell', () => {
  const spaces = emptyState().network!.spaces;

  it('resolves to the smallest containing space, not the site', () => {
    // Main Floor hall bounds: x 2..29, y 0..2, z 15..28.
    const space = resolveSpaceForCell(spaces, { x: 20, y: 1, z: 20 });
    expect(space?.id).toBe('main-floor-hall');
  });

  it('returns null for a cell outside every space', () => {
    expect(resolveSpaceForCell(spaces, { x: 999, y: 999, z: 999 })).toBeNull();
  });
});

describe('extract: assets', () => {
  const state = powerChainBuild();
  const result = extractAssets(state, ctx());
  const assets = result.nodes.filter((node) => node.type === 'Asset');
  const types = result.nodes.filter((node) => node.type === 'AssetType');

  it('emits one Asset per placed instance', () => {
    expect(assets).toHaveLength(Object.keys(state.voxels).length);
  });

  it('emits each AssetType exactly once even when instantiated twice', () => {
    const ids = types.map((node) => node.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(nodeId('AssetType', 'server_rack'));
  });

  it('links every asset to its type and its space', () => {
    for (const asset of assets) {
      expect(result.edges.some((edge) => edge.relation === 'INSTANCE_OF' && edge.sourceId === asset.id)).toBe(true);
      expect(result.edges.some((edge) => edge.relation === 'LOCATED_IN' && edge.sourceId === asset.id)).toBe(true);
    }
  });

  it('records adjacency only between neighbouring cells', () => {
    const adjacent = result.edges.filter((edge) => edge.relation === 'ADJACENT_TO');
    expect(adjacent.length).toBeGreaterThan(0);
    for (const edge of adjacent) expect(Number(edge.provenance.derivedFrom?.match(/\d+/)?.[0])).toBe(1);
  });

  it('parks the un-modelled AssetType->Standard relation on the candidate list', () => {
    expect(result.candidateRelations).toContainEqual(
      expect.objectContaining({ label: 'CONFORMS_TO', sourceType: 'AssetType', targetType: 'Standard' }),
    );
  });
});

describe('extract: power', () => {
  const state = powerChainBuild();
  const edges = extractPower(state, ctx()).edges;
  const powers = (from: string, to: string) =>
    edges.some(
      (edge) =>
        edge.relation === 'POWERS' &&
        edge.sourceId === nodeId('Asset', from) &&
        edge.targetId === nodeId('Asset', to),
    );

  it('knows the tier order', () => {
    expect(powerTierOf('utility_feed')).toBe(0);
    expect(powerTierOf('pdu')).toBe(4);
    expect(powerTierOf('server_rack')).toBe(-1);
  });

  it('builds the chain one tier at a time', () => {
    expect(powers(instanceId('utility_feed'), instanceId('transformer'))).toBe(true);
    expect(powers(instanceId('transformer'), instanceId('switchgear'))).toBe(true);
    expect(powers(instanceId('switchgear'), instanceId('ups'))).toBe(true);
    expect(powers(instanceId('ups'), instanceId('pdu'))).toBe(true);
  });

  it('feeds every terminal consumer from the lowest distribution tier', () => {
    expect(powers(instanceId('pdu'), instanceId('server_rack', 0))).toBe(true);
    expect(powers(instanceId('pdu'), instanceId('server_rack', 1))).toBe(true);
    expect(powers(instanceId('pdu'), instanceId('crac'))).toBe(true);
  });

  it('never powers the utility feed', () => {
    expect(edges.some((edge) => edge.targetId === nodeId('Asset', instanceId('utility_feed')))).toBe(false);
  });

  it('reaches further upstream when a tier is missing from the build', () => {
    const sparse = buildWith([
      { type: 'ups', at: { x: 20, y: 1, z: 20 } },
      { type: 'server_rack', at: { x: 20, y: 1, z: 18 } },
    ]);
    const sparseEdges = extractPower(sparse, ctx()).edges;
    expect(
      sparseEdges.some(
        (edge) =>
          edge.sourceId === nodeId('Asset', instanceId('ups')) &&
          edge.targetId === nodeId('Asset', instanceId('server_rack')),
      ),
    ).toBe(true);
  });

  it('marks derived edges as inferred rather than read', () => {
    for (const edge of edges) {
      expect(edge.provenance.confidence).toBe('medium');
      expect(edge.provenance.derivedFrom).toContain('nearest upstream');
    }
  });
});

describe('extract: cooling', () => {
  it('cools heat-producing assets inside the radius', () => {
    const state = powerChainBuild();
    const edges = extractCooling(state, ctx()).edges;
    expect(
      edges.some(
        (edge) =>
          edge.sourceId === nodeId('Asset', instanceId('crac')) &&
          edge.targetId === nodeId('Asset', instanceId('server_rack', 0)),
      ),
    ).toBe(true);
  });

  it('never claims to cool the cooler itself', () => {
    const state = powerChainBuild();
    const edges = extractCooling(state, ctx()).edges;
    expect(edges.some((edge) => edge.targetId === nodeId('Asset', instanceId('crac')))).toBe(false);
  });

  it('emits nothing beyond the radius — proximity is not an assertion at any distance', () => {
    const distant = buildWith([
      { type: 'crac', at: { x: 3, y: 1, z: 16 } },
      { type: 'server_rack', at: { x: 3 + COOLING_RADIUS_CELLS + 2, y: 1, z: 16 } },
    ]);
    expect(extractCooling(distant, ctx()).edges).toHaveLength(0);
  });

  it('emits nothing when the build has no cooler', () => {
    const state = buildWith([{ type: 'server_rack', at: { x: 20, y: 1, z: 20 } }]);
    expect(extractCooling(state, ctx()).edges).toHaveLength(0);
  });
});

describe('extract: network', () => {
  const state = withFabric(powerChainBuild());
  const result = extractNetwork(state, ctx());

  it('emits devices, their ports, and the link as a first-class node', () => {
    expect(result.nodes.filter((node) => node.type === 'NetworkDevice')).toHaveLength(3);
    expect(result.nodes.filter((node) => node.type === 'Port')).toHaveLength(6);
    expect(result.nodes.filter((node) => node.type === 'Link')).toHaveLength(1);
  });

  it('terminates the link on both of its ports', () => {
    const terminates = result.edges.filter((edge) => edge.relation === 'TERMINATES');
    expect(terminates).toHaveLength(2);
    expect(terminates.every((edge) => edge.targetId === nodeId('Link', 'link-a-b'))).toBe(true);
  });

  it('records controller relationships', () => {
    const controls = result.edges.filter((edge) => edge.relation === 'CONTROLS');
    expect(controls).toHaveLength(2);
    expect(controls.every((edge) => edge.sourceId === nodeId('NetworkDevice', 'ctl-1'))).toBe(true);
  });

  it('canonicalises zone names so DMZ and dmz are one zone', () => {
    const zones = result.nodes.filter((node) => node.type === 'SecurityZone').map((node) => node.name);
    expect(zones).toContain('trusted');
    expect(zones).toContain('dmz');
    expect(zones).toContain('management');
  });

  it('attaches segmentation rules to both zones', () => {
    expect(result.edges.some((edge) => edge.relation === 'APPLIES_FROM')).toBe(true);
    expect(result.edges.some((edge) => edge.relation === 'APPLIES_TO')).toBe(true);
  });

  it('anchors intents to their endpoints', () => {
    expect(result.edges.some((edge) => edge.relation === 'ORIGINATES_AT')).toBe(true);
    expect(result.edges.some((edge) => edge.relation === 'TERMINATES_AT')).toBe(true);
  });

  it('emits nothing when the build has no network', () => {
    const bare = { ...powerChainBuild(), network: undefined };
    expect(extractNetwork(bare, ctx()).nodes).toHaveLength(0);
  });
});

describe('extract: events', () => {
  const state = withFabric(powerChainBuild());
  const result = extractEvents(state, ctx('Build:test'));

  it('derives a standard code from the rule id when none is declared', () => {
    expect(standardOfIssue('TIA.03.RACK')).toBe('TIA');
    expect(standardOfIssue('TIA.03.RACK', 'ashrae')).toBe('ASHRAE');
  });

  it('emits exactly one ScoreEvaluated event anchored to the build', () => {
    const evaluations = result.nodes.filter((node) => node.type === 'ScoreEvaluated');
    expect(evaluations).toHaveLength(1);
    expect(evaluations[0]!.at).toBe(FIXED_NOW);
    expect(result.edges.some((edge) => edge.relation === 'SCORED' && edge.targetId === 'Build:test')).toBe(true);
  });

  it('makes issues first-class events that cite a standard', () => {
    const issues = result.nodes.filter((node) => node.type === 'IssueRaised');
    expect(issues.length).toBeGreaterThan(0);
    for (const issue of issues) {
      expect(issue.at).toBe(FIXED_NOW);
      expect(
        result.edges.some((edge) => edge.relation === 'CITES_STANDARD' && edge.sourceId === issue.id),
      ).toBe(true);
    }
  });

  it('never invents an asset a VIOLATES edge points at', () => {
    const assetIds = new Set(Object.keys(state.voxels).map((id) => nodeId('Asset', id)));
    for (const edge of result.edges.filter((edge) => edge.relation === 'VIOLATES'))
      expect(assetIds.has(edge.targetId)).toBe(true);
  });

  it('records a deployed intent as an event', () => {
    expect(result.nodes.some((node) => node.type === 'IntentDeployed')).toBe(true);
  });

  it('raises LinkFailed only for a disabled link', () => {
    expect(result.nodes.some((node) => node.type === 'LinkFailed')).toBe(false);
    const failed = structuredClone(state);
    failed.network!.links['link-a-b']!.enabled = false;
    const after = extractEvents(failed, ctx('Build:test'));
    expect(after.nodes.filter((node) => node.type === 'LinkFailed')).toHaveLength(1);
    expect(after.edges.some((edge) => edge.relation === 'AFFECTS')).toBe(true);
  });

  it('claims SATISFIES only for policy settings that are actually enabled', () => {
    const off = result.edges.filter((edge) => edge.relation === 'SATISFIES');
    expect(off).toHaveLength(0); // default policy state is all-off

    const on = structuredClone(state);
    on.policies['privacy.encryption_at_rest'] = true;
    const after = extractEvents(on, ctx('Build:test'));
    const satisfies = after.edges.filter(
      (edge) => edge.relation === 'SATISFIES' && edge.sourceId === nodeId('PolicySetting', 'privacy.encryption_at_rest'),
    );
    expect(satisfies.map((edge) => edge.targetId).sort()).toEqual([
      nodeId('Standard', 'ISO27'),
      nodeId('Standard', 'PRIV'),
    ]);
  });
});

describe('extract: every fact carries provenance', () => {
  it('holds across the whole pipeline', () => {
    const { graph } = buildKnowledgeGraph(withFabric(powerChainBuild()), { now: FIXED_NOW });
    for (const node of Object.values(graph.nodes)) {
      expect(node.provenance.extractor).toBeTruthy();
      expect(node.provenance.source).toBeTruthy();
      expect(node.provenance.extractedAt).toBe(FIXED_NOW);
    }
    for (const edge of Object.values(graph.edges)) {
      expect(edge.provenance.source).toBeTruthy();
      expect(['high', 'medium', 'low']).toContain(edge.provenance.confidence);
    }
  });
});
