---
phase: 02-configuration-manifest-and-generator-core
plan: 08
subsystem: testing
tags: [byte-identity, branding-preflight, relocation-harness, G-02-11, G-02-12, placeholder-token]

# Dependency graph
requires:
  - phase: 02-configuration-manifest-and-generator-core (02-DESIGN-G-02-11)
    provides: ratified option-4-placeholder verdict plus foreign_checkout_*_exit expectations (0/0/0)
  - phase: 02-configuration-manifest-and-generator-core (02-07)
    provides: blocking-human checkpoint ratifying option-4-placeholder
provides:
  - Token-based desktop entries (@POWERBROWSER_REPO_ROOT@) honest at every checkout
  - Token-based preflight with no-absolute-path-outside-the-token assertion
  - Different-root self-test cases in both gates (mixed-polarity identity set)
affects: [02-09 record corrections, fresh-clone --quick consumers, desktop-install packagers]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
actuals:
  tokens: 6900
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns: [install-time-placeholder-token, readTracked-memory-substitution-seam, per-fragment-token-cleanliness-assertion]

key-files:
  created: [.planning/phases/02-configuration-manifest-and-generator-core/02-08-SUMMARY.md]
  modified: [scripts/generate.mjs, scripts/verify-branding-preflight.mjs, scripts/verify-generated-identity.mjs, scripts/verify-platform.sh, inventory/brand-tokens.json, powerbrowser/powerbrowser.desktop, powerbrowser/powerbrowser-release.desktop, docs/BUILD.md]

key-decisions:
  - "Executed branch B (option-4-placeholder) only: token in emitDesktopEntry, both .desktop files rewritten in the same commit, token-based preflight, repo_root deleted, BUILD.md subsection"
  - "Docblock, GENERATED_BANNER label, and CI comments examined and deliberately left: exact comparison unchanged so all three claims stay true"
  - "No branding-preflight CI step added: red-on-runner risk under branch A, new scope under branch B"

patterns-established:
  - "Foreign-root self-test fixtures use literals or REPO_ROOT-derived siblings, never a typed /home path, so self-test output carries no checkout path"

requirements-completed: [GEN-04, CFG-01]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "Tracked .desktop entries carry @POWERBROWSER_REPO_ROOT@ instead of a checkout path; byte-identity exits 0 at a relocated checkout"
    requirement: "GEN-04"
    verification:
      - kind: other
        ref: "relocation harness: scripts/verify-platform.sh --only generated-byte-identity at mkdtemp clone"
        status: pass
      - kind: unit
        ref: "node scripts/verify-generated-identity.mjs --self-test (9 cases, 1 green-at-foreign-root)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Preflight builds wantExec/wantIcon from the token and rejects absolute paths outside it; exits foreign_checkout_preflight_exit (0) relocated"
    requirement: "CFG-01"
    verification:
      - kind: other
        ref: "relocation harness: scripts/verify-platform.sh --only branding-preflight at mkdtemp clone"
        status: pass
      - kind: unit
        ref: "node scripts/verify-branding-preflight.mjs --self-test (6 plants, 6th is desktop-root)"
        status: pass
    human_judgment: false
  - id: D3
    description: "repo_root gone from inventory and preflight; coincidental zero-count row byte-unchanged"
    requirement: "CFG-01"
    verification:
      - kind: other
        ref: "test $(grep -c repo_root inventory/brand-tokens.json) = 0; git diff shows only the key removal"
        status: pass
    human_judgment: false

# Metrics
duration: ~50min
completed: 2026-09-04
status: complete
---

# Phase 02 Plan 08 Summary

**Closed G-02-11 and G-02-12 under option-4-placeholder: token-based desktop entries byte-identical at any checkout, token-based preflight, different-root cases in both self-tests**

## Performance

- **Duration:** ~50 min
- **Started:** 2026-09-04T00:00:00Z
- **Completed:** 2026-09-04
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- `emitDesktopEntry` builds `Exec=`/`Icon=` from `@POWERBROWSER_REPO_ROOT@` plus relative paths; both tracked `.desktop` files rewritten to emitted bytes in the same commit
- Relocation harness proves `generated-byte-identity` exits 0 and `branding-preflight` exits 0 (exactly `foreign_checkout_preflight_exit: 0`) at a foreign path
- Byte-identity self-test carries 9 cases with two polarities; preflight self-test carries 6 plants including the desktop-root one
- `repo_root` deleted from inventory and preflight; `--quick` green; brand-residue scan green with changes staged

## Task Commits

Each task was committed atomically:

1. **Task 1: Relocated checkout, both gates honest (branch B)** - `5c8d0d9` (fix)
2. **Task 2: Different-root self-test cases in both gates** - `f8a9628` (test)
3. **Task 3: Registry comment carries the green case** - `b45b6f8` (docs)

**Plan metadata:** summary commit (docs: complete plan)

## Files Created/Modified

