import Link from 'next/link';
import { Home, Search } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-6">
      <main id="main" tabIndex={-1} className="max-w-md text-center">
        <div className="mb-6 text-8xl">🖥️💥</div>
        <h1 className="text-3xl font-bold">404 — Not Found</h1>
        <p className="mt-3 text-fg-muted">
          That rack isn&apos;t in the datacenter. Maybe a missing cable, or a route
          we never wired up.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn">
            <Home className="h-4 w-4" />
            Home
          </Link>
          <Link href="/build/free" className="btn-ghost">
            <Search className="h-4 w-4" />
            Start building
          </Link>
        </div>
        <p className="mt-8 font-mono text-xs text-fg-muted">
          ERR_NOT_FOUND · request_id={crypto.randomUUID().slice(0, 8)}
        </p>
      </main>
    </div>
  );
}
