---
phase: 12-sql-store-build
plan: 03
subsystem: sql-store
tags: [sqlite, integrity-soak, second-writer-scan, verify-platform, esr-rebase]

# Dependency graph
requires:
  - phase: 12-sql-store-build plan 01
    provides: chrome-side writer with DDL markers, beside-registry key rule, temp-DB roundtrip proof
  - phase: 12-sql-store-build plan 02
    provides: readonly better-sqlite3 reader with the flag, chrome-side Places reads, absence instrument
provides:
  - second-writer negative scan over tracked source with readonly-reader allowlist, both-directions self-test
  - static-fixture plus live integrity soak ending exactly single-ok, one shared self-test
  - nine SQL-05 registry rows in the one driver with honest tier placement
  - live ESR rebase drill evidence over the new touchpoints with staged exact commands
affects: [startup trigger wiring (clears soak-live and absence-live STAGED), first tagged rebase run]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
# Same estimateTokens scale (chars/4 over the realized diff), never a harness token count.
actuals:
  tokens: 9900
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns: [tracked-source negative scan with basename self-exemption, static-live split halves sharing one self-test row, dry-run-at-newer-tag drill with staged live commands]

key-files:
  created: [scripts/verify-sql-store-second-writer.mjs, scripts/verify-sql-store-soak.mjs]
  modified: [scripts/verify-platform.sh]

key-decisions:
  - "Scan matches openConnection/Services.storage/new Database(/openDatabase with exact-paren spelling so node:sqlite DatabaseSync stage-copy scaffolding stays green by construction, reason recorded in the header"
  - "Scan script exempts itself by basename (boundary-guard precedent) because it must spell the shapes to match them; discrimination proved by self-test plants in other files"
  - "Soak default entry runs static only and never launches, keeping the base row honestly quick; --live is the separate full-tier row"
  - "Drill ran dry-run at the live newer tag (destructive re-clone staged, not executed locally per the rebase shared-state rule); no re-pin needed, nothing moved"

patterns-established:
  - "Gate-instrument self-exemption: a scan that must name its own shapes exempts its own basename and proves discrimination on planted files elsewhere"
  - "STAGED-exit-clean as registration proof for binary/wiring-dependent rows, with the exact rerun command printed"

requirements-completed: [SQL-05]

# Coverage metadata (#1602) — one entry per shipped deliverable. Drives DETERMINISTIC UAT routing in verify-work.
coverage:
  - id: D1
    description: "Second-writer negative scan over tracked source, green on the unmodified tree with both-directions self-test"
    requirement: "SQL-05"
    verification:
      - kind: other
        ref: "node scripts/verify-sql-store-second-writer.mjs && node scripts/verify-sql-store-second-writer.mjs --self-test"
        status: pass
    human_judgment: false
  - id: D2
    description: "Integrity soak static half ending exactly single-ok with tamper control, plus self-test; live half STAGED with exact rerun until startup wiring lands"
    requirement: "SQL-05"
    verification:
      - kind: other
        ref: "node scripts/verify-sql-store-soak.mjs (14/14) && node scripts/verify-sql-store-soak.mjs --self-test && node scripts/verify-sql-store-soak.mjs --live (STAGED)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Nine SQL-05 registry rows in the one driver with honest tier placement, quick green at closeout, registry-shape untouched"
    requirement: "SQL-05"
    verification:
      - kind: other
        ref: "scripts/verify-platform.sh --quick plus --only sampling of all five full-tier rows and gui04-registry-shape"
        status: pass
    human_judgment: false
  - id: D4
    description: "ESR rebase drill over the new touchpoints: dry-run rc=0 at the newer tag, patch surface unchanged, pins resolve, upstream diff empty, live commands staged"
    requirement: "SQL-05"
    verification:
      - kind: other
        ref: "scripts/rebase-upstream.sh --tag FIREFOX_153_2_0esr_RELEASE --dry-run (rc=0) + check-patch-surface.sh PASS + pin-anchor resolution"
        status: pass
    human_judgment: false

# Metrics
duration: ~5min
completed: 2026-09-05
status: complete
---

# Phase 12 Plan 03: Scan + Soak Instruments Summary

