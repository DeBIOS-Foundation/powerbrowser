# Roadmap: Power Browser

## Milestones

- ✅ **v1.0 PowerBrowser** — Phases 1–7 (shipped 2026-09-04, override closeout — see `.planning/milestones/v1.0-ROADMAP.md`)
- ✅ **v1.1 Hardening and SQL Tabs** — Phases 08–09 (shipped 2026-09-05, hardening-only — see `.planning/milestones/v1.1-ROADMAP.md`)
- ✅ **v1.2 Sign-off Closeout and SQL Store** — Phases 10–12 (shipped 2026-09-05, override closeout — see `.planning/milestones/v1.2-ROADMAP.md`)
- ✅ **v1.3 Browser GUI** — Phases 13–15, inserted 14.1 and 14.1.1, retired 16 (shipped 2026-09-06, verifications deferred — see `.planning/milestones/v1.3-ROADMAP.md`)
- 🔄 **v1.4 Platform Updates and GUI Close-out** — Phases 17–25 (active: OpenCode removal, Firefox 153.5.0esr, Theia 1.76.0 with React 19 on Node 24, non-GUI gaps, then the v1.3 GUI leftovers one step at a time until the commit gate and CI are green)
- 📋 **v1.5 Coding Workbench Layout** — sketch 005's VS Code layout for Coding mode, all four changes: one title row, centred address box, right cluster of layout toggles, activity icons across the top of the sidebar (SK-01, adopted 2026-10-17; Browsing and Organising unchanged)
- 📋 **Future** — GUI-05 unified tab strip, W6 canvas search, release and distribution (backlog 999.2), deferred seeds (bookmarks strip, per-tab close/mute, browser menu, gui-component-dnd, firefox-parity-tabs) (v1.5+)

## Phases

<details>
<summary>✅ v1.0 PowerBrowser (Phases 1–7) — SHIPPED 2026-09-04</summary>

- [x] Phase 1: Platform Extraction and Rename (21/21 plans)
- [x] Phase 2: Configuration Manifest and Generator Core (9/9 plans)
- [x] Phase 3: Firefox Branding Emitter and Icon Pipeline (4/4 plans)
- [x] Phase 4: Theia Surface — Branding, Extensions, Telemetry (4/4 plans)
- [x] Phase 5: Hook-Only Patches and Upstream Uptake (4/4 plans)
- [x] Phase 6: Two-Layer Verification and Rebranding Docs (6/6 plans)
- [x] Phase 7: Sourcerer as Downstream (4/4 plans)

Archive: `.planning/milestones/v1.0-ROADMAP.md` · Requirements: `.planning/milestones/v1.0-REQUIREMENTS.md` · Tag: `v1.0`

</details>

<details>
<summary>✅ v1.1 Hardening and SQL Tabs (Phases 08–09) — SHIPPED 2026-09-05</summary>

- [x] Phase 08: Installer Hardening + Canonical Rename (5/5 plans)
- [x] Phase 09: Extensions + Crash Pipeline (4/4 plans)

Archive: `.planning/milestones/v1.1-ROADMAP.md` · Requirements: `.planning/milestones/v1.1-REQUIREMENTS.md` · Audit: `.planning/milestones/v1.1-MILESTONE-AUDIT.md` · Tag: `v1.1`

</details>

<details>
<summary>✅ v1.2 Sign-off Closeout and SQL Store (Phases 10–12) — SHIPPED 2026-09-05</summary>

- [x] Phase 10: Sign-off Closeout (3/3 plans) — completed 2026-09-05
- [x] Phase 11: SQL Store Design (3/3 plans) — completed 2026-09-05
- [x] Phase 12: SQL Store Build (3/3 plans) — completed 2026-09-05

Archive: `.planning/milestones/v1.2-ROADMAP.md` · Requirements: `.planning/milestones/v1.2-REQUIREMENTS.md` · Audit: `.planning/milestones/v1.2-MILESTONE-AUDIT.md` · Tag: `v1.2`

</details>

<details>
<summary>✅ v1.3 Browser GUI (Phases 13–16) — SHIPPED 2026-09-06</summary>

