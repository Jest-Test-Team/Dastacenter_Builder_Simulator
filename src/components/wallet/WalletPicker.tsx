/**
 * Wallet picker.
 *
 * Shows available wallet options. Currently the Solana adapter is loaded
 * dynamically to keep the initial bundle smaller. The EVM picker uses
 * wagmi's useConnect.
 */

'use client';

import { useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Wallet, X, LogOut, Copy, Check, ShieldOff } from 'lucide-react';
import { cn, shortAddress } from '@/lib/utils';
import { useT } from '@/lib/i18n/client';
import { MidnightWalletBadge } from '@/components/cert/MidnightWalletBadge';

export function WalletPicker() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const [copied, setCopied] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const connectAny = connect as any;

  if (!isConnected) {
    return (
      <>
        <button onClick={() => setOpen(true)} className="btn">
          <Wallet className="h-4 w-4" />
          {t('wallet.connect')}
        </button>
        {open && <WalletModal onClose={() => setOpen(false)} connectors={connectors} connect={connectAny} isPending={isPending} error={error} />}
      </>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="badge text-xs">{chain?.name ?? 'Unknown chain'}</span>
      <button
        onClick={() => {
          if (address) {
            navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }
        }}
        className="flex max-w-[11rem] items-center gap-1 rounded border border-border bg-bg-subtle px-2 py-1 font-mono text-xs hover:bg-bg-panel sm:max-w-none"
      >
        <span className="truncate">{shortAddress(address ?? '')}</span>
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      </button>
      <button onClick={() => disconnect()} className="icon-btn" title="Disconnect">
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}

function WalletModal({
  onClose,
  connectors,
  connect,
  isPending,
  error,
}: {
  onClose: () => void;
  connectors: ReturnType<typeof useConnect>['connectors'];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  connect: (vars: any) => void;
  isPending: boolean;
  error: Error | null;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3" onClick={onClose}>
      <div
        className="panel max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto p-5 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Connect a wallet</h2>
          <button onClick={onClose} className="icon-btn">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* EVM wallets — for the on-chain Soulbound certificate (Sepolia / Amoy). */}
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-fg-muted">
          EVM (Ethereum / Base / Optimism / Arbitrum · Soulbound cert)
        </p>
        {error && (
          <div className="mb-4 rounded border border-danger/30 bg-danger/10 p-2 text-sm text-danger">
            {error.message}
          </div>
        )}

        <ul className="space-y-2">
          {connectors.map((c) => (
            <li key={c.uid}>
              <button
                onClick={() => connect({ connector: c })}
                disabled={isPending}
                className={cn(
                  'flex w-full items-center justify-between rounded-md border border-border bg-bg-subtle p-3 transition-colors hover:bg-bg-panel',
                  isPending && 'opacity-50',
                )}
              >
                <span className="font-medium">{c.name}</span>
                <span className="text-xs text-fg-muted">{isPending ? 'Connecting…' : 'Connect'}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[10px] text-fg-muted">
          Phantom (EVM) and Coinbase Wallet are also supported.
        </p>

        {/* Midnight (Lace) — the privacy chain. Connect + read unshielded NIGHT. */}
        <div className="mt-5 border-t border-border pt-4">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-indigo-300">
            <ShieldOff className="h-3.5 w-3.5" /> Midnight Preview (Lace · privacy)
          </p>
          <p className="mb-3 text-[11px] leading-relaxed text-fg-muted">
            Midnight is a Cardano partner chain with built-in zero-knowledge proofs. Connect{' '}
            <strong>Lace (Midnight)</strong> on the <strong>Preview</strong> network to read your
            unshielded NIGHT and mint the certificate as a private Compact-contract commitment. Fees
            are paid in DUST generated from NIGHT.
          </p>
          <MidnightWalletBadge />
        </div>
      </div>
    </div>
  );
}
