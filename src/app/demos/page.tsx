/**
 * Demo builds gallery.
 *
 * Three pre-built data center configurations that users can load
 * and explore. Each demo generates a shareable URL.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useBuildStore } from '@/lib/store/build-store';
import { encodeBuildToShareToken } from '@/lib/persist/share';
import { DEMO_BUILDS, type DemoBuild } from '@/lib/demos';
import { AppHeader } from '@/components/layout/AppHeader';
import {
  Copy,
  Check,
  Server,
  Zap,
  Shield,
  ArrowRight,
  Box,
  Droplet,
  Cpu,
  Flame,
  Network,
  type LucideIcon,
} from 'lucide-react';

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  structure: Box,
  site: Shield,
  power: Zap,
  cooling: Droplet,
  it: Cpu,
  safety: Flame,
  network: Network,
};

const ALL_CATEGORIES = ['structure', 'power', 'cooling', 'it', 'safety', 'network', 'site'] as const;

const DIFFICULTY_LABELS = ['', 'Beginner', 'Easy', 'Intermediate', 'Advanced', 'Expert'];

export default function DemosPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function handleShare(demo: DemoBuild) {
    try {
      const token = await encodeBuildToShareToken(demo.snapshot);
      const url = `${window.location.origin}/build/${demo.scenarioId}?share=${encodeURIComponent(token)}`;
      await navigator.clipboard.writeText(url);
      setCopiedId(demo.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      /* ignore clipboard errors */
    }
  }

  function handleLoad(demo: DemoBuild) {
    useBuildStore.getState().loadBuild(demo.snapshot);
  }

  const blockCounts = (demo: DemoBuild) => Object.keys(demo.snapshot.voxels).length;

  return (
    <div className="min-h-screen overflow-y-auto bg-bg">
      <AppHeader />
      <main id="main" tabIndex={-1} className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-3xl font-bold">Demo Builds</h1>
        <p className="mt-2 text-fg-muted">
          Pre-built data center configurations you can load, explore, and share. Each demo
          includes blocks across all 7 categories plus policy toggles.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {DEMO_BUILDS.map((demo) => {
            const count = blockCounts(demo);
            return (
              <div key={demo.id} className="panel flex flex-col overflow-hidden">
                <div className="border-b border-border p-5">
                  <div className="flex items-start justify-between">
                    <h2 className="text-lg font-semibold">{demo.name}</h2>
                    <span className="badge text-[10px]">{demo.tier}</span>
                  </div>
                  <p className="mt-2 text-sm text-fg-muted">{demo.description}</p>
                </div>

                <div className="flex-1 p-5">
                  <dl className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded bg-bg-subtle p-2">
                      <dt className="text-fg-muted">Blocks placed</dt>
                      <dd className="mt-0.5 font-mono font-semibold">{count}</dd>
                    </div>
                    <div className="rounded bg-bg-subtle p-2">
                      <dt className="text-fg-muted">PUE target</dt>
                      <dd className="mt-0.5 font-mono font-semibold">{demo.pue}</dd>
                    </div>
                    <div className="rounded bg-bg-subtle p-2">
                      <dt className="text-fg-muted">Difficulty</dt>
                      <dd className="mt-0.5 font-mono font-semibold">
                        {DIFFICULTY_LABELS[demo.difficulty]}
                      </dd>
                    </div>
                    <div className="rounded bg-bg-subtle p-2">
                      <dt className="text-fg-muted">Scenario</dt>
                      <dd className="mt-0.5 font-mono font-semibold capitalize">
                        {demo.scenarioId}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-4">
                    <p className="text-xs font-medium text-fg-muted">Categories used</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {ALL_CATEGORIES.map((cat) => {
                        const Icon = CATEGORY_ICONS[cat];
                        const hasBlocks = demo.categories.includes(cat);
                        return (
                          <span
                            key={cat}
                            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] ${
                              hasBlocks
                                ? 'bg-primary/10 text-primary'
                                : 'bg-bg-subtle text-fg-muted opacity-40'
                            }`}
                          >
                            <Icon className="h-2.5 w-2.5" />
                            {cat}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 border-t border-border p-4">
                  <Link
                    href={`/build/${demo.scenarioId}`}
                    onClick={() => handleLoad(demo)}
                    className="btn flex-1 text-xs"
                  >
                    <Server className="h-3.5 w-3.5" />
                    Load demo
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                  <button
                    onClick={() => void handleShare(demo)}
                    className="btn-ghost flex-1 text-xs"
                  >
                    {copiedId === demo.id ? (
                      <Check className="h-3.5 w-3.5 text-success" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copiedId === demo.id ? 'Copied!' : 'Copy link'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <section className="mt-12 text-center">
          <p className="text-sm text-fg-muted">
            Want to build your own?{' '}
            <Link href="/build/free" className="text-accent hover:underline">
              Start from scratch
            </Link>
            {' or '}
            <Link href="/scenarios" className="text-accent hover:underline">
              pick a scenario
            </Link>
            .
          </p>
        </section>
      </main>
    </div>
  );
}
