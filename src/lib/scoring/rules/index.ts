/**
 * Scoring rules.
 *
 * Each rule is a pure function of the build context. The engine
 * (engine.ts) iterates `allRules` and aggregates the issues + achievements.
 *
 * Rule ID format: `<STANDARD>.<NUMBER>.<SHORT>`
 *   - UPTIME: Uptime Institute Tier rules
 *   - TIA:    TIA-942
 *   - EN50:   EN 50600
 *   - ASHRAE: ASHRAE TC 9.9
 *   - NFPA:   NFPA 75 / 2001
 *   - POWER:  power-distribution rules (cross-standard)
 *   - COOL:   cooling rules
 *   - ESG:    efficiency / ESG rules
 *   - SEC:    security framework (5 functions + deterrence)
 *   - PRIV:   privacy / data sovereignty
 *   - ISO27:  ISO/IEC 27001
 */

import type { RuleContext, RatingBreakdown, Severity, Achievement } from '../engine';

export interface Issue {
  ruleId: string;
  severity: Severity;
  message: string;
  hint?: string;
  standard?: string;
  /** Block instance ids that triggered or fix the issue. */
  relatedBlocks?: string[];
  /** Optional: a deep-link to the policy key to toggle. */
  policyFix?: string;
}

export interface RuleResult {
  issues: Issue[];
  achievements: string[]; // achievement ids
}

export interface Rule {
  id: string;
  standard: string;
  axis: keyof RatingBreakdown;
  evaluate: (ctx: RuleContext) => RuleResult;
}

const ok: RuleResult = { issues: [], achievements: [] };
const noop = (): RuleResult => ok;

// Helper: small issue constructor
function i(
  ruleId: string,
  severity: Severity,
  message: string,
  opts: { hint?: string; standard?: string; relatedBlocks?: string[]; policyFix?: string } = {},
): Issue {
  return {
    ruleId,
    severity,
    message,
    hint: opts.hint,
    standard: opts.standard,
    relatedBlocks: opts.relatedBlocks,
    policyFix: opts.policyFix,
  };
}

// ----------------------------------------------------------------------------
// Uptime Tier rules
// ----------------------------------------------------------------------------

const uptimeRules: Rule[] = [
  {
    id: 'UPTIME.001.utility_present',
    standard: 'Uptime Tier I',
    axis: 'power',
    evaluate: (ctx) => ({
      issues: ctx.hasBlock('utility_feed')
        ? []
        : [i('UPTIME.001.utility_present', 'critical', 'No utility feed. Site has no power source.', { hint: 'Place a Utility Feed block from the Power category.', standard: 'Uptime Tier I' })],
      achievements: ctx.hasBlock('utility_feed') ? ['first_build'] : [],
    }),
  },
  {
    id: 'UPTIME.002.cooling_present',
    standard: 'Uptime Tier I',
    axis: 'cooling',
    evaluate: (ctx) => ({
      issues:
        ctx.countBlock('crac') + ctx.countBlock('in_row_cooling') + ctx.countBlock('cdu') === 0
          ? [i('UPTIME.002.cooling_present', 'critical', 'No cooling equipment. IT load will overheat.', { hint: 'Place at least one CRAC or in-row cooler.', standard: 'Uptime Tier I' })]
          : [],
      achievements: [],
    }),
  },
  {
    id: 'UPTIME.003.ups_present',
    standard: 'Uptime Tier II',
    axis: 'power',
    evaluate: (ctx) => ({
      issues: !ctx.hasBlock('ups')
        ? [i('UPTIME.003.ups_present', 'error', 'No UPS. Power blips will crash IT.', { hint: 'Add a UPS for ride-through.', standard: 'Uptime Tier II' })]
        : [],
      achievements: [],
    }),
  },
  {
    id: 'UPTIME.004.generator_present',
    standard: 'Uptime Tier III',
    axis: 'power',
    evaluate: (ctx) => ({
      issues: !ctx.hasBlock('generator')
        ? [i('UPTIME.004.generator_present', 'error', 'No backup generator. Utility outage = downtime.', { hint: 'Add a diesel generator (size for N+1).', standard: 'Uptime Tier III' })]
        : [],
      achievements: [],
    }),
  },
  {
    id: 'UPTIME.005.dual_utility',
    standard: 'Uptime Tier III',
    axis: 'redundancy',
    evaluate: (ctx) => {
      const n = ctx.countBlock('utility_feed');
      if (n < 2) {
        return {
          issues: [
            i('UPTIME.005.dual_utility', 'warn', 'Only one utility feed. Tier III+ requires two independent utility feeds.', {
              hint: 'Add a second utility feed from a separate substation.',
              standard: 'Uptime Tier III',
            }),
          ],
          achievements: [],
        };
      }
      return ok;
    },
  },
  {
    id: 'UPTIME.006.tier_iv_2n',
    standard: 'Uptime Tier IV',
    axis: 'redundancy',
    evaluate: (ctx) => {
      if (ctx.countBlock('ups') < 2 || ctx.countBlock('generator') < 2) {
        return {
          issues: [
            i(
              'UPTIME.006.tier_iv_2n',
              'info',
              'Tier IV requires 2N power (2× UPS, 2× generator).',
              { hint: 'Double the UPS and generator counts.', standard: 'Uptime Tier IV' },
            ),
          ],
          achievements: [],
        };
      }
      return { issues: [], achievements: ['tier_iv'] };
    },
  },
];

