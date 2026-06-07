'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import type { Group } from 'three';
import { VoxelWorld } from '@/components/builder/VoxelWorld';
import { useReducedMotion } from '@/lib/hooks/useReducedMotion';

export function SimulationCanvas({ elapsedSeconds }: { elapsedSeconds: number }) {
  const reducedMotion = useReducedMotion();
  return (
    <Canvas camera={{ position: [16, 16, 16], fov: 50 }} dpr={[1, 2]}>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 5]} intensity={1} />
      <OrbitControls enableDamping={!reducedMotion} />
      <SiteGround />
      <VoxelWorld />
      <NPCs count={6} elapsedSeconds={elapsedSeconds} />
      <Fence />
    </Canvas>
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

function NPCs({ count, elapsedSeconds }: { count: number; elapsedSeconds: number }) {
  const refs = useRef<Array<Group | null>>([]);
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, (_, index) => ({
        x: 4 + ((index * 3.7) % 30),
        z: 4 + ((index * 5.1) % 30),
        speed: 0.3 + (index % 3) * 0.1,
      })),
    [count],
  );
  useFrame(() => {
    refs.current.forEach((ref, index) => {
      if (!ref) return;
      const seed = seeds[index]!;
      ref.position.x = Math.cos((elapsedSeconds * seed.speed + index) * 0.5) * 6 + seed.x;
      ref.position.z = Math.sin((elapsedSeconds * seed.speed + index) * 0.5) * 6 + seed.z;
    });
  });
  return (
    <>
      {seeds.map((_, index) => (
        <group
          key={index}
          ref={(element: Group | null) => {
            refs.current[index] = element;
          }}
        >
          <mesh position={[0, 0.5, 0]}>
            <capsuleGeometry args={[0.2, 0.6, 4, 8]} />
            <meshStandardMaterial color="#5fa8d3" />
          </mesh>
          <mesh position={[0, 1, 0]}>
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
    const segments: { x: number; z: number; rotation: number }[] = [];
    for (let x = 0; x < 32; x += 2) segments.push({ x, z: 0, rotation: 0 });
    for (let x = 0; x < 32; x += 2) segments.push({ x, z: 32, rotation: 0 });
    for (let z = 0; z < 32; z += 2) segments.push({ x: 0, z, rotation: Math.PI / 2 });
    for (let z = 0; z < 32; z += 2) segments.push({ x: 32, z, rotation: Math.PI / 2 });
    return segments;
  }, []);
  return (
    <>
      {lines.map((line, index) => (
        <mesh key={index} position={[line.x, 0.5, line.z]} rotation={[0, line.rotation, 0]}>
          <boxGeometry args={[0.05, 1, 0.05]} />
          <meshStandardMaterial color="#888888" />
        </mesh>
      ))}
    </>
  );
}
