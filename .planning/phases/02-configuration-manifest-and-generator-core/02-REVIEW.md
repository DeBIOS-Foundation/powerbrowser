---
phase: 02-configuration-manifest-and-generator-core
reviewed: 2026-09-01T00:00:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - brand/mark.svg
  - configuration.toml
  - .github/workflows/rebase-upstream.yml
  - .gitignore
  - powerbrowser/branding/dev/configure.sh
  - powerbrowser/branding/release/configure.sh
  - scripts/generate.mjs
  - scripts/lib/config-schema.json
  - scripts/lib/toml.cjs
  - scripts/lib/toml.LICENSE
  - scripts/verify-branding-preflight.mjs
  - scripts/verify-generated-identity.mjs
  - scripts/verify-platform.sh
  - theia/extensions/branding/src/browser/powerbrowser-mark.ts
findings:
  critical: 4
  warning: 11
  info: 5
  total: 20
status: issues_found
---

# Phase 2: Code Review Report

**Reviewed:** 2026-09-01
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

All 14 files were read. The four registered checks (`generated-byte-identity`,
`generated-byte-identity-self-test`, `generate-check`, `generate-self-test`) were executed and are
green on the current tree, and the vendored parser's recorded digest was recomputed and matches
(`tail -n +23 scripts/lib/toml.cjs | sha256sum` → `195ca51f…cb8f`, 22907 bytes). The emitters are
byte-identical to the five hand-written comparands today.

That is where the good news stops. The generator's entire threat model is stated in its own header
as "no value out of configuration.toml is ever joined into a write path", and that claim is
narrowly true and broadly misleading: values *are* joined unescaped into shell script bodies and
into freedesktop `Exec=` lines. Four defects were reproduced by execution, not inferred:

1. `identity.display_name` carries no pattern and no escaping, and lands inside a double-quoted
   shell assignment in `configure.sh` — a file the Gecko build sources. A `"` closes the quote and
   the rest of the value executes at build time. Verified.
2. The same value lands unescaped in a `.desktop` file; a newline injects an arbitrary
   `Exec=` key. Verified, with `failures: []` — the run is fully green.
3. A `[[variants]]` element missing `objdir`/`branding_dir`/`name_suffix` passes validation with
   zero failures, emits the literal string `undefined` into `.mozconfig` and `configure.sh`, and
   then crashes with an uncaught `TypeError` from `path.join` on the two `.desktop` emitters —
   printing a stack trace with `node:` specifiers, which is the exact copy rule the file's own
   self-test claims to enforce. The self-test's `downstream array shorter than default` case pins
   this behaviour as *correct*.
4. The newly registered `generate-check` row puts `scripts/verify-platform.sh --quick` — the
   documented commit gate — in a FAIL state on every fresh clone, because `generated/` is
   git-ignored and `--check` exits 1 on an absent output tree while printing "This is not a
   mismatch." Verified by moving `generated/` aside: `check exit=1`.

The verification scripts themselves are well built (non-vacuity guards, derived expectation sets,
planted-fault self-tests), and the review found no way to make any of them green on a broken tree.
The defects are concentrated in the emit path and in gate placement, not in the comparison logic.

## Critical Issues

### CR-01: Shell command injection from `identity.display_name` into a build-sourced script

**File:** `scripts/generate.mjs:464`, `scripts/lib/config-schema.json:23-26`
**Issue:** `emitConfigureSh` interpolates `config.identity.display_name` directly inside a
double-quoted shell assignment. The schema declares that key with `"type": "string"` and **no
`regex`**, so any character — including `"`, `;`, `$`, backtick, newline — passes validation.
`powerbrowser/branding/*/configure.sh` is sourced by the Gecko build system, so the injected text
runs with the developer's (or CI runner's) privileges.

Reproduced with a manifest whose only change is `display_name`:

```
display_name = "Acme\"; touch /tmp/pwned-by-generator; #"
```

emits, with `failures: []`:

```sh
MOZ_APP_DISPLAYNAME="Acme"; touch /tmp/pwned-by-generator; # Dev"
```

