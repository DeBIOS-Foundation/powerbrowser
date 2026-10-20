# Phase 22: Panorama Worklist - Context

**Gathered:** 2026-10-17
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss); Chris's two Panorama decisions taken in chat

<domain>
## Phase Boundary

The user organises tabs by group from both the strip and the canvas: the strip follows
the active group, a closed group can be restored, a card closes in place, and one group
always remains (PAN-02..PAN-06; worklist items W1, W2, W4, W5, W11 first part). See
ROADMAP.md Phase 22 success criteria. Phase 21 is complete: 15-UI-SPEC describes the
shipped Panorama, both gui08 checks derive from it, and `--quick` is fully green with an
empty baseline.

</domain>

<decisions>
## Implementation Decisions

### Chris's Panorama decisions (PAN-02, success criterion 1)
Recorded 2026-10-17, before any worklist code. Both are Chris's answers in chat, given
verbatim below:
- Decision 1, ungrouped tabs: "Loose allowed, shown in strip (Recommended)". Tabs may stay
  loose (not in any group), as shipped. While a group is active, the filtered strip shows
  the active group's tabs plus the loose tabs, so no tab ever disappears from the strip.
- Decision 2, strip filter scope: "Browsing only (Recommended)". The group filter applies
  only to the Browsing tab strip. Coding (Theia dock tab bars) and Organising are
  unchanged.

### Locked
- W1 and W2 ship in one change. The strip shows the active group's tabs plus loose tabs
  in Browsing. A tab opened with "+" joins the active group when one is active, and is
  loose otherwise.
- The 15-UI-SPEC sentence "no contract below moves, filters, or re-skins the strip, and
  choosing a tab never hides other tabs" (around :24-26) is amended in the W1 commit.
- W4: Undo Close Group restores a closed group. The spec copy and both gui08 checks
  change in the same commit and pass. The chrome-side writer `closeGroupRows` is touched;
  research it first.
- W5: a card can be closed from the card itself.
- W11, first part: the last remaining group cannot be closed.
- Copy items held from Phase 21 for Chris's review in this phase:
  - The empty-canvas body still says "drag a tab onto the canvas to start one". That
    gesture no longer exists, because a drop on the canvas places the tab loose. New
    wording is user-facing copy and needs Chris's review.
  - 21-REVIEW WR-05: two shipped strings sit outside the copy contract, the resize grip's
    screen-reader value (`${w} by ${h} pixels`) and the card tooltip (`${title}\n${url}`).
    Add them to the contract or reword them. Chris's call.
  New user-facing strings are a checkpoint for Chris; follow the CLAUDE.md copy rule.
- Every check derives from the tree or 15-UI-SPEC (CLAUDE.md verification rule 2), with a
  planted-fault self-test.
- `--quick` must stay at 0 FAIL with an empty `docs/non-gui/quick-baseline.txt`.
- Live checks use `PB_VERIFY_PORT` (default 3939); never touch port 3000. Rebuild the
  sidecar before a live check.
- Never fork or patch Theia core.

### Claude's Discretion
Everything else, guided by the ROADMAP success criteria, 15-UI-SPEC,
`.planning/milestones/v1.3-phases/15-panorama-organising/15-PANORAMA-WORKLIST.md`, the
sketch findings and this phase's research.

</decisions>

<code_context>
## Existing Code Insights

Starting points:
- the strip: `theia/extensions/chrome-bar/src/browser/tab-strip-widget.tsx` (`mainTabs()`);
- the group model: `theia/extensions/modes/src/browser/group-model.ts`;
- Panorama: `theia/extensions/modes/src/browser/organising-widget.ts`;
- the writer: `powerbrowser/shell/PowerBrowserAPI.sys.mjs` (`closeGroupRows`, the group
  actor);
- the group channel row: `scripts/verify-group-channel.mjs`.
W1 needs a shared frontend group-membership reader that both the chrome-bar and modes
extensions can use.

</code_context>

<specifics>
## Specific Ideas

None beyond the ROADMAP success criteria and the worklist.

</specifics>

<deferred>
## Deferred Ideas

None.

</deferred>
