/**
 * CCTV coverage cone.
 *
 * Renders a translucent cone in the build scene for every placed CCTV
 * block. Visible only in `inspect` mode so it doesn't crowd the builder.
 */

'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { useBuildStore } from '@/lib/store/build-store';
import { getBlock } from '@/lib/blocks/registry';

export interface CctvCoverageProps {
  /** Cone half-angle in degrees. Default 45. */
  angleDeg?: number;
  /** Cone length in meters. Default 12. */
  range?: number;
  /** Camera height offset in meters. */
  height?: number;
}

export function CctvCoverage({ angleDeg = 45, range = 12, height = 2.5 }: CctvCoverageProps) {
  const voxels = useBuildStore((s) => s.voxels);
  const mode = useBuildStore((s) => s.mode);

  const cones = useMemo(() => {
    if (mode !== 'inspect') return [];
    return Object.values(voxels)
      .map((v) => {
        const def = getBlock(v.type);
        if (!def || def.id !== 'cctv') return null;
        return {
          id: v.id,
          x: v.position.x + 0.5,
          y: v.position.y + height,
          z: v.position.z + 0.5,
          yawRad: ((v.rotation ?? 0) * Math.PI) / 2,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);
  }, [voxels, mode, height]);

  if (cones.length === 0) return null;
  const half = (angleDeg * Math.PI) / 180 / 2;
  const baseR = Math.tan(half) * range;

  return (
    <group>
      {cones.map((c) => (
        <group key={c.id} position={[c.x, c.y, c.z]} rotation={[0, -c.yawRad, 0]}>
          {/* ConeGeometry points along +Y; we point it along +X with a Z-rotation. */}
          <mesh rotation={[0, 0, -Math.PI / 2]} position={[range / 2, 0, 0]}>
            <coneGeometry args={[baseR, range, 16, 1, true]} />
            <meshBasicMaterial color="#5fa8d3" transparent opacity={0.18} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          {/* Camera pole dot */}
          <mesh>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshBasicMaterial color="#5fa8d3" />
          </mesh>
        </group>
      ))}
    </group>
  );
}
