/**
 * Locale switcher. Sets a cookie and refreshes the page.
 */

'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { LOCALES, LOCALE_LABELS, type Locale } from '@/lib/i18n';
import { Globe } from 'lucide-react';

export function LocaleSwitcher({ current }: { current: Locale }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function setLocale(l: Locale) {
    if (l === current) return;
    document.cookie = `lang=${l};path=/;max-age=31536000;SameSite=Lax`;
    start(() => router.refresh());
  }

  return (
    <label className="flex items-center gap-1 text-xs text-fg-muted">
      <Globe className="h-3.5 w-3.5" />
      <select
        value={current}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="bg-transparent text-fg outline-none"
        disabled={pending}
        aria-label="Language"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {LOCALE_LABELS[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
