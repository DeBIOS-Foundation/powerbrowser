---
phase: "22"
slug: "panorama-worklist"
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-10-17"
---

# Phase 22 — Validation Strategy

> Source: `22-RESEARCH.md` § Validation Architecture. Line numbers are at HEAD `02ce825`. Registry line numbers in `scripts/verify-platform.sh` move whenever a row is added; re-read them before editing. Plan numbers follow the research's recommended split (22-01..22-07); re-map them if the planner splits differently.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `scripts/verify-platform.sh` registry (node checks); live rows over `scripts/lib/ng-a-live.mjs` |
| **Config file** | the `CHECKS` array in `scripts/verify-platform.sh` (gui08 static block `:3904-3941`; full-tier ng and gui08 live rows `:4824-4834`; gui07/gui02 live rows `:4869-4900`) |
| **Quick run command** | `node scripts/verify-gui08-panorama-copy.mjs [--self-test]`, `node scripts/verify-gui08-canvas-geometry.mjs [--self-test]`, `node scripts/verify-gui08-close-exactness.mjs [--self-test]`, `node scripts/verify-gui08-view-parity.mjs [--self-test]`. All read-only |
| **Full suite command** | `scripts/verify-platform.sh --quick` per wave (0 FAIL, `docs/non-gui/quick-baseline.txt` empty); the full `scripts/verify-platform.sh` at the phase gate (it carries the live rows) |
| **Estimated runtime** | Under 1 s per gui08 script. About 1 min for `--quick`. Live rows take minutes each (shell launch plus quit); pan04 adds at least one 15 s undo window |

---

## Sampling Rate

- **After every task commit:**
  - Run the gui08 scripts and their `--self-test` for the files touched.
  - For TS edits, run `nix develop .#theia --command bash -c 'cd theia && yarn --cwd extensions/modes build && yarn --cwd extensions/chrome-bar build'`.
  - Run `node scripts/scan-brand-residue.mjs` after `git add` of any new file.
- **After every plan wave:**
  - Run `scripts/verify-platform.sh --quick` once (the orchestrator only; plans are sequential).
  - Re-run any red row alone with `--only <label>`.
  - Run `python3 scripts/phase-gate.py --root .`. It must print nothing, or the change goes through `scripts/ledger-amend.py` with Chris (C4).
- **Before `/gsd-verify-work`:**
  - rebuild the sidecar;
  - every live row below with `PB_VERIFY_PORT=3939` (never port 3000), confirmed by Chris (C3);
  - the full `scripts/verify-platform.sh`;
  - `python3 scripts/phase-gate.py --root .` (no output).
- **Max feedback latency:** 1 s for the gui08 scripts; about 60 s for `--quick`.

---

## Per-Requirement Verification Map

