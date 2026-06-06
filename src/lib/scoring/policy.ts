/**
 * Policy state.
 *
 * Represents the non-3D security and ESG controls that the user toggles
 * in the policy panel. These are evaluated by the scoring engine alongside
 * the 3D block placement.
 *
 * The taxonomy follows the brief:
 *  - 3 deterrence types: physical, logical, administrative
 *  - 5 security functions: preventive, detective, corrective, recovery, compensating
 *  - Privacy (data sovereignty, encryption)
 *  - ESG (PUE/WUE, renewables, heat recovery)
 */

import { z } from 'zod';

export const PolicyKeySchema = z.enum([
  // Physical deterrence
  'physical.cctv_visible',
  'physical.warning_signs',
  'physical.bollards',
  'physical.barbed_wire',
  'physical.lighting_24x7',
  'physical.guard_patrols',
  // Logical deterrence
  'logical.login_banner',
  'logical.honeypots',
  'logical.rate_limiting',
  'logical.tarpitting',
  'logical.waf_visible',
  // Administrative deterrence
  'admin.aup_signed',
  'admin.nda_enforced',
  'admin.sanctions_policy',
  'admin.security_training',
  // Preventive (5-function)
  'preventive.mantrap',
  'preventive.mfa',
  'preventive.biometric',
  'preventive.cabinet_locks',
  'preventive.firewall',
  'preventive.micro_segmentation',
  'preventive.zero_trust',
  'preventive.edr',
  // Detective
  'detective.intrusion_sensors',
  'detective.environmental_sensors',
  'detective.siem_correlation',
  'detective.file_integrity_monitoring',
  // Corrective
  'corrective.auto_fire_suppression',
  'corrective.auto_cooling_adjust',
  'corrective.auto_isolate',
  'corrective.ips_auto_drop',
  'corrective.patching_cadence_days',
  // Recovery
  'recovery.dr_site',
  'recovery.rto_hours',
  'recovery.rpo_hours',
  'recovery.immutable_backups',
  'recovery.iac_recovery',
  // Compensating
  'compensating.air_gap_ot',
  'compensating.manual_patrols',
  'compensating.bastion_only',
  // Privacy
  'privacy.data_residency',
  'privacy.encryption_at_rest',
  'privacy.encryption_in_transit',
  'privacy.gdpr_consent',
  'privacy.dpia_completed',
  // ESG
  'esg.heat_recovery_enabled',
  'esg.renewable_percent',
  'esg.pue_target',
  'esg.wue_target',
]);

export type PolicyKey = z.infer<typeof PolicyKeySchema>;

/** A single policy toggle. */
export type PolicyValue = boolean | number | string;

export type PolicyState = Record<PolicyKey, PolicyValue>;

/** Default policy state. All physical/technical controls default OFF. */
export function defaultPolicyState(): PolicyState {
  return {
    // Physical deterrence
    'physical.cctv_visible': false,
    'physical.warning_signs': false,
    'physical.bollards': false,
    'physical.barbed_wire': false,
    'physical.lighting_24x7': false,
    'physical.guard_patrols': false,
    // Logical deterrence
    'logical.login_banner': false,
    'logical.honeypots': false,
    'logical.rate_limiting': false,
    'logical.tarpitting': false,
    'logical.waf_visible': false,
    // Administrative deterrence
    'admin.aup_signed': false,
    'admin.nda_enforced': false,
    'admin.sanctions_policy': false,
    'admin.security_training': false,
    // Preventive
    'preventive.mantrap': false,
    'preventive.mfa': false,
    'preventive.biometric': false,
    'preventive.cabinet_locks': false,
    'preventive.firewall': false,
    'preventive.micro_segmentation': false,
    'preventive.zero_trust': false,
    'preventive.edr': false,
    // Detective
    'detective.intrusion_sensors': false,
    'detective.environmental_sensors': false,
    'detective.siem_correlation': false,
    'detective.file_integrity_monitoring': false,
    // Corrective
    'corrective.auto_fire_suppression': false,
    'corrective.auto_cooling_adjust': false,
    'corrective.auto_isolate': false,
    'corrective.ips_auto_drop': false,
    'corrective.patching_cadence_days': 30,
    // Recovery
    'recovery.dr_site': 'none', // 'none' | 'cold' | 'warm' | 'hot'
    'recovery.rto_hours': 24,
    'recovery.rpo_hours': 24,
    'recovery.immutable_backups': false,
    'recovery.iac_recovery': false,
    // Compensating
    'compensating.air_gap_ot': false,
    'compensating.manual_patrols': false,
    'compensating.bastion_only': false,
    // Privacy
    'privacy.data_residency': 'none', // 'none' | 'eu' | 'us' | 'cn' | 'sg'
    'privacy.encryption_at_rest': false,
    'privacy.encryption_in_transit': false,
    'privacy.gdpr_consent': false,
    'privacy.dpia_completed': false,
    // ESG
    'esg.heat_recovery_enabled': false,
    'esg.renewable_percent': 0,
    'esg.pue_target': 2.0,
    'esg.wue_target': 2.0,
  };
}

