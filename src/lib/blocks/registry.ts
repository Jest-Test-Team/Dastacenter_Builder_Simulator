/**
 * Block registry — the single source of truth for every placeable block.
 *
 * Each block's metadata is read by the scoring engine (P7) to evaluate
 * compliance with Uptime, TIA-942, EN 50600, ASHRAE, NFPA, ISO 27001,
 * EU EED, Singapore DIA, Germany EnEfG, and China PUE rules.
 *
 * Adding a new block: append to the appropriate category below.
 * The scoring engine picks it up automatically.
 */

import type { BlockDef, BlockCategory, BlockInstance, BuildState } from './types';
import { cellKey } from '@/lib/grid';
import { nanoid } from 'nanoid';

// ----------------------------------------------------------------------------
// STRUCTURE
// ----------------------------------------------------------------------------

const structure: BlockDef[] = [
  {
    id: 'floor_tile',
    category: 'structure',
    displayName: 'Floor Tile',
    shortName: 'Floor',
    description: 'Standard raised concrete floor tile. Foundation for everything else.',
    size: [1, 1, 1],
    color: '#9ca3af',
    tags: ['floor', 'base', 'foundation'],
    powerDraw: 0,
    heatLoad: 0,
    tierRole: 'none',
    ports: [],
    standards: ['TIA-942', 'EN 50600-2-1'],
    decorative: false,
    defaultInventory: 200,
    order: 0,
    icon: '▢',
  },
  {
    id: 'fire_wall',
    category: 'structure',
    displayName: 'Fire-Rated Wall',
    shortName: 'Wall',
    description: '2-hour fire-rated wall. Required to separate fire zones per NFPA 75.',
    size: [1, 3, 1],
    color: '#dc2626',
    tags: ['wall', 'fire', 'barrier'],
    powerDraw: 0,
    heatLoad: 0,
    tierRole: 'none',
    ports: [],
    standards: ['NFPA 75', 'EN 50600-2-1'],
    decorative: false,
    defaultInventory: 50,
    order: 1,
    icon: '▮',
  },
  {
    id: 'raised_floor_tile',
    category: 'structure',
    displayName: 'Raised Floor Tile',
    shortName: 'Raised',
    description: 'Perforated raised floor for underfloor cooling distribution.',
    size: [1, 1, 1],
    color: '#a3a3a3',
    tags: ['floor', 'cooling', 'underfloor'],
    powerDraw: 0,
    heatLoad: 0,
    tierRole: 'none',
    ports: [],
    standards: ['ASHRAE TC 9.9', 'TIA-942'],
    decorative: false,
    defaultInventory: 100,
    order: 2,
    icon: '⊞',
  },
  {
    id: 'door',
    category: 'structure',
    displayName: 'Door',
    shortName: 'Door',
    description: 'Single door with electronic lock mount.',
    size: [1, 1, 1],
    color: '#737373',
    tags: ['access', 'entry'],
    powerDraw: 0.05,
    heatLoad: 0,
    tierRole: 'none',
    ports: [{ kind: 'data', direction: 'bi', capacity: 1 }],
    standards: ['EN 50600-2-5'],
    decorative: false,
    defaultInventory: 30,
    order: 3,
    icon: '▯',
  },
  {
    id: 'mantrap',
    category: 'structure',
    displayName: 'Mantrap / Security Portal',
    shortName: 'Mantrap',
    description: 'Double-door interlock. Only one person may pass at a time after auth.',
    size: [1, 2, 2],
    color: '#525252',
    tags: ['access', 'security', 'physical'],
    powerDraw: 0.2,
    heatLoad: 0,
    tierRole: 'none',
    ports: [{ kind: 'data', direction: 'bi', capacity: 1 }],
    standards: ['EN 50600-2-5', 'ISO 27001 A.7'],
    decorative: false,
    defaultInventory: 4,
    order: 4,
    icon: '⌧',
  },
];

// ----------------------------------------------------------------------------
// SITE
// ----------------------------------------------------------------------------

