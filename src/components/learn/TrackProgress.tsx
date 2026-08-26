/**
 * Per-track completion, shown on the curriculum index.
 *
 * Reads the same local progress the module pages write. Renders nothing until
 * hydration finishes so the server-rendered markup and the first client paint
 * agree — IndexedDB is not available during SSR.
 */

'use client';

import { modulesInTrack, type ModuleTrack } from '@/lib/content/modules';
import { trackCompletion, useHydratedProgress } from '@/lib/content/progress';

export function TrackProgress({ track }: { track: ModuleTrack }) {
  const { progress, hydrated } = useHydratedProgress();
  if (!hydrated) return null;

  const { done, total, complete } = trackCompletion(progress, track);
  if (done === 0) return null;

  return (
    <div className="mt-3 flex items-center gap-3">
      <div
        className="h-1.5 w-40 overflow-hidden rounded-full bg-bg-panel"
        role="progressbar"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${modulesInTrack(track).length} module track progress`}
      >
        <div
          className={complete ? 'h-full bg-success' : 'h-full bg-primary'}
          style={{ width: `${(done / total) * 100}%` }}
        />
      </div>
      <span className="text-xs text-fg-muted">
        {done}/{total} complete
      </span>
    </div>
  );
}
