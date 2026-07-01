import type { ControllerIntent, NetworkLink, NetworkNode, NetworkState } from './types';

export interface PathResult {
  nodeIds: string[];
  linkIds: string[];
  bottleneckGbps: number;
}
export interface TopologyIssue {
  severity: 'error' | 'warning';
  message: string;
  entityId?: string;
}

export function findNetworkPath(
  network: NetworkState,
  sourceNodeId: string,
  destinationNodeId: string,
  excludedLinkIds: ReadonlySet<string> = new Set(),
): PathResult | null {
  if (!network.nodes[sourceNodeId] || !network.nodes[destinationNodeId]) return null;
  const queue = [sourceNodeId];
  const visited = new Set(queue);
  const previous = new Map<string, { nodeId: string; linkId: string }>();
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === destinationNodeId) break;
    for (const link of Object.values(network.links)) {
      if (!link.enabled || excludedLinkIds.has(link.id)) continue;
      const next =
        link.sourceNodeId === current
          ? link.targetNodeId
          : link.targetNodeId === current
            ? link.sourceNodeId
            : null;
      if (!next || visited.has(next)) continue;
      visited.add(next);
      previous.set(next, { nodeId: current, linkId: link.id });
      queue.push(next);
    }
  }
  if (!visited.has(destinationNodeId)) return null;
  const nodeIds = [destinationNodeId];
  const linkIds: string[] = [];
  let cursor = destinationNodeId;
  while (cursor !== sourceNodeId) {
    const step = previous.get(cursor);
    if (!step) return null;
    nodeIds.unshift(step.nodeId);
    linkIds.unshift(step.linkId);
    cursor = step.nodeId;
  }
  return {
    nodeIds,
    linkIds,
    bottleneckGbps: linkIds.length
      ? Math.min(...linkIds.map((id) => network.links[id]!.bandwidthGbps))
      : Infinity,
  };
}

export function findRedundantPath(network: NetworkState, primary: PathResult): PathResult | null {
  return findNetworkPath(
    network,
    primary.nodeIds[0]!,
    primary.nodeIds.at(-1)!,
    new Set(primary.linkIds),
  );
}

export function validateTopology(network: NetworkState): TopologyIssue[] {
  const issues: TopologyIssue[] = [];
  for (const node of Object.values(network.nodes)) {
    if (!network.spaces[node.spaceId])
      issues.push({
        severity: 'error',
        entityId: node.id,
        message: `${node.name} has no valid space.`,
      });
    if (
      !Object.values(network.links).some(
        (link) => link.sourceNodeId === node.id || link.targetNodeId === node.id,
      )
    )
      issues.push({
        severity: 'warning',
        entityId: node.id,
        message: `${node.name} is disconnected.`,
      });
  }
  for (const link of Object.values(network.links)) {
    const source = network.nodes[link.sourceNodeId];
    const target = network.nodes[link.targetNodeId];
    if (!source || !target)
      issues.push({
        severity: 'error',
        entityId: link.id,
        message: `Link ${link.id} references a missing node.`,
      });
    else if (
      !source.ports.some((port) => port.id === link.sourcePortId) ||
      !target.ports.some((port) => port.id === link.targetPortId)
    )
      issues.push({
        severity: 'error',
        entityId: link.id,
        message: `Link ${link.id} references a missing port.`,
      });
  }
  return issues;
}

export function evaluateIntent(network: NetworkState, intent: ControllerIntent) {
  const primary = findNetworkPath(network, intent.sourceNodeId, intent.destinationNodeId);
  if (!primary)
    return {
      ok: false,
      message: 'No active path satisfies this intent.',
      primary: null,
      backup: null,
    };
  if (primary.bottleneckGbps < intent.requiredBandwidthGbps)
    return {
      ok: false,
      message: `Path bottleneck is ${primary.bottleneckGbps} Gbps.`,
      primary,
      backup: null,
    };
  const backup = intent.requireRedundancy ? findRedundantPath(network, primary) : null;
  if (intent.requireRedundancy && !backup)
    return {
      ok: false,
      message: 'No link-disjoint backup path is available.',
      primary,
      backup: null,
    };
  return {
    ok: true,
    message: backup ? 'Primary and backup paths validated.' : 'Primary path validated.',
    primary,
    backup,
  };
}

export function makePort(
  nodeId: string,
  index: number,
  speedGbps = 100,
): NetworkNode['ports'][number] {
  return {
    id: `${nodeId}-p${index}`,
    name: `Eth${index}`,
    kind: 'fiber',
    speedGbps,
    adminUp: true,
  };
}

export function linkNodes(
  id: string,
  source: NetworkNode,
  target: NetworkNode,
  sourcePort = 0,
  targetPort = 0,
): NetworkLink {
  return {
    id,
    sourceNodeId: source.id,
    sourcePortId: source.ports[sourcePort]!.id,
    targetNodeId: target.id,
    targetPortId: target.ports[targetPort]!.id,
    medium: 'fiber',
    bandwidthGbps: Math.min(
      source.ports[sourcePort]!.speedGbps,
      target.ports[targetPort]!.speedGbps,
    ),
    vlanIds: [],
    enabled: true,
  };
}
