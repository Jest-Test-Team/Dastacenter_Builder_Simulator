import Link from 'next/link';

export default function AiPolicyPage() {
  return (
    <div className="min-h-screen overflow-y-auto bg-bg">
      <header className="border-b border-border bg-bg-panel/80">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Link href="/" className="font-semibold">🖥️ Datacenter Builder</Link>
          <Link href="/build/free" className="btn text-sm">Build</Link>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold">AI Use Policy</h1>
        <p className="mt-1 text-xs text-fg-muted">Last updated: 2026-08-26.</p>

        <section className="mt-6 space-y-4 text-sm text-fg-muted">
          <p>
            This page describes how the Datacenter Builder Simulator uses
            and does not use AI, in line with the EU AI Act, NIST AI RMF,
            and our own commitments.
          </p>

          <h2 className="text-base font-semibold text-fg">What the simulator is</h2>
          <p>
            The scoring engine is a deterministic rules engine — it is not
            an AI. Every rule is hand-written, every score is byte-stable
            given the same input, and the certificate is verifiable by
            re-running the same engine on the same snapshot.
          </p>

          <h2 className="text-base font-semibold text-fg">Where AI appears today</h2>
          <ul className="list-disc space-y-1 pl-6">
            <li><strong>Compact tutor (live):</strong> a question box on the privacy-track curriculum pages. Its entire context is circuit source that is already public in our repository, plus the lesson you are reading. No build state, no score, no wallet data is sent. Answers name the model that produced them.</li>
            <li><strong>AI co-designer (planned):</strong> a natural-language interface that suggests a starting build. Its suggestions will be advisory; the scoring engine still has the final word, and every field sent to the model will be listed and individually toggleable before it is sent.</li>
          </ul>

          <h2 className="text-base font-semibold text-fg">Which model, and where it runs</h2>
          <p>
            AI features run on <strong>Cloudflare Workers AI</strong>, on the
            same infrastructure that already serves this site. We deliberately
            do not use a third-party model API: that would add a data processor
            to a product whose entire argument is about limiting disclosure.
            No prompt is used to train a model.
          </p>

          <h2 className="text-base font-semibold text-fg">Where AI is never used</h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>The scoring engine — never.</li>
            <li>The certificate generation — never.</li>
            <li>The SBT mint relay — never.</li>
            <li>Wallet authentication — never.</li>
          </ul>

          <h2 className="text-base font-semibold text-fg">What is sent</h2>
          <p>
            The Compact tutor sends only the question you type and an
            identifier for the lesson you are on. It does not send your build,
            your score, your wallet address, your browser fingerprint, or any
            analytics data.
          </p>
          <p>
            When the AI co-designer ships it will need to see something about
            your design to be useful. It will never receive the raw build.
            It will receive a declared projection &mdash; axis scores, failing
            rule identifiers, block counts by category &mdash; shown to you
            field by field, each one toggleable, before anything is sent. Grid
            coordinates and the knowledge-graph digest are never sent under any
            setting.
          </p>

          <h2 className="text-base font-semibold text-fg">Transparency</h2>
          <p>
            Any AI-generated content is clearly labeled with an "AI
            suggestion" badge. The scoring engine's verdict is always
            final.
          </p>

          <h2 className="text-base font-semibold text-fg">Right to opt out</h2>
          <p>
            Every AI feature is optional and none is required to build, score,
            prove or mint. The simulator works fully without it.
          </p>
        </section>
      </main>
    </div>
  );
}
