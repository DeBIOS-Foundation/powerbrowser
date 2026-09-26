# Wave E — Linux Platform and Adapter-Off Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the 13 wave E rows: NG-051, which with D2(b) takes the opencode adapter out of the default build, and NG-063 to NG-074, the Linux platform rows. Each row gets a failing check first, and each check drives the real entry point.

**Architecture:** Task 1 writes one check file per row (`scripts/verify-ng-NNN-<slug>.mjs`, R1) and registers each. Every check fails on the current code; NG-073's may pass, see Q8. Tasks 2–12 build the rows inside wave E's ownership. Tasks 13–14 touch wave C's files, so each is `Needs: wave-c` and ordered last. Task 15 (R11) waits on the controller's fixture edit (Q12). Steps marked `(waits: Chris Q1)` or `(waits: Chris Q3)` wait on Chris; every other step builds without them. Theia-side checks run in the clone (`live-clone`). Checks that need a Gecko build, `upstream/` or the packaged tree run in the main checkout at merge (`live-main`). The last section of this file gives the procedure for those merge-time checks.

**Tech Stack:**
- Gecko ESR 153 patch set (`upstream/` plus `patches/`), `./mach build` and `./mach package`, run in `nix develop .#firefox`.
- Theia 1.74.1 app and extensions, yarn 1, run in `nix develop .#theia`.
- Node 24 for the checks.
- `scripts/verify-platform.sh`, the one driver, and `scripts/lib/firefox-bidi.mjs` for live checks.
- NSS `certutil` and `signmar` from `objdir/dist/bin`.
- `makensis` 3.12 through `nix shell nixpkgs#nsis`.
- GitHub Actions `ubuntu-latest`, and the `gh` CLI.

**Spec:**
- `docs/non-gui/GAPS.md`: rows NG-051, NG-063–NG-074.
- `docs/non-gui/decisions.md`: D2(b), D4(a), D5(a), and the controller rulings R1 and R8–R16.
- GUI-research `docs/superpowers/plans/2026-09-25-powerbrowser-non-gui.md`: G1–G11 and its Review Focus.
- PowerBrowser `CLAUDE.md`.
- `docs/BUILD.md`, `docs/RELEASING.md` and `docs/CRASH-POLICY.md`.
- `.planning/milestones/v1.1-REQUIREMENTS.md`: NAME-01, PKG-01..03, EXT-02/03, TEL-04.

**Questions:** `docs/non-gui/questions-wave-e.md`. Rulings R9–R16 answered Q2 and Q4–Q11, and this plan follows them. Still open: Q1 and Q3 (with Chris), Q8 (a notice), and Q12–Q13 (new). Every row is still built.

## Global Constraints

Program constraints (they bind every task):

- **G1.** The main checkout is `~/coding/Power-Browser`, branch `main`. The wave clone is `~/coding/Power-Browser-ng-e`, branch `ng-e`. Its path has no space (hard rule 4). Install Theia only with `nix develop .#theia --command bash -c 'cd theia && yarn install --ignore-scripts --frozen-lockfile && (cd node_modules/drivelist && node-gyp rebuild) && yarn build'`. Never run a bare `yarn install`.
- **G2.** These PowerBrowser hard rules apply:
  - No Theia core edit (`scripts/diff-theia-core.sh`).
  - Gecko changes only as regenerated patches in `patches/`. `upstream/` is never hand-edited, except inside the patch procedure below.
  - Firefox internals only through `PowerBrowserAPI.sys.mjs`, each with an `INTERNAL-APIS.md` row.
  - Brand tokens only in `inventory/brand-tokens.json`. `node scripts/scan-brand-residue.mjs` must exit 0 after staging.
  - Every new check is registered in `scripts/verify-platform.sh`.
  - No internal identifier in user-facing text.
- **G3.** Never edit `ledger/`, `docs/non-gui/GAPS.md` or `.planning/`.
- **G4.** `objdir/dist/bin` symlinks into the main checkout's `powerbrowser/` tree. Verified 2026-09-25: `objdir/dist/bin/browser/chrome/browser/content/powerbrowser/TheiaService.sys.mjs` points to `upstream/powerbrowser/shell/…`, which points to `powerbrowser/shell/TheiaService.sys.mjs`. So:
  - Chrome-side changes go live only in main.
  - Live checks run under `flock ~/coding/Power-Browser/.git/pb-live.lock`.
  - Theia-side live checks in the clone set `PB_FIREFOX_BIN=$HOME/coding/Power-Browser/objdir/dist/bin/powerbrowser` and `PB_BACKEND_MAIN=$PWD/theia/applications/browser/lib/backend/main.js`.
- **G5.** A row you cannot build goes into `docs/non-gui/questions-wave-e.md`. Build every other row. Never drop, defer or narrow a row.
- **G6.** Each check drives the real entry point. A check that calls the product function directly is rejected in review.
- **G8.** One commit per task, message `feat(ng-e): …`, `test(ng-e): …` or `fix(ng-e): …`, with body `Refs: NG-NNN[, …]`. Every `git add` names its paths.
- **G10.** This plan cites 13 NG IDs, within the limit of 20. R8: the kit's `size-gate.py` guards `.planning/**` plans only, so it does not bind this file.
- **R1.** Each row's check lives in its own file `scripts/verify-ng-NNN-<slug>.mjs`. Shared helpers may live under `scripts/lib/`. Each check is also registered in `scripts/verify-platform.sh`. `docs/non-gui/checks-wave-e.tsv` has exactly three tab-separated fields per line:
  1. `NG-NNN`
  2. the test ref `scripts/verify-ng-NNN-<slug>.mjs::<label>`
  3. a command that contains that file path, followed by the tier as ` # live-main`, ` # live-clone` or ` # quick`

Wave E ownership. Edit nothing else; new files may be created where noted.

- `powerbrowser/packaging/` (new: `package-linux.sh`, `node-runtime.json`, `mar/mar-primary.der`)
- R12/R14 documentation, where wave E's changes make it stale: `docs/REBRANDING.md`, `docs/ai-opencode-adapter.md`, `docs/BUILD.md`, `docs/RELEASING.md`
- `powerbrowser/shell/powerbrowser-sidecar.js`
- `.mozconfig`
- `scripts/generate.mjs`
- `configuration.toml`
- `patches/` (new `030-`, `040-`; regenerated, never hand-edited)
- `powerbrowser/endpoint-allowlist.json`
- `scripts/verify-endpoints.sh`
- `theia/extensions/telemetry/**`
- `scripts/crash-collector.mjs`
- `powerbrowser/distribution/`
- `.github/workflows/verify.yml`
- `theia/applications/browser/package.json`
- `theia/extensions/backend-opencode/**` (NG-051 gating only; this plan needs no edit there)
- `generated/` outputs, and `powerbrowser/identity.configure.comparand`, the tracked byte copy of `generated/identity.configure`
- `inventory/brand-tokens.json`, only when a count legitimately moves. Record the move in the row's `reason`, as the prior entries do.
- The ai-opencode rows of `scripts/verify-platform.sh`, and wave E's own registry rows.
- New check files `scripts/verify-ng-0NN-*.mjs`, new helpers `scripts/lib/built-tree.mjs` and `scripts/lib/scratch-app.mjs`, and a new build helper `scripts/download-plugins.mjs`. No other wave creates these names.
- `docs/non-gui/checks-wave-e.tsv` and `docs/non-gui/questions-wave-e.md`.

Wave C's files, touched only in `Needs: wave-c` tasks:

- `powerbrowser/shell/TheiaService.sys.mjs`
- `powerbrowser/shell/PowerBrowserAPI.sys.mjs` (new accessors only, outside the G11 regions)
- `powerbrowser/INTERNAL-APIS.md`
- `theia/extensions/modes/src/browser/{mode-service,setups-service}.ts`

**Brand-scan traps.** `scan-brand-residue.mjs` counts literals in every tracked file, and an unaccounted occurrence fails it. Never type any of these into a tracked file, including comments, check sources, the TSV and this plan:

- the originating product's name in any case
- the old vendor name
- the six-character sequence `pref` + `("`. Build user.js lines as `` `user_pref(${JSON.stringify(k)}, ${JSON.stringify(v)});` ``, and write pref parsers as regexes (`pref\(\s*"`).
- the two Gecko identity define names beginning `MOZ_APP_` that end `_ID` and `_UA_NAME`
- the literal suffix `-PLAN` + `.md`

Stage new files before trusting a green scan.

**Patch procedure.** It runs in any checkout that has `upstream/`. Wave E's clone fetches its own `upstream/`; see Before Task 1.

1. Edit the target file under `upstream/`.
2. `git -C upstream diff -- <paths> > patches/0N0-powerbrowser-<name>.patch`
3. `git -C upstream checkout -- .`
4. `bash scripts/apply-patches.sh` reapplies the whole stack and fails on a silent no-op.
5. `bash scripts/check-patch-surface.sh && bash scripts/check-patch-surface.sh --brand-values && bash scripts/apply-patches.sh --self-test`

An added patch line never carries a manifest value (brand-values scan). Use build substitutions (`@MOZ_APP_NAME@`), generated defines (`${CompanyName}`) or fixed paths.

**Commit gate** (`docs/non-gui/decisions.md`). The command below must print nothing except labels of this wave's recorded NG checks: `ng068-crash-extra-part` and `ng070-no-spaced-name`, until their tasks land.

```bash
scripts/verify-platform.sh --quick 2>&1 | sed -n '/^verify-platform: summary/,$p' \
  | grep ': FAIL$' | awk '{print $1}' | sed 's/:$//' | sort \
  | comm -13 docs/non-gui/quick-baseline.txt -
```

**Build facts** (verified 2026-09-25):
- A full `./mach build` is tier 3. BUILD.md measured 2368–2830 s; CLAUDE.md quotes 47–54 min. It is required for any `.mozconfig` or `moz.configure`/`moz.build` change.
- `./mach build faster` is tier 2 and covers preprocessed chrome files such as `powerbrowser-sidecar.js`.
- Gecko steps run in `nix develop .#firefox`, from `upstream/`, with `MOZCONFIG=../.mozconfig`.
- `node` and `objdir/dist/bin/powerbrowser` also run outside a dev shell.

**Live-check preamble.** Run it before every live check. It covers the program Review Focus line "uncommitted work in main":

```bash
test -z "$(git -C ~/coding/Power-Browser status --short)" || { echo "main is dirty -- stop"; exit 1; }
```

## Review Focus

These are the failure modes most likely to hurt a user that no row statement spells out. Each has its test in the owning task.

1. **A packaged install on a machine that also has the dev tree.** The packaged browser must run its own Theia and Node, never the checkout's. On the build host the dev-tree `backendMain` path exists, so "use the pref if the file exists" would pass silently. Test: `ng063-packaged-launch` requires the running backend's `main.js` and `/proc/<pid>/exe` to be inside the extracted prefix. It also requires the packaged `node/bin/node` to be the pinned official release, with no `/nix/store/` reference in its bytes (R13). Tasks 1, 10, 13.
2. **A MAR signed with another key, or for another channel.** Test: `ng065-mar-signature-enforced` runs the packaged `updater` on a MAR signed with a throwaway key and on a fork-signed MAR for another channel, and requires `failed: 19` and `failed: 22`, with the payload not applied (Tasks 1, 8).
3. **Backend off while opencode is installed on the machine.** A user who has the opencode CLI on PATH must get no opencode process. Test: `ng051-backend-off` puts a fake `opencode` first on PATH. A same-run positive control proves the fake is seen, then the check requires it never to be spawned (Tasks 1, 2).
4. **Telemetry level off while the frontend throws.** Nothing may leave. Test: `ng067-frontend-errors-reach-telemetry` throws at level off and requires the logger to be called but nothing sent. It then switches to level error at runtime and requires both events sent (Tasks 1, 4). The same check covers the program Review Focus rule "a function with no caller on the runtime path" for NG-067: Task 4 Step 6 deletes the binding once and watches the check go red.
5. **A crash report with a malformed `extra` part, or with non-allowlisted keys in it.** The report must be kept and nothing outside the allowlist stored. Test: `ng068-crash-extra-part` arms 1–2 (Tasks 1, 3).

From the program Review Focus, "uncommitted work in main" applies to every live check here, through the preamble above. The "hostile local page", "existing profile" and "restart" lines touch no wave E row.

## Row map

| Row | Task | Check label | Marker |
|---|---|---|---|
| NG-051 | 2 | `ng051-backend-off` | live-clone |
| NG-063 | 10, 13 (`Needs: wave-c`) | `ng063-packaged-launch` | live-main |
| NG-064 | 7, 15 (R11; waits on Q12) | `ng064-update-url-from-manifest` | live-main |
| NG-065 | 8 | `ng065-mar-signature-enforced` | live-main |
| NG-066 | 9 | `ng066-nsis-branding-no-ping` | live-main |
| NG-067 | 4 | `ng067-frontend-errors-reach-telemetry` | live-clone |
| NG-068 | 3 | `ng068-crash-extra-part` | quick |
| NG-069 | 5 | `ng069-sidecar-egress` | live-clone |
| NG-070 | 11, 14 (`Needs: wave-c`; parts wait on Chris Q3) | `ng070-no-spaced-name` | quick |
| NG-071 | 6 | `ng071-tarball-extensions-build` | live-clone |
| NG-072 | 10 | `ng072-policies-packaged-webextension` | live-main |
| NG-073 | 6 | `ng073-declared-extension-loads` | live-clone |
| NG-074 | 12 (green waits on Chris Q1) | `ng074-ci-green-on-main` | live-main |

## File structure

New files:
- `scripts/lib/built-tree.mjs`: finds and extracts the Linux package, and reads `objdir/config.status`. Used by NG-063, 065, 066 and 072.
- `scripts/lib/scratch-app.mjs`: runs the app's declared `download:plugins` step against a given `theiaPlugins` block. Used by NG-071 and 073.
- `scripts/verify-ng-051-backend-off.mjs`
- `scripts/verify-ng-063-packaged-launch.mjs`
- `scripts/verify-ng-064-update-url.mjs`
- `scripts/verify-ng-065-mar-signature.mjs`
- `scripts/verify-ng-066-nsis-branding.mjs`
- `scripts/verify-ng-067-frontend-errors.mjs`
- `scripts/verify-ng-068-crash-extra-part.mjs`
- `scripts/verify-ng-069-sidecar-egress.mjs`
- `scripts/verify-ng-070-no-spaced-name.mjs`
- `scripts/verify-ng-071-tarball-extensions.mjs`
- `scripts/verify-ng-072-policies-webextension.mjs`
- `scripts/verify-ng-073-declared-extension-loads.mjs`
- `scripts/verify-ng-074-ci-main.mjs`
- `docs/non-gui/checks-wave-e.tsv`
- `scripts/download-plugins.mjs`: the app's plugin step (NG-071).
- `theia/extensions/telemetry/src/browser/telemetry-error-capture.ts` (NG-067)
- `powerbrowser/packaging/package-linux.sh` (NG-063, NG-072)
- `powerbrowser/packaging/node-runtime.json` (NG-063, R13: the pinned official Node release)
- `powerbrowser/packaging/mar/mar-primary.der` (NG-065, public certificate only)
- `patches/030-powerbrowser-mar-certificates.patch` (NG-065)
- `patches/040-powerbrowser-nsis.patch` (NG-066)

Modified files:
- `scripts/verify-platform.sh`: registry rows, and the ai-opencode held block.
- `scripts/verify-endpoints.sh`: layer 4.
- `theia/applications/browser/package.json`
- `configuration.toml`
- `scripts/generate.mjs`
- `.mozconfig`
- `powerbrowser/identity.configure.comparand`
- `powerbrowser/endpoint-allowlist.json`
- `scripts/crash-collector.mjs`
- `theia/extensions/telemetry/src/browser/{telemetry-frontend-module,telemetry-preferences}.ts`
- `.github/workflows/verify.yml`
- `powerbrowser/shell/powerbrowser-sidecar.js` (comment)
- `docs/REBRANDING.md`, `docs/ai-opencode-adapter.md`, `docs/BUILD.md`, `docs/RELEASING.md` (R14; each in the task whose change makes it stale)
- Wave C files, in Tasks 13–14 only.

## Before Task 1: the wave E clone (controller, once)

- [ ] Create the clone per G1. Then give it an `upstream/` and `generated/`. Patches, NG-068's check and the patch procedure need them.

```bash
git clone ~/coding/Power-Browser ~/coding/Power-Browser-ng-e && git -C ~/coding/Power-Browser-ng-e switch -c ng-e
cd ~/coding/Power-Browser-ng-e
nix develop .#theia --command bash -c 'cd theia && yarn install --ignore-scripts --frozen-lockfile && (cd node_modules/drivelist && node-gyp rebuild) && yarn build'
nix develop .#theia --command node scripts/generate.mjs
bash scripts/fetch-upstream.sh && bash scripts/apply-patches.sh      # ~1.1 GB depth-1 clone of the pinned ESR tag
```

Expected: `git status --short` prints nothing, because `upstream/`, `generated/` and `theia/**/lib` are git-ignored. The commit-gate command prints only rows that are in the baseline.

---

### Task 1: Failing checks for every wave E row (checks-first)

**Rows:** NG-051, NG-063, NG-064, NG-065, NG-066, NG-067, NG-068, NG-069, NG-070, NG-071, NG-072, NG-073, NG-074 (checks only; no product change).

**Files:**
- Create: `scripts/lib/built-tree.mjs`, `scripts/lib/scratch-app.mjs`, the 13 `scripts/verify-ng-0NN-*.mjs` above, `docs/non-gui/checks-wave-e.tsv`
- Modify: `scripts/verify-platform.sh` (registry rows), `scripts/verify-endpoints.sh` (accept `--layer 4`)

**Interfaces:**
- Produces:
  - `built-tree.mjs`: `REPO_ROOT`, `OBJDIR`, `builtVersion(): string`, `packagePath(): string`, `extractPackage(): string` (returns the install prefix; the caller removes `dirname(prefix)`), `configStatus(): Record<string, unknown>`.
  - `scratch-app.mjs`: `runDeclaredPluginStep(theiaPlugins: Record<string,string>, env?: Record<string,string>): { status: number|null, output: string, pluginsDir: string, cleanup(): void }`.
  - `verify-ng-074-ci-main.mjs`: `export function verdict(runs, sha): string|null`.
  - `verify-ng-070-no-spaced-name.mjs`: `export function hitsInCode(file, text)`, `hitsInLocale(file, text)`, `hitsInJson(file, text)`, each returning `string[]`.
  - The 13 labels in the Row map. Task 5 relies on `verify-endpoints.sh --layer 4` running `scripts/verify-ng-069-sidecar-egress.mjs`.

- [ ] **Step 1: Write the two helpers.**

`scripts/lib/built-tree.mjs`:

```js
// scripts/lib/built-tree.mjs -- the built Gecko tree and its Linux package, for the
// wave E checks (NG-063, NG-065, NG-066, NG-072). The package is
// objdir/dist/<app>-<Version>.en-US.linux-x86_64.tar.xz, the name `./mach package`
// gives it and powerbrowser/packaging/package-linux.sh rewrites. Version is read from
// the built application.ini, never typed.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const OBJDIR = join(REPO_ROOT, 'objdir');

export function builtVersion() {
    const ini = readFileSync(join(OBJDIR, 'dist', 'bin', 'application.ini'), 'utf8');
    const version = /^Version=(.+)$/m.exec(ini)?.[1];
    if (!version) throw new Error('objdir/dist/bin/application.ini has no Version= line -- build first (docs/BUILD.md)');
    return version.trim();
}

export function packagePath() {
    const suffix = `-${builtVersion()}.en-US.linux-x86_64.tar.xz`;
    const hits = readdirSync(join(OBJDIR, 'dist')).filter(n => n.endsWith(suffix));
    if (hits.length !== 1) {
        throw new Error(`expected exactly one objdir/dist/*${suffix}, found ${hits.length} -- run: `
            + 'nix develop .#firefox --command bash powerbrowser/packaging/package-linux.sh');
    }
    return join(OBJDIR, 'dist', hits[0]);
}

/** Extracts the package into a fresh temp dir and returns the install prefix (its one top-level dir). */
export function extractPackage() {
    const dir = mkdtempSync(join(tmpdir(), 'pb-pkg-'));
    execFileSync('tar', ['-xJf', packagePath(), '-C', dir]);
    const top = readdirSync(dir);
    if (top.length !== 1) throw new Error(`the package has ${top.length} top-level entries, expected one application dir`);
    return join(dir, top[0]);
}

/** objdir/config.status `substs` as an object. run_path with a non-main name runs no build step. */
export function configStatus() {
    const out = execFileSync('python3', ['-c',
        'import json,runpy,sys; ns=runpy.run_path(sys.argv[1], run_name="cs"); print(json.dumps(dict(ns["substs"]), default=str))',
        join(OBJDIR, 'config.status')], { encoding: 'utf8' });
    return JSON.parse(out);
}
```

`scripts/lib/scratch-app.mjs`:

```js
// scripts/lib/scratch-app.mjs -- runs the Theia application's `download:plugins` script,
// the plugin step `yarn build` runs, exactly as theia/applications/browser/package.json
// declares it, against a caller-supplied theiaPlugins block. The scratch app dir sits
// beside the real one, so every relative path in the script resolves the same way; it
// is dot-named (outside the `applications/*` workspace glob) and removed by cleanup().
// Used by the NG-071 and NG-073 checks.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const APP = join(REPO_ROOT, 'theia', 'applications', 'browser');

export function runDeclaredPluginStep(theiaPlugins, env = {}) {
    const pkg = JSON.parse(readFileSync(join(APP, 'package.json'), 'utf8'));
    const script = pkg.scripts?.['download:plugins'];
    if (!script) throw new Error(`${APP}/package.json declares no download:plugins script`);
    const dir = join(dirname(APP), `.scratch-${process.pid}-${Date.now()}`);
    mkdirSync(dir);
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ ...pkg, theiaPlugins, theiaPluginsDir: 'plugins' }, null, 2));
    // What yarn adds for a workspace script: the workspace bin dir ahead of PATH.
    const PATH = `${join(REPO_ROOT, 'theia', 'node_modules', '.bin')}:${process.env.PATH}`;
    const r = spawnSync('nix', ['develop', `${REPO_ROOT}#theia`, '--command', 'bash', '-c', script],
        { cwd: dir, env: { ...process.env, ...env, PATH }, encoding: 'utf8', timeout: 600000 });
    return {
        status: r.status,
        output: `${r.stdout ?? ''}${r.stderr ?? ''}`,
        pluginsDir: join(dir, 'plugins'),
        cleanup: () => rmSync(dir, { recursive: true, force: true }),
    };
}
```

- [ ] **Step 2: NG-051 check.** `scripts/verify-ng-051-backend-off.mjs`:

```js
#!/usr/bin/env node
// scripts/verify-ng-051-backend-off.mjs -- NG-051 (wave E, D2(b)): with [ai] backend = "off"
// no opencode process and no /mcp endpoint start.
//   Static half: the app composes @powerbrowser/backend-opencode exactly when the manifest
//   selects "opencode", and powerbrowserAiBackend equals the manifest value.
//   Live half: boots the BUILT backend with a fake `opencode` first on PATH. A same-run
//   positive control proves the fake is what `opencode` resolves to; the backend must
//   never spawn it, and GET /mcp must answer 404 while GET / answers 200.
// Tier: full (boots the built backend). Marker: live-clone.
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { emitAiBackend, resolveConfig } from './generate.mjs';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'ng051-backend-off';
const APP_PKG = join(REPO_ROOT, 'theia/applications/browser/package.json');
const MAIN_JS = join(REPO_ROOT, 'theia/applications/browser/lib/backend/main.js');
const ADAPTER = '@powerbrowser/backend-opencode';
const failures = [];

