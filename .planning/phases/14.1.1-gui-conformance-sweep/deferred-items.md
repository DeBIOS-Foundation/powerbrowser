# Deferred Items — Phase 14.1.1

Out-of-scope discoveries logged during execution. Nothing here was fixed; each is
recorded so it surfaces in `audit-open`, `audit-uat` and `complete-milestone`.

## Deferred Items

- `verify-platform.sh --quick` is red on `ai-opencode-tracer` and `ai-opencode-presets`
  status: open
  **What:** Both rows fail through `scripts/diff-theia-core.sh --quick`, whose stage 1 is
  `yarn check --integrity` in `theia/`. Outside `nix develop .#theia` the stage aborts with
  `yarn: command not found`; inside the dev shell it aborts with
  `warning Integrity check: Flags don't match / error Integrity check failed`.
  **Why out of scope (14.1.1-08):** pre-existing and unrelated to this plan. Proven by
  experiment: temporarily removing the `@powerbrowser/token-gate` entry this plan added to
  `theia/extensions/tab-uris/package.json` and re-running the integrity check produces the
  identical `Flags don't match` failure, so the mismatch is a property of how
  `theia/node_modules` was installed (different install flags recorded in
  `.yarn-integrity`), not of any manifest this plan edited. A manifest-caused mismatch would
  read `Top level patterns don't match`, not `Flags don't match`.
  **Next step:** re-run `yarn install` in `theia/` inside `nix develop .#theia` from a
  quiet tree, then confirm `scripts/verify-platform.sh --quick` ends
  `verify-platform: PASS -- all checks passed`. Not done here because a concurrent session
  is serving a running sidecar out of `theia/**/lib` and `theia/node_modules`.
  **Still open at 14.1.1-06 (2026-09-08), with the symptom shifted:** the run now ends red on
  `ai-opencode-presets` ALONE — `ai-opencode-tracer` passes — and the integrity stage inside
  `nix develop .#theia` now reads `Top level patterns don't match` rather than `Flags don't
  match`. Same check, same next step. 14.1.1-06 changed one standalone script that
  `diff-theia-core.sh` never reads, so it is not the cause, and the plan forbids every build
  step `yarn install` would be.
  **Still open at 14.1.1-07 (2026-09-08), symptom shifted back:** BOTH rows are red again
  (`ai-opencode-tracer` and `ai-opencode-presets`), through the same `diff-theia-core.sh
  --quick` stage, which now reports `Git tree ... is dirty` alongside the same `Top level
  patterns don't match`. The dirty tree is the concurrent session's in-flight phase-14 work,
  not this plan's: 14.1.1-07 changed one standalone script `diff-theia-core.sh` never reads.
  Same next step, still forbidden by this plan's no-build constraint.

- The literal clean-checkout `yarn build:extensions` was not run
  status: open
  **What:** `G-14.1.1-9`'s root cause suggests proving the fix by removing
  `theia/extensions/*/lib` and running `yarn build:extensions`.
  **Why out of scope (14.1.1-08):** the plan forbids it. Running it would delete the `lib`
  trees a concurrent session's running sidecar is served from, and would compile that
  session's uncommitted TypeScript into them. `scripts/verify-theia-build-order.mjs` proves
  the ordering and declaration invariants the build depends on instead.
  **Next step:** pass 3 runs the clean-lib build from a quiet tree. `G-14.1.1-9` is flipped
  to `in_tree` by plan 10, never to `fixed`.

- `.planning/WINDOWS.md` rejects appends
  status: open
  **What:** `gsd-tools windows append` refuses both entries above with
  `Ledger table ... disagrees with the fenced JSON entries (the sole source of truth) for
  row id(s): 10`.
  **Why out of scope (14.1.1-08):** pre-existing hand edit to the rendered table, in a file
  this plan does not own. Ledger population is best-effort and never blocks execution.
  **Next step:** reconcile row 10 in the fenced JSON block, then re-append the two items
  above with `--kind unrun-verify --phase 14.1.1`.
