'use client';

import { Line } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useBuildStore } from '@/lib/store/build-store';
import type { SpatialUnit } from '@/lib/network';

const LAYER_COLORS = {
  physical: '#22d3ee',
  vlan: '#c084fc',
  vrf: '#34d399',
  vxlan: '#fbbf24',
  security: '#fb7185',
} as const;

const PERSONNEL = [
  { x: 6, z: 7, phase: 0.1 },
  { x: 23, z: 8, phase: 1.6 },
  { x: 9, z: 21, phase: 3.2 },
  { x: 20, z: 23, phase: 4.7 },
];

export function NetworkOverlay3D() {
  const network = useBuildStore((state) => state.network);
  const layer = useBuildStore((state) => state.networkLayer);
  const highlighted = useBuildStore((state) => state.highlightedLinkIds);
  const selectedNodeId = useBuildStore((state) => state.selectedNetworkNodeId);
  const selectedFloorId = useBuildStore((state) => state.selectedSpatialFloorId);
  const selectNode = useBuildStore((state) => state.setSelectedNetworkNode);
  const selectFloor = useBuildStore((state) => state.setSelectedSpatialFloor);
  const scanRef = useRef<THREE.Mesh>(null);
  const personnelRef = useRef<THREE.Group>(null);
  const { invalidate } = useThree();

  const floors = useMemo(
    () =>
      Object.values(network.spaces)
        .filter((space) => space.kind === 'floor' && space.visible)
        .sort((a, b) => (a.floorLevel ?? a.bounds.y) - (b.floorLevel ?? b.bounds.y)),
    [network.spaces],
  );
  const selectedFloor = floors.find((floor) => floor.id === selectedFloorId) ?? floors[0];
  const rooms = useMemo(
    () =>
      Object.values(network.spaces).filter(
        (space) =>
          space.visible &&
          (space.kind === 'room' || space.kind === 'hall') &&
          floors.some((floor) => floor.id === space.parentId),
      ),
    [floors, network.spaces],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (scanRef.current) {
      scanRef.current.position.y = -6 + ((t * 2.1) % 27);
      const material = scanRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.08 + Math.sin(t * 3) * 0.025;
    }
    if (personnelRef.current) {
      personnelRef.current.children.forEach((child, index) => {
        const marker = PERSONNEL[index];
        if (!marker) return;
        child.position.x = marker.x + Math.sin(t * 0.7 + marker.phase) * 1.2;
        child.position.z = marker.z + Math.cos(t * 0.55 + marker.phase) * 0.9;
      });
    }
    invalidate();
  });

  return (
    <group>
      <BuildingShell />
      {floors.map((floor) => {
        const active = floor.id === selectedFloor?.id;
        return (
          <group key={floor.id} onClick={() => selectFloor(floor.id)}>
            <WireBox space={floor} color={active ? '#67e8f9' : '#0e7490'} opacity={active ? 0.92 : 0.28} />
            <mesh position={[16, floor.bounds.y + 0.03, 16]}>
              <boxGeometry args={[30, 0.04, 30]} />
              <meshBasicMaterial
                color={active ? '#0e7490' : '#083344'}
                transparent
                opacity={active ? 0.2 : 0.035}
                depthWrite={false}
              />
            </mesh>
          </group>
        );
      })}

      {rooms.map((space) => {
        const active = space.parentId === selectedFloor?.id;
        return (
          <WireBox
            key={space.id}
            space={space}
            color={active ? (space.kind === 'hall' ? '#2dd4bf' : '#22d3ee') : '#164e63'}
            opacity={active ? 0.72 : 0.12}
          />
        );
      })}

      {selectedFloor && (
        <group ref={personnelRef} position={[0, selectedFloor.bounds.y + 0.12, 0]}>
          {PERSONNEL.map((person) => (
            <PersonnelMarker key={`${person.x}-${person.z}`} position={[person.x, 0, person.z]} />
          ))}
        </group>
      )}

      <mesh ref={scanRef} position={[16, 0, 16]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[34, 34]} />
        <meshBasicMaterial
          color="#22d3ee"
          transparent
          opacity={0.1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {Object.values(network.links).map((link) => {
        const source = network.nodes[link.sourceNodeId];
        const target = network.nodes[link.targetNodeId];
        if (!source || !target) return null;
        const points: Array<[number, number, number]> = link.pathPoints?.map((point) => [
          point.x + 0.5,
          point.y + 0.7,
          point.z + 0.5,
        ]) ?? [
          [source.position.x + 0.5, source.position.y + 0.7, source.position.z + 0.5],
          [target.position.x + 0.5, target.position.y + 0.7, target.position.z + 0.5],
        ];
        return (
          <Line
            key={link.id}
            points={points}
            color={
              link.enabled
                ? highlighted.includes(link.id)
                  ? '#fef08a'
                  : LAYER_COLORS[layer]
                : '#ef4444'
            }
            lineWidth={highlighted.includes(link.id) ? 4 : 2}
            dashed={!link.enabled}
            transparent
            opacity={link.enabled ? 0.92 : 0.45}
          />
        );
      })}
      {Object.values(network.nodes).map((node) => (
        <mesh
          key={node.id}
          position={[node.position.x + 0.5, node.position.y + 0.5, node.position.z + 0.5]}
          onClick={(event) => {
            event.stopPropagation();
            selectNode(node.id);
          }}
        >
          <octahedronGeometry args={[selectedNodeId === node.id ? 0.5 : 0.34]} />
          <meshBasicMaterial
            color={selectedNodeId === node.id ? '#fde047' : '#22d3ee'}
            transparent
            opacity={0.95}
          />
        </mesh>
      ))}
    </group>
  );
}

