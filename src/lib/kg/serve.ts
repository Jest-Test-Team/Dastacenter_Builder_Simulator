/**
 * Serving the graph (pipeline stage 9).
 *
 * Retrieval is deterministic: k-hop neighbourhoods, paths, dependency closures,
 * and a compact triple serialization. Nothing here calls a model. The output is
 * shaped so that a model *could* consume it — grouped, deduplicated triples
 * carrying provenance — which is what makes an answer quotable rather than
 * plausible.
 *
 * The important distinction, from the retrieval material: for a multi-hop
 * question you retrieve the *path*, not the union of neighbourhoods around each
 * endpoint. The path is the answer's skeleton.
 */

import { DEPENDENCY_RELATIONS, type NodeType, type RelationType } from './ontology';
import { inEdges, outEdges, type GraphEdge, type GraphNode, type KnowledgeGraph } from './types';

/** Beyond two hops a neighbourhood is noise without re-ranking. */
export const MAX_HOPS = 2;

export interface Subgraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphPath {
  nodeIds: string[];
  edgeIds: string[];
  relations: RelationType[];
}

/** Everything within `k` hops of a node, in either direction. */
export function kHop(graph: KnowledgeGraph, startId: string, k = 1): Subgraph {
  const depth = Math.max(0, Math.min(k, MAX_HOPS));
  if (!graph.nodes[startId]) return { nodes: [], edges: [] };

  const visited = new Set([startId]);
  const edgeIds = new Set<string>();
  let frontier = [startId];

  for (let hop = 0; hop < depth; hop++) {
    const next: string[] = [];
    for (const nodeId of frontier)
      for (const edge of [...outEdges(graph, nodeId), ...inEdges(graph, nodeId)]) {
        edgeIds.add(edge.id);
        const other = edge.sourceId === nodeId ? edge.targetId : edge.sourceId;
        if (visited.has(other)) continue;
        visited.add(other);
        next.push(other);
      }
    frontier = next;
  }

  return {
    nodes: [...visited].sort().map((id) => graph.nodes[id]!).filter(Boolean),
    edges: [...edgeIds].sort().map((id) => graph.edges[id]!).filter(Boolean),
  };
}

/**
 * Shortest path between two nodes, treating edges as undirected. BFS, the same
 * shape already proven in the network topology module.
 */
export function findPath(
  graph: KnowledgeGraph,
  sourceId: string,
  targetId: string,
  options: { relations?: RelationType[]; excludeNodeIds?: ReadonlySet<string> } = {},
): GraphPath | null {
  if (!graph.nodes[sourceId] || !graph.nodes[targetId]) return null;
  if (sourceId === targetId) return { nodeIds: [sourceId], edgeIds: [], relations: [] };
  const allowed = options.relations ? new Set(options.relations) : null;
  const excluded = options.excludeNodeIds ?? new Set<string>();
  if (excluded.has(sourceId) || excluded.has(targetId)) return null;

  const queue = [sourceId];
  const visited = new Set([sourceId]);
  const previous = new Map<string, { nodeId: string; edge: GraphEdge }>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === targetId) break;
    for (const edge of [...outEdges(graph, current), ...inEdges(graph, current)]) {
      if (allowed && !allowed.has(edge.relation)) continue;
      const next = edge.sourceId === current ? edge.targetId : edge.sourceId;
      if (visited.has(next) || excluded.has(next)) continue;
      visited.add(next);
      previous.set(next, { nodeId: current, edge });
      queue.push(next);
    }
  }
  if (!visited.has(targetId)) return null;

  const nodeIds = [targetId];
  const edgeIds: string[] = [];
  const relations: RelationType[] = [];
  let cursor = targetId;
  while (cursor !== sourceId) {
    const step = previous.get(cursor);
    if (!step) return null;
    nodeIds.unshift(step.nodeId);
    edgeIds.unshift(step.edge.id);
    relations.unshift(step.edge.relation);
    cursor = step.nodeId;
  }
  return { nodeIds, edgeIds, relations };
}

export interface ImpactResult {
  /** Nodes impaired when `startId` fails, nearest first. */
  impacted: Array<{ nodeId: string; distance: number; via: RelationType }>;
  /** Convenience: impacted nodes narrowed to one type. */
  byType: Record<string, string[]>;
}

/**
 * What breaks when a node fails.
 *
 * Dependency relations point supplier -> consumer (`POWERS`, `COOLS`,
 * `REALIZED_BY`), so impact is the *forward* closure from the failing node over
 * exactly those relations. Nothing else propagates failure: being adjacent to a
 * dead UPS does not make a rack lose power.
 */
