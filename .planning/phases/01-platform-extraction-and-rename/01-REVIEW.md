---
phase: 01-platform-extraction-and-rename
reviewed: 2026-08-31T23:26:51Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - .github/workflows/rebase-upstream.yml
  - docs/BUILD.md
  - scripts/rebase-upstream.sh
  - scripts/scan-brand-residue.mjs
  - scripts/verify-shell-error-copy.mjs
findings:
  critical: 3
  warning: 6
  info: 4
  total: 13
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-08-31T23:26:51Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

> **This report supersedes the prior 01-REVIEW.md.** That review's CR-01
> (shell-error-copy rule-4 derivation) and CR-02 (brand-residue scan blind to
> `upstream/` during a rebase) were closed by plans 01-14 and 01-15. This is a
> fresh adversarial pass over the five files changed since `53b95b1`, and the
> old findings are not carried forward — the numbering below is new.

## Summary

Both gap-closure changes do what their plans claim at the level the plans
tested: `--extra-root` reaches a tree `git ls-files` cannot name, and rule (4)
no longer accepts an arbitrary `<x>.message`. Both, however, closed the exact
demonstration case named in `01-VERIFICATION.md`'s `missing[]` and left the
*class* of failure open one step to either side. Three of those are provable
green-by-construction paths, reproduced against the shipped code:

- a brand-bearing absolute path planted under `--extra-root` exits **0**
  (CR-01), because the `coincidental` row that claims it is only kept honest by
  `reconcile()`, which the extra-root pass deliberately does not run;
- an unreadable file under `--extra-root` is silently skipped, counted in the
  summary as scanned, and exits **0** (CR-02) — the same shape as CR-B, one
  level down from the root check that was hardened;
- a `_showError` call site whose first argument is not followed by a comma, or
  whose receiver is not a literal `this.`, is never enumerated by rule (4) at
  all and exits **0** (CR-03) — CR-A re-opened for any call shape the regex
  does not happen to match.

CR-03 is the one that most directly contradicts this project's own verification
doctrine (`CLAUDE.md`: *derive from the tree and compare*). The checker derives
the *accept set* from the tree, which was the 01-14 fix, but still enumerates
the *call sites* with a regex whose completeness nothing asserts. A check that
silently examines 5 of 6 call sites is a check that can go green on the site it
missed.

The shell and workflow changes are smaller and correct in substance; the
findings there are a `pipefail`/`grep -q` race, loose tag validation, an
unexpanded variable in the dry-run rehearsal text, and missing workflow
hardening.

## Critical Issues

### CR-01: `--extra-root` silently exempts brand residue claimed by a `coincidental` row

**File:** `scripts/scan-brand-residue.mjs:1090` (the extra-root `scan()` call), with
`scripts/scan-brand-residue.mjs:1068-1077` (the comment justifying skipping `reconcile()`)

**Issue:** The extra-root pass reuses the full inventory row set, including the
`coincidental` row `"/home/chris/coding/sourcerer"` (`expected_count: 0`). In
`claimOccurrences`, longest-token-first ordering makes that 28-character row win
over the `lower/sourcerer` `brand-identifier` row, marks the whole span in
`taken[]`, and classifies the occurrence as `coincidental` — so it is **not** an
offense (`offensesOf` filters to `RENAMEABLE_CLASSES`) **and** the `sourcerer`
residue probe at that index is suppressed because `taken[i]` is set.

