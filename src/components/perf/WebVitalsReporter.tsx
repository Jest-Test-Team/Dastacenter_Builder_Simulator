/**
 * Client-side Web Vitals reporter.
 *
 * Sends to `/api/vitals` so we can monitor real-user performance.
 * No external analytics here — the body is also forwarded to PostHog
 * if consent was given.
 */

'use client';

import { useReportWebVitals } from 'next/web-vitals';

export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    // Throttle: only forward metrics that are "real" (not local dev).
    if (process.env.NODE_ENV !== 'production') return;
    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      id: metric.id,
      rating: metric.rating,
      navigationType: metric.navigationType,
      path: typeof location !== 'undefined' ? location.pathname : '',
    });
    // Beacon is best-effort and won't block navigation.
    if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
      navigator.sendBeacon('/api/vitals', body);
    }
  });
  return null;
}
