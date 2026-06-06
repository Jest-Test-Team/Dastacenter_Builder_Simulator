/**
 * CCTV coverage cone.
 *
 * Renders a translucent cone in the build scene for every placed CCTV
 * block. Visible only in `inspect` mode so it doesn't crowd the builder.
 */

'use client';

import { useMemo } from 'react';
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
          // Rotation 0 = +X axis, 1 = +Z, 2 = -X, 3 = -Z
          yawRad: (v.rotation ?? 0) * (Math.PI / 2),
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);
  }, [voxels, mode, height]);

  if (cones.length === 0) return null;
  const half = (angleDeg * Math.PI) / 180 / 2;

  return (
    <group>
      {cones.map((c) => (
        <Cone
          key={c.id}
          position={[c.x, c.y, c.z]}
          yaw={c.yawRad}
          range={range}
          half={half}
        />
      ))}
    </group>
  );
}

function Cone({
  position,
  yaw,
  range,
  half,
}: {
  position: [number, number, number];
  yaw: number;
  range: number;
  half: number;
}) {
  // Build a cone mesh that opens in +X then rotate to the camera's yaw.
  const geom = useMemo(() => {
    // Three's ConeGeometry points along +Y. We want +X, so pre-rotate -Z by 90°.
    // We'll instead use a custom flat cone: array of triangles.
    const segments = 16;
    const positions: number[] = [];
    const indices: number[] = [];
    // Tip at origin
    positions.push(0, 0, 0);
    // Base ring
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const r = Math.tan(half) * range;
      positions.push(range, 0, Math.cos(a) * r);
      positions.push(range, 0, Math.sin(a) * r);
      // triangle from tip to two base points
      // we'll connect as fan: tip + base[i] + base[i+1]
    }
    // Generate indices for triangle fan
    for (let i = 0; i < segments; i++) {
      const a = 1 + i * 2;
      const b = 1 + ((i + 1) % segments) * 2;
      indices.push(0, a, b);
    }
    const g = new (require('three').BufferGeometry)();
    g.setAttribute('position', new (require('three').Float32BufferAttribute)(positions, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  }, [half, range]);

  return (
    // @ts-expect-error — R3F intrinsic element typing is provided by src/types/r3f-jsx.d.ts
    <mesh position={position} rotation={[0, -yaw + Math.PI / 2, 0]} geometry={geom}>
      {/* @ts-expect-error */}
      <meshBasicMaterial color="#5fa8d3" transparent opacity={0.18} side={2} depthWrite={false} />
    </mesh>
  );
}
