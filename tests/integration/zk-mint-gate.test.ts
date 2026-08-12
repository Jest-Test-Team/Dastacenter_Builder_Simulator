/**
 * The mint gate.
 *
 * Minting writes a permanent public claim to a chain — the irreversible edge in
 * this system — so the proof is checked immediately before it, and these tests
 * drive the real route handlers rather than the library beneath them. A gate
 * that is only tested one layer down is a gate nobody has actually tried.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { emptyState, type BuildState } from '@/lib/blocks';
import { DEMO_BUILDS } from '@/lib/demos';
import { score } from '@/lib/scoring';
import { buildKnowledgeGraph, graphDigest } from '@/lib/kg';
import { CIRCUIT_ID, DEFAULT_THRESHOLD, MockProver, type Proof } from '@/lib/zk';
import { POST as provePost } from '@/app/api/zk/prove/route';
import { POST as verifyPost } from '@/app/api/zk/verify/route';
import { POST as mintPost } from '@/app/api/sbt/mint/route';

const snapshot = DEMO_BUILDS[0]!.snapshot;
const state: BuildState = { ...emptyState(), ...(snapshot as unknown as BuildState) };
const report = score(state);

/** Route handlers return untyped JSON; these are the two shapes under test. */
type JsonBody = { error?: string; valid?: boolean; reason?: string; proof?: Proof };

async function json(response: Response): Promise<JsonBody> {
  return (await response.json()) as JsonBody;
}

