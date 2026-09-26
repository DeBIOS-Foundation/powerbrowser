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

import { copyFileSync, existsSync, rmSync, statSync } from 'node:fs';
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
    // The -wal (and -shm) travel with the file, so a staged WAL's committed pages are migrated too.
    for (const suffix of ['', '-wal', '-shm']) {
        if (existsSync(`${fixturePath}${suffix}`)) {
            copyFileSync(`${fixturePath}${suffix}`, join(profile, `tabs.sqlite${suffix}`));
        }
    }
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

/** Copies a store into the stage (its -wal and -shm too when the -wal is non-empty), never opening the original. */
function stageCopy(stage, source) {
    const copy = join(stage, `given-${basename(source)}`);
    copyFileSync(source, copy);
    if (existsSync(`${source}-wal`) && statSync(`${source}-wal`).size > 0) {
        for (const suffix of ['-wal', '-shm']) {
            if (existsSync(`${source}${suffix}`)) {
                copyFileSync(`${source}${suffix}`, `${copy}${suffix}`);
            }
        }
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
    // The stage holds a copy of the real profile's store (R7); it never outlives the run.
    rmSync(stage, { recursive: true, force: true });
}
if (failures.length) {
    console.error(`${NAME}: FAIL`);
    failures.forEach(f => console.error(`  ${f}`));
    process.exit(1);
}
console.log(`${NAME}: PASS -- the writer migrated v${SHIPPED_VERSIONS.join(', v')} and the given fixtures to the head, every row carried`);
