/**
 * Scoring engine.
 *
 * Pure function: `score(buildState) → RatingReport`.
 *
 * No side effects. No Date.now, no Math.random. Fully deterministic so
 * reports are shareable via URL and reproducible.
 *
 * The engine evaluates ~60 rules derived from the brief's reference
 * standards: Uptime Institute Tier I-IV, TIA-942, EN 50600, ASHRAE TC 9.9,
 * NFPA 75 / 2001, ISO 27001, EU EED, Singapore DIA, Germany EnEfG, and
 * the three deterrence categories + five security functions.
 *
 * Output:
 *  - per-axis score (0..100): redundancy, cooling, power, safety, efficiency, security
 *  - weighted overall score (0..100)
 *  - Uptime tier label (I-IV or F)
 *  - cert level (Bronze/Silver/Gold/Platinum)
 *  - issues list with severity, hint, and standard citation
 *  - unlocked achievements
 */

import {
  type BlockInstance,
  type BlockDef,
  getBlock,
  BLOCK_REGISTRY,
} from '@/lib/blocks';
import { type BuildState } from '@/lib/blocks';
import type { Cell } from '@/lib/grid';
import { type PolicyState } from './policy';
import { allRules, type Rule, type Issue } from './rules';

export type Severity = 'info' | 'warn' | 'error' | 'critical';

export interface RatingBreakdown {
  redundancy: number; // 0..100
  cooling: number;
  power: number;
  safety: number;
  efficiency: number; // PUE-based
  security: number;
}

export type UptimeTier = 'F' | 'I' | 'II' | 'III' | 'IV';
export type CertLevel = 'None' | 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface RatingReport {
  /** Overall weighted score 0..100. */
  score: number;
  /** Per-axis scores. */
  breakdown: RatingBreakdown;
  /** Achieved Uptime tier. */
  tier: UptimeTier;
  /** Certificate level. */
  level: CertLevel;
  /** Whether the build passes the cert threshold. */
  certifiable: boolean;
  /** All issues raised by the rule pack. */
  issues: Issue[];
  /** Achievements unlocked by this build. */
  achievements: Achievement[];
  /** PUE estimate. */
  pue: number;
  /** WUE estimate (L/kWh). */
  wue: number;
  /** Aggregate heat output (kW). */
  totalHeatKW: number;
  /** Aggregate IT load (kW). */
  totalITLoadKW: number;
  /** Aggregate facility power (kW). */
  totalFacilityPowerKW: number;
  /** The rule pack version. */
  rulePackVersion: string;
}

/** Public scoring entry point. */
export function score(state: BuildState): RatingReport {
  const ctx = buildContext(state);
  const issues: Issue[] = [];
  const achievements = new Set<string>();

  for (const rule of allRules) {
    try {
      const result = rule.evaluate(ctx);
      for (const issue of result.issues) {
        issues.push(issue);
      }
      for (const ach of result.achievements) {
        achievements.add(ach);
      }
    } catch (err) {
      // never let one rule crash the whole engine
      issues.push({
        ruleId: rule.id,
        severity: 'info',
        message: `Rule ${rule.id} failed: ${err instanceof Error ? err.message : String(err)}`,
        standard: rule.standard,
        hint: 'Please report this issue.',
      });
    }
  }

  const breakdown = computeBreakdown(issues);
  const overall = Math.round(
    breakdown.redundancy * 0.2 +
      breakdown.cooling * 0.15 +
      breakdown.power * 0.2 +
      breakdown.safety * 0.15 +
      breakdown.efficiency * 0.15 +
      breakdown.security * 0.15,
  );
  const tier = deriveTier(issues, state);
  const level = deriveLevel(overall, issues);
  const pue = estimatePUE(state);
  // local countByType
  const counts: Record<string, number> = {};
  for (const v of Object.values(state.voxels)) counts[v.type] = (counts[v.type] ?? 0) + 1;
  function countByType(s: BuildState): Record<string, number> {
    if (s === state) return counts;
    const out: Record<string, number> = {};
    for (const v of Object.values(s.voxels)) out[v.type] = (out[v.type] ?? 0) + 1;
    return out;
  }
  const wue = estimateWUE(state);
  const certifiable = overall >= 60 && tier !== 'F';

  return {
    score: clamp(overall, 0, 100),
    breakdown,
    tier,
    level,
    certifiable,
    issues: issues.sort(severityRank),
    achievements: Array.from(achievements)
      .map((id) => ACHIEVEMENTS[id])
      .filter((a): a is Achievement => a !== undefined),
    pue,
    wue,
    totalHeatKW: ctx.totalHeatKW,
    totalITLoadKW: ctx.totalITLoadKW,
    totalFacilityPowerKW: ctx.totalFacilityPowerKW,
    rulePackVersion: RULE_PACK_VERSION,
  };
}

