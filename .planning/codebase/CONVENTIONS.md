# Coding Conventions

**Analysis Date:** 2026-09-07

Scope: project code only — `powerbrowser/`, `theia/extensions/`, `theia/applications/`,
`patches/`, `scripts/`, `docs/`. `upstream/` is a fetched Gecko checkout and follows Mozilla's
conventions; never hand-edit it and never take style cues from it.

## Naming Patterns

**Files:**
- TypeScript/TSX under `theia/extensions/*/src/`: `kebab-case.ts`, one concern per file, suffixed
  by role — `-frontend-module.ts` (DI module), `-contribution.ts`, `-service.ts`, `-commands.ts`,
  `-widget.tsx`, `-backend-module.ts`. Examples: `theia/extensions/modes/src/browser/mode-service.ts`,
  `theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts`,
  `theia/extensions/chrome-bar/src/node/chrome-bar-backend-module.ts`.
- Branding-owned Theia files carry a `powerbrowser-` prefix:
  `theia/extensions/branding/src/browser/powerbrowser-welcome-widget.tsx`.
- Chrome-side Gecko modules: `PascalCase.sys.mjs` (`powerbrowser/shell/PowerBrowserAPI.sys.mjs`,
  `powerbrowser/shell/TheiaService.sys.mjs`, `powerbrowser/shell/GroupActorChild.sys.mjs`);
  plain window scripts stay lowercase (`powerbrowser/shell/powerbrowser.js`,
  `powerbrowser/shell/powerbrowser-sidecar.js`).
- Scripts: `verify-<subject>.mjs` for derived assertions, `check-<subject>.sh` for shell gates,
  `scan-<subject>.mjs` for tree scans, plus the lifecycle scripts
  `scripts/fetch-upstream.sh`, `scripts/apply-patches.sh`, `scripts/rebase-upstream.sh`,
  `scripts/generate.mjs`.
- Patches: `NNN-powerbrowser-<subject>.patch`, three-digit ordered —
  `patches/010-powerbrowser-identity.patch`, `patches/020-powerbrowser-shell.patch`.

**Packages:**
- Every Theia extension is `@powerbrowser/<dir>` and `"private": true` at `0.1.0`
  (`theia/extensions/modes/package.json`). The directory name and the scope name match.

**Functions / variables:**
- `camelCase` for functions and locals; `PascalCase` for classes, interfaces, and types;
  `SCREAMING_SNAKE_CASE` for module-level frozen constants and contract tables
  (`MODES_STORE_VERSION` in `theia/extensions/modes/src/browser/mode-service.ts`,
  `EXPECTED` / `EXPECTED_MEMBERS` in `scripts/verify-registry-shape.mjs`,
  `POWERBROWSER_VIEW_FACTORY_IDS` in `theia/extensions/tab-uris/src/browser/view-factory-table.ts`).
- Private instance members use a leading underscore in chrome-side code
  (`TheiaService._resolveConfigDir()`, `this._showError(...)` in
  `powerbrowser/shell/TheiaService.sys.mjs`).

## Code Style

**Formatting:**
- No ESLint, Prettier, Biome, or `.editorconfig` in the tree. Style is held by convention and by
  the verification registry, not by a formatter. Do not add one without a decision — a reformat
  would churn every file the residual-brand scan and patch-surface checks read.
- TypeScript: 4-space indent, single quotes, semicolons, trailing commas in multi-line literals.
- Chrome-side `.sys.mjs` / `.js`: 2-space indent, double quotes for module URLs
  (Mozilla house style, since these files live inside the Gecko build).
- Node scripts (`scripts/*.mjs`): 4-space indent, single quotes, ESM with explicit
  `node:` prefixes — `import { readFileSync } from 'node:fs';`.

**TypeScript compiler settings** (`theia/extensions/*/tsconfig.json`, identical per extension):
- `strictNullChecks`, `noImplicitAny`, `noImplicitThis` on; full `strict` is not enabled.
- `composite: true` + `declaration` + `declarationMap`; builds run `tsc -b`, so project
  references are what order the build (`"build": "tsc -b"`, `"clean": "rm -rf lib *.tsbuildinfo"`).
- `target: ES2017`, `module: commonjs`, `jsx: react`, `experimentalDecorators` +
  `emitDecoratorMetadata` (required by InversifyJS).
- `rootDir: src`, `outDir: lib`. Never commit `lib/`.

## Import Organization

**Order (TypeScript):**
1. `@theia/core/shared/inversify` — `injectable`, `inject`.
2. Other `@theia/*` imports, deepest-path form (`@theia/core/lib/browser`,
   `@theia/filesystem/lib/browser/file-service`).
3. Third-party runtime deps (`p-debounce`).
4. Relative in-extension imports (`./mode-descriptors`).

**Rules:**
- Consume `@theia/*` as npm dependencies pinned to `1.74.1` via the root `resolutions` block in
  `theia/package.json`. Never vendor or patch Theia core; `scripts/diff-theia-core.sh` is the gate.
- Cross-extension imports use the package name (`@powerbrowser/tab-uris`), never a relative path
  out of the extension directory, and must be declared in that extension's `package.json`.
