/**
 * The proof-acquisition stage reporter.
 *
 * The mint UI renders these stages as a live console, and the whole point of
 * that console is that it reports what actually happened. So the contract worth
 * holding is: the order is fixed, the reported digest is the one that went into
 * the witness, and a rejection is reported rather than silently thrown.
 *
 * It also guards the privacy claim in the only place a regression could hide:
 * no stage may carry the score, the blinding factor, or the build itself.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { emptyState, type BuildState } from '@/lib/blocks';
import { DEMO_BUILDS } from '@/lib/demos';
import { acquireThresholdProof, type ProofStage } from '@/lib/zk/client';
import { MockProver, DEFAULT_THRESHOLD } from '@/lib/zk';

function stateOf(snapshot: unknown): BuildState {
  return { ...emptyState(), ...(snapshot as BuildState) };
}

const build = stateOf(DEMO_BUILDS[2]?.snapshot ?? DEMO_BUILDS[0]?.snapshot);

/** Answers /api/zk/prove with a genuine mock proof over the posted witness. */
function respondWithProof() {
  return vi.fn(async (_url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as {
      witness: Parameters<MockProver['prove']>[0]['witness'];
      threshold: number;
      rulePackVersion: string;
    };
    const proof = await new MockProver().prove({
      witness: body.witness,
      threshold: body.threshold,
      rulePackVersion: body.rulePackVersion,
    });
    return { ok: true, status: 200, json: async () => ({ proof }) } as unknown as Response;
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('acquireThresholdProof stage reporting', () => {
  it('reports the stages in order', async () => {
    vi.stubGlobal('fetch', respondWithProof());
    const seen: ProofStage['stage'][] = [];

    await acquireThresholdProof(build, { onStage: (event) => seen.push(event.stage) });

    expect(seen).toEqual(['graph', 'witness', 'proving', 'proved']);
  });

  it('reports the digest that was actually committed to', async () => {
    vi.stubGlobal('fetch', respondWithProof());
    const events: ProofStage[] = [];

    const result = await acquireThresholdProof(build, {
      onStage: (event) => events.push(event),
    });

    const witnessEvent = events.find((event) => event.stage === 'witness');
    expect(witnessEvent).toBeDefined();
    if (witnessEvent?.stage !== 'witness') throw new Error('unreachable');
    // The console shows this to the user as "never left the browser" — so it
    // had better be the same digest the returned proof was built from.
    expect(witnessEvent.graphDigest).toBe(result.graphDigest);
    expect(witnessEvent.threshold).toBe(DEFAULT_THRESHOLD);
  });

  it('never leaks the score or the blinding factor through a stage', async () => {
    vi.stubGlobal('fetch', respondWithProof());
    const events: ProofStage[] = [];

    const result = await acquireThresholdProof(build, {
      onStage: (event) => events.push(event),
    });

    const serialized = JSON.stringify(events);
    expect(serialized).not.toContain(result.blindingFactor);
    expect(serialized).not.toMatch(/competitionScore/);
  });

  it('reports a rejection before throwing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 422,
        json: async () => ({ error: 'score below the threshold' }),
      }) as unknown as Response),
    );
    const events: ProofStage[] = [];

    await expect(
      acquireThresholdProof(build, { onStage: (event) => events.push(event) }),
    ).rejects.toThrow(/below the threshold/);

    const rejection = events.at(-1);
    expect(rejection?.stage).toBe('rejected');
    if (rejection?.stage !== 'rejected') throw new Error('unreachable');
    expect(rejection.message).toMatch(/below the threshold/);
  });
});