const RULE_PACK_VERSION = '0.1.0';

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function severityRank(a: Issue, b: Issue) {
  const order: Record<Severity, number> = { critical: 0, error: 1, warn: 2, info: 3 };
  return (order[a.severity] ?? 99) - (order[b.severity] ?? 99);
}

// ----------------------------------------------------------------------------
// Context — what the rule pack sees.
// ----------------------------------------------------------------------------

export interface RuleContext {
  build: BuildState;
  blocks: BlockInstance[];
  byCell: Record<string, BlockInstance>;
  blockDefs: Map<string, BlockDef>;
  counts: Record<string, number>;
  policies: PolicyState;
  totalHeatKW: number;
  totalITLoadKW: number;
  totalFacilityPowerKW: number;
  hasBlock: (id: string) => boolean;
  countBlock: (id: string) => number;
  hasCategory: (cat: string) => boolean;
  countCategory: (cat: string) => number;
}

function buildContext(state: BuildState): RuleContext {
  const blocks = Object.values(state.voxels);
  const byCell: Record<string, BlockInstance> = {};
  for (const b of blocks) {
    for (let dx = 0; dx < 1; dx++) {
      byCell[`${b.position.x},${b.position.y},${b.position.z}`] = b;
    }
  }
  const blockDefs = new Map<string, BlockDef>();
  for (const b of blocks) {
    const d = getBlock(b.type);
    if (d) blockDefs.set(b.id, d);
  }
  const counts = countByType(state);

  let totalHeatKW = 0;
  let totalITLoadKW = 0;
  let totalFacilityPowerKW = 0;
  for (const b of blocks) {
    const d = getBlock(b.type);
    if (!d) continue;
    totalHeatKW += d.heatLoad;
    if (d.category === 'it') totalITLoadKW += d.powerDraw;
    if (d.category === 'power' || d.category === 'cooling') {
      totalFacilityPowerKW += Math.abs(d.powerDraw);
    } else {
      totalFacilityPowerKW += d.powerDraw;
    }
  }
  totalFacilityPowerKW = Math.max(totalFacilityPowerKW, totalITLoadKW);

  return {
    build: state,
    blocks,
    byCell,
    blockDefs,
    counts,
    policies: state.policies,
    totalHeatKW,
    totalITLoadKW,
    totalFacilityPowerKW,
    hasBlock: (id) => (counts[id] ?? 0) > 0,
    countBlock: (id) => counts[id] ?? 0,
    hasCategory: (cat) => blocks.some((b) => getBlock(b.type)?.category === cat),
    countCategory: (cat) => blocks.filter((b) => getBlock(b.type)?.category === cat).length,
  };
}

// ----------------------------------------------------------------------------
// Breakdown — coarse per-axis score from issue severities.
// ----------------------------------------------------------------------------

function computeBreakdown(issues: Issue[]): RatingBreakdown {
  const out: RatingBreakdown = {
    redundancy: 100,
    cooling: 100,
    power: 100,
    safety: 100,
    efficiency: 100,
    security: 100,
  };
  for (const i of issues) {
    const axis = ruleAxis(i.ruleId);
    if (!axis) continue;
    const penalty = i.severity === 'critical' ? 40 : i.severity === 'error' ? 20 : i.severity === 'warn' ? 8 : 2;
    out[axis] = Math.max(0, out[axis] - penalty);
  }
  return out;
}

function ruleAxis(ruleId: string): keyof RatingBreakdown | null {
  if (ruleId.startsWith('UPTIME.') || ruleId.startsWith('TIA.') || ruleId.startsWith('EN50.')) return 'redundancy';
  if (ruleId.startsWith('COOL.') || ruleId.startsWith('ASHRAE.')) return 'cooling';
  if (ruleId.startsWith('POWER.')) return 'power';
  if (ruleId.startsWith('NFPA.') || ruleId.startsWith('SAFETY.')) return 'safety';
  if (ruleId.startsWith('ESG.') || ruleId.startsWith('PUE.') || ruleId.startsWith('WUE.')) return 'efficiency';
  if (ruleId.startsWith('SEC.') || ruleId.startsWith('DET.') || ruleId.startsWith('PRIV.')) return 'security';
  return null;
}

// ----------------------------------------------------------------------------
// Tier mapping
// ----------------------------------------------------------------------------

