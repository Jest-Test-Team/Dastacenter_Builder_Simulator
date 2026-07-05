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
  /** Signed building level: basements are negative, main floor is 0. */
  floorLevel?: number;
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
      bounds: { x: 0, y: -6, z: 0, width: 32, height: 27, depth: 32 },
      visible: true,
    },
    {
      id: 'building-a',
      parentId: 'site-main',
      kind: 'building',
      name: 'Building A',
      bounds: { x: 1, y: -6, z: 1, width: 30, height: 27, depth: 30 },
      visible: true,
    },
    ...createBuildingFloors(),
    // Legacy aliases keep older saved links and integrations valid without rendering duplicates.
    {
      id: 'room-network',
      parentId: 'main-floor',
      kind: 'room',
      name: 'Network Room (legacy)',
      floorLevel: 0,
      bounds: { x: 2, y: 0, z: 2, width: 9, height: 3, depth: 12 },
      visible: false,
    },
    {
      id: 'hall-a',
      parentId: 'main-floor',
      kind: 'hall',
      name: 'Data Hall A (legacy)',
      floorLevel: 0,
      bounds: { x: 2, y: 0, z: 15, width: 28, height: 3, depth: 14 },
      visible: false,
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

function createBuildingFloors(): SpatialUnit[] {
  const levels = [
    { id: 'basement-2', name: 'Basement 2', level: -2, y: -6 },
    { id: 'basement-1', name: 'Basement 1', level: -1, y: -3 },
    { id: 'main-floor', name: 'Main Floor', level: 0, y: 0 },
    { id: 'floor-1', name: 'Floor 1', level: 1, y: 3 },
    { id: 'floor-2', name: 'Floor 2', level: 2, y: 6 },
    { id: 'floor-3', name: 'Floor 3', level: 3, y: 9 },
    { id: 'floor-4', name: 'Floor 4', level: 4, y: 12 },
    { id: 'floor-5', name: 'Floor 5', level: 5, y: 15 },
    { id: 'floor-6', name: 'Floor 6', level: 6, y: 18 },
  ];

  return levels.flatMap(({ id, name, level, y }) => {
    const floor: SpatialUnit = {
      id,
      parentId: 'building-a',
      kind: 'floor',
      name,
      floorLevel: level,
      bounds: { x: 1, y, z: 1, width: 30, height: 3, depth: 30 },
      visible: true,
    };
    const rooms: SpatialUnit[] = [
      {
        id: `${id}-west`,
        parentId: id,
        kind: 'room',
        name: level < 0 ? 'Plant & Utilities' : level === 0 ? 'Lobby & Security' : 'Operations West',
        floorLevel: level,
        bounds: { x: 2, y, z: 2, width: 9, height: 3, depth: 12 },
        visible: true,
      },
      {
        id: `${id}-core`,
        parentId: id,
        kind: 'room',
        name: 'Core & Vertical Services',
        floorLevel: level,
        bounds: { x: 12, y, z: 2, width: 6, height: 3, depth: 12 },
        visible: true,
      },
      {
        id: `${id}-east`,
        parentId: id,
        kind: 'room',
        name: level < 0 ? 'Power Distribution' : 'Operations East',
        floorLevel: level,
        bounds: { x: 19, y, z: 2, width: 11, height: 3, depth: 12 },
        visible: true,
      },
      {
        id: `${id}-hall`,
        parentId: id,
        kind: 'hall',
        name: level === 0 ? 'Main Concourse' : `Data Hall ${Math.max(level, 1)}`,
        floorLevel: level,
        bounds: { x: 2, y, z: 15, width: 28, height: 3, depth: 14 },
        visible: true,
      },
    ];
    return [floor, ...rooms];
  });
}
