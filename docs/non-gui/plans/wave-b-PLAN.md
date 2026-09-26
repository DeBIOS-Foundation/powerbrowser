# Wave B: Queries, History and Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build rows NG-021 to NG-028: Theia reads Places and the sessionstore projection through the actor, the address bar suggests history and bookmarks, a query API joins tabs with Places, users and MCP clients read and change the tab store through a documented token-gated endpoint, a tab can keep a full saved copy of its page, and every reader has a runtime caller or is deleted.

**Architecture:** Chrome-side, every new message kind goes to one new function, `handleStoreRequest`, appended at the end of `PowerBrowserAPI.sys.mjs` after the last catalogued internals line, and reached through one line in the actor parent's `receiveMessage`. That function has its own sender wall: the sender must be in a shell window. Theia-side, a DI-bound `ChromeStoreClient` sends those kinds from the Theia frame. The user/MCP endpoint is a separate loopback HTTP listener that the Theia backend starts (`theia/extensions/tab-uris/src/node/`). It speaks MCP JSON-RPC, is gated by a per-launch bearer token in a 0600 file in the profile, refuses every browser request (any `Origin` header), runs read-only SQL in a worker thread, and relays Places reads and store writes through a connected Theia window to the actor. Chrome therefore stays the only Places reader and the only `tabs.sqlite` writer. Suggestions merge the backend's tab rows with a chrome-side Places search in a new frontend service bound to the suggestion symbol the widget already injects.

**Tech Stack:** Gecko chrome module `powerbrowser/shell/PowerBrowserAPI.sys.mjs` (mozStorage `Sqlite.sys.mjs`, `PlacesUtils`, `nsIWebBrowserPersist`), Theia 1.74.1 extensions `@powerbrowser/tab-uris` and `@powerbrowser/chrome-bar` (TypeScript, inversify, JSON-RPC over the authenticated websocket), `better-sqlite3` 13.0.3 (readonly, in `worker_threads`), Node `http`, `scripts/verify-platform.sh`, `scripts/lib/firefox-bidi.mjs` (WebDriver BiDi, `--remote-allow-system-access`), Node 24 `node:sqlite` for stage-copy reads in checks.

**Spec:** `docs/non-gui/GAPS.md` rows NG-021 to NG-028 (the evidence is verified below); `.planning/notes/tab-sql-substrate.md` ("SQL is a user-queryable substrate", "optional full saved-page capture"); `.planning/research/FEATURES.md` Area 4 ("Cross-surface queries (tabs ⋈ history ⋈ bookmarks on URL)"); `.planning/milestones/v1.3-phases/13-chrome-bar-strip-relocation-spike/13-UI-SPEC.md:141,192` ("Typing filters history/bookmark suggestions"); PowerBrowser `CLAUDE.md`; `docs/non-gui/decisions.md`; GUI-research `docs/superpowers/plans/2026-09-25-powerbrowser-non-gui.md` (G1–G11, Review Focus).

**Evidence checked against the tree on 2026-09-25 (HEAD `b3f95b7`):** `readHistoryEntry` :1951, `readBookmarkByUrl` :1971, `listBookmarkFolder` :1994, `projectSessionStoreTabs` :2027: no caller, no message kind. `TabQueryService.searchByPrefix` (tab-query-service.ts:219) queries `tabs` only. There is no join API and no external read or write path. `getByUri` :167, `getBrowserTabByUrl` :184 and `listByRecency` :195 in tab-query-service.ts have no runtime caller, and neither do `readTabRow` :1108, `listTabRows` :1137, `listGroupRows` :1621 and `getGroupTabs` :1644 in PowerBrowserAPI. `TabQueryService.getThumbnail` (:276) is also uncalled at runtime; only `verify-web-tab-live.mjs:481` calls it. No capture code exists.

## Global Constraints

- G1: This wave builds in the clone `~/coding/Power-Browser-ng-b` on branch `ng-b`. Create it with `git clone ~/coding/Power-Browser ~/coding/Power-Browser-ng-b && git -C ~/coding/Power-Browser-ng-b switch -c ng-b`, then install Theia: `cd ~/coding/Power-Browser-ng-b && nix develop .#theia --command bash -c 'cd theia && yarn install --ignore-scripts --frozen-lockfile && (cd node_modules/drivelist && node-gyp rebuild) && yarn build'`. Never run a bare `yarn install`.
- G2: No Theia core edit. Firefox internals are reached only in `PowerBrowserAPI.sys.mjs`, each with an `INTERNAL-APIS.md` row. `node scripts/scan-brand-residue.mjs` exits 0 after staging. Every new check is a row in `scripts/verify-platform.sh`. No internal identifier appears in user-facing text. There is one SQLite writer, and it is chrome-side.
- G3: Never edit `ledger/`, `docs/non-gui/GAPS.md` or `.planning/`. Before merge, `git diff --name-only main...ng-b -- ledger docs/non-gui/GAPS.md .planning` prints nothing.
- G4: A chrome-side change is live only in the main checkout, so live-main checks run there after merge. Theia-side live checks run in the clone as `PB_FIREFOX_BIN=$HOME/coding/Power-Browser/objdir/dist/bin/powerbrowser PB_BACKEND_MAIN=$PWD/theia/applications/browser/lib/backend/main.js flock ~/coding/Power-Browser/.git/pb-live.lock scripts/verify-platform.sh --only <label>`.
- G5: A row that cannot be built goes to `docs/non-gui/questions-wave-b.md` with what would unblock it. Keep building the other rows. Never drop, defer or narrow a row.
- G6: Each row's check drives the behaviour through a real entry point: an actor message sent from the Theia frame, a DI-bound service, a command through the registry, or the documented endpoint. A check that calls the function under test directly is rejected.
- G8: Commit messages are `test(ng-b): …`, `feat(ng-b): …` or `fix(ng-b): …` with body `Refs: NG-NNN[, …]`. Make one commit per task, and name every path in `git add`.
- Commit gate (decisions.md). This command must print nothing except labels of this wave's recorded NG checks:
  `scripts/verify-platform.sh --quick 2>&1 | sed -n '/^verify-platform: summary/,$p' | grep ': FAIL$' | awk '{print $1}' | sed 's/:$//' | sort | comm -13 docs/non-gui/quick-baseline.txt -`
- G9: Wave B starts when wave A's key-rule slice (NG-001 to NG-005) is on `main`. Every task below is `Needs: wave-a`.
- G11: The shared file `PowerBrowserAPI.sys.mjs` has fixed regions per wave. B owns the Places and projection block (`readHistoryEntry` through `projectSessionStoreTabs`) and adds its message kinds as a new function. `handleGroupMutation` is wave A's and is not edited.
- D2: `theia/extensions/backend-opencode` (and its `/mcp` route) is being retired. Nothing here imports from it or routes through it.
- The internals catalogue is line-keyed (`scripts/check-internals-boundary.sh --catalogue`). Tasks 2–6 add chrome code only at the end of `PowerBrowserAPI.sys.mjs`, below the last catalogued line, so no existing row's line number moves. Tasks 7 and 8 edit wave A's region, so each one renumbers the rows its edit moved.

## Review Focus

- **A hostile local page.** A page served from 127.0.0.1 on a second port, in the selected stock tab, sends this wave's actor kinds. It also calls the endpoint with the real token planted. Both must be refused, with no data read and no write landed. The checks pinning this: NG-021, NG-022, NG-023, NG-024 and NG-028 (actor kinds), NG-025 and NG-026 (endpoint).
- **SQL that escapes read-only.** `ATTACH` of another profile database (places.sqlite, cookies.sqlite), `VACUUM INTO` a file, a second statement after `;`, `PRAGMA` and `load_extension` are all refused. The row count stays the same and no file is written. Pinned in the NG-025 check.
- **A runaway query from an MCP client.** It ends at the 5 s limit with an error, and both the endpoint and the Theia backend RPC keep answering. Pinned in the NG-025 check.
- **Places rows that are not web addresses.** Bookmarklets (`javascript:`) and `file:` bookmarks are never suggested. An address appears once, open tabs rank first, and a typed `%` matches literally. Pinned in the NG-023 check.
- **Saving a page twice or saving a gone tab.** A second save replaces the first copy with no orphan directory. A save for a tab that no longer exists answers with an error and does not hang. Pinned in the NG-028 check.
- From the program's Review Focus: "a function with no caller on the runtime path" applies to every B row. Each live check below fails when its call site is deleted. Every task has a step that deletes the call site once and watches the check go red.

## Ownership and shared touches

B-owned, new: `scripts/lib/ng-b-live.mjs`, `scripts/verify-ng-02{1..8}-*.mjs`, `docs/non-gui/checks-wave-b.tsv`, `docs/tab-store-access.md`, and under `theia/extensions/tab-uris/src/`: `node/tab-store-access-endpoint.ts`, `node/tab-store-sql.ts`, `node/tab-store-relay.ts`, `node/tab-store-access-backend-module.ts`, `browser/tab-store-access-protocol.ts`, `browser/chrome-store-client.ts`, `browser/tab-store-relay-contribution.ts`, `browser/save-page-copy-command.ts`, `browser/tab-store-access-frontend-module.ts`, `theia/extensions/chrome-bar/src/browser/chrome-bar-places-suggestions.ts`.

B-owned, existing: the Places block of `PowerBrowserAPI.sys.mjs` (left unchanged; the new code is at the end of the file), and the chrome-bar suggestion data path: `chrome-bar-suggestion-service.ts` and the proxy bind in `chrome-bar-frontend-module.ts`.

Shared touches, each named where it happens:
1. `PowerBrowserAPI.sys.mjs` `PowerBrowserGroupParent.receiveMessage`: one inserted line (Task 3). This is the only shared-region touch in that file for Tasks 2–6.
2. `theia/extensions/tab-uris/package.json`: one `theiaExtensions` entry (Tasks 2, 3). This avoids editing wave C's `tab-uris-frontend-module.ts` and wave A's `tab-query-backend-module.ts`.
3. `scripts/verify-platform.sh`: one quick block and one full block of rows (Task 1).
4. `scripts/verify-web-tab-live.mjs`: two reader seams (Task 5 and Task 8), forced by NG-023 and NG-027.
5. `powerbrowser/INTERNAL-APIS.md`: row text for the internals B touches (Tasks 4, 5, 7), three new rows (Task 7), and line renumbering after edits in wave A's region (Tasks 7, 8).
6. Wave A's regions of `PowerBrowserAPI.sys.mjs` and `tab-query-service.ts`, wave A's roundtrip check (`EXPECTED_SCHEMA_HEAD`, `EXPECTED_GROUP_METHODS`), and `docs/TAB-STORE.md`: Tasks 7 and 8 only, marked `Needs: wave-a (all merged)`.

## Interfaces consumed from wave A and wave C

These are aligned with wave A's plan: its Task 2 **Produces** block ("SCHEMA v5", "KEY RULE", "LIFECYCLE", "ACTOR KINDS", "CHROME", "THEIA", "FOR WAVES B AND C"), plus its Tasks 3 and 9. Each task's **Consumes** block cites them by ID, with wave A's exact names.

