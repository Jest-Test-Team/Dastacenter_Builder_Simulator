import type { Cell } from '@/lib/grid';

export type SpaceKind = 'site' | 'building' | 'floor' | 'room' | 'hall' | 'rack';
export type NetworkNodeKind =
  | 'controller'
  | 'router'
  | 'firewall'
  | 'load-balancer'
  | 'spine'
  | 'leaf'
  | 'switch'
  | 'server'
  | 'storage'
  | 'endpoint';
export type NetworkLayer = 'physical' | 'vlan' | 'vrf' | 'vxlan' | 'security';

export interface SpatialUnit {
  id: string;
  parentId: string | null;
  kind: SpaceKind;
  name: string;
  bounds: { x: number; y: number; z: number; width: number; height: number; depth: number };
  visible: boolean;
}

export interface NetworkPort {
  id: string;
  name: string;
  kind: 'fiber' | 'copper' | 'management' | 'logical';
  speedGbps: number;
  adminUp: boolean;
}

export interface NetworkNode {
  id: string;
  name: string;
  kind: NetworkNodeKind;
  spaceId: string;
  blockInstanceId?: string;
  position: Cell;
  ports: NetworkPort[];
  managementIp?: string;
  controllerId?: string;
}

export interface NetworkLink {
  id: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
  medium: 'fiber' | 'copper' | 'logical';
  bandwidthGbps: number;
  redundancyGroup?: string;
  vlanIds: number[];
  vrf?: string;
  vxlanVni?: number;
  securityZone?: string;
  enabled: boolean;
  pathPoints?: Cell[];
}

export interface NetworkPolicy {
  id: string;
  name: string;
  sourceZone: string;
  destinationZone: string;
  action: 'allow' | 'deny';
  protocol: 'any' | 'tcp' | 'udp' | 'icmp';
  destinationPort?: number;
  priority: number;
  enabled: boolean;
}

export interface ControllerIntent {
  id: string;
  name: string;
  controllerNodeId: string;
  sourceNodeId: string;
  destinationNodeId: string;
  requiredBandwidthGbps: number;
  requireRedundancy: boolean;
  status: 'draft' | 'validated' | 'deployed' | 'failed';
  lastMessage?: string;
}

export interface NetworkState {
  spaces: Record<string, SpatialUnit>;
  nodes: Record<string, NetworkNode>;
  links: Record<string, NetworkLink>;
  policies: Record<string, NetworkPolicy>;
  intents: Record<string, ControllerIntent>;
}

export function createDefaultNetwork(): NetworkState {
  const spaces: SpatialUnit[] = [
    {
      id: 'site-main',
      parentId: null,
      kind: 'site',
      name: 'Primary Site',
      bounds: { x: 0, y: 0, z: 0, width: 32, height: 8, depth: 32 },
      visible: true,
    },
    {
      id: 'building-a',
      parentId: 'site-main',
      kind: 'building',
      name: 'Building A',
      bounds: { x: 1, y: 0, z: 1, width: 30, height: 8, depth: 30 },
      visible: true,
    },
    {
      id: 'floor-1',
      parentId: 'building-a',
      kind: 'floor',
      name: 'Floor 1',
      bounds: { x: 1, y: 0, z: 1, width: 30, height: 4, depth: 30 },
      visible: true,
    },
    {
      id: 'room-network',
      parentId: 'floor-1',
      kind: 'room',
      name: 'Network Room',
      bounds: { x: 2, y: 0, z: 2, width: 10, height: 4, depth: 10 },
      visible: true,
    },
    {
      id: 'hall-a',
      parentId: 'floor-1',
      kind: 'hall',
      name: 'Data Hall A',
      bounds: { x: 13, y: 0, z: 2, width: 17, height: 4, depth: 27 },
      visible: true,
    },
  ];
  return {
    spaces: Object.fromEntries(spaces.map((space) => [space.id, space])),
    nodes: {},
    links: {},
    policies: {},
    intents: {},
  };
}
