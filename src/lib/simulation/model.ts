import type { BuildState } from '@/lib/blocks';
import { getBlock } from '@/lib/blocks';
import { score, type RatingReport } from '@/lib/scoring';

export interface SimulationAssumptions {
  operatingHoursPerYear: number;
  electricityUsdPerKwh: number;
  waterUsdPerCubicMeter: number;
  gridKgCo2ePerKwh: number;
  loadedStaffCostUsd: number;
  shiftCoverageFactor: number;
}

export interface StaffingProjection {
  operationsPerShift: number;
  facilitiesPerShift: number;
  securityPerShift: number;
  shiftFte: number;
  managementFte: number;
  totalFte: number;
}

export interface OperationsProjection {
  report: RatingReport;
  assumptions: SimulationAssumptions;
  facilityPowerKw: number;
  annualItEnergyKwh: number;
  annualFacilityEnergyKwh: number;
  annualGridEnergyKwh: number;
  annualWaterLiters: number;
  annualCarbonTonnes: number;
  annualEnergyCostUsd: number;
  annualWaterCostUsd: number;
  annualStaffCostUsd: number;
  annualOpexUsd: number;
  renewablePercent: number;
  staffing: StaffingProjection;
}

export const DEFAULT_SIMULATION_ASSUMPTIONS: SimulationAssumptions = {
  operatingHoursPerYear: 8_760,
  electricityUsdPerKwh: 0.12,
  waterUsdPerCubicMeter: 2,
  gridKgCo2ePerKwh: 0.4,
  loadedStaffCostUsd: 95_000,
  shiftCoverageFactor: 4.2,
};

export function projectOperations(
  build: BuildState,
  assumptions: SimulationAssumptions = DEFAULT_SIMULATION_ASSUMPTIONS,
): OperationsProjection {
  const report = score(build);
  const blocks = Object.values(build.voxels);
  const hasInfrastructure = blocks.length > 0;
  const rackEquivalents = blocks.reduce((total, block) => {
    if (block.type === 'gpu_pod') return total + 2;
    if (block.type === 'server_rack' || block.type === 'storage_array') return total + 1;
    return total;
  }, 0);
  const facilitiesAssets = blocks.filter((block) => {
    const category = getBlock(block.type)?.category;
    return category === 'power' || category === 'cooling' || category === 'safety';
  }).length;
  const securityAssets = blocks.filter((block) => {
    return ['cctv', 'mantrap', 'access_reader', 'biometric', 'bollard', 'perimeter_fence'].includes(
      block.type,
    );
  }).length;

  const operationsPerShift = hasInfrastructure
    ? Math.max(1, Math.ceil(rackEquivalents / 24), Math.ceil(report.totalITLoadKW / 1_000))
    : 0;
  const facilitiesPerShift = facilitiesAssets > 0 ? Math.max(1, Math.ceil(facilitiesAssets / 16)) : 0;
  const securityEnabled =
    securityAssets > 0 ||
    build.policies['physical.guard_patrols'] === true ||
    build.policies['compensating.manual_patrols'] === true;
  const securityPerShift = securityEnabled ? Math.max(1, Math.ceil(securityAssets / 12)) : 0;
  const shiftFte = round(
    (operationsPerShift + facilitiesPerShift + securityPerShift) * assumptions.shiftCoverageFactor,
    1,
  );
  const managementFte = shiftFte > 0 ? Math.max(1, Math.ceil(shiftFte / 12)) : 0;
  const totalFte = round(shiftFte + managementFte, 1);

  const renewablePercent = clamp(numberPolicy(build, 'esg.renewable_percent'), 0, 100);
  const pue = report.pue > 0 ? report.pue : 1;
  const facilityPowerKw = report.totalITLoadKW > 0
    ? report.totalITLoadKW * pue
    : Math.max(0, report.totalFacilityPowerKW);
  const annualItEnergyKwh = report.totalITLoadKW * assumptions.operatingHoursPerYear;
  const annualFacilityEnergyKwh = facilityPowerKw * assumptions.operatingHoursPerYear;
  const annualGridEnergyKwh = annualFacilityEnergyKwh * (1 - renewablePercent / 100);
  const annualWaterLiters = report.wue * annualItEnergyKwh;
  const annualCarbonTonnes = (annualGridEnergyKwh * assumptions.gridKgCo2ePerKwh) / 1_000;
  const annualEnergyCostUsd = annualFacilityEnergyKwh * assumptions.electricityUsdPerKwh;
  const annualWaterCostUsd = (annualWaterLiters / 1_000) * assumptions.waterUsdPerCubicMeter;
  const annualStaffCostUsd = totalFte * assumptions.loadedStaffCostUsd;

  return {
    report,
    assumptions,
    facilityPowerKw: round(facilityPowerKw, 1),
    annualItEnergyKwh: round(annualItEnergyKwh, 0),
    annualFacilityEnergyKwh: round(annualFacilityEnergyKwh, 0),
    annualGridEnergyKwh: round(annualGridEnergyKwh, 0),
    annualWaterLiters: round(annualWaterLiters, 0),
    annualCarbonTonnes: round(annualCarbonTonnes, 1),
    annualEnergyCostUsd: round(annualEnergyCostUsd, 0),
    annualWaterCostUsd: round(annualWaterCostUsd, 0),
    annualStaffCostUsd: round(annualStaffCostUsd, 0),
    annualOpexUsd: round(annualEnergyCostUsd + annualWaterCostUsd + annualStaffCostUsd, 0),
    renewablePercent,
    staffing: {
      operationsPerShift,
      facilitiesPerShift,
      securityPerShift,
      shiftFte,
      managementFte,
      totalFte,
    },
  };
}

function numberPolicy(build: BuildState, key: 'esg.renewable_percent'): number {
  const value = build.policies[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
