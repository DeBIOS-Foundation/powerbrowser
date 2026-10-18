# Phase 23: Modes Leftovers and Sketch 005 Verdict - Research

**Researched:** 2026-10-17 (HEAD `02ce825`, `main`; Phase 22 has not executed yet, so every `theia/` line number below moves once it lands. Re-read before editing.)
**Domain:** Bringing archived v1.3 records in line with shipped code, one stock Theia quick-input behaviour change, one Chris-gated motion decision, a retroactive verification report, and a sketch verdict record
**Confidence:** HIGH for code and record facts (every cited line was re-read this session, and the fingerprint seam was run). MEDIUM for check designs and plant texts, which no run has produced. LOW for the live-DOM details (marked [ASSUMED]).

## Summary

Phase 23 is mostly records. The only behaviour change Chris has decided is G-23: Save as Mode and Save Setup must cut names at 60 characters while the user types or pastes. Today both call `quickInput.input(...)` and slice afterwards (`mode-service.ts:443,447`, `setups-service.ts:575,579`). Theia 1.76's `InputOptions` has no length option, so the stock mechanism is `createInputBox()` with an `onDidChangeValue` handler that writes back `value.slice(0, max)`. The Monaco source shows that this write-back cannot recurse. One small shared helper in `@powerbrowser/modes` and a one-line change at each call site do the job.

The finding the brief missed: the two live NG checks that save a mode or setup (`verify-ng-035-custom-mode-layout.mjs:146-153`, `verify-ng-036-setup-dock-layout.mjs:108-115`) stub `QuickInputService.input`. Once the services call `createInputBox()` instead, the stub is never reached. A real input box opens, nobody accepts it, and the probe fails at its 180 s timeout (`pb-relaunch.mjs:103`). Both files belong to `done` ledger rows (NG-035, NG-036). They are probably hash-locked in `check_locks`, which cannot be confirmed through `ledger-report.py`. If they are locked, editing them needs Chris's re-lock, so MODE-02 likely carries a ledger touchpoint that the ROADMAP does not list.

G-32 (MODE-03) stays open. The plan must put options a/b/c to Chris at a blocking checkpoint, with no recommendation, before it touches any motion code or spec line. At HEAD, every side panel opens and closes instantly, because stock `expandDuration` is 0 and the tree's single `rebind(ApplicationShellOptions)` overrides only `expandThreshold`. MODE-01, MODE-04 and SK-01 are edits to records: the Variant B relocation shipped in `539ba36` on 2026-09-08, and five records still describe the abandoned strip-stays-top fallback.

**Primary recommendation:** five plans in four waves.
- Wave 1, in parallel: 23-02 (G-23 code, check and spec lines) and 23-04 (SK-01 plus the v1.4 planning-record wording), plus the G-32 decision checkpoint, which writes no files.
- Wave 2: 23-03 applies Chris's G-32 choice.
- Wave 3: 23-01 rewrites every archived UAT, defect and requirement record once, citing the 23-02 and 23-03 commits.
- Wave 4: 23-05 writes `14-VERIFICATION.md` last.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Chris's decisions (recorded 2026-10-17, in chat, verbatim)
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

#### Locked
- MODE-04: `14-VERIFICATION.md` is written for the archived Phase 14.
- Records that change are the archived v1.3 files: the UAT entry, the GUI-DEFECTS item 2,
  the GUI-07 box, the `mode-descriptors.ts` comment, and 14-UAT test 3.
- Live checks use `PB_VERIFY_PORT` (default 3939); never touch port 3000.
- `--quick` stays at 0 FAIL with an empty baseline.
- Never fork or patch Theia core.

### Claude's Discretion
Everything else, guided by the ROADMAP success criteria and this phase's research.

### Deferred Ideas (OUT OF SCOPE)
- Building the sketch 005 layout goes to the named v1.5 milestone.

### Phase boundary (CONTEXT `<domain>`)
This phase executes after Phase 22.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MODE-01 | The Variant B records are current (UAT entry, GUI-DEFECTS item 2, GUI-07 box, `mode-descriptors.ts` comment, 14-UAT test 3), and Chris confirms the strip relocation live (G-11). | Shipped behaviour read from code. Each of the five records has its current text and the corrected text below. The live half is handed to Phase 24 (CONTEXT) |
| MODE-02 | The 60-character group-name cap behaviour is decided by Chris and applied (G-23). (The wording is corrected to "mode or setup name" in this phase.) | Theia `InputBox` API, Monaco no-recursion proof, helper shape, call-site constraints from three copy gates, ng-035/ng-036 stub breakage and lock risk, check design |
| MODE-03 | Side panels slide or switch instantly as Chris decides, and 14-UI-SPEC matches (G-32). | Stock shell motion facts, what each option changes, the single-rebind constraint, the `applyStripHome` hide that hides a close slide, check design for any branch |
| MODE-04 | 14-VERIFICATION is written. | Truth inventory (4 ROADMAP criteria, 25 plan must-haves), superseded truths, 14-04/14-05 with no SUMMARY, gap map, fingerprint seam verified on the archived dir |
| SK-01 | The sketch 005 (VS Code layout) verdict is recorded before UAT. | Sketch location and contents, MANIFEST format, the residue-scan exclusion, the record lines to change |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Never fork or patch Theia core.** G-23 uses the public `QuickInputService.createInputBox()`. G-32 options b and c use `ApplicationShellOptions` (already rebound in the tree) and the public side-panel API. `scripts/diff-theia-core.sh` stays the check.
- **Never modify Gecko outside the patch stack.** Not touched.
- **Design for the bridge.** `TabUriRegistry` is not touched.
- **Repo path without a space.** Unchanged.
- **Theia is the default GUI; stock chrome reachable.** Not affected.
- **The residue scan reads `git ls-files`.** Stage the sketch, the new helper and any new script before you trust `node scripts/scan-brand-residue.mjs`. `.planning/` is excluded from the scan (`inventory/brand-tokens.json` `"exclude": [".planning/", …]`), so the sketch cannot fail it. Do not mistake that pass for a check of the sketch.
- **One driver, one registry.** A new check is a row pair (`<label>` and `<label>-self-test`) in `scripts/verify-platform.sh`, never a sibling driver.
- **Verification rules:** never assert the absence of a log line over your own emitter; derive the expectation from the tree and compare as set equality; every new check gets a `--self-test` whose plants each go red naming the drift.
- **User-facing copy:** no new string (Chris: "No new copy"). Any string the plan needs is marked **needs Chris copy review** (23-UI-SPEC).
- **Patches are regenerated, never text-edited.** Not applicable (no patch touched).
- **Builds run in `nix develop .#theia`.** `yarn` does not work outside it; `node` does.
- **Memory notes in force:** `concurrent-sessions-on-main` (commit by explicit path; never `-a`, `--amend` or stash; foreign untracked files exist now, see Pitfall 9); `one-fix-at-a-time-confirmed` (v1.4: take recommended options, stop only when none exists, for ledger approvals, live checks or a push). G-32 has no recommended option, so its stop is required. `chrome-js-startup-cache` (not relevant; no chrome `.js` changes).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Name cap while typing (G-23) | Browser tier: `@powerbrowser/modes` helper over stock `QuickInputService.createInputBox()` | Commit-time `.trim().slice(0, MAX)` in both services (backstop, A3) | The input lives in the frontend. The store must never receive more than 60 characters even if the listener is bypassed |
| Name cap contract | `.planning/milestones/v1.3-phases/14-modes-windows-setups/14-UI-SPEC.md` (:316, :360, plus the custom-modes bullet near :274) | — | 14-UI-SPEC is the parsed contract (`verify-gui09-setups-copy.mjs` `SPEC_REL`) |
| Panel motion (G-32) | Browser tier: the one `rebind(ApplicationShellOptions)` in `chrome-bar-frontend-module.ts` (options b, c); the mode switch path in `mode-service.ts` `activateMode` (option c) | `chrome-bar-widget.tsx` `applyStripHome` (hides left and right containers outside Coding) | Stock shell options own open duration. Close has no stock duration path |
| Strip home per mode (MODE-01) | Browser tier: `chrome-bar-widget.tsx` `applyStripHome` | `tab-strip-widget.tsx` (Browsing home) | Already shipped (`539ba36`); this phase changes records only |
| Records (MODE-01, MODE-04, SK-01) | `.planning/` archived v1.3 files, `GUI-DEFECTS.md`, sketches, v1.4 ROADMAP/REQUIREMENTS/PROJECT | — | No runtime tier |
| Commit gate | `scripts/verify-platform.sh --quick` | Full tier for ng-035/ng-036 and live rows | Static rows cannot see quick-input DOM or panel geometry |

