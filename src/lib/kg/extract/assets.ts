/**
 * Asset extractor (stage 4) — the physical plane.
 *
 * Source: `BuildState.voxels` (placed instances) joined against the block
 * registry (the catalog). Every Asset gets exactly one AssetType and, when its
 * cell falls inside a declared space, one LOCATED_IN edge.
 */

import type { BuildState } from '@/lib/blocks';
import { getBlock } from '@/lib/blocks';
import { chebyshev } from '@/lib/grid';
import { emptyExtraction, type ExtractionResult } from '../types';
import { canonicalStandard, makeEdge, makeNode, nodeId, provenance, type ExtractContext } from './common';
import { resolveSpaceForCell } from './spaces';

const EXTRACTOR = 'assets';

/** Two assets are adjacent when their cells are within this Chebyshev distance. */
export const ADJACENCY_CELLS = 1;

export function extractAssets(state: BuildState, ctx: ExtractContext): ExtractionResult {
  const result = emptyExtraction();
  const spaces = state.network?.spaces ?? {};
  const instances = Object.values(state.voxels).sort((a, b) => a.id.localeCompare(b.id));
  const seenTypes = new Set<string>();
  let unmodelledStandards = 0;
  let standardExample = '';

  for (const instance of instances) {
    const def = getBlock(instance.type);
    const source = `voxels/${instance.id}`;
    const prov = provenance(EXTRACTOR, source, ctx);
    const self = nodeId('Asset', instance.id);

    result.nodes.push(
      makeNode(
        'Asset',
        instance.id,
        def?.displayName ?? instance.type,
        {
          typeId: instance.type,
          position: instance.position,
          rotation: instance.rotation,
          powerDraw: def?.powerDraw ?? 0,
          heatLoad: def?.heatLoad ?? 0,
        },
        prov,
      ),
    );

    // The catalog entry. Emitted once per distinct type, from the registry.
    if (def && !seenTypes.has(def.id)) {
      seenTypes.add(def.id);
      result.nodes.push(
        makeNode(
          'AssetType',
          def.id,
          def.displayName,
          {
            category: def.category,
            powerDraw: def.powerDraw,
            heatLoad: def.heatLoad,
            tierRole: def.tierRole,
            standards: def.standards,
            decorative: def.decorative,
          },
          provenance(EXTRACTOR, `registry/${def.id}`, ctx),
        ),
      );
      if (def.standards.length > 0) {
        unmodelledStandards += def.standards.length;
        standardExample ||= `${def.id} -> ${canonicalStandard(def.standards[0]!)}`;
      }
    }
    if (def) result.edges.push(makeEdge('INSTANCE_OF', self, nodeId('AssetType', def.id), prov));

    const space = resolveSpaceForCell(spaces, instance.position);
    if (space)
      result.edges.push(
        makeEdge('LOCATED_IN', self, nodeId('Space', space.id), prov, { spaceKind: space.kind }),
      );
  }

  // ADJACENT_TO is symmetric; emit one direction and let the gate materialize the other.
  for (let i = 0; i < instances.length; i++) {
    for (let j = i + 1; j < instances.length; j++) {
      const a = instances[i]!;
      const b = instances[j]!;
      if (chebyshev(a.position, b.position) > ADJACENCY_CELLS) continue;
      result.edges.push(
        makeEdge(
          'ADJACENT_TO',
          nodeId('Asset', a.id),
          nodeId('Asset', b.id),
          provenance(EXTRACTOR, `voxels/${a.id}`, ctx, 'high', `chebyshev<=${ADJACENCY_CELLS}`),
        ),
      );
    }
  }

  // The registry asserts which standards a catalog entry conforms to, but the
  // ontology has no AssetType->Standard relation. Per the working rules that
  // goes on the candidate list for review rather than being forced into
  // CITES_STANDARD, whose domain is IssueRaised.
  if (unmodelledStandards > 0)
    result.candidateRelations = [
      {
        label: 'CONFORMS_TO',
        sourceType: 'AssetType',
        targetType: 'Standard',
        occurrences: unmodelledStandards,
        example: standardExample,
      },
    ];

  return result;
}
