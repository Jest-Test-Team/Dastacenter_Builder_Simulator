/**
 * Pre-built demo builds.
 *
 * Three curated builds that showcase the simulator's capabilities.
 * Each is a valid BuildSnapshot that can be loaded directly or
 * shared via URL (using the existing share-token encoder).
 */

import type { BuildSnapshot } from '@/lib/store/build-store';
import type { PolicyState } from '@/lib/scoring/policy';
import { nanoid } from 'nanoid';

function ts(daysAgo: number): number {
  return Date.now() - daysAgo * 86_400_000;
}

const FULL_POLICY: PolicyState = {
  'physical.cctv_visible': true,
  'physical.warning_signs': true,
  'physical.bollards': true,
  'physical.barbed_wire': true,
  'physical.lighting_24x7': true,
  'physical.guard_patrols': true,
  'logical.login_banner': true,
  'logical.honeypots': true,
  'logical.rate_limiting': true,
  'logical.tarpitting': true,
  'logical.waf_visible': true,
  'admin.aup_signed': true,
  'admin.nda_enforced': true,
  'admin.sanctions_policy': true,
  'admin.security_training': true,
  'preventive.mantrap': true,
  'preventive.mfa': true,
  'preventive.biometric': true,
  'preventive.cabinet_locks': true,
  'preventive.firewall': true,
  'preventive.micro_segmentation': true,
  'preventive.zero_trust': true,
  'preventive.edr': true,
  'detective.intrusion_sensors': true,
  'detective.environmental_sensors': true,
  'detective.siem_correlation': true,
  'detective.file_integrity_monitoring': true,
  'corrective.auto_fire_suppression': true,
  'corrective.auto_cooling_adjust': true,
  'corrective.auto_isolate': true,
  'corrective.ips_auto_drop': true,
  'corrective.patching_cadence_days': 7,
  'recovery.dr_site': 'hot',
  'recovery.rto_hours': 1,
  'recovery.rpo_hours': 1,
  'recovery.immutable_backups': true,
  'recovery.iac_recovery': true,
  'compensating.air_gap_ot': true,
  'compensating.manual_patrols': true,
  'compensating.bastion_only': true,
  'privacy.data_residency': 'eu',
  'privacy.encryption_at_rest': true,
  'privacy.encryption_in_transit': true,
  'privacy.gdpr_consent': true,
  'privacy.dpia_completed': true,
  'esg.heat_recovery_enabled': true,
  'esg.renewable_percent': 80,
  'esg.pue_target': 1.2,
  'esg.wue_target': 0.5,
};

const MINIMAL_POLICY: PolicyState = {
  'physical.cctv_visible': true,
  'physical.warning_signs': true,
  'physical.bollards': false,
  'physical.barbed_wire': false,
  'physical.lighting_24x7': true,
  'physical.guard_patrols': false,
  'logical.login_banner': true,
  'logical.honeypots': false,
  'logical.rate_limiting': true,
  'logical.tarpitting': false,
  'logical.waf_visible': false,
  'admin.aup_signed': true,
  'admin.nda_enforced': false,
  'admin.sanctions_policy': false,
  'admin.security_training': false,
  'preventive.mantrap': false,
  'preventive.mfa': true,
  'preventive.biometric': false,
  'preventive.cabinet_locks': false,
  'preventive.firewall': true,
  'preventive.micro_segmentation': false,
  'preventive.zero_trust': false,
  'preventive.edr': false,
  'detective.intrusion_sensors': true,
  'detective.environmental_sensors': true,
  'detective.siem_correlation': false,
  'detective.file_integrity_monitoring': false,
  'corrective.auto_fire_suppression': true,
  'corrective.auto_cooling_adjust': false,
  'corrective.auto_isolate': false,
  'corrective.ips_auto_drop': false,
  'corrective.patching_cadence_days': 30,
  'recovery.dr_site': 'none',
  'recovery.rto_hours': 24,
  'recovery.rpo_hours': 24,
  'recovery.immutable_backups': false,
  'recovery.iac_recovery': false,
  'compensating.air_gap_ot': false,
  'compensating.manual_patrols': false,
  'compensating.bastion_only': false,
  'privacy.data_residency': 'none',
  'privacy.encryption_at_rest': false,
  'privacy.encryption_in_transit': true,
  'privacy.gdpr_consent': false,
  'privacy.dpia_completed': false,
  'esg.heat_recovery_enabled': false,
  'esg.renewable_percent': 0,
  'esg.pue_target': 2.0,
  'esg.wue_target': 2.0,
};

