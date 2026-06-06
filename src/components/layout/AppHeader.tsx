import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { LocaleSwitcher } from '@/components/i18n/LocaleSwitcher';
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n';

export function AppHeader({ locale = DEFAULT_LOCALE, current }: { locale?: Locale; current?: 'build' | 'learn' | 'pricing' | 'about' }) {
  return (
    <header className="border-b border-border bg-bg-panel/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="text-2xl">🖥️</span>
          <span>Datacenter Builder</span>
        </Link>
        <nav className="flex items-center gap-1">
          <LocaleSwitcher current={locale} />
          <Link
            href="/learn"
            aria-current={current === 'learn' ? 'page' : undefined}
            className={`btn-ghost text-sm ${current === 'learn' ? 'text-fg' : ''}`}
          >
            Curriculum
          </Link>
          <Link
            href="/pricing"
            aria-current={current === 'pricing' ? 'page' : undefined}
            className={`btn-ghost text-sm ${current === 'pricing' ? 'text-fg' : ''}`}
          >
            Pricing
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
