import Link from 'next/link';
import { AppHeader } from '@/components/layout/AppHeader';

const SHORTCUTS = [
  ['1-9', 'Select a hotbar slot'],
  ['R', 'Rotate the active block'],
  ['Escape', 'Cancel placement or close a panel'],
  ['Shift+Z / Shift+Y', 'Undo / redo'],
  ['?', 'Open the keyboard reference'],
];

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-bg">
      <AppHeader />
      <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-bold">Help</h1>
        <p className="mt-2 text-fg-muted">
          Choose a scenario, place infrastructure blocks, configure policies, then finish the build
          to receive a standards-cited score.
        </p>

        <section className="panel mt-8 p-5">
          <h2 className="text-lg font-semibold">Builder controls</h2>
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-5 gap-y-3 text-sm">
            {SHORTCUTS.map(([keys, description]) => (
              <div key={keys} className="contents">
                <dt>
                  <kbd className="rounded border border-border bg-bg-subtle px-2 py-1 font-mono">
                    {keys}
                  </kbd>
                </dt>
                <dd className="text-fg-muted">{description}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">Troubleshooting</h2>
          <p className="mt-2 text-sm text-fg-muted">
            Builds are stored in this browser. Private browsing, clearing site data, or changing
            browsers can remove them. Use a share URL when you need a portable snapshot.
          </p>
          <div className="mt-4 flex gap-3">
            <Link href="/scenarios" className="btn">
              Choose a scenario
            </Link>
            <Link href="/contact" className="btn-ghost">
              Contact support
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
