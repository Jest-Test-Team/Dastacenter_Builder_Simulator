/**
 * Reduced-motion hook. Returns true if the user has `prefers-reduced-motion`.
 * Use to gate non-essential animation (camera damping, transitions).
 */

'use client';

import { useEffect, useState } from 'react';
import { useSettings } from '@/lib/persist';

export function useReducedMotion(): boolean {
  const [systemReduced, setSystemReduced] = useState(false);
  const userReduced = useSettings((state) => state.reducedMotion);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setSystemReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setSystemReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return systemReduced || userReduced;
}