## Standard Stack

No packages are installed. Every mechanism is in the pinned `@theia/core@1.76.0` [VERIFIED: `theia/node_modules/@theia/core/package.json` `"version": "1.76.0"`]. Checks use the Node standard library like their siblings.

| Tool | Version | Use | Evidence |
|------|---------|-----|----------|
| `@theia/core` | 1.76.0 | `QuickInputService.createInputBox()`, `InputBox`, `ApplicationShellOptions` | [VERIFIED: package.json, `.d.ts` read] |
| Node | v24.19.0 | checks | [VERIFIED: `node -v`] |
| Python | 3.14.7 | `ledger-report.py`, `phase-gate.py` | [VERIFIED: `python3 --version`] |
| nix `.#theia` | `/run/current-system/sw/bin/nix` | `tsc` and sidecar build | [VERIFIED: `command -v nix`] |
| Built shell | `objdir/dist/bin/powerbrowser` | full-tier live rows | [VERIFIED: `ls`] |

## Package Legitimacy Audit

Not applicable: this phase installs no external package.

**Packages removed due to [SLOP]:** none. **Packages flagged [SUS]:** none.

## Current State (read this session)

### MODE-01: what ships, and the five stale records

**Shipped (Variant B, `539ba36` 2026-09-08 "feat(gui07): the tab strip relocates per mode -- Browsing puts it at the top" [VERIFIED: `git log -1 539ba36`]):**
- `chrome-bar-widget.tsx:853` `const ideDress = modeId === 'coding';` and `:859` `this.tabStrip.setHidden(modeId !== 'browsing');` [VERIFIED: read :840-875].
- `:917-918` `this.shell.leftPanelHandler.container.setHidden(!ideDress);` / `this.shell.rightPanelHandler.container.setHidden(!ideDress);` [VERIFIED].
- `tab-strip-widget.tsx:31-34` header: "GUI-07: the tab strip's Browsing home — the very top of the window, above the URL row … (14-UI-SPEC per-mode shell map, amended 2026-09-08; sketch 003)" [VERIFIED].
- 14-UI-SPEC binding constraint: "**Binding constraint — AMENDED 2026-09-08 (13-01 spike re-probed GREEN).** The Variant-A fallback below is **superseded**." (:22-24). Per-mode table rows: Browsing "Very top, above the URL row"; Coding "Docked in the editor area"; Organising "The Panorama canvas (Phase 15; placeholder slot in Phase 14)" (:258-262) [VERIFIED].
- `13-SPIKE-STRIP-RELOCATION.md:16` "**Verdict: GREEN** — both pillars proven on the tree of 2026-09-08" [VERIFIED].
- No automated check asserts where the strip sits per mode. `gui07-mode-switch-tabs-live` asserts tab identity across switches (`verify-platform.sh:4869`) [VERIFIED: label read]. The relocation is a live backstop (23-UI-SPEC E4), and G-11 hands it to Phase 24.

The 23-UI-SPEC MODE-01 table (Browsing / Coding / Organising, including the split-pane case in Browsing) is what each record must describe.

| # | Record | Current (verbatim excerpt) | Correct to |
|---|--------|---------------------------|-----------|
| 1 | `14.1.1-UAT.md` test 11 (`:151-162`) | heading "Tabs move between modes (Variant B) — or the strip stays top (Variant-A fallback)"; contract cites "14-UI-SPEC.md:22-28 (binding RED verdict — strip stays top in all modes)"; expected "Decision required…"; evidence "No code relocates the strip."; `fixable: decision`, `result: issue` [VERIFIED] | Expected = the three homes plus "no tab lost or duplicated across Browsing → Coding → Browsing". Contract = 14-UI-SPEC :22-46 and :258-262, plus `13-SPIKE-STRIP-RELOCATION.md:16`. Evidence = `539ba36` and `chrome-bar-widget.tsx` `applyStripHome`. `fixable: needs-chris`, `result: pending` (Chris sets the result in Phase 24) |
| 2 | `14.1.1-UAT.md` gap G-14.1.1-11 (`:682-694`) | `truth: "…Variant B relocation, or strip-stays-top with tabs following the layout"`, `status: open`, `fixable: decision` [VERIFIED] | Add a `truth_correction:` line rather than rewriting the truth (precedent: G-14.1.1-24 `truth_correction: "RESTATED 2026-09-07 by 14.1.1-04, …"` at `:820`). `status: in_tree`, `fixable: needs-chris`, root_cause "Decided and built: 14-UI-SPEC amended 2026-09-08, code 539ba36; Chris's live look is handed to Phase 24" |
| 2a | `14.1.1-UAT.md` Summary (`:520-522`) | "decision 6 (G-11, 12, 28, 29, 30, 31) · needs-chris 8 (G-1, 2, 3, 13, 14, 15, 32, 43)" [VERIFIED] | decision 5 (G-12, 28, 29, 30, 31) · needs-chris 9 (adds G-11). Re-derive every count touched by tests 11, 23 and 32 (`total: 48`, `issues: 35`, `pending: 13` at `:511-514`) |
| 3 | `.planning/GUI-DEFECTS.md:22` item 2 | "Tabs do not move between modes \| OPEN \| Variant B. …" in the "Visible to Chris, still broken" table [VERIFIED] | `IN TREE`, the file's own status for "code landed, not confirmed live" (`:7-9`). Move it to "Fixed in the tree, unconfirmed in the window" (`:26`). Cite `539ba36`, the GREEN verdict and the three homes; add "Chris confirms in the Phase 24 session (G-14.1.1-11)". It becomes `CONFIRMED` in Phase 24 |
| 4 | `.planning/milestones/v1.3-REQUIREMENTS.md:38` GUI-07 box, traceability `:157` | `- [ ] **GUI-07**: … the tab strip relocates per mode … side panels slide, and every tab persists across switches.`; row "Pending" [VERIFIED] | Add a dated status note citing `539ba36` and the G-32 outcome. Leave the box unchecked: the text also says "side panels slide", and G-11 is not yet confirmed. Phase 24 flips it. Under G-32 option a, the note records Chris's amendment of "side panels slide" |
| 5 | `mode-descriptors.ts:13-18` | "Strip binding (13-01 verdict RED): the tab strip stays top in every mode, so no descriptor names the strip, the top area, or any relocation. Modes reshape panel visibility and the main-area view only, per 14-UI-SPEC: …" [VERIFIED] | "Strip binding (13-01 re-probed GREEN, 14-UI-SPEC amended 2026-09-08): the strip changes home per mode, and the chrome bar owns that rule, not a descriptor (chrome-bar-widget.tsx: strip in Browsing only; Coding shows the dock's own tab bars; Organising shows cards). Descriptors reshape side-panel visibility and the main-area view only: …" Keep the rest. The trailing "The Organising placeholder show/hide hooks land in plan 14-02." (`:19`) is also stale since Phase 15; editing it is optional |
| 6 | `14-UAT.md` test 3 (`:38-41`), Summary `:86-87` | "### 3. Tab strip stays top in every mode", `result: skipped`, reason "Ratified Variant-A fallback…"; `pending: 3`, `skipped: 1` [VERIFIED] | "Tab strip relocates per mode (Variant B)", expected = the three homes plus "no tab closed, moved windows or detached", `result: pending`, dated reason; Summary `pending: 4`, `skipped: 0` |

**Other stale records:**
- `PROJECT.md:271` "Piles + type-anywhere search for the canvas; Variant-B re-probe;". Delete only "Variant-B re-probe;". `PROJECT.md:169` is the "Phase 14 / 14.1.1 leftovers: name cap (G-23), Variant B (G-11), …" box, and `:173` is "Decision on sketch 005 (VS Code layout)" [VERIFIED].
- Leave the historical snapshots as they are: `v1.3-MILESTONE-AUDIT.md` and the retired section of PROJECT.md [CITED: brief].
- `14-UAT.md` test 2 still says "the status-bar chip re-asserts the count" (`:33`), but the chip was removed (14-UI-SPEC `:267-273`) [VERIFIED]. Fixing it is optional.

### MODE-02 (G-23): today's name paths

