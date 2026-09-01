---
phase: 01-platform-extraction-and-rename
fixed_at: 2026-08-31T00:00:00Z
review_path: .planning/phases/01-platform-extraction-and-rename/01-REVIEW.md
iteration: 1
findings_in_scope: 10
fixed: 10
skipped: 0
status: all_fixed
---

# Phase 01: Code Review Fix Report

**Fixed at:** 2026-08-31
**Source review:** `.planning/phases/01-platform-extraction-and-rename/01-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 10 (1 critical, 9 warning)
- Fixed: 10
- Skipped: 0
- Info findings (IN-01 through IN-04) were out of scope for this run and are untouched.

**Where verification ran:** the **main checkout** at `/home/chris/coding/Power-Browser`.
`.planning/config.json` sets `workflow.use_worktrees: false`, so no isolated worktree
was created and every gate below is reproducible from the tree as it stands.

**Gate result after all ten fixes:** `scripts/verify-platform.sh --quick` — **PASS**,
all 24 rows. `node scripts/scan-brand-residue.mjs` — **PASS**, 109 scanned files,
run with the changed files staged (the scan iterates `git ls-files`, so an unstaged
new file is invisible to it).

## Fixed Issues

### CR-01: the `definitions` term absorbs a receiverless call site, so the completeness counts cancel

**Files modified:** `scripts/verify-shell-error-copy.mjs`
**Commit:** `6020d63`

Replaced the count-based completeness guard with a **position-set** comparison.
`allSites` is every textual `_showError(` start offset; `defs` is the one occurrence
whose parameter list is followed by a body (asserted to be exactly one, which removes
the "line-initial means definition" assumption a receiverless call also satisfied);
`parsed` is recorded **by the enumeration loop itself** rather than by a second pattern
guessing what that loop reaches. Anything in `allSites` that is neither the definition
nor a parsed site is a loud failure. `definitions`/`present` are gone.

One deviation from the review's proposed patch, and it matters: the review derived
`parsed` from `/this\._showError\(/g`, which is **wider** than the enumeration regex
(`/this\._showError\(\s*([^,]+?)\s*,/g` also requires a comma). Adopting it verbatim
would have made the pre-existing FAULTS row *"call site with no trailing comma is never
enumerated"* go green — silently deleting a check the previous plan earned. Recording
offsets inside the enumeration loop keeps the parsed set equal to the set actually
examined, by construction.

New FAULTS row `receiverless line-initial _showError() call site is absorbed by the
definition term`, expecting `were not parsed`. Evidentiary standard met as the review
required:

- **GREEN against a scratch copy of today's (pre-fix) checker** — `verify-shell-error-copy: PASS`, exit 0, on `TheiaService.sys.mjs` + `\n_showError(err.message, false, []);\n`.
- **RED against the fixed checker** — `FAIL -- 1 _showError( call site(s) at offset(s) 21990 were not parsed`, exit 1.

### WR-01: a `.bind`-aliased call site is invisible to both derivations

**Files modified:** `scripts/verify-shell-error-copy.mjs`
**Commit:** `97c99bd`

Added an `escapes` check: any textual `_showError` **not** immediately followed by `(`
is rejected by name and offset. This rejects the escape rather than trying to follow it
(following an alias is a dataflow problem, not a regex one). New FAULTS row
`_showError aliased through .bind is invisible to every derivation`, expecting
`referenced without being called`.

Reproduced green before the fix (exit 0) and red after (exit 1) against
`TheiaService.sys.mjs` + `const show = this._showError.bind(this);` / `show(err.message, false, []);`.

### WR-02: the totality count shares `entryRe`'s exact blind spot

**Files modified:** `scripts/verify-shell-error-copy.mjs`
**Commit:** `75dca68`

`declared` no longer reuses `entryRe`'s key grammar — it counts any line at the table's
own depth-1 indentation bearing a colon, whatever the key form, so a quoted, numeric or
computed member is *seen* even though the parser cannot read it. The comment states
plainly that a depth-1 spread carries no colon and is still invisible to both, since
closing that needs a parser rather than a second pattern.

New FAULTS row `quoted-key USER_MESSAGE entry is invisible to both the parser and its
counter`, expecting `never leak-scanned`. Reproduced green before (a quoted-key entry
carrying `POWERBROWSER_BACKEND_READY` passed, exit 0) and red after
(`declares 6 entries but only 5 could be parsed`, exit 1).

### WR-03: the tracked-tree PASS line counts files it never opened

**Files modified:** `scripts/scan-brand-residue.mjs`
**Commit:** `d8f47e0`

The PASS line now prints `result.files.length - (result.unreadable ?? []).length`. Any
non-ENOENT entry has already pushed a gate reason before that line, so at the PASS line
the subtrahend is exactly the allowed ENOENT skips. Added a `--reconcile`-verbosity
`SKIPPED --` listing of those paths, so a growing skip set stays visible instead of
folding into a shrinking number.

Reproduced before the fix: `scan(inv, {files:['README.md','does/not/exist.txt']})` returned
`files.length === 2` with one ENOENT.

### WR-04: a trailing `//` comment mentioning `_showError(` makes the commit gate permanently red

**Files modified:** `scripts/verify-shell-error-copy.mjs`
**Commit:** `03cffa0`

Introduced `codeOnly` — `src` with trailing `//` comments stripped, guarded so `http://`
and `https://` (no whitespace before the `//`) survive — and derived `allSites`, `defs`,
`escapes` and the enumeration loop from it. Scoped to that block only; `stripComments`
is unchanged, so no other derivation sees a mangled URL.

This mattered more after CR-01 and WR-01 than before them: under the position-set scheme
a trailing comment produced an unparsed site, and under the `escapes` check a comment
mentioning bare `_showError` would have fired too. Verified: the trailing-comment file is
now exit 0, while the CR-01, WR-01 and WR-02 plants all remain exit 1.

### WR-05: CR-01's row filter is justified by hand-enumerating today's inventory

**Files modified:** `scripts/scan-brand-residue.mjs`
**Commit:** `3fd3305`

Added `assertNoProbeSwallowingRow(inv, path)`, run from `loadInventory`, which derives the
invariant from the inventory instead of arguing it in a comment: no row that is neither
renameable nor already excluded from the `--extra-root` row set may contain a residue
probe. The `--extra-root` comment now points at the assertion rather than listing the rows
that happen to exist today.

Added self-test **Fixture 5b**, control-then-plant against one fixture written to disk and
read back **through `loadInventory`** (because "fails at load" is the claim): the unplanted
inventory must load, and the same inventory plus one `frozen` row carrying the probe must
throw naming the row. Both halves pass.

### WR-06: `pipefail` + `grep -q` can report a valid tag as missing

**Files modified:** `scripts/rebase-upstream.sh`
**Commit:** `c2b3e28`

`git ls-remote` output is captured first (`|| true`, so an absent tag is an empty capture
rather than a `set -e` abort) and matched second with `grep -qF --`. There is no longer a
pipe for `grep -q`'s early exit to SIGPIPE.

Verified both directions against the live remote: a nonexistent tag is rejected with the
correct message (exit 1), and `--dry-run` against a real tag (`FIREFOX_102_0esr_RELEASE`)
exits 0. The race itself is not reproducible on demand — the fix removes the pipe that
causes it, which is structural rather than probabilistic.

### WR-07: `--tag '*'` passes validation and reaches `rm -rf upstream/`

**Files modified:** `scripts/rebase-upstream.sh`
**Commit:** `07dd1f8`

Added step 1a: `[[ "$NEW_TAG" =~ ^[A-Za-z0-9._-]+$ ]]` before the tag is used as a refspec
glob, printed after the existing "target tag" echo so the requested value is still named on
every path. Verified `--tag '*' --dry-run` now exits 1 **before** any `rm`, with `upstream/`
still present, while a plain tag name reaches step 1 unchanged. The `-F` added in WR-06 also
closes the BRE half (a `.` in a tag name can no longer match a near-miss neighbour).

### WR-08: the `--dry-run` rehearsal prints `--extra-root "$UPSTREAM_DIR"` unexpanded

**Files modified:** `scripts/rebase-upstream.sh`
**Commit:** `39dc1ea`

Line 4b now expands the variable in single quotes like every neighbouring line. Verified by
running the dry run: it prints `--extra-root '/home/chris/coding/Power-Browser/upstream'`.

### WR-09: the workflow declares no `permissions:`, `timeout-minutes:`, or `persist-credentials: false`

**Files modified:** `.github/workflows/rebase-upstream.yml`
**Commit:** `49b4754`

Added `timeout-minutes: 60` and `permissions: {contents: read}` on the `rebase` job, and
`persist-credentials: false` on the `actions/checkout` step, so the token is neither
write-capable nor left in `.git/config` while a 1.1 GB third-party tree is on disk and repo
scripts run over it. The pinned action SHA is unchanged, and the `tag` input already reached
`run:` through `env:` quoted, so no injection surface was touched. Parsed the file with
`js-yaml` to confirm the three settings land on the intended nodes.

---

## Notes for the next reader

- **Info findings are untouched.** IN-01 (shorten the unreachable `extraSummary` comment),
  IN-02 (`EISDIR`/gitlink allowance), IN-03 (`depthZeroOnly` string awareness) and IN-04
  (`FAULTS` hand-keeps copy literals) were out of `critical_warning` scope. IN-01's comment
  still credits an unreachable expression with closing half of CR-02; WR-03 is what actually
  closes the reachable half, and this report is the only place that currently says so.
- **`deferred-items.md` row 10 is now stale** for WR-06 through WR-09 and IN-04's
  neighbourhood: four items that row records as deliberately-not-done are done. That file was
  not edited here (it is a planning artifact, not source), but it should be reconciled before
  the phase is marked complete.
- **The two `--self-test` suites grew**: `verify-shell-error-copy.mjs` is at 15 fault rows
  (was 12), `scan-brand-residue.mjs` gained Fixture 5b. Every new row was verified to be green
  against the pre-fix code and red against the post-fix code, so none of them is a row that
  can only ever pass.

---

_Fixed: 2026-08-31_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
</content>
