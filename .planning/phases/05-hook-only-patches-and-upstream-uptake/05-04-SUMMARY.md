---
phase: 05-hook-only-patches-and-upstream-uptake
plan: "04"
subsystem: patches
tags: [upstream-uptake, drift-fixtures, rebase-dry-run, UPD-01]

# Dependency graph
requires:
  - phase: 05-hook-only-patches-and-upstream-uptake
    provides: 05-01 hook-only stack plus non-vacuity assertion, 05-02 single-sourced ESR pin plus agreement check, 05-03 Theia pin plus re-pin procedure
provides:
  - Red-capable hermetic proof for every drift class (conflict, silent adoption, unaccounted dirt)
  - Dry-run proof of the uptake path against the manifest pin plus CI dispatch readiness
  - Staged live-drill commands (UNEXECUTED) with named prerequisites
affects: []

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
actuals:
  tokens: 700
  tasks: 2
  commits: 1

# Tech tracking
tech-stack:
  added: []
  patterns: [conflict-branch self-test via unrelated-content throwaway repo, cite-passing-output instead of redundant fixtures]

key-files:
  created: []
  modified:
    - scripts/apply-patches.sh

key-decisions:
  - "Real-conflict class gets a permanent third self-test case (first-branch coverage); silent-adoption and dirt classes are cited from existing passing output, not duplicated"
  - "3-way-clean context shift is correct-apply behavior, not drift: no fixture added, backstops named (surface plus brand scans plus fetch re-check, all composed in rebase-upstream.sh)"
  - "Workflow read-through found no prose or ordering defect, so no workflow edit; task 2 commits nothing"

patterns-established:
  - "Drift-class to proof mapping kept in the SUMMARY so a future class without red-capable proof is visible as a gap, not an assumption"

requirements-completed: [UPD-01]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "Every drift class maps to a red-capable hermetic proof; 3-way-clean apply documented as correct with named backstops"
    requirement: "UPD-01"
    verification:
      - kind: other
        ref: "bash scripts/apply-patches.sh --self-test (first apply PASS, second-apply rejection PASS, conflict-drifted rejection PASS)"
        status: pass
      - kind: other
        ref: "bash scripts/fetch-upstream.sh --self-test (pristine/fully-applied PASS, unaccounted-dirt + missing-patch reject naming fileC / 020-b.patch)"
        status: pass
      - kind: other
        ref: "bash scripts/check-patch-surface.sh --self-test (compiled plant + brand plant red naming patch and value; shipped stack green control)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Uptake path drilled short of the clone; dry-run green against the manifest pin; live drill staged as exact UNEXECUTED commands"
    requirement: "UPD-01"
    verification:
      - kind: other
        ref: "bash scripts/rebase-upstream.sh --tag FIREFOX_153_1_0esr_RELEASE --dry-run (exit 0, ls-remote tag-existence gate only network)"
        status: pass
      - kind: other
        ref: "node scripts/verify-upstream-pins.mjs plus --self-test (agreement PASS, 4 plants red naming the file)"
        status: pass
      - kind: other
        ref: "scripts/verify-platform.sh --quick (50 rows PASS, 0 FAIL)"
        status: pass
    human_judgment: false

# Metrics
duration: 10min
completed: 2026-09-04
status: complete
---

# Phase 05 Plan 04: Uptake-Path Proof and Staged Live Drill Summary

**Drift fails loudly by patch name on all three classes with hermetic red-capable proof, the rebase drill is green short of the clone against pin `FIREFOX_153_1_0esr_RELEASE`, and the live rebase plus branded build are staged as exact UNEXECUTED commands**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-09-04T08:28:00Z
- **Completed:** 2026-09-04T08:38:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- `apply-patches.sh --self-test` gains a third hermetic case: conflict-drifted content rejects by patch name through the wrapper's first (real-conflict) branch
- Silent-adoption and unaccounted-dirt classes cited from existing passing self-test output — no redundant fixtures added
- 3-way-clean context shift documented as correct-apply behavior with its backstop chain named (all already composed in `rebase-upstream.sh`)
- `rebase --dry-run` green against the manifest pin; workflow read-through confirms pin mirror plus fail-fast ordering plus post-replay byte-identity; full `--quick` 50 rows PASS, 0 FAIL
- Live drill staged as exact commands marked UNEXECUTED with the two prerequisites planning deliberately leaves open

