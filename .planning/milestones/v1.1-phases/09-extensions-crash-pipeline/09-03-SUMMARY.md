---
phase: 09-extensions-crash-pipeline
plan: 03
subsystem: extensions
tags: [webextensions, ExtensionSettings, policies.json, agreement-gate, esr-signing]

# Dependency graph
requires:
  - phase: 09-extensions-crash-pipeline
    provides: [09-01 EXT-02 tracer chain, generator self-test and TARGETS-row conventions]
provides:
  - manifest [[webextensions]] table emitted as ExtensionSettings into tracked policies.json
  - verify-webextensions.mjs agreement gate with discriminating self-test
  - ESR unsigned-install mechanism confirmed at the pinned tag and recorded in the gate header
affects: [09-04 live drills, downstream WebExtension compositions]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
# Same estimateTokens scale (chars/4 over the realized diff), never a harness token count.
actuals:
  tokens: 12917
  tasks: 3
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns: [surgical-key copy-over into tracked policies.json, per-id both-directions gate comparison]

key-files:
  created: [scripts/verify-webextensions.mjs]
  modified: [scripts/generate.mjs, scripts/lib/config-schema.json, powerbrowser/distribution/policies.json, scripts/verify-platform.sh, docs/REBRANDING.md]

key-decisions:
  - "installation_mode is validator-owned enum (force_installed, normal_installed) with no schema regex, following the telemetry-level precedent; absence is a hard failure, never a silent default"
  - "install_url admits https and file only; https origins require allowlist coverage naming the host, file entries carry no network origin"
  - "ESR unsigned-install mechanism confirmed in-tree at the pinned tag (require_signing esr carve-out); header records it by reference, never restating the tag literal"
  - "Root manifest ships zero webextensions entries, so the tracked key rests at the empty object and every non-empty proof rides fixtures"

patterns-established:
  - "Per-id both-directions gate comparison over the ExtensionSettings map, so tracked drift, fragment drift, and stale keys each fail naming the add-on id"
  - "Gate header records version-sensitive upstream findings by file-and-rule reference, never by tag literal (tag-literal sweep)"

requirements-completed: [EXT-03]

# Coverage metadata (#1602) — one entry per shipped deliverable. Drives DETERMINISTIC UAT routing in verify-work.
coverage:
  - id: D1
    description: "Manifest webextensions table emits an ExtensionSettings fragment matching the tracked policies.json key, with unknown modes and malformed URLs failing naming the add-on id"
    requirement: "EXT-03"
    verification:
      - kind: unit
        ref: "node scripts/generate.mjs --self-test#58 planted faults all behaved as pinned (5 new webextensions cases)"
        status: pass
      - kind: unit
        ref: "node scripts/generate.mjs --check#53 generated files match configuration.toml"
        status: pass
    human_judgment: false
  - id: D2
    description: "Agreement gate proves discrimination: drifted tracked side, drifted fragment side, and stale key each go red naming the add-on id; uncovered fixture origin goes red naming the host"
    requirement: "EXT-03"
    verification:
      - kind: unit
        ref: "node scripts/verify-webextensions.mjs --self-test#4 planted faults all behaved as pinned"
        status: pass
      - kind: unit
        ref: "node scripts/verify-webextensions.mjs#tracked key, derived fragment, and origin coverage agree"
        status: pass
    human_judgment: false
  - id: D3
    description: "Registry carries the webextensions gate pair, gate header names the confirmed ESR signing mechanism, and the full EXT-03 proof (generator check, both self-tests, endpoint rows, commit gate) is green"
    requirement: "EXT-03"
    verification:
      - kind: unit
        ref: "scripts/verify-platform.sh --only webextensions#PASS"
        status: pass
      - kind: unit
        ref: "scripts/verify-platform.sh --only webextensions-self-test#PASS"
        status: pass
      - kind: unit
        ref: "scripts/verify-platform.sh --only theia-endpoints#PASS"
        status: pass
      - kind: unit
        ref: "scripts/verify-platform.sh --quick#PASS all checks passed"
        status: pass
    human_judgment: false

# Metrics
duration: 15min
completed: 2026-09-05
status: complete
---

# Phase 09 Plan 03: WebExtensions Declaration Summary

**Manifest `[[webextensions]]` table emitted as `ExtensionSettings` into the tracked `policies.json` with a discriminating agreement gate, ESR unsigned-install mechanism confirmed in-tree — zero bundled add-ons, commit gate green.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-09-05T08:13:11Z
- **Completed:** 2026-09-05T08:28:29Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Three `webextensions[].*` schema keys, `emitWebExtensionSettings` emitter plus derived-only `webextensions-settings.json` fragment row, and surgical copy-over setting only the `ExtensionSettings` key (three sibling keys byte-identical, empty table yields `{}` on both sides)
- `verify-webextensions.mjs` agreement gate deriving through the generator emitter: absent-fragment SKIP with always-on tracked-key equality, stale-key rejection, and an install_url origin coverage leg — 4 plants all red-naming with control-green-first
- Registry `webextensions` pair rows with per-pair comment plus honesty note; ESR signing posture confirmed against the pinned tag and recorded in the gate header; full proof green with the tracked allowlist and root manifest free of fixture data

## Task Commits

Each task was committed atomically:

1. **Task 1: Webextensions schema keys plus emitter plus surgical copy-over** - `dfe34fb` (feat)
2. **Task 2: Agreement gate with both-direction plants and allowlist leg** - `cc7c41b` (feat)
3. **Task 3: Registry rows plus ESR signing confirmation plus full EXT-03 proof** - `f0b7b73` (feat)

