# Graph Engineering: the task-graph half

[KNOWLEDGE_GRAPH.md](KNOWLEDGE_GRAPH.md) covers what the system *remembers*. This covers how work
*flows* through it — the same discipline applied to this repo's own pipelines and to the agents that
work on it.

Nodes are jobs. An arrow exists only when a job needs another job's result before it can start.

## Fake edges in this repo's CI

The first optimization costs nothing: for every "and then", ask whether the next job actually reads the
previous job's output. `.github/workflows/ci.yml` currently runs one job with a sequential body:

```
Install → Lint → Typecheck → Test → Build → Bundle size
```

Three of those arrows are fake. `npm run lint` produces nothing `npm run typecheck` consumes.
`typecheck` produces nothing `npm test` consumes — vitest does its own transpilation and never reads
`tsc` output. `npm run build` reads none of the three. The only real dependencies are `Install → *`
and `Build → Bundle size`. The honest shape is:

```
                  ┌─ Lint ──────┐
Install ──────────┼─ Typecheck ─┼──→ (gate)
                  ├─ Test ──────┤
                  └─ Build ─→ Bundle size
```

Four parallel branches instead of a five-deep chain. Wall-clock time drops to the longest branch
(`Build`) rather than the sum. This is written down rather than applied because changing CI topology is
the user's call, not a side effect of a docs commit — but the analysis is the point: most hand-built
pipelines contain two or three fake edges, and this one contained three.

`score-integrity.yml` is correctly separate already: it shares no data with `ci.yml`, so it is a
genuinely independent root, not a fake edge waiting to be cut.

## The diamond, applied to review here

```
        ┌─ correctness ─┐
plan ───┼─ privacy ─────┼──→ verify (separate context) ─→ merge ─→ result
        └─ performance ─┘
```

Split into independent angles, run them in parallel, **verify in a separate context**, merge survivors.
The verification node is non-negotiable: a model grading its own work in its own context misses most of
its own mistakes. Give each verifier a different question — is it correct? is it current? is the source
real? — because diverse skeptics catch what identical ones cannot.

Concretely for this codebase, the angles that genuinely do not read each other's output:

- **Correctness** — does the ontology validate, does the graph agree with the scoring engine?
- **Privacy** — does anything leak the exact score or the digest into published metadata?
- **Performance** — does fusion stay sub-quadratic as builds grow?

The merge has one owner. Uncoordinated agents amplified each other's errors 17.2× in the DeepMind × MIT
study; a single coordinator owning the merge cut that to 4.4×.

## The stop rule

From "Towards a Science of Scaling Agent Systems" (180 controlled configurations): coordinated teams beat
a single agent by ~80% on work that splits into independent pieces — and **every** multi-agent
configuration lost on sequential work where each step needs the full picture, degrading 39-70%.

The decision procedure is three questions:

1. Where does the work split into pieces that never read each other's results?
2. Split only that. Everything sequential stays with one agent.
3. Never let findings merge without one owner of the merge.

This work is a live example of the rule cutting *against* fan-out. The knowledge-graph build was
strictly sequential — the ontology shapes the extractors, the extractors shape the gate, the gate shapes
fusion, fusion shapes the digest, the digest shapes the circuit. Every stage needed the full picture of
the one before it. Splitting it across parallel agents would have been the losing configuration the
study describes, so it was built by one. More agents is not a strategy; the shape of the work decides.

## The human gate

The human is a node. Route every irreversible edge — send, publish, refund, delete, deploy, **mint** —
through explicit approval. The placement rule is to put the gate where a mistake is expensive to undo,
not on every step: a gate on everything makes the human the bottleneck, a gate on nothing means nobody
is watching.

In this repo the irreversible edges are exactly two:

| Edge | Gate |
|---|---|
| Minting an SBT | Wallet signature, **plus** ZK proof verification in `verifyMintProof` before the transaction |
| Deploying | Vercel/Cloudflare deploy approval |

Everything upstream — scoring, graph extraction, fusion, proof *generation* — is reversible and
ungated. Fusion in particular is deliberately built to be undone: `unmerge()` exists so that a wrong
merge is recoverable rather than requiring a human to approve every merge.

Judge the system on numbers that cannot argue back — tests that ran, money that landed — never on its
own self-reports. That is why [MIDNIGHT_ZK.md](MIDNIGHT_ZK.md) carries an explicit table of what has and
has not actually been executed, rather than a claim of completeness.

## Guardrails

Four caps that keep a graph from becoming an expensive accident:

1. **Every loop gets a maximum number of rounds.** In this codebase: `kHop` is capped at `MAX_HOPS = 2`,
   `serializeSubgraph` at `maxLines`, `impactOf` tracks a visited set so a cyclic power chain terminates.
2. **One writer per file.** No two jobs mutate the same artifact.
3. **The routing lives in written steps.** The model fills the jobs, not the plan — which is why the
   implementation plan was written and approved before any code, and why the ontology was approved
   before any extractor.
4. **A hard cap on how many agents can spawn.**

## Credits

The task-graph material draws on Google DeepMind × MIT's
["Towards a Science of Scaling Agent Systems"](https://research.google/blog/towards-a-science-of-scaling-agent-systems-when-and-why-agent-systems-work/)
and Anthropic's published multi-agent engineering work. The knowledge-graph half is distilled from
Southeast University's graduate Knowledge Graph course (Prof. Peng Wang),
[npubird/KnowledgeGraphCourse](https://github.com/npubird/KnowledgeGraphCourse).
