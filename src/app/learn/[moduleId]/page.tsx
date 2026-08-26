import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getModule, modules, nextModule, previousModule } from '@/lib/content/modules';
import { LessonBody } from '@/components/learn/LessonBody';
import { CodeBlock } from '@/components/learn/CodeBlock';
import { ModuleQuiz } from '@/components/learn/ModuleQuiz';
import { ModuleComplete } from '@/components/learn/ModuleComplete';
import { CompactTutor } from '@/components/learn/CompactTutor';
import { CapstonePanel } from '@/components/learn/CapstonePanel';
import { ArrowRight, ArrowLeft, BookOpen } from 'lucide-react';

export default async function ModulePage({ params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  const m = getModule(moduleId);
  if (!m) notFound();
  const previous = previousModule(m.id);
  const next = nextModule(m.id);

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

      <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-xs uppercase tracking-wide text-fg-muted">
          {m.track === 'privacy' ? 'Privacy track · ' : ''}
          {m.level}
        </p>
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
              <LessonBody body={l.body} />
              {l.code.map((block, j) => (
                <CodeBlock key={j} block={block} />
              ))}
            </article>
          ))}
        </section>

        {m.track === 'privacy' && !next && <CapstonePanel moduleId={m.id} />}

        {m.track === 'privacy' && <CompactTutor moduleId={m.id} />}

        {m.quiz.length > 0 ? (
          <ModuleQuiz moduleId={m.id} quiz={m.quiz} />
        ) : (
          <div className="mt-10 flex justify-end">
            <ModuleComplete moduleId={m.id} />
          </div>
        )}

        <nav
          aria-label="Module navigation"
          className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6"
        >
          {previous ? (
            <Link href={`/learn/${previous.id}`} className="btn-ghost">
              <ArrowLeft className="h-4 w-4" />
              Prereq: {previous.title}
            </Link>
          ) : (
            <Link href="/learn" className="btn-ghost">
              <ArrowLeft className="h-4 w-4" />
              All modules
            </Link>
          )}
          <div className="flex flex-wrap gap-3">
            {m.scenarioId && (
              <Link href={`/build/${m.scenarioId}`} className="btn-ghost">
                Try the scenario
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            {next && (
              <Link href={`/learn/${next.id}`} className="btn">
                Next: {next.title}
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </nav>
      </main>
    </div>
  );
}

export function generateStaticParams() {
  return modules.map((m) => ({ moduleId: m.id }));
}
