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
import { newProfile, removeProfiles, servePages, sleep, waitUntil, withShellQuit as withShell } from './lib/ng-a-live.mjs';
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
    const backup = body.indexOf('.backup(');
    const removal = body.indexOf('await IOUtils.remove(livePath);');
    const reopen = body.indexOf('TAB_STORE_FILE_NAME });');
    if (backup === -1 || removal === -1 || reopen === -1 || !(backup < removal && removal < reopen)) {
        fail('quarantine delete-then-rebuild order unlocatable in writer source (want .backup(, then await IOUtils.remove(livePath);, then the TAB_STORE_FILE_NAME reopen)');
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