const site: BlockDef[] = [
  {
    id: 'perimeter_fence',
    category: 'site',
    displayName: 'Perimeter Fence',
    shortName: 'Fence',
    description: 'Site perimeter fence. Required for tier III/IV and most ESG audits.',
    size: [1, 2, 1],
    color: '#65a30d',
    tags: ['security', 'physical', 'deterrent'],
    powerDraw: 0,
    heatLoad: 0,
    tierRole: 'none',
    ports: [],
    standards: ['EN 50600-2-5', 'Uptime Tier III/IV'],
    decorative: false,
    defaultInventory: 100,
    order: 0,
    icon: '║',
  },
  {
    id: 'security_gate',
    category: 'site',
    displayName: 'Security Gate',
    shortName: 'Gate',
    description: 'Vehicle/personnel gate in the perimeter fence.',
    size: [2, 2, 1],
    color: '#4d7c0f',
    tags: ['security', 'access'],
    powerDraw: 0.1,
    heatLoad: 0,
    tierRole: 'none',
    ports: [{ kind: 'data', direction: 'bi', capacity: 1 }],
    standards: ['EN 50600-2-5'],
    decorative: false,
    defaultInventory: 6,
    order: 1,
    icon: '▭',
  },
  {
    id: 'bollard',
    category: 'site',
    displayName: 'Bollard',
    shortName: 'Bollard',
    description: 'Anti-ram bollard. Stops vehicle-based attacks.',
    size: [1, 1, 1],
    color: '#a3a3a3',
    tags: ['security', 'deterrent', 'physical'],
    powerDraw: 0,
    heatLoad: 0,
    tierRole: 'none',
    ports: [],
    standards: ['EN 50600-2-5'],
    decorative: false,
    defaultInventory: 30,
    order: 2,
    icon: '⏍',
  },
  {
    id: 'barbed_wire',
    category: 'site',
    displayName: 'Barbed Wire',
    shortName: 'Barbed',
    description: 'Barbed wire on top of fence. Visual + physical deterrent.',
    size: [1, 1, 1],
    color: '#71717a',
    tags: ['security', 'deterrent'],
    powerDraw: 0,
    heatLoad: 0,
    tierRole: 'none',
    ports: [],
    standards: ['EN 50600-2-5'],
    decorative: true,
    defaultInventory: 50,
    order: 3,
    icon: '✦',
  },
  {
    id: 'security_light',
    category: 'site',
    displayName: 'Security Light',
    shortName: 'Light',
    description: 'High-intensity security light. Eliminates shadows at night.',
    size: [1, 1, 1],
    color: '#fde68a',
    tags: ['security', 'deterrent', 'lighting'],
    powerDraw: 0.4,
    heatLoad: 0.1,
    tierRole: 'none',
    ports: [{ kind: 'power', direction: 'in', capacity: 1 }],
    standards: ['EN 50600-2-5'],
    decorative: false,
    defaultInventory: 20,
    order: 4,
    icon: '◉',
  },
  {
    id: 'loading_dock',
    category: 'site',
    displayName: 'Loading Dock',
    shortName: 'Dock',
    description: 'Secure loading dock for equipment delivery.',
    size: [2, 1, 2],
    color: '#a16207',
    tags: ['logistics', 'access'],
    powerDraw: 0,
    heatLoad: 0,
    tierRole: 'none',
    ports: [],
    standards: ['TIA-942'],
    decorative: false,
    defaultInventory: 2,
    order: 5,
    icon: '⊓',
  },
  {
    id: 'cctv_camera',
    category: 'site',
    displayName: 'CCTV Camera',
    shortName: 'CCTV',
    description: 'Visible surveillance camera. Deterrent + detective.',
    size: [1, 1, 1],
    color: '#1e1b4b',
    tags: ['security', 'deterrent', 'detective', 'physical'],
    powerDraw: 0.05,
    heatLoad: 0,
    tierRole: 'none',
    ports: [
      { kind: 'power', direction: 'in', capacity: 1 },
      { kind: 'data', direction: 'out', capacity: 1 },
    ],
    standards: ['EN 50600-2-5', 'ISO 27001 A.7'],
    decorative: false,
    defaultInventory: 20,
    order: 6,
    icon: '◉',
  },
  {
    id: 'warning_sign',
    category: 'site',
    displayName: 'Warning Sign',
    shortName: 'Sign',
    description: 'Warning sign (e.g. "High Voltage", "Authorized Personnel Only").',
    size: [1, 1, 1],
    color: '#eab308',
    tags: ['security', 'deterrent', 'administrative'],
    powerDraw: 0,
    heatLoad: 0,
    tierRole: 'none',
    ports: [],
    standards: ['ISO 27001 A.7'],
    decorative: true,
    defaultInventory: 30,
    order: 7,
    icon: '⚠',
  },
];

// ----------------------------------------------------------------------------
// POWER
// ----------------------------------------------------------------------------

