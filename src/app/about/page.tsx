import Link from 'next/link';
import { Github, Twitter, Mail } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen overflow-y-auto bg-bg">
      <header className="border-b border-border bg-bg-panel/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <Link href="/" className="font-semibold">🖥️ Datacenter Builder</Link>
          <Link href="/build/free" className="btn text-sm">Build</Link>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-bold">About</h1>
        <p className="mt-4 text-fg-muted">
          Datacenter Builder Simulator is a pure-frontend SaaS that lets you
          design a data center in a Lego/Minecraft-style 3D builder, run a
          SimCity-like simulation, and earn a verifiable certificate rated
          against Uptime Institute, TIA-942, EN 50600, ASHRAE, NFPA, ISO 27001,
          and the EU / Singapore / Germany / China energy codes.
        </p>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Why we built it</h2>
          <p className="mt-2 text-fg-muted">
            Most data-center training material is either a 600-page PDF or a
            3-day instructor-led class. We wanted a 5-minute interactive
            experience that produces a portable, verifiable artifact (the
            certificate) — useful for hiring, for learning, and for fun.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Principles</h2>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-fg-muted">
            <li><strong>Pure-frontend:</strong> no email, no account, no server-side data. Wallet signatures are the only auth.</li>
            <li><strong>Standards-cited:</strong> every rule links to its source.</li>
            <li><strong>Deterministic:</strong> the same build always produces the same score and the same certificate.</li>
            <li><strong>Privacy by default:</strong> no third-party analytics unless you opt in.</li>
            <li><strong>Open:</strong> the engine, rules, and curriculum are open source (MIT).</li>
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Contact</h2>
          <ul className="mt-2 space-y-1 text-fg-muted">
            <li className="flex items-center gap-2"><Mail className="h-4 w-4" /> hello@datacenterbuilder.example</li>
            <li className="flex items-center gap-2"><Github className="h-4 w-4" /> github.com/datacenter-builder</li>
            <li className="flex items-center gap-2"><Twitter className="h-4 w-4" /> @dcbuilder</li>
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Acknowledgements</h2>
          <p className="mt-2 text-fg-muted">
            Built with Next.js, React Three Fiber, Wagmi, Iron Session, and
            the open standards bodies whose work makes this simulator
            possible: Uptime Institute, TIA, CENELEC, ASHRAE, NFPA, ISO/IEC,
            the European Commission, Singapore BCA, German BMWK, and the
            Chinese NDRC.
          </p>
        </section>
      </main>
    </div>
  );
}
