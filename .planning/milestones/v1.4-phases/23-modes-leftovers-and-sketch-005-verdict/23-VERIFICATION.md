---
phase: 23-modes-leftovers-and-sketch-005-verdict
verified: 2026-10-19T05:10:13Z
status: passed
score: 14/14 must-haves verified
covered_files:
  - ".planning/GUI-DEFECTS.md"
  - ".planning/milestones/v1.3-REQUIREMENTS.md"
  - ".planning/milestones/v1.3-phases/14-modes-windows-setups/14-UAT.md"
  - ".planning/milestones/v1.3-phases/14-modes-windows-setups/14-UI-SPEC.md"
  - ".planning/milestones/v1.3-phases/14.1.1-gui-conformance-sweep/14.1.1-UAT.md"
  - ".planning/phases/23-modes-leftovers-and-sketch-005-verdict/23-01-PLAN.md"
  - ".planning/phases/23-modes-leftovers-and-sketch-005-verdict/23-01-SUMMARY.md"
  - ".planning/phases/23-modes-leftovers-and-sketch-005-verdict/23-02-PLAN.md"
  - ".planning/phases/23-modes-leftovers-and-sketch-005-verdict/23-02-SUMMARY.md"
  - ".planning/phases/23-modes-leftovers-and-sketch-005-verdict/23-03-PLAN.md"
  - ".planning/phases/23-modes-leftovers-and-sketch-005-verdict/23-03-SUMMARY.md"
  - ".planning/phases/23-modes-leftovers-and-sketch-005-verdict/23-04-PLAN.md"
  - ".planning/phases/23-modes-leftovers-and-sketch-005-verdict/23-04-SUMMARY.md"
  - ".planning/phases/23-modes-leftovers-and-sketch-005-verdict/23-05-PLAN.md"
  - ".planning/phases/23-modes-leftovers-and-sketch-005-verdict/23-05-SUMMARY.md"
  - ".planning/sketches/005-vscode-layout/README.md"
  - ".planning/sketches/005-vscode-layout/index.html"
  - ".planning/sketches/MANIFEST.md"
  - "docs/non-gui/quick-baseline.txt"
  - "scripts/verify-name-cap-at-input-live.mjs"
  - "scripts/verify-name-cap-at-input.mjs"
  - "scripts/verify-ng-035-custom-mode-layout.mjs"
  - "scripts/verify-ng-036-setup-dock-layout.mjs"
  - "scripts/verify-panel-motion.mjs"
  - "scripts/verify-platform.sh"
  - "theia/extensions/chrome-bar/src/browser/chrome-bar-frontend-module.ts"
  - "theia/extensions/modes/src/browser/capped-name-input.ts"
  - "theia/extensions/modes/src/browser/mode-descriptors.ts"
  - "theia/extensions/modes/src/browser/mode-service.ts"
  - "theia/extensions/modes/src/browser/setups-service.ts"
covered_digest: "v3:sha256:39e0292e10ec001ec679aad5ae144fbb69aa5284d895f4dac69af23b6142f9ca"
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "23-05: 14-VERIFICATION.md has a covered_digest that the verification.fingerprint seam reproduces from the file's own covered_files"
    status: failed
    reason: "The four review-fix commits after 8d285a7 edited four files 14-VERIFICATION covers: 5dd622e scripts/verify-panel-motion.mjs, 863037b capped-name-input.ts, 5d1a461 and bcdf102 scripts/verify-name-cap-at-input.mjs, bcdf102 14-UI-SPEC.md. Re-deriving from the report's own covered_files now gives v3:sha256:61ab77f5649a49846158efc06ee84863c4175fdf92864fec680c7bf28c5ca649. The report records 617b930e...e298eb. `verification.status` on the Phase 14 directory prints `stale`."
    artifacts:
      - path: ".planning/milestones/v1.3-phases/14-modes-windows-setups/14-VERIFICATION.md"
        issue: "covered_digest stale; truth 12 cites 'self-test (8 plants' for modes-panel-motion, which has 9 since WR-01"
    missing:
      - "Re-run `gsd-tools query verification.fingerprint .planning/milestones/v1.3-phases/14-modes-windows-setups <cited files>` and copy covered_files and covered_digest verbatim"
      - "Update the modes-panel-motion plant count from 8 to 9 (and modes-name-cap-at-input to 10 if it is cited) where 14-VERIFICATION quotes it"
