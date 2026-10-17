---
phase: 17-opencode-removal
verified: 2026-10-17T08:15:00Z
status: passed
score: 12/12 must-haves verified
covered_files:
  - ".planning/phases/17-opencode-removal/17-01-PLAN.md"
  - ".planning/phases/17-opencode-removal/17-01-SUMMARY.md"
  - ".planning/phases/17-opencode-removal/17-02-PLAN.md"
  - ".planning/phases/17-opencode-removal/17-02-SUMMARY.md"
  - ".planning/phases/17-opencode-removal/17-03-PLAN.md"
  - ".planning/phases/17-opencode-removal/17-03-SUMMARY.md"
  - ".planning/phases/17-opencode-removal/17-04-PLAN.md"
  - ".planning/phases/17-opencode-removal/17-04-SUMMARY.md"
  - "configuration.toml"
  - "docs/REBRANDING.md"
  - "docs/non-gui/checks-wave-e.tsv"
  - "docs/non-gui/decisions.md"
  - "docs/non-gui/quick-baseline.txt"
  - "scripts/generate.mjs"
  - "scripts/lib/config-schema.json"
  - "scripts/verify-backend-env-readers.mjs"
  - "scripts/verify-platform.sh"
  - "theia/applications/browser/package.json"
  - "theia/package.json"
  - "theia/yarn.lock"
covered_digest: "v3:sha256:7675eb3e7b3257d3fa1746e40abb9d724dfe88c830151f498a89ef59ff301b14"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 17: OpenCode Removal Verification Report

**Phase Goal:** The tree carries no OpenCode adapter, so every later install, re-pin and clean build runs on the final workspace member set
**Verified:** 2026-10-17T08:15:00Z
**Status:** passed
**Re-verification:** No — initial verification

