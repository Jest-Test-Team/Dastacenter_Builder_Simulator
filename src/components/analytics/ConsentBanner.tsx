/**
 * One-time consent prompt. Shown the first time the user visits (or
 * after a reset). Stores the choice in localStorage and never shows
 * the prompt again.
 */

'use client';

import { useEffect, useState } from 'react';
import { useConsent, trackEvent } from '@/lib/analytics';
import { X } from 'lucide-react';

export function ConsentBanner() {
  const consent = useConsent((s) => s.consent);
  const setConsent = useConsent((s) => s.setConsent);
  const hasHydrated = useConsent((s) => s.hasHydrated);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted || !hasHydrated || consent !== 'unknown') return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="consent-title"
      className="fixed bottom-3 left-3 right-3 z-50 mx-auto max-w-2xl rounded-lg border border-border bg-bg-panel p-4 shadow-2xl md:bottom-4 md:left-4 md:right-auto"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h2 id="consent-title" className="text-sm font-semibold">
            We respect your privacy
          </h2>
          <p className="mt-1 text-xs text-fg-muted">
            This site uses no third-party analytics by default. If you opt in,
            we collect anonymous, aggregated usage data (page views, Web
            Vitals) to improve the simulator. We do not track you across sites.
            You can change this in Settings.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => {
                setConsent('accepted');
                trackEvent('consent_accepted');
              }}
              className="btn text-xs"
            >
              Accept
            </button>
            <button
              onClick={() => setConsent('declined')}
              className="btn-ghost text-xs"
            >
              Decline
            </button>
          </div>
        </div>
        <button onClick={() => setConsent('declined')} className="icon-btn" aria-label="Decline and close">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
