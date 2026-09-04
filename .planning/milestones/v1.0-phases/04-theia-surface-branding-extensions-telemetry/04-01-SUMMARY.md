---
phase: 04-theia-surface-branding-extensions-telemetry
plan: 01
subsystem: theia-branding
tags: [theia, gen-05, frontend-config, applicationName, welcome-widget, generator]

# Dependency graph
requires:
  - phase: 02-rebrand-inputs-and-generator
    provides: scripts/generate.mjs frozen TARGETS table, config-schema validation, sink guards
  - phase: 01-platform-extraction-and-rename
    provides: "@powerbrowser/branding welcome widget, verify-branding-preflight inventory-sourced gate"
provides:
  - "Ratified Phase 4 runtime branding channel: theia.frontend.config + FrontendApplicationConfigProvider"
  - "generated/theia-frontend-config.json emitter (applicationName = identity.display_name)"
  - "Welcome widget runtime display-name read with boot fallback (no .ts edit per rebrand)"
affects: [04-02, 04-03, 04-04, theia-surface-branding-extensions-telemetry]

# Actuals — pairs with the plan's estimate to calibrate future estimates.
actuals:
  tokens: 6100
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns: ["fragment-emitter (brand-owned JSON fragment, surgical copy-over, no tracked comparand)"]

key-files:
  created: [generated/theia-frontend-config.json]
  modified: [scripts/generate.mjs, theia/extensions/branding/src/browser/powerbrowser-welcome-widget.tsx, scripts/verify-branding-preflight.mjs, scripts/verify-platform.sh]

key-decisions:
  - "RUNTIME CHANNEL (ratified for 04-02..04-04): theia.frontend.config block in theia/applications/browser/package.json, read via FrontendApplicationConfigProvider.get() — no fetch, no new backend module, app-bundle step only"
  - "Fetch-based candidates rejected: static JSON asset would live in gitignored build output; ApplicationServer extension needs an unjustified second backend module"
  - "Fragment, not whole block: emitter owns ONLY applicationName; sibling keys (powerbrowserPrivilegedJs, preferences) stay hand-owned, copy-over is surgical"
  - "applicationName carries the BASE display name (release form); the dev suffix never reaches the Theia window title"

patterns-established:
  - "Fragment emitter: a TARGETS row with no tracked comparand (byte-identity gate skips it, --check covers it, preflight pins the tracked side against the inventory)"
  - "Preflight read-site triple: (a) provider read present, (b) quoted fallback present, (c) no rendered JSX literal"

requirements-completed: []

# Coverage metadata — drives DETERMINISTIC UAT routing in verify-work.
coverage:
  - id: D1
    description: "Generator emits generated/theia-frontend-config.json with applicationName = identity.display_name"
    requirement: "GEN-05"
    verification:
      - kind: unit
        ref: "scripts/generate.mjs --self-test (hostile double quote in theia frontend config name; fragment parses and names the display name)"
        status: pass
      - kind: other
        ref: "node scripts/generate.mjs --check (stale-output detection names the fragment when hand-edited)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Welcome tab shows the rebranded display name with no TypeScript edit"
    verification:
      - kind: unit
        ref: "tsc -b theia/extensions/branding (exit 0); verify-branding-preflight.mjs --self-test (3 new read-site plants)"
        status: pass
    human_judgment: true
    rationale: "Static gates prove the read site (provider read, fallback, no rendered literal), but the rendered welcome tab was never observed live — the app-bundle rebuild + fixture rebrand drill is deferred to end-of-roadmap verification (see Next Phase Readiness)."

# Metrics
duration: 15min
completed: 2026-09-04
status: complete
---

# Phase 04 Plan 01: Tracer — One Branding Key End-to-End + Runtime Channel Summary

**`identity.display_name` flows from `configuration.toml` to a generated frontend-config fragment and the welcome heading reads it at runtime via `FrontendApplicationConfigProvider`, with the channel ratified for all of Phase 4.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-09-03T22:59Z (phase context commit)
- **Completed:** 2026-09-04
- **Tasks:** 3 of 3
- **Files modified:** 4 tracked + 1 generated (gitignored)

## Accomplishments

- Ratified the Phase 4 runtime branding channel with a throwaway spike through the REAL Theia modules (deepmerge, ApplicationProps.DEFAULT, FrontendApplicationConfigProvider): fixture `Acme Browser` survives manifest block, merge, provider set/get.
- New generator TARGETS row emitting `generated/theia-frontend-config.json` (`applicationName` = `identity.display_name`), sink-guarded, `--check`-covered; tracked `package.json` verified already equal (surgical apply is a no-op this run).
- Welcome widget resolves its `<h1>` at runtime with a single-occurrence boot fallback; `tsc -b` clean; preflight section 10 gates the read site with three assertions and three new self-test plants.
- Full `verify-platform.sh --quick` green (37 checks), including the combined fallback-deleted + channel-broken fault going red with both messages.

