import { describe, it, expect } from 'vitest';
import { getBlock, BLOCK_REGISTRY, canPlace, placeBlock, removeBlock, CATEGORIES } from '@/lib/blocks/registry';
import { emptyState, type BuildState } from '@/lib/blocks/types';
import { cellKey } from '@/lib/grid';

function s(): BuildState {
  return emptyState();
}

describe('block registry', () => {
  it('has a deterministic block count', () => {
    expect(BLOCK_REGISTRY.length).toBeGreaterThan(30);
  });

  it('every block has a unique id', () => {
    const ids = new Set<string>();
    for (const b of BLOCK_REGISTRY) {
      expect(ids.has(b.id)).toBe(false);
      ids.add(b.id);
    }
  });

  it('every block belongs to one of the known categories', () => {
    for (const b of BLOCK_REGISTRY) {
      expect(CATEGORIES).toContain(b.category);
    }
  });

  it('getBlock returns the definition for a known id', () => {
    const b = getBlock('server_rack');
    expect(b).toBeDefined();
    expect(b?.category).toBe('it');
  });

  it('getBlock returns undefined for an unknown id', () => {
    expect(getBlock('nope.does.not.exist')).toBeUndefined();
  });

  it('getBlock returns the definition for a known id', () => {
    const b = getBlock('server_rack');
    expect(b).toBeDefined();
    expect(b?.category).toBe('it');
  });

  it('canPlace returns ok:false when out of bounds', () => {
    const state = s();
    const r = canPlace(state, 'server_rack', { x: 100, y: 0, z: 0 });
    expect(r.ok).toBe(false);
  });

  it('placeBlock creates an instance and updates the spatial index', () => {
    const state = s();
    const id = placeBlock(state, { typeId: 'server_rack', cell: { x: 4, y: 1, z: 4 } });
    expect(id).toBeTruthy();
    expect(state.voxels[id!]).toBeDefined();
    expect(state.byCell[cellKey({ x: 4, y: 1, z: 4 })]).toBe(id);
  });

  it('placeBlock refuses to overlap an existing block', () => {
    const state = s();
    placeBlock(state, { typeId: 'server_rack', cell: { x: 4, y: 1, z: 4 } });
    const id2 = placeBlock(state, { typeId: 'server_rack', cell: { x: 4, y: 1, z: 4 } });
    expect(id2).toBeNull();
  });

  it('removeBlock returns the instance and clears the index', () => {
    const state = s();
    const id = placeBlock(state, { typeId: 'server_rack', cell: { x: 4, y: 1, z: 4 } })!;
    const removed = removeBlock(state, id);
    expect(removed?.id).toBe(id);
    expect(state.voxels[id]).toBeUndefined();
    expect(state.byCell[cellKey({ x: 4, y: 1, z: 4 })]).toBeUndefined();
  });
});
