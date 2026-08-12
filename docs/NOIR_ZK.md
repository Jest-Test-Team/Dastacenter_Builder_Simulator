# Noir ZK threshold proofs

Prove a data center design is top-tier without disclosing the design. This is the prover the
app actually uses. For why it is not Midnight, see [MIDNIGHT_ZK.md](./MIDNIGHT_ZK.md).

## What is proven

`circuits/noir/src/main.nr` proves exactly one sentence:

> I know a facility design whose knowledge-graph digest is D, which rule pack V scored at or
> above threshold T.

| Public — the verifier learns this | Private — the verifier learns nothing |
|---|---|
| A blinded commitment to the graph digest | The graph digest, and so the entire design |
| The rule pack version | The exact score — only that it cleared the bar |
| The threshold that was cleared (default 85) | PUE, layout, rack counts, cooling topology, every asset and edge |

The commitment is a **public output of the circuit**, not an input. A prover therefore cannot
publish a commitment that disagrees with the witness it proved about — the verifier reads the
value the circuit itself derived.

The digest is a 256-bit SHA-256 output and BN254's field is 254 bits, so it is carried as two
128-bit halves rather than truncated. Truncating would silently weaken the binding.

## What is *not* proven

The circuit does not verify that the score was computed honestly, or that the digest describes
a well-formed build. It cannot: re-running the rule pack inside a circuit would mean ingesting
the whole private build, which defeats the purpose. Those properties are attested by the
scoring service that produces the witness. This boundary is stated here rather than left for a
reader to discover.

## Scale

`DEFAULT_THRESHOLD` is 85 and the witness carries `report.score`, the **0–100** rating shown as
SCORE on the result page. These must stay on one scale. An earlier version compared 85 against
`competitionScore`, which is 0–1000 — a bar every scoring build cleared by a factor of ten, so
the proof was true but vacuous.

## Measured

On an M-series laptop, via `POST /api/zk/prove`:

| | |
|---|---|
| Execute witness | ~90 ms |
| Generate proof | ~1.4 s warm (~30 s on the first call, compiling WASM) |
| Verify | ~0.4 s |
| Proof size | 16 KB |

Fast enough to sit inside a live demo, which the Midnight path was not.

## Toolchain

Versions are **pinned exactly**, not caret-ranged. `@aztec/bb.js` and `@noir-lang/noir_js` must
agree on the ACIR format; a silent minor upgrade of either is precisely how the Midnight path
broke.

| | |
|---|---|
| `nargo` | 1.0.0-beta.20 |
| `@noir-lang/noir_js` | 1.0.0-beta.20 |
| `@aztec/bb.js` | 4.2.0 |

bb.js 5.x rejects beta.20's ACIR with `error converting into field Circuit::opcodes`. If you
upgrade one, upgrade all three together and re-run `tests/unit/noir-prover.test.ts`.

```sh
npm run zk:noir:compile     # nargo compile -> circuits/noir/target/
```

`circuits/noir/target/` is committed, so a checkout can prove without nargo installed. Only
recompiling needs it.

## Runtime constraints

bb.js ships a multi-megabyte WASM module and needs Node. Two consequences:

- Both libraries and the circuit are loaded **lazily**, inside the call. A static import drags
  the WASM into the edge bundle and breaks the Cloudflare build.
- They are listed in `serverExternalPackages` in `next.config.js`. Without that, Next rewrites
  the `.wasm` to a `/_next/static/...` asset URL and the loader fails server-side with
  `Failed to parse URL from /_next/static/media/noirc_abi_wasm_bg.*.wasm`.
- **Real proving cannot run on Cloudflare Workers.** `/api/zk/prove` needs a Node host. On
  Workers, `getProver()` falls through to the mock, which is refused in production unless
  `ZK_ALLOW_MOCK=true`.

## Prover selection

`getProver()` picks, in order:

1. `MidnightProver` if `MIDNIGHT_PROOF_SERVER_URL` is set — currently throws a clear error
   explaining the version gap rather than making calls that cannot succeed.
2. `NoirProver` when running under Node. This is the default.
3. `MockProver`, which is forgeable and refused in production unless `ZK_ALLOW_MOCK=true`.

Set `ZK_NOIR=false` to skip Noir — the test suite does this so wiring tests stay deterministic
and fast.

## Honesty guarantees

A mock proof must never read as a real one:

- the proving console prints `MOCK PROVER — proof is simulated and forgeable` in red, and names
  Noir when a genuine proof was produced;
- certificate metadata drops the "proven in zero knowledge" wording for a mock proof and
  carries a machine-readable `Proof Backend` attribute. That document is published to a public
  chain forever, so the claim in it has to be true.

## Verification

`tests/unit/noir-prover.test.ts` runs against the real prover — no stubs. It asserts a proof
verifies, that the score and digest never appear in the public statement, that blinding makes
the same build commit differently each time, and that four separate attacks fail: a
below-threshold build, an inflated threshold claim, a swapped rule pack, and tampered proof
bytes.

```sh
npx vitest run tests/unit/noir-prover.test.ts
```
