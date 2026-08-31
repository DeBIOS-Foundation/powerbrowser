---
phase: 01-platform-extraction-and-rename
plan: 14
subsystem: verification
tags: [gap-closure, error-copy, static-check, derive-and-compare, SEC-01, MIG-04]
status: complete

requires:
  - "scripts/verify-shell-error-copy.mjs (01-07) — the checker whose rule (4) is tightened"
  - "powerbrowser/shell/TheiaService.sys.mjs (01-07..01-13) — the file under test, unmodified by this plan"
  - "scripts/verify-platform.sh rows shell-error-copy-no-internals{,-self-test} — the registry rows this work rides"
provides:
  - "messageBearingBindings(src, table) — derived accept set for rule (4)"
  - "catchParamNames(src) — derived catch-parameter set, selects the rejection copy"
  - "two --self-test fault rows planting `<identifier>.message` at a _showError() call site"
affects:
  - "any future edit to TheiaService.sys.mjs that passes a non-USER_MESSAGE value to this._showError()"

tech-stack:
  added: []
  patterns:
    - "derive-and-compare over the file under test (CLAUDE.md Verification rule 2), extended from set-equality to a set-membership accept rule"
    - "discrimination control: each new fault row proven GREEN under the pre-fix checker and RED under the fixed one"

key-files:
  created: []
  modified:
    - "scripts/verify-shell-error-copy.mjs"
    - ".planning/phases/01-platform-extraction-and-rename/01-UI-SPEC.md"

decisions:
  - "Rule (4)'s accept set is derived from two initializer shapes (object literal, this.<method>() return) — not from a name list; a rename of resolved/failed/result changes what the checker computes"
  - "catchParamNames is file-scoped, not block-scoped, and never widens the accept set — it only selects which of the two rejection messages prints"
  - "A method whose every return sets `message: null` does not qualify as message-bearing: a binding that always paints nothing is a different defect, not a licence"
  - "The Provenance entry is prose, not a table row — the file's 104-row count and the corrected row's identifying string are both grep-asserted, so a table row would have broken two acceptance criteria"

metrics:
  duration: ~6min
  tasks: 2
  files: 2
  commits: 3
  completed: 2026-08-31

actuals:
  tokens: 11900
  tasks: 2
  commits: 3
---

# Phase 01 Plan 14: Rule (4) Derivation Hardening Summary

Rule (4) of `scripts/verify-shell-error-copy.mjs` now binds `this._showError()`'s message argument
to a set of message-bearing bindings derived from `TheiaService.sys.mjs` at check time, so a caught
exception's `.message` — the exact shape the rule exists to catch — is rejected by name instead of
matching a permissive `<identifier>.message` alternative.

## What Was Built

**Task 1 — the derivation (commits `1338799` RED, `2169fee` GREEN).**

Two helpers were added above `check()`:

- `catchParamNames(src)` — every `catch (<name>)` binding in the file under test. It selects which
  rejection message prints and never widens the accept set. Deliberately file-scoped, marked with a
  `ponytail:` comment naming the ceiling and its upgrade path.
- `messageBearingBindings(src, table)` — binding names whose value carries a table-validated
  `message:` field, via two initializer shapes that are both live in the tree: an object literal
  containing `message:` (`failed`), and a `this.<method>()` call whose method body has at least one
  `return` object literal setting `message: USER_MESSAGE.<declared key>` (`resolved` from
  `_resolveSidecar`, `result` from `_spawnAndGate`). A method returning only `message: null` does
  not qualify.

Rule (4) accepts `USER_MESSAGE.<key>`, or `<N>.message` where `N` is message-bearing and is not a
catch parameter. Everything else fails naming the drift and quoting the offending expression. The
header comment's item 4 and a new rule-(4) note replace the disproved claim that checks (1)–(3)
"prove" a `.message` argument safe — leaving that sentence would have re-seeded the same mistake.

**Task 2 — the design contract (commit `f20fef5`).** The `long-text` E2 error-message row of
`## UI Considerations` described the painted message as `err.message`-derived copy, contradicting
`## Copywriting Contract` in the same file. It now names `USER_MESSAGE` as the source, keeps the
`max-width: 40em` no-truncation contract, and states that a caught exception's `.message` is a
diagnostics field row that `shell-error-copy-no-internals` now rejects at a `_showError()` call site.

## Discrimination Control — Verbatim Output

The evidence that this gate is no longer decorative. Each new mutation replaces the direct
`USER_MESSAGE.couldNotStart` argument at `TheiaService.sys.mjs:1036` in a scratch copy, and is run
against a scratch copy of the PRE-fix checker and against the fixed one.

```
### mutation: err.message
  PRE-FIX  exit=0  (expect 0)
  FIXED    exit=1  (expect 1)
  output: verify-shell-error-copy: FAIL -- this._showError() is called with `err.message` as its
  message, and `err` is a `catch` parameter in this file -- a caught exception's `.message` is a raw
  exception string written by the runtime, carrying paths, ports and errno text. It belongs in a
  diagnostics field row, never in the user-facing error layer
### mutation: stray.message
  PRE-FIX  exit=0  (expect 0)
  FIXED    exit=1  (expect 1)
  output: verify-shell-error-copy: FAIL -- this._showError() is called with `stray.message` as its
  message, but `stray` is not a message-bearing binding -- no object literal and no
  `this.<method>()` return in this file gives `stray` a table-validated `message:` field, so nothing
  here proves what it would paint
### rename control: resolved -> sidecar
verify-shell-error-copy: PASS -- no internal identifier can reach the error layer (.../renamed.mjs)
  exit=0 (expect 0)
```

