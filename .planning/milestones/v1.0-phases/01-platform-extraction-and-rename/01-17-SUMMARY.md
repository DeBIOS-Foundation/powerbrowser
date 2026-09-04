---
phase: 01-platform-extraction-and-rename
plan: 17
subsystem: verification-tooling
tags: [residual-brand-scan, extra-root, gate-hardening, gap-closure, self-test]
status: complete
requires:
  - "01-15 (the --extra-root filesystem walk this plan repairs)"
  - "01-16 (the other half of this gap-closure run; ledger row 10 records both)"
provides:
  - "scan-brand-residue.mjs --extra-root: a coincidental-filtered row set"
  - "scan(): an `unreadable` collection on both return shapes, with a per-caller policy"
  - "scan-brand-residue.mjs --extra-root: a file count that names files READ"
  - "two new --self-test fixture rows (11 -> 13)"
  - "deferred-items.md row 10"
affects:
  - "scripts/rebase-upstream.sh (its --extra-root call site now goes red on a coincidental-shaped or unreadable residue)"
  - ".github/workflows/rebase-upstream.yml (unchanged; reaches the mode through rebase-upstream.sh)"
tech-stack:
  added: []
  patterns:
    - "one collection point in the shared function, one policy per caller, because the justification differs by provenance"
    - "a self-test row that verifies its own precondition and fails loudly rather than skipping when the plant is dead"
    - "discrimination control: green against the pre-fix script restored from git, red against the fixed one"
key-files:
  created: []
  modified:
    - scripts/scan-brand-residue.mjs
    - .planning/phases/01-platform-extraction-and-rename/deferred-items.md
decisions:
  - "The extra-root row set filters `coincidental` and only `coincidental`; `frozen` rows stay applicable because they legitimately occur in a Gecko checkout and carry no residue probe."
  - "`scan()` records unreadable files and leaves the policy to the caller: any unreadable file fails under `--extra-root`, any non-ENOENT reason fails over the tracked tree, and ENOENT keeps its documented allowance."
  - "The `--extra-root` success line reports files READ, not files walked."
  - "The chmod-000 self-test row fails loudly when it cannot establish its precondition. Consequence, accepted: `--self-test` run as root goes red on that row by design."
metrics:
  duration: ~35m
  completed: 2026-08-31
actuals:
  tokens: 7900
  tasks: 3
  commits: 3
---

# Phase 01 Plan 17: Extra-root gate hardening (CR-01, CR-02) Summary

The `--extra-root` residual-brand pass no longer exempts a brand token that a `coincidental`-class
row swallows, and a file it could not open is now a named gate failure instead of a silent skip
counted as scanned.

## What shipped

**Task 1 — CR-01.** The extra-root `scan()` call now passes
`rows: inv.tokens.filter((r) => r.class !== 'coincidental')`. The reason is stated at the call site
in the terms the defect has: `coincidental` rows are assertions about THIS checkout, longest-token-first
claiming lets the 28-character local-path row win over the `brand-identifier` row nested inside it and
write the whole span into `taken[]` — which both removes it from `offensesOf` and suppresses the
independent residue probe at that index — and `reconcile()` condition 2, the only thing keeping those
rows honest over the tracked tree, is deliberately not run in this path. The same comment records that
`frozen` stays applicable on purpose. Commit `aba3fae`.

**Task 2 — CR-02.** `scan()`'s bodyless `catch { continue; }` became
`catch (err) { unreadable.push({ file, reason: err.code ?? err.message }); continue; }`, with
`unreadable` added to BOTH return shapes (the main return and the early empty-file-set return, which
is a different literal). The policy moved to the callers: any unreadable file fails under
`--extra-root`, and any reason other than `ENOENT` fails over the tracked tree. `extraSummary` now
reports `extraFiles.length - extra.unreadable.length`. IN-01 (`resolve(REPO_ROOT, extraRootArg)`),
IN-02 (the root `statSync` / entry lstat asymmetry documented, not changed) and IN-04 (the
tracked-tree side effect of the CLI-spawning rows recorded in the self-test header) folded in.
Commit `cee385b`.

**Task 3 — ledger row 10.** Appended, rows 1-9 untouched. Commit `714c41c`.

## Verbatim evidence

### Tracked-tree pass, unchanged

