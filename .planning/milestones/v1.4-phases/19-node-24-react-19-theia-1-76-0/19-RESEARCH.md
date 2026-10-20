# Phase 19: Node 24, React 19, Theia 1.76.0 - Research

**Researched:** 2026-10-17 (HEAD `63ed52a`)
**Domain:** Dependency upgrade of the Theia sidecar (Nix dev shell, yarn v1 workspace, Theia DI composition), plus ledger mechanics
**Confidence:** HIGH. Every runtime question the roadmap flagged was measured in a scratch copy of the workspace: a Node 24 flake, React 19 at 1.74.1, Theia 1.76.0, a live sidecar on port 3949, and the built Gecko shell driving it over BiDi. The real `theia/node_modules` and every tracked file are untouched; `git status` shows only the three untracked files that were there before.

## Summary

The upgrade is mechanically small and mostly measured. The scratch tree needed these edits to compile: the pin edits, the RM-02 deletion in `@powerbrowser/branding`, and nothing else. At 1.76.0 the other six extensions compile unmodified. At 1.74.1, all seven compile under React 19 types. Every install leaves exactly one copy of react, react-dom, `@types/react`, `@types/react-dom` and inversify. drivelist compiles under Node 24.19.0 headers with no network, and node-pty spawns under Node 24.

Three runtime regressions are real, and each was reproduced live on a scratch 1.76.0 sidecar:

1. **Theia's Welcome opens.** Without the `workbench.startupEditor` default, a fresh boot shows main area `["welcome","getting.started.widget"]`. With `"workbench.startupEditor": "none"` in `frontend.config.preferences`, it shows `["welcome"]`.
2. **The Settings UI shows Theia's telemetry text.** `@theia/telemetry` loads before `@powerbrowser/telemetry` (generated `src-gen/frontend/index.js`, lines 137 and 152). With the tree's current static schema, Settings shows "Controls the level of telemetry." and the backend log carries `Property with id 'telemetry.telemetryLevel' already exists`. An `initSchema`-based registration (Code Example 2) shows the PowerBrowser text in both module orders and emits no warning. Both outcomes were measured in the Settings DOM.
3. **`gui07-mode-switch-tabs-live` will go red after RM-02.** That check asserts set equality between the live perspective registry and the perspectives our sources register. Deleting D-22 rebind 1 lets `@theia/ai-ide` register `ai-first`, which no `@powerbrowser` source accounts for. This was found by reading `scripts/verify-mode-switch-tabs-live.mjs:521-526`; the full live tier was not run.

There are two ledger findings the planner must design around:

- `ledger-amend.py set` has **no `--text` flag**, so NG-082's text ("re-pinned to 1.75.0") cannot be retargeted by any agent command.
- `scripts/verify-ng-067-frontend-errors.mjs` is **sha-locked** in `check_locks`, so the forced-render-error check must be a new file.

**Primary recommendation:** Land a checks-first commit (the single-copy row, a live first-boot check, and a captured carried-over fixture), then the three locked commits. Commit 3 carries the pin move (the BUILD.md runbook mover), RM-02, the `startupEditor` default, the `initSchema` telemetry registration, and the gui07 live-check fix. Write NG-082's check and record its failure immediately before commit 3's pin edits.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Three ordered commits, each followed by `--quick` and a live sidecar start:
  (1) Node 24 — `flake.nix` only, `flake.lock` byte-unchanged (no `nix flake update`);
  (2) React 19.2.8 / `@types/react` 19.2.18 / `@types/react-dom` 19.2.7 at Theia 1.74.1;
  (3) every `@theia/*` except `@theia/monaco-editor-core` to 1.76.0.
- RM-02 (Chris, 2026-10-16: "Theia AI should remain as stock"): delete both
  AI-layout overrides in `@powerbrowser/branding` (decision 22 in PROJECT.md);
  the 12 `@theia/ai-*` packages stay composed, moved to 1.76.0, unmodified.
- Theia's Welcome page (pulled in by `@theia/ai-ide` → `@theia/getting-started`
  at 1.76) must not open: set `workbench.startupEditor: "none"` in the app's
  default preferences; prove it on a fresh and a carried-over config dir.
- Telemetry collision (autonomous decision, recommended by CLAUDE.md's
  user-facing-copy rule): the PowerBrowser `telemetry.telemetryLevel` registration
  must be the one the Settings UI shows (its copy names PowerBrowser); make it win
  deterministically and assert that live. Record the decision in the SUMMARY.
- NG-082: reopen and retarget the ledger row from 1.75.0 to 1.76.0 (+ React 19,
  Node 24) with agent-allowed `ledger-amend.py set` / `set-status open`, then
  close it with evidence when verified. If the hook refuses a step, stop and
  surface the exact command for Chris.
- New `--quick` row: exactly one installed copy each of react, react-dom,
  `@types/react`, `@types/react-dom`, inversify; derived from node_modules, with a
  `--self-test` that plants a duplicate and must go red naming the package.
- Refresh `docs/non-gui/quick-baseline.txt` (R33) if the FAIL set changes.
- Live sidecar checks use `PB_VERIFY_PORT` (default 3939); never touch port 3000.
- Rebuild the sidecar before any live check (Phase 17 review IN-02: build output
  predates the OpenCode removal).
- Never fork or patch Theia core; `scripts/diff-theia-core.sh` must pass.

### Claude's Discretion
Everything else, guided by ROADMAP success criteria, `.planning/research/STACK.md`,
`.planning/research/PITFALLS.md` and this phase's research.