/** Groupings for the policy panel UI. */
export const POLICY_GROUPS: Array<{
  id: string;
  label: string;
  description: string;
  keys: PolicyKey[];
}> = [
  {
    id: 'deterrence-physical',
    label: 'Physical Deterrence',
    description: 'Visible measures that discourage intrusion attempts.',
    keys: [
      'physical.cctv_visible',
      'physical.warning_signs',
      'physical.bollards',
      'physical.barbed_wire',
      'physical.lighting_24x7',
      'physical.guard_patrols',
    ],
  },
  {
    id: 'deterrence-logical',
    label: 'Logical Deterrence',
    description: 'Cyber-side signals that raise attacker cost.',
    keys: [
      'logical.login_banner',
      'logical.honeypots',
      'logical.rate_limiting',
      'logical.tarpitting',
      'logical.waf_visible',
    ],
  },
  {
    id: 'deterrence-admin',
    label: 'Administrative Deterrence',
    description: 'Policy-level deterrents focused on insider threats.',
    keys: [
      'admin.aup_signed',
      'admin.nda_enforced',
      'admin.sanctions_policy',
      'admin.security_training',
    ],
  },
  {
    id: 'preventive',
    label: 'Preventive',
    description: 'Stop incidents from happening.',
    keys: [
      'preventive.mantrap',
      'preventive.mfa',
      'preventive.biometric',
      'preventive.cabinet_locks',
      'preventive.firewall',
      'preventive.micro_segmentation',
      'preventive.zero_trust',
      'preventive.edr',
    ],
  },
  {
    id: 'detective',
    label: 'Detective',
    description: 'Find incidents quickly.',
    keys: [
      'detective.intrusion_sensors',
      'detective.environmental_sensors',
      'detective.siem_correlation',
      'detective.file_integrity_monitoring',
    ],
  },
  {
    id: 'corrective',
    label: 'Corrective',
    description: 'Limit damage once an incident is detected.',
    keys: [
      'corrective.auto_fire_suppression',
      'corrective.auto_cooling_adjust',
      'corrective.auto_isolate',
      'corrective.ips_auto_drop',
      'corrective.patching_cadence_days',
    ],
  },
  {
    id: 'recovery',
    label: 'Recovery',
    description: 'Restore operations after an incident.',
    keys: [
      'recovery.dr_site',
      'recovery.rto_hours',
      'recovery.rpo_hours',
      'recovery.immutable_backups',
      'recovery.iac_recovery',
    ],
  },
  {
    id: 'compensating',
    label: 'Compensating',
    description: 'When best-practice controls are not feasible.',
    keys: [
      'compensating.air_gap_ot',
      'compensating.manual_patrols',
      'compensating.bastion_only',
    ],
  },
  {
    id: 'privacy',
    label: 'Privacy & Data Sovereignty',
    description: 'GDPR, CCPA, PDPA, PIPL controls.',
    keys: [
      'privacy.data_residency',
      'privacy.encryption_at_rest',
      'privacy.encryption_in_transit',
      'privacy.gdpr_consent',
      'privacy.dpia_completed',
    ],
  },
  {
    id: 'esg',
    label: 'ESG & Efficiency',
    description: 'PUE, WUE, renewables, heat recovery. EU EED / SG DIA / DE EnEfG / CN standards.',
    keys: [
      'esg.heat_recovery_enabled',
      'esg.renewable_percent',
      'esg.pue_target',
      'esg.wue_target',
    ],
  },
];

