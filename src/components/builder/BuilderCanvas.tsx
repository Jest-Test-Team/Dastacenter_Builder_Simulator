/**
 * R3F Builder Canvas.
 *
 * Sets up the renderer, camera, lighting, and contains the voxel world.
 * Used in both build mode and (lightly) in sim mode.
 */

'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Grid } from '@react-three/drei';
import { Suspense, useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useBuildStore } from '@/lib/store/build-store';
import { VoxelWorld } from './VoxelWorld';
import { PlacementPreview } from './PlacementPreview';
import { SiteEnvironment } from './SiteEnvironment';
import { CctvCoverage } from './CctvCoverage';
import { useReducedMotion } from '@/lib/hooks/useReducedMotion';

export interface BuilderCanvasProps {
  showGrid?: boolean;
  showPreview?: boolean;
  frameloop?: 'always' | 'demand';
}

export function BuilderCanvas({
  showGrid = true,
  showPreview = true,
  frameloop = 'demand',
}: BuilderCanvasProps) {
  const gridSize = useBuildStore((s) => s.gridSize);
  const camera = useBuildStore((s) => s.camera);
  const reducedMotion = useReducedMotion();
  const [dpr, setDpr] = useState<[number, number]>([1, 2]);

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
      className="h-full w-full"
    >
      <Suspense fallback={null}>
        <PerspectiveCamera
          makeDefault
          position={camera.position}
          fov={50}
          near={0.1}
          far={500}
        />
        <OrbitControls
          target={camera.target}
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
            position={[0, 0, 0]}
            args={[gridSize.w, gridSize.d]}
            cellSize={1}
            cellThickness={0.6}
            cellColor="#3b4860"
            sectionSize={4}
            sectionThickness={1.2}
            sectionColor="#5b6b8a"
            fadeDistance={80}
            fadeStrength={1.2}
            infiniteGrid={false}
          />
        )}

        <SiteEnvironment />
        <VoxelWorld />
        <CctvCoverage />
        {showPreview && <PlacementPreview />}
      </Suspense>
    </Canvas>
  );
}
