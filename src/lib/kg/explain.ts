/**
 * Template explainer.
 *
 * Turns retrieved paths and closures into sentences. Every sentence is built
 * from graph facts the caller can re-derive — there is no model here, so an
 * explanation can never say something the graph does not contain.
 */

import type { RelationType } from './ontology';
import { impactOf, findPath, kHop, type GraphPath } from './serve';
import { inEdges, nodesOfType, outEdges, type KnowledgeGraph } from './types';

/** How each relation reads in a sentence, as "A <phrase> B". */
const RELATION_PHRASES: Record<RelationType, string> = {
  PART_OF: 'is part of',
  CONTAINS: 'contains',
  LOCATED_IN: 'sits in',
  INSTANCE_OF: 'is a',
  POWERS: 'powers',
  COOLS: 'cools',
  ADJACENT_TO: 'is next to',
  REALIZED_BY: 'runs on',
  HOSTED_IN: 'is hosted in',
  HAS_PORT: 'has port',
  TERMINATES: 'terminates on',
  CONTROLS: 'controls',
  IN_ZONE: 'is in zone',
  APPLIES_FROM: 'applies from zone',
  APPLIES_TO: 'applies to zone',
  ORIGINATES_AT: 'starts at',
  TERMINATES_AT: 'ends at',
  SCORED: 'rated',
  RAISED_IN: 'was raised in',
  VIOLATES: 'implicates',
  CITES_STANDARD: 'cites',
  AFFECTS: 'took out of service',
  DEPLOYS: 'deployed',
  SATISFIES: 'contributes to',
};

export function nameOf(graph: KnowledgeGraph, nodeId: string): string {
  return graph.nodes[nodeId]?.name ?? nodeId;
}

/** Renders a path as one sentence: "A powers B, which sits in C." */
export function explainPath(graph: KnowledgeGraph, path: GraphPath): string {
  if (path.nodeIds.length === 0) return 'No path found.';
  if (path.nodeIds.length === 1) return `${nameOf(graph, path.nodeIds[0]!)} is the node itself.`;

  const parts: string[] = [];
  for (let i = 0; i < path.relations.length; i++) {
    const relation = path.relations[i]!;
    const edge = graph.edges[path.edgeIds[i]!];
    const from = nameOf(graph, path.nodeIds[i]!);
    const to = nameOf(graph, path.nodeIds[i + 1]!);
    // The BFS treats edges as undirected, so a step may traverse an edge
    // backwards; say so rather than asserting a relation in the wrong direction.
    const forward = edge?.sourceId === path.nodeIds[i];
    const phrase = RELATION_PHRASES[relation];
    parts.push(forward ? `${from} ${phrase} ${to}` : `${from} is ${phrase.replace(/s$/, 'ed')} by ${to}`);
  }
  return `${parts.join(', which in turn is where ')}.`.replace(/, which in turn is where /g, '; ');
}

/** Answers "what breaks if this fails?" in prose. */
export function explainImpact(graph: KnowledgeGraph, nodeId: string): string {
  const node = graph.nodes[nodeId];
  if (!node) return 'Unknown node.';
  const { impacted, byType } = impactOf(graph, nodeId);
  if (impacted.length === 0) return `Nothing depends on ${node.name}; losing it impacts no other asset.`;

  const summary = Object.entries(byType)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([type, ids]) => `${ids.length} ${type}${ids.length === 1 ? '' : 's'}`)
    .join(', ');
  const direct = impacted.filter((item) => item.distance === 1).length;
  const named = impacted
    .slice(0, 5)
    .map((item) => `${nameOf(graph, item.nodeId)} (via ${RELATION_PHRASES[item.via]}, ${item.distance} hop${item.distance === 1 ? '' : 's'})`)
    .join('; ');

  return (
    `Losing ${node.name} impairs ${impacted.length} node${impacted.length === 1 ? '' : 's'} — ${summary}. ` +
    `${direct} are directly fed by it. For example: ${named}.`
  );
}

/**
 * Answers "why is my score what it is?" by walking from the rating event out to
 * the issues, the standards they cite, and the assets they implicate.
 */