// ----------------------------------------------------------------------------
// Cooling rules
// ----------------------------------------------------------------------------

const coolingRules: Rule[] = [
  {
    id: 'COOL.001.heat_load',
    standard: 'ASHRAE TC 9.9',
    axis: 'cooling',
    evaluate: (ctx) => {
      const coolingCap = ctx.countBlock('crac') * 15 + ctx.countBlock('in_row_cooling') * 25 + ctx.countBlock('cdu') * 50 + ctx.countBlock('immersion_tank') * 100 + ctx.countBlock('rear_door_hec') * 10;
      if (ctx.totalHeatKW > coolingCap) {
        return {
          issues: [
            i(
              'COOL.001.heat_load',
              'error',
              `Heat load ${round(ctx.totalHeatKW, 1)} kW exceeds cooling capacity ${round(coolingCap, 1)} kW.`,
              { hint: 'Add more cooling or reduce IT density.', standard: 'ASHRAE A1' },
            ),
          ],
          achievements: [],
        };
      }
      return { issues: [], achievements: ctx.totalHeatKW > 0 ? ['hot_cold_aisle'] : [] };
    },
  },
  {
    id: 'COOL.002.gpu_liquid',
    standard: 'ASHRAE TC 9.9 H1',
    axis: 'cooling',
    evaluate: (ctx) => {
      const gpuCount = ctx.countBlock('gpu_pod');
      const liquidCount = ctx.countBlock('cdu') + ctx.countBlock('immersion_tank');
      if (gpuCount > 0 && liquidCount === 0) {
        return {
          issues: [
            i(
              'COOL.002.gpu_liquid',
              'error',
              `${gpuCount} GPU pod(s) require liquid cooling.`,
              { hint: 'Add a CDU or immersion tank.', standard: 'ASHRAE H1' },
            ),
          ],
          achievements: [],
        };
      }
      if (gpuCount > 0 && liquidCount > 0) return { issues: [], achievements: ['ai_native'] };
      return ok;
    },
  },
  {
    id: 'COOL.003.redundant',
    standard: 'Uptime Tier II',
    axis: 'cooling',
    evaluate: (ctx) => {
      const coolingCount = ctx.countBlock('crac') + ctx.countBlock('in_row_cooling') + ctx.countBlock('cdu');
      if (ctx.totalHeatKW > 0 && coolingCount < 2) {
        return {
          issues: [
            i('COOL.003.redundant', 'warn', 'Cooling is not redundant. A single cooler failure can overheat IT.', {
              hint: 'Add a redundant CRAC or in-row cooler (N+1).',
              standard: 'Uptime Tier II',
            }),
          ],
          achievements: [],
        };
      }
      return ok;
    },
  },
];

// ----------------------------------------------------------------------------
// Power rules
// ----------------------------------------------------------------------------

