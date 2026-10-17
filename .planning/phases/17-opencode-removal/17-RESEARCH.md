# Phase 17: OpenCode Removal - Research

**Researched:** 2026-10-16 (tree at HEAD `6cf7f9f`, after Phase 18 and commit `3079774`)
**Domain:** deletion of one Theia workspace member, one manifest key, one generator target and five registry rows, with the ledger, lockfile and quick-baseline follow-through
**Confidence:** HIGH. Every file:line below was re-read on HEAD `6cf7f9f`. The lockfile result was measured in a scratch copy of the workspace manifests. One item is ASSUMED (drivelist binary survival on the real tree's re-install).

## Summary

The milestone research (`.planning/research/ARCHITECTURE.md`, `PITFALLS.md`) still holds in substance. Three things changed or were wrong:

1. **Line numbers moved** in `scripts/verify-platform.sh` (+4 to +6 lines since `e9e29c1`) and `configuration.toml` (`[ai]` is now lines 117-128). The corrected list is below.
2. **`yarn install --frozen-lockfile` does NOT go red on a stale lockfile.** I ran it in a scratch copy with the adapter removed and the old lock in place. It exited 0 and left the lock unchanged. A forgotten lockfile regeneration is invisible to CI. The "no `@agentclientprotocol/sdk`" half of success criterion 3 therefore needs its own assertion, a `grep` over `theia/yarn.lock`. PITFALLS.md Pitfall 7 says the opposite, and the run refutes it.
3. **Keep `.gitignore:83` (`opencode.json`).** A root `opencode.json` exists on this machine. It is Chris's OpenCode CLI permission file, dated 2026-09-03, which predates Phase 16. The line sits under "Per-machine agent/editor tooling state". Deleting the line would expose that file to `git add`. ARCHITECTURE.md listed the line for deletion; that recommendation is wrong.

The planning-record work is smaller than ARCHITECTURE.md §C says. The v1.4 `.planning/REQUIREMENTS.md` already lists no AI-01..05 requirement; the old block is in the v1.3 archive. `MILESTONES.md` has no reference. What remains: one stale sentence in `ROADMAP.md` ("Kept and built: NG-051"), the `.planning/codebase/*.md` lines, and the closing checkboxes.

The `/mcp` route in `tab-uris` (`TabStoreAccessEndpoint`, NG-025/NG-026) is **shared, not OpenCode**. It must not be touched. The `POWERBROWSER_MCP_*` env vars are OpenCode-only: no code outside `backend-opencode` reads them.

**Primary recommendation:** use three sequential plans. 17-01 is a tracer that removes the workspace set. 17-02 removes the registry and manifest sets together, and that commit is the removal SHA. 17-03 handles docs, planning records, the baseline refresh, the final gate, and the `blocking-human` re-lock. Stage every deletion with `git rm` before running any check, because three of the affected checks read `git ls-files`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `[ai]` manifest key and its schema entry | Build input (`configuration.toml`, `scripts/lib/config-schema.json`) | — | The generator's unknown-key check reads the schema. Removing a key makes it a downstream contract change |
| `ai-backend.json` emission | Build tooling (`scripts/generate.mjs`) | `generated/` (untracked) | The TARGETS table drives `--check`. The writer never deletes extras |
| `powerbrowserAiBackend` frontend config key | Theia app manifest (`theia/applications/browser/package.json`) | — | A copy-over target of the deleted fragment. Nothing outside the adapter reads it |
| The adapter itself (ACP supervisor, chat agent, OpenCode `/mcp`) | Theia backend and frontend extension (`theia/extensions/backend-opencode`) | Yarn workspace (`node_modules` symlink, lockfile) | Never composed into the app; still a workspace member and a `build:extensions` step |
| Registry rows | Verification (`scripts/verify-platform.sh`) | Ledger (`check_locks`) | `ai-opencode-held` is quick tier; `ng051-backend-off` is full tier and ledger-locked |
| Tab-store `/mcp` endpoint | Theia backend (`tab-uris`) | — | **Out of scope.** It is a separate loopback listener for NG-025/NG-026 |
| 12 `@theia/ai-*` packages and the D-22 overrides | Theia app | `@powerbrowser/branding`, `tab-uris` | **Out of scope** (locked; RM-02 is Phase 19) |

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **NG-051 is already dropped by Chris** (ledger commit c3929e9, 2026-10-17, via
  `scripts/ledger-amend.py drop`). The removal commit may now delete
  `scripts/verify-ng-051-backend-off.mjs`.
- **Re-lock is Chris's step.** `ledger-amend.py lock-checks --commit <sha>` is not
  agent-allowed (hook). After the removal commit the phase gate will report
  `locked check missing: scripts/verify-ng-051-backend-off.mjs` until Chris runs
  `python3 scripts/ledger-amend.py --root . lock-checks --commit <removal-sha>` in
  his terminal. The plan ends with that as a `blocking-human` step that prints
  the exact command with the SHA filled in.
- **Theia AI stays stock** (Chris, 2026-10-16): the 12 `@theia/ai-*` packages stay
  composed and unmodified. Do not touch the D-22 overrides here (RM-02 is Phase 19).
- **DSH is out of scope**; nothing replaces OpenCode.
- Removal surface and pitfalls: `.planning/research/ARCHITECTURE.md` (three sets:
  manifest, workspace, registry) and `.planning/research/PITFALLS.md`. Each set is
  green only as a whole.
- Ignored leftovers must be removed on this checkout: `theia/extensions/backend-opencode/lib/`,
  the workspace symlink under `theia/node_modules/@powerbrowser/`, `generated/ai-backend.json`
  (the generator never deletes extra files).
- Commit the regenerated `theia/yarn.lock` in the same change; verify with
  `yarn install --frozen-lockfile` inside `nix develop .#theia`.
- Refresh `docs/non-gui/quick-baseline.txt` (R33) to the post-removal `--quick` FAIL set.
- Remove AI-01..05 and Phase 16 from live planning records only where still live;
  archived milestone files stay as history.
- Verification runs on port `PB_VERIFY_PORT` (default 3939) since commit 3079774.

### Claude's Discretion
Everything else, guided by ROADMAP success criteria and the research files.

### Deferred Ideas (OUT OF SCOPE)
Removing the `@theia/ai-*` framework — a later milestone, if ever (Chris: "we will work with it later").
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RM-01 | OpenCode is gone from the tree: `theia/extensions/backend-opencode`, the `[ai]` manifest key, its schema entry and generator emitter, the four OpenCode/NG-051 verify scripts, their registry rows, and the docs. `generate --check` reports 53 targets. AI-01..05 are removed from the requirements. The NG-051 ledger amend is approved by Chris before the commit. | Removal list (§Removal Surface), set ordering (§Plan Split), lockfile finding (§Pitfall 1), ledger mechanics (§Ledger and Gates), Validation Architecture |

Ledger IDs the plans must cite: **NG-074 and NG-084**. Neither is an RM-01 row. They are carried `deferred-approved` rows at phase 15, so `scripts/plan-gate.py --phase 17` counts them as due. Cite them the way `18-03-PLAN.md:9-10` does: in `requirements:` with a `ledger_note` saying they are carried and not closed. Verified: `python3 scripts/plan-gate.py --root . --phase 17 --plans .planning/phases/18-firefox-153-5-0esr` printed `plan gate passed: 2/2 IDs cited (phase 17)`, and the only ID-bearing citations in those plans are NG-074 and NG-084. RM-01 is not a ledger ID, so size-gate does not count it. [VERIFIED: scripts/plan-gate.py:64-68, :94 read; run output above]
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- Never fork or patch Theia core. Never edit `theia/node_modules/@theia/**` (`diff-theia-core.sh`).
- Never modify Gecko outside the patch stack. Phase 17 touches no Gecko file.
- Design for the bridge. `TabUriRegistry` is untouched by this phase.
- The repo path contains no space. It is compliant.
- Theia is the default GUI and stock chrome stays reachable. Untouched.
- The residual-brand scan is a permanent gate. **Stage before trusting it**, because it iterates `git ls-files`.
- Patches are never text-edited. No patch is involved.
- One driver, one registry. Remove rows from `scripts/verify-platform.sh`, and never create a sibling driver.
- Never assert on the absence of a log line. Derive expectations from the tree; do not hand-keep them. This is why `ng051-backend-off` is deleted rather than kept green.
- Builds run inside `nix develop .#theia`. `yarn` does not work outside it; `node` does.
- Memory: concurrent sessions on main. Re-read STATE.md, commit with explicit paths, and never use `--amend`, `-a` or `stash` while foreign files are staged. Untracked foreign files are present right now: `.planning/HANDOFF-plan-reorg.md`, `.planning/milestones/v1.3-phases/13-.../13-VERIFICATION.md`, `.planning/sketches/005-vscode-layout/`.
- Memory: one fix at a time, confirmed. Use sequential plans, each with its own `--quick` run.

## Removal Surface (verified on HEAD `6cf7f9f`)

### Set W — Workspace set (plan 17-01, tracer)

| Path:line | Action | Verbatim evidence |
|---|---|---|
| `theia/extensions/backend-opencode/` (13 tracked files, 1,829 lines) | `git rm -r`, then `rm -rf` the directory | Tracked: `opencode.mcp.json`, `package.json`, `tsconfig.json`, `src/browser/{backend-opencode-frontend-module,opencode-chat-agent,opencode-preset-commands,opencode-preset-contribution}.ts`, `src/common/opencode-service.ts`, `src/node/{backend-opencode-backend-module,opencode-acp-supervisor,opencode-bridge-env,opencode-changeset-emitter,opencode-mcp-contribution}.ts`. Ignored leftovers on disk: `lib/`, `tsconfig.tsbuildinfo` (`git status --ignored` shows `!!` for both) [VERIFIED: git ls-files, ls -la] |
| `theia/package.json:69` | delete the clause ` && yarn --cwd extensions/backend-opencode build` | `"build:extensions": "yarn --cwd extensions/branding build && ... && yarn --cwd extensions/chrome-bar build && yarn --cwd extensions/backend-opencode build",` [VERIFIED: theia/package.json:69] |
| `scripts/verify-backend-env-readers.mjs:101-104` | delete the second Map entry | `'theia/extensions/backend-opencode/src/node/opencode-bridge-env.ts',` (:102) [VERIFIED: :96-105 read]. The self-test does not depend on entry count; its planted cases add to the real map (:287, :305, :328, :344) |
| `scripts/verify-platform.sh:4560` | comment `a two-entry allowlist` becomes `a one-entry allowlist` | `# the live environment at all equals a two-entry allowlist each carrying its` [VERIFIED: :4560] |
| `theia/yarn.lock:5-9` | regenerate; do not hand-edit | Lines 5-8 are the `"@agentclientprotocol/sdk@1.4.0":` stanza; line 9 is blank. **Measured:** regeneration removes exactly these 5 lines and nothing else (diff `5,9d4`) [VERIFIED: scratch-copy run, see Code Examples] |
| `theia/node_modules/@powerbrowser/backend-opencode` (ignored symlink) | must be gone after install; `rm` it if `yarn` leaves it | `backend-opencode -> ../../extensions/backend-opencode` [VERIFIED: ls -la] |
| `theia/node_modules/@agentclientprotocol/sdk` (ignored) | must be gone after install | present today [VERIFIED: ls] |

`@agentclientprotocol/sdk` is the adapter's only exclusive dependency. Every other dependency (`@powerbrowser/token-gate`, `@theia/ai-chat`, `@theia/ai-chat-ui`, `@theia/ai-core`, `@theia/core`, `@theia/workspace`) is also declared by the app or by another member. No other lock stanza moves. [VERIFIED: theia/extensions/backend-opencode/package.json read; cross-grep of member manifests]

### Set R — Registry set (plan 17-02, same commit as Set M)

| Path:line | Action |
|---|---|
| `scripts/verify-ng-051-backend-off.mjs` | `git rm` (ledger-locked; see Ledger) |
| `scripts/verify-opencode-bridge.mjs`, `scripts/verify-opencode-presets.mjs`, `scripts/verify-opencode-tracer.mjs` | `git rm` |
| `scripts/verify-platform.sh:2616-2646` | delete the `# NG-051:` comment, `adapter_composed()`, `check_ai_opencode_held()`, and the trailing blank line. Line 2645 is `}`; line 2647 is `# --- the allowlist schema check ---` [VERIFIED: read] |
| `scripts/verify-platform.sh:4585-4603` | delete the `# NG-051 / D2(b): ...` comment and the whole `if adapter_composed; then ... else CHECKS+=("ai-opencode-held\|check_ai_opencode_held") fi` block, plus one blank line. Line 4583 is `)`; line 4604 is `if [ "$QUICK" -eq 0 ]; then` [VERIFIED: read] |
| `scripts/verify-platform.sh:4713` | comment `# --- non-GUI wave E (NG-051, NG-063..NG-067, ...` drops `NG-051, ` |
| `scripts/verify-platform.sh:4716` | delete `"ng051-backend-off\|node $REPO_ROOT/scripts/verify-ng-051-backend-off.mjs"` |
| `docs/non-gui/checks-wave-e.tsv:1` | delete the `NG-051` row. No script reads this file; only the comment at verify-platform.sh:4715 cites it [VERIFIED: git grep] |
| `docs/ai-opencode-adapter.md` | `git rm`. Its only machine reference is `verify-opencode-bridge.mjs:99`, which is deleted in the same commit. A planning note cites it as history, and that citation stays |

Order constraint: `verify-opencode-bridge.mjs:73` and `verify-ng-051-backend-off.mjs:16` import `emitAiBackend` from `generate.mjs` (`import { emitAiBackend, resolveConfig } from './generate.mjs';`). Delete them in the same commit as the emitter, or earlier. [VERIFIED: :16 read]

### Set M — Manifest set (plan 17-02)

| Path:line | Action | Verbatim evidence |
|---|---|---|
| `configuration.toml:117-128` | delete the blank line, the 9-line comment and the table. Line 116 (`theia_release = "1.74.1"`) becomes the last line | `127: [ai]` / `128: backend = "off"`; file is 128 lines [VERIFIED: read, wc] |
| `scripts/lib/config-schema.json:83-89` | delete the `"ai.backend": { ... },` object | `"regex": "^(off\|opencode)$",` (:86) [VERIFIED: read] |
| `scripts/generate.mjs:8` | `Fifty-four targets:` becomes `Fifty-three targets:` | prose only; the PASS line derives its count from `TARGETS` [VERIFIED: :8; only literal "54"/"fifty-four" in scripts/] |
| `scripts/generate.mjs:45-48` | line 45 `assignment, sourced by scripts/fetch-upstream.sh as its default), plus` ends with `default).` instead; delete lines 46-48 (the `16-03 AI backend-selection fragment` sentence) | [VERIFIED: :43-48 read] |
| `scripts/generate.mjs:2046-2087` | delete the doc block, `const AI_BACKENDS = Object.freeze(['off', 'opencode']);`, `export function emitAiBackend(config, variant) {...}`, and one blank line | [VERIFIED: :2046-2087 read] |
| `scripts/generate.mjs:3465-3477` | delete the `// NEW (16-03)` comment and the `generated: 'ai-backend.json', ... emit: emitAiBackend,` row | [VERIFIED: :3465-3477 read] |
| `theia/applications/browser/package.json:15` | delete `"powerbrowserAiBackend": "off",` | [VERIFIED: :15]. No frontend code outside the adapter reads the key; the frontend-config checks are key-specific (telemetry, branding), not whole-block [VERIFIED: git grep] |
| `docs/REBRANDING.md:299-304` | delete the `### \`[ai]\` — AI backend selection (optional)` section (heading, blank line, table head, row, trailing blank). Optionally add one line saying that a downstream manifest carrying `[ai]` now fails at the unknown-key step | [VERIFIED: :299-305 read]. `verify-rebranding-docs` maps schema to docs only (`verify-rebranding-docs.mjs:117-126`), so the schema key and the section must go together |
| `generated/ai-backend.json` (untracked, 23 bytes) | `rm` | present today [VERIFIED: ls] |

The generator's default echo `default applied -- ai.backend = "off"` disappears with the schema key. Nothing else in `generate.mjs` reads `config.ai` (the only hit is :2071). No other tracked `.toml` carries `[ai]`: `git grep '^\[ai\]'` returns only `configuration.toml:127`. [VERIFIED]

### Set D — Docs, planning records, baseline (plan 17-03)

| Path:line | Action |
|---|---|
| `docs/non-gui/quick-baseline.txt` | replace all 9 lines with the 4 rows red today: `gui08-canvas-geometry`, `gui08-canvas-geometry-self-test`, `gui08-panorama-copy`, `gui08-panorama-copy-self-test` (sorted). Derive the list from the post-removal `--quick` summary; do not type it by hand. Today's lines 1, 2, 7, 8 and 9 (`ai-opencode-tracer`, `gui07-strip-spike-verdict`, `gui08-persistence-roundtrip`, its self-test, `internals-catalogue`) all PASS or no longer exist [VERIFIED: --quick at 6cf7f9f: 114 PASS, 4 FAIL] |
| `docs/non-gui/decisions.md:39` | `lists the nine \`--quick\` rows already red on \`7b7a1f7\`` becomes stale. Recommend a one-sentence edit (the rows red at the Phase 17 refresh). Leave the rest of decisions.md as history |
| `.planning/ROADMAP.md:72-73` | `Kept and built: NG-051 (...)` add: dropped 2026-10-17 (c3929e9) with the adapter's removal in Phase 17 |
| `.planning/codebase/ARCHITECTURE.md:112`, `STRUCTURE.md:52,65`, `STACK.md:59,70,77,90`, `INTEGRATIONS.md:35,56,89` | drop the OpenCode, ACP, `ai-backend.json` and `POWERBROWSER_MCP_*` mentions; "eight" extensions becomes "seven". **Keep `STACK.md:85` (`opencode.json`)**, because that file is Chris's CLI config and still exists |
| `.planning/notes/ai-backends-goal.md`, `.planning/notes/pba-order-of-events.md`, `.planning/research/ai-review-ux-and-backend-adapters.md` | add the same "Superseded 2026-10-16" banner that `pba-plugin-shipping-design.md:6-7` carries; edit nothing else |
| `.planning/REQUIREMENTS.md`, `.planning/PROJECT.md:160-161` | tick RM-01 and the Active line at phase completion (the GSD completion flow normally does this). **No AI-01..05 requirement is live** in REQUIREMENTS.md; line 18 only says they are removed |

### Leave alone (verified)

- `.gitignore:83` `opencode.json` stays. See Summary item 3.
- `theia/extensions/tab-uris/src/node/tab-store-access-endpoint.ts:9-10`: the comment "Nothing here comes from the retired backend-opencode /mcp route" stays true. Leave it.
- `tab-uris` `STORE_ACCESS_ROUTE = '/mcp'` (`tab-store-access-protocol.ts:12`), `docs/tab-store-access.md`, and `verify-ng-025-store-read-endpoint.mjs` belong to NG-025/NG-026, not to OpenCode.
- `.planning/milestones/**`, `docs/non-gui/{GAPS.md,import-review.txt,proposed-lines.md,questions-wave-e.md,plans/*}`, `ledger/history/log.jsonl`: history.
- `powerbrowser/INTERNAL-APIS.md`, `inventory/brand-tokens.json`, `.planning/WINDOWS.md`, `.github/`, `flake.nix`, `README.md`, `docs/BUILD.md`, `docs/RELEASING.md`: no OpenCode reference. `git grep -c -i opencode` exited 1 [VERIFIED].
- The 12 `@theia/ai-*` packages (`theia/applications/browser/package.json:46-57`, 12 resolutions in `theia/package.json`) and the D-22 overrides (locked).

### Brand-scan impact (pre-checked)

No `inventory/brand-tokens.json` row counts a token inside a deleted file or region. The `-PLAN.md` frozen row (`"expected_count": 49`) counts 0 occurrences in all removed verify-platform.sh regions and in every deleted file. The rows that name `scripts/generate.mjs` count tokens (`MOZ_APP_ID`, `content/branding/`, and so on) that do not appear in the removed lines. No `expected_count` edit is expected. Still run `node scripts/scan-brand-residue.mjs` after staging. [VERIFIED: node parse of brand-tokens.json; grep counts]

## Ledger and Gates

- **State now:** NG-051 is `dropped` (ledger-report: `NG-051  dropped  With \`backend = "off"\`, no opencode process...`), and `phase-gate.py` exits 0 [VERIFIED: run]. The file remains in `check_locks.files`: `"scripts/verify-ng-051-backend-off.mjs": "696c1cad18a3219ad7f1584f9a9573c5bc11e740b411bf7759dfa642fb475900",` [VERIFIED: ledger/REQUIREMENTS.json:1158, read via grep]. All 54 locked files are `scripts/verify-ng-0NN-*.mjs`. Phase 17 edits none of them except deleting 051, and none of them references OpenCode, `emitAiBackend` or `ai-backend` (`git grep` exit 1) [VERIFIED].
- **Consequence after the removal commit:** `phase-gate.py` iterates every key in `check_locks.files` and prints `out.append(f"locked check missing: {key}")` when the read fails [VERIFIED: scripts/phase-gate.py:153-157]. NG-051 itself produces no line, because `due_rows` keeps only `("open", "done", "verified")` [VERIFIED: :32]. `check-ledger.py --complete` calls `run_phase_gate` (:428), so the **Stop hook blocks once** per session until the re-lock. This is the expected red. Do not "fix" it. The window opens as soon as the file leaves the working tree, not only at commit time, because phase-gate hashes working-tree files.
- **Re-lock command (Chris, terminal):** `python3 scripts/ledger-amend.py --root . lock-checks --commit <sha>`. `--root` is a top-level option (:295) and `lock-checks --commit` is required (:342-343) [VERIFIED]. lock-checks re-derives the file set from rows with status `open`/`done`/`verified` at that commit (:738-764). Dropped NG-051 is therefore excluded, and the new lock omits the file.
- **After Chris runs it:** the agent commits the three ledger files with explicit paths, as c3929e9 did (`ledger/REQUIREMENTS.json`, `ledger/checksums.sha256`, `ledger/history/log.jsonl`). `git add` with those paths is a permitted plain command. Then confirm `python3 scripts/phase-gate.py --root .` exits 0.
- **Hook traps hit in this session:** any Bash command naming `ledger/` alongside a shell operator is blocked. Any command string mentioning `ledger-amend.py` together with `lock-checks` or `drop` is also blocked, even a `grep`. Read `scripts/ledger-amend.py` with the Read tool. Read the ledger only with `python3 scripts/ledger-report.py --root .` or a single operator-free `grep`/`cat`.
- **size-gate:** a `*-plan.md` under `.planning` fails above 20 items (checkbox lines, `### Task N` headings, `<task` tags), 20 cited ledger IDs, or 500 lines. Lines inside ``` fences are not items [VERIFIED: scripts/size-gate.py:13-17, :39-50].

## Plan Split (recommended)

All plans are sequential, one wave each. W and R both edit `verify-platform.sh`, and concurrent sessions make parallel waves risky.

| Plan | Contents | Commit | Gate at end |
|---|---|---|---|
| **17-01 (tracer)** | Set W. Preflight: no foreign staged files, no `theia start` serving from `theia/**/lib`. Then `git rm -r`, `rm -rf`, the chain clause, the allowlist entry and its comment, `yarn install --ignore-scripts` in `.#theia`, drivelist check, lockfile diff assertion, frozen install in a fresh scratch copy | commit A | `--quick`: 114 PASS / 4 gui08 FAIL (`ai-opencode-held` still passes; it reads only the app's dependencies). `theia-build-order`, `backend-env-readers` (PASS line names a `1-entry allowlist`), `verify-upstream-pins` all PASS |
| **17-02** | Sets R and M together: the 4 scripts, adapter doc, registry regions, tsv row, toml, schema, generate.mjs, app key, REBRANDING section, `rm generated/ai-backend.json` | commit B = **removal SHA** | `generate --check` reports 53; `--quick` 113 PASS / 4 gui08 FAIL; `phase-gate.py` prints exactly `locked check missing: scripts/verify-ng-051-backend-off.mjs` |
| **17-03** | Set D, baseline refresh from the measured FAIL set, final success-criteria sweep, then `blocking-human`: print the re-lock command with SHA B filled in; after Chris confirms, commit the ledger files and re-run phase-gate | commit C (docs), commit D (ledger) | `phase-gate.py` exit 0; R33 subtraction prints nothing |

Why W first: it is the riskiest slice. It is the only part that needs the dev shell, yarn, and on-disk cleanup, and the only part where local and CI behaviour differ. It is green on its own, so a failure there leaves the ledger untouched. Why R and M together: the scripts import the emitter, and putting the ng-051 deletion second-to-last keeps the red Stop-gate window to one plan. Any later commit can serve as the lock SHA, because no other locked file changes. Assert `git diff --name-only B..HEAD -- 'scripts/verify-ng-*'` is empty before printing the command.

## Common Pitfalls

### Pitfall 1: Trusting `--frozen-lockfile` to catch an unregenerated lock
**What goes wrong:** the stale `@agentclientprotocol/sdk` stanza ships. CI stays green and criterion 3 is silently unmet.
**Why:** yarn 1.22.22 `--frozen-lockfile` fails only when the lock lacks something; extraneous entries pass. Measured in a scratch copy with the adapter removed and the old lock: `frozen_old_exit=0`, then `lock-unchanged`.
**How to avoid:** assert `! grep -q '@agentclientprotocol' theia/yarn.lock`, and assert that `git diff theia/yarn.lock` removes exactly the 5 lines (5-9) and adds none.

### Pitfall 2: Running checks before staging deletions
**What goes wrong:** `backend-env-readers` (`git ls-files -z`, :143), `verify-upstream-pins` and `scan-brand-residue` read the index. A file deleted on disk but still in the index produces a misleading result.
**How to avoid:** use `git rm` (which stages) for tracked deletions and `git add` for edits, then run checks. Commit with explicit paths.

### Pitfall 3: Ignored leftovers make local checks red, while CI stays green
`theia-build-order` uses `readdirSync` on `theia/extensions` (verify-theia-build-order.mjs:96). If `lib/` survives, the check fails with `extension directories present under ... but NOT named by \`build:extensions\`: "backend-opencode"`. If `generated/ai-backend.json` survives, `generate --check` fails with `generated/ai-backend.json -- is not one of the files this project generates` (generate.mjs:3970). The other `~/coding/Power-Browser-ng-*` clones and `~/gsd-workspaces/pba/Power-Browser` will need the same cleanup when they next pull. Note that in the summary.

### Pitfall 4: `yarn install` while another session serves the sidecar
The install rewrites `node_modules`. Something is listening on `:3000` on this host right now, with no visible owning process. Before 17-01's install, check `git status --porcelain`, `pgrep -af 'theia start'`, `ss -ltnp`, and `.worktree-lock` (currently held by this session id, `00a95695...`). If a foreign sidecar is live, stop and ask.

### Pitfall 5: drivelist native binary lost on re-install [ASSUMED]
`theia/node_modules/drivelist/build/Release/drivelist.node` exists today. Yarn classic may prune files not in its cache when it re-links. Without that binary, the backend fails at boot, but `--quick` stays green. After the install, check that the file still exists. If it is missing, run `(cd theia/node_modules/drivelist && node-gyp rebuild)` inside `.#theia`, the same step as BUILD.md:59-61 and verify.yml:83.

### Pitfall 6: Deleting `.gitignore:83` because it says "opencode"
See Summary item 3. The line guards a live per-machine file, not the adapter.

### Pitfall 7: Treating the `tab-uris` `/mcp` endpoint as OpenCode's
The string `/mcp` appears in `tab-uris` (NG-025/NG-026, a locked check `verify-ng-025-store-read-endpoint.mjs`). A `grep -r mcp | xargs rm` sweep would break a done ledger row and a locked check.

### Pitfall 8: Tree-wide `sed -i` for "opencode"
That sweep reaches `ledger/` (hook-blocked) and rewrites history files. Edit the listed lines only.

### Pitfall 9: A stale "nine rows" claim and an empty-diff baseline
The R33 command is `comm -13 docs/non-gui/quick-baseline.txt -`, and it needs sorted input. Build the new baseline from the summary using the same pipeline. Then run the R33 command and require empty output: the positive control. Also confirm that every baseline line is currently a FAIL row, so the baseline hides no PASS row: the negative control.

## Code Examples

### Lockfile regeneration and proof (measured in scratch; adapt paths for the real tree)
```bash
# 17-01, inside the dev shell, from the repo root
nix develop .#theia --command bash -c 'cd theia && yarn install --ignore-scripts'
git diff --stat theia/yarn.lock            # expect: 1 file changed, 5 deletions(-)
! grep -q '@agentclientprotocol' theia/yarn.lock
test ! -e theia/node_modules/@powerbrowser/backend-opencode
test ! -e theia/node_modules/@agentclientprotocol
test -f theia/node_modules/drivelist/build/Release/drivelist.node || \
  nix develop .#theia --command bash -c 'cd theia/node_modules/drivelist && node-gyp rebuild'
# CI-equivalent proof on a fresh copy (no node_modules): copy theia/package.json, theia/yarn.lock,
# applications/browser/package.json and extensions/*/package.json into the scratchpad, then
nix develop .#theia --command bash -c 'cd "$SCRATCH/theia" && yarn install --ignore-scripts --frozen-lockfile --prefer-offline'
```
Measured output on this host (scratch, adapter removed). Non-frozen: `success Saved lockfile. Done in 4.96s.` The diff is `5,9d4` covering the `@agentclientprotocol/sdk@1.4.0` stanza only. Frozen after that: `success Already up-to-date.`, exit 0. Frozen with the **old** lock: exit 0, lock unchanged, which is Pitfall 1. [VERIFIED: runs this session]

### Baseline refresh from the driver's own summary (R33 pipeline)
```bash
scripts/verify-platform.sh --quick > "$SCRATCH/quick.log" 2>&1   # ~67 s on this host
sed -n '/^verify-platform: summary/,$p' "$SCRATCH/quick.log" | grep ': FAIL$' \
  | awk '{print $1}' | sed 's/:$//' | sort > docs/non-gui/quick-baseline.txt
scripts/verify-platform.sh --quick 2>&1 | sed -n '/^verify-platform: summary/,$p' \
  | grep ': FAIL$' | awk '{print $1}' | sed 's/:$//' | sort \
  | comm -13 docs/non-gui/quick-baseline.txt -        # must print nothing
```
[CITED: docs/non-gui/decisions.md:43-45]

### Blocking-human step text
```bash
REMOVAL_SHA=$(git log -1 --format=%H -- scripts/verify-ng-051-backend-off.mjs)  # the commit that deleted it
test -z "$(git diff --name-only "$REMOVAL_SHA"..HEAD -- 'scripts/verify-ng-*')"
echo "Run in your terminal: python3 scripts/ledger-amend.py --root . lock-checks --commit $REMOVAL_SHA"
```

## State of the Art

| Old (milestone research) | Current (HEAD 6cf7f9f) | Impact |
|---|---|---|
| CI `--frozen-lockfile` fails on an uncommitted lock | It passes on a stale lock with an extra stanza | A grep assertion replaces reliance on CI |
| Delete `.gitignore:83` | Keep it | Protects Chris's `opencode.json` |
| Delete the REQUIREMENTS.md:87-119 AI block | Already absent from the v1.4 file | No REQUIREMENTS edit beyond the tick |
| verify-platform.sh :2612-2641 / :4581-4598 / :4708-4710 | :2616-2646 / :4585-4603 / :4713, :4716 | Use the new lines |
| configuration.toml :117-127 | :117-128 | — |
| NG-051 drop needs approval | Done (c3929e9) | Only the re-lock remains |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Re-installing in the real tree may prune `drivelist/build/Release/drivelist.node` | Pitfall 5 | Low. The backend fails at boot while `--quick` stays green. The post-install `test -f` catches it |
| A2 | The real-tree `yarn install` removes the `@powerbrowser/backend-opencode` symlink and the `@agentclientprotocol` directory (measured only on a fresh scratch install) | Set W | Low. The `test ! -e` assertions catch it; delete by hand if needed |
| A3 | The `:3000` listener is not a Power Browser sidecar | Pitfall 4 | Medium. An install under a live sidecar breaks it. The preflight asks before installing |

## Open Questions

1. **Could the re-lock happen before the removal commit, with no red window?**
   - What we know: lock-checks excludes dropped rows (:739). NG-051 is already dropped, and no other locked file changes in this phase. So `lock-checks --commit HEAD` run today would give the same `files` map as a run at the removal SHA, with only the `commit` field different.
   - What's unclear: whether Chris prefers that ordering. The locked decision places the re-lock after the removal commit.
   - Recommendation: keep the locked order. Mention the option to Chris in the 17-03 checkpoint text only; do not act on it.
2. **Should `decisions.md:39` be edited, given decisions.md is a wave record?** Recommendation: a one-sentence edit, because the line describes a live file. Everything else in decisions.md stays.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `nix develop .#theia` | yarn install | ✓ | yarn 1.22.22, node 22.23.2, node-gyp in shell | — |
| yarn offline cache | scratch frozen install | ✓ | install took about 5 s with `--prefer-offline` | network |
| host `node` | generate.mjs, verify scripts | ✓ | v24.x | — |
| python3 | gate scripts | ✓ | — | — |

No Gecko build and no browser are needed. `--quick` takes about 67 s here.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `scripts/verify-platform.sh` registry (bash driver, node/python checks) |
| Config file | the `CHECKS` array inside `scripts/verify-platform.sh` |
| Quick run command | `scripts/verify-platform.sh --only <label>` |
| Full suite command | `scripts/verify-platform.sh --quick` (the commit gate; full set is not required for this phase: no build artefact changes) |

### Phase Requirements → Test Map (each with its failing direction)
| Criterion | Check / command | Goes red when |
|---|---|---|
| RM-01.1 no adapter dir tracked | `test -z "$(git ls-files theia/extensions/backend-opencode)"` and `test ! -e theia/extensions/backend-opencode` | any tracked file remains, or ignored `lib/` remains |
| RM-01.1 build chain agrees with tree | `--only theia-build-order` | chain names a missing dir (`names "backend-opencode", which is not a directory`) **or** dir present but unnamed (`present ... but NOT named`) |
| RM-01.1 env allowlist agrees | `--only backend-env-readers` | entry kept after file removed (`STALE ALLOWLIST ENTRY`), or entry removed while file still tracked (`UNGATED ENV TOUCHER`) |
| RM-01.1 no `[ai]` / schema key / emitter | `! git grep -q -E '^\[ai\]\|"ai\.backend"\|emitAiBackend' -- configuration.toml scripts/` | any survives |
| RM-01.1 schema and docs agree | `--only verify-rebranding-docs` | schema key kept while the docs section was deleted (`does not document 'ai.backend'`) |
| RM-01.1 manifest valid | `--only generate-check` | `[ai]` kept while the schema key was removed (unknown-key failure), or stale `generated/ai-backend.json` (`is not one of the files this project generates`) |
| RM-01.1 no OpenCode scripts or rows | `test -z "$(git ls-files 'scripts/verify-opencode-*' scripts/verify-ng-051-backend-off.mjs docs/ai-opencode-adapter.md)"` and `! grep -q -E 'ai-opencode\|ng051\|adapter_composed' scripts/verify-platform.sh` | any survives |
| RM-01.2 53 targets | `node scripts/generate.mjs --check` prints `all 53 generated file(s)` | 54 (TARGETS row kept) or an extra-file FAIL |
| RM-01.3 lockfile | `! grep -q '@agentclientprotocol' theia/yarn.lock` plus a 5-deletion `git diff --numstat` | stanza kept (frozen install would NOT catch this) |
| RM-01.3 frozen install | fresh scratch copy: `yarn install --ignore-scripts --frozen-lockfile` | lock missing a needed entry |
| RM-01.3 gate | R33 pipeline over `--quick` prints nothing; the FAIL set equals the 4 gui08 rows | any new red, or a baseline row that now passes |
| RM-01.3 brand scan | `node scripts/scan-brand-residue.mjs` after `git add` | count drift (none expected) |
| RM-01.4 ledger | `python3 scripts/phase-gate.py --root .` exit 0 after the re-lock; before it, exactly one line `locked check missing: scripts/verify-ng-051-backend-off.mjs` | any other line (for example a locked file edited by mistake: `test file changed`) |
| RM-01.4 AI stays | `grep -c '"@theia/ai-' theia/applications/browser/package.json` = 12 and `grep -c '"@theia/ai-' theia/package.json` = 12 | any removed |
| RM-01.4 plan coverage | `python3 scripts/plan-gate.py --root . --phase 17 --plans .planning/phases/17-opencode-removal` | NG-074 or NG-084 not cited |

### Sampling Rate
- Per task: the `--only` rows named above for the files touched.
- Per plan: full `--quick` plus the R33 subtraction.
- Phase gate: every row of the table above, plus `phase-gate.py` exit 0 after the re-lock.

### Wave 0 Gaps
None. No new registry row is needed. A permanent "no opencode" row would be an absence assertion with nothing left to emit, which is exactly what verification rule 1 forbids. The success criteria are phase-verification commands, not lasting checks.

## Security Domain

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | The schema unknown-key check now rejects `[ai]` in downstream manifests (a correct fail-closed contract) |
| V14 Configuration | yes | `yarn install --ignore-scripts` (BUILD.md:72-101); no new dependency |
| V2/V3/V4/V6 | no | The token gate and the tab-store endpoint are untouched |

Net effect: the attack surface shrinks. The removal deletes an unconditionally bound ACP child-process supervisor and its `/mcp` route, and it removes the one non-sanctioned live-environment reader from the backend-env allowlist. Package Legitimacy Audit: not applicable, because nothing is installed. The only package change is the removal of `@agentclientprotocol/sdk`.

## Sources

### Primary (HIGH)
- Tree reads at HEAD `6cf7f9f`: every file:line cited above.
- Runs this session: `scripts/verify-platform.sh --quick` (114 PASS, 4 FAIL: gui08-canvas-geometry, its self-test, gui08-panorama-copy, its self-test; `generate: --check PASS -- all 54 generated file(s)`); `python3 scripts/ledger-report.py --root .`; `python3 scripts/phase-gate.py --root .` (exit 0); `plan-gate.py --phase 17` (2/2); scratch yarn installs (regenerated, frozen, frozen on the stale lock).
- `scripts/phase-gate.py`, `plan-gate.py`, `size-gate.py`, `check-ledger.py`, `ledger-amend.py` (Read).

### Secondary (MEDIUM)
- `.planning/research/ARCHITECTURE.md`, `PITFALLS.md` (2026-10-16): re-verified and corrected as noted.

## Metadata

**Confidence breakdown:**
- Removal surface: HIGH. Every line was re-read on HEAD.
- Lockfile and frozen behaviour: HIGH. Measured.
- Ledger mechanics: HIGH. Code read; the post-removal red line is inferred from the code, not run.
- drivelist survival: LOW (A1).

**Research date:** 2026-10-16
**Valid until:** the next commit that touches `scripts/verify-platform.sh`, `scripts/generate.mjs` or `theia/` (line numbers drift); 7 days at most, given concurrent sessions.
