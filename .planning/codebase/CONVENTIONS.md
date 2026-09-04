# Coding Conventions

**Analysis Date:** 2026-09-04

## Naming Patterns

**Files:**
- Verification scripts use `verify-<subject>.mjs` for Node checks (`scripts/verify-shell-error-copy.mjs`, `scripts/verify-registry-shape.mjs`, `scripts/verify-generated-identity.mjs`) and `check-<subject>.sh` for bash guards (`scripts/check-internals-boundary.sh`, `scripts/check-patch-surface.sh`).
- Smoke/build scripts use `smoke-<side>.sh` (`scripts/smoke-theia.sh`, `scripts/smoke-firefox.sh`) and lifecycle scripts use verb names (`scripts/fetch-upstream.sh`, `scripts/apply-patches.sh`, `scripts/rebase-upstream.sh`, `scripts/generate.mjs`, `scripts/rename-brand.mjs`).
- Gecko privileged modules use PascalCase with the `.sys.mjs` suffix: `powerbrowser/shell/PowerBrowserAPI.sys.mjs`, `powerbrowser/shell/TheiaService.sys.mjs`. Lowercase-chrome files keep their upstream shape (`powerbrowser/shell/powerbrowser.js`, `powerbrowser/shell/powerbrowser.xhtml`, `powerbrowser/shell/powerbrowser.css`, `powerbrowser/shell/jar.mn`).
- Theia extension sources use kebab-case: `theia/extensions/tab-uris/src/browser/browser-window-command.ts`, `theia/extensions/tab-uris/src/browser/tab-uri-registry.ts`, `theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts`, `theia/extensions/branding/src/browser/powerbrowser-welcome-widget.tsx`.
- Registry check labels are kebab-case (`shell-error-copy-no-internals`, `gui04-registry-shape`, `generated-byte-identity`, `side04-sigkill-no-orphan`).

**Functions:**
- Bash check functions use `check_<label with underscores>` (`check_side04_sigkill_no_orphan`, `check_shell03_budget_exhausted_error`, `check_gui01_single_shell_window` in `scripts/verify-platform.sh`).
- Shell supervisor methods use `_camelCase` for private state and helpers (`_resolveSidecar`, `_spawnAndGate`, `_showError`, `_hideError`, `_pushLog`, `_reapLeftover`, `_profileStateKey` in `powerbrowser/shell/TheiaService.sys.mjs`).
- Scanner functions in `.mjs` checks use descriptive verbs (`scan_inline_attrs`, `scan_internals_boundary`, `exportedNamesOf`, `localeAgreementFailures`, `derived_user_messages`).
- Theia classes and contributions use PascalCase (`TabUriRegistry`, `BrowserWindowCommandContribution`, `ViewUriOpenHandler`, `PowerBrowserTerminalWidget`).

**Variables:**
- Module-private shell state uses `_camelCase` fields (`_token`, `_port`, `_pid`, `_proc`, `_swapped`, `_errorShown`, `_errorRecoverable`, `_failureDetails`, `_restartInFlight` in `powerbrowser/shell/TheiaService.sys.mjs`).
- Discretionary tuning constants are `SCREAMING_SNAKE_CASE` with a comment recording why no pref exists (`RESTART_BACKOFF_INITIAL_MS`, `RESTART_BACKOFF_CAP_MS`, `CONSECUTIVE_FAILURES_THRESHOLD` in `powerbrowser/shell/TheiaService.sys.mjs`).
- Exported command IDs pair a `SCREAMING_SNAKE` id constant with a `SCREAMING_SNAKE` Command object (`OPEN_BROWSER_WINDOW_COMMAND_ID`, `OPEN_BROWSER_WINDOW` in `theia/extensions/tab-uris/src/browser/browser-window-command.ts`).
- Prefs live under one branch: `powerbrowser.sidecar.*` (`powerbrowser.sidecar.backendMain`, `powerbrowser.sidecar.giveUpAttempts`, `powerbrowser.sidecar.healthIntervalSteadyMs`).
- Log/run sentinels are `POWERBROWSER_*` (`POWERBROWSER_BACKEND_READY`, `POWERBROWSER_SHELL_ERROR`, `POWERBROWSER_SHELL_SWAP`, `POWERBROWSER_ERROR_DIAGNOSTICS`, `POWERBROWSER_APP_IDENTITY`, `POWERBROWSER_DECK_STATE`).
- Shell DOM ids are `#powerbrowser-*` (`#powerbrowser-error-message`, `#powerbrowser-error-retry`, `#powerbrowser-error-diagnostics`, `#powerbrowser-diagnostics-close` in `powerbrowser/shell/powerbrowser.xhtml`).
- Test-harness overrides are `VERIFY05_*` (`VERIFY05_USER_JS_PROFILE`, `VERIFY05_XDG_CONFIG_HOME`, `VERIFY05_LEAK_CANARY` in `scripts/verify-platform.sh`).

