---
phase: 17-opencode-removal
reviewed: 2026-10-17T00:00:00Z
depth: standard
diff_base: 6096a81
files_reviewed: 12
files_reviewed_list:
  - configuration.toml
  - docs/REBRANDING.md
  - docs/non-gui/checks-wave-e.tsv
  - docs/non-gui/decisions.md
  - docs/non-gui/quick-baseline.txt
  - scripts/generate.mjs
  - scripts/lib/config-schema.json
  - scripts/verify-backend-env-readers.mjs
  - scripts/verify-platform.sh
  - theia/applications/browser/package.json
  - theia/package.json
  - theia/yarn.lock
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
status: clean
---

# Phase 17: Code Review Report

**Reviewed:** 2026-10-17
**Depth:** standard
**Files Reviewed:** 12 modified files, plus a dangling-reference sweep for the deleted files
**Status:** issues_found

## Summary

The removal is mechanically complete. Checks run:

- `bash -n scripts/verify-platform.sh` parses. No defined function lacks a caller. No `adapter_composed`, `check_ai_opencode_held`, `ai-opencode-*` or `ng051-backend-off` label is left.
- `git grep` over tracked files outside `.planning/`, archives, `docs/non-gui/plans/`, GAPS.md, import-review.txt and ledger history finds no `emitAiBackend`, `ai.backend`, `powerbrowserAiBackend`, `backend-opencode`, `POWERBROWSER_MCP_*`, `ai-backend.json`, `verify-opencode-*`, `verify-ng-051`, `@agentclientprotocol` or `docs/ai-opencode-adapter.md` reference. The exceptions are the history records in `docs/non-gui/decisions.md` (IN-01) and one accurate historical comment at `theia/extensions/tab-uris/src/node/tab-store-access-endpoint.ts:10`.
- Generator: `TARGETS.length === 53`. `emitAiBackend` is no longer exported. The shared helpers it used (`isUnset`, `report`, `assertEmittable`) still have other callers. The header enumeration adds up to 53. `node scripts/generate.mjs --check` prints PASS for all 53 files.
- Schema, manifest and REBRANDING.md agree. Each of the 10 manifest tables has a REBRANDING section, and no `[ai]` remains.
- `verify-backend-env-readers.mjs` and its `--self-test` both PASS with the 1-entry allowlist.
- The shared tab-uris `/mcp` endpoint is untouched: `git diff 6096a81 HEAD -- theia/extensions/tab-uris` is empty, and `STORE_ACCESS_ROUTE = '/mcp'` is intact. Each package.json still has 12 `@theia/ai-*` entries, and the `theia/package.json` diff touches only the `build:extensions` line.
- No ignored leftovers on this checkout: `theia/node_modules/@powerbrowser/` holds 7 members, and `generated/ai-backend.json` is gone.

Two problems remain. A sentence in the `docs/non-gui/decisions.md` section this phase edited now contradicts the refreshed baseline. A manifest that still carries the old `[ai]` table now fails generation with an error message that points the user to the wrong cause.

## Warnings

### WR-01: decisions.md quick-baseline section contradicts the refreshed baseline

**File:** `docs/non-gui/decisions.md:47-48`
**Issue:** This phase rewrote line 39 of the "Quick-tier baseline" section and refreshed `quick-baseline.txt` down to the four gui08 rows. Lines 47-48 of the same section still say: "NG-016 and NG-040 own two baseline rows (`gui08-persistence-roundtrip`, `internals-catalogue`) and must turn them green." Neither row is in the baseline anymore; both now pass. This file documents the commit gate, so a reader following it is told to fix rows that are already green.
**Fix:** Delete the sentence, or replace it with: "NG-016 and NG-040 turned their baseline rows (`gui08-persistence-roundtrip`, `internals-catalogue`) green; they left the baseline at the Phase 17 refresh."

### WR-02: a leftover `[ai]` table now fails generation with a "check the spelling" message

**File:** `scripts/generate.mjs:290-293`, `scripts/lib/config-schema.json` (removed `ai.backend`), `docs/REBRANDING.md:296-299`
**Issue:** Until this phase, the shipped `configuration.toml` carried `[ai] backend = "off"`. A downstream config directory (`PB_CONFIG_DIR`) or local manifest copied from it now fails `resolveConfig`. Reproduced by appending `[ai]\nbackend = "off"` to a copy of the manifest, which returns:
`unknown setting 'ai.backend' -- configuration.toml has no setting by that name. Check the spelling of the setting and of the section header above it, then run: node scripts/generate.mjs`.
That message points to a typo. The real cause is a removed setting, and REBRANDING.md records nothing about the removal. Exposure is small, since there are no releases or known downstreams yet, but the rebrand inputs are this platform's public contract.
**Fix:** Add a one-line removal note to REBRANDING.md's field reference. For example, under the `[telemetry]` table: "`[ai]` (`ai.backend`) was removed in v1.4 Phase 17 with the OpenCode adapter; delete the table from your manifest." Optionally, keep a small `REMOVED_KEYS` map in `rejectUnknown` so the generator names the removal instead of suggesting a misspelling. Skip the map if you want to avoid new code; the doc line covers the case.

## Info

### IN-01: decisions.md D2 and R9 describe the adapter as still in the tree, with no superseded marker

**File:** `docs/non-gui/decisions.md:7-11`, `:60`, `:65`
**Issue:** Line 11 of D2 says "The adapter's source stays in the tree". R9 describes the `ai-opencode-held` stand-in, and R14 names `ai-opencode-adapter.md`. All three are false now. These are dated rulings, so history is legitimate. But plan 17-03 added "Superseded" banners to three OpenCode-era notes and did not add one here, even though this phase edits this file.
**Fix:** Add one line under D2, for example: "Superseded 2026-10-17: the adapter, `ai-opencode-held` and `docs/ai-opencode-adapter.md` were removed in v1.4 Phase 17 (RM-01)."

### IN-02: the ignored sidecar build output on this checkout predates the removal

**File:** `theia/applications/browser/src-gen/frontend/index.js:24` (ignored), `theia/applications/browser/lib/frontend/bundle.js` (ignored)
**Issue:** `src-gen/frontend/index.js` is dated 2026-10-16 19:29, before commit B (23:10), and still carries `"powerbrowserAiBackend": "off"`. The `lib/` bundle and the backend source map also still contain adapter strings. This is harmless at runtime, because the adapter was not a dependency. But any live check run before the next `yarn build` tests a bundle that the removal tree did not produce. The 17-04 sweep measured only `--quick`, so no live check has yet run against a rebuilt sidecar.
**Fix:** Run `yarn build` inside `nix develop .#theia` before the next live-tier run.

### IN-03: generate.mjs still says "fifty-two" for the target count in three comments (drift predates this phase)

**File:** `scripts/generate.mjs:3833`, `:4248`, `:5265`
**Issue:** The comments say "fifty-two stale files / phantom paths / stale paths". This drift predates the phase: they already said fifty-two at `6096a81`, when there were 54 targets. The phase updated the header count to 53 and left these three.
**Fix:** Write "every target" instead of a number, so the count cannot drift again.

---

_Reviewed: 2026-10-17_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

## Iteration 2 (orchestrator fix, 2026-10-17)

- WR-01 resolved in 6c42f5d: decisions.md now states the two rows left the baseline at the Phase 17 refresh.
- WR-02 resolved in 6c42f5d: REBRANDING.md notes the removed `[ai]` table and the exact error a stale manifest gets. The optional named-removal generator message was not added (no downstream builds exist yet).
- IN-01..IN-03 open (info).

Status after iteration 2: clean (0 critical, 0 warning, 3 info).