| ID | Interface (wave A's names) | Used by |
|---|---|---|
| A1 | Schema v5 `tabs`: `uri TEXT PRIMARY KEY` (the row key), `url TEXT NOT NULL` (the tab's current address; `''` = none), `title TEXT NOT NULL`, `last_active INTEGER NOT NULL` (ms), `group_id TEXT NULL`, `thumbnail TEXT NULL`, `x`/`y INTEGER NULL`, `ord INTEGER NULL`, `created_at`/`last_accessed`/`closed_at INTEGER NULL`. Tables `groups (id, title, x, y, w, h, is_active)` and `settings (key, value)`. | Tasks 2, 4, 7 |
| A2 | Key rule: `tabs.uri = '<kind>:<identity>'`, never the page URL. A stock tab is `stock:<launch-stamp base36>-<n>` (the SessionStore custom tab value `powerbrowser-tab-key`). An in-shell web tab is `web:<id>`, and Theia exposes it as `WebTabWidget.rowKey: string`. A Theia-drawn tab uses its registry address. Two tabs on one URL are two rows, and "B: rows are joined by `tabs.url` to Places; `tabs.uri` is identity only". | Tasks 4, 7; the checks read keys through Theia's reader and never spell them |
| A3 | `PowerBrowserAPI.openTabStore()` keeps its name, and it is the one writer connection | Tasks 4, 7 |
| A4 | `PowerBrowserAPI.findTabBrowserForUri(uri): { win, tab, browser } \| null`. Its stock half (`findStockTabBrowser`) matches `SessionStore.getCustomTabValue(tab, STOCK_TAB_KEY_VALUE) === uri` (wave A Task 2 Step 8), and its in-shell half matches the `webTabs` entry keyed by the row key | Task 7 |
| A5 | `PowerBrowserAPI.parseSessionStoreTabRows(): { uri, url, title, last_active }[]`, "keyed by the custom tab value; unkeyed tabs skipped". `projectSessionStoreTabs` still delegates to it. | Task 3 |
| A6 | Lifecycle: open means `closed_at IS NULL` ("open or restorable"); closed rows stay as history until they are pruned. The join's `open` flag is `closed_at === null`. | Task 4 |
| A7 | `handleGroupMutation` keeps `createGroup {id,title,x,y,w,h,isActive}`, `renameGroup {id,title}`, `moveGroup {id,x,y}`, `resizeGroup {id,w,h}`, `dissolveGroup {id}`, `setActiveGroup {id}`, `setTabGroup {uri,groupId}`, `setTabPosition {uri,x,y}` and `setGroupOrder {groupId,uris}`. `setTabGroup`, `setTabPosition` and `setGroupOrder` "now reject 'unknown tab URI <uri>' (reason 'validation')". Its new kinds `trackTab` and `closeTab` are not relayed by B. | Task 6 |
| A8 | `GroupQueryService` (DI symbol name `GroupQueryService`): `listGroups()`, `getGroupTabs(groupId)`, `listUngroupedTabs()`, `getThumbnail(uri)` and `getSettings()` (wave A Task 7). `getGroupTabs`, `listUngroupedTabs` and `searchByPrefix` serve open rows only (`closed_at IS NULL`), and `searchByPrefix` only http(s) rows. After wave A's Task 3 (NG-012) every reader throws when the store cannot be read. | the NG-026 and NG-028 checks; Tasks 5, 8 |
| A9 | `const TAB_STORE_SCHEMA_HEAD = 5`. `migrateTabStoreToHead(conn)` is "the one chain, used by openTabStore and the quarantine rebuild": a `steps` array that must be exactly `TAB_STORE_SCHEMA_HEAD` long. `migrateTabStoreToV5(conn)` stamps exactly 5. DDL lives in marker blocks `/* PB-SQL-V<N>-DDL-START */ \`…\` /* PB-SQL-V<N>-DDL-END */`, which `versionBlocks()` (`scripts/lib/tab-store-fixtures.mjs`) reads in file order as versions 1…head (the name must match `[A-Z0-9]+`). | Task 7 |
| A10 | Wave A's checks derive the head (`schemaHead()`) and each version's DDL (`versionBlocks()`) from the tree, so a v6 block extends their fixtures. The one hand-kept value is `EXPECTED_SCHEMA_HEAD = 5` in `scripts/verify-gui08-persistence-roundtrip.mjs` (wave A Task 3), whose `EXPECTED_GROUP_METHODS` also gains `'setGroupOrder'`. | Tasks 7, 8 |
| A11 | `docs/TAB-STORE.md` (wave A Tasks 2 and 9). Its NG-019 check requires a `## vN` section for every version up to the head, every table, index and column in backticks, and `` `user_version = <head>` ``. Its "Reader contract" names the `GroupQueryService` methods. | Tasks 2, 7, 8 |
| A12 | `TAB_QUERY_FILE_NAME` stays exported from `tab-query-service.ts` (wave A's reader still opens `join(this.profileDir, TAB_QUERY_FILE_NAME)`) | Task 2 |
| C1 | `groupSenderIsTheia(actorRef)` keeps its name and signature. Wave C's NG-038 may tighten it, and B's own wall sits on top of it. | Task 3 |
| C2 | After wave C's NG-040, `INTERNAL-APIS.md` is green and still line-keyed, and each row's line must hold the internal the row names | Tasks 7, 8 |
| C3 | Wave C's Q2 also edits `PowerBrowserGroupParent.receiveMessage`, the same method as B's one-line hook (questions-wave-b.md Q1) | Task 3 |

## NG-027: decision per reader

A reader with no caller on the runtime path is deleted. Task 8 derives the dead list again after wave A merges. A name not in this table gets the same rule, and the commit body records the reason.

| Reader | Runtime callers today | Decision | Reason |
|---|---|---|---|
| `PowerBrowserAPI.readHistoryEntry`, `readBookmarkByUrl`, `listBookmarkFolder` | none | keep; Task 3 gives them a caller | NG-021 requires Theia to read these through the actor |
| `PowerBrowserAPI.projectSessionStoreTabs` | none | keep; Task 3 gives it a caller | NG-022 |
| `PowerBrowserAPI.readTabRow` | none | delete, unless wave A added a caller (for example NG-004's unknown-URI error) | writers use their own statements, and Theia reads rows through TabQueryService |
| `PowerBrowserAPI.listTabRows` | none | delete | the sweep reads sessionstore, not the store |
| `PowerBrowserAPI.listGroupRows` | none (the roundtrip script only lists the name) | delete, and remove the name from `EXPECTED_GROUP_METHODS` | Theia reads groups through `TabQueryService.listGroups` |
| `PowerBrowserAPI.getGroupTabs` | none | delete, and remove the name from `EXPECTED_GROUP_METHODS` | `TabQueryService.getGroupTabs` serves Panorama |
| `TabQueryService.getByUri` | only `getBrowserTabByUrl`, which is dead | delete | no consumer |
| `TabQueryService.getBrowserTabByUrl` | none | delete | under NG-001 a key is no longer derived from the URL |
| `TabQueryService.listByRecency` | none | delete | `searchByPrefix('')` already serves recency |
| `TabQueryService.getThumbnail` (and the `GroupQueryService` member) | none; `verify-web-tab-live.mjs:481` is a check | delete, point that seam at the `thumbnail` column of the row readers, and drop it from the "Reader contract" in `docs/TAB-STORE.md` | rows already carry `thumbnail` |
| `TabQueryService.getSettings` (added by wave A) | whatever wave A's Task 7 or 10 wires | keep if the Task 8 derivation finds a runtime caller, otherwise delete and drop it from the "Reader contract" | same rule |
| `TabQueryService.setProfileDir` | none | out of scope: a setter, not a reader | NG-027 covers readers only |

## Execution order

Task 1 comes first. Tasks 2 to 6 run in order: they share the endpoint file, the protocol file and the end of `PowerBrowserAPI.sys.mjs`. Tasks 7 and 8 come last. They need all of wave A merged (their edits fall in wave A's regions) and wave C's NG-040 on `main` (so they renumber a green catalogue). Before either, run `git pull --no-rebase ~/coding/Power-Browser main` in the clone.

The live-main checks (NG-021, NG-022, NG-023, NG-024, NG-026, NG-028) cannot pass in the clone, because chrome loads from `main`. Before commit, run `node --check`, the typecheck, `yarn build` and the quick gate. Report the live check as `live-main pending`, and the controller runs it at merge. The one live-clone check (NG-025) runs in the clone (G4). NG-026 is live-main because its `setSetting` op (R18) is a chrome-side store kind.

---

### Task 1: Failing checks for NG-021 to NG-028

**Needs:** wave-a (this task relies only on assumptions A1 and A8: the checks read tab URIs through Theia's reader and never spell the key format)

**Rows:** NG-021, NG-022, NG-023, NG-024, NG-025, NG-026, NG-027, NG-028 (one check each)

**Files:**
- Create: `scripts/lib/ng-b-live.mjs`
- Create: `scripts/verify-ng-021-places-reads.mjs`
- Create: `scripts/verify-ng-022-sessionstore-projection.mjs`
- Create: `scripts/verify-ng-023-suggestions-places.mjs`
- Create: `scripts/verify-ng-024-tabs-places-join.mjs`
- Create: `scripts/verify-ng-025-store-read-endpoint.mjs`
- Create: `scripts/verify-ng-026-store-write-endpoint.mjs`
- Create: `scripts/verify-ng-027-reader-callers.mjs`
- Create: `scripts/verify-ng-028-saved-page.mjs`
- Create: `docs/non-gui/checks-wave-b.tsv`
- Modify: `scripts/verify-platform.sh` (one quick block after the `backend-env-readers-self-test` row, one full block after the `gui07-mode-switch-tabs-live-self-test` row)

**Interfaces:**
- Consumes: `withFirefoxPage(url, cb, { profileDir })` from `scripts/lib/firefox-bidi.mjs`, committed in main as `f4818a0` (decisions.md R3; a caller-owned profile is used as given and never removed). Its callback gets `{ evaluate, evaluateIn, send, waitFor, screenshot, topLevelContexts }`. A8 (`GroupQueryService`). The DI identifiers `ChromeBarSuggestionService` and `CommandRegistry`.
- Produces: the check labels in the table below, the names later tasks must satisfy (`ChromeStoreClient` DI class, actor kinds `readHistoryEntry` / `readBookmarkByUrl` / `listBookmarkFolder` / `projectSessionStoreTabs` / `searchPlaces` / `queryTabsWithPlaces` / `savePageCopy`, endpoint tools `tabs_sql` / `history_entry` / `bookmark_by_url` / `bookmark_folder` / `sessionstore_tabs` / `tabs_with_places` / `tab_store_write`, command `powerbrowser.tab.savePageCopy`, table `saved_pages`, files `store-access.json`, `docs/tab-store-access.md`, `theia/extensions/tab-uris/src/browser/tab-store-access-protocol.ts` with `TAB_STORE_TOOL_NAMES` and `TAB_STORE_WRITE_FIELDS`).

| Row | Label | Tier |
|---|---|---|
| NG-021 | `ng-021-places-reads-via-actor` | live-main |
| NG-022 | `ng-022-sessionstore-projection-via-actor` | live-main |
| NG-023 | `ng-023-suggestions-history-bookmarks` | live-main |
| NG-024 | `ng-024-tabs-places-join` | live-main |
| NG-025 | `ng-025-store-read-endpoint` | live-clone |
| NG-026 | `ng-026-store-write-endpoint` | live-main |
| NG-027 | `ng-027-reader-callers` (+ `ng-027-reader-callers-self-test`) | quick |
| NG-028 | `ng-028-saved-page-copy` | live-main |

NG-027's promise is about the code itself: every reader has a caller. So its real entry point is the tree, and its check reads the tree as `git ls-files` sees it. It derives both the reader set and the call sites at check time and never hand-keeps a list. That is also exactly the program's Review Focus test: delete a call site, and the check goes red.

- [ ] **Step 1: Write the shared live-check plumbing**

Create `scripts/lib/ng-b-live.mjs`:

```js
// scripts/lib/ng-b-live.mjs
//
// Shared plumbing for the non-GUI wave B live checks (NG-021..NG-028).
// Everything here is fixture SETUP or OBSERVATION: serving pages from a
// second loopback port, seeding Places through the Places API, owning the
// profile directory (withProfile), reading the endpoint's access file. Each check drives
// the behaviour its row promises through a real entry point -- an actor
// message sent from the Theia frame, a DI-bound Theia service, a command
// through the registry, or the documented endpoint -- never by calling the
// function under test (program constraint G6).
//
// chromeEval() needs --remote-allow-system-access, which withFirefoxPage
// already passes (scripts/lib/firefox-bidi.mjs).

import { createServer, request } from 'node:http';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { withFirefoxPage } from './firefox-bidi.mjs';

/**
 * withFirefoxPage on a profile this check owns (its `{ profileDir }` option,
 * decisions.md R3), so the check knows the profile directory without asking
 * chrome; the callback also receives `profileDir`. Removed afterwards.
 */
export async function withProfile(url, callback) {
    const profileDir = await mkdtemp(join(tmpdir(), 'ng-b-profile-'));
    try {
        return await withFirefoxPage(url, api => callback({ ...api, profileDir }), { profileDir });
    } finally {
        await rm(profileDir, { recursive: true, force: true });
    }
}

/** Inversify lookup by identifier name -- the walk verify-web-tab-live.mjs uses. */
export const GET_BY_NAME = `
function __getByName(container, name) {
    let found;
    container._bindingDictionary.traverse(key => {
        if (found) return;
        const keyStr = typeof key === 'symbol' ? key.toString() : (key && key.name) || String(key);
        if (keyStr === 'Symbol(' + name + ')' || keyStr === name) found = key;
    });
    if (!found) throw new Error('DI binding not found for identifier name: ' + name);
    return container.get(found);
}`;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/** Polls `probe` until it returns a truthy value; resolves that value, or undefined after `timeoutMs`. */
export async function until(probe, timeoutMs, intervalMs = 250) {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
        let value;
        try {
            value = await probe();
        } catch {
            value = undefined;
        }
        if (value) return value;
        if (Date.now() >= deadline) return undefined;
        await sleep(intervalMs);
    }
}

/** Prints the verdict in the registry's style; exit 1 on any failure or throw. */
export function runCheck(name, body) {
    body().then(failures => {
        if (failures.length) {
            console.error(`${name}: FAIL`);
            for (const failure of failures) console.error(`  - ${failure}`);
            process.exit(1);
        }
        console.log(`${name}: PASS`);
        process.exit(0);
    }, err => {
        console.error(`${name}: FAIL -- ${err && err.stack ? err.stack : err}`);
        process.exit(1);
    });
}

/**
 * Serves `pages` on 127.0.0.1 at an ephemeral port: the "second port" the
 * hostile-page walls are tested from. A page is { title, body } (HTML) or
 * { type, bytes } (anything else).
 */
export async function servePages(pages) {
    const server = createServer((req, res) => {
        const page = pages[new URL(req.url, 'http://127.0.0.1').pathname];
        if (!page) {
            res.writeHead(404).end();
            return;
        }
        if (page.bytes) {
            res.writeHead(200, { 'Content-Type': page.type }).end(page.bytes);
            return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(
            `<!doctype html><html><head><meta charset="utf-8"><title>${page.title}</title></head><body>${page.body ?? ''}</body></html>`);
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    return {
        origin,
        url: path => origin + path,
        close: () => new Promise(resolve => {
            server.closeAllConnections();
            server.close(resolve);
        }),
    };
}

/** The Theia shell's content context: a loopback page that is not on the fixture origin. */
export async function shellContext(topLevelContexts, fixtureOrigin) {
    const found = await until(async () => (await topLevelContexts())
        .find(c => c.url.startsWith('http://127.0.0.1:') && !c.url.startsWith(fixtureOrigin)), 90000);
    if (!found) throw new Error('the Theia shell context never appeared');
    return found.context;
}

/** Waits for the Theia frontend in `ctx` to reach the ready state. */
export async function waitTheiaReady(evaluateIn, ctx) {
    const ready = await until(() => evaluateIn(ctx, `(() => { try { ${GET_BY_NAME}
        return __getByName(window.theia.container, 'FrontendApplicationStateService').state === 'ready';
    } catch (e) { return false; } })()`), 90000);
    if (!ready) throw new Error('the Theia frontend never reached the ready state');
}

/** Page-realm expression: one actor request exactly as any page would send it; resolves a JSON string. */
export function actorRequestExpr(msg, timeoutMs = 8000) {
    return `new Promise(resolve => {
        const requestId = 'ng-b-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
        const onReply = event => {
            const detail = event.detail;
            if (detail && detail.requestId === requestId) done({ reply: detail.reply });
        };
        const done = value => {
            window.removeEventListener('PowerBrowserGroupResponse', onReply);
            clearTimeout(timer);
            resolve(JSON.stringify(value));
        };
        const timer = setTimeout(() => done({ timeout: true }), ${timeoutMs});
        window.addEventListener('PowerBrowserGroupResponse', onReply);
        document.dispatchEvent(new CustomEvent('PowerBrowserGroupRequest', { bubbles: true, detail: { requestId, msg: ${JSON.stringify(msg)} } }));
    })`;
}

/** One actor request sent from the page in `ctx`; resolves { reply } or { timeout: true }. */
export async function actorRequest(evaluateIn, ctx, msg, timeoutMs) {
    return JSON.parse(await evaluateIn(ctx, actorRequestExpr(msg, timeoutMs)));
}

/** Calls a DI-bound Theia service in the shell frame; resolves { value } or { error }. */
export async function diCall(evaluateIn, ctx, identifier, method, args = []) {
    return JSON.parse(await evaluateIn(ctx, `(async () => { ${GET_BY_NAME}
        try {
            const target = __getByName(window.theia.container, ${JSON.stringify(identifier)});
            return JSON.stringify({ value: await target[${JSON.stringify(method)}](...${JSON.stringify(args)}) });
        } catch (e) {
            return JSON.stringify({ error: String((e && e.message) || e) });
        }
    })()`));
}

/** SETUP ONLY: evaluates `expression` in a chrome-scope context and returns its value. */
export async function chromeEval(send, expression) {
    const tree = await send('browsingContext.getTree', { 'moz:scope': 'chrome' });
    const context = tree.contexts && tree.contexts[0] && tree.contexts[0].context;
    if (!context) throw new Error('no chrome-scope browsing context');
    const result = await send('script.evaluate', { expression, target: { context }, awaitPromise: true });
    if (result.type !== 'success') throw new Error(`chrome-scope evaluation threw: ${JSON.stringify(result.exceptionDetails ?? result)}`);
    return result.result.value;
}

/** SETUP ONLY: history visits and one bookmark folder through the Places API; resolves the folder guid. */
export function seedPlaces(send, { history = [], bookmarks = [] } = {}) {
    return chromeEval(send, `(async () => {
        const { PlacesUtils } = ChromeUtils.importESModule('resource://gre/modules/PlacesUtils.sys.mjs');
        for (const h of ${JSON.stringify(history)}) {
            await PlacesUtils.history.insert({ url: h.url, title: h.title, visits: [{ date: new Date() }] });
        }
        const folder = await PlacesUtils.bookmarks.insert({
            parentGuid: PlacesUtils.bookmarks.unfiledGuid,
            type: PlacesUtils.bookmarks.TYPE_FOLDER,
            title: 'Wave B fixture folder',
        });
        for (const b of ${JSON.stringify(bookmarks)}) {
            await PlacesUtils.bookmarks.insert({ parentGuid: folder.guid, url: b.url, title: b.title });
        }
        return folder.guid;
    })()`);
}

/** The endpoint's access file from the check's profile once the backend wrote it; null when it never appears. */
export async function storeAccess(profileDir) {
    const file = join(profileDir, 'store-access.json');
    const text = await until(() => readFile(file, 'utf8'), 60000);
    if (!text) return null;
    return { ...JSON.parse(text), file, mode: (await stat(file)).mode & 0o777 };
}

/** One raw POST; `headers` go out as given, so a check can drop the token, plant an Origin or spoof Host. */
export function post(url, headers, body) {
    return new Promise((resolve, reject) => {
        const target = new URL(url);
        const req = request({ host: target.hostname, port: target.port, path: target.pathname, method: 'POST', headers }, res => {
            let text = '';
            res.setEncoding('utf8');
            res.on('data', chunk => { text += chunk; });
            res.on('end', () => resolve({ status: res.statusCode, text }));
        });
        req.on('error', reject);
        req.end(body);
    });
}

/** One JSON-RPC call carrying the right token; resolves { status, json }. */
export async function mcp(access, method, params, headers = {}) {
    const res = await post(access.url, { 'Content-Type': 'application/json', Authorization: `Bearer ${access.token}`, ...headers },
        JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }));
    let json = null;
    try {
        json = JSON.parse(res.text);
    } catch {
        json = null;
    }
    return { status: res.status, json };
}

/** tools/call; resolves { ok: true, value } with the structured result, or { ok: false, error }. */
export async function callTool(access, name, args, headers) {
    const res = await mcp(access, 'tools/call', { name, arguments: args }, headers);
    const result = res.json && res.json.result;
    if (res.status !== 200 || !result) return { ok: false, error: (res.json && res.json.error && res.json.error.message) || `HTTP ${res.status}` };
    if (result.isError) return { ok: false, error: (result.content && result.content[0] && result.content[0].text) || 'tool error' };
    return { ok: true, value: result.structuredContent };
}

/**
 * Page-realm expression: the endpoint called from a web page three ways --
 * with the real token (as if it had leaked), as a plain CORS POST, and as a
 * no-cors POST. Resolves a JSON array of what the page could observe.
 */
export function hostileFetchExpr(url, token, rpc) {
    return `(async () => {
        const body = ${JSON.stringify(JSON.stringify(rpc))};
        const out = [];
        for (const init of [
            { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + ${JSON.stringify(token)} }, body },
            { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body },
            { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body },
        ]) {
            try {
                const res = await fetch(${JSON.stringify(url)}, init);
                out.push({ type: res.type, status: res.status, text: res.type === 'opaque' ? '' : await res.text() });
            } catch (e) {
                out.push({ error: String(e) });
            }
        }
        return JSON.stringify(out);
    })()`;
}
```

- [ ] **Step 2: Write the NG-021 check**

Create `scripts/verify-ng-021-places-reads.mjs`:

```js
#!/usr/bin/env node
// scripts/verify-ng-021-places-reads.mjs
//
// NG-021: Theia reads history entries, bookmarks and bookmark folders
// through the actor. Live, chrome-side (live-main). Three real entry points
// must each answer with the seeded fixture:
//   1. the actor message, sent from the Theia frame;
//   2. the DI-bound ChromeStoreClient (Theia's reader);
//   3. the endpoint's history_entry / bookmark_by_url / bookmark_folder tools,
//      relayed through the Theia frame (the runtime consumer).
// Then the hostile-page wall: a 127.0.0.1 page on a second port, in the
// selected stock tab, sends the same kinds and must get no data. Fixtures are
// seeded through the Places API from a chrome-scope evaluation (setup only).

import { actorRequest, actorRequestExpr, callTool, diCall, runCheck, seedPlaces, servePages, shellContext, storeAccess, waitTheiaReady, withProfile } from './lib/ng-b-live.mjs';

const NAME = 'ng-021-places-reads-via-actor';
const NONCE = `ng021${Date.now().toString(36)}`;
const HISTORY = { url: `https://example.invalid/${NONCE}/history`, title: `History ${NONCE}` };
const BOOKMARK = { url: `https://example.invalid/${NONCE}/bookmark`, title: `Bookmark ${NONCE}` };

runCheck(NAME, async () => {
    const failures = [];
    const pages = await servePages({ '/loopback': { title: `Loopback ${NONCE}` } });
    try {
        await withProfile(pages.url('/loopback'), async ({ evaluate, evaluateIn, send, topLevelContexts, profileDir }) => {
            const shell = await shellContext(topLevelContexts, pages.origin);
            await waitTheiaReady(evaluateIn, shell);
            const folderGuid = await seedPlaces(send, { history: [HISTORY], bookmarks: [BOOKMARK] });
            const kinds = [
                { kind: 'readHistoryEntry', url: HISTORY.url },
                { kind: 'readBookmarkByUrl', url: BOOKMARK.url },
                { kind: 'listBookmarkFolder', folderGuid },
            ];

            // 1. The actor message from the Theia frame.
            const h = await actorRequest(evaluateIn, shell, kinds[0]);
            if (h.reply?.ok !== true || h.reply.entry?.url !== HISTORY.url || h.reply.entry?.title !== HISTORY.title) {
                failures.push(`actor readHistoryEntry from the Theia frame answered ${JSON.stringify(h)}`);
            }
            const b = await actorRequest(evaluateIn, shell, kinds[1]);
            if (b.reply?.ok !== true || b.reply.bookmark?.url !== BOOKMARK.url || b.reply.bookmark?.title !== BOOKMARK.title || typeof b.reply.bookmark?.guid !== 'string') {
                failures.push(`actor readBookmarkByUrl from the Theia frame answered ${JSON.stringify(b)}`);
            }
            const f = await actorRequest(evaluateIn, shell, kinds[2]);
            if (f.reply?.ok !== true || !Array.isArray(f.reply.rows) || !f.reply.rows.some(r => r.url === BOOKMARK.url && r.title === BOOKMARK.title)) {
                failures.push(`actor listBookmarkFolder from the Theia frame answered ${JSON.stringify(f)}`);
            }

            // 2. The DI-bound Theia reader.
            const dh = await diCall(evaluateIn, shell, 'ChromeStoreClient', 'readHistoryEntry', [HISTORY.url]);
            if (dh.value?.title !== HISTORY.title) failures.push(`ChromeStoreClient.readHistoryEntry answered ${JSON.stringify(dh)}`);
            const db = await diCall(evaluateIn, shell, 'ChromeStoreClient', 'readBookmarkByUrl', [BOOKMARK.url]);
            if (db.value?.title !== BOOKMARK.title) failures.push(`ChromeStoreClient.readBookmarkByUrl answered ${JSON.stringify(db)}`);
            const df = await diCall(evaluateIn, shell, 'ChromeStoreClient', 'listBookmarkFolder', [folderGuid]);
            if (!Array.isArray(df.value) || !df.value.some(r => r.url === BOOKMARK.url)) failures.push(`ChromeStoreClient.listBookmarkFolder answered ${JSON.stringify(df)}`);

            // 3. The endpoint's tools, relayed through a Theia window to the actor.
            const access = await storeAccess(profileDir);
            if (!access) {
                failures.push('store-access.json never appeared in the profile -- the endpoint is not running');
            } else {
                const th = await callTool(access, 'history_entry', { url: HISTORY.url });
                if (!th.ok || th.value?.entry?.title !== HISTORY.title) failures.push(`tool history_entry answered ${JSON.stringify(th)}`);
                const tb = await callTool(access, 'bookmark_by_url', { url: BOOKMARK.url });
                if (!tb.ok || tb.value?.bookmark?.title !== BOOKMARK.title) failures.push(`tool bookmark_by_url answered ${JSON.stringify(tb)}`);
                const tf = await callTool(access, 'bookmark_folder', { guid: folderGuid });
                if (!tf.ok || !tf.value?.rows?.some(r => r.url === BOOKMARK.url)) failures.push(`tool bookmark_folder answered ${JSON.stringify(tf)}`);
            }

            // 4. Hostile local page: the selected stock tab sends the same kinds.
            for (const msg of kinds) {
                const r = JSON.parse(await evaluate(actorRequestExpr(msg, 4000)));
                if (r.reply?.ok === true || JSON.stringify(r).includes(`${NONCE}/`)) {
                    failures.push(`a 127.0.0.1 page in a stock tab read ${msg.kind}: ${JSON.stringify(r)}`);
                }
            }
        });
    } finally {
        await pages.close();
    }
    return failures;
});
```

- [ ] **Step 3: Write the NG-022 check**

Create `scripts/verify-ng-022-sessionstore-projection.mjs`:

```js
#!/usr/bin/env node
// scripts/verify-ng-022-sessionstore-projection.mjs
//
// NG-022: the sessionstore projection is reachable from Theia. Live,
// chrome-side (live-main). A served page opens in a stock tab; the projection
// must list it through the actor message sent from the Theia frame, through
// the DI-bound ChromeStoreClient, and through the endpoint's sessionstore_tabs
// tool (the runtime consumer). The same page -- a 127.0.0.1 page on a second
// port in the selected stock tab -- asks for the projection and gets no rows.

import { actorRequest, actorRequestExpr, callTool, diCall, runCheck, servePages, shellContext, storeAccess, until, waitTheiaReady, withProfile } from './lib/ng-b-live.mjs';

const NAME = 'ng-022-sessionstore-projection-via-actor';
const NONCE = `ng022${Date.now().toString(36)}`;

runCheck(NAME, async () => {
    const failures = [];
    const pages = await servePages({ '/page': { title: `Session ${NONCE}` } });
    const pageUrl = pages.url('/page');
    const lists = rows => Array.isArray(rows)
        && rows.some(row => row.url === pageUrl && row.title === `Session ${NONCE}` && typeof row.uri === 'string' && row.uri.length > 0);
    try {
        await withProfile(pageUrl, async ({ evaluate, evaluateIn, send, topLevelContexts, profileDir }) => {
            const shell = await shellContext(topLevelContexts, pages.origin);
            await waitTheiaReady(evaluateIn, shell);
            const ask = () => actorRequest(evaluateIn, shell, { kind: 'projectSessionStoreTabs' });
            if (!(await until(async () => lists((await ask()).reply?.rows), 30000))) {
                failures.push(`projectSessionStoreTabs from the Theia frame never listed ${pageUrl}: ${JSON.stringify(await ask())}`);
            }
            const viaReader = await diCall(evaluateIn, shell, 'ChromeStoreClient', 'projectSessionStoreTabs');
            if (!lists(viaReader.value)) failures.push(`ChromeStoreClient.projectSessionStoreTabs answered ${JSON.stringify(viaReader)}`);
            const access = await storeAccess(profileDir);
            if (!access) {
                failures.push('store-access.json never appeared in the profile -- the endpoint is not running');
            } else {
                const tool = await callTool(access, 'sessionstore_tabs', {});
                if (!tool.ok || !lists(tool.value?.rows)) failures.push(`tool sessionstore_tabs answered ${JSON.stringify(tool)}`);
            }
            const hostile = JSON.parse(await evaluate(actorRequestExpr({ kind: 'projectSessionStoreTabs' }, 4000)));
            if (hostile.reply?.ok === true || Array.isArray(hostile.reply?.rows)) {
                failures.push(`a 127.0.0.1 page in a stock tab read the sessionstore projection: ${JSON.stringify(hostile)}`);
            }
        });
    } finally {
        await pages.close();
    }
    return failures;
});
```

- [ ] **Step 4: Write the NG-023 check**

Create `scripts/verify-ng-023-suggestions-places.mjs`:

```js
#!/usr/bin/env node
// scripts/verify-ng-023-suggestions-places.mjs
//
// NG-023: address-bar suggestions include history and bookmark matches, not
// only open tabs (13-UI-SPEC.md:141,192). Live, chrome-side (live-main).
// Driven through the DI-bound ChromeBarSuggestionService, the service the
// chrome bar widget injects and calls on every keystroke. Fixtures: one open
// tab, one history-only page, one bookmark, plus a bookmarklet and a file:
// bookmark that must never be offered as an address. Also: each address
// once, open tabs first, at most 8 rows, a typed % matches literally, and a
// 127.0.0.1 page in the selected stock tab cannot run the Places search.

import { actorRequestExpr, diCall, runCheck, seedPlaces, servePages, shellContext, until, waitTheiaReady, withProfile } from './lib/ng-b-live.mjs';

const NAME = 'ng-023-suggestions-history-bookmarks';
const NONCE = `ng023${Date.now().toString(36)}`;
const HISTORY_ONLY = { url: `https://example.invalid/${NONCE}/history-only`, title: `HistoryOnly ${NONCE}` };
const BOOKMARKED = { url: `https://example.invalid/${NONCE}/bookmarked`, title: `Bookmarked ${NONCE}` };
const BOOKMARKLET = { url: `javascript:void('${NONCE}')`, title: `Bookmarklet ${NONCE}` };
const FILE_BOOKMARK = { url: `file:///tmp/${NONCE}.html`, title: `File ${NONCE}` };

runCheck(NAME, async () => {
    const failures = [];
    const pages = await servePages({ '/open': { title: `Open ${NONCE}` } });
    const openUrl = pages.url('/open');
    try {
        await withProfile(openUrl, async ({ evaluate, evaluateIn, send, topLevelContexts, profileDir }) => {
            const shell = await shellContext(topLevelContexts, pages.origin);
            await waitTheiaReady(evaluateIn, shell);
            await seedPlaces(send, { history: [HISTORY_ONLY], bookmarks: [BOOKMARKED, BOOKMARKLET, FILE_BOOKMARK] });
            const search = prefix => diCall(evaluateIn, shell, 'ChromeBarSuggestionService', 'searchByPrefix', [prefix, 8]);
            const want = [openUrl, HISTORY_ONLY.url, BOOKMARKED.url];
            const complete = r => r.value && want.every(u => r.value.some(row => row.url === u));
            const final = (await until(async () => { const r = await search(NONCE); return complete(r) ? r : undefined; }, 30000)) ?? await search(NONCE);
            const rows = final.value ?? [];
            const urls = rows.map(row => row.url);
            for (const u of want) {
                if (!urls.includes(u)) failures.push(`the suggestions for the typed text lack ${u}: ${JSON.stringify(final)}`);
            }
            if (urls.some(u => !/^https?:\/\//.test(u))) failures.push(`a non-web address was suggested: ${JSON.stringify(urls)}`);
            if (new Set(urls).size !== urls.length) failures.push(`an address was suggested twice: ${JSON.stringify(urls)}`);
            if (rows.length > 8) failures.push(`${rows.length} rows came back; the dropdown cap is 8`);
            const placeIndexes = [HISTORY_ONLY.url, BOOKMARKED.url].map(u => urls.indexOf(u)).filter(i => i >= 0);
            if (urls.includes(openUrl) && placeIndexes.some(i => i < urls.indexOf(openUrl))) {
                failures.push(`an open tab ranks below a history or bookmark match: ${JSON.stringify(urls)}`);
            }
            const percent = await search('%');
            if ((percent.value ?? []).some(row => row.url.includes(NONCE))) failures.push('typing % listed the fixtures -- the Places search does not escape wildcards');
            const hostile = JSON.parse(await evaluate(actorRequestExpr({ kind: 'searchPlaces', text: NONCE, limit: 8 }, 4000)));
            if (hostile.reply?.ok === true || JSON.stringify(hostile).includes(`${NONCE}/`)) {
                failures.push(`a 127.0.0.1 page in a stock tab ran the Places search: ${JSON.stringify(hostile)}`);
            }
        });
    } finally {
        await pages.close();
    }
    return failures;
});
```

- [ ] **Step 5: Write the NG-024 check**

Create `scripts/verify-ng-024-tabs-places-join.mjs`:

```js
#!/usr/bin/env node
// scripts/verify-ng-024-tabs-places-join.mjs
//
// NG-024: a query API joins tabs with history and bookmarks (FEATURES.md
// Area 4: "which open tabs have I never bookmarked", "which bookmarks are
// open right now", ranked by frecency). Live, chrome-side (live-main). Two
// open stock tabs, A bookmarked and B not. The join must answer through the
// actor message sent from the Theia frame, the DI-bound ChromeStoreClient and
// the endpoint's tabs_with_places tool; the bookmarked filter must split A
// from B; rows come ranked by frecency; a 127.0.0.1 page in the selected
// stock tab gets no rows.

import { actorRequest, actorRequestExpr, callTool, diCall, runCheck, seedPlaces, servePages, shellContext, storeAccess, until, waitTheiaReady, withProfile } from './lib/ng-b-live.mjs';

const NAME = 'ng-024-tabs-places-join';
const NONCE = `ng024${Date.now().toString(36)}`;

runCheck(NAME, async () => {
    const failures = [];
    const pages = await servePages({ '/a': { title: `A ${NONCE}` }, '/b': { title: `B ${NONCE}` } });
    const aUrl = pages.url('/a');
    const bUrl = pages.url('/b');
    const has = (rows, url) => Array.isArray(rows) && rows.some(r => r.url === url);
    try {
        await withProfile(aUrl, async ({ evaluate, evaluateIn, send, topLevelContexts, profileDir }) => {
            const shell = await shellContext(topLevelContexts, pages.origin);
            await waitTheiaReady(evaluateIn, shell);
            await actorRequest(evaluateIn, shell, { kind: 'openStockTab', url: bUrl });
            await seedPlaces(send, { bookmarks: [{ url: aUrl, title: `Bookmarked A ${NONCE}` }] });
            const query = args => actorRequest(evaluateIn, shell, { kind: 'queryTabsWithPlaces', ...args });

            const all = await until(async () => {
                const r = await query({});
                const rows = r.reply?.rows;
                const a = has(rows, aUrl) && rows.find(x => x.url === aUrl);
                return a && a.visited && has(rows, bUrl) ? r : undefined;
            }, 30000);
            if (!all) {
                failures.push(`queryTabsWithPlaces from the Theia frame never joined both open tabs: ${JSON.stringify(await query({}))}`);
            } else {
                const rows = all.reply.rows;
                const a = rows.find(r => r.url === aUrl);
                const b = rows.find(r => r.url === bUrl);
                if (!a.bookmark_guid || a.bookmark_title !== `Bookmarked A ${NONCE}`) failures.push(`the bookmarked tab lost its bookmark in the join: ${JSON.stringify(a)}`);
                if (b.bookmark_guid !== null) failures.push(`the unbookmarked tab carries a bookmark: ${JSON.stringify(b)}`);
                if (a.open !== true || b.open !== true) failures.push(`an open tab is not marked open: ${JSON.stringify([a, b])}`);
                if (typeof a.uri !== 'string' || !a.uri) failures.push(`a joined row has no tab key: ${JSON.stringify(a)}`);
                const rank = rows.map(r => (r.frecency === null ? -Infinity : r.frecency));
                if (rank.some((v, i) => i > 0 && v > rank[i - 1])) failures.push(`rows are not ranked by frecency: ${JSON.stringify(rank)}`);
            }
            const marked = await query({ bookmarked: true });
            if (!has(marked.reply?.rows, aUrl) || has(marked.reply?.rows, bUrl)) failures.push(`bookmarked:true answered ${JSON.stringify(marked)}`);
            const unmarked = await query({ bookmarked: false });
            if (!has(unmarked.reply?.rows, bUrl) || has(unmarked.reply?.rows, aUrl)) failures.push(`bookmarked:false answered ${JSON.stringify(unmarked)}`);

            const viaReader = await diCall(evaluateIn, shell, 'ChromeStoreClient', 'queryTabsWithPlaces', [{ bookmarked: true }]);
            if (!has(viaReader.value, aUrl) || has(viaReader.value, bUrl)) failures.push(`ChromeStoreClient.queryTabsWithPlaces answered ${JSON.stringify(viaReader)}`);
            const access = await storeAccess(profileDir);
            if (!access) {
                failures.push('store-access.json never appeared in the profile -- the endpoint is not running');
            } else {
                const tool = await callTool(access, 'tabs_with_places', { bookmarked: false });
                if (!tool.ok || !has(tool.value?.rows, bUrl) || has(tool.value?.rows, aUrl)) failures.push(`tool tabs_with_places answered ${JSON.stringify(tool)}`);
            }
            const hostile = JSON.parse(await evaluate(actorRequestExpr({ kind: 'queryTabsWithPlaces' }, 4000)));
            if (hostile.reply?.ok === true || Array.isArray(hostile.reply?.rows)) {
                failures.push(`a 127.0.0.1 page in a stock tab ran the join: ${JSON.stringify(hostile)}`);
            }
        });
    } finally {
        await pages.close();
    }
    return failures;
});
```

- [ ] **Step 6: Write the NG-025 check**

Create `scripts/verify-ng-025-store-read-endpoint.mjs`:

```js
#!/usr/bin/env node
// scripts/verify-ng-025-store-read-endpoint.mjs
//
// NG-025: users and MCP clients run read-only SQL against tabs.sqlite through
// a documented, token-gated endpoint. Theia-side (live-clone).
// Static half: the tool list is derived from TAB_STORE_TOOL_NAMES and must
// equal tools/list and be documented in docs/tab-store-access.md.
// Live half, against the running browser: the 0600 access file; a SELECT
// returning the open tab's row; refusal of every statement that writes,
// attaches, vacuums, sets a pragma or loads an extension, with the row count
// unchanged; the token, Origin and Host walls; a 127.0.0.1 page on a second
// port in the selected stock tab, holding the real token, reading nothing;
// and a runaway query stopped at the time limit while the endpoint and the
// Theia backend RPC keep answering.

import { existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { callTool, diCall, hostileFetchExpr, mcp, post, runCheck, servePages, shellContext, storeAccess, until, waitTheiaReady, withProfile } from './lib/ng-b-live.mjs';

const NAME = 'ng-025-store-read-endpoint';
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROTOCOL_REL = 'theia/extensions/tab-uris/src/browser/tab-store-access-protocol.ts';
const DOC_REL = 'docs/tab-store-access.md';
const NONCE = `ng025${Date.now().toString(36)}`;

function read(rel) {
    try {
        return readFileSync(join(REPO_ROOT, rel), 'utf8');
    } catch {
        return '';
    }
}

function staticHalf(failures) {
    const protocol = read(PROTOCOL_REL);
    if (!protocol) failures.push(`${PROTOCOL_REL} is missing -- the endpoint has no protocol`);
    const block = /TAB_STORE_TOOL_NAMES\s*=\s*\[([^\]]*)\]/.exec(protocol);
    const tools = block ? [...block[1].matchAll(/'([a-z_]+)'/g)].map(m => m[1]) : [];
    if (protocol && tools.length === 0) failures.push(`${PROTOCOL_REL}: derived ZERO tool names from TAB_STORE_TOOL_NAMES`);
    const doc = read(DOC_REL);
    if (!doc) failures.push(`${DOC_REL} is missing -- the endpoint is undocumented`);
    for (const tool of tools) {
        if (doc && !doc.includes('`' + tool + '`')) failures.push(`${DOC_REL} does not document the ${tool} tool`);
    }
    for (const phrase of ['store-access.json', 'Authorization: Bearer', 'Origin']) {
        if (doc && !doc.includes(phrase)) failures.push(`${DOC_REL} does not explain ${phrase}`);
    }
    return tools;
}

runCheck(NAME, async () => {
    const failures = [];
    const tools = staticHalf(failures);
    const pages = await servePages({ '/page': { title: `Endpoint ${NONCE}` } });
    const pageUrl = pages.url('/page');
    try {
        await withProfile(pageUrl, async ({ evaluate, evaluateIn, send, topLevelContexts, profileDir }) => {
            const shell = await shellContext(topLevelContexts, pages.origin);
            await waitTheiaReady(evaluateIn, shell);
            const access = await storeAccess(profileDir);
            if (!access) {
                failures.push('store-access.json never appeared in the profile -- the endpoint is not running');
                return;
            }
            if (access.mode & 0o077) failures.push(`store-access.json is open to other users (mode ${access.mode.toString(8)})`);
            if (!/^http:\/\/127\.0\.0\.1:\d+\/mcp$/.test(access.url)) failures.push(`the endpoint URL is not a 127.0.0.1 /mcp address: ${access.url}`);

            const listed = await mcp(access, 'tools/list', {});
            const names = ((listed.json && listed.json.result && listed.json.result.tools) || []).map(t => t.name).sort();
            if (JSON.stringify(names) !== JSON.stringify([...tools].sort())) failures.push(`tools/list answered [${names}] but TAB_STORE_TOOL_NAMES is [${tools}]`);

            const select = () => callTool(access, 'tabs_sql', { sql: 'SELECT uri, url, title FROM tabs WHERE url = ?', params: [pageUrl] });
            const found = await until(async () => {
                const r = await select();
                return r.ok && r.value.rows.some(row => row.title === `Endpoint ${NONCE}`) ? r : undefined;
            }, 30000);
            if (!found) failures.push(`tabs_sql never returned the open tab's row: ${JSON.stringify(await select())}`);

            const count = async () => {
                const r = await callTool(access, 'tabs_sql', { sql: 'SELECT count(*) AS n FROM tabs' });
                return r.ok ? r.value.rows[0].n : `error: ${r.error}`;
            };
            const before = await count();
            const copy = join(tmpdir(), `${NONCE}-copy.sqlite`);
            const places = join(dirname(access.file), 'places.sqlite');
            for (const sql of [
                'DELETE FROM tabs',
                "UPDATE tabs SET title = 'x'",
                `ATTACH DATABASE '${places}' AS p`,
                'SELECT 1; DELETE FROM tabs',
                `VACUUM INTO '${copy}'`,
                'PRAGMA query_only = 0',
                "SELECT load_extension('x')",
            ]) {
                const r = await callTool(access, 'tabs_sql', { sql });
                if (r.ok) failures.push(`tabs_sql accepted a statement that is not a plain read: ${sql}`);
            }
            if (existsSync(copy)) failures.push('VACUUM INTO wrote a copy of the store');
            const after = await count();
            if (after !== before) failures.push(`the tab count went from ${before} to ${after} across refused statements`);

            // The walls, before the runaway query so a busy worker cannot mask them.
            const probe = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} });
            const json = { 'Content-Type': 'application/json' };
            const bearer = { Authorization: `Bearer ${access.token}` };
            const port = new URL(access.url).port;
            for (const [label, headers, want] of [
                ['no token', { ...json, Authorization: '' }, 401],
                ['a wrong token', { ...json, Authorization: `Bearer ${'0'.repeat(64)}` }, 401],
                ['a browser Origin with the right token', { ...json, ...bearer, Origin: pages.origin }, 403],
                ['a rebinding Host with the right token', { ...json, ...bearer, Host: `attacker.example:${port}` }, 403],
            ]) {
                const r = await post(access.url, headers, probe);
                if (r.status !== want) failures.push(`${label}: HTTP ${r.status}, expected ${want}`);
            }
            const hostile = JSON.parse(await evaluate(hostileFetchExpr(access.url, access.token,
                { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'tabs_sql', arguments: { sql: 'SELECT url, title FROM tabs' } } })));
            if (JSON.stringify(hostile).includes(NONCE) || hostile.some(r => r.status === 200 && r.type !== 'opaque')) {
                failures.push(`a 127.0.0.1 page in a stock tab read the store through the endpoint: ${JSON.stringify(hostile)}`);
            }

            // A runaway query: stopped at the limit; the endpoint and the Theia RPC keep answering.
            const started = Date.now();
            const slow = await callTool(access, 'tabs_sql', { sql: 'WITH t(x) AS (VALUES (1),(2),(3),(4),(5),(6),(7),(8),(9),(10)) SELECT count(*) AS n FROM t a, t b, t c, t d, t e, t f, t g, t h, t i' });
            const took = Date.now() - started;
            if (slow.ok || took > 15000) failures.push(`a runaway query was not stopped at the time limit (ok=${slow.ok}, ${took} ms)`);
            const t1 = Date.now();
            const alive = await mcp(access, 'tools/list', {});
            if (alive.status !== 200 || Date.now() - t1 > 3000) failures.push('the endpoint stopped answering after a runaway query');
            const t2 = Date.now();
            const rpc = await diCall(evaluateIn, shell, 'GroupQueryService', 'listGroups');
            if (rpc.error || Date.now() - t2 > 3000) failures.push(`the Theia backend RPC stalled behind a runaway query: ${JSON.stringify(rpc)}`);
        });
    } finally {
        await pages.close();
    }
    return failures;
});
```

- [ ] **Step 7: Write the NG-026 check**

Create `scripts/verify-ng-026-store-write-endpoint.mjs`:

```js
#!/usr/bin/env node
// scripts/verify-ng-026-store-write-endpoint.mjs
//
// NG-026: users and MCP clients change tab and group data through a
// documented write path that goes through the single chrome-side writer.
// live-main: the endpoint relays each op through a connected Theia window to
// the actor, where chrome's writer applies it; setSetting (decisions.md R18)
// is a chrome-side store kind. Static half: the ops are derived from
// TAB_STORE_WRITE_FIELDS and must be documented, and the setting keys the
// writer validates (STORE_SETTING_RULES) must equal the keys docs/TAB-STORE.md
// documents. Live half: createGroup, renameGroup, moveGroup, setTabGroup,
// setSetting and dissolveGroup land, each read back through Theia's own
// reader (GroupQueryService, never the endpoint); an op outside the list, the
// tab-closing op, an unknown tab, an unknown setting and an invalid setting
// value are refused; the token and Origin walls refuse writes; and a
// 127.0.0.1 page on a second port in the selected stock tab, holding the real
// token, cannot create a group.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { callTool, diCall, hostileFetchExpr, post, runCheck, servePages, shellContext, storeAccess, until, waitTheiaReady, withProfile } from './lib/ng-b-live.mjs';

const NAME = 'ng-026-store-write-endpoint';
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROTOCOL_REL = 'theia/extensions/tab-uris/src/browser/tab-store-access-protocol.ts';
const DOC_REL = 'docs/tab-store-access.md';
const STORE_DOC_REL = 'docs/TAB-STORE.md';
const API_REL = 'powerbrowser/shell/PowerBrowserAPI.sys.mjs';
const NONCE = `ng026${Date.now().toString(36)}`;

function read(rel) {
    try {
        return readFileSync(join(REPO_ROOT, rel), 'utf8');
    } catch {
        return '';
    }
}

function staticHalf(failures) {
    const block = /TAB_STORE_WRITE_FIELDS[^=]*=\s*\{([^}]*)\}/.exec(read(PROTOCOL_REL));
    const ops = block ? [...block[1].matchAll(/(\w+)\s*:\s*\[/g)].map(m => m[1]) : [];
    if (ops.length === 0) failures.push(`${PROTOCOL_REL}: derived ZERO write ops from TAB_STORE_WRITE_FIELDS`);
    const doc = read(DOC_REL);
    if (!doc.includes('`tab_store_write`')) failures.push(`${DOC_REL} does not document the tab_store_write tool`);
    for (const op of ops) {
        if (!doc.includes('`' + op + '`')) failures.push(`${DOC_REL} does not document the ${op} op`);
    }
    // R18: the writer validates exactly the settings docs/TAB-STORE.md documents.
    const settingsSection = (/^## Settings\n([\s\S]*?)(?=^## )/m.exec(read(STORE_DOC_REL)) || [])[1] || '';
    const documented = [...settingsSection.matchAll(/^\| `([a-z_]+)` \|/gm)].map(m => m[1]).sort();
    const rulesBlock = /STORE_SETTING_RULES = \{([\s\S]*?)\n\};/.exec(read(API_REL));
    const validated = rulesBlock ? [...rulesBlock[1].matchAll(/^ {2}([a-z_]+): \{/gm)].map(m => m[1]).sort() : [];
    if (documented.length === 0) failures.push(`${STORE_DOC_REL}: derived ZERO settings keys from its "## Settings" table`);
    if (JSON.stringify(documented) !== JSON.stringify(validated)) {
        failures.push(`the settings writer validates [${validated}] but ${STORE_DOC_REL} documents [${documented}]`);
    }
}

runCheck(NAME, async () => {
    const failures = [];
    staticHalf(failures);
    const pages = await servePages({ '/page': { title: `Write ${NONCE}` } });
    const pageUrl = pages.url('/page');
    const groupId = `ng026-${NONCE}`;
    try {
        await withProfile(pageUrl, async ({ evaluate, evaluateIn, send, topLevelContexts, profileDir }) => {
            const shell = await shellContext(topLevelContexts, pages.origin);
            await waitTheiaReady(evaluateIn, shell);
            const access = await storeAccess(profileDir);
            if (!access) {
                failures.push('store-access.json never appeared in the profile -- the endpoint is not running');
                return;
            }
            const groups = async () => (await diCall(evaluateIn, shell, 'GroupQueryService', 'listGroups')).value || [];
            const group = async id => (await groups()).find(g => g.id === id);
            const members = async id => (await diCall(evaluateIn, shell, 'GroupQueryService', 'getGroupTabs', [id])).value || [];
            const write = args => callTool(access, 'tab_store_write', args);
            const tabUri = await until(async () => {
                const r = await diCall(evaluateIn, shell, 'GroupQueryService', 'listUngroupedTabs');
                const row = (r.value || []).find(t => t.url === pageUrl);
                return row && row.uri;
            }, 30000);
            if (!tabUri) {
                failures.push(`the open tab ${pageUrl} never appeared in Theia's own reader`);
                return;
            }

            let r = await write({ op: 'createGroup', id: groupId, title: `Probe ${NONCE}` });
            let g = await group(groupId);
            if (!r.ok || !g || g.title !== `Probe ${NONCE}`) failures.push(`createGroup: ${JSON.stringify(r)} then ${JSON.stringify(g)}`);
            r = await write({ op: 'renameGroup', id: groupId, title: `Renamed ${NONCE}` });
            g = await group(groupId);
            if (!r.ok || !g || g.title !== `Renamed ${NONCE}`) failures.push(`renameGroup: ${JSON.stringify(r)} then ${JSON.stringify(g)}`);
            r = await write({ op: 'moveGroup', id: groupId, x: 40, y: 60 });
            g = await group(groupId);
            if (!r.ok || !g || g.x !== 40 || g.y !== 60) failures.push(`moveGroup: ${JSON.stringify(r)} then ${JSON.stringify(g)}`);
            r = await write({ op: 'setTabGroup', uri: tabUri, groupId });
            if (!r.ok || !(await members(groupId)).some(t => t.uri === tabUri)) failures.push(`setTabGroup: ${JSON.stringify(r)}`);

            for (const args of [
                { op: 'closeGroup', id: groupId },
                { op: 'captureShellRegion', rect: { x: 0, y: 0, w: 1, h: 1 } },
                { op: 'dropTable' },
                { op: '__proto__' },
                { op: 'setTabGroup', uri: `unknown-${NONCE}`, groupId },
            ]) {
                const refused = await write(args);
                if (refused.ok) failures.push(`tab_store_write accepted ${JSON.stringify(args)}`);
            }
            if (!(await group(groupId))) failures.push('a refused closeGroup still removed the group');
            if (!(await members(groupId)).some(t => t.uri === tabUri)) failures.push('a refused closeGroup still closed the tab');

            // setSetting (R18), read back through wave A's settings reader.
            const settings = async () => (await diCall(evaluateIn, shell, 'GroupQueryService', 'getSettings')).value || {};
            const before = (await settings()).restore_live_minutes;
            const next = before === '6' ? '7' : '6';
            r = await write({ op: 'setSetting', key: 'restore_live_minutes', value: next });
            if (!r.ok || (await settings()).restore_live_minutes !== next) failures.push(`setSetting restore_live_minutes=${next}: ${JSON.stringify(r)}`);
            for (const args of [
                { op: 'setSetting', key: 'restore_live_minutes', value: 'soon' },
                { op: 'setSetting', key: 'restore_behaviour', value: 'everything' },
                { op: 'setSetting', key: `unknown_${NONCE}`, value: '1' },
            ]) {
                const refused = await write(args);
                if (refused.ok) failures.push(`setSetting accepted ${JSON.stringify(args)}`);
            }
            if ((await settings()).restore_live_minutes !== next) failures.push('a refused setSetting still changed restore_live_minutes');
            if (typeof before === 'string') await write({ op: 'setSetting', key: 'restore_live_minutes', value: before });

            const rpc = id => ({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'tab_store_write', arguments: { op: 'createGroup', id, title: 'refused' } } });
            const nodeId = `ng026-node-${NONCE}`;
            for (const [label, headers, want] of [
                ['no token', { 'Content-Type': 'application/json', Authorization: '' }, 401],
                ['a browser Origin with the right token', { 'Content-Type': 'application/json', Authorization: `Bearer ${access.token}`, Origin: pages.origin }, 403],
            ]) {
                const res = await post(access.url, headers, JSON.stringify(rpc(nodeId)));
                if (res.status !== want) failures.push(`${label}: HTTP ${res.status}, expected ${want}`);
            }
            const pageId = `ng026-page-${NONCE}`;
            await evaluate(hostileFetchExpr(access.url, access.token, rpc(pageId)));
            const ids = (await groups()).map(x => x.id);
            for (const id of [nodeId, pageId]) {
                if (ids.includes(id)) failures.push(`a refused request still created group ${id}`);
            }

            r = await write({ op: 'dissolveGroup', id: groupId });
            if (!r.ok || (await group(groupId))) failures.push(`dissolveGroup: ${JSON.stringify(r)}`);
        });
    } finally {
        await pages.close();
    }
    return failures;
});
```

- [ ] **Step 8: Write the NG-027 check**

Create `scripts/verify-ng-027-reader-callers.mjs`:

```js
#!/usr/bin/env node
// scripts/verify-ng-027-reader-callers.mjs
//
// NG-027: every reader in PowerBrowserAPI.sys.mjs and TabQueryService has a
// caller on the runtime path; a reader with no consumer is deleted.
//
// Derive and compare (CLAUDE.md verification rule 2); nothing is hand-kept.
//   PowerBrowserAPI readers: object methods and module-level functions whose
//     names start read/list/get/project/search/query/fetch/find.
//   TabQueryService readers: its public methods, except set* and the
//     constructor.
// A caller is a call site in tracked runtime source -- powerbrowser/shell/
// (*.sys.mjs, *.js) and theia/extensions/*/src/ (*.ts, *.tsx) -- on a line
// that is not a comment and not inside the body of a reader already found
// dead. That rule iterates to a fixpoint, so a reader called only by a dead
// reader is dead too. Call shapes: `PowerBrowserAPI.name(` for object
// methods, a bare `name(` for module functions, and `.name(` not preceded by
// `PowerBrowserAPI` for TabQueryService (reached through JSON-RPC proxies,
// e.g. `this.groups.listGroups(`). scripts/ never counts: a check calling a
// reader is not a consumer.
//
// Honestly --quick: text reads only. --self-test runs the analyzer over a
// synthetic tree: it must find exactly the planted dead readers, then go red
// on a removed call site and on a planted reader, and fail distinctly on an
// empty scan.
// ponytail: braces are counted character by character, so a brace inside a
// string or regex literal can skew a body span; the self-test pins the
// shapes this tree uses.

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const NAME = 'ng-027-reader-callers';
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PBA_REL = 'powerbrowser/shell/PowerBrowserAPI.sys.mjs';
const TQS_REL = 'theia/extensions/tab-uris/src/node/tab-query-service.ts';
const READER = /^(read|list|get|project|search|query|fetch|find)[A-Z]/;

function isRuntime(rel) {
    if (rel.split('/').some(seg => seg === 'lib' || seg === 'node_modules')) return false;
    return (rel.startsWith('powerbrowser/shell/') && /\.(sys\.mjs|js)$/.test(rel))
        || (/^theia\/extensions\/[^/]+\/src\//.test(rel) && /\.tsx?$/.test(rel));
}

function isComment(line) {
    const t = line.trimStart();
    return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*');
}

/** [first, last] 0-based lines of the brace body opened on or after line `start`. */
function bodySpan(lines, start) {
    let depth = 0;
    let opened = false;
    for (let i = start; i < lines.length; i += 1) {
        for (const ch of lines[i]) {
            if (ch === '{') {
                depth += 1;
                opened = true;
            } else if (ch === '}') {
                depth -= 1;
                if (opened && depth === 0) return [start, i];
            }
        }
    }
    return [start, lines.length - 1];
}

function deriveReaders(sources) {
    const readers = [];
    (sources[PBA_REL] ?? '').split('\n').forEach((line, i) => {
        const method = /^ {2}(?:async )?([A-Za-z_$][\w$]*)\([^)]*\)\s*\{\s*$/.exec(line);
        const fn = /^(?:export )?(?:async )?function ([A-Za-z_$][\w$]*)\(/.exec(line);
        if (method && READER.test(method[1])) readers.push({ kind: 'method', name: method[1], file: PBA_REL, line: i });
        if (fn && READER.test(fn[1])) readers.push({ kind: 'function', name: fn[1], file: PBA_REL, line: i });
    });
    const tqs = (sources[TQS_REL] ?? '').split('\n');
    const classAt = tqs.findIndex(l => /^export class TabQueryService\b/.test(l));
    if (classAt >= 0) {
        const [, end] = bodySpan(tqs, classAt);
        for (let i = classAt + 1; i < end; i += 1) {
            // A method may share its line with the end of the previous doc comment ("*/    async getThumbnail(").
            const text = tqs[i].replace(/^\s*\*\/(?=\s)/, '');
            const m = /^ {4}(?:async )?([A-Za-z_$][\w$]*)\([^)]*\)[^;]*\{\s*$/.exec(text);
            if (m && m[1] !== 'constructor' && !m[1].startsWith('set')) readers.push({ kind: 'service', name: m[1], file: TQS_REL, line: i });
        }
    }
    return readers;
}

function callPattern(reader) {
    if (reader.kind === 'method') return new RegExp(`PowerBrowserAPI\\.${reader.name}\\(`);
    if (reader.kind === 'function') return new RegExp(`(?<![\\w$.])${reader.name}\\(`);
    return new RegExp(`(?<!PowerBrowserAPI)\\.${reader.name}\\(`);
}

/** Readers, and the dead ones (null when no reader derived at all). */
export function analyze(sources) {
    const readers = deriveReaders(sources);
    if (readers.length === 0) return { readers, dead: null };
    const split = Object.fromEntries(Object.entries(sources).map(([file, text]) => [file, text.split('\n')]));
    let dead = [];
    for (;;) {
        const deadSpans = dead.map(r => ({ file: r.file, span: bodySpan(split[r.file], r.line) }));
        const next = readers.filter(reader => {
            const pattern = callPattern(reader);
            for (const [file, lines] of Object.entries(split)) {
                for (let i = 0; i < lines.length; i += 1) {
                    if (file === reader.file && i === reader.line) continue;
                    if (isComment(lines[i])) continue;
                    if (deadSpans.some(d => d.file === file && i >= d.span[0] && i <= d.span[1])) continue;
                    if (pattern.test(lines[i])) return false;
                }
            }
            return true;
        });
        if (next.length === dead.length) return { readers, dead: next };
        dead = next;
    }
}

function filterSources(all) {
    return Object.fromEntries(Object.entries(all).filter(([rel]) => rel === PBA_REL || rel === TQS_REL || isRuntime(rel)));
}

function trackedSources() {
    const out = spawnSync('git', ['-C', REPO_ROOT, 'ls-files', '-z'], { encoding: 'utf8' });
    if (out.status !== 0) throw new Error('git ls-files failed -- cannot derive the tracked set');
    const all = {};
    for (const rel of out.stdout.split('\0').filter(Boolean)) {
        if (rel === PBA_REL || rel === TQS_REL || isRuntime(rel)) all[rel] = readFileSync(join(REPO_ROOT, rel), 'utf8');
    }
    return all;
}

function failuresOf(result) {
    if (result.dead === null) return [`derived ZERO readers from ${PBA_REL} and ${TQS_REL} -- the derivation is broken, so a clean result would prove nothing`];
    return result.dead.map(r => `${r.file}:${r.line + 1} ${r.name} -- no caller on the runtime path (give it a consumer or delete it)`);
}

const FIXTURE = {
    [PBA_REL]: [
        'export const PowerBrowserAPI = Object.freeze({',
        '  readUsed() {',
        '    return 1;',
        '  },',
        '  readOnlyByDead() {',
        '    return 2;',
        '  },',
        '  listDead() {',
        '    return PowerBrowserAPI.readOnlyByDead();',
        '  },',
        '});',
        'function searchUsed() {',
        '  return 3;',
        '}',
        'export function run() {',
        '  // PowerBrowserAPI.listDead() in a comment is not a caller',
        '  return PowerBrowserAPI.readUsed() + searchUsed();',
        '}',
    ].join('\n'),
    [TQS_REL]: [
        'export class TabQueryService {',
        '    getUsed(): number {',
        '        return 1;',
        '    }',
        '    getUnused(): number {',
        '        return 2;',
        '    }',
        '    setProfileDir(dir: string): void {',
        '        void dir;',
        '    }',
        '}',
    ].join('\n'),
    'theia/extensions/modes/src/browser/caller.ts': 'export const use = (svc: { getUsed(): number }) => svc.getUsed();',
    'scripts/verify-something.mjs': 'svc.getUnused();',
};

function names(result) {
    return result.dead === null ? null : result.dead.map(r => r.name).sort();
}

function selfTest() {
    const problems = [];
    const control = names(analyze(filterSources(FIXTURE)));
    if (JSON.stringify(control) !== JSON.stringify(['getUnused', 'listDead', 'readOnlyByDead'])) {
        problems.push(`control: expected exactly [getUnused, listDead, readOnlyByDead] dead, got ${JSON.stringify(control)}`);
    }
    const noCaller = { ...FIXTURE, 'theia/extensions/modes/src/browser/caller.ts': 'export const use = 1;' };
    if (!(names(analyze(filterSources(noCaller))) ?? []).includes('getUsed')) problems.push('removing the only call site of getUsed did not turn it red');
    const planted = { ...FIXTURE, [PBA_REL]: FIXTURE[PBA_REL].replace('Object.freeze({', 'Object.freeze({\n  readPlanted() {\n    return 0;\n  },') };
    if (planted[PBA_REL] === FIXTURE[PBA_REL]) problems.push('the planted reader did not land');
    if (!(names(analyze(filterSources(planted))) ?? []).includes('readPlanted')) problems.push('a planted uncalled reader stayed green');
    if (failuresOf(analyze({})).length !== 1 || !failuresOf(analyze({}))[0].includes('derived ZERO')) problems.push('an empty scan did not fail distinctly');
    if (problems.length) {
        console.error(`${NAME} --self-test: FAIL`);
        for (const p of problems) console.error(`  - ${p}`);
        return 1;
    }
    console.log(`${NAME} --self-test: PASS -- control found exactly the planted dead readers; a removed call site, a planted reader and an empty scan each went red`);
    return 0;
}

function main() {
    if (process.argv.includes('--self-test')) return selfTest();
    const result = analyze(trackedSources());
    const failures = failuresOf(result);
    if (failures.length) {
        console.error(`${NAME}: FAIL`);
        for (const f of failures) console.error(`  - ${f}`);
        return 1;
    }
    console.log(`${NAME}: PASS -- ${result.readers.length} readers, every one called on the runtime path`);
    return 0;
}

process.exit(main());
```

- [ ] **Step 9: Write the NG-028 check**

Create `scripts/verify-ng-028-saved-page.mjs`:

```js
#!/usr/bin/env node
// scripts/verify-ng-028-saved-page.mjs
//
// NG-028: a tab can store a full saved copy of its page
// (notes/tab-sql-substrate.md, "optional full saved-page capture"). Live,
// chrome-side (live-main). Driven through the Theia command registry:
// powerbrowser.tab.savePageCopy on the open stock tab's registry URI. The copy
// must hold the page's text and the image it loaded, sit under
// <profile>/saved-pages/, and have one saved_pages row. A second save replaces
// the first copy (old directory gone, still one row); a save for a tab that
// does not exist answers without hanging; a 127.0.0.1 page in the selected
// stock tab cannot trigger a save. The row is read from a stage copy of
// tabs.sqlite in a mkdtemp directory, never from the profile file.

import { copyFileSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { GET_BY_NAME, actorRequestExpr, diCall, runCheck, servePages, shellContext, until, waitTheiaReady, withProfile } from './lib/ng-b-live.mjs';

const NAME = 'ng-028-saved-page-copy';
const NONCE = `ng028${Date.now().toString(36)}`;
const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

function savedRows(profile, tabUri) {
    const stage = mkdtempSync(join(tmpdir(), 'ng028-stage-'));
    try {
        for (const suffix of ['', '-wal']) {
            const from = join(profile, `tabs.sqlite${suffix}`);
            if (existsSync(from)) copyFileSync(from, join(stage, `tabs.sqlite${suffix}`));
        }
        const db = new DatabaseSync(join(stage, 'tabs.sqlite'));
        try {
            return db.prepare('SELECT tab_uri, dir, url, title, saved_at, bytes FROM saved_pages WHERE tab_uri = ?').all(tabUri);
        } finally {
            db.close();
        }
    } finally {
        rmSync(stage, { recursive: true, force: true });
    }
}

runCheck(NAME, async () => {
    const failures = [];
    const pages = await servePages({
        '/page': { title: `Saved ${NONCE}`, body: `<p>Marker ${NONCE}</p><img src="/pixel.png" alt="">` },
        '/pixel.png': { type: 'image/png', bytes: PIXEL },
    });
    const pageUrl = pages.url('/page');
    try {
        await withProfile(pageUrl, async ({ evaluate, evaluateIn, send, topLevelContexts, profileDir }) => {
            const shell = await shellContext(topLevelContexts, pages.origin);
            await waitTheiaReady(evaluateIn, shell);
            const tabUri = await until(async () => {
                const r = await diCall(evaluateIn, shell, 'GroupQueryService', 'listUngroupedTabs');
                const row = (r.value || []).find(t => t.url === pageUrl);
                return row && row.uri;
            }, 30000);
            if (!tabUri) {
                failures.push(`the open tab ${pageUrl} never appeared in Theia's own reader`);
                return;
            }
            const save = async uri => JSON.parse(await evaluateIn(shell, `(async () => { ${GET_BY_NAME}
                try {
                    const result = await __getByName(window.theia.container, 'CommandRegistry').executeCommand('powerbrowser.tab.savePageCopy', ${JSON.stringify(uri)});
                    return JSON.stringify({ value: result });
                } catch (e) {
                    return JSON.stringify({ error: String((e && e.message) || e) });
                }
            })()`));
            const profile = profileDir;
            const first = await save(tabUri);
            const dir = first.value && first.value.dir;
            if (!dir) {
                failures.push(`Save Page Copy did not report a saved copy: ${JSON.stringify(first)}`);
            } else {
                if (!dir.startsWith(join(profile, 'saved-pages') + '/')) failures.push(`the copy is outside <profile>/saved-pages: ${dir}`);
                const html = existsSync(join(dir, 'page.html')) ? readFileSync(join(dir, 'page.html'), 'utf8') : '';
                if (!html.includes(`Marker ${NONCE}`)) failures.push(`page.html does not hold the page text (${html.length} chars)`);
                const filesDir = join(dir, 'page_files');
                const files = existsSync(filesDir) ? readdirSync(filesDir) : [];
                if (!files.some(f => readFileSync(join(filesDir, f)).equals(PIXEL))) failures.push(`page_files does not hold the image the page loaded: ${JSON.stringify(files)}`);
                let rows = [];
                try {
                    rows = savedRows(profile, tabUri);
                } catch (e) {
                    failures.push(`saved_pages could not be read: ${e.message}`);
                }
                if (rows.length !== 1 || rows[0].dir !== dir || rows[0].url !== pageUrl || !(rows[0].bytes > 0)) failures.push(`saved_pages rows for the tab: ${JSON.stringify(rows)}`);
                const second = await save(tabUri);
                const again = second.value && second.value.dir;
                if (!again || again === dir || existsSync(dir)) failures.push(`a second save did not replace the first copy (first ${dir}, second ${again}, first still on disk: ${existsSync(dir)})`);
                let after = [];
                try {
                    after = savedRows(profile, tabUri);
                } catch (e) {
                    failures.push(`saved_pages could not be read: ${e.message}`);
                }
                if (after.length !== 1 || after[0].dir !== again) failures.push(`after a second save, saved_pages holds ${JSON.stringify(after)}`);
            }
            const started = Date.now();
            const missing = await save(`unknown-${NONCE}`);
            if ((missing.value && missing.value.dir) || Date.now() - started > 30000) failures.push(`a save for a tab that does not exist answered ${JSON.stringify(missing)} after ${Date.now() - started} ms`);
            const hostile = JSON.parse(await evaluate(actorRequestExpr({ kind: 'savePageCopy', uri: tabUri }, 4000)));
            if (hostile.reply?.ok === true) failures.push(`a 127.0.0.1 page in a stock tab triggered a save: ${JSON.stringify(hostile)}`);
        });
    } finally {
        await pages.close();
    }
    return failures;
});
```

- [ ] **Step 10: Register the checks in `scripts/verify-platform.sh`**

Edit, quick block. Old:

```bash
    "backend-env-readers-self-test|node $REPO_ROOT/scripts/verify-backend-env-readers.mjs --self-test"
```

New:

```bash
    "backend-env-readers-self-test|node $REPO_ROOT/scripts/verify-backend-env-readers.mjs --self-test"
    # NEW (non-GUI wave B, NG-027): every PowerBrowserAPI and TabQueryService
    # reader has a caller on the runtime path. Readers and call sites are
    # derived from the tree at check time; a reader called only by a dead
    # reader is dead too. Honestly --quick: text reads only. The self-test runs
    # the analyzer over a synthetic tree and requires red on a removed call
    # site, a planted reader and an empty scan.
    "ng-027-reader-callers|node $REPO_ROOT/scripts/verify-ng-027-reader-callers.mjs"
    "ng-027-reader-callers-self-test|node $REPO_ROOT/scripts/verify-ng-027-reader-callers.mjs --self-test"
```

Edit, full block. Old:

```bash
      "gui07-mode-switch-tabs-live-self-test|node $REPO_ROOT/scripts/verify-mode-switch-tabs-live.mjs --self-test"
```

New:

```bash
      "gui07-mode-switch-tabs-live-self-test|node $REPO_ROOT/scripts/verify-mode-switch-tabs-live.mjs --self-test"
      # NEW (non-GUI wave B, NG-021..NG-026, NG-028): live checks. Each launches
      # the built binary through firefox-bidi.mjs, serves its own pages on a
      # second loopback port, and drives its row through a real entry point (an
      # actor message from the Theia frame, a DI-bound service, a registered
      # command, or the documented endpoint), plus the hostile-page wall. They
      # need the built binary and the last Theia build, so none is --quick.
      "ng-021-places-reads-via-actor|node $REPO_ROOT/scripts/verify-ng-021-places-reads.mjs"
      "ng-022-sessionstore-projection-via-actor|node $REPO_ROOT/scripts/verify-ng-022-sessionstore-projection.mjs"
      "ng-023-suggestions-history-bookmarks|node $REPO_ROOT/scripts/verify-ng-023-suggestions-places.mjs"
      "ng-024-tabs-places-join|node $REPO_ROOT/scripts/verify-ng-024-tabs-places-join.mjs"
      "ng-025-store-read-endpoint|node $REPO_ROOT/scripts/verify-ng-025-store-read-endpoint.mjs"
      "ng-026-store-write-endpoint|node $REPO_ROOT/scripts/verify-ng-026-store-write-endpoint.mjs"
      "ng-028-saved-page-copy|node $REPO_ROOT/scripts/verify-ng-028-saved-page.mjs"
```

- [ ] **Step 11: Write the checks list**

```bash
cd ~/coding/Power-Browser-ng-b
row() { printf '%s\t%s\t%s\n' "$1" "scripts/$2::$3" "node scripts/$2 # $4"; }
{
  row NG-021 verify-ng-021-places-reads.mjs ng-021-places-reads-via-actor live-main
  row NG-022 verify-ng-022-sessionstore-projection.mjs ng-022-sessionstore-projection-via-actor live-main
  row NG-023 verify-ng-023-suggestions-places.mjs ng-023-suggestions-history-bookmarks live-main
  row NG-024 verify-ng-024-tabs-places-join.mjs ng-024-tabs-places-join live-main
  row NG-025 verify-ng-025-store-read-endpoint.mjs ng-025-store-read-endpoint live-clone
  row NG-026 verify-ng-026-store-write-endpoint.mjs ng-026-store-write-endpoint live-main
  row NG-027 verify-ng-027-reader-callers.mjs ng-027-reader-callers quick
  row NG-028 verify-ng-028-saved-page.mjs ng-028-saved-page-copy live-main
} > docs/non-gui/checks-wave-b.tsv
awk -F'\t' 'NF != 3 || $2 !~ /^scripts\/verify-ng-[0-9]{3}-[a-z0-9-]+\.mjs::/ || index($3, substr($2, 1, index($2, "::") - 1)) == 0 { print "bad line " NR; exit 1 }' docs/non-gui/checks-wave-b.tsv && wc -l < docs/non-gui/checks-wave-b.tsv
```

Expected: `8`. Per R1 (decisions.md) each line has exactly three tab-separated fields: the row ID; the test ref `scripts/verify-ng-NNN-<slug>.mjs::<label>`, where the label is the one registered in `verify-platform.sh`; and a command that contains that same file path. Each check file is that row's alone, so `lock-checks` digests one file per row. The trailing `# live-main` / `# live-clone` / `# quick` is a shell comment, so `bash -c "$cmd"` and `record-fail --cmd` run only the check. Live commands get `PB_FIREFOX_BIN` and `PB_BACKEND_MAIN` from the runner (G4).

- [ ] **Step 12: Run every check and confirm each fails for the stated reason**

```bash
cd ~/coding/Power-Browser-ng-b
node --check scripts/lib/ng-b-live.mjs && for f in scripts/verify-ng-02*.mjs; do node --check "$f" || echo "SYNTAX $f"; done
scripts/verify-platform.sh --only ng-027-reader-callers; echo "exit $?"
scripts/verify-platform.sh --only ng-027-reader-callers-self-test; echo "exit $?"
export PB_FIREFOX_BIN=$HOME/coding/Power-Browser/objdir/dist/bin/powerbrowser
export PB_BACKEND_MAIN=$PWD/theia/applications/browser/lib/backend/main.js
for label in ng-021-places-reads-via-actor ng-022-sessionstore-projection-via-actor ng-023-suggestions-history-bookmarks ng-024-tabs-places-join ng-025-store-read-endpoint ng-026-store-write-endpoint ng-028-saved-page-copy; do
  flock ~/coding/Power-Browser/.git/pb-live.lock scripts/verify-platform.sh --only "$label" 2>&1 | grep -E '^ng-0|^  - ' | head -4
done
```

Expected: no `SYNTAX` line. `ng-027-reader-callers` exits 1 and names at least `readHistoryEntry`, `readBookmarkByUrl`, `listBookmarkFolder`, `projectSessionStoreTabs`, `readTabRow`, `listTabRows`, `listGroupRows`, `getGroupTabs`, `getByUri`, `getBrowserTabByUrl`, `listByRecency` and `getThumbnail`. `ng-027-reader-callers-self-test` exits 0. Each live check prints `FAIL`, for these reasons:
- NG-021: `actor readHistoryEntry … "handleGroupMutation: unknown kind readHistoryEntry"`, `DI binding not found for identifier name: ChromeStoreClient`, `store-access.json never appeared`.
- NG-022: `… unknown kind projectSessionStoreTabs`.
- NG-023: `the suggestions for the typed text lack https://example.invalid/…/history-only` and `…/bookmarked`.
- NG-024: `… unknown kind queryTabsWithPlaces`.
- NG-025: `…tab-store-access-protocol.ts is missing`, `docs/tab-store-access.md is missing`, `store-access.json never appeared`.
- NG-026: `derived ZERO write ops`, `the settings writer validates [] but docs/TAB-STORE.md documents […]` (`derived ZERO settings keys` before wave A's `docs/TAB-STORE.md` exists), `store-access.json never appeared`.
- NG-028: `Save Page Copy did not report a saved copy: {"error":"… powerbrowser.tab.savePageCopy …"}`.

A check that passes here means the behaviour already exists (report it with the output) or the check is too weak (fix the check).

- [ ] **Step 13: Commit gate, brand scan, commit**

```bash
cd ~/coding/Power-Browser-ng-b
git add scripts/lib/ng-b-live.mjs scripts/verify-ng-021-places-reads.mjs scripts/verify-ng-022-sessionstore-projection.mjs \
  scripts/verify-ng-023-suggestions-places.mjs scripts/verify-ng-024-tabs-places-join.mjs scripts/verify-ng-025-store-read-endpoint.mjs \
  scripts/verify-ng-026-store-write-endpoint.mjs scripts/verify-ng-027-reader-callers.mjs scripts/verify-ng-028-saved-page.mjs \
  scripts/verify-platform.sh docs/non-gui/checks-wave-b.tsv
node scripts/scan-brand-residue.mjs
scripts/verify-platform.sh --only sql-store-second-writer
scripts/verify-platform.sh --quick 2>&1 | sed -n '/^verify-platform: summary/,$p' | grep ': FAIL$' | awk '{print $1}' | sed 's/:$//' | sort | comm -13 docs/non-gui/quick-baseline.txt -
git commit -m "test(ng-b): failing checks for NG-021..NG-028" -m "Refs: NG-021, NG-022, NG-023, NG-024, NG-025, NG-026, NG-027, NG-028"
```

Expected: the brand scan exits 0. `sql-store-second-writer` passes: NG-028's `new DatabaseSync(` sits in a file that carries `mkdtempSync`. The gate prints only `ng-027-reader-callers`.

---

### Task 2: Token-gated read-only SQL endpoint (NG-025)

**Needs:** wave-a (NG-001–NG-005 merged; the docs name the columns in A1, and the SQL path uses A12)

**Rows:** NG-025

**Files:**
- Create: `theia/extensions/tab-uris/src/browser/tab-store-access-protocol.ts`
- Create: `theia/extensions/tab-uris/src/node/tab-store-sql.ts`
- Create: `theia/extensions/tab-uris/src/node/tab-store-access-endpoint.ts`
- Create: `theia/extensions/tab-uris/src/node/tab-store-access-backend-module.ts`
- Create: `docs/tab-store-access.md`
- Modify: `theia/extensions/tab-uris/package.json` (one `theiaExtensions` entry)

**Interfaces:**
- Consumes: `POWERBROWSER_ENV['POWERBROWSER_PROFILE_DIR']` (`@powerbrowser/token-gate/lib/node/powerbrowser-env`), `TAB_QUERY_FILE_NAME` (A12), and `better-sqlite3` resolved at runtime (the app bundle keeps it external, `theia/applications/browser/esbuild.mjs`). The docs describe the v5 columns (A1) and key forms (A2), and point at `docs/TAB-STORE.md` (A11).
- Produces: `STORE_ACCESS_FILE_NAME = 'store-access.json'`, `STORE_ACCESS_ROUTE = '/mcp'`, `TAB_STORE_TOOL_NAMES` and `TabStoreToolName` (protocol). `runReadOnlySql(file: string, sql: unknown, params: unknown): Promise<SqlResult>` with `SqlResult = { columns: string[]; rows: Record<string, unknown>[]; truncated: boolean }`. The class `TabStoreAccessEndpoint` has an `onStart` that writes `<profile>/store-access.json` as `{ url, token }` with mode 0600, an `onStop` that removes it, and a protected `runTool(name, args)` with a `default:` arm that later tasks insert cases above.

- [ ] **Step 0: Confirm wave A's slice is in the clone**

```bash
cd ~/coding/Power-Browser-ng-b && git pull --no-rebase ~/coding/Power-Browser main && git log --oneline --grep 'NG-001' | head -1
```

Expected: one commit line.

- [ ] **Step 1: The failing check** is `ng-025-store-read-endpoint` from Task 1. Run it (live-clone, G4). It fails naming the missing protocol and docs and `store-access.json never appeared`.

- [ ] **Step 2: Write the protocol**

Create `theia/extensions/tab-uris/src/browser/tab-store-access-protocol.ts`:

```ts
/**
 * NG-025/NG-026 (non-GUI wave B): names the tab-store endpoint (node) and its
 * relay (browser) share, spelled once. Lives under browser/ beside this
 * package's other RPC contracts (group-query-service.ts) and imports nothing
 * browser-only, so the backend imports it too.
 */

/** The access file the endpoint writes into the profile directory, mode 0600. */
export const STORE_ACCESS_FILE_NAME = 'store-access.json';

/** The endpoint's one route: MCP JSON-RPC over HTTP POST. */
export const STORE_ACCESS_ROUTE = '/mcp';

/**
 * Every tool the endpoint lists. scripts/verify-ng-025-store-read-endpoint.mjs
 * derives this list and requires tools/list and docs/tab-store-access.md to
 * match it.
 */
export const TAB_STORE_TOOL_NAMES = [
    'tabs_sql',
] as const;

export type TabStoreToolName = typeof TAB_STORE_TOOL_NAMES[number];
```

- [ ] **Step 3: Write the read-only SQL runner**

Create `theia/extensions/tab-uris/src/node/tab-store-sql.ts`:

```ts
/**
 * NG-025 (non-GUI wave B): read-only SQL over tabs.sqlite for the store
 * endpoint.
 *
 * Each statement runs in its own worker thread, so a slow statement never
 * blocks the backend's event loop, which every Theia RPC shares. The worker
 * opens its own readonly handle -- the second-writer gate admits a
 * `new Database(` line under theia/ only with a `readonly: true` literal on
 * it -- and refuses anything but one read-only statement that returns rows.
 * Words that reach past this file or reconfigure the connection are refused
 * before the worker starts, wherever they appear in the text.
 */
import { Worker } from 'worker_threads';

export const SQL_TIME_LIMIT_MS = 5000;
export const SQL_MAX_ROWS = 1000;
export const SQL_MAX_BYTES = 8 * 1024 * 1024;
export const SQL_MAX_RUNNING = 2;
const SQL_MAX_CHARS = 10000;
const REFUSED_WORDS = /\b(attach|detach|vacuum|pragma|load_extension)\b/i;

export interface SqlResult {
    columns: string[];
    rows: Record<string, unknown>[];
    truncated: boolean;
}

// Plain CommonJS for an eval worker: it cannot import this bundle, so the
// SQLite binding's resolved path arrives in workerData.
const WORKER_SOURCE = `
const { parentPort, workerData } = require('worker_threads');
const Database = require(workerData.modulePath);
let db;
try {
    db = new Database(workerData.file, { readonly: true, fileMustExist: true });
    const stmt = db.prepare(workerData.sql);
    if (!stmt.reader || !stmt.readonly) {
        throw new Error('only one read-only statement that returns rows is allowed');
    }
    const rows = [];
    let bytes = 0;
    let truncated = false;
    for (const row of stmt.iterate(...workerData.params)) {
        bytes += JSON.stringify(row).length;
        if (rows.length === workerData.maxRows || bytes > workerData.maxBytes) {
            truncated = true;
            break;
        }
        rows.push(row);
    }
    parentPort.postMessage({ ok: true, columns: stmt.columns().map(c => c.name), rows, truncated });
} catch (err) {
    parentPort.postMessage({ ok: false, message: String((err && err.message) || err) });
} finally {
    try { if (db) { db.close(); } } catch (e) { /* closing is best-effort */ }
}
`;

let running = 0;

/** Runs one read-only statement against `file`; rejects with a message the endpoint hands back as a tool error. */
export async function runReadOnlySql(file: string, sql: unknown, params: unknown): Promise<SqlResult> {
    if (typeof sql !== 'string' || !sql.trim() || sql.length > SQL_MAX_CHARS) {
        throw new Error(`sql must be one statement of 1 to ${SQL_MAX_CHARS} characters`);
    }
    if (REFUSED_WORDS.test(sql)) {
        throw new Error("ATTACH, DETACH, VACUUM, PRAGMA and load_extension are refused; read the schema with pragma_table_info('tabs') instead");
    }
    const bound = params === undefined ? [] : params;
    if (!Array.isArray(bound) || bound.length > 100 || !bound.every(v => v === null || typeof v === 'string' || typeof v === 'number')) {
        throw new Error('params must be an array of at most 100 strings, numbers or nulls');
    }
    if (running >= SQL_MAX_RUNNING) {
        throw new Error(`${SQL_MAX_RUNNING} statements are already running; retry when one finishes`);
    }
    running += 1;
    const worker = new Worker(WORKER_SOURCE, {
        eval: true,
        workerData: { modulePath: require.resolve('better-sqlite3'), file, sql, params: bound, maxRows: SQL_MAX_ROWS, maxBytes: SQL_MAX_BYTES },
    });
    worker.once('exit', () => { running -= 1; });
    try {
        return await new Promise<SqlResult>((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error(`the statement ran past the ${SQL_TIME_LIMIT_MS / 1000} s time limit`)), SQL_TIME_LIMIT_MS);
            worker.once('message', (m: { ok: boolean; message?: string; columns: string[]; rows: Record<string, unknown>[]; truncated: boolean }) => {
                clearTimeout(timer);
                if (m.ok) {
                    resolve({ columns: m.columns, rows: m.rows, truncated: m.truncated });
                } else {
                    reject(new Error(m.message));
                }
            });
            worker.once('error', err => {
                clearTimeout(timer);
                reject(err);
            });
        });
    } finally {
        // ponytail: the bundled SQLite is built without the progress callback and
        // exposes no interrupt, so terminate() lands only when the statement
        // returns; a runaway statement holds one of the SQL_MAX_RUNNING slots
        // until then. Add sqlite3_interrupt when the binding exposes it.
        void worker.terminate();
    }
}
```

- [ ] **Step 4: Write the endpoint**

Create `theia/extensions/tab-uris/src/node/tab-store-access-endpoint.ts`:

```ts
/**
 * NG-025/NG-026 (non-GUI wave B): the documented, token-gated tab-store
 * endpoint for users and MCP clients. docs/tab-store-access.md is the
 * user-facing contract.
 *
 * It is its OWN loopback listener, not a route on the Theia backend's port:
 * that port's cookie gate (token-gate) admits the per-launch cookie, which
 * never leaves the supervisor, and widening that gate would widen Theia's
 * arbitrary-execution surface with it. Nothing here comes from the retired
 * backend-opencode /mcp route (decisions.md D2).
 *
 * Three walls run before any tool, in this order:
 *   1. a request carrying an Origin header comes from a browser page -> 403.
 *      Every browser POST carries Origin and MCP clients send none, so this
 *      is what stops a hostile 127.0.0.1 page even when it holds the token;
 *   2. the Host header must name this listener (DNS rebinding) -> 403;
 *   3. the per-launch bearer token from the 0600 access file -> 401.
 * The access file carries the URL and the token and is rewritten on every
 * backend start, so a respawned backend's clients re-read it.
 */
import * as crypto from 'crypto';
import * as http from 'http';
import { chmodSync, renameSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { injectable } from '@theia/core/shared/inversify';
import { BackendApplicationContribution } from '@theia/core/lib/node';
import { POWERBROWSER_ENV } from '@powerbrowser/token-gate/lib/node/powerbrowser-env';
import { TAB_QUERY_FILE_NAME } from './tab-query-service';
import { STORE_ACCESS_FILE_NAME, STORE_ACCESS_ROUTE, TabStoreToolName } from '../browser/tab-store-access-protocol';
import { runReadOnlySql } from './tab-store-sql';

const MCP_VERSION = '2025-06-18';
const MAX_BODY_BYTES = 1024 * 1024;

type Args = Record<string, unknown>;

interface ToolDef {
    name: TabStoreToolName;
    description: string;
    inputSchema: object;
}

const TOOLS: ToolDef[] = [
    {
        name: 'tabs_sql',
        description: 'Run one read-only SELECT (or WITH ... SELECT) against tabs.sqlite. Returns columns, rows (at most 1000) and truncated.',
        inputSchema: {
            type: 'object',
            properties: {
                sql: { type: 'string', description: 'One read-only statement. ATTACH, DETACH, VACUUM, PRAGMA and load_extension are refused.' },
                params: { type: 'array', items: { type: ['string', 'number', 'null'] }, description: 'Values bound to ? placeholders.' },
            },
            required: ['sql'],
        },
    },
];

class RpcFailure extends Error {
    constructor(readonly code: number, message: string) {
        super(message);
    }
}

function readBody(req: http.IncomingMessage, limit: number): Promise<string> {
    return new Promise((resolve, reject) => {
        let size = 0;
        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => {
            size += chunk.length;
            if (size > limit) {
                reject(new Error('request body too large'));
                req.destroy();
                return;
            }
            chunks.push(chunk);
        });
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        req.on('error', reject);
    });
}

@injectable()
export class TabStoreAccessEndpoint implements BackendApplicationContribution {
    protected readonly profileDir: string = POWERBROWSER_ENV['POWERBROWSER_PROFILE_DIR'] ?? '';
    protected server: http.Server | undefined;
    protected token = '';
    protected port = 0;
    protected accessFile = '';

    onStart(): void {
        if (!this.profileDir) {
            // A dev backend with no supervising browser has no profile to serve.
            console.warn('tab-store-access: no profile directory, so the store endpoint stays off');
            return;
        }
        this.token = crypto.randomBytes(32).toString('hex');
        const server = http.createServer((req, res) => {
            void this.handle(req, res);
        });
        server.listen(0, '127.0.0.1', () => this.announce(server));
        this.server = server;
    }

    onStop(): void {
        if (this.server) {
            this.server.close();
        }
        if (this.accessFile) {
            rmSync(this.accessFile, { force: true });
        }
    }

    protected announce(server: http.Server): void {
        const address = server.address();
        if (!address || typeof address === 'string') {
            server.close();
            return;
        }
        this.port = address.port;
        this.accessFile = join(this.profileDir, STORE_ACCESS_FILE_NAME);
        const staging = `${this.accessFile}.${process.pid}.tmp`;
        writeFileSync(staging, JSON.stringify({ url: `http://127.0.0.1:${this.port}${STORE_ACCESS_ROUTE}`, token: this.token }) + '\n', { mode: 0o600 });
        chmodSync(staging, 0o600); // writeFileSync's mode is masked by the umask; chmod is not
        renameSync(staging, this.accessFile);
    }

    protected async handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        if (req.headers.origin !== undefined) {
            return this.status(res, 403);
        }
        const host = req.headers.host;
        if (host !== `127.0.0.1:${this.port}` && host !== `localhost:${this.port}`) {
            return this.status(res, 403);
        }
        if (!this.tokenMatches(req.headers.authorization)) {
            return this.status(res, 401);
        }
        if (req.url !== STORE_ACCESS_ROUTE) {
            return this.status(res, 404);
        }
        if (req.method !== 'POST') {
            return this.status(res, 405);
        }
        let body: string;
        try {
            body = await readBody(req, MAX_BODY_BYTES);
        } catch {
            return this.status(res, 413);
        }
        let msg: { id?: unknown; method?: unknown; params?: unknown };
        try {
            msg = JSON.parse(body);
        } catch {
            return this.json(res, { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'invalid JSON' } });
        }
        const id = msg.id === undefined ? null : msg.id;
        try {
            const result = await this.dispatch(String(msg.method ?? ''), (msg.params ?? {}) as Args);
            if (msg.id === undefined) {
                res.writeHead(202).end(); // a notification gets no body
                return;
            }
            this.json(res, { jsonrpc: '2.0', id, result });
        } catch (err) {
            const code = err instanceof RpcFailure ? err.code : -32603;
            this.json(res, { jsonrpc: '2.0', id, error: { code, message: err instanceof Error ? err.message : String(err) } });
        }
    }

    protected tokenMatches(header: string | undefined): boolean {
        const match = /^Bearer ([0-9a-f]{64})$/.exec(header ?? '');
        return !!match && !!this.token && crypto.timingSafeEqual(Buffer.from(match[1]), Buffer.from(this.token));
    }

    protected status(res: http.ServerResponse, code: number): void {
        res.writeHead(code).end();
    }

    protected json(res: http.ServerResponse, value: unknown): void {
        res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(value));
    }

    protected async dispatch(method: string, params: Args): Promise<unknown> {
        switch (method) {
            case 'initialize':
                return {
                    protocolVersion: typeof params.protocolVersion === 'string' ? params.protocolVersion : MCP_VERSION,
                    capabilities: { tools: {} },
                    serverInfo: { name: 'powerbrowser-tab-store', version: '1.0.0' },
                };
            case 'notifications/initialized':
            case 'ping':
                return {};
            case 'tools/list':
                return { tools: TOOLS };
            case 'tools/call':
                return this.callTool(String(params.name ?? ''), (params.arguments ?? {}) as Args);
            default:
                throw new RpcFailure(-32601, `unknown method ${method}`);
        }
    }

    protected async callTool(name: string, args: Args): Promise<object> {
        try {
            const value = await this.runTool(name, args);
            return { content: [{ type: 'text', text: JSON.stringify(value) }], structuredContent: value };
        } catch (err) {
            return { isError: true, content: [{ type: 'text', text: err instanceof Error ? err.message : String(err) }] };
        }
    }

    protected async runTool(name: string, args: Args): Promise<object> {
        switch (name) {
            case 'tabs_sql':
                return runReadOnlySql(join(this.profileDir, TAB_QUERY_FILE_NAME), args.sql, args.params);
            default:
                throw new Error(`unknown tool ${name}`);
        }
    }
}
```

- [ ] **Step 5: Compose it**

Create `theia/extensions/tab-uris/src/node/tab-store-access-backend-module.ts`:

```ts
/**
 * Non-GUI wave B: backend composition for the tab-store endpoint
 * (NG-025/NG-026). Composed through its own package.json entry so the
 * existing tab-query module stays untouched. Static binds only (D-50).
 */
import { ContainerModule } from '@theia/core/shared/inversify';
import { BackendApplicationContribution } from '@theia/core/lib/node';
import { TabStoreAccessEndpoint } from './tab-store-access-endpoint';

export default new ContainerModule(bind => {
    bind(TabStoreAccessEndpoint).toSelf().inSingletonScope();
    bind(BackendApplicationContribution).toService(TabStoreAccessEndpoint);
});
```

Edit `theia/extensions/tab-uris/package.json`. Old:

```json
    {
      "backend": "lib/node/tab-query-backend-module"
    }
  ],
```

New:

```json
    {
      "backend": "lib/node/tab-query-backend-module"
    },
    {
      "backend": "lib/node/tab-store-access-backend-module"
    }
  ],
```

- [ ] **Step 6: Document it**

Create `docs/tab-store-access.md`:

````markdown
# Tab store access

Power Browser keeps its tab and group data in `tabs.sqlite` in your profile directory. While Power Browser runs, this endpoint is the supported way for you, your scripts and MCP clients (programs that speak the Model Context Protocol, such as AI agents) to read that data and, through Power Browser's own writer, change it. Nothing else may open `tabs.sqlite` for writing.

## Connecting

At start-up Power Browser writes `store-access.json` into the profile directory:

```json
{"url": "http://127.0.0.1:43127/mcp", "token": "<64 hexadecimal characters>"}
```

- Only your user account can read the file (mode 0600).
- The port and the token are new every time Power Browser starts. Read the file again after a restart.
- A normal quit removes the file.

Send each request as an HTTP POST of one JSON-RPC 2.0 message to `url`, with these headers:

```text
Content-Type: application/json
Authorization: Bearer <token>
```

The endpoint speaks MCP over HTTP with single JSON responses: `initialize`, `tools/list` and `tools/call`.

## Security

- The endpoint listens on 127.0.0.1 only.
- A request without the right token gets HTTP 401.
- A request that carries an `Origin` header gets HTTP 403. Browsers send `Origin` with every POST, so no web page can use the endpoint, including a page served from 127.0.0.1 that holds the token.
- A request whose `Host` header is not the endpoint's own address gets HTTP 403. This stops DNS-rebinding attacks.

## Tools

| Tool | Arguments | Result |
|---|---|---|
| `tabs_sql` | `sql` (string), `params` (array, optional) | `{columns, rows, truncated}` |

A tool that cannot run answers with `isError: true` and a message that says why.

### `tabs_sql`

Runs one read-only SQL statement against `tabs.sqlite`.

- The statement must return rows: `SELECT`, or `WITH … SELECT`. Statements that write are refused, and the database is also opened read-only.
- `ATTACH`, `DETACH`, `VACUUM`, `PRAGMA` and `load_extension` are refused wherever they appear, comments included. Read the schema with the table-valued functions instead, for example `SELECT name, type FROM pragma_table_info('tabs')`.
- Put values in `params` and refer to them with `?`. Do not paste text you did not write into `sql`.
- Each row of `tabs` is one tab, keyed by its identity in `uri` (`stock:…`, `web:…`, or a Theia address such as `terminal:build`). `url` is the page address (`''` for a tab with no page), and `closed_at` is `NULL` while the tab is open. `docs/TAB-STORE.md` describes every table and column.
- Limits: 5 seconds per statement, 1000 rows, 8 MiB of row data, two statements at a time. `truncated` is `true` when a limit cut the rows short.

## Example

```sh
ACCESS="$PROFILE_DIR/store-access.json"
URL=$(jq -r .url "$ACCESS")
TOKEN=$(jq -r .token "$ACCESS")
curl -s "$URL" -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"tabs_sql","arguments":{"sql":"SELECT url, title FROM tabs ORDER BY last_active DESC LIMIT 10"}}}'
```

## MCP clients

Configure an HTTP MCP server with the `url` from `store-access.json` and the header `Authorization: Bearer <token>`. Both change when Power Browser restarts, so update the client's configuration after a restart.
````

- [ ] **Step 7: Typecheck, build, run the check**

```bash
cd ~/coding/Power-Browser-ng-b
scripts/verify-platform.sh --only tab-uris-typecheck
scripts/verify-platform.sh --only sql-store-second-writer
scripts/verify-platform.sh --only backend-env-readers
nix develop .#theia --command bash -c 'cd theia && yarn build'
PB_FIREFOX_BIN=$HOME/coding/Power-Browser/objdir/dist/bin/powerbrowser PB_BACKEND_MAIN=$PWD/theia/applications/browser/lib/backend/main.js \
  flock ~/coding/Power-Browser/.git/pb-live.lock scripts/verify-platform.sh --only ng-025-store-read-endpoint
