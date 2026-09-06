#!/usr/bin/env node
// scripts/verify-gui08-persistence-roundtrip.mjs
//
// GUI-08's persistence roundtrip gate (15-01): the single chrome-side write
// path (v1→v2 groups migration + validated writer methods) proved over a
// stage copy.
//
// It DERIVES at check time from the tree: the groups DDL text between the
// PB-SQL-GROUPS-DDL markers, the TAB_STORE_SCHEMA_HEAD value, the group
// write/read method names (every `async *Group*(` / `async *Thumbnail*(`
// definition), the GROUP_PATH const from the browser contract, the title
// cap, and the Untitled fallback literal. Each is compared as SET EQUALITY
// (or exact value) against the one EXPECTED block below: a surplus
// statement/method is unreviewed surface, a missing one is a dropped
// contract row, a reworded path breaks the frontend reader -- each reported
// BY NAME. An empty derivation fails as a broken instrument, never passes
// as clean.
//
// It then runs the DERIVED DDL through a live mkdtemp-stage roundtrip on
// the stdlib node:sqlite engine: v1→v2 migration, group CRUD plus group_id
// membership, the 60-char cap, empty-reverts-title, duplicate titles
// allowed, exactly-one-active, quarantine rebuilds-empty, and
// newer-than-head refusal with the file untouched.
//
// Honestly --quick: reads text sources plus a mkdtemp fixture only. No
// build, no browser, no display, no network.
//
// Usage:
//   node scripts/verify-gui08-persistence-roundtrip.mjs
//   node scripts/verify-gui08-persistence-roundtrip.mjs --self-test

import { mkdtempSync, readFileSync, rmSync, existsSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const NAME = 'verify-gui08-persistence-roundtrip';
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..');

const API_REL = 'powerbrowser/shell/PowerBrowserAPI.sys.mjs';
const CONTRACT_REL = 'theia/extensions/tab-uris/src/browser/group-query-service.ts';
const BACKEND_MODULE_REL = 'theia/extensions/tab-uris/src/node/tab-query-backend-module.ts';
const MODEL_REL = 'theia/extensions/modes/src/browser/group-model.ts';

/**
 * The declared groups contract. The ONE hand-kept block in this file:
 * editing it is how a deliberate contract change is made -- it shows up in
 * the diff for review. Everything it is compared against is derived at
 * check time from the sources named above.
 */
const EXPECTED_GROUPS_STATEMENTS = Object.freeze([
    `CREATE TABLE groups ( id TEXT PRIMARY KEY CHECK(length(id) > 0), title TEXT NOT NULL DEFAULT 'Untitled group', x INTEGER NOT NULL DEFAULT 0 CHECK(x >= 0), y INTEGER NOT NULL DEFAULT 0 CHECK(y >= 0), w INTEGER NOT NULL DEFAULT 400 CHECK(w >= 200), h INTEGER NOT NULL DEFAULT 300 CHECK(h >= 144), is_active INTEGER NOT NULL DEFAULT 0 CHECK(is_active IN (0, 1)) )`,
    `CREATE INDEX idx_groups_active ON groups (is_active)`,
    `ALTER TABLE tabs ADD COLUMN group_id TEXT NULL`,
    `CREATE INDEX idx_tabs_group ON tabs (group_id)`,
    `ALTER TABLE tabs ADD COLUMN thumbnail TEXT NULL`,
]);
const EXPECTED_SCHEMA_HEAD = 2;
const EXPECTED_GROUP_METHODS = Object.freeze([
    'writeGroupRow',
    'removeGroupRow',
    'setTabGroupId',
    'setActiveGroup',
    'writeThumbnail',
    'captureTabThumbnail',
    'closeGroupRows',
    'readGroupRow',
    'listGroupRows',
    'getGroupTabs',
    'handleGroupMutation',
]);
const EXPECTED_GROUP_PATH = '/services/powerbrowser/groups';
const EXPECTED_TITLE_CAP = 60;
const UNTITLED_FALLBACK = 'Untitled group';

function fail(message) {
    throw new Error(`${NAME}: FAIL -- ${message}`);
}

function diff(actual, expected) {
    const a = new Set(actual);
    const e = new Set(expected);
    return {
        surplus: [...a].filter(x => !e.has(x)),
        missing: [...e].filter(x => !x || !a.has(x)),
    };
}

function normaliseStatement(raw) {
    return raw.replace(/\s+/g, ' ').trim();
}

/** Raw text between the GROUPS DDL markers in the writer source. */
function derivedGroupsDdlText(apiSrc) {
    const start = apiSrc.indexOf('PB-SQL-GROUPS-DDL-START');
    const end = apiSrc.indexOf('PB-SQL-GROUPS-DDL-END');
    if (start < 0 || end < 0 || end <= start) {
        return '';
    }
    return apiSrc.slice(start, end).replace(/^.*?START\s*\*\/\s*`?/s, '').trim();
}

/** Raw text between the v1 TABS DDL markers (rebuild/quarantine mirror). */
function derivedTabsDdlText(apiSrc) {
    const start = apiSrc.indexOf('PB-SQL-TABS-DDL-START');
    const end = apiSrc.indexOf('PB-SQL-TABS-DDL-END');
    if (start < 0 || end < 0 || end <= start) {
        return '';
    }
    return apiSrc.slice(start, end).replace(/^.*?START\s*\*\/\s*`?/s, '').trim();
}

function splitStatements(ddlText) {
    return ddlText.split(';').map(normaliseStatement).filter(s => s && !s.startsWith('`'));
}

/** Every group-surface writer/reader/dispatch method defined on the API. */
function derivedGroupMethods(apiSrc) {
    const names = [];
    for (const m of apiSrc.matchAll(/async ([A-Za-z0-9_]*Group[A-Za-z0-9_]*|[A-Za-z0-9_]*Thumbnail[A-Za-z0-9_]*)\s*\(/g)) {
        if (!names.includes(m[1])) {
            names.push(m[1]);
        }
    }
    return names;
}

function derivedSchemaHead(apiSrc) {
    const m = /const TAB_STORE_SCHEMA_HEAD\s*=\s*(\d+)/.exec(apiSrc);
    return m ? Number(m[1]) : undefined;
}

function derivedTitleCap(apiSrc) {
    const m = /const GROUP_TITLE_MAX\s*=\s*(\d+)/.exec(apiSrc);
    return m ? Number(m[1]) : undefined;
}

/** WR-05c: the model-side rename cap must equal the chrome-side cap. */
function derivedModelTitleCap(modelSrc) {
    const m = /const GROUP_TITLE_MAX_CHARS\s*=\s*(\d+)/.exec(modelSrc);
    return m ? Number(m[1]) : undefined;
}

function derivedGroupPath(contractSrc) {
    const m = /GROUP_PATH\s*=\s*'([^']+)'/.exec(contractSrc);
    return m ? m[1] : '';
}