## Task Commits

Each task was committed atomically:

1. **Task 1: Spike and ratify the runtime branding channel** — no commit (throwaway `node -e` spike, nothing written; decision recorded here).
2. **Task 2: Schema + emitter** - `4a44154` (feat)
3. **Task 3: Extension reads runtime value; preflight + registry follow** - `bd360a0` (feat)

**Plan metadata:** pending final docs commit (this SUMMARY).

## Files Created/Modified

- `generated/theia-frontend-config.json` - NEW (gitignored): `{"applicationName": "Power Browser"}` — the brand-owned fragment the copy-over reads from.
- `scripts/generate.mjs` - `emitTheiaFrontendConfig` emitter + frozen TARGETS row (no tracked comparand) + `probeHostileFrontendConfigName` + fragment JSON-control + 2 self-test cases; header/count comments 46 to 47.
- `theia/extensions/branding/src/browser/powerbrowser-welcome-widget.tsx` - ONLY the read site: provider import, `FALLBACK_DISPLAY_NAME` const (sole display literal), `displayName` getter, `<h1>{this.displayName}</h1>`.
- `scripts/verify-branding-preflight.mjs` - Section 10 (provider-read / quoted-fallback / no-rendered-literal, inventory-sourced) + eighth/ninth/tenth self-test plants.
- `scripts/verify-platform.sh` - Comment-only: generate-self-test enumeration 23 to 25 faults. No new labels (no new script; existing rows cover everything).

## Decisions Made

### D-04-01-01 (RATIFIED RUNTIME CHANNEL — 04-02..04-04 build on this)

**Channel:** the `theia.frontend.config` block of `theia/applications/browser/package.json`, read at runtime through `FrontendApplicationConfigProvider.get()`.

- `applicationName` (upstream key) carries `identity.display_name`.
- Later string keys (welcome text, about text, repo URL) ride as namespaced custom keys (e.g. `powerbrowserBranding.*`) in the SAME block — proven by the spike: `deepmerge(ApplicationProps.DEFAULT, theia)` preserves unknown keys, `prettyStringify` serializes the whole block into `FrontendApplicationConfigProvider.set(...)`, and the `ApplicationConfig` index signature (`[key: string]: any`) types the read. The tracked `package.json` already carries such keys today (`powerbrowserPrivilegedJs`), so the passthrough is exercised, not theoretical.
- Rebrand cost for any key on this channel: manifest edit + generator + surgical block apply + app-bundle step (`theia build` regenerates `src-gen/frontend/index.js` + `index.html`). Never `tsc -b`, never a `.ts` edit. Proven: no `applicationName` string exists in any `theia/extensions/branding/{src,lib}` file outside this plan's read site.
- **Rejected alternative 1 — static JSON asset fetched at runtime:** the servable location would be `lib/frontend/` build output (gitignored, wiped by clean, invisible to `--check`) or a new backend static route (new backend code for zero gain over config injection, plus fetch timing/failure modes in the widget).
- **Rejected alternative 2 — backend `ApplicationServer` extension:** a second backend module needing GUI-02 D-22-grade justification, plus an async RPC read where a synchronous provider read exists. The plan's own preference order (static asset over second backend module) is preserved — this channel needs NO new module at all.
- **Known boundary for 04-04:** binary assets (logo files) cannot ride JSON string config. The mark already has its own twin pattern (`brand/mark.svg` source + `powerbrowser-mark.ts` data-URI/inline variants, preflight section 7). 04-04 decides the logo file channel; string keys stay on this channel.

### D-04-01-02 (fragment, not whole block)

