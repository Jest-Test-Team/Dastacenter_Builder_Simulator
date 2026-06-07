'use client';

import { Wallet } from 'lucide-react';
import { useAccount } from 'wagmi';
import { WalletPicker } from '@/components/wallet/WalletPicker';
import { useT } from '@/lib/i18n/client';

export function LandingWalletBanner() {
  const t = useT();
  const { isConnected } = useAccount();

  return (
    <div className="mt-4 rounded-lg border border-border bg-bg-panel p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-2 text-sm text-fg-muted">
          <Wallet className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{t('landing.wallet.reminder')}</p>
        </div>
        <WalletPicker />
      </div>
      {isConnected && (
        <p className="mt-2 text-xs text-success">{t('landing.wallet.connected')}</p>
      )}
    </div>
  );
}
