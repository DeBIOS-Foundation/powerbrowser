# Wave C — Modes, Setups, Windows and the Chrome↔Theia Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build rows NG-029 to NG-040 of `docs/non-gui/GAPS.md`: setups restore through ModeService without duplicate tabs and with their dock layout, reachable from the palette and a menu; quitting saves the session and the next launch restores it, together with the mode and layouts, across a changed backend port; in-shell web tabs keep their back/forward history across a restart; custom modes save their layout and the shipped defaults are data; closing the core window quits; the actor refuses every sender except the shell's own Theia frame on the sidecar's port; the internals catalogue covers every touchpoint and its line references match the file.

**Architecture:** Task 1 writes one failing check per row, registered in `scripts/verify-platform.sh`, all driving real entry points (the command registry, the actor channel, the core window's close button in the chrome document, a real quit and relaunch on one profile). The build then runs in dependency order: the catalogue tooling first (so every later chrome edit keeps it green), the two chrome security/lifecycle fixes (sender wall, core-close quit), the Theia-side setups and modes rows, then the quit-flush protocol with a profile-scoped store for Theia's `StorageService` (chrome writes it, so it survives the per-launch origin), the session snapshot on top of it, and last the web-tab history row that needs wave A's stable tab key.

**Tech Stack:** Gecko chrome modules (`powerbrowser/shell/*.sys.mjs`, `IOUtils`, JSWindowActor pair, `SessionHistory.sys.mjs` / `SessionStoreUtils`), Eclipse Theia 1.74.1 extensions `@powerbrowser/modes` and `@powerbrowser/tab-uris` (TypeScript, inversify, Lumino `DockPanel`), WebDriver BiDi through `scripts/lib/firefox-bidi.mjs`'s `withFirefoxPage` (with its kept `profileDir`, main `f4818a0`) including `"moz:scope": "chrome"`, node check scripts under `scripts/`.

**Spec:** `docs/non-gui/GAPS.md` rows NG-029 to NG-040 (evidence re-verified against the tree on 2026-09-25, see "Evidence as found"); the program plan's G1–G11 and Review Focus (GUI-research `docs/superpowers/plans/2026-09-25-powerbrowser-non-gui.md`); `docs/non-gui/decisions.md` (D1–D7 and the controller rulings R1, R3, R5, R17); wave A's plan, Task 2 Produces block (for NG-034); PowerBrowser `CLAUDE.md`; `.planning/notes/browser-window-model.md`; `.planning/milestones/v1.3-phases/14-modes-windows-setups/14-UI-SPEC.md` and `14-CONTEXT.md`; `.planning/REQUIREMENTS.md` GUI-07, GUI-09; `.planning/GUI-DEFECTS.md` item 6.

## Global Constraints

- C1 Work in `~/coding/Power-Browser-ng-c`, branch `ng-c`, created and installed per G1 (`git clone ~/coding/Power-Browser ~/coding/Power-Browser-ng-c && git -C ~/coding/Power-Browser-ng-c switch -c ng-c`, then `nix develop .#theia --command bash -c 'cd theia && yarn install --ignore-scripts --frozen-lockfile && (cd node_modules/drivelist && node-gyp rebuild) && yarn build'`). Never a bare `yarn install`.
- C2 PowerBrowser hard rules (G2): no Theia core edit (`scripts/diff-theia-core.sh`); no Gecko change (this wave needs none); Firefox internals only in `powerbrowser/shell/PowerBrowserAPI.sys.mjs`, plus the actor child's catalogued Xray waiver (Task 2), each with an `INTERNAL-APIS.md` row; brand tokens only in `inventory/brand-tokens.json` (`git add` first, then `node scripts/scan-brand-residue.mjs` exits 0); every new check is a row in `scripts/verify-platform.sh`; no internal identifier in user-facing text; no SQLite write (the one writer stays chrome-side and this wave adds none).
- C3 Never edit `ledger/`, `docs/non-gui/GAPS.md` or `.planning/` (G3).
- C4 Ownership (G11). Edit only: `theia/extensions/modes/src/browser/{setups-service,setups-commands,mode-service}.ts`; `powerbrowser/shell/TheiaService.sys.mjs`; `powerbrowser/shell/powerbrowser.js`; `powerbrowser/shell/GroupActor*.sys.mjs`; `theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts`; in `PowerBrowserAPI.sys.mjs` only the sender-check region (`groupSenderSpecIsTheia` through `groupSenderIsTheia`, top-level), `registerGroupActor` and the methods added directly after it, and the window/quit helpers from `onQuitGranted` through `openStockTab`; `powerbrowser/INTERNAL-APIS.md`; `scripts/check-internals-boundary.sh`; `scripts/verify-platform.sh` (registry rows, Task 1 only); new check files under `scripts/`; `docs/non-gui/checks-wave-c.tsv`; `docs/non-gui/questions-wave-c.md`. Items outside that list: Q1 and Q3 in `docs/non-gui/questions-wave-c.md` (three existing gate scripts that encode the shape of this wave's files; the new file `theia/extensions/tab-uris/src/browser/profile-storage.ts`); `PowerBrowserGroupParent.receiveMessage`, one branch, which decisions.md R17 settles (wave B edits the same method; the second merge keeps both); and Task 12's `webTabOpen` edit, wave A's region, which is why Task 12 is `Needs: wave-a`.
- C5 Wave E changes the user-visible "Power Browser" strings in `mode-service.ts` (the three `flash(...)` strings in `saveCurrentAsMode`, `applyStoreText`, `handleCorruptStore`) and `TheiaService.sys.mjs` (`USER_MESSAGE`) after this wave merges. Leave every one of them byte-identical.
- C6 Every check file (one per row, `scripts/verify-ng-NNN-<slug>.mjs`, decisions.md R1) and every `verify-platform.sh` row is written in Task 1. Later tasks change no `verify-platform.sh` row, no `scripts/verify-ng-*` file and no `scripts/lib/pb-relaunch.mjs`: `lock-checks` digests the check files (program Task 8). Running `verify-ng-040-…mjs --fix` edits the catalogue, never the check.
- C7 Commits: `test(ng-c): <summary>` (Task 1), `feat(ng-c): …` or `fix(ng-c): …` otherwise; body `Refs: NG-NNN[, NG-NNN]`; one commit per task; every `git add` names its paths.
- C8 Commit gate before every commit (decisions.md), run from the clone root:

      scripts/verify-platform.sh --quick 2>&1 | sed -n '/^verify-platform: summary/,$p' \
        | grep ': FAIL$' | awk '{print $1}' | sed 's/:$//' | sort \
        | comm -13 docs/non-gui/quick-baseline.txt -

  It prints the new failures. Allowed: nothing, or only `ng-039-internals-detects-waivers` and `ng-040-internals-catalogue-lines` before Task 2 commits. From Task 2 on it must print nothing, and `internals-catalogue` (a baseline row) must be green.
- C9 Lanes (G4). A `live-clone` check runs in the clone after `nix develop .#theia --command bash -c 'cd theia && yarn build'`:

      PB_FIREFOX_BIN=$HOME/coding/Power-Browser/objdir/dist/bin/powerbrowser \
      PB_BACKEND_MAIN=$PWD/theia/applications/browser/lib/backend/main.js \
      flock $HOME/coding/Power-Browser/.git/pb-live.lock scripts/verify-platform.sh --only <label>

  (or the row's own command from `docs/non-gui/checks-wave-c.tsv`, `node scripts/verify-ng-NNN-<slug>.mjs`).

  A `live-main` check needs this wave's chrome-side code, which only the main checkout serves (objdir symlinks into it): the task reports it as `live-main pending: <label>` and the controller runs it after merge (program Task 9 Step 3).
- C10 New user-facing copy in this wave is exactly two strings, both command labels (NG-031): **"Restore Setup"** and **"Open Tab in Own Window"**. No other new string reaches a user surface (`gui09-setups-copy` and `shell-error-copy-no-internals` enforce it). Log lines and thrown diagnostics that only reach the D-106 ring buffer or the console are not copy.
- C11 From Task 2 on, a task that edits `PowerBrowserAPI.sys.mjs` or `GroupActorChild.sys.mjs` runs `node scripts/verify-ng-040-internals-catalogue-lines.mjs --fix` (renumbers rows its edit shifted), writes a catalogue row for each new touchpoint `bash scripts/check-internals-boundary.sh --catalogue` names, and ends with `scripts/verify-platform.sh --only ng-040-internals-catalogue-lines` green.
- C12 Linux only; paths join with `/` (the tree already does, `TheiaService.sys.mjs` `_stateFilePath`).

## Review Focus

- A restart on the same profile with the backend on a different port (TheiaService.sys.mjs:602 asks for port 0): session, mode, layouts and web-tab history must come back. Pinned by ng-032, ng-033 and ng-034, which hold the first launch's port while the second launch starts and fail if the port did not change.
- A hostile local page: a 127.0.0.1 page on another port in a selected stock tab, and a page on the sidecar's own port in a stock tab, send actor requests. Both must be refused while the shell's own frame is still served. Pinned by ng-038 (positive control, two hostile senders, and the group store read back).
- A frontend that never answers the quit flush (hung page, error screen) must not hold the quit. Pinned by ng-033's third launch, which blocks the flush push in the page and requires the app to exit within 20 s.
- A Theia frontend with no shell chrome behind it (the dev app on `http://localhost:3000`, which the phase-02 checks drive) must start without waiting on the actor and keep its storage. Pinned in Task 10 by running `gui01-command-registered`, which loads the dev app in the built browser.
- Data written before this wave: a `setups.json` row with no dock tree and no per-window mode, and a `modes.json` row with no `furniture` and no `views`, must still load and restore as before. Pinned by the legacy rows inside ng-036 and ng-035.

## Evidence as found (2026-09-25, tree `a622f39`)

- NG-029: `setups-service.ts:438` and `:441` call `this.perspectives.switchPerspective(...)`; `applyLastSession` (`:826-843`) reaches the same body. Same class as GUI-DEFECTS item 6.
- NG-030: `placeTabs` re-opens the active tab (`:666-667`); `WebTabOpenHandler.openUrl` mints `wt-<session>-<n>` per call (`web-tab.ts:643`). Nothing checks what is already open.
- NG-031: `SETUPS_RESTORE` and `SETUPS_OPEN_DEPENDENT` have no `label` (`setups-commands.ts:31-37`); the modes extension binds no `MenuContribution` anywhere.
- NG-032: `onStop` only calls `persistLastSession` (`:364-368`). On quit, `TheiaService.stop()` runs on `quit-application-granted` (`:211`) and kills the backend before the page unloads (`nsAppStartup::Quit` notifies granted, then `CloseAllWindows()`), so that write cannot land either.
- NG-033: `_spawnAndGate` asks for port 0 on the first spawn (`TheiaService.sys.mjs:602`); Theia's `StorageService` is `LocalStorageService` (origin-scoped); `mode-service.ts:562-592` and stock `ShellLayoutRestorer` read `perspective-layouts` from it.
- NG-034: the web-tab `WidgetFactory` refuses any id not minted this session (`tab-uris-frontend-module.ts:107`); the shell window is not `navigator:browser`, so sessionstore never sees overlays.
- NG-035: `CustomModeSnapshot` is three booleans (`mode-service.ts:76-81`); furniture is `target === 'coding'` (`:306`); `visibilityFor` branches on ids (`:403-412`).
- NG-036: `snapshotWindows` records one flat URI list per window and one setup-level `modeId` (`:538-563`).
- NG-037: the close button calls `window.close()` (`powerbrowser.js:356`); the backend stops only on quit (`TheiaService.sys.mjs:211`).
- NG-038: `matches: ["http://127.0.0.1/*"]` (`PowerBrowserAPI.sys.mjs:1705`; MatchPattern compares hosts, not ports); `groupSenderIsTheia` (`:150-166`) accepts any `primary="true"` embedder, which stock tabbrowser sets on the selected tab.
- NG-039: `wrappedJSObject` at `GroupActorChild.sys.mjs:117, 136` and `drawSnapshot` at `PowerBrowserAPI.sys.mjs:1544` match no `FORBIDDEN_PATTERNS` entry (`check-internals-boundary.sh:38-65`); `IOUtils.` (9 lines), `ChromeUtils.generateQI` (2) and the actor base classes are also undetected.
- NG-040: `check-internals-boundary.sh --catalogue` reports 13 occurrences with no row (`:2313 … :2777`); 15 rows point at a line that no longer holds their internal, and the `getBrowserState` row names `projectSessionStoreTabs` while the call sits in `parseSessionStoreTabRows`.

## Task order

| Task | Rows | Lane of its check | Needs |
| --- | --- | --- | --- |
| 1 Checks first | NG-029 … NG-040 | all | — |
| 2 Catalogue: detect every touchpoint, line references match | NG-039, NG-040 | quick | — |
| 3 Actor sender wall: shell frame, sidecar port | NG-038 | live-main | — |
| 4 Closing the core window quits | NG-037 | live-main | — |
| 5 Setup restore activates its mode through ModeService | NG-029 | live-clone | — |
| 6 Setup restore opens each tab once | NG-030 | live-clone | — |
| 7 Restore Setup and Open Tab in Own Window in palette and menu | NG-031 | live-clone | — |
| 8 Setups record dock/split layout, tab order, per-window mode | NG-036 | live-clone | — |
| 9 Mode rules as data; custom modes save their layout | NG-035 | live-clone | — |
| 10 Profile store for Theia storage; quit flush | NG-033 | live-main | — |
| 11 Quit saves the session; launch restores it | NG-032 | live-main | — |
| 12 Web tabs keep back/forward history across restart | NG-034 | live-main | `Needs: wave-a` |

Tasks 2–11 need nothing from another wave. Task 12 runs after wave A's Task 2 (NG-001 … NG-005) has merged into `main` and `git -C ~/coding/Power-Browser-ng-c pull --no-rebase ~/coding/Power-Browser main` has brought it in.

## Files

Created:

- `scripts/lib/pb-relaunch.mjs` — shared helpers over `withFirefoxPage` (kept profile and private config home, the product's own quit through the chrome document, page probes, served pages, a port holder).
- `scripts/verify-ng-029-setup-restore-mode.mjs`, `scripts/verify-ng-030-setup-restore-dedup.mjs`, `scripts/verify-ng-031-setup-commands-reachable.mjs`, `scripts/verify-ng-032-quit-restores-session.mjs`, `scripts/verify-ng-033-layout-survives-relaunch.mjs`, `scripts/verify-ng-034-web-tab-history-restart.mjs`, `scripts/verify-ng-035-custom-mode-layout.mjs`, `scripts/verify-ng-036-setup-dock-layout.mjs`, `scripts/verify-ng-037-core-close-quits.mjs`, `scripts/verify-ng-038-actor-sender-wall.mjs` — one live check per row.
- `scripts/verify-ng-039-internals-waivers.mjs` — NG-039's check.
- `scripts/verify-ng-040-internals-catalogue-lines.mjs` — NG-040's check, with `--fix` and `--self-test`.
- `docs/non-gui/checks-wave-c.tsv` — the controller's record-fail input, in R1's three-field form.
- `theia/extensions/tab-uris/src/browser/profile-storage.ts` — `ProfileStorageService` and `ShellStateFlushContribution` (Task 10; Q3).

Modified: the owned files in C4, plus `scripts/verify-mode-switch-tabs-invariant.mjs` (Task 5), `scripts/verify-setup-roundtrip.mjs` (Tasks 7, 8), `scripts/verify-mode-toggle-commands.mjs` (Task 9) — Q1.

---

### Task 1: Checks first (NG-029 … NG-040)

Every row of this wave gets one check named after its ID, in its own file `scripts/verify-ng-NNN-<slug>.mjs` (decisions.md R1), registered in `scripts/verify-platform.sh`, failing on the current tree for the reason stated. Rows: NG-029, NG-030, NG-031, NG-032, NG-033, NG-034, NG-035, NG-036, NG-037, NG-038, NG-039, NG-040.

**Files:**

- Create: `scripts/lib/pb-relaunch.mjs` (shared helpers, R1)
- Create: `scripts/verify-ng-029-setup-restore-mode.mjs`, `scripts/verify-ng-030-setup-restore-dedup.mjs`, `scripts/verify-ng-031-setup-commands-reachable.mjs`, `scripts/verify-ng-032-quit-restores-session.mjs`, `scripts/verify-ng-033-layout-survives-relaunch.mjs`, `scripts/verify-ng-034-web-tab-history-restart.mjs`, `scripts/verify-ng-035-custom-mode-layout.mjs`, `scripts/verify-ng-036-setup-dock-layout.mjs`, `scripts/verify-ng-037-core-close-quits.mjs`, `scripts/verify-ng-038-actor-sender-wall.mjs`, `scripts/verify-ng-039-internals-waivers.mjs`, `scripts/verify-ng-040-internals-catalogue-lines.mjs`
- Create: `docs/non-gui/checks-wave-c.tsv`
- Modify: `scripts/check-internals-boundary.sh` (a `--scan <dir>` mode only; no pattern change)
- Modify: `scripts/verify-platform.sh` (registry rows only)

**Interfaces:**

- Consumes: `withFirefoxPage(url, callback, { profileDir })` from `scripts/lib/firefox-bidi.mjs` (main `f4818a0`, R3: a caller-owned profile kept across launches; `PB_FIREFOX_BIN` and an appended `PB_BACKEND_MAIN` override apply); its callback's `evaluate`, `evaluateIn`, `send`, `waitFor`; `window.theia.container`; BiDi `browsingContext.getTree` with `"moz:scope": "chrome"` and `script.evaluate` on a chrome context, which `--remote-allow-system-access` admits (upstream `remote/webdriver-bidi/modules/root/browsingContext.sys.mjs:899`, `script.sys.mjs:469`).
- Produces (the contracts later tasks build to; the checks already assert them):
  - Quit-flush push: chrome sends `PowerBrowserWebTabState` with `{ kind: 'flushShellState', flushId: string }`; the frontend acknowledges with a `PowerBrowserGroupRequest` of `{ kind: 'shellFlushed', flushId }` (Task 10).
  - `setups.json` window rows gain `modeId: string | null` and `dock?: { main: SetupDockNode | null; bottom: SetupDockNode | null }`, where `SetupDockNode = { type: 'tabs'; tabs: string[]; current: string | null } | { type: 'split'; orientation: 'horizontal' | 'vertical'; sizes: number[]; children: SetupDockNode[] }` (Task 8).
  - `modes.json` custom rows gain `furniture: boolean` and `views: { left: string[]; right: string[]; bottom: string[] }`; `mode-service.ts` exports `SHIPPED_MODE_RULES`, one row per shipped id on one line (Task 9).
  - `scripts/check-internals-boundary.sh --scan <dir>` runs the boundary scan over `<dir>` and exits 1, naming each `file:line: pattern` offense on stderr.
  - `docs/non-gui/checks-wave-c.tsv` in R1's three-field form.

- [ ] **Step 1: Write the shared helpers**

Create `scripts/lib/pb-relaunch.mjs`:

```js
// scripts/lib/pb-relaunch.mjs
//
// Non-GUI wave C (NG-029..NG-038): helpers for the wave's live checks, on top
// of firefox-bidi.mjs's withFirefoxPage, which owns the launch, the BiDi
// session and process hygiene. What this file adds:
//   - a kept profile (withFirefoxPage's `profileDir`, f4818a0) and a private
//     config home per check, so a check can quit and relaunch on the SAME
//     profile (NG-032..NG-034) and setups.json / modes.json start empty;
//   - the product's own quit: the core window's close button, or the close
//     event the desktop's close sends to the window, driven in the chrome
//     document through BiDi's "moz:scope": "chrome" tree (withFirefoxPage
//     launches with --remote-allow-system-access);
//   - page-realm probes over window.theia.container, served pages, a port
//     holder (the Review Focus port change), and constants derived from the
//     tree so no check re-spells an id.

import { lstatSync, readFileSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer as createHttpServer } from 'node:http';
import { createServer as createNetServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withFirefoxPage } from './firefox-bidi.mjs';

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SHELL_DOCUMENT_URL = 'chrome://powerbrowser/content/powerbrowser.xhtml';

/** A `NAME = '<value>'` constant read out of a source file. */
export function sourceConst(rel, name) {
    const match = new RegExp(`\\b${name}\\s*=\\s*'([^']+)'`).exec(readFileSync(join(REPO_ROOT, rel), 'utf8'));
    if (!match) {
        throw new Error(`pb-relaunch: ${rel} no longer declares ${name}, so the check cannot derive it`);
    }
    return match[1];
}

/** The first capture group of `regex` in a source file. */
export function sourceMatch(rel, regex) {
    const match = regex.exec(readFileSync(join(REPO_ROOT, rel), 'utf8'));
    if (!match) {
        throw new Error(`pb-relaunch: ${rel} no longer matches ${regex}, so the check cannot derive its expectation`);
    }
    return match[1];
}

export const WEB_TAB_FACTORY_ID = sourceConst('theia/extensions/tab-uris/src/browser/web-tab.ts', 'WEB_TAB_FACTORY_ID');

/** Page-realm DI lookup by binding name, the helper every live check in this tree inlines. */
export const GET_BY_NAME = `function __getByName(container, name) {
    let found;
    container._bindingDictionary.traverse(key => {
        if (found) return;
        const keyStr = typeof key === 'symbol' ? key.toString() : (key && key.name) || String(key);
        if (keyStr === 'Symbol(' + name + ')' || keyStr === name) found = key;
    });
    if (!found) throw new Error('DI binding not found for identifier name: ' + name);
    return container.get(found);
}`;

/**
 * One page-realm expression around `body`, an async function body returning
 * a JSON-safe object. In scope: `container`, `get(name)`, `sleep(ms)`,
 * `until(predicate, ms)`, `webTabs()`. A throw becomes `{ error }`.
 */
export function probeExpression(body) {
    return `(async () => {
        ${GET_BY_NAME}
        const container = window.theia.container;
        const get = name => __getByName(container, name);
        const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
        const until = async (predicate, ms) => {
            const end = Date.now() + ms;
            for (;;) {
                try { if (await predicate()) return true; } catch (e) { /* keep polling */ }
                if (Date.now() > end) return false;
                await sleep(100);
            }
        };
        const webTabs = () => get('ApplicationShell').getWidgets('main').filter(widget => {
            const description = get('WidgetManager').getDescription(widget);
            return !!description && description.factoryId === ${JSON.stringify(WEB_TAB_FACTORY_ID)};
        });
        let result;
        try {
            result = await (async () => { ${body} })();
        } catch (e) {
            result = { error: 'probe threw: ' + e };
        }
        return JSON.stringify(result === undefined ? null : result);
    })()`;
}

/** Runs `body` in the shell's Theia frame and returns its parsed result. */
export async function probe(app, body) {
    const text = await app.evaluate(probeExpression(body));
    if (typeof text !== 'string') {
        throw new Error('the page probe returned nothing (the frontend is gone or the script did not parse)');
    }
    return JSON.parse(text);
}

export async function pollFor(fn, timeoutMs, what) {
    const end = Date.now() + timeoutMs;
    for (;;) {
        let value;
        try {
            value = await fn();
        } catch {
            value = undefined;
        }
        if (value) {
            return value;
        }
        if (Date.now() > end) {
            throw new Error(`timed out after ${timeoutMs} ms waiting for ${what}`);
        }
        await new Promise(resolve => setTimeout(resolve, 250));
    }
}

/**
 * Holds `port` on 127.0.0.1 so the next launch's port-0 spawn cannot be given
 * it -- the Review Focus restart condition, where the backend port changes
 * between launches. Retries while the stopped backend still owns the port.
 */
export async function holdPort(port) {
    return pollFor(async () => {
        const server = createNetServer();
        await new Promise((resolve, reject) => {
            server.once('error', reject);
            server.listen(port, '127.0.0.1', resolve);
        });
        return () => new Promise(resolve => server.close(() => resolve()));
    }, 10000, `port ${port} to be free to hold`);
}

/** Serves `pages` (`{ '/a': { title, body } }`) on 127.0.0.1; `url(path)` builds a served URL. */
export async function servePages(pages) {
    const server = createHttpServer((request, response) => {
        const page = pages[new URL(request.url, 'http://127.0.0.1').pathname];
        if (!page) {
            response.writeHead(404, { 'content-type': 'text/plain' });
            response.end('not found');
            return;
        }
        response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        response.end(`<!doctype html><html><head><title>${page.title}</title></head><body>${page.body ?? ''}</body></html>`);
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    return { origin, url: path => `${origin}${path}`, close: () => new Promise(resolve => server.close(() => resolve())) };
}

/** True while the profile's `lock` symlink exists (Gecko removes it when the browser exits). */
function profileLocked(profileDir) {
    try {
        lstatSync(join(profileDir, 'lock'));
        return true;
    } catch {
        return false;
    }
}

/**
 * A kept profile and a private config home. withFirefoxPage's spawn inherits
 * process.env, so every launch of this check uses this config home. The
 * profile's user.js turns off crash-resume: a launch the check had to kill
 * (an app that did not quit) must not bring its stock windows back into the
 * next launch, where they would sit beside the shell's own context.
 * withFirefoxPage appends its own override to this file (f4818a0).
 */
export async function makeProfile() {
    const profileDir = await mkdtemp(join(tmpdir(), 'pb-ng-c-profile-'));
    const configHome = await mkdtemp(join(tmpdir(), 'pb-ng-c-config-'));
    await writeFile(join(profileDir, 'user.js'), 'user_pref("browser.sessionstore.resume_from_crash", false);\n');
    process.env.XDG_CONFIG_HOME = configHome;
    return {
        profileDir,
        configHome,
        dispose: async () => {
            await rm(profileDir, { recursive: true, force: true });
            await rm(configHome, { recursive: true, force: true });
        },
    };
}

/**
 * Launches the shell on `profile` (kept between calls), waits for its Theia
 * frontend to reach 'ready', and runs `fn(app)`. `app`: evaluate(expr) in the
 * Theia frame, evaluateIn(context, expr), send(method, params),
 * contexts(scope?), chrome (the shell document's context), port (the
 * sidecar's), quit({ how, timeoutMs }) -> 'exited' | 'timeout'. Returns what
 * `fn` returns. withFirefoxPage stops a browser that is still running and
 * leaves the profile in place.
 */
export async function withShell(profile, fn) {
    return withFirefoxPage('', async ({ evaluate, evaluateIn, send, waitFor }) => {
        await waitFor('window.theia && window.theia.container ? true : false', { timeoutMs: 120000 });
        await waitFor(`(() => { try { ${GET_BY_NAME}
            return __getByName(window.theia.container, 'FrontendApplicationStateService').state === 'ready';
        } catch (e) { return false; } })()`, { timeoutMs: 120000 });
        const contexts = async scope =>
            (await send('browsingContext.getTree', scope ? { 'moz:scope': scope } : {})).contexts
                .map(entry => ({ context: entry.context, url: entry.url }));
        const chrome = (await pollFor(async () => (await contexts('chrome')).find(entry => entry.url === SHELL_DOCUMENT_URL),
            30000, 'a chrome context for the shell document')).context;
        const hadLock = profileLocked(profile.profileDir);
        const app = {
            evaluate,
            evaluateIn,
            send,
            contexts,
            chrome,
            port: Number(await evaluate('location.port')),
            async quit({ how = 'button', timeoutMs = 30000 } = {}) {
                const expression = how === 'close-event'
                    ? `window.dispatchEvent(new Event('close', { cancelable: true })); true`
                    : `document.getElementById('powerbrowser-window-close').click(); true`;
                // Not awaited: the chrome document may go away before the call returns.
                evaluateIn(chrome, expression).catch(() => undefined);
                try {
                    await pollFor(async () => {
                        const socketClosed = await send('browsingContext.getTree', {}).then(() => false, () => true);
                        return socketClosed && !(hadLock && profileLocked(profile.profileDir));
                    }, timeoutMs, 'the browser to exit');
                    return 'exited';
                } catch {
                    return 'timeout';
                }
            },
        };
        return fn(app);
    }, { profileDir: profile.profileDir });
}

/**
 * Runs one check: a fresh profile, `body({ profile, fail, defer })`, cleanup,
 * then `<label>: PASS` (exit 0) or one `<label>: FAIL -- <reason>` line per
 * failure (exit 1). A thrown error is reported as `harness: …`: the check
 * could not drive the product, which is a red that is not the row's.
 */
export async function runCheck(label, body) {
    const failures = [];
    const cleanups = [];
    const profile = await makeProfile();
    try {
        await body({ profile, fail: reason => failures.push(reason), defer: fn => cleanups.push(fn) });
    } catch (error) {
        failures.push(`harness: ${error.message}`);
    } finally {
        for (const fn of cleanups.reverse()) {
            try {
                await fn();
            } catch {
                // Best-effort cleanup.
            }
        }
        await profile.dispose();
    }
    if (failures.length) {
        for (const reason of failures) {
            console.error(`${label}: FAIL -- ${reason}`);
        }
        process.exit(1);
    }
    console.log(`${label}: PASS`);
    process.exit(0);
}
```

- [ ] **Step 2: Write the NG-029 check**

Create `scripts/verify-ng-029-setup-restore-mode.mjs`:

```js
#!/usr/bin/env node
/**
 * NG-029 (full tier, live-clone lane): restoring a setup activates its mode
 * through ModeService -- mode attribute, furniture, Explorer dock and panel
 * map -- not through a bare switchPerspective (setups-service.ts:438, 441;
 * same class as GUI-DEFECTS item 6). Drives the restore command through the
 * command registry, on a setups.json written by the frontend's own
 * FileService. The launch restore (:350 -> :842) runs the same body; ng-032
 * drives it across a real relaunch.
 */
import { probe, runCheck, sourceConst, sourceMatch, withShell } from './lib/pb-relaunch.mjs';

const LABEL = 'ng-029-setup-restore-activates-mode';
const RESTORE = sourceConst('theia/extensions/modes/src/browser/setups-commands.ts', 'SETUPS_RESTORE_COMMAND_ID');
const ACTIVATE = sourceConst('theia/extensions/modes/src/browser/modes-commands.ts', 'MODES_ACTIVATE_COMMAND_ID');
const MODE_ATTRIBUTE = sourceConst('theia/extensions/modes/src/browser/mode-attribute.ts', 'MODE_ATTRIBUTE');
const EXPLORER = sourceMatch('theia/extensions/modes/src/browser/mode-descriptors.ts', /\['([^']+)',\s*'left'\]/);
const STORE = JSON.stringify({
    version: 1,
    lastSession: null,
    setups: [{ name: 'NG029', modeId: 'coding', savedAt: '2026-09-25T00:00:00.000Z', windows: [{ x: 0, y: 0, width: 1280, height: 800, tabs: [], activeTab: null }] }],
});

await runCheck(LABEL, async ({ profile, fail }) => {
    const seen = await withShell(profile, app => probe(app, `
        const setups = get('SetupsService');
        await get('FileService').write(setups.setupsUri, ${JSON.stringify(STORE)});
        if (!(await until(() => setups.listRows().some(row => row.name === 'NG029'), 10000))) {
            return { error: 'the NG029 setup never loaded from setups.json' };
        }
        await get('CommandRegistry').executeCommand(${JSON.stringify(ACTIVATE)}, 'browsing');
        await sleep(800);
        await get('CommandRegistry').executeCommand(${JSON.stringify(RESTORE)}, 'NG029');
        await sleep(1500);
        const appShell = get('ApplicationShell');
        const explorer = get('WidgetManager').tryGetWidget(${JSON.stringify(EXPLORER)});
        return {
            perspective: get('PerspectiveService').getActivePerspectiveId(),
            modeAttribute: document.body.getAttribute(${JSON.stringify(MODE_ATTRIBUTE)}),
            statusBarHidden: get('StatusBarImpl').isHidden,
            leftRailHidden: appShell.leftPanelHandler.container.isHidden,
            explorerArea: explorer && explorer.isAttached ? appShell.getAreaFor(explorer) : null,
            leftExpanded: appShell.isExpanded('left'),
        };
    `));
    if (seen.error) {
        fail(`harness: ${seen.error}`);
        return;
    }
    if (seen.perspective !== 'coding') {
        fail(`the active perspective is '${seen.perspective}', not the setup's 'coding'`);
    }
    if (seen.modeAttribute !== 'coding') {
        fail(`the mode attribute reads '${seen.modeAttribute}', not 'coding' -- the restore switched the perspective without ModeService`);
    }
    if (seen.statusBarHidden !== false) {
        fail('the status bar is hidden after restoring a Coding setup -- Coding furniture was not applied');
    }
    if (seen.leftRailHidden !== false) {
        fail('the left icon rail is hidden after restoring a Coding setup -- Coding furniture was not applied');
    }
    if (seen.explorerArea !== 'left') {
        fail(`the Explorer is docked in '${seen.explorerArea}', not 'left' -- the Coding panel map was not applied`);
    }
    if (seen.leftExpanded !== true) {
        fail('the left panel is collapsed after restoring a Coding setup');
    }
});
```

- [ ] **Step 3: Write the NG-030 check**

Create `scripts/verify-ng-030-setup-restore-dedup.mjs`:

```js
#!/usr/bin/env node
/**
 * NG-030 (full tier, live-clone lane): restoring a setup opens each web tab
 * once and does not duplicate a tab that is already open. Evidence:
 * setups-service.ts:666-667 opens the active tab a second time, and
 * WebTabOpenHandler mints a new tab per call (web-tab.ts:643). Drives the
 * restore command on a setup listing pages A and B (A active) while B is
 * already open, then counts web tabs per page.
 */
import { probe, runCheck, servePages, sourceConst, withShell } from './lib/pb-relaunch.mjs';

const LABEL = 'ng-030-setup-restore-opens-tabs-once';
const RESTORE = sourceConst('theia/extensions/modes/src/browser/setups-commands.ts', 'SETUPS_RESTORE_COMMAND_ID');

await runCheck(LABEL, async ({ profile, fail, defer }) => {
    const pages = await servePages({ '/a': { title: 'NG030 A' }, '/b': { title: 'NG030 B' } });
    defer(pages.close);
    const A = pages.url('/a');
    const B = pages.url('/b');
    const store = JSON.stringify({
        version: 1,
        lastSession: null,
        setups: [{ name: 'NG030', modeId: 'browsing', savedAt: '2026-09-25T00:00:00.000Z', windows: [{ x: 0, y: 0, width: 1280, height: 800, tabs: [A, B], activeTab: A }] }],
    });
    const seen = await withShell(profile, app => probe(app, `
        const A = ${JSON.stringify(A)};
        const B = ${JSON.stringify(B)};
        const setups = get('SetupsService');
        await get('WebTabOpenHandler').openUrl(B);
        if (!(await until(() => webTabs().some(tab => tab.url === B), 15000))) {
            return { error: 'the web tab on B never opened' };
        }
        await get('FileService').write(setups.setupsUri, ${JSON.stringify(store)});
        if (!(await until(() => setups.listRows().some(row => row.name === 'NG030'), 10000))) {
            return { error: 'the NG030 setup never loaded from setups.json' };
        }
        await get('CommandRegistry').executeCommand(${JSON.stringify(RESTORE)}, 'NG030');
        await sleep(3000);
        const current = get('ApplicationShell').mainPanel.currentTitle;
        return {
            onA: webTabs().filter(tab => tab.url === A).length,
            onB: webTabs().filter(tab => tab.url === B).length,
            currentUrl: current && current.owner ? current.owner.url : null,
        };
    `));
    if (seen.error) {
        fail(`harness: ${seen.error}`);
        return;
    }
    if (seen.onA !== 1) {
        fail(`restoring the setup left ${seen.onA} web tabs on A; it lists A once (the active tab was opened a second time)`);
    }
    if (seen.onB !== 1) {
        fail(`restoring the setup left ${seen.onB} web tabs on B; B was already open and must not be duplicated`);
    }
    if (seen.currentUrl !== A) {
        fail(`after the restore the current main-area tab shows ${seen.currentUrl}, not the setup's active tab ${A}`);
    }
});
```

- [ ] **Step 4: Write the NG-031 check**

Create `scripts/verify-ng-031-setup-commands-reachable.mjs`:

```js
#!/usr/bin/env node
/**
 * NG-031 (full tier, live-clone lane): Restore Setup and the dependent-window
 * command are reachable from the command palette and a menu. Evidence: both
 * registered with no label (setups-commands.ts:31-37), and no menu entry
 * exists; notes/browser-window-model.md:39-40. Reads the live palette list
 * (QuickCommandService.getCommands, the list the palette renders) and the
 * live menu-bar model (MenuModelRegistry, what the menu bar is filled from).
 */
import { probe, runCheck, sourceConst, withShell } from './lib/pb-relaunch.mjs';

const LABEL = 'ng-031-setup-commands-reachable';
const COMMANDS_REL = 'theia/extensions/modes/src/browser/setups-commands.ts';
const IDS = [sourceConst(COMMANDS_REL, 'SETUPS_RESTORE_COMMAND_ID'), sourceConst(COMMANDS_REL, 'SETUPS_OPEN_DEPENDENT_COMMAND_ID')];

await runCheck(LABEL, async ({ profile, fail }) => {
    const seen = await withShell(profile, app => probe(app, `
        const ids = ${JSON.stringify(IDS)};
        const commands = get('CommandRegistry');
        const labels = ids.map(id => {
            const command = commands.getCommand(id);
            return command && command.label ? command.label : null;
        });
        const listed = get('QuickCommandService').getCommands();
        const palette = [...listed.recent, ...listed.other].map(command => command.id);
        const collect = (node, out) => {
            if (!node) return out;
            if (typeof node.id === 'string') out.push(node.id);
            for (const child of node.children || []) collect(child, out);
            return out;
        };
        // MAIN_MENU_BAR is ['menubar'] in @theia/core's menu types.
        const inMenuBar = collect(get('MenuModelRegistry').getMenu(['menubar']), []);
        return { labels, palette: ids.map(id => palette.includes(id)), menu: ids.map(id => inMenuBar.includes(id)) };
    `));
    if (seen.error) {
        fail(`harness: ${seen.error}`);
        return;
    }
    IDS.forEach((id, index) => {
        if (!seen.labels[index]) {
            fail(`${id} has no label, so the command palette cannot show it`);
        }
        if (!seen.palette[index]) {
            fail(`${id} is not in the command palette's list`);
        }
        if (!seen.menu[index]) {
            fail(`${id} is in no menu of the menu bar`);
        }
    });
});
```

- [ ] **Step 5: Write the NG-032 check**

Create `scripts/verify-ng-032-quit-restores-session.mjs`:

```js
#!/usr/bin/env node
/**
 * NG-032 (full tier, live-main lane): quitting saves the current session and
 * the next launch restores it with no saved setup -- 14-UI-SPEC.md:245's
 * "guaranteed restore on relaunch", GUI-09. Evidence: onStop persists only
 * the last-session pointer (setups-service.ts:364-368), and the backend is
 * already stopped when the page unloads.
 *
 * A real quit (the core window's close button) and a real relaunch on the
 * same profile, with the first launch's port held so the sidecar comes back
 * on another one, as it does in use (TheiaService.sys.mjs:602). The mode must
 * come back through ModeService (furniture and attribute): NG-029's launch path.
 */
import { holdPort, probe, runCheck, servePages, sourceConst, withShell } from './lib/pb-relaunch.mjs';

const LABEL = 'ng-032-quit-restores-session';
const ACTIVATE = sourceConst('theia/extensions/modes/src/browser/modes-commands.ts', 'MODES_ACTIVATE_COMMAND_ID');
const MODE_ATTRIBUTE = sourceConst('theia/extensions/modes/src/browser/mode-attribute.ts', 'MODE_ATTRIBUTE');

await runCheck(LABEL, async ({ profile, fail, defer }) => {
    const pages = await servePages({ '/a': { title: 'NG032 A' } });
    defer(pages.close);
    const A = pages.url('/a');

    const first = await withShell(profile, async app => {
        const before = await probe(app, `
            await get('WebTabOpenHandler').openUrl(${JSON.stringify(A)});
            if (!(await until(() => webTabs().some(tab => tab.url === ${JSON.stringify(A)}), 15000))) {
                return { error: 'the web tab never loaded its page' };
            }
            await get('CommandRegistry').executeCommand(${JSON.stringify(ACTIVATE)}, 'coding');
            await sleep(1000);
            return { setups: get('SetupsService').listRows().length };
        `);
        return { before, port: app.port, quit: before.error ? 'skipped' : await app.quit() };
    });
    if (first.before.error) {
        fail(`harness: first launch: ${first.before.error}`);
        return;
    }
    if (first.before.setups !== 0) {
        fail(`harness: the profile already holds ${first.before.setups} saved setup(s); this check needs none`);
        return;
    }
    if (first.quit === 'timeout') {
        fail('closing the core window did not quit the app within 30 s');
        return;
    }

    const release = await holdPort(first.port);
    let second;
    try {
        second = await withShell(profile, async app => ({
            port: app.port,
            after: await probe(app, `
                await until(() => webTabs().some(tab => tab.url === ${JSON.stringify(A)}), 20000);
                await sleep(1500);
                return {
                    onA: webTabs().filter(tab => tab.url === ${JSON.stringify(A)}).length,
                    modeAttribute: document.body.getAttribute(${JSON.stringify(MODE_ATTRIBUTE)}),
                    statusBarHidden: get('StatusBarImpl').isHidden,
                    setups: get('SetupsService').listRows().length,
                };
            `),
        }));
    } finally {
        await release();
    }
    if (second.port === first.port) {
        fail(`harness: the relaunch reused port ${first.port}; the check could not force the port change`);
        return;
    }
    const after = second.after;
    if (after.onA !== 1) {
        fail(`after the relaunch ${after.onA} web tab(s) show ${A}; the session quit with exactly one`);
    }
    if (after.modeAttribute !== 'coding') {
        fail(`after the relaunch the mode attribute reads '${after.modeAttribute}'; the session quit in 'coding'`);
    }
    if (after.statusBarHidden !== false) {
        fail('after the relaunch the status bar is hidden, so Coding furniture was not applied through ModeService');
    }
    if (after.setups !== 0) {
        fail(`after the relaunch ${after.setups} saved setup(s) are listed; the session restore must not need one`);
    }
});
```

- [ ] **Step 6: Write the NG-033 check**

Create `scripts/verify-ng-033-layout-survives-relaunch.mjs`:

```js
#!/usr/bin/env node
/**
 * NG-033 (full tier, live-main lane): the active mode, per-mode layouts and
 * the shell layout survive a relaunch. Evidence: the first spawn uses port 0
 * (TheiaService.sys.mjs:602), so the frontend origin -- and localStorage,
 * where Theia keeps 'perspective-layouts' -- changes per launch;
 * mode-service.ts:562-592 reads it.
 *
 * Launch 1 visits Coding and Browsing and sets the left panel to 333 px in
 * Coding; a real quit; launch 2 on the same profile with the old port held.
 * The assertions are ones only the persisted layout satisfies: both modes
 * have saved layouts and the left panel is 333 px (NG-032's session restore
 * brings back tabs and mode, not these).
 *
 * Launch 3 (Review Focus): the page swallows chrome's quit-flush push, as a
 * hung frontend would, and the app must still exit within 20 s.
 */
import { holdPort, probe, runCheck, sourceConst, withShell } from './lib/pb-relaunch.mjs';

const LABEL = 'ng-033-layout-survives-relaunch';
const ACTIVATE = sourceConst('theia/extensions/modes/src/browser/modes-commands.ts', 'MODES_ACTIVATE_COMMAND_ID');
const STATE_EVENT = sourceConst('theia/extensions/tab-uris/src/browser/web-tab.ts', 'WEB_TAB_STATE_EVENT');
const LEFT_WIDTH = 333;

await runCheck(LABEL, async ({ profile, fail }) => {
    const first = await withShell(profile, async app => {
        const before = await probe(app, `
            const commands = get('CommandRegistry');
            const appShell = get('ApplicationShell');
            await commands.executeCommand(${JSON.stringify(ACTIVATE)}, 'coding');
            await sleep(800);
            appShell.resize(${LEFT_WIDTH}, 'left');
            await sleep(800);
            await commands.executeCommand(${JSON.stringify(ACTIVATE)}, 'browsing');
            await sleep(800);
            await commands.executeCommand(${JSON.stringify(ACTIVATE)}, 'coding');
            await sleep(800);
            const left = appShell.getLayoutData().leftPanel;
            return { perspective: get('PerspectiveService').getActivePerspectiveId(), leftSize: left ? left.size : null };
        `);
        const ready = before.perspective === 'coding' && typeof before.leftSize === 'number' && Math.abs(before.leftSize - LEFT_WIDTH) <= 2;
        return { before, ready, port: app.port, quit: ready ? await app.quit() : 'skipped' };
    });
    if (!first.ready) {
        fail(`harness: the first launch could not set up Coding with a ${LEFT_WIDTH} px left panel (${JSON.stringify(first.before)})`);
        return;
    }
    if (first.quit === 'timeout') {
        fail('closing the core window did not quit the app within 30 s');
        return;
    }

    const release = await holdPort(first.port);
    let second;
    try {
        second = await withShell(profile, async app => ({
            port: app.port,
            after: await probe(app, `
                await sleep(1500);
                const perspectives = get('PerspectiveService');
                const left = get('ApplicationShell').getLayoutData().leftPanel;
                return { perspective: perspectives.getActivePerspectiveId(), saved: perspectives.getSavedPerspectiveIds(), leftSize: left ? left.size : null };
            `),
        }));
    } finally {
        await release();
    }
    if (second.port === first.port) {
        fail(`harness: the relaunch reused port ${first.port}; the check could not force the port change`);
        return;
    }
    const after = second.after;
    if (after.perspective !== 'coding') {
        fail(`after the relaunch the active mode is '${after.perspective}'; the app quit in 'coding'`);
    }
    for (const id of ['coding', 'browsing']) {
        if (!Array.isArray(after.saved) || !after.saved.includes(id)) {
            fail(`after the relaunch there is no saved layout for '${id}' (saved: ${JSON.stringify(after.saved)}); the per-mode layouts did not survive`);
        }
    }
    if (typeof after.leftSize !== 'number' || Math.abs(after.leftSize - LEFT_WIDTH) > 2) {
        fail(`after the relaunch the left panel is ${after.leftSize} px, not ${LEFT_WIDTH}; the shell layout did not survive`);
    }

    const third = await withShell(profile, async app => {
        await app.evaluate(`window.addEventListener(${JSON.stringify(STATE_EVENT)}, event => {
            const kind = event.detail && event.detail.kind;
            if (kind !== 'state' && kind !== 'focusAddress') event.stopImmediatePropagation();
        }, true); true`);
        return app.quit({ timeoutMs: 20000 });
    });
    if (third === 'timeout') {
        fail('with a frontend that never answers the quit flush, the app was still running 20 s after the core window closed; the flush must be bounded');
    }
});
```

- [ ] **Step 7: Write the NG-034 check**

Create `scripts/verify-ng-034-web-tab-history-restart.mjs`:

```js
#!/usr/bin/env node
/**
 * NG-034 (full tier, live-main lane; the row is Needs: wave-a): in-shell web
 * tabs survive a restart with their back/forward history. Evidence: the
 * layout restore refuses them (tab-uris-frontend-module.ts:107), and the
 * shell window is not a navigator:browser window, so sessionstore never
 * sees them.
 *
 * Launch 1: a web tab on page A; one trusted click on A's full-page link
 * (session history only offers Back to an entry the user touched) takes the
 * same tab to B. A real quit; a relaunch on the same profile with the old
 * port held. The tab must come back once, on B, with Back available, and the
 * chrome bar's Back must take it to A.
 */
import { holdPort, pollFor, probe, runCheck, servePages, withShell } from './lib/pb-relaunch.mjs';

const LABEL = 'ng-034-web-tab-history-survives-restart';

await runCheck(LABEL, async ({ profile, fail, defer }) => {
    const pages = await servePages({
        '/a': { title: 'NG034 A', body: '<a id="next" href="/b" style="display:block;width:100vw;height:100vh">next</a>' },
        '/b': { title: 'NG034 B' },
    });
    defer(pages.close);
    const A = pages.url('/a');
    const B = pages.url('/b');

    const first = await withShell(profile, async app => {
        const opened = await probe(app, `
            await get('WebTabOpenHandler').openUrl(${JSON.stringify(A)});
            return { ok: await until(() => webTabs().some(tab => tab.url === ${JSON.stringify(A)}), 15000) };
        `);
        if (!opened.ok) {
            return { error: 'the web tab never loaded A' };
        }
        const overlay = await pollFor(async () => (await app.contexts()).find(entry => entry.url === A), 15000, 'the overlay context on A');
        await app.send('input.performActions', {
            context: overlay.context,
            actions: [{
                type: 'pointer', id: 'ng034-mouse', parameters: { pointerType: 'mouse' },
                actions: [{ type: 'pointerMove', x: 20, y: 20 }, { type: 'pointerDown', button: 0 }, { type: 'pointerUp', button: 0 }],
            }],
        });
        await app.send('input.releaseActions', { context: overlay.context });
        const navigated = await probe(app, `
            return { ok: await until(() => webTabs().some(tab => tab.url === ${JSON.stringify(B)} && tab.canGoBack), 15000) };
        `);
        if (!navigated.ok) {
            return { error: 'the link click did not take the web tab to B with Back available' };
        }
        return { port: app.port, quit: await app.quit() };
    });
    if (first.error) {
        fail(`harness: first launch: ${first.error}`);
        return;
    }
    if (first.quit === 'timeout') {
        fail('closing the core window did not quit the app within 30 s');
        return;
    }

    const release = await holdPort(first.port);
    let second;
    try {
        second = await withShell(profile, async app => {
            const after = await probe(app, `
                await until(() => webTabs().some(tab => tab.url === ${JSON.stringify(B)}), 20000);
                await sleep(1500);
                const tabs = webTabs().filter(tab => tab.url === ${JSON.stringify(A)} || tab.url === ${JSON.stringify(B)});
                const onB = tabs.find(tab => tab.url === ${JSON.stringify(B)});
                if (onB) {
                    await get('ApplicationShell').activateWidget(onB.id);
                    await sleep(800);
                }
                return { count: tabs.length, onB: !!onB, canGoBack: onB ? onB.canGoBack : null };
            `);
            let wentBack = null;
            if (after.onB && after.canGoBack === true) {
                await app.evaluate(`(() => {
                    const back = document.querySelector('.pb-chrome-bar-button[aria-label="Back"]');
                    if (back) back.click();
                    return !!back;
                })()`);
                wentBack = await pollFor(async () => (await app.contexts()).some(entry => entry.url === A), 15000, 'the tab going back to A')
                    .catch(() => false);
            }
            return { port: app.port, after, wentBack };
        });
    } finally {
        await release();
    }
    if (second.port === first.port) {
        fail(`harness: the relaunch reused port ${first.port}; the check could not force the port change`);
        return;
    }
    const { after, wentBack } = second;
    if (after.count !== 1) {
        fail(`after the restart ${after.count} web tab(s) show A or B; the session quit with exactly one`);
    }
    if (!after.onB) {
        fail('after the restart no web tab shows B, the page the tab was on at quit');
        return;
    }
    if (after.canGoBack !== true) {
        fail('after the restart the web tab on B cannot go Back; its back/forward history did not survive');
        return;
    }
    if (!wentBack) {
        fail('pressing Back after the restart did not return the web tab to A');
    }
});
```

- [ ] **Step 8: Write the NG-035 check**

Create `scripts/verify-ng-035-custom-mode-layout.mjs`:

```js
#!/usr/bin/env node
/**
 * NG-035 (full tier, live-clone lane): a custom mode saves the layout, not
 * only three panel flags, and the shipped defaults are data. Evidence:
 * mode-service.ts:23-28, 76-81, 371-376; the hard-coded furniture rule
 * (:306) and visibilityFor (:403-414); 14-CONTEXT.md:33.
 *
 *   (a) data: mode-service.ts branches on no shipped mode id -- the ids are
 *       derived from the descriptors, so a new shipped mode is covered;
 *   (b) load: a modes.json row with views and furniture is applied when the
 *       mode is activated through the modes command (the Explorer moves to
 *       the right panel, the IDE furniture shows);
 *   (c) save: Save as Mode, run through the command registry, writes the
 *       views and the furniture into the new row;
 *   (d) Review Focus: a row written before this wave (three flags only)
 *       still loads and applies its flags.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT, probe, runCheck, sourceConst, sourceMatch, withShell } from './lib/pb-relaunch.mjs';

const LABEL = 'ng-035-custom-mode-saves-layout';
const SERVICE_REL = 'theia/extensions/modes/src/browser/mode-service.ts';
const DESCRIPTORS_REL = 'theia/extensions/modes/src/browser/mode-descriptors.ts';
const COMMANDS_REL = 'theia/extensions/modes/src/browser/modes-commands.ts';
const ACTIVATE = sourceConst(COMMANDS_REL, 'MODES_ACTIVATE_COMMAND_ID');
const SAVE_AS_MODE = sourceConst(COMMANDS_REL, 'MODES_SAVE_AS_MODE_COMMAND_ID');
const EXPLORER = sourceMatch(DESCRIPTORS_REL, /\['([^']+)',\s*'left'\]/);
const STORE = JSON.stringify({
    version: 1,
    customs: [
        { name: 'NG035 Data', leftVisible: false, rightVisible: true, bottomVisible: false, furniture: true, views: { left: [], right: [EXPLORER], bottom: [] } },
        { name: 'NG035 Legacy', leftVisible: true, rightVisible: false, bottomVisible: false },
    ],
});

function shippedIdBranches() {
    const ids = [...readFileSync(join(REPO_ROOT, DESCRIPTORS_REL), 'utf8').matchAll(/\bid:\s*'([^']+)'/g)].map(m => m[1]);
    const code = readFileSync(join(REPO_ROOT, SERVICE_REL), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1');
    return ids.flatMap(id => [...code.matchAll(new RegExp(`(?:===|!==)\\s*'${id}'|'${id}'\\s*(?:===|!==)`, 'g'))].map(m => m[0]));
}

await runCheck(LABEL, async ({ profile, fail }) => {
    const branches = shippedIdBranches();
    if (branches.length) {
        fail(`${SERVICE_REL} branches on shipped mode ids (${branches.join(', ')}); the shipped defaults are code, not data`);
    }
    const seen = await withShell(profile, app => probe(app, `
        const modes = get('ModeService');
        const commands = get('CommandRegistry');
        const appShell = get('ApplicationShell');
        const files = get('FileService');
        await files.write(modes.modesUri, ${JSON.stringify(STORE)});
        if (!(await until(() => modes.getCustomModes().length === 2, 10000))) {
            return { error: 'the two custom modes never loaded from modes.json' };
        }
        const explorerArea = () => {
            const widget = get('WidgetManager').tryGetWidget(${JSON.stringify(EXPLORER)});
            return widget && widget.isAttached ? appShell.getAreaFor(widget) : null;
        };
        await commands.executeCommand(${JSON.stringify(ACTIVATE)}, 'custom-ng035-legacy');
        await sleep(1000);
        const legacy = { left: appShell.isExpanded('left'), right: appShell.isExpanded('right'), statusBarHidden: get('StatusBarImpl').isHidden };
        await commands.executeCommand(${JSON.stringify(ACTIVATE)}, 'custom-ng035-data');
        await sleep(1000);
        const data = { explorer: explorerArea(), right: appShell.isExpanded('right'), statusBarHidden: get('StatusBarImpl').isHidden };
        const input = get('QuickInputService');
        const original = input.input;
        input.input = async () => 'NG035 Saved';
        try {
            await commands.executeCommand(${JSON.stringify(SAVE_AS_MODE)});
        } finally {
            input.input = original;
        }
        await sleep(500);
        const stored = JSON.parse((await files.read(modes.modesUri)).value);
        return { legacy, data, saved: (stored.customs || []).find(row => row.name === 'NG035 Saved') || null };
    `));
    if (seen.error) {
        fail(`harness: ${seen.error}`);
        return;
    }
    if (seen.legacy.left !== true || seen.legacy.right !== false || seen.legacy.statusBarHidden !== true) {
        fail(`a modes.json row written before this wave no longer applies its flags (${JSON.stringify(seen.legacy)})`);
    }
    if (seen.data.explorer !== 'right') {
        fail(`activating a custom mode whose views dock the Explorer on the right left it in '${seen.data.explorer}'`);
    }
    if (seen.data.right !== true) {
        fail('activating a custom mode with the right panel open left it collapsed');
    }
    if (seen.data.statusBarHidden !== false) {
        fail('activating a custom mode with furniture: true hid the status bar; furniture is not data');
    }
    if (!seen.saved) {
        fail('Save as Mode wrote no NG035 Saved row');
        return;
    }
    if (!seen.saved.views || !Array.isArray(seen.saved.views.right) || !seen.saved.views.right.includes(EXPLORER)) {
        fail(`Save as Mode stored no layout: the saved row's views are ${JSON.stringify(seen.saved.views)}, and the Explorer was docked right`);
    }
    if (seen.saved.furniture !== true) {
        fail(`Save as Mode stored furniture ${JSON.stringify(seen.saved.furniture)} while the status bar was showing`);
    }
});
```

- [ ] **Step 9: Write the NG-036 check**

Create `scripts/verify-ng-036-setup-dock-layout.mjs`:

```js
#!/usr/bin/env node
/**
 * NG-036 (full tier, live-clone lane): a setup records dock and split
 * positions, tab order across tab bars, and the mode of each window.
 * Evidence: one flat URI list per window plus one modeId
 * (setups-service.ts:538-564); notes/browser-window-model.md:41-43.
 *
 * Three web tabs arranged as two tab bars side by side -- [B, A] | [C] --
 * in Coding; Save Setup through the command registry; the stored row must
 * carry the split and the per-window mode. Then everything is merged into
 * one bar in another order and mode, and Restore Setup must bring back the
 * two bars in their order, each tab once, in Coding. Review Focus: a row
 * written before this wave (flat list, no dock, no per-window mode) still
 * restores.
 */
import { probe, runCheck, servePages, sourceConst, withShell } from './lib/pb-relaunch.mjs';

const LABEL = 'ng-036-setup-records-dock-layout';
const SETUPS_REL = 'theia/extensions/modes/src/browser/setups-commands.ts';
const SAVE_SETUP = sourceConst(SETUPS_REL, 'SETUPS_SAVE_COMMAND_ID');
const RESTORE = sourceConst(SETUPS_REL, 'SETUPS_RESTORE_COMMAND_ID');
const ACTIVATE = sourceConst('theia/extensions/modes/src/browser/modes-commands.ts', 'MODES_ACTIVATE_COMMAND_ID');

/** Tab lists of a stored dock node, left to right. */
function leafLists(node) {
    if (!node) {
        return [];
    }
    if (node.type === 'tabs') {
        return [node.tabs];
    }
    return (node.children || []).flatMap(leafLists);
}

await runCheck(LABEL, async ({ profile, fail, defer }) => {
    const pages = await servePages({ '/a': { title: 'A' }, '/b': { title: 'B' }, '/c': { title: 'C' }, '/d': { title: 'D' } });
    defer(pages.close);
    const [A, B, C, D] = ['/a', '/b', '/c', '/d'].map(pages.url);
    const expected = JSON.stringify([[B, A], [C]]);
    const seen = await withShell(profile, app => probe(app, `
        const [A, B, C, D] = ${JSON.stringify([A, B, C, D])};
        const appShell = get('ApplicationShell');
        const commands = get('CommandRegistry');
        const setups = get('SetupsService');
        const files = get('FileService');
        for (const url of [A, B, C]) {
            await get('WebTabOpenHandler').openUrl(url);
        }
        if (!(await until(() => [A, B, C].every(url => webTabs().some(tab => tab.url === url)), 20000))) {
            return { error: 'the three web tabs never loaded' };
        }
        const tab = url => webTabs().find(candidate => candidate.url === url);
        const bars = () => appShell.mainAreaTabBars
            .map(bar => Array.from(bar.titles).map(title => title.owner).filter(owner => webTabs().includes(owner)).map(owner => owner.url))
            .filter(list => list.length > 0);
        await appShell.addWidget(tab(C), { area: 'main', mode: 'split-right', ref: tab(A) });
        await appShell.addWidget(tab(B), { area: 'main', mode: 'tab-before', ref: tab(A) });
        await commands.executeCommand(${JSON.stringify(ACTIVATE)}, 'coding');
        await sleep(800);
        const arranged = bars();
        const input = get('QuickInputService');
        const original = input.input;
        input.input = async () => 'NG036';
        try {
            await commands.executeCommand(${JSON.stringify(SAVE_SETUP)});
        } finally {
            input.input = original;
        }
        const stored = JSON.parse((await files.read(setups.setupsUri)).value);
        const row = (stored.setups || []).find(entry => entry.name === 'NG036') || null;
        await appShell.addWidget(tab(C), { area: 'main', mode: 'tab-after', ref: tab(A) });
        await appShell.addWidget(tab(A), { area: 'main', mode: 'tab-before', ref: tab(B) });
        await commands.executeCommand(${JSON.stringify(ACTIVATE)}, 'browsing');
        await sleep(800);
        const merged = bars();
        await commands.executeCommand(${JSON.stringify(RESTORE)}, 'NG036');
        await sleep(2500);
        const restored = bars();
        const counts = [A, B, C].map(url => webTabs().filter(candidate => candidate.url === url).length);
        const perspective = get('PerspectiveService').getActivePerspectiveId();
        const legacyStore = {
            version: 1,
            lastSession: null,
            setups: [...(stored.setups || []), { name: 'NG036 Legacy', modeId: 'browsing', savedAt: '2026-09-25T00:00:00.000Z', windows: [{ x: 0, y: 0, width: 1280, height: 800, tabs: [D], activeTab: null }] }],
        };
        await files.write(setups.setupsUri, JSON.stringify(legacyStore));
        await until(() => setups.listRows().some(entry => entry.name === 'NG036 Legacy'), 10000);
        await commands.executeCommand(${JSON.stringify(RESTORE)}, 'NG036 Legacy');
        await until(() => webTabs().some(candidate => candidate.url === D), 15000);
        return { arranged, row, merged, restored, counts, perspective, legacyOnD: webTabs().filter(candidate => candidate.url === D).length };
    `));
    if (seen.error) {
        fail(`harness: ${seen.error}`);
        return;
    }
    if (JSON.stringify(seen.arranged) !== expected) {
        fail(`harness: the arrangement before saving is ${JSON.stringify(seen.arranged)}, not ${expected}`);
        return;
    }
    const core = seen.row && seen.row.windows && seen.row.windows[0];
    if (!core) {
        fail('Save Setup wrote no NG036 row');
        return;
    }
    if (core.modeId !== 'coding') {
        fail(`the saved core window carries mode ${JSON.stringify(core.modeId)}; the window was in 'coding'`);
    }
    const main = core.dock && core.dock.main;
    if (!main || main.type !== 'split' || main.orientation !== 'horizontal' || JSON.stringify(leafLists(main)) !== expected) {
        fail(`the saved row does not record the split and tab order: dock.main is ${JSON.stringify(main)}`);
    }
    if (seen.merged.length !== 1) {
        fail(`harness: merging the tabs left ${seen.merged.length} tab bars`);
        return;
    }
    if (JSON.stringify(seen.restored) !== expected) {
        fail(`Restore Setup produced tab bars ${JSON.stringify(seen.restored)}, not the saved ${expected}`);
    }
    if (seen.counts.some(count => count !== 1)) {
        fail(`after the restore the web-tab counts on A, B, C are ${seen.counts.join(', ')}; each must be 1`);
    }
    if (seen.perspective !== 'coding') {
        fail(`after the restore the mode is '${seen.perspective}', not the saved 'coding'`);
    }
    if (seen.legacyOnD !== 1) {
        fail(`a setup row written before this wave restored ${seen.legacyOnD} tab(s) on its one page`);
    }
});
```

- [ ] **Step 10: Write the NG-037 check**

Create `scripts/verify-ng-037-core-close-quits.mjs`:

```js
#!/usr/bin/env node
/**
 * NG-037 (full tier, live-main lane): closing the core window quits the app
 * and stops the backend, including when stock browser windows are open.
 * Evidence: the close button calls window.close() (powerbrowser.js:356), and
 * the backend stops only on quit-application-granted (TheiaService.sys.mjs:211).
 *
 * Two launches on one profile, each with a stock browser window opened
 * through the Open Browser Window command: the first closes the core window
 * with its close button, the second with the window's close event (what the
 * desktop's own close sends). Each must end the browser and the backend
 * process whose pid the supervisor reported.
 */
import { pollFor, probe, runCheck, servePages, sourceConst, withShell } from './lib/pb-relaunch.mjs';

const LABEL = 'ng-037-core-close-quits';
const OPEN_BROWSER_WINDOW = sourceConst('theia/extensions/tab-uris/src/browser/browser-window-command.ts', 'OPEN_BROWSER_WINDOW_COMMAND_ID');
const THEIA_SERVICE_URL = 'chrome://powerbrowser/content/TheiaService.sys.mjs';

function alive(pid) {
    try {
        process.kill(pid, 0);
        return true;
    } catch (error) {
        return error.code === 'EPERM';
    }
}

await runCheck(LABEL, async ({ profile, fail, defer }) => {
    const pages = await servePages({ '/stock': { title: 'NG037 stock' } });
    defer(pages.close);
    const STOCK = pages.url('/stock');
    for (const how of ['button', 'close-event']) {
        const outcome = await withShell(profile, async app => {
            await probe(app, `await get('CommandRegistry').executeCommand(${JSON.stringify(OPEN_BROWSER_WINDOW)}, ${JSON.stringify(STOCK)}); return {};`);
            const stock = await pollFor(async () => (await app.contexts()).find(entry => entry.url === STOCK), 20000, 'a stock browser window')
                .catch(() => undefined);
            if (!stock) {
                return { error: 'no stock browser window opened, so the precondition does not hold' };
            }
            const pid = await app.evaluateIn(app.chrome, `ChromeUtils.importESModule(${JSON.stringify(THEIA_SERVICE_URL)}).TheiaService.getState().pid`);
            return { pid, quit: await app.quit({ how, timeoutMs: 30000 }) };
        });
        if (outcome.error) {
            fail(`harness (${how}): ${outcome.error}`);
            continue;
        }
        if (outcome.quit === 'timeout') {
            fail(`${how}: the app was still running 30 s after the core window was closed with a stock browser window open`);
            continue;
        }
        if (typeof outcome.pid !== 'number') {
            fail(`harness (${how}): the supervisor reported no backend pid`);
            continue;
        }
        const stopped = await pollFor(async () => !alive(outcome.pid), 10000, `backend pid ${outcome.pid} to exit`).catch(() => false);
        if (!stopped) {
            fail(`${how}: backend pid ${outcome.pid} was still alive 10 s after the app quit`);
        }
    }
});
```

- [ ] **Step 11: Write the NG-038 check**

Create `scripts/verify-ng-038-actor-sender-wall.mjs`:

```js
#!/usr/bin/env node
/**
 * NG-038 (full tier, live-main lane): the actor accepts messages only from
 * the shell's own Theia frame on the sidecar's port. Evidence: `matches`
 * ignores the port (PowerBrowserAPI.sys.mjs:1705), and stock tabbrowser marks
 * its selected tab's browser primary="true" (upstream tabbrowser.js:728,
 * 1720), which passes groupSenderIsTheia (:150-166).
 *
 * Review Focus: a page served from 127.0.0.1 on a second port, in a selected
 * stock tab (opened through Open Browser Window), sends probeChannel and a
 * createGroup; then the same tab loads a page on the sidecar's own port and
 * does it again. Neither may get an ok:true reply, and neither group may
 * reach the store. Positive control first: the shell's own frame gets ok:true
 * for probeChannel, so a refusal below is the wall and not a dead channel.
 */
import { pollFor, probe, runCheck, servePages, sourceConst, withShell } from './lib/pb-relaunch.mjs';

const LABEL = 'ng-038-actor-refuses-hostile-senders';
const OPEN_BROWSER_WINDOW = sourceConst('theia/extensions/tab-uris/src/browser/browser-window-command.ts', 'OPEN_BROWSER_WINDOW_COMMAND_ID');
const CLIENT_REL = 'theia/extensions/modes/src/browser/group-actor-client.ts';
const REQUEST_EVENT = sourceConst(CLIENT_REL, 'GROUP_REQUEST_EVENT');
const RESPONSE_EVENT = sourceConst(CLIENT_REL, 'GROUP_RESPONSE_EVENT');

/** Page-realm attempt: probeChannel, plus a createGroup when `groupId` is given; every reply for 6 s. */
function attempt(groupId) {
    return `(async () => {
        const replies = [];
        window.addEventListener(${JSON.stringify(RESPONSE_EVENT)}, event => {
            try { replies.push(JSON.parse(JSON.stringify(event.detail))); } catch (error) { replies.push({ unreadable: String(error) }); }
        });
        const send = (requestId, msg) => document.dispatchEvent(new CustomEvent(${JSON.stringify(REQUEST_EVENT)}, {
            bubbles: true, cancelable: true, detail: { requestId, msg },
        }));
        send('ng038-probe', { kind: 'probeChannel' });
        ${groupId ? `send('ng038-create', { kind: 'createGroup', id: ${JSON.stringify(groupId)}, title: 'NG038', x: 0, y: 0, w: 240, h: 160, isActive: false });` : ''}
        await new Promise(resolve => setTimeout(resolve, 6000));
        return JSON.stringify(replies);
    })()`;
}

const accepted = replies => replies.filter(entry => entry && entry.reply && entry.reply.ok === true);

await runCheck(LABEL, async ({ profile, fail, defer }) => {
    const pages = await servePages({ '/hostile': { title: 'NG038 hostile' } });
    defer(pages.close);
    const HOSTILE = pages.url('/hostile');
    const result = await withShell(profile, async app => {
        const own = JSON.parse(await app.evaluate(attempt(null)) ?? '[]');
        if (accepted(own).length === 0) {
            return { error: `the shell's own frame got no ok:true reply to probeChannel (${JSON.stringify(own)}), so a refusal below would prove nothing` };
        }
        await probe(app, `await get('CommandRegistry').executeCommand(${JSON.stringify(OPEN_BROWSER_WINDOW)}, ${JSON.stringify(HOSTILE)}); return {};`);
        const stock = await pollFor(async () => (await app.contexts()).find(entry => entry.url === HOSTILE), 20000, 'the hostile page in a stock tab');
        const otherPort = JSON.parse(await app.evaluateIn(stock.context, attempt('ng038a')) ?? '[]');
        const sidecarPage = `http://127.0.0.1:${app.port}/ng038-probe`;
        await app.evaluateIn(stock.context, `location.href = ${JSON.stringify(sidecarPage)}; true`).catch(() => undefined);
        const sidecar = await pollFor(async () => (await app.contexts()).find(entry => entry.url.startsWith(sidecarPage)), 20000, 'the stock tab on the sidecar port');
        const samePort = JSON.parse(await app.evaluateIn(sidecar.context, attempt('ng038b')) ?? '[]');
        const groups = await probe(app, `
            try { return { ids: (await get('GroupQueryService').listGroups()).map(group => group.id) }; }
            catch (error) { return { unreadable: String(error) }; }
        `);
        return { otherPort, samePort, groups };
    });
    if (result.error) {
        fail(`harness: ${result.error}`);
        return;
    }
    if (accepted(result.otherPort).length) {
        fail(`a 127.0.0.1 page on another port in a selected stock tab got ok:true for ${accepted(result.otherPort).map(entry => entry.requestId).join(', ')}`);
    }
    if (accepted(result.samePort).length) {
        fail(`a page on the sidecar's own port in a stock tab got ok:true for ${accepted(result.samePort).map(entry => entry.requestId).join(', ')}`);
    }
    for (const id of ['ng038a', 'ng038b'].filter(id => (result.groups.ids || []).includes(id))) {
        fail(`the store holds group '${id}', written by a hostile sender`);
    }
});
```

- [ ] **Step 12: Add the `--scan` mode to the boundary guard**

In `scripts/check-internals-boundary.sh`, directly above the `if [ "${1:-}" = "--self-test" ]; then` line, insert:

```bash
# --scan <dir>: the same boundary scan over any directory. NG-039's check
# plants fixtures in a scratch directory and needs the guard's own verdict
# on them; the default path below stays powerbrowser/shell.
if [ "${1:-}" = "--scan" ]; then
  if [ -z "${2:-}" ]; then
    echo "check-internals-boundary: FAIL -- --scan requires a directory" >&2
    exit 1
  fi
  scan_internals_boundary "$2"
  exit $?
fi
```

- [ ] **Step 13: Write the NG-039 check**

Create `scripts/verify-ng-039-internals-waivers.mjs`:

```js
#!/usr/bin/env node
/**
 * NG-039 (--quick): every Firefox-internal touchpoint, including the Xray
 * waiver `wrappedJSObject` and the privileged `drawSnapshot`, has an
 * INTERNAL-APIS.md row, and check-internals-boundary.sh detects both.
 * Evidence: GroupActorChild.sys.mjs:117, 136; captureShellRegion
 * (PowerBrowserAPI.sys.mjs:1533); the guard's patterns (:38-64) name neither.
 *
 * 1. Plants one file per name in a scratch directory and requires the
 *    guard's own --scan verdict to reject each, naming file and pattern.
 * 2. Requires a catalogue row for every non-comment occurrence of either
 *    name under powerbrowser/shell, derived from the tree at check time.
 * Text reads only: honestly --quick.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LABEL = 'ng-039-internals-detects-waivers';
const GUARD = join(REPO_ROOT, 'scripts/check-internals-boundary.sh');
const CATALOGUE = readFileSync(join(REPO_ROOT, 'powerbrowser/INTERNAL-APIS.md'), 'utf8');
const SHELL_DIR = join(REPO_ROOT, 'powerbrowser/shell');
const PLANTS = [
    { file: 'planted-waiver.sys.mjs', name: 'wrappedJSObject', body: 'export function readReply(win, text) {\n  return win.wrappedJSObject.JSON.parse(text);\n}\n' },
    { file: 'planted-snapshot.sys.mjs', name: 'drawSnapshot', body: 'export async function paint(browser) {\n  return browser.drawSnapshot(0, 0, 1, 1, 1, "white");\n}\n' },
];
const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const failures = [];
const dir = mkdtempSync(join(tmpdir(), 'ng039-'));
try {
    for (const plant of PLANTS) {
        writeFileSync(join(dir, plant.file), plant.body);
    }
    const scan = spawnSync('bash', [GUARD, '--scan', dir], { encoding: 'utf8' });
    const output = `${scan.stdout}${scan.stderr}`;
    if (scan.status === 0) {
        failures.push('the boundary guard accepted files that use wrappedJSObject and drawSnapshot outside PowerBrowserAPI.sys.mjs');
    }
    for (const plant of PLANTS) {
        if (!new RegExp(`${escape(plant.file)}:\\d+: ${plant.name}`).test(output)) {
            failures.push(`the boundary guard does not detect ${plant.name} (planted in ${plant.file})`);
        }
    }
} finally {
    rmSync(dir, { recursive: true, force: true });
}

let count = 0;
for (const file of readdirSync(SHELL_DIR).filter(name => /\.(mjs|js)$/.test(name))) {
    readFileSync(join(SHELL_DIR, file), 'utf8').split('\n').forEach((line, index) => {
        if (!/wrappedJSObject|drawSnapshot/.test(line) || /^\s*(\/\/|\*)/.test(line)) {
            return;
        }
        count += 1;
        if (!new RegExp(`${escape(file)}:${index + 1}(?!\\d)`).test(CATALOGUE)) {
            failures.push(`${file}:${index + 1} uses a Firefox internal (${line.trim().slice(0, 80)}) with no INTERNAL-APIS.md row`);
        }
    });
}
if (count === 0) {
    failures.push('found no occurrence of either name under powerbrowser/shell; the tree moved, so this proves nothing');
}

if (failures.length) {
    for (const reason of failures) {
        console.error(`${LABEL}: FAIL -- ${reason}`);
    }
    process.exit(1);
}
console.log(`${LABEL}: PASS -- the guard detects both names, and all ${count} occurrences have catalogue rows`);
```

- [ ] **Step 14: Write the NG-040 check**

Create `scripts/verify-ng-040-internals-catalogue-lines.mjs`:

```js
#!/usr/bin/env node
/**
 * NG-040 (--quick): every line reference in powerbrowser/INTERNAL-APIS.md
 * matches the file it names, in both directions:
 *   1. every forbidden-pattern occurrence in the boundary files has a row --
 *      the pattern rule is written once, in scripts/check-internals-boundary.sh,
 *      and this runs its --catalogue mode rather than re-spelling it;
 *   2. every Touchpoints row's `<file>:<line>` points at a non-comment line
 *      carrying one of the row's backticked internals and, when the Method
 *      cell names a method of that file, inside that method.
 * Direction 2 is what the catalogue gate lacked: a row left behind by an edit
 * above it still satisfied direction 1 whenever another row happened to name
 * that number (2026-09-25 audit: catalogue 2312, 2562, 2563; file 2313, 2563,
 * 2564).
 *
 * --fix rewrites each stale reference to the nearest line that satisfies (2)
 * and that no other row claims for the same internal, stale rows taken top to
 * bottom; it never writes a row, so a new touchpoint still needs one by hand.
 * Any merge that edits PowerBrowserAPI.sys.mjs runs it.
 * --self-test plants a shift and a wrong-method row on scratch fixtures,
 * requires both red, and requires --fix to repair the shift. Text only: --quick.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'ng-040-internals-catalogue-lines';
const METHOD_RE = /^ {2}(?:async )?([A-Za-z_$][\w$]*)\s*\(.*\)\s*\{\s*$/;
const COMMENT_RE = /^\s*(\/\/|\*|\/\*)/;

function parseRows(md) {
    const lines = md.split('\n');
    const start = lines.findIndex(line => line.startsWith('## Touchpoints'));
    const rows = [];
    if (start < 0) {
        return rows;
    }
    for (let i = start + 1; i < lines.length && !lines[i].startsWith('## '); i += 1) {
        if (!lines[i].startsWith('|')) {
            continue;
        }
        const cells = lines[i].split('|').map(cell => cell.trim());
        if (cells.length < 5 || cells[1] === 'Internal' || /^-+$/.test(cells[1])) {
            continue;
        }
        rows.push({
            mdIndex: i,
            tokens: [...cells[1].matchAll(/`([^`]+)`/g)].map(m => m[1]),
            refs: [...cells[2].matchAll(/([A-Za-z][\w-]*\.sys\.mjs):(\d+)/g)].map(m => ({ file: m[1], line: Number(m[2]) })),
            method: /^`([A-Za-z_$][\w$]*)`/.exec(cells[3])?.[1] ?? null,
        });
    }
    return rows;
}

function enclosingMethod(lines, index) {
    for (let i = index; i >= 0; i -= 1) {
        const m = METHOD_RE.exec(lines[i]);
        if (m) {
            return m[1];
        }
    }
    return null;
}

/** The row's internals that line `index` carries, honouring the row's method; empty when none. */
function lineHolds(lines, index, row) {
    const text = lines[index];
    if (text === undefined || COMMENT_RE.test(text)) {
        return [];
    }
    const held = row.tokens.filter(token => text.includes(token));
    if (held.length === 0) {
        return [];
    }
    const methodInFile = row.method && lines.some(line => METHOD_RE.exec(line)?.[1] === row.method);
    if (methodInFile && enclosingMethod(lines, index) !== row.method) {
        return [];
    }
    return held;
}

function sourceReader(shellDir) {
    const cache = new Map();
    return file => {
        if (!cache.has(file)) {
            try {
                cache.set(file, readFileSync(join(shellDir, file), 'utf8').split('\n'));
            } catch {
                cache.set(file, null);
            }
        }
        return cache.get(file);
    };
}

function findStale(md, readSource) {
    const stale = [];
    for (const row of parseRows(md)) {
        for (const ref of row.refs) {
            const lines = readSource(ref.file);
            if (!lines) {
                stale.push(`${ref.file}:${ref.line}: ${ref.file} does not exist under powerbrowser/shell`);
                continue;
            }
            if (lineHolds(lines, ref.line - 1, row).length === 0) {
                const text = (lines[ref.line - 1] ?? '(past the end of the file)').trim().slice(0, 120);
                stale.push(`${ref.file}:${ref.line} is named for [${row.tokens.join(', ')}]${row.method ? ` in ${row.method}` : ''} but reads: ${text}`);
            }
        }
    }
    return stale;
}

function fix(md, readSource) {
    const mdLines = md.split('\n');
    const claimed = new Set();
    const key = (file, line, token) => `${file}:${line}:${token}`;
    const staleRefs = [];
    for (const row of parseRows(md)) {
        for (const ref of row.refs) {
            const lines = readSource(ref.file);
            if (!lines) {
                continue;
            }
            const held = lineHolds(lines, ref.line - 1, row);
            if (held.length) {
                held.forEach(token => claimed.add(key(ref.file, ref.line, token)));
            } else {
                staleRefs.push({ row, ref, lines });
            }
        }
    }
    staleRefs.sort((a, b) => a.ref.line - b.ref.line);
    const changes = [];
    const unresolved = [];
    for (const { row, ref, lines } of staleRefs) {
        let best = null;
        let tie = false;
        for (let i = 0; i < lines.length; i += 1) {
            const free = lineHolds(lines, i, row).filter(token => !claimed.has(key(ref.file, i + 1, token)));
            if (free.length === 0) {
                continue;
            }
            const distance = Math.abs(i + 1 - ref.line);
            if (best === null || distance < best.distance) {
                best = { line: i + 1, token: free[0], distance };
                tie = false;
            } else if (distance === best.distance) {
                tie = true;
            }
        }
        if (!best || tie) {
            unresolved.push(`${ref.file}:${ref.line} [${row.tokens.join(', ')}]${row.method ? ` in ${row.method}` : ''}: ${best ? 'two lines are equally near' : 'no line carries it'}`);
            continue;
        }
        claimed.add(key(ref.file, best.line, best.token));
        const parts = mdLines[row.mdIndex].split('|');
        parts[2] = parts[2].replace(new RegExp(`${ref.file.replace(/\./g, '\\.')}:${ref.line}(?!\\d)`), `${ref.file}:${best.line}`);
        mdLines[row.mdIndex] = parts.join('|');
        changes.push(`${ref.file}:${ref.line} -> ${best.line}`);
    }
    return { md: mdLines.join('\n'), changes, unresolved };
}

function runBoundaryCatalogue() {
    const result = spawnSync('bash', [join(REPO_ROOT, 'scripts/check-internals-boundary.sh'), '--catalogue'], { encoding: 'utf8' });
    return result.status === 0 ? [] : [(result.stderr || result.stdout || 'check-internals-boundary.sh --catalogue failed').trim()];
}

function check({ catalogue, shellDir, boundary }) {
    const md = readFileSync(catalogue, 'utf8');
    const failures = boundary ? runBoundaryCatalogue() : [];
    if (parseRows(md).length === 0) {
        failures.push(`${catalogue}: parsed ZERO Touchpoints rows; the table moved, so this proves nothing`);
    }
    for (const reason of findStale(md, sourceReader(shellDir))) {
        failures.push(`stale row: ${reason}`);
    }
    return failures;
}

const FIXTURE_SOURCE = [
    'export const API = Object.freeze({',
    '  alpha() {',
    '    return Services.prefs.getBoolPref("a", false);',
    '  },',
    '  beta() {',
    '    return Services.io.newURI("http://127.0.0.1/");',
    '  },',
    '});',
    '',
].join('\n');

function fixtureCatalogue(alphaLine, betaLine, alphaMethod = 'alpha') {
    return [
        '# Fixture', '', '## Touchpoints', '',
        '| Internal | File:Line | Method | Purpose | Threat Notes |',
        '|---|---|---|---|---|',
        `| \`Services.prefs.getBoolPref\` | \`Fixture.sys.mjs:${alphaLine}\` | \`${alphaMethod}\` | reads a pref | none |`,
        `| \`Services.io.newURI\` | \`Fixture.sys.mjs:${betaLine}\` | \`beta\` | parses a URI | none |`,
        '', '## Consistency', '',
    ].join('\n');
}

function selfTest() {
    const dir = mkdtempSync(join(tmpdir(), 'ng040-'));
    try {
        writeFileSync(join(dir, 'Fixture.sys.mjs'), FIXTURE_SOURCE);
        const cases = [
            { name: 'clean control', catalogue: fixtureCatalogue(3, 6), red: false },
            { name: 'planted shift (both rows one line late)', catalogue: fixtureCatalogue(4, 7), red: true, expect: 'Fixture.sys.mjs:4', fixTo: fixtureCatalogue(3, 6) },
            { name: 'planted wrong method', catalogue: fixtureCatalogue(3, 6, 'beta'), red: true, expect: 'in beta' },
        ];
        let failed = 0;
        for (const testCase of cases) {
            const path = join(dir, 'CATALOGUE.md');
            writeFileSync(path, testCase.catalogue);
            const failures = check({ catalogue: path, shellDir: dir, boundary: false });
            const wentRed = failures.length > 0;
            if (wentRed !== testCase.red || (testCase.expect && !failures.some(reason => reason.includes(testCase.expect)))) {
                console.error(`${NAME} --self-test: FAIL -- '${testCase.name}' expected ${testCase.red ? `red naming '${testCase.expect}'` : 'green'}, got: ${failures.join(' | ') || '(green)'}`);
                failed += 1;
                continue;
            }
            if (testCase.fixTo) {
                const repaired = fix(testCase.catalogue, sourceReader(dir));
                if (repaired.md !== testCase.fixTo) {
                    console.error(`${NAME} --self-test: FAIL -- --fix did not restore '${testCase.name}' (changes: ${repaired.changes.join(', ') || 'none'}; unresolved: ${repaired.unresolved.join(', ') || 'none'})`);
                    failed += 1;
                    continue;
                }
            }
            console.log(`  ok  ${testCase.name}`);
        }
        if (failed) {
            return 1;
        }
        console.log(`${NAME} --self-test: PASS -- the clean control is green, both plants went red, and --fix repaired the shift`);
        return 0;
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}

const args = process.argv.slice(2);
if (args.includes('--self-test')) {
    process.exit(selfTest());
}
const CATALOGUE = join(REPO_ROOT, 'powerbrowser/INTERNAL-APIS.md');
const SHELL_DIR = join(REPO_ROOT, 'powerbrowser/shell');
if (args.includes('--fix')) {
    const { md, changes, unresolved } = fix(readFileSync(CATALOGUE, 'utf8'), sourceReader(SHELL_DIR));
    writeFileSync(CATALOGUE, md);
    for (const change of changes) {
        console.log(`${NAME} --fix: ${change}`);
    }
    for (const line of unresolved) {
        console.error(`${NAME} --fix: UNRESOLVED ${line}`);
    }
    process.exit(unresolved.length ? 1 : 0);
}
const failures = check({ catalogue: CATALOGUE, shellDir: SHELL_DIR, boundary: true });
if (failures.length) {
    for (const reason of failures) {
        console.error(`${NAME}: FAIL -- ${reason}`);
    }
    process.exit(1);
}
console.log(`${NAME}: PASS -- every INTERNAL-APIS.md line reference points at the internal it names, and every occurrence has a row`);
```

- [ ] **Step 15: Register the checks**

In `scripts/verify-platform.sh`, directly after the line `    "internals-catalogue|bash $REPO_ROOT/scripts/check-internals-boundary.sh --catalogue"` (the `--quick` set), insert:

```bash
    # NG-039 (non-GUI wave C): the boundary guard detects the two Firefox
    # internals the 2026-09-25 audit found uncatalogued (wrappedJSObject,
    # drawSnapshot), and every occurrence of either has a catalogue row. It
    # plants its own fixtures and reads text only: honestly --quick.
    "ng-039-internals-detects-waivers|node $REPO_ROOT/scripts/verify-ng-039-internals-waivers.mjs"
    # NG-040: every INTERNAL-APIS.md line reference matches the file, both
    # directions (occurrence -> row through check-internals-boundary.sh
    # --catalogue; row -> line and method here). The self-test runs on
    # scratch fixtures only, for the reason every self-test row gives.
    "ng-040-internals-catalogue-lines|node $REPO_ROOT/scripts/verify-ng-040-internals-catalogue-lines.mjs"
    "ng-040-internals-catalogue-lines-self-test|node $REPO_ROOT/scripts/verify-ng-040-internals-catalogue-lines.mjs --self-test"
```

Directly after the line `      "gui07-mode-switch-tabs-live-self-test|node $REPO_ROOT/scripts/verify-mode-switch-tabs-live.mjs --self-test"` (the full set), insert:

```bash

      # NG-029..NG-038 (non-GUI wave C): the built shell driven through the
      # command registry, the actor channel, the core window's close button in
      # the chrome document and real quit-and-relaunch cycles on one kept
      # profile (withFirefoxPage's profileDir, via scripts/lib/pb-relaunch.mjs).
      # Each launches and reaps its own browser, so each is a plain node row
      # like gui07 above; none is --quick. Their demonstrated red is each row's
      # pre-build record-fail (docs/non-gui/checks-wave-c.tsv).
      "ng-029-setup-restore-activates-mode|node $REPO_ROOT/scripts/verify-ng-029-setup-restore-mode.mjs"
      "ng-030-setup-restore-opens-tabs-once|node $REPO_ROOT/scripts/verify-ng-030-setup-restore-dedup.mjs"
      "ng-031-setup-commands-reachable|node $REPO_ROOT/scripts/verify-ng-031-setup-commands-reachable.mjs"
      "ng-032-quit-restores-session|node $REPO_ROOT/scripts/verify-ng-032-quit-restores-session.mjs"
      "ng-033-layout-survives-relaunch|node $REPO_ROOT/scripts/verify-ng-033-layout-survives-relaunch.mjs"
      "ng-034-web-tab-history-survives-restart|node $REPO_ROOT/scripts/verify-ng-034-web-tab-history-restart.mjs"
      "ng-035-custom-mode-saves-layout|node $REPO_ROOT/scripts/verify-ng-035-custom-mode-layout.mjs"
      "ng-036-setup-records-dock-layout|node $REPO_ROOT/scripts/verify-ng-036-setup-dock-layout.mjs"
      "ng-037-core-close-quits|node $REPO_ROOT/scripts/verify-ng-037-core-close-quits.mjs"
      "ng-038-actor-refuses-hostile-senders|node $REPO_ROOT/scripts/verify-ng-038-actor-sender-wall.mjs"
```

- [ ] **Step 16: Write the record-fail input (R1)**

Three tab-separated fields per line: the row, the test ref `<check file>::<label>`, and a command containing that file path, with the lane as a trailing shell comment.

```bash
row() { printf '%s\t%s\t%s\n' "$1" "scripts/$2::$3" "node scripts/$2 # $4"; }
{
  row NG-029 verify-ng-029-setup-restore-mode.mjs ng-029-setup-restore-activates-mode live-clone
  row NG-030 verify-ng-030-setup-restore-dedup.mjs ng-030-setup-restore-opens-tabs-once live-clone
  row NG-031 verify-ng-031-setup-commands-reachable.mjs ng-031-setup-commands-reachable live-clone
  row NG-032 verify-ng-032-quit-restores-session.mjs ng-032-quit-restores-session live-main
  row NG-033 verify-ng-033-layout-survives-relaunch.mjs ng-033-layout-survives-relaunch live-main
  row NG-034 verify-ng-034-web-tab-history-restart.mjs ng-034-web-tab-history-survives-restart live-main
  row NG-035 verify-ng-035-custom-mode-layout.mjs ng-035-custom-mode-saves-layout live-clone
  row NG-036 verify-ng-036-setup-dock-layout.mjs ng-036-setup-records-dock-layout live-clone
  row NG-037 verify-ng-037-core-close-quits.mjs ng-037-core-close-quits live-main
  row NG-038 verify-ng-038-actor-sender-wall.mjs ng-038-actor-refuses-hostile-senders live-main
  row NG-039 verify-ng-039-internals-waivers.mjs ng-039-internals-detects-waivers quick
  row NG-040 verify-ng-040-internals-catalogue-lines.mjs ng-040-internals-catalogue-lines quick
} > docs/non-gui/checks-wave-c.tsv
awk -F'\t' 'NF != 3 { print "bad line " NR; exit 1 }' docs/non-gui/checks-wave-c.tsv && wc -l < docs/non-gui/checks-wave-c.tsv
```

Expected: `12`.

- [ ] **Step 17: Run the quick checks and confirm the reasons**

```bash
node scripts/verify-ng-039-internals-waivers.mjs; echo "exit $?"
node scripts/verify-ng-040-internals-catalogue-lines.mjs; echo "exit $?"
scripts/verify-platform.sh --only ng-040-internals-catalogue-lines-self-test; echo "exit $?"
scripts/verify-platform.sh --only internals-boundary-self-test; echo "exit $?"
```

Expected: ng-039 exits 1 with `the boundary guard accepted files that use wrappedJSObject and drawSnapshot…`, `does not detect wrappedJSObject`, `does not detect drawSnapshot`, and three `…with no INTERNAL-APIS.md row` lines (`GroupActorChild.sys.mjs:117`, `:136`, `PowerBrowserAPI.sys.mjs:1544`). ng-040 exits 1 with the guard's `13 occurrence(s) with no catalogue row` and about 15 `stale row:` lines, including `PowerBrowserAPI.sys.mjs:2079 is named for [SessionStore.getBrowserState, …] in projectSessionStoreTabs`. The ng-040 self-test and `internals-boundary-self-test` exit 0.

- [ ] **Step 18: Run the live checks and confirm the reasons**

The Theia build in the clone is the one G1 installed (Task 1 changes no Theia source). Run each under the lock with the clone overrides (C9); a `live-main` row runs here against main's current chrome, which is the pre-build chrome, so it fails for the row's reason too:

```bash
export PB_FIREFOX_BIN=$HOME/coding/Power-Browser/objdir/dist/bin/powerbrowser
export PB_BACKEND_MAIN=$PWD/theia/applications/browser/lib/backend/main.js
while IFS=$'\t' read -r -u 3 id ref cmd; do
  case "$cmd" in *'# quick') continue ;; esac
  flock $HOME/coding/Power-Browser/.git/pb-live.lock bash -c "$cmd" 2>&1 | grep -E ': (FAIL|PASS)'
done 3< docs/non-gui/checks-wave-c.tsv
```

Expected, one or more FAIL lines per row and no PASS; no line may read `FAIL -- harness:` (a harness line means the check did not reach the product: fix the check, not the product):
- ng-029: `the mode attribute reads 'browsing', not 'coding'` and `the status bar is hidden after restoring a Coding setup`.
- ng-030: `left 2 web tabs on A` and `left 2 web tabs on B`.
- ng-031: `has no label`, `is not in the command palette's list`, `is in no menu of the menu bar`, each for both ids.
- ng-032: `after the relaunch 0 web tab(s) show …` and `the mode attribute reads 'browsing'`.
- ng-033: `no saved layout for 'coding'` or `'browsing'`, and `the left panel is … px, not 333`.
- ng-034: `after the restart no web tab shows B`.
- ng-035: `branches on shipped mode ids ('coding' …)`, `hid the status bar; furniture is not data`, `left it in 'left'` (or `null`), `Save as Mode stored no layout`.
- ng-036: `the saved core window carries mode undefined`, `does not record the split and tab order`, `Restore Setup produced tab bars [[…]]` (one bar).
- ng-037: `button: the app was still running 30 s after…` and `close-event: the app was still running 30 s after…`.
- ng-038: `a 127.0.0.1 page on another port in a selected stock tab got ok:true for ng038-probe, ng038-create`, and `the store holds group 'ng038a'`.

- [ ] **Step 19: Commit gate, brand scan, commit**

```bash
git add scripts/lib/pb-relaunch.mjs scripts/verify-ng-029-setup-restore-mode.mjs scripts/verify-ng-030-setup-restore-dedup.mjs \
  scripts/verify-ng-031-setup-commands-reachable.mjs scripts/verify-ng-032-quit-restores-session.mjs \
  scripts/verify-ng-033-layout-survives-relaunch.mjs scripts/verify-ng-034-web-tab-history-restart.mjs \
  scripts/verify-ng-035-custom-mode-layout.mjs scripts/verify-ng-036-setup-dock-layout.mjs \
  scripts/verify-ng-037-core-close-quits.mjs scripts/verify-ng-038-actor-sender-wall.mjs \
  scripts/verify-ng-039-internals-waivers.mjs scripts/verify-ng-040-internals-catalogue-lines.mjs \
  scripts/check-internals-boundary.sh scripts/verify-platform.sh docs/non-gui/checks-wave-c.tsv
node scripts/scan-brand-residue.mjs
```

Run the C8 gate: it prints exactly `ng-039-internals-detects-waivers` and `ng-040-internals-catalogue-lines`. Then:

```bash
git commit -m "test(ng-c): failing checks for NG-029..NG-040" -m "Refs: NG-029, NG-030, NG-031, NG-032, NG-033, NG-034, NG-035, NG-036, NG-037, NG-038, NG-039, NG-040"
```

---

### Task 2: The catalogue covers every touchpoint and its line references match the file (NG-039, NG-040)

Rows: NG-039 (the guard detects `wrappedJSObject`, `drawSnapshot` and the other undetected internals, and each occurrence has a row), NG-040 (every line reference matches; `internals-catalogue` turns green). First among the build tasks so that every later chrome edit keeps the catalogue green (C11).

**Files:**

- Modify: `scripts/check-internals-boundary.sh`
- Modify: `powerbrowser/INTERNAL-APIS.md`

**Interfaces:**

- Consumes: Task 1's `--scan` mode, `scripts/verify-ng-039-internals-waivers.mjs`, `scripts/verify-ng-040-internals-catalogue-lines.mjs` (`--fix`).
- Produces: `FORBIDDEN_PATTERNS` gains `wrappedJSObject`, `drawSnapshot`, `IOUtils.`, `SessionStoreUtils`, `ChromeUtils.generateQI`, `JSWindowActorParent`, `JSWindowActorChild`; `ACTOR_CHILD_BASENAME="GroupActorChild.sys.mjs"` may carry `wrappedJSObject` and `JSWindowActorChild`, each occurrence with a row; `--catalogue` checks `PowerBrowserAPI.sys.mjs` (all patterns) and `GroupActorChild.sys.mjs` (its two patterns). Every later task, and every merge that edits `PowerBrowserAPI.sys.mjs` (waves A and B), keeps the catalogue green with `node scripts/verify-ng-040-internals-catalogue-lines.mjs --fix` plus hand-written rows for new touchpoints.

- [ ] **Step 1: Confirm both checks fail**

Run `scripts/verify-platform.sh --only ng-039-internals-detects-waivers` and `--only ng-040-internals-catalogue-lines`. Expected: both exit 1 with the Task 1 Step 17 reasons.

- [ ] **Step 2: Extend the pattern set and add the actor-child allowance**

In `scripts/check-internals-boundary.sh`, append to `FORBIDDEN_PATTERNS` (before its closing `)`):

```bash
  # NG-039 (2026-09-25 audit): Firefox internals that are neither
  # Services/Cc/Ci-shaped nor imports, and were therefore uncatalogued -- the
  # Xray waiver, the privileged <browser> snapshot, the chrome-only IO and
  # session-store namespaces, the QueryInterface helper, and the actor base
  # classes. Unconditional, like registerWindowActor above.
  'wrappedJSObject'
  'drawSnapshot'
  'IOUtils.'
  'SessionStoreUtils'
  'ChromeUtils.generateQI'
  'JSWindowActorParent'
  'JSWindowActorChild'
```

Directly after `is_conditional_pattern() { … }`, add:

```bash
# NG-039: the actor child is the one other file Gecko loads on the boundary's
# behalf (registerGroupActor names it as the child module), and it cannot
# import PowerBrowserAPI.sys.mjs (it runs in the content process with zero
# module imports by design). It may carry exactly these patterns, and every
# occurrence must have its own INTERNAL-APIS.md row; any other forbidden
# pattern in it is an offense as anywhere else.
ACTOR_CHILD_BASENAME="GroupActorChild.sys.mjs"
ACTOR_CHILD_PATTERNS=('wrappedJSObject' 'JSWindowActorChild')

is_actor_child_pattern() {
  local pattern
  for pattern in "${ACTOR_CHILD_PATTERNS[@]}"; do
    [ "$pattern" = "$1" ] && return 0
  done
  return 1
}

# True when <catalogue> has a row naming <basename>:<line>.
catalogue_has_row() {
  grep -Eq "${2//./\\.}:${3}([^0-9]|\$)" "$1"
}
```

`CATALOGUE_PATH` is defined further down the file; move its line (`CATALOGUE_PATH="$REPO_ROOT/powerbrowser/INTERNAL-APIS.md"`) up to sit directly under `DEFAULT_SCAN_DIR=…`, so the scan can read it. Add under it:

```bash
ACTOR_CHILD_TARGET="$REPO_ROOT/powerbrowser/shell/GroupActorChild.sys.mjs"
```

In `scan_internals_boundary`, inside the pattern loop, directly after the `if is_conditional_pattern "$pattern"; then … fi` block and before `if [ "$offense" -eq 1 ]; then`, insert:

```bash
            if [ "$offense" -eq 1 ] && [ "$(basename -- "$f")" = "$ACTOR_CHILD_BASENAME" ] \
              && is_actor_child_pattern "$pattern" \
              && catalogue_has_row "$CATALOGUE_PATH" "$ACTOR_CHILD_BASENAME" "$line_no"; then
              offense=0
            fi
```

Make `catalogue_occurrence_lines` take an optional second argument. Its first lines become:

```bash
catalogue_occurrence_lines() {
  local file="$1"
  local only_actor_child="${2:-}"
```

and inside its pattern loop, first statement:

```bash
      if [ -n "$only_actor_child" ] && ! is_actor_child_pattern "$pattern"; then
        continue
      fi
```

`check_catalogue_consistency` passes a third argument through: its first lines become `local catalogue="$1"`, `local target="$2"`, `local only_actor_child="${3:-}"`, and its occurrence loop reads `done < <(catalogue_occurrence_lines "$target" "$only_actor_child")`.

Replace the `--catalogue` dispatch at the bottom with:

```bash
if [ "${1:-}" = "--catalogue" ]; then
  rc=0
  check_catalogue_consistency "$CATALOGUE_PATH" "$CATALOGUE_TARGET" || rc=1
  check_catalogue_consistency "$CATALOGUE_PATH" "$ACTOR_CHILD_TARGET" actor-child || rc=1
  exit "$rc"
fi
```

- [ ] **Step 3: Self-test plants for the new patterns**

In `run_self_test`, after the actor-registration plant's block and before `local mutated=…`, add:

```bash
  # NG-039 plants: each new pattern is rejected outside the boundary file, and
  # an actor-child waiver with no catalogue row is rejected even in the one
  # file that may carry it.
  local plant_name plant_body
  for plant_name in wrappedJSObject drawSnapshot; do
    case "$plant_name" in
      wrappedJSObject) plant_body='  return win.wrappedJSObject.JSON.parse(text);' ;;
      drawSnapshot) plant_body='  return browser.drawSnapshot(0, 0, 1, 1, 1, "white");' ;;
    esac
    printf '// planted %s fixture\nexport function planted(win, browser, text) {\n%s\n}\n' "$plant_name" "$plant_body" > "$tmp/planted-$plant_name.sys.mjs"
    if scan_internals_boundary "$tmp" >/dev/null 2>"$tmp/self-test-$plant_name.err"; then
      echo "check-internals-boundary: --self-test FAIL -- planted $plant_name was NOT rejected" >&2
      overall=1
    elif grep -q "planted-$plant_name.sys.mjs:[0-9]*: $plant_name" "$tmp/self-test-$plant_name.err"; then
      echo "check-internals-boundary: --self-test PASS -- planted $plant_name was correctly rejected"
    else
      echo "check-internals-boundary: --self-test FAIL -- $plant_name rejection doesn't name the planted file and pattern" >&2
      overall=1
    fi
    rm -f "$tmp/planted-$plant_name.sys.mjs"
  done
  mkdir -p "$tmp/child"
  printf '// planted uncatalogued actor-child waiver\nexport const x = globalThis.wrappedJSObject;\n' > "$tmp/child/$ACTOR_CHILD_BASENAME"
  if scan_internals_boundary "$tmp/child" >/dev/null 2>"$tmp/self-test-child.err"; then
    echo "check-internals-boundary: --self-test FAIL -- an actor-child waiver with no catalogue row was NOT rejected" >&2
    overall=1
  else
    echo "check-internals-boundary: --self-test PASS -- an uncatalogued actor-child waiver was correctly rejected"
  fi
```

The planted child's waiver sits on its line 2; `GroupActorChild.sys.mjs:2` is never a catalogue row (the real file's line 2 is its licence header), which is what makes this plant red. The earlier plants in this function leave files in `$tmp`; the loop's plants are removed after use, and the child plant has its own directory, so each plant's verdict is its own.

- [ ] **Step 4: Renumber the drifted rows**

```bash
node scripts/verify-ng-040-internals-catalogue-lines.mjs --fix
```

Expected: about 14 `PowerBrowserAPI.sys.mjs:<old> -> <new>` lines (one line later each) and one `UNRESOLVED PowerBrowserAPI.sys.mjs:2079 [SessionStore.getBrowserState, …] in projectSessionStoreTabs`. That row's method is wrong: the `getBrowserState` call sits in `parseSessionStoreTabRows`. In `powerbrowser/INTERNAL-APIS.md`, change that row's Method cell from `` `projectSessionStoreTabs` `` to `` `parseSessionStoreTabRows` (read by `projectSessionStoreTabs`) `` and run `--fix` again. Expected: `:2079 -> 2080` and exit 0.

- [ ] **Step 5: Write rows for the newly detected touchpoints**

Run `bash scripts/check-internals-boundary.sh --catalogue`. It names every occurrence with no row. On the tree this plan was written against they are the lines below; use the numbers the guard prints. Append these rows to the Touchpoints table, before the `Services.io.newURI` row that ends it:

```markdown
| `IOUtils.makeDirectory` | `PowerBrowserAPI.sys.mjs:261` | `ensureDirectory` | Creates the sidecar settings folder (THEIA_CONFIG_DIR) before the first spawn (01-10). | The path is the supervisor's own XDG-derived config dir, never frontend input. |
| `IOUtils.exists` | `PowerBrowserAPI.sys.mjs:271` | `pathExists` | Checks that the configured backend entry file exists before a spawn (D-113). | Read-only existence probe on a pref-supplied path. |
| `IOUtils.writeJSON` | `PowerBrowserAPI.sys.mjs:560` | `writeStateFile` | Writes the sidecar state file atomically through a tmpPath rename (D-110). | Writes only the profile-keyed state file under the config dir; contents are pid, port and start ticks, never the token. |
| `IOUtils.readJSON` | `PowerBrowserAPI.sys.mjs:570` | `readStateFile` | Reads the previous launch's sidecar state file for the verified reap (SIDE-04). | A malformed or absent file resolves null; the reap acts only on a verified pid. |
| `IOUtils.remove` | `PowerBrowserAPI.sys.mjs:583` | `removeStateFile` | Removes the state file on a clean stop (D-110). | Removes only the supervisor's own state file. |
| `IOUtils.read` | `PowerBrowserAPI.sys.mjs:615` | `readProcessStartTicks` | Reads `/proc/<pid>/stat` with maxBytes to compare start ticks (D-111). | Read-only procfs; the pid comes from the state file this module wrote. |
| `drawSnapshot` | `PowerBrowserAPI.sys.mjs:1544` | `captureShellRegion` | Privileged `<browser>.drawSnapshot` of a region of the Theia frame, for Panorama group thumbnails (GUI-08). | Paints only the shell's own frame; the rect arrives from the Theia frame through the sender wall. |
| `IOUtils.getChildren` | `PowerBrowserAPI.sys.mjs:2130` | `quarantineAndRebuildTabStore` | Lists the profile directory to find the store's journal files when quarantining. | Reads names only, in the profile directory. |
| `IOUtils.remove` | `PowerBrowserAPI.sys.mjs:2162` | `quarantineAndRebuildTabStore` | Removes a quarantined store's journal files. | Removes only `tabs.sqlite` sidecar files it just renamed. |
| `IOUtils.remove` | `PowerBrowserAPI.sys.mjs:2174` | `quarantineAndRebuildTabStore` | Removes the live store after its quarantine copy exists. | Removes only `tabs.sqlite` in the profile. |
| `ChromeUtils.generateQI` | `PowerBrowserAPI.sys.mjs:2467` | `webTabOpen` (the per-overlay progress listener) | QueryInterface for the overlay's nsIWebProgressListener + nsISupportsWeakReference. | No data crosses; interface plumbing only. |
| `ChromeUtils.generateQI` | `PowerBrowserAPI.sys.mjs:2777` | *(the `PowerBrowserSingleInstanceHandler` class's own `QueryInterface`)* | QueryInterface for the command-line handler registered in components.conf. | Interface plumbing only. |
| `JSWindowActorParent` | `PowerBrowserAPI.sys.mjs:2811` | *(module-level `GroupActorBase`, base of `PowerBrowserGroupParent`)* | The parent actor class Gecko instantiates for the Theia frame's actor pair. | Every message it receives passes the sender wall (`groupSenderIsTheia`). |
| `JSWindowActorChild` | `GroupActorChild.sys.mjs:28` | *(the `PowerBrowserGroupChild` class)* | The child actor base class; Gecko instantiates it for documents matching the Theia origin. | The child carries no module import; the parent's sender wall decides. |
| `wrappedJSObject` | `GroupActorChild.sys.mjs:117` | `sendResponse` | Waives the Xray to call the content window's own `JSON.parse`, so a reply is a content object (GUI-DEFECTS item 17). | A primitive string in, a content object out; nothing of the child's scope is exposed. |
| `wrappedJSObject` | `GroupActorChild.sys.mjs:136` | `receiveMessage` | The same waiver for chrome's state pushes. | Same as the row above. |
```

Edit the paragraph under `# Internal APIs Catalogue` so its pattern list reads: "`Services.*`, `Cc`/`Ci`/`Cr`/`Cu`, XPCOM constructors, `AppConstants`, an unqualified `ChromeUtils.import*`, actor registration, `nodePrincipal`, `fixupAndLoadURIString`, and (NG-039) `wrappedJSObject`, `drawSnapshot`, `IOUtils.`, `SessionStoreUtils`, `ChromeUtils.generateQI` and the actor base classes". Add one sentence after it: "`GroupActorChild.sys.mjs` is the one other file with rows here: it may carry only `wrappedJSObject` and `JSWindowActorChild`, each occurrence catalogued (NG-039)." In `## Consistency`, add: "`scripts/verify-ng-040-internals-catalogue-lines.mjs` checks the other direction -- every row's `file:line` holds the internal it names, inside the method it names -- and its `--fix` renumbers rows after an edit shifts lines (NG-040)."

- [ ] **Step 6: Verify**

```bash
bash scripts/check-internals-boundary.sh; echo "boundary $?"
bash scripts/check-internals-boundary.sh --self-test; echo "self-test $?"
for l in ng-039-internals-detects-waivers ng-040-internals-catalogue-lines ng-040-internals-catalogue-lines-self-test internals-catalogue internals-boundary internals-boundary-self-test; do
  scripts/verify-platform.sh --only $l >/dev/null 2>&1; echo "$l $?"; done
```

Expected: every exit 0.

- [ ] **Step 7: Gate and commit**

Run the C8 gate: empty output. Then:

```bash
git add scripts/check-internals-boundary.sh powerbrowser/INTERNAL-APIS.md
node scripts/scan-brand-residue.mjs
git commit -m "fix(ng-c): catalogue every internals touchpoint; line references match the file" -m "Refs: NG-039, NG-040"
```

---

### Task 3: The actor serves only the shell's own Theia frame on the sidecar's port (NG-038)

Row: NG-038.

**Files:**

- Modify: `powerbrowser/shell/PowerBrowserAPI.sys.mjs` (sender-check region; a new method right after `registerGroupActor`)
- Modify: `powerbrowser/shell/TheiaService.sys.mjs` (`_swap`)
- Modify: `powerbrowser/INTERNAL-APIS.md` (renumber; the `Services.io.newURI` row's text)

**Interfaces:**

- Consumes: nothing new.
- Produces: `PowerBrowserAPI.setGroupSenderPort(port: number | null): void`; `groupSenderIsTheia(actorRef)` is true only when the sender's top embedder is `#powerbrowser-content` in `chrome://powerbrowser/content/powerbrowser.xhtml`, carries `primary="true"`, and the sender document's port equals the port `TheiaService._swap` set. Every sender is refused before the first swap. Task 10's `handleShellMessage` uses the same wall.

- [ ] **Step 1: Confirm the check fails**

`ng-038-actor-refuses-hostile-senders` fails with `…got ok:true for ng038-probe, ng038-create` (Task 1 Step 18).

- [ ] **Step 2: Tighten the wall**

In `PowerBrowserAPI.sys.mjs`, directly after the closing `}` of `groupSenderSpecIsTheia`, add:

```js
// NG-038: the actor serves one frame -- the shell's own content browser, in
// the shell window, on the sidecar's live port. `matches` cannot carry a port
// (MatchPattern compares hosts only), and stock tabbrowser marks its selected
// tab's browser primary="true" too (upstream tabbrowser.js:728, 1720), so a
// 127.0.0.1 page in a selected stock tab passed both the host check and the
// primary wall. TheiaService._swap sets the port before it navigates the
// frame; until then every sender is refused.
const SHELL_DOCUMENT_URL = "chrome://powerbrowser/content/powerbrowser.xhtml";
const SHELL_CONTENT_BROWSER_ID = "powerbrowser-content";
let groupSenderPort = null;
```

Replace the whole `groupSenderIsTheia` function with:

```js
function groupSenderIsTheia(actorRef) {
  let spec = "";
  let port = -1;
  let embeddedByPrimary = false;
  let embeddedByShell = false;
  try {
    const documentURI = actorRef?.browsingContext?.currentWindowGlobal?.documentURI;
    spec = documentURI?.spec ?? "";
    port = documentURI?.port ?? -1;
    // GUI-02 (14.1-01): the embedder-is-primary wall (T-14.1-01). A loopback
    // page inside a web-tab overlay loads the actor child too (the `matches`
    // pin is by origin); its top browsing context is embedded by the overlay
    // element, which carries no `primary`.
    const embedder = actorRef?.browsingContext?.top?.embedderElement;
    embeddedByPrimary = embedder?.getAttribute("primary") === "true";
    // NG-038: and primary is not enough -- stock tabbrowser sets it on its
    // selected tab. Only the shell window's own content browser qualifies.
    embeddedByShell =
      embedder?.id === SHELL_CONTENT_BROWSER_ID && embedder?.ownerDocument?.documentURI === SHELL_DOCUMENT_URL;
  } catch {
    spec = "";
    embeddedByPrimary = false;
    embeddedByShell = false;
  }
  return (
    embeddedByPrimary &&
    embeddedByShell &&
    groupSenderPort !== null &&
    port === groupSenderPort &&
    groupSenderSpecIsTheia(spec)
  );
}
```

`groupSenderSpecIsTheia` itself stays byte-identical: `gui08-persistence-roundtrip` and `gui02-web-tab-bridge` derive from its tokens and from `embedderElement`/`primary` in `groupSenderIsTheia`.

Directly after the closing `},` of `registerGroupActor() { … }`, add:

```js
  /**
   * NG-038: records the sidecar's live port for the sender wall. Called by
   * TheiaService._swap before the Theia frame is navigated, and only there. A
   * non-positive or non-integer port clears it, which refuses every sender.
   */
  setGroupSenderPort(port) {
    groupSenderPort = Number.isInteger(port) && port > 0 ? port : null;
  },
```

- [ ] **Step 3: Set the port at the swap**

In `TheiaService.sys.mjs`, `_swap()` becomes:

```js
  _swap() {
    if (this._swapped) {
      return;
    }
    // NG-038: the actor's sender wall admits only this port's Theia frame.
    PowerBrowserAPI.setGroupSenderPort(this._port);
    this._browserElement.ownerDocument.defaultView.powerbrowserSwapToUrl(`http://127.0.0.1:${this._port}/`);
    this._swapped = true;
  },
```

The early-return guard stays first (`start-path-recovery` derives it).

- [ ] **Step 4: Catalogue**

Run `node scripts/verify-ng-040-internals-catalogue-lines.mjs --fix` (the new lines shift every row below them). No new pattern occurrence is added (`documentURI.port` and `ownerDocument.documentURI` match none). Append to the `Services.io.newURI` row's Purpose cell: "NG-038: `groupSenderIsTheia` also requires the sender's port to equal the sidecar's (set by `setGroupSenderPort` from `TheiaService._swap`) and its top embedder to be the shell window's `#powerbrowser-content`; `matches` cannot carry a port." Then `scripts/verify-platform.sh --only ng-040-internals-catalogue-lines` exits 0.

- [ ] **Step 5: Quick gate**

`scripts/verify-platform.sh --only gui02-web-tab-bridge`, `--only start-path-recovery`, `--only shell-error-contract` exit 0; the C8 gate prints nothing.

- [ ] **Step 6: Live check**

`live-main pending: ng-038-actor-refuses-hostile-senders`. Expected at merge: PASS (positive control ok, both hostile senders refused, no `ng038a`/`ng038b` group). Reviewer's call-site deletion (G6): remove the `setGroupSenderPort` call from `_swap` and the positive control fails (`the shell's own frame got no ok:true reply`); remove `embeddedByShell &&` and the sidecar-port sender is accepted.

- [ ] **Step 7: Commit**

```bash
git add powerbrowser/shell/PowerBrowserAPI.sys.mjs powerbrowser/shell/TheiaService.sys.mjs powerbrowser/INTERNAL-APIS.md
git commit -m "fix(ng-c): the group actor serves only the shell's own frame on the sidecar port" -m "Refs: NG-038"
```

---

### Task 4: Closing the core window quits the application (NG-037)

Row: NG-037.

**Files:**

- Modify: `powerbrowser/shell/PowerBrowserAPI.sys.mjs` (quit helpers: a new method after `onQuitGranted`)
- Modify: `powerbrowser/shell/powerbrowser.js` (the close button and the window's close event)
- Modify: `powerbrowser/INTERNAL-APIS.md`

**Interfaces:**

- Consumes: `TheiaService.stop()` on `quit-application-granted` (unchanged; it stops the backend).
- Produces: `PowerBrowserAPI.quitApplication(): boolean` — announces `quit-application-requested` (any observer may cancel; Task 10's flush does, once), then `Services.startup.quit(eAttemptQuit)`, which closes every window, stock ones included. Returns false when cancelled.

- [ ] **Step 1: Confirm the check fails**

`ng-037-core-close-quits` fails for `button` and `close-event` (Task 1 Step 18).

- [ ] **Step 2: The quit helper**

In `PowerBrowserAPI.sys.mjs`, directly after the closing `},` of `onQuitGranted(callback) { … }`, add:

```js
  /**
   * NG-037: quits the whole application the way upstream's quit paths do:
   * announce quit-application-requested so any observer may cancel (a page's
   * leave prompt; the shell's own flush, NG-032/NG-033), then an attempted
   * quit that closes every window, stock browser windows included. The
   * backend stops on the quit-application-granted that follows
   * (TheiaService.stop). Returns false when an observer cancelled.
   */
  quitApplication() {
    const cancelQuit = Cc["@mozilla.org/supports-PRBool;1"].createInstance(Ci.nsISupportsPRBool);
    Services.obs.notifyObservers(cancelQuit, "quit-application-requested");
    if (cancelQuit.data) {
      return false;
    }
    Services.startup.quit(Ci.nsIAppStartup.eAttemptQuit);
    return true;
  },
```

- [ ] **Step 3: The core window's close quits**

In `powerbrowser/shell/powerbrowser.js`, replace the line

```js
    document.getElementById("powerbrowser-window-close").addEventListener("click", () => window.close());
```

with:

```js
    // NG-037: the core window is the session (notes/browser-window-model.md:15-18).
    // Closing it -- this button, or the desktop's own close, which reaches the
    // window as its close event -- quits the whole application, stock browser
    // windows included, and that quit stops the backend. browser.xhtml answers
    // the same event the same way (upstream browser-main.js:41). Returning
    // false keeps the window open while the quit closes everything in order.
    const quitFromCoreClose = () => {
      PowerBrowserAPI.quitApplication();
      return false;
    };
    document.getElementById("powerbrowser-window-close").addEventListener("click", quitFromCoreClose);
    window.onclose = quitFromCoreClose;
```

`shell-error-contract` runs this bootstrap in a node sandbox: both statements are a listener registration and a property assignment, so the harness's fake `PowerBrowserAPI` is never called for `quitApplication`.

- [ ] **Step 4: Catalogue**

`node scripts/verify-ng-040-internals-catalogue-lines.mjs --fix`, then add a row for each line `bash scripts/check-internals-boundary.sh --catalogue` now names in `quitApplication`:

```markdown
| `Cc["@mozilla.org/supports-PRBool;1"]` / `Ci.nsISupportsPRBool` | `PowerBrowserAPI.sys.mjs:<line>` | `quitApplication` | The cancel flag every quit-application-requested observer may set (NG-037). | A boolean; no data. |
| `Services.obs.notifyObservers` | `PowerBrowserAPI.sys.mjs:<line>` | `quitApplication` | Announces quit-application-requested so leave prompts and the shell's flush run first. | Upstream's own quit paths send the same notification. |
| `Services.startup.quit` / `Ci.nsIAppStartup.eAttemptQuit` | `PowerBrowserAPI.sys.mjs:<line>` | `quitApplication` | Quits the application when the core window closes (NG-037); closes every window and triggers TheiaService.stop. | Reached only from the core window's close button and close event, and from TheiaService's re-issued quit (Task 10). |
```

`<line>` is the number the guard prints for that line. Run `scripts/verify-platform.sh --only ng-040-internals-catalogue-lines`: exit 0.

- [ ] **Step 5: Quick gate**

`--only shell-error-contract`, `--only shell-gbrowser-standin`, `--only internals-boundary` exit 0; the C8 gate prints nothing.

- [ ] **Step 6: Live check**

`live-main pending: ng-037-core-close-quits`; at merge also run `gui01-browser-close-does-not-quit` (closing a stock window must still leave the shell running). Reviewer's call-site deletion: restore `window.close()` on the button and the `button` variant fails; delete `window.onclose = …` and the `close-event` variant fails.

- [ ] **Step 7: Commit**

```bash
git add powerbrowser/shell/PowerBrowserAPI.sys.mjs powerbrowser/shell/powerbrowser.js powerbrowser/INTERNAL-APIS.md
git commit -m "fix(ng-c): closing the core window quits the app and stops the backend" -m "Refs: NG-037"
```

---

### Task 5: Restoring a setup activates its mode through ModeService (NG-029)

Row: NG-029 (the command restore and the launch restore, which share `restoreSetup`).

**Files:**

- Modify: `theia/extensions/modes/src/browser/setups-service.ts` (`restoreSetup`)
- Modify: `scripts/verify-mode-switch-tabs-invariant.mjs` (`DECLARED_LAYOUT_USES.switchPerspective`, Q1)

**Interfaces:**

- Consumes: `ModeService.activateMode(id: string): Promise<void>` (already injected as `this.modes`).
- Produces: a setup's mode is applied only through `ModeService.activateMode`; `setups-service.ts` no longer calls `switchPerspective` (it still reads `getActivePerspectiveId`).

- [ ] **Step 1: Confirm the check fails** — `ng-029-setup-restore-activates-mode` (Task 1 Step 18).

- [ ] **Step 2: Route the mode through ModeService**

In `restoreSetup`, replace the block from the comment `// Stock \`switchPerspective\` silently no-ops on unknown ids (never` through the closing `}` of the outer `try { … } catch { … }` with:

```ts
        // NG-029: the mode goes through ModeService.activateMode, the path the
        // mode toggle takes (GUI-DEFECTS item 6), so the panel map, the Explorer
        // dock, the Organising slot, the furniture and the mode attribute all
        // apply. A bare switchPerspective applied the perspective and none of
        // those. activateMode resolves an unknown id to Browsing by itself;
        // `known` only chooses the contracted fallback notice below.
        const knownCustom = this.modes.getCustomModes().some(custom => custom.id === row.modeId);
        const known = SHIPPED_MODES.some(descriptor => descriptor.id === row.modeId) || knownCustom;
        try {
            await this.modes.activateMode(known ? row.modeId : 'browsing');
        } catch {
            // activateMode has no rejecting path today; geometry and tabs still stand.
        }
```

The flash logic after it (`if (dropped > 0 && !known) { … }`) is unchanged. In the file header comment, the sentence starting "Restore (14-UI-SPEC.md named-setups section)" gains: "The mode is applied through ModeService (NG-029)."

- [ ] **Step 3: The invariant gate no longer declares setups as a switchPerspective caller (Q1)**

In `scripts/verify-mode-switch-tabs-invariant.mjs`, `DECLARED_LAYOUT_USES`:

```js
    switchPerspective: Object.freeze([SERVICE_REL]),
```

and in the comment above it, replace "the mode service's one anchored call and the setups restore path" with "the mode service's one anchored call (the setups restore goes through ModeService since NG-029)". Its self-test plants do not use this entry.

- [ ] **Step 4: Compile and quick gate**

```bash
nix develop .#theia --command bash -c 'cd theia/extensions/modes && yarn build'
scripts/verify-platform.sh --only gui07-mode-switch-tabs-invariant
scripts/verify-platform.sh --only gui07-mode-switch-tabs-invariant-self-test
scripts/verify-platform.sh --only gui09-setups-copy
scripts/verify-platform.sh --only gui09-setup-roundtrip
```

Expected: the build exits 0 and all four PASS. The C8 gate prints nothing.

- [ ] **Step 5: Live check (live-clone)**

`nix develop .#theia --command bash -c 'cd theia && yarn build'`, then run `ng-029-setup-restore-activates-mode` per C9. Expected: `ng-029-setup-restore-activates-mode: PASS`. Reviewer's call-site deletion: put `await this.perspectives.switchPerspective(...)` back in place of `activateMode` and the mode-attribute and furniture lines fail.

- [ ] **Step 6: Commit**

```bash
git add theia/extensions/modes/src/browser/setups-service.ts scripts/verify-mode-switch-tabs-invariant.mjs
git commit -m "fix(ng-c): setup restore applies its mode through ModeService" -m "Refs: NG-029"
```

---

### Task 6: Restoring a setup opens each tab once (NG-030)

Row: NG-030.

**Files:**

- Modify: `theia/extensions/modes/src/browser/setups-service.ts` (`tabsOfShell`, new `tabPlacer`, `placeTabs`)

**Interfaces:**

- Consumes: `openTabUri(tab: string): Promise<Widget | true | null>` (unchanged).
- Produces: `tabsOfShell(): Array<{ id: string; uri: string; widget: Widget }>`; `tabPlacer(): (tab: string) => Promise<Widget | true | null>`; `placeTabs(row: Pick<SetupSnapshot, 'windows'>): Promise<number>`. Task 8 places dock trees through the same placer.

- [ ] **Step 1: Confirm the check fails** — `ng-030-setup-restore-opens-tabs-once` (Task 1 Step 18).

- [ ] **Step 2: `tabsOfShell` carries the widget**

```ts
    /** All core-model tabs as opaque URIs (registry first, editor resource fallback), with their widgets. */
    protected tabsOfShell(): Array<{ id: string; uri: string; widget: Widget }> {
        const out: Array<{ id: string; uri: string; widget: Widget }> = [];
        for (const tabBar of this.shell.allTabBars) {
            for (const title of tabBar.titles) {
                const widget = title.owner;
                if (!widget) {
                    continue;
                }
                const uri = this.tabUriOf(widget);
                if (uri !== undefined) {
                    out.push({ id: widget.id, uri, widget });
                }
            }
        }
        return out;
    }
```

- [ ] **Step 3: One placer per restore; `placeTabs` uses it**

Add above `placeTabs`:

```ts
    /**
     * NG-030: one placer per restore. A URI this restore already placed, or a
     * tab already open in the shell when it began, resolves to that widget and
     * is never opened again; only an unseen URI goes through the opener. Two
     * web tabs on one page share one registry address (docs/URI-SCHEMES.md:250-254),
     * so a setup restores that page once.
     */
    protected tabPlacer(): (tab: string) => Promise<Widget | true | null> {
        const placed = new Map<string, Widget>();
        for (const entry of this.tabsOfShell()) {
            if (!placed.has(entry.uri)) {
                placed.set(entry.uri, entry.widget);
            }
        }
        return async tab => {
            const existing = placed.get(tab);
            if (existing) {
                return existing;
            }
            const opened = await this.openTabUri(tab);
            if (opened instanceof Widget) {
                placed.set(tab, opened);
            }
            return opened;
        };
    }
```

Replace `placeTabs` with:

```ts
    /**
     * Place every recorded tab through the placer. Returns the count of URIs
     * that no longer resolve (dropped, never forced -- T-14-03-02). Dependent
     * rows re-host through the stock handler after their tabs resolve.
     */
    protected async placeTabs(row: Pick<SetupSnapshot, 'windows'>): Promise<number> {
        const place = this.tabPlacer();
        let dropped = 0;
        const core = row.windows[0];
        for (const tab of core.tabs) {
            if ((await place(tab)) === null) {
                dropped += 1;
            }
        }
        // NG-030: the active tab is activated, never opened a second time.
        if (core.activeTab) {
            const active = await place(core.activeTab);
            if (active instanceof Widget) {
                await this.shell.activateWidget(active.id);
            }
        }
        for (const dependent of row.windows.slice(1)) {
            const widgets: Widget[] = [];
            for (const tab of dependent.tabs) {
                const widget = await place(tab);
                if (widget === null) {
                    dropped += 1;
                } else if (widget instanceof Widget) {
                    widgets.push(widget);
                }
            }
            this.hostDependent(widgets, dependent);
        }
        return dropped;
    }
```

- [ ] **Step 4: Compile and quick gate** — as Task 5 Step 4 (build `modes`; `gui07-mode-switch-tabs-invariant`, `gui09-setups-copy`, `gui09-setup-roundtrip`, `gui09-dependent-window-content` PASS); C8 prints nothing.

- [ ] **Step 5: Live check (live-clone)** — `ng-030-setup-restore-opens-tabs-once` PASS per C9, after `yarn build` in `theia/`. Also run `ng-029-setup-restore-activates-mode` (still PASS).

- [ ] **Step 6: Commit**

```bash
git add theia/extensions/modes/src/browser/setups-service.ts
git commit -m "fix(ng-c): setup restore opens each tab once and reuses open tabs" -m "Refs: NG-030"
```

---

### Task 7: Restore Setup and Open Tab in Own Window in the palette and the View menu (NG-031)

Row: NG-031. Copy (C10): **"Restore Setup"** (matches the picker placeholder 14-UI-SPEC.md:223 already contracts) and **"Open Tab in Own Window"** (matches the contracted refusal "Power Browser can't open this tab in its own window", 14-UI-SPEC.md:233). Menu: View, in a `pb_setups` group of its layout section. Nothing else is added.

**Files:**

- Modify: `theia/extensions/modes/src/browser/setups-commands.ts`
- Modify: `theia/extensions/modes/src/browser/setups-service.ts` (the doc comment of `SETUP_DEPENDENT_UNSUPPORTED` only; the string is unchanged)
- Modify: `scripts/verify-setup-roundtrip.mjs` (the label contract, Q1)

**Interfaces:**

- Consumes: `MenuModelRegistry.registerMenuAction(path, { commandId, order })`, `CommonMenus.VIEW_LAYOUT` (`['menubar', '4_view', '3_layout']` in @theia/core 1.74.1).
- Produces: `SETUPS_RESTORE.label === 'Restore Setup'`, `SETUPS_OPEN_DEPENDENT.label === 'Open Tab in Own Window'`, `SETUPS_MENU = [...CommonMenus.VIEW_LAYOUT, 'pb_setups']`.

- [ ] **Step 1: Confirm the check fails** — `ng-031-setup-commands-reachable` (Task 1 Step 18).

- [ ] **Step 2: Labels and menu entries**

Replace `setups-commands.ts` with:

```ts
import { injectable, inject } from '@theia/core/shared/inversify';
import { Command, CommandContribution, CommandRegistry, MenuModelRegistry } from '@theia/core/lib/common';
import { CommonMenus } from '@theia/core/lib/browser';
import { SetupsService } from './setups-service';

/**
 * GUI-09 (14-03): the setups extension's four commands.
 *
 * Command-per-action model (chrome-bar-commands.ts precedent): each id is a
 * named export so the roundtrip gate imports the const instead of retyping
 * the string. Save and Delete carry 14-UI-SPEC.md's contracted labels
 * verbatim. NG-031: Restore and the dependent-window command carry labels
 * too, so the palette lists them, and both sit in the View menu. Delete Setup
 * is the ONLY destructive action in the phase (contracted confirmation, no
 * undo); core-close deliberately carries no dialog.
 */
export const SETUPS_SAVE_COMMAND_ID = 'powerbrowser.setups.save-setup';
export const SETUPS_DELETE_COMMAND_ID = 'powerbrowser.setups.delete-setup';
export const SETUPS_RESTORE_COMMAND_ID = 'powerbrowser.setups.restore-setup';
export const SETUPS_OPEN_DEPENDENT_COMMAND_ID = 'powerbrowser.setups.open-dependent';

export const SETUPS_SAVE: Command = {
    id: SETUPS_SAVE_COMMAND_ID,
    label: 'Save Setup',
};

export const SETUPS_DELETE: Command = {
    id: SETUPS_DELETE_COMMAND_ID,
    label: 'Delete Setup',
};

export const SETUPS_RESTORE: Command = {
    id: SETUPS_RESTORE_COMMAND_ID,
    label: 'Restore Setup',
};

export const SETUPS_OPEN_DEPENDENT: Command = {
    id: SETUPS_OPEN_DEPENDENT_COMMAND_ID,
    label: 'Open Tab in Own Window',
};

/** NG-031: the View menu group both entries live in (View, layout section). */
export const SETUPS_MENU = [...CommonMenus.VIEW_LAYOUT, 'pb_setups'];

@injectable()
export class SetupsCommandContribution implements CommandContribution {

    @inject(SetupsService)
    protected readonly setups: SetupsService;

    @inject(MenuModelRegistry)
    protected readonly menus: MenuModelRegistry;

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(SETUPS_SAVE, {
            execute: () => this.setups.saveCurrentAsSetup(),
        });
        commands.registerCommand(SETUPS_DELETE, {
            execute: () => this.setups.deleteSetup(),
        });
        commands.registerCommand(SETUPS_RESTORE, {
            execute: (name: string | undefined) => this.setups.restoreSetup(typeof name === 'string' ? name : undefined),
        });
        commands.registerCommand(SETUPS_OPEN_DEPENDENT, {
            execute: (widgetId: string | undefined) => this.setups.openDependent(typeof widgetId === 'string' ? widgetId : undefined),
        });
        // NG-031: registered here, not in a MenuContribution, because binding
        // one takes a line in modes-frontend-module.ts, which this wave does not
        // own (questions-wave-c.md Q1). The menu bar is filled after
        // corePreferences.ready, which is after every CommandContribution has
        // run, and it re-fills on every menu-model change under 'menubar', so
        // both entries are there when it paints.
        this.menus.registerMenuAction(SETUPS_MENU, { commandId: SETUPS_RESTORE.id, order: '1' });
        this.menus.registerMenuAction(SETUPS_MENU, { commandId: SETUPS_OPEN_DEPENDENT.id, order: '2' });
    }
}
```

In `setups-service.ts`, the doc comment above `SETUP_DEPENDENT_UNSUPPORTED` says the command carries no palette label; replace its last two sentences with: "NG-031 gave the command a palette label and a menu entry, which 14-UI-SPEC.md:233 says makes a retry clause true again; the string is left as contracted until the spec row and this constant change together (questions-wave-c.md Q6)." Do not change the string itself: `gui09-setups-copy` compares it with the spec.

- [ ] **Step 3: The roundtrip gate's label contract (Q1)**

In `scripts/verify-setup-roundtrip.mjs`, after `const EXPECTED_DELETE_LABEL = 'Delete Setup';` add:

```js
/** NG-031: restore and the dependent-window command are palette- and menu-reachable, so they carry labels. */
const EXPECTED_RESTORE_LABEL = 'Restore Setup';
const EXPECTED_DEPENDENT_LABEL = 'Open Tab in Own Window';
```

Replace the label block in `checkRoundtrip` -- from `const labels = derivedCommandLabelsOf(commandsSrc);` through the end of the `for (const decl of ['SETUPS_RESTORE', 'SETUPS_OPEN_DEPENDENT']) { … }` loop -- with:

```js
    const labels = derivedCommandLabelsOf(commandsSrc);
    const expectedLabels = [EXPECTED_SAVE_LABEL, EXPECTED_DELETE_LABEL, EXPECTED_RESTORE_LABEL, EXPECTED_DEPENDENT_LABEL];
    for (const expected of expectedLabels) {
        if (!labels.includes(expected)) {
            failures.push(`${COMMANDS_REL}: contracted label '${expected}' missing (got [${labels.join(', ')}]) -- the copy contract broke`);
        }
    }
    if (labels.length !== expectedLabels.length) {
        failures.push(`${COMMANDS_REL}: the setup commands must carry exactly four labels (save, delete, restore, dependent-open; NG-031) (got [${labels.join(', ')}])`);
    }
```

In the header comment, "the contracted save/delete labels verbatim with the restore/dependent commands asserted labelless" becomes "the four command labels verbatim (save and delete from 14-UI-SPEC.md, restore and dependent-open from NG-031)".

- [ ] **Step 4: Compile and quick gate**

Build `modes`; then `gui09-setup-roundtrip`, `gui09-setup-roundtrip-self-test`, `gui09-setups-copy`, `gui09-dependent-window-content`, `gui07-mode-toggle-commands` PASS; C8 prints nothing.

- [ ] **Step 5: Live check (live-clone)** — `ng-031-setup-commands-reachable` PASS per C9, after `yarn build` in `theia/`. Reviewer's call-site deletion: drop the two `registerMenuAction` lines and `is in no menu of the menu bar` fails for both ids.

- [ ] **Step 6: Commit**

```bash
git add theia/extensions/modes/src/browser/setups-commands.ts theia/extensions/modes/src/browser/setups-service.ts scripts/verify-setup-roundtrip.mjs
git commit -m "feat(ng-c): Restore Setup and Open Tab in Own Window in the palette and View menu" -m "Refs: NG-031"
```

---

### Task 8: A setup records dock and split positions, tab order and the mode of each window (NG-036)

Row: NG-036.

**Files:**

- Modify: `theia/extensions/modes/src/browser/setups-service.ts` (types, parsing, `snapshotWindows`, `placeTabs`, `restoreSetup`'s mode id, new `dockNodeOf`, `restoreDock`, `applyDockArea`)
- Modify: `scripts/verify-setup-roundtrip.mjs` (`EXPECTED_WINDOW_FIELDS`, Q1)

**Interfaces:**

- Consumes: `tabPlacer()` and `placeTabs` from Task 6; Lumino `DockPanel.saveLayout(): DockPanel.ILayoutConfig` and `restoreLayout(config)` on `this.shell.mainPanel` and `this.shell.bottomPanel`.
- Produces: `SetupDockNode`, `SetupDock`, `SetupWindowSnapshot.modeId: string | null`, `SetupWindowSnapshot.dock?: SetupDock` (the Task 1 contract); `dockNodeOf(area): SetupDockNode | null`; `restoreDock(dock, place): Promise<number>`. Task 11's session snapshot is built by the same `snapshotWindows()`.

- [ ] **Step 1: Confirm the check fails** — `ng-036-setup-records-dock-layout` (Task 1 Step 18).

- [ ] **Step 2: Types**

Add to the imports:

```ts
import { DockLayout, DockPanel } from '@theia/core/shared/@lumino/widgets';
```

Add above `export interface SetupWindowSnapshot`:

```ts
/**
 * NG-036: one dock area of a window as tab URIs. A tab area keeps its tab
 * order and its current tab; a split keeps its orientation and the children's
 * relative sizes.
 */
export type SetupDockNode =
    | { type: 'tabs'; tabs: string[]; current: string | null }
    | { type: 'split'; orientation: 'horizontal' | 'vertical'; sizes: number[]; children: SetupDockNode[] };

/** NG-036: where each tab of a window is docked -- the main area's split tree and the bottom panel's. */
export interface SetupDock {
    main: SetupDockNode | null;
    bottom: SetupDockNode | null;
}

/** NG-036: the deepest split nesting a stored tree is read to; a deeper subtree is dropped. */
const SETUP_DOCK_MAX_DEPTH = 8;
```

`SetupWindowSnapshot` gains two fields after `activeTab`:

```ts
    /** NG-036: the mode this window was in; null for a dependent, which hosts tab content only and has no mode. */
    modeId: string | null;
    /** NG-036: the dock layout; absent on rows written before it, which restore from `tabs`. */
    dock?: SetupDock;
```

- [ ] **Step 3: Parsing (total, never throws)**

Add directly after `isFiniteNumber`:

```ts
function parseSetupDockNode(entry: unknown, depth: number): SetupDockNode | null {
    if (depth > SETUP_DOCK_MAX_DEPTH || typeof entry !== 'object' || entry === null) {
        return null;
    }
    const node = entry as Record<string, unknown>;
    if (node['type'] === 'tabs' && Array.isArray(node['tabs'])) {
        const tabs = (node['tabs'] as unknown[]).filter((tab): tab is string => typeof tab === 'string' && tab.length > 0);
        if (tabs.length === 0) {
            return null;
        }
        const current = typeof node['current'] === 'string' && tabs.includes(node['current']) ? node['current'] as string : null;
        return { type: 'tabs', tabs, current };
    }
    const orientation = node['orientation'];
    if (node['type'] === 'split' && (orientation === 'horizontal' || orientation === 'vertical')
        && Array.isArray(node['children']) && Array.isArray(node['sizes'])) {
        const sizesIn = node['sizes'] as unknown[];
        const children: SetupDockNode[] = [];
        const sizes: number[] = [];
        (node['children'] as unknown[]).forEach((child, index) => {
            const parsed = parseSetupDockNode(child, depth + 1);
            if (parsed) {
                children.push(parsed);
                const size = sizesIn[index];
                sizes.push(isFiniteNumber(size) && size > 0 ? size : 1);
            }
        });
        if (children.length === 0) {
            return null;
        }
        return children.length === 1 ? children[0] : { type: 'split', orientation, sizes, children };
    }
    return null;
}

function parseSetupDock(entry: unknown): SetupDock | undefined {
    if (typeof entry !== 'object' || entry === null) {
        return undefined;
    }
    const dock = entry as Record<string, unknown>;
    return { main: parseSetupDockNode(dock['main'], 0), bottom: parseSetupDockNode(dock['bottom'], 0) };
}
```

In `parseSetupWindow`, replace the final `return { … };` with:

```ts
    const modeId = typeof row['modeId'] === 'string' && row['modeId'].length > 0 ? row['modeId'] as string : null;
    const dock = parseSetupDock(row['dock']);
    return { x: row['x'], y: row['y'], width: row['width'], height: row['height'], tabs, activeTab, modeId, ...(dock ? { dock } : {}) };
```

- [ ] **Step 4: Snapshot**

In `snapshotWindows`, the core literal gains, after `activeTab: …,`:

```ts
            modeId: this.currentModeId(),
            dock: {
                main: this.dockNodeOf(this.shell.mainPanel.saveLayout().main),
                bottom: this.dockNodeOf(this.shell.bottomPanel.saveLayout().main),
            },
```

and each dependent literal gains `modeId: null,` after `activeTab: uri ?? null,`. Add after `snapshotWindows`:

```ts
    /**
     * NG-036: a Lumino area config as tab URIs. Tabs with no URI (the
     * Organising canvas, unowned widgets) are left out; empty areas and
     * one-child splits collapse.
     */
    protected dockNodeOf(area: DockLayout.AreaConfig | null): SetupDockNode | null {
        if (!area) {
            return null;
        }
        if (area.type === 'tab-area') {
            const tabs: string[] = [];
            for (const widget of area.widgets) {
                const uri = this.tabUriOf(widget);
                if (uri !== undefined && !tabs.includes(uri)) {
                    tabs.push(uri);
                }
            }
            if (tabs.length === 0) {
                return null;
            }
            const currentWidget = area.widgets[area.currentIndex];
            const current = currentWidget ? this.tabUriOf(currentWidget) ?? null : null;
            return { type: 'tabs', tabs, current: current !== null && tabs.includes(current) ? current : null };
        }
        const children: SetupDockNode[] = [];
        const sizes: number[] = [];
        area.children.forEach((child, index) => {
            const node = this.dockNodeOf(child);
            if (node) {
                children.push(node);
                sizes.push(area.sizes[index] ?? 1);
            }
        });
        if (children.length === 0) {
            return null;
        }
        return children.length === 1 ? children[0] : { type: 'split', orientation: area.orientation, sizes, children };
    }
```

- [ ] **Step 5: Restore the dock**

Add at module level, after `parseSetupDock`:

```ts
function widgetsOfArea(area: DockLayout.AreaConfig | null): Widget[] {
    if (!area) {
        return [];
    }
    return area.type === 'tab-area' ? area.widgets : area.children.flatMap(widgetsOfArea);
}

function firstTabArea(area: DockLayout.AreaConfig): DockLayout.ITabAreaConfig {
    return area.type === 'tab-area' ? area : firstTabArea(area.children[0]);
}
```

Add after `placeTabs`:

```ts
    /**
     * NG-036: rebuilds the main area's split tree and the bottom panel's from a
     * saved dock, placing every tab through `place` (so nothing already open is
     * opened again). Lumino's restoreLayout unparents every widget of a panel
     * the config leaves out, so each widget already in the panel and not placed
     * by the setup rides along in the config's first tab area: a restore never
     * closes or detaches a tab (notes/browser-window-model.md:46-49). Returns
     * the number of saved tabs that no longer open.
     */
    protected async restoreDock(dock: SetupDock, place: (tab: string) => Promise<Widget | true | null>): Promise<number> {
        let dropped = 0;
        const build = async (node: SetupDockNode | null): Promise<DockLayout.AreaConfig | null> => {
            if (!node) {
                return null;
            }
            if (node.type === 'tabs') {
                const widgets: Widget[] = [];
                for (const tab of node.tabs) {
                    const placed = await place(tab);
                    if (placed === null) {
                        dropped += 1;
                    } else if (placed instanceof Widget && !widgets.includes(placed)) {
                        widgets.push(placed);
                    }
                }
                if (widgets.length === 0) {
                    return null;
                }
                const current = node.current === null ? 0 : widgets.findIndex(widget => this.tabUriOf(widget) === node.current);
                return { type: 'tab-area', widgets, currentIndex: Math.max(0, current) };
            }
            const children: DockLayout.AreaConfig[] = [];
            const sizes: number[] = [];
            for (let index = 0; index < node.children.length; index += 1) {
                const child = await build(node.children[index]);
                if (child) {
                    children.push(child);
                    sizes.push(node.sizes[index] ?? 1);
                }
            }
            if (children.length === 0) {
                return null;
            }
            return children.length === 1 ? children[0] : { type: 'split-area', orientation: node.orientation, children, sizes };
        };
        const main = await build(dock.main);
        const bottom = await build(dock.bottom);
        const assigned = new Set<Widget>([...widgetsOfArea(main), ...widgetsOfArea(bottom)]);
        this.applyDockArea(this.shell.bottomPanel, bottom, assigned);
        this.applyDockArea(this.shell.mainPanel, main, assigned);
        return dropped;
    }

    protected applyDockArea(panel: DockPanel, area: DockLayout.AreaConfig | null, assigned: Set<Widget>): void {
        if (!area) {
            return;
        }
        const others = Array.from(panel.widgets()).filter(widget => !assigned.has(widget));
        firstTabArea(area).widgets.push(...others);
        panel.restoreLayout({ main: area });
    }
```

In `placeTabs`, replace the core loop `for (const tab of core.tabs) { … }` with:

```ts
        if (core.dock) {
            dropped += await this.restoreDock(core.dock, place);
        } else {
            for (const tab of core.tabs) {
                if ((await place(tab)) === null) {
                    dropped += 1;
                }
            }
        }
```

In `restoreSetup`, the mode now comes from the core window when the row has one: replace every `row.modeId` in the Task 5 block with `modeId` and put `const modeId = row.windows[0].modeId ?? row.modeId;` directly above `const knownCustom = …`.

- [ ] **Step 6: The roundtrip gate's window fields (Q1)**

In `scripts/verify-setup-roundtrip.mjs`:

```js
const EXPECTED_WINDOW_FIELDS = Object.freeze(['x', 'y', 'width', 'height', 'tabs', 'activeTab', 'modeId', 'dock']);
```

Its fixture builder gives unknown fields a `planted-<field>` string, which round-trips unchanged; nothing else in the gate changes.

- [ ] **Step 7: Compile and quick gate** — build `modes`; `gui09-setup-roundtrip`, `gui09-setup-roundtrip-self-test`, `gui09-setups-copy`, `gui09-dependent-window-content`, `gui07-mode-switch-tabs-invariant` (the whole-file vocabulary names no `DockPanel` method) PASS; C8 prints nothing.

- [ ] **Step 8: Live check (live-clone)** — after `yarn build` in `theia/`, `ng-036-setup-records-dock-layout`, `ng-030-setup-restore-opens-tabs-once` and `ng-029-setup-restore-activates-mode` PASS per C9. At merge, `gui07-mode-switch-tabs-live` still PASSES (setups do not touch the mode switch).

- [ ] **Step 9: Commit**

```bash
git add theia/extensions/modes/src/browser/setups-service.ts scripts/verify-setup-roundtrip.mjs
git commit -m "feat(ng-c): setups record the dock and split layout, tab order and each window's mode" -m "Refs: NG-036"
```

---

### Task 9: Mode rules are data; a custom mode saves its layout (NG-035)

Row: NG-035.

**Files:**

- Modify: `theia/extensions/modes/src/browser/mode-service.ts`
- Modify: `scripts/verify-mode-toggle-commands.mjs` (derive the shipped rules from the table, Q1)

**Interfaces:**

- Consumes: `SHIPPED_MODES` (mode-descriptors.ts, unchanged), `ensureInArea`, `WidgetManager.getDescription`.
- Produces: `PanelRule = 'open' | 'closed' | 'keep'`; `ModeViews { left: string[]; right: string[]; bottom: string[] }`; `ModeRules { left; right; bottom: PanelRule; furniture: boolean; organising: boolean; views: ModeViews }`; `SHIPPED_MODE_RULES: Readonly<Record<string, ModeRules>>` (one row per line); `CustomModeSnapshot` gains `furniture: boolean` and `views: ModeViews`; `ModeService.rulesFor(target: string): ModeRules` replaces `visibilityFor`. `activateMode` reads only `rulesFor`; its shell-mutating call set is unchanged (`gui07-mode-switch-tabs-invariant`).

- [ ] **Step 1: Confirm the check fails** — `ng-035-custom-mode-saves-layout` (Task 1 Step 18).

- [ ] **Step 2: The rules as data**

In `mode-service.ts`, replace the `CustomModeSnapshot` interface with:

```ts
/** NG-035: what a mode does to one side area -- open it, close it, or leave it as the user left it. */
export type PanelRule = 'open' | 'closed' | 'keep';

/**
 * NG-035: the singleton views a mode docks in each side area, in tab order.
 * Content tabs (terminals, editors, web tabs) are never listed: tabs go with
 * you in every mode (notes/browser-window-model.md:46-49).
 */
export interface ModeViews {
    left: string[];
    right: string[];
    bottom: string[];
}

/**
 * NG-035: one mode's rules, as data. The shipped defaults below and every
 * custom row in modes.json resolve to this one shape, and activateMode reads
 * nothing else -- it branches on no mode id.
 */
export interface ModeRules {
    left: PanelRule;
    right: PanelRule;
    bottom: PanelRule;
    /** The IDE furniture: the status bar and both icon rails (14-UI-SPEC per-mode furniture, amended 2026-09-08). */
    furniture: boolean;
    /** Whether the mode opens the Organising slot (the Panorama canvas). */
    organising: boolean;
    views: ModeViews;
}

/**
 * NG-035: the shipped defaults as data (14-CONTEXT.md:33, "Modes are data
 * with shipped defaults"). One row per shipped descriptor, one line per row:
 * gui07-mode-toggle-commands reads this table and compares it with the
 * descriptors' first-activation placements and collapse areas.
 */
export const SHIPPED_MODE_RULES: Readonly<Record<string, ModeRules>> = Object.freeze({
    coding: { left: 'open', right: 'keep', bottom: 'open', furniture: true, organising: false, views: { left: ['explorer-view-container'], right: [], bottom: [] } },
    browsing: { left: 'closed', right: 'closed', bottom: 'closed', furniture: false, organising: false, views: { left: [], right: [], bottom: [] } },
    organising: { left: 'closed', right: 'closed', bottom: 'closed', furniture: false, organising: true, views: { left: [], right: [], bottom: [] } },
});

export interface CustomModeSnapshot {
    name: string;
    leftVisible: boolean;
    rightVisible: boolean;
    bottomVisible: boolean;
    /** NG-035: whether the IDE furniture shows in this mode. */
    furniture: boolean;
    /** NG-035: the views docked per side area when the mode was saved. */
    views: ModeViews;
}

function viewList(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string' && id.length > 0) : [];
}

/** NG-035: a stored views object, or undefined when absent or unreadable. */
function parseModeViews(value: unknown): ModeViews | undefined {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return undefined;
    }
    const record = value as Record<string, unknown>;
    return { left: viewList(record['left']), right: viewList(record['right']), bottom: viewList(record['bottom']) };
}

/**
 * NG-035: a row saved before views existed keeps what it did then -- the
 * shipped Coding views on the left whenever its left panel shows.
 */
function legacyModeViews(leftVisible: boolean): ModeViews {
    return { left: leftVisible ? [...SHIPPED_MODE_RULES.coding.views.left] : [], right: [], bottom: [] };
}
```

In `parseModeStore`, replace the `// A \`layout\` written by an older build …` comment and the `customs.push({ … });` after it with:

```ts
        // NG-035: `furniture` and `views` are optional so a row written before
        // them still loads; a `layout` from an older build is an unknown field
        // and drops as before.
        customs.push({
            name,
            leftVisible: row['leftVisible'] as boolean,
            rightVisible: row['rightVisible'] as boolean,
            bottomVisible: row['bottomVisible'] as boolean,
            furniture: row['furniture'] === true,
            views: parseModeViews(row['views']) ?? legacyModeViews(row['leftVisible'] as boolean),
        });
```

In the file header, replace the sentence "A row once also carried a shell layout snapshot; nothing ever read it back, so the field is gone -- the reader already drops unknown fields, so an old file still loads and the version did not move." with "NG-035: a row also carries `furniture` and `views` (which views sit in which side area); both are optional, so a file written before them still loads and the version did not move. Shipped modes resolve to the same shape through SHIPPED_MODE_RULES."

- [ ] **Step 3: `activateMode` reads the rules**

Replace the body of `activateMode` from `await this.perspectives.switchPerspective(target);` down to (not including) the furniture comment block `// 14-UI-SPEC per-mode furniture (amended 2026-09-08): …` with:

```ts
        await this.perspectives.switchPerspective(target);
        const rules = this.rulesFor(target);
        // NG-035: dock the mode's views before any panel opens or closes.
        // ensureInArea is additive (see its note below), and stock's
        // expand(id) finds only a view already in the dock.
        for (const area of ['left', 'right', 'bottom'] as const) {
            for (const viewId of rules.views[area]) {
                await this.ensureInArea(viewId, area);
            }
        }
        // collapse() floats a promise (expand is sync void): attach the
        // no-op catch so a shutdown-time rejection is silence, not noise.
        if (rules.left === 'open') {
            this.shell.leftPanelHandler.expand(rules.views.left[0]);
        } else if (rules.left === 'closed') {
            void this.shell.leftPanelHandler.collapse().catch(() => undefined);
        }
        if (rules.right === 'open') {
            this.shell.rightPanelHandler.expand(rules.views.right[0]);
        } else if (rules.right === 'closed') {
            void this.shell.rightPanelHandler.collapse().catch(() => undefined);
        }
        if (rules.bottom === 'open') {
            this.shell.expandPanel('bottom');
        } else if (rules.bottom === 'closed') {
            await this.shell.collapsePanel('bottom');
        }
        if (rules.organising) {
            openOrganisingSlot();
        } else {
            closeOrganisingSlot();
        }
```

Keep the furniture comment block, then replace `const keepsFurniture = target === 'coding';` and the three `setHidden(!keepsFurniture)` lines with:

```ts
        this.statusBarWidget.setHidden(!rules.furniture);
        this.shell.leftPanelHandler.container.setHidden(!rules.furniture);
        // Both rails, not just the left: the right one is the same 48px of
        // IDE dress on the other edge.
        this.shell.rightPanelHandler.container.setHidden(!rules.furniture);
```

In the furniture comment, change "Coding is the only mode that keeps the left icon rail and the status bar" to "a mode's `furniture` rule decides whether it keeps the icon rails and the status bar (Coding's shipped row does)". `publishModeAttribute(target);` stays last. `ensureInArea`'s signature becomes `protected async ensureInArea(viewId: string, area: 'left' | 'right' | 'bottom'): Promise<void>` (body unchanged).

- [ ] **Step 4: `rulesFor` replaces `visibilityFor`; save and register carry the layout**

Delete `visibilityFor` and add:

```ts
    /** NG-035: the rules for a resolved mode id -- its shipped row, its custom row, or Browsing's. */
    protected rulesFor(target: string): ModeRules {
        if (SHIPPED_IDS.has(target) && Object.prototype.hasOwnProperty.call(SHIPPED_MODE_RULES, target)) {
            return SHIPPED_MODE_RULES[target];
        }
        const custom = this.lastGoodCustoms.find(row => customModeIdFor(row.name) === target);
        if (custom) {
            return {
                left: custom.leftVisible ? 'open' : 'closed',
                right: custom.rightVisible ? 'open' : 'closed',
                bottom: custom.bottomVisible ? 'open' : 'closed',
                furniture: custom.furniture,
                organising: false,
                views: custom.views,
            };
        }
        return SHIPPED_MODE_RULES.browsing;
    }

    /**
     * NG-035: the singleton views docked in `area`, as their factory ids. A
     * widget created with options (a terminal, an editor, a plugin view) is a
     * tab or an instance, not layout, and is left out.
     */
    protected viewsIn(area: 'left' | 'right' | 'bottom'): string[] {
        const ids: string[] = [];
        for (const widget of this.shell.getWidgets(area)) {
            const description = this.widgetManager.getDescription(widget);
            if (description && description.options === undefined && !ids.includes(description.factoryId)) {
                ids.push(description.factoryId);
            }
        }
        return ids;
    }
```

In `saveCurrentAsMode`, the row literal becomes:

```ts
        const row: CustomModeSnapshot = {
            name,
            leftVisible: this.shell.isExpanded('left'),
            rightVisible: this.shell.isExpanded('right'),
            bottomVisible: this.shell.isExpanded('bottom'),
            // NG-035: the layout, not only the three flags -- which views sit in
            // which side area, and whether the IDE furniture is showing.
            furniture: !this.statusBarWidget.isHidden,
            views: { left: this.viewsIn('left'), right: this.viewsIn('right'), bottom: this.viewsIn('bottom') },
        };
```

In `registerCustom`, the descriptor's `viewPlacements: new Map(),` becomes `viewPlacements: placements,` with, just above the `try`:

```ts
        // NG-035: stock applies these on the mode's first activation; activateMode docks them on every one.
        const placements = new Map<string, 'left' | 'right' | 'bottom'>();
        for (const area of ['left', 'right', 'bottom'] as const) {
            for (const viewId of row.views[area]) {
                placements.set(viewId, area);
            }
        }
```

The three user-visible "Power Browser …" flash strings stay byte-identical (C5).

- [ ] **Step 5: The toggle gate derives the rules table (Q1)**

In `scripts/verify-mode-toggle-commands.mjs`, delete `derivedEnsureInAreaOf` and `derivedVisibilityFlags` and add in their place:

```js
/**
 * NG-035: the shipped rows of the mode service's SHIPPED_MODE_RULES table,
 * one row per line: `{ byId: { <id>: { left, right, bottom, placements } } }`,
 * each area rule the literal 'open' | 'closed' | 'keep' and each placement a
 * `view->area` string. Undefined when the table cannot be read.
 */
function derivedShippedRules(source) {
    const at = source.search(/export const SHIPPED_MODE_RULES\b/);
    if (at < 0) {
        return undefined;
    }
    const end = source.indexOf('});', at);
    const block = source.slice(at, end < 0 ? undefined : end);
    const byId = {};
    for (const row of block.matchAll(/^\s*(\w+):\s*\{(.*)\},?\s*$/gm)) {
        const text = row[2];
        const rule = { placements: [] };
        for (const area of AREAS) {
            const m = new RegExp(`\\b${area}:\\s*'(open|closed|keep)'`).exec(text);
            if (m) {
                rule[area] = m[1];
            }
        }
        const views = /views:\s*\{([^}]*)\}/.exec(text);
        for (const area of views ? AREAS : []) {
            const list = new RegExp(`\\b${area}:\\s*\\[([^\\]]*)\\]`).exec(views[1]);
            for (const view of list ? list[1].matchAll(/'([^']+)'/g) : []) {
                rule.placements.push(`${view[1]}->${area}`);
            }
        }
        if (AREAS.every(area => rule[area])) {
            byId[row[1]] = rule;
        }
    }
    return Object.keys(byId).length ? { byId } : undefined;
}
```

In `checkModes`, replace sections 2 and 3 (from `    // 2. First-activation placements vs the every-activation dock.` up to the line before `    // 4. The toggle's channel`) with:

```js
    // 2 and 3. First-activation placements and collapse areas (the
    // descriptors) vs the every-activation rules (SHIPPED_MODE_RULES, NG-035).
    // Stock applies viewPlacements and collapseAreas once; activateMode applies
    // the rules on every visit, so the two must agree or a mode looks different
    // on its second visit than its first.
    const declaredPlacements = modes.flatMap(m => m.placements);
    const rules = derivedShippedRules(serviceSrc);
    if (declaredPlacements.length === 0) {
        failures.push(`${DESCRIPTORS_REL}: derived ZERO view placements across every shipped mode -- no descriptor places a view, so the placement comparison would pass on an empty set`);
    }
    if (!rules) {
        failures.push(`${SERVICE_REL}: could not derive SHIPPED_MODE_RULES -- the every-activation half of the mode contract is unreadable, so the comparison proves nothing`);
    } else {
        const applied = Object.values(rules.byId).flatMap(rule => rule.placements);
        const placementDiff = diff(applied, declaredPlacements);
        if (placementDiff.surplus.length) {
            failures.push(`${SERVICE_REL}: SHIPPED_MODE_RULES docks a view no shipped descriptor places: ${placementDiff.surplus.join(', ')} -- the switch path moves a view the mode contract does not declare`);
        }
        if (placementDiff.missing.length) {
            failures.push(`${SERVICE_REL}: shipped view placement with no SHIPPED_MODE_RULES view: ${placementDiff.missing.join(', ')} -- stock applies viewPlacements on a mode's FIRST activation only, so this view would be missing on every later visit`);
        }
        for (const mode of modes) {
            const rule = rules.byId[mode.id];
            if (!rule) {
                failures.push(`${SERVICE_REL}: SHIPPED_MODE_RULES has no row for shipped mode '${mode.id}'`);
                continue;
            }
            const collapseDiff = diff(AREAS.filter(area => rule[area] === 'closed'), mode.collapseAreas);
            if (collapseDiff.surplus.length) {
                failures.push(`${SERVICE_REL}: SHIPPED_MODE_RULES closes [${collapseDiff.surplus.join(', ')}] for '${mode.id}' but its descriptor does not -- the mode would look different on its first activation than on every later one`);
            }
            if (collapseDiff.missing.length) {
                failures.push(`${DESCRIPTORS_REL}: descriptor '${mode.id}' collapses [${collapseDiff.missing.join(', ')}] on first activation but SHIPPED_MODE_RULES leaves it open afterwards -- the mode would not stay collapsed`);
            }
        }
    }