### Deferred Ideas (OUT OF SCOPE)
None.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RM-02 | Theia's AI framework runs as upstream ships it: both D-22 overrides removed from `@powerbrowser/branding`; the 12 `@theia/ai-*` packages stay composed and unmodified | Deletion compiles at 1.76.0 (scratch `tsc -b` rc=0). It changes three sites: the file, the frontend module and the gui07 live check. Live fresh boot after the deletion: main area `["welcome"]`, with no AI Configuration or AI First tab |
| UPD-07 | `.#theia` runs Node 24, only `flake.nix` changed, `flake.lock` untouched | `nodejs_24` = 24.19.0 at the locked rev (`nix eval`). The scratch flake with one line changed builds the shell, compiles drivelist (`nodedir` = `nodejs-slim-24.19.0`) and passes the node-pty spawn |
| UPD-08 | React 19.2.8, exactly one installed copy each of 5 packages, new `--quick` row with planted-duplicate self-test | One copy of each measured in both scratch installs. Design in Pattern 2 |
| UPD-09 | Every `@theia/*` (except monaco-editor-core) 1.76.0, `diff-theia-core.sh` passes, NG-082 amend | Runbook mover `docs/BUILD.md:211-253`. The 1.76.0 install has 56 `@theia/*` packages at 1.76.0 plus monaco at 1.108.201. NG-082 mechanics in "Ledger" |
| UPD-10 | Live 1.76 check on fresh and carried-over config dirs: only the PowerBrowser welcome, `view:` URIs open, token-gate rows pass live; telemetry collision decided and recorded | Fresh boot measured live. The carried-over dir needs a fixture captured before commit 3 (Pattern 4). All 22 `view-factory-table.ts` ids exist in the 1.76.0 sources |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- Never fork or patch Theia core. Consume `@theia/*` as npm dependencies and re-pin versions only. `scripts/diff-theia-core.sh` is the gate.
- Never modify Gecko outside the patch stack. This phase touches no Gecko code.
- Design for the bridge (GUI-04). `verify-registry-shape.mjs` must stay green.
- The repo path contains no space. Keep `NIX_NO_SELF_RPATH = "1"` (`flake.nix:30`).
- Theia is the default GUI and stock chrome stays reachable. No custom browser chrome.
- `node scripts/scan-brand-residue.mjs` must exit 0. **Stage new files before trusting a green scan.** The frozen `-PLAN.md` row counts 49 occurrences in 10 files, `scripts/verify-platform.sh` among them, so a new registry comment that cites a `NN-NN-PLAN.md` file moves the count.
- Patches are regenerated, never text-edited. Not applicable here.
- One verification driver: `scripts/verify-platform.sh`. A new check is a registry row, never a sibling driver.
- Never assert the absence of a log line or DOM token unless a positive control proves the emitter fires. Derive from the tree and compare; never hand-keep an expectation list. Give each new check a `--self-test` that plants faults.
- No internal identifier in user-facing text. Products are named "PowerBrowser".
- Build inside `nix develop .#theia`. `yarn` does not work outside it; `node` does.
- Memory notes in force: `concurrent-sessions-on-main` (commit with explicit paths, no `-a`/`--amend`/stash), `one-fix-at-a-time-confirmed`, `chrome-js-startup-cache` (not relevant: no `powerbrowser/shell/*.js` edits), `live-gui-debug-loop` (static gates cannot see DI or DOM), `use-gsd-not-superpowers`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Node runtime version | Build env (Nix `.#theia` shell) | CI (inherits via `nix develop`) | `flake.nix:20` is the single selector |
| Package pins and lockfile | Theia workspace manifests | `configuration.toml [upstreams]` (declaration) | The generator never writes package.json (GEN-04). `verify-upstream-pins.mjs` enforces agreement |
| AI layout behaviour (RM-02) | Frontend DI (`@powerbrowser/branding` module) | — | Deleting the rebinds restores upstream bindings |
| Welcome suppression | App config (`theia.frontend.config.preferences`) | Frontend preference service | Theia turns config preferences into schema default overrides |
| Telemetry Settings copy | Frontend DI (`@powerbrowser/telemetry` PreferenceContribution) | `@theia/telemetry` (frontend and backend) | The Settings UI renders the frontend `PreferenceSchemaService` property |
| Single-copy invariant | Static check over installed `node_modules` | — | Honestly `--quick`: text reads only |
| Live no-regression | Built Gecko shell plus sidecar (BiDi) | Dev app on `PB_VERIFY_PORT` | First boot, layout persistence and DOM are invisible to static gates |
| NG-082 lifecycle | Ledger (`ledger-amend.py`) | phase-gate, plan-gate, Stop hook | Gated by hooks; some steps need Chris |

## Standard Stack

### Core

