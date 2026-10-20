---
phase: 19-node-24-react-19-theia-1-76-0
plan: 07
subsystem: ledger close-out for Theia 1.76.0 (NG-086 close, Chris's re-lock, telemetry acknowledgement, packaged Node answer)
tags: [UPD-09, UPD-10, NG-086, NG-074, NG-084, ledger, lock-checks]
status: complete
requires: [19-06]
provides:
  - "NG-086 done with evidence naming commit 3 (2700e4c) and the full run at dfef881"
  - "check_locks re-derived by Chris at e0fbf8b; it now covers scripts/verify-ng-086-theia-react-node.mjs"
  - "Chris's telemetry acknowledgement and his packaged-Node answer, quoted below"
  - "One open gap for /gsd-plan-phase 19 --gaps: move the packaged Node runtime pin to Node 24"
affects: [19-gaps, 999.2]
tech-stack:
  added: []
  patterns: []
key-files:
  created:
    - .planning/phases/19-node-24-react-19-theia-1-76-0/19-07-SUMMARY.md
  modified:
    - ledger/REQUIREMENTS.json
    - ledger/checksums.sha256
    - ledger/history/log.jsonl
decisions:
  - "Chris acknowledged the telemetry decision: PowerBrowser's telemetry.telemetryLevel registration (initSchema, then updateSchemaProperty) keeps winning, with the default off"
  - "Chris accepted moving the packaged Node runtime now rather than deferring to 999.2; it is recorded as a gap and node-runtime.json is unchanged in this plan"
metrics:
  duration: ~30m (including the wait for Chris)
  completed: 2026-10-17
  tasks: 2
  files: 3
estimate_ref: {tokens: 20000, tasks: 2}
actuals:
  tokens: 5100
  tasks: 2
  commits: 2
commits: 2
plan_head_before: a0f00bf637cf10d2b60ccdbb98673efadc4276a0
plan_head_after: 5db8a801c97033e1e82599952b3d9e374d615f5e
---

# Phase 19 Plan 07: NG-086 closed, check hashes re-locked by Chris Summary

NG-086, the Theia 1.76.0 / React 19.2.8 / Node 24 row, is now done. Its evidence names commit 3 and the full run. Chris re-locked the check hashes in his own terminal at e0fbf8b, so `check_locks` now covers the NG-086 check file. phase-gate exits 0 with no output. Chris acknowledged the telemetry decision. He chose to accept the packaged Node runtime move now instead of deferring it. That move is recorded below as a gap, and the pin itself is unchanged.

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Close NG-086 with its evidence | e0fbf8b | the three ledger files |
| 2 | Chris re-locks, acknowledges telemetry, answers on the Node pin; agent commits the lock | 5db8a80 | the three ledger files |

## Task 1

- `node scripts/verify-ng-086-theia-react-node.mjs`: `ng086-theia-react-node: PASS -- 56 @theia packages at 1.76.0 (@theia/monaco-editor-core excepted at 1.108.201); react 19.2.8 satisfies ^19.0.0; react-dom 19.2.8 satisfies ^19.0.0; @types/react 19.2.18 satisfies ^19.0.0; @types/react-dom 19.2.7 satisfies ^19.0.0; Node 24 (flake.nix nodejs_24) meets engines.node >=24`
- The check file has one commit in its history, 85d80a54dce4e25c488ca3a2676e154bcafc5743 from 19-02. This means the bytes that record-fail hashed are the bytes Chris locked.
- The evidence set on NG-086: "2700e4c (commit 3): ng086-theia-react-node PASS after its recorded red; diff-theia-core, first-boot-surface fresh and carried, side02-token-negative and -positive PASS in the full run at dfef881; .planning/phases/19-node-24-react-19-theia-1-76-0/19-FAILSET-1.76.txt holds owned reds only"
- set-status open to done is history v377. The phase-set entry from 19-05 is v373.
- Verify: phase-gate printed nothing and exited 0. plan-gate printed `plan gate passed: 2/2 IDs cited (phase 19)`.
- The ledger report after the close: 86 rows, done=53, deferred-approved=9, dropped=24, due=0.

## Task 2: Chris's answers (quoted)

**1. Re-lock.** Chris ran this command in his terminal, with no error. His pasted line, verbatim:

> python3 scripts/ledger-amend.py --root . lock-checks --commit e0fbf8b97196dc715ff8a728640223686c1b3b5b

The agent never ran the lock. The result is history v378, `op: lock-checks`, commit e0fbf8b. The new lock set is the previous set plus `scripts/verify-ng-086-theia-react-node.mjs` at sha256 `9e20680687870a8850cf98b6b14c090c476721ddc19b7f3cd576b1d16c7f4646`. ledger/REQUIREMENTS.json now names the file twice: the test_ref at line 1115 and the lock entry at line 1183. The index held exactly the three ledger files when commit 5db8a80 was made.

**2. Telemetry (UPD-10, success criterion 5).** Chris chose:

> telemetry ok (Recommended)

This keeps the current behavior. PowerBrowser's `telemetry.telemetryLevel` registration wins in every module order, because it registers through `initSchema` and then `updateSchemaProperty`. No Theia code is patched, the default stays `off`, and Settings shows PowerBrowser's description. The telemetry code was not changed.

**3. Packaged Node runtime pin.** Chris chose:

> node-runtime accept

He did not take the recommended deferral to 999.2. As the plan requires, powerbrowser/packaging/node-runtime.json was not edited in this checkpoint (`git diff --quiet HEAD -- powerbrowser/packaging/node-runtime.json` succeeds). The move is the open gap below.

## Open gap for `/gsd-plan-phase 19 --gaps`: packaged Node runtime to Node 24

These are the facts the gap plan needs:

- **File:** `powerbrowser/packaging/node-runtime.json`
- **Current pin:** target `linux-x64` (the only target), `version: "v22.23.2"`, `url: "https://nodejs.org/dist/v22.23.2/node-v22.23.2-linux-x64.tar.xz"`, `sha256: "d60acfe00a2932254bb0ad20e01b0d74397a0875595de719654b214f4b03f307"`
- **Required major:** Node 24. Theia 1.76.0 requires Node 24 or later, all extension manifests declare `engines.node >=24`, and the dev shell is on `nodejs_24` in flake.nix. The exact 24.x patch release is for Chris and the gap plan to choose. It must be a release whose SHASUMS256.txt Chris has verified.
- **Procedure:** docs/RELEASING.md, the dependency re-pin paragraph (around lines 758-765). It says: "The Node runtime shipped inside the package is pinned by version and sha256 per target in `powerbrowser/packaging/node-runtime.json`; changing it is a re-release, not an edit, and the new sha256 comes from a GPG-verified `SHASUMS256.txt`."
- **What Chris must supply:** the chosen v24.x version, plus the `node-v24.x.y-linux-x64.tar.xz` sha256 taken from that release's `SHASUMS256.txt`, which he has verified himself against the Node.js release signing keys with GPG. The agent must not fetch and trust a sha on its own. Chris's GPG step is a blocking-human checkpoint in the gap plan, and node-runtime.json is edited only after it.
- **Checks the gap plan should run:** the packaged-launch row (NG-063, `scripts/verify-ng-063-packaged-launch.mjs`, which is locked; do not edit it), the brand scan and phase-gate.

## Verification

Task 2 `<verify>`, run after commit 5db8a80:

- `python3 scripts/phase-gate.py --root .`: exit 0, no output
- NG-086 check file history: 1 commit
- `plan gate passed: 2/2 IDs cited (phase 19)`
- `git diff --quiet HEAD -- powerbrowser/packaging/node-runtime.json`: succeeds
- `node scripts/scan-brand-residue.mjs`: `PASS -- no residual brand occurrence in 349 scanned file(s)`, exit 0
- `git status --porcelain -- ledger`: empty

`--quick` was not run, because this plan changed only ledger files.

NG-074 and NG-084 are still deferred-approved and carried. This plan does not close them.

## Deviations from Plan

None. The plan executed as written. Chris's `node-runtime accept` takes the plan's documented gap branch, not the recommended deferral.

## Self-Check: PASSED

- FOUND: commit e0fbf8b (Task 1), an ancestor of HEAD
- FOUND: commit 5db8a80 (Task 2), an ancestor of HEAD
- FOUND: the verify-ng-086 lock entry in ledger/REQUIREMENTS.json (line 1183)
- FOUND: .planning/phases/19-node-24-react-19-theia-1-76-0/19-07-SUMMARY.md
