---
phase: 13-chrome-bar-strip-relocation-spike
plan: 02
subsystem: chrome-bar
tags: [theia, json-rpc, sqlite, gui-06, gui-07, chrome-bar, suggestions, spike-verdict]

# Dependency graph
requires:
  - phase: 12-sql-tab-store
    provides: TabQueryService readonly reader (STAGED, no consumer) that this plan's first consumer lands on
  - phase: 13-chrome-bar-strip-relocation-spike
    provides: 13-01 RED spike record this plan's verdict gate parses
provides:
  - "@powerbrowser/chrome-bar skeleton composed into the sidecar and building"
  - "TabQueryService.searchByPrefix plus its first JSON-RPC consumer (proxy pair over the existing channel)"
  - "gui06 suggestions gate and gui07 verdict gate, each with a proven self-test, as registry rows"
affects: [13-03-widget, 14-modes-and-strip]

# Actuals — same estimateTokens scale (chars/4 over realized diff)
actuals:
  tokens: 13000
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns: [derive-and-compare-search-gate, verdict-instrument-agreement, stdlib-fixture-engine]

key-files:
  created:
    - theia/extensions/chrome-bar/package.json
    - theia/extensions/chrome-bar/tsconfig.json
    - theia/extensions/chrome-bar/src/browser/chrome-bar-suggestion-service.ts
    - theia/extensions/chrome-bar/src/browser/chrome-bar-frontend-module.ts
    - theia/extensions/chrome-bar/src/node/chrome-bar-backend-module.ts
    - theia/extensions/chrome-bar/src/node/chrome-bar-suggestion-service-impl.ts
    - scripts/verify-chrome-bar-suggestions.mjs
    - scripts/verify-strip-spike-verdict.mjs
  modified:
    - theia/extensions/tab-uris/src/node/tab-query-service.ts
    - theia/applications/browser/package.json
    - theia/package.json
    - scripts/verify-platform.sh

key-decisions:
  - "Verdict gate asserts verdict-instrument AGREEMENT, not blanket core-diff-clean: GREEN requires a clean instrument, RED-with-core-cause requires a red instrument plus pasted proof (the tree's instrument is red on pre-existing drift, so a literal clean-assertion would be a gate red on a correct tree)"
  - "Fixture engine is stdlib node:sqlite, not the plan-literal vendored better-sqlite3: a better-sqlite3 open in scripts/ trips the HIGH-severity second-writer gate, whose designed carve-out is exactly DatabaseSync-plus-mkdtempSync"
  - "searchByPrefix uses positional bound params matching the file's three existing methods, not RESEARCH's :q/:n spelling; the gate accepts both"
  - "Task-1/2 sources co-authored as one Rule-3 fix (tsc rejects empty-src projects with TS18003), committed as the two stated per-task commits"
  - "p-debounce pin declared explicitly in chrome-bar package.json (same ^2.1.0 range as customize), unused until the 13-03 widget, so nothing relies on hoisting"

patterns-established:
  - "Plant scoping: a self-test plant must mutate what the check derives (od-verified byte ground truth beat three rounds of backslash-counting by eye)"
  - "Gate-over-gate: a new script that trips an existing HIGH-severity gate takes the gate's designed carve-out path instead of weakening the gate"
  - "Import-the-const RPC paths: modules reference CHROME_SUGGESTION_PATH, never re-spell the literal (the gate fails re-spelled copies by name)"

requirements-completed: [GUI-06]