In the tracked-tree pass this is safe only because `reconcile()` condition 2
asserts `observed === expected_count === 0` for that row. The extra-root pass
deliberately does not call `reconcile()` (for the stated and correct reason that
D-17's census cannot close over a foreign Gecko checkout), so nothing at all
constrains it there. Net effect: the single most likely brand residue in a
replayed tree — an absolute objdir/source path baked into a mozconfig, a patch
header, a generated build file — passes the gate whose entire purpose is
catching it.

Reproduced against the shipped script:

```
$ mkdir -p /tmp/er1 && printf 'MOZ_OBJDIR=/home/chris/coding/sourcerer/objdir\n' > /tmp/er1/mozconfig
$ node scripts/scan-brand-residue.mjs --extra-root /tmp/er1
scan-brand-residue: PASS -- no residual brand occurrence in 109 scanned file(s), plus 1 file(s) under --extra-root /tmp/er1
EXIT=0
```

**Fix:** `coincidental` rows are facts about *this* repo's checkout, not about a
foreign tree, and the `scan()` signature already takes a `rows` override — so
this is a one-argument change that keeps `frozen` rows (`MOZ_APP_ID`,
`%content/branding/`, `-brand-product-name = Firefox`) applicable, since those
legitimately occur in a Gecko checkout and carry no residue probe:

```js
      const extra = scan(inv, {
        root: extraRoot,
        files: extraFiles,
        // `coincidental` rows describe THIS checkout (a local absolute path, a
        // hex colour). Applying them to a foreign tree lets a longest-first
        // claim swallow a real brand token AND suppress condition 4's probe,
        // with no reconcile() count check behind it to catch the difference.
        rows: inv.tokens.filter((r) => r.class !== 'coincidental'),
      });
```

Add a self-test row alongside fixtures 7-9 planting exactly the path above under
a scratch extra root and requiring a red that names it.

### CR-02: an unreadable file under `--extra-root` is skipped silently and counted as scanned

**File:** `scripts/scan-brand-residue.mjs:391-396` (the `catch { continue; }` in `scan()`),
surfaced by `scripts/scan-brand-residue.mjs:1104` (`extraSummary`)

**Issue:** `scan()`'s per-file read is wrapped in `try { ... } catch { continue; }`,
justified by the comment *"a path git tracks but this checkout does not
materialise"*. That justification holds only for the `git ls-files` source. Every
path in the `--extra-root` set came from a `readdirSync` that just reported it as
an existing regular file, so a throw there means EACCES, EISDIR, or a file past
the V8 string limit — never "not materialised". The file is skipped, no failure
is recorded, and `extraSummary` still reports it in the `N file(s) under
--extra-root` count, so the operator is told a file was scanned that was never
read.

`extraRootFiles` fails loudly on an absent or unreadable *root* precisely because
"a skip-when-absent mode would reproduce CR-B in a new shape" — the same argument
applies one level down and was not carried there.

Reproduced against the shipped script:

```
$ mkdir -p /tmp/er2 && printf 'chrome://sourcerer/content/x\n' > /tmp/er2/leak.txt && chmod 000 /tmp/er2/leak.txt
$ node scripts/scan-brand-residue.mjs --extra-root /tmp/er2
scan-brand-residue: PASS -- no residual brand occurrence in 109 scanned file(s), plus 1 file(s) under --extra-root /tmp/er2
EXIT=0
```

**Fix:** make the skip conditional on the file set's provenance and surface the
skips. Minimal shape — collect them rather than discarding them:

```js
export function scan(inv, { chain = null, root = REPO_ROOT, files = null, rows = null } = {}) {
  ...
  const unreadable = [];
  for (const file of activeFiles) {
    let text;
    try {
      text = readFileSync(join(root, file), 'utf8');
    } catch (err) {
      unreadable.push({ file, reason: err.code ?? err.message });
      continue;
    }
    ...
  }
  return { empty: false, occurrences, unclaimedProbes, unreadable, rawCounts, files: activeFiles, rows: activeRows };
}
```

then in `main()`'s extra-root block:

```js
      if (extra.unreadable.length !== 0) {
        for (const u of extra.unreadable) console.error(`  ${join(extraRoot, u.file)}: unreadable (${u.reason})`);
        gate.push(`${extra.unreadable.length} unreadable file(s) under --extra-root ${extraRoot} -- a file that could not be read is not a file that was found clean`);
      }
```

and report `extraFiles.length - extra.unreadable.length` in `extraSummary` so the
count names files actually read.

### CR-03: rule (4) does not enumerate all `_showError` call sites, and nothing asserts that it does

**File:** `scripts/verify-shell-error-copy.mjs:303` (the call-site regex),
`scripts/verify-shell-error-copy.mjs:336-341` (the only completeness guard)

**Issue:** 01-14 correctly replaced the "any `<x>.message` is fine" accept rule
with a set derived from the file. It left the *enumeration* of call sites as
`/this\._showError\(\s*([^,]+?)\s*,/g`, which requires (a) a literal `this.`
receiver and (b) a comma after the first argument. A call site that matches
neither is not rejected — it is never seen. The only completeness assertion is
`callSites === 0`, which fires only if *every* call site disappears, so 5 sites
parsed out of 6 present is indistinguishable from a clean run.

This violates `CLAUDE.md`'s rule that a check must derive its expectation from
the tree and compare, and it re-opens CR-A for any call shape outside the regex.
All three of these appended to a copy of `TheiaService.sys.mjs` exit **0**:

```js
// (1) no comma after the first argument, and no later comma in the file
try { x(); } catch (err) { this._showError(err.message) }

// (2) optional-chaining receiver
try { x(); } catch (err) { this?._showError(err.message, false, []); }

// (3) bound alias
const show = this._showError.bind(this); show(err.message, false, []);
```

```
$ node scripts/verify-shell-error-copy.mjs --file /tmp/sec2/TheiaService.sys.mjs
verify-shell-error-copy: PASS -- no internal identifier can reach the error layer (...)
EXIT=0
```

(Today the real file parses 5 of 5 sites, so the check is currently complete —
that is luck about comma placement, not an invariant the check holds.)

**Fix:** derive the total independently and require equality, which is the same
set-equality discipline checks (2) and (3) already use:

```js
  // Every textual `_showError(` in the file, minus its one definition. If the
  // argument regex below parses fewer than this, a call site exists that this
  // check never examined -- which is exactly how a leak ships green.
  const definitions = (src.match(/^\s*_showError\s*\(/gm) ?? []).length;
  const present = (src.match(/_showError\s*\(/g) ?? []).length - definitions;
  ...
  if (callSites !== present) {
    fail(
      `${present} \`_showError(\` call site(s) are present but only ${callSites} could be parsed -- ` +
        `a call site this check cannot read is a call site it is not checking; make the call shape ` +
        `\`this._showError(<arg>, ...)\` or teach this check the new shape`
    );
  }