- `scripts/generate.mjs` - Token-based `emitDesktopEntry` (`DESKTOP_ROOT_TOKEN`, install-substitution comment line, `assertUnderRepo` guards kept but no longer interpolated); header and emitter D-04 comments rewritten for the amended mechanism
- `powerbrowser/powerbrowser.desktop`, `powerbrowser/powerbrowser-release.desktop` - Rewritten to emitted bytes (token + new comment line) in the same commit as the emitter
- `scripts/verify-branding-preflight.mjs` - `wantExec`/`wantIcon` from the token; per-line no-absolute-path-outside-the-token assertion (per-whitespace-fragment); sixth self-test plant
- `inventory/brand-tokens.json` - `repo_root` key removed; coincidental zero-count row byte-unchanged
- `scripts/verify-generated-identity.mjs` - `readTracked` seam on `compareAgainstTracked`, `trackedAnchorLanded` guard, relocated-green + planted-absolute-red cases, per-case no-checkout-path predicate
- `scripts/verify-platform.sh` - Registry comment gains `one case stays green` with the reason
- `docs/BUILD.md` - Desktop-install subsection naming the `sed` substitution command
- `.planning/phases/02-configuration-manifest-and-generator-core/02-08-SUMMARY.md` - This file

## Executed Branch

`option-4-placeholder` (Branch B), bound via `sed -n 's/^ratified: *//p'` on `02-DESIGN-G-02-11.md`. No `option-1-quotient` artifact was built: no `sameFileAtADifferentRoot` helper, no regex, no quotient logic, no space-root rejection.

## Relocated-Checkout Observations (both rows, same harness)

Harness: `D="$(mktemp -d)/pb"; git clone --no-hardlinks -q . "$D" && git ls-files -z | tar --null -T - -cf - | tar -xf - -C "$D"` (tracked-tree overlay onto a real clone, scratch path space-free, parent removed afterwards).

| Row | Observed exit at foreign path | Recorded expectation | Verdict |
|-----|-------------------------------|----------------------|---------|
| `generated-byte-identity` | 0 | `foreign_checkout_byte_identity_exit: 0` | match |
| `branding-preflight` | 0 | `foreign_checkout_preflight_exit: 0` | match |

No disagreement between implementation and verdict artifact, so nothing was reconciled by editing the artifact.

## Honesty Edits Examined and Deliberately Left True

Under `option-4-placeholder` only task 3's edit 2 applied. The other three claim sites were read and left unchanged for recorded reasons:

1. **`scripts/verify-generated-identity.mjs` docblock (lines 3-5)** — left: the comparison stays exact `Buffer.compare`, so "byte-for-byte" remains true at every checkout.
2. **`GENERATED_BANNER`'s `generated-byte-identity` label (`scripts/generate.mjs`)** — left: a hand-edited absolute root in a tracked `.desktop` still reddens exactly that row (emitter emits the token, tracked carries a path), so the label still names the row that reddens.
3. **`.github/workflows/rebase-upstream.yml` comment blocks + steps** — left: both comments state the byte-identity claim unconditionally, which remains true; both steps still invoke `node scripts/verify-generated-identity.mjs` (count 2, unchanged), now exiting 0 at a runner path, which is the point.
4. **No `branding-preflight` workflow step added** (decision, not omission): under branch A it would go red at a runner path for a true reason and hold the job red; under branch B it would be green but is new scope this gap closure did not take. Workflow `branding-preflight` count stays 0.

## Decisions Made

- Executed branch B only; branch A helper/regex/quotient logic explicitly not built
- First-draft preflight assertion (strip-token-then-match-`/`-leading) rejected itself on first run: the legitimate `@TOKEN@/relative` suffix is `/`-led after stripping. Replaced with the per-whitespace-fragment predicate (a fragment starting with `/` that carries no token), which is green on legitimate lines and red on planted absolutes
- Preflight foreign root derived as `dirname(REPO_ROOT)/foreign-checkout-pb`: satisfies "derived from REPO_ROOT, no `/home` literal" and keeps this checkout's own path out of self-test output (a `-foreign-checkout` suffix would have contained it as a substring)
- Inventory diff is one removed line plus one comma-adjustment line (the preceding key's trailing comma had to go for valid JSON); `node -e JSON.parse` confirms validity, `coincidental` row count unchanged at 6

## Deviations from Plan

None - plan executed exactly as written. (The two in-task corrections above — assertion predicate rewrite and foreign-root shape — are implementation detail within the specified behavior, caught by the plan's own verify steps before commit.)

## Issues Encountered

- Preflight went red on the first post-emitter run, by the new assertion's first (wrong) formulation — the failure named all four Exec/Icon lines, which immediately showed the predicate, not the files, was wrong. Rewrote to the fragment predicate; green since.
- `generate-check` row reports PASS locally only because `generated/` exists in this working tree from running the generator; on a fresh clone it takes its SKIP-and-pass path. Both are green outcomes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- G-02-11/G-02-12 closed: both `--quick` rows tell the truth at a relocated checkout; both self-tests carry a different-root case
- 02-09 unblocked: record corrections rest on the token contract and the amended D-04 mechanism recorded in `02-DESIGN-G-02-11.md`
- Packager-facing cost (install-time substitution) is written down in `docs/BUILD.md` and in each `.desktop` file's own comment line
- Pre-existing dirty state untouched throughout: `.planning/STATE.md`, `.planning/phases/01-platform-extraction-and-rename/01-VERIFICATION.md`, untracked `.gsd/`, `.planning/estimation-calibration.json`, `.planning/milestone.lock`, `.planning/state.json`, `.vscode/` — verified via `git status --porcelain` before every commit; only plan files staged

---
*Phase: 02-configuration-manifest-and-generator-core*
*Completed: 2026-09-04*
