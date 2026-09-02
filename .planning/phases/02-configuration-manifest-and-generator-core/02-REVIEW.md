---
phase: 02-configuration-manifest-and-generator-core
reviewed: 2026-09-01T00:00:00Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - scripts/generate.mjs
  - scripts/verify-generated-identity.mjs
  - scripts/lib/config-schema.json
  - configuration.toml
  - scripts/verify-platform.sh
  - scripts/verify-branding-preflight.mjs
  - powerbrowser/branding/dev/configure.sh
  - powerbrowser/branding/release/configure.sh
  - .github/workflows/rebase-upstream.yml
  - .gitignore
  - theia/extensions/branding/src/browser/powerbrowser-mark.ts
findings:
  critical: 4
  warning: 14
  info: 9
  total: 27
status: issues_found
---

# Phase 2: Code Review Report

**Reviewed:** 2026-09-01
**Depth:** standard
**Files Reviewed:** 11
**Status:** issues_found

## Summary

The generator's structural defences hold where the file claims them loudest: prototype
pollution is genuinely closed (verified empirically — `__proto__` as a key and as a table
header are both refused, and `Object.prototype` stays clean), the mask-before-merge ordering
is real and its self-test case does pin it, the `--check` temp-directory design does prevent
a self-confirming comparison, and both self-test suites go red on planted faults.

The defects are in the layer the file does *not* talk about: **what happens between a
value passing validation and that value reaching a build artifact.** The schema constrains
five identifier-shaped settings with regexes and leaves every other string — including
`identity.display_name`, which is required — completely unconstrained, and no emitter
escapes anything. TOML basic strings decode `\n`, so a manifest value writes arbitrary
lines into two files the Gecko build *sources*. Separately, every `variants[].*` key is
schema-optional but emitter-mandatory, so a config that validates green crashes the
generator with a raw Node stack trace after it has already half-written `generated/`.

Two gate-level defects round it out, both of which the surrounding comments assert are not
possible: `generate-check` is registered in the `--quick` commit gate and is red on every
fresh clone (verified: exit 1), repeating verbatim the mistake the RE-TIERED block twelve
lines below it exists to document; and the CI byte-identity step runs *before* the rebase
it claims to guard.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: Unescaped manifest values inject arbitrary lines into build-sourced files

**File:** `scripts/generate.mjs:455-467`, `scripts/generate.mjs:503-518`, `scripts/generate.mjs:536-551`; `scripts/lib/config-schema.json`

**Issue:** Four settings that reach an emitter carry no `regex` in the schema:
`identity.display_name` (required), `variants[].name_suffix`, `variants[].objdir`,
`variants[].branding_dir`. No emitter escapes or rejects anything, and TOML basic strings
decode `\n` and `\"`. Verified by running the real `resolveConfig` + emitters:

```toml
display_name = "Acme\"\nExec=/bin/sh -c evil\nX=\""
```

passes validation with zero failures and produces:

```sh
# generated/branding/dev/configure.sh
MOZ_APP_DISPLAYNAME="Acme"
Exec=/bin/sh -c evil
X=" Dev"
```

`configure.sh` is **sourced by the Gecko build**, so that is build-time command execution.
The same value lands in the `.desktop` files as a second `Exec=` key — freedesktop takes the
first key, so an injected `Exec=` placed before the real one silently replaces the launched
binary.

`objdir` is worse because it also escapes a shell expansion. `objdir = "../../../../etc}$(id)"`
emits:

```sh
# generated/.mozconfig
mk_add_options MOZ_OBJDIR=@TOPSRCDIR@/../${POWERBROWSER_OBJDIR:-../../../../etc}$(id)}
```

— the `}` closes the `${...:-...}` default and `$(id)` becomes a live command substitution.
The same value produces `Exec=/etc}$(id)/dist/bin/acme-browser` in the desktop entry, i.e.
`join(REPO_ROOT, variant.objdir, ...)` at line 537 normalises the traversal away and yields
an absolute path outside the repo.

