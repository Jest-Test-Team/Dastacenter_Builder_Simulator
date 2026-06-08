import type { BuildSnapshot } from '@/lib/store/build-store';
import { score, type RatingReport } from '@/lib/scoring';
import { stableSnapshotHash } from '@/lib/utils/identity';

export interface ValidatedBlueprintSubmission {
  snapshot: BuildSnapshot;
  report: RatingReport;
  blueprintHash: string;
  buildId: string;
  scenarioId: string;
  scenarioName: string;
}

export async function validateBlueprintSubmission(
  snapshot: BuildSnapshot,
  expectedBlueprintHash: string,
): Promise<ValidatedBlueprintSubmission | { ok: false; status: number; error: string }> {
  const blueprintHash = await stableSnapshotHash(snapshot);
  if (blueprintHash !== expectedBlueprintHash) {
    return { ok: false, status: 400, error: 'Blueprint hash mismatch' };
  }

  const report = score(snapshot);
  return {
    snapshot,
    report,
    blueprintHash,
    buildId: snapshot.buildId,
    scenarioId: snapshot.scenarioId,
    scenarioName: snapshot.scenarioName,
  };
}
