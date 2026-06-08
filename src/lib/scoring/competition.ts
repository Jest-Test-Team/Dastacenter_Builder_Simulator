import type { BuildState } from '@/lib/blocks';
import type { RatingReport } from '@/lib/scoring/engine';
import { estimateCostContext } from './costs';
import { getBlock } from '@/lib/blocks';

export interface CompetitionScoreReport {
  competitionScore: number;
  baseComputeScore: number;
  efficiencyMultiplier: number;
  efficiencyScore: number;
  resiliencyBonus: number;
  buildCostUsd: number;
  budgetUsd: number;
  overBudget: boolean;
  budgetPenaltyApplied: boolean;
}

export function computeCompetitionScore(
  state: BuildState,
  report: Pick<RatingReport, 'pue' | 'tier' | 'breakdown' | 'totalITLoadKW'>,
): CompetitionScoreReport {
  const { buildCostUsd, budgetUsd, overBudget } = estimateCostContext(state);
  const computeUnits = computeUnitsFromBuild(state);
  const operational =
    report.totalITLoadKW > 0 &&
    report.tier !== 'F' &&
    report.breakdown.power >= 40 &&
    report.breakdown.cooling >= 40;

  const baseComputeScore = round(clamp((operational ? computeUnits : computeUnits * 0.2) * 80, 0, 400));
  const efficiencyMultiplier = clamp(2.0 - report.pue, 0, 2.0);
  const efficiencyScore = round(clamp(baseComputeScore * efficiencyMultiplier * 0.75, 0, 300));
  const resiliencyBonus = round(clamp(computeResiliencyBonus(state, report), 0, 300));

  let competitionScore = baseComputeScore + efficiencyScore + resiliencyBonus;
  if (overBudget) competitionScore *= 0.5;

  return {
    competitionScore: round(clamp(competitionScore, 0, 1000)),
    baseComputeScore,
    efficiencyMultiplier: round(efficiencyMultiplier, 2),
    efficiencyScore,
    resiliencyBonus,
    buildCostUsd,
    budgetUsd,
    overBudget,
    budgetPenaltyApplied: overBudget,
  };
}

function computeUnitsFromBuild(state: BuildState): number {
  let units = 0;
  for (const block of Object.values(state.voxels)) {
    const def = getBlock(block.type);
    if (!def || def.category !== 'it') continue;
    switch (block.type) {
      case 'gpu_pod':
        units += 2;
        break;
      case 'storage_array':
        units += 0.75;
        break;
      case 'blade_chassis':
        units += 1.5;
        break;
      default:
        units += 1;
        break;
    }
  }
  return units;
}

function computeResiliencyBonus(
  state: BuildState,
  report: Pick<RatingReport, 'tier' | 'breakdown'>,
): number {
  let bonus = 0;
  const counts: Record<string, number> = {};
  for (const block of Object.values(state.voxels)) {
    counts[block.type] = (counts[block.type] ?? 0) + 1;
  }

  if ((counts.ups ?? 0) >= 1) bonus += 90;
  if ((counts.ups ?? 0) >= 2) bonus += 60;
  if ((counts.generator ?? 0) >= 1) bonus += 60;
  if (report.tier === 'III') bonus += 40;
  if (report.tier === 'IV') bonus += 90;
  if (report.breakdown.security >= 80) bonus += 50;
  if (report.breakdown.safety >= 80) bonus += 25;
  if (report.breakdown.redundancy >= 80) bonus += 25;
  return bonus;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function round(v: number, digits = 0) {
  const m = 10 ** digits;
  return Math.round(v * m) / m;
}