```

Expected: all four checks PASS. `ng-025-store-read-endpoint: PASS`.

- [ ] **Step 8: Call-site deletion proof (not committed)**

Delete the `case 'tabs_sql':` arm (two lines) in `runTool`, rebuild, and re-run `ng-025-store-read-endpoint`. It must fail with `tabs_sql never returned the open tab's row`. Then restore the arm with `git checkout -- theia/extensions/tab-uris/src/node/tab-store-access-endpoint.ts` and rebuild.

- [ ] **Step 9: Commit gate and commit**

```bash
git add theia/extensions/tab-uris/src/browser/tab-store-access-protocol.ts theia/extensions/tab-uris/src/node/tab-store-sql.ts \
  theia/extensions/tab-uris/src/node/tab-store-access-endpoint.ts theia/extensions/tab-uris/src/node/tab-store-access-backend-module.ts \
  theia/extensions/tab-uris/package.json docs/tab-store-access.md
node scripts/scan-brand-residue.mjs
scripts/verify-platform.sh --quick 2>&1 | sed -n '/^verify-platform: summary/,$p' | grep ': FAIL$' | awk '{print $1}' | sed 's/:$//' | sort | comm -13 docs/non-gui/quick-baseline.txt -
git commit -m "feat(ng-b): token-gated read-only SQL endpoint for tabs.sqlite" -m "Refs: NG-025"
```

