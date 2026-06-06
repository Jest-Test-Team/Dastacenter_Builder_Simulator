/**
 * Result / rating page.
 *
 * Shows the scorecard, breakdown radar, issue list with citations, and
 * a "Claim Certificate" button that hands off to /cert/[buildId].
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  type RatingReport,
  score,
  type Issue,
} from '@/lib/scoring';
import { useBuildStore } from '@/lib/store/build-store';
import { useLoadBuild } from '@/lib/persist';
import { loadBuildFromIDB } from '@/lib/persist';
import {
  Award,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  BookOpen,
  TrendingUp,
  Zap,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ResultPage() {
  const params = useParams<{ buildId: string }>();
  const router = useRouter();
  const buildId = params?.buildId;
  useLoadBuild(buildId ?? null);
  const [report, setReport] = useState<RatingReport | null>(null);

  useEffect(() => {
    if (!buildId) return;
    void (async () => {
      // Ensure the store is loaded
      const rec = await loadBuildFromIDB(buildId);
      if (rec) {
        useBuildStore.getState().loadBuild(rec.snapshot);
        setReport(score(rec.snapshot));
      } else {
        // try scoring current state
        setReport(score(useBuildStore.getState()));
      }
    })();
  }, [buildId]);

  if (!report) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-fg-muted">Scoring your build…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-y-auto bg-bg">
      <Header />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <Scorecard report={report} />

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Breakdown report={report} />
          <Achievements report={report} />
        </div>

        <section className="mt-10">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <AlertTriangle className="h-5 w-5 text-warn" />
            Issues ({report.issues.length})
          </h2>
          <p className="mt-1 text-sm text-fg-muted">
            Each issue cites its source standard. Click an issue to see how to fix it.
          </p>
          <ul className="mt-4 space-y-2">
            {report.issues.length === 0 ? (
              <li className="panel p-4 text-center text-fg-muted">
                No issues found. Nicely done.
              </li>
            ) : (
              report.issues.map((iss, i) => <IssueRow key={i} issue={iss} />)
            )}
          </ul>
        </section>

        <section className="mt-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-fg-muted">
              PUE estimate: <span className="font-mono">{report.pue}</span> · WUE:{' '}
              <span className="font-mono">{report.wue} L/kWh</span> · Rule pack v{report.rulePackVersion}
            </p>
          </div>
          <div className="flex gap-3">
            <Link href={`/build/${useBuildStore.getState().scenarioId}`} className="btn-ghost">
              Back to builder
            </Link>
            {report.certifiable ? (
              <Link href={`/cert/${buildId}`} className="btn">
                <Award className="h-4 w-4" />
                Claim Certificate
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <span className="badge border-warn text-warn">Score below cert threshold</span>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function Header() {
  return (
    <header className="border-b border-border bg-bg-panel/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="text-2xl">🖥️</span>
          <span>Datacenter Builder</span>
        </Link>
        <Link href="/learn" className="btn-ghost text-sm">
          <BookOpen className="h-4 w-4" />
          Curriculum
        </Link>
      </div>
    </header>
  );
}

function Scorecard({ report }: { report: RatingReport }) {
  return (
    <section className="panel p-6">
      <div className="grid gap-6 md:grid-cols-3">
        <div>
          <p className="label">Overall score</p>
          <p className="mt-1 text-6xl font-bold tabular-nums">{report.score}</p>
          <p className="text-sm text-fg-muted">/ 100</p>
        </div>
        <div>
          <p className="label">Uptime Tier</p>
          <p className={cn('mt-1 text-6xl font-bold', tierColor(report.tier))}>{report.tier}</p>
          <p className="text-sm text-fg-muted">{tierLabel(report.tier)}</p>
        </div>
        <div>
          <p className="label">Cert level</p>
          <p className={cn('mt-1 text-6xl font-bold', levelColor(report.level))}>{report.level}</p>
          <p className="text-sm text-fg-muted">{report.certifiable ? 'Certifiable' : 'Not certifiable'}</p>
        </div>
      </div>
    </section>
  );
}

function tierColor(t: RatingReport['tier']) {
  return {
    IV: 'text-tier4',
    III: 'text-tier3',
    II: 'text-tier2',
    I: 'text-tier1',
    F: 'text-danger',
  }[t];
}

function levelColor(l: RatingReport['level']) {
  return {
    Platinum: 'text-tier4',
    Gold: 'text-warn',
    Silver: 'text-fg-muted',
    Bronze: 'text-warn',
    None: 'text-danger',
  }[l];
}

function tierLabel(t: RatingReport['tier']) {
  return {
    IV: 'Fault tolerant',
    III: 'Concurrently maintainable',
    II: 'Redundant components',
    I: 'Basic capacity',
    F: 'Fails compliance',
  }[t];
}

function Breakdown({ report }: { report: RatingReport }) {
  return (
    <section className="panel p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <TrendingUp className="h-5 w-5" />
        Breakdown
      </h2>
      <ul className="mt-4 space-y-2">
        <Bar label="Redundancy" value={report.breakdown.redundancy} icon={<ShieldCheck className="h-4 w-4" />} />
        <Bar label="Power" value={report.breakdown.power} icon={<Zap className="h-4 w-4" />} />
        <Bar label="Cooling" value={report.breakdown.cooling} icon={<Info className="h-4 w-4" />} />
        <Bar label="Safety" value={report.breakdown.safety} icon={<AlertTriangle className="h-4 w-4" />} />
        <Bar label="Efficiency" value={report.breakdown.efficiency} icon={<TrendingUp className="h-4 w-4" />} />
        <Bar label="Security" value={report.breakdown.security} icon={<Lock className="h-4 w-4" />} />
      </ul>
    </section>
  );
}

function Bar({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <li>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-fg-muted">
          {icon}
          {label}
        </span>
        <span className="font-mono">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded bg-bg-subtle">
        <div
          className={cn(
            'h-full transition-all',
            value >= 75 ? 'bg-success' : value >= 50 ? 'bg-warn' : 'bg-danger',
          )}
          style={{ width: `${value}%` }}
        />
      </div>
    </li>
  );
}

function Achievements({ report }: { report: RatingReport }) {
  return (
    <section className="panel p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Award className="h-5 w-5" />
        Achievements ({report.achievements.length})
      </h2>
      {report.achievements.length === 0 ? (
        <p className="mt-4 text-sm text-fg-muted">
          No achievements yet. Build more controls and try again.
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-2">
          {report.achievements.map((a) => (
            <li key={a.id} className="flex items-start gap-3 rounded border border-border p-2">
              <span className="text-2xl">{a.icon}</span>
              <div>
                <p className="font-medium">{a.title}</p>
                <p className="text-xs text-fg-muted">{a.description}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function IssueRow({ issue }: { issue: Issue }) {
  const icon = {
    critical: <XCircle className="h-4 w-4 text-danger" />,
    error: <XCircle className="h-4 w-4 text-danger" />,
    warn: <AlertTriangle className="h-4 w-4 text-warn" />,
    info: <Info className="h-4 w-4 text-fg-muted" />,
  }[issue.severity];

  return (
    <li className="panel p-3">
      <div className="flex items-start gap-3">
        {icon}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-fg-muted">{issue.ruleId}</span>
            {issue.standard && <span className="badge">{issue.standard}</span>}
          </div>
          <p className="mt-1 text-sm">{issue.message}</p>
          {issue.hint && <p className="mt-1 text-xs text-fg-muted">→ {issue.hint}</p>}
        </div>
      </div>
    </li>
  );
}
