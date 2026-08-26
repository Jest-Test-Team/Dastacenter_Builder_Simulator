/**
 * "Mark as read" for modules that carry no quiz.
 *
 * A module with a quiz records itself when the quiz is finished, so this only
 * renders where there is nothing else to record on.
 */

'use client';

import { CheckCircle2, Circle } from 'lucide-react';
import { useHydratedProgress } from '@/lib/content/progress';

export function ModuleComplete({ moduleId }: { moduleId: string }) {
  const { progress, hydrated, markComplete, clear } = useHydratedProgress();
  const done = Boolean(progress[moduleId]);

  if (!hydrated) return null;

  return (
    <button
      type="button"
      onClick={() => (done ? clear(moduleId) : markComplete(moduleId))}
      className="btn-ghost text-sm"
      aria-pressed={done}
    >
      {done ? (
        <>
          <CheckCircle2 className="h-4 w-4 text-success" /> Completed
        </>
      ) : (
        <>
          <Circle className="h-4 w-4" /> Mark as read
        </>
      )}
    </button>
  );
}
