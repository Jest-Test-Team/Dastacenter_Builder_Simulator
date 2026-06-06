/**
 * Scenario catalog.
 *
 * Each scenario is a structured challenge: starting inventory, goal,
 * standards focus, and a short brief. Users pick one from the
 * `/scenarios` page or jump straight into `/build/[scenarioId]`.
 */

import type { BlockDef } from '@/lib/blocks';

export interface Scenario {
  id: string;
  name: string;
  tagline: string;
  brief: string;
  /** Block id -> starting inventory. */
  inventory: Record<string, number>;
  /** Standards emphasized in the scoring engine for this scenario. */
  focus: string[];
  /** Difficulty 1..5. */
  difficulty: 1 | 2 | 3 | 4 | 5;
  /** Estimated minutes. */
  estMinutes: number;
  /** Optional goal: target tier or PUE. */
  goal?: { tier?: 'I' | 'II' | 'III' | 'IV'; maxPue?: number };
  /** Whether the build should be auto-cleared on entry. */
  freshStart: boolean;
  /** Accent color for the UI. */
  accent: string;
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'free',
    name: 'Free Build',
    tagline: 'Sandbox mode. No rules, no goal — just place blocks.',
    brief:
      'Start with a generous inventory and explore the catalog. ' +
      'Useful for learning the blocks, the policy panel, and the scoring engine.',
    inventory: {},
    focus: ['Uptime', 'TIA-942', 'ASHRAE', 'NFPA', 'ISO 27001'],
    difficulty: 1,
    estMinutes: 20,
    freshStart: true,
    accent: '#7c3aed',
  },
  {
    id: 'greenfield',
    name: 'Greenfield Deployment',
    tagline: 'Design a 1 MW colocation hall from scratch.',
    brief:
      'You have a clean site, ~30 m² of floor, and a 1 MW IT load target. ' +
      'Hit Uptime Tier III, PUE ≤ 1.4, and full coverage of the 5 security functions. ' +
      'EU EED energy reporting applies.',
    inventory: {
      floor_tile: 64,
      utility_feed: 1,
      transformer: 2,
      ups_module: 4,
      generator: 2,
      pdu: 8,
      crac_unit: 6,
      in_row_cooler: 4,
      server_rack: 16,
      tor_switch: 4,
      storage_array: 4,
      mantrap: 1,
      cctv: 8,
      access_reader: 4,
      biometric: 2,
      fire_panel: 1,
      vesda: 2,
      fm200: 2,
      sprinkler: 8,
      epo: 2,
      firewall: 2,
      ids_ips: 1,
      waf: 1,
      siem: 1,
      perimeter_fence: 1,
    },
    focus: ['Uptime Tier III', 'EN 50600', 'ASHRAE A1', 'NFPA 75', 'EU EED'],
    difficulty: 3,
    estMinutes: 45,
    goal: { tier: 'III', maxPue: 1.4 },
    freshStart: true,
    accent: '#0ea5e9',
  },
  {
    id: 'retrofit',
    name: 'Tier IV Retrofit',
    tagline: 'Upgrade an existing Tier II build to fault-tolerant.',
    brief:
      'You inherit a Tier II site with 800 kW IT load. ' +
      'Add 2N power, 2N cooling, fault-isolated paths, and complete NFPA 75 fire protection. ' +
      'Avoid disturbing the running load — minimize the change footprint.',
    inventory: {
      floor_tile: 32,
      utility_feed: 1,
      transformer: 4,
      ups_module: 8,
      generator: 4,
      pdu: 16,
      crac_unit: 8,
      in_row_cooler: 8,
      cdu: 2,
      server_rack: 24,
      tor_switch: 6,
      storage_array: 6,
      gpu_pod: 4,
      mantrap: 1,
      cctv: 12,
      access_reader: 8,
      biometric: 4,
      fire_panel: 2,
      vesda: 4,
      fm200: 4,
      sprinkler: 16,
      epo: 4,
      firewall: 4,
      ids_ips: 2,
      waf: 2,
      siem: 2,
      honeypot: 2,
      perimeter_fence: 2,
      bollard: 8,
      heat_recovery: 1,
      solar_canopy: 1,
      outside_air_economizer: 2,
    },
    focus: ['Uptime Tier IV', 'TIA-942 Rated-4', 'EN 50600-2-7', 'ASHRAE A3', 'NFPA 2001', 'NFPA 110'],
    difficulty: 5,
    estMinutes: 90,
    goal: { tier: 'IV', maxPue: 1.3 },
    freshStart: false,
    accent: '#f59e0b',
  },
  {
    id: 'edge',
    name: 'Edge Micro-Datacenter',
    tagline: 'A 5 kW containerized edge site, single-rack.',
    brief:
      'Tiny footprint, harsh environment. Liquid cooling, on-site renewables, ' +
      'air-gapped OT, and physical hardening for a remote lot. ' +
      'PUE ≤ 1.3 mandatory; DE EnEfG PUE limits apply.',
    inventory: {
      floor_tile: 4,
      utility_feed: 1,
      ups_module: 1,
      generator: 1,
      pdu: 2,
      immersion_tank: 1,
      server_rack: 2,
      gpu_pod: 1,
      tor_switch: 1,
      mantrap: 1,
      cctv: 2,
      access_reader: 1,
      biometric: 1,
      fire_panel: 1,
      vesda: 1,
      sprinkler: 2,
      epo: 1,
      firewall: 1,
      ids_ips: 1,
      solar_canopy: 1,
      heat_recovery: 1,
      perimeter_fence: 1,
      bollard: 4,
    },
    focus: ['ASHRAE A4', 'DE EnEfG PUE', 'NFPA 75', 'ISO 27001', 'CN GB 40879'],
    difficulty: 2,
    estMinutes: 30,
    goal: { tier: 'III', maxPue: 1.3 },
    freshStart: true,
    accent: '#10b981',
  },
];

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

export function defaultScenario(): Scenario {
  return SCENARIOS[0]!;
}

/**
 * Build a default inventory by applying scenario overrides on top of
 * the registry's `defaultInventory`. Returns a fresh map.
 */
export function scenarioInventory(scenario: Scenario, all: BlockDef[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const b of all) out[b.id] = b.defaultInventory;
  for (const [id, n] of Object.entries(scenario.inventory)) out[id] = n;
  return out;
}
