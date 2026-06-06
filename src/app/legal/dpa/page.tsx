/* eslint-disable react/no-unescaped-entities */
import Link from 'next/link';

export default function DpaPage() {
  return (
    <div className="min-h-screen overflow-y-auto bg-bg">
      <header className="border-b border-border bg-bg-panel/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <Link href="/" className="font-semibold">🖥️ Datacenter Builder</Link>
          <Link href="/build/free" className="btn text-sm">Build</Link>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-bold">Data Processing Addendum (DPA)</h1>
        <p className="mt-1 text-xs text-fg-muted">Last updated: 2026-01-15. Template — to be countersigned by both parties for Enterprise engagements.</p>

        <section className="mt-6 space-y-4 text-sm text-fg-muted">
          <p>
            This Data Processing Addendum ("DPA") forms part of the Master
            Services Agreement ("MSA") between the customer ("Controller")
            and the operator of the Datacenter Builder Simulator
            ("Processor") and reflects the parties' agreement with respect
            to the Processing of Personal Data.
          </p>

          <h2 className="text-base font-semibold text-fg">1. Definitions</h2>
          <p>
            "Personal Data," "Process," "Controller," "Processor," "Data
            Subject," and "Supervisory Authority" have the meanings given
            in the EU General Data Protection Regulation (Regulation (EU)
            2016/679, "GDPR") and equivalent terms in the UK GDPR, CCPA,
            and PIPL.
          </p>

          <h2 className="text-base font-semibold text-fg">2. Scope and roles</h2>
          <p>
            The parties acknowledge that the Service processes no Personal
            Data by default. Where the Controller instructs the Processor
            to Process Personal Data on its behalf (for example, by
            enabling the optional analytics module or by storing builds in
            cloud sync), the Processor acts as Processor and the
            Controller retains all rights and obligations of a Controller.
          </p>

          <h2 className="text-base font-semibold text-fg">3. Processor obligations</h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>Process Personal Data only on documented instructions of the Controller.</li>
            <li>Ensure confidentiality of authorized persons.</li>
            <li>Implement appropriate technical and organizational measures (see Annex A).</li>
            <li>Engage sub-processors only with prior notice and a right to object.</li>
            <li>Assist the Controller with data-subject requests.</li>
            <li>Delete or return all Personal Data at the end of the engagement.</li>
            <li>Make available all information necessary to demonstrate compliance.</li>
          </ul>

          <h2 className="text-base font-semibold text-fg">4. Sub-processors</h2>
          <p>
            Current sub-processors: Vercel Inc. (hosting, edge network,
            KV), Cloudflare (DDoS protection, optional). A list of
            sub-processors is maintained at /legal/sub-processors.
          </p>

          <h2 className="text-base font-semibold text-fg">5. International transfers</h2>
          <p>
            For transfers outside the EEA, UK, or Switzerland, the
            Processor relies on the European Commission's Standard
            Contractual Clauses (Module 2 or 3 as applicable) and the UK
            International Data Transfer Addendum.
          </p>

          <h2 className="text-base font-semibold text-fg">6. Annex A — Technical measures</h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>TLS 1.3 in transit; AES-256 at rest for cloud-synced builds.</li>
            <li>HTTP security headers (HSTS, CSP, X-Frame-Options, Referrer-Policy).</li>
            <li>Wallet signatures as the only authentication.</li>
            <li>No third-party tracking scripts.</li>
            <li>Quarterly dependency audits; annual third-party pen test.</li>
          </ul>

          <h2 className="text-base font-semibold text-fg">7. Contact</h2>
          <p>dpo@datacenterbuilder.example</p>
        </section>
      </main>
    </div>
  );
}