```

Replace the self-test case `planted ensureInArea removal (placement becomes first-visit-only)` with:

```js
        {
            // The D3 shape: the descriptor still places the view, but nothing
            // docks it on a later activation.
            name: 'planted rules view removal (placement becomes first-visit-only)',
            mutate: sources => ({ ...sources, [SERVICE_REL]: cleanService.replace(
                "views: { left: ['explorer-view-container'], right: [], bottom: [] }",
                "views: { left: [], right: [], bottom: [] }"
            ) }),
            expect: 'explorer-view-container',
        },
```

In the header comment, points 2 and 3 now name `SHIPPED_MODE_RULES` (its `views` and its `'closed'` rules) where they name `ensureInArea` and `visibilityFor`.

- [ ] **Step 6: Compile and quick gate**

Build `modes`; then `gui07-mode-toggle-commands`, `gui07-mode-toggle-commands-self-test`, `gui07-mode-switch-tabs-invariant`, `gui07-mode-switch-tabs-invariant-self-test`, `shell-error-copy-no-internals` PASS; C8 prints nothing.

- [ ] **Step 7: Live check (live-clone)** — after `yarn build` in `theia/`, `ng-035-custom-mode-saves-layout` PASS per C9. At merge, `gui07-mode-switch-tabs-live` still PASSES (the shipped modes do what they did). Reviewer's call-site deletion: put `target === 'coding'` back as the furniture rule, and both the data part and the `furniture: true` line fail.

- [ ] **Step 8: Commit**

```bash
git add theia/extensions/modes/src/browser/mode-service.ts scripts/verify-mode-toggle-commands.mjs
git commit -m "feat(ng-c): mode rules are data; a custom mode saves its views and furniture" -m "Refs: NG-035"
```

---

### Task 10: Theia's storage lives in the profile, and a quit waits for the frontend's flush (NG-033)

Row: NG-033 (the active mode, the per-mode layouts and the shell layout survive a relaunch whose backend port changed). The quit flush built here is also what NG-032 (Task 11) and NG-034 (Task 12) write through.

**Files:**

- Create: `theia/extensions/tab-uris/src/browser/profile-storage.ts` (Q3)
- Modify: `theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts`
- Modify: `powerbrowser/shell/PowerBrowserAPI.sys.mjs` (sender-check region: module constants; after `setGroupSenderPort`: `handleShellMessage`, `flushShellState`; quit helpers: `onQuitRequested`; `PowerBrowserGroupParent.receiveMessage`: one routing branch, R17)
- Modify: `powerbrowser/shell/TheiaService.sys.mjs` (two fields, `start`, new `_holdQuitForFlush`, `stop`)
- Modify: `powerbrowser/INTERNAL-APIS.md`

**Interfaces:**

- Consumes: `PowerBrowserAPI.quitApplication()` (Task 4); `groupSenderIsTheia` (Task 3); `WEB_TAB_STATE_EVENT` (web-tab.ts); stock `ShellLayoutRestorer.storeLayout(app)`; `WaitUntilEvent` (@theia/core).
- Produces:
  - Chrome: `SHELL_MESSAGE_KINDS` (`shellStateLoad` → `{ ok, kind, state: string }`, `shellStateSave { state: string }` → `{ ok, kind }`, `shellFlushed { flushId }` → `{ ok, kind }`); `PowerBrowserAPI.handleShellMessage(data, actorRef)`; `PowerBrowserAPI.flushShellState(theiaBrowser, timeoutMs): Promise<boolean>`; `PowerBrowserAPI.onQuitRequested(callback: () => boolean): () => void`; profile file `<profile>/powerbrowser-shell-state.json`.
  - TheiaService: `_holdQuitForFlush(): boolean`, pref `powerbrowser.shell.quitFlushTimeoutMs` (default 3000).
  - Theia: `ProfileStorageService implements StorageService` with `onWillFlush: Event<WaitUntilEvent>`, `fireWillFlush(): Promise<void>`, `save(): Promise<boolean>`, `acknowledgeFlush(flushId: string): Promise<void>`; `ShellStateFlushContribution`; `StorageService` rebound to `ProfileStorageService`.

- [ ] **Step 1: Confirm the check fails** — `ng-033-layout-survives-relaunch` (Task 1 Step 18).

- [ ] **Step 2: The profile store (Theia side)**

Create `theia/extensions/tab-uris/src/browser/profile-storage.ts`:

```ts
import { inject, injectable } from '@theia/core/shared/inversify';
import { Emitter, Event as TheiaEvent, WaitUntilEvent } from '@theia/core/lib/common';
import { FrontendApplication, FrontendApplicationContribution } from '@theia/core/lib/browser';
import { FrontendApplicationStateService } from '@theia/core/lib/browser/frontend-application-state';
import { ShellLayoutRestorer } from '@theia/core/lib/browser/shell/shell-layout-restorer';
import { LocalStorageService, StorageService } from '@theia/core/lib/browser/storage-service';
import { WEB_TAB_STATE_EVENT } from './web-tab';

