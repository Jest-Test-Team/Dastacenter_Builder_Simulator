/**
 * Space extractor (stage 4) — the spatial hierarchy plane.
 *
 * Source: `BuildState.network.spaces`, a Record<string, SpatialUnit> that
 * already encodes its own tree via `parentId`. Direct mapping, no inference.
 */

import type { BuildState } from '@/lib/blocks';
import type { SpatialUnit } from '@/lib/network';
import { emptyExtraction, type ExtractionResult } from '../types';
import { makeEdge, makeNode, nodeId, provenance, type ExtractContext } from './common';

const EXTRACTOR = 'spaces';

/** Maps a SpatialUnit kind to the ontology's single Space type. Kind survives as an attribute. */
export function extractSpaces(state: BuildState, ctx: ExtractContext): ExtractionResult {
  const result = emptyExtraction();
  const spaces = state.network?.spaces ?? {};

  for (const space of Object.values(spaces) as SpatialUnit[]) {
    const source = `network/spaces/${space.id}`;
    const prov = provenance(EXTRACTOR, source, ctx);
    result.nodes.push(
      makeNode(
        'Space',
        space.id,
        space.name.trim(),
        {
          kind: space.kind,
          floorLevel: space.floorLevel,
          bounds: space.bounds,
          visible: space.visible,
        },
        prov,
      ),
    );

    const self = nodeId('Space', space.id);
    if (space.parentId && spaces[space.parentId]) {
      // Containment is asserted from the parent, matching the CONTAINS domain.
      result.edges.push(
        makeEdge(
          'CONTAINS',
          nodeId('Space', space.parentId),
          self,
          provenance(EXTRACTOR, source, ctx),
        ),
      );
    } else {
      result.edges.push(makeEdge('PART_OF', self, ctx.rootId, prov));
    }
  }

  return result;
}

/**
 * Finds the most specific space containing a cell.
 *
 * Bounds are half-open on the far edge (`x <= cx < x + width`), matching how the
 * 3D scene renders them. "Most specific" is the smallest-volume match, so an
 * asset inside a hall inside a floor resolves to the hall.
 *
 * Hidden spaces lose every tie. The default hierarchy ships `hall-a` and
 * `room-network` as invisible legacy aliases occupying the exact same volume as
 * `main-floor-hall` and `main-floor-west`; without this preference an asset
 * would attach to the copy nothing else references. Fusion later merges the
 * pair, but extraction should not depend on that having run.
 */
export function resolveSpaceForCell(
  spaces: Record<string, SpatialUnit>,
  cell: { x: number; y: number; z: number },
): SpatialUnit | null {
  let best: SpatialUnit | null = null;
  let bestVolume = Infinity;
  const better = (candidate: SpatialUnit, volume: number): boolean => {
    if (best === null) return true;
    if (volume !== bestVolume) return volume < bestVolume;
    if (candidate.visible !== best.visible) return candidate.visible;
    return candidate.id < best.id;
  };
  for (const space of Object.values(spaces)) {
    const { x, y, z, width, height, depth } = space.bounds;
    const inside =
      cell.x >= x &&
      cell.x < x + width &&
      cell.y >= y &&
      cell.y < y + height &&
      cell.z >= z &&
      cell.z < z + depth;
    if (!inside) continue;
    const volume = width * height * depth;
    if (better(space, volume)) {
      best = space;
      bestVolume = volume;
    }
  }
  return best;
}