# Coverage metadata — deterministic UAT routing
coverage:
  - id: D1
    description: "chrome-bar extension skeleton composed into the sidecar and building with frontend plus backend entries"
    requirement: "GUI-06"
    verification:
      - kind: other
        ref: "nix develop .#theia --command bash -c 'cd theia/extensions/chrome-bar && yarn build' (exit 0, both extensions)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Prefix search returns at most 8 recency-ordered rows with wildcard input escaped, served over the existing authenticated RPC channel"
    requirement: "GUI-06"
    verification:
      - kind: other
        ref: "scripts/verify-chrome-bar-suggestions.mjs (static derive-and-compare plus mkdtemp fixture semantics)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Activating a suggestion navigates through the existing opener path"
    requirement: "GUI-06"
    verification: []
    human_judgment: true
    rationale: "Held-out backstop (STAGED): the widget lands in 13-03, so no activation call site exists yet to evidence; the gate prints STAGED with the rerun command rather than passing silently"
  - id: D4
    description: "RED spike verdict with Variant-A routing enforced mechanically (parses, cause present, instrument agreement, upstream empty, no spike-shipped files)"
    requirement: "GUI-07"
    verification:
      - kind: other
        ref: "scripts/verify-strip-spike-verdict.mjs plus --self-test (both planted faults went red)"
        status: pass
    human_judgment: false

# Metrics
duration: ~20min
completed: 2026-09-06
status: complete
---

# Phase 13 Plan 02: Chrome-Bar Foundation Summary

**Chrome-bar skeleton building in the sidecar, prefix search serving over the first JSON-RPC consumer, and suggestions plus RED-verdict gates green with proven self-tests.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-09-06T03:43Z (approx, from first-file mtime)
- **Completed:** 2026-09-06T04:03Z
- **Tasks:** 3/3
- **Files modified:** 12 (8 created, 4 modified)

## Accomplishments

- New `@powerbrowser/chrome-bar` 0.1.0 extension composed with exactly two
  edits (sidecar dep in alphabetical order, hand-kept build-list append) and
  building clean inside the Nix theia shell with frontend plus backend
  module entries, in-tree pins only.
- `TabQueryService.searchByPrefix` beside the existing point reads: bound
  LIKE over url/title with explicit `ESCAPE '\'` clause, three-replace
  metacharacter neutralization, recency order, caller limit, empty-on-failure
  -- zero modifying statements in both reader sources by grep gate.
- First consumer landed: backend `JsonRpcConnectionHandler` at
  `/services/powerbrowser/chrome-suggestions` delegating straight to the
  search, frontend `createProxy` in singleton scope, all binds static at
  module load; the STAGED header note now states the consumer exists.
- Two new verify scripts (505 + 264 lines, both over the 60-line minimum)
  with four registry rows beside the gui04 pair, each with a honesty
  comment: suggestions gate (derived search shape as set equality plus
  fixture semantics plus loud STAGED activation backstop) and verdict gate
  (RED verdict with cause plus Variant-A routing plus instrument
  agreement). All green through direct invocation, self-tests, single-gate
  sampling, and the quick gate.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extension skeleton plus sidecar composition** - `9be9f9b` (feat)
2. **Task 2: Prefix search plus first JSON-RPC consumer** - `1236195` (feat)
3. **Task 3: Suggestions plus verdict gates as registry rows** - `ffa2b1b` (feat)

**Plan metadata:** this SUMMARY commit follows (docs).

## Files Created/Modified

- `theia/extensions/chrome-bar/package.json` - Extension skeleton (in-tree pins incl. explicit p-debounce, frontend+backend entries)
- `theia/extensions/chrome-bar/tsconfig.json` - Byte-verbatim copy of the tab-uris tsconfig
- `theia/extensions/chrome-bar/src/browser/chrome-bar-suggestion-service.ts` - RPC path const, UI cap const, search contract, DI token
- `theia/extensions/chrome-bar/src/browser/chrome-bar-frontend-module.ts` - Interface to websocket proxy, singleton, static
- `theia/extensions/chrome-bar/src/node/chrome-bar-backend-module.ts` - Connection handler to JSON-RPC handler at the path, static
- `theia/extensions/chrome-bar/src/node/chrome-bar-suggestion-service-impl.ts` - First consumer: delegates to searchByPrefix
- `theia/extensions/tab-uris/src/node/tab-query-service.ts` - searchByPrefix plus escape helper plus de-STAGED header
- `theia/applications/browser/package.json` - Sidecar dep (alphabetical, no app-file edit)
- `theia/package.json` - Build-list append
- `scripts/verify-chrome-bar-suggestions.mjs` - Suggestions gate with self-test
- `scripts/verify-strip-spike-verdict.mjs` - Verdict gate with self-test
- `scripts/verify-platform.sh` - Four new rows with honesty comments, no sibling driver

