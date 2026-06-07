import { AppHeader } from '@/components/layout/AppHeader';

const PROJECTS = [
  'Next.js and React',
  'React Three Fiber, Drei, and three.js',
  'Zustand and zundo',
  'wagmi, viem, and WalletConnect',
  'Solana wallet adapters',
  'Vitest and Testing Library',
  'Tailwind CSS and Lucide icons',
];

export default function CreditsPage() {
  return (
    <div className="min-h-screen bg-bg">
      <AppHeader />
      <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-bold">Credits</h1>
        <p className="mt-2 text-fg-muted">
          Datacenter Builder Simulator is built on open-source software and publicly documented
          data-center standards.
        </p>
        <ul className="panel mt-8 divide-y divide-border p-5">
          {PROJECTS.map((project) => <li key={project} className="py-3 first:pt-0 last:pb-0">{project}</li>)}
        </ul>
        <p className="mt-6 text-sm text-fg-muted">
          Product scoring is educational guidance, not certification by the cited standards bodies.
        </p>
      </main>
    </div>
  );
}