deferred:
  - truth: "SC1 second half / MODE-01: Chris has confirmed the strip relocation live (G-11)"
    addressed_in: "Phase 24"
    evidence: "Handed by design (ROADMAP:315 'open: live confirmation of the strip relocation (G-11, MODE-01), handed to the Phase 24 session'). Phase 24 SC2: 'The 10, 13, 14, 14.1, 14.1.1 and 15 UAT sheets have no pending result'; 14.1.1-UAT test 11 and 14-UAT test 3 are pending for it"
human_verification:
  - test: "Save as Mode and Save Setup: type past 60 characters, paste a long string, insert mid-string into a full field, then press Enter (23-05 end-of-phase item 1)"
    expected: "The field stops at 60, the caret sits at the end, the 60-character name saves. Ratify 23-UI-SPEC A1 (cut tail, caret to end) or ask for a refused insert"
    why_human: "The live row sets values programmatically; caret feel and the A1 choice are Chris's"
  - test: "Browsing -> Coding -> Browsing round trip in the built shell (23-03 and 23-05 end-of-phase item 2)"
    expected: "Side panels open and close at once, as chosen for G-32 option a"
    why_human: "Visual; the gate derives the motion from spec and code, it does not watch the window"
  - test: "Optional: rename the v1.5 milestone 'Coding Workbench Layout' (23-05 item 4)"
    expected: "Kept, or renamed in ROADMAP, REQUIREMENTS, PROJECT and the sketch README"
    why_human: "The orchestrator took the proposed name; Chris gave none"
---

# Phase 23: Modes Leftovers and Sketch 005 Verdict Verification Report

**Phase Goal:** The Phase 14 / 14.1.1 leftovers are closed with records that match the shipped behaviour, and the sketch 005 verdict fixes the layout that UAT will test
**Verified:** 2026-10-19T05:10:13Z
**Status:** gaps_found
**Re-verification:** No, initial verification

## Goal Achievement

