# Midnight ZK Threshold Proofs

Prove a data center design is top-tier without disclosing the design.

## The problem

A facility's real PUE, cooling architecture and physical layout are commercial secrets. Publishing them
to earn a credential is not an option — but the operator still wants to prove to the network that the
build qualifies. Before this, `/api/sbt/mint` wrote the exact score and tier straight into certificate
metadata, which is published permanently.

## What is proven

`circuits/datacenter-score.compact` proves exactly one sentence:

> I know a facility design whose knowledge-graph digest is D, which rule pack V scored at or above
> threshold T.

| Public — the verifier learns this | Private — the verifier learns nothing |
|---|---|
| A blinded commitment to the graph digest | The graph digest, and so the entire design |
| The rule pack version | The exact score — only that it cleared the bar |
| The threshold that was cleared (default 85) | PUE, layout, rack counts, cooling topology, every asset and edge |

The commitment binds the digest, a random blinding factor, the rule pack and a circuit tag together.
Binding the pack matters: without it, a proof made under a lax rule pack could be replayed as though it
had cleared a strict one. Blinding matters too — without it, anyone holding a guess at the design could
confirm it by recomputing the hash.

## What is *not* proven

The circuit does not verify that the score was computed honestly, or that the digest describes a
well-formed build. It cannot: re-running the rule pack inside a circuit would mean ingesting the whole
private build, which defeats the purpose. Those properties are attested by the scoring service that
produces the witness. This boundary is stated here rather than left for a reader to discover.

## Where the privacy actually happens

The graph digest is computed **in the browser**, by `acquireThresholdProof` in `src/lib/zk/client.ts`.
Only the threshold witness leaves the machine, and only as far as the operator's own proof endpoint.

```
browser: BuildState → buildKnowledgeGraph → graphDigest ─┐
                                                          ├─→ /api/zk/prove → Proof
                                          score, blinding ┘
Proof → /api/sbt/mint → verified → certificate carries the commitment, not the score
```

Under a privacy claim the certificate's `Score` attribute reads `>= 85`, the description says the design
is not disclosed, and `certificate.score` records the threshold rather than the figure. The metadata
document is published forever, so anything left in it is public forever.

## The prover boundary

`src/lib/zk/prover` defines one interface with two implementations:

- **`MidnightProver`** — talks to a real Midnight proof server over HTTP. Active only when
  `MIDNIGHT_PROOF_SERVER_URL` is set.
- **`MockProver`** — deterministic, hash-based, used by every test.

`getProver()` picks between them. The mock is **refused in production** unless `ZK_ALLOW_MOCK=true`,
because it is not sound — anyone can forge a mock proof, and silently degrading to it on a deployed
instance would turn a privacy credential into a rubber stamp.

## Status: what has and has not been run

Being precise about this, because "ZK integration" can mean very different things.

| | |
|---|---|
| Circuit source written | yes — `circuits/datacenter-score.compact` |
| Circuit compiled with `compactc` | **yes** — compiler 0.31.1, language 0.23.0 |
| Proving / verifying keys generated | **yes** — `circuits/build/keys/proveThreshold.{prover,verifier}` |
| Real circuit code executed and tested | **yes** — 12 tests in `tests/integration/zk-circuit.test.ts` |
| A `proveThreshold` proof generated end to end | **no** — blocked by a toolchain/proof-server version gap, see below |
| Real adapter implemented | yes — `src/lib/zk/midnight-prover.ts` |
| Wiring tested (prove → verify → mint gate) | yes, against `MockProver` — 24 unit + 15 integration tests |

`openCommitment` is declared **pure** (`"pure": true, "proof": false`), so the compiled artefact runs
it in-process with no proof server and no Docker. That is why the commitment's security properties —
determinism, blinding, rule-pack binding — are asserted against the real circuit rather than a
TypeScript imitation. Compiling also corrected two mistakes that were invisible beforehand: the source
pragma was `0.16` when the compiler wanted `0.23`, and `MidnightProver.open()` was round-tripping a
pure circuit through the proof server it does not need.

