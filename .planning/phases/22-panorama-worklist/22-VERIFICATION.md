---
phase: 22-panorama-worklist
verified: 2026-10-18T16:55:18Z
status: human_needed
score: 14/14 must-haves verified
covered_files:
  - ".planning/milestones/v1.3-phases/15-panorama-organising/15-UI-SPEC.md"
  - ".planning/phases/22-panorama-worklist/22-01-PLAN.md"
  - ".planning/phases/22-panorama-worklist/22-01-SUMMARY.md"
  - ".planning/phases/22-panorama-worklist/22-02-PLAN.md"
  - ".planning/phases/22-panorama-worklist/22-02-SUMMARY.md"
  - ".planning/phases/22-panorama-worklist/22-03-PLAN.md"
  - ".planning/phases/22-panorama-worklist/22-03-SUMMARY.md"
  - ".planning/phases/22-panorama-worklist/22-04-PLAN.md"
  - ".planning/phases/22-panorama-worklist/22-04-SUMMARY.md"
  - ".planning/phases/22-panorama-worklist/22-05-PLAN.md"
  - ".planning/phases/22-panorama-worklist/22-05-SUMMARY.md"
  - ".planning/phases/22-panorama-worklist/22-06-PLAN.md"
  - ".planning/phases/22-panorama-worklist/22-06-SUMMARY.md"
  - ".planning/phases/22-panorama-worklist/22-07-PLAN.md"
  - ".planning/phases/22-panorama-worklist/22-07-SUMMARY.md"
  - ".planning/phases/22-panorama-worklist/22-FAILSET.txt"
  - "docs/non-gui/quick-baseline.txt"
  - "powerbrowser/shell/PowerBrowserAPI.sys.mjs"
  - "scripts/lib/ng-a-live.mjs"
  - "scripts/verify-gui08-canvas-geometry.mjs"
  - "scripts/verify-gui08-close-exactness.mjs"
  - "scripts/verify-gui08-panorama-copy.mjs"
  - "scripts/verify-ng-006-close-group-closes-web-tabs.mjs"
  - "scripts/verify-pan03-strip-group-live.mjs"
  - "scripts/verify-pan04-undo-close-group-live.mjs"
  - "scripts/verify-pan05-card-close-live.mjs"
  - "scripts/verify-platform.sh"
  - "theia/extensions/chrome-bar/src/browser/chrome-bar-commands.ts"
  - "theia/extensions/chrome-bar/src/browser/chrome-bar-widget.tsx"
  - "theia/extensions/chrome-bar/src/browser/chrome-bar.css"
  - "theia/extensions/chrome-bar/src/browser/tab-strip-widget.tsx"
  - "theia/extensions/modes/src/browser/group-model.ts"
  - "theia/extensions/modes/src/browser/modes-frontend-module.ts"
  - "theia/extensions/modes/src/browser/modes.css"
  - "theia/extensions/modes/src/browser/organising-tree.ts"
  - "theia/extensions/modes/src/browser/organising-widget.ts"
  - "theia/extensions/modes/src/browser/panorama-commands.ts"
covered_digest: "v3:sha256:26acae35e6820d3d2a33c096b49ebc7f5de56a34622460724bf6ab4af439146b"
behavior_unverified: 0
overrides_applied: 0
deferred:
  - truth: "phase-gate.py prints nothing (22-04, 22-07 must-have; true at 2b9fd91 and b546b9a)"
    addressed_in: "Phase 23 (plan 23-02)"
    evidence: "phase-gate now prints 'test file changed' for verify-ng-035-custom-mode-layout.mjs and verify-ng-036-setup-dock-layout.mjs. Both files were last changed by 58fa9cb test(23-02), a Phase 23 commit. No Phase 22 commit touches either file. Clearing it needs Chris's re-lock of those hashes, which is Phase 23's step."
