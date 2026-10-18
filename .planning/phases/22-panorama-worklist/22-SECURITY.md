---
phase: "22"
slug: "panorama-worklist"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-10-18"
---

# Phase 22 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Theia frontend to the chrome-side group writer | "+" writes membership through the PowerBrowserGroupRequest channel at open time. The destructive closeGroup write moves from the click to the undo timer and the quit flush | setTabGroup, setGroupOrder, closeGroup, setActiveGroup and closeTab mutations |
| Frontend boot chain | GroupModel becomes a FrontendApplicationContribution that runs at layout init | Store reads at boot |
| Quit flush | A second onWillFlush listener writes inside the 2000 ms bound before the layout is stored | Pending group closes, session snapshot |
| Agent to Chris | Seven strings are Chris's to word; 22-01-SUMMARY is the only source of the wording | User-facing copy |
| 15-UI-SPEC to the commit gate | A spec row decides what copy and geometry the gui08 checks accept; SC3 puts the code, the spec and the checks in one commit | Copywriting, Retired copy and Canvas Geometry rows |
| Agent to the hash-locked check set | An edited NG-006 check is trusted only after Chris locks it | check_locks hashes, ledger versions |
| Command palette to the close path | The close-group command takes any group id | Group ids |
| Card click to tab close | A pointer target and the Delete key on every card close a tab | Widget close, closeTab rows |
| Full-run FAIL set to later phases | Later phases subtract this list of owned reds | FAIL row labels |
| Live harness to Chris's machine | The harness binds port 3939; port 3000 is Chris's container | Ports, processes |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-22-01 | DoS | GroupModel self-load re-entering the boot deadlock | high | mitigate | `onDidInitializeLayout(): void` subscribes and calls `void this.reload()`. It awaits nothing (theia/extensions/modes/src/browser/group-model.ts:214-223). GroupModel has no `onStart`. It is bound with `toService(GroupModel)` (modes-frontend-module.ts:85). pan03 (f) requires `isLoaded` with the Organising widget absent after a relaunch (scripts/verify-pan03-strip-group-live.mjs:263-291). full-22-07.log: "(f) relaunch: model loaded in 0 ms with Organising never opened" | closed |
| T-22-02 | Tampering | "+" joining the wrong group or racing the row write | medium | mitigate | `joinActiveGroup` reads `activeGroupId` and calls `moveCard` (group-model.ts:301-319). `moveCard` writes through `writeMembership` (`ensureRow`, then `setTabGroup`, :764-767) and `writeOrder`. Chrome refuses an unknown tab URI (powerbrowser/shell/PowerBrowserAPI.sys.mjs:1772) and, right after that check, an unknown group. The New Tab command joins the widget its opener returned and logs only the error name on failure (chrome-bar-commands.ts:156-162). pan03 (d) opens the tab and polls its tabs.sqlite row with no sleep (verify-pan03-strip-group-live.mjs:163-172). 22-01 recorded no "unknown tab URI" stop | closed |
| T-22-03 | Repudiation | a live probe that cannot go red | medium | mitigate | `derived()` builds the expected strip from `getActiveGroupId`, `getTabs` and `listUngrouped`, never from `showsInStrip` (verify-pan03-strip-group-live.mjs:42-50). There are two in-run controls: `showsInStrip` stubbed to true, and `joinActiveGroup` stubbed to a no-op. Each must go red or the row FAILs (:187-225). full-22-07.log: "probe controls: 2 planted page faults each turned their probe red" | closed |
| T-22-04 | Elevation of privilege | copy decided by the agent | high | mitigate | 22-01-PLAN.md:206 is `checkpoint:decision gate="blocking-human"`; no Phase 22 plan has `auto_select`. 22-01-SUMMARY.md:116-132 quotes Chris's two replies verbatim, with the resolved set. d1de837 (the answers) is an ancestor of every copy commit (40fad6d, 9c7e543, a8118f6). `git grep` at d1de837 finds none of the new strings in modes src | closed (R-1) |
| T-22-05 | Info disclosure | an internal identifier in a template-literal string the check never saw | medium | mitigate | The SINK pass (scripts/verify-gui08-panorama-copy.mjs:87, :111-121) feeds `derivedCopy` (:141). `internalsOf` runs over `new Set(derived)` (:206-209). Plants: "aria-description literal added", "template textContent added" and "grip value reworded" (:314-322). Copy check PASS ("no internals in copy") and self-test PASS (14 plants), both re-run at audit | closed (R-7) |
| T-22-06 | Repudiation | a derivation that cannot go red | medium | mitigate | In-memory replay at audit: the check at 54f3c8b over the tree at 78ebd1d (the unmodified spec) fails with exactly the surplus `"{}%", "{} by {} pixels", "{}\\n{}"`. That matches 22-02-SUMMARY.md:62-63. Self-test PASS with 14 plants (the 13 of 22-02 plus the 22-04 retired-dialog plant), re-run at audit | closed |
| T-22-07 | Tampering | copy that ships without Chris's answer | high | mitigate | Precondition: 22-02-PLAN.md:72. At df66816 every C1 string ships once, as answered: organising-widget.ts:809-811 (items 1 and 2), :1008-1009 (item 3), and the empty-canvas body, grip value, card tooltip and zoom readout (items 4-7). 15-UI-SPEC Copywriting rows 259 and 268-275 carry the same literals. The side-by-side table is at 22-02-SUMMARY.md:75-82. The 22-04 and 22-06 SUMMARYs state that the label, the accessible name and the × match character for character | closed (R-1) |
| T-22-08 | Tampering | tabs closed by a mode switch | high | mitigate | The `closing` map lives on GroupModel (group-model.ts:136), which is bound in singleton scope (modes-frontend-module.ts:83). `commitClose(` is called only by the UNDO_CLOSE_MS timer (group-model.ts:821-824) and by `commitAllClosing` (:888-891); only the onWillFlush listener calls `commitAllClosing` (:221). The only `kind: 'closeGroup'` mutate in theia/extensions src is :874. `closeGroupById` calls only `closeGroup` (organising-widget.ts:361-381); close-exactness (a)-(e) and their plants hold that. full-22-07.log pan04 (b): "coding: pending true, 3 alive; organising: pending true, 3 alive; browsing: pending true, 3 alive". gui07-mode-switch-tabs-live and its self-test PASS in the same run. Mode-switch invariant PASS at audit | closed |
| T-22-09 | Tampering | a quit inside the window restoring the group's tabs | high | mitigate | Flush listener: `event.waitUntil(this.commitAllClosing(this.actor))` (group-model.ts:221). `saveSession` drops every web tab whose row key passes `isClosingKey` (setups-service.ts:547). full-22-07.log pan04 (f): the quit started 14997 ms before G4's deadline and the browser exited 615 ms later. After the relaunch the reader lists no G4 and no web tab is open on /q1 or /q2 | closed (R-2) |
| T-22-10 | DoS | the flush listener holding quit | medium | mitigate | `WaitUntilEvent.fire(..., SHELL_STATE_WILL_FLUSH_TIMEOUT_MS)`, with the const at 2000 (theia/extensions/tab-uris/src/browser/profile-storage.ts:44, :106). No Phase 22 commit touches profile-storage.ts. The new listener only adds a `waitUntil` (group-model.ts:221). The snapshot filter is setups-service.ts:547 | closed (R-2) |
| T-22-11 | Tampering | an edit to the chrome writer outside review | medium | mitigate | `git diff 02ce825 df66816 -- powerbrowser/shell` is empty. `git diff 68bf812 df66816 -- powerbrowser upstream patches` is empty. The 9 close-exactness lines over `apiSrc` are identical at 68bf812 and df66816. Plants: "already-closed turned into a throw" and "closeGroupRows(data.id) removed" (scripts/verify-gui08-close-exactness.mjs:335-340) | closed |
| T-22-12 | Tampering | the agent locking its own edited check, or editing it after the lock | high | mitigate | 22-04-PLAN.md:244 is `checkpoint:human-action gate="blocking-human"`. The lock command appears only inside `<instructions>` (:265-274). scripts/verify-ng-006-close-group-closes-web-tabs.mjs has one commit since 02ce825 (1171320), and no other `verify-ng-*.mjs` changed. Ledger v392 `lock-checks` at 1171320 (commit 2a153a0) locks the file at 4e7e8b3c…881eb1d1, which equals its sha256 at audit. phase-gate.py printed nothing at audit | closed (R-4) |
| T-22-13 | Repudiation | SC3 split across commits, so a commit had a red gate | medium | mitigate | 9c7e543 lists exactly the seven SC3 files. The commits after it, to the end of 22-04, touch only pan04, ng-a-live and ng-006. At audit, an in-memory replay ran gui08 panorama-copy, close-exactness, canvas-geometry and view-parity, with their self-tests, over the tree at each of the 37 commits 68bf812..df66816. All were green at every commit. Two negative controls went red: close-exactness@9c7e543 over 5e7c579 (dialog, commit at the click) and close-exactness@43f91dc over 6407a8a (4 failures) | closed (R-9) |
| T-22-14 | Info disclosure | an internal key in the Undo accessible name | low | mitigate | `title` and `aria-label` are `Undo Close Group "${entry.group.title}"` (organising-widget.ts:810-811). The group id goes only into `data-command` and `data-closing` (:807-808). Both sinks are in SINK. Copy check PASS ("no internals in copy") at audit | closed (R-7) |
| T-22-15 | Tampering | unsaved editor changes lost when the window commits | high | mitigate | `commitClose` closes members with `this.widgetOf(tab.uri)?.close()` (group-model.ts:876-878). Theia's SaveableService installs `close: closeWithSaving` on a saveable widget (theia/node_modules/@theia/core/src/browser/saveable-service.ts:239-247, :268-279), so that close prompts | closed (R-3) |
| T-22-16 | Tampering | the last group closed through the command, bypassing the hidden × | medium | mitigate | `if (!this.canCloseGroup(id)) return undefined;` is the first statement of `closeGroup` (group-model.ts:804-807); `canCloseGroup` is at :402-404. The only `kind: 'closeGroup'` mutate is in `commitClose` (:874), which runs only for ids that `closeGroup` put in `closing`. The command reaches `closeGroupById` (organising-widget.ts:2279-2283, :361-365). Covered by close-exactness (h) and its plant "last-group guard removed from the model close". full-22-07.log pan04 (h): "close-group on G2: pending false, still listed, 0 Undo controls, notice false" | closed |
| T-22-17 | Repudiation | a render-only guard a check cannot see | low | mitigate | close-exactness (h)-(k) derive the model, canvas and tree sites (verify-gui08-close-exactness.mjs:264-284), with one plant each (:341-349). Self-test PASS (10 plants) at audit. The sites are organising-widget.ts:863 and :1087, and organising-tree.ts:53 | closed |
| T-22-18 | Tampering | unsaved editor changes lost by a card close | high | mitigate | `closeCard` awaits `shell.closeWidget`, returns false while the widget is alive, and removes the card only after disposal (group-model.ts:906-915). `ApplicationShell.closeWidget` calls `closeWithSaving` for a SaveableWidget (theia/node_modules/@theia/core/src/browser/shell/application-shell.ts:1765-1767). full-22-07.log pan05 (d): the save prompt opened, and Cancel kept the card, the editor, its unsaved text and the file on disk | closed |
| T-22-19 | Tampering | the wrong tab closed | medium | mitigate | `widgetOf` matches `keyOf` over the main panel and skips Organising (group-model.ts:894-896). full-22-07.log pan05 (a): /a's widget is disposed and every other widget in G is alive. pan05 (f) records no setTabGroup, setGroupOrder, dissolveGroup or closeGroup mutation from the closes | closed (R-8) |
| T-22-20 | DoS | a tabbable × breaking keyboard reach of the cards | low | mitigate | `close.tabIndex = -1` (organising-widget.ts:1006). full-22-07.log pan05 (g): "tab stops group 1, loose 1; 3 card x, 0 tabbable", and the control that sets every × to tabIndex 0 went red. gui08-loose-cards-live PASS in the same run | closed |
| T-22-21 | Tampering | a new red absorbed into the FAIL set | high | mitigate | 22-FAILSET.txt (6b32bc6) is one line: `ng074-ci-green-on-main<TAB>NG-074 (Phase 25)`. Re-derived at audit: full-22-07.log (run at 48025d3, after build-22-07) has 237 PASS rows and two FAIL rows, verify-customize-inert and ng074-ci-green-on-main. The alone re-run of verify-customize-inert is PASS; the alone re-run of ng074 is FAIL. 19-FAILSET-1.76.txt owns ng074 as "NG-074 (Phase 25)", not as Phase 21 | closed (R-5) |
| T-22-22 | DoS | the full run taking port 3000 or killing a sidecar from this checkout | medium | mitigate | PB_VERIFY_PORT defaults to 3939 and is exported (scripts/verify-platform.sh:62-63). Before its first swap, the binary-hosted sidecar binds port 0 on 127.0.0.1 (powerbrowser/shell/TheiaService.sys.mjs:676-677); powerbrowser/ is unchanged in this phase. No added line in the phase's scripts diff contains kill, pkill, process.kill or a port-3000 literal; the two `3000` hits in pan04 are millisecond offsets. Every plan carries the pgrep guard and "stop and ask, never kill" | closed (R-6) |
| T-22-SC | Tampering | npm/pip/cargo installs (plans 22-01 to 22-07) | low | accept | AR-22-01. `git diff 68bf812 df66816` over the lock, package.json, requirements, Cargo, pyproject and flake files is empty. The last theia/yarn.lock commit is 2700e4c (Phase 19). Every new import resolves to an already-declared dependency: p-debounce is in theia/extensions/modes/package.json:11, and @powerbrowser/modes and @powerbrowser/tab-uris are already declared by chrome-bar and modes | closed |