function request(url: string, body: unknown): NextRequest {
  return new NextRequest(new URL(url, 'https://example.com'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function witness(scoreOverride?: number) {
  const { graph } = buildKnowledgeGraph(state);
  return {
    graphDigest: await graphDigest(graph),
    score: scoreOverride ?? Math.max(report.score, DEFAULT_THRESHOLD),
    blindingFactor: `0x${'ab'.repeat(32)}`,
  };
}

async function validProof(): Promise<Proof> {
  return new MockProver().prove({
    witness: await witness(),
    threshold: DEFAULT_THRESHOLD,
    rulePackVersion: report.rulePackVersion,
  });
}

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'development');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('POST /api/zk/prove', () => {
  it('returns a proof for a build that clears the bar', async () => {
    const response = await provePost(
      request('/api/zk/prove', {
        witness: await witness(),
        threshold: DEFAULT_THRESHOLD,
        rulePackVersion: report.rulePackVersion,
      }),
    );
    expect(response.status).toBe(200);
    const body = await json(response);
    expect(body.proof!.statement.circuit).toBe(CIRCUIT_ID);
    expect(body.proof!.statement.threshold).toBe(DEFAULT_THRESHOLD);
  });

  it('refuses to prove a build below the bar, with 422 rather than a bad proof', async () => {
    const response = await provePost(
      request('/api/zk/prove', {
        witness: await witness(DEFAULT_THRESHOLD - 1),
        threshold: DEFAULT_THRESHOLD,
        rulePackVersion: report.rulePackVersion,
      }),
    );
    expect(response.status).toBe(422);
    expect((await json(response)).error).toMatch(/below the threshold/);
  });

  it('rejects a malformed digest', async () => {
    const response = await provePost(
      request('/api/zk/prove', {
        witness: { ...(await witness()), graphDigest: 'not-a-hash' },
        rulePackVersion: report.rulePackVersion,
      }),
    );
    expect(response.status).toBe(400);
  });

  it('never echoes the witness back', async () => {
    const secret = await witness();
    const response = await provePost(
      request('/api/zk/prove', { witness: secret, rulePackVersion: report.rulePackVersion }),
    );
    const text = JSON.stringify(await json(response));
    expect(text).not.toContain(secret.graphDigest);
    expect(text).not.toContain(secret.blindingFactor);
  });
});

describe('POST /api/zk/verify', () => {
  it('accepts a valid proof', async () => {
    const response = await verifyPost(request('/api/zk/verify', { proof: await validProof() }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ valid: true });
  });

  it('rejects a proof whose commitment was altered', async () => {
    const proof = await validProof();
    proof.statement.commitment = `0x${'00'.repeat(32)}`;
    const body = await json(await verifyPost(request('/api/zk/verify', { proof })));
    expect(body.valid).toBe(false);
  });

  it('rejects a proof that clears a lower bar than the caller requires', async () => {
    const weak = await new MockProver().prove({
      witness: await witness(),
      threshold: 10,
      rulePackVersion: report.rulePackVersion,
    });
    const body = await json(
      await verifyPost(request('/api/zk/verify', { proof: weak, expect: { threshold: DEFAULT_THRESHOLD } })),
    );
    expect(body.valid).toBe(false);
    expect(body.reason).toMatch(/below the required/);
  });

  it('rejects an unknown circuit without invoking a prover', async () => {
    const proof = await validProof();
    proof.statement.circuit = 'someone-elses/v1';
    const body = await json(await verifyPost(request('/api/zk/verify', { proof })));
    expect(body.valid).toBe(false);
    expect(body.reason).toMatch(/Unknown circuit/);
  });

  it('rejects a structurally invalid request', async () => {
    expect((await verifyPost(request('/api/zk/verify', { proof: { nope: true } }))).status).toBe(400);
  });
});

describe('POST /api/sbt/mint — the gate', () => {
  const mintBody = (proof?: unknown) => ({
    snapshot,
    recipientAddress: '0x1234567890abcdef1234567890abcdef12345678',
    recipientName: 'Ada Lovelace',
    svgDataUri: 'data:image/svg+xml;base64,AAA',
    chainId: 11155111,
    ...(proof === undefined ? {} : { proof }),
  });

  it('refuses to mint with no proof at all', async () => {
    const response = await mintPost(request('/api/sbt/mint', mintBody()));
    expect(response.status).toBe(400);
    expect((await json(response)).error).toBe('Invalid request');
  });

  it('refuses to mint with a structurally invalid proof', async () => {
    const response = await mintPost(request('/api/sbt/mint', mintBody({ proof: 'nope' })));
    expect(response.status).toBe(400);
  });

  it('refuses to mint when the proof was tampered with', async () => {
    const proof = await validProof();
    proof.statement.commitment = `0x${'11'.repeat(32)}`;
    const response = await mintPost(request('/api/sbt/mint', mintBody(proof)));
    // Rejected before any chain interaction is attempted.
    expect(response.status).toBe(400);
    expect((await json(response)).error).toMatch(/Proof rejected/);
  });

  it('refuses to mint when the proof was made under a different rule pack', async () => {
    const stale = await new MockProver().prove({
      witness: await witness(),
      threshold: DEFAULT_THRESHOLD,
      rulePackVersion: 'rules-from-last-year',
    });
    const response = await mintPost(request('/api/sbt/mint', mintBody(stale)));
    expect(response.status).toBe(400);
    expect((await json(response)).error).toMatch(/rule pack/);
  });

  it('refuses to mint when the proof clears a bar below the required threshold', async () => {
    const weak = await new MockProver().prove({
      witness: await witness(),
      threshold: 10,
      rulePackVersion: report.rulePackVersion,
    });
    const response = await mintPost(request('/api/sbt/mint', mintBody(weak)));
    expect(response.status).toBe(400);
    expect((await json(response)).error).toMatch(/below the required/);
  });

  it('accepts a valid proof and proceeds past the gate', async () => {
    const response = await mintPost(request('/api/sbt/mint', mintBody(await validProof())));
    const body = await json(response);
    // No chain is configured in tests, so the mint fails *after* the gate. What
    // matters here is that it is no longer the proof being rejected.
    expect(body.error ?? '').not.toMatch(/Proof rejected|rule pack|below the required/);
  });
});