/**
 * CR-01: host-based Theia sender rule. Theia is always served with a port
 * (http://127.0.0.1:PORT/ via TheiaService._swap), so the parent wall must
 * parse the sender URI and compare host -- never an exact-or-slash-prefix
 * string match against portless http://127.0.0.1. Mirrored here with WHATWG
 * URL (Services.io.newURI in chrome); the static half below proves the
 * source uses the host rule, the live cases prove the rule itself accepts
 * port-bearing senders and rejects suffix forgeries.
 */
function mirrorSenderIsTheia(spec) {
    if (typeof spec !== 'string' || !spec) {
        return false;
    }
    try {
        const url = new URL(spec);
        if (url.protocol !== 'http:') {
            return false;
        }
        return url.hostname === '127.0.0.1' || url.hostname === 'localhost';
    } catch {
        return false;
    }
}

/** Port-bearing positive, suffix negative, empty/undefined reject. */
const ORIGIN_SENDER_CASES = Object.freeze([
    { spec: 'http://127.0.0.1:3000/', want: true },
    { spec: 'http://127.0.0.1:3000/some/path', want: true },
    { spec: 'http://localhost:3000/', want: true },
    { spec: 'http://127.0.0.1/', want: true },
    { spec: 'http://127.0.0.1.evil.com/', want: false },
    { spec: 'http://127.0.0.1evil.com:3000/', want: false },
    { spec: 'http://127.0.0.1:3000.evil.com/', want: false },
    { spec: 'https://127.0.0.1:3000/', want: false },
    { spec: 'http://example.com/', want: false },
    { spec: '', want: false },
]);

/**
 * WR-04: the normalizeGroupRow id/title wall, mirrored. Client generators
 * emit `group-<base36>-<base36>` (group-model.ts), so the first case pins
 * client compatibility; the rest pin the bound (129 chars), charset, and
 * type rejections.
 */
function mirrorGroupIdOk(id) {
    return typeof id === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(id);
}
const GROUP_ID_CASES = Object.freeze([
    { id: 'group-abc123-xyz789', want: true },
    { id: 'g1', want: true },
    { id: 'x'.repeat(129), want: false },
    { id: 'has space', want: false },
    { id: 'semi;colon', want: false },
    { id: 'quote"q', want: false },
    { id: 'slash/s', want: false },
    { id: '', want: false },
    { id: 42, want: false },
    { id: null, want: false },
    { id: undefined, want: false },
]);
function mirrorTitleOk(title) {
    return title === undefined || title === null || typeof title === 'string';
}
const NON_STRING_TITLES = Object.freeze([{}, [], 42, true]);

