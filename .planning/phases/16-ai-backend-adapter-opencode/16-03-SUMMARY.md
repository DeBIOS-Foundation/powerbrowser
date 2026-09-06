---
phase: 16-ai-backend-adapter-opencode
plan: 03
subsystem: ai-backend
tags: [opencode, mcp, bridge, selection, configuration, gate]

# Dependency graph
requires:
  - phase: 16-ai-backend-adapter-opencode
    provides: [supervised ACP tracer with stage-from-ask gated review (16-01), per-session presets plus mandatory history (16-02)]
provides:
  - Minimal read-only /mcp endpoint (workspace_list, workspace_read) on the gated channel
  - Per-spawn bridge auth via opencode {env:} interpolation plus per-session server entry
  - configuration.toml [ai] backend selection (default off, missing means off) with generator fragment
  - Per-adapter ownership doc (shared versus CLI-owned, 15 verified tool ids)
  - Bridge-plus-selection gate with mandatory live auth proof and STAGED R5 backstop
affects: [phase-17-plus backends (chassis bridge pattern), verify-work UAT (D4 opencode-side round trip)]

# Actuals
actuals:
  tokens: 16000
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns: [per-spawn env injection with scrubbed base, lazy port read at session/new (never eager in onStart), config-file {env:} template plus in-memory per-session entry, deferred READY announce on listening]

key-files:
  created:
    - theia/extensions/backend-opencode/src/node/opencode-mcp-contribution.ts
    - theia/extensions/backend-opencode/src/node/opencode-bridge-env.ts
    - theia/extensions/backend-opencode/opencode.mcp.json
    - docs/ai-opencode-adapter.md
    - scripts/verify-opencode-bridge.mjs
  modified:
    - theia/extensions/backend-opencode/src/node/backend-opencode-backend-module.ts
    - theia/extensions/backend-opencode/src/node/opencode-acp-supervisor.ts
    - theia/extensions/backend-opencode/src/browser/backend-opencode-frontend-module.ts
    - theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts
    - theia/applications/browser/package.json
    - configuration.toml
    - scripts/generate.mjs
    - scripts/lib/config-schema.json
    - docs/REBRANDING.md
    - scripts/verify-platform.sh

key-decisions:
  - "Cookie-header bridge: opencode sends the token as a Cookie header (proven live), so the existing gate admits it with zero auth-surface change"
  - "Per-session server entry over per-child config file: session/new accepts mcpServers live (shape probed on 1.18.25), no XDG reliance, no port race"
  - "Child env carries only the bridge variable; supervisor token name and supervised marker scrubbed (strict reading of the acceptance line)"
  - "Frontend-only selection gating: off skips every bind (D-62); supervisor plus /mcp stay token-gated infrastructure"
  - "opencode-side model-driven tool round trip stays human-UAT (D4): headers, shape, and connected-status proven mechanically, no model spent"

patterns-established:
  - "Bridge proofs compose: header interpolation (opencode mcp list) plus shape acceptance (ACP probe) plus live endpoint (gate) equals the full chain without a model call"
  - "Never read server.address() in onStart: retain the server, read lazily once bound"
  - "Index hygiene under concurrent agents: diff --cached --name-only before every commit, pathspec-commit foreign-staged trees"

requirements-completed: [AI-04, AI-05]