| Criterion | Plan | Wave | Check / command | Failing direction (must go red when…) | File Exists | Status |
|---|---|---|---|---|---|---|
| SC1 / PAN-02: decisions recorded before worklist code | 22-02 | 2 | `git merge-base --is-ancestor 7cf50ce <first 22-02 code commit>` exits 0 | A worklist code commit predates the CONTEXT commit | ✅ | ✅ green |
| C1: every new string approved | 22-01 | 1 | Blocking checkpoint; the SUMMARY quotes Chris's answer per string | A string ships without a recorded answer | — (checkpoint) | ✅ green |
| Copy derivation sees template sinks (WR-05) | 22-01 | 1 | `node scripts/verify-gui08-panorama-copy.mjs` and `--self-test` | A template `setAttribute('aria-*', …)`, `title =` or `textContent =` literal outside the spec contract; plants "aria-description added" and "template textContent added" not red | ✅ edit | ✅ green |
| Empty-canvas body replaced; old body retired | 22-01 | 1 | panorama-copy as above; `grep -F 'drag a tab onto the canvas' theia/extensions/modes/src/browser/*.ts` prints nothing | Old body still painted or missing from Retired copy | ✅ | ✅ green |
| SC2 / PAN-03: model loads without Organising | 22-02 | 2 | `--only pan03-strip-group-live` (model `isLoaded` in Browsing before Organising opens) | Strip unfiltered with an active group at launch | ❌ W0 | ✅ green |
| SC2 / PAN-03: strip = active + loose + current (Browsing) | 22-02 | 2 | `PB_VERIFY_PORT=3939 scripts/verify-platform.sh --only pan03-strip-group-live`; expected set derived from the model | A non-active member listed, a loose tab hidden, the current tab hidden | ❌ W0 | ✅ green |
| SC2 / PAN-03: "+" joins the active group, no sleep | 22-02 | 2 | `--only pan03-strip-group-live` via `executeCommand('powerbrowser.chrome-bar.new-tab')`; `tabsOf` row `group_id` equals the active group | Card loose, row not joined, or "unknown tab URI" | ❌ W0 | ✅ green |
| SC2 / D2: Coding and Organising unfiltered | 22-02 | 2 | `--only pan03-strip-group-live` (Coding dock bars list every tab) | A Coding bar missing a tab | ❌ W0 | ✅ green |
| SC2: no second reader; harness intact | 22-02 | 2 | `--only gui08-view-parity` + `-self-test`; `--only ng-004-new-tab-row-unknown-uri-error`, `--only ng-007-shell-tabs-keep-group-across-restart`, `--only ng-008-panorama-card-reopens-through-opener`, `--only gui08-loose-cards-live`, `--only gui02-web-tab-live` | Any red | ✅ | ✅ green |
| SC2: spec amended in the W1 commit | 22-02 | 2 | `grep -c 'filters, or re-skins the strip, and choosing a tab never hides other tabs' 15-UI-SPEC.md` = 0; `grep -c 'Active-group state never filters or hides the tab strip.'` = 0 | Either sentence survives | ✅ | ✅ green |
| SC5 / PAN-06: last group keeps no × | 22-03 | 3 | `node scripts/verify-gui08-close-exactness.mjs` and `--self-test` (guard plant); `--only gui08-canvas-geometry` (`= 'Close group'` still in widget and tree) | Guard removed; the tooltip literal gone from a site | ✅ edit | ✅ green |
| SC5 / PAN-06: live | 22-05 | 5 | `--only pan04-undo-close-group-live` last-group step | × present on canvas or tree with one visible group; close command acts on it | ❌ W0 | ✅ green |
| PAN-04 mechanism: commit fires from timer and flush, not click | 22-04 | 4 | `node scripts/verify-gui08-close-exactness.mjs` (still green with the dialog); TS build | Build error; close-exactness red | ✅ | ✅ green |
| SC3 / PAN-04: spec copy and both gui08 checks in one commit, passing | 22-05 | 5 | `git show --stat <W4 UI commit>` lists 15-UI-SPEC.md, `verify-gui08-panorama-copy.mjs`, `verify-gui08-canvas-geometry.mjs` (and `verify-gui08-close-exactness.mjs`); each check and `--self-test` exits 0 at that commit | Any of the files lands in another commit; any red | ✅ edit | ✅ green |
| SC3: close-exactness derives the new contract | 22-05 | 5 | `node scripts/verify-gui08-close-exactness.mjs --self-test` | Plants not red: `ConfirmDialog` re-added; the `closeGroup` write moved back into the click path; the flush commit removed; undo no longer clears the timer; guard removed; `already-closed` → throw | ✅ rewrite | ✅ green |
| SC3: canvas-geometry contract | 22-05 | 5 | `node scripts/verify-gui08-canvas-geometry.mjs --self-test` | `UNDO_CLOSE_MS` or `.pb-org-undo` row drift not red; undo command id not in `EXPECTED_COMMAND_IDS`; label count ≠ 1 | ✅ edit | ✅ green |
| SC3 / PAN-04: Undo restores; timer and quit commit; mode switch keeps the window; tabs hidden in every bar | 22-05 | 5 | `--only pan04-undo-close-group-live` | No undo control after ×; Undo loses title, bounds, membership, order or a tab; no commit after `UNDO_CLOSE_MS`; group back after a quit inside the window; window ended by a mode switch; a pending tab visible in a Coding bar | ❌ W0 | ✅ green |
| PAN-04: NG-006 outcome after the window | 22-05 | 5 | `--only ng-006-close-group-closes-web-tabs` (edited) | Widgets, overlays or the stock tab open after the commit; open member rows | ✅ edit | ✅ green |
| PAN-04: mode switches never close tabs | 22-05 | 5 | `--only gui07-mode-switch-tabs-live` + `-self-test`, `--only gui07-mode-switch-tabs-invariant` + `-self-test` | Any red | ✅ | ✅ green |
| PAN-04: chrome writer unchanged | 22-05 | 5 | `git diff 02ce825 -- powerbrowser/shell/PowerBrowserAPI.sys.mjs` empty; close-exactness chrome-side assertions unchanged | Any diff not justified in the SUMMARY | ✅ | ✅ green |
| SC4 / PAN-05: card × and Delete | 22-06 | 6 | `--only pan05-card-close-live` | Card persists after reload; wrong tab closed; drag starts on the ×; emptied group dissolved; not-open card stays | ❌ W0 | ✅ green |
| SC4 / PAN-05: one tab stop per scope | 22-06 | 6 | `--only gui08-loose-cards-live` (`stops`); `--only pan05-card-close-live` | A tabbable × | ✅ | ✅ green |
| SC4 / PAN-05: card × geometry | 22-06 | 6 | `node scripts/verify-gui08-canvas-geometry.mjs` (`.pb-org-card-close` width and height rows) | Row drift; font size outside 12/13/14 | ✅ edit | ✅ green |
| Commit gate | 22-07 | 7 | `scripts/verify-platform.sh --quick > .planning/phases/22-panorama-worklist/logs/quick-22-07.log 2>&1`; `test ! -s docs/non-gui/quick-baseline.txt` | Any FAIL row; non-empty baseline | ✅ | ✅ green |
| Gate, every plan | all | — | `node scripts/scan-brand-residue.mjs` exits 0 after staging; `python3 scripts/phase-gate.py --root .` prints nothing | Residue hit; `test file changed` without an approved amend | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `scripts/verify-pan03-strip-group-live.mjs` plus 1 full-tier row beside `gui08-loose-cards-live` (22-02), with planted page faults (stub `showsInStrip` to always true; stub `joinActiveGroup` to a no-op) that each go red.
- [x] `scripts/verify-pan04-undo-close-group-live.mjs` plus 1 full-tier row (22-05), with planted page faults (stub `undoCloseGroup`; stub the commit) that each go red.
- [x] `scripts/verify-pan05-card-close-live.mjs` plus 1 full-tier row (22-06), with planted page faults (make the × tabbable; skip the `closeTab` write) that each go red.
- [x] Broadened copy-sink derivation in `verify-gui08-panorama-copy.mjs` with new plants (22-01).
- [x] `verify-gui08-close-exactness.mjs` rewrite and `verify-gui08-canvas-geometry.mjs` edits with plants (22-05).
- [x] `scripts/lib/ng-a-live.mjs`: replace `confirmDialog` with a helper that presses × and waits for or forces the commit (22-05); check `phase-gate.py` after editing it and ng-006.

