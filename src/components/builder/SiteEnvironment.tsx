/**
 * Site environment — ground, sky, ambient effects.
 */

'use client';

import { Sky } from '@react-three/drei';
import { useBuildStore } from '@/lib/store/build-store';
import { useMemo } from 'react';
import * as THREE from 'three';

export function SiteEnvironment() {
  const gridSize = useBuildStore((s) => s.gridSize);

  const groundGeo = useMemo(
    () => new THREE.PlaneGeometry(gridSize.w + 40, gridSize.d + 40),
    [gridSize.w, gridSize.d],
  );

  return (
    <group>
      <Sky sunPosition={[50, 30, 20]} turbidity={6} rayleigh={1.5} mieCoefficient={0.005} mieDirectionalG={0.7} />

      {/* Ground plane */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[gridSize.w / 2 - 0.5, -0.05, gridSize.d / 2 - 0.5]}
        receiveShadow
        geometry={groundGeo}
      >
        <meshStandardMaterial color="#1a1f2e" roughness={0.95} metalness={0.05} />
      </mesh>

      {/* Build site base (subtle glow) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[gridSize.w / 2 - 0.5, -0.04, gridSize.d / 2 - 0.5]}
      >
        <planeGeometry args={[gridSize.w, gridSize.d]} />
        <meshBasicMaterial color="#1a2740" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}
