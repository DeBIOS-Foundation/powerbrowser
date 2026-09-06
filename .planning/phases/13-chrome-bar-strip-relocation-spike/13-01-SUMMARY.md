---
phase: 13-chrome-bar-strip-relocation-spike
plan: 01
subsystem: spike
tags: [theia, application-shell, tab-strip, gui-07, spike, bidi]

# Dependency graph
requires:
  - phase: 12-sql-tab-store
    provides: TabUriRegistry identity substrate (uriOf oracle) the probe asserts
provides:
  - Strip-relocation verdict (RED + blocking cause) routing Phase 14 to Variant A
  - Banked live-move evidence (6/6 resolved, identity preserved) for a cheap re-probe
affects: [14-modes-and-strip, 13-02-verdict-registry]

# Actuals — same estimateTokens scale (chars/4 over realized diff)
actuals:
  tokens: 5200
  tasks: 3
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns: [bidi-frontend-walk-probe, resolved-area-readback, full-universe-uri-set-equality]

key-files:
  created:
    - .planning/phases/13-chrome-bar-strip-relocation-spike/13-SPIKE-STRIP-RELOCATION.md
  modified:
    - .planning/REQUIREMENTS.md

key-decisions:
  - "Verdict RED: relocation mechanics proven live, but the zero-core pillar is unprovable by its ratified instrument (diff-theia-core red on pre-existing install-state drift) — Variant-A fallback, modes still ship"
  - "Restored allowlist-doc-consistency docs (Rule 3 blocking fix) to unblock the mandated green quick gate"
  - "Scratch harness at untracked repo path (D-13-01-01): runner sandbox denies all external-directory writes; plan-literal /tmp path never created, actual scratch removed at closeout"

patterns-established:
  - "Resolved-area readback after every addWidget: a forced placement is RED data, never a pass (T-13-01-04)"
  - "Full-universe URI-set equality (all areas, both sides): main-only-before vs all-areas-after miscompares — banked as run-2 correction"
  - "Paste-the-output proofs: a red instrument is pasted with its diagnostics, never overridden by prose"

requirements-completed: [GUI-07]

# Coverage metadata — deterministic UAT routing
coverage:
  - id: D1
    description: "Live strip-relocation probe executed; 3 widgets main-to-bottom and back with identity evidence"
    requirement: "GUI-07"
    verification:
      - kind: other
        ref: "13-SPIKE-STRIP-RELOCATION.md Observations 1-2 (BiDi page-eval, verbatim JSON)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Zero/one/many-tab geometry sanity in the relocated region matches top-region behaviour"
    requirement: "GUI-07"
    verification: []
    human_judgment: true
    rationale: "Held-out visual check (backstop): unobservable headless — needs a rendered strip"
  - id: D3
    description: "Many-tab overflow in the relocated region scrolls rather than clipping or wrapping"
    requirement: "GUI-07"
    verification: []
    human_judgment: true
    rationale: "Held-out visual check (backstop): unobservable headless — needs a rendered strip"
  - id: D4
    description: "GREEN/RED verdict recorded with Variant routing and blocking cause"
    requirement: "GUI-07"
    verification:
      - kind: manual_procedural
        ref: "13-SPIKE-STRIP-RELOCATION.md Verdict: RED + proofs section (core-diff output pasted, upstream empty, shipped tree clean)"
        status: pass
    human_judgment: false

# Metrics
duration: ~30min
completed: 2026-09-06
status: complete
---

# Phase 13 Plan 01: Strip-Relocation Spike Summary

**Live probe moved 3 main-area widgets bottom-and-back with identity preserved, but the zero-core pillar is unprovable by its ratified instrument — verdict RED with the drift cause named, Variant-A fallback, re-probe path cheap.**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-09-06T03:08Z (approx)
- **Completed:** 2026-09-06T03:37Z
- **Tasks:** 3/3
- **Files modified:** 2 (1 created record, 1 requirements doc-sync)

## Accomplishments

- Live Theia sidecar driven over headless BiDi: 3 widgets (`welcome`,
  `settings_widget`, `keybindings.view.widget`) moved main→bottom and back
  via public `addWidget` same-instance re-adding — 6 requested, 6 resolved as
  requested, 0 resolver vetoes.
- Identity proven: per-widget `uriOf` equality, full-universe set equality
  (13/13 byte-identical), instance identity, no duplicate ids; selection
  intact-vacuous with the headless-focus cause named.
- Verdict RED recorded with the blocking cause (core-diff instrument red on
  pre-existing install-state drift), Variant-A fallback routing, banked
  positive mechanics for a cheap re-probe, and all proofs pasted.

## Task Commits

Each task was committed atomically (plus one preliminary blocking fix):

0. **Preliminary: restore allowlist-doc-consistency docs** - `87dea2f`
   (fix — Rule 3, pre-existing red blocked the mandated green gate)