/**
 * NG-033: Theia's StorageService, kept in the browser profile instead of the
 * frontend origin's localStorage.
 *
 * The sidecar's first spawn asks for port 0 (TheiaService.sys.mjs:602), so the
 * frontend origin -- and localStorage with it -- changes on nearly every
 * launch: the active mode, the per-mode layouts and the shell layout (stock
 * ShellLayoutRestorer's 'perspective-layouts') were lost on relaunch. This
 * service keeps one JSON map per profile, which chrome writes to
 * <profile>/powerbrowser-shell-state.json over the PowerBrowserGroup actor
 * (PowerBrowserAPI.handleShellMessage). The actor, not the backend: a
 * user-storage read awaited inside layout restore deadlocks against the RPC
 * connection (customize-css-contribution.ts header).
 *
 * With no shell chrome behind the page -- the dev app on localhost:3000, or a
 * sender the actor refuses -- the first request is not taken or is refused,
 * and the service uses LocalStorageService for the rest of the session, so the
 * page never waits on a channel that is not there.
 */
export const SHELL_STATE_REQUEST_EVENT = 'PowerBrowserGroupRequest';
export const SHELL_STATE_RESPONSE_EVENT = 'PowerBrowserGroupResponse';
export const SHELL_STATE_ACK_TIMEOUT_MS = 5000;
export const SHELL_STATE_SAVE_DELAY_MS = 500;
/** The push chrome sends to ask for a flush before a quit (PowerBrowserAPI.flushShellState). */
export const SHELL_FLUSH_KIND = 'flushShellState';

