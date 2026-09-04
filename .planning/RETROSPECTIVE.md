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

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | batch + drill session | 7 | baseline: generator-core + two-layer verification pattern established |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | --quick 95 rows + per-gate self-tests | static green; human/tier-3 staged | vendored TOML parser, pure-Node ICO/ICNS writers |

### Top Lessons (Verified Across Milestones)

1. (seed) Derive expectations from the tree; compare as set equality.
