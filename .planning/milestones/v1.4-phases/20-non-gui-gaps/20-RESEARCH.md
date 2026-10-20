# Phase 20: Non-GUI Gaps - Research

**Researched:** 2026-10-17 (HEAD `5607e1b`, 102 commits ahead of `origin/main` = `5bba4e3`)
**Domain:** Verification registry rows, a fresh-clone build gate, ledger mechanics, generator concurrency
**Confidence:** HIGH for the code facts and the root causes (every cited line was re-read this session, and PLAT-04's two causes were reproduced). MEDIUM for timings and plant failure texts that no run has produced yet (marked [ASSUMED]).

## Summary

No product code is broken. All five gaps are missing records or missing checks, plus one real concurrency defect (PLAT-04):

- **PLAT-01** was fixed in `cd8c4c1` and proven by GitHub CI at `5bba4e3` (2026-09-28, "Install and build the Theia workspace: success"). No fresh-clone build has run since on the final dependency set (Theia 1.76.0 / React 19 / Node 24). What is missing is one recorded fresh-clone run at HEAD plus a full-tier row that keeps it from regressing. The gap's own suggested proof (`rm -rf theia/extensions/*/lib && yarn build:extensions`) tests nothing: under `composite` / `incremental`, `tsc -b` reads `tsconfig.tsbuildinfo` (which sits outside `lib/`) and reports "up to date" with `lib/` empty.
- **PLAT-02** has no check. The channel is wider than the gap record says: there are 7 dispatch sites in 5 frontend files, not 1 site in `group-actor-client.ts`. The reply is no longer cloned with `cloneInto`, so the v1.4 research is stale on that point.
- **PLAT-03** is records only. Schema v3 (`x`, `y`) and v4 (`ord`) landed together in `7b7a1f7`, and neither has a ledger row. The behaviour passes today, so a red can only be recorded against the pre-v3 writer at `b9412fa`. Chris's ledger step is `lock-checks`, not `approve`: `approve` refuses any row that is not `deferred-requested`.
- **PLAT-04** was reproduced, and it has two separate causes. Both need cross-process concurrency, which explains why every sequential run passes and CI never fails:
  - (A) inkscape 1.4.4 aborts (`Gio::DBus::Error`, rc=134) when several instances start at the same time on the session bus.
  - (B) `verify-downstream-fixture.mjs` rewrites the shared `generated/` tree in place.
- **PLAT-05:** five script references point into `.planning/phases/`. None of them resolves literally. Each survives only through its own milestone-specific fallback, and no row notices when a fallback breaks.

**Primary recommendation:** Run five plans in strict sequence, PLAT-04 first. PLAT-04 removes the concurrency flake that would otherwise hit every later plan's `--quick`. Then PLAT-05, PLAT-02 and PLAT-03 (each a derived `--quick` row with a planted-fault self-test). PLAT-01 runs last, as the fresh-clone build of the phase's final HEAD, together with Chris's `lock-checks` and the `-purgecaches` doc line.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- PLAT-01 (G-14.1.1-9): a build from a clean checkout passes, including
  `yarn build:extensions`. The clean checkout is a fresh clone outside the repo,
  or a quiet tree. Never `git clean` or reset the main checkout.
- PLAT-02 (G-14.1.1-10): a `--quick` group-channel row with a `--self-test` that
  plants faults; each planted fault must go red naming the drift. Derive the
  expectation from the tree, do not hand-keep it (CLAUDE.md verification rule 2).
- PLAT-03: the schema v3/v4 work gets ledger rows. The agent creates rows only with
  the agent-allowed `ledger-amend.py` subcommands. Any step that needs Chris
  (approve, lock-checks, drop) is a blocking-human checkpoint that gives him the
  exact terminal command, starting with `cd /home/chris/coding/Power-Browser` on its
  own line.
- PLAT-04: `generate-check` is either closed as not reproducible, with passing runs
  recorded in both the host shell and `nix develop .#theia`, or reproduced and
  fixed. Phase 19's verifier saw `verify-downstream-fixtures` go red once in
  `--quick` ("restored generated/ hashes differ"), then pass on re-run; research
  whether that is the same flake (a concurrent `--quick` writing generated/).
- PLAT-05: every verify-script path into `.planning/phases/` resolves to its
  archived location (`.planning/milestones/v*-phases/...`), or the check fails
  naming the missing path. The fix is a derived check, not a hand-kept path list.
- Add the `-purgecaches` line to `docs/BUILD.md` (edits to powerbrowser/shell/*.js
  need `-purgecaches` or they silently do not run).
- Live checks use `PB_VERIFY_PORT` (default 3939); never touch port 3000.
- Never fork or patch Theia core; never hand-edit `upstream/`.
- Refresh `docs/non-gui/quick-baseline.txt` (R33) only by derivation, if the FAIL
  set changes. The 4 gui08 rows stay red until Phase 21.

### Claude's Discretion
Everything else, guided by ROADMAP success criteria, the v1.4 research files and
this phase's research.

### Deferred Ideas (OUT OF SCOPE)
None.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PLAT-01 | A build from a clean checkout passes (G-14.1.1-9) | The fix (`cd8c4c1`) is in the tree. The static gate `theia-build-order` passes. `scripts/fresh-clone-verify.py` exists and is unused. The CI build line to reuse is `.github/workflows/verify.yml:82-83`. Design: "PLAT-01" below |
| PLAT-02 | The group channel has a `--quick` check with a planted-fault self-test (G-14.1.1-10) | All 7 dispatch sites, the registration, the jar alias and the child clone shape were located and re-read. Derivation D0-D6 and the 11(+1) plants are below |
| PLAT-03 | The schema v3/v4 work has ledger rows, approved by Chris | v3/v4 DDL and the pre-v3 parent `b9412fa` were verified. The ledger is at v378 and NG-086 is the last id. The agent command sequence and Chris's `lock-checks` step are below |
| PLAT-04 | `generate-check` is closed as not reproducible with passing runs recorded, or reproduced and fixed | Reproduced, with two causes (A: inkscape bus race; B: the harness writes the shared `generated/`). There is one inkscape spawn site (`generate.mjs:2911`). Fix and self-test design below |
| PLAT-05 | Every verify-script path into `.planning/phases/` resolves to its archived location, or the check fails loudly | Five literals were found by `git grep` and re-read. Design for the derived `planning-paths` row below |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Never fork or patch Theia core.** This phase edits no `@theia/*` code.
- **Never modify Gecko outside the patch stack.** PLAT-02's D2 *reads* `upstream/browser/components/DesktopActorRegistry.sys.mjs` and never writes it.
- **Design for the bridge.** This phase does not touch it.
- **The repo path contains no space.** The PLAT-01 row must also refuse a `TMPDIR` that contains a space, because the clone and `nix develop` run there. Today's `TMPDIR=/tmp/nix-shell.aDyem4` contains none.
- **Theia is the default GUI.** Not affected.
- **The residue scan is a permanent gate, and it reads `git ls-files`.** Stage every new script before trusting a green `scan-brand-residue`. The same applies to the new `planning-paths` row.
- **Patches are regenerated, never text-edited.** Not applicable.
- **One driver, one registry.** Every new check is a row in `scripts/verify-platform.sh`, never a sibling driver. A row must be `bash <path>`, `node <path>`, or a bare function name. Anything else hits the non-function branch and FAILs (`verify-platform.sh:4941-4968`, Read this session).
- **Verification rules:**
  - Never assert the absence of a log line over an emitter you also wrote.
  - Derive the expectation from the tree, never hand-keep it.
  - Every new check gets a `--self-test` whose plants each go red naming the drift.
- **User-facing copy.** Not affected: every string in this phase is checker output.
- **Builds run in `nix develop .#theia`.** `yarn` does not work outside it. `node` does (host `v24.19.0`).
- **Memory notes in force:**
  - `concurrent-sessions-on-main`: commit by explicit path; no `-a`, `--amend` or stash; re-read STATE.md.
  - `one-fix-at-a-time-confirmed`: superseded for v1.4. Run autonomously, take the recommended options, and stop only for ledger approvals, live checks or a push.
  - `chrome-js-startup-cache`: the source for the BUILD.md line.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Clean-checkout build proof (PLAT-01) | Full-tier registry row → `fresh-clone-verify.py` in a mkdtemp clone | CI `verify.yml:82-83` (same command, read by the row) | Needs the dev shell, the yarn cache and minutes, so it cannot run in `--quick`. A clone isolates it from the main tree's stale `lib/` and `tsbuildinfo` |
| Group channel contract (PLAT-02) | `--quick` static row over chrome-side sources (`PowerBrowserAPI.sys.mjs`, `GroupActorChild.sys.mjs`, `jar.mn`) and frontend sources (`theia/extensions/*/src`) | `upstream/` (read-only, for the derived scheme set); `gui02-web-tab-live` stays the end-to-end proof | All five recorded faults are visible in source text |
| v3/v4 behaviour rows (PLAT-03) | Ledger (`ledger-amend.py` agent subcommands) plus two `--quick` offline checks over `scripts/lib/tab-store-fakes.mjs` | Chris's `lock-checks` | The real writer runs in node over `node:sqlite`, so no browser is needed |
| Raster determinism (PLAT-04 A) | `generate.mjs` `iconPngBytes` spawn env | `generate --self-test` | Fixed at the one spawn site |
| Shared `generated/` isolation (PLAT-04 B) | `verify-downstream-fixture.mjs` (the harness) plus a `generate.mjs --out` flag | Harness self-test | The harness is the only writer that rewrites the shared tree during a check |
| Planning-path resolution (PLAT-05) | `--quick` row over tracked `scripts/` and `.github/` against `git ls-files` | — | Checking tracked files is what a clean checkout and CI see |

## Standard Stack

No packages are installed in this phase. Every new check uses the Node standard library (`node:fs`, `node:child_process`, `node:path`, `node:os`) or bash, the same as its siblings.

| Tool | Version | Use | Evidence |
|------|---------|-----|----------|
| Node (host and `.#theia`) | 24.19.0 | Every new `.mjs` check | `node -v` → `v24.19.0` [VERIFIED: run this session] |
| inkscape | 1.4.4 (dcaf3e7d9e, 2026-05-05) | Icon rasters in `generate.mjs` | `inkscape --version` [VERIFIED: run this session] |
| Python | 3.14.7 | `fresh-clone-verify.py`, the ledger kit | `command -v python3` → nix store `python3-3.14.7` [VERIFIED] |
| TypeScript | 5.9.3 (`theia/package.json`) | `tsc -b` build-mode semantics (Pitfall 1) | PLAT-01 report, from reading `theia/node_modules/typescript/lib/typescript.js` [CITED: PLAT-01 report] |

## Package Legitimacy Audit

Not applicable: this phase installs no external package. The PLAT-01 clone runs `yarn install --ignore-scripts --frozen-lockfile` on the lock already committed and audited in Phase 19.

**Packages removed due to [SLOP]:** none. **Packages flagged [SUS]:** none.

## Architecture Patterns

### System Architecture Diagram

```
                         ┌────────────── scripts/verify-platform.sh (one registry) ──────────────┐
  --quick array (:3576-4578)                                              full-only CHECKS+= (:4581-)
   │                                                                        │
   ├─ planning-paths ──▶ git ls-files ─▶ scan scripts/ .github/ literals ─▶ resolve vs tracked set ─▶ FAIL names path
   │
   ├─ group-channel ──▶ PowerBrowserAPI.sys.mjs (GROUP_ACTOR_NAME, registerGroupActor)
   │                    GroupActorChild.sys.mjs (guard name, win.CustomEvent detail)
   │                    jar.mn (% resource alias, packaged basename)
   │                    upstream DesktopActorRegistry (child esModuleURI scheme set)
   │                    theia/extensions/*/src (literals, 7 dispatch sites) ─▶ D0..D6 ─▶ FAIL names file/fault
   │
   ├─ ng-087 / ng-088 ──▶ tab-store-fakes.freshApi(real writer) ─▶ place/order ─▶ restart ─▶ reader SQL from
   │                      tab-query-service.ts ─▶ compare        (--at <rev>: same, writer via git show)
   │
   ├─ generate-check / generate-self-test ──▶ generate.mjs ──▶ inkscape (env RASTER_ENV, bus disabled)
   └─ verify-downstream-fixtures(-self-test) ──▶ harness ──▶ generate.mjs --out <mkdtemp> (never generated/)
                                                                            │
                                                     theia-fresh-clone-build (+ -self-test)
                                                       ▶ read verify.yml build line
                                                       ▶ fresh-clone-verify.py --commit HEAD
                                                           ▶ mkdtemp clone ▶ nix develop .#theia
                                                           ▶ yarn install --frozen ▶ drivelist ▶ yarn build
                                                           ▶ "fresh-clone-verify: ok" | FAIL
```

### Recommended plan split (strict sequence; each plan small)

Every plan except 20-01 appends rows to `scripts/verify-platform.sh`. With `use_worktrees: false`, two plans editing that file, or running `--quick` at the same moment, is the Cause B condition this phase fixes. Run them one after another.

| Plan | Wave | Requirement | Files | Chris |
|------|------|-------------|-------|-------|
| **20-01** Generator concurrency | 1 | PLAT-04 | `scripts/generate.mjs`, `scripts/verify-downstream-fixture.mjs`, `docs/non-gui/decisions.md` (R28) | — |
| **20-02** Planning paths | 2 | PLAT-05 | `scripts/verify-platform.sh` (wrapper literals at :286-293 and :307-311; 2 rows), `scripts/verify-sql-store-soak.mjs`, `scripts/verify-strip-spike-verdict.mjs`, `scripts/verify-dependent-window-content.mjs`, new `scripts/verify-planning-paths.mjs` | optional (CLAUDE.md:145) |
| **20-03** Group channel | 3 | PLAT-02 | new `scripts/verify-group-channel.mjs`, 2 rows after `verify-platform.sh:3768`; paperwork: 14.1.1-UAT G-14.1.1-10, `GUI-DEFECTS.md` item 13, `.planning/research/FEATURES.md:56` | — |
| **20-04** Schema v3/v4 rows | 4 | PLAT-03 | Task 1 is a blocking checkpoint (row texts and the red-at-`b9412fa` method). Then 2 new `scripts/verify-ng-08{7,8}-*.mjs`, 4 rows, and the ledger sequence | **blocking** (text acceptance) |
| **20-05** Fresh clone, docs, re-lock | 5 | PLAT-01 | new `scripts/verify-theia-fresh-clone-build.sh` with 2 full-tier rows, the evidence run at the final code HEAD, the 14.1.1-UAT G-14.1.1-9 flip with real hashes, `.planning/research/FEATURES.md:38-41`, the `docs/BUILD.md` `-purgecaches` line. The last task is Chris's `lock-checks` | **blocking** (`lock-checks`) |

Why this order:
- **20-01 first.** It makes every later `--quick` run immune to Cause A and Cause B.
- **20-02 after 20-01.** Both affect how the `verify-downstream-fixtures` row runs (20-02 repoints its wrapper; 20-01 changes its harness), so verify them one at a time.
- **20-05 last.** The fresh clone sees only committed HEAD, so it must run after every code commit. `lock-checks` must hash the NG-087/088 check files in their final form, after the done commit.
- **Ledger citations.** Every plan cites NG-074 and NG-084. Both are deferred-approved to phase 15, so `plan-gate.py` counts them as due; follow the 17-04 `ledger_note` precedent. Plan 20-04 also cites NG-087 and NG-088.

---

### PLAT-01: fresh-clone build (G-14.1.1-9)

**Facts** (each read this session):
- `theia/package.json:69` `build:extensions` order: branding → token-gate → tab-uris → customize → telemetry → modes → chrome-bar. `:70` `"build": "yarn build:extensions && yarn --cwd applications/browser build"`.
- `tab-uris` imports `@powerbrowser/token-gate/lib/node/powerbrowser-env` at `tab-query-service.ts:28` and `tab-store-access-endpoint.ts:27`. The gap record says `:26`; the line has moved.
- The `closed_by` hashes in the gap (`14.1.1-UAT.md:655`), `90f7b89`, `f30ec64`, `d4a3ac2` and `051f70b`, give `fatal: Not a valid object name`. The real commits are:
  - `cd8c4c1` "fix(14.1.1-08): build token-gate before tab-uris and declare the edge"
  - `b991b2d` (the gate)
  - `32b144d` (the rows)
  - `4ce6f34` (side-effect imports)
- `cd8c4c1` is an ancestor of `5bba4e3` [VERIFIED: `git merge-base --is-ancestor`].
- CI build line, `verify.yml:83`, verbatim:
  `run: nix develop .#theia --command bash -c 'cd theia && yarn install --ignore-scripts --frozen-lockfile && { if [ -d node_modules/drivelist ]; then (cd node_modules/drivelist && node-gyp rebuild); else echo "theia install - node_modules/drivelist is absent, the pinned workspace changed its native deps" >&2; exit 1; fi; } && yarn build'`
- `fresh-clone-verify.py`:
  - Arguments are `--repo`, `--commit`, `--cmd` and `--timeout` (default 300).
  - It clones into `mkdtemp(prefix="fresh-clone-verify-")` and runs `sh -c` in a new session.
  - On timeout it `killpg`s the process group.
  - It prints the captured output only when the command ends, then `fresh-clone-verify: ok` or `... command failed with exit N`.
  - It always removes the clone in `finally` (`:16-82`).
  - Nothing in the registry calls it.

**One-time evidence run.** Run it at the final code HEAD of 20-05, outside the main checkout:
```
python3 scripts/fresh-clone-verify.py --repo /home/chris/coding/Power-Browser --commit "$(git rev-parse HEAD)" --timeout 1800 --cmd "<the verify.yml:83 run: value>"
```
Save the output under `.planning/phases/20-non-gui-gaps/logs/`. Note that `*.log` is git-ignored (`.gitignore:53`), so quote the key lines in the SUMMARY and VERIFICATION.

**Regression rows (full tier, inside `if [ "$QUICK" -eq 0 ]`):**
```
"theia-fresh-clone-build|bash $REPO_ROOT/scripts/verify-theia-fresh-clone-build.sh"
"theia-fresh-clone-build-self-test|bash $REPO_ROOT/scripts/verify-theia-fresh-clone-build.sh --self-test"
```

The script does the following:
- (a) It FAILs if `${TMPDIR:-/tmp}` contains a space (hard rule 4).
- (b) It extracts the `run:` value of the step named `Install and build the Theia workspace` from `verify.yml`. If that is missing, it FAILs with a distinct broken-instrument message.
- (c) It runs `python3 scripts/fresh-clone-verify.py --repo "$REPO_ROOT" --commit "$(git rev-parse HEAD)" --timeout 1800 --cmd "$cmd"`.
- (d) It PASSes only on `fresh-clone-verify: ok`.

Calling python3 *inside* the bash script is fine. Only the registry row itself must start with `bash`.

**Self-test plants.** The self-test clones and installs once, then runs a baseline build that must pass. Before each plant it runs `git checkout -- .` *in the clone*, then every extension's `yarn clean`, then `yarn build`, which must fail with the named text. The plants go in through an in-clone mode of the script, so the script must be committed before its self-test can run.

| Plant | Fault | Must go red naming |
|---|---|---|
| P1 | Swap `token-gate` and `tab-uris` in `build:extensions` (the original defect) | `@powerbrowser/token-gate/lib/node/powerbrowser-env` (TS2307) [ASSUMED text] |
| P2 | Named import of the lib-only `@powerbrowser/tab-uris/lib/browser/browser-tab-uri` from chrome-bar src (the stale-lib class; that `.js` exists in the main tree with no source) | that specifier [ASSUMED text] |
| P3 | `web-tab.ts:8` `import '../../src/browser/web-tab.css'` → `import './web-tab.css'` (CSS is never copied into `lib`; tsc does not check side-effect imports, so only esbuild catches it) | `web-tab.css` [ASSUMED text] |

The static gate `theia-build-order` cannot see P2 or P3. That is why this row exists.

### PLAT-02: group-channel row (G-14.1.1-10)

**Facts** (each read this session):
- `PowerBrowserAPI.sys.mjs`:
  - `:246` `const GROUP_ACTOR_NAME = "PowerBrowserGroup";`
  - `:255` `const GROUP_ACTOR_CHILD_MODULE = "resource://powerbrowser/GroupActorChild.sys.mjs";`
  - `:256` the parent on `chrome://powerbrowser/content/PowerBrowserAPI.sys.mjs`
  - `registerGroupActor()` at `:2170-2201`, with `:2196` `PowerBrowserGroupRequest: { capture: true, wantUntrusted: true },` and `:2199` `matches: [\`${GROUP_ACTOR_THEIA_ORIGIN}/*\`]`
- `jar.mn`: `:23` `%  resource powerbrowser %content/powerbrowser/`, and `:28` packages `GroupActorChild.sys.mjs`.
- `GroupActorChild.sys.mjs`:
  - `:28` `export class PowerBrowserGroupChild extends JSWindowActorChild`
  - `:30` guard `event.type !== "PowerBrowserGroupRequest"`
  - `:115-118` reply: `new win.CustomEvent("PowerBrowserGroupResponse", { detail: win.wrappedJSObject.JSON.parse(JSON.stringify({ requestId, reply })) })`
  - `:134-137` the `PowerBrowserWebTabState` push uses the same round trip. There is no `cloneInto` (FEATURES.md:56 is stale).
- **Frontend literal files: 5** (code literals once comments are stripped):
  - `modes/src/browser/group-actor-client.ts:18-19`
  - `tab-uris/src/browser/browser-window-command.ts:39,41`
  - `chrome-store-client.ts:15-16`
  - `profile-storage.ts:33-34` (bound as `SHELL_STATE_REQUEST_EVENT` / `SHELL_STATE_RESPONSE_EVENT`)
  - `web-tab.ts:66-67`

  The PLAT-02 report counted 6. The sixth is `tab-uris/src/node/tab-store-relay.ts:5`, a comment, which D3 strips. So the derived file count is 5. [VERIFIED: `git grep` and read]
- **Dispatch sites: 7**, all `document.dispatchEvent`:
  - `group-actor-client.ts:90`
  - `browser-window-command.ts:149` and `:234` (the variable form `return !document.dispatchEvent(request);`)
  - `chrome-store-client.ts:110`
  - `profile-storage.ts:139` and `:249`
  - `web-tab.ts:263`

  [VERIFIED: `git grep dispatchEvent`]
- The existing `gui02-web-tab-bridge` rows (`verify-platform.sh:3767-3768`) check event-name agreement and ban `cloneInto`. They do not check `wantUntrusted`, the child scheme, the jar alias, the dispatch target, `bubbles`, the reply clone, or the names in `chrome-store-client.ts` and `profile-storage.ts`.
- `scripts/verify-group-channel.mjs` does not exist [VERIFIED: `git ls-files`].

**Script:** `scripts/verify-group-channel.mjs`. Copy `stripComments`, `derive`, `diff` and `apiMethodBody` from `verify-web-tab-bridge.mjs:61-107`; do not import them, because that file runs `main()` when loaded. Register directly after `:3768`:
```
"group-channel|node $REPO_ROOT/scripts/verify-group-channel.mjs"
"group-channel-self-test|node $REPO_ROOT/scripts/verify-group-channel.mjs --self-test"
```

**Derivations.** Comments are stripped first. A zero result from any derivation is a broken instrument and FAILs:

| # | Derives | Red when |
|---|---|---|
| D0 | Request name from the child guard. Response name from the child `new win.CustomEvent("…"` minus the `receiveMessage` name. Prefix from `GROUP_ACTOR_NAME` | Any derivation is empty ("ZERO") |
| D1 | The `events` entry keyed by the request name inside `registerGroupActor` | Entry missing, or `wantUntrusted: true` absent or false. A separate named assertion |
| D2 | Scheme of `GROUP_ACTOR_CHILD_MODULE` ∈ the child `esModuleURI` scheme set derived from `upstream/browser/components/DesktopActorRegistry.sys.mjs` (`{resource, moz-src}`; no `chrome:` child exists). The URI host must be a `% resource <host>` line in `jar.mn`, its basename a packaged `jar.mn` entry, and `child.esModuleURI` must reference the const | `chrome:` scheme, alias missing, or basename not packaged |
| D3 | Every `git ls-files theia/extensions/*/src/**/*.ts(x)` with a `'<prefix>…'` literal | A literal not in the child's DOM names |
| D4 | Every `new CustomEvent(B` where B is the request literal or a binding of it. The options object is brace-matched | Not `document.dispatchEvent(` (inline or through the assigned variable), no `bubbles: true`, or a request-naming file with 0 sites |
| D5 | Every `new win.CustomEvent(` in the child | `detail:` is not `win.wrappedJSObject.JSON.parse(JSON.stringify(`, or a CustomEvent in the child is not built as `win.CustomEvent` |
| D6 (recommended) | `addEventListener(<response binding>` per file | Listener not on `window`. The child dispatches on `win` without bubbling, so a `document` listener never fires |

The PASS line prints the counts of sites, files and children, and states what the row does not assert ("static; `gui02-web-tab-live` is the runtime proof").

**Self-test.** The clean tree must be green first. Each plant asserts that it modified its source ("anchor drifted" otherwise):
1. Child path back to `chrome://powerbrowser/content/GroupActorChild.sys.mjs` → expect `GROUP_ACTOR_CHILD_MODULE`.
2. `wantUntrusted: true` → `false` → expect `wantUntrusted`.
3. `, wantUntrusted: true` deleted (the 15-01 shape) → `wantUntrusted`.
4. `window.dispatchEvent` at `chrome-store-client.ts:110` → that file and `document`.
5. `return !window.dispatchEvent(request)` at `browser-window-command.ts:234` → `browser-window-command`.
6. `bubbles: true` → `false` at `group-actor-client.ts:91` → `bubbles`.
7. `bubbles: true,` deleted at `profile-storage.ts:140` → `profile-storage`.
8. `detail: { requestId, reply }` (round trip removed) at `GroupActorChild.sys.mjs:117` → the clone wording.
9. `% resource powerbrowser` line removed from `jar.mn` → `jar.mn`.
10. Request name respelled at `profile-storage.ts:33` → the misspelled name.
11. Child guard renamed so nothing derives → `ZERO`.
12. (D6) Response listener moved to `document` → the file and `window`.

Plants 1-3, 4-7 and 8 cover the gap's five faults. Plants 3, 5, 7 and 11 cover the second form of a fault and the broken-instrument case.

### PLAT-03: ledger rows NG-087 and NG-088

**Facts:**
- `PowerBrowserAPI.sys.mjs:50` `const TAB_STORE_SCHEMA_HEAD = 6;`
- `:83-84` `ALTER TABLE tabs ADD COLUMN x INTEGER NULL;` / `ALTER TABLE tabs ADD COLUMN y INTEGER NULL;` (`TAB_POSITION_V3_DDL`)
- `:89` `ALTER TABLE tabs ADD COLUMN ord INTEGER NULL;` (`TAB_ORDER_V4_DDL`)
- Reader `tab-query-service.ts:259`: `'SELECT uri, url, title, last_active, group_id, thumbnail, x, y, ord FROM tabs WHERE group_id = ? AND closed_at IS NULL ORDER BY ord IS NULL, ord, uri'`
- `7b7a1f7` (2026-09-25) is "wip(organising): Panorama canvas, tab store schema v3/v4 (work of 2026-09-09..14)". Its parent `b9412fa260d425deb3fb9a08c82a5b4ba39a8800` has `const TAB_STORE_SCHEMA_HEAD = 2;` [VERIFIED: `git show`]
- `scripts/lib/tab-store-fakes.mjs` exports `freshApi(profile, source = API)` (`:184`) and `closeAll()` (`:193`).
- **Ledger** (`ledger-report.py`, this session): 86 rows (done 53, deferred-approved 9, dropped 24), phase unset, due 0. NG-086 is the last id. NG-074 and NG-084 are deferred-approved, owner chris, phase 15.
- **Agent-allowed commands** (`.claude/hooks/ledger-verify-hook.py:34-36`, Read):
  - `AGENT_SUBCOMMANDS = {"init", "add", "set", "set-status", "set-phase", "import-brainstorm", "record-handoff", "record-fail"}`
  - `AGENT_STATUSES = {"open", "done", "verified", "deferred-requested"}`
- **`ledger-amend.py` behaviour** (Read):
  - `add` creates the row with `"status": "open"` (`blank_row`, `:62-66`) and refuses an id ever added (`:381-382`).
  - `set` has no `--text` (`:302-307`). **Row text is fixed at `add`.**
  - `approve` refuses any status other than `deferred-requested` (`:444-446`): `"approve needs status deferred-requested (found {status})"`.
  - `record-fail` needs the check path in `--cmd` (`:655`) and refuses a passing run (`:685-689`). It stores the sha256 of the check file, and its default `--timeout` is 300 (`:341`).
  - `lock-checks --commit <sha>` hashes every due row's test file at that commit (`:721-769`).
- **`phase-gate.py`** (`:120-163`, Read):
  - Each row needs its own check.
  - A done row completed after `check_baseline` needs a recorded failure for exactly its `test_ref`.
  - A recorded failure is "stale" only if the file is in `check_locks` and its hash differs.
  - Every locked file must still match its hash.

**Checks** (one file per row, R1 convention):
- `scripts/verify-ng-087-loose-position-across-restart.mjs`: place a loose terminal and a web tab, set positions, close, open a fresh writer and `ensureTabStore()`, then re-track. Assert:
  - the terminal keeps its (x, y);
  - the web row becomes closed-tab history with (x, y) kept;
  - `writeTabRow` reopening brings the position back;
  - the reads use the loose-tab SQL taken from `tab-query-service.ts` at check time.
- `scripts/verify-ng-088-group-order-across-restart.mjs`: set a non-URI order on a group of terminal, web and terminal tabs, restart, re-track, and require the derived group SQL to return that order.
- Both use `writeTabRow` (present at both revisions). Call `setGroupSenderPort` only when it exists, with a one-line comment that it is absent at `b9412fa`.
- `--at <rev>` mode: read the writer and reader through `git show <rev>:path` into a temp stage. If `git show` fails, FAIL naming that cause. That is a broken instrument, not a valid red.
- `--self-test`:
  - NG-087: (a) setTabPosition binds `x: null, y: null`; (b) closeEndedWebRows adds `x = NULL, y = NULL`; (c) trackShellTab loses `AND closed_at IS NOT NULL`; (d) the loose reader drops `x, y`.
  - NG-088: (a) `ord: index` → `ord: uris.length - 1 - index`; (b) reader `ORDER BY uri`; (c) the same trackShellTab plant.
  - A missing anchor fails the self-test and says so.
- Rows go into `--quick` beside ng-016/019/020 (`verify-platform.sh:3870-3872`): `ng-087-loose-position-across-restart`, `ng-087-loose-position-across-restart-self-test`, `ng-088-group-order-across-restart`, `ng-088-group-order-across-restart-self-test`.

**Sequence** (each a single plain command from the repo root, no shell operators):
1. **Checkpoint (blocking-human):** Chris accepts the two row texts and the red-at-`b9412fa` method. This must come before `add`, because no agent command can change the text afterwards. A rejected text would then cost Chris a DROP plus a new id.
2. Commit the two check files and four rows by explicit path. Never edit the check files again: the recorded hash must match the file that gets locked.
3. For NG-087 (then the same for NG-088):
   ```
   python3 scripts/ledger-amend.py --root . add --id NG-087 --text "<accepted text>" --spec-ref ".planning/REQUIREMENTS.md PLAT-03"
   python3 scripts/ledger-amend.py --root . set-status --id NG-087 --status open --phase 20
   python3 scripts/ledger-amend.py --root . set --id NG-087 --test-ref "scripts/verify-ng-087-loose-position-across-restart.mjs::ng087-loose-position-across-restart" --code-ref "powerbrowser/shell/PowerBrowserAPI.sys.mjs TAB_POSITION_V3_DDL, migrateTabStoreToV3, setTabPosition, closeEndedWebRows"
   node scripts/verify-ng-087-loose-position-across-restart.mjs --at b9412fa260d425deb3fb9a08c82a5b4ba39a8800
   python3 scripts/ledger-amend.py --root . record-fail --id NG-087 --cmd "node scripts/verify-ng-087-loose-position-across-restart.mjs --at b9412fa260d425deb3fb9a08c82a5b4ba39a8800"
   node scripts/verify-ng-087-loose-position-across-restart.mjs
   python3 scripts/ledger-amend.py --root . set --id NG-087 --evidence "<H>: ng087-loose-position-across-restart PASS at head; red recorded against b9412fa (pre-v3 writer)"
   python3 scripts/ledger-amend.py --root . set-status --id NG-087 --status done
   ```
   - The first `node` command must exit non-zero, and the second must exit 0.
   - `set-status --phase 20` is permitted: with `current_phase` null and an empty row phase, `phase_move_allowed` returns True (`:230-251`).
   - NG-088 test_ref: `scripts/verify-ng-088-group-order-across-restart.mjs::ng088-group-order-across-restart`.
   - NG-088 code_ref: `powerbrowser/shell/PowerBrowserAPI.sys.mjs TAB_ORDER_V4_DDL, migrateTabStoreToV4, setGroupOrder; theia/extensions/tab-uris/src/node/tab-query-service.ts:259`.
4. Stage the three ledger files, one plain `git add` per file, and commit.
5. Chris's `lock-checks` comes at the end of 20-05 (see Chris touchpoints).

**Draft row texts** (from the PLAT-03 report, for Chris to accept or edit):
- NG-087: "A tab placed loose on the Panorama canvas keeps its position across a quit and relaunch (tab store schema v3, x and y): a Theia tab stays placed, and an in-shell web tab's row keeps its position as closed-tab history and brings it back when the tab is reopened. Evidence: v3 landed in 7b7a1f7 with no ledger row; NG-007 covers non-web tabs only."
- NG-088: "A group's card order set by hand survives a quit and relaunch, and the reader returns the group's tabs in that order (tab store schema v4, ord). Evidence: v4 landed in 7b7a1f7 with no ledger row; NG-002 covers ord across a navigation only, NG-015 across a migration only."

**What "approved by Chris" means here.** REQUIREMENTS says "approved by Chris" and ROADMAP says "carrying Chris's approval". The ledger has no approve step for a done row, so the honest mechanism has two parts:
- his acceptance of the texts at the checkpoint, recorded in the SUMMARY with his reply;
- his `lock-checks`, which seals the two check files.

The NG-086 / 19-07 precedent is the same (commit `5db8a80`).

### PLAT-04: generator concurrency

**Evidence** (PLAT-04 report, measured 2026-10-17; reproduced twice):
- **Cause A.** Six concurrent inkscape exports × 3 rounds: 9 of 18 aborted, rc=134, `terminate called after throwing an instance of 'Gio::DBus::Error'`.
  - `--app-id-tag` still lost 6 of 18.
  - With `DBUS_SESSION_BUS_ADDRESS=disabled:`, 18 of 18 passed.
  - PNG bytes are identical with and without the bus at 16, 22, 24, 32, 48, 64, 128 and 256 px.
  - systemd-coredump holds 3 inkscape aborts at 2026-10-17 13:51:16-20, inside the Phase 19 verifier window (`9eb324e` 13:49:59 → `91675bc` 13:59:56). That link is by timestamp, not by a captured log.
- **Cause B.** A read-only sampler at 0.3 s on `generated/branding/dev/configure.sh` during the row saw:
  - `PowerBrowser Dev` 54 times;
  - fixture brands 49 times;
  - `Selftest Browser Dev` once. That string comes only from the harness `--self-test`, so another process was writing at the same time.

  That probe run went red with "restored generated/ hashes differ". **This answers the CONTEXT question: Phase 19's red is the same concurrency family.**
- **Sequential runs, all passing (2026-10-17):**
  - host: `generate.mjs --check` ×3; `--only generate-check` ×3 (1.41-1.43 s); `--only verify-downstream-fixtures` ×2 (268 + 198 assertions, 29.5-30.1 s);
  - `.#theia`: the same commands with the same results (1.40-1.47 s; 29.7-30.8 s).

**Code facts** (Read this session):
- The only inkscape spawn is `generate.mjs:2911`, `spawnSync('inkscape', [...])`, inside `iconPngBytes` (`:2899-2939`), with no `env` (`git grep` finds no other). `ICON_SIZES = Object.freeze([16, 32, 48, 64, 128])` (`:2807`).
- `OUTPUT_ROOT = join(REPO_ROOT, 'generated')` (`:111`). `rejectUnknownArguments` accepts only `--check` and `--self-test` (`:161-167`).
- In the harness, `GENERATED_ROOT = join(REPO_ROOT, 'generated')` (`:75`). `runGenerate(envExtra)` runs the generator with `cwd: REPO_ROOT` and `PB_CONFIG_DIR` (`:199-209`). `restoreDefault` emits `'restored generated/ hashes differ from the pre-fixture snapshot -- …'` (`:517-530`).

**Fix:**
1. **Cause A:** in `generate.mjs`, add `export const RASTER_ENV = Object.freeze({ ...process.env, DBUS_SESSION_BUS_ADDRESS: 'disabled:' });` with a one-line why-comment, and pass `env: RASTER_ENV` at `:2911`. The output bytes do not change; the `generated-byte-identity` row (`verify-platform.sh:4056`) is the proof.
2. **Cause B:** add `--out <dir>` to `generate.mjs`. `rejectUnknownArguments` accepts it with its value, and `main()` calls `writeTargets(config, out ?? OUTPUT_ROOT)`. A flag is used rather than an env var because an inherited env var could silently redirect `generate-check`. In the harness:
   - `runGenerate` requires an out dir and throws without one; each fixture writes `<stage>/out`;
   - the default comparand (E1 exemption, absence sweep, self-test S2/S3) is generated once per invocation into its own mkdtemp;
   - delete `restoreDefault` and the post-restore `--check`;
   - keep the "a failing run writes nothing" assertion, pointed at the private dir;
   - the harness then never reads or writes `generated/`.
3. Optional: `writeTargets` writes to a temp file and then `renameSync`. Skip it unless a reader race is observed; no evidence shows one.
4. Record the cause in R28 in `docs/non-gui/decisions.md`.
5. To satisfy the CONTEXT wording either way, record the sequential passing runs in both shells *before* the edit and again *after* it, in the 20-01 SUMMARY.

**Rejected:** a `flock` in `verify-platform.sh`. It serialises whole sessions, does not cover direct `node scripts/...` calls, and does not cover other checkouts (`~/gsd-workspaces/pba`, `-ng-*`), so Cause A would remain.

**Self-test extensions (no new row):**
- `generate --self-test` gets a `concurrent-raster` case:
  - *Deterministic half:* `RASTER_ENV.DBUS_SESSION_BUS_ADDRESS === 'disabled:'`. Planted envs (key deleted; host bus address) must each go red naming "inkscape would join the session bus".
  - *Positive half:* 6 concurrent exports × 3 rounds with `RASTER_ENV`; all 18 exit 0 with a valid 32×32 PNG.
  - Never plant the real crash: each abort writes a core dump of about 1.6 MB.
- `verify-downstream-fixture.mjs --self-test`:
  - (1) `runGenerate` without an out dir throws, and the self-test reports it red naming "shared generated/ tree".
  - (2) Copy `scripts/`, `configuration.toml` and `brand/` into a mkdtemp (`REPO_ROOT` is derived from the script location, `generate.mjs:105`). Run the copy with `--out`: `<copy>/generated` must be absent. Run it without `--out`: `<copy>/generated` must exist. The second step is the positive control.
- The assertion counts (268 + 198) must not change.

### PLAT-05: planning-path row

**Facts** (`git grep '\.planning/phases/' -- scripts .github`, this session; exactly 5 hits):

| Site | Literal | Resolves today via |
|---|---|---|
| `scripts/verify-platform.sh:286` | `"$REPO_ROOT"/.planning/phases/07-*/fixtures` | the `:291-293` fallback to `v1.0-phases/07-*/fixtures` |
| `scripts/verify-platform.sh:307` | `"$REPO_ROOT"/.planning/phases/09-*/fixtures` | the `:308-310` fallback to `v1.1-phases/09-*/fixtures` |
| `scripts/verify-sql-store-soak.mjs:50` | `LIVE_FIXTURE = join(REPO_ROOT, '.planning/phases/11-sql-store-design/fixtures/tabs-v1.sqlite')` | the `:51-52` ARCHIVED_FIXTURE fallback |
| `scripts/verify-strip-spike-verdict.mjs:63` | `RECORD_REL = '.planning/phases/13-chrome-bar-strip-relocation-spike/13-SPIKE-STRIP-RELOCATION.md'` | `resolveRecord` (`:76-96`) |
| `scripts/verify-dependent-window-content.mjs:50` | `PROBE_RECORD_REL = '.planning/phases/14-modes-windows-setups/14-PROBE-DEPENDENT-WINDOWS.md'` | `resolveRecord` (`:60-81`) |

**Fix:**
- Repoint all five to the archive and delete the hand-written fallbacks: `v1.0-phases/07-*/fixtures`, `v1.1-phases/09-*/fixtures`, `v1.2-phases/11-sql-store-design/...`, `v1.3-phases/13-...` and `v1.3-phases/14-...`.
- Keep the shell globs; the comment at `verify-platform.sh:271-277` requires them.
- Keep `resolveRecord` in both `.mjs` files. Its first branch finds the archived literal directly, and its self-tests pass their own `liveRel`.

**Check.** `scripts/verify-planning-paths.mjs` uses the standard library only. Register it at the end of the `--quick` array, before the `)` at `verify-platform.sh:4578` (the PLAT-05 report says `:4577`, which is the last row):
```
"planning-paths|node $REPO_ROOT/scripts/verify-planning-paths.mjs"
"planning-paths-self-test|node $REPO_ROOT/scripts/verify-planning-paths.mjs --self-test"
```
- **Input:** `git ls-files -z`. Scan the tracked `scripts/` and `.github/` files.
- **Pattern:** ``/\.planning\/(?:phases|milestones\/v[0-9.]+-phases)\/[0-9][^\s'"`$<>{}()]*/g``. Strip trailing `.,:;`, a `:NNN` suffix and a trailing `/`.
- **Resolution:** a literal resolves if it is a tracked file or a tracked directory prefix. A `*` matches `[^/]*`, and a glob must match exactly one tracked path.
- **Red when:** any literal is unresolved (one line each, naming file:line and "0 tracked" or "matches N"), or **zero** references are found. Today the scan finds 14: the 5 above and 9 that already point at the archive.
- **Structure:** a pure `findUnresolved(sources, tracked)`, so the self-test needs no git.
- **Self-test plants.** Plant paths are assembled at runtime, for example `['.planning','phases','99-gone','rec.md'].join('/')`, so the real-tree scan never sees them. The script's own comments contain no concrete phase path. Plants:
  1. JS literal, untracked.
  2. Shell glob matching 0.
  3. Glob matching 2.
  4. Wrong milestone.
  5. Empty source set ("zero references").
  6. Mixed file, one good and one bad: exactly one failure.
  7. Clean control (file, dir prefix, single-match glob, `${phaseDir}` template, `<v>-phases` placeholder): no failures.
- **Register the row in the same commit as the five repoints.** Registered alone, it is red.

### Anti-Patterns to Avoid

- **`rm -rf lib && yarn build:extensions` as the clean-build proof.** It is vacuous under `composite` (Pitfall 1).
- **Adding the group-channel rules to `verify-web-tab-bridge.mjs`.** That script is GUI-02's contract, and the gap asks for a row named for the channel.
- **Asking Chris to "APPROVE NG-087".** It fails on a done row. Do not suggest `baseline-checks`; it waives the failure proof.
- **A `flock` around `verify-platform.sh`.** Rejected above.
- **Reproducing the "one archived copy is fine" fallback inside `planning-paths`.** It would pass the breakage PLAT-05 exists to catch.
- **New Phase 20 scripts that point into `.planning/phases/20-*`.** Read evidence from `docs/non-gui/` instead, or the v1.4 closeout turns `planning-paths` red.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Clone, run, kill, clean up | A new clone helper | `scripts/fresh-clone-verify.py` | It already handles the process-group kill on timeout and the `finally` cleanup |
| CI/local build command | A second copy of the command | Read the `run:` line from `verify.yml` at check time | Derived, so the two cannot drift |
| Tab-store writer in node | A new fake | `scripts/lib/tab-store-fakes.mjs` `freshApi` | It already loads the real `PowerBrowserAPI.sys.mjs` over `node:sqlite`. Add only new exports, never change existing ones (`verify-tab-store-offline.mjs` depends on them) |
| Comment stripping, set diff | New parsers | Copy from `verify-web-tab-bridge.mjs:61-107` | The same house idiom |
| Tracked-file listing | `find` | `git ls-files -z` (as `scan-brand-residue.mjs` does) | It sees what CI and a clean clone see |

## Runtime State Inventory

Not a rename or migration phase, but two runtime-state items matter:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None changed. NG-087/088 checks write only to mkdtemp | None |
| Live service config | None | None |
| OS-registered state | systemd-coredump holds about 45 inkscape dumps, 29 of them from PLAT-04's stress probes | Optional cleanup; Chris's call |
| Secrets/env vars | `DBUS_SESSION_BUS_ADDRESS` is overridden only in inkscape's child env | None |
| Build artifacts | Stale `lib/` files with no source in the main tree: `modes/lib/browser/organising-placeholder-widget.js`, `modes/lib/browser/gui02-overlay-spike.js`, `tab-uris/lib/browser/browser-tab-uri.js` [VERIFIED: `ls`]. A fresh clone never sees them | Out of PLAT-01 scope. Clearing them needs a quiet tree and an extension `yarn clean`, never `git clean` |

## Common Pitfalls

### Pitfall 1: `tsc -b` reports "up to date" over an empty `lib/`
**What goes wrong:** deleting `theia/extensions/*/lib` and rebuilding proves nothing.
**Why:** `composite` implies `incremental`, and `tsconfig.tsbuildinfo` sits beside `tsconfig.json`, outside `lib/`. In incremental mode the up-to-date check does not look for missing outputs [CITED: PLAT-01 report, `typescript.js:135778-135790, 22058, 120592-120610`]. The tsbuildinfo files are present today (`theia/extensions/branding/tsconfig.tsbuildinfo`, among others).
**How to avoid:** use a fresh clone, or each extension's `clean` script (`rm -rf lib *.tsbuildinfo`).

### Pitfall 2: the clone sees only HEAD
Uncommitted work is invisible to `theia-fresh-clone-build`. That is the point of the row, and it is the same trap CLAUDE.md records for the residue scan. Commit, then run.

### Pitfall 3: concurrent `--quick` runs before 20-01 lands
Until Cause A and Cause B are fixed, two `--quick` runs in any checkout of this user's session can turn `generate-check`, `verify-downstream-fixtures*` and every `generated/` reader red. Apply R28: re-run a red row alone before it counts. This is also why the waves are sequential.

### Pitfall 4: editing a check file after `record-fail`
The recorded sha256 must equal the file that Chris locks. Commit NG-087/088 check files first and never touch them again. If an edit is unavoidable, re-run `record-fail` (the `--at` mode makes it repeatable) **before** Chris's lock.

### Pitfall 5: the ledger hook blocks Bash commands that name `ledger-amend.py`
This research had a read-only `grep`/`awk`/`sed` over `scripts/ledger-amend.py` refused with "LEDGER FROZEN". Read that file with the Read tool. Run only the agent subcommands, one plain command each, with no operators. Never put `lock-checks`, `approve`, `drop` or an `APPROVE <ID>` line into any Bash call.

### Pitfall 6: stage before trusting a scan
`scan-brand-residue` and the new `planning-paths` both read `git ls-files`. An unstaged new file is invisible to the first and makes the second go red (a path into an untracked file). `git add` the new scripts by explicit path first.

### Pitfall 7: the reply is not cloned with `cloneInto`
FEATURES.md:56 is stale. The "uncloned reply" plant removes the JSON round trip (plant 8). It must not delete a `cloneInto` call, because none exists, and `gui02-web-tab-bridge` already bans `cloneInto` in the child.

### Pitfall 8: `fresh-clone-verify.py` is silent until the end
A slow cold run looks hung until the 1800 s timeout. Expected: about 1.5-3 min warm [ASSUMED for the `nix develop` and drivelist parts; CI's whole step took 68 s]. A cold yarn cache or cold node-gyp headers need network, and that is an environment failure, not a code failure.

### Pitfall 9: the clone build does not run `generate.mjs` first
CI runs `node scripts/generate.mjs` before installing, and `generated/` is git-ignored, so `5bba4e3` never proved a build without `generated/`. The evidence in the tree says the Theia build does not read it: the telemetry values are "copied surgically" into the committed `theia.frontend.config` (`telemetry-frontend-module.ts:3-7`), and `git grep generated/` under `theia/` finds only that comment. If the first clone run fails on a missing `generated/` input, prefix the clone command with `node scripts/generate.mjs`, as CI does. Do not count that failure as a code defect.

### Pitfall 10: Stop hook and open rows
While NG-087/088 are `open` with `current_phase` null, the Stop gate reports them as "open and due" (`block_once`). Keep the add → done window inside one task. If `add` prints "id was already added", another session took the id: stop.

### Pitfall 11: brittle anchors in PLAT-02
Brace matching and the lookbehind for `document.dispatchEvent(` / `const x =` are tuned to today's formatting. A reformat must go red as "anchor drifted" or "ZERO", never pass. The self-test plants are the proof of that.

## Code Examples

### Registry rows (verbatim shape of the neighbours at `verify-platform.sh:3767-3768`)
```bash
    "gui02-web-tab-bridge|node $REPO_ROOT/scripts/verify-web-tab-bridge.mjs"
    "gui02-web-tab-bridge-self-test|node $REPO_ROOT/scripts/verify-web-tab-bridge.mjs --self-test"
```

### Cause A (target shape; one spawn site)
```javascript
// inkscape 1.4.4 aborts (Gio::DBus::Error) when several instances register on the session bus at once.
export const RASTER_ENV = Object.freeze({ ...process.env, DBUS_SESSION_BUS_ADDRESS: 'disabled:' });
// generate.mjs:2911
const child = spawnSync('inkscape', [ /* unchanged argv */ ], { encoding: 'utf8', env: RASTER_ENV });
```

### Planted path assembled at runtime (PLAT-05 self-test)
```javascript
const gone = ['.planning', 'phases', '99-gone', 'rec.md'].join('/');
const sources = new Map([['scripts/x.mjs', `const P = join(REPO_ROOT, '${gone}');\n`]]);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Reply cloned with `cloneInto` | JSON round trip in the content window (`GroupActorChild.sys.mjs:115-118`) | 14.1 | The PLAT-02 plant shape |
| `build:extensions` with 8 entries ending in backend-opencode | 7 entries (`theia/package.json:69`) | Phase 17 | FEATURES.md:38-41 is stale |
| Per-script milestone fallbacks | One derived `planning-paths` row (this phase) | Phase 20 | The v1.4 closeout will turn it red on purpose if a script points into `.planning/phases/2x-*` |

## Chris Touchpoints

| # | When | What | Blocking |
|---|------|------|----------|
| C1 | 20-04 Task 1, before `add` | Accept or edit the NG-087/088 texts and the red-against-`b9412fa` method. He replies with acceptance or the edited text | **yes** |
| C2 | End of 20-05, after the NG-087/088 done commit and the last code commit | Run in his own terminal (never in an agent Bash call; the hook blocks it):<br>`cd /home/chris/coding/Power-Browser`<br>`python3 scripts/ledger-amend.py --root . lock-checks --commit <H>`<br>H is the commit holding both check files, or any later one with no check-file change. He replies `relocked`. The agent then commits "chore(20): record Chris's re-lock of the check hashes at <H7>" | **yes** |
| C3 | Same checkpoint as C2 | CLAUDE.md:145 cites `.planning/phases/01-platform-extraction-and-rename/01-UI-SPEC.md`, which does not exist. The file is at `.planning/milestones/v1.0-phases/01-platform-extraction-and-rename/01-UI-SPEC.md` [VERIFIED: `ls`]. Approve the one-line edit or make it himself. Outside `planning-paths` scope | no |
| C4 | Optional, any time | Push main so that CI's `verify.yml:83` reproves the build on a runner (NG-074 is deferred-approved to him). Pushes are his | no |
| C5 | Optional | Clear about 45 inkscape core dumps | no |
| C6 | Note only | PLAT-04 closes as "reproduced and fixed", with passing runs also recorded. CONTEXT allows either outcome | no |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | P1-P3 fail with the named texts (TS2307 specifier; esbuild names `web-tab.css`) | PLAT-01 | The self-test expectations need adjusting after the first run. Low |
| A2 | `nix develop` in the clone takes about 5-20 s, and drivelist about 10-20 s | Pitfall 8 | The timing only; the timeout is 1800 s |
| A3 | The Theia build needs no `generated/` input | Pitfall 9 | The clone command needs a `node scripts/generate.mjs` prefix. Low cost |
| A4 | Concurrent yarn v1 installs sharing `~/.cache/yarn` do not corrupt it | PLAT-01 | A rare cache failure; re-run alone |
| A5 | `verify-downstream-fixtures` drops from about 30 s to 12-15 s after Cause B's fix | PLAT-04 | Runtime only |
| A6 | CI runners have no session bus, so Cause A never shows in CI | PLAT-04 | No effect: the deterministic half guards it on every host |
| A7 | The check files named in `check_locks` are all `scripts/verify-ng-0NN-*.mjs`, so no file this phase edits is locked | Plans 20-01/20-02 | `phase-gate.py` would report "test file changed". It runs after each plan, so the failure would be loud [CITED: 19-RESEARCH; the ledger file was not read directly in this research] |

## Open Questions

1. **Where the `in_tree` / `open` → `fixed` flips are recorded.**
   - Known: the archived `14.1.1-UAT.md:651-680` carries non-resolving `closed_by` hashes.
   - Recommendation: edit the archived gap entries (status, real `closed_by` hashes, remove `deferred_to`) *and* cite them in `20-VERIFICATION.md`, because the archive is what milestone audits read. This is the planner's call.
2. **D6 (response listener on `window`).**
   - It lies outside the gap's five faults.
   - Recommendation: include it. It costs one assertion and one plant and is derived. Claude's discretion covers it.
3. **The ledger row citing `.planning/phases/19-.../19-FAILSET-1.76.txt`.**
   - It stops resolving at the v1.4 closeout. No ledger check resolves paths.
   - Recommendation: leave it as history and note it for the closeout.
4. **Does `planning-paths` also scan CLAUDE.md and docs/?**
   - Recommendation: no for this phase. All docs/ references resolve today (PLAT-05 report), and CLAUDE.md is C3.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| nix + `.#theia` devShell | PLAT-01 clone build, PLAT-04 `.#theia` runs | ✓ | `/run/current-system/sw/bin/nix` | — |
| node | every new check | ✓ | v24.19.0 | — |
| python3 | `fresh-clone-verify.py` | ✓ | 3.14.7 | — |
| inkscape | `generate.mjs` | ✓ | 1.4.4 (host); the `.#theia` store build is also 1.4.4 (PLAT-04 report) | — |
| git with full history | PLAT-03 `--at b9412fa`, PLAT-01 clone | ✓ | local repo. CI uses `fetch-depth: 0` (`verify.yml:46`) | — |
| `upstream/` checkout | PLAT-02 D2 | ✓ in the main tree. In a clone, rows that need `upstream/` fail (R33) | — | A missing file FAILs, never passes |
| Scratch disk | PLAT-01 clone (about 1-1.5 GB) | ✓ | `/tmp` 356 G free | — |
| yarn cache | PLAT-01 frozen install offline | ✓ warm (about 1.6 GB, per the PLAT-01 report) | — | Network |
| Port 3000 | — | Chris's container | — | Never used. No row in this phase binds a port |

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `scripts/verify-platform.sh` registry (bash plus node/python checks), `--quick` array `:3576-4578`, full-only `CHECKS+=` from `:4581` |
| Config file | the `CHECKS` array in `scripts/verify-platform.sh` |
| Quick run command | `scripts/verify-platform.sh --only <label>` |
| Commit gate | `scripts/verify-platform.sh --quick` minus `docs/non-gui/quick-baseline.txt` (the 4 gui08 rows) |
| Full suite command | `scripts/verify-platform.sh` (it carries the new `theia-fresh-clone-build` rows) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Failing direction | File Exists? |
|--------|----------|-----------|-------------------|-------------------|-------------|
| PLAT-01 | Build order static invariant | `--quick` | `--only theia-build-order`, `--only theia-build-order-self-test` | A backward `@powerbrowser` edge | ✅ |
| PLAT-01 | Fresh clone at HEAD builds | full | `--only theia-fresh-clone-build` | Clone, install or build exit ≠ 0; timeout; verify.yml step missing; TMPDIR has a space | ❌ W0 |
| PLAT-01 | The row can go red | full | `--only theia-fresh-clone-build-self-test` | P1/P2/P3 not red, or the baseline not green | ❌ W0 |
| PLAT-02 | Channel contract | `--quick` | `--only group-channel` | Any D0-D6 violation; zero derivation | ❌ W0 |
| PLAT-02 | Plants | `--quick` | `--only group-channel-self-test` | Any of plants 1-12 not red naming its drift | ❌ W0 |
| PLAT-03 | Loose position survives restart | `--quick` | `--only ng-087-loose-position-across-restart` (+ `-self-test`) | Position lost or not returned by the derived reader SQL | ❌ W0 |
| PLAT-03 | Group order survives restart | `--quick` | `--only ng-088-group-order-across-restart` (+ `-self-test`) | Order ≠ the set order | ❌ W0 |
| PLAT-03 | Honest red recorded | ledger | `node scripts/verify-ng-08N-….mjs --at b9412fa…` exits ≠ 0 with `unknown kind setTabPosition` / `setGroupOrder` | Exit 0, or a `git show` failure | ❌ W0 |
| PLAT-03 | Ledger healthy | ledger | `python3 scripts/check-ledger.py --root .`; `python3 scripts/phase-gate.py --root .` (exit 0, no output) | Any output line | ✅ |
| PLAT-04 | Rasters immune to the bus | `--quick` | `--only generate-self-test` (`concurrent-raster`) | Env key missing or host bus; any of 18 exports fails | ✅ (extend) |
| PLAT-04 | Harness never touches `generated/` | `--quick` | `--only verify-downstream-fixtures-self-test`; `--only verify-downstream-fixtures` (268 + 198) | `runGenerate` without out does not throw; the copy shows `generated/` with `--out` | ✅ (extend) |
| PLAT-04 | Bytes unchanged | `--quick` | `--only generate-check`, `--only generated-byte-identity` | Any raster byte drift | ✅ |
| PLAT-05 | Paths resolve | `--quick` | `--only planning-paths` | Any unresolved literal; zero references | ❌ W0 |
| PLAT-05 | Plants | `--quick` | `--only planning-paths-self-test` | Plants 1-6 not red, or control 7 red | ❌ W0 |
| PLAT-05 | Repointed readers still work | `--quick` | `--only sql-store-soak`, `--only gui07-strip-spike-verdict(-self-test)`, `--only gui09-dependent-window-content(-self-test)`, `--only verify-downstream-fixtures` | Missing fixture or record | ✅ |

### Sampling Rate
- **Per task commit:** the `--only` rows for the files touched, plus `node scripts/scan-brand-residue.mjs` after `git add`.
- **Per plan:** `scripts/verify-platform.sh --quick` with the R33 subtraction (empty remainder passes), then `python3 scripts/phase-gate.py --root .`.
- **Phase gate:**
  - the full `scripts/verify-platform.sh`, including `theia-fresh-clone-build`;
  - `python3 scripts/plan-gate.py --root . --phase 20 --plans .planning/phases/20-non-gui-gaps`;
  - `check-ledger.py` and `phase-gate.py` exit 0 after C2.

### Wave 0 Gaps
- [ ] `scripts/verify-planning-paths.mjs` (PLAT-05)
- [ ] `scripts/verify-group-channel.mjs` (PLAT-02)
- [ ] `scripts/verify-ng-087-loose-position-across-restart.mjs`, `scripts/verify-ng-088-group-order-across-restart.mjs` (PLAT-03)
- [ ] `scripts/verify-theia-fresh-clone-build.sh` (PLAT-01)
- [ ] Self-test extensions in `generate.mjs` and `verify-downstream-fixture.mjs` (PLAT-04)

**quick-baseline.txt:** unchanged. Every new row passes at HEAD, and the 4 gui08 rows stay red. Refresh it only if a measured FAIL set differs.

## Security Domain

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V4 Access Control | yes | The group actor's `wantUntrusted: true` admits untrusted content events. The walls are the `matches` pin (`${GROUP_ACTOR_THEIA_ORIGIN}/*`) and chrome-side validation. PLAT-02 only guards the registration shape; it does not change it |
| V5 Input Validation | no new input | — |
| V6 Cryptography | no | — |
| V14 Configuration / supply chain | yes | The clone installs with `--ignore-scripts --frozen-lockfile` |

| Pattern | STRIDE | Mitigation |
|---------|--------|-----------|
| Install script runs in the clone | Tampering | `--ignore-scripts`; the lock was audited in Phase 19 |
| Raster process joins the user's session bus | Elevation, minor | `DBUS_SESSION_BUS_ADDRESS=disabled:` removes the bus from the child |

## Sources

### Primary (HIGH: read or run this session)
- `scripts/verify-platform.sh` (`:284-322, 3576-4578, 3767-3768, 3960-3961, 4056, 4118, 4400-4401, 4520, 4581, 4941-4968`), `theia/package.json:69-70`, `.github/workflows/verify.yml:40-92`, `scripts/fresh-clone-verify.py`, `scripts/generate.mjs` (`:111, 158-170, 2807, 2905-2915`), `scripts/verify-downstream-fixture.mjs` (`:75, 197-212, 515-530`), `powerbrowser/shell/PowerBrowserAPI.sys.mjs` (`:50, 80-89, 244-257, 2168-2202`), `GroupActorChild.sys.mjs` (`:26-32, 110-138`), `jar.mn:20-32`, `tab-query-service.ts:259`, `.claude/hooks/ledger-verify-hook.py:28-39`, `scripts/ledger-amend.py` (`:60-260, 280-450, 630-769`), `scripts/phase-gate.py:110-164`, `scripts/plan-gate.py:40-79`, `scripts/check-ledger.py:300-360`, `14.1.1-UAT.md:651-680`, `docs/BUILD.md:45-70, 477-512`, `docs/non-gui/decisions.md` R28/R33, `quick-baseline.txt`, `ledger-report.py` output.
- `git` this session: `cat-file` on the eight hashes, `merge-base --is-ancestor`, `show 7b7a1f7^`, `rev-list --count origin/main..HEAD` = 102, and the `git grep` sweeps for literals and dispatch sites.

### Secondary (MEDIUM: measured by the five PLAT research agents on 2026-10-17, not re-run here)
- PLAT-04 concurrency reproductions, the sampler counts, and the coredump timestamps.
- PLAT-02 prototype derivation (7 sites green) and the D2 scheme counts.
- PLAT-03 probes of the head and `b9412fa` writers under `tab-store-fakes.mjs`.
- PLAT-05 prototype (14 references, 24 ms).
- PLAT-01 CI run log facts (runs `36470043046`, `36495714210`) and the TypeScript build-mode line citations.

## Metadata

**Confidence breakdown:**
- Code facts and line numbers: HIGH (re-read).
- Root causes: HIGH for PLAT-04 (reproduced twice, with a positive control) and for PLAT-01 (CI evidence plus ancestry).
- Check designs: MEDIUM. They follow house patterns but have not been run. Plant texts are [ASSUMED] until the first run.
- Ledger mechanics: HIGH (source read).

**Research date:** 2026-10-17
**Valid until:** 2026-11-16. Recheck line numbers if another session commits to `verify-platform.sh` first (`concurrent-sessions-on-main`).