## Decisions Made

- **Verdict-instrument agreement over literal clean-assertion.** The plan
  text says the verdict gate asserts the core-diff check exits clean, but
  the tree's instrument is red on pre-existing install-state drift (13-01
  proofs, untouched by this plan). A literal assertion would be a gate red
  on a correct tree -- a broken instrument. The gate instead asserts the
  verdict's claim agrees with the instrument: GREEN requires clean;
  RED-with-core-cause requires red plus pasted FAIL proof (a green
  instrument under a core-cause RED fails as a stale verdict, forcing a
  re-probe). Documented as deviation 5 below.
- **Positional bound params**, matching the file's three existing methods,
  instead of RESEARCH's `:q`/`:n` spelling; the gate's bound-limit check
  accepts both shapes.
- **Deprecated `WebSocketConnectionProvider.createProxy`** per the RESEARCH
  prescription -- present and functional in the pinned 1.74.1 tree.
- **p-debounce declared explicitly** (`^2.1.0`, same range as customize)
  per standing instruction; unused until the 13-03 widget debounces input.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Task-1/2 sources co-authored (TS18003 ordering gap)**
- **Found during:** Task 1 verify (`yarn build` with package.json plus tsconfig only)
- **Issue:** Plan-literal Task 1 cannot pass its own verify: `tsc -b` on a
  project with no `src/` inputs fails with TS18003 (proven with a scratch
  probe before writing plan files). The five Task-2 sources are fully
  specified by Task 2's action plus RESEARCH, so no new design was needed.
- **Fix:** Wrote all nine files, verified builds plus greps plus quick,
  then committed the four Task-1 files (`9be9f9b`) and the five Task-2
  files (`1236195`) with the stated messages. Logical task separation
  preserved; the Task-1 commit tree alone does not compile standalone.
- **Verification:** Both `yarn build` runs exit 0, quick green before each commit.
- **Committed in:** `9be9f9b` + `1236195` (split as stated)

**2. [Rule 1 - Bug] Suggestions-gate RPC assertion tested the wrong shape**
- **Found during:** Task 3 verify (first gate run went red on a correct tree)
- **Issue:** The gate required backend/frontend modules to contain the RPC
  path *literal*, but the correct drift-proof shape imports the
  `CHROME_SUGGESTION_PATH` const (re-spelled literals are the drift this
  discipline exists to prevent -- PATTERNS section 2).
- **Fix:** Two-sided assertion: the symbol must be referenced AND no
  `/services/` literal may appear in either module. Header updated to match.
- **Verification:** Gate green; self-test plants still discriminate.
- **Committed in:** `ffa2b1b`

**3. [Rule 1 - Bug] Self-test plants missed what the check derives (three rounds)**
- **Found during:** Task 3 self-test runs (plants landed yet stayed green, or reported un-landed)
- **Issue:** (a) The `LIMIT ?` plant hit `listByRecency`'s identical clause
  first, leaving the asserted `searchByPrefix` statement green. (b) The
  ESCAPE-strip pattern matched only doc comments (`` `ESCAPE '\'` ``), not
  the SQL (`ESCAPE \'\\\'` -- od ground truth: backslash-quote from TS
  quoting). (c) The neutralizer-neutering targeted the method body while
  the routine lives at module level.
- **Fix:** Plants scope to the derived method body via split/join, match
  the od-verified byte spellings, and mutate both scopes with a
  return-original fallback so a non-landing step reports a drifted anchor
  instead of a vacuous green.
