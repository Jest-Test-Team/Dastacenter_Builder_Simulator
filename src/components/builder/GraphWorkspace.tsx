'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { GitBranch, Layers, Search, ShieldAlert, Sparkles, Zap } from 'lucide-react';
import {
  COMPETENCY_QUESTIONS,
  ENTITY_TYPES,
  ENTITY_TYPE_NAMES,
  EVENT_TYPES,
  EVENT_TYPE_NAMES,
  RELATION_TYPES,
  RELATION_TYPE_NAMES,
  buildKnowledgeGraph,
  describeNode,
  explainImpact,
  explainScore,
  findPath,
  kHop,
  search,
  serializeSubgraph,
  type GraphBuildResult,
  type NodeType,
} from '@/lib/kg';
import { useBuildStore } from '@/lib/store/build-store';
import { cn } from '@/lib/utils';

type Tab = 'ontology' | 'explore' | 'query' | 'quality';
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'ontology', label: 'Ontology' },
  { id: 'explore', label: 'Explore' },
  { id: 'query', label: 'Query' },
  { id: 'quality', label: 'Quality' },
];

/**
 * Derives the graph from the store on demand.
 *
 * The graph is never stored. It is a projection of BuildState, and keeping a
 * second copy in the store would let the two drift — the failure the
 * consistency test exists to prevent.
 */
function useKnowledgeGraph(): GraphBuildResult {
  const voxels = useBuildStore((state) => state.voxels);
  const policies = useBuildStore((state) => state.policies);
  const network = useBuildStore((state) => state.network);
  const buildId = useBuildStore((state) => state.buildId);
  const name = useBuildStore((state) => state.name);
  const scenarioId = useBuildStore((state) => state.scenarioId);

  return useMemo(
    () =>
      buildKnowledgeGraph({
        buildId,
        name,
        scenarioId,
        voxels,
        byCell: {},
        inventory: {},
        createdAt: 0,
        updatedAt: 0,
        policies,
        network,
      }),
    [buildId, name, scenarioId, voxels, policies, network],
  );
}