const power: BlockDef[] = [
  {
    id: 'utility_feed',
    category: 'power',
    displayName: 'Utility Feed',
    shortName: 'Utility',
    description: 'Grid utility feed. The source of all power.',
    size: [1, 1, 1],
    color: '#fbbf24',
    tags: ['power', 'grid', 'incoming'],
    powerDraw: -1000,
    heatLoad: 0,
    tierRole: 'N',
    ports: [{ kind: 'power', direction: 'out', capacity: 1000 }],
    standards: ['Uptime Tier I-IV', 'TIA-942'],
    decorative: false,
    defaultInventory: 4,
    order: 0,
    icon: '⚡',
  },
  {
    id: 'transformer',
    category: 'power',
    displayName: 'Transformer',
    shortName: 'XFMR',
    description: 'Steps utility voltage down to distribution levels.',
    size: [1, 2, 1],
    color: '#a16207',
    tags: ['power', 'transformer'],
    powerDraw: 1,
    heatLoad: 1.5,
    tierRole: 'N+1',
    ports: [
      { kind: 'power', direction: 'in', capacity: 1000 },
      { kind: 'power', direction: 'out', capacity: 1000 },
    ],
    standards: ['Uptime Tier II+'],
    decorative: false,
    defaultInventory: 6,
    order: 1,
    icon: '◈',
  },
  {
    id: 'switchgear',
    category: 'power',
    displayName: 'Switchgear',
    shortName: 'Switch',
    description: 'Main power distribution switchgear.',
    size: [1, 2, 1],
    color: '#92400e',
    tags: ['power', 'distribution'],
    powerDraw: 0.5,
    heatLoad: 0.5,
    tierRole: 'N+1',
    ports: [
      { kind: 'power', direction: 'in', capacity: 1000 },
      { kind: 'power', direction: 'out', capacity: 1000 },
    ],
    standards: ['Uptime Tier I-IV'],
    decorative: false,
    defaultInventory: 4,
    order: 2,
    icon: '▣',
  },
  {
    id: 'ups',
    category: 'power',
    displayName: 'UPS',
    shortName: 'UPS',
    description: 'Uninterruptible Power Supply. Bridges utility to generator.',
    size: [1, 2, 1],
    color: '#facc15',
    tags: ['power', 'battery', 'ride-through'],
    powerDraw: 2,
    heatLoad: 3,
    tierRole: 'N+1',
    ports: [
      { kind: 'power', direction: 'in', capacity: 500 },
      { kind: 'power', direction: 'out', capacity: 500 },
    ],
    standards: ['Uptime Tier II+', 'TIA-942'],
    decorative: false,
    defaultInventory: 4,
    order: 3,
    icon: '⎓',
  },
  {
    id: 'battery',
    category: 'power',
    displayName: 'Battery',
    shortName: 'Battery',
    description: 'Battery bank paired with UPS. Provides ride-through minutes.',
    size: [1, 2, 1],
    color: '#a3a3a3',
    tags: ['power', 'battery'],
    powerDraw: 0.5,
    heatLoad: 0.5,
    tierRole: 'N+1',
    ports: [{ kind: 'power', direction: 'bi', capacity: 500 }],
    standards: ['Uptime Tier II+'],
    decorative: false,
    defaultInventory: 4,
    order: 4,
    icon: '▭',
  },
  {
    id: 'generator',
    category: 'power',
    displayName: 'Diesel Generator',
    shortName: 'Gen',
    description: 'Backup diesel generator. Takes over on utility failure.',
    size: [2, 1, 2],
    color: '#7c2d12',
    tags: ['power', 'backup', 'generator'],
    powerDraw: 0.5,
    heatLoad: 2,
    tierRole: 'N+1',
    ports: [
      { kind: 'power', direction: 'out', capacity: 1000 },
      { kind: 'water', direction: 'in', capacity: 1 },
    ],
    standards: ['Uptime Tier III+', 'NFPA 110'],
    decorative: false,
    defaultInventory: 4,
    order: 5,
    icon: '⚙',
  },
  {
    id: 'pdu',
    category: 'power',
    displayName: 'PDU',
    shortName: 'PDU',
    description: 'Power Distribution Unit. Final leg to rack.',
    size: [1, 1, 1],
    color: '#fde047',
    tags: ['power', 'distribution', 'rack'],
    powerDraw: 0.2,
    heatLoad: 0.3,
    tierRole: 'N+1',
    ports: [
      { kind: 'power', direction: 'in', capacity: 100 },
      { kind: 'power', direction: 'out', capacity: 100 },
    ],
    standards: ['Uptime Tier II+', 'TIA-942'],
    decorative: false,
    defaultInventory: 20,
    order: 6,
    icon: '⎘',
  },
  {
    id: 'busway',
    category: 'power',
    displayName: 'Busway',
    shortName: 'Bus',
    description: 'Overhead busway for power distribution.',
    size: [1, 1, 1],
    color: '#fbbf24',
    tags: ['power', 'overhead'],
    powerDraw: 0.1,
    heatLoad: 0.2,
    tierRole: 'N+1',
    ports: [
      { kind: 'power', direction: 'in', capacity: 500 },
      { kind: 'power', direction: 'out', capacity: 500 },
    ],
    standards: ['TIA-942'],
    decorative: false,
    defaultInventory: 30,
    order: 7,
    icon: '═',
  },
];

// ----------------------------------------------------------------------------
// COOLING
// ----------------------------------------------------------------------------