interface ShellStateReply {
    ok: boolean;
    state?: string;
    reason?: string;
    message?: string;
}

type ShellStateMessage =
    | { kind: 'shellStateLoad' }
    | { kind: 'shellStateSave'; state: string }
    | { kind: 'shellFlushed'; flushId: string };

const NO_CHROME = 'no-chrome';
type ShellStateOutcome = ShellStateReply | typeof NO_CHROME;

@injectable()
export class ProfileStorageService implements StorageService {

    @inject(LocalStorageService)
    protected readonly fallback: LocalStorageService;

    protected readonly onWillFlushEmitter = new Emitter<WaitUntilEvent>();
    /** Fired at the start of a quit flush; listeners add their last writes with waitUntil. */
    readonly onWillFlush: TheiaEvent<WaitUntilEvent> = this.onWillFlushEmitter.event;

    protected map: Promise<Record<string, unknown> | undefined> | undefined;
    protected saveTimer: number | undefined;
    protected seq = 0;

    async setData<T>(key: string, data?: T): Promise<void> {
        const map = await this.load();
        if (!map) {
            return this.fallback.setData(key, data);
        }
        if (data === undefined) {
            delete map[key];
        } else {
            map[key] = data;
        }
        this.scheduleSave();
    }

    async getData<T>(key: string, defaultValue: T): Promise<T>;
    async getData<T>(key: string): Promise<T | undefined>;
    async getData<T>(key: string, defaultValue?: T): Promise<T | undefined> {
        const map = await this.load();
        if (!map) {
            return this.fallback.getData(key, defaultValue);
        }
        return Object.prototype.hasOwnProperty.call(map, key) ? map[key] as T : defaultValue;
    }

