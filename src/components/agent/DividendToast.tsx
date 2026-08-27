/**
 * The dividend receipt.
 *
 * This banner is the emotional payoff of the whole flow, which is exactly why
 * it is wired to the narrowest possible trigger: it takes a `settled` event,
 * and a `settled` event cannot be constructed without a transaction hash from a
 * mined receipt (see `src/lib/agent/settle.ts`). There is no "success" prop, no
 * boolean, and no way to show this banner because a run merely finished.
 *
 * The explorer link is not decoration either. A viewer who does not believe the
 * number should be one click from checking it on Sepolia, and the link is placed
 * where a sceptic will actually look.
 */

'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import type { AgentEvent } from '@/lib/agent/types';
import { useT } from '@/lib/i18n/client';

type Settled = Extract<AgentEvent, { stage: 'settled' }>;

export function DividendToast({ settled }: { settled: Settled | null }) {
  const [dismissed, setDismissed] = useState(false);
  const t = useT();

  useEffect(() => {
    if (settled) setDismissed(false);
  }, [settled]);

  if (!settled || dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 z-50 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 animate-in rounded-xl border border-success/50 bg-bg-panel/95 p-4 shadow-[0_0_60px_-12px_rgb(34_197_94/0.7)] backdrop-blur"
    >
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-2 top-2 icon-btn"
        aria-label={t('toast.dismiss')}
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <p className="pr-6 text-sm font-semibold">
        {t('toast.dividend.title', { amount: settled.amount.toLocaleString() })}
      </p>
      <p className="mt-1 text-xs text-fg-muted">
        {t('toast.dividend.detail', {
          address: `${settled.to.slice(0, 6)}…${settled.to.slice(-4)}`,
        })}
      </p>
      {/* A chain with no block explorer (a local node) still shows the hash —
          it just does not pretend there is somewhere to click through to. */}
      {settled.explorerUrl.startsWith('http') ? (
        <a
          href={settled.explorerUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1.5 font-mono text-[11px] text-primary underline"
        >
          {settled.txHash.slice(0, 18)}…
          <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        <p className="mt-2 font-mono text-[11px] text-fg-muted">{settled.txHash.slice(0, 18)}…</p>
      )}
    </div>
  );
}