HEAD is bcdf102. Four review-fix commits landed after 23-05's closing gate: 5dd622e (WR-01), 863037b (WR-02), 5d1a461 (WR-03) and bcdf102 (WR-04). 863037b changes `capped-name-input.ts`, so the sidecar was rebuilt at HEAD (`nix develop .#theia`, `yarn build`, exit 0, bundle.js 22:08:32). Then `modes-name-cap-at-input-live` was re-run on port 3939, and it PASSES. Every static row and self-test named below was run at HEAD, and `--quick` was run once.

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1 / MODE-01: the five Variant B records are current: 14.1.1-UAT test 11 and G-14.1.1-11, GUI-DEFECTS item 2, the GUI-07 box, the `mode-descriptors.ts` comment, and 14-UAT test 3 | VERIFIED | `mode-descriptors.ts:13-20`: the strip changes home per mode, and the chrome bar owns it (`applyStripHome`, chrome-bar-widget.tsx:825). 14.1.1-UAT:151-160: test 11 is titled Variant B, lists the three homes, cites 539ba36 (a real commit, 2026-09-08, which touches chrome-bar-widget.tsx and tab-strip-widget.tsx), and is pending. :684-700: G-11 is `in_tree` with its truth line unchanged plus a `truth_correction`. GUI-DEFECTS:29: item 2 is `IN TREE` in "Fixed in the tree". v1.3-REQUIREMENTS:46-52: a status note on the unchecked GUI-07 box. 14-UAT test 3 is titled "relocates per mode (Variant B)" and is pending. The cited spec lines (:22, :249, :256-260) say what the records claim |
| 2 | 23-01: the descriptor change is comment-only, and the five checks that read the file pass with their self-tests | VERIFIED | Run at HEAD, plain and with `--self-test`, all exit 0: mode-toggle-commands, mode-switch-tabs-invariant, gui08-panorama-copy, gui08-view-parity, dependent-window-content |
| 3 | SC2 / MODE-02: a mode or setup name longer than 60 characters is cut at the cap while typing, as Chris decided | VERIFIED | capped-name-input.ts uses stock `createInputBox()` and cuts with `onDidChangeValue` to `value.slice(0, max)`. mode-service.ts:445 and setups-service.ts:582 call it with MODE_NAME_MAX and SETUP_NAME_MAX (both 60), and the backstops at :449 and :586 stay. No `.input(` call is left in modes/src/browser. **Live at HEAD, rebuilt sidecar, port 3939**: both inputs read 70 characters back as 60, a mid-string insert keeps the first 60, the stored name is 60 characters, and the accept path is `MonacoQuickInputImplementation.accept()`. Probe control: the stock input held 70 |
| 4 | SC2: 14-UI-SPEC states the rule, and the check derives it from the spec and the code | VERIFIED | 14-UI-SPEC:273, :314, :358 state "while typing" and the first 60 kept (WR-04 wording). `--only modes-name-cap-at-input` PASS. Self-test PASS: 10 plants red, each naming its drift |
| 5 | 23-02: no new user-facing string; the commit backstop stays | VERIFIED | Both `{ prompt, placeHolder }` literals are present. `gui09-setups-copy`, `shell-error-copy-no-internals` and `gui09-setup-roundtrip` PASS, with their self-tests, in the `--quick` run |
| 6 | 23-02: ng-035 and ng-036 answer the real capped input and pass; phase-gate prints nothing | VERIFIED | phase-gate.py prints nothing (exit 0), and check-ledger.py prints nothing. Ledger: NG-035 and NG-036 are `done`; Chris's re-lock is at 5a5606c. The ng-035 and ng-036 PASS comes from logs/ng03{5,6}-23-02.log (`PHASE23_EXIT=0`) and from 23-REVIEW-FIX's re-run. Neither file has changed since 58fa9cb. Not re-run here: one live row only |
| 7 | SC3 / MODE-03: side panels switch instantly (G-32 option a), and 14-UI-SPEC describes that | VERIFIED | 14-UI-SPEC:17, :197-198, :365 say "switch instantly", and `grep -i slid` finds nothing. In the code, stock `DEFAULT_OPTIONS` sets `expandDuration: 0` for the bottom, left and right panels (application-shell.js:2077-2092). The one rebind (chrome-bar-frontend-module.ts:53-57) sets only `expandThreshold: 0`. `--only modes-panel-motion` PASS, kind=a. Self-test PASS: 9 plants red, including WR-01's plant 9, a stock re-pin to 150 |
| 8 | 23-03: exactly one ApplicationShellOptions rebind, every panel keeps `expandThreshold: 0`, Theia core is untouched | VERIFIED | `git grep 'rebind(ApplicationShellOptions)'` finds one site. `--only diff-theia-core` PASS. `git -C upstream diff --quiet` exits 0 |
| 9 | 23-04: Chris's G-32 answer was recorded before any G-32 code or spec change | VERIFIED | 985afa9 (21:21, the Needs Chris line, ROADMAP:315 "G-32 chosen by Chris 2026-10-18: a") is an ancestor of c86f432 (21:26, the spec change). The theia/ and 14-UI-SPEC commits before 985afa9 belong to Phase 22 and G-23 (ea5301d, the name lines only). The answer "a" is quoted in 23-04-SUMMARY:423. 23-CONTEXT.md still reads "G-32 OPEN", because it is the discuss-time snapshot (Info) |
| 10 | 23-01: tests 23 and 32 and gaps G-23 and G-32 record the decisions and cite the 23-02 and 23-03 commits; both UAT Summary blocks equal a recount | VERIFIED | 14.1.1-UAT: G-23 is `fixed`, `closed_by` cites 8b7f484 and ea5301d, and no `deferred_to`. G-32 is `fixed`, carries a `truth_correction`, cites c86f432, and its root cause is stock `expandDuration: 0`. Recount, results: 32 issue, 16 pending, which matches. Fixability: yes 21, decision 5, needs-chris 9, the same ids as the Summary. 14-UAT: 5 issue, 4 pending, 1 superseded, which matches |
| 11 | SC4 / MODE-04: `14-VERIFICATION.md` exists and scores the 25 Phase 14 truths, with overrides on dated owner decisions | VERIFIED | Tracked. `status: human_needed`, `score: 17/25`. The five overrides each name an owner record and a date. The 14-02 slide override cites ROADMAP:315 and c86f432 |
| 12 | 23-05: 14-VERIFICATION's covered_digest is reproduced by the seam from its own covered_files | **FAILED** | Re-derived at HEAD: `61ab77f5...a649`. Recorded: `617b930e...e298eb`. `verification.status` prints `stale`. Cause: WR-01 to WR-04 changed four covered files after 8d285a7 |
| 13 | SC5 / SK-01: sketch 005 is committed with a MANIFEST row, and Chris's verdict is recorded before Phase 24 starts | VERIFIED | `git ls-files` lists index.html and README.md (68bf812, 2026-10-17). MANIFEST:23 has the one 005 row in five columns. README "Verdict": adopted into v1.5, the four items named by the legend's exact `chg` labels (index.html:159-162), item 3's toggle placement open, nothing built in v1.4, Phase 24 tests today's layout. Phase 24 has no plans yet |
| 14 | 23-04 and 23-05: v1.5 is named in ROADMAP, REQUIREMENTS and PROJECT; criterion 2 and MODE-02 say mode or setup name; `--quick` is green with an empty baseline; the ledger gates are silent; NG-074 and NG-084 are carried | VERIFIED | ROADMAP:10, REQUIREMENTS:109, PROJECT:173 and :266. ROADMAP:319 and REQUIREMENTS:80 say mode or setup name. `--quick` run once at HEAD: 136 PASS, 0 FAIL, exit 0, 61 s. quick-baseline.txt is 0 bytes. plan-gate: "2/2 IDs cited (phase 23)". NG-074 and NG-084 are `deferred-approved` |

