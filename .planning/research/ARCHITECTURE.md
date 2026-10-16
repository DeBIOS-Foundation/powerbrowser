# Architecture Research

**Domain:** v1.4 Platform Updates and GUI Close-out: OpenCode removal surface, generator and gate impact, build order
**Researched:** 2026-10-16
**Confidence:** HIGH for the removal surface (every claim checked by `git grep` on main at `e9e29c1`, then read at the cited line). MEDIUM for Theia 1.76 API facts (read from the published npm tarballs via unpkg, not from a local build).

Method note: the codebase-memory-mcp tools were not loadable in this subagent (no ToolSearch). Every positive and negative below comes from `git grep` over tracked files plus direct reads. Negatives were grepped with several spellings (`opencode`, `backend-opencode`, `ai.backend`, `[ai]`, `powerbrowserAiBackend`, `ai-backend.json`, `agentclientprotocol`, `POWERBROWSER_MCP`).

## Standard Architecture

### System Overview: the `[ai]` path today

```
configuration.toml [ai] backend = "off"          (configuration.toml:117-127)
        │
        ▼
scripts/lib/config-schema.json "ai.backend"     (regex ^(off|opencode)$, :83-89)
        │  unknown-key check, defaults masker, validator all read this one table
        ▼
scripts/generate.mjs emitAiBackend()             (:2046-2088), TARGETS row (:3463-3477)
        │  default echo: "default applied -- ai.backend = \"off\""  (echoDefaults, :4069-4073)
        ▼
generated/ai-backend.json                        (untracked: .gitignore:49 /generated/)
        │  manual copy-over, no tracked comparand
        ▼
theia/applications/browser/package.json theia.frontend.config.powerbrowserAiBackend = "off"  (:15)
        │
        ▼
backend-opencode-frontend-module.ts:26  binds ChatAgent only when === 'opencode'
backend-opencode-backend-module.ts      binds ACP supervisor + /mcp unconditionally (only runs if composed)

Composition switch (separate from the key):
  app package.json depends on @powerbrowser/backend-opencode?  -> currently NO (removed in wave E)
        │
        ▼
scripts/verify-platform.sh adapter_composed() (:2612-2627)
  composed     -> 6 rows ai-opencode-{tracer,presets,bridge}[-self-test]   (:4588-4595)
  not composed -> 1 row ai-opencode-held                                   (:4597)
Full set: ng051-backend-off (:4710) boots the built backend with a fake `opencode` on PATH
```

After removal every box above is deleted. Nothing replaces it: PROJECT.md:189-190 now puts DSH and any AI assistant integration out of scope ("DSH is a separate project (Chris, 2026-10-16)"). That supersedes step 11 of `.planning/HANDOFF-plan-reorg.md:79-80` (DSH as the last v1.4 phase) and its step 2 instruction to rewrite AI-01..05 as DSH requirements (:55-56). PROJECT.md:160-161 says "AI-01..05 removed".

### What OpenCode removal does NOT remove: the Theia AI framework

The app composes 12 upstream `@theia/ai-*` packages on its own, independent of OpenCode:

| Consumer | Lines | Use |
|---|---|---|
| theia/applications/browser/package.json | :46-57 | ai-anthropic, ai-chat, ai-chat-ui, ai-code-completion, ai-core, ai-core-ui, ai-editor, ai-ide, ai-mcp, ai-mcp-ui, ai-openai, ai-terminal |
| theia/package.json resolutions | :9-20 | the same 12 pins |
| theia/extensions/branding | package.json:7, powerbrowser-ai-layout-contribution.ts (whole file), powerbrowser-frontend-module.ts:4-5,10,32-45 | D-22 rebinds that suppress the AI-First perspective and the forced first-boot AI Configuration tab |
| theia/extensions/tab-uris | package.json:8, tab-uris-frontend-module.ts:4,137-167 | marks `ChatViewWidget` non-extractable |
| theia/extensions/customize | customize-frontend-module.ts:27 | comment only |
| scripts/verify-uri-roundtrip.mjs | :104 | `view:ai-configuration` round-trip row |
| docs/URI-SCHEMES.md | :101 | `ai-configuration` row |

