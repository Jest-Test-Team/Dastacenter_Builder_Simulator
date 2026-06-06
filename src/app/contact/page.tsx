import Link from 'next/link';

export default function ContactPage() {
  return (
    <div className="min-h-screen overflow-y-auto bg-bg">
      <header className="border-b border-border bg-bg-panel/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <Link href="/" className="font-semibold">🖥️ Datacenter Builder</Link>
          <Link href="/build/free" className="btn text-sm">Build</Link>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-bold">Contact</h1>
        <p className="mt-2 text-fg-muted">For sales, support, and security disclosures.</p>

        <section className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="panel p-5">
            <h2 className="font-semibold">Sales</h2>
            <p className="mt-2 text-sm text-fg-muted">
              Enterprise tier, on-prem deploy, custom block libraries, custom
              standards packs.
            </p>
            <a href="mailto:sales@datacenterbuilder.example" className="mt-3 inline-block text-sm text-primary underline">
              sales@datacenterbuilder.example
            </a>
          </div>
          <div className="panel p-5">
            <h2 className="font-semibold">Support</h2>
            <p className="mt-2 text-sm text-fg-muted">
              Pro and Enterprise customers get priority email support.
            </p>
            <a href="mailto:support@datacenterbuilder.example" className="mt-3 inline-block text-sm text-primary underline">
              support@datacenterbuilder.example
            </a>
          </div>
          <div className="panel p-5">
            <h2 className="font-semibold">Security disclosures</h2>
            <p className="mt-2 text-sm text-fg-muted">
              Please report vulnerabilities to our security team. We aim to
              acknowledge within 24 hours and patch within 7 days for high-severity
              issues.
            </p>
            <a href="mailto:security@datacenterbuilder.example" className="mt-3 inline-block text-sm text-primary underline">
              security@datacenterbuilder.example
            </a>
            <p className="mt-2 text-xs text-fg-muted">PGP key: <Link href="/.well-known/security.txt" className="underline">security.txt</Link></p>
          </div>
          <div className="panel p-5">
            <h2 className="font-semibold">Press &amp; partnerships</h2>
            <p className="mt-2 text-sm text-fg-muted">
              Media inquiries, integration partnerships, academic licensing.
            </p>
            <a href="mailto:press@datacenterbuilder.example" className="mt-3 inline-block text-sm text-primary underline">
              press@datacenterbuilder.example
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
