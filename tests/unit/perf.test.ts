/**
 * Performance budget.
 *
 * We can't measure runtime perf in unit tests, but we CAN assert on
 * the shape of our bundle, the size of our registry, and the
 * purity/determinism of our scoring engine (which is what powers
 * the certificate).
 */

import { describe, it, expect } from 'vitest';
import { BLOCK_REGISTRY } from '@/lib/blocks/registry';
import { allRules } from '@/lib/scoring/rules';
import { score } from '@/lib/scoring/engine';
import { emptyState } from '@/lib/blocks';

describe('performance budget', () => {
  it('block registry stays under 100 entries', () => {
    expect(BLOCK_REGISTRY.length).toBeLessThan(100);
  });

  it('scoring rule pack stays under 200 rules', () => {
    expect(allRules.length).toBeLessThan(200);
  });

  it('scoring 1000 empty-state runs takes < 500ms', () => {
    const s = emptyState();
    const t = performance.now();
    for (let i = 0; i < 1000; i++) score(s);
    const elapsed = performance.now() - t;
    expect(elapsed).toBeLessThan(500);
  });

  it('scoring a 200-block build runs in < 100ms', () => {
    const s = emptyState();
    let placed = 0;
    outer: for (let x = 0; x < 32; x++) {
      for (let z = 0; z < 32; z++) {
        for (let y = 0; y < 1; y++) {
          s.voxels[`b${placed}`] = {
            id: `b${placed}`,
            type: 'server_rack',
            position: { x, y, z },
            rotation: 0,
            metadata: {},
          };
          placed++;
          if (placed >= 200) break outer;
        }
      }
    }
    const t = performance.now();
    score(s);
    const elapsed = performance.now() - t;
    expect(elapsed).toBeLessThan(100);
  });
});
