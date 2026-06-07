/**
 * Simulation mode: NPC visitors, scheduled events, time-of-day,
 * power/temp/incident gauges. Reuses the same build state.
 */

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useBuildStore } from '@/lib/store/build-store';
import { useLoadBuild, useSaveBuild } from '@/lib/persist';
import { downloadBuildJson } from '@/lib/export/build-export';
import type { RatingReport } from '@/lib/scoring/engine';
import { WalletPicker } from '@/components/wallet/WalletPicker';
import { useT } from '@/lib/i18n/client';
import { useAccount } from 'wagmi';
import {
  ArrowLeft,
  Play,
  Pause,
  FastForward,
  AlertTriangle,
  Activity,
  Zap,
  Thermometer,
  Users,
  DollarSign,
  Leaf,
  Droplets,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { projectOperations, type OperationsProjection } from '@/lib/simulation';

const SimulationCanvas = dynamic(
  () => import('@/components/sim/SimulationCanvas').then((module) => module.SimulationCanvas),
  { ssr: false },
);

type SimEvent = {
  id: number;
  t: number;
  type:
    | 'intrusion'
    | 'power_outage'
    | 'cooling_fault'
    | 'fire_drill'
    | 'audit'
    | 'dga_overheat'
    | 'normal';
  message: string;
  severity: 'info' | 'warn' | 'critical';
  resolved: boolean;
};

const EVENT_TEMPLATES: Omit<SimEvent, 'id' | 't' | 'resolved'>[] = [
  { type: 'intrusion', message: 'Tailgating detected at east entrance', severity: 'warn' },
  { type: 'power_outage', message: 'Utility line A voltage dip', severity: 'critical' },
  { type: 'cooling_fault', message: 'CRAC unit 3 supply temp drift', severity: 'warn' },
  { type: 'fire_drill', message: 'VESDA smoke signal in Hall B', severity: 'critical' },
  { type: 'audit', message: 'SOC 2 spot check: PUE report', severity: 'info' },
  { type: 'dga_overheat', message: 'Transformer DGA: H₂ trending up', severity: 'warn' },
  { type: 'normal', message: 'Shift change: operators rotated', severity: 'info' },
];

export default function SimPage() {
  const params = useParams<{ buildId: string }>();
  const router = useRouter();
  const buildId = params?.buildId ?? '';
  const t = useT();
  const { address, isConnected, chain } = useAccount();
  useLoadBuild(buildId || null);
  const snapshot = useBuildStore((state) => state);
  const save = useSaveBuild();

  const [simulationTime, setSimulationTime] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [events, setEvents] = useState<SimEvent[]>([]);
  const nextIdRef = useRef(0);
  const elapsedRef = useRef(0);
  const [powerLoad, setPowerLoad] = useState(0);
  const [tempC, setTempC] = useState(22);

  const projection = useMemo(() => projectOperations(snapshot), [snapshot]);

  useEffect(() => {
    setPowerLoad(projection.facilityPowerKw);
    setTempC(22 + (100 - projection.report.breakdown.cooling) / 20);
  }, [projection]);

  async function finishSimulation() {
    await save();
    router.push(`/result/${buildId}`);
  }

  function handleDownloadWorks() {
    if (!address) return;
    downloadBuildJson({
      snapshot: useBuildStore.getState().exportSnapshot(),
      walletAddress: address,
      chainId: chain?.id,
      chainName: chain?.name,
    });
  }

  // Time loop
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      elapsedRef.current += speed;
      setSimulationTime(elapsedRef.current);
      // Random event spawn
      if (Math.random() < 0.04 * speed) {
        const tmpl = EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)]!;
        setEvents((evs) => [
          ...evs.slice(-19),
          { ...tmpl, id: nextIdRef.current++, t: elapsedRef.current, resolved: false },
        ]);
      }
      // Live gauges: oscillate around baseline
      setPowerLoad((current) => {
        const baseline = projection.facilityPowerKw;
        if (baseline === 0) return 0;
        return Math.max(
          baseline * 0.8,
          Math.min(baseline * 1.2, current + (Math.random() - 0.5) * 5),
        );
      });
      setTempC((c) => Math.max(15, Math.min(40, c + (Math.random() - 0.5) * 0.3)));
    }, 800);
    return () => window.clearInterval(id);
  }, [playing, projection.facilityPowerKw, speed]);

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border bg-bg-panel px-4 py-2">
        <div className="flex items-center gap-3">
          <Link href={`/build/${snapshot.scenarioId}?buildId=${buildId}`} className="btn-ghost">
            <ArrowLeft className="h-4 w-4" />
            Back to build
          </Link>
          <span className="text-sm text-fg-muted">
            Simulating <span className="font-mono">{buildId.slice(0, 12)}…</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <WalletPicker />
          <button
            onClick={handleDownloadWorks}
            disabled={!isConnected}
            title={!isConnected ? t('sim.downloadWorks.hint') : undefined}
            className="btn-ghost disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {t('sim.downloadWorks')}
          </button>
          <button onClick={() => setPlaying((p) => !p)} className="btn-ghost">
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <div className="flex items-center rounded-md border border-border bg-bg-subtle p-0.5 text-xs">
            {[1, 4, 16].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={cn(
                  'flex items-center gap-1 rounded px-2 py-0.5',
                  speed === s ? 'bg-primary text-fg' : 'text-fg-muted',
                )}
              >
                <FastForward className="h-3 w-3" />
                {s}×
              </button>
            ))}
          </div>
          <button onClick={() => void finishSimulation()} className="btn">
            Finish & score
          </button>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-[1fr_320px]">
        <div className="relative bg-bg-subtle">
          <SimulationCanvas elapsedSeconds={simulationTime} />

          <HUD
            powerLoad={powerLoad}
            tempC={tempC}
            t={simulationTime}
            report={projection.report}
          />
        </div>

        <aside className="flex flex-col border-l border-border bg-bg-panel">
          <OperationsPanel projection={projection} />
          <div className="border-b p-3">
            <h2 className="text-sm font-semibold">Event log</h2>
            <p className="text-xs text-fg-muted">Live incidents from this simulation run.</p>
          </div>
          <ul className="flex-1 overflow-y-auto p-2">
            {events.length === 0 && (
              <li className="rounded border border-dashed border-border p-3 text-xs text-fg-muted">
                Quiet for now. Events will appear as the simulation runs.
              </li>
            )}
            {events
              .slice()
              .reverse()
              .map((e) => (
                <li
                  key={e.id}
                  className={cn(
                    'mb-1 flex items-start gap-2 rounded border p-2 text-xs',
                    e.severity === 'critical'
                      ? 'border-danger/40 bg-danger/5 text-danger'
                      : e.severity === 'warn'
                        ? 'border-warn/40 bg-warn/5 text-warn'
                        : 'border-border bg-bg-subtle text-fg-muted',
                  )}
                >
                  <AlertTriangle className="mt-0.5 h-3 w-3" />
                  <div className="flex-1">
                    <div className="font-medium">{e.message}</div>
                    <div className="text-[10px] opacity-70">
                      t={e.t} • {e.type}
                    </div>
                  </div>
                </li>
              ))}
          </ul>
          <div className="border-t p-3 text-[10px] text-fg-muted">
            L2 projection assumptions: 24/7 operation, $0.12/kWh, 0.4 kg CO₂e/kWh grid, and $95k
            loaded annual staff cost.
          </div>
        </aside>
      </div>
    </div>
  );
}