| Site | Code at HEAD | Evidence |
|------|--------------|----------|
| Mode cap | `export const MODE_NAME_MAX = 60;` with doc "Contracted name cap (14-UI-SPEC.md): pasted overflow is cut before commit." | `mode-service.ts:71-72` [VERIFIED] |
| Mode save | `const answer = await this.quickInput.input({ prompt: 'Save as Mode', placeHolder: 'Mode name' });` … `const name = answer.trim().slice(0, MODE_NAME_MAX);` | `mode-service.ts:443`, `:447` [VERIFIED] |
| Mode header | "the typed name is trimmed and cut at the contracted 60-character cap before commit" | `mode-service.ts:47-48` [VERIFIED] |
| Setup cap | `export const SETUP_NAME_MAX = 60;` (same doc line) | `setups-service.ts:73-74` [VERIFIED] |
| Setup save | `const answer = await this.quickInput.input({ prompt: SETUP_DIALOG_TITLE, placeHolder: SETUP_NAME_PLACEHOLDER });` … `.trim().slice(0, SETUP_NAME_MAX)` | `setups-service.ts:575`, `:579`; `SETUP_DIALOG_TITLE = 'Save Setup'` `:149`, `SETUP_NAME_PLACEHOLDER = 'Setup name'` `:152` [VERIFIED] |
| Loader slices (unchanged) | `row['name'].trim().slice(0, MODE_NAME_MAX)`; `(row['name'] as string).trim().slice(0, SETUP_NAME_MAX)` | `mode-service.ts:194`, `setups-service.ts:322` [VERIFIED] |
| Precedent (group rename) | `input.maxLength = 60;` then an `input` listener: `if (input.value.length > GROUP_TITLE_MAX_CHARS) { input.value = input.value.slice(0, GROUP_TITLE_MAX_CHARS); }` | `organising-widget.ts:1012`, `:1018-1022` (`buildRename` at `:1007`); `GROUP_TITLE_MAX_CHARS = 60` at `group-model.ts:30`; commit `raw.trim().slice(0, GROUP_TITLE_MAX_CHARS)` at `:409` [VERIFIED]. The brief's `:1003-1016` is wrong. 23-UI-SPEC's `:1019-1021` is right |

**Theia 1.76 API** (`theia/node_modules/@theia/core/lib/common/quick-pick-service.d.ts`) [VERIFIED: read]:
- `export interface InputBox extends QuickInput {` (`:140`), with `value: string | undefined;` (`:141`), `valueSelection: Readonly<[number, number]> | undefined;` (`:142`), `placeholder: string | undefined;`, `readonly onDidChangeValue: Event<string>;` (`:145`), `readonly onDidAccept: Event<void>;` (`:146`), `prompt: string | undefined;`, `validationMessage: string | undefined;`.
- `QuickInput` has `readonly onDidHide: Event<{ reason: QuickInputHideReason; }>;`, `show(): void; hide(): void; dispose(): void;` (`:123-138`).
- `export interface InputOptions {` (`:187`) has `title?`, `value?`, `valueSelection?`, `prompt?`, `placeHolder?`, `password?`, `ignoreFocusLost?` and `validateInput?`. It has no length option.
- `createInputBox(): InputBox;` (`:255`), `input(options?: InputOptions, token?: CancellationToken): Promise<string | undefined>;` (`:256`).

**Setting `value` inside `onDidChangeValue` does not recurse** [VERIFIED: Monaco source read, `@theia/monaco-editor-core/esm/vs/platform/quickinput/browser/quickInput.js`]:
- The setter is `set value(value) { this._value = value || ''; this.update(); }` (`:911-914`).
- `update()` writes the DOM only when it differs: `if (this.ui.inputBox.value !== this.value) { this.ui.inputBox.value = this.value;` (`:985-987`).
- The DOM change listener returns early on equality: `if (value === this.value) { return; }` (`:961-963`).
- Theia's `createInputBox()` wraps the Monaco box in a pass-through `Proxy` (`monaco-quick-input-service.js:319-337`).
- Stock `input()` (`quickInputController.js:507-562`) is the shape to copy: resolve on accept, then `input.hide()`; `onDidHide` disposes and resolves `undefined`; it sets `input.prompt = options.prompt; input.placeholder = options.placeHolder;`.
- No run has exercised the write-back. The claim rests on reading the source. Its first run is the live assertion in the check design.

**Copy gates that read the call sites** [VERIFIED: read]. The `{ prompt, placeHolder }` object literal must stay at each call site:
- `verify-gui09-setups-copy.mjs:241` matches `/\b(?:prompt|placeHolder|placeholder)\s*:\s*(\w+)\s*[,}]/g` over `setups-service.ts`.
- `verify-shell-error-copy.mjs:577-582` matches `prompt:\s*'([^']+)'` and `placeHolder:\s*'([^']+)'` over `mode-service.ts` (`MODES_SERVICE_REL`, `:522`).
- `verify-setup-roundtrip.mjs:66` `const EXPECTED_NAME_CAP = 60;` and `:262` requires `.slice(0, SETUP_NAME_MAX)` in `setups-service.ts`. Keep the commit-time slice.

**Wording errors:** `ROADMAP.md:307` (criterion 2, "A group name longer than 60 characters…") and `REQUIREMENTS.md:80` (MODE-02, "The 60-character group-name cap…") [VERIFIED]. `ROADMAP.md:303`'s "Needs Chris" line still lists the G-23 reading and the sketch 005 verdict as open.

**Stale records for G-23** (`14.1.1-UAT.md`) [VERIFIED]:
- Test 23 is at `:268-279`. It cites "14-UI-SPEC.md:269 …, :313" and "`setups-service.ts:347` and `mode-service.ts:323`".
- Gap G-14.1.1-23 is at `:804-816`. It has `status: open`, a stale `deferred_to: "pass 3 — held by … the concurrent session …"`, and root_cause "Use `validateInput` on the quick input to refuse past 60". Chris's choice ("cut") supersedes that root cause.
- The citations should be `14-UI-SPEC.md:316`/`:360` and `setups-service.ts:579`/`mode-service.ts:447`, as they stand before 23-02 edits them. Re-read after 23-02 lands.

### MODE-03 (G-32): stock motion at HEAD

| Fact | Evidence |
|------|----------|
| `ApplicationShell.DEFAULT_OPTIONS` sets `expandDuration: 0` on `bottomPanel`, `leftPanel`, `rightPanel` | `application-shell.js:2076-2095` (`expandDuration` at `:2080`, `:2086`, `:2092`) [VERIFIED] |
| The shell merges user options per panel over the defaults | `application-shell.js:207-215` [VERIFIED] |
| Open animates only when `applicationStateService.state === 'ready'`: side panels `duration: enableAnimation ? this.options.expandDuration : 0` | `side-panel-handler.js:499-505` [VERIFIED] |
| Bottom panel: same rule in `setBottomPanelSize` | `application-shell.js:751-756` [VERIFIED] |
| Side collapse has no duration path: `collapse()` clears `currentTitle` or calls `refresh()` | `side-panel-handler.js:333-342` [VERIFIED] |
| Bottom collapse: records `bottomPanelState.lastPanelSize = size` only `if (size)`, then `bottomPanel.hide()` | `application-shell.js:1430-1445` [VERIFIED] |
| The motion is linear: `const pos = start + (target - start) * t;` | `split-panels.js:103-106` [VERIFIED] |
| The tree's only rebind: `rebind(ApplicationShellOptions).toConstantValue({ leftPanel: { expandThreshold: 0 }, rightPanel: { expandThreshold: 0 }, bottomPanel: { expandThreshold: 0 } });`, comment "`emptySize`, `expandDuration` and `initialSizeRatio` keep their framework values" | `chrome-bar-frontend-module.ts:50-57` [VERIFIED] |
| The switch path calls stock expand and collapse | `mode-service.ts:338-353` (`leftPanelHandler.expand`, `.collapse()`, `expandPanel('bottom')`, `collapsePanel('bottom')`) [VERIFIED] |
| Outside Coding the left and right containers are hidden outright | `chrome-bar-widget.tsx:917-918` `container.setHidden(!ideDress)` [VERIFIED] |
| Reduced-motion precedent in the tree | `web-tab.ts:603` `window.matchMedia('(prefers-reduced-motion: reduce)').matches`; `modes.css:116`, `:735` `@media (prefers-reduced-motion: reduce)` [VERIFIED] |
| Sketch timing | sketch 003 `--slide:.2s ease` (`index.html:16`); sketch 002 `width 0.2s ease` (`:38`) [VERIFIED] |
| 14-UI-SPEC lines that state the slide | `:16` "side panels slide per", `:125` slide-distance exception row, `:198-200` Motion, `:264-266` Interaction bullet, `:367` UI Considerations `loading \| E4+E7` [VERIFIED] |
| Stale UAT citations | Test 32 (`:359-370`) and G-14.1.1-32 (`:931-941`) cite "14-UI-SPEC.md:172-174, :231-232, :320" (now `:198-200`, `:264-266`, `:367`). The evidence blames `modes.css`, but the cause is stock `expandDuration: 0` [VERIFIED] |

