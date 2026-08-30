# WebMCP

The builder page exposes its own actions to the browser's AI agent over
[WebMCP](https://github.com/webmachinelearning/webmcp). With a WebMCP-capable
browser, an agent sitting next to the page can list the block catalog, place and
remove blocks in the live 3D scene, score the build against the Uptime Tier /
TIA-942 / ASHRAE / NFPA rule pack, and read back which rules are failing — while
the page keeps rendering, undo keeps working, and the disclosure gate keeps
holding.

## Why this is not just an API

A REST API would let an agent operate a *copy* of the simulator. WebMCP lets it
operate **the running one**. `place_block` calls the same Zustand action a mouse
click calls, so it inherits `evaluatePlacement`'s bounds, occupancy and inventory
checks; a block the agent adds appears in the same voxel world, counts against
the same scenario inventory, and can be undone with Ctrl+Z. There is no second
implementation of placement to drift out of sync with the one the user sees.

## The tools

| Tool | Wraps | Returns |
| --- | --- | --- |
| `list_block_types` | `getAllBlocks` / `getBlocksByCategory` (`lib/blocks/registry.ts`) | Catalog entries: id, category, name, description, footprint, tags |
| `place_block` | `useBuildStore.placeBlock` → `evaluatePlacement` | `{ ok, instanceId }` or `{ ok: false, reason }` |
| `remove_block` | `useBuildStore.removeBlock` | `{ ok, instanceId, type }` |
| `get_build_snapshot` | `useBuildStore.exportSnapshot` → `gate()` | Floor size, counts by type, instance ids, gated scoring context |
| `score_build` | `score()` (`lib/scoring/engine.ts`) → `gate()` | Per-axis scores, failing rule ids, cert level; tier/PUE/exact score on request |
| `explain_failing_rules` | `score().issues` + `allRules` | Failing rules with severity, standard, axis, hint, related instance ids |

The four read tools — `list_block_types`, `get_build_snapshot`, `score_build`
and `explain_failing_rules` — carry the spec's
`annotations: { readOnlyHint: true }`, so an agent's planner can call them
freely without asking. The write tools omit annotations on purpose: an absent
hint reads as "assume it writes", which is the safe default. Annotations are
hints for the agent, never enforcement — the disclosure gate is what actually
holds.

`place_block` takes an **optional** position. Omit it and the builder calls
`findNearestLegalCell` to drop the block on the nearest legal free cell — which
is usually the right call, because the agent cannot see the layout (see below).
So "add two more UPS units and tell me if that fixes redundancy" is a workable
instruction without the agent ever knowing where anything is.

## What an agent is allowed to know

An agent caller is a third party in exactly the sense `src/lib/ai/disclosure.ts`
means: it is a language model, it keeps transcripts, and it is not the person who
drew the layout. So every read tool projects through the **same disclosure gate**
the in-app AI copilot uses, rather than inventing its own idea of what is safe.

- **Never disclosed, no toggle:** grid coordinates of every block (the layout),
  the knowledge-graph digest, the proof blinding factor, wallet address and
  session identity. The first is the commercially sensitive part of a data
  center design; the middle two are the ZK commitment's preimage, and a
  commitment whose preimage has been handed to a third party is not hiding
  anything.
- **Disclosed by default:** per-axis scores, failing rule ids, block counts by
  category.
- **On explicit request only** (`score_build`'s `include` parameter): uptime
  tier, PUE, exact overall score.
- **Allowlisted identifiers:** block *type* ids (already public in the palette)
  and block *instance* ids (opaque nanoids). Instance ids are the only handle an
  agent can hold to say "remove that one", and they carry no position.

Coordinates travel **inbound only**, as an argument the agent itself supplied.
They are never echoed back, not even on a successful `place_block`. The agent may
place a rack at (4, 0, 9) because it chose to; it may never learn where the racks
already are.

Projections are additive — every field is written by an explicit line in
`projectSnapshot` / `projectScore` / `projectFailingRules`. Nothing spreads a
`BuildState` and deletes keys, because subtractive redaction is how a field added
upstream escapes six months later.

## How a judge verifies it

### 1. Read the manifest — no special browser needed

```
curl -s http://localhost:3000/api/webmcp/manifest | jq
```

Returns the protocol, version, every tool's name / model-facing description /
JSON Schema, and the disclosure contract itself (`disclosure.defaultFields`,
`optionalFields`, `neverDisclosed`) copied straight from the gate.

### 2. See the tools register in a WebMCP browser

Open `/build/free` in one of:

- **Chrome with WebMCP enabled locally**: open
  `chrome://flags/#enable-webmcp-testing`, set it to **Enabled**, restart. The
  origin trial spans Chrome 149 through roughly 156; abort-signal
  unregistration (which the hook relies on for clean unmounts) landed in
  Chrome 153. The current API is `document.modelContext` —
  `navigator.modelContext` was deprecated around Chrome 150 but still ships,
  and the hook checks both, preferring `document`.
- **The ChatGPT desktop app's in-app browser**, which auto-discovers tools
  registered by the top-level page (models GPT-5.6 Sol / Terra; not available
  in Enterprise/Edu workspaces or on mobile).

A chip reading **"6 WebMCP tools exposed"** appears at the bottom-left of the
canvas. It renders *only* when the API is detected, so its presence is the
confirmation. In any other browser the hook is a silent no-op and nothing is
shown.

In the console of a capable browser:

```js
(document.modelContext ?? navigator.modelContext)   // the agent surface
```

### 3. Ask the agent to build something

> "List the block types, then place a UPS, a generator and two server racks, and
> tell me which compliance rules are still failing."

The blocks appear in the 3D scene as they are placed.

## Implementation notes

- `src/lib/webmcp/tools.ts` — tool definitions. Input schemas are **derived**
  from the zod schemas that validate the calls, so the schema an agent reads and
  the validation the call survives cannot disagree.
- `src/lib/webmcp/use-webmcp.ts` — the React hook. Feature-detects
  `document.modelContext ?? navigator.modelContext` (the API moved from
  `Navigator` to `Document`; the `Navigator` form was deprecated around
  Chromium 150 but both are live in the wild), registers with an
  `AbortController` signal and aborts on unmount, and handles both a
  sync-returning `registerTool` and the current spec's promise-returning one —
  a rejecting registration is swallowed, because the "absent API is a silent
  no-op" invariant extends to a registration that fails. Falls back to
  `provideContext({ tools })` where `registerTool` is absent — `provideContext`
  was removed from the spec in March 2026 but is kept as a legacy fallback for
  older browsers — and is a silent no-op when the API is missing. All access is
  inside `useEffect`, so it is safe under SSR on Cloudflare Workers via
  OpenNext.
- `src/components/builder/WebMcpBadge.tsx` — mounts the hook and renders the
  chip. Mounted from `src/app/build/[scenarioId]/page.tsx`, which also serves
  `/build/free`.
- `src/app/api/webmcp/manifest/route.ts` — the manifest route.

## Tests

- `tests/unit/webmcp-tools.test.ts` — manifest contract, the JSON Schema
  derivation, and the disclosure boundary asserted against the *serialized*
  payload (including the `x,y,z` cell-key format, because `byCell`'s keys are
  coordinates even when the word "position" appears nowhere).
- `tests/robot/webmcp/` — the same claims over HTTP against a running server.
  See `tests/robot/README.md`.