const cooling: BlockDef[] = [
  {
    id: 'crac',
    category: 'cooling',
    displayName: 'CRAC Unit',
    shortName: 'CRAC',
    description: 'Computer Room Air Conditioning. Cold air supply.',
    size: [1, 2, 1],
    color: '#22d3ee',
    tags: ['cooling', 'air', 'crac'],
    powerDraw: 5,
    heatLoad: -15, // negative because it REMOVES heat
    tierRole: 'N+1',
    ports: [
      { kind: 'power', direction: 'in', capacity: 10 },
      { kind: 'water', direction: 'in', capacity: 1 },
    ],
    standards: ['ASHRAE TC 9.9 A1', 'Uptime Tier I+'],
    decorative: false,
    defaultInventory: 8,
    order: 0,
    icon: '❄',
  },
  {
    id: 'in_row_cooling',
    category: 'cooling',
    displayName: 'In-Row Cooling',
    shortName: 'InRow',
    description: 'In-row cooler placed between hot/cold aisles.',
    size: [1, 2, 1],
    color: '#06b6d4',
    tags: ['cooling', 'in-row', 'high-density'],
    powerDraw: 4,
    heatLoad: -25,
    tierRole: 'N+1',
    ports: [
      { kind: 'power', direction: 'in', capacity: 10 },
      { kind: 'water', direction: 'in', capacity: 1 },
    ],
    standards: ['ASHRAE TC 9.9 A1/A2', 'TIA-942'],
    decorative: false,
    defaultInventory: 6,
    order: 1,
    icon: '◐',
  },
  {
    id: 'cdu',
    category: 'cooling',
    displayName: 'CDU',
    shortName: 'CDU',
    description: 'Coolant Distribution Unit. Backbone of liquid cooling.',
    size: [1, 1, 2],
    color: '#0e7490',
    tags: ['cooling', 'liquid', 'cdu'],
    powerDraw: 2,
    heatLoad: -50,
    tierRole: 'N+1',
    ports: [
      { kind: 'power', direction: 'in', capacity: 5 },
      { kind: 'water', direction: 'bi', capacity: 5 },
    ],
    standards: ['ASHRAE TC 9.9 W1-W4', 'OCP'],
    decorative: false,
    defaultInventory: 4,
    order: 2,
    icon: '◈',
  },
  {
    id: 'immersion_tank',
    category: 'cooling',
    displayName: 'Immersion Tank',
    shortName: 'Immerse',
    description: 'Immersion cooling tank. Highest density.',
    size: [2, 1, 1],
    color: '#1e3a8a',
    tags: ['cooling', 'liquid', 'immersion', 'high-density'],
    powerDraw: 3,
    heatLoad: -100,
    tierRole: 'N+1',
    ports: [
      { kind: 'power', direction: 'in', capacity: 5 },
      { kind: 'water', direction: 'bi', capacity: 5 },
    ],
    standards: ['ASHRAE TC 9.9 W4', 'OCP'],
    decorative: false,
    defaultInventory: 4,
    order: 3,
    icon: '▥',
  },
  {
    id: 'chilled_water_pipe',
    category: 'cooling',
    displayName: 'Chilled Water Pipe',
    shortName: 'Pipe',
    description: 'Chilled water distribution pipe.',
    size: [1, 1, 1],
    color: '#67e8f9',
    tags: ['cooling', 'water', 'pipe'],
    powerDraw: 0,
    heatLoad: 0,
    tierRole: 'none',
    ports: [{ kind: 'water', direction: 'bi', capacity: 5 }],
    standards: ['ASHRAE TC 9.9'],
    decorative: false,
    defaultInventory: 50,
    order: 4,
    icon: '─',
  },
  {
    id: 'rear_door_hec',
    category: 'cooling',
    displayName: 'Rear-Door HEC',
    shortName: 'HEC',
    description: 'Rear-door heat exchanger. Rack-mounted cooling.',
    size: [1, 2, 1],
    color: '#0891b2',
    tags: ['cooling', 'rack', 'hec'],
    powerDraw: 0.3,
    heatLoad: -10,
    tierRole: 'N+1',
    ports: [{ kind: 'water', direction: 'bi', capacity: 1 }],
    standards: ['ASHRAE TC 9.9'],
    decorative: false,
    defaultInventory: 8,
    order: 5,
    icon: '◧',
  },
];

// ----------------------------------------------------------------------------
// IT
// ----------------------------------------------------------------------------

