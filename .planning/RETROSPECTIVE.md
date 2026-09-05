# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — PowerBrowser

**Shipped:** 2026-09-04
**Phases:** 7 | **Plans:** 52 | **Sessions:** autonomous end-of-roadmap batch + human drill session

### What Was Built
- Rebrandable platform tree: `configuration.toml` + `brand/` as the only rebrand inputs, byte-identity-gated generator
- Gecko + Theia branding emitters, icon pipeline, installer fragments; tier-3 Linux build green
- Hook-only patch stack with manifest-consumed upstream pins
- Two-layer verification (static literal scan + runtime artifact checks) in CI
- Sourcerer reproduced as a pure downstream plus adversarial fixtures

### What Worked
- Byte-identity acceptance between Phase 1 (hand-written) and Phase 2 (generated) made the generator self-proving
- Registered planted-fault self-tests on every gate: each check proved it can go red
- Deriving expectations from the tree (never hand-kept lists) caught whole defect classes

### What Was Inefficient
- Verification deferred to end-of-roadmap left 16 requirements formally unchecked despite green code — audit should ride each phase, not the milestone tail
- ROADMAP/state tooling drifted (stale 03-03 checkbox, phase statuses) while execution had moved on
- Release-variant coverage cost was never spent (no `objdir-release`), leaving two rows unrunnable all milestone

### Patterns Established
- One driver, one registry (`verify-platform.sh`): new checks are rows, never sibling drivers
- Every gate ships with a `--self-test` that plants faults and must go red naming the drift
- Set-equality over derivation (both directions) instead of hand-kept expectation lists

### Key Lessons
1. Absence assertions need a proven emitter — never assert a log line is missing unless the code under test is shown to emit it.
2. Identity/legal keys hard-fail with no default; cosmetic keys default with echo — one merge path, provenance-carrying.
3. The canonical product name must be decided before the branding gates are pinned — v1 re-pinned gates around a spaced form v2 renames (NAME-01).

### Cost Observations
- Model mix: executor + verifier subagents (Muse Spark), human only for eyes/heavy-machine drills
- Notable: tier-3 builds (~47–54 min) dominate wall-clock; cheap static gates exist to avoid spending them on typos

---

## Milestone: v1.1 — Hardening and SQL Tabs

**Shipped:** 2026-09-05
**Phases:** 2 | **Plans:** 9 (08: 5, 09: 4) | **Commits:** 74 milestone-scoped

### What Was Built
Canonical PowerBrowser rename with re-pinned gates; self-hosted MAR updates with a real Linux N→N+1 hop; NSIS proven on Nix; npm/local-path extension sources + WebExtensions via ExtensionSettings; minimal crash collector with contract gate + policy; release build + live ESR rebase + Theia re-pin drills; WINDOWS #13/#14 closed.

### What Worked
- Nonstop autonomous defaults (verify→defer, one gap retry, audit-accept, no-reversibility-gates) ran 9 plans across 2 phases with zero human pauses; the only stall (08-04 executor dying mid-plan) recovered by resume-from-WIP.
- Checker-caught verify flaws (piped `--gate`, `||`-masked BiDi proof, wrong `--only` label) never reached execution — the revision loop earned its keep twice.
- Tracer-first ordering falsified the pipeline statically before any host-dependent spend.

### What Was Inefficient
- One executor died with an empty return mid-plan (08-04, ~3h wall before resume detected it); faster heartbeat/stall detection would have reclaimed the idle window.
- milestone.lock lifecycle churned (stale PID lock deleted, recreated, re-deleted) — harmless but noisy across 4 commits.
- audit-open acknowledge cannot match archived deferred-item text — 13 v1.0 items carried by disclosure instead of suppression.

### Patterns Established
- Falsification-branch planning: host-dependent tasks carry exact-error + operator-unblock staged outcomes instead of fake-green or hard blocks.
- Single-writer evidence logs (BUILD.md host-capability record cited by reference, never restated).
- Resume-from-WIP executor protocol for empty-return deaths (verify committed task, adopt tree state, continue).