# Coverage metadata
coverage:
  - id: D1
    description: "Token holders read live workspace state over /mcp (GET descriptor plus POST tools/call); anonymous GET plus POST refused 403 with no cookie leak"
    requirement: "AI-05"
    verification:
      - kind: e2e
        ref: "node scripts/verify-opencode-bridge.mjs (live half: auth GET root equals live dir, auth POST returns live bytes, anon 403s)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Backend selection off by default, missing key means off, one manifest edit plus regenerate plus copy-over turns it on"
    requirement: "AI-04"
    verification:
      - kind: unit
        ref: "node scripts/verify-opencode-bridge.mjs (resolveConfig plus emitAiBackend fixtures, fragment and composed-key pins)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Ownership doc states the shared side and names every CLI-owned tool (15 ids verified against opencode 1.18.25 sources)"
    requirement: "AI-05"
    verification:
      - kind: other
        ref: "node scripts/verify-opencode-bridge.mjs (doc coverage: tool ids, model-selection line, fallback line, setup steps, copy check)"
        status: pass
    human_judgment: false
  - id: D4
    description: "End-to-end workspace read driven by a live opencode model through the configured server"
    requirement: "AI-05"
    verification: []
    human_judgment: true
    rationale: "Proven to the HTTP boundary (opencode reports connected; headers and entry shape accepted live) but no model turn was spent calling the tool; needs a human UAT turn in an @OpenCode chat"
  - id: D5
    description: "Concurrent workspace read during an applied write never crashes and returns point-in-time bytes (R5 backstop)"
    requirement: "AI-05"
    verification:
      - kind: e2e
        ref: "node scripts/verify-opencode-bridge.mjs --live-backstop (8 concurrent reads around a mid-flight write, all 200 whole bytes)"
        status: pass
    human_judgment: false

# Metrics
duration: ~70min
completed: 2026-09-06
status: complete
---

# Phase 16 Plan 03: Bridge Plus Selection Summary

**Slice-0 /mcp bridge reading live sidecar state through the token gate with per-spawn auth, plus configuration.toml backend selection defaulting to off, enforced by a live-proof gate**

## Performance

- **Duration:** ~70 min (includes empirical opencode probing plus one env rebuild)
- **Started:** 2026-09-06T07:05:00Z (approx)
- **Completed:** 2026-09-06T08:12:00Z
- **Tasks:** 3 completed
- **Files modified:** 15 (5 created ext/config, 1 doc, 1 gate, 8 modified)

## Accomplishments

- Read-only `/mcp` endpoint (workspace_list, workspace_read) riding the
  token gate with no new auth surface; fail-closed exit 78
- Per-spawn bridge auth: child env carries only `POWERBROWSER_MCP_TOKEN`,
  per-session entry in `session/new`, checked-in template reference-only
- opencode 1.18.25 proven live against the endpoint: `mcp list` reports
  connected using the exact checked-in template shape with per-spawn env
- `[ai] backend` selection (`off`/`opencode`, default and missing mean
  off) through generator fragment `generated/ai-backend.json` plus the
  composed key plus a D-62 plain-conditional skip in the frontend module
- Ownership doc in plain user language: shared sessions/variables/skills,
  all 15 CLI-owned tool ids verified against opencode sources, model
  selection opencode-side, serve-attach fallback-only, setup plus curl steps
- Bridge gate green three ways (default with mandatory live half,
  self-test with four plants, live backstop hammer); full `--quick`
  green on every row including all four 16-01/16-02 rows

## Task Commits

1. **Task 1: Minimal read-only /mcp endpoint plus per-spawn bridge auth** - `8f3948d` (feat)
2. **Task 2: Selection wiring plus per-adapter ownership doc** - `8711126` (feat)
3. **Task 3: Bridge gate plus live /mcp auth proof and R5 backstop held-out test** - `7049378` (feat)

**Plan metadata:** docs plus state left to the orchestrator (shared-state freeze)

_Note: Task 2 commit 8711126 is the second attempt; the first (cd6c576) swept concurrent-agent staged files and was soft-reset, re-committed clean, with their stage restored (see deviation 5)._

## Files Created/Modified

- `theia/extensions/backend-opencode/src/node/opencode-mcp-contribution.ts` - Read-only /mcp contribution plus bridge entry builder
- `theia/extensions/backend-opencode/src/node/opencode-bridge-env.ts` - Per-spawn child-env builder (scrub plus bridge variable)
- `theia/extensions/backend-opencode/opencode.mcp.json` - Checked-in bridge template (URL plus {env:} refs only)
- `theia/extensions/backend-opencode/src/node/backend-opencode-backend-module.ts` - Binds the /mcp contribution
- `theia/extensions/backend-opencode/src/node/opencode-acp-supervisor.ts` - Explicit child env, lazy-port bridge entry in session/new
- `theia/extensions/backend-opencode/src/browser/backend-opencode-frontend-module.ts` - Selection plain-conditional around every bind
- `theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts` - Race-free READY announce (defer to listening)
- `theia/applications/browser/package.json` - Composed `powerbrowserAiBackend: off`
- `configuration.toml` - `[ai] backend = off`
- `scripts/generate.mjs` - `emitAiBackend` plus `ai-backend.json` target (54 targets)
- `scripts/lib/config-schema.json` - `ai.backend` enum key
- `docs/ai-opencode-adapter.md` - Ownership doc
- `docs/REBRANDING.md` - `ai.backend` reference row (rebranding-docs coupling)
- `scripts/verify-opencode-bridge.mjs` - Bridge gate (731 lines)
- `scripts/verify-platform.sh` - `ai-opencode-bridge` plus self-test rows

