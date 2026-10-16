# Project Research Summary

**Project:** Power Browser, milestone v1.4 Platform Updates and GUI Close-out
**Domain:** Version updates and close-out work on a rebrandable Gecko (patch-set) + Eclipse Theia sidecar browser platform. No new product features.
**Researched:** 2026-10-16, against `main` at `e9e29c1`
**Confidence:** HIGH for tree state, versions, tag/blob facts and the removal surface. MEDIUM for runtime behaviour at Theia 1.76 / React 19 / Node 24 (no sidecar started) and at Firefox 153.5 (no Gecko build run).

## Executive Summary

v1.4 is a maintenance-and-close-out milestone with two halves, ordered by Chris's rule: non-GUI first, then GUI one step at a time. The non-GUI half removes the retired OpenCode adapter, moves Gecko from 153.1.0esr to 153.5.0esr, and moves the sidecar from Theia 1.74.1 / React 18 / Node 22 to Theia 1.76.0 / React 19 / Node 24. The GUI half re-pins the Panorama spec to the shipped design (which turns the commit gate green), finishes the Panorama worklist and the Phase 14 / 14.1.1 leftovers, runs one live UAT pass, and closes on CI green on `main` (NG-074).

The upgrades are smaller than they look. All four Gecko patches apply unchanged: the five files they touch have identical blob SHAs at 153.1 and 153.5, so the patch files must not be edited. Node 24.19.0 is already in the locked nixpkgs, so only `flake.nix:20` changes and `nix flake update` must not be run. Every native module is N-API. No first-party extension uses a React 18-only API. The Theia 1.76 move has exactly one compile break (the D-22 AI-layout override in `@powerbrowser/branding`, which is deleted, not ported) and two runtime regressions that compile cleanly: Theia's own Welcome page returns through `@theia/ai-ide -> @theia/getting-started` (fix: default `workbench.startupEditor: "none"`), and `@theia/telemetry` now also registers `telemetry.telemetryLevel`.

The main risks are verification risks, not code risks. A green build hides a duplicate or mismatched React (yarn only warns on unmet peers). One Gecko build does not cover a full `verify-platform.sh` run, because the release objdir and stored MAR evidence are separate artefacts. OpenCode removal leaves ignored local state (`lib/`, a workspace symlink, `generated/ai-backend.json`) that turns local gates red while CI stays green. The commit gate stays red on the four `gui08` rows through the whole non-GUI half, so new reds can go unnoticed. Mitigations: one upstream per phase with a verify after each, live sidecar checks on a fresh config dir, a new single-copy React check, and a `quick-baseline.txt` refresh after phases 17 and 19.

## Key Findings

### Recommended Stack

Pin what upstream's CI ran, change one upstream at a time, and leave the Nix lock alone.

**Core technologies:**
- Firefox ESR `153.5.0esr` at commit `223014c6b9299ac9b035b4c50ea481e5c6de282c`: current ESR per product-details; patches replay unchanged.
- Eclipse Theia `1.76.0` (all `@theia/*` except `@theia/monaco-editor-core`, which stays `1.108.201`): npm `latest`; replaces NG-082's stale 1.75.0 target.
- React / ReactDOM `19.2.8`, `@types/react` `19.2.18`, `@types/react-dom` `19.2.7`: what Theia v1.76.0's own lockfile resolves. Not npm latest (19.3.1); the trial's 19.1.10 set is a proven fallback.
- Node.js `24.19.0` (`pkgs.nodejs_24` in the already-locked nixpkgs `ffb3c9b7`): Theia 1.75+ declares `node >=24` at the repo root. Published packages carry no `engines`, so this supersedes D-16 by choice.
- Unchanged: TypeScript `~5.9.3`, yarn classic `1.22.22`, inkscape `1.4.4` and rustc `1.97.1` from the locked nixpkgs.

**Change sites the trial missed:** `scripts/smoke-firefox.sh:41-42` hard-codes `153.1.0esr` (derive from `version_display.txt`); `workbench.startupEditor: "none"` in `theia/applications/browser/package.json`; `.github/workflows/rebase-upstream.yml:33` mirrors the pin.

### Expected Features

Here, "feature" means a v1.4 work item. Tree state was re-verified this session: `--quick` is 114 PASS / 4 FAIL (only the `gui08` rows), and the ledger has 85 rows (53 done, 10 deferred-approved, 22 dropped).