const powerRules: Rule[] = [
  {
    id: 'POWER.001.utility_to_transformer',
    standard: 'TIA-942',
    axis: 'power',
    evaluate: (ctx) => {
      if (ctx.hasBlock('transformer') && !ctx.hasBlock('utility_feed')) {
        return {
          issues: [i('POWER.001.utility_to_transformer', 'error', 'Transformer without utility feed.', { hint: 'Add a utility feed upstream.', standard: 'TIA-942' })],
          achievements: [],
        };
      }
      return ok;
    },
  },
  {
    id: 'POWER.002.it_has_pdu',
    standard: 'TIA-942',
    axis: 'power',
    evaluate: (ctx) => {
      const itCount = ctx.countCategory('it');
      const pduCount = ctx.countBlock('pdu');
      if (itCount > 0 && pduCount === 0) {
        return {
          issues: [
            i('POWER.002.it_has_pdu', 'warn', 'IT racks have no PDU.', { hint: 'Place at least one PDU per rack row.', standard: 'TIA-942' }),
          ],
          achievements: [],
        };
      }
      return ok;
    },
  },
  {
    id: 'POWER.003.it_has_network',
    standard: 'TIA-942',
    axis: 'redundancy',
    evaluate: (ctx) => {
      if (ctx.countCategory('it') > 0 && ctx.countBlock('tor_switch') === 0) {
        return {
          issues: [
            i('POWER.003.it_has_network', 'warn', 'IT racks have no ToR switch.', { hint: 'Add at least one Top-of-Rack switch.', standard: 'TIA-942' }),
          ],
          achievements: [],
        };
      }
      return ok;
    },
  },
  {
    id: 'POWER.004.sdn_orchestration',
    standard: 'ISO 27001 A.8',
    axis: 'redundancy',
    evaluate: (ctx) => {
      if (ctx.countCategory('it') > 4 && !ctx.hasBlock('sdn_controller')) {
        return {
          issues: [
            i('POWER.004.sdn_orchestration', 'info', 'Larger fabrics benefit from an SDN controller.', { hint: 'Add an SDN controller for orchestration.', standard: 'ISO 27001 A.8' }),
          ],
          achievements: [],
        };
      }
      if (ctx.hasBlock('sdn_controller') && ctx.hasBlock('hypervisor_node') && ctx.hasBlock('waf_node')) {
        return { issues: [], achievements: ['sd_ready'] };
      }
      return ok;
    },
  },
];

// ----------------------------------------------------------------------------
// NFPA / safety rules
// ----------------------------------------------------------------------------

const nfpaRules: Rule[] = [
  {
    id: 'NFPA.001.vesda_coverage',
    standard: 'NFPA 75',
    axis: 'safety',
    evaluate: (ctx) => {
      if (ctx.countCategory('it') > 0 && !ctx.hasBlock('vesda')) {
        return {
          issues: [i('NFPA.001.vesda_coverage', 'error', 'IT area has no VESDA smoke detection.', { hint: 'Place VESDA sensors throughout the data hall.', standard: 'NFPA 75' })],
          achievements: [],
        };
      }
      return ok;
    },
  },
  {
    id: 'NFPA.002.epo_reachable',
    standard: 'NFPA 75',
    axis: 'safety',
    evaluate: (ctx) => {
      if (ctx.countCategory('it') > 0 && !ctx.hasBlock('epo_button')) {
        return {
          issues: [i('NFPA.002.epo_reachable', 'error', 'No EPO button. Staff cannot cut power in emergency.', { hint: 'Place EPO buttons at exits.', standard: 'NFPA 75' })],
          achievements: [],
        };
      }
      return ok;
    },
  },
  {
    id: 'NFPA.003.fire_panel',
    standard: 'NFPA 75',
    axis: 'safety',
    evaluate: (ctx) => {
      if (ctx.hasBlock('vesda') && !ctx.hasBlock('fire_panel')) {
        return {
          issues: [i('NFPA.003.fire_panel', 'warn', 'VESDA without fire panel — alarms go nowhere.', { hint: 'Add a fire panel to monitor VESDA.', standard: 'NFPA 75' })],
          achievements: [],
        };
      }
      return ok;
    },
  },
  {
    id: 'NFPA.004.clean_agent',
    standard: 'NFPA 2001',
    axis: 'safety',
    evaluate: (ctx) => {
      if (ctx.countCategory('it') > 0 && !ctx.hasBlock('fm200_nozzle')) {
        return {
          issues: [i('NFPA.004.clean_agent', 'error', 'No clean agent suppression (FM-200 / Novec 1230).', { hint: 'Add FM-200 nozzles throughout the data hall.', standard: 'NFPA 2001' })],
          achievements: [],
        };
      }
      return ok;
    },
  },
  {
    id: 'NFPA.005.fire_drill_achievement',
    standard: 'NFPA 75',
    axis: 'safety',
    evaluate: (ctx) => {
      if (ctx.hasBlock('vesda') && ctx.hasBlock('fm200_nozzle') && ctx.hasBlock('epo_button') && ctx.hasBlock('fire_wall')) {
        return { issues: [], achievements: ['fire_drilled'] };
      }
      return ok;
    },
  },
];