**Types:**
- Theia-side types are PascalCase interfaces/aliases (`ViewFactoryTableRow` in `theia/extensions/tab-uris/src/browser/view-factory-table.ts`).
- Frozen contract tables use `EXPECTED*` / `TARGETS` names and `Object.freeze` (`EXPECTED`, `EXPECTED_MEMBERS` in `scripts/verify-registry-shape.mjs`; `TARGETS` in `scripts/generate.mjs`).

## Code Style

**Formatting:**
- No formatter is configured. Verified absent at repo root: no `.eslintrc*`, `eslint.config.*`, `.prettierrc*`, `prettier.config.*`, or `biome.json*`. Style is enforced by executable checks, not by a formatter.
- Bash files start with `#!/usr/bin/env bash` and Node checks with `#!/usr/bin/env node`.
- Indentation follows the surrounding file: 2-space in `.mjs`/`.ts`/`.tsx`, 2-space in shell `.sh` helpers. Match the file you are editing.

**Linting:**
- No lint tool is configured (see above). The equivalents are the `--quick` gates: `scripts/scan-brand-residue.mjs`, `scripts/check-internals-boundary.sh`, `scripts/verify-shell-error-copy.mjs`, `scripts/verify-registry-shape.mjs`.
- TypeScript strictness comes from per-extension `tsconfig.json` (example `theia/extensions/tab-uris/tsconfig.json`): `noImplicitAny: true`, `noImplicitThis: true`, `strictNullChecks: true`, `target: ES2017`, `module: commonjs`, `experimentalDecorators: true`, `emitDecoratorMetadata: true`, `skipLibCheck: true`, `noEmitOnError: false`.
- Shell CSS/JS must respect the `default-src chrome:` CSP documented in the header of `powerbrowser/shell/powerbrowser.css`: no inline `<style>`, no `style="..."` attributes, no `setAttribute("style"|"on...")`. Use external `chrome:` stylesheets and CSSOM writes (`el.style.display = ...`). `shell-csp-inline-attrs` in `scripts/verify-platform.sh` enforces this.

**Shell error handling discipline (`set` flags):**
- Standalone scripts use `set -euo pipefail` (`scripts/check-internals-boundary.sh`, `scripts/smoke-theia.sh`).
- `scripts/verify-platform.sh` deliberately uses `set -uo pipefail` with NO `-e`, stated in its header: every check runs even if an earlier one failed, because the value of a run is the whole summary table, not the first red row.

## Import Organization

**Order:**
1. Theia TS files import `@theia/*` framework modules first, then relative siblings (see `theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts` and `theia/extensions/tab-uris/src/browser/tab-uri-registry.ts`).
2. Node `.mjs` checks import `node:*` builtins first, then compute `REPO_ROOT` from `import.meta.url` (`scripts/verify-shell-error-copy.mjs`, `scripts/verify-registry-shape.mjs`).
3. Chrome `.sys.mjs` modules reach Firefox internals only through a `ChromeUtils.defineESModuleGetters(lazy, {...})` block at the top (see `powerbrowser/shell/PowerBrowserAPI.sys.mjs`).

**Path Aliases:**
- The `@powerbrowser/*` npm scope is the only alias (`@powerbrowser/tab-uris`, `@powerbrowser/branding`, `@powerbrowser/customize`, `@powerbrowser/token-gate` in `theia/extensions/*/package.json`). Never import `@theia/*` internals by relative path into `node_modules`; consume them as pinned `1.74.1` dependencies declared in `theia/package.json` `resolutions`.
- `scripts/lib/toml.cjs` is CommonJS because it is vendored upstream code with a provenance header; everything else under `scripts/` is ESM (`.mjs`). Do not convert the vendored file.

## Error Handling