```

Add two `FAULTS` rows for it: one appending a comma-less call, one appending an
optional-chained call, each expecting the new message.

## Warnings

### WR-01: `messageBearingBindings` shape (a) accepts a nested `message:`, so a binding whose `.message` is `undefined` passes

**File:** `scripts/verify-shell-error-copy.mjs:167-172`

**Issue:** Shape (a) tests `/(?:^|[^\w.$])message:/` against the *entire* brace
body of the initializer, at any nesting depth. A `message:` buried in a nested
object or array element marks the outer binding as message-bearing, even though
`<binding>.message` is `undefined` at runtime. The file's own doc comment states
the opposite intent — *"A method whose every return sets `message: null` does NOT
qualify: a binding whose `.message` is always null would paint nothing, which is
a different defect and must not be waved through here."* The nested case is that
defect, and it is waved through. Reproduced (exits 0):

```js
const wrap = {
  details: [{
    message: USER_MESSAGE.couldNotStart,
  }],
};
this._showError(wrap.message, false, []);
```

**Fix:** scan only depth-1 properties of the literal. Reuse `braceBody` to strip
nested braces/brackets before the test:

```js
    const body = braceBody(src, m.index + m[0].length - 1);
    if (body !== null && /(?:^|[^\w.$])message:/.test(topLevelOnly(body))) {
      bearing.add(m[1]);
    }
