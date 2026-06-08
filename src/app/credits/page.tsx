import Link from 'next/link';
import { AppHeader } from '@/components/layout/AppHeader';
import { ExternalLink } from 'lucide-react';

interface CreditEntry {
  name: string;
  url: string;
  license: string;
  category: string;
}

const CREDITS: CreditEntry[] = [
  { name: 'Next.js', url: 'https://nextjs.org', license: 'MIT', category: 'Framework' },
  { name: 'React', url: 'https://react.dev', license: 'MIT', category: 'Framework' },
  { name: 'TypeScript', url: 'https://www.typescriptlang.org', license: 'Apache-2.0', category: 'Framework' },
  { name: 'React Three Fiber', url: 'https://r3f.docs.pmnd.rs', license: 'MIT', category: '3D Rendering' },
  { name: 'Three.js', url: 'https://threejs.org', license: 'MIT', category: '3D Rendering' },
  { name: '@react-three/drei', url: 'https://github.com/pmndrs/drei', license: 'MIT', category: '3D Rendering' },
  { name: 'Zustand', url: 'https://github.com/pmndrs/zustand', license: 'MIT', category: 'State Management' },
  { name: 'zundo', url: 'https://github.com/charkour/zundo', license: 'MIT', category: 'State Management' },
  { name: 'Tailwind CSS', url: 'https://tailwindcss.com', license: 'MIT', category: 'Styling' },
  { name: 'Lucide Icons', url: 'https://lucide.dev', license: 'ISC', category: 'Styling' },
  { name: 'wagmi', url: 'https://wagmi.sh', license: 'MIT', category: 'Wallet Auth' },
  { name: 'viem', url: 'https://viem.sh', license: 'MIT', category: 'Wallet Auth' },
  { name: 'Solana Wallet Adapter', url: 'https://github.com/solana-labs/wallet-adapter', license: 'MIT', category: 'Wallet Auth' },
  { name: 'Zod', url: 'https://zod.dev', license: 'MIT', category: 'Validation' },
  { name: 'idb-keyval', url: 'https://github.com/jakearchibald/idb-keyval', license: 'ISC', category: 'Persistence' },
  { name: 'lz-string', url: 'https://github.com/pieroxy/lz-string', license: 'MIT', category: 'Persistence' },
  { name: 'qrcode.react', url: 'https://github.com/zpao/qrcode.react', license: 'ISC', category: 'Certificate' },
  { name: 'jose', url: 'https://github.com/panva/jose', license: 'MIT', category: 'Auth' },
  { name: 'iron-session', url: 'https://github.com/vvo/iron-session', license: 'MIT', category: 'Auth' },
  { name: 'siwe', url: 'https://github.com/spruceid/siwe', license: 'Apache-2.0', category: 'Auth' },
  { name: 'Vitest', url: 'https://vitest.dev', license: 'MIT', category: 'Testing' },
  { name: 'Testing Library', url: 'https://testing-library.com', license: 'MIT', category: 'Testing' },
  { name: 'ESLint', url: 'https://eslint.org', license: 'MIT', category: 'Quality' },
  { name: 'Prettier', url: 'https://prettier.io', license: 'MIT', category: 'Quality' },
  { name: 'PostHog', url: 'https://posthog.com', license: 'MIT', category: 'Analytics' },
];

const STANDARDS = [
  { name: 'Uptime Institute Tier Standard', url: 'https://uptimeinstitute.com/tier-certification' },
  { name: 'TIA-942', url: 'https://www.tiaonline.org/standards/tia-942/' },
  { name: 'EN 50600', url: 'https://www.cenelec.eu/dyn/www/f?p=205:110:0::::FSP_ORG_ID,FSP_LANG_ID:12438,25' },
  { name: 'ASHRAE TC 9.9', url: 'https://www.ashrae.org/technical-resources/technical-books/thermal-guidelines' },
  { name: 'NFPA 75', url: 'https://www.nfpa.org/codes-and-standards/nfpa-75-standard-development/75' },
  { name: 'NFPA 2001', url: 'https://www.nfpa.org/codes-and-standards/nfpa-2001-standard-development/2001' },
  { name: 'ISO/IEC 27001', url: 'https://www.iso.org/isoiec-27001-information-security.html' },
  { name: 'NIST CSF', url: 'https://www.nist.gov/cyberframework' },
  { name: 'EU Energy Efficiency Directive', url: 'https://energy.ec.europa.eu/topics/energy-efficiency/energy-performance-buildings/energy-efficiency-directive_en' },
  { name: 'Germany EnEfG', url: 'https://www.gesetze-im-internet.de/energieeffizienzgesetz/' },
];

const CATEGORIES = [...new Set(CREDITS.map((c) => c.category))];

export default function CreditsPage() {
  return (
    <div className="min-h-screen overflow-y-auto bg-bg">
      <AppHeader />
      <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-bold">Credits &amp; Attributions</h1>
        <p className="mt-2 text-fg-muted">
          Datacenter Builder Simulator is built on open-source software and informed by
          publicly documented data-center standards. Thank you to all the projects and
          standards bodies listed below.
        </p>

        {CATEGORIES.map((category) => (
          <section key={category} className="mt-8">
            <h2 className="text-lg font-semibold">{category}</h2>
            <ul className="panel mt-3 divide-y divide-border">
              {CREDITS.filter((c) => c.category === category).map((credit) => (
                <li key={credit.name} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <span className="font-medium">{credit.name}</span>
                    <span className="ml-2 text-xs text-fg-muted">{credit.license}</span>
                  </div>
                  <a
                    href={credit.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Website
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className="mt-12">
          <h2 className="text-lg font-semibold">Standards Referenced</h2>
          <p className="mt-1 text-sm text-fg-muted">
            Every scoring rule cites its source standard. The links below are to the
            standards bodies — the simulator is not certified or endorsed by any of them.
          </p>
          <ul className="panel mt-3 divide-y divide-border">
            {STANDARDS.map((std) => (
              <li key={std.name} className="flex items-center justify-between px-5 py-3">
                <span className="font-medium">{std.name}</span>
                <a
                  href={std.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Source
                </a>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-8 text-sm text-fg-muted">
          Product scoring is educational guidance only. It is not certification by the
          referenced standards bodies.
        </p>

        <div className="mt-6 flex gap-3">
          <Link href="/" className="btn-ghost text-sm">
            Back to home
          </Link>
          <Link href="/help" className="btn-ghost text-sm">
            Help &amp; FAQ
          </Link>
        </div>
      </main>
    </div>
  );
}