Expected: the gate prints only `ng-027-reader-callers`.

---

### Task 3: Store request channel, Theia reader and endpoint relay (NG-021, NG-022)

**Needs:** wave-a (NG-001–NG-005 merged: A5, C1)

**Rows:** NG-021, NG-022

**Files:**
- Modify: `powerbrowser/shell/PowerBrowserAPI.sys.mjs` (the one-line hook in `PowerBrowserGroupParent.receiveMessage`, which is the only shared-region touch; a new section appended at the end of the file)
- Replace: `theia/extensions/tab-uris/src/browser/tab-store-access-protocol.ts`
- Create: `theia/extensions/tab-uris/src/browser/chrome-store-client.ts`
- Create: `theia/extensions/tab-uris/src/browser/tab-store-relay-contribution.ts`
- Create: `theia/extensions/tab-uris/src/browser/tab-store-access-frontend-module.ts`
- Create: `theia/extensions/tab-uris/src/node/tab-store-relay.ts`
- Replace: `theia/extensions/tab-uris/src/node/tab-store-access-backend-module.ts`
- Modify: `theia/extensions/tab-uris/src/node/tab-store-access-endpoint.ts`
- Modify: `theia/extensions/tab-uris/package.json`
- Modify: `docs/tab-store-access.md`

`INTERNAL-APIS.md` is unchanged in this task. The hook and the handler are plain JS, and the four readers they call were catalogued under 12-02 (the `PlacesUtils` row at `PowerBrowserAPI.sys.mjs:37` and the `projectSessionStoreTabs` row).