const it: BlockDef[] = [
  {
    id: 'server_rack',
    category: 'it',
    displayName: 'Server Rack',
    shortName: 'Rack',
    description: 'Standard 42U server rack. The unit of IT capacity.',
    size: [1, 2, 1],
    color: '#a78bfa',
    tags: ['it', 'server', 'rack'],
    powerDraw: 5,
    heatLoad: 5,
    tierRole: 'none',
    ports: [
      { kind: 'power', direction: 'in', capacity: 10 },
      { kind: 'network', direction: 'bi', capacity: 10 },
    ],
    standards: ['TIA-942', 'ASHRAE A1'],
    decorative: false,
    defaultInventory: 40,
    order: 0,
    icon: '▥',
  },
  {
    id: 'blade_chassis',
    category: 'it',
    displayName: 'Blade Chassis',
    shortName: 'Blade',
    description: 'High-density blade chassis. Goes in a rack.',
    size: [1, 1, 1],
    color: '#8b5cf6',
    tags: ['it', 'server', 'blade', 'high-density'],
    powerDraw: 8,
    heatLoad: 8,
    tierRole: 'none',
    ports: [
      { kind: 'power', direction: 'in', capacity: 12 },
      { kind: 'network', direction: 'bi', capacity: 10 },
    ],
    standards: ['ASHRAE A2', 'TIA-942'],
    decorative: false,
    defaultInventory: 20,
    order: 1,
    icon: '◫',
  },
  {
    id: 'tor_switch',
    category: 'it',
    displayName: 'ToR Switch',
    shortName: 'ToR',
    description: 'Top-of-Rack network switch.',
    size: [1, 1, 1],
    color: '#7c3aed',
    tags: ['it', 'network', 'switch'],
    powerDraw: 0.5,
    heatLoad: 0.5,
    tierRole: 'N+1',
    ports: [
      { kind: 'power', direction: 'in', capacity: 1 },
      { kind: 'network', direction: 'bi', capacity: 48 },
    ],
    standards: ['TIA-942', 'ISO 27001 A.8'],
    decorative: false,
    defaultInventory: 20,
    order: 2,
    icon: '⇄',
  },
  {
    id: 'storage_array',
    category: 'it',
    displayName: 'Storage Array',
    shortName: 'Storage',
    description: 'High-capacity storage array.',
    size: [1, 2, 1],
    color: '#6d28d9',
    tags: ['it', 'storage'],
    powerDraw: 4,
    heatLoad: 4,
    tierRole: 'none',
    ports: [
      { kind: 'power', direction: 'in', capacity: 8 },
      { kind: 'network', direction: 'bi', capacity: 10 },
    ],
    standards: ['TIA-942', 'ISO 27001 A.8'],
    decorative: false,
    defaultInventory: 10,
    order: 3,
    icon: '▦',
  },
  {
    id: 'firewall',
    category: 'it',
    displayName: 'Firewall',
    shortName: 'FW',
    description: 'Perimeter network firewall appliance.',
    size: [1, 1, 1],
    color: '#5b21b6',
    tags: ['it', 'network', 'security', 'preventive'],
    powerDraw: 0.6,
    heatLoad: 0.6,
    tierRole: 'N+1',
    ports: [
      { kind: 'power', direction: 'in', capacity: 1 },
      { kind: 'network', direction: 'bi', capacity: 20 },
    ],
    standards: ['ISO 27001 A.8', 'NIST CSF'],
    decorative: false,
    defaultInventory: 4,
    order: 4,
    icon: '▰',
  },
  {
    id: 'sdn_controller',
    category: 'it',
    displayName: 'SDN Controller',
    shortName: 'SDN',
    description: 'Software-Defined Networking controller. Orchestrates the fabric.',
    size: [1, 1, 1],
    color: '#4c1d95',
    tags: ['it', 'network', 'sdn', 'orchestration'],
    powerDraw: 0.4,
    heatLoad: 0.4,
    tierRole: 'N+1',
    ports: [
      { kind: 'power', direction: 'in', capacity: 1 },
      { kind: 'network', direction: 'bi', capacity: 10 },
    ],
    standards: ['ISO 27001 A.8'],
    decorative: false,
    defaultInventory: 4,
    order: 5,
    icon: '◈',
  },
  {
    id: 'hypervisor_node',
    category: 'it',
    displayName: 'Hypervisor Node',
    shortName: 'HV',
    description: 'Hypervisor host running virtual machines.',
    size: [1, 1, 1],
    color: '#5b21b6',
    tags: ['it', 'virtualization', 'hypervisor'],
    powerDraw: 3,
    heatLoad: 3,
    tierRole: 'none',
    ports: [
      { kind: 'power', direction: 'in', capacity: 5 },
      { kind: 'network', direction: 'bi', capacity: 10 },
    ],
    standards: ['ISO 27001 A.8'],
    decorative: false,
    defaultInventory: 12,
    order: 6,
    icon: '⬡',
  },
  {
    id: 'gpu_pod',
    category: 'it',
    displayName: 'GPU Pod (AI/ML)',
    shortName: 'GPU',
    description: 'AI/ML compute pod. Very high density, needs liquid cooling.',
    size: [1, 2, 1],
    color: '#c084fc',
    tags: ['it', 'gpu', 'ai', 'high-density'],
    powerDraw: 30,
    heatLoad: 30,
    tierRole: 'none',
    ports: [
      { kind: 'power', direction: 'in', capacity: 50 },
      { kind: 'network', direction: 'bi', capacity: 10 },
      { kind: 'water', direction: 'bi', capacity: 1 },
    ],
    rules: {
      minDistance: { blockType: 'cdu', cells: 1 },
    },
    standards: ['ASHRAE TC 9.9 H1'],
    decorative: false,
    defaultInventory: 8,
    order: 7,
    icon: '◆',
  },
];

