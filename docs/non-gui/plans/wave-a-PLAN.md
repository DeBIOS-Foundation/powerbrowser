# Wave A: Tab Identity and Store Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build rows NG-001 to NG-020: one row per tab in `tabs.sqlite`, keyed by the tab's identity instead of its page URL, carried from every older schema; closed-tab history, content age and a settings table; a reader that reports errors; quarantine and integrity checks that do what MIGRATIONS.md says; and checks that run the real code.

**Architecture:** The chrome-side writer (`PowerBrowserAPI.sys.mjs`) moves to schema v5. The row key follows one rule, `<kind>:<identity>`, for every tab kind, and the page URL becomes an ordinary column. A v4 to v5 migration rewrites old keys in place, so group, position, order and thumbnail stay on their rows. Closing a tab sets `closed_at` instead of deleting the row. The prune deletes only closed rows, so an open tab's row is never pruned. The Theia side computes the same key (`tabKeyOf`), writes rows for editors and terminals through new actor kinds, and shows grouped tabs that are not open as Panorama cards that reopen through the opener. Task 1 writes one failing check per row. Task 2 is the key-rule slice that merges first, because waves B and C build on its schema.

**Tech Stack:** Gecko chrome ESM (`PowerBrowserAPI.sys.mjs`, mozStorage `Sqlite.sys.mjs`, `SessionStore` custom tab values), Theia 1.74.1 extensions `@powerbrowser/tab-uris` and `@powerbrowser/modes` (TypeScript, inversify, `better-sqlite3` read-only), Node 24 `node:sqlite` for fixtures, WebDriver BiDi through `scripts/lib/firefox-bidi.mjs`, `scripts/verify-platform.sh`.

**Spec:** `docs/non-gui/GAPS.md` rows NG-001 to NG-020 (evidence re-checked against `b3f95b7`; see "Evidence notes"), `docs/non-gui/decisions.md`, program plan `~/coding/GUI-research/docs/superpowers/plans/2026-09-25-powerbrowser-non-gui.md` (G1 to G11, Review Focus), `.planning/notes/tab-sql-substrate.md`, `.planning/milestones/v1.2-phases/11-sql-store-design/schema/SCHEMA.md` and `MIGRATIONS.md`, `docs/URI-SCHEMES.md`, PowerBrowser `CLAUDE.md`.

## Global Constraints

- G1: wave clone `~/coding/Power-Browser-ng-a`, branch `ng-a`. Theia install is `nix develop .#theia --command bash -c 'cd theia && yarn install --ignore-scripts --frozen-lockfile && (cd node_modules/drivelist && node-gyp rebuild) && yarn build'`. Never run a bare `yarn install`.
- G2: no Theia core edit, and `upstream/` is never edited. Firefox internals only in `PowerBrowserAPI.sys.mjs`. Brand tokens only in `inventory/brand-tokens.json`; stage new files before `node scripts/scan-brand-residue.mjs`. Every check is a row in `scripts/verify-platform.sh`. No internal identifier in user-facing text. One SQLite writer, chrome-side.
- G3: never edit `ledger/`, `docs/non-gui/GAPS.md` or `.planning/`. `git diff --name-only main...ng-a -- ledger docs/non-gui/GAPS.md .planning` prints nothing.
- G4: chrome-side changes are live only in the main checkout (`objdir/dist/bin` symlinks into main's `powerbrowser/`). A `live-main` check runs in main after merge, under `flock ~/coding/Power-Browser/.git/pb-live.lock`. A `live-clone` check runs in the clone with `PB_FIREFOX_BIN=$HOME/coding/Power-Browser/objdir/dist/bin/powerbrowser PB_BACKEND_MAIN=$PWD/theia/applications/browser/lib/backend/main.js`, under the same lock.
- G6: every check drives the behaviour through a real entry point: an actor message sent from the Theia frame, a DI-bound service, a command, a card double-click, or a real quit and relaunch on the same profile. No check calls a `PowerBrowserAPI` method directly.
- G8: commits are `feat(ng-a): …`, `test(ng-a): …` or `fix(ng-a): …`, with the body `Refs: NG-NNN[, NG-NNN…]`. One commit per task. Every `git add` names its paths.
- G10: this plan cites 20 IDs, NG-001 to NG-020.
- G11: this wave edits `PowerBrowserAPI.sys.mjs` only from `browserTabKey` to `getGroupTabs` (:780–1675), in `handleGroupMutation` (:1719–1950), in the prune, integrity, sessionstore, quarantine, sweep and trigger block (:2038–2396), and in the row writes of `webTabOpen` (:2397–2529). It also edits the store constants at :45–109, which decisions.md R2 grants to wave A.
- Brand-scan trap: never write the plan-file suffix (dash, PLAN, .md) literally in any tracked file, and never add a new occurrence in code comments.
- Environment: live checks need `objdir/dist/bin/powerbrowser` and a built `theia/` app. Rebuild Theia after every Theia-side change with `nix develop .#theia --command bash -c 'cd theia && yarn build'`. While you develop in the clone, set `PB_NG_ALLOW_DIRTY=1`: the live harness refuses a tree with uncommitted work unless that variable is set (Review Focus).

## Review Focus

- **An existing profile at v1, v2, v3 or v4.** The migration must carry every row's group, position, order, thumbnail, title and URL onto the new key. NG-015's check (Task 2) runs the real writer at startup on fixtures of every shipped version, on the committed phase-11 `tabs-v1.sqlite`, and on a copy of Chris's real profile store: `PB_REAL_PROFILE_FIXTURE` names it (decisions.md R7: schema v4, 6 tabs, 5 groups, 0 grouped). When the variable is unset, the check prints a notice and skips that fixture. It matches rows by `rowid`.
- **A restart.** Group and position must survive a real quit and relaunch on the same profile, and the backend port changes between launches (`TheiaService.sys.mjs:602`). NG-007, NG-008 and NG-017 relaunch on a kept profile. NG-007 and NG-008 also assert that the port differed.
- **Two tabs on one URL, and a navigation.** Each must keep its own row. NG-002 and NG-003 drive this through the opener and a link click inside the overlay.
- **A store that is corrupt, unopenable, or newer than the build.** Corrupt or unopenable stores are quarantined and rebuilt at the head. A newer store is left untouched. The reader reports each case instead of answering empty. NG-012, NG-013, NG-014 and NG-018 cover this; the newer store's check asserts that its bytes did not change.
- **A dirty main checkout.** `scripts/lib/ng-a-live.mjs` `assertCleanTree()` fails every live check when `git status --short --untracked-files=no` is not empty, unless `PB_NG_ALLOW_DIRTY=1` is set. Only tracked changes count: the kit leaves an untracked `scripts/__pycache__/` behind.

Out of this wave's rows, but touched by it: the new actor kinds (`trackTab`, `closeTab`, `touchTab`) sit behind the existing `groupSenderIsTheia` wall. Wave C's sender-check row covers a hostile page on that channel.

## Ownership extensions (granted, decisions.md R2)

Most of this plan stays inside the regions G11 lists. Seven small edits fall outside them. No other wave owns them, and decisions.md R2 grants all seven to wave A. Each step that uses one says **(R2)**:

1. `theia/extensions/modes/src/browser/organising-widget.ts`: `liveTabs()` (:336–356), the key line in `scheduleShellCapture()` (:259), and the import at :49. They build the key that `dive()` and the close-group code consume.
2. `theia/extensions/modes/src/browser/group-actor-client.ts`: the `GroupMutation` union (:25–36), which is the wire type of `handleGroupMutation`. Wave B's additions to this union are `Needs: wave-a`.
3. `theia/extensions/tab-uris/src/browser/group-query-service.ts`: `getSettings` on `GroupQueryService` (Task 7).
4. `scripts/verify-chrome-bar-suggestions.mjs`: the `closed_at` column in `seedFixture`'s `CREATE TABLE` (Task 2), because `searchByPrefix` now filters on it.
5. `scripts/verify-gui08-close-exactness.mjs`: the member-row expectation, which changes from a DELETE to the closed-history UPDATE (Task 5).
6. `powerbrowser/shell/PowerBrowserAPI.sys.mjs` :45–109: the DDL markers and store constants.
7. Deleting `theia/extensions/tab-uris/src/browser/browser-tab-uri.ts` (Task 2). It states the old key rule, and TabQueryService, its only importer, stops using it.

**Kept profile (decisions.md R3, main `f4818a0`).** `withFirefoxPage(url, cb, { profileDir })` launches on a caller-owned profile and leaves the profile in place, so a second call relaunches on the same profile. `applyProfileOverrides` appends to `user.js`. No step in this plan changes `scripts/lib/firefox-bidi.mjs`.

## Files

| File | Tasks | Responsibility |
|---|---|---|
| `powerbrowser/shell/PowerBrowserAPI.sys.mjs` | 2, 5, 6, 7 | Schema v5, key rule, write and close paths, sweep, prune, quarantine, integrity schedule, actor kinds |
| `theia/extensions/tab-uris/src/node/tab-query-service.ts` | 2, 3, 7 | Read-only reader: open rows only, `user_version` check, errors, settings |
| `theia/extensions/tab-uris/src/browser/web-tab.ts` | 2, 4, 7 | Row key per web tab, `closeTab` and `touchTab` messages, opener `rowKey` |
| `theia/extensions/modes/src/browser/group-model.ts` | 2, 4, 7 | `tabKeyOf`, rows for Theia tabs, cards for tabs that are not open, reopen, restore plan |
| `theia/extensions/modes/src/browser/organising-widget.ts` | 2 (R2), 4, 5 | Keys, `dive()`, Close Group closes the member widgets |
| `scripts/lib/tab-store-fixtures.mjs` (new) | 1 | Store fixtures from the writer's DDL markers, plants, read-outs |
| `scripts/lib/ng-a-live.mjs` (new) | 1 | Live harness: kept profile, served pages, page helpers, `runCheck` |
| `scripts/lib/startup-wiring.mjs` (new) | 1, 8 | The absence instrument's startup-wiring gate, shared with NG-020's check |
| `scripts/verify-ng-NNN-<slug>.mjs` (20 new, R1) | 1 | One check per row, NG-001 to NG-020; NG-015's file is the real-migration exercise |
| `scripts/verify-sql-store-absence.mjs` | 1, 8 | Takes its wiring answer from `startup-wiring.mjs`; absent wiring fails, not STAGED |
| `scripts/verify-gui08-persistence-roundtrip.mjs` | 3 | NG-016: head 5, every marker block, reader head |
| `scripts/verify-sql-store-roundtrip.mjs` | 8 | NG-017: real restart round trip |
| `scripts/verify-platform.sh` | 1 | Registry rows |
| `docs/non-gui/checks-wave-a.tsv` (new) | 1 | Three fields per row: NG ID, test ref `file::label`, command with trailing ` # tier` (R1) |
| `docs/TAB-STORE.md` (new) | 2, 9 | The tabs.sqlite page |
| `docs/URI-SCHEMES.md` | 2 | Row-key paragraph |

## Rows to tasks

- Task 1: checks for all 20 rows.
- Task 2: NG-001, NG-002, NG-003, NG-004, NG-005, NG-014, NG-015 (key-rule slice; merges first).
- Task 3: NG-012, NG-016.
- Task 4: NG-007, NG-008.
- Task 5: NG-006.
- Task 6: NG-013, NG-018.
- Task 7: NG-009, NG-010, NG-011 (the table and its readers).
- Task 8: NG-017, NG-020.
- Task 9: NG-019.
- Task 10 (Needs: wave-c): NG-011 (the restore path reads the settings).
- Task 11 (Needs: wave-c): NG-001, NG-013 (catalogue rows in `powerbrowser/INTERNAL-APIS.md`).

## Commit gate (every task)

```bash
scripts/verify-platform.sh --quick 2>&1 | sed -n '/^verify-platform: summary/,$p' \
  | grep ': FAIL$' | awk '{print $1}' | sed 's/:$//' | sort \
  | comm -13 docs/non-gui/quick-baseline.txt -
```

The command must print nothing except this wave's own NG rows that are not built yet:

- Tasks 1–2: `ng-016-gui08-persistence-at-head`, `ng-019-tab-store-doc`, `ng-020-absence-wiring-by-call`
- Tasks 3–7: `ng-019-tab-store-doc`, `ng-020-absence-wiring-by-call`
- Tasks 8–11: `ng-019-tab-store-doc`, until the controller adds the pointer lines at merge (R4)

Also run `node --check powerbrowser/shell/PowerBrowserAPI.sys.mjs` in every task that edits it, `git add` the new files, and then `node scripts/scan-brand-residue.mjs`.

## Evidence notes (re-checked on `b3f95b7`)

All cited lines hold. The line numbers match GAPS.md. Four notes:

- NG-015's `exercise-migrations.mjs` lives at `.planning/milestones/v1.2-phases/11-sql-store-design/fixtures/exercise-migrations.mjs`, which is controller-only. This wave's replacement is the row's own check file, `scripts/verify-ng-015-real-migration-from-every-version.mjs` (R1). It replaces the `scripts/exercise-migrations.mjs` named in the brief.
- `migrateTabStoreToV4` stamps `TAB_STORE_SCHEMA_HEAD`, not 4 (:1015, :1020). Moving the head to 5 without changing it would skip v5, the same trap `migrateTabStoreToV1` records.
- `quarantineAndRebuildTabStore` reopens without `openNotExclusive` (:2175). After a rebuild, the reader gets `SQLITE_BUSY`, which is part of NG-014's `[]`.
- `webTabClose` (:2617, outside G11) calls `removeTabRow(entry.uri)`. It is also the path the actor's `didDestroy` takes at quit. `removeTabRow` therefore cannot tell a user's close from a session ending, which is why Task 2 moves the user close to a `closeTab` message.

---

### Task 1: Checks first (NG-001 to NG-020)

**Files:**
- Create shared helpers: `scripts/lib/tab-store-fixtures.mjs`, `scripts/lib/ng-a-live.mjs`, `scripts/lib/startup-wiring.mjs`.
- Create one check file per row (R1). The file name is `scripts/verify-ng-NNN-<slug>.mjs`, and the slug is the registry label without `ng-NNN-`:
  - `verify-ng-001-one-key-rule.mjs`
  - `verify-ng-002-navigation-keeps-row.mjs`
  - `verify-ng-003-same-url-two-rows.mjs`
  - `verify-ng-004-new-tab-row-unknown-uri-error.mjs`
  - `verify-ng-005-prune-keeps-open-rows.mjs`
  - `verify-ng-006-close-group-closes-web-tabs.mjs`
  - `verify-ng-007-shell-tabs-keep-group-across-restart.mjs`
  - `verify-ng-008-panorama-card-reopens-through-opener.mjs`
  - `verify-ng-009-content-age-columns.mjs`
  - `verify-ng-010-closed-tab-history.mjs`
  - `verify-ng-011-settings-table-read.mjs`
  - `verify-ng-012-reader-reports-schema-errors.mjs`
  - `verify-ng-013-unopenable-store-quarantined.mjs`
  - `verify-ng-014-rebuild-at-head.mjs`
  - `verify-ng-015-real-migration-from-every-version.mjs`
  - `verify-ng-016-gui08-persistence-at-head.mjs`
  - `verify-ng-017-sql05-restarts-real-browser.mjs`
  - `verify-ng-018-scheduled-integrity-check.mjs`
  - `verify-ng-019-tab-store-doc.mjs`
  - `verify-ng-020-absence-wiring-by-call.mjs`
- Create: `docs/non-gui/checks-wave-a.tsv`.
- Modify: `scripts/verify-sql-store-absence.mjs`. Its wiring gate moves to `scripts/lib/startup-wiring.mjs`, which it imports.
- Modify: `scripts/verify-platform.sh`. Add a quick block after the `gui08-persistence-roundtrip-self-test` row (:3847), and a full block after the `sql-store-absence-self-test` row (:4771).

**Interfaces:**
- Consumes: R3 (main `f4818a0`), `withFirefoxPage(url, cb, { profileDir })`. The profile is caller-owned and kept after exit, and `user.js` overrides are appended to it.
- Produces:
  - The rows in `docs/non-gui/checks-wave-a.tsv`.
  - `tab-store-fixtures.mjs` exports `REPO_ROOT`, `newStage`, `versionBlocks`, `schemaHead`, `tabColumnsAt`, `buildStore`, `setUserVersion`, `tamperBodyPage`, `plantIndexMismatch`, `integrityOk`, `readStore`, `columnsOf`.
  - `ng-a-live.mjs` exports `REPO_ROOT`, `sleep`, `waitUntil`, `assertCleanTree`, `newProfile`, `removeProfiles`, `servePages`, `withShell`, `tabsOf`, `show`, `runCheck`.
  - `startup-wiring.mjs` exports `WIRING_CALLERS`, `readWiringSources`, `startupWiringPresent(sources?)`.

The checks read the store only from outside, through `readStore`; they never write a live profile's store while its browser runs. A check that plants a fault (NG-005, NG-010, NG-012, NG-013, NG-014, NG-018) writes the store into its own throwaway profile before the first launch. `sql-store-second-writer` exempts `scripts/lib/`. No check file in `scripts/` spells a database-open shape.

- [ ] **Step 1: Write `scripts/lib/tab-store-fixtures.mjs`**

```js
// scripts/lib/tab-store-fixtures.mjs
//
// tabs.sqlite fixtures for wave A's checks (non-GUI build). A fixture at schema
// version N is built from the first N DDL marker blocks in
// powerbrowser/shell/PowerBrowserAPI.sys.mjs -- the text the writer itself
// runs, never a copy -- so a check can hand the real browser a store exactly as
// an older build left it. Files are opened read-write only under a stage from
// newStage() or a check's own throwaway profile before its first launch; a
// live store is read with readStore() and never written while its browser runs.

import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const API = join(REPO_ROOT, 'powerbrowser/shell/PowerBrowserAPI.sys.mjs');
const readApi = () => readFileSync(API, 'utf8');

/** A space-free stage directory outside the repo. */
export function newStage(name) {
    const dir = mkdtempSync(join(tmpdir(), `pb-${name}-`));
    if (/\s/.test(dir)) {
        throw new Error(`stage path contains a space: ${dir}`);
    }
    return dir;
}

/** The DDL marker blocks in source order: block N (1-based) is schema version N. */
export function versionBlocks(src = readApi()) {
    return [...src.matchAll(/PB-SQL-([A-Z0-9]+)-DDL-START \*\/ `([\s\S]*?)` \/\* PB-SQL-\1-DDL-END/g)]
        .map(m => ({ name: m[1], statements: m[2].split(';').map(s => s.trim()).filter(Boolean) }));
}

export function schemaHead(src = readApi()) {
    const m = /const TAB_STORE_SCHEMA_HEAD = (\d+);/.exec(src);
    if (!m) {
        throw new Error('TAB_STORE_SCHEMA_HEAD not found in PowerBrowserAPI.sys.mjs');
    }
    return Number(m[1]);
}

/** Every column the tabs table has at `version`: the CREATE's columns plus each ADD COLUMN. */
export function tabColumnsAt(version, src = readApi()) {
    const columns = [];
    for (const block of versionBlocks(src).slice(0, version)) {
        for (const statement of block.statements) {
            if (/^create table tabs\b/i.test(statement)) {
                for (const m of statement.matchAll(/^\s*([a-z_]+)\s+(?:TEXT|INTEGER)\b/gim)) {
                    columns.push(m[1]);
                }
            }
            const added = /^alter table tabs add column (\w+)/i.exec(statement);
            if (added) {
                columns.push(added[1]);
            }
        }
    }
    return columns;
}

function withDb(path, fn) {
    const db = new DatabaseSync(path);
    try {
        return fn(db);
    } finally {
        db.close();
    }
}

const has = (db, type, name) => !!db.prepare('SELECT 1 FROM sqlite_schema WHERE type = ? AND name = ?').get(type, name);
const columnsOfDb = (db, table) => db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);

/**
 * Writes a store at schema `version` to `path`: the first `version` marker
 * blocks, user_version stamped, then the seed. A seed field the version has
 * no column for is dropped, so one seed serves every version. `settings` rows
 * go into a settings table, created inert when the version has none.
 */
export function buildStore(path, version, { tabs = [], groups = [], settings = {} } = {}) {
    const blocks = versionBlocks();
    if (version > blocks.length) {
        throw new Error(`no DDL marker block for schema version ${version} (the writer has ${blocks.length})`);
    }
    withDb(path, db => {
        db.exec('PRAGMA journal_mode=WAL');
        for (const block of blocks.slice(0, version)) {
            for (const statement of block.statements) {
                db.exec(statement);
            }
        }
        db.exec(`PRAGMA user_version = ${version}`);
        const insert = (table, row) => {
            if (!has(db, 'table', table)) {
                return;
            }
            const cols = new Set(columnsOfDb(db, table));
            const keys = Object.keys(row).filter(key => cols.has(key));
            db.prepare(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`)
                .run(...keys.map(key => row[key]));
        };
        groups.forEach(row => insert('groups', row));
        tabs.forEach(row => insert('tabs', row));
        if (Object.keys(settings).length) {
            db.exec('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
            for (const [key, value] of Object.entries(settings)) {
                db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, String(value));
            }
        }
        db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    });
}

export function setUserVersion(path, version) {
    withDb(path, db => {
        db.exec(`PRAGMA user_version = ${Number(version)}`);
        db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    });
}

export function integrityOk(path, pragma = 'integrity_check') {
    try {
        return withDb(path, db => {
            const rows = db.prepare(`PRAGMA ${pragma}`).all().map(r => Object.values(r)[0]);
            return rows.length === 1 && rows[0] === 'ok';
        });
    } catch {
        return false;
    }
}

/** Fills page 2 with 0xff: the header stays readable and quick_check trips (the phase-11 exercise's control C). */
export function tamperBodyPage(path) {
    const buf = readFileSync(path);
    const raw = buf.readUInt16BE(16);
    const pageSize = raw === 1 ? 65536 : raw;
    if (buf.length < pageSize * 2) {
        throw new Error(`${path} has fewer than two pages; the tamper cannot land`);
    }
    buf.fill(0xff, pageSize, pageSize * 2);
    writeFileSync(path, buf);
    if (integrityOk(path, 'quick_check')) {
        throw new Error('the page-2 tamper did not trip quick_check');
    }
}

/**
 * Changes one idx_tabs_last_active entry so quick_check passes and
 * integrity_check does not -- the fault only the full check finds. The store
 * must hold its tabs row with rowid 1 at last_active 77.
 */
export function plantIndexMismatch(path) {
    const { root, pageSize } = withDb(path, db => ({
        root: db.prepare("SELECT rootpage FROM sqlite_schema WHERE name = 'idx_tabs_last_active'").get().rootpage,
        pageSize: db.prepare('PRAGMA page_size').get().page_size,
    }));
    const buf = readFileSync(path);
    const page = buf.subarray((root - 1) * pageSize, root * pageSize);
    // Index record (last_active, rowid): header size 3, serial type 1 (int8),
    // serial type 9 (the constant 1), then the int8 value 77.
    const at = page.indexOf(Buffer.from([0x03, 0x01, 0x09, 77]));
    if (at < 0) {
        throw new Error('no idx_tabs_last_active entry for rowid 1 at last_active 77; seed that row first');
    }
    page[at + 3] = 78;
    writeFileSync(path, buf);
    if (!integrityOk(path, 'quick_check') || integrityOk(path, 'integrity_check')) {
        throw new Error('the index plant did not land: want quick_check ok and integrity_check not ok');
    }
}

/** The store as a check sees it from outside: version, rows (with row_id), groups, settings. */
export function readStore(path) {
    if (!existsSync(path)) {
        return { version: null, tabs: [], groups: [], settings: {} };
    }
    const db = new DatabaseSync(path, { readOnly: true });
    try {
        const table = name => has(db, 'table', name);
        return {
            version: db.prepare('PRAGMA user_version').get().user_version,
            tabs: table('tabs') ? db.prepare('SELECT rowid AS row_id, * FROM tabs ORDER BY rowid').all() : [],
            groups: table('groups') ? db.prepare('SELECT rowid AS row_id, * FROM groups ORDER BY rowid').all() : [],
            settings: table('settings')
                ? Object.fromEntries(db.prepare('SELECT key, value FROM settings').all().map(r => [r.key, r.value]))
                : {},
        };
    } finally {
        db.close();
    }
}

export function columnsOf(path, table) {
    const db = new DatabaseSync(path, { readOnly: true });
    try {
        return columnsOfDb(db, table);
    } finally {
        db.close();
    }
}
```

- [ ] **Step 2: Write `scripts/lib/ng-a-live.mjs`**

```js
// scripts/lib/ng-a-live.mjs
//
// Wave A's live harness (non-GUI build). Launches the built browser on a
// profile the check keeps -- withFirefoxPage's `profileDir` (R3, f4818a0) -- so
// it can quit and relaunch on the same profile; waits for the Theia frontend;
// and installs `window.__ngA`: helpers that reach the frontend's own DI-bound
// services (opener, GroupModel, GroupActorClient, the group reader, the shell,
// commands). Checks drive behaviour only through those (G6) and read
// tabs.sqlite from outside. SIGTERM ends each launch; Gecko on GTK turns it
// into an orderly quit (nsAppShell::TermSignalHandler).

import { createServer } from 'node:http';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withFirefoxPage } from './firefox-bidi.mjs';
import { readStore } from './tab-store-fixtures.mjs';

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/** Polls `probe` until it returns something truthy or `ms` passes; resolves that value or undefined. */
export async function waitUntil(probe, ms = 20000, stepMs = 250) {
    const end = Date.now() + ms;
    for (;;) {
        const value = await probe();
        if (value) {
            return value;
        }
        if (Date.now() >= end) {
            return undefined;
        }
        await sleep(stepMs);
    }
}

/**
 * Review Focus: a live check never runs on a checkout carrying uncommitted
 * work. Tracked changes only: the kit's own runs leave an untracked
 * scripts/__pycache__/ behind, which tests nothing.
 */
export function assertCleanTree() {
    if (process.env.PB_NG_ALLOW_DIRTY === '1') {
        return;
    }
    const status = spawnSync('git', ['-C', REPO_ROOT, 'status', '--short', '--untracked-files=no'], { encoding: 'utf8' }).stdout.trim();
    if (status) {
        throw new Error(`uncommitted changes in ${REPO_ROOT}; a live run would test code that is not committed:\n${status}`);
    }
}

const profiles = [];

/**
 * A fresh profile (space-free, outside the repo) with the prefs every wave A
 * live check needs: sessionstore writes every second, so the store's sweep
 * runs within a check's budget; the last session restores at launch with every
 * tab loaded at once, so a restart check sees restored tabs as contexts.
 * withFirefoxPage appends its own overrides to this user.js (R3).
 */
export function newProfile(name, extraPrefs = {}) {
    const dir = mkdtempSync(join(tmpdir(), `pb-ng-a-${name}-`));
    const prefs = {
        'browser.sessionstore.interval': 1000,
        'browser.startup.page': 3,
        'browser.sessionstore.restore_on_demand': false,
        'browser.sessionstore.max_resumed_crashes': 999,
        ...extraPrefs,
    };
    writeFileSync(join(dir, 'user.js'), Object.entries(prefs)
        .map(([key, value]) => `user_pref(${JSON.stringify(key)}, ${JSON.stringify(value)});`).join('\n') + '\n');
    profiles.push(dir);
    return dir;
}

