import Link from 'next/link';
import { modules } from '@/lib/content/modules';
import { BookOpen, Clock, ArrowRight } from 'lucide-react';

export default function LearnIndex() {
  return (
    <div className="min-h-screen overflow-y-auto bg-bg">
      <header className="border-b border-border bg-bg-panel/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="text-2xl">🖥️</span>
            <span>Datacenter Builder</span>
          </Link>
          <Link href="/build/free" className="btn text-sm">
            Free build <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <BookOpen className="h-6 w-6" />
          Curriculum
        </h1>
        <p className="mt-1 text-fg-muted">
          Eight modules, ~5 hours of content, mapped to international standards.
        </p>

        <ul className="mt-8 space-y-3">
          {modules.map((m) => (
            <li key={m.id}>
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
                  </div>
                  <h2 className="mt-2 text-lg font-semibold">{m.title}</h2>
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
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