**Score:** 13/14 truths verified (0 present, behavior-unverified). The G-11 live confirmation is deferred to Phase 24 and not scored.

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | SC1 / MODE-01: Chris confirms the strip relocation live (G-11) | Phase 24 | Handed off by design (ROADMAP:315). Phase 24 SC2 requires 14.1.1-UAT and 14-UAT to have no pending result, and test 11 and test 3 are pending for it |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `theia/extensions/modes/src/browser/capped-name-input.ts` | `inputCappedName` over `createInputBox()`, cut at max | VERIFIED | 31 lines, used by both services |
| `scripts/verify-name-cap-at-input.mjs` | Derived caps, spec rule, call sites, plants | VERIFIED | PASS; 10 plants |
| `scripts/verify-name-cap-at-input-live.mjs` | Live cut on both inputs plus probe control | VERIFIED | PASS at HEAD |
| `scripts/verify-panel-motion.mjs` | Spec motion equals code motion, branch plants | VERIFIED | PASS kind=a; 9 plants |
| `.planning/milestones/v1.3-phases/14-modes-windows-setups/14-UI-SPEC.md` | Name rule and instant Motion | VERIFIED | :197, :273, :314, :358, :365 |
| `.planning/milestones/v1.3-phases/14.1.1-gui-conformance-sweep/14.1.1-UAT.md` | Tests 11, 23, 32 and gaps current, Summary recounted | VERIFIED | See truths 1 and 10. Two warnings below |
| `.planning/GUI-DEFECTS.md` | Item 2 IN TREE with the Phase 24 hand-off | VERIFIED | :29 |
| `.planning/milestones/v1.3-phases/14-modes-windows-setups/14-VERIFICATION.md` | Retroactive report with a reproducible digest | STALE | Exists, but the digest no longer reproduces (gap) |
| `.planning/sketches/005-vscode-layout/README.md` | SK-01 verdict | VERIFIED | Contains "adopted into v1.5" |
| `.planning/sketches/MANIFEST.md` | The 005 row | VERIFIED | :23 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| mode-service.ts | capped-name-input.ts | `inputCappedName(this.quickInput, ...)` | WIRED | :19 import, :445 call |
| setups-service.ts | capped-name-input.ts | `inputCappedName(this.quickInput, ...)` | WIRED | :32 import, :582 call |
| verify-name-cap-at-input.mjs | 14-UI-SPEC.md | "while typing" and the cap numbers on the three rule lines | WIRED | Plants 6, 7 and 10 go red when the spec drifts |
| verify-panel-motion.mjs | chrome-bar-frontend-module.ts and stock DEFAULT_OPTIONS | Per-panel expandDuration, inherited from stock when absent | WIRED | Plant 9 goes red on a stock re-pin |
| 14.1.1-UAT.md | 23-02 and 23-03 commits | `closed_by` hashes | WIRED | 8b7f484, ea5301d and c86f432 resolve |
| sketch README | sketch index.html | The four `chg` legend labels | WIRED | Exact labels |
| 14-VERIFICATION.md | `verification.fingerprint` | covered_digest | BROKEN | Stale since the review fixes |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| Save as Mode and Save Setup input | `box.value` | the user's typed or pasted value, cut in `onDidChangeValue` | Yes: the live row reads the stored name back from the store | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Name cap gate + self-test | `--only modes-name-cap-at-input[-self-test]` | PASS; 10 plants red | PASS |
| Panel motion gate + self-test | `--only modes-panel-motion[-self-test]` | PASS kind=a; 9 plants red | PASS |
| Descriptor readers + setups rows | `node scripts/verify-{mode-toggle-commands,mode-switch-tabs-invariant,gui08-panorama-copy,gui08-view-parity,dependent-window-content,gui09-setups-copy,setup-roundtrip}.mjs [--self-test]` | all exit 0 | PASS |
| Theia core untouched | `--only diff-theia-core`; `git -C upstream diff --quiet` | PASS; exit 0 | PASS |
| Sidecar rebuild | `nix develop .#theia --command bash -c "cd theia && yarn build"` | exit 0, 9 s | PASS |
| Live name cap at HEAD | `PB_NG_ALLOW_DIRTY=1 PB_VERIFY_PORT=3939 scripts/verify-platform.sh --only modes-name-cap-at-input-live` | PASS, probe control held 70 | PASS |
| Commit gate | `PB_VERIFY_PORT=3939 scripts/verify-platform.sh --quick` (once) | 136 PASS, 0 FAIL, exit 0 | PASS |
| Ledger gates | phase-gate.py, check-ledger.py, plan-gate.py --phase 23, ledger-report.py | silent, silent, "2/2 IDs cited", due=0 | PASS |
| Brand scan | `node scripts/scan-brand-residue.mjs` | PASS over 364 files | PASS |
| 14-VERIFICATION seam | `gsd-tools query verification.fingerprint` over its covered_files; `verification.status` | digest differs; `stale` | FAIL |