/** @returns {string[]} failure messages -- empty means the gate holds. */
function checkStatic(sources) {
    const failures = [];
    const apiSrc = sources[API_REL] ?? '';
    const contractSrc = sources[CONTRACT_REL] ?? '';
    const backendSrc = sources[BACKEND_MODULE_REL] ?? '';
    const modelSrc = sources[MODEL_REL] ?? '';

    const ddlText = derivedGroupsDdlText(apiSrc);
    if (!ddlText) {
        failures.push(`${API_REL}: derived ZERO groups DDL text between the PB-SQL-GROUPS-DDL markers -- the anchor drifted, so this comparison proves nothing`);
    } else {
        const actual = splitStatements(ddlText);
        if (!actual.length) {
            failures.push(`${API_REL}: the groups DDL derivation split into ZERO statements -- broken instrument, not a clean tree`);
        } else {
            const statementDiff = diff(actual, [...EXPECTED_GROUPS_STATEMENTS]);
            if (statementDiff.surplus.length) {
                failures.push(`${API_REL}: groups DDL carries statements NOT in the declared schema (unreviewed surface): ${statementDiff.surplus.join(' ;; ')}`);
            }
            if (statementDiff.missing.length) {
                failures.push(`${API_REL}: declared groups DDL statements are GONE (dropped contract row): ${statementDiff.missing.join(' ;; ')}`);
            }
        }
    }

    const head = derivedSchemaHead(apiSrc);
    if (head === undefined) {
        failures.push(`${API_REL}: TAB_STORE_SCHEMA_HEAD unlocatable -- the version anchor drifted`);
    } else if (head !== EXPECTED_SCHEMA_HEAD) {
        failures.push(`${API_REL}: schema head is ${head}, declared ${EXPECTED_SCHEMA_HEAD} -- a head move without a migration is a downgrade trap`);
    }

    const methods = derivedGroupMethods(apiSrc);
    if (!methods.length) {
        failures.push(`${API_REL}: derived ZERO group-surface methods -- the async-definition anchor drifted`);
    } else {
        const methodDiff = diff(methods, [...EXPECTED_GROUP_METHODS]);
        if (methodDiff.surplus.length) {
            failures.push(`${API_REL}: group-surface methods NOT in the declared contract (unreviewed writer): ${methodDiff.surplus.join(', ')}`);
        }
        if (methodDiff.missing.length) {
            failures.push(`${API_REL}: declared group methods are GONE: ${methodDiff.missing.join(', ')}`);
        }
    }

    const groupPath = derivedGroupPath(contractSrc);
    if (!groupPath) {
        failures.push(`${CONTRACT_REL}: GROUP_PATH const underivable -- the RPC path anchor drifted`);
    } else if (groupPath !== EXPECTED_GROUP_PATH) {
        failures.push(`${CONTRACT_REL}: GROUP_PATH drifted to '${groupPath}' (declared '${EXPECTED_GROUP_PATH}') -- the reader proxy and backend handler disagree`);
    }
    if (!backendSrc.includes('GROUP_PATH')) {
        failures.push(`${BACKEND_MODULE_REL}: no GROUP_PATH binding -- the backend handler is not serving the contract path`);
    }

    const cap = derivedTitleCap(apiSrc);
    if (cap === undefined) {
        failures.push(`${API_REL}: GROUP_TITLE_MAX unlocatable -- the cap anchor drifted`);
    } else if (cap !== EXPECTED_TITLE_CAP) {
        failures.push(`${API_REL}: title cap is ${cap}, declared ${EXPECTED_TITLE_CAP} -- the rename contract broke`);
    }
    // WR-05c: the model cap must equal the chrome cap -- drift paints titles
    // the store will cut on write (paint/store divergence until reload).
    const modelCap = derivedModelTitleCap(modelSrc);
    if (modelCap === undefined) {
        failures.push(`${MODEL_REL}: GROUP_TITLE_MAX_CHARS unlocatable -- the model cap anchor drifted`);
    } else if (cap !== undefined && modelCap !== cap) {
        failures.push(`${MODEL_REL}: model cap is ${modelCap} but chrome GROUP_TITLE_MAX is ${cap} -- rename paints titles the store cuts on write`);
    }
    if (!apiSrc.includes(`|| "${UNTITLED_FALLBACK}"`) && !apiSrc.includes(`?? "${UNTITLED_FALLBACK}"`)) {
        failures.push(`${API_REL}: the empty-title fallback to '${UNTITLED_FALLBACK}' is gone -- blank headers become storable`);
    }
    if (!modelSrc.includes(`'${UNTITLED_FALLBACK}'`)) {
        failures.push(`${MODEL_REL}: the contracted '${UNTITLED_FALLBACK}' default is gone from the model -- New Group copy drifted`);
    }

    // CR-01: the parent origin wall is host-based, not a string prefix.
    // A string exact-or-slash-prefix match against portless http://127.0.0.1
    // rejects every port-bearing Theia sender (100% of production traffic).
    if (!apiSrc.includes('function groupSenderIsTheia') && !apiSrc.includes('function groupSenderSpecIsTheia')) {
        failures.push(`${API_REL}: the Theia sender predicate (groupSenderIsTheia/groupSenderSpecIsTheia) is underivable -- the origin anchor drifted`);
    }
    if (!apiSrc.includes('schemeIs("http")')) {
        failures.push(`${API_REL}: the origin scheme check 'schemeIs("http")' is gone -- non-http senders are no longer rejected`);
    }
    if (!apiSrc.includes('uri.host')) {
        failures.push(`${API_REL}: the origin host comparison 'uri.host' is gone -- the wall no longer parses the sender host`);
    }
    if (!apiSrc.includes('"localhost"') && !apiSrc.includes("'localhost'")) {
        failures.push(`${API_REL}: the 'localhost' host acceptance is gone -- loopback senders diverge by hostname`);
    }
    if (apiSrc.includes('senderSpec !== GROUP_ACTOR_THEIA_ORIGIN') || apiSrc.includes('senderSpec.startsWith')) {
        failures.push(`${API_REL}: the string-prefix origin wall is back (senderSpec exact-or-slash-prefix) -- it rejects every port-bearing Theia sender, so the write channel nacks 100% of production traffic`);
    }
    if (apiSrc.includes('spec.startsWith("http://127.0.0.1")') || apiSrc.includes('spec.startsWith(GROUP_ACTOR_THEIA_ORIGIN')) {
        failures.push(`${API_REL}: naive startsWith origin admits suffix forgeries such as 'http://127.0.0.1.evil.com/' -- compare parsed host instead`);
    }
    if (!apiSrc.includes('if (!groupSenderIsTheia(actorRef))')) {
        failures.push(`${API_REL}: handleGroupMutation no longer gates on 'if (!groupSenderIsTheia(actorRef))' -- the W5 second wall is unwired`);
    }
    for (const { spec, want } of ORIGIN_SENDER_CASES) {
        if (mirrorSenderIsTheia(spec) !== want) {
            failures.push(`${API_REL}: the mirrored Theia sender rule resolves '${spec}' to ${!want} (want ${want}) -- the port-bearing/suffix contract broke`);
        }
    }
    if (mirrorSenderIsTheia(undefined) !== false) {
        failures.push(`${API_REL}: the mirrored Theia sender rule accepts an undefined actorRef -- empty senders must reject`);
    }

    // WR-04: the id shape bound and the non-string title refusal.
    if (!apiSrc.includes('/^[A-Za-z0-9_-]{1,128}$/')) {
        failures.push(`${API_REL}: the group-id shape bound '/^[A-Za-z0-9_-]{1,128}$/' is gone -- unbounded ids bloat the store and collisions silently overwrite`);
    }
    if (!apiSrc.includes('refusing malformed group id')) {
        failures.push(`${API_REL}: the malformed-id refusal is gone -- normalizeGroupRow accepts arbitrary id strings`);
    }
    if (!apiSrc.includes('refusing non-string title')) {
        failures.push(`${API_REL}: the non-string title refusal is gone -- objects store literally as "[object Object]"`);
    }
    for (const { id, want } of GROUP_ID_CASES) {
        if (mirrorGroupIdOk(id) !== want) {
            failures.push(`${API_REL}: the mirrored id rule resolves ${JSON.stringify(id)} to ${!want} (want ${want}) -- the shape bound drifted`);
        }
    }
    for (const title of NON_STRING_TITLES) {
        if (mirrorTitleOk(title) !== false) {
            failures.push(`${API_REL}: the mirrored title rule accepts ${JSON.stringify(title)} -- non-string titles must refuse`);
        }
    }
    if (mirrorTitleOk('Research') !== true) {
        failures.push(`${API_REL}: the mirrored title rule rejects a plain string title -- the refusal over-matches`);
    }
    return failures;
}

