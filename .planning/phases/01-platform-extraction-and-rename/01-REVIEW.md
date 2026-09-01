---
phase: 01-platform-extraction-and-rename
reviewed: 2026-08-31T00:00:00Z
depth: standard
files_reviewed: 49
files_reviewed_list:
  - CLAUDE.md
  - docs/BUILD.md
  - docs/CUSTOMIZE.md
  - docs/URI-SCHEMES.md
  - .github/workflows/rebase-upstream.yml
  - inventory/brand-tokens.json
  - .mozconfig
  - patches/010-powerbrowser-identity.patch
  - patches/020-powerbrowser-shell.patch
  - powerbrowser/branding/dev/configure.sh
  - powerbrowser/branding/dev/content/aboutDialog.css
  - powerbrowser/branding/dev/locales/en-US/brand.ftl
  - powerbrowser/branding/dev/locales/en-US/brand.properties
  - powerbrowser/branding/mark.svg
  - powerbrowser/branding/release/configure.sh
  - powerbrowser/branding/release/content/aboutDialog.css
  - powerbrowser/branding/release/locales/en-US/brand.ftl
  - powerbrowser/branding/release/locales/en-US/brand.properties
  - powerbrowser/endpoint-allowlist.json
  - powerbrowser/INTERNAL-APIS.md
  - powerbrowser/powerbrowser.desktop
  - powerbrowser/powerbrowser-release.desktop
  - powerbrowser/shell/moz.build
  - powerbrowser/shell/PowerBrowserAPI.sys.mjs
  - powerbrowser/shell/powerbrowser.css
  - powerbrowser/shell/powerbrowser.js
  - powerbrowser/shell/TheiaService.sys.mjs
  - scripts/check-internals-boundary.sh
  - scripts/lib/firefox-bidi.mjs
  - scripts/rebase-upstream.sh
  - scripts/rename-brand.mjs
  - scripts/scan-brand-residue.mjs
  - scripts/verify-branding-identity.mjs
  - scripts/verify-branding.mjs
  - scripts/verify-branding-preflight.mjs
  - scripts/verify-gui01-command.mjs
  - scripts/verify-gui01-window.mjs
  - scripts/verify-platform.sh
  - scripts/verify-shell-error-contract.mjs
  - scripts/verify-shell-error-copy.mjs
  - scripts/verify-start-path-recovery.mjs
  - theia/applications/browser/package.json
  - theia/extensions/branding/src/browser/powerbrowser-about-dialog.tsx
  - theia/extensions/branding/src/browser/powerbrowser-mark.ts
  - theia/extensions/branding/src/browser/powerbrowser-welcome-widget.tsx
  - theia/extensions/tab-uris/src/browser/browser-window-command.ts
  - theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts
  - theia/extensions/token-gate/src/node/powerbrowser-env.ts
findings:
  critical: 1
  warning: 9
  info: 4
  total: 14
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-08-31
**Depth:** standard
**Files Reviewed:** 49 (2 changed since the last review base; the remainder re-scanned)
**Status:** issues_found

## Summary

**Prior findings verified closed — not re-reported below.** Each was reproduced
against the shipped code before being struck:

| Prior | Verdict | Evidence |
|---|---|---|
| CR-01 (`--extra-root` exempts residue claimed by a `coincidental` row) | **closed** | `scan()` at `scripts/scan-brand-residue.mjs:1237` now passes `rows: inv.tokens.filter(r => r.class !== 'coincidental')`; the `--self-test` row planting the exact mozconfig reproduction goes red naming both root and file. |
| CR-02 (unreadable file under `--extra-root` skipped silently, counted as scanned) | **closed** | `scan()` records `{file, reason}`; the extra-root caller gates on any of them; the self-test row establishes its own precondition before asserting. |
| CR-03 (`_showError` call-site enumeration not asserted complete) | **partially closed** | The two named shapes go red, but the compensating counter opens a *new* green path — see CR-01 below — and the `.bind` shape is still unseen (WR-01). |
| WR-01 (nested `message:` makes a binding falsely message-bearing) | **closed** | `depthZeroOnly()` at `scripts/verify-shell-error-copy.mjs:137`; fault row red. |
| WR-02 (unparsed `USER_MESSAGE` entries dropped silently) | **partially closed** | The totality assertion exists but shares its blind spot with the parser it checks — see WR-02 below. |