Commit each new script before its live run (`assertCleanTree`), and `git add` it before `scan-brand-residue`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Copy approval (C1) | PAN-04, PAN-05, held Phase 21 items | New user-facing strings are Chris's call (22-CONTEXT) | Blocking first task of 22-01: present "Undo Close Group", "Undo Close Group "{name}"", "Close tab", the two empty-canvas candidates, and the two WR-05 strings (add verbatim or reword). Record each answer in the SUMMARY |
| Live run on Chris's display (C3) | PAN-03..PAN-06 | Live rows launch the shell; memory `one-fix-at-a-time-confirmed` stops for live checks | Commit; rebuild with `nix develop .#theia --command bash -c 'cd theia && yarn --cwd extensions/modes build && yarn --cwd extensions/chrome-bar build && yarn --cwd applications/browser theia build --app-target=browser --mode development'`; run pan03, pan04, pan05, ng-004, ng-006, ng-007, ng-008, gui02-web-tab-live, gui07-mode-switch-tabs-live and gui08-loose-cards-live with `PB_VERIFY_PORT=3939`. Chris replies `live ok` or reports the failure |
| Visual check of the Undo control and card × | PAN-04, PAN-05 | DOM appearance (centring in the vacated bounds, fade, hover reveal) is not asserted | In C3: screenshot Organising with one group in its undo window and a hovered card (memory `screenshot-pb-on-kde-wayland`) |
| Assumption ratification (C2) | PAN-03, PAN-04, PAN-06 | Design ratification belongs to Chris | End-of-phase verify: A2, A4, A5, A7, A10, A11 and the kept flash; each accepted or overturned |
| Ledger approval (C4), if triggered | PAN-04 | Locked check files and the NG-006 row text change only through `scripts/ledger-amend.py` | Only if `phase-gate.py` prints after the ng-006 / ng-a-live edit |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60 s for static rows (live rows are full tier only)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-10-18 (Nyquist audit, static only)

