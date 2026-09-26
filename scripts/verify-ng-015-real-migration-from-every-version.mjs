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
// Every copy of the real store is private data: it is removed on every exit
// (never kept by PB_NG_KEEP_PROFILES), and no failure line prints its values.

import { copyFileSync, existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import { holdsPrivateData, newProfile, runCheck, sleep, withShell } from './lib/ng-a-live.mjs';
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

/**
 * Launches the built browser on a profile holding a copy of `fixturePath` and
 * compares the store before and after. With `privateData` (the real profile,
 * R7) the profile is marked private, rows are named by row_id and columns by
 * name, and no key, URL, title or thumbnail value is ever printed.
 */
async function exercise(label, fixturePath, { expect, failures }, { privateData = false } = {}) {
    const before = readStore(fixturePath);
    const profile = newProfile(`ng015-${label.replace(/[^A-Za-z0-9]/g, '')}`);
    if (privateData) {
        holdsPrivateData(profile);
    }
    copyStore(fixturePath, join(profile, 'tabs.sqlite'));
    await withShell(profile, async () => sleep(3000));
    const after = readStore(join(profile, 'tabs.sqlite'));
    const head = schemaHead();
    const name = old => (privateData ? `row_id ${old.row_id}` : `row ${old.uri}`);
    const detail = text => (privateData ? '' : ` (${text})`);
    expect(after.version === head, `${label}: the writer left tabs.sqlite at version ${after.version}, want the head ${head}`);
    expect(head > before.version, `${label}: the head (${head}) is not newer than the fixture's version ${before.version}, so no migration ran from it`);
    for (const old of before.tabs) {
        const now = after.tabs.find(r => r.row_id === old.row_id);
        if (!now) {
            failures.push(`${label}: ${name(old)} was removed during the launch, by the migration or by the sweep's prune`);
            continue;
        }
        const key = expectedKey(old.uri, old.row_id);
        expect(now.uri === key, `${label}: ${name(old)} is not keyed by the head's key rule${detail(`keyed ${now.uri}, want ${key}`)}`);
        for (const col of ['url', 'title', 'group_id', 'thumbnail', 'x', 'y', 'ord']) {
            if (col in old) {
                expect(now[col] === old[col], `${label}: ${name(old)} lost ${col}${detail(`${JSON.stringify(old[col])} -> ${JSON.stringify(now[col])}`)}`);
            }
        }
    }
    expect(JSON.stringify(after.groups) === JSON.stringify(before.groups), `${label}: the groups changed across the migration`);
}

/** Copies a store with its -wal and -shm (when present) byte for byte, never opening it, so a WAL's committed pages travel too. */
function copyStore(from, to) {
    for (const suffix of ['', '-wal', '-shm']) {
        if (existsSync(`${from}${suffix}`)) {
            copyFileSync(`${from}${suffix}`, `${to}${suffix}`);
        }
    }
    return to;
}

await runCheck(NAME, async ({ expect, failures }) => {
    // The stage takes the real profile's store (R7), so it is private from the start.
    const stage = holdsPrivateData(newStage('ng015'));
    const stageCopy = source => copyStore(source, join(stage, `given-${basename(source)}`));
    for (const version of SHIPPED_VERSIONS) {
        const path = join(stage, `tabs-v${version}.sqlite`);
        buildStore(path, version, SEED);
        await exercise(`v${version}`, path, { expect, failures });
    }
    await exercise('phase-11 tabs-v1.sqlite', stageCopy(PHASE11_FIXTURE), { expect, failures });
    const real = process.env.PB_REAL_PROFILE_FIXTURE;
    if (!real) {
        console.log(`${NAME}: notice -- PB_REAL_PROFILE_FIXTURE is not set; the real-profile fixture was skipped (decisions.md R7)`);
    } else if (!existsSync(real)) {
        failures.push(`PB_REAL_PROFILE_FIXTURE names ${real}, which does not exist`);
    } else {
        await exercise('real profile', stageCopy(real), { expect, failures }, { privateData: true });
    }
});
