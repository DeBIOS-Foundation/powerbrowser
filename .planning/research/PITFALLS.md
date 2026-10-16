# Pitfalls Research

**Domain:** v1.4 Platform Updates and GUI Close-out: OpenCode removal, Firefox 153.1 → 153.5.0esr, Theia 1.74.1 → 1.76.0 with React 19 and Node 24, non-GUI gaps, GUI leftovers, live UAT, CI green
**Researched:** 2026-10-16
**Confidence:** HIGH for tree facts, tag and blob facts, and the hook/gate mechanics (each re-read or re-run in this session). MEDIUM for runtime behaviour at Theia 1.76 / React 19, because no sidecar has been started at 1.76 and no Gecko build exists at 153.5.

Phase names below follow the build order in `.planning/research/ARCHITECTURE.md` ("Build Order for v1.4"): **17** OpenCode removal, **18** Firefox 153.5, **19** Node 24 then Theia 1.76 + React 19, **20** non-GUI gaps, **21** Panorama spec + `gui08` checks, **22** Phase 14 / 14.1.1 leftovers, **23** sketch 005 decision, **24** live UAT, **25** CI green. If the roadmap renumbers, map by name.

Evidence labels: **[verified]** re-checked in this session; **[tree]** read from a tracked file; **[inferred]** reasoned from tree facts, not run.

---

## Critical Pitfalls

### Pitfall 1: The ESR tag you pin is not the commit the trial tested, and tags can move

**What goes wrong:**
The 2026-10-15 trial reported "all 4 patches applied cleanly, `mach configure` passed" for 153.5. STACK.md records that the trial resolved `FIREFOX_153_5_0esr_RELEASE` to `f617beaded` (a later esr153 commit, version 153.6.0esr, 183 commits ahead), not to `223014c6b9`. Today both `FIREFOX_153_5_0esr_BUILD1` and `_RELEASE` resolve to `223014c6b9299ac9b035b4c50ea481e5c6de282c` [verified, `git ls-remote`]. The previous point release shows the tags do not always agree: `FIREFOX_153_4_0esr_BUILD1` = `f92008fc60`, while `_RELEASE` = `_BUILD3` = `508788b6f8` [verified]. A pin by tag name alone therefore admits two failure modes: (a) treating trial evidence as evidence for the pinned commit, and (b) a fresh CI clone getting a different commit from the local `upstream/` if a tag is re-pointed later.

**Why it happens:**
`scripts/fetch-upstream.sh:276-299` compares HEAD to the tag *inside the local clone*. A local `upstream/` cloned before a tag move keeps the old commit and still passes. CI's `verify.yml` clones fresh, so it gets the new target. The comment at `fetch-upstream.sh:276-282` also states that RELEASE and BUILD1 share a commit, which is false for 153.4.

**How to avoid:**

- Before the pin edit, run `git ls-remote --tags https://github.com/mozilla-firefox/firefox.git 'refs/tags/FIREFOX_153_5_0esr_*'`. Confirm BUILD1 and RELEASE are the same SHA, and record that SHA in the `docs/BUILD.md` rebase record next to the tag.
- STACK.md recommends `_BUILD1`. The existing convention is `_RELEASE`. Either is the same commit today. Pick one, record the SHA, and do not cite the 10-15 trial as evidence for that commit. Re-run the replay and configure on `223014c6b9`.
- Fix the comment at `fetch-upstream.sh:276-282` (the handoff already lists this). Keep the hash comparison, which is correct.

**Warning signs:**
`git -C upstream rev-parse HEAD` differs from the SHA in the rebase record. `upstream/browser/config/version_display.txt` reads anything other than `153.5.0esr`. CI and local disagree on an upstream-reading row (`about-dialog-suppression`, `shell-gbrowser-standin`, `installer-schema`).

**Phase to address:** 18

---

### Pitfall 2: "Full verify-platform green" after the ESR bump needs more than one build, and one row stays green on stale evidence

**What goes wrong:**
After the rebase, `upstream/` says 153.5 but three objdirs on disk are 153.1 [verified]: `objdir/` (BuildID 20260928142802), `objdir-release/` (BuildID 20260904213953, built in 08-05, mach wall 54:40), and `objdir-nplus1/`. Rows that derive the version from the tree go red correctly:

- `verify-branding-identity-release` derives the expected `--version` from `upstream/browser/config/version_display.txt` (`scripts/verify-branding-identity.mjs:75-78, :267, :545-547`), so it fails against the 153.1 release objdir.
- `installer-build-proof` reads `upstream/config/milestone.txt` (`scripts/verify-installer-build-proof.mjs:229`) against `objdir/`.
- `smoke-firefox` carries a hard-coded `153.1.0esr` (`scripts/smoke-firefox.sh:41-42`, found by STACK.md). This is a hand-kept expectation and breaks verification rule 2.

One row stays green when it should not: `mar-update-hop` (`verify-platform.sh` full set) re-verifies stored evidence under `.mozbuild/mar-hop/` (`hop.json`, `nplus1.mar`, logs). It does not tie that evidence to the current tag. A full green run after the bump would therefore certify a 153.1 → 153.1.x hop as if it were current.

**Why it happens:**
"Full build" is read as one `./mach build`. The registry's full set reads the dev objdir, the release objdir, and stored MAR evidence. These are three different artefacts with three different ages.

**How to avoid:**

- Budget two tier-3 builds for phase 18: dev (about 47-54 min) and release (about 55 min). `objdir-nplus1` and the MAR hop belong to release work (backlog 999.2). Record `mar-update-hop` as "evidence predates 153.5" in the phase verification. Do not report it as a 153.5 proof.
- Change `smoke-firefox.sh:41-42` to derive the version from `version_display.txt`, the same way `verify-branding-identity.mjs` does, in the same commit as the pin move.
- Run `scripts/verify-platform.sh` (full), not `--gate`. WINDOWS #10 is fixed, so the release-variant exclusions no longer apply.

**Warning signs:**
A full run where `verify-branding-identity-release` passes while `objdir-release/dist/bin/application.ini` still reads `Version=153.1.0`. A phase summary that says "full verify green" with only one build in its log.

**Phase to address:** 18

---