**Must have (table stakes):**
- OpenCode removal plus the NG-051 ledger amend
- Firefox 153.5 with full builds and a full `verify-platform.sh` run
- Theia 1.76.0 / React 19 / Node 24 plus the NG-082 amend, checked live
- G-9 clean-checkout build: the fix is in the tree; run it after the final install
- G-10 group-channel `--quick` row with a five-fault self-test
- Schema v3/v4 ledger rows, `quick-baseline.txt` refresh, close `generate-check` (not reproduced: it passes in the host shell and in `.#theia`)
- 15-UI-SPEC re-pinned to the shipped Panorama, with `gui08` checks derived from it (this unblocks NG-074)
- W1 strip filtered by the active group, which must ship with W2 (a "+" tab joins the active group); otherwise new tabs disappear from the strip
- W4 Undo Close Group (rewrites a copy contract and two checks), W5 per-card close
- G-11 ratify Variant B (the code shipped in `539ba36`; only the records are stale), G-23 name cap, G-32 decision, 14-VERIFICATION
- NG-084 live UAT (about 70 pending or issue results across six sheets; Phase 15 needs a UAT sheet first)
- Sketch 005 verdict recorded
- NG-074 CI green on pushed `main` (`main` is 4 commits ahead of `origin`)

**Should have (optional in v1.4):**
- W11 last-group unclosable (cheap; becomes required if Panorama decision 1 is "every tab in a group"); group-cycling keys
- G-32 option (a), an authored 200 ms panel slide

