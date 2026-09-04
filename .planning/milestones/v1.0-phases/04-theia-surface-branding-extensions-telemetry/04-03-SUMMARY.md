---
phase: 04-theia-surface-branding-extensions-telemetry
plan: 03
subsystem: theia-telemetry
tags: [theia, telemetry, telemetryLevel, batching-sender, generator, preferences]

# Dependency graph
requires:
  - phase: 02-rebrand-inputs-and-generator
    provides: scripts/generate.mjs frozen TARGETS table, config-schema validation, D-08 default-echo
  - phase: 04-theia-surface-branding-extensions-telemetry
    provides: fragment-emitter pattern + surgical copy-over precedent (04-01), pin-gate pattern (04-02)
provides:
  - "[telemetry] schema (level enum + endpoint) + theia-telemetry.json fragment emitter"
  - "@powerbrowser/telemetry extension: batching sender, telemetryLevel preference, logger"
  - "verify-telemetry.mjs pin gate + unit suite + self-test; telemetry registry rows"
affects: [04-04, theia-surface-branding-extensions-telemetry]

# Actuals — pairs with the plan's `estimate` to calibrate future estimates.
actuals:
  tokens: 17112
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns: ["zero-dependency sender core tested without build (node type-stripping over erasable-syntax TS)"]

key-files:
  created: [theia/extensions/telemetry/src/browser/telemetry-sender.ts, theia/extensions/telemetry/src/browser/telemetry-preferences.ts, theia/extensions/telemetry/src/browser/telemetry-logger.ts, theia/extensions/telemetry/src/browser/telemetry-frontend-module.ts, theia/extensions/telemetry/test/telemetry-sender.test.mjs, scripts/verify-telemetry.mjs, generated/theia-telemetry.json]
  modified: [scripts/generate.mjs, scripts/lib/config-schema.json, scripts/verify-platform.sh, configuration.toml, theia/applications/browser/package.json, theia/package.json]

key-decisions:
  - "PREFERENCE CONTRIBUTED, NOT FOUND (D-04-03-01): @theia/core 1.74.1 ships no telemetryLevel preference -- the plan's research note is VS Code-derived -- so @powerbrowser/telemetry contributes telemetry.telemetryLevel itself (composition, not a core patch)"
  - "MANIFEST-AS-DEFAULT (D-04-03-02): sender reads PreferenceService.get(name, manifestLevel) per event -- unset users get the manifest level, runtime overrides win without restart"
  - "STATED OFF (D-04-03-03): shipped manifest states level = off explicitly so the D-08 echo fires every run; the truly-unset path is covered by a self-test control"
  - "ZERO-BUILD SUITE (D-04-03-04): sender core is dependency-free erasable TS, imported straight from src/ under plain node; tsc-clean is a separate wrapper step"
  - "FAIL-CLOSED GATING (D-04-03-06/07): unknown level resolves to off; crash admits error path only; enabled-without-endpoint at runtime drops with one diagnostic, never throws"

patterns-established:
  - "Pin gate triple carried over: generated-fragment equality + tracked-block equality + suite, with stub-mode and drift plants"

requirements-completed: []

# Coverage metadata — drives DETERMINISTIC UAT routing in verify-work.
coverage:
  - id: D1
    description: "Level off delivers zero network calls (usage+error exercised, same-run on-level control proves the stub)"
    requirement: "TEL-01"
    verification:
      - kind: unit
        ref: "theia/extensions/telemetry/test/telemetry-sender.test.mjs#off sends nothing (with a same-run on-level control)"
        status: pass
      - kind: unit
        ref: "TELEMETRY_TEST_STUB=always-send run: 5/5 red, off assertion names the failure"
        status: pass
    human_judgment: false
  - id: D2
    description: "Batches flush on size and interval; failures retry with backoff then drop with a diagnostic; full level matrix without restart"
    requirement: "TEL-01"
    verification:
      - kind: unit
        ref: "telemetry-sender.test.mjs#batch flushes on size, batch flushes on interval, retry then drop, runtime level change"
        status: pass
    human_judgment: false
  - id: D3
    description: "Manifest [telemetry] reaches the sidecar as the powerbrowserTelemetry block (fragment + block pin, drift plants red)"
    requirement: "TEL-02"
    verification:
      - kind: unit
        ref: "scripts/verify-telemetry.mjs + --self-test (3 plants red-naming)"
        status: pass
      - kind: unit
        ref: "scripts/generate.mjs --self-test (34 cases incl. 3 telemetry faults + control)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Extension loads in the built sidecar and delivers batches to a real endpoint"
    requirement: "TEL-02"
    verification: []
    human_judgment: true
    rationale: "Static gates prove the sender logic, the pin math and the compile, but no theia build, backend boot or live POST ran in this static pass -- the app-composition + delivery drill is deferred to end-of-roadmap verification (see Deferred Live Drill)."

