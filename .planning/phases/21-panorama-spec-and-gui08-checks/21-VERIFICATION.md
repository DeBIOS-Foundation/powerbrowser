---
phase: 21-panorama-spec-and-gui08-checks
verified: 2026-10-18T00:39:44Z
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
covered_digest: "v3:sha256:8172d4995757f36a580ec18f6543c3291198c98759a7a75c70d87116c40690b3"
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "The Panorama spec (15-UI-SPEC) describes the design that shipped, including the review fixes that changed shipped behaviour"
    status: partial
    reason: "Review fix WR-01 (5714f36) changed shipped layout: in the zero-group state the loose line starts no higher than the 'No tab groups' panel's bottom edge plus LOOSE_MARGIN, and renderLoose grows the canvas min-height past 'host height - 4' when the line is pushed below the host. The commit recorded this in the phase-local 21-UI-SPEC.md:326-327 only. 15-UI-SPEC, the contract the goal names, still says the line is 'LOOSE_MARGIN above the canvas bottom' (Loose cards bullet, :315-317) and its 'Canvas minimum height' row reads '320 px, or host height - 4' (:142). Neither gui08 check can see this: the bullet is prose and the row is a description row, which geometryDiff does not compare."
    artifacts:
      - path: ".planning/milestones/v1.3-phases/15-panorama-organising/15-UI-SPEC.md"
        issue: "Loose cards section (:313-322) and the Canvas minimum height row (:142) omit the WR-01 clamp and canvas growth that organising-widget.ts:501 and :529-533 ship"
    missing:
      - "Carry the 21-UI-SPEC.md:326-327 sentence into the 15-UI-SPEC Loose cards bullet: the line never starts above the panel's bottom edge plus LOOSE_MARGIN; in a host too short for both, the canvas grows and the host scrolls"
      - "Extend the 15-UI-SPEC 'Canvas minimum height' description row to name the growth case (renderLoose)"
      - "Re-run gui08-canvas-geometry and gui08-panorama-copy after the edit (both parse this file)"
deferred:
  - truth: "WR-02: the empty-canvas body tells the user to 'drag a tab onto the canvas to start one', but a drop on empty canvas places the card loose"
    addressed_in: "Phase 22 (W4 copy edit), Chris's copy review"
    evidence: "15-UI-SPEC Known gaps (:365) records it 'kept verbatim for the Phase 22 copy edit'. Phase 22 success criterion 3: 'the spec copy and both gui08 checks change in the same commit and pass (W4)'. The spec and the shipped string agree, so the copy gate is correct to pass."
  - truth: "WR-05: verify-gui08-panorama-copy enumerates its copy sinks by hand, so aria-valuetext '${group.w} by ${group.h} pixels' and the card tooltip '${tab.title}\\n${tab.url}' are not compared with the contract"
    addressed_in: "Chris's copy decision (21-REVIEW-FIX.md, skipped); Phase 22 copy edit"
    evidence: "21-REVIEW-FIX.md 'Skipped Issues' WR-05: broadening the sink set makes the gate red on shipped copy at once, and either fix is a copy decision for Chris. SC2 as worded holds: the contract and the retired list derive from 15-UI-SPEC, and 10 plants go red."
  - truth: "ng-007 and ng-008 were last run on the 21-05 sidecar, before WR-01 (5714f36)"
    addressed_in: "next full-tier run"
    evidence: "logs/ng007-21-05.log and ng008-21-05.log: PASS, PHASE21_EXIT=0. WR-01 changes only renderLoose's zero-group line and canvas min-height; neither row reads that. The verifier was limited to one live re-run and spent it on gui08-loose-cards-live."
  - truth: "Stale probe-control counts: the registry comment over gui08-loose-cards-live (verify-platform.sh:4830) and 21-05-PLAN say three in-run probe controls; the row now runs five plus the short-host control"
    addressed_in: "docs follow-up"
    evidence: "Verifier's live run: 'probe controls: 5 planted page faults each turned their probe red' and the short-host control line. The records understate the coverage."
---

# Phase 21: Panorama Spec and gui08 Checks Verification Report