## Decisions Made

- Cookie-header bridge over Authorization-header: opencode's client
  resolves `{env:}` in remote header values and sends them verbatim
  (proven live with a header-echo server), so a `Cookie` header passes
  the existing gate with zero token-gate auth changes.
- Per-session server entry over per-child config file: ACP `session/new`
  on 1.18.25 accepts `{type http, name, url, headers[]}` (probed live;
  `remote`-with-record is rejected, `headers` is required as an array),
  so the live port flows in-memory with no XDG reliance and no
  spawn-before-bind race.
- Child env carries only the bridge variable: the acceptance line's "no
  secret" is read as no supervisor secrets (marker plus token name are
  scrubbed); the single deliberate bridge variable is the D-07
  injection the plan mandates (interpolation cannot resolve otherwise).
- Frontend-only selection gating: the plan asks for the binding skip,
  so off means unregistered (no picker entry, no preset UI); the
  supervisor child plus /mcp stay token-gated infrastructure either way.
- Token-gate onStart deferral instead of supervisor-side workaround: the
  null-address race kills the whole backend (exit 78), so the fix
  belongs at the announcer, behavior-preserving (same checks, later
  moment).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Rebuilt drivelist plus the browser app bundle (gitignored output)**
- **Found during:** Task 1 finish (live backend read)
- **Issue:** `main.js` could not boot: `drivelist.node` absent (smoke-theia
  rebuilds it only in the full suite), and the Sep-5 bundle predated the
  new contribution in any case.
- **Fix:** `node-gyp rebuild` in `theia/node_modules/drivelist`, then the
  browser app build; both are gitignored build output, no source change.
- **Verification:** Bundle contains the contribution; backend boots.
- **Committed in:** n/a (gitignored)

**2. [Rule 1 - Bug] Token-gate onStart address race (deterministic exit 78)**
- **Found during:** Task 1 live boot (3/3 boots FATAL before any request)
- **Issue:** Contributions' `onStart` run as microtasks right after
  `listen()` initiates, so `server.address()` is always null there (Node
  binds async); the gate exited 78 before serving anything. Pre-existing,
  unrelated to 16-03 sources.
- **Fix:** Announce now when `server.listening`, else on `'listening'` --
  same loopback check, same READY line, same fail-closed exits, only the
  moment moved. No gate scans that file's source.
- **Files modified:** theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts
- **Verification:** Backend boots and announces; full `--quick` green
  (all token-gate rows pass).
- **Committed in:** 8f3948d (part of task commit)

**3. [Rule 3 - Blocking] New bridge-env helper file (5th Task-1 file)**
- **Found during:** Task 1 (spawn-env construction)
- **Issue:** The tracer gate pins the supervisor file to zero host-env
  reads, but forwarding PATH/HOME into an explicit child env requires
  reading the host object somewhere.
- **Fix:** `opencode-bridge-env.ts` owns the forward-plus-scrub; the
  supervisor passes nothing and stays at zero reads. Secrets still enter
  only via POWERBROWSER_ENV.
- **Verification:** Tracer plus preset rows green on the extended tree.
- **Committed in:** 8f3948d (part of task commit)