`scripts/verify-platform.sh --quick` is green (24 rows), and both `--self-test`
suites pass end to end. That is the ceiling of what those suites prove, and this
pass found three inputs they do not cover.

**The headline is CR-01.** 01-16 fixed the *symptom* CR-03 named (two call
shapes the enumeration regex could not read) by adding a second, independently
derived count. The second count subtracts a `definitions` term computed with
`/^\s*_showError\s*\(/gm` — a hand-written assumption that a line-initial
`_showError(` is the method definition. A receiverless call written at line
start is absorbed by that term, so `present` falls by exactly one at the same
moment `callSites` fails to rise. The two errors cancel, the assertion agrees
with itself, and a caught exception's `.message` reaches
`#powerbrowser-error-message` on a green run. Before 01-16 that site was merely
*unseen*; it is now *masked by the completeness check itself*, which is a worse
state than the one the plan set out to fix.

Two further inputs go green that should not: a `.bind`-aliased call site
(WR-01), and a quoted-key `USER_MESSAGE` entry (WR-02) — the latter because the
"deliberately dumber" second count added for WR-02 requires a bare identifier
key, exactly as `entryRe` does. Both are `CLAUDE.md` "derive from the tree and
compare" failures: a second derivation that shares the first's blind spot is not
a cross-check, and a subtracted term computed by a hand-written pattern is a
hand-kept expectation wearing a derivation's clothes.

The remaining warnings are the four `rebase-upstream.sh` / workflow items that
`deferred-items.md` row 10 records as *deliberately not done*. They are open
defects in the tree under review, so they are carried forward here rather than
dropped, in condensed form.

## Critical Issues

### CR-01: the new `definitions` term absorbs a receiverless call site, so the completeness counts cancel and rule (4) goes green on a leaked exception message

**File:** `scripts/verify-shell-error-copy.mjs:379-380` (the two counters), with
`scripts/verify-shell-error-copy.mjs:422-430` (the assertion they feed)

**Issue:** `present` is computed as *(every textual `_showError(`)* minus
*`definitions`*, where `definitions` is `[...src.matchAll(/^\s*_showError\s*\(/gm)].length`
— every line whose first non-whitespace token is `_showError(`. That pattern
does not describe "the method definition". It describes "a line-initial
`_showError(`", and a **call** written without a receiver at the start of a line
matches it just as well.

The consequence is exact cancellation. Appending one receiverless call site
raises the raw textual count by 1 **and** raises `definitions` by 1, so
`present` is unchanged; `callSites` (which requires a literal `this.` receiver)
is also unchanged; `callSites === present` holds; the run exits 0. The call site
is never examined by rule (4), so its argument — here a caught exception's
`.message`, the exact shape `CLAUDE.md`'s user-facing-copy rule and this whole
checker exist to stop — is never rejected.

Reproduced against the shipped checker (contrast case F below shows the counts
*do* move when the plant is not absorbed):

```sh
$ cp powerbrowser/shell/TheiaService.sys.mjs /tmp/E.mjs
$ printf '\n_showError(err.message, false, []);\n' >> /tmp/E.mjs
$ node scripts/verify-shell-error-copy.mjs --file /tmp/E.mjs
verify-shell-error-copy: PASS -- no internal identifier can reach the error layer (/tmp/E.mjs)
EXIT=0
```

This is the same failure class as CR-03 (`a check that silently examines 5 of 6
call sites is a check that can go green on the site it missed`), reintroduced by
the mechanism intended to close it. It also violates `CLAUDE.md`'s verification
rule 2 directly: the subtracted term is a hand-written pattern nothing
constrains, so the "independently derived total" is not independent of an
assumption about call shape.

**Fix:** compare **positions**, not counts. Position-set equality cannot cancel,
and it removes the `definitions` heuristic entirely — the definition is
identified by the one thing that actually distinguishes it (a body follows the
parameter list), and the file is required to have exactly one:

