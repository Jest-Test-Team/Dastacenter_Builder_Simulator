/**
 * Verbatim excerpts of the circuits the privacy track teaches.
 *
 * The lesson content quotes real, shipping source rather than a simplified
 * imitation — that is the whole point of teaching Compact from this repo. The
 * excerpts are duplicated here because `circuits/*.compact` cannot be imported
 * from the app bundle (no loader, and the route must build for workerd), so
 * `tests/unit/compact-excerpts.test.ts` re-reads the real files and fails if any
 * excerpt has drifted from its source.
 */

export const PRAGMA = `pragma language_version 0.23;

import CompactStandardLibrary;
`;

export const LEDGER = `// The rule pack that produced the score. Public so a verifier can reject a
// proof made under an older, laxer pack.
export ledger rulePackVersion: Bytes<32>;

// The threshold the score must clear. Public: a claim of "≥ 85" is meaningless
// if the bar itself is hidden.
export ledger threshold: Uint<16>;

// Commitment to the private graph digest, published when a proof is accepted so
// the same design cannot be re-proven under a different claim.
export ledger commitment: Bytes<32>;
`;

export const REGISTRY = `// How many certificates have been minted — doubles as the next token id.
export ledger tokenCounter: Counter;

// commitment -> the threshold that certificate cleared.
export ledger certifiedThreshold: Map<Bytes<32>, Uint<16>>;

// commitment -> the rule pack it was certified under.
export ledger certifiedRulePack: Map<Bytes<32>, Bytes<32>>;
`;

export const WITNESSES = `// The prover's secret inputs, supplied by the local wallet/scoring service and
// never transmitted.
witness graphDigest(): Bytes<32>;
witness competitionScore(): Uint<16>;
witness blindingFactor(): Bytes<32>;
`;

export const PROVE_THRESHOLD = `export circuit proveThreshold(
  claimedThreshold: Uint<16>,
  packVersion: Bytes<32>,
): [] {
  const digest = graphDigest();
  const achieved = competitionScore();
  const blinding = blindingFactor();

  // The whole claim. If the score is below the bar, no proof exists.
  assert(achieved >= claimedThreshold, "score below threshold");

  // Bind the commitment to the rule pack and the threshold as well as the
  // digest. Without this, a proof made against a lax pack could be replayed as
  // though it had cleared a strict one.
  const bound = persistentHash<Vector<4, Bytes<32>>>([
    digest,
    blinding,
    packVersion,
    pad(32, "datacenter-score/v1"),
  ]);

  commitment = disclose(bound);
  threshold = disclose(claimedThreshold);
  rulePackVersion = disclose(packVersion);
}
`;

export const MINT_CERTIFICATE = `export circuit mintCertificate(
  claimedThreshold: Uint<16>,
  packVersion: Bytes<32>,
): [] {
  const digest = graphDigest();
  const achieved = competitionScore();
  const blinding = blindingFactor();

  assert(achieved >= claimedThreshold, "score below threshold");

  const bound = persistentHash<Vector<4, Bytes<32>>>([
    digest,
    blinding,
    packVersion,
    pad(32, "datacenter-score/v1"),
  ]);

  const boundCommitment = disclose(bound);
  const boundThreshold = disclose(claimedThreshold);
  const boundPack = disclose(packVersion);

  // Publish the singleton view (kept for compatibility with proveThreshold).
  commitment = boundCommitment;
  threshold = boundThreshold;
  rulePackVersion = boundPack;

  // Record the certificate in the public registry.
  if (!certifiedThreshold.member(disclose(boundCommitment))) {
    tokenCounter.increment(1);
  }
  certifiedThreshold.insert(boundCommitment, boundThreshold);
  certifiedRulePack.insert(boundCommitment, boundPack);
}
`;

export const OPEN_COMMITMENT = `export circuit openCommitment(
  digest: Bytes<32>,
  blinding: Bytes<32>,
  packVersion: Bytes<32>,
): Bytes<32> {
  return persistentHash<Vector<4, Bytes<32>>>([
    digest,
    blinding,
    packVersion,
    pad(32, "datacenter-score/v1"),
  ]);
}
`;

export const NOIR_MAIN = `global DOMAIN: Field = 0x6461746163656e7465722d73636f72652f7631; // "datacenter-score/v1"

fn main(
    digest_hi: Field,
    digest_lo: Field,
    blinding_hi: Field,
    blinding_lo: Field,
    score: u32,
    threshold: pub u32,
    rule_pack: pub Field,
) -> pub Field {
    // The whole claim. If the score is below the bar, no proof exists.
    assert(score >= threshold);

    // Bind the commitment to the rule pack and the domain as well as the
    // digest: without it, a proof made under a lax pack could be replayed as
    // though it had cleared a strict one.
    // Returned as a public output rather than taken as an input: the verifier
    // reads the commitment the circuit actually derived, so a prover cannot
    // publish a commitment that does not match the witness it proved about.
    std::hash::pedersen_hash([digest_hi, digest_lo, blinding_hi, blinding_lo, rule_pack, DOMAIN])
`;