export function impactOf(
  graph: KnowledgeGraph,
  startId: string,
  relations: RelationType[] = DEPENDENCY_RELATIONS,
): ImpactResult {
  const allowed = new Set(relations);
  const impacted: ImpactResult['impacted'] = [];
  const byType: Record<string, string[]> = {};
  if (!graph.nodes[startId]) return { impacted, byType };

  const seen = new Set([startId]);
  let frontier: Array<{ id: string; via: RelationType | null }> = [{ id: startId, via: null }];
  let distance = 0;

  while (frontier.length > 0) {
    distance++;
    const next: Array<{ id: string; via: RelationType }> = [];
    for (const item of frontier)
      for (const edge of outEdges(graph, item.id)) {
        if (!allowed.has(edge.relation)) continue;
        if (seen.has(edge.targetId)) continue;
        seen.add(edge.targetId);
        next.push({ id: edge.targetId, via: edge.relation });
      }
    for (const item of next.sort((a, b) => a.id.localeCompare(b.id))) {
      impacted.push({ nodeId: item.id, distance, via: item.via });
      const type = graph.nodes[item.id]?.type;
      if (type) (byType[type] ??= []).push(item.id);
    }
    frontier = next;
  }

  return { impacted, byType };
}

/** Nodes of a type whose name contains `query`, case-insensitively. */
export function search(graph: KnowledgeGraph, query: string, type?: NodeType): GraphNode[] {
  const needle = query.trim().toLowerCase();
  return Object.values(graph.nodes)
    .filter((node) => (type ? node.type === type : true))
    .filter(
      (node) =>
        !needle ||
        node.name.toLowerCase().includes(needle) ||
        node.id.toLowerCase().includes(needle) ||
        node.aliases.some((alias) => alias.toLowerCase().includes(needle)),
    )
    .sort((a, b) => a.id.localeCompare(b.id));
}

export interface SerializeOptions {
  /** Include each fact's source and confidence. On by default. */
  provenance?: boolean;
  /** Hard cap on emitted lines, so a context window cannot be blown. */
  maxLines?: number;
}

/**
 * Compact triple serialization: `(head)-[REL {source}]->(tail)`, grouped by head
 * and deduplicated. A table of triples beats a prose summary — exact facts can
 * be quoted back.
 */
export function serializeSubgraph(
  graph: KnowledgeGraph,
  subgraph: Subgraph,
  options: SerializeOptions = {},
): string {
  const withProvenance = options.provenance ?? true;
  const maxLines = options.maxLines ?? 500;

  // Names are not unique — a build with two racks has two "Server Rack" nodes.
  // Labelling both the same would silently fuse them in the output, which is
  // the one thing a quotable serialization must never do.
  // Counted per `type:name`, since the label already carries the type — an
  // Asset called "UPS" and an AssetType called "UPS" are never confusable.
  const nameCounts = new Map<string, number>();
  for (const node of Object.values(graph.nodes)) {
    const key = `${node.type}:${node.name}`;
    nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
  }

  const label = (id: string) => {
    const node = graph.nodes[id];
    if (!node) return id;
    const ambiguous = (nameCounts.get(`${node.type}:${node.name}`) ?? 0) > 1;
    return ambiguous ? `${node.type}:${node.name}#${node.id.split(':').slice(1).join(':')}` : `${node.type}:${node.name}`;
  };

  const byHead = new Map<string, string[]>();
  for (const edge of subgraph.edges) {
    const head = label(edge.sourceId);
    const meta = withProvenance
      ? ` {source: ${edge.provenance.source}, confidence: ${edge.provenance.confidence}}`
      : '';
    const line = `  -[${edge.relation}${meta}]-> ${label(edge.targetId)}`;
    const list = byHead.get(head) ?? [];
    if (!list.includes(line)) list.push(line);
    byHead.set(head, list);
  }

  const lines: string[] = [];
  for (const head of [...byHead.keys()].sort()) {
    lines.push(`(${head})`);
    lines.push(...byHead.get(head)!.sort());
  }

  const isolated = subgraph.nodes
    .filter((node) => !subgraph.edges.some((edge) => edge.sourceId === node.id || edge.targetId === node.id))
    .map((node) => `(${node.type}:${node.name})`);
  lines.push(...isolated.sort());

  if (lines.length > maxLines)
    return [...lines.slice(0, maxLines), `… ${lines.length - maxLines} more lines omitted`].join('\n');
  return lines.join('\n');
}