const { failures: rf, config } = resolveConfig(join(REPO_ROOT, 'configuration.toml'), undefined);
if (rf.length) failures.push(`configuration.toml does not resolve: ${rf.join('; ')}`);
const backend = JSON.parse(emitAiBackend(config, { id: 'dev' })).backend;
const pkg = JSON.parse(readFileSync(APP_PKG, 'utf8'));
const composed = Object.hasOwn(pkg.dependencies ?? {}, ADAPTER);
if (composed !== (backend === 'opencode')) {
    failures.push(`${ADAPTER} is ${composed ? '' : 'not '}a dependency of theia/applications/browser while [ai] backend is "${backend}" -- it must be composed exactly when the manifest selects "opencode"`);
}
const key = pkg.theia?.frontend?.config?.powerbrowserAiBackend;
if (key !== backend) failures.push(`package.json powerbrowserAiBackend is ${JSON.stringify(key)}, the manifest resolves "${backend}"`);

if (backend === 'off') {
    if (!existsSync(MAIN_JS)) failures.push(`${MAIN_JS} is absent -- run yarn build in theia/ first`);
    else await live();
}
finish();

async function live() {
    const dir = mkdtempSync(join(tmpdir(), 'ng051-'));
    const marker = join(dir, 'opencode-spawned');
    const bin = join(dir, 'bin');
    mkdirSync(bin);
    writeFileSync(join(bin, 'opencode'), `#!/bin/sh\necho "$@" >> '${marker}'\nexec sleep 60\n`);
    chmodSync(join(bin, 'opencode'), 0o755);
    const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
    delete env.POWERBROWSER_SUPERVISED;
    delete env.POWERBROWSER_TOKEN_DISABLE;
    const inShell = argv => ['develop', `${REPO_ROOT}#theia`, '--command', ...argv];
    // Positive control: through the same shell and PATH, `opencode` is the fake.
    spawnSync('nix', inShell(['bash', '-c', 'opencode acp & pid=$!; sleep 2; kill "$pid"']), { env, timeout: 120000 });
    if (!existsSync(marker)) {
        failures.push('instrument: a direct `opencode acp` through the theia shell did not reach the fake on PATH -- the absence below would prove nothing');
        rmSync(dir, { recursive: true, force: true });
        return;
    }
    rmSync(marker);
    const token = randomBytes(24).toString('hex');
    const log = join(dir, 'backend.log');
    const child = spawn('nix', inShell(['node', MAIN_JS, '--hostname', '127.0.0.1', '--port', '0']), {
        cwd: dir, detached: true, stdio: ['ignore', openSync(log, 'a'), openSync(log, 'a')],
        env: { ...env, POWERBROWSER_TOKEN: token, THEIA_CONFIG_DIR: join(dir, 'cfg') },
    });
    try {
        const port = await readyPort(log, child, 240000);
        await new Promise(r => setTimeout(r, 5000)); // the adapter spawns in initialize(), before READY; 5 s covers one respawn
        if (existsSync(marker)) failures.push(`an opencode process started with backend "off" (argv: ${readFileSync(marker, 'utf8').trim()})`);
        const auth = { headers: { Cookie: `POWERBROWSER_TOKEN=${token}` } };
        const control = await fetch(`http://127.0.0.1:${port}/`, auth);
        if (control.status !== 200) failures.push(`control: GET / answered ${control.status}, not 200 -- the /mcp probe proves nothing`);
        const mcp = await fetch(`http://127.0.0.1:${port}/mcp`, auth);
        if (mcp.status !== 404) failures.push(`GET /mcp answered ${mcp.status} with backend "off" -- expected 404 (no /mcp endpoint)`);
    } catch (err) {
        failures.push(err.message);
    } finally {
        try { process.kill(-child.pid, 'SIGKILL'); } catch { /* gone */ }
        rmSync(dir, { recursive: true, force: true });
    }
}

function readyPort(log, child, ms) {
    return new Promise((resolve, reject) => {
        const deadline = Date.now() + ms;
        const t = setInterval(() => {
            let text = '';
            try { text = readFileSync(log, 'utf8'); } catch { /* not yet */ }
            const hit = text.split('\n').find(l => l.startsWith('POWERBROWSER_BACKEND_READY '));
            if (hit) {
                clearInterval(t);
                try { resolve(JSON.parse(hit.slice('POWERBROWSER_BACKEND_READY '.length)).port); } catch { reject(new Error(`malformed READY line: ${hit}`)); }
            } else if (child.exitCode !== null) {
                clearInterval(t);
                reject(new Error(`the backend exited before READY (code ${child.exitCode}) -- log tail: ${text.slice(-1500)}`));
            } else if (Date.now() > deadline) {
                clearInterval(t);
                reject(new Error('POWERBROWSER_BACKEND_READY did not appear within 240 s'));
            }
        }, 500);
    });
}

function finish() {
    if (failures.length) {
        console.error(`${NAME}: FAIL -- ${failures.length} failure(s):\n  ${failures.join('\n  ')}`);
        process.exit(1);
    }
    console.log(`${NAME}: PASS -- adapter not composed with backend "off"; no opencode spawn; /mcp is 404`);
}
```

Fails today: the adapter is a dependency while the backend is `"off"`, so the static half fails. The live half also sees the fake spawned, or sees the backend exit 78.

- [ ] **Step 3: NG-063 check.** `scripts/verify-ng-063-packaged-launch.mjs`:

```js
#!/usr/bin/env node
// scripts/verify-ng-063-packaged-launch.mjs -- NG-063 (wave E): the Linux package contains
// the Theia app, a Node runtime and distribution/, and launched from a temp prefix it
// reaches a ready workbench with the sidecar's backend entry AND its Node binary inside
// that prefix (/proc/<pid>/cmdline and /proc/<pid>/exe) -- never the checkout's dev tree,
// which also exists on the build host. R13: the packaged node/bin/node is the official
// release pinned in powerbrowser/packaging/node-runtime.json. Its `--version` must equal
// the pin, and its bytes must name no /nix/store/ path (no Nix interpreter, no Nix RPATH).
// Tier: full. Marker: live-main.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { withFirefoxPage } from './lib/firefox-bidi.mjs';
import { extractPackage, REPO_ROOT } from './lib/built-tree.mjs';
import { resolveConfig } from './generate.mjs';

const NAME = 'ng063-packaged-launch';
const failures = [];
const { config } = resolveConfig(join(REPO_ROOT, 'configuration.toml'), undefined);
let prefix;
try {
    prefix = extractPackage();
    const need = [config.identity.binary_name, 'theia/lib/backend/main.js', 'theia/lib/frontend/index.html',
        'theia/package.json', 'node/bin/node', 'distribution/policies.json'];
    for (const rel of need) if (!existsSync(join(prefix, rel))) failures.push(`the package lacks ${rel}`);
    if (failures.length === 0) checkNode(join(prefix, 'node/bin/node'));
    if (failures.length === 0) await launch();
} catch (err) {
    failures.push(err.message);
} finally {
    if (prefix) rmSync(dirname(prefix), { recursive: true, force: true });
}
if (failures.length) {
    console.error(`${NAME}: FAIL -- ${failures.length} failure(s):\n  ${failures.join('\n  ')}`);
    process.exit(1);
}
console.log(`${NAME}: PASS -- the packaged tree reached a ready workbench on its own Theia and Node`);

async function launch() {
    delete process.env.PB_BACKEND_MAIN; // the launch must use the install's own resolution
    process.env.XDG_CONFIG_HOME = mkdtempSync(join(tmpdir(), 'ng063-cfg-'));
    await withFirefoxPage('', async ({ waitFor }) => {
        await waitFor('window.theia && window.theia.container ? true : false', { timeoutMs: 90000 });
        await waitFor('!!document.querySelector("#theia-app-shell")', { timeoutMs: 60000 });
        const ours = backends().filter(b => b.main.startsWith(`${prefix}/`));
        if (ours.length === 0) failures.push(`no running backend has its entry inside ${prefix} (running: ${backends().map(b => b.main).join(', ') || 'none'})`);
        for (const b of ours) if (!b.exe.startsWith(`${prefix}/`)) failures.push(`the backend runs on Node ${b.exe}, outside the install prefix`);
    }, { binPath: join(prefix, config.identity.binary_name) });
}

function checkNode(bin) {
    const pinPath = join(REPO_ROOT, 'powerbrowser/packaging/node-runtime.json');
    if (!existsSync(pinPath)) { failures.push('powerbrowser/packaging/node-runtime.json (the Node pin) is absent'); return; }
    const pin = JSON.parse(readFileSync(pinPath, 'utf8'))['linux-x64'];
    if (readFileSync(bin).includes('/nix/store/')) failures.push('the packaged node/bin/node names a /nix/store/ path -- it is not the official release binary');
    const version = execFileSync(bin, ['--version'], { encoding: 'utf8' }).trim();
    if (version !== pin?.version) failures.push(`the packaged node is ${version}, the pin is ${pin?.version}`);
}

function backends() {
    const out = [];
    for (const pid of readdirSync('/proc').filter(n => /^\d+$/.test(n))) {
        let argv;
        try { argv = readFileSync(`/proc/${pid}/cmdline`, 'utf8').split('\0'); } catch { continue; }
        const main = argv.find(a => a.endsWith('/lib/backend/main.js'));
        if (!main || !argv.includes('--hostname')) continue;
        let exe = '';
        try { exe = readlinkSync(`/proc/${pid}/exe`); } catch { /* raced */ }
        out.push({ pid, main, exe });
    }
    return out;
}
```

Fails today: the existing tarball holds no `theia/`, `node/` or `distribution/` (checked 2026-09-25). The official Node release binary uses the standard `/lib64` loader. It runs on legion because `programs.nix-ld.enable = true` in `/etc/nixos/configuration.nix:333` (verified).

- [ ] **Step 4: NG-064 check.** `scripts/verify-ng-064-update-url.mjs`:

```js
#!/usr/bin/env node
// scripts/verify-ng-064-update-url.mjs -- NG-064 (wave E): the update URL comes from
// configuration.toml ([urls] update) and no update endpoint of the build points at
// aus5.mozilla.org. Reads BUILT artifacts:
//   - application.ini [AppUpdate] URL;
//   - the launcher binary and libxul.so, whose compiled-in app data carries that URL;
//   - the EFFECTIVE default prefs: greprefs.js, then browser/defaults/preferences/*.js
//     with firefox.js first and firefox-branding.js last, later wins
//     (verify-endpoints.sh layer-1 order);
//   - the tracked distribution/policies.json, which the browser prefers over application.ini.
// Only `https://aus5.mozilla.org` URLs count. Two bare-host mentions are not endpoints
// (decisions.md R10): nsHttpChannel.cpp's HTTP/3 exclusion list in libxul, and the
// Remote Settings from/to fallback dump.
// R11: a downstream manifest (PB_CONFIG_DIR) that does not state its own [urls] update
// inherits the platform's host, and the generator must refuse it. It must write nothing
// under generated/ and name urls.update. Driven through the real CLI (node
// scripts/generate.mjs) in a child process.
// Tier: full (needs the Gecko build). Marker: live-main.
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveConfig } from './generate.mjs';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'ng064-update-url-from-manifest';
const BIN = join(REPO_ROOT, 'objdir/dist/bin');
const MOZ = 'https://aus5.mozilla.org';
const failures = [];

const { failures: rf, config } = resolveConfig(join(REPO_ROOT, 'configuration.toml'), undefined);
if (rf.length) failures.push(`configuration.toml does not resolve: ${rf.join('; ')}`);
const update = config?.urls?.update;
const host = typeof update === 'string' ? /^https:\/\/([^/]+)\//.exec(update)?.[1] : undefined;
if (!host) failures.push(`configuration.toml [urls] update is ${JSON.stringify(update)} -- the update URL must come from the manifest`);

const ini = readFileSync(join(BIN, 'application.ini'), 'utf8');
const appUrl = /\[AppUpdate\][^[]*?^URL=(\S+)/m.exec(ini)?.[1];
const appHost = appUrl && /^https:\/\/([^/]+)\//.exec(appUrl)?.[1];
if (!appHost) failures.push('application.ini carries no https [AppUpdate] URL');
else if (appHost !== host) failures.push(`application.ini [AppUpdate] URL host is ${appHost}, the manifest says ${host}`);

for (const f of [`${config.identity.binary_name}-bin`, 'libxul.so']) {
    const urls = spawnSync('grep', ['-a', '-o', '-E', 'https://[a-z0-9.-]+/update/6/', join(BIN, f)], { encoding: 'latin1', maxBuffer: 1 << 26 }).stdout.split('\n').filter(Boolean);
    for (const u of new Set(urls)) if (!u.startsWith(`https://${host}/`)) failures.push(`${f} carries the update URL ${u}`);
    if (spawnSync('grep', ['-a', '-q', '-F', MOZ, join(BIN, f)]).status === 0) failures.push(`${f} carries a ${MOZ} URL`);
}

const prefDir = join(BIN, 'browser/defaults/preferences');
const later = readdirSync(prefDir).filter(n => n.endsWith('.js') && n !== 'firefox.js' && n !== 'firefox-branding.js').sort();
const order = [join(BIN, 'greprefs.js'), join(prefDir, 'firefox.js'), ...later.map(n => join(prefDir, n)), join(prefDir, 'firefox-branding.js')];
const PREF = /(?:^|\n)\s*(?:sticky_)?pref\(\s*"([^"]+)"\s*,\s*("(?:[^"\\]|\\.)*"|[^)]*?)\s*\)\s*;/g;
const effective = new Map();
for (const file of order) for (const m of readFileSync(file, 'utf8').matchAll(PREF)) effective.set(m[1], m[2]);
for (const [name, value] of effective) if (value.includes('aus5.mozilla.org')) failures.push(`effective default pref ${name} = ${value}`);

const policy = JSON.parse(readFileSync(join(REPO_ROOT, 'powerbrowser/distribution/policies.json'), 'utf8')).policies ?? {};
if (policy.AppUpdateURL !== update) failures.push(`policies.json AppUpdateURL is ${JSON.stringify(policy.AppUpdateURL)}, the manifest [urls] update is ${JSON.stringify(update)}`);

// R11: a downstream copy of the platform manifest with a new identity and no [urls] table.
if (host) {
    const gen = join(REPO_ROOT, 'generated');
    const walk = d => readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]);
    const snapshot = () => walk(gen).sort().map(f => `${f}:${createHash('sha256').update(readFileSync(f)).digest('hex')}`).join('\n');
    const before = snapshot();
    const dir = mkdtempSync(join(tmpdir(), 'ng064-downstream-'));
    try {
        cpSync(join(REPO_ROOT, 'brand'), join(dir, 'brand'), { recursive: true });
        const toml = readFileSync(join(REPO_ROOT, 'configuration.toml'), 'utf8')
            .replace(/^\[urls\][\s\S]*?(?=^\[)/m, '')
            .replace(/^display_name = .*$/m, 'display_name = "Ng064Downstream"');
        writeFileSync(join(dir, 'configuration.toml'), toml);
        const r = spawnSync('node', [join(REPO_ROOT, 'scripts/generate.mjs')], { env: { ...process.env, PB_CONFIG_DIR: dir }, encoding: 'utf8' });
        if (r.status === 0) failures.push(`a downstream manifest without [urls] update generated cleanly -- it would ship ${host} (R11)`);
        else if (!`${r.stderr}${r.stdout}`.includes('urls.update')) failures.push(`the downstream refusal does not name urls.update: ${r.stderr.slice(-400)}`);
        if (snapshot() !== before) failures.push('the refused downstream generate changed files under generated/');
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}

if (failures.length) {
    console.error(`${NAME}: FAIL -- ${failures.length} failure(s):\n  ${failures.join('\n  ')}`);
    process.exit(1);
}
console.log(`${NAME}: PASS -- every update endpoint of the build is ${host}, from configuration.toml`);
```

Fails today:
- The manifest has no `[urls] update`.
- `application.ini` and the launcher binary carry the `aus5` URL.

The R11 arm runs only once the manifest states a host, so it goes live with Task 7 and turns green with Task 15. If a refused generate writes to `generated/` before exiting, the snapshot comparison reports it. Restore the tree afterwards with `node scripts/generate.mjs`.

- [ ] **Step 5: NG-065 check.** `scripts/verify-ng-065-mar-signature.mjs`:

```js
#!/usr/bin/env node
// scripts/verify-ng-065-mar-signature.mjs -- NG-065 (wave E): update MARs are signed with
// the fork's key and the built updater verifies them. Drives the PACKAGED tree's own
// `updater` (the program the client execs) on four full MARs made from the packaged tree:
//   - signed with the fork key            -> "succeeded", payload applied;
//   - unsigned                            -> "failed: <CERT_VERIFY_ERROR>";
//   - signed with a throwaway key         -> "failed: <CERT_VERIFY_ERROR>";
//   - fork-signed for another MAR channel -> "failed: <MAR_CHANNEL_MISMATCH_ERROR>".
// Error codes and the updater's argument version are read from upstream/ at check time.
// The private key lives outside the repo (decisions.md D5). Its NSS store has a password,
// read from password.txt in the same directory (R12). signmar reads a password from stdin
// when stdin is not a terminal (modules/libmar/sign/nss_secutil.c GetPasswordString).
// Tier: full. Marker: live-main.
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { builtVersion, configStatus, extractPackage, OBJDIR, REPO_ROOT } from './lib/built-tree.mjs';

const NAME = 'ng065-mar-signature-enforced';
const KEY_DB = join(homedir(), '.config', 'powerbrowser-release', 'mar-key');
const KEY_PASSWORD = join(KEY_DB, 'password.txt');
const NICK = 'powerbrowser-mar';
const CERT = join(REPO_ROOT, 'powerbrowser/packaging/mar/mar-primary.der');
const NSS_ENV = { ...process.env, LD_LIBRARY_PATH: join(OBJDIR, 'dist', 'bin') };
const failures = [];
const temps = [];

try {
    if (/--enable-unverified-updates/.test(readFileSync(join(REPO_ROOT, '.mozconfig'), 'utf8'))) {
        failures.push('.mozconfig carries --enable-unverified-updates, which compiles every MAR check out');
    }
    const substs = configStatus();
    if (!substs.MOZ_VERIFY_MAR_SIGNATURE) failures.push('objdir/config.status: MOZ_VERIFY_MAR_SIGNATURE is not set');
    const channel = substs.ACCEPTED_MAR_CHANNEL_IDS;
    if (!channel || channel !== substs.MAR_CHANNEL_ID) failures.push(`objdir/config.status: ACCEPTED_MAR_CHANNEL_IDS=${channel} MAR_CHANNEL_ID=${substs.MAR_CHANNEL_ID} -- both must be set and equal`);
    if (!existsSync(CERT)) failures.push(`${CERT} (the public MAR certificate) is absent`);
    if (!existsSync(join(KEY_DB, 'key4.db'))) failures.push(`${KEY_DB}/key4.db is absent -- the fork signing key was never generated (wave E Task 8 Step 1, Chris)`);
    if (!existsSync(KEY_PASSWORD) || readFileSync(KEY_PASSWORD, 'utf8').trim() === '') failures.push(`${KEY_PASSWORD} is absent or empty -- the key store must have a password (R12)`);
    if (failures.length === 0) drive(channel);
} catch (err) {
    failures.push(err.message);
} finally {
    for (const t of temps) rmSync(t, { recursive: true, force: true });
}
if (failures.length) {
    console.error(`${NAME}: FAIL -- ${failures.length} failure(s):\n  ${failures.join('\n  ')}`);
    process.exit(1);
}
console.log(`${NAME}: PASS -- the fork-signed MAR applied; unsigned, foreign-key and wrong-channel MARs were refused`);

function drive(channel) {
    const errs = readFileSync(join(REPO_ROOT, 'upstream/toolkit/mozapps/update/common/updatererrors.h'), 'utf8');
    const code = n => new RegExp(`#define ${n} (\\d+)`).exec(errs)?.[1] ?? fail(`broken instrument: ${n} not in updatererrors.h`);
    const CERT_ERR = code('CERT_VERIFY_ERROR');
    const CHANNEL_ERR = code('MAR_CHANNEL_MISMATCH_ERROR');
    const argVersion = /argv\[1\] = const_cast<char\*>\("(\d+)"\)/.exec(readFileSync(join(REPO_ROOT, 'upstream/toolkit/xre/nsUpdateDriver.cpp'), 'utf8'))?.[1]
        ?? fail('broken instrument: the updater argument version is not in nsUpdateDriver.cpp');
    const work = mkdtempSync(join(tmpdir(), 'ng065-'));
    temps.push(work);
    const payload = extractPackage();
    temps.push(dirname(payload));
    writeFileSync(join(payload, 'ng065-marker.txt'), 'applied\n');
    const run = (cmd, args, env, input) => {
        const r = spawnSync(cmd, args, { env, encoding: 'utf8', timeout: 600000, input });
        if (r.status !== 0) fail(`${cmd} ${args.join(' ')} exited ${r.status}: ${(r.stderr || r.stdout).slice(-600)}`);
    };
    const mar = (name, ch) => {
        const out = join(work, name);
        run('bash', [join(REPO_ROOT, 'upstream/tools/update-packaging/make_full_update.sh'), out, payload],
            { ...process.env, MAR: join(OBJDIR, 'dist/host/bin/mar'), MOZ_PRODUCT_VERSION: builtVersion(), MAR_CHANNEL_ID: ch });
        return out;
    };
    const sign = (db, nick, input, name, password = '') => {
        const out = join(work, name);
        run(join(OBJDIR, 'dist/bin/signmar'), ['-d', db, '-n', nick, '-s', input, out], NSS_ENV, `${password}\n`);
        return out;
    };
    const forkPassword = readFileSync(KEY_PASSWORD, 'utf8').trim();
    const throwaway = join(work, 'throwaway-db');
    mkdirSync(throwaway);
    writeFileSync(join(work, 'noise'), Buffer.alloc(2048, Date.now() % 251));
    run(join(OBJDIR, 'dist/bin/certutil'), ['-N', '-d', throwaway, '--empty-password'], NSS_ENV);
    run(join(OBJDIR, 'dist/bin/certutil'), ['-S', '-d', throwaway, '-z', join(work, 'noise'), '-n', 'ng065-throwaway',
        '-s', 'CN=ng065-throwaway', '-x', '-t', ',,', '-k', 'rsa', '-g', '2048', '-Z', 'SHA384', '-v', '12'], NSS_ENV);
    const unsigned = mar('unsigned.mar', channel);
    const cases = [
        ['fork-signed', sign(KEY_DB, NICK, unsigned, 'good.mar', forkPassword), 'succeeded'],
        ['unsigned', unsigned, `failed: ${CERT_ERR}`],
        ['throwaway-key', sign(throwaway, 'ng065-throwaway', unsigned, 'wrong-key.mar'), `failed: ${CERT_ERR}`],
        ['other-channel', sign(KEY_DB, NICK, mar('other.unsigned.mar', `${channel}-other`), 'wrong-channel.mar', forkPassword), `failed: ${CHANNEL_ERR}`],
    ];
    for (const [label, file, expect] of cases) {
        const install = extractPackage();
        temps.push(dirname(install));
        const patch = mkdtempSync(join(tmpdir(), 'ng065-patch-'));
        temps.push(patch);
        copyFileSync(file, join(patch, 'update.mar'));
        writeFileSync(join(patch, 'update.status'), 'pending\n');
        spawnSync(join(install, 'updater'), [argVersion, patch, install, install, 'first'],
            { env: { ...process.env, LD_LIBRARY_PATH: install }, timeout: 300000 });
        const status = existsSync(join(patch, 'update.status')) ? readFileSync(join(patch, 'update.status'), 'utf8').trim() : '<no update.status>';
        const applied = existsSync(join(install, 'ng065-marker.txt'));
        if (status !== expect) failures.push(`${label} MAR: update.status is "${status}", expected "${expect}"`);
        if (applied !== (expect === 'succeeded')) failures.push(`${label} MAR: the payload ${applied ? 'was' : 'was not'} applied`);
    }
}

function fail(message) { throw new Error(message); }
```

Fails today: `.mozconfig` carries `--enable-unverified-updates`, `config.status` lacks `MOZ_VERIFY_MAR_SIGNATURE`, and neither the certificate nor the key exists.

- [ ] **Step 6: NG-066 check.** `scripts/verify-ng-066-nsis-branding.mjs`:

```js
#!/usr/bin/env node
// scripts/verify-ng-066-nsis-branding.mjs -- NG-066 (wave E): the NSIS installer takes its
// branding from the manifest and sends no Mozilla ping. Reads the PATCHED upstream NSIS
// sources the installer build consumes, with defines.nsi.in's @VAR@ tokens substituted
// from objdir/config.status (the build's own preprocessor inputs) and ${X} expanded from
// the generated branding.nsi (included before defines.nsi, installer.nsi:99-100):
//   - AppName equals application.ini Name (the comment above AppName says it must);
//   - CERTIFICATE_NAME equals the manifest vendor (product.vendor_display);
//   - TELEMETRY_BASE_URL names no Mozilla host;
//   - Function SendPingIfApplicable returns before doing anything.
// Then it runs the installer-build-proof compile over the same patched inputs.
// Tier: full (upstream/, objdir, makensis). Marker: live-main.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { configStatus, REPO_ROOT } from './lib/built-tree.mjs';
import { resolveConfig } from './generate.mjs';

const NAME = 'ng066-nsis-branding-no-ping';
const NSIS = join(REPO_ROOT, 'upstream/browser/installer/windows/nsis');
const failures = [];

const defines = text => Object.fromEntries([...text.matchAll(/^!define\s+(\S+)\s+(?:"([^"]*)"|(\S*))/gm)].map(m => [m[1], m[2] ?? m[3] ?? '']));
const substs = configStatus();
const branding = defines(readFileSync(join(REPO_ROOT, 'generated/branding/dev/branding.nsi'), 'utf8'));
const raw = readFileSync(join(NSIS, 'defines.nsi.in'), 'utf8').replace(/@([A-Z0-9_]+)@/g, (t, k) => (substs[k] ?? t));
const defs = defines(raw);
const expand = v => String(v ?? '').replace(/\$\{(\w+)\}/g, (t, k) => branding[k] ?? t);
const appName = /^Name=(.+)$/m.exec(readFileSync(join(REPO_ROOT, 'objdir/dist/bin/application.ini'), 'utf8'))?.[1]?.trim();
const { config } = resolveConfig(join(REPO_ROOT, 'configuration.toml'), undefined);

if (expand(defs.AppName) !== appName) failures.push(`defines.nsi AppName is ${JSON.stringify(expand(defs.AppName))}; application.ini Name is ${JSON.stringify(appName)}`);
if (expand(defs.CERTIFICATE_NAME) !== config.product.vendor_display) failures.push(`defines.nsi CERTIFICATE_NAME is ${JSON.stringify(expand(defs.CERTIFICATE_NAME))}; the manifest vendor is ${JSON.stringify(config.product.vendor_display)}`);
if (/mozilla\.(org|com|net)/i.test(defs.TELEMETRY_BASE_URL ?? '')) failures.push(`defines.nsi TELEMETRY_BASE_URL is ${defs.TELEMETRY_BASE_URL}`);

const installer = readFileSync(join(NSIS, 'installer.nsi'), 'utf8');
const body = installer.split(/^Function SendPingIfApplicable\s*$/m)[1]?.split(/^FunctionEnd/m)[0];
if (body === undefined) failures.push('broken instrument: installer.nsi has no Function SendPingIfApplicable');
else {
    const first = body.split('\n').map(l => l.trim()).find(l => l && !l.startsWith(';') && !l.startsWith('#'));
    if (!/^Return\b/.test(first ?? '')) failures.push(`installer.nsi SendPingIfApplicable starts with "${first}", not Return -- the installer still pings`);
}

const proof = spawnSync('node', [join(REPO_ROOT, 'scripts/verify-installer-build-proof.mjs')], { encoding: 'utf8' });
if (proof.status !== 0) failures.push(`installer-build-proof is red over the same inputs: ${(proof.stderr || proof.stdout).slice(-500)}`);

if (failures.length) {
    console.error(`${NAME}: FAIL -- ${failures.length} failure(s):\n  ${failures.join('\n  ')}`);
    process.exit(1);
}
console.log(`${NAME}: PASS -- AppName and CERTIFICATE_NAME come from the build and the manifest; no installer ping`);
```

Fails today: `AppName` is `"Firefox"`, `CERTIFICATE_NAME` is `"Mozilla Corporation"`, and the ping function body starts with `ClearErrors`.

- [ ] **Step 7: NG-067 check.** `scripts/verify-ng-067-frontend-errors.mjs`:

```js
#!/usr/bin/env node
// scripts/verify-ng-067-frontend-errors.mjs -- NG-067 (wave E): uncaught frontend errors and
// unhandled rejections reach the telemetry logger, subject to the level setting.
// One live session in the built app:
//   - spies on the DI-bound PowerBrowserTelemetryLogger.logError;
//   - gives the DI-bound sender a recording fetchFn and a placeholder endpoint, so an admitted
//     event is observed without any network;
//   - at level off (the manifest default): throws an uncaught error; the logger must be called
//     and nothing may be sent;
//   - sets telemetry.telemetryLevel = "error" through the DI-bound PreferenceService (a live
//     read, no restart);
//   - throws again and rejects a promise; both events must be sent.
// Tier: full (browser + sidecar). Marker: live-clone.
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withFirefoxPage } from './lib/firefox-bidi.mjs';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'ng067-frontend-errors-reach-telemetry';
const LEVEL_KEY = /TELEMETRY_LEVEL_PREFERENCE\s*=\s*'([^']+)'/.exec(readFileSync(join(REPO_ROOT, 'theia/extensions/telemetry/src/browser/telemetry-preferences.ts'), 'utf8'))?.[1];
const GET_BY_NAME = `
function __getByName(container, name) {
    let found;
    container._bindingDictionary.traverse(key => {
        if (found) return;
        const keyStr = typeof key === 'symbol' ? key.toString() : (key && key.name) || String(key);
        if (keyStr === 'Symbol(' + name + ')' || keyStr === name) found = key;
    });
    if (!found) throw new Error('DI binding not found: ' + name);
    return container.get(found);
}`;
const failures = [];
if (!LEVEL_KEY) failures.push('broken instrument: TELEMETRY_LEVEL_PREFERENCE not found in telemetry-preferences.ts');
process.env.XDG_CONFIG_HOME = mkdtempSync(join(tmpdir(), 'ng067-cfg-'));