The same hole exists for every unpatterned string that reaches a shell context:
`variants[].branding_dir` and `variants[].objdir` are interpolated into the `${VAR:-default}`
expansions at `scripts/generate.mjs:505` and `:514`, and both are `required: false` with no regex
(`config-schema.json:79-86`). `product.vendor_display` and the three `legal.*` keys are equally
unpatterned and will hit the same class of sink as Phase 3 adds emitters.

This is not hypothetical-only-in-Phase-7. `configuration.toml` is the documented single rebrand
input; a downstream editing it is the *intended* user, and CFG-05/`PB_CONFIG_DIR` makes the manifest
an external file.

**Fix:** Escape at the sink, and constrain at the schema. Both, not either.

```js
// scripts/generate.mjs
/** A value safe inside a double-quoted shell string. Rejects, never mangles (CFG-03). */
function shellQuoted(path, value) {
    if (/["`$\\\n\r]/.test(value)) {
        // route through the same failure list validate() uses
        throw new ConfigError(`${path} contains a character that cannot appear in a build `
            + `setting (a quote, backslash, dollar sign, backtick or line break). `
            + `Remove it in ${MANIFEST_NAME}, then run: ${RERUN}`);
    }
    return value;
}
// ...
`MOZ_APP_DISPLAYNAME="${shellQuoted('identity.display_name', config.identity.display_name)}${variant.name_suffix}"`,
```

and add to `config-schema.json`, so the rejection happens in `validate()` with the rest and the
whole failure list is reported at once:

```json
"identity.display_name": {
  "type": "string",
  "required": true,
  "regex": "^[A-Za-z0-9][A-Za-z0-9 .'-]{0,63}$",
  "regex_help": "letters, digits, spaces, dots, apostrophes and hyphens only; 1 to 64 characters; must start with a letter or digit",
  "regex_example": "Acme Browser"
}
```

Apply the same treatment to `product.vendor_display`, `legal.copyright_holder`,
`legal.trademark_notice`, `variants[].name_suffix`, `variants[].branding_dir` and
`variants[].objdir`. Add a self-test case per sink that plants a metacharacter and requires a red.

### CR-02: Desktop-entry key injection — a manifest value can override `Exec=`

**File:** `scripts/generate.mjs:539-549`
**Issue:** `emitDesktopEntry` writes `Name=${display_name}${name_suffix}` with no escaping and no
newline rejection. A newline in `display_name` (or `name_suffix`, equally unpatterned) inserts
arbitrary `key=value` lines into the `[Desktop Entry]` group. Reproduced:

```
display_name = "Acme\nExec=/bin/sh -c evil\nX=y"
```

produces, with `failures: []`:

```
[Desktop Entry]
Name=Acme
Exec=/bin/sh -c evil
X=y Dev
Exec=/home/chris/coding/Power-Browser/objdir/dist/bin/acme-browser %u
...
```

The injected `Exec=` precedes the legitimate one. The freedesktop spec calls duplicate keys in a
group invalid, but implementations differ and several take the first occurrence — this is a
launcher that runs attacker-chosen commands on click.

Separately, `variants[].objdir` flows into `join(REPO_ROOT, variant.objdir, 'dist/bin', …)` at
line 537 with no traversal guard: `objdir = "../../../usr/bin"` produces an `Exec=` line pointing
outside the repo entirely.

**Fix:** Reject control characters in every value that reaches a `.desktop` key (same
`shellQuoted`-style guard, extended to `\n`/`\r`/`\t`/`\0`), and constrain `variants[].objdir` and
`variants[].branding_dir` to relative paths with no `..` segment:

```json
"variants[].objdir": {
  "type": "string", "required": true,
  "regex": "^[A-Za-z0-9][A-Za-z0-9._-]*(/[A-Za-z0-9][A-Za-z0-9._-]*)*$",
  "regex_help": "a relative path under the project with no '..' segment; letters, digits, dots, underscores, hyphens and slashes only",
  "regex_example": "objdir"
}
```

Then assert `resolve(join(REPO_ROOT, variant.objdir)).startsWith(REPO_ROOT + sep)` before emitting.

### CR-03: A partial `[[variants]]` table validates clean, emits the literal `undefined`, then crashes

**File:** `scripts/generate.mjs:503-518`, `:536-551`, `:1049-1055`, `scripts/lib/config-schema.json:71-86`
**Issue:** All four `variants[].*` keys are `required: false`, and `validate()` skips every path
containing `[]` (`generate.mjs:387`). A downstream that declares `[[variants]] id = "dev"` and
nothing else therefore resolves with **zero failures**, and:

- `.mozconfig` gets `MOZ_OBJDIR=@TOPSRCDIR@/../${POWERBROWSER_OBJDIR:-undefined}` and
  `--with-branding=${POWERBROWSER_BRANDING:-undefined}`
- both `configure.sh` files get `MOZ_APP_DISPLAYNAME="Acme Browserundefined"`
- both `.desktop` emitters throw `TypeError: The "path" argument must be of type string. Received
  undefined` out of `path.join`

Verified by execution; the two `configure.sh` and `.mozconfig` outputs above are literal transcript.

Two compounding problems:

1. `main()` has no `try`/`catch`, so that `TypeError` reaches the top level and Node prints a stack
   trace containing `at …`, `node:internal/…` frames and the absolute repo path. That is precisely
   the three-marker set `INTERNAL_MARKERS` (`generate.mjs:976-980`) exists to forbid, and the
   self-test cannot see it because it never drives `writeTargets` on a partial variant.
2. `selfTest()`'s case `downstream array shorter than default` (lines 1049-1055) constructs exactly
   this manifest and asserts it **resolves successfully**. The suite pins the defect as the
   contract.

**Fix:** Make the variant fields required and validated per element. `requiredPathsOf`/`validate`
both currently assume no `[]` path is required — that assumption has to be lifted:

```js
// validate(): after the scalar loop
for (const [i, v] of (readPath(doc, 'variants') ?? []).entries()) {
    for (const [path, spec] of Object.entries(SCHEMA_KEYS)) {
        if (!path.startsWith('variants[].') || !spec.required) continue;
        const key = path.slice('variants[].'.length);
        if (isUnset(v?.[key])) {
            failures.push(`variants entry ${i + 1} (id ${JSON.stringify(v?.id ?? '')}) `
                + `${UNSET_MARK} Open ${MANIFEST_NAME}, find that [[variants]] section, and give `
                + `${key} a value. Then run: ${RERUN}`);
        }
    }
}
```

Set `"required": true` on all four `variants[].*` keys, and rewrite the `downstream array shorter
than default` self-test case so it asserts the array is *replaced* (D-07) using a **complete**
one-element variant table — replacement is what that case exists to pin, not incompleteness.
Add a new case that plants a variant missing `objdir` and requires a red naming it.

### CR-04: `generate-check` makes `verify-platform.sh --quick` red on every fresh clone

**File:** `scripts/verify-platform.sh:3659`, `scripts/generate.mjs:700-706`
**Issue:** `generate-check` is registered in the unconditional (i.e. `--quick`) portion of
`run_own_checks`' `CHECKS` array — the `if [ "$QUICK" -eq 0 ]` guard is at line 3663, *after* it —
and nothing in `verify-platform.sh` runs the generator first. `generated/` is git-ignored
(`.gitignore:31`), so it does not exist on a fresh clone, and `checkTargets` returns 1 for an
absent root.

Verified by moving `generated/` aside:

```
generate: FAIL -- nothing has been generated in this copy of the project yet, so there is nothing to compare.
  The generated/ folder is not stored with the project, so a fresh copy of it starts out without one. This is not a mismatch.