/** Friendly labels for individual policies. */
export const POLICY_LABELS: Record<PolicyKey, { label: string; help?: string }> = {
  'physical.cctv_visible': { label: 'Visible CCTV cameras', help: 'NFPA 75, EN 50600-2-5' },
  'physical.warning_signs': { label: 'Warning signs at perimeter' },
  'physical.bollards': { label: 'Anti-ram bollards' },
  'physical.barbed_wire': { label: 'Barbed wire on fence' },
  'physical.lighting_24x7': { label: '24/7 security lighting' },
  'physical.guard_patrols': { label: 'Regular guard patrols' },

  'logical.login_banner': { label: 'Legal warning banner on all logins' },
  'logical.honeypots': { label: 'Honeypots in the network' },
  'logical.rate_limiting': { label: 'Rate limiting on auth endpoints' },
  'logical.tarpitting': { label: 'Tarpitting on suspicious connections' },
  'logical.waf_visible': { label: 'WAF/DDoS protection visibly advertised' },

  'admin.aup_signed': { label: 'Acceptable Use Policy signed by all staff' },
  'admin.nda_enforced': { label: 'NDA enforced for all data handlers' },
  'admin.sanctions_policy': { label: 'Documented sanctions policy' },
  'admin.security_training': { label: 'Annual security awareness training' },

  'preventive.mantrap': { label: 'Mantrap / security portal' },
  'preventive.mfa': { label: 'Multi-factor authentication' },
  'preventive.biometric': { label: 'Biometric access for data hall' },
  'preventive.cabinet_locks': { label: 'Per-rack electronic locks' },
  'preventive.firewall': { label: 'Network firewall at perimeter' },
  'preventive.micro_segmentation': { label: 'Micro-segmentation between workloads' },
  'preventive.zero_trust': { label: 'Zero-trust architecture' },
  'preventive.edr': { label: 'EDR on all endpoints' },

  'detective.intrusion_sensors': { label: 'Physical intrusion sensors' },
  'detective.environmental_sensors': { label: 'Environmental sensors (temp, humidity, leak)' },
  'detective.siem_correlation': { label: 'SIEM with correlation rules' },
  'detective.file_integrity_monitoring': { label: 'File integrity monitoring' },

  'corrective.auto_fire_suppression': { label: 'Auto fire suppression on alarm' },
  'corrective.auto_cooling_adjust': { label: 'Auto CRAC ramp on hot spots' },
  'corrective.auto_isolate': { label: 'Auto network isolation on malware' },
  'corrective.ips_auto_drop': { label: 'IPS auto-drop on detection' },
  'corrective.patching_cadence_days': { label: 'Patching cadence (days)' },

  'recovery.dr_site': { label: 'DR site tier' },
  'recovery.rto_hours': { label: 'RTO target (hours)' },
  'recovery.rpo_hours': { label: 'RPO target (hours)' },
  'recovery.immutable_backups': { label: 'Immutable / WORM backups' },
  'recovery.iac_recovery': { label: 'Infrastructure-as-code recovery' },

  'compensating.air_gap_ot': { label: 'Air-gap OT / ICS network' },
  'compensating.manual_patrols': { label: 'Augmented manual patrols' },
  'compensating.bastion_only': { label: 'Bastion-only access to legacy systems' },

  'privacy.data_residency': { label: 'Data residency region' },
  'privacy.encryption_at_rest': { label: 'Encryption at rest' },
  'privacy.encryption_in_transit': { label: 'Encryption in transit' },
  'privacy.gdpr_consent': { label: 'GDPR-style consent' },
  'privacy.dpia_completed': { label: 'DPIA completed' },

  'esg.heat_recovery_enabled': { label: 'Heat recovery enabled' },
  'esg.renewable_percent': { label: 'Renewable energy %' },
  'esg.pue_target': { label: 'PUE target' },
  'esg.wue_target': { label: 'WUE target' },
};
