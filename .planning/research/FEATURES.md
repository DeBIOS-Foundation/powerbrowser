# Feature Research — v1.4 Platform Updates and GUI Close-out

**Domain:** close-out of a rebrandable Gecko + Theia browser platform (no new product features)
**Researched:** 2026-10-16, against `main` at `e9e29c1` (4 commits ahead of `origin/main` at `5bba4e3`)
**Confidence:** HIGH for tree state (every "current state" below was re-read or re-run this session); MEDIUM for two classifications that depend on Chris (G-32, sketch 005)

## How to read this

"Feature" here means a v1.4 work item. For each one this file gives: where it is defined
(file:line), what the tree shows today (verified this session, not copied from the handoff),
and one acceptance statement a person or a check can observe. Line numbers are as of
`e9e29c1`.

Evidence runs taken this session:

- `scripts/verify-platform.sh --quick` → **114 PASS, 4 FAIL**. The four failures are
  `gui08-canvas-geometry`, `gui08-canvas-geometry-self-test`, `gui08-panorama-copy`,
  `gui08-panorama-copy-self-test`. No other row is red.
- `node scripts/verify-gui08-canvas-geometry.mjs` → 3 failures: `dataset.tray` anchor gone,
  160px card gone, 160x90 thumbnail gone.
- `node scripts/verify-gui08-panorama-copy.mjs` → unreviewed copy "Expand", "Done"; contract copy
  gone: "Ungrouped", "No ungrouped tabs — drag a tab here to ungroup it."
- `node scripts/generate.mjs --check` → PASS in the host shell **and** inside
  `nix develop .#theia` (inkscape 1.4.4 in both, Node v22.23.2 in the dev shell).
- `gh run list --workflow verify.yml --branch main` → latest run 36495714210 on `5bba4e3`
  failed on exactly the four gui08 rows.
- `scripts/ledger-report.py` → 85 rows: done 53, deferred-approved 10, dropped 22.

## Gap-ID register

### G-14.1.1-9 (G-9) — clean-checkout Theia build

- **Defined:** `.planning/milestones/v1.3-phases/14.1.1-gui-conformance-sweep/14.1.1-UAT.md:651-665`
  (truth: "`yarn build` in theia/ succeeds from a clean checkout"); carry-forward at
  `.../14.1.1-gui-conformance-sweep/deferred-items.md:44-64`.
- **Current state:** `status: in_tree`. The order fix landed: `theia/package.json:69` builds
  `token-gate` before `tab-uris`, and the `theia-build-order` and `theia-build-order-self-test`
  quick rows PASS (8 chain entries, 6 edges). The literal clean build (`rm -rf
  theia/extensions/*/lib && yarn build:extensions`) has never been run. The blocker is gone:
  `git status --porcelain` shows no `theia/` changes, so the tree is quiet. The chain still ends
  in `extensions/backend-opencode build`, so OpenCode removal changes the chain this test runs.
- **Acceptance:** On a fresh `git clone` (or after deleting every `theia/extensions/*/lib`),
  `nix develop .#theia -c bash -c 'cd theia && yarn install --frozen-lockfile && yarn build'`
  exits 0, and the UAT entry flips to `fixed`, citing that run.
- **Class:** Table stakes.

### G-14.1.1-10 (G-10) — group-channel static check