export function removeProfiles() {
    if (process.env.PB_NG_KEEP_PROFILES === '1') {
        console.log(`kept profiles: ${profiles.join(' ')}`);
        return;
    }
    profiles.splice(0).forEach(dir => rmSync(dir, { recursive: true, force: true }));
}

/** Pages the overlays load: every path links to /b; /hang accepts and never answers. */
export async function servePages() {
    const hung = [];
    const server = createServer((req, res) => {
        if (req.url.startsWith('/hang')) {
            hung.push(res);
            return;
        }
        const name = req.url.replace(/[^A-Za-z0-9]/g, '') || 'root';
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(`<!doctype html><title>page ${name}</title><body style="background:#3a6"><a id="next" href="/b">next</a></body>`);
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    return {
        url: path => `http://127.0.0.1:${port}${path}`,
        close: () => {
            hung.forEach(res => res.destroy());
            server.close();
        },
    };
}

export function tabsOf(profile) {
    try {
        return readStore(join(profile, 'tabs.sqlite')).tabs;
    } catch {
        return [];
    }
}

export const show = rows => JSON.stringify(rows.map(r => ({ uri: r.uri, url: r.url, group_id: r.group_id, closed_at: r.closed_at })));

// Page-realm helpers. No template literals inside: this whole string is one.
const PAGE_HELPERS = `
window.__ngA = window.__ngA || (function () {
    var container = window.theia.container;
    function get(name) {
        var found;
        container._bindingDictionary.traverse(function (key) {
            if (found) return;
            var keyStr = typeof key === 'symbol' ? key.toString() : (key && key.name) || String(key);
            if (keyStr === 'Symbol(' + name + ')' || keyStr === name) found = key;
        });
        if (!found) throw new Error('DI binding not found: ' + name);
        return container.get(found);
    }
    var A = {
        get: get,
        sleep: function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); },
        shell: function () { return get('ApplicationShell'); },
        registry: function () { return get('TabUriRegistry'); },
        model: function () { return get('GroupModel'); },
        actor: function () { return get('GroupActorClient'); },
        reader: function () { return get('GroupQueryService'); },
        ready: function () {
            try { return get('FrontendApplicationStateService').state === 'ready'; } catch (e) { return false; }
        },
        uri: function (text) {
            var shell = A.shell();
            var areas = ['left', 'right', 'bottom', 'main'];
            for (var i = 0; i < areas.length; i++) {
                var widgets = shell.getWidgets(areas[i]);
                for (var j = 0; j < widgets.length; j++) {
                    var address = A.registry().uriOf(widgets[j]);
                    if (address) return new address.constructor(text);
                }
            }
            throw new Error('no addressable widget to take the URI class from');
        },
        open: async function (text, options) {
            var target = A.uri(text);
            var opener = await get('OpenerService').getOpener(target, options);
            return opener.open(target, options);
        },
        mutate: async function (msg) {
            try { return { ok: true, reply: await A.actor().mutate(msg) }; }
            catch (e) { return { ok: false, message: String((e && e.message) || e) }; }
        },
        outcome: async function (call) {
            try { return { resolved: true, value: await call() }; }
            catch (e) { return { resolved: false, message: String((e && e.message) || e) }; }
        },
        mainWidgets: function () { return Array.from(A.shell().mainPanel.widgets()); },
        webTabs: function () {
            return A.mainWidgets().filter(function (w) { return typeof w.tabId === 'string' && typeof w.url === 'string'; });
        },
        organising: async function () {
            await get('ModeService').activateMode('organising');
            var org;
            for (var i = 0; i < 100 && !org; i++) {
                org = A.shell().getWidgetById('powerbrowser.modes.organising');
                if (!org) await A.sleep(100);
            }
            if (!org) throw new Error('the Organising surface never attached');
            await org.initialize();
            return org;
        },
        cardKey: async function (widget) {
            var org = await A.organising();
            var widgets = A.mainWidgets().filter(function (w) { return w !== org; });
            var live = org.liveTabs();
            var at = widgets.indexOf(widget);
            if (at < 0 || !live[at]) throw new Error('the Panorama model has no card for widget ' + widget.id);
            return live[at].uri;
        },
        confirmDialog: async function () {
            var button;
            for (var i = 0; i < 100 && !button; i++) {
                button = document.querySelector('.pb-org-close-confirm .theia-button.main');
                if (!button) await A.sleep(100);
            }
            if (!button) throw new Error('the Close Group dialog never opened');
            button.click();
        },
    };
    return A;
})();
`;

/**
 * Launches the built browser on `profileDir` (kept after exit, R3), waits for
 * the Theia frontend, installs the page helpers, and calls
 * fn({ run, topLevelContexts, evaluateIn, send, ... }). `run(body)` evaluates
 * an async function body in the Theia frame with `A` bound to the helpers and
 * resolves its JSON result; a throw inside rejects naming the page error.
 */
export async function withShell(profileDir, fn, { url = '' } = {}) {
    return withFirefoxPage(url, async page => {
        await page.waitFor('window.theia && window.theia.container ? true : false', { timeoutMs: 90000 });
        await page.evaluate(`${PAGE_HELPERS}; true`);
        await page.waitFor('window.__ngA.ready()', { timeoutMs: 90000 });
        const run = async body => {
            const text = await page.evaluate(`(async () => {
                const A = window.__ngA;
                try {
                    const out = await (async () => { ${body} })();
                    return JSON.stringify({ out: out === undefined ? null : out });
                } catch (error) {
                    return JSON.stringify({ error: String((error && error.stack) || error) });
                }
            })()`);
            const parsed = JSON.parse(text);
            if (parsed.error) {
                throw new Error(`page: ${parsed.error}`);
            }
            return parsed.out;
        };
        return fn({ ...page, run });
    }, { profileDir });
}

/**
 * Entry for every live check file: one scenario, receiving { pages, expect,
 * failures }; exits 1 naming every failure, 0 with a PASS line.
 */
export async function runCheck(name, scenario) {
    const failures = [];
    const expect = (ok, message) => {
        if (!ok) {
            failures.push(message);
        }
    };
    assertCleanTree();
    const pages = await servePages();
    try {
        await scenario({ pages, expect, failures });
    } catch (error) {
        failures.push(`harness: ${error && error.stack ? error.stack : error}`);
    } finally {
        pages.close();
        removeProfiles();
    }
    if (failures.length) {
        console.error(`${name}: FAIL`);
        failures.forEach(f => console.error(`  ${f}`));
        process.exit(1);
    }
    console.log(`${name}: PASS`);
}
```

- [ ] **Step 3: Write the key-rule checks (NG-001 to NG-005), one file each**

Each scenario takes a tab's card key from the Panorama model (`A.cardKey`), so it runs under both the old and the new key rule. On the current tree it therefore fails for its own row's reason, not on a missing helper.

`scripts/verify-ng-001-one-key-rule.mjs`:

```js
#!/usr/bin/env node
// scripts/verify-ng-001-one-key-rule.mjs -- NG-001 (non-GUI wave A): every tab
// kind (in-shell web tab, stock tab, terminal, editor) is keyed by its
// identity, never its page URL, and no row is keyed on the webview: scheme.
// Live: the built binary and a built theia/ app, driven through the Theia
// frontend's services (scripts/lib/ng-a-live.mjs).

import { newProfile, runCheck, show, sleep, tabsOf, waitUntil, withShell } from './lib/ng-a-live.mjs';

await runCheck('verify-ng-001-one-key-rule', async ({ pages, expect }) => {
    const profile = newProfile('ng001');
    const a = pages.url('/a');
    const s = pages.url('/s');
    const seen = await withShell(profile, async ({ run }) => {
        const out = await run(`
            const web = await A.open(${JSON.stringify(a)});
            await A.mutate({ kind: 'openStockTab', url: ${JSON.stringify(s)} });
            const term = await A.open('terminal:ng001', { widgetOptions: { area: 'main' } });
            await A.get('CommandRegistry').executeCommand('workbench.action.files.newUntitledFile');
            await A.sleep(1000);
            const editor = A.mainWidgets().find(w => typeof w.getResourceUri === 'function'
                && String(w.getResourceUri()).startsWith('untitled:'));
            const group = await A.model().createGroup(A.actor(), { x: 40, y: 40 });
            for (const w of [term, editor].filter(Boolean)) {
                await A.model().moveCard(A.actor(), await A.cardKey(w), group.id).catch(() => undefined);
            }
            return {
                webTabId: web.tabId,
                termKey: A.registry().uriOf(term).toString(true),
                editorKey: editor ? editor.getResourceUri().toString(true) : null,
            };
        `);
        await waitUntil(() => tabsOf(profile).some(r => r.url === a) && tabsOf(profile).some(r => r.url === s), 20000);
        await sleep(2000);
        return out;
    });
    const rows = tabsOf(profile);
    expect(seen.editorKey, 'no untitled editor opened, so the editor kind was not exercised');
    expect(rows.some(r => r.uri === `web:${seen.webTabId}` && r.url === a), `the in-shell tab on ${a} has no row keyed web:${seen.webTabId}; rows: ${show(rows)}`);
    expect(rows.some(r => r.url === s && /^stock:/.test(r.uri)), `the stock tab on ${s} has no row keyed stock:<id>; rows: ${show(rows)}`);
    expect(rows.some(r => r.uri === seen.termKey), `the grouped terminal has no row keyed by its registry address ${seen.termKey}; rows: ${show(rows)}`);
    expect(rows.some(r => r.uri === seen.editorKey), `the grouped editor has no row keyed by its resource address ${seen.editorKey}; rows: ${show(rows)}`);
    expect(!rows.some(r => r.uri.startsWith('webview:')), `a row is keyed on the plugin-panel scheme webview:; rows: ${show(rows)}`);
    expect(!rows.some(r => /^https?:/.test(r.uri)), `a row is keyed by its page URL; rows: ${show(rows)}`);
});
```

`scripts/verify-ng-002-navigation-keeps-row.mjs`:

```js
#!/usr/bin/env node
// scripts/verify-ng-002-navigation-keeps-row.mjs -- NG-002 (non-GUI wave A): a
// link click keeps the tab's row -- its key, group, ord and thumbnail for a
// grouped tab, its canvas position for a loose one.

import { newProfile, runCheck, show, sleep, tabsOf, waitUntil, withShell } from './lib/ng-a-live.mjs';

await runCheck('verify-ng-002-navigation-keeps-row', async ({ pages, expect, failures }) => {
    const profile = newProfile('ng002');
    const a = pages.url('/a');
    const c = pages.url('/c');
    const b = pages.url('/b');
    let before;
    await withShell(profile, async ({ run, topLevelContexts, evaluateIn }) => {
        const out = await run(`
            const grouped = await A.open(${JSON.stringify(a)});
            // Loads while it is the visible tab, so the settle capture (network
            // STOP + 500ms) photographs a painted page.
            await A.sleep(2500);
            const loose = await A.open(${JSON.stringify(c)});
            await A.sleep(1500);
            const group = await A.model().createGroup(A.actor(), { x: 40, y: 40 });
            await A.model().moveCard(A.actor(), await A.cardKey(grouped), group.id);
            await A.model().placeCard(A.actor(), await A.cardKey(loose), 300, 200);
            return { group: group.id };
        `);
        before = await waitUntil(() => {
            const rows = tabsOf(profile);
            const g = rows.find(r => r.url === a && r.group_id === out.group);
            const l = rows.find(r => r.url === c && r.x === 300 && r.y === 200);
            return g && l && g.thumbnail ? { g, l, group: out.group } : undefined;
        }, 30000);
        if (!before) {
            failures.push(`setup: the grouped tab on ${a} (with a thumbnail) and the placed tab on ${c} never both had rows; rows: ${show(tabsOf(profile))}`);
            return;
        }
        for (const target of [a, c]) {
            const ctx = (await topLevelContexts()).find(x => x.url === target);
            if (!ctx) {
                failures.push(`no overlay context shows ${target}`);
                continue;
            }
            await evaluateIn(ctx.context, "document.getElementById('next').click(); true");
        }
        await waitUntil(() => tabsOf(profile).filter(r => r.url === b).length >= 2, 20000);
        await sleep(1500);
    });
    if (!before) {
        return;
    }
    const rows = tabsOf(profile);
    const g = rows.find(r => r.url === b && r.group_id === before.group);
    expect(g, `after a link click the tab that was in group ${before.group} has no row in that group; rows: ${show(rows)}`);
    if (g) {
        expect(g.uri === before.g.uri, `the grouped tab's row key changed on navigation (${before.g.uri} -> ${g.uri})`);
        expect(g.ord === before.g.ord, `the grouped tab's ord changed on navigation (${before.g.ord} -> ${g.ord})`);
        expect(!!g.thumbnail, 'the grouped tab lost its thumbnail on navigation');
    }
    expect(rows.some(r => r.url === b && r.x === 300 && r.y === 200), `after a link click the placed tab lost its canvas position (300, 200); rows: ${show(rows)}`);
    expect(!rows.some(r => r.url === a || r.url === c), `rows for the pages the tabs left still exist beside the navigated ones; rows: ${show(rows)}`);
});
```

`scripts/verify-ng-003-same-url-two-rows.mjs`:

```js
#!/usr/bin/env node
// scripts/verify-ng-003-same-url-two-rows.mjs -- NG-003 (non-GUI wave A): two
// tabs on one URL have two rows, and closing one leaves the other's row open.

import { newProfile, runCheck, show, sleep, tabsOf, waitUntil, withShell } from './lib/ng-a-live.mjs';

await runCheck('verify-ng-003-same-url-two-rows', async ({ pages, expect }) => {
    const profile = newProfile('ng003');
    const a = pages.url('/a');
    await withShell(profile, async ({ run }) => {
        await run(`
            await A.open(${JSON.stringify(a)});
            await A.open(${JSON.stringify(a)});
        `);
        await waitUntil(() => tabsOf(profile).filter(r => r.url === a).length >= 2, 15000);
        const rows = tabsOf(profile).filter(r => r.url === a);
        expect(rows.length === 2 && new Set(rows.map(r => r.uri)).size === 2, `two tabs on ${a} have ${rows.length} row(s): ${show(rows)}`);
        await run(`
            A.webTabs().filter(w => w.url === ${JSON.stringify(a)})[0].close();
            await A.sleep(1500);
        `);
        await sleep(1000);
        const after = tabsOf(profile).filter(r => r.url === a);
        expect(after.some(r => r.closed_at == null), `closing one of two tabs on ${a} left no open row for the other; rows: ${show(after)}`);
    });
});
```

`scripts/verify-ng-004-new-tab-row-unknown-uri-error.mjs`:

```js
#!/usr/bin/env node
// scripts/verify-ng-004-new-tab-row-unknown-uri-error.mjs -- NG-004 (non-GUI
// wave A): a New Tab on the empty page has a row that setTabGroup,
// setGroupOrder and setTabPosition act on, and each of those mutations on a
// key with no row is refused naming the unknown tab.

import { newProfile, runCheck, show, sleep, tabsOf, withShell } from './lib/ng-a-live.mjs';

await runCheck('verify-ng-004-new-tab-row-unknown-uri-error', async ({ expect }) => {
    const profile = newProfile('ng004');
    await withShell(profile, async ({ run }) => {
        const out = await run(`
            const tab = await A.open('about:blank');
            await A.sleep(1000);
            const key = await A.cardKey(tab);
            const group = await A.model().createGroup(A.actor(), { x: 40, y: 40 });
            const missing = 'web:ng004-missing';
            return {
                key,
                group: group.id,
                results: {
                    group: await A.mutate({ kind: 'setTabGroup', uri: key, groupId: group.id }),
                    order: await A.mutate({ kind: 'setGroupOrder', groupId: group.id, uris: [key] }),
                    ungroup: await A.mutate({ kind: 'setTabGroup', uri: key, groupId: null }),
                    place: await A.mutate({ kind: 'setTabPosition', uri: key, x: 120, y: 80 }),
                    unknownPlace: await A.mutate({ kind: 'setTabPosition', uri: missing, x: 1, y: 1 }),
                    unknownOrder: await A.mutate({ kind: 'setGroupOrder', groupId: group.id, uris: [missing] }),
                    unknownGroup: await A.mutate({ kind: 'setTabGroup', uri: missing, groupId: group.id }),
                },
            };
        `);
        await sleep(1000);
        const rows = tabsOf(profile);
        const row = rows.find(r => r.uri === out.key);
        expect(row, `the New Tab (card key ${out.key}) has no row; rows: ${show(rows)}`);
        expect(row && row.url === '', `the New Tab's row carries url ${row && JSON.stringify(row.url)}, want the empty string`);
        for (const name of ['group', 'order', 'ungroup', 'place']) {
            expect(out.results[name].ok, `${name} on the New Tab was refused: ${out.results[name].message}`);
        }
        expect(row && row.x === 120 && row.y === 80, `setTabPosition did not place the New Tab: ${JSON.stringify(row)}`);
        for (const name of ['unknownPlace', 'unknownOrder', 'unknownGroup']) {
            const result = out.results[name];
            expect(!result.ok && /unknown tab/i.test(result.message), `${name} on a key with no row answered ${JSON.stringify(result)}, want a refusal naming the unknown tab`);
        }
    });
});
```

`scripts/verify-ng-005-prune-keeps-open-rows.mjs`:

```js
#!/usr/bin/env node
// scripts/verify-ng-005-prune-keeps-open-rows.mjs -- NG-005 (non-GUI wave A):
// the sweep's prune never deletes the row of an open tab. A v4 store keys the
// in-shell tab on /hang by its URL, grouped and last written long ago; the tab
// is open (its page never answers, so no navigation refreshes the row) while
// sessionstore writes drive the sweep.

import { join } from 'node:path';
import { newProfile, runCheck, show, sleep, tabsOf, withShell } from './lib/ng-a-live.mjs';
import { buildStore } from './lib/tab-store-fixtures.mjs';

await runCheck('verify-ng-005-prune-keeps-open-rows', async ({ pages, expect }) => {
    const profile = newProfile('ng005');
    const hang = pages.url('/hang');
    buildStore(join(profile, 'tabs.sqlite'), 4, {
        groups: [{ id: 'g-ng005', title: 'Kept', x: 10, y: 10, w: 400, h: 300, is_active: 0 }],
        tabs: [{ uri: hang, url: hang, title: 'hang', last_active: 1, group_id: 'g-ng005' }],
    });
    await withShell(profile, async ({ run }) => {
        await run(`
            await A.mutate({ kind: 'openStockTab', url: ${JSON.stringify(pages.url('/s1'))} });
            A.open(${JSON.stringify(hang)});
            await A.sleep(2000);
            await A.mutate({ kind: 'openStockTab', url: ${JSON.stringify(pages.url('/s2'))} });
        `);
        // Several sessionstore writes, each followed by the sweep and its prune.
        await sleep(8000);
        const rows = tabsOf(profile);
        expect(rows.some(r => r.url === hang), `the row of the open in-shell tab on ${hang} was pruned; rows: ${show(rows)}`);
        expect(rows.some(r => r.group_id === 'g-ng005'), `the open tab's group membership was pruned with its row; rows: ${show(rows)}`);
        expect(rows.some(r => r.url === pages.url('/s1')), `the open stock tab's row was pruned; rows: ${show(rows)}`);
    });
});
```

- [ ] **Step 4: Write the Panorama checks (NG-006 to NG-008), one file each**

`scripts/verify-ng-006-close-group-closes-web-tabs.mjs`:

```js
#!/usr/bin/env node
// scripts/verify-ng-006-close-group-closes-web-tabs.mjs -- NG-006 (non-GUI
// wave A): the Close Group command closes the group's in-shell web tabs (their
// widgets and overlays) and its stock tabs, as its dialog says, and leaves no
// open row listed in the closed group.

import { newProfile, runCheck, show, sleep, tabsOf, waitUntil, withShell } from './lib/ng-a-live.mjs';

await runCheck('verify-ng-006-close-group-closes-web-tabs', async ({ pages, expect, failures }) => {
    const profile = newProfile('ng006');
    const a = pages.url('/a');
    const c = pages.url('/c');
    const s = pages.url('/s');
    await withShell(profile, async ({ run, topLevelContexts }) => {
        const out = await run(`
            const w1 = await A.open(${JSON.stringify(a)});
            const w2 = await A.open(${JSON.stringify(c)});
            await A.mutate({ kind: 'openStockTab', url: ${JSON.stringify(s)} });
            await A.sleep(1500);
            const group = await A.model().createGroup(A.actor(), { x: 40, y: 40 });
            await A.model().moveCard(A.actor(), await A.cardKey(w1), group.id);
            await A.model().moveCard(A.actor(), await A.cardKey(w2), group.id);
            return { group: group.id, ids: [w1.id, w2.id] };
        `);
        const stock = await waitUntil(() => tabsOf(profile).find(r => r.url === s), 15000);
        if (!stock) {
            failures.push(`setup: the stock tab on ${s} never got a row`);
            return;
        }
        const assigned = await run(`return A.mutate({ kind: 'setTabGroup', uri: ${JSON.stringify(stock.uri)}, groupId: ${JSON.stringify(out.group)} });`);
        expect(assigned.ok, `setup: the stock tab could not join the group: ${assigned.message}`);
        await run(`
            const done = A.get('CommandRegistry').executeCommand('powerbrowser.panorama.close-group', ${JSON.stringify(out.group)});
            await A.confirmDialog();
            await done;
            await A.sleep(2000);
        `);
        const left = await run(`return A.mainWidgets().filter(w => ${JSON.stringify(out.ids)}.includes(w.id)).map(w => w.id);`);
        expect(left.length === 0, `Close Group left the group's in-shell tabs open: ${left.join(', ')}`);
        const urls = (await topLevelContexts()).map(x => x.url);
        for (const u of [a, c]) {
            expect(!urls.includes(u), `Close Group left the page ${u} rendered (its overlay is still a browsing context)`);
        }
        expect(!urls.includes(s), `Close Group left the stock tab on ${s} open`);
        await sleep(1000);
        const rows = tabsOf(profile).filter(r => [a, c, s].includes(r.url));
        expect(!rows.some(r => r.closed_at == null && r.group_id === out.group), `rows still list the closed group's tabs as open members: ${show(rows)}`);
    });
});
```

`scripts/verify-ng-007-shell-tabs-keep-group-across-restart.mjs`:

```js
#!/usr/bin/env node
// scripts/verify-ng-007-shell-tabs-keep-group-across-restart.mjs -- NG-007
// (non-GUI wave A): an editor and a terminal keep their group, and a loose
// terminal its canvas position, across a real quit and relaunch on the same
// profile (the backend port changes between launches, TheiaService.sys.mjs:602).

import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { newProfile, runCheck, withShell } from './lib/ng-a-live.mjs';

await runCheck('verify-ng-007-shell-tabs-keep-group-across-restart', async ({ expect }) => {
    const profile = newProfile('ng007');
    const fileDir = mkdtempSync(join(tmpdir(), 'pb-ng007-file-'));
    const file = join(fileDir, 'note.txt');
    writeFileSync(file, 'ng007\n');
    const fileUri = `file://${file}`;
    const first = await withShell(profile, async ({ run }) => run(`
        const main = { widgetOptions: { area: 'main' } };
        const editor = await A.open(${JSON.stringify(fileUri)}, main);
        const grouped = await A.open('terminal:ng007a', main);
        const loose = await A.open('terminal:ng007b', main);
        await A.sleep(1500);
        const group = await A.model().createGroup(A.actor(), { x: 40, y: 40 });
        await A.model().moveCard(A.actor(), await A.cardKey(editor), group.id);
        await A.model().moveCard(A.actor(), await A.cardKey(grouped), group.id);
        await A.model().placeCard(A.actor(), await A.cardKey(loose), 320, 240);
        await A.sleep(1500);
        return { group: group.id, port: location.port, editorKey: editor.getResourceUri().toString(true) };
    `));
    const second = await withShell(profile, async ({ run }) => run(`
        await A.organising();
        const before = A.model().getTabs(${JSON.stringify(first.group)}).map(t => t.uri);
        const main = { widgetOptions: { area: 'main' } };
        await A.open(${JSON.stringify(fileUri)}, main);
        await A.open('terminal:ng007a', main);
        await A.open('terminal:ng007b', main);
        await A.sleep(1500);
        await A.organising();
        return {
            port: location.port,
            before,
            after: A.model().getTabs(${JSON.stringify(first.group)}).map(t => t.uri),
            loose: A.model().listUngrouped().find(t => t.uri === 'terminal:ng007b') || null,
        };
    `));
    expect(first.port !== second.port, `the backend port did not change between launches (${first.port}), so the restart did not exercise a new frontend origin`);
    for (const key of [first.editorKey, 'terminal:ng007a']) {
        expect(second.before.includes(key), `after the restart, before anything reopened, group ${first.group} does not list ${key}: [${second.before.join(', ')}]`);
        expect(second.after.includes(key), `after the restart and reopening, ${key} is not back in group ${first.group}: [${second.after.join(', ')}]`);
    }
    expect(second.loose && second.loose.x === 320 && second.loose.y === 240, `after the restart the loose terminal lost its canvas position: ${JSON.stringify(second.loose)}`);
});
```

`scripts/verify-ng-008-panorama-card-reopens-through-opener.mjs`:

```js
#!/usr/bin/env node
// scripts/verify-ng-008-panorama-card-reopens-through-opener.mjs -- NG-008
// (non-GUI wave A): after a restart, a Panorama card for a tab that is not
// open reopens that tab through the opener, on the card's own row; a card for
// an open tab activates it and opens nothing.

import { newProfile, runCheck, show, sleep, tabsOf, waitUntil, withShell } from './lib/ng-a-live.mjs';

await runCheck('verify-ng-008-panorama-card-reopens-through-opener', async ({ pages, expect, failures }) => {
    const profile = newProfile('ng008');
    const a = pages.url('/a');
    const first = await withShell(profile, async ({ run }) => {
        const out = await run(`
            const web = await A.open(${JSON.stringify(a)});
            const term = await A.open('terminal:ng008', { widgetOptions: { area: 'main' } });
            await A.sleep(1500);
            const group = await A.model().createGroup(A.actor(), { x: 40, y: 40 });
            await A.model().moveCard(A.actor(), await A.cardKey(web), group.id);
            await A.model().moveCard(A.actor(), await A.cardKey(term), group.id);
            return { group: group.id, port: location.port };
        `);
        await waitUntil(() => tabsOf(profile).some(r => r.url === a && r.group_id === out.group), 15000);
        await sleep(1500);
        return out;
    });
    const webRow = tabsOf(profile).find(r => r.url === a && r.group_id === first.group);
    if (!webRow) {
        failures.push(`setup: the web tab on ${a} never got a grouped row; rows: ${show(tabsOf(profile))}`);
        return;
    }
    const second = await withShell(profile, async ({ run }) => run(`
        const webKey = ${JSON.stringify(webRow.uri)};
        const pageUrl = ${JSON.stringify(a)};
        const cardFor = key => document.querySelector('.pb-org-card[data-u="' + CSS.escape(key) + '"]');
        const dbl = el => el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
        await A.organising();
        const report = { port: location.port, webCard: !!cardFor(webKey), termCard: !!cardFor('terminal:ng008') };
        if (report.webCard) {
            dbl(cardFor(webKey));
            await A.sleep(3000);
            const open = A.webTabs().filter(w => w.url === pageUrl);
            report.webOpen = open.length;
            report.webKey = open.length ? open[0].rowKey || null : null;
        }
        if (report.termCard) {
            await A.organising();
            dbl(cardFor('terminal:ng008'));
            await A.sleep(2000);
            report.termOpen = A.mainWidgets().some(w => {
                const address = A.registry().uriOf(w);
                return !!address && address.toString(true) === 'terminal:ng008';
            });
        }
        if (report.webCard) {
            await A.organising();
            dbl(cardFor(webKey));
            await A.sleep(1500);
            report.webOpenAgain = A.webTabs().filter(w => w.url === pageUrl).length;
            const current = A.shell().currentWidget;
            report.activated = !!current && current.url === pageUrl;
        }
        return report;
    `));
    expect(first.port !== second.port, `the backend port did not change between launches (${first.port})`);
    expect(second.webCard, `after the restart Panorama shows no card for the web tab that is not open (${webRow.uri})`);
    expect(second.termCard, 'after the restart Panorama shows no card for the terminal that is not open (terminal:ng008)');
    expect(second.webOpen === 1, `double-clicking the web card opened ${second.webOpen} tab(s) on ${a}, want 1`);
    expect(second.webKey === webRow.uri, `the reopened web tab writes row ${second.webKey}, not the card's row ${webRow.uri}`);
    expect(second.termOpen, 'double-clicking the terminal card did not reopen terminal:ng008');
    expect(second.webOpenAgain === 1 && second.activated, `double-clicking the card of the now-open web tab opened another tab or did not activate it (tabs ${second.webOpenAgain}, activated ${second.activated})`);
    const rows = tabsOf(profile).filter(r => r.url === a || r.url === pages.url('/b'));
    expect(rows.length === 1, `reopening created a second row for ${a}: ${show(rows)}`);
});
```

- [ ] **Step 5: Write the age, history and settings checks (NG-009 to NG-011), one file each**

`scripts/verify-ng-009-content-age-columns.mjs`:

```js
#!/usr/bin/env node
// scripts/verify-ng-009-content-age-columns.mjs -- NG-009 (non-GUI wave A):
// every row records when its tab was created and when it was last accessed
// (stock tabs from sessionstore's lastAccessed), apart from last_active, the
// time it was last seen open.

import { newProfile, runCheck, sleep, tabsOf, waitUntil, withShell } from './lib/ng-a-live.mjs';

await runCheck('verify-ng-009-content-age-columns', async ({ pages, expect }) => {
    const profile = newProfile('ng009');
    const launched = Date.now();
    const [s1, s2, s3, a, c] = ['/s1', '/s2', '/s3', '/a', '/c'].map(p => pages.url(p));
    await withShell(profile, async ({ run }) => {
        await run(`
            await A.mutate({ kind: 'openStockTab', url: ${JSON.stringify(s1)} });
            await A.sleep(1000);
            await A.mutate({ kind: 'openStockTab', url: ${JSON.stringify(s2)} });
            window.__ng009 = { w: await A.open(${JSON.stringify(a)}), v: await A.open(${JSON.stringify(c)}) };
            await A.shell().activateWidget(window.__ng009.w.id);
        `);
        await waitUntil(() => [s1, s2, a, c].every(u => tabsOf(profile).some(r => r.url === u)), 20000);
        await sleep(2500);
        const first = tabsOf(profile);
        const mark = Date.now();
        await sleep(1500);
        await run(`
            await A.shell().activateWidget(window.__ng009.v.id);
            await A.sleep(500);
            await A.shell().activateWidget(window.__ng009.w.id);
            await A.mutate({ kind: 'openStockTab', url: ${JSON.stringify(s3)} });
        `);
        await sleep(4000);
        const second = tabsOf(profile);
        const pick = (rows, u) => rows.find(r => r.url === u) || {};
        for (const u of [s1, s2, a, c]) {
            const r = pick(second, u);
            expect(Number.isInteger(r.created_at) && r.created_at >= launched - 1000 && r.created_at <= Date.now(), `the row for ${u} carries no creation time: ${JSON.stringify(r)}`);
            expect(Number.isInteger(r.last_accessed), `the row for ${u} carries no last-accessed time: ${JSON.stringify(r)}`);
            expect(pick(first, u).created_at === r.created_at, `the row for ${u} changed its creation time between reads`);
        }
        expect(pick(second, a).last_accessed >= mark, `activating the web tab on ${a} did not advance its last_accessed`);
        expect(pick(second, s1).last_accessed === pick(first, s1).last_accessed, `the stock tab on ${s1}, never selected again, changed its last_accessed`);
        expect(pick(second, s1).last_active > pick(first, s1).last_active, `the sweep did not refresh last_active (last seen open) for the open stock tab on ${s1}, so the two columns could not be told apart`);
    });
});
```

`scripts/verify-ng-010-closed-tab-history.mjs`:

```js
#!/usr/bin/env node
// scripts/verify-ng-010-closed-tab-history.mjs -- NG-010 (non-GUI wave A):
// closing a tab keeps its row as closed-tab history; a rebuild from
// sessionstore re-projects its _closedTabs; and closed_retention_days decides
// what the prune deletes.

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { newProfile, runCheck, show, sleep, tabsOf, waitUntil, withShell } from './lib/ng-a-live.mjs';
import { buildStore, plantIndexMismatch, schemaHead } from './lib/tab-store-fixtures.mjs';

await runCheck('verify-ng-010-closed-tab-history', async ({ pages, expect, failures }) => {
    const head = schemaHead();
    // 1. History on close, and a rebuild from sessionstore that projects _closedTabs.
    const profile = newProfile('ng010');
    const dbPath = join(profile, 'tabs.sqlite');
    buildStore(dbPath, head, {
        tabs: [{ uri: 'terminal:ng010-seed', url: '', title: 'seed', last_active: 77 }],
        settings: { integrity_check_minutes: '0.25' },
    });
    plantIndexMismatch(dbPath);
    const [s1, s2] = ['/s1', '/s2'].map(p => pages.url(p));
    await withShell(profile, async ({ run, topLevelContexts, send }) => {
        await run(`
            await A.mutate({ kind: 'openStockTab', url: ${JSON.stringify(s1)} });
            await A.sleep(1000);
            await A.mutate({ kind: 'openStockTab', url: ${JSON.stringify(s2)} });
        `);
        const s1Row = await waitUntil(() => tabsOf(profile).find(r => r.url === s1), 15000);
        const ctx = (await topLevelContexts()).find(x => x.url === s1);
        if (!s1Row || !ctx) {
            failures.push(`setup: the stock tab on ${s1} has no row or no context`);
            return;
        }
        await send('browsingContext.close', { context: ctx.context });
        await sleep(2500);
        const closed = tabsOf(profile).find(r => r.uri === s1Row.uri);
        expect(closed && Number.isInteger(closed.closed_at), `closing the stock tab on ${s1} did not keep its row as history: ${JSON.stringify(closed)}`);
        const rebuilt = await waitUntil(() => existsSync(`${dbPath}.corrupt-1`), 60000);
        expect(rebuilt, 'the store was never rebuilt from sessionstore (the scheduled integrity check never quarantined it)');
        await sleep(3000);
        const after = tabsOf(profile).find(r => r.uri === s1Row.uri);
        expect(after && Number.isInteger(after.closed_at), `after the rebuild from sessionstore the closed tab ${s1Row.uri} is not in the store as history, so _closedTabs was not projected: ${JSON.stringify(after)}`);
    });
    // 2. Retention is a setting.
    const retained = newProfile('ng010-retention');
    const day = 86400000;
    const now = Date.now();
    buildStore(join(retained, 'tabs.sqlite'), head, {
        tabs: [
            { uri: 'stock:ng010-old', url: 'https://old.example/', title: 'old', last_active: now, closed_at: now - 2 * day },
            { uri: 'stock:ng010-recent', url: 'https://recent.example/', title: 'recent', last_active: now, closed_at: now - 3600000 },
        ],
        settings: { closed_retention_days: '1' },
    });
    await withShell(retained, async ({ run }) => {
        await run(`await A.mutate({ kind: 'openStockTab', url: ${JSON.stringify(pages.url('/s3'))} });`);
        await sleep(6000);
    });
    const rows = tabsOf(retained);
    expect(!rows.some(r => r.uri === 'stock:ng010-old'), `a row closed two days ago survived a one-day closed_retention_days: ${show(rows)}`);
    expect(rows.some(r => r.uri === 'stock:ng010-recent'), `a row closed an hour ago was pruned under a one-day closed_retention_days: ${show(rows)}`);
});
```

`scripts/verify-ng-011-settings-table-read.mjs`:

```js
#!/usr/bin/env node
// scripts/verify-ng-011-settings-table-read.mjs -- NG-011 (non-GUI wave A):
// tabs.sqlite has a settings table holding restore behaviour and age tiers;
// the Theia reader serves it; and the launch restore honours
// restore_behaviour and restore_live_minutes (part B needs wave C's restore,
// Task 10).

import { join } from 'node:path';
import { newProfile, runCheck, sleep, withShell } from './lib/ng-a-live.mjs';
import { buildStore, readStore, schemaHead } from './lib/tab-store-fixtures.mjs';

await runCheck('verify-ng-011-settings-table-read', async ({ pages, expect }) => {
    // A. The table and its reader.
    const profile = newProfile('ng011');
    const served = await withShell(profile, async ({ run }) => run(`
        const got = await A.outcome(() => A.reader().getSettings());
        return got.resolved ? got.value : { error: got.message };
    `));
    const stored = readStore(join(profile, 'tabs.sqlite')).settings;
    for (const key of ['closed_retention_days', 'integrity_check_minutes', 'restore_behaviour', 'restore_live_minutes', 'restore_url_days']) {
        expect(key in stored, `tabs.sqlite has no settings row ${key}: ${JSON.stringify(stored)}`);
        expect(served && served[key] === stored[key], `the Theia reader does not serve setting ${key}: ${JSON.stringify(served)}`);
    }
    // B. The launch restore reads restore_behaviour and the live-state tier.
    const a = pages.url('/a');
    const b = pages.url('/b');
    for (const [behaviour, liveMinutes, wantOpen, wantHistory] of [['session', '5', true, true], ['session', '0', true, false], ['none', '5', false, false]]) {
        const p = newProfile(`ng011-${behaviour}-${liveMinutes}`);
        buildStore(join(p, 'tabs.sqlite'), schemaHead(), { settings: { restore_behaviour: behaviour, restore_live_minutes: liveMinutes } });
        await withShell(p, async ({ run, topLevelContexts, evaluateIn }) => {
            await run(`await A.open(${JSON.stringify(a)});`);
            await sleep(2000);
            const ctx = (await topLevelContexts()).find(x => x.url === a);
            if (ctx) {
                await evaluateIn(ctx.context, "document.getElementById('next').click(); true");
            }
            await sleep(3000);
        });
        const got = await withShell(p, async ({ run }) => {
            await sleep(4000);
            return run(`
                const tab = A.webTabs().find(w => w.url === ${JSON.stringify(b)});
                return { open: !!tab, canGoBack: !!(tab && tab.canGoBack) };
            `);
        });
        expect(got.open === wantOpen, `restore_behaviour=${behaviour}: the web tab was ${got.open ? '' : 'not '}restored at launch`);
        if (wantOpen) {
            expect(got.canGoBack === wantHistory, `restore_live_minutes=${liveMinutes}: the restored tab ${got.canGoBack ? 'kept' : 'lost'} its back history`);
        }
    }
});
```

- [ ] **Step 6: Write the store-resilience checks (NG-012, NG-013, NG-014, NG-018), one file each**

`scripts/verify-ng-012-reader-reports-schema-errors.mjs`:

```js
#!/usr/bin/env node
// scripts/verify-ng-012-reader-reports-schema-errors.mjs -- NG-012 (non-GUI
// wave A): the Theia reader checks user_version and reports a store it cannot
// read as an error naming the version, instead of answering []; Organising
// shows its load-error state.

import { join } from 'node:path';
import { newProfile, runCheck, withShell } from './lib/ng-a-live.mjs';
import { buildStore, schemaHead, setUserVersion } from './lib/tab-store-fixtures.mjs';

await runCheck('verify-ng-012-reader-reports-schema-errors', async ({ expect }) => {
    const profile = newProfile('ng012');
    const path = join(profile, 'tabs.sqlite');
    buildStore(path, schemaHead(), { tabs: [{ uri: 'terminal:ng012', url: '', title: 't', last_active: 5 }] });
    setUserVersion(path, 99);
    const got = await withShell(profile, async ({ run }) => run(`
        await A.organising();
        return {
            groups: await A.outcome(() => A.reader().listGroups()),
            tray: await A.outcome(() => A.reader().listUngroupedTabs()),
            loadFailed: A.model().hasLoadFailed,
        };
    `));
    for (const name of ['groups', 'tray']) {
        expect(!got[name].resolved, `the reader answered ${name} from a schema-99 store instead of reporting an error: ${JSON.stringify(got[name])}`);
        expect(!got[name].resolved && /99/.test(got[name].message), `the reader's ${name} error does not name the store's version: ${JSON.stringify(got[name])}`);
    }
    expect(got.loadFailed === true, 'Organising painted an empty canvas instead of its load-error state');
});
```

`scripts/verify-ng-013-unopenable-store-quarantined.mjs`:

```js
#!/usr/bin/env node
// scripts/verify-ng-013-unopenable-store-quarantined.mjs -- NG-013 (non-GUI
// wave A): a tabs.sqlite that cannot be opened is quarantined byte for byte
// and rebuilt at the head (MIGRATIONS.md:53); one newer than the build is left
// untouched and never quarantined (MIGRATIONS.md rule 4).

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { newProfile, runCheck, sleep, withShell } from './lib/ng-a-live.mjs';
import { buildStore, integrityOk, readStore, schemaHead, setUserVersion } from './lib/tab-store-fixtures.mjs';

await runCheck('verify-ng-013-unopenable-store-quarantined', async ({ expect }) => {
    const profile = newProfile('ng013');
    const path = join(profile, 'tabs.sqlite');
    const garbage = Buffer.alloc(8192, 0x5a);
    writeFileSync(path, garbage);
    await withShell(profile, async () => sleep(3000));
    const corrupt = `${path}.corrupt-1`;
    expect(existsSync(corrupt) && readFileSync(corrupt).equals(garbage), `the unopenable tabs.sqlite was not quarantined byte for byte to ${corrupt}`);
    const store = readStore(path);
    expect(store.version === schemaHead(), `after the quarantine tabs.sqlite is at version ${store.version}, want the head ${schemaHead()}`);
    expect(integrityOk(path), 'the rebuilt tabs.sqlite does not pass integrity_check');
    const newer = newProfile('ng013-newer');
    const newerPath = join(newer, 'tabs.sqlite');
    buildStore(newerPath, schemaHead());
    setUserVersion(newerPath, 99);
    const bytes = readFileSync(newerPath);
    await withShell(newer, async () => sleep(3000));
    expect(!existsSync(`${newerPath}.corrupt-1`), 'a newer-than-head tabs.sqlite was quarantined instead of left untouched');
    expect(readFileSync(newerPath).equals(bytes), 'a newer-than-head tabs.sqlite was modified');
});
```

`scripts/verify-ng-014-rebuild-at-head.mjs`:

```js
#!/usr/bin/env node
// scripts/verify-ng-014-rebuild-at-head.mjs -- NG-014 (non-GUI wave A): the
// quarantine rebuild of a store that trips quick_check creates the head
// schema, every head column included, and the Theia reader works on it.

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { newProfile, runCheck, withShell } from './lib/ng-a-live.mjs';
import { buildStore, columnsOf, readStore, schemaHead, tabColumnsAt, tamperBodyPage } from './lib/tab-store-fixtures.mjs';

await runCheck('verify-ng-014-rebuild-at-head', async ({ expect }) => {
    const profile = newProfile('ng014');
    const path = join(profile, 'tabs.sqlite');
    const head = schemaHead();
    buildStore(path, head, { tabs: [{ uri: 'terminal:ng014', url: '', title: 't', last_active: 5 }] });
    tamperBodyPage(path);
    const seen = await withShell(profile, async ({ run }) => run(`
        return {
            tray: await A.outcome(() => A.reader().listUngroupedTabs()),
            members: await A.outcome(() => A.reader().getGroupTabs('none')),
        };
    `));
    expect(existsSync(`${path}.corrupt-1`), 'the tampered store was not quarantined, so the rebuild was not exercised');
    expect(readStore(path).version === head, `the quarantine rebuild left tabs.sqlite at version ${readStore(path).version}, want the head ${head}`);
    const cols = columnsOf(path, 'tabs');
    for (const col of tabColumnsAt(head)) {
        expect(cols.includes(col), `the rebuilt tabs table lacks the head column ${col}`);
    }
    expect(seen.tray.resolved && seen.members.resolved, `the Theia reader failed on the rebuilt store: ${JSON.stringify(seen)}`);
});
```

`scripts/verify-ng-018-scheduled-integrity-check.mjs`:

```js
#!/usr/bin/env node
// scripts/verify-ng-018-scheduled-integrity-check.mjs -- NG-018 (non-GUI wave
// A): the runtime runs a full PRAGMA integrity_check on a schedule
// (SCHEMA.md:200-201). The store's index disagrees with its table -- a fault
// the startup quick_check cannot see -- and integrity_check_minutes is 0.1.

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { newProfile, runCheck, waitUntil, withShell } from './lib/ng-a-live.mjs';
import { buildStore, integrityOk, plantIndexMismatch, readStore, schemaHead } from './lib/tab-store-fixtures.mjs';

await runCheck('verify-ng-018-scheduled-integrity-check', async ({ expect }) => {
    const profile = newProfile('ng018');
    const path = join(profile, 'tabs.sqlite');
    buildStore(path, schemaHead(), {
        tabs: [{ uri: 'terminal:ng018', url: '', title: 't', last_active: 77 }],
        settings: { integrity_check_minutes: '0.1' },
    });
    plantIndexMismatch(path);
    let quarantined;
    await withShell(profile, async () => {
        quarantined = await waitUntil(() => existsSync(`${path}.corrupt-1`), 45000);
    });
    expect(quarantined, 'no scheduled integrity_check quarantined a store whose index disagrees with its table within 45s (the startup quick_check cannot see this fault)');
    if (quarantined) {
        expect(integrityOk(path), 'the store rebuilt after the scheduled check does not pass integrity_check');
        expect(readStore(path).version === schemaHead(), 'the store rebuilt after the scheduled check is not at the head');
    }
});
```

- [ ] **Step 7: Write `scripts/verify-ng-015-real-migration-from-every-version.mjs`**

```js
#!/usr/bin/env node
// scripts/verify-ng-015-real-migration-from-every-version.mjs -- NG-015
// (non-GUI wave A).
//
// Runs the REAL migration code -- the built browser's own startup on a profile
// holding an older tabs.sqlite -- from every schema version a shipped build
// wrote (v1..v4) to the head. Every row must arrive with its URL, title,
// group, position, order and thumbnail under the head's key rule
// (docs/TAB-STORE.md). Rows are matched by rowid, which the key rewrite keeps.
// Also runs the committed phase-11 fixture (tabs-v1.sqlite) and, when the env
// var PB_REAL_PROFILE_FIXTURE names it (decisions.md R7), a copy of a real
// profile's store; without that variable it prints a notice and skips that one
// fixture. Supersedes the phase-11 exercise, which replays v1 in node:sqlite.

import { copyFileSync, existsSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { assertCleanTree, newProfile, removeProfiles, sleep, withShell } from './lib/ng-a-live.mjs';
import { REPO_ROOT, buildStore, newStage, readStore, schemaHead } from './lib/tab-store-fixtures.mjs';

const NAME = 'verify-ng-015-real-migration-from-every-version';
/** Every schema version a build wrote before the per-tab key. */
const SHIPPED_VERSIONS = [1, 2, 3, 4];
const PHASE11_FIXTURE = join(REPO_ROOT, '.planning/milestones/v1.2-phases/11-sql-store-design/fixtures/tabs-v1.sqlite');

const SEED = {
    groups: [{ id: 'g-res', title: 'Research', x: 12, y: 34, w: 400, h: 300, is_active: 1 }],
    tabs: [
        { uri: 'webview:https://stock.example/one', url: 'https://stock.example/one', title: 'Stock one', last_active: 1000, thumbnail: 'data:image/png;base64,AAAA' },
        { uri: 'https://web.example/grouped', url: 'https://web.example/grouped', title: 'Grouped', last_active: 2000, group_id: 'g-res', ord: 1, thumbnail: 'data:image/png;base64,BBBB' },
        { uri: 'https://web.example/placed', url: 'https://web.example/placed', title: 'Placed', last_active: 3000, x: 120, y: 240 },
        { uri: 'terminal:build', url: '', title: 'It\'s a "build" shell — ünïcödé ✓', last_active: 4000, group_id: 'g-res', ord: 0 },
        { uri: 'view:explorer-view-container', url: '', title: 'Explorer', last_active: 5000 },
    ],
};

/** The head's key rule for a row an older build wrote (docs/TAB-STORE.md, "v5"). */
function expectedKey(oldKey, rowId) {
    if (oldKey.startsWith('webview:')) {
        return `stock:legacy-${rowId}`;
    }
    if (/^https?:\/\//i.test(oldKey)) {
        return `web:legacy-${rowId}`;
    }
    return oldKey;
}

const failures = [];
const expect = (ok, message) => {
    if (!ok) {
        failures.push(message);
    }
};

async function exercise(label, fixturePath) {
    const before = readStore(fixturePath);
    const profile = newProfile(`ng015-${label.replace(/[^A-Za-z0-9]/g, '')}`);
    copyFileSync(fixturePath, join(profile, 'tabs.sqlite'));
    await withShell(profile, async () => sleep(3000));
    const after = readStore(join(profile, 'tabs.sqlite'));
    const head = schemaHead();
    expect(after.version === head, `${label}: the writer left tabs.sqlite at version ${after.version}, want the head ${head}`);
    expect(head > before.version, `${label}: the head (${head}) is not newer than the fixture's version ${before.version}, so no migration ran from it`);
    for (const old of before.tabs) {
        const now = after.tabs.find(r => r.row_id === old.row_id);
        if (!now) {
            failures.push(`${label}: row ${old.uri} is gone after the migration`);
            continue;
        }
        const key = expectedKey(old.uri, old.row_id);
        expect(now.uri === key, `${label}: row ${old.uri} is keyed ${now.uri}, want ${key}`);
        for (const col of ['url', 'title', 'group_id', 'thumbnail', 'x', 'y', 'ord']) {
            if (col in old) {
                expect(now[col] === old[col], `${label}: row ${old.uri} lost ${col} (${JSON.stringify(old[col])} -> ${JSON.stringify(now[col])})`);
            }
        }
    }
    expect(JSON.stringify(after.groups) === JSON.stringify(before.groups), `${label}: the groups changed across the migration`);
}

/** Copies a store into the stage (its -wal too when non-empty), never opening the original. */
function stageCopy(stage, source) {
    const copy = join(stage, `given-${basename(source)}`);
    copyFileSync(source, copy);
    if (existsSync(`${source}-wal`) && statSync(`${source}-wal`).size > 0) {
        copyFileSync(`${source}-wal`, `${copy}-wal`);
    }
    return copy;
}

assertCleanTree();
const stage = newStage('ng015');
try {
    for (const version of SHIPPED_VERSIONS) {
        const path = join(stage, `tabs-v${version}.sqlite`);
        buildStore(path, version, SEED);
        await exercise(`v${version}`, path);
    }
    await exercise('phase-11 tabs-v1.sqlite', stageCopy(stage, PHASE11_FIXTURE));
    const real = process.env.PB_REAL_PROFILE_FIXTURE;
    if (!real) {
        console.log(`${NAME}: notice -- PB_REAL_PROFILE_FIXTURE is not set; the real-profile fixture was skipped (decisions.md R7)`);
    } else if (!existsSync(real)) {
        failures.push(`PB_REAL_PROFILE_FIXTURE names ${real}, which does not exist`);
    } else {
        await exercise('real profile', stageCopy(stage, real));
    }
} catch (error) {
    failures.push(`harness: ${error && error.stack ? error.stack : error}`);
} finally {
    removeProfiles();
}
if (failures.length) {
    console.error(`${NAME}: FAIL`);
    failures.forEach(f => console.error(`  ${f}`));
    process.exit(1);
}
console.log(`${NAME}: PASS -- the writer migrated v${SHIPPED_VERSIONS.join(', v')} and the given fixtures to the head, every row carried`);
```

The real-profile fixture is `~/coding/Power-Browser-fixtures/real-profile-tabs-2026-09-25.sqlite` (R7): schema v4, 6 tabs, 5 groups, 0 grouped. The controller exports `PB_REAL_PROFILE_FIXTURE` to that path when recording and when running the check at merge.

- [ ] **Step 8: Write `scripts/verify-ng-016-gui08-persistence-at-head.mjs`**

```js
#!/usr/bin/env node
// scripts/verify-ng-016-gui08-persistence-at-head.mjs -- NG-016 (non-GUI wave
// A): the gui08-persistence-roundtrip quick check passes against the writer's
// current schema head -- it declares that head, and both its default run and
// its --self-test (which requires the default run green) exit 0.

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { REPO_ROOT, schemaHead } from './lib/tab-store-fixtures.mjs';

const GATE = join(REPO_ROOT, 'scripts/verify-gui08-persistence-roundtrip.mjs');
const failures = [];
const declared = /const EXPECTED_SCHEMA_HEAD = (\d+);/.exec(readFileSync(GATE, 'utf8'));
const head = schemaHead();
if (!declared || Number(declared[1]) !== head) {
    failures.push(`the gui08 gate declares schema head ${declared ? declared[1] : '(none)'}, the writer's head is ${head}`);
}
for (const args of [[], ['--self-test']]) {
    const run = spawnSync(process.execPath, [GATE, ...args], { encoding: 'utf8' });
    if (run.status !== 0) {
        const tail = `${run.stdout}${run.stderr}`.trim().split('\n').slice(-6).join('\n    ');
        failures.push(`verify-gui08-persistence-roundtrip.mjs ${args.join(' ')} exits ${run.status}:\n    ${tail}`);
    }
}
if (failures.length) {
    console.error('verify-ng-016-gui08-persistence-at-head: FAIL');
    failures.forEach(f => console.error(`  ${f}`));
    process.exit(1);
}
console.log(`verify-ng-016-gui08-persistence-at-head: PASS -- the gui08 gate holds at schema head ${head}, self-test included`);
```

- [ ] **Step 9: Write `scripts/verify-ng-017-sql05-restarts-real-browser.mjs`**

```js
#!/usr/bin/env node
// scripts/verify-ng-017-sql05-restarts-real-browser.mjs -- NG-017 (non-GUI
// wave A).
//
// The SQL-05 round-trip check (scripts/verify-sql-store-roundtrip.mjs) must
// restart the REAL browser on one profile. Observed from outside: the check
// runs with PB_FIREFOX_BIN pointing at a wrapper that logs every launch's
// arguments before exec'ing the real binary; it must pass AND launch the
// browser at least twice with the same --profile.

import { chmodSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { FIREFOX_BIN } from './lib/firefox-bidi.mjs';
import { REPO_ROOT, assertCleanTree } from './lib/ng-a-live.mjs';
import { newStage } from './lib/tab-store-fixtures.mjs';

assertCleanTree();
const stage = newStage('ng017');
const log = join(stage, 'launches.log');
const wrapper = join(stage, 'powerbrowser');
writeFileSync(wrapper, `#!/bin/sh\nprintf '%s\\n' "$*" >> ${JSON.stringify(log)}\nexec ${JSON.stringify(FIREFOX_BIN)} "$@"\n`);
chmodSync(wrapper, 0o755);
const run = spawnSync(process.execPath, [join(REPO_ROOT, 'scripts/verify-sql-store-roundtrip.mjs')], {
    env: { ...process.env, PB_FIREFOX_BIN: wrapper },
    encoding: 'utf8',
    timeout: 600000,
});
const launches = existsSync(log) ? readFileSync(log, 'utf8').split('\n').filter(Boolean) : [];
const profiles = launches.map(line => (/--profile (\S+)/.exec(line) || [])[1]).filter(Boolean);
const repeated = profiles.find((p, i) => profiles.indexOf(p) !== i);
rmSync(stage, { recursive: true, force: true });
const failures = [];
if (run.status !== 0) {
    failures.push(`the SQL-05 round-trip check failed (exit ${run.status}):\n${`${run.stdout}${run.stderr}`.trim().split('\n').slice(-15).join('\n')}`);
}
if (!repeated) {
    failures.push(`the SQL-05 round-trip check launched the browser ${launches.length} time(s) and never twice on one profile, so it does not restart the real browser`);
}
if (failures.length) {
    console.error('verify-ng-017-sql05-restarts-real-browser: FAIL');
    failures.forEach(f => console.error(`  ${f}`));
    process.exit(1);
}
console.log(`verify-ng-017-sql05-restarts-real-browser: PASS -- ${launches.length} launches, profile ${repeated} relaunched`);
```

- [ ] **Step 10: Write `scripts/verify-ng-019-tab-store-doc.mjs`**

```js
#!/usr/bin/env node
// scripts/verify-ng-019-tab-store-doc.mjs -- NG-019 (non-GUI wave A).
//
// Derives the tab store's schema from the writer's DDL marker blocks and
// requires docs/TAB-STORE.md to document it: a "## vN" section for every
// version up to the head and none beyond, every table, index, column and
// settings key in backticks, `user_version = <head>`, the stock: and web: key
// forms, and its five contracted sections. docs/URI-SCHEMES.md must point at
// the page and no longer say the store keys rows by the page URL; the v1.2
// SCHEMA.md and MIGRATIONS.md must carry the controller's pointer line
// (decisions.md R4). After a green tree it plants each drift in memory and
// requires each to go red.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT, schemaHead, versionBlocks } from './lib/tab-store-fixtures.mjs';

const API = 'powerbrowser/shell/PowerBrowserAPI.sys.mjs';
const DOC = 'docs/TAB-STORE.md';
const URIS = 'docs/URI-SCHEMES.md';
const PLANNING = [
    '.planning/milestones/v1.2-phases/11-sql-store-design/schema/SCHEMA.md',
    '.planning/milestones/v1.2-phases/11-sql-store-design/schema/MIGRATIONS.md',
];
const SECTIONS = ['## Row keys', '## Open and closed rows', '## Settings', '## Integrity and quarantine', '## Reader contract'];

function derive(apiSrc) {
    const blocks = versionBlocks(apiSrc);
    const names = new Set();
    const settings = new Set();
    for (const block of blocks) {
        for (const s of block.statements) {
            let m;
            if ((m = /^create table (?:if not exists )?(\w+)/i.exec(s))) {
                names.add(m[1]);
                for (const col of s.matchAll(/^\s*([a-z_]+)\s+(?:TEXT|INTEGER)\b/gim)) {
                    names.add(col[1]);
                }
            }
            if ((m = /^create index (?:if not exists )?(\w+)/i.exec(s))) {
                names.add(m[1]);
            }
            if ((m = /^alter table \w+ add column (\w+)/i.exec(s))) {
                names.add(m[1]);
            }
            if ((m = /^insert or ignore into settings \(key, value\) values \('([^']+)'/i.exec(s))) {
                settings.add(m[1]);
            }
        }
    }
    return { head: schemaHead(apiSrc), blocks: blocks.length, names: [...names], settings: [...settings] };
}

function check({ apiSrc, doc, uris, planning }) {
    const failures = [];
    const d = derive(apiSrc);
    if (d.blocks !== d.head) {
        failures.push(`${API} has ${d.blocks} DDL marker blocks for schema head ${d.head}`);
    }
    for (let v = 1; v <= d.head; v += 1) {
        if (!new RegExp(`^## v${v}\\b`, 'm').test(doc)) {
            failures.push(`${DOC} has no "## v${v}" section`);
        }
    }
    if (new RegExp(`^## v${d.head + 1}\\b`, 'm').test(doc)) {
        failures.push(`${DOC} documents v${d.head + 1}, beyond the head ${d.head}`);
    }
    for (const name of d.names) {
        if (!doc.includes(`\`${name}\``)) {
            failures.push(`${DOC} never names \`${name}\``);
        }
    }
    for (const key of d.settings) {
        if (!doc.includes(`\`${key}\``)) {
            failures.push(`${DOC} never names the setting \`${key}\``);
        }
    }
    if (!doc.includes(`\`user_version = ${d.head}\``)) {
        failures.push(`${DOC} does not state \`user_version = ${d.head}\``);
    }
    for (const prefix of ['stock:', 'web:']) {
        if (!doc.includes(`\`${prefix}`)) {
            failures.push(`${DOC} does not state the ${prefix} key form`);
        }
    }
    for (const section of SECTIONS) {
        if (!doc.split('\n').includes(section)) {
            failures.push(`${DOC} has no "${section}" section`);
        }
    }
    if (/keys its rows by that URL/.test(uris)) {
        failures.push(`${URIS} still says the store keys its rows by the page URL`);
    }
    if (!uris.includes('TAB-STORE.md')) {
        failures.push(`${URIS} does not point at ${DOC}`);
    }
    for (const [path, text] of Object.entries(planning)) {
        if (!text.includes('docs/TAB-STORE.md')) {
            failures.push(`${path} has no pointer line to ${DOC} (controller-owned; decisions.md R4)`);
        }
    }
    return failures;
}

const read = rel => readFileSync(join(REPO_ROOT, rel), 'utf8');
const tree = {
    apiSrc: read(API),
    doc: read(DOC),
    uris: read(URIS),
    planning: Object.fromEntries(PLANNING.map(p => [p, read(p)])),
};
const failures = check(tree);
if (failures.length) {
    console.error('verify-ng-019-tab-store-doc: FAIL');
    failures.forEach(f => console.error(`  ${f}`));
    process.exit(1);
}
const d = derive(tree.apiSrc);
const plants = [
    ['missing version section', { ...tree, doc: tree.doc.replace(new RegExp(`^## v${d.head}\\b`, 'm'), '## gone') }, `"## v${d.head}"`],
    ['section beyond the head', { ...tree, doc: `${tree.doc}\n## v${d.head + 1}\n` }, `v${d.head + 1}`],
    ['undocumented column', { ...tree, doc: tree.doc.split('`closed_at`').join('closed_at') }, '`closed_at`'],
    ['undocumented setting', { ...tree, doc: tree.doc.split('`restore_behaviour`').join('restore_behaviour') }, '`restore_behaviour`'],
    ['stale URI-SCHEMES sentence', { ...tree, uris: `${tree.uris}\nThe store keys its rows by that URL.\n` }, 'page URL'],
];
let bad = 0;
for (const [label, planted, naming] of plants) {
    const got = check(planted);
    if (!got.some(f => f.includes(naming))) {
        console.error(`verify-ng-019-tab-store-doc: FAIL -- plant '${label}' did not go red naming ${naming}; got: ${got.join(' | ') || '(nothing)'}`);
        bad += 1;
    }
}
if (bad) {
    process.exit(1);
}
console.log(`verify-ng-019-tab-store-doc: PASS -- ${DOC} documents schema v1..v${d.head}; ${plants.length} planted drifts each went red`);
```

- [ ] **Step 11: Move the absence instrument's wiring gate to `scripts/lib/startup-wiring.mjs`, and write the NG-020 check**

Create `scripts/lib/startup-wiring.mjs`. It keeps today's text-pattern gate unchanged; Task 8 replaces that gate:

```js
// scripts/lib/startup-wiring.mjs
//
// The question the SQL-store absence instrument asks before its live drive:
// is the chrome-side tab store wired into startup? Shared so NG-020's check
// can put the same question to a planted source. `sources` maps a
// repo-relative path to its text; the default reads the two startup callers.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const WIRING_CALLERS = ['powerbrowser/shell/powerbrowser.js', 'powerbrowser/shell/TheiaService.sys.mjs'];

export function readWiringSources() {
    const sources = {};
    for (const file of WIRING_CALLERS) {
        try {
            sources[file] = readFileSync(join(REPO_ROOT, file), 'utf8');
        } catch {
            // A missing caller file is itself absent wiring.
        }
    }
    return sources;
}

export function startupWiringPresent(sources = readWiringSources()) {
    return Object.values(sources).some(src => /startTabStoreTriggers|ensureTabStore/.test(src));
}
```

In `scripts/verify-sql-store-absence.mjs`, delete `function startupWiringPresent()` and its comment (:352–369). Add `import { startupWiringPresent } from './lib/startup-wiring.mjs';` to the import block. `runLive`'s call `startupWiringPresent()` stays as it is. Then run `scripts/verify-platform.sh --only sql-store-absence-self-test`: expected PASS, the same as before the move.

Create `scripts/verify-ng-020-absence-wiring-by-call.mjs`:

```js
#!/usr/bin/env node
// scripts/verify-ng-020-absence-wiring-by-call.mjs -- NG-020 (non-GUI wave A).
//
// The SQL-store absence instrument decides whether the startup wiring exists
// before its live drive. That answer must rest on the call itself, not on a
// text pattern a comment also satisfies, and absent wiring must fail the
// instrument rather than let it exit STAGED (0).
//   1. Plant: TheiaService's source with each startup call turned into a
//      comment that still names it -> the gate must answer "unwired"; the
//      real source -> "wired".
//   2. The instrument must take its answer from that gate, and its
//      absent-wiring branch must fail, not stage.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { startupWiringPresent } from './lib/startup-wiring.mjs';
import { REPO_ROOT } from './lib/tab-store-fixtures.mjs';

const failures = [];
const file = 'powerbrowser/shell/TheiaService.sys.mjs';
const real = readFileSync(join(REPO_ROOT, file), 'utf8');
const planted = real
    .replace(/await PowerBrowserAPI\.ensureTabStore\(\)/g, 'undefined /* PowerBrowserAPI.ensureTabStore() */')
    .replace(/PowerBrowserAPI\.startTabStoreTriggers\(\)/g, 'undefined /* PowerBrowserAPI.startTabStoreTriggers() */');
if (planted === real) {
    failures.push(`the plant did not land: no startup call found in ${file}`);
} else {
    if (!startupWiringPresent({ [file]: real })) {
        failures.push(`the real ${file} reads as unwired`);
    }
    if (startupWiringPresent({ [file]: planted })) {
        failures.push(`a ${file} whose startup calls are only comments still reads as wired: the gate matches text, not the call`);
    }
}
const instrument = readFileSync(join(REPO_ROOT, 'scripts/verify-sql-store-absence.mjs'), 'utf8');
if (!/from '\.\/lib\/startup-wiring\.mjs'/.test(instrument)) {
    failures.push('the absence instrument does not take its wiring answer from scripts/lib/startup-wiring.mjs');
}
const branch = /if \(!startupWiringPresent\(\)\) \{([\s\S]*?)\n  \}/.exec(instrument);
if (!branch || !/\bfail\(/.test(branch[1]) || /\bstaged\(/.test(branch[1])) {
    failures.push('absent startup wiring ends the absence instrument as STAGED (exit 0), not as a failure');
}
if (failures.length) {
    console.error('verify-ng-020-absence-wiring-by-call: FAIL');
    failures.forEach(f => console.error(`  ${f}`));
    process.exit(1);
}
console.log('verify-ng-020-absence-wiring-by-call: PASS -- the gate needs the call, and absent wiring fails the instrument');
```

- [ ] **Step 12: Register every check in `scripts/verify-platform.sh`**

After the `gui08-persistence-roundtrip-self-test` row (:3847), in the quick array:

```bash
    # NEW (non-GUI wave A): the wave's quick-tier checks, one file per row
    # (decisions.md R1). ng-016 requires the gui08 roundtrip and its self-test
    # green at the writer's head; ng-019 derives the schema from the writer's
    # DDL markers and compares docs/TAB-STORE.md, then plants drifts; ng-020
    # plants a comment-only startup wiring into the absence instrument's gate.
    # Honestly --quick: text reads, in-memory plants and a mkdtemp stage.
    "ng-016-gui08-persistence-at-head|node $REPO_ROOT/scripts/verify-ng-016-gui08-persistence-at-head.mjs"
    "ng-019-tab-store-doc|node $REPO_ROOT/scripts/verify-ng-019-tab-store-doc.mjs"
    "ng-020-absence-wiring-by-call|node $REPO_ROOT/scripts/verify-ng-020-absence-wiring-by-call.mjs"
```

After the `sql-store-absence-self-test` row (:4771), in the full array:

```bash
      # NEW (non-GUI wave A): the wave's live checks, one file per row
      # (decisions.md R1). Each launches the built binary on a kept profile
      # (scripts/lib/ng-a-live.mjs) and drives the behaviour through the Theia
      # frontend's own services -- opener, GroupModel, GroupActorClient, the
      # Close Group command, card double-clicks -- then reads tabs.sqlite from
      # outside. Restart rows quit and relaunch on the same profile. Not
      # --quick: binary, Theia build, headless browser.
      "ng-001-one-key-rule|node $REPO_ROOT/scripts/verify-ng-001-one-key-rule.mjs"
      "ng-002-navigation-keeps-row|node $REPO_ROOT/scripts/verify-ng-002-navigation-keeps-row.mjs"
      "ng-003-same-url-two-rows|node $REPO_ROOT/scripts/verify-ng-003-same-url-two-rows.mjs"
      "ng-004-new-tab-row-unknown-uri-error|node $REPO_ROOT/scripts/verify-ng-004-new-tab-row-unknown-uri-error.mjs"
      "ng-005-prune-keeps-open-rows|node $REPO_ROOT/scripts/verify-ng-005-prune-keeps-open-rows.mjs"
      "ng-006-close-group-closes-web-tabs|node $REPO_ROOT/scripts/verify-ng-006-close-group-closes-web-tabs.mjs"
      "ng-007-shell-tabs-keep-group-across-restart|node $REPO_ROOT/scripts/verify-ng-007-shell-tabs-keep-group-across-restart.mjs"
      "ng-008-panorama-card-reopens-through-opener|node $REPO_ROOT/scripts/verify-ng-008-panorama-card-reopens-through-opener.mjs"
      "ng-009-content-age-columns|node $REPO_ROOT/scripts/verify-ng-009-content-age-columns.mjs"
      "ng-010-closed-tab-history|node $REPO_ROOT/scripts/verify-ng-010-closed-tab-history.mjs"
      "ng-011-settings-table-read|node $REPO_ROOT/scripts/verify-ng-011-settings-table-read.mjs"
      "ng-012-reader-reports-schema-errors|node $REPO_ROOT/scripts/verify-ng-012-reader-reports-schema-errors.mjs"
      "ng-013-unopenable-store-quarantined|node $REPO_ROOT/scripts/verify-ng-013-unopenable-store-quarantined.mjs"
      "ng-014-rebuild-at-head|node $REPO_ROOT/scripts/verify-ng-014-rebuild-at-head.mjs"
      "ng-015-real-migration-from-every-version|node $REPO_ROOT/scripts/verify-ng-015-real-migration-from-every-version.mjs"
      "ng-017-sql05-restarts-real-browser|node $REPO_ROOT/scripts/verify-ng-017-sql05-restarts-real-browser.mjs"
      "ng-018-scheduled-integrity-check|node $REPO_ROOT/scripts/verify-ng-018-scheduled-integrity-check.mjs"
```

- [ ] **Step 13: Write `docs/non-gui/checks-wave-a.tsv` (R1)**

The file has exactly three tab-separated fields per row:
- `NG-NNN`
- the test ref, `scripts/verify-ng-NNN-<slug>.mjs::<label>`
- a command that contains that file path, followed by the tier as a trailing comment, ` # live-main|live-clone|quick`

```bash
row() { printf '%s\tscripts/verify-%s.mjs::%s\tnode scripts/verify-%s.mjs  # %s\n' "$1" "$2" "$2" "$2" "$3"; }
{
  row NG-001 ng-001-one-key-rule live-main
  row NG-002 ng-002-navigation-keeps-row live-main
  row NG-003 ng-003-same-url-two-rows live-main
  row NG-004 ng-004-new-tab-row-unknown-uri-error live-main
  row NG-005 ng-005-prune-keeps-open-rows live-main
  row NG-006 ng-006-close-group-closes-web-tabs live-main
  row NG-007 ng-007-shell-tabs-keep-group-across-restart live-clone
  row NG-008 ng-008-panorama-card-reopens-through-opener live-clone
  row NG-009 ng-009-content-age-columns live-main
  row NG-010 ng-010-closed-tab-history live-main
  row NG-011 ng-011-settings-table-read live-main
  row NG-012 ng-012-reader-reports-schema-errors live-clone
  row NG-013 ng-013-unopenable-store-quarantined live-main
  row NG-014 ng-014-rebuild-at-head live-main
  row NG-015 ng-015-real-migration-from-every-version live-main
  row NG-016 ng-016-gui08-persistence-at-head quick
  row NG-017 ng-017-sql05-restarts-real-browser live-clone
  row NG-018 ng-018-scheduled-integrity-check live-main
  row NG-019 ng-019-tab-store-doc quick
  row NG-020 ng-020-absence-wiring-by-call quick
} > docs/non-gui/checks-wave-a.tsv
awk -F'\t' 'NF != 3 { print "bad row: " $0; bad = 1 } END { exit bad }' docs/non-gui/checks-wave-a.tsv
```

Check the file names: `cut -f2 docs/non-gui/checks-wave-a.tsv | cut -d: -f1 | xargs ls` must list all 20 files. The label in each file name is the label registered in `verify-platform.sh`.

NG-007, NG-008, NG-012 and NG-017 are `live-clone`, because their own changes are Theia-side or script-only. When they run in the clone, main already carries Task 2's chrome side, which merges first.

- [ ] **Step 14: Run every check and confirm each fails for its stated reason**

```bash
cd ~/coding/Power-Browser-ng-a
export PB_NG_ALLOW_DIRTY=1 PB_FIREFOX_BIN=$HOME/coding/Power-Browser/objdir/dist/bin/powerbrowser PB_BACKEND_MAIN=$PWD/theia/applications/browser/lib/backend/main.js
export PB_REAL_PROFILE_FIXTURE=$HOME/coding/Power-Browser-fixtures/real-profile-tabs-2026-09-25.sqlite
while IFS=$'\t' read -r id ref cmd; do
  echo "== $id"; flock $HOME/coding/Power-Browser/.git/pb-live.lock bash -c "$cmd" 2>&1 | grep -E '^  |: FAIL|: PASS|notice' | head -6
done < docs/non-gui/checks-wave-a.tsv
```

Every row must print `FAIL`, for this reason:

| Row | Expected failure |
|---|---|
| NG-001 | "no row keyed web:…" and "a row is keyed by its page URL" |
| NG-002 | "has no row in that group" |
| NG-003 | "have 1 row(s)" |
| NG-004 | "has no row" and `unknownPlace` "want a refusal" |
| NG-005 | "was pruned" |
| NG-006 | "left the group's in-shell tabs open" |
| NG-007 | "does not list terminal:ng007a" |
| NG-008 | "shows no card" |
| NG-009 | "carries no creation time" |
| NG-010 | "did not keep its row as history" |
| NG-011 | "has no settings row" |
| NG-012 | "answered groups … instead of reporting an error" |
| NG-013 | "was not quarantined" |
| NG-014 | "at version 2, want the head 4" |
| NG-015 | "the head (4) is not newer than the fixture's version 4", and "keyed https://…" |
| NG-016 | "declares schema head 2, the writer's head is 4" |
| NG-017 | "launched the browser 0 time(s)" |
| NG-018 | "no scheduled integrity_check" |
| NG-019 | ENOENT naming `docs/TAB-STORE.md` |
| NG-020 | "only comments still reads as wired" and "ends the absence instrument as STAGED" |

If a row fails for any other reason (a harness error, for example), fix the check here before committing. If a row passes, it is `RECORD FAILED` material: either the behaviour already exists, or the check is too weak and must be rewritten.

- [ ] **Step 15: Commit gate, then commit**

```bash
git add scripts/lib/tab-store-fixtures.mjs scripts/lib/ng-a-live.mjs scripts/lib/startup-wiring.mjs scripts/verify-ng-0*.mjs \
  scripts/verify-sql-store-absence.mjs scripts/verify-platform.sh docs/non-gui/checks-wave-a.tsv
node scripts/scan-brand-residue.mjs
# the commit-gate command above: prints only ng-016, ng-019, ng-020
git commit -m "test(ng-a): failing checks for tab identity and store (NG-001..NG-020)" -m "Refs: NG-001, NG-002, NG-003, NG-004, NG-005, NG-006, NG-007, NG-008, NG-009, NG-010, NG-011, NG-012, NG-013, NG-014, NG-015, NG-016, NG-017, NG-018, NG-019, NG-020"
```

---

### Task 2: Key rule, schema v5 and its migration (NG-001, NG-002, NG-003, NG-004, NG-005, NG-014, NG-015). Merges before the rest of wave A.

**Files:**
- Modify: `powerbrowser/shell/PowerBrowserAPI.sys.mjs`. The edits:
  - :45–109: `TAB_STORE_SCHEMA_HEAD`, the v5 marker block, key constants and helpers (R2).
  - :780–782: `browserTabKey` becomes `stockTabKey`.
  - :795–838: `openTabStore`.
  - Around :1009: the v4 stamp fix, plus `migrateTabStoreToV5` and `migrateTabStoreToHead`.
  - :988–999: `setTabPosition`.
  - :1035–1051: `setGroupOrder`.
  - :1078–1102: `writeTabRow` and `removeTabRow`, plus the new `closeTabRow`, `closeAbsentStockRows`, `trackShellTab` and `closeEndedWebRows`.
  - :1470–1484: `findStockTabBrowser`.
  - :1719–1950: the `webTabOpen` arm, plus the new `trackTab` and `closeTab` arms.
  - :2038–2054: `pruneClosedTabRows`.
  - :2078–2109: `parseSessionStoreTabRows`.
  - :2175–2189: the quarantine reopen and chain.
  - :2210–2233: `ensureTabStore`.
  - :2242–2254: the sweep.
  - :2270–2311: `onTabEvent`.
  - :2397–2518: `webTabOpen`.
- Modify: `theia/extensions/tab-uris/src/node/tab-query-service.ts`: the header, the import, `getBrowserTabByUrl`, `searchByPrefix`, `getGroupTabs` and `listUngroupedTabs`.
- Modify: `theia/extensions/tab-uris/src/browser/web-tab.ts`: `WebTabOptions`, the message types, `rowKey`, `onAfterAttach`, `reopen` and `onCloseRequest`.
- Modify: `theia/extensions/modes/src/browser/group-model.ts`: `tabKeyOf`, the injections, `keyOf`, `ensureRow` and `watchClose`, the live branch of `load`, and the three write helpers. The session maps are deleted.
- Modify (R2): `theia/extensions/modes/src/browser/organising-widget.ts` :49, :259, :336–356 and :1954–1962; `theia/extensions/modes/src/browser/group-actor-client.ts` :25–36; `scripts/verify-chrome-bar-suggestions.mjs` `seedFixture`.
- Delete (R2): `theia/extensions/tab-uris/src/browser/browser-tab-uri.ts`.
- Create: `docs/TAB-STORE.md`.
- Modify: `docs/URI-SCHEMES.md` :250–254.

**Interfaces:**
- Consumes: Task 1's checks.
- Produces:

```text
SCHEMA v5  (tabs.sqlite, PRAGMA user_version = 5; the file holds the v1 CREATE plus ALTERs; equivalent shape)

  tabs
    uri            TEXT PRIMARY KEY CHECK(length(uri) > 0)   -- row key, rule below                 (v1)
    url            TEXT NOT NULL                             -- the tab's current address; '' = none  (v1)
    title          TEXT NOT NULL DEFAULT ''                                                            (v1)
    last_active    INTEGER NOT NULL CHECK(last_active >= 0)  -- ms epoch, last seen open               (v1)
    group_id       TEXT NULL                                 -- groups.id                              (v2)
    thumbnail      TEXT NULL                                 -- PNG data URL                           (v2)
    x              INTEGER NULL                              -- loose-card canvas position             (v3)
    y              INTEGER NULL                                                                        (v3)
    ord            INTEGER NULL                              -- place within its group                 (v4)
    created_at     INTEGER NULL                              -- ms epoch the row was created; NULL = before v5   (v5)
    last_accessed  INTEGER NULL                              -- ms epoch last looked at; NULL = not recorded     (v5)
    closed_at      INTEGER NULL                              -- ms epoch the user closed it; NULL = open or restorable (v5)
  indexes: idx_tabs_last_active (last_active), idx_tabs_group (group_id), idx_tabs_closed_at (closed_at)
  groups   (v2, unchanged): id, title, x, y, w, h, is_active; idx_groups_active (is_active)
  settings (v5): key TEXT PRIMARY KEY CHECK(length(key) > 0), value TEXT NOT NULL
    seeded: closed_retention_days='7', integrity_check_minutes='1440', restore_behaviour='session',
            restore_live_minutes='5', restore_url_days='30'

v4 -> v5 DDL (marker block PB-SQL-V5-DDL, one transaction, ADD COLUMN skipped when present):
  ALTER TABLE tabs ADD COLUMN created_at INTEGER NULL;
  ALTER TABLE tabs ADD COLUMN last_accessed INTEGER NULL;
  ALTER TABLE tabs ADD COLUMN closed_at INTEGER NULL;
  CREATE INDEX IF NOT EXISTS idx_tabs_closed_at ON tabs (closed_at);
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY CHECK(length(key) > 0), value TEXT NOT NULL);
  INSERT OR IGNORE INTO settings (key, value) VALUES (<the five seeds above>);
  UPDATE tabs SET uri = 'stock:legacy-' || rowid WHERE uri LIKE 'webview:%';
  UPDATE tabs SET uri = 'web:legacy-' || rowid WHERE uri LIKE 'http://%' OR uri LIKE 'https://%'

KEY RULE  tabs.uri = '<kind>:<identity>', never the page URL, one row per tab
  stock tab       stock:<launch-stamp base36>-<n>   minted chrome-side the first time the store sees the tab,
                                                    kept as the SessionStore custom tab value 'powerbrowser-tab-key'
                                                    (survives navigation and session restore); migrated: stock:legacy-<rowid>
  in-shell web    web:<id>                          <id> = WebTabOptions.key's suffix when the opener passed one,
  tab (New Tab                                      else WebTabOptions.id ('wt-<session>-<n>'); chrome accepts
  included)                                         only ^web:[A-Za-z0-9_-]{1,64}$; migrated: web:legacy-<rowid>
  Theia-drawn     its registry address              TabUriRegistry.uriOf(widget) (terminal:<name>, view:<id>, settings:,
  tab                                               output:<channel>), else its Navigatable resource URI
                                                    (file:///…, untitled:…), else widget:<widget id>; spelled toString(true);
                                                    the row is written the first time the tab is organised (trackTab)
  'webview:' is never a row key.

LIFECYCLE
  open        closed_at IS NULL. Every upsert (writeTabRow) sets closed_at = NULL.
  closed      closed_at = now when: a stock tab fires TabClose; a web tab's widget is closed (closeTab from web-tab.ts);
              a tracked Theia tab's widget is disposed (closeTab from GroupModel); the sweep finds a stock row absent
              from sessionstore's open tabs; at startup, a web: row with no group and no position (its tab ended with
              the last session). A quit or frontend reload never closes a row.
  pruned      DELETE WHERE closed_at IS NOT NULL AND closed_at < now - retention (7 days; Task 7 reads
              closed_retention_days). A row with closed_at NULL is never pruned.

ACTOR KINDS (PowerBrowserGroupRequest from the Theia frame; reply { ok, kind, …echo } | { ok: false, reason, message })
  webTabOpen      { tabId, url, key? }         key: row key for this tab ('web:…'); absent -> 'web:' + tabId
  trackTab        { uri, url, title }          upsert a Theia-drawn tab's row; refuses 'stock:'/'web:' keys
  closeTab        { uri }                      closed_at = now; refuses 'stock:' keys
  setTabGroup, setTabPosition, setGroupOrder   now reject 'unknown tab URI <uri>' (reason 'validation') for a key with no row

CHROME (PowerBrowserAPI, powerbrowser/shell/PowerBrowserAPI.sys.mjs)
  const TAB_STORE_SCHEMA_HEAD = 5
  migrateTabStoreToHead(conn): Promise<void>                 the one chain, used by openTabStore and the quarantine rebuild
  migrateTabStoreToV5(conn): Promise<void>
  stockTabKey(tab): string                                   (replaces browserTabKey(urlSpec), deleted)
  writeTabRow({ uri, url, title, lastActive?, chromeWin? }): Promise<"written" | "skipped-private">
  trackShellTab(uri, url, title): Promise<"written">
  closeTabRow(uri): Promise<void>
  closeAbsentStockRows(liveKeys: string[]): Promise<void>
  closeEndedWebRows(): Promise<void>
  removeTabRow(uri): Promise<void>                           kept name; now stamps last_active only, never deletes
  pruneClosedTabRows(closedBefore: number): Promise<void>    (was (openUris, activeSince))
  parseSessionStoreTabRows(): { uri, url, title, last_active }[]   keyed by the custom tab value; unkeyed tabs skipped
  webTabOpen(theiaBrowser, actorRef, tabId, url, key?): string

THEIA
  group-model.ts        export function tabKeyOf(widget: Widget, registry: TabUriRegistry): string
                        GroupModel.keyOf(widget: Widget): string
  web-tab.ts            WebTabOptions { id: string; url: string; key?: string }
                        WebTabWidget.rowKey: string
                        TabRowMessage = { kind: 'closeTab'; uri: string }
                        WebTabMessage webTabOpen = { kind: 'webTabOpen'; tabId: string; url: string; key: string }
  group-actor-client.ts GroupMutation adds { kind: 'trackTab'; uri; url; title } | { kind: 'closeTab'; uri }
  tab-query-service.ts  getGroupTabs, listUngroupedTabs, searchByPrefix, getBrowserTabByUrl read open rows only
                        (closed_at IS NULL); searchByPrefix also only http(s) rows; getBrowserTabByUrl matches the url column

FOR WAVES B AND C
  B: rows are joined by tabs.url (page address) to Places; tabs.uri is identity only. Two open tabs on one URL are
     two rows. Every write goes through the chrome writer (actor kinds above), never a second writer.
  C: a web tab restored across a restart must keep its WebTabOptions.id, or pass the saved row key as WebTabOptions.key,
     so it writes the same row; a saved session records per web tab its rowKey, url and last_accessed, plus the
     save time, for planWebTabRestore (Task 7).
```

- [ ] **Step 1: Confirm the Task 1 checks for this slice fail on the tree**

Run from the clone:

```bash
for l in ng-001-one-key-rule ng-002-navigation-keeps-row ng-003-same-url-two-rows ng-004-new-tab-row-unknown-uri-error ng-005-prune-keeps-open-rows ng-014-rebuild-at-head ng-015-real-migration-from-every-version; do
  flock $HOME/coding/Power-Browser/.git/pb-live.lock scripts/verify-platform.sh --only $l >/dev/null 2>&1; echo "$l exit $?"; done
```

Expected: every exit is 1.

- [ ] **Step 2: Verify the upstream surfaces this task relies on**

```bash
grep -n "getCustomTabValue(aTab, aKey)\|setCustomTabValue(aTab, aKey" upstream/browser/components/sessionstore/SessionStore.sys.mjs
grep -n "TAB_CUSTOM_VALUES.set(tab, Cu.cloneInto(tabData.extData" upstream/browser/components/sessionstore/SessionStore.sys.mjs
grep -n "tabData.extData = options.extData" upstream/browser/components/sessionstore/TabState.sys.mjs
```

Expected: one hit each (:5032/:5036, :6541, :113). The restore line overwrites the custom values with the saved `extData`. A key minted on `TabOpen` before a restore is therefore replaced by the saved one, and the sweep closes the orphan row.

- [ ] **Step 3: Schema constants and key helpers (PBA :45–109, R2)**

Change `const TAB_STORE_SCHEMA_HEAD = 4;` to `5`. After `TAB_ORDER_V4_DDL` (:89), add:

```js
// NG-001 (non-GUI wave A): v4 to v5 -- one row per tab, keyed by the tab's
// identity instead of its page URL, plus the content-age, closed-history and
// settings columns the rest of the store builds on (docs/TAB-STORE.md). The
// key rewrite runs in the same transaction as the columns, in place, so every
// row keeps its rowid, group, position, order and thumbnail.
const TAB_STORE_V5_DDL = /* PB-SQL-V5-DDL-START */ `ALTER TABLE tabs ADD COLUMN created_at INTEGER NULL;
ALTER TABLE tabs ADD COLUMN last_accessed INTEGER NULL;
ALTER TABLE tabs ADD COLUMN closed_at INTEGER NULL;
CREATE INDEX IF NOT EXISTS idx_tabs_closed_at ON tabs (closed_at);
CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY CHECK(length(key) > 0),
  value       TEXT NOT NULL
);
INSERT OR IGNORE INTO settings (key, value) VALUES ('closed_retention_days', '7');
INSERT OR IGNORE INTO settings (key, value) VALUES ('integrity_check_minutes', '1440');
INSERT OR IGNORE INTO settings (key, value) VALUES ('restore_behaviour', 'session');
INSERT OR IGNORE INTO settings (key, value) VALUES ('restore_live_minutes', '5');
INSERT OR IGNORE INTO settings (key, value) VALUES ('restore_url_days', '30');
UPDATE tabs SET uri = 'stock:legacy-' || rowid WHERE uri LIKE 'webview:%';
UPDATE tabs SET uri = 'web:legacy-' || rowid WHERE uri LIKE 'http://%' OR uri LIKE 'https://%'` /* PB-SQL-V5-DDL-END */;

// NG-001: the sessionstore custom tab value a stock tab's row key lives in.
// Sessionstore saves it with the tab and restores it with the tab, so a
// restart keeps the key (SessionStore.sys.mjs:6541 restores extData).
const STOCK_TAB_KEY_VALUE = "powerbrowser-tab-key";
// Stock keys minted this launch: a new launch mints from a new stamp, so a key
// is never reused while its row may still exist.
const STOCK_KEY_STAMP = Date.now().toString(36);
let stockKeySeq = 0;

// NG-001: the only web-tab key chrome accepts from the frontend.
function webTabKeyIsValid(key) {
  return typeof key === "string" && /^web:[A-Za-z0-9_-]{1,64}$/.test(key);
}
```

- [ ] **Step 4: `stockTabKey` replaces `browserTabKey` (:773–782)**

```js
  /**
   * NG-001: the row key of a stock browser tab, `stock:<stamp>-<n>`. Minted the
   * first time the store sees the tab and kept on it as a sessionstore custom
   * tab value, so a navigation, a second tab on the same page, and a restart
   * that restores the tab all keep the one key and the one row.
   */
  stockTabKey(tab) {
    const stored = lazy.SessionStore.getCustomTabValue(tab, STOCK_TAB_KEY_VALUE);
    if (stored) {
      return stored;
    }
    stockKeySeq += 1;
    const key = `stock:${STOCK_KEY_STAMP}-${stockKeySeq}`;
    lazy.SessionStore.setCustomTabValue(tab, STOCK_TAB_KEY_VALUE, key);
    return key;
  },
```

- [ ] **Step 5: One migration chain (`openTabStore` :821–835, `migrateTabStoreToV4`, new methods)**

In `openTabStore`, replace the `if (schemaVersion < TAB_STORE_SCHEMA_HEAD) { … }` block (:821–835) with:

```js
    await PowerBrowserAPI.migrateTabStoreToHead(conn);
```

In `migrateTabStoreToV4`, both `setSchemaVersion(TAB_STORE_SCHEMA_HEAD)` calls become `setSchemaVersion(4)`. Add this comment above the first one: `// Exactly 4, never the head: a store arriving here must still fall through to migrateTabStoreToV5.`

After `migrateTabStoreToV4`, add:

```js
  /**
   * NG-001: v4 to v5. The marker block's statements in one transaction -- an
   * ADD COLUMN whose column exists is skipped, the CREATEs are IF NOT EXISTS,
   * the INSERTs OR IGNORE and the key rewrite matches only old-shape keys -- so
   * a store whose work is already done re-runs as a no-op that stamps 5.
   */
  async migrateTabStoreToV5(conn) {
    const statements = TAB_STORE_V5_DDL.split(";").map(s => s.trim()).filter(Boolean);
    if (!statements.some(s => /^update tabs set uri\b/i.test(s))) {
      throw new Error("migrateTabStoreToV5: DDL marker content missing the key rewrite");
    }
    await conn.executeTransaction(async () => {
      for (const statement of statements) {
        const column = /^alter table tabs add column (\w+)/i.exec(statement);
        if (column && (await PowerBrowserAPI.tabStoreHasColumn(conn, "tabs", column[1]))) {
          continue;
        }
        await conn.execute(statement);
      }
      // Exactly 5; a later head adds its own step after this one.
      await conn.setSchemaVersion(5);
    });
  },

  /**
   * NG-014: the one forward chain from whatever version the file carries to
   * the head, each step its own top-level transaction (CR-02: never nested).
   * openTabStore and the quarantine rebuild both run it, so a rebuilt store
   * lands at the head, never at a version in between.
   */
  async migrateTabStoreToHead(conn) {
    const steps = [
      PowerBrowserAPI.migrateTabStoreToV1,
      PowerBrowserAPI.migrateTabStoreToV2,
      PowerBrowserAPI.migrateTabStoreToV3,
      PowerBrowserAPI.migrateTabStoreToV4,
      PowerBrowserAPI.migrateTabStoreToV5,
    ];
    if (steps.length !== TAB_STORE_SCHEMA_HEAD) {
      throw new Error(`migrateTabStoreToHead: ${steps.length} steps for head ${TAB_STORE_SCHEMA_HEAD}`);
    }
    for (let version = await conn.getSchemaVersion(); version < TAB_STORE_SCHEMA_HEAD; version += 1) {
      await steps[version](conn);
    }
  },
```

- [ ] **Step 6: Unknown keys are errors (`setTabPosition` :988–999, `setGroupOrder` :1035–1051)**

In `setTabPosition`, after `const conn = await PowerBrowserAPI.openTabStore();`:

```js
    // NG-004: a key with no row is an error, never a silent no-op the caller reads as saved.
    const known = await conn.execute("SELECT 1 FROM tabs WHERE uri = :uri", { uri });
    if (!known.length) {
      throw new Error(`setTabPosition: unknown tab URI ${uri}`);
    }
```

In `setGroupOrder`, after `const conn = await PowerBrowserAPI.openTabStore();`:

```js
    // NG-004: every named tab must be a row in this group; one that is not is an error.
    const group = await conn.execute("SELECT 1 FROM groups WHERE id = :groupId", { groupId });
    if (!group.length) {
      throw new Error(`setGroupOrder: unknown group ${groupId}`);
    }
    for (const uri of uris) {
      const member = await conn.execute("SELECT 1 FROM tabs WHERE uri = :uri AND group_id = :groupId", { uri: String(uri), groupId });
      if (!member.length) {
        throw new Error(`setGroupOrder: unknown tab URI ${String(uri)} in group ${groupId}`);
      }
    }
```

- [ ] **Step 7: Write, close and track paths (:1071–1102 plus new methods)**

Replace `writeTabRow` and `removeTabRow`, and add four methods after them:

```js
  /**
   * SQL-01 (12-01): the single write path; NG-001 keys it by tab identity. The
   * private-window check runs BEFORE the upsert -- a private tab never reaches
   * SQL. An upsert reopens the row (closed_at NULL): a tab being written is
   * open. created_at is set once, on insert; an empty title never blanks a
   * stored one (a reopened tab writes before its page has a title).
   */
  async writeTabRow({ uri, url, title, lastActive, chromeWin }) {
    if (chromeWin && lazy.PrivateBrowsingUtils.isWindowPrivate(chromeWin)) {
      return "skipped-private";
    }
    const conn = await PowerBrowserAPI.openTabStore();
    const now = Date.now();
    try {
      await conn.executeCached(
        `INSERT INTO tabs (uri, url, title, last_active, created_at) VALUES (:uri, :url, :title, :last_active, :now)
         ON CONFLICT (uri) DO UPDATE SET url=excluded.url,
           title=CASE WHEN excluded.title = '' THEN tabs.title ELSE excluded.title END,
           last_active=excluded.last_active, closed_at=NULL`,
        { uri, url, title: title ?? "", last_active: lastActive ?? now, now }
      );
    } catch (err) {
      throw new Error(`writeTabRow: upsert failed for ${uri}: ${err && err.message ? err.message : err}`);
    }
    return "written";
  },

  /**
   * The live view of a tab ended without the user closing it -- a frontend
   * reload or the quit dropped its overlay (webTabClose via webTabDropOwnedBy).
   * NG-005: the row stays open; only last_active (last seen open) moves. A
   * user's close arrives as closeTab and marks the row closed.
   */
  async removeTabRow(uri) {
    const conn = await PowerBrowserAPI.openTabStore();
    await conn.execute("UPDATE tabs SET last_active = :now WHERE uri = :uri", { uri, now: Date.now() });
  },

  /** NG-005/NG-010: the user closed this tab; its row stays as closed-tab history until the prune. */
  async closeTabRow(uri) {
    const conn = await PowerBrowserAPI.openTabStore();
    await conn.execute("UPDATE tabs SET closed_at = :now WHERE uri = :uri AND closed_at IS NULL", { uri, now: Date.now() });
  },

  /**
   * NG-005: stock rows sessionstore no longer lists as open are closed -- the
   * window was closed, or the tab was restored under its saved key and the key
   * minted before the restore is an orphan. `liveKeys` is sessionstore's open set.
   */
  async closeAbsentStockRows(liveKeys) {
    const conn = await PowerBrowserAPI.openTabStore();
    const params = { now: Date.now() };
    const names = [...new Set(liveKeys)].map((key, i) => {
      params[`k${i}`] = key;
      return `:k${i}`;
    });
    await conn.execute(
      `UPDATE tabs SET closed_at = :now WHERE closed_at IS NULL AND uri LIKE 'stock:%'${names.length ? ` AND uri NOT IN (${names.join(", ")})` : ""}`,
      params
    );
  },

  /**
   * NG-005: at startup no in-shell web tab can be open -- the frontend has not
   * loaded. A web row nobody grouped or placed ended with the last session and
   * becomes closed-tab history; grouped or placed ones stay as Panorama cards.
   */
  async closeEndedWebRows() {
    const conn = await PowerBrowserAPI.openTabStore();
    await conn.execute(
      "UPDATE tabs SET closed_at = :now WHERE closed_at IS NULL AND uri LIKE 'web:%' AND group_id IS NULL AND x IS NULL",
      { now: Date.now() }
    );
  },

  /**
   * NG-001: the row of a Theia-drawn tab (editor, terminal, view), keyed by its
   * registry address and written the first time it is organised. Stock and web
   * keys are chrome's own and are refused here.
   */
  async trackShellTab(uri, url, title) {
    if (typeof uri !== "string" || !uri || uri.length > 2048 || /^(stock|web):/.test(uri)) {
      throw new Error("trackShellTab: refusing malformed tab key");
    }
    return PowerBrowserAPI.writeTabRow({
      uri,
      url: typeof url === "string" ? url.slice(0, 2048) : "",
      title: typeof title === "string" ? title.slice(0, 512) : "",
    });
  },
```

- [ ] **Step 8: Stock lookup by key (`findStockTabBrowser` :1470–1484)**

Replace the `spec` lines in the loop body:

```js
      for (const tab of tabs) {
        if (tab && lazy.SessionStore.getCustomTabValue(tab, STOCK_TAB_KEY_VALUE) === uri) {
          return { win, tab, browser: tab.linkedBrowser };
        }
      }
```

- [ ] **Step 9: Actor arms (`handleGroupMutation`)**

Replace the `webTabOpen` arm:

```js
        case "webTabOpen": {
          if (!webTabIdIsValid(data.tabId)) {
            return { ok: false, reason: "validation", message: "handleGroupMutation: refusing malformed tabId" };
          }
          if (data.key !== undefined && !webTabKeyIsValid(data.key)) {
            return { ok: false, reason: "validation", message: "handleGroupMutation: refusing malformed tab key" };
          }
          const theiaBrowser = actorRef.browsingContext.top.embedderElement;
          return { ok: true, kind, where: PowerBrowserAPI.webTabOpen(theiaBrowser, actorRef, data.tabId, data.url, data.key) };
        }
```

After the `setActiveGroup` arm, add:

```js
        // NG-001: a Theia-drawn tab gets its row the first time it is organised.
        case "trackTab": {
          await PowerBrowserAPI.trackShellTab(data.uri, data.url, data.title);
          return { ok: true, kind, uri: data.uri };
        }
        // NG-005: the user closed a web or Theia tab; stock closes arrive as TabClose.
        case "closeTab": {
          if (typeof data.uri !== "string" || !data.uri || data.uri.startsWith("stock:")) {
            return { ok: false, reason: "validation", message: "handleGroupMutation: refusing malformed tab key" };
          }
          await PowerBrowserAPI.closeTabRow(data.uri);
          return { ok: true, kind, uri: data.uri };
        }
```

- [ ] **Step 10: Prune, parse, sweep, ensure and quarantine (:2038–2254)**

`pruneClosedTabRows`:

```js
  /**
   * NG-005: deletes closed-tab history older than the cutoff. A row with
   * closed_at NULL is never deleted, whatever its age: an open tab's row
   * survives however long the tab stays open.
   */
  async pruneClosedTabRows(closedBefore) {
    const conn = await PowerBrowserAPI.openTabStore();
    await conn.execute("DELETE FROM tabs WHERE closed_at IS NOT NULL AND closed_at < :cutoff", { cutoff: closedBefore });
  },
```

In `parseSessionStoreTabRows`, the tab loop becomes:

```js
        for (const tab of win.tabs ?? []) {
          const entry = tab.entries?.[tab.index - 1];
          // NG-001: the key travels with the tab as its custom value; a tab
          // the store has not keyed yet gets its key from the triggers.
          const uri = tab.extData?.[STOCK_TAB_KEY_VALUE];
          if (!entry || !entry.url || !uri) {
            continue;
          }
          rows.push({ uri, url: entry.url, title: entry.title ?? "", last_active: now });
        }
```

`sweepTabStoreFromSessionStore`: replace the prune line with:

```js
    await PowerBrowserAPI.closeAbsentStockRows(liveUris);
    await PowerBrowserAPI.pruneClosedTabRows(Date.now() - TAB_STORE_CLOSED_RETENTION_MS);
```

In `ensureTabStore`, the `return "ready"` and `return "rebuilt"` both go through the startup close:

```js
    const ok = await PowerBrowserAPI.checkTabStoreIntegrity();
    let state = "ready";
    if (!ok) {
      try {
        const restoreRows = PowerBrowserAPI.parseSessionStoreTabRows();
        await PowerBrowserAPI.quarantineAndRebuildTabStore(restoreRows);
        state = "rebuilt";
      } catch (err) {
        PowerBrowserAPI.log("error", `[ensureTabStore] rebuild failed: ${err && err.message ? err.message : err}`);
        return "degraded";
      }
    }
    await PowerBrowserAPI.closeEndedWebRows().catch(err => {
      PowerBrowserAPI.log("error", `[ensureTabStore] closing ended web rows failed: ${err && err.message ? err.message : err}`);
    });
    return state;
```

In `quarantineAndRebuildTabStore`, replace the block from `// Quarantine-not-delete invariant` to `tabStoreConn = null;` (:2142–2159) with the forensics step below. A tampered page can fail the backup API, and with no open connection there is nothing to back up from. In both cases the file's bytes are the forensics:

```js
    // Quarantine-not-delete invariant: the live file is removed only after
    // forensics land at corruptPath. NG-013/NG-014: backupToFile needs an open
    // connection and pages it can read; failing either, the bytes are copied.
    try {
      if (!tabStoreConn) {
        throw new Error("no open connection");
      }
      await tabStoreConn.backupToFile(corruptPath);
    } catch {
      try {
        await IOUtils.copy(livePath, corruptPath);
      } catch (err) {
        throw new Error(`quarantineAndRebuildTabStore: forensics copy failed: ${err && err.message ? err.message : err}`);
      }
    }
    if (tabStoreConn) {
      try {
        await tabStoreConn.close();
      } catch {
        // Close is best-effort; the rebuild below reopens.
      }
    }
    tabStoreConn = null;
```

The text order the roundtrip static check pins stays: `backupToFile`, then `await IOUtils.remove(livePath);`, then the reopen. The reopen and chain (:2175–2189) become:

```js
    // 14.1-03 / NG-014: not exclusive, like openTabStore -- an exclusive
    // rebuilt connection served the backend reader SQLITE_BUSY until restart.
    const conn = await lazy.Sqlite.openConnection({ openNotExclusive: true, path: TAB_STORE_FILE_NAME });
    await conn.execute("PRAGMA journal_mode=WAL;");
    // CR-02: the migration runs as its own top-level transactions, the row
    // inserts in a second one -- sequential, never nested. NG-014: the whole
    // chain to the head, so the rebuilt store is what every reader expects.
    // Group rows rebuild EMPTY and restored tabs land ungrouped (15-RESEARCH A3);
    // the corrupt copy stays the only record of lost membership.
    await PowerBrowserAPI.migrateTabStoreToHead(conn);
```

The `openConnection({ openNotExclusive: true, path: TAB_STORE_FILE_NAME })` spelling keeps the tail `TAB_STORE_FILE_NAME });` that `verify-sql-store-roundtrip.mjs` pins.

- [ ] **Step 11: Triggers key stock tabs by identity (`onTabEvent` :2270–2311)**

```js
    const onTabEvent = event => {
      try {
        const tab = event.target;
        const browser = tab && tab.linkedBrowser;
        const spec = browser && browser.currentURI && browser.currentURI.spec;
        const chromeWin = tab && tab.ownerDocument && tab.ownerDocument.defaultView;
        // Private tabs get no key and no row (the writer re-checks before its upsert).
        if (!spec || (chromeWin && lazy.PrivateBrowsingUtils.isWindowPrivate(chromeWin))) {
          return;
        }
        const uri = PowerBrowserAPI.stockTabKey(tab);
        if (event.type === "TabClose") {
          // Last view is final -- capture on settle, never synchronously.
          PowerBrowserAPI.scheduleSettleCapture(uri, chromeWin);
          PowerBrowserAPI.closeTabRow(uri).catch(err => {
            PowerBrowserAPI.log("error", `[tab-store-trigger] close failed: ${err && err.message ? err.message : err}`);
          });
          return;
        }
```

The TabSelect block and the `writeTabRow` call after it stay as they are.

- [ ] **Step 12: `webTabOpen` row writes (:2397–2518)**

The signature becomes `webTabOpen(theiaBrowser, actorRef, tabId, url, key)`. Replace the `entry` creation line and the listener row writes:

```js
    // NG-001: the row key is the tab's identity -- the key the frontend sent
    // (a reopened card's row) or web:<tabId> -- never the page URL.
    const entry = { browser, uri: key || `web:${tabId}`, listener: null, titleListener: null, owner: actorRef };
    // NG-004: the row exists from the moment the tab does, a New Tab on the
    // empty page included, so every Panorama mutation has a row to act on.
    PowerBrowserAPI.writeTabRow({ uri: entry.uri, url: spec === "about:blank" ? "" : spec, title: "", chromeWin: win }).catch(err => {
      PowerBrowserAPI.log("error", `[web-tab] writeTabRow failed for ${entry.uri}: ${err && err.message ? err.message : err}`);
    });
```

In `onLocationChange`, the http(s) branch becomes:

```js
        if (!sameDocument && /^https?:\/\//i.test(locationSpec)) {
          // NG-002: a navigation updates this tab's row in place -- group, x/y,
          // ord and thumbnail stay.
          PowerBrowserAPI.writeTabRow({ uri: entry.uri, url: locationSpec, title: browser.contentTitle, chromeWin: win }).catch(err => {
            PowerBrowserAPI.log("error", `[web-tab] writeTabRow failed for ${entry.uri}: ${err && err.message ? err.message : err}`);
          });
        }
```

In `onStateChange`, the capture condition becomes `if (!starting && (stateFlags & Ci.nsIWebProgressListener.STATE_STOP) && /^https?:\/\//i.test(browser.currentURI.spec))`. `entry.uri` is always set now, and the empty page has nothing to capture.

`titleListener` becomes:

```js
    entry.titleListener = () => {
      const pageSpec = browser.currentURI ? browser.currentURI.spec : "";
      if (/^https?:\/\//i.test(pageSpec)) {
        PowerBrowserAPI.writeTabRow({ uri: entry.uri, url: pageSpec, title: browser.contentTitle, chromeWin: win }).catch(err => {
          PowerBrowserAPI.log("error", `[web-tab] writeTabRow failed for ${entry.uri}: ${err && err.message ? err.message : err}`);
        });
      }
      PowerBrowserAPI.webTabPush(theiaBrowser, tabId, browser, browser.webProgress.isLoadingDocument);
    };
```

Update the "Store rows (SC4)" comment above `entry.listener` to say rows are keyed by tab identity, per `docs/TAB-STORE.md`. Run `node --check powerbrowser/shell/PowerBrowserAPI.sys.mjs`.

- [ ] **Step 13: TabQueryService reads open rows by identity**

1. Delete `import { browserTabKeyOf } from '../browser/browser-tab-uri';`. Replace the header paragraph "Browser-tab lookups apply the beside-registry key rule…" with: "Rows are keyed by tab identity (docs/TAB-STORE.md); the page address is the `url` column. Panorama and suggestion reads serve open rows only (`closed_at IS NULL`)."
2. `getBrowserTabByUrl`:

```ts
    /**
     * The open row showing `urlSpec`, most recently active first. The page
     * address is a column to match, never a key to rebuild (NG-001).
     */
    getBrowserTabByUrl(urlSpec: string): TabQueryRow | undefined {
        const db = this.openIfNeeded();
        if (!db) {
            return undefined;
        }
        try {
            return db.prepare('SELECT uri, url, title, last_active FROM tabs WHERE url = ? AND closed_at IS NULL ORDER BY last_active DESC LIMIT 1').get(urlSpec) as TabQueryRow | undefined;
        } catch {
            return undefined;
        }
    }
```

3. The `searchByPrefix` statement, kept as one single-quoted literal (`gui06-chrome-bar-suggestions` derives it):

```ts
                'SELECT uri, url, title, last_active FROM tabs WHERE (url LIKE ? ESCAPE \'\\\' OR title LIKE ? ESCAPE \'\\\') AND closed_at IS NULL AND url LIKE \'http%\' ORDER BY last_active DESC LIMIT ?'
```

4. In `getGroupTabs`, the WHERE becomes `WHERE group_id = ? AND closed_at IS NULL`. In `listUngroupedTabs`, it becomes `WHERE group_id IS NULL AND closed_at IS NULL`.

- [ ] **Step 14: Update the chrome-bar check's fixture (R2)**

In `scripts/verify-chrome-bar-suggestions.mjs` `seedFixture`, the `CREATE TABLE tabs` gains a fifth column line: `,\n  closed_at   INTEGER NULL`. It is placed after `last_active …`, with the comma moved accordingly. Run `scripts/verify-platform.sh --only gui06-chrome-bar-suggestions` and its `-self-test`. Expected: both PASS.

- [ ] **Step 15: The web tab carries its row key (`web-tab.ts`)**

```ts
export interface WebTabOptions {
    /**
     * `wt-<session>-<n>`: the per-session discriminator plus the counter,
     * minted by the open handler. Lives here and never in a URI.
     */
    id: string;
    url: string;
    /**
     * NG-001: the store row this tab writes, `web:<id>`. Absent for a new tab
     * (the row key is then `web:` + `id`); set when a Panorama card reopens a
     * tab that already has a row, so the reopened tab keeps its group, place
     * and thumbnail.
     */
    key?: string;
}
```

In `WebTabMessage`, the `webTabOpen` member becomes `{ kind: 'webTabOpen'; tabId: string; url: string; key: string }`. After `WindowMessage`, add:

```ts
/** NG-001: row messages on the same channel. A user close ends the row's open life (closed-tab history). */
export type TabRowMessage = { kind: 'closeTab'; uri: string };

export type ShellMessage = WebTabMessage | WindowMessage | TabRowMessage;
```

This replaces the existing `ShellMessage` line. In `WebTabWidget`, add a field `rowKey = '';` next to `tabId`. In `init`, after `this.tabId = options.id;`, add `this.rowKey = options.key ?? \`web:${options.id}\`;`. Both `webTabOpen` requests (`onAfterAttach`, `reopen`) send `key: this.rowKey`. `onCloseRequest` becomes:

```ts
    protected onCloseRequest(msg: Message): void {
        // NG-005: a close the user asked for marks the row closed; an overlay
        // dropped by a reload or the quit does not (it never passes here).
        this.channel.send({ kind: 'closeTab', uri: this.rowKey });
        this.channel.send({ kind: 'webTabClose', tabId: this.tabId });
        this.channel.unregister(this.tabId);
        super.onCloseRequest(msg);
    }
```

- [ ] **Step 16: The wire type (R2, `group-actor-client.ts` :24–36)**

Update the comment to read `/** The message kinds the parent dispatch (handleGroupMutation) serves for groups and tab rows. */`. Add these members to `GroupMutation`:

```ts
    | { kind: 'trackTab'; uri: string; url: string; title: string }
    | { kind: 'closeTab'; uri: string }
```

- [ ] **Step 17: One key rule on the Theia side (`group-model.ts`)**

Imports (replacing `import type { GroupActorClient, GroupMutation } …` and the inversify line):

```ts
import { inject, injectable } from '@theia/core/shared/inversify';
import { ApplicationShell, Widget } from '@theia/core/lib/browser';
import { NavigatableWidget } from '@theia/core/lib/browser/navigatable-types';
import { Emitter, Event } from '@theia/core/lib/common';
import type { GroupQueryService } from '@powerbrowser/tab-uris/lib/browser/group-query-service';
import { TabUriRegistry } from '@powerbrowser/tab-uris/lib/browser/tab-uri-registry';
import { WebTabWidget } from '@powerbrowser/tab-uris/lib/browser/web-tab';
import { GroupActorClient } from './group-actor-client';
import type { GroupMutation } from './group-actor-client';
```

Delete `SESSION_TAB_PREFIX`, `sessionTabId`, the `sessionGroups` field and the `sessionPlaces` field, together with their doc comments. Rewrite the `LiveTab` doc paragraph: "`uri` is the tab's row key -- `tabKeyOf` -- the same value the chrome-side writer binds, so the two join without a second identity scheme." Add, above `@injectable() export class GroupModel`:

```ts
/**
 * NG-001: the one row-key rule, for every kind of tab (docs/TAB-STORE.md).
 * A web tab is keyed by its own identity (`WebTabWidget.rowKey`), never its
 * page; any other tab by its registry address, or its resource URI when the
 * registry has none (an editor), or finally its widget id. Never a page URL.
 */
export function tabKeyOf(widget: Widget, registry: TabUriRegistry): string {
    if (widget instanceof WebTabWidget) {
        return widget.rowKey;
    }
    const address = registry.uriOf(widget) ?? (NavigatableWidget.is(widget) ? widget.getResourceUri() : undefined);
    return address ? address.toString(true) : `widget:${widget.id}`;
}
```

Inside the class, after the `pendingWrites` fields:

```ts
    @inject(ApplicationShell)
    protected readonly shell: ApplicationShell;

    @inject(TabUriRegistry)
    protected readonly registry: TabUriRegistry;

    @inject(GroupActorClient)
    protected readonly actor: GroupActorClient;

    /** Theia tabs whose close already reaches the store. */
    private readonly watched = new WeakSet<Widget>();

    /** The row key of a shell tab (`tabKeyOf`). */
    keyOf(widget: Widget): string {
        return tabKeyOf(widget, this.registry);
    }

    /**
     * NG-001: a Theia tab (editor, terminal, view) gets its row the first time
     * it is organised; stock and web rows are written by chrome and the web tab.
     */
    private async ensureRow(client: GroupActorClient, uri: string): Promise<void> {
        if (/^(web|stock):/.test(uri)) {
            return;
        }
        const card = this.locateCard(uri)?.card;
        await client.mutate({ kind: 'trackTab', uri, url: card?.url ?? '', title: card?.title ?? '' });
        this.watchClose(uri);
    }

    /**
     * NG-005: closing a Theia tab that has a row marks the row closed. Widget
     * disposal is the user's close; a reload or quit disposes nothing, so the
     * row stays and the tab keeps its card.
     * ponytail: finds the widget by scanning the main area, O(tabs); index by key if it shows up.
     */
    private watchClose(uri: string): void {
        if (/^(web|stock):/.test(uri)) {
            return;
        }
        const widget = [...this.shell.mainPanel.widgets()].find(candidate => this.keyOf(candidate) === uri);
        if (!widget || this.watched.has(widget)) {
            return;
        }
        this.watched.add(widget);
        widget.disposed.connect(() => {
            this.actor.mutate({ kind: 'closeTab', uri })
                .catch(error => console.error('[@powerbrowser/modes] closing a tab row failed:', error));
        });
    }
```

In `load`'s `if (live)` branch, replace the "Everything else open" loop and what follows (:257–286) with:

```ts
                // Everything else open is in the tray, placed where the store
                // says -- a tab seconds old whose row does not exist yet included.
                const rest: PanoramaTab[] = [];
                for (const tab of live) {
                    if (claimed.has(tab.uri)) {
                        continue;
                    }
                    const placed = placements.get(tab.uri);
                    rest.push({
                        uri: tab.uri,
                        url: tab.url,
                        title: tab.title,
                        thumbnail: thumbnails.get(tab.uri) ?? this.sessionThumbs.get(tab.uri) ?? null,
                        x: placed?.x,
                        y: placed?.y,
                    });
                }
                tray = rest;
                for (const tab of live) {
                    if (claimed.has(tab.uri) || placements.has(tab.uri)) {
                        this.watchClose(tab.uri);
                    }
                }
```

The three writers:

```ts
    private async writeOrder(client: GroupActorClient, groupId: string): Promise<void> {
        const uris = (this.members.get(groupId) ?? []).map(tab => tab.uri);
        if (!uris.length) {
            return;
        }
        await client.mutate({ kind: 'setGroupOrder', groupId, uris });
    }

    private async writePlacement(client: GroupActorClient, uri: string, x: number, y: number): Promise<void> {
        await this.ensureRow(client, uri);
        await client.mutate({ kind: 'setTabPosition', uri, x, y });
    }

    private async writeMembership(client: GroupActorClient, uri: string, groupId: string | null): Promise<void> {
        await this.ensureRow(client, uri);
        await client.mutate({ kind: 'setTabGroup', uri, groupId });
    }
```

Update the doc comments of `writeOrder`, `writePlacement` and `writeMembership`. "Tabs the store cannot key" no longer exist: every tab has a key, and a Theia tab's row is written by `ensureRow` first.

- [ ] **Step 18: Organising uses the model's key (R2, `organising-widget.ts`)**

- :49: drop `SESSION_TAB_PREFIX` from the import.
- :259: `const uri = this.model.keyOf(widget);`
- `liveTabs()` (:348–355): the object becomes `{ uri: this.model.keyOf(widget), url: page, title: widget.title.label || page }`. Update its doc comment: every main-area tab is keyed by `tabKeyOf`, and there are no session-only keys any more.
- `widgetForTab` (:1954–1962):

```ts
    /** The open widget a card stands for, matched on the key `liveTabs` built. */
    protected widgetForTab(tab: PanoramaTab): Widget | undefined {
        return [...this.shell.mainPanel.widgets()].find(widget => widget !== this && this.model.keyOf(widget) === tab.uri);
    }
```

Delete `theia/extensions/tab-uris/src/browser/browser-tab-uri.ts` (R2). Then `grep -rn "browser-tab-uri\|browserTabKeyOf" theia/extensions --include=*.ts` prints nothing. The only other reader is `scripts/verify-sql-store-roundtrip.mjs`, which Task 8 rewrites. Its full-tier row is red until then.

- [ ] **Step 19: `docs/TAB-STORE.md` (schema, keys, lifecycle, history) and the URI-SCHEMES paragraph**

Create `docs/TAB-STORE.md`:

````markdown
# The tab store (`tabs.sqlite`)

`tabs.sqlite` in the profile directory holds one row per tab PowerBrowser has
seen: stock browser tabs, in-shell web tabs (a New Tab included), and the
editors, terminals and views that have been organised in Panorama. It records
group membership, canvas position, order within a group, a last-view
thumbnail, content age and closed-tab history. It is a user-queryable
substrate (`.planning/notes/tab-sql-substrate.md`), so this page is its
contract.

One writer: `powerbrowser/shell/PowerBrowserAPI.sys.mjs`, chrome-side, over
mozStorage, in WAL mode. Readers: the Theia backend's `TabQueryService`
(read-only `better-sqlite3`, `theia/extensions/tab-uris/src/node/`) and
offline checks on copies. Sessionstore stays authoritative for restoring
stock tabs; the store is rebuilt from it, never the reverse.

## Schema at head (`user_version = 5`)

| Table | Column | Type | Since | Meaning |
|---|---|---|---|---|
| `tabs` | `uri` | TEXT PRIMARY KEY | v1 | The row key; see "Row keys" |
| `tabs` | `url` | TEXT NOT NULL | v1 | The tab's current address; `''` for a tab with no page |
| `tabs` | `title` | TEXT NOT NULL | v1 | The tab's title |
| `tabs` | `last_active` | INTEGER NOT NULL | v1 | Last time the tab was seen open (ms since epoch) |
| `tabs` | `group_id` | TEXT NULL | v2 | The group it is in (`groups.id`) |
| `tabs` | `thumbnail` | TEXT NULL | v2 | PNG data URL of its last view |
| `tabs` | `x`, `y` | INTEGER NULL | v3 | Where a loose card sits on the canvas; NULL = never placed |
| `tabs` | `ord` | INTEGER NULL | v4 | Place within its group; NULL = never arranged |
| `tabs` | `created_at` | INTEGER NULL | v5 | When the row was created; NULL = before v5 |
| `tabs` | `last_accessed` | INTEGER NULL | v5 | Last time the user looked at the tab; NULL = not recorded |
| `tabs` | `closed_at` | INTEGER NULL | v5 | When the user closed it; NULL = open or restorable |
| `groups` | `id`, `title`, `x`, `y`, `w`, `h`, `is_active` | | v2 | Panorama group boxes |
| `settings` | `key`, `value` | TEXT, TEXT | v5 | Store settings; see "Settings" |

Indexes: `idx_tabs_last_active`, `idx_tabs_group`, `idx_tabs_closed_at`, `idx_groups_active`.

## Row keys

One rule for every tab: `tabs.uri` is `<kind>:<identity>`, never the page
URL. The page URL is the `url` column. Two tabs on one page are two rows, and
a navigation updates its tab's row in place.

| Tab | Key | Where the identity comes from |
|---|---|---|
| Stock browser tab | `stock:<stamp>-<n>` | Minted the first time the store sees the tab; kept on the tab as the sessionstore custom tab value `powerbrowser-tab-key`, so it survives navigation and a restored session |
| In-shell web tab, New Tab included | `web:<id>` | The tab's own id (`wt-<session>-<n>`), or the key a Panorama card passed when it reopened the tab |
| Editor, terminal, view | its address, e.g. `terminal:t1`, `view:welcome`, `file:///home/me/note.txt` | `TabUriRegistry.uriOf`, else the editor's resource URI, else `widget:<widget id>` |

Rows migrated from v4 and earlier keep their data under `stock:legacy-<rowid>`
(was `webview:<url>`) and `web:legacy-<rowid>` (was the bare page URL).
`webview:` is the plugin-panel address scheme (docs/URI-SCHEMES.md) and is
never a row key. The stock and web keys are identities, not addresses:
typing one opens nothing.

## Open and closed rows

A row with `closed_at` NULL is open, or restorable (its tab ended with a
session and has a group or a position, so Panorama shows it as a card that
reopens the tab). The row is marked closed, `closed_at` set, when:

- the user closes the tab (a stock tab's close, a web tab's close, an organised editor or terminal closed),
- a stock tab is gone from sessionstore's open tabs (its window closed),
- at startup, a web tab nobody grouped or placed ended with the last session.

A quit or a frontend reload never closes a row. Closed rows are closed-tab
history; the prune deletes a closed row once `closed_at` is older than the
retention. A row with `closed_at` NULL is never pruned.

## v1

`CREATE TABLE tabs (uri, url, title, last_active)` and `idx_tabs_last_active`,
written at creation with `user_version = 1`
(`.planning/milestones/v1.2-phases/11-sql-store-design/schema/SCHEMA.md`).

## v2

The `groups` table and `idx_groups_active`; `tabs.group_id` with
`idx_tabs_group`, and `tabs.thumbnail`. Panorama groups (GUI-08).

## v3

`tabs.x` and `tabs.y`: where a loose card sits on the canvas.

## v4

`tabs.ord`: a tab's place within its group.

## v5

`tabs.created_at`, `tabs.last_accessed`, `tabs.closed_at` with
`idx_tabs_closed_at`; the `settings` table seeded with `closed_retention_days`,
`integrity_check_minutes`, `restore_behaviour`, `restore_live_minutes` and
`restore_url_days`; and the key rewrite (`webview:<url>` to
`stock:legacy-<rowid>`, a bare page URL to `web:legacy-<rowid>`) in the same
transaction, in place, so every row keeps its group, position, order and
thumbnail.

## Migrations

The writer runs one forward chain (`migrateTabStoreToHead`) from the file's
`user_version` to the head, one transaction per version, each step a no-op
when its work is already done. A file newer than the head is refused and
left untouched. `scripts/verify-ng-015-real-migration-from-every-version.mjs` runs the chain in the built
browser from a store at every shipped version.
````

In `docs/URI-SCHEMES.md`, replace the sentences from "The chrome-side store keys its rows by that URL" to "out of scope for this milestone." (:250–254) with:

```markdown
The chrome-side store does not key its rows by the address. Each web tab has
a row of its own, keyed `web:<id>` by the tab's identity, with the page
address as a column (docs/TAB-STORE.md, "Row keys"): two tabs on one URL are
two rows, a navigation updates the row in place, and closing a tab marks its
row closed instead of deleting it.
```

- [ ] **Step 20: Build, then run the quick neighbours**

```bash
nix develop .#theia --command bash -c 'cd theia && yarn build'
node --check powerbrowser/shell/PowerBrowserAPI.sys.mjs
for l in gui02-web-tab-bridge gui06-chrome-bar-suggestions gui08-close-exactness gui08-view-parity gui04-registry-shape sql-store-second-writer sql-store-soak backend-env-readers theia-build-order; do
  scripts/verify-platform.sh --only $l >/dev/null 2>&1; echo "$l exit $?"; done
```

Expected: `yarn build` exits 0, and every label exits 0.

- [ ] **Step 21: The live checks for this slice are `live-main pending`**

The chrome side of this task is live only in main (G4). Report NG-001, NG-002, NG-003, NG-004, NG-005, NG-014 and NG-015 as `live-main pending`. The controller merges this task on its own and runs them at once:

```bash
cd ~/coding/Power-Browser
for l in ng-001-one-key-rule ng-002-navigation-keeps-row ng-003-same-url-two-rows ng-004-new-tab-row-unknown-uri-error ng-005-prune-keeps-open-rows ng-014-rebuild-at-head ng-015-real-migration-from-every-version; do
  flock .git/pb-live.lock scripts/verify-platform.sh --only $l >/dev/null 2>&1 && echo "PASS $l" || echo "FAIL $l"; done
```

Expected: seven `PASS` lines. The controller exports `PB_REAL_PROFILE_FIXTURE=$HOME/coding/Power-Browser-fixtures/real-profile-tabs-2026-09-25.sqlite` for the NG-015 run (R7), so the real profile's v4 store is migrated as well. Also run `scripts/verify-platform.sh --only gui02-web-tab-live`. That full-tier check reads rows through `searchByPrefix` and must stay green now that closed rows are filtered out.

- [ ] **Step 22: Commit gate, then commit**

```bash
git add powerbrowser/shell/PowerBrowserAPI.sys.mjs theia/extensions/tab-uris/src/node/tab-query-service.ts \
  theia/extensions/tab-uris/src/browser/web-tab.ts theia/extensions/modes/src/browser/group-model.ts \
  theia/extensions/modes/src/browser/organising-widget.ts theia/extensions/modes/src/browser/group-actor-client.ts \
  scripts/verify-chrome-bar-suggestions.mjs docs/TAB-STORE.md docs/URI-SCHEMES.md
git rm theia/extensions/tab-uris/src/browser/browser-tab-uri.ts
node scripts/scan-brand-residue.mjs
# commit-gate command: prints only ng-016, ng-019, ng-020
git commit -m "feat(ng-a): one row per tab keyed by identity, schema v5 and its migration" -m "Refs: NG-001, NG-002, NG-003, NG-004, NG-005, NG-014, NG-015"
```

---

### Task 3: The reader reports errors, and the gui08 gate moves to the head (NG-012, NG-016)

**Files:**
- Modify: `theia/extensions/tab-uris/src/node/tab-query-service.ts`: `TAB_STORE_SCHEMA_HEAD`, `openIfNeeded`, `read`, and every read method.
- Modify: `scripts/verify-gui08-persistence-roundtrip.mjs`: the expected head and methods, the chain mirror, and the reader-head assertion.

**Interfaces:**
- Consumes: schema v5 (Task 2).
- Produces:
  - `export const TAB_STORE_SCHEMA_HEAD = 5` in `tab-query-service.ts`.
  - Every `TabQueryService` read throws `Error('TabQueryService: …')` naming the cause (no profile directory, file missing or unopenable, `user_version` not the head, query failure), instead of answering empty.
  - `private read<T>(what: string, query: (db: Database) => T): T`.

- [ ] **Step 1: Confirm failure.** Run `scripts/verify-platform.sh --only ng-016-gui08-persistence-at-head`: it exits 1. Run `ng-012-reader-reports-schema-errors` in the clone lane (G4): it exits 1 with "answered groups … instead of reporting an error".

- [ ] **Step 2: Rewrite the reader's open and reads**

Replace the "First-launch tolerance" paragraph of the header with: "NG-012: a store it cannot read -- no profile directory, a missing or unopenable file, a `user_version` other than the head it reads -- is an error naming the cause, never an empty answer: an empty answer reads on screen as 'no tabs', and the Organising load and the chrome-bar provider each have a contracted error state for exactly this." Then:

```ts
/**
 * NG-012: the schema version this reader is written against. It must equal
 * PowerBrowserAPI.sys.mjs's TAB_STORE_SCHEMA_HEAD; gui08-persistence-roundtrip
 * compares the two, so a head move without a reader change fails --quick.
 */
export const TAB_STORE_SCHEMA_HEAD = 5;
```

Replace `openIfNeeded` and add `read`:

```ts
    /** Opens the readonly handle on first use; throws naming why it cannot. */
    private openIfNeeded(): Database {
        if (this.db) {
            return this.db;
        }
        if (!this.profileDir) {
            throw new Error('TabQueryService: no profile directory is known, so tabs.sqlite cannot be read');
        }
        let db: Database;
        try {
            db = new Database(join(this.profileDir, TAB_QUERY_FILE_NAME), { readonly: true, fileMustExist: true });
        } catch (error) {
            throw new Error(`TabQueryService: tabs.sqlite cannot be opened: ${error instanceof Error ? error.message : String(error)}`);
        }
        const readonly = db.readonly;
        const version = (db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;
        if (!readonly || version !== TAB_STORE_SCHEMA_HEAD) {
            try {
                db.close();
            } catch {
                // Close is best-effort; the error below is the point.
            }
            throw new Error(readonly
                ? `TabQueryService: tabs.sqlite is at schema version ${version}; this build reads version ${TAB_STORE_SCHEMA_HEAD}`
                : 'TabQueryService: readonly flag not honoured by the engine');
        }
        this.db = db;
        return db;
    }

    /**
     * One read. A failure drops the handle -- a quarantine rebuild may have
     * replaced the file under it -- and rethrows naming the read.
     */
    private read<T>(what: string, query: (db: Database) => T): T {
        const db = this.openIfNeeded();
        try {
            return query(db);
        } catch (error) {
            this.setProfileDir(this.profileDir);
            throw new Error(`TabQueryService: ${what} failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
```

Each read method's body becomes one `read(...)` call, with the same SQL Task 2 left and no try/catch. For example, `getByUri`:

```ts
    getByUri(uri: string): TabQueryRow | undefined {
        return this.read('getByUri', db => db.prepare('SELECT uri, url, title, last_active FROM tabs WHERE uri = ?').get(uri) as TabQueryRow | undefined);
    }
```

Apply the same shape to `getBrowserTabByUrl`, `listByRecency`, `searchByPrefix` (the statement stays one single-quoted literal inside the arrow), `listGroups`, `getGroupTabs`, `getThumbnail` and `listUngroupedTabs`. Their doc comments change "Resolves [] when the store is not yet readable" to "Throws when the store cannot be read (NG-012)". The `POWERBROWSER_ENV['POWERBROWSER_PROFILE_DIR']` field initialiser stays byte-identical, because `backend-env-readers` pins it.

- [ ] **Step 3: Move `verify-gui08-persistence-roundtrip.mjs` to the head**

1. `const EXPECTED_SCHEMA_HEAD = 5;`. Add `'setGroupOrder'` to `EXPECTED_GROUP_METHODS`.
2. Add `const READER_REL = 'theia/extensions/tab-uris/src/node/tab-query-service.ts';` and add it to `readSources()`.
3. In `checkStatic`, after the head check:

```js
    const readerHead = /export const TAB_STORE_SCHEMA_HEAD\s*=\s*(\d+)/.exec(sources[READER_REL] ?? '');
    if (!readerHead) {
        failures.push(`${READER_REL}: TAB_STORE_SCHEMA_HEAD unlocatable -- the reader no longer states the version it reads`);
    } else if (head !== undefined && Number(readerHead[1]) !== head) {
        failures.push(`${READER_REL}: the reader reads schema ${readerHead[1]} but the writer's head is ${head} -- the reader would refuse every store (NG-012)`);
    }
```

4. Replace `mirrorMigrate` with a chain over every marker block, and add the derivation:

```js
/** Every DDL marker block in source order; block N is schema version N. */
function derivedVersionBlocks(apiSrc) {
    return [...apiSrc.matchAll(/PB-SQL-([A-Z0-9]+)-DDL-START \*\/ `([\s\S]*?)` \/\* PB-SQL-\1-DDL-END/g)].map(m => splitStatements(m[2]));
}

/** Mirrors migrateTabStoreToHead: per version one transaction, done work skipped, the version stamped last. */
function mirrorMigrate(db, blocks, head) {
    if (blocks.length !== head) {
        fail(`${blocks.length} DDL marker blocks for schema head ${head} -- a version has no marker`);
    }
    for (let version = getUserVersion(db); version < head; version += 1) {
        db.exec('BEGIN');
        try {
            for (const statement of blocks[version]) {
                const column = /^alter table (\w+) add column (\w+)/i.exec(statement);
                if (column && columnExists(db, column[1], column[2])) {
                    continue;
                }
                const created = /^create (table|index) (\w+)/i.exec(statement);
                if (created && (created[1].toLowerCase() === 'table' ? tableExists(db, created[2]) : indexExists(db, created[2]))) {
                    continue;
                }
                db.exec(statement);
            }
            db.exec(`PRAGMA user_version = ${version + 1}`);
            db.exec('COMMIT');
        } catch (err) {
            try {
                db.exec('ROLLBACK');
            } catch {
                // Best-effort in the mirror; the throw below is the signal.
            }
            throw err;
        }
    }
}
```

5. In `checkLive`, compute `const blocks = derivedVersionBlocks(apiSrc);` next to `head`. Both `mirrorMigrate(db, tabsDdl, groupsDdl, head)` calls become `mirrorMigrate(db, blocks, head)`. In step 1, seed two more v1 rows, `('webview:https://w.example/', 'https://w.example/', 'W', 11)` and `('https://x.example/', 'https://x.example/', 'X', 12)`, and after the migration add:

```js
                check('migration-key-rewrite', !db.prepare("SELECT 1 FROM tabs WHERE uri LIKE 'webview:%' OR uri LIKE 'http%'").get(), 'a v1 row kept a page-URL or webview: key after the chain');
                const tabCols = db.prepare('PRAGMA table_info(tabs)').all().map(col => col.name);
                check('migration-v5-columns', ['created_at', 'last_accessed', 'closed_at'].every(c => tabCols.includes(c)) && tableExists(db, 'settings'), `v5 columns/settings missing: [${tabCols.join(', ')}]`);
```

Keep the `derivedGroupsDdlText` and `derivedTabsDdlText` uses that the static half and the self-test plants need. Update the header comment to read "v1→head migration".

- [ ] **Step 4: Build and run.** Run `nix develop .#theia --command bash -c 'cd theia && yarn build'` (exit 0). Then run `scripts/verify-platform.sh --only ng-016-gui08-persistence-at-head`, `--only gui08-persistence-roundtrip`, `--only gui08-persistence-roundtrip-self-test` and `--only gui06-chrome-bar-suggestions`: all PASS. Run `--only backend-env-readers`: PASS. In the clone lane, run `ng-012-reader-reports-schema-errors`: PASS.

- [ ] **Step 5: Commit gate, then commit**

```bash
git add theia/extensions/tab-uris/src/node/tab-query-service.ts scripts/verify-gui08-persistence-roundtrip.mjs
node scripts/scan-brand-residue.mjs
# commit-gate command: prints only ng-019, ng-020 (gui08-persistence-roundtrip and its self-test left the baseline)
git commit -m "feat(ng-a): reader checks user_version and reports errors; gui08 gate at head 5" -m "Refs: NG-012, NG-016"
```

---

### Task 4: Panorama shows tabs that are not open, and reopens them through the opener (NG-007, NG-008)

**Files:**
- Modify: `theia/extensions/modes/src/browser/group-model.ts`: `PanoramaTab.open`, the member rule in `load`, `reopen`, and the `OpenerService` injection.
- Modify: `theia/extensions/modes/src/browser/organising-widget.ts`: `dive()` (:1936–1951).
- Modify: `theia/extensions/tab-uris/src/browser/web-tab.ts`: `WebTabOpenerOptions`, and `WebTabOpenHandler.open` and `openUrl`.

**Interfaces:**
- Consumes: `tabKeyOf`, `WebTabWidget.rowKey`, `WebTabOptions.key` and `closed_at` filtering (Task 2).
- Produces:
  - `GroupModel.reopen(tab: PanoramaTab): Promise<void>`.
  - `PanoramaTab.open?: boolean`.
  - `export interface WebTabOpenerOptions extends OpenerOptions { rowKey?: string }`.
  - `WebTabOpenHandler.openUrl(url: string, rowKey?: string)`.

- [ ] **Step 1: Confirm failure.** In the clone lane, `ng-007-shell-tabs-keep-group-across-restart` exits 1 with "does not list terminal:ng007a", and `ng-008-panorama-card-reopens-through-opener` exits 1 with "shows no card". Both need Task 2 merged into main (G4).

- [ ] **Step 2: Web tabs open on a row the opener names (`web-tab.ts`)**

Add `OpenerOptions` to the `@theia/core/lib/browser` import. After `isCurrentSessionTabId`, add:

```ts
/** NG-008: opener options a Panorama card passes to reopen a web tab on the row it already has. */
export interface WebTabOpenerOptions extends OpenerOptions {
    rowKey?: string;
}
```

In `WebTabOpenHandler`:

```ts
    async open(uri: URI, options?: WebTabOpenerOptions): Promise<WebTabWidget> {
        return this.openUrl(uri.toString(true), options?.rowKey);
    }

    async openUrl(url: string, rowKey?: string): Promise<WebTabWidget> {
        const options: WebTabOptions = { id: `wt-${WEB_TAB_SESSION}-${++nextTabSeq}`, url, ...(rowKey ? { key: rowKey } : {}) };
```

The rest of `openUrl` is unchanged. Leaving `key` out when it is absent keeps the widget manager's dedup key identical to today's.

- [ ] **Step 3: Grouped tabs that are not open stay as cards; `reopen` (`group-model.ts`)**

Add `open?: boolean;` to `PanoramaTab`, with the doc comment "false for a card whose tab is not open in the shell (NG-008); undefined when the model was loaded without a shell". Add these imports:

```ts
import { ApplicationShell, OpenerService, Widget } from '@theia/core/lib/browser';
import URI from '@theia/core/lib/common/uri';
import { EMPTY_PAGE_URL, WebTabOpenerOptions, WebTabWidget } from '@powerbrowser/tab-uris/lib/browser/web-tab';
```

These replace the Task 2 lines for `ApplicationShell, Widget` and for `WebTabWidget`. Inject:

```ts
    @inject(OpenerService)
    protected readonly openers: OpenerService;
```

In `load`'s `if (live)` branch, the member loop (:247–256) becomes:

```ts
                for (const [id, tabs] of nextMembers) {
                    nextMembers.set(id, tabs.flatMap(tab => {
                        const open = liveByUri.get(tab.uri);
                        if (open) {
                            claimed.add(tab.uri);
                            return [{ ...tab, url: open.url || tab.url, title: open.title || tab.title, open: true }];
                        }
                        // NG-007/NG-008: a grouped tab that is not open keeps its
                        // card -- its row is open or restorable -- and reopens from
                        // it. A stock tab lives in a stock window, never here.
                        return tab.uri.startsWith('stock:') ? [] : [{ ...tab, open: false }];
                    }));
                }
```

Add after `setActiveGroup`:

```ts
    /**
     * NG-008: reopens a card whose tab is not open, through the opener every
     * other surface uses. A web card reopens on the row it already has (the
     * opener carries its key), so its group, place and thumbnail stay with it;
     * any other tab reopens by its own address, in the main area where cards live.
     */
    async reopen(tab: PanoramaTab): Promise<void> {
        const web = tab.uri.startsWith('web:');
        const target = new URI(web ? (tab.url || EMPTY_PAGE_URL) : tab.uri);
        const options: WebTabOpenerOptions = web ? { rowKey: tab.uri } : { widgetOptions: { area: 'main' } } as WebTabOpenerOptions;
        const opener = await this.openers.getOpener(target, options);
        await opener.open(target, options);
    }
```

- [ ] **Step 4: `dive()` reopens through the model (`organising-widget.ts`)**

```ts
    protected dive(tab: PanoramaTab, groupId: string | null): void {
        if (groupId !== null) {
            void this.activateGroup(groupId);
        }
        const widget = this.widgetForTab(tab);
        // Browsing for a page, Coding for an editor or the Welcome view --
        // each tab lands in the mode that is built to show it.
        void this.modes.activateMode(tab.url ? 'browsing' : 'coding')
            .catch(error => console.error('[@powerbrowser/modes] mode switch on dive failed:', error))
            .finally(() => {
                if (widget) {
                    void this.shell.activateWidget(widget.id);
                    return;
                }
                // NG-008: the tab is not open -- reopen it through the opener.
                this.model.reopen(tab).catch(error => console.error('[@powerbrowser/modes] reopening a tab from its card failed:', error));
            });
    }
```

Rewrite the doc comment above `dive` (:1918–1935) to say: an open card activates its tab; a card whose tab is not open reopens it through the opener (URI-SCHEMES.md "Every opener … Panorama … resolve to the same handler"); the reopened web tab writes the card's row.

- [ ] **Step 5: Build and run.** Run `nix develop .#theia --command bash -c 'cd theia && yarn build'` (exit 0). In the clone lane, `ng-007-…` and `ng-008-…` PASS. The quick neighbours `gui08-view-parity`, `gui08-close-exactness`, `gui08-canvas-geometry` (baseline) and `gui02-web-tab-bridge` must not newly fail.

- [ ] **Step 6: Commit gate, then commit**

```bash
git add theia/extensions/modes/src/browser/group-model.ts theia/extensions/modes/src/browser/organising-widget.ts theia/extensions/tab-uris/src/browser/web-tab.ts
node scripts/scan-brand-residue.mjs
git commit -m "feat(ng-a): Panorama keeps cards for tabs not open and reopens them through the opener" -m "Refs: NG-007, NG-008"
```

---

### Task 5: Close Group closes the group's in-shell tabs and keeps their history (NG-006)

**Files:**
- Modify: `powerbrowser/shell/PowerBrowserAPI.sys.mjs`: `closeGroupRows` (:1337–1383).
- Modify: `theia/extensions/modes/src/browser/organising-widget.ts`: `closeGroupById` (:382–417).
- Modify (R2): `scripts/verify-gui08-close-exactness.mjs`: the member-row expectation (:222–224).

**Interfaces:**
- Consumes: `widgetForTab` and `keyOf` (Task 2), and the `closeTab` path.
- Produces: `closeGroupRows(id)` keeps member rows as closed-tab history with `group_id` NULL, instead of deleting them.

- [ ] **Step 1: Confirm failure.** `ng-006-close-group-closes-web-tabs` exits 1 with "left the group's in-shell tabs open". This is `live-main` and runs in main after merge; in the clone, confirm it against the pre-change tree through the Task 1 record.

- [ ] **Step 2: Chrome keeps history.** In `closeGroupRows`, the transaction becomes:

```js
    try {
      await conn.executeTransaction(async () => {
        // NG-006/NG-010: the members close with their tabs and stay as
        // closed-tab history; membership is cleared so no row names a group
        // that no longer exists.
        await conn.execute(
          "UPDATE tabs SET group_id = NULL, closed_at = COALESCE(closed_at, :now) WHERE group_id = :id",
          { id, now: Date.now() }
        );
        await conn.execute("DELETE FROM groups WHERE id = :id", { id });
      });
```

In the doc comment, change "a deterministic row DELETE per member" to "every member row marked closed". The `for (const uri of members)` loop with `closeStockTabByUri(uri)`, `return "already-closed"` and `DELETE FROM groups WHERE id` all stay, because `gui08-close-exactness` pins them.

- [ ] **Step 3: Update the close-exactness expectation (R2)**

```js
    if (!apiSrc.includes('UPDATE tabs SET group_id = NULL, closed_at = COALESCE(closed_at, :now) WHERE group_id = :id')) {
        failures.push(`${API_REL}: no member-row close -- closed tabs leave open rows or lose their history (NG-006/NG-010)`);
    }
```

This replaces the `DELETE FROM tabs WHERE group_id` check. Update the file header's "plus the row DELETEs" to read "plus the member rows marked closed".

- [ ] **Step 4: The shell closes the member widgets (`closeGroupById`)**

```ts
        try {
            const members = this.model.getTabs(id);
            const closed = await this.model.closeGroup(this.actor, id);
            if (closed) {
                // NG-006: the dialog promises the group's tabs close too. Web tabs,
                // editors and terminals are shell widgets the chrome-side close
                // cannot reach; closing each ends its row as closed-tab history.
                for (const tab of members) {
                    this.widgetForTab(tab)?.close();
                }
                await this.flash(`Group "${closed.name}" closed.`);
            }
            this.render();
        } catch (error) {
```

- [ ] **Step 5: Build and run.** Run `yarn build` (exit 0) and `node --check powerbrowser/shell/PowerBrowserAPI.sys.mjs`. Run `--only gui08-close-exactness` and `--only gui08-close-exactness-self-test`: PASS. Report `ng-006` as `live-main pending`.

- [ ] **Step 6: Commit gate, then commit**

```bash
git add powerbrowser/shell/PowerBrowserAPI.sys.mjs theia/extensions/modes/src/browser/organising-widget.ts scripts/verify-gui08-close-exactness.mjs
node scripts/scan-brand-residue.mjs
git commit -m "feat(ng-a): Close Group closes the group's in-shell tabs and keeps their rows as history" -m "Refs: NG-006"
```

---

### Task 6: Unopenable stores are quarantined; the full integrity check runs on a schedule (NG-013, NG-018)

**Files:**
- Modify: `powerbrowser/shell/PowerBrowserAPI.sys.mjs`:
  - `ensureTabStore` (:2210).
  - `openTabStore` (:795–838).
  - New `readTabStoreSetting` and `runScheduledIntegrityCheck`.
  - The schedule in `startTabStoreTriggers` (:2267–2373).
  - The constant `TAB_STORE_INTEGRITY_DEFAULT_MS` in the :45–109 block (R2).

**Interfaces:**
- Consumes: the `settings` table (Task 2) and `migrateTabStoreToHead`.
- Produces:
  - `readTabStoreSetting(key: string): Promise<string | null>`, which never throws.
  - `runScheduledIntegrityCheck(): Promise<boolean>`, which never throws.
  - `ensureTabStore()` quarantines an unopenable file, and leaves a newer file untouched (`"degraded"`).

- [ ] **Step 1: Confirm failure.** `ng-013-…` and `ng-018-…` exit 1, as in Task 1.

- [ ] **Step 2: Constant (:45–109 block).** `const TAB_STORE_INTEGRITY_DEFAULT_MS = 24 * 60 * 60 * 1000; // NG-018: when integrity_check_minutes is absent or unusable`

- [ ] **Step 3: `readTabStoreSetting`, after `checkTabStoreIntegrity`**

```js
  /**
   * NG-011/NG-018: one row of the settings table, or null when it is absent
   * or the store is unreadable. Never throws: every caller has a default.
   */
  async readTabStoreSetting(key) {
    try {
      const conn = await PowerBrowserAPI.openTabStore();
      const rows = await conn.execute("SELECT value FROM settings WHERE key = :key", { key });
      return rows.length ? rows[0].getString(0) : null;
    } catch {
      return null;
    }
  },

  /**
   * NG-018: the full PRAGMA integrity_check SCHEMA.md:200-201 schedules beside
   * the startup quick_check, which skips index contents. A failure quarantines
   * and rebuilds from sessionstore, exactly as the startup tripwire does.
   * Resolves true when the store is sound. Never throws.
   */
  async runScheduledIntegrityCheck() {
    let ok = false;
    try {
      const conn = await PowerBrowserAPI.openTabStore();
      const rows = await conn.execute("PRAGMA integrity_check");
      ok = rows.length === 1 && rows[0].getString(0) === "ok";
    } catch {
      ok = false;
    }
    if (!ok) {
      try {
        await PowerBrowserAPI.quarantineAndRebuildTabStore(PowerBrowserAPI.parseSessionStoreTabRows());
      } catch (err) {
        PowerBrowserAPI.log("error", `[tab-store-integrity] rebuild failed: ${err && err.message ? err.message : err}`);
      }
    }
    return ok;
  },
```

- [ ] **Step 4: `openTabStore` closes its connection when a later step fails.** Task 2 Step 10 already copies the bytes of a file that cannot be backed up. The remaining gap for an unopenable file is the connection: when `PRAGMA journal_mode=WAL` throws ("file is not a database"), `openTabStore` leaves that connection open, and the quarantine then removes the file under it. Replace everything after the `openConnection` line (as Task 2 left it) with:

```js
    try {
      const modeRows = await conn.execute("PRAGMA journal_mode=WAL;");
      const mode = modeRows.length ? modeRows[0].getString(0) : "";
      if (mode !== "wal") {
        throw new Error(`openTabStore: journal_mode pin failed (got ${mode})`);
      }
      const schemaVersion = await conn.getSchemaVersion();
      if (schemaVersion > TAB_STORE_SCHEMA_HEAD) {
        throw new Error(
          `openTabStore: refusing downgrade: user_version=${schemaVersion} is newer than chain head ${TAB_STORE_SCHEMA_HEAD}`
        );
      }
      await PowerBrowserAPI.migrateTabStoreToHead(conn);
    } catch (err) {
      // NG-013: a connection that failed any step closes before the error
      // leaves, so the quarantine never removes a file something still holds.
      try {
        await conn.close();
      } catch {
        // Close is best-effort; the error below is the point.
      }
      throw err;
    }
    tabStoreConn = conn;
    return conn;
```

The two inline close-then-throw blocks are replaced by this one. The `schemaVersion > TAB_STORE_SCHEMA_HEAD` comparison and the `refusing downgrade` text stay, because `verify-sql-store-roundtrip.mjs` pins them.

- [ ] **Step 5: `ensureTabStore` quarantines an unopenable file and never a newer one**

```js
  async ensureTabStore() {
    let openError = null;
    try {
      await PowerBrowserAPI.openTabStore();
    } catch (err) {
      openError = err;
      PowerBrowserAPI.log("error", `[ensureTabStore] open failed: ${err && err.message ? err.message : err}`);
    }
    // MIGRATIONS.md rule 4: a store newer than this build is refused, left
    // untouched and reported -- never quarantined.
    if (openError && /refusing downgrade/.test(String(openError.message))) {
      return "degraded";
    }
    let state = "ready";
    // NG-013: an unopenable file counts as tripped (MIGRATIONS.md:53), the same
    // as a failed quick_check.
    if (openError || !(await PowerBrowserAPI.checkTabStoreIntegrity())) {
      try {
        await PowerBrowserAPI.quarantineAndRebuildTabStore(PowerBrowserAPI.parseSessionStoreTabRows());
        state = "rebuilt";
      } catch (err) {
        PowerBrowserAPI.log("error", `[ensureTabStore] rebuild failed: ${err && err.message ? err.message : err}`);
        return "degraded";
      }
    }
    await PowerBrowserAPI.closeEndedWebRows().catch(err => {
      PowerBrowserAPI.log("error", `[ensureTabStore] closing ended web rows failed: ${err && err.message ? err.message : err}`);
    });
    return state;
  },
```

Update its doc comment to say that an unopenable file is quarantined, and that a newer file is refused untouched.

- [ ] **Step 6: The schedule, in `startTabStoreTriggers`**

Before `return () => {`:

```js
    // NG-018: the scheduled full integrity check. The interval is the setting
    // integrity_check_minutes (24 hours when absent), read before each wait so
    // a changed setting applies from the next run. The stop function ends it.
    let integrityOff = false;
    (async () => {
      while (!integrityOff) {
        const minutes = Number(await PowerBrowserAPI.readTabStoreSetting("integrity_check_minutes"));
        await PowerBrowserAPI.sleep(Number.isFinite(minutes) && minutes > 0 ? minutes * 60 * 1000 : TAB_STORE_INTEGRITY_DEFAULT_MS);
        if (!integrityOff) {
          await PowerBrowserAPI.runScheduledIntegrityCheck();
        }
      }
    })().catch(err => {
      PowerBrowserAPI.log("error", `[tab-store-integrity] ${err && err.message ? err.message : err}`);
    });
```

Add `integrityOff = true;` as the first line of the returned stop function. Update the method's doc comment to add: "…and the scheduled full integrity check (NG-018)".

- [ ] **Step 7: Check and report.** Run `node --check powerbrowser/shell/PowerBrowserAPI.sys.mjs`. Report `ng-013` and `ng-018` as `live-main pending`.

- [ ] **Step 8: Commit gate, then commit**

```bash
git add powerbrowser/shell/PowerBrowserAPI.sys.mjs
node scripts/scan-brand-residue.mjs
git commit -m "feat(ng-a): quarantine unopenable stores; scheduled full integrity check" -m "Refs: NG-013, NG-018"
```

---

### Task 7: Content age, closed-tab history, and the settings table's readers (NG-009, NG-010, NG-011)

**Files:**
- Modify: `powerbrowser/shell/PowerBrowserAPI.sys.mjs`:
  - `writeTabRow`, plus the new `touchTabRow` and `writeClosedTabRow`.
  - `parseSessionStoreTabRows`, plus the new `parseSessionStoreClosedRows`.
  - The sweep, and the quarantine insert.
  - The two rebuild call sites (`ensureTabStore`, `runScheduledIntegrityCheck`).
  - The TabSelect `lastAccessed` in `onTabEvent`, and the `touchTab` arm.
  - `stringHash` in the :45–109 block (R2).
- Modify: `theia/extensions/tab-uris/src/node/tab-query-service.ts`: `getSettings`.
- Modify (R2): `theia/extensions/tab-uris/src/browser/group-query-service.ts`: `getSettings` on the interface.
- Modify: `theia/extensions/tab-uris/src/browser/web-tab.ts`: `touchTab` on activate.
- Modify: `theia/extensions/modes/src/browser/group-model.ts`: `stored`, the activation touch, and `planWebTabRestore`.
- Modify (R2): `theia/extensions/modes/src/browser/group-actor-client.ts`: `touchTab`.

**Interfaces:**
- Consumes: `readTabStoreSetting` (Task 6) and the v5 columns.
- Produces:
  - `writeTabRow({ uri, url, title, lastActive?, lastAccessed?, chromeWin? })`.
  - `touchTabRow(uri): Promise<void>`.
  - `writeClosedTabRow({ uri, url, title, closedAt }): Promise<void>`.
  - `parseSessionStoreClosedRows(): { uri, url, title, last_active, closed_at }[]`.
  - `parseSessionStoreTabRows()` rows gain `last_accessed`.
  - Actor kind `touchTab { uri }`.
  - `GroupQueryService.getSettings(): Promise<Record<string, string>>`.
  - In `group-model.ts`: `export interface SavedWebTab { key: string; url: string; lastAccessed: number | null }`, `export interface WebTabRestore { key: string; url: string; withHistory: boolean }`, and `export function planWebTabRestore(settings: Record<string, string>, tabs: readonly SavedWebTab[], quitAt: number): WebTabRestore[]`.

- [ ] **Step 1: Confirm failure.** `ng-009-…`, `ng-010-…` and `ng-011-…` exit 1. NG-011 stays red after this task, until Task 10, because its part B needs wave C's restore path.

- [ ] **Step 2: Verify the sessionstore shape used here**

```bash
grep -n "_closedTabs" upstream/browser/components/sessionstore/SessionStore.sys.mjs | head -5
grep -n "lastAccessed: tab.lastAccessed" upstream/browser/components/sessionstore/TabState.sys.mjs
```

Expected: `_closedTabs` is a per-window array whose entries carry `closedAt`, `title` and `state` (tab data with `entries`, `index` and `extData`), and `TabState.sys.mjs:70` collects `lastAccessed`. If an entry's shape differs, adapt `parseSessionStoreClosedRows` to it and say so in the task report.

- [ ] **Step 3: Chrome, content age**

1. `writeTabRow` gains `lastAccessed`. The statement becomes:

```js
        `INSERT INTO tabs (uri, url, title, last_active, created_at, last_accessed) VALUES (:uri, :url, :title, :last_active, :now, :last_accessed)
         ON CONFLICT (uri) DO UPDATE SET url=excluded.url,
           title=CASE WHEN excluded.title = '' THEN tabs.title ELSE excluded.title END,
           last_active=excluded.last_active,
           last_accessed=COALESCE(excluded.last_accessed, tabs.last_accessed), closed_at=NULL`,
        { uri, url, title: title ?? "", last_active: lastActive ?? now, now, last_accessed: lastAccessed ?? null }
```

   The destructure becomes `{ uri, url, title, lastActive, lastAccessed, chromeWin }`. In the doc comment, add: "last_active is 'last seen open'; last_accessed is 'last looked at' and only moves when given (NG-009)".

2. After `closeTabRow`:

```js
  /** NG-009: the user looked at this tab now (a web or Theia tab was activated). */
  async touchTabRow(uri) {
    const conn = await PowerBrowserAPI.openTabStore();
    await conn.execute("UPDATE tabs SET last_accessed = :now WHERE uri = :uri", { uri, now: Date.now() });
  },
```

3. In `onTabEvent`, the final `writeTabRow` call passes `lastAccessed: event.type === "TabSelect" ? Date.now() : undefined`.

4. In `parseSessionStoreTabRows`, add `last_accessed: Number.isFinite(tab.lastAccessed) ? tab.lastAccessed : null` to the pushed row. This is sessionstore's own `lastAccessed`, as NG-009's evidence requires.

5. The `touchTab` arm, after `closeTab`:

```js
        // NG-009: a web or Theia tab was activated; stock selection arrives as TabSelect.
        case "touchTab": {
          if (typeof data.uri !== "string" || !data.uri || data.uri.startsWith("stock:")) {
            return { ok: false, reason: "validation", message: "handleGroupMutation: refusing malformed tab key" };
          }
          await PowerBrowserAPI.touchTabRow(data.uri);
          return { ok: true, kind, uri: data.uri };
        }
```

- [ ] **Step 4: Chrome, closed-tab history**

1. In the :45–109 block (R2):

```js
// NG-010: a stable short hash for keying a closed tab the store never saw.
function stringHash(text) {
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash * 33) ^ text.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}
```

2. After `parseSessionStoreTabRows`:

```js
  /**
   * NG-010: sessionstore's recently closed tabs (each non-private window's
   * _closedTabs) as closed-history rows. A tab the store keyed keeps its key
   * (the custom tab value travels with the closed entry); one it never saw is
   * keyed from when it closed and its address, so the same entry projects to
   * the same row on every sweep. Never throws.
   */
  parseSessionStoreClosedRows() {
    try {
      const state = JSON.parse(lazy.SessionStore.getBrowserState());
      const rows = [];
      for (const win of state.windows ?? []) {
        if (win.isPrivate) {
          continue;
        }
        for (const closed of win._closedTabs ?? []) {
          const tab = closed.state ?? {};
          const entry = tab.entries?.[(tab.index ?? tab.entries?.length ?? 1) - 1];
          if (!entry || !entry.url || !Number.isFinite(closed.closedAt)) {
            continue;
          }
          const uri = tab.extData?.[STOCK_TAB_KEY_VALUE] || `stock:closed-${closed.closedAt.toString(36)}-${stringHash(entry.url)}`;
          rows.push({ uri, url: entry.url, title: entry.title ?? closed.title ?? "", last_active: closed.closedAt, closed_at: closed.closedAt });
        }
      }
      return rows;
    } catch {
      return [];
    }
  },
```

3. After `touchTabRow`:

```js
  /** NG-010: a closed tab from sessionstore; an open row it names is closed, an absent one inserted as history. */
  async writeClosedTabRow({ uri, url, title, closedAt }) {
    const conn = await PowerBrowserAPI.openTabStore();
    await conn.executeCached(
      `INSERT INTO tabs (uri, url, title, last_active, closed_at) VALUES (:uri, :url, :title, :closed_at, :closed_at)
       ON CONFLICT (uri) DO UPDATE SET closed_at = COALESCE(tabs.closed_at, excluded.closed_at)`,
      { uri, url, title: title ?? "", closed_at: closedAt }
    );
  },
```

4. `sweepTabStoreFromSessionStore`:

```js
  async sweepTabStoreFromSessionStore() {
    // Closed first, open last: one snapshot never lists a tab as both, and
    // the open writes win for anything reopened since.
    for (const row of PowerBrowserAPI.parseSessionStoreClosedRows().slice(0, TAB_STORE_SWEEP_MAX_WRITES)) {
      await PowerBrowserAPI.writeClosedTabRow({ uri: row.uri, url: row.url, title: row.title, closedAt: row.closed_at });
    }
    const live = PowerBrowserAPI.parseSessionStoreTabRows();
    for (const row of live.slice(0, TAB_STORE_SWEEP_MAX_WRITES)) {
      await PowerBrowserAPI.writeTabRow({
        uri: row.uri,
        url: row.url,
        title: row.title,
        lastActive: row.last_active,
        lastAccessed: row.last_accessed ?? undefined,
      });
    }
    await PowerBrowserAPI.closeAbsentStockRows(live.map(row => row.uri));
    // NG-010/NG-011: retention is the setting closed_retention_days.
    const days = Number(await PowerBrowserAPI.readTabStoreSetting("closed_retention_days"));
    const retentionMs = Number.isFinite(days) && days >= 0 ? days * 24 * 60 * 60 * 1000 : TAB_STORE_CLOSED_RETENTION_MS;
    await PowerBrowserAPI.pruneClosedTabRows(Date.now() - retentionMs);
  },
```

5. The quarantine insert in `quarantineAndRebuildTabStore` becomes:

```js
        await conn.execute(
          `INSERT INTO tabs (uri, url, title, last_active, closed_at) VALUES (:uri, :url, :title, :last_active, :closed_at)
           ON CONFLICT (uri) DO UPDATE SET url=excluded.url, title=excluded.title, last_active=excluded.last_active, closed_at=excluded.closed_at`,
          { uri: row.uri, url: row.url, title: row.title, last_active: row.last_active, closed_at: row.closed_at ?? null }
        );
```

6. Both rebuild call sites (`ensureTabStore`, `runScheduledIntegrityCheck`) pass `[...PowerBrowserAPI.parseSessionStoreClosedRows(), ...PowerBrowserAPI.parseSessionStoreTabRows()]`. Open rows come last, so they win.

- [ ] **Step 5: Theia, settings reader and touches**

In `tab-query-service.ts`, after `listUngroupedTabs`:

```ts
    /** NG-011: the settings table as key -> value, for the restore path and any other reader. */
    async getSettings(): Promise<Record<string, string>> {
        const rows = this.read('getSettings', db => db.prepare('SELECT key, value FROM settings').all()) as { key: string; value: string }[];
        return Object.fromEntries(rows.map(row => [row.key, row.value]));
    }
```

In `group-query-service.ts` (R2), add `getSettings(): Promise<Record<string, string>>;` to `GroupQueryService`. In `group-actor-client.ts` (R2), add `| { kind: 'touchTab'; uri: string }`. In `web-tab.ts`, the type becomes `TabRowMessage = { kind: 'closeTab'; uri: string } | { kind: 'touchTab'; uri: string };`, and `WebTabWidget` gets:

```ts
    protected onActivateRequest(msg: Message): void {
        super.onActivateRequest(msg);
        // NG-009: the tab's row records when it was last looked at.
        this.channel.send({ kind: 'touchTab', uri: this.rowKey });
    }
```

In `group-model.ts`:
- Add `postConstruct` to the inversify import.
- Add the field `private readonly stored = new Set<string>();`.
- In `load`, directly after `tray` is parsed from `reader.listUngroupedTabs()` and before `if (live)`, add:

```ts
            // NG-009: every key the store holds a row for, open or not.
            this.stored.clear();
            for (const tabs of [...nextMembers.values(), tray]) {
                for (const tab of tabs) {
                    this.stored.add(tab.uri);
                }
            }
```

- In `ensureRow`, after the mutate, add `this.stored.add(uri);`.

Then add:

```ts
    @postConstruct()
    protected init(): void {
        // NG-009: a Theia tab with a row records when it was last looked at;
        // web tabs report their own activation.
        this.shell.onDidChangeActiveWidget(({ newValue }) => {
            if (!newValue) {
                return;
            }
            const uri = this.keyOf(newValue);
            if (this.stored.has(uri) && !/^(web|stock):/.test(uri)) {
                this.actor.mutate({ kind: 'touchTab', uri })
                    .catch(error => console.error('[@powerbrowser/modes] recording a tab access failed:', error));
            }
        });
    }
```

At the end of the file, before `export type { GroupMutation };`, add:

```ts
/** One web tab a previous session left, as the launch restore knows it. */
export interface SavedWebTab {
    key: string;
    url: string;
    lastAccessed: number | null;
}

/** One web tab the launch restore reopens. */
export interface WebTabRestore {
    key: string;
    url: string;
    withHistory: boolean;
}

/**
 * NG-011: what the launch restore reopens, from the settings in tabs.sqlite.
 * restore_behaviour 'none' reopens nothing (the tabs stay as Panorama cards).
 * Otherwise a tab last looked at within restore_live_minutes of `quitAt`
 * reopens with its back/forward history, one within restore_url_days at its
 * URL only, and anything older is left as a card.
 */
export function planWebTabRestore(settings: Record<string, string>, tabs: readonly SavedWebTab[], quitAt: number): WebTabRestore[] {
    if (settings.restore_behaviour === 'none') {
        return [];
    }
    const minutes = Number(settings.restore_live_minutes ?? '5');
    const days = Number(settings.restore_url_days ?? '30');
    const liveMs = (Number.isFinite(minutes) ? minutes : 5) * 60 * 1000;
    const urlMs = (Number.isFinite(days) ? days : 30) * 24 * 60 * 60 * 1000;
    return tabs.flatMap(tab => {
        const age = tab.lastAccessed === null ? Infinity : quitAt - tab.lastAccessed;
        return age > urlMs ? [] : [{ key: tab.key, url: tab.url, withHistory: age <= liveMs }];
    });
}
```

- [ ] **Step 6: Build and run.** `yarn build` exits 0. Run `node --check …PowerBrowserAPI.sys.mjs`. Run `--only gui06-chrome-bar-suggestions`: PASS. Report `ng-009` and `ng-010` as `live-main pending`, and expect them to PASS at merge. Part A of `ng-011` passes; part B stays red until Task 10.

- [ ] **Step 7: Commit gate, then commit**

```bash
git add powerbrowser/shell/PowerBrowserAPI.sys.mjs theia/extensions/tab-uris/src/node/tab-query-service.ts theia/extensions/tab-uris/src/browser/group-query-service.ts \
  theia/extensions/tab-uris/src/browser/web-tab.ts theia/extensions/modes/src/browser/group-model.ts theia/extensions/modes/src/browser/group-actor-client.ts
node scripts/scan-brand-residue.mjs
git commit -m "feat(ng-a): content age, closed-tab history from sessionstore, settings readers" -m "Refs: NG-009, NG-010, NG-011"
```

---

### Task 8: The SQL-05 round trip restarts the real browser; the absence gate needs the call (NG-017, NG-020)

**Files:**
- Modify: `scripts/verify-sql-store-roundtrip.mjs`, rewritten whole.
- Modify: `scripts/lib/startup-wiring.mjs` (the body of `startupWiringPresent`), and `scripts/verify-sql-store-absence.mjs` (`runLive`'s wiring branch, :433–435).

**Interfaces:**
- Consumes: `withShell`, `newProfile`, `servePages`, `waitUntil`, `readStore`, `schemaHead` (Task 1); the stock key rule (Task 2).
- Produces: `sql-store-roundtrip` is a live restart round trip. `sql-store-absence` fails, and is no longer STAGED, when the startup call is absent.

- [ ] **Step 1: Confirm failure.** `ng-017-sql05-restarts-real-browser` exits 1 with "launched the browser 0 time(s)". `ng-020-absence-wiring-by-call` exits 1.

- [ ] **Step 2: Rewrite `scripts/verify-sql-store-roundtrip.mjs`**

```js
#!/usr/bin/env node
// scripts/verify-sql-store-roundtrip.mjs
//
// SQL-05 gate 3 (plan 12-01, promoted in plan 12-03; NG-017 made it real):
// the tab -> row -> restart -> reopen round trip against the BUILT browser on
// one profile. Launch 1 opens three stock tabs (two on one URL) through the
// shell's own group channel and records their open rows. The browser quits
// (SIGTERM: an orderly quit on GTK) and launch 2 relaunches on the same
// profile; opening a stock window lets sessionstore restore the session into
// it. The store's open stock rows must then equal launch 1's, key for key, and
// their URLs the URLs of the tabs sessionstore restored. Static half: the
// quarantine removal order and the downgrade refusal stay pinned in the writer.
//
// Self-test (`--self-test`): the unmodified drive green first, then a missing
// and an extra row through the same comparator, each red naming its key.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { newProfile, removeProfiles, servePages, sleep, waitUntil, withShell } from './lib/ng-a-live.mjs';
import { readStore, schemaHead } from './lib/tab-store-fixtures.mjs';

const NAME = 'verify-sql-store-roundtrip';
const HERE = dirname(fileURLToPath(import.meta.url));
const WRITER = join(HERE, '..', 'powerbrowser/shell/PowerBrowserAPI.sys.mjs');

function fail(message) {
    throw new Error(`${NAME}: FAIL -- ${message}`);
}

// CR-03 static pin (12-CODE-REVIEW.md): backup, then the load-bearing
// live-file removal, then the reopen, in that order inside the quarantine.
function assertQuarantineRemovalPinned() {
    const src = readFileSync(WRITER, 'utf8');
    const start = src.indexOf('async quarantineAndRebuildTabStore(');
    if (start === -1) {
        fail('quarantine removal unlocatable in writer source (want `async quarantineAndRebuildTabStore(`)');
    }
    const body = src.slice(start, src.indexOf('async ensureTabStore(', start));
    const backup = body.indexOf('backupToFile');
    const removal = body.indexOf('await IOUtils.remove(livePath);');
    const reopen = body.indexOf('TAB_STORE_FILE_NAME });');
    if (backup === -1 || removal === -1 || reopen === -1 || !(backup < removal && removal < reopen)) {
        fail('quarantine delete-then-rebuild order unlocatable in writer source (want backupToFile, then await IOUtils.remove(livePath);, then the TAB_STORE_FILE_NAME reopen)');
    }
}

// T-12-05 static pin: the downgrade refusal compares against the chain head.
function assertDowngradeBranchPresent() {
    const src = readFileSync(WRITER, 'utf8');
    const compared = /schemaVersion\s*>\s*TAB_STORE_SCHEMA_HEAD/.test(src);
    if (!compared || !/refusing downgrade/.test(src)) {
        fail('downgrade-refusal branch unlocatable in writer source (want schemaVersion > TAB_STORE_SCHEMA_HEAD with a refusing-downgrade error)');
    }
}

// Exact set equality by key: surplus names the extra, missing names the lost.
function compareRowSets(actual, expected) {
    const failures = [];
    const a = new Map(actual.map(r => [r.uri, r]));
    const e = new Map(expected.map(r => [r.uri, r]));
    for (const [uri, row] of e) {
        if (!a.has(uri)) {
            failures.push(`missing row for URI '${uri}'`);
        } else if (JSON.stringify(a.get(uri)) !== JSON.stringify(row)) {
            failures.push(`row drifted for URI '${uri}'`);
        }
    }
    for (const uri of a.keys()) {
        if (!e.has(uri)) {
            failures.push(`surplus row for URI '${uri}'`);
        }
    }
    return failures;
}

function openStockRows(profile, urls) {
    return readStore(join(profile, 'tabs.sqlite')).tabs
        .filter(r => r.uri.startsWith('stock:') && r.closed_at == null && urls.includes(r.url))
        .map(r => ({ uri: r.uri, url: r.url }));
}

async function main() {
    assertQuarantineRemovalPinned();
    assertDowngradeBranchPresent();
    const pages = await servePages();
    const profile = newProfile('sql05');
    try {
        const urls = [pages.url('/one'), pages.url('/one'), pages.url('/two')];
        const recorded = await withShell(profile, async ({ run }) => {
            await run(`for (const url of ${JSON.stringify(urls)}) { await A.mutate({ kind: 'openStockTab', url }); await A.sleep(500); }`);
            const rows = await waitUntil(() => {
                const r = openStockRows(profile, urls);
                return r.length === 3 ? r : undefined;
            }, 20000);
            if (!rows) {
                fail(`launch 1 wrote ${openStockRows(profile, urls).length} open stock rows for 3 stock tabs`);
            }
            await sleep(3000);
            return rows;
        });
        const restored = await withShell(profile, async ({ run, topLevelContexts }) => {
            await run(`await A.mutate({ kind: 'openStockTab' });`);
            const contexts = await waitUntil(async () => {
                const seen = (await topLevelContexts()).map(c => c.url).filter(u => urls.includes(u));
                return seen.length === 3 ? seen : undefined;
            }, 30000);
            if (!contexts) {
                fail(`launch 2 restored ${(await topLevelContexts()).filter(c => urls.includes(c.url)).length} of the 3 stock tabs`);
            }
            const rows = await waitUntil(() => {
                const r = openStockRows(profile, urls);
                return compareRowSets(r, recorded).length === 0 ? r : undefined;
            }, 30000);
            return { contexts, rows: rows ?? openStockRows(profile, urls) };
        });
        const drift = compareRowSets(restored.rows, recorded);
        if (drift.length) {
            fail(`the store after the restart disagrees with launch 1: ${drift.join('; ')}`);
        }
        const wanted = [...urls].sort().join(' ');
        if ([...restored.contexts].sort().join(' ') !== wanted || restored.rows.map(r => r.url).sort().join(' ') !== wanted) {
            fail('the open stock rows do not match the tabs sessionstore restored');
        }
        if (readStore(join(profile, 'tabs.sqlite')).version !== schemaHead()) {
            fail('tabs.sqlite is not at the writer head after the round trip');
        }
        console.log(`${NAME}: PASS -- 3 stock tabs (2 on one URL) kept their rows and keys across a real restart; the store agrees with sessionstore`);
    } finally {
        pages.close();
        removeProfiles();
    }
}

function selfTest() {
    const green = spawnSync(process.execPath, [join(HERE, 'verify-sql-store-roundtrip.mjs')], { encoding: 'utf8' });
    if (green.status !== 0) {
        console.error(`${NAME} --self-test: FAIL -- the unmodified drive is already red, so the planted-fault results below would be meaningless:`);
        process.stderr.write(green.stderr ?? '');
        process.exit(1);
    }
    const expected = [
        { uri: 'stock:roundtrip-1', url: 'https://example.com/roundtrip/one' },
        { uri: 'stock:roundtrip-2', url: 'https://example.com/roundtrip/one' },
    ];
    let failed = 0;
    const missing = compareRowSets(expected.slice(1), expected);
    if (!missing.some(f => f.includes('stock:roundtrip-1'))) {
        console.error(`${NAME} --self-test: FAIL -- 'missing row' did not go red naming 'stock:roundtrip-1'; got: ${missing.join(' | ') || '(nothing)'}`);
        failed += 1;
    }
    const extra = compareRowSets([...expected, { uri: 'stock:ghost', url: 'https://example.com/ghost' }], expected);
    if (!extra.some(f => f.includes('stock:ghost'))) {
        console.error(`${NAME} --self-test: FAIL -- 'extra row' did not go red naming 'stock:ghost'; got: ${extra.join(' | ') || '(nothing)'}`);
        failed += 1;
    }
    if (failed) {
        process.exit(1);
    }
    console.log(`${NAME} --self-test: PASS -- 2 planted faults both went red`);
}

if (process.argv.includes('--self-test')) {
    selfTest();
} else {
    main().catch(error => {
        console.error(error.message);
        process.exit(1);
    });
}
```

- [ ] **Step 3: Verify the restore route once, before relying on it.** In the clone lane, run `node scripts/verify-sql-store-roundtrip.mjs`. If launch 2 reports "restored 0 of the 3 stock tabs", then sessionstore did not restore into the stock window that `openStockTab` opened. In that case, stop NG-017, write the observed behaviour into `docs/non-gui/questions-wave-a.md` under Q6, and continue with NG-020. Expected: PASS.

- [ ] **Step 4: The absence gate needs the call (`scripts/lib/startup-wiring.mjs`, `verify-sql-store-absence.mjs`)**

In `scripts/lib/startup-wiring.mjs`, the body of `startupWiringPresent(sources = readWiringSources())` becomes:

```js
    // NG-020: the call itself -- a PowerBrowserAPI.<name>( call expression in
    // source with its comments removed -- never a text pattern a comment would
    // also satisfy. The live drive's positive control then proves it ran.
    const stripComments = src => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
    return Object.values(sources).some(src => /PowerBrowserAPI\.(ensureTabStore|startTabStoreTriggers)\s*\(/.test(stripComments(src)));
```

In `scripts/verify-sql-store-absence.mjs` `runLive`, replace the `if (!startupWiringPresent()) { staged(…) }` block with:

```js
  if (!startupWiringPresent()) {
    fail('startup trigger wiring absent: no PowerBrowserAPI.ensureTabStore( or PowerBrowserAPI.startTabStoreTriggers( call in powerbrowser.js or TheiaService.sys.mjs, so no session can exercise the emitter (NG-020: absent wiring is a failure, not a staged pass)');
  }
```

Update the header comment (:31), which says the instrument prints STAGED for absent wiring: STAGED now applies only to a missing binary.

- [ ] **Step 5: Run.** `ng-020-absence-wiring-by-call` passes (quick). `sql-store-absence` and `sql-store-absence-self-test` pass (full tier). In the clone lane, `ng-017-sql05-restarts-real-browser`, `sql-store-roundtrip` and `sql-store-roundtrip-self-test` pass.

- [ ] **Step 6: Commit gate, then commit**

```bash
git add scripts/verify-sql-store-roundtrip.mjs scripts/verify-sql-store-absence.mjs scripts/lib/startup-wiring.mjs
node scripts/scan-brand-residue.mjs
git commit -m "test(ng-a): SQL-05 round trip restarts the real browser; absence gate needs the startup call" -m "Refs: NG-017, NG-020"
```

---

### Task 9: The tabs.sqlite page is complete (NG-019)

**Files:**
- Modify: `docs/TAB-STORE.md` (add the "Settings", "Integrity and quarantine" and "Reader contract" sections).

**Interfaces:**
- Consumes: Tasks 2, 3, 6 and 7 as built.
- Produces: `docs/TAB-STORE.md`, whose contracted sections the NG-019 check requires.

- [ ] **Step 1: Confirm failure.** `scripts/verify-platform.sh --only ng-019-tab-store-doc` exits 1, naming the three missing sections and the two `.planning` pointers.

- [ ] **Step 2: Append to `docs/TAB-STORE.md`, before "## v1"**

```markdown
## Settings

The `settings` table holds the store's own settings, one text value per key,
seeded at v5. A value changes through the `setSetting` op of the documented
write path (wave B, decisions.md R18), which goes through the chrome writer
and refuses a value outside the key's valid values below. With PowerBrowser
closed, any SQLite client can edit a value too. A reader that finds a value
it cannot use (not a number where one is needed, or negative) falls back to
the default.

| Key | Valid values | Default | Read by | Meaning |
|---|---|---|---|---|
| `closed_retention_days` | a number from 0 to 3650, decimals allowed | `7` | the sweep's prune | Closed-tab history older than this many days is deleted |
| `integrity_check_minutes` | a number greater than 0 and at most 525600, decimals allowed | `1440` | the integrity schedule | Minutes between full integrity checks |
| `restore_behaviour` | `session` or `none` | `session` | the launch restore | `session`: reopen the last session's web tabs; `none`: reopen nothing, the tabs stay as Panorama cards |
| `restore_live_minutes` | a number from 0 to 10080, decimals allowed | `5` | the launch restore | A tab looked at within this many minutes of the quit reopens with its back/forward history |
| `restore_url_days` | a number from 0 to 3650, decimals allowed | `30` | the launch restore | A tab looked at within this many days reopens at its URL; older ones stay as cards |

## Integrity and quarantine

At startup the writer runs `PRAGMA quick_check`; every
`integrity_check_minutes` it runs the full `PRAGMA integrity_check`, which
also compares index contents. A result other than a single `ok`, or a file
that cannot be opened, trips the store: the file is copied to the next free
`tabs.sqlite.corrupt-<N>` (never overwritten, never deleted), the `-wal`,
`-shm` and `-journal` files are removed, and the store is rebuilt at the head
from sessionstore's open and recently closed tabs. Groups rebuild empty; the
corrupt copy keeps the lost membership. A file whose `user_version` is newer
than the build is refused and left untouched, never quarantined.

## Reader contract

`TabQueryService` opens the file read-only and checks `user_version`. A store
it cannot read -- no profile directory, a missing or unopenable file, a
version other than the head -- is an error naming the cause, never an empty
answer; Organising shows its load-error state and the address bar its
provider error. Panorama and suggestion reads serve open rows only
(`closed_at` NULL). Its methods: `listGroups`, `getGroupTabs`,
`listUngroupedTabs`, `getThumbnail` and `getSettings` over the group
channel; `searchByPrefix` for the address bar.
```

- [ ] **Step 3: The pointers are the controller's (R4).** Record in the task report: "ng-019 goes green when the controller adds the pointer line to SCHEMA.md and MIGRATIONS.md at merge (decisions.md R4)." Then run `scripts/verify-platform.sh --only ng-019-tab-store-doc`. Expected: the only failures left are the two `.planning` pointer lines.

- [ ] **Step 4: Commit gate, then commit**

```bash
git add docs/TAB-STORE.md
node scripts/scan-brand-residue.mjs
git commit -m "feat(ng-a): tabs.sqlite page -- settings, integrity and quarantine, reader contract" -m "Refs: NG-019"
```

---

### Task 10 (Needs: wave-c): The launch restore reads the settings (NG-011)

Order: after wave C's rows for saving the session at quit and for restoring web tabs across a restart have merged into main. Run `git -C ~/coding/Power-Browser-ng-a pull --no-rebase ~/coding/Power-Browser main` first.

**Files:**
- Modify: wave C's launch-restore code in `theia/extensions/modes/src/browser/setups-service.ts`. This is wave C's region; coordinate through the controller (R5).

**Interfaces:**
- Consumes: `planWebTabRestore`, `SavedWebTab`, `WebTabRestore` and `GroupQueryService.getSettings()` (Task 7), and `WebTabOpenerOptions.rowKey` (Task 4).
- Produces: at launch, the web tabs of the last session are reopened per `restore_behaviour`, `restore_live_minutes` and `restore_url_days`.

- [ ] **Step 1: Confirm failure.** In main, `ng-011-settings-table-read` exits 1 with "restore_behaviour=session: the web tab was not restored", or with "…kept/lost its back history".

- [ ] **Step 2: Find wave C's restore entry point.** Run `grep -n "WebTabOpenHandler\|restore\|lastSession" theia/extensions/modes/src/browser/setups-service.ts`. The entry point is the launch-restore function wave C added for saving the session at quit, and the per-tab restore it added for web tabs across a restart (wave C names them, R5). It must hold, per web tab, `rowKey`, `url` and `lastAccessed`, plus the session's save time.

- [ ] **Step 3: Gate the restore through the plan.** Just before wave C's launch restore reopens web tabs:

```ts
import { planWebTabRestore } from './group-model';
// …inside the launch restore, with `saved` the session wave C persisted at quit:
const settings = await this.groupReader.getSettings().catch(() => ({} as Record<string, string>));
const plan = planWebTabRestore(settings, saved.webTabs.map(tab => ({ key: tab.rowKey, url: tab.url, lastAccessed: tab.lastAccessed ?? null })), saved.savedAt);
for (const tab of plan) {
    // wave C's per-tab web-tab restore, opening on the saved row and restoring history only when asked:
    await this.restoreWebTab({ rowKey: tab.key, url: tab.url, withHistory: tab.withHistory });
}
```

`groupReader`, `saved.webTabs`, `saved.savedAt` and `restoreWebTab` are placeholders for the names wave C gives under R5. The call shape is fixed: every reopened web tab is opened with `rowKey`, and history is restored only when `withHistory` is true.

- [ ] **Step 4: Run.** In main, after merge, `ng-011-settings-table-read` passes (`live-main`: the Theia side is in this task, and the settings table is in main).

- [ ] **Step 5: Commit.** `git add theia/extensions/modes/src/browser/setups-service.ts`. Then `git commit -m "feat(ng-a): launch restore honours restore_behaviour and the age tiers" -m "Refs: NG-011"`.

---

### Task 11 (Needs: wave-c): Catalogue rows for the store's touchpoints (NG-001, NG-013)

Order: last, after wave C's catalogue edits to `powerbrowser/INTERNAL-APIS.md` have merged. Pull main first.

**Files:**
- Modify: `powerbrowser/INTERNAL-APIS.md`, wave C's file: the `Sqlite.sys.mjs` row (:24) and the `SessionStore.sys.mjs` row (:26).

**Interfaces:**
- Consumes: Tasks 2, 6 and 7.
- Produces: the catalogue names every method behind the two lazy imports.

- [ ] **Step 1: Edit the two rows.**
  - Sqlite row, "backs" list: add `migrateTabStoreToHead`/`migrateTabStoreToV5`/`trackShellTab`/`closeTabRow`/`closeAbsentStockRows`/`closeEndedWebRows`/`touchTabRow`/`writeClosedTabRow`/`readTabStoreSetting`/`runScheduledIntegrityCheck`.
  - SessionStore row, "backs" list: add `parseSessionStoreClosedRows`, `stockTabKey` (`getCustomTabValue`/`setCustomTabValue`) and `findStockTabBrowser` (`getCustomTabValue`).
  - SessionStore row's Purpose: add "Stock tabs carry their tabs.sqlite row key as the custom tab value `powerbrowser-tab-key`, which sessionstore saves and restores with the tab (NG-001)."
  - Threat Notes: add "The custom value is a store key, never a credential."
  - Neither row needs a new occurrence row: none of these calls matches a `FORBIDDEN_PATTERNS` entry.
- [ ] **Step 2: Run** `bash scripts/check-internals-boundary.sh --catalogue`. Expected: no line from this wave's methods is reported. Line-number re-sync is wave C's catalogue row.
- [ ] **Step 3: Commit.** `git add powerbrowser/INTERNAL-APIS.md`. Then `git commit -m "feat(ng-a): catalogue the tab store's sessionstore and Sqlite touchpoints" -m "Refs: NG-001, NG-013"`.

---

## Self-review notes

- **Coverage.** Each of the 20 rows is cited in the task that builds it. NG-011 appears in Task 7 (table and readers) and in Task 10 (restore path).
- **Review Focus.** Every line has a check in its owning task: migration (NG-015, Task 2), restart and port (NG-007, NG-008, NG-017), two tabs on one URL and navigation (NG-002, NG-003), corrupt, unopenable and newer stores (NG-012, NG-013, NG-014, NG-018), and a dirty tree (`assertCleanTree`).
- **Type consistency.** The following names are spelled identically wherever they appear across Tasks 2–10:
  - `tabKeyOf` and `keyOf`, `rowKey`, `WebTabOptions.key`, `WebTabOpenerOptions.rowKey`
  - `trackTab`, `closeTab`, `touchTab`
  - `closeTabRow`, `closeAbsentStockRows`, `closeEndedWebRows`, `trackShellTab`, `touchTabRow`, `writeClosedTabRow`
  - `readTabStoreSetting`, `runScheduledIntegrityCheck`, `migrateTabStoreToHead`
  - `getSettings`, `planWebTabRestore`
- **Known ceilings.**
  - Two editors split on one file share a key, because the resource URI is their identity.
  - A stock tab gets a fresh key on `TabOpen` before its session restore overwrites the key with the saved one. The orphan row is closed by the next sweep and pruned after retention.
  - Organising's scan in `watchClose` is O(tabs).

---

## Addendum (controller, 2026-09-25): NG-085, found during the build

Wave C's Task 1 found that every quit on the current tree takes about 72 s and then aborts in
profile-before-change, because the tabs.sqlite connection is never closed at shutdown. The store's
open and close belong to this wave (G11), so the row is wave A's (decisions.md R29).

- **Task 1 (checks-first), added:** `scripts/verify-ng-085-quit-closes-store.mjs`, registered in
  `verify-platform.sh` with the other wave A full-tier rows and listed in `checks-wave-a.tsv`
  (`live-main`). It launches the built browser on a kept profile with the tab store open, quits it
  through the normal quit path, and fails unless the process exits within 15 s and its stdout log
  carries no AsyncShutdown timeout or abort line naming the tab store. Red today: the quit takes
  about 72 s and aborts.
- **Task 2 (merges first), added:** the store registers its close with AsyncShutdown
  (`profileBeforeChange` blocker, or the `Sqlite.shutdown` client the connection offers) so that
  `tabStoreConn.close()` finishes before profile-before-change completes, and a quit with the store
  open finishes in seconds. Refs: NG-085.