**Phase Goal:** The Panorama spec describes the design that shipped, the checks derived from it pass, and the commit gate is green
**Verified:** 2026-10-18T00:39:44Z
**Status:** gaps_found
**Re-verification:** No (initial verification)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1 / PAN-01: 15-UI-SPEC describes the shipped Panorama redesign (`7b7a1f7`): its canvas geometry and the reviewed "Expand" / "Done" copy | VERIFIED | `git cat-file -t 7b7a1f7` = commit ("wip(organising): Panorama canvas..."). 15-UI-SPEC Provenance :453 names the Phase 21 re-pin to `7b7a1f7`. One `## Canvas Geometry` (:100), Typography (:150), Copywriting Contract (:225) with `**"Expand"**` (:249) and `**"Done"**` (:250), `### Retired copy` (:261) holding the empty-tray caption and the three placeholder strings. The verifier's `gui08-canvas-geometry` PASS ("18 const rows and 7 CSS rows equal 15-UI-SPEC Canvas Geometry; type sizes 12/13/14px and weights 400/600") and `gui08-panorama-copy` PASS ("29 painted strings equal the 29 literals ... 4 retired literals absent") prove the tables equal the tree. `grep -i 'tray|auto-box|corner-only|search'` over the spec hits only the Retired copy table and the Deferred provenance row. See truth 9 for the one prose drift |
| 2 | SC2 / PAN-01: `verify-gui08-canvas-geometry` and `verify-gui08-panorama-copy` derive their expectations from 15-UI-SPEC, pass, and go red on planted faults | VERIFIED | Both import `scripts/lib/ui-spec.mjs` (`geometryDiff`, `geometryRows`, `typography` at canvas-geometry:32; `copyContract`, `normaliseSlots` at panorama-copy:37) and read `SPEC_REL` = the 15-UI-SPEC path at check time. Verifier `--only` runs: both PASS. `gui08-canvas-geometry-self-test`: "15 planted faults went red naming the drift", 4 of them spec-side (spec value drift LOOSE_W 170, spec row deleted TILE_GAP, spec Typography 13px deleted, zoom step drift). `gui08-panorama-copy-self-test`: "10 planted faults went red", including spec Done row deleted, spec Retry reworded (surplus and missing both named), and both ZERO-derivation broken-instrument plants |
| 3 | SC3 / PAN-01: `scripts/verify-platform.sh --quick` reports no FAIL row, and `quick-baseline.txt` is empty | VERIFIED | Verifier ran `--quick` once at HEAD 2201206: 132 PASS, 0 FAIL, "verify-platform: PASS -- all checks passed", exit 0. `docs/non-gui/quick-baseline.txt` is 0 bytes (`wc -c` = 0), last changed in 41a1975. The decisions.md:43-45 R33 pipeline over the verifier's log prints 0 lines. decisions.md:38 records the Phase 21 refresh |
| 4 | SC4 / PAN-07: no stale tray code, comments or CSS remain | VERIFIED | `git grep -i -w tray -- theia/extensions powerbrowser/shell` prints nothing (exit 1). Without `-w` the only hits are `detachStrayWidgets` in main-area-exemption.ts, which is not tray wording. The PAN-07 negation in canvas-geometry is live: plants "tray revived" (`.pb-org-tray` in modes.css) and "focus scope back to the tray" (`pb-org-tray` in the widget) both go red. The PowerBrowserAPI.sys.mjs edit is 1 line in, 1 out, and the `internals-catalogue` and boundary rows pass in `--quick` |
| 5 | SC4: the canvas still shows ungrouped tabs as loose cards | VERIFIED | Live, after a sidecar rebuild (see Behavioral Spot-Checks): zero groups, 3 terminal tabs plus Welcome are `.pb-org-card.is-loose` beside the empty panel with no overlap and inside the canvas host; DOM loose 4 = model ungrouped 4; at a 300px host the cards sit below the panel and on the canvas; after a group is created, 1 box, no empty panel, 3 loose cards on the canvas and clear of the box. 5 planted page faults each turned their probe red, plus the short-host control (minTop dropped must overlap the panel). Code: organising-widget.ts:493-502 calls `renderLoose(...)` in the zero-group branch; :507 in the populated branch. logs/loose-cards-zero-groups-21-05.png shows the four cards under the panel |
| 6 | 21-01: one shared parse module, and 15-UI-SPEC parses to the tree | VERIFIED | gsd verify.artifacts 2/2, key-links 2/2. `topLevelNumericConsts` covers the three canvas files: the "derived const without a row" (PILE_STEP) and "annotated const without a row" (LOOSE_GAP) plants go red as undeclared (WR-06). No hand-kept geometry or copy list: the spec-side plants above change only the spec and turn the checks red |
| 7 | 21-02: the unreachable card-onto-card handler and GroupModel's auto-box write are gone; the loose-card data path keeps its names | VERIFIED | c5812c9: 101 lines deleted from group-model.ts and organising-widget.ts. `git grep -i 'autoBox|auto-box|autobox'` over theia and powerbrowser prints nothing. `listUngroupedTabs` counts per file are identical at `c5812c9~1` and HEAD (1, 1, 3). `listUngrouped()` is read by renderLoose (:523) |
| 8 | 21-04: loose and expanded cards are in the roving focus, and `.pb-org-expand-heading` is 400 | VERIFIED | `moveCardFocus` (:1869-1891) scopes loose cards to the canvas children `.pb-org-card.is-loose` and other cards to `.pb-org-box-cards, .pb-org-expand-cards`, skipping hidden cards. Live: "ArrowRight moved focus view:welcome -> terminal:gui08-loose-a across 4 visible loose cards, 1 tab stop", and the moveCardFocus-stubbed control went red. modes.css:385-387 `font-weight: 400`; the "heading weight 500" plant goes red |
| 9 | Goal: the Panorama spec describes the design that shipped, including behaviour changed by the Phase 21 review fixes | FAILED (partial) | WR-01 (5714f36) clamps the zero-group loose line to the panel's bottom edge plus LOOSE_MARGIN (organising-widget.ts:501, :529) and grows the canvas min-height when the line falls below the host (:530-533). The commit recorded this in 21-UI-SPEC.md:326-327 only. 15-UI-SPEC still says the line is "`LOOSE_MARGIN` above the canvas bottom" (:315-317) and "Canvas minimum height: 320 px, or host height − 4" (:142). Neither check compares prose or description rows, so the gate cannot catch this |
| 10 | The option A fix (`display: flow-root` on `.pb-org-canvas`) holds | VERIFIED (accepted orchestrator decision) | Accepted under Chris's autonomous rule, as instructed. modes.css:227-234: `display: flow-root` with the comment that the panel's top margin must not collapse through the canvas. 81c5952. The live row's "all inside the canvas host" assertion, red in logs/loose-cards-red-21-05.log before the fix, passes in the verifier's run |

