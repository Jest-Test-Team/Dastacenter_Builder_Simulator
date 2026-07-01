'use client';

import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { useBuildStore } from '@/lib/store/build-store';

const LAYER_COLORS = {
  physical: '#38bdf8',
  vlan: '#a78bfa',
  vrf: '#34d399',
  vxlan: '#f59e0b',
  security: '#fb7185',
} as const;

export function NetworkOverlay3D() {
  const network = useBuildStore((state) => state.network);
  const layer = useBuildStore((state) => state.networkLayer);
  const highlighted = useBuildStore((state) => state.highlightedLinkIds);
  const selectedNodeId = useBuildStore((state) => state.selectedNetworkNodeId);
  const selectNode = useBuildStore((state) => state.setSelectedNetworkNode);

  return (
    <group>
      {Object.values(network.spaces)
        .filter((space) => space.visible && ['floor', 'room', 'hall'].includes(space.kind))
        .map((space) => (
          <lineSegments
            key={space.id}
            position={[
              space.bounds.x + space.bounds.width / 2,
              space.bounds.y + space.bounds.height / 2,
              space.bounds.z + space.bounds.depth / 2,
            ]}
          >
            <edgesGeometry
              args={[
                new THREE.BoxGeometry(space.bounds.width, space.bounds.height, space.bounds.depth),
              ]}
            />
            <lineBasicMaterial
              color={space.kind === 'hall' ? '#334155' : '#475569'}
              transparent
              opacity={0.35}
            />
          </lineSegments>
        ))}
      {Object.values(network.links).map((link) => {
        const source = network.nodes[link.sourceNodeId];
        const target = network.nodes[link.targetNodeId];
        if (!source || !target) return null;
        const points: Array<[number, number, number]> = link.pathPoints?.map((p) => [
          p.x + 0.5,
          p.y + 0.7,
          p.z + 0.5,
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
            opacity={link.enabled ? 0.9 : 0.45}
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
          <sphereGeometry args={[selectedNodeId === node.id ? 0.48 : 0.34, 16, 16]} />
          <meshStandardMaterial
            color={selectedNodeId === node.id ? '#fbbf24' : '#22d3ee'}
            emissive={selectedNodeId === node.id ? '#92400e' : '#164e63'}
            emissiveIntensity={0.8}
          />
        </mesh>
      ))}
    </group>
  );
}
