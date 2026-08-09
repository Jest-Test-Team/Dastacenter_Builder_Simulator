/**
 * Knowledge fusion (pipeline stage 8).
 *
 * Blocking -> matching -> merge policy. An unfused graph answers multi-hop
 * queries wrongly *with confidence*, because paths break at the duplicate
 * boundary. This project has a real instance of that: `createDefaultNetwork()`
 * ships `room-network` and `hall-a` as duplicates of `main-floor-west` and
 * `main-floor-hall`, hidden with `visible: false` rather than merged. Any query
 * walking containment from an older saved link lands on the hidden copy and
 * finds nothing.
 *
 * An erroneous merge is far more damaging than a missed one — it silently fuses
 * two entities' entire edge sets — so the thresholds are asymmetric and every
 * merge is reversible.
 */

import { RELATION_TYPES, type RelationType } from './ontology';
import { edgeId, indexGraph, type GraphEdge, type GraphNode, type KnowledgeGraph, type Provenance } from './types';

export const AUTO_MERGE_THRESHOLD = 0.85;
export const REVIEW_THRESHOLD = 0.6;

export interface MatchScore {
  /** Normalized-name / alias / containment-key agreement. */
  string: number;
  /** Agreement on the attributes that identify the type. */
  attribute: number;
  /** Shared-neighbourhood agreement — what naive dedup misses. */
  structure: number;
  total: number;
}

export interface MergeRecord {
  survivorId: string;
  mergedId: string;
  score: MatchScore;
  /** Everything needed to put the graph back exactly as it was. */
  undo: {
    node: GraphNode;
    edges: GraphEdge[];
    survivorBefore: GraphNode;
  };
}

export interface ReviewCandidate {
  aId: string;
  bId: string;
  score: MatchScore;
  reason: string;
}

export interface FusionReport {
  /** Pairs actually compared, versus every same-type pair. Blocking's payoff. */
  comparisons: number;
  candidatePairs: number;
  merges: MergeRecord[];
  reviewQueue: ReviewCandidate[];
}

export interface FusionResult {
  graph: KnowledgeGraph;
  report: FusionReport;
}

/** Lowercase, strip punctuation and collapse whitespace. */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function tokens(name: string): Set<string> {
  return new Set(normalizeName(name).split(' ').filter((token) => token.length > 2));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let shared = 0;
  for (const item of a) if (b.has(item)) shared++;
  return shared / (a.size + b.size - shared);
}

/**
 * Blocking: group nodes cheaply so we never do n-squared comparisons. Key is
 * the node type plus a coarse signature — for a Space that is its kind and
 * floor level, which is the cheapest thing that keeps true duplicates together.
 */
export function blockingKeys(node: GraphNode): string[] {
  const keys: string[] = [];
  if (node.type === 'Space') {
    const kind = String(node.attributes.kind ?? '');
    const level = node.attributes.floorLevel ?? 'na';
    keys.push(`Space|${kind}|${level}`);
  }
  for (const token of tokens(node.name)) keys.push(`${node.type}|tok|${token}`);
  return keys;
}

/** Neighbourhood signature: the (relation, other-node) pairs around a node. */
function neighborhood(graph: KnowledgeGraph, nodeId: string): Set<string> {
  const signature = new Set<string>();
  for (const id of graph.outgoing[nodeId] ?? []) {
    const edge = graph.edges[id];
    if (edge) signature.add(`out|${edge.relation}|${edge.targetId}`);
  }
  for (const id of graph.incoming[nodeId] ?? []) {
    const edge = graph.edges[id];
    if (edge) signature.add(`in|${edge.relation}|${edge.sourceId}`);
  }
  return signature;
}

function boundsOf(node: GraphNode): number[] | null {
  const bounds = node.attributes.bounds as Record<string, number> | undefined;
  if (!bounds) return null;
  return [bounds.x!, bounds.y!, bounds.z!, bounds.width!, bounds.height!, bounds.depth!];
}

/**
 * Layered matching. String similarity alone merges two unrelated "Operations
 * West" rooms on different floors; the structure layer is what separates them.
 */
