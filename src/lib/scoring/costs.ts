import { getBlock, type BuildState } from '@/lib/blocks';
import { getScenario } from '@/lib/scenarios';

const CATEGORY_BASE_COST: Record<string, number> = {
  structure: 80,
  site: 250,
  power: 4_500,
  cooling: 6_500,
  it: 12_000,
  safety: 1_500,
  network: 2_500,
};

const BLOCK_COST_OVERRIDES: Record<string, number> = {
  floor_tile: 35,
  raised_floor_tile: 55,
  fire_wall: 280,
  door: 650,
  mantrap: 14_000,
  perimeter_fence: 18_000,
  security_gate: 7_500,
  bollard: 450,
  security_light: 320,
  cctv_camera: 1_100,
  warning_sign: 45,
  utility_feed: 62_000,
  transformer: 31_000,
  switchgear: 18_000,
  ups: 44_000,
  battery: 11_000,
  generator: 96_000,
  pdu: 5_500,
  busway: 3_200,
  crac: 28_000,
  in_row_cooling: 32_000,
  cdu: 38_000,
  immersion_tank: 48_000,
  server_rack: 17_500,
  storage_array: 26_000,
  gpu_pod: 68_000,
  blade_chassis: 24_000,
  tor_switch: 4_500,
  sdn_controller: 8_000,
  firewall: 2_100,
  ids_ips: 2_800,
  waf: 4_200,
  siem: 4_800,
  honeypot: 1_200,
  access_reader: 450,
  biometric: 1_900,
  vesda: 8_400,
  fm200: 4_100,
  sprinkler: 380,
  fire_panel: 4_500,
  epo: 220,
  solar_canopy: 26_000,
  heat_recovery: 18_000,
  outside_air_economizer: 12_000,
};

export interface CostBreakdown {
  buildCostUsd: number;
  budgetUsd: number;
  overBudget: boolean;
}

export function estimateBuildCost(state: BuildState): number {
  let total = 0;
  for (const block of Object.values(state.voxels)) {
    const def = getBlock(block.type);
    if (!def) continue;
    total += estimateBlockCost(def.id, def.category, def.size, def.powerDraw);
  }
  return Math.round(total);
}

export function scenarioBudgetUsd(state: BuildState): number {
  return getScenario(state.scenarioId)?.budgetUsd ?? Number.POSITIVE_INFINITY;
}

export function estimateCostContext(state: BuildState): CostBreakdown {
  const buildCostUsd = estimateBuildCost(state);
  const budgetUsd = scenarioBudgetUsd(state);
  return {
    buildCostUsd,
    budgetUsd,
    overBudget: Number.isFinite(budgetUsd) ? buildCostUsd > budgetUsd : false,
  };
}

function estimateBlockCost(
  blockId: string,
  category: string,
  size: [number, number, number],
  powerDraw: number,
): number {
  const override = BLOCK_COST_OVERRIDES[blockId];
  if (override !== undefined) return override;
  const volume = size[0] * size[1] * size[2];
  const powerPremium = Math.max(0, powerDraw) * 1_200;
  return Math.round((CATEGORY_BASE_COST[category] ?? 500) + volume * 60 + powerPremium);
}
