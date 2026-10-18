---
phase: 22-panorama-worklist
plan: 02
subsystem: ui
tags: [theia, panorama, copy, gui08, static-check]
status: complete

requires:
  - phase: 22-panorama-worklist
    provides: 22-01 Copy answers (C1), items 4-7
provides:
  - verify-gui08-panorama-copy derives copy from every text sink (property assignments to textContent/title/placeholder/alt/label, and the five text-bearing ARIA attributes), single-quoted or template, ternary branches only
  - three new self-test plants; 13 planted faults go red
  - empty-canvas body at C1 item 4a; the old body retired
  - Resize grip value, Card tooltip and Zoom readout rows in the 15-UI-SPEC Copywriting Contract
affects: [22-04, 22-06, panorama]

actuals:
  tokens: 2500
  tasks: 2
  commits: 2
plan_head_before: 78ebd1d2df23bcf8a76e7c63b3b65dcddc16c4db
plan_head_after: 54f3c8b3a494f3c35c775fc4e2d049ec7d063a20

tech-stack:
  added: []
  patterns:
    - "A text sink is a property assignment (.title =), never a declaration (const title =)"

key-files:
  created: []
  modified:
    - scripts/verify-gui08-panorama-copy.mjs
    - .planning/milestones/v1.3-phases/15-panorama-organising/15-UI-SPEC.md
    - theia/extensions/modes/src/browser/organising-widget.ts

key-decisions:
  - "Sinks are property assignments only: the research shape's \\btitle matched `const title = document.createElement('span')` and surfaced 'span' and 'div' as copy"

requirements-completed: []

duration: ~15 min
completed: 2026-10-17
---

# Phase 22 Plan 02: Panorama copy contracted and derived from every text sink Summary

**The copy check now reads every single-quoted and template literal at every text sink, including the ARIA text attributes. The empty-canvas body ships in Chris's C1 item 4a wording. The grip value, card tooltip and zoom readout (21-REVIEW WR-05) are contracted in 15-UI-SPEC.**

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | 40fad6d | fix(22-02): contract the Panorama copy Chris reviewed and derive it from every text sink (PAN-04, PAN-05) |
| 1 | 54f3c8b | fix(22-02): name each text-bearing ARIA attribute in full in the copy sink pattern |
| 2 | none | checks only; the log is git-ignored |

`git show --stat` of 40fad6d lists exactly the three files. 54f3c8b lists the check script only.

## Evidence

- **Unmodified-spec run** (new sink pass, before any spec edit). The surplus was exactly the three expected strings:
  `user-facing strings NOT in the declared contract (unreviewed copy): "{}%", "{} by {} pixels", "{}\\n{}"`.
  The first draft of the rule also surfaced `"span"` and `"div"`. The cause was the rule, so I fixed the rule and left the spec alone (see Deviations).
- **PASS line:** `verify-gui08-panorama-copy: PASS -- 32 painted strings equal the 32 literals of the 15-UI-SPEC Copywriting Contract; 5 retired literals absent; no internals in copy`. Before the change it read 29/29 and 4 retired.
- **Self-test:** `verify-gui08-panorama-copy --self-test: PASS -- 13 planted faults went red naming the drift`. The three new plants:
  - `ok  aria-description literal added -> ... (unreviewed copy): "Planted words"`
  - `ok  template textContent added -> ... (unreviewed copy): "Planted {} words"`
  - `ok  grip value reworded -> ... (unreviewed copy): "{} wide, {} high" | declared contract strings are GONE (drifted or removed copy): "{} by {} pixels"`
- **canvas-geometry:** the check and its self-test exit 0. The self-test reports `15 planted faults went red`.
- **Build:** `logs/build-22-02.log`, PHASE22_EXIT=0, 3 s wall. The built `lib/browser/organising-widget.js` has the new body once and the old body zero times.
- **--quick (Task 2):** `logs/quick-22-02.log`, run at 54f3c8b. **132 PASS, 0 FAIL**, 53 s wall, PHASE22_EXIT=0. `gui08-panorama-copy: PASS` and `gui08-panorama-copy-self-test: PASS` are both present by name. `docs/non-gui/quick-baseline.txt` is still 0 bytes.
- **Gates:** `plan-gate.py --phase 22` passes. `phase-gate.py` prints nothing. The brand-residue scan passes over 358 files.