### Pitfall 3: "Refreshing" the patch stack by hand for the new tag

**What goes wrong:**
The 4 patches touch 5 files: `browser/moz.build`, `browser/moz.configure`, `browser/installer/windows/nsis/{defines.nsi.in,installer.nsi}` and `toolkit/mozapps/update/updater/moz.build`. All 5 have the same blob SHA at 153.1 (`468445e58d`) and 153.5 (`223014c6b9`). For example, `browser/moz.build` is `5a03cfc6d3` in both, which is the `index 5a03cfc6d3..` line of `patches/020-powerbrowser-shell.patch` [verified, GitHub contents API]. The patches therefore need **no change**. The trap is "tidying" them for 153.5 by editing hunk headers, the `index` lines, or comment text inside a hunk. Per CLAUDE.md, a hand-edited hunk whose blob hashes no longer match turns `git apply --3way` into a silent no-op (`scripts/apply-patches.sh:6-10`).

**Why it happens:**
A version bump invites cosmetic edits. Patch files look like text, and nothing in the commit gate re-applies them. `apply-patches-self-test` and `about-dialog-suppression` are full-set rows, re-tiered out of `--quick` because they need `upstream/` (`verify-platform.sh:4636-4660`).

**How to avoid:**

- Replay with `scripts/rebase-upstream.sh --tag <tag>` exactly as-is. It composes `fetch-upstream.sh`, `apply-patches.sh` (D-75 non-vacuity assertion), `check-patch-surface.sh`, and the residual-brand scan with `--extra-root upstream`.
- If any patch ever needs a change, edit the patched tree under `upstream/` and regenerate the patch from it. Never edit a `.patch` file in an editor. `docs/BUILD.md` has no regeneration command today, only CLAUDE.md's rule. Add one to the rebase section if a regeneration ever happens.
- Run `bash scripts/apply-patches.sh --self-test` and `--only about-dialog-suppression` after the replay.
- `deferred-items.md` (phase 01, row 11 a-ii) says "re-derive the self-test fixture at the first ESR bump". This is that bump. `browser/base/content/aboutDialog.xhtml` is unchanged (`3ffd464b96` at both tags) [verified], so the authored fixture is still accurate. Record that check as done rather than leaving the item open.

**Warning signs:**
`git diff patches/` is non-empty in the ESR commit. The classifier in `fetch-upstream.sh` reports "pristine" after `apply-patches.sh` ran. `git -C upstream diff --stat` lists a path the patches do not name.

**Phase to address:** 18

---

### Pitfall 4: React 18 left in place builds green, and nothing gates a duplicate React

**What goes wrong:**
`@theia/core@1.76.0` declares `react`, `react-dom`, `@types/react` and `@types/react-dom` as `^19.0.0` **peer** dependencies [verified, `npm view`]. Yarn classic only warns on an unmet peer. With `theia/applications/browser/package.json:95-96` left at `react`/`react-dom` `18.3.1` and `theia/package.json` devDependencies left at `@types/react 18.3.31` / `@types/react-dom 18.3.7`, `yarn install` and `yarn build` both succeed. Theia's 1.76 code then runs on React 18 at runtime. Its lib is compiled with the automatic JSX runtime through `@theia/core/shared/react/jsx-runtime` (CHANGELOG 1.75.0, #17932). The failure shows up in widgets, not in the build. A second failure mode is the 18 types at the root combined with a nested 19 copy: TypeScript then sees two `@types/react`, or the typecheck passes against 18 types while 19 runs.

**Why it happens:**
The Theia re-pin runbook (`docs/BUILD.md:211-253`) moves only `@theia/*` pins. `verify-upstream-pins.mjs` steps 6-7 check only `@theia/*` entries and stanzas. No row asserts how many copies of `react`, `react-dom`, `@types/react` or `inversify` are installed. Today there is exactly one copy of each (react 18.3.1, inversify 6.2.2) [verified]. That is luck, not a gate.

**How to avoid:**

