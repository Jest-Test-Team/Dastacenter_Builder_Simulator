import Link from 'next/link';

export default function CookiesPage() {
  return (
    <div className="min-h-screen overflow-y-auto bg-bg">
      <header className="border-b border-border bg-bg-panel/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <Link href="/" className="font-semibold">🖥️ Datacenter Builder</Link>
          <Link href="/build/free" className="btn text-sm">Build</Link>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-bold">Cookie Policy</h1>
        <p className="mt-1 text-xs text-fg-muted">Last updated: 2026-01-15.</p>

        <section className="mt-6">
          <h2 className="text-lg font-semibold">Cookies we use</h2>
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs uppercase text-fg-muted">
              <tr>
                <th className="py-2">Name</th>
                <th className="py-2">Purpose</th>
                <th className="py-2">Expiry</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border">
                <td className="py-2 font-mono">dcb_session</td>
                <td className="py-2">Wallet-authenticated session. iron-session, httpOnly, SameSite=Strict, Secure.</td>
                <td className="py-2">12 hours</td>
              </tr>
              <tr className="border-t border-border">
                <td className="py-2 font-mono">dcb-consent</td>
                <td className="py-2">Your analytics-consent choice. Persisted in localStorage by zustand/persist.</td>
                <td className="py-2">Indefinite</td>
              </tr>
              <tr className="border-t border-border">
                <td className="py-2 font-mono">lang</td>
                <td className="py-2">Preferred UI language.</td>
                <td className="py-2">1 year</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="mt-6">
          <h2 className="text-lg font-semibold">Cookies we never use</h2>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-fg-muted">
            <li>Advertising cookies (DoubleClick, Facebook Pixel, etc.)</li>
            <li>Cross-site tracking cookies</li>
            <li>Third-party analytics cookies (Google Analytics, etc.)</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
