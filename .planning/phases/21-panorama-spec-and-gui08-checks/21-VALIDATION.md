---
phase: "21"
slug: "panorama-spec-and-gui08-checks"
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-10-17"
---

# Phase 21 — Validation Strategy

> Source: `21-RESEARCH.md` § Validation Architecture. Line numbers are at HEAD `6d7f010`. Registry line numbers move while Phase 20 edits `scripts/verify-platform.sh`; re-read them before editing.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `scripts/verify-platform.sh` registry (node checks); live rows over `scripts/lib/ng-a-live.mjs` |
| **Config file** | the `CHECKS` array in `scripts/verify-platform.sh` (gui08 block near `:3880-3916`; full-tier ng rows near `:4802-4803`) |
| **Quick run command** | `node scripts/verify-gui08-canvas-geometry.mjs [--self-test]` and `node scripts/verify-gui08-panorama-copy.mjs [--self-test]`. Both are read-only and safe to run while another plan works |
| **Full suite command** | `scripts/verify-platform.sh --quick` with the R33 subtraction (`docs/non-gui/decisions.md:43-45`) per wave; the full `scripts/verify-platform.sh` at the phase gate (it carries the live rows) |
| **Estimated runtime** | Under 1 s per gui08 script. About 1 min for `--quick`. Live rows take minutes each (shell launch plus quit) |

---

## Sampling Rate

- **After every task commit:**
  - Run the two `node scripts/verify-gui08-*.mjs` scripts and their `--self-test` for the files touched.
  - For TS edits, run `nix develop .#theia --command bash -c 'cd theia && yarn --cwd extensions/modes build'`.
  - Run `node scripts/scan-brand-residue.mjs` after `git add` of any new file.
- **After every plan wave:**
  - Run `scripts/verify-platform.sh --quick` with the R33 subtraction once. The orchestrator runs it; two plans never run it at the same time.
  - Re-run any red row alone (R28).
  - Then run `python3 scripts/phase-gate.py --root .`. It must exit 0 with no output.
- **Before `/gsd-verify-work`:**
  - the 21-04 live checkpoint (C1);
  - the derived empty `docs/non-gui/quick-baseline.txt`;
  - the full `scripts/verify-platform.sh`;
  - `python3 scripts/phase-gate.py --root .` (no output).
- **Max feedback latency:** 1 s for the gui08 scripts; about 60 s for `--quick`.

---

## Per-Requirement Verification Map