**4. [Rule 3 - Blocking] Task-2 file list grew by three (schema, app manifest, frontend module)**
- **Found during:** Task 2 (selection wiring)
- **Issue:** Plan lists three files, but without the schema key the
  generator rejects `ai.backend` as unknown; without the composed key
  nothing consumes the fragment (composition ignores the key -- the
  plan's own fails_when); without the frontend conditional the binding
  is never skipped.
- **Fix:** Added `ai.backend` to `config-schema.json`,
  `powerbrowserAiBackend: off` to the composed manifest, and the D-62
  plain-conditional in the frontend module (bind lines byte-identical
  inside, so tracer/preset substring asserts hold). Plus the
  `docs/REBRANDING.md` row the rebranding-docs gate demands for every
  schema key.
- **Verification:** Generator (54 targets, self-test 62/62), fragment and
  tracked pins, full `--quick` green.
- **Committed in:** 8711126 (part of task commit)

**5. [Rule 1 - Bug] Task-2 commit swept concurrent-agent staged files**
- **Found during:** Task 2 commit (post-commit stat showed 9 foreign files)
- **Issue:** The phase-15 agent had staged files in the shared index;
  plain `git commit` recorded them under the 16-03 message (cd6c576).
- **Fix:** `git reset --soft HEAD~1`, unstaged their paths, re-committed
  only the 7 task files (8711126), re-staged their 9 paths untouched.
  Task 3 used `git commit -- <paths>` instead.
- **Verification:** `git show --stat 8711126` is exactly the 7 files, no
  deletions; their stage restored (10 files incl. their inventory bump).
- **Committed in:** 8711126

---

**Total deviations:** 5 auto-fixed (2 bug, 3 blocking)
**Impact on plan:** 1-4 required for the acceptance criteria; 5 is commit
hygiene under concurrent agents. No scope creep: no presets/history
changes, no new packages (T-16-03-SC clean), no auth-surface change.

## Issues Encountered

- `scan-brand-residue` frozen row went red mid-Task-2 on the concurrent
  phase-15 agent's citation additions (36 -> 37 -> 39, zero 16-03
  contribution); logged to `deferred-items.md`, resolved when their
  inventory bump landed -- Task-3 full `--quick` is green on every row.
- `tab-uris-typecheck` flaked once (red in `--quick`, green standalone);
  same transient class 16-01 reported under concurrent builds.
- `generate.mjs --self-test` is unaffected by the new key (62/62 green);
  `verify-downstream-fixtures` green (new key is optional).

## Threat Flags

None beyond the register: T-16-03-01 (reference-only config plus
hardcoded-secret plant), T-16-03-02 (read-only tool set plus
writable-tool plant), T-16-03-03 (default-off plus default-on plant),
T-16-03-04 (point-in-time reads plus STAGED backstop with a passing
`--live-backstop` driver), T-16-03-SC (no new package). Note: the bridge
variable equals the live token under a different name in the opencode
child's same-uid-readable process env -- accepted by D-07's interpolation
design (value per-spawn, never committed, never inherited beyond the child
line); documented in `opencode-bridge-env.ts`.

## User Setup Required

None - no external service configuration required. The live proofs used
the already-installed `opencode` 1.18.25 and its existing login; no keys
were handled. Turning the backend on is a manifest edit (see
docs/ai-opencode-adapter.md), not a setup step.

## Next Phase Readiness

- Phase 16 is complete: tracer (16-01) plus presets/history (16-02) plus
  bridge/selection (16-03) deliver selectable `@OpenCode` chat with gated
  review, revertible history, and documented selection. To select it: set
  `[ai] backend = "opencode"`, regenerate, copy the fragment key over,
  rebuild.
- Held-out items for verify-work: D4 (model-driven round trip through
  the configured server -- needs a human UAT turn) and the R5 backstop
  driver (`--live-backstop`, passing on demand).
- Watch item: shared-index commits under concurrent agents -- always
  `git diff --cached --name-only` before committing.

---
*Phase: 16-ai-backend-adapter-opencode plan 03*
*Completed: 2026-09-06*

## Self-Check: PASSED

- All created files exist on disk; all three commits resolve in git log
- `node scripts/verify-opencode-bridge.mjs` PASS (static plus live plus STAGED backstop)
- `--self-test` PASS (all four plants red), `--live-backstop` PASS
- Sampled rows `ai-opencode-bridge` / `ai-opencode-bridge-self-test` PASS
- `scripts/diff-theia-core.sh --quick` PASS, path space-free, `scripts/verify-platform.sh --quick` PASS (all rows)
