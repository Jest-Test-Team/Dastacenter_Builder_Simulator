/**
 * Facility knowledge graph — representation (pipeline stage 2).
 *
 * Chosen representation: a property graph expressed as typed edges in plain
 * TypeScript. The graph is derived from one BuildState and stays well under
 * 50k nodes, which is exactly the case where a database buys nothing.
 *
 * Time and provenance are decided here, not later: every node and every edge
 * carries a Provenance record from the moment it is created. Retrofitting
 * provenance after fusion has run is effectively impossible, because a merged
 * node no longer knows which source asserted which of its facts.
 */

import type { NodeType, RelationType } from './ontology';

export type Confidence = 'high' | 'medium' | 'low';

/**
 * Where a fact came from. `source` points back into the BuildState that
 * produced it, precisely enough to re-derive or audit the fact.
 */
export interface Provenance {
  /** Which extractor asserted this fact. */
  extractor: string;
  /** Pointer into the source data, e.g. `voxels/<instanceId>` or `network/links/<linkId>`. */
  source: string;
  /** Epoch ms at extraction time. */
  extractedAt: number;
  confidence: Confidence;
  /**
   * Set when the fact was inferred rather than read directly — proximity-based
   * POWERS/COOLS edges, for instance. Records what justified the inference.
   */
  derivedFrom?: string;
}

export interface GraphNode {
  id: string;
  type: NodeType;
  /** Canonical display name, normalized per the entity type's identity rule. */
  name: string;
  /** Alternate surface forms; fusion unions these rather than discarding them. */
  aliases: string[];
  attributes: Record<string, unknown>;
  provenance: Provenance;
  /**
   * Attribute values that disagreed across sources during fusion. Conflicting
   * values are signal, so they are kept with their provenance rather than
   * silently overwritten.
   */
  conflicts?: Record<string, Array<{ value: unknown; provenance: Provenance }>>;
  /** Node ids absorbed into this one by fusion. Present only after a merge. */
  mergedFrom?: string[];
  /** Event time anchor, for event nodes. */
  at?: number;
}

export interface GraphEdge {
  id: string;
  relation: RelationType;
  sourceId: string;
  targetId: string;
  attributes: Record<string, unknown>;
  provenance: Provenance;
  /** Validity interval. Absent `validUntil` means "still true". */
  validFrom?: number;
  validUntil?: number;
}

/**
 * A relation the extractors saw repeatedly but the ontology does not model.
 * Reviewed periodically and promoted into the ontology if real — never forced
 * into an approximately-correct existing type.
 */
export interface CandidateRelation {
  label: string;
  sourceType: string;
  targetType: string;
  occurrences: number;
  example: string;
}

export interface KnowledgeGraph {
  /** The Build node's id; the root every traversal can fall back to. */
  rootId: string;
  nodes: Record<string, GraphNode>;
  edges: Record<string, GraphEdge>;
  /** Adjacency indexes, rebuilt by `indexGraph`. Never edited directly. */
  outgoing: Record<string, string[]>;
  incoming: Record<string, string[]>;
  candidateRelations: CandidateRelation[];
}

/** What an extractor returns before the gate and fusion have run. */
export interface ExtractionResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  candidateRelations?: CandidateRelation[];
}

export function emptyExtraction(): ExtractionResult {
  return { nodes: [], edges: [], candidateRelations: [] };
}

export function emptyGraph(rootId = ''): KnowledgeGraph {
  return {
    rootId,
    nodes: {},
    edges: {},
    outgoing: {},
    incoming: {},
    candidateRelations: [],
  };
}

/** Deterministic edge id, so re-extraction produces byte-identical graphs. */
export function edgeId(relation: RelationType, sourceId: string, targetId: string): string {
  return `${sourceId}|${relation}|${targetId}`;
}

/** Rebuilds the adjacency indexes from nodes and edges. Idempotent. */
export function indexGraph(graph: KnowledgeGraph): KnowledgeGraph {
  const outgoing: Record<string, string[]> = {};
  const incoming: Record<string, string[]> = {};
  for (const edge of Object.values(graph.edges)) {
    (outgoing[edge.sourceId] ??= []).push(edge.id);
    (incoming[edge.targetId] ??= []).push(edge.id);
  }
  for (const list of Object.values(outgoing)) list.sort();
  for (const list of Object.values(incoming)) list.sort();
  return { ...graph, outgoing, incoming };
}

/** Folds extraction results into a graph, then reindexes. Later facts do not clobber earlier ones. */
export function assemble(rootId: string, results: ExtractionResult[]): KnowledgeGraph {
  const graph = emptyGraph(rootId);
  for (const result of results) {
    for (const node of result.nodes) graph.nodes[node.id] ??= node;
    for (const edge of result.edges) graph.edges[edge.id] ??= edge;
    for (const candidate of result.candidateRelations ?? []) {
      const existing = graph.candidateRelations.find(
        (item) =>
          item.label === candidate.label &&
          item.sourceType === candidate.sourceType &&
          item.targetType === candidate.targetType,
      );
      if (existing) existing.occurrences += candidate.occurrences;
      else graph.candidateRelations.push({ ...candidate });
    }
  }
  return indexGraph(graph);
}

/** Every edge leaving a node, optionally filtered to one relation type. */
export function outEdges(
  graph: KnowledgeGraph,
  nodeId: string,
  relation?: RelationType,
): GraphEdge[] {
  const ids = graph.outgoing[nodeId] ?? [];
  const edges = ids.map((id) => graph.edges[id]!).filter(Boolean);
  return relation ? edges.filter((edge) => edge.relation === relation) : edges;
}

/** Every edge entering a node, optionally filtered to one relation type. */
export function inEdges(
  graph: KnowledgeGraph,
  nodeId: string,
  relation?: RelationType,
): GraphEdge[] {
  const ids = graph.incoming[nodeId] ?? [];
  const edges = ids.map((id) => graph.edges[id]!).filter(Boolean);
  return relation ? edges.filter((edge) => edge.relation === relation) : edges;
}

/** Nodes reachable in one hop along `relation`. */
export function neighborsVia(
  graph: KnowledgeGraph,
  nodeId: string,
  relation: RelationType,
  direction: 'out' | 'in' = 'out',
): GraphNode[] {
  const edges = direction === 'out' ? outEdges(graph, nodeId, relation) : inEdges(graph, nodeId, relation);
  return edges
    .map((edge) => graph.nodes[direction === 'out' ? edge.targetId : edge.sourceId])
    .filter((node): node is GraphNode => Boolean(node));
}

/** All nodes of a given type, in stable id order. */
export function nodesOfType(graph: KnowledgeGraph, type: NodeType): GraphNode[] {
  return Object.values(graph.nodes)
    .filter((node) => node.type === type)
    .sort((a, b) => a.id.localeCompare(b.id));
}