    /** Runs the onWillFlush listeners (bounded), so their writes are in the map before save(). */
    async fireWillFlush(): Promise<void> {
        await WaitUntilEvent.fire(this.onWillFlushEmitter, {}, 3000);
    }

    /**
     * Sends the whole map to chrome now; true on chrome's ack. A setData made
     * just before this call is in the map: both await the same resolved load,
     * and microtasks run in order.
     */
    async save(): Promise<boolean> {
        if (this.saveTimer !== undefined) {
            window.clearTimeout(this.saveTimer);
            this.saveTimer = undefined;
        }
        const map = await this.load();
        if (!map) {
            return false;
        }
        const reply = await this.request({ kind: 'shellStateSave', state: JSON.stringify(map) });
        if (reply === NO_CHROME || !reply.ok) {
            console.error('[@powerbrowser/tab-uris] shell state save failed:', reply === NO_CHROME ? NO_CHROME : reply.message ?? reply.reason);
            return false;
        }
        return true;
    }

    /** Tells chrome the flush it asked for is done (PowerBrowserAPI.flushShellState waits on it). */
    async acknowledgeFlush(flushId: string): Promise<void> {
        await this.request({ kind: 'shellFlushed', flushId });
    }

    protected load(): Promise<Record<string, unknown> | undefined> {
        if (!this.map) {
            this.map = this.request({ kind: 'shellStateLoad' }).then(reply => {
                if (reply === NO_CHROME || !reply.ok) {
                    return undefined;
                }
                try {
                    const parsed: unknown = JSON.parse(typeof reply.state === 'string' && reply.state ? reply.state : '{}');
                    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
                } catch {
                    return {};
                }
            });
        }
        return this.map;
    }

