---
phase: 20-non-gui-gaps
reviewed: 2026-10-17T23:06:43Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - scripts/generate.mjs
  - scripts/verify-downstream-fixture.mjs
  - scripts/verify-planning-paths.mjs
  - scripts/verify-sql-store-soak.mjs
  - scripts/verify-strip-spike-verdict.mjs
  - scripts/verify-dependent-window-content.mjs
  - scripts/verify-group-channel.mjs
  - scripts/verify-ng-087-loose-position-across-restart.mjs
  - scripts/verify-ng-088-group-order-across-restart.mjs
  - scripts/verify-theia-fresh-clone-build.sh
  - scripts/verify-platform.sh
  - docs/BUILD.md
findings:
  critical: 0
  warning: 8
  info: 8
  total: 16
status: issues_found
---

# Phase 20: Code Review Report

**Reviewed:** 2026-10-17T23:06:43Z
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

Scope came from the key-files of 20-01..20-05-SUMMARY.md. For `generate.mjs` and `verify-platform.sh` the phase-20 diff (`8529bfa..HEAD`) was reviewed, plus the code it calls (`writeTargets`, `main`, the row runner). The new files were read in full. The review was static: no `--quick` run and no live run. One bash fact was confirmed with a standalone snippet: `shift 2` with only one argument does not shift, which WR-01 depends on.

No blocker was found. The PLAT-04 isolation is sound. `writeTargets` only writes target paths and deletes nothing. The harness no longer touches `generated/`, and `generate-check` still runs before the fixture row.

The defects that matter:
- One argument-parsing hang (WR-01).
- One unvalidated `--out` value that can overwrite the tracked root `.mozconfig` (WR-02).
- Two false-green paths in `group-channel` (WR-03, WR-04).
- `planning-paths` claims more coverage than its regex has (WR-05).
- Three robustness defects in the hash-locked NG-087/NG-088 checks (WR-06..WR-08).

Every finding on `verify-ng-087-*` and `verify-ng-088-*` is marked **locked: needs Chris re-lock**. Those files are in `check_locks` and cannot be edited by an agent.

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: `--workflow` with no value loops forever

**File:** `scripts/verify-theia-fresh-clone-build.sh:32`
**Issue:** `--workflow) WORKFLOW="${2:-}"; shift 2 ;;`. When `--workflow` is the last argument, `$#` is 1, so `shift 2` fails without shifting. The script uses `set -u`, not `set -e`, so the `while [ $# -gt 0 ]` loop sees `--workflow` again and spins forever. Under `verify-platform.sh` the row hangs and does not fail. A standalone snippet confirmed this: `$1` was still `--workflow` after 3 iterations.
**Fix:**
```bash
--workflow)
  [ $# -ge 2 ] || { echo "$NAME: FAIL -- --workflow needs a file"; exit 2; }
  WORKFLOW="$2"; shift 2 ;;
```

### WR-02: `--out` accepts an empty or in-repo path and reports a write error as manifest advice

**File:** `scripts/generate.mjs:171-177, 6041-6042, 3853-3856, 6063-6070`
**Issue:**
- `--out ''` passes the `value === undefined || value.startsWith('--')` guard. `resolve(process.cwd(), '')` is then the cwd, so the generator writes its ~56 targets straight into the cwd.
- `--out .` does the same. From the repo root, that overwrites the tracked root `.mozconfig`, which is one of the target names, and scatters `branding/`, `installer/`, `*.json` and `identity.configure` into the checkout. `--out upstream/...` writes inside `upstream/`, which breaks hard rule 2.
- A caller passing an unset shell variable (`--out "$DIR"`) gets this silently.
- If a write fails (EACCES, ENOTDIR), the throw lands in the top-level catch. That catch tells the reader to fix `configuration.toml`, which is the wrong diagnosis. By then the write loop may have written part of the tree.
**Fix:** Refuse an empty value and any `--out` that resolves inside REPO_ROOT, except under `generated/`. Wrap the write loop so a filesystem error gets its own plain-words message:
```js
if (value === undefined || value === '' || value.startsWith('--')) { /* existing FAIL */ }
...
const out = resolve(process.cwd(), outArg);
const rel = relative(REPO_ROOT, out);
if (rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))) {
    report(['--out must name a folder outside this project. Next step: run: ' + RERUN + ' --out <folder>']);
}
```

