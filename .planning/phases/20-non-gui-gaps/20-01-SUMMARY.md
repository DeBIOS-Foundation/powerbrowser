---
phase: 20-non-gui-gaps
plan: 01
subsystem: generator
tags: [generate.mjs, inkscape, dbus, fixture-harness, concurrency, PLAT-04]
status: complete

requires:
  - phase: 19
    provides: Node 24 tree and the phase 19 verifier red ("restored generated/ hashes differ") this plan explains
provides:
  - RASTER_ENV at the one inkscape spawn (DBUS_SESSION_BUS_ADDRESS=disabled:)
  - generate.mjs --out <dir>
  - a fixture harness that never reads or writes generated/
  - four concurrent-raster self-test cases and two harness isolation plants
affects: [20-02, 20-03, 20-04, 20-05, every later --quick]

actuals:
  tokens: 8692
  tasks: 3
  commits: 3
plan_head_before: 8529bfa69032a99a0c8901f1e1face2dc4e10732
plan_head_after: 9562e54a492be7402d5c0376bd0fac14a4b5d886

tech-stack:
  added: []
  patterns:
    - "A self-test that reads its own file text to prove a spawn site passes a guarded env (brace-matched options object; the needle is assembled at runtime so only the real site carries it)"
    - "Checks generate into a private --out dir; the shared generated/ tree is written only by a bare generate run"

key-files:
  created: []
  modified:
    - scripts/generate.mjs
    - scripts/verify-downstream-fixture.mjs
    - scripts/verify-platform.sh
    - docs/non-gui/decisions.md

key-decisions:
  - "PLAT-04 closes as reproduced and fixed: cause A (inkscape session-bus abort) and cause B (harness rewrote shared generated/) are both fixed and guarded by self-tests"
  - "--out is a flag, never an env var, and is refused with --check or --self-test, so generate-check always compares generated/"
  - "The harness's default comparand is generated once per invocation into a private mkdtemp, removed at process exit"

requirements-completed: [PLAT-04]

duration: ~75min
completed: 2026-10-17
---

# Phase 20 Plan 01: Generator Concurrency Summary

PLAT-04 has two concurrency causes, and both are fixed. Inkscape children now run with `DBUS_SESSION_BUS_ADDRESS=disabled:` through `RASTER_ENV`. The fixture harness now generates into private dirs through a new `generate.mjs --out` flag and never reads or writes `generated/`. Passing sequential runs are recorded in the host shell and in `nix develop .#theia`, before and after the fix.

NG-074 and NG-084 are cited only, as the plan's `ledger_note` says. No ledger row or ledger file was touched.

## Commits

| Task | Commit | Files |
|------|--------|-------|
| 1 Cause A (tracer) | ccf792d | scripts/generate.mjs |
| 2 Cause B | e63ad9d | scripts/generate.mjs, scripts/verify-downstream-fixture.mjs, scripts/verify-platform.sh |
| 3 R28 record | 9562e54 | docs/non-gui/decisions.md |

## Before/after record

Logs are in `.planning/phases/20-non-gui-gaps/logs/` (git-ignored).

| Run | Pre-fix | Post-fix |
|-----|---------|----------|
| host `--only generate-check` x3 | rc 0, 0, 0: `generate-check: PASS` x3 | rc 0, 0, 0: PASS x3 |
| host `--only verify-downstream-fixtures` | rc 0. `PASS -- 6 fixture(s), 268 assertions`; `PASS -- 3 fixture(s), 198 assertions` | rc 0. `PASS -- 6 fixture(s), 256 assertions`; `PASS -- 3 fixture(s), 189 assertions` |
| `.#theia` `--only generate-check` x3 | rc 0, 0, 0: PASS x3 | rc 0, 0, 0: PASS x3 |
| `.#theia` `--only verify-downstream-fixtures` | rc 0. 268 / 198 assertions | rc 0. 256 / 189 assertions |
| Sampler on `generated/branding/dev/configure.sh` | 55 `PowerBrowser Dev`, 10 `Acme Browser Dev`, 4 `Ironwood Dev`, 4 `Zebra Browser Dev`, 4 `Northlight Browser Dev`, 3 `Cedar Falls Browser Dev`; row exit 0 | 34 `MOZ_APP_DISPLAYNAME="PowerBrowser Dev"`, nothing else; row exit 0 |
| Four rows started together | (not run: the plan forbids planting the crash) | `PHASE20_CONC_EXIT=0` for generate-check, generate-self-test, verify-downstream-fixtures and verify-downstream-fixtures-self-test |

**Assertion arithmetic.** Each passing fixture loses exactly 3 tallies: the restore generate, the hash equality, and the post-restore `--check`. The v1.0 07 root has 4 passing-mode fixtures, so 268 - 12 = 256 (each one drops from 64 to 61). The v1.1 09 root has 3, so 198 - 9 = 189 (66 to 63). The two expect-fail fixtures stay at 6 each. No other total moved.

**A live Cause B red was caught during the pre-fix record.** Another session's `scripts/verify-platform.sh --quick` (pid 3252195) ran in this checkout during the first host pass. Host generate-check run 3 went red, with every target reported as `differs`. The host fixture row went red too: `sourcerer-equivalent` and `spaced-name` failed with "restored generated/ hashes differ from the pre-fixture snapshot". Those logs are kept as `pre-host-generate-check-3-concurrent-red.log` and `pre-host-fixtures-concurrent-red.log`. Per R28, both rows were re-run alone once the foreign process had exited, and both passed. Those passing runs are the `pre-host-generate-check-3.log` and `pre-host-fixtures.log` above. `generated/` was clean in git afterwards.