*Status: open · closed · open — below high threshold (non-blocking)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-22-01 | T-22-SC | No Phase 22 plan adds a package. The sidecar builds in 22-01 to 22-07 use the committed lock audited in Phase 19 | plans 22-01 to 22-07 (autonomous run) | 2026-10-18 |

---

## Residual Notes

None of these reopens a threat at L1.

- R-1 (T-22-04, T-22-07): Chris did not word or answer any item himself. His first reply was "can you contiue in atonomes mode", and the orchestrator then took the recommended set. When shown that set and asked to confirm, he replied "just contiune the planed work" (22-01-SUMMARY.md:118-122, quoted as relayed by the orchestrator). The gate held and the answer is his, but it is a blanket acceptance under his standing v1.4 autonomous instruction. 22-01-SUMMARY says he may revise the strings at the end-of-phase review. The 22-07 review list (22-07-SUMMARY.md:112-133) names the A1-A12 assumptions but not the seven strings.
- R-2 (T-22-09, T-22-10): the snapshot filter works only because of listener order.
  - SetupsService registers saveSession in onStart (setups-service.ts:485, :502). GroupModel registers commitAllClosing later, in onDidInitializeLayout (group-model.ts:221). So saveSession reads `isClosingKey` first.
  - `commitClose` deletes the closing entry synchronously, through persist's apply (group-model.ts:869-870, :1011). With the order reversed, the filter would see an empty map while the widgets are still open.
  - Only the full-tier pan04 (f) row guards this order. No `--quick` check pins it.
  - The bound-miss path has no test. If closeGroupRows never runs, the store keeps the group row and its member rows, so the next load would show the group again as a box of not-open cards, though no web tab reopens.
