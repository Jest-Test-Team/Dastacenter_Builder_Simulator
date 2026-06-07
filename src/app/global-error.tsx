'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[error-boundary]', error.message, error.digest);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-bg text-fg">
        <div className="flex min-h-screen items-center justify-center px-6">
          <main className="max-w-md text-center">
            <AlertTriangle className="mx-auto mb-4 h-16 w-16 text-danger" />
            <h1 className="text-3xl font-bold">Something went sideways</h1>
            <p className="mt-3 text-fg-muted">
              An unexpected error broke this page. Your build is safe — it lives
              in your browser, not on our server.
            </p>
            {error.digest && (
              <p className="mt-4 font-mono text-xs text-fg-muted">
                error_id={error.digest}
              </p>
            )}
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button onClick={reset} className="btn">
                <RefreshCcw className="h-4 w-4" />
                Try again
              </button>
              <Link href="/" className="btn-ghost">
                <Home className="h-4 w-4" />
                Home
              </Link>
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