// ----------------------------------------------------------------------------
// SAFETY
// ----------------------------------------------------------------------------

const safety: BlockDef[] = [
  {
    id: 'vesda',
    category: 'safety',
    displayName: 'VESDA',
    shortName: 'VESDA',
    description: 'Very Early Smoke Detection Apparatus. NFPA 75 required.',
    size: [1, 1, 1],
    color: '#fca5a5',
    tags: ['safety', 'detection', 'fire'],
    powerDraw: 0.05,
    heatLoad: 0,
    tierRole: 'N+1',
    ports: [
      { kind: 'power', direction: 'in', capacity: 1 },
      { kind: 'data', direction: 'out', capacity: 1 },
    ],
    standards: ['NFPA 75', 'EN 50600-2-5'],
    decorative: false,
    defaultInventory: 12,
    order: 0,
    icon: '◍',
  },
  {
    id: 'fire_panel',
    category: 'safety',
    displayName: 'Fire Panel',
    shortName: 'FACP',
    description: 'Fire Alarm Control Panel. Monitors VESDA, triggers suppression.',
    size: [1, 1, 1],
    color: '#ef4444',
    tags: ['safety', 'fire', 'monitoring'],
    powerDraw: 0.1,
    heatLoad: 0,
    tierRole: 'N+1',
    ports: [
      { kind: 'power', direction: 'in', capacity: 1 },
      { kind: 'data', direction: 'bi', capacity: 10 },
    ],
    standards: ['NFPA 75', 'NFPA 72'],
    decorative: false,
    defaultInventory: 4,
    order: 1,
    icon: '⊞',
  },
  {
    id: 'fm200_nozzle',
    category: 'safety',
    displayName: 'FM-200 Nozzle',
    shortName: 'FM200',
    description: 'Clean agent fire suppression nozzle. NFPA 2001.',
    size: [1, 1, 1],
    color: '#dc2626',
    tags: ['safety', 'fire', 'suppression'],
    powerDraw: 0,
    heatLoad: 0,
    tierRole: 'N+1',
    ports: [],
    standards: ['NFPA 2001'],
    decorative: false,
    defaultInventory: 20,
    order: 2,
    icon: '▦',
  },
  {
    id: 'epo_button',
    category: 'safety',
    displayName: 'EPO Button',
    shortName: 'EPO',
    description: 'Emergency Power Off. Cuts IT power in emergency.',
    size: [1, 1, 1],
    color: '#b91c1c',
    tags: ['safety', 'emergency', 'epo'],
    powerDraw: 0,
    heatLoad: 0,
    tierRole: 'none',
    ports: [{ kind: 'data', direction: 'out', capacity: 1 }],
    standards: ['NFPA 75'],
    decorative: false,
    defaultInventory: 6,
    order: 3,
    icon: '⏹',
  },
  {
    id: 'mfa_reader',
    category: 'safety',
    displayName: 'MFA Reader',
    shortName: 'MFA',
    description: 'Multi-factor authentication reader (card + PIN/biometric).',
    size: [1, 1, 1],
    color: '#f87171',
    tags: ['safety', 'security', 'preventive', 'access'],
    powerDraw: 0.05,
    heatLoad: 0,
    tierRole: 'none',
    ports: [
      { kind: 'power', direction: 'in', capacity: 1 },
      { kind: 'data', direction: 'out', capacity: 1 },
    ],
    standards: ['ISO 27001 A.7', 'NIST 800-63'],
    decorative: false,
    defaultInventory: 10,
    order: 4,
    icon: '◑',
  },
  {
    id: 'biometric_scanner',
    category: 'safety',
    displayName: 'Biometric Scanner',
    shortName: 'Bio',
    description: 'Fingerprint/retinal scanner. For data hall access.',
    size: [1, 1, 1],
    color: '#fca5a5',
    tags: ['safety', 'security', 'preventive', 'biometric'],
    powerDraw: 0.1,
    heatLoad: 0,
    tierRole: 'none',
    ports: [
      { kind: 'power', direction: 'in', capacity: 1 },
      { kind: 'data', direction: 'out', capacity: 1 },
    ],
    standards: ['ISO 27001 A.7', 'NIST 800-63'],
    decorative: false,
    defaultInventory: 6,
    order: 5,
    icon: '◉',
  },
  {
    id: 'smart_card_lock',
    category: 'safety',
    displayName: 'Smart Card Lock',
    shortName: 'Lock',
    description: 'Per-rack smart card lock.',
    size: [1, 1, 1],
    color: '#fda4af',
    tags: ['safety', 'security', 'preventive', 'rack'],
    powerDraw: 0.05,
    heatLoad: 0,
    tierRole: 'none',
    ports: [
      { kind: 'power', direction: 'in', capacity: 1 },
      { kind: 'data', direction: 'out', capacity: 1 },
    ],
    standards: ['ISO 27001 A.7', 'EN 50600-2-5'],
    decorative: false,
    defaultInventory: 30,
    order: 6,
    icon: '⊟',
  },
];