if (failures.length === 0) await withFirefoxPage('', async ({ evaluate, waitFor }) => {
    await waitFor('window.theia && window.theia.container ? true : false', { timeoutMs: 90000 });
    await waitFor('!!document.querySelector("#theia-app-shell")', { timeoutMs: 60000 });
    await evaluate(`(() => { ${GET_BY_NAME}
        const c = window.theia.container;
        const logger = __getByName(c, 'PowerBrowserTelemetryLogger');
        const sender = __getByName(c, 'PowerBrowserTelemetrySender');
        window.__ng067 = { logged: [], sent: [], sender, prefs: __getByName(c, 'PreferenceService') };
        const orig = logger.logError.bind(logger);
        logger.logError = (e, d) => { window.__ng067.logged.push(typeof e === 'string' ? e : String(e && e.message)); return orig(e, d); };
        sender.endpoint = 'https://ng067.invalid/collect';
        sender.fetchFn = (url, init) => { window.__ng067.sent.push(String(init.body)); return Promise.resolve({ ok: true }); };
        return 'ok'; })()`);
    const flush = async () => {
        await evaluate(`window.__ng067.flushed = false; window.__ng067.sender.flush().then(() => { window.__ng067.flushed = true; }); 'ok'`);
        await waitFor('window.__ng067.flushed === true', { timeoutMs: 10000 });
    };
    // Level off: reaches the logger, nothing is sent.
    await evaluate(`setTimeout(() => { throw new Error('ng067-at-off'); }, 0); 'ok'`);
    try {
        await waitFor(`window.__ng067.logged.includes('frontend.uncaught-error')`, { timeoutMs: 10000 });
    } catch {
        failures.push('an uncaught error at level off never reached PowerBrowserTelemetryLogger.logError');
    }
    await flush();
    if (JSON.parse(await evaluate('JSON.stringify(window.__ng067.sent)')).length) failures.push('an event was sent at level off');
    // Level error, set at runtime.
    await evaluate(`window.__ng067.prefs.set(${JSON.stringify(LEVEL_KEY)}, 'error', 1); 'ok'`);
    await waitFor(`window.__ng067.prefs.get(${JSON.stringify(LEVEL_KEY)}) === 'error'`, { timeoutMs: 10000 });
    await evaluate(`setTimeout(() => { throw new Error('ng067-at-error'); }, 0); Promise.reject(new Error('ng067-rejection')); 'ok'`);
    try {
        await waitFor(`window.__ng067.logged.filter(n => n === 'frontend.uncaught-error').length >= 2 && window.__ng067.logged.includes('frontend.unhandled-rejection')`, { timeoutMs: 10000 });
    } catch {
        failures.push(`at level error the logger saw only ${await evaluate('JSON.stringify(window.__ng067.logged)')}`);
    }
    await flush();
    const sent = JSON.parse(await evaluate('JSON.stringify(window.__ng067.sent)')).join('\n');
    for (const name of ['frontend.uncaught-error', 'frontend.unhandled-rejection']) {
        if (!sent.includes(name)) failures.push(`at level error no ${name} event was sent`);
    }
});

if (failures.length) {
    console.error(`${NAME}: FAIL -- ${failures.length} failure(s):\n  ${failures.join('\n  ')}`);
    process.exit(1);
}
console.log(`${NAME}: PASS -- both error kinds reach the logger; off sends nothing; error sends both`);
```

Fails today: nothing listens for window errors, so the logger is never called.

- [ ] **Step 8: NG-068 check.** `scripts/verify-ng-068-crash-extra-part.mjs`:

```js
#!/usr/bin/env node
// scripts/verify-ng-068-crash-extra-part.mjs -- NG-068 (wave E): the crash collector accepts
// Gecko's single `extra` annotation part. Starts the REAL collector process on a loopback
// port and posts multipart bodies in the shape Gecko's crash reporter sends; the extra
// part's name, filename and MIME type are read from
// upstream/toolkit/crashreporter/client/app/src/net/report.rs at check time.
//   1. Gecko's shape: annotations arrive in one JSON part; only allowlisted keys are stored.
//   2. A malformed extra part: the report is still accepted; nothing from it is stored.
//   3. Regression: one form field per annotation still works.
// Tier: quick (loopback only). Marker: quick.
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { ANNOTATION_ALLOWLIST } from './crash-collector.mjs';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'ng068-crash-extra-part';
const REPORT_RS = join(REPO_ROOT, 'upstream/toolkit/crashreporter/client/app/src/net/report.rs');
const failures = [];

function geckoExtraShape() {
    if (!existsSync(REPORT_RS)) throw new Error(`broken instrument: ${REPORT_RS} is absent -- run scripts/fetch-upstream.sh`);
    const m = /name:\s*"extra",[\s\S]*?filename:\s*Some\("([^"]+)"\),\s*mime_type:\s*Some\("([^"]+)"\)/.exec(readFileSync(REPORT_RS, 'utf8'));
    if (!m) throw new Error('broken instrument: report.rs no longer declares an `extra` MimePart with filename and mime_type');
    return { filename: m[1], mime: m[2] };
}

function multipart(parts) {
    const boundary = `----ng068${randomBytes(8).toString('hex')}`;
    const chunks = [];
    for (const p of parts) {
        chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${p.name}"${p.filename ? `; filename="${p.filename}"` : ''}\r\n${p.mime ? `Content-Type: ${p.mime}\r\n` : ''}\r\n`));
        chunks.push(Buffer.isBuffer(p.data) ? p.data : Buffer.from(p.data));
        chunks.push(Buffer.from('\r\n'));
    }
    chunks.push(Buffer.from(`--${boundary}--\r\n`));
    return { body: Buffer.concat(chunks), type: `multipart/form-data; boundary=${boundary}` };
}

const freePort = () => new Promise(res => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => res(port)); }); });

async function main() {
    const shape = geckoExtraShape();
    const store = mkdtempSync(join(tmpdir(), 'ng068-store-'));
    const port = await freePort();
    const child = spawn(process.execPath, [join(REPO_ROOT, 'scripts/crash-collector.mjs'), '--port', String(port), '--store', store], { stdio: ['ignore', 'pipe', 'pipe'] });
    try {
        await new Promise((resolve, reject) => {
            const t = setTimeout(() => reject(new Error('the collector did not report listening within 15 s')), 15000);
            child.stdout.on('data', d => { if (String(d).includes('listening at')) { clearTimeout(t); resolve(); } });
            child.on('exit', c => reject(new Error(`the collector exited (${c})`)));
        });
        const post = async parts => {
            const { body, type } = multipart(parts);
            const res = await fetch(`http://127.0.0.1:${port}/submit`, { method: 'POST', headers: { 'Content-Type': type }, body });
            return { status: res.status, text: await res.text() };
        };
        const stored = (label, res, expected) => {
            const id = /^CrashID=(.+)$/.exec(res.text.trim())?.[1];
            if (res.status !== 200 || !id) { failures.push(`${label}: answered ${res.status} ${res.text.trim()}`); return; }
            const record = JSON.parse(readFileSync(join(store, `${id}.json`), 'utf8'));
            if (!isDeepStrictEqual(record.annotations, expected)) failures.push(`${label}: stored ${JSON.stringify(record.annotations)}, expected ${JSON.stringify(expected)}`);
        };
        const dump = { name: 'upload_file_minidump', filename: 'ng068.dmp', mime: 'application/octet-stream', data: randomBytes(512) };
        const extra = { ProductName: 'ng068-product', Version: '1.2.3', BuildID: '20260925000000', ReleaseChannel: 'default', NotAllowlisted: 'must-not-be-stored', URL: 'https://example.org/private' };
        stored('gecko extra part', await post([{ name: 'extra', filename: shape.filename, mime: shape.mime, data: JSON.stringify(extra) }, dump]),
            Object.fromEntries(Object.entries(extra).filter(([k]) => ANNOTATION_ALLOWLIST.includes(k))));
        stored('malformed extra part', await post([{ name: 'extra', filename: shape.filename, mime: shape.mime, data: '{not json' }, dump]), {});
        stored('per-part annotation', await post([{ name: 'ProductName', data: 'ng068-per-part' }, dump]), { ProductName: 'ng068-per-part' });
    } finally {
        child.kill('SIGTERM');
        rmSync(store, { recursive: true, force: true });
    }
}

try { await main(); } catch (err) { failures.push(err.message); }
if (failures.length) {
    console.error(`${NAME}: FAIL -- ${failures.length} failure(s):\n  ${failures.join('\n  ')}`);
    process.exit(1);
}
console.log(`${NAME}: PASS -- Gecko's extra part is read through the allowlist; malformed extra keeps the report`);
```

Fails today: arm 1 stores `{}`.

- [ ] **Step 9: NG-069 check.** `scripts/verify-ng-069-sidecar-egress.mjs`:

```js
#!/usr/bin/env node
// scripts/verify-ng-069-sidecar-egress.mjs -- NG-069 (wave E), run as verify-endpoints.sh
// layer 4: open-vsx.org and the AI provider hosts have allowlist rows, and the egress
// check covers the SIDECAR's traffic (layers 1-3 read Gecko only).
//   Static: the hosts are derived from the tree:
//     - VSX_REGISTRY_URL in powerbrowser/shell/TheiaService.sys.mjs;
//     - the default https://api.* endpoints in the top-level .js files of each non-@theia
//       dependency of every @theia/ai-* package the app composes.
//     Each derived host needs a row.
//   Live: a NODE_OPTIONS preload records every hostname any sidecar Node process resolves
//     (dns.lookup and dns.promises.lookup). The session installs one extension through the
//     DI-bound PluginServer (the backend's Open VSX download). Every recorded host must be
//     covered by a row (exact, or a leading-dot suffix row, as layer 3 matches), and the
//     registry host must have been seen (anti-vacuity).
// Tier: full. Marker: live-clone.
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withFirefoxPage } from './lib/firefox-bidi.mjs';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'ng069-sidecar-egress';
const NM = join(REPO_ROOT, 'theia/node_modules');
const PROBE_EXTENSION = 'vscode:extension/akamud.vscode-theme-onedark';
const failures = [];

const vsx = /VSX_REGISTRY_URL:\s*"([^"]+)"/.exec(readFileSync(join(REPO_ROOT, 'powerbrowser/shell/TheiaService.sys.mjs'), 'utf8'))?.[1];
if (!vsx) failures.push('broken instrument: VSX_REGISTRY_URL is not derivable from TheiaService.sys.mjs');
const derived = new Map(vsx ? [[new URL(vsx).host, 'VSX_REGISTRY_URL (TheiaService.sys.mjs)']] : []);
const app = JSON.parse(readFileSync(join(REPO_ROOT, 'theia/applications/browser/package.json'), 'utf8'));
for (const ai of Object.keys(app.dependencies).filter(d => d.startsWith('@theia/ai-'))) {
    const deps = JSON.parse(readFileSync(join(NM, ai, 'package.json'), 'utf8')).dependencies ?? {};
    for (const sdk of Object.keys(deps).filter(d => !d.startsWith('@theia/') && existsSync(join(NM, d)))) {
        for (const f of readdirSync(join(NM, sdk)).filter(n => n.endsWith('.js'))) {
            for (const m of readFileSync(join(NM, sdk, f), 'utf8').matchAll(/https:\/\/(api\.[a-z0-9.-]+\.[a-z]+)/g)) derived.set(m[1], `${ai} -> ${sdk}/${f}`);
        }
    }
}
if (![...derived.values()].some(v => v.startsWith('@theia/ai-'))) failures.push('broken instrument: no AI provider host derived from the composed @theia/ai-* packages');
const allow = JSON.parse(readFileSync(join(REPO_ROOT, 'powerbrowser/endpoint-allowlist.json'), 'utf8')).hosts;
const covered = h => allow.some(a => a.host === h || (a.host.startsWith('.') && h.endsWith(a.host)));
for (const [h, why] of derived) if (!covered(h)) failures.push(`${h} (${why}) has no endpoint-allowlist row`);

if (failures.length === 0) {
    const dir = mkdtempSync(join(tmpdir(), 'ng069-'));
    const log = join(dir, 'lookups.log');
    const hook = join(dir, 'hook.cjs');
    writeFileSync(hook, `const dns = require('dns'); const fs = require('fs'); const net = require('net');
const rec = h => { if (typeof h === 'string' && h && !net.isIP(h)) { try { fs.appendFileSync(${JSON.stringify(log)}, h + '\\n'); } catch {} } };
const l = dns.lookup; dns.lookup = function (h, ...a) { rec(h); return l.call(this, h, ...a); };
const pl = dns.promises.lookup; dns.promises.lookup = function (h, ...a) { rec(h); return pl.call(this, h, ...a); };
`);
    process.env.NODE_OPTIONS = `${process.env.NODE_OPTIONS ?? ''} --require ${hook}`.trim();
    process.env.XDG_CONFIG_HOME = join(dir, 'xdg');
    await withFirefoxPage('', async ({ evaluate, waitFor }) => {
        await waitFor('window.theia && window.theia.container ? true : false', { timeoutMs: 90000 });
        await evaluate(`(() => {
            let found; const c = window.theia.container;
            c._bindingDictionary.traverse(k => { if (!found && typeof k === 'symbol' && k.toString() === 'Symbol(PluginServer)') found = k; });
            window.__ng069 = 'pending';
            c.get(found).install(${JSON.stringify(PROBE_EXTENSION)}).then(() => { window.__ng069 = 'done'; }, e => { window.__ng069 = 'error: ' + e.message; });
            return 'ok'; })()`);
        await waitFor(`window.__ng069 !== 'pending'`, { timeoutMs: 120000 });
        const outcome = await evaluate('window.__ng069');
        if (outcome !== 'done') failures.push(`the probe install did not complete: ${outcome}`);
    });
    const seen = existsSync(log) ? [...new Set(readFileSync(log, 'utf8').split('\n').filter(Boolean))].filter(h => h !== 'localhost') : [];
    if (!seen.includes(new URL(vsx).host)) failures.push(`instrument: the sidecar never resolved ${new URL(vsx).host} during an extension install -- nothing was observed`);
    for (const h of seen) if (!covered(h)) failures.push(`the sidecar resolved ${h}, which has no endpoint-allowlist row`);
}

if (failures.length) {
    console.error(`verify-endpoints: layer 4 FAIL -- ${failures.length} failure(s):\n  ${failures.join('\n  ')}`);
    process.exit(1);
}
console.log(`verify-endpoints: layer 4 PASS -- every host the sidecar resolved is allowlisted (${NAME})`);
```

Fails today: `open-vsx.org`, `api.anthropic.com` and `api.openai.com` have no rows. The derivation was checked 2026-09-25: `@theia/ai-anthropic` resolves through `@anthropic-ai/sdk/client.js`, and `@theia/ai-openai` through `openai/client.js`.

- [ ] **Step 10: NG-070 check.** `scripts/verify-ng-070-no-spaced-name.mjs`:

```js
#!/usr/bin/env node
// scripts/verify-ng-070-no-spaced-name.mjs -- NG-070 (wave E): no user-visible or generated
// surface shows the spaced product name. Scans the STRING CONTENT of every shipped surface:
//   - string literals, template text and JSX text of theia/extensions/*/src (tests excluded),
//     of powerbrowser/shell/*.{sys.mjs,js}, and of the operator-facing scripts/crash-collector.mjs
//     (TypeScript's parser, so comments are skipped by construction, not by pattern);
//   - value lines of every .ftl/.properties locale file (tracked and generated);
//   - every string value of generated/**/*.json and of the application package.json.
// --self-test plants a literal hit, a comment-only mention, a JSX hit, a locale hit, a JSON
// hit and a clean one-word string, and requires exactly the four hits.
// Tier: quick. Marker: quick.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'ng070-no-spaced-name';
const SPACED = 'Power Browser';
const ts = createRequire(join(REPO_ROOT, 'theia', 'package.json'))('typescript');

