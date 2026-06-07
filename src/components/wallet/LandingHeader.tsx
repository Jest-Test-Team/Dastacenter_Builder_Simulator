'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { LocaleSwitcher } from '@/components/i18n/LocaleSwitcher';
import { WalletPicker } from '@/components/wallet/WalletPicker';
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n';

export function LandingHeader() {
  return (
    <header className="border-b border-border bg-bg-panel/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="text-2xl">🖥️</span>
          <span>Datacenter Builder</span>
        </Link>
        <nav className="flex items-center gap-2">
          <WalletPicker />
          <LocaleSwitcher current={DEFAULT_LOCALE satisfies Locale} />
          <Link href="/learn" className="btn-ghost text-sm">
            Curriculum
          </Link>
          <Link href="/build/free" className="btn text-sm">
            Build
            <ArrowRight className="h-4 w-4" />
          </Link>
        </nav>
      </div>
    </header>
  );
}