function OperationsPanel({ projection }: { projection: OperationsProjection }) {
  return (
    <section className="border-b p-3" aria-labelledby="operations-heading">
      <h2 id="operations-heading" className="text-sm font-semibold">
        Annual operations projection
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <ProjectionMetric
          icon={<DollarSign className="h-3.5 w-3.5 text-warn" />}
          label="OPEX"
          value={formatCompactUsd(projection.annualOpexUsd)}
        />
        <ProjectionMetric
          icon={<Users className="h-3.5 w-3.5 text-primary" />}
          label="Staffing"
          value={`${projection.staffing.totalFte} FTE`}
        />
        <ProjectionMetric
          icon={<Leaf className="h-3.5 w-3.5 text-success" />}
          label="Carbon"
          value={`${formatCompact(projection.annualCarbonTonnes)} t`}
        />
        <ProjectionMetric
          icon={<Droplets className="h-3.5 w-3.5 text-primary" />}
          label="Water"
          value={`${formatCompact(projection.annualWaterLiters)} L`}
        />
      </div>
      <div className="mt-2 text-[10px] text-fg-muted">
        {projection.staffing.operationsPerShift} ops · {projection.staffing.facilitiesPerShift}{' '}
        facilities · {projection.staffing.securityPerShift} security per shift ·{' '}
        {projection.renewablePercent}% renewable
      </div>
    </section>
  );
}

function ProjectionMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded border border-border bg-bg-subtle p-2">
      <div className="flex items-center gap-1 text-[10px] text-fg-muted">
        {icon}
        {label}
      </div>
      <div className="mt-1 font-mono text-xs font-semibold">{value}</div>
    </div>
  );
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(
    value,
  );
}

function formatCompactUsd(value: number): string {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function HUD({
  powerLoad,
  tempC,
  t,
  report,
}: {
  powerLoad: number;
  tempC: number;
  t: number;
  report: RatingReport;
}) {
  return (
    <div className="pointer-events-none absolute left-4 top-4 flex flex-col gap-2">
      <div className="panel flex items-center gap-3 p-2 text-xs">
        <div className="flex items-center gap-1">
          <Zap className="h-3.5 w-3.5 text-warn" />
          <span className="font-mono">{powerLoad.toFixed(0)} kW</span>
        </div>
        <div className="flex items-center gap-1">
          <Thermometer className="h-3.5 w-3.5 text-danger" />
          <span className="font-mono">{tempC.toFixed(1)} °C</span>
        </div>
        <div className="flex items-center gap-1">
          <Activity className="h-3.5 w-3.5 text-primary" />
          <span className="font-mono">t={t}s</span>
        </div>
      </div>
      <div className="panel p-2 text-xs">
        <div className="font-semibold">Predicted outcome</div>
        <div className="mt-1 flex gap-2">
          <span className="badge">{report.tier}</span>
          <span className="badge">{report.level}</span>
          <span className="badge">{report.score.toFixed(0)}/100</span>
        </div>
      </div>
    </div>
  );
}
