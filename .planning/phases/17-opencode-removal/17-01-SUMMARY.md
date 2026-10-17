---
phase: 17-opencode-removal
plan: 01
subsystem: infra
tags: [theia, yarn, workspace, lockfile, opencode, verify-platform]
status: complete

requires: []
provides:
  - "theia workspace with seven @powerbrowser members; backend-opencode removed from index, disk and node_modules"
  - "yarn-regenerated theia/yarn.lock without the @agentclientprotocol/sdk@1.4.0 stanza"
  - "one-entry EXPECTED_ENV_TOUCHERS allowlist (token-gate powerbrowser-env.ts)"
affects: [17-02, 17-03, 17-04]

actuals:
  tokens: 22160
  tasks: 2
  commits: 1
plan_head_before: 6096a815cca8b225ceed897e0fe53084af60bada
plan_head_after: 5dfecb530782ad37c85777ceb56fc46318d7722f

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - theia/package.json
    - theia/yarn.lock
    - scripts/verify-backend-env-readers.mjs
    - scripts/verify-platform.sh
  deleted:
    - theia/extensions/backend-opencode (13 tracked files)

key-decisions:
  - "RM-01 is not marked complete after 17-01: plans 02-04 carry the rest of the removal surface"

patterns-established: []

requirements-completed: []

metrics:
  started: 2026-10-17T03:52:50Z
  completed: 2026-10-17T06:05:24Z
  duration: "2h13m wall clock (the tool work itself took minutes; the gap falls between the edits and the commit)"
---

# Phase 17 Plan 01: OpenCode Workspace Removal Summary

The backend-opencode workspace member is gone from the index, the disk and node_modules. The
yarn-regenerated lock is committed with it, with exactly the 5-line `@agentclientprotocol/sdk@1.4.0`
stanza removed. A fresh copy of the manifests installs with `--frozen-lockfile` and leaves the lock
unchanged byte for byte.

## Starting point

- Starting HEAD: `6096a815cca8b225ceed897e0fe53084af60bada`
- Pre-flight: nothing staged, no local changes under `theia/` or the two scripts, no sidecar or
  yarn process from this checkout, 13 tracked adapter files, `drivelist.node` present.

## Task results

### Task 1 (tracer): remove the member end to end. Commit A = `5dfecb5`

- `git rm -r` of `theia/extensions/backend-opencode`, then `rm -rf` to clear the ignored `lib/`
  and `tsconfig.tsbuildinfo`.
- `theia/package.json`: deleted the trailing `&& yarn --cwd extensions/backend-opencode build`
  clause (numstat 1/1).
- `scripts/verify-backend-env-readers.mjs`: deleted the `opencode-bridge-env.ts` entry. The
  token-gate entry is unchanged.
- `scripts/verify-platform.sh:4560`: the comment now reads "a one-entry allowlist carrying its".
- `yarn install --ignore-scripts` in `nix develop .#theia` printed "success Saved lockfile.
  Done in 1.94s." Lock numstat is 0 added / 5 deleted, and no other entry moved.
- Leftovers: yarn removed the `@powerbrowser/backend-opencode` symlink and the
  `@agentclientprotocol` directory itself. Assumption A1 held: yarn deleted `drivelist.node`, and
  `node-gyp rebuild` (docs/BUILD.md:59-61) restored it.
- Verify chain: every assertion passed (`VERIFY-OK`).
  - theia-build-order PASS: 7 chain entries equal 7 extension directories.
  - backend-env-readers PASS: "equal the 1-entry allowlist". Its self-test also PASS.
  - verify-upstream-pins PASS. scan-brand-residue PASS (352 files).
  - Commit A does not touch theia/applications, theia/extensions/tab-uris or .gitignore.
- `--quick` (`logs/quick-17-01.log`): it reached the summary, with **114 PASS, 4 FAIL**. All four
  FAIL rows are gui08 rows: `gui08-canvas-geometry`, `gui08-canvas-geometry-self-test`,
  `gui08-panorama-copy` and `gui08-panorama-copy-self-test`. These are expected until Phase 21.

### Task 2: frozen install on a fresh manifest copy (verification only, no commit)

- The copy held `theia/package.json`, `theia/yarn.lock`, `applications/browser/package.json` and
  the seven `extensions/*/package.json`. It contained no backend-opencode manifest.
- `yarn install --ignore-scripts --frozen-lockfile --prefer-offline` printed **"Done in 4.53s."**
  `cmp` showed the copied lock byte-identical to the committed one. `@theia/core` installed, and
  no `@agentclientprotocol` directory was created.

## Deviations from Plan

- **Scratch directory not deleted.** The project's PreToolUse hook blocks recursive deletes outside
  the project, so `rm -rf` of the Task 2 scratch copy was refused. It remains at
  `/tmp/nix-shell.aDyem4/tmp.pV7Gc5xq6G`, outside the tree, and holds only manifests plus a
  node_modules install. Chris can remove it with `rm -rf /tmp/nix-shell.aDyem4/tmp.pV7Gc5xq6G`.
  I did not work around the hook.
- **RM-01 not marked complete.** Plans 02-04 also carry RM-01, so `requirements mark-complete` was
  skipped.

## Follow-ups for other clones (not touched)

The `~/coding/Power-Browser-ng-*` clones and `~/gsd-workspaces/pba/Power-Browser` need the same
on-disk cleanup when they next pull: `rm -rf theia/extensions/backend-opencode` for the ignored
`lib/`, then a `yarn install --ignore-scripts` and a `drivelist` `node-gyp rebuild`.

## Known Stubs

None.

## Self-Check: PASSED

- `theia/extensions/backend-opencode`: absent from `git ls-files` and from disk
- Commit `5dfecb5`: an ancestor of HEAD
- `.planning/phases/17-opencode-removal/logs/quick-17-01.log`: present (git-ignored)
