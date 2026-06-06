/* eslint-disable react/no-unescaped-entities */
import Link from 'next/link';

export default function AiPolicyPage() {
  return (
    <div className="min-h-screen overflow-y-auto bg-bg">
      <header className="border-b border-border bg-bg-panel/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <Link href="/" className="font-semibold">🖥️ Datacenter Builder</Link>
          <Link href="/build/free" className="btn text-sm">Build</Link>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-bold">AI Use Policy</h1>
        <p className="mt-1 text-xs text-fg-muted">Last updated: 2026-01-15.</p>

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

          <h2 className="text-base font-semibold text-fg">Where AI may appear</h2>
          <ul className="list-disc space-y-1 pl-6">
            <li><strong>Optional "AI co-designer" (planned v2.0):</strong> a natural-language interface that suggests a starting build. It uses a third-party LLM (e.g. OpenAI) and the suggestions are advisory; the scoring engine still has the final word.</li>
            <li><strong>Support chatbot (planned):</strong> when enabled, will be clearly labeled as AI. Will not have access to wallet data.</li>
          </ul>

          <h2 className="text-base font-semibold text-fg">Where AI is never used</h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>The scoring engine — never.</li>
            <li>The certificate generation — never.</li>
            <li>The Credly push — never.</li>
            <li>Wallet authentication — never.</li>
          </ul>

          <h2 className="text-base font-semibold text-fg">Data sent to AI providers</h2>
          <p>
            If you use the AI co-designer, the natural-language prompt you
            type and the build state you are currently editing are sent to
            our LLM provider. We do not send your wallet address, your
            browser fingerprint, or any analytics data. We never use your
            prompts to train a model.
          </p>

          <h2 className="text-base font-semibold text-fg">Transparency</h2>
          <p>
            Any AI-generated content is clearly labeled with an "AI
            suggestion" badge. The scoring engine's verdict is always
            final.
          </p>

          <h2 className="text-base font-semibold text-fg">Right to opt out</h2>
          <p>
            You can disable the AI co-designer in Settings → AI. The
            simulator works fully without it.
          </p>
        </section>
      </main>
    </div>
  );
}