Both rows are GREEN under the pre-fix checker and RED under the fixed one, so each names the hole
CR-A identified rather than an unrelated pre-existing failure. The rename control confirms the
accept set is computed, not written down.

**Narrowness probe (beyond the plan's criteria).** Substituting four real non-message-bearing
in-file bindings at the same call site — `configured`, `xdg`, `attempts`, `giveUpAttempts` — each
exits 1; substituting the three live bearing bindings `resolved`, `failed`, `result` each exits 0.
The derived set is exactly the three, not an over-broad set that would pass by accident.

## RED Evidence

Before rule (4) was touched, `--self-test` with the two new rows printed:

```
  FAIL  _showError() called with a caught exception's .message -- planted fault did NOT go red
  FAIL  _showError() called with an unknown identifier's .message -- planted fault did NOT go red
```

That is CR-A reproduced as an executable red, committed as `1338799` before the fix.

## Verification Results

| Check | Result |
|---|---|
| `node scripts/verify-shell-error-copy.mjs` | PASS — exit 0 against the shipped supervisor; all five live call sites still accepted |
| `node scripts/verify-shell-error-copy.mjs --self-test` | PASS — `planting 8 fault(s)`, 8 `ok` rows |
| `scripts/verify-platform.sh --only shell-error-copy-no-internals` | PASS |
| `scripts/verify-platform.sh --only shell-error-copy-no-internals-self-test` | PASS |
| `scripts/verify-platform.sh --quick` | PASS — all 24 rows, no regression |
| `node scripts/scan-brand-residue.mjs` (both files staged) | PASS — 109 files, no residual occurrence |
| `grep -c '^| ' 01-UI-SPEC.md` | 104 — unchanged |
| grep for the corrected row's identifying string | 1 match — exactly one row |
| Coverage tally line | byte-identical |
| `grep -rn 'verify-shell-error-copy' scripts/verify-platform.sh` | exactly the two pre-existing rows; no third row, no sibling driver |

## Deviations from Plan

**1. [Rule 3 — Blocking] The `## Provenance` entry is prose, not a table row**

- **Found during:** Task 2
- **Issue:** Task 2's action says to add the Provenance line "following the format the existing
  entries in that section use" — that section is a `| Field group | Source |` table. Its own
  acceptance criteria simultaneously require `grep -c '^| '` to return exactly 104 and state that
  "no table row is added or removed anywhere in the file". The two instructions are mutually
  exclusive as written.
- **Fix:** the entry was written as a prose paragraph immediately below the Provenance table,
  satisfying "add one line to `## Provenance`" while keeping the asserted row count intact. The
  reason is stated in the line itself so a future reader does not restyle it into a row.
- **Files modified:** `.planning/phases/01-platform-extraction-and-rename/01-UI-SPEC.md`
- **Commit:** `f20fef5`

**2. [Rule 3 — Blocking] The Provenance line was reworded so it does not reproduce the row string**

- **Found during:** Task 2 verification
- **Issue:** the first draft quoted the corrected row as `| long-text | E2 error message |`, which
  made `grep -n 'long-text | E2 error message'` return two lines against an acceptance criterion of
  exactly one.
- **Fix:** reworded to "the `long-text` state row for the E2 error message", which names the row
  without matching the asserted pattern.
- **Files modified:** as above
- **Commit:** `f20fef5` (caught before commit)

**3. [Process] The tracer feedback gate was satisfied automatically rather than by a human checkpoint**

- **Found during:** end of Task 1
- **Issue:** auto mode is off (`workflow.auto_advance` and `workflow._auto_chain_active` both
  `false`), which normally means a `checkpoint:human-verify` fires after a `type="tracer"` task.
  Task 1's `<verify>` block contains only an `<automated>` element — four CLI commands — and the
  checkpoint protocol is explicit that users never run CLI commands and that a human checkpoint must
  present a real on-screen affordance. There is no human affordance in this tracer.
- **Fix:** the tracer's `<verify>` was run end-to-end and passed, together with both discrimination
  controls, before any work on Task 2 began. No checkpoint was emitted.
- **Impact:** none on the artifact; recorded so the decision is visible rather than silent.

## Requirements

- **SEC-01** — the user-facing-copy / no-internals enforcement now has a gate that can actually fire
  on the shape it exists to catch.
- **MIG-04** — `01-VERIFICATION.md` recorded MIG-04 as blocked by CR-A; that block is lifted on this
  plan's merits. Whether MIG-04 is marked complete is a verifier decision, not this plan's.

The remaining IDs on the plan's `requirements` field (MIG-01..MIG-03, GUI-01, GUI-03, GUI-04) are
carried per the phase contract and are unaffected by this plan.

## Known Stubs

None. No stub, placeholder, skipped test, or unrun `<verify>` was introduced.

## Threat Flags

None. No new network endpoint, auth path, file access pattern, or schema change at a trust boundary.
`T-01-14-01` (information disclosure into `#powerbrowser-error-message`) was the plan's subject and
is mitigated; `T-01-14-03` (self-test evidence that proves nothing) is mitigated by the
discrimination control recorded above.

## TDD Gate Compliance

Task 1 carried `tdd="true"` and the gate sequence is intact in git log: `test(01-14)` `1338799`
(RED — both new rows fail "planted fault did NOT go red"), then `feat(01-14)` `2169fee` (GREEN — all
8 rows red naming the drift, shipped tree still passing). No REFACTOR commit was needed.

## Self-Check: PASSED

All three modified/created files exist on disk; all three commit hashes (`1338799`, `2169fee`,
`f20fef5`) resolve in `git log`.