## Task Commits

1. **Task 1: Prove loud failure on drift with hermetic fixtures** - `7831990` (feat)
2. **Task 2: Drill the uptake path short of the clone and stage the live steps** - no commit (read-through clean, no prose or ordering defect found; drill runs are verification output, not tree changes)

**Plan metadata:** final docs commit follows (gsd-tools query commit)

## Drift-Class to Proof Mapping

| Drift class | Gate | Proof (new or cited) |
|---|---|---|
| Real conflict — patch context no longer matches the target | `apply_patch_with_assertion` first branch (`git apply --3way` fails → `FAIL -- <name> did not apply (real conflict, not silent)`) | NEW: third `--self-test` case — throwaway repo with unrelated content at `browser/moz.configure`, asserts rejection names `010-powerbrowser-identity.patch` |
| Silent adoption — upstream already carries the change, apply exits 0 changing nothing | Same function, second branch (before/after blob-hash equality → `FAIL -- <name> ... changed nothing (D-75 ...)`) | CITED: existing second-apply self-test PASS (`--self-test PASS -- second apply ... correctly rejected by name`) |
| Unaccounted dirt — tree dirty outside the patch stack | `classify_upstream_dirt` in `fetch-upstream.sh` | CITED: existing `--self-test` cases 3 (unaccounted-dirt, names `fileC` + remediation) and 4 (missing-patch, names `020-b.patch`) |
| Missing brand-value / compiled-surface regression after replay | `check-patch-surface.sh` (compiled scan + brand-value mode) | CITED: existing `--self-test` + `--self-test-brand` (plants red naming patch/path/value; shipped stack green control) |

### The 3-way-clean case is correct behavior, not drift

A context shift that `git apply --3way` still resolves cleanly applies the hook with exit 0 and changed hashes — the non-vacuity assertion passes, as it should: the hook landed. No fixture was added for this class because there is nothing to reject. The backstop chain for what such a clean-but-moved replay could hide is already composed in `rebase-upstream.sh` and runs in order on every live rebase: step 3 replay (`apply-patches.sh`), step 4 surface check (`check-patch-surface.sh`: compiled targets plus brand values), step 4b `scan-brand-residue.mjs --extra-root "$UPSTREAM_DIR"` (reintroduced brand strings in the replayed tree), step 5 fetch re-check (`TAG=<new-tag> fetch-upstream.sh`: fully-applied state at the new tag, not the manifest pin). A cleanly-merged hook that reintroduces a value or a brand string goes red at step 4/4b naming it.

## Workflow Read-Through (Task 2)

`.github/workflows/rebase-upstream.yml` read end to end; no prose or ordering defect found, so no edit (plan: fix defects, do not restructure):

- Pin mirror: input `tag` default `FIREFOX_153_1_0esr_RELEASE` equals the manifest pin (`configuration.toml [upstreams] firefox_esr_tag`); `verify-upstream-pins.mjs` PASS covers the agreement including this mirror, and its self-test proves a drifted mirror goes red naming the workflow file.
- Fail-fast ordering before the replay: residue scan (no `--extra-root` — correct, no tree exists yet at that point) → `generate.mjs` → `--check` (idempotence, not freshness-on-empty) → byte-identity → free disk → rebase. Matches the load-bearing order comments.
- The rebase step runs the full (non-dry-run) `rebase-upstream.sh --tag "$REBASE_TAG"`, which internally performs the post-replay chain (surface, residue `--extra-root`, fetch re-check, overlay assertion).
- Post-replay observation present: `verify-generated-identity.mjs` re-run after the replay — the only generator step that can observe what the replay did.

## Staged Live Drill — UNEXECUTED Commands

NOT run in this plan (no fetch, no clone, no build ran here). Prerequisites planning deliberately leaves open: **a real next ESR tag** (the manifest pin is current; there is no newer tag to adopt yet) and **CI minutes** (05-02/05-03 precedent: network exists, but planning does not spend clone/build time).

