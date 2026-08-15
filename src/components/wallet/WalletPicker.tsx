/**
 * Wallet picker.
 *
 * Two independent connections live here: the EVM wallet (wagmi) for the
 * Soulbound certificate, and the Midnight wallet (Lace / 1AM, via the shared
 * {@link useMidnightWallet} store) for the privacy certificate. Both surface as
 * their own status chip in the header, and both are managed from one modal with
 * a clear card per chain.
 */

'use client';

import { useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Wallet, X, LogOut, Copy, Check, ShieldOff, Sparkles } from 'lucide-react';
import { cn, shortAddress } from '@/lib/utils';
import { useT } from '@/lib/i18n/client';
import { MidnightWalletBadge, brandStyle, accentForWalletId } from '@/components/cert/MidnightWalletBadge';
import { useMidnightWallet } from '@/lib/midnight/store';
import { shortMidnightAddress } from '@/lib/midnight/config';

export function WalletPicker() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const [copied, setCopied] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const connectAny = connect as any;

  const midnight = useMidnightWallet();
  const midnightConnected = midnight.isConnected();
  const anyConnected = isConnected || midnightConnected;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* EVM status chip */}
      {isConnected && (
        <div className="flex items-center gap-1.5">
          <span className="badge text-xs">{chain?.name ?? 'EVM'}</span>
          <button
            onClick={() => {
              if (address) {
                navigator.clipboard.writeText(address);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }
            }}
            className="flex max-w-[9rem] items-center gap-1 rounded border border-border bg-bg-subtle px-2 py-1 font-mono text-xs hover:bg-bg-panel"
            title="Copy address"
          >
            <span className="truncate">{shortAddress(address ?? '')}</span>
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </button>
          <button onClick={() => disconnect()} className="icon-btn" title="Disconnect EVM">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Midnight status chip */}
      {midnightConnected && <MidnightHeaderChip />}

      {/* Connect / manage */}
      <button
        onClick={() => setOpen(true)}
        className={anyConnected ? 'btn-ghost text-sm' : 'btn'}
        title={anyConnected ? 'Manage wallets' : undefined}
      >
        <Wallet className="h-4 w-4" />
        {anyConnected ? 'Wallets' : t('wallet.connect')}
      </button>

      {open && (
        <WalletModal
          onClose={() => setOpen(false)}
          connectors={connectors}
          connect={connectAny}
          isPending={isPending}
          error={error}
        />
      )}
    </div>
  );
}

/** Compact brand-tinted Midnight chip for the header (address + NIGHT balance). */
function MidnightHeaderChip() {
  const { walletId, walletLabel, address, unshieldedNight, disconnect } = useMidnightWallet();
  const { Icon, ring, text } = brandStyle(accentForWalletId(walletId));
  const [copied, setCopied] = useState(false);
  return (
    <div className={cn('flex items-center gap-1.5 rounded border px-2 py-1', ring)}>
      <Icon className={cn('h-3.5 w-3.5', text)} />
      <span className={cn('text-[10px] font-semibold uppercase tracking-wide', text)}>{walletLabel}</span>
      <button
        onClick={() => {
          if (address) {
            navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }
        }}
        className="flex items-center gap-1 font-mono text-[11px] text-fg-muted hover:text-fg"
        title={address ?? ''}
      >
        <span>{shortMidnightAddress(address ?? '')}</span>
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      </button>
      <span className="rounded bg-bg-panel/60 px-1 font-mono text-[10px] text-fg">
        {unshieldedNight} NIGHT
      </span>
      <button onClick={disconnect} className="icon-btn h-5 w-5" title="Disconnect Midnight">
        <LogOut className="h-3 w-3" />
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="panel flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">Connect a wallet</h2>
            <p className="text-xs text-fg-muted">Pick a chain — you can connect one or both.</p>
          </div>
          <button onClick={onClose} className="icon-btn" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body: one card per chain — the two "layers". */}
        <div className="space-y-4 overflow-y-auto px-5 py-5">
          {/* EVM layer */}
          <section className="rounded-xl border border-border bg-bg-subtle/60 p-4">
            <div className="mb-1 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-500/15 text-sky-300">
                <Wallet className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="text-sm font-semibold">EVM · Soulbound certificate</p>
                <p className="text-[10px] text-fg-muted">Ethereum / Base / Optimism / Arbitrum</p>
              </div>
            </div>
            {error && (
              <div className="my-2 rounded border border-danger/30 bg-danger/10 p-2 text-xs text-danger">
                {error.message}
              </div>
            )}
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {connectors.map((c) => (
                <li key={c.uid}>
                  <button
                    onClick={() => connect({ connector: c })}
                    disabled={isPending}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg border border-border bg-bg-panel/50 p-3 text-sm transition-colors hover:bg-bg-panel',
                      isPending && 'opacity-50',
                    )}
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="text-[10px] text-fg-muted">{isPending ? 'Connecting…' : 'Connect'}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[10px] text-fg-muted">
              Phantom (EVM) and Coinbase Wallet are also supported. The server relays the mint, so
              it&apos;s gasless for you.
            </p>
          </section>

          {/* Midnight layer */}
          <section className="rounded-xl border border-indigo-400/25 bg-indigo-500/[0.06] p-4">
            <div className="mb-1 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/20 text-indigo-300">
                <ShieldOff className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="flex items-center gap-1.5 text-sm font-semibold text-indigo-200">
                  Midnight Preview · privacy certificate
                  <Sparkles className="h-3 w-3 text-indigo-300" />
                </p>
                <p className="text-[10px] text-fg-muted">Lace or 1AM · zero-knowledge Compact commitment</p>
              </div>
            </div>
            <p className="mb-3 mt-2 text-[11px] leading-relaxed text-fg-muted">
              A Cardano partner chain with built-in ZK proofs. Connect <strong>Lace (Midnight)</strong>{' '}
              or <strong>1AM</strong> on <strong>Preview</strong> to read your unshielded NIGHT and mint
              the certificate as a private commitment — fees come from DUST (1AM sponsors DUST on
              Preview).
            </p>
            <MidnightWalletBadge />
          </section>
        </div>
      </div>
    </div>
  );
}
