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
import { Wallet, X, LogOut, Copy, Check } from 'lucide-react';
import { cn, shortAddress } from '@/lib/utils';

export function WalletPicker() {
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
          Connect wallet
        </button>
        {open && <WalletModal onClose={() => setOpen(false)} connectors={connectors} connect={connectAny} isPending={isPending} error={error} />}
      </>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="badge text-xs">{chain?.name ?? 'Unknown chain'}</span>
      <button
        onClick={() => {
          if (address) {
            navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }
        }}
        className="flex items-center gap-1 rounded border border-border bg-bg-subtle px-2 py-1 font-mono text-xs hover:bg-bg-panel"
      >
        {shortAddress(address ?? '')}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="panel w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Connect a wallet</h2>
          <button onClick={onClose} className="icon-btn">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-4 text-sm text-fg-muted">
          EVM chains (Ethereum, Base, Optimism, Arbitrum). MetaMask, WalletConnect, Coinbase.
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

        <p className="mt-4 text-[10px] text-fg-muted">
          Phantom (EVM) and Coinbase Wallet are also supported.
        </p>
      </div>
    </div>
  );
}
