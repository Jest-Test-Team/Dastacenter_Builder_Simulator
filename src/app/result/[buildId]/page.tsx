/**
 * Result / rating page.
 *
 * Shows the scorecard, breakdown radar, issue list with citations, and
 * a "Claim Certificate" button that hands off to /cert/[buildId].
 */

'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { type RatingReport, score, type Issue } from '@/lib/scoring';
import { useBuildStore } from '@/lib/store/build-store';
import { loadBuildFromIDB } from '@/lib/persist';
import {
  Award,
  ArrowRight,
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
import { useT } from '@/lib/i18n/client';
import { WalletPicker } from '@/components/wallet/WalletPicker';
import { MintCertificateCard } from '@/components/cert/MintCertificateCard';
import { CertificateSvg } from '@/components/cert/CertificateSvg';

export default function ResultPage() {
  const params = useParams<{ buildId: string }>();
  const buildId = params?.buildId;
  const [report, setReport] = useState<RatingReport | null>(null);
  const t = useT();

  useEffect(() => {
    if (!buildId) return;
    void (async () => {
      const rec = await loadBuildFromIDB(buildId);
      if (rec) {
        useBuildStore.getState().loadBuild(rec.snapshot);
        setReport(score(rec.snapshot));
      } else {
        setReport(score(useBuildStore.getState()));
      }
    })();
  }, [buildId]);

  if (!report) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <p className="text-fg-muted">Scoring your build…</p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] overflow-y-auto bg-bg">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <Scorecard report={report} />

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Competition score" value={`${report.competitionScore.toFixed(0)}/1000`} />
          <StatCard label="Build cost" value={`$${report.buildCostUsd.toLocaleString()}`} />
          <StatCard label="Budget" value={`$${report.budgetUsd.toLocaleString()}`} />
          <StatCard label={report.overBudget ? 'Budget status' : 'Budget status'} value={report.overBudget ? 'Over' : 'Within'} tone={report.overBudget ? 'warn' : 'success'} />
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Breakdown report={report} />
          <Achievements report={report} />
        </div>

         {buildId && (
          <section className="mt-10">
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <Award className="h-5 w-5 text-warn" />
              Web3 Certificate
            </h2>
            {report.certifiable ? (
              <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
                <div className="self-start">
                  <CertificateSvg
                    report={report}
                    recipientName="Anonymous Builder"
                    buildId={buildId}
                    baseUrl={process.env.NEXT_PUBLIC_APP_URL}
                  />
                </div>
                <MintCertificateCard report={report} buildId={buildId} />
              </div>
            ) : (
              <div className="mt-4 panel border border-warn/30 bg-warn/5 p-5">
                <p className="flex items-center gap-2 font-medium text-warn">
                  <AlertTriangle className="h-4 w-4" />
                  This build isn&apos;t certifiable yet
                </p>
                <p className="mt-2 text-sm text-fg-muted">
                  Your score is {report.score}/100 (Tier {report.tier}, {report.level}). To mint an
                  on-chain certificate, resolve the critical issues above and reach a certifiable
                  tier. Then the Mint button will appear here.
                </p>
                <Link
                  href={`/build/${useBuildStore.getState().scenarioId}?buildId=${buildId}`}
                  className="btn mt-4"
                >
                  {t('result.retry')}
                </Link>
              </div>
            )}
          </section>
        )}

        <section className="mt-10">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <AlertTriangle className="h-5 w-5 text-warn" />
            {t('result.issues')} ({report.issues.length})
          </h2>
          <p className="mt-1 text-sm text-fg-muted">
            Each issue cites its source standard. Click an issue to see how to fix it.
          </p>
          <ul className="mt-4 space-y-2">
            {report.issues.length === 0 ? (
              <li className="panel p-4 text-center text-fg-muted">No issues found. Nicely done.</li>
            ) : (
              report.issues.map((iss, i) => <IssueRow key={i} issue={iss} />)
            )}
          </ul>
        </section>

       

        <section className="mt-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-fg-muted">
              PUE estimate: <span className="font-mono">{report.pue}</span> · WUE:{' '}
              <span className="font-mono">{report.wue} L/kWh</span> · Rule pack v
              {report.rulePackVersion}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/build/${useBuildStore.getState().scenarioId}?buildId=${buildId}`}
              className="btn-ghost"
            >
              {t('result.retry')}
            </Link>
            <Link href="/leaderboard" className="btn-ghost">
              Leaderboard
            </Link>
            {report.certifiable ? (
              <Link href={`/cert/${buildId}`} className="btn-ghost">
                <Award className="h-4 w-4" />
                Certificate page
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
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold">
          <span className="text-2xl">🖥️</span>
          <span>Datacenter Builder</span>
        </Link>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <WalletPicker />
          <Link href="/learn" className="btn-ghost text-sm">
            <BookOpen className="h-4 w-4" />
            Curriculum
          </Link>
        </div>
      </div>
    </header>
  );
}

function Scorecard({ report }: { report: RatingReport }) {
  const t = useT();
  const tierKey = `tier.${report.tier}`;
  const translatedTier = t(tierKey);
  const tierDescription = translatedTier !== tierKey ? translatedTier : TIER_LABELS[report.tier];
  return (
    <section className="panel p-6">
      <div className="grid gap-6 sm:grid-cols-3">
        <div>
          <p className="label">{t('result.score')}</p>
          <p className="mt-1 text-4xl font-bold tabular-nums sm:text-6xl">{report.score}</p>
          <p className="text-sm text-fg-muted">/ 100</p>
        </div>
        <div>
          <p className="label">{t('result.tier')}</p>
          <p className={cn('mt-1 text-4xl font-bold sm:text-6xl', tierColor(report.tier))}>{report.tier}</p>
          <p className="text-sm text-fg-muted">{tierDescription}</p>
        </div>
        <div>
          <p className="label">{t('result.level')}</p>
          <p className={cn('mt-1 text-4xl font-bold sm:text-6xl', levelColor(report.level))}>{report.level}</p>
          <p className="text-sm text-fg-muted">
            {report.certifiable ? 'Certifiable' : 'Not certifiable'}
          </p>
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

function StatCard({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'warn' | 'success';
}) {
  const toneClass =
    tone === 'warn' ? 'border-warn/30 bg-warn/5 text-warn' : tone === 'success' ? 'border-success/30 bg-success/5 text-success' : 'border-border bg-bg-subtle';
  return (
    <div className={`panel rounded-md border p-4 ${toneClass}`}>
      <div className="text-xs text-fg-muted">{label}</div>
      <div className="mt-1 font-mono text-lg font-semibold">{value}</div>
    </div>
  );
}

const TIER_LABELS: Record<RatingReport['tier'], string> = {
  IV: 'Fault tolerant',
  III: 'Concurrently maintainable',
  II: 'Redundant components',
  I: 'Basic capacity',
  F: 'Fails compliance',
};

function Breakdown({ report }: { report: RatingReport }) {
  const t = useT();
  return (
    <section className="panel p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <TrendingUp className="h-5 w-5" />
        Breakdown
      </h2>
      <ul className="mt-4 space-y-2">
        <Bar
          label={t('breakdown.redundancy')}
          value={report.breakdown.redundancy}
          icon={<ShieldCheck className="h-4 w-4" />}
        />
        <Bar
          label={t('breakdown.power')}
          value={report.breakdown.power}
          icon={<Zap className="h-4 w-4" />}
        />
        <Bar
          label={t('breakdown.cooling')}
          value={report.breakdown.cooling}
          icon={<Info className="h-4 w-4" />}
        />
        <Bar
          label={t('breakdown.safety')}
          value={report.breakdown.safety}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <Bar
          label={t('breakdown.efficiency')}
          value={report.breakdown.efficiency}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <Bar
          label={t('breakdown.security')}
          value={report.breakdown.security}
          icon={<Lock className="h-4 w-4" />}
        />
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
  const t = useT();
  return (
    <section className="panel p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Award className="h-5 w-5" />
        {t('result.achievements')} ({report.achievements.length})
      </h2>
      {report.achievements.length === 0 ? (
        <p className="mt-4 text-sm text-fg-muted">{t('result.achievements.empty')}</p>
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-2">
          {report.achievements.map((a) => {
            const titleKey = `ach.${a.id}`;
            const descKey = `ach.${a.id}.desc`;
            return (
              <li key={a.id} className="flex items-start gap-3 rounded border border-border p-2">
                <span className="text-2xl">{a.icon}</span>
                <div>
                  <p className="font-medium">{t(titleKey) !== titleKey ? t(titleKey) : a.title}</p>
                  <p className="text-xs text-fg-muted">
                    {t(descKey) !== descKey ? t(descKey) : a.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function IssueRow({ issue }: { issue: Issue }) {
  const icons: Record<Issue['severity'], ReactNode> = {
    critical: <XCircle className="h-4 w-4 text-danger" />,
    error: <XCircle className="h-4 w-4 text-danger" />,
    warn: <AlertTriangle className="h-4 w-4 text-warn" />,
    info: <Info className="h-4 w-4 text-fg-muted" />,
  };
  const icon = icons[issue.severity];

  return (
    <li className="panel p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        {icon}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-fg-muted">{issue.ruleId}</span>
            {issue.standard && <span className="badge">{issue.standard}</span>}
          </div>
          <p className="mt-1 text-sm">{issue.message}</p>
          {issue.hint && <p className="mt-1 text-xs text-fg-muted">→ {issue.hint}</p>}
        </div>
      </div>
    </li>
  );
}