The emitter owns ONLY `applicationName`. Emitting the whole `theia.frontend.config` object would make generator literals the owner of Theia behaviour flags, and a whole-file copy-over would delete the hand-owned siblings. Contract is block-level equality on the one key (enforced tracked-side by preflight section 6's existing `applicationName` assertion, inventory-sourced).

### D-04-01-03 (release form for the single manifest)

`applicationName` carries the BASE display name (`identity.display_name` = release short name). There is one application manifest, so the dev `name_suffix` never reaches the Theia window title. Matches the preflight expectation already pinned on that file.

### D-04-01-04 (no GENERATED_BANNER on the fragment)

Strict JSON carries no comment, and a `_comment` key would pollute the block a reader copies from. Derivation lives in the emitter JSDoc; freshness is `--check`'s contract.

## Deviations from Plan

Two noted adjustments, neither changing plan scope:

### 1. [Setup — channel candidate superset] Ratified a channel the plan did not list

- **Found during:** Task 1 (spike).
- **Issue:** The plan's two candidates (static asset, backend extension) both work but both cost more than necessary; the spike proved the frontend-config block itself carries arbitrary keys end-to-end through real Theia code.
- **Fix:** Ratified the simpler channel under the plan's own selection rule ("whichever needs no `src/**/*.ts` edit per rebrand and no new backend module"); documented both rejections with reasons in D-04-01-01 above.
- **Verification:** Throwaway spike output (`SPIKE PASS`, real `deepmerge` + real provider module); `git status --porcelain theia/` shows only the plan-allowed read-site file modified.
- **Committed in:** N/A (decision only; no files).

### 2. [Extension — one holds-control beside the one planted-fault case]

- **Found during:** Task 2 (self-test).
- **Issue:** The plan asked for one planted-fault case; the file's convention pairs every sink-guard probe with a green control proving the emitter is healthy on the clean value (cf. locale-agreement-holds, container-writers-hold).
- **Fix:** Added `theia frontend config fragment parses and names the display name` holds-case alongside the hostile-quote probe.
- **Verification:** `generate --self-test PASS — 25 planted faults`.
- **Committed in:** `4a44154`.

No schema change was needed (plan-conditional: the channel needs no new `[theia]` keys — `identity.display_name` was already required, FIXTURE_BASE untouched). No registry labels were added (no new script exists; `branding-preflight`/`generate-check`/`generate-self-test` rows already cover the new assertions — verified via `--only branding-preflight`).

## Issues Encountered

None — plan executed as written apart from the two noted adjustments above.

## Verification Results (static only — live drill deferred per autonomous run context)

| Check | Result |
|---|---|
| Throwaway channel spike (real Theia modules, fixture `Acme Browser`) | PASS |
| `generate --self-test` (25 cases incl. 2 new) | PASS |
| `node scripts/generate.mjs` (47 files) + `--check` | PASS |
| `--check` red after hand-editing `generated/theia-frontend-config.json`, green after regenerate | PASS (names the file, line 2) |
| `git diff --stat -- theia/` shows zero `src/**/*.ts` outside the read site | PASS (empty) |
| Tracked `package.json` `applicationName` == emitted fragment | PASS (surgical apply a no-op) |
| `tsc -b theia/extensions/branding` | PASS (exit 0) |
| `verify-branding-preflight.mjs` + `--self-test` (10 plants) | PASS |
| Combined fault (fallback deleted + channel broken) on real tree | FAIL as required (both messages), tree restored green |
| `verify-platform.sh --only branding-preflight` | PASS alone |
| `verify-platform.sh --quick` (37 checks, incl. scan-brand-residue) | PASS |

## Deferred Live Drill (for end-of-roadmap verification)

Not run in this plan (no app-bundle build in the autonomous static pass). Exact drill:

```sh
# 1. Fixture rebrand (temp copy of the manifest flow — or edit + revert):
#    set identity.display_name = "Acme Browser" in configuration.toml
node scripts/generate.mjs   # expect generated/theia-frontend-config.json -> "Acme Browser"
# 2. Surgical apply: set theia.frontend.config.applicationName in
#    theia/applications/browser/package.json to the fragment value only
yarn --cwd theia/applications/browser build   # app-bundle step ONLY, no tsc -b
# 3. Start the app, open the welcome tab: heading reads "Acme Browser"
# 4. git status --porcelain theia/ shows zero modified src/**/*.ts
# 5. Revert the fixture, regenerate, rebuild
```

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 04-02..04-04 build on D-04-01-01: add namespaced `powerbrowserBranding.*` string keys to the same `theia.frontend.config` block (emitter fragment grows key by key; widget/about read via the same provider call shape the preflight section 10 pins).
- 04-04 must decide the logo BINARY channel (out of scope for this string-key channel; see boundary note).
- The deferred live drill above is the one unverified half of the tracer; run it at end-of-roadmap verification before declaring GEN-05 green.

## Self-Check: PASSED

All created files found on disk; both task commits present in history; working tree clean under `theia/` and `scripts/` (verified before writing this SUMMARY).

---
*Phase: 04-theia-surface-branding-extensions-telemetry*
*Completed: 2026-09-04*
