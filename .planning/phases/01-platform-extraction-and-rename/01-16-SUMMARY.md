---
phase: 01-platform-extraction-and-rename
plan: 16
subsystem: verification
tags: [verification, error-copy, gap-closure, CR-03, WR-01, WR-02]
status: complete
requires:
  - scripts/verify-shell-error-copy.mjs (01-07, rule (4) accept side rewritten by 01-14)
  - scripts/verify-platform.sh rows shell-error-copy-no-internals{,-self-test}
provides:
  - an independently derived `_showError(` call-site total, compared for equality against the enumeration regex's count
  - a depth-0 property filter on messageBearingBindings shape (a)
  - a totality assertion on parseUserMessageTable's entry parse
  - four new FAULTS rows (--self-test: 8 planted faults -> 12)
affects:
  - scripts/verify-platform.sh --quick (through two pre-existing rows; no new row added)
tech-stack:
  added: []
  patterns:
    - "derive-and-compare applied to the ENUMERATION step, not only to the accept set"
    - "discrimination control: every new fault row observed green against the pre-fix checker restored from git and red against the fixed one"
key-files:
  created: []
  modified:
    - scripts/verify-shell-error-copy.mjs
decisions:
  - "The enumeration regex was left byte-identical. The deliverable is the equality assertion, not a wider pattern: a wider pattern is only a larger unproven expectation and would still be silent on the next call shape."
  - "Both counts are computed over the comment-stripped `src`, never `raw`. `raw` holds eight doc-comment mentions of _showError; counting those would make the check permanently red on a clean tree."
  - "The WR-02 fault row uses an UNREFERENCED key so that no pre-existing check (2)/(3) can fire on it — that is what makes it evidence for the new totality assertion rather than for a check that already existed."
  - "IN-03 (FAULTS hand-keeping copy literals from the file under test) deferred as planned: its current drift behaviour is already fail-loud via the `mutated === original` guard, a different class from the silent drops this plan closes."
metrics:
  duration: ~25m
  completed: 2026-08-31
  tasks: 2
  commits: 2
actuals:
  tokens: 21000
  tasks: 2
  commits: 2
---

# Phase 01 Plan 16: Call-Site Enumeration Completeness Summary

CR-03 closed by requiring the `_showError(` enumeration to prove its own completeness against an
independently derived total, plus the two sibling silent-drop paths (WR-01 nested `message:`, WR-02
unparsable table entry) in the same file, each proven by a fault row green against the pre-fix
checker and red against the fixed one.

## What Changed

`scripts/verify-shell-error-copy.mjs`, three additive assertions and four additive self-test rows.
`powerbrowser/shell/TheiaService.sys.mjs` was not edited. No `verify-platform.sh` registry row was
added; the two pre-existing `shell-error-copy-no-internals{,-self-test}` rows carry the new work.

**Task 1 (commit `c2fcfd2`)** — rule (4) now derives `definitions` (lines whose first non-whitespace
content is the `_showError` method declaration) and `present` (every textual `_showError(` in the
comment-stripped source, minus `definitions`), then requires `callSites === present` after the
enumeration loop. Both patterns are deliberately dumber than the enumeration regex — no receiver, no
argument capture, no comma — so they are a genuine second derivation rather than the same
expectation restated. The enumeration regex `/this\._showError\(\s*([^,]+?)\s*,/g` is unchanged, and
the comment at the assertion says so explicitly, so a later reader does not "fix" a mismatch by
loosening it.

**Task 2 (commit `9a19b13`)** — `depthZeroOnly()` strips every span nested inside `{` or `[` from an
object-literal body, and shape (a) of `messageBearingBindings` now tests the filtered string.
`parseUserMessageTable` returns a second `declared` count (lines at the table's own derived depth-1
indentation whose first token is an identifier followed by a colon) and `check()` fails and returns
on any shortfall.

## Counts Observed on the Shipped Tree

| Derivation | Value |
|---|---|
| textual `_showError(` in comment-stripped source | 6 |
| `definitions` (the one method declaration) | 1 |
| `present` (independent call-site total) | **5** |
| `callSites` (enumeration regex) | **5** |
| USER_MESSAGE declared depth-1 lines | **5** |
| USER_MESSAGE parsed entries | **5** |

`node scripts/verify-shell-error-copy.mjs` exits 0:

```
verify-shell-error-copy: PASS -- no internal identifier can reach the error layer (/home/chris/coding/Power-Browser/powerbrowser/shell/TheiaService.sys.mjs)
```

### Depth-0 rule, effect on real bindings