```
scan-brand-residue: PASS -- no residual brand occurrence in 109 scanned file(s)
EXIT=0
```

Observed before Task 1, after Task 1, after Task 2, and after Task 3 with every change staged.

### CR-01 — discrimination control

**GREEN against the pre-fix script** (`git show HEAD:scripts/scan-brand-residue.mjs` restored to
`scripts/.prefix-control-01-17.mjs`, then removed):

```
$ printf 'MOZ_OBJDIR=/home/chris/coding/<redacted>/objdir\n' > $S/er1/mozconfig
$ node scripts/.prefix-control-01-17.mjs --extra-root $S/er1
scan-brand-residue: PASS -- no residual brand occurrence in 109 scanned file(s), plus 1 file(s) under --extra-root /tmp/.../scratchpad/er1
EXIT=0
```

**RED against the fixed script:**

```
$ node scripts/scan-brand-residue.mjs --extra-root $S/er1
  /tmp/.../scratchpad/er1/mozconfig:1: <token>
scan-brand-residue: FAIL -- 1 residual brand occurrence(s) across 1 file(s) under --extra-root /tmp/.../scratchpad/er1
EXIT=1
```

(The planted literal and the reported token are the real inventory token; they are spelled verbatim
only inside `scripts/scan-brand-residue.mjs`, which `inventory/brand-tokens.json`'s `scope.exclude`
covers. Spelling them in this SUMMARY would fail the permanent gate, so they are elided here.)

**Which path reported it:** the renameable-offence path. The span is no longer claimed by the
`coincidental` row, so it is claimed by the `brand-identifier` row and counted as an offence. The
probe at that index is legitimately still marked taken — by a claim that IS an offence, which is the
correct outcome; the defect was a claim that was not.

### CR-01 — frozen-only control

A scratch root whose only inventory matches are `MOZ_APP_ID`, `%content/branding/` and
`-brand-product-name = Firefox`:

```
scan-brand-residue: PASS -- no residual brand occurrence in 109 scanned file(s), plus 1 file(s) under --extra-root /tmp/.../scratchpad/frozen
EXIT=0
```

`frozen` rows stay applicable; only `coincidental` was filtered.

### CR-02 — discrimination control

**GREEN against the pre-fix script** — one file, never opened, counted as scanned:

```
$ printf 'chrome://<token>/content/x\n' > $S/er2/leak.txt && chmod 000 $S/er2/leak.txt
$ node scripts/.prefix-control-01-17.mjs --extra-root $S/er2
scan-brand-residue: PASS -- no residual brand occurrence in 109 scanned file(s), plus 1 file(s) under --extra-root /tmp/.../scratchpad/er2
EXIT=0
```

**RED against the fixed script**, naming the file and the reason code:

```
$ node scripts/scan-brand-residue.mjs --extra-root $S/er2
  /tmp/.../scratchpad/er2/leak.txt: unreadable (EACCES)
scan-brand-residue: FAIL -- 1 unreadable file(s) under --extra-root /tmp/.../scratchpad/er2 -- a file that could not be read is not a file that was found clean
EXIT=1
```

### The count names files READ

Mixed scratch root, one unreadable file plus one clean file. The gate fires, so no PASS line prints —
see the deviation note below. The arithmetic was observed directly by calling the exported `scan()`
and `extraRootFiles()`:

```
walked=2 unreadable=1 reported-read=1
```

The CLI run over the same root:

```
  /tmp/.../scratchpad/er3/leak.txt: unreadable (EACCES)
scan-brand-residue: FAIL -- 1 unreadable file(s) under --extra-root /tmp/.../scratchpad/er3 -- a file that could not be read is not a file that was found clean
EXIT=1
```

### The precondition guard works

A scratch copy of the fixed script with the `chmodSync(unreadAbs, 0o000)` line removed — which is
what a root-run self-test effectively produces — makes the row report that it proves nothing, and the
self-test exits non-zero:

```
scan-brand-residue: --self-test FAIL -- an unreadable file under --extra-root is a gate failure, not a silent skip: the plant at /tmp/scan-brand-residue-TOUZXJ/extra-root-unreadable/leak.txt is still readable after chmod 000, so this row could not establish its precondition and it proves nothing. This is what happens when --self-test runs as root; run it as a non-root user.
PRECOND-SELFTEST-EXIT=1
```

