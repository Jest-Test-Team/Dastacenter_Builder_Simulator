'use client';

import { useMemo, useState } from 'react';
import {
  Cable,
  Activity,
  Building2,
  Eye,
  EyeOff,
  Layers3,
  Network,
  Plus,
  Route,
  ShieldCheck,
  Unplug,
  Workflow,
} from 'lucide-react';
import { nanoid } from 'nanoid';
import {
  findNetworkPath,
  findRedundantPath,
  makePort,
  validateTopology,
  type NetworkLayer,
  type NetworkNode,
} from '@/lib/network';
import { useBuildStore } from '@/lib/store/build-store';
import { cn } from '@/lib/utils';

type Tab = 'spaces' | 'topology' | 'overlays' | 'simulation' | 'controller';
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'spaces', label: 'Spaces' },
  { id: 'topology', label: 'Topology' },
  { id: 'overlays', label: 'Overlays' },
  { id: 'simulation', label: 'Paths' },
  { id: 'controller', label: 'SDN' },
];
const LAYERS: NetworkLayer[] = ['physical', 'vlan', 'vrf', 'vxlan', 'security'];

export function NetworkWorkspace({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('spaces');
  const network = useBuildStore((state) => state.network);
  const loadTemplate = useBuildStore((state) => state.loadNetworkTemplate);
  const issues = useMemo(() => validateTopology(network), [network]);

  return (
    <aside
      className="absolute inset-y-0 right-0 z-30 flex w-full max-w-xl flex-col border-l border-cyan-950 bg-[#050a12]/97 shadow-2xl backdrop-blur md:w-[34rem]"
      aria-label="Enterprise network workspace"
    >
      <header className="flex items-center gap-2 border-b border-border p-3">
        <Network className="h-5 w-5 text-primary" />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">Enterprise SDN</h2>
          <p className="text-xs text-fg-muted">
            {Object.keys(network.nodes).length} nodes · {Object.keys(network.links).length} links ·{' '}
            {issues.length} findings
          </p>
        </div>
        <button className="btn-ghost text-xs" onClick={loadTemplate}>
          Load reference fabric
        </button>
        <button className="icon-btn" onClick={onClose} aria-label="Close network workspace">
          ×
        </button>
      </header>
      <nav className="flex overflow-x-auto border-b border-border p-1" aria-label="Network tools">
        {TABS.map((item) => (
          <button
            key={item.id}
            className={cn(
              'rounded px-2 py-1.5 text-xs',
              tab === item.id ? 'bg-primary text-primary-fg' : 'text-fg-muted hover:bg-bg-subtle',
            )}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {tab === 'spaces' && <SpacesPanel />}
        {tab === 'topology' && <TopologyPanel />}
        {tab === 'overlays' && <OverlayPanel />}
        {tab === 'simulation' && <SimulationPanel />}
        {tab === 'controller' && <ControllerPanel />}
      </div>
    </aside>
  );
}

function SpacesPanel() {
  const spaces = useBuildStore((state) => state.network.spaces);
  const selectedFloorId = useBuildStore((state) => state.selectedSpatialFloorId);
  const selectFloor = useBuildStore((state) => state.setSelectedSpatialFloor);
  const toggle = useBuildStore((state) => state.toggleSpaceVisibility);
  const upsert = useBuildStore((state) => state.upsertSpace);
  const floors = useMemo(
    () =>
      Object.values(spaces)
        .filter((space) => space.kind === 'floor')
        .sort((a, b) => (b.floorLevel ?? b.bounds.y) - (a.floorLevel ?? a.bounds.y)),
    [spaces],
  );
  const selectedFloor = floors.find((floor) => floor.id === selectedFloorId) ?? floors[0];
  const selectedRooms = Object.values(spaces).filter(
    (space) =>
      space.parentId === selectedFloor?.id &&
      (space.kind === 'room' || space.kind === 'hall') &&
      space.id !== 'room-network' &&
      space.id !== 'hall-a',
  );

  const addLevel = (direction: 'up' | 'down') => {
    const existingLevels = floors.map((floor) => floor.floorLevel ?? 0);
    const level = direction === 'up' ? Math.max(...existingLevels) + 1 : Math.min(...existingLevels) - 1;
    const id = level < 0 ? `basement-${Math.abs(level)}` : `floor-${level}`;
    const name = level < 0 ? `Basement ${Math.abs(level)}` : level === 0 ? 'Main Floor' : `Floor ${level}`;
    upsert({
      id,
      parentId: 'building-a',
      kind: 'floor',
      name,
      floorLevel: level,
      bounds: { x: 1, y: level * 3, z: 1, width: 30, height: 3, depth: 30 },
      visible: true,
    });
    selectFloor(id);
  };

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-cyan-500/25 bg-cyan-950/20 p-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-cyan-400/10 p-2 text-cyan-300"><Building2 className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-cyan-50">Building A · X-ray view</h3>
              <span className="flex items-center gap-1 font-mono text-[10px] text-emerald-300">
                <Activity className="h-3 w-3" /> LIVE SIM
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-cyan-100/60">
              Transparent structural model with simulated facility telemetry. No sonar or surveillance feed is used.
            </p>
          </div>
        </div>
      </div>

      <div>
        <PanelTitle icon={<Layers3 className="h-4 w-4" />} title="Building levels" />
        <div className="grid grid-cols-3 gap-1.5">
          {floors.map((floor) => {
            const active = floor.id === selectedFloor?.id;
            return (
              <button
                key={floor.id}
                onClick={() => selectFloor(floor.id)}
                className={cn(
                  'rounded-lg border px-2 py-2 text-left transition',
                  active
                    ? 'border-cyan-300 bg-cyan-400/15 text-cyan-50 shadow-[0_0_18px_rgba(34,211,238,0.12)]'
                    : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:border-cyan-700 hover:text-cyan-100',
                )}
                aria-pressed={active}
              >
                <span className="block truncate text-xs font-semibold">{floor.name}</span>
                <span className="mt-0.5 block font-mono text-[9px] opacity-60">
                  LEVEL {(floor.floorLevel ?? 0) >= 0 ? '+' : ''}{floor.floorLevel ?? 0}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button className="btn-ghost justify-center text-xs" onClick={() => addLevel('up')}>
            <Plus className="h-3.5 w-3.5" /> Add floor
          </button>
          <button className="btn-ghost justify-center text-xs" onClick={() => addLevel('down')}>
            <Plus className="h-3.5 w-3.5" /> Add basement
          </button>
        </div>
      </div>

      {selectedFloor && (
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-cyan-50">{selectedFloor.name} layout</h3>
            <button
              className="icon-btn"
              onClick={() => toggle(selectedFloor.id)}
              aria-label={`${selectedFloor.visible ? 'Hide' : 'Show'} ${selectedFloor.name}`}
            >
              {selectedFloor.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            </button>
          </div>
          <div className="space-y-1.5">
            {selectedRooms.map((space) => (
          <div
            key={space.id}
                className="flex items-center gap-2 rounded-lg border border-cyan-950 bg-slate-950/60 px-2.5 py-2"
          >
                <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                <span className="min-w-0 flex-1 truncate text-xs">{space.name}</span>
            <span className="font-mono text-[10px] text-fg-muted">
              {space.bounds.width}×{space.bounds.depth}m
            </span>
            <button
              className="icon-btn"
              onClick={() => toggle(space.id)}
              aria-label={`${space.visible ? 'Hide' : 'Show'} ${space.name}`}
            >
              {space.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            </button>
          </div>
            ))}
          </div>
        </div>
      )}
      <button
        className="btn-ghost w-full justify-center text-xs"
        onClick={() => {
          const id = `rack-${nanoid(5)}`;
          upsert({
            id,
            parentId: selectedRooms.find((space) => space.kind === 'hall')?.id ?? selectedFloor?.id ?? null,
            kind: 'rack',
            name: `Rack ${Object.values(spaces).filter((s) => s.kind === 'rack').length + 1}`,
            floorLevel: selectedFloor?.floorLevel,
            bounds: { x: 15, y: selectedFloor?.bounds.y ?? 0, z: 18, width: 1, height: 2.4, depth: 1 },
            visible: true,
          });
        }}
      >
        <Plus className="h-4 w-4" /> Add rack
      </button>
    </section>
  );
}

function TopologyPanel() {
  const network = useBuildStore((state) => state.network);
  const selected = useBuildStore((state) => state.selectedNetworkNodeId);
  const select = useBuildStore((state) => state.setSelectedNetworkNode);
  const upsertNode = useBuildStore((state) => state.upsertNetworkNode);
  const upsertLink = useBuildStore((state) => state.upsertNetworkLink);
  const toggleLink = useBuildStore((state) => state.toggleNetworkLink);
  const nodes = Object.values(network.nodes);
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const addEndpoint = () => {
    const id = `endpoint-${nanoid(5)}`;
    const index = nodes.length;
    upsertNode({
      id,
      name: `Endpoint ${index + 1}`,
      kind: 'endpoint',
      spaceId:
        Object.values(network.spaces).find(
          (space) => space.kind === 'hall' && space.floorLevel === 0,
        )?.id ?? Object.values(network.spaces).find((space) => space.kind === 'hall')?.id ?? '',
      position: { x: 16 + (index % 12), y: 1, z: 18 + (index % 8) },
      ports: [makePort(id, 0, 25), makePort(id, 1, 25)],
    });
  };
  const connect = () => {
    const source = network.nodes[sourceId];
    const target = network.nodes[targetId];
    if (!source || !target || source.id === target.id) return;
    const id = `link-${nanoid(6)}`;
    upsertLink({
      id,
      sourceNodeId: source.id,
      sourcePortId: source.ports[0]!.id,
      targetNodeId: target.id,
      targetPortId: target.ports[0]!.id,
      medium: 'fiber',
      bandwidthGbps: Math.min(source.ports[0]!.speedGbps, target.ports[0]!.speedGbps),
      vlanIds: [10],
      vrf: 'enterprise',
      enabled: true,
    });
  };
  return (
    <section>
      <PanelTitle icon={<Cable className="h-4 w-4" />} title="Synchronized physical topology" />
      {nodes.length === 0 ? (
        <EmptyState message="Load the reference fabric or add an endpoint to begin." />
      ) : (
        <svg
          viewBox="0 0 520 300"
          className="w-full rounded border border-border bg-[#07101f]"
          role="img"
          aria-label="Network topology diagram"
        >
          {Object.values(network.links).map((link) => {
            const a = network.nodes[link.sourceNodeId];
            const b = network.nodes[link.targetNodeId];
            if (!a || !b) return null;
            return (
              <line
                key={link.id}
                x1={toX(a)}
                y1={toY(a)}
                x2={toX(b)}
                y2={toY(b)}
                stroke={link.enabled ? '#38bdf8' : '#ef4444'}
                strokeWidth="3"
                strokeDasharray={link.enabled ? undefined : '6 4'}
                onClick={() => toggleLink(link.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') toggleLink(link.id);
                }}
                role="button"
                tabIndex={0}
                aria-label={`${link.enabled ? 'Fail' : 'Restore'} link ${a.name} to ${b.name}`}
                className="cursor-pointer"
              />
            );
          })}
          {nodes.map((node) => (
            <g
              key={node.id}
              onClick={() => select(node.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') select(node.id);
              }}
              role="button"
              tabIndex={0}
              aria-label={`Select ${node.name}`}
              className="cursor-pointer"
            >
              <circle
                cx={toX(node)}
                cy={toY(node)}
                r={selected === node.id ? 15 : 11}
                fill={selected === node.id ? '#fbbf24' : '#0e7490'}
                stroke="#cffafe"
              />
              <text
                x={toX(node)}
                y={toY(node) + 25}
                fill="#e2e8f0"
                fontSize="10"
                textAnchor="middle"
              >
                {node.name}
              </text>
            </g>
          ))}
        </svg>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button className="btn-ghost text-xs" onClick={addEndpoint}>
          <Plus className="h-4 w-4" /> Add endpoint
        </button>
        <span className="text-xs text-fg-muted">Click a link to simulate failure</span>
        <Select value={sourceId} onChange={setSourceId} nodes={nodes} label="Source" />
        <Select value={targetId} onChange={setTargetId} nodes={nodes} label="Target" />
        <button
          className="btn col-span-2 text-xs"
          onClick={connect}
          disabled={!sourceId || !targetId || sourceId === targetId}
        >
          Connect selected ports
        </button>
      </div>
      {selected && network.nodes[selected] && <NodeInspector node={network.nodes[selected]!} />}
    </section>
  );
}

function OverlayPanel() {
  const layer = useBuildStore((state) => state.networkLayer);
  const setLayer = useBuildStore((state) => state.setNetworkLayer);
  const network = useBuildStore((state) => state.network);
  const upsertPolicy = useBuildStore((state) => state.upsertNetworkPolicy);
  return (
    <section>
      <PanelTitle icon={<ShieldCheck className="h-4 w-4" />} title="Logical overlays and policy" />
      <div className="grid grid-cols-5 gap-1">
        {LAYERS.map((item) => (
          <button
            key={item}
            className={cn(
              'rounded border px-1 py-2 text-[10px] uppercase',
              layer === item ? 'border-primary bg-primary/20 text-primary' : 'border-border',
            )}
            onClick={() => setLayer(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <Stat
          label="VLANs"
          value={
            [...new Set(Object.values(network.links).flatMap((link) => link.vlanIds))].join(', ') ||
            '—'
          }
        />
        <Stat
          label="VRFs"
          value={
            [
              ...new Set(
                Object.values(network.links)
                  .map((link) => link.vrf)
                  .filter(Boolean),
              ),
            ].join(', ') || '—'
          }
        />
        <Stat
          label="VXLAN VNIs"
          value={
            [
              ...new Set(
                Object.values(network.links)
                  .map((link) => link.vxlanVni)
                  .filter(Boolean),
              ),
            ].join(', ') || '—'
          }
        />
        <Stat
          label="Security zones"
          value={
            [
              ...new Set(
                Object.values(network.links)
                  .map((link) => link.securityZone)
                  .filter(Boolean),
              ),
            ].join(', ') || '—'
          }
        />
      </dl>
      <h3 className="mt-4 text-sm font-semibold">Policies</h3>
      {Object.values(network.policies).map((policy) => (
        <div key={policy.id} className="mt-2 rounded border border-border p-2 text-xs">
          <strong>{policy.name}</strong>
          <div className="text-fg-muted">
            {policy.sourceZone} → {policy.destinationZone} · {policy.action.toUpperCase()}{' '}
            {policy.protocol}
            {policy.destinationPort ? `/${policy.destinationPort}` : ''}
          </div>
        </div>
      ))}
      <button
        className="btn-ghost mt-2 text-xs"
        onClick={() => {
          const id = `policy-${nanoid(5)}`;
          upsertPolicy({
            id,
            name: 'Default segmentation rule',
            sourceZone: 'user',
            destinationZone: 'application',
            action: 'allow',
            protocol: 'tcp',
            destinationPort: 443,
            priority: 200,
            enabled: true,
          });
        }}
      >
        <Plus className="h-4 w-4" /> Add segmentation policy
      </button>
    </section>
  );
}

function SimulationPanel() {
  const network = useBuildStore((state) => state.network);
  const setHighlighted = useBuildStore((state) => state.setHighlightedLinks);
  const toggleLink = useBuildStore((state) => state.toggleNetworkLink);
  const nodes = Object.values(network.nodes);
  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');
  const path = source && target ? findNetworkPath(network, source, target) : null;
  const backup = path ? findRedundantPath(network, path) : null;
  return (
    <section>
      <PanelTitle
        icon={<Route className="h-4 w-4" />}
        title="Path tracing and failure simulation"
      />
      <div className="grid grid-cols-2 gap-2">
        <Select value={source} onChange={setSource} nodes={nodes} label="Source" />
        <Select value={target} onChange={setTarget} nodes={nodes} label="Destination" />
      </div>
      <button
        className="btn mt-2 w-full text-xs"
        disabled={!path}
        onClick={() => setHighlighted(path?.linkIds ?? [])}
      >
        Highlight end-to-end path
      </button>
      {source && target && (
        <div className="mt-3 rounded border border-border bg-bg-subtle p-3 text-xs">
          {path ? (
            <>
              <div>
                <strong>Primary:</strong>{' '}
                {path.nodeIds.map((id) => network.nodes[id]?.name).join(' → ')}
              </div>
              <div className="mt-1 text-fg-muted">
                Bottleneck: {path.bottleneckGbps} Gbps ·{' '}
                {backup ? 'link-disjoint backup available' : 'no disjoint backup'}
              </div>
              {path.linkIds.map((id) => (
                <button
                  key={id}
                  className="btn-ghost mr-1 mt-2 text-[10px]"
                  onClick={() => toggleLink(id)}
                >
                  <Unplug className="h-3 w-3" /> Fail {id}
                </button>
              ))}
            </>
          ) : (
            <span className="text-danger">No active path exists.</span>
          )}
        </div>
      )}
    </section>
  );
}

function ControllerPanel() {
  const network = useBuildStore((state) => state.network);
  const validate = useBuildStore((state) => state.validateControllerIntent);
  const issues = useMemo(() => validateTopology(network), [network]);
  return (
    <section>
      <PanelTitle icon={<Workflow className="h-4 w-4" />} title="Controller intent workflow" />
      {Object.values(network.intents).length === 0 ? (
        <EmptyState message="Load the reference fabric to create a resilient SDN intent." />
      ) : (
        Object.values(network.intents).map((intent) => (
          <article
            key={intent.id}
            className="mb-3 rounded border border-border bg-bg-subtle p-3 text-xs"
          >
            <div className="flex items-center justify-between">
              <strong>{intent.name}</strong>
              <span className="badge">{intent.status}</span>
            </div>
            <p className="mt-1 text-fg-muted">
              {network.nodes[intent.sourceNodeId]?.name} →{' '}
              {network.nodes[intent.destinationNodeId]?.name} · {intent.requiredBandwidthGbps} Gbps
              · redundancy {intent.requireRedundancy ? 'required' : 'optional'}
            </p>
            {intent.lastMessage && <p className="mt-2">{intent.lastMessage}</p>}
            <div className="mt-2 flex gap-2">
              <button className="btn-ghost text-xs" onClick={() => validate(intent.id)}>
                Validate
              </button>
              <button className="btn text-xs" onClick={() => validate(intent.id, true)}>
                Deploy intent
              </button>
            </div>
          </article>
        ))
      )}
      <h3 className="mt-4 text-sm font-semibold">Topology validation</h3>
      {issues.length === 0 ? (
        <p className="mt-2 text-xs text-success">No topology issues.</p>
      ) : (
        issues.map((issue, index) => (
          <p
            key={`${issue.entityId}-${index}`}
            className={cn(
              'mt-1 text-xs',
              issue.severity === 'error' ? 'text-danger' : 'text-warning',
            )}
          >
            {issue.message}
          </p>
        ))
      )}
    </section>
  );
}

function PanelTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
      {icon}
      {title}
    </h3>
  );
}
function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded border border-dashed border-border p-5 text-center text-xs text-fg-muted">
      {message}
    </div>
  );
}
function Select({
  value,
  onChange,
  nodes,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  nodes: NetworkNode[];
  label: string;
}) {
  return (
    <label className="text-xs text-fg-muted">
      {label}
      <select
        className="mt-1 w-full rounded border border-border bg-bg px-2 py-1.5 text-fg"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Select node</option>
        {nodes.map((node) => (
          <option key={node.id} value={node.id}>
            {node.name}
          </option>
        ))}
      </select>
    </label>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border p-2">
      <dt className="text-fg-muted">{label}</dt>
      <dd className="mt-1 font-mono">{value}</dd>
    </div>
  );
}
function NodeInspector({ node }: { node: NetworkNode }) {
  return (
    <div className="mt-3 rounded border border-primary/30 bg-primary/5 p-3 text-xs">
      <strong>{node.name}</strong>
      <div className="mt-1 text-fg-muted">
        {node.kind} · {node.spaceId} · x{node.position.x} y{node.position.y} z{node.position.z}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1">
        {node.ports.map((port) => (
          <span key={port.id} className="rounded bg-bg px-2 py-1 font-mono">
            {port.name} {port.speedGbps}G {port.adminUp ? 'up' : 'down'}
          </span>
        ))}
      </div>
    </div>
  );
}
function toX(node: NetworkNode) {
  return 28 + (node.position.x / 32) * 464;
}
function toY(node: NetworkNode) {
  return 24 + (node.position.z / 32) * 250;
}