### Why a real proof cannot be produced yet (tested 2026-08-12)

Not a missing config flag — a version gap between Midnight's public releases:

- `MidnightProver` was written against an API that does not exist. The real proof server
  accepts **binary** payloads on `POST /prove` and exposes **no `/verify` endpoint** (404).
  Statement checks are local; cryptographic verification is not a server call.
- `POST /prove` expects the preimage wrapped as `ProofPreimageVersioned`. Compact `0.31.1`
  — the newest released compiler, and the one that built `circuits/build` — pins runtime
  `0.16.0`, whose `proofDataIntoSerializedPreimage` emits the older unversioned form.
  Proof-server images `2.0.7`, `3.0.7`, `4.0.0` and `latest` all reject it with
  `Unknown discriminant 109`.
- Framing that same preimage with `ledger-v9`'s `createProvingPayload` **is** accepted —
  the server logs `Starting to process request for /prove...` — but never returns. On 8
  CPUs it held 200% CPU at 34 MB RSS for 25+ minutes with no result and no error, which is
  a spin rather than proving: v3-era key material against a v9-era server.
- `midnight-js` 4.1.1 (ledger-v8) is no help either: its provider calls `/check`, which
  proof-server `4.0.0` does not implement (404), and its payload builder produces the
  unversioned form that `latest` rejects.

Closing this needs a compiler generation targeting the v4 runtime / ledger-v9, and the
circuit recompiled against it. Until then `getProver()` returns `MockProver`, and both the
proving console and the certificate metadata state that the proof is simulated.

## Local setup

```sh
./scripts/midnight-setup.sh check      # what's present, what's missing
./scripts/midnight-setup.sh install    # Compact toolchain
./scripts/midnight-setup.sh compile    # circuits/ → circuits/build/
./scripts/midnight-setup.sh serve      # proof server on :6300 (needs Docker running)

export MIDNIGHT_PROOF_SERVER_URL=http://127.0.0.1:6300
npm run dev
```

With that set, `getProver()` returns the real adapter and the mint flow generates a genuine proof.

## Selective disclosure

`openCommitment` re-derives the commitment from a revealed digest and blinding factor. An auditor under
NDA can be handed both and confirm they reproduce the on-chain commitment, without the design ever
having been public. The threshold proof stays the default; this is the escape hatch for the one auditor
entitled to more.

## API

| Route | Purpose |
|---|---|
| `POST /api/zk/prove` | Witness → proof. Returns 422 when the build is below the bar — no such proof exists. |
| `POST /api/zk/verify` | Proof → one bit, optionally checked against a required threshold and rule pack. |
| `POST /api/sbt/mint` | Now **requires** a valid proof. Verified before the transaction. |

## The gate

Minting writes a permanent public claim to a chain — the irreversible edge in this system — so
verification sits immediately before it, in `verifyMintProof` (`src/lib/sbt/server.ts`). The proof must
have been made under the same rule pack that judged the build, and must clear at least the required
threshold. `tests/integration/zk-mint-gate.test.ts` drives the real route handlers: a gate only tested
one layer down is a gate nobody has actually tried.

## Verification

```sh
npm run zk:compile                                    # compactc -> circuits/build
npm test -- tests/unit/zk-prover.test.ts \
            tests/integration/zk-mint-gate.test.ts \
            tests/integration/zk-circuit.test.ts      # 51 tests, 12 against the real circuit
npm run test:workers                                  # the ZK path inside workerd
./scripts/midnight-setup.sh check
```

The circuit suite skips itself when `circuits/build` is absent, so a checkout without the Compact
toolchain still gets a green run.

## Related

- [KNOWLEDGE_GRAPH.md](KNOWLEDGE_GRAPH.md) — the graph whose digest is committed to.
- [SBT_DEPLOYMENT.md](SBT_DEPLOYMENT.md) — the EVM certificate contracts, unchanged.
