# Phase 24: Live UAT Pass - Research

**Researched:** 2026-10-18 (HEAD `38712bd`, `main`. Built from four inventory reports given to this agent, plus spot checks run this session. No build, no `verify-platform.sh` run and no live launch were made.)
**Domain:** Preparing six UAT sheets and one ordered script for a live human UAT session, and replacing ledger row NG-084 with a widened row
**Confidence:** HIGH for sheet counts, pending-test lists, installed stack versions and the ledger hook's agent sets (re-read or re-counted this session). MEDIUM for line citations taken from the reports and not re-read. LOW for the React 19 line wording, the fault-plant route and the corrupt-`modes.json` path (marked [ASSUMED]).

## Summary

Phase 24 writes no product code. It has three jobs. First, prepare the sheets: write the new 15 sheet, add a React 19 runtime test to each of the six sheets, and annotate expectations that no longer match the shipped contract. Second, run one ordered live session, in which Chris records every result. Third, replace NG-084, whose text ("The five v1.2 human UAT sheets are signed") cannot be edited, with a new row NG-089 that names the six sheets and the React 19 line.

The count of pending results at HEAD, re-counted this session with `grep '^result:'`:

| Sheet | pending | other results | React 19 line |
|---|---|---|---|
| 10 | 5 (`pending`) | — | none |
| 13 | 1 (`[pending]`) | 11 pass, 2 skipped | none |
| 14 | 4 (`pending`) | 5 issue, 1 superseded | none |
| 14.1 | 10 (`[pending]`) | — | none |
| 14.1.1 | 16 (`pending`) | 32 issue | none |
| 15 | sheet does not exist | — | — |

This is 36 pending result lines. Ten of them (14.1 tests 1–10) are word-for-word copies of 14.1.1 tests 33–42, and four 14 tests duplicate four 14.1.1 tests. That leaves 22 distinct pending observations outside the 15 sheet. The new 15 sheet adds 46 tests, plus one optional test. Some of them are desk rulings and some are failure paths with no on-screen trigger.

The best grouping is one prep step, one desk sitting, and four app runs. Launch A on a fresh profile covers almost everything and ends with a quit inside an undo window. Launch B relaunches on the same profile for the restore items. A fault launch is needed only if Chris picks the planted-fault route. Launch C, the GEN-05 drill, runs last because it edits tracked files. The 10/5 stranger carry-test runs outside all of these.

**Primary recommendation:** four plans.
- 24-01: the NG-089 check, its registry rows, and the ledger swap. Two Chris commands block this plan.
- 24-02: the sheets and the ordered script.
- 24-03: environment prep plus the blocking-human live session.
- 24-04: closeout. Recount the summaries, close NG-089, Chris locks the check hashes, and update the G-11 records if Chris passed G-11.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
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

### Deferred Ideas (OUT OF SCOPE)
None.

### Phase boundary (CONTEXT `<domain>`)
Chris tests every shipped GUI surface live on the final stack (Theia 1.76.0, React 19.2.8,
Node 24, Gecko 153.5.0esr), and no UAT result is left `pending` (UAT-01, NG-084). See the
ROADMAP.md Phase 24 success criteria.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UAT-01 | A Phase 15 UAT sheet exists; the 10, 13, 14, 14.1, 14.1.1 and 15 sheets have no pending result, including a React 19 runtime line (NG-084). [VERIFIED: `.planning/REQUIREMENTS.md:89-90`] | The deduplicated item table; the run order; the 15-UAT outline; the React 19 line design; the NG-084 → NG-089 mechanism with the `ng089-uat-sheets` check |
</phase_requirements>

ROADMAP Phase 24 success criteria [VERIFIED: `.planning/ROADMAP.md:346-357`]:
1. A Phase 15 UAT sheet exists and has been run.
2. The 10, 13, 14, 14.1, 14.1.1 and 15 UAT sheets have no `pending` result.
3. The sheets carry a React 19 runtime line with a recorded result.
4. The widened NG-084 text is approved and recorded in the ledger.

## Project Constraints (from CLAUDE.md)

- **Never fork or patch Theia core; never modify Gecko outside the patch stack.** This phase changes no product code, so neither rule is touched. The 10/4 GEN-05 drill edits `configuration.toml` and `brand/`, and its revert must leave `git -C upstream diff` empty.
- **Design for the bridge.** Not touched.
- **Repo path without a space.** The 10/5 fresh clone must also go to a path with no space (hard rule 4), or its tier-3 build fails.
- **Theia is the default GUI; stock chrome reachable.** 10/1 is the live check of this rule (GUI-01, `window.open(url, '_blank')`).
- **No generator in Phase 1; the residue scan is a permanent gate.** The scan iterates `git ls-files`, so stage the new check script before trusting a green scan. `.planning/` is excluded from the scan, so the sheets cannot fail it (23-RESEARCH, `inventory/brand-tokens.json` `"exclude"`). Do not read that as a check of the sheets.
- **One driver, one registry.** The NG-089 check is a row pair in `scripts/verify-platform.sh` (`ng089-uat-sheets`, `ng089-uat-sheets-self-test`), never a sibling driver.
- **Verification rules:** derive the expectation from the tree, not a hand-kept list. The NG-089 check takes its sheet list from the row text. It gets a `--self-test` that plants each fault and goes red naming it.
- **User-facing copy:** no internal identifier in user-facing text. Any copy Chris asks for during UAT is applied only from his own words (CONTEXT).
- **Builds run in `nix develop .#theia`**. The sidecar rebuild before the session runs there. `node` and `objdir/dist/bin/powerbrowser` run outside a dev shell.
- **Memory notes in force:**
  - `concurrent-sessions-on-main`: commit by explicit path. Never use `-a`, `--amend` or stash. Untracked foreign files exist now (`.planning/HANDOFF-plan-reorg.md`, `13-VERIFICATION.md`, the 21 and 22 `logs/` directories).
  - `chrome-js-startup-cache`: launch with `-purgecaches`, or edited chrome `.js` silently does not run. 14.1.1 test 3 needs this.
  - `live-gui-debug-loop`: the standalone sidecar runs on `:4000` for agent debugging only. It is not a substitute for Chris's run.
  - `screenshot-pb-on-kde-wayland`: how the agent captures a screenshot, if Chris asks for one.
  - `one-fix-at-a-time-confirmed`: v1.4 runs autonomously, and it stops for ledger approvals, live checks and pushes. This phase has all three kinds of stop.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Recording a UAT result | Chris (human, live) | Sheet files under `.planning/milestones/` | CONTEXT: only Chris records a result |
| Sheet preparation (15-UAT, React 19 tests, stale-text annotations, `build:` block) | Agent, `.planning/milestones/*/` | — | Records only; no runtime tier |
| Ordered run script | Agent, a phase-dir document (for example `24-UAT-SCRIPT.md`) | — | CONTEXT: "one ordered script" |
| "No pending, React 19 recorded" gate | `scripts/verify-ng-089-uat-sheets.mjs` in the `verify-platform.sh` registry | `phase-gate.py` (row due, `check-fail` recorded) | One driver, one registry |
| Ledger row swap | Chris (the drop, `lock-checks`) | Agent (`add`, `set`, `set-status`, `record-fail`) | `.claude/hooks/ledger-verify-hook.py:34-36` agent sets |
| Live fixtures (slow page, retitle page, hostile page) | Agent-run loopback server on an ephemeral port | `scripts/lib/pb-relaunch.mjs` `servePages` | Never port 3000 |
| Runtime surfaces under test | Browser tier (Theia frontend: chrome bar, strip, modes, Panorama, web tabs); chrome tier (`PowerBrowserAPI.sys.mjs`, stock browser window) | Backend (tab store SQLite) | Already shipped; this phase only observes them |

## Standard Stack

No packages are installed. The stack under test was re-read this session:

| Component | Version | Evidence |
|-----------|---------|----------|
| `@theia/core` | 1.76.0 | [VERIFIED: `theia/node_modules/@theia/core/package.json` `"version": "1.76.0"`] |
| `react` | 19.2.8 | [VERIFIED: `theia/node_modules/react/package.json` `"version": "19.2.8"`] |
| Gecko | 153.5.0esr | [CITED: 24-CONTEXT `<domain>`] |
| Node | 24 | [CITED: 24-CONTEXT; 23-RESEARCH ran `node -v` → v24.19.0] |
| Ledger | ledger_version 395; highest id NG-088; NG-084 `deferred-approved`, owner chris, phase 15 | [VERIFIED: `ledger-report.py --root .` this session] |

## Package Legitimacy Audit

Not applicable: this phase installs no external package.

**Packages removed due to [SLOP]:** none. **Packages flagged [SUS]:** none.

## Current State

### Sheets and their paths

| Sheet | Path | Frontmatter `status` |
|---|---|---|
| 10 | `.planning/milestones/v1.2-phases/10-sign-off-closeout/10-UAT.md` | `pending-human` (outside the template set) |
| 13 | `.planning/milestones/v1.3-phases/13-chrome-bar-strip-relocation-spike/13-UAT.md` | template |
| 14 | `.planning/milestones/v1.3-phases/14-modes-windows-setups/14-UAT.md` | `partial` |
| 14.1 | `.planning/milestones/v1.3-phases/14.1-in-theia-web-tabs-gui-02/14.1-UAT.md` | `testing` |
| 14.1.1 | `.planning/milestones/v1.3-phases/14.1.1-gui-conformance-sweep/14.1.1-UAT.md` | `diagnosed` |
| 15 | `.planning/milestones/v1.3-phases/15-panorama-organising/15-UAT.md` (to be written) | — |