/**
 * Demo 1: Greenfield Tier III — a clean, well-designed colocation hall.
 * Targets Uptime Tier III with good PUE.
 */
const GREENFIELD_TIER3: BuildSnapshot = {
  buildId: 'demo-greenfield-t3',
  name: 'Greenfield Tier III Colocation',
  scenarioId: 'greenfield',
  voxels: {
    'gf-01': { id: 'gf-01', type: 'utility_feed', position: { x: 0, y: 0, z: 0 }, rotation: 0, metadata: {} },
    'gf-02': { id: 'gf-02', type: 'transformer', position: { x: 2, y: 0, z: 0 }, rotation: 0, metadata: {} },
    'gf-03': { id: 'gf-03', type: 'transformer', position: { x: 4, y: 0, z: 0 }, rotation: 0, metadata: {} },
    'gf-04': { id: 'gf-04', type: 'switchgear', position: { x: 6, y: 0, z: 0 }, rotation: 0, metadata: {} },
    'gf-05': { id: 'gf-05', type: 'ups', position: { x: 8, y: 0, z: 0 }, rotation: 0, metadata: {} },
    'gf-06': { id: 'gf-06', type: 'ups', position: { x: 10, y: 0, z: 0 }, rotation: 0, metadata: {} },
    'gf-07': { id: 'gf-07', type: 'generator', position: { x: 12, y: 0, z: 0 }, rotation: 0, metadata: {} },
    'gf-08': { id: 'gf-08', type: 'generator', position: { x: 14, y: 0, z: 0 }, rotation: 0, metadata: {} },
    'gf-09': { id: 'gf-09', type: 'crac', position: { x: 0, y: 0, z: 8 }, rotation: 0, metadata: {} },
    'gf-10': { id: 'gf-10', type: 'crac', position: { x: 0, y: 0, z: 10 }, rotation: 0, metadata: {} },
    'gf-11': { id: 'gf-11', type: 'crac', position: { x: 0, y: 0, z: 12 }, rotation: 0, metadata: {} },
    'gf-12': { id: 'gf-12', type: 'in_row_cooling', position: { x: 6, y: 0, z: 8 }, rotation: 0, metadata: {} },
    'gf-13': { id: 'gf-13', type: 'in_row_cooling', position: { x: 6, y: 0, z: 12 }, rotation: 0, metadata: {} },
    'gf-14': { id: 'gf-14', type: 'server_rack', position: { x: 8, y: 0, z: 8 }, rotation: 0, metadata: {} },
    'gf-15': { id: 'gf-15', type: 'server_rack', position: { x: 8, y: 0, z: 10 }, rotation: 0, metadata: {} },
    'gf-16': { id: 'gf-16', type: 'server_rack', position: { x: 8, y: 0, z: 12 }, rotation: 0, metadata: {} },
    'gf-17': { id: 'gf-17', type: 'server_rack', position: { x: 12, y: 0, z: 8 }, rotation: 0, metadata: {} },
    'gf-18': { id: 'gf-18', type: 'server_rack', position: { x: 12, y: 0, z: 10 }, rotation: 0, metadata: {} },
    'gf-19': { id: 'gf-19', type: 'server_rack', position: { x: 12, y: 0, z: 12 }, rotation: 0, metadata: {} },
    'gf-20': { id: 'gf-20', type: 'tor_switch', position: { x: 8, y: 2, z: 8 }, rotation: 0, metadata: {} },
    'gf-21': { id: 'gf-21', type: 'tor_switch', position: { x: 8, y: 2, z: 12 }, rotation: 0, metadata: {} },
    'gf-22': { id: 'gf-22', type: 'pdu', position: { x: 7, y: 0, z: 8 }, rotation: 0, metadata: {} },
    'gf-23': { id: 'gf-23', type: 'pdu', position: { x: 7, y: 0, z: 12 }, rotation: 0, metadata: {} },
    'gf-24': { id: 'gf-24', type: 'vesda', position: { x: 10, y: 3, z: 10 }, rotation: 0, metadata: {} },
    'gf-25': { id: 'gf-25', type: 'fire_panel', position: { x: 16, y: 0, z: 0 }, rotation: 0, metadata: {} },
    'gf-26': { id: 'gf-26', type: 'fm200_nozzle', position: { x: 9, y: 3, z: 9 }, rotation: 0, metadata: {} },
    'gf-27': { id: 'gf-27', type: 'fm200_nozzle', position: { x: 9, y: 3, z: 11 }, rotation: 0, metadata: {} },
    'gf-28': { id: 'gf-28', type: 'epo_button', position: { x: 16, y: 1, z: 0 }, rotation: 0, metadata: {} },
    'gf-29': { id: 'gf-29', type: 'perimeter_fence', position: { x: 0, y: 0, z: 20 }, rotation: 0, metadata: {} },
    'gf-30': { id: 'gf-30', type: 'perimeter_fence', position: { x: 2, y: 0, z: 20 }, rotation: 0, metadata: {} },
    'gf-31': { id: 'gf-31', type: 'bollard', position: { x: 4, y: 0, z: 20 }, rotation: 0, metadata: {} },
    'gf-32': { id: 'gf-32', type: 'bollard', position: { x: 6, y: 0, z: 20 }, rotation: 0, metadata: {} },
    'gf-33': { id: 'gf-33', type: 'cctv_camera', position: { x: 8, y: 2, z: 20 }, rotation: 0, metadata: {} },
    'gf-34': { id: 'gf-34', type: 'security_light', position: { x: 10, y: 2, z: 20 }, rotation: 0, metadata: {} },
    'gf-35': { id: 'gf-35', type: 'mantrap', position: { x: 16, y: 0, z: 20 }, rotation: 0, metadata: {} },
    'gf-36': { id: 'gf-36', type: 'mfa_reader', position: { x: 18, y: 1, z: 20 }, rotation: 0, metadata: {} },
    'gf-37': { id: 'gf-37', type: 'biometric_scanner', position: { x: 19, y: 1, z: 20 }, rotation: 0, metadata: {} },
    'gf-38': { id: 'gf-38', type: 'firewall', position: { x: 20, y: 0, z: 0 }, rotation: 0, metadata: {} },
    'gf-39': { id: 'gf-39', type: 'ids_ips', position: { x: 22, y: 0, z: 0 }, rotation: 0, metadata: {} },
    'gf-40': { id: 'gf-40', type: 'siem_collector', position: { x: 24, y: 0, z: 0 }, rotation: 0, metadata: {} },
  },
  byCell: {} as Record<string, string>,
  inventory: { utility_feed: 3, transformer: 4, switchgear: 3, ups: 2, generator: 2, pdu: 12, crac: 5, in_row_cooling: 4, server_rack: 34, tor_switch: 16, storage_array: 4, mantrap: 3, cctv: 12, access_reader: 8, biometric_scanner: 4, fire_panel: 3, vesda: 8, fm200_nozzle: 8, epo_button: 4, firewall: 2, ids_ips: 2, siem_collector: 2, perimeter_fence: 50, bollard: 20, security_light: 10, mfa_reader: 6, smart_card_lock: 16 },
  policies: FULL_POLICY,
  createdAt: ts(7),
  updatedAt: ts(2),
};