// ----------------------------------------------------------------------------
// ESG rules
// ----------------------------------------------------------------------------

const esgRules: Rule[] = [
  {
    id: 'ESG.001.pue_target',
    standard: 'EU EED / DE EnEfG / CN',
    axis: 'efficiency',
    evaluate: (ctx) => {
      const target = (ctx.policies['esg.pue_target'] as number) ?? 2.0;
      if (ctx.totalITLoadKW === 0) return ok;
      // estimate PUE
      const cooling = ctx.countBlock('crac') * 5 + ctx.countBlock('in_row_cooling') * 4 + ctx.countBlock('cdu') * 2;
      const baseOverhead = 1.1;
      const coolingOverhead = Math.max(1, cooling / Math.max(1, ctx.totalITLoadKW)) * 0.3;
      const pue = baseOverhead + coolingOverhead;
      if (pue > target) {
        return {
          issues: [
            i('ESG.001.pue_target', 'warn', `Estimated PUE ${round(pue, 2)} exceeds target ${round(target, 2)}.`, {
              hint: 'Reduce cooling overhead or improve IT utilization.',
              standard: 'EU EED recast 2023',
            }),
          ],
          achievements: [],
        };
      }
      if (pue < 1.2) return { issues: [], achievements: ['pue_1_2'] };
      if (pue < 1.3 && (ctx.policies['esg.renewable_percent'] as number) >= 50) {
        return { issues: [], achievements: ['carbon_aware'] };
      }
      return ok;
    },
  },
  {
    id: 'ESG.002.heat_recovery',
    standard: 'EU EED 2025 (≥1MW)',
    axis: 'efficiency',
    evaluate: (ctx) => {
      if (ctx.totalFacilityPowerKW >= 1000 && !ctx.policies['esg.heat_recovery_enabled']) {
        return {
          issues: [
            i('ESG.002.heat_recovery', 'error', 'Heat recovery required for sites ≥ 1 MW (EU EED).', {
              hint: 'Enable heat recovery in the ESG policy.',
              standard: 'EU EED 2023/1791',
              policyFix: 'esg.heat_recovery_enabled',
            }),
          ],
          achievements: [],
        };
      }
      return ok;
    },
  },
  {
    id: 'ESG.003.renewable',
    standard: 'Germany EnEfG 2027',
    axis: 'efficiency',
    evaluate: (ctx) => {
      const pct = (ctx.policies['esg.renewable_percent'] as number) ?? 0;
      if (ctx.totalFacilityPowerKW > 0 && pct < 50) {
        return {
          issues: [
            i('ESG.003.renewable', 'warn', `Renewable share ${pct}% is below 50% target.`, {
              hint: 'Increase renewable share in ESG policy.',
              standard: 'DE EnEfG 2027',
              policyFix: 'esg.renewable_percent',
            }),
          ],
          achievements: [],
        };
      }
      return ok;
    },
  },
];

// ----------------------------------------------------------------------------
// Security framework (5 functions + deterrence)
// ----------------------------------------------------------------------------

