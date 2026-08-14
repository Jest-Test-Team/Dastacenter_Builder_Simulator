/**
 * Connect / show the Midnight (Lace) wallet, including the unshielded NIGHT
 * balance used to pay mint fees (tDUST is generated from tNIGHT).
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Wallet, ShieldOff, AlertCircle } from 'lucide-react';
import {
  connectMidnightWallet,
  isMidnightWalletAvailable,
  type ConnectedMidnightWallet,
} from '@/lib/midnight/wallet';

export function MidnightWalletBadge({
  onConnected,
}: {
  onConnected?: (wallet: ConnectedMidnightWallet) => void;
}) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [wallet, setWallet] = useState<ConnectedMidnightWallet | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAvailable(isMidnightWalletAvailable());
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const connected = await connectMidnightWallet();
      setWallet(connected);
      onConnected?.(connected);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect Midnight wallet');
    } finally {
      setConnecting(false);
    }
  }, [onConnected]);

  if (available === false) {
    return (
      <div className="rounded border border-warn/30 bg-warn/10 p-3 text-xs text-warn">
        <p className="flex items-start gap-1.5">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          <span>
            Midnight wallet not detected. Install <strong>Lace (Midnight)</strong> and switch it to
            the <strong>Preview</strong> network to mint here.
          </span>
        </p>
      </div>
    );
  }

  if (wallet) {
    return (
      <div className="rounded-lg border border-indigo-400/30 bg-indigo-500/10 p-3">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-300">
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

  return (
    <div className="space-y-2">
      {error && <p className="text-xs text-danger">{error}</p>}
      <button
        type="button"
        onClick={() => void connect()}
        disabled={connecting || available === null}
        className="btn-ghost w-full text-sm"
      >
        {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
        Connect Midnight (Lace)
      </button>
    </div>
  );
}