**Score:** 9/10 truths verified (0 present, behavior-unverified)

### Deferred Items

None of these breaks the goal as the success criteria state it. Each was checked against the tree.

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | WR-02: empty-canvas body names a gesture that no longer exists | Phase 22 W4 copy edit | 15-UI-SPEC Known gaps :365; Phase 22 SC3 |
| 2 | WR-05: copy sinks enumerated by hand (aria-valuetext, card tooltip) | Chris's copy decision | 21-REVIEW-FIX.md skipped it because any fix is a copy decision |
| 3 | ng-007 / ng-008 last run before WR-01 | Next full-tier run | WR-01 touches only the zero-group loose line |
| 4 | "three probe controls" in the registry comment and 21-05-PLAN; five now run | Docs follow-up | Understates the coverage |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `scripts/lib/ui-spec.mjs` | Shared parse: copyContract, geometryRows, typography, geometryDiff | VERIFIED | gsd 21-01 2/2. Imported by both gui08 checks |
| `.planning/milestones/v1.3-phases/15-panorama-organising/15-UI-SPEC.md` | Re-pinned contract | VERIFIED (prose drift, truth 9) | Tables equal the tree. The Loose cards bullet and one description row predate WR-01 |
| `theia/extensions/modes/src/browser/organising-widget.ts` | No card-onto-card path; loose cards with zero groups; focus scope | VERIFIED | Truths 5, 7, 8 |
| `theia/extensions/modes/src/browser/group-model.ts` | No auto-box write; `listUngrouped` kept | VERIFIED | Truth 7 |
| `theia/extensions/modes/src/browser/modes.css` | No tray rules; heading 400; flow-root canvas | VERIFIED | Truths 4, 8, 10 |
| `scripts/verify-gui08-panorama-copy.mjs` | Spec-derived copy gate, 9+ plants | VERIFIED | PASS / 10 plants |
| `scripts/verify-gui08-canvas-geometry.mjs` | Spec-derived geometry gate with tray negation, 12+ plants | VERIFIED | PASS / 15 plants |
| `scripts/verify-gui08-loose-cards-live.mjs` | Live DOM row with in-run controls | VERIFIED | Full-tier row (verify-platform.sh:4834), not in `--quick`. PASS on the rebuilt sidecar |
| `docs/non-gui/quick-baseline.txt` | 0 bytes, derived | VERIFIED | 0 bytes; pipeline output empty |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| ui-spec.mjs | 15-UI-SPEC.md | Heading and Key-cell parse, Retired copy split | WIRED | gsd 2/2 |
| ui-spec.mjs | organising-widget.ts | `topLevelNumericConsts` in geometryDiff | WIRED | gsd; PILE_STEP / LOOSE_GAP plants |
| organising-widget.ts | group-model.ts | `renderLoose` reads `model.listUngrouped()` in both branches | WIRED | gsd 21-02 1/1, 21-04 2/2 |
| verify-gui08-panorama-copy.mjs | ui-spec.mjs, 15-UI-SPEC | `copyContract`, `SPEC_REL` | WIRED | gsd 2/2 |
| verify-gui08-canvas-geometry.mjs | ui-spec.mjs | `geometryDiff`, `typography` | WIRED | gsd 2/2 |
| verify-gui08-loose-cards-live.mjs | scripts/lib/ng-a-live.mjs | `runCheck`, `newProfile`, `withShell` | WIRED | gsd 1/1; ng-a-live.mjs unchanged since cabb60e |
| quick-baseline.txt | verify-platform.sh | decisions.md R33 `comm -13` pipeline | WIRED | The gsd tool reported "not yet created" because the source file is 0 bytes. Checked by hand: decisions.md:43-45, and the verifier ran the pipeline |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| organising-widget.ts `renderLoose` | `tabs` | `this.model.listUngrouped()` (GroupModel, fed by the `listUngroupedTabs` RPC) | Yes: live run, DOM loose 4 = model ungrouped 4 | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Geometry gate | `--only gui08-canvas-geometry` | PASS, 18 const rows and 7 CSS rows | PASS |
| Geometry self-test | `--only gui08-canvas-geometry-self-test` | 15 planted faults red | PASS |
| Copy gate | `--only gui08-panorama-copy` | PASS, 29 = 29, 4 retired absent | PASS |
| Copy self-test | `--only gui08-panorama-copy-self-test` | 10 planted faults red | PASS |
| Commit gate | `scripts/verify-platform.sh --quick` (once, HEAD 2201206) | 132 PASS, 0 FAIL, exit 0; R33 pipeline prints 0 lines | PASS |
| Tray residue | `git grep -i -w tray -- theia/extensions powerbrowser/shell` | no output, exit 1 | PASS |
| Sidecar rebuild | `nix develop .#theia` → `yarn --cwd extensions/modes build && yarn --cwd applications/browser build` | exit 0; frontend bundle rewritten 17:37:30; bundle.js contains `renderLoose(minTop = 0)` once | PASS |
| Live loose cards | `PB_VERIFY_PORT=3939 PB_NG_ALLOW_DIRTY=1 scripts/verify-platform.sh --only gui08-loose-cards-live` (once) | PASS: zero groups, no tray (0 beside 16 cards), keyboard, short host 300px, one group, 5 probe controls red. `PB_NG_ALLOW_DIRTY=1` because of another session's uncommitted 21-VALIDATION.md. Port 3000 not touched | PASS |
| Ledger | `ledger-report.py`, `phase-gate.py --root .` | 88 rows, done=55, deferred-approved=9, dropped=24, due=0; phase-gate silent, exit 0 | PASS |
| Plan gate | `plan-gate.py --phase 21 --plans <phase dir>` | plan gate passed: 2/2 IDs cited | PASS |