**Interfaces:**
- Consumes: `PowerBrowserAPI.readHistoryEntry(url) → {url: URL|string, title} | null`, `readBookmarkByUrl(url) → {guid, title, url: URL|string} | null`, `listBookmarkFolder(guid) → {guid,title,url}[]`, and `projectSessionStoreTabs() → { uri, url, title, last_active }[]` (which delegates to `parseSessionStoreTabRows`, A5). The module-level `groupSenderIsTheia(actorRef)` (C1). `PowerBrowserAPI.log(level, message)`. The shared line in `receiveMessage` (C3): if wave C's Q2 has already changed that method when this task runs, keep its change and add the one hook line before the `handleGroupMutation` return.
- Produces: the chrome-side `STORE_REQUEST_KINDS` (Set), `isStoreRequestKind(kind)`, `storeSenderInShellWindow(actorRef)` and `handleStoreRequest(data, actorRef) → Promise<{ ok, kind, … } | { ok: false, reason: 'validation'|'store', message }>`. The replies are `readHistoryEntry → { entry: {url,title} | null }`, `readBookmarkByUrl → { bookmark: {guid,title,url} | null }`, `listBookmarkFolder → { rows }` and `projectSessionStoreTabs → { rows }`. Theia-side: `ChromeStoreClient` (DI class) with `request(msg: StoreMessage, timeoutMs?): Promise<StoreReply>`, `readHistoryEntry(url)`, `readBookmarkByUrl(url)`, `listBookmarkFolder(folderGuid)`, `projectSessionStoreTabs()`, and the protected `field<T>(msg, name, timeoutMs?)`. The protocol adds `TAB_STORE_RELAY_PATH`, `TAB_STORE_RELAY_KINDS`, `StoreMessage`, `StoreReply`, `TabStoreRelayClient` and `TabStoreRelayServer`. The backend gets `TabStoreRelayHub.relay(msg): Promise<StoreReply>`. The endpoint gets the tools `history_entry`, `bookmark_by_url`, `bookmark_folder` and `sessionstore_tabs`, and the protected `chrome(msg, field)`.

- [ ] **Step 0:** `cd ~/coding/Power-Browser-ng-b && git pull --no-rebase ~/coding/Power-Browser main`

- [ ] **Step 1: The failing checks** are `ng-021-places-reads-via-actor` and `ng-022-sessionstore-projection-via-actor` (live-main). `ng-027-reader-callers` (quick) currently names the four Places readers. Run it now:

```bash
scripts/verify-platform.sh --only ng-027-reader-callers 2>&1 | grep -cE 'readHistoryEntry|readBookmarkByUrl|listBookmarkFolder|projectSessionStoreTabs'
```

Expected: `4`.

- [ ] **Step 2: Add the hook in the actor parent**

This is the only shared-region line in Tasks 2–6. If wave C's Q2 has already reshaped `receiveMessage` on `main`, the old text below will not match. In that case, keep wave C's code and put the one hook line directly before its `return PowerBrowserAPI.handleGroupMutation(...)` (C3).

Edit `powerbrowser/shell/PowerBrowserAPI.sys.mjs`. Old:

```js
    if (!message || message.name !== "PowerBrowserGroupMutation") {
      return undefined;
    }
    return PowerBrowserAPI.handleGroupMutation(message.data, this);
```

New:

```js
    if (!message || message.name !== "PowerBrowserGroupMutation") {
      return undefined;
    }
    if (isStoreRequestKind(message.data?.kind)) { return handleStoreRequest(message.data, this); }
    return PowerBrowserAPI.handleGroupMutation(message.data, this);
```

- [ ] **Step 3: Append the store request section to the end of the file**

Append to the end of `powerbrowser/shell/PowerBrowserAPI.sys.mjs`, after the closing `}` of `PowerBrowserGroupParent`:

```js

// ---------------------------------------------------------------------------
// Non-GUI wave B (NG-021..NG-028): the store request channel.
//
// Kinds that READ history, bookmarks, the sessionstore projection and the
// tab/Places join, and (NG-028) capture a saved copy of a page, ride the same
// PowerBrowserGroup actor pair as the group mutations -- one channel, one
// boundary file -- but dispatch here, in a function of their own, so
// handleGroupMutation stays the group writer's alone. The actor parent's
// receiveMessage routes a kind in STORE_REQUEST_KINDS here with one line;
// every other kind still goes to handleGroupMutation.
//
// This section sits at the end of the file on purpose: nothing above the
// last catalogued internals line moves when it grows, so the line references
// in INTERNAL-APIS.md stay valid.
// ---------------------------------------------------------------------------

const STORE_REQUEST_KINDS = new Set([
  "readHistoryEntry",
  "readBookmarkByUrl",
  "listBookmarkFolder",
  "projectSessionStoreTabs",
]);

function isStoreRequestKind(kind) {
  return typeof kind === "string" && STORE_REQUEST_KINDS.has(kind);
}

// These kinds read the user's history and bookmarks, so they add a wall of
// their own on top of groupSenderIsTheia: the sender's top frame must be
// embedded in a Power Browser shell window. A page in a stock browser tab
// lives in a navigator:browser window and is refused here, whatever the
// shared sender check decides.
function storeSenderInShellWindow(actorRef) {
  try {
    const root = actorRef.browsingContext.top.embedderElement.ownerGlobal.document.documentElement;
    return root.getAttribute("windowtype") === "powerbrowser:main";
  } catch {
    return false;
  }
}

function storeUrlArg(value) {
  if (typeof value !== "string" || !value || value.length > 8192) {
    throw new Error("handleStoreRequest: refusing a missing or oversized url");
  }
  return value;
}

async function handleStoreRequest(data, actorRef) {
  if (!groupSenderIsTheia(actorRef) || !storeSenderInShellWindow(actorRef)) {
    PowerBrowserAPI.log("error", "[handleStoreRequest] rejecting a sender outside the shell's Theia frame");
    return { ok: false, reason: "validation", message: "handleStoreRequest: refusing a sender outside the shell's Theia frame" };
  }
  const kind = data.kind;
  try {
    switch (kind) {
      // Replies cross the actor boundary by structured clone, and Places
      // hands back URL objects, which do not clone: every url here is a string.
      case "readHistoryEntry": {
        const entry = await PowerBrowserAPI.readHistoryEntry(storeUrlArg(data.url));
        return { ok: true, kind, entry: entry && { url: String(entry.url), title: entry.title } };
      }
      case "readBookmarkByUrl": {
        const bookmark = await PowerBrowserAPI.readBookmarkByUrl(storeUrlArg(data.url));
        return { ok: true, kind, bookmark: bookmark && { guid: bookmark.guid, title: bookmark.title, url: String(bookmark.url) } };
      }
      case "listBookmarkFolder": {
        if (typeof data.folderGuid !== "string" || !/^[A-Za-z0-9_-]{12}$/.test(data.folderGuid)) {
          throw new Error("handleStoreRequest: refusing a malformed folderGuid");
        }
        const rows = PowerBrowserAPI.listBookmarkFolder(data.folderGuid).map(row => ({ guid: row.guid, title: row.title, url: String(row.url) }));
        return { ok: true, kind, rows };
      }
      case "projectSessionStoreTabs": {
        return { ok: true, kind, rows: PowerBrowserAPI.projectSessionStoreTabs() };
      }
      default: {
        return { ok: false, reason: "validation", message: `handleStoreRequest: unknown kind ${String(kind)}` };
      }
    }
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    PowerBrowserAPI.log("warn", `[handleStoreRequest] ${String(kind)} failed: ${message}`);
    return { ok: false, reason: /refusing|unknown/.test(message) ? "validation" : "store", message };
  }
}
```

```bash
node --check powerbrowser/shell/PowerBrowserAPI.sys.mjs && scripts/check-internals-boundary.sh
```

Expected: no syntax error. The boundary guard passes. The `--catalogue` state is unchanged, because the section sits below every catalogued line.

- [ ] **Step 4: Replace the protocol**

Replace `theia/extensions/tab-uris/src/browser/tab-store-access-protocol.ts` with:

```ts
/**
 * NG-021..NG-026 (non-GUI wave B): names the tab-store endpoint (node) and
 * its relay (browser) share, spelled once. Lives under browser/ beside this
 * package's other RPC contracts (group-query-service.ts) and imports nothing
 * browser-only, so the backend imports it too.
 */

/** The access file the endpoint writes into the profile directory, mode 0600. */
export const STORE_ACCESS_FILE_NAME = 'store-access.json';

/** The endpoint's one route: MCP JSON-RPC over HTTP POST. */
export const STORE_ACCESS_ROUTE = '/mcp';

/**
 * Every tool the endpoint lists. scripts/verify-ng-025-store-read-endpoint.mjs
 * derives this list and requires tools/list and docs/tab-store-access.md to
 * match it.
 */
export const TAB_STORE_TOOL_NAMES = [
    'tabs_sql',
    'history_entry',
    'bookmark_by_url',
    'bookmark_folder',
    'sessionstore_tabs',
] as const;

export type TabStoreToolName = typeof TAB_STORE_TOOL_NAMES[number];

/** JSON-RPC path of the backend relay hub; every Theia window registers on it. */
export const TAB_STORE_RELAY_PATH = '/services/powerbrowser/tab-store-relay';

/** The actor kinds a window forwards for the endpoint. Nothing else crosses the relay. */
export const TAB_STORE_RELAY_KINDS: readonly string[] = [
    'readHistoryEntry',
    'readBookmarkByUrl',
    'listBookmarkFolder',
    'projectSessionStoreTabs',
];

/** One actor message: the kind plus its fields. */
export interface StoreMessage {
    kind: string;
    [field: string]: unknown;
}

/** The parent's reply: `{ ok: true, kind, ...fields }` or `{ ok: false, reason, message }`. */
export interface StoreReply {
    ok: boolean;
    reason?: string;
    message?: string;
    [field: string]: unknown;
}

/** Implemented by each Theia window; the backend calls it to reach chrome. */
export interface TabStoreRelayClient {
    relay(msg: StoreMessage): Promise<StoreReply>;
}

/** Implemented by the backend hub; a window calls register() once so the hub holds its client. */
export interface TabStoreRelayServer {
    register(): Promise<boolean>;
}
```

- [ ] **Step 5: Write Theia's reader**

Create `theia/extensions/tab-uris/src/browser/chrome-store-client.ts`:

```ts
/**
 * NG-021/NG-022 (non-GUI wave B): Theia's reader for chrome-owned stores --
 * history, bookmarks, bookmark folders and the sessionstore projection --
 * through the PowerBrowserGroup actor.
 *
 * Same wire as GroupActorClient and WebTabChannel: a PowerBrowserGroupRequest
 * DOM event out, a PowerBrowserGroupResponse event back, matched by
 * requestId. The event names are spelled locally because the canonical
 * exports live in @powerbrowser/modes, which depends on this package. The
 * parent dispatches these kinds in handleStoreRequest, not handleGroupMutation.
 */
import { injectable } from '@theia/core/shared/inversify';
import { StoreMessage, StoreReply } from './tab-store-access-protocol';

const GROUP_REQUEST_EVENT = 'PowerBrowserGroupRequest';
const GROUP_RESPONSE_EVENT = 'PowerBrowserGroupResponse';

/** Ack timeout for a read. */
export const STORE_ACK_TIMEOUT_MS = 8000;

export interface HistoryEntry {
    url: string;
    title: string;
}

export interface BookmarkEntry {
    guid: string;
    title: string;
    url: string;
}

export interface SessionTabRow {
    uri: string;
    url: string;
    title: string;
    last_active: number;
}

@injectable()
export class ChromeStoreClient {
    private seq = 0;

    /** One request; resolves the parent's reply or a timeout reply, never rejects. */
    request(msg: StoreMessage, timeoutMs = STORE_ACK_TIMEOUT_MS): Promise<StoreReply> {
        const requestId = `store-${msg.kind}-${Date.now().toString(36)}-${(this.seq += 1)}`;
        return new Promise<StoreReply>(resolve => {
            const settle = (reply: StoreReply): void => {
                window.removeEventListener(GROUP_RESPONSE_EVENT, onResponse);
                window.clearTimeout(timer);
                resolve(reply);
            };
            const onResponse = (event: Event): void => {
                const detail = (event as CustomEvent).detail as { requestId?: unknown; reply?: unknown } | undefined;
                if (!detail || detail.requestId !== requestId) {
                    return;
                }
                settle(detail.reply && typeof detail.reply === 'object'
                    ? detail.reply as StoreReply
                    : { ok: false, reason: 'validation', message: 'malformed reply' });
            };
            const timer = window.setTimeout(() => settle({ ok: false, reason: 'timeout', message: `no reply to ${msg.kind}` }), timeoutMs);
            window.addEventListener(GROUP_RESPONSE_EVENT, onResponse);
            // document + bubbles: the actor child listens on the window root (GroupActorClient records why).
            document.dispatchEvent(new CustomEvent(GROUP_REQUEST_EVENT, { bubbles: true, detail: { requestId, msg } }));
        });
    }

    readHistoryEntry(url: string): Promise<HistoryEntry | null> {
        return this.field<HistoryEntry | null>({ kind: 'readHistoryEntry', url }, 'entry');
    }

    readBookmarkByUrl(url: string): Promise<BookmarkEntry | null> {
        return this.field<BookmarkEntry | null>({ kind: 'readBookmarkByUrl', url }, 'bookmark');
    }

    listBookmarkFolder(folderGuid: string): Promise<BookmarkEntry[]> {
        return this.field<BookmarkEntry[]>({ kind: 'listBookmarkFolder', folderGuid }, 'rows');
    }

    projectSessionStoreTabs(): Promise<SessionTabRow[]> {
        return this.field<SessionTabRow[]>({ kind: 'projectSessionStoreTabs' }, 'rows');
    }

    protected async field<T>(msg: StoreMessage, name: string, timeoutMs?: number): Promise<T> {
        const reply = await this.request(msg, timeoutMs);
        if (!reply.ok) {
            throw new Error(reply.message ?? `${msg.kind} failed (${reply.reason ?? 'store'})`);
        }
        return reply[name] as T;
    }
}
```

- [ ] **Step 6: Write the relay, both ends**

Create `theia/extensions/tab-uris/src/node/tab-store-relay.ts`:

```ts
/**
 * NG-021..NG-026 (non-GUI wave B): the endpoint's way to chrome.
 *
 * The backend has no channel to chrome of its own; every Theia window has
 * one, the PowerBrowserGroup actor. Each window registers here on start, and
 * the endpoint's Places, sessionstore and write tools are relayed to the
 * newest live window, which forwards them through ChromeStoreClient. Chrome
 * stays the only party that reads Places or writes tabs.sqlite.
 */
import { injectable } from '@theia/core/shared/inversify';
import { RpcProxy } from '@theia/core/lib/common/messaging/proxy-factory';
import { StoreMessage, StoreReply, TabStoreRelayClient } from '../browser/tab-store-access-protocol';

@injectable()
export class TabStoreRelayHub {
    protected readonly clients: RpcProxy<TabStoreRelayClient>[] = [];

    add(client: RpcProxy<TabStoreRelayClient>): void {
        this.clients.push(client);
        client.onDidCloseConnection(() => {
            const index = this.clients.indexOf(client);
            if (index >= 0) {
                this.clients.splice(index, 1);
            }
        });
    }

    /** Resolves chrome's reply; rejects when no window is connected. */
    async relay(msg: StoreMessage): Promise<StoreReply> {
        for (const client of [...this.clients].reverse()) {
            try {
                return await client.relay(msg);
            } catch {
                // That window's connection dropped mid-call; the next one answers.
            }
        }
        throw new Error('no Power Browser window is connected; open one and retry');
    }
}
```

Create `theia/extensions/tab-uris/src/browser/tab-store-relay-contribution.ts`:

```ts
/**
 * NG-021..NG-026 (non-GUI wave B): this window's end of the endpoint relay.
 * Registers with the backend hub on start and forwards the kinds the
 * protocol lists -- nothing else -- to chrome through ChromeStoreClient.
 */
import { inject, injectable } from '@theia/core/shared/inversify';
import { FrontendApplicationContribution, WebSocketConnectionProvider } from '@theia/core/lib/browser';
import { ChromeStoreClient } from './chrome-store-client';
import { StoreMessage, StoreReply, TAB_STORE_RELAY_KINDS, TAB_STORE_RELAY_PATH, TabStoreRelayClient, TabStoreRelayServer } from './tab-store-access-protocol';

@injectable()
export class TabStoreRelayContribution implements FrontendApplicationContribution {
    @inject(ChromeStoreClient)
    protected readonly store: ChromeStoreClient;

    @inject(WebSocketConnectionProvider)
    protected readonly connections: WebSocketConnectionProvider;

    onStart(): void {
        // A separate target object, so relay() is the only method the backend can call.
        const target: TabStoreRelayClient = { relay: msg => this.relay(msg) };
        const hub = this.connections.createProxy<TabStoreRelayServer>(TAB_STORE_RELAY_PATH, target);
        hub.register().catch(err => console.warn('[@powerbrowser/tab-uris] tab-store relay registration failed:', err));
    }

    protected async relay(msg: StoreMessage): Promise<StoreReply> {
        if (!msg || !TAB_STORE_RELAY_KINDS.includes(msg.kind)) {
            return { ok: false, reason: 'validation', message: `the relay does not forward ${String(msg && msg.kind)}` };
        }
        return this.store.request(msg);
    }
}
```

Create `theia/extensions/tab-uris/src/browser/tab-store-access-frontend-module.ts`:

```ts
/**
 * Non-GUI wave B: frontend composition for Theia's chrome-store reader
 * (NG-021..NG-024) and the endpoint relay (NG-025/NG-026). Its own
 * package.json entry, so tab-uris-frontend-module.ts stays untouched. Static
 * binds only (D-50).
 */
import { ContainerModule } from '@theia/core/shared/inversify';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { ChromeStoreClient } from './chrome-store-client';
import { TabStoreRelayContribution } from './tab-store-relay-contribution';

export default new ContainerModule(bind => {
    bind(ChromeStoreClient).toSelf().inSingletonScope();
    bind(TabStoreRelayContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(TabStoreRelayContribution);
});
```

Replace `theia/extensions/tab-uris/src/node/tab-store-access-backend-module.ts` with:

```ts
/**
 * Non-GUI wave B: backend composition for the tab-store endpoint
 * (NG-025/NG-026) and the relay hub it reaches chrome through
 * (NG-021..NG-026). Composed through its own package.json entry so the
 * existing tab-query module stays untouched. Static binds only (D-50).
 */
import { ContainerModule } from '@theia/core/shared/inversify';
import { ConnectionHandler, JsonRpcConnectionHandler } from '@theia/core/lib/common';
import { BackendApplicationContribution } from '@theia/core/lib/node';
import { TAB_STORE_RELAY_PATH, TabStoreRelayClient, TabStoreRelayServer } from '../browser/tab-store-access-protocol';
import { TabStoreAccessEndpoint } from './tab-store-access-endpoint';
import { TabStoreRelayHub } from './tab-store-relay';

export default new ContainerModule(bind => {
    bind(TabStoreRelayHub).toSelf().inSingletonScope();
    bind(ConnectionHandler).toDynamicValue(ctx =>
        new JsonRpcConnectionHandler<TabStoreRelayClient>(TAB_STORE_RELAY_PATH, client => {
            ctx.container.get(TabStoreRelayHub).add(client);
            const server: TabStoreRelayServer = { register: async () => true };
            return server;
        })
    ).inSingletonScope();
    bind(TabStoreAccessEndpoint).toSelf().inSingletonScope();
    bind(BackendApplicationContribution).toService(TabStoreAccessEndpoint);
});
```

Edit `theia/extensions/tab-uris/package.json`. Old:

```json
    {
      "backend": "lib/node/tab-store-access-backend-module"
    }
```

New:

```json
    {
      "frontend": "lib/browser/tab-store-access-frontend-module",
      "backend": "lib/node/tab-store-access-backend-module"
    }
```

- [ ] **Step 7: Give the endpoint its read tools**

Edit `theia/extensions/tab-uris/src/node/tab-store-access-endpoint.ts`:

1. Old `import { injectable } from '@theia/core/shared/inversify';` → new `import { inject, injectable } from '@theia/core/shared/inversify';`
2. Old `import { STORE_ACCESS_FILE_NAME, STORE_ACCESS_ROUTE, TabStoreToolName } from '../browser/tab-store-access-protocol';` → new `import { STORE_ACCESS_FILE_NAME, STORE_ACCESS_ROUTE, StoreMessage, TabStoreToolName } from '../browser/tab-store-access-protocol';`
3. Old `import { runReadOnlySql } from './tab-store-sql';` → new:

```ts
import { runReadOnlySql } from './tab-store-sql';
import { TabStoreRelayHub } from './tab-store-relay';
```

4. Old:

```ts
];

class RpcFailure extends Error {
```

New:

```ts
    {
        name: 'history_entry',
        description: 'Read one page from browsing history by exact URL. Returns entry: {url, title}, or null.',
        inputSchema: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] },
    },
    {
        name: 'bookmark_by_url',
        description: 'Read the bookmark for an exact URL. Returns bookmark: {guid, title, url}, or null.',
        inputSchema: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] },
    },
    {
        name: 'bookmark_folder',
        description: 'List a bookmark folder by its 12-character GUID. Returns rows of {guid, title, url}.',
        inputSchema: { type: 'object', properties: { guid: { type: 'string' } }, required: ['guid'] },
    },
    {
        name: 'sessionstore_tabs',
        description: 'List the open tabs as session restore records them. Returns rows of {uri, url, title, last_active}.',
        inputSchema: { type: 'object', properties: {} },
    },
];

function requireString(value: unknown, name: string): string {
    if (typeof value !== 'string' || !value) {
        throw new Error(`${name} must be a non-empty string`);
    }
    return value;
}

class RpcFailure extends Error {
```

