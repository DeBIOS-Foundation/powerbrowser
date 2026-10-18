---
phase: 21-panorama-spec-and-gui08-checks
verified: 2026-10-18T00:46:38Z
status: passed
score: 10/10 must-haves verified
covered_files:
  - ".planning/milestones/v1.3-phases/15-panorama-organising/15-UI-SPEC.md"
  - ".planning/phases/21-panorama-spec-and-gui08-checks/21-01-PLAN.md"
  - ".planning/phases/21-panorama-spec-and-gui08-checks/21-01-SUMMARY.md"
  - ".planning/phases/21-panorama-spec-and-gui08-checks/21-02-PLAN.md"
  - ".planning/phases/21-panorama-spec-and-gui08-checks/21-02-SUMMARY.md"
  - ".planning/phases/21-panorama-spec-and-gui08-checks/21-03-PLAN.md"
  - ".planning/phases/21-panorama-spec-and-gui08-checks/21-03-SUMMARY.md"
  - ".planning/phases/21-panorama-spec-and-gui08-checks/21-04-PLAN.md"
  - ".planning/phases/21-panorama-spec-and-gui08-checks/21-04-SUMMARY.md"
  - ".planning/phases/21-panorama-spec-and-gui08-checks/21-05-PLAN.md"
  - ".planning/phases/21-panorama-spec-and-gui08-checks/21-05-SUMMARY.md"
  - "docs/non-gui/decisions.md"
  - "docs/non-gui/quick-baseline.txt"
  - "powerbrowser/shell/PowerBrowserAPI.sys.mjs"
  - "scripts/lib/ui-spec.mjs"
  - "scripts/verify-gui08-canvas-geometry.mjs"
  - "scripts/verify-gui08-loose-cards-live.mjs"
  - "scripts/verify-gui08-panorama-copy.mjs"
  - "scripts/verify-platform.sh"
  - "theia/extensions/modes/src/browser/group-model.ts"
  - "theia/extensions/modes/src/browser/modes.css"
  - "theia/extensions/modes/src/browser/organising-widget.ts"
  - "theia/extensions/tab-uris/src/node/tab-query-service.ts"
covered_digest: "v3:sha256:409a41d8acf86a50cf68e16b72bc0e85ff4ba841c2743e3e748577cb60eee3b2"
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 9/10
  gaps_closed:
    - "The Panorama spec (15-UI-SPEC) describes the design that shipped, including the review fixes that changed shipped behaviour"
  gaps_remaining: []
  regressions: []
deferred:
  - truth: "WR-02: the empty-canvas body tells the user to 'drag a tab onto the canvas to start one', but a drop on empty canvas places the card loose"
    addressed_in: "Phase 22 (W4 copy edit), Chris's copy review"
    evidence: "15-UI-SPEC Known gaps records it 'kept verbatim for the Phase 22 copy edit'. Phase 22 success criterion 3: 'the spec copy and both gui08 checks change in the same commit and pass (W4)'. The spec and the shipped string agree, so the copy gate is correct to pass."
  - truth: "WR-05: verify-gui08-panorama-copy enumerates its copy sinks by hand, so aria-valuetext '${group.w} by ${group.h} pixels' and the card tooltip '${tab.title}\\n${tab.url}' are not compared with the contract"
    addressed_in: "Phase 22 copy edit; Chris's copy decision (21-REVIEW-FIX.md, skipped)"
    evidence: "21-REVIEW-FIX.md 'Skipped Issues' WR-05: broadening the sink set turns the gate red on shipped copy, and either fix is a copy decision for Chris. SC2 as worded holds."
---

# Phase 21: Panorama Spec and gui08 Checks Verification Report

**Phase Goal:** The Panorama spec describes the design that shipped, the checks derived from it pass, and the commit gate is green
**Verified:** 2026-10-18T00:46:38Z
**Status:** passed
**Re-verification:** Yes, after gap closure in dbecfa8

## Goal Achievement