function WireBox({ space, color, opacity }: { space: SpatialUnit; color: string; opacity: number }) {
  const geometry = useMemo(
    () => new THREE.BoxGeometry(space.bounds.width, space.bounds.height, space.bounds.depth),
    [space.bounds.depth, space.bounds.height, space.bounds.width],
  );
  return (
    <lineSegments
      position={[
        space.bounds.x + space.bounds.width / 2,
        space.bounds.y + space.bounds.height / 2,
        space.bounds.z + space.bounds.depth / 2,
      ]}
    >
      <edgesGeometry args={[geometry]} />
      <lineBasicMaterial color={color} transparent opacity={opacity} blending={THREE.AdditiveBlending} />
    </lineSegments>
  );
}

function BuildingShell() {
  return (
    <group>
      <Line points={[[1, -6, 1], [1, 21, 1], [31, 21, 1], [31, -6, 1], [1, -6, 1]]} color="#0891b2" transparent opacity={0.42} />
      <Line points={[[1, -6, 31], [1, 21, 31], [31, 21, 31], [31, -6, 31], [1, -6, 31]]} color="#0891b2" transparent opacity={0.42} />
      <Line points={[[1, -6, 1], [1, -6, 31]]} color="#0891b2" transparent opacity={0.42} />
      <Line points={[[31, -6, 1], [31, -6, 31]]} color="#0891b2" transparent opacity={0.42} />
      <Line points={[[1, 21, 1], [1, 21, 31]]} color="#0891b2" transparent opacity={0.42} />
      <Line points={[[31, 21, 1], [31, 21, 31]]} color="#0891b2" transparent opacity={0.42} />
    </group>
  );
}

function PersonnelMarker({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.45, 0]}>
        <sphereGeometry args={[0.19, 10, 10]} />
        <meshBasicMaterial color="#f0fdfa" />
      </mesh>
      <mesh position={[0, 0.82, 0]}>
        <capsuleGeometry args={[0.16, 0.7, 4, 8]} />
        <meshBasicMaterial color="#5eead4" transparent opacity={0.86} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[0.32, 0.42, 20]} />
        <meshBasicMaterial color="#2dd4bf" transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