### MODE-04: the Phase 14 archive

- `.planning/milestones/v1.3-phases/14-modes-windows-setups/` has no VERIFICATION file. `14-04-PLAN.md` and `14-05-PLAN.md` have no SUMMARY [VERIFIED: `ls`]. `v1.3-ROADMAP.md` says "**Plans**: 3/3 plans executed" for Phase 14 [VERIFIED].
- Their work landed through `d5b8dc1` (2026-09-08, "feat(14): main-area exemption and the group-actor channel, recovered from 09-06") [VERIFIED: `git log -1`] and the 14.1.1 plans [CITED: brief].
- Must-have truths per plan: 14-01 has 4, 14-02 has 5, 14-03 has 5, 14-04 has 5 and 14-05 has 6, for a total of 25 [VERIFIED: awk count over `must_haves.truths`].
- `v1.3-ROADMAP.md` Phase 14 success criteria 1-4 [VERIFIED]. Criterion 2 is "Tab strip relocates per mode (… Variant B — or stays top under the Variant-A fallback) with sliding side panels, and every tab persists across switches".
- 14-UAT gaps: G-14-1..6 `in_tree`, G-14-7 `deferred`, G-14-8 `open` (`14-UAT.md:112-264`) [VERIFIED]. G-14-8's successor is G-14.1.1-25, `status: fixed`, `closed_by: "plan 14.1.1-05, commit 973608f …"`, contract "14-UAT.md:261-270 G-14-8" [VERIFIED].
- Superseded truths, to be recorded as `overrides` with owner and date:
  - strip-stays-top (14-01 T1): superseded 2026-09-08 by the Variant B amendment;
  - the tab-count chip (14-01 T2, 14-02 T4): superseded 2026-09-08 when the chip was removed (14-UI-SPEC `:267-273`);
  - the Organising placeholder slot (14-02 T3): replaced by Phase 15;
  - the panel slide (14-02 T4): depends on G-32.

  These truth IDs are [CITED: brief]. The executor re-reads each plan's truths before writing overrides.
- Template: `~/.claude/gsd-core/templates/verification-report.md`. Its frontmatter has `phase`, `verified`, `status`, `score`, `covered_files`, `covered_digest`, `behavior_unverified`, and the optional item lists [VERIFIED: read]. House example: `14.1.1-VERIFICATION.md` adds `pass`, `supersedes` and `scope` [VERIFIED].
- **The fingerprint seam works on the archived dir** [VERIFIED: run this session]: `node ~/.claude/gsd-core/bin/gsd-tools.cjs query verification.fingerprint .planning/milestones/v1.3-phases/14-modes-windows-setups <files…>` returned `covered_files` (all 8 plan and summary files plus the named file) and `"covered_digest": "v3:sha256:…"`. The brief's "untested" caveat is resolved.

### SK-01: sketch 005

- `.planning/sketches/005-vscode-layout/index.html` (268 lines) is untracked. It is the only file in the directory [VERIFIED: `ls`, `git status`].
- `MANIFEST.md` ends at row 004 and has five columns `| # | Name | Design Question | Winner | Tags |` [VERIFIED].
- Sketches 001-003 have a README, 004 does not [VERIFIED: `git ls-files`].
- Scope line `index.html:113`: "Low-fidelity reference for the VS Code style shell in Coding. Browsing and Organising keep today's layout." [VERIFIED].
- Legend `:158-166`: the changes are items 1 'One title row', 2 'Centred address box', 3 'Right cluster' and 4 'Activity icons across the top' (`:159-162`, `'chg'`). The items already true today are 5-8 (`:163-166`, `'ok'`) [VERIFIED]. Item 3 also says "The mode toggle sits beside the address box; placement open." That open question carries into v1.5.
- Future work: `REQUIREMENTS.md:105-112`, with `:109` "**Sketch 005**: Building the VS Code layout, if the verdict adopts it." The traceability row is `:157` `| SK-01 | Phase 23 | Pending |` [VERIFIED].
- ROADMAP milestone list `:3-10`, Future `:10` "📋 **Future** — GUI-05 unified tab strip, … (v1.5+)" [VERIFIED].

## Recommended Implementation

### 23-02: MODE-02 (G-23)

**New file** `theia/extensions/modes/src/browser/capped-name-input.ts`, a stock-API helper shared by both services (23-UI-SPEC allows one helper):

```ts
// Source: stock QuickInputController.input() shape (quickInputController.js:507-562), plus the cut.
import { InputOptions, QuickInputService } from '@theia/core/lib/common/quick-pick-service';

/** G-23: the field never holds more than `max` characters, typed or pasted (same rule as group rename). */
export function inputCappedName(quickInput: QuickInputService, options: InputOptions, max: number): Promise<string | undefined> {
    return new Promise(resolve => {
        const box = quickInput.createInputBox();
        let accepted: string | undefined;
        box.prompt = options.prompt;
        box.placeholder = options.placeHolder;
        // shortcut: the cut keeps the first `max` characters and leaves the caret at the end (23-UI-SPEC A1); restore valueSelection if Chris wants the caret kept
        box.onDidChangeValue(value => { if (value.length > max) { box.value = value.slice(0, max); } });
        box.onDidAccept(() => { accepted = box.value ?? ''; box.hide(); });
        box.onDidHide(() => { box.dispose(); resolve(accepted); });
        box.show();
    });
}
```

**Call sites (one line each, keep the object literal):**
- `mode-service.ts:443` becomes `const answer = await inputCappedName(this.quickInput, { prompt: 'Save as Mode', placeHolder: 'Mode name' }, MODE_NAME_MAX);`.
- `setups-service.ts:575` becomes `… inputCappedName(this.quickInput, { prompt: SETUP_DIALOG_TITLE, placeHolder: SETUP_NAME_PLACEHOLDER }, SETUP_NAME_MAX);`.
- Keep `:447` and `:579` (`.trim().slice(0, MAX)`) as the backstop (A3).
- Update the "before commit" comments at `mode-service.ts:47-48`, `:71` and `setups-service.ts:73` to say the cut happens while typing, with the commit slice as a backstop.
- Optional: `organising-widget.ts:1012` `60` → `GROUP_TITLE_MAX_CHARS`. Phase 22 edits that file first, so re-read it.

**Spec (14-UI-SPEC):**
- `:316` becomes "A quick input with one name field, capped at 60 characters while typing; pasted text is cut to its first 60 characters. Enter saves, Esc cancels." This drops "dialog" (23-UI-SPEC A5).
- State the same rule once in the custom-modes bullet (near `:274`).
- `:360` row becomes "Input holds at most 60 characters; typed and pasted overflow is cut at the cap while typing, before commit."
- Do not touch any Copywriting Contract row (`verify-gui09-setups-copy.mjs` parses `SETUP_ROW_LABELS` rows).

**Planning wording:** correct `ROADMAP.md:307` and `REQUIREMENTS.md:80` to "mode or setup name" (A6). Those two files belong to 23-04 (see the plan split), so 23-04 makes the edit.

**The ng-035 / ng-036 stubs (must be handled in 23-02):**
- `verify-ng-035-custom-mode-layout.mjs:146-153` sets `input.input = async () => 'NG035 Saved';`, then runs `SAVE_AS_MODE`.
- `verify-ng-036-setup-dock-layout.mjs:108-115` does the same with `'NG036'` [VERIFIED].
- After the change the services never call `input()`, so both probes wait for a box nobody accepts and fail at the 180 s probe timeout (`pb-relaunch.mjs:103` `timeoutMs = 180000`) [VERIFIED: source; ASSUMED: the exact failure text].
- The fix is to stub `createInputBox` instead, or to drive the real box: set the DOM value, dispatch `input`, then fire accept.
- **Precondition:** NG-035 and NG-036 are `done` [VERIFIED: `ledger-report.py`]. Whether their check files are in `check_locks` is not visible through `ledger-report.py`; [ASSUMED] they are locked, since Phase 19's REVIEW-FIX records ng files as "hash-locked in the ledger `check_locks`". An edit to a locked file prints `test file changed` from `phase-gate.py` (`:159-160`) and needs Chris's `ledger-amend.py … lock-checks` (precedent: `20-05-PLAN.md:222`).
- The plan must establish lock status first and, if the files are locked, add a blocking Chris re-lock checkpoint. 20-01-PLAN's precondition used a direct `grep` of `ledger/REQUIREMENTS.json`; in this session the ledger may be read only through `ledger-report.py`, so ask Chris or run the grep only if that rule allows it.
- Put the positive "cut at 60" live assertion in a new file rather than a locked one (21-RESEARCH Pitfall 5 precedent).