| Criterion | Plan | Wave | Check / command | Failing direction (must go red when…) | File Exists | Status |
|---|---|---|---|---|---|---|
| SC1: 15-UI-SPEC describes the shipped redesign | 21-01 | 1 | `grep -c 'pb-org-tray\|144px tall\|160×90' .planning/milestones/v1.3-phases/15-panorama-organising/15-UI-SPEC.md` = 0 outside the Retired copy table; `grep -F '**"Expand"**'` and `grep -F '**"Done"**'` each match; a `## Canvas Geometry` section exists | Any stale tray or geometry claim remains, or a reviewed literal is missing | ✅ (rewrite) | ✅ green |
| SC1: parse form holds | 21-01 | 1 | After 21-02/21-03: both checks pass against the rewritten spec | ZERO derivation from either section | ✅ | ✅ green |
| SC2: copy derives from the spec | 21-02 | 2 | `node scripts/verify-gui08-panorama-copy.mjs` | A painted literal not in the spec contract, a spec literal not painted, a retired literal found in shipped sources, or an internal identifier in copy | ✅ (rewrite) | ✅ green |
| SC2: copy plants | 21-02 | 2 | `node scripts/verify-gui08-panorama-copy.mjs --self-test` | The baseline is not green, or any of plants 1-8 is not red naming its drift: label drift, Expand removed, placeholder revival, unscanned-file revival, spec Done row deleted, spec "Retry" reworded, spec heading stripped (ZERO), retired caption revived | ✅ (rewrite) | ✅ green |
| SC2: geometry derives from the spec | 21-03 | 2 | `node scripts/verify-gui08-canvas-geometry.mjs` | A spec const row ≠ its source const; a rule-scoped CSS value ≠ its spec row; an underivable row; a font size or weight outside the spec Typography table; any `pb-org-tray*` selector or `dataset.tray` | ✅ (rewrite) | ✅ green |
| SC2: geometry plants | 21-03 | 2 | `node scripts/verify-gui08-canvas-geometry.mjs --self-test` | The baseline is not green, or any of plants 1-11 is not red: hook, zoom, label, spec `LOOSE_W` 170, source `TILE_GAP` 10, spec row deleted, 124px moved to another selector, `.pb-org-tray` revived, weight 500, zero-group `renderLoose` removed, tray focus scope restored | ✅ (rewrite) | ✅ green |
| SC4: no tray code | 21-03 | 2 | `git grep -n -i 'pb-org-tray\|dataset\.tray\|tray-cards' -- theia` prints nothing; `git grep -n -w -i 'tray' -- theia/extensions` prints nothing (and `powerbrowser/shell` too if the optional `PowerBrowserAPI.sys.mjs:1954` comment edit is taken) | Any line | — (command) | ✅ green |
| SC4: dead drop path gone | 21-03 | 2 | `git grep -n 'dropCardOntoCard\|autoBox' -- theia scripts` prints nothing | Any line | — (command) | ✅ green |
| SC4: live API kept | 21-03 | 2 | `git grep -c 'listUngroupedTabs' -- theia/extensions` unchanged; `--only gui08-view-parity`, `--only gui08-view-parity-self-test` | A rename of `ungrouped`, `listUngrouped` or `listUngroupedTabs` | ✅ | ✅ green |
| SC4: TS builds | 21-03 | 2 | `nix develop .#theia --command bash -c 'cd theia && yarn --cwd extensions/modes build'` exits 0 | Any tsc error | ✅ | ✅ green |
| SC4: loose cards render, keyboard reach | 21-04 | 3 | `PB_VERIFY_PORT=3939 scripts/verify-platform.sh --only gui08-loose-cards-live`, run once on the pre-fix bundle (expect red) and once after the rebuild (green), with both outputs quoted in the SUMMARY | With zero groups or with one group, no `.pb-org-canvas .pb-org-card.is-loose`; any `[class*="pb-org-tray"]` element; `ArrowRight` on loose card 1 does not move focus to another loose card | ✅ | ✅ green |
| SC4: model unchanged | 21-04 | 3 | `PB_VERIFY_PORT=3939 scripts/verify-platform.sh --only ng-007-shell-tabs-keep-group-across-restart`, `--only ng-008-panorama-card-reopens-through-opener` | Membership or loose position lost; card does not reopen | ✅ | ✅ green |
| No regression | 21-04 | 3 | `--only` for `gui08-close-exactness`, `gui08-persistence-roundtrip`, `ng-016-gui08-persistence-at-head`, each with `-self-test` where one exists | Any red | ✅ | ✅ green |
| SC3: commit gate green | 21-04 | 3 | `scripts/verify-platform.sh --quick > .planning/phases/21-panorama-spec-and-gui08-checks/logs/quick-21-04.log 2>&1`, then the R33 pipeline prints nothing | Any FAIL row | ✅ | ✅ green |
| SC3: baseline empty by derivation | 21-04 | 3 | Derive with the R33 pipeline (plain `sort`) into `docs/non-gui/quick-baseline.txt`; `test -f docs/non-gui/quick-baseline.txt && test ! -s docs/non-gui/quick-baseline.txt`; `grep -q 'Phase 21 refresh' docs/non-gui/decisions.md` | The file is non-empty, deleted, or typed by hand (no log cited in the SUMMARY) | ✅ | ✅ green |
| Gate, every plan | all | — | `node scripts/scan-brand-residue.mjs` exits 0 after staging; `python3 scripts/phase-gate.py --root .` prints nothing | Residue hit; `test file changed` (a locked ng check was edited) | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `scripts/verify-gui08-loose-cards-live.mjs` plus 1 full-tier row beside ng-007/ng-008 (21-04). Commit before the live run (`assertCleanTree`), and `git add` before `scan-brand-residue`.
- [x] Spec-reading rewrites of `scripts/verify-gui08-panorama-copy.mjs` (21-02) and `scripts/verify-gui08-canvas-geometry.mjs` (21-03), with the new plants. The files and registry rows exist; the spec derivation does not.

