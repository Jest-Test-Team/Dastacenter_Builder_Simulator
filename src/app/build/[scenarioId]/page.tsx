/**
 * Builder page.
 *
 * Loads the R3F canvas, palette, hotbar, mode bar. Optionally accepts a
 * ?share=<token> query param to load a build from a shared URL.
 */

'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useBuildStore } from '@/lib/store/build-store';
import { useLoadBuild } from '@/lib/persist';
import { BlockPalette } from '@/components/builder/BlockPalette';
import { Hotbar } from '@/components/builder/Hotbar';
import { PlacementToast } from '@/components/builder/PlacementToast';
import { ModeBar } from '@/components/builder/ModeBar';
import { PolicyPanel } from '@/components/policy/PolicyPanel';
import { SecurityFrameworkPanel } from '@/components/builder/SecurityFrameworkPanel';
import { KeyboardCheatsheet } from '@/components/a11y/KeyboardCheatsheet';
import { decodeShareToken } from '@/lib/persist/share';
import { GitBranch, Network, Shield, Target, X } from 'lucide-react';
import { getScenario, scenarioInventory, SCENARIOS } from '@/lib/scenarios';
import { getAllBlocks } from '@/lib/blocks/registry';
import { useT } from '@/lib/i18n/client';
import { NetworkWorkspace } from '@/components/builder/NetworkWorkspace';
import { GraphWorkspace } from '@/components/builder/GraphWorkspace';
import { ObjectInspector } from '@/components/builder/ObjectInspector';
import { getDemoBuild } from '@/lib/demos';

const BuilderCanvas = dynamic(
  () => import('@/components/builder/BuilderCanvas').then((m) => m.BuilderCanvas),
  { ssr: false },
);

export default function BuildPage() {
  const params = useParams<{ scenarioId: string }>();
  const search = useSearchParams();
  const scenarioId = params?.scenarioId ?? 'free';
  const setScenario = useBuildStore((s) => s.setScenario);
  const startBuild = useBuildStore((s) => s.startBuild);
  const loadBuild = useBuildStore((s) => s.loadBuild);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [showGoal, setShowGoal] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<'blocks' | 'security' | null>(null);
  const [networkOpen, setNetworkOpen] = useState(false);
  const [graphOpen, setGraphOpen] = useState(false);
  const scenario = (getScenario(scenarioId) ?? SCENARIOS[0])!;
  const buildId = search?.get('buildId') ?? null;
  const demoId = search?.get('demo') ?? null;
  const t = useT();

  useLoadBuild(buildId);

  useEffect(() => {
    if (buildId) return;
    if (demoId) {
      const demo = getDemoBuild(demoId);
      if (demo) loadBuild(demo.snapshot);
      return;
    }
    if (scenario.freshStart) {
      startBuild(scenario.id, scenario.name, scenarioInventory(scenario, getAllBlocks()));
      return;
    }
    setScenario(scenario.id, scenario.name);
    resetInventoryForScenario(scenario);
  }, [buildId, demoId, loadBuild, scenario, setScenario, startBuild]);

  useEffect(() => {
    const share = search?.get('share');
    if (!share) return;
    void (async () => {
      const snap = await decodeShareToken(decodeURIComponent(share));
      if (snap) loadBuild(snap);
    })();
  }, [search, loadBuild]);

  return (
    <main id="main" tabIndex={-1} className="flex min-h-[100dvh] flex-col overflow-x-hidden">
      <ModeBar />
      <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden md:flex-row">
        <BlockPalette mobileOpen={mobilePanel === 'blocks'} onClose={() => setMobilePanel(null)} />
        <div className="relative min-h-[56dvh] flex-1 bg-bg-subtle md:min-h-0">
          <BuilderCanvas xrayMode={networkOpen} />
          <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 md:bottom-4">
            <PlacementToast />
            <Hotbar />
          </div>
          <div className="pointer-events-none absolute right-2 top-2 md:right-4 md:top-4">
            <CoordReadout />
          </div>
          <div className="absolute left-2 top-2 z-20 flex gap-2 md:hidden">
            <button
              onClick={() => setMobilePanel((current) => (current === 'blocks' ? null : 'blocks'))}
              className="btn-ghost text-xs"
            >
              Blocks
            </button>
            <button
              onClick={() => setMobilePanel((current) => (current === 'security' ? null : 'security'))}
              className="btn-ghost text-xs"
            >
              Security
            </button>
          </div>
          <button
            onClick={() => setPolicyOpen(true)}
            className="absolute right-2 top-16 max-w-[calc(100vw-1rem)] btn-ghost md:right-4 md:top-20"
            title={t('builder.policy')}
          >
            <Shield className="h-4 w-4" />
            {t('builder.policy')}
          </button>
          <button
            onClick={() => setNetworkOpen(true)}
            className="absolute right-2 top-40 z-20 max-w-[calc(100vw-1rem)] btn md:right-4 md:top-44"
            title="Open enterprise SDN workspace"
            aria-label="Open enterprise SDN workspace"
          >
            <Network className="h-4 w-4" />
            Network
          </button>
          <button
            onClick={() => setGraphOpen(true)}
            className="absolute right-2 top-52 z-20 max-w-[calc(100vw-1rem)] btn md:right-4 md:top-56"
            title="Open the knowledge graph workspace"
            aria-label="Open knowledge graph workspace"
          >
            <GitBranch className="h-4 w-4" />
            Graph
          </button>
          {scenario.goal && (
            <button
              onClick={() => setShowGoal(true)}
              className="absolute right-2 top-28 max-w-[calc(100vw-1rem)] btn-ghost md:right-4 md:top-32"
              title="Scenario goal"
            >
              <Target className="h-4 w-4" />
              Goal
            </button>
          )}
          <SecurityFrameworkPanel
            mobileOpen={mobilePanel === 'security'}
            onClose={() => setMobilePanel(null)}
          />
          <ObjectInspector />
          {networkOpen && <NetworkWorkspace onClose={() => setNetworkOpen(false)} />}
          {graphOpen && <GraphWorkspace onClose={() => setGraphOpen(false)} />}
        </div>
      </div>
      <PolicyPanel open={policyOpen} onClose={() => setPolicyOpen(false)} />
      <KeyboardCheatsheet />
      {showGoal && (
        <ScenarioGoalDialog scenario={scenario!} onClose={() => setShowGoal(false)} />
      )}
    </main>
  );
}

