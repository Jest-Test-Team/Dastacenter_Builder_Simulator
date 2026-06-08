import { loadBuildFromIDB } from '@/lib/persist';
import { score, type RatingReport } from '@/lib/scoring';
import { stableSnapshotHash } from '@/lib/utils/identity';

export interface ValidatedBlueprintSubmission {
  buildId: string;
  snapshot: Awaited<ReturnType<typeof loadBuildFromIDB>> extends { snapshot: infer S } ? S : never;
  report: RatingReport;
  blueprintHash: string;
  scenarioName: string;
  scenarioId: string;
}

export async function validateBlueprintSubmission(
  buildId: string,
  expectedBlueprintHash: string,
): Promise<ValidatedBlueprintSubmission | { ok: false; status: number; error: string }> {
  const record = await loadBuildFromIDB(buildId);
  if (!record) return { ok: false, status: 404, error: 'Build not found' };

  const blueprintHash = await stableSnapshotHash(record.snapshot);
  if (blueprintHash !== expectedBlueprintHash) {
    return { ok: false, status: 400, error: 'Blueprint hash mismatch' };
  }

  const report = score(record.snapshot);
  return {
    buildId,
    snapshot: record.snapshot,
    report,
    blueprintHash,
    scenarioName: record.scenarioName,
    scenarioId: record.scenarioId,
  };
}