The file's own claim at lines 559-564 — that string-literal write paths are "structurally
what stops a config key directing a write" — is true and is not the issue. The issue is
that a config key directs *content* into files that are executed.

**Fix:** Constrain in the schema and reject at validation time; do not escape at emit time
(escaping is per-format and there are three formats).

```json
"identity.display_name": {
  "type": "string", "required": true,
  "regex": "^[^\\u0000-\\u001f\"\\\\$`]{1,64}$",
  "regex_help": "one line of plain text, 1 to 64 characters, with no quote, backslash, dollar sign or backtick",
  "regex_example": "Acme Browser"
},
"variants[].name_suffix": { "type": "string", "required": false, "regex": "^[^\\u0000-\\u001f\"\\\\$`]{0,32}$", ... },
"variants[].objdir":      { "type": "string", "required": false, "regex": "^[A-Za-z0-9][A-Za-z0-9._-]*$", ... },
"variants[].branding_dir":{ "type": "string", "required": false, "regex": "^[A-Za-z0-9][A-Za-z0-9._/-]*$", ... }
```

`variants[].*` regexes additionally need CR-02's fix, since `validate()` currently skips
every `[]` path in its required loop and the value loop only checks paths it finds in the
merged document. Add a self-test case whose fixture plants a newline in `display_name` and
requires the run to go red naming `identity.display_name`.

---

### CR-02: Every `variants[].*` key is schema-optional but emitter-mandatory — green config, raw stack trace, half-written tree

**File:** `scripts/lib/config-schema.json` (`variants[].*` all `"required": false`); `scripts/generate.mjs:503-518`, `scripts/generate.mjs:536-551`, `scripts/generate.mjs:617-632`

**Issue:** Verified against the real CLI. A manifest whose `dev` variant omits `objdir`
validates with **zero failures**, then:

- `emitMozconfig` emits `MOZ_OBJDIR=@TOPSRCDIR@/../${POWERBROWSER_OBJDIR:-undefined}` and
  `--with-branding=${POWERBROWSER_BRANDING:-undefined}`;
- `emitConfigureSh` emits `MOZ_APP_DISPLAYNAME="Acme Browserundefined"` when `name_suffix`
  is absent;
- `emitDesktopEntry` throws on `join(REPO_ROOT, undefined, ...)`.

The throw is uncaught. Actual output:

```
node:path:1339
      validateString(arg, 'path');