5. Old `    protected accessFile = '';` → new:

```ts
    protected accessFile = '';

    @inject(TabStoreRelayHub)
    protected readonly relay: TabStoreRelayHub;
```

6. Old:

```ts
            default:
                throw new Error(`unknown tool ${name}`);
        }
    }
```

New:

```ts
            case 'history_entry':
                return { entry: await this.chrome({ kind: 'readHistoryEntry', url: requireString(args.url, 'url') }, 'entry') };
            case 'bookmark_by_url':
                return { bookmark: await this.chrome({ kind: 'readBookmarkByUrl', url: requireString(args.url, 'url') }, 'bookmark') };
            case 'bookmark_folder':
                return { rows: await this.chrome({ kind: 'listBookmarkFolder', folderGuid: requireString(args.guid, 'guid') }, 'rows') };
            case 'sessionstore_tabs':
                return { rows: await this.chrome({ kind: 'projectSessionStoreTabs' }, 'rows') };
            default:
                throw new Error(`unknown tool ${name}`);
        }
    }

    /** One chrome read through a connected window; the reply field, or null. */
    protected async chrome(msg: StoreMessage, field: string): Promise<unknown> {
        const reply = await this.relay.relay(msg);
        if (!reply.ok) {
            throw new Error(reply.message ?? `${msg.kind} failed (${reply.reason ?? 'store'})`);
        }
        return reply[field] ?? null;
    }
```

- [ ] **Step 8: Document the new tools**

Edit `docs/tab-store-access.md`. Old:

```markdown
| `tabs_sql` | `sql` (string), `params` (array, optional) | `{columns, rows, truncated}` |
```

New:

```markdown
| `tabs_sql` | `sql` (string), `params` (array, optional) | `{columns, rows, truncated}` |
| `history_entry` | `url` (exact address) | `{entry}`: `{url, title}`, or `null` when the page is not in history |
| `bookmark_by_url` | `url` (exact address) | `{bookmark}`: `{guid, title, url}`, or `null` |
| `bookmark_folder` | `guid` (a folder's 12-character bookmark GUID) | `{rows}`: the folder's children, each `{guid, title, url}` |
| `sessionstore_tabs` | none | `{rows}`: the open tabs as session restore records them, each `{uri, url, title, last_active}` |
```

Then insert before `## Example`:

```markdown
### History, bookmarks and session tools

`history_entry`, `bookmark_by_url`, `bookmark_folder` and `sessionstore_tabs` read Firefox's own history, bookmarks and session data. Power Browser answers them from its browser side, passing each request through an open Power Browser window. While no window is open they answer with `isError: true` and "no Power Browser window is connected". Private windows are never included.

```

- [ ] **Step 9: Typecheck, build, quick evidence**

```bash
cd ~/coding/Power-Browser-ng-b
scripts/verify-platform.sh --only tab-uris-typecheck
nix develop .#theia --command bash -c 'cd theia && yarn build'
scripts/verify-platform.sh --only ng-027-reader-callers 2>&1 | grep -cE 'readHistoryEntry|readBookmarkByUrl|listBookmarkFolder|projectSessionStoreTabs'
PB_FIREFOX_BIN=$HOME/coding/Power-Browser/objdir/dist/bin/powerbrowser PB_BACKEND_MAIN=$PWD/theia/applications/browser/lib/backend/main.js \
  flock ~/coding/Power-Browser/.git/pb-live.lock scripts/verify-platform.sh --only ng-025-store-read-endpoint
```

Expected: the typecheck passes and the build succeeds. The grep prints `0`, because the four Places readers now have a caller. `ng-025-store-read-endpoint: PASS`: its derived tool list now has five names, and tools/list and the docs match. The live-main checks `ng-021-places-reads-via-actor` and `ng-022-sessionstore-projection-via-actor` are reported as `live-main pending`.

- [ ] **Step 10: Call-site deletion proof (at merge, live-main)**

Record this in the task report for the controller. Delete the `if (isStoreRequestKind(…))` hook line, and `ng-021-places-reads-via-actor` must fail with `unknown kind readHistoryEntry`. Delete the `case "projectSessionStoreTabs":` arm, and `ng-022-sessionstore-projection-via-actor` must fail. Delete `storeSenderInShellWindow(actorRef)` from the wall, and the hostile-page line of both checks must fail while wave C's NG-038 fix is not on `main`.

- [ ] **Step 11: Commit gate and commit**

```bash
git add powerbrowser/shell/PowerBrowserAPI.sys.mjs theia/extensions/tab-uris/src/browser/tab-store-access-protocol.ts \
  theia/extensions/tab-uris/src/browser/chrome-store-client.ts theia/extensions/tab-uris/src/browser/tab-store-relay-contribution.ts \
  theia/extensions/tab-uris/src/browser/tab-store-access-frontend-module.ts theia/extensions/tab-uris/src/node/tab-store-relay.ts \
  theia/extensions/tab-uris/src/node/tab-store-access-backend-module.ts theia/extensions/tab-uris/src/node/tab-store-access-endpoint.ts \
  theia/extensions/tab-uris/package.json docs/tab-store-access.md
node scripts/scan-brand-residue.mjs
scripts/verify-platform.sh --quick 2>&1 | sed -n '/^verify-platform: summary/,$p' | grep ': FAIL$' | awk '{print $1}' | sed 's/:$//' | sort | comm -13 docs/non-gui/quick-baseline.txt -
git commit -m "feat(ng-b): history, bookmark and sessionstore reads through the actor" -m "Refs: NG-021, NG-022"
```

Expected: the gate prints only `ng-027-reader-callers`.

---

### Task 4: Tab and Places join (NG-024)

**Needs:** wave-a (NG-001–NG-005 merged: A1, A2, A3, A6)

**Rows:** NG-024

**Files:**
- Modify: `powerbrowser/shell/PowerBrowserAPI.sys.mjs` (end-of-file section only)
- Modify: `theia/extensions/tab-uris/src/browser/tab-store-access-protocol.ts`
- Modify: `theia/extensions/tab-uris/src/browser/chrome-store-client.ts`
- Modify: `theia/extensions/tab-uris/src/node/tab-store-access-endpoint.ts`
- Modify: `docs/tab-store-access.md`
- Modify: `powerbrowser/INTERNAL-APIS.md` (the text of the `PlacesUtils` row at `PowerBrowserAPI.sys.mjs:37` and of the `Sqlite` row at `:27`; no line number changes)

**Interfaces:**
- Consumes: A1 columns `uri, url, title, group_id, last_active, closed_at` (`url` is `''` for a tab with no page). A2: the join key is `tabs.url`, and `tabs.uri` is identity only. A3 `PowerBrowserAPI.openTabStore()`. A6 (open = `closed_at IS NULL`). `lazy.PlacesUtils.promiseDBConnection()` (the read-only Places connection, which registers the `hash()` SQL function). Task 3's `handleStoreRequest`, `ChromeStoreClient.field`, and the endpoint's `chrome()` and `runTool`.
- Produces: chrome `queryTabsWithPlaces({ bookmarked?: boolean, open?: boolean, limit?: number }) → Promise<TabPlacesRow[]>`, with rows `{ uri, url, title, group_id, last_active, closed_at, open, visited, frecency, visit_count, last_visit, bookmark_guid, bookmark_title }`. Sort order is frecency, highest first, with `null` last. The actor kind is `queryTabsWithPlaces`. `ChromeStoreClient.queryTabsWithPlaces(options) → Promise<TabPlacesRow[]>`, the `TabPlacesRow` type, and the tool `tabs_with_places`.

- [ ] **Step 1: The failing check** is `ng-024-tabs-places-join` (live-main). It fails on `unknown kind queryTabsWithPlaces`.

- [ ] **Step 2: Add the kind and the join (chrome)**

Edit `powerbrowser/shell/PowerBrowserAPI.sys.mjs`. Old:

```js
  "projectSessionStoreTabs",
]);
```

New:

```js
  "projectSessionStoreTabs",
  "queryTabsWithPlaces",
]);
```

Old:

```js
      default: {
        return { ok: false, reason: "validation", message: `handleStoreRequest: unknown kind ${String(kind)}` };
```

New:

```js
      case "queryTabsWithPlaces": {
        const rows = await queryTabsWithPlaces({
          bookmarked: typeof data.bookmarked === "boolean" ? data.bookmarked : undefined,
          open: typeof data.open === "boolean" ? data.open : undefined,
          limit: Number.isInteger(data.limit) ? data.limit : undefined,
        });
        return { ok: true, kind, rows };
      }
      default: {
        return { ok: false, reason: "validation", message: `handleStoreRequest: unknown kind ${String(kind)}` };
```

Append to the end of the file:

```js

// NG-024: the tab/Places join (FEATURES.md Area 4). tabs.sqlite rows, read on
// the writer's own connection, joined on URL to Places -- frecency, visit
// count, last visit, first bookmark -- through the platform's read-only
// Places connection (bound parameters, SELECT only). Ranked by frecency,
// highest first, tabs with no history last. The join key is tabs.url; tabs.uri
// is identity only (docs/TAB-STORE.md), and a row is open while closed_at is
// NULL.
const TAB_PLACES_SCAN_CAP = 5000;

async function queryTabsWithPlaces({ bookmarked, open, limit } = {}) {
  const cap = Number.isInteger(limit) ? Math.min(Math.max(limit, 1), 1000) : 200;
  const conn = await PowerBrowserAPI.openTabStore();
  const tabRows = await conn.execute(
    "SELECT uri, url, title, group_id, last_active, closed_at FROM tabs ORDER BY last_active DESC LIMIT :scan",
    { scan: TAB_PLACES_SCAN_CAP }
  );
  const places = await lazy.PlacesUtils.promiseDBConnection();
  const rows = [];
  for (const tabRow of tabRows) {
    const uri = tabRow.getResultByName("uri");
    const url = tabRow.getResultByName("url");
    let place = null;
    if (typeof url === "string" && /^https?:\/\//.test(url)) {
      const hits = await places.executeCached(
        `SELECT h.frecency AS frecency, h.visit_count AS visit_count, h.last_visit_date AS last_visit_date,
                b.guid AS bookmark_guid, b.title AS bookmark_title
           FROM moz_places h
           LEFT JOIN moz_bookmarks b ON b.id = (SELECT MIN(id) FROM moz_bookmarks WHERE fk = h.id)
          WHERE h.url_hash = hash(:url) AND h.url = :url`,
        { url }
      );
      place = hits.length ? hits[0] : null;
    }
    const bookmarkGuid = place ? place.getResultByName("bookmark_guid") : null;
    if ((bookmarked === true && !bookmarkGuid) || (bookmarked === false && bookmarkGuid)) {
      continue;
    }
    const closedAt = tabRow.getResultByName("closed_at");
    const isOpen = closedAt === null;
    if ((open === true && !isOpen) || (open === false && isOpen)) {
      continue;
    }
    const lastVisit = place ? place.getResultByName("last_visit_date") : null;
    rows.push({
      uri,
      url,
      title: tabRow.getResultByName("title") ?? "",
      group_id: tabRow.getResultByName("group_id"),
      last_active: tabRow.getResultByName("last_active"),
      closed_at: closedAt,
      open: isOpen,
      visited: !!place && place.getResultByName("visit_count") > 0,
      frecency: place ? place.getResultByName("frecency") : null,
      visit_count: place ? place.getResultByName("visit_count") : 0,
      last_visit: lastVisit ? Math.floor(lastVisit / 1000) : null,
      bookmark_guid: bookmarkGuid ?? null,
      bookmark_title: place ? place.getResultByName("bookmark_title") : null,
    });
  }
  const rank = row => (row.frecency === null ? -Infinity : row.frecency);
  rows.sort((a, b) => (rank(a) === rank(b) ? 0 : rank(b) > rank(a) ? 1 : -1));
  return rows.slice(0, cap);
}
```


```bash
node --check powerbrowser/shell/PowerBrowserAPI.sys.mjs && scripts/check-internals-boundary.sh
```

- [ ] **Step 3: Theia-side API, relay kind, tool**

Edit `theia/extensions/tab-uris/src/browser/tab-store-access-protocol.ts`. Old:

```ts
    'sessionstore_tabs',
] as const;
```

New:

```ts
    'sessionstore_tabs',
    'tabs_with_places',
] as const;
```

Old:

```ts
    'projectSessionStoreTabs',
];
```

New:

```ts
    'projectSessionStoreTabs',
    'queryTabsWithPlaces',
];
```

Edit `theia/extensions/tab-uris/src/browser/chrome-store-client.ts`. Old:

```ts
@injectable()
export class ChromeStoreClient {
```

New:

```ts
/** One tab row joined to Places (NG-024). */
export interface TabPlacesRow {
    uri: string;
    url: string;
    title: string;
    group_id: string | null;
    last_active: number;
    closed_at: number | null;
    open: boolean;
    visited: boolean;
    frecency: number | null;
    visit_count: number;
    last_visit: number | null;
    bookmark_guid: string | null;
    bookmark_title: string | null;
}

export interface TabPlacesQuery {
    bookmarked?: boolean;
    open?: boolean;
    limit?: number;
}

@injectable()
export class ChromeStoreClient {
```

Old `    protected async field<T>(` → new:

```ts
    /** NG-024: tab rows joined to history and bookmarks, highest frecency first. */
    queryTabsWithPlaces(query: TabPlacesQuery = {}): Promise<TabPlacesRow[]> {
        return this.field<TabPlacesRow[]>({ kind: 'queryTabsWithPlaces', ...query }, 'rows');
    }

    protected async field<T>(
```

Edit `theia/extensions/tab-uris/src/node/tab-store-access-endpoint.ts`. Old:

```ts
];

function requireString(value: unknown, name: string): string {
```

New:

```ts
    {
        name: 'tabs_with_places',
        description: 'Tabs joined to history and bookmarks on URL, highest frecency first. Filters: bookmarked (true/false), open (true/false); limit 1-1000, default 200.',
        inputSchema: {
            type: 'object',
            properties: { bookmarked: { type: 'boolean' }, open: { type: 'boolean' }, limit: { type: 'integer', minimum: 1, maximum: 1000 } },
        },
    },
];

function requireString(value: unknown, name: string): string {
```

Old:

```ts
            default:
                throw new Error(`unknown tool ${name}`);
```

New:

```ts
            case 'tabs_with_places': {
                const msg: StoreMessage = { kind: 'queryTabsWithPlaces' };
                for (const key of ['bookmarked', 'open']) {
                    if (typeof args[key] === 'boolean') {
                        msg[key] = args[key];
                    }
                }
                if (Number.isInteger(args.limit)) {
                    msg.limit = args.limit;
                }
                return { rows: await this.chrome(msg, 'rows') };
            }
            default:
                throw new Error(`unknown tool ${name}`);
```

- [ ] **Step 4: Document the tool and the internals**

Edit `docs/tab-store-access.md`. Old:

```markdown
| `sessionstore_tabs` | none | `{rows}`: the open tabs as session restore records them, each `{uri, url, title, last_active}` |
```

New:

```markdown
| `sessionstore_tabs` | none | `{rows}`: the open tabs as session restore records them, each `{uri, url, title, last_active}` |
| `tabs_with_places` | `bookmarked` (boolean, optional), `open` (boolean, optional), `limit` (1–1000, default 200) | `{rows}`: each tab row joined to its history and bookmark, highest frecency first |
```

Insert before `## Example`:

```markdown
### `tabs_with_places`

Joins every tab row to Firefox's history and bookmarks on the page address (`url`). Each row carries the tab's `uri`, `url`, `title`, `group_id`, `last_active` and `closed_at`, plus `open` (true while `closed_at` is `NULL`), `visited`, `frecency` (the browser's own ranking of how often and how recently you visit the page), `visit_count`, `last_visit` (epoch milliseconds), `bookmark_guid` and `bookmark_title`. Tabs that are not web pages carry no history or bookmark data. Closed tabs stay in the store as history until the retention setting prunes them, so `"open": true` is the filter for tabs that are open now.

- Open tabs you have never bookmarked: `{"bookmarked": false, "open": true}`
- Bookmarks that are open right now: `{"bookmarked": true, "open": true}`

```

Edit `powerbrowser/INTERNAL-APIS.md`, `PlacesUtils` row (`PowerBrowserAPI.sys.mjs:37`). The method cell old: `*(module-level lazy import, backs \`readHistoryEntry\`/\`readBookmarkByUrl\`/\`listBookmarkFolder\`)*` → new: `*(module-level lazy import, backs \`readHistoryEntry\`/\`readBookmarkByUrl\`/\`listBookmarkFolder\` and, non-GUI wave B, \`queryTabsWithPlaces\`)*`. The Threat Notes cell old: `**Places-read row (T-12-11).** Reads use \`History.fetch\`, \`Bookmarks.fetch\`, and \`getFolderContents\` only; no new code names the places file directly, and the projected fields carry tab address/title data only, never credentials.` → new:

```markdown
**Places-read row (T-12-11).** Reads use `History.fetch`, `Bookmarks.fetch`, `getFolderContents` and, for the NG-024 join `queryTabsWithPlaces`, `promiseDBConnection` -- the platform's read-only Places connection, SELECT only, bound parameters, never a write and never a file name. The join reads `moz_places` and `moz_bookmarks` columns directly, so a Places schema change breaks it loudly: `ng-024-tabs-places-join` goes red. Every one of these reads is reached from `handleStoreRequest`, behind `groupSenderIsTheia` and `storeSenderInShellWindow` (the sender's frame must sit in a `powerbrowser:main` window). No new code names the places file, and the projected fields carry addresses, titles and visit metadata only, never credentials.
```

In the `Sqlite` row's method cell (`PowerBrowserAPI.sys.mjs:27`), append `/\`queryTabsWithPlaces\` (read-only SELECT on the writer's connection)` to the list of methods it backs.

- [ ] **Step 5: Typecheck, build, quick gate**

```bash
node --check powerbrowser/shell/PowerBrowserAPI.sys.mjs
scripts/verify-platform.sh --only tab-uris-typecheck
nix develop .#theia --command bash -c 'cd theia && yarn build'
PB_FIREFOX_BIN=$HOME/coding/Power-Browser/objdir/dist/bin/powerbrowser PB_BACKEND_MAIN=$PWD/theia/applications/browser/lib/backend/main.js \
  flock ~/coding/Power-Browser/.git/pb-live.lock scripts/verify-platform.sh --only ng-025-store-read-endpoint
```

Expected: every command passes. `ng-025` passes with six tools listed and documented. `ng-024-tabs-places-join` is `live-main pending`.

- [ ] **Step 6: Call-site deletion proof (at merge, live-main)**

Delete the `case "queryTabsWithPlaces":` arm, and `ng-024-tabs-places-join` must fail with `unknown kind queryTabsWithPlaces`. Record this in the report.

- [ ] **Step 7: Commit gate and commit**

```bash
git add powerbrowser/shell/PowerBrowserAPI.sys.mjs powerbrowser/INTERNAL-APIS.md theia/extensions/tab-uris/src/browser/tab-store-access-protocol.ts \
  theia/extensions/tab-uris/src/browser/chrome-store-client.ts theia/extensions/tab-uris/src/node/tab-store-access-endpoint.ts docs/tab-store-access.md
node scripts/scan-brand-residue.mjs
scripts/verify-platform.sh --quick 2>&1 | sed -n '/^verify-platform: summary/,$p' | grep ': FAIL$' | awk '{print $1}' | sed 's/:$//' | sort | comm -13 docs/non-gui/quick-baseline.txt -
git commit -m "feat(ng-b): join tabs with history and bookmarks" -m "Refs: NG-024"
```

---

### Task 5: History and bookmark suggestions in the address bar (NG-023)

**Needs:** wave-a (NG-001–NG-005 merged: A8)

**Rows:** NG-023

**Files:**
- Modify: `powerbrowser/shell/PowerBrowserAPI.sys.mjs` (end-of-file section only)
- Modify: `theia/extensions/tab-uris/src/browser/chrome-store-client.ts`
- Create: `theia/extensions/chrome-bar/src/browser/chrome-bar-places-suggestions.ts`
- Modify: `theia/extensions/chrome-bar/src/browser/chrome-bar-suggestion-service.ts` (one new symbol)
- Modify: `theia/extensions/chrome-bar/src/browser/chrome-bar-frontend-module.ts` (the suggestion proxy bind only; widget binds untouched)
- Modify: `scripts/verify-web-tab-live.mjs` (the store-reader seam: `ChromeBarSuggestionService` → `ChromeBarTabSuggestions`)
- Modify: `powerbrowser/INTERNAL-APIS.md` (`PlacesUtils` row text)

**Interfaces:**
- Consumes: `ChromeBarSuggestionService.searchByPrefix(prefix, limit): Promise<TabQueryRow[]>` (the contract the widget calls, `chrome-bar-widget.tsx:231`). A8: behind that proxy `TabQueryService.searchByPrefix` serves open http(s) rows only and throws when the store cannot be read, so a tab-reader failure still reaches the widget's provider-error row while a Places failure only drops the history rows. `CHROME_SUGGESTION_LIMIT = 8`, `CHROME_SUGGESTION_PATH`, `ChromeStoreClient.field` (Task 3), `lazy.PlacesUtils.promiseDBConnection()`.
- Produces: chrome `searchPlaces(text, limit) → Promise<PlaceMatch[]>`, where `PlaceMatch = { url, title, frecency, bookmarked }` (http and https only, bookmarks first, then frecency). The actor kind is `searchPlaces {text, limit}`. `ChromeStoreClient.searchPlaces(text, limit)`. `ChromeBarTabSuggestions` (a DI symbol for the backend tab-row proxy). `ChromeBarPlacesSuggestions`, now bound to `ChromeBarSuggestionService`, merges open tabs first, then bookmarks and history, one row per address, at most 8.

Why the web-tab live seam changes: `verify-web-tab-live.mjs` reads the store through `ChromeBarSuggestionService` and asserts that a closed tab's row is gone. After this task that service also returns history, which outlives a closed tab. The check's subject is the store, so it now reads the tab-only reader.

- [ ] **Step 1: The failing check** is `ng-023-suggestions-history-bookmarks` (live-main). It fails because the history-only and bookmarked addresses are missing from the suggestions.

- [ ] **Step 2: Add the kind and the search (chrome)**

Edit `powerbrowser/shell/PowerBrowserAPI.sys.mjs`. Old:

```js
  "queryTabsWithPlaces",
]);
```

New:

```js
  "queryTabsWithPlaces",
  "searchPlaces",
]);
```

Old:

```js
      default: {
        return { ok: false, reason: "validation", message: `handleStoreRequest: unknown kind ${String(kind)}` };
```

New:

```js
      case "searchPlaces": {
        return { ok: true, kind, rows: await searchPlaces(data.text, data.limit) };
      }
      default: {
        return { ok: false, reason: "validation", message: `handleStoreRequest: unknown kind ${String(kind)}` };
```

Append to the end of the file:

```js

// NG-023: history and bookmark matches for the address bar
// (13-UI-SPEC.md:141,192). A literal substring match over the address, the
// page title and the bookmark title: typed %, _ and \ are escaped, as in
// TabQueryService.searchByPrefix. Only http and https addresses are returned,
// so a bookmarklet or a file: bookmark is never offered as somewhere to go.
// Bookmarks come first, then history by frecency.
async function searchPlaces(text, limit) {
  const needle = typeof text === "string" ? text.slice(0, 256) : "";
  const cap = Number.isInteger(limit) ? Math.min(Math.max(limit, 1), 50) : 8;
  if (!needle.trim()) {
    return [];
  }
  const pattern = `%${needle.replace(/[\\%_]/g, c => "\\" + c)}%`;
  const places = await lazy.PlacesUtils.promiseDBConnection();
  const rows = await places.executeCached(
    `SELECT h.url AS url, COALESCE(MAX(b.title), h.title, '') AS title, h.frecency AS frecency,
            MAX(b.guid) AS bookmark_guid
       FROM moz_places h
       LEFT JOIN moz_bookmarks b ON b.fk = h.id
      WHERE (h.url LIKE :pattern ESCAPE '\\' OR h.title LIKE :pattern ESCAPE '\\' OR b.title LIKE :pattern ESCAPE '\\')
        AND (substr(h.url, 1, 7) = 'http://' OR substr(h.url, 1, 8) = 'https://')
        AND (h.visit_count > 0 OR b.id IS NOT NULL)
      GROUP BY h.id
      ORDER BY (MAX(b.guid) IS NOT NULL) DESC, h.frecency DESC
      LIMIT :cap`,
    { pattern, cap }
  );
  return rows.map(row => ({
    url: row.getResultByName("url"),
    title: row.getResultByName("title") ?? "",
    frecency: row.getResultByName("frecency"),
    bookmarked: row.getResultByName("bookmark_guid") !== null,
  }));
}
```

```bash
node --check powerbrowser/shell/PowerBrowserAPI.sys.mjs && scripts/check-internals-boundary.sh
```

- [ ] **Step 3: Theia-side search**

Edit `theia/extensions/tab-uris/src/browser/chrome-store-client.ts`. Old `/** One tab row joined to Places (NG-024). */` → new:

```ts
/** One history or bookmark match for the address bar (NG-023). */
export interface PlaceMatch {
    url: string;
    title: string;
    frecency: number | null;
    bookmarked: boolean;
}

/** One tab row joined to Places (NG-024). */
```

Old `    /** NG-024: tab rows joined to history and bookmarks, highest frecency first. */` → new:

```ts
    /** NG-023: http(s) history and bookmark matches for typed text, bookmarks first. */
    searchPlaces(text: string, limit: number): Promise<PlaceMatch[]> {
        return this.field<PlaceMatch[]>({ kind: 'searchPlaces', text, limit }, 'rows');
    }

    /** NG-024: tab rows joined to history and bookmarks, highest frecency first. */
```

- [ ] **Step 4: The suggestion data path**

Edit `theia/extensions/chrome-bar/src/browser/chrome-bar-suggestion-service.ts`. Old `export const ChromeBarSuggestionService = Symbol('ChromeBarSuggestionService');` → new:

```ts
export const ChromeBarSuggestionService = Symbol('ChromeBarSuggestionService');

/**
 * NG-023: the backend proxy that serves open-tab rows only. The widget
 * injects ChromeBarSuggestionService, which merges these rows with history
 * and bookmark matches from chrome (chrome-bar-places-suggestions.ts).
 */
export const ChromeBarTabSuggestions = Symbol('ChromeBarTabSuggestions');
```

Create `theia/extensions/chrome-bar/src/browser/chrome-bar-places-suggestions.ts`:

```ts
/**
 * NG-023 (non-GUI wave B): the address bar's suggestion data -- open tabs
 * from the backend reader, then history and bookmark matches from chrome
 * through the actor ("Typing filters history/bookmark suggestions",
 * 13-UI-SPEC.md). Rendering is untouched: rows keep the TabQueryRow shape the
 * widget already draws and commits by url.
 */
import { inject, injectable } from '@theia/core/shared/inversify';
import type { TabQueryRow } from '@powerbrowser/tab-uris/lib/node/tab-query-service';
import { ChromeStoreClient, PlaceMatch } from '@powerbrowser/tab-uris/lib/browser/chrome-store-client';
import { CHROME_SUGGESTION_LIMIT, ChromeBarSuggestionService, ChromeBarTabSuggestions } from './chrome-bar-suggestion-service';

@injectable()
export class ChromeBarPlacesSuggestions implements ChromeBarSuggestionService {
    @inject(ChromeBarTabSuggestions)
    protected readonly tabs: ChromeBarSuggestionService;

    @inject(ChromeStoreClient)
    protected readonly store: ChromeStoreClient;

    async searchByPrefix(prefix: string, limit: number): Promise<TabQueryRow[]> {
        const cap = Number.isFinite(limit) ? Math.min(Math.max(Math.floor(limit), 1), CHROME_SUGGESTION_LIMIT) : CHROME_SUGGESTION_LIMIT;
        const [tabRows, places] = await Promise.all([
            this.tabs.searchByPrefix(prefix, cap),
            // History and bookmarks are an addition: when chrome cannot answer, the open tabs still show.
            this.store.searchPlaces(prefix, cap).catch((err: unknown): PlaceMatch[] => {
                console.warn('[@powerbrowser/chrome-bar] history and bookmark suggestions unavailable:', err);
                return [];
            }),
        ]);
        const seen = new Set<string>();
        const rows: TabQueryRow[] = [];
        for (const row of tabRows) {
            if (!seen.has(row.url)) {
                seen.add(row.url);
                rows.push(row);
            }
        }
        for (const place of places) {
            if (!seen.has(place.url)) {
                seen.add(place.url);
                // The address doubles as the list key: a history or bookmark row has no store identity.
                rows.push({ uri: place.url, url: place.url, title: place.title, last_active: 0 });
            }
        }
        return rows.slice(0, cap);
    }
}
```

Edit `theia/extensions/chrome-bar/src/browser/chrome-bar-frontend-module.ts`:
- Old `import { CHROME_SUGGESTION_PATH, ChromeBarSuggestionService } from './chrome-bar-suggestion-service';` → new:

```ts
import { CHROME_SUGGESTION_PATH, ChromeBarSuggestionService, ChromeBarTabSuggestions } from './chrome-bar-suggestion-service';
import { ChromeBarPlacesSuggestions } from './chrome-bar-places-suggestions';
```

- Old:

```ts
    bind(ChromeBarSuggestionService).toDynamicValue(ctx =>
        WebSocketConnectionProvider.createProxy<ChromeBarSuggestionService>(ctx.container, CHROME_SUGGESTION_PATH)
    ).inSingletonScope();
```

New:

```ts
    // NG-023: the backend proxy serves open-tab rows; the service the widget
    // injects adds history and bookmark matches from chrome.
    bind(ChromeBarTabSuggestions).toDynamicValue(ctx =>
        WebSocketConnectionProvider.createProxy<ChromeBarSuggestionService>(ctx.container, CHROME_SUGGESTION_PATH)
    ).inSingletonScope();
    bind(ChromeBarSuggestionService).to(ChromeBarPlacesSuggestions).inSingletonScope();
```

Edit `scripts/verify-web-tab-live.mjs`. Old:

```js
        const suggestions = __getByName(container, 'ChromeBarSuggestionService');
        // The store reader the check polls. Wrapped here so the store-unread
        // plant can replace the reader through one seam.
```

New:

```js
        // Tab rows only (NG-023): the address bar's own service also suggests
        // history, which outlives a closed tab, and this check reads the store.
        const suggestions = __getByName(container, 'ChromeBarTabSuggestions');
        // The store reader the check polls. Wrapped here so the store-unread
        // plant can replace the reader through one seam.
```

- [ ] **Step 5: The internals row**

Edit `powerbrowser/INTERNAL-APIS.md`, the `PlacesUtils` row. Three replacements, all inside the text Task 4 wrote:

```text
old: and, non-GUI wave B, `queryTabsWithPlaces`)*
new: and, non-GUI wave B, `queryTabsWithPlaces`/`searchPlaces`)*

