---
phase: 19-node-24-react-19-theia-1-76-0
reviewed: 2026-10-17T00:00:00Z
depth: standard
files_reviewed: 26
files_reviewed_list:
  - scripts/verify-first-boot-surface.mjs
  - scripts/verify-single-copy-deps.mjs
  - scripts/verify-ng-086-theia-react-node.mjs
  - scripts/verify-mode-switch-tabs-live.mjs
  - scripts/verify-platform.sh
  - scripts/smoke-theia.sh
  - scripts/lib/firefox-bidi.mjs
  - flake.nix
  - configuration.toml
  - theia/package.json
  - theia/applications/browser/package.json
  - theia/extensions/branding/package.json
  - theia/extensions/chrome-bar/package.json
  - theia/extensions/customize/package.json
  - theia/extensions/modes/package.json
  - theia/extensions/tab-uris/package.json
  - theia/extensions/telemetry/package.json
  - theia/extensions/token-gate/package.json
  - theia/extensions/branding/src/browser/powerbrowser-frontend-module.ts
  - theia/extensions/branding/src/browser/powerbrowser-ai-layout-contribution.ts
  - theia/extensions/telemetry/src/browser/telemetry-preferences.ts
  - powerbrowser/shell/TheiaService.sys.mjs
  - docs/BUILD.md
  - README.md
  - docs/non-gui/decisions.md
  - powerbrowser/packaging/node-runtime.json
findings:
  critical: 1
  warning: 6
  info: 8
  total: 15
status: issues_found
---

# Phase 19: Code Review Report

**Reviewed:** 2026-10-17
**Depth:** standard
**Files Reviewed:** 26
**Status:** issues_found

## Narrative Findings (AI reviewer)

## Summary

Scope: the source files listed in the 19-01..19-07 SUMMARYs, plus the phase diff `446b395..c60103b`. `theia/yarn.lock`, `ledger/` and `.planning/` are excluded. `powerbrowser/packaging/node-runtime.json` was not changed in this phase. It is reviewed because 19-07 records it as the open gap and CR-01 depends on it.

Static runs at review time: `verify-ng-086-theia-react-node.mjs` PASS, plus its `--self-test` (6 cases). `verify-single-copy-deps.mjs` PASS, plus its `--self-test` (5 cases). `verify-first-boot-surface.mjs --self-test` PASS (13 plants). No live check was run.

Checks against the code:
- **Telemetry registration order.** Confirmed against `@theia/core` 1.76.0 `preference-schema-service.js:78-89`. `init()` calls every contribution's `schema`/`initSchema` synchronously inside one `forEach`, so a one-microtask delay does run after all of them.
- **Native modules under a Node 22 package.** better-sqlite3, drivelist and node-pty export only `napi_register_module_v1`, so they are ABI-stable. A packaged Node 22 does not fail on a module ABI mismatch. CR-01 rests on the engines contract instead.

Main concerns:
- The shipped package still stages Node 22, which is below the declared engines.
- The telemetry Settings text understates which components the setting now controls.
- Several assertions in the new checks have no planted fault in their self-tests. Some of these are in the hash-locked NG-086 file.

## Critical Issues

### CR-01: The packaged Node runtime is still Node 22, below the declared `engines.node >=24`

**File:** `powerbrowser/packaging/node-runtime.json:3-5` (consumed at `powerbrowser/packaging/package-linux.sh:27`)
**Issue:** The workspace now declares `engines.node: ">=24"` (`theia/package.json`), following upstream Theia's own move in 1.75.0 (#17936, per 19-RESEARCH.md:409). The dev shell is on `nodejs_24`. But `package-linux.sh` still downloads and stages `v22.23.2`. `TheiaService.sys.mjs:488-492` prefers that staged binary, so every packaged build runs the Theia 1.76.0 backend on a Node major that neither upstream nor this workspace supports. Nothing in the gate catches this: NG-086 reads only `flake.nix` (see WR-05). The native modules are N-API, so the failure will not show up as an ABI error at load time. It will show up as whatever Node 24 API the 1.76 backend reaches first.
This is recorded in 19-07-SUMMARY.md as the open gap for `/gsd-plan-phase 19 --gaps`, and Chris accepted doing the move now. It is still a ship blocker until it lands.
**Fix (needs Chris; not auto-fixable):** Chris picks a 24.x release and verifies its SHASUMS256.txt. Then update the pin:
```json
{
  "linux-x64": {
    "version": "v24.<x>.<y>",
    "url": "https://nodejs.org/dist/v24.<x>.<y>/node-v24.<x>.<y>-linux-x64.tar.xz",
    "sha256": "<verified by Chris>"
  }
}
```
Then re-run `verify-ng-063-packaged-launch.mjs`.