### WR-03: group-channel skips a file that imports the event-name constant (false green)

**File:** `scripts/verify-group-channel.mjs:218-229, 239-241, 268-273, 277-281`
**Issue:** D4 and D6 only recognise the request or response name as a quoted literal, or as a `const X = '<name>'` binding in the same file (`bindings()`). Both constants are already `export`ed: `GROUP_REQUEST_EVENT` and `GROUP_RESPONSE_EVENT` at `theia/extensions/modes/src/browser/group-actor-client.ts:18-19`, and `SHELL_STATE_REQUEST_EVENT` at `theia/extensions/tab-uris/src/browser/profile-storage.ts:33`.

Take a new frontend file that does `import { GROUP_REQUEST_EVENT } from '...'` and then calls `window.dispatchEvent(new CustomEvent(GROUP_REQUEST_EVENT, {}))`. That breaks fault 4 twice: it dispatches on window and has no `bubbles`. The file has no literal, so `namesRequest` is false and the file is not counted. `isName` is false, so the site is skipped with `continue`. A `document.addEventListener(GROUP_RESPONSE_EVENT, ...)` in that file is likewise skipped by D6. The row PASSes on a dead channel. That is the 15-01 failure this row exists to catch.
**Fix:** Resolve imported bindings. Build one map of `export const X = '<name>'` across all frontend sources first. Then, for each file, add every `import { X [as Y] } from` whose X is in that map to `bindings(name)`. Add a plant: a new in-memory file that imports `GROUP_REQUEST_EVENT` and dispatches on `window` must go red.

### WR-04: `stripComments` treats `/*` inside a line comment or string as a block start

**File:** `scripts/verify-group-channel.mjs:53-55`
**Issue:** The block-comment regex runs first. It deletes from any `/*` up to the next `*/`, including a `/*` inside a `//` comment or a string literal. The tree already has this shape: `theia/extensions/branding/src/browser/powerbrowser-about-dialog.tsx:36` has `` `@theia/*` `` in a line comment. In a file that dispatches requests, the deletion can remove `new CustomEvent(...)` sites and the request literal together. That file then drops out of D4 and D6 with no failure, which is a false green. The helper was copied from `verify-web-tab-bridge.mjs`, so that row has the same hazard.
**Fix:** Strip comments with a small scanner that tracks string, template and line-comment state, the same way `inkscapeSpawnOptionSpans` in `generate.mjs` skips quoted text. Add a plant that puts `'image/*'` before a dispatch site.

### WR-05: planning-paths does not see every planning-tree literal it claims to check

**File:** `scripts/verify-planning-paths.mjs:23, 148`
**Issue:** `LITERAL` requires `phases/` or `milestones/v[0-9.]+-phases/` followed directly by a digit. Three forms are invisible to it:
- **Split joins.** For example `join(root, '.planning/milestones', entry.name, phaseDir, fileName)` at `scripts/verify-strip-spike-verdict.mjs:85` and `scripts/verify-dependent-window-content.mjs:69`, or `join(REPO_ROOT, '.planning', 'phases', '14-...')`.
- **Version globs.** For example `.planning/milestones/v*-phases/07-*/fixtures`.
- **Leading phase globs.** For example `.planning/phases/*/fixtures`.