**Second-writer scan and integrity soak as proven instruments, nine SQL-05 registry rows with honest tiers, and the ESR rebase drill evidenced at the live newer tag**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-09-05T19:59:07Z
- **Completed:** 2026-09-05T20:03:49Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Second-writer negative scan walks 76 tracked files via git ls-files and reports clean, with a self-test proving both fault directions plus the empty-set guard
- Static soak interleaves 25 tab upserts with bookmark-shape writes across two WAL handles on stage copies only, ending exactly single-ok with the committed fixture byte-identical
- All four store gates run as nine registry rows in the one driver; quick green at closeout; registry-shape green; patch 020 untouched
- Rebase drill: newer tag FIREFOX_153_2_0esr_RELEASE confirmed live, dry-run rc=0, all 14 pinned anchors resolve, upstream diff empty, exact live commands staged below

## Task Commits

Each task was committed atomically:

1. **Task 1: Second-writer scan plus integrity soak with both-directions self-tests** - `2cf01f0` (feat)
2. **Task 2: Nine registry rows with honest tier placement and per-gate sampling** - `d0492b5` (feat)
3. **Task 3: Live ESR rebase drill over the new touchpoints with staged exact commands** - no tree change by design (drill evidence recorded here, covered by the docs commit)

**Plan metadata:** docs commit follows (complete plan)

## Files Created/Modified
- `scripts/verify-sql-store-second-writer.mjs` - Tracked-source scan (git ls-files, four own trees, node_modules/lib excluded, upstream never walked) with shell-dir and readonly-reader allowlists, empty-set-is-red, both-directions self-test
- `scripts/verify-sql-store-soak.mjs` - Static fixture interleave (default, quick-safe) plus temp-profile live drive (--live, STAGED until binary+wiring), one shared self-test, checkpoint-then-clean sidecars with gitignore assertion
- `scripts/verify-platform.sh` - Nine rows: four in the base quick array (scan, scan self-test, soak, soak self-test), five in the full-tier block (soak-live, roundtrip, roundtrip self-test, absence, absence self-test), each with an honesty comment

## Decisions Made
- Exact-paren `new Database(` spelling keeps node:sqlite `DatabaseSync` stage-copy scaffolding out of the scan by construction instead of by a third allowlist rule; the reason is recorded in the script header (threat T-12-12 scope note).
- The scan exempts its own basename (it must spell the shapes to match them), following the boundary guard's BOUNDARY_FILE_BASENAME precedent; --self-test plants faults in other files so the exemption weakens nothing.
- Soak default = static only: a base-row entry that launched when the binary exists could never honestly claim --quick, so the live half is opt-in via --live (same reason the absence script rides full-tier whole).
- Drill: dry-run at the live newer tag with the destructive re-clone staged rather than executed locally, per rebase-upstream.sh's shared-state rule (real path local-only-via-dry-run); the plan's own verify block grades the --dry-run composition, which is what ran.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Tampered-copy sidecars outlived the tamper artifact**
- **Found during:** Task 1 (soak static drive red on sidecars-cleaned)
- **Issue:** The readonly probe of the deliberately corrupted copy materialized `-wal`/`-shm` beside it; removing only the file left sidecars the final check counts
- **Fix:** Unlink the tamper file plus its `-wal`/`-shm`/`-journal` sidecars (no checkpoint -- the file is corrupt by design), with a comment saying so
- **Files modified:** scripts/verify-sql-store-soak.mjs
- **Verification:** Static drive 14/14 green, no stage residue (`ls /tmp/pb-tabs-soak-*` empty)
- **Committed in:** 2cf01f0 (part of task commit)