- **Verification:** Both plants go red naming the drift; plant-landed assertions hold.
- **Committed in:** `ffa2b1b`

**4. [Rule 3 - Blocking] Fixture engine switched to stdlib node:sqlite**
- **Found during:** Task 3 quick gate (`sql-store-second-writer` went red)
- **Issue:** Plan-literal vendored better-sqlite3 `new Database(` open in
  scripts/ trips the HIGH-severity second-writer gate, whose designed
  carve-out (rule (c)) is exactly the `DatabaseSync` shape in
  stage-disciplined scripts/ instruments carrying mkdtempSync.
- **Fix:** Fixture runs on `node:sqlite` DatabaseSync (file-backed mkdtemp
  scratch, same derived SQL, same assertions). LIKE/ESCAPE/LIMIT are core
  SQLite, identical across engines. Deliberately NOT worked around with
  dynamic construction -- that would evade the gate.
- **Verification:** Suggestions gate plus self-test green; second-writer
  row plus self-test green; quick green.
- **Committed in:** `ffa2b1b`

**5. [Rule 2 - Missing critical] Verdict-gate core pillar asserts agreement, not blanket clean**
- **Found during:** Task 3 design (before writing -- the 13-01 proofs plus a live instrument run showed red-on-drift)
- **Issue:** Plan-literal "assert the core-diff check exits clean" cannot
  hold on this tree: the instrument is red on pre-existing install-state
  drift no plan action can fix (reinstall forbidden by T-13-02-SC). A
  literal gate would be red on the correct tree and would block the plan's own
  verify chain.
- **Fix:** Agreement logic (see Decisions). The two always-green pillars
  (upstream empty, no spike-shipped files) are asserted literally.
- **Verification:** Gate green on the RED tree; GREEN-flip plant goes red
  naming the drift; malformed-verdict plant goes red.
- **Committed in:** `ffa2b1b`

---

**Total deviations:** 5 auto-fixed (2 blocking, 2 bug, 1 missing-critical)
**Impact on plan:** All five preserve plan intent while keeping every gate
honest -- no scope creep, no gate weakened, no shipped-tree extra.

## Issues Encountered

- **Backslash-counting by eye failed three times** (deviation 3): the TS
  quoting around `ESCAPE \'\\\'` defeats visual regex authoring. Resolved
  by od byte ground truth plus a file-based probe harness, then encoding
  the proven spellings. Lesson recorded in patterns-established.
- **Pre-existing reds untouched:** `diff-theia-core.sh --quick` stays red
  on install-state drift (13-01 cause, corroborated live during the
  verdict-gate run); the verdict gate now enforces its documentation
  rather than overriding it. No new core drift introduced (no
  `theia/node_modules` or `upstream/` touch; shipped-tree diff is 12
  plan files only).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 13-03 consumes: the skeleton (package plus both module entries), the
  RPC proxy (`ChromeBarSuggestionService` token plus path const plus UI cap
  const), the `searchByPrefix` method, and the two green rows. It adds the
  widget, commands, styling, and the remaining commands row.
- The activation backstop prints STAGED on every gate run until 13-03 lands
  a call site routing through `OpenerService` -- at which point the same
  gate enforces the routing without modification.
- Variant routing is mechanically locked: the verdict gate pins RED plus
  Variant A; reopening Variant B requires realigning install state,
  re-running the banked probe, re-recording the verdict, and watching this
  gate stay green through the change.

## Self-Check: PASSED

- All 8 created files exist; 4 modified files carry the plan's edits
- All 3 task commits present (`9be9f9b`, `1236195`, `ffa2b1b`)
- Both scripts exceed 60 lines (505, 264); four registry rows resolve
  through `--only`; no sibling driver created
- No stub patterns, no Firefox internals, no new npm packages in chrome-bar
  sources; `verify-upstream-pins` green inside the quick gate

---
*Phase: 13-chrome-bar-strip-relocation-spike*
*Completed: 2026-09-06*
