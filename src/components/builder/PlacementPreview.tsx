/**
 * Placement preview — the ghost block that follows the cursor.
 *
 * Raycasts against the ground and existing blocks. Snap to grid (1m).
 * Shows green if placement is valid, red if not.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useBuildStore } from '@/lib/store/build-store';
import { getBlock } from '@/lib/blocks';

export function PlacementPreview() {
  const { camera, gl } = useThree();
  const [valid, setValid] = useState(true);
  const [pos, setPos] = useState<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const [size, setSize] = useState<[number, number, number]>([1, 1, 1]);
  const [color, setColor] = useState<string>('#22c55e');

  const activeType = useBuildStore((s) => s.activeBlockType);
  const rotation = useBuildStore((s) => s.rotation);
  const placeBlock = useBuildStore((s) => s.placeBlock);
  const hoveredCell = useBuildStore((s) => s.hoveredCell);
  const setHoveredCell = useBuildStore((s) => s.setHoveredCell);
  const gridSize = useBuildStore((s) => s.gridSize);
  const byCell = useBuildStore((s) => s.byCell);

  const raycaster = useRef(new THREE.Raycaster());
  const groundPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const mouse = useRef(new THREE.Vector2(0, 0));
  const meshRef = useRef<THREE.Mesh>(null);

  // Update size + color when active type changes
  useEffect(() => {
    if (!activeType) return;
    const def = getBlock(activeType);
    if (!def) return;
    let [w, h, d] = def.size;
    if (rotation % 2 === 1) [w, d] = [d, w];
    setSize([w, h, d]);
    setColor(def.color);
  }, [activeType, rotation]);

  // Raycast on mouse move
  useEffect(() => {
    const dom = gl.domElement;
    function onMove(e: MouseEvent) {
      const rect = dom.getBoundingClientRect();
      mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    }
    function onClick(e: MouseEvent) {
      if (!activeType) return;
      if (e.button !== 0) return;
      // Use hovered cell from store
      const cell = useBuildStore.getState().hoveredCell;
      if (!cell) return;
      const result = placeBlock(activeType, cell, rotation);
      if (!result.ok) {
        // could show toast
        console.warn('Placement failed:', result.reason);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') useBuildStore.getState().setActiveBlockType(null);
      if (e.key === 'r' || e.key === 'R') {
        const r = useBuildStore.getState().rotation;
        useBuildStore.getState().setRotation(((r + 1) % 4) as 0 | 1 | 2 | 3);
      }
    }
    dom.addEventListener('mousemove', onMove);
    dom.addEventListener('click', onClick);
    dom.addEventListener('keydown', onKey);
    return () => {
      dom.removeEventListener('mousemove', onMove);
      dom.removeEventListener('click', onClick);
      dom.removeEventListener('keydown', onKey);
    };
  }, [gl, activeType, rotation, placeBlock]);

  useFrame(() => {
    if (!activeType) {
      setHoveredCell(null);
      return;
    }
    raycaster.current.setFromCamera(mouse.current, camera);
    const hits = raycaster.current.intersectObject(
      // Find first non-preview object
      (camera.parent ?? new THREE.Object3D()) as THREE.Object3D,
      true,
    );
    if (hits.length === 0) {
      // intersect ground
      const groundHit = new THREE.Vector3();
      raycaster.current.ray.intersectPlane(groundPlane.current, groundHit);
      if (!groundHit) return;
      const cx = Math.floor(groundHit.x + gridSize.w / 2);
      const cz = Math.floor(groundHit.z + gridSize.d / 2);
      const cy = 0;
      if (cx < 0 || cx >= gridSize.w || cz < 0 || cz >= gridSize.d) {
        setValid(false);
        return;
      }
      setPos(new THREE.Vector3(cx + size[0] / 2, cy + size[1] / 2, cz + size[2] / 2));
      setHoveredCell({ x: cx, y: cy, z: cz });
      setValid(true);
      return;
    }
    // For now, just snap to ground using first hit
    const hit = hits[0]!;
    const cx = Math.floor(hit.point.x + gridSize.w / 2);
    const cz = Math.floor(hit.point.z + gridSize.d / 2);
    const cy = Math.max(0, Math.floor(hit.point.y));
    setPos(new THREE.Vector3(cx + size[0] / 2, cy + size[1] / 2, cz + size[2] / 2));
    setHoveredCell({ x: cx, y: cy, z: cz });
    // Validate
    let ok = true;
    for (let dx = 0; dx < size[0]; dx++) {
      for (let dy = 0; dy < size[1]; dy++) {
        for (let dz = 0; dz < size[2]; dz++) {
          const c = `${cx + dx},${cy + dy},${cz + dz}`;
          if (byCell[c]) {
            ok = false;
            break;
          }
        }
      }
    }
    setValid(ok);
  });

  if (!activeType) return null;

  return (
    <mesh
      ref={meshRef}
      position={pos}
      scale={size}
      renderOrder={999}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial
        color={valid ? '#22c55e' : '#ef4444'}
        transparent
        opacity={0.35}
        wireframe={!valid}
      />
    </mesh>
  );
}