```

where `topLevelOnly` drops any span at depth > 0. Add a `FAULTS` row planting the
nested shape above.

### WR-02: `parseUserMessageTable` silently drops table entries its regex cannot parse

**File:** `scripts/verify-shell-error-copy.mjs:97-101`

**Issue:** `entryRe` matches only `key: "double-quoted single-line string",`. An
entry written as a template literal, with single quotes, as a concatenation, or
wrapped across two lines is not added to `entries` — with no error. Consequences
split by whether the key is referenced: a *referenced* unparsed key goes red at
check (2) (fail-safe), but a *declared-and-unreferenced* unparsed key is invisible
to check (1) (never leak-scanned) **and** to check (3) (which iterates
`entries.keys()`). No `FAULTS` row covers an unparsed entry.

**Fix:** assert the parse is total — count top-level `key:` lines in the table
block and require equality:

```js
  const declaredLines = (block[1].match(/^\s{2}[A-Za-z_$][\w$]*:/gm) ?? []).length;
  if (entries.size !== declaredLines) {
    return { entries, raw: block[0], unparsed: declaredLines - entries.size };
  }
```

and `fail()` on a non-zero `unparsed`, naming the count.

### WR-03: `pipefail` + `grep -q` can report a valid tag as missing

**File:** `scripts/rebase-upstream.sh:54` (with `set -euo pipefail` at line 13)

**Issue:** `grep -q` exits as soon as it matches. If `git ls-remote` has not
finished writing, it takes SIGPIPE and exits 141; `pipefail` propagates that as
the pipeline status, the `if !` inverts it, and the script prints
`FAIL -- tag $NEW_TAG does not exist on $REMOTE` for a tag that does exist. The
output here is small so the race is narrow, but the failure is non-deterministic
and its message points the operator at the wrong cause — a bad property for the
first gate in a 40-minute operation.

**Fix:** take the pipe out of the conditional:

```sh
TAG_REFS="$(git ls-remote --tags "$REMOTE" "refs/tags/$NEW_TAG" || true)"
if ! printf '%s' "$TAG_REFS" | grep -qF -- "refs/tags/$NEW_TAG"; then
```

### WR-04: tag validation treats `$NEW_TAG` as a glob and a regex, so `--tag '*'` passes it

**File:** `scripts/rebase-upstream.sh:54`

**Issue:** `$NEW_TAG` is interpolated into a `git ls-remote` refspec (glob-matched
by git) *and* into a `grep` basic regular expression. `--tag '*'` lists every tag
and matches the BRE `refs/tags/*` (a literal `refs/tags` followed by zero or more
`/`), so validation passes; the run then proceeds to `rm -rf upstream/` and fails
much later inside `git clone --branch '*'`. A tag containing `.` also matches
loosely, so a near-miss typo can validate against a different tag. The step's
stated purpose — *"Cheaper than discovering a typo after a 1.1 GB clone"* — is
what this defeats. No command injection: every use is quoted and `--branch`
consumes its value positionally.

**Fix:** validate the shape before using it as a pattern:

```sh
if ! [[ "$NEW_TAG" =~ ^[A-Za-z0-9._-]+$ ]]; then
  echo "rebase-upstream: FAIL -- tag '$NEW_TAG' is not a plain tag name ([A-Za-z0-9._-]+)" >&2
  exit 1
fi
```

then keep the `grep -qF` from WR-03.

### WR-05: the `--dry-run` rehearsal prints `--extra-root "$UPSTREAM_DIR"` unexpanded

**File:** `scripts/rebase-upstream.sh:66`

**Issue:** Every other dry-run line expands the variable (`'$REPO_ROOT/...'`,
line 63's `rm -rf '$UPSTREAM_DIR'`, line 68's `readlink -f '$UPSTREAM_DIR/...'`).
Line 66 escapes it (`\"\$UPSTREAM_DIR\"`) and prints the literal text
`--extra-root "$UPSTREAM_DIR"`. Pasted into a shell where that variable is unset,
it becomes `--extra-root ""`, which the scanner rejects with exit 2. Since the
script's header states the real path is exercised locally **only** via
`--dry-run`, this printed text is the artifact under local test, and it is the
one line of it that does not work.

**Fix:**

```sh
  echo "  4b. node '$REPO_ROOT/scripts/scan-brand-residue.mjs' --extra-root '$UPSTREAM_DIR'  # D-18 permanent gate, no exception; --extra-root reaches the replayed tree, which is git-ignored and invisible to git ls-files"
```

### WR-06: the workflow declares no `permissions:` and no `timeout-minutes:`

**File:** `.github/workflows/rebase-upstream.yml:30-33`

**Issue:** With no `permissions:` block the job receives the repository's default
`GITHUB_TOKEN` scope, which on many repos is still write-capable. This job only
reads the repo and clones a public remote, and `actions/checkout` leaves those
credentials in `.git/config` for the duration — including while
`scripts/rebase-upstream.sh` runs a 1.1 GB clone and executes repo scripts. There
is also no `timeout-minutes`, so a stalled clone burns the runner to the 6-hour
default. (The `tag` input is correctly passed through `env:` and quoted, so there
is no script-injection issue in the run steps.)

**Fix:**

```yaml
jobs:
  rebase:
    runs-on: ubuntu-latest
    timeout-minutes: 60
    permissions:
      contents: read
    steps:
      - name: Check out repo
        uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          persist-credentials: false
```

## Info

### IN-01: `--extra-root` resolves against `cwd`, `--report` against `REPO_ROOT`

**File:** `scripts/scan-brand-residue.mjs:1047` vs `scripts/scan-brand-residue.mjs:1080`

**Issue:** `resolve(REPO_ROOT, reportPath)` versus `resolve(extraRootArg)`. Two
path flags on one CLI resolve relative arguments against two different bases.
Both current call sites pass an absolute path, so nothing is broken today.

**Fix:** use `resolve(REPO_ROOT, extraRootArg)` and say so in the usage block, or
require an absolute path and reject a relative one by name.

### IN-02: the extra-root walk never follows a symlink, but `statSync` on the root does

**File:** `scripts/scan-brand-residue.mjs:329-336`

**Issue:** The walk uses `dirent.isSymbolicLink()` (lstat semantics) and skips
links, per the documented reason. The root itself is checked with `statSync`,
which follows links — so a symlinked `--extra-root` is walked while every
symlink inside it is skipped. Harmless for `upstream/`, but the two halves state
different rules.

**Fix:** use `lstatSync` for the root, or document that the root may be a link
while its contents may not.

### IN-03: `FAULTS` hand-keeps exact copy literals from the file under test

**File:** `scripts/verify-shell-error-copy.mjs:348-417`

**Issue:** Rows key off exact sentences ("Power Browser's interface didn't finish
starting.") and exact key names (`nodeMissing`, `couldNotStart`). Rewording the
user-facing copy makes `mutated === original` and the row reports
`the fault did not apply; this self-test row proves nothing` — fail-loud, so this
is drift friction rather than a vacuous check.

**Fix:** derive the substitution targets from `parseUserMessageTable` (e.g. mutate
the first declared entry by key) so a copy edit does not require editing the
self-test.

### IN-04: `--self-test` now depends on the real working tree being clean

**File:** `scripts/scan-brand-residue.mjs:879-950`

**Issue:** Fixtures 7-9 and the typo guard spawn the real CLI four times, and each
child also runs the full tracked-tree scan. A dirty tree turns the
`--extra-root over a clean scratch root is a PASS control` row red. The control
row exists precisely so that red is attributable, so the behaviour is correct —
but `scan-brand-residue-self-test` is registered in `verify-platform.sh` and now
costs four extra full-tree scans and inherits the gate's own preconditions.

**Fix:** none required. Worth a line in the self-test header noting that the row
ordering makes a dirty-tree failure attributable, and that the control must be
read first.

---

_Reviewed: 2026-08-31T23:26:51Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