`quick-baseline.txt` keeps its 4 gui08 rows until 21-04 derives it empty after Phase 20 has finished.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live run on Chris's display (C1) | PAN-07, SC4 | The live rows launch the shell; memory `one-fix-at-a-time-confirmed` stops for live checks | Blocking checkpoint in 21-04. Commit, then run the new row on the current bundle and record the red. Rebuild with `nix develop .#theia --command bash -c 'cd theia && yarn --cwd extensions/modes build && yarn --cwd applications/browser theia build --app-target=browser --mode development'`. Re-run the new row, ng-007 and ng-008 with `PB_VERIFY_PORT=3939`. Chris replies `live ok` or reports the failure |
| Zero-group canvas layout | SC4 (A3) | DOM geometry (the empty panel against the loose line) is not asserted by any check | In the same checkpoint: open Organising on a profile with tabs and no groups, then screenshot (memory `screenshot-pb-on-kde-wayland`). The loose cards are visible and not under the "No tab groups" panel |
| 21-UI-SPEC assumptions A2-A5 ratified | PAN-01 | Design ratification belongs to Chris | End-of-phase verify (C2). Chris accepts or overturns each. If A3 is overturned, record criterion 4 as holding with at least one group |
| Sketch-findings tray text (optional, C3) | PAN-07 (adjacent) | A design-record edit in a skill | Chris approves or declines a 3-line update to `.claude/skills/sketch-findings-Power-Browser/references/modes-tabs-and-organising.md:22,42,48` |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60 s for static rows (live rows are full tier only)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-10-17 (Nyquist audit)

## Validation Audit 2026-10-17

| Metric | Count |
|---|---|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

Static checks re-run in this audit (all exit 0): `verify-gui08-panorama-copy.mjs` and `verify-gui08-canvas-geometry.mjs`, each with `--self-test`; the SC1 greps on 15-UI-SPEC (no stale tray or geometry claim, `**"Expand"**`, `**"Done"**` and `## Canvas Geometry` each match once); the SC4 `git grep` commands (tray and `dropCardOntoCard|autoBox` print nothing; `listUngroupedTabs` is still present); `--only` gui08-view-parity, gui08-close-exactness and gui08-persistence-roundtrip, each with `-self-test`, plus ng-016-gui08-persistence-at-head; `docs/non-gui/quick-baseline.txt` exists and is 0 bytes; `decisions.md` contains "Phase 21 refresh"; `scan-brand-residue.mjs` exits 0; `phase-gate.py` prints nothing. Not re-run (static-only audit): `--quick`, the TS build, and the live rows. Their status cites `logs/`: `quick-21-05-base.log` and `quick-21-05.log` (132 PASS, 0 FAIL), `build-21-05.log`, `loose-cards-red-21-05.log` (FAIL on the pre-fix bundle), and `loose-cards-21-05.log`, `ng007-21-05.log`, `ng008-21-05.log` (each PASS).

Notes:
- Plan numbering moved. The live loose-cards row, the C1 checkpoint and the derived empty baseline landed in 21-05, not 21-04 as the map says. Read the 21-04 rows marked "live" and "baseline" as 21-05.
- No `ng-016-gui08-persistence-at-head-self-test` or `gui08-loose-cards-live-self-test` registry row exists. `--only` rejects both labels, so the clause "with `-self-test` where one exists" is met. 21-05-SUMMARY reports planted page faults inside the live script.
- Open manual items: the A2-A5 ratification (C2) and the optional sketch-findings edit (C3) still need Chris. The zero-group layout was screenshotted (`logs/loose-cards-zero-groups-21-05.png`) and is now asserted by the live row, which requires every loose card to lie inside the canvas.