    protected scheduleSave(): void {
        if (this.saveTimer !== undefined) {
            return;
        }
        this.saveTimer = window.setTimeout(() => {
            this.saveTimer = undefined;
            void this.save();
        }, SHELL_STATE_SAVE_DELAY_MS);
    }

    protected request(msg: ShellStateMessage): Promise<ShellStateOutcome> {
        return new Promise<ShellStateOutcome>(resolve => {
            const requestId = `shell-state-${msg.kind}-${Date.now().toString(36)}-${(this.seq += 1)}`;
            const settle = (reply: ShellStateOutcome): void => {
                window.removeEventListener(SHELL_STATE_RESPONSE_EVENT, onResponse);
                window.clearTimeout(timer);
                resolve(reply);
            };
            const onResponse = (event: Event): void => {
                const detail = (event as CustomEvent).detail as { requestId?: unknown; reply?: unknown } | undefined;
                if (!detail || detail.requestId !== requestId) {
                    return;
                }
                settle(detail.reply && typeof detail.reply === 'object'
                    ? detail.reply as ShellStateReply
                    : { ok: false, reason: 'validation', message: 'malformed reply' });
            };
            const timer = window.setTimeout(() => settle({ ok: false, reason: 'timeout' }), SHELL_STATE_ACK_TIMEOUT_MS);
            window.addEventListener(SHELL_STATE_RESPONSE_EVENT, onResponse);
            // cancelable, and the return value read: the actor child calls
            // preventDefault synchronously once chrome has the request
            // (GroupActorChild.handleEvent), the same signal
            // browser-window-command.ts decides its fallback on. Not prevented
            // means no shell chrome is behind this page.
            const taken = !document.dispatchEvent(new CustomEvent(SHELL_STATE_REQUEST_EVENT, {
                bubbles: true,
                cancelable: true,
                detail: { requestId, msg },
            }));
            if (!taken) {
                settle(NO_CHROME);
            }
        });
    }
}