| Package | Version | Purpose | Evidence |
|---------|---------|---------|----------|
| Node.js | 24.19.0 (`pkgs.nodejs_24`, locked nixpkgs) | Sidecar runtime, yarn, node-gyp | `nix eval --raw --inputs-from . nixpkgs#nodejs_24.version` → `24.19.0` [VERIFIED: nix eval this session] |
| node-gyp (bundled with Node 24's npm) | 12.4.0 | drivelist rebuild | `node-gyp --version` → `v12.4.0` inside the scratch Node 24 shell [VERIFIED: measured] |
| `@theia/*` | 1.76.0 (except `@theia/monaco-editor-core` 1.108.201) | Sidecar framework | npm dist-tags `latest: '1.76.0'`, `patch: '1.74.2'`, `next: '1.77.0-next.57'` [VERIFIED: npm view] |
| react / react-dom | 19.2.8 / 19.2.8 | Widget layer | Theia v1.76.0 `package-lock.json` resolves `node_modules/react 19.2.8` and `node_modules/react-dom 19.2.8`. `react-dom@19.2.8` peers `react: '^19.2.8'` [VERIFIED: raw lockfile and npm view] |
| `@types/react` / `@types/react-dom` | 19.2.18 / 19.2.7 | Types | Same lockfile: `19.2.18`, `19.2.7`. `@types/react-dom@19.2.7` peers `'@types/react': '^19.2.0'` [VERIFIED] |
| inversify | 6.2.2 (unchanged) | DI | `@theia/core@1.76.0` dependency `"inversify":"^6.2.2"`, same as 1.74.1. The upstream lock resolves 6.2.2 [VERIFIED: tarball and lockfile]. The live checks' `_bindingDictionary` walk (pinned to inversify 6.2.2) therefore keeps working |
| TypeScript | ~5.9.3 (unchanged) | Extension compile | `theia/package.json:64` [VERIFIED: Read] |

### New transitive packages at 1.76.0

Measured by diffing `node_modules/@theia` between the real 1.74.1 install and the scratch 1.76.0 install: `getting-started`, `plugin-utils` and `telemetry` are added, and nothing is removed [VERIFIED: scratch install]. `@theia/ai-registry`, whose 1.76 changelog entry adds a registry check on every window load, is **not** in the closure [VERIFIED: same diff].

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `initSchema` registration (telemetry) | Rebind `@theia/telemetry`'s `TelemetryPreferenceContribution` symbol | It needs a new `@theia/telemetry` dependency, fails at 1.74.1 where the package is absent, and still depends on module order (a second `bind` makes inversify throw an ambiguous-match error). Rejected |
| `initSchema` registration | Drop our schema and consume Theia's | Settings would show Theia's copy, which violates the locked decision |
| `startupEditor: "none"` | Rebind `GettingStartedContribution.onStart` | That is a code override where a one-line config works. Rejected per STACK.md |

**Installation (inside `nix develop .#theia`, from `theia/`):**
```bash
yarn install --ignore-scripts                   # lock moves on purpose (commits 2 and 3)
(cd node_modules/drivelist && node-gyp rebuild) # yarn deletes drivelist.node (17-01 SUMMARY)
yarn build                                      # extensions + app; the live checks need this
yarn install --ignore-scripts --frozen-lockfile # proves CI's step on the committed lock
```

## Package Legitimacy Audit

| Package | Registry | Age (pinned version) | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| react@19.2.8 | npm | published 2026-07-21 | 188M/wk | github.com/react/react | SUS (`too-new`: the seam judged the **latest** version 19.3.1, published 2026-10-14) | Keep. Pinned version is about 3 months old, no install or postinstall script |
| react-dom@19.2.8 | npm | 2026-07-21 | 177M/wk | github.com/react/react | SUS (`too-new`, same reason) | Keep. No install scripts |
| @types/react@19.2.18 | npm | 2026-07-30 | 171M/wk | DefinitelyTyped | OK | Approved |
| @types/react-dom@19.2.7 | npm | 2026-09-03 | 146M/wk | DefinitelyTyped | OK | Approved |
| @theia/core@1.76.0 (and all 1.76.0 `@theia/*`) | npm | 2026-09-24 | 38k/wk | github.com/eclipse-theia/theia | SUS (`too-new`: 23 days) | Keep. Official org, no install scripts |
| @theia/getting-started, @theia/telemetry, @theia/plugin-utils @1.76.0 | npm | 2026-09-24 | 5k–10k/wk | eclipse-theia/theia | SUS (`too-new`) | Keep. Transitive, pulled by `@theia/ai-ide` and `@theia/plugin-ext` |

**Packages removed due to [SLOP]:** none.
**Packages flagged [SUS]:** react, react-dom and every `@theia/*@1.76.0`. Every flag is recency only. Each package comes from its official org, and `npm view <pkg>@<ver> scripts.postinstall` and `scripts.install` are empty for all of them [VERIFIED: npm view]. The planner adds one `checkpoint:human-verify` before the commit-2 install and one before the commit-3 install. Installs always run `--ignore-scripts`.

## Architecture Patterns

### System Architecture Diagram

```
configuration.toml [upstreams].theia_release ──(runbook mover, BUILD.md:211-253)──▶ theia/package.json resolutions
                                                                              ├──▶ applications/browser/package.json deps
                                                                              └──▶ extensions/*/package.json deps
        │                                                                                 │
        └──── verify-upstream-pins.mjs (manifest == every pin == lock stanzas) ◀───────────┤
                                                                                          ▼
flake.nix:20 nodejs_24 ──▶ nix develop .#theia ──▶ yarn install --ignore-scripts ──▶ theia/node_modules
                                                       │                               │
                                       node-gyp rebuild drivelist          single-copy row (5 pkgs, 1 copy each)
                                                       ▼                               ▼
                                              yarn build (tsc -b ×7, theia build/esbuild) ──▶ lib/ + src-gen
                                                                                          │
                          ┌───────────────────────── live tier ───────────────────────────┤
                          ▼                                                               ▼
           objdir/dist/bin/powerbrowser (supervised shell,               dev app on PB_VERIFY_PORT=3939
           fresh XDG_CONFIG_HOME + fresh or kept profile)                (theia_app_up; verify-branding, uri-roundtrip)
                          │
       frontend DI container (window.theia.container)
         ├─ PreferenceSchemaService: telemetry.telemetryLevel ◀─ @theia/telemetry schema (loads 1st)
         │                                                   ◀─ @powerbrowser/telemetry initSchema (updates it)
         ├─ FrontendConfig defaults: workbench.startupEditor = none ──▶ GettingStartedContribution.onStart (no open)
         ├─ ApplicationShell main area ──▶ ["welcome"]
         └─ window 'error' ◀─ React 19 reportError ◀─ forced render error ──▶ TelemetryErrorCapture ──▶ logger
```

### Recommended file touch list (current HEAD line numbers)

| Commit | File:line | Change |
|---|---|---|
| 1 | `flake.nix:20` | `nodejs = pkgs.nodejs_22;` → `pkgs.nodejs_24;`. Rewrite the D-16 comment at `:14-19` and keep `yarn.override` at `:21`. The shellHook comment at `:53-57` is optional text |
| 2 | `theia/package.json:65-66` | `"@types/react": "18.3.31"` → `"19.2.18"`, `"@types/react-dom": "18.3.7"` → `"19.2.7"` |
| 2 | `theia/applications/browser/package.json:94-95` | `"react": "18.3.1"`, `"react-dom": "18.3.1"` → `"19.2.8"` |
| 2 | `theia/yarn.lock` | Regenerated. Measured diff: 57 changed lines (react, react-dom, `scheduler@^0.23.2` → `^0.27.0`, both `@types`, `@types/prop-types` dropped, `loose-envify` range) |
| 3 | `configuration.toml:116` | `theia_release = "1.74.1"` → `"1.76.0"` |
| 3 | all package.json `@theia/*` pins | Runbook mover (`docs/BUILD.md:216-238`). Do not hand-edit 49 + 50 + 7 lines |
| 3 | `theia/package.json:61` | `"node": ">=22"` → `">=24"` (UPD-07 restricts commit 1 to `flake.nix`) |
| 3 | `theia/applications/browser/package.json:4` | `"version": "1.74.1"` → `"1.76.0"` (the About "Version" line). Record the choice in the SUMMARY |
| 3 | `theia/applications/browser/package.json:20` | Add `"workbench.startupEditor": "none"` beside `"security.workspace.trust.enabled": false` |
| 3 | `theia/extensions/branding/src/browser/powerbrowser-ai-layout-contribution.ts` | `git rm` the whole file |
| 3 | `theia/extensions/branding/src/browser/powerbrowser-frontend-module.ts:4-5,10,32-44` | Delete both `@theia/ai-ide` imports, the `:10` import and the D-22 block |
| 3 | `theia/extensions/branding/package.json:7` | Optional: drop `"@theia/ai-ide"`. No branding import remains (measured); the app still composes it at `applications/browser/package.json:52` |
| 3 | `theia/extensions/telemetry/src/browser/telemetry-preferences.ts:1-15,58-66` | `initSchema` registration (Code Example 2). The `:1-15` header becomes false at 1.76 ("nothing else in this tree contributes a `telemetry.*` preference") and must be rewritten. **Keep line 27 `export const TELEMETRY_LEVEL_PREFERENCE = 'telemetry.telemetryLevel';` byte-identical**: the locked `verify-ng-067-frontend-errors.mjs:22` regex reads it |
| 3 | `scripts/verify-mode-switch-tabs-live.mjs:45-57,521-526` | Account for upstream perspective registrations (Pitfall 3) |
| 3 | `theia/yarn.lock` | Regenerated. Measured diff from HEAD: +729 / −2583 |
| docs | `docs/BUILD.md:268-286`, `README.md:87` | Re-record UPD-04 at 1.76.0 and close the 1.75.0 "staged, not executed" paragraph |

### Pattern 1: Pin move through the existing runbook (Don't Hand-Roll)

The pin is declared once at `configuration.toml:116` (`theia_release = "1.74.1"`). The generator emits nothing for it: `verify-upstream-pins.mjs:44-50` says "The generator never rewrites a package.json (GEN-04 ...) so the manifest pin is the declaration and this check is the enforcement" [VERIFIED: Read]. **The target changes in one place** (the manifest). The runbook mover then rewrites every `@theia/*` pin from it, and `verify-upstream-pins.mjs` steps 5-7 prove that the resolutions, every member manifest and every lock stanza agree. **It does not cover react pins, the app `version` field, the installed `node_modules`, or `engines`.** `node scripts/generate.mjs` stays in the sequence only because the runbook lists it (`docs/BUILD.md:241`); no generated file changes.

### Pattern 2: The single-copy `--quick` row (UPD-08)

- **New file**, for example `scripts/verify-single-copy-deps.mjs`, with rows `single-copy-deps` and `single-copy-deps-self-test`. Append both at the end of the `--quick` array, after `"tab-uris-typecheck|check_tab_uris_typecheck"` (`scripts/verify-platform.sh:4551`) and before `)` at `:4552`.
- **Walk** the real directories without following symlinks: `theia/node_modules`, `theia/applications/*/node_modules` and `theia/extensions/*/node_modules`. `node_modules/@powerbrowser/*` and `node_modules/powerbrowser-theia-browser-app` are workspace symlinks (`find -maxdepth 1 -type l` shows them); following them would double-count. Recurse into every `<pkg>/node_modules` and every `@scope/<pkg>/node_modules`. A copy is any `.../node_modules/<name>/package.json` (scoped: `.../node_modules/@types/react/package.json`) whose `name` field equals the target.
- **Targets:** the five UPD-08 names are the requirement, not a measured expectation list, so naming them in the check is allowed. Today `applications/browser/node_modules` holds only `.bin` [VERIFIED: ls].
- **Fail** with the package name and every path when count ≠ 1. Zero copies is a distinct failure, and so is an absent `theia/node_modules`: it is a FAIL, not a skip, matching `check_tab_uris_typecheck`'s "a typecheck that goes green because it could not find its own compiler" rule at `verify-platform.sh:325-334`. CI installs before `--quick` (`.github/workflows/verify.yml:83-92`).
- **`--self-test`** builds a mkdtemp tree: a clean control with one copy of each (must PASS), a nested `node_modules/x/node_modules/react` (must go red naming `react` and both paths), a missing `@types/react-dom` (red naming it), and a symlinked duplicate (must **not** count). No tracked file is touched.
- Current measurement: exactly one copy each at HEAD (react 18.3.1, react-dom 18.3.1, `@types/react` 18.3.31, `@types/react-dom` 18.3.7, inversify 6.2.2), at React 19 / 1.74.1, and at 1.76.0 [VERIFIED: scratch]. No installed package declares any of the five as a regular `dependencies` entry except `@theia/core` → inversify. **No new `resolutions` entries are needed.**

### Pattern 3: Deterministic telemetry registration via `initSchema`

`PreferenceSchemaServiceImpl.init()` (`@theia/core@1.76.0 src/common/preferences/preference-schema-service.ts:85-107`) runs every contribution's `addSchema(contrib.schema)` synchronously in one `forEach` and starts each `initSchema` there. `ready` resolves after all `initSchema` promises settle. A contribution with **no `schema`** whose `initSchema` first `await`s one microtask therefore runs after every synchronous `addSchema` in the container, in any module order. It then calls `updateSchemaProperty(key, fullProperty)` if the key exists, or `addSchema(ownSchema)` if it does not (1.74.1, or any future tree without `@theia/telemetry`). The same API exists at 1.74.1 (`initSchema` at `:96-97`, `updateSchemaProperty` at `:199`). Upstream uses the same seam: `GettingStartedContribution.initSchema` calls `service.updateSchemaProperty('workbench.startupEditor', property)` (`getting-started-contribution.ts:91-105`, 1.76.0).

Measured against the real `PreferenceSchemaServiceImpl` from the 1.76.0 install, with `@theia/telemetry`'s real schema:

| Registration | Order | Resulting description | Warnings |
|---|---|---|---|
| Current tree (static `schema`) | theia > ours | "Controls the level of telemetry." | `Property with id 'telemetry.telemetryLevel' already exists` |
| Current tree | ours > theia | "How much usage and error telemetry PowerBrowser sends to the configured endpoint." | same warning |
| `initSchema` (Code Example 2) | theia > ours | PowerBrowser text, scope 1 (User, inherited), default `off` | none |
| `initSchema` | ours > theia | PowerBrowser text, scope 1, default `off` | none |
| `initSchema` | ours only (1.74.1 shape) | PowerBrowser text, default `off` | none |

Live Settings DOM on the scratch 1.76.0 sidecar, read from `[data-pref-id="telemetry.telemetryLevel"] .pref-description` after `workbench.action.openGlobalSettings` and `settings_widget.setSearchTerm('telemetry.telemetryLevel')`: `"How much usage and error telemetry PowerBrowser sends to the configured endpoint."` with the fix, and `"Controls the level of telemetry."` without it [VERIFIED: measured both]. This is the N3 assertion, and the unfixed run is its positive control.

### Pattern 4: Live first-boot check (N1, N3, N4), fresh and carried-over

Build it as a **new** registry row in the full tier. It cannot extend `verify-ng-067-frontend-errors.mjs`, which is sha-locked (see Ledger).

- **Launch path:** use the supervised shell, `withFirefoxPage('', cb, { profileDir })`, with `process.env.XDG_CONFIG_HOME` set before launch. This is ng067's pattern (`verify-ng-067-frontend-errors.mjs:36-38`). Product layout persists in `<profile>/powerbrowser-shell-state.json` through `ProfileStorageService`, not in localStorage (`tab-uris/src/browser/profile-storage.ts:10-31`). "Config dir" therefore means **profile dir plus `XDG_CONFIG_HOME`**.
- **Fresh:** both come from mkdtemp.
- **Carried-over:** a fixture captured **before commit 3** (ideally before commit 1, on the pristine 1.74.1 / React 18 / Node 22 tree). Launch with a kept `profileDir` and `XDG_CONFIG_HOME`, open one web tab and one `view:` tab, and quit cleanly so the shell flushes. Store the result **outside the repo**, following the R7 precedent (`~/coding/Power-Browser-fixtures/`, read through an env var, printed skip notice when absent so CI stays honest). Copy the fixture into a mkdtemp before each run so the original is never rewritten.
- **Assertions (derived, with positive controls):**
  - `shell.getWidgets('main').map(w => w.id)` equals `['welcome']` on fresh. On carried-over it equals the fixture's persisted main-area set; there is no hand-kept list.
  - `shell.getWidgetById('getting.started.widget')` is falsy. **Positive control in the same run:** when `@theia/getting-started` is installed, execute its command (id `getting.started.widget`, from `GettingStartedCommand = { id: GettingStartedWidget.ID }`) and require the widget to appear, then close it.
  - `prefs.get('workbench.startupEditor') === 'none'`.
  - The Settings DOM telemetry description equals the `description` string read from `telemetry-preferences.ts` at check time. Do not copy that string into the check.
  - A forced **React render-phase** error reaches `PowerBrowserTelemetryLogger.logError` with `type` set to the planted class name.
  - Zero window `error` events from startup through the walk. Register a `script.addPreloadScript` counter through the exposed `send`, then reload. The early-error capture is [ASSUMED] until implemented.
- **Do not** assert "no `theia-ide.org` in the DOM". Measured on the scratch run where `getting.started.widget` **was** open, `innerHTML.includes('theia-ide.org')` was `false`: the links are `onClick` handlers (`getting-started-widget.tsx:88-92, 436-446`). It is a vacuous absence assertion and fails the CLAUDE.md rule. UI-SPEC N1's bullet must be met by the widget-id assertion instead. Record this as a deviation in the SUMMARY.

Fresh-boot widget sets, measured live (dev app, fresh profile, fresh `THEIA_CONFIG_DIR`):

| Tree | main | left | right | bottom |
|---|---|---|---|---|
| React 19 @ 1.74.1 (commit-2 state) | `welcome` | explorer, vsx, search, scm, debug, test | outline-view, chat-view-widget | problems, t1 |
| 1.76.0, RM-02, no startupEditor default | `welcome`, `getting.started.widget` | same | same | same |
| 1.76.0, RM-02, `startupEditor: none` | `welcome` | same | same | same |

`chat-view-widget` sits in the **right** panel at 1.74.1 as well (`ai-chat-ui-contribution.ts:122-125` `area: 'right'`; its `initializeLayout` is unchanged apart from the logger). UI-SPEC N1's "no AI chat tab" must therefore be scoped to the **main** area, or it is red at both versions.

### Anti-Patterns to Avoid

- **Renaming the AI-configuration override instead of deleting it.** 1.76.0's `AIConfigurationViewContribution` has no `initializeLayout`, so there is nothing to override. RM-02 deletes both overrides regardless. STACK.md's advice to keep rebind 1 is superseded by the locked decision.
- **One commit for Node + React + Theia** (PITFALLS #5).
- **Treating "no `unmet peer` lines" as a criterion.** The baseline frozen install at HEAD prints 14 `unmet peer dependency` warnings (`" > @theia/core@1.74.1" has unmet peer dependency "react@^18.3.1 || ^19.0.0"`, and others). This is yarn v1's workspace hoisting, and the count is 14 in all three scratch installs [VERIFIED: measured]. The single-copy row is the gate; the peer log is not.
- **Editing `verify-ng-067-frontend-errors.mjs` or any `check_locks` file.** phase-gate reports `test file changed`.
- **Adding `workbench.startupEditor` in commit 2.** At 1.74.1 the key is unregistered, and `logDefaultRegistrationWarnings` would warn. It belongs in commit 3.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Moving ~106 `@theia/*` pins | sed / hand edits | Runbook mover `docs/BUILD.md:216-238` | It derives the pin from the manifest and skips `@theia/monaco-editor-core` by name |
| Pin agreement | a new pin check | `node scripts/verify-upstream-pins.mjs` (+ `--self-test`) | It already covers manifest, members and lock |
| Core-untouched proof | a custom diff | `scripts/diff-theia-core.sh` (stage 1 `yarn check --integrity --ignore-scripts`, stage 2 fresh-resolve `diff -rq`) | Hard rule 1 gate |
| Welcome suppression | a GettingStarted rebind | `frontend.config.preferences` default | Measured to work. It becomes a schema default override (`frontend-config-preference-contributions.ts:32-48`) |
| Telemetry precedence | load-order tricks, a core patch | `PreferenceContribution.initSchema` + `updateSchemaProperty` | Public API, measured order-independent |
| BiDi driving | Playwright / Puppeteer | `scripts/lib/firefox-bidi.mjs` `withFirefoxPage` | D-69, process hygiene |
| DI lookups in checks | new helpers | the `__getByName` `_bindingDictionary` walk (`verify-ng-067-frontend-errors.mjs:23-33`) | inversify is unchanged at 6.2.2 |

## Runtime State Inventory

The upgrade replaces installed and built state, so each category was checked.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | User layouts: `<gecko profile>/powerbrowser-shell-state.json` (keys `layout` / `perspective-layouts`). `ShellLayoutRestorer` is unchanged between 1.74.1 and 1.76.0 except for logger calls, and `applicationShellLayoutVersion` is `5.0` in both [VERIFIED: tarball diff] | None (no migration). Prove it with the carried-over fixture |
| Live service config | None. No external service holds Theia or React state | None |
| OS-registered state | None. Searched: the sidecar runs under the shell, nothing is registered | None |
| Secrets/env vars | `POWERBROWSER_TOKEN` and `POWERBROWSER_TOKEN_DISABLE` names are unchanged. `EnvVariablesServerImpl` still snapshots env in its constructor at 1.76 (STACK.md, trial verifier) | None. Prove with `side02-token-negative`/`-positive` live |
| Build artifacts | `theia/extensions/*/lib` (branding lib dated **2026-09-25**), `theia/applications/browser/lib` (dated 2026-10-16 19:29, before 5dfecb5 at 23:03), `src-gen`, `drivelist/build` (built with `"nodedir": "/nix/store/...-nodejs-slim-22.23.2"`). The deleted ai-layout `.ts` leaves a stale `lib/browser/powerbrowser-ai-layout-contribution.js`, which `tsc -b` does not remove [ASSUMED: tsc -b behaviour] | Rebuild everything with `yarn build` after each commit. Rebuild drivelist after each install. Delete the stale `.js`/`.d.ts`/`.map` for the removed file, or run the extension's `yarn clean` first |
| Workspace clones | `~/coding/Power-Browser-ng-*`, `~/gsd-workspaces/pba/Power-Browser` (17-01 SUMMARY) | Not this phase. Note it in the SUMMARY |

## Ledger (NG-082) and gate mechanics

**NG-082 today** [VERIFIED: `ledger/REQUIREMENTS.json:1059-1069`, Read]:
`"text": "Theia is re-pinned to 1.75.0 (UPD-02, UPD-04). Evidence: docs/BUILD.md:258-264 \"staged, not executed\".", "status": "deferred-approved", ... "owner": "chris", "phase": "999.2", "deferred_at": "2026-09-25"`.

**Agent-allowed commands** [VERIFIED: `.claude/hooks/ledger-verify-hook.py:34-36`]: `AGENT_SUBCOMMANDS = {"init", "add", "set", "set-status", "set-phase", "import-brainstorm", "record-handoff", "record-fail"}` and `AGENT_STATUSES = {"open", "done", "verified", "deferred-requested"}`. `set-status open` and `set-status done` are allowed.

**`set` cannot change the text** [VERIFIED: `scripts/ledger-amend.py:302-307` and `:390-393`]: its only arguments are `--id`, `--spec-ref`, `--test-ref`, `--code-ref` and `--evidence`. No subcommand edits `text` at all; only `add` sets it. "Retarget 1.75.0 → 1.76.0" therefore cannot happen through `set`. The hook will not refuse anything; the tool simply has no text field. **Surface this to Chris before the plan runs** (open question 1). There are two paths:
- **(a)** Keep NG-082. Set `--spec-ref ".planning/REQUIREMENTS.md UPD-07..UPD-09"` and evidence that states 1.76.0 / React 19.2.8 / Node 24. The row text stays "1.75.0".
- **(b)** Chris types `DROP NG-082 <reason: superseded by NG-0NN, 1.76.0>`, and the agent runs `add --text "Theia is re-pinned to 1.76.0 with React 19.2.8 on Node 24 (UPD-07..UPD-09)"`.

`drop` needs Chris's quote (`ledger-amend.py:475-491`, hook `BLOCK_APPROVAL`).

**Gate consequences of reopening** [VERIFIED: Read]:
- `phase-gate.py:120-152`: an `open` due row must have a `test_ref` whose file exists, and each check may belong to only one row. A move to `done` needs a recorded `check-fail` for that ref. `check_baseline` is 252 and the ledger is at v370, so a proof is required.
- `ledger-amend.py:684-689`: `record-fail` refuses when the check passes ("record-fail needs a failing run before the code exists").
- `check-ledger.py:407-412`: under the Stop hook (`--complete`), with `current_phase` null, any `open` row reports `open and due` (shown once per session, `block_once`).

So run `set-status open`, `set --test-ref` and `record-fail` back to back, and keep the open window short.

**Recommended NG-082 check** (new file `scripts/verify-ng-082-<slug>.mjs`, R1 shape `decisions.md` R1). It is derived, with no hand-kept "1.76.0":
1. Every installed `theia/node_modules/@theia/*/package.json` `version`, except `@theia/monaco-editor-core`, equals `configuration.toml` `upstreams.theia_release`. This covers the *installed* tree, which `verify-upstream-pins` does not.
2. Installed react, react-dom and both `@types` satisfy the installed `@theia/core` `peerDependencies`. (`shortcut:` a `^M.m.p || ...` parser; upgrade to `semver` if ranges grow.)
3. The major in `flake.nix` `nodejs = pkgs.nodejs_NN` satisfies `theia/package.json` `engines.node`.

**Failing direction for `record-fail`:** edit `configuration.toml:116` to `1.76.0` first. The installed tree is still 1.74.1, so assertion 1 fails, and that is the moment to record. Then run the mover, install and build, and it passes. This keeps checks-before-code and never commits a red `--quick` state.

**Sequence:** `set-status --id NG-082 --status open --phase 19 --reason "<retarget note>"` (moving the phase from 999.2 to 19 is earlier, so `phase_move_allowed` permits it), then `set --id NG-082 --test-ref "scripts/verify-ng-082-<slug>.mjs::<label>"`, then `record-fail --id NG-082 --cmd "node scripts/verify-ng-082-<slug>.mjs"`, then commit 3 and the live checks, then `set --evidence "<sha>: ... passes"`, then `set-status --status done`.

**`check_locks`** [VERIFIED: `ledger/REQUIREMENTS.json:1115-1170`]: 52 files are sha-locked, all named `scripts/verify-ng-0NN-*.mjs`. They include `"scripts/verify-ng-067-frontend-errors.mjs": "7fa4c850..."` and `"scripts/verify-ng-069-sidecar-egress.mjs": "8f507194..."`. Phase 19 must edit none of them.

**plan-gate `--phase 19`**: the due set today is `[('NG-074', 'open'), ('NG-084', 'open')]` (deferred-approved rows at phase ≤ 19, `plan-gate.py:46-68`) [VERIFIED: function run this session]. **Every Phase 19 plan set must cite NG-074 and NG-084** (precedent `17-04-PLAN.md:9-10`, a `ledger_note` explaining they are carried, not closed), and NG-082 once reopened.

## Common Pitfalls

### Pitfall 1: Theia Welcome opens at 1.76
**What goes wrong:** `getting.started.widget` opens beside `welcome`. **Why:** `GettingStartedContribution.onStart` opens it when `editorManager.all.length === 0` and `startupEditor` is `welcomePage` (the default) (`getting-started-contribution.ts:107-127`). **Avoid:** the `startupEditor: none` config default (measured). **Warning sign:** two main-area tabs on a fresh profile.

### Pitfall 2: Telemetry text decided by module order
Measured above. **Warning sign:** `core:PreferenceSchemaServiceImpl WARN Property with id 'telemetry.telemetryLevel' already exists` in the sidecar log. It was present in the unfixed run and absent in the fixed run, both measured.

### Pitfall 3: `gui07-mode-switch-tabs-live` goes red after RM-02
**What goes wrong:** the assertion at `verify-mode-switch-tabs-live.mjs:521-526` (`the live frontend registered perspective(s) no source accounts for`) sees `ai-first` (`AI_FIRST_PERSPECTIVE_ID = 'ai-first'`, `ai-first-perspective-contribution.ts:26`). The sink derivation at `:192-205` scans only `theia/extensions/*/src`. **Avoid:** derive upstream registrations from the installed tree: in `theia/node_modules/@theia/*/lib/**/*.js` files that call `registerPerspective(`, resolve their `*_PERSPECTIVE_ID = '...'` constants and add those ids to the accounted set. Update the header comment at `:50-57` (it cites the deleted file). The main-area exemption already chains every registered perspective (`modes/src/browser/main-area-exemption.ts:142`), so the `unchained` assertion stays green. The walk visits only default, shipped and boot-active ids (`:379`), so ai-first is never switched to. **Confidence:** MEDIUM. This is from reading the check; the full live row was not run.

### Pitfall 4: `yarn install` deletes drivelist.node and rewrites lib under a live sidecar
**Avoid:** rebuild drivelist after every install (17-01). Before any install or build, check that no `theia start`/`main.js` from this checkout is running (Pitfall 16). `.worktree-lock` is this session's own. **Warning sign:** `Cannot find module 'drivelist/build/Release/drivelist.node'` at backend boot, which was observed in scratch.

### Pitfall 5: Stale extension libs
The live tier serves `theia/extensions/*/lib`. Branding's lib dates from 2026-09-25. Run `yarn build` (both `build:extensions` and the app) before every live check, not just smoke-theia, which builds only `applications/browser` (`smoke-theia.sh:47`).

### Pitfall 6: Vacuous DOM absence (`theia-ide.org`)
Measured vacuous; see Pattern 4.

### Pitfall 7: React 19 forced error appears twice
React retries a failed render once, so `logError` saw `["frontend.uncaught-error","ForcedRenderError"]` **twice** at both React 19 trees. Assert `≥ 1` with the planted type, never `=== 1`. Overriding `widget.render` to throw directly does **not** produce a React render error: `ReactWidget.onUpdateRequest` calls `this.render()` eagerly, so it throws synchronously in Theia code (measured). The throw must happen inside a component function (Code Example 3).

### Pitfall 8: residue-scan counts
Stage new files first. A new `verify-platform.sh` comment that cites a `-PLAN.md` filename moves the frozen count of 49. Deleting `powerbrowser-ai-layout-contribution.ts` is safe: it appears only in rename-history `brand-identifier` rows, and post-rename mode reconciles only `frozen` and `coincidental` rows (`scan-brand-residue.mjs:31-38`) [VERIFIED: Read]. Re-run the scan after staging anyway.

### Pitfall 9: AI provider model discovery at 1.76
The 1.76 changelog says models "are discovered from the provider". Whether that sends anything with no key configured is [ASSUMED] to be nothing. Run `ng069-sidecar-egress` and `theia-endpoints` at 1.76.

## Code Examples

### 1. Fresh-boot probe core (measured working on the scratch sidecar)
```javascript
// Source: this session's scratch probe; DI walk pattern from scripts/verify-ng-067-frontend-errors.mjs:23-33
const shell = __get(c, 'ApplicationShell');
const areas = {}; for (const a of ['main', 'left', 'right', 'bottom']) areas[a] = shell.getWidgets(a).map(w => w.id);
const prefs = __get(c, 'PreferenceService'); await prefs.ready;
const startup = prefs.get('workbench.startupEditor');           // 'none' expected
const gs = !!shell.getWidgetById('getting.started.widget');      // false expected (+ positive control)
await __get(c, 'CommandRegistry').executeCommand('workbench.action.openGlobalSettings');
await shell.getWidgetById('settings_widget').setSearchTerm('telemetry.telemetryLevel');
// poll: document.querySelector('[data-pref-id="telemetry.telemetryLevel"] .pref-description').textContent
```

### 2. Order-independent telemetry registration (compiled at 1.74.1 and 1.76.0; measured)
```typescript
// Replaces telemetry-preferences.ts:58-66; also add PreferenceSchemaService to the :18-24 import.
export function bindTelemetryPreferences(bind: interfaces.Bind): void {
    bind(TelemetryPreferences).toDynamicValue(ctx =>
        createTelemetryPreferences(ctx.container.get<PreferenceService>(PreferenceService))).inSingletonScope();
    const contribution: PreferenceContribution = {
        // No `schema` field: registering in initSchema makes the outcome independent of module order.
        initSchema: async (service: PreferenceSchemaService) => {
            await Promise.resolve(); // run after every contribution's synchronous addSchema
            const own = TelemetryPreferenceSchema.properties[TELEMETRY_LEVEL_PREFERENCE];
            if (service.getSchemaProperty(TELEMETRY_LEVEL_PREFERENCE)) {
                service.updateSchemaProperty(TELEMETRY_LEVEL_PREFERENCE, { ...own }); // full property: default unchanged, no spurious change event
            } else {
                service.addSchema(TelemetryPreferenceSchema);
            }
        },
    };
    bind(TelemetryPreferenceContribution).toConstantValue(contribution);
    bind(PreferenceContribution).toService(TelemetryPreferenceContribution);
}
```
Pass the full property, not just the description. `updateSchemaProperty` fires a default-change event whenever `property.default` differs from the existing one, so a partial object would fire one with `undefined` (`preference-schema-service.ts:203-219`).

### 3. Forced React render-phase error (measured: reached the logger with type `ForcedRenderError`)
```javascript
// PowerBrowserWelcomeWidget is bound toSelf (transient): container.get returns a throwaway instance.
const w = c.get(welcomeKey); const el = w.render();
class ForcedRenderError extends Error {}
const Thrower = () => { throw new ForcedRenderError('forced'); };
const d = Object.getOwnPropertyDescriptors(el); d.type = { value: Thrower, enumerable: true }; d.props = { value: {}, enumerable: true };
const bad = Object.defineProperties({}, d); w.render = () => bad;
document.body.appendChild(w.node); w.onUpdateRequest({});
```
Cloning the descriptors of a real element avoids needing a `React` global; none is exposed (`window.React` is `null`). This is fragile against React internals. If it breaks, add a test-only throwing child to a PowerBrowser widget behind a flag.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `AIAgentConfigurationViewContribution.initializeLayout` force-opens the view | `AIConfigurationViewContribution`, no `initializeLayout` | 1.75.0 (#17820) | Rebind 2 is dead code and TS2724 at compile (measured) |
| React 18 or 19 accepted (`^18.3.1 \|\| ^19.0.0`) | `^19.0.0` peers only | 1.75.0 (#17932) | Commit 2 is required before commit 3 |
| `engines.node >=22` | `>=24` (Theia root) | 1.75.0 (#17936) | Commit 1 |
| `unload` layout save | `pagehide` | **Already in 1.74.1**: `default-window-service.ts:114-119` is identical at both versions [VERIFIED: tarball diff] | The roadmap's `pagehide` question is closed. No behaviour change in this phase |
| `@theia/getting-started` absent | Pulled by `@theia/ai-ide` (#17969) | 1.76.0 | Welcome default fix |
| No Theia telemetry pref | `@theia/telemetry` via `@theia/plugin-ext` (#17963) | 1.76.0 | `initSchema` fix. The new upstream `telemetry.filters` entry appears in Settings with upstream copy (V4) |

**Deprecated:** `theia build` webpack support (gone at 1.75; the tree already uses esbuild, and the scratch build passed in 5.6 s). `theia rebuild:browser` still exists at CLI 1.76.0 (measured: "native node modules are already rebuilt for browser").

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `tsc -b` leaves the deleted file's emitted `lib/*.js` behind | Runtime State Inventory | A stale module is harmless (nothing imports it), but `lib` drifts from `src`. Low |
| A2 | Startup window `error` events can be counted with BiDi `script.addPreloadScript` plus a reload | Pattern 4 | The zero-error assertion would need another capture route. Medium |
| A3 | 1.76 AI providers make no network call without a key | Pitfall 9 | New egress. `ng069-sidecar-egress` catches it |
| A4 | The carried-over fixture captured at 1.74.1 restores cleanly at 1.76 | Pattern 4 | It is what UPD-10 tests. A failure is a real finding, not a research error |
| A5 | gui07 live check red after RM-02 | Pitfall 3 | If the walk tolerates surplus elsewhere, the fix is unneeded. Run `--only gui07-mode-switch-tabs-live` after commit 3 to confirm either way |

## Open Questions

1. **NG-082 text cannot be edited by agent tools.** We know `set` lacks `--text` (`ledger-amend.py:302-307`). What is unclear is whether Chris accepts path (a), stale text plus 1.76.0 evidence, or path (b), DROP plus a new row. **Recommendation:** ask before plan 04 runs, and surface the exact commands.
2. **UPD-10 wording vs CONTEXT.** REQUIREMENTS.md UPD-10 says the telemetry collision is "decided by Chris and recorded", while CONTEXT makes it autonomous. **Recommendation:** follow CONTEXT, record the mechanism and the measured evidence in the SUMMARY, and flag it for Chris's acknowledgement.
3. **App `version` field.** Bump it to 1.76.0 (recommended: it has tracked the Theia release, and `verify-branding.mjs:201-208` derives it live) or leave it. Record the choice either way.
4. **Branding's `@theia/ai-ide` dependency.** Dropping it is optional and harmless. Recommendation: drop it in commit 3, since no import remains.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Nix + locked nixpkgs `nodejs_24` | Commit 1 | ✓ | 24.19.0 | — |
| node-gyp headers for 24.19.0 | drivelist | ✓ | Store path `nodejs-slim-24.19.0` used automatically; `~/.cache/node-gyp/24.19.0` also present | — |
| Host node | `--quick` checks outside the shell | ✓ | v24.19.0 | — |
| npm registry (network) | Commits 2 and 3 installs | ✓ | — | — |
| Built Gecko shell `objdir/dist/bin/powerbrowser` | Live tier | ✓ | 153.5.0esr (`upstream/browser/config/version_display.txt`) | — |
| Port 3939 | Live tier | ✓ free | — | Set `PB_VERIFY_PORT` |
| Port 3000 | — | held by another process | — | Never used |
| Carried-over fixture | UPD-10 | ✗ (must be captured) | — | Capture it in plan 01, before commit 3 |

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `scripts/verify-platform.sh` registry (bash plus node check scripts) |
| Config file | registry array at `scripts/verify-platform.sh:3573-4867` |
| Quick run command | `scripts/verify-platform.sh --quick` (the commit gate, with the R33 subtraction in `docs/non-gui/decisions.md:39-47`) |
| Single row | `scripts/verify-platform.sh --only <label>` |
| Full suite command | `scripts/verify-platform.sh` (run before `/gsd-verify-work`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Failing direction (must go red when…) | File Exists? |
|--------|----------|-----------|-------------------|------|------|
| UPD-07 | Shell is Node 24, lock untouched | smoke | `nix develop .#theia --command node -v` → `v24.19.0`; `git diff --quiet HEAD~1 -- flake.lock`; `--only smoke-theia` | `nodejs_22` left in `flake.nix:20`; any `flake.lock` byte change; node-pty spawn fails | ✅ smoke-theia |
| UPD-07 | drivelist built for Node 24 | smoke | `grep '"nodedir"' theia/node_modules/drivelist/build/config.gypi` contains `nodejs-slim-24.19.0` | A Node 22 build left in place | ✅ (command) |
| UPD-08 | One copy each of 5 packages | unit (`--quick`) | `--only single-copy-deps`, `--only single-copy-deps-self-test` | A planted nested `react` copy, a missing package, an absent `node_modules`; a symlinked duplicate must **not** count | ❌ Wave 0 |
| UPD-08 | React 19.2.8 installed | static | NG-082 check assertion 2, or `node -p "require('./theia/node_modules/react/package.json').version"` | 18.3.1 still installed | ❌ Wave 0 |
| UPD-09 | Pins agree at 1.76.0 | static (`--quick`) | `--only verify-upstream-pins` + `-self-test` | A member at 1.74.1; a lock stanza drift | ✅ |
| UPD-09 | Installed closure = manifest pin | static | NG-082 check | Manifest at 1.76.0 while installed 1.74.1 (the record-fail moment) | ❌ Wave 0 |
| UPD-09 | Core untouched | integration | `--only diff-theia-core` | Any byte under `node_modules/@theia` differs from a fresh resolve | ✅ |
| RM-02 | No D-22 override; ai-* stock | static | `! git ls-files theia/extensions/branding \| xargs grep -l "ai-ide"`; `--only theia-build-order`; `--only gui07-mode-switch-tabs-live` | The file or either rebind remains; the `@theia/ai-*` set differs from HEAD's 12; `ai-first` unaccounted | ✅ / gui07 needs edit |
| UPD-10 | Fresh: only `welcome`, `startupEditor` none, no getting.started | live | new first-boot row (fresh mode) | Main area ≠ `['welcome']`; positive control: getting-started command does not produce the widget | ❌ Wave 0 |
| UPD-10 | Carried-over: persisted layout restored, no Welcome added | live | same row (carried mode, fixture env var) | Main-area set ≠ fixture's persisted set; `getting.started.widget` present | ❌ Wave 0 |
| UPD-10 | Settings shows PowerBrowser telemetry copy | live | same row (N3) | Description ≠ the string read from `telemetry-preferences.ts` (the unfixed tree gives "Controls the level of telemetry.") | ❌ Wave 0 |
| UPD-10 | React 19 render errors reach capture | live | same row (N4) | The forced `ForcedRenderError` is not seen by `logError` | ❌ Wave 0 |
| UPD-10 | `view:` URIs open | live | `--only verify-uri-roundtrip` (covers `ai-configuration`, `verify-uri-roundtrip.mjs:104`) | Factory id renamed | ✅ |
| UPD-10 | Token gate live | live | `--only side02-token-negative`, `--only side02-token-positive` | 200 without a token / 403 with one | ✅ |
| N2 | Authored widgets render | live | `--only verify-branding`, `--only gui01-command-registered`, `--only gui02-web-tab-live`, `--only gui07-mode-switch-tabs-live`, `--only ng067-frontend-errors-reach-telemetry` | Empty widget / missing version / no capture | ✅ |
| N2 backstop | Dropdown anchor, dependent-window dark theme | manual | gsd-browser / KWin screenshot (memory notes) | Dropdown at origin; light secondary window | manual-only: DOM geometry and theme are not asserted by any row |

### Sampling Rate
- **Per task commit:** `scripts/verify-platform.sh --quick` with the R33 subtraction (empty output passes).
- **Per locked commit:** `--quick`, then `yarn build`, then the new first-boot row (fresh), `smoke-theia`, `side02-token-*` and `verify-uri-roundtrip`.
- **Phase gate:** full `scripts/verify-platform.sh`, the first-boot row in both modes, `python3 scripts/plan-gate.py --root . --phase 19 --plans <phase dir>`, `python3 scripts/phase-gate.py --root .`, and `node scripts/scan-brand-residue.mjs` after staging.

### Wave 0 Gaps
- [ ] `scripts/verify-single-copy-deps.mjs` (+ `--self-test`), covering UPD-08
- [ ] First-boot live check (fresh and carried-over modes, N1/N3/N4, with positive controls), covering UPD-10. It must be a new file because ng067 is locked
- [ ] The carried-over fixture captured on the pre-bump tree, outside the repo, read through an env var
- [ ] `scripts/verify-ng-082-<slug>.mjs` (+ self-test), covering UPD-09/NG-082. Write it **before** commit 3's pin edits
- [ ] `verify-mode-switch-tabs-live.mjs` upstream-perspective derivation, which must land in commit 3

**quick-baseline.txt (R33):** today it holds the 4 gui08 rows, and Phase 17 measured 114 PASS / 4 FAIL. With the placements above, no committed state adds a red `--quick` row: single-copy passes at every step, and the NG-082 check turns red and green inside commit 3's working tree. Refresh the file only if the measured FAIL set differs after commit 3. If it is unchanged, record "unchanged at the Phase 19 refresh" in `decisions.md:39`, following the Phase 17 wording precedent.

## Recommended plan split (≤ 20 items, ≤ 500 lines each; `size-gate.py`)

1. **19-01 Checks first (tracer).** Write the single-copy row and self-test, the first-boot live check and self-test, and the NG-082 check file (not yet registered as a ledger test_ref). Capture the carried-over fixture on the pristine tree. Run the first-boot check fresh and carried-over at **baseline**: it must pass, which proves the instrument works before anything moves. Commit 0 is checks only. Cite NG-074 and NG-084.
2. **19-02 Commit 1: Node 24.** Edit `flake.nix` only; `cmp flake.lock`; `node -v`; smoke-theia (it rebuilds drivelist; verify `nodedir`); `yarn build`; `--quick`; first-boot fresh.
3. **19-03 Commit 2: React 19 @ 1.74.1.** `checkpoint:human-verify` (SUS recency), edit two manifests, install, drivelist, build, frozen re-install, `--quick` (single-copy green on React 19), live N1/N2/N4 (N3 passes trivially at 1.74.1).
4. **19-04 Commit 3: Theia 1.76.0.** `checkpoint:human-verify`. NG-082: settle the open question with Chris, then `set-status open`, `set --test-ref`, edit `configuration.toml:116`, `record-fail`. Then the runbook mover, engines, app version, `startupEditor`, RM-02 deletion plus stale lib cleanup, telemetry `initSchema`, the gui07 check fix and the false comments (telemetry header, `verify-mode-switch-tabs-live.mjs:50-57`). Install, drivelist, build, frozen re-install, `verify-upstream-pins`, `diff-theia-core`, `--quick`, scan after staging. One commit.
5. **19-05 Live verification and close-out (docs commit).** First-boot row fresh and carried-over, `side02-token-*`, `verify-uri-roundtrip`, `gui07-mode-switch-tabs-live`, `ng067`, `ng069-sidecar-egress`, the manual dropdown and dependent-window backstops, then the full `verify-platform.sh`. NG-082: `set --evidence` and `set-status done`. Update `docs/BUILD.md:268-286` and `README.md:87`, decide quick-baseline, and write SUMMARY records (telemetry mechanism and evidence, the app version choice, the `theia-ide.org` deviation, NG-082 path).

## Security Domain

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Token gate (`@powerbrowser/token-gate`), proven live by `side02-token-negative`/`-positive` at 1.76 (Theia changed connection-token re-issue in #17762) |
| V3 Session Management | no | — |
| V4 Access Control | yes | `ng-038-actor-refuses-hostile-senders` (unchanged code; covered by the full run) |
| V5 Input Validation | no new input | — |
| V6 Cryptography | no | — |
| V14 Configuration / supply chain | yes | `--ignore-scripts` installs, exact pins, `--frozen-lockfile` re-install, `diff-theia-core.sh`, SUS checkpoints |

| Pattern | STRIDE | Mitigation |
|---------|--------|-----------|
| Malicious install script in a new transitive package | Tampering | `--ignore-scripts`; no postinstall on the pinned versions (verified) |
| New upstream egress (getting-started links, AI model discovery) | Information disclosure | `ng069-sidecar-egress`, `theia-endpoints` at 1.76; the getting-started links are click-only |
| Backend reachable without a token after the lifecycle change | Spoofing | Live `side02-token-*` |

## Sources

### Primary (HIGH confidence)
- npm tarballs (extracted in the scratchpad): `@theia/{core@1.74.1,core@1.76.0,telemetry,getting-started,ai-ide@1.74.1,ai-ide@1.76.0,ai-chat-ui,ai-core,preferences,plugin-ext,...}@1.76.0`. Read: the preference schema service, frontend-config defaults, getting-started contribution and preferences, the telemetry modules, the ai-configuration and ai-first contributions, the layout restorer and window service.
- Theia `v1.76.0` `package-lock.json` and `CHANGELOG.md` (raw.githubusercontent.com): React and types versions, breaking changes for 1.75.0 and 1.76.0.
- `npm view`: dist-tags, peers, publish times, install scripts. The `package-legitimacy` seam.
- Measured in scratch (Node 24 flake copy, manifest copies; the repo is untouched): three installs (baseline frozen, React 19 at 1.74.1, 1.76.0), seven-extension `tsc -b`, `theia build`, drivelist `node-gyp rebuild`, the node-pty spawn, the `PreferenceSchemaServiceImpl` order probes, and live sidecar probes on :3949 through `objdir/dist/bin/powerbrowser` BiDi (widget areas, startupEditor, Settings DOM text with the fix and without it, the forced render error).
- In-tree files Read this session: `flake.nix`, `theia/package.json`, `theia/applications/browser/package.json`, branding sources, `telemetry-preferences.ts`, `telemetry-frontend-module.ts`, `telemetry-error-capture.ts`, `verify-platform.sh`, `smoke-theia.sh`, `verify-upstream-pins.mjs`, `verify-mode-switch-tabs-live.mjs`, `verify-ng-067-frontend-errors.mjs`, `firefox-bidi.mjs`, `profile-storage.ts`, `view-factory-table.ts`, `ledger-amend.py`, `ledger-verify-hook.py`, `plan-gate.py`, `phase-gate.py`, `check-ledger.py`, `ledger/REQUIREMENTS.json`, `docs/BUILD.md:205-290`, `docs/non-gui/decisions.md`, `quick-baseline.txt`, `.github/workflows/verify.yml`.

### Secondary (MEDIUM)
- `.planning/research/STACK.md`, `PITFALLS.md` (2026-10-16). Re-verified where cited. STACK's "keep rebind 1" is superseded by CONTEXT.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH. Registry, upstream lock and three measured installs.
- Architecture and fixes: HIGH for Welcome and telemetry (both measured live, with positive controls). MEDIUM for the gui07 consequence (read, not run).
- Ledger mechanics: HIGH. Source read; the text-edit gap is in the code.
- Pitfalls: HIGH, except A2 and A3.

**Scratch evidence:** `/tmp/nix-shell.aDyem4/claude-1000/-home-chris-coding-Power-Browser/00a95695-3390-43d6-be13-e032e495c46a/scratchpad/` contains `t176/`, `t174r19/`, `tbase/`, `flake24/`, `probe/` and `side-*.probe`/`side-*.log`. It is disposable.

**Research date:** 2026-10-17
**Valid until:** 2026-11-16 (pins are exact; recheck if Theia 1.77.0 ships before execution)