---

## Validation Audit 2026-10-18

| Metric | Count |
|---|---|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

Static checks re-run in this audit (all exit 0): `verify-gui08-panorama-copy.mjs`, `verify-gui08-canvas-geometry.mjs`, `verify-gui08-close-exactness.mjs` and `verify-gui08-view-parity.mjs`, each with `--self-test`; `scan-brand-residue.mjs`; `phase-gate.py` prints nothing; `docs/non-gui/quick-baseline.txt` is 0 bytes; `grep -F 'drag a tab onto the canvas'` over `theia/extensions/modes/src/browser/*.ts` prints nothing; both retired 15-UI-SPEC sentences count 0; `git diff 02ce825 -- powerbrowser/shell/PowerBrowserAPI.sys.mjs` is empty; `git merge-base --is-ancestor 7cf50ce a328d65` exits 0; `git show --stat 9c7e543` lists 15-UI-SPEC.md and all three gui08 checks. The three Wave 0 live scripts exist and are registered (`pan03-strip-group-live`, `pan04-undo-close-group-live`, `pan05-card-close-live`). Not re-run (static-only audit): `--quick`, the TS builds, and the live rows. Their status cites `logs/`: `quick-22-01..07.log` (each `verify-platform: PASS`, 132 PASS, 0 FAIL), `full-22-07.log` (237 PASS, 2 FAIL; every Phase 22 row named in the map PASS, including pan03/pan04/pan05, ng-004/006/007/008, gui02-web-tab-live, gui07-mode-switch-tabs-live and -invariant with self-tests, gui08-loose-cards-live), `pan04-22-05.log`, `pan05-22-06.log`, `ng006-22-05.log`, and the screenshots `undo-window-22-07.png` and `card-close-22-07.png`.

Notes:
- Plan numbering moved. PAN-03 (strip filter, "+" joins) landed in 22-01 (`a328d65`), and the copy contract and WR-05 sink derivation in 22-02 (`40fad6d`). The PAN-04 UI commit with spec copy and the gui08 checks is `9c7e543` (22-04), not 22-05. Read the map's plan column with that in mind. SC1 is checked against `a328d65`, the first worklist code commit.
- NG-006: the edited `ng-006-close-group-closes-web-tabs` check has green runs (`ng006-22-05.log`, `full-22-07.log`) and no recorded red, because Chris set a check baseline. This is accepted by Chris and is not a gap.
- The full-run FAIL set does not belong to Phase 22. `ng074-ci-green-on-main` is NG-074 (Phase 25, deferred-approved, `22-FAILSET.txt`). `verify-customize-inert` failed once in the full run and passed alone (`rerun-verify-customize-inert-22-07.log`); Phase 22 did not touch customize.
- C1 copy approval came through autonomous mode. Chris replied "just contiune the planed work" to the recommended set, recorded verbatim in 22-01-SUMMARY. He did not word any string.
- Open manual items: C2 ratification of A2, A4, A5, A7, A10, A11 and the kept flash still needs Chris. A10 (last card out dissolves) has only diff evidence (`dissolveEmptied` untouched in `43f91dc`); no live log shows that drag.