**Close G-14.1.1-23:** `fixed` with `closed_by` once the live assertion shows a 70-character set leaves 60; otherwise `in_tree`. Delete the stale `deferred_to`. This record edit belongs to 23-01, which is the single writer of `14.1.1-UAT.md`.

### 23-03: MODE-03 (G-32). Three branches, no recommendation

Task 1 is the blocking checkpoint. It presents the 23-UI-SPEC Motion table rows a/b/c together with the facts below and writes no file. Code and spec then change together in one commit (23-UI-SPEC).

| Branch | Code | 14-UI-SPEC | Facts Chris needs |
|--------|------|------------|-------------------|
| **a. Instant** | None | `:16` "side panels open and close instantly per mode"; strike the `:125` exception row; `:198-200` "Side panels switch instantly; no slide is authored"; `:264-266` "panels and the strip change at once"; `:367` "Panels switch instantly" | This is what ships today. GUI-07's "side panels slide" (`v1.3-REQUIREMENTS.md:41`) gets a dated amendment note, not a silent box flip |
| **b. Slide on open only** | In the existing rebind (`chrome-bar-frontend-module.ts:53-57`), add `expandDuration: slideMs` to all three panels, where `const slideMs = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : N;` and N ≤ 200. Rewrite the `:48-50` comment | Motion: "panels slide open (≤ N ms) and close instantly; reduced motion opens them instantly". Split the `:265` "strip changes home (≤200ms …)" claim so the timing covers panels only | The slide is linear, not `ease`. It applies to every panel open, not only mode switches. There is no slide before app state `ready`, so a cold launch into Coding opens instantly. Reduced motion is read once at startup |
| **c. Slide both ways** | b, plus an authored shrink before each stock collapse in `activateMode`: record the width, `setSidePanelSize(container, 0, { side, duration: N, referenceWidget: dockPanel })`, collapse, then restore `handler.state.lastPanelSize` (`state` is public, `side-panel-handler.d.ts:71`; `lastPanelSize?` `:278`). The bottom panel's `bottomPanelState` is `protected` (`application-shell.d.ts:126`), but `collapseBottomPanel` already skips the record when the size is 0 (`if (size)`, `:1436-1440`). The `applyStripHome` hide at `chrome-bar-widget.tsx:917-918` must wait for the slide, or the close is never visible | Motion keeps "slide per mode switch, ≤ 200 ms", with a note that it is linear | Most code; touches stock internals' state shape (not core files); two files must sequence (mode-service and chrome-bar-widget) |

**Constraints for b and c:**
- Exactly one `rebind(ApplicationShellOptions)` may exist. A second rebind replaces the first and loses `expandThreshold: 0`, which brings back the drag-reveal bug described in the rebind comment.
- `verify-mode-switch-tabs-invariant.mjs` derives switch-path calls only from `this.shell…`, `this.perspectives…` and `this.statusBar…` call chains (`switchCallsOf`, `:225`). An option c call written as `this.shell.<…>.x(` must be added to `EXPECTED_SWITCH_CALLS` (`:124-147`) in the same commit. A call through an injected `SplitPositionHandler` is not seen at all, so the new motion check must cover it. This corrects the brief's unconditional "must be updated".

**Close G-14.1.1-32** with the commit, `fixed (spec-amended)` under a. Under b and c, close it after the live motion check. The record edit belongs to 23-01.

### 23-04: SK-01 plus the v1.4 planning wording

- **Commit:** `git add .planning/sketches/005-vscode-layout/index.html` by explicit path only. Do not stage the other untracked files (Pitfall 9).
- **MANIFEST row:** use the 23-UI-SPEC R5 values: `| 005 | vscode-layout | How should Coding mode lay out its shell, VS Code style? | adopted into v1.5 (all four changes) | layout, coding, chrome |`. The brief's alternative wording conflicts with the phase's own UI contract, so R5 wins. A README is optional (004 has none).
- **The verdict:** name the four changes from the legend: (1) one title row, (2) centred address box, (3) right cluster of layout toggles, (4) activity icons across the top of the sidebar. Record that item 3's mode-toggle placement is still open.
- **REQUIREMENTS.md:** turn `:109` into a v1.5 entry naming SK-01, the date 2026-10-17 and the four changes, with "Browsing and Organising unchanged". Correct MODE-02 at `:80`.
- **ROADMAP.md:**
  - Add a named v1.5 milestone line in the `:3-10` list, in the existing `📋 **…** — …` form. The name is [ASSUMED], see Open Question 2.
  - Correct criterion 2 at `:307`.
  - Update the `:303` "Needs Chris" line: G-23 and SK-01 are decided, and G-32 is pending at the 23-03 checkpoint.
- **PROJECT.md:** check `:173` with the verdict; add the v1.5 milestone to Next Milestone Goals (`:264-273`); delete "Variant-B re-probe;" from `:271`.
- **Record that Phase 24 tests today's layout** (CONTEXT).

### 23-01: MODE-01 and every UAT record (single writer of `14.1.1-UAT.md`)

- The five MODE-01 records, from the table above.
- Tests 23 and 32 and gaps G-23 and G-32 in `14.1.1-UAT.md`, citing the 23-02 and 23-03 commits.
- The Summary counts, re-derived.
- The G-11 hand-off to Phase 24.

### 23-05: MODE-04

Write `.planning/milestones/v1.3-phases/14-modes-windows-setups/14-VERIFICATION.md` last.
- **Truths:** the four v1.3 ROADMAP criteria are the primary truths. Score the 25 plan must-haves under them.
- **Overrides:** list the superseded truths, each with its owner decision and date.
- **14-04 and 14-05:** record them as "no SUMMARY; work landed in d5b8dc1 and 14.1.1 plans".
- **Gap map:** map G-14-1..8 to their 14.1.1 successors and current status.
- **Evidence:** cite rows by label: `gui07-mode-toggle-commands`, `gui07-mode-switch-tabs-invariant`, `gui07-strip-spike-verdict`, `gui09-setup-roundtrip`, `gui09-setups-copy`, plus the full-tier `gui07-mode-switch-tabs-live`, `ng-035-custom-mode-saves-layout` and `ng-036-setup-records-dock-layout` [VERIFIED: labels at `verify-platform.sh:3792,3832,3781,3841,3954,4869,4915,4916`].
- **Status:** `human_needed`. Hand 14-UAT tests 3, 5, 7 and 8, plus G-14.1.1-1 and G-14.1.1-11, to Phase 24.
- **Fingerprint:** compute `covered_digest` with the seam (verified working) and copy it verbatim.

## Architecture Patterns

### System Architecture Diagram

```
 Save as Mode / Save Setup command
   └─► ModeService.saveCurrentAsMode / SetupsService.saveCurrentAsSetup
         └─► inputCappedName(quickInput, {prompt, placeHolder}, MAX)   ← call-site literal read by
               ├─ QuickInputService.createInputBox()  (stock)            gui09-setups-copy and
               ├─ onDidChangeValue: len > MAX ─► box.value = slice(0,MAX)  shell-error-copy
               ├─ onDidAccept ─► hide ─► onDidHide ─► resolve(value | undefined)
         └─► trim().slice(0, MAX) backstop ─► empty? / duplicate? (existing copy) ─► store write

 Mode switch (toggle / command) ─► ModeService.activateMode
   ├─ switchPerspective ─► ensureInArea ─► expand/collapse (stock)  ─► [b,c] setPanelSize(duration=expandDuration if state 'ready')
   │                                                                  [c]  authored shrink before collapse
   └─ data-pb-mode attribute ─► ChromeBarWidget.applyStripHome
          ├─ strip shown only in Browsing; dock tab bars in Coding; cards in Organising
          └─ left/right containers hidden unless Coding  (option c must sequence after the slide)

 Records: 14-UI-SPEC ─► gui09-setups-copy, new name-cap and motion checks
          14.1.1-UAT / 14-UAT / GUI-DEFECTS / v1.3-REQUIREMENTS / mode-descriptors comment ─► Phase 24 live UAT
```

### Recommended plan split

