---
phase: 19-node-24-react-19-theia-1-76-0
plan: 02
subsystem: verification (static and live tiers)
tags: [UPD-08, UPD-09, RM-02, NG-086, single-copy, perspectives]
status: complete
requires: [19-01]
provides:
  - scripts/verify-single-copy-deps.mjs (single-copy-deps, --self-test, --root)
  - scripts/verify-ng-086-theia-react-node.mjs (ng086-theia-react-node, --self-test, --root); final, committed once at 85d80a5
  - upstream perspective accounting and the unaccounted-perspective plant in scripts/verify-mode-switch-tabs-live.mjs
  - four --quick rows (single-copy-deps, single-copy-deps-self-test, ng086-theia-react-node, ng086-theia-react-node-self-test)
affects: [19-03, 19-05, 19-07]
tech-stack:
  added: []
  patterns:
    - lstat-only node_modules walk that never follows a workspace symlink, recursing into <pkg>/node_modules and @scope/<pkg>/node_modules
    - semver loaded from theia's own workspace with createRequire anchored at theia/package.json; absent semver is a broken-instrument FAIL
    - upstream perspective ids widen the surplus side of a set comparison only, never the missing side
key-files:
  created:
    - scripts/verify-single-copy-deps.mjs
    - scripts/verify-ng-086-theia-react-node.mjs
  modified:
    - scripts/verify-platform.sh
    - scripts/verify-mode-switch-tabs-live.mjs
decisions:
  - "The NG-086 check imports only the vendored TOML parser (scripts/lib/toml.cjs, whose body is pinned by verify-vendored-parser.mjs). The node_modules walk is re-implemented in the file, so the sha lock covers everything the check does except that parser"
  - "The NG-086 check requires exactly one installed @theia/core to read peers from, and exactly one `nodejs = pkgs.nodejs_NN;` line in flake.nix; zero or several of either is a FAIL rather than a guess"
  - "The gui07 unaccounted plant gives its descriptor no-op onActivate/onDeactivate hooks, so only the surplus assertion can name it (the unchained assertion stays out of the way)"
metrics:
  duration: ~35m
  completed: 2026-10-17
  tasks: 3
  files: 4
estimate_ref: {tokens: 55000, tasks: 3}
actuals:
  tokens: 8400
  tasks: 3
  commits: 3
commits: 3
plan_head_before: 287bd5fd007da34ff0626325f4eacf39c37a1d35
plan_head_after: 5ad2f98a5a7835491176b83fbdfe7d2cf8b3aee5
---

# Phase 19 Plan 02: Single-copy, NG-086 and gui07 accounting checks Summary

This plan adds three checks that change no product code. One `--quick` row requires exactly one installed copy each of react, react-dom, @types/react, @types/react-dom and inversify. A second, NG-086, requires the installed Theia closure to equal the manifest pin, React to satisfy the @theia/core peers, and the flake Node major to meet engines. The third change lets the gui07 live check account for perspectives that installed upstream libs register, with a live plant that proves the surplus assertion still fires. Every check is green at the 1.74.1 / React 18.3.1 / Node 22 baseline and goes red on its plants.

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Single-copy dependency row (UPD-08) | a329f9f | scripts/verify-single-copy-deps.mjs, scripts/verify-platform.sh |
| 2 | NG-086 Theia, React and Node agreement check | 85d80a5 | scripts/verify-ng-086-theia-react-node.mjs, scripts/verify-platform.sh |
| 3 | gui07 upstream perspective accounting | 5ad2f98 | scripts/verify-mode-switch-tabs-live.mjs |