// ----------------------------------------------------------------------------
// NETWORK (security-aware)
// ----------------------------------------------------------------------------

const network: BlockDef[] = [
  {
    id: 'honeypot',
    category: 'network',
    displayName: 'Honeypot',
    shortName: 'Honey',
    description: 'Decoy system. Deterrent + detective.',
    size: [1, 1, 1],
    color: '#0e7490',
    tags: ['network', 'security', 'deterrent', 'detective'],
    powerDraw: 0.3,
    heatLoad: 0.3,
    tierRole: 'none',
    ports: [
      { kind: 'power', direction: 'in', capacity: 1 },
      { kind: 'network', direction: 'bi', capacity: 5 },
    ],
    standards: ['ISO 27001 A.8', 'NIST CSF'],
    decorative: false,
    defaultInventory: 4,
    order: 0,
    icon: '⌗',
  },
  {
    id: 'ids_ips',
    category: 'network',
    displayName: 'IDS/IPS',
    shortName: 'IDS',
    description: 'Intrusion Detection / Prevention System.',
    size: [1, 1, 1],
    color: '#06b6d4',
    tags: ['network', 'security', 'detective', 'corrective'],
    powerDraw: 0.5,
    heatLoad: 0.5,
    tierRole: 'N+1',
    ports: [
      { kind: 'power', direction: 'in', capacity: 1 },
      { kind: 'network', direction: 'bi', capacity: 10 },
    ],
    standards: ['ISO 27001 A.8', 'NIST CSF'],
    decorative: false,
    defaultInventory: 4,
    order: 1,
    icon: '⌖',
  },
  {
    id: 'waf_node',
    category: 'network',
    displayName: 'WAF',
    shortName: 'WAF',
    description: 'Web Application Firewall at the edge.',
    size: [1, 1, 1],
    color: '#0891b2',
    tags: ['network', 'security', 'preventive', 'deterrent'],
    powerDraw: 0.4,
    heatLoad: 0.4,
    tierRole: 'N+1',
    ports: [
      { kind: 'power', direction: 'in', capacity: 1 },
      { kind: 'network', direction: 'bi', capacity: 10 },
    ],
    standards: ['ISO 27001 A.8', 'NIST CSF'],
    decorative: false,
    defaultInventory: 4,
    order: 2,
    icon: '⎛',
  },
  {
    id: 'siem_collector',
    category: 'network',
    displayName: 'SIEM Collector',
    shortName: 'SIEM',
    description: 'Security Information & Event Management collector.',
    size: [1, 1, 1],
    color: '#155e75',
    tags: ['network', 'security', 'detective', 'administrative'],
    powerDraw: 0.4,
    heatLoad: 0.4,
    tierRole: 'N+1',
    ports: [
      { kind: 'power', direction: 'in', capacity: 1 },
      { kind: 'network', direction: 'bi', capacity: 10 },
    ],
    standards: ['ISO 27001 A.8', 'NIST CSF'],
    decorative: false,
    defaultInventory: 2,
    order: 3,
    icon: '◧',
  },
  {
    id: 'bastion_host',
    category: 'network',
    displayName: 'Bastion Host',
    shortName: 'Bastion',
    description: 'Jump host for admin access. Compensating + preventive.',
    size: [1, 1, 1],
    color: '#0e7490',
    tags: ['network', 'security', 'preventive', 'compensating'],
    powerDraw: 0.3,
    heatLoad: 0.3,
    tierRole: 'none',
    ports: [
      { kind: 'power', direction: 'in', capacity: 1 },
      { kind: 'network', direction: 'bi', capacity: 5 },
    ],
    standards: ['ISO 27001 A.8'],
    decorative: false,
    defaultInventory: 2,
    order: 4,
    icon: '▣',
  },
  {
    id: 'immutable_backup_vault',
    category: 'network',
    displayName: 'Immutable Backup Vault',
    shortName: 'Backup',
    description: 'Write-once backup target. Ransomware-resistant.',
    size: [1, 2, 1],
    color: '#164e63',
    tags: ['network', 'security', 'recovery', 'backup'],
    powerDraw: 1.5,
    heatLoad: 1.5,
    tierRole: 'N+1',
    ports: [
      { kind: 'power', direction: 'in', capacity: 3 },
      { kind: 'network', direction: 'bi', capacity: 10 },
    ],
    standards: ['ISO 27001 A.8', 'NIST CSF RC'],
    decorative: false,
    defaultInventory: 4,
    order: 5,
    icon: '⛁',
  },
];

// ----------------------------------------------------------------------------
// Registry
// ----------------------------------------------------------------------------