The 15 directory has PLAN/SUMMARY for 15-01..03 and `15-UI-SPEC.md`, but no UAT file [VERIFIED: `ls`].

### Deduplicated live UAT item table

Key:
- **Rows:** every sheet row the observation settles. Chris records the same result on each listed row (Report 1: "One live observation must be recorded on both sheets").
- **S:** the session from the run order below (P = prep, D = desk, A, B, F, C, X = outside any launch).
- **Partial proof:** automated rows that prove part of the item. A row's PASS never sets a result.
- **Stale:** the expectation on the sheet no longer matches the shipped contract. The agent annotates it; accepting new wording is Chris's call.

**Pending rows: 10, 13, 14, 14.1, 14.1.1**

| # | Observation | Rows | S | Needs | Partial proof | Stale |
|---|---|---|---|---|---|---|
| L01 | Stock browser window opens from "Open Browser Window"; the address bar navigates; an in-window modal shows; closing it returns to the shell (GUI-01) | 10/1 | A | Graphical session | `gui01-command-registered`, `gui01-single-shell-window`, `gui01-browser-close-does-not-quit` | — |
| L02 | Writing `customize.css` restyles the shell without a rebuild; deleting it reverts (GUI-03) | 10/2 | A | Throwaway `XDG_CONFIG_HOME`; file at `${XDG_CONFIG_HOME:-$HOME/.config}/powerbrowser/customize.css` | `verify-customize-inert`, `verify-dev-flag-off` | Step 1's "customize dev flag on": the CSS layer needs no flag (docs/CUSTOMIZE.md); `powerbrowserPrivilegedJs` gates the JS layer only |
| L03 | Mark at correct density in all three places; title shows the suffixed display name (GEN-02) | 10/3 | P, A | Desktop entry installed (absent now; `sed` install in docs/BUILD.md:1175-1199) | `icon-ihdr`, `desktop-entry-quick` | Name "Power Browser Dev" → tree has `PowerBrowser Dev` |
| L04 | Fixture rebrand drill: manifest → generate → build → live render; revert restores `--check` green (GEN-05) | 10/4 | C | Edits tracked files and rebuilds the sidecar; its own launch, last | `theia-branding`, `theia-endpoints` | — |
| L05 | Stranger carry-test of `docs/REBRANDING.md`: fresh clone, rebrand, tier-3 build (DOC-01) | 10/5 | X | Fresh clone at a no-space path; tier-3 build (about 47–54 min); a person other than the author | `verify-rebranding-docs`, `theia-fresh-clone-build` | — |
| L06 | Suggestions: up to 8 rows; Enter or click navigates; empty commit is a no-op; provider failure degrades with the contracted error row | 13/6 | A | Profile with history (visit pages first) | `gui06-chrome-bar-suggestions`, `ng-023-suggestions-history-bookmarks`, `gui02-web-tab-live` | Matching is substring, not prefix. The error row appears only when the tab reader throws; history or bookmark failure only logs (chrome-bar-places-suggestions.ts:24-28). See Q3 |
| L07 | Strip relocates per mode (Variant B): top in Browsing; per-pane bars with split main area; dock bars in Coding; canvas, no strip, in Organising; no tab closed, moved or detached (G-11) | 14/3 = 14.1.1/11 (+ 14-VERIFICATION human items 1, 6) | A | Two web tabs and a split main area; Browsing → Coding → Organising → Browsing | `gui07-mode-switch-tabs-live` (tab identity only); no row asserts strip position | — |
| L08 | Save as Mode adds a toggle row (accent ink, weight 600); choosing it restores the layout; unreadable custom data falls back to Browsing with the notice | 14/5 = 14.1.1/16 | A (save), B (fallback) | Corrupt `modes.json` while the app is closed, between A and B | `ng-035-custom-mode-saves-layout`, `modes-name-cap-at-input-live`; nothing drives the fallback | 14.1.1 result was WITHDRAWN 2026-09-08: "Re-present with a visual before asking again" (14.1.1-UAT.md:208) |
| L09 | Dependent window shows one tab view only; no move for a web tab; closed tab shows "This tab is closed" + "Close Window"; closing the core window closes dependents and quits with no confirmation; next launch restores the setup | 14/7 = 14.1.1/17 | A, B | Coding with a terminal or editor tab; command **Open Tab in Own Window** (setups-commands.ts:39) | `gui09-dependent-window-content` (static), `ng-037-core-close-quits`, `ng-032-quit-restores-session`; nothing drives the closed-state transition | — |
| L10 | Named setups: Save, move windows and switch mode, Restore; restore with a missing tab shows the partial-restore notice; Delete shows one "Delete Setup" confirmation in destructive ink | 14/8 = 14.1.1/18 | A, B | L09's dependent window | `ng-036`, `ng-029`, `ng-030`, `ng-031`, `gui09-setup-roundtrip`, `gui09-setups-copy`; no row checks multi-window geometry or drives Delete | — |
| L11 | Mode and setup name fields never hold more than 60 characters; typed and pasted overflow is cut silently; Enter saves the 60-character name | 14.1.1/23 | A | Done with L08 and L10 | `modes-name-cap-at-input-live`, `modes-name-cap-at-input` | — |
| L12 | Side panels and strip switch instantly on a mode switch; no tab shows a loading state | 14.1.1/32 | A | Browsing → Coding → Browsing | `modes-panel-motion` (static) | — |
| L13 | Embedder wall: a page inside a web tab cannot issue webTab* requests; the attempt is refused and logged | 14.1/1 = 14.1.1/33 | A | Hostile page fixture on a loopback port; chrome-privileged console or an agent BiDi helper Chris watches (Q4) | `ng-038-actor-refuses-hostile-senders` (stock-tab sender only), `gui02-web-tab-bridge` (static) | The wall also requires `embeddedByShell` (NG-038) |
| L14 | Same URL in two web tabs: two overlays, both rendering; closing one leaves the other | 14.1/2 = 14.1.1/34 | A | Two web tabs, one URL | `ng-003-same-url-two-rows` | "one store row" → two rows keyed `web:<id>` (NG-003, docs/URI-SCHEMES.md:253-257). Visible: two Organising cards, one suggestion row |
| L15 | Splitter drag keeps the page attached, no lasting misalignment, no white flash | 14.1/3 = 14.1.1/35 | A | A current web tab beside a panel | `gui02-web-tab-live` (discrete hops only) | The "≤200ms mode-switch slide" no longer exists (G-32 a, instant). Only the splitter half is observable |
| L16 | Re-issued open reports already-open with no second overlay; an unknown tab reports unknown-tab and the lost view | 14.1/4 = 14.1.1/36 | A | A driver (actor send from the Theia frame; Q4). The 14.1-VERIFICATION console recipe cannot work as written | `gui02-web-tab-live` step "drop the overlay" (unknown-tab → lost view half) | — |
| L17 | Lost view shows the contracted copy and Reload recovers; a load started before a mode switch finishes in place | 14.1/5 = 14.1.1/37 | A | Slow-page fixture; lost-view half needs a driver | `gui02-web-tab-live` 3b (lost view + one Reload) | Copy "Power Browser can't show…" → code and UI-SPEC read "PowerBrowser can't show this page right now. …" (web-tab.ts:72, 14.1-UI-SPEC:242) |
| L18 | With an editor or view tab current, Enter on a typed address opens a new web tab | 14.1/6 = 14.1.1/38 | A | Welcome or an editor current | none | — |
| L19 | "+" twice gives two "New Tab" tabs; a fresh launch starts with no web tabs | 14.1/7 = 14.1.1/39 | A (first thing) | Fresh profile and fresh `XDG_CONFIG_HOME`, observed before any click (NG-032 restores tabs on a carried profile) | `gui02-web-tab-live` (distinct id on second "+"), `first-boot-surface-fresh`, `ng-004-new-tab-row-unknown-uri-error` | — |
| L20 | A title or URL push does not overwrite an in-progress pill edit; Esc restores the committed address | 14.1/8 = 14.1.1/40 | A | Fixture page that retitles or redirects on a timer | none | — |
| L21 | Palette, Theia dialog and menu each hide the page within a frame and restore it on close | 14.1/9 = 14.1.1/41 | A | One web tab | none (only the dropdown confirmed, by Chris) | — |
| L22 | Enough web tabs to overflow: stock strip scrolling; only the current overlay paints | 14.1/10 = 14.1.1/42 | A | 15 or more web tabs, Browsing | `gui02-web-tab-live` (one non-current overlay hidden) | The tab-count chip clause no longer applies (chip removed, b85b846) |

**Handed-over `issue` rows** (not pending; 14-VERIFICATION hands them to Phase 24)