These are not OpenCode. They stay unless Chris widens scope. **Open decision for the roadmap:** removing the framework as well would make the 1.76 branding fix disappear (the whole D-22 file goes), drop the tab-uris chat hook, and cut 12 pins from the Theia re-pin. It is a product decision (it removes Theia's built-in chat, which a later DSH extension may want), so it should be asked before the Theia phase, not folded into the OpenCode commit.

## OpenCode Removal List (exhaustive, file-level)

### A. Delete (tracked files)

| Path | Notes |
|---|---|
| theia/extensions/backend-opencode/ (14 tracked files, 1,829 lines) | opencode.mcp.json, package.json, tsconfig.json, src/browser/{backend-opencode-frontend-module,opencode-chat-agent,opencode-preset-commands,opencode-preset-contribution}.ts, src/common/opencode-service.ts, src/node/{backend-opencode-backend-module,opencode-acp-supervisor,opencode-bridge-env,opencode-changeset-emitter,opencode-mcp-contribution}.ts. Also `rm -rf` the directory itself: it holds ignored `lib/` and `tsconfig.tsbuildinfo` on this machine, and `git rm` leaves those behind (see Pitfall 1). |
| scripts/verify-opencode-bridge.mjs (731 lines) | imports `emitAiBackend` (:73); only registry rows :4593-4594 run it |
| scripts/verify-opencode-presets.mjs (862 lines) | reads `theia/node_modules/@theia/ai-chat-ui/...` (:68) |
| scripts/verify-opencode-tracer.mjs (657 lines) | |
| scripts/verify-ng-051-backend-off.mjs (115 lines) | ledger-locked (ledger/REQUIREMENTS.json:1158); see section E |
| docs/ai-opencode-adapter.md | user doc for the adapter |

### B. Edit (tracked files)

| Path:line | Change |
|---|---|
| configuration.toml:117-127 | delete the `[ai]` comment block and `[ai] backend = "off"` |
| scripts/lib/config-schema.json:83-89 | delete the `"ai.backend"` key |
| scripts/generate.mjs:46-48 | drop the 16-03 fragment sentence from the header |
| scripts/generate.mjs:8 | "Fifty-four targets" becomes fifty-three (prose; the PASS line at :3975 derives its count from the table) |
| scripts/generate.mjs:2046-2088 | delete the `emitAiBackend` doc block, `AI_BACKENDS`, and the function |
| scripts/generate.mjs:3463-3477 | delete the `ai-backend.json` TARGETS row |
| scripts/verify-platform.sh:2612-2641 | delete `adapter_composed` and `check_ai_opencode_held` |
| scripts/verify-platform.sh:4581-4598 | delete the comment and the whole if/else block (six held rows plus `ai-opencode-held`) |
| scripts/verify-platform.sh:4708-4710 | delete the `ng051-backend-off` row and drop NG-051 from the wave E comment |
| scripts/verify-backend-env-readers.mjs:101-104 | delete the `opencode-bridge-env.ts` allowlist entry (Pitfall 2). The comment in verify-platform.sh:4556-4557 says "a two-entry allowlist" and must change to one entry. |
| theia/package.json:69 | delete `&& yarn --cwd extensions/backend-opencode build` |
| theia/applications/browser/package.json:15 | delete `"powerbrowserAiBackend": "off",` |
| theia/yarn.lock:5-8 | the `@agentclientprotocol/sdk@1.4.0` stanza goes away. It has no dependencies, so nothing else changes. Regenerate it with `yarn install` and do not hand-edit it. CI runs `--frozen-lockfile` (.github/workflows/verify.yml:83). |
| docs/REBRANDING.md:299-303 | delete the `[ai]` section |
| .gitignore:83 | delete `opencode.json` |
| theia/extensions/tab-uris/src/node/tab-store-access-endpoint.ts:9-10 | optional. The comment "Nothing here comes from the retired backend-opencode /mcp route" is still true after the removal. Leave it or reword it. |

### C. Planning records (edit; no gate reads them)

| Path:line | Change |
|---|---|
| .planning/REQUIREMENTS.md:87-119 | delete the "AI backends" block: AI-01..AI-05 plus the D2(b) retirement paragraph. Before deleting, move the record that NG-051 was kept and built to wherever the ledger amend is noted. |
| .planning/ROADMAP.md:262-284 | delete the Phase 16 section. The v1.3 archive keeps it: .planning/milestones/v1.3-ROADMAP.md and .planning/milestones/v1.3-phases/16-ai-backend-adapter-opencode/ stay as history and are not edited. |
| .planning/codebase/INTEGRATIONS.md:35,56,89; STACK.md:59,77,90; STRUCTURE.md:44,53; ARCHITECTURE.md | drop the OpenCode, ACP, `ai-backend.json` and `POWERBROWSER_MCP_*` lines, or re-run the codebase map after the commit |
| .planning/notes/ai-backends-goal.md, .planning/notes/pba-order-of-events.md, .planning/research/ai-review-ux-and-backend-adapters.md | mark superseded and keep them. `pba-plugin-shipping-design.md` is already marked (commit fe0fb13). |

### D. Leave alone (history; editing them would rewrite the record)

- `.planning/milestones/**`, including the Phase 16 directory and the 14.1.1 summaries that mention OpenCode.
- `docs/non-gui/{GAPS.md,decisions.md,import-review.txt,proposed-lines.md,questions-wave-e.md,plans/*}`. These are the wave records. Two hand-kept files are the exception:
  - `docs/non-gui/checks-wave-e.tsv:1` (the NG-051 row). Only a comment reads it (verify-platform.sh:4709). Delete the row, or mark it dropped, once the ledger drops NG-051.
  - `docs/non-gui/quick-baseline.txt:1` (`ai-opencode-tracer`). That line has been dead since wave E held the row. Remove it in the v1.4 baseline refresh item.
- `ledger/history/log.jsonl`. It is append-only.

### E. Ledger (needs Chris; the agent cannot do it)

- NG-051 is `status: done` with `test_ref: scripts/verify-ng-051-backend-off.mjs::ng051-backend-off` (ledger/REQUIREMENTS.json:656-666). The script is also in `check_locks.files` (:1158). After the file is deleted, `scripts/phase-gate.py` reports `NG-051: check not found` (:140-141) and `locked check missing: scripts/verify-ng-051-backend-off.mjs` (:153-157).
- The fix is a user-approved drop of NG-051 (reason: OpenCode removed, v1.4), then `ledger-amend.py lock-checks` to re-lock without the file. The ledger hook blocks the agent from `drop`/`approve` (it fired during this research), so the plan must stop and ask for `APPROVE NG-051` before the commit. HANDOFF-plan-reorg.md:56-57 says the same.
- NG-041..050 and NG-052..062 are already `dropped` with the D2(b) reason and need no change.

### Confirmed absent (grep-negative, so no work)

- `powerbrowser/INTERNAL-APIS.md`: no OpenCode or AI row. The adapter is Theia-side and never touched a Firefox internal.
- `inventory/brand-tokens.json`: no OpenCode token class.
- `powerbrowser/endpoint-allowlist.json`: no opencode.ai or models.dev host. The only `opencode.ai` string is a `$schema` literal inside verify-opencode-tracer.mjs:357, which is deleted anyway.
- `.github/workflows/*`, `flake.nix`, `README.md`, `docs/BUILD.md`, `docs/RELEASING.md`, `.planning/STATE.md`: no OpenCode references.
- Fixture manifests: `configuration.toml` is the only tracked `.toml` with an `[ai]` table.
- First-party React: backend-opencode contains no React. The four `.tsx` files are branding/powerbrowser-about-dialog.tsx, branding/powerbrowser-welcome-widget.tsx, chrome-bar/chrome-bar-widget.tsx and chrome-bar/tab-strip-widget.tsx.

## Generated Files and the Byte-Identical Rule

- **No byte-identical surface changes.** `ai-backend.json` is one of the fragment rows "with no tracked comparand" (generate.mjs:3464-3471). The thirty-three Phase 1 byte-identical targets (generate.mjs:8-16) do not include it. `generated-byte-identity` (verify-platform.sh:4083) skips untracked rows, so it stays green with the same 33 comparisons.
- **Target count goes from 54 to 53.** `node scripts/generate.mjs --check` printed `all 54 generated file(s)` on this tree today. verify-generated-identity.mjs:306 and :503 derive from `TARGETS.length` and follow automatically.
- **The default echo line disappears.** `default applied -- ai.backend = "off"` comes from `echoDefaults` (generate.mjs:4069-4073) because the repo-root manifest is the defaults layer. With the schema key and the table gone, nothing is echoed.
- **Must regenerate:** nothing tracked. Every checkout that has already generated must still **delete `generated/ai-backend.json` by hand**. `--check` reports it as an "extra" file (generate.mjs:3966-3969), and the writer never removes extras (comment at :3949-3950). Until that file is deleted, `generate-check` (a `--quick` row, verify-platform.sh:4145) is red on this machine, in `~/gsd-workspaces/pba/Power-Browser`, and in every `~/coding/Power-Browser-ng-*` clone. CI starts from a fresh checkout and is unaffected.
- **Downstream contract change.** Removing `ai.backend` from the schema makes `[ai]` an unknown setting. A downstream manifest (`PB_CONFIG_DIR`) that still carries it now fails hard at the unknown-key step. That is correct behaviour. REBRANDING.md should say so in one line when the section is removed.

## Checks Whose Derived Expectation Changes

| Check (registry label) | Derivation | Effect of removal |
|---|---|---|
| `generate-check` | TARGETS vs files on disk | 53 files; a stale local `ai-backend.json` is red until deleted |
| `generated-byte-identity` | tracked comparands | unchanged (33) |
| `theia-build-order` (+self-test, :3987-3988) | chain from `build:extensions` vs `readdirSync(theia/extensions)` vs import edges (verify-theia-build-order.mjs:18-43, :96) | set equality: red if the chain clause and the directory are not removed together, including the ignored-`lib/` leftover |
| `backend-env-readers` (+self-test, :4565-4566) | `git ls-files` scan vs **hand-kept** `EXPECTED_ENV_TOUCHERS` (:96-105) | red with "STALE ALLOWLIST ENTRY" unless the opencode entry is deleted in the same commit; the PASS line then reports a 1-entry allowlist |
| `verify-upstream-pins` (+self-test, :3694-3695) | every member `extensions/*/package.json` @theia pin | one member fewer; no edit |
| `diff-theia-core` (full set, :4617) | iterates `applications/*`, `extensions/*` package.json (diff-theia-core.sh:74) | one member fewer |
| `rebranding-docs` | schema keys must appear in REBRANDING.md (verify-rebranding-docs.mjs:117-127, schema to docs only) | removing the docs section before the schema key goes red; doing both together is green |
| `scan-brand-residue`, `ng-027-reader-callers`, `ng070-no-spaced-name` | scan the tree | fewer files; no edit |
| `ai-opencode-held` | — | row deleted. The `--quick` row count drops by one (114 PASS + 4 FAIL today, measured; it becomes 113 + 4). |
| `ng051-backend-off` (full set) | — | row deleted |

The two hand-kept expectation lists this removal touches are `EXPECTED_ENV_TOUCHERS` and `docs/non-gui/quick-baseline.txt`. Everything else derives from the tree.

## Architectural Patterns

### Pattern 1: Atomic removal sets

**What:** a set of edits that are only green together. Splitting any set across commits leaves a red commit gate or a broken `yarn build`.
**Sets for this removal:**
1. **Manifest set:** configuration.toml `[ai]` + schema `ai.backend` + generate.mjs emitter and TARGETS row + REBRANDING.md section. If the schema key goes and the table stays, the unknown-key check fails generate. If the docs go and the schema key stays, `rebranding-docs` goes red.
2. **Workspace set:** extension directory (`rm -rf`) + `build:extensions` clause + `yarn install` (lockfile and the `node_modules/@powerbrowser/backend-opencode` symlink) + the `EXPECTED_ENV_TOUCHERS` entry + the `powerbrowserAiBackend` key.
3. **Registry set:** the four scripts + `adapter_composed`/`check_ai_opencode_held` + the if/else block + the `ng051` row.
4. **Ledger set:** the user-approved NG-051 drop + re-lock. This must be approved before the commit, or the phase gate goes red on it.

HANDOFF-plan-reorg.md:54 ("one commit") fits this. Sets 1-3 are one commit. Set 4 is the ledger amend that goes with it.
**Trade-off:** the commit is large (about 4.2k deleted lines), but every piece of it is a deletion and the gate proves it.

### Pattern 2: Update one upstream per phase, verify after each

**What:** Firefox, then Node, then Theia, each followed by the gate that covers it.
**Why here:** a full Gecko build is 47-54 minutes (CLAUDE.md "Environment"). Changing two upstreams before one verify run turns a red full run into a bisection across two trees. The memory rule "one fix at a time, confirmed" points the same way.

## Data Flow Changes (after v1.4)

1. **Manifest to sidecar:** the `[ai]` → `ai-backend.json` → `powerbrowserAiBackend` path is gone. The remaining fragment paths are frontend-config, branding, telemetry, endpoint-hosts, plugins and webextensions, and none of them change.
2. **Registry selection:** `verify-platform.sh` loses its only manifest-dependent branch (`adapter_composed`). The quick set no longer depends on the app's dependency list.
3. **Backend environment:** `powerbrowser-env.ts` stays the sole sanctioned reader of the live environment. The only other allowed toucher (the opencode child-env builder) disappears, so the invariant gets stricter.
4. **Theia 1.76 (next phase):** `AIAgentConfigurationViewContribution` is renamed `AIConfigurationViewContribution` and has no `initializeLayout` (verified in @theia/ai-ide@1.76.0 `ai-configuration-view-contribution.d.ts`/`.js`). The base `AIViewContribution` in ai-core@1.76.0 has none either. So D-22 rebind 2 (powerbrowser-ai-layout-contribution.ts:28-44, powerbrowser-frontend-module.ts:5,40-44) is deleted, not ported. Rebind 1 is kept: `AIFirstPerspectiveContribution` still exists unchanged in 1.76.0. The widget id stays `ai-configuration`, so the URI row at verify-uri-roundtrip.mjs:104 holds. `ChatViewWidget.ID` and the mutable `isExtractable` still exist in ai-chat-ui@1.76.0, so the tab-uris hook holds. @theia/core@1.76.0 depends on `react`/`react-dom` `^19.2.8` and `@types/react` `^19.2.18`. Today the tree pins react 18.3.1 (app package.json:94-95) and @types/react 18.3.31 (theia/package.json:65-66).

## Build Order for v1.4 (dependency-ordered)

Phase numbers continue from 16.

| # | Phase | Depends on | Why here |
|---|---|---|---|
| 17 | **OpenCode removal** (sets 1-4 above) | Chris approves the NG-051 drop | Removes one Theia workspace member and its pins from the Theia re-pin, three deep `@theia/ai-chat`/`ai-chat-ui` internal imports, and the ACP SDK. Every later yarn install and build then works on the final member set. It needs no build, so `--quick` proves it in seconds. **Correction to the brief's premise:** this does not shrink the first-party React 19 surface. backend-opencode has no React code, and the four `.tsx` files are in branding and chrome-bar. The gain is a smaller upstream API surface and pin set, not less React code. |
| 18 | **Firefox 153.5.0esr** | 17 (only to keep commits separate) | Independent of Theia (separate tree and dev shell). It goes first because the live sidecar check in 19 runs inside the Gecko shell, so it should run on the final Gecko. Touchpoints: configuration.toml:114, the workflow mirror .github/workflows/rebase-upstream.yml:33, the `_RELEASE`/`_BUILD1` tag comment in fetch-upstream.sh:276-282, the hard-coded `153.1.0esr` in scripts/smoke-firefox.sh:41-42 (red on the next full run otherwise), and the prose in README.md:87 and docs/BUILD.md. Then a full build and a full `verify-platform`. |
| 19 | **Node 24, then Theia 1.76.0 + React 19** | 17, 18 | Two commits in one phase. (a) flake.nix:14-21: switch to `nodejs_24` and update the D-16 comment; theia/package.json:61 `engines.node`; rebuild native modules (better-sqlite3 13.0.3, drivelist, which CI rebuilds at verify.yml:83); `--quick` plus a live sidecar check on 1.74.1. (b) Re-pin `theia_release`, react/react-dom/@types to 19, delete D-22 rebind 2, `yarn install`, `diff-theia-core.sh`, live check. Splitting them means a native-module ABI failure is never confused with a 1.76 API failure. The 1.76 tarballs publish no `engines` field, so Node 24 is Chris's choice (it supersedes D-16), not a Theia requirement. |
| 20 | **Non-GUI gaps** | 19 | The clean-checkout build (G-14.1.1-9) must run on the final dependency set, so it comes after 19. Ledger rows for schema v3/v4 and the group-channel check (G-14.1.1-10) are independent and could run earlier, but they belong in this phase. Refresh `quick-baseline.txt` last, because 17 and 19 both change the quick row set. **Re-check the inkscape item first:** `generate-check` PASSED locally in today's `--quick` run, so "fails locally" may already be stale. |
| 21 | **Panorama spec + `gui08` checks, then worklist** | 19 | The commit gate is red only on these four rows today (measured: `gui08-canvas-geometry`, `gui08-panorama-copy` and their self-tests). GUI checks pin Theia DOM selectors (for example verify-platform.sh:3440 "verified against the pinned Theia v1.74.1 DOM"), so GUI work goes after the Theia move and the selectors are re-verified once. |
| 22 | **Phase 14 / 14.1.1 leftovers** (G-23, G-11, G-32, 14-VERIFICATION) | 21 | Same reason: a GUI change on the final Theia. |
| 23 | **Sketch 005 decision** | 21-22 | A decision only, no build. **Recommendation: take it before the UAT pass, not after.** If 005 is adopted it changes the layout and invalidates a UAT run done earlier. If it is deferred, UAT tests the layout that ships. |
| 24 | **One live UAT pass** (13, 14, 14.1, 15, v1.2 sheets, NG-084, React 19 runtime) | 19-23 | It must come after every GUI change and after React 19, or it gets repeated. |
| 25 | **CI green on main** (NG-074) | 21 (in practice) | CI runs `--quick` (verify.yml:93), which is red only on the `gui08` rows, so CI should go green as soon as 21 lands. Keep it as the closing gate but expect it to be confirmation, not work. |

DSH is not a v1.4 phase (PROJECT.md:189-190).

## Anti-Patterns

### Anti-Pattern 1: `git rm` and stop

**What people do:** `git rm -r theia/extensions/backend-opencode`.
**Why it's wrong:** ignored `lib/` and `tsconfig.tsbuildinfo` stay on disk, so the directory survives. `theia-build-order` reads the directory with `readdirSync`, finds an extension that is not in the chain, and goes red. This happens only on machines that ever built the extension, so CI does not show it.
**Do this instead:** `git rm -r` then `rm -rf theia/extensions/backend-opencode`, then `yarn install`. Then delete `generated/ai-backend.json`.

### Anti-Pattern 2: Hand-editing the lockfile or the generated tree

**What people do:** delete the yarn.lock stanza by hand, or leave `generated/` as it is because "nothing tracked changed".
**Do this instead:** run `yarn install` inside `nix develop .#theia` and delete the extra generated file. `--check` is the proof.

### Anti-Pattern 3: Removing the Theia AI framework as "part of OpenCode"

**What people do:** grep for `ai` and delete `@theia/ai-*` along with the adapter.
**Why it's wrong:** it is a separate product decision with its own gates (D-22, the `view:ai-configuration` URI row, tab-uris). It also changes what the Theia phase has to verify.
**Do this instead:** ask Chris as a separate question before Phase 19.

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|---|---|---|
| configuration.toml ↔ generate.mjs | schema table | removing a key is a downstream-visible contract change (unknown-key failure) |
| generate.mjs ↔ app package.json | copied-over fragments | after removal: frontend-config, branding, telemetry, plugins |
| verify-platform.sh ↔ app package.json | `adapter_composed` | removed; no manifest-dependent registry branch remains |
| Theia backend ↔ process env | `powerbrowser-env.ts` sole reader | allowlist shrinks to one entry |
| Theia ↔ Gecko | `PowerBrowserAPI.sys.mjs` | untouched by OpenCode removal |
| Ledger ↔ checks | `test_ref` + `check_locks` | NG-051 drop needs a user APPROVE |

## Sources

- Tree reads on main at `e9e29c1` (all file:line citations above), 2026-10-16. HIGH.
- `scripts/verify-platform.sh --quick` run in this session: 114 PASS, 4 FAIL (all `gui08`). `generate-check` PASS, `ai-opencode-held` PASS, `backend-env-readers` PASS. HIGH.
- `node scripts/generate.mjs --check` in this session: the default echo lines, then `all 54 generated file(s)`. HIGH. An earlier run in the same session reported stale files and then passed. Another process may have regenerated in between (see memory: concurrent sessions on main).
- npm registry `@theia/ai-ide` dist-tags (`latest` 1.76.0, published 2026-09-24 per the @theia/core time field). unpkg: @theia/ai-ide@1.74.1 and @1.76.0 `ai-first-perspective-contribution.d.ts`, `ai-configuration-view-contribution.{d.ts,js}`, `ai-configuration-widget.js`; @theia/ai-core@1.76.0 `ai-view-contribution.js`; @theia/ai-chat-ui@1.76.0 `chat-view-widget.d.ts`; @theia/core@1.76.0 `package.json`. MEDIUM, because these are the published artifacts and not a local build.
- `.planning/HANDOFF-plan-reorg.md` (2026-10-15 audit). Used for the order and checked against the tree. Where it conflicts with PROJECT.md (2026-10-16) on DSH and AI-01..05, PROJECT.md wins.

---
*Architecture research for: Power Browser v1.4*
*Researched: 2026-10-16*
