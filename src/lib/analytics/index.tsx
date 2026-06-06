/**
 * Privacy-first analytics. No third-party scripts run unless the user
 * explicitly consents. Tracks anonymous page views + Web Vitals to
 * our own /api/vitals endpoint; the user can opt in to share those
 * with PostHog as well.
 */

'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ConsentState = 'unknown' | 'accepted' | 'declined';

interface AnalyticsState {
  consent: ConsentState;
  setConsent: (c: ConsentState) => void;
  hasHydrated: boolean;
  setHydrated: (v: boolean) => void;
}

export const useConsent = create<AnalyticsState>()(
  persist(
    (set) => ({
      consent: 'unknown',
      setConsent: (c) => set({ consent: c }),
      hasHydrated: false,
      setHydrated: (v) => set({ hasHydrated: v }),
    }),
    { name: 'dcb-consent' },
  ),
);

/**
 * Tracks a custom event. No-op unless consent was given AND a
 * PostHog key is configured. Falls back to logging to console in dev.
 */
export function trackEvent(name: string, props?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  const consent = useConsent.getState().consent;
  if (consent !== 'accepted') return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug('[analytics]', name, props);
    }
    return;
  }
  // Lazy-load PostHog to keep initial bundle clean.
  void import('posthog-js')
    .then(({ default: posthog }) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ph = (posthog as any);
        if (!ph.__loaded) ph.init(key, { capture_pageview: false });
        ph.capture(name, props);
      } catch {
        // ignore
      }
    })
    .catch(() => {
      // ignore
    });
}

/**
 * Page-view tracker. Mounted in Providers or layout; only fires on
 * path change AND with consent.
 */
export function PageViewTracker() {
  const path = usePathname();
  useEffect(() => {
    trackEvent('$pageview', { path });
  }, [path]);
  return null;
}
