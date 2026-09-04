---
phase: 06-two-layer-verification-and-rebranding-docs
plan: 06
subsystem: verification
tags: [ver-01, ver-02, doc-01, ci, verify-workflow, phase-close]

# Dependency graph
requires:
  - phase: 06-two-layer-verification-and-rebranding-docs
    provides: 06-01 literal scan, 06-02 retargeted runtime check, 06-03 trademark gate, 06-04 legal-notice channel, 06-05 rebranding-docs gate
  - phase: 02-configuration-manifest-and-generator-core
    provides: 02-06 load-bearing generate/--check/byte-identity order the CI steps follow
provides:
  - .github/workflows/verify.yml push/PR CI running generate, --check, and the --quick table
  - Full local gate record (87-row --quick table, live six-surface dev run, staged drills)
  - ROADMAP Phase 6 plan list reflecting all six plans
affects: [verify-work, downstream-rebrand, phase-7]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
actuals:
  tokens: 1500
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns: [ci-mirrors-commit-gate, exclusions-named-with-drills]

key-files:
  created: [.github/workflows/verify.yml]
  modified: [.planning/ROADMAP.md]

key-decisions:
  - "CI runs the same three commands developers run locally (generate, --check, --quick), in the 02-06 order, through the one driver — no second gate definition to drift"
  - "Runtime-behind-build rows excluded by named comment with local drill each, never silently skipped"
  - "No setup-node step: the runner's node runs the scripts directly, the rebase-upstream.yml precedent"
  - "ROADMAP Phase 6 stays In Progress at 6/6 (Phase 4/5 precedent) — verification deferred per standing instruction"

patterns-established:
  - "CI-mirrors-commit-gate: the workflow invokes verify-platform.sh --quick rather than restating its rows"
  - "Exclusions-named-with-drills: every CI exclusion carries its reason plus the exact local command and prerequisite"

requirements-completed: [VER-01, VER-02, DOC-01]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "Push/PR workflow runs generate, --check, --quick in order with WR-09 token posture; exclusions commented with reasons"
    requirement: "VER-01"
    verification:
      - kind: unit
        ref: "node structural check#order generate < --check < --quick plus grep pins"
        status: pass
    human_judgment: false
  - id: D2
    description: "Full local --quick table green with all Phase 6 rows present"
    requirement: "VER-01"
    verification:
      - kind: manual_procedural
        ref: "scripts/verify-platform.sh --quick#87 PASS rows, all checks passed"
        status: pass
    human_judgment: false
  - id: D3
    description: "Live six-surface dev-variant run green against objdir/dist/bin/powerbrowser"
    requirement: "VER-02"
    verification:
      - kind: manual_procedural
        ref: "node scripts/verify-branding-identity.mjs --variant dev#all six surfaces PASS"
        status: pass
    human_judgment: false
  - id: D4
    description: "Release-variant six-surface proof against an objdir-release build"
    requirement: "VER-02"
    verification: []
    human_judgment: true
    rationale: "Needs a tier-3 release build (objdir-release/ absent on this tree); the drill was run and fails honestly naming the missing paths. Run at verify-work after a release build exists."
  - id: D5
    description: "ROADMAP Phase 6 plan list reflects the six plans with their objectives"
    requirement: "DOC-01"
    verification:
      - kind: other
        ref: ".planning/ROADMAP.md#Phase 6 section lists 06-01..06-06 with objectives, progress 6/6"
        status: pass
    human_judgment: false

# Metrics
duration: ~2min
completed: 2026-09-04
status: complete
---

# Phase 6 Plan 06: CI Wiring and Phase Close Summary

**Push/PR workflow running generate, `--check`, and the 87-row `--quick` table, full local gate green plus live six-surface dev proof, exclusions named with staged drills**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-09-04T09:38:05Z
- **Completed:** 2026-09-04T09:39:37Z
- **Tasks:** 2 auto complete
- **Files modified:** 2

## Accomplishments
- `.github/workflows/verify.yml` (85 lines): `push` + `pull_request` trigger, `contents: read` + `persist-credentials: false` (WR-09/T-06-06 posture stated in-file), checkout then generate → `--check` → `--quick` in the load-bearing 02-06 order, exclusions comment naming each runtime-behind-build row with its reason and local drill
- Full local gate green: `generate --check` PASS (52 files), `--quick` 87 PASS rows with all ten Phase 6 rows present, live dev-variant six-surface run all PASS
- Every Phase 6 `--self-test` green (five via registry rows, `verify-branding-identity --self-test` direct)
- ROADMAP Phase 6 plan list updated to the six plans with objectives; progress row 2/6 → 6/6, status kept In Progress per the Phase 4/5 verification-deferred precedent

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the verify workflow for the static layers** - `6542618` (feat)
2. **Task 2: Run the full phase gate locally and record close-out** - ROADMAP edit, commit follows with SUMMARY (docs)

**Plan metadata:** covered by the task commits above (no separate docs commit; SUMMARY commit follows)

## Files Created/Modified
- `.github/workflows/verify.yml` - Push/PR CI: generate, --check, --quick in order; token posture; named exclusions with drills
- `.planning/ROADMAP.md` - Phase 6 section only: six-plan list with objectives, progress 6/6

