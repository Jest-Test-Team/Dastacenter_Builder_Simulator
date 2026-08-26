/**
 * Applying a proposal, on the client, against the real grid.
 *
 * This is the half of the co-designer that the model is not trusted with. The
 * model said *what*; this decides *where*, using the same `canPlace` the builder
 * uses, and then re-scores with the same deterministic engine that scores every
 * other build. Nothing here consults a model.
 *
 * The output is a preview against a clone. The reader applies it or does not —
 * an AI suggestion never mutates a build on its own.
 */

import { canPlace, getBlock, placeBlock, type BuildState } from '@/lib/blocks';
import { score, type RatingReport } from '@/lib/scoring';
import type { ProposalItem } from './designer';

export interface PlacedItem {
  blockId: string;
  displayName: string;
  placed: number;
  requested: number;
  why: string;
  /** Why the shortfall, when there is one. Straight from the grid, not the model. */
  reason?: string;
}

export interface ProposalPreview<T extends BuildState = BuildState> {
  /**
   * The clone with the proposal applied. Generic in the input type so a caller
   * passing a full `BuildSnapshot` gets a snapshot back — the extra scenario and
   * UI fields survive `structuredClone`, and narrowing them away here would let
   * a caller hand a stripped object to `loadBuild`.
   */
  state: T;
  before: RatingReport;
  after: RatingReport;
  applied: PlacedItem[];
  rejected: PlacedItem[];
}

const WORLD = { x: 32, y: 8, z: 32 };

/**
 * Find a free ground-level cell, scanning outward from the origin.
 *
 * Deliberately dumb: it fills gaps in a fixed order rather than trying to be
 * clever about adjacency. A placement heuristic that quietly moves a generator
 * next to a fuel store would be a safety decision made by a spatial search, and
 * that decision belongs to the person building the facility.
 */
function findFreeCell(
  state: BuildState,
  blockId: string,
): { x: number; y: number; z: number } | null {
  for (let z = 0; z < WORLD.z; z++) {
    for (let x = 0; x < WORLD.x; x++) {
      const cell = { x, y: 0, z };
      if (canPlace(state, blockId, cell, 0, WORLD).ok) return cell;
    }
  }
  return null;
}

export function applyProposal<T extends BuildState>(
  state: T,
  items: ProposalItem[],
): ProposalPreview<T> {
  const before = score(state);
  // Structured clone keeps `byCell` and `voxels` in step without hand-copying.
  const draft: T = structuredClone(state);

  const applied: PlacedItem[] = [];
  const rejected: PlacedItem[] = [];

  for (const item of items) {
    const def = getBlock(item.blockId);
    const displayName = def?.displayName ?? item.blockId;
    let placed = 0;
    let reason: string | undefined;

    for (let n = 0; n < item.quantity; n++) {
      const cell = findFreeCell(draft, item.blockId);
      if (!cell) {
        reason = 'No free cell on the ground plane fits this block.';
        break;
      }
      if (placeBlock(draft, { typeId: item.blockId, cell }) === null) {
        reason = canPlace(draft, item.blockId, cell, 0, WORLD).ok
          ? 'Placement failed.'
          : (canPlace(draft, item.blockId, cell, 0, WORLD) as { reason: string }).reason;
        break;
      }
      placed += 1;
    }

    const record: PlacedItem = {
      blockId: item.blockId,
      displayName,
      placed,
      requested: item.quantity,
      why: item.why,
      reason,
    };
    if (placed > 0) applied.push(record);
    else rejected.push(record);
  }

  return { state: draft, before, after: score(draft), applied, rejected };
}
