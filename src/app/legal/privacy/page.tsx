import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen overflow-y-auto bg-bg">
      <header className="border-b border-border bg-bg-panel/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <Link href="/" className="font-semibold">🖥️ Datacenter Builder</Link>
          <Link href="/build/free" className="btn text-sm">Build</Link>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="mt-1 text-xs text-fg-muted">Last updated: 2026-01-15. GDPR, CCPA, and PIPL aligned.</p>

        <section className="mt-6">
          <h2 className="text-lg font-semibold">1. What we collect</h2>
          <p className="mt-1 text-fg-muted">
            By default, the Service collects no personal data. We do not use
            third-party analytics, tracking pixels, or fingerprinting. We do
            not require an email, phone number, or any identifier beyond
            your wallet address.
          </p>
          <p className="mt-2 text-fg-muted">
            If you opt in to analytics, we collect anonymous, aggregated page
            views and Web Vitals via our own endpoint at /api/vitals. We do
            not share these with third parties. You can revoke consent at any
            time from your browser's local storage.
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-lg font-semibold">2. What we store</h2>
          <p className="mt-1 text-fg-muted">
            All builds are stored locally in your browser's IndexedDB. They
            do not leave your device unless you explicitly click "Share"
            (which embeds the snapshot in a URL fragment) or "Publish to
            Credly" (which sends a badge request through our relay).
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-lg font-semibold">3. Cookies</h2>
          <p className="mt-1 text-fg-muted">
            We use a single first-party cookie for the wallet session
            (iron-session, 12-hour TTL, httpOnly, SameSite=Strict, Secure).
            We do not use advertising cookies.
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-lg font-semibold">4. Data residency</h2>
          <p className="mt-1 text-fg-muted">
            Because we do not collect personal data by default, we have no
            central data store. The single session cookie is served from the
            Vercel edge network. If you opt in to analytics, vitals are
            stored in our own time-series database (Vercel KV) for 30 days.
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-lg font-semibold">5. Your rights (GDPR / CCPA / PIPL)</h2>
          <p className="mt-1 text-fg-muted">
            You have the right to access, correct, delete, and port your
            data. Because we collect nothing by default, most of these
            rights are moot — but if you have opted in to analytics, you
            can email privacy@datacenterbuilder.example to request
            deletion, and we will respond within 30 days.
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-lg font-semibold">6. Children's privacy</h2>
          <p className="mt-1 text-fg-muted">
            The Service is not directed at children under 13. We do not
            knowingly collect any data from children under 13.
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-lg font-semibold">7. Changes</h2>
          <p className="mt-1 text-fg-muted">
            We will post any changes to this page and update the "Last
            updated" date.
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-lg font-semibold">8. Contact</h2>
          <p className="mt-1 text-fg-muted">
            privacy@datacenterbuilder.example
          </p>
        </section>
      </main>
    </div>
  );
}
