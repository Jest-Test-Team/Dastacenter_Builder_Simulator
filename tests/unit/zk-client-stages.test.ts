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
 *
 * Proving now runs in the browser (lib/zk/browser-prover.ts), so these tests
 * mock that module rather than `fetch`. The real BrowserProver loads bb.js's
 * WASM, which does not run under the node test runtime — but its contract is the
 * same Prover interface the mock stands in for here.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { emptyState, type BuildState } from '@/lib/blocks';
import { DEMO_BUILDS } from '@/lib/demos';
import { MockProver, DEFAULT_THRESHOLD, ProofError, type ProveRequest } from '@/lib/zk';

// Control the browser prover's behaviour per test.
const proveImpl = vi.fn<(request: ProveRequest) => Promise<unknown>>();

vi.mock('@/lib/zk/browser-prover', () => ({
  BrowserProver: class {
    readonly backend = 'noir' as const;
    prove(request: ProveRequest) {
      return proveImpl(request);
    }
    async verify() {
      return { valid: true as const };
    }
  },
}));

// Import after the mock is registered so the dynamic import resolves to it.
const { acquireThresholdProof } = await import('@/lib/zk/client');
type ProofStage = import('@/lib/zk/client').ProofStage;

function stateOf(snapshot: unknown): BuildState {
  return { ...emptyState(), ...(snapshot as BuildState) };
}

const build = stateOf(DEMO_BUILDS[2]?.snapshot ?? DEMO_BUILDS[0]?.snapshot);

/** Have the mocked prover answer with a genuine mock proof over the witness. */
function respondWithProof() {
  proveImpl.mockImplementation((request: ProveRequest) =>
    new MockProver().prove({
      witness: request.witness,
      threshold: request.threshold,
      rulePackVersion: request.rulePackVersion,
    }),
  );
}

afterEach(() => {
  proveImpl.mockReset();
});

describe('acquireThresholdProof stage reporting', () => {
  it('reports the stages in order', async () => {
    respondWithProof();
    const seen: ProofStage['stage'][] = [];

    await acquireThresholdProof(build, { onStage: (event) => seen.push(event.stage) });

    // 'graph' fires twice (start, then with counts); the flow now also reports
    // backend load and the local verify step.
    expect(seen).toEqual([
      'graph',
      'graph',
      'witness',
      'backend',
      'proving',
      'proved',
      'verifying',
      'verified',
    ]);
  });

  it('reports the digest that was actually committed to', async () => {
    respondWithProof();
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
    respondWithProof();
    const events: ProofStage[] = [];

    const result = await acquireThresholdProof(build, {
      onStage: (event) => events.push(event),
    });

    const serialized = JSON.stringify(events);
    expect(serialized).not.toContain(result.blindingFactor);
    expect(serialized).not.toMatch(/competitionScore/);
  });

  it('reports a rejection before throwing', async () => {
    proveImpl.mockRejectedValue(new ProofError(422, 'score below the threshold'));
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