export function hitsInCode(file, text) {
    const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : file.endsWith('.ts') ? ts.ScriptKind.TS : ts.ScriptKind.JS;
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
    const hits = [];
    const visit = node => {
        const isText = ts.isStringLiteralLike(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node) || ts.isJsxText(node);
        if (isText && node.text.includes(SPACED)) {
            hits.push(`${file}:${sf.getLineAndCharacterOfPosition(node.getStart()).line + 1}: ${JSON.stringify(node.text.trim().slice(0, 100))}`);
        }
        ts.forEachChild(node, visit);
    };
    visit(sf);
    return hits;
}

export function hitsInLocale(file, text) {
    return text.split('\n').flatMap((l, i) => (!/^\s*#/.test(l) && l.includes(SPACED)) ? [`${file}:${i + 1}: ${JSON.stringify(l.trim())}`] : []);
}

export function hitsInJson(file, text) {
    const hits = [];
    const walk = (v, path) => {
        if (typeof v === 'string') { if (v.includes(SPACED)) hits.push(`${file}: ${path}: ${JSON.stringify(v.slice(0, 100))}`); }
        else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
    };
    walk(JSON.parse(text), '$');
    return hits;
}

function scanTree() {
    const tracked = execFileSync('git', ['-C', REPO_ROOT, 'ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
    const code = tracked.filter(f => (/^theia\/extensions\/[^/]+\/src\/.+\.tsx?$/.test(f) && !/(^|\/)test\/|\.(spec|test)\.tsx?$/.test(f))
        || /^powerbrowser\/shell\/[^/]+\.(sys\.mjs|js)$/.test(f) || f === 'scripts/crash-collector.mjs');
    const locale = tracked.filter(f => /^powerbrowser\/branding\/.+\.(ftl|properties)$/.test(f));
    const json = ['theia/applications/browser/package.json'];
    const gen = join(REPO_ROOT, 'generated');
    if (!existsSync(gen)) throw new Error('generated/ is absent -- run: node scripts/generate.mjs');
    const walk = d => readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]);
    for (const abs of walk(gen)) {
        const rel = relative(REPO_ROOT, abs);
        if (rel.endsWith('.json')) json.push(rel);
        else if (/\.(ftl|properties)$/.test(rel)) locale.push(rel);
    }
    const read = f => readFileSync(join(REPO_ROOT, f), 'utf8');
    return [...code.flatMap(f => hitsInCode(f, read(f))), ...locale.flatMap(f => hitsInLocale(f, read(f))), ...json.flatMap(f => hitsInJson(f, read(f)))];
}

function selfTest() {
    const got = [
        ...hitsInCode('a.ts', `const s = '${SPACED} x';\n// ${SPACED} in a comment\n`),
        ...hitsInCode('b.tsx', `export const X = () => <div>${SPACED} here</div>;\n`),
        ...hitsInLocale('c.ftl', `# ${SPACED} comment\nkey = ${SPACED} value\n`),
        ...hitsInJson('d.json', JSON.stringify({ a: { b: SPACED } })),
        ...hitsInCode('e.ts', `const s = 'PowerBrowser';\n`),
    ];
    const want = ['a.ts:1:', 'b.tsx:1:', 'c.ftl:2:', 'd.json: $.a.b:'];
    if (got.length !== want.length || !want.every((w, i) => got[i].startsWith(w))) {
        console.error(`${NAME} --self-test: FAIL -- planted hits came back as ${JSON.stringify(got)}`);
        process.exit(1);
    }
    console.log(`${NAME} --self-test: PASS -- four planted hits found, the comment and the one-word form ignored`);
}

if (process.argv.includes('--self-test')) selfTest();
else {
    const hits = scanTree();
    if (hits.length) {
        console.error(`${NAME}: FAIL -- ${hits.length} surface(s) show the spaced name:\n  ${hits.join('\n  ')}`);
        process.exit(1);
    }
    console.log(`${NAME}: PASS -- no shipped surface shows the spaced name`);
}
```

Fails today with more than 25 hits; see Q3.

- [ ] **Step 11: NG-071 check.** `scripts/verify-ng-071-tarball-extensions.mjs`:

```js
#!/usr/bin/env node
// scripts/verify-ng-071-tarball-extensions.mjs -- NG-071 (wave E): npm and local-path (.tgz)
// extension sources install through `yarn build` with no files placed by hand.
//   1. Declares one npm entry (chart.js 4.5.1, the 09-04 drill package) and one local-path
//      entry in a fixture manifest (a copy of configuration.toml plus two [[extensions]]
//      tables, pins computed from the real bytes).
//   2. Emits the theiaPlugins block with the generator's own emitter.
//   3. Runs the app's declared download:plugins step with PB_CONFIG_DIR at the fixture.
//      Both archives must land at <plugins>/<id>.tar.gz with their pinned sha256.
//   4. With a wrong local pin, the step must fail naming the entry and install nothing
//      for it.
// Tier: full (npm registry). Marker: live-clone.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { emitTheiaPlugins, npmDistTarballUrl, resolveConfig } from './generate.mjs';
import { runDeclaredPluginStep } from './lib/scratch-app.mjs';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'ng071-tarball-extensions-build';
const sha256 = b => createHash('sha256').update(b).digest('hex');
const failures = [];
const dir = mkdtempSync(join(tmpdir(), 'ng071-'));
const cfg = join(dir, 'cfg');
const steps = [];
try {
    cpSync(join(REPO_ROOT, 'brand'), join(cfg, 'brand'), { recursive: true });
    const local = join(cfg, 'extensions', 'ng071-local');
    mkdirSync(local, { recursive: true });
    writeFileSync(join(local, 'package.json'), JSON.stringify({ name: 'ng071-local', version: '0.0.1', main: 'index.js' }));
    writeFileSync(join(local, 'index.js'), 'module.exports = {};\n');
    const npmBytes = Buffer.from(await (await fetch(npmDistTarballUrl({ id: 'chart.js', version: '4.5.1' }))).arrayBuffer());
    const pack = spawnSync('nix', ['develop', `${REPO_ROOT}#theia`, '--command', 'npm', 'pack', local, '--pack-destination', dir], { encoding: 'utf8' });
    if (pack.status !== 0) throw new Error(`npm pack failed: ${pack.stderr}`);
    const localPin = sha256(readFileSync(join(dir, 'ng071-local-0.0.1.tgz')));
    const manifest = pin => `${readFileSync(join(REPO_ROOT, 'configuration.toml'), 'utf8')}
[[extensions]]
id = "chart.js"
source = "npm"
version = "4.5.1"
integrity = "sha512-${createHash('sha512').update(npmBytes).digest('base64')}"
sha256 = "${sha256(npmBytes)}"

[[extensions]]
id = "ng071.local"
source = "local-path"
path = "extensions/ng071-local"
sha256 = "${pin}"
`;
    writeFileSync(join(cfg, 'configuration.toml'), manifest(localPin));
    const { failures: rf, config } = resolveConfig(join(cfg, 'configuration.toml'), undefined);
    if (rf.length) throw new Error(`fixture manifest does not resolve: ${rf.join('; ')}`);
    const block = JSON.parse(emitTheiaPlugins(config, { id: 'dev' }));

    const good = runDeclaredPluginStep(block, { PB_CONFIG_DIR: cfg });
    steps.push(good);
    if (good.status !== 0) failures.push(`the declared plugin step exited ${good.status}: ${good.output.slice(-800)}`);
    for (const [id, pin] of [['chart.js', sha256(npmBytes)], ['ng071.local', localPin]]) {
        const f = join(good.pluginsDir, `${id}.tar.gz`);
        if (!existsSync(f)) failures.push(`${id}: the build placed no ${id}.tar.gz`);
        else if (sha256(readFileSync(f)) !== pin) failures.push(`${id}: the placed archive does not hash to its pin`);
    }

    writeFileSync(join(cfg, 'configuration.toml'), manifest('0'.repeat(64)));
    const bad = runDeclaredPluginStep(block, { PB_CONFIG_DIR: cfg });
    steps.push(bad);
    if (bad.status === 0) failures.push('a wrong local-path pin did not fail the plugin step');
    if (!bad.output.includes('ng071.local')) failures.push('the pin failure does not name the entry ng071.local');
    if (existsSync(join(bad.pluginsDir, 'ng071.local.tar.gz'))) failures.push('the mismatched archive was installed anyway');
} catch (err) {
    failures.push(err.message);
} finally {
    for (const s of steps) s.cleanup();
    rmSync(dir, { recursive: true, force: true });
}
if (failures.length) {
    console.error(`${NAME}: FAIL -- ${failures.length} failure(s):\n  ${failures.join('\n  ')}`);
    process.exit(1);
}
console.log(`${NAME}: PASS -- npm and local-path archives install at their pins through the build's plugin step; a bad pin fails it`);
```

Fails today: the stock `theia download:plugins` rejects `.tgz` URLs as an unsupported file type (`@theia/cli` `download-plugins.js:144-154`).

- [ ] **Step 12: NG-072 check.** `scripts/verify-ng-072-policies-webextension.mjs`:

```js
#!/usr/bin/env node
// scripts/verify-ng-072-policies-webextension.mjs -- NG-072 (wave E): policies.json is
// packaged, and a WebExtension declared in it installs and loads.
//   1. The extracted Linux package must carry distribution/policies.json, byte-equal to the
//      tracked powerbrowser/distribution/policies.json.
//   2. A fixture WebExtension is declared in the extracted copy's policy (force_installed,
//      file:// install_url). The PACKAGED binary is launched headless on a fresh profile,
//      and the extension's background script must call a loopback probe.
// Tier: full. Marker: live-main.
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { extractPackage, REPO_ROOT } from './lib/built-tree.mjs';
import { resolveConfig } from './generate.mjs';

const NAME = 'ng072-policies-packaged-webextension';
const ID = 'ng072-probe@powerbrowser.test';
const failures = [];
const { config } = resolveConfig(join(REPO_ROOT, 'configuration.toml'), undefined);
const userPref = (k, v) => `user_pref(${JSON.stringify(k)}, ${JSON.stringify(v)});\n`;
let prefix;
const dir = mkdtempSync(join(tmpdir(), 'ng072-'));
try {
    prefix = extractPackage();
    const packaged = join(prefix, 'distribution', 'policies.json');
    const tracked = readFileSync(join(REPO_ROOT, 'powerbrowser/distribution/policies.json'));
    if (!existsSync(packaged)) throw new Error('the package carries no distribution/policies.json');
    if (!readFileSync(packaged).equals(tracked)) failures.push('the packaged distribution/policies.json differs from powerbrowser/distribution/policies.json');

    let hit = false;
    const server = createServer((req, res) => { if (req.url === '/ng072-loaded') hit = true; res.end('ok'); });
    await new Promise(r => server.listen(0, '127.0.0.1', r));
    const port = server.address().port;
    const src = join(dir, 'xpi');
    mkdirSync(src);
    writeFileSync(join(src, 'manifest.json'), JSON.stringify({ manifest_version: 2, name: 'ng072 probe', version: '1.0',
        browser_specific_settings: { gecko: { id: ID } }, background: { scripts: ['bg.js'] }, permissions: [`http://127.0.0.1:${port}/*`] }));
    writeFileSync(join(src, 'bg.js'), `fetch('http://127.0.0.1:${port}/ng072-loaded');\n`);
    const xpi = join(dir, 'ng072.xpi');
    execFileSync('python3', ['-c', 'import os,sys,zipfile; z=zipfile.ZipFile(sys.argv[1],"w"); [z.write(os.path.join(sys.argv[2],f),f) for f in os.listdir(sys.argv[2])]; z.close()', xpi, src]);
    const policy = JSON.parse(readFileSync(packaged, 'utf8'));
    policy.policies.ExtensionSettings = { ...(policy.policies.ExtensionSettings ?? {}), [ID]: { installation_mode: 'force_installed', install_url: `file://${xpi}` } };
    writeFileSync(packaged, JSON.stringify(policy, null, 2));
    const profile = join(dir, 'profile');
    mkdirSync(profile);
    writeFileSync(join(profile, 'user.js'), userPref('xpinstall.signatures.required', false));
    const browser = spawn(join(prefix, config.identity.binary_name), ['--headless', '--no-remote', '--profile', profile, 'about:blank'],
        { env: { ...process.env, XDG_CONFIG_HOME: join(dir, 'xdg') }, stdio: 'ignore', detached: true });
    const deadline = Date.now() + 90000;
    while (!hit && Date.now() < deadline) await new Promise(r => setTimeout(r, 500));
    try { process.kill(-browser.pid, 'SIGTERM'); } catch { /* gone */ }
    server.close();
    if (!hit) failures.push('the WebExtension declared in the packaged policies.json did not load within 90 s (its loopback probe was never called)');
} catch (err) {
    failures.push(err.message);
} finally {
    if (prefix) rmSync(dirname(prefix), { recursive: true, force: true });
    rmSync(dir, { recursive: true, force: true });
}
if (failures.length) {
    console.error(`${NAME}: FAIL -- ${failures.length} failure(s):\n  ${failures.join('\n  ')}`);
    process.exit(1);
}
console.log(`${NAME}: PASS -- policies.json is packaged and a policy-declared WebExtension loads`);
```

Fails today: the existing tarball has no `distribution/` directory (checked 2026-09-25).

- [ ] **Step 13: NG-073 check.** `scripts/verify-ng-073-declared-extension-loads.mjs`:

```js
#!/usr/bin/env node
// scripts/verify-ng-073-declared-extension-loads.mjs -- NG-073 (wave E): a declared Theia
// extension loads in the built app (EXT-01).
//   1. Builds a fixture VS Code extension (.vsix) whose activate() writes a marker file,
//      and serves it on loopback.
//   2. Declares it in a scratch copy of the app package.json (theiaPlugins).
//   3. Runs the app's declared download:plugins step.
//   4. Launches the browser and the built sidecar with that plugins folder (THEIA_PLUGINS,
//      read by Theia's plugin deployer) and waits for the marker.
// May pass on the current code -- see questions-wave-e.md Q8.
// Tier: full. Marker: live-clone.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { withFirefoxPage } from './lib/firefox-bidi.mjs';
import { runDeclaredPluginStep } from './lib/scratch-app.mjs';

const NAME = 'ng073-declared-extension-loads';
const failures = [];
const dir = mkdtempSync(join(tmpdir(), 'ng073-'));
const marker = join(dir, 'activated');
let step;
const server = createServer((req, res) => { res.setHeader('Content-Type', 'application/octet-stream'); res.end(readFileSync(join(dir, 'probe.vsix'))); });
try {
    const ext = join(dir, 'src', 'extension');
    mkdirSync(ext, { recursive: true });
    writeFileSync(join(ext, 'package.json'), JSON.stringify({ name: 'ng073-probe', publisher: 'powerbrowser-test', version: '0.0.1',
        engines: { vscode: '^1.50.0' }, activationEvents: ['*'], main: './extension.js' }));
    writeFileSync(join(ext, 'extension.js'), `exports.activate = () => require('fs').writeFileSync(${JSON.stringify(marker)}, 'activated');\nexports.deactivate = () => {};\n`);
    writeFileSync(join(dir, 'src', 'extension.vsixmanifest'), '<?xml version="1.0" encoding="utf-8"?><PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011"><Metadata><Identity Id="ng073-probe" Version="0.0.1" Publisher="powerbrowser-test"/><DisplayName>ng073 probe</DisplayName></Metadata><Installation><InstallationTarget Id="Microsoft.VisualStudio.Code"/></Installation><Assets><Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json"/></Assets></PackageManifest>');
    writeFileSync(join(dir, 'src', '[Content_Types].xml'), '<?xml version="1.0" encoding="utf-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="json" ContentType="application/json"/><Default Extension="js" ContentType="application/javascript"/><Default Extension="vsixmanifest" ContentType="text/xml"/></Types>');
    execFileSync('python3', ['-c', 'import os,sys,zipfile\nz=zipfile.ZipFile(sys.argv[1],"w")\nfor r,_,fs in os.walk(sys.argv[2]):\n  [z.write(os.path.join(r,f), os.path.relpath(os.path.join(r,f), sys.argv[2])) for f in fs]\nz.close()', join(dir, 'probe.vsix'), join(dir, 'src')]);
    await new Promise(r => server.listen(0, '127.0.0.1', r));
    step = runDeclaredPluginStep({ 'powerbrowser-test.ng073-probe': `http://127.0.0.1:${server.address().port}/ng073-probe-0.0.1.vsix` });
    if (step.status !== 0) throw new Error(`the declared plugin step exited ${step.status}: ${step.output.slice(-800)}`);
    process.env.THEIA_PLUGINS = `local-dir:${step.pluginsDir}`;
    process.env.XDG_CONFIG_HOME = join(dir, 'xdg');
    await withFirefoxPage('', async ({ waitFor }) => {
        await waitFor('window.theia && window.theia.container ? true : false', { timeoutMs: 90000 });
        const deadline = Date.now() + 60000;
        while (!existsSync(marker) && Date.now() < deadline) await new Promise(r => setTimeout(r, 500));
    });
    if (!existsSync(marker)) failures.push('the declared extension never activated in the built app (no marker within 60 s of a ready workbench)');
} catch (err) {
    failures.push(err.message);
} finally {
    server.close();
    step?.cleanup();
    rmSync(dir, { recursive: true, force: true });
}
if (failures.length) {
    console.error(`${NAME}: FAIL -- ${failures.length} failure(s):\n  ${failures.join('\n  ')}`);
    process.exit(1);
}
console.log(`${NAME}: PASS -- a declared extension was downloaded by the build's plugin step and activated`);
```

- [ ] **Step 14: NG-074 check.** `scripts/verify-ng-074-ci-main.mjs`:

```js
#!/usr/bin/env node
// scripts/verify-ng-074-ci-main.mjs -- NG-074 (wave E): the CI verify workflow passes on main.
// Asks GitHub (gh) for the .github/workflows/verify.yml runs on the commit local `main`
// points at, and requires one completed with conclusion success. --self-test runs the
// verdict over planted run sets.
// Tier: full (network, gh auth); the self-test is quick. Marker: live-main -- green only
// after main is pushed (Chris).
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'ng074-ci-green-on-main';

export function verdict(runs, sha) {
    const mine = runs.filter(r => r.headSha === sha);
    if (mine.length === 0) return `no verify.yml run exists for main at ${sha} -- push main (Chris) and wait for the run`;
    const done = mine.filter(r => r.status === 'completed');
    if (done.length === 0) return `the verify.yml run for ${sha} has not completed`;
    if (!done.some(r => r.conclusion === 'success')) return `the verify.yml run for ${sha} concluded ${done.map(r => r.conclusion).join(', ')} -- read it: gh run view <id> --log-failed`;
    return null;
}

if (process.argv.includes('--self-test')) {
    const sha = 'a'.repeat(40);
    const cases = [
        ['no run', [], true],
        ['other commit only', [{ headSha: 'b'.repeat(40), status: 'completed', conclusion: 'success' }], true],
        ['in progress', [{ headSha: sha, status: 'in_progress', conclusion: '' }], true],
        ['failed', [{ headSha: sha, status: 'completed', conclusion: 'failure' }], true],
        ['green', [{ headSha: sha, status: 'completed', conclusion: 'success' }], false],
    ];
    const wrong = cases.filter(([, runs, red]) => (verdict(runs, sha) !== null) !== red).map(([l]) => l);
    if (wrong.length) { console.error(`${NAME} --self-test: FAIL -- wrong verdict for: ${wrong.join(', ')}`); process.exit(1); }
    console.log(`${NAME} --self-test: PASS -- every planted run set gave the expected verdict`);
} else {
    const sha = execFileSync('git', ['-C', REPO_ROOT, 'rev-parse', 'main'], { encoding: 'utf8' }).trim();
    const runs = JSON.parse(execFileSync('gh', ['run', 'list', '--workflow', 'verify.yml', '--branch', 'main', '--commit', sha,
        '--json', 'headSha,status,conclusion', '--limit', '20'], { cwd: REPO_ROOT, encoding: 'utf8' }));
    const v = verdict(runs, sha);
    if (v) { console.error(`${NAME}: FAIL -- ${v}`); process.exit(1); }
    console.log(`${NAME}: PASS -- verify.yml concluded success on main at ${sha}`);
}
```

Fails today: main is at `b3f95b7` or later. The last verify run, `34911771311`, was on `b9412fa` and failed 15 rows.

- [ ] **Step 15: Register the checks.** In `scripts/verify-platform.sh`, add three blocks.

Quick rows go directly after the row `"crash-collector-self-test|node $REPO_ROOT/scripts/verify-crash-collector.mjs --self-test"`:

```bash
    # --- non-GUI wave E (NG-068, NG-070, NG-074): quick rows. No build, no browser,
    # no display; ng068 binds a loopback port only and reads upstream/'s report.rs.
    "ng068-crash-extra-part|node $REPO_ROOT/scripts/verify-ng-068-crash-extra-part.mjs"
    "ng070-no-spaced-name|node $REPO_ROOT/scripts/verify-ng-070-no-spaced-name.mjs"
    "ng070-no-spaced-name-self-test|node $REPO_ROOT/scripts/verify-ng-070-no-spaced-name.mjs --self-test"
    "ng074-ci-green-on-main-self-test|node $REPO_ROOT/scripts/verify-ng-074-ci-main.mjs --self-test"
```

Full-tier rows go directly after the row `"installer-build-proof|node $REPO_ROOT/scripts/verify-installer-build-proof.mjs"` (inside `if [ "$QUICK" -eq 0 ]`):

```bash
      # --- non-GUI wave E (NG-051, NG-063..NG-067, NG-069, NG-071..NG-074): each needs a
      # Gecko build, the packaged tree, the built sidecar, a browser, or the network.
      # Commands and live-main/live-clone markers: docs/non-gui/checks-wave-e.tsv.
      "ng051-backend-off|node $REPO_ROOT/scripts/verify-ng-051-backend-off.mjs"
      "ng063-packaged-launch|node $REPO_ROOT/scripts/verify-ng-063-packaged-launch.mjs"
      "ng064-update-url-from-manifest|node $REPO_ROOT/scripts/verify-ng-064-update-url.mjs"
      "ng065-mar-signature-enforced|node $REPO_ROOT/scripts/verify-ng-065-mar-signature.mjs"
      "ng066-nsis-branding-no-ping|node $REPO_ROOT/scripts/verify-ng-066-nsis-branding.mjs"
      "ng067-frontend-errors-reach-telemetry|node $REPO_ROOT/scripts/verify-ng-067-frontend-errors.mjs"
      "ng069-sidecar-egress|node $REPO_ROOT/scripts/verify-ng-069-sidecar-egress.mjs"
      "ng071-tarball-extensions-build|node $REPO_ROOT/scripts/verify-ng-071-tarball-extensions.mjs"
      "ng072-policies-packaged-webextension|node $REPO_ROOT/scripts/verify-ng-072-policies-webextension.mjs"
      "ng073-declared-extension-loads|node $REPO_ROOT/scripts/verify-ng-073-declared-extension-loads.mjs"
      "ng074-ci-green-on-main|node $REPO_ROOT/scripts/verify-ng-074-ci-main.mjs"
```

In `scripts/verify-endpoints.sh`, make the argument check that accepts `1|2|3` also accept `4`. Update the `--help` text to "`--layer 1|2|3|4`". Then, right after argument parsing and before any layer runs, add:

```bash
# Layer 4 (NG-069): the sidecar's own egress. Runs through node, not the MOZ_LOG path, and
# carries its positive control inline (the registry host must be observed), so
# --positive-control does not apply to it.
if [ "$LAYER_ARG" = "4" ]; then
  if [ "$DO_CONTROL" -eq 1 ]; then echo "verify-endpoints: FAIL -- --positive-control does not apply to layer 4 (its control is inline)" >&2; exit 1; fi
  exec node "$REPO_ROOT/scripts/verify-ng-069-sidecar-egress.mjs"
fi
```

- [ ] **Step 16: Write the TSV (R1).** Each line has three tab-separated fields:
  1. `NG-NNN`
  2. the test ref `scripts/verify-ng-NNN-<slug>.mjs::<label>`
  3. a command that runs that same file, followed by the tier as a trailing shell comment (inert when the kit runs the command)

```bash
printf '%s\t%s\t%s\n' \
 NG-051 scripts/verify-ng-051-backend-off.mjs::ng051-backend-off 'node scripts/verify-ng-051-backend-off.mjs # live-clone' \
 NG-063 scripts/verify-ng-063-packaged-launch.mjs::ng063-packaged-launch 'node scripts/verify-ng-063-packaged-launch.mjs # live-main' \
 NG-064 scripts/verify-ng-064-update-url.mjs::ng064-update-url-from-manifest 'node scripts/verify-ng-064-update-url.mjs # live-main' \
 NG-065 scripts/verify-ng-065-mar-signature.mjs::ng065-mar-signature-enforced 'node scripts/verify-ng-065-mar-signature.mjs # live-main' \
 NG-066 scripts/verify-ng-066-nsis-branding.mjs::ng066-nsis-branding-no-ping 'node scripts/verify-ng-066-nsis-branding.mjs # live-main' \
 NG-067 scripts/verify-ng-067-frontend-errors.mjs::ng067-frontend-errors-reach-telemetry 'node scripts/verify-ng-067-frontend-errors.mjs # live-clone' \
 NG-068 scripts/verify-ng-068-crash-extra-part.mjs::ng068-crash-extra-part 'node scripts/verify-ng-068-crash-extra-part.mjs # quick' \
 NG-069 scripts/verify-ng-069-sidecar-egress.mjs::ng069-sidecar-egress 'node scripts/verify-ng-069-sidecar-egress.mjs # live-clone' \
 NG-070 scripts/verify-ng-070-no-spaced-name.mjs::ng070-no-spaced-name 'node scripts/verify-ng-070-no-spaced-name.mjs # quick' \
 NG-071 scripts/verify-ng-071-tarball-extensions.mjs::ng071-tarball-extensions-build 'node scripts/verify-ng-071-tarball-extensions.mjs # live-clone' \
 NG-072 scripts/verify-ng-072-policies-webextension.mjs::ng072-policies-packaged-webextension 'node scripts/verify-ng-072-policies-webextension.mjs # live-main' \
 NG-073 scripts/verify-ng-073-declared-extension-loads.mjs::ng073-declared-extension-loads 'node scripts/verify-ng-073-declared-extension-loads.mjs # live-clone' \
 NG-074 scripts/verify-ng-074-ci-main.mjs::ng074-ci-green-on-main 'node scripts/verify-ng-074-ci-main.mjs # live-main' \
 > docs/non-gui/checks-wave-e.tsv
awk -F'\t' 'NF != 3 { print "bad field count, line " NR; bad=1 }
  { split($2, ref, "::"); if (index($3, ref[1]) == 0 || $3 !~ / # (live-main|live-clone|quick)$/) { print "command does not carry " ref[1] " and a tier, line " NR; bad=1 } }
  END { exit bad }' docs/non-gui/checks-wave-e.tsv && wc -l docs/non-gui/checks-wave-e.tsv
```

Expected: `13 docs/non-gui/checks-wave-e.tsv`, and no complaint lines. Each label in field 2 equals the check's `verify-platform.sh` registry label.

- [ ] **Step 17: Run every check and confirm each fails for its stated reason.**

In the clone, run the quick rows and the `live-clone` rows. The live-clone rows run under the lock with the G4 overrides:

```bash
for l in ng068-crash-extra-part ng070-no-spaced-name; do scripts/verify-platform.sh --only $l; echo "$l exit $?"; done
scripts/verify-platform.sh --only ng070-no-spaced-name-self-test && scripts/verify-platform.sh --only ng074-ci-green-on-main-self-test
export PB_FIREFOX_BIN=$HOME/coding/Power-Browser/objdir/dist/bin/powerbrowser PB_BACKEND_MAIN=$PWD/theia/applications/browser/lib/backend/main.js
test -z "$(git -C ~/coding/Power-Browser status --short)"
for l in ng051-backend-off ng067-frontend-errors-reach-telemetry ng069-sidecar-egress ng071-tarball-extensions-build ng073-declared-extension-loads; do
  flock ~/coding/Power-Browser/.git/pb-live.lock scripts/verify-platform.sh --only $l; echo "$l exit $?"; done
```

Expected results:
- Every NG row exits 1 with the reason given under its step.
- Both self-tests exit 0.
- If `ng073-declared-extension-loads` exits 0, add the output to Q8 in `docs/non-gui/questions-wave-e.md`. Do not weaken or change the check.

The `live-main` rows are `ng063`, `ng064`, `ng065`, `ng066`, `ng072` and `ng074`. They read main's `objdir/`, `upstream/` and the packaged tree. The controller records them in main (program Task 8 Step 2). Report them as `live-main pending`.

- [ ] **Step 18: Commit gate and commit.**

```bash
git add scripts/lib/built-tree.mjs scripts/lib/scratch-app.mjs scripts/verify-ng-0*.mjs scripts/verify-platform.sh scripts/verify-endpoints.sh docs/non-gui/checks-wave-e.tsv
node scripts/scan-brand-residue.mjs
# Run the Global Constraints commit-gate command. Expected output: exactly ng068-crash-extra-part and ng070-no-spaced-name.
git commit -m "test(ng-e): failing checks for NG-051 and NG-063..NG-074" -m "Refs: NG-051, NG-063, NG-064, NG-065, NG-066, NG-067, NG-068, NG-069, NG-070, NG-071, NG-072, NG-073, NG-074"
```

---

### Task 2: The opencode adapter leaves the default build; nothing starts when off (NG-051)

**Rows:** NG-051 (with D2(b): `backend = "off"` is the `configuration.toml` default, and the adapter is not an app dependency unless the manifest selects it; the adapter's source stays).

**Files:**
- Modify:
  - `theia/applications/browser/package.json` (remove the dependency line)
  - `configuration.toml` (the `[ai]` comment)
  - `scripts/verify-platform.sh` (the ai-opencode rows become the held block, R9)
  - `docs/ai-opencode-adapter.md` ("Turning it on or off", R14)
  - `docs/REBRANDING.md` (the `ai.backend` row, R14)

**Interfaces:**
- Consumes: `ng051-backend-off` (Task 1).
- Produces: the shell function `adapter_composed` (exit 0 when the app depends on `@powerbrowser/backend-opencode`), and the registry row `ai-opencode-held|check_ai_opencode_held`.

Verified facts:
- `configuration.toml:115-116` already sets `[ai] backend = "off"`, and `emitAiBackend` resolves an unset value to `off` (`generate.mjs:2041-2057`). No manifest value changes.
- The only reference to the adapter outside its own directory is `theia/applications/browser/package.json:39`.
- The frontend module already binds nothing when the key is off (`backend-opencode-frontend-module.ts:26`). The backend module binds unconditionally (`backend-opencode-backend-module.ts:17-27`). Taking the package out of the app's dependencies stops both halves from being composed.
- The backend-module gate is skipped. `ng051-backend-off` already enforces, statically, that the adapter is a dependency exactly when the manifest selects it. Add the gate if the adapter ever returns to the default build.

- [ ] **Step 1: Confirm the check is red.** Run `scripts/verify-platform.sh --only ng051-backend-off`. Expected: FAIL `… is a dependency of theia/applications/browser while [ai] backend is "off" …`.

- [ ] **Step 2: Remove the dependency.** In `theia/applications/browser/package.json`, delete the line `"@powerbrowser/backend-opencode": "0.1.0",`. Leave `"powerbrowserAiBackend": "off"` unchanged. The workspace root `theia/package.json` still builds the extension (`build:extensions`), so its source keeps compiling.

- [ ] **Step 3: Update the `[ai]` comment in `configuration.toml`.** Replace lines 109–114 with:

```toml
# AI backend selection (16-03, SPEC R4; retired from the default build by
# non-GUI decision D2(b)). backend names the chat backend the sidecar
# registers: "off" registers none, "opencode" registers @OpenCode. It
# defaults to off: an unset backend resolves to off with the standard D-08
# default-echo. Turning it on takes three edits: set backend = "opencode",
# run `node scripts/generate.mjs` and copy powerbrowserAiBackend over, and
# add "@powerbrowser/backend-opencode": "0.1.0" to the dependencies of
# theia/applications/browser/package.json. The ng051-backend-off check
# requires the dependency exactly when this value is "opencode".
```

- [ ] **Step 4: Replace the ai-opencode registry rows with the held block.**

In `scripts/verify-platform.sh`:

1. Delete the six rows and their comment blocks from the quick `CHECKS=(` array: `ai-opencode-tracer`, `ai-opencode-tracer-self-test`, `ai-opencode-presets`, `ai-opencode-presets-self-test`, `ai-opencode-bridge` and `ai-opencode-bridge-self-test`. They are the last six entries before the array's closing `)`.
2. Directly after that closing `)`, and before `if [ "$QUICK" -eq 0 ]; then`, add:

```bash
  # NG-051 / D2(b): the opencode adapter is composed only when the application
  # package.json depends on @powerbrowser/backend-opencode. Its six rows test the
  # composed adapter (the bridge row boots the backend and requires /mcp; the tracer
  # row needs a live opencode account), so they run exactly when it is composed.
  # Otherwise ai-opencode-held runs in their place: it passes only while the
  # adapter is truly absent, and it names the held rows on every run (non-GUI ruling R9).
  if adapter_composed; then
    CHECKS+=(
      "ai-opencode-tracer|node $REPO_ROOT/scripts/verify-opencode-tracer.mjs"
      "ai-opencode-tracer-self-test|node $REPO_ROOT/scripts/verify-opencode-tracer.mjs --self-test"
      "ai-opencode-presets|node $REPO_ROOT/scripts/verify-opencode-presets.mjs"
      "ai-opencode-presets-self-test|node $REPO_ROOT/scripts/verify-opencode-presets.mjs --self-test"
      "ai-opencode-bridge|node $REPO_ROOT/scripts/verify-opencode-bridge.mjs"
      "ai-opencode-bridge-self-test|node $REPO_ROOT/scripts/verify-opencode-bridge.mjs --self-test"
    )
  else
    CHECKS+=("ai-opencode-held|check_ai_opencode_held")
  fi
```

3. Add the two functions next to the other `check_*` functions, for example directly above `check_allowlist_schema()`:

```bash
# NG-051: exit 0 when the application package.json composes the opencode adapter.
adapter_composed() {
  node -e 'const p = require(process.argv[1]); process.exit(p.dependencies && p.dependencies["@powerbrowser/backend-opencode"] ? 0 : 1)' \
    "$THEIA_DIR/applications/browser/package.json"
}

check_ai_opencode_held() {
  if adapter_composed; then
    echo "ai-opencode-held: FAIL -- the adapter is composed, so its six rows must run instead of this one" >&2
    return 1
  fi
  echo "ai-opencode-held: PASS -- the opencode adapter is not in the default build ([ai] backend = \"off\"); held rows: ai-opencode-tracer, ai-opencode-tracer-self-test, ai-opencode-presets, ai-opencode-presets-self-test, ai-opencode-bridge, ai-opencode-bridge-self-test. To run them: set [ai] backend = \"opencode\", regenerate, copy powerbrowserAiBackend over, add the @powerbrowser/backend-opencode dependency, yarn build, then scripts/verify-platform.sh --quick."
}
```

- [ ] **Step 5: Rebuild and prove the row.**

```bash
nix develop .#theia --command bash -c 'cd theia && yarn build'
scripts/verify-platform.sh --only ai-opencode-held
flock ~/coding/Power-Browser/.git/pb-live.lock scripts/verify-platform.sh --only ng051-backend-off
```

Expected: both print PASS. `ng051` reports no opencode spawn and `/mcp` 404.

- [ ] **Step 6: Negative control (call site).** Put the dependency line back temporarily and rebuild. Then run `ng051-backend-off`. Expected: FAIL naming the dependency. The live half also reports the fake `opencode` spawn, or `/mcp` not 404. Remove the line again and rebuild.

- [ ] **Step 7: Update the docs this task makes stale (R14).**

In `docs/ai-opencode-adapter.md`:
1. Replace the sentence "The backend is **off by default**. One manifest edit turns it on:" with: "The backend is **off by default**, and since non-GUI decision D2(b) the adapter is not part of the default build. Turning it on takes these steps:"
2. Insert a new step 4, after step 3 (the `powerbrowserAiBackend` copy-over), and renumber the old step 4 as 5:
   ```markdown
   4. Compose the adapter: add `"@powerbrowser/backend-opencode": "0.1.0"` to the
      `dependencies` of `theia/applications/browser/package.json`. The
      `ng051-backend-off` check requires this dependency exactly when the
      backend is `"opencode"`, and `scripts/verify-platform.sh` runs the six
      `ai-opencode-*` rows only while it is present (otherwise
      `ai-opencode-held` stands in).
   ```
3. Replace "To turn it back off, set both values to `"off"` and rebuild." with: "To turn it back off, set both values to `"off"`, remove the dependency, and rebuild. With the backend off, no opencode process starts and the sidecar has no `/mcp` endpoint."

In `docs/REBRANDING.md`, in the `ai.backend` row (line 303), replace the "Reaches" cell with:

> `generated/ai-backend.json` backend (one of off, opencode); the `powerbrowserAiBackend` key of the application package.json. `opencode` also needs the `@powerbrowser/backend-opencode` dependency added there (docs/ai-opencode-adapter.md). When off, the adapter is not composed, so no opencode process and no `/mcp` endpoint start.

Run `scripts/verify-platform.sh --only verify-rebranding-docs` and `--only verify-rebranding-docs-self-test`. Expected: PASS.

- [ ] **Step 8: Commit gate and commit.**

```bash
git add theia/applications/browser/package.json configuration.toml scripts/verify-platform.sh docs/ai-opencode-adapter.md docs/REBRANDING.md
node scripts/scan-brand-residue.mjs
# Run the commit-gate command. ai-opencode-tracer leaves the run (held); expected output: ng068-crash-extra-part, ng070-no-spaced-name only.
git commit -m "feat(ng-e): take the opencode adapter out of the default build; nothing starts when off" -m "Refs: NG-051"
```

---

### Task 3: The crash collector reads Gecko's `extra` part (NG-068)

**Rows:** NG-068.

**Files:**
- Modify: `scripts/crash-collector.mjs`, the constants block and `handleSubmit`, lines ~56 and ~245–275

**Interfaces:**
- Consumes: `ng068-crash-extra-part` (Task 1).
- Produces: `export const EXTRA_PART_NAME = 'extra'`.

- [ ] **Step 1: Confirm red.** Run `scripts/verify-platform.sh --only ng068-crash-extra-part`. Expected: FAIL `gecko extra part: stored {} …`.

- [ ] **Step 2: Add the constant** after `MINIDUMP_PART_NAME`:

```js
/** Gecko's crash reporter sends every annotation in ONE JSON part with this name (report.rs). */
export const EXTRA_PART_NAME = 'extra';
```

- [ ] **Step 3: Replace the annotation loop in `handleSubmit`.** Replace the lines from `const annotations = {};` up to the loop's closing `}` with:

```js
    const annotations = {};
    const take = (key, value) => {
        if (!ANNOTATION_ALLOWLIST.includes(key)) return;
        const text = typeof value === 'string' ? value : JSON.stringify(value);
        if (Buffer.byteLength(text, 'utf8') > MAX_ANNOTATION_BYTES) return;
        annotations[key] = text;
    };
    for (const part of parsed.parts) {
        if (part.name === MINIDUMP_PART_NAME) continue;
        if (part.name === EXTRA_PART_NAME) {
            // Gecko's shape (NG-068): one JSON object carries every annotation. The same
            // allowlist and size cap apply per key. A malformed extra part costs its
            // annotations, never the report.
            let extra = null;
            try { extra = JSON.parse(part.data.toString('utf8')); } catch { extra = null; }
            if (extra && typeof extra === 'object' && !Array.isArray(extra)) {
                for (const [key, value] of Object.entries(extra)) take(key, value);
            } else {
                diagnose(`${NAME}: the extra part is not a JSON object -- its annotations were dropped, the report was kept`);
            }
            continue;
        }
        if (part.data.length > MAX_ANNOTATION_BYTES) continue;
        take(part.name, part.data.toString('utf8'));
    }
```

- [ ] **Step 4: Prove.** Run `scripts/verify-platform.sh --only ng068-crash-extra-part`, `--only crash-collector` and `--only crash-collector-self-test`. Expected: all three PASS. If `crash-collector` goes red because `docs/CRASH-POLICY.md` must state the extra part, stop and add it to the questions file. `docs/CRASH-POLICY.md` is not among the R14 docs.

- [ ] **Step 5: Commit gate and commit.**

```bash
git add scripts/crash-collector.mjs
# Run the commit-gate command. Expected output: ng070-no-spaced-name only.
git commit -m "feat(ng-e): crash collector reads Gecko's single extra annotation part" -m "Refs: NG-068"
```

---

### Task 4: Uncaught frontend errors reach the telemetry logger (NG-067)

**Rows:** NG-067.

**Files:**
- Create: `theia/extensions/telemetry/src/browser/telemetry-error-capture.ts`
- Modify: `theia/extensions/telemetry/src/browser/telemetry-frontend-module.ts` (two binds and one import)

**Interfaces:**
- Consumes: `PowerBrowserTelemetryLogger.logError(name: string, data?: Record<string, unknown>)` (`telemetry-logger.ts:33`).
- Produces: `TelemetryErrorCapture` (a `FrontendApplicationContribution`), plus the event names `'frontend.uncaught-error'` and `'frontend.unhandled-rejection'` that the Task 1 check matches.

- [ ] **Step 1: Confirm red** (live-clone, under the lock with the G4 overrides): `scripts/verify-platform.sh --only ng067-frontend-errors-reach-telemetry`. Expected: FAIL `an uncaught error at level off never reached PowerBrowserTelemetryLogger.logError`.

- [ ] **Step 2: Write the contribution.**

```ts
// NG-067: uncaught frontend errors and unhandled rejections reach the telemetry logger.
// The sender applies the level: off drops, crash/error/all admit error events. The payload
// is the event name plus the message (capped), the script's base name, line and column --
// never a stack, because stacks carry file paths.
import { inject, injectable } from '@theia/core/shared/inversify';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { PowerBrowserTelemetryLogger } from './telemetry-logger';

export const UNCAUGHT_ERROR_EVENT = 'frontend.uncaught-error';
export const UNHANDLED_REJECTION_EVENT = 'frontend.unhandled-rejection';

function messageOf(value: unknown): string {
    return (value instanceof Error ? value.message : String(value)).slice(0, 500);
}

function baseName(url: unknown): string {
    return typeof url === 'string' ? (url.split(/[?#]/)[0].split('/').pop() ?? '') : '';
}

@injectable()
export class TelemetryErrorCapture implements FrontendApplicationContribution {
    @inject(PowerBrowserTelemetryLogger)
    protected readonly logger: PowerBrowserTelemetryLogger;

    protected readonly onError = (event: ErrorEvent): void => {
        this.logger.logError(UNCAUGHT_ERROR_EVENT, {
            message: messageOf(event.error ?? event.message),
            source: baseName(event.filename),
            line: event.lineno,
            column: event.colno,
        });
    };

    protected readonly onRejection = (event: PromiseRejectionEvent): void => {
        this.logger.logError(UNHANDLED_REJECTION_EVENT, { message: messageOf(event.reason) });
    };

    onStart(): void {
        window.addEventListener('error', this.onError);
        window.addEventListener('unhandledrejection', this.onRejection);
    }

    onStop(): void {
        window.removeEventListener('error', this.onError);
        window.removeEventListener('unhandledrejection', this.onRejection);
    }
}
```

- [ ] **Step 3: Bind it.** In `telemetry-frontend-module.ts`:

1. Add the imports:
```ts
import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { TelemetryErrorCapture } from './telemetry-error-capture';
```
2. Add after `bind(PowerBrowserTelemetryLogger).toSelf().inSingletonScope();`:
```ts
    // NG-067: the call site that makes the logger reachable from uncaught errors.
    bind(TelemetryErrorCapture).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(TelemetryErrorCapture);
```

- [ ] **Step 4: Build.** `nix develop .#theia --command bash -c 'cd theia && yarn build'`. Expected: 0 errors.

- [ ] **Step 5: Prove.** Under the lock with the G4 overrides, run `scripts/verify-platform.sh --only ng067-frontend-errors-reach-telemetry`, then `--only telemetry`, `--only telemetry-self-test` and `node theia/extensions/telemetry/test/telemetry-sender.test.mjs`. Expected: all PASS; the sender suite reports 9/9.

- [ ] **Step 6: Delete the call site once** (program Review Focus: a function with no caller on the runtime path). Comment out `bind(FrontendApplicationContribution).toService(TelemetryErrorCapture);`, rebuild, and rerun the NG-067 check. Expected: FAIL `… never reached PowerBrowserTelemetryLogger.logError`. Restore the line and rebuild.

- [ ] **Step 7: Commit gate and commit.**

```bash
git add theia/extensions/telemetry/src/browser/telemetry-error-capture.ts theia/extensions/telemetry/src/browser/telemetry-frontend-module.ts
# Run the commit-gate command. Expected output: ng070-no-spaced-name only.
git commit -m "feat(ng-e): uncaught frontend errors and rejections reach the telemetry logger" -m "Refs: NG-067"
```

---

### Task 5: Allowlist rows for the sidecar's hosts, and the sidecar egress layer (NG-069)

**Rows:** NG-069.

**Files:**
- Modify: `powerbrowser/endpoint-allowlist.json` (new `hosts` rows), `scripts/verify-endpoints.sh` (the no-flag run includes layer 4; header comment)

**Interfaces:**
- Consumes: `scripts/verify-ng-069-sidecar-egress.mjs` and `--layer 4` (Task 1).
- Produces: allowlist rows with `host`, `disposition` and `reason`, the schema that `check_allowlist_schema` enforces.

- [ ] **Step 1: Confirm red.** Run `bash scripts/verify-endpoints.sh --layer 4` (live-clone, under the lock, with the overrides). Expected: FAIL naming `open-vsx.org`, `api.anthropic.com` and `api.openai.com`.

- [ ] **Step 2: Add the rows** to the `hosts` array. The dispositions follow R15: allowed, reason "user-initiated" plus the feature named, and the AI hosts only when a key is configured.

```json
    {
      "host": "open-vsx.org",
      "disposition": "allow",
      "reason": "User-initiated (NG-069, R15): the extension feature. The Open VSX registry the sidecar is configured with (VSX_REGISTRY_URL in powerbrowser/shell/TheiaService.sys.mjs, and the application start script). It is contacted only when the user searches for, installs or updates an extension: the frontend's search request (layer 3) and the backend's install download (layer 4)."
    },
    {
      "host": "api.anthropic.com",
      "disposition": "allow",
      "reason": "User-initiated (NG-069, R15): the AI chat and completion feature through @theia/ai-anthropic (the @anthropic-ai/sdk base URL). It is contacted only after the user configures an Anthropic API key and sends a request. With no key configured it is never contacted, and nothing is sent at startup."
    },
    {
      "host": "api.openai.com",
      "disposition": "allow",
      "reason": "User-initiated (NG-069, R15): the AI chat and completion feature through @theia/ai-openai (the openai package base URL). It is contacted only after the user configures an OpenAI API key and sends a request. With no key configured it is never contacted, and nothing is sent at startup."
    }
```

- [ ] **Step 3: Observe, then cover.** Rerun `--layer 4`. For every further host it reports, add a row with the same shape, for example Open VSX's download storage host. Each reason starts "User-initiated (NG-069, R15): the extension feature" and names what the sidecar fetched from that host during the probe install. Do not suppress a host in the hook to make the check pass.

- [ ] **Step 4: Run layer 4 by default.** In `scripts/verify-endpoints.sh`:

1. Change the help text "No flag runs all three layers' real assertions" to "No flag runs all four layers' real assertions".
2. In the no-flag dispatch, after layer 3 runs, add `node "$REPO_ROOT/scripts/verify-ng-069-sidecar-egress.mjs" || result=1`. Use the variable name the script already uses for its overall result.
3. Add one header paragraph:
```bash
#   Layer 4 -- the sidecar's egress (NG-069). The Theia backend is a Node process that
#   Gecko's MOZ_LOG never sees. A NODE_OPTIONS preload records every hostname any
#   sidecar Node process resolves during a session that installs one extension, and each
#   one must be covered by an allowlist row. scripts/verify-ng-069-sidecar-egress.mjs.
```

- [ ] **Step 5: Prove.** Run `scripts/verify-platform.sh --only allowlist-schema`, `--only allowlist-doc-consistency` and `--only allowlist-doc-consistency-self-test` (quick), and `--only ng069-sidecar-egress` (live-clone, locked). Expected: all PASS.

- [ ] **Step 6: Commit gate and commit.**

```bash
git add powerbrowser/endpoint-allowlist.json scripts/verify-endpoints.sh
# Run the commit-gate command. Expected output: ng070-no-spaced-name only.
git commit -m "feat(ng-e): allowlist the sidecar's hosts and add the sidecar egress layer" -m "Refs: NG-069"
```

---

### Task 6: The build's plugin step installs every source kind at its pin (NG-071, NG-073)

**Rows:** NG-071, NG-073.

**Files:**
- Create: `scripts/download-plugins.mjs`
- Modify: `theia/applications/browser/package.json` (`scripts["download:plugins"]`), `docs/BUILD.md` (Theia half: "No bundled VS Code extensions" and the drill's download-path split, R14)

**Interfaces:**
- Consumes:
  - `resolveConfig(defaultsPath, downstreamPath)` → `{ failures, config }`, and `REPO_ROOT` (`scripts/generate.mjs:108, 3981`).
  - The theiaPlugins block. `npmDistTarballUrl` emits npm entries as `…/<id>-<version>.tgz`, and `localPackRef` emits local-path entries as `<path>.tgz` (`generate.mjs:1802-1824`).
- Produces: `node ../../../scripts/download-plugins.mjs` as the app's `download:plugins` script. Run from the app dir, it writes `<plugins>/<id>.tar.gz` for tarball kinds and delegates every other entry to the stock CLI.

- [ ] **Step 1: Confirm red** (live-clone): `scripts/verify-platform.sh --only ng071-tarball-extensions-build`. Expected: FAIL, where the plugin step's output names an `unsupported file type` for `chart.js`. Also run `--only ng073-declared-extension-loads` and record its result. If it passes, that is Q8.

- [ ] **Step 2: Write `scripts/download-plugins.mjs`.**

```js
#!/usr/bin/env node
// scripts/download-plugins.mjs -- the plugin step of the Theia application build (NG-071).
// theia/applications/browser/package.json runs it as `download:plugins`, so `yarn build`
// installs every declared extension with no file placed by hand. Run with the
// application directory as cwd.
// Tarball kinds (the `.tgz` entries the generator emits for npm registry tarballs and
// local-path packs) are fetched or packed here, checked against their manifest sha256
// pin, and written to <pluginsDir>/<id>.tar.gz, the slot the extension-pins gate hashes.
// Every other entry goes to the stock `theia download:plugins --packed`, which rejects
// `.tgz` URLs. A pin mismatch fails the build naming the entry, and nothing is written for it.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { REPO_ROOT, resolveConfig } from './generate.mjs';

const NAME = 'download-plugins';
const appDir = process.cwd();
const pkg = JSON.parse(readFileSync(join(appDir, 'package.json'), 'utf8'));
const block = pkg.theiaPlugins ?? {};
const pluginsDir = resolve(appDir, pkg.theiaPluginsDir ?? 'plugins');
const configDir = process.env.PB_CONFIG_DIR ? resolve(process.env.PB_CONFIG_DIR) : undefined;
const { failures, config } = resolveConfig(join(REPO_ROOT, 'configuration.toml'), configDir ? join(configDir, 'configuration.toml') : undefined);
if (failures.length) die(`the manifest does not resolve: ${failures.join('; ')}`);
const entries = new Map((config.extensions ?? []).map(e => [e.id, e]));
const tarballIds = Object.keys(block).filter(id => block[id].endsWith('.tgz'));

mkdirSync(pluginsDir, { recursive: true });
for (const id of tarballIds) {
    const entry = entries.get(id);
    if (!entry) die(`theiaPlugins declares ${id}, which no [[extensions]] entry names -- regenerate and copy the theiaPlugins block over`);
    const bytes = entry.source === 'local-path' ? pack(resolve(configDir ?? REPO_ROOT, entry.path)) : await fetchBytes(block[id]);
    const actual = createHash('sha256').update(bytes).digest('hex');
    if (actual !== entry.sha256) die(`${id}: the ${entry.source} archive hashes to ${actual}, the manifest pins ${entry.sha256} -- nothing was installed for it`);
    writeFileSync(join(pluginsDir, `${id}.tar.gz`), bytes);
    console.log(`${NAME}: ${id} (${entry.source}) installed at its pin`);
}

const rest = Object.fromEntries(Object.entries(block).filter(([id]) => !tarballIds.includes(id)));
if (Object.keys(rest).length > 0) {
    const tmp = mkdtempSync(join(tmpdir(), 'pb-plugins-'));
    try {
        writeFileSync(join(tmp, 'package.json'), JSON.stringify({ name: 'pb-plugin-download', private: true, theiaPluginsDir: pluginsDir, theiaPlugins: rest }));
        const r = spawnSync(join(REPO_ROOT, 'theia', 'node_modules', '.bin', 'theia'), ['download:plugins', '--packed'], { cwd: tmp, stdio: 'inherit' });
        if (r.status !== 0) process.exit(r.status ?? 1);
    } finally {
        rmSync(tmp, { recursive: true, force: true });
    }
}

function pack(folder) {
    const out = mkdtempSync(join(tmpdir(), 'pb-pack-'));
    try {
        const r = spawnSync('npm', ['pack', folder, '--pack-destination', out], { encoding: 'utf8' });
        if (r.status !== 0) die(`npm pack ${folder} failed: ${r.stderr}`);
        const [file] = readdirSync(out).filter(n => n.endsWith('.tgz'));
        return readFileSync(join(out, file));
    } finally {
        rmSync(out, { recursive: true, force: true });
    }
}

async function fetchBytes(url) {
    const res = await fetch(url);
    if (!res.ok) die(`${url} answered ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
}

function die(message) {
    console.error(`${NAME}: FAIL -- ${message}`);
    process.exit(1);
}
```

- [ ] **Step 3: Wire it.** In `theia/applications/browser/package.json`, change `"download:plugins": "theia download:plugins --packed"` to `"download:plugins": "node ../../../scripts/download-plugins.mjs"`.

- [ ] **Step 4: Prove.** Run these three:
1. `nix develop .#theia --command bash -c 'cd theia && yarn build'`. The default declares nothing, so expect 0 errors and nothing downloaded.
2. `scripts/verify-platform.sh --only extension-pins` and `--only extension-pins-self-test` (quick).
3. `ng071-tarball-extensions-build` and `ng073-declared-extension-loads` (live-clone, locked, with the overrides).

Expected: all PASS.

- [ ] **Step 5: Update BUILD.md (R14).**

1. In `docs/BUILD.md`, replace the paragraph that starts "**No bundled VS Code extensions.**" (lines 133–140) with:
   ```markdown
   **Declared extensions only.** The app ships `@theia/plugin-ext`,
   `@theia/plugin-ext-vscode` and `@theia/vsx-registry`, the extension-host machinery
   and the runtime installer. This project declares no `[[extensions]]`, so the
   `theiaPlugins` block stays absent and the build downloads nothing. A downstream that
   declares extensions gets them from `yarn build`'s `download:plugins` step, which is
   `scripts/download-plugins.mjs`:
   - npm and local-path tarballs are fetched or packed, checked against their manifest
     `sha256`, and written to `plugins/<id>.tar.gz`;
   - every other kind goes through the stock `theia download:plugins --packed`.

   A pin mismatch fails the build naming the entry, and nothing is placed by hand
   (NG-071, check `ng071-tarball-extensions-build`).
   ```
2. In the "Extension tier-3 drill" section, append this sentence to the paragraph that ends "…placed all three archives into the plugins dir under…":

   > Since NG-071 the build's own plugin step does this, so the out-of-band placement above is a historical record, not a procedure.

- [ ] **Step 6: Commit gate and commit.**

```bash
git add scripts/download-plugins.mjs theia/applications/browser/package.json docs/BUILD.md
node scripts/scan-brand-residue.mjs
# Run the commit-gate command. Expected output: ng070-no-spaced-name only.
git commit -m "feat(ng-e): the build's plugin step installs npm and local-path extensions at their pins" -m "Refs: NG-071, NG-073"
```

---

### Task 7: The update URL comes from configuration.toml (NG-064)

**Rows:** NG-064.

**Files:**
- Modify:
  - `configuration.toml`: new `[urls]` table.
  - `scripts/generate.mjs`: `emitIdentityConfigure`, `generate.mjs:1504-1520`, and the generator's own `--self-test` expectations if any fixture pins the identity lines.
  - `powerbrowser/identity.configure.comparand`: regenerated byte copy.
  - `powerbrowser/distribution/policies.json`: `AppUpdateURL` equals `[urls] update`; the value is unchanged today.
  - `docs/REBRANDING.md`: the `urls.update` row (R14).
  - `docs/BUILD.md`: the "Two baked-in facts" block under "Updater enablement" (R14).
- `generated/` outputs are regenerated, and they are git-ignored.
- The R11 refusal of an inherited update host is Task 15.

**Interfaces:**
- Consumes: the `urls.update` schema key (`https://…`, optional), and `upstream/build/moz.build:95-97`, which overrides the `aus5` default from `CONFIG["MOZ_APPUPDATE_HOST"]`.
- Produces: a `set_config("MOZ_APPUPDATE_HOST", "<host>")` line in `generated/identity.configure`, reached through patch 010's `include("../identity.configure")`. No new patch is needed.

Verified facts:
- `application.ini [AppUpdate] URL` is `https://@MOZ_APPUPDATE_HOST@/update/6/…` (`upstream/build/application.ini.in:55`).
- No upstream `set_config` binds `MOZ_APPUPDATE_HOST`.
- `media.gmp-manager.url` and `extensions.systemAddon.update.url` still name `aus5` in `greprefs.js` and `firefox.js`, but the branding prefs already blank both. The effective values are `''`, per D-84 and D-86 in the allowlist. The check reads effective values.

- [ ] **Step 1: Confirm red** (live-main at merge, or in main now): `scripts/verify-platform.sh --only ng064-update-url-from-manifest`. Expected: FAIL for three reasons: `[urls] update is undefined`, `application.ini [AppUpdate] URL host is aus5.mozilla.org`, and `<binary>-bin carries a https://aus5.mozilla.org URL`.

- [ ] **Step 2: Declare the URL.** In `configuration.toml`, after the `[installer]` table, add:

```toml
# Update endpoint (NG-064). update is the update-descriptor URL the client asks.
# Its host becomes MOZ_APPUPDATE_HOST through generated/identity.configure, so
# application.ini's [AppUpdate] URL names this host rather than Mozilla's, and
# powerbrowser/distribution/policies.json AppUpdateURL must equal it (the policy
# wins over application.ini; ng064-update-url-from-manifest pins both).
[urls]
update = "https://updates.powerbrowser.org/update.xml"
```

- [ ] **Step 3: Emit the host.** In `emitIdentityConfigure`, after the `'imply_option("MOZ_NORMANDY", False)',` entry and before the array closes, add a conditional push. Keep the array literal as it is, and add after it:

```js
    // NG-064: the update host comes from the manifest. upstream/build/moz.build:96 uses
    // CONFIG["MOZ_APPUPDATE_HOST"] instead of its aus5 default when it is set. Unset
    // means no line. A downstream that inherits the platform's own host is refused
    // before any emission (non-GUI ruling R11; resolveConfig, Task 15).
    const update = config.urls?.update;
    if (!isUnset(update)) {
        const host = new URL(assertEmittable('urls.update', update)).host;
        lines.push(`set_config("MOZ_APPUPDATE_HOST", ${JSON.stringify(host)})`);
    }
```

`lines` is declared with `const`, so `push` works. Then regenerate and copy the comparand:

```bash
nix develop .#theia --command node scripts/generate.mjs
cp generated/identity.configure powerbrowser/identity.configure.comparand
nix develop .#theia --command node scripts/generate.mjs --check
nix develop .#theia --command node scripts/generate.mjs --self-test
```

Expected: `--check` reports fresh. If `--self-test` fails naming the identity lines, update the self-test expectation in `generate.mjs` and nothing else. `generated/endpoint-hosts.json` now lists `updates.powerbrowser.org`, which is already an `allow` row.

- [ ] **Step 4: Keep the policy equal to the manifest.** `powerbrowser/distribution/policies.json` already carries `"AppUpdateURL": "https://updates.powerbrowser.org/update.xml"`, so no byte changes. The check pins the equality from now on.

- [ ] **Step 5: Validate configure in the clone** (cheap; no compile):

```bash
nix develop .#firefox --command bash -c 'cd upstream && MOZCONFIG=../.mozconfig ./mach configure' \
  && grep -n MOZ_APPUPDATE_HOST ../objdir/config.status
```

Expected: `config.status` carries `'MOZ_APPUPDATE_HOST': 'updates.powerbrowser.org'`. This writes a configure-only `objdir/` in the clone, which is git-ignored.

- [ ] **Step 6: Update the docs this task makes stale (R14).**
1. In `docs/REBRANDING.md`, in the `urls.update` row (line 280):
   - Replace the "If omitted" cell with: "No update host is emitted, so upstream's default stays. A downstream that states no `urls.update` inherits the platform's own host, and generate refuses it (Task 15, R11)."
   - Replace the "Reaches" cell with: "`application.ini` `[AppUpdate]` URL host (`MOZ_APPUPDATE_HOST`, through `generated/identity.configure`), and `generated/endpoint-hosts.json` host coverage. `powerbrowser/distribution/policies.json` `AppUpdateURL` must equal it (check `ng064-update-url-from-manifest`)."
2. In `docs/BUILD.md`, "Updater enablement", replace the first bullet of "Two baked-in facts the procedure works around rather than edits" (the one starting "`application.ini`'s `[AppUpdate]` URL bakes `aus5.mozilla.org`") with:

   > - `application.ini`'s `[AppUpdate]` URL host comes from `configuration.toml` `[urls] update` (NG-064). `generated/identity.configure` emits `set_config("MOZ_APPUPDATE_HOST", …)`, which `upstream/build/moz.build:96` prefers over its `aus5.mozilla.org` default. It is a compiled value, so a change needs a tier-3 rebuild. The `AppUpdateURL` enterprise policy still wins when present (`UpdateService.sys.mjs:5466`), and `powerbrowser/distribution/policies.json` carries the same URL.

   Change the lead-in from "Two baked-in facts the procedure works around rather than edits" to "Two facts about where the update URL lives".

- [ ] **Step 7: Quick gate.** Run `scripts/verify-platform.sh --only generated-byte-identity`, `--only verify-manifest-literals`, `--only branding-preflight`, `--only verify-rebranding-docs`, `--only verify-rebranding-docs-self-test` and `--only theia-endpoints`. Expected: PASS.

- [ ] **Step 8: Commit gate and commit.** The live check runs at merge, after the tier-3 build.

```bash
git add configuration.toml scripts/generate.mjs powerbrowser/identity.configure.comparand docs/REBRANDING.md docs/BUILD.md
# Run the commit-gate command. Expected output: ng070-no-spaced-name only.
git commit -m "feat(ng-e): the update host comes from configuration.toml [urls] update" -m "Refs: NG-064"
```

---

### Task 8: Update MARs are signed with the fork's key and verified (NG-065)

**Rows:** NG-065.

**Files:**
- Create: `powerbrowser/packaging/mar/mar-primary.der` (public certificate only), `patches/030-powerbrowser-mar-certificates.patch`
- Modify:
  - `scripts/generate.mjs` (`emitMozconfig`, lines 1404–1426)
  - `.mozconfig` (copy-over of `generated/.mozconfig`)
  - `docs/BUILD.md` ("Key-custody rung", "Updater enablement", MAR loop step 3; R12/R14)
  - `docs/RELEASING.md` (the stale-BUILD.md paragraph, the key ceremony and custody section, and each `brand/mar-*.der` and `sign-mar.sh` mention; R12/R14)

**Interfaces:**
- Consumes: `CONFIG["MOZ_UPDATE_CHANNEL"]`, which is `default`. With that value `toolkit/mozapps/update/updater/moz.build:67-85` selects `dep1.der` and `dep2.der`.
- Produces:
  - The updater verifies MARs against `powerbrowser/packaging/mar/mar-primary.der` (primary and secondary slots, one key; R12).
  - The MAR channel ID `<identity.app_basename>-default` is baked into `MAR_CHANNEL_ID`, `ACCEPTED_MAR_CHANNEL_IDS` and `update-settings.ini`.
  - Signing nickname `powerbrowser-mar`. The NSS key store `~/.config/powerbrowser-release/mar-key/` has a password in `password.txt` beside it (R12). Neither is ever in the repo.
  - Signing command: `printf '%s\n' "$(cat ~/.config/powerbrowser-release/mar-key/password.txt)" | objdir/dist/bin/signmar -d ~/.config/powerbrowser-release/mar-key -n powerbrowser-mar -s <in.mar> <out.mar>`. signmar reads the password from stdin when stdin is not a terminal.

- [ ] **Step 1 (Chris): generate the key pair.** This creates the secret. Run it in a terminal on legion. The public certificate goes straight into the wave E clone.

```bash
PB=$HOME/coding/Power-Browser; D=$HOME/.config/powerbrowser-release/mar-key
mkdir -p "$D" && chmod 700 "$D"
( umask 077 && head -c 32 /dev/urandom | base64 > "$D/password.txt" )    # R12: the key store's password, never empty
export LD_LIBRARY_PATH=$PB/objdir/dist/bin
$PB/objdir/dist/bin/certutil -N -d "sql:$D" -f "$D/password.txt"
head -c 4096 /dev/urandom > "$D/noise"
$PB/objdir/dist/bin/certutil -S -d "sql:$D" -f "$D/password.txt" -z "$D/noise" -n powerbrowser-mar \
  -s "CN=PowerBrowser MAR signing,O=DeBIOS Foundation" -x -t ",," -k rsa -g 4096 -Z SHA384 -v 240
shred -u "$D/noise"
mkdir -p $HOME/coding/Power-Browser-ng-e/powerbrowser/packaging/mar
$PB/objdir/dist/bin/certutil -L -d "sql:$D" -n powerbrowser-mar -r > $HOME/coding/Power-Browser-ng-e/powerbrowser/packaging/mar/mar-primary.der
ls -l "$D"    # cert9.db key4.db pkcs11.txt password.txt -- nothing from this directory ever enters the repo
```

Expected:
- `mar-primary.der` is a few hundred bytes of DER, and `openssl x509 -inform der -noout -subject -in …/mar-primary.der` prints the subject.
- `password.txt` is mode 0600 and non-empty.
- A backup of the directory to offline media is your call. Losing it means a client rebuild with a new certificate, because one key fills both slots (R12).

- [ ] **Step 2: Patch the updater's certificate inputs.** In the clone's `upstream/toolkit/mozapps/update/updater/moz.build`, replace lines 67–85, the whole `if CONFIG["MOZ_UPDATE_CHANNEL"] in (…)` / `elif` / `else` block, with:

```python
# The updater verifies every MAR against the fork's own certificate, on every
# update channel (non-GUI NG-065). One key fills both slots.
primary_cert.inputs += ["/powerbrowser/packaging/mar/mar-primary.der"]
secondary_cert.inputs += ["/powerbrowser/packaging/mar/mar-primary.der"]
```

Leave lines 87–89 (`dep1_cert`, `dep2_cert`, `xpcshell_cert`) unchanged. The path is topsrcdir-relative and resolves through the `upstream/powerbrowser` symlink to `../powerbrowser`, the same route patch 020's `DIRS` entry takes. Then run the patch procedure (Global Constraints):

```bash
git -C upstream diff -- toolkit/mozapps/update/updater/moz.build > patches/030-powerbrowser-mar-certificates.patch
git -C upstream checkout -- . && bash scripts/apply-patches.sh
bash scripts/check-patch-surface.sh && bash scripts/check-patch-surface.sh --brand-values && bash scripts/apply-patches.sh --self-test
```

Expected: all four exit 0. `git -C upstream diff --stat` then lists only the paths of patches 010, 020 and 030.

- [ ] **Step 3: Turn verification on in the generator.** In `emitMozconfig`:

1. Add as the first statement:
```js
    // NG-065: one MAR channel for every build of this manifest, <app_basename>-<update channel>
    // (the build's MOZ_UPDATE_CHANNEL is "default"). It is baked into MAR_CHANNEL_ID
    // and into update-settings.ini's ACCEPTED_MAR_CHANNEL_IDS, so a MAR made for another
    // product or channel is refused (updater error MAR_CHANNEL_MISMATCH_ERROR).
    const marChannel = `${assertEmittable('identity.app_basename', config.identity.app_basename)}-default`;
```
2. Delete the array entry `'ac_add_options --enable-unverified-updates',`.
3. Add these two entries directly after `'ac_add_options --enable-application=browser',`:
```js
        `ac_add_options MAR_CHANNEL_ID=${marChannel}`,
        `ac_add_options ACCEPTED_MAR_CHANNEL_IDS=${marChannel}`,
```
4. Change "these eleven lines" in the function's leading comment to "these twelve lines".

Then regenerate and copy over:

```bash
nix develop .#theia --command node scripts/generate.mjs
cp generated/.mozconfig .mozconfig
nix develop .#theia --command node scripts/generate.mjs --check && nix develop .#theia --command node scripts/generate.mjs --self-test
```

If the generator's own self-test pins the `.mozconfig` lines, update that expectation in `generate.mjs`.

- [ ] **Step 4: Validate configure in the clone.**

```bash
nix develop .#firefox --command bash -c 'cd upstream && MOZCONFIG=../.mozconfig ./mach configure'
grep -nE "'(MOZ_VERIFY_MAR_SIGNATURE|MAR_CHANNEL_ID|ACCEPTED_MAR_CHANNEL_IDS)'" objdir/config.status
```

Expected: three lines. The two IDs equal `powerbrowser-default`, and `MOZ_VERIFY_MAR_SIGNATURE` is set. If configure rejects the `ac_add_options VAR=value` form, replace the two lines with plain `export MAR_CHANNEL_ID=…` and `export ACCEPTED_MAR_CHANNEL_IDS=…` lines. Mozconfig is shell-sourced, so exports reach configure. Repeat Step 3's copy-over and this step.

- [ ] **Step 5: Update the docs this task makes stale (R12, R14).**

In `docs/BUILD.md`:
1. Replace the body of "### Key-custody rung (T-08-04a)" with:

   > MARs are signed with the fork's own key (NG-065). The key pair was generated locally (decisions.md D5, R12). The NSS key store is at `~/.config/powerbrowser-release/mar-key/`, outside the repo, with its password in `password.txt` there. Only the public certificate, `powerbrowser/packaging/mar/mar-primary.der`, is tracked.
   >
   > `patches/030-powerbrowser-mar-certificates.patch` makes the updater embed that certificate in both of its slots on every update channel. One key: a compromised key needs a client rebuild.
   >
   > Sign with the signing command in wave E's plan (Task 8 "Produces"): signmar, nickname `powerbrowser-mar`, the password on stdin. `scripts/verify-ng-065-mar-signature.mjs` (row `ng065-mar-signature-enforced`) drives the packaged `updater` and requires four outcomes:
   > - a fork-signed MAR applies;
   > - an unsigned MAR is refused with `CERT_VERIFY_ERROR`;
   > - a MAR signed with a foreign key is refused with `CERT_VERIFY_ERROR`;
   > - a fork-signed MAR for another channel is refused with `MAR_CHANNEL_MISMATCH_ERROR`.
   >
   > Update descriptors are still generated by `buildUpdateXml` and served over HTTPS.

2. In "### Updater enablement", replace the first paragraph with:

   > `.mozconfig` no longer carries `--enable-unverified-updates`. The build defines `MOZ_VERIFY_MAR_SIGNATURE`, and `MAR_CHANNEL_ID` and `ACCEPTED_MAR_CHANNEL_IDS` are both `<app_basename>-default` (emitted by `emitMozconfig`, baked into `update-settings.ini`). Any mozconfig change is a tier-3 rebuild. After building, assert the updater compiled in and verification is on:

   Add a second line to the code block that follows: `grep -q "'MOZ_VERIFY_MAR_SIGNATURE'" objdir/config.status && echo VERIFY_ON`.

3. In "### MAR build and serve loop", step 3:
   - Change `MAR_CHANNEL_ID=default` to `MAR_CHANNEL_ID=powerbrowser-default`.
   - Replace the sentences from "`MAR_CHANNEL_ID=default` matches" through "…cost a rebuild for a file nothing reads yet." with: "`MAR_CHANNEL_ID` must equal the build's `ACCEPTED_MAR_CHANNEL_IDS` (`objdir/config.status`). Then sign the MAR with the signing command in wave E's plan (Task 8 "Produces"). The updater refuses an unsigned MAR (`CERT_VERIFY_ERROR`) and a MAR for another channel (`MAR_CHANNEL_MISMATCH_ERROR`)."

In `docs/RELEASING.md`:
1. In the paragraph "Three parts of `docs/BUILD.md` currently read as the opposite…" (lines 31–40), state that the key-custody text, the "Two baked-in facts" block and the "Policy install" section were rewritten by the non-GUI wave E (NG-064, NG-065, NG-072). Only the `virsh` line remains for `windows-unsigned`.
2. Replace the ceremony block and the custody paragraphs in "### The MAR key ceremony and custody" (lines ~325–360) with the Task 8 Step 1 commands and one paragraph:
   - The key store and `password.txt` live at `~/.config/powerbrowser-release/mar-key/`.
   - One key fills both updater slots (R12).
   - The certificate is `powerbrowser/packaging/mar/mar-primary.der`.
   - Loading the key into the `release` environment secrets is part of the deferred release pipeline row. The pipeline exports it from that store with `pk12util`.
3. Everywhere else in RELEASING.md:
   - `brand/mar-primary.der` becomes `powerbrowser/packaging/mar/mar-primary.der`.
   - Delete the mentions of `brand/mar-secondary.der` and of a second key.
   - `scripts/sign-mar.sh sign` and `scripts/sign-mar.sh verify --cert …` become the signing command in wave E's plan (Task 8 "Produces") and `signmar -D powerbrowser/packaging/mar/mar-primary.der -v <mar>`.
   - In the stage table (line ~234), mark `mar-signing-and-update-integrity` as carried out by non-GUI wave E Task 8.

- [ ] **Step 6: Quick gate.** Run `scripts/verify-platform.sh --only generated-byte-identity`, `--only check-patch-surface`, `--only check-patch-surface-brand-values`, `--only mar-update-hop-self-test` and `--only installer-build-proof-self-test`. Expected: PASS.

- [ ] **Step 7: Commit gate and commit.** The live check runs at merge: tier-3 build, then packaging, then `ng065-mar-signature-enforced`.

```bash
git add powerbrowser/packaging/mar/mar-primary.der patches/030-powerbrowser-mar-certificates.patch scripts/generate.mjs .mozconfig docs/BUILD.md docs/RELEASING.md
git diff --cached --name-only | grep -E 'key4|cert9|\.p12' && { echo "PRIVATE KEY STAGED -- stop"; exit 1; }
# Run the commit-gate command. Expected output: ng070-no-spaced-name only.
git commit -m "feat(ng-e): MARs are verified against the fork's key on one fixed channel" -m "Refs: NG-065"
```

---

### Task 9: The NSIS installer takes its branding from the build and sends no Mozilla ping (NG-066)

**Rows:** NG-066.

**Files:**
- Create: `patches/040-powerbrowser-nsis.patch`, regenerated. Its targets are `browser/installer/windows/nsis/defines.nsi.in` and `browser/installer/windows/nsis/installer.nsi`.
- Modify: `docs/BUILD.md` ("NSIS-on-Nix path", the "Stand-ins that stay labeled" paragraph; R14)

**Interfaces:**
- Consumes:
  - `@MOZ_APP_NAME@`, a preprocessor DEFINE (`browser/installer/windows/moz.build:7`), which substitutes into `defines.nsi.in` (`Makefile.in:73`).
  - `${CompanyName}` from the generated `branding.nsi`. It equals `product.vendor_display` and is included before `defines.nsi`.
- Produces: `AppName = @MOZ_APP_NAME@`, `CERTIFICATE_NAME = ${CompanyName}`, an empty `TELEMETRY_BASE_URL`, and `SendPingIfApplicable` returning first.

- [ ] **Step 1: Confirm red** (live-main): `scripts/verify-platform.sh --only ng066-nsis-branding-no-ping`. Expected: FAIL naming `AppName "Firefox"`, `CERTIFICATE_NAME "Mozilla Corporation"`, the TELEMETRY URL, and `starts with "ClearErrors"`.

- [ ] **Step 2: Edit the NSIS sources** in the clone's `upstream/`:

`defines.nsi.in:23`:
```nsis
!define AppName               "@MOZ_APP_NAME@"
```

`defines.nsi.in:56`:
```nsis
!define CERTIFICATE_NAME            "${CompanyName}"
```

`defines.nsi.in:150`:
```nsis
!define TELEMETRY_BASE_URL ""
```

`installer.nsi`, directly after the line `Function SendPingIfApplicable` (currently line 1016):
```nsis
  Return ; no installer ping is sent (non-GUI NG-066)
```

Leave `CERTIFICATE_ISSUER` unchanged (R16: Windows signing is deferred with the Windows packaging row). Do not put the product name in any added comment; the brand-values scan would flag it.

- [ ] **Step 3: Regenerate the patch.**

```bash
git -C upstream diff -- browser/installer/windows/nsis/defines.nsi.in browser/installer/windows/nsis/installer.nsi > patches/040-powerbrowser-nsis.patch
git -C upstream checkout -- . && bash scripts/apply-patches.sh
bash scripts/check-patch-surface.sh && bash scripts/check-patch-surface.sh --brand-values && bash scripts/apply-patches.sh --self-test
```

Expected: all exit 0.

- [ ] **Step 4: Compile proof in the clone** (it needs `config.status`, which Task 7 or 8's configure-only `objdir` provides): `node scripts/verify-installer-build-proof.mjs`. Expected: PASS, `setup.exe` compiled. The full `ng066` check runs at merge against main's `objdir`.

- [ ] **Step 5: Update BUILD.md (R14).** In `docs/BUILD.md`, "NSIS-on-Nix path", in the paragraph that starts "Stand-ins that stay labeled, never blessed", replace the clause that begins "and `defines.nsi` still carries upstream's own Mozilla literals" and ends at the end of its sentence with:

> `defines.nsi` now takes `AppName` from the build's `MOZ_APP_NAME` and `CERTIFICATE_NAME` from the generated `CompanyName`, and the installer sends no telemetry ping (`patches/040-powerbrowser-nsis.patch`, NG-066, row `ng066-nsis-branding-no-ping`). `CERTIFICATE_ISSUER` stays upstream's until a fork Windows signing certificate exists (deferred with the Windows packaging row).

- [ ] **Step 6: Commit gate and commit.**

```bash
git add patches/040-powerbrowser-nsis.patch docs/BUILD.md
# Run the commit-gate command. Expected output: ng070-no-spaced-name only.
git commit -m "feat(ng-e): NSIS installer names the build's app and vendor and sends no ping" -m "Refs: NG-066"
```

---

### Task 10: The Linux package carries the Theia app, the Node runtime and distribution/ (NG-063, NG-072)

**Rows:** NG-063 (the package half; its sidecar resolution is Task 13, `Needs: wave-c`), NG-072.

**Files:**
- Create:
  - `powerbrowser/packaging/package-linux.sh`
  - `powerbrowser/packaging/node-runtime.json` (R13: the pinned official Node release)
- Modify:
  - `powerbrowser/shell/powerbrowser-sidecar.js` (the header comment only; the default stays the dev tree)
  - `powerbrowser/endpoint-allowlist.json` (the `nodejs.org` download-host row)
  - `docs/BUILD.md` ("Policy install (REQUIRED post-build step)", and a new "Linux package" subsection; R14)

**Interfaces:**
- Consumes: `./mach package`, which stages `objdir/dist/powerbrowser/` and writes `objdir/dist/<app>-<Version>.en-US.linux-x86_64.tar.xz` (BUILD.md step 2). Also `upstream/config/createprecomplete.py`.
- Produces this staged layout, which Task 13 resolves against:
  - `<prefix>/theia/lib/{backend,frontend}` (no `*.map` files)
  - `<prefix>/theia/package.json`
  - `<prefix>/theia/plugins/` (when the app has one)
  - `<prefix>/node/bin/node` and `<prefix>/node/LICENSE`, both from the pinned official release
  - `<prefix>/distribution/policies.json`
  - a refreshed `precomplete`

  `objdir/dist/bin` stays untouched, so a dev run keeps using the dev tree.
- Produces the pin `powerbrowser/packaging/node-runtime.json` = `{"linux-x64": {"version", "url", "sha256"}}`, which the NG-063 check reads.

Verified 2026-09-25:
- The theia dev shell runs Node `v22.23.2`.
- `https://nodejs.org/dist/v22.23.2/SHASUMS256.txt` lists `node-v22.23.2-linux-x64.tar.xz` with sha256 `d60acfe00a2932254bb0ad20e01b0d74397a0875595de719654b214f4b03f307`.
- The official binary uses the standard `/lib64` loader, which legion provides through nix-ld (`/etc/nixos/configuration.nix:333`).
- The Gecko binaries in the same package are Nix-bound. `powerbrowser-bin`'s interpreter is `/nix/store/…-glibc-2.42-67/lib/ld-linux-x86-64.so.2`, and `libxul.so` carries 25 `/nix/store/` references. So R13 makes Node portable, but the package as a whole still needs this machine's store paths (Q13).

- [ ] **Step 1: Confirm red** (live-main): `ng063-packaged-launch` fails with `the package lacks theia/lib/backend/main.js …`, and `ng072-policies-packaged-webextension` fails with `the package carries no distribution/policies.json`.

- [ ] **Step 2: Pin the Node runtime (R13).** Read the version from the dev shell, so the packaged Node matches the one the native modules (drivelist) were built against. Take the sha256 from nodejs.org's `SHASUMS256.txt`, and write the pin:

```bash
V=$(nix develop .#theia --command node --version | tail -1)          # v22.23.2 on 2026-09-25
F=node-$V-linux-x64.tar.xz
SHA=$(curl -fsSL https://nodejs.org/dist/$V/SHASUMS256.txt | awk -v f="$F" '$2 == f { print $1 }')
test ${#SHA} -eq 64
printf '{\n  "linux-x64": {\n    "version": "%s",\n    "url": "https://nodejs.org/dist/%s/%s",\n    "sha256": "%s"\n  }\n}\n' "$V" "$V" "$F" "$SHA" > powerbrowser/packaging/node-runtime.json
cat powerbrowser/packaging/node-runtime.json
```

Expected on 2026-09-25: version `v22.23.2`, sha256 `d60acfe00a2932254bb0ad20e01b0d74397a0875595de719654b214f4b03f307`. To bump Node, rerun this step. The package fails loudly if the download stops matching the pin.

- [ ] **Step 3: Allowlist the download host.** Append to `hosts` in `powerbrowser/endpoint-allowlist.json`:

```json
    {
      "host": "nodejs.org",
      "disposition": "allow",
      "reason": "Build-time only (NG-063, R13): powerbrowser/packaging/package-linux.sh downloads the pinned official Node release (powerbrowser/packaging/node-runtime.json, sha256-checked) when the Linux package is made. The installed browser and its sidecar never contact it."
    }
```

Run `scripts/verify-platform.sh --only allowlist-schema`. Expected: PASS.

- [ ] **Step 4: Write the script.**

```bash
#!/usr/bin/env bash
# powerbrowser/packaging/package-linux.sh -- the Linux package (NG-063, NG-072).
# Runs `./mach package`, then:
#   - stages the Theia sidecar, the pinned official Node release (R13) and
#     distribution/policies.json into the packaged app dir;
#   - refreshes precomplete, because full MARs are made from this dir;
#   - rewrites the tarball mach wrote.
# objdir/dist/bin is not touched, so dev runs keep the dev tree.
# Run from the repo root inside `nix develop .#firefox`, after a Gecko build and a Theia
# `yarn build`:
#   nix develop .#firefox --command bash powerbrowser/packaging/package-linux.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OBJ="$ROOT/${POWERBROWSER_OBJDIR:-objdir}"
APP="$ROOT/theia/applications/browser"
fail() { echo "package-linux: FAIL -- $*" >&2; exit 1; }
test -f "$APP/lib/backend/main.js" || fail "$APP/lib/backend/main.js is absent; run yarn build in theia/ first"

# The pinned official Node release (R13), downloaded once into the git-ignored .mozbuild/.
read -r NODE_VERSION NODE_URL NODE_SHA < <(python3 -c 'import json,sys; p=json.load(open(sys.argv[1]))["linux-x64"]; print(p["version"], p["url"], p["sha256"])' "$ROOT/powerbrowser/packaging/node-runtime.json")
CACHE="$ROOT/.mozbuild/node-dist"; mkdir -p "$CACHE"
ARCHIVE="$CACHE/$(basename "$NODE_URL")"
if [ ! -f "$ARCHIVE" ]; then curl -fsSL -o "$ARCHIVE.part" "$NODE_URL" && mv "$ARCHIVE.part" "$ARCHIVE"; fi
echo "$NODE_SHA  $ARCHIVE" | sha256sum -c --quiet - || { rm -f "$ARCHIVE"; fail "$ARCHIVE does not hash to the pin in powerbrowser/packaging/node-runtime.json"; }

( cd "$ROOT/upstream" && MOZCONFIG=../.mozconfig ./mach package )

VERSION="$(sed -n 's/^Version=//p' "$OBJ/dist/bin/application.ini")"
STAGE="$(find "$OBJ/dist" -mindepth 1 -maxdepth 1 -type d -newer "$OBJ/dist/bin/application.ini" -exec test -f '{}/precomplete' \; -print | head -n 1)"
test -n "$STAGE" || { echo "package-linux: FAIL -- no staged app dir with a precomplete under $OBJ/dist" >&2; exit 1; }
rm -rf "$STAGE/theia" "$STAGE/node"
mkdir -p "$STAGE/theia" "$STAGE/node/bin" "$STAGE/distribution"
cp -a "$APP/lib" "$STAGE/theia/lib"
find "$STAGE/theia/lib" -name '*.map' -delete
cp "$APP/package.json" "$STAGE/theia/package.json"
if [ -d "$APP/plugins" ]; then cp -a "$APP/plugins" "$STAGE/theia/plugins"; fi
tar -xJf "$ARCHIVE" -C "$STAGE/node" --strip-components=1 "node-$NODE_VERSION-linux-x64/bin/node" "node-$NODE_VERSION-linux-x64/LICENSE"
test "$("$STAGE/node/bin/node" --version)" = "$NODE_VERSION" || fail "the staged node does not report $NODE_VERSION"
cp "$ROOT/powerbrowser/distribution/policies.json" "$STAGE/distribution/policies.json"
python3 "$ROOT/upstream/config/createprecomplete.py" "$STAGE"

TARBALL="$(ls "$OBJ/dist"/*-"$VERSION".en-US.linux-x86_64.tar.xz)"
tar -C "$OBJ/dist" -cJf "$TARBALL.tmp" "$(basename "$STAGE")"
mv "$TARBALL.tmp" "$TARBALL"
echo "package-linux: wrote $TARBALL"
```

The staged directory is the one `mach package` just wrote with a `precomplete`. It is found, not named, so no brand value is typed into the script.

- [ ] **Step 5: Document the resolution rule** in `powerbrowser/shell/powerbrowser-sidecar.js`. Replace the header comment (lines 7–13) with:

```js
// Default prefs for the Theia sidecar supervisor (plan 04-04's
// TheiaService.sys.mjs) and the chrome bootstrap's dump() sentinel
// channel. Preprocessed (JS_PREFERENCE_PP_FILES, #filter substitution
// above) so the POWERBROWSER_DEV_TREE define substitutes to the repo root at
// build time. These defaults serve dev runs out of objdir/dist/bin.
// A packaged install (powerbrowser/packaging/package-linux.sh) carries its
// own theia/ and node/ beside the binary; TheiaService prefers those
// staged copies unless a user value is set (NG-063).
```

This change needs `./mach build faster` (tier 2) to reach `objdir`. It is a comment only, so there is no behaviour change.

- [ ] **Step 6: Run it and prove the package half** (live-main at merge; see the merge-time procedure):

```bash
nix develop .#firefox --command bash powerbrowser/packaging/package-linux.sh
tar -tJf objdir/dist/*-"$(sed -n 's/^Version=//p' objdir/dist/bin/application.ini)".en-US.linux-x86_64.tar.xz | grep -E '/(theia/lib/backend/main.js|node/bin/node|distribution/policies.json)$'
flock .git/pb-live.lock scripts/verify-platform.sh --only ng072-policies-packaged-webextension
flock .git/pb-live.lock scripts/verify-platform.sh --only ng063-packaged-launch
```

Expected:
- The `tar` listing prints three lines.
- `ng072` PASSes.
- `ng063` still FAILs, with `no running backend has its entry inside <prefix>` (the sidecar uses the dev tree), until Task 13 lands.

If the packaged launch reports `Cannot find module 'X'` in the backend log, stage `theia/node_modules/X` into `$STAGE/theia/node_modules/X` (Node resolution walks up from `lib/backend`). Add it to the script next to the `cp -a "$APP/lib"` line, and rerun.

- [ ] **Step 7: Update BUILD.md (R14).**
1. In "### Policy install (REQUIRED post-build step)", replace the heading with "### Policy install (dev runs only)". Replace the first paragraph with:

   > The Linux package carries `distribution/policies.json` (`powerbrowser/packaging/package-linux.sh`, NG-072). A run straight out of `objdir/dist/bin` does not, and a clobbered objdir loses any copy, so a dev run still needs:

   Keep the code block and the paragraphs after it.
2. Add a new subsection directly after "### MSIX / DMG mechanics (for the staged hosts)":
   ```markdown
   ### Linux package (NG-063, NG-072)

   `nix develop .#firefox --command bash powerbrowser/packaging/package-linux.sh`
   runs `./mach package` and adds these to the staged application directory:
   - `theia/`: the built app's `lib/` without source maps, its `package.json`, and
     `plugins/` when present;
   - `node/`: the official Node release pinned in `powerbrowser/packaging/node-runtime.json`,
     downloaded once into `.mozbuild/node-dist/` and sha256-checked against the pin;
   - `distribution/policies.json`.

   It then refreshes `precomplete` and rewrites
   `objdir/dist/<app>-<Version>.en-US.linux-x86_64.tar.xz`. A packaged install runs
   its own staged backend and Node unless a user pref names another path (NG-063).
   `objdir/dist/bin` is untouched, so dev runs keep the dev tree. Bump Node by
   rerunning the pin step in the non-GUI wave E plan, Task 10 Step 2.
   The Gecko binaries are built in the Nix shell, so the package runs where those
   store paths exist.

   Checks: `ng063-packaged-launch`, `ng072-policies-packaged-webextension`.
   ```

- [ ] **Step 8: Commit gate and commit.**

```bash
git add powerbrowser/packaging/package-linux.sh powerbrowser/packaging/node-runtime.json powerbrowser/shell/powerbrowser-sidecar.js powerbrowser/endpoint-allowlist.json docs/BUILD.md
# Run the commit-gate command. Expected output: ng070-no-spaced-name only.
git commit -m "feat(ng-e): Linux package carries the Theia app, Node and distribution/policies.json" -m "Refs: NG-063, NG-072"
```

---

### Task 11: The spaced product name leaves wave E's surfaces (NG-070, first half)

**Rows:** NG-070 (the wave E strings that do not depend on Chris's Q3 answer). Wave C's strings, the trademark notice, the error text at `crash-collector.mjs:303` and every unowned file are in Task 14.

**Files:**
- Modify:
  - `theia/extensions/telemetry/src/browser/telemetry-preferences.ts:41` (a setting description, not an error string)
  - `scripts/crash-collector.mjs:354, 402` (operator console lines, not error strings)

**Interfaces:**
- Consumes: `ng070-no-spaced-name` (Task 1).
- Produces: fewer hits. The check stays red until Task 14 finishes.

- [ ] **Step 1: Record the hit list.** Run `scripts/verify-platform.sh --only ng070-no-spaced-name 2>&1 | tee /tmp/ng070-before.txt`.

- [ ] **Step 2: Edit.**
  - `telemetry-preferences.ts:41`: the description becomes `'How much usage and error telemetry PowerBrowser sends to the configured endpoint.'`
  - `crash-collector.mjs` lines 354 and 402: replace the spaced name with `PowerBrowser`. Keep the words `listening at`, which the NG-068 check waits for.

  CLAUDE.md's copy rule governs user-facing error strings (Q3). These three strings are not error strings, so they do not wait.

- [ ] **Step 3: Prove.** Rerun the NG-070 check. Expected: the hit list no longer names `telemetry-preferences.ts` or `crash-collector.mjs:354/402`, and the rest remain. Also run the quick rows `telemetry`, `crash-collector` and `ng068-crash-extra-part`. Expected: PASS.

- [ ] **Step 4: Rebuild Theia and commit.**

```bash
nix develop .#theia --command bash -c 'cd theia && yarn build'
git add theia/extensions/telemetry/src/browser/telemetry-preferences.ts scripts/crash-collector.mjs
node scripts/scan-brand-residue.mjs
# Run the commit-gate command. Expected output: ng070-no-spaced-name only (still red on wave C's and unowned files).
git commit -m "fix(ng-e): one-word product name on wave E's surfaces" -m "Refs: NG-070"
```

---

### Task 12: CI verify passes on main (NG-074)

**Rows:** NG-074.

**Files:**
- Modify: `.github/workflows/verify.yml`

**Interfaces:**
- Consumes: `ng074-ci-green-on-main` (Task 1), `scripts/fetch-upstream.sh`, `scripts/apply-patches.sh`, and the G1 Theia install command.
- Produces: a CI job whose `--quick` run has the inputs a developer checkout has.

**Why run `34911771311` failed.** It ran on `b9412fa`, read-only via `gh run view 34911771311 --log-failed`, 2026-09-25. Each row, and the fix for it:

| Row(s) | CI cause | Fix |
|---|---|---|
| `shell-gbrowser-standin` (+self-test) | `upstream/` absent ("unreadable upstream call site(s)") | Fetch upstream and apply patches in CI |
| `gui07-strip-spike-verdict` (+self-test) | Three causes: core-diff red (no `theia/node_modules`); upstream diff unreadable; "derived ZERO 13-01 commits" from the depth-1 checkout | `fetch-depth: 0`, upstream, and yarn install |
| `gui07-mode-switch-tabs-invariant` (+self-test) | `theia/node_modules/@theia/core/lib/...` absent | yarn install |
| `gui09-dependent-window-content` (+self-test) | Built `lib/frontend/secondary-window.html` absent | Theia `yarn build` in CI |
| `tab-uris-typecheck` | `theia/node_modules/.bin/tsc` absent | yarn install |
| `ai-opencode-tracer/presets/bridge` (+self-tests) | Extension `lib/`, backend `main.js`, and the `opencode` binary absent | Held while the adapter is not composed (Task 2, R9) |

No row is excluded from `--quick` in CI. Rows that are red on main for other owners stay red there. NG-074 is therefore green only after all of these land:

- wave A's fix of `gui08-persistence-roundtrip` (its row, not this plan's)
- wave C's fix of `internals-catalogue` (its row, not this plan's)
- Chris's Q1 answer and its fix (`gui08-canvas-geometry`, `gui08-panorama-copy`)
- Task 14 after Chris's Q3 answer (`ng070-no-spaced-name`)
- every wave's recorded NG quick checks

Tiering rows out of CI would need Chris's approval under Q1. This plan tiers nothing out. The Gecko-build rows are already full-tier, and the workflow's existing trailing comment names them. Steps 1–3 wait on nobody. Only the final green run (Step 4) waits on Q1 and Q3.

- [ ] **Step 1: Edit the workflow.**

1. Raise `timeout-minutes: 30` to `timeout-minutes: 90`.
2. Under `Check out repo`, add `fetch-depth: 0` to `with:`, with the comment `# gui07-strip-spike-verdict derives the 13-01 commits from history`.
3. After the step `Check the generated tree is fresh`, insert:

```yaml
      # The inputs several --quick rows read in every developer checkout (NG-074):
      # the pinned upstream/ with patches/ applied (shell-gbrowser-standin,
      # gui07-strip-spike-verdict, ng068's report.rs), and the installed and
      # built Theia workspace (tab-uris-typecheck, gui07-mode-switch-tabs-invariant,
      # gui09-dependent-window-content, ng070's parser). Without them those rows
      # failed here for a missing input, not a defect (run 34911771311). Still no
      # Gecko toolchain and no Gecko build.
      - name: Fetch the pinned upstream and apply patches/
        run: nix develop .#theia --command bash -c 'bash scripts/fetch-upstream.sh && bash scripts/apply-patches.sh'

      - name: Install and build the Theia workspace
        run: nix develop .#theia --command bash -c 'cd theia && yarn install --ignore-scripts --frozen-lockfile && (cd node_modules/drivelist && node-gyp rebuild) && yarn build'
```

4. In the header comment, replace "the whole --quick table through the one driver scripts/verify-platform.sh -- no build, no browser, no display" with "the whole --quick table through the one driver scripts/verify-platform.sh, over the pinned upstream/ and a built Theia workspace -- no Gecko build, no browser, no display".
5. Keep the `DELIBERATELY OUT OF THIS WORKFLOW` block unchanged.

- [ ] **Step 2: Replay the workflow in a fresh clone** (local, before any push; about 30–60 min):

```bash
tmp=$(mktemp -d) && git clone --no-local ~/coding/Power-Browser-ng-e "$tmp/pb" && cd "$tmp/pb"
nix develop .#theia --command node scripts/generate.mjs
nix develop .#theia --command node scripts/generate.mjs --check
nix develop .#theia --command bash -c 'bash scripts/fetch-upstream.sh && bash scripts/apply-patches.sh'
nix develop .#theia --command bash -c 'cd theia && yarn install --ignore-scripts --frozen-lockfile && (cd node_modules/drivelist && node-gyp rebuild) && yarn build'
nix develop .#theia --command scripts/verify-platform.sh --quick 2>&1 | sed -n '/^verify-platform: summary/,$p' | grep ': FAIL$'
```

Expected: the only FAIL lines are rows with a named owner:
- the baseline rows of waves A and C and of Q1
- `ng070-no-spaced-name`
- other waves' recorded NG checks

None of the 15 rows in the table fails for a missing input. Then remove the scratch clone: `rm -rf "$tmp"`.

- [ ] **Step 3: Commit gate and commit.**

```bash
git add .github/workflows/verify.yml
# Run the commit-gate command. Expected output: ng070-no-spaced-name only.
git commit -m "fix(ng-e): CI provides upstream, history and the Theia build that --quick rows read" -m "Refs: NG-074"
```

- [ ] **Step 4 (Chris, after the last wave merges) (waits: Chris Q1) (waits: Chris Q3):** `git -C ~/coding/Power-Browser push origin main`. Then run `scripts/verify-platform.sh --only ng074-ci-green-on-main`. Expected: PASS once the run completes green. Before the Q1 and Q3 fixes land, the run is red, and it names only the `gui08-canvas-geometry`/`gui08-panorama-copy` pair and `ng070-no-spaced-name`.

---

### Task 13: The packaged sidecar runs its own backend and Node (NG-063, chrome side) — `Needs: wave-c`

**Needs: wave-c.** It edits `TheiaService.sys.mjs`, `PowerBrowserAPI.sys.mjs` and `INTERNAL-APIS.md`, which wave C owns. Start it after wave C merges and after `git -C ~/coding/Power-Browser-ng-e pull --no-rebase ~/coding/Power-Browser main` (program Task 9 Step 2).

**Rows:** NG-063.

**Files:**
- Modify:
  - `powerbrowser/shell/PowerBrowserAPI.sys.mjs`: two accessors near `getStringPref` and `getProfileDir`, around :220–260, outside every G11 region.
  - `powerbrowser/shell/TheiaService.sys.mjs`: the `backendMain` and `nodePath` resolution, around :406–440.
  - `powerbrowser/INTERNAL-APIS.md`: two rows.

**Interfaces:**
- Consumes: the staged layout from Task 10, `<GreD>/theia/lib/backend/main.js` and `<GreD>/node/bin/node`.
- Produces: `PowerBrowserAPI.getAppDir(): string`, which is GreD or `""`, and `PowerBrowserAPI.prefHasUserValue(name: string): boolean`.

- [ ] **Step 1: Confirm red** (live-main): `ng063-packaged-launch` fails with `no running backend has its entry inside <prefix> (running: …/Power-Browser/theia/applications/browser/lib/backend/main.js)`.

- [ ] **Step 2: Add the accessors** to `PowerBrowserAPI.sys.mjs`, beside `getProfileDir`:

```js
  /** The running application's directory (GreD): the install prefix of a packaged tree. "" on error. */
  getAppDir() {
    try {
      return Services.dirsvc.get("GreD", Ci.nsIFile).path;
    } catch {
      return "";
    }
  },

  /** True when the user (user.js or prefs.js) set this pref, as opposed to a build default. Never throws. */
  prefHasUserValue(name) {
    try {
      return Services.prefs.prefHasUserValue(name);
    } catch {
      return false;
    }
  },
```

Add two rows to the `INTERNAL-APIS.md` catalogue, in the table format its neighbours use. Renumber if the catalogue numbers rows, and keep `internals-catalogue` green:
- `Services.dirsvc.get("GreD", Ci.nsIFile)`, accessor `getAppDir`. Purpose: resolves a packaged install's staged `theia/` and `node/` (NG-063). Risk: none, a local path.
- `Services.prefs.prefHasUserValue`, accessor `prefHasUserValue`. Purpose: lets an explicit `user.js` sidecar path win over the staged copies. Risk: none, a local config read.

- [ ] **Step 3: Staged copies first, unless the user set a path.** In `TheiaService.sys.mjs`:

1. Replace `this._backendMain = PowerBrowserAPI.getStringPref("powerbrowser.sidecar.backendMain", "");` with:

```js
    // NG-063: a packaged install carries its own Theia beside the binary
    // (powerbrowser/packaging/package-linux.sh). Use it unless the user set a path;
    // the build default points at the dev tree, which also exists on the build host.
    const appDir = PowerBrowserAPI.getAppDir();
    const stagedMain = appDir ? `${appDir}/theia/lib/backend/main.js` : "";
    this._backendMain =
      !PowerBrowserAPI.prefHasUserValue("powerbrowser.sidecar.backendMain") && stagedMain && (await PowerBrowserAPI.pathExists(stagedMain))
        ? stagedMain
        : PowerBrowserAPI.getStringPref("powerbrowser.sidecar.backendMain", "");
```

2. Replace the two lines that begin `const configured = PowerBrowserAPI.getStringPref("powerbrowser.sidecar.nodePath", "");` and `this._nodePath = configured || …` with:

```js
    const stagedNode = appDir ? `${appDir}/node/bin/node` : "";
    const configured = PowerBrowserAPI.getStringPref("powerbrowser.sidecar.nodePath", "");
    const useStagedNode =
      !PowerBrowserAPI.prefHasUserValue("powerbrowser.sidecar.nodePath") && stagedNode && (await PowerBrowserAPI.pathExists(stagedNode));
    this._nodePath = (useStagedNode ? stagedNode : configured) || (await PowerBrowserAPI.pathSearch("node"));
```

The surrounding error handling, and the diagnostics rows `Preference` and `Resolved path`, stay as they are.

- [ ] **Step 4: Prove.** In main after merge, because the change is chrome-side (G4):
1. `./mach build faster`
2. `powerbrowser/packaging/package-linux.sh`
3. Run `ng063-packaged-launch`, `internals-boundary`, `internals-catalogue`, `shell-error-copy-no-internals` and `gui02-web-tab-live`. The last one is a dev-tree live check, and it proves dev runs still use the dev tree.

Expected: all PASS.

- [ ] **Step 5: Commit gate and commit.**

```bash
git add powerbrowser/shell/PowerBrowserAPI.sys.mjs powerbrowser/shell/TheiaService.sys.mjs powerbrowser/INTERNAL-APIS.md
# Run the commit-gate command. Expected output: ng070-no-spaced-name only (until Task 14).
git commit -m "feat(ng-e): a packaged install runs its own staged backend and Node" -m "Refs: NG-063"
```

---

### Task 14: The spaced product name leaves wave C's surfaces (NG-070, second half) — `Needs: wave-c`

**Needs: wave-c.** It edits wave C's `TheiaService.sys.mjs`, `mode-service.ts` and `setups-service.ts`. The copy-contract checks that pin these strings, and the other surfaces the NG-070 check finds, belong to no wave. CLAUDE.md's copy rule requires the spaced form in error strings. `shell-error-copy-no-internals` enforces that (`scripts/verify-shell-error-copy.mjs:318`), so no step here can pass the commit gate before Chris answers Q3 "yes". Steps 2–5 are marked `(waits: Chris Q3)`. Every other wave E task builds without them.

**Rows:** NG-070.

**Files:**
- Wave C's, after C merges:
  - `powerbrowser/shell/TheiaService.sys.mjs` (every `USER_MESSAGE` value, :42–55)
  - `theia/extensions/modes/src/browser/mode-service.ts:380, 514, 530`
  - `theia/extensions/modes/src/browser/setups-service.ts:112-158`
- Wave E's own, moved here from Task 11 because they are legal or error text under Q3:
  - `configuration.toml:47` (`trademark_notice`)
  - `theia/applications/browser/package.json` (copy-over of `powerbrowserBranding.legalNotices[0]` from `generated/theia-branding.json`)
  - `scripts/crash-collector.mjs:303` (the HTTP 404 body)
- Only with Q3 = yes (no wave owns these):
  - `scripts/verify-shell-error-copy.mjs` (the rule at :318–319, and the contract strings at :537–539, 558–559, 768–778, 792, 902, 911)
  - `scripts/verify-setup-roundtrip.mjs:72-73`
  - `scripts/verify-gui09-setups-copy.mjs:592-593`
  - `scripts/verify-dependent-window-content.mjs:96`
  - `scripts/verify-gui08-panorama-copy.mjs:72-73`
  - `theia/extensions/branding/src/browser/powerbrowser-about-dialog.tsx:27`
  - `theia/extensions/chrome-bar/src/browser/chrome-bar-widget.tsx:608, 614`
  - `theia/extensions/modes/src/browser/dependent-windows.ts:52`
  - `theia/extensions/modes/src/browser/organising-widget.ts:2061, 2067`
  - `theia/extensions/tab-uris/src/browser/web-tab.ts:72`
  - `CLAUDE.md` ("User-facing copy": "names the product as 'PowerBrowser'")

**Interfaces:**
- Consumes: `ng070-no-spaced-name` (Task 1).

- [ ] **Step 1:** Pull main into the clone after wave C merges. Rerun the NG-070 check and save its hit list.
- [ ] **Step 2 (waits: Chris Q3):** In each wave C file, replace the spaced name with `PowerBrowser` inside the string literals only. Leave comments untouched; the check ignores them. Make the same replacements in these wave E files:
  - `configuration.toml:47` becomes `trademark_notice = "PowerBrowser is a trademark of DeBIOS Foundation."` This changes legal text, and it waits on Q3.
  - Run `nix develop .#theia --command node scripts/generate.mjs`, then copy `generated/theia-branding.json`'s `legalNotices[0]` into `theia/applications/browser/package.json` → `theia.frontend.config.powerbrowserBranding.legalNotices[0]`.
  - The string at `crash-collector.mjs:303` becomes `'PowerBrowser crash collector: only POST /submit accepts crash reports. Start here: run the collector and submit a report.\n'`.
- [ ] **Step 3 (waits: Chris Q3, answer "yes"):** Apply the same replacement in every string the Q3-gated files list. Change `verify-shell-error-copy.mjs:318-319` to require `PowerBrowser`. Change the `CLAUDE.md` copy rule to the one-word form.
- [ ] **Step 4 (waits: Chris Q3):** Rebuild Theia, then run these quick checks:
  - the NG-070 check
  - the copy-contract rows `shell-error-copy-no-internals`, `gui09-setup-roundtrip`, `gui09-setups-copy`, `gui09-dependent-window-content` and `gui08-panorama-copy`, each with its self-test
  - `theia-branding`, `verify-trademark-surface` and `branding-preflight`, each with its self-test
  - `crash-collector`

  Expected:
  - `ng070-no-spaced-name` PASSes.
  - Every contract row is as green as it was before the edit. `gui08-panorama-copy` is red for Q1 reasons (waits: Chris Q1), and it must not gain a new failure.
  - If `branding-preflight` or `verify-trademark-surface` pins the old notice text as a value in `inventory/brand-tokens.json` (`brand_display_expectations`), report it to the controller. That file changes only for counts.
- [ ] **Step 5: Commit gate and commit (waits: Chris Q3).** Stage each file you changed by name. The commit message is `fix(ng-e): one-word product name on the remaining user-visible surfaces`, with body `Refs: NG-070`.

---

### Task 15: A downstream build never ships PowerBrowser's own update host (NG-064, R11)

**Waits on the controller (Q12).** Seven expected-pass downstream fixtures state no `[urls] update`. They live under the archived 07 and 09 phase fixture roots, which `check_verify_downstream_fixtures` globs. Once this refusal lands they inherit the platform host and turn `verify-downstream-fixtures` red. The controller adds `[urls]` / `update = "https://updates.example.org/update.xml"` to each of them in main (G3), and this clone pulls main before Step 3. This task does not depend on wave C.

**Rows:** NG-064.

**Files:**
- Modify: `scripts/generate.mjs` (`resolveConfig`, `generate.mjs:3981`, and the generator's own `--self-test` fixtures that pass a `PB_CONFIG_DIR` manifest)

**Interfaces:**
- Consumes: `resolveConfig(defaultsPath, downstreamPath)`, which returns `{ failures, config }`. `downstreamPath` is defined only for a `PB_CONFIG_DIR` build, a downstream.
- Produces: a failure naming `urls.update` when a downstream's resolved update host equals the platform manifest's own. It fails closed, and `node scripts/generate.mjs` then writes nothing.

- [ ] **Step 1: Confirm red.** After Task 7, the R11 arm of `ng064-update-url-from-manifest` reports `a downstream manifest without [urls] update generated cleanly`. It is visible in a clone with a configure-only objdir. Otherwise the controller sees it at merge.

- [ ] **Step 2: Add the refusal.** In `resolveConfig`, directly before its final `return`, add the block below. Read the function first; adapt the two names if its return value is not `{ failures, config }`.

```js
    // R11 (NG-064): a downstream build (PB_CONFIG_DIR) must state its own update address.
    // Otherwise it inherits the platform's host and its users are offered the platform's
    // updates. The platform host is derived from the platform manifest, never typed here.
    if (downstreamPath !== undefined) {
        const platformUpdate = resolveConfig(defaultsPath, undefined).config?.urls?.update;
        const update = config?.urls?.update;
        if (!isUnset(update) && !isUnset(platformUpdate) && new URL(update).host === new URL(platformUpdate).host) {
            failures.push(
                `urls.update is ${JSON.stringify(update)}, the platform's own update address, and a downstream build must not ship it. `
                + `Write your own https update address as [urls] update in ${MANIFEST_NAME}, then run: ${RERUN}`,
            );
        }
    }
```

If `--self-test` then fails on a `PB_CONFIG_DIR` fixture string inside `generate.mjs`, add `[urls]` / `update = "https://updates.example.org/update.xml"` to that fixture's TOML. Change nothing else.

- [ ] **Step 3: Prove** (after the controller's fixture edit is in the clone):

```bash
nix develop .#theia --command node scripts/generate.mjs --self-test
scripts/verify-platform.sh --only verify-downstream-fixtures
scripts/verify-platform.sh --only verify-downstream-fixtures-self-test
nix develop .#theia --command node scripts/generate.mjs && nix develop .#theia --command node scripts/generate.mjs --check
```

Expected: all PASS. At merge, `ng064-update-url-from-manifest` passes its R11 arm.

- [ ] **Step 4: Commit gate and commit.**

```bash
git add scripts/generate.mjs
# Run the commit-gate command. Expected output: ng070-no-spaced-name only.
git commit -m "feat(ng-e): generate refuses a downstream build that keeps the platform's update host" -m "Refs: NG-064"
```

---

## Merge-time live-main procedure (controller, program Task 11 for wave E)

Wave E changes `.mozconfig` and a `moz.configure` include, and adds updater and NSIS patches. The `live-main` checks therefore need a tier-3 build in main after the merge:

```bash
cd ~/coding/Power-Browser
test -z "$(git status --short)"
git -C upstream checkout -- . && bash scripts/apply-patches.sh                # 010, 020, 030, 040
nix develop .#theia --command node scripts/generate.mjs && nix develop .#theia --command node scripts/generate.mjs --check
nix develop .#theia --command bash -c 'cd theia && yarn build'
nix develop .#firefox --command bash -c 'cd upstream && MOZCONFIG=../.mozconfig ./mach build'   # tier 3, 39-54 min measured
test -x objdir/dist/bin/updater && grep -q "'MOZ_VERIFY_MAR_SIGNATURE'" objdir/config.status
nix develop .#firefox --command bash powerbrowser/packaging/package-linux.sh
test -f ~/.config/powerbrowser-release/mar-key/key4.db && test -s ~/.config/powerbrowser-release/mar-key/password.txt    # Task 8 Step 1 (Chris) done
```

Then run program Task 11 Step 2 over `docs/non-gui/checks-wave-e.tsv`. Notes for the controller:

- `objdir-release/` becomes stale after the `.mozconfig` change. No wave E check reads it. Rebuild it only if a release-variant row is run.
- Per R1, field 2 of each TSV line is the ledger test ref (`scripts/verify-ng-NNN-<slug>.mjs::<label>`), and field 3 runs that same file. Use field 2 for `--test-ref`, not `scripts/verify-platform.sh --only <label>`: `ledger-amend.py`'s `check_key` would read that whole string as one file path.
- `package-linux.sh` downloads the pinned Node release from `nodejs.org` once, into the git-ignored `.mozbuild/node-dist/`, the first time main packages.

## Self-review

- **Coverage.** All 13 rows are cited by the tasks that build them: NG-051 in Task 2; NG-063 in Tasks 10 and 13; NG-064 in Tasks 7 and 15; NG-065 in 8; NG-066 in 9; NG-067 in 4; NG-068 in 3; NG-069 in 5; NG-070 in 11 and 14; NG-071 and NG-073 in 6; NG-072 in 10; NG-074 in 12. Task 1 carries one check file per row (R1).
- **Rulings.**
  - R1: file names and the TSV (Task 1).
  - R9: held ai-opencode rows (Task 2).
  - R10: the aus5 reading (NG-064 check).
  - R11: Task 15 plus the NG-064 check's arm.
  - R12: password file (Task 8 and the NG-065 check).
  - R13: official Node pin, fetch, `nodejs.org` row and the NG-063 check.
  - R14: doc steps in Tasks 2, 6, 7, 8, 9 and 10.
  - R15: allowlist reasons (Tasks 5 and 10).
  - R16: Task 9.
- **Waiting steps.** Only Task 12 Step 4 `(waits: Chris Q1/Q3)`, Task 14 Steps 2–5 `(waits: Chris Q3)` and Task 15 (controller, Q12) wait. Every other step builds without them.
- **Ownership.** Every file set is inside wave E's list, apart from these, which are marked:
  - Tasks 13–14 are `Needs: wave-c`.
  - Task 14's no-owner files wait for Q3.
  - `powerbrowser/identity.configure.comparand` is a generated-output copy (Task 7).
  - The Q12 fixture edit under `.planning/` is the controller's (G3).
- **Types.** These names are used identically across tasks:
  - `extractPackage`, `configStatus` and `builtVersion` (`built-tree.mjs`)
  - `runDeclaredPluginStep` (`scratch-app.mjs`)
  - the event names `frontend.uncaught-error` and `frontend.unhandled-rejection` (Task 4 ↔ the check)
  - `EXTRA_PART_NAME`
  - the channel `<app_basename>-default` (Task 8 ↔ the check, which reads it back from `config.status`)
- **Review Focus.** Each line has its test in the owning task's check.
- **Skipped on purpose.**
  - A backend-module gate for NG-051: the dependency is the gate.
  - A second MAR key (R12).
  - Blanking the two upstream aus5 pref defaults by patch. Their effective values are already blank, and the check reads effective values (R10).