check exit=1
```

The message says "This is not a mismatch" and then exits non-zero anyway. The registration comment
at `verify-platform.sh:3644-3648` asserts the opposite of the observed behaviour — "the only tree
this row ever sees, since a run with no `generated/` reports the absent-directory outcome and not a
mismatch" — but the absent-directory outcome *is* a failure exit. This is the "gate red for a
non-defect, so its readers learn to skip it" failure mode that `verify-generated-identity.mjs`'s
own header (lines 26-40) is built to avoid, reintroduced by a sibling row two commits later.

`.github/workflows/rebase-upstream.yml` escapes it only because it runs `node scripts/generate.mjs`
at line 95 before `--check` at line 98. The local commit gate has no such step.

**Fix:** Pick one. Either make the absent-output case a PASS-with-note when the row's contract is
idempotence-only:

```js
if (!existsSync(root)) {
    console.log(`${NAME}: --check SKIP -- nothing has been generated in this copy of the project yet, so there is nothing to compare. Run: ${RERUN}`);
    return 0;
}
```

(and give `--check` a `--require-generated` flag for CI, which the workflow already satisfies), or
register a `generate` row that runs the generator immediately ahead of `generate-check` in the
`--quick` set. The first is smaller and keeps `--only generate-check` meaningful in both states.

## Warnings

### WR-01: A failing `writeTargets` leaves `generated/` half-written

**File:** `scripts/generate.mjs:617-632`
**Issue:** The file header (line 30-31) states "Nothing is written under `generated/` until every
check has passed. A failed run leaves the output tree exactly as it found it." `writeTargets`
violates this: the missing-variant check is inside the write loop, so a manifest declaring only the
`dev` variant writes `TARGETS[0]` and `TARGETS[1]` and then `process.exit(1)` on `TARGETS[2]`.
CR-03's `TypeError` has the same effect from a different direction — three files written, then a
crash. The next `--check` then reports two stale files and two absent ones on top of the real
problem.
**Fix:** Resolve every variant and emit every body into memory *before* the first `writeFileSync`:

```js
function writeTargets(config, root) {
    const pending = TARGETS.map(target => {
        const variant = variantById(config, target.variant);
        if (variant === undefined) { /* collect failure */ }
        return { outPath: join(root, target.generated), body: target.emit(config, variant) };
    });
    if (failures.length > 0) { report(failures); }   // exits before any write
    for (const { outPath, body } of pending) { mkdirSync(dirname(outPath), { recursive: true }); writeFileSync(outPath, body, 'utf8'); }
    return pending.length;
}
```

### WR-02: The new `configure.sh` header gives an instruction that does not work

**File:** `powerbrowser/branding/dev/configure.sh:5-7`, `powerbrowser/branding/release/configure.sh:5-7`
**Issue:** The header now reads "Generated from configuration.toml by scripts/generate.mjs — do not
edit here. To change it, edit configuration.toml and run: node scripts/generate.mjs". Following
that instruction writes `generated/branding/dev/configure.sh` and leaves this tracked file
unchanged, because `OUTPUT_ROOT` is `REPO_ROOT/generated` (`generate.mjs:71`) and the build still
consumes the tracked file under D-01. A reader who changes `display_name` and re-runs the generator
gets: no visible change, no error, and then a red `generated-byte-identity` row with no documented
recovery path other than "do not edit this file", which is the only way to fix it.
**Fix:** State the real procedure, e.g. `# To change it, edit configuration.toml, run: node
scripts/generate.mjs, then copy generated/branding/dev/configure.sh over this file (Phase 2 does not
write it in place).` — or add a `--write-tracked` mode to the generator and name it here. Either
way the emitter string and both tracked files change in one commit, per the file's own rule.

### WR-03: Only two of the five generated targets carry the "do not edit" header

**File:** `scripts/generate.mjs:455-467` vs `:503-518` and `:536-551`
**Issue:** `emitConfigureSh` gained the three-line generated-from banner; `emitMozconfig` and
`emitDesktopEntry` did not. `.mozconfig`, `powerbrowser/powerbrowser.desktop` and
`powerbrowser/powerbrowser-release.desktop` are equally derived and equally at risk of a hand-edit
that reddens `generated-byte-identity` with no on-file explanation. The inconsistency also means a
reader cannot tell "generated" from "hand-written" by opening the file, which is the entire purpose
of the banner.
**Fix:** Add the same three comment lines to the other two emitters (`#`-prefixed for `.mozconfig`,
`#`-prefixed for `.desktop`, which freedesktop permits) and to their tracked counterparts in the same
commit, then re-run `--only generated-byte-identity`.