Shape (a) accepted `['TheiaService', 'failed']` before the filter and `['failed']` after it. The
dropped acceptance is spurious — `TheiaService`'s `message:` occurrences are all nested inside method
bodies, so `TheiaService.message` is `undefined` at runtime and no call site uses it. Every binding a
real call site actually passes still qualifies: `failed` via shape (a) at depth 0, `resolved` and
`result` via shape (b), which was not changed. No rule was relaxed to accommodate the tree.

## Full `--self-test` Output (12 planted faults)

```
verify-shell-error-copy --self-test: planting 12 fault(s)
  ok    all-caps sentinel leaked into a message -- red, naming the drift
  ok    pref key leaked into a message -- red, naming the drift
  ok    ad-hoc string literal bypasses the table -- red, naming the drift
  ok    stale declared-but-unreferenced entry -- red, naming the drift
  ok    referenced entry removed from the table -- red, naming the drift
  ok    _showError() called with raw interpolated text -- red, naming the drift
  ok    _showError() called with a caught exception's .message -- red, naming the drift
  ok    _showError() called with an unknown identifier's .message -- red, naming the drift
  ok    _showError() call site with no trailing comma is never enumerated -- red, naming the drift
  ok    _showError() call site with an optional-chaining receiver is never enumerated -- red, naming the drift
  ok    nested message: makes a binding falsely message-bearing -- red, naming the drift
  ok    USER_MESSAGE entry the parser cannot read is dropped silently -- red, naming the drift
verify-shell-error-copy: PASS -- all 12 planted faults went red naming the drift
```

All 8 pre-existing rows still print `ok` under their original names. None was weakened, renamed or
removed.

## The Four Reproductions, Verbatim

Scratch copies of `powerbrowser/shell/TheiaService.sys.mjs` under
`/tmp/.../scratchpad/0116/`, run with `--file`.

**1. CR-03, comma-less call site** (`this._showError(err.message)` appended as the last content in
the file, no comma after it anywhere) — exit **1**:

```
verify-shell-error-copy: FAIL -- 6 `_showError(` call site(s) are present in this file but 5 were parsed -- a call site this check cannot read is a call site it is not checking, and rule (4) went green on sites it never saw. Write the call as `this._showError(<message>, ...)`, or teach this check the new shape; do not widen the enumeration pattern until the counts happen to agree
```

**2. CR-03, optional-chaining receiver** (`this?._showError(err.message, false, []);` appended) —
exit **1**, same failure text (6 present, 5 parsed). The optional-chaining receiver defeats the other
half of the regex's requirement, which is why it is a separate row.

**3. WR-01, nested `message:`** (a `const nestedOnly = { details: [ { message: USER_MESSAGE.couldNotStart, }, ], };`
binding plus `this._showError(nestedOnly.message, false, []);`) — exit **1**:

```
verify-shell-error-copy: FAIL -- this._showError() is called with `nestedOnly.message` as its message, but `nestedOnly` is not a message-bearing binding -- no object literal and no `this.<method>()` return in this file gives `nestedOnly` a table-validated `message:` field, so nothing here proves what it would paint
```

**4. WR-02, unparsable table entry** (an unreferenced `unreadableEntry` written as a template literal
inserted at the top of the table) — exit **1**:

```
verify-shell-error-copy: FAIL -- the USER_MESSAGE table declares 6 entries but only 5 could be parsed -- a declared entry this parser cannot read is a user-facing string that is never leak-scanned. Write it as a double-quoted, single-line string ending in a comma
```

**Each row is red for its own stated cause.** Reproductions 3 and 4 report the WR-01 and WR-02
conditions respectively and neither mentions a call-site count mismatch — confirmed by reading the
full output above. Reproduction 3's appended call site does have a trailing comma, so both of Task
1's counts rose to 6 together and the equality assertion correctly stayed silent.

## Discrimination Control — Both Halves

The pre-fix checker was restored from git to a scratch path and the same four inputs run against it.

| Input | Pre-fix checker | Fixed checker |
|---|---|---|
| comma-less call site | `PASS` / exit **0** (`git show HEAD~2`, the shipped checker) | `FAIL` / exit **1** |
| optional-chaining call site | `PASS` / exit **0** (`git show HEAD~2`) | `FAIL` / exit **1** |
| nested `message:` binding | `PASS` / exit **0** against BOTH `git show HEAD~2` (pre-plan) and `git show HEAD~1` (post-Task-1, pre-Task-2) | `FAIL` / exit **1** |
| unparsable table entry | `PASS` / exit **0** against BOTH `HEAD~2` and `HEAD~1` | `FAIL` / exit **1** |

Verbatim green half for CR-03's two rows against the pre-plan checker:

```
=== PRE-FIX checker vs nocomma ===
verify-shell-error-copy: PASS -- no internal identifier can reach the error layer (.../0116/nocomma.mjs)
EXIT=0
=== PRE-FIX checker vs optchain ===
verify-shell-error-copy: PASS -- no internal identifier can reach the error layer (.../0116/optchain.mjs)
EXIT=0
```

Verbatim green half for WR-01 and WR-02, against the post-Task-1 checker (the correct control for
Task 2 — it proves the row is not red for Task 1's assertion) and again against the pre-plan checker:

```
=== PRE-TASK2 vs nested ===
verify-shell-error-copy: PASS -- ... EXIT=0
=== PRE-TASK2 vs unreadable ===
verify-shell-error-copy: PASS -- ... EXIT=0
=== PRE-PLAN (HEAD~1 at the time) vs nested ===
verify-shell-error-copy: PASS -- ... EXIT=0
=== PRE-PLAN (HEAD~1 at the time) vs unreadable ===
verify-shell-error-copy: PASS -- ... EXIT=0
```

Every one of the four rows is green against the pre-fix checker and red against the fixed one. No row
behaves identically under both, so none is red for a pre-existing reason.

## Equality, Not a Hard-Coded Count

A scratch copy with one complete `this._showError(resolved.message, ...)` statement deleted:

```
verify-shell-error-copy: PASS -- no internal identifier can reach the error layer (.../0116/deleted.mjs)
EXIT=0
```

Both derivations dropped to 4 together and the comparison stayed silent. A hard-coded 5 would have
failed here, and that would be exactly the hand-kept expectation list CLAUDE.md forbids.

## Other Acceptance Checks

- `node scripts/verify-shell-error-copy.mjs --file /nonexistent/path/for/this/check` → exit 1,
  `cannot read /nonexistent/path/for/this/check: ENOENT: ...`. The pre-existing read-failure path is
  unchanged.
- `git diff --stat powerbrowser/shell/TheiaService.sys.mjs` → no output. The file under test was not
  edited to fit the checker.
- `grep -n 'shell-error-copy' scripts/verify-platform.sh` → exactly the two pre-existing registry
  rows at lines 3544-3545. No third row, no sibling driver.
- `scripts/verify-platform.sh --only shell-error-copy-no-internals-self-test` → PASS.
- `scripts/verify-platform.sh --quick` → **PASS, 24/24**, with `shell-error-copy-no-internals: PASS`
  and `shell-error-copy-no-internals-self-test: PASS` in the summary. No other row regressed.

## Threat Mitigations

| Threat | Disposition | Where mitigated |
|---|---|---|
| T-01-16-01 (high) raw exception text reaching the error layer through an unreadable call site | mitigated | Task 1's equality assertion + two fault rows with discrimination control |
| T-01-16-02 (medium) nested `message:` accepted as message-bearing | mitigated | Task 2's `depthZeroOnly()` filter + fault row |
| T-01-16-03 (medium) declared-and-unreferenced entry never leak-scanned | mitigated | Task 2's totality assertion + fault row |
| T-01-16-04 (high) a fault row red for a pre-existing reason masquerading as evidence | mitigated | both halves of the discrimination control recorded above for all four rows, plus a per-row check that the failure text names the row's own cause |
| T-01-16-05 (medium) assertion computed over `raw` turning `--quick` permanently red | mitigated | both counts run over the comment-stripped `src`; 5 == 5 observed on the shipped tree; deletion scenario proves it is an equality |
| T-01-16-06 (medium) silencing a mismatch by widening the regex | mitigated | regex left byte-identical; the comment at the assertion states the remedy is a parsable call shape or teaching the check, not a looser pattern |

## Deviations from Plan

None — the plan executed exactly as written. Both tasks' acceptance criteria were run verbatim and
all passed on the first attempt.

One observation worth recording rather than a deviation: the depth-0 filter dropped `TheiaService`
from shape (a)'s accept set. The plan's Task 2 read_first anticipated this case ("if any real binding
relies on a nested `message:`, that is a finding to record rather than a reason to skip the fix").
No real call site relies on it, so nothing was relaxed; it is noted here because it is the one
behavioural change to the accept set on the shipped tree.

## Known Stubs

None.

## Self-Check: PASSED

- `scripts/verify-shell-error-copy.mjs` — FOUND
- `.planning/phases/01-platform-extraction-and-rename/01-16-SUMMARY.md` — FOUND
- commit `c2fcfd2` — FOUND
- commit `9a19b13` — FOUND
