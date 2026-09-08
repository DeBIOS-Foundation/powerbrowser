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
  **Still open at 14.1.1 pass 3 (2026-09-08, plan 14.1.1-16), symptom unchanged from
  14.1.1-07:** `scripts/verify-platform.sh --quick` run at this commit prints 110 summary
  rows, 108 PASS and exactly two FAIL — `ai-opencode-tracer` and `ai-opencode-presets`. No
  pass-3 plan added or removed a `--quick` row (the registry count was 110 before pass 3,
  per 14.1.1-VERIFICATION.md's own re-run, and is 110 now). Next step unchanged: a
  quiet-tree `yarn install` in `theia/` inside `nix develop .#theia`.

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
  **Still open at 14.1.1 pass 3 (2026-09-08, plan 14.1.1-16), symptom unchanged:** pass 3
  did not run it either — the tree is still not quiet (`git status --porcelain` at this
  commit shows the concurrent session's `theia/extensions/modes/src/browser/*.ts` and
  `tab-uris/src/node/tab-query-service.ts` edits uncommitted, and `yarn` is forbidden to
  every pass-3 plan). `G-14.1.1-9` reads `status: in_tree` with its `not_fixed_because`
  at this commit (`grep -A3 'gap_id: G-14.1.1-9$' 14.1.1-UAT.md`). The build-order gate
  it leans on gained a plant for side-effect imports in pass 3 (plan 14.1.1-13, commit
  051f70b) and its `--self-test` is PASS with all eight plants red. Next step unchanged:
  from a quiet tree, `rm -rf theia/extensions/*/lib` then `yarn build:extensions` inside
  `nix develop .#theia`, then flip G-14.1.1-9 to `fixed` on that run's evidence.

- `.planning/WINDOWS.md` rejects appends
  status: open
  **What:** `gsd-tools windows append` refuses both entries above with
  `Ledger table ... disagrees with the fenced JSON entries (the sole source of truth) for
  row id(s): 10`.
  **Why out of scope (14.1.1-08):** pre-existing hand edit to the rendered table, in a file
  this plan does not own. Ledger population is best-effort and never blocks execution.
  **Next step:** reconcile row 10 in the fenced JSON block, then re-append the two items
  above with `--kind unrun-verify --phase 14.1.1`.
  **Still open at 14.1.1 pass 3 (2026-09-08, plan 14.1.1-16), symptom unchanged:** no
  pass-3 plan touched `.planning/WINDOWS.md`, so the row-10 disagreement stands and the
  pass-3 deferrals below are written here rather than appended through
  `gsd-tools windows append`. Next step unchanged, with the list to re-append now four
  entries longer (the four below).

- The `verify-web-tab-live.mjs` plant reds are behaviour-unverified (three items)
  status: open
  **What:** Three `--self-test` reds that pass 2 and pass 3 designed but never observed,
  because the check needs the built binary, a display and a BiDi session, and reads
  `theia/**/lib`: (1) `hide-not-published` red naming `thumbnail:` with the clean control
  green (G-14.1.1-6, plan 14.1.1-06); (2) `focus-keyed-pill` red naming `pill:` and green
  on `push:`, and `state-ignored` red naming `push:` — disjoint reds (G-14.1.1-20, plan
  14.1.1-07); (3) the new `close-ignored` plant red naming `close:` with at least one of
  the three absence assertions among its messages (advisory 3, plan 14.1.1-14, commit
  3675439). The first two are 14.1.1-VERIFICATION.md's `behavior_unverified_items`,
  carried forward unchanged.
  **Why out of scope (14.1.1-16):** every pass-3 plan forbade running
  `scripts/verify-web-tab-live.mjs`, and the tree is not quiet — a run here would measure
  the concurrent session's uncommitted `theia/**/lib`. The only executable evidence taken
  in pass 3 is `node --check scripts/verify-web-tab-live.mjs`, exit 0 at this commit.
  **Next step:** from a quiet tree with a display,
  `node scripts/verify-web-tab-live.mjs --self-test`, and read the three named cases.

- The broken-instrument scoring filter may surface a plant that was never evidence
  status: open
  **What:** A prediction to check, not a defect claimed. Plan 14.1.1-14 (commit 8c3a289)
  made the self-test refuse to credit a plant on any message carrying
  `BROKEN_INSTRUMENT_MARKER` and fail by name when a case's only in-family messages carry
  it. If a case now fails with that message, the plant was only ever being credited by a
  guard, never by a contract assertion. `no-geometry` on `align:` is the reasoned
  candidate: `align:`'s no-pair-measured guard is a broken-instrument report
  (`scripts/verify-web-tab-live.mjs:1436`).
  **Why out of scope (14.1.1-16):** it can only be observed by the live run above, which
  pass 3 may not perform.
  **Next step:** in the same quiet-tree `--self-test` run, look for the message
  `named '...' only through broken-instrument reports`. If it fires, the remedy is a real
  contract plant for that family — never a reverted or loosened scorer.

- `nav:`, `walk:` and `shell:` still carry no plant
  status: open
  **What:** Three of the fifteen failure families in `scripts/verify-web-tab-live.mjs`
  have no `--self-test` plant demonstrating they can go red. The file states each reason
  itself (`:1299-1308`, plan 14.1.1-14): `nav:` and `walk:` need a plant keyed on the
  modes extension's runtime shape, and `mode-service.ts`, `group-actor-client.ts` and
  `main-area-exemption.ts` were held uncommitted by a concurrent session when the other
  plants were added; `shell:` asserts that the launched binary printed its ready sentinel
  to stdout, which no page-realm plant can suppress.
  **Why out of scope (14.1.1-16):** the first two are blocked by the same held files at
  this commit (`git status --porcelain` still shows `mode-service.ts` and
  `group-actor-client.ts` as modified-unstaged and `main-area-exemption.ts` as
  added-staged); the third has no
  plant mechanism available in the file's realm.
  **Next step:** from a quiet tree, plant `nav:` and `walk:` against the settled modes
  extension; for `shell:`, either accept it as an instrument precondition (documented as
  such) or add a launch-level plant outside the page realm.

- `G-14.1.1-8`, `-10`, `-23` and the `14-UAT.md` half of `-27` remain held
  status: open
  **What:** Four gaps whose fixes live in files the concurrent session holds uncommitted.
  Confirmed at write time, `git status --porcelain` read 2026-09-08T10:04:44Z:
  added-staged `.planning/milestones/v1.3-phases/14-modes-windows-setups/14-UAT.md`;
  modified-unstaged `theia/extensions/modes/src/browser/group-actor-client.ts`,
  `theia/extensions/modes/src/browser/mode-service.ts` and
  `theia/extensions/tab-uris/src/node/tab-query-service.ts`. Each gap still carries its
  `deferred_to:` line in `14.1.1-UAT.md` (G-8 `in_tree`, G-10 `open`, G-23 `open`, G-27
  `open` with `half_landed`). Held is not failed.
  **Why out of scope (14.1.1-16):** no pass-3 plan may stage, commit or edit a file
  another session holds; the fixes cannot land on half a settled tree.
  **Next step:** once that session commits those four files, plan a pass 4 that closes
  each gap on the settled file and flips its status on that commit's evidence.

- Markdownlint MD060 table-column-style warnings on `.planning/GUI-DEFECTS.md` separator rows (lines 20, 29, 46)
  status: open
  **What:** pre-existing `|---|---|` separator rows lack the compact-style spacing; cosmetic, not introduced by 14.1.1-13, whose item 11 edit sits at line 47.
