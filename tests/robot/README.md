# Robot Framework suites

Black-box checks that run over HTTP against a **running server**, complementing
the vitest suites (which test modules in isolation) and Playwright (`e2e/`,
which drives the browser). These exist for the contracts that only mean anything
once something is actually serving them.

## Requirements

Robot Framework 7.4.2 with `RequestsLibrary` and `robotframework-browser`.
Note that `SeleniumLibrary` is **not** installed — do not add suites that need it.

```
robot --version    # Robot Framework 7.4.2 (Python 3.14.x)
```

The keyword libraries next to each suite use the Python standard library only,
so no `pip install` is needed beyond the above.

## Running

Start the app, then point the suite at it. Any free port works; the suites
default to `http://127.0.0.1:3111`.

```bash
# 1. Start the app
npm run dev -- --port 3111

# 2. Wait for it to answer (in another shell)
until curl -sf http://127.0.0.1:3111/api/health > /dev/null; do sleep 1; done

# 3. Run every suite
robot --outputdir /tmp/robot --variable BASE_URL:http://127.0.0.1:3111 tests/robot

# ...or just one
robot --outputdir /tmp/robot-webmcp --variable BASE_URL:http://127.0.0.1:3111 tests/robot/webmcp
```

A production build works the same way:

```bash
npm run build:next && npm run start -- --port 3111
```

Results land in `--outputdir`: `report.html` for the summary, `log.html` for
per-keyword detail.

### Useful flags

```bash
robot --include disclosure ...        # only the disclosure tests
robot --variable BASE_URL:https://datacenter-building-simulator.dennisleehappy.org ...
```

Pointing `BASE_URL` at a deployed environment is supported, but a deployment
older than the branch under test will not have the routes the suite asserts on —
a 404 there is a stale deployment, not a regression.

## Suites

### `webmcp/`

The WebMCP tool manifest served at `/api/webmcp/manifest`
(see `docs/WEBMCP.md`).

The tools themselves only exist inside a WebMCP-capable browser sitting on the
builder page, which makes them awkward to assert against directly. The manifest
route serves the same catalog, derived from the same definitions, so this suite
can check the two things that actually break in the field:

- **The agent-facing surface is usable.** Every tool has a snake_case name, a
  description long enough for a model to act on, and an object input schema with
  every property documented. Tool names are pinned to an expected list, because
  a rename breaks every agent that learned the page.
- **The disclosure gate holds.** No disclosure-gated key name appears anywhere in
  the document, at any depth — with one allowlisted exception, `place_block`'s
  inbound `position`. That exemption is the point rather than a loophole:
  coordinates travel *in*, as an argument the agent itself supplied, and never
  back out. `Coordinates Appear Only As An Inbound Parameter` asserts the
  exemption is the whole story by enumerating every coordinate-shaped key in the
  manifest and requiring the set to match exactly.

Tags: `smoke`, `contract`, `disclosure`.

#### `webmcp/browser.robot`

The same tools, exercised where they actually live: registered by the builder
page inside a real (Playwright-driven) Chromium, executed against the live
Zustand store. Where `manifest.robot` checks the catalog the server
*describes*, this suite checks the catalog the page *delivers*:

- **Registration happens.** No shipping browser exposes `modelContext`, so a
  JS-extension keyword (`WebMcpStub.js`) installs an init script before
  navigation whose stub records `registerTool` calls (and honours the abort
  signal, so React strict-mode remounts in dev do not double-count). The
  `data-testid="webmcp-badge"` chip must appear reading "6 WebMCP tools
  exposed", and the captured registrations must be exactly the pinned tool
  list, each with a description and an object `inputSchema`.
- **Execution drives the live app.** `place_block` returns `ok: true` with an
  `instanceId`, and a `get_build_snapshot` taken through the same surface
  counts one more block than before the call.
- **The disclosure gate holds on live payloads.** The `place_block` result
  echoes no coordinate-shaped key even though the tool chose a cell, and the
  `score_build` result contains none of the disclosure-gated key names (nor
  any `x,y,z`-shaped cell key) at any depth — including inside the serialized
  `content[0].text` copy of the payload.

Needs the Playwright browsers that `robotframework-browser` drives; a one-time
`rfbrowser init chromium` downloads them. Same server assumption and
`${BASE_URL}` convention as `manifest.robot`; note the suite setup waits up to
three minutes for the first load, because dev compiles `/build/free` on the
first request. The placement tests are ordered (the snapshot test reads the
count captured before the placement), so run the suite as a whole.

Tags: `smoke`, `contract`, `disclosure`.

## Adding a suite

- Put it in `tests/robot/<area>/`, with any Python keyword library beside it.
- Take the server address from `${BASE_URL}` with a sensible default, so the
  suite runs against dev, a production build, or a deployment unchanged.
- Standard library only in keyword libraries. New pip dependencies need a
  discussion first — CI installs exactly what is listed above.