human_verification:
  - test: "Open logs/undo-window-22-07.png and logs/card-close-22-07.png (22-07 end-of-phase item 1)"
    expected: "One 'Undo Close Group' control centred where the closed box was; the focused card shows its x in the top-right corner over the preview"
    why_human: "Visual placement and appearance; the live rows assert geometry numbers, not how it looks"
  - test: "Ratify or overturn 22-UI-SPEC assumptions A1 (no dialog), A2 (15 s, no discard x), A4 (quit commits), A5 (current tab stays in strip), A7 ('+' is the only joining path), A10 (last group dissolves on drag-out), A11 (no active-group label), and the flash kept at the click (22-07 item 2)"
    expected: "Each ratified; an overturned item becomes a gap for /gsd-plan-phase 22 --gaps"
    why_human: "Product decisions where research C2 differed from the UI-SPEC"
  - test: "Rule on the recorded open questions (22-07 item 3): a split pane whose every tab is in a closing group keeps its own current tab; a frontend reload during an undo window acts as Undo; closeGroupRows was called unchanged rather than edited"
    expected: "Accepted as recorded, or named as work"
    why_human: "Scope decisions, not code facts"
  - test: "Review-fix failure paths (WR-01, WR-02, WR-03, WR-05): force a failed closeGroup write, a failed '+' join, an activity write during an undo window, and a '+' join that arrives before chrome's web-tab row"
    expected: "WR-01: the group comes back once and Retry closes it; WR-02: the tab stays open and loose; WR-03: Undo does not reactivate the group after another group was made active; WR-05: the join retries once after 500 ms and lands"
    why_human: "No live row plants these failures; 22-REVIEW-FIX.md marks all four 'requires human verification'. The happy paths through the same code pass live (pan04 at HEAD)"
  - test: "Copy decision from WR-02: a failed '+' join in Browsing shows no on-screen feedback, because the save-error bar is drawn only in Organising"
    expected: "Chris words a notice (for example a status-bar message) or accepts console-only reporting"
    why_human: "Needs contracted copy; the fixer added none"
---

# Phase 22: Panorama Worklist Verification Report

**Phase Goal:** The user organises tabs by group from both the strip and the canvas: the strip follows the active group, a closed group can be restored, a card closes in place, and one group always remains
**Verified:** 2026-10-18T16:55:18Z
**Status:** human_needed
**Re-verification:** No, initial verification

## Goal Achievement

