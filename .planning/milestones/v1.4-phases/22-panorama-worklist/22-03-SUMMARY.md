---
phase: 22-panorama-worklist
plan: 03
subsystem: ui
tags: [theia, panorama, group-model, undo, quit-flush, live-check]
status: complete

requires:
  - phase: 22-panorama-worklist
    provides: 22-01 model self-load and showsInStrip; 22-02 copy contract
provides:
  - GroupModel UNDO_CLOSE_MS (15000), closing map, closeGroup (hide, no write), undoCloseGroup, commitClose, commitAllClosing, isClosing, isClosingKey, listClosing
  - commitClose writes { kind 'closeGroup' } to the unchanged closeGroupRows, closes member widgets, persists the activity hand-off
  - pb-group-closing title class in the strip loop and one unscoped CSS rule (A3)
  - current-tab steering off pending tabs on every main-area bar
  - quit flush commits pending closes (onWillFlush), saveSession omits pending web tabs (A4)
  - full-tier live row pan04-undo-close-group-live with three in-run probe controls
affects: [22-04, panorama, chrome-bar, setups]

actuals:
  tokens: 11200
  tasks: 3
  commits: 4
plan_head_before: ccf1092a6129caab8a44207783ec64dcbc673c46
plan_head_after: 2b82ea09668cf7c825fe1b870341b46c5d216302

tech-stack:
  added: []
  patterns:
    - "Undo window state lives on the singleton GroupModel, never on the Organising widget, so a mode switch cannot end it"
    - "Long live-check waits run node-side; one page evaluation is bounded by the 20 s BiDi request timeout"

key-files:
  created:
    - scripts/verify-pan04-undo-close-group-live.mjs
  modified:
    - theia/extensions/modes/src/browser/group-model.ts
    - theia/extensions/modes/src/browser/organising-widget.ts
    - theia/extensions/modes/src/browser/setups-service.ts
    - theia/extensions/chrome-bar/src/browser/tab-strip-widget.tsx
    - theia/extensions/chrome-bar/src/browser/chrome-bar.css
    - scripts/verify-platform.sh

key-decisions:
  - "The member-widget close runs inside the persisted close write, so a save-error Retry that lands also closes the widgets"
  - "Until 22-04 removes the dialog, confirming it calls closeGroup then commitClose at once, as its copy promises"

requirements-completed: []

duration: ~15 min
completed: 2026-10-18
---

# Phase 22 Plan 03: Undo window on the group model Summary

**A closed group is hidden for UNDO_CLOSE_MS (15000 ms) on GroupModel, writing nothing. Undo restores it exactly. The close is written through the unchanged closeGroupRows when the timer ends or when PowerBrowser quits, and never by a mode switch. During the window its tabs show in no tab bar in any mode. pan04 proves this live with three probe controls.**

PAN-04 is not marked complete here. 22-04 adds the visible Undo control and removes the dialog. NG-074 and NG-084 are cited, not closed, and no ledger file was touched.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | 449516b | feat(22-03): a closed group waits UNDO_CLOSE_MS on the model and commits through closeGroupRows (PAN-04) |
| 1 | 14d8f2f | test(22-03): add the live undo-window row over the group model with in-run probe controls (PAN-04) |
| 2 | 4fcf4b2 | feat(22-03): hide a closing group's tabs in every tab bar and commit pending closes when PowerBrowser quits (PAN-04) |
| 2 | 2b82ea0 | test(22-03): pan04 covers every tab bar during the window and a quit inside it (PAN-04) |
| 3 | none | checks only; the logs are git-ignored |

`git show --stat --format= 449516b` lists exactly group-model.ts and organising-widget.ts. 4fcf4b2 lists exactly the four Task 2 code files. `git diff 02ce825 -- powerbrowser/shell scripts/lib/ng-a-live.mjs scripts/verify-ng-006-close-group-closes-web-tabs.mjs` is empty.