## Verification results

- Task 1: `generate --self-test PASS -- 66 planted faults` (62 before this plan; 4 new). The log shows:
  - `ok concurrent-raster: env without the bus override -> red, naming 'inkscape would join the session bus'`
  - the same line for `env carrying a host bus address` and `spawn site without RASTER_ENV`
  - `ok concurrent-raster: 18 concurrent exports -> resolved to all 18 exports exit 0 with a 32x32 PNG`
- Task 1: `grep -n "spawnSync('inkscape'" scripts/generate.mjs` matches one line, the iconPngBytes spawn. `generate-check` and `generated-byte-identity` PASS, so the raster bytes did not change.
- Task 1: as a separate check, one export round run outside the self-test printed `0 32 32` six times and wrote six PNG files.
- Task 2:
  - `--out <dir>` writes `branding/dev/configure.sh` under that dir, and `generated/` stays clean.
  - `--out` with no value fails with exit 1, and so does `--out --check`.
  - `--check --out` and `--self-test --out` both fail with exit 1.
  - Harness self-test: `PASS -- 16 planted cases`, including `ok shared-tree-refused` and `ok out-dir-isolation`.
  - `git grep -n "REPO_ROOT, 'generated'" -- scripts/verify-downstream-fixture.mjs` prints nothing.
  - `generate-check` and `generate-self-test` PASS.
- Task 2 mutation checks, run in scratch copies:
  - With the runGenerate guard removed, the self-test goes red: `FAIL shared-tree-refused ... got: null`.
  - With generate.mjs ignoring `--out`, the self-test goes red: green-control fails, then S2 crashes on the missing default tree, with a non-zero exit.
- Task 3:
  - `node scripts/scan-brand-residue.mjs` exits 0.
  - The `--quick` log (`quick-20-01.log`) reaches the summary. Its FAIL set is gui08-canvas-geometry, gui08-canvas-geometry-self-test, gui08-panorama-copy and gui08-panorama-copy-self-test. Minus `docs/non-gui/quick-baseline.txt`, that set is empty.
  - `phase-gate.py` prints nothing after every commit.
  - `plan gate passed: 2/2 IDs cited (phase 20)`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Dead helpers removed with the restore code**
- **Found during:** Task 2
- **Issue:** after `restoreDefault` and the snapshot comparison were removed, `snapshotHashes`, `snapshotsEqual` and the `createHash` import had no callers.
- **Fix:** deleted all three. The expect-fail branch now checks `!existsSync(<stage>/out)`, as the plan specifies.
- **Files modified:** scripts/verify-downstream-fixture.mjs
- **Commit:** e63ad9d

**2. [Rule 3 - Blocking] Pre-fix host records re-run alone**
- **Found during:** Task 1, step 1
- **Issue:** a concurrent foreign `--quick` turned two host pre-fix logs red. That red was Cause B.
- **Fix:** kept the red logs under `-concurrent-red` names. Re-ran both rows alone after confirming no other verify process was running, per R28.
- **Commit:** none (logs only)

The research said "the assertion counts (268 + 198) must not change". The plan's derived arithmetic (-12 and -9) is what holds, and the plan was followed.

### Notes

- The out-dir-isolation plant copies exactly `scripts/generate.mjs`, `scripts/lib/`, `configuration.toml` and `brand/`. It needed nothing else.
- When the default-tree generate fails, the self-test's S2 and S3 crash rather than report a named red. That path is still red (non-zero exit). It was not hardened further.

## Optional cleanup for Chris

- systemd-coredump holds about 45 inkscape dumps, 29 of them from the research's PLAT-04 stress probes (research Runtime State Inventory). Deleting them is optional.
- Leftover temp dirs from earlier runs today, none created by this plan's final code: `generate-icons-*` and `generate-check-*` from 08:24-14:06, and `pb-downstream-fixture-0QLYue` from 08:24, all under `/tmp/nix-shell.aDyem4/`.
- Scratch dirs this plan left (rm -rf outside the project is blocked):
  - `/tmp/nix-shell.aDyem4/claude-1000/-home-chris-coding-Power-Browser/00a95695-3390-43d6-be13-e032e495c46a/scratchpad/sample-configure.mjs`
  - `/tmp/nix-shell.aDyem4/claude-1000/-home-chris-coding-Power-Browser/00a95695-3390-43d6-be13-e032e495c46a/scratchpad/round`
  - `/tmp/nix-shell.aDyem4/claude-1000/-home-chris-coding-Power-Browser/00a95695-3390-43d6-be13-e032e495c46a/scratchpad/mut-guard`
  - `/tmp/nix-shell.aDyem4/claude-1000/-home-chris-coding-Power-Browser/00a95695-3390-43d6-be13-e032e495c46a/scratchpad/mut-out`
  - `/tmp/nix-shell.aDyem4/claude-1000/-home-chris-coding-Power-Browser/00a95695-3390-43d6-be13-e032e495c46a/scratchpad/tmp.hIKxX0NKMQ`

## Known Stubs

None.

## Threat Flags

None. T-20-01, T-20-02 and T-20-03 are mitigated as the register specifies.

## Self-Check: PASSED

- The four modified files exist. Commits ccf792d, e63ad9d and 9562e54 are ancestors of HEAD.
- `git rev-list --count 8529bfa..HEAD` returns 3.