Code paths unchanged since the previous run: `git diff 2201206 HEAD -- theia scripts powerbrowser docs` is empty. dbecfa8 changes only `.planning/` files. The one tracked implementation-side change is 6 lines of 15-UI-SPEC.

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1 / PAN-01: 15-UI-SPEC describes the shipped Panorama redesign (`7b7a1f7`): its canvas geometry and the reviewed "Expand" / "Done" copy | VERIFIED | `git cat-file -t 7b7a1f7` = commit. 15-UI-SPEC: `## Canvas Geometry` :100, `## Typography` :150, `## Copywriting Contract` :225, `**"Expand"**` :249, `**"Done"**` :250, `### Retired copy` :261, re-pin provenance :455. `gui08-canvas-geometry` and `gui08-panorama-copy` PASS at HEAD (re-run with `--only`) |
| 2 | SC2 / PAN-01: both gui08 checks derive from 15-UI-SPEC, pass, and go red on planted faults | VERIFIED | Re-run at HEAD with `--only`: `gui08-canvas-geometry` PASS ("18 const rows and 7 CSS rows equal 15-UI-SPEC Canvas Geometry; type sizes 12/13/14px and weights 400/600"), self-test PASS ("15 planted faults went red naming the drift"); `gui08-panorama-copy` PASS ("29 painted strings equal the 29 literals ...; 4 retired literals absent"), self-test PASS ("10 planted faults went red naming the drift"). All four exit 0. Both parse the edited 15-UI-SPEC, so the dbecfa8 edit did not break either parse |
| 3 | SC3 / PAN-01: `--quick` reports no FAIL row and `quick-baseline.txt` is empty | VERIFIED | `--quick` re-run once at HEAD dbecfa8: exit 0, summary 132 PASS, "verify-platform: PASS -- all checks passed". The 15 `: FAIL` lines in the log are self-test plant output (e.g. `plant 1 chrome child module: red -- group-channel: FAIL`), not summary rows. The decisions.md:43-45 R33 pipeline over the log prints 0 lines. `quick-baseline.txt` is 0 bytes |
| 4 | SC4 / PAN-07: no stale tray code, comments or CSS remain | VERIFIED | `git grep -i -w tray -- theia/extensions powerbrowser/shell` prints nothing, exit 1. The tray negation plants in the geometry self-test go red (part of the 15) |
| 5 | SC4: the canvas still shows ungrouped tabs as loose cards | VERIFIED | Live evidence from the previous verifier's run (scratchpad `loose-cards-verifier-21.log`, written 17:37, after the last code commit 2201206 at 17:33): zero groups, 3 terminal tabs + Welcome loose beside the empty panel, DOM loose 4 = model ungrouped 4; short host 300px: cards below the panel and on the canvas; one group: 3 loose cards clear of the box; 5 probe controls red. No Theia file or live-row script changed since (last theia commit 5714f36, 17:29). Code: organising-widget.ts:500-501 and :507 call `renderLoose` in both branches |
| 6 | 21-01: one shared parse module, and 15-UI-SPEC parses to the tree | VERIFIED | Both checks import `scripts/lib/ui-spec.mjs`; unchanged since the previous run; both PASS against the edited spec |
| 7 | 21-02: card-onto-card handler and auto-box write gone; loose-card data path kept | VERIFIED | Regression check: no theia change since the previous run, which verified this from c5812c9. `renderLoose` reads `this.model.listUngrouped()` (organising-widget.ts:523) |
| 8 | 21-04: loose and expanded cards in roving focus; `.pb-org-expand-heading` 400 | VERIFIED | Regression check: theia unchanged; the live keyboard line in the 17:37 run and the geometry self-test's heading-weight plant cover it |
| 9 | Goal: the Panorama spec describes the design that shipped, including behaviour changed by the Phase 21 review fixes (previous gap) | VERIFIED | dbecfa8 edits 15-UI-SPEC. "Canvas minimum height" row :142 now reads "320 px, or host height − 4; with zero groups it grows further so the loose line stays below the empty panel, and the host scrolls", source `renderCanvas()`, `renderLoose()`. Loose cards bullet :317-319: "With zero groups the line never starts above the "No tab groups" panel's bottom edge plus `LOOSE_MARGIN`; in a host too short for both, the canvas grows and the host scrolls." Both match the code at HEAD: organising-widget.ts:501 passes `empty.offsetTop + empty.offsetHeight + LOOSE_MARGIN` as `minTop`; :529 `line = Math.max(minTop, height - LOOSE_H - LOOSE_MARGIN)`; :530-533 set `canvasRoot.style.minHeight` when the line falls below the host. The text matches 21-UI-SPEC.md:326-327 |
| 10 | The option A fix (`display: flow-root` on `.pb-org-canvas`) holds | VERIFIED (accepted orchestrator decision) | modes.css:227-233 unchanged: `display: flow-root`, `min-height: 320px`. The live "all inside the canvas host" assertion passes in the 17:37 run |

