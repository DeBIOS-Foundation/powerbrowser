# Coding Conventions

**Analysis Date:** 2026-09-04

## Naming Patterns

**Files:**
- Theia extensions use kebab-case with a `powerbrowser-` prefix: `theia/extensions/branding/src/browser/powerbrowser-about-dialog.tsx`, `theia/extensions/tab-uris/src/browser/browser-window-command.ts`, `theia/extensions/token-gate/src/node/powerbrowser-env.ts`
- Verification scripts use `verify-<behavior>.mjs` (behavioral checks), `check-<boundary>.sh` (executable guards), `smoke-<target>.sh` (build/boot proofs): `scripts/verify-shell-error-copy.mjs`, `scripts/check-internals-boundary.sh`, `scripts/smoke-theia.sh`
- Shell modules use PascalCase with the `.sys.mjs` suffix: `powerbrowser/shell/PowerBrowserAPI.sys.mjs`, `powerbrowser/shell/TheiaService.sys.mjs`
- Theia extension entry points are always `<name>-frontend-module.ts` / `<name>-backend-module.ts`: `theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts`, `theia/extensions/token-gate/src/node/token-gate-backend-module.ts`
- Preferences use the dotted `powerbrowser.sidecar.*` namespace: `powerbrowser.sidecar.backendMain`, `powerbrowser.sidecar.giveUpAttempts` (declared in `powerbrowser/shell/powerbrowser-sidecar.js`)
- Stdout sentinels use `POWERBROWSER_*` upper-snake: `POWERBROWSER_BACKEND_READY`, `POWERBROWSER_SHELL_ERROR`, `POWERBROWSER_SHELL_SWAP` (emitted in `powerbrowser/shell/powerbrowser.js`, consumed in `scripts/verify-platform.sh`)

**Functions:**
- Shell service internals use leading-underscore private-by-convention methods: `_spawnAndGate`, `_restart`, `_reapLeftover`, `_showError`, `_hideError` in `powerbrowser/shell/TheiaService.sys.mjs`
- Check scripts expose `check_<label>` bash functions or `checkShape`/`check(targetPath)` node functions: `check_side04_sigkill_no_orphan`, `check_shell03_budget_exhausted_error` in `scripts/verify-platform.sh`; `checkShape` in `scripts/verify-registry-shape.mjs`
- Theia contributions implement framework interfaces verbatim: `registerCommands(commands: CommandRegistry)`, `initialize()`, `configure(app)`, `onStart(server)` — see `theia/extensions/tab-uris/src/browser/browser-window-command.ts` and `theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts`

**Variables:**
- `camelCase` for locals and fields throughout all three languages (TS, `.sys.mjs`, `.mjs` scripts)
- `UPPER_SNAKE` for sentinel constants, exported contract sets, and regex shape tests: `EXPECTED`, `EXPECTED_MEMBERS` in `scripts/verify-registry-shape.mjs`; `ALL_CAPS_TOKEN`, `DOTTED_KEY`, `FAULTS` in `scripts/verify-shell-error-copy.mjs`
- `SCREAMING` env vars keep the `POWERBROWSER_` prefix and are scrubbed as a class: `POWERBROWSER_TOKEN`, `POWERBROWSER_SUPERVISED`, `POWERBROWSER_TOKEN_DISABLE` (see `theia/extensions/token-gate/src/node/powerbrowser-env.ts`)

**Types:**
- Exported interfaces use PascalCase with a domain suffix: `ViewFactoryTableRow` in `theia/extensions/tab-uris/src/browser/view-factory-table.ts`
- Command IDs are exported string constants, never inline literals: `OPEN_BROWSER_WINDOW_COMMAND_ID = 'powerbrowser.open-browser-window'` in `theia/extensions/tab-uris/src/browser/browser-window-command.ts`
- Cookie/token names are exported constants shared between gate and checks: `POWERBROWSER_TOKEN_COOKIE_NAME` in `theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts`

## Code Style

**Formatting:**
- No formatter is configured. There is no `.editorconfig`, `.prettierrc*`, `eslint.config.*`, `.eslintrc*`, or `biome.json` anywhere in the tree. Style is enforced by review and by verification scripts, not by a tool.
- TypeScript uses 4-space indent, single quotes, semicolons, trailing commas in multiline literals — see `theia/extensions/tab-uris/src/browser/tab-uri-registry.ts`
- Shell `.sys.mjs` / chrome `.js` use 2-space indent, double quotes — see `powerbrowser/shell/powerbrowser.js`, `powerbrowser/shell/PowerBrowserAPI.sys.mjs`
- Node check scripts use 4-space indent, double quotes — see `scripts/verify-shell-error-copy.mjs`
- Bash uses 2-space indent with `local` declarations at the top of every function — see `scripts/check-internals-boundary.sh`

