/**
 * R3F Builder Canvas.
 *
 * Sets up the renderer, camera, lighting, and contains the voxel world.
 * Used in both build mode and (lightly) in sim mode.
 */

'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Grid, Html } from '@react-three/drei';
import { Suspense, useEffect, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { useBuildStore } from '@/lib/store/build-store';
import { VoxelWorld } from './VoxelWorld';
import { PlacementPreview } from './PlacementPreview';
import { SiteEnvironment } from './SiteEnvironment';
import { CctvCoverage } from './CctvCoverage';
import { useReducedMotion } from '@/lib/hooks/useReducedMotion';
import { score } from '@/lib/scoring';
import { NetworkOverlay3D } from './NetworkOverlay3D';

export interface BuilderCanvasProps {
  showGrid?: boolean;
  showPreview?: boolean;
  frameloop?: 'always' | 'demand';
  xrayMode?: boolean;
}

export function BuilderCanvas({
  showGrid = true,
  showPreview = true,
  frameloop = 'demand',
  xrayMode = false,
}: BuilderCanvasProps) {
  const gridSize = useBuildStore((s) => s.gridSize);
  const camera = useBuildStore((s) => s.camera);
  const updatedAt = useBuildStore((s) => s.updatedAt);
  const reducedMotion = useReducedMotion();
  const [dpr, setDpr] = useState<[number, number]>([1, 2]);
  const report = score(useBuildStore.getState().exportSnapshot());
  void updatedAt;

  // Reduce DPR on low-end devices
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isLowEnd = (navigator.hardwareConcurrency ?? 4) < 4;
    setDpr(isLowEnd ? [1, 1.5] : [1, 2]);
  }, []);

  return (
    <Canvas
      shadows
      dpr={dpr}
      frameloop={frameloop}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      onCreated={({ gl, scene }) => {
        gl.setClearColor(new THREE.Color('#0b1020'));
        scene.fog = new THREE.Fog('#0b1020', 30, 200);
      }}
      className="h-full min-h-[56dvh] w-full md:min-h-0"
    >
      <Suspense fallback={null}>
        <PerspectiveCamera
          makeDefault
          position={xrayMode ? [44, 30, 44] : camera.position}
          fov={xrayMode ? 46 : 50}
          near={0.1}
          far={500}
        />
        <OrbitControls
          target={xrayMode ? [16, 7, 16] : camera.target}
          enableDamping={!reducedMotion}
          dampingFactor={0.08}
          minDistance={5}
          maxDistance={120}
          maxPolarAngle={Math.PI * 0.49}
        />

        {/* Lighting */}
        <ambientLight intensity={0.45} />
        <hemisphereLight args={['#a0b4d8', '#0a0e1a', 0.4]} />
        <directionalLight
          position={[30, 50, 20]}
          intensity={1.0}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-far={100}
          shadow-camera-left={-40}
          shadow-camera-right={40}
          shadow-camera-top={40}
          shadow-camera-bottom={-40}
        />

        {showGrid && (
          <Grid
            position={[gridSize.w / 2, xrayMode ? -6 : 0, gridSize.d / 2]}
            args={[gridSize.w, gridSize.d]}
            cellSize={1}
            cellThickness={0.6}
            cellColor={xrayMode ? '#0e7490' : '#3b4860'}
            sectionSize={4}
            sectionThickness={1.2}
            sectionColor={xrayMode ? '#22d3ee' : '#5b6b8a'}
            fadeDistance={80}
            fadeStrength={1.2}
            infiniteGrid={false}
          />
        )}

        {!xrayMode && <SiteEnvironment />}
        {xrayMode && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[16, -6.05, 16]}>
            <planeGeometry args={[42, 42]} />
            <meshBasicMaterial color="#020617" transparent opacity={0.96} />
          </mesh>
        )}
        <VoxelWorld />
        <CctvCoverage />
        <NetworkOverlay3D />
        {showPreview && <PlacementPreview />}
        <BuildMetricsHud report={report} xrayMode={xrayMode} />
      </Suspense>
    </Canvas>
  );
}

function BuildMetricsHud({ report, xrayMode }: { report: ReturnType<typeof score>; xrayMode: boolean }) {
  const visualMode = useBuildStore((s) => s.visualMode);
  return (
    <HtmlOverlay>
      <div className="pointer-events-none absolute left-2 top-14 w-[min(17rem,calc(100vw-1rem))] md:left-4 md:top-4">
        <div className="panel border-cyan-500/30 bg-slate-950/90 p-2 text-[10px] md:p-3 md:text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold">{xrayMode ? 'FACILITY DIGITAL TWIN' : 'Milestone HUD'}</span>
            <span className="badge">{xrayMode ? 'LIVE SIM' : visualMode === 'thermal' ? 'Thermal' : 'Standard'}</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Metric label="PUE" value={report.pue.toFixed(2)} />
            <Metric label="Score" value={`${report.competitionScore.toFixed(0)}/1000`} />
            <Metric label="Cost" value={`$${report.buildCostUsd.toLocaleString()}`} />
            <Metric label="Budget" value={`$${report.budgetUsd.toLocaleString()}`} />
          </div>
          <div className="mt-2 rounded border border-border/60 bg-bg-subtle p-2 text-[10px] text-fg-muted">
            Power load: {report.totalITLoadKW.toFixed(0)} kW · Facility:{' '}
            {report.totalFacilityPowerKW.toFixed(0)} kW
            {report.overBudget ? ' · over budget penalty active' : ''}
          </div>
          {visualMode === 'thermal' && report.breakdown.cooling < 50 && (
            <div className="mt-2 rounded border border-danger/30 bg-danger/10 p-2 text-[10px] text-danger">
              Thermal throttling alert: cooling coverage is lagging behind heat output.
            </div>
          )}
        </div>
      </div>
    </HtmlOverlay>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border bg-bg-subtle p-2">
      <div className="text-[10px] text-fg-muted">{label}</div>
      <div className="mt-0.5 break-words font-mono text-xs font-semibold md:text-sm">{value}</div>
    </div>
  );
}

function HtmlOverlay({ children }: { children: ReactNode }) {
  return (
    <Html fullscreen style={{ pointerEvents: 'none' }}>
      {children}
    </Html>
  );
}
