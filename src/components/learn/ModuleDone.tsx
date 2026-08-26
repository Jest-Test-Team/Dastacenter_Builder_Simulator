/** A tick on the curriculum index for modules already completed. */

'use client';

import { CheckCircle2 } from 'lucide-react';
import { useHydratedProgress } from '@/lib/content/progress';

export function ModuleDone({ moduleId }: { moduleId: string }) {
  const { progress, hydrated } = useHydratedProgress();
  if (!hydrated || !progress[moduleId]) return null;
  return <CheckCircle2 className="h-4 w-4 text-success" aria-label="Completed" />;
}