**Linting:**
- No lint tool. The functional equivalents are the executable guards: `scripts/check-internals-boundary.sh` (forbidden Firefox-internal patterns outside the boundary file), `scripts/scan-brand-residue.mjs` (brand-token residue), `scripts/verify-shell-error-copy.mjs` (internal identifiers in user-facing copy). Write new code so these stay green rather than satisfying a linter.

**TypeScript compiler settings (all four extensions share this shape):**
- `theia/extensions/tab-uris/tsconfig.json`, `theia/extensions/token-gate/tsconfig.json` (and `branding`/`customize` equivalents): `rootDir: src`, `outDir: lib`, `module: commonjs`, `target: ES2017`, `strictNullChecks: true`, `noImplicitAny: true`, `noImplicitThis: true`, `experimentalDecorators: true`, `emitDecoratorMetadata: true`, `declaration: true`, `sourceMap: true`, `composite: true`, `skipLibCheck: true`
- Do not add `strict: true` wholesale or change `target`/`module` in one extension only — the four `tsconfig.json` files are intentionally parallel and Theia 1.74.1 pins the decorator metadata model.

## Import Organization

**Order:**
1. Framework/shared imports first (`@theia/core/...`, `@theia/core/shared/inversify`, `node:*`)
2. Sibling/local imports last (`./view-factory-table`, `./powerbrowser-env`)
3. Shell code imports exactly one module: `TheiaService.sys.mjs` imports only `chrome://powerbrowser/content/PowerBrowserAPI.sys.mjs` — see the D-96 header in `powerbrowser/shell/TheiaService.sys.mjs`. A second import there is a boundary violation, not a style choice.

**Path Aliases:**
- Cross-extension imports resolve through the built `lib/` output, never `src/`: `import { TabUriRegistry } from '@powerbrowser/tab-uris/lib/browser/tab-uri-registry'` in `theia/extensions/customize/src/browser/customize-frontend-module.ts`
- Shell modules resolve via `chrome://powerbrowser/content/...` through `ChromeUtils.importESModule`, never relative paths: `powerbrowser/shell/powerbrowser.js`
- Check scripts resolve the repo root from their own location, never from cwd: `const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')` in `scripts/verify-registry-shape.mjs`; `REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"` in every `.sh` script

## Error Handling

**Patterns:**
- Boundary accessors never throw — they return a fallback. Use this for every pref/env/state read in shell code:
```javascript
// `powerbrowser/shell/PowerBrowserAPI.sys.mjs`
getStringPref(name, fallback) {
  try {
    return Services.prefs.getStringPref(name, fallback);
  } catch {
    return fallback;
  }
}
async readStateFile(path) {
  try {
    const value = await IOUtils.readJSON(path);
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}
```
- Supervisor methods return classified result objects, never bare booleans, so callers can distinguish unrecoverable from transient without re-deriving it:
```javascript
// `powerbrowser/shell/TheiaService.sys.mjs` — `_spawnAndGate` contract
return {
  ok: false,
  recoverable: false,                       // false → give up immediately; true → retry against budget
  message: USER_MESSAGE.couldNotStartUnrecoverable,
  details: [
    ["Failed step", "spawning the backend process"],
    ["Error", err.message],
  ],
};
```
- Every fire-and-forget promise root carries the single terminal handler. There are exactly four roots (bootstrap `start()`, Retry `retry()`, `_healthLoop`, `_recoveryProbeLoop`) and all route to one place:
```javascript
// `powerbrowser/shell/powerbrowser.js`
TheiaService.start(browserElement).catch(err => TheiaService.reportUnexpectedFailure(err));
// `powerbrowser/shell/TheiaService.sys.mjs`
this._healthLoop().catch(err => this.reportUnexpectedFailure(err));
```
- `reportUnexpectedFailure` in `powerbrowser/shell/TheiaService.sys.mjs` is the only backstop: it paints `USER_MESSAGE.couldNotStart` (never a new string — an unclassified escape is exactly what that sentence exists for) and puts the rejection text into `_fatal()` plus the diagnostics rows.
- Give-up logic splits on classification: `recoverable: false` (missing entry file, unresolvable Node, `spawn()` throw, pinned-port conflict) gives up with no wait; recoverable failures retry with 500ms-doubling-to-5000ms backoff until `powerbrowser.sidecar.giveUpAttempts` (default 6) or `powerbrowser.sidecar.giveUpWallclockMs` (default 45000) trips — see `_restart()` in `powerbrowser/shell/TheiaService.sys.mjs` and the pref defaults in `powerbrowser/shell/powerbrowser-sidecar.js`.
- Re-entrancy uses boolean latch guards with early return, never queues: `_started`, `_shuttingDown`, `_restartInFlight` (shared by `_restart`, `retry`, `_recoveryProbe`), `_errorShown`. A second caller while one is in flight is a no-op.
- Never swallow a rejection into silence on the loading layer, and never let a refused action erase diagnostics: `retry()` returns before `_hideError()` when `_errorRecoverable !== true`, so the rows survive — see the 01-13 ordering note in `powerbrowser/shell/TheiaService.sys.mjs`.