TypeError [ERR_INVALID_ARG_TYPE]: The "path" argument must be of type string. Received undefined
    at join (node:path:1339:7)
    at Object.emitDesktopEntry [as emit] (file:///…/scripts/generate.mjs:537:18)
```

That is a stack frame, a `node:` specifier, and the host path to the project — all three of
the markers `INTERNAL_MARKERS` (lines 976-980) names, and a direct violation of CLAUDE.md's
user-facing copy rule. The self-test cannot catch it because no case drives an emitter with
a partial variant, which makes the `generate-self-test` registry comment's claim ("this row
is what enforces that rule by pattern rather than by a reviewer's memory") overclaimed.

Compounding it: `writeTargets` (line 617) writes target-by-target with no staging, so by the
time it throws it has already written `.mozconfig` and both `configure.sh` files. The header
comment's promise at lines 30-31 ("Nothing is written under `generated/` until every check
has passed. A failed run leaves the output tree exactly as it found it") does not hold once
a failure can originate inside the write loop.

**Fix:** Two changes.

1. Make the variant fields required and teach `validate()` to descend into array elements
   (the comment at lines 236-240 already predicts this and names both call sites that carry
   the assumption). Minimum viable version, keeping `validate`'s current shape:

```js
for (const [path, spec] of Object.entries(SCHEMA_KEYS)) {
    if (!spec.required) continue;
    if (path.includes('[]')) {
        const [head, leaf] = path.split('[].');
        (readPath(doc, head) ?? []).forEach((el, i) => {
            if (!isUnset(el?.[leaf])) return;
            failures.push(`${head} entry ${i + 1} does not set ${leaf}. Open ${MANIFEST_NAME}, `
                + `find the [[${head}]] section for that entry, and give ${leaf} a value. Then run: ${RERUN}`);
        });
        continue;
    }
    …existing scalar branch…
}
```

2. Stage the write: emit every target into a buffer first, then write, so a failure in the
   middle of the loop cannot leave a mixed tree.

```js
function writeTargets(config, root) {
    const pending = TARGETS.map(target => {
        const variant = variantById(config, target.variant);
        if (variant === undefined) { …existing message…; process.exit(1); }
        return [join(root, target.generated), target.emit(config, variant)];
    });
    for (const [outPath, body] of pending) {
        mkdirSync(dirname(outPath), { recursive: true });
        writeFileSync(outPath, body, 'utf8');
    }
    return pending.length;
}
```

---

### CR-03: `generate-check` is in the `--quick` commit gate and is red on every fresh clone

**File:** `scripts/verify-platform.sh:3659` (row), `scripts/verify-platform.sh:3630-3641` (its justifying comment)

**Issue:** The row sits above the `if [ "$QUICK" -eq 0 ]` boundary at line 3663, so it runs
under `--quick`. `generated/` is git-ignored (`.gitignore:30`), so it is absent on every
fresh clone. Verified:

```
$ rm -rf generated && node scripts/generate.mjs --check
generate: FAIL -- nothing has been generated in this copy of the project yet…
exit=1
```

A distinct, well-written message — but it still exits 1, so the row is red. The registry
comment claims the opposite: "On a tree where the generator has already run -- which is the
only tree this row ever sees, since a run with no generated/ reports the absent-directory
outcome and not a mismatch". That conflates "not a mismatch" with "not a failure"; the row
does not observe the message, only the exit code.

This is the exact defect the RE-TIERED block twelve lines below it documents in its own
words: *"registered in a deleted driver's --quick set while actually depending on something
--quick promises not to need, so `--quick` could never be green on a fresh checkout and was
therefore useless as a commit gate."* `--quick` is the repo's stated commit gate
(CLAUDE.md), so this breaks it for every new checkout and every worktree.

**Fix:** Either move the row into the `QUICK -eq 0` block, or make the absent-directory
outcome not a failure for gating purposes. The second is closer to the design intent, since
the message already says "This is not a mismatch":

```js
// checkTargets, absent-root branch
console.error(`${NAME}: SKIP -- nothing has been generated in this copy of the project yet…`);
console.error(`  Next step: run: ${RERUN}`);
return 0;
```

If exit 0 for an absent tree is unacceptable, add a `--check --require-generated` flag and
register only the plain `--check` under `--quick`. Do not leave the row as-is: a red commit
gate on a clean checkout is what this file's own comments say trains readers to skip it.

---

### CR-04: The rebase workflow's byte-identity step runs before the rebase it claims to guard

**File:** `.github/workflows/rebase-upstream.yml:71-111`

**Issue:** The comment at lines 87-90 states the byte-identity step "is the step that goes
red if an upstream rebase moved one of those five files." It is step 4 of 6; the rebase is
step 6. Nothing re-runs it afterwards — confirmed by grepping `scripts/rebase-upstream.sh`,
which invokes only `scan-brand-residue.mjs` (line 151) and never `generate.mjs` or
`verify-generated-identity.mjs`. A rebase that clobbered `.mozconfig` or either
`configure.sh` exits the job green.

By this repo's own rule (CLAUDE.md: a check that cannot go red is not a check), a gate whose
stated protective purpose is structurally unreachable is a defect, not a comment error.

**Fix:** Keep the pre-rebase run (its fail-fast-on-a-dirty-tree value is real, same argument
as the brand scan at line 68) and add a post-rebase run:

```yaml
      - name: Rebase onto requested tag
        env:
          REBASE_TAG: ${{ inputs.tag }}
        run: bash scripts/rebase-upstream.sh --tag "$REBASE_TAG"

      - name: Re-check byte-identity after the replay
        run: node scripts/verify-generated-identity.mjs
```

If the intent was only ever a pre-flight, delete the claim in lines 87-90 rather than
leaving a comment that promises coverage the job does not provide.

---

## Warnings

### WR-01: `process.exit` inside `checkTargets`' `try` skips the `finally`, leaking the temp directory

**File:** `scripts/generate.mjs:700-768` (the `try`/`finally`), reached via `writeTargets` at line 624

**Issue:** `writeTargets` calls `process.exit(1)` when a variant is missing. `process.exit`
does not unwind `finally` blocks, so `rmSync(dir, …)` at line 766 never runs. Verified: a
manifest with the `release` variant deleted leaves one `/tmp/generate-check-*` directory
behind per invocation. The comment at lines 689-690 explicitly claims the opposite
("Returns an exit code rather than exiting, so the temporary directory's cleanup is not
skipped on the way out") — the claim is true of `checkTargets` itself and false of its
callee.

**Fix:** Have `writeTargets` throw a tagged error or return a failure list instead of
exiting, and let `checkTargets`/`main` decide the exit code. CR-02's staged-write refactor
is the natural place to do it.

---

### WR-02: `loadLayer` reports every read failure as "configuration.toml was not found at the top of the project"

**File:** `scripts/generate.mjs:146-155`

**Issue:** The bare `catch` covers `ENOENT`, `EACCES`, `EISDIR` and `ELOOP` alike, and it
hardcodes `MANIFEST_NAME` in the message even though `path` is a parameter. A downstream
manifest (Phase 7, and today `--self-test`'s fixtures) that is unreadable produces
"configuration.toml was not found at the top of the project" — naming the wrong file and
the wrong problem, and offering a next step that cannot fix it.

**Fix:** Distinguish the file and the reason:

```js
} catch (err) {
    const what = path === MANIFEST_PATH
        ? `${MANIFEST_NAME} at the top of the project`
        : 'the settings file this run was pointed at';
    const why = err.code === 'ENOENT' ? 'could not be found' : 'could not be read';
    console.error(`${NAME}: FAIL -- ${what} ${why}.`);
    …
}
```

Keep the existing next-step line for the `MANIFEST_PATH` case only.

---

### WR-03: The schema is loaded and parsed at module scope with no error handling

**File:** `scripts/generate.mjs:122`

**Issue:** `JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'))` is unguarded and runs at *import*
time, so a missing or malformed `scripts/lib/config-schema.json` produces a raw
`SyntaxError`/`ENOENT` stack trace carrying `node:fs`, the absolute schema path and the
project root — the same three markers `INTERNAL_MARKERS` bans. It also takes down
`verify-generated-identity.mjs`, which imports this file, so the gate fails with a stack
trace rather than a message.

