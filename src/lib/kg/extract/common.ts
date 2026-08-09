/**
 * Shared extractor helpers (pipeline stages 4-6).
 *
 * A BuildState is structured data, so every extractor here is a deterministic
 * mapping from columns to ontology types — the D2R approach. Running a language
 * model over data that already has a schema is the classic beginner waste, and
 * it would also make the graph non-reproducible, which the ZK digest cannot
 * tolerate.
 */

import type { NodeType, RelationType } from '../ontology';
import { edgeId, type Confidence, type GraphEdge, type GraphNode, type Provenance } from '../types';

/**
 * Extraction is deterministic and re-runnable, so a caller may pin the clock to
 * keep node ids and digests stable across runs.
 */
export interface ExtractContext {
  /** Timestamp stamped into every Provenance record. */
  now: number;
  /** The Build node id every extractor anchors to. */
  rootId: string;
}

export function provenance(
  extractor: string,
  source: string,
  ctx: ExtractContext,
  confidence: Confidence = 'high',
  derivedFrom?: string,
): Provenance {
  return { extractor, source, extractedAt: ctx.now, confidence, ...(derivedFrom ? { derivedFrom } : {}) };
}

/** Namespaced node id, so a Space and an Asset can never collide. */
export function nodeId(type: NodeType, localId: string): string {
  return `${type}:${localId}`;
}

export function makeNode(
  type: NodeType,
  localId: string,
  name: string,
  attributes: Record<string, unknown>,
  prov: Provenance,
  extra: Partial<Pick<GraphNode, 'aliases' | 'at'>> = {},
): GraphNode {
  return {
    id: nodeId(type, localId),
    type,
    name,
    aliases: extra.aliases ?? [],
    attributes,
    provenance: prov,
    ...(extra.at !== undefined ? { at: extra.at } : {}),
  };
}

export function makeEdge(
  relation: RelationType,
  sourceId: string,
  targetId: string,
  prov: Provenance,
  attributes: Record<string, unknown> = {},
): GraphEdge {
  return {
    id: edgeId(relation, sourceId, targetId),
    relation,
    sourceId,
    targetId,
    attributes,
    provenance: prov,
  };
}

/** Canonical form for zone names — the identity rule declared in the ontology. */
export function canonicalZone(name: string): string {
  return name.trim().toLowerCase();
}

/** Canonical form for standard codes — the identity rule declared in the ontology. */
export function canonicalStandard(code: string): string {
  return code.trim().toUpperCase();
}