/**
 * NG-032/NG-033: answers chrome's quit flush. Chrome holds the quit
 * (TheiaService._holdQuitForFlush) and pushes { kind: 'flushShellState',
 * flushId } on the web-tab state channel; this runs the onWillFlush listeners
 * (the session snapshot), stores the shell layout through the stock restorer,
 * saves the map, and acknowledges -- all while the backend still runs. A
 * flush that arrives before the frontend is ready stores nothing (a half-built
 * layout must not overwrite the saved one) and still acknowledges, so the
 * quit is never held for it.
 */
@injectable()
export class ShellStateFlushContribution implements FrontendApplicationContribution {

    @inject(ProfileStorageService)
    protected readonly storage: ProfileStorageService;

    @inject(ShellLayoutRestorer)
    protected readonly layoutRestorer: ShellLayoutRestorer;

    @inject(FrontendApplicationStateService)
    protected readonly stateService: FrontendApplicationStateService;

    onStart(app: FrontendApplication): void {
        window.addEventListener(WEB_TAB_STATE_EVENT, event => {
            const detail = (event as CustomEvent).detail as { kind?: unknown; flushId?: unknown } | undefined;
            if (!detail || detail.kind !== SHELL_FLUSH_KIND || typeof detail.flushId !== 'string') {
                return;
            }
            void this.flush(app, detail.flushId);
        });
    }

    protected async flush(app: FrontendApplication, flushId: string): Promise<void> {
        try {
            if (this.stateService.state === 'ready') {
                await this.storage.fireWillFlush();
                this.layoutRestorer.storeLayout(app);
                await this.storage.save();
            }
        } catch (error) {
            console.error('[@powerbrowser/tab-uris] shell state flush failed:', error);
        } finally {
            await this.storage.acknowledgeFlush(flushId);
        }
    }
}
```

In `tab-uris-frontend-module.ts`, add the imports:

```ts
import { StorageService } from '@theia/core/lib/browser/storage-service';
import { ProfileStorageService, ShellStateFlushContribution } from './profile-storage';
```

and, at the end of the module body (after the `ChatViewWidget` contribution):

```ts
    // NG-033: Theia's storage lives in the browser profile, not in the
    // per-launch frontend origin's localStorage (profile-storage.ts header).
    // A guarded rebind, the in-tree idiom (D-47): every consumer of
    // StorageService -- ShellLayoutRestorer's perspective layouts, ModeService
    // -- reaches the profile store.
    bind(ProfileStorageService).toSelf().inSingletonScope();
    if (isBound(StorageService)) {
        rebind(StorageService).toService(ProfileStorageService);
    } else {
        bind(StorageService).toService(ProfileStorageService);
    }
    bind(ShellStateFlushContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(ShellStateFlushContribution);
```

- [ ] **Step 3: The chrome half of the store and the flush**

In `PowerBrowserAPI.sys.mjs`, directly after `let groupSenderPort = null;` (Task 3), add:

```js
// NG-033: the chrome half of the frontend's profile store (profile-storage.ts):
// one JSON document per profile, written atomically by the one chrome-side
// writer. The frontend sends the whole map; the cap keeps a runaway frontend
// from filling the disk through this channel.
const SHELL_MESSAGE_KINDS = new Set(["shellStateLoad", "shellStateSave", "shellFlushed"]);
const SHELL_STATE_FILE_NAME = "powerbrowser-shell-state.json";
const SHELL_STATE_MAX_CHARS = 16 * 1024 * 1024;
// NG-032/NG-033: quit flushes chrome is waiting on, flushId -> resolve.
const pendingShellFlushes = new Map();
let shellFlushSeq = 0;
```

Directly after `setGroupSenderPort(port) { … },` (Task 3), add:

```js
  /**
   * NG-033: the parent-side dispatch for the frontend's profile store and the
   * quit-flush acknowledgement, routed here from PowerBrowserGroupParent by
   * kind. Same sender wall and reply shape as handleGroupMutation.
   */
  async handleShellMessage(data, actorRef) {
    if (!groupSenderIsTheia(actorRef)) {
      PowerBrowserAPI.log("error", "[handleShellMessage] rejecting non-Theia-origin sender");
      return { ok: false, reason: "validation", message: "handleShellMessage: rejecting non-Theia-origin sender" };
    }
    const kind = data && data.kind;
    const path = `${PowerBrowserAPI.getProfileDir()}/${SHELL_STATE_FILE_NAME}`;
    try {
      switch (kind) {
        case "shellStateLoad": {
          let state = "{}";
          try {
            state = await IOUtils.readUTF8(path);
          } catch {
            // Absent on a profile's first launch: the empty map.
          }
          return { ok: true, kind, state };
        }
        case "shellStateSave": {
          const state = data.state;
          if (typeof state !== "string" || state.length > SHELL_STATE_MAX_CHARS) {
            return { ok: false, reason: "validation", message: "handleShellMessage: refusing a shell state that is not a string within the size cap" };
          }
          let parsed;
          try {
            parsed = JSON.parse(state);
          } catch {
            parsed = null;
          }
          if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
            return { ok: false, reason: "validation", message: "handleShellMessage: refusing a shell state that is not a JSON object" };
          }
          await IOUtils.writeUTF8(path, state, { tmpPath: `${path}.tmp` });
          return { ok: true, kind };
        }
        case "shellFlushed": {
          const resolve = pendingShellFlushes.get(data.flushId);
          if (resolve) {
            resolve();
          }
          return { ok: true, kind };
        }
        default:
          return { ok: false, reason: "validation", message: `handleShellMessage: unknown kind ${String(kind)}` };
      }
    } catch (err) {
      return { ok: false, reason: "store", message: `handleShellMessage: ${kind} failed: ${err && err.message ? err.message : err}` };
    }
  },

  /**
   * NG-032/NG-033: asks the Theia frame to write its session and layout now,
   * over the push the web-tab state rides, and waits for its shellFlushed
   * acknowledgement or `timeoutMs`. True on the ack; false on a timeout or
   * when there is no frontend to ask. Never throws, so a quit is never held
   * past the timeout.
   */
  async flushShellState(theiaBrowser, timeoutMs) {
    const flushId = `flush-${Date.now().toString(36)}-${(shellFlushSeq += 1)}`;
    const acked = new Promise(resolve => pendingShellFlushes.set(flushId, resolve));
    try {
      theiaBrowser.browsingContext.currentWindowGlobal
        .getActor(GROUP_ACTOR_NAME)
        .sendAsyncMessage("PowerBrowserWebTabState", { kind: "flushShellState", flushId });
    } catch (err) {
      pendingShellFlushes.delete(flushId);
      PowerBrowserAPI.log("error", `[flushShellState] no frontend to flush: ${err && err.message ? err.message : err}`);
      return false;
    }
    const done = await Promise.race([acked.then(() => true), PowerBrowserAPI.sleep(timeoutMs).then(() => false)]);
    pendingShellFlushes.delete(flushId);
    return done;
  },
```

Directly after `quitApplication() { … },` (Task 4), add:

```js
  /**
   * NG-032/NG-033: registers `callback` for every quit request -- upstream's
   * quit paths (a stock window's Quit) and quitApplication above both announce
   * one. A callback returning true cancels that request; an earlier observer's
   * cancel is left as it is. Returns the unregister function.
   */
  onQuitRequested(callback) {
    const observer = {
      observe: subject => {
        const cancelQuit = subject.QueryInterface(Ci.nsISupportsPRBool);
        if (!cancelQuit.data && callback() === true) {
          cancelQuit.data = true;
        }
      },
    };
    Services.obs.addObserver(observer, "quit-application-requested");
    return () => Services.obs.removeObserver(observer, "quit-application-requested");
  },
```

In `PowerBrowserGroupParent.receiveMessage` (R17: wave B adds its own one-line hook to the same method; whichever merges second keeps both), after the `if (!message || message.name !== "PowerBrowserGroupMutation") { return undefined; }` guard, add:

```js
    // NG-033: the profile-store and quit-flush kinds have their own handler
    // (handleShellMessage); every other kind is a group or web-tab mutation.
    if (SHELL_MESSAGE_KINDS.has(message.data && message.data.kind)) {
      return PowerBrowserAPI.handleShellMessage(message.data, this);
    }
```

The actor child is unchanged: it already forwards every request kind and re-dispatches every `PowerBrowserWebTabState` push, so `gui02-web-tab-bridge`'s event and push sets do not change.

- [ ] **Step 4: TheiaService holds the first quit for the flush**

In `TheiaService.sys.mjs`, after the `_quitObserverOff: null,` field, add:

```js
  // NG-032/NG-033: the unregister function PowerBrowserAPI.onQuitRequested
  // returns, and whether this session's quit has already been held once for
  // the frontend's flush. Detached in stop() beside _quitObserverOff.
  _quitRequestOff: null,
  _quitFlushStarted: false,
```

In `start()`, directly after `this._quitObserverOff = PowerBrowserAPI.onQuitGranted(() => this.stop());`, add:

```js
    // NG-032/NG-033: hold the first quit request long enough for the frontend
    // to write its session and layout while the backend still runs.
    // Best-effort like the actor registration below, so it can never stall
    // startup.
    try {
      this._quitRequestOff = PowerBrowserAPI.onQuitRequested(() => this._holdQuitForFlush());
    } catch (err) {
      this._pushLog(`Quit flush not registered: ${err && err.message ? err.message : err}`);
    }
```

Add a method after `stop()`:

```js
  /**
   * NG-032/NG-033: the quit-request hook. The first request of a session with
   * a live frontend is cancelled, the frontend is asked to flush (bounded by
   * powerbrowser.shell.quitFlushTimeoutMs, default 3000), and the quit is then
   * re-issued; that second request passes. With nothing to flush (no swap yet)
   * or a flush already under way the request passes at once. If another
   * observer cancels the re-issued quit (a page's leave prompt), the next quit
   * request flushes again.
   */
  _holdQuitForFlush() {
    if (this._quitFlushStarted || !this._swapped || !this._browserElement) {
      return false;
    }
    this._quitFlushStarted = true;
    const timeoutMs = PowerBrowserAPI.getIntPref("powerbrowser.shell.quitFlushTimeoutMs", 3000);
    PowerBrowserAPI.flushShellState(this._browserElement, timeoutMs)
      .then(acked => this._pushLog(acked ? "Frontend flushed before quit." : "Frontend did not acknowledge the quit flush in time; quitting anyway."))
      .catch(err => this._pushLog(`Quit flush failed: ${err && err.message ? err.message : err}`))
      .finally(() => {
        if (!PowerBrowserAPI.quitApplication()) {
          this._quitFlushStarted = false;
        }
      });
    return true;
  },
