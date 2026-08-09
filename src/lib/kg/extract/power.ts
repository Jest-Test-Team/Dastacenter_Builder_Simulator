/**
 * Power and cooling extractor (stage 5) — the relation plane the simulator has
 * never modelled explicitly.
 *
 * These edges are *derived*, not read: the BuildState stores where things sit,
 * not what feeds what. The derivation is deterministic and its justification is
 * recorded in each edge's `provenance.derivedFrom`, so a reviewer can always see
 * why an edge exists. Derived edges carry `medium` confidence — the quality gate
 * and the UI both distinguish them from facts read straight out of the source.
 *
 * Rejection rule, taken from relation extraction: proximity alone is
 * co-occurrence, not an assertion. An edge is emitted only when the two assets'
 * declared ports make the relation physically possible — an `out` power port
 * feeding an `in` power port, or a heat-removing unit near a heat-producing one.
 */

import type { BlockInstance, BuildState } from '@/lib/blocks';
import { getBlock } from '@/lib/blocks';
import { chebyshev } from '@/lib/grid';
import { emptyExtraction, type ExtractionResult } from '../types';
import { makeEdge, nodeId, provenance, type ExtractContext } from './common';

const EXTRACTOR = 'power';

/**
 * The distribution chain, upstream to downstream. Each asset is fed by the
 * nearest asset one tier above it, which is how real single-line diagrams read.
 * Anything not named here that draws power is a terminal consumer.
 */
export const POWER_TIERS: readonly (readonly string[])[] = [
  ['utility_feed'],
  ['transformer'],
  ['switchgear'],
  ['generator', 'ups'],
  ['pdu', 'busway'],
];

/** Cooling reaches this far in cells. Beyond it, an air path is not credible. */
export const COOLING_RADIUS_CELLS = 6;

/** Power tier index of a block type, or -1 when it is not part of the chain. */
export function powerTierOf(typeId: string): number {
  return POWER_TIERS.findIndex((tier) => tier.includes(typeId));
}

function hasPort(typeId: string, kind: 'power' | 'water', direction: 'in' | 'out'): boolean {
  const def = getBlock(typeId);
  if (!def) return false;
  return def.ports.some(
    (port) => port.kind === kind && (port.direction === direction || port.direction === 'bi'),
  );
}

/** Nearest candidate by Chebyshev distance; ties break on id so runs are reproducible. */
function nearest(target: BlockInstance, candidates: BlockInstance[]): BlockInstance | null {
  let best: BlockInstance | null = null;
  let bestDistance = Infinity;
  for (const candidate of candidates) {
    const distance = chebyshev(target.position, candidate.position);
    if (distance < bestDistance || (distance === bestDistance && best && candidate.id < best.id)) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}

export function extractPower(state: BuildState, ctx: ExtractContext): ExtractionResult {
  const result = emptyExtraction();
  const instances = Object.values(state.voxels).sort((a, b) => a.id.localeCompare(b.id));
  if (instances.length === 0) return result;

  const byTier = POWER_TIERS.map((tier) => instances.filter((item) => tier.includes(item.type)));

  const feed = (downstream: BlockInstance, upstreamTier: number) => {
    for (let tier = upstreamTier; tier >= 0; tier--) {
      const supplier = nearest(downstream, byTier[tier] ?? []);
      if (!supplier) continue; // Tier absent from this build; reach further upstream.
      result.edges.push(
        makeEdge(
          'POWERS',
          nodeId('Asset', supplier.id),
          nodeId('Asset', downstream.id),
          provenance(
            EXTRACTOR,
            `voxels/${downstream.id}`,
            ctx,
            'medium',
            `nearest upstream ${supplier.type} at distance ${chebyshev(downstream.position, supplier.position)}`,
          ),
          { distance: chebyshev(downstream.position, supplier.position) },
        ),
      );
      return;
    }
  };

  for (const instance of instances) {
    const tier = powerTierOf(instance.type);
    if (tier > 0) {
      feed(instance, tier - 1);
      continue;
    }
    if (tier === 0) continue; // Utility feed is the source; nothing powers it.
    // Terminal consumer: anything with an inbound power port that draws load.
    const def = getBlock(instance.type);
    if (!def || def.powerDraw <= 0) continue;
    if (!hasPort(instance.type, 'power', 'in')) continue;
    feed(instance, POWER_TIERS.length - 1);
  }

  return result;
}

export function extractCooling(state: BuildState, ctx: ExtractContext): ExtractionResult {
  const result = emptyExtraction();
  const instances = Object.values(state.voxels).sort((a, b) => a.id.localeCompare(b.id));

  // A cooler is defined by removing heat, which the registry encodes as a
  // negative heatLoad — not by category, so a new cooling block works for free.
  const coolers = instances.filter((item) => (getBlock(item.type)?.heatLoad ?? 0) < 0);
  if (coolers.length === 0) return result;

  for (const instance of instances) {
    const def = getBlock(instance.type);
    if (!def || def.heatLoad <= 0) continue;
    for (const cooler of coolers) {
      const distance = chebyshev(cooler.position, instance.position);
      if (distance > COOLING_RADIUS_CELLS) continue;
      result.edges.push(
        makeEdge(
          'COOLS',
          nodeId('Asset', cooler.id),
          nodeId('Asset', instance.id),
          provenance(
            EXTRACTOR,
            `voxels/${cooler.id}`,
            ctx,
            distance <= COOLING_RADIUS_CELLS / 2 ? 'medium' : 'low',
            `${cooler.type} removes ${-(getBlock(cooler.type)?.heatLoad ?? 0)}kW within ${distance} cells`,
          ),
          { distance },
        ),
      );
    }
  }

  return result;
}