**NG-086 file commit (for 19-07's unchanged-since assertion):** `85d80a54dce4e25c488ca3a2676e154bcafc5743`. The file's sha256 at that commit is `9e20680687870a8850cf98b6b14c090c476721ddc19b7f3cd576b1d16c7f4646`. It has exactly one commit and was not edited after it.

## Observed at baseline

**single-copy-deps** (PASS):
`react 18.3.1 at theia/node_modules/react; react-dom 18.3.1 at theia/node_modules/react-dom; @types/react 18.3.31 at theia/node_modules/@types/react; @types/react-dom 18.3.7 at theia/node_modules/@types/react-dom; inversify 6.2.2 at theia/node_modules/inversify`

- `--self-test`: `PASS -- 5 cases` (clean control, nested duplicate, missing @types/react-dom, absent node_modules, symlinked duplicate).
- `--root <empty mkdtemp>`: exit 1, "theia/node_modules is absent".
- Scratch mutants, never committed, both made the self-test go red: a walk that follows symlinks failed the symlinked-duplicate case, and a check that ignores count 0 crashed with a non-zero exit.

**ng086-theia-react-node** (PASS):
`53 @theia packages at 1.74.1 (@theia/monaco-editor-core excepted at 1.108.201); react 18.3.1 satisfies ^18.3.1 || ^19.0.0; react-dom 18.3.1 satisfies ^18.3.1 || ^19.0.0; @types/react 18.3.31 satisfies ^18.3.0 || ^19.0.0; @types/react-dom 18.3.7 satisfies ^18.3.0 || ^19.0.0; Node 22 (flake.nix nodejs_22) meets engines.node >=22`

- `--self-test`: `PASS -- 6 cases` (clean control, version drift, monaco-editor-core exception, React peer miss, Node engines miss, empty walk).
- `--root <empty mkdtemp>`: exit 1, with five FAIL lines (no manifest, semver absent, node_modules absent, empty walk, no flake.nix).
- Five scratch mutants, each disabling one assertion (version compare, monaco exception, peer satisfies, engines intersects, empty-walk guard): each one turned exactly its own self-test case red.
- **The record-fail direction (19-05) was simulated in scratch.** A root holding a copy of configuration.toml with `theia_release = "1.76.0"`, a copy of flake.nix and a link to the real theia/ gave exit 1 with 53 FAIL lines, one per @theia package, of the form "@theia/ai-anthropic is installed at 1.74.1 (...), but configuration.toml upstreams.theia_release is 1.76.0".
- **Checked against npm for the 1.76.0 target:** `@theia/core@1.76.0` peers react, react-dom, @types/react and @types/react-dom at `^19.0.0`, and `@theia/plugin-utils@1.76.0` exists (lockstep). The research's 19.2.8 / 19.2.18 / 19.2.7 versions satisfy those peers.

**gui07 upstream perspective ids derived from the installed 1.74.1 tree:**

| id | constant defined in | registerPerspective( caller |
|----|---------------------|-----------------------------|
| `ai-first` | theia/node_modules/@theia/ai-ide/lib/browser/ai-first-perspective-contribution.js | same file |
| (`default`, excluded, already derived) | theia/node_modules/@theia/core/lib/browser/perspective-service.js | same file |

- Live run (logs/gui07-19-02.log, 16 s): `PHASE19_EXIT=0`.
  - Registered perspectives: `default, coding, browsing, organising`. `ai-first` is accounted but not registered, because D-22 rebind 1 keeps it unregistered at 1.74.1, and it is not reported missing.
  - `PASS -- 1 main-area and 2 bottom-area tab(s) survived every second-visit mode switch, attached`.
- Self-test (logs/gui07-selftest-19-02.log, 94 s): `PHASE19_EXIT=0`, `PASS -- the clean control is green and all 5 planted faults went red`. The new case printed:
  `ok  unaccounted perspective -> red, naming 'no source accounts for: unaccounted-plant '`
  `the live frontend registered perspective(s) no source accounts for: unaccounted-plant -- a mode registered outside theia/extensions/modes/src/browser/mode-descriptors.ts, the custom-mode store and the installed @theia libs, which the main-area exemption may never have chained`

## Verification results

- **Task 1 `<verify>` chain:** passed (VERIFY_T1_OK). The brand scan covered 349 files after staging. logs/quick-19-02-t1.log reaches the summary, both rows PASS, and the R33 subtraction is empty. The only FAILs are the 4 gui08 baseline rows.
- **Task 2 `<verify>` chain:** passed (VERIFY_T2_OK).
  - Precondition met: the ledger report lists no NG-086 row. NG-085 is the highest row.
  - The brand scan covered 350 files.
  - logs/quick-19-02-t2.log shows both ng086 rows PASS, and the R33 subtraction is empty.
- **Task 3 `<verify>` chain:** passed (VERIFY_T3_OK). Both LONG logs end `PHASE19_EXIT=0`, and the file no longer names the ai-layout contribution. logs/quick-19-02-t3.log shows 118 PASS and only the 4 gui08 FAILs, so the R33 subtraction is empty.
- **Acceptance criteria:**
  - Each commit names exactly its files: Tasks 1 and 2 name two files each, Task 3 names one.
  - `scripts/lib/` is untouched, and no sha-locked `verify-ng-0NN` file was edited.
  - No `-PLAN.md` filename is written into a tracked file outside `.planning/`.
- **pgrep:** clean before each live run. Port 3000 was never touched.

## Deviations from Plan

None in behaviour. Two wording details:
- The gui07 self-test's closing PASS line now derives its count (`all ${cases.length - 1} planted faults`) rather than saying "four". The header's session count and duration were updated to six sessions and about three minutes.
- The NG-086 header states that its one repo import is the vendored TOML parser. The plan's "imports no new helper" holds: toml.cjs is the parser the plan names.

## Known Stubs

None.

## Threat Flags

None. There is no new endpoint, auth path or schema. The threats were mitigated as follows:
- **T-19-04:** the lstat walk never follows a symlink, and the self-test plants both a nested and a symlinked duplicate.
- **T-19-05:** zero @theia packages, missing semver and an empty `--root` are each a FAIL.
- **T-19-06:** upstream ids feed only the surplus side, and the unaccounted plant goes red live.

## Notes for later plans

- **19-05:** add NG-086 with test_ref `scripts/verify-ng-086-theia-react-node.mjs::ng086-theia-react-node`, then record-fail with `node scripts/verify-ng-086-theia-react-node.mjs` once configuration.toml reads 1.76.0 and the install is still 1.74.1 (the simulated red is above).
- **Not measured: nested @theia/* copies at 1.76.0.** No scratch 1.76.0 install exists on disk, so whether any such copy appears at a version other than 1.76.0 has not been measured. At 1.74.1 there are none. If one appears, the check names it with its path.
- **After RM-02:** gui07 will see `ai-first` registered, and the upstream accounting already covers it. The rows that compare against literal sink ids are unaffected.

## Self-Check: PASSED

- FOUND: scripts/verify-single-copy-deps.mjs (tracked)
- FOUND: scripts/verify-ng-086-theia-react-node.mjs (tracked, one commit)
- FOUND: a329f9f, 85d80a5, 5ad2f98 are ancestors of HEAD