### WR-04: `verify-generated-identity.mjs` silently accepts unknown arguments

**File:** `scripts/verify-generated-identity.mjs:318-319`
**Issue:** `main()` does `if (process.argv.includes('--self-test'))` and otherwise runs the full
check. A typo — `--selftest`, `--self_test`, `--check` — runs the *wrong mode* and prints
`verify-generated-identity: PASS`, so an operator believes the self-test discriminated when it never
ran. `generate.mjs` rejects unknown arguments for exactly this reason
(`rejectUnknownArguments`, lines 100-107); this sibling does not.
**Fix:** Mirror the sibling:

```js
for (const a of process.argv.slice(2)) {
    if (a !== '--self-test') {
        console.error(`${NAME}: FAIL -- unknown argument '${a}'`);
        process.exit(1);
    }
}
```

### WR-05: Unguarded `git ls-files` crashes with a stack trace

**File:** `scripts/verify-generated-identity.mjs:202`
**Issue:** The `git check-ignore` call above it is wrapped in `try`/`catch` because it exits
non-zero by design; `execFileSync('git', ['ls-files', …])` is not wrapped at all. Run where `git` is
absent from `PATH`, or on an exported tarball with no `.git`, it throws `ENOENT` /
"not a git repository" out of `main()` uncaught — a stack trace with `node:internal` frames and the
absolute repo path, which is the same copy-rule violation as CR-03.
**Fix:**