The scratch copy was discarded.

### Full `--self-test` output — 13 rows

```
scan-brand-residue: --self-test PASS -- planted violation was correctly rejected and named: planted-violation.txt:1:<token>
scan-brand-residue: --self-test PASS -- boundary rule left `re<token>` untouched and matched `<token>PrivilegedJs`
scan-brand-residue: --self-test PASS -- condition 4 named the unclaimed probe hit in planted-boundary.txt
scan-brand-residue: --self-test PASS -- --except-hand-write held back 3 declared hand-write site(s) and still enforced 2 ordinary site(s), including line 2 of the line-scoped file
scan-brand-residue: --self-test PASS -- an empty scan set is reported as empty, not as clean
scan-brand-residue: --self-test PASS -- the same post-rename fixture WITHOUT the plant produced no gate failure (planted-postrename.txt), so the red below is caused by the plant and not by the fixture
scan-brand-residue: --self-test PASS -- an unclaimed trailing-plural form planted on a POST-RENAME fixture was rejected by the un-flagged gate path, naming planted-postrename.txt:2
scan-brand-residue: --self-test PASS -- --extra-root over a clean scratch root is a PASS control
scan-brand-residue: --self-test PASS -- --extra-root names a brand token planted outside the git index
scan-brand-residue: --self-test PASS -- --extra-root on a nonexistent directory fails loudly rather than skipping
scan-brand-residue: --self-test PASS -- a mistyped flag is rejected rather than silently ignored into a green run
scan-brand-residue: --self-test PASS -- --extra-root does not exempt a brand token claimed by a coincidental-class row
scan-brand-residue: --self-test PASS -- an unreadable file under --extra-root is a gate failure, not a silent skip
EXIT=0
```

11 pre-existing rows, both new rows, original labels, original order. The 01-15 clean-control row
still runs before every row that depends on it.

### 01-15 behaviours that must not regress

```
$ node scripts/scan-brand-residue.mjs --extra-root "$(mktemp -d)"
scan-brand-residue: FAIL -- the --extra-root file set is empty for /tmp/tmp.myOsuOfu1i -- an empty file set is not a clean tree, it is a scan that ran over nothing
EXIT=1

$ node scripts/scan-brand-residue.mjs --extra-root /nonexistent/path/for/this/check
scan-brand-residue: FAIL -- --extra-root /nonexistent/path/for/this/check does not exist or cannot be read -- an unreadable extra root is not a clean tree, and skipping it would make this pass green by construction
EXIT=1
```

The mistyped-flag guard and the symlink containment are covered by the self-test rows above.

### `verify-platform.sh --quick` — 24/24 PASS

```
verify-platform: summary
  scan-brand-residue: PASS
  scan-brand-residue-self-test: PASS
  branding-preflight: PASS
  branding-preflight-self-test: PASS
  check-patch-surface: PASS
  check-patch-surface-self-test: PASS
  fetch-upstream-self-test: PASS
  allowlist-schema: PASS
  allowlist-doc-consistency: PASS
  allowlist-doc-consistency-self-test: PASS
  branding-variant-divergence-self-test: PASS
  internals-boundary-self-test: PASS
  internals-boundary: PASS
  internals-catalogue: PASS
  shell-csp-inline-attrs: PASS
  shell04-log-redacts-token: PASS
  gui04-registry-shape: PASS
  gui04-registry-shape-self-test: PASS
  shell-error-copy-no-internals: PASS
  shell-error-copy-no-internals-self-test: PASS
  start-path-recovery: PASS
  start-path-recovery-self-test: PASS
  shell-error-contract: PASS
  shell-error-contract-self-test: PASS
verify-platform: PASS -- all checks passed
QUICK-EXIT=0
```

`grep -n 'scan-brand-residue' scripts/verify-platform.sh` returns exactly the two pre-existing rows
at lines 3493 and 3503. No third row, no sibling driver.

### Repo invariants

- `git -C upstream diff --stat` — `upstream/` exists locally and produced **no output**. Nothing was
  written to it.
- `git status --porcelain` — clean after every self-test run. Every fixture lives under `tmpdir()`.
- `.planning/phases/.../deferred-items.md`: `grep -c '^| 10 |'` = 1, `grep -c '^| [0-9]'` = 10,
  `git diff --stat` = 1 insertion, 0 deletions.