old: for the NG-024 join `queryTabsWithPlaces`, `promiseDBConnection`
new: for the NG-024 join `queryTabsWithPlaces` and the NG-023 address-bar search `searchPlaces`, `promiseDBConnection`

old: `ng-024-tabs-places-join` goes red
new: `ng-024-tabs-places-join` and `ng-023-suggestions-history-bookmarks` go red
```

- [ ] **Step 6: Typecheck, build, the existing gates**

```bash
node --check powerbrowser/shell/PowerBrowserAPI.sys.mjs
scripts/verify-platform.sh --only tab-uris-typecheck
scripts/verify-platform.sh --only gui06-chrome-bar-suggestions
scripts/verify-platform.sh --only gui06-chrome-bar-suggestions-self-test
nix develop .#theia --command bash -c 'cd theia && yarn build'
```

Expected: all pass. `gui06-chrome-bar-suggestions` still finds `createProxy`, `inSingletonScope` and `CHROME_SUGGESTION_PATH` in the frontend module, and finds no `window.open` or search-host literal in any chrome-bar browser source. `ng-023-suggestions-history-bookmarks` and `gui02-web-tab-live` are `live-main pending`: the controller runs both at merge, and `gui02-web-tab-live` must stay green.

- [ ] **Step 7: Call-site deletion proof (at merge, live-main)**

Delete the `case "searchPlaces":` arm, and `ng-023` must fail with `lack …/history-only`. Separately, bind `ChromeBarSuggestionService` back to the proxy, and `ng-023` must fail the same way. Record this in the report.

- [ ] **Step 8: Commit gate and commit**

```bash
git add powerbrowser/shell/PowerBrowserAPI.sys.mjs powerbrowser/INTERNAL-APIS.md theia/extensions/tab-uris/src/browser/chrome-store-client.ts \
  theia/extensions/chrome-bar/src/browser/chrome-bar-places-suggestions.ts theia/extensions/chrome-bar/src/browser/chrome-bar-suggestion-service.ts \
  theia/extensions/chrome-bar/src/browser/chrome-bar-frontend-module.ts scripts/verify-web-tab-live.mjs
node scripts/scan-brand-residue.mjs
scripts/verify-platform.sh --quick 2>&1 | sed -n '/^verify-platform: summary/,$p' | grep ': FAIL$' | awk '{print $1}' | sed 's/:$//' | sort | comm -13 docs/non-gui/quick-baseline.txt -
git commit -m "feat(ng-b): address-bar suggestions include history and bookmarks" -m "Refs: NG-023"
```

---

### Task 6: Documented write path through the chrome-side writer (NG-026)

**Needs:** wave-a (NG-001–NG-005 merged: A1 `settings`, A7, including NG-004's unknown-URI error). Step 4a also needs wave A's `docs/TAB-STORE.md` "Settings" table with each key's valid values (decisions.md R18).

**Rows:** NG-026

**Files:**
- Replace: `theia/extensions/tab-uris/src/browser/tab-store-access-protocol.ts`
- Modify: `theia/extensions/tab-uris/src/node/tab-store-access-endpoint.ts`
- Modify: `powerbrowser/shell/PowerBrowserAPI.sys.mjs` (end-of-file section only: the `setSetting` kind and its writer)
- Modify: `powerbrowser/INTERNAL-APIS.md` (the `Sqlite` row's method cell)
- Modify: `docs/tab-store-access.md`

**Interfaces:**
- Consumes: A7 (the `handleGroupMutation` kinds and fields; `setTabGroup`, `setTabPosition` and `setGroupOrder` answer `{ ok: false, reason: 'validation', message: 'unknown tab URI <uri>' }` for a key with no row). A2 (a tab is named by its `tabs.uri` key). A1 (the `settings (key, value)` table, seeded with `closed_retention_days`, `integrity_check_minutes`, `restore_behaviour`, `restore_live_minutes` and `restore_url_days`). A8 (`GroupQueryService.getSettings(): Promise<Record<string, string>>`, which the check reads back through). A11 (the "Settings" table in `docs/TAB-STORE.md`, which per R18 states each key's valid values). A3 `openTabStore()`. Task 3's relay (`TabStoreRelayHub.relay`, `TabStoreRelayContribution` allow-list via `TAB_STORE_RELAY_KINDS`, `ChromeStoreClient.request`) and `handleStoreRequest`.
- Produces: `TAB_STORE_WRITE_FIELDS: Readonly<Record<string, readonly string[]>>` (including `setSetting: ['key', 'value']`), `TAB_STORE_WRITE_OPS: readonly string[]`, and the tool `tab_store_write {op, …fields}`. The tool answers with the writer's reply (`{ ok: true, kind, id | uri | key }`) or `isError`. Chrome gets the store kind `setSetting {key, value}` with `STORE_SETTING_RULES` (one validator per documented key) and `setStoreSetting(key, value)`. `closeGroup` (it closes real tabs) and `captureShellRegion` (not data) are deliberately not write ops.

- [ ] **Step 1: The failing check** is `ng-026-store-write-endpoint` (live-main, because `setSetting` is chrome-side). It fails on `derived ZERO write ops`, the settings-key comparison, and `unknown tool tab_store_write`.

- [ ] **Step 2: Replace the protocol**

Replace `theia/extensions/tab-uris/src/browser/tab-store-access-protocol.ts` with:

```ts
/**
 * NG-021..NG-026 (non-GUI wave B): names the tab-store endpoint (node) and
 * its relay (browser) share, spelled once. Lives under browser/ beside this
 * package's other RPC contracts (group-query-service.ts) and imports nothing
 * browser-only, so the backend imports it too.
 */

/** The access file the endpoint writes into the profile directory, mode 0600. */
export const STORE_ACCESS_FILE_NAME = 'store-access.json';

/** The endpoint's one route: MCP JSON-RPC over HTTP POST. */
export const STORE_ACCESS_ROUTE = '/mcp';

/**
 * Every tool the endpoint lists. scripts/verify-ng-025-store-read-endpoint.mjs
 * derives this list and requires tools/list and docs/tab-store-access.md to
 * match it.
 */
export const TAB_STORE_TOOL_NAMES = [
    'tabs_sql',
    'history_entry',
    'bookmark_by_url',
    'bookmark_folder',
    'sessionstore_tabs',
    'tabs_with_places',
    'tab_store_write',
] as const;

export type TabStoreToolName = typeof TAB_STORE_TOOL_NAMES[number];

/**
 * NG-026: the write ops tab_store_write accepts, each with the fields it
 * forwards to the chrome-side writer, whose own validation applies behind
 * this list: handleGroupMutation for the tab and group ops, and
 * handleStoreRequest for setSetting (decisions.md R18). closeGroup is left out
 * on purpose: it closes the user's tabs, which is not a data change.
 * scripts/verify-ng-026-store-write-endpoint.mjs derives the op list from here.
 */
export const TAB_STORE_WRITE_FIELDS: Readonly<Record<string, readonly string[]>> = {
    createGroup: ['id', 'title', 'x', 'y', 'w', 'h'],
    renameGroup: ['id', 'title'],
    moveGroup: ['id', 'x', 'y'],
    resizeGroup: ['id', 'w', 'h'],
    dissolveGroup: ['id'],
    setActiveGroup: ['id'],
    setTabGroup: ['uri', 'groupId'],
    setTabPosition: ['uri', 'x', 'y'],
    setGroupOrder: ['groupId', 'uris'],
    setSetting: ['key', 'value'],
};

export const TAB_STORE_WRITE_OPS: readonly string[] = Object.keys(TAB_STORE_WRITE_FIELDS);

/** JSON-RPC path of the backend relay hub; every Theia window registers on it. */
export const TAB_STORE_RELAY_PATH = '/services/powerbrowser/tab-store-relay';

/** The actor kinds a window forwards for the endpoint. Nothing else crosses the relay. */
export const TAB_STORE_RELAY_KINDS: readonly string[] = [
    'readHistoryEntry',
    'readBookmarkByUrl',
    'listBookmarkFolder',
    'projectSessionStoreTabs',
    'queryTabsWithPlaces',
    ...TAB_STORE_WRITE_OPS,
];

/** One actor message: the kind plus its fields. */
export interface StoreMessage {
    kind: string;
    [field: string]: unknown;
}

/** The parent's reply: `{ ok: true, kind, ...fields }` or `{ ok: false, reason, message }`. */
export interface StoreReply {
    ok: boolean;
    reason?: string;
    message?: string;
    [field: string]: unknown;
}

/** Implemented by each Theia window; the backend calls it to reach chrome. */
export interface TabStoreRelayClient {
    relay(msg: StoreMessage): Promise<StoreReply>;
}

/** Implemented by the backend hub; a window calls register() once so the hub holds its client. */
export interface TabStoreRelayServer {
    register(): Promise<boolean>;
}
```

- [ ] **Step 3: The write tool**

Edit `theia/extensions/tab-uris/src/node/tab-store-access-endpoint.ts`:
- Old `import { STORE_ACCESS_FILE_NAME, STORE_ACCESS_ROUTE, StoreMessage, TabStoreToolName } from '../browser/tab-store-access-protocol';` → new `import { STORE_ACCESS_FILE_NAME, STORE_ACCESS_ROUTE, StoreMessage, TAB_STORE_WRITE_FIELDS, TAB_STORE_WRITE_OPS, TabStoreToolName } from '../browser/tab-store-access-protocol';`
- Old:

```ts
];

function requireString(value: unknown, name: string): string {
```

New:

```ts
    {
        name: 'tab_store_write',
        description: 'Change tab and group data through Power Browser\'s own writer. op is one of the listed operations; the other arguments are that operation\'s fields (docs/tab-store-access.md).',
        inputSchema: {
            type: 'object',
            properties: {
                op: { type: 'string', enum: [...TAB_STORE_WRITE_OPS] },
                id: { type: 'string' },
                title: { type: 'string' },
                x: { type: 'number' },
                y: { type: 'number' },
                w: { type: 'number' },
                h: { type: 'number' },
                uri: { type: 'string' },
                groupId: { type: ['string', 'null'] },
                uris: { type: 'array', items: { type: 'string' } },
                key: { type: 'string', description: 'setSetting: a settings key from docs/TAB-STORE.md' },
                value: { type: 'string', description: 'setSetting: the new value, as text' },
            },
            required: ['op'],
        },
    },
];