```js
  // Every textual `_showError(` start offset in the comment-stripped source.
  const allSites = [...src.matchAll(/_showError\s*\(/g)].map((m) => m.index);
  // The definition is the one occurrence whose parameter list is followed by a
  // body. Asserting there is EXACTLY one removes the "line-initial means
  // definition" assumption, which a receiverless CALL also satisfies.
  const defs = [...src.matchAll(/_showError\s*\([^)]*\)\s*\{/g)].map((m) => m.index);
  if (defs.length !== 1) {
    fail(
      `${defs.length} \`_showError(...) {\` definition(s) found -- this check assumes exactly one; ` +
        `with none it is asserting nothing, with two it cannot say which sites belong to which`
    );
  }
  const parsed = new Set([...src.matchAll(/this\._showError\(/g)].map((m) => m.index + "this.".length));
  const unparsed = allSites.filter((i) => !defs.includes(i) && !parsed.has(i));
  if (unparsed.length !== 0) {
    fail(
      `${unparsed.length} \`_showError(\` call site(s) at offset(s) ${unparsed.join(", ")} were not ` +
        `parsed -- a call site this check cannot read is a call site it is not checking. Write the ` +
        `call as \`this._showError(<message>, ...)\`, or teach this check the new shape`
    );
  }
```

(Keep the existing `callSites === 0` guard; drop `definitions`/`present`.)

Add a `FAULTS` row planting `\n_showError(err.message, false, []);\n` and
expecting `were not parsed`. It must be verified GREEN against a scratch copy of
today's checker and RED against the fixed one — otherwise the row proves nothing
about this change, which is the same evidentiary standard rows 9-12 already
meet.

## Warnings

### WR-01: a `.bind`-aliased call site is invisible to **both** counters, so CR-03's third documented bypass is still open

**File:** `scripts/verify-shell-error-copy.mjs:379-383`

**Issue:** Both the enumeration regex and the new completeness counter key on
the literal text `_showError(`. `this._showError.bind(this)` contains
`_showError.bind(` — the parenthesis is not adjacent — so the aliased method is
counted by neither, the counts agree, and the call through the alias is never
examined. This was case (3) of the previous CR-03 reproduction; cases (1) and
(2) are closed, this one is not.

Reproduced (exits 0):

```sh
$ printf '\nconst show = this._showError.bind(this);\nshow(err.message, false, []);\n' >> /tmp/A.mjs
$ node scripts/verify-shell-error-copy.mjs --file /tmp/A.mjs
verify-shell-error-copy: PASS -- ...
EXIT=0
```

**Fix:** reject the escape rather than trying to follow it — any textual
`_showError` **not** immediately followed by `(` is a reference that removes the
method from this check's reach:

```js
  const escapes = [...src.matchAll(/_showError(?!\s*\()/g)].map((m) => m.index);
  if (escapes.length !== 0) {
    fail(
      `\`_showError\` is referenced without being called (offset(s) ${escapes.join(", ")}) -- an ` +
        `alias, a \`.bind\`, or a property read hands the error layer to a call site this check ` +
        `cannot see. Call it directly as \`this._showError(<message>, ...)\``
    );
  }
```

Add a `FAULTS` row planting the two-line `.bind` snippet above.

### WR-02: the WR-02 totality count shares `entryRe`'s exact blind spot, so a quoted-key entry is still dropped silently

**File:** `scripts/verify-shell-error-copy.mjs:120-121` (the `declared` count),
guard at `scripts/verify-shell-error-copy.mjs:275-285`

**Issue:** The added count is described in its own comment as *"a second,
deliberately dumber count of what the table DECLARES"*. It is not independent:
`entryRe` requires `[A-Za-z_$][\w$]*` as the key, and `declared` requires
`[A-Za-z_$][\w$]*` as the key. Every key form the parser cannot read, the
counter also cannot see — so both are zero for the same entry, `declared ===
entries.size` holds, and the guard never fires. Object-literal keys are legal
as string literals, as numbers, and as computed `[expr]`, and a spread element
`...{ ... }` is dropped by both as well.

Reproduced — a declared, unreferenced, quoted-key entry carrying an internal
all-caps sentinel passes the gate whose one job is leak-scanning declared
user-facing strings:

```sh
$ # inserted into the table:  "quotedKey": "Backend did not announce POWERBROWSER_BACKEND_READY within 90000ms.",
$ node scripts/verify-shell-error-copy.mjs --file /tmp/C.mjs
verify-shell-error-copy: PASS -- ...
EXIT=0
```

(The same input with a *bare* identifier key correctly goes red, which is what
makes the key form — not the string content — the discriminator.)

**Fix:** make the second count actually dumber — count depth-1 lines that carry
a colon at all, regardless of key form, so a form the parser cannot read is
still *seen*:

```js
  // Deliberately does NOT reuse entryRe's key pattern: a second count that
  // shares the first's key grammar cannot disagree with it, and a count that
  // cannot disagree is not a cross-check. Any depth-1 line bearing a colon
  // counts, so a quoted, numeric, computed or spread member is visible here
  // even though the parser above cannot read it.
  const declared = [...block[1].matchAll(new RegExp(`^${indent}\\S.*:`, "gm"))].length;
```

Add a `FAULTS` row planting a quoted-key entry and expecting `never
leak-scanned`.

### WR-03: the tracked-tree PASS line still counts files it never opened — the reachable half of CR-02, left uncorrected

**File:** `scripts/scan-brand-residue.mjs:1276` (`result.files.length`), with the
`ENOENT` allowance at `scripts/scan-brand-residue.mjs:1175-1178`

**Issue:** 01-17 corrected the *extra-root* summary to name files actually read
(`extraFiles.length - extra.unreadable.length`, line 1268) on the stated grounds
that *"reporting an unopened file as scanned tells the operator the gate covered
a file it never opened"*. The tracked-tree summary was not given the same
correction, and it is the branch where the defect is **reachable**: `ENOENT`
keeps its allowance (correctly — a sparse checkout must stay green), so those
files are skipped, are not gated, and are still counted.

Reproduced against the shipped module:

```sh
$ node -e "import('./scripts/scan-brand-residue.mjs').then(m=>{const inv=m.loadInventory();
    const r=m.scan(inv,{files:['README.md','does/not/exist.txt']});
    console.log(r.files.length, JSON.stringify(r.unreadable));})"
2 [{"file":"does/not/exist.txt","reason":"ENOENT"}]
```

so on a sparse checkout the gate prints `PASS -- no residual brand occurrence in
N scanned file(s)` where N exceeds the number of files it opened.

**Fix:**

```js
  const scannedCount = result.files.length - (result.unreadable ?? []).length;
  ...
  console.log(`scan-brand-residue: PASS -- no residual brand occurrence in ${scannedCount} scanned file(s)${extraSummary}...`);
```

and, since an allowed skip is still a hole in coverage, print the ENOENT list at
`--reconcile` verbosity so a growing skip set is visible rather than folded into
a shrinking number.

### WR-04: a trailing `//` comment mentioning `_showError(` makes the commit gate permanently red

**File:** `scripts/verify-shell-error-copy.mjs:379-380`, given `stripComments`
at `scripts/verify-shell-error-copy.mjs:90-96`

**Issue:** The CR-03 comment states *"Both run over `src`, the comment-stripped
source ... `raw` still holds eight doc-comment mentions of `_showError`, and
counting those would make this permanently red."* `stripComments` deliberately
does **not** strip trailing `//` comments (documented, to protect `http://`
inside real strings), so the premise holds only for whole-line and block
comments. A trailing comment inflates `present` without inflating `callSites`.

Reproduced:

```sh
$ printf '\nconst v = 1; // calls _showError(x)\n' >> /tmp/F.mjs
$ node scripts/verify-shell-error-copy.mjs --file /tmp/F.mjs
verify-shell-error-copy: FAIL -- 6 `_showError(` call site(s) are present ... but 5 were parsed
EXIT=1
```

The failure is loud, so nothing ships broken — but `shell-error-copy-no-internals`
is a `--quick` row, i.e. the commit gate, and its remedy text explicitly tells
the operator *not* to widen the pattern. A comment edit that turns the commit
gate red with an instruction not to fix it is a gate people learn to route
around. The position-set fix proposed in CR-01 has the same exposure and should
carry the mitigation below.

**Fix:** strip trailing `//` comments for this derivation only, protecting the
`://` case the header names:

```js
  // Trailing comments are safe to drop HERE (unlike in stripComments, which
  // must not mangle `http://127.0.0.1` inside a real string): the guard
  // requires whitespace before `//` and rejects a preceding `:`.
  const codeOnly = src.replace(/(^|[^:\S])\/\/.*$/gm, "$1");
```

and derive `allSites`/`parsed` from `codeOnly`.

### WR-05: CR-01's row filter is justified by hand-enumerating today's inventory, and nothing derives the invariant it depends on

**File:** `scripts/scan-brand-residue.mjs:1213-1237` (the comment and the filter)

**Issue:** The filter excludes exactly one class and the comment explains *"Why
nothing ELSE is excluded: `frozen` rows (`MOZ_APP_ID`, `%content/branding/`,
`-brand-product-name = Firefox`) legitimately occur in a Gecko checkout and
carry no residue probe."* That reasoning is correct against
`inventory/brand-tokens.json` **as it stands today** — I verified every
non-renameable row and none contains `sourcerer` or `deocracy` as a substring,
so no non-renameable row can currently win the longest-first claim over a brand
token. It is a hand-kept expectation about a file that is explicitly designed to
grow: adding one `frozen` or `coincidental` row whose token contains a probe
form silently reopens CR-01 under `--extra-root`, with no reconcile behind it
and no check that fires.

`CLAUDE.md`: *"Derive from the tree and compare; do not hand-keep an expectation
list."* The invariant this fix rests on is derivable in three lines.

**Fix:** assert it at load, next to the other inventory validation:

```js
  // CR-01's row filter is only sound while no NON-renameable row can win the
  // longest-first claim over a brand token. That is a property of the
  // inventory, so it is derived from the inventory rather than argued in a
  // comment about the rows that happen to exist today.
  const probeForms = (inv.scope?.residue_probes ?? []).map((p) => p.toLowerCase());
  for (const row of inv.tokens) {
    if (RENAMEABLE_CLASSES.includes(row.class)) continue;
    const hit = probeForms.find((p) => row.token.toLowerCase().includes(p));
    if (hit && row.class !== 'coincidental') {
      throw new Error(
        `inventory row ${JSON.stringify(row.token)} is class "${row.class}" (not renameable) but ` +
          `contains the residue probe "${hit}" -- longest-first claim order lets it swallow a brand ` +
          `token and suppress that token's probe. Either classify it renameable or exclude its ` +
          `class from the --extra-root row set as "coincidental" already is`
      );
    }
  }
```

### WR-06: `pipefail` + `grep -q` can report a valid tag as missing

**File:** `scripts/rebase-upstream.sh:54` (with `set -euo pipefail` at line 13)

*Carried forward from the previous review — verified still present, and recorded
as deliberately-not-done in `deferred-items.md` row 10.*

**Issue:** `grep -q` exits on first match; if `git ls-remote` has not finished
writing it takes SIGPIPE and exits 141, `pipefail` propagates that, `if !`
inverts it, and the script reports `tag $NEW_TAG does not exist on $REMOTE` for
a tag that does exist — non-deterministically, at the first gate of a 40-minute
operation.

**Fix:**

```sh
TAG_REFS="$(git ls-remote --tags "$REMOTE" "refs/tags/$NEW_TAG" || true)"
if ! printf '%s' "$TAG_REFS" | grep -qF -- "refs/tags/$NEW_TAG"; then
```

### WR-07: the tag is validated as a git glob **and** a BRE, so `--tag '*'` passes validation and reaches `rm -rf upstream/`

**File:** `scripts/rebase-upstream.sh:54`, damage at
`scripts/rebase-upstream.sh:76`

*Carried forward — verified still present.*

**Issue:** `$NEW_TAG` is interpolated into a `git ls-remote` refspec (glob) and
into a `grep` BRE. `*` lists every tag and matches `refs/tags/*` as a BRE, so
validation passes; the run then removes the upstream tree before failing inside
`git clone --branch '*'`. A tag containing `.` also matches loosely, so a
near-miss typo validates against a different tag — defeating the step's own
stated purpose. No command injection: every use is quoted and `--branch`
consumes its value positionally.

**Fix:**

```sh
if ! [[ "$NEW_TAG" =~ ^[A-Za-z0-9._-]+$ ]]; then
  echo "rebase-upstream: FAIL -- tag '$NEW_TAG' is not a plain tag name ([A-Za-z0-9._-]+)" >&2
  exit 1
fi
```

then keep the `grep -qF` from WR-06.

### WR-08: the `--dry-run` rehearsal prints `--extra-root "$UPSTREAM_DIR"` unexpanded

**File:** `scripts/rebase-upstream.sh:66`

*Carried forward — verified still present.*

**Issue:** Every neighbouring dry-run line expands its variable (`'$UPSTREAM_DIR'`
on lines 63 and 68). Line 66 escapes it and prints the literal
`--extra-root "$UPSTREAM_DIR"`; pasted into a shell where that variable is
unset it becomes `--extra-root ""`, which the scanner rejects with exit 2. The
script's own header states the real path is exercised locally **only** via
`--dry-run`, so this printed text is the artifact under local test.

**Fix:**

```sh
  echo "  4b. node '$REPO_ROOT/scripts/scan-brand-residue.mjs' --extra-root '$UPSTREAM_DIR'  # D-18 permanent gate, no exception"
```

### WR-09: the workflow declares no `permissions:`, no `timeout-minutes:`, and no `persist-credentials: false`

**File:** `.github/workflows/rebase-upstream.yml:30-35`

*Carried forward — verified still present.*

**Issue:** With no `permissions:` block the job takes the repository default
`GITHUB_TOKEN` scope, which on many repos is write-capable, and
`actions/checkout` leaves those credentials in `.git/config` while
`rebase-upstream.sh` performs a 1.1 GB clone of a third-party remote and
executes repo scripts. With no `timeout-minutes` a stalled clone burns the
runner to the 6-hour default. (The `tag` input is correctly passed through
`env:` and quoted, so the run steps carry no script-injection.)

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

### IN-01: the `extraSummary` count correction is unreachable

**File:** `scripts/scan-brand-residue.mjs:1268`

**Issue:** `extraFiles.length - extra.unreadable.length` is only ever evaluated
on the way to the PASS line at 1276, and any non-empty `extra.unreadable` has
already pushed a gate reason at 1265, which returns 1 before that line prints.
The subtrahend is therefore always zero. The eight-line comment above it claims
the expression closes *"the half of CR-02 that is a reporting defect"*; it
cannot, because the reporting path is unreachable in the only state the
correction would matter. (The genuine reporting defect is on the tracked-tree
side — WR-03.)

**Fix:** keep the expression (it is correct if the extra-root policy is ever
relaxed) but shorten the comment to say the subtraction is defensive and
currently unreachable, so the next reader does not credit it with a fix it does
not perform.

### IN-02: the tracked-tree unreadable gate now hard-fails on `EISDIR`, which a submodule would trigger

**File:** `scripts/scan-brand-residue.mjs:1175-1178`

**Issue:** Only `ENOENT` keeps its allowance. `git ls-files` lists a gitlink
(submodule) path as a tracked entry; `readFileSync` on it throws `EISDIR`, which
now becomes a gate failure of the permanent brand gate for a reason unrelated to
residual brand strings. No gitlinks and no tracked symlinks exist today
(`git ls-files -s` shows no mode `160000` or `120000` entries), so this is
latent.

**Fix:** filter gitlinks out of the tracked file set in `scopeFiles` (`git
ls-files -s`, drop mode `160000`), or add `EISDIR` to the allowance with a
comment naming submodules as the reason.

### IN-03: `depthZeroOnly` and `braceBody` count braces and brackets inside string literals

**File:** `scripts/verify-shell-error-copy.mjs:137-150`

**Issue:** Both walk characters with no string/template awareness. A depth-0
property whose value is a string containing an unmatched `[` or `}` shifts the
depth for everything after it — an unmatched `}` drives depth negative, after
which no character is ever emitted again and the binding silently stops being
recognised as message-bearing. `braceBody` carries a note that the file's only
brace-bearing strings are balanced template interpolations; `depthZeroOnly`
inherits that assumption for brackets too, where it is not stated. Fails loud
today (a false rejection, not a false accept).

**Fix:** state the assumption in `depthZeroOnly`'s doc comment as `braceBody`
does, or skip quoted spans in both walkers.

### IN-04: `FAULTS` hand-keeps exact copy literals from the file under test

**File:** `scripts/verify-shell-error-copy.mjs:437-555`

**Issue:** Rows key off exact sentences and exact key names. A copy reword makes
`mutated === original` and the row reports *"the fault did not apply; this
self-test row proves nothing"* — fail-loud, so this is drift friction rather
than a defeatable gate. Recorded as deliberately-not-done in `deferred-items.md`
row 10; noted here only so the count is honest.

**Fix:** none required. If taken, derive the substitution target from
`parseUserMessageTable` (mutate the first declared entry by key) so a copy edit
does not require editing the self-test.

---

*Reviewed: 2026-08-31*
*Reviewer: Claude (gsd-code-reviewer)*
*Depth: standard*