## Evidence

**Static checks** (after each code commit): all green.
- close-exactness and its self-test;
- view-parity, canvas-geometry and panorama-copy, each with its self-test;
- the mode-switch invariant;
- gui09-setups-copy (Task 2).

**Builds:**

| Log | Exit | Wall time | Built at |
|-----|------|-----------|----------|
| `logs/build-22-03-t1.log` | PHASE22_EXIT=0 | 13 s | 14d8f2f |
| `logs/build-22-03-t2.log` | PHASE22_EXIT=0 | 10 s | 2b82ea0 |

The bundle carries `steerFromClosing` and the commit log string.

**pan04 Task 1:** `logs/pan04-22-03-t1.log`, PASS, 52 s wall time. The detail lines match the t2 run below for (a) to (d). Its last line is `pan04-undo-close-group-live: probe controls: 2 planted page faults each turned their probe red`.

**ng-006 Task 1:** `logs/ng006-22-03-t1.log`, `  ng-006-close-group-closes-web-tabs: PASS`, 18 s wall time. The dialog path still commits at once.

**pan04 Task 2:** `logs/pan04-22-03-t2.log`, PASS, 64 s wall time, run at 2b82ea0. Detail lines, verbatim:
- `pan04-undo-close-group-live: (a) closeGroup(G1): pending true, listGroups lacks G1, active G2, 3 widgets alive; rows [{"uri":"web:wt-7963ge-1","url":"http://127.0.0.1:36813/a","group_id":"group-mvdd3p2z-8lkf","closed_at":null},{"uri":"web:wt-7963ge-2","url":"http://127.0.0.1:36813/c","group_id":"group-mvdd3p2z-8lkf","closed_at":null}]; the reader still lists G1`
- `pan04-undo-close-group-live: (b) coding: pending true, 3 alive; organising: pending true, 3 alive; browsing: pending true, 3 alive`
- `pan04-undo-close-group-live: (c) undoCloseGroup(G1): index 0, title, x, y, w, h and card order [web:wt-7963ge-1, web:wt-7963ge-2, terminal:pan04-t] equal; G1 active; store unchanged`
- `pan04-undo-close-group-live: (e) Browsing, /a current at the close: the strip paints none of [page a | page c | bash]; each G1 dock tab has pb-group-closing and display none; no bar's current title is a G1 widget (current: Welcome)`
- `pan04-undo-close-group-live: (e) Coding: each G1 dock tab has pb-group-closing and display none; no bar's current title is a G1 widget (current: Welcome)`
- `pan04-undo-close-group-live: (d) at 12003 ms (UNDO_CLOSE_MS 15000 minus 3 s): still pending, 3 widgets alive`
- `pan04-undo-close-group-live: (d) committed at 15056 ms: widgets gone, pages gone, rows [{"uri":"web:wt-7963ge-1","url":"http://127.0.0.1:36813/a","group_id":null,"closed_at":1792299948008},{"uri":"web:wt-7963ge-2","url":"http://127.0.0.1:36813/c","group_id":null,"closed_at":1792299948008}]; the reader lists [{"id":"group-mvdd3p36-7yjt","is_active":1},{"id":"group-mvdd3p39-6dks","is_active":0}]`
- `pan04-undo-close-group-live: (f) quit started 14995 ms before G4's deadline; the browser exited 519 ms after the quit started`
- `pan04-undo-close-group-live: (f) relaunch: /s restored; the reader lists [{"id":"group-mvdd3p36-7yjt","title":"Untitled group","is_active":1}] (no G4 group-mvdd4jeq-4v3g); no web tab on /q1 or /q2; rows [{"uri":"web:wt-7963ge-5","url":"http://127.0.0.1:36813/q1","group_id":null,"closed_at":1792299969632},{"uri":"web:wt-7963ge-6","url":"http://127.0.0.1:36813/q2","group_id":null,"closed_at":1792299969632}]; no loose or grouped card for them`
- `pan04-undo-close-group-live: probe controls: 3 planted page faults each turned their probe red`
- `verify-pan04-undo-close-group-live: PASS` and `  pan04-undo-close-group-live: PASS`

