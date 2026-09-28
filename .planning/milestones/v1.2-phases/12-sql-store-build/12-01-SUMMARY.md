---
phase: 12-sql-store-build
plan: 01
subsystem: sql-store
tags: [sqlite, chrome-writer, boundary, triggers, key-rule, roundtrip]

# Dependency graph
requires:
  - phase: 11-sql-store-design
    provides: [signed schema plus migration plan with exercise log, review-sign gate with Phase 12 handoff]
provides:
  - chrome-side writer behind the sole boundary with private filter, DDL markers, and catalogue rows
  - stock-window triggers plus sessionstore sweep with no new channel and no actor
  - beside-registry browser-tab key rule with the frozen registry untouched
  - temp-DB roundtrip proof with both-directions self-test
affects: [12-02 read paths and absence gate, 12-03 registry-row promotion]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
# Commit SHAs below are taken from `git log --oneline --grep="12-01"`.
actuals:
  tokens: not established
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns: [boundary-only writer with marker-delimited verbatim DDL, beside-registry key emission, derive-don't-duplicate roundtrip proof]

key-files:
  created: [theia/extensions/tab-uris/src/browser/browser-tab-uri.ts, scripts/verify-sql-store-roundtrip.mjs]
  modified: [powerbrowser/shell/PowerBrowserAPI.sys.mjs, powerbrowser/INTERNAL-APIS.md, inventory/brand-tokens.json]

key-decisions:
  - "All writer logic stays inside the sole boundary file: no new sys.mjs helper module, because the boundary guard would forbid it from touching Sqlite directly"
  - "Browser-tab key rule as one line (webview scheme prefix plus URL spec), implemented identically chrome-side and in the beside-registry module"
  - "Roundtrip script derives the DDL from writer-source markers at check time and fails distinctly when the markers are absent"

patterns-established:
  - "Downgrade refusal pinned statically by deriving the version-comparison branch from the writer source"
  - "Residue census moves by documented COUNT MOVED with nothing renumbered or deleted"

requirements-completed: [SQL-01]

# Coverage metadata (#1602) — one entry per shipped deliverable. Drives DETERMINISTIC UAT routing in verify-work.
coverage:
  - id: D1
    description: "Single chrome-side writer behind the sole boundary with open, write, remove, read, and prune wrappers plus private filter, tripwire, and quarantine"
    requirement: "SQL-01"
    verification:
      - kind: other
        ref: "node --check plus internals-catalogue plus scripts/verify-platform.sh --quick"
        status: pass
    human_judgment: false
  - id: D2
    description: "Live triggers feeding the writer plus beside-registry key rule plus temp-DB roundtrip proof with self-test"
    requirement: "SQL-01"
    verification:
      - kind: other
        ref: "node scripts/verify-sql-store-roundtrip.mjs plus --self-test plus --only gui04-registry-shape"
        status: pass
    human_judgment: false

# Metrics
duration: 4min
completed: 2026-09-05
status: complete
---

# Phase 12 Plan 01: Chrome-Side Writer Summary

**Single chrome-side writer behind the sole boundary with triggers, the beside-registry key rule, catalogue rows, and a temp-DB roundtrip proof**

## Performance

- **Duration:** ~4 min (first to last plan commit, 12:37 to 12:41 -0700 on 2026-09-05)
- **Started:** 2026-09-05
- **Completed:** 2026-09-05
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Writer slice in `PowerBrowserAPI.sys.mjs`: Sqlite, PrivateBrowsingUtils and SessionStore lazy imports; verbatim v1 DDL in marker-delimited constant; WAL pin outside the transaction with read-back assert; version guard (zero creates, head migrates, newer refuses); bound parameters on every statement; private-window check before every upsert; exact single-ok tripwire; quarantine with N=max+1 allocator, sidecar cleanup, and one-transaction rebuild from sessionstore
- Triggers in the same boundary file: per-stock-window tab listeners plus a sessionstore-state-write-complete bounded sweep, with no new Theia-to-chrome channel and no actor registration
- Beside-registry key module (`browser-tab-uri.ts`, 28 lines at its commit): pure one-line rule with zero imports from the registry file and zero new public members on TabUriRegistry; the frozen files stayed byte-identical
- Roundtrip proof (`verify-sql-store-roundtrip.mjs`, 465 lines at its commit): DDL derived from writer markers, 23 drives on a temp DB outside the repo, static downgrade pin, both-directions self-test; the seven Phase 11 fixes from the fix range `caea0de..4bbdf7f` (marked clean in `23ca996`) as stated in the plan

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end writer slice** - `7fce976` (feat)
2. **Task 2: Triggers plus beside-registry key rule plus temp-DB roundtrip proof** - `8ddc75e` (feat)

**Commit SHAs verified with `git log --oneline --grep="12-01"`. Where a fact below cannot be established from the evidence, that is stated instead of guessed.**

## Files Created/Modified
- `powerbrowser/shell/PowerBrowserAPI.sys.mjs` - Three new lazy imports plus open, write, remove, read, and prune wrappers; writer triggers; verbatim v1 DDL constant inside marker comments (+361 lines in the writer commit, +104 in the trigger commit)
- `powerbrowser/INTERNAL-APIS.md` - One catalogue row per new touchpoint with exact file:line plus the SessionStore amendment (writer commit) and trigger touchpoint rows (trigger commit)
- `theia/extensions/tab-uris/src/browser/browser-tab-uri.ts` - Beside-registry browser-tab key emission (new, 28 lines). The file is absent from the current tree; when and why it was removed cannot be established from the plan file or the commit record alone and is not stated here.
- `scripts/verify-sql-store-roundtrip.mjs` - Temp-DB roundtrip proof with self-test (new, 465 lines). The current file is 171 lines; later development changed it, and the per-change history is not traced in this summary.
- `inventory/brand-tokens.json` - Residue census 28->31 with named reconciliation (writer commit) and 31->34 (trigger commit)

## Decisions Made
- Writer logic lives only in the boundary file: a helper module could not legally touch Sqlite under the boundary guard, so every wrapper lives in `PowerBrowserAPI.sys.mjs`
- The browser-tab key rule is one line — the `webview:` scheme spelling from existing-scheme-coverage plus the tab URL spec, bound opaquely and never parsed chrome-side — implemented identically in both places, with the roundtrip script asserting both spell the same scheme
- The roundtrip script drives a `node:sqlite` built-in handle against a mktemp stage outside the repo at a space-free path; the committed tree stays untouched, with checkpoint-then-clean sidecar removal after handles close

## Deviations from Plan

None established — the two task commits match the two plan tasks in order, and each commit message records the catalogue and residue steps the plan requires. Whether faults or fixes beyond the committed content arose during execution cannot be established from the commit record and is not stated here.

## Issues Encountered
- The wall-clock duration of each task cannot be established from the plan file or the commit record beyond the 4-minute span between the two commit timestamps; per-task durations are not stated here.

## Threat Flags

None established from the plan file or the commit record — the plan's threat register (T-12-01 through T-12-06) records mitigations only, and whether new threats surfaced during execution cannot be established and is not stated here.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 12-02 consumes the writer wrappers and the roundtrip script: read paths query rows this plan writes, and the absence gate drives the private filter this plan implements
- Plan 12-03 promotes the roundtrip scaffolding to a registry row and lands the remaining SQL-05 gates

---
*Phase: 12-sql-store-build*
*Completed: 2026-09-05*

## Self-Check: PASSED
- FOUND: powerbrowser/shell/PowerBrowserAPI.sys.mjs (writer + triggers landed per commit stats)
- FOUND: powerbrowser/INTERNAL-APIS.md (catalogue rows per commit stats)
- FOUND: scripts/verify-sql-store-roundtrip.mjs (465 lines at 8ddc75e; 171 lines in the current tree)
- FOUND: 7fce976, FOUND: 8ddc75e in git log
- browser-tab-uri.ts absent from the current tree (28 lines at 8ddc75e); removal history not traced here
- Catalogue green and quick green at execution per the plan verify blocks; not re-run in this doc-sync
