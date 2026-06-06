/**
 * Landing page.
 */

import Link from 'next/link';
import {
  Box,
  Cpu,
  Shield,
  Award,
  Zap,
  Droplet,
  Flame,
  Network,
  BookOpen,
  PlayCircle,
  Wallet,
  ArrowRight,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-y-auto bg-bg">
      <Header />

      <main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-6 py-16">
        <section className="grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <h1 className="text-4xl font-bold leading-tight md:text-5xl">
              Build a data center.
              <br />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Earn the cert.
              </span>
            </h1>
            <p className="mt-4 text-lg text-fg-muted">
              A 3D Lego/Minecraft-style simulator that teaches you to design a real
              data center. Get rated against Uptime, TIA-942, EN 50600, ASHRAE, NFPA,
              ISO 27001, EU EED, and more — and publish a verifiable certificate to
              Credly.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/build/free" className="btn text-base">
                <PlayCircle className="h-5 w-5" />
                Start building
              </Link>
              <Link href="/learn" className="btn-ghost text-base">
                <BookOpen className="h-5 w-5" />
                Read the curriculum
              </Link>
            </div>
            <p className="mt-3 flex items-center gap-2 text-sm text-fg-muted">
              <Wallet className="h-4 w-4" /> Sign in with MetaMask or Phantom.
              No email needed.
            </p>
          </div>

          <div className="panel aspect-video overflow-hidden p-2">
            <div className="grid-bg flex h-full w-full items-center justify-center rounded">
              <div className="text-center">
                <div className="mb-2 text-6xl">🖥️</div>
                <p className="font-mono text-sm text-fg-muted">
                  [ Live 3D preview renders here ]
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-20">
          <h2 className="text-2xl font-semibold">What you build</h2>
          <p className="mt-2 text-fg-muted">
            Seven block categories, real engineering rules. Every block you place
            is read by the scoring engine.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard icon={<Box className="h-6 w-6" />} title="Structure" desc="Floor tiles, fire walls, mantraps." />
            <FeatureCard icon={<Zap className="h-6 w-6" />} title="Power" desc="Utility → Transformer → UPS → Generator → PDU." color="power" />
            <FeatureCard icon={<Droplet className="h-6 w-6" />} title="Cooling" desc="CRAC, in-row, CDU, immersion." color="cooling" />
            <FeatureCard icon={<Cpu className="h-6 w-6" />} title="IT" desc="Racks, blades, ToR switches, GPU pods, SDN." color="it" />
            <FeatureCard icon={<Flame className="h-6 w-6" />} title="Safety" desc="VESDA, FM-200, EPO, MFA readers." color="safety" />
            <FeatureCard icon={<Network className="h-6 w-6" />} title="Network" desc="Firewalls, IDS/IPS, WAF, SIEM, honeypots." color="network" />
            <FeatureCard icon={<Shield className="h-6 w-6" />} title="Security Policy" desc="5 functions × 3 deterrence types. Toggles." />
            <FeatureCard icon={<Award className="h-6 w-6" />} title="Certificate" desc="Wallet-signed, Credly-issuable, verifiable." />
          </div>
        </section>

        <section className="mt-20">
          <h2 className="text-2xl font-semibold">Standards covered</h2>
          <p className="mt-2 text-fg-muted">
            Every rule cites its source. You can drill down from any issue to the
            standard.
          </p>
          <div className="mt-6 grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {STANDARDS.map((s) => (
              <div key={s} className="panel p-3 text-sm font-medium">
                {s}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20">
          <h2 className="text-2xl font-semibold">How it works</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            <Step n={1} title="Sign in with your wallet">
              MetaMask or Phantom. No email, no password.
            </Step>
            <Step n={2} title="Build your data center">
              Click to place blocks. Snap to grid, rotate, undo. Use the policy
              panel to set non-3D controls.
            </Step>
            <Step n={3} title="Get rated & claim your cert">
              See your Uptime Tier, PUE, security score. Optionally publish to
              Credly.
            </Step>
          </ol>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-fg-muted">
        <p>
          Built for engineers, students, and certification-track professionals.
          <br />
          Open source · <Link href="/legal/terms" className="underline">Terms</Link>{' · '}
          <Link href="/legal/privacy" className="underline">Privacy</Link>
        </p>
      </footer>
    </div>
  );
}

const STANDARDS = [
  'Uptime Tier I-IV',
  'TIA-942',
  'EN 50600',
  'ASHRAE TC 9.9',
  'NFPA 75',
  'NFPA 2001',
  'NFPA 110',
  'ISO/IEC 27001',
  'NIST CSF',
  'EU EED 2023',
  'Germany EnEfG',
  'Singapore DIA',
  'China PUE',
  'GDPR',
  'CCPA',
  'PIPL',
];

function Header() {
  return (
    <header className="border-b border-border bg-bg-panel/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="text-2xl">🖥️</span>
          <span>Datacenter Builder</span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link href="/learn" className="btn-ghost text-sm">Curriculum</Link>
          <Link href="/build/free" className="btn text-sm">
            Build
            <ArrowRight className="h-4 w-4" />
          </Link>
        </nav>
      </div>
    </header>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  color?: string;
}) {
  return (
    <div className="panel p-4">
      <div
        className={`mb-2 inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-subtle text-${color ?? 'fg'}`}
      >
        {icon}
      </div>
      <div className="font-medium">{title}</div>
      <div className="mt-1 text-sm text-fg-muted">{desc}</div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="panel p-5">
      <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-fg">
        {n}
      </div>
      <h3 className="font-medium">{title}</h3>
      <p className="mt-1 text-sm text-fg-muted">{children}</p>
    </li>
  );
}