- [x] Phase 13: Chrome Bar + Strip-Relocation Spike (5/5 plans, 13-04 and 13-05 gap closure) — completed 2026-09-06
- [x] Phase 14: Modes + Windows & Setups (4/5 plans; 14-05's code landed in d5b8dc1, its two checks were never written — gap G-14.1.1-10, closed by Phase 20 PLAT-02) — completed 2026-09-06
- [x] Phase 14.1: In-Theia Web Tabs (GUI-02) (INSERTED) (3/3 plans) — "+" opens a web tab inside the Theia shell's own tab strip
- [x] Phase 14.1.1: GUI Conformance Sweep (INSERTED) (16/16 plans, three passes) — every `fixable: yes` gap in `14.1.1-UAT.md` closed with a check that goes red without its fix
- [x] Phase 15: Panorama Organising (3/3 plans) — completed 2026-09-06
- [x] Phase 16: AI backend adapter - OpenCode (3/3 plans) — Retired 2026-09-28; code removed in Phase 17 (RM-01)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 13. Chrome Bar + Strip-Relocation Spike | 5/5 | Complete | 2026-09-06 |
| 14. Modes + Windows & Setups | 3/3 | Complete | 2026-09-06 |
| 15. Panorama Organising | 3/3 | Complete | 2026-09-06 |

Phase 16 record: Retired 2026-09-28 under D2 (b): NG-041..NG-050 and NG-052..NG-062 are
dropped — the opencode adapter is retired for the PowerBrowser-Assistant
plugin, which is planned outside this tree. The adapter cuts fall with the
same decision (selectable `@Pi` / DSH backends, per-line comment-to-steer,
`/btw` ephemeral question, file-wide Supercomplete Tab-accept). Chris:
"Run them for me" (ledger/history/log.jsonl lines 310–330, one drop op per
row, each carrying that answer as its quote). NG-051
(`backend = "off"` starts no opencode process and no `/mcp` endpoint) was kept and built, then
dropped 2026-10-17 (c3929e9) when Phase 17 removed the adapter.
Goal (was): selectable `@OpenCode` backend in sidecar chat with staged
accept/reject review. Requirements (was): AI-01..AI-05, removed in v1.4.
Plans 16-01, 16-02, 16-03 executed.

Archive: `.planning/milestones/v1.3-ROADMAP.md` · Requirements: `.planning/milestones/v1.3-REQUIREMENTS.md` · Audit: `.planning/milestones/v1.3-MILESTONE-AUDIT.md` · Phase directories: `.planning/milestones/v1.3-phases/` · Tag: `v1.3`. The v1.3 archive predates Phases 14.1 and 14.1.1; their full detail sections are in their phase directories and in `git show 41caf8f:.planning/ROADMAP.md`.

</details>

### 🔄 v1.4 Platform Updates and GUI Close-out

Non-GUI first (17–20), then GUI one step at a
time (21–25) (Chris, 2026-10-15). One upstream per phase, each followed by a verify run.
Research needed at planning: Phases 19 and 22. Phases that wait on Chris's decisions or
ledger approvals: 17 (NG-051), 19 (NG-082, telemetry), 20 (schema v3/v4 rows), 22 (Panorama
decisions 1 and 2), 23 (G-23, G-32, sketch 005, G-11 live confirmation), 24 (NG-084 text, the
live UAT itself).

- [x] **Phase 17: OpenCode Removal** - The OpenCode adapter, its `[ai]` manifest path, its checks and its docs leave the tree; NG-051 amended (completed 2026-10-17)
- [x] **Phase 18: Firefox 153.5.0esr** - Gecko re-pinned to `FIREFOX_153_5_0esr_BUILD1`; dev and release builds and the full verification run pass (completed 2026-10-16)
- [x] **Phase 19: Node 24, React 19, Theia 1.76.0** - Three commits, each checked live; Theia's AI framework runs stock; NG-082 amended (completed 2026-10-17)
- [x] **Phase 20: Non-GUI Gaps** - Clean-checkout build, group-channel check, schema ledger rows, `generate-check`, archived phase paths (completed 2026-10-17)
- [x] **Phase 21: Panorama Spec and gui08 Checks** - 15-UI-SPEC re-pinned to the shipped Panorama; the commit gate is green (completed 2026-10-17)
- [ ] **Phase 22: Panorama Worklist** - Strip filtered by the active group, Undo Close Group, per-card close, last group kept
- [x] **Phase 23: Modes Leftovers and Sketch 005 Verdict** - Variant B records, name cap, panel slide, 14-VERIFICATION, sketch 005 decided (completed 2026-10-18)
- [ ] **Phase 24: Live UAT Pass** - Every open UAT sheet run live with no pending result, React 19 line included (NG-084)
- [ ] **Phase 25: CI Green on Main** - CI passes on the pushed `main` (NG-074)

## Phase Details

### Phase 17: OpenCode Removal

**Goal**: The tree carries no OpenCode adapter, so every later install, re-pin and clean build runs on the final workspace member set
**Depends on**: Nothing in v1.4 (first phase; v1.3 shipped, Phase 16 retired)
**Requirements**: RM-01
**Needs Chris**: the NG-051 ledger amend (drop or supersede, re-lock without `verify-ng-051-backend-off.mjs`), approved before the removal commit
**Success Criteria** (what must be TRUE):

  1. `git ls-files` lists no `theia/extensions/backend-opencode`, no `[ai]` key in `configuration.toml`, no `ai.backend` schema entry, no `emitAiBackend`, none of the four OpenCode/NG-051 verify scripts and none of their registry rows; `docs/REBRANDING.md` has no `[ai]` section
  2. `node scripts/generate.mjs --check` reports 53 targets
  3. On a working tree with the ignored leftovers removed (`lib/`, the workspace symlink, `generated/ai-backend.json`), `yarn install --frozen-lockfile` passes on the committed lockfile, which no longer contains `@agentclientprotocol/sdk`, and `scripts/verify-platform.sh --quick` shows no FAIL row beyond the four `gui08` rows; `quick-baseline.txt` is refreshed
  4. The NG-051 amend is in the ledger with Chris's approval, recorded before the removal commit; no live planning record lists AI-01..05 as a requirement; the 12 `@theia/ai-*` packages are still composed

**Plans**: 4/4 plans complete (split by removal set to stay under `size-gate.py`; sequential, one fix at a time)

Plans:
**Wave 1**

- [x] 17-01-PLAN.md — tracer: workspace set (adapter directory, `build:extensions` clause, env-allowlist entry, regenerated lock); frozen install on a fresh manifest copy

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 17-02-PLAN.md — registry and manifest sets in one commit (the removal SHA): four scripts, registry rows, `[ai]`, schema key, emitter, REBRANDING section; 53 targets

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 17-03-PLAN.md — live planning records: codebase map, the roadmap's NG-051 sentence, superseded banners

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 17-04-PLAN.md — R33 quick baseline from a measured run, full success-criteria sweep, then Chris's re-lock (blocking-human) and the ledger commit

### Phase 18: Firefox 153.5.0esr

**Goal**: PowerBrowser builds on Gecko 153.5.0esr and passes the full verification run on both build variants
**Depends on**: Phase 17 (independent of Theia; runs before Phase 19 so the live sidecar check uses the final Gecko)
**Requirements**: UPD-05, UPD-06
**Success Criteria** (what must be TRUE):

  1. `configuration.toml` pins `FIREFOX_153_5_0esr_BUILD1`; `docs/BUILD.md` records commit `223014c6b9299ac9b035b4c50ea481e5c6de282c`; `.github/workflows/rebase-upstream.yml` mirrors the pin; the `fetch-upstream.sh` tag comment no longer claims `_BUILD1` and `_RELEASE` always share a commit; the run-together line at `configuration.toml:104` is split
  2. The four patches replay through `rebase-upstream.sh` with `patches/` byte-unchanged, and `smoke-firefox.sh` reports a version read from the tree rather than a hard-coded `153.1.0esr`
  3. The dev objdir and `objdir-release` both build at 153.5, and both binaries report 153.5.0esr
  4. A full `scripts/verify-platform.sh` run passes, with the `mar-update-hop` evidence labelled pre-153.5

**Plans**: 3/3 plans complete (two Gecko builds, about 50 and 55 minutes; `rebase-upstream.yml` is recorded as unexercised, never cited as proof)

Plans:
**Wave 1**

- [x] 18-01-PLAN.md — 153.1 full-run FAIL baseline before any change; fetch-upstream tag comment and `configuration.toml:104` corrected

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 18-02-PLAN.md — tracer: pin `FIREFOX_153_5_0esr_BUILD1`, replay, clobbered dev build, tree-derived smoke version; package, docs and README

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 18-03-PLAN.md — release build at 153.5; full run compared with the 153.1 baseline (criterion-4 reading)

### Phase 19: Node 24, React 19, Theia 1.76.0

**Goal**: The sidecar runs Theia 1.76.0 with React 19 on Node 24, with Theia's AI framework as upstream ships it, and each step is checked live before the next
**Depends on**: Phase 18 (the live sidecar check runs against the final Gecko)
**Requirements**: RM-02, UPD-07, UPD-08, UPD-09, UPD-10
**Needs Chris**: dropping the 1.75.0 row NG-082 in his own terminal (CONTEXT 2026-10-17: "Drop it, add a new row"), then re-locking the check hashes once NG-086 is closed; the `telemetry.telemetryLevel` collision decision, taken at the live check
**Research**: yes — runtime behaviour at 1.76 / React 19 is unverified (which telemetry schema wins, `view:` factory ids, `pagehide` persistence, dependent-window theme)
**Success Criteria** (what must be TRUE):

  1. Three commits land in order, each followed by `--quick` and a live sidecar start: Node 24 (only `flake.nix` changed, `flake.lock` byte-unchanged, `nix develop .#theia` reports Node 24); React 19.2.8 at Theia 1.74.1; Theia 1.76.0
  2. Every `@theia/*` package except `@theia/monaco-editor-core` is 1.76.0 and `diff-theia-core.sh` passes; a new `--quick` row finds exactly one installed copy each of react, react-dom, `@types/react`, `@types/react-dom` and inversify, and its self-test goes red naming the package when a duplicate is planted
  3. A live sidecar on a fresh config dir and on a carried-over one opens only the PowerBrowser welcome (no Theia Welcome page), opens `view:` URIs, and passes the `side02-token-*` rows live
  4. `@powerbrowser/branding` contains neither D-22 override, and the 12 `@theia/ai-*` packages are composed at 1.76.0 and unmodified
  5. The NG-082 amend and Chris's telemetry decision are recorded, and `quick-baseline.txt` is refreshed

**Plans**: 8/8 plans complete (checks first, then the three locked commits, then live proof and the ledger close; sequential, one fix at a time)

Plans:
- [x] 19-08-PLAN.md

**Wave 1**

- [x] 19-01-PLAN.md — tracer: live first-boot surface check (fresh and carried-over modes, self-test), carried-over fixture captured on the pristine tree, both modes green at baseline

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 19-02-PLAN.md — single-copy `--quick` row (UPD-08), the NG-086 check file, gui07 upstream-perspective accounting

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 19-03-PLAN.md — commit 1: Node 24 (`flake.nix` only), drivelist rebuilt, live start

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 19-04-PLAN.md — package-legitimacy checkpoint (blocking-human), commit 2: React 19.2.8 at 1.74.1, frozen reinstall, live N1/N2/N4

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 19-05-PLAN.md — NG-082 removal precondition (Chris), NG-086 added and recorded red, commit 3: Theia 1.76.0 with RM-02, startup-editor default and telemetry `initSchema`

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 19-06-PLAN.md — frozen reinstall, first boot both modes, visual backstops, full run with owned FAIL set, R33 baseline, docs

**Wave 7** *(blocked on Wave 6 completion)*

- [x] 19-07-PLAN.md — NG-086 closed with evidence; Chris's re-lock and telemetry acknowledgement (blocking-human)

### Phase 20: Non-GUI Gaps

**Goal**: The remaining non-GUI gaps are closed on the final dependency set, each by a check that can go red or by a recorded result
**Depends on**: Phase 19 (the clean-checkout build must run on the final dependency set)
**Requirements**: PLAT-01, PLAT-02, PLAT-03, PLAT-04, PLAT-05
**Needs Chris**: the schema v3/v4 ledger rows (PLAT-03), approved through `ledger-amend.py`
**Success Criteria** (what must be TRUE):

  1. A build from a clean checkout (a fresh clone or a quiet tree) passes, including `yarn build:extensions` (G-14.1.1-9)
  2. A `--quick` group-channel row exists, and its self-test goes red on each planted fault (G-14.1.1-10)
  3. The schema v3/v4 work has ledger rows carrying Chris's approval, and the ledger checksums pass
  4. `generate-check` is closed as not reproducible with the passing runs recorded (host shell and `.#theia`), or it is reproduced and fixed
  5. Every verify-script path into `.planning/phases/` resolves to its archived location, or the check fails naming the missing path

**Plans**: 5/5 plans complete (sequential, one wave each; also adds the `-purgecaches` line to `docs/BUILD.md`)

Plans:

**Wave 1**

- [x] 20-01-PLAN.md — PLAT-04: generator concurrency reproduced and fixed (inkscape off the session bus; fixture harness never writes `generated/`), passing runs recorded in both shells before and after

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 20-02-PLAN.md — PLAT-05: derived `planning-paths` `--quick` row, five live-phase literals repointed to the archive with their fallbacks deleted

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 20-03-PLAN.md — PLAT-02: `group-channel` `--quick` row (D0-D6) and its 12-plant self-test; G-14.1.1-10 closed

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 20-04-PLAN.md — PLAT-03: NG-087 / NG-088 checks, Chris accepts the row texts (blocking-human), rows added, recorded red against `b9412fa`, closed

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 20-05-PLAN.md — PLAT-01: full-tier `theia-fresh-clone-build` row PASS at the final code HEAD with a 3-plant self-test; G-14.1.1-9 closed; `-purgecaches` in BUILD.md; Chris's re-lock (blocking-human)

### Phase 21: Panorama Spec and gui08 Checks

**Goal**: The Panorama spec describes the design that shipped, the checks derived from it pass, and the commit gate is green
**Depends on**: Phase 20 (GUI work starts after the non-GUI half, so Theia selectors are re-verified at 1.76 only once)
**Requirements**: PAN-01, PAN-07
**Success Criteria** (what must be TRUE):

  1. 15-UI-SPEC describes the shipped Panorama redesign (commit `7b7a1f7`): its canvas geometry and the reviewed "Expand" / "Done" copy
  2. `verify-gui08-canvas-geometry` and `verify-gui08-panorama-copy` derive their expectations from 15-UI-SPEC, pass, and go red when a fault is planted
  3. `scripts/verify-platform.sh --quick` reports no FAIL row, and `quick-baseline.txt` is empty
  4. No stale tray code, comments or CSS remain, and the canvas still shows ungrouped tabs as loose cards

**Plans**: 5/5 plans complete in 3 waves (waves 1 and 2 each run two file-disjoint plans in parallel; execution starts after Phase 20 completes)
**UI hint**: yes

Plans:

**Wave 1**

- [x] 21-01-PLAN.md — PAN-01: 15-UI-SPEC re-pinned to `7b7a1f7` in a parseable form, with one shared parse module (`scripts/lib/ui-spec.mjs`) proven equal to the tree
- [x] 21-02-PLAN.md — PAN-07: dead card-onto-card path and GroupModel auto-box write removed; tray wording gone from comments and locals outside modes.css; wave-1 `--quick`

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 21-03-PLAN.md — PAN-01: `gui08-panorama-copy` derives contract and retired copy from 15-UI-SPEC; 9-plant self-test
- [x] 21-04-PLAN.md — PAN-01, PAN-07: `gui08-canvas-geometry` derives geometry and type from 15-UI-SPEC with a tray negation; tray CSS removed, loose cards with zero groups, loose and expanded cards in the focus scope, heading at 400; 12-plant self-test; wave-2 `--quick`

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 21-05-PLAN.md — PAN-01, PAN-07: full-tier `gui08-loose-cards-live` row PASS on a rebuilt sidecar with in-run probe controls; `--quick` green; `quick-baseline.txt` derived empty

### Phase 22: Panorama Worklist

**Goal**: The user organises tabs by group from both the strip and the canvas: the strip follows the active group, a closed group can be restored, a card closes in place, and one group always remains
**Depends on**: Phase 21 (W4 edits the copy contract that Phase 21 re-pins)
**Requirements**: PAN-02, PAN-03, PAN-04, PAN-05, PAN-06
**Needs Chris**: Panorama decision 1 (every tab in a group, or unassigned tabs allowed) and decision 2 (strip filter in Browsing only, or in every mode), recorded before planning
**Research**: yes — W1 needs a shared frontend group-membership reader; W4 touches the chrome-side writer `closeGroupRows`
**Success Criteria** (what must be TRUE):

  1. Chris's Panorama decisions 1 and 2 are recorded before any worklist code is written
  2. The tab strip shows only the active group's tabs in the modes that decision 2 names, and a tab opened with "+" appears in the strip as a member of the active group (W1 and W2 ship in one change)
  3. User can close a group and restore it with Undo Close Group; the spec copy and both `gui08` checks change in the same commit and pass (W4)
  4. User can close a card from the card itself (W5)
  5. User cannot close the last remaining group (W11, first part)

**Plans**: 7/7 plans executed in 7 waves (sequential: every plan shares group-model.ts, organising-widget.ts or 15-UI-SPEC; each owns its wave's `--quick`)

Plans:

- [x] 22-01-PLAN.md — PAN-02, PAN-03: the model loads itself; the Browsing strip shows the active group's tabs, loose tabs and the current tab; "+" joins the active group; 15-UI-SPEC amended in the same commit; `pan03-strip-group-live`; Chris's copy review for the whole phase (blocking-human)
- [x] 22-02-PLAN.md — the held Phase 21 copy (empty-canvas body, WR-05 strings, zoom readout) as Chris worded it; the copy check derives from every text sink
- [x] 22-03-PLAN.md — PAN-04 mechanism: the 15 s undo window on the model, commit by timer or quit through the unchanged `closeGroupRows`, hidden in every tab bar; `pan04-undo-close-group-live`
- [x] 22-04-PLAN.md — PAN-04 UI: Undo Close Group replaces the dialog; spec copy and the gui08 checks in one commit (SC3); ng-006 through the window; Chris's re-lock of the check hashes (blocking-human)
- [x] 22-05-PLAN.md — PAN-06: the last remaining group has no close control and the command ignores it
- [x] 22-06-PLAN.md — PAN-05: card × and Delete close the tab through its own close path; `pan05-card-close-live`
- [x] 22-07-PLAN.md — full suite on one rebuilt sidecar, derived FAIL set, provenance, `--quick`, the end-of-phase review for Chris

**UI hint**: yes

### Phase 23: Modes Leftovers and Sketch 005 Verdict

**Goal**: The Phase 14 / 14.1.1 leftovers are closed with records that match the shipped behaviour, and the sketch 005 verdict fixes the layout that UAT will test
**Depends on**: Phase 22
**Requirements**: MODE-01, MODE-02, MODE-03, MODE-04, SK-01
**Needs Chris**: G-23 decided 2026-10-17 (cut at 60 while typing, MODE-02); SK-01 decided 2026-10-17 (adopt all into v1.5 Coding Workbench Layout; name confirmed by Chris 2026-10-19); G-32 chosen by Chris 2026-10-18: a (instant, spec amended; MODE-03); open: live confirmation of the strip relocation (G-11, MODE-01), handed to the Phase 24 session
**Success Criteria** (what must be TRUE):

  1. The Variant B records are current (UAT entry, GUI-DEFECTS item 2, GUI-07 box, `mode-descriptors.ts` comment, 14-UAT test 3), and Chris has confirmed the strip relocation live (G-11)
  2. A mode or setup name longer than 60 characters behaves as Chris decided (refused at the input, or cut at the cap), and 14-UI-SPEC states that rule (G-23)
  3. Side panels slide (200 ms or less, with a reduced-motion fallback) or switch instantly, as Chris decided, and 14-UI-SPEC describes what the user sees (G-32)
  4. `14-VERIFICATION.md` exists
  5. Sketch 005 is committed with a MANIFEST row, and Chris's verdict (adopt into a named later milestone, or reject) is recorded before Phase 24 starts

**Plans**: 5/5 plans complete in 4 waves (wave 1 runs two file-disjoint plans in parallel; execution starts after Phase 22 completes)
**UI hint**: yes

Plans:

**Wave 1**

- [x] 23-02-PLAN.md — MODE-02: Save as Mode and Save Setup cut names at 60 while typing (stock `createInputBox()`), 14-UI-SPEC states the rule, `modes-name-cap-at-input` with plants plus a live row, ng-035/036 answer the real input, wave-1 `--quick`, Chris's re-lock if those check files are locked (blocking-human)
- [x] 23-04-PLAN.md — SK-01: sketch 005 committed with its MANIFEST row and the adopt-into-v1.5 verdict; the G-32 options put to Chris with no recommendation (blocking-human); the v1.5 milestone and the mode-or-setup-name wording recorded

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 23-03-PLAN.md — MODE-03: Chris's G-32 choice applied to code and 14-UI-SPEC in one commit, `modes-panel-motion` with branch plants, a live motion row under a slide, wave-2 `--quick`

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 23-01-PLAN.md — MODE-01 (and the record halves of MODE-02, MODE-03): the five Variant B records current with the G-11 hand-off to Phase 24; G-23 and G-32 closed on the 23-02 and 23-03 commits; UAT summaries recounted; wave-3 `--quick`

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 23-05-PLAN.md — MODE-04: retroactive 14-VERIFICATION with a seam digest; the phase's closing gate

### Phase 24: Live UAT Pass

**Goal**: Chris has tested every shipped GUI surface live on the final stack, and no UAT result is left pending (NG-084)
**Depends on**: Phase 23 (runs after every GUI change and after React 19, so it runs once)
**Requirements**: UAT-01
**Needs Chris**: runs the UAT live; approves the widened NG-084 text through `ledger-amend.py`
**Success Criteria** (what must be TRUE):

  1. A Phase 15 UAT sheet exists and has been run
  2. The 10, 13, 14, 14.1, 14.1.1 and 15 UAT sheets have no `pending` result
  3. The sheets carry a React 19 runtime line with a recorded result
  4. The widened NG-084 text is approved and recorded in the ledger

**Plans**: 3/6 plans executed in 5 waves (wave 1 runs two file-disjoint plans in parallel; waves 2 to 5 each stop for Chris)

Plans:

**Wave 1**

- [x] 24-01-PLAN.md — NG-089 check (`ng089-uat-sheets`, plant self-test, two registry rows), Chris's removal of NG-084 with his own quote (blocking-human), NG-089 added with its recorded failing run
- [x] 24-02-PLAN.md — the Phase 15 UAT sheet (47 pending tests, React 19 first); a React 19 runtime test on sheets 10, 13, 14, 14.1 and 14.1.1; superseded expectations annotated; Summaries recounted

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 24-03-PLAN.md — the ordered UAT script (sessions D, A, T, O, B, C, X with an item-to-row map and a terse reply format); the desk session (blocking-human); Chris's rulings, routes and any name recorded verbatim

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 24-04-PLAN.md — sidecar rebuilt and proven on PB_VERIFY_PORT 3939, build recorded on the six sheets, throwaway profile and fixtures; Launch A and B run by Chris (blocking-human); his results recorded verbatim with gaps

**Wave 4** *(blocked on Wave 3 completion)*

- [ ] 24-05-PLAN.md — the GEN-05 fixture drill (10/4) and the 10/5 carry-test report (blocking-human); tree restored byte for byte, sidecar rebuilt, `--quick` green

**Wave 5** *(blocked on Wave 4 completion)*

- [ ] 24-06-PLAN.md — sheets closed and recounted, G-11 records if Chris passed it, NG-089 done on a green check, Chris's lock of the check hashes (blocking-human), gates clean

### Phase 25: CI Green on Main

**Goal**: CI passes on the pushed `main`, which is the milestone's exit gate (NG-074)
**Depends on**: Phase 24
**Requirements**: CI-01
**Success Criteria** (what must be TRUE):

  1. `main` is pushed, with no local commit ahead of `origin/main`
  2. The CI verify workflow run on the pushed head commit concludes `success`, with no check excluded by name
  3. NG-074 is marked done in the ledger with that run's URL

**Plans**: TBD (CI is expected to go green once Phase 21 lands and `main` is pushed; this phase confirms it)

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 17. OpenCode Removal | 4/4 | Complete    | 2026-10-17 |
| 18. Firefox 153.5.0esr | 3/3 | Complete    | 2026-10-16 |
| 19. Node 24, React 19, Theia 1.76.0 | 8/8 | Complete    | 2026-10-17 |
| 20. Non-GUI Gaps | 5/5 | Complete    | 2026-10-17 |
| 21. Panorama Spec and gui08 Checks | 5/5 | Complete    | 2026-10-17 |
| 22. Panorama Worklist | 7/7 | In Progress | - |
| 23. Modes Leftovers and Sketch 005 Verdict | 5/5 | Complete    | 2026-10-18 |
| 24. Live UAT Pass | 3/6 | In Progress | - |
| 25. CI Green on Main | 0/TBD | Not started | - |

## Hard constraints (every phase)

- Never fork or patch Theia core — `@powerbrowser/*` extensions only; never modify Gecko outside the patch stack (hook-only patches)
- One verification driver `scripts/verify-platform.sh` — new checks land as registry rows with `--self-test`, never sibling drivers
- Single chrome-side SQLite writer; sessionstore stays restore authority; groups never sessionstore-coupled
- No `[features]`/`[modes]` manifest flags — modes are data with shipped defaults

## Inherited network egress (carried through the migration, not decided here)

The imported platform allows exactly three Mozilla hosts, all one feature —
Remote Settings, which cannot be disabled without also losing CRLite
certificate revocation, intermediate certificate preloading, and
tracking-protection updates: **firefox.settings.services.mozilla.com**,
**content-signature-2.cdn.mozilla.net**, and
**firefox-settings-attachments.cdn.mozilla.net**. They are named here and in
REQUIREMENTS.md because `verify-platform.sh`'s `allowlist-doc-consistency`
check requires every allow-dispositioned Mozilla host to be documented in this
project's own planning record rather than only inside the allowlist file — an
allow entry nobody had to write down is one nobody has to defend. Repointing
them per a downstream's manifest is Phase 4's TEL-03.

---

## Backlog

### Phase 999.1: SQL-browser-memory (BACKLOG)

**Goal:** [Captured for future planning]
**Requirements:** TBD
**Plans:** 0 plans

Make every tab a SQL row, alongside bookmarks, sessions, and anything else that
can live in SQL.

**Not Databasise.** Databasise is a separate project and will not be in Power
Browser. The out-of-scope line naming Databasise says nothing about whether
this item is in scope — the two were conflated once and must not be again.

**The seam that already exists.** `TabUriRegistry` gives tabs stable URI
identity (the GUI-04 declared bridge interface). Stable tab identity is the
property this would build on, and most browsers do not have it.

**Three migrations, not one:**

- Bookmarks / history — already SQL upstream (`places.sqlite`); expose and
  extend rather than build

- Sessions — `sessionstore` is compressed JSON, not SQL
- Theia workbench layout — separate again
- Tabs — the only layer where the schema would be net-new

**Boundary to respect if this is ever planned:** ARCHITECTURE.md Anti-Pattern 6
— if a downstream needs to change platform behaviour, the platform needs an
extension point; adding a `[features]` flag is the bug, not the fix.

Plans:

- [ ] TBD (promote with /gsd-review-backlog when ready)

### Phase 999.2: Release and distribution (BACKLOG)

Deferred here 2026-09-25 under D4 (a): NG-075..NG-082 (distribution work
that needs hosts, accounts or long builds outside this machine: Windows
MSIX, macOS DMG, install matrix and per-OS MAR hop, release pipeline,
update host, production crash-ingest host, per-fixture builds, Theia re-pin
to 1.75.0). Deferred here 2026-09-28: NG-074 (CI verify on main) and NG-084
(the five v1.2 human UAT sheets) move to Phase 15. Chris: "Run them for me"
for NG-075..NG-082 (ledger/history/log.jsonl lines 332–339) and "Defer all
the checks" for NG-074 and NG-084 (ledger/history/log.jsonl lines 364 and
366), each op carrying the quoted answer.

**Goal:** [Captured for future planning]
**Requirements:** TBD
**Plans:** 0 plans

Plans:

- [ ] TBD (promote with /gsd-review-backlog when ready)
