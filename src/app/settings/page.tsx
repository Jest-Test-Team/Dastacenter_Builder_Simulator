'use client';

import { useEffect, useState } from 'react';
import { Trash2, Download, Eye, EyeOff } from 'lucide-react';
import { useConsent } from '@/lib/analytics';
import { LOCALES, LOCALE_LABELS, type Locale, DEFAULT_LOCALE } from '@/lib/i18n';

export default function SettingsPage() {
  const { consent, setConsent, hasHydrated } = useConsent();
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  const [autosaves, setAutosaves] = useState<{ id: string; name: string; updatedAt: number }[]>([]);

  useEffect(() => {
    const stored = (typeof document !== 'undefined' && document.cookie.match(/(?:^|; )dcb-locale=([^;]+)/)?.[1]) as Locale | undefined;
    if (stored && LOCALES.includes(stored)) setLocale(stored);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const { listBuildsFromIDB } = await import('@/lib/persist');
        const all = await listBuildsFromIDB();
        setAutosaves(
          all.map((b) => ({ id: b.id, name: b.scenarioName || b.name || b.id, updatedAt: b.updatedAt })),
        );
      } catch {
        setAutosaves([]);
      }
    })();
  }, []);

  function onChangeLocale(l: Locale) {
    setLocale(l);
    document.cookie = `dcb-locale=${l}; path=/; max-age=31536000; samesite=lax`;
    window.location.reload();
  }

  async function clearAll() {
    if (!window.confirm('Delete all local builds? This cannot be undone.')) return;
    try {
      const { listBuildsFromIDB, deleteBuildFromIDB } = await import('@/lib/persist');
      const all = await listBuildsFromIDB();
      await Promise.all(all.map((b) => deleteBuildFromIDB(b.id)));
      setAutosaves([]);
    } catch {
      /* ignore */
    }
  }

  async function exportAll() {
    try {
      const { listBuildsFromIDB } = await import('@/lib/persist');
      const all = await listBuildsFromIDB();
      const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `datacenter-builder-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="min-h-screen overflow-y-auto bg-bg">
      <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-2 text-fg-muted">Locale, analytics consent, and your local data.</p>

        <section className="mt-8 panel p-5">
          <h2 className="font-semibold">Language</h2>
          <p className="mt-1 text-sm text-fg-muted">Affects UI text. Page reloads after change.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {LOCALES.map((l) => (
              <button
                key={l}
                onClick={() => onChangeLocale(l)}
                className={`btn-ghost text-sm ${locale === l ? 'ring-2 ring-primary' : ''}`}
                aria-pressed={locale === l}
              >
                {LOCALE_LABELS[l]}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-6 panel p-5">
          <h2 className="font-semibold">Analytics &amp; telemetry</h2>
          <p className="mt-1 text-sm text-fg-muted">
            We do not run any third-party scripts by default. If you opt in, we collect
            anonymous page views and Web Vitals. You can change this at any time.
          </p>
          {hasHydrated ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => setConsent('accepted')}
                className={`btn-ghost text-sm ${consent === 'accepted' ? 'ring-2 ring-primary' : ''}`}
                aria-pressed={consent === 'accepted'}
              >
                <Eye className="h-4 w-4" />
                Allow
              </button>
              <button
                onClick={() => setConsent('declined')}
                className={`btn-ghost text-sm ${consent === 'declined' ? 'ring-2 ring-primary' : ''}`}
                aria-pressed={consent === 'declined'}
              >
                <EyeOff className="h-4 w-4" />
                Decline
              </button>
            </div>
          ) : (
            <p className="mt-3 text-sm text-fg-muted">Loading…</p>
          )}
        </section>

        <section className="mt-6 panel p-5">
          <h2 className="font-semibold">Local data</h2>
          <p className="mt-1 text-sm text-fg-muted">
            Your builds are stored in this browser&apos;s IndexedDB. {autosaves.length} build
            {autosaves.length === 1 ? '' : 's'} found.
          </p>
          {autosaves.length > 0 && (
            <ul className="mt-3 max-h-40 overflow-y-auto text-sm">
              {autosaves.slice(0, 20).map((b) => (
                <li key={b.id} className="flex items-center justify-between border-b border-border py-1 last:border-0">
                  <span className="truncate">{b.name}</span>
                  <span className="ml-2 shrink-0 font-mono text-xs text-fg-muted">
                    {new Date(b.updatedAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={exportAll} className="btn-ghost text-sm">
              <Download className="h-4 w-4" />
              Export all
            </button>
            <button onClick={clearAll} className="btn-ghost text-sm text-danger">
              <Trash2 className="h-4 w-4" />
              Delete all
            </button>
          </div>
        </section>

        <p className="mt-10 text-xs text-fg-muted">
          v{process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0'} ·{' '}
          <a className="underline" href="/legal/privacy">Privacy</a> ·{' '}
          <a className="underline" href="/legal/cookies">Cookies</a>
        </p>
      </main>
    </div>
  );
}
