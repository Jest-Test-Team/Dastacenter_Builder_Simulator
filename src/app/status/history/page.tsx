import Link from 'next/link';
import { AppHeader } from '@/components/layout/AppHeader';

export default function StatusHistoryPage() {
  return (
    <div className="min-h-screen bg-bg">
      <AppHeader />
      <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-bold">Incident history</h1>
        <div className="panel mt-8 p-6 text-center">
          <p className="font-semibold">No published incidents</p>
          <p className="mt-2 text-sm text-fg-muted">
            Production incidents will be listed here after the public service launches.
          </p>
        </div>
        <Link href="/status" className="btn-ghost mt-6">Back to current status</Link>
      </main>
    </div>
  );
}