## Decisions Made
- CI invokes the one driver (`verify-platform.sh --quick`) rather than restating rows — the workflow cannot drift from the commit gate
- No `setup-node` step: follows the rebase-upstream.yml precedent of running the runner's `node` directly; no Nix, no tier-3 build, same as the rebase job
- Exclusions named per row-group with the exact local drill command and prerequisite, so "stays out of CI" is never "silently skipped"
- ROADMAP keeps `In Progress` at 6/6: Phases 4 and 5 set the precedent (4/4 rows still In Progress) while verification is deferred per the standing instruction; requirement-status flips belong to verify-work

## Deviations from Plan

None - plan executed exactly as written. (The release-variant drill's FAIL on the absent `objdir-release/` tree is the staged honest outcome the plan asks to record, not a defect.)

## Issues Encountered
None. No file edits beyond the workflow (task 1) and the ROADMAP Phase 6 section (task 2) — the gate exposed no defect. No stubs; no new network/auth/file-access surface (T-06-06 mitigated by construction, stated in the workflow).

## Full Local Gate Record (Task 2)

`node scripts/generate.mjs --check` → PASS, all 52 generated files match `configuration.toml`.

`scripts/verify-platform.sh --quick` → `verify-platform: PASS -- all checks passed`, 87 `: PASS` rows, including all ten Phase 6 rows:

| Row | Result |
|---|---|
| scan-brand-residue (+self-test) | PASS — 140 files, no residual occurrence |
| branding-preflight (+self-test) | PASS — 23 plants red naming each drift |
| verify-manifest-literals (+self-test) | PASS — 150 files, 122 occurrences all allowlisted, 41 entries all fresh |
| verify-trademark-surface (+self-test) | PASS — 5 plants red |
| verify-rebranding-docs (+self-test) | PASS — 35/35 fields, 4 commands |
| theia-branding (+self-test) | PASS |
| theia-endpoints (+self-test) | PASS |
| telemetry (+self-test) | PASS |
| extension-pins (+self-test) | PASS |
| verify-upstream-pins (+self-test) | PASS |

`node scripts/verify-branding-identity.mjs --variant dev` → all six surfaces PASS against `objdir/dist/bin/powerbrowser`:

| Surface | Observed vs expected (exact equality) |
|---|---|
| executable | `objdir/dist/bin/powerbrowser` executable, no `firefox` file |
| application-ini | Name=`powerbrowser`, Vendor=`DeBIOS` |
| runtime-identity | name=`powerbrowser`, vendor=`DeBIOS`, version=`153.1.0esr` (diagnostics cross-check skipped — no chrome-context driver, WINDOWS.md #7) |
| brand-full-name | `Power Browser Dev` in both brand.ftl and brand.properties |
| desktop-entry | Name=`Power Browser Dev`, StartupWMClass=`powerbrowser` |
| version | `--version` = `DeBIOS powerbrowser 153.1.0esr` |

Direct self-tests: `verify-branding-identity.mjs --self-test` PASS (control both variants + scratch-manifest drift fault).

## Staged Drills (not run green — prerequisites absent)

Release-variant live drive (staged; prerequisite: a release build at `objdir-release/dist/bin/powerbrowser` plus its `config.status`):

```sh
node scripts/verify-branding-identity.mjs --variant release
```

Observed without the prerequisite (honest FAIL naming the missing paths): brand-full-name PASS (`Power Browser` in both release locale files); desktop-entry FAIL (`objdir-release/config.status does not exist`); version FAIL (`objdir-release/dist/bin/application.ini does not exist`).

CI-runtime drill (replays exactly what the new workflow runs; prerequisite: fresh clone so `generated/` is absent, `node` on PATH, no Nix):

```sh
node scripts/generate.mjs
node scripts/generate.mjs --check
scripts/verify-platform.sh --quick
```

Run here on the working tree in the same order (fresh-clone replay not performed — no second checkout materialised): all three green as recorded above.

Tier-3 full run (staged; prerequisite: built dev tree + display for the live-launch rows):

```sh
scripts/verify-platform.sh
bash scripts/verify-endpoints.sh   # layers 2 (strace) and 3 (MOZ_LOG network) need display + live browser
```

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 6 static half of success criterion 4 is wired: the next push exercises generate → --check → --quick in CI. (Not triggered by this plan — workflow-file commit only, no dispatch.)
- Open for verify-work: release-variant six-surface proof after a release build; the deferred 06-03 human artwork ritual; D4 human walkthrough of `docs/REBRANDING.md` end to end.
- Known tier-3 follow-up carried from 06-04: `verify-branding.mjs` needs a legal-notice-aware `assertDisplayForm` for the About surface.

## Self-Check: PASSED
- `.github/workflows/verify.yml` FOUND (85 lines); step order generate < --check < --quick confirmed by node + grep; token posture lines present; exclusions comment present
- Commit `6542618` FOUND in log, no deletions
- ROADMAP Phase 6 section lists 06-01..06 with objectives; progress row reads 6/6
- Gate outputs above copied from the actual runs in this session

---
*Phase: 06-two-layer-verification-and-rebranding-docs*
*Completed: 2026-09-04*
