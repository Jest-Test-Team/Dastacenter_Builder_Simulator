/**
 * What the settlement agent refuses to pay for.
 *
 * The agent's verification is the load-bearing part of the whole narrative: it
 * is what lets the demo say "the credential was verified and no commercial data
 * leaked" without that being a caption over an animation. So the cases that must
 * FAIL are tested more thoroughly than the case that passes.
 *
 * The disclosure check in particular is a regression guard on a different file:
 * if `src/lib/sbt/metadata.ts` ever starts writing an exact score or a PUE into
 * a document that gets published to a public chain forever, this test fails.
 */

import { describe, expect, it } from 'vitest';
import { verifyCredential, type FetchedCredential } from '@/lib/agent/credential';
import { CIRCUIT_ID } from '@/lib/zk';

const HOLDER = '0x1111111111111111111111111111111111111111';
const HASH = `0x${'ab'.repeat(32)}`;

function credential(overrides: Partial<FetchedCredential> = {}): FetchedCredential {
  return {
    tokenId: '7',
    owner: HOLDER,
    onChainBlueprintHash: HASH,
    metadataUri: 'ipfs://x',
    metadata: {
      name: 'Elite Green Architect',
      attributes: [
        { trait_type: 'Level', value: 'Platinum' },
        { trait_type: 'Score', value: '>= 85' },
        { trait_type: 'Blueprint Hash', value: HASH },
        { trait_type: 'Proof Circuit', value: CIRCUIT_ID },
        { trait_type: 'Rule Pack', value: 'v1.0.0' },
        { trait_type: 'Proof Backend', value: 'noir' },
      ],
    },
    ...overrides,
  };
}

/** Replace one attribute in the fixture, keeping the rest intact. */
function withAttribute(trait: string, value: string | number | undefined): FetchedCredential {
  const base = credential();
  const attributes = (base.metadata?.attributes ?? []).filter((a) => a.trait_type !== trait);
  if (value !== undefined) attributes.push({ trait_type: trait, value });
  return { ...base, metadata: { ...base.metadata, attributes } };
}

describe('verifyCredential', () => {
  it('accepts a real, privacy-preserving credential', () => {
    const verdict = verifyCredential(credential(), HOLDER);
    expect(verdict.ok).toBe(true);
    expect(verdict.level).toBe('Platinum');
    expect(verdict.checks.every((check) => check.ok)).toBe(true);
  });

  it('refuses to pay someone who does not hold the token', () => {
    const verdict = verifyCredential(credential(), '0x2222222222222222222222222222222222222222');
    expect(verdict.ok).toBe(false);
    expect(verdict.checks.find((c) => c.name === 'Ownership')?.ok).toBe(false);
  });

  it('refuses metadata that is not bound to the on-chain token', () => {
    const verdict = verifyCredential(
      { ...credential(), onChainBlueprintHash: `0x${'cd'.repeat(32)}` },
      HOLDER,
    );
    expect(verdict.ok).toBe(false);
    expect(verdict.checks.find((c) => c.name === 'Metadata binding')?.ok).toBe(false);
  });

  it('refuses a credential backed by a simulated proof', () => {
    // A mock proof is forgeable. Paying against one would make the money the
    // only real thing in the loop.
    const verdict = verifyCredential(withAttribute('Proof Backend', 'mock'), HOLDER);
    expect(verdict.ok).toBe(false);
    expect(verdict.reason).toMatch(/SIMULATED/i);
  });

  it('refuses a credential with no recorded backend at all', () => {
    const verdict = verifyCredential(withAttribute('Proof Backend', undefined), HOLDER);
    expect(verdict.ok).toBe(false);
  });

  it('refuses an unknown circuit', () => {
    const verdict = verifyCredential(withAttribute('Proof Circuit', 'someone-elses/v9'), HOLDER);
    expect(verdict.ok).toBe(false);
  });

  it('refuses a score below the agent bar', () => {
    const verdict = verifyCredential(withAttribute('Score', '>= 40'), HOLDER);
    expect(verdict.ok).toBe(false);
    expect(verdict.checks.find((c) => c.name === 'Threshold cleared')?.ok).toBe(false);
  });

  describe('the privacy claim', () => {
    it('refuses a document that publishes an exact score', () => {
      const verdict = verifyCredential(withAttribute('Score', 91), HOLDER);
      expect(verdict.ok).toBe(false);
      // A bare figure trips two checks at once — it is not in threshold form,
      // and it discloses the score. `reason` reports the first, so assert on
      // the disclosure check directly rather than on which one surfaced.
      expect(verdict.checks.find((c) => c.name === 'Design not disclosed')?.ok).toBe(false);
      expect(verdict.checks.find((c) => c.name === 'Design not disclosed')?.detail).toMatch(
        /exact score/i,
      );
    });

    it.each(['PUE', 'WUE', 'Graph Digest', 'Layout'])(
      'refuses a document that publishes %s',
      (trait) => {
        const verdict = verifyCredential(withAttribute(trait, '1.21'), HOLDER);
        expect(verdict.ok).toBe(false);
        expect(verdict.checks.find((c) => c.name === 'Design not disclosed')?.ok).toBe(false);
      },
    );

    it('passes when only the threshold form and the commitment are published', () => {
      const verdict = verifyCredential(credential(), HOLDER);
      expect(verdict.checks.find((c) => c.name === 'Design not disclosed')?.ok).toBe(true);
    });
  });

  it('reports every check regardless of outcome, so the terminal can show its work', () => {
    const names = verifyCredential(credential(), HOLDER).checks.map((c) => c.name);
    expect(names).toEqual([
      'Ownership',
      'Metadata binding',
      'Cryptographic backing',
      'Circuit',
      'Rule pack',
      'Threshold cleared',
      'Design not disclosed',
    ]);
  });
});