# Metrics
duration: 14min
completed: 2026-09-04
status: complete
---

# Phase 04 Plan 03: Telemetry Pipeline Summary

**`configuration.toml` declares telemetry level (off/crash/error/all, default off) and endpoint; `@powerbrowser/telemetry` batches and retries delivery honoring the live level, with off sending nothing.**

## Performance

- **Duration:** ~14 min
- **Started:** 2026-09-04T06:45:48Z
- **Completed:** 2026-09-04T06:59:13Z
- **Tasks:** 3 of 3
- **Files modified:** 14 tracked (7 created, 6 modified, 1 registry) + 1 generated (gitignored)

## Accomplishments

- Schema carries `telemetry.level` (required false, four-value enum enforced in code like 04-02's source allowlist) + `telemetry.endpoint` (required false, https pattern in the established style); enabled-without-endpoint fails generate naming `telemetry.endpoint`.
- New frozen TARGETS row emitting `generated/theia-telemetry.json` (`{level, endpoint}`, null endpoint when unset); shipped manifest states `level = "off"`, so the D-08 echo fires every run (`default applied -- telemetry.level = "off"`).
- New `@powerbrowser/telemetry` extension: batching sender (size + interval flush, bounded exponential-backoff retry then drop with diagnostic, per-event live level read, fail-closed), contributed `telemetry.telemetryLevel` preference, thin logger, frontend-module wiring through the 04-01 channel; composed into the application package.json (`powerbrowserTelemetry` block + dep) and root `build:extensions`.
- New `scripts/verify-telemetry.mjs` (--quick): fragment equality, tracked-block equality, tsc, dependency-free unit suite; `--self-test` with 3 red-naming plants.
- Full `verify-platform.sh --quick` green with the two new rows.

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema `[telemetry]` + endpoint/level emitters** - `2314398` (feat)
2. **Task 2: `@powerbrowser/telemetry` extension: batching sender** - `6c6f33e` (feat)
3. **Task 3: Registry rows** - `092f62c` (feat)

**Plan metadata:** pending final docs commit (this SUMMARY).

## Files Created/Modified

- `scripts/lib/config-schema.json` - `telemetry.level` (no pattern: enum lives in code) + `telemetry.endpoint` (https pattern).
- `scripts/generate.mjs` - `TELEMETRY_LEVELS`, `validateTelemetry`, `emitTheiaTelemetry`, `theia-telemetry.json` TARGETS row, 4 new self-test cases (34 total), forty-eight to forty-nine ×3.
- `generated/theia-telemetry.json` - NEW (gitignored): `{"level": "off", "endpoint": null}`.
- `configuration.toml` - `[telemetry]` section (`level = "off"`, endpoint deliberately unset) with contract comments.
- `theia/extensions/telemetry/src/browser/telemetry-sender.ts` - NEW: zero-dependency batching sender (the unit-test surface).
- `theia/extensions/telemetry/src/browser/telemetry-preferences.ts` - NEW: `telemetry.telemetryLevel` contribution (vsx-registry idiom).
- `theia/extensions/telemetry/src/browser/telemetry-logger.ts` - NEW: thin TelemetryLogger (both error forms ride the error path).
- `theia/extensions/telemetry/src/browser/telemetry-frontend-module.ts` - NEW: ContainerModule (fragment read once, live preference per event).
- `theia/extensions/telemetry/test/telemetry-sender.test.mjs` - NEW: 5-test plain-node suite (stub-mode discrimination).
- `theia/extensions/telemetry/package.json`, `tsconfig.json` - NEW: `@powerbrowser/telemetry` 0.1.0 (branding-style; `@theia/core` dep only).
- `theia/applications/browser/package.json` - `powerbrowserTelemetry` block + `@powerbrowser/telemetry` dep.
- `theia/package.json` - `build:extensions` gains the telemetry step.
- `scripts/verify-telemetry.mjs` - NEW: pin gate + suite runner + 3-plant self-test.
- `scripts/verify-platform.sh` - `telemetry` pair + generate fault-enumeration comment (thirty to thirty-four).

## Decisions Made

### D-04-03-01 (preference contributed, not found — the plan's one wrong fact)

`@theia/core` 1.74.1 ships ONLY the `TelemetryLogger`/`TelemetrySender` interfaces (verified: no sender implementation, no `telemetry.*` preference contribution, no DI token anywhere in `@theia/*/src`). The plan's "telemetry.telemetryLevel is a real preference" is VS Code-derived and false for this tree. The extension therefore contributes `telemetry.telemetryLevel` itself (enum off/crash/error/all, default off) -- composition through `PreferenceContribution`, not a core patch. Same observable contract the plan specified: four-value enum, default off, live per-event read, runtime change without restart (asserted by the level-matrix test).

### D-04-03-02 (manifest-as-default, not manifest-as-value)

The sender reads `PreferenceService.get('telemetry.telemetryLevel', manifestLevel)` per event. A user who never touches the setting gets the manifest level; a runtime Settings change wins immediately. Reading the raw preference without the default would pin every downstream to off no matter what the manifest says (the contribution default is static), which would break the manifest-to-runtime flow this plan exists to build.

### D-04-03-03 (stated off, not omitted)

The shipped manifest states `level = "off"` explicitly rather than leaving `[telemetry]` empty. Only a stated optional key flows through the merge that produces the D-08 echo, so this is what makes `default applied -- telemetry.level = "off"` appear on every run (observed) and what a Phase-7 downstream inherits. The truly-unset path (no `[telemetry]` at all, as in every self-test fixture) resolves to off/null in the emitter and is pinned by the self-test control -- both paths proved, each where it is cheapest to prove.

### D-04-03-04 (zero-build suite)

The sender core imports nothing and uses erasable syntax only, so the suite imports it straight from `src/` under plain node 24 type-stripping: no tsc, no install, no browser. `tsc -b` cleanliness stays a separate wrapper step (it needs the theia install, so it skips with a message where the install is absent -- generate-check's own rule -- while the suite and pin always run).

### D-04-03-05 (one namespaced block key)

The copy-over owns exactly one key, `powerbrowserTelemetry` (`{level, endpoint}`), in the same block as 04-01's `applicationName` and 04-02's `theiaPlugins`. The shared `preferences` map was deliberately NOT used for the default (that map is hand-owned; a second writer would blur ownership) -- D-04-03-02's `get`-with-default is what carries the manifest value instead.

### D-04-03-06/07 (fail-closed gating)

An unrecognized level (hand-edited block) resolves to off -- a bad config silences the sender, never arms it. `crash` admits the error path only (the plan's v1 crash scope: no OS reporter exists, so crash means `sendErrorData`). The logger's string `logError` rides `sendErrorData`, NOT `sendEventData`: the usage path is `all`-only, and an error reported at level `error` must still be delivered. Enabled-without-endpoint at runtime (preference override with no endpoint -- the one combination generate-time validation cannot see) drops with a single diagnostic, never throws.

## Deviations from Plan

Two noted adjustments, neither changing plan scope:

### 1. [Setup — plan fact correction] Contributed the preference the plan said exists

- **Found during:** Task 2 (reading `@theia/core` 1.74.1 sources before writing the sender).
- **Issue:** No `telemetry.telemetryLevel` preference exists in this tree; the sender cannot "read the live preference value" for a preference nothing contributes.
- **Fix:** The extension contributes it (D-04-03-01); the live-per-event read and the no-restart test are exactly as planned.
- **Verification:** `grep -rln telemetryLevel` over `@theia/*/src` (only an unrelated `agentHost.*` NLS key); unit level-matrix test green; always-send stub red.
- **Committed in:** `6c6f33e`.

### 2. [Environment — tool substitution] `tsc -b` via node, not yarn

- **Found during:** Task 2 (verification).
- **Issue:** `yarn` is not on PATH outside the nix dev shell (project rule: `node` works outside, `yarn` does not); `yarn --cwd theia/extensions/telemetry build` cannot run in the static pass.
- **Fix:** Ran the identical compiler binary directly (`node theia/node_modules/typescript/bin/tsc -b theia/extensions/telemetry`, exit 0); the wrapper does the same. Same project, same `tsc`, same result -- only the launcher differs.
- **Committed in:** N/A (verification method only; no files).

A test-only fix during development (off-test control needed `maxBatchSize: 1` to flush its single event; the sender was correct) is recorded here for completeness -- committed inside `6c6f33e`, no plan impact.

---

**Total deviations:** 1 fact correction + 1 environment substitution + 1 test fix
**Impact on plan:** All required for the plan's own guarantees. No scope creep: no endpoint allowlist (TEL-03, owned by 04-04), no Mozilla-side repointing (04-04), no crash-report pipeline (v2, TEL-04).

## Issues Encountered

- `spawnSync`-free design note: the unit suite drives everything in-process with a fake clock (no child processes), so the 04-02 `spawnSync` hang class cannot recur here.
- The `MODULE_TYPELESS_PACKAGE_JSON` warning on the suite run (extension ships no `"type"` field, as all Theia packages do) is stderr noise only; exit codes and output assertions are unaffected, and the wrapper filters it from failure reports.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: runtime-network-egress | theia/extensions/telemetry/src/browser/telemetry-sender.ts | Sender POSTs event batches to the manifest-declared `telemetry.endpoint` whenever the effective level is not off. Bounds: default off (nothing leaves), https-only schema pattern, no PII enrichment (name + caller data only, no stack), bounded retry then drop. Any-endpoint-accepted is v1-true: the endpoint allowlist flow is TEL-03, owned by 04-04. |

## Verification Results (static only — live drill deferred per autonomous run context)

| Check | Result |
|---|---|
| `generate --self-test` (34 cases incl. 4 new) | PASS |
| `node scripts/generate.mjs` (49 files) + `--check` | PASS |
| `--check` red after hand-editing `generated/theia-telemetry.json`, green after regenerate | PASS (exit 1 naming the file, then green) |
| Live-manifest red: `level = "all"` without endpoint → generate exit 1 naming `telemetry.endpoint` | PASS (tree restored, `--check` green after) |
| `tsc -b theia/extensions/telemetry` (node-direct, yarn unavailable outside nix) | PASS (exit 0) |
| Unit suite 5/5 (off+control, size, interval, retry-drop, level matrix) | PASS |
| Same suite vs always-send stub: 5/5 red, off assertion names the failure | PASS (discrimination proven) |
| `verify-telemetry.mjs` + `--self-test` (3 plants red-naming) | PASS |
| `verify-platform.sh --only telemetry[-self-test]` | PASS alone |
| `verify-platform.sh --quick` (full, incl. scan-brand-residue) | PASS |
| `scan-brand-residue` (staged state, 129 files) | PASS |
| `git status -- theia/` scope (2 package.jsons + new extension; node_modules untouched) | PASS (stands in for `diff-theia-core.sh`, which needs the theia-shell yarn) |

## Deferred Live Drill (for end-of-roadmap verification)

Not run in this plan (no theia build/boot in the autonomous static pass). Exact drill:

```sh
# 1. Composition: the @powerbrowser/telemetry symlink materializes on install
nix develop .#theia --command bash -c "cd theia && yarn install --frozen-lockfile && yarn build"
#    (proves the new workspace dep resolves and the app bundle composes)
# 2. Enabled drill (temp manifest edit + revert):
#    set [telemetry] level = "all", endpoint = "https://<collector>/v1/events"
node scripts/generate.mjs   # expect generated/theia-telemetry.json -> the pair
#    surgical apply: set theia.frontend.config.powerbrowserTelemetry in
#    theia/applications/browser/package.json to the fragment value only
node scripts/verify-telemetry.mjs  # expect PASS (pin follows the fragment)
# 3. Start the app (scripts/smoke-theia.sh if it runs without display):
#    exercise usage + error paths at each of the four levels;
#    level off -> zero POSTs at the collector; all -> both kinds arrive
# 4. Revert the fixture, regenerate, remove the block delta
```

The `smoke-theia.sh` backend-boot half of the plan's no-network proof likewise stands on the stub-level proof until this drill runs.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 04-04 builds on: the `powerbrowserTelemetry` block is the third brand-owned region of the application `package.json` (alongside 04-01's `applicationName` and 04-02's `theiaPlugins`); any future emitter touching that file must preserve all three. TEL-03 (endpoint-allowlist flow) and Mozilla-side repointing are 04-04's.
- The deferred live drill above is the one unverified half of this plan; run it at end-of-roadmap verification before declaring TEL-01/TEL-02 green (hence `requirements-completed: []`).

## Self-Check: PASSED

All created files found on disk; all three task commits present in history; fragment on disk (`{"level": "off", "endpoint": null}`) matches the shipped manifest.

---
*Phase: 04-theia-surface-branding-extensions-telemetry*
*Completed: 2026-09-04*