### Probe Execution

Not applicable. The phase declares no `scripts/*/tests/probe-*.sh`. Its verification is the registry rows above.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PAN-01 | 21-01, 21-03, 21-04, 21-05 | 15-UI-SPEC describes the shipped redesign; both gui08 checks derive from it and pass; the commit gate is green and quick-baseline.txt is empty | SATISFIED (with the truth 9 prose gap) | Truths 1, 2, 3, 6 |
| PAN-07 | 21-02, 21-04, 21-05 | Stale tray code, comments and CSS removed | SATISFIED | Truths 4, 5, 7, 8 |

No orphaned requirements: REQUIREMENTS.md maps only PAN-01 and PAN-07 to Phase 21. NG-074 and NG-084 are cited for the plan gate and stay deferred-approved (owner chris, phase 15). REQUIREMENTS.md still shows PAN-01 and PAN-07 as Pending; marking them is the phase-close step.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (all phase-modified scripts, Theia sources, docs and 15-UI-SPEC) | - | TBD/FIXME/XXX/TODO/HACK | - | None found, including the phase's added lines of verify-platform.sh |
| `15-UI-SPEC.md` | 142, 315-317 | Spec prose predates WR-01 | Warning | Truth 9. The gate cannot see it |
| `theia/extensions/modes/src/browser/organising-widget.ts` | 496 | User copy names a gesture that does not exist (WR-02) | Info | Deferred to the Phase 22 copy edit; recorded in 15-UI-SPEC Known gaps |
| `scripts/verify-platform.sh` | 4830 | Comment says three in-run probe controls; five run | Info | Deferred item 4 |

