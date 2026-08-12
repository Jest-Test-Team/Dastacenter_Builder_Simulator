import { describe, expect, it } from 'vitest';
import { emptyState, type BuildState } from '@/lib/blocks';
import { DEMO_BUILDS } from '@/lib/demos';
import {
  CIRCUIT_ID,
  DEFAULT_THRESHOLD,
  MidnightProver,
  MockProver,
  NoirProver,
  ProofError,
  commitmentOf,
  getProver,
  randomBlindingFactor,
  witnessFromBuild,
  type Proof,
  type Witness,
} from '@/lib/zk';

const prover = new MockProver();
const RULE_PACK = 'rules-v1';

/** Demo snapshots are a superset of the pure BuildState. */
function stateOf(snapshot: unknown): BuildState {
  return { ...emptyState(), ...(snapshot as BuildState) };
}

function witness(overrides: Partial<Witness> = {}): Witness {
  return {
    graphDigest: `0x${'ab'.repeat(32)}`,
    score: 92,
    blindingFactor: '0xdeadbeef',
    ...overrides,
  };
}

const prove = (over: Partial<Witness> = {}, threshold = DEFAULT_THRESHOLD) =>
  prover.prove({ witness: witness(over), threshold, rulePackVersion: RULE_PACK });

describe('prover: proving', () => {
  it('produces a proof whose statement clears the threshold', async () => {
    const proof = await prove();
    expect(proof.statement.threshold).toBe(DEFAULT_THRESHOLD);
    expect(proof.statement.circuit).toBe(CIRCUIT_ID);
    expect(proof.statement.rulePackVersion).toBe(RULE_PACK);
    expect(proof.backend).toBe('mock');
  });

  it('refuses to prove a score below the threshold — no such proof exists', async () => {
    await expect(prove({ score: DEFAULT_THRESHOLD - 1 })).rejects.toThrow(ProofError);
    await expect(prove({ score: DEFAULT_THRESHOLD - 1 })).rejects.toThrow(/below the threshold/);
  });

  it('proves exactly at the threshold', async () => {
    await expect(prove({ score: DEFAULT_THRESHOLD })).resolves.toBeDefined();
  });

  it('rejects an incomplete witness', async () => {
    await expect(prove({ graphDigest: '' })).rejects.toThrow(/graph digest/i);
    await expect(prove({ blindingFactor: '' })).rejects.toThrow(/blinding factor/i);
    await expect(prove({ score: Number.NaN })).rejects.toThrow(/competition score/i);
  });
});

describe('prover: the statement leaks nothing', () => {
  it('never carries the digest, the score, or the blinding factor', async () => {
    const secret = witness({ graphDigest: `0x${'11'.repeat(32)}`, score: 97 });
    const proof = await prover.prove({
      witness: secret,
      threshold: DEFAULT_THRESHOLD,
      rulePackVersion: RULE_PACK,
    });
    const serialized = JSON.stringify(proof);
    expect(serialized).not.toContain(secret.graphDigest);
    expect(serialized).not.toContain(secret.blindingFactor);

    // The score must not appear as a value anywhere in the statement. Checked
    // structurally rather than by substring — a two-digit number collides with
    // a random hex commitment often enough to make that assertion meaningless.
    for (const value of Object.values(proof.statement)) expect(value).not.toBe(secret.score);
    expect(proof.statement.threshold).toBe(DEFAULT_THRESHOLD);
    expect(proof.statement.threshold).not.toBe(secret.score);

    expect(Object.keys(proof.statement).sort()).toEqual([
      'circuit',
      'commitment',
      'rulePackVersion',
      'threshold',
    ]);
  });

  it('hides the digest behind the blinding factor', async () => {
    // Without blinding, anyone holding a guessed design could confirm it by
    // recomputing the commitment. Two different blindings must not collide.
    const a = await commitmentOf(witness({ blindingFactor: '0xaaa' }), RULE_PACK);
    const b = await commitmentOf(witness({ blindingFactor: '0xbbb' }), RULE_PACK);
    expect(a).not.toBe(b);
  });

  it('binds the commitment to the rule pack, so a lax pack cannot be replayed as a strict one', async () => {
    const lax = await commitmentOf(witness(), 'rules-lax');
    const strict = await commitmentOf(witness(), 'rules-strict');
    expect(lax).not.toBe(strict);
  });

  it('is deterministic for a fixed witness and pack', async () => {
    expect(await commitmentOf(witness(), RULE_PACK)).toBe(await commitmentOf(witness(), RULE_PACK));
  });
});