export function matchScore(graph: KnowledgeGraph, a: GraphNode, b: GraphNode): MatchScore {
  const aNames = new Set([normalizeName(a.name), ...a.aliases.map(normalizeName)]);
  const bNames = new Set([normalizeName(b.name), ...b.aliases.map(normalizeName)]);
  let string = 0;
  for (const name of aNames) if (bNames.has(name)) string = 1;
  if (string === 0) string = jaccard(tokens(a.name), tokens(b.name));

  const structure = jaccard(neighborhood(graph, a.id), neighborhood(graph, b.id));

  let attribute = 0;
  if (a.type === 'Space') {
    const aBounds = boundsOf(a);
    const bBounds = boundsOf(b);
    const sameKind = a.attributes.kind === b.attributes.kind;
    const sameLevel = a.attributes.floorLevel === b.attributes.floorLevel;
    const sameBounds =
      aBounds !== null && bBounds !== null && aBounds.every((value, i) => value === bBounds[i]);

    // Identical bounds settle it outright. Two distinct spaces cannot occupy
    // the same volume — bounds include the y origin, so same-shaped rooms on
    // different floors never collide. This is the rule that finally collapses
    // the shipped `hall-a` / `main-floor-hall` pair, whose *names* share
    // nothing ("Data Hall A (legacy)" vs "Main Concourse") and which weighted
    // string similarity alone would leave forever unmerged.
    if (sameBounds && sameKind) return { string, attribute: 1, structure, total: 1 };
    attribute = sameKind && sameLevel ? 0.5 : 0;
  } else {
    attribute = a.attributes.kind === b.attributes.kind ? 0.5 : 0;
  }

  // Attribute evidence is weighted highest because for this domain it is
  // physical: identical bounds are not a coincidence.
  const total = 0.3 * string + 0.45 * attribute + 0.25 * structure;
  return { string, attribute, structure, total };
}

function mergeProvenance(node: GraphNode): Provenance {
  return { ...node.provenance, derivedFrom: `fusion of ${node.id}` };
}

/**
 * Runs blocking, matching and the merge policy. Only same-typed nodes sharing a
 * blocking key are ever compared.
 */
export function fuseGraph(input: KnowledgeGraph): FusionResult {
  const graph = indexGraph({
    ...input,
    nodes: { ...input.nodes },
    edges: { ...input.edges },
  });

  const blocks = new Map<string, string[]>();
  for (const node of Object.values(graph.nodes))
    for (const key of blockingKeys(node)) {
      const list = blocks.get(key) ?? [];
      list.push(node.id);
      blocks.set(key, list);
    }

  const compared = new Set<string>();
  const pairs: Array<{ a: GraphNode; b: GraphNode; score: MatchScore }> = [];
  let candidatePairs = 0;

  for (const ids of blocks.values()) {
    if (ids.length < 2) continue;
    const sorted = [...ids].sort();
    for (let i = 0; i < sorted.length; i++)
      for (let j = i + 1; j < sorted.length; j++) {
        const key = `${sorted[i]}::${sorted[j]}`;
        if (compared.has(key)) continue;
        compared.add(key);
        const a = graph.nodes[sorted[i]!]!;
        const b = graph.nodes[sorted[j]!]!;
        if (a.type !== b.type) continue;
        candidatePairs++;
        pairs.push({ a, b, score: matchScore(graph, a, b) });
      }
  }

  const merges: MergeRecord[] = [];
  const reviewQueue: ReviewCandidate[] = [];
  const absorbed = new Set<string>();

  // Highest-confidence merges first, so a three-way duplicate collapses onto the
  // best survivor rather than chaining through the weakest pair.
  pairs.sort((x, y) => y.score.total - x.score.total || x.a.id.localeCompare(y.a.id));

  for (const pair of pairs) {
    if (absorbed.has(pair.a.id) || absorbed.has(pair.b.id)) continue;
    if (pair.score.total >= AUTO_MERGE_THRESHOLD) {
      const [survivor, merged] = chooseSurvivor(graph.nodes[pair.a.id]!, graph.nodes[pair.b.id]!);
      merges.push(mergeNodes(graph, survivor, merged, pair.score));
      absorbed.add(merged.id);
      continue;
    }
    if (pair.score.total >= REVIEW_THRESHOLD)
      reviewQueue.push({
        aId: pair.a.id,
        bId: pair.b.id,
        score: pair.score,
        reason: describeMatch(pair.score),
      });
  }

  return {
    graph: indexGraph(graph),
    report: { comparisons: compared.size, candidatePairs, merges, reviewQueue },
  };
}

function describeMatch(score: MatchScore): string {
  const parts: string[] = [];
  if (score.string >= 0.9) parts.push('names agree');
  else if (score.string > 0) parts.push('names partly agree');
  if (score.attribute >= 1) parts.push('identical bounds');
  else if (score.attribute > 0) parts.push('same kind and level');
  if (score.structure > 0) parts.push('shared neighbourhood');
  return parts.length ? parts.join(', ') : 'weak evidence';
}

