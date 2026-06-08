'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trophy, ArrowLeft, ShieldCheck } from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';

interface Entry {
  buildId: string;
  walletAddress: string;
  blueprintHash: string;
  competitionScore: number;
  score: number;
  tier: string;
  level: string;
  pue: number;
  buildCostUsd: number;
  budgetUsd: number;
  overBudget: boolean;
  issuedBadgeId?: string;
  issuedBadgeUrl?: string;
  scenarioName: string;
  scenarioId: string;
  updatedAt: string;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    void fetch('/api/leaderboard/top?limit=20')
      .then((res) => res.json())
      .then((data) => setEntries(data.entries ?? []))
      .catch(() => setEntries([]));
  }, []);

  return (
    <div className="min-h-screen overflow-y-auto bg-bg">
      <AppHeader current="learn" />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center gap-3">
          <Trophy className="h-6 w-6 text-warn" />
          <h1 className="text-3xl font-bold">Leaderboard</h1>
        </div>
        <p className="mt-2 text-fg-muted">
          Validated blueprint submissions sorted by competition score.
        </p>

        <div className="mt-8 overflow-hidden rounded-xl border border-border bg-bg-panel">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-bg-subtle text-fg-muted">
              <tr>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Build</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-fg-muted" colSpan={5}>
                    No submissions yet.
                  </td>
                </tr>
              ) : (
                entries.map((entry, index) => (
                  <tr key={`${entry.buildId}-${entry.updatedAt}`} className="border-b border-border/60">
                    <td className="px-4 py-3 font-mono">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{entry.scenarioName}</div>
                      <div className="font-mono text-xs text-fg-muted">{entry.buildId}</div>
                    </td>
                    <td className="px-4 py-3 font-mono">{entry.competitionScore.toFixed(0)}</td>
                    <td className="px-4 py-3">{entry.tier}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <span className="badge">{entry.level}</span>
                        <span className="badge">{entry.pue.toFixed(2)} PUE</span>
                        {entry.issuedBadgeUrl ? (
                          <a href={entry.issuedBadgeUrl} target="_blank" rel="noreferrer" className="badge border-success/30 text-success">
                            <ShieldCheck className="mr-1 h-3 w-3" />
                            Credly
                          </a>
                        ) : (
                          <span className="badge">Validated</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6">
          <Link href="/" className="btn-ghost">
            <ArrowLeft className="h-4 w-4" />
            Back home
          </Link>
        </div>
      </main>
    </div>
  );
}
