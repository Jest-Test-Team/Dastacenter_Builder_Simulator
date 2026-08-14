/**
 * Placement preview — the ghost block that follows the cursor.
 *
 * Raycasts against the ground and existing blocks. Snap to grid (1m).
 * Shows green if placement is valid, red if not.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { useBuildStore, evaluatePlacement, findNearestLegalCell } from '@/lib/store/build-store';
import { getBlock } from '@/lib/blocks';

export function PlacementPreview() {
  const { camera, gl } = useThree();
  const [valid, setValid] = useState(true);
  const [reason, setReason] = useState<string>('Ready');
  const [pos, setPos] = useState<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const [size, setSize] = useState<[number, number, number]>([1, 1, 1]);
  // True when the ghost was auto-navigated to a legal cell away from the cursor.
  const [snapped, setSnapped] = useState(false);
  // Where the cursor actually points, so we can draw a hint line to the snapped spot.
  const [cursorPos, setCursorPos] = useState<THREE.Vector3>(new THREE.Vector3(0, 0, 0));

  const activeType = useBuildStore((s) => s.activeBlockType);
  const rotation = useBuildStore((s) => s.rotation);
  const placeBlock = useBuildStore((s) => s.placeBlock);
  const setHoveredCell = useBuildStore((s) => s.setHoveredCell);
  const gridSize = useBuildStore((s) => s.gridSize);
  const byCell = useBuildStore((s) => s.byCell);
  const inventory = useBuildStore((s) => s.inventory);

  const raycaster = useRef(new THREE.Raycaster());
  const groundPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const mouse = useRef(new THREE.Vector2(0, 0));
  const meshRef = useRef<THREE.Mesh>(null);

  // Update size when active type changes
  useEffect(() => {
    if (!activeType) return;
    const def = getBlock(activeType);
    if (!def) return;
    const [w, h, d] = def.size;
    const rw = rotation % 2 === 1 ? d : w;
    const rd = rotation % 2 === 1 ? w : d;
    setSize([rw, h, rd]);
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
      if (result.ok) {
        useBuildStore.getState().setPlacementError(null);
      } else {
        // Surface the reason: a silent failure is what makes a green
        // "Legal placement" ghost look like it should have dropped a block.
        useBuildStore.getState().setPlacementError(result.reason);
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
      setReason('Select a block to place');
      return;
    }

    // Resolves a raw target cell to what the ghost actually shows. If the target
    // is legal, use it. If not, auto-navigate to the nearest available spot so
    // the user can always drop the block — only staying red when nothing fits
    // anywhere (grid full or inventory exhausted).
    const resolve = (cx: number, cy: number, cz: number) => {
      const target = { x: cx, y: cy, z: cz };
      const cursorVec = new THREE.Vector3(cx + size[0] / 2, cy + size[1] / 2, cz + size[2] / 2);
      setCursorPos(cursorVec);
      const direct = evaluatePlacement({ type: activeType, position: target, rotation, gridSize, byCell, inventory });
      if (direct.ok) {
        setPos(cursorVec);
        setHoveredCell(target);
        setValid(true);
        setSnapped(false);
        setReason('Legal placement');
        return;
      }

      const nearest = findNearestLegalCell({ type: activeType, target, rotation, gridSize, byCell, inventory });
      if (nearest) {
        setPos(new THREE.Vector3(nearest.x + size[0] / 2, nearest.y + size[1] / 2, nearest.z + size[2] / 2));
        setHoveredCell(nearest);
        setValid(true);
        setSnapped(true);
        setReason('Snapped to nearest free spot');
        return;
      }

      // Nothing fits anywhere — show the honest reason at the cursor.
      setPos(cursorVec);
      setHoveredCell(target);
      setValid(false);
      setSnapped(false);
      setReason(direct.reason);
    };

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
      resolve(cx, 0, cz);
      return;
    }
    const hit = hits[0]!;
    const cx = Math.floor(hit.point.x + gridSize.w / 2);
    const cz = Math.floor(hit.point.z + gridSize.d / 2);
    const cy = Math.max(0, Math.floor(hit.point.y));
    resolve(cx, cy, cz);
  });

  if (!activeType) return null;

  return (
    <group>
      {/* Auto-navigation hint: when the ghost was snapped away from the cursor,
          draw a dashed line from where the cursor points to the free spot it
          jumped to, plus a small marker at the cursor, so the direction to the
          nearest available spot is obvious. */}
      {snapped && (
        <>
          <Line
            points={[cursorPos, pos]}
            color="#22d3ee"
            lineWidth={2}
            dashed
            dashSize={0.4}
            gapSize={0.25}
            transparent
            opacity={0.9}
          />
          <mesh position={cursorPos}>
            <boxGeometry args={[size[0], size[1], size[2]]} />
            <meshBasicMaterial color="#ef4444" transparent opacity={0.12} wireframe />
          </mesh>
        </>
      )}

      <mesh ref={meshRef} position={pos} scale={size} renderOrder={999}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial
          // Green = legal at cursor, cyan = auto-navigated to a nearby free spot,
          // red = nothing fits anywhere.
          color={!valid ? '#ef4444' : snapped ? '#22d3ee' : '#22c55e'}
          transparent
          opacity={0.35}
          wireframe={!valid}
        />
        <Html center position={[0, size[1] / 2 + 0.9, 0]} style={{ pointerEvents: 'none' }}>
          <div
            className={`rounded-full border px-2 py-1 text-[10px] font-semibold shadow-lg ${
              !valid
                ? 'border-danger/40 bg-danger/20 text-danger'
                : snapped
                  ? 'border-cyan-400/40 bg-cyan-400/20 text-cyan-300'
                  : 'border-success/40 bg-success/20 text-success'
            }`}
          >
            {snapped && valid ? '↪ ' : ''}
            {reason}
          </div>
        </Html>
      </mesh>
    </group>
  );
}
