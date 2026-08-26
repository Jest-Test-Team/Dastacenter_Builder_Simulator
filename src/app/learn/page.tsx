import Link from 'next/link';
import { modulesInTrack, type Module, type ModuleTrack } from '@/lib/content/modules';
import { TrackProgress } from '@/components/learn/TrackProgress';
import { ModuleDone } from '@/components/learn/ModuleDone';
import { BookOpen, Clock, ArrowRight, ShieldCheck } from 'lucide-react';

const TRACKS: { id: ModuleTrack; title: string; blurb: string }[] = [
  {
    id: 'facility',
    title: 'Facility engineering',
    blurb: 'Eight modules, ~5 hours, mapped to international standards.',
  },
  {
    id: 'privacy',
    title: 'Privacy engineering with Compact',
    blurb:
      'Prove a facility is top-tier without disclosing it. Taught from the Midnight Compact contract this app actually ships.',
  },
];

function ModuleCard({ m }: { m: Module }) {
  return (
    <Link
      href={`/learn/${m.id}`}
      className="panel flex items-start justify-between gap-4 p-5 transition-colors hover:border-primary/50"
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`badge ${
              m.level === 'beginner'
                ? 'border-success/30 text-success'
                : m.level === 'intermediate'
                  ? 'border-warn/30 text-warn'
                  : 'border-danger/30 text-danger'
            }`}
          >
            {m.level}
          </span>
          <span className="flex items-center gap-1 text-xs text-fg-muted">
            <Clock className="h-3 w-3" />
            {m.estMinutes} min
          </span>
          <ModuleDone moduleId={m.id} />
        </div>
        <h3 className="mt-2 text-lg font-semibold">{m.title}</h3>
        <p className="mt-1 text-sm text-fg-muted">{m.summary}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {m.standards.map((s) => (
            <span key={s} className="badge text-[10px]">
              {s}
            </span>
          ))}
        </div>
      </div>
      <ArrowRight className="mt-1 h-5 w-5 text-fg-muted" />
    </Link>
  );
}

export default function LearnIndex() {
  return (
    <div className="min-h-screen overflow-y-auto bg-bg">
      <header className="border-b border-border bg-bg-panel/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="text-2xl">🖥️</span>
            <span>Datacenter Builder</span>
          </Link>
          <Link href="/build/free" className="btn text-sm">
            Free build <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <BookOpen className="h-6 w-6" />
          Curriculum
        </h1>
        <p className="mt-1 text-fg-muted">
          Two tracks: how to build the facility, and how to prove it without showing it.
        </p>

        {TRACKS.map((track) => {
          const trackModules = modulesInTrack(track.id);
          if (trackModules.length === 0) return null;
          return (
            <section key={track.id} className="mt-10">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                {track.id === 'privacy' && <ShieldCheck className="h-5 w-5 text-primary" />}
                {track.title}
              </h2>
              <p className="mt-1 text-sm text-fg-muted">{track.blurb}</p>
              <TrackProgress track={track.id} />
              <ul className="mt-4 space-y-3">
                {trackModules.map((m) => (
                  <li key={m.id}>
                    <ModuleCard m={m} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </main>
    </div>
  );
}
