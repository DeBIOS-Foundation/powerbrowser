# Phase 23: Modes Leftovers and Sketch 005 Verdict - Context

**Gathered:** 2026-10-17
**Status:** Ready for planning (G-32 decision still open)
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss); Chris's decisions taken in chat

<domain>
## Phase Boundary

The Phase 14 / 14.1.1 leftovers are closed with records that match the shipped
behaviour, and the sketch 005 verdict fixes the layout that UAT will test (MODE-01..MODE-04,
SK-01). See ROADMAP.md Phase 23 success criteria. This phase executes after Phase 22.

</domain>

<decisions>
## Implementation Decisions

### Chris's decisions (recorded 2026-10-17, in chat, verbatim)
- G-23 / MODE-02: "Cut at 60 while typing (Recommended)". Scope correction: G-23 is
  about **mode and setup names**, not group names. Save as Mode
  (`mode-service.ts` `saveCurrentAsMode`) and Save Setup (`setups-service.ts`
  `saveCurrentAsSetup`) must stop at 60 characters while typing, the way group rename
  already does (`organising-widget.ts`, `GROUP_TITLE_MAX_CHARS`). No new copy. 14-UI-SPEC
  states the rule. The ROADMAP's wording "a group name" is corrected in this phase.
- SK-01: "Adopt all into v1.5 (Recommended)". Sketch 005 (VS Code layout for Coding
  mode) is adopted, all four items, into a named v1.5 milestone. The sketch is committed
  with a MANIFEST row and the verdict. The REQUIREMENTS future-work entry becomes a v1.5
  item. Nothing is built in v1.4, and Phase 24 UAT tests today's layout.
- G-32 / MODE-03: **OPEN.** Chris answered "skip" on 2026-10-17. The options put to him
  were instant with the spec amended, a slide on open only through Theia's
  `expandDuration`, or a slide both ways. No recommendation exists. The plan must put
  this to Chris at a blocking decision checkpoint before any G-32 code or spec change,
  and must not choose for him.
- MODE-01: Chris's live confirmation of the strip relocation (G-11) may be taken in the
  Phase 24 session. Record that hand-off rather than blocking on it.

### Locked
- MODE-04: `14-VERIFICATION.md` is written for the archived Phase 14.
- Records that change are the archived v1.3 files: the UAT entry, the GUI-DEFECTS item 2,
  the GUI-07 box, the `mode-descriptors.ts` comment, and 14-UAT test 3.
- Live checks use `PB_VERIFY_PORT` (default 3939); never touch port 3000.
- `--quick` stays at 0 FAIL with an empty baseline.
- Never fork or patch Theia core.

### Claude's Discretion
Everything else, guided by the ROADMAP success criteria and this phase's research.

</decisions>

<code_context>
## Existing Code Insights

Decision briefs with file:line evidence for G-23, G-32 and SK-01 are in this phase's
RESEARCH, copied from the 2026-10-17 brief. Also see
`.planning/milestones/v1.3-phases/14.1.1-gui-conformance-sweep/14.1.1-UAT.md`
(G-23 around :268-277 and :804-816, G-32 test 32 around :359-370) and
`.planning/sketches/005-vscode-layout/` (untracked) together with `.planning/sketches/MANIFEST.md`.

</code_context>

<specifics>
## Specific Ideas

None beyond the ROADMAP success criteria.

</specifics>

<deferred>
## Deferred Ideas

- Building the sketch 005 layout goes to the named v1.5 milestone.

</deferred>
