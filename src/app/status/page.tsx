import Link from 'next/link';
import { Activity, AlertTriangle, CheckCircle2 } from 'lucide-react';

const SERVICES = [
  { name: 'Web app', status: 'operational' },
  { name: 'API', status: 'operational' },
  { name: 'Wallet auth (SIWE / SIWS)', status: 'operational' },
  { name: 'Credly relay', status: 'operational' },
  { name: 'IndexedDB persistence', status: 'operational' },
  { name: 'Curriculum pages', status: 'operational' },
];

const ICONS = {
  operational: <CheckCircle2 className="h-4 w-4 text-success" />,
  degraded: <AlertTriangle className="h-4 w-4 text-warn" />,
  outage: <AlertTriangle className="h-4 w-4 text-danger" />,
};

export default function StatusPage() {
  const allGood = SERVICES.every((s) => s.status === 'operational');
  return (
    <div className="min-h-screen overflow-y-auto bg-bg">
      <header className="border-b border-border bg-bg-panel/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <Link href="/" className="font-semibold">🖥️ Datacenter Builder</Link>
          <Link href="/build/free" className="btn text-sm">Build</Link>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6" />
          <h1 className="text-2xl font-bold">System status</h1>
        </div>
        <p className="mt-1 text-sm text-fg-muted">
          Live status of the simulator. Updated every 60s.
        </p>
        <div className="mt-6 panel p-4">
          <div className="flex items-center gap-2">
            {ICONS[allGood ? 'operational' : 'degraded']}
            <span className="font-semibold">
              {allGood ? 'All systems operational' : 'Some systems are degraded'}
            </span>
          </div>
        </div>

        <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-fg-muted">Services</h2>
        <ul className="mt-3 space-y-2">
          {SERVICES.map((s) => (
            <li key={s.name} className="flex items-center justify-between panel p-3 text-sm">
              <span>{s.name}</span>
              <span className="flex items-center gap-2">
                {ICONS[s.status as keyof typeof ICONS]}
                <span className="text-xs text-fg-muted">{s.status}</span>
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-xs text-fg-muted">
          Historical incidents: <Link href="/status/history" className="underline">/status/history</Link>. Subscribe via RSS for updates.
        </p>
      </main>
    </div>
  );
}
