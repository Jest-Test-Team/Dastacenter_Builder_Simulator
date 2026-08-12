/**
 * @vitest-environment node
 *
 * The real prover, exercised for real — no mocking, no stubs. It generates an
 * actual UltraHonk proof over the compiled Noir circuit and verifies it.
 *
 * This is the one suite that must not be faked. Everything else in the ZK path
 * is tested against MockProver, which is forgeable by construction; if the
 * genuine prover were only ever exercised by hand, "we have zero-knowledge
 * proofs" would rest on a demo someone ran once.
 *
 * Proving takes a couple of seconds, hence the raised timeouts.
 */

import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NoirProver } from '@/lib/zk/noir-prover';
import { CIRCUIT_ID, type Witness } from '@/lib/zk/types';

const CIRCUIT_BUILT = existsSync('circuits/noir/target/datacenter_score.json');
// A checkout without the compiled circuit still gets a green run; the circuit
// build is committed, so in practice this skip should never fire.
const describeIfBuilt = CIRCUIT_BUILT ? describe : describe.skip;

const prover = new NoirProver();
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

describeIfBuilt('NoirProver (real proofs)', () => {
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
    'never puts the score or the digest in the public statement',
    async () => {
      const secretDigest = `0x${'7f'.repeat(32)}`;
      const proof = await prover.prove({
        witness: witness({ graphDigest: secretDigest, score: 97 }),
        threshold: 85,
        rulePackVersion: RULE_PACK,
      });

      // Compare decoded field values, not substrings: a short decimal like "97"
      // shows up inside commitment hex by coincidence and would make this test
      // pass or fail for no reason.
      const values = (proof.publicInputs ?? []).map((input) => BigInt(input));
      expect(values).not.toContain(97n);
      expect(values).not.toContain(BigInt(secretDigest.slice(0, 34)));
      expect(values).not.toContain(BigInt(`0x${secretDigest.slice(34)}`));

      // The digest must not appear anywhere in what gets published, in any form.
      const published = JSON.stringify({
        statement: proof.statement,
        publicInputs: proof.publicInputs,
      });
      expect(published).not.toContain(secretDigest.slice(2));
      expect(published).not.toContain('7f'.repeat(8));
    },
    TIMEOUT,
  );

  it('refuses to prove a build below the bar — no such proof exists', async () => {
    await expect(
      prover.prove({ witness: witness({ score: 80 }), threshold: 85, rulePackVersion: RULE_PACK }),
    ).rejects.toThrow(/below the threshold/i);
  });

  it(
    'blinding hides the design: the same build commits differently each time',
    async () => {
      const [a, b] = await Promise.all([
        prover.prove({
          witness: witness({ blindingFactor: `0x${'11'.repeat(32)}` }),
          threshold: 85,
          rulePackVersion: RULE_PACK,
        }),
        prover.prove({
          witness: witness({ blindingFactor: `0x${'22'.repeat(32)}` }),
          threshold: 85,
          rulePackVersion: RULE_PACK,
        }),
      ]);
      expect(a.statement.commitment).not.toBe(b.statement.commitment);
    },
    TIMEOUT,
  );

  it(
    'rejects a proof whose statement has been edited to claim more',
    async () => {
      const proof = await prover.prove({
        witness: witness(),
        threshold: 85,
        rulePackVersion: RULE_PACK,
      });

      // Claiming a higher bar than was proven must not verify — this is the
      // attack the mint gate exists to stop.
      const inflated = { ...proof, statement: { ...proof.statement, threshold: 99 } };
      const result = await prover.verify(inflated, { threshold: 99 });
      expect(result.valid).toBe(false);
    },
    TIMEOUT,
  );

  it(
    'rejects a proof made under a different rule pack',
    async () => {
      const proof = await prover.prove({
        witness: witness(),
        threshold: 85,
        rulePackVersion: RULE_PACK,
      });
      const result = await prover.verify(proof, { rulePackVersion: '9.9.9' });
      expect(result.valid).toBe(false);
    },
    TIMEOUT,
  );

  it(
    'rejects tampered proof bytes',
    async () => {
      const proof = await prover.prove({
        witness: witness(),
        threshold: 85,
        rulePackVersion: RULE_PACK,
      });
      const flipped = `${proof.proof.slice(0, -2)}${proof.proof.endsWith('00') ? 'ff' : '00'}`;
      const result = await prover.verify({ ...proof, proof: flipped });
      expect(result.valid).toBe(false);
    },
    TIMEOUT,
  );
});
