import { describe, expect, it } from 'vitest';
import { emptyState, placeBlock } from '@/lib/blocks';
import { projectOperations } from '@/lib/simulation';

describe('L2 operations simulation', () => {
  it('returns zero operations for an empty build', () => {
    const projection = projectOperations(emptyState());
    expect(projection.facilityPowerKw).toBe(0);
    expect(projection.annualOpexUsd).toBe(0);
    expect(projection.staffing.totalFte).toBe(0);
  });

  it('projects staffing, OPEX, carbon, and water deterministically', () => {
    const build = emptyState();
    placeBlock(build, { typeId: 'server_rack', cell: { x: 1, y: 1, z: 1 } });
    placeBlock(build, { typeId: 'utility_feed', cell: { x: 3, y: 1, z: 1 } });
    placeBlock(build, { typeId: 'ups', cell: { x: 5, y: 1, z: 1 } });
    placeBlock(build, { typeId: 'crac', cell: { x: 7, y: 1, z: 1 } });
    placeBlock(build, { typeId: 'cctv', cell: { x: 9, y: 1, z: 1 } });

    const first = projectOperations(build);
    const second = projectOperations(build);

    expect(second).toEqual(first);
    expect(first.staffing.totalFte).toBeGreaterThan(0);
    expect(first.annualOpexUsd).toBeGreaterThan(first.annualEnergyCostUsd);
    expect(first.annualCarbonTonnes).toBeGreaterThan(0);
    expect(first.annualWaterLiters).toBeGreaterThan(0);
  });

  it('reduces grid energy and carbon with renewable policy', () => {
    const build = emptyState();
    placeBlock(build, { typeId: 'server_rack', cell: { x: 1, y: 1, z: 1 } });
    placeBlock(build, { typeId: 'utility_feed', cell: { x: 3, y: 1, z: 1 } });
    const baseline = projectOperations(build);

    build.policies['esg.renewable_percent'] = 75;
    const renewable = projectOperations(build);

    expect(renewable.annualGridEnergyKwh).toBeCloseTo(baseline.annualGridEnergyKwh * 0.25, 0);
    expect(renewable.annualCarbonTonnes).toBeLessThan(baseline.annualCarbonTonnes);
  });

  it('supports regional operating assumptions', () => {
    const build = emptyState();
    placeBlock(build, { typeId: 'server_rack', cell: { x: 1, y: 1, z: 1 } });
    const projection = projectOperations(build, {
      operatingHoursPerYear: 1_000,
      electricityUsdPerKwh: 0.2,
      waterUsdPerCubicMeter: 3,
      gridKgCo2ePerKwh: 0.1,
      loadedStaffCostUsd: 100_000,
      shiftCoverageFactor: 4,
    });

    expect(projection.annualFacilityEnergyKwh).toBe(projection.facilityPowerKw * 1_000);
    expect(projection.annualEnergyCostUsd).toBe(projection.annualFacilityEnergyKwh * 0.2);
  });
});