When a next ESR tag exists, in order:

```sh
# 1. CI dispatch (preferred): dispatch the "Rebase upstream" workflow
#    (workflow_dispatch) with input tag = <new-pin>, e.g. via:
gh workflow run "Rebase upstream" --ref <default-branch> -f tag=<new-pin>
```

```sh
# 2. Local equivalent (operator run, replaces the dry-run proven here):
TAG=<new-pin> bash scripts/rebase-upstream.sh --tag <new-pin>
```

```sh
# 3. Toolchain-baseline diff (PITFALLS #2), per the dry-run step-6 pointer:
nix develop .#firefox --command bash scripts/toolchain-baseline.sh
diff toolchain-baseline.txt <fresh-output>
```

```sh
# 4. Tier-3 branded build plus built-artifact branding proof, per the 03-04
#    precedent (dev variant, ~47-54 min reference timing on the reference host):
#    docs/BUILD.md procedure, then the built-artifact branding proof 03-04 used.
```

Manifest-first rule for the live drill (05-02/05-03 wiring): edit `configuration.toml [upstreams] firefox_esr_tag` first, mirror the workflow default second, then `node scripts/generate.mjs`, then the drill above — the agreement check fails loudly if the mirror step is skipped.

## Files Created/Modified
- `scripts/apply-patches.sh` - `run_self_test` third case: conflict-drifted throwaway repo asserts first-branch rejection naming the patch; second-apply tail restructured into if/else so execution continues to the new case (additive, no behavior change to shipped logic)

## Decisions Made
- Permanent fixture for the real-conflict branch (it had zero automated coverage and is one of T-05-07's claimed gates); citations, not fixtures, for the two classes whose self-tests already prove them — the plan's own "do not duplicate" rule.
- No fixture for the 3-way-clean class: clean resolution is the tool working, and its risks are covered by four already-composed post-replay gates. Adding a "must fail" test for a must-pass behavior would be a gate that trains readers to ignore it.
- No workflow edit: read-through found the mirror, ordering, and post-replay observation all as documented. A no-change task commits nothing rather than an empty commit.

## Deviations from Plan

None - plan executed exactly as written. The `--self-test` extension is plan-authorized work (task 1 names extending the self-test as an explicit option), not a deviation. No hand-edit of any patch hunk; `upstream/` was read from (`cp` as a fixture source in already-shipped self-test code paths plus one read-only probe) and never written; no fetch, clone, or build ran.

## Issues Encountered
- None. The `ls-remote` tag-existence gate inside `--dry-run` ran live (network available) and confirmed `FIREFOX_153_1_0esr_RELEASE` present; no clone was triggered.

## Known Stubs
None - stub-pattern grep over the plan diff is clean.

## Threat Flags
None - no new network endpoints, auth paths, file-access patterns, or schema changes at trust boundaries. T-05-07 posture strengthened: the real-conflict rejection branch is now fixture-proven red-capable like the other three gates (silent-drop assertion, dirt classifier, surface/brand scans). T-05-08 unchanged (accepted): an unresolvable conflict still aborts loudly by patch name with remediation output; operator regenerates from the patched tree.

## Open Verification (phase known-open)

- The staged live drill above (rebase onto a real next ESR tag + toolchain diff + tier-3 branded build) is the phase's known-open verification: statically everything short of the clone is green; the full uptake path turns green when the drill runs. Blocked on a next ESR tag existing, not on tree state.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- UPD-01 proven as far as statically provable; CFG-06 complete (05-02 ESR half, 05-03 Theia half); MIG-05 hook-only stack unchanged and green
- Phase goal met in full when the staged drill runs green (recorded above as the phase's known-open verification)

## Self-Check: PASSED
- Modified file exists on disk with the new case (`scripts/apply-patches.sh`, conflict-drifted PASS line observed in green run).
- Task commit exists: 7831990. Task 2 correctly commits nothing (no tree change).
- `upstream/` unmodified by this plan (read-only fixture sourcing only); no stray scratch dirs (`git status` shows only pre-existing planning-tree entries plus the committed script edit).

---
*Phase: 05-hook-only-patches-and-upstream-uptake*
*Completed: 2026-09-04*