**Fix:** Wrap it and emit the file's own copy style:

```js
let schema;
try {
    schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));
} catch {
    console.error(`${NAME}: FAIL -- the list of settings this project understands is missing or damaged.`);
    console.error('  Next step: restore the project from a clean copy; editing configuration.toml will not help.');
    process.exit(1);
}
```

---

### WR-04: The `invalid basename` case's `extra` assertion cannot go red

**File:** `scripts/generate.mjs:1073-1075` with `snapshotOutputRoot` at line 888

**Issue:** The case asserts "the rejected run changed what is under generated/". It cannot
fire, for two independent reasons: (a) the case runs `resolveConfig`, which never writes
anything under any circumstance, so no rejected run in this suite can touch `generated/`;
and (b) `snapshotOutputRoot` compares only the sorted **file name list**, so even a run that
rewrote every byte of all five files would compare equal. It is a green line asserting
nothing — the exact failure mode the file's own comment at lines 216-222 of
`verify-generated-identity.mjs` calls out one level up.

**Fix:** Either make it discriminate — snapshot content digests, and drive the *writing*
path (`main()`-equivalent) rather than `resolveConfig` — or delete the `extra` hook and stop
claiming the property.

```js
function snapshotOutputRoot() {
    if (!existsSync(OUTPUT_ROOT)) return '(absent)';
    return filesUnder(OUTPUT_ROOT, '', []).sort()
        .map(rel => `${rel}:${createHash('sha256').update(readFileSync(join(OUTPUT_ROOT, rel))).digest('hex')}`)
        .join('\n');
}
```