## Files Created/Modified
- `scripts/lib/config-schema.json` - `webextensions[].id` (add-on id shape), `webextensions[].installation_mode` (required, no regex — validator-owned enum), `webextensions[].install_url` (https-or-file shape) (modified)
- `scripts/generate.mjs` - mode enum, `validateWebExtensionElements`, `emitWebExtensionSettings`, `webextensions-settings.json` TARGETS row, 5 self-test cases (58 total) (modified)
- `powerbrowser/distribution/policies.json` - `ExtensionSettings: {}` key added, three existing keys byte-identical (modified)
- `scripts/verify-webextensions.mjs` - agreement gate with 4-plant self-test plus recorded ESR mechanism (created)
- `scripts/verify-platform.sh` - `webextensions` gate pair with per-pair comment and honesty note (modified)
- `docs/REBRANDING.md` - `[[webextensions]]` reference rows (Rule 3 fix: the derived docs-coverage gate failed without them) (modified)

## Decisions Made
- `installation_mode` follows the telemetry-level precedent exactly: schema carries type plus required but no regex, and `validateWebExtensionElements` owns the `force_installed`/`normal_installed` pair. Absence fails as a missing required key and unknown values fail listing the pair — there is deliberately no silent default, since an entry the policy engine cannot honour must never build.
- `install_url` admits the two sanctioned schemes only (`https://`, `file:///`). The gate's allowlist leg covers `https` origins (fail naming the host); `file:///` entries carry no network origin and skip that leg. Every emitted value passes the sink guard on the way out.
- The ESR mechanism was confirmed, not assumed: `require_signing` in `upstream/toolkit/moz.configure` returns `milestone.is_release_or_beta and not milestone.is_esr`, so `MOZ_REQUIRE_SIGNING` defaults off on ESR and `REQUIRE_SIGNING` stays a flippable `xpinstall.signatures.required` pref (`AddonSettings.sys.mjs`) — unsigned self-hosted `install_url` with no AMO publication. The header records this by file-and-rule reference, never restating the tag literal.
- Root manifest ships zero `[[webextensions]]` entries per the mechanism-only scope, so the tracked key rests at `{}` and every non-empty proof rides synthetic Acme fixtures in mkdtemp.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added REBRANDING.md rows for the three new schema keys**
- **Found during:** Task 1 (task verification via `--quick`)
- **Issue:** `verify-rebranding-docs` derives its expectation from the schema at check time: 3 new keys with no doc rows went red, failing the task's commit-gate leg
- **Fix:** Added a `[[webextensions]]` reference section with exact `webextensions[].*` code spans, mirroring the `[[extensions]]` table shape
- **Files modified:** docs/REBRANDING.md
- **Verification:** `verify-rebranding-docs` 40/40 documented, `--quick` PASS
- **Committed in:** dfe34fb (part of task commit)

**2. [Rule 1 - Bug] Reworded the gate header to reference the ESR tag instead of restating it**
- **Found during:** Task 3 (task verification via `--quick`)
- **Issue:** The mechanism note spelled the ESR tag literals, tripping the tag-literal sweep (`verify-upstream-pins`: the pin lives in `configuration.toml` alone) — `--quick` went red with the new gate named
- **Fix:** Header now names the `[upstreams] firefox_esr_tag` setting and `generated/upstream-pins.env` as the read site, keeping the file-and-rule provenance (moz.configure `require_signing`, `AddonSettings.sys.mjs`) with no literal
- **Files modified:** scripts/verify-webextensions.mjs
- **Verification:** `verify-upstream-pins` PASS, `--quick` PASS
- **Committed in:** f0b7b73 (part of task commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Gate-imposed doc sync plus a sweep-clean reword of the plan's own required header note. No scope creep, no new packages, no network touched.

## Issues Encountered
- Fixture `setupFixture` in the new gate wrote the tracked-policy copy before its parent dir existed (ENOENT on first self-test run); fixed by copying the tracked file into the fixture dir first — the same copy-then-drift shape the other gates use. Scratch-only, never committed.
- One `--quick` run mid-task showed a node loader trace in a piped tail; the immediate full rerun exited 0 with PASS and no FAIL lines, and all subsequent runs are green — treated as transient pipe noise, not a defect.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- EXT-03 mechanism half closed: downstreams declare `[[webextensions]]` entries, the generator emits `ExtensionSettings`, and the gate pins the tracked key plus origin coverage. The pending todo's curated-list half stays out per REQUIREMENTS.md:243.
- Plan 09-04 (live drills) can compose real downstream entries against this chain; the ESR mechanism string is recorded for its runbook.
- No blockers. No extension binaries vendored; no `distribution/extensions/` sideload directory; tracked allowlist holds no fixture hosts; root manifest holds no bundled entries.

## Self-Check: PASSED
- All six created/modified files exist on disk.
- All three task commits exist (`dfe34fb`, `cc7c41b`, `f0b7b73`).
- Task verify lines re-run green on the final tree: generate self-test (58 cases PASS), generate check (53 files PASS), webextensions self-test (4 plants + control PASS) and main gate PASS, `--only webextensions` / `--only webextensions-self-test` / `--only theia-endpoints` PASS, `--quick` PASS.
- Stub scan clean (no TODO/FIXME/placeholder or empty-value stubs in new code); threat surface fully inside the plan's T-09-07/08/09 register, so no Threat Flags section.

---
*Phase: 09-extensions-crash-pipeline*
*Completed: 2026-09-05*