### Ten-identifier checklist for ledger row 10

Every non-Critical finding in `01-REVIEW.md` is accounted for in row 10:

| ID | In row 10 | Disposition |
|----|-----------|-------------|
| WR-01 | PRESENT | folded into 01-16 (depth-0 `message:` filter) |
| WR-02 | PRESENT | folded into 01-16 (`parseUserMessageTable` parse totality) |
| WR-03 | PRESENT | deferred — `pipefail`/early-exit `grep` race misattributes a valid tag |
| WR-04 | PRESENT | deferred — `--tag '*'` reaches `rm -rf` before failing in the clone; the one worth doing first |
| WR-05 | PRESENT | deferred — dry-run rehearsal prints an unpastable command |
| WR-06 | PRESENT | deferred — CI job lacks `permissions:`, `timeout-minutes:`, `persist-credentials: false` |
| IN-01 | PRESENT | folded into 01-17 (`--extra-root` resolves against `REPO_ROOT`) |
| IN-02 | PRESENT | folded into 01-17 as documentation of the stat/lstat asymmetry |
| IN-03 | PRESENT | deferred — hand-kept `FAULTS` literals are fail-loud drift friction, not a defeatable gate |
| IN-04 | PRESENT | folded into 01-17 (self-test header records the tracked-tree side effect) |

CR-01, CR-02 and CR-03 are also each named in the row with the assertion that now holds.

## Deviations from Plan

**1. [Rule 3 — Blocking] The mixed-root count criterion is unsatisfiable as literally written.**

- **Found during:** Task 2.
- **Issue:** the acceptance criterion asks to "confirm from the output that the reported extra-root
  file count is 1 rather than 2" on a root holding one unreadable and one clean file. That count only
  prints on the PASS line, and an unreadable file is now a gate failure — so the run exits 1 and no
  PASS line is produced. The plan's own `<behavior>` block anticipates this ("Reachable only by making
  the unreadable file non-fatal, which it is not, so this is asserted by reading the count arithmetic
  rather than by a run").
- **Fix:** no code change. The arithmetic was observed directly by importing the module's exported
  `scan()` and `extraRootFiles()` against the same scratch root, printing
  `walked=2 unreadable=1 reported-read=1`, alongside the CLI's gate failure naming the unreadable file.
  Making the count printable would have required downgrading the gate to a warning, which the plan's
  prohibitions forbid and which is the exact failure class this plan closes.
- **Files modified:** none.

No other deviations. No auth gates. No architectural decisions.

## Known Stubs

None. Both changes are complete behaviour, each with a fixture row proven red against the fixed
script and green against the pre-fix one.

## Threat Flags

None. This plan modifies one local static Node script and one planning document. The trust surface is
unchanged from 01-15 — the script already read a caller-supplied tree it does not own; what changed is
that the read can no longer fail silently. `T-01-17-01`, `T-01-17-02` and `T-01-17-03` (all `high`,
all `mitigate`) are mitigated by Tasks 1 and 2 and their discrimination controls, recorded verbatim
above.

## Residuals carried forward

Both are on ledger row 10's **Route to**, not lost here:

1. The unreadable-file gate has only ever run against a planted scratch fixture. A real ESR rebase
   over a live multi-gigabyte checkout is the first time it meets a tree nobody in this repo wrote.
   If it goes red for a clone artefact, a permissions oddity or a file past the V8 string limit, the
   answer is a content-based exclusion in `inventory/brand-tokens.json`'s `scope.exclude` — never a
   literal in the walker, never a downgrade to a warning. This is the plan's `backstop` truth.
2. `--self-test` run as root goes red on the unreadable-file row by design. CI runs on
   `ubuntu-latest` as a non-root user and local development runs as a non-root user, so no current
   caller is affected.

## Self-Check: PASSED

- `scripts/scan-brand-residue.mjs` — FOUND (modified, staged, committed)
- `.planning/phases/01-platform-extraction-and-rename/deferred-items.md` — FOUND (row 10 appended)
- Commit `aba3fae` — FOUND
- Commit `cee385b` — FOUND
- Commit `714c41c` — FOUND