const ALL_BLOCKS: BlockDef[] = [
  ...structure,
  ...site,
  ...power,
  ...cooling,
  ...it,
  ...safety,
  ...network,
];

/** Frozen registry. Use the helpers below rather than reading directly. */
export const BLOCK_REGISTRY: ReadonlyArray<BlockDef> = Object.freeze(ALL_BLOCKS);

const BLOCK_MAP: ReadonlyMap<string, BlockDef> = new Map(
  ALL_BLOCKS.map((b) => [b.id, b] as const),
);

/** Look up a block by id. Returns undefined for unknown ids. */
export function getBlock(id: string): BlockDef | undefined {
  return BLOCK_MAP.get(id);
}

/** All blocks in a category. */
export function getBlocksByCategory(category: BlockCategory): BlockDef[] {
  return ALL_BLOCKS.filter((b) => b.category === category);
}

/** Test whether an id is a valid block type. */
export function isValidBlockType(id: string): id is BlockDef['id'] {
  return BLOCK_MAP.has(id);
}

/** All category ids in display order. */
export const CATEGORIES: BlockCategory[] = [
  'structure',
  'site',
  'power',
  'cooling',
  'it',
  'safety',
  'network',
];

export const CATEGORY_LABELS: Record<BlockCategory, string> = {
  structure: 'Structure',
  site: 'Site',
  power: 'Power',
  cooling: 'Cooling',
  it: 'IT',
  safety: 'Safety',
  network: 'Network',
};

// ----------------------------------------------------------------------------
// Placement helpers (pure functions over BuildState)
// ----------------------------------------------------------------------------

/** Minimum cell for a block at the given base cell, accounting for rotation. */
function sizeOf(def: BlockDef, rot: 0 | 1 | 2 | 3): [number, number, number] {
  const [w, h, d] = def.size;
  return rot % 2 === 0 ? [w, h, d] : [d, h, w];
}

/** Check whether the block's bounding box fits inside the world and does not collide. */
export function canPlace(
  state: BuildState,
  typeId: string,
  baseCell: { x: number; y: number; z: number },
  rot: 0 | 1 | 2 | 3 = 0,
  worldSize: { x: number; y: number; z: number } = { x: 32, y: 8, z: 32 },
): { ok: true } | { ok: false; reason: string } {
  const def = getBlockDef(typeId);
  if (!def) return { ok: false, reason: `Unknown block type ${typeId}` };
  const [w, h, d] = sizeOf(def, rot);
  for (let dx = 0; dx < w; dx++) {
    for (let dy = 0; dy < h; dy++) {
      for (let dz = 0; dz < d; dz++) {
        const c = { x: baseCell.x + dx, y: baseCell.y + dy, z: baseCell.z + dz };
        if (c.x < 0 || c.y < 0 || c.z < 0 || c.x >= worldSize.x || c.y >= worldSize.y || c.z >= worldSize.z) {
          return { ok: false, reason: 'Out of bounds' };
        }
        if (state.byCell[cellKey(c)]) {
          return { ok: false, reason: 'Cell already occupied' };
        }
      }
    }
  }
  return { ok: true };
}

/** Place a block. Mutates the state. Returns the new instance id, or null on failure. */
export function placeBlock(
  state: BuildState,
  opts: { typeId: string; cell: { x: number; y: number; z: number }; rotation?: 0 | 1 | 2 | 3 },
): string | null {
  const rot = opts.rotation ?? 0;
  const v = canPlace(state, opts.typeId, opts.cell, rot);
  if (!v.ok) return null;
  const id = nanoid(10);
  const inst: BlockInstance = {
    id,
    type: opts.typeId,
    position: opts.cell,
    rotation: rot,
    metadata: {},
  };
  state.voxels[id] = inst;
  const [w, h, d] = sizeOf(getBlockDef(opts.typeId)!, rot);
  for (let dx = 0; dx < w; dx++) {
    for (let dy = 0; dy < h; dy++) {
      for (let dz = 0; dz < d; dz++) {
        state.byCell[cellKey({ x: opts.cell.x + dx, y: opts.cell.y + dy, z: opts.cell.z + dz })] = id;
      }
    }
  }
  state.updatedAt = Date.now();
  return id;
}

/** Remove a block by id. Returns the removed instance, or null if not found. */
export function removeBlock(state: BuildState, id: string): BlockInstance | null {
  const inst = state.voxels[id];
  if (!inst) return null;
  delete state.voxels[id];
  const def = getBlockDef(inst.type);
  if (def) {
    const [w, h, d] = sizeOf(def, inst.rotation);
    for (let dx = 0; dx < w; dx++) {
      for (let dy = 0; dy < h; dy++) {
        for (let dz = 0; dz < d; dz++) {
          delete state.byCell[cellKey({ x: inst.position.x + dx, y: inst.position.y + dy, z: inst.position.z + dz })];
        }
      }
    }
  }
  state.updatedAt = Date.now();
  return inst;
}
