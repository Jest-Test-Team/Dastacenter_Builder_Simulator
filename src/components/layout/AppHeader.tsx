import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { LocaleSwitcher } from '@/components/i18n/LocaleSwitcher';
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n';

export function AppHeader({ locale = DEFAULT_LOCALE, current }: { locale?: Locale; current?: 'build' | 'learn' | 'pricing' | 'about' | 'dashboard' }) {
  return (
    <header className="border-b border-border bg-bg-panel/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold">
          <span className="text-2xl">🖥️</span>
          <span>Datacenter Builder</span>
        </Link>
        <nav className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
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
          <Link
            href="/dashboard"
            aria-current={current === 'dashboard' ? 'page' : undefined}
            className={`btn-ghost text-sm ${current === 'dashboard' ? 'text-fg' : ''}`}
          >
            My Certificates
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
