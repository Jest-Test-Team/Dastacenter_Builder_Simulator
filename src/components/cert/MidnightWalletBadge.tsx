/**
 * Connect / show a Midnight wallet — Lace or 1AM — including the unshielded
 * NIGHT balance used to pay mint fees (tDUST is generated from tNIGHT).
 *
 * Both wallets speak the same DApp Connector API, so we enumerate whatever is
 * injected and offer each as a button. 1AM is DUST-sponsored on Preview; Lace
 * is the IOG desktop extension. The connected wallet's brand tints the badge.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Wallet, ShieldOff, AlertCircle, Clock, ExternalLink, RefreshCw } from 'lucide-react';
import {
  connectMidnightWallet,
  listMidnightWallets,
  midnightInjectionReport,
  KNOWN_MIDNIGHT_WALLETS,
  type ConnectedMidnightWallet,
  type DetectedMidnightWallet,
  type MidnightInjectionReport,
} from '@/lib/midnight/wallet';

/** Per-brand icon + colour so Lace and 1AM read as distinct in the UI. */
function brandStyle(accent: string) {
  switch (accent) {
    case '1am':
      return { Icon: Clock, ring: 'border-amber-400/30 bg-amber-500/10', text: 'text-amber-300' };
    case 'lace':
      return { Icon: Wallet, ring: 'border-indigo-400/30 bg-indigo-500/10', text: 'text-indigo-300' };
    default:
      return { Icon: Wallet, ring: 'border-border bg-bg-subtle', text: 'text-fg-muted' };
  }
}

export function MidnightWalletBadge({
  onConnected,
}: {
  onConnected?: (wallet: ConnectedMidnightWallet) => void;
}) {
  const [detected, setDetected] = useState<DetectedMidnightWallet[] | null>(null);
  const [wallet, setWallet] = useState<ConnectedMidnightWallet | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<MidnightInjectionReport | null>(null);
  const [showDiag, setShowDiag] = useState(false);

  // Wallet extensions inject their connector into `window.midnight` *after* the
  // page loads — and 1AM injects late — so a single scan on mount usually finds
  // nothing. Poll for a few seconds, and re-scan whenever the tab regains focus
  // (the user may have just installed / unlocked the wallet).
  const scan = useCallback(() => {
    const found = listMidnightWallets();
    setDetected(found);
    setReport(midnightInjectionReport());
    return found.length > 0;
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let tries = 0;
    const poll = () => {
      if (cancelled) return;
      const done = scan();
      tries += 1;
      if (!done && tries < 25) timer = setTimeout(poll, 400); // ~10s window
    };
    poll();
    const onFocus = () => scan();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [scan]);

  const connect = useCallback(
    async (walletId: string) => {
      setConnectingId(walletId);
      setError(null);
      try {
        const connected = await connectMidnightWallet(walletId);
        setWallet(connected);
        onConnected?.(connected);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to connect Midnight wallet');
      } finally {
        setConnectingId(null);
      }
    },
    [onConnected],
  );

  // Nothing installed — name both supported wallets with install links.
  if (detected !== null && detected.length === 0) {
    return (
      <div className="space-y-2 rounded border border-warn/30 bg-warn/10 p-3 text-xs">
        <p className="flex items-start gap-1.5 text-warn">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          <span>
            No Midnight wallet detected. Install one and switch it to the <strong>Preview</strong>{' '}
            network to mint here.
          </span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {KNOWN_MIDNIGHT_WALLETS.map((w) => {
            const { Icon, text } = brandStyle(w.accent);
            return (
              <a
                key={w.id}
                href={w.installUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 hover:bg-bg-subtle"
              >
                <Icon className={`h-3.5 w-3.5 ${text}`} /> {w.label}
                <ExternalLink className="h-3 w-3 text-fg-muted" />
              </a>
            );
          })}
          <button
            type="button"
            onClick={() => scan()}
            className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-fg-muted hover:bg-bg-subtle"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Re-scan
          </button>
        </div>
        <p className="text-[10px] text-fg-muted">
          Already installed? Unlock the wallet, make sure it&apos;s on <strong>Preview</strong>, then
          Re-scan.
        </p>

        {/* Self-service diagnostic — shows exactly what the browser injected, so
            an "installed but not detected" wallet is identifiable at a glance. */}
        <button
          type="button"
          onClick={() => setShowDiag((v) => !v)}
          className="text-[10px] text-fg-muted underline underline-offset-2"
        >
          {showDiag ? 'Hide' : 'Show'} detection details
        </button>
        {showDiag && report && (
          <pre className="mt-1 overflow-x-auto rounded border border-border bg-bg-panel p-2 text-[10px] leading-relaxed text-fg-muted">
{`window.midnight present : ${report.hasMidnightGlobal ? 'yes' : 'NO'}
midnight keys           : ${report.midnightKeys.length ? report.midnightKeys.join(', ') : '(none)'}
connectors              : ${
              report.connectors.length
                ? report.connectors
                    .map((c) => `${c.key} → "${c.name}" [${c.rdns}] v${c.apiVersion}${c.hasConnect ? '' : ' (no connect!)'}`)
                    .join('\n                          ')
                : '(none)'
            }
other suspects          : ${report.suspects.length ? report.suspects.join(', ') : '(none)'}`}
          </pre>
        )}
      </div>
    );
  }

  // Connected — brand-tinted balance badge.
  if (wallet) {
    const { Icon, ring, text } = brandStyle(
      KNOWN_MIDNIGHT_WALLETS.find((w) => w.id === wallet.walletId)?.accent ?? 'generic',
    );
    return (
      <div className={`rounded-lg border p-3 ${ring}`}>
        <div className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${text}`}>
          <Icon className="h-3 w-3" /> {wallet.walletLabel} connected
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-muted">
          <ShieldOff className="h-3 w-3" /> Unshielded balance
        </div>
        <div className="mt-1 font-mono text-2xl font-bold text-fg">{wallet.unshieldedNight}</div>
        <p className="text-[10px] text-fg-muted">Sum of all unshielded NIGHT tokens</p>
        <p className="mt-2 break-all font-mono text-[10px] text-fg-muted">
          {wallet.address.slice(0, 18)}…{wallet.address.slice(-6)}
        </p>
      </div>
    );
  }

  // Detected but not connected — a button per wallet brand.
  const busy = connectingId !== null || detected === null;
  return (
    <div className="space-y-2">
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="grid gap-2 sm:grid-cols-2">
        {(detected ?? []).map((w) => {
          const { Icon, text } = brandStyle(w.accent);
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => void connect(w.id)}
              disabled={busy}
              className="btn-ghost flex-col items-start gap-0.5 py-2 text-sm"
            >
              <span className="flex items-center gap-1.5">
                {connectingId === w.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Icon className={`h-4 w-4 ${text}`} />
                )}
                Connect {w.label}
              </span>
              <span className="text-[10px] font-normal text-fg-muted">{w.tagline}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