/**
 * Demo 2: Edge Micro-DC — a compact single-rack site with liquid cooling.
 * Targets PUE ≤ 1.3 with immersion cooling and solar.
 */
const EDGE_MICRO: BuildSnapshot = {
  buildId: 'demo-edge-micro',
  name: 'Edge Micro-Datacenter',
  scenarioId: 'edge',
  gridSize: { w: 32, h: 8, d: 32 },
  voxels: {
    'em-01': { id: 'em-01', type: 'utility_feed', position: { x: 0, y: 0, z: 0 }, rotation: 0, metadata: {} },
    'em-02': { id: 'em-02', type: 'ups', position: { x: 2, y: 0, z: 0 }, rotation: 0, metadata: {} },
    'em-03': { id: 'em-03', type: 'generator', position: { x: 4, y: 0, z: 0 }, rotation: 0, metadata: {} },
    'em-04': { id: 'em-04', type: 'pdu', position: { x: 6, y: 0, z: 0 }, rotation: 0, metadata: {} },
    'em-05': { id: 'em-05', type: 'immersion_tank', position: { x: 8, y: 0, z: 0 }, rotation: 0, metadata: {} },
    'em-06': { id: 'em-06', type: 'server_rack', position: { x: 10, y: 0, z: 0 }, rotation: 0, metadata: {} },
    'em-07': { id: 'em-07', type: 'server_rack', position: { x: 11, y: 0, z: 0 }, rotation: 0, metadata: {} },
    'em-08': { id: 'em-08', type: 'gpu_pod', position: { x: 12, y: 0, z: 0 }, rotation: 0, metadata: {} },
    'em-09': { id: 'em-09', type: 'tor_switch', position: { x: 14, y: 0, z: 0 }, rotation: 0, metadata: {} },
    'em-10': { id: 'em-10', type: 'vesda', position: { x: 10, y: 3, z: 0 }, rotation: 0, metadata: {} },
    'em-11': { id: 'em-11', type: 'fire_panel', position: { x: 16, y: 0, z: 0 }, rotation: 0, metadata: {} },
    'em-12': { id: 'em-12', type: 'fm200_nozzle', position: { x: 10, y: 3, z: 1 }, rotation: 0, metadata: {} },
    'em-13': { id: 'em-13', type: 'epo_button', position: { x: 16, y: 1, z: 0 }, rotation: 0, metadata: {} },
    'em-14': { id: 'em-14', type: 'perimeter_fence', position: { x: 0, y: 0, z: 6 }, rotation: 0, metadata: {} },
    'em-15': { id: 'em-15', type: 'bollard', position: { x: 2, y: 0, z: 6 }, rotation: 0, metadata: {} },
    'em-16': { id: 'em-16', type: 'bollard', position: { x: 4, y: 0, z: 6 }, rotation: 0, metadata: {} },
    'em-17': { id: 'em-17', type: 'cctv_camera', position: { x: 6, y: 2, z: 6 }, rotation: 0, metadata: {} },
    'em-18': { id: 'em-18', type: 'security_light', position: { x: 8, y: 2, z: 6 }, rotation: 0, metadata: {} },
    'em-19': { id: 'em-19', type: 'mantrap', position: { x: 10, y: 0, z: 6 }, rotation: 0, metadata: {} },
    'em-20': { id: 'em-20', type: 'firewall', position: { x: 18, y: 0, z: 0 }, rotation: 0, metadata: {} },
    'em-21': { id: 'em-21', type: 'ids_ips', position: { x: 20, y: 0, z: 0 }, rotation: 0, metadata: {} },
    'em-22': { id: 'em-22', type: 'solar_canopy', position: { x: 0, y: 3, z: 0 }, rotation: 0, metadata: {} },
    'em-23': { id: 'em-23', type: 'heat_recovery', position: { x: 22, y: 0, z: 0 }, rotation: 0, metadata: {} },
  },
  byCell: {} as Record<string, string>,
  inventory: { utility_feed: 3, ups: 1, generator: 1, pdu: 1, immersion_tank: 1, server_rack: 2, gpu_pod: 1, tor_switch: 1, mantrap: 1, cctv: 2, access_reader: 1, biometric_scanner: 1, fire_panel: 1, vesda: 1, sprinkler: 2, epo_button: 1, firewall: 1, ids_ips: 1, solar_canopy: 1, heat_recovery: 1, perimeter_fence: 1, bollard: 4 },
  policies: MINIMAL_POLICY,
  createdAt: ts(5),
  updatedAt: ts(1),
};