export function explainScore(graph: KnowledgeGraph): string {
  const evaluation = nodesOfType(graph, 'ScoreEvaluated')[0];
  if (!evaluation) return 'This build has not been rated yet.';

  const attributes = evaluation.attributes as Record<string, unknown>;
  const issues = nodesOfType(graph, 'IssueRaised');
  const lines: string[] = [
    `Rated ${attributes.score}/100 (${attributes.level}, Uptime Tier ${attributes.tier}) at PUE ${attributes.pue} under rule pack ${attributes.rulePackVersion}.`,
  ];

  if (issues.length === 0) {
    lines.push('No rule raised an issue against this build.');
    return lines.join(' ');
  }

  const bySeverity = new Map<string, number>();
  for (const issue of issues) {
    const severity = String(issue.attributes.severity);
    bySeverity.set(severity, (bySeverity.get(severity) ?? 0) + 1);
  }
  lines.push(
    `${issues.length} issue${issues.length === 1 ? '' : 's'} raised (${[...bySeverity.entries()]
      .sort()
      .map(([severity, count]) => `${count} ${severity}`)
      .join(', ')}).`,
  );

  // The part aggregate scoring cannot do: name the asset behind each issue.
  for (const issue of issues.slice(0, 5)) {
    const standards = outEdges(graph, issue.id, 'CITES_STANDARD').map((edge) => nameOf(graph, edge.targetId));
    const assets = outEdges(graph, issue.id, 'VIOLATES').map((edge) => nameOf(graph, edge.targetId));
    const where = assets.length
      ? ` implicating ${assets.slice(0, 3).join(', ')}${assets.length > 3 ? ` and ${assets.length - 3} more` : ''}`
      : '';
    lines.push(`- ${issue.attributes.ruleId} (${standards.join(', ') || 'no standard'})${where}: ${issue.attributes.message}`);
  }
  if (issues.length > 5) lines.push(`- … and ${issues.length - 5} more.`);

  // Which unfixed toggles would help — a two-hop answer, CQ12.
  const violated = new Set(
    issues.flatMap((issue) => outEdges(graph, issue.id, 'CITES_STANDARD').map((edge) => edge.targetId)),
  );
  const remedies = new Set<string>();
  for (const standardId of violated)
    for (const edge of inEdges(graph, standardId, 'SATISFIES')) remedies.add(nameOf(graph, edge.sourceId));
  if (remedies.size > 0)
    lines.push(
      `Policy settings already contributing to the affected standards: ${[...remedies].sort().slice(0, 6).join(', ')}.`,
    );

  return lines.join('\n');
}

/** A short prose description of a node and its immediate surroundings. */
export function describeNode(graph: KnowledgeGraph, nodeId: string): string {
  const node = graph.nodes[nodeId];
  if (!node) return 'Unknown node.';
  const { edges } = kHop(graph, nodeId, 1);
  const facts = edges
    .slice(0, 8)
    .map((edge) =>
      edge.sourceId === nodeId
        ? `${RELATION_PHRASES[edge.relation]} ${nameOf(graph, edge.targetId)}`
        : `is ${RELATION_PHRASES[edge.relation].replace(/s$/, 'ed')} by ${nameOf(graph, edge.sourceId)}`,
    );
  return `${node.name} is a ${node.type}. It ${facts.join(', ') || 'has no recorded relationships'}.`;
}

/**
 * Convenience wrapper: path between two nodes, already rendered.
 *
 * Pass `relations` when the question is about a specific plane. Unfiltered, BFS
 * returns the *shortest* path, which is often an ADJACENT_TO shortcut rather
 * than the power chain the caller meant to ask about.
 */
export function explainConnection(
  graph: KnowledgeGraph,
  aId: string,
  bId: string,
  relations?: RelationType[],
): string {
  const path = findPath(graph, aId, bId, relations ? { relations } : {});
  if (!path) return `${nameOf(graph, aId)} and ${nameOf(graph, bId)} are not connected in this graph.`;
  return explainPath(graph, path);
}
