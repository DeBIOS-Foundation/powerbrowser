---
phase: 20-non-gui-gaps
plan: 03
subsystem: verification
tags: [verify-platform, group-channel, JSWindowActor, wantUntrusted, PLAT-02, G-14.1.1-10]
status: complete

requires:
  - phase: 20-02
    provides: a race-free, planning-path-clean --quick gate to register into
provides:
  - scripts/verify-group-channel.mjs (static D0-D6 group-channel row with a 12-plant --self-test)
  - group-channel and group-channel-self-test rows directly after gui02-web-tab-bridge-self-test
  - G-14.1.1-10 closed in 14.1.1-UAT.md, GUI-DEFECTS.md item 13 and FEATURES.md
affects: [20-04, 20-05, 20-VERIFICATION, v1.4 closeout]

actuals:
  tokens: 8400
  tasks: 3
  commits: 3
plan_head_before: 6d7f0109098c85d051e6679485ddd7c178baa3a3
plan_head_after: 205ce55b54cbe5fde7e960ac9f2ae85284b136bc

tech-stack:
  added: []
  patterns:
    - "Pure checkChannel(Map path->text) so every plant runs on an in-memory copy, never on disk"
    - "Allowed child module schemes derived from upstream DesktopActorRegistry.sys.mjs at check time"
    - "Request/response names derived from the child's guard and CustomEvents; frontend bindings derived per file"

key-files:
  created:
    - scripts/verify-group-channel.mjs
  modified:
    - scripts/verify-platform.sh
    - .planning/milestones/v1.3-phases/14.1.1-gui-conformance-sweep/14.1.1-UAT.md
    - .planning/GUI-DEFECTS.md
    - .planning/research/FEATURES.md

key-decisions:
  - "D2 resolves the child URI through the jar.mn resource alias to its packaged entry path (content/powerbrowser/GroupActorChild.sys.mjs), which is stricter than a basename match and covers it"
  - "A D0 derivation that is empty or ambiguous returns before D1-D6 run, so a broken instrument reports ZERO instead of a cascade"

metrics:
  duration: "~6 min"
  completed: 2026-10-17
---

# Phase 20 Plan 03: Group-channel row Summary

A static `--quick` row, `group-channel`, now checks the PowerBrowserGroup actor channel: `wantUntrusted: true`, a content-loadable child scheme taken from upstream's registry, the jar.mn resource alias and packaged entry, `document` dispatch with `bubbles: true`, the content-window JSON round trip on the reply, event-name agreement, and `window` response listeners. A 12-plant self-test proves each recorded fault turns the row red.

## Results

- group-channel at HEAD:
  `group-channel: PASS -- 7 dispatch sites in 5 frontend files, 2 child CustomEvents, request PowerBrowserGroupRequest, wantUntrusted set, child scheme resource in upstream set {moz-src, resource}; static: gui02-web-tab-live is the runtime proof`
- self-test:
  `group-channel-self-test: PASS -- clean tree green, 12 plants red`
- Each plant and the failure line it matched:
  1. chrome child module: `PowerBrowserAPI.sys.mjs: D2 child scheme -- GROUP_ACTOR_CHILD_MODULE chrome://powerbrowser/content/GroupActorChild.sys.mjs uses chrome:, not in the upstream child scheme set {moz-src, resource}`
  2. wantUntrusted false: `PowerBrowserAPI.sys.mjs: D1 wantUntrusted -- ... { capture: true, wantUntrusted: false } lacks wantUntrusted: true`
  3. wantUntrusted deleted: `PowerBrowserAPI.sys.mjs: D1 wantUntrusted -- ... { capture: true } lacks wantUntrusted: true`
  4. window dispatch: `chrome-store-client.ts: D4 dispatch target -- PowerBrowserGroupRequest dispatched via window.dispatchEvent, not document.dispatchEvent`
  5. bound event on window: `browser-window-command.ts: D4 dispatch target -- ... event request dispatched via window.dispatchEvent, not document.dispatchEvent`
  6. bubbles false: `group-actor-client.ts: D4 bubbles -- PowerBrowserGroupRequest CustomEvent lacks bubbles: true`
  7. bubbles deleted: `profile-storage.ts: D4 bubbles -- PowerBrowserGroupRequest CustomEvent lacks bubbles: true`
  8. round trip removed: `GroupActorChild.sys.mjs: D5 reply clone -- PowerBrowserGroupResponse detail is not the content window's win.wrappedJSObject.JSON.parse(JSON.stringify( round trip`
  9. jar alias removed: `jar.mn: D2 jar alias -- jar.mn has no "% resource powerbrowser" line`
  10. request respelled: `profile-storage.ts: D3 event name -- 'PowerBrowserGroupRequets' is not a child DOM name`
  11. child guard renamed: `GroupActorChild.sys.mjs: D0 request name -- ZERO request names derived from the event.type !== guard`
  12. listener on document: `group-actor-client.ts: D6 response listener -- PowerBrowserGroupResponse listener is on document, not window`
- `--only group-channel` and `--only group-channel-self-test` print `  <name>: PASS`.
- Quick gate (R33), log `.planning/phases/20-non-gui-gaps/logs/quick-20-03.log` (git-ignored): reached `verify-platform: summary`, 124 PASS, the only FAILs are the 4 gui08 baseline rows; FAIL set minus `docs/non-gui/quick-baseline.txt` is empty.
- `phase-gate.py` silent after every commit; `scan-brand-residue.mjs` exit 0 with files staged; `plan-gate.py --phase 20` prints `plan gate passed`.
- No product source changed: `git status --porcelain -- powerbrowser upstream theia/extensions` empty.
- `git show --stat` of fd29ac9 and 7f6f732 each lists exactly scripts/verify-group-channel.mjs and scripts/verify-platform.sh. 205ce55 changes only the G-14.1.1-10 entry in 14.1.1-UAT.md (status, deferred_to replaced by closed_by, reproducer added).

## Commits

- fd29ac9 test(20-03): add the group-channel row over the actor registration, child and frontend dispatch (PLAT-02)
- 7f6f732 test(20-03): plant the five channel faults and their second forms in the group-channel self-test (PLAT-02)
- 205ce55 docs(20-03): close G-14.1.1-10 on the group-channel rows

T1 SHA fd29ac9, T2 SHA 7f6f732 (both cited in the G-14.1.1-10 `closed_by`).

## Deviations from Plan

- The `diff` helper was not copied from verify-web-tab-bridge.mjs: no rule in this check compares two sets, so it would have been dead code. `stripComments`, `derive` and `apiMethodBody` were copied. No behaviour change.
- The tracer gate (Task 1) ran in interactive end-of-phase mode with an automated-only `<verify>`: re-run, passed, continued without a checkpoint.

## Known limits

- D4 and D6 recognise a request or response binding only as a `const X = '<name>'` in the same file. A file that imports the constant from another module would not be counted. No file does this today (every one of the 5 declares its own const).
- `stripComments` is the shared heuristic: a `//` after whitespace inside a string literal would be cut. At HEAD the derived counts (7 sites, 5 files, 2 child events) match the research's manual count, so nothing is lost today.
- The row is static. It does not prove runtime delivery; `gui02-web-tab-live` does that.

## Self-Check: PASSED

- FOUND: scripts/verify-group-channel.mjs
- FOUND: fd29ac9, 7f6f732, 205ce55 (all ancestors of HEAD)