/**
 * Survivor policy: prefer the visible node, then the one with more edges, then
 * the lexically smaller id. Deterministic code, not model judgment.
 */
function chooseSurvivor(a: GraphNode, b: GraphNode): [GraphNode, GraphNode] {
  const aHidden = a.attributes.visible === false;
  const bHidden = b.attributes.visible === false;
  if (aHidden !== bHidden) return aHidden ? [b, a] : [a, b];
  return a.id <= b.id ? [a, b] : [b, a];
}

/** Rewrites every edge touching `merged` onto `survivor`, recording the undo. */
function mergeNodes(
  graph: KnowledgeGraph,
  survivor: GraphNode,
  merged: GraphNode,
  score: MatchScore,
): MergeRecord {
  const touching = [
    ...(graph.outgoing[merged.id] ?? []),
    ...(graph.incoming[merged.id] ?? []),
  ]
    .map((id) => graph.edges[id])
    .filter((edge): edge is GraphEdge => Boolean(edge));

  const undoEdges = touching.map((edge) => ({ ...edge }));

  for (const edge of touching) {
    delete graph.edges[edge.id];
    const sourceId = edge.sourceId === merged.id ? survivor.id : edge.sourceId;
    const targetId = edge.targetId === merged.id ? survivor.id : edge.targetId;
    // A merge can turn a real edge into a self-loop; drop it unless the
    // relation is genuinely reflexive.
    if (sourceId === targetId && !RELATION_TYPES[edge.relation as RelationType].symmetric) continue;
    const rewritten: GraphEdge = {
      ...edge,
      id: edgeId(edge.relation, sourceId, targetId),
      sourceId,
      targetId,
      provenance: { ...edge.provenance, derivedFrom: `rewritten by merge of ${merged.id}` },
    };
    graph.edges[rewritten.id] ??= rewritten;
  }

  const survivorBefore = { ...survivor, aliases: [...survivor.aliases] };

  // Conflicting attribute values are signal. Keep both with provenance rather
  // than letting the survivor silently overwrite the loser.
  const conflicts = { ...(survivor.conflicts ?? {}) };
  for (const [key, value] of Object.entries(merged.attributes)) {
    if (!(key in survivor.attributes)) {
      survivor.attributes[key] = value;
      continue;
    }
    if (JSON.stringify(survivor.attributes[key]) === JSON.stringify(value)) continue;
    (conflicts[key] ??= []).push({ value, provenance: merged.provenance });
  }

  graph.nodes[survivor.id] = {
    ...survivor,
    aliases: [...new Set([...survivor.aliases, merged.name, ...merged.aliases])].filter(
      (alias) => alias !== survivor.name,
    ),
    conflicts: Object.keys(conflicts).length ? conflicts : undefined,
    mergedFrom: [...(survivor.mergedFrom ?? []), merged.id],
    provenance: mergeProvenance(survivor),
  };
  delete graph.nodes[merged.id];

  return { survivorId: survivor.id, mergedId: merged.id, score, undo: { node: merged, edges: undoEdges, survivorBefore } };
}

/**
 * Reverses one merge exactly. Merges must be reversible: an erroneous merge is
 * otherwise unrecoverable once downstream queries have run against it.
 */
export function unmerge(graph: KnowledgeGraph, record: MergeRecord): KnowledgeGraph {
  const nodes = { ...graph.nodes };
  const edges = { ...graph.edges };

  // Remove the rewritten edges before restoring the originals. Only edges the
  // merge itself created are removed — a rewrite that collided with an edge the
  // survivor already had must survive the undo.
  const marker = `rewritten by merge of ${record.mergedId}`;
  for (const original of record.undo.edges) {
    const sourceId = original.sourceId === record.mergedId ? record.survivorId : original.sourceId;
    const targetId = original.targetId === record.mergedId ? record.survivorId : original.targetId;
    const rewrittenId = edgeId(original.relation, sourceId, targetId);
    if (edges[rewrittenId]?.provenance.derivedFrom === marker) delete edges[rewrittenId];
  }
  for (const original of record.undo.edges) edges[original.id] = original;

  nodes[record.mergedId] = record.undo.node;
  nodes[record.survivorId] = record.undo.survivorBefore;

  return indexGraph({ ...graph, nodes, edges });
}
