---
phase: 23-modes-leftovers-and-sketch-005-verdict
plan: 02
subsystem: theia/extensions/modes
status: complete
tags: [modes, setups, quick-input, name-cap, G-23, MODE-02]
requires: []
provides:
  - "inputCappedName: stock createInputBox() with an onDidChangeValue cut at max"
  - "modes-name-cap-at-input (--quick) and its --self-test with nine plants"
  - "modes-name-cap-at-input-live (full tier) with a stock-input probe control"
affects: [ng-035-custom-mode-saves-layout, ng-036-setup-records-dock-layout, 14-UI-SPEC]
tech-stack:
  added: []
  patterns: ["QuickInputService.createInputBox() + onDidChangeValue cut, mirroring stock QuickInputController.input()"]
key-files:
  created:
    - theia/extensions/modes/src/browser/capped-name-input.ts
    - scripts/verify-name-cap-at-input.mjs
    - scripts/verify-name-cap-at-input-live.mjs
  modified:
    - theia/extensions/modes/src/browser/mode-service.ts
    - theia/extensions/modes/src/browser/setups-service.ts
    - scripts/verify-platform.sh
    - scripts/verify-ng-035-custom-mode-layout.mjs
    - scripts/verify-ng-036-setup-dock-layout.mjs
    - .planning/milestones/v1.3-phases/14-modes-windows-setups/14-UI-SPEC.md
decisions:
  - "Save as Mode and Save Setup cut names at 60 while typing through inputCappedName (G-23); the commit-time .trim().slice(0, MAX) stays as a backstop"
  - "The live accept path is MonacoQuickInputImplementation.accept(); ng-035 and ng-036 reuse it"
requirements: [MODE-02, NG-074, NG-084]
metrics:
  completed: 2026-10-18
  tasks: 3
estimate:
  tokens: 60000
  tasks: 3
actuals:
  tokens: 9169
  tasks: 3
  commits: 13
plan_head_before: df66816491c4bfd9db81a3af8c2362995bb9a190
plan_head_after: 5a5606c3b8ca5486ab0168315ae8dc33cc1cac31
---

# Phase 23 Plan 02: Mode and setup names cut at 60 while typing Summary

Save as Mode and Save Setup now use a stock `createInputBox()` with an `onDidChangeValue` cut, so neither field ever holds more than 60 characters (G-23, MODE-02). 14-UI-SPEC states the rule, a `--quick` check derives it from the code and the spec, and a live row proves it on a rebuilt sidecar. No new user-facing string.

## Commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 | 8b7f484 | feat(23-02): cut Save as Mode and Save Setup names at 60 while typing, with a live row (G-23, MODE-02) |
| 2 | ea5301d | test(23-02): 14-UI-SPEC states the cut-while-typing name rule, and modes-name-cap-at-input derives it (G-23) |
| 2 | 58fa9cb | test(23-02): ng-035 and ng-036 answer the capped name input instead of stubbing quickInput.input (G-23) |
| 3 | 5a5606c | chore(23): record Chris's re-lock of the check hashes at 58fa9cb (committed by the orchestrator) |

`git show --stat` lists exactly five files for 8b7f484, three for ea5301d, two (the ng files) for 58fa9cb, and the three ledger files for 5a5606c.

**Commit-count note.** `git rev-list --count df66816..HEAD` measures 13. Only the four commits above belong to this plan. The other nine landed in the range from a parallel Phase 22 session: the 8 review-fix commits 6c9181b..e17793b (CR-01, CR-02, WR-01 to WR-06) and 234db4f `docs(22): security 23/23, validation, review ...`. They are not this plan's commits.

## Task 1: helper, call sites, live row

- Build (`yarn build` in `nix develop .#theia`), `logs/build-23-02.log`: `PHASE23_WALL_SECONDS=11`, `PHASE23_EXIT=0`.
- Live run (`PB_VERIFY_PORT=3939 scripts/verify-platform.sh --only modes-name-cap-at-input-live`), `logs/name-cap-live-23-02.log`: `PHASE23_WALL_SECONDS=30`, `PHASE23_EXIT=0`. Detail lines, verbatim:

```
modes-name-cap-at-input-live: Save as Mode: 70 characters read back as 60; the mid-string insert kept the first 60; stored name ["abcdefghijklmnopqrstuvwxyzABCDZEFGHIJKLMNOPQRSTUVWXY01234567"]
modes-name-cap-at-input-live: Save Setup: 70 characters read back as 60; the mid-string insert kept the first 60; stored name ["abcdefghijklmnopqrstuvwxyzABCDZEFGHIJKLMNOPQRSTUVWXY01234567"]
modes-name-cap-at-input-live: accept path: MonacoQuickInputImplementation.accept()
modes-name-cap-at-input-live: probe control: the stock uncapped input held 70 characters
modes-name-cap-at-input-live: PASS
```

