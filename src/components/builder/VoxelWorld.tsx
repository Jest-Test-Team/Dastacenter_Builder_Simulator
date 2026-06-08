/**
 * Voxel world — renders every placed block.
 *
 * Strategy: one InstancedMesh per block type (not per block). This lets us
 * render thousands of blocks at 60fps. Each instance's matrix encodes
 * position, size, and rotation. We highlight the selected block by drawing
 * a small wireframe outline around it.
 */

'use client';

import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useBuildStore } from '@/lib/store/build-store';
import { getAllBlocks, getBlock, type BlockDef } from '@/lib/blocks';
import { useBuildHistory } from '@/lib/store/build-store';
import { useBlockPlugins } from '@/lib/plugins/block-plugins';

export function VoxelWorld() {
  const voxels = useBuildStore((s) => s.voxels);
  const selectedId = useBuildStore((s) => s.selectedInstanceId);
  const visualMode = useBuildStore((s) => s.visualMode);
  const pluginRevision = useBlockPlugins((state) => state.revision);
  useBuildHistory(); // re-render on history changes

  // Group instances by block type
  const grouped = useMemo(() => {
    const out = new Map<string, THREE.Matrix4[]>();
    for (const inst of Object.values(voxels)) {
      if (!out.has(inst.type)) out.set(inst.type, []);
      const def = getBlock(inst.type);
      if (!def) continue;
      const m = new THREE.Matrix4();
      const [w, h, d] = def.size;
      const x = inst.position.x + w / 2;
      const y = inst.position.y + h / 2;
      const z = inst.position.z + d / 2;
      m.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(w, h, d));
      out.get(inst.type)!.push(m);
    }
    return out;
  }, [voxels]);
  void pluginRevision;
  const blockDefinitions = getAllBlocks();

  return (
    <group>
      {blockDefinitions.map((def) => {
        const matrices = grouped.get(def.id) ?? [];
        if (matrices.length === 0) return null;
        return <CategoryInstanced key={def.id} def={def} matrices={matrices} visualMode={visualMode} />;
      })}
      <ThermalOverlay voxels={voxels} visualMode={visualMode} />
      {selectedId && <SelectionOutline instanceId={selectedId} />}
    </group>
  );
}

function CategoryInstanced({
  def,
  matrices,
  visualMode,
}: {
  def: BlockDef;
  matrices: THREE.Matrix4[];
  visualMode: 'standard' | 'thermal';
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const setSelected = useBuildStore((s) => s.setSelected);

  useEffect(() => {
    if (!meshRef.current) return;
    const mesh = meshRef.current;
    mesh.count = matrices.length;
    for (let i = 0; i < matrices.length; i++) {
      mesh.setMatrixAt(i, matrices[i]!);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [matrices]);

  const material = useMemo(() => {
    if (visualMode === 'thermal') {
      if (def.category === 'it') return { color: '#fb7185', emissive: '#7f1d1d', emissiveIntensity: 0.75 };
      if (def.category === 'cooling') return { color: '#38bdf8', emissive: '#0f172a', emissiveIntensity: 0.6 };
      if (def.category === 'power') return { color: '#f59e0b', emissive: '#78350f', emissiveIntensity: 0.45 };
      return { color: def.color, emissive: '#111827', emissiveIntensity: 0.1 };
    }
    if (def.category === 'network') return { color: def.color, emissive: new THREE.Color(def.color).multiplyScalar(0.15), emissiveIntensity: 1 };
    if (def.category === 'safety') return { color: def.color, emissive: new THREE.Color(def.color).multiplyScalar(0.1), emissiveIntensity: 1 };
    return { color: def.color, emissive: '#000000', emissiveIntensity: 1 };
  }, [def.category, def.color, visualMode]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, matrices.length]}
      castShadow
      receiveShadow
      onClick={(e) => {
        e.stopPropagation();
        if (e.instanceId === undefined) return;
        // find instance id from matrices order
        const ids = Object.keys(useBuildStore.getState().voxels).filter(
          (k) => useBuildStore.getState().voxels[k]?.type === def.id,
        );
        const clicked = ids[e.instanceId];
        if (clicked) setSelected(clicked);
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={material.color}
        roughness={0.7}
        metalness={0.2}
        emissive={material.emissive}
        emissiveIntensity={material.emissiveIntensity}
      />
    </instancedMesh>
  );
}

function ThermalOverlay({
  voxels,
  visualMode,
}: {
  voxels: Record<string, { id: string; type: string; position: { x: number; y: number; z: number } }>;
  visualMode: 'standard' | 'thermal';
}) {
  if (visualMode !== 'thermal') return null;
  const items = Object.values(voxels)
    .map((inst) => {
      const def = getBlock(inst.type);
      if (!def) return null;
      if (def.category !== 'it' && def.category !== 'cooling') return null;
      const isHot = def.category === 'it';
      return {
        id: inst.id,
        position: [inst.position.x + 0.5, inst.position.y + 0.5, inst.position.z + 0.5] as const,
        scale: isHot ? 1.6 : 1.45,
        color: isHot ? '#ef4444' : '#38bdf8',
        opacity: isHot ? 0.16 : 0.12,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (items.length === 0) return null;

  return (
    <group>
      {items.map((item) => (
        <mesh key={item.id} position={item.position} scale={[item.scale, item.scale, item.scale]}>
          <sphereGeometry args={[0.5, 12, 12]} />
          <meshBasicMaterial color={item.color} transparent opacity={item.opacity} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function SelectionOutline({ instanceId }: { instanceId: string }) {
  const inst = useBuildStore((s) => s.voxels[instanceId]);
  if (!inst) return null;
  const def = getBlock(inst.type);
  if (!def) return null;
  const [w, h, d] = def.size;

  return (
    <mesh
      position={[inst.position.x + w / 2, inst.position.y + h / 2, inst.position.z + d / 2]}
      scale={[w + 0.05, h + 0.05, d + 0.05]}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#fbbf24" wireframe />
    </mesh>
  );
}