---

### WR-05: The self-test's fixture-vacuity guard compares against the wrong anchor and can never fire

**File:** `scripts/generate.mjs:1144-1147`

**Issue:** `if (testCase.toml === clean)` compares a `FIXTURE_BASE`-derived fixture against
the *real* `configuration.toml` text. Those two documents differ in every value and can
never be equal, so the guard is dead. The failure mode it was clearly written for is a
`.replace()` whose anchor drifted out of `FIXTURE_BASE`, leaving `testCase.toml ===
FIXTURE_BASE` — an unmodified, fully valid fixture.

**Fix:**

```js
if (testCase.toml === FIXTURE_BASE) {
    complain(testCase, 'plants a fixture identical to FIXTURE_BASE; its replace() anchor has drifted and the case proves nothing');
    return;
}
```

---

### WR-06: `snapshotOutputRoot` reads the real `generated/` during `--self-test`

**File:** `scripts/generate.mjs:888-890`, used at lines 1025 and 1073

**Issue:** Every other planted fault in this suite is deliberately confined to a `mkdtemp`
tree — the comments at lines 893-898 and 249-254 make that a stated rule. This one reads
shared, mutable state outside the test's control, so a concurrent `node scripts/generate.mjs`
(or a `verify-platform.sh` run in another worktree sharing the checkout) makes the case go
red for a reason unrelated to the fault.

**Fix:** Fold into WR-04 — drive a throwaway root and snapshot that.

---

### WR-07: An empty or non-table `variants` array is reported as an unknown setting

**File:** `scripts/generate.mjs:199-205`

**Issue:** `collectLeaves` only descends into an array when `value.every(isTable) &&
value.length > 0`. Verified: `variants = []` in the manifest produces

```
unknown setting 'variants' -- configuration.toml has no setting by that name.
Check the spelling of the setting and of the section header above it…
```

The setting name is spelled correctly and the section header is fine, so the next step sends
the reader hunting for a typo that does not exist — the precise anti-pattern the `unknown
key` self-test case (lines 1078-1088) exists to prevent for a different input.

**Fix:** Treat an array whose elements are not all tables as a distinct failure class:

```js
if (Array.isArray(value)) {
    if (value.length > 0 && value.every(isTable)) {
        for (const element of value) collectLeaves(element, `${path}[]`, leaves, refused);
    } else {
        malformed.push(path);   // reported as: "'variants' must be written as one or more
                                // [[variants]] sections, each with its own settings"
    }
    continue;
}
```

---

### WR-08: Unknown-setting failures always name `configuration.toml`, even for a downstream-layer key

**File:** `scripts/generate.mjs:209-225`, called from lines 793-795

**Issue:** `collectLeaves` pools leaves from both layers into one array and `rejectUnknown`
hardcodes `MANIFEST_NAME` in both messages. Today the downstream layer is either the derived
required-layer or a self-test fixture, so nothing is wrong on screen. In Phase 7 —
`PB_CONFIG_DIR`, which the comment at lines 138-144 already names as the reason the parameter
exists — a downstream's typo will tell its author to go and edit *this* project's manifest.

**Fix:** Carry the source path alongside each leaf and use it in the message. Two lines in
`collectLeaves` (`leaves.push({ path, value, from })`) and one in each `failures.push`.

---

### WR-09: `validate()` dereferences `SCHEMA_KEYS[path]` with no guard

**File:** `scripts/generate.mjs:397-400`

**Issue:** `const spec = SCHEMA_KEYS[path];` then `spec.type` with no `undefined` check.
Today the merged leaves are provably a subset of the two rejected layers, so it cannot fire
— but the invariant lives three functions away and is not asserted anywhere. Any change to
`mergeInto` that synthesises a key (or a schema edit that removes a path) turns this into an
uncaught `TypeError` with the same stack-trace leak as CR-02.