const securityRules: Rule[] = [
  {
    id: 'SEC.001.preventive_mantrap',
    standard: 'EN 50600-2-5 / ISO 27001 A.7',
    axis: 'security',
    evaluate: (ctx) =>
      ctx.policies['preventive.mantrap'] || ctx.hasBlock('mantrap')
        ? ok
        : { issues: [i('SEC.001.preventive_mantrap', 'warn', 'No mantrap / security portal.', { hint: 'Enable mantrap in Preventive controls.', standard: 'ISO 27001 A.7', policyFix: 'preventive.mantrap' })], achievements: [] },
  },
  {
    id: 'SEC.002.preventive_mfa',
    standard: 'NIST 800-63',
    axis: 'security',
    evaluate: (ctx) =>
      ctx.policies['preventive.mfa'] || ctx.hasBlock('mfa_reader')
        ? ok
        : { issues: [i('SEC.002.preventive_mfa', 'warn', 'No MFA enabled.', { hint: 'Enable MFA in Preventive controls.', policyFix: 'preventive.mfa' })], achievements: [] },
  },
  {
    id: 'SEC.003.detective_siem',
    standard: 'ISO 27001 A.8',
    axis: 'security',
    evaluate: (ctx) =>
      ctx.policies['detective.siem_correlation'] || ctx.hasBlock('siem_collector')
        ? ok
        : { issues: [i('SEC.003.detective_siem', 'warn', 'No SIEM correlation.', { hint: 'Enable SIEM correlation in Detective controls.', policyFix: 'detective.siem_correlation' })], achievements: [] },
  },
  {
    id: 'SEC.004.corrective_auto_isolate',
    standard: 'NIST CSF',
    axis: 'security',
    evaluate: (ctx) =>
      ctx.policies['corrective.auto_isolate'] || ctx.hasBlock('firewall')
        ? ok
        : { issues: [i('SEC.004.corrective_auto_isolate', 'info', 'No auto-isolation on malware detection.', { hint: 'Enable auto-isolation in Corrective controls.', policyFix: 'corrective.auto_isolate' })], achievements: [] },
  },
  {
    id: 'SEC.005.recovery_immutable',
    standard: 'NIST CSF RC',
    axis: 'security',
    evaluate: (ctx) =>
      ctx.policies['recovery.immutable_backups'] || ctx.hasBlock('immutable_backup_vault')
        ? ok
        : { issues: [i('SEC.005.recovery_immutable', 'error', 'No immutable backup. Ransomware risk.', { hint: 'Enable immutable backups in Recovery controls.', policyFix: 'recovery.immutable_backups' })], achievements: [] },
  },
  {
    id: 'SEC.006.deterrence_physical',
    standard: 'Physical Deterrence',
    axis: 'security',
    evaluate: (ctx) => {
      const enabled =
        ctx.policies['physical.cctv_visible'] ||
        ctx.policies['physical.warning_signs'] ||
        ctx.policies['physical.bollards'] ||
        ctx.policies['physical.barbed_wire'] ||
        ctx.policies['physical.lighting_24x7'] ||
        ctx.policies['physical.guard_patrols'] ||
        ctx.hasBlock('cctv_camera') ||
        ctx.hasBlock('security_light') ||
        ctx.hasBlock('warning_sign');
      return enabled
        ? ok
        : { issues: [i('SEC.006.deterrence_physical', 'warn', 'No physical deterrents enabled.', { hint: 'Enable CCTV, signs, bollards, lighting, or guards in Physical Deterrence.', policyFix: 'physical.cctv_visible' })], achievements: [] };
    },
  },
  {
    id: 'SEC.007.deterrence_logical',
    standard: 'Logical Deterrence',
    axis: 'security',
    evaluate: (ctx) => {
      const enabled =
        ctx.policies['logical.login_banner'] ||
        ctx.policies['logical.honeypots'] ||
        ctx.policies['logical.rate_limiting'] ||
        ctx.policies['logical.tarpitting'] ||
        ctx.policies['logical.waf_visible'] ||
        ctx.hasBlock('honeypot') ||
        ctx.hasBlock('waf_node');
      return enabled
        ? ok
        : { issues: [i('SEC.007.deterrence_logical', 'info', 'No logical deterrents enabled.', { hint: 'Enable banner, honeypots, rate limiting in Logical Deterrence.', policyFix: 'logical.login_banner' })], achievements: [] };
    },
  },
  {
    id: 'SEC.008.deterrence_admin',
    standard: 'Administrative Deterrence',
    axis: 'security',
    evaluate: (ctx) => {
      const enabled =
        ctx.policies['admin.aup_signed'] ||
        ctx.policies['admin.nda_enforced'] ||
        ctx.policies['admin.sanctions_policy'] ||
        ctx.policies['admin.security_training'];
      return enabled
        ? ok
        : { issues: [i('SEC.008.deterrence_admin', 'info', 'No administrative deterrents enabled.', { hint: 'Enable AUP, NDA, sanctions, training in Administrative Deterrence.', policyFix: 'admin.aup_signed' })], achievements: [] };
    },
  },
  {
    id: 'SEC.009.deterrence_full',
    standard: 'All 3 Deterrence',
    axis: 'security',
    evaluate: (ctx) => {
      const phys = ctx.policies['physical.cctv_visible'] || ctx.hasBlock('cctv_camera');
      const log = ctx.policies['logical.login_banner'] || ctx.hasBlock('waf_node');
      const adm = ctx.policies['admin.aup_signed'];
      if (phys && log && adm) return { issues: [], achievements: ['deterrence_max'] };
      return ok;
    },
  },
  {
    id: 'SEC.010.zero_trust',
    standard: 'Zero Trust',
    axis: 'security',
    evaluate: (ctx) => {
      if (
        ctx.policies['preventive.zero_trust'] &&
        ctx.policies['preventive.micro_segmentation'] &&
        (ctx.policies['compensating.bastion_only'] || ctx.hasBlock('bastion_host'))
      ) {
        return { issues: [], achievements: ['zero_trust'] };
      }
      return ok;
    },
  },
  {
    id: 'SEC.011.perim_locked',
    standard: 'Perimeter Lockdown',
    axis: 'security',
    evaluate: (ctx) => {
      const mantrap = ctx.policies['preventive.mantrap'] || ctx.hasBlock('mantrap');
      const bio = ctx.policies['preventive.biometric'] || ctx.hasBlock('biometric_scanner');
      const cctv = ctx.policies['physical.cctv_visible'] || ctx.hasBlock('cctv_camera');
      const light = ctx.policies['physical.lighting_24x7'] || ctx.hasBlock('security_light');
      const guard = ctx.policies['physical.guard_patrols'];
      if (mantrap && bio && cctv && light && guard) return { issues: [], achievements: ['perim_locked'] };
      return ok;
    },
  },
  {
    id: 'SEC.012.defense_in_depth',
    standard: '5-Function Coverage',
    axis: 'security',
    evaluate: (ctx) => {
      const p = ctx.policies['preventive.mfa'] || ctx.hasBlock('mfa_reader');
      const d = ctx.policies['detective.siem_correlation'] || ctx.hasBlock('siem_collector');
      const c = ctx.policies['corrective.auto_isolate'];
      const r = ctx.policies['recovery.immutable_backups'] || ctx.hasBlock('immutable_backup_vault');
      const co = ctx.policies['compensating.air_gap_ot'] || ctx.policies['compensating.bastion_only'];
      if (p && d && c && r && co) return { issues: [], achievements: ['defense_in_depth'] };
      return ok;
    },
  },
  {
    id: 'SEC.013.immutable_recovery',
    standard: 'Recovery Excellence',
    axis: 'security',
    evaluate: (ctx) => {
      const immut = ctx.policies['recovery.immutable_backups'] || ctx.hasBlock('immutable_backup_vault');
      const iac = ctx.policies['recovery.iac_recovery'];
      const dr = (ctx.policies['recovery.dr_site'] as string) !== 'none';
      if (immut && iac && dr) return { issues: [], achievements: ['immutable_forever'] };
      return ok;
    },
  },
];