/**
 * Demo 3: Tier IV Retrofit — a fault-tolerant upgrade with 2N redundancy.
 * Demonstrates the highest Uptime tier with full defense-in-depth.
 */
const TIER4_RETROFIT: BuildSnapshot = {
  buildId: 'demo-tier4-retrofit',
  name: 'Tier IV Fault-Tolerant Retrofit',
  scenarioId: 'retrofit',
  gridSize: { w: 32, h: 8, d: 32 },
  voxels: {
    't4-01': { id: 't4-01', type: 'utility_feed', position: { x: 0, y: 0, z: 0 }, rotation: 0, metadata: {} },
    't4-02': { id: 't4-02', type: 'utility_feed', position: { x: 1, y: 0, z: 0 }, rotation: 0, metadata: {} },
    't4-03': { id: 't4-03', type: 'transformer', position: { x: 2, y: 0, z: 0 }, rotation: 0, metadata: {} },
    't4-04': { id: 't4-04', type: 'transformer', position: { x: 4, y: 0, z: 0 }, rotation: 0, metadata: {} },
    't4-05': { id: 't4-05', type: 'switchgear', position: { x: 6, y: 0, z: 0 }, rotation: 0, metadata: {} },
    't4-06': { id: 't4-06', type: 'switchgear', position: { x: 7, y: 0, z: 0 }, rotation: 0, metadata: {} },
    't4-07': { id: 't4-07', type: 'ups', position: { x: 8, y: 0, z: 0 }, rotation: 0, metadata: {} },
    't4-08': { id: 't4-08', type: 'ups', position: { x: 9, y: 0, z: 0 }, rotation: 0, metadata: {} },
    't4-09': { id: 't4-09', type: 'ups', position: { x: 10, y: 0, z: 0 }, rotation: 0, metadata: {} },
    't4-10': { id: 't4-10', type: 'ups', position: { x: 11, y: 0, z: 0 }, rotation: 0, metadata: {} },
    't4-11': { id: 't4-11', type: 'generator', position: { x: 12, y: 0, z: 0 }, rotation: 0, metadata: {} },
    't4-12': { id: 't4-12', type: 'generator', position: { x: 14, y: 0, z: 0 }, rotation: 0, metadata: {} },
    't4-13': { id: 't4-13', type: 'crac', position: { x: 0, y: 0, z: 8 }, rotation: 0, metadata: {} },
    't4-14': { id: 't4-14', type: 'crac', position: { x: 0, y: 0, z: 10 }, rotation: 0, metadata: {} },
    't4-15': { id: 't4-15', type: 'crac', position: { x: 0, y: 0, z: 12 }, rotation: 0, metadata: {} },
    't4-16': { id: 't4-16', type: 'crac', position: { x: 0, y: 0, z: 14 }, rotation: 0, metadata: {} },
    't4-17': { id: 't4-17', type: 'in_row_cooling', position: { x: 6, y: 0, z: 8 }, rotation: 0, metadata: {} },
    't4-18': { id: 't4-18', type: 'in_row_cooling', position: { x: 6, y: 0, z: 12 }, rotation: 0, metadata: {} },
    't4-19': { id: 't4-19', type: 'in_row_cooling', position: { x: 12, y: 0, z: 8 }, rotation: 0, metadata: {} },
    't4-20': { id: 't4-20', type: 'in_row_cooling', position: { x: 12, y: 0, z: 12 }, rotation: 0, metadata: {} },
    't4-21': { id: 't4-21', type: 'server_rack', position: { x: 8, y: 0, z: 8 }, rotation: 0, metadata: {} },
    't4-22': { id: 't4-22', type: 'server_rack', position: { x: 8, y: 0, z: 10 }, rotation: 0, metadata: {} },
    't4-23': { id: 't4-23', type: 'server_rack', position: { x: 8, y: 0, z: 12 }, rotation: 0, metadata: {} },
    't4-24': { id: 't4-24', type: 'server_rack', position: { x: 8, y: 0, z: 14 }, rotation: 0, metadata: {} },
    't4-25': { id: 't4-25', type: 'server_rack', position: { x: 12, y: 0, z: 8 }, rotation: 0, metadata: {} },
    't4-26': { id: 't4-26', type: 'server_rack', position: { x: 12, y: 0, z: 10 }, rotation: 0, metadata: {} },
    't4-27': { id: 't4-27', type: 'server_rack', position: { x: 12, y: 0, z: 12 }, rotation: 0, metadata: {} },
    't4-28': { id: 't4-28', type: 'server_rack', position: { x: 12, y: 0, z: 14 }, rotation: 0, metadata: {} },
    't4-29': { id: 't4-29', type: 'tor_switch', position: { x: 8, y: 2, z: 8 }, rotation: 0, metadata: {} },
    't4-30': { id: 't4-30', type: 'tor_switch', position: { x: 8, y: 2, z: 14 }, rotation: 0, metadata: {} },
    't4-31': { id: 't4-31', type: 'tor_switch', position: { x: 12, y: 2, z: 8 }, rotation: 0, metadata: {} },
    't4-32': { id: 't4-32', type: 'tor_switch', position: { x: 12, y: 2, z: 14 }, rotation: 0, metadata: {} },
    't4-33': { id: 't4-33', type: 'storage_array', position: { x: 16, y: 0, z: 8 }, rotation: 0, metadata: {} },
    't4-34': { id: 't4-34', type: 'storage_array', position: { x: 16, y: 0, z: 12 }, rotation: 0, metadata: {} },
    't4-35': { id: 't4-35', type: 'vesda', position: { x: 10, y: 3, z: 10 }, rotation: 0, metadata: {} },
    't4-36': { id: 't4-36', type: 'fire_panel', position: { x: 20, y: 0, z: 0 }, rotation: 0, metadata: {} },
    't4-37': { id: 't4-37', type: 'fm200_nozzle', position: { x: 9, y: 3, z: 9 }, rotation: 0, metadata: {} },
    't4-38': { id: 't4-38', type: 'fm200_nozzle', position: { x: 9, y: 3, z: 13 }, rotation: 0, metadata: {} },
    't4-39': { id: 't4-39', type: 'fm200_nozzle', position: { x: 13, y: 3, z: 9 }, rotation: 0, metadata: {} },
    't4-40': { id: 't4-40', type: 'fm200_nozzle', position: { x: 13, y: 3, z: 13 }, rotation: 0, metadata: {} },
    't4-41': { id: 't4-41', type: 'epo_button', position: { x: 20, y: 1, z: 0 }, rotation: 0, metadata: {} },
    't4-42': { id: 't4-42', type: 'perimeter_fence', position: { x: 0, y: 0, z: 22 }, rotation: 0, metadata: {} },
    't4-43': { id: 't4-43', type: 'perimeter_fence', position: { x: 2, y: 0, z: 22 }, rotation: 0, metadata: {} },
    't4-44': { id: 't4-44', type: 'bollard', position: { x: 4, y: 0, z: 22 }, rotation: 0, metadata: {} },
    't4-45': { id: 't4-45', type: 'bollard', position: { x: 6, y: 0, z: 22 }, rotation: 0, metadata: {} },
    't4-46': { id: 't4-46', type: 'cctv_camera', position: { x: 8, y: 2, z: 22 }, rotation: 0, metadata: {} },
    't4-47': { id: 't4-47', type: 'cctv_camera', position: { x: 16, y: 2, z: 22 }, rotation: 0, metadata: {} },
    't4-48': { id: 't4-48', type: 'security_light', position: { x: 10, y: 2, z: 22 }, rotation: 0, metadata: {} },
    't4-49': { id: 't4-49', type: 'security_light', position: { x: 14, y: 2, z: 22 }, rotation: 0, metadata: {} },
    't4-50': { id: 't4-50', type: 'mantrap', position: { x: 20, y: 0, z: 22 }, rotation: 0, metadata: {} },
    't4-51': { id: 't4-51', type: 'mfa_reader', position: { x: 22, y: 1, z: 22 }, rotation: 0, metadata: {} },
    't4-52': { id: 't4-52', type: 'biometric_scanner', position: { x: 23, y: 1, z: 22 }, rotation: 0, metadata: {} },
    't4-53': { id: 't4-53', type: 'firewall', position: { x: 24, y: 0, z: 0 }, rotation: 0, metadata: {} },
    't4-54': { id: 't4-54', type: 'firewall', position: { x: 25, y: 0, z: 0 }, rotation: 0, metadata: {} },
    't4-55': { id: 't4-55', type: 'ids_ips', position: { x: 26, y: 0, z: 0 }, rotation: 0, metadata: {} },
    't4-56': { id: 't4-56', type: 'ids_ips', position: { x: 27, y: 0, z: 0 }, rotation: 0, metadata: {} },
    't4-57': { id: 't4-57', type: 'siem_collector', position: { x: 28, y: 0, z: 0 }, rotation: 0, metadata: {} },
    't4-58': { id: 't4-58', type: 'siem_collector', position: { x: 29, y: 0, z: 0 }, rotation: 0, metadata: {} },
    't4-59': { id: 't4-59', type: 'honeypot', position: { x: 30, y: 0, z: 0 }, rotation: 0, metadata: {} },
    't4-60': { id: 't4-60', type: 'immutable_backup_vault', position: { x: 18, y: 0, z: 0 }, rotation: 0, metadata: {} },
  },
  byCell: {} as Record<string, string>,
  inventory: { utility_feed: 2, transformer: 2, switchgear: 2, ups: 4, generator: 2, pdu: 16, crac: 8, in_row_cooling: 8, cdu: 2, server_rack: 24, tor_switch: 6, storage_array: 6, gpu_pod: 4, mantrap: 1, cctv: 12, access_reader: 8, biometric: 4, fire_panel: 2, vesda: 4, fm200: 4, sprinkler: 16, epo: 4, firewall: 4, ids_ips: 2, waf: 2, siem: 2, honeypot: 2, perimeter_fence: 2, bollard: 8, heat_recovery: 1, solar_canopy: 1, outside_air_economizer: 2 },
  policies: FULL_POLICY,
  createdAt: ts(3),
  updatedAt: ts(1),
};