| Wave | Plan | Files (exclusive to the plan) | Chris |
|------|------|-------------------------------|-------|
| 1 | **23-02** MODE-02 | new `capped-name-input.ts`; `mode-service.ts`; `setups-service.ts`; new `scripts/verify-name-cap-at-input.mjs`; new live script (name cap); `verify-ng-035-…mjs` and `verify-ng-036-…mjs` (stub fix); `scripts/verify-platform.sh`; 14-UI-SPEC `:316`, `:360`, custom-modes bullet | **blocking if ng-035/036 are locked** (re-lock); live run |
| 1 | **23-04** SK-01 + v1.4 records | `.planning/sketches/005-vscode-layout/index.html`, `MANIFEST.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/PROJECT.md` | — |
| 1 | **23-03 task 1** | none (decision checkpoint) | **blocking** (G-32) |
| 2 | **23-03** rest | 14-UI-SPEC motion lines; b: `chrome-bar-frontend-module.ts`; c: also `mode-service.ts`, `chrome-bar-widget.tsx`, `verify-mode-switch-tabs-invariant.mjs`; new motion check; `verify-platform.sh` rows | live motion check (b, c) |
| 3 | **23-01** MODE-01 + UAT records | `14.1.1-UAT.md`, `14-UAT.md`, `GUI-DEFECTS.md`, `v1.3-REQUIREMENTS.md`, `mode-descriptors.ts` | — |
| 4 | **23-05** MODE-04 | `14-VERIFICATION.md` | — |

Why this order:
- **23-03 waits for 23-02.** They share 14-UI-SPEC and `verify-platform.sh`, and under c also `mode-service.ts`.
- **23-01 needs both commit hashes.** No other plan writes `14.1.1-UAT.md`.
- **23-05 reads everything.**
- **The v1.4 requirement boxes are not written by any plan.** The phase-completion step flips the MODE-0x and SK-01 boxes in `REQUIREMENTS.md`, as it did for PAN-07 in Phase 21 [ASSUMED: completion-step behaviour, not read this session]. MODE-01 stays unchecked until G-11 is confirmed (Open Question 1).

### Anti-Patterns to Avoid
- **`box.prompt = 'Save as Mode'` inside a service.** It removes the literal from the call-site object that two copy gates parse. The contracted copy then reads as gone.
- **Removing the commit-time slice.** This breaks `verify-setup-roundtrip.mjs:262` and the A3 backstop.
- **A second `rebind(ApplicationShellOptions)`.** It silently drops `expandThreshold: 0`.
- **Quoted `['…', 'left']` pairs, `id: '…'` literals or `textContent` in the new `mode-descriptors.ts` comment.**
  - `verify-ng-029-setup-restore-mode.mjs:17` and `verify-ng-035-custom-mode-layout.mjs:32` take the first `/\['([^']+)',\s*'left'\]/` match in this file.
  - ng-035 `:60` collects every `\bid:\s*'([^']+)'` in it.
  - `verify-gui08-panorama-copy.mjs:252,262` plants `textContent` lines into it.
- **Rewriting a UAT truth in place.** Use `truth_correction:`.
- **`.planning/phases/23-…` literals in a new script.** `planning-paths` (`verify-planning-paths.mjs:26-27`, `SCOPE = ['scripts/', '.github/']`) requires tracked paths, and the v1.4 closeout moves the phase dir. Cite `.planning/milestones/v1.3-phases/…` only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Length-capped name input | A custom dialog widget, DOM `maxLength` poked into Monaco's widget, or a `validateInput` message | `createInputBox()` plus `onDidChangeValue` | Stock public API. `validateInput` needs a message, which would be new copy (A4). The DOM class names are Monaco internals |
| Open slide (b) | CSS transitions on Theia side-panel containers | `expandDuration` in the existing rebind | Lumino computes the layout, so CSS fights it (23-UI-SPEC) |
| Spec parsing in the new checks | A new markdown parser | gui09's row regex (`verify-gui09-setups-copy.mjs`, `SPEC_REL` `:82`) | One idiom across the gui gates |
| Verification digest | A hand-computed hash | `gsd-tools query verification.fingerprint` | Verified working on the archived dir |
| Live harness | A new launcher | `scripts/lib/pb-relaunch.mjs` (`probe`, `withShell`, `runCheck`) as ng-035 uses it | Profile, port and timeout handling exist |

## Runtime State Inventory

This phase changes no persisted key, store format or identifier.

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | Mode and setup JSON in user storage hold names of 60 characters or fewer already (the loaders slice at `mode-service.ts:194`, `setups-service.ts:322`) | None |
| Live service config | None | None |
| OS-registered state | None | None |
| Secrets/env vars | None | None |
| Build artifacts | `theia/extensions/modes/lib/`, `chrome-bar/lib/` and the sidecar bundle carry the old code until rebuilt | Rebuild before any live run |

## Common Pitfalls

### Pitfall 1: ng-035 and ng-036 break, and may be locked
**What goes wrong:** `--quick` stays green, and the full tier fails ng-035 and ng-036 at the 180 s probe timeout.
**How to avoid:** fix both stubs in 23-02. Establish lock status first. A locked file needs Chris's re-lock checkpoint, and `phase-gate.py` must print nothing afterwards.

### Pitfall 2: copy gates read the call-site object
Keep `{ prompt: …, placeHolder: … }` as the helper's argument at each call site (`gui09-setups-copy.mjs:241`, `shell-error-copy.mjs:577-582`).

### Pitfall 3: the commit slice is asserted
`verify-setup-roundtrip.mjs:262` requires `.slice(0, SETUP_NAME_MAX)`.

### Pitfall 4: stock `expandDuration` is not the spec's slide
The slide is linear, applies to every open, never animates a close, and does not run before `ready`. The spec must describe what the user actually sees (MODE-03).

### Pitfall 5: under option c, `applyStripHome` hides the containers first
`chrome-bar-widget.tsx:917-918` hides the left and right containers the moment the mode attribute leaves Coding, so an authored shrink is never seen unless the hide waits for it.

### Pitfall 6: the switch-invariant only sees `this.shell…` chains
An option c call through `SplitPositionHandler` is not derived by `switchCallsOf`. Cover it in the motion check, or route it through `this.shell` and allowlist it.

### Pitfall 7: Summary counts drift
When `fixable` or `result` changes on tests 11, 23 and 32 and gaps 11, 23 and 32, re-derive the 14.1.1-UAT Summary (`:509-524`) and the 14-UAT Summary (`:81-88`) from the entries. Do not edit only the counts by hand.

### Pitfall 8: Phase 22 moves the line numbers
Phase 22 runs first and edits `organising-widget.ts` and likely the strip code. Re-read every cited line.

### Pitfall 9: foreign untracked files
`git status` shows `.planning/HANDOFF-plan-reorg.md`, `.planning/milestones/v1.3-phases/13-chrome-bar-strip-relocation-spike/13-VERIFICATION.md`, `.planning/phases/21-…/logs/` and `.planning/phases/22-panorama-worklist/22-UI-SPEC.md` as untracked [VERIFIED]. These may belong to another session. Stage by explicit path only.

### Pitfall 10: the residue scan does not look at `.planning/`
A green scan after staging the sketch proves only that the scan ran. The sketch was checked against the token inventory by the brief [CITED: brief, "zero hits"], not by this session.

## Code Examples

### Monaco write-back guard (why the cut cannot loop)
```js
// Source: @theia/monaco-editor-core/esm/vs/platform/quickinput/browser/quickInput.js:911-914, :961-963, :985-987
set value(value) { this._value = value || ''; this.update(); }
// show():
this.ui.inputBox.onDidChange(value => { if (value === this.value) { return; } this._value = value; this.onDidValueChangeEmitter.fire(value); })
// update():
if (this.ui.inputBox.value !== this.value) { this.ui.inputBox.value = this.value; }
```

### Option b rebind (only if Chris picks b or c)
```ts
// Source: chrome-bar-frontend-module.ts:53-57 at HEAD, extended; N is Chris's number (≤ 200)
const slideMs = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : N;
rebind(ApplicationShellOptions).toConstantValue({
    leftPanel: { expandThreshold: 0, expandDuration: slideMs },
    rightPanel: { expandThreshold: 0, expandDuration: slideMs },
    bottomPanel: { expandThreshold: 0, expandDuration: slideMs },
});
```

## Check Designs

### `modes-name-cap-at-input` and `-self-test` (23-02, `--quick`, rows beside `verify-platform.sh:3841-3842`)
Label prefix is the planner's call (neighbours use `gui07-`/`gui09-`).
- **Derives:**
  - `MODE_NAME_MAX`, `SETUP_NAME_MAX` and `GROUP_TITLE_MAX_CHARS` from source;
  - the cap numbers in 14-UI-SPEC `:316` and `:360` (archived path);
  - the bodies of `saveCurrentAsMode` and `saveCurrentAsSetup`;
  - the helper body;
  - every `quickInput.input(` site under `modes/src/browser`.
- **Red when:**
  - the caps disagree with each other or with the spec;
  - a save path calls `quickInput.input(`;
  - a save path passes a literal or the other constant;
  - the helper lacks `createInputBox`, `onDidChangeValue` or `.slice(0, max)`;
  - any derivation is ZERO.
