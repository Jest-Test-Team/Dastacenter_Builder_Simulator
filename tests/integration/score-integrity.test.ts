import { describe, expect, it } from 'vitest';
import { emptyState, placeBlock, type BuildState } from '@/lib/blocks';
import { defaultPolicyState } from '@/lib/scoring/policy';
import { score } from '@/lib/scoring';

function build(types: string[], enablePolicies = false): BuildState {
  const state: BuildState = {
    ...emptyState(),
    policies: defaultPolicyState(),
  };

  types.forEach((typeId, index) => {
    placeBlock(state, {
      typeId,
      cell: { x: index % 16, y: 1, z: Math.floor(index / 16) },
    });
  });

  if (enablePolicies) {
    for (const [key, value] of Object.entries(state.policies)) {
      if (typeof value === 'boolean') {
        (state.policies as Record<string, unknown>)[key] = true;
      }
    }
  }

  return state;
}

function scoreSignature(state: BuildState) {
  const report = score(state);
  return {
    score: report.score,
    tier: report.tier,
    level: report.level,
    certifiable: report.certifiable,
    pue: report.pue,
    wue: report.wue,
    breakdown: report.breakdown,
    issueRuleIds: report.issues.map((issue) => issue.ruleId),
    achievementIds: report.achievements.map((achievement) => achievement.id),
    rulePackVersion: report.rulePackVersion,
  };
}

describe('canonical score integrity', () => {
  it.each([
    ['empty', build([])],
    ['single rack', build(['server_rack'])],
    [
      'basic resilient site',
      build([
        'server_rack',
        'server_rack',
        'utility_feed',
        'utility_feed',
        'ups',
        'generator',
        'crac_unit',
        'fire_panel',
        'sprinkler',
      ]),
    ],
    [
      'secured site',
      build(
        [
          'server_rack',
          'utility_feed',
          'ups',
          'generator',
          'crac_unit',
          'fire_panel',
          'sprinkler',
          'cctv',
          'mantrap',
          'bollard',
          'firewall',
          'ids_ips',
        ],
        true,
      ),
    ],
    [
      'efficient edge site',
      build(
        [
          'server_rack',
          'utility_feed',
          'ups',
          'generator',
          'immersion_tank',
          'fire_panel',
          'vesda',
          'cctv',
          'access_reader',
          'firewall',
          'solar_canopy',
          'heat_recovery',
        ],
        true,
      ),
    ],
  ])('%s retains its certificate signature', (_name, state) => {
    expect(scoreSignature(state)).toMatchSnapshot();
  });
});