- R-3 (T-22-15): no live row drives a dirty editor through a group commit; pan05 (d) covers only the card ×, through shell.closeWidget. In `commitClose` the widget close runs after the closeGroup mutate (group-model.ts:874-878). So if the prompt is cancelled at the timer, the editor stays open while its row is already closed and ungrouped. At quit, the prompt runs inside the 2000 ms flush bound. That case (research Pitfall 11, A6) was not exercised (22-03-SUMMARY.md Known gaps).
- R-4 (T-22-12): the ledger history records no actor.
  - The only evidence that Chris, not an agent, ran `lock-checks` (v392, 2026-10-18T05:42:32Z) and `baseline-checks` (v393, 14:45:18Z) is 22-04-SUMMARY. It also reports that the permission system denied the agent's mutation-red worktree attempt.
  - `baseline-checks` moved check_baseline from 252 to 392. That waives the failure-proof rule for every row completed at or before v392 (all 55 done rows), not only NG-006.
  - The edited NG-006 check has a green run but no recorded red.
  - The hash lock still holds.
- R-5 (T-22-21): verify-customize-inert failed in the full run ("state 1 (absent) vs state 2 (empty) -- pixels differ") and passed alone, so R28 kept it out of 22-FAILSET.txt. Phase 22 changed nothing under the customize extension. The full-run and re-run logs are git-ignored and exist on this host only.
- R-6 (T-22-22): the pgrep guard and "never kill" are procedure only. No SUMMARY logs pgrep output; the 22-05, 22-06 and 22-07 SUMMARYs state PB_VERIFY_PORT=3939. The structural protection is the 3939 default and the port-0 sidecar bind.
- R-7 (T-22-05, T-22-14): `internalsOf` removes `${…}` slots before matching (verify-gui08-panorama-copy.mjs:167), so it checks literal text only. A value interpolated into a slot is outside the check. The Undo name's only slot is the user's group title. No self-test plant puts an internal identifier into a template or ARIA sink; plants 11-13 prove only that those sinks reach the surplus diff.
- R-8 (T-22-19): `widgetOf` returns the first main-panel widget carrying the card's key (group-model.ts:894-896). pan05 does not cover a key held by two widgets, such as one file open in two panes.
- R-9 (T-22-13): the 22-02 verify clause "check, spec and source share their last commit" fails by construction after the check-only follow-up 54f3c8b (22-02-SUMMARY deviation 2). The replay shows the gate green at both 40fad6d and 54f3c8b.
- Outside the register:
  - No SUMMARY has a Threat Flags section, so there is no unregistered flag.
  - 22-04-SUMMARY records that the address bar reads `view:powerbrowser.modes.organising` in Organising mode. That is an internal identifier in user-facing text under the CLAUDE.md copy rule. It predates Phase 22 and was not investigated.
  - Commit 8b7f484 (23-02) landed on main during this audit. It changes setups-service.ts (the name cap) but not the saveSession filter, and it is outside this phase.

---

## Security Audit

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-10-18 | 23 | 23 | 0 | gsd-security-auditor at HEAD df66816 (L1 grep-depth; static re-runs of gui08 panorama-copy, close-exactness, canvas-geometry and view-parity with their self-tests, the mode-switch invariant and gui09-setups-copy; in-memory replay of the four gui08 checks and self-tests at all 37 commits 68bf812..df66816, with three negative controls red; phase-gate silent; phase logs read, not re-run; no verify-platform.sh, no live checks, no builds) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-10-18.