## Copy items 4-7, side by side

| Item | Chris's answer (22-01 C1) | Source (organising-widget.ts) | 15-UI-SPEC row |
|------|---------------------------|-------------------------------|----------------|
| 4 (4a) | "There are no tab groups yet — choose New Group, or drag across the canvas to draw one." | `'There are no tab groups yet — choose New Group, or drag across the canvas to draw one.'` | Empty canvas body: **"There are no tab groups yet — choose New Group, or drag across the canvas to draw one."** |
| 5 (add) | "{w} by {h} pixels" | `` grip.setAttribute('aria-valuetext', `${group.w} by ${group.h} pixels`) `` (unchanged) | Resize grip value: **"{w} by {h} pixels"** |
| 6 (add) | the title, a line break, the address; the title alone when there is no address | `` card.title = tab.url ? `${tab.title}\n${tab.url}` : tab.title `` (unchanged) | Card tooltip: **"{title}\n{url}"**, with a literal backslash and n; the row states the line break and the title-only case |
| 7 (add) | "{N}%" | `` this.zoomReadout.textContent = `${ZOOM_STEPS[this.zoomIndex]}%` `` (unchanged) | Zoom readout: **"{N}%"**, the current level between − and + |

Other spec changes, as the plan specified:
- The old body is in Retired copy, bolded verbatim, with the Why "Names a gesture that places the tab loose; drawing a band starts a group."
- Known gaps row 1 (the empty-canvas wording) is deleted.
- In the copy rule, "bounds" now reads "bounds (other than the resize grip's spoken size of the user's own box, which Chris accepted at 22-01 C1 item 5)".

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The research sink shape read declarations as sinks**
- **Found during:** Task 1, the unmodified-spec run
- **Issue:** `\btitle\s*=` matched `const title = document.createElement('span')` (and `'div'`), so element tag names were counted as copy.
- **Fix:** Every assignment sink is now a property assignment, `\.(?:textContent|title|placeholder|alt|label)\s*=(?!=)`. The `(?!=)` excludes comparisons.
- **Files modified:** scripts/verify-gui08-panorama-copy.mjs
- **Commit:** 40fad6d

**2. [Rule 1 - Bug] The artifact literal `aria-valuetext` was missing from the check**
- **Found during:** Task 1 `<verify>`, after commit 40fad6d
- **Issue:** The pattern was written `aria-(?:label|valuetext|...)`, so the plan's `grep -q 'aria-valuetext'` and its `contains: "aria-valuetext"` artifact clause failed.
- **Fix:** Each of the five attribute names is written in full. Behaviour is unchanged: the same 32/32 PASS and the same 13 red plants.
- **Files modified:** scripts/verify-gui08-panorama-copy.mjs
- **Commit:** 54f3c8b
- **Effect on the verify block:** amend is forbidden, so the check's last commit is now 54f3c8b. The spec's and the source's last commit is 40fad6d, so the clause "K, S and W share their last commit" fails by construction. The intent of that clause still holds: all three files landed together in 40fad6d, and the check passed at that state, 32/32 with 13 plants red, before I committed. Every other clause of the Task 1 `<verify>` passes at HEAD.

### Not done (per operational constraints)

- STATE.md is not edited, and the ROADMAP and requirements tracking are not updated. The orchestrator owns those.
- No requirement is marked complete. PAN-04 and PAN-05 are cited for copy only; their behaviour lands in 22-04 and 22-06. NG-074 and NG-084 stay deferred-approved and were not touched.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: 40fad6d, 54f3c8b (each an ancestor of HEAD)
- FOUND: scripts/verify-gui08-panorama-copy.mjs, the 15-UI-SPEC.md rows, .planning/phases/22-panorama-worklist/logs/quick-22-02.log