describe('prover: verification', () => {
  it('accepts a proof it produced', async () => {
    expect(await prover.verify(await prove())).toEqual({ valid: true });
  });

  it('rejects a proof whose commitment was tampered with', async () => {
    const proof = await prove();
    const tampered: Proof = {
      ...proof,
      statement: { ...proof.statement, commitment: `0x${'99'.repeat(32)}` },
    };
    const result = await prover.verify(tampered);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/does not match its statement/);
  });

  it('rejects a proof whose threshold was inflated after the fact', async () => {
    const proof = await prove();
    const tampered: Proof = { ...proof, statement: { ...proof.statement, threshold: 99 } };
    expect((await prover.verify(tampered)).valid).toBe(false);
  });

  it('rejects a proof made under a different rule pack', async () => {
    const proof = await prove();
    const result = await prover.verify(proof, { rulePackVersion: 'rules-v2' });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/rule pack/);
  });

  it('rejects a proof that clears a lower bar than required', async () => {
    const weak = await prove({}, 50);
    const result = await prover.verify(weak, { threshold: DEFAULT_THRESHOLD });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/below the required/);
  });

  it('rejects an unknown circuit', async () => {
    const proof = await prove();
    const alien: Proof = { ...proof, statement: { ...proof.statement, circuit: 'other/v9' } };
    expect((await prover.verify(alien)).reason).toMatch(/Unknown circuit/);
  });
});

describe('prover: selective disclosure', () => {
  it('reproduces the commitment from a revealed digest and blinding factor', async () => {
    const secret = witness();
    const proof = await prover.prove({
      witness: secret,
      threshold: DEFAULT_THRESHOLD,
      rulePackVersion: RULE_PACK,
    });
    // An auditor under NDA is handed the witness and can confirm it matches.
    expect(await prover.open(secret, RULE_PACK)).toBe(proof.statement.commitment);
  });

  it('does not reproduce it from the wrong digest', async () => {
    const proof = await prove();
    expect(await prover.open(witness({ graphDigest: `0x${'cd'.repeat(32)}` }), RULE_PACK)).not.toBe(
      proof.statement.commitment,
    );
  });
});

describe('prover: selection', () => {
  it('uses the Midnight adapter when a proof server is configured', () => {
    expect(getProver({ MIDNIGHT_PROOF_SERVER_URL: 'http://127.0.0.1:6300' })).toBeInstanceOf(
      MidnightProver,
    );
  });

  it('prefers Noir — real proofs, not the mock — by default', () => {
    expect(getProver({ NODE_ENV: 'development' })).toBeInstanceOf(NoirProver);
    // Including in production: it is sound, so there is nothing to refuse.
    expect(getProver({ NODE_ENV: 'production' })).toBeInstanceOf(NoirProver);
  });

  it('falls back to the mock in development when Noir is off', () => {
    expect(getProver({ NODE_ENV: 'development', ZK_NOIR: 'false' })).toBeInstanceOf(MockProver);
  });

  it('refuses to silently use the unsound mock in production', () => {
    expect(() => getProver({ NODE_ENV: 'production', ZK_NOIR: 'false' })).toThrow(
      /No Midnight proof server/,
    );
  });

  it('allows the mock in production only on an explicit opt-in', () => {
    expect(
      getProver({ NODE_ENV: 'production', ZK_NOIR: 'false', ZK_ALLOW_MOCK: 'true' }),
    ).toBeInstanceOf(MockProver);
  });
});

describe('prover: blinding factors', () => {
  it('are 32 bytes and do not repeat', () => {
    const values = new Set(Array.from({ length: 50 }, () => randomBlindingFactor()));
    expect(values.size).toBe(50);
    for (const value of values) expect(value).toMatch(/^0x[0-9a-f]{64}$/);
  });
});

describe('witnessFromBuild', () => {
  it('derives a witness whose digest matches the fused graph', async () => {
    const demo = DEMO_BUILDS[0]!;
    const result = await witnessFromBuild(stateOf(demo.snapshot));
    expect(result.witness.graphDigest).toMatch(/^0x[0-9a-f]{64}$/);
    expect(result.rulePackVersion).toBeTruthy();
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });

  it('uses a fresh blinding factor each time, so two proofs of one build are unlinkable', async () => {
    const state = stateOf(DEMO_BUILDS[0]!.snapshot);
    const first = await witnessFromBuild(state);
    const second = await witnessFromBuild(state);
    expect(first.witness.graphDigest).toBe(second.witness.graphDigest);
    expect(first.witness.blindingFactor).not.toBe(second.witness.blindingFactor);
    expect(await commitmentOf(first.witness, 'p')).not.toBe(await commitmentOf(second.witness, 'p'));
  });

  it('honours a caller-supplied blinding factor for reproducible tests', async () => {
    const state = stateOf(DEMO_BUILDS[0]!.snapshot);
    const pinned = await witnessFromBuild(state, { blindingFactor: '0xfixed' });
    expect(pinned.witness.blindingFactor).toBe('0xfixed');
  });
});