### Human Verification Required

None. The verifier re-ran the live row that covers the only Theia change in the review fixes (WR-01), with its short-host control. WR-06, which 21-REVIEW-FIX.md marks for human verification, is covered by its two plants in the self-test the verifier ran.

### Gaps Summary

One gap, and it is in documentation only. The tables, the checks and the commit gate are all green:

- 15-UI-SPEC does not record WR-01. The review fix changed where zero-group loose cards are drawn in a short host and let the canvas grow past the host height. The fix recorded this in 21-UI-SPEC only. 15-UI-SPEC is the contract the phase goal and SC1 name, and both its Loose cards bullet and its "Canvas minimum height" row now describe the code as it was before WR-01. The fix is to copy 21-UI-SPEC.md:326-327 into 15-UI-SPEC and extend the row, then re-run both gui08 rows, which parse that file.

If this drift is acceptable as recorded in 21-UI-SPEC, it can be accepted with an override instead:

```yaml
overrides:
  - must_have: "Goal: the Panorama spec describes the design that shipped, including behaviour changed by the Phase 21 review fixes"
    reason: "WR-01's clamp is recorded in 21-UI-SPEC.md:326-327 and 21-REVIEW-FIX.md; 15-UI-SPEC's tables, which the checks compare, are unaffected"
    accepted_by: "chris"
    accepted_at: "<ISO timestamp>"
```

Verifier leftovers, not removed: `pb-ng-a-gui08loose-UhRo6k` under /tmp/nix-shell.aDyem4 (the profile from the verifier's live run). `pb-ng-a-gui08loose-HWIYgR`, `-knbDgy` and `-xYsSz0` there are from the 17:32-17:33 fixer runs. `nix-develop-3852882-*`, `nix-develop-3852951-*`, `nix-develop-3858087-*`, `nix-shell.ShcBd4`, `nix-shell.2BGS9a` and `nix-shell.D2trgL` appeared during the verifier's build and `--quick`. In the scratchpad: `only-rows.log`, `quick-verifier-21.log`, `quick-head.txt`, `build-verifier-21.log`, `loose-cards-verifier-21.log`, `files.txt`.

---

_Verified: 2026-10-18T00:39:44Z_
_Verifier: Claude (gsd-verifier)_


## Gap closure (orchestrator, 2026-10-17)

The one gap, which was the 15-UI-SPEC prose for the WR-01 zero-group short-host layout, is closed. The "Loose cards" bullet and the "Canvas minimum height" row now describe the line staying below the empty panel and the canvas growing. The text was copied from 21-UI-SPEC.md:326-327. Re-run afterwards: gui08-canvas-geometry PASS (exit 0) and its self-test PASS (15 plants); gui08-panorama-copy PASS and its self-test PASS (10 plants).