- **Plants:**
  1. mode save reverted to `input(`;
  2. a `60` literal at the setup call;
  3. `MODE_NAME_MAX` passed in setups;
  4. the helper slice removed;
  5. `MODE_NAME_MAX = 61`;
  6. the spec `:360` cap set to 80;
  7. `saveCurrentAsMode` renamed (anchor drift or ZERO);
  8. an extra `quickInput.input(` name prompt in the modes extension.

  Each must go red naming its drift [ASSUMED: failure texts].
- **Live (full tier):** a new script over `pb-relaunch.mjs` opens Save as Mode, sets 70 characters on `.quick-input-widget .quick-input-box input`, dispatches `input`, and asserts that the value length is 60 and that the stored name is the first 60 characters. Do the same for Save Setup. The class names exist in Monaco 1.76 source (`quickInputBox.js:19` `$('.quick-input-box')`, `quickInputController.js:114` `$('.quick-input-widget.show-file-icons')`) [VERIFIED: source]. The live DOM path is [ASSUMED].

### `modes-panel-motion` and `-self-test` (23-03, `--quick`, any branch)
- **Derives:**
  - the declared motion from 14-UI-SPEC Motion (`:198-200`): instant, open-only N ms, or both ways;
  - per-panel `expandDuration` in the single rebind, compared as a set against the panel keys of stock `DEFAULT_OPTIONS` (`application-shell.js:2076-2095`);
  - the count of `rebind(ApplicationShellOptions)` across chrome-bar and modes (must be 1);
  - the reduced-motion guard (b and c);
  - an authored shrink before each collapse (c).
- **Plants:**
  - b and c: drop the bottom panel's `expandDuration`; N = 250 against a 200 spec; remove the `matchMedia` guard; add a second rebind; spec says instant while the code slides.
  - a: add `expandDuration: 150`.
  - c: remove the left shrink.
  - all branches: ZERO derivation.
- **Live (b and c, full tier, `PB_VERIFY_PORT`):**
  - After Browsing → Coding, sample the left container width every animation frame. At least one width must fall strictly between start and end, and the end width must be reached within N ms plus one frame.
  - On Coding → Browsing: b shows no intermediate width; c shows at least one.
  - Under reduced motion, neither direction shows an intermediate width. The Firefox pref that forces reduced motion (`ui.prefersReducedMotion`) is [ASSUMED].

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Strip stays top (Variant A fallback, 13-01 RED) | Strip relocates per mode (Variant B) | 2026-09-08, `539ba36` | Five records are stale (MODE-01) |
| Tab-count chip asserts the invariant | Switch-invariant gate plus live row | 2026-09-08 | 14-UAT test 2 wording, 14-VERIFICATION overrides |
| Organising placeholder slot | Panorama canvas | Phase 15 | 14-02 T3 superseded; descriptor comment `:19` stale |
| Slice after the quick input resolves | Cut while typing (Chris 2026-10-17) | this phase | G-23 |
| G-23 root cause "use `validateInput` to refuse" | "cut", which needs no message | Chris 2026-10-17 | The UAT root_cause text is superseded |

## Chris Touchpoints