export function GraphWorkspace({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('ontology');
  const result = useKnowledgeGraph();
  const nodeCount = Object.keys(result.graph.nodes).length;
  const edgeCount = Object.keys(result.graph.edges).length;

  return (
    <>
      <button
        className="absolute inset-0 z-20 cursor-default bg-slate-950/45"
        onClick={onClose}
        aria-label="Close knowledge graph workspace backdrop"
      />
      <aside
        className="absolute inset-y-0 right-0 z-30 flex w-full flex-col border-l border-cyan-900/60 bg-[#07101d]/98 shadow-2xl backdrop-blur-xl sm:w-[min(42rem,calc(100%-2rem))]"
        aria-label="Knowledge graph workspace"
      >
        <header className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <GitBranch className="h-5 w-5 text-primary" />
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">Knowledge Graph</h2>
            <p className="text-xs text-fg-muted" data-testid="graph-summary">
              {nodeCount} nodes · {edgeCount} edges · {result.fusion.merges.length} merged ·{' '}
              {result.quality.rejections.length} rejected
            </p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close knowledge graph workspace">
            <span aria-hidden>×</span>
          </button>
        </header>
        <nav className="grid grid-cols-4 gap-1 border-b border-border p-2" aria-label="Graph tools">
          {TABS.map((item) => (
            <button
              key={item.id}
              className={cn(
                'min-w-0 rounded px-1 py-2 text-xs font-medium',
                tab === item.id ? 'bg-primary text-primary-fg' : 'text-fg-muted hover:bg-bg-subtle',
              )}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {tab === 'ontology' && <OntologyPanel />}
          {tab === 'explore' && <ExplorePanel result={result} />}
          {tab === 'query' && <QueryPanel result={result} />}
          {tab === 'quality' && <QualityPanel result={result} />}
        </div>
      </aside>
    </>
  );
}

function OntologyPanel() {
  return (
    <div className="space-y-5 text-sm">
      <section>
        <h3 className="flex items-center gap-2 font-semibold">
          <Layers className="h-4 w-4" /> Entity types ({ENTITY_TYPE_NAMES.length})
        </h3>
        <p className="mt-1 text-xs text-fg-muted">
          Defined before anything was extracted. Nothing downstream may invent a type.
        </p>
        <dl className="mt-2 space-y-2">
          {ENTITY_TYPE_NAMES.map((name) => (
            <div key={name} className="rounded border border-border p-2">
              <dt className="font-medium text-primary">{name}</dt>
              <dd className="text-xs text-fg-muted">{ENTITY_TYPES[name].desc}</dd>
              <dd className="mt-1 text-xs text-fg-muted">
                <span className="opacity-70">Identity:</span> {ENTITY_TYPES[name].identity}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h3 className="font-semibold">Event types ({EVENT_TYPE_NAMES.length})</h3>
        <p className="mt-1 text-xs text-fg-muted">
          Things that happened, kept as nodes rather than flattened into attributes.
        </p>
        <ul className="mt-2 space-y-1 text-xs">
          {EVENT_TYPE_NAMES.map((name) => (
            <li key={name} className="rounded border border-border p-2">
              <span className="font-medium text-primary">{name}</span> — {EVENT_TYPES[name].desc}
              <div className="text-fg-muted">args: {EVENT_TYPES[name].args.join(', ')}</div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="font-semibold">Relation types ({RELATION_TYPE_NAMES.length})</h3>
        <p className="mt-1 text-xs text-fg-muted">
          Every relation declares a domain and a range; an edge that violates them is rejected.
        </p>
        <table className="mt-2 w-full text-xs">
          <thead className="text-fg-muted">
            <tr>
              <th className="p-1 text-left">Relation</th>
              <th className="p-1 text-left">Domain → Range</th>
              <th className="p-1 text-left">Card.</th>
            </tr>
          </thead>
          <tbody>
            {RELATION_TYPE_NAMES.map((name) => (
              <tr key={name} className="border-t border-border">
                <td className="p-1 font-medium text-primary">{name}</td>
                <td className="p-1 text-fg-muted">
                  {RELATION_TYPES[name].domain} → {RELATION_TYPES[name].range}
                </td>
                <td className="p-1 text-fg-muted">{RELATION_TYPES[name].cardinality}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h3 className="font-semibold">Competency questions ({COMPETENCY_QUESTIONS.length})</h3>
        <p className="mt-1 text-xs text-fg-muted">
          The schema&apos;s specification and its test suite. Each one is a traversal.
        </p>
        <ol className="mt-2 space-y-1 text-xs">
          {COMPETENCY_QUESTIONS.map((question) => (
            <li key={question.id} className="rounded border border-border p-2">
              <span className="font-medium">{question.id}</span> — {question.question}
              <div className="mt-0.5 font-mono text-[11px] text-fg-muted">{question.traversal}</div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function ExplorePanel({ result }: { result: GraphBuildResult }) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<NodeType | ''>('');
  const [selected, setSelected] = useState<string | null>(null);
  const [hops, setHops] = useState(1);
  const deferred = useDeferredValue(query);

  const matches = useMemo(
    () => search(result.graph, deferred, type || undefined).slice(0, 40),
    [result.graph, deferred, type],
  );
  const active = selected && result.graph.nodes[selected] ? selected : (matches[0]?.id ?? null);
  const subgraph = useMemo(
    () => (active ? kHop(result.graph, active, hops) : { nodes: [], edges: [] }),
    [result.graph, active, hops],
  );

  return (
    <div className="space-y-3 text-sm">
      <label className="flex items-center gap-2 rounded border border-border px-2">
        <Search className="h-4 w-4 text-fg-muted" />
        <input
          className="w-full bg-transparent py-2 text-sm outline-none"
          placeholder="Search nodes by name or id"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search graph nodes"
        />
      </label>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <select
          className="rounded border border-border bg-transparent px-2 py-1"
          value={type}
          onChange={(event) => setType(event.target.value as NodeType | '')}
          aria-label="Filter by node type"
        >
          <option value="">All types</option>
          {[...ENTITY_TYPE_NAMES, ...EVENT_TYPE_NAMES].map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1">
          Hops
          <select
            className="rounded border border-border bg-transparent px-2 py-1"
            value={hops}
            onChange={(event) => setHops(Number(event.target.value))}
            aria-label="Neighbourhood radius"
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
          </select>
        </label>
        <span className="text-fg-muted">{matches.length} match(es)</span>
      </div>

      <ul className="max-h-48 space-y-1 overflow-y-auto" aria-label="Matching nodes">
        {matches.map((node) => (
          <li key={node.id}>
            <button
              className={cn(
                'w-full rounded px-2 py-1 text-left text-xs',
                active === node.id ? 'bg-primary text-primary-fg' : 'hover:bg-bg-subtle',
              )}
              onClick={() => setSelected(node.id)}
            >
              <span className="opacity-70">{node.type}</span> {node.name}
            </button>
          </li>
        ))}
        {matches.length === 0 && <li className="px-2 py-1 text-xs text-fg-muted">No nodes match.</li>}
      </ul>

      {active && (
        <section className="space-y-2">
          <p className="rounded border border-border p-2 text-xs" data-testid="graph-node-description">
            {describeNode(result.graph, active)}
          </p>
          <h4 className="text-xs font-semibold text-fg-muted">Subgraph as triples</h4>
          <pre
            className="max-h-64 overflow-auto rounded border border-border bg-black/30 p-2 text-[11px] leading-relaxed"
            data-testid="graph-triples"
          >
            {serializeSubgraph(result.graph, subgraph, { maxLines: 120 }) || 'No relationships.'}
          </pre>
        </section>
      )}
    </div>
  );
}

function QueryPanel({ result }: { result: GraphBuildResult }) {
  const { graph } = result;
  const assets = useMemo(
    () => Object.values(graph.nodes).filter((node) => node.type === 'Asset' || node.type === 'NetworkDevice'),
    [graph],
  );
  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');

  const impactTarget = source || assets[0]?.id || '';
  const path = source && target ? findPath(graph, source, target) : null;

  return (
    <div className="space-y-4 text-sm">
      <section className="space-y-2">
        <h3 className="flex items-center gap-2 font-semibold">
          <Sparkles className="h-4 w-4" /> Why is my score what it is?
        </h3>
        <pre
          className="whitespace-pre-wrap rounded border border-border bg-black/30 p-2 text-[11px] leading-relaxed"
          data-testid="graph-score-explanation"
        >
          {explainScore(graph)}
        </pre>
      </section>

      <section className="space-y-2">
        <h3 className="flex items-center gap-2 font-semibold">
          <Zap className="h-4 w-4" /> What breaks if this fails?
        </h3>
        <select
          className="w-full rounded border border-border bg-transparent px-2 py-1 text-xs"
          value={impactTarget}
          onChange={(event) => setSource(event.target.value)}
          aria-label="Failure source"
        >
          {assets.map((node) => (
            <option key={node.id} value={node.id}>
              {node.type}: {node.name}
            </option>
          ))}
        </select>
        <p className="rounded border border-border p-2 text-xs" data-testid="graph-impact">
          {impactTarget ? explainImpact(graph, impactTarget) : 'Place some blocks to run this query.'}
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold">How are these two connected?</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <select
            className="rounded border border-border bg-transparent px-2 py-1"
            value={source}
            onChange={(event) => setSource(event.target.value)}
            aria-label="Path source"
          >
            <option value="">From…</option>
            {assets.map((node) => (
              <option key={node.id} value={node.id}>
                {node.name}
              </option>
            ))}
          </select>
          <select
            className="rounded border border-border bg-transparent px-2 py-1"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            aria-label="Path target"
          >
            <option value="">To…</option>
            {assets.map((node) => (
              <option key={node.id} value={node.id}>
                {node.name}
              </option>
            ))}
          </select>
        </div>
        <p className="rounded border border-border p-2 text-xs" data-testid="graph-path">
          {!source || !target
            ? 'Choose two nodes.'
            : path
              ? path.nodeIds.map((id) => graph.nodes[id]?.name ?? id).join(' → ')
              : 'These two are not connected in this graph.'}
        </p>
      </section>
    </div>
  );
}

function QualityPanel({ result }: { result: GraphBuildResult }) {
  const { quality, fusion, graph } = result;
  return (
    <div className="space-y-4 text-sm">
      <section>
        <h3 className="flex items-center gap-2 font-semibold">
          <ShieldAlert className="h-4 w-4" /> Quality gate
        </h3>
        <p className="mt-1 text-xs text-fg-muted" data-testid="graph-quality-precision">
          Precision {(quality.precision * 100).toFixed(1)}% —{' '}
          {quality.passed ? 'passed' : 'below the 90% floor'}. {quality.rejections.length} rejected,{' '}
          {quality.orphanNodeIds.length} unconnected, {quality.materializedEdges} mirrored.
        </p>
        {quality.rejections.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs">
            {quality.rejections.slice(0, 20).map((rejection) => (
              <li key={rejection.id} className="rounded border border-danger/40 p-2">
                <span className="font-mono">{rejection.id}</span> — {rejection.reason}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="font-semibold">Fusion</h3>
        <p className="mt-1 text-xs text-fg-muted">
          {fusion.comparisons} pairs compared after blocking · {fusion.merges.length} merged ·{' '}
          {fusion.reviewQueue.length} awaiting review
        </p>
        {fusion.merges.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs" aria-label="Merged nodes">
            {fusion.merges.map((record) => (
              <li key={record.mergedId} className="rounded border border-border p-2">
                <span className="font-mono">{record.mergedId}</span> →{' '}
                <span className="font-mono">{record.survivorId}</span>
                <div className="text-fg-muted">
                  score {record.score.total.toFixed(2)} (string {record.score.string.toFixed(2)}, attr{' '}
                  {record.score.attribute.toFixed(2)}, structure {record.score.structure.toFixed(2)})
                </div>
              </li>
            ))}
          </ul>
        )}
        {fusion.reviewQueue.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs" aria-label="Review queue">
            {fusion.reviewQueue.slice(0, 20).map((candidate) => (
              <li key={`${candidate.aId}:${candidate.bId}`} className="rounded border border-warn/40 p-2">
                <span className="font-mono">{candidate.aId}</span> ↔{' '}
                <span className="font-mono">{candidate.bId}</span>
                <div className="text-fg-muted">
                  {candidate.reason} — {candidate.score.total.toFixed(2)}, too close to call
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {graph.candidateRelations.length > 0 && (
        <section>
          <h3 className="font-semibold">Candidate relations</h3>
          <p className="mt-1 text-xs text-fg-muted">
            Seen in the data but not modelled. Reviewed and promoted deliberately, never forced into an
            approximately-correct existing type.
          </p>
          <ul className="mt-2 space-y-1 text-xs">
            {graph.candidateRelations.map((candidate) => (
              <li key={candidate.label} className="rounded border border-border p-2">
                <span className="font-medium">{candidate.label}</span>: {candidate.sourceType} →{' '}
                {candidate.targetType} ({candidate.occurrences}×)
                <div className="text-fg-muted">e.g. {candidate.example}</div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="font-semibold">Node census</h3>
        <ul className="mt-2 grid grid-cols-2 gap-1 text-xs">
          {Object.entries(quality.nodesByType)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([type, count]) => (
              <li key={type} className="flex justify-between rounded border border-border px-2 py-1">
                <span>{type}</span>
                <span className="text-fg-muted">{count}</span>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}