## Warnings

### WR-01: The telemetry Settings text says PowerBrowser alone is affected, but the same key now gates upstream and extension telemetry

**File:** `theia/extensions/telemetry/src/browser/telemetry-preferences.ts:37-44`
**Issue:** At 1.76.0, `telemetry.telemetryLevel` is also read by `@theia/telemetry`'s `PreferenceTelemetryConsentProvider` (`telemetry-consent-provider.js:22-30`). That provider is what `@theia/plugin-ext` hands to every plugin host (`hosted-plugin.js:256`, then `plugin-manager.js:411` `telemetryExt.setLevel`). A user who picks `all` or `error` also enables `vscode.env.isTelemetryEnabled` for every installed VS Code extension, and those extensions send to their own endpoints. The shown text says "How much usage and error telemetry PowerBrowser sends to the configured endpoint", and the `off` text says "No telemetry event leaves the application". Both understate the scope. There is a second problem: the `crash` and `error` enumDescriptions are word-for-word identical (lines 39-40). For plugins the two values mean different things: crash reports only, versus errors plus crashes.
Chris acknowledged the registration decision (19-07). This finding is about the accuracy of the user-facing text, which is a separate question.
**Fix:** Reword so the text names every recipient and separates `crash` from `error`. Keep the "PowerBrowser" naming and no internal identifiers, per the copy rule. For example:
```ts
enumDescriptions: [
    'Send nothing. Neither PowerBrowser nor installed extensions send telemetry.',
    'Send crash reports only. Installed extensions may send their own crash reports.',
    'Send error telemetry (uncaught errors). Installed extensions may send their own error reports.',
    'Send usage and error telemetry. Installed extensions may send their own usage data.',
],
description: 'How much telemetry PowerBrowser and your installed extensions may send.',
```
`verify-first-boot-surface.mjs` derives the expected text from this file, so its check follows the change. Update 01-UI-SPEC.md to match.

### WR-02: The first-boot-surface self-test has no plant for four of its assertions

**File:** `scripts/verify-first-boot-surface.mjs:172-174, 189-201, 167-171, 476-490`
**Issue:** CLAUDE.md requires every assertion to have a planted fault that goes red naming the drift. These four have none:
- **Perspective** (`judge` lines 172-174): a `judge` that dropped this comparison would still pass all 13 plants.
- **Schema `enumDescriptions`** (lines 199-201).
- **Schema description drift while the DOM text is correct** (lines 193-195): the only description plant changes both values together.
- **Fresh-mode seed missing from the main area:** only the surplus direction is planted.

**Fix:** Append plants to the table:
```js
['wrong perspective', expected, o => { o.perspective = 'planted-perspective'; }, /planted-perspective.*launch mode/],
['enumDescriptions drift', expected, o => { o.settings.schema.enumDescriptions = ['planted-enum']; }, /planted-enum/],
['schema description only', expected, o => { o.settings.schema.description = 'planted-schema-desc'; }, /schema description .*planted-schema-desc/],
['seed missing', expected, o => { o.areas.main = []; }, /missing \[/],
```

### WR-03: single-copy-deps hard-codes the workspace groups instead of reading them from the tree