| # | When | What | Blocking |
|---|------|------|----------|
| C1 | 23-03 task 1 | G-32: option a, b or c (and N for b/c), presented with no recommendation | **yes** |
| C2 | 23-02, if ng-035/036 are locked | Run the re-lock (`ledger-amend.py lock-checks`) in his terminal after the stub fix | **yes** (ledger approval) |
| C3 | 23-02 / 23-03 live runs | Live name-cap run; for b/c the motion run and a visual check | yes (live check) |
| C4 | Phase 24 | G-11 live confirmation; results for 14-UAT test 3 and 14.1.1 tests 11, 23 and 32; then GUI-DEFECTS item 2 `CONFIRMED`, and the GUI-07 and MODE-01 boxes | no (hand-off) |
| C5 | Any time | Rename the v1.5 milestone if the assumed name is wrong | no |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `verify-ng-035-…mjs` and `verify-ng-036-…mjs` are in `check_locks` | 23-02, Pitfall 1 | If they are not locked, C2 is unnecessary and the edit is free. If they are locked and C2 is skipped, `phase-gate.py` fails |
| A2 | ng-035/036 fail at the 180 s probe timeout rather than in some other way | 23-02 | Low; they fail either way |
| A3 | The live DOM path `.quick-input-widget .quick-input-box input` reaches the field | Check designs | Adjust the selector after the first run |
| A4 | The `ui.prefersReducedMotion` pref forces `prefers-reduced-motion: reduce` in the shell | Check designs | The reduced-motion live leg cannot be driven; record it as manual |
| A5 | The v1.5 milestone name ("v1.5 Coding Workbench Layout", taken from the brief) | 23-04 | Chris renames it; nothing breaks |
| A6 | 14-01 T1, T2, 14-02 T3 and T4 are the superseded truths | 23-05 | The executor re-reads the plans; this changes only the override list |
| A7 | The sketch HTML has no brand token (the brief's case-insensitive check) | Pitfall 10 | Low; `.planning/` is excluded from the scan regardless |
| A8 | Setting `box.value` in `onDidChangeValue` behaves at runtime as the source reads | 23-02 | The live assertion catches it |

## Open Questions

1. **Is MODE-01 complete in Phase 23?**
   - What we know: 23-UI-SPEC A7 marks MODE-01 complete on the records alone. The requirement text (`REQUIREMENTS.md:77-79`) includes "and Chris confirms the strip relocation live (G-11)", and ROADMAP criterion 1 says "Chris has confirmed".
   - What's unclear: whether the hand-off satisfies the box.
   - Recommendation: the evidence says not yet. Phase 23 completes the records and writes the hand-off. The MODE-01 traceability row reads "records done (Phase 23); G-11 live in Phase 24", and Phase 24 checks the box. Chris can overturn this (A7 names him).
2. **The v1.5 milestone name.** CONTEXT requires a named milestone but gives no name. Use the brief's name, flag it, and do not block on it.
3. **G-32.** Chris decides at C1.
4. **Caret after a mid-string cut.** A1 accepts that the caret moves to the end. Restoring `valueSelection` is one extra line if Chris wants the caret kept where he typed.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node | all checks | ✓ | v24.19.0 | — |
| nix `.#theia` | tsc, sidecar rebuild | ✓ | `/run/current-system/sw/bin/nix` | — |
| python3 | `phase-gate.py`, `ledger-report.py` | ✓ | 3.14.7 | — |
| gsd-tools fingerprint | 14-VERIFICATION digest | ✓ | `~/.claude/gsd-core/bin/gsd-tools.cjs` (ran) | — |
| Built shell | full-tier ng and live rows | ✓ | `objdir/dist/bin/powerbrowser` | — |
| Display / Chris's session | live runs, G-32 visual | Chris | — | Blocking checkpoints |
| Port 3000 | — | Chris's container | — | Never used; `PB_VERIFY_PORT=3939` |

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `scripts/verify-platform.sh` registry (node checks); full-tier live rows over `scripts/lib/pb-relaunch.mjs` |
| Config file | the `CHECKS` array in `scripts/verify-platform.sh` (gui07/gui09 block near `:3781-3842`, `:3954-3985`; full-tier ng rows near `:4869-4916`, at `02ce825`) |
| Quick run command | `node scripts/verify-<name>.mjs [--self-test]` for the touched checks (read-only, about 1 s each) |
| Commit gate | `scripts/verify-platform.sh --quick` (0 FAIL, empty `docs/non-gui/quick-baseline.txt`) |
| Full suite command | `scripts/verify-platform.sh` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Failing direction | File Exists? |
|--------|----------|-----------|-------------------|-------------------|-------------|
| MODE-02 | Save paths use the capped helper; caps agree with each other and the spec | static | `node scripts/verify-name-cap-at-input.mjs` | `input(` on a save path, literal or wrong constant, cap or spec drift, ZERO | ❌ W0 |
| MODE-02 | Plants | static | `node scripts/verify-name-cap-at-input.mjs --self-test` | Any of plants 1-8 not red | ❌ W0 |
| MODE-02 | Copy unchanged | static | `--only gui09-setups-copy`, `--only shell-error-copy-no-internals` (each with `-self-test`) | Literal lost from the call-site object or surplus copy | ✅ |
| MODE-02 | Commit slice kept | static | `--only gui09-setup-roundtrip` | `.slice(0, SETUP_NAME_MAX)` gone | ✅ |
| MODE-02 | 70 typed or pasted → 60 shown and stored | live | new name-cap live row, `PB_VERIFY_PORT=3939` | Length ≠ 60 or stored name differs | ❌ W0 |
| MODE-02 | Save still works end to end | live | `--only ng-035-custom-mode-saves-layout`, `--only ng-036-setup-records-dock-layout` | Probe timeout (stub not updated) or layout lost | ✅ (stub edit) |
| MODE-03 | Spec motion equals code motion | static | `node scripts/verify-panel-motion.mjs [--self-test]` | Spec and code disagree, second rebind, missing guard, ZERO | ❌ W0 |
| MODE-03 | Visible motion matches the option (b, c) | live | motion live row | No intermediate width (open), or wrong close behaviour, or slide under reduced motion | ❌ W0 (b, c only) |
| MODE-03 (c) | Switch path still within allowlist | static | `--only gui07-mode-switch-tabs-invariant` (+ `-self-test`) | Unallowlisted `this.shell…` call | ✅ |
| MODE-01 | Descriptor comment edit leaves derivations intact | static | `--only gui07-mode-toggle-commands`, `--only gui08-panorama-copy` (each with `-self-test`) | Regex picks a comment literal; plant misses | ✅ |
| MODE-01 | Records describe Variant B | static | `grep -n 'stays top' .planning/milestones/v1.3-phases/14-modes-windows-setups/14-UAT.md theia/extensions/modes/src/browser/mode-descriptors.ts` returns no current-claim line; `grep -n '^| 2 |' .planning/GUI-DEFECTS.md` shows `IN TREE` | A stale claim remains | — (command) |
| MODE-01 | Strip home per mode | manual | Phase 24 (G-11) | — | — |
| MODE-04 | Report exists with digest | static | `test -f .planning/milestones/v1.3-phases/14-modes-windows-setups/14-VERIFICATION.md && grep -q 'covered_digest: "v3:sha256:' …` | Missing file or digest | ❌ W0 |
| SK-01 | Sketch tracked, MANIFEST row, v1.5 entry | static | `git ls-files .planning/sketches/005-vscode-layout/index.html`; `grep -c '^| 005 |' .planning/sketches/MANIFEST.md` = 1; `grep -n 'v1.5' .planning/ROADMAP.md .planning/REQUIREMENTS.md` | Untracked, no row, no milestone | — (command) |
| all | Theia core untouched | static | `--only diff-theia-core` | Any core diff | ✅ |
| all | Gate | gate | `--quick` 0 FAIL; `node scripts/scan-brand-residue.mjs` after staging; `python3 scripts/phase-gate.py --root .` prints nothing | FAIL row; residue; `test file changed` | ✅ |

### Sampling Rate
- **Per task commit:** run the touched check scripts directly, plus `--self-test`. For TS edits, run `nix develop .#theia --command bash -c 'cd theia && yarn --cwd extensions/modes build'` (and `extensions/chrome-bar` for 23-03). After `git add`, run `node scripts/scan-brand-residue.mjs`.
- **Per wave:** `scripts/verify-platform.sh --quick` once, from the orchestrator, then `python3 scripts/phase-gate.py --root .`.
- **Phase gate:** the live checkpoints (C2, C3), then the full `scripts/verify-platform.sh`, then `phase-gate.py`.

### Wave 0 Gaps
- [ ] `scripts/verify-name-cap-at-input.mjs` plus 2 `--quick` rows (23-02)
- [ ] Name-cap live script plus 1 full-tier row (23-02)
- [ ] `scripts/verify-panel-motion.mjs` plus 2 `--quick` rows (23-03, after C1)
- [ ] Motion live script plus 1 full-tier row (23-03, b or c only)
- [ ] ng-035/ng-036 stub update (23-02, behind C2 if locked)

## Security Domain

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2/V3/V4/V6 | no | — |
| V5 Input validation | yes | Name length bounded at the input and again at commit and load (`slice(0, MAX)` at save and loader). Names are stored as JSON and rendered as text |
| V7 Error messages | yes, unchanged | No new copy; `shell-error-copy-no-internals` and `gui09-setups-copy` stay green |

| Pattern | STRIDE | Mitigation |
|---------|--------|-----------|
| Oversized name reaches the store if the listener is bypassed | Tampering | Commit-time and load-time slices kept (A3) |
| A check that cannot go red | Repudiation of the gate | Plants on a green baseline; ZERO-derivation failure |
| A locked check edited without approval | Repudiation | `phase-gate.py` plus Chris's re-lock (C2) |

## Sources

### Primary (HIGH: read or run this session)
- Code: `theia/extensions/modes/src/browser/mode-service.ts` (`:44-50, 71-72, 194, 240-241, 325-360, 436-452`), `setups-service.ts` (`:73-74, 149-152, 322, 452-453, 570-584`), `organising-widget.ts:998-1025`, `group-model.ts:30, 405-412`, `mode-descriptors.ts:1-30`, `chrome-bar/src/browser/chrome-bar-widget.tsx:824-925`, `chrome-bar-frontend-module.ts:40-62`, `tab-strip-widget.tsx:20-40`.
- Stock: `@theia/core@1.76.0` `quick-pick-service.d.ts:118-200, 250-258`, `application-shell.js:205-215, 748-758, 1428-1446, 2074-2095`, `side-panel-handler.js:330-345, 494-508`, `side-panel-handler.d.ts:71, 278`, `application-shell.d.ts:126`, `split-panels.js:95-110`. Also `@theia/monaco/lib/browser/monaco-quick-input-service.js:315-355`, and Monaco `quickInput.js:905-990`, `quickInputController.js:505-562` and `quickInputBox.js:19`.
- Scripts: `verify-mode-switch-tabs-invariant.mjs` (`:25-40, 100-160, 223-232, 330-418, 455-470`), `verify-ng-029-setup-restore-mode.mjs:10-22`, `verify-ng-035-custom-mode-layout.mjs:20-92, 140-156`, `verify-ng-036-setup-dock-layout.mjs:104-118`, `verify-gui09-setups-copy.mjs:53-97, 236-246`, `verify-shell-error-copy.mjs:522, 570-584`, `verify-setup-roundtrip.mjs:66, 258-266`, `verify-gui08-panorama-copy.mjs:236-263`, `verify-planning-paths.mjs:1-30`, `phase-gate.py:100-165`, `pb-relaunch.mjs:103-138`, `verify-platform.sh` (labels as cited).
- Records: `14-UI-SPEC.md` (headings; `:16, 22-24, 125, 195-206, 220, 255-275, 316, 348, 360, 367`), `14.1.1-UAT.md` (`:148-162, 266-280, 357-372, 509-530, 680-696, 800-840, 931-941`), `14-UAT.md` (`:1-42, 81-92`, gap status lines), `GUI-DEFECTS.md:1-30`, `v1.3-REQUIREMENTS.md:36-44, 155-159`, `v1.3-ROADMAP.md:82-90`, `13-SPIKE-STRIP-RELOCATION.md:16`, `PROJECT.md:169-175, 262-274`, `ROADMAP.md:1-14, 290-335`, `REQUIREMENTS.md:70-115, 153-157`, `MANIFEST.md`, sketch 005 `index.html:113, 155-166`, sketch 002/003 transitions, `inventory/brand-tokens.json:1-12`, `verification-report.md` template, `14.1.1-VERIFICATION.md` frontmatter, 23-CONTEXT, 23-UI-SPEC, the sketch-findings skill.
- Runs: `ledger-report.py --root .`; `phase-gate.py --root .` (exit 0, no output); `gsd-tools query verification.fingerprint` on the archived Phase 14 dir; `git log -1` for `539ba36` and `d5b8dc1`; `git status`; `node -v`, `python3 --version`, `command -v nix`.

### Secondary (MEDIUM)
- The 2026-10-17 decision brief (the report given to this agent) covers claims not re-run here: the sketch token check, superseded-truth IDs, the `CONCERNS.md` note, and the v1.3 audit snapshot lines.

### Not used
- The codebase-memory graph. This agent had no loader for the deferred graph tools. Every caller claim rests on `grep` plus reading the call sites.

## Metadata

**Confidence breakdown:**
- Code and record facts: HIGH. Re-read at `02ce825`; Phase 22 will move `theia/` lines.
- MODE-02 mechanism: HIGH from source, not run (A8).
- Check designs and plants: MEDIUM.
- ng-035/036 lock status: LOW (A1), resolved at the 23-02 precondition.
- Live DOM and reduced-motion details: LOW (A3, A4).

**Research date:** 2026-10-17
**Valid until:** Phase 22 lands (it edits `organising-widget.ts` and possibly the strip code); re-read the cited `theia/` lines then.
