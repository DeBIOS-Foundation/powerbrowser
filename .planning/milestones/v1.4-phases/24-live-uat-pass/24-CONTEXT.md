# Phase 24: Live UAT Pass - Context

**Gathered:** 2026-10-19
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss)

<domain>
## Phase Boundary

Chris tests every shipped GUI surface live on the final stack (Theia 1.76.0, React 19.2.8,
Node 24, Gecko 153.5.0esr), and no UAT result is left `pending` (UAT-01, NG-084). See the
ROADMAP.md Phase 24 success criteria.

</domain>

<decisions>
## Implementation Decisions

### Locked
- Only Chris can record a live UAT result. The agent prepares the sheets and one ordered
  script, and the run itself is a blocking-human checkpoint. The agent never writes a
  `pass` result for a test Chris did not report.
- The sheets are 10, 13, 14, 14.1, 14.1.1 and 15. The 15 sheet does not exist yet and is
  written in this phase. All sheets live in the archived milestone directories under
  `.planning/milestones/`.
- Items handed to this phase, which must appear in the script:
  - Phase 22's verifier `human_needed` items:
    - the two screenshots (undo window, card close);
    - ratifying or overturning 22-UI-SPEC assumptions A1, A2, A4, A5, A7, A10, A11 and
      the click flash;
    - the three open questions recorded in 22-07;
    - the failure paths added by review fixes WR-01/02/03/05;
    - the WR-02 copy gap: a failed "+" join in Browsing shows nothing on screen.
  - Phase 23: G-11 (the strip relocation, which closes GUI-DEFECTS item 2), 14.1.1-UAT
    tests 11, 23 and 32, and 14-UAT tests 3, 5, 7 and 8 plus G-14.1.1-1 and -13
    (from 14-VERIFICATION).
  - The C1 copy answers in the 22-01 SUMMARY, open to Chris's revision.
  - The v1.5 milestone name, taken as "Coding Workbench Layout" by the orchestrator.
- Every sheet gets a React 19 runtime line with a recorded result.
- NG-084 widened text:
  - Ledger row text cannot be edited after `add`.
  - Research the exact mechanism: a drop of NG-084 plus an add of a new row, as with
    NG-082 to NG-086 in Phase 19. Drop is Chris-only.
  - Chris runs every user-only command himself, from a terminal command that starts with
    `cd /home/chris/coding/Power-Browser` on its own line.
- Copy changes Chris asks for during UAT are applied only from his own words, in chat or
  in his terminal. Relayed approvals are refused by the permission system.
- Live checks use `PB_VERIFY_PORT` (default 3939); never touch port 3000. Rebuild the
  sidecar before the session.
- `--quick` stays at 0 FAIL with an empty baseline.

### Claude's Discretion
How to group the script so Chris can run it in one sitting, in the fewest app launches.

</decisions>

<code_context>
## Existing Code Insights

Find every `result: pending` in the six sheets. Also see
`.planning/phases/22-panorama-worklist/22-VERIFICATION.md`, 22-07-SUMMARY (the
end-of-phase review list), 23-0*-SUMMARY,
`.planning/milestones/v1.3-phases/14-modes-windows-setups/14-VERIFICATION.md`, and the
ledger row NG-084 (read via `scripts/ledger-report.py`).

</code_context>

<specifics>
## Specific Ideas

None.

</specifics>

<deferred>
## Deferred Ideas

None.

</deferred>