**2. [Rule 3 - Blocking] Self-test plant directory did not exist**
- **Found during:** Task 1 (scan self-test ENOENT writing the theia plant)
- **Issue:** Plant 2/positive write under `<stage>/theia/` before the subdirectory exists
- **Fix:** `mkdirSync(join(stage, 'theia'), { recursive: true })` after mktemp
- **Files modified:** scripts/verify-sql-store-second-writer.mjs
- **Verification:** Scan self-test green, all four cases report
- **Committed in:** 2cf01f0 (part of task commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both required for green instruments. No scope creep; no GUI surface; no patch change.

## Rebase Drill Log (Task 3 evidence)

Tag query (2026-09-05, live remote): pinned `FIREFOX_153_1_0esr_RELEASE`, newest `FIREFOX_153_2_0esr_RELEASE` -- a newer tag exists, so the drill ran at the newer tag with the destructive re-clone staged per the shared-state rule.

- `scripts/rebase-upstream.sh --tag "FIREFOX_153_2_0esr_RELEASE" --dry-run` -- rc=0; step 1 confirms the newer tag present on the remote; full log at `/tmp/rebase-drill.log` (outside the repo, no tree artifact).
- Drill item 1 (patch surface unchanged): `scripts/check-patch-surface.sh` PASS (2 patches); patch 020 carries exactly its single added `DIRS += ["../powerbrowser/shell"]` line; `git status` shows no `patches/` change -- the store adds no patch surface.
- Drill item 2 (pins resolve): all 14 anchors re-resolved in the current tree -- `Sqlite.sys.mjs` openConnection/getSchemaVersion/executeTransaction/clone/backupToFile, `PrivateBrowsingUtils.sys.mjs` isWindowPrivate, `SessionStore.sys.mjs` getBrowserState, `SessionSaver.sys.mjs` sessionstore-state-write-complete, Places `History.fetch`/`Bookmarks.fetch`/`getFolderContents`, `tabbrowser.js` TabOpen, `sqlite3.h` SQLITE_VERSION, `browser.js` getEnumerator. Nothing moved -- no same-commit re-pin needed.
- Drill item 3 (gates green): `scripts/verify-platform.sh --quick` PASS on the final tree, including the four new base rows; all five full-tier rows PASS via `--only` sampling.
- Drill item 4 (upstream diff empty): `git -C upstream diff --quiet` exits 0 -- no hand-edit smuggled in during the drill.

Staged exact live commands for the first tagged run (TAG resolved):

```sh
scripts/rebase-upstream.sh --tag "FIREFOX_153_2_0esr_RELEASE"
scripts/rebase-upstream.sh --tag "FIREFOX_153_2_0esr_RELEASE" --dry-run  # re-check first if the tree moved
TAG=FIREFOX_153_2_0esr_RELEASE scripts/fetch-upstream.sh
```

Operator follow-up after the real rebase (per the dry-run step 6): run `scripts/toolchain-baseline.sh` under `nix develop .#firefox` and diff against `toolchain-baseline.txt`.

## Issues Encountered
- Soak-live and absence-live both report STAGED (binary present at objdir/dist/bin/powerbrowser, but no startup call into ensureTabStore/startTabStoreTriggers in powerbrowser.js or TheiaService.sys.mjs) -- the known wiring item, not a defect in the instruments. STAGED-exit-clean counts as registration proof per the plan.
- Pre-existing working-tree modification to `theia/extensions/tab-uris/src/node/tab-query-service.ts` (type-annotation simplification, readonly flag intact) was left untouched -- out of scope for this plan.

## Threat Flags

None - no new surface beyond the plan's threat model. Scan enforces the two-rule allowlist with both-directions proof (T-12-12, T-12-13); soak mutates mktemp stage copies only with byte-identity asserts and checkpoint-then-clean sidecars (T-12-14); drill re-resolves every pinned line with empty upstream diff (T-12-15); all instruments derive from the tree with non-vacuity guards (T-12-16). New scripts introduce no network, no endpoints, no profile writes.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Wiring `ensureTabStore` plus `startTabStoreTriggers` at shell startup clears the soak-live and absence-live STAGED conditions; both rows then drive for real with no registry change.
- First tagged rebase onto FIREFOX_153_2_0esr_RELEASE runs the staged commands above (operator/CI dispatch -- the destructive re-clone is deliberately not executed in-plan).
- Phase 12 closeout: writer (12-01), reads (12-02), and gates (this plan) all land with the drill evidence the verifier consumes; no GUI surface, no manifest flag, no engine beyond SQLite.

---
*Phase: 12-sql-store-build*
*Completed: 2026-09-05*

## Self-Check: PASSED
- FOUND: scripts/verify-sql-store-second-writer.mjs (230 lines), scripts/verify-sql-store-soak.mjs (450 lines)
- FOUND: 9 sql-store- rows in scripts/verify-platform.sh (4 base + 5 full)
- FOUND: 2cf01f0, d0492b5 in git log
- Scan green over 76 files + self-test green; soak 14/14 + self-test green + live STAGED; quick green; registry-shape green; upstream diff empty; no sidecars tracked; fixture byte-identical
