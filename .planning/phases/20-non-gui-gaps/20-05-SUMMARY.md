---
phase: 20-non-gui-gaps
plan: 05
subsystem: verification
tags: [theia, build, fresh-clone, ledger, docs]
status: complete
requires:
  - phase: 20-non-gui-gaps
    provides: "20-01..20-04 committed code (generator concurrency, planning paths, group-channel row, NG-087/088)"
provides:
  - "theia-fresh-clone-build and theia-fresh-clone-build-self-test full-tier rows (PLAT-01)"
  - "G-14.1.1-9 closed with resolving hashes; GUI-DEFECTS item 11 CONFIRMED FIXED"
  - "docs/BUILD.md Tier 1 startup-cache / -purgecaches rule"
  - "Chris's re-lock of the check hashes at facaba2, committed (PLAT-03 approval complete)"
affects: [phase-21, ci-verify-workflow]
tech-stack:
  added: []
  patterns:
    - "Full-tier row reads its command from the CI workflow at check time, so local and CI cannot drift"
    - "Plant mode that refuses (exit 3) outside a fresh-clone-verify clone and restores files from saved bytes, never via git"
key-files:
  created:
    - scripts/verify-theia-fresh-clone-build.sh
  modified:
    - scripts/verify-platform.sh
    - docs/BUILD.md
    - .planning/milestones/v1.3-phases/14.1.1-gui-conformance-sweep/14.1.1-UAT.md
    - .planning/GUI-DEFECTS.md
    - .planning/research/FEATURES.md
    - CLAUDE.md
    - ledger/REQUIREMENTS.json
    - ledger/checksums.sha256
    - ledger/history/log.jsonl
decisions:
  - "The clean-checkout proof is a fresh clone of committed HEAD running the CI install-and-build run: value verbatim; rm -rf lib is not used because tsc -b trusts the tsbuildinfo outside lib/"
  - "No generate.mjs prefix: the clone build passed without generated/ (assumption A3 held)"
metrics:
  duration: "about 75 min including the checkpoint wait"
  completed: 2026-10-17
estimate:
  tokens: 40000
  tasks: 3
actuals:
  tokens: 3400
  tasks: 3
  commits: 5
plan_head_before: e0c15e61c0b38fdd824671b9cfe1539c37ccf820
plan_head_after: 258b27634bf4eaa44b68dd51cf853ef97d8248ac
---

# Phase 20 Plan 05: Fresh-clone Theia build, G-14.1.1-9 closure, re-lock Summary

A full-tier `theia-fresh-clone-build` row clones committed HEAD and runs CI's "Install and build the Theia workspace" step verbatim. It PASSED at b528590 in 30 s. Its self-test shows it red on a spaced TMPDIR, a missing CI step, and three planted build faults (P1-P3). G-14.1.1-9 is closed in every record with resolving hashes. BUILD.md carries the `-purgecaches` rule. Chris's check-hash re-lock is committed.

## Tasks

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | Fresh-clone build script, two full-tier rows, PASS at the final code HEAD, self-test red on every plant | b528590 |
| 2 | Close G-14.1.1-9, correct the chain records, add the -purgecaches line to BUILD.md | facaba2 |
| 3 | Chris re-locks the check hashes; ledger commit; CLAUDE.md:145 path fix | 44e44fb (ledger), 258b276 (CLAUDE.md) |

**Final code HEAD:** b52859045a477a94151bbd77a01379ca861232ae (b528590). No fix commits were needed after the first runs.

## Evidence (git-ignored logs under .planning/phases/20-non-gui-gaps/logs/)

`fresh-clone-20-05.log`:

```
$ yarn --cwd extensions/branding build && yarn --cwd extensions/token-gate build && yarn --cwd extensions/tab-uris build && yarn --cwd extensions/customize build && yarn --cwd extensions/telemetry build && yarn --cwd extensions/modes build && yarn --cwd extensions/chrome-bar build
Done in 16.73s.
fresh-clone-verify: ok
theia-fresh-clone-build: PASS -- fresh clone of b528590 ran the CI install-and-build step (frozen install, drivelist, yarn build) in 30s
  theia-fresh-clone-build: PASS
PHASE20_WALL_SECONDS=30
PHASE20_EXIT=0
```

`fresh-clone-self-test-20-05.log`:

```
plant TMPDIR-space: red
plant step-removed: red
plant P1: red naming @powerbrowser/token-gate/lib/node/powerbrowser-env
plant P2: red naming @powerbrowser/tab-uris/lib/browser/browser-tab-uri
plant P3: red naming web-tab.css
theia-fresh-clone-build-self-test: in-clone PASS -- baseline green, 3 plants red
fresh-clone-verify: ok
theia-fresh-clone-build-self-test: PASS -- TMPDIR and workflow guards red; baseline green; P1, P2, P3 red
PHASE20_WALL_SECONDS=69
PHASE20_EXIT=0
```

`quick-20-05.log`: 128 PASS. The FAILs are exactly the 4 gui08 rows in `docs/non-gui/quick-baseline.txt`, so the R33 gate is clean (wall time 66 s).

Plant-mode refusal: run from a mktemp dir, `--plant-in-clone` printed `REFUSED -- --plant-in-clone runs only at the root of a fresh-clone-verify clone ...` and exited 3.

## Checkpoint replies (Task 3)

1. Re-lock. Chris ran this in his own terminal (his pasted line, verbatim): `python3 scripts/ledger-amend.py --root . lock-checks --commit facaba2a1ce09f9bb09bbc4e6f1e1b037c188e57`. It printed no error. Treated as "relocked". The agent never ran it.
2. CLAUDE.md: Chris chose "claude-md ok (Recommended)". Line 145 now cites `.planning/milestones/v1.0-phases/01-platform-extraction-and-rename/01-UI-SPEC.md`. That was the only change (258b276).

After the lock:
- The index held exactly the three ledger files at 44e44fb.
- `grep -n 'verify-ng-08[78]-' ledger/REQUIREMENTS.json` shows each file's test_ref line (1128, 1141) and its check_locks entry (1210, 1211).
- `git status --porcelain -- ledger` is empty.
- phase-gate and check-ledger print nothing.
- `plan gate passed: 2/2 IDs cited (phase 20)`.
- The residue scan and planning-paths pass.

## Deviations from Plan

None in the code. Process notes:
- The `commits: 5` count is measured from `plan_head_before..plan_head_after`. It includes cabb60e (`docs(21): ...`), a commit by the concurrent Phase 21 session. This plan made 4 of the 5 commits: b528590, facaba2, 44e44fb and 258b276.
- The ledger hook refuses `git -C <repo> add ledger/...`. The plain `git add` from the repo cwd was used instead.
- The script is mode 100644, like the plan's row form (`bash <script>`).

## Leftovers

These empty mktemp dirs come from the plant-mode refusal checks. A hook blocks removing them:
- /tmp/nix-shell.aDyem4/tmp.ddeCctRJR4
- /tmp/nix-shell.aDyem4/tmp.1tLCPGxCSw

No `fresh-clone-verify-*` clone dirs remain.

## Known Stubs

None.

## Not covered

- The P2 and P3 plants require a non-zero build exit plus the expected text in the output. They do not isolate the exact error line.
- The FEATURES.md "Acceptance" bullet still mentions "after deleting every theia/extensions/*/lib", which lies outside the lines the plan scoped.
- NG-074 (CI green on main) and NG-084 stay deferred-approved and carried. Pushing is Chris's.

## Self-Check: PASSED

- FOUND: scripts/verify-theia-fresh-clone-build.sh
- FOUND (ancestors of HEAD): b528590, facaba2, 44e44fb, 258b276
