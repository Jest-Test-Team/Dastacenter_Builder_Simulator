import Link from 'next/link';
import { Check, X } from 'lucide-react';

const TIERS = [
  {
    name: 'Free',
    price: '$0',
    blurb: 'Build, score, and certify. No account needed.',
    cta: { label: 'Start building', href: '/build/free' },
    features: [
      { label: 'Unlimited builds', yes: true },
      { label: 'All 7 block categories + policy panel', yes: true },
      { label: 'All standards-cited scoring', yes: true },
      { label: 'Verifiable SVG certificate', yes: true },
      { label: 'IndexedDB persistence', yes: true },
      { label: 'Share link (LZ-compressed)', yes: true },
      { label: 'Cloud sync across devices', yes: false },
      { label: 'Credly publish', yes: true },
      { label: 'Curriculum reading UI', yes: true },
      { label: 'L2 sim (OPEX, staffing)', yes: false },
    ],
  },
  {
    name: 'Pro',
    price: '$8 / mo',
    blurb: 'Cloud sync, more scenarios, Pro-only sim depth.',
    cta: { label: 'Upgrade to Pro', href: '/pricing#pro' },
    features: [
      { label: 'Everything in Free', yes: true },
      { label: 'Cloud sync (E2EE, 100 saves)', yes: true },
      { label: 'Multiplayer co-build', yes: true },
      { label: 'Pre-built scenarios (hyperscale, edge, retrofit)', yes: true },
      { label: 'L2 simulation depth', yes: true },
      { label: 'Priority support', yes: true },
    ],
    featured: true,
  },
  {
    name: 'Enterprise',
    price: 'Contact us',
    blurb: 'On-prem, SSO, audit log, custom block libraries.',
    cta: { label: 'Talk to sales', href: '/contact' },
    features: [
      { label: 'Everything in Pro', yes: true },
      { label: 'On-prem / VPC deploy', yes: true },
      { label: 'SSO (Okta, Azure AD, Google)', yes: true },
      { label: 'Audit log export', yes: true },
      { label: 'Custom block libraries', yes: true },
      { label: 'Custom standards packs', yes: true },
      { label: 'Dedicated CSM', yes: true },
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen overflow-y-auto bg-bg">
      <header className="border-b border-border bg-bg-panel/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" className="font-semibold">🖥️ Datacenter Builder</Link>
          <Link href="/build/free" className="btn text-sm">Start building</Link>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-3xl font-bold">Pricing</h1>
        <p className="mt-2 text-fg-muted">The simulator is free. We charge for sync, multiplayer, and enterprise integrations.</p>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={
                'panel flex flex-col p-6 ' +
                (t.featured ? 'border-primary shadow-lg shadow-primary/10' : '')
              }
            >
              <h2 className="text-lg font-semibold">{t.name}</h2>
              <p className="mt-1 text-2xl font-bold">{t.price}</p>
              <p className="mt-1 text-sm text-fg-muted">{t.blurb}</p>
              <Link href={t.cta.href} className={'mt-4 ' + (t.featured ? 'btn' : 'btn-ghost')}>
                {t.cta.label}
              </Link>
              <ul className="mt-6 space-y-2 text-sm">
                {t.features.map((f) => (
                  <li key={f.label} className="flex items-center gap-2">
                    {f.yes ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <X className="h-4 w-4 text-fg-muted" />
                    )}
                    <span className={f.yes ? '' : 'text-fg-muted line-through'}>{f.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <section className="mt-16">
          <h2 className="text-xl font-semibold">FAQ</h2>
          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="font-medium">Is there a free tier forever?</dt>
              <dd className="mt-1 text-fg-muted">Yes. Free includes the full builder and scoring engine. We charge for things that need our infrastructure (sync, multiplayer, Credly relay).</dd>
            </div>
            <div>
              <dt className="font-medium">Do you offer student / educator pricing?</dt>
              <dd className="mt-1 text-fg-muted">Yes — 50% off Pro for verified .edu addresses. Email us from your school account.</dd>
            </div>
            <div>
              <dt className="font-medium">Can we host it ourselves?</dt>
              <dd className="mt-1 text-fg-muted">Yes. The full stack is open-source (MIT). The Enterprise tier adds SSO, audit, and on-prem support contracts.</dd>
            </div>
            <div>
              <dt className="font-medium">Refunds?</dt>
              <dd className="mt-1 text-fg-muted">30-day, no-questions-asked. Cancel from your account page.</dd>
            </div>
          </dl>
        </section>
      </main>
    </div>
  );
}
