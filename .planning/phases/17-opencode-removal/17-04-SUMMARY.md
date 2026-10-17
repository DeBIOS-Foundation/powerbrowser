---
phase: 17-opencode-removal
plan: 04
subsystem: verification
tags: [opencode, r33-baseline, quick-gate, ledger-relock, phase-gate]
status: complete

requires:
  - phase: 17-02
    provides: "removal commit B 02fffb6 and the NG-051 drop c3929e9"
  - phase: 17-03
    provides: "planning records free of the OpenCode adapter"
provides:
  - "R33 quick baseline at the post-removal FAIL set (4 gui08 rows)"
  - "check lock re-derived at commit B by Chris; phase gate green"
affects: [21]

actuals:
  tokens: 4300
  tasks: 2
  commits: 2
plan_head_before: 18ce53da9a0fb88f14e304e9bf378cc914909c7b
plan_head_after: 8092428f462dca0e3f6d8580839fd1e4d3f68201

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - docs/non-gui/quick-baseline.txt
    - docs/non-gui/decisions.md
    - ledger/REQUIREMENTS.json
    - ledger/checksums.sha256
    - ledger/history/log.jsonl

key-decisions:
  - "The R33 baseline shrinks from 9 rows to 4: five rows now pass and are gated green from here on"

requirements-completed: [RM-01]

metrics:
  duration: "~20 min across the checkpoint"
  completed: 2026-10-17
---

# Phase 17 Plan 04: Baseline refresh and re-lock Summary

The R33 `--quick` baseline was re-derived from a measured post-removal run, leaving 4 gui08 rows. Every Phase 17 success criterion was swept on one tree. Chris re-locked the check hashes at removal commit B. After commit E, `phase-gate.py` exits 0 with no output.

## Tasks

| Task | Name | Commit |
|------|------|--------|
| 1 | Refresh the quick baseline from a measured run; sweep every success criterion | 196954b3660f552450910869928b8558526b43ae |
| 2 | Chris re-locks at commit B; the agent commits the ledger files | 8092428f462dca0e3f6d8580839fd1e4d3f68201 |

## Measured results

- Base run (`logs/quick-17-04-base.log`): 113 PASS, 4 FAIL, with a summary line.
- Verify run (`logs/quick-17-04.log`): 113 PASS, 4 FAIL. Its FAIL set is identical to the baseline under `cmp`, and `comm -13` printed nothing.
- New baseline: `gui08-canvas-geometry`, `gui08-canvas-geometry-self-test`, `gui08-panorama-copy`, `gui08-panorama-copy-self-test`.
- Rows that left the baseline because they now pass: `ai-opencode-tracer` (the registry row was removed), `gui07-strip-spike-verdict`, `gui08-persistence-roundtrip`, `gui08-persistence-roundtrip-self-test`, `internals-catalogue`.
- Commit A = 5dfecb530782ad37c85777ceb56fc46318d7722f. Commit B = 02fffb6210fda013fe22c0794c3bad92b1daa2c5. A precedes B, and c3929e9 precedes B.
- Success-criteria sweep, all green:
  - No adapter, OpenCode/NG-051 script, adapter doc, `generated/ai-backend.json`, `[ai]` key, schema key, emitter, registry row or REBRANDING `[ai]` heading remains.
  - `generate --check` reports 53 files.
  - `theia/yarn.lock` has no ACP SDK and is unchanged since A.
  - The ai-set check found 12 `@theia/ai-*` entries in each package.json, unchanged from `A^`.
  - No live AI-01..05 requirement line remains.
  - plan-gate passed: 2/2 IDs cited (NG-074, NG-084).
- Pre-relock: phase-gate printed only `locked check missing: scripts/verify-ng-051-backend-off.mjs`, and no `scripts/verify-ng-*` file changed after B.
- Post-relock: the index held exactly the three ledger files when commit E was made. `git status --porcelain -- ledger` is empty, and phase-gate exits 0 with no output.

## Re-lock (blocking-human)

Chris ran `ledger-amend.py lock-checks --commit 02fffb6210fda013fe22c0794c3bad92b1daa2c5` in his own terminal. The agent never ran it or any other amend subcommand.

## Deviations from Plan

None in substance. One hook interaction: `git -C <repo> add ledger/...` was blocked because the hook allows `git add` only as the leading tokens. Re-running it as plain `git add ...` from the repo root passed. No ledger content was affected.

## Self-Check: PASSED

- docs/non-gui/quick-baseline.txt and docs/non-gui/decisions.md: present
- 196954b and 8092428 are ancestors of HEAD