export interface DemoBuild {
  id: string;
  name: string;
  description: string;
  scenarioId: string;
  tier: string;
  pue: string;
  difficulty: number;
  categories: string[];
  snapshot: BuildSnapshot;
}

export const DEMO_BUILDS: DemoBuild[] = [
  {
    id: 'greenfield-tier3',
    name: 'Greenfield Tier III',
    description:
      'A clean colocation hall designed from scratch. 16 server racks, N+1 power and cooling, VESDA fire detection, and perimeter security. Targets Uptime Tier III.',
    scenarioId: 'greenfield',
    tier: 'III',
    pue: '~1.4',
    difficulty: 3,
    categories: ['structure', 'power', 'cooling', 'it', 'safety', 'network', 'site'],
    snapshot: GREENFIELD_TIER3,
  },
  {
    id: 'edge-micro',
    name: 'Edge Micro-Datacenter',
    description:
      'A compact single-rack containerized site with immersion cooling, solar canopy, and heat recovery. Targets PUE ≤ 1.3.',
    scenarioId: 'edge',
    tier: 'III',
    pue: '≤ 1.3',
    difficulty: 2,
    categories: ['structure', 'power', 'cooling', 'it', 'safety', 'network', 'site'],
    snapshot: EDGE_MICRO,
  },
  {
    id: 'tier4-retrofit',
    name: 'Tier IV Retrofit',
    description:
      'A fault-tolerant upgrade with 2N power, 2N cooling, dual utility feeds, and full defense-in-depth. Achieves Uptime Tier IV.',
    scenarioId: 'retrofit',
    tier: 'IV',
    pue: '~1.25',
    difficulty: 5,
    categories: ['structure', 'power', 'cooling', 'it', 'safety', 'network', 'site'],
    snapshot: TIER4_RETROFIT,
  },
];

/** Get a demo build by id. */
export function getDemoBuild(id: string): DemoBuild | undefined {
  return DEMO_BUILDS.find((d) => d.id === id);
}

/** Generate a deterministic demo build id for sharing. */
export function demoBuildId(): string {
  return nanoid(10);
}
