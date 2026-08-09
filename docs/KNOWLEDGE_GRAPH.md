# Facility Knowledge Graph

The builder derives a typed knowledge graph from every build. Open a build and select **Graph**.

## Why a graph

The scoring engine (`src/lib/scoring/engine.ts`) counts blocks and produces a number. It can tell you
the score is 62; it can never tell you *which* asset chain caused it. The questions operators actually
ask are traversals across planes that were never connected:

- Which racks go dark if UPS-2 fails?
- What cools rack 14, and is there more than one such unit?
- Which physical asset caused this compliance issue, and where does it sit?

Each needs at least two hops. That is the test a graph has to pass to earn its maintenance cost, and
these pass it. Single-hop lookups stayed in the store where they belong.

## The pipeline

`buildKnowledgeGraph(state)` in `src/lib/kg/pipeline.ts` runs extract → gate → fuse → index.
The order is not negotiable: the gate runs **before** fusion, because merging two nodes unions their
edge sets, so one bad edge admitted early becomes many bad edges afterwards.

| Stage | Module | What it does |
|---|---|---|
| 2 Representation | `types.ts` | Property graph as typed edges. Provenance on every node and edge from the first line. |
| 3 Ontology | `ontology.ts` | 12 entity types, 24 relations with domain/range, 4 event types, 12 competency questions. |
| 4-6 Extraction | `extract/*.ts` | Deterministic mapping from `BuildState`. No model — the source already has a schema. |
| 7 Quality gate | `gate.ts` | Domain/range validation, dangling refs, missing provenance. Rejects; never repairs. |
| 8 Fusion | `fuse.ts` | Blocking → layered matching → reversible merge. |
| 9 Serving | `serve.ts`, `explain.ts` | k-hop, paths, impact closure, triple serialization, template explanations. |

## The ontology

`src/lib/kg/ontology.ts` is the single source of truth. Nothing downstream may invent a type.

**Entities** — `Build, Space, Asset, AssetType, NetworkDevice, Port, Link, SecurityZone,
SegmentationRule, Intent, PolicySetting, Standard`

**Relations** — `PART_OF, CONTAINS, LOCATED_IN, INSTANCE_OF, POWERS, COOLS, ADJACENT_TO, REALIZED_BY,
HOSTED_IN, HAS_PORT, TERMINATES, CONTROLS, IN_ZONE, APPLIES_FROM, APPLIES_TO, ORIGINATES_AT,
TERMINATES_AT, SCORED, RAISED_IN, VIOLATES, CITES_STANDARD, AFFECTS, DEPLOYS, SATISFIES`

**Events** — `ScoreEvaluated, IssueRaised, LinkFailed, IntentDeployed`

Every relation declares a domain and a range, so `checkEdgeTypes` can reject a malformed edge before
it reaches the graph. That single validation is what keeps hallucinated structure out.

### Modeling decisions

Recorded in `MODELING_DECISIONS` next to the schema, each with its reasoning. The four that mattered:

1. **Site/Building/Floor/Room/Hall/Rack are one `Space` type with a `kind` attribute.** They are never
   queried apart, and the rule is to merge types that are always queried together.
2. **`Link` is an entity, not an edge property.** It has its own lifecycle — it carries VLANs, belongs
   to a redundancy group, fails and recovers independently — and a `LinkFailed` event needs something
   to point at. The cost is that device-to-device paths run `Device → Port → Link → Port → Device`.
3. **Issues are events, not asset attributes.** One issue can implicate several assets; flattening it
   loses which assets it tied together, and loses the time anchor.
4. **Flat, no subclassing.** None of the twelve competency questions span a parent type.

## Extraction

`BuildState` is structured data, so extraction is deterministic mapping — the D2R approach — not NLP.
Running a model over data that already has a schema would be wasteful and, more importantly, would make
the graph non-reproducible, which the ZK digest cannot tolerate.

Two extractors *derive* rather than read, and both say so in their provenance:

- **`POWERS`** follows the distribution chain (`utility_feed → transformer → switchgear → ups/generator
  → pdu/busway → consumers`), feeding each asset from the nearest upstream tier. Where a tier is absent
  the search reaches further upstream.
- **`COOLS`** links heat-removing assets (negative `heatLoad` in the registry, so a new cooling block
  works without code changes) to heat producers within `COOLING_RADIUS_CELLS`.

Derived edges carry `medium`/`low` confidence and a `derivedFrom` justification. Proximity alone is
co-occurrence, not an assertion, so an edge is only emitted when the declared ports make the relation
physically possible.

Relations seen in the data but not modelled go on `candidateRelations` for review — currently
`AssetType → Standard`, which the block registry asserts but the ontology does not yet cover. They are
never forced into an approximately-correct existing type.

## Fusion

Blocking (type + kind/level + shared tokens) → layered matching → deterministic merge policy.

The structure layer is what naive dedup misses: two rooms both called "Operations West" on different
floors score 1.0 on name similarity and 0.0 on neighbourhood, and stay separate. Conversely, identical
bounds settle a match outright — two spaces cannot occupy the same volume, and bounds include the y
origin, so same-shaped rooms on different floors never collide.

This is not hypothetical. `createDefaultNetwork()` ships `hall-a` and `room-network` as invisible
duplicates of `main-floor-hall` and `main-floor-west`, "solved" by `visible: false`. Their *names*
share nothing — "Data Hall A (legacy)" versus "Main Concourse" — so string similarity alone would never
have merged them. Fusion collapses both, unions their aliases, and records `mergedFrom` so `unmerge()`
restores the graph exactly.

Merges are reversible by design: an erroneous merge silently fuses two entities' whole edge sets, which
is far more damaging than a missed one. Anything in the ambiguous middle band goes to a review queue
rather than being guessed.

## Serving

- `kHop(graph, id, k)` — neighbourhood, capped at 2 hops.
- `findPath(graph, a, b, { relations })` — for multi-hop questions the path *is* the answer skeleton.
- `impactOf(graph, id)` — forward closure over dependency relations only. Adjacency is not failure.
- `serializeSubgraph` — `(head)-[REL {source, confidence}]-> (tail)`, grouped by head, deduplicated per
  head, with colliding names disambiguated by id so two racks never serialize as one.
- `explain.ts` — template sentences, no model.

## Verification

```sh
npm test -- tests/unit/kg tests/integration/kg   # 160 unit + 95 integration
npx playwright test e2e/graph.spec.ts            # 7 e2e
npm run typecheck
```

`tests/integration/kg-competency.test.ts` answers all twelve competency questions by real traversal.
`tests/integration/kg-score-consistency.test.ts` holds the graph and the scoring engine together — if
they ever disagree, that fails rather than surfacing as a confidently wrong answer in the UI.

## Related

- [MIDNIGHT_ZK.md](MIDNIGHT_ZK.md) — the graph digest and the threshold proof built on it.
- [NETWORK_SDN.md](NETWORK_SDN.md) — the network plane this graph reads from.
- [GRAPH_ENGINEERING.md](GRAPH_ENGINEERING.md) — the task-graph half of the discipline.