function resetInventoryForScenario(scenario: (typeof SCENARIOS)[number]) {
  useBuildStore.getState().resetInventory(scenarioInventory(scenario, getAllBlocks()));
}

function ScenarioGoalDialog({
  scenario,
  onClose,
}: {
  scenario: { goal?: { tier?: string; maxPue?: number }; focus: string[] };
  onClose: () => void;
}) {
  const t = useT();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="panel w-full max-w-md m-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <Target className="h-5 w-5" />
            {t('builder.mode.inspect')} Goal
          </h2>
          <button onClick={onClose} className="icon-btn" aria-label={t('common.close')}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          {scenario.goal?.tier && (
            <div className="flex items-center gap-3 p-3 rounded bg-primary/10 border border-primary/20">
              <div className="text-3xl font-bold text-primary">Tier {scenario.goal.tier}</div>
              <div className="text-sm text-fg-muted">Target Uptime tier</div>
            </div>
          )}
          {scenario.goal?.maxPue && (
            <div className="flex items-center gap-3 p-3 rounded bg-accent/10 border border-accent/20">
              <div className="text-3xl font-bold text-accent">PUE ≤ {scenario.goal.maxPue}</div>
              <div className="text-sm text-fg-muted">Energy efficiency target</div>
            </div>
          )}
          <div>
            <p className="text-sm font-medium mb-2">Standards in focus</p>
            <div className="flex flex-wrap gap-1">
              {scenario.focus.map((f) => (
                <span key={f} className="badge text-[10px]">{f}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t p-3 text-right">
          <button onClick={onClose} className="btn">
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}

function CoordReadout() {
  const hoveredCell = useBuildStore((s) => s.hoveredCell);
  const voxels = useBuildStore((s) => Object.keys(s.voxels).length);
  return (
    <div className="panel pointer-events-auto p-2 font-mono text-xs">
      <div>blocks: {voxels}</div>
      {hoveredCell && (
        <div>
          x:{hoveredCell.x} y:{hoveredCell.y} z:{hoveredCell.z}
        </div>
      )}
    </div>
  );
}