**Fix:**

```js
const spec = SCHEMA_KEYS[path];
if (spec === undefined || reportedUnset.has(path)) continue;
```

---

### WR-10: `verify-generated-identity.mjs` runs its CLI at import time and rejects no arguments

**File:** `scripts/verify-generated-identity.mjs:345`, `scripts/verify-generated-identity.mjs:319`

**Issue:** `process.exit(main())` at top level, with no `IS_MAIN` guard. `generate.mjs`
carries a 15-line comment (lines 78-94) explaining in detail why an unguarded entry point is
a defect — importing it "would end the check before it asserted anything -- a check that
exits green having run none of its own body" — and then the file that consumes that guard
does not apply it to itself. Separately, `main()` checks only `process.argv.includes('--self-test')`,
so `node scripts/verify-generated-identity.mjs --slef-test` silently runs the wrong mode and
exits 0, whereas `generate.mjs` rejects the same typo.

**Fix:** Copy both mechanisms across:

```js
const IS_MAIN = process.argv[1] !== undefined
    && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (IS_MAIN) {
    for (const a of process.argv.slice(2)) {
        if (a !== '--self-test') { console.error(`${NAME}: FAIL -- unknown argument '${a}'`); process.exit(1); }
    }
    process.exit(main());
}
```

---

### WR-11: `checkGeneratedIsNotTracked`'s `git ls-files` call is unguarded, and `check-ignore` conflates two exit codes

**File:** `scripts/verify-generated-identity.mjs:197-207`

**Issue:** Two problems in one function.

- Line 202: `execFileSync('git', ['ls-files', …])` has no `try`. Run outside a git work tree,
  or on a host without `git` on `PATH`, it throws uncaught — a stack trace carrying `node:child_process`
  and the host path, from a script whose entire purpose is a clean pass/fail verdict.
- Lines 189-200: `git check-ignore` exits 1 for "not ignored" and 128 for an error (not a
  repository, bad option). The `catch` treats both as "not ignored" and prints
  `add "/generated/" to .gitignore` — advice that cannot fix a 128.

**Fix:**

```js
function git(args) {
    try { return { ok: true, out: execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' }) }; }
    catch (err) { return { ok: false, status: err.status }; }
}
const ignored = git(['check-ignore', '-q', '--', `${OUTPUT_DIR_NAME}/`]);
if (!ignored.ok && ignored.status === 1) failures.push(`${OUTPUT_DIR_NAME}/ is not ignored by git -- add "/${OUTPUT_DIR_NAME}/" to .gitignore…`);
else if (!ignored.ok) failures.push('this check has to run inside a copy of the project managed by git, and could not reach it');
```

---

### WR-12: The rebase workflow hand-rolls three checks instead of driving the one registry

**File:** `.github/workflows/rebase-upstream.yml:94-101`

**Issue:** The workflow invokes `node scripts/generate.mjs`, `… --check` and
`node scripts/verify-generated-identity.mjs` directly. CLAUDE.md is unambiguous: "One driver,
one registry: `scripts/verify-platform.sh`… Adding a check means appending one row to that
registry." Two consequences, both real: the workflow is now a second place that must be
edited when a row changes, and it silently omits both self-test rows
(`generated-byte-identity-self-test`, `generate-self-test`) that this phase registered — so
CI never proves the instruments discriminate.

**Fix:**

```yaml
      - name: Generate the derived build surfaces
        run: node scripts/generate.mjs

      - name: Verify the generator's four registered rows
        run: |
          for label in generate-self-test generate-check \
                       generated-byte-identity generated-byte-identity-self-test; do
            bash scripts/verify-platform.sh --only "$label"
          done
```

---

### WR-13: `firstDifferingLine` and `variantById` are duplicated verbatim across the two scripts

**File:** `scripts/generate.mjs:659-666` / `scripts/verify-generated-identity.mjs:99-106`; `scripts/generate.mjs:602-604` / `scripts/verify-generated-identity.mjs:108`