**File:** `scripts/verify-single-copy-deps.mjs:79`
**Issue:** `for (const group of ['applications', 'extensions'])` copies the current `theia/package.json` `workspaces` value (`["applications/*", "extensions/*"]`). If a workspace glob is added, for example `packages/*`, that member's `node_modules` is never walked. A second React or inversify copy there passes green. This is the "derive, do not hand-keep" rule in CLAUDE.md.
**Fix:** Derive the start directories from the `workspaces` field, and fail if it holds a pattern the check cannot expand:
```js
const ws = JSON.parse(readFileSync(join(theia, 'package.json'), 'utf8')).workspaces ?? [];
for (const pat of (Array.isArray(ws) ? ws : ws.packages ?? [])) {
  const m = /^([^*]+)\/\*$/.exec(pat);
  if (!m) return { ok: false, lines: [`${NAME}: FAIL -- workspace pattern '${pat}' is not <dir>/*; the walk cannot expand it`] };
  const g = join(theia, m[1]);
  if (isRealDir(g)) for (const member of readdirSync(g)) { const nm = join(g, member, 'node_modules'); if (isRealDir(nm)) starts.push(nm); }
}
```
Add a self-test case that plants a duplicate under a third workspace group.

### WR-04: NG-086 self-test has no plant for six of its FAIL branches (locked: fix requires Chris's re-lock)

**File:** `scripts/verify-ng-086-theia-react-node.mjs:100, 107, 117-124, 143-144, 154-156, 174-175, 229-256`
**Issue:** The header says "A missing package is a FAIL", that zero or several `@theia/core` copies is a FAIL, and that zero or several `nodejs = pkgs.nodejs_NN;` lines is a FAIL. None of these branches is planted. Neither is the unset `theia_release`, the absent semver, or the member-`node_modules` start dirs (`applications/*`, `extensions/*`). The six cases cover only clean, version drift, monaco, React peer miss, Node engines miss and empty walk. A regression in any unplanted branch keeps the self-test green.
**Fix (locked: fix requires Chris's re-lock; not auto-fixable):** Add cases to `selfTest()`:
- `stubTree()` with `@types/react-dom` removed: expect `@types/react-dom is not installed`.
- A second `@theia/core` under `theia/extensions/x/node_modules/@theia/core`: expect `exactly one installed @theia/core`. This also exercises the member start dir.
- A flake with two `nodejs = pkgs.nodejs_NN;` lines: expect `found 2`.
- A `configuration.toml` with no `theia_release`: expect `is not set`.

### WR-05: NG-086's Node check reads only flake.nix, misses the packaged runtime, and hard-codes the workspace groups (locked: fix requires Chris's re-lock)

**File:** `scripts/verify-ng-086-theia-react-node.mjs:167-184, 117`
**Issue:** UPD-07..09 say Node 24 is the runtime. The check derives the Node major only from `flake.nix`, so `powerbrowser/packaging/node-runtime.json` (v22.23.2) passes green. That is how CR-01 got through the gate.
Two smaller problems:
- `semver.intersects(engines, '24.x')` (line 180) only shows that some 24.x version satisfies `engines`. A future `engines` of `>=24.20` would pass against a 24.19 flake.
- Line 117 hard-codes the same workspace groups as WR-03.

**Fix (locked: fix requires Chris's re-lock; not auto-fixable):** Also read `powerbrowser/packaging/node-runtime.json` and require `semver.satisfies(version, engines)` for every platform entry. Read the start directories from the `workspaces` field, as in WR-03. Add a self-test plant for each.

### WR-06: Raising the Node requirement adds no version gate, so an old Node gets the generic start-failure message

**File:** `powerbrowser/shell/TheiaService.sys.mjs:488-492` (copy at :43)
**Issue:** The `nodeMissing` text now says "Install Node.js 24 or later". But the resolver accepts any `node` it finds: the staged binary, the pref, or `PATH`. It never checks the version. A user with Node 22 on `PATH`, or any packaged build until CR-01 lands, never sees the instruction that would help. The backend runs on Node 22 and either works by chance or fails as `couldNotStart` ("couldn't start its interface"), which does not mention Node at all.
**Fix:** After resolving `_nodePath`, read the major version. Prefer `node-runtime.json`'s version for the staged binary. For other paths, a `node -p process.versions.node` probe through the existing subprocess touchpoint in PowerBrowserAPI. Return a dedicated message when the major is below the engines major. Its copy must end with a real next step, and it must add Details rows for the resolved path and the version that was found. Catalogue any new touchpoint in INTERNAL-APIS.md.

## Info

### IN-01: first-boot-surface-carried passes green when the fixture env var is unset

**File:** `scripts/verify-first-boot-surface.mjs:416-419`
**Issue:** When `PB_FIRST_BOOT_FIXTURE` is unset, the row exits 0 with only a notice. This follows decisions.md R7. But a `--gate` run then reports the carried-over assertion as PASS with nothing observed.
**Fix:** Print the skip in the driver's PASS summary, or add a `--gate` mode that requires the env var.

### IN-02: derive() takes the first `description:` and `default:` in the telemetry file

**File:** `scripts/verify-first-boot-surface.mjs:127-131`
**Issue:** The regexes are not anchored to the `TELEMETRY_LEVEL_PREFERENCE` property. A second property, or a comment containing `default: '...'` placed earlier in the file, would silently change the expected value. The live run would still go red on the mismatch, but it would name the wrong source.
**Fix:** First slice the source from `[TELEMETRY_LEVEL_PREFERENCE]: {` to its closing `},`, then match inside that slice.

### IN-03: upstreamPerspectiveIds counts too much and can stop its walk silently

**File:** `scripts/verify-mode-switch-tabs-live.mjs:226-258`
**Issue:**
- Every `*_PERSPECTIVE_ID = '...'` constant counts as accounted for: in any lib file (node/ and common/ included), of any installed registering package, whether or not that package is composed.
- The single `try` around `walk(rel)` hides an error partway through and returns a truncated list.

The surplus side is the only one widened, and the unchained assertion still covers every live descriptor, so the impact is small.
**Fix:** Limit the constants to `lib/browser/`. Move the `try` to a per-directory read that records a broken-instrument failure.

### IN-04: Stale 1.74.1 references in comments of live sources

**File:** `scripts/verify-first-boot-surface.mjs:14`, `scripts/verify-platform.sh:3413`, `theia/extensions/chrome-bar/src/browser/chrome-bar-commands.ts:142`, `theia/extensions/tab-uris/src/browser/view-open-handler.ts:90`, `scripts/generate.mjs:514`
**Issue:** These comments cite "pinned v1.74.1" behaviour or line numbers. The builtin theme list behind generate.mjs:514 is unchanged at 1.76.0 (verified: dark, light, hc-theia, hc-theia-light). The cited upstream line numbers have not been re-verified at 1.76.0.
**Fix:** Re-verify each cite at 1.76.0 and update the version, or drop the line number.

### IN-05: @powerbrowser/branding keeps a dependency it no longer imports

**File:** `theia/extensions/branding/package.json:7`
**Issue:** `"@theia/ai-ide": "1.76.0"` stays even though the branding sources no longer import it (RM-02). The app manifest composes ai-ide directly, so this edge is redundant. It also makes ai-ide look like a branding requirement.
**Fix:** Remove the dependency, then re-run `verify-upstream-pins`.

### IN-06: The carried-mode error message names the wrong content

**File:** `scripts/verify-first-boot-surface.mjs:429`
**Issue:** The message says the fixture "is not a list of widget ids", but the fixture holds `MAIN_ADDRESSES` tab addresses.
**Fix:** Change it to "is not a list of tab addresses".

### IN-07: `--capture` crashes if the target path is an existing file

**File:** `scripts/verify-first-boot-surface.mjs:356`
**Issue:** `readdirSync(dir)` throws on an existing file, and the error escapes as a stack trace instead of a labelled FAIL.
**Fix:** Guard with `statSync(dir).isDirectory()` and call `fail(label, ...)`.

### IN-08: Race between preload registration and Theia document load

**File:** `scripts/verify-first-boot-surface.mjs:228-234`
**Issue:** `script.addPreloadScript` is sent after `withFirefoxPage` has launched the shell. If the Theia document loads first, the counter is missing and the row goes red. It fails closed, so the result is a flaky red, not a false green.
**Fix:** Register the preload before launch, if firefox-bidi exposes a pre-navigation hook. Otherwise, reload the Theia frame once after registering it.

---

_Reviewed: 2026-10-17_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
