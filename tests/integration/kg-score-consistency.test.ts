/**
 * The graph must never disagree with the scoring engine.
 *
 * The knowledge graph is a second representation of the same build. Two
 * representations of one truth will drift unless something holds them together;
 * this file is that something. If a rule is added, a block gains a port, or an
 * extractor changes shape, a disagreement fails here rather than surfacing as a
 * confidently wrong answer in the Graph tab — or, worse, as a ZK proof
 * committing to a digest that does not describe the build that was scored.
 */

import { describe, expect, it } from 'vitest';
import { emptyState, getBlock, type BuildState } from '@/lib/blocks';
import { DEMO_BUILDS } from '@/lib/demos';
import { score } from '@/lib/scoring';
import { POLICY_GROUPS } from '@/lib/scoring/policy';
import {
  buildKnowledgeGraph,
  explainScore,
  inEdges,
  nodeId,
  nodesOfType,
  outEdges,
  standardOfIssue,
} from '@/lib/kg';

const FIXED_NOW = 1_700_000_000_000;

function stateOf(snapshot: unknown): BuildState {
  return { ...emptyState(), ...(snapshot as BuildState) };
}

const CASES: Array<readonly [string, BuildState]> = [
  ...DEMO_BUILDS.map((demo) => [demo.id, stateOf(demo.snapshot)] as const),
  ['empty', { ...emptyState(), buildId: 'blank', name: 'Blank' }] as const,
];

describe.each(CASES)('graph agrees with the engine: %s', (_id, state) => {
  const report = score(state);
  const { graph } = buildKnowledgeGraph(state, { now: FIXED_NOW });
  const evaluation = nodesOfType(graph, 'ScoreEvaluated')[0]!;

  it('records the same rating the engine produced', () => {
    expect(evaluation.attributes.score).toBe(report.score);
    expect(evaluation.attributes.competitionScore).toBe(report.competitionScore);
    expect(evaluation.attributes.tier).toBe(report.tier);
    expect(evaluation.attributes.level).toBe(report.level);
    expect(evaluation.attributes.pue).toBe(report.pue);
    expect(evaluation.attributes.wue).toBe(report.wue);
    expect(evaluation.attributes.rulePackVersion).toBe(report.rulePackVersion);
  });

  it('has exactly one IssueRaised node per issue the engine reported', () => {
    const issues = nodesOfType(graph, 'IssueRaised');
    expect(issues).toHaveLength(report.issues.length);
    expect(issues.map((node) => node.attributes.ruleId).sort()).toEqual(
      report.issues.map((issue) => issue.ruleId).sort(),
    );
  });

  it('carries each issue’s severity and message verbatim', () => {
    for (const issue of report.issues) {
      const node = graph.nodes[nodeId('IssueRaised', issue.ruleId)]!;
      expect(node.attributes.severity).toBe(issue.severity);
      expect(node.attributes.message).toBe(issue.message);
    }
  });

  it('cites the canonical standard for every issue', () => {
    for (const issue of report.issues) {
      const cited = outEdges(graph, nodeId('IssueRaised', issue.ruleId), 'CITES_STANDARD');
      expect(cited).toHaveLength(1);
      expect(cited[0]!.targetId).toBe(nodeId('Standard', standardOfIssue(issue.ruleId, issue.standard)));
    }
  });

  it('implicates exactly the blocks the engine named, and no others', () => {
    for (const issue of report.issues) {
      const implicated = outEdges(graph, nodeId('IssueRaised', issue.ruleId), 'VIOLATES')
        .map((edge) => edge.targetId)
        .sort();
      const expected = (issue.relatedBlocks ?? [])
        .filter((id) => state.voxels[id])
        .map((id) => nodeId('Asset', id))
        .sort();
      expect(implicated).toEqual(expected);
    }
  });

  it('has one Asset per placed voxel, and one AssetType per distinct type', () => {
    expect(nodesOfType(graph, 'Asset')).toHaveLength(Object.keys(state.voxels).length);
    const distinct = new Set(
      Object.values(state.voxels)
        .map((instance) => instance.type)
        .filter((type) => getBlock(type)),
    );
    expect(nodesOfType(graph, 'AssetType')).toHaveLength(distinct.size);
  });

  it('reproduces the engine’s IT load by summing the graph’s own asset attributes', () => {
    // Derived from the graph rather than read from the report, so a drift in
    // either direction is caught.
    const itLoad = nodesOfType(graph, 'Asset')
      .filter((node) => {
        const type = getBlock(String(node.attributes.typeId));
        return type?.category === 'it';
      })
      .reduce((total, node) => total + Number(node.attributes.powerDraw ?? 0), 0);
    expect(itLoad).toBeCloseTo(report.totalITLoadKW, 5);
  });

  it('has one PolicySetting per declared policy key', () => {
    const declared = POLICY_GROUPS.flatMap((group) => group.keys);
    expect(nodesOfType(graph, 'PolicySetting')).toHaveLength(declared.length);
  });

  it('asserts SATISFIES only from policy settings that are switched on', () => {
    for (const node of nodesOfType(graph, 'PolicySetting')) {
      const satisfies = outEdges(graph, node.id, 'SATISFIES');
      if (node.attributes.value !== true) expect(satisfies).toEqual([]);
    }
  });

  it('produces an explanation consistent with the engine’s numbers', () => {
    const text = explainScore(graph);
    expect(text).toContain(`Rated ${report.score}/100`);
    expect(text).toContain(report.rulePackVersion);
    if (report.issues.length === 0) expect(text).toContain('No rule raised an issue');
    else expect(text).toContain(`${report.issues.length} issue`);
  });

  it('anchors every issue and the rating to the same build root', () => {
    for (const issue of nodesOfType(graph, 'IssueRaised'))
      expect(inEdges(graph, graph.rootId, 'RAISED_IN').some((edge) => edge.sourceId === issue.id)).toBe(true);
    expect(outEdges(graph, evaluation.id, 'SCORED')[0]!.targetId).toBe(graph.rootId);
  });
});

describe('drift detection', () => {
  it('changes the graph when the build changes the score', () => {
    const before = stateOf(DEMO_BUILDS[0]!.snapshot);
    const after: BuildState = { ...before, voxels: {}, byCell: {} };

    const scoreBefore = score(before).score;
    const scoreAfter = score(after).score;
    expect(scoreAfter).not.toBe(scoreBefore);

    const graphBefore = buildKnowledgeGraph(before, { now: FIXED_NOW }).graph;
    const graphAfter = buildKnowledgeGraph(after, { now: FIXED_NOW }).graph;
    expect(nodesOfType(graphAfter, 'ScoreEvaluated')[0]!.attributes.score).toBe(scoreAfter);
    expect(nodesOfType(graphBefore, 'ScoreEvaluated')[0]!.attributes.score).toBe(scoreBefore);
  });
});