- Move all four React packages in the same commit as the Theia pins, to the set STACK.md names (react/react-dom 19.2.8, @types/react 19.2.18, @types/react-dom 19.2.7: what Theia v1.76.0's own lockfile resolves).
- Add a `resolutions` entry for each of the four, so a transitive range cannot introduce a second copy.
- Add one `--quick` row, derived not hand-kept: walk `theia/node_modules` for every `react`, `react-dom`, `@types/react`, `@types/react-dom` and `inversify` `package.json`, then require exactly one copy each, with the React version matching `@theia/core`'s peer range. Give it a `--self-test` that plants a nested second copy. Append the row to `verify-platform.sh`; do not create a sibling driver.
- Extensions already import only `@theia/core/shared/react` and `@theia/core/shared/inversify` (all 4 React files and every DI import) [verified]. Keep it that way. A bare `from 'react'` in an extension resolves past core and can create a second instance.

**Warning signs:**
`yarn install` prints `has unmet peer dependency "react@^19.0.0"` or `incorrect peer dependency`. The browser console shows "Invalid hook call" or "A React Element from an older version of React was rendered". A widget renders an empty node while every gate is green.

**Phase to address:** 19 (step b, the Theia + React commit)

---

### Pitfall 5: Changing Node, React and Theia in one step makes every failure ambiguous

**What goes wrong:**
The trial moved Theia and React together and never started the sidecar. If Node 24, React 19 and Theia 1.76 land as one change, a blank widget, a native-module load error or a DI resolution failure cannot be attributed to any one of them.

**Why it happens:**
The three changes look coupled. They are coupled only one way. `@theia/core@1.74.1` peers accept `react ^18.3.1 || ^19.0.0` [verified], so React 19 can be proven at 1.74.1. Theia ≥ 1.75 requires React 19. The published 1.76 packages declare no `engines`, so Node 24 is a choice (it supersedes D-16), not a requirement of the package metadata.

**How to avoid:**
Use three commits, each followed by `--quick` and a live sidecar start:

1. Node 24 at Theia 1.74.1 and React 18. Edit only `flake.nix:20`. Keep the `yarn.override` and rewrite the D-16 comment. Rebuild `drivelist`. Run `smoke-theia.sh`.
2. React 19 at Theia 1.74.1. Pins and resolutions only.
3. Theia 1.76.0. Pins and lockfile, delete D-22 rebind 2, set the `workbench.startupEditor` default.
ARCHITECTURE.md proposes splitting 1 from 2+3. Splitting 2 from 3 costs one more install and isolates the React 19 runtime question from the 1.76 API question. This matches the "one fix at a time, confirmed" rule.

**Warning signs:**
A plan task that edits `flake.nix`, `theia/package.json` resolutions and React pins in one commit. A verification line that says "builds" with no live start.

**Phase to address:** 19

---

### Pitfall 6: A green typecheck and build at 1.76 hide first-boot and runtime regressions

**What goes wrong:**
Several 1.76 changes compile cleanly and change what the user sees:

- **`@theia/getting-started` comes back.** `@theia/ai-ide@1.76.0` lists `@theia/getting-started: 1.76.0` as a dependency [verified], and that package declares `theiaExtensions` [verified]. Theia collects extensions transitively, so Theia's own Welcome page opens on start. That undoes D-24/D-33, recorded at `theia/extensions/branding/src/browser/powerbrowser-welcome-contribution.ts:28-33` and `powerbrowser-welcome-widget.tsx:11`. STACK.md has the fix: `workbench.startupEditor: "none"` as a default preference.
- **Telemetry schema collision.** `@theia/plugin-ext` now pulls in `@theia/telemetry`, which also registers `telemetry.telemetryLevel` (STACK.md). The Settings text may become Theia's, not the PowerBrowser copy in `theia/extensions/telemetry/src/browser/telemetry-preferences.ts`.
- **`view:` targets fail only when used.** `theia/extensions/tab-uris/src/browser/view-factory-table.ts` is a hand-kept table of Theia widget factory ids, each cited to a 1.74.1 source line. Its drift check in `tab-uri-registry.ts:59-72` runs lazily, on first use of the `index` getter. It reports by `console.error`, not at startup. A renamed id at 1.76 surfaces only when someone opens a `view:` URI. (The ai-configuration id is unchanged at 1.76 [verified], but about 25 rows were not checked.)
- **Render errors no longer throw.** Under React 19, an uncaught render error goes to `window.reportError`, and the widget root goes blank. Telemetry capture listens on the window `error` event, so it should still see it (STACK.md). That is UNVERIFIED.

**Why it happens:**
The static gates compare strings in the tree. They cannot see DI wiring, transitive extension composition, or DOM geometry. That is the 2026-09-06 lesson in memory (`live-gui-debug-loop`): a phase verified 10/10 while the chrome bar rendered at 37% width. First-boot behaviour (`initializeLayout`, `startupEditor`) also runs only when no persisted layout exists. A live check on a reused `THEIA_CONFIG_DIR` (`~/.config/powerbrowser`) skips it entirely.

**How to avoid:**

- Run the live check twice: with a fresh empty `THEIA_CONFIG_DIR`, and with a carried-over 1.74 config dir (to check that layout, modes and named setups survive the `unload` → `pagehide` change).
- On the fresh run, assert: one PowerBrowser welcome tab, no Theia Welcome, no AI Configuration tab, no AI-first perspective.
- Open at least one `view:` URI and read the console for `[@powerbrowser/tab-uris] view-factory-table.ts names`. Then plant one bogus row in a scratch copy to prove the message fires (see Pitfall 8). Better: re-derive the table's ids from `theia/node_modules/@theia/*/lib` at check time instead of re-citing line numbers by hand.
- Drive the sidecar standalone on `:4000` with `POWERBROWSER_TOKEN_DISABLE=1` and `gsd-browser` (memory `live-gui-debug-loop`). Measure rectangles; do not trust screenshots alone.

**Warning signs:**
Two welcome tabs on a fresh profile. A Help menu "Open Walkthrough" item. `Property with id 'telemetry.telemetryLevel' already exists` in the console. A `view:` link that opens nothing.

**Phase to address:** 19 (live sidecar check), re-checked in 24 (UAT)

---

### Pitfall 7: OpenCode removal that is green in CI and red locally (or the reverse)

**What goes wrong:**
ARCHITECTURE.md lists the four atomic removal sets. The local-versus-CI traps inside them:

- `git rm -r theia/extensions/backend-opencode` leaves the ignored `lib/` and `tsconfig.tsbuildinfo` on disk, plus the workspace symlink `theia/node_modules/@powerbrowser/backend-opencode -> ../../extensions/backend-opencode` [verified]. `theia-build-order` (`scripts/verify-theia-build-order.mjs:261-264`) compares the `build:extensions` chain with `readdirSync`. It goes red locally and stays green in CI's fresh clone.
- A stale `generated/ai-backend.json` makes `generate-check` red on every checkout that ever generated it, including `~/gsd-workspaces/pba/Power-Browser`. The writer never removes extra files.
- Removing a workspace member changes yarn's top-level patterns. Until `yarn install` runs, `yarn check --integrity` reports `Top level patterns don't match`: the symptom `deferred-items.md` (14.1.1) logged for weeks. If `yarn.lock` is not re-committed, CI's `--frozen-lockfile` install (`.github/workflows/verify.yml:83`) fails, because `@agentclientprotocol/sdk@1.4.0` leaves the lock.
- `scripts/verify-backend-env-readers.mjs:96-105` holds a hand-kept `EXPECTED_ENV_TOUCHERS` entry for `opencode-bridge-env.ts`. It must be deleted in the same commit.

**Why it happens:**
CI always starts from a fresh clone (no ignored files, no `generated/`, no `.yarn-integrity`). Developer checkouts carry months of ignored state.

**How to avoid:**
`git rm -r`, then `rm -rf theia/extensions/backend-opencode`, then `yarn install --ignore-scripts` inside `nix develop .#theia` (not frozen; the lock moves on purpose), then `rm generated/ai-backend.json`, then `node scripts/generate.mjs --check` (expect 53 files). Commit `yarn.lock`. Re-run with `--frozen-lockfile` to prove CI's step passes. Do not run `yarn install` while another session serves a sidecar from `theia/**/lib` (14.1.1 deferred item 1).

**Warning signs:**
`theia-build-order` names `"backend-opencode"` as present but not in the chain. `generate-check` reports an extra file. `yarn check --integrity` fails with `Top level patterns don't match`.

**Phase to address:** 17

---

### Pitfall 8: Absence assertions that go vacuously green after the change

**What goes wrong:**
CLAUDE.md verification rule 1 says: never assert on the absence of a log line unless the code under test is proven to emit it. v1.4 creates several new chances to break that rule:

- `ng051-backend-off` asserts the backend never spawns `opencode` and that `GET /mcp` is 404 (`scripts/verify-ng-051-backend-off.mjs:1-8`). Once the adapter is deleted, both are true by construction. Keeping the row "because it still passes" keeps a check that cannot go red. Delete the row with the adapter (the registry set in ARCHITECTURE.md).
- The `view-factory-table` drift message (Pitfall 6) is emitted lazily. A live check that greps for its absence without first touching `index` proves nothing.
- Theia's DOM can drift. `verify-platform.sh:3440-3447` waits for `#theia-app-shell .lm-MenuBar` and `#theia-statusBar`, "verified against the pinned Theia v1.74.1 DOM". Those presence waits fail loudly, which is correct. Any check written as "no element matches X" goes green if Theia renames X. The chrome-bar and modes stylesheets carry 12 selectors on Theia internals (`chrome-bar.css`: 9, `modes.css`: 3) [verified]. When Theia renames one, the rule stops applying and nothing errors.
- New Theia log text at 1.76 (for example the `telemetry.telemetryLevel already exists` warning, or the removed `Child node ... does not belong to this tree` line) must not be asserted absent without a positive control that makes Theia emit it in the same run.

**Why it happens:**
An absence check is green by default. Upstream renames turn a live check into a decorative one, and a deletion makes it vacuous.

**How to avoid:**
Every absence assertion added or kept in phases 19-24 gets a same-run positive control: plant the condition in a scratch copy and require the message, then require its absence on the real tree. This is the `--self-test` convention the registry already uses (for example `verify-shell-error-copy.mjs` and `verify-web-tab-live.mjs`'s `BROKEN_INSTRUMENT_MARKER` scorer). After the Theia move, re-verify `verify-platform.sh:3440` and every Theia selector in the two CSS files against the 1.76 DOM once, by measuring in `gsd-browser`.

**Warning signs:**
A check that passed identically before and after its subject was deleted. A CSS rule in `chrome-bar.css` whose selector matches zero elements in the live DOM.

**Phase to address:** 17 (ng051), 19 (selectors, table, logs), 21 and 24 (GUI checks)

---

### Pitfall 9: The commit gate and the Stop hook are red for a known GUI reason through the whole non-GUI half

**What goes wrong:**
The ledger `check_cmd` is `scripts/verify-platform.sh --quick` [verified]. `.claude/hooks/ledger-stop-gate.py` runs it on every Stop (`check-ledger.py --complete --run-check`), and `--quick` is red on the four `gui08` rows until phase 21 (CI run 36495714210, 2026-09-28: `verify-gui08-canvas-geometry` and `verify-gui08-panorama-copy` plus their self-tests) [verified]. Each session's Stop is therefore blocked once (`block_once`) through phases 17-20. Three wrong responses follow from that:

- Fixing the `gui08` checks early. Chris decided the Panorama spec stays in the GUI half (handoff decision 1).
- Loosening a check to get green.
- Learning to ignore the red, so a new red in phase 17 or 19 goes unnoticed.

Other hook traps:

- SessionStart on `resume`/`compact` runs the check with a 120 s timeout (`ledger-session-check.py:186-200`). That exceeds the VSCode extension's 60 s spawn timeout, which is why the 2026-10-15 session could not be resumed. A session holding a 50-minute Gecko build cannot be resumed either.
- The PreToolUse ledger hook blocks any Bash command where a path-like token resolves into `ledger/` and a shell operator (`|`, `;`, `&&`, `>`) appears. This blocked three read-only `jq`/`grep` pipes in this research session. A tree-wide `sed -i`/`grep -l | xargs` sweep for "opencode" reaches `ledger/REQUIREMENTS.json` and `ledger/history/log.jsonl` and is blocked. Done-row NG-051 and the AI-01..05 rewrite need Chris (`APPROVE`/`DROP` lines, `scripts/ledger-amend.py`). The agent cannot record them.
- `scripts/size-gate.py` rejects a `*-plan.md` with more than 20 items, 20 cited ledger IDs, or 500 lines. The OpenCode removal (about 4.2k deleted lines, more than 25 file-level edits) will hit it if planned as one plan.

**Why it happens:**
The gate is a single pass/fail over the whole registry. A known red removes its signal for everything else.

**How to avoid:**

- Use the subtraction rule already ratified in `docs/non-gui/decisions.md` (R33): the gate passes when `--quick` failures, minus `docs/non-gui/quick-baseline.txt`, are empty. Refresh the baseline after phase 17 (it still lists `ai-opencode-tracer`) and after phase 19. Do not wait for phase 20. A stale baseline either hides a new red or reports a removed row as missing.
- Decide whether `ledger-session-check.py` should stop running the check on `resume` (handoff "optional fix"). It is a hook change, so it needs Chris's decision.
- Ask Chris for the NG-051 drop **before** the phase 17 commit. ARCHITECTURE.md notes that the phase gate goes red otherwise.
- Split the OpenCode plan by removal set (manifest, workspace, registry) so that each plan stays under the size gate. The sets still land in one commit if the plans share a wave.
- Run Bash reads of `ledger/` as single commands with no operators, or use `python3 scripts/ledger-report.py`.

**Warning signs:**
"completion gate fails" in a Stop where the only failures are `gui08-*`. A plan rejected by `size-gate`. `LEDGER FROZEN` on a command that also edits non-ledger files.

**Phase to address:** 17 (baseline refresh, NG-051 approval, plan split), 19 (baseline refresh), 21 (gate green)

---

### Pitfall 10: The residual-brand scan misses new files and goes red on deleted citations

**What goes wrong:**

- The scan builds its file set from `git ls-files` (`scripts/scan-brand-residue.mjs:329`). An unstaged new file is invisible to it. v1.4 adds new files: the React single-copy check, any new `verify-*.mjs`, and new `docs/BUILD.md` sections. A green scan before `git add` proves nothing about them.
- The frozen `-PLAN.md` row in `inventory/brand-tokens.json` counts **49** occurrences across 10 files, including `scripts/verify-platform.sh`, `powerbrowser/INTERNAL-APIS.md` and `token-gate/src/node/parent-watchdog-backend-contribution.ts` [verified]. Removing registry blocks or comments that cite a plan file, or adding new citations, moves the observed count and turns `scan-brand-residue` red. This happened during phase 16: 36 expected, 37 then 39 observed.
- `inventory/brand-tokens.json` is the only file that may name the originating product. Writing that name in a new doc or check fails the scan.

**Why it happens:**
The scan reconciles exact counts so that it can go red. Every deletion-heavy commit, which describes phase 17, interacts with it.

**How to avoid:**
Stage first, then run `node scripts/scan-brand-residue.mjs`. If the `-PLAN.md` count moves, bump the row's `expected_count` and add one "COUNT MOVED a -> b" reason line in the same commit (precedent 12-02; the row's own reason text shows the format). Do not exclude the files instead.

**Warning signs:**
The scan is green on a tree whose `git status` shows `??` entries under `scripts/` or `docs/`. A red on the `-PLAN.md` row in a commit that only deleted code.

**Phase to address:** 17, and every phase that adds a file

---

## Moderate Pitfalls

### Pitfall 11: The chrome JS startup cache makes chrome-side GUI fixes look broken

**What goes wrong:**
Edits to `powerbrowser/shell/*.js` take effect in the tree immediately, through the objdir symlinks. Gecko's startup cache keeps running the old compiled script with no error. This invalidated the F9 live test (memory `chrome-js-startup-cache`). The phase 21 and 22 worklists (group channel, Panorama close/undo, per-card close) and the phase 24 UAT all exercise chrome-side code. `-purgecaches` has zero occurrences in `scripts/` or `docs/` (`.planning/codebase/CONCERNS.md`); it lives only in CLAUDE-adjacent memory.

**How to avoid:**
After any chrome-JS edit: `rm -rf objdir/tmp/profile-default/startupCache` and `MOZ_PURGE_CACHES=1 ./objdir/dist/bin/powerbrowser -purgecaches`. Add these two lines to the tier-1 section of `docs/BUILD.md` (`:470`) in phase 20, so that UAT testers find them. Never record "the fix did not work" from a run that did not purge. The full rebuild in phase 18 changes the build ID, so the first launch after it is safe. Later edits are not.

Also on the Gecko side: after phase 18 the dev objdir is 153.5 while `objdir-release` stays 153.1 until it is rebuilt. Launching the older binary on a profile the newer one touched triggers Firefox's downgrade protection, and the window waits on a dialog. Rebuild the release objdir in the same phase, or use a throwaway profile for any 153.1 launch.

**Phase to address:** 18 (downgrade), 20 (doc line), 21, 22, 24 (purge discipline)

---

### Pitfall 12: The Theia re-pin runbook's "token gate intact" step does not exercise the gate

**What goes wrong:**
`docs/BUILD.md:249-256` (UPD-04 step 6) proves the gate with `tsc -b theia/extensions/token-gate` plus the telemetry suite. That shows the code compiles. It does not show the gate rejects anything. The gate depends on Theia's backend lifecycle order: `configure()` runs before `start()` binds the socket (`token-gate-backend-contribution.ts:52-59, :76-87`). Theia 1.75/1.76 changed connection-token re-issue (#17762) and many backend classes.

**How to avoid:**
Run the live rows `--only side02-token-negative` and `--only side02-token-positive` (`verify-platform.sh:4723-4724`) and `--only side04-token-not-in-environment` at 1.76. Re-record the UPD-04 proof in `docs/BUILD.md:268-286` with those results, not with the compile alone.

**Phase to address:** 19

---

### Pitfall 13: Node 24's native rebuild in a sandbox or offline shell

**What goes wrong:**
Every native module is N-API (`drivelist` 12.0.2 builds from source with `NAPI_VERSION`; `better-sqlite3` 13.0.3 ships `prebuilds/linux-x64.node`; node-pty, @parcel/watcher and msgpackr-extract ship prebuilds) [verified]. The ABI therefore does not change, and an old `drivelist.node` still loads on 24 (STACK.md). The real risks are environmental:

- `node-gyp rebuild` downloads headers for the exact running Node version into `~/.cache/node-gyp/24.19.0` unless it is given `--nodedir`. A sandboxed or offline session fails there, while CI (with network) passes.
- The `flake.nix` shellHook prepends `${nodejs}/lib/node_modules/npm/bin/node-gyp-bin`. If that path ever moves, the prepend is a silent no-op and `node-gyp` resolves to whatever else is on `PATH`.
- CLAUDE.md hard rule 4 still applies: `pkgs.mkShell` adds an rpath to the space-separated `NIX_LDFLAGS`, so a checkout path containing a space breaks every link. `NIX_NO_SELF_RPATH = "1"` (`flake.nix:27`) keeps the checkout path out of `drivelist.node`. Keep both when editing the shell.
- Until the flake flips, scripts run outside the dev shell use host Node v24.19.0 [verified], while the sidecar runs on Node 22. A plain-node check that passes on the host does not prove the sidecar's runtime.

**How to avoid:**
Inside `nix develop .#theia`, run `(cd theia/node_modules/drivelist && node-gyp rebuild --nodedir="$(dirname "$(dirname "$(command -v node)")")")`, then `node -e "require('./theia/node_modules/drivelist')"`, then `bash scripts/smoke-theia.sh`. Edit only `flake.nix:20`. Never run `nix flake update` (it would move inkscape off 1.4.4 and break `generated-byte-identity`, and move rustc off 1.97.1).

**Phase to address:** 19 (step a)

---

### Pitfall 14: `rebase-upstream.yml` has never run, and it runs without Nix

**What goes wrong:**
`gh run list --workflow rebase-upstream.yml` returns no runs [verified]. Its steps run `node scripts/generate.mjs` directly on the runner, with no `nix develop` and therefore no inkscape. `verify.yml`'s own header records that a job without inkscape "failed at the 16-pixel icon". Dispatching it for 153.5 is likely to fail at the generate step, before any replay [inferred]. Separately, its `default:` tag is a literal mirror of the pin that `verify-upstream-pins.mjs` step 2 checks. Forgetting to move it turns `verify-upstream-pins` red.

**How to avoid:**
Do the 153.5 rebase locally through `scripts/rebase-upstream.sh`, which is the proven path (08-05 drill against 153.2). In the same commit, move the workflow default to the pinned tag. Either wrap the workflow's generate steps in `nix develop .#theia` (the same fix `verify.yml` received) or record that the workflow is unexercised. Do not cite it as a CI rebase proof.

**Phase to address:** 18 (default and record), 25 (if CI green is meant to include it)

---

### Pitfall 15: "generate-check fails locally" may be stale, or caused by the host inkscape

**What goes wrong:**
The handoff lists "find out why `generate-check` fails locally (inkscape)". In this session, `node scripts/generate.mjs --check` from the host shell printed `--check PASS -- all 54 generated file(s) match` with host `/run/current-system/sw/bin/inkscape` 1.4.4 [verified]. The likely mechanism of the earlier failure: outside the dev shell, the generator uses whatever inkscape the NixOS system profile provides. A system update that moves inkscape off 1.4.4 makes the local run fail byte identity while CI, which pins inkscape through the flake, passes. A sandboxed inkscape that cannot write its config dir is a second candidate [inferred].

**How to avoid:**
Reproduce the failure before fixing anything. Run generator checks inside `nix develop .#theia`, which pins inkscape 1.4.4 (`flake.nix:33-41`). If the root cause is the host profile, the fix is documentation plus running the check in the shell. Do not edit the PNGs and do not relax the byte comparison.

**Phase to address:** 20

---

### Pitfall 16: Clean-checkout and `yarn install` runs while another session serves the sidecar

**What goes wrong:**
G-14.1.1-9 (clean-checkout `yarn build:extensions`) was deferred three times because `rm -rf theia/extensions/*/lib` would delete the `lib` trees a concurrent session's running sidecar is served from (14.1.1 `deferred-items.md`). Phases 17 and 19 both need `yarn install`, which has the same effect. `theia build` also rewrites `lib/backend` under a running backend and kills it. The symptom is the shell chrome disappearing (memory `live-gui-debug-loop`), which is easy to misread as a CSS defect.

**How to avoid:**
Before any install or clean build, check `git status --porcelain` for foreign entries, check for a running `theia start`, and check `.worktree-lock` (`worktree-session-guard.py`, 2 h stale window). Commit with explicit paths only (memory `concurrent-sessions-on-main`). Run G-14.1.1-9 in phase 20 only after phase 19's final install, from a quiet tree, or in a separate clone (`scripts/fresh-clone-verify.py`).

**Phase to address:** 17, 19, 20

---

## Minor Pitfalls

### Pitfall 17: Comments and prose that name the old versions

`scripts/lib/firefox-bidi.mjs:5,11`, `scripts/smoke-theia.sh:57`, `scripts/verify-platform.sh:3000, :3440`, `scripts/verify-branding-identity.mjs:31`, `theia/extensions/chrome-bar/src/browser/chrome-bar-commands.ts:142`, `tab-uris/src/browser/view-open-handler.ts:90`, `telemetry/src/browser/telemetry-preferences.ts:3`, `README.md:87`, and the D-16 comment at `flake.nix:14-19`. Only `smoke-firefox.sh:41-42` is functional. The rest are text, but a comment that says "verified against 1.74.1" after a move to 1.76 is a false claim. Update the ones whose claim was re-verified, and mark the others "as of 1.74.1".

### Pitfall 18: Fixture manifests still pin 1.74.1 and a future ESR tag

The tier-3 fixtures under `.planning/milestones/v1.1-phases/09-extensions-crash-pipeline/fixtures/*/configuration.toml` carry `theia_release = "1.74.1"` and `firefox_esr_tag = "FIREFOX_154_0esr_RELEASE"`, and `scripts/verify-downstream-fixture.mjs:585` builds a scratch manifest with `1.74.1`. `verify-upstream-pins.mjs` excludes `.planning/` as history, so nothing goes red. They are historical record; leave them. If a per-fixture tier-3 build (BLD-02) is re-run at 1.76, its manifest pin is not what gets installed. The workspace `package.json` decides.

### Pitfall 19: User-facing copy reaching the screen unreviewed

The redesigned Panorama's "Expand"/"Done" copy is unreviewed (handoff, Q1 in `docs/non-gui/questions-wave-e.md`). At 1.76, Theia's own strings (Getting Started, telemetry setting description) can reach the screen through new transitive extensions. The UI-SPEC rule (no internal identifier in user-facing text, product named "PowerBrowser", a next step that exists on screen) applies to every string the user sees, including upstream strings this tree chooses to expose.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Keep `ng051-backend-off` "because it still passes" after deleting the adapter | No registry edit | A check that cannot go red; violates verification rule 1 | Never. Delete it with the adapter |
| Rename D-22 rebind 2 to `AIConfigurationViewContribution` instead of deleting it | Looks like a port | Overrides nothing (no `initializeLayout` at 1.76 [verified in tarball]), so it is dead code that implies a guarantee | Never |
| Leave `smoke-firefox.sh:41-42` as a literal and edit it to `153.5.0esr` | One-line edit | Red again at every ESR bump; hand-kept expectation | Never. Derive it from `version_display.txt` |
| Re-cite `view-factory-table.ts` line numbers by hand at 1.76 | Matches the existing style | Drifts at every Theia bump; the drift check is lazy and console-only | Acceptable for this milestone if one live `view:` open plus a planted-row control is recorded; otherwise derive the ids from `node_modules` |
| Accept the duplicate `telemetry.telemetryLevel` registration warning | No code change | Settings text depends on module load order | Acceptable only if the live check records which schema won and the text is acceptable; otherwise consume Theia's schema |
| Pin the tag by name only, no SHA recorded | Matches the existing convention | Local and CI can diverge silently if a tag moves (Pitfall 1) | Never for an adoption. Record the SHA |
| Report `mar-update-hop` green after the ESR move | Full run reads green | Certifies a 153.1 hop as current | Only with a written note that the evidence predates 153.5 |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| mozilla-firefox/firefox tags | Assuming `_RELEASE` == `_BUILD1` | Check `git ls-remote` for both; 153.4 differed [verified] |
| Yarn classic peers | Treating an install without errors as compatible | `unmet peer dependency` is a warning; gate React copies explicitly (Pitfall 4) |
| Yarn workspaces | Removing a member without `yarn install` | `.yarn-integrity` keeps the old top-level patterns; CI `--frozen-lockfile` fails on an uncommitted lock |
| Theia extension collection | Assuming only declared `dependencies` compose | Theia collects `theiaExtensions` transitively; `@theia/getting-started` arrives through `@theia/ai-ide@1.76.0` [verified] |
| Theia `isBound ? rebind : bind` idiom (`powerbrowser-frontend-module.ts:24-44`) | Expecting a missing base binding to fail | The `else bind` branch silently binds an orphan if upstream moved the service; compile catches a removed class, not a moved binding |
| node-gyp under Nix | Relying on header download | `--nodedir` from the shell's Node; no network needed |
| GitHub Actions `rebase-upstream.yml` | Treating it as a working CI rebase | Never run; no Nix, so no inkscape (Pitfall 14) |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Two upstream moves before one verify | A red full run needs bisection across two trees | One upstream per phase (ARCHITECTURE.md Pattern 2) | Any time; each Gecko build is 47-54 min |
| One tier-3 build budgeted for "full verify" | Release-variant rows red at the end of the phase | Budget dev plus release builds in phase 18 (Pitfall 2) | Phase 18 |
| `--quick` inside session hooks | Resume fails under VSCode's 60 s spawn limit (hook timeout 120 s) | Decide the `resume` hook change; keep `--quick` hermetic and fast | Every resume after an edit |
| `--extra-root upstream/` scan in the rebase | About 55 s over about 460k files (01-15 and 08-05 measurements) | Expected; not a defect | Each rebase |
| sccache across a large `moz.configure` change | Cold cache after the version bump | Expected first-build cost (D-71) | Phase 18 first build |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Proving the token gate by compile only (Pitfall 12) | A 1.76 lifecycle change opens the backend unauthenticated | Live `side02-token-negative`/`-positive` rows at 1.76 |
| Script-enabled `yarn install` to "fix" a native module | Runs unaudited postinstalls (puppeteer downloads Chromium); `@theia/ffmpeg/build` leftovers fail `diff-theia-core.sh` (STACK.md) | `--ignore-scripts` plus the one explicit `drivelist` rebuild (`docs/BUILD.md:59-98`) |
| New transitive extensions adding egress | Getting Started links (theia-ide.org), new AI provider defaults (1.76 adds model discovery) | Re-run `ng069-sidecar-egress` and `theia-endpoints` at 1.76; any new host goes through the endpoint allowlist, never silently |
| Removing the Theia AI framework along with OpenCode | Changes D-22, the `view:ai-configuration` row and tab-uris hooks without a decision | Separate question for Chris (ARCHITECTURE.md Anti-Pattern 3) |
| Editing under `theia/node_modules/@theia` to silence a 1.76 break | Hard rule 1 violation; `diff-theia-core.sh` red | DI rebind or default preference in `@powerbrowser/*` |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Theia Welcome opens alongside the PowerBrowser welcome at 1.76 | Two welcome tabs, links to theia-ide.org | `workbench.startupEditor: "none"` default; check on a fresh profile |
| Telemetry setting description becomes Theia's text | Settings copy no longer matches the PowerBrowser contract | Record which schema wins at the live check |
| Testing first-boot only on a reused config dir | Regressions ship that only new users see | Fresh `THEIA_CONFIG_DIR` run in phases 19 and 24 |
| Chrome-side fix "not working" in UAT | A real fix is reported failed | Purge the startup cache before every chrome-side UAT step |

## "Looks Done But Isn't" Checklist

- [ ] **ESR pin moved:** `configuration.toml:114`, `generated/upstream-pins.env` regenerated, `rebase-upstream.yml` default, `smoke-firefox.sh` derived, `fetch-upstream.sh` comment, and SHA recorded in `docs/BUILD.md`. Verify with `node scripts/verify-upstream-pins.mjs` and `git -C upstream rev-parse HEAD`.
- [ ] **Full verify at 153.5:** both `objdir/` and `objdir-release/` read `Version=153.5.0` in `dist/bin/application.ini`. `mar-update-hop` is labelled as pre-153.5 evidence.
- [ ] **Patches untouched:** `git diff --stat patches/` is empty; `apply-patches.sh --self-test` and `about-dialog-suppression` pass after the replay.
- [ ] **React 19:** exactly one installed copy each of react, react-dom, @types/react, @types/react-dom and inversify; no `unmet peer` lines in the install log.
- [ ] **Theia 1.76 live:** fresh-profile run shows one PowerBrowser welcome, no Theia Welcome, no AI Configuration tab; a `view:` URI opens; the factory-table console line is absent and was shown to fire when planted.
- [ ] **Token gate at 1.76:** `side02-token-negative` and `side02-token-positive` run live, not just compiled.
- [ ] **OpenCode gone locally:** no `theia/extensions/backend-opencode/` directory, no `node_modules/@powerbrowser/backend-opencode` symlink, no `generated/ai-backend.json`; `generate-check` reports 53 files; `yarn install --frozen-lockfile` passes on the committed lock.
- [ ] **Brand scan:** run after `git add`; the `-PLAN.md` row count is reconciled in the same commit.
- [ ] **Baseline:** `docs/non-gui/quick-baseline.txt` matches the actual `--quick` reds after phases 17 and 19.
- [ ] **Chrome-side GUI fixes:** each live result names a `-purgecaches` launch.
- [ ] **CI:** the latest `Verify static layers` run on `main` is green, read with `gh run list` (not inferred from local `--quick`).

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Wrong ESR commit pinned (1) | MEDIUM | Move the pin, `rebase-upstream.sh --tag <right tag>`, rebuild both objdirs (about 2 h) |
| Hand-edited patch (3) | LOW | `git checkout -- patches/`, `rebase-upstream.sh` again; if a change is needed, edit `upstream/` and regenerate |
| React mismatch or duplicate (4) | LOW | Move the four pins, add resolutions, `yarn install --ignore-scripts`, rebuild, re-run the live check |
| Bundled Node/React/Theia change (5) | MEDIUM | Revert to the last green commit and re-apply as three commits |
| Theia Welcome or telemetry text regression (6) | LOW | Default preference or a guarded rebind in `@powerbrowser/branding`; never a core edit |
| Local-only reds after OpenCode removal (7) | LOW | `rm -rf` the leftover directory and symlink, delete `generated/ai-backend.json`, `yarn install` |
| Vacuous absence check shipped (8) | LOW | Add a planted-fault self-test row; the next run tells whether the check was ever real |
| Brand-scan count drift (10) | LOW | Bump `expected_count` with a COUNT MOVED reason line in the same commit |
| Stale chrome JS in a UAT result (11) | LOW | Purge the cache, re-run the step, and correct the UAT record |
| Concurrent session's sidecar killed by an install (16) | LOW | Restart that sidecar; next time coordinate through `git status` and `.worktree-lock` first |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1 Tag and commit identity | 18 | `git ls-remote` record plus `git -C upstream rev-parse HEAD` equal to the recorded SHA |
| 2 Multi-build full verify, stale MAR evidence | 18 | Both `application.ini` files at 153.5; full `verify-platform.sh` log; MAR note in the verification |
| 3 Patch hand-edits | 18 | Empty `git diff patches/`; `apply-patches.sh --self-test` |
| 4 React mismatch or duplicates | 19 | New single-copy `--quick` row and its self-test |
| 5 One-step multi-upgrade | 19 | Three commits, each with a `--quick` log and a live start |
| 6 First-boot and runtime regressions | 19, 24 | Fresh-profile live check record; UAT sheet lines |
| 7 Local versus CI removal leftovers | 17 | `theia-build-order`, `generate-check`, frozen-lockfile install all green locally |
| 8 Vacuous absence assertions | 17, 19, 21, 24 | Each absence check has a planted control row |
| 9 Red gate and hooks | 17, 19, 21 | Baseline refreshed; NG-051 approved by Chris; plans under the size gate |
| 10 Brand scan | 17 and every phase | Scan run after `git add`; row counts reconciled |
| 11 Startup cache and profile downgrade | 18, 20, 21-24 | `docs/BUILD.md` tier-1 line; UAT entries name the purge |
| 12 Token gate proof | 19 | Live `side02-*` rows in the UPD-04 record |
| 13 Node 24 native rebuild | 19 | `drivelist` rebuild with `--nodedir`; `smoke-theia.sh` on 24 |
| 14 Rebase workflow | 18, 25 | Workflow default equals the pin; workflow either wrapped in Nix or recorded as unexercised |
| 15 generate-check locally | 20 | Reproduced failure or a recorded "no longer reproduces" with the inkscape path |
| 16 Concurrent sessions | 17, 19, 20 | Quiet-tree evidence in the plan summary |

## Sources

- In-tree, read 2026-10-16 (HIGH): `CLAUDE.md`; `.planning/PROJECT.md`; `.planning/HANDOFF-plan-reorg.md`; `flake.nix`; `configuration.toml:113-127`; `theia/package.json`; `theia/applications/browser/package.json`; `theia/extensions/*` (branding, tab-uris, token-gate, chrome-bar, modes); `scripts/fetch-upstream.sh`, `rebase-upstream.sh`, `apply-patches.sh`, `check-patch-surface.sh`, `diff-theia-core.sh`, `verify-upstream-pins.mjs`, `verify-branding-identity.mjs`, `verify-installer-build-proof.mjs`, `verify-mar-update-hop.mjs`, `verify-theia-build-order.mjs`, `verify-ng-051-backend-off.mjs`, `verify-platform.sh`, `size-gate.py`, `check-ledger.py`; `.claude/settings.json` and `.claude/hooks/*.py`; `.github/workflows/verify.yml`, `rebase-upstream.yml`; `docs/BUILD.md` (Theia half, UPD-04 record, rebase procedure, toolchain baseline); `docs/non-gui/decisions.md` R33; `inventory/brand-tokens.json`; `.planning/codebase/CONCERNS.md`.
- Past evidence (HIGH): `.planning/milestones/v1.0-phases/01-*/deferred-items.md` rows 4, 9-11; `.planning/milestones/v1.3-phases/14.1.1-gui-conformance-sweep/deferred-items.md`; `.planning/milestones/v1.3-phases/16-ai-backend-adapter-opencode/deferred-items.md`; 08-05 UPD-03 live drill and 09-04 UPD-04 proof records in `docs/BUILD.md`.
- Live checks in this session (HIGH): `git ls-remote` of FIREFOX_153 ESR tags; GitHub contents API blob SHAs for the 5 patched files plus `aboutDialog.xhtml` and `milestone.txt` at 153.1 and 153.5; `npm view` of `@theia/core@1.74.1/1.76.0` peers, `@theia/ai-ide@1.76.0` deps, `@theia/getting-started@1.76.0` `theiaExtensions`; `npm pack @theia/ai-ide@1.76.0` (no `initializeLayout`, `AIConfigurationViewContribution`); Theia `CHANGELOG.md` 1.75.0/1.76.0 breaking changes; `gh run view 36495714210 --log-failed`; `gh run list --workflow rebase-upstream.yml` (empty); `node scripts/generate.mjs --check` (PASS, 54 files); installed copy counts of react/inversify in `theia/node_modules`.
- Memory (MEDIUM, project-recorded experience): `chrome-js-startup-cache`, `live-gui-debug-loop`, `concurrent-sessions-on-main`, `one-fix-at-a-time-confirmed`.
- Sibling v1.4 research (cross-referenced, not re-derived): `.planning/research/STACK.md`, `.planning/research/ARCHITECTURE.md`, `.planning/research/FEATURES.md`.

---
*Pitfalls research for: PowerBrowser v1.4 Platform Updates and GUI Close-out*
*Researched: 2026-10-16*