**What the (f) lines prove.** The browser exited 519 ms into the quit, which is long before G4's 15 s timer could fire. The G4 group row is gone from the store, and the session filter alone cannot delete a group row. So the quit flush's commitAllClosing is what closed G4, and that write landed inside the 2000 ms bound. Research A5 holds on this host.

**Task 3 regression rows.** Each ran alone after the t2 build, all PASS:

| Row | Wall time |
|-----|-----------|
| `  gui07-mode-switch-tabs-live: PASS` | 15 s |
| `  gui07-mode-switch-tabs-live-self-test: PASS` | 91 s |
| `  ng-032-quit-restores-session: PASS` | 19 s |
| `  ng-034-web-tab-history-survives-restart: PASS` | 19 s |
| `  ng-006-close-group-closes-web-tabs: PASS` | 18 s |

**--quick:** `logs/quick-22-03.log`, run at 2b82ea0. Totals: 132 PASS, 0 FAIL, 51 s wall time, `verify-platform: PASS -- all checks passed`. `docs/non-gui/quick-baseline.txt` is still 0 bytes.

**Gates:** the `<verify>` blocks of Tasks 1, 2 and 3 pass in full. `phase-gate.py` printed nothing after every commit, and the brand-residue scan exits 0 over 359 files.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The long pan04 waits run node-side**
- **Found during:** Task 1, step 4, while writing the script.
- **Issue:** `run()` is one BiDi `script.evaluate`, and `send()` times out after 20000 ms (`scripts/lib/firefox-bidi.mjs:135`). Step (d) waits up to `UNDO_CLOSE_MS + 10000` and P2 waits `UNDO_CLOSE_MS + 2000`, so either wait inside one page evaluation would time out.
- **Fix:** Each long wait is now a node-side sleep or `waitUntil` over short `run()` calls. The deadline is read from `listClosing()`. No assertion changed.
- **Files modified:** scripts/verify-pan04-undo-close-group-live.mjs
- **Commit:** 14d8f2f

### Ordering and structure choices (no assertion weakened)

- **commitClose:** the member-widget close runs inside the persisted write, right after the `closeGroup` mutate. The plan put it after the hand-off write. This way a save-error Retry that lands also closes the widgets. The hand-off write follows, under its own `active:` key.
- **pan04 step (e):** it runs in its own window on G1, between (c) and (d), and ends with an undo. P3 runs inside that window, after the Coding look.
- **pan04 step (f), strengthened:** the relaunch also requires G2's `/s` to be restored. Without that, the absence of `/q1` and `/q2` would prove nothing. The run also records when the quit started relative to G4's deadline, and when the browser exited.
- **Launch structure:** the first launch now uses `withShellQuit`, so that (f) quits inside the window.

## Known gaps, not fixed here

- **Reloading the frontend during a window.** The in-memory window is lost, and the group comes back with its tabs, the same as an Undo (research Pitfall 5, Open Question 2). 22-UI-SPEC does not cover this case.
- **Split panes.** A bar whose every tab is pending is left to the dock. pan04 asserts only the home pane (Open Question 1).
- **Dirty editors.** At the timer, an unsaved editor gets Theia's save prompt through `widget.close()`. At quit, the prompt behaviour (Pitfall 11, A6) was not exercised.
- **A failed first commit write.** The closing entry is cleared, so the group stays hidden while its tabs show as loose until Retry. Retry either lands the commit or, on a second failure, restores the group (the existing `persist` discipline).

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: scripts/verify-pan04-undo-close-group-live.mjs
- FOUND: 449516b, 14d8f2f, 4fcf4b2, 2b82ea0 (each an ancestor of HEAD)