```

In `stop()`, directly before the `if (this._quitObserverOff) {` block, add:

```js
    if (this._quitRequestOff) {
      this._quitRequestOff();
      this._quitRequestOff = null;
    }
```

`start-path-recovery` derives the ordering of `onQuitGranted` and `_stateFilePath`; the new registration sits after both. `shell-error-contract` drives `start()` with a fake boundary that throws on unknown methods; the `try` above turns that into a log line.

- [ ] **Step 5: Catalogue**

`node scripts/verify-ng-040-internals-catalogue-lines.mjs --fix`, then add a row for each line the guard now names (`<line>` is the number `bash scripts/check-internals-boundary.sh --catalogue` prints):

```markdown
| `IOUtils.readUTF8` | `PowerBrowserAPI.sys.mjs:<line>` | `handleShellMessage` | Reads the profile's shell-state file for the frontend's StorageService (NG-033). | Only `<profile>/powerbrowser-shell-state.json`; the sender wall admits only the shell's own Theia frame (NG-038). |
| `IOUtils.writeUTF8` | `PowerBrowserAPI.sys.mjs:<line>` | `handleShellMessage` | Writes the frontend's storage map atomically (tmpPath rename) (NG-033). | Only that file; a JSON object of at most 16 MiB characters, else refused. |
| `Ci.nsISupportsPRBool` | `PowerBrowserAPI.sys.mjs:<line>` | `onQuitRequested` | Reads and sets the quit-request cancel flag so the first quit can wait for the frontend's flush (NG-032/NG-033). | Cancels only once per session; the flush is bounded by a timeout. |
| `Services.obs.addObserver` | `PowerBrowserAPI.sys.mjs:<line>` | `onQuitRequested` | Observes quit-application-requested. | Removed by the returned function in TheiaService.stop. |
| `Services.obs.removeObserver` | `PowerBrowserAPI.sys.mjs:<line>` | `onQuitRequested` | The unregister half. | None. |
```

`ng-040-internals-catalogue-lines` exits 0.

- [ ] **Step 6: Compile and quick gate**

```bash
nix develop .#theia --command bash -c 'cd theia/extensions/tab-uris && yarn build && cd ../modes && yarn build'
```

Then `gui02-web-tab-bridge`, `start-path-recovery`, `shell-error-contract`, `shell-error-copy-no-internals`, `theia-build-order`, `internals-boundary`, `ng-040-internals-catalogue-lines` PASS; C8 prints nothing.

- [ ] **Step 7: Review Focus — a frontend with no shell chrome**

After `yarn build` in `theia/`, run `flock $HOME/coding/Power-Browser/.git/pb-live.lock scripts/verify-platform.sh --only gui01-command-registered` in the clone. It loads the dev app on `http://localhost:3000` in the built browser, where no actor child exists: `ProfileStorageService` must fall back at once, and the check must PASS in no more time than the same row takes on main (compare the two durations).

- [ ] **Step 8: Live check**

`live-main pending: ng-033-layout-survives-relaunch`; at merge also `ng-037-core-close-quits` (the quit now passes through the hold). Reviewer's call-site deletion: remove the `rebind(StorageService)` line and the saved-layout and left-panel lines fail; remove the `onQuitRequested` registration in `start()` and the relaunch loses the layout again (nothing flushes before the backend stops).

- [ ] **Step 9: Commit**

```bash
git add theia/extensions/tab-uris/src/browser/profile-storage.ts theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts \
  powerbrowser/shell/PowerBrowserAPI.sys.mjs powerbrowser/shell/TheiaService.sys.mjs powerbrowser/INTERNAL-APIS.md
node scripts/scan-brand-residue.mjs
git commit -m "feat(ng-c): Theia storage lives in the profile; quit waits for the frontend's flush" -m "Refs: NG-033"
```

---

### Task 11: Quitting saves the session; the next launch restores it with no saved setup (NG-032)

Row: NG-032 (with NG-029's launch path: the restored mode goes through ModeService).

**Files:**

- Modify: `theia/extensions/modes/src/browser/setups-service.ts`

**Interfaces:**

- Consumes: `ProfileStorageService.onWillFlush`, `getData`, `setData` (Task 10); `snapshotWindows()` with per-window mode and dock (Task 8); `placeTabs` (Tasks 6, 8); `ModeService.activateMode` (Task 5).
- Produces: `SESSION_STORAGE_KEY = 'powerbrowser.setups.session'`; `SessionSnapshot { modeId: string; windows: SetupWindowSnapshot[]; savedAt: number /* ms epoch */ }`; `parseSessionSnapshot(entry: unknown): SessionSnapshot | undefined`; `SetupsService.saveSession(): Promise<void>`; `SetupsService.applySnapshot(row: { modeId: string; windows: SetupWindowSnapshot[] }, notify: boolean): Promise<void>`; the launch-restore entry point `SetupsService.applyLastSession()`, which restores the saved session first (Task 12 adds the web tabs; wave A's Task 10 then gates them).

- [ ] **Step 1: Confirm the check fails** — `ng-032-quit-restores-session` (Task 1 Step 18).

- [ ] **Step 2: The session snapshot**

Add the import:

```ts
import { ProfileStorageService } from '@powerbrowser/tab-uris/lib/browser/profile-storage';
```

Add after `SETUPS_STORE_FILENAME`:

```ts
/**
 * NG-032: the key of the unnamed session a quit saves and the next launch
 * restores. It lives in the profile store (profile-storage.ts), not in
 * setups.json: setups are app-wide user data, a session belongs to one profile.
 */
export const SESSION_STORAGE_KEY = 'powerbrowser.setups.session';

/** NG-032: the session saved at quit -- the windows as a setup records them, plus when it was saved. */
export interface SessionSnapshot {
    modeId: string;
    windows: SetupWindowSnapshot[];
    /** Milliseconds since the epoch. */
    savedAt: number;
}
```

Add after `parseSetupStore`:

```ts
/** NG-032: total parse of the saved session; anything unreadable is no session. */
function parseSessionSnapshot(entry: unknown): SessionSnapshot | undefined {
    if (typeof entry !== 'object' || entry === null) {
        return undefined;
    }
    const row = entry as Record<string, unknown>;
    if (typeof row['modeId'] !== 'string' || !Array.isArray(row['windows'])) {
        return undefined;
    }
    const windows = (row['windows'] as unknown[])
        .map(parseSetupWindow)
        .filter((win): win is SetupWindowSnapshot => win !== null);
    if (windows.length === 0) {
        return undefined;
    }
    return { modeId: row['modeId'] as string, windows, savedAt: isFiniteNumber(row['savedAt']) ? row['savedAt'] : 0 };
}
```

Inject the store:

```ts
    @inject(ProfileStorageService)
    protected readonly profileStorage: ProfileStorageService;
```

In `onStart()`, after the `secondaryWindows.onDidRemoveWidget` subscription, add:

```ts
        // NG-032: the quit flush (profile-storage.ts) collects every listener's
        // last writes while the backend still runs: the session snapshot, and
        // the last-session pointer, which onStop could never write (the
        // backend is stopped before the page unloads).
        this.profileStorage.onWillFlush(event => event.waitUntil(this.saveSession()));
```

Add after `onStop()`:

```ts
    /** NG-032: the unnamed session snapshot and the last-session pointer, written inside the quit flush. */
    protected async saveSession(): Promise<void> {
        const session: SessionSnapshot = { modeId: this.currentModeId(), windows: this.snapshotWindows(), savedAt: Date.now() };
        await this.profileStorage.setData(SESSION_STORAGE_KEY, session);
        await this.persistLastSession(this.currentSetup);
    }
```

- [ ] **Step 3: One apply path for setups and the session**

Replace `restoreSetup` with:

```ts
    async restoreSetup(name?: string): Promise<void> {
        const target = name ?? await this.pickSetup('Restore Setup');
        if (target === undefined) {
            return;
        }
        const row = this.lastGoodSetups.find(setup => setup.name === target);
        // Validate before touching the session: a row that cannot restore
        // leaves current windows and tabs untouched.
        if (!row || row.windows.length === 0) {
            void this.flash(SETUP_RESTORE_FAILURE);
            return;
        }
        await this.applySnapshot(row, true);
        this.currentSetup = row.name;
        void this.persistLastSession(row.name);
    }

    /**
     * Geometry verbatim with reachability clamping, tabs through the placer
     * (NG-030, NG-036), then the mode through ModeService (NG-029). `notify`
     * shows the contracted gone-tabs and mode-fallback notices; the launch
     * restore of the unnamed session (NG-032) passes false -- no setup was
     * chosen, and "this setup" would name nothing.
     */
    protected async applySnapshot(row: { modeId: string; windows: SetupWindowSnapshot[] }, notify: boolean): Promise<void> {
        this.applyGeometry(row.windows[0]);
        const dropped = await this.placeTabs(row);
        const modeId = row.windows[0].modeId ?? row.modeId;
        // NG-029: the mode goes through ModeService.activateMode (see Task 5).
        const knownCustom = this.modes.getCustomModes().some(custom => custom.id === modeId);
        const known = SHIPPED_MODES.some(descriptor => descriptor.id === modeId) || knownCustom;
        try {
            await this.modes.activateMode(known ? modeId : 'browsing');
        } catch {
            // activateMode has no rejecting path today; geometry and tabs still stand.
        }
        if (!notify) {
            return;
        }
        // Both notices share one status-bar element, so two sequential
        // flashes would overwrite each other: when both fire, combine them
        // into a single flash built only from the two contracted literals
        // (no new user-facing copy).
        if (dropped > 0 && !known) {
            void this.flash(`${SETUP_GONE_TABS_NOTICE} ${SETUP_MODE_FALLBACK_NOTICE}`);
        } else if (dropped > 0) {
            void this.flash(SETUP_GONE_TABS_NOTICE);
        } else if (!known) {
            void this.flash(SETUP_MODE_FALLBACK_NOTICE);
        }
    }
```

Keep Task 5's full NG-029 comment above the `activateMode` call.

- [ ] **Step 4: The launch restores the session first**

Replace `applyLastSession` with:

```ts
    /**
     * The launch-restore entry point (ready-ordered: runs after core layout
     * restore). NG-032: the session the last quit saved comes back first,
     * with no saved setup needed; the last-session pointer then only marks
     * which named setup is current. A profile with no saved session (its first
     * launch, or a build before this one) keeps the pointer's auto-restore.
     */
    protected async applyLastSession(): Promise<void> {
        let parsed: ParsedSetupStore = { ok: false, setups: [], lastSession: null };
        try {
            parsed = parseSetupStore((await this.fileService.read(this.setupsUri)).value);
        } catch {
            // No setups.json: nothing named to restore or mark.
        }
        if (parsed.ok) {
            this.lastGoodSetups = parsed.setups;
        }
        const pointer = parsed.ok && parsed.lastSession && parsed.setups.some(setup => setup.name === parsed.lastSession)
            ? parsed.lastSession
            : null;
        const saved = parseSessionSnapshot(await this.profileStorage.getData<unknown>(SESSION_STORAGE_KEY));
        if (saved) {
            this.currentSetup = pointer;
            await this.applySnapshot(saved, false);
            return;
        }
        if (pointer) {
            await this.restoreSetup(pointer);
        }
    }
```

In the file header, the sentence "Core-close carries no confirmation: the last-session pointer auto-saves on shutdown and the ready-ordered applicator re-applies it after core layout restore." becomes "Core-close carries no confirmation: the quit flush saves the session and the last-session pointer (NG-032), and the ready-ordered applicator restores that session -- or, with none saved, the pointer's setup -- after core layout restore."

- [ ] **Step 5: Compile and quick gate** — build `tab-uris` then `modes`; `gui09-setup-roundtrip` (its interfaces are unchanged: `SessionSnapshot` is a new interface it does not read), `gui09-setups-copy` (no new literal at a paint site), `gui09-dependent-window-content`, `gui07-mode-switch-tabs-invariant`, `theia-build-order` PASS; C8 prints nothing.

- [ ] **Step 6: Live check** — `live-main pending: ng-032-quit-restores-session` (it needs Task 10's chrome flush). The clone run of `ng-029`, `ng-030`, `ng-036` still PASSES. Reviewer's call-site deletion: remove the `onWillFlush` subscription in `onStart` and the relaunch shows no web tab and the Browsing mode.

- [ ] **Step 7: Commit**

```bash
git add theia/extensions/modes/src/browser/setups-service.ts
git commit -m "feat(ng-c): quitting saves the session and the next launch restores it" -m "Refs: NG-032, NG-029"
```

---

### Task 12 (Needs: wave-a): In-shell web tabs come back on their rows with their back/forward history (NG-034)

Row: NG-034.

**Order:** last. Start after wave A's Task 2 (NG-001 … NG-005: the key rule and schema v5) has merged into `main`; then `git -C ~/coding/Power-Browser-ng-c pull --no-rebase ~/coding/Power-Browser main`, rebuild Theia in the clone, and run `node scripts/verify-ng-040-internals-catalogue-lines.mjs --fix` (wave A's edits shifted the rows).

**Files:**

- Modify: `theia/extensions/modes/src/browser/setups-service.ts` (session web tabs, `restoreWebTab`, access times, `groupReader`, `applyLastSession`, the `openWebTabs` parameter of `tabPlacer`/`placeTabs`/`applySnapshot`)
- Modify: `theia/extensions/tab-uris/src/browser/profile-storage.ts` (`armWebTabHistory`)
- Modify: `powerbrowser/shell/PowerBrowserAPI.sys.mjs` (sender-check region: constants; `handleShellMessage`: one case; quit helpers: four methods; **`webTabOpen`: the history branch -- wave A's region, the reason for `Needs: wave-a`**)
- Modify: `powerbrowser/shell/TheiaService.sys.mjs` (`start`, `_holdQuitForFlush`)
- Modify: `powerbrowser/INTERNAL-APIS.md`

**Interfaces:**

- Consumes, from wave A's Task 2 Produces block (wave A's plan, blocks "THEIA", "CHROME", "ACTOR KINDS", "LIFECYCLE", "FOR WAVES B AND C"):
  - `web-tab.ts`: `WebTabOptions { id: string; url: string; key?: string }`; `WebTabWidget.rowKey: string` (the tab's `tabs.sqlite` row key); the message `WebTabMessage webTabOpen = { kind: 'webTabOpen'; tabId: string; url: string; key: string }`.
  - chrome: `webTabOpen(theiaBrowser, actorRef, tabId, url, key?): string`; the row key is `key` when given, else `'web:' + tabId`; chrome accepts only `^web:[A-Za-z0-9_-]{1,64}$`.
  - LIFECYCLE: every upsert (`writeTabRow`) sets `closed_at = NULL`; at startup a `web:` row with no group and no position is closed (`closeEndedWebRows`). Reopening on the saved key therefore re-opens that row, with its group, place and thumbnail.
  - "a web tab restored across a restart must keep its WebTabOptions.id, or pass the saved row key as WebTabOptions.key, so it writes the same row; a saved session records per web tab its rowKey, url and last_accessed, plus the save time, for planWebTabRestore (Task 7)". This task passes the saved row key as `WebTabOptions.key` (decisions.md R5).
  - Not consumed: wave A's Task 4 (`WebTabOpenerOptions.rowKey`, `openUrl(url, rowKey?)`) may merge after this task, so the restore constructs the widget through `WidgetManager` with `WebTabOptions.key` -- the construction `openUrl` performs.
- Produces, for wave A's Task 10 (NG-011; decisions.md R5; questions-wave-a.md Q4 asks for exactly these names):
  - the launch-restore entry point: `SetupsService.applyLastSession(): Promise<void>`, whose saved session is the local `saved: SessionSnapshot`;
  - the per-tab restore: `SetupsService.restoreWebTab(tab: { rowKey: string; url: string; withHistory: boolean }): Promise<Widget | undefined>`, which opens on the saved row and restores history only when `withHistory` is true;
  - `SessionSnapshot.webTabs: SavedSessionWebTab[]`, with `SavedSessionWebTab { rowKey: string; url: string; lastAccessed: number | null }` (the tab's last-accessed time, ms epoch), and `SessionSnapshot.savedAt: number` (the save time, ms epoch; Task 11);
  - `SetupsService.groupReader: GroupQueryService` (injected, for Task 10's `getSettings()`);
  - the loop Task 10 replaces with `planWebTabRestore(settings, saved.webTabs.map(…), saved.savedAt)`: `for (const tab of saved.webTabs) { await this.restoreWebTab({ rowKey: tab.rowKey, url: tab.url, withHistory: true }); }`.
  - chrome: `PowerBrowserAPI.loadWebTabHistories(): Promise<void>`, `saveWebTabHistories(): Promise<number>`, `takeWebTabHistory(rowKey): object | null` (only for an armed key), `restoreWebTabHistory(browser, tabData): Promise<void>`; shell kind `shellArmWebTabHistory { key }`; profile file `<profile>/powerbrowser-web-tab-history.json`.

If wave A's merged names differ from the ones above, use wave A's and say so in the task report.

Web tabs come back through the session restore only: the layout restorer's copy of a web tab stays refused (`tab-uris-frontend-module.ts:107` is unchanged), so a tab is never restored twice, and wave A's plan decides per tab whether it comes back and with history.

- [ ] **Step 1: Confirm the check fails**

In the clone, `ng-034-web-tab-history-survives-restart` (main's chrome) fails with `after the restart the web tab on B cannot go Back` (Task 11 already brings the tab back on B by its URL, without history).

- [ ] **Step 2: Chrome keeps each web tab's history by row key**

In `PowerBrowserAPI.sys.mjs`, after `let shellFlushSeq = 0;` (Task 10), add:

```js
// NG-034: saved back/forward history of in-shell web tabs, by tabs.sqlite row
// key. Read once at startup; a key's history is restored only after the
// frontend arms it (shellArmWebTabHistory), and only once.
const WEB_TAB_HISTORY_FILE_NAME = "powerbrowser-web-tab-history.json";
const WEB_TAB_ROW_KEY_RE = /^web:[A-Za-z0-9_-]{1,64}$/;
let savedWebTabHistories = {};
const armedWebTabHistories = new Set();
```

Add `"shellArmWebTabHistory"` to `SHELL_MESSAGE_KINDS`, and to `handleShellMessage`'s switch, before `default:`:

```js
        case "shellArmWebTabHistory": {
          if (typeof data.key !== "string" || !WEB_TAB_ROW_KEY_RE.test(data.key)) {
            return { ok: false, reason: "validation", message: "handleShellMessage: refusing a malformed web-tab row key" };
          }
          armedWebTabHistories.add(data.key);
          return { ok: true, kind };
        }
```

After `onQuitRequested(callback) { … },` (Task 10), add:

```js
  /** NG-034: reads last session's web-tab histories once, before any web tab can reopen. Never throws. */
  async loadWebTabHistories() {
    try {
      const value = await IOUtils.readJSON(`${PowerBrowserAPI.getProfileDir()}/${WEB_TAB_HISTORY_FILE_NAME}`);
      savedWebTabHistories = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch {
      savedWebTabHistories = {};
    }
  },

  /**
   * NG-034: writes the back/forward history of every open in-shell web tab,
   * by row key, for the next launch. Runs inside the quit flush. Returns the
   * number of tabs saved; never throws.
   */
  async saveWebTabHistories() {
    const histories = {};
    const path = `${PowerBrowserAPI.getProfileDir()}/${WEB_TAB_HISTORY_FILE_NAME}`;
    try {
      const { SessionHistory } = ChromeUtils.importESModule("resource://gre/modules/sessionstore/SessionHistory.sys.mjs");
      for (const entry of webTabs.values()) {
        const sessionHistory = entry.browser.browsingContext?.sessionHistory;
        if (!entry.rowKey || !sessionHistory || sessionHistory.count === 0) {
          continue;
        }
        histories[entry.rowKey] = SessionHistory.collectFromParent(entry.browser.currentURI?.spec ?? "about:blank", true, sessionHistory);
      }
      await IOUtils.writeJSON(path, histories, { tmpPath: `${path}.tmp` });
    } catch (err) {
      PowerBrowserAPI.log("error", `[saveWebTabHistories] ${err && err.message ? err.message : err}`);
      return 0;
    }
    return Object.keys(histories).length;
  },

  /**
   * NG-034: the saved history for `rowKey` when the frontend armed it, once.
   * Only http(s) entries are admitted -- the scheme wall webTabOpen and
   * webTabNavigate apply -- so a tampered file cannot load file: or chrome:.
   */
  takeWebTabHistory(rowKey) {
    if (!armedWebTabHistories.delete(rowKey) || !Object.prototype.hasOwnProperty.call(savedWebTabHistories, rowKey)) {
      return null;
    }
    const data = savedWebTabHistories[rowKey];
    delete savedWebTabHistories[rowKey];
    const entries = data && Array.isArray(data.entries) ? data.entries : [];
    if (entries.length === 0 || !Number.isInteger(data.index) || data.index < 1 || data.index > entries.length) {
      return null;
    }
    if (!entries.every(item => item && typeof item.url === "string" && /^https?:\/\//i.test(item.url))) {
      return null;
    }
    return data;
  },

  /**
   * NG-034: loads `browser` from saved history the way SessionStore restores
   * a tab in the parent process (SessionStore.sys.mjs _restoreHistory and
   * _restoreTabEntry): history first, then the docshell state, then a restore
   * that reloads the current entry.
   */
  async restoreWebTabHistory(browser, tabData) {
    const { SessionHistory } = ChromeUtils.importESModule("resource://gre/modules/sessionstore/SessionHistory.sys.mjs");
    const browsingContext = browser.browsingContext;
    SessionHistory.restoreFromParent(browsingContext.sessionHistory, tabData);
    await SessionStoreUtils.restoreDocShellState(browsingContext, tabData.entries[tabData.index - 1].url, null);
    SessionStoreUtils.initializeRestore(browsingContext, SessionStoreUtils.constructSessionStoreRestoreData()).catch(err => {
      PowerBrowserAPI.log("error", `[restoreWebTabHistory] ${err && err.message ? err.message : err}`);
    });
  },
```

(`initializeRestore` needs a non-null restore-data object -- `SessionStoreUtils.cpp:1539` asserts it; an empty one restores no form or scroll data.)

In `webTabOpen` (wave A's region, as merged), where it has the row key it writes the tab's row under (`key` when given, else `'web:' + tabId`), keep that value on the overlay's map entry as `entry.rowKey` (if wave A's entry already holds the key under another name, use that name here and in `saveWebTabHistories`). Then replace

```js
    const where = PowerBrowserAPI.webTabNavigate(tabId, spec);
```

with:

```js
    // NG-034: a tab the frontend reopened from last session's snapshot, with
    // its history armed, gets its back/forward history back; any other tab
    // loads its URL through the null-principal navigate below.
    const history = PowerBrowserAPI.takeWebTabHistory(entry.rowKey);
    if (history) {
      PowerBrowserAPI.restoreWebTabHistory(browser, history).catch(err => {
        PowerBrowserAPI.log("error", `[web-tab] history restore failed for ${entry.rowKey}: ${err && err.message ? err.message : err}`);
        PowerBrowserAPI.webTabNavigate(tabId, spec);
      });
      return "opened";
    }
    const where = PowerBrowserAPI.webTabNavigate(tabId, spec);
```

- [ ] **Step 3: TheiaService reads the histories at start and saves them in the flush**

In `start()`, directly before the `// GUI-08 (15-01): register the PowerBrowserGroup actor pair` comment, add:

```js
    // NG-034: last session's web-tab histories, read before the frontend can
    // reopen a web tab. Best-effort like the store above.
    try {
      await PowerBrowserAPI.loadWebTabHistories();
    } catch (err) {
      this._pushLog(`Web tab history not loaded: ${err && err.message ? err.message : err}`);
    }
```

In `_holdQuitForFlush`, the `.then(acked => this._pushLog(…))` step becomes:

```js
      .then(async acked => {
        this._pushLog(acked ? "Frontend flushed before quit." : "Frontend did not acknowledge the quit flush in time; quitting anyway.");
        this._pushLog(`Saved back/forward history for ${await PowerBrowserAPI.saveWebTabHistories()} web tab(s).`);
      })
```

- [ ] **Step 4: The frontend arms history and reopens on the saved row**

In `profile-storage.ts`, add `| { kind: 'shellArmWebTabHistory'; key: string }` to `ShellStateMessage`, and to `ProfileStorageService`:

```ts
    /** NG-034: asks chrome to restore `rowKey`'s saved back/forward history on that tab's next open. */
    async armWebTabHistory(rowKey: string): Promise<boolean> {
        const reply = await this.request({ kind: 'shellArmWebTabHistory', key: rowKey });
        return reply !== NO_CHROME && reply.ok;
    }
```

In `setups-service.ts`, add `WidgetManager` to the `@theia/core/lib/browser` import, and:

```ts
import type { Title } from '@theia/core/shared/@lumino/widgets';
import { GroupQueryService } from '@powerbrowser/tab-uris/lib/browser/group-query-service';
import { WEB_TAB_FACTORY_ID, WEB_TAB_OPEN_HANDLER_ID, WEB_TAB_SESSION, WebTabOptions, WebTabWidget } from '@powerbrowser/tab-uris/lib/browser/web-tab';
```

Add after `SessionSnapshot`:

```ts
/** NG-034: one web tab of the saved session, as wave A's restore plan reads it (planWebTabRestore). */
export interface SavedSessionWebTab {
    rowKey: string;
    url: string;
    /** Milliseconds since the epoch the tab was last the current tab; null when never recorded. */
    lastAccessed: number | null;
}
```

Add a field to `SessionSnapshot`: `/** NG-034: the web tabs to reopen on their own rows; empty in a snapshot saved before this field. */ webTabs: SavedSessionWebTab[];`. In `parseSessionSnapshot`, before its `return`, add:

```ts
    const webTabs: SavedSessionWebTab[] = (Array.isArray(row['webTabs']) ? row['webTabs'] as unknown[] : []).flatMap(item => {
        const tab = typeof item === 'object' && item !== null ? item as Record<string, unknown> : {};
        return typeof tab['rowKey'] === 'string' && /^web:[A-Za-z0-9_-]{1,64}$/.test(tab['rowKey']) && typeof tab['url'] === 'string'
            ? [{ rowKey: tab['rowKey'], url: tab['url'], lastAccessed: isFiniteNumber(tab['lastAccessed']) ? tab['lastAccessed'] : null }]
            : [];
    });
```

and return `{ modeId: …, windows, savedAt: …, webTabs }`.

Inject and track:

```ts
    @inject(WidgetManager)
    protected readonly widgets: WidgetManager;

    /** NG-034: read by wave A's restore plan (GroupQueryService.getSettings, wave A Task 10). */
    @inject(GroupQueryService)
    protected readonly groupReader: GroupQueryService;

    /** NG-034: when each web tab (by row key) was last the current main-area tab. */
    protected webTabAccess = new Map<string, number>();
    protected restoreSeq = 0;
```

In `onStart()`, after the `onWillFlush` subscription:

```ts
        // NG-034: the last-accessed time wave A's restore plan ages tabs by.
        this.shell.mainPanel.onDidChangeCurrent((title: Title<Widget> | undefined) => {
            if (title?.owner instanceof WebTabWidget) {
                this.webTabAccess.set(title.owner.rowKey, Date.now());
            }
        });
```

`saveSession()` records the web tabs:

```ts
    protected async saveSession(): Promise<void> {
        const now = Date.now();
        const current = this.shell.mainPanel.currentTitle?.owner;
        const webTabs: SavedSessionWebTab[] = this.shell.getWidgets('main')
            .filter((widget): widget is WebTabWidget => widget instanceof WebTabWidget)
            .map(tab => ({ rowKey: tab.rowKey, url: tab.url, lastAccessed: tab === current ? now : this.webTabAccess.get(tab.rowKey) ?? null }));
        const session: SessionSnapshot = { modeId: this.currentModeId(), windows: this.snapshotWindows(), savedAt: now, webTabs };
        await this.profileStorage.setData(SESSION_STORAGE_KEY, session);
        await this.persistLastSession(this.currentSetup);
    }
```

Add the per-tab restore:

```ts
    /**
     * NG-034: reopens one of last session's web tabs on its own tabs.sqlite row
     * (wave A: WebTabOptions.key), so the row keeps its group, place and
     * thumbnail. With `withHistory`, chrome first arms the tab's saved
     * back/forward history, which webTabOpen restores instead of loading
     * `url`. Wave A's Task 10 decides withHistory per tab (planWebTabRestore);
     * this call shape is fixed for it.
     */
    async restoreWebTab(tab: { rowKey: string; url: string; withHistory: boolean }): Promise<Widget | undefined> {
        if (tab.withHistory) {
            await this.profileStorage.armWebTabHistory(tab.rowKey);
        }
        // This session's discriminator in the id, so the web-tab factory admits it.
        const options: WebTabOptions = { id: `wt-${WEB_TAB_SESSION}-restored-${(this.restoreSeq += 1)}`, url: tab.url, key: tab.rowKey };
        try {
            const widget = await this.widgets.getOrCreateWidget<WebTabWidget>(WEB_TAB_FACTORY_ID, options);
            if (!widget.isAttached) {
                await this.shell.addWidget(widget, { area: 'main' });
            }
            return widget;
        } catch {
            return undefined;
        }
    }
```

- [ ] **Step 5: The session restore reopens web tabs only through `restoreWebTab`**

`tabPlacer` takes `openWebTabs = true`; when false, a URI the web-tab handler would open is placed only if it is already open:

```ts
    protected tabPlacer(openWebTabs = true): (tab: string) => Promise<Widget | true | null> {
        const placed = new Map<string, Widget>();
        for (const entry of this.tabsOfShell()) {
            if (!placed.has(entry.uri)) {
                placed.set(entry.uri, entry.widget);
            }
        }
        return async tab => {
            const existing = placed.get(tab);
            if (existing) {
                return existing;
            }
            // NG-034: in the session restore, web tabs come back only through
            // restoreWebTab (on their rows, per wave A's plan); a web page the
            // plan left closed must not come back through the opener instead.
            if (!openWebTabs && await this.isWebTabUri(tab)) {
                return null;
            }
            const opened = await this.openTabUri(tab);
            if (opened instanceof Widget) {
                placed.set(tab, opened);
            }
            return opened;
        };
    }

    protected async isWebTabUri(tab: string): Promise<boolean> {
        try {
            return (await this.opener.getOpener(new URI(tab))).id === WEB_TAB_OPEN_HANDLER_ID;
        } catch {
            return false;
        }
    }
```

`placeTabs(row, openWebTabs = true)` passes it to `this.tabPlacer(openWebTabs)`, and `applySnapshot(row, notify, openWebTabs = true)` passes it to `this.placeTabs(row, openWebTabs)`.

In `applyLastSession`, the `if (saved) { … }` block becomes:

```ts
        if (saved) {
            this.currentSetup = pointer;
            for (const tab of saved.webTabs) {
                if (tab.lastAccessed !== null) {
                    this.webTabAccess.set(tab.rowKey, tab.lastAccessed);
                }
            }
            // NG-034: web tabs first, on their rows. Wave A's Task 10 replaces
            // this loop with its restore plan (restore_behaviour, age tiers).
            for (const tab of saved.webTabs) {
                await this.restoreWebTab({ rowKey: tab.rowKey, url: tab.url, withHistory: true });
            }
            await this.applySnapshot(saved, false, false);
            return;
        }
```

- [ ] **Step 6: Catalogue**

`node scripts/verify-ng-040-internals-catalogue-lines.mjs --fix`, then add a row for each line the guard names:

```markdown
| `ChromeUtils.importESModule` (`resource://gre/modules/sessionstore/SessionHistory.sys.mjs`) | `PowerBrowserAPI.sys.mjs:<line>` | `saveWebTabHistories` | Collects each in-shell web tab's back/forward history at quit (NG-034). | Reads the shell's own overlays; writes only to the profile. |
| `IOUtils.writeJSON` | `PowerBrowserAPI.sys.mjs:<line>` | `saveWebTabHistories` | Writes `<profile>/powerbrowser-web-tab-history.json` atomically. | Profile-local; keyed by `web:` row keys. |
| `IOUtils.readJSON` | `PowerBrowserAPI.sys.mjs:<line>` | `loadWebTabHistories` | Reads it once at startup. | A malformed file is an empty map. |
| `ChromeUtils.importESModule` (`resource://gre/modules/sessionstore/SessionHistory.sys.mjs`) | `PowerBrowserAPI.sys.mjs:<line>` | `restoreWebTabHistory` | Restores a saved history into a reopened overlay (NG-034). | Only entries whose URLs are http(s) (takeWebTabHistory), and only for a key the Theia frame armed through the sender wall. |
| `SessionStoreUtils.restoreDocShellState` | `PowerBrowserAPI.sys.mjs:<line>` | `restoreWebTabHistory` | The docshell half of a parent-process restore, as SessionStore._restoreHistory does it. | Same as the row above. |
| `SessionStoreUtils.initializeRestore` / `SessionStoreUtils.constructSessionStoreRestoreData` | `PowerBrowserAPI.sys.mjs:<line>` | `restoreWebTabHistory` | Reloads the restored current entry, as SessionStore._restoreTabEntry does it. | An empty restore-data object: no form or scroll data. |
```

`ng-040-internals-catalogue-lines` and `ng-039-internals-detects-waivers` exit 0.

- [ ] **Step 7: Compile and quick gate** — build `tab-uris` then `modes`; `gui02-web-tab-bridge` (no new DOM event or push name), `start-path-recovery`, `shell-error-contract`, the `gui09-*` rows, `theia-build-order` PASS; C8 prints nothing.

- [ ] **Step 8: Live check** — `live-main pending: ng-034-web-tab-history-survives-restart`; at merge also re-run `ng-032-quit-restores-session` (the web tab now returns through `restoreWebTab`) and `gui02-web-tab-live` (a foreign-session web-tab id is still refused by the factory). After wave A's Task 10 lands on top, ng-034 still passes under the default `restore_behaviour=session` and `restore_live_minutes=5`, because the check relaunches within seconds. Reviewer's call-site deletion: remove the `takeWebTabHistory` branch in `webTabOpen` and `cannot go Back` returns; remove the `restoreWebTab` loop and no web tab returns.

- [ ] **Step 9: Commit**

```bash
git add theia/extensions/modes/src/browser/setups-service.ts theia/extensions/tab-uris/src/browser/profile-storage.ts \
  powerbrowser/shell/PowerBrowserAPI.sys.mjs powerbrowser/shell/TheiaService.sys.mjs powerbrowser/INTERNAL-APIS.md
git commit -m "feat(ng-c): in-shell web tabs come back on their rows with their history" -m "Refs: NG-034"
```

---

## Self-review

- **Row coverage.** Every row is cited in Task 1 (its check) and in the task that builds it: NG-039 and NG-040 in Task 2; NG-038 in Task 3; NG-037 in Task 4; NG-029 in Task 5 (its launch path again in Task 11); NG-030 in Task 6; NG-031 in Task 7; NG-036 in Task 8; NG-035 in Task 9; NG-033 in Task 10; NG-032 in Task 11; NG-034 in Task 12. Twelve IDs, under G10's limit of 20.
- **Review Focus.** Restart with a changed port: ng-032, ng-033 and ng-034 hold the old port. Hostile local page: ng-038, two senders plus a positive control. Hung frontend at quit: ng-033's third launch. No chrome behind the frontend: Task 10 Step 7. Data from before the wave: legacy rows in ng-035 and ng-036.
- **G6.** Every check drives a real entry point: the command registry (029, 030, 031, 035, 036), a real quit through the core window's close button or close event and a relaunch on the same profile (032, 033, 034, 037), the actor channel from a stock tab (038), the guard script itself (039, 040). Each build task names the call-site deletion the reviewer makes.
- **R1/R3/R5/R17.** One check file per row, `verify-ng-NNN-<slug>.mjs`, with the three-field TSV; restart rows use `withFirefoxPage`'s `profileDir`; the launch-restore entry point, the per-tab restore and the saved session's per-tab `rowKey`, `url`, `lastAccessed` plus `savedAt` are named in Task 12's Produces block; the `receiveMessage` branch is resolved at merge.
- **Type consistency.** `SetupDockNode`, `SetupDock`, `modeId: string | null` (Tasks 1, 8, 11); `SessionSnapshot.savedAt: number` (Tasks 11, 12; wave A's `planWebTabRestore(settings, tabs, quitAt: number)`); `SavedSessionWebTab { rowKey, url, lastAccessed }` and `restoreWebTab({ rowKey, url, withHistory })` (Task 12; wave A Task 10); the `flushShellState` push and the `shellFlushed` acknowledgement (Tasks 1, 10); `SHELL_MESSAGE_KINDS` (Tasks 10, 12); `SHIPPED_MODE_RULES` rows one per line (Tasks 1, 9); `setGroupSenderPort` (Task 3); `quitApplication` (Tasks 4, 10); `onQuitRequested` (Task 10); `node scripts/verify-ng-040-internals-catalogue-lines.mjs --fix` (Tasks 2–4, 10, 12).
- **Known ceilings.** A named setup addresses a web tab by its page URL (the registry address), so two web tabs on one page restore as one tab from a named setup; the session restore uses row keys and restores both. Catalogue line references shift on every edit above them: `--fix` renumbers, and a new touchpoint still needs a hand-written row.