| # | Observation | Rows | S | Needs | Partial proof | Stale |
|---|---|---|---|---|---|---|
| L23 | No main-area or bottom-area tab disappears on any mode switch, including a mode's second visit (G-14.1.1-1) | 14.1.1/1 = 14/2 (+ 14-VERIFICATION item 5) | A | Open tabs; visit each mode twice | `gui07-mode-switch-tabs-live` | "the chip count is unchanged" (chip removed) on both sheets |
| L24 | Coding docks the Explorer in a visible left panel on every activation (G-14.1.1-13) | 14.1.1/13 = 14/1 (+ 14-VERIFICATION item 7) | A | Enter Coding three times, once via Organising | none (`ng-029` only via setup restore) | — |

**Other live-checkable rows** (not pending, not on the hand-off list; optional in the same launches)

| # | Observation | Rows | S | Note |
|---|---|---|---|---|
| L25 | Relocated-region geometry sane with zero, one, many tabs | 13/1 (`skipped`) | A | The skip reason "No relocated strip exists" is false since Variant B (`539ba36`). The `uat-passed` predicate blocks a skip without a "Deferred follow-up" reason. See Q6 |
| L26 | Relocated-region overflow scrolls | 13/2 (`skipped`) | A | As L25; observable with L22 |
| L27 | Per-mode panel map (G-2) | 14.1.1/2 | A | Same walk as L07 |
| L28 | Pill and Back/Forward get replies and pushes (G-3) | 14.1.1/3 | A | Needs `-purgecaches` (GUI-DEFECTS item 17 IN TREE) |
| L29 | Fresh frontend has no web tabs; "+" never collides with a restored id (G-5) | 14.1.1/5 | B | Carried relaunch |
| L30 | Organising shows real tabs or the empty state (G-14) | 14.1.1/14 | A | Same surface as 15/2, 15/12, 15/29 |
| L31 | The six 2857353 fixes (bar full width at 40 px, no drift, cold start in Browsing, Coding reachable, Organising renders, Ctrl+L) (G-15) | 14.1.1/15 | A | Cold launch |
| L32 | `shell.currentWidget` after "+" (G-43) | 14.1.1/43 | — | No visible proxy; Chris cannot see it |

Rows 14.1.1/12 and 28–31 are decision rows, not live checks. 14-UAT issue rows 4, 9 and 10 are corrected under G-14.1.1-27 (open) and are out of this inventory [CITED: Report 2].

**New rows on every sheet**

| # | Observation | Rows | S |
|---|---|---|---|
| L33 | React 19 runtime (design below) | 10/6, 13/15, 14/11, 14.1/11, 14.1.1/49, 15/1 (new tests) | end of B |

**15 sheet:** tests 1–47 in the outline below. The overlaps are:
- 15/12 overlaps 14.1.1/6 (thumbnails).
- 15/2, 15/12 and 15/29 overlap L30.
- 15/27 is the same observation as 15/18, 15/19 and 15/23.

**Script items with no sheet row**

| # | Item | S | Where it is recorded |
|---|---|---|---|
| D1 | v1.5 milestone name, taken as "Coding Workbench Layout" by the orchestrator | D | Chris's answer goes to ROADMAP/PROJECT (Q7) |
| D2 | Accept or reword the stale expectations (10/2, 10/3, 14.1/2, 14.1/3, 14.1/5, 14.1/10, 14.1.1/1, 14/2) | D | The annotation on each row |
| D3 | 13/6 provider-failure clause: planted fault, or `skipped` with "Deferred follow-up" | D | 13/6 |
| D4 | Fault route for 15/31–34 (Q1) | D | 15/31–34 |
| D5 | Whether 10/5 counts and who the "stranger" is (Q2) | D | 10/5 |

### The React 19 runtime line

No sheet has one [VERIFIED: `grep -ci 'react 19'` = 0 on all five existing sheets]. No document defines what it asserts [CITED: Report 3 Q4]. The NG-089 check design (Report 4) needs a `### ` test heading containing "React 19" with a non-pending result. Prescription:

- **One new test per sheet, appended at the end** so no existing number moves. 15 is the exception: the sheet is new, and React 19 is its test 1. The numbers are 10/6, 13/15, 14/11, 14.1/11, 14.1.1/49 and 15/1.
  - The next number per sheet is derived from the current test counts: 10 has 5 tests, 13 has 14, 14 has 10, 14.1 has 10 and 14.1.1 has 48 [CITED: Reports 1, 2; result-line counts VERIFIED this session].
- **Heading:** `### N. React 19 runtime`.
- **`expected:` (proposed, [ASSUMED] wording, Chris confirms):** "This sheet's tests ran on the build named in Current Test `build:` (Theia 1.76.0, React 19.2.8, Node 24, Gecko 153.5.0esr), and no surface this sheet covers failed to paint or showed a runtime error."
- **`build:` block:** the agent writes the commit sha and the four versions into each sheet's `## Current Test` `build: |` block. The 14.1.1 precedent is at 14.1.1-UAT:9-25. The versions come from installed manifests: `@theia/core` 1.76.0 and `react` 19.2.8 [VERIFIED this session]. `ng086-theia-react-node` and `single-copy-deps` check them statically, not at runtime.
- **Chris records it once per sheet**, at the end of Launch B, after the sheet's live tests. The 10 sheet's line covers 10/1–3 only, because 10/4 and 10/5 run in later sessions.
- How Chris sees a runtime error in his window is not documented [ASSUMED: visible breakage, or the Theia frontend console]. Q5 covers this.

### NG-084 mechanism

Row text cannot be changed after `add`, so NG-084 cannot be widened in place. The mechanism follows the NG-082 → NG-086 precedent from Phase 19 [CITED: Report 4; 19-05-PLAN.md, 19-07-SUMMARY.md]:

1. **No subcommand edits row text.**
   - `add` is the only writer of `text` (`blank_row`, ledger-amend.py:62-66, 377-385). It refuses any id that was ever added (`ever_added`, :146-150, 381-382).
   - `set` takes only `--spec-ref`, `--test-ref`, `--code-ref` and `--evidence`.
   - Rows cannot be deleted (check-ledger.py:374-375).

   [CITED: Report 4]
2. **Agent-runnable subcommands:** [VERIFIED: `.claude/hooks/ledger-verify-hook.py:34-36`, read this session]
   > `AGENT_SUBCOMMANDS = {"init", "add", "set", "set-status", "set-phase", "import-brainstorm",`
   > `"record-handoff", "record-fail"}`
   > `AGENT_STATUSES = {"open", "done", "verified", "deferred-requested"}`

   The hook rejects any Bash text matching `APPROVAL_LINE = re.compile(r"\b(approve|reject|drop)\s+[a-z][a-z0-9]*-[0-9]+\b", re.IGNORECASE)` (:33).
   - In this session the hook also blocked a read-only `grep` whose command text named `ledger-amend.py` alongside such words. Keep every ledger-related Bash command plain, one command per call.
   - Write commit messages to a scratchpad file and use `git commit -F`.
3. **Chris-only commands:** the drop of NG-084, `lock-checks`, and `approve` if a deferral is needed [CITED: Report 4].
4. **The new id is NG-089.** `ledger-report.py` lists NG-088 as the highest id at ledger_version 395 [VERIFIED this session]. A concurrent session could take it first. If `add` prints `id was already added`, stop. Never pick another id silently.
5. **The check needs a test_ref and a recorded red.** `phase-gate.py:120-152`: with `current_phase` unset, every open, done or verified row is due. An open row needs an existing test_ref file. A done row needs a `check-fail` op whose sha256 matches the lock. `record-fail` refuses a passing check and refuses a `--cmd` that does not contain the check path [CITED: Report 4].