Every result below was measured by the verifier at HEAD `8504b27`. No SUMMARY claim was accepted without a command run against the tree.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1: `git ls-files` lists no `theia/extensions/backend-opencode`, no `[ai]` key in `configuration.toml`, no `ai.backend` schema entry, no `emitAiBackend`, none of the four OpenCode/NG-051 verify scripts and none of their registry rows; `docs/REBRANDING.md` has no `[ai]` section | ✓ VERIFIED | `git ls-files \| grep -c backend-opencode` = 0; directory absent from disk; `theia/extensions/` holds 7 dirs. No `[ai]`/`backend` line in `configuration.toml`, no `ai`/`backend` key in `config-schema.json`. `git grep emitAiBackend\|ai-backend.json\|powerbrowserAiBackend` outside `.planning`/`ledger` hits only the archival `docs/non-gui/plans/wave-e-PLAN.md`. The four scripts are absent. `verify-platform.sh` has no `opencode`/`ng051`/`adapter_composed`/`check_ai_opencode` match. REBRANDING has no `[ai]` heading (heading list checked). Lines 240-242 hold a "Removed setting" paragraph that tells a downstream to delete the table (the WR-02 fix). That paragraph is a migration note, not a settings section. |
| 2 | SC2: `node scripts/generate.mjs --check` reports 53 targets | ✓ VERIFIED | `generate: --check PASS -- all 53 generated file(s) match configuration.toml`, exit 0; no `ai*` file in `generated/` |
| 3 | SC3: with leftovers removed, `yarn install --frozen-lockfile` passes on the committed lock (no `@agentclientprotocol/sdk`), `--quick` shows no FAIL beyond the four gui08 rows, `quick-baseline.txt` refreshed | ✓ VERIFIED | Verifier re-ran the frozen install on a fresh copy of the 9 workspace manifests and the lock inside `nix develop .#theia`. `yarn install --ignore-scripts --frozen-lockfile --prefer-offline` printed `Done in 4.85s.`. `cmp` shows the lock byte-identical, no `@agentclientprotocol` dir, and 7 `@powerbrowser/*` workspace links. `grep -c agentclientprotocol theia/yarn.lock` = 0. No `backend-opencode` symlink in `theia/node_modules/@powerbrowser/`. `--quick` (PB_VERIFY_PORT=3939): 4 FAIL rows, all gui08. The baseline holds 4 lines, and `comm -13` and `comm -23` against the FAIL set both print nothing. |
| 4 | SC4: NG-051 amend in the ledger with Chris's approval before the removal commit; no live planning record lists AI-01..05 as a requirement; 12 `@theia/ai-*` packages still composed | ✓ VERIFIED | `ledger-report.py`: `NG-051 dropped`. `git merge-base --is-ancestor c3929e9 02fffb6` is true. Every AI-01..05 mention in REQUIREMENTS/ROADMAP/PROJECT says "removed" or "(was)". Both `theia/package.json` and `theia/applications/browser/package.json` carry 12 `@theia/ai-*` entries, and the browser set diffs empty against pre-phase `6096a81`. |
| 5 | `build:extensions` names exactly the seven remaining extensions (set-equality check) | ✓ VERIFIED | Diff `6096a81..HEAD` removes only the `backend-opencode` clause; `theia-build-order: PASS` and `-self-test: PASS` in the `--quick` run |
| 6 | `EXPECTED_ENV_TOUCHERS` holds only the token-gate entry; backend-env-readers reports a 1-entry allowlist | ✓ VERIFIED | Map at `verify-backend-env-readers.mjs:96-101` has one entry. The row reported `equal the 1-entry allowlist; zero direct prefixed reads`, and its self-test passed. |
| 7 | Commit A changes the lock by 0 added / 5 deleted lines and does not touch `theia/applications`, `tab-uris` or `.gitignore` | ✓ VERIFIED | `git diff 5dfecb5~1 5dfecb5 -- theia/yarn.lock` shows exactly the 5-line `@agentclientprotocol/sdk@1.4.0` stanza deleted. `git show --stat 5dfecb5` lists only the adapter files, two scripts, `theia/package.json` and `yarn.lock`. `git log 5dfecb5..HEAD -- theia/yarn.lock` is empty. |
| 8 | Commit B is one commit removing the full R+M set; it removes exactly one line of `browser/package.json`; a manifest still carrying `[ai]` is rejected | ✓ VERIFIED | `git show --stat 02fffb6` lists all 12 expected paths. The browser package.json delta is 1 line (`powerbrowserAiBackend`). A scratch `PB_CONFIG_DIR` manifest with an added `[ai] backend = "off"` failed `generate --check` with `unknown setting 'ai.backend'`. `verify-rebranding-docs: PASS -- 40/40 schema field(s) documented` |
| 9 | Live codebase map names seven extensions with no adapter/ACP/ai-backend/`[ai]`/`POWERBROWSER_MCP_*`; STACK.md keeps `opencode.json` | ✓ VERIFIED | The only codebase-map hit is `STACK.md:83 opencode.json` (kept by design; `.gitignore:83` still ignores the file). `ARCHITECTURE.md:112` reads "seven `@powerbrowser/*` extensions". `STRUCTURE.md:58-64` lists the seven. |
| 10 | ROADMAP Phase 16 record notes NG-051 drop (c3929e9); three notes carry Superseded 2026-10-16 banners additively; no archived milestone / `docs/non-gui/history` file edited | ✓ VERIFIED | `ROADMAP.md:73-74` has the sentence. Banners are present in all three notes. `git diff --numstat 84987f3 e4c5079` shows `3 0` for each note. `git diff --name-only 6096a81 HEAD -- .planning/milestones docs/non-gui/history` is empty. |
| 11 | `quick-baseline.txt` equals the post-removal FAIL set (R33), all gui08; `decisions.md` describes the Phase 17 refresh | ✓ VERIFIED | The verifier's own `--quick` FAIL set equals the baseline exactly (both `comm` directions are empty). 4 lines, all `gui08-*`. |
| 12 | Chris re-locked at commit B or later; ledger committed by explicit path; `phase-gate.py --root .` exits 0 with no output | ✓ VERIFIED | `python3 scripts/phase-gate.py --root .` printed nothing, exit 0. `8092428` touches exactly the three ledger files. The ledger checksums are reported ok (ledger_version 370). Who ran the amend (Chris, in his terminal) cannot be proven from the tree. The orchestrator states it as fact, and the ledger tooling's checksums verify. |

