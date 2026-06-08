/**
 * Help & FAQ page.
 *
 * Comprehensive guide for using the simulator, with FAQ, keyboard
 * shortcuts, troubleshooting, and links to key features.
 */

import Link from 'next/link';
import { AppHeader } from '@/components/layout/AppHeader';
import {
  BookOpen,
  Play,
  Shield,
  Award,
  AlertTriangle,
  Keyboard,
  Server,
  Wrench,
  HelpCircle,
} from 'lucide-react';

const SHORTCUTS: [string, string][] = [
  ['1-9', 'Select a hotbar slot'],
  ['R', 'Rotate the active block'],
  ['Escape', 'Cancel placement or close a panel'],
  ['Shift+Z / Shift+Y', 'Undo / redo'],
  ['Delete', 'Remove selected block'],
  ['?', 'Open the keyboard reference'],
  ['Space', 'Toggle play/pause in simulation'],
];

const FAQ: { q: string; a: string }[] = [
  {
    q: 'What is Datacenter Builder Simulator?',
    a: 'A pure-frontend simulator that lets you build a data center in a 3D Lego-style grid, then rate your design against international standards (Uptime, TIA-942, ASHRAE, NFPA, ISO 27001, EU EED, etc.).',
  },
  {
    q: 'Do I need to sign up?',
    a: 'No. Sign in with a crypto wallet (MetaMask, Phantom, WalletConnect). No email, no password. Your wallet address is your identity.',
  },
  {
    q: 'Where is my build stored?',
    a: "In your browser's IndexedDB. Nothing is sent to a server unless you choose to publish to Credly. You can export your build as JSON at any time.",
  },
  {
    q: 'Can I share my build?',
    a: 'Yes — the share button copies a URL that encodes your build. Anyone with the URL can load it on their machine.',
  },
  {
    q: 'How do I reset everything?',
    a: 'Go to Settings and click "Delete all". This removes all local builds from IndexedDB.',
  },
  {
    q: 'What standards does the scoring engine use?',
    a: 'Uptime Tier I-IV, TIA-942, EN 50600, ASHRAE TC 9.9, NFPA 75/2001/110, ISO 27001, NIST CSF, EU EED 2023, Germany EnEfG, Singapore DIA, and China PUE. Every rule cites its source.',
  },
  {
    q: 'What is a "demo build"?',
    a: 'Pre-built data center configurations you can load and explore. They demonstrate real-world designs and are shareable via URL. Visit /demos to try them.',
  },
  {
    q: 'How does certificate verification work?',
    a: 'Each certificate has a unique ID and QR code. Scan it or visit /verify to check if a certificate is valid. Verification runs entirely in-browser.',
  },
  {
    q: 'Can I run the simulation?',
    a: 'Yes — click "Simulate" in the builder mode bar. The simulation runs a time loop with random events, NPC visitors, and live gauges for power, temperature, and cost.',
  },
  {
    q: 'Is this open source?',
    a: 'Yes, released under the MIT license. See the credits page for all dependencies and attributions.',
  },
];

export default function HelpPage() {
  return (
    <div className="min-h-screen overflow-y-auto bg-bg">
      <AppHeader />
      <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-bold">Help &amp; FAQ</h1>
        <p className="mt-2 text-fg-muted">
          Everything you need to know about using the Datacenter Builder Simulator.
        </p>

        {/* Quick links */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickLink
            icon={<Play className="h-5 w-5" />}
            label="Start building"
            href="/build/free"
          />
          <QuickLink
            icon={<Server className="h-5 w-5" />}
            label="Demo builds"
            href="/demos"
          />
          <QuickLink
            icon={<BookOpen className="h-5 w-5" />}
            label="Curriculum"
            href="/learn"
          />
          <QuickLink
            icon={<Shield className="h-5 w-5" />}
            label="Verify cert"
            href="/verify"
          />
        </div>

        {/* Keyboard shortcuts */}
        <section className="panel mt-8 p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Keyboard className="h-5 w-5 text-primary" />
            Builder controls
          </h2>
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-5 gap-y-3 text-sm">
            {SHORTCUTS.map(([keys, description]) => (
              <div key={keys} className="contents">
                <dt>
                  <kbd className="rounded border border-border bg-bg-subtle px-2 py-1 font-mono text-xs">
                    {keys}
                  </kbd>
                </dt>
                <dd className="text-fg-muted">{description}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* FAQ */}
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <HelpCircle className="h-5 w-5 text-primary" />
            Frequently asked questions
          </h2>
          <div className="mt-4 space-y-3">
            {FAQ.map((item) => (
              <details key={item.q} className="group panel overflow-hidden">
                <summary className="flex cursor-pointer items-center justify-between px-5 py-3 text-sm font-medium hover:bg-bg-subtle">
                  {item.q}
                  <span className="text-fg-muted transition-transform group-open:rotate-90">
                    ▸
                  </span>
                </summary>
                <div className="border-t border-border px-5 py-3 text-sm text-fg-muted">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Troubleshooting */}
        <section className="panel mt-8 p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Wrench className="h-5 w-5 text-warn" />
            Troubleshooting
          </h2>
          <div className="mt-4 space-y-4 text-sm text-fg-muted">
            <div>
              <h3 className="font-medium text-fg">Builds disappeared</h3>
              <p className="mt-1">
                Builds are stored in this browser. Private browsing, clearing site data, or
                changing browsers can remove them. Use a share URL when you need a portable
                snapshot.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-fg">Wallet won't connect</h3>
              <p className="mt-1">
                Make sure MetaMask or Phantom is installed and unlocked. Try refreshing the
                page. If the problem persists, check that you're on a supported network.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-fg">Score seems wrong</h3>
              <p className="mt-1">
                The scoring engine is deterministic — the same build always gets the same
                score. Check the issue list in the result page to see exactly which rules
                are not met.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-fg">Certificate not verifiable</h3>
              <p className="mt-1">
                Visit <Link href="/verify" className="text-accent hover:underline">/verify</Link>{' '}
                and enter the cert ID from the QR code. If the build was deleted from your
                browser, the cert ID won't resolve.
              </p>
            </div>
          </div>
          <div className="mt-5 flex gap-3">
            <Link href="/scenarios" className="btn text-sm">
              Choose a scenario
            </Link>
            <Link href="/contact" className="btn-ghost text-sm">
              Contact support
            </Link>
          </div>
        </section>

        {/* More links */}
        <section className="mt-8 text-center">
          <p className="text-sm text-fg-muted">
            <Link href="/demos" className="text-accent hover:underline">
              Try a demo build
            </Link>{' '}
            ·{' '}
            <Link href="/learn" className="text-accent hover:underline">
              Read the curriculum
            </Link>{' '}
            ·{' '}
            <Link href="/credits" className="text-accent hover:underline">
              Credits &amp; attributions
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}

function QuickLink({
  icon,
  label,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="panel flex flex-col items-center gap-2 p-4 text-center transition-colors hover:bg-bg-subtle"
    >
      <div className="text-primary">{icon}</div>
      <span className="text-xs font-medium">{label}</span>
    </Link>
  );
}