1. **Task 1: live probe observations** - `fa8aada` (docs)
2. **Task 2: edge observations and invariant** - `7b30035` (docs)
3. **Task 3: verdict and ratification** - `6f328ce` (docs)

## Files Created/Modified

- `.planning/phases/13-chrome-bar-strip-relocation-spike/13-SPIKE-STRIP-RELOCATION.md` (400 lines) — header, what-changed, build, instrumentation note, Observations 1–2, edge section (veto score, move-back, selection nuance, ordering, backstop rows, live-move boundary, tabs invariant), constraints, summary table, artefacts, correction, ratification, proofs
- `.planning/REQUIREMENTS.md` — inherited-egress note naming the 3 Mozilla allow hosts (preliminary fix)

## Decisions Made

- **Verdict RED, not GREEN.** Relocation + identity evidence is strongly
  positive, but the exit gate requires the core-diff check green and it is
  red on pre-existing drift (flags `[]` vs `--ignore-scripts`, top-level
  patterns vs lockfile). Overriding a red ratified instrument with prose
  would poison plan 13-02's verdict-registry parse — RED with the precise
  cause is the plan-honest outcome. Full rationale in the record's proofs.
- **One fix-and-retry, then defer-and-continue** per standing rules: the
  retry was two read-only diagnostics confirming pre-existing drift;
  reinstalling `node_modules` is forbidden by T-13-01-SC and would prove a
  different tree than the one probed.
- **Scratch at untracked repo path (D-13-01-01).** Runner sandbox denies all
  external-directory writes (Write + Bash), so the plan-literal
  `/tmp/phase13-spike` was unreachable; every guarantee preserved (outside
  `theia/`/`scripts/`, never staged, removed at closeout, Firefox profile
  still in real `/tmp` via the child process).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Restored allowlist-doc-consistency docs**
- **Found during:** baseline (before Task 1 — `--quick` red)
- **Issue:** `allowlist-doc-consistency` FAIL: 3 Mozilla allow hosts named in
  ROADMAP.md but absent from REQUIREMENTS.md (v1.3 rewrite dropped them);
  every task verify mandates a green quick gate.
- **Fix:** added an inherited-egress note to REQUIREMENTS.md mirroring
  ROADMAP.md wording (docs only, 12 lines).
- **Verification:** `--only allowlist-doc-consistency` PASS, full `--quick` PASS.
- **Committed in:** `87dea2f` (preliminary commit)

**2. [Rule 3 - Blocking] Scratch harness path relocated**
- **Found during:** Task 1 (harness setup — tool sandbox denied `/tmp` writes)
- **Issue:** plan mandates `/tmp/phase13-spike`; runner denies all
  external-directory access from Bash/Write tools.
- **Fix:** harness lived at untracked `.tmp-phase13-spike/`, executed from
  there, removed at Task 3 closeout (`SCRATCH_GONE` verified, `git status`
  clean of it). Plan-literal path never created. Task 3's literal
  `test ! -e /tmp/phase13-spike` atom unexecutable by the runner — property
  holds vacuously plus actual-path removal proven.
- **Verification:** `test ! -e .tmp-phase13-spike` PASS post-removal.
- **Committed in:** N/A (scratch never staged; documented here + record)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** both necessary to execute at all; no scope creep, no
shipped-tree touch, verdict logic untouched.

## Issues Encountered

- **Core-diff instrument red (verdict-blocking, pre-existing).** Full
  diagnosis in the record's Proofs section: flags mismatch + top-level
  pattern drift, install predates the plan, no write path from any plan
  action to `@theia/*`, corroborated by empty tracked diff under
  `theia/`/`scripts/` and no `@theia/*` file newer than the install.
  Deferred maintenance: realign `node_modules` per `docs/BUILD.md` flags,
  re-run check + probe (minutes) to reopen Variant B.
- **Run-1 candidate miss:** side-container views land in side areas, not
  main — switched to editor-like views (`settings:`, keybindings). Recorded
  as constraint 1, not a failure.
- **Run-2 set-comparison bug:** corrected in place by run 3 (full-universe
  comparison), reasoning left visible per spike discipline.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 13-02's gui07 verdict-registry row parses `Verdict: RED` from
  `13-SPIKE-STRIP-RELOCATION.md` and routes Phase 14 to Variant A (strip
  stays top, modes still ship). No blocker.
- Re-probe runway: after install-state realignment, re-running the recorded
  probe command plus `diff-theia-core.sh` decides Variant B in minutes —
  relocation mechanics are already banked, not to be re-derived.

## Self-Check: PASSED

- Record exists and non-empty (400 lines, verdict + Variant + proofs present)
- All 4 commits present (`87dea2f`, `fa8aada`, `7b30035`, `6f328ce`)
- Scratch removed, no tracked modifications under `theia/`/`scripts/`

---
*Phase: 13-chrome-bar-strip-relocation-spike*
*Completed: 2026-09-06*