## Logging

**Framework:** Dual-channel custom logging, no library. `PowerBrowserAPI.log(level, message)` in `powerbrowser/shell/PowerBrowserAPI.sys.mjs` writes `dump()` (stdout) plus the matching `console[level]`, so the supervisor ring buffer and the harness read the same stream.

**Patterns:**
- `_fatal(message)` = full diagnostic text to both channels (this is what `scripts/verify-platform.sh` greps). `_pushLog(message)` = ring-buffer line. `_reapLog(message)` = ring buffer plus `PowerBrowserAPI.log("log", ...)` for reap decisions observable from both `getRecentLog()` and stdout — see `powerbrowser/shell/TheiaService.sys.mjs`.
- Sentinels are single-line `dump()` writes with a fixed prefix and JSON payload: `dump(`POWERBROWSER_SHELL_ERROR ${JSON.stringify({ reason, recoverable })}\n`)` in `powerbrowser/shell/powerbrowser.js`. Keep the `{reason, recoverable}` shape exact — `check_shell03_budget_exhausted_error` in `scripts/verify-platform.sh` asserts it with an anchored regex.
- Never log the token, a cookie value, or any credential. The `{reason, recoverable}` sentinel deliberately gains no key, and `POWERBROWSER_ERROR_DIAGNOSTICS` carries only labelled `[label, value]` rows — see the SHELL-03 note in `powerbrowser/shell/powerbrowser.js`.
- Probe/health noise goes through `_pushLog` with counts, not per-event dumps: `` `Health probe failed (${consecutiveFailures} consecutive).` `` — a single slow response never churns (threshold is 2 consecutive failures, `CONSECUTIVE_FAILURES_THRESHOLD`).

## Comments

**When to Comment:**
- Every non-obvious decision carries a WHY comment citing the decision ID and the file that recorded it (`D-96`, `D-111`, `01-13`, `05-REVIEW.md CR-01`). The comment explains why the code is shaped this way and what breaks if it moves — not what the code does. Example: the `sleep()` timer-retention note and the `notify()`-vs-`observe()` note in `powerbrowser/shell/PowerBrowserAPI.sys.mjs`.
- Placement that is load-bearing says so explicitly ("Placement is MODULE LOAD, not a contribution's initialize(), and that is load-bearing rather than stylistic" — `theia/extensions/token-gate/src/node/powerbrowser-env.ts`). If ordering matters, the comment names the earlier/later actor and the failure mode.
- Deliberate simplifications carry a `ponytail:` marker naming the ceiling and the upgrade path (e.g. the file-scoped `catchParamNames` note in `scripts/verify-shell-error-copy.mjs`: `ponytail: file-scoped, not block-scoped ... Upgrade to block scope only if a real false positive appears`).
- Trace every transcribed constant to its source with `file:line`: each row in `theia/extensions/tab-uris/src/browser/view-factory-table.ts` cites the Theia source line its factory ID came from.