// ----------------------------------------------------------------------------
// Privacy rules
// ----------------------------------------------------------------------------

const privacyRules: Rule[] = [
  {
    id: 'PRIV.001.encryption',
    standard: 'ISO 27001 A.10 / GDPR Art.32',
    axis: 'security',
    evaluate: (ctx) => {
      if (ctx.countCategory('it') > 0) {
        const e1 = ctx.policies['privacy.encryption_at_rest'];
        const e2 = ctx.policies['privacy.encryption_in_transit'];
        if (!e1 || !e2) {
          return {
            issues: [i('PRIV.001.encryption', 'error', 'Encryption at rest and in transit are both required.', { hint: 'Enable both in Privacy policy.', policyFix: 'privacy.encryption_at_rest' })],
            achievements: [],
          };
        }
      }
      return ok;
    },
  },
  {
    id: 'PRIV.002.gdpr',
    standard: 'GDPR',
    axis: 'security',
    evaluate: (ctx) => {
      if (ctx.policies['privacy.data_residency'] === 'eu' && !ctx.policies['privacy.gdpr_consent']) {
        return {
          issues: [i('PRIV.002.gdpr', 'error', 'EU residency without GDPR consent.', { hint: 'Enable GDPR consent.', policyFix: 'privacy.gdpr_consent' })],
          achievements: [],
        };
      }
      return ok;
    },
  },
  {
    id: 'PRIV.003.dpia',
    standard: 'GDPR Art.35',
    axis: 'security',
    evaluate: (ctx) => {
      if (ctx.countCategory('it') > 0 && !ctx.policies['privacy.dpia_completed']) {
        return {
          issues: [i('PRIV.003.dpia', 'info', 'DPIA recommended when processing personal data.', { hint: 'Complete DPIA.', policyFix: 'privacy.dpia_completed' })],
          achievements: [],
        };
      }
      return ok;
    },
  },
];

// ----------------------------------------------------------------------------
// All rules
// ----------------------------------------------------------------------------

export const allRules: Rule[] = [
  ...uptimeRules,
  ...coolingRules,
  ...powerRules,
  ...nfpaRules,
  ...esgRules,
  ...securityRules,
  ...privacyRules,
];

function round(n: number, d: number) {
  const m = Math.pow(10, d);
  return Math.round(n * m) / m;
}
