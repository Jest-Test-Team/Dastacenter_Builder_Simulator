import { describe, expect, it, beforeEach } from 'vitest';
import { emptyState, placeBlock } from '@/lib/blocks';
import { defaultPolicyState } from '@/lib/scoring/policy';
import { score } from '@/lib/scoring';
import { recordLeaderboardEntry, listLeaderboardEntries } from '@/lib/leaderboard/server';

function buildState(scenarioId = 'greenfield') {
  return {
    ...emptyState(),
    scenarioId,
    scenarioName: scenarioId,
    policies: defaultPolicyState(),
  };
}

describe('competition scoring', () => {
  it('calculates a competition score and budget context', () => {
    const state = buildState('greenfield');
    placeBlock(state, { typeId: 'server_rack', cell: { x: 2, y: 1, z: 2 } });
    placeBlock(state, { typeId: 'server_rack', cell: { x: 3, y: 1, z: 2 } });
    placeBlock(state, { typeId: 'utility_feed', cell: { x: 0, y: 1, z: 0 } });
    placeBlock(state, { typeId: 'ups', cell: { x: 1, y: 1, z: 0 } });
    placeBlock(state, { typeId: 'generator', cell: { x: 4, y: 1, z: 0 } });
    placeBlock(state, { typeId: 'crac', cell: { x: 6, y: 1, z: 0 } });
    placeBlock(state, { typeId: 'fire_panel', cell: { x: 7, y: 1, z: 0 } });

    const report = score(state);
    expect(report.competitionScore).toBeGreaterThan(0);
    expect(report.buildCostUsd).toBeGreaterThan(0);
    expect(report.budgetUsd).toBeGreaterThan(0);
  });

  it('applies an over-budget penalty', () => {
    const tight = buildState('edge');
    const roomy = buildState('free');

    for (const state of [tight, roomy]) {
      placeBlock(state, { typeId: 'gpu_pod', cell: { x: 2, y: 1, z: 2 } });
      placeBlock(state, { typeId: 'gpu_pod', cell: { x: 4, y: 1, z: 2 } });
      placeBlock(state, { typeId: 'utility_feed', cell: { x: 0, y: 1, z: 0 } });
      placeBlock(state, { typeId: 'ups', cell: { x: 1, y: 1, z: 0 } });
      placeBlock(state, { typeId: 'generator', cell: { x: 3, y: 1, z: 0 } });
      placeBlock(state, { typeId: 'cdu', cell: { x: 5, y: 1, z: 0 } });
    }

    const tightReport = score(tight);
    const roomyReport = score(roomy);
    expect(tightReport.budgetPenaltyApplied).toBe(true);
    expect(roomyReport.budgetPenaltyApplied).toBe(false);
    expect(tightReport.competitionScore).toBeLessThan(roomyReport.competitionScore);
  });
});

describe('leaderboard store', () => {
  beforeEach(() => {
    (globalThis as { __dcbLeaderboard?: unknown[] }).__dcbLeaderboard = [];
  });

  it('sorts entries by score then time then id', () => {
    recordLeaderboardEntry({
      buildId: 'b',
      walletAddress: '0x2',
      blueprintHash: 'hash-b',
      competitionScore: 800,
      score: 90,
      tier: 'III',
      level: 'Gold',
      pue: 1.2,
      buildCostUsd: 1000,
      budgetUsd: 2000,
      overBudget: false,
      scenarioId: 'free',
      scenarioName: 'Free Build',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    recordLeaderboardEntry({
      buildId: 'a',
      walletAddress: '0x1',
      blueprintHash: 'hash-a',
      competitionScore: 900,
      score: 95,
      tier: 'IV',
      level: 'Platinum',
      pue: 1.1,
      buildCostUsd: 1000,
      budgetUsd: 2000,
      overBudget: false,
      scenarioId: 'free',
      scenarioName: 'Free Build',
      createdAt: '2026-01-02T00:00:00.000Z',
    });
    const top = listLeaderboardEntries(2);
    expect(top[0]?.buildId).toBe('a');
    expect(top[1]?.buildId).toBe('b');
  });
});