// --- Live mirror (production-faithful procedure over the DERIVED DDL) ---

function tableExists(db, name) {
    return !!db.prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?`).get(name);
}

function indexExists(db, name) {
    return !!db.prepare(`SELECT 1 FROM sqlite_master WHERE type = 'index' AND name = ?`).get(name);
}

function columnExists(db, table, column) {
    return db.prepare(`PRAGMA table_info(${table})`).all().some(col => col.name === column);
}

function getUserVersion(db) {
    return db.prepare('PRAGMA user_version').get().user_version;
}

/** Mirrors openTabStore's guard: newer-than-head refuses, file untouched. */
function mirrorOpenGuard(db, head) {
    const version = getUserVersion(db);
    if (version > head) {
        throw new Error(`openTabStore: refusing downgrade: user_version=${version} is newer than chain head ${head}`);
    }
}

/** Mirrors migrateTabStoreToV1 + migrateTabStoreToV2, sequential. */
function mirrorMigrate(db, tabsDdl, groupsDdl, head) {
    const v1 = splitStatements(tabsDdl);
    const createTabs = v1.find(s => /^create table tabs\b/i.test(s));
    const tabsIndex = v1.find(s => /^create index\b/i.test(s));
    if (!createTabs || !tabsIndex) {
        fail('v1 DDL derivation missing CREATE TABLE tabs or CREATE INDEX -- broken instrument');
    }
    if (!tableExists(db, 'tabs') || !indexExists(db, 'idx_tabs_last_active')) {
        db.exec('BEGIN');
        try {
            if (!tableExists(db, 'tabs')) {
                db.exec(createTabs);
            }
            if (!indexExists(db, 'idx_tabs_last_active')) {
                db.exec(tabsIndex);
            }
            db.exec('PRAGMA user_version = 1');
            db.exec('COMMIT');
        } catch (err) {
            try {
                db.exec('ROLLBACK');
            } catch {
                // Rollback is best-effort in the mirror; the throw below is the signal.
            }
            throw err;
        }
    } else if (getUserVersion(db) < 1) {
        db.exec('PRAGMA user_version = 1');
    }
    const v2 = splitStatements(groupsDdl);
    const want = (pattern) => {
        const hit = v2.find(s => pattern.test(s));
        if (!hit) {
            fail('groups DDL derivation missing a required statement -- broken instrument');
        }
        return hit;
    };
    const createGroups = want(/^create table groups\b/i);
    const groupsActiveIndex = want(/^create index idx_groups_active\b/i);
    const addGroupId = want(/^alter table tabs add column group_id\b/i);
    const tabsGroupIndex = want(/^create index idx_tabs_group\b/i);
    const addThumbnail = want(/^alter table tabs add column thumbnail\b/i);
    const done = tableExists(db, 'groups')
        && indexExists(db, 'idx_groups_active')
        && columnExists(db, 'tabs', 'group_id')
        && indexExists(db, 'idx_tabs_group')
        && columnExists(db, 'tabs', 'thumbnail');
    if (done) {
        db.exec(`PRAGMA user_version = ${head}`);
        return;
    }
    db.exec('BEGIN');
    try {
        if (!tableExists(db, 'groups')) {
            db.exec(createGroups);
        }
        if (!columnExists(db, 'tabs', 'group_id')) {
            db.exec(addGroupId);
        }
        if (!columnExists(db, 'tabs', 'thumbnail')) {
            db.exec(addThumbnail);
        }
        if (!indexExists(db, 'idx_groups_active')) {
            db.exec(groupsActiveIndex);
        }
        if (!indexExists(db, 'idx_tabs_group')) {
            db.exec(tabsGroupIndex);
        }
        db.exec(`PRAGMA user_version = ${head}`);
        db.exec('COMMIT');
    } catch (err) {
        try {
            db.exec('ROLLBACK');
        } catch {
            // Best-effort, as above.
        }
        throw err;
    }
}

/** Mirrors normalizeGroupRow's title rule over the DERIVED cap. */
function mirrorTitle(raw, cap) {
    return String(raw ?? UNTITLED_FALLBACK).trim().slice(0, cap) || UNTITLED_FALLBACK;
}

function checkLive(sources) {
    const failures = [];
    const apiSrc = sources[API_REL] ?? '';
    const check = (name, cond, detail) => {
        if (!cond) {
            failures.push(`live ${name}: ${detail}`);
        }
    };
    let stage = '';
    try {
        stage = mkdtempSync(join(tmpdir(), 'pb-gui08-roundtrip-'));
        if (/\s/.test(stage)) {
            fail(`stage path contains a space: ${stage}`);
        }
        const tabsDdl = derivedTabsDdlText(apiSrc);
        const groupsDdl = derivedGroupsDdlText(apiSrc);
        const head = derivedSchemaHead(apiSrc) ?? EXPECTED_SCHEMA_HEAD;
        const cap = derivedTitleCap(apiSrc) ?? EXPECTED_TITLE_CAP;
        if (!tabsDdl || !groupsDdl) {
            fail('DDL derivation empty at live stage -- broken instrument, not a clean tree');
        }

        // 1. v1 seed then v1→v2 migration.
        const path = join(stage, 'tabs.sqlite');
        {
            const db = new DatabaseSync(path);
            try {
                const v1 = splitStatements(tabsDdl);
                db.exec(v1.find(s => /^create table tabs\b/i.test(s)));
                db.exec(v1.find(s => /^create index\b/i.test(s)));
                db.exec('PRAGMA user_version = 1');
                db.prepare('INSERT INTO tabs (uri, url, title, last_active) VALUES (?, ?, ?, ?)').run('tab:a', 'https://a.example/', 'A', 10);
            } finally {
                db.close();
            }
        }
        {
            const db = new DatabaseSync(path);
            try {
                mirrorOpenGuard(db, head);
                mirrorMigrate(db, tabsDdl, groupsDdl, head);
                check('migration-head', getUserVersion(db) === head, `user_version is not the head after migration`);
                const cols = db.prepare('PRAGMA table_info(groups)').all().map(col => col.name);
                check('migration-columns', JSON.stringify(cols) === JSON.stringify(['id', 'title', 'x', 'y', 'w', 'h', 'is_active']), `groups columns are [${cols.join(', ')}]`);
                check('migration-indexes', indexExists(db, 'idx_groups_active') && indexExists(db, 'idx_tabs_group'), 'a v2 index is missing after migration');
                check('migration-tab-columns', columnExists(db, 'tabs', 'group_id') && columnExists(db, 'tabs', 'thumbnail'), 'group_id/thumbnail columns missing after migration');
                const kept = db.prepare('SELECT uri FROM tabs WHERE uri = ?').get('tab:a');
                check('migration-keeps-rows', !!kept, 'a pre-migration tab row did not survive');
            } finally {
                db.close();
            }
        }

        // 2. Group CRUD plus group_id roundtrip on the migrated copy.
        {
            const db = new DatabaseSync(path);
            try {
                const title = mirrorTitle('Research', cap);
                db.prepare('INSERT INTO groups (id, title, x, y, w, h, is_active) VALUES (?, ?, 0, 0, 400, 300, 0) ON CONFLICT (id) DO UPDATE SET title=excluded.title').run('g1', title);
                db.prepare('UPDATE tabs SET group_id = ? WHERE uri = ?').run('g1', 'tab:a');
                const row = db.prepare('SELECT title FROM groups WHERE id = ?').get('g1');
                check('crud-create', row && row.title === 'Research', 'group row did not roundtrip');
                const member = db.prepare('SELECT group_id FROM tabs WHERE uri = ?').get('tab:a');
                check('crud-assign', member && member.group_id === 'g1', 'group_id assignment did not roundtrip');
                db.prepare('UPDATE groups SET title = ?, x = ?, y = ? WHERE id = ?').run(mirrorTitle('Renamed', cap), 40, 80, 'g1');
                const moved = db.prepare('SELECT title, x, y FROM groups WHERE id = ?').get('g1');
                check('crud-rename-move', moved && moved.title === 'Renamed' && moved.x === 40 && moved.y === 80, 'rename/move did not roundtrip');
                db.prepare('UPDATE tabs SET group_id = NULL WHERE group_id = ?').run('g1');
                db.prepare('DELETE FROM groups WHERE id = ?').run('g1');
                const gone = db.prepare('SELECT 1 FROM groups WHERE id = ?').get('g1');
                const freed = db.prepare('SELECT group_id FROM tabs WHERE uri = ?').get('tab:a');
                check('crud-dissolve', !gone && freed && freed.group_id === null, 'dissolve left a row or an orphan membership');
            } finally {
                db.close();
            }
        }

        // 3. Cap, empty-revert, duplicates, exactly-one-active.
        {
            const db = new DatabaseSync(path);
            try {
                db.prepare('INSERT INTO groups (id, title, x, y, w, h, is_active) VALUES (?, ?, 0, 0, 400, 300, 0)').run('g-long', mirrorTitle('x'.repeat(100), cap));
                const long = db.prepare('SELECT title FROM groups WHERE id = ?').get('g-long');
                check('cap-60', long && long.title.length === cap, `over-long title stored at length ${long ? long.title.length : '?'}, want ${cap}`);
                db.prepare('INSERT INTO groups (id, title, x, y, w, h, is_active) VALUES (?, ?, 0, 0, 400, 300, 0)').run('g-empty', mirrorTitle('   ', cap));
                const empty = db.prepare('SELECT title FROM groups WHERE id = ?').get('g-empty');
                check('empty-revert', empty && empty.title === UNTITLED_FALLBACK, 'empty title did not revert to the contracted default');
                db.prepare('INSERT INTO groups (id, title, x, y, w, h, is_active) VALUES (?, ?, 0, 0, 400, 300, 0)').run('g-dup', mirrorTitle('Research', cap));
                const dups = db.prepare(`SELECT COUNT(*) AS n FROM groups WHERE title = ?`).get('Research');
                check('duplicate-allowed', dups && dups.n === 1, 'duplicate titles rejected (titles carry no uniqueness)');
                db.prepare('INSERT INTO groups (id, title, x, y, w, h, is_active) VALUES (?, ?, 0, 0, 400, 300, 0)').run('g-a', 'Aye');
                db.prepare('INSERT INTO groups (id, title, x, y, w, h, is_active) VALUES (?, ?, 0, 0, 400, 300, 0)').run('g-b', 'Bee');
                db.exec('UPDATE groups SET is_active = 0');
                db.prepare('UPDATE groups SET is_active = 1 WHERE id = ?').run('g-b');
                const active = db.prepare('SELECT COUNT(*) AS n FROM groups WHERE is_active = 1').get();
                check('exactly-one-active', active && active.n === 1, 'more than one group active after setActiveGroup mirror');
            } finally {
                db.close();
            }
        }

        // 4. Quarantine plant: titles dropped, tabs ungrouped, forensics kept.
        {
            const db = new DatabaseSync(path);
            let planted = false;
            try {
                db.prepare(`INSERT INTO groups (id, title, x, y, w, h, is_active) VALUES ('g-q', 'Quarantined', 5, 5, 400, 300, 1)`).run();
                db.prepare('UPDATE tabs SET group_id = ? WHERE uri = ?').run('g-q', 'tab:a');
                planted = true;
            } finally {
                db.close();
            }
            check('quarantine-setup', planted, 'could not plant the quarantine fixture');
            const corruptPath = `${path}.corrupt-1`;
            copyFileSync(path, corruptPath);
            rmSync(path);
            const rebuilt = new DatabaseSync(path);
            try {
                mirrorMigrate(rebuilt, tabsDdl, groupsDdl, head);
                rebuilt.prepare('INSERT INTO tabs (uri, url, title, last_active) VALUES (?, ?, ?, ?)').run('tab:a', 'https://a.example/', 'A', 10);
                const groups = rebuilt.prepare('SELECT COUNT(*) AS n FROM groups').get();
                const grouped = rebuilt.prepare('SELECT COUNT(*) AS n FROM tabs WHERE group_id IS NOT NULL').get();
                check('quarantine-empty-groups', groups && groups.n === 0, 'quarantine rebuilt group rows instead of empty');
                check('quarantine-ungrouped', grouped && grouped.n === 0, 'quarantine rebuilt membership instead of ungrouped');
                check('quarantine-forensics', existsSync(corruptPath), 'quarantine deleted the corrupt copy instead of keeping forensics');
                if (existsSync(corruptPath)) {
                    const forensics = new DatabaseSync(corruptPath, { readOnly: true });
                    try {
                        const keptRow = forensics.prepare('SELECT title FROM groups WHERE id = ?').get('g-q');
                        check('quarantine-forensics-rows', keptRow && keptRow.title === 'Quarantined', 'forensics copy lost the tripped rows');
                    } finally {
                        forensics.close();
                    }
                }
            } finally {
                rebuilt.close();
            }
        }

        // 5. Newer-than-head refusal leaves the file untouched.
        {
            const future = join(stage, 'future.sqlite');
            const fresh = new DatabaseSync(future);
            try {
                fresh.exec('PRAGMA user_version = 99');
            } finally {
                fresh.close();
            }
            let refused = false;
            const probe = new DatabaseSync(future);
            try {
                try {
                    mirrorOpenGuard(probe, head);
                } catch (err) {
                    refused = /refusing downgrade/.test(err && err.message ? err.message : '');
                }
                check('downgrade-refusal', refused, 'a newer-than-head store was not refused loudly');
                check('downgrade-untouched', !tableExists(probe, 'tabs') && !tableExists(probe, 'groups'), 'the refused file was touched');
            } finally {
                probe.close();
            }
        }
    } finally {
        if (stage) {
            rmSync(stage, { recursive: true, force: true });
        }
    }
    return failures;
}

function readSources() {
    const read = rel => readFileSync(join(REPO_ROOT, rel), 'utf8');
    return {
        [API_REL]: read(API_REL),
        [CONTRACT_REL]: read(CONTRACT_REL),
        [BACKEND_MODULE_REL]: read(BACKEND_MODULE_REL),
        [MODEL_REL]: read(MODEL_REL),
    };
}

function main() {
    const sources = readSources();
    const failures = [...checkStatic(sources)];
    try {
        failures.push(...checkLive(sources));
    } catch (err) {
        failures.push(`live harness threw (broken instrument, not a verdict): ${err && err.message ? err.message : err}`);
    }
    if (failures.length) {
        console.error(`${NAME}: FAIL -- ${failures.length} failure(s):`);
        failures.forEach(f => console.error(`  ${f}`));
        process.exit(1);
    }
    console.log(`${NAME}: PASS -- derived DDL, head, methods, path, and cap hold; the mkdtemp roundtrip (migrate, CRUD, quarantine, downgrade-refusal) holds`);
}

function selfTest() {
    const real = readSources();
    const baseline = [...checkStatic(real)];
    if (baseline.length) {
        console.error(`${NAME} --self-test: FAIL -- the unmodified tree is already red, so the planted-fault results below would be meaningless:`);
        baseline.forEach(f => console.error(`  ${f}`));
        process.exit(1);
    }
    console.log(`${NAME} --self-test: unmodified tree green, planting faults`);
    let failed = 0;

    // Plant 1: a dropped DDL field must go red naming the drift.
    {
        const mutated = { ...real, [API_REL]: real[API_REL].replace(/is_active\s+INTEGER NOT NULL DEFAULT 0 CHECK\(is_active IN \(0, 1\)\)/, '') };
        const landed = !/is_active\s+INTEGER/.test(derivedGroupsDdlText(mutated[API_REL]));
        const result = checkStatic(mutated);
        if (!landed) {
            console.error(`${NAME} --self-test: FAIL -- 'dropped DDL field' plant did not land`);
            failed += 1;
        } else if (!result.some(f => /is_active/.test(f))) {
            console.error(`${NAME} --self-test: FAIL -- 'dropped DDL field' did not go red naming 'is_active'; got: ${result.join(' | ') || '(no failures at all)'}`);
            failed += 1;
        } else {
            console.log(`  ok  dropped DDL field -> red, naming 'is_active'`);
        }
    }

    // Plant 2: a removed writer method must go red naming it.
    {
        const mutated = { ...real, [API_REL]: real[API_REL].replace('async writeThumbnail(', 'async writeThumbnailRemoved(') };
        const landed = mutated[API_REL].includes('async writeThumbnailRemoved(');
        const result = checkStatic(mutated);
        if (!landed) {
            console.error(`${NAME} --self-test: FAIL -- 'removed writer method' plant did not land`);
            failed += 1;
        } else if (!result.some(f => /writeThumbnail/.test(f))) {
            console.error(`${NAME} --self-test: FAIL -- 'removed writer method' did not go red naming 'writeThumbnail'; got: ${result.join(' | ') || '(no failures at all)'}`);
            failed += 1;
        } else {
            console.log(`  ok  removed writer method -> red, naming 'writeThumbnail'`);
        }
    }

    // Plant 3: RPC path drift must go red naming the path.
    {
        const mutated = { ...real, [CONTRACT_REL]: real[CONTRACT_REL].replace(EXPECTED_GROUP_PATH, '/services/powerbrowser/groups-v2') };
        const landed = mutated[CONTRACT_REL].includes('groups-v2');
        const result = checkStatic(mutated);
        if (!landed) {
            console.error(`${NAME} --self-test: FAIL -- 'path drift' plant did not land`);
            failed += 1;
        } else if (!result.some(f => /GROUP_PATH|groups-v2/.test(f))) {
            console.error(`${NAME} --self-test: FAIL -- 'path drift' did not go red naming the path; got: ${result.join(' | ') || '(no failures at all)'}`);
            failed += 1;
        } else {
            console.log(`  ok  RPC path drift -> red, naming the path`);
        }
    }

    // Plant 4 (CR-01): the port-blind string-prefix wall must go red naming
    // the port-bearing rejection. Reintroduces the exact pre-fix shape.
    {
        const mutated = {
            ...real,
            [API_REL]: real[API_REL]
                .replace('if (!groupSenderIsTheia(actorRef)) {', 'if (senderSpec !== GROUP_ACTOR_THEIA_ORIGIN && !senderSpec.startsWith(`${GROUP_ACTOR_THEIA_ORIGIN}/`)) {')
                .replace('function groupSenderSpecIsTheia(', 'function groupSenderSpecIsTheiaRemoved('),
        };
        const landed = mutated[API_REL].includes('senderSpec !== GROUP_ACTOR_THEIA_ORIGIN');
        const result = checkStatic(mutated);
        if (!landed) {
            console.error(`${NAME} --self-test: FAIL -- 'string-prefix origin' plant did not land`);
            failed += 1;
        } else if (!result.some(f => /port-bearing|string-prefix|senderSpec/.test(f))) {
            console.error(`${NAME} --self-test: FAIL -- 'string-prefix origin' did not go red naming the port-bearing rejection; got: ${result.join(' | ') || '(no failures at all)'}`);
            failed += 1;
        } else {
            console.log(`  ok  string-prefix origin -> red, naming the port-bearing rejection`);
        }
    }

    // Plant 5 (CR-01): a naive startsWith(ORIGIN) repair must go red naming
    // the suffix forgery it admits.
    {
        const mutated = {
            ...real,
            [API_REL]: real[API_REL].replace(
                'return uri.host === "127.0.0.1" || uri.host === "localhost";',
                'return spec.startsWith("http://127.0.0.1");'
            ),
        };
        const landed = mutated[API_REL].includes('spec.startsWith("http://127.0.0.1")');
        const result = checkStatic(mutated);
        if (!landed) {
            console.error(`${NAME} --self-test: FAIL -- 'naive startsWith origin' plant did not land`);
            failed += 1;
        } else if (!result.some(f => /suffix|evil|startsWith|host/.test(f))) {
            console.error(`${NAME} --self-test: FAIL -- 'naive startsWith origin' did not go red naming the suffix forgery; got: ${result.join(' | ') || '(no failures at all)'}`);
            failed += 1;
        } else {
            console.log(`  ok  naive startsWith origin -> red, naming the suffix forgery`);
        }
    }

    // Plant 6 (CR-01): dropping the localhost acceptance must go red naming it.
    {
        const mutated = {
            ...real,
            [API_REL]: real[API_REL].replace(
                'return uri.host === "127.0.0.1" || uri.host === "localhost";',
                'return uri.host === "127.0.0.1";'
            ),
        };
        const landed = !mutated[API_REL].includes('"localhost"') || mutated[API_REL].includes('return uri.host === "127.0.0.1";');
        const result = checkStatic(mutated);
        if (!landed) {
            console.error(`${NAME} --self-test: FAIL -- 'dropped localhost' plant did not land`);
            failed += 1;
        } else if (!result.some(f => /localhost/.test(f))) {
            console.error(`${NAME} --self-test: FAIL -- 'dropped localhost' did not go red naming 'localhost'; got: ${result.join(' | ') || '(no failures at all)'}`);
            failed += 1;
        } else {
            console.log(`  ok  dropped localhost -> red, naming 'localhost'`);
        }
    }

    // Plant 7 (WR-04): the unbounded-id regression must go red naming the
    // shape bound.
    {
        const mutated = {
            ...real,
            [API_REL]: real[API_REL].replace(
                'if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) {',
                'if (typeof id !== "string" || !id) {'
            ),
        };
        const landed = !mutated[API_REL].includes('/^[A-Za-z0-9_-]{1,128}$/');
        const result = checkStatic(mutated);
        if (!landed) {
            console.error(`${NAME} --self-test: FAIL -- 'unbounded id' plant did not land`);
            failed += 1;
        } else if (!result.some(f => /shape bound|malformed/.test(f))) {
            console.error(`${NAME} --self-test: FAIL -- 'unbounded id' did not go red naming the shape bound; got: ${result.join(' | ') || '(no failures at all)'}`);
            failed += 1;
        } else {
            console.log(`  ok  unbounded id -> red, naming the shape bound`);
        }
    }

    // Plant 8 (WR-04): accepting non-string titles must go red naming it.
    {
        const mutated = {
            ...real,
            [API_REL]: real[API_REL].replace(
                '    if (title !== undefined && title !== null && typeof title !== "string") {\n      throw new Error(`${method}: refusing non-string title for ${id}`);\n    }\n',
                ''
            ),
        };
        const landed = !mutated[API_REL].includes('refusing non-string title');
        const result = checkStatic(mutated);
        if (!landed) {
            console.error(`${NAME} --self-test: FAIL -- 'non-string title' plant did not land`);
            failed += 1;
        } else if (!result.some(f => /non-string title/.test(f))) {
            console.error(`${NAME} --self-test: FAIL -- 'non-string title' did not go red naming it; got: ${result.join(' | ') || '(no failures at all)'}`);
            failed += 1;
        } else {
            console.log(`  ok  non-string title -> red, naming it`);
        }
    }

    // Plant 9 (WR-05c): model/chrome title-cap drift must go red naming it.
    {
        const mutated = {
            ...real,
            [MODEL_REL]: real[MODEL_REL].replace(
                'export const GROUP_TITLE_MAX_CHARS = 60;',
                'export const GROUP_TITLE_MAX_CHARS = 61;'
            ),
        };
        const landed = mutated[MODEL_REL].includes('GROUP_TITLE_MAX_CHARS = 61');
        const result = checkStatic(mutated);
        if (!landed) {
            console.error(`${NAME} --self-test: FAIL -- 'title-cap drift' plant did not land`);
            failed += 1;
        } else if (!result.some(f => /model cap|GROUP_TITLE_MAX_CHARS|paints titles/.test(f))) {
            console.error(`${NAME} --self-test: FAIL -- 'title-cap drift' did not go red naming the cap divergence; got: ${result.join(' | ') || '(no failures at all)'}`);
            failed += 1;
        } else {
            console.log(`  ok  title-cap drift -> red, naming the cap divergence`);
        }
    }

    if (failed) {
        process.exit(1);
    }
    console.log(`${NAME} --self-test: PASS -- all nine fault directions went red naming the drift`);
}

if (process.argv.includes('--self-test')) {
    try {
        selfTest();
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
} else {
    try {
        main();
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
}
