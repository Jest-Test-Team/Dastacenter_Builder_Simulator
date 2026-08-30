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

## Adding a suite

- Put it in `tests/robot/<area>/`, with any Python keyword library beside it.
- Take the server address from `${BASE_URL}` with a sensible default, so the
  suite runs against dev, a production build, or a deployment unchanged.
- Standard library only in keyword libraries. New pip dependencies need a
  discussion first — CI installs exactly what is listed above.