`PB_NG_ALLOW_DIRTY=1` was needed because another session left one tracked file uncommitted (23-VALIDATION.md, not code).

### Probe Execution

Not applicable. The phase declares no `scripts/*/tests/probe-*.sh`; its verification is the registry rows above.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| MODE-01 | 23-01 | Variant B records current; Chris confirms the relocation live | SATISFIED (records); live half deferred to Phase 24 | Truths 1, 2; Deferred 1 |
| MODE-02 | 23-02, 23-01, 23-04 | Name cap decided and applied | SATISFIED | Truths 3-6, 10 |
| MODE-03 | 23-03, 23-01, 23-04 | Panels as Chris decides, 14-UI-SPEC matches | SATISFIED | Truths 7-10 |
| MODE-04 | 23-05 | 14-VERIFICATION is written | SATISFIED with a gap | Truth 11 holds. Truth 12 (the plan's own digest must-have) fails |
| SK-01 | 23-04 | Sketch 005 verdict recorded before UAT | SATISFIED | Truths 13, 14 |

No orphaned requirements. REQUIREMENTS.md still shows all five as Pending (:77-88, :153-157). The ROADMAP Phase 23 block still shows 2/5 and unchecked boxes for 23-03, 23-01 and 23-05 (:324, :336-344, :384). Updating those is the phase-close step.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| Phase 23 files | - | TBD/FIXME/XXX | - | None found |
| 14-VERIFICATION.md | frontmatter, truth 12 | Stale digest; "8 plants" where there are now 9 | Blocker | The gap above |
| 14.1.1-UAT.md | 359 | Test 32 is still titled "Side panels slide on a mode switch", while its expected line says instant | Warning | A record that does not match shipped behaviour. Test 11's title was corrected; 32's was not |
| 14.1.1-UAT.md | 691 | G-14.1.1-11 `reason:` still reads "the ratified 14-UI-SPEC says the strip never moves. Item 2 is OPEN pending a Variant-B re-probe" | Warning | Pre-decision text in an `in_tree` gap. Root cause and truth_correction are current |
| 14.1.1-UAT.md | G-32 `closed_by`, test 32 evidence | "eight planted faults" (now nine) | Info | Count drift after WR-01 |
| 23-CONTEXT.md | 30 | "G-32 / MODE-03: **OPEN**" | Info | Discuss-time snapshot. The answer is on ROADMAP:315 and in 23-04-SUMMARY |
| capped-name-input.ts | 12 | `shortcut:` caret moves to the end (23-UI-SPEC A1) | Info | Recorded limit; Chris's call (human item 1) |
| 23-REVIEW.md | IN-01..IN-06 | Info findings outside the fix scope; IN-01 and IN-02 sit in hash-locked ng files | Info | Needs Chris's re-lock if pursued |

### Human Verification Required

1. **Name cap feel and A1.** Type past 60, paste, and insert mid-string in Save as Mode and Save Setup, then press Enter. Expected: the field stops at 60, the caret is at the end, the 60-character name saves. Ratify A1 or ask for a refused insert. Why human: the live row sets values in code.
2. **Instant panels.** Do a Browsing → Coding → Browsing round trip. Expected: the panels change at once. Why human: visual.
3. **Optional v1.5 name.** Keep "Coding Workbench Layout" or rename it. Why human: the orchestrator chose it.

All three come from the 23-03 and 23-05 end-of-phase `<human-check>` blocks, which say nothing here blocks. Item 3 of 23-05's block (G-11, 14-UAT tests 3/5/7/8, 14.1.1 tests 11/23/32) belongs to Phase 24 and is listed under Deferred.

### Gaps Summary

One gap, with a mechanical fix. The phase goal holds in the tree on every other must-have. The five Variant B records describe 539ba36. The G-23 cut-while-typing rule ships and passes live at HEAD on a rebuilt sidecar. The G-32 option a matches stock `expandDuration: 0`, and the spec and a planted gate hold it there. 14-VERIFICATION exists. Sketch 005 and its verdict are committed before Phase 24. `--quick` is 136/0 with an empty baseline. The gap is 23-05's own must-have: the review fixes after 8d285a7 changed four files 14-VERIFICATION covers, so its `covered_digest` no longer reproduces and `verification.status` reports it `stale`. To close it, re-run the fingerprint seam over the report's cited files, copy covered_files and covered_digest verbatim, and update the plant count it quotes (8 to 9). While that file is open, the two Warning rows in 14.1.1-UAT (test 32's title, G-11's `reason:`) are one-line record corrections in the same spirit as MODE-01.

---

_Verified: 2026-10-19T05:10:13Z_
_Verifier: Claude (gsd-verifier)_


## Gap closure (orchestrator, 2026-10-19)

The one gap is closed. 14-VERIFICATION's `covered_digest` was re-derived with `verification.fingerprint` over its own `covered_files`, giving `v3:sha256:61ab77f5…a649`, and the modes-panel-motion plant count now reads 9. The warnings are also fixed: 14.1.1-UAT test 32 is retitled "Side panels switch instantly on a mode switch", the G-14.1.1-11 `reason:` is restated, the G-32 `closed_by` count reads nine, and 23-CONTEXT records G-32 as decided ("a"). Re-run: modes-panel-motion PASS (kind=a), planning-paths PASS.