- No path aliases. `baseUrl: "."` is set but unused.
- **Chrome side: exactly one file may import a Firefox internal.**
  `powerbrowser/shell/PowerBrowserAPI.sys.mjs` reaches `Services`, `Cc/Ci/Cr/Cu`, `Subprocess`,
  `Sqlite`, `PlacesUtils`, `SessionStore`, `PageThumbs`, `AppConstants` through one
  `ChromeUtils.defineESModuleGetters(lazy, {...})` block. Every other chrome file — including
  `TheiaService.sys.mjs` — is a *consumer* of that boundary. Enforced by
  `scripts/check-internals-boundary.sh`; every touchpoint is catalogued in
  `powerbrowser/INTERNAL-APIS.md`, and adding a reach-through means adding a catalogue row.

## Error Handling

**Patterns:**
- Chrome-side user-visible failures go through a `USER_MESSAGE` table in
  `powerbrowser/shell/TheiaService.sys.mjs` and are painted via `this._showError(...)`. Never
  format an ad-hoc string at a call site — `scripts/verify-shell-error-copy.mjs` derives the
  table, its references, and each `_showError` argument and rejects anything that bypasses it.
- Never pass a caught exception's `.message` into user-facing copy: it carries paths, ports and
  errno text. That exact leak shipped once and is now rejected by name.
- Frontend services practise **total parsing**: validate, drop unknown fields, drop unusable rows,
  fall back to a known-good default with a contracted notice — never throw during startup. See
  the customs-file reader in `theia/extensions/modes/src/browser/mode-service.ts`.
- Prefer last-good retention over hard failure: a later read failure keeps prior content; only an
  explicit DELETE resets.
- Shell drivers use `set -uo pipefail` and deliberately **no** `-e`
  (`scripts/verify-platform.sh`), so every check in a run reports rather than the first failure
  aborting the table.

## Logging

**Framework:** No logging library. Chrome side uses `dump(...)` for machine-readable startup
lines (`POWERBROWSER_APP_IDENTITY`, `POWERBROWSER_BACKEND_READY`) in
`powerbrowser/shell/powerbrowser.js`; Theia side uses the injected Theia `ILogger` / `console`.

**Rules:**
- Machine-readable sentinel lines are a contract that live checks assert on. Do not rename or
  reformat one without updating the check that reads it.
- Never assert on the *absence* of a log line unless that line is proven to be emitted by the
  code under test rather than by your own instrumentation.

## Comments

**When to comment:** Heavily and deliberately. This tree's dominant convention is a long
file- or block-level header that records *why*, the requirement id, and the failure that
motivated the design. See the headers of `scripts/verify-registry-shape.mjs`,
`scripts/verify-shell-error-copy.mjs`, `scripts/verify-platform.sh`,
`powerbrowser/shell/PowerBrowserAPI.sys.mjs`, and
`theia/extensions/modes/src/browser/mode-service.ts`.

**Conventions inside comments:**
- Cite the requirement / decision / plan id inline: `GUI-04`, `D-96/D-97`, `SQL-01 (12-01)`,
  `T-14-02-01`, `Pitfall 3`. Upstream-provenance citations are frozen, never renumbered.
- Mark a contract that a check derives from ("the allowlisted surface the switch-invariant gate
  derives at check time") so an editor knows a gate reads this code.
- JSDoc `/** */` is used for exported constants and contract functions, not for every member.

## Function and Module Design

- Boundary wrappers are thin and named, with no policy of their own — that is what makes the
  next ESR rebase auditable.
- Exports: named exports only; no default exports, no barrel `index.ts` files. Each Theia
  extension's public entry is declared in `package.json`'s `theiaExtensions` block pointing at
  a compiled module (`lib/browser/modes-frontend-module`).
- DI is Inversify: `@injectable()` classes, constructor or property `@inject()`, bound in the
  extension's `*-frontend-module.ts` / `*-backend-module.ts` `ContainerModule`.
- Contract objects are `Object.freeze`d so a shape change is a visible diff.

## Branding and User-Facing Copy

- **Every branding value in Phase 1 is a hand-written literal.** No generator, template, or
  derive-at-build-time helper — Phase 2's acceptance test is byte-identity against these files.
- The originating product's name may appear only in `inventory/brand-tokens.json`. Spelling it in
  any other file fails `node scripts/scan-brand-residue.mjs`, which iterates `git ls-files` —
  **stage a new file before trusting a green scan.**
- No internal identifier (pref key, sentinel, port, timeout, raw exception text) may appear in
  user-facing text. Every user-facing string names the product as "Power Browser", states the
  problem plainly, and ends with a next step that is a real on-screen affordance. Dropped detail
  belongs in the diagnostics layer as a labelled row.
- The design contract is
  `.planning/phases/01-platform-extraction-and-rename/01-UI-SPEC.md`.

## Patches

- Regenerate a patch from a patched tree; **never text-edit a hunk.** Editing a hunk body without
  recomputing blob hashes degrades the three-way merge into a silent no-op — the patch applies and
  changes nothing. `scripts/check-patch-surface.sh` guards the surface,
  `scripts/apply-patches.sh --self-test` guards the mechanism.
- `git -C upstream diff` staying empty is the invariant.

## Environment

- Builds run inside Nix dev shells: `nix develop .#firefox` for `upstream/`, `nix develop .#theia`
  for `theia/`. `node` and `objdir/dist/bin/powerbrowser` work outside a shell; `yarn` does not.
- The repo path must contain no space character — `NIX_LDFLAGS` is space-separated and every
  native link step breaks otherwise.
- Edits to `powerbrowser/shell/*.js` need `-purgecaches` or the chrome JS startup cache serves
  the old bytes and the change silently does not run.

---

*Convention analysis: 2026-09-07*