**JSDoc/TSDoc:**
- Every `PowerBrowserAPI` method has a JSDoc block stating the contract (throws/never-throws, units, edge cases) — see `powerbrowser/shell/PowerBrowserAPI.sys.mjs`.
- Every `TheiaService` method documents its place in the lifecycle (who calls it, what state it assumes) — see `powerbrowser/shell/TheiaService.sys.mjs`.
- Check scripts open with a header comment explaining what the check proves, why it is shaped that way (derive-vs-list), its tier (`--quick` or not, and why), and its usage including `--self-test` — see `scripts/verify-registry-shape.mjs`, `scripts/verify-shell-error-copy.mjs`, `scripts/generate.mjs`.

## Function Design

**Size:** Small single-purpose methods. If a method needs more than one paragraph of WHY comment, that is normal here — the comment is the design record, not a smell. Split when responsibilities split (resolve vs. spawn vs. gate vs. probe are separate methods in `powerbrowser/shell/TheiaService.sys.mjs`), not to hit a line count.

**Parameters:** Option objects for spawn/config surfaces (`spawnProcess({ command, args, environment })`, `setSessionCookie({ host, path, name, value })` in `powerbrowser/shell/PowerBrowserAPI.sys.mjs`). Positional args only for single-value accessors (`getStringPref(name, fallback)`, `readProcessStartTicks(pid)`).

**Return Values:** Never-throw accessors resolve a fallback (`""`, `null`, `false`) instead of throwing. Async supervisor steps return `{ ok, recoverable, message, details }`. Health probes resolve boolean (`probeHealth` resolves `true` for 200, `false` for anything else — never throws, so callers need no try/catch).

## Module Design

**Exports:**
- Freeze public surfaces: `export const PowerBrowserAPI = Object.freeze({...})` in `powerbrowser/shell/PowerBrowserAPI.sys.mjs`; `Object.freeze([...])` for `EXPECTED`/`EXPECTED_MEMBERS` in `scripts/verify-registry-shape.mjs`; `Object.freeze([...])` for `POWERBROWSER_VIEW_FACTORY_IDS` in `theia/extensions/tab-uris/src/browser/view-factory-table.ts`.
- Theia extensions compose through `ContainerModule` default exports binding `@injectable()` classes `inSingletonScope()`; cross-cutting contributions alias with `toService` — see `theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts` and `theia/extensions/customize/src/browser/customize-frontend-module.ts`.
- The generator guards its CLI side effect so it can be imported by its own check: `generate.mjs` only runs the CLI when it is the process entry point, letting `scripts/verify-generated-identity.mjs` import the frozen target table and resolver without writing `generated/` as a side effect.

**Barrel Files:** Not used. Imports reach directly for the defining module (`./tab-uri-registry`, `./powerbrowser-env`, `@powerbrowser/tab-uris/lib/browser/tab-uri-registry`). Do not add index re-export files.

**Single-owner rules (the architecture constraints that read as conventions):**
- Exactly one file touches Firefox internals (`powerbrowser/shell/PowerBrowserAPI.sys.mjs`); everything else goes through it. `scripts/check-internals-boundary.sh` enforces this mechanically — a second file importing `Services.`/`Cc`/`Ci`/`nodePrincipal`/`fixupAndLoadURIString` fails the gate.
- Exactly one table owns user-facing error copy (`USER_MESSAGE` in `powerbrowser/shell/TheiaService.sys.mjs`); every `message:` site and every `_showError(` first argument resolves back to it. `scripts/verify-shell-error-copy.mjs` derives all four sets from the file and compares as equality.
- Exactly one field records swap completion (`_swapped`); port pinning (`_port`) never stands in for it — the 01-09 conflation that stranded launches on the loading layer. New completion-like state must reuse `_swapped`, not mint a parallel flag.

**User-facing copy contract (`01-UI-SPEC.md`, enforced by `scripts/verify-shell-error-copy.mjs`):**
- Every string that can reach `#powerbrowser-error-message` lives in `USER_MESSAGE`, names the product ("Power Browser"), states the problem in plain language, and ends with a next step that is a real on-screen affordance (Retry or Details).
- No pref key, sentinel name, port, timeout, or raw exception text in the sentence — those go to the diagnostics `[label, value]` rows via `getFailureDetails()`, announced on `POWERBROWSER_ERROR_DIAGNOSTICS` and rendered as field rows by `powerbrowserShowDiagnostics` in `powerbrowser/shell/powerbrowser.js`.
- Never interpolate runtime values into the sentence (`${...}` in a `USER_MESSAGE` value fails the check); never pass `err.message` or any `<x>.message` that is not a proven message-bearing binding to `_showError(`.

---

*Convention analysis: 2026-09-04*