**Patterns:**
- `PowerBrowserAPI` methods never throw on reads: `getStringPref`/`getIntPref` catch and return the fallback, `getProfileDir` resolves `""` on failure (`powerbrowser/shell/PowerBrowserAPI.sys.mjs`). Follow this never-throw convention for any new pref/dir reader.
- The supervisor classifies failures as `{ ok, message, details, recoverable }` result shapes and routes them to `_showError(message, recoverable, details)`; the `_errorShown` latch paints once and `_errorRecoverable` records the painted classification so `retry()` can refuse the unrecoverable class (`powerbrowser/shell/TheiaService.sys.mjs`).
- The only terminal handler is `TheiaService.reportUnexpectedFailure`, attached at every fire-and-forget entry point (bootstrap start call, Retry control, health and recovery loops). Do not add ad-hoc `.catch()` copy at call sites; route through it.
- Error sentinels carry exactly `{reason, recoverable}` JSON: `POWERBROWSER_SHELL_ERROR {"reason":"...","recoverable":true|false}`. Never add keys (token, port, stack) to the sentinel; put identifiers in diagnostics rows.
- Script failures print `<check>: FAIL -- <what> [-- <scope>] -- <detail>` to stderr and exit 1; exit 2 is reserved for "nothing was scanned" (unscannable subject), which is distinct from clean. A clean scan of an empty file set is a FAIL, never a pass (see `scan_internals_boundary` in `scripts/check-internals-boundary.sh`).
- Generator/verify `.mjs` failures end with a `Next step: ...` line naming a real command (`run: node scripts/generate.mjs`) or stating the manifest is not the cause (`scripts/generate.mjs`, `scripts/verify-branding-agreement.mjs`, `scripts/verify-vendored-parser.mjs`). Every new failure message must carry one.
- Pure functions that checks and self-tests both drive RETURN failures arrays instead of exiting (`localeAgreementFailures` in `scripts/generate.mjs`). Keep that shape so `--self-test` can drive the same function.

## Logging

**Framework:** `PowerBrowserAPI.log(level, message)` in chrome; `console.*` with a scope prefix in Theia extensions; `dump()` for machine-readable sentinels in `powerbrowser/shell/powerbrowser.js`.

**Patterns:**
- Mirror prefix: `PowerBrowserAPI.log()` duplicates each line to stdout as `[PowerBrowserAPI] <level>: <message>`, and every log-scraping helper tolerates that prefix (`first_byte_offset`, `sentinel_present` in `scripts/verify-platform.sh`). New scrapers must strip it the same way.
- Token redaction: `TheiaService._pushLog` scrubs the per-launch token to `[redacted]` before buffering, and is a no-op (never throws, never splices) on null/empty tokens (`powerbrowser/shell/TheiaService.sys.mjs`, guarded by `shell04-log-redacts-token`).
- Extension logging uses a bracketed scope prefix: `` `[@powerbrowser/tab-uris] ...` `` via `console.error` (see `theia/extensions/tab-uris/src/browser/tab-uri-registry.ts`). Use the extension's own scope tag, not a bare message.
- Chrome sentinels are written with `dump(...)` plus trailing `\n`, never `console.log` (see `powerbrowser/shell/powerbrowser.js`).

## Comments

**When to Comment:**
- Every check and every non-obvious invariant carries a header comment citing the decision/plan id (`D-96/D-97`, `D-113`, `CR-01`, `01-13`, `T-02-02`, `SIDE-04`, `MIG-04`) and the file that owns the reasoning. A new check without its provenance comment is incomplete.
- Record WHY a surprising shape exists (CSP rationale in `powerbrowser/shell/powerbrowser.css:1-28`, anti-corruption rationale in `powerbrowser/shell/PowerBrowserAPI.sys.mjs:5-12`, lazy-index rationale in `theia/extensions/tab-uris/src/browser/tab-uri-registry.ts:45-50`). Do not narrate what the code already says.
- Self-referential traps are documented where they bite: the residual-brand scan header warns an unstaged new file is invisible to `git ls-files` (`scripts/verify-platform.sh:20-25`); comment-stripping helpers warn about `http://` inside strings (`scripts/verify-shell-error-copy.mjs:84-96`).

**JSDoc/TSDoc:**
- Public shell APIs carry JSDoc stating the never-throw contract (`getStringPref`, `getIntPref`, `pathExists`, `getProfileDir` in `powerbrowser/shell/PowerBrowserAPI.sys.mjs`).
- Theia contributions carry a doc comment naming the UI-SPEC contract or spike observation that ratified the mechanism (`theia/extensions/tab-uris/src/browser/browser-window-command.ts:27-56`).
- Pure check functions document their return contract (failures array vs exit) and who drives them (`scripts/generate.mjs:1406-1428` for `TARGETS`).

## Function Design

**Size:** Keep check functions single-assertion-group sized; factor shared launch/scan scaffolding into helpers (`start_shell`/`stop_shell`, `sentinel_present`, `backend_ready_pids`, `wait_pid_gone_or_zombie` in `scripts/verify-platform.sh`). A future check needing arguments gets a wrapper function — never a smuggled command string (enforced loudly by the registry runner, `scripts/verify-platform.sh:3941-3955`).