**Score:** 12/12 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `theia/package.json` | `build:extensions` ends at chrome-bar | ✓ VERIFIED | Clause removed; theia-build-order PASS |
| `theia/yarn.lock` | no ACP SDK stanza | ✓ VERIFIED | 0 matches; frozen install passes byte-identical |
| `scripts/verify-backend-env-readers.mjs` | 1-entry allowlist | ✓ VERIFIED | Lines 96-101 |
| `scripts/verify-platform.sh` | no OpenCode/NG-051 rows or helpers | ✓ VERIFIED | grep empty; `bash -n` OK; `--quick` reaches summary |
| `scripts/generate.mjs` | 53-target table | ✓ VERIFIED | `--check` reports 53 |
| `configuration.toml` | ends at `[upstreams]`, no `[ai]` | ✓ VERIFIED | grep empty |
| `scripts/lib/config-schema.json` | no `ai.backend` | ✓ VERIFIED | Valid JSON; an `[ai]` manifest is rejected |
| `docs/REBRANDING.md` | no `[ai]` section | ✓ VERIFIED | No heading; removal note only |
| `.planning/codebase/ARCHITECTURE.md` / `STRUCTURE.md` / `STACK.md` | seven-extension map | ✓ VERIFIED | See truth 9 |
| `.planning/ROADMAP.md` | NG-051 drop sentence | ✓ VERIFIED | Lines 73-74 |
| `docs/non-gui/quick-baseline.txt` | R33 baseline | ✓ VERIFIED | Matches the measured FAIL set |
| ledger check_locks | re-derived without the 051 file | ✓ VERIFIED | phase-gate green (read via phase-gate and ledger-report only) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `theia/package.json` | `verify-theia-build-order.mjs` | set equality vs `theia/extensions` | ✓ WIRED | PASS + self-test PASS |
| `verify-backend-env-readers.mjs` | `token-gate/src/node/powerbrowser-env.ts` | derived toucher set equals allowlist | ✓ WIRED | PASS naming that file |
| `config-schema.json` | `docs/REBRANDING.md` | verify-rebranding-docs | ✓ WIRED | 40/40 fields |
| `generate.mjs` TARGETS | `generated/` | `--check` flags unemitted files | ✓ WIRED | 53 match, no `ai-backend.json` |
| commit B | ledger check_locks | phase-gate hash check | ✓ WIRED | exit 0, no output |
| `quick-baseline.txt` | `verify-platform.sh --quick` | R33 `comm -13` | ✓ WIRED | Empty |

### Data-Flow Trace (Level 4)

Not applicable. The phase removes code and renders no dynamic data.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| 53 targets | `node scripts/generate.mjs --check` | `all 53 generated file(s) match` | ✓ PASS |
| Frozen install on final member set | fresh manifest copy, `yarn install --ignore-scripts --frozen-lockfile --prefer-offline` in `nix develop .#theia` | `Done in 4.85s.`; lock byte-identical | ✓ PASS |
| `[ai]` manifest rejected | `PB_CONFIG_DIR=<scratch> node scripts/generate.mjs --check` with `[ai]` appended | `unknown setting 'ai.backend'` | ✓ PASS |
| Commit gate | `PB_VERIFY_PORT=3939 scripts/verify-platform.sh --quick` | 4 FAIL (all gui08), equal to the baseline | ✓ PASS |
| Phase gate | `python3 scripts/phase-gate.py --root .` | exit 0, no output | ✓ PASS |
| Ordering | `git merge-base --is-ancestor` c3929e9→02fffb6, 5dfecb5→02fffb6 | both true | ✓ PASS |

### Probe Execution

No `scripts/*/tests/probe-*.sh` exists, and no plan declares a probe. Not applicable.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| RM-01 | 17-01, 17-02, 17-03, 17-04 | OpenCode gone from tree; 53 targets; AI-01..05 removed; NG-051 amend approved before commit | ✓ SATISFIED | Truths 1-4, 7-8 |
| NG-074 | 17-04 (ledger_note) | CI green on main | Carried, not closed (by design) | `ledger-report`: `deferred-approved`; owned by Phase 25; not in REQUIREMENTS.md by design |
| NG-084 | 17-04 (ledger_note) | v1.2 UAT sheets signed | Carried, not closed (by design) | `ledger-report`: `deferred-approved`; owned by Phase 24 |

Orphaned requirements: none. REQUIREMENTS.md maps only RM-01 to Phase 17.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (lines added in phase-modified files) | — | TBD/FIXME/XXX/TODO/HACK | — | None found |
| `theia/extensions/tab-uris/src/node/tab-store-access-endpoint.ts` | 9-10 | Comment names "the retired backend-opencode /mcp route" | ℹ️ Info | Historical provenance comment, not a code reference. The plan forbade touching `tab-uris`. |
| `docs/non-gui/plans/wave-e-PLAN.md` | 327-1640 | Names `emitAiBackend`, `powerbrowserAiBackend`, the opencode rows | ℹ️ Info | Archival plan record; the CONTEXT keeps history files unedited |

Code review (`17-REVIEW.md`): status clean, 0 critical. The 2 warnings were fixed in `6c42f5d`. Security: verified, 0 threats open. Validation: nyquist_compliant.

### Human Verification Required

None. The one human action, Chris's re-lock, has already happened. Its effect is verified by `phase-gate.py` exit 0.

### Gaps Summary

No gaps. The adapter, the manifest path, the checks, the registry rows and the docs are gone from the tracked tree, the disk and `node_modules`. The lock is frozen-installable on the seven-member workspace. The commit gate's FAIL set equals the refreshed 4-row gui08 baseline. The ledger re-lock is green. Phases 18-25 now install, re-pin and build against the final member set.

---

_Verified: 2026-10-17T08:15:00Z_
_Verifier: Claude (gsd-verifier)_