Any of these can point at a moved or deleted phase while the row prints PASS. The PASS line names the scanned directories, but the header ("every path literal ... must resolve") and the R-record claim full coverage. The two `resolveRecord` archive-scan fallbacks also remain (strip-spike:76-95, dependent-window:60-81). That contradicts the row's own rule that "a fallback is the breakage this row exists to catch". The fallbacks are still masked from planning-paths because they are split joins.
**Fix:** Either narrow the stated claim to "contiguous `.planning/phases/NN...` and `.planning/milestones/vN-phases/NN...` literals", or extend the scan. Count `v*` in the version segment, flag any `'.planning/milestones'` or `'.planning', 'phases'` string argument as an unverifiable reference, and add a self-test case for each form.

### WR-06: NG-087/NG-088 reader-SQL lookup runs past its method (locked: needs Chris re-lock)

**File:** `scripts/verify-ng-087-loose-position-across-restart.mjs:41-47`, `scripts/verify-ng-088-group-order-across-restart.mjs:45-51`
**Issue:** `async ${method}\([^)]*\)[\s\S]*?prepare\(\s*'([^']+)'` is lazy but has no bound. Suppose the reader SQL moves to a template literal, double quotes, string concatenation, or a cached statement. The match then continues into the next method's `prepare('...')`: `getSettings` for `listUngroupedTabs`, and `listUngroupedTabs` for `getGroupTabs`. The check runs the wrong SQL, and the result is exit 1 with a misleading text ("does not select x and y", or a bind error). Both headers promise "a reader SQL that cannot be found is never a valid red" (exit 2).
**Fix:** Cut the method body first, up to the next `\n    async ` or the closing brace at that indent. Then require exactly one `prepare(` in the body, and throw `Instrument` if the argument is not a single-quoted literal.

### WR-07: NG-087/NG-088 `--at` leaks its stage dir on every red run (locked: needs Chris re-lock)

**File:** `scripts/verify-ng-087-loose-position-across-restart.mjs:212-224`, `scripts/verify-ng-088-group-order-across-restart.mjs:197-209`
**Issue:** `process.exit(1)` is called inside the `try` whose `finally` removes `stage`. `process.exit` does not run pending `finally` blocks, so every failing `--at <rev>` run leaves a `ng087-at-*` or `ng088-at-*` mkdtemp behind. A failing `--at` run is the recorded-red method (`record-fail` at b9412fa), so this is the normal path for it, not an edge case.
**Fix:** Set `process.exitCode = 1` and `return` in place of `process.exit(1)`, so the `finally` runs.

### WR-08: NG-087/NG-088 ignore unknown arguments (locked: needs Chris re-lock)

**File:** `scripts/verify-ng-087-loose-position-across-restart.mjs:190-211`, `scripts/verify-ng-088-group-order-across-restart.mjs:175-196`
**Issue:** Only `args[0] === '--self-test'` and `'--at'` are recognised. Anything else, such as `--self-tset`, `--selftest`, or a stray second argument, falls through to the tree check, which PASSes. A mistyped `-self-test` registry row would then show green without planting anything. `generate.mjs` (`rejectUnknownArguments`) and the fresh-clone script both refuse unknown arguments.
**Fix:** Before the `if` dispatch, add `if (args.length && !['--self-test', '--at'].includes(args[0]) || (args[0] === '--self-test' && args.length > 1) || (args[0] === '--at' && args.length !== 2)) throw new Instrument(...)`.

## Info

### IN-01: Raster-bus guard sees only one spawn spelling