Code changed after 22-07's full run (48025d3): the eight review fixes (6c9181b..e17793b) touch chrome-bar-widget.tsx, tab-strip-widget.tsx, group-model.ts, ng-a-live.mjs and the copy gate. 23-02 (8b7f484, ea5301d, 58fa9cb) touches mode-service, setups-service, capped-name-input and ng-035/036, none of which is a Phase 22 file. Because Theia code changed, the sidecar was rebuilt at HEAD e17793b (bundle.js 09:52:07, exit 0) and `pan04-undo-close-group-live` was re-run on port 3939. pan04 is the row whose path crosses the most fixes: CR-02's `pb-group-closing` toggle, WR-01's restructured `commitClose`, WR-03's activity hand-off. It PASSES. pan03 and pan05 evidence is from the 48025d3 full run. `closeCard` and `organising-widget.ts` have no change since that run. `showsInStrip` and the "+" success path through `joinActiveGroup` are unchanged too: the fixes add only the catch branch.

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1 / PAN-02: Chris's decisions 1 and 2 recorded before any worklist code | VERIFIED | 22-CONTEXT.md:25-30 (D1 "Loose allowed, shown in strip", D2 "Browsing only"). `git merge-base --is-ancestor 7cf50ce a328d65` true (18:48 vs 20:38 on 10-17). Every theia/extensions commit in 02ce825..HEAD descends from 7cf50ce (loop printed none) |
| 2 | SC2 / PAN-03: in Browsing the strip shows only the active group's tabs, plus loose and current (D1, D2) | VERIFIED | tab-strip-widget.tsx:555 filters `mainTabs()` by `GroupModel.showsInStrip`, re-renders on `groups.onDidChange` (:105). group-model.ts:286-297. Live pan03 at 48025d3: (b) strip = derived set, B's tab absent; (c) current tab painted; (e) Coding shows all 8 tabs; probe controls 2/2 red |
| 3 | SC2 / PAN-03: a tab opened with "+" joins the active group; W1 and W2 in one change | VERIFIED | chrome-bar-commands.ts:159 awaits `joinActiveGroup`. a328d65 carries the strip filter, the join and the 15-UI-SPEC amendment together. pan03 (a) no group → loose, row group_id null; (d) row carries A's group_id, `getTabs(A)` lists it |
| 4 | 22-01: model loads at layout init without Organising; relaunch keeps the strip filtered | VERIFIED | group-model.ts:217-225 `onDidInitializeLayout`. pan03 (f): "model loaded in 0 ms with Organising never opened; A active ... B's tab filtered out" |
| 5 | SC3 / PAN-04: user closes a group and restores it with Undo Close Group | VERIFIED | group-model.ts:848-890 (`closeGroup` hides and writes nothing, `undoCloseGroup` restores and writes nothing). organising-widget.ts:361-397, :767-822. **Re-run at HEAD e17793b**: pan04 PASS, (a) pending, store untouched; (c) Undo restores index, bounds, card order, activity, store unchanged; (d) still pending at 12007 ms, committed at 15061 ms; (e) hidden in every bar in Browsing and Coding; (f) quit in the window commits, relaunch has no G4; (g) canvas and tree Undo control focused, label "Undo Close Group"; probe controls 5/5 red |
| 6 | SC3: spec copy and the gui08 checks change in the same commit as the UI, and pass | VERIFIED | `git show --stat 9c7e543`: 15-UI-SPEC.md, verify-gui08-canvas-geometry/close-exactness/panorama-copy.mjs, modes.css, organising-widget.ts, panorama-commands.ts. At HEAD with `--only`: canvas-geometry PASS (20 const, 10 CSS rows), self-test 19 plants red; panorama-copy PASS (31 = 31, 7 retired absent), self-test 16 plants red; close-exactness PASS, self-test 10 plants red |
| 7 | 22-03: the chrome-side writer is unchanged; the close is written only in commitClose, by timer or quit flush | VERIFIED | `git diff --stat 02ce825 HEAD -- powerbrowser/shell/PowerBrowserAPI.sys.mjs` empty. group-model.ts:865-868 timer, :224 `onWillFlush` → `commitAllClosing`, :925 `kind: 'closeGroup'` only in `commitClose`. close-exactness PASS names each |
| 8 | 22-04: ng-006 closes the group's web tabs when the window ends | VERIFIED (red accepted) | Full run 48025d3: `ng-006-close-group-closes-web-tabs: PASS`. Its missing post-edit red is covered by Chris's `baseline-checks` (ledger v393, 2b9fd91); classified as accepted, per the orchestrator. WR-04 edited only the unlocked helper `closeGroupCommitted` (ng-a-live.mjs) after that run |
| 9 | SC4 / PAN-05: user closes a card from the card itself | VERIFIED | organising-widget.ts:996-1016 (Delete key; `.pb-org-card-close`, tabIndex -1, label "Close tab", pointerdown/dblclick stopped); group-model.ts:982-1004 `closeCard` via `shell.closeWidget` or the `closeTab` mutation. Live pan05 at 48025d3: (a) x closes exactly /a, row closed; (b) no drag, no dive; (c) Delete moves focus to the next card; (d) dirty-editor prompt, Cancel keeps it; (e) not-open card row closed; (f) emptied group stays, no membership write; (g) one tab stop per scope; probe controls 2/2 red |
| 10 | SC5 / PAN-06: user cannot close the last remaining group | VERIFIED | group-model.ts:446-448 `canCloseGroup`, :849 guard; organising-widget.ts:363, :863, :1087 `closable`; organising-tree.ts:30-31, :53. pan04 at HEAD (h): one visible group has no x on box or section; close-group on it: not pending, 0 Undo controls, no flash; a second group brings both x back; a group in its window does not count |
| 11 | One membership reader; A.cardKey rows stay green | VERIFIED | `--only gui08-view-parity` PASS and self-test PASS ("one model, widget-owned tree renders"). Full run 48025d3: ng-004, ng-007, ng-008, gui08-loose-cards-live PASS |
| 12 | 15-UI-SPEC carries the strip-filter binding sentence, E11..E13 and the Phase 22 rows | VERIFIED | 15-UI-SPEC:24-27 (active group's tabs, loose, current; Coding and Organising not filtered), :134, :144-148, :268-270 (C1 items 1-3), :292-294 retired dialog copy, :373-, :438, :463-466 |
| 13 | Chris's copy answers precede the shipped copy | VERIFIED | d1de837 adds 22-01-SUMMARY "Copy answers (C1)" (:116-132); per the orchestrator these are Chris's committed answers. 40fad6c (22-02) and 9c7e543 (22-04) are its descendants |
| 14 | 22-07: one rebuilt sidecar runs the full suite; derived FAIL set holds only owned reds; `--quick` green, baseline empty | VERIFIED | full-22-07.log at 48025d3: summary FAIL only `verify-customize-inert` (PASS alone in the rerun log) and `ng074-ci-green-on-main`. 22-FAILSET.txt = `ng074-ci-green-on-main	NG-074 (Phase 25)`. `--quick` re-run once at HEAD e17793b: 135 PASS, 0 FAIL, exit 0. quick-baseline.txt 0 bytes. `plan-gate.py --phase 22 --plans ...`: "plan gate passed: 2/2 IDs cited" |

**Score:** 14/14 truths verified (0 present, behavior-unverified)

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | phase-gate.py silent | Phase 23 (23-02) | It now prints `test file changed` for ng-035 and ng-036, both changed by 58fa9cb test(23-02). No Phase 22 commit touches them. Needs Chris's re-lock |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `theia/extensions/modes/src/browser/group-model.ts` | showsInStrip, joinActiveGroup, UNDO_CLOSE_MS, closing map, commitClose, commitAllClosing, canCloseGroup, closeCard | VERIFIED | All present, substantive, used by strip, commands and widget |
| `theia/extensions/chrome-bar/src/browser/tab-strip-widget.tsx` | Filters by showsInStrip; toggles only its own classes | VERIFIED | :555, :566-575 (CR-02) |
| `theia/extensions/chrome-bar/src/browser/chrome-bar-commands.ts` | New Tab awaits joinActiveGroup | VERIFIED | :159 |
| `theia/extensions/modes/src/browser/organising-widget.ts` | Undo control, no dialog, card x, Delete, closable | VERIFIED | :361-397, :767-822, :863, :996-1016, :1087 |
| `theia/extensions/modes/src/browser/panorama-commands.ts` | `powerbrowser.panorama.undo-close-group` | VERIFIED | :21 |
| `scripts/verify-pan03-strip-group-live.mjs` | Live strip row with probe controls | VERIFIED | PASS in full run, 2 probe controls |
| `scripts/verify-pan04-undo-close-group-live.mjs` | Live undo-window row with probe controls | VERIFIED | PASS at HEAD, 5 probe controls |
| `scripts/verify-pan05-card-close-live.mjs` | Live card-close row with probe controls | VERIFIED | PASS in full run, 2 probe controls |
| `scripts/verify-gui08-close-exactness.mjs` | Deferred-close contract, derived, planted | VERIFIED | PASS; 10 plants |
| `scripts/verify-gui08-panorama-copy.mjs` | Copy over every text sink, incl. aria-valuetext and double quotes | VERIFIED | PASS; 16 plants |
| `.planning/phases/22-panorama-worklist/22-FAILSET.txt` | Derived, owned reds only | VERIFIED | one line, NG-074 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| tab-strip-widget.tsx | group-model.ts | `showsInStrip`, `onDidChange` | WIRED | :105, :555 |
| chrome-bar-commands.ts | group-model.ts | `joinActiveGroup` on the opened widget | WIRED | :159 |
| group-model.ts | PowerBrowserAPI.sys.mjs | `{ kind: 'closeGroup', id }` to unchanged `closeGroupRows` | WIRED | :925; writer diff empty since 02ce825 |
| group-model.ts | profile-storage.ts | `onWillFlush` awaits `commitAllClosing` | WIRED | :224; pan04 (f) at HEAD |
| organising-widget.ts | group-model.ts | `listClosing` / `undoCloseGroup`; `closeGroupById` never calls `commitClose` | WIRED | :767, :791, :384; close-exactness PASS |
| ng-a-live.mjs | verify-ng-006 | `closeGroupCommitted` | WIRED | ng-006 PASS in full run |
| organising-tree.ts | organising-widget.ts | `TreeSectionHooks.closable` from `canCloseGroup` | WIRED | :1087; view-parity PASS |
| organising-widget.ts | group-model.ts | card x and Delete call `closeCard` | WIRED | :1035 |
| 22-FAILSET.txt | 19-FAILSET-1.76.txt | owner `NG-074 (Phase 25)` | WIRED | |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| tab-strip-widget.tsx render | `tabs` | `mainTabs()` filtered by membership loaded from tabs.sqlite through the reader | Yes: pan03 compares the strip with the model's membership reads and the store rows | FLOWING |
| organising-widget.ts Undo control | `listClosing()` | the model's `closing` map set by `closeGroup` | Yes: pan04 (g) at HEAD | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Geometry gate + self-test | `--only gui08-canvas-geometry[-self-test]` | PASS; 19 plants red | PASS |
| Copy gate + self-test | `--only gui08-panorama-copy[-self-test]` | PASS 31 = 31; 16 plants red | PASS |
| Close exactness + self-test | `--only gui08-close-exactness[-self-test]` | PASS; 10 plants red | PASS |
| View parity + self-test | `--only gui08-view-parity[-self-test]` | PASS; 4 fault directions red | PASS |
| Persistence roundtrip + self-test | `--only gui08-persistence-roundtrip[-self-test]` | PASS; 9 fault directions red | PASS |
| Commit gate | `scripts/verify-platform.sh --quick` (once, HEAD e17793b) | 135 PASS, 0 FAIL, exit 0 | PASS |
| Sidecar rebuild | `nix develop .#theia --command bash -c "cd theia && yarn build"` | exit 0, bundle.js 09:52:07 | PASS |
| Live undo window at HEAD | `PB_NG_ALLOW_DIRTY=1 PB_VERIFY_PORT=3939 scripts/verify-platform.sh --only pan04-undo-close-group-live` | PASS, 5 probe controls red | PASS |
| Live strip, card close | Not re-run (one live row allowed); full-22-07.log at 48025d3 | pan03 PASS, pan05 PASS | PASS (carried) |
| Ledger | `python3 scripts/ledger-report.py --root .` | 88 rows: done=55, deferred-approved=9, dropped=24, due=0 | PASS |

The first pan04 attempt refused to start: the tree had one uncommitted tracked file, another session's `22-VALIDATION.md` (not code). The rerun used `PB_NG_ALLOW_DIRTY=1`, as 22-REVIEW-FIX did.

### Probe Execution

Not applicable. The phase declares no `scripts/*/tests/probe-*.sh`; its verification is the registry rows above.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PAN-02 | 22-01 | Decisions 1 and 2 recorded before code | SATISFIED | Truth 1 |
| PAN-03 | 22-01 | Strip shows the active group's tabs; "+" joins it | SATISFIED | Truths 2, 3, 4, 11 |
| PAN-04 | 22-02, 22-03, 22-04 | Undo Close Group restores a closed group | SATISFIED | Truths 5, 6, 7, 8 |
| PAN-05 | 22-02, 22-06 | Close a card from the card | SATISFIED | Truth 9 |
| PAN-06 | 22-05 | The last remaining group cannot be closed | SATISFIED | Truth 10 |

No orphaned requirements. REQUIREMENTS.md still shows PAN-02..06 as Pending (:66-72, :147-151); marking them is the phase-close step.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| Phase 22 files | - | TBD/FIXME/XXX | - | None; the two `XXX` hits in verify-gui08-panorama-copy.mjs are `\uXXXX` notation |
| group-model.ts | 323, 334 | Failed "+" join gives no on-screen feedback in Browsing (WR-02) | Warning | Human item 5 (copy decision) |
| group-model.ts | 913-951 | Failure paths WR-01/02/03/05 have no live row | Warning | Human item 4 |
| 22-REVIEW.md | IN-01..IN-04 | Info findings left out of the fix scope (repeated organising id, listener-order dependency, unscoped close-exactness anchors, a pending-only bar showing hidden content) | Info | IN-04 matches the recorded open question in human item 3 |
| scripts/phase-gate.py output | - | ng-035/ng-036 hash drift from 58fa9cb (Phase 23) | Warning | Deferred item 1; the ledger completion gate fails until Chris re-locks |
| logs/ | - | pan03, pan05, ng-006 last ran live at 48025d3, before CR-02, WR-02, WR-04, WR-05 | Info | The fixer reports them PASS after the fixes but left no log; the next full-tier run covers them |

### Human Verification Required

1. **Screenshots** — open logs/undo-window-22-07.png and logs/card-close-22-07.png. Expected: one centred "Undo Close Group" control; the card x in the top-right corner. Why human: visual.
2. **Ratify assumptions** A1, A2, A4, A5, A7, A10, A11 and the flash at the click. An overturned item becomes a gap. Why human: product decisions.
3. **Open questions**: split-pane current tab, a reload during the window acts as Undo, closeGroupRows called unchanged. Why human: scope.
4. **Review-fix failure paths** WR-01, WR-02, WR-03, WR-05. Expected: see the frontmatter. Why human: no live row plants these failures.
5. **WR-02 copy**: what a failed "+" join in Browsing should say, if anything. Why human: contracted copy.

Items 1-3 are the 22-07 end-of-phase `<human-check>` block, which says "nothing here blocks". Items 4-5 come from 22-REVIEW-FIX.md.

### Gaps Summary

No gaps. All 5 ROADMAP success criteria and PAN-02..PAN-06 hold in the tree. The gui08 rows and their self-tests pass at HEAD, `--quick` passes at HEAD, and the live undo-window row passes on a sidecar rebuilt after the review fixes. Status is human_needed only because of the harvested end-of-phase review and the four unexercised failure paths. phase-gate's current output comes from Phase 23's 58fa9cb, not from Phase 22.

---

_Verified: 2026-10-18T16:55:18Z_
_Verifier: Claude (gsd-verifier)_