**Score:** 10/10 truths verified (0 present, behavior-unverified)

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | WR-02: empty-canvas body names a gesture that no longer exists | Phase 22 W4 copy edit | 15-UI-SPEC Known gaps; Phase 22 SC3 |
| 2 | WR-05: copy sinks enumerated by hand (aria-valuetext, card tooltip) | Phase 22 copy edit / Chris | 21-REVIEW-FIX.md skipped it as a copy decision |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `scripts/lib/ui-spec.mjs` | Shared parse module | VERIFIED | Unchanged; both checks PASS through it |
| `.planning/milestones/v1.3-phases/15-panorama-organising/15-UI-SPEC.md` | Re-pinned contract, prose matches code | VERIFIED | Tables equal the tree (checks PASS); WR-01 prose now present (truth 9) |
| `theia/extensions/modes/src/browser/organising-widget.ts` | Loose cards in both branches; WR-01 clamp | VERIFIED | Truths 5, 9 |
| `theia/extensions/modes/src/browser/group-model.ts` | No auto-box write; `listUngrouped` kept | VERIFIED | Truth 7 |
| `theia/extensions/modes/src/browser/modes.css` | No tray rules; heading 400; flow-root | VERIFIED | Truths 4, 8, 10 |
| `scripts/verify-gui08-panorama-copy.mjs` | Spec-derived copy gate | VERIFIED | PASS / 10 plants |
| `scripts/verify-gui08-canvas-geometry.mjs` | Spec-derived geometry gate | VERIFIED | PASS / 15 plants |
| `scripts/verify-gui08-loose-cards-live.mjs` | Live DOM row | VERIFIED | Full-tier row; PASS at 17:37, script unchanged since |
| `docs/non-gui/quick-baseline.txt` | 0 bytes | VERIFIED | 0 bytes |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| ui-spec.mjs | 15-UI-SPEC.md | Heading and Key-cell parse | WIRED | Both checks PASS on the edited spec |
| organising-widget.ts | group-model.ts | `renderLoose` reads `model.listUngrouped()` | WIRED | :523 |
| verify-gui08-panorama-copy.mjs / verify-gui08-canvas-geometry.mjs | ui-spec.mjs | `copyContract`, `geometryDiff`, `typography` | WIRED | Unchanged; PASS |
| quick-baseline.txt | verify-platform.sh | decisions.md R33 pipeline | WIRED | Pipeline over the HEAD `--quick` log prints 0 lines |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| organising-widget.ts `renderLoose` | `tabs` | `this.model.listUngrouped()` | Yes: live run, DOM loose 4 = model ungrouped 4 | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Geometry gate | `scripts/verify-platform.sh --only gui08-canvas-geometry` | PASS, exit 0 | PASS |
| Geometry self-test | `--only gui08-canvas-geometry-self-test` | 15 planted faults red, exit 0 | PASS |
| Copy gate | `--only gui08-panorama-copy` | PASS, 29 = 29, 4 retired absent, exit 0 | PASS |
| Copy self-test | `--only gui08-panorama-copy-self-test` | 10 planted faults red, exit 0 | PASS |
| Commit gate | `scripts/verify-platform.sh --quick` (once, HEAD dbecfa8) | 132 PASS, exit 0; R33 pipeline 0 lines | PASS |
| Tray residue | `git grep -i -w tray -- theia/extensions powerbrowser/shell` | no output, exit 1 | PASS |
| Live loose cards | Not re-run. Evidence: previous verifier's 17:37 run after all code commits | PASS, short-host line present, 5 probe controls red | PASS (carried) |
| Ledger | `python3 scripts/ledger-report.py --root .` | 88 rows: done=55, deferred-approved=9, dropped=24, phase=unset, due=0 | PASS |

### Probe Execution

Not applicable. The phase declares no `scripts/*/tests/probe-*.sh`; its verification is the registry rows above.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PAN-01 | 21-01, 21-03, 21-04, 21-05 | 15-UI-SPEC describes the shipped redesign; both gui08 checks derive from it and pass; commit gate green; baseline empty | SATISFIED | Truths 1, 2, 3, 6, 9 |
| PAN-07 | 21-02, 21-04, 21-05 | Stale tray code, comments and CSS removed | SATISFIED | Truths 4, 5, 7, 8 |

No orphaned requirements. REQUIREMENTS.md still shows PAN-01 and PAN-07 as Pending (:62, :73, :146, :152); marking them is the phase-close step.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| 15-UI-SPEC.md | - | TBD/FIXME/XXX | - | None |
| organising-widget.ts | 496 | User copy names a gesture that does not exist (WR-02) | Info | Deferred item 1 |
| scripts/verify-platform.sh | ~4830 | Registry comment over gui08-loose-cards-live says three in-run probe controls; five run | Info | Docs follow-up; understates coverage |
| logs/ng007-21-05.log, ng008-21-05.log | - | ng-007 / ng-008 last run before WR-01 | Info | WR-01 touches only the zero-group loose line and canvas min-height; next full-tier run |
| logs/loose-cards-21-05.log | - | Phase-local live log predates WR-01 (17:08) and lacks the short-host line | Info | The post-WR-01 run is only in the previous verifier's scratchpad log, not in `logs/` |

### Human Verification Required

None.

### Gaps Summary

No gaps. The previous gap (15-UI-SPEC prose for the WR-01 zero-group short-host layout) is closed: both passages now match organising-widget.ts:501 and :529-533, and both gui08 rows and their self-tests pass against the edited spec.

---

_Verified: 2026-10-18T00:46:38Z_
_Verifier: Claude (gsd-verifier)_
