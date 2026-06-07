/**
 * Sentry initialization. Lazy-loads on the client to keep the
 * initial bundle clean. Only initializes if SENTRY_DSN is set AND
 * the user has consented to analytics.
 */

'use client';

export async function initSentry() {
  if (typeof window === 'undefined') return;
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  // Dynamic import keeps the ~50kB SDK out of the main bundle.
  const Sentry = await import('@sentry/browser');
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
  });
}