- **Accept path used:** `MonacoQuickInputImplementation.accept()`. The keydown-Enter fallback was not needed.
- Both call sites keep their `{ prompt, placeHolder }` object literals byte-identical, and both `.trim().slice(0, MAX)` backstops remain.

## Task 2: spec, static check, ng rows, quick gate

- 14-UI-SPEC: the named-setups Save bullet, the custom-modes bullet and the E2 long-text row now state the cut-while-typing rule. No Copywriting Contract row changed.
- `node scripts/verify-name-cap-at-input.mjs --self-test`, verbatim (re-run at SUMMARY time):

```
  ok  1 mode save back on quickInput.input( -> red, naming /saveCurrentAsMode does not call inputCappedName/
  ok  2 a 60 literal at the setup call -> red, naming /saveCurrentAsSetup passes the literal 60/
  ok  3 MODE_NAME_MAX passed in setups -> red, naming /saveCurrentAsSetup passes the other constant MODE_NAME_MAX/
  ok  4 the helper slice removed -> red, naming /helper inputCappedName lacks \.slice\(0, max\)/
  ok  5 MODE_NAME_MAX = 61 -> red, naming /caps disagree: MODE_NAME_MAX = 61/
  ok  6 the E2 row cap set to 80 -> red, naming /caps disagree: .*the E2 long-text row = 80/
  ok  7 "while typing" removed from the Save bullet -> red, naming /named-setups Save bullet .* does not say "while typing"/
  ok  8 saveCurrentAsMode renamed -> red, naming /derived ZERO: .* no saveCurrentAsMode body \(missing anchor\)/
  ok  9 an extra quickInput.input( in another modes file -> red, naming /quick-input \.input\( call remains .*group-model\.ts/
modes-name-cap-at-input --self-test: PASS -- baseline green and all nine plants went red naming their drift
```

- ng-035, `logs/ng035-23-02.log` (`PHASE23_WALL_SECONDS=34`, `PHASE23_EXIT=0`): `  ng-035-custom-mode-saves-layout: PASS`
- ng-036, `logs/ng036-23-02.log` (`PHASE23_WALL_SECONDS=28`, `PHASE23_EXIT=0`): `  ng-036-setup-records-dock-layout: PASS`
- Wave-1 `--quick`, `logs/quick-23-02.log` (`PHASE23_WALL_SECONDS=55`, `PHASE23_EXIT=0`): **134 PASS, 0 FAIL**, `verify-platform: PASS -- all checks passed`. `docs/non-gui/quick-baseline.txt` is 0 bytes. The log's mtime is later than 58fa9cb.
- **Lock status.** After the ng commit, phase-gate reported the two ng check files as changed, which means they are hash-locked, so Task 3 ran. That pre-re-lock phase-gate output was not saved to a log, so this SUMMARY cannot quote it verbatim.

## Task 3: Chris's re-lock

Chris ran the lock command in his own terminal. He pasted this line twice, and it printed no error:

```
python3 scripts/ledger-amend.py --root . lock-checks --commit 58fa9cb5a53d0961901f6bce82a7d3cb77f3b39c
```

The orchestrator then committed the three ledger files as 5a5606c. Its subject reads `chore(23): ...` and not `chore(23-02): ...` as the plan specified. The agent never ran the lock command.

Task 3 `<verify>`, run after 5a5606c: phase-gate printed nothing, check-ledger printed nothing, the last commit touching each ng file is 58fa9cb `(23-02)`, `NG-035  done`, `NG-036  done`, and `plan gate passed: 2/2 IDs cited (phase 23)`. Exit 0.

## Deviations from Plan

- The ledger commit subject is `chore(23): record Chris's re-lock of the check hashes at 58fa9cb`, not `chore(23-02): ...`. The orchestrator made that commit, and it was left as is (no `--amend`).
- The pre-re-lock phase-gate output required by Task 2 acceptance was not recorded verbatim (see Task 2).

Otherwise the plan ran as written.

## Known Stubs

None. The caret moves to the end after a cut. This is recorded as a `shortcut:` comment in `capped-name-input.ts` (23-UI-SPEC A1) and is not a stub.

## Self-Check: PASSED

- Files present: capped-name-input.ts, verify-name-cap-at-input.mjs, verify-name-cap-at-input-live.mjs, and all five logs.
- Commits 8b7f484, ea5301d, 58fa9cb and 5a5606c are ancestors of HEAD.
