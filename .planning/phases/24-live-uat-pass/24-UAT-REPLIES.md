# Phase 24 UAT replies

Chris's replies to the Phase 24 UAT checkpoints, kept word for word. Each plan appends its own
section. A result on a sheet is written only from text in this file.

## Desk session (24-03), received 2026-10-19

Chris answered in the session's own question prompt (AskUserQuestion) by choosing from the options
shown to him. The orchestrator wrote the options and their "(Recommended)" labels; Chris chose
each option himself. His selections and the option texts, verbatim, as passed to this agent by the
orchestrator:

```text
D: ok (Recommended)
All 14 stand as recorded. Each one keeps what is built, tested and green.

d: skip, already proven (Recommended)
Recorded as skipped. Reason: the pan04/pan05 live checks plant each fault in code and saw it go red, and the static self-tests cover the rest.

defer: no second person (Recommended)
Recorded as deferred, with the reason 'no second person available this milestone'.

Run Launches A and B (Recommended)
```

The same selections mapped to the script's reply format by the orchestrator, verbatim:

```text
D: ok
Q1: d the pan04/pan05 live checks plant each fault in code and saw it go red, and the static self-tests cover the rest
Q2: defer no second person available this milestone
```

The last selection, "Run Launches A and B", is outside this plan's desk items. It is kept here for
24-04.

Note, 2026-10-19: the Q1 reason in this section was factually wrong, and it was withdrawn. The
pan04 and pan05 live checks plant only probe controls (undo, close and tabbability stubs that prove
each probe can go red). They plant none of the T faults, and 22-VERIFICATION.md:63 says "No live
row plants these failures". The orchestrator told Chris this, withdrew the "(Recommended)" labels,
and asked Q1 and Q2 again with no recommendation. The corrected answers are in the next section.
The D line in this section stands as recorded; its option text was accurate.

## Desk session (24-03) Q1 and Q2 re-asked, received 2026-10-19

Asked again with no recommendation. Chris asked for the orchestrator's view and was given it,
framed as his call: Q1 `d` with the reason "deferred follow-up: no on-screen trigger; needs
fault-injection tooling (v1.5)", and Q2 `defer` with the reason "deferred follow-up: no second
person available this milestone". His own reply in chat, verbatim:

```text
Q1: d
Q2: defer
```

The reasons he accepted with that reply, verbatim:

```text
Q1: deferred follow-up: no on-screen trigger; needs fault-injection tooling (v1.5)
Q2: deferred follow-up: no second person available this milestone
```

## Launch A and B (24-04), received 2026-10-19

**Run 1, held.** A first reply, "A: ok" and "B: ok", was held by the orchestrator and is not used
for any result. Chris's terminal log showed Launch A running about 2 minutes with 2 web tabs, the
corruption step printing "error: .../modes.json is missing or empty", and only one launch.

**Run 2.** The run-1 profile and config were moved, not deleted, to `run1-used` under the UAT
root, and new empty `profile/` and `config/` directories were made at the same paths, so the
Prepared-paths commands are unchanged; Chris launched with the Launch A command. The orchestrator
walked him through the items one at a time in chat. His replies, verbatim, each in answer to the
orchestrator's instruction for the items named:

After the orchestrator listed A01 to A08 (with O06's cold-start look inside A02):

```text
The checks all look fine did you run the already?
```

The orchestrator told him it had not run those checks, and counts this line as A01 to A08 `ok`
and O06 (cold-start half only) `ok`.

A09, A10, A16, A19 and A20 were driven by a headless script the orchestrator ran on its own
profile (scratch evidence, untracked: `uat-24/auto/report.json`). Asked whether to accept the
script's results or check them himself, Chris replied:

```text
Accept the script's results
```

A11, A12, A13, A14, A15 and A17: his reply to each, given separately, was:

```text
ok
```

Before A15 he wrote "I dont see the buton" and "yes i see the new tab" and sent a screenshot of
Coding mode; he did A15 after the orchestrator's guidance.

A18, the Organising step, with a screenshot:

```text
organising does not look good
```

The orchestrator describes the screenshot as: with a split main area, Organising opens as a tab
inside the right pane while the left pane keeps its tabs; the Organising tab icon is a blank
white square; and the group box is clipped at the right edge. For A18's Browsing, Coding and
back-to-Browsing steps (3, 4 and 6) he replied:

```text
ok
```

His last line, which leaves every other Session A, B and O item, the corruption step and Session
C pending:

```text
OK finish up what is left I want to do the GUI checks when everthing is done on my own time I just want a list
```

No `O:` line was given beyond O06's cold-start half. Session T is recorded skipped from the
committed `Route T:` line in 24-UAT-SCRIPT.md, with his Q1 line and reason from the desk section
above.