**Order of operations** (each command alone; Chris's commands start with `cd /home/chris/coding/Power-Browser` on its own line):

| Step | Who | Action |
|---|---|---|
| a | Agent | Write `scripts/verify-ng-089-uat-sheets.mjs` and its two registry rows. Stage them, run `node scripts/scan-brand-residue.mjs`, commit. Do not edit the check after this point: `record-fail` hashes these bytes, and the lock must hash the same bytes |
| b | **Chris** | `python3 scripts/ledger-amend.py --root . drop --id NG-084 --reason "Superseded by NG-089: the 10, 13, 14, 14.1, 14.1.1 and 15 UAT sheets with a React 19 runtime line (UAT-01, Phase 24)" --quote "<his own words>"`. CONTEXT was auto-generated, so it holds no quote from him. A drop with no quote fails check-ledger.py:395-397 |
| c | Agent | Confirm `NG-084  dropped` in `ledger-report.py`; `git status --porcelain -- ledger`; `git add ledger/REQUIREMENTS.json ledger/checksums.sha256 ledger/history/log.jsonl`; `git diff --cached --name-only`; `git commit -F <file>` |
| d | Agent | `add --id NG-089 --text "UAT sheets 10, 13, 14, 14.1, 14.1.1 and 15 have no pending result, and each records a React 19 runtime result (UAT-01)." --spec-ref ".planning/REQUIREMENTS.md UAT-01"`; `set-status --id NG-089 --status open --phase 24`; `set --id NG-089 --test-ref "scripts/verify-ng-089-uat-sheets.mjs::ng089-uat-sheets" --code-ref ".planning/milestones UAT sheets 10, 13, 14, 14.1, 14.1.1, 15"`; `node scripts/verify-ng-089-uat-sheets.mjs`, which must exit 1 naming the pending results; `record-fail --id NG-089 --cmd "node scripts/verify-ng-089-uat-sheets.mjs"`. Read the recorded tail: exit 2 would be an instrument error, which `record-fail` also accepts. Commit as in c |
| e | Agent, then **Chris** | The agent prepares the sheets (24-02). Chris runs the live session and records every result |
| f | Agent | Run the check, which must pass. `set --id NG-089 --evidence "<sha>: ng089-uat-sheets PASS after its recorded red; results recorded by Chris live <date>"`; `set-status --id NG-089 --status done`; commit as in c |
| g | **Chris** | `python3 scripts/ledger-amend.py --root . lock-checks --commit <full sha of the close commit>`. The agent then commits the ledger files, and `python3 scripts/phase-gate.py --root .` must print nothing |

**If the UAT cannot finish this phase:** the agent runs `set-status --id NG-089 --status deferred-requested --owner chris --phase <N> --reason "..."`. Chris then runs `approve --id NG-089 --quote "<his words>"` himself.

**Planner notes** [CITED: Report 4]:
- `plan-gate --phase 24` also counts NG-074, which is deferred-approved with phase 15 ≤ 24. Phase 24 plans cite NG-074, NG-084 and NG-089. Expected `2/2` both before and after the swap.
- The Stop hook reports NG-089 "open and due" until step f, as it did for NG-086.
- `docs/non-gui/GAPS.md:114` still describes NG-084. No script reads it. Updating it is optional.

**`ng089-uat-sheets` design** [CITED: Report 4; MEDIUM]:
- **Sheet list:** derived from NG-089's own row text. Each sheet is resolved by `.planning/milestones/*/{N}-*/{N}-UAT.md` with exactly one match. `14-*` does not match `14.1-*`.
  - [ASSUMED] The check reads the row text from `ledger/REQUIREMENTS.json`. A check script may read that file; the agent session reads the ledger only through `ledger-report.py`.
- **Red when:**
  - a sheet is missing;
  - a column-0 `^result:` is `pending`, `[pending]` or empty;
  - a test heading has no `result:` line (the GSD parser counts that as pending);
  - no `### ` heading containing "React 19" has a recorded result.
- **Exit codes:** exit 1 on red, exit 2 on a broken instrument.
- **`--self-test`:** plants each fault and goes red naming it.
- **Registry placement:** the NG-074 placement in `verify-platform.sh`. The self-test row goes in `--quick` (near :4516) and the main row in the full set (near :4747). A main row in `--quick` would break "0 FAIL, empty baseline", because the check is red until Chris finishes.
- **Use the predicate's parsing rules:** strip frontmatter, HTML comments, fences and blockquotes before matching (uat-predicate.cjs:91-99). Otherwise a test or result inside a code fence would count.

### Sheet file format (what the agent writes)

From the GSD template, the parser and the sibling sheets [CITED: Reports 1–3; parser lines VERIFIED this session at `~/.claude/gsd-core/bin/lib/uat-predicate.cjs:49-69, 215`]:
- **Frontmatter:** `status`, `phase`, `source` (list), `started`, `updated`. `status` and `updated` are overwritten; `phase`, `source` and `started` never change. The parser treats `partial, diagnosed, pending, blocked, in_progress, failed` as not done.
- **`## Current Test`:** `number:`, `name:`, `expected: |`, `awaiting:`, and `build: |` as in 14.1.1. It becomes `[testing complete]` at the end.
- **`## Tests`:** each test is `### N. Title` (integer N only, `/^###\s*(\d+)\.\s*(.+)$/`), followed by column-0 keys. 15 follows the 14.1.1 key set: `contract:`, `expected:`, `evidence:`, `severity:`, `fixable:`, `result:`, `gap:`, `reason:`. Optional keys are `steps:` and `reported:`.
- **Result values:** `pending`, `pass`, `issue` (+ `reported:` verbatim, `severity:`), `skipped` (+ `reason:`), `blocked` (+ `blocked_by:`, `reason:`).
  - `PASSING_RESULTS = new Set(['passed', 'pass'])`.
  - `DEFERRED_REASON_RE = /^["']?deferred follow-up\b/i` makes a `skipped` row non-blocking.
  - `issue` is non-blocking only when its gap has `status: resolved` and a `resolved_by` plan with a SUMMARY.
- **`## Summary`:** `total`, `passed`, `issues`, `pending`, `skipped`, `blocked`, plus `superseded:` on 14 and `automated:` on 10. They are hand-kept, and no tool recomputes them.
  - 14.1.1 also has prose lines that must be edited, at :518-536: "Gaps by severity", "Gaps by fixability", "Pending tests automatable" and "Note on the zero".
- **`## Gaps`:** YAML, `gap_id` `G-15-N` for the new sheet. Only an issue Chris reports opens a gap.

### 15-UAT sheet outline

**Frontmatter:**
- `status: testing`
- `phase: 15-panorama-organising`
- `source: [15-UI-SPEC.md, 22-UI-SPEC.md, 22-VERIFICATION.md, 22-07-SUMMARY.md, 22-01-SUMMARY.md, 22-REVIEW-FIX.md]`
- `started`/`updated`: ISO timestamps

Every test starts `result: pending`.

**Numbering.** This follows Report 3, with two changes:
- Report 3's test 30 ("the test 28 result") is folded into 28, which Chris records after the Launch B relaunch.
- Report 3's test 37 is split into one test per assumption, so each overturned item gets its own gap (Report 3 recommendation A4). The parser takes integers only.

**Pre-step:**
- The fresh profile is created first.
- About 8 or more web tabs are opened with "+" before any group exists, and Welcome stays open.
- One file editor and one terminal are opened later.
- Theia auto-save (`afterDelay`) is turned off before 15/22 and 15/23, or no save prompt appears (verify-pan05-card-close-live.mjs header).

Abbreviations: "15S:n" is 15-UI-SPEC line n, "22S:n" is 22-UI-SPEC line n, "RF" is 22-REVIEW-FIX.md.

| 15 # | Rpt3 # | Title | Expected (essentials, copy verbatim) | Contract | Launch | Partial proof |
|---|---|---|---|---|---|---|
| 1 | 1 | React 19 runtime | As in the React 19 design above | 24-CONTEXT; ROADMAP SC3 | end of B | `ng086-theia-react-node`, `single-copy-deps` (static) |
| 2 | 2 | Empty canvas with loose cards | Heading **"No tab groups"**, body **"There are no tab groups yet — choose New Group, or drag across the canvas to draw one."**, a New Group action; loose cards 160×115 on a line 16px from the bottom, never under the panel; no tray | 15S:258-259, 127-128, 342-351, 286 | A | `gui08-loose-cards-live` |
| 3 | 3 | Empty Tree, toggle, zoom hidden in Tree | Segments **"Canvas"** then **"Tree"**, active in accent ink weight 600; tree body **"There are no tab groups yet — choose New Group to start one."**; zoom cluster hidden, not disabled | 15S:254, 260, 302-304 | A | `gui08-panorama-copy` (static) |
| 4 | 4 | New Group and rename rules | 400×300 box at (24, 24) titled **"Untitled group"**, title in edit mode, selected; placeholder **"Group name"**; Enter commits, Esc cancels; empty commit reverts; cap 60, paste cut; duplicates allowed | 15S:119, 253, 277, 332-333 | A | none |
| 5 | 5 | Draw a group with a band | Band ≥30px on one axis creates "Untitled group" at that rectangle, floored 200×144, title in edit; enclosed loose cards at 0.45 opacity, join on release; Esc cancels; smaller band does nothing | 15S:120, 355-358, 482 | A | none |
| 6 | 6 | Card drag | Starts after 4px; ghost 0.9 opacity with shadow, source 0.7; slot over a group, drop joins at index; empty canvas or loose card → loose at drop point; elsewhere nothing; last card out dissolves the group | 15S:359-368, 483; A10 | A | none |
| 7 | 7 | Move, eight grips, keyboard resize, push-away | Header drag moves; n/w grips move origin; floor 200×144; se grip `role=slider` **"Resize group"**, arrows 8px (Shift 32px), `aria-valuetext` **"{w} by {h} pixels"**; others move 12px clear, placed box stays | 15S:316-321, 349, 273 | A (≥3 groups) | none |
| 8 | 8 | Grid, stack, Expand panel | One tile size per box; below 84×60 per card stacks up to 5, offset 4px, count and **"Expand"** pill; only front card takes the pointer; panel: title heading, **"Done"**, cards at 220px, wraps and scrolls; Done/Esc/scrim closes; a group never scrolls. Known gaps: no `role="dialog"`, no focus move to Done (15S:427) | 15S:322-329, 262-263 | A | none |
| 9 | 9 | Loose pile overflow | Past the line's room up to 4 cards in a pile, offset 4px, with a count; hidden pile cards take no pointer; zero groups → canvas grows, host scrolls | 15S:151, 342-348 | A | `gui08-loose-cards-live` |
| 10 | 10 | Zoom | −, **"{N}%"**, +, **"100%"**; tooltips **"Zoom in"**, **"Zoom out"**, **"Reset zoom"**; steps 25/50/75/100/125/150/200, 0.15s; only the layer scales. At 25% Undo is about 8px tall (22S:383) | 15S:116-117, 255, 275, 307-309 | A | none |
| 11 | 11 | Tree parity | Same groups, order, membership after every mutation and flip; flip never reloads or loses the active group; sections show title, count, ×; 32px rows, title + mono URI; loose cards not in tree | 15S:305-312, 484 | A | `gui08-view-parity` (static) |
| 12 | 12 | Card faces | PNG after the 700 ms settle; else hatched panel with title (3 lines), never a broken-image glyph; URI only for a real address; tooltip title, line break, address | 15S:132, 274, 397-401 | A | `gui02-web-tab-live` 5b; overlaps 14.1.1/6 |
| 13 | 13 | Keyboard roving focus and rings | One tab stop per scope (each group, visible loose cards, expanded list); arrows move, Enter opens; 2px primary outline, 2px offset | 15S:215-223, 419-421, 487 | A | pan05 (g), `gui08-loose-cards-live` |
| 14 | 14 | Active-group marking | Header or background click: muted border, title weight 600, canvas and tree; opening a tab marks its group; never accent | 15S:198-200, 330-331 | A | none |
| 15 | 15 | Open a tab from a card | Double-click or Enter opens, single click does not; page → Browsing, editor or Welcome → Coding; activates, or reopens through the opener; nothing else closed, moved or detached | 15S:369-372 | A | ng-008 |
| 16 | 16 | Strip follows the active group | Browsing strip: active group's tabs, loose tabs, current tab, in dock order; filtered tabs hidden not closed; live after drag, band, close, undo and "+"; no active group → every tab; Coding dock bars never filtered; empty set → current tab only. **Cite 14-UI-SPEC:22 for the strip home, not 15S:24-27 (Q8)** | 15S:24-27, 331, 488-489; 22S:243-266 | A | pan03 (b)(c)(e) |
| 17 | 17 | "+" joins the active group | With an active group the new tab is a member, card at grid end, strip shows it; no active group → loose | 22S:268-276 | A | pan03 (a)(d) |
| 18 | 18 | Close Group closes at once and shows Undo | No dialog; tabs leave every strip, bar and card set; activity passes on; status bar **"Group "{name}" closed."**; **"Undo Close Group"** centred in bounds (canvas) or in the section's place (tree), focused; name **Undo Close Group "{name}"** | 15S:269-271, 373-379 | A | pan04 (a)(e)(g) |
| 19 | 19 | Undo restores | Click, Enter or Space restores title, bounds, membership, order, tabs; overlaps move clear; active again only if it was; focus to the restored title | 15S:380-383, 485 | A | pan04 (c)(g) |
| 20 | 20 | Timer commit | After 15000 ms fades over 0.15s; tabs close as closed-tab history; box gone; focus on the control moves to "New Group" | 15S:133-134, 384-386, 486 | A | pan04 (d)(g), ng-006 |
| 21 | 21 | Several undo windows; mode or view switch | Each closed group has its own control, timer, name; switching mode or view keeps the window | 15S:387-389 | A | pan04 (b)(g) |
| 22 | 22 | Dirty editor in a closing group | Stock save prompt at click or commit; never a silent discard | 15S:390-391 | A (auto-save off) | none |
| 23 | 23 | Card × and Delete | 24×24 × top-right on hover or focus, 0.15s; closes that tab; never starts a drag; Delete does the same; dirty editor prompts, Cancel keeps both; grid re-packs; emptied group shows **"Empty group — drag tabs here."**; focus next, previous, title, New Group; expanded panel stays open until empty | 15S:268, 404-417, 491 | A (auto-save off) | pan05 (a)-(g) |
| 24 | 24 | The last group stays | One visible group: no × on box or section, title widens; a second group brings both back; a group in its undo window does not count | 15S:334-339, 490 | A | pan04 (h) |
| 25 | 25 | WR-03: Undo after another group became active | Close active A (B becomes active), click C, Undo A: A restored, not active; C stays active | RF WR-03 | A (3 groups) | none |
| 26 | 26 | Reload during an undo window acts as Undo (22-07 open question 2, observed) | The group comes back with its tabs | 22-07 item 3 | A | none; reload route is Q9 |
| 27 | 27 | Live in your own window (22-07 item 4) | Organising: close a group, Undo, close a card with ×. Same observation as 18, 19, 23 | 22-07 item 4 | A | — |
| 28 | 28 + 30 | Quit inside an undo window (A4) | Close a group and quit before 15 s; after relaunch the group is gone for good, no empty box, no leftover loose cards. Recorded after the B relaunch | 15S:389; 22S:61 | A → B | pan04 (f) |
| 29 | 29 | Persistence and a filtered strip at launch | Groups return with bounds, titles, membership, order, active group; loose positions kept; Browsing strip filtered from first paint, never zero tabs | 22S:260-262 | B | pan03 (f), ng-007 |
| 30 | 31 | A card for a closed tab reopens through the opener | Double-click reopens on the card's own row; an open tab activates, opens nothing | 15S:371 | B | ng-008 |
| 31 | 32 | Load error | **"PowerBrowser couldn’t load your tab groups. Your tabs are unchanged — choose Retry."**; strip stays unfiltered | 15S:264 (E11) | F or D (Q1) | none |
| 32 | 33 | WR-01: failed closeGroup write | Group comes back once; **"PowerBrowser couldn’t save your tab groups. The canvas shows your latest arrangement — choose Retry."**; Retry closes the group | 15S:265, 392-393; RF WR-01 | F or D | none |
| 33 | 34 | WR-02: failed "+" join | Tab stays open and loose; Organising shows the save-error bar and Retry; **Browsing shows nothing** | RF WR-02 | F or D | none |
| 34 | 35 | WR-05: join before chrome's web-tab row | Retries once after 500 ms and lands; a second failure leaves it loose. RF: reversed order "was not reproduced" | RF WR-05 | F or D | none |
| 35 | 36 | Screenshots | `logs/undo-window-22-07.png`: one centred "Undo Close Group"; `logs/card-close-22-07.png`: focused card's × top-right over the preview. Both untracked, taken at 48025d3 before the review fixes | 22-VERIFICATION human 1 | D | — |
| 36 | 37 | Ratify A1: no Close Group dialog | Ratified, or overturned → gap for `/gsd-plan-phase 22 --gaps` | 22S:58-68; 22-07 item 2 | D | — |
| 37 | 37 | Ratify A2: 15 s, no discard × | as 36 | as 36 | D | — |
| 38 | 37 | Ratify A4: a quit inside the window closes the group | as 36 (informed by 28) | as 36 | after B | — |
| 39 | 37 | Ratify A5: the current tab stays in the strip | as 36 | as 36 | D | — |
| 40 | 37 | Ratify A7: "+" is the only joining path | as 36 | as 36 | D | — |
| 41 | 37 | Ratify A10: the last group dissolves on drag-out | as 36 (informed by 6) | as 36 | D | — |
| 42 | 37 | Ratify A11: no active-group label in the strip | as 36 | as 36 | D | — |
| 43 | 37 | Ratify the "Group "{name}" closed." flash kept at the click | as 36 | as 36 | D | — |
| 44 | 38 | Rule on the three 22-07 open questions | Split-pane current tab; reload treated as Undo (observed in 26); closeGroupRows called unchanged. Accepted as recorded, or named as work | 22-07 item 3 | after A | — |
| 45 | 39 | WR-02 copy decision | Chris words a Browsing notice for a failed "+" join, or accepts console-only. Copy only from his own words | 24-CONTEXT; RF WR-02 | D | — |
| 46 | 40 | C1 copy answers, items 1–7 | Kept or revised by Chris. They were taken as the recommended set after "just contiune the planed work"; he worded none | 22-01-SUMMARY:113-132 | D | — |
| 47 | 41 | Optional: CR-01, `view:<factory-id>` in the pill for non-mode `view:` tabs | Ruled on by Chris | RF CR-01 | D | — |

`## Summary` at creation is `total: 47` (46 if 47 is omitted), with `pending` equal to the total and every other count 0.

## Run order for Chris

The order is grouped by app state. Port rule: a manual launch starts the sidecar on port 0 (TheiaService.sys.mjs:150, CITED Report 1), so it never touches 3000. Any re-run live row uses `PB_VERIFY_PORT` 3939 [VERIFIED: `verify-platform.sh:62` `PB_VERIFY_PORT="${PB_VERIFY_PORT:-3939}"`]. The launch form is `objdir/dist/bin/powerbrowser --profile <dir> --no-remote` with `-purgecaches` [CITED: Report 3 A1, docs/BUILD.md:932, :1072; memory `chrome-js-startup-cache`].

**Session P: agent prep, before Chris sits down**
1. Rebuild the sidecar in `nix develop .#theia` (CONTEXT).
2. Install the desktop entry with the `sed` install from docs/BUILD.md:1175-1199, for 10/3.
3. Create a fresh profile directory and a throwaway `XDG_CONFIG_HOME` directory, in the scratchpad.
4. Start the loopback fixture server on an ephemeral port. `scripts/lib/pb-relaunch.mjs` `servePages` listens on `0, '127.0.0.1'` and serves `{ title, body }` pages [VERIFIED: :175-202]. It needs these pages:
   - a hostile page that tries a webTab* send (14.1/1);
   - a page that retitles or redirects on a timer (14.1/8);
   - a slow page (14.1/5). `servePages` answers at once with no delay option [VERIFIED], so the slow page needs a delayed handler of its own.
5. If Chris says 10/5 counts (Q2), start the fresh clone at a no-space path and its tier-3 build in the background.
6. Write the `build:` block (sha and versions) into each sheet.

**Session D: desk, no app (before Launch A, or while the 10/5 build runs)**

The desk session covers:
- D1–D5;
- 15/35 (screenshots);
- 15/36–37 and 15/39–40, 15/42–43 (ratifications not informed by a live observation);
- 15/45–47.

**Session A: Launch A, fresh profile, throwaway `XDG_CONFIG_HOME`, graphical KDE session**

1. **Before any click:** 14.1/7 = 14.1.1/39 startup half (no web tabs). Also 14.1.1/15 cold-start items (L31) and 10/3 window icon and title.
2. **"+" twice:** 14.1/7 second half. Then open about 8 web tabs on real pages, which also gives history for 13/6.
3. **Organising with zero groups:** 15/2, 15/3, 15/9, 15/12; 14.1.1/14 empty state (L30).
4. **Browsing:**
   1. 10/1 Open Browser Window.
   2. 13/6 suggestions.
   3. 14.1/6 with Welcome current.
   4. 14.1/2 two tabs on one URL (check Organising cards).
   5. 14.1/8 typing guard (fixture).
   6. 14.1/5 in-flight load with a mode switch (fixture).
   7. 14.1/9 palette, dialog, menu.
   8. 14.1/3 splitter drag.
   9. 14.1/10 with 15 or more tabs; 13/2 overflow (L26).
   10. 14.1.1/3 pill and Back/Forward (L28).
5. **Mode walk:**
   1. 14.1.1/32 instant panels (Browsing → Coding → Browsing).
   2. 14/3 = 14.1.1/11 strip homes with two web tabs and a split main area; 13/1 (L25); 14.1.1/2 panel map.
   3. 14.1.1/1 = 14/2, each mode twice.
   4. 14.1.1/13 = 14/1, Coding three times, once via Organising.
6. **Modes:** 14/5 = 14.1.1/16 Save as Mode (first half), with the 14.1.1/23 mode-name cap (type and paste 61+ characters).
7. **Panorama build-up:**
   1. Turn auto-save off.
   2. 15/4–8, 15/10, 15/11, 15/13–17.
   3. 15/18–24 and 15/27.
   4. 15/25 (3 groups).
   5. 15/26 frontend reload during an undo window (route: Q9).
   6. 15/44 can be answered after 26.
8. **Coding with an editor or terminal:**
   1. 14/7 = 14.1.1/17 Open Tab in Own Window, including the closed-tab state.
   2. 14/8 = 14.1.1/18: Save Setup with the setup-name cap (14.1.1/23 second half), move windows, switch mode, Restore, close a saved tab, Restore again, Delete Setup.
   3. Save one setup again, to keep for B.
9. **Customize:** 10/2. Write `customize.css` into the throwaway config dir, observe, delete, observe.
10. **Devtools or driver items** (route: Q4): 14.1/4, 14.1/1, then the 14.1/5 lost-view re-check.
11. **Quit:**
    1. Close a group, so a 15 s undo window is open.
    2. Within 15 s, close the core window while a dependent window is open.

    One quit covers 14/7's "closing the core window closes dependents, no confirmation" and 15/28's quit inside an undo window. If Chris wants the two observed separately, quit twice: the second quit costs one extra relaunch.

**Between A and B:** with the app closed, corrupt `modes.json` in the throwaway config dir, for 14/5 half 2.
- The path `${XDG_CONFIG_HOME}/powerbrowser/modes.json` is [ASSUMED]. The store is `UserStorageUri.resolve('modes.json')` (mode-service.ts:257) and the config dir is set at TheiaService.sys.mjs:522-526. That user storage maps to that dir's root has not been verified.
- The agent confirms the file exists at that path after Launch A, before Chris corrupts it.

**Session B: Launch B, same profile, relaunched**
1. 14/5 fallback: Browsing shown with **"PowerBrowser couldn't load the "{name}" mode. Browsing is shown instead."**
2. 14/7 last step: the setup restores.
3. 15/28, the group closed during the quit is gone for good. 15/38 can then be ratified.
4. 15/29, 15/30.
5. 14.1.1/5 restored tabs and the "+" collision (L29, optional).
6. **Record the React 19 runtime test on all six sheets** (10/6, 13/15, 14/11, 14.1/11, 14.1.1/49, 15/1).

[ASSUMED] A corrupt `modes.json` does not disturb session, setup or group restore. If Chris sees it interfere, split it: run B without the corruption, then run one more launch for the fallback.

**Session F: fault launch, only if Chris picks Q1 option (a)**

15/31–34 (load error, WR-01, WR-02, WR-05). The agent plants each fault the way the pan probes control them; Chris watches and records each result. 13/6's provider-failure clause can ride here if D3 picks a planted fault.

**Session C: Launch C, last**

10/4, the GEN-05 drill.
- **Before:** check `git status` for a concurrent session (memory `concurrent-sessions-on-main`).
- **During:** apply the fixture values, generate, rebuild the sidecar and launch. Chris checks the welcome tab, about dialog, favicon and theme.
- **After:** revert, rebuild the sidecar again, and confirm `node scripts/generate.mjs --check` is green and `scripts/verify-platform.sh --quick` is back to 0 FAIL. `--quick` is red during the drill. That is expected; commit nothing while it is red.

**Session X: outside any launch**

10/5, the stranger carry-test, on the clone started in P.

## Architecture Patterns

### System Architecture Diagram

```
 24-01  check + rows ─► commit ─► [Chris] NG-084 dropped ─► add NG-089 ─► check red ─► record-fail ─► commit
                                                                                   │
 24-02  sheets: 15-UAT (47 tests) + React 19 test ×6 + stale-text notes + build:  ─┤ (check still red)
        ordered script (sessions P, D, A, B, F, C, X)                              │
                                                                                   ▼
 24-03  prep P (sidecar, desktop entry, profile, XDG dir, fixtures) ─► [Chris] D ─► A ─► (corrupt modes.json) ─► B
                                                                       ─► F? ─► C (drill, revert, --quick 0 FAIL) ─► X
        Chris speaks each result ─► agent writes his result + verbatim `reported:` on every row the observation settles
                                                                                   ▼
 24-04  recount Summary per sheet ─► status/Current Test ─► check green ─► NG-089 evidence + done ─► commit
        ─► [Chris] lock-checks ─► commit ─► phase-gate.py silent
        if G-11 passed: GUI-DEFECTS item 2 CONFIRMED; GUI-07 / MODE-01 boxes per Chris
        each issue Chris reports ─► a ## Gaps entry (G-15-N or the sheet's own scheme)
```

### Recommended plan split

| Wave | Plan | Files | Chris |
|------|------|-------|-------|
| 1 | **24-01** NG-089 | new `scripts/verify-ng-089-uat-sheets.mjs`; `scripts/verify-platform.sh` (2 rows); ledger files via `ledger-amend.py` only | **blocking**: the NG-084 drop with his quote |
| 1 | **24-02** sheets + script | new `15-UAT.md`; React 19 test + `build:` + annotations in 10, 13, 14, 14.1, 14.1.1; recounted Summaries; `.planning/phases/24-live-uat-pass/24-UAT-SCRIPT.md` | — |
| 2 | **24-03** prep + live session | scratchpad profile, config dir, fixtures; desktop entry; sidecar build; result lines in all six sheets (Chris's words only) | **blocking-human**: the whole session; copy only from his words |
| 3 | **24-04** closeout | six sheets (Summary, status, Current Test, Gaps); NG-089 evidence/done; `GUI-DEFECTS.md` item 2 and REQUIREMENTS boxes if G-11 passed | **blocking**: `lock-checks` |

24-01 and 24-02 are file-disjoint and can run in parallel. 24-02 does not depend on NG-089 existing. The check stays red throughout, because the sheets keep `pending`.

### Anti-Patterns to Avoid
- **Writing `pass` from an automated row.** A green `gui02-web-tab-live` is evidence, not a result. `source: automated` passes on 13 date from before this phase; do not add new ones.
- **Recording on one sheet only.** 14.1/N and 14.1.1/(N+32), and the 14/14.1.1 pairs, take the same result, or the next audit finds a pending copy.
- **Changing an `expected:` silently.** Annotate the stale clause (for example `truth_correction:` or a dated note, as 23-01 did) and let Chris accept the wording.
- **Editing the NG-089 check after `record-fail`.** The lock then hashes different bytes, and `phase-gate.py` prints `test file changed`.
- **Putting the `ng089-uat-sheets` main row in `--quick`.** It is red by design until Chris finishes.
- **A test or result inside a code fence or blockquote.** The parser strips both. Keep `### N.` and `result:` at column 0.
- **`.planning/phases/24-…` literals in a `scripts/` file.** `planning-paths` requires tracked paths, and the phase dir moves at milestone close. The check globs `.planning/milestones/` only.
- **Running a command that names a ledger subcommand and an id in one shell line with operators.** The hook splits on these (Report 4, :143-157).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fixture pages | A new HTTP server module | `servePages` in `scripts/lib/pb-relaunch.mjs` (ephemeral port, 127.0.0.1), plus one delayed handler for the slow page | Already binds port 0, never 3000 |
| UAT result parsing in the check | A new markdown dialect | The GSD parser rules: `RESULT_LINE_RE = /^result:[ \t]*\[?([\w-]+)\]?/i`, the stripping at uat-predicate.cjs:91-99 | One reading of a result across GSD and the gate |
| Session wrap-up | Hand edits of `status`/Current Test | `uat.complete-session` behaviour: `partial` while any row is pending, blocked or skipped without a reason, else `complete`; Current Test becomes `[testing complete]` [CITED: Report 1] | Matches the audit's reading |
| Ledger row widening | Editing `ledger/REQUIREMENTS.json` | `ledger-amend.py` drop (Chris) + `add` (agent) | Text is immutable; checksums and history must agree |
| Live re-runs, if any | A new launcher | `scripts/verify-platform.sh --only <label>` with `PB_VERIFY_PORT` | One driver |

## Runtime State Inventory

The phase renames nothing, but it replaces a ledger row and runs live sessions that write state.

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | Ledger: NG-084 → dropped, NG-089 added (`ledger/REQUIREMENTS.json`, `checksums.sha256`, `history/log.jsonl`). The fresh profile's `tabs.sqlite`, `modes.json` and setups written during A/B | Ledger: via `ledger-amend.py` only. Profile data: in the scratchpad; discard after the phase |
| Live service config | None | None |
| OS-registered state | The desktop entry `~/.local/share/applications/powerbrowser*.desktop` (absent now, installed for 10/3) | Leave it installed, or remove it after 10/3; Chris's call |
| Secrets/env vars | `XDG_CONFIG_HOME` points at a throwaway dir for A and B, so Chris's real `~/.config/powerbrowser` (including any `customize.css`) is untouched | Set per launch only |
| Build artifacts | Sidecar bundle rebuilt before P; rebuilt twice in C (fixture, then revert); the 10/5 clone and its objdir | After C: rebuild on the reverted tree before any further live run; delete the 10/5 clone when done |

## Common Pitfalls

### Pitfall 1: duplicate rows drift
**What goes wrong:** a result is written on 14.1.1/33 but not on 14.1/1, or the reverse.
**How to avoid:** the script lists every row for each observation (the Rows column). The 24-04 recount checks both.

### Pitfall 2: carried profile hides 14.1/7
NG-032 restores web tabs on relaunch by design. The "no web tabs at startup" half is valid only as the first observation of Launch A on a fresh profile and config dir.

### Pitfall 3: auto-save hides the dirty-editor prompt
Theia's `afterDelay` auto-save saves on close. Turn it off before 15/22 and 15/23.

### Pitfall 4: stale expectations recorded as issues
10/2's flag, 10/3's name, 14.1/2's one row, 14.1/3's slide, 14.1/5's copy, 14.1/10's chip, and the chip clause in 14.1.1/1 and 14/2 all describe superseded contracts. Annotate them before the session so Chris is not asked to fail a test against retired wording.

### Pitfall 5: the GEN-05 drill leaves the tree red
10/4 edits tracked files. `--quick` is red until the revert, and a concurrent session committing on `main` meanwhile would see the fixture values. Run it last, check `git status` first, rebuild after the revert.

### Pitfall 6: 15-UI-SPEC still says "strip STAYS TOP"
15S:24-27 predates the Variant B amendment. The 15 strip tests cite 14-UI-SPEC:22 for the strip home [CITED: Report 3 Q2].

### Pitfall 7: Summary counts are hand-kept
No tool recomputes them. Recount from `^result:` per `### N.` block. Edit the 14.1.1 prose lines at :518-536 as well.

### Pitfall 8: SC2 versus the GSD `uat-passed` predicate
SC2 requires only "no `pending`". The GSD predicate also blocks:
- `issue` rows, unless the gap is `resolved` with a `resolved_by`;
- `skipped` rows without "Deferred follow-up";
- `superseded`.

After this phase, 14.1.1 still has 32 issue rows, 14 has 5 issue rows and one superseded row, and 13 has 2 skips. NG-089's check follows UAT-01 ("no pending"). See Q6.

### Pitfall 9: ledger hook false positives
A Bash line containing `approve|reject|drop` followed by an id is refused, even inside a commit message. Use `git commit -F`.

### Pitfall 10: the screenshots are untracked and pre-date the review fixes
`logs/undo-window-22-07.png` and `card-close-22-07.png` exist and are untracked [VERIFIED: `ls`, `git ls-files` empty]. They show 48025d3, not HEAD. Chris rules on them as recorded, or asks for fresh ones from Launch A.

## Code Examples

### Result recount (one sheet)
```sh
# Source: the verification run this session; counts per result value
grep -E '^result:' .planning/milestones/v1.3-phases/14.1.1-gui-conformance-sweep/14.1.1-UAT.md | sort | uniq -c
awk '/^### [0-9]+\./{h=$0} /^result:/{ if ($0 ~ /pending/) print h }' <sheet>   # names each pending test
```

### A recorded result block (Chris reported an issue)
```
### 34. Two web tabs on one URL
expected: …
result: issue
reported: "<Chris's words, verbatim>"
severity: major
```

### React 19 test block (new, at the end of a sheet)
```
### 49. React 19 runtime
expected: This sheet's tests ran on the build named in Current Test `build:` (Theia 1.76.0, React 19.2.8, Node 24, Gecko 153.5.0esr), and no surface this sheet covers failed to paint or showed a runtime error.
result: pending
```
(The wording is [ASSUMED]; Chris confirms it, Q5.)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| NG-084 "The five v1.2 human UAT sheets are signed" | NG-089 over six sheets plus React 19 | this phase | Drop + add; check with recorded red |
| Strip stays top (Variant A) | Strip relocates per mode (Variant B) | `539ba36`, 2026-09-08 | 13/1–2 skip reasons stale; 15S:24-27 stale |
| ≤200 ms panel slide | Instant panels (G-32 a) | 2026-10-18 | 14.1/3 slide half gone; 14.1.1/32 tests instant |
| One store row per URL | Two rows keyed `web:<id>` (schema v5) | NG-003, `1e3f744` | 14.1/2 wording |
| Tab-count chip | Removed | `b85b846` | 14.1/10, 14.1.1/1, 14/2 wording |
| "Power Browser Dev" | `PowerBrowser Dev` | Phase 1 rename | 10/3 wording |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The React 19 test wording and that Chris judges "no runtime error" by visible breakage or the frontend console | React 19 line | Chris rewords it; the check only needs a heading with "React 19" and a recorded result |
| A2 | `modes.json` lives at `${XDG_CONFIG_HOME}/powerbrowser/modes.json` | Run order (A→B) | The corruption misses; the agent locates the file after Launch A before Chris edits it |
| A3 | A corrupt `modes.json` does not disturb session, setup or group restore in B | Run order | Split B into two launches |
| A4 | One quit can cover both 14/7's core close and 15/28 | Run order | Quit twice; one extra relaunch |
| A5 | Enabling the Browser Toolbox needs `devtools.chrome.enabled` and `devtools.debugger.remote-enabled` (stock Firefox; not checked in this tree) | Q4 | Use the agent BiDi helper instead |
| A6 | The NG-089 check reads its sheet list from `ledger/REQUIREMENTS.json` row text | NG-084 mechanism | Low; the alternative is a constant tied to UAT-01 text, which breaks "derive, don't hand-keep" |
| A7 | About 8 loose tabs fill the loose line; 6 or more cards in a 200×144 box stack | 15 outline pre-step | Open more tabs during the session |
| A8 | The launch form `--profile <dir> --no-remote` with a pre-created dir works for PowerBrowser as for stock Firefox | Run order | Adjust at P |
| A9 | `-purgecaches` on a fresh profile is harmless and sufficient for 14.1.1/3 | Run order | Re-run 14.1.1/3 after a purged relaunch |

## Open Questions

1. **Q1. Fault route for 15/31–34.** Options:
   - (a) an agent-planted live run with Chris watching (session F);
   - (b) a devtools snippet Chris runs himself;
   - (c) `skipped` with a reason starting "Deferred follow-up".

   Only (c) passes the parser without a live observation. Chris chooses at D.
2. **Q2. 10/5 stranger.** Can Chris be the "stranger", or does another person run it? Does the 47–54 min build fit the sitting? If neither works, the row is `skipped` with "Deferred follow-up" or `blocked`; Chris chooses.
3. **Q3. 13/6 provider-failure clause.** Chris cannot cause it by hand. Options are a planted fault in F, or a `skipped` "Deferred follow-up" on that clause. The row has one result, so a partial pass needs a `reported:` note.
4. **Q4. Driver for 14.1/1 and 14.1/4.** The options are the Browser Toolbox (prefs in A5) or an agent-written BiDi helper that Chris watches. Either way only Chris records the result.
5. **Q5. React 19 line meaning.** Confirm the wording. Should it assert visible versions? Nothing in-app shows the React version [ASSUMED].
6. **Q6. "No pending" versus the GSD predicate.**
   - UAT-01 and SC2 accept `issue`, `skipped` and `superseded` as recorded (Report 4 asks Chris to confirm).
   - 13/1 and 13/2 skip reasons are now false. Chris either runs them in A (L25, L26) or rewrites them as "Deferred follow-up".
   - Recommendation: run them, since they cost nothing extra in the A mode walk.
7. **Q7. v1.5 milestone name.** "Coding Workbench Layout" was taken by the orchestrator. Chris confirms or renames at D. It has no sheet row, so record it in ROADMAP/PROJECT.
8. **Q8. 15-UI-SPEC "stays top" text.** Re-pin 15S:24-27 before the session, or only cite 14-UI-SPEC:22 in the sheet? Recommendation: cite 14-UI-SPEC:22 in the sheet now, and note 15S:24-27 as stale. Do not edit the spec in this phase without Chris.
9. **Q9. Frontend reload in Chris's window (15/26).** The route is undocumented in what was read. The agent must name a reload affordance before A. Assumption: a reload of the Theia frame, for example via a Theia "Reload Window" command if one is composed [ASSUMED].

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node | NG-089 check, fixtures | ✓ | v24 (23-RESEARCH: v24.19.0) | — |
| python3 | `ledger-report.py`, `ledger-amend.py`, `phase-gate.py` | ✓ | ran this session | — |
| nix `.#theia` | sidecar rebuild (P, C) | ✓ (23-RESEARCH) | — | — |
| Built shell `objdir/dist/bin/powerbrowser` | A, B, F, C | ✓ (23-RESEARCH; not re-checked) | — | Rebuild at P |
| `@theia/core` / `react` installed | React 19 line | ✓ | 1.76.0 / 19.2.8 (read) | — |
| Desktop entry | 10/3 | ✗ | — | Install at P (docs/BUILD.md:1175-1199) |
| Fresh clone + tier-3 toolchain | 10/5 | Chris | — | Q2 |
| Graphical KDE session | all launches | Chris | — | Blocking-human |
| Port 3000 | — | Chris's container | — | Never used |

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `scripts/verify-platform.sh` registry (node checks), plus the human UAT sheets parsed by the GSD UAT predicate |
| Config file | The `CHECKS` array in `scripts/verify-platform.sh` (NG-074 rows near `:4516` and `:4747` are the placement precedent) |
| Quick run command | `node scripts/verify-ng-089-uat-sheets.mjs --self-test` (static, about 1 s) |
| Commit gate | `scripts/verify-platform.sh --quick` (0 FAIL, empty `docs/non-gui/quick-baseline.txt`) |
| Full suite command | `scripts/verify-platform.sh` |
| Phase gate | `node scripts/verify-ng-089-uat-sheets.mjs` exit 0; `python3 scripts/phase-gate.py --root .` prints nothing |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Failing direction | File Exists? |
|--------|----------|-----------|-------------------|-------------------|-------------|
| UAT-01 | No pending result on the six sheets; each has a recorded React 19 test; the 15 sheet exists | static | `node scripts/verify-ng-089-uat-sheets.mjs` | Missing sheet; `pending`/`[pending]`/empty result; heading with no result; no React 19 heading with a result | ❌ W0 |
| UAT-01 | Each planted fault goes red naming it | static | `node scripts/verify-ng-089-uat-sheets.mjs --self-test` | A plant passes | ❌ W0 |
| UAT-01 | The check was red before the session | ledger | `record-fail` op present; `python3 scripts/phase-gate.py --root .` | No `check-fail` op, or hash mismatch | ✅ (tool) |
| UAT-01 | NG-084 dropped with Chris's quote; NG-089 present, done, locked | ledger | `python3 scripts/ledger-report.py --root .` shows `NG-084  dropped` and `NG-089  done`; `phase-gate.py` silent | Row missing, open, or `test file changed` | ✅ (tool) |
| UAT-01 | Summary counts match results | static | `grep -E '^result:' <sheet> \| sort \| uniq -c` compared with `## Summary` | A count differs | — (command) |
| UAT-01 | Each live observation | manual | Chris, sessions A, B, F, C, X | — | — |
| all | Gate stays clean | gate | `scripts/verify-platform.sh --quick` 0 FAIL; `node scripts/scan-brand-residue.mjs` after staging | FAIL row; residue | ✅ |

### Sampling Rate
- **Per task commit:** `node scripts/verify-ng-089-uat-sheets.mjs --self-test`, the result recount on each touched sheet, and `node scripts/scan-brand-residue.mjs` after `git add`.
- **Per wave:** `scripts/verify-platform.sh --quick`, then `python3 scripts/phase-gate.py --root .`.
- **Phase gate:**
  1. The live session.
  2. `node scripts/verify-ng-089-uat-sheets.mjs` exit 0.
  3. NG-089 done.
  4. Chris's `lock-checks`.
  5. `phase-gate.py` silent.
  6. `--quick` 0 FAIL after the C revert.

### Wave 0 Gaps
- [ ] `scripts/verify-ng-089-uat-sheets.mjs` with `--self-test` (24-01)
- [ ] Two registry rows: `ng089-uat-sheets-self-test` in `--quick`, `ng089-uat-sheets` in the full set (24-01)
- [ ] `15-UAT.md` (24-02), because the check needs a sixth sheet to find

## Security Domain

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2/V3/V6 | no | — |
| V4 Access control | yes | The ledger hook (`AGENT_SUBCOMMANDS`, `AGENT_STATUSES`) keeps the drop, approval and lock with Chris; the permission system refuses relayed approvals (CONTEXT) |
| V5 Input validation | no new input | — |
| V7 Error messages | yes, unchanged | Any copy Chris asks for during UAT keeps the CLAUDE.md copy rule; `shell-error-copy-no-internals` stays green |
| V10/V14 (integrity of evidence) | yes | `record-fail` hashes the check; `lock-checks` pins it; the check is never edited after the recorded red |

| Pattern | STRIDE | Mitigation |
|---------|--------|-----------|
| The agent records a result Chris did not give | Spoofing | CONTEXT: only Chris records; the result line carries `reported:` in his words for issues |
| A relayed "approved" used as consent | Spoofing | The hook refuses `approve/reject/drop <ID>` in agent Bash; Chris types those commands himself |
| A check that cannot go red | Repudiation | Recorded red before the session; `--self-test` plants |
| The GEN-05 drill leaks fixture values into a commit | Tampering | Run last, check `git status` first, revert, rebuild, `--quick` 0 FAIL before any commit |
| A fixture server on port 3000 | Denial of service to Chris's container | `servePages` binds port 0 on 127.0.0.1 |

## Sources

### Primary (HIGH: read or run this session)
- `.planning/phases/24-live-uat-pass/24-CONTEXT.md`, `.planning/ROADMAP.md:100, 346-357`, `.planning/REQUIREMENTS.md:89-90, 158`, `./CLAUDE.md`, `.planning/config.json`.
- Result counts and pending headings on the five existing sheets (`grep`/`awk`). The text of 13/1, 13/2 and 14.1.1/5.
- `ledger-report.py --root .` (NG-074, NG-084, NG-086, highest id NG-088, ledger_version 395).
- `.claude/hooks/ledger-verify-hook.py:30-37`.
- `~/.claude/gsd-core/bin/lib/uat-predicate.cjs:49-69, 210-218`.
- `scripts/lib/pb-relaunch.mjs:17-29, 170-202` and its export list. `scripts/verify-platform.sh:61-63`.
- `theia/node_modules/@theia/core/package.json`, `theia/node_modules/react/package.json`.
- `.planning/phases/22-panorama-worklist/22-VERIFICATION.md:1-63`, `22-07-SUMMARY.md:110-135`, the `logs/` listing and `git ls-files`.
- `.planning/milestones/v1.3-phases/15-panorama-organising/` listing.
- `~/.claude/gsd-core/templates/VALIDATION.md`; `23-RESEARCH.md` (format).

### Secondary (MEDIUM: the four reports given to this agent, not re-read line by line)
- Report 1 (10, 13, 14.1 sheets): stale clauses, code lines in `chrome-bar-places-suggestions.ts`, `web-tab.ts`, `PowerBrowserAPI.sys.mjs`, `TheiaService.sys.mjs:150`, docs/BUILD.md and docs/CUSTOMIZE.md.
- Report 2 (14, 14.1.1, 14-VERIFICATION): duplicate map, contracts, `mode-service.ts:257`, `setups-commands.ts:39`, the registry rows named.
- Report 3 (15 sheet): test inventory and 15S/22S/RF citations.
- Report 4 (NG-084): `ledger-amend.py`, `check-ledger.py`, `phase-gate.py` and `plan-gate.py` lines; the Phase 19 precedent.

### Not used
- The codebase-memory graph. This phase touches no code paths that need caller tracing.

## Metadata

**Confidence breakdown:**
- Sheet inventory and counts: HIGH (re-counted).
- Stale-clause and contract line citations: MEDIUM (from the reports).
- NG-084 mechanism: HIGH for the hook sets and the free id; MEDIUM for the ledger-amend line numbers.
- Run order: MEDIUM. A2–A4 and A8 are untested.
- React 19 line wording: LOW (A1, Q5).

**Research date:** 2026-10-18
**Valid until:** the next commit that touches any of the six sheets, the ledger, or a cited `theia/` line. A concurrent session can change all three. Re-run the counts and `ledger-report.py` before 24-01 starts.