**Parameters:** Shell helpers take explicit profile/config overrides as `$1` with `mktemp -d` defaults (`start_shell`, `start_shell_display`). Node check entry points take at most `--file <path>` plus `--self-test`; reject unknown arguments with a named FAIL (see `scripts/verify-generated-identity.mjs` argument dispatch).

**Return Values:** Bash helpers return 0 pass / 1 fail / 2 unscannable. Node `.mjs` checks exit 0 pass / 1 fail and print `PASS`/`FAIL` lines naming the drift. Library-shaped functions return failure-string arrays for the caller to report.

## Module Design

**Exports:** Theia extensions export one `ContainerModule` as default plus named constants for anything another file or check must reference without duplicating strings (`OPEN_BROWSER_WINDOW_COMMAND_ID` in `theia/extensions/tab-uris/src/browser/browser-window-command.ts`; `POWERBROWSER_VIEW_FACTORY_IDS` in `theia/extensions/tab-uris/src/browser/view-factory-table.ts`). Contract tables are `Object.freeze`d (`EXPECTED` in `scripts/verify-registry-shape.mjs`, `TARGETS` in `scripts/generate.mjs`).

**Barrel Files:** Not used. Import sibling modules by direct relative path (`./tab-uri-registry`, `./view-factory-table`). Do not add index barrels to extensions.

**Boundary rules (hard, from `CLAUDE.md`):**
- One anti-corruption layer: only `powerbrowser/shell/PowerBrowserAPI.sys.mjs` may touch Firefox internals. `powerbrowser/shell/TheiaService.sys.mjs` is a consumer, never a second boundary. `scripts/check-internals-boundary.sh` enforces the pattern list; add any new privileged API name to `FORBIDDEN_PATTERNS` in the same commit that introduces its use.
- Never fork Theia core: new GUI lives in `@powerbrowser/*` extensions composed into the sidecar (`scripts/diff-theia-core.sh` is the check).
- Never hand-edit a patch hunk: regenerate patches from a patched tree (`scripts/check-patch-surface.sh` guards the surface).
- One driver, one registry: adding a check means appending one `label|command` row to `CHECKS` in `scripts/verify-platform.sh`. Never create a sibling driver.

**Check-design rules (hard, from `CLAUDE.md` Verification section):**
- Derive from the tree and compare as set equality; never hand-keep an expectation list that can only agree with itself (`scripts/verify-registry-shape.mjs`, `scripts/verify-shell-error-copy.mjs`).
- Never assert on the absence of a log line unless the line is emitted by the code under test rather than the instrumentation.
- Every check ships a `--self-test` that plants faults and requires each to go red naming the drift (see `TESTING.md`).

**User-facing copy rule (from `.planning/phases/01-platform-extraction-and-rename/01-UI-SPEC.md` Copywriting Contract, enforced by `shell-error-copy-no-internals`):**
- Every user-facing string names the product as "Power Browser", states the problem in plain language, and ends with a next step that is a real affordance on screen (Retry or Details).
- No internal identifier may appear in user-facing text: no pref key, sentinel name, port, timeout, or raw exception message. The complete source of user strings is the `USER_MESSAGE` table in `powerbrowser/shell/TheiaService.sys.mjs`; every `_showError(` first argument must resolve to it.
- Every identifier a message drops appears as a labelled `[label, value]` row in `_failureDetails`, surfaced both in the diagnostics layer and the `POWERBROWSER_ERROR_DIAGNOSTICS` sentinel through the single `getFailureDetails()` accessor. Absent identifiers produce NO row, never an empty-labelled one.
- Enforce by shape pattern (`ALL_CAPS_TOKEN`, `DOTTED_KEY` in `scripts/verify-shell-error-copy.mjs`), not by a banned-literal list, so failure paths added later are covered without touching the checker.
- A caught exception's `.message` is diagnostics-row material, never message material; the checker rejects non-table-derived `<x>.message` at `_showError` call sites.

**Commit conventions:**
- Format is `type(scope): subject` in imperative, lowercase-after-colon style. Observed types: `feat`, `fix`, `docs`, `test`.
- Scope is the phase-plan id the commit belongs to: `docs(03-01)`, `feat(03-01)`, `fix(02-08)`, `test(02-08)`, `docs(02-09)`, `docs(phase-3)`. A commit touching review findings names the finding: `fix(02): WR-11 observe byte-identity after the rebase`, `fix(02): CR-04 stop generate-check failing every fresh clone`.

---

*Convention analysis: 2026-09-04*
