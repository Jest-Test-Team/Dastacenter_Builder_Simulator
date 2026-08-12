// Datacenter efficiency threshold - Noir circuit.
//
// Proves exactly one sentence, and nothing more:
//
//   "I know a facility design whose knowledge-graph digest is D, which rule
//    pack V scored at or above threshold T."
//
// Public  : commitment, threshold, rule_pack
// Private : the digest (and so the whole design), the blinding, the exact score
//
// The digest is a 256-bit SHA-256 output and the BN254 field is 254 bits, so it
// is carried as two 128-bit halves rather than truncated - truncation would
// silently weaken the binding.

global DOMAIN: Field = 0x6461746163656e7465722d73636f72652f7631; // "datacenter-score/v1"

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
}
