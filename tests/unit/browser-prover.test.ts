/**
 * @vitest-environment node
 *
 * The browser prover, exercised for real. This is the prover the deployed app
 * uses (the server route cannot run bb.js on Cloudflare Workers). It shares its
 * encoding and statement checks with NoirProver via noir-shared, so the point
 * of this suite is to prove that the browser path — which loads the circuit from
 * the bundled JSON rather than the filesystem — generates and verifies a genuine
 * UltraHonk proof end to end.
 *
 * bb.js runs under node here; the only thing that differs from the browser is
 * where its WASM comes from, which does not change the proof it produces.
 */

import { describe, expect, it } from 'vitest';
import { BrowserProver } from '@/lib/zk/browser-prover';
import { CIRCUIT_ID, type Witness } from '@/lib/zk/types';

const prover = new BrowserProver();
const RULE_PACK = '0.1.0';
const TIMEOUT = 120_000;

function witness(overrides: Partial<Witness> = {}): Witness {
  return {
    graphDigest: `0x${'ab'.repeat(32)}`,
    score: 92,
    blindingFactor: `0x${'cd'.repeat(32)}`,
    ...overrides,
  };
}

describe('BrowserProver (real proofs)', () => {
  it(
    'proves and verifies a build that clears the bar',
    async () => {
      const proof = await prover.prove({
        witness: witness(),
        threshold: 85,
        rulePackVersion: RULE_PACK,
      });

      expect(proof.backend).toBe('noir');
      expect(proof.statement.circuit).toBe(CIRCUIT_ID);
      expect(proof.statement.threshold).toBe(85);
      expect(proof.proof.length).toBeGreaterThan(1000);

      await expect(
        prover.verify(proof, { threshold: 85, rulePackVersion: RULE_PACK }),
      ).resolves.toEqual({ valid: true });
    },
    TIMEOUT,
  );

  it(
    'refuses to prove a build below the bar',
    async () => {
      await expect(
        prover.prove({ witness: witness({ score: 40 }), threshold: 85, rulePackVersion: RULE_PACK }),
      ).rejects.toThrow(/below the threshold/i);
    },
    TIMEOUT,
  );

  it(
    'keeps the score and digest out of the public statement',
    async () => {
      const w = witness();
      const proof = await prover.prove({ witness: w, threshold: 85, rulePackVersion: RULE_PACK });
      const serialized = JSON.stringify(proof.statement);
      expect(serialized).not.toContain(w.graphDigest.slice(2));
      expect(serialized).not.toContain('92');
    },
    TIMEOUT,
  );
});