**File:** `scripts/generate.mjs:2926, 2962-2972`
**Issue:** `INKSCAPE_SPAWN` matches `spawnSync('inkscape'` only. A future inkscape call written as `spawnSync("inkscape"`, `execFileSync('inkscape'`, `spawn('inkscape'`, or through a binary-name const would escape `rasterBusFailures` with no failure. The self-test's own `spawn('inkscape'` at line 4732 is already outside the guard.
**Fix:** Match `/\b(?:spawnSync|spawn|execFileSync|execFile)\(\s*['"`]inkscape['"`]/`, or route every inkscape spawn through one helper.

### IN-02: `RASTER_ENV` is exported but nothing imports it

**File:** `scripts/generate.mjs:2920`
**Issue:** No other script imports it. The export makes a frozen snapshot of the whole `process.env` part of the module's public surface for no current consumer.
**Fix:** Drop `export`.

### IN-03: The harness self-test crashes with a stack trace when the default tree cannot be generated

**File:** `scripts/verify-downstream-fixture.mjs:602, 610, 208`
**Issue:** `defaultTree()` returns `null` on a failing default generate. S2 and S3 pass that to `cpSync`, which throws a TypeError with a stack trace instead of printing `defaultTreeFailure`. Separately, cleanup is registered with `process.on('exit')`, which does not run when `verify-platform.sh` group-kills the harness with a signal, so `pb-downstream-default-*` dirs leak on interrupt.
**Fix:** `const tree = defaultTree(); if (tree === null) { check('default-tree', false, defaultTreeFailure); } else { ... }`.

### IN-04: R33's list of rows that are red in a clone does not include the new group-channel rows

**File:** `docs/non-gui/decisions.md:85`, cited at `scripts/verify-platform.sh:3766`
**Issue:** The row comment says that without `upstream/` the row "fails like the other upstream readers (R33)". R33 still lists only shell-gbrowser-standin, its self-test, and gui07-strip-spike-verdict-self-test. `group-channel` and `group-channel-self-test` both read `upstream/browser/components/DesktopActorRegistry.sys.mjs`, so they are now red in a clone without `upstream/` too.
**Fix:** Add both labels to R33's clone-red list.

### IN-05: BUILD.md purge recipe deletes a cache the following command may not use

**File:** `docs/BUILD.md:518-524`
**Issue:**
- `rm -rf objdir/tmp/profile-default/startupCache` targets the `mach run` profile. The next line launches the bare binary without `--profile`, so it uses the user's default profile, and the `rm` has no effect there. `-purgecaches` together with `MOZ_PURGE_CACHES=1` does the actual work.
- "Theia-side edits need a rebuild instead (`yarn build` in `theia/`)" omits `nix develop .#theia`. CLAUDE.md states that `yarn` does not work outside the dev shell.
**Fix:** Either add `--profile objdir/tmp/profile-default` to the launch line or drop the `rm`. Write the rebuild as `nix develop .#theia --command bash -c 'cd theia && yarn build'`.

### IN-06: Fresh-clone script: a weak P3 match string and a global `rc`

**File:** `scripts/verify-theia-fresh-clone-build.sh:131, 139, 148`
**Issue:** P3's expected text, `web-tab.css`, is broad. Any failing build output that lists that asset matches it, whether or not the import path is the cause. `rc` in `run_self_test` is not declared `local`.
**Fix:** Match the resolver error shape, for example `Can't resolve './web-tab.css'`, and add `rc` to the `local` list.

### IN-07: NG-087/NG-088 misdiagnosis and duplicated code (locked: needs Chris re-lock)

**File:** `scripts/verify-ng-087-loose-position-across-restart.mjs:85-87`, both files throughout
**Issue:** When no row comes back (`!t`), ng-087 reports "the loose-tab reader SQL does not select x and y". The real cause could be the writer not creating the row. Separately, about 100 lines are copied between the two files: `readerSql`, `gitShow`, `plant`, `start`/`mutate`, the shell fixtures, and the `main()` and `--at` handling. A future fix to one, for example WR-06 or WR-07, has to be made twice under a re-lock.
**Fix:** Report `no row for ${TERM}` separately from a missing column. Move the shared code into `scripts/lib/`, next to `tab-store-fakes.mjs`.

### IN-08: group-channel crashes on a tracked file deleted in the working tree

**File:** `scripts/verify-group-channel.mjs:298-301`
**Issue:** `loadSources` reads every `git ls-files` frontend path without a guard. A tracked file removed in the working tree throws ENOENT with a stack trace. `verify-planning-paths.mjs:134-141` handles the same case.
**Fix:** Skip ENOENT as `planning-paths` does, or report it as one plain FAIL line.

---

_Reviewed: 2026-10-17T23:06:43Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