**Defer (v1.5+):**
- W6 type-anywhere search (PROJECT.md:271 lists it as v1.5+; the handoff lists it in v1.4; this needs Chris's call)
- Sketch 005 implementation (a milestone of its own), W12 polish
- DSH and any AI assistant work (separate project); release work NG-075..081 (backlog 999.2)

### Architecture Approach

Nothing in v1.4 changes the platform's shape. Removing OpenCode deletes the `[ai]` manifest path (`configuration.toml [ai]` -> `config-schema.json ai.backend` -> `generate.mjs emitAiBackend` -> `generated/ai-backend.json` -> `powerbrowserAiBackend`) and the registry's only manifest-dependent branch (`adapter_composed`). The removal falls into four atomic sets, and each set is green only as a whole. The 12 upstream `@theia/ai-*` packages are a separate surface, independent of OpenCode, and stay unless Chris decides otherwise.

**Major components touched:**
1. Manifest set: `configuration.toml [ai]`, schema key, emitter and TARGETS row, REBRANDING.md section. Generated targets go from 54 to 53; byte-identity comparands stay at 33.
2. Workspace set: `git rm -r` **and** `rm -rf` the extension directory, the `build:extensions` clause, `yarn install` (the lock loses `@agentclientprotocol/sdk`), the hand-kept `EXPECTED_ENV_TOUCHERS` entry, and the `powerbrowserAiBackend` key.
3. Registry set: four `verify-*opencode*` and `ng-051` scripts, `adapter_composed`, `check_ai_opencode_held`, the `ng051-backend-off` row.
4. Ledger set: NG-051 drop and re-lock. Only Chris can approve it, and it must happen before the commit.
5. Theia 1.76 branding: delete D-22 rebind 2 (`AIConfigurationViewContribution` has no `initializeLayout`) and keep rebind 1 (the AI-first perspective).

### Critical Pitfalls

1. **The pinned tag is not the commit the trial tested.** The 10-15 trial resolved `_RELEASE` to `f617beaded` (153.6-era). Today both tags resolve to `223014c6b9`. Record the SHA in `docs/BUILD.md` and re-run the replay and `mach configure` on that commit. Do not cite the trial as evidence for it.
2. **"Full verify green" after the ESR move needs two builds.** Rebuild both the dev objdir and `objdir-release` (about 50 + 55 min). `mar-update-hop` stays green on 153.1 evidence, so label it pre-153.5. Derive the `smoke-firefox` version from the tree.
3. **React 18 left in place, or a duplicate React, builds green.** Move all four React pins in the same commit as the Theia pins, add `resolutions`, and add a derived `--quick` single-copy row (react, react-dom, both `@types`, inversify) with a planted-duplicate self-test.
4. **Static gates cannot see 1.76 runtime regressions.** Run the live sidecar twice, on a fresh `THEIA_CONFIG_DIR` and on a carried-over one. Assert one PowerBrowser welcome, no Theia Welcome, and no AI Configuration tab. Open a `view:` URI. Run the `side02-token-*` rows live, not just `tsc`.
5. **OpenCode removal is red locally and green in CI.** Leftover `lib/`, the symlink, the stale `generated/ai-backend.json` and an uncommitted `yarn.lock` cause it. Run `rm -rf`, `yarn install --ignore-scripts`, delete the generated file, expect 53 from `--check`, commit the lock and re-run with `--frozen-lockfile`. Delete `ng051-backend-off`: once the adapter is gone it cannot go red.

Also: never edit `.patch` files; run the brand scan after `git add` and reconcile the `-PLAN.md` count; purge the chrome JS startup cache before every chrome-side live result; check for concurrent sessions before any `yarn install`; split the OpenCode plan by removal set to stay under `size-gate.py`.

## Implications for Roadmap

Phase numbering continues from 16. The suggested structure has 9 phases: four non-GUI, five GUI.

### Phase 17: OpenCode removal
**Rationale:** Every later `yarn install`, re-pin and clean build then runs on the final workspace member set. Needs no build; `--quick` proves it.
**Delivers:** Removal sets 1-3 in one commit, the NG-051 amend, planning-record edits (REQUIREMENTS AI-01..05, ROADMAP Phase 16), `quick-baseline.txt` refresh.
**Avoids:** Pitfalls 7, 8, 9, 10. Get Chris's NG-051 approval before the commit. Leave the `@theia/ai-*` framework alone unless Chris decides otherwise.

### Phase 18: Firefox 153.5.0esr
**Rationale:** Independent of Theia (separate tree and dev shell). Comes before the Theia move so that phase 19's live check runs on the final Gecko.
**Delivers:** Pin plus SHA record, workflow default mirror, derived `smoke-firefox` version, `fetch-upstream.sh` comment and the `configuration.toml:104` newline fix, replay through `rebase-upstream.sh`, dev and release builds, full `verify-platform.sh`.
**Avoids:** Pitfalls 1, 2, 3, 14 (`rebase-upstream.yml` has never run and has no Nix; do not cite it as proof).

### Phase 19: Node 24, React 19, Theia 1.76.0
**Rationale:** Isolates the native-ABI, React-runtime and Theia-API questions from one another.
**Delivers:** Commits each followed by `--quick` and a live sidecar start (see the commit-split disagreement below). Also: the D-22 rebind 2 deletion, the `startupEditor` default, the React single-copy row, the telemetry schema outcome, a re-verified Theia selector list, the UPD-04 record re-run with live token rows, the NG-082 amend, and a baseline refresh.
**Avoids:** Pitfalls 4, 5, 6, 12, 13.

### Phase 20: Non-GUI gaps
**Rationale:** G-9 must run on the final dependency set, from a quiet tree or a fresh clone.
**Delivers:** G-9 run, G-10 group-channel row with self-test, schema v3/v4 ledger rows, `generate-check` closed as not reproducible (or reproduced and fixed inside the dev shell), the `-purgecaches` line in `docs/BUILD.md`.
**Avoids:** Pitfalls 15, 16.

### Phase 21: Panorama spec re-pin and gui08 checks
**Rationale:** The first GUI step, because these are the only red gate rows. W4 later edits the same copy contract, so the spec must be re-pinned first. The commit gate is green after this phase.
**Delivers:** 15-UI-SPEC describing the shipped geometry and reviewed "Expand"/"Done" copy, both checks derived from it and passing, dead tray CSS removed, empty quick baseline (file and R33 references deleted).
**Avoids:** Q1 option (b), a named exclusion.

### Phase 22: Panorama worklist
**Rationale:** Needs Panorama decisions 1 and 2 first.
**Delivers:** W1 + W2 together, W4 Undo Close Group (spec copy and both checks updated in the same change), W5, and optionally the W11 last-group half.

### Phase 23: Phase 14 / 14.1.1 leftovers and sketch 005 verdict
**Delivers:** G-23 (code or spec ratification), G-32 (slide or spec amendment), the G-11 records update, 14-VERIFICATION, and sketch 005 committed with a MANIFEST row and a verdict.
**Rationale:** The sketch 005 verdict must come before UAT; adopting it changes the layout that UAT tests. G-11 still needs Chris to confirm it live, which can happen inside phase 24.

### Phase 24: Live UAT pass (NG-084)
**Rationale:** Comes after every GUI change and after React 19; otherwise it has to be repeated.
**Delivers:** A Phase 15 UAT sheet written and run, no `pending` result on the 10, 13, 14, 14.1, 14.1.1 and 15 sheets, the React 19 runtime line, the NG-084 text amend.

### Phase 25: CI green on main (NG-074)
**Rationale:** The exit gate. In practice CI goes green once phase 21 lands and `main` is pushed. Expect confirmation, not new work.

### Phase Ordering Rationale

- OpenCode before the Theia move shrinks the re-pin set (7 extensions instead of 8; the ACP SDK leaves the lock) and the `build:extensions` chain that G-9 tests. It does not shrink the React surface; backend-opencode has no React code.
- One upstream per phase, because each Gecko build costs 47-54 min and the user's rule is one fix at a time, confirmed.
- GUI work goes after Theia 1.76, so Theia DOM selectors are re-verified once.

### Research Flags

Need `/gsd-plan-phase --research-phase`: **19** (runtime behaviour at 1.76 / React 19 is unverified: telemetry schema winner, `view:` factory ids, `pagehide` persistence, dependent-window theme) and **22** (W1 needs a shared frontend group-membership reader; W4 touches the chrome-side writer `closeGroupRows`).
Standard patterns, skip research: **17**, **18**, **20**, **21**, **23**, **24**, **25**. Their surfaces are already mapped to file:line.

## Disagreements Between the Research Files

| Topic | Positions | Recommendation |
|---|---|---|
| Firefox tag `_BUILD1` vs `_RELEASE` | STACK and PROJECT.md: `FIREFOX_153_5_0esr_BUILD1`. The tree convention and `fetch-upstream.sh` use `_RELEASE`. PITFALLS: either works today | Both resolve to `223014c6b9` today, but 153.4 shows they can differ (RELEASE = BUILD3). Pin `_BUILD1` as PROJECT.md states, record the SHA, and correct the comment that says the two tags always share a commit. |
| Phase 19 commit split | ARCHITECTURE: 2 commits (Node 24; then Theia + React). PITFALLS: 3 commits (Node; React 19 at 1.74.1; Theia 1.76). Theia 1.74.1 accepts React `^18.3.1 \|\| ^19` | 3 commits. The extra install is cheap, and it separates React 19 runtime failures from 1.76 API failures. |
| Phase 19 transitive changes | STACK covers the getting-started and telemetry collisions. ARCHITECTURE's build order omits them | Put them in phase 19 scope explicitly. |
| Phase 18 builds | STACK runbook: one `./mach build`. PITFALLS: dev **and** release builds | Budget two builds; otherwise the release-variant rows fail at the end of the phase. |
| Panorama spec and worklist | ARCHITECTURE: one phase. FEATURES: the spec first, the worklist as separate items | Two phases (21, 22), per "GUI one step at a time" and because the commit gate turns green at 21. |
| Sketch 005 placement | ARCHITECTURE: its own phase 23 before UAT. FEATURES: a decision only | Fold it into phase 23 with the 14.x leftovers. It has no build and still lands before UAT. |
| W6 search scope | Handoff: v1.4. PROJECT.md:271 and 15-UI-SPEC: v1.5+ or "only if cheap" | Defer, unless Chris confirms the handoff. |
| `generate-check` failing locally | Handoff: fails (inkscape). FEATURES and PITFALLS: passes in the host shell and `.#theia` | Close it as not reproducible, with the passing runs recorded. Reopen only with a failing log. |
| G-23 reading | 14-UI-SPEC:360 "cut at the cap before commit" (current code satisfies it). Gap text: refuse at the input | Chris picks. The stricter reading costs a `validateInput` per input. |

## Decisions Needed From Chris

1. **NG-051 ledger amend.** Drop or supersede it ("adapter removed, v1.4") and re-lock without `verify-ng-051-backend-off.mjs`. Must be approved before the phase 17 commit; the ledger hook prevents the agent from recording it.
2. **NG-082 ledger amend.** Retarget it from 1.75.0 to 1.76.0 (plus React 19 and Node 24) and move it out of 999.2.
3. **Keep or remove the 12 `@theia/ai-*` packages.** Keeping them preserves Theia's chat and the D-22 rebind 1, tab-uris and `view:ai-configuration` surfaces. Removing them drops the getting-started transitive and 12 pins. Recommendation: keep for v1.4 and decide before phase 19.
4. **Telemetry preference collision.** Keep the PowerBrowser `telemetry.telemetryLevel` schema and accept the duplicate warning, or consume Theia's. Recommendation: decide at the phase 19 live check, based on which schema wins and what the Settings text says.
5. **G-32 side panel slide.** (a) Author a slide of 200 ms or less with a reduced-motion fallback, or (b) amend 14-UI-SPEC to "instant".
6. **G-23 name cap reading.** Refuse at the input, or ratify the "cut at the cap" text.
7. **Sketch 005 (VS Code layout).** Adopt it into a named later milestone, or reject it. The verdict is needed before UAT.
8. **Panorama decision 1: the Ungrouped tray.** Every tab in a group, or tabs may be unassigned. The shipped code already uses loose cards on the canvas instead of the 144px tray, so the answer also settles W2's landing rule and whether W11's last-group rule is required.
9. **Panorama decision 2: strip filter scope.** Filter in Browsing only, or in every mode (Coding's dock bar also holds editors and terminals).
10. **W6 scope.** v1.4 (handoff) or v1.5+ (PROJECT.md:271).
11. **New ledger rows.** Schema v3/v4 rows and the widened NG-084 text both need approval through `ledger-amend.py`.
12. **Optional hook change.** Stop running the `--quick` check on session `resume`, so resumes fit inside the VSCode 60 s spawn limit.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH (versions), MEDIUM (runtime) | Registry, tarballs, Mozilla remote and locked nixpkgs were queried directly. No sidecar has run at 1.76, and no Gecko build has run at 153.5. |
| Features | HIGH | Every current state was re-read or re-run on `e9e29c1`. G-32, G-23, sketch 005 and W6 depend on Chris. |
| Architecture | HIGH | The removal surface was confirmed by `git grep` and reads, including negatives. The 1.76 API facts come from published tarballs. |
| Pitfalls | HIGH | Tag and blob SHAs, hook mechanics and gate derivations were re-verified. The runtime items are inferred. |

**Overall confidence:** HIGH for planning. MEDIUM for how much work phase 19's live check will uncover.

### Gaps to Address

- No live sidecar at 1.76 / React 19 / Node 24: first-boot tabs, telemetry schema, `view:` factory ids, `pagehide` persistence, dependent-window theme, React render-error capture. Close these in phase 19.
- No Gecko build at `223014c6b9`. The `drivelist` compile under Node 24 headers is unverified (use `--nodedir`).
- About 25 `view-factory-table.ts` rows have not been checked against 1.76. Planting a fault proves the drift check fires; a stronger fix is to derive the ids from `node_modules`.
- The cause of the original local `generate-check` failure is unknown (likely host inkscape or the sandbox; LOW confidence).
- The `rebase-upstream.yml` workflow has never run and has no Nix. Decide in phase 18: wrap it in Nix, or record it as unexercised.

## Sources

### Primary (HIGH confidence)
- npm registry and `npm pack` tarballs of `@theia/{core,cli,ai-ide,ai-core,ai-chat-ui,monaco,telemetry,getting-started,plugin-ext}@1.76.0`; Theia `v1.76.0` tag (CHANGELOG 1.75/1.76, root `package.json`, `package-lock.json`)
- `git ls-remote` and the GitHub API on `mozilla-firefox/firefox` (153 tags, blob SHAs of the patched files at 153.1 and 153.5); product-details `firefox_versions.json`
- Locked nixpkgs `ffb3c9b7` via `nix eval --inputs-from .`
- Tree reads and runs on `e9e29c1`: `verify-platform.sh --quick` (114/4), the gui08 scripts, `generate.mjs --check`, `ledger-report.py`, `gh run list/view` for verify.yml and rebase-upstream.yml, native-module load test under Node 24

### Secondary (MEDIUM confidence)
- 2026-10-15 trial report (session a38939de) and its verifier; not re-run
- `.planning/HANDOFF-plan-reorg.md`; PROJECT.md (2026-10-16) supersedes it on DSH and AI-01..05
- Project memory: chrome JS startup cache, live GUI debug loop, concurrent sessions, one fix at a time

---
*Research completed: 2026-10-16*
*Ready for roadmap: yes*