function deriveTier(issues: Issue[], state: BuildState): UptimeTier {
  const has = (id: string) => (countByType(state)[id] ?? 0) > 0;
  // Tier IV requires 2N power, 2N cooling, fault-isolated paths
  const has2N = has('utility_feed') && has('ups') && has('generator');
  // Tier III requires concurrent maintainability: at least one utility feed + UPS + generator
  const hasIII = has('utility_feed') && has('ups') && has('generator');
  // Tier II requires N+1
  const hasII = has('ups') || has('generator');
  // Tier I basic
  const hasI = has('utility_feed');

  // critical issues that fail any tier
  const critical = issues.filter((i) => i.severity === 'critical');
  if (critical.length > 5) return 'F';
  if (has2N && has('crac') && state.policies['preventive.firewall']) return 'IV';
  if (hasIII && has('crac')) return 'III';
  if (hasII) return 'II';
  if (hasI) return 'I';
  return 'F';
}

function deriveLevel(overall: number, _issues: Issue[]): CertLevel {
  if (overall >= 90) return 'Platinum';
  if (overall >= 75) return 'Gold';
  if (overall >= 60) return 'Silver';
  if (overall >= 40) return 'Bronze';
  return 'None';
}

// ----------------------------------------------------------------------------
// PUE / WUE estimates
// ----------------------------------------------------------------------------

function estimatePUE(state: BuildState): number {
  const ctx = buildContext(state);
  if (ctx.totalITLoadKW <= 0) return 0;
  const cooling = ctx.countBlock('crac') * 5 + ctx.countBlock('in_row_cooling') * 4 + ctx.countBlock('cdu') * 2;
  const baseOverhead = 1.1; // lights, network
  const coolingOverhead = Math.max(1, cooling / Math.max(1, ctx.totalITLoadKW)) * 0.3;
  return round(baseOverhead + coolingOverhead, 2);
}

function estimateWUE(state: BuildState): number {
  const ctx = buildContext(state);
  if (ctx.totalITLoadKW <= 0) return 0;
  const waterUse = ctx.countBlock('crac') * 1.5 + ctx.countBlock('cdu') * 0.5;
  return round(waterUse / Math.max(1, ctx.totalITLoadKW), 2);
}

function round(n: number, d: number) {
  const m = Math.pow(10, d);
  return Math.round(n * m) / m;
}

// ----------------------------------------------------------------------------
// Achievements catalog
// ----------------------------------------------------------------------------

const ACHIEVEMENTS: Record<string, Achievement> = {
  first_build: {
    id: 'first_build',
    title: 'First Build',
    description: 'Placed your first block.',
    icon: '🛠',
  },
  no_spoF: {
    id: 'no_spoF',
    title: 'No Single Point of Failure',
    description: 'Reached Tier III or higher.',
    icon: '🛡',
  },
  tier_iv: {
    id: 'tier_iv',
    title: 'Fault Tolerant',
    description: 'Achieved Uptime Tier IV.',
    icon: '🏆',
  },
  carbon_aware: {
    id: 'carbon_aware',
    title: 'Carbon Aware',
    description: 'PUE below 1.3 and renewable ≥ 50%.',
    icon: '🌱',
  },
  pue_1_2: {
    id: 'pue_1_2',
    title: 'Hyper-Efficient',
    description: 'PUE below 1.2.',
    icon: '⚡',
  },
  fire_drilled: {
    id: 'fire_drilled',
    title: 'Fire Drilled',
    description: 'VESDA + FM-200 + EPO + fire walls in place.',
    icon: '🔥',
  },
  hot_cold_aisle: {
    id: 'hot_cold_aisle',
    title: 'Hot/Cold Aisle',
    description: 'Racks in rows with in-row or CRAC cooling.',
    icon: '❄',
  },
  defense_in_depth: {
    id: 'defense_in_depth',
    title: 'Defense in Depth',
    description: 'All 5 security functions enabled.',
    icon: '🛡',
  },
  deterrence_max: {
    id: 'deterrence_max',
    title: 'Deterrent Maximalist',
    description: 'All deterrence categories fully enabled.',
    icon: '🚧',
  },
  zero_trust: {
    id: 'zero_trust',
    title: 'Zero Trust',
    description: 'Zero-trust + micro-segmentation + bastion.',
    icon: '🔐',
  },
  perim_locked: {
    id: 'perim_locked',
    title: 'Perimeter Locked',
    description: 'Mantrap + biometric + CCTV + lighting + guards.',
    icon: '🔒',
  },
  immutable_forever: {
    id: 'immutable_forever',
    title: 'Immutable Forever',
    description: 'Immutable backup vault + IaC recovery + DR site.',
    icon: '💾',
  },
  sd_ready: {
    id: 'sd_ready',
    title: 'Software-Defined',
    description: 'SDN + hypervisor nodes + WAF.',
    icon: '🧠',
  },
  ai_native: {
    id: 'ai_native',
    title: 'AI-Native',
    description: 'GPU pod with liquid cooling.',
    icon: '🧊',
  },
};