- **Defined:** `14.1.1-UAT.md:666-680` (truth: "A --quick row goes red when any of the five
  group-channel preconditions regresses"); the five faults are described in
  `.planning/GUI-DEFECTS.md:59-92`.
- **Current state:** `status: open`. All five preconditions are in the code:
  `GROUP_ACTOR_CHILD_MODULE = "resource://powerbrowser/GroupActorChild.sys.mjs"`
  (`powerbrowser/shell/PowerBrowserAPI.sys.mjs:255`), `wantUntrusted: true` (`:2196`),
  `document.dispatchEvent(... bubbles: true)`
  (`theia/extensions/modes/src/browser/group-actor-client.ts:90-91`), `cloneInto` on the reply.
  `scripts/verify-platform.sh` has **no** row for them (grep for group-channel, wantUntrusted
  and GroupActorChild returns nothing). Only live checks touch the channel:
  `verify-ng-038-actor-sender-wall.mjs` and `verify-web-tab-live.mjs`. The file that held this gap,
  `group-actor-client.ts`, is now committed and clean.
- **Acceptance:** `scripts/verify-platform.sh --only group-channel` passes on the tree, and its
  `--self-test` plants each of the five faults (chrome:// child path, `wantUntrusted` false,
  `window` dispatch, `bubbles:false`, uncloned reply). Each plant goes red and names its fault.
  Clean control is green. The expected values are derived from the source, not hand-kept
  (CLAUDE.md, Verification rule 2).
- **Class:** Table stakes.

### G-14.1.1-11 (G-11) — Variant B strip relocation, ratification

- **Defined:** `14.1.1-UAT.md:681-694` (truth: "The tab strip's per-mode behaviour matches one
  ratified reading"); `.planning/GUI-DEFECTS.md:22` (item 2, OPEN).
- **Current state:** **The code is built. The records are behind it.** Commit `539ba36`
  ("feat(gui07): the tab strip relocates per mode", 2026-09-08) is an ancestor of HEAD.
  `theia/extensions/chrome-bar/src/browser/tab-strip-widget.tsx` is a second view over the dock,
  shown in Browsing; the dock's own bar is shown in Coding. `14-UI-SPEC.md:22-33` was amended
  2026-09-08 to "Verdict GREEN → Variant B", and
  `13-chrome-bar-strip-relocation-spike/13-SPIKE-STRIP-RELOCATION.md:16` reads
  `Verdict: GREEN`. These records are still stale:
  - the UAT entry is still `open`
  - GUI-DEFECTS item 2 is still OPEN
  - the GUI-07 box is unchecked (`.planning/REQUIREMENTS.md`, GUI-07)
  - the header of `theia/extensions/modes/src/browser/mode-descriptors.ts:12-17` still says
    "13-01 verdict RED: the tab strip stays top in every mode"
  - `14-UAT.md` test 3 is still "Tab strip stays top in every mode" (`skipped`)
- **Acceptance:** Chris switches Browsing → Coding → Browsing in the built app. In Browsing the
  tabs sit above the URL row. In Coding they sit in the editor area's tab bar. No tab is lost or
  duplicated across the switches. Then G-11 reads `fixed` (ratified Variant B), GUI-DEFECTS item 2
  is closed, GUI-07 is checked, the `mode-descriptors.ts` comment matches the code, and `14-UAT.md`
  test 3 is restated as relocation.
- **Class:** Table stakes. This is a records-and-confirmation step, not build work.

### G-14.1.1-23 (G-23) — 60-character name cap at the input

- **Defined:** `14.1.1-UAT.md:803-816` (truth: "Setup and mode names are capped at 60 characters
  at the input, before commit"; contract `14-UI-SPEC.md:316` "one name field (cap 60
  characters)").
- **Current state:** `status: open`, and the code is unchanged.
  `mode-service.ts:447` and `setups-service.ts:579` call `quickInput.input({ prompt, placeHolder })`
  without `validateInput`, then `answer.trim().slice(0, 60)`. A 61+ character name is accepted
  silently and saved truncated. Both files are now committed and clean, so the hold is gone.
  **Spec ambiguity to resolve first:** `14-UI-SPEC.md:360` reads "pasted overflow is cut at the
  cap before commit", which the current slice satisfies literally. The gap's reading, "refuse at
  the input", is the stricter one.
- **Acceptance:** In Save as Mode and Save Setup, typing or pasting a 61st character shows an
  inline validation message in the quick input, and Enter does not commit until the name is 60
  characters or fewer. A 60-character name saves unchanged. A static check (or an extension of
  `verify-gui09-setups-copy.mjs`) asserts that both inputs pass `validateInput` against
  `MODE_NAME_MAX` / `SETUP_NAME_MAX`. If Chris instead ratifies the `:360` reading, the entry
  closes as `fixed (spec-ratified)` with no code change.
- **Class:** Table stakes (Low complexity).

### G-14.1.1-32 (G-32) — side panels slide on mode switch

- **Defined:** `14.1.1-UAT.md:930-941` (truth: "Side panels slide on a mode switch within 200 ms,
  instantly under reduced motion"; `fixable: needs-chris`); contract `14-UI-SPEC.md:198-200`,
  `:265`, `:367`.
- **Current state:** `status: open`. No slide is authored. Every `transition` in
  `theia/extensions/modes/src/browser/modes.css` is on custom rows, buttons or Panorama cards
  (`:53, :107, :152, :848`). None targets a side-panel container, and no other extension CSS
  does either. The panels use the stock instant collapse.
- **Acceptance:** One of two outcomes, chosen by Chris.
  - (a) Switching Coding ↔ Browsing animates the left, right and bottom panel widths over 200 ms
    or less. With `prefers-reduced-motion: reduce` the switch is instant. Measured live, the panel
    width is intermediate at about 100 ms and final by 200 ms.
  - (b) Chris accepts the stock collapse. `14-UI-SPEC.md` Motion and the `:367` state row are
    amended to "instant", and G-32 closes as `fixed (spec-amended)`.
- **Class:** Table stakes as a **decision**. The animation itself (option a) is optional.

### W1 — the active group filters the tab strip (handoff: "strip filtered by active group")

- **Defined:** `.planning/milestones/v1.3-phases/15-panorama-organising/15-PANORAMA-WORKLIST.md:32-42`;
  open decision 2 at `:133-135`.
- **Current state:** Not built. `tab-strip-widget.tsx:297-299` `mainTabs()` filters only the
  home pane and stacked tabs. Nothing in `chrome-bar/src` reads a group. `GroupModel` holds
  `activeGroupId` (`group-model.ts:117, 250`), but there is no shared frontend membership reader.
- **Acceptance:** With groups A (2 tabs) and B (1 tab) and A active, the Browsing strip shows
  exactly A's 2 tabs. Activating B in Organising and returning to Browsing shows exactly B's tab.
  No tab is closed. Coding follows decision 2.
- **Class:** Table stakes. It is the core purpose of Panorama (worklist `:34`).
- **Hidden prerequisite, W2 (not in the handoff list):** a tab made with "+" must land in the
  active group (worklist `:44-51`). This is **not built**: the only `setTabGroup` caller is
  `group-model.ts:643` (Organising drop paths), and no create path assigns a group. Without W2,
  W1 makes every new "+" tab vanish from the strip it was opened from. W2 must ship with W1.

### W4 — Undo Close Group, replacing the confirm dialog

- **Defined:** `15-PANORAMA-WORKLIST.md:59-67`.
- **Current state:** Not built. `organising-widget.ts:378-406` still opens a `ConfirmDialog`
  with "…You can't undo this." `group-model.ts:676-702` commits `closeGroup` immediately. The copy
  contract still requires the destructive confirmation (`15-UI-SPEC.md:142, :219`), and
  `gui08-close-exactness` plus `gui08-panorama-copy` pin it.
- **Acceptance:** Closing a group hides it and its tabs at once, with no dialog, and shows an
  Undo affordance. Undo within about 15 s restores the group, its bounds and its tabs. Doing
  nothing removes them for good after the timeout, and a relaunch inside the window does not
  resurrect a committed close. The 15-UI-SPEC copy and the two checks are updated in the same
  change.
- **Class:** Table stakes (Medium: touches the chrome-side writer `closeGroupRows` and two gates).

### W5 — per-card close button

- **Defined:** `15-PANORAMA-WORKLIST.md:69-71`.
- **Current state:** Not built. The card (`organising-widget.ts:900-935`) has a title, an
  address line, dblclick/Enter to dive and arrow-key focus. It has no close control. Only the
  group box has one (`:806-815`).
- **Acceptance:** Every card shows a labelled close control (visible on hover and focus, with
  `aria-label`). Activating it closes that one tab: the card disappears, the tab leaves the strip,
  and no other tab or group changes.
- **Class:** Table stakes (Low).

### W6 — type-anywhere search on the canvas

- **Defined:** `15-PANORAMA-WORKLIST.md:73-76`.
- **Current state:** Not built. The only widget-level key handler is Escape
  (`organising-widget.ts:183-188`). Scope records disagree: `15-UI-SPEC.md:20-22` says search
  "ship[s] only if cheap, else explicitly deferred", and `.planning/PROJECT.md:271` lists
  "Piles + type-anywhere search" under **v1.5+ candidates**. The handoff (`:68`) puts it in v1.4.
- **Acceptance:** In Organising, typing any printable key opens a search box. Matching cards are
  outlined and the rest dim. Enter dives into the top match. Escape clears the search and
  restores every card.
- **Class:** Optional. Defer unless Chris confirms the handoff over PROJECT.md:271.

### W11 — group cycling and the unclosable last group

- **Defined:** `15-PANORAMA-WORKLIST.md:112-115`.
- **Current state:** Not built. `panorama-commands.ts` registers five commands and no
  keybindings. The extension has no `KeybindingContribution` for groups. The group close button
  renders unconditionally (`organising-widget.ts:806`).
- **Acceptance:** Ctrl+\` activates the next group and Ctrl+Shift+\` the previous one, and the
  Browsing strip follows (needs W1). With exactly one group, its close control is absent from
  both canvas and tree.
- **Class:** Optional. The last-group half is cheap, and it becomes table stakes if W1 ships with
  "every tab is in a group" (decision 1).

### NG-074 — CI verify passes on main

- **Defined:** `ledger/REQUIREMENTS.json:955-966` (spec_ref `docs/non-gui/GAPS.md:101`, test_ref
  `scripts/verify-ng-074-ci-main.mjs::ng074-ci-green-on-main`); unblock options in
  `docs/non-gui/questions-wave-e.md:15-39` (Q1, OPEN).
- **Current state:** `deferred-approved`, owner chris, phase 15. The last run, 36495714210 on
  `5bba4e3`, failed on exactly the four gui08 rows. The local quick tier agrees: 114/4. `main` is
  4 commits ahead of `origin/main`, so a push is needed before any run can see a fix.
- **Acceptance:** `node scripts/verify-ng-074-ci-main.mjs` exits 0. That means a `verify.yml`
  run on the commit `main` points at completed with conclusion `success`, and the ledger row
  moves to `done` with that run ID as evidence.
- **Class:** Table stakes. It is the milestone's exit gate.

### NG-084 — live UAT pass (v1.2 sheets + 13, 14, 14.1, 15)

- **Defined:** `ledger/REQUIREMENTS.json:1085-1096` (text: "The five v1.2 human UAT sheets are
  signed"; spec_ref `GAPS.md:114`). v1.4 widens it to phases 13, 14, 14.1 and 15 plus the React 19
  runtime check (`.planning/PROJECT.md:171-172`).
- **Current state:** `deferred-approved`, owner chris, phase 15. Pending results counted this
  session:

  | --- | --- |
  |-------|-------|
  | `v1.2-phases/10-sign-off-closeout/10-UAT.md` | 5 pending |
  | `13-UAT.md` | 11 pass, 2 skipped, 1 pending |
  | `14-UAT.md` | 5 issue, 3 pending, 1 skipped, 1 superseded |
  | `14.1-UAT.md` | 10 `[pending]` |
  | `14.1.1-UAT.md` | 35 issue, 13 pending |
  | Phase 15 | **no UAT sheet exists** |

- **Acceptance:** Every listed sheet has no `pending` result. Phase 15 has a UAT sheet and it
  is run. The ledger text is amended to the widened scope (Chris approves) and moves to `done`.
  One UAT line records the sidecar running on React 19 with no React error in the frontend
  console.
- **Class:** Table stakes.

### NG-051 — `backend = "off"` starts no opencode

- **Defined:** `ledger/REQUIREMENTS.json:656-667` (spec_ref `GAPS.md:75`, test_ref
  `scripts/verify-ng-051-backend-off.mjs::ng051-backend-off`); amend flagged at
  `.planning/HANDOFF-plan-reorg.md:55-56`.
- **Current state:** `done`. The row lives in the full tier (`verify-platform.sh:4710`), and the
  quick-tier `ai-opencode-held` row PASSES. OpenCode is still in the tree:
  - `theia/extensions/backend-opencode/`
  - `configuration.toml:116-127` (`[ai] backend = "off"`)
  - `scripts/verify-opencode-{bridge,presets,tracer}.mjs` and `verify-ng-051-backend-off.mjs`
  - 17 opencode lines in `verify-platform.sh`, including `:2612-2640` and `:4581-4597`
  - the `backend-opencode` entry in `theia/package.json:69`
  - Phase 16 at `.planning/ROADMAP.md:262`

  Removing OpenCode deletes NG-051's test_ref, so the row cannot stay `done` with a dangling
  reference.
- **Acceptance:** After removal, the tree has no opencode identifier in source, scripts,
  registry or roadmap (a grep check derived from the tree, with `ledger/` and `history/` excluded).
  `ledger-report.py` shows NG-051 amended (dropped or superseded "adapter removed") through
  `scripts/ledger-amend.py`, carrying Chris's approval quote. The quick tier is green, with
  `ai-opencode-held` removed rather than left asserting an absent adapter.
- **Class:** Table stakes. It is owner-gated: only Chris can approve the ledger amend.

### NG-082 — Theia re-pin (ledger text says 1.75.0)

- **Defined:** `ledger/REQUIREMENTS.json:1059-1070` ("Theia is re-pinned to 1.75.0 (UPD-02,
  UPD-04)"; spec_ref `GAPS.md:112`), deferred to 999.2. The handoff replaces the target with
  1.76.0 (`HANDOFF-plan-reorg.md:59-60`).
- **Current state:** `configuration.toml:115` has `theia_release = "1.74.1"`. Every
  `@theia/core` pin reads `1.74.1`.
  `theia/applications/browser/package.json:95-96` has `react`/`react-dom` `18.3.1`. `flake.nix:20`
  has `nodejs = pkgs.nodejs_22`. The handoff reports a trial build on 1.76.0 that needs two fixes
  (delete the AI-layout override in branding; React 19). That trial is not in the tree.
- **Acceptance:** `theia_release = "1.76.0"`, and `node scripts/generate.mjs` propagates it. Every
  `@theia/*` pin and lockfile tarball agrees (the theia-pin rows green). React and react-dom are
  on 19.x. `nix develop .#theia -c node --version` prints v24.x. `scripts/diff-theia-core.sh`
  passes. The sidecar starts and the shell renders with no frontend error. NG-082 is amended to
  the 1.76.0 target and moved out of 999.2 (Chris approves), then marked `done`.
- **Class:** Table stakes. It is owner-gated for the ledger amend.

## Other v1.4 items (no gap ID)

| Item | Defined | Current state (verified) | Acceptance | Class |
| --- | --- | --- | --- | --- |
| Firefox 153.5.0esr | `PROJECT.md:162`; `HANDOFF:37-38, 57-58` | `configuration.toml:114` `FIREFOX_153_1_0esr_RELEASE`; `upstream/` HEAD describes `FIREFOX_153_1_0esr_BUILD1`; no full build on 153.5 | Pin moved, `fetch-upstream.sh` places `upstream/` at the tag's commit, `git -C upstream diff` empty, all 4 patches apply, `./mach build` exits 0, full `verify-platform.sh` green | Table stakes |
| Fix the tag comment | `HANDOFF:58` | `fetch-upstream.sh:276-282` comment is generic, not wrong. **A real defect sits in the block this edit touches:** `configuration.toml:104` reads "…ESR tag this# project builds against" (lost newline) | Comment reads as two lines; tag comment states RELEASE vs BUILD1 policy | Optional, rides with the FF pin |
| Pin convention, RELEASE vs BUILD1 | `HANDOFF:37` says "`BUILD1`" | Tree pins the `_RELEASE` tag; `fetch-upstream.sh:277-282` says both tags point at one commit | One convention named in the requirement; the stack research must confirm 153.5's tag exists | Table stakes (decide in requirement text) |
| `quick-baseline.txt` refresh | `PROJECT.md:166`; `docs/non-gui/decisions.md:39-45` (R33) | Lists 9 labels from `7b7a1f7`. 5 of them now PASS: `ai-opencode-tracer`, `gui07-strip-spike-verdict`, `gui08-persistence-roundtrip`(+self-test), `internals-catalogue`. Only the 4 gui08 rows are red today. Consumers are the wave plans only | File equals the set of currently red quick rows. Once the gui08 rows are green that set is empty, so delete the file with its R33 references | Table stakes (Low) |
| `generate-check` fails locally (inkscape) | `HANDOFF:63`, the only source | **Not reproduced:** `generate.mjs --check` PASSES in the host shell and in `nix develop .#theia`, inkscape 1.4.4 in both. Likely cause (LOW confidence): the earlier session ran it under the Claude Code sandbox | Record the two passing runs and close as not-reproducible; reopen only with a failing log | Table stakes to close, Low |
| Schema v3/v4 ledger rows | `PROJECT.md:165`; `HANDOFF:62` | Head is v6 (`PowerBrowserAPI.sys.mjs:50`). v3 = loose-tab `x`/`y` (`:81-84`), v4 = within-group `ord` (`:86-89`). NG-015 and NG-019 cover migration and docs *through* v3/v4, and NG-002 covers persistence across navigation. No row states the v3/v4 behaviour itself | Two ledger rows added via `ledger-amend.py` (Chris approves): "a loose tab keeps its canvas position across restart" and "card order within a group persists across restart". Each has a test_ref to a passing check | Table stakes (Low) |
| Panorama redesign in 15-UI-SPEC + two gui08 checks | `questions-wave-e.md:15-39` (Q1); `HANDOFF:43-46, 67-69` | Spec still prescribes 160px cards, 160x90 thumbs, 144px Ungrouped tray (`15-UI-SPEC.md:90-95, :212-213, :281-285`). Code has 220px cards, 124px thumb (`modes.css:442, 460`), loose cards on canvas (`organising-widget.ts:71-79`), Expand/Done. Dead tray CSS remains at `modes.css:536-608`, with `ungrouped` naming in `group-model.ts:115, 246-350` | 15-UI-SPEC describes the shipped geometry and copy ("Expand"/"Done" reviewed). Both checks derive from the new contract and pass, self-tests included. Quick tier is 0 FAIL. Stale tray comments and dead CSS are removed | Table stakes. **Unblocks NG-074** |
| 14-VERIFICATION | `PROJECT.md:170` | `14-modes-windows-setups/` has no VERIFICATION file (13, 14.1, 14.1.1, 16 do; 15 has none either) | `14-VERIFICATION.md` exists with every Phase 14 must-have scored against the tree, and G-11/G-23/G-32 outcomes cited | Table stakes |
| Sketch 005 decision | `PROJECT.md:173`; `HANDOFF:74` | `.planning/sketches/005-vscode-layout/index.html` is untracked and absent from `MANIFEST.md`. It proposes 4 Coding-only changes: one title row, centred address box, right cluster, horizontal activity icons. 4 more items are marked already-true | `MANIFEST.md` has row 005 with a recorded verdict (adopt → a named later phase, or reject), and the sketch is committed | Decision: table stakes; building it: optional (not v1.4) |
| OpenCode removal | `PROJECT.md:160-161` | See NG-051 above | See NG-051 | Table stakes |

## Feature Landscape

### Table Stakes (must be in v1.4)

| Feature | Why Expected | Complexity | Notes |
| --- | --- | --- | --- |
| OpenCode removal + NG-051 amend | Retired 2026-09-28. Its 17 registry lines and its extension are dead weight in every gate run | MEDIUM | Owner-gated amend. Changes the `build:extensions` chain (G-9) and `theia-build-order` |
| Firefox 153.5 + full build | Platform currency, ESR security line | HIGH (≈50 min build) | Trial applied all 4 patches cleanly |
| Theia 1.76.0 + React 19 + Node 24 + NG-082 amend | Platform currency; 1.75.0 target is stale | MEDIUM | Branding AI-layout override must go; easier after OpenCode removal |
| G-9 clean-checkout build | Stranger-clone promise (Core Value) | LOW | Tree is now quiet; just run it |
| G-10 group-channel check | Five independent silent-failure modes (GUI-DEFECTS:61-64) | MEDIUM | Static, derive-and-compare, five plants |
| Schema v3/v4 rows, baseline refresh, generate-check close | Record truth | LOW | generate-check already passes |
| Panorama spec + gui08 checks | Only red quick rows; blocks NG-074 | MEDIUM | Q1 option (c) |
| W1 + W2 strip filter by active group | The purpose of Panorama | MEDIUM | Needs decisions 1 and 2 |
| W4 undo close, W5 card close | Basic tab hygiene on the canvas | MEDIUM / LOW | W4 rewrites a copy contract |
| G-11 ratify, G-23 cap, G-32 decision, 14-VERIFICATION | Close Phase 14 honestly | LOW | G-11 code exists; G-23 may close by spec |
| NG-084 live UAT | 70+ pending/issue results across six sheets | HIGH (human time) | Phase 15 needs a sheet first |
| Sketch 005 decision | Untracked artefact | LOW | Decision only |
| NG-074 CI green | Exit gate | LOW once gui08 is fixed | Needs a push of `main` |

### Differentiators (optional in v1.4)

| Feature | Value Proposition | Complexity | Notes |
| --- | --- | --- | --- |
| W6 type-anywhere search | Fast group navigation | MEDIUM | PROJECT.md:271 already places it in v1.5+ |
| W11 group cycling keys | Keyboard parity with Firefox Panorama | LOW | Last-group half is cheap |
| G-32 option (a) authored slide | Matches the motion contract | LOW–MEDIUM | Only if Chris rejects the stock collapse |
| Sketch 005 implementation | VS Code-familiar Coding shell | HIGH | A milestone of its own |

### Anti-Features (do not do in v1.4)

| Feature | Why Requested | Why Problematic | Alternative |
| --- | --- | --- | --- |
| Named exclusion for the gui08 rows (Q1 b) | Fast CI green | Leaves the spec and code disagreeing permanently | Q1 (c): re-pin to the committed design |
| Marking G-11 fixed without Chris looking | The code exists | The UAT protocol bars executors from closing `decision` gaps | One live confirmation inside the NG-084 pass |
| W1 without W2 | W1 is listed and W2 is not | New "+" tabs vanish from the filtered strip | Ship W1 and W2 together |
| DSH work | Handoff step 11 | Separate project (PROJECT.md:189-190) | Out of scope |
| Release / MSIX / DMG (NG-075..081) | Adjacent to platform updates | Need hosts and accounts | Backlog 999.2 |

## Feature Dependencies

```
OpenCode removal ──changes──> build:extensions chain ──> G-9 clean build, theia-build-order rows
OpenCode removal ──eases────> Theia 1.76.0 (AI-layout override gone with it)
NG-051 amend ──required by──> OpenCode removal (test_ref deleted)
Firefox 153.5 ──independent of──> Theia 1.76.0 (separate dev shells)
Theia 1.76.0 + React 19 ──required by──> NG-084 React 19 runtime line
Panorama spec + gui08 checks ──required by──> NG-074 CI green
Decision 1 (tray) + Decision 2 (strip scope) ──required by──> W1
W2 (new tab → active group) ──required by──> W1 (else new tabs disappear)
W1 ──required by──> W11 cycling being observable in the strip
W4 ──rewrites──> 15-UI-SPEC copy + gui08-panorama-copy + gui08-close-exactness (do after the spec re-pin)
G-11 / G-23 / G-32 outcomes ──required by──> 14-VERIFICATION
All GUI fixes ──required by──> NG-084 (UAT last, so it tests the final tree)
NG-084 + quick tier green + push ──required by──> NG-074
```

### Dependency Notes

- **Panorama spec first among GUI steps:** it is the only red gate, and W4 edits the same copy
  contract. Re-pinning after W4 would mean re-pinning twice.
- **UAT after every GUI fix:** NG-084 run earlier would test a tree that W1, W2, W4, W5 and G-23
  then change.
- **Four items need Chris, not an executor:** NG-051 amend, NG-082 amend, the new v3/v4 rows,
  NG-084 sign-off. G-32 and sketch 005 are decisions. Put them where a session can stop for him.

## MVP Definition (v1.4 exit)

- [ ] OpenCode gone, NG-051 amended
- [ ] Firefox 153.5 with a full build and full `verify-platform.sh` green
- [ ] Theia 1.76.0 / React 19 / Node 24, NG-082 amended, sidecar checked live
- [ ] G-9 run, G-10 row added, v3/v4 rows, baseline refreshed, generate-check closed
- [ ] 15-UI-SPEC re-pinned, gui08 rows green
- [ ] W1+W2, W4, W5
- [ ] G-11, G-23, G-32 resolved; 14-VERIFICATION written
- [ ] NG-084 UAT pass; sketch 005 verdict recorded
- [ ] NG-074 green on pushed `main`

**Defer:** W6 (PROJECT.md:271 already says v1.5+), W11 cycling keys, sketch 005 build,
remaining worklist W12 polish.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
| --- | --- | --- | --- |
| Panorama spec + gui08 checks | HIGH (unblocks CI) | MEDIUM | P1 |
| OpenCode removal | MEDIUM | MEDIUM | P1 |
| Firefox 153.5 | HIGH | HIGH | P1 |
| Theia 1.76.0 / React 19 / Node 24 | HIGH | MEDIUM | P1 |
| W1 + W2 | HIGH | MEDIUM | P1 |
| G-10 group-channel row | MEDIUM | MEDIUM | P1 |
| NG-084 UAT | HIGH | HIGH (human) | P1 |
| NG-074 CI | HIGH | LOW | P1 |
| W4 undo close | MEDIUM | MEDIUM | P2 |
| W5 card close | MEDIUM | LOW | P2 |
| G-9, G-11, G-23, 14-VERIFICATION, v3/v4 rows, baseline, generate-check | LOW–MEDIUM | LOW | P2 |
| G-32 decision, sketch 005 decision | LOW | LOW | P2 |
| W6, W11, G-32 slide | LOW–MEDIUM | LOW–MEDIUM | P3 |

## Sources (all in-tree, read 2026-10-16)

- `.planning/PROJECT.md:156-174, 264-272`; `.planning/HANDOFF-plan-reorg.md:30-82`
- `.planning/milestones/v1.3-phases/14.1.1-gui-conformance-sweep/14.1.1-UAT.md:651-694, 803-816, 930-941`; `deferred-items.md:44-64, 131-148`
- `.planning/milestones/v1.3-phases/14-modes-windows-setups/14-UI-SPEC.md:22-33, 198-200, 265, 316, 360, 367`
- `.planning/milestones/v1.3-phases/15-panorama-organising/15-PANORAMA-WORKLIST.md:32-140`; `15-UI-SPEC.md:14-22, 90-95, 142, 212-219, 281-285`
- `.planning/GUI-DEFECTS.md:22, 59-92`; `docs/non-gui/questions-wave-e.md:15-39`; `docs/non-gui/decisions.md:39-45, 84`
- `ledger/REQUIREMENTS.json:656-667, 955-966, 1059-1070, 1085-1096` (read-only); `scripts/ledger-report.py`
- Code: `theia/extensions/modes/src/browser/{mode-service.ts,setups-service.ts,organising-widget.ts,group-model.ts,panorama-commands.ts,mode-descriptors.ts,modes.css}`, `theia/extensions/chrome-bar/src/browser/tab-strip-widget.tsx`, `powerbrowser/shell/PowerBrowserAPI.sys.mjs`, `configuration.toml`, `flake.nix`, `theia/package.json`, `scripts/verify-platform.sh`
- Runs: `verify-platform.sh --quick`, the two gui08 scripts, `generate.mjs --check` (host and `.#theia`), `gh run list/view` for verify.yml

---
*Feature research for: v1.4 Platform Updates and GUI Close-out*
*Researched: 2026-10-16*
