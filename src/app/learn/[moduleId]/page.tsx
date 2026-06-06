import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getModule, modules } from '@/lib/content/modules';
import { ArrowRight, ArrowLeft, BookOpen } from 'lucide-react';

export default async function ModulePage({ params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  const m = getModule(moduleId);
  if (!m) notFound();
  const next = modules.find((x) => x.id === m.prerequisites[0]);

  return (
    <div className="min-h-screen overflow-y-auto bg-bg">
      <header className="border-b border-border bg-bg-panel/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="text-2xl">🖥️</span>
            <span>Datacenter Builder</span>
          </Link>
          <Link href="/learn" className="btn-ghost text-sm">
            <BookOpen className="h-4 w-4" /> All modules
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-xs uppercase tracking-wide text-fg-muted">{m.level}</p>
        <h1 className="mt-1 text-3xl font-bold">{m.title}</h1>
        <p className="mt-2 text-lg text-fg-muted">{m.summary}</p>

        <div className="mt-4 flex flex-wrap gap-1">
          {m.standards.map((s) => (
            <span key={s} className="badge">
              {s}
            </span>
          ))}
        </div>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">What you will learn</h2>
          <ul className="mt-3 list-disc space-y-1 pl-6 text-fg-muted">
            {m.learningObjectives.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </section>

        <section className="mt-8 space-y-6">
          {m.lessons.map((l, i) => (
            <article key={i} className="panel p-5">
              <h3 className="font-semibold">
                {i + 1}. {l.title}
              </h3>
              <p className="mt-2 whitespace-pre-line text-fg-muted">{l.body}</p>
            </article>
          ))}
        </section>

        <section className="mt-10 flex flex-wrap items-center justify-between gap-3">
          {next ? (
            <Link href={`/learn/${next.id}`} className="btn-ghost">
              <ArrowLeft className="h-4 w-4" />
              Prereq: {next.title}
            </Link>
          ) : (
            <Link href="/learn" className="btn-ghost">
              <ArrowLeft className="h-4 w-4" />
              All modules
            </Link>
          )}
          {m.scenarioId && (
            <Link href={`/build/${m.scenarioId}`} className="btn">
              Try the scenario
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </section>
      </main>
    </div>
  );
}

export function generateStaticParams() {
  return modules.map((m) => ({ moduleId: m.id }));
}
