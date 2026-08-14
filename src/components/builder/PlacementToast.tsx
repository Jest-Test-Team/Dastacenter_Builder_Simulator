/**
 * Transient "why the block would not place" toast.
 *
 * The placement ghost lives inside the R3F canvas, so a failed click reports
 * its reason through the store instead. This renders that reason as a brief DOM
 * toast above the hotbar and clears it on a timer — without it, a refused
 * placement is silent, which is exactly what makes a green ghost feel broken.
 */

'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useBuildStore } from '@/lib/store/build-store';

export function PlacementToast() {
  const message = useBuildStore((s) => s.placementError);
  const setPlacementError = useBuildStore((s) => s.setPlacementError);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setPlacementError(null), 2500);
    return () => window.clearTimeout(timer);
  }, [message, setPlacementError]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none flex items-center gap-2 rounded-full border border-danger/40 bg-danger/15 px-3 py-1.5 text-xs font-semibold text-danger shadow-lg backdrop-blur-sm"
    >
      <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
      {message}
    </div>
  );
}