function requireString(value: unknown, name: string): string {
```

- Old:

```ts
            default:
                throw new Error(`unknown tool ${name}`);
```

New:

```ts
            case 'tab_store_write': {
                const op = typeof args.op === 'string' ? args.op : '';
                const fields = Object.prototype.hasOwnProperty.call(TAB_STORE_WRITE_FIELDS, op) ? TAB_STORE_WRITE_FIELDS[op] : undefined;
                if (!fields) {
                    throw new Error(`op must be one of ${TAB_STORE_WRITE_OPS.join(', ')}`);
                }
                const msg: StoreMessage = { kind: op };
                for (const field of fields) {
                    if (args[field] !== undefined) {
                        msg[field] = args[field];
                    }
                }
                const reply = await this.relay.relay(msg);
                if (!reply.ok) {
                    throw new Error(reply.message ?? `${op} failed (${reply.reason ?? 'store'})`);
                }
                return reply;
            }
            default:
                throw new Error(`unknown tool ${name}`);
```

- [ ] **Step 4: `setSetting` in chrome (decisions.md R18)**

Edit `powerbrowser/shell/PowerBrowserAPI.sys.mjs`. Old:

```js
  "searchPlaces",
]);
```

New:

```js
  "searchPlaces",
  "setSetting",
]);
```

Old:

```js
      default: {
        return { ok: false, reason: "validation", message: `handleStoreRequest: unknown kind ${String(kind)}` };
```

New:

```js
      case "setSetting": {
        const saved = await setStoreSetting(data.key, data.value);
        return { ok: true, kind, key: saved.key };
      }
      default: {
        return { ok: false, reason: "validation", message: `handleStoreRequest: unknown kind ${String(kind)}` };
```

Append to the end of the file:

```js

// NG-026 / decisions.md R18: settings writes through the one chrome writer.
// Each key's valid values are the ones docs/TAB-STORE.md ("Settings") states;
// ng-026-store-write-endpoint requires this key set to equal the doc's, so a
// setting wave A adds without a rule here goes red. Only existing rows are
// updated: a key the store does not hold is refused, never inserted.
const STORE_SETTING_RULES = {
  closed_retention_days: { valid: v => /^[1-9]\d{0,4}$/.test(v), says: "a whole number of days from 1 to 99999" },
  integrity_check_minutes: { valid: v => /^[1-9]\d{0,5}$/.test(v), says: "a whole number of minutes from 1 to 999999" },
  restore_behaviour: { valid: v => v === "session" || v === "none", says: "session or none" },
  restore_live_minutes: { valid: v => /^\d{1,5}$/.test(v), says: "a whole number of minutes from 0 to 99999" },
  restore_url_days: { valid: v => /^\d{1,5}$/.test(v), says: "a whole number of days from 0 to 99999" },
};

async function setStoreSetting(key, value) {
  const rule = typeof key === "string" && Object.prototype.hasOwnProperty.call(STORE_SETTING_RULES, key) ? STORE_SETTING_RULES[key] : null;
  if (!rule) {
    throw new Error(`setSetting: refusing unknown setting ${String(key).slice(0, 64)}`);
  }
  if (typeof value !== "string" || !rule.valid(value)) {
    throw new Error(`setSetting: refusing that value for ${key}; it must be ${rule.says}`);
  }
  const conn = await PowerBrowserAPI.openTabStore();
  const found = await conn.execute("SELECT 1 FROM settings WHERE key = :key", { key });
  if (!found.length) {
    throw new Error(`setSetting: refusing ${key}, which this store does not hold`);
  }
  await conn.execute("UPDATE settings SET value = :value WHERE key = :key", { key, value });
  return { key, value };
}
```

In `powerbrowser/INTERNAL-APIS.md`, `Sqlite` row's method cell: append `/\`setStoreSetting\` (the settings update)`.

```bash
node --check powerbrowser/shell/PowerBrowserAPI.sys.mjs && scripts/check-internals-boundary.sh
```

- [ ] **Step 4a: Align the rules with wave A's stated values (Needs: wave-a — `docs/TAB-STORE.md` "Settings" with valid values, R18)**

Compare each rule's `valid` and `says` in `STORE_SETTING_RULES` with the valid values `docs/TAB-STORE.md` states for that key. Where the doc states a different range or set, change the rule to match the doc, word for word in `says`. The default values seeded by wave A's v5 block must pass their own rule. Check with:

```bash
node -e '
const src = require("fs").readFileSync("powerbrowser/shell/PowerBrowserAPI.sys.mjs", "utf8");
const rules = eval("(" + /const STORE_SETTING_RULES = (\{[\s\S]*?\n\});/.exec(src)[1] + ")");
const seeds = [...src.matchAll(/\(\x27([a-z_]+)\x27, \x27([^\x27]*)\x27\)/g)].filter(m => m[1] in rules);
for (const [, k, v] of seeds) if (!rules[k].valid(v)) { console.log("seed fails its rule:", k, v); process.exitCode = 1; }
console.log("checked", seeds.length, "seeded defaults");'
```

Expected: `checked 5 seeded defaults` and exit 0. If the doc does not yet state valid values, keep the rules above and record `R18 values pending in docs/TAB-STORE.md` in the task report.

- [ ] **Step 5: Document the write path**

Edit `docs/tab-store-access.md`. Old:

```markdown
| `tabs_with_places` | `bookmarked` (boolean, optional), `open` (boolean, optional), `limit` (1–1000, default 200) | `{rows}`: each tab row joined to its history and bookmark, highest frecency first |
```

New:

```markdown
| `tabs_with_places` | `bookmarked` (boolean, optional), `open` (boolean, optional), `limit` (1–1000, default 200) | `{rows}`: each tab row joined to its history and bookmark, highest frecency first |
| `tab_store_write` | `op` plus that op's fields (below) | the writer's reply, for example `{ok: true, kind, id}` |
```

Insert before `## Example`:

```markdown
### `tab_store_write`: changing tab and group data

Writes go through the same Power Browser writer that Panorama uses, one operation per call, and are passed through an open Power Browser window. A tab is named by its `uri` (read it with `tabs_sql`), and a group by its `id`.

| `op` | Fields | What it changes |
|---|---|---|
| `createGroup` | `id`, `title`, `x`, `y`, `w`, `h` (all but `id` optional) | adds a group, or replaces the one with that `id` |
| `renameGroup` | `id`, `title` | a group's title (at most 60 characters) |
| `moveGroup` | `id`, `x`, `y` | a group's position on the Panorama canvas |
| `resizeGroup` | `id`, `w`, `h` | a group's size |
| `dissolveGroup` | `id` | removes the group; its tabs stay open and become ungrouped |
| `setActiveGroup` | `id` | which group is active |
| `setTabGroup` | `uri`, `groupId` (`null` to ungroup) | a tab's group |
| `setTabPosition` | `uri`, `x`, `y` | where an ungrouped tab sits on the canvas |
| `setGroupOrder` | `groupId`, `uris` | the order of a group's tabs |
| `setSetting` | `key`, `value` (text) | one store setting; `docs/TAB-STORE.md` ("Settings") lists the keys and their valid values |

An unknown tab, group or setting, or a malformed value, answers with `isError: true` and says what is allowed. Closing tabs is not a write operation. Panorama shows a change the next time it loads its groups. A setting takes effect the next time the part of Power Browser that reads it runs (for example, the restore settings at the next launch).

```

- [ ] **Step 6: Typecheck, build, run the checks**

```bash
node --check powerbrowser/shell/PowerBrowserAPI.sys.mjs
scripts/verify-platform.sh --only tab-uris-typecheck
nix develop .#theia --command bash -c 'cd theia && yarn build'
export PB_FIREFOX_BIN=$HOME/coding/Power-Browser/objdir/dist/bin/powerbrowser PB_BACKEND_MAIN=$PWD/theia/applications/browser/lib/backend/main.js
flock ~/coding/Power-Browser/.git/pb-live.lock scripts/verify-platform.sh --only ng-025-store-read-endpoint
```

Expected: every command passes, and `ng-025` lists and documents seven tools. `ng-026-store-write-endpoint` is `live-main pending` (its `setSetting` half runs in chrome). The controller runs it at merge.

- [ ] **Step 7: Call-site deletion proof (at merge, live-main)**

1. Delete the `case 'tab_store_write':` block. `ng-026` must fail with `createGroup: {"ok":false,"error":"unknown tool tab_store_write"}`.
2. Remove `...TAB_STORE_WRITE_OPS,` from `TAB_STORE_RELAY_KINDS`. It must fail with `the relay does not forward createGroup`.
3. Delete the `case "setSetting":` arm. It must fail with `setSetting restore_live_minutes=…`.
4. Delete the `if (typeof value !== "string" || !rule.valid(value))` block. It must fail with `setSetting accepted`.

Record all four in the report.

- [ ] **Step 8: Commit gate and commit**

```bash
git add theia/extensions/tab-uris/src/browser/tab-store-access-protocol.ts theia/extensions/tab-uris/src/node/tab-store-access-endpoint.ts docs/tab-store-access.md \
  powerbrowser/shell/PowerBrowserAPI.sys.mjs powerbrowser/INTERNAL-APIS.md
node scripts/scan-brand-residue.mjs
scripts/verify-platform.sh --quick 2>&1 | sed -n '/^verify-platform: summary/,$p' | grep ': FAIL$' | awk '{print $1}' | sed 's/:$//' | sort | comm -13 docs/non-gui/quick-baseline.txt -
git commit -m "feat(ng-b): documented tab and group write path through the chrome writer" -m "Refs: NG-026"
```

---

### Task 7: Saved page copy (NG-028)

**Needs:** wave-a (all of wave A merged: the migration chain in A9 and A10, the doc page in A11, the resolver in A4, the key rule in A2), and wave-c (NG-040 merged, C2). This task edits wave A's migration chain, so it comes after Tasks 1–6.

**Rows:** NG-028

**Files:**
- Modify: `powerbrowser/shell/PowerBrowserAPI.sys.mjs`. Wave A's region gets: `TAB_STORE_SCHEMA_HEAD` goes from 5 to 6, one marker block `TAB_STORE_V6_DDL` right after wave A's `TAB_STORE_V5_DDL`, one method `migrateTabStoreToV6` right after `migrateTabStoreToV5`, and one entry in the `steps` array of `migrateTabStoreToHead`. The quarantine rebuild runs that same chain, so nothing else changes there. The end-of-file section gets: the kind, `savePageCopy` and its helpers.
- Modify: `powerbrowser/INTERNAL-APIS.md` (three new rows; the `Sqlite` and `PrivateBrowsingUtils` method cells; line renumbering)
- Modify: `theia/extensions/tab-uris/src/browser/chrome-store-client.ts`
- Create: `theia/extensions/tab-uris/src/browser/save-page-copy-command.ts`
- Replace: `theia/extensions/tab-uris/src/browser/tab-store-access-frontend-module.ts`
- Modify: `docs/TAB-STORE.md` (A11: the head line, the schema table, a `## v6` section)
- Modify: `scripts/verify-gui08-persistence-roundtrip.mjs` (A10: `EXPECTED_SCHEMA_HEAD = 5` becomes `6`)

**Interfaces:**
- Consumes: A2 (`WebTabWidget.rowKey` for the palette path; stock keys arrive as an argument), A3, A4 (`findTabBrowserForUri(uri) → { win, tab, browser } | null`), A9 (`TAB_STORE_SCHEMA_HEAD = 5`, `migrateTabStoreToHead`'s `steps`, `migrateTabStoreToV5` stamping exactly 5, and the `PB-SQL-V<N>-DDL` marker naming that `versionBlocks()` reads positionally), A10, A11. `PowerBrowserAPI.getProfileDir()`, `lazy.PrivateBrowsingUtils.isBrowserPrivate`, `IOUtils`, `PathUtils`. Task 3's `handleStoreRequest`, `ChromeStoreClient.request`, and the frontend module. `ApplicationShell.currentWidget`, `MessageService`.
- Produces: schema version 6 with the table `saved_pages(tab_uri TEXT PRIMARY KEY, dir TEXT, url TEXT, title TEXT, saved_at INTEGER, bytes INTEGER)`. Chrome `savePageCopy(uri) → Promise<{ dir, bytes }>`: the copy goes to `<profile>/saved-pages/<id>/page.html` plus `page_files/`, with one row per tab, and the newest copy replaces the older one, files included. The actor kind is `savePageCopy {uri}`. `ChromeStoreClient.savePageCopy(uri) → Promise<SavedPageCopy>`. The command `powerbrowser.tab.savePageCopy` ("Save Page Copy") takes an optional row key; without one it saves the current in-shell web tab (`WebTabWidget.rowKey`). It resolves `SavedPageCopy | undefined`.

If wave A's head has moved past 5 by the time this task runs, `grep -n 'const TAB_STORE_SCHEMA_HEAD' powerbrowser/shell/PowerBrowserAPI.sys.mjs` shows it. Use that value H wherever this task says 5, and H+1 wherever it says 6.

- [ ] **Step 0: Pull and confirm the preconditions**

```bash
cd ~/coding/Power-Browser-ng-b && git pull --no-rebase ~/coding/Power-Browser main
grep -n 'const TAB_STORE_SCHEMA_HEAD' powerbrowser/shell/PowerBrowserAPI.sys.mjs
scripts/check-internals-boundary.sh --catalogue
```

Expected: the head line prints. The catalogue passes (C2); if it does not, stop and report, because the renumbering below assumes a green start.

- [ ] **Step 1: The failing check** is `ng-028-saved-page-copy` (live-main). It fails because the command `powerbrowser.tab.savePageCopy` does not exist.

- [ ] **Step 2: The table (wave A's region, following A9)**

Insert directly after wave A's `TAB_STORE_V5_DDL` constant (the one ending `/* PB-SQL-V5-DDL-END */;`). `versionBlocks()` reads the marker blocks in file order as versions 1…head, so the block must come after v5 and its name must match `[A-Z0-9]+`:

```js
// NG-028 (non-GUI wave B): v6, one saved full-page copy per tab; the newest
// copy replaces the older one, files included. dir is the copy's directory
// under <profile>/saved-pages/, and savePageCopy never deletes a dir outside it.
const TAB_STORE_V6_DDL = /* PB-SQL-V6-DDL-START */ `CREATE TABLE IF NOT EXISTS saved_pages (
  tab_uri     TEXT PRIMARY KEY CHECK(length(tab_uri) > 0),
  dir         TEXT NOT NULL,
  url         TEXT NOT NULL,
  title       TEXT NOT NULL DEFAULT '',
  saved_at    INTEGER NOT NULL CHECK(saved_at >= 0),
  bytes       INTEGER NOT NULL CHECK(bytes >= 0)
)` /* PB-SQL-V6-DDL-END */;
```

Change `const TAB_STORE_SCHEMA_HEAD = 5;` to `const TAB_STORE_SCHEMA_HEAD = 6;`. Wave A's `migrateTabStoreToV5` already stamps exactly 5 ("a later head adds its own step after this one"), so it stays as it is.

Insert directly after the `migrateTabStoreToV5` method:

```js
  /**
   * NG-028 (non-GUI wave B): v5 to v6, the saved_pages table. The same shape
   * as the v5 step: the marker block's statements run in one transaction, the
   * CREATE is IF NOT EXISTS, so a store whose work is already done re-runs as
   * a no-op that stamps 6.
   */
  async migrateTabStoreToV6(conn) {
    const statements = TAB_STORE_V6_DDL.split(";").map(s => s.trim()).filter(Boolean);
    if (!statements.some(s => /^create table if not exists saved_pages\b/i.test(s))) {
      throw new Error("migrateTabStoreToV6: DDL marker content missing the saved_pages table");
    }
    await conn.executeTransaction(async () => {
      for (const statement of statements) {
        await conn.execute(statement);
      }
      // Exactly 6; a later head adds its own step after this one.
      await conn.setSchemaVersion(6);
    });
  },
```

In `migrateTabStoreToHead`, old:

```js
      PowerBrowserAPI.migrateTabStoreToV5,
    ];
```

New:

```js
      PowerBrowserAPI.migrateTabStoreToV5,
      PowerBrowserAPI.migrateTabStoreToV6,
    ];
```

The guard `steps.length !== TAB_STORE_SCHEMA_HEAD` then holds at 6. `openTabStore` and the quarantine rebuild both run `migrateTabStoreToHead`, so a rebuilt store lands at v6 too.

- [ ] **Step 3: The capture (end-of-file section)**

Edit the kinds Set. Old:

```js
  "setSetting",
]);
```

New:

```js
  "setSetting",
  "savePageCopy",
]);
```

Old:

```js
      default: {
        return { ok: false, reason: "validation", message: `handleStoreRequest: unknown kind ${String(kind)}` };
```

New:

```js
      case "savePageCopy": {
        const saved = await savePageCopy(data.uri);
        return { ok: true, kind, dir: saved.dir, bytes: saved.bytes };
      }
      default: {
        return { ok: false, reason: "validation", message: `handleStoreRequest: unknown kind ${String(kind)}` };
```

Append to the end of the file:

```js

// NG-028: a full saved copy of a tab's page -- the document plus the images,
// styles and scripts it loaded, written the way the browser's own "Save Page
// As, Web Page, complete" writes them (upstream/toolkit/content/
// contentAreaUtils.js internalPersist) -- into
// <profile>/saved-pages/<id>/page.html and page_files/, with one saved_pages
// row per tab. The directory is minted here, never taken from the caller.
const SAVED_PAGES_DIR = "saved-pages";

function persistDocument(browser) {
  return new Promise((resolve, reject) => {
    browser.frameLoader.startPersistence(null, {
      onDocumentReady: resolve,
      onError: status => reject(new Error(`savePageCopy: the page could not be read (status ${status})`)),
    });
  });
}

function writePersistedDocument(doc, pageFile, filesDir) {
  const wbp = Ci.nsIWebBrowserPersist;
  const wpl = Ci.nsIWebProgressListener;
  return new Promise((resolve, reject) => {
    const persist = Cc["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"].createInstance(wbp);
    persist.persistFlags = wbp.PERSIST_FLAGS_REPLACE_EXISTING_FILES | wbp.PERSIST_FLAGS_FROM_CACHE | wbp.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION;
    persist.progressListener = {
      QueryInterface: ChromeUtils.generateQI(["nsIWebProgressListener"]),
      onStateChange(_progress, _request, flags, status) {
        if (flags & wpl.STATE_STOP && flags & wpl.STATE_IS_NETWORK) {
          if (status === 0) {
            resolve();
          } else {
            reject(new Error(`savePageCopy: writing the copy failed (status ${status})`));
          }
        }
      },
      onProgressChange() {},
      onLocationChange() {},
      onStatusChange() {},
      onSecurityChange() {},
      onContentBlockingEvent() {},
    };
    persist.saveDocument(doc, pageFile, filesDir, "text/html", wbp.ENCODE_FLAGS_ENCODE_BASIC_ENTITIES | wbp.ENCODE_FLAGS_DISALLOW_LINE_BREAKING, 80);
  });
}

async function directoryBytes(path) {
  let total = 0;
  for (const child of await IOUtils.getChildren(path)) {
    const info = await IOUtils.stat(child);
    total += info.type === "directory" ? await directoryBytes(child) : info.size;
  }
  return total;
}

async function savePageCopy(uri) {
  if (typeof uri !== "string" || !uri || uri.length > 8192) {
    throw new Error("savePageCopy: refusing a missing or oversized uri");
  }
  const found = PowerBrowserAPI.findTabBrowserForUri(uri);
  if (!found || !found.browser) {
    throw new Error("savePageCopy: unknown tab");
  }
  const { browser } = found;
  if (lazy.PrivateBrowsingUtils.isBrowserPrivate(browser)) {
    throw new Error("savePageCopy: refusing a private tab");
  }
  const url = browser.currentURI ? browser.currentURI.spec : "";
  if (!/^https?:\/\//.test(url)) {
    throw new Error("savePageCopy: refusing a page that is not http or https");
  }
  const profile = PowerBrowserAPI.getProfileDir();
  if (!profile) {
    throw new Error("savePageCopy: unknown profile directory");
  }
  const root = PathUtils.join(profile, SAVED_PAGES_DIR);
  const dir = PathUtils.join(root, `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);
  await IOUtils.makeDirectory(dir, { createAncestors: true });
  try {
    const doc = await persistDocument(browser);
    await writePersistedDocument(doc, IOUtils.getFile(dir, "page.html"), IOUtils.getFile(dir, "page_files"));
  } catch (err) {
    await IOUtils.remove(dir, { recursive: true, ignoreAbsent: true });
    throw err;
  }
  const bytes = await directoryBytes(dir);
  const conn = await PowerBrowserAPI.openTabStore();
  let previous = null;
  await conn.executeTransaction(async () => {
    const old = await conn.execute("SELECT dir FROM saved_pages WHERE tab_uri = :uri", { uri });
    previous = old.length ? old[0].getResultByName("dir") : null;
    await conn.execute(
      `INSERT INTO saved_pages (tab_uri, dir, url, title, saved_at, bytes) VALUES (:uri, :dir, :url, :title, :savedAt, :bytes)
       ON CONFLICT (tab_uri) DO UPDATE SET dir = excluded.dir, url = excluded.url, title = excluded.title,
         saved_at = excluded.saved_at, bytes = excluded.bytes`,
      { uri, dir, url, title: browser.contentTitle || "", savedAt: Date.now(), bytes }
    );
  });
  // Only a directory this code minted under saved-pages/ is ever removed.
  if (previous && previous !== dir && previous.startsWith(root + "/")) {
    await IOUtils.remove(previous, { recursive: true, ignoreAbsent: true });
  }
  return { dir, bytes };
}
```

```bash
node --check powerbrowser/shell/PowerBrowserAPI.sys.mjs && scripts/check-internals-boundary.sh
```

- [ ] **Step 4: The command**

Edit `theia/extensions/tab-uris/src/browser/chrome-store-client.ts`:
- Old `/** One history or bookmark match for the address bar (NG-023). */` → new:

```ts
/** A saved page copy (NG-028): its directory under <profile>/saved-pages/ and its size. */
export interface SavedPageCopy {
    dir: string;
    bytes: number;
}

/** A page capture writes files; it gets longer than a read. */
export const SAVE_PAGE_ACK_TIMEOUT_MS = 120000;

/** One history or bookmark match for the address bar (NG-023). */
```

- Old `    /** NG-023: http(s) history and bookmark matches for typed text, bookmarks first. */` → new:

```ts
    /** NG-028: stores a full copy of the tab's page; rejects with chrome's reason. */
    async savePageCopy(uri: string): Promise<SavedPageCopy> {
        const reply = await this.request({ kind: 'savePageCopy', uri }, SAVE_PAGE_ACK_TIMEOUT_MS);
        if (!reply.ok) {
            throw new Error(reply.message ?? `savePageCopy failed (${reply.reason ?? 'store'})`);
        }
        return { dir: String(reply.dir), bytes: Number(reply.bytes) };
    }

    /** NG-023: http(s) history and bookmark matches for typed text, bookmarks first. */
```

Create `theia/extensions/tab-uris/src/browser/save-page-copy-command.ts`:

```ts
/**
 * NG-028 (non-GUI wave B): Save Page Copy. Stores a full copy of a tab's page
 * (the document and the files it loaded) in the profile, recorded in the
 * saved_pages table. From the command palette it saves the current in-shell
 * web tab; a caller may pass any tab's row key (tabs.uri) instead.
 */
import { inject, injectable } from '@theia/core/shared/inversify';
import { Command, CommandContribution, CommandRegistry, MessageService } from '@theia/core/lib/common';
import { ApplicationShell } from '@theia/core/lib/browser';
import { ChromeStoreClient, SavedPageCopy } from './chrome-store-client';
import { WebTabWidget } from './web-tab';

export const SAVE_PAGE_COPY_COMMAND: Command = { id: 'powerbrowser.tab.savePageCopy', label: 'Save Page Copy' };

@injectable()
export class SavePageCopyCommandContribution implements CommandContribution {
    @inject(ChromeStoreClient)
    protected readonly store: ChromeStoreClient;

    @inject(ApplicationShell)
    protected readonly shell: ApplicationShell;

    @inject(MessageService)
    protected readonly messages: MessageService;

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(SAVE_PAGE_COPY_COMMAND, { execute: (uri?: unknown) => this.save(uri) });
    }

    protected async save(uri?: unknown): Promise<SavedPageCopy | undefined> {
        const target = typeof uri === 'string' && uri ? uri : this.currentTabUri();
        if (!target) {
            void this.messages.warn('Power Browser can only save a web page. Select a web tab, then run Save Page Copy again.');
            return undefined;
        }
        try {
            return await this.store.savePageCopy(target);
        } catch {
            void this.messages.error("Power Browser couldn't save a copy of this page. Reload the page, then run Save Page Copy again.");
            return undefined;
        }
    }

    /** The current in-shell web tab's row key (docs/TAB-STORE.md, "Row keys"); other tabs hold no page. */
    protected currentTabUri(): string | undefined {
        const widget = this.shell.currentWidget;
        return widget instanceof WebTabWidget && widget.rowKey ? widget.rowKey : undefined;
    }
}
```

Replace `theia/extensions/tab-uris/src/browser/tab-store-access-frontend-module.ts` with:

```ts
/**
 * Non-GUI wave B: frontend composition for Theia's chrome-store reader
 * (NG-021..NG-024), the endpoint relay (NG-025/NG-026) and Save Page Copy
 * (NG-028). Its own package.json entry, so tab-uris-frontend-module.ts stays
 * untouched. Static binds only (D-50).
 */
import { ContainerModule } from '@theia/core/shared/inversify';
import { CommandContribution } from '@theia/core/lib/common';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { ChromeStoreClient } from './chrome-store-client';
import { SavePageCopyCommandContribution } from './save-page-copy-command';
import { TabStoreRelayContribution } from './tab-store-relay-contribution';

export default new ContainerModule(bind => {
    bind(ChromeStoreClient).toSelf().inSingletonScope();
    bind(TabStoreRelayContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(TabStoreRelayContribution);
    bind(SavePageCopyCommandContribution).toSelf().inSingletonScope();
    bind(CommandContribution).toService(SavePageCopyCommandContribution);
});
```

- [ ] **Step 5: Catalogue the three new internals and renumber**

```bash
scripts/check-internals-boundary.sh --catalogue
```

Expected output: `FAIL -- N occurrence(s) with no catalogue row: …`. The list holds the three new lines (`const wbp = Ci.nsIWebBrowserPersist;`, `const wpl = Ci.nsIWebProgressListener;` and the `Cc["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"]` line), plus every older occurrence that Step 2's inserts in wave A's region pushed down. If wave C's NG-039 widened the guard's patterns (for example to `IOUtils.` or `ChromeUtils.generateQI`), the list also names those lines in this wave's end-of-file section. Give each one a row in the same saved-page shape, naming the internal on that line and the function that uses it. For each older one, find the row whose internal and method match the code now on that line, and change only its line number. Then insert these three rows at the end of the Touchpoints table (directly above the blank line before `## Deliberately not touched`), with `<line>` replaced by each occurrence's number from the output:

```markdown
| `Ci.nsIWebBrowserPersist` | `PowerBrowserAPI.sys.mjs:<line>` | `writePersistedDocument` (backs `savePageCopy`) | Added by non-GUI wave B (NG-028): the persist interface whose flag and encoding constants (`PERSIST_FLAGS_*`, `ENCODE_FLAGS_*`) the saved-page writer reads, held in one local so the constants are named on this line only. | **Saved-page row.** Read-only constants. A copy is written only for an http(s) page in a non-private tab, only under `<profile>/saved-pages/`, and only when the shell's Theia frame asks through the actor (`handleStoreRequest` behind `groupSenderIsTheia` and `storeSenderInShellWindow`). |
| `Ci.nsIWebProgressListener` | `PowerBrowserAPI.sys.mjs:<line>` | `writePersistedDocument` (backs `savePageCopy`) | Added by non-GUI wave B (NG-028): the `STATE_STOP`/`STATE_IS_NETWORK` constants that tell the end of the whole save from a per-file transition. | Same saved-page row. Read-only constants. |
| `Cc["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"]` | `PowerBrowserAPI.sys.mjs:<line>` | `writePersistedDocument` (backs `savePageCopy`) | Added by non-GUI wave B (NG-028): creates the persist object -- the component the browser's own Save Page As uses (`upstream/toolkit/content/contentAreaUtils.js` `makeWebBrowserPersist`) -- and hands it the document from `browser.frameLoader.startPersistence`. | Same saved-page row. It writes files under `<profile>/saved-pages/<id>/` only; the directory is minted chrome-side, never taken from the caller, and a replaced copy is deleted only when its path is inside `saved-pages/`. |
```

In the `Sqlite` row's method cell, append `/\`savePageCopy\` (the saved_pages upsert)`. In the `PrivateBrowsingUtils` row's method cell, change `backs \`writeTabRow\`` to `backs \`writeTabRow\` and \`savePageCopy\``. Re-run until it passes:

```bash
scripts/check-internals-boundary.sh --catalogue
```

Expected: `internals-catalogue: PASS`.

- [ ] **Step 6: Wave A's schema docs and checks**

Edit `docs/TAB-STORE.md` (A11). Old heading `## Schema at head (\`user_version = 5\`)` → new `## Schema at head (\`user_version = 6\`)`. In that section's table, after the `settings` row, add:

```markdown
| `saved_pages` | `tab_uri` | TEXT PRIMARY KEY | v6 | The saved tab's row key (`tabs.uri`); one copy per tab |
| `saved_pages` | `dir` | TEXT NOT NULL | v6 | The copy's directory under `<profile>/saved-pages/` |
| `saved_pages` | `url`, `title` | TEXT NOT NULL | v6 | The page's address and title when it was saved |
| `saved_pages` | `saved_at` | INTEGER NOT NULL | v6 | When it was saved (ms since epoch) |
| `saved_pages` | `bytes` | INTEGER NOT NULL | v6 | The copy's size on disk |
```

Insert after the `## v5` section (before `## Migrations`):

```markdown
## v6

The `saved_pages` table: one full saved copy per tab, written by Save Page
Copy (`tab_uri`, `dir`, `url`, `title`, `saved_at`, `bytes`). The page is
`page.html` in `dir`, and the files it loaded are in `page_files/`. Saving a
tab again replaces its copy, files included. A copy is not pruned with its
tab's row: to remove one, delete its directory and its row together.
```

Edit `scripts/verify-gui08-persistence-roundtrip.mjs` (A10). Old `const EXPECTED_SCHEMA_HEAD = 5;` → new `const EXPECTED_SCHEMA_HEAD = 6;`. Then run:

```bash
scripts/verify-platform.sh --only ng-019-tab-store-doc
scripts/verify-platform.sh --only gui08-persistence-roundtrip
scripts/verify-platform.sh --quick 2>&1 | sed -n '/^verify-platform: summary/,$p' | grep ': FAIL$'
```

Expected: `gui08-persistence-roundtrip` passes. `ng-019-tab-store-doc` passes, or fails only on the two `.planning` pointer lines that wave A's Q3 leaves to the controller. If some other check names the schema head, a marker or a missing v5 fixture, it hand-keeps a value A10 did not list. Update it the same way in this commit, and name it in the commit body.

- [ ] **Step 7: Typecheck and build**

```bash
node --check powerbrowser/shell/PowerBrowserAPI.sys.mjs
scripts/verify-platform.sh --only tab-uris-typecheck
nix develop .#theia --command bash -c 'cd theia && yarn build'
```

Expected: all pass. `ng-028-saved-page-copy` is `live-main pending`. The controller also runs wave A's live migration and restart checks at merge.

- [ ] **Step 8: Call-site deletion proof (at merge, live-main)**

Delete the `case "savePageCopy":` arm, and `ng-028` must fail with `Save Page Copy did not report a saved copy`. Delete the `previous.startsWith(root + "/")` removal block, and `ng-028` must fail with `the first copy was not replaced`. Record this in the report.

- [ ] **Step 9: Commit gate and commit**

```bash
git status --short -- scripts/
git add powerbrowser/shell/PowerBrowserAPI.sys.mjs powerbrowser/INTERNAL-APIS.md theia/extensions/tab-uris/src/browser/chrome-store-client.ts \
  theia/extensions/tab-uris/src/browser/save-page-copy-command.ts theia/extensions/tab-uris/src/browser/tab-store-access-frontend-module.ts \
  docs/TAB-STORE.md scripts/verify-gui08-persistence-roundtrip.mjs
node scripts/scan-brand-residue.mjs
scripts/verify-platform.sh --quick 2>&1 | sed -n '/^verify-platform: summary/,$p' | grep ': FAIL$' | awk '{print $1}' | sed 's/:$//' | sort | comm -13 docs/non-gui/quick-baseline.txt -
git commit -m "feat(ng-b): Save Page Copy stores a full copy of a tab's page (schema v6)" -m "Refs: NG-028"
```

Expected: `git status` lists only `scripts/verify-gui08-persistence-roundtrip.mjs`, plus any check Step 6 found. `git add` that extra file by name as well.

---

### Task 8: Readers without a runtime caller are deleted (NG-027)

**Needs:** wave-a (all of wave A merged: its regions of `PowerBrowserAPI.sys.mjs` and `tab-query-service.ts`, its roundtrip script), and wave-c (NG-040 merged, C2). This is the last task.

**Rows:** NG-027

**Files:**
- Modify: `powerbrowser/shell/PowerBrowserAPI.sys.mjs` (wave A's region: delete the dead readers)
- Modify: `theia/extensions/tab-uris/src/node/tab-query-service.ts` (delete the dead readers and any import they alone used)
- Modify: `theia/extensions/tab-uris/src/browser/group-query-service.ts` (drop `getThumbnail`)
- Modify: `scripts/verify-gui08-persistence-roundtrip.mjs` (`EXPECTED_GROUP_METHODS`)
- Modify: `scripts/verify-web-tab-live.mjs` (the thumbnail seam)
- Modify: `powerbrowser/INTERNAL-APIS.md` (the `Sqlite` row's method cell, and renumbering)
- Modify: `docs/TAB-STORE.md` (A11: the "Reader contract" method list)

**Interfaces:**
- Consumes: A8 (the `thumbnail` column on the rows of `listUngroupedTabs` and `getGroupTabs`; wave A's `read(...)` wrapper around each TabQueryService method, so a whole method body goes with its method; `getSettings`), A10 (`EXPECTED_GROUP_METHODS`, which after wave A also lists `'setGroupOrder'`), A11 ("Reader contract" names `listGroups`, `getGroupTabs`, `listUngroupedTabs`, `getThumbnail` and `getSettings`), C2, and the Task 1 check `ng-027-reader-callers`. Wave A deletes `browser-tab-uri.ts` and TabQueryService's `browserTabKeyOf` import itself (its Q1 item 7), so no import cleanup is left here.
- Produces: no new names. After this task every reader the check derives has a runtime caller.

- [ ] **Step 0: Pull and derive the dead list**

```bash
cd ~/coding/Power-Browser-ng-b && git pull --no-rebase ~/coding/Power-Browser main
scripts/check-internals-boundary.sh --catalogue
scripts/verify-platform.sh --only ng-027-reader-callers
```

Expected: the catalogue passes (C2). The NG-027 check fails, naming the readers still dead after wave A and Tasks 3–5. Expect `readTabRow`, `listTabRows`, `listGroupRows`, `getGroupTabs` (PowerBrowserAPI) and `getByUri`, `getBrowserTabByUrl`, `listByRecency`, `getThumbnail` (TabQueryService), minus any reader wave A gave a caller.

- [ ] **Step 1: Apply the decision table**

For each name the check prints, apply the NG-027 decision table above. A name missing from the table gets the same rule: delete it unless a runtime consumer is the row's point. Record each decision in the commit body.

In `powerbrowser/shell/PowerBrowserAPI.sys.mjs`, delete each dead method with its doc comment: `readTabRow`, `listTabRows`, `listGroupRows` and `getGroupTabs`, each from its `/**` down to its closing `},`.

In `theia/extensions/tab-uris/src/node/tab-query-service.ts`, delete `getByUri`, `getBrowserTabByUrl`, `listByRecency` and `getThumbnail`, each with its doc comment and its whole body (after wave A, each body is one `this.read('<name>', …)` call).

In `theia/extensions/tab-uris/src/browser/group-query-service.ts`, delete the line `    getThumbnail(uri: string): Promise<string | undefined>;`.

In `scripts/verify-gui08-persistence-roundtrip.mjs`, delete the lines `    'listGroupRows',` and `    'getGroupTabs',` from `EXPECTED_GROUP_METHODS`.

In `scripts/verify-web-tab-live.mjs`, old:

```js
        P.thumbnailOf = uri => groups.getThumbnail(uri);
```

New:

```js
        // NG-027 deleted the point read; the row readers carry the same column.
        P.thumbnailOf = async uri => {
            const loose = (await groups.listUngroupedTabs()).find(row => row.uri === uri);
            if (loose) return loose.thumbnail ?? undefined;
            for (const group of await groups.listGroups()) {
                const row = (await groups.getGroupTabs(group.id)).find(r => r.uri === uri);
                if (row) return row.thumbnail ?? undefined;
            }
            return undefined;
        };
```

In `powerbrowser/INTERNAL-APIS.md`, remove each deleted PowerBrowserAPI reader (for example `` `readTabRow`/`listTabRows` ``) from the `Sqlite` row's method cell.

In `docs/TAB-STORE.md`, "Reader contract", old:

```markdown
`listUngroupedTabs`, `getThumbnail` and `getSettings` over the group
```

New (drop `getSettings` too if the Step 0 derivation found it dead and it was deleted):

```markdown
`listUngroupedTabs` and `getSettings` over the group
```

- [ ] **Step 2: Renumber the catalogue**

```bash
node --check powerbrowser/shell/PowerBrowserAPI.sys.mjs
scripts/check-internals-boundary.sh --catalogue
```

The deletions moved every later occurrence up. For each `PowerBrowserAPI.sys.mjs:N` the output names, find the row whose internal and method match the code now on line N, and change only its number. Re-run until it prints `internals-catalogue: PASS`.

- [ ] **Step 3: Verify**

```bash
scripts/verify-platform.sh --only ng-027-reader-callers
scripts/verify-platform.sh --only ng-027-reader-callers-self-test
scripts/verify-platform.sh --only gui08-persistence-roundtrip
scripts/verify-platform.sh --only gui08-view-parity
scripts/verify-platform.sh --only gui06-chrome-bar-suggestions
scripts/verify-platform.sh --only ng-019-tab-store-doc
scripts/verify-platform.sh --only tab-uris-typecheck
nix develop .#theia --command bash -c 'cd theia && yarn build'
```

Expected: every line passes. `ng-027-reader-callers: PASS -- N readers, every one called on the runtime path`. `gui02-web-tab-live` (its thumbnail seam changed) is `live-main pending`, and the controller runs it at merge.

- [ ] **Step 4: Call-site deletion proof**

Comment out the only runtime call of `searchByPrefix` in `theia/extensions/chrome-bar/src/node/chrome-bar-suggestion-service-impl.ts` (`return this.tabs.searchByPrefix(…)` becomes `return [];`). `ng-027-reader-callers` must fail, naming `searchByPrefix`. Restore with `git checkout -- theia/extensions/chrome-bar/src/node/chrome-bar-suggestion-service-impl.ts`.

- [ ] **Step 5: Commit gate and commit**

```bash
git add powerbrowser/shell/PowerBrowserAPI.sys.mjs powerbrowser/INTERNAL-APIS.md theia/extensions/tab-uris/src/node/tab-query-service.ts \
  theia/extensions/tab-uris/src/browser/group-query-service.ts scripts/verify-gui08-persistence-roundtrip.mjs scripts/verify-web-tab-live.mjs \
  docs/TAB-STORE.md
node scripts/scan-brand-residue.mjs
scripts/verify-platform.sh --quick 2>&1 | sed -n '/^verify-platform: summary/,$p' | grep ': FAIL$' | awk '{print $1}' | sed 's/:$//' | sort | comm -13 docs/non-gui/quick-baseline.txt -
git commit -m "fix(ng-b): delete readers with no caller on the runtime path" -m "Refs: NG-027"
```

Expected: the gate prints nothing. The wave's quick NG check is now green.

---

## Merge notes for the controller

- Merge wave B after wave A. If wave C's NG-038 is not on `main` when B merges, B's hostile-page assertions still pass, because B's own `storeSenderInShellWindow` wall refuses stock tabs. Tasks 7 and 8 need wave C's NG-040 first.
- At merge, run every live-main label in `docs/non-gui/checks-wave-b.tsv` under the lock, plus `gui02-web-tab-live` (whose seams Tasks 5 and 8 changed) and wave A's live migration and restart checks (Task 7 added schema version 6).
- The call-site deletion proofs marked "at merge" are listed in each task's report. The controller runs them with the final reviewer (program Task 10).
