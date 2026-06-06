/**
 * Simulation mode: NPC visitors, scheduled events, time-of-day,
 * power/temp/incident gauges. Reuses the same build state.
 */

'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { OrbitControls } from '@react-three/drei';
import Link from 'next/link';
import { useBuildStore } from '@/lib/store/build-store';
import { score } from '@/lib/scoring/engine';
import { ArrowLeft, Play, Pause, FastForward, AlertTriangle, Activity, Zap, Thermometer } from 'lucide-react';
import { cn } from '@/lib/utils';

type SimEvent = {
  id: number;
  t: number;
  type: 'intrusion' | 'power_outage' | 'cooling_fault' | 'fire_drill' | 'audit' | 'dga_overheat' | 'normal';
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
  const snapshot = useBuildStore.getState();

  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [events, setEvents] = useState<SimEvent[]>([]);
  const nextIdRef = useRef(0);
  const [powerLoad, setPowerLoad] = useState(0);
  const [tempC, setTempC] = useState(22);

  // Initial scoring snapshot (deterministic)
  const initialReport = useMemo(() => score(snapshot), []);

  // Time loop
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setT((prev) => prev + speed);
      // Random event spawn
      if (Math.random() < 0.04 * speed) {
        const tmpl = EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)]!;
        setEvents((evs) => [
          ...evs.slice(-19),
          { ...tmpl, id: nextIdRef.current++, t: t, resolved: false },
        ]);
      }
      // Live gauges: oscillate around baseline
      setPowerLoad((p) => Math.max(0, p + (Math.random() - 0.5) * 5));
      setTempC((c) => Math.max(15, Math.min(40, c + (Math.random() - 0.5) * 0.3)));
    }, 800);
    return () => window.clearInterval(id);
  }, [playing, speed, t]);

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border bg-bg-panel px-4 py-2">
        <div className="flex items-center gap-3">
          <Link href={`/build/free?share=${buildId}`} className="btn-ghost">
            <ArrowLeft className="h-4 w-4" />
            Back to build
          </Link>
          <span className="text-sm text-fg-muted">
            Simulating <span className="font-mono">{buildId.slice(0, 12)}…</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
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
          <button onClick={() => router.push(`/result/${buildId}`)} className="btn">
            Finish & score
          </button>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-[1fr_320px]">
        <div className="relative bg-bg-subtle">
          <Canvas camera={{ position: [16, 16, 16], fov: 50 }} dpr={[1, 2]}>
            <ambientLight intensity={0.4} />
            <directionalLight position={[10, 20, 5]} intensity={1} />
            <OrbitControls />
            <SiteGround />
            <NPCs count={6} t={t} />
            <Fence />
          </Canvas>

          <HUD powerLoad={powerLoad} tempC={tempC} t={t} report={initialReport} />
        </div>

        <aside className="flex flex-col border-l border-border bg-bg-panel">
          <div className="border-b p-3">
            <h2 className="text-sm font-semibold">Event log</h2>
            <p className="text-xs text-fg-muted">Live incidents from the deterministic run.</p>
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
                    <div className="text-[10px] opacity-70">t={e.t} • {e.type}</div>
                  </div>
                </li>
              ))}
          </ul>
          <div className="border-t p-3 text-[10px] text-fg-muted">
            Simulation L1: time-of-day + random events. Player does not intervene here.
          </div>
        </aside>
      </div>
    </div>
  );
}

function SiteGround() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial color="#1a2030" />
    </mesh>
  );
}

function NPCs({ count, t }: { count: number; t: number; }) {
  const refs = useRef<Array<any>>([]);
  const seeds = useMemo(
    () => Array.from({ length: count }, (_, i) => ({ x: 4 + (i * 3.7) % 30, z: 4 + (i * 5.1) % 30, speed: 0.3 + (i % 3) * 0.1 })),
    [count],
  );
  useFrame(() => {
    refs.current.forEach((ref, i) => {
      if (!ref) return;
      const s = seeds[i]!;
      ref.position.x = Math.cos((t * s.speed + i) * 0.5) * 6 + s.x;
      ref.position.z = Math.sin((t * s.speed + i) * 0.5) * 6 + s.z;
    });
  });
  return (
    <>
      {seeds.map((_, i) => (
        <group key={i} ref={(el) => { refs.current[i] = el; }}>
          <mesh position={[0, 0.5, 0]}>
            <capsuleGeometry args={[0.2, 0.6, 4, 8]} />
            <meshStandardMaterial color="#5fa8d3" />
          </mesh>
          <mesh position={[0, 1.0, 0]}>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshStandardMaterial color="#f0c8a0" />
          </mesh>
        </group>
      ))}
    </>
  );
}

function Fence() {
  const lines = useMemo(() => {
    const out: { x: number; z: number; rot: number }[] = [];
    for (let x = 0; x < 32; x += 2) out.push({ x: x, z: 0, rot: 0 });
    for (let x = 0; x < 32; x += 2) out.push({ x: x, z: 32, rot: 0 });
    for (let z = 0; z < 32; z += 2) out.push({ x: 0, z, rot: Math.PI / 2 });
    for (let z = 0; z < 32; z += 2) out.push({ x: 32, z, rot: Math.PI / 2 });
    return out;
  }, []);
  return (
    <>
      {lines.map((l, i) => (
        <mesh key={i} position={[l.x, 0.5, l.z]} rotation={[0, l.rot, 0]}>
          <boxGeometry args={[0.05, 1, 0.05]} />
          <meshStandardMaterial color="#888" />
        </mesh>
      ))}
    </>
  );
}

function HUD({ powerLoad, tempC, t, report }: { powerLoad: number; tempC: number; t: number; report: ReturnType<typeof score>; }) {
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