```js
let tracked;
try {
    tracked = execFileSync('git', ['ls-files', '--', OUTPUT_DIR_NAME], { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
} catch {
    failures.push(`the project's version control could not be read, so whether ${OUTPUT_DIR_NAME}/ is stored with the project could not be checked. Next step: run this from a working copy of the project.`);
    return failures;
}
```

### WR-06: Regexes built from unescaped inventory values weaken two assertions

**File:** `scripts/verify-branding-preflight.mjs:293`, `:436`
**Issue:** Both build a `RegExp` by interpolating a JSON value:

```js
if (!new RegExp(`stockControl \\? 'Mozilla' : '${exp.vendor_machine}'`).test(identity)) { … }
const leak = new RegExp(`${exp.identifier_form}[ "<]`);
```

`vendor_machine`'s own schema pattern (`config-schema.json:7`) permits `.`, `-` and `_`. A value
like `Ac.e` becomes the wildcard pattern `Ac.e` and matches `Acme` — the assertion passes on a
vendor string that is not the declared one, which is exactly the tautology this file was written to
prevent. `identifier_form` is unconstrained entirely; a value containing `(`, `[` or `+` either
changes the match semantics or throws `SyntaxError` at construction, uncaught.
**Fix:** Escape before interpolating, or drop to a literal comparison where possible:

```js
const rx = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
if (!identity.includes(`stockControl ? 'Mozilla' : '${exp.vendor_machine}'`)) { … }
const leak = new RegExp(`${rx(exp.identifier_form)}[ "<]`);
```

### WR-07: The vendored parser's provenance digest is never machine-verified

**File:** `scripts/lib/toml.cjs:1-23`
**Issue:** The header records `sha256 195ca51f…cb8f` over `tail -n +23`. I recomputed it and it
matches today. Nothing in the repo checks it: `grep` across `scripts/verify-platform.sh` and every
`scripts/*.mjs` finds a single reference to `toml.cjs` — the `import` in `generate.mjs:63`. A
re-vendor to a different upstream version, a hand-edit to the body (which the header forbids), or a
supply-chain substitution all pass every gate this repo has. This is the same "hand-kept expectation
that can only ever agree with the tree it was copied from" pattern CLAUDE.md's verification section
forbids — except here there is no comparison at all.

The `tail -n +23` instruction is also coupled to the header being exactly 22 lines, which nothing
enforces; adding one comment line silently makes the recorded command hash the wrong bytes and still
"pass" by eye.
**Fix:** Register a `--quick` row that derives the boundary rather than hard-coding 22:

```js
// scripts/verify-vendored-parser.mjs
const text = readFileSync(TOML_PATH, 'utf8');
const body = text.slice(text.indexOf('/*!'));           // derived: the upstream banner starts the body
const want = /^\/\/\s+sha256:\s+([0-9a-f]{64})$/m.exec(text)[1];   // derived: read from the header
const got = createHash('sha256').update(body).digest('hex');
```

then `"vendored-parser-digest|node $REPO_ROOT/scripts/verify-vendored-parser.mjs"` in the registry,
with a `--self-test` that plants a byte in a temp copy and requires a red.

### WR-08: `variants[].id` is optional, duplicates are silently accepted, first match wins

**File:** `scripts/generate.mjs:602-604`, `scripts/lib/config-schema.json:71-74`
**Issue:** `variantById` is `find(v => v.id === id)`. Three consequences, none reported:
a variant with no `id` (permitted — `required: false`) is unreachable dead configuration; two
variants sharing an `id` silently resolve to the first, so a downstream that edits the second gets no
effect and no message; and a variant with an `id` matching neither `dev` nor `release` is never
consulted at all, so a typo'd `id = "relase"` surfaces only as the missing-variant error for
`release`, sending the reader to add a section rather than fix a letter.
**Fix:** Make `variants[].id` required (see CR-03), and reject duplicates and orphans in `validate`:

```js
const ids = (readPath(doc, 'variants') ?? []).map(v => v?.id);
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
for (const id of new Set(dupes)) {
    failures.push(`two or more [[variants]] sections both use the id ${JSON.stringify(id)}; only the first is ever used. Give each variant its own id in ${MANIFEST_NAME}, then run: ${RERUN}`);
}
const used = new Set(TARGETS.map(t => t.variant));
for (const id of ids) {
    if (!used.has(id)) failures.push(`the [[variants]] section with id ${JSON.stringify(id)} is never used; the project builds ${[...used].join(' and ')}. Check the spelling in ${MANIFEST_NAME}, then run: ${RERUN}`);
}
```

### WR-09: Invoking the generator through a symlink is a silent no-op that exits 0

**File:** `scripts/generate.mjs:93-94`
**Issue:** `IS_MAIN` compares `resolve(process.argv[1])` — which normalises but does **not** resolve
symlinks — against `fileURLToPath(import.meta.url)`, which Node has already realpath-resolved.
Invoked via any symlink (`bin/generate -> ../scripts/generate.mjs`, a `nix develop` shim, a
`node_modules/.bin` entry), the two differ, `main()` never runs, nothing is written, and the process
exits 0. A CI step or a Makefile target wired that way reports success having generated nothing —
and `generate-check` would then report the tree as stale for a reason nobody can locate.
**Fix:** Realpath both sides:

```js
import { realpathSync } from 'node:fs';
const IS_MAIN = process.argv[1] !== undefined
    && realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url));
```

(wrap in `try`/`catch` returning `false` so a nonexistent `argv[1]` does not throw).

### WR-10: The mark's dual fill keys off the OS theme, not the shell theme — it is invisible in one combination

**File:** `theia/extensions/branding/src/browser/powerbrowser-mark.ts:30`, `brand/mark.svg:34`
**Issue:** The SVG fills `#1a1a1a` by default and `#fff` under `@media (prefers-color-scheme: dark)`.
Both files' comments state that `#1a1a1a` "is the shell's dominant neutral" and that the shell has a
"fixed dark background" (`powerbrowser-mark.ts:24`, `:26`), and `configuration.toml:50` sets
`default_theme = "dark"`. But `prefers-color-scheme` inside a data-URI `<img>` follows the **OS**,
not the Theia theme. The three consumers split:

- `powerbrowser-favicon-contribution.ts:16` — favicon, follows the OS chrome. The dual fill is
  correct here, and this is the case the comment reasons about.
- `powerbrowser-about-dialog.tsx:33` and `powerbrowser-welcome-widget.tsx:62` — `<img>` on the
  shell's fixed dark background. On a light-mode OS these render `#1a1a1a` on a `#1a1a1a`-family
  background: the mark disappears.

The reasoning in both comments assumes one consumer and generalises to three. (Pre-existing; carried
into this phase by the `powerbrowser/branding/mark.svg` → `brand/mark.svg` move, and
`verify-branding-preflight.mjs:489` now asserts the dual fill is *preserved*, which locks the defect
in.)
**Fix:** Give the two in-shell consumers a theme-correct variant rather than the OS-driven one —
either a second export whose fill is `currentColor` so it inherits the Theia theme's foreground:

```ts
export const POWERBROWSER_MARK_SVG_INHERIT = POWERBROWSER_MARK_SVG
    .replace(/<style>[\s\S]*?<\/style>/, '')
    .replace(/class="a"/g, 'fill="currentColor"');
```

rendered inline (not via `<img>`, which does not inherit `currentColor`), or explicitly pass the
resolved Theia theme kind. Then extend the preflight's section 7 to assert both variants exist.

### WR-11: The rebase workflow's generator gates run only *before* the rebase, so they cannot observe what the rebase did

**File:** `.github/workflows/rebase-upstream.yml:94-101` vs `:108-111`
**Issue:** The comment at lines 86-90 states the byte-identity step "is the step that goes red if an
upstream rebase moved one of those five files". All three generator steps run at lines 94-101; the
rebase runs at line 108. A gate placed before the operation it is meant to characterise reports on
the pre-operation tree only. The stated purpose is not achieved by the step's position.

(The claim is separately dubious — the five comparands are `.mozconfig` and files under
`powerbrowser/`, none of which live in the `upstream/` tree a rebase replays onto — but the ordering
defect stands regardless of which claim is intended.)
**Fix:** Either move the byte-identity step after `Rebase onto requested tag`, or add a second
invocation there and reword the pre-rebase comment to say what it actually asserts (that the tree was
already clean before the replay, which is a legitimate fail-fast and is exactly how the residual-brand
scan at line 68 is justified).

## Info

### IN-01: `firstDifferingLine` can report "line 0" for byte-differing files

**File:** `scripts/generate.mjs:659-666`, `scripts/verify-generated-identity.mjs:99-106`
**Issue:** Both copies return 0 when every `split('\n')` element is equal. `Buffer.compare` has
already failed by then, so the only way to reach the return is a byte difference that
`Buffer.toString('utf8')` normalises away — an invalid UTF-8 sequence replaced by U+FFFD in both.
The operator is then told "differs, from line 0", which names no line.
**Fix:** Return `x.length + 1` on fallthrough and have the caller print "differs, but not in any
text line — the two files differ in bytes that are not valid text" for that value.

### IN-02: `sectionOf`'s array-path branch is unreachable

**File:** `scripts/generate.mjs:126-128`
**Issue:** `.replace('[]', '')` exists to render `variants[].id` as `[variants]`, but `sectionOf` is
called from exactly one site (`validate`, line 391) which is guarded by
`if (!spec.required || path.includes('[]')) continue` at line 387. No `[]` path can reach it.
**Fix:** Drop the `.replace`, or keep it and add the array-required support CR-03 requires — the
latter makes it live.

### IN-03: `--check` and `--self-test` together silently ignore `--check`

**File:** `scripts/generate.mjs:1201`, `:1210`
**Issue:** `if (args.includes('--self-test')) return selfTest();` runs first, so
`node scripts/generate.mjs --check --self-test` performs the self-test and never the freshness
comparison, with no notice. The argument validator accepts both.
**Fix:** Reject the combination in `rejectUnknownArguments`, the same way `verify-platform.sh:85`
rejects `--gate` with `--quick`.

### IN-04: The three identifier-name schema entries are byte-duplicated

**File:** `scripts/lib/config-schema.json:27-47`
**Issue:** `identity.app_basename`, `identity.binary_name` and `identity.remoting_name` carry the
same `regex`, `regex_help` and `regex_example` written out three times. A future tightening (CR-01
adds several) has to be made in three places and will be made in two.
**Fix:** Add a sibling `"patterns"` map to the schema and let a key reference it by name
(`"pattern_ref": "unix-identifier"`), resolved once in `generate.mjs` where `spec.regex` is read.

### IN-05: The preflight parses another script's JavaScript with a whitespace-coupled regex

**File:** `scripts/verify-branding-preflight.mjs:279`
**Issue:** `new RegExp(`\\n\\s{4}${variantId}:\\s*\\{([\\s\\S]*?)\\n\\s{4}\\},`)` depends on
`verify-branding-identity.mjs` using exactly four-space indentation for its `VARIANTS` entries and a
trailing comma on the closing brace. A reformat (Prettier, a nesting change) breaks the match. It
fails closed — the `if (!block)` branch reports "no VARIANTS descriptor entry found" — so this is not
a silent pass, but it is a red for a formatting change rather than a value change, which is the
"trains its readers to skip it" pattern the same file argues against elsewhere.
**Fix:** Have `verify-branding-identity.mjs` export `VARIANTS` and `import()` it here, so the
descriptor is read as data rather than scraped as text.

---

_Reviewed: 2026-09-01_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
