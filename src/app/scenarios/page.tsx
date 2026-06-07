import Link from 'next/link';
import { ArrowRight, Clock, Gauge, Star } from 'lucide-react';
import { SCENARIOS } from '@/lib/scenarios';
import { AppHeader } from '@/components/layout/AppHeader';

export const metadata = { title: 'Scenarios — Datacenter Builder Simulator' };

export default function ScenariosPage() {
  return (
    <div className="min-h-screen overflow-y-auto bg-bg">
      <AppHeader current="learn" />
      <main id="main" tabIndex={-1} className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-3xl font-bold">Scenarios</h1>
        <p className="mt-2 text-fg-muted">
          Pick a starting brief. Each scenario constrains inventory, emphasizes specific
          standards, and sets a goal.
        </p>

        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {SCENARIOS.map((s) => (
            <li
              key={s.id}
              className="panel relative flex flex-col gap-3 overflow-hidden p-5"
              style={{ borderTop: `3px solid ${s.accent}` }}
            >
              <div>
                <h2 className="text-lg font-semibold">{s.name}</h2>
                <p className="text-sm text-fg-muted">{s.tagline}</p>
              </div>
              <p className="text-sm">{s.brief}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-fg-muted">
                <span className="badge flex items-center gap-1">
                  <Gauge className="h-3 w-3" /> {s.difficulty}/5
                </span>
                <span className="badge flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {s.estMinutes} min
                </span>
                {s.goal?.tier && (
                  <span className="badge flex items-center gap-1">
                    <Star className="h-3 w-3" /> Goal: Tier {s.goal.tier}
                  </span>
                )}
                {s.goal?.maxPue && (
                  <span className="badge">PUE ≤ {s.goal.maxPue}</span>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {s.focus.map((f) => (
                  <span key={f} className="badge text-[10px]">{f}</span>
                ))}
              </div>
              <Link
                href={`/build/${s.id}`}
                className="btn mt-2 self-start"
                style={{ background: s.accent }}
              >
                Start <ArrowRight className="h-4 w-4" />
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
