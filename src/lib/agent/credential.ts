/**
 * What the agent checks before it parts with money.
 *
 * Be precise about what is and is not being verified here, because the
 * temptation to overstate it is the whole risk. The SNARK itself is **not**
 * re-verified: the proof bytes are never written to chain, and bb.js cannot run
 * in the Workers runtime anyway. What the agent has is the certificate as
 * published — the on-chain token and its metadata document — and that turns out
 * to be enough to check the properties a payer actually cares about:
 *
 * 1. the claimant really owns the token,
 * 2. the metadata really belongs to that token,
 * 3. the credential is backed by a real proof rather than a simulated one,
 * 4. it was judged by a rule pack the agent recognises, at or above the bar,
 * 5. **and the published document does not disclose the design.**
 *
 * (5) is the one worth dwelling on. "Commercial secrets did not leak" is the
 * central claim of this whole project, and here it is checked over the actual
 * bytes that were published forever, rather than asserted in a comment. If a
 * future change to the metadata builder ever starts writing an exact score, a
 * PUE or a graph digest into a public document, the agent refuses to pay and
 * says why — which is a far better failure than a silent leak.
 *
 * Every check is pure over data the caller fetched, so all of this is testable
 * without a chain.
 */

import { CIRCUIT_ID, DEFAULT_THRESHOLD } from '@/lib/zk';
import { levelOf, type CertificateAttribute } from './rate-card';
import type { CredentialCheck } from './types';

/**
 * The rule packs this agent is willing to settle against.
 *
 * Live credentials on Sepolia carry a bare semver (`0.1.0`) — the engine's
 * `rulePackVersion` — so a leading `v` is optional. The check exists to reject a
 * pack this agent has never heard of, not to enforce a spelling.
 */
const RECOGNISED_RULE_PACKS = [/^v?\d+\.\d+/i, /^datacenter-score/i];

/**
 * Attribute names that must never carry a bare figure, and the reason each one
 * would matter if it did. Order is the order they are reported in.
 */
const DISCLOSURE_FORBIDDEN = ['PUE', 'WUE', 'Graph Digest', 'Blinding', 'Layout', 'Blueprint'];

export interface FetchedCredential {
  tokenId: string;
  /** Owner as reported by the contract, not by the caller. */
  owner: string;
  /** Blueprint hash as stored on chain, for binding the metadata to the token. */
  onChainBlueprintHash: string;
  metadataUri: string;
  metadata: {
    name?: string;
    description?: string;
    attributes?: CertificateAttribute[];
  } | null;
}

export interface CredentialVerdict {
  ok: boolean;
  checks: CredentialCheck[];
  level: string;
  /** First failure, for the blocked event. */
  reason?: string;
}

function attribute(
  attributes: readonly CertificateAttribute[] | undefined,
  name: string,
): string | undefined {
  const match = attributes?.find((a) => a.trait_type === name);
  return match === undefined ? undefined : String(match.value);
}

/**
 * A score attribute is acceptable only in threshold form (">= 85").
 * A bare number means the exact score was published, which is precisely what
 * the zero-knowledge path exists to avoid.
 */
function thresholdFrom(score: string | undefined): number | null {
  const match = /^>=\s*(\d+)$/.exec(score?.trim() ?? '');
  return match?.[1] ? Number(match[1]) : null;
}

export function verifyCredential(
  credential: FetchedCredential,
  claimant: string,
): CredentialVerdict {
  const checks: CredentialCheck[] = [];
  const attributes = credential.metadata?.attributes;
  const level = levelOf(attributes);

  const add = (name: string, ok: boolean, detail: string) => {
    checks.push({ name, ok, detail });
    return ok;
  };

  add(
    'Ownership',
    credential.owner.toLowerCase() === claimant.toLowerCase(),
    `Token #${credential.tokenId} is held by ${credential.owner}`,
  );

  const metadataHash = attribute(attributes, 'Blueprint Hash');
  add(
    'Metadata binding',
    Boolean(metadataHash) &&
      metadataHash!.toLowerCase() === credential.onChainBlueprintHash.toLowerCase(),
    metadataHash
      ? `Document blueprint hash matches the on-chain value`
      : 'Metadata carries no blueprint hash',
  );

  // A mock proof is forgeable by construction. Paying a dividend against one
  // would mean the money is the only thing in the loop that is real.
  const backend = attribute(attributes, 'Proof Backend');
  add(
    'Cryptographic backing',
    backend !== undefined && backend !== 'mock',
    backend === undefined
      ? 'No proof backend recorded — cannot tell a real proof from a simulated one'
      : backend === 'mock'
        ? 'Credential was issued against a SIMULATED proof'
        : `Backed by a real ${backend} proof`,
  );

  const circuit = attribute(attributes, 'Proof Circuit');
  add(
    'Circuit',
    circuit === CIRCUIT_ID,
    circuit ? `Proven under ${circuit}` : 'No circuit recorded',
  );

  const rulePack = attribute(attributes, 'Rule Pack');
  add(
    'Rule pack',
    Boolean(rulePack) && RECOGNISED_RULE_PACKS.some((pattern) => pattern.test(rulePack!)),
    rulePack ? `Judged under rule pack ${rulePack}` : 'No rule pack recorded',
  );

  const threshold = thresholdFrom(attribute(attributes, 'Score'));
  add(
    'Threshold cleared',
    threshold !== null && threshold >= DEFAULT_THRESHOLD,
    threshold === null
      ? 'Score is not in threshold form'
      : `Cleared ${threshold}, agent requires ${DEFAULT_THRESHOLD}`,
  );

  // The privacy claim, checked over the published bytes rather than asserted.
  const published = JSON.stringify(credential.metadata ?? {});
  const leaked = DISCLOSURE_FORBIDDEN.filter((name) =>
    attributes?.some((a) => a.trait_type === name),
  );
  const exactScore = threshold === null && attribute(attributes, 'Score') !== undefined;
  add(
    'Design not disclosed',
    leaked.length === 0 && !exactScore && !/"graphDigest"/i.test(published),
    leaked.length > 0
      ? `Document publishes ${leaked.join(', ')}`
      : exactScore
        ? 'Document publishes an exact score'
        : 'No score, PUE, layout or digest in the published document',
  );

  const failed = checks.find((check) => !check.ok);
  return { ok: !failed, checks, level, reason: failed?.detail };
}