**Issue:** Two identical function bodies plus two near-identical eight-line comments, in
files that already have an import edge (`verify-generated-identity.mjs` imports `REPO_ROOT`,
`TARGETS` and `resolveConfig` from `generate.mjs`, specifically so that nothing is restated).
The reasoning at lines 14-24 of `verify-generated-identity.mjs` — a hand-kept restatement can
only ever agree with what it was copied from — applies to these two functions as directly as
it does to the target table.

**Fix:** Export both from `generate.mjs` and import them, exactly as `TARGETS` already is:

```js
export function firstDifferingLine(a, b) { … }
export function variantById(config, id) { … }
```

then in `verify-generated-identity.mjs`:

```js
import { REPO_ROOT, TARGETS, firstDifferingLine, variantById, resolveConfig } from './generate.mjs';
```

---

### WR-14: The `--quick` honesty claim for `generate-check` is wrong about what it writes

**File:** `scripts/verify-platform.sh:3655-3658`

**Issue:** "The generator reads configuration.toml and a JSON schema and **writes under
generated/**". Neither registered row runs the plain generator: `generate-check` emits into
`mkdtemp` and compares, `generate-self-test` emits into `mkdtemp` trees. Nothing under
`generated/` is written by either. This matters because a future reader deciding whether the
row is safe under `--quick`, or whether it explains a dirty tree, will act on a false
statement.

**Fix:** Replace the sentence with what the rows actually do: "both read `configuration.toml`
and a JSON schema, emit into `mkdtemp` directories, and write nothing under `generated/`."

---

## Info

### IN-01: The registry comment says "nine planted faults" and then lists eight

**File:** `scripts/verify-platform.sh:3644-3649`
**Issue:** The list omits the `partial identity table` case — which is the single most
load-bearing case in the suite (it is the only one that pins the mask-before-merge ordering).
**Fix:** Add "a partially-stated identity table" to the enumeration.

---

### IN-02: Self-test case message says "one variant, not three"; the manifest declares two

**File:** `scripts/generate.mjs:1053`
**Issue:** `holds: 'one variant, not three'` — `configuration.toml` has exactly two
`[[variants]]` sections, so the message a reader sees on the green path and in the failure
path both misstate the defaults layer.
**Fix:** `holds: 'one variant, not the two in the defaults layer'`.

---

### IN-03: `--check`'s non-vacuity branch is unreachable

**File:** `scripts/generate.mjs:716-720`
**Issue:** `writeTargets` either returns `TARGETS.length` (5) or exits, so `fresh.length === 0`
cannot be true while `TARGETS` is non-empty. Defensible as an assertion against a future
empty table, but as written it is a branch no test can enter.
**Fix:** Either leave it and note in the comment that it guards an emptied `TARGETS`, or
assert the stronger and reachable property `fresh.length === TARGETS.length`.

---

### IN-04: `--check` and `--self-test` together silently ignore `--check`

**File:** `scripts/generate.mjs:1198-1210`
**Issue:** Both flags pass `rejectUnknownArguments`; `--self-test` is dispatched first and
`--check` is discarded with no message.
**Fix:** Reject the combination the way `verify-platform.sh:85-86` rejects `--gate --quick`.

---

### IN-05: `extra` failures are reported under the "leaked … into what a reader sees" wording

**File:** `scripts/generate.mjs:1157-1160`
**Issue:** `extra` returns non-leak conditions too — `'the rejected run changed what is under
generated/'` is printed as `'invalid basename' leaked the rejected run changed what is under
generated/ into what a reader sees`, which is not a sentence and misdescribes the failure.
**Fix:** Keep `internalsLeaked` and `extra` as separate result buckets with separate
`complain` wordings.

---

### IN-06: `Allowed form: ${spec.regex}` puts a raw regex in user-facing copy

**File:** `scripts/generate.mjs:407-412`
**Issue:** The message already carries `regex_help` (plain words) and `regex_example` (a
concrete valid value), so the raw `^[a-z][a-z0-9-]{1,31}$` adds an implementation detail to
copy that CLAUDE.md says should state "the problem in plain language" and end with a real
affordance. Borderline against the letter of the rule (a regex is not a pref key or a raw
exception message) but against its spirit.
**Fix:** Drop the `Allowed form:` clause, or gate it behind a `--verbose`/diagnostics path.

---

### IN-07: Duplicate `variants[].id` values are silently resolved first-wins

**File:** `scripts/generate.mjs:602-604`; `scripts/verify-generated-identity.mjs:108`
**Issue:** `.find()` takes the first match, so two `[[variants]]` entries with `id = "dev"`
means the second is ignored with no diagnostic — and the two implementations would have to
stay agreed for the byte-identity gate to remain meaningful (see WR-13).
**Fix:** Add a validation failure for duplicate ids once WR-13 has collapsed the two lookups
into one.

---

### IN-08: `powerbrowser-mark.ts`'s raster path became ambiguous after the move to `brand/`

**File:** `theia/extensions/branding/src/browser/powerbrowser-mark.ts:10-12`
**Issue:** The comment now reads "`brand/mark.svg`, which is the one source all ten
`branding/{dev,release}/default{16,32,48,64,128}.png` rasters are rendered from." The rasters
live under `powerbrowser/branding/`, but the sentence's new first path is `brand/`, so the
bare `branding/…` reads as a sibling of it.
**Fix:** Spell the raster path in full: `powerbrowser/branding/{dev,release}/default{16,32,48,64,128}.png`.

---

### IN-09: `filesUnder` treats a symlinked directory as a file and reads through it

**File:** `scripts/generate.mjs:642-649`
**Issue:** `entry.isDirectory()` is false for a symlink to a directory, so such an entry is
pushed as a file and then `readFileSync` follows it. Not a trust boundary today (the tree is
the developer's own), but it makes `--check`'s "extra file" report wrong for a symlinked
subdirectory, and it becomes relevant if `generated/` is ever produced by CI from an
untrusted source.
**Fix:** `if (entry.isDirectory()) … else if (entry.isFile()) out.push(rel); else` report the
entry as a non-regular file that does not belong under `generated/`.

---

## What was checked and found sound

Recorded so a later reviewer does not re-litigate it:

- **Prototype pollution is genuinely closed.** Verified empirically: `__proto__ = "x"`,
  `[__proto__]` as a table header, `constructor` and `prototype` are all refused by
  `collectLeaves`/`rejectUnknown` before any assignment, and `Object.prototype` is unpolluted
  after every path. The null-prototype accumulator in `mergeInto` plus the `RESERVED_NAMES`
  skip is belt-and-braces as the comment says, not the load-bearing defence.
- **Write-path confinement holds.** Every `generated`/`tracked` path in `TARGETS` is a string
  literal; no manifest value reaches `join()` on a write target. (CR-01's traversal is in
  emitted *content*, which is a different defect.)
- **`--check`'s temp-directory design is correct** and does prevent the self-confirming
  comparison it describes; `mkdtemp` per invocation makes concurrent runs safe.
- **Mask-before-merge ordering is real**, and the `partial identity table` case does pin it —
  moving `maskDefaults` after `mergeLayers` makes that case go green, which is what the
  comment claims.
- **Both self-test suites go red on real planted faults** (9/9 and 7/7 verified by running
  them), and `mutationLanded`'s emitter-output comparison genuinely catches a drifted anchor.
- **CI supply-chain hygiene is good:** `actions/checkout` pinned by SHA, `permissions:
  contents: read`, `persist-credentials: false`, and `inputs.tag` passed through `env:` rather
  than interpolated into the shell — no workflow injection.
- **`.gitignore`'s `/generated/`** is correctly root-anchored, and the trailing-slash argument
  in `checkGeneratedIsNotTracked`'s comment is accurate.
- **`brand/mark.svg` rename** is consistent: no stale `powerbrowser/branding/mark.svg`
  reference survives outside `.planning/`, and `verify-branding-preflight.mjs` passes.

---

_Reviewed: 2026-09-01_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
