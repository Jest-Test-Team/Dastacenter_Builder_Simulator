/**
 * Quality gate (pipeline stage 7).
 *
 * Runs before fusion, because fusion propagates whatever it is given: merging
 * two nodes unions their edge sets, so one bad edge admitted here becomes many
 * bad edges afterwards. Bad precision poisons a graph permanently; missing
 * recall is recoverable on the next pass.
 *
 * The gate rejects rather than repairs. A rejected edge is reported with its
 * reason so the *extractor* gets fixed — never the output.
 */

import {
  RELATION_TYPES,
  SYMMETRIC_RELATIONS,
  checkEdgeTypes,
  isNodeType,
  type NodeType,
  type RelationType,
} from './ontology';
import { edgeId, indexGraph, type GraphEdge, type KnowledgeGraph } from './types';

export interface Rejection {
  kind: 'node' | 'edge';
  id: string;
  reason: string;
}

export interface QualityReport {
  nodeCount: number;
  edgeCount: number;
  /** Edges dropped by the gate, with why. */
  rejections: Rejection[];
  /** Nodes with no edge in either direction. Warned, never dropped. */
  orphanNodeIds: string[];
  /** Symmetric edges the gate materialized in the reverse direction. */
  materializedEdges: number;
  /** Share of proposed facts that survived, 0..1. The ≥0.9 precision gate. */
  precision: number;
  /** Per-node-type counts after the gate, for spotting an empty plane. */
  nodesByType: Record<string, number>;
  /** Per-relation counts after the gate. */
  edgesByRelation: Record<string, number>;
  passed: boolean;
}

/** The precision floor the pipeline requires before it will fuse and serve. */
export const PRECISION_THRESHOLD = 0.9;

export interface GateResult {
  graph: KnowledgeGraph;
  report: QualityReport;
}

/**
 * Validates every node and edge against the ontology and returns a cleaned
 * graph plus the report. The input graph is not mutated.
 */
export function runQualityGate(input: KnowledgeGraph): GateResult {
  const rejections: Rejection[] = [];
  const nodes: KnowledgeGraph['nodes'] = {};
  const edges: KnowledgeGraph['edges'] = {};

  for (const node of Object.values(input.nodes)) {
    if (!isNodeType(node.type)) {
      rejections.push({ kind: 'node', id: node.id, reason: `unknown node type "${node.type}"` });
      continue;
    }
    if (!node.provenance || !node.provenance.source || !node.provenance.extractor) {
      // Provenance is non-negotiable: fusion and trust both depend on it.
      rejections.push({ kind: 'node', id: node.id, reason: 'missing provenance' });
      continue;
    }
    if (!node.name) {
      rejections.push({ kind: 'node', id: node.id, reason: 'missing canonical name' });
      continue;
    }
    nodes[node.id] = node;
  }

  const accept = (edge: GraphEdge) => {
    edges[edge.id] = edge;
  };

  for (const edge of Object.values(input.edges)) {
    const source = nodes[edge.sourceId];
    const target = nodes[edge.targetId];
    if (!source || !target) {
      rejections.push({
        kind: 'edge',
        id: edge.id,
        reason: `dangling endpoint (${!source ? edge.sourceId : edge.targetId})`,
      });
      continue;
    }
    if (!edge.provenance || !edge.provenance.source) {
      rejections.push({ kind: 'edge', id: edge.id, reason: 'missing provenance' });
      continue;
    }
    const typeError = checkEdgeTypes(edge.relation, source.type, target.type);
    if (typeError) {
      rejections.push({ kind: 'edge', id: edge.id, reason: typeError });
      continue;
    }
    if (edge.sourceId === edge.targetId && !RELATION_TYPES[edge.relation].symmetric) {
      rejections.push({ kind: 'edge', id: edge.id, reason: 'self-loop' });
      continue;
    }
    accept(edge);
  }

  // Symmetric relations are stored in both directions so traversal never has to
  // special-case them. Done after validation so a rejected edge is not revived.
  let materializedEdges = 0;
  for (const relation of SYMMETRIC_RELATIONS) {
    for (const edge of Object.values(edges)) {
      if (edge.relation !== relation) continue;
      if (edge.sourceId === edge.targetId) continue;
      const mirrorId = edgeId(relation as RelationType, edge.targetId, edge.sourceId);
      if (edges[mirrorId]) continue;
      edges[mirrorId] = {
        ...edge,
        id: mirrorId,
        sourceId: edge.targetId,
        targetId: edge.sourceId,
        provenance: { ...edge.provenance, derivedFrom: `mirror of ${edge.id}` },
      };
      materializedEdges++;
    }
  }

  const graph = indexGraph({ ...input, nodes, edges });

  const orphanNodeIds = Object.keys(nodes)
    .filter((id) => (graph.outgoing[id]?.length ?? 0) === 0 && (graph.incoming[id]?.length ?? 0) === 0)
    .sort();

  const nodesByType: Record<string, number> = {};
  for (const node of Object.values(nodes)) nodesByType[node.type] = (nodesByType[node.type] ?? 0) + 1;
  const edgesByRelation: Record<string, number> = {};
  for (const edge of Object.values(edges))
    edgesByRelation[edge.relation] = (edgesByRelation[edge.relation] ?? 0) + 1;

  const proposed = Object.keys(input.nodes).length + Object.keys(input.edges).length;
  const precision = proposed === 0 ? 1 : (proposed - rejections.length) / proposed;

  return {
    graph,
    report: {
      nodeCount: Object.keys(nodes).length,
      edgeCount: Object.keys(edges).length,
      rejections,
      orphanNodeIds,
      materializedEdges,
      precision,
      nodesByType,
      edgesByRelation,
      passed: precision >= PRECISION_THRESHOLD,
    },
  };
}

/** Node types the gate expects to be non-empty once a build has any content. */
export const EXPECTED_PLANES: NodeType[] = ['Build', 'Space', 'Asset', 'AssetType', 'Standard'];