### Key Lessons
1. Every `<automated>` verify must be failure-capable — pipes, `||` fallbacks, and `2>/dev/null` are the exact shapes checkers must hunt.
2. drills ride inside phases, never a terminal drills phase — v1.1 closed all four v1.0 heavy drills this way.
3. Name packaging hosts per plan with falsification criteria (Nix-first / VM-fallback) — ambiguity is what stalls host work.

### Cost Observations
- Model mix: planner/checker/verifier/reviewer/fixer subagents (Muse Spark), zero human turns during the run
- Sessions: 1 continuous autonomous session, 2026-09-04 → 2026-09-05
- Notable: ~7h wall in builds alone (task-1 rebuild 34m, N+1 54m, release 55m, dev clobber 26m); everything else was static gates in seconds

---

## Milestone: v1.2 — Sign-off Closeout and SQL Store

**Shipped:** 2026-09-05
**Phases:** 3 | **Plans:** 9 (10: 3, 11: 3, 12: 3) | **Tasks:** 22 | **Commits:** 80 milestone-scoped (v1.1..v1.2) | **Closeout:** override (audit `tech_debt`, accepted per standing nonstop rule)

### What Was Built
- 15-box sign-off assembly with the 16-vs-15 count reconciliation recorded and five human UAT sheets staged as runbooks; every cited row re-executed on the final tree, `--quick` green, no sibling driver
- SQL authority/invariant table (six rows) with recorded sign-off governing schema; tabs schema + forward-only migration plan exercised against fixture DBs (23/23) with recorded sign-off
- Chrome-side SQLite writer behind the sole boundary into own `tabs.sqlite` (roundtrip 24/24); readonly `better-sqlite3` query API beside the frozen registry, chrome-side Places + sessionstore reads, emitter-exercising private-absence instrument; nine store gates green (second-writer scan, integrity soak 14/14, ESR rebase drill at live newer tag)

### What Worked
- Re-run beats re-cite at closeout: the 10-03 sweep re-ran every cited row (including full-tier drill rows) on the final tree instead of trusting plan-time citations
- Probe-first staging kept live drills honest — environment-bound halves staged with unblocks rather than fake-green
- Design-before-code ordering held: authority signed before schema, schema exercised before writer

### What Was Inefficient
- Doc-sync drifted from execution three times (3 unchecked boxes + 3 missing summaries + checkbox/Progress-table mismatch) — summaries and box flips should ride the plan-complete commit, not a later pass
- audit-open acknowledge still cannot match archived deferred-item text — 13 v1.0 items carried by disclosure for the second straight close (tooling gap, not process)
- Verifier never ran on any v1.2 phase (standing deferral) — the Nyquist board reads not-validated across all three phases by design

### Patterns Established
- Sync-don't-rebuild for inert packaged data (byte-identical sync into objdirs, no tier-3 rebuild)
- Honest tier placement for gates: static-by-default rows with opt-in `--live` halves, self-exempting scans with plants elsewhere

### Key Lessons
1. Reconciliation beats renumbering — the v1.0 "16" overcount stays on record with the explanation, not silently corrected.
2. An absence test must exercise the emitter — the private-tab instrument stages honestly until startup wiring lands rather than asserting over a path nothing calls.
3. Doc-sync is execution's shadow — if the SUMMARY/box-flip is not in the plan-complete commit, assume it is missing.

### Cost Observations
- Model mix: planner/checker/verifier/reviewer/fixer subagents (Muse Spark), zero human turns during the run
- Sessions: 1 continuous autonomous session, 2026-09-05 (single-day milestone)
- Notable: 80 commits in one day; static gates in seconds carried the closeout — no tier-3 build spent this cycle (ESR drill ran dry-run at live tag)

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | batch + drill session | 7 | baseline: generator-core + two-layer verification pattern established |
| v1.1 | 1 continuous autonomous | 2 | nonstop defaults + falsification-branch planning for host work |
| v1.2 | 1 continuous autonomous (single day) | 3 | closeout discipline: re-run-beats-re-cite sweep + design-before-code store |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | --quick 95 rows + per-gate self-tests | static green; human/tier-3 staged | vendored TOML parser, pure-Node ICO/ICNS writers |

### Top Lessons (Verified Across Milestones)

1. (seed) Derive expectations from the tree; compare as set equality.
