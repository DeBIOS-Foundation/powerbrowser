#!/usr/bin/env node
// scripts/verify-ng-088-group-order-across-restart.mjs -- NG-088 (Phase 20,
// PLAT-03; tab store schema v4, ord, landed in 7b7a1f7): a group's card order
// set by hand survives a quit and relaunch, and the reader returns the group's
// tabs in that order. Runs the real writer (PowerBrowserAPI.sys.mjs over
// node:sqlite, through lib/tab-store-fakes.mjs) on a group of terminal, web
// and terminal tabs, sets an order that is not URI order through the
// setGroupOrder kind, restarts the writer, re-tracks the Theia tabs the way the
// runtime does, and reads with the getGroupTabs SQL taken from
// tab-query-service.ts at check time.
//
//   node scripts/verify-ng-088-group-order-across-restart.mjs              # the tree
//   node scripts/verify-ng-088-group-order-across-restart.mjs --at <rev>   # writer and reader at <rev>
//   node scripts/verify-ng-088-group-order-across-restart.mjs --self-test  # plants
//
// Exit 0 PASS, 1 red, 2 broken instrument (a git show failure or a reader SQL
// that cannot be found is never a valid red).

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { REPO_ROOT } from './lib/tab-store-fixtures.mjs';
import { closeAll, freshApi, report } from './lib/tab-store-fakes.mjs';

const LABEL = 'ng088-group-order-across-restart';
const WRITER = 'powerbrowser/shell/PowerBrowserAPI.sys.mjs';
const READER = 'theia/extensions/tab-uris/src/node/tab-query-service.ts';
const PORT = 3939; // the fake sender's port; nothing listens on it
const GROUP = 'ng088-g1';
const TERM_A = 'terminal:ng088-a';
const TERM_B = 'terminal:ng088-b';
const WEB = 'web:wt-ng088-1';
// Neither URI order (a, b, web) nor its reverse: a reader or writer that falls
// back to either cannot pass by accident.
const HAND = [TERM_B, WEB, TERM_A];

class Instrument extends Error {}

// The shell's own frame on the sidecar's port, as TheiaService._swap admits it.
const shellFrame = { id: 'powerbrowser-content', ownerDocument: { documentURI: 'chrome://powerbrowser/content/powerbrowser.xhtml' }, getAttribute: () => 'true' };
const theia = { browsingContext: { currentWindowGlobal: { documentURI: { spec: `http://127.0.0.1:${PORT}/`, port: PORT } }, top: { embedderElement: shellFrame } } };

function readerSql(text, method) {
    const m = new RegExp(`async ${method}\\([^)]*\\)[\\s\\S]*?prepare\\(\\s*'([^']+)'`).exec(text);
    if (!m) {
        throw new Instrument(`the ${method} SQL was not found in ${READER}`);
    }
    return m[1];
}

async function run(writerPath, readerText) {
    const groupSql = readerSql(readerText, 'getGroupTabs');
    const failures = [];
    const profile = mkdtempSync(join(tmpdir(), 'ng088-'));
    const read = () => {
        const db = new DatabaseSync(join(profile, 'tabs.sqlite'), { readOnly: true });
        try {
            return db.prepare(groupSql).all(GROUP).map(row => row.uri);
        } finally {
            db.close();
        }
    };
    const start = async () => {
        const api = await freshApi(profile, writerPath);
        await api.ensureTabStore();
        // setGroupSenderPort is absent at b9412fa, whose sender wall has no port check.
        if (typeof api.setGroupSenderPort === 'function') {
            api.setGroupSenderPort(PORT);
        }
        const mutate = async data => {
            const reply = await api.handleGroupMutation(data, theia);
            if (!reply.ok) {
                throw new Error(`${data.kind} refused by the writer: ${reply.message}`);
            }
        };
        return { api, mutate };
    };
    const expectOrder = stage => {
        const got = read();
        if (JSON.stringify(got) !== JSON.stringify(HAND)) {
            failures.push(`${stage} the group reader (getGroupTabs) returned [${got.join(', ')}], expected [${HAND.join(', ')}]`);
        }
    };
    try {
        let { api, mutate } = await start();
        await api.writeTabRow({ uri: TERM_A, url: '', title: 'A' });
        await api.writeTabRow({ uri: WEB, url: 'https://g.example/', title: 'W' });
        await api.writeTabRow({ uri: TERM_B, url: '', title: 'B' });
        await mutate({ kind: 'createGroup', id: GROUP, title: 'G' });
        for (const uri of [TERM_A, WEB, TERM_B]) {
            await mutate({ kind: 'setTabGroup', uri, groupId: GROUP });
        }
        await mutate({ kind: 'setGroupOrder', groupId: GROUP, uris: HAND });
        expectOrder('after setGroupOrder');

        await closeAll();
        ({ api, mutate } = await start());
        // The frontend re-tracks each Theia tab the way the runtime does, through trackTab.
        for (const uri of [TERM_A, TERM_B]) {
            await mutate({ kind: 'trackTab', uri, url: '', title: uri.slice(-1).toUpperCase() });
        }
        expectOrder('after restart and re-track');
    } catch (err) {
        if (err instanceof Instrument) {
            throw err;
        }
        failures.push(err && err.message ? err.message : String(err));
    } finally {
        await closeAll();
        rmSync(profile, { recursive: true, force: true });
    }
    return failures;
}

const PLANTS = [
    { name: '(a) setGroupOrder writes ord: uris.length - 1 - index', file: 'writer', from: '{ ord: index, uri: String(uris[index]), groupId }', to: '{ ord: uris.length - 1 - index, uri: String(uris[index]), groupId }', expect: /after setGroupOrder/ },
    { name: '(b) the group reader orders by uri', file: 'reader', from: 'ORDER BY ord IS NULL, ord, uri', to: 'ORDER BY uri', expect: /after setGroupOrder/ },
    { name: '(c) trackShellTab loses AND closed_at IS NOT NULL', file: 'writer', from: 'ord = NULL WHERE uri = :uri AND closed_at IS NOT NULL', to: 'ord = NULL WHERE uri = :uri', expect: /after restart and re-track/ },
];

/** The planted text, or null when the anchor is missing or not unique. */
function plant(text, p) {
    return text.split(p.from).length === 2 ? text.replace(p.from, p.to) : null;
}

function gitShow(rev, path) {
    const r = spawnSync('git', ['-C', REPO_ROOT, 'show', `${rev}:${path}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    if (r.status !== 0) {
        throw new Instrument(`git show ${rev}:${path} failed: ${r.stderr.trim()}`);
    }
    return r.stdout;
}

async function selfTest() {
    const writerText = readFileSync(join(REPO_ROOT, WRITER), 'utf8');
    const readerText = readFileSync(join(REPO_ROOT, READER), 'utf8');
    const misses = [];
    const clean = await run(join(REPO_ROOT, WRITER), readerText);
    if (clean.length) {
        misses.push(`the clean tree is red, so no plant can be judged: ${clean.join('; ')}`);
    }
    if (plant('', PLANTS[0]) !== null) {
        misses.push('a plant over text without its anchor did not report the anchor missing');
    }
    const stage = mkdtempSync(join(tmpdir(), 'ng088-plant-'));
    try {
        for (const [i, p] of PLANTS.entries()) {
            const planted = plant(p.file === 'writer' ? writerText : readerText, p);
            if (planted === null) {
                misses.push(`plant ${p.name}: anchor missing or not unique in ${p.file === 'writer' ? WRITER : READER}: ${p.from}`);
                continue;
            }
            let writerPath = join(REPO_ROOT, WRITER);
            if (p.file === 'writer') {
                writerPath = join(stage, `plant-${i}.sys.mjs`);
                writeFileSync(writerPath, planted);
            }
            const failures = await run(writerPath, p.file === 'reader' ? planted : readerText);
            if (!failures.some(f => p.expect.test(f))) {
                misses.push(`plant ${p.name}: not red as ${p.expect} (got: ${failures.join('; ') || 'PASS'})`);
            }
        }
    } finally {
        rmSync(stage, { recursive: true, force: true });
    }
    if (misses.length) {
        misses.forEach(m => report(`${LABEL}-self-test: FAIL -- ${m}`));
        process.exit(1);
    }
    console.log(`${LABEL}-self-test: PASS -- ${PLANTS.length} plants red`);
}

async function main() {
    const args = process.argv.slice(2);
    if (args[0] === '--self-test') {
        return selfTest();
    }
    let writerPath = join(REPO_ROOT, WRITER);
    let readerText;
    let where = 'the tree';
    let stage = null;
    if (args[0] === '--at') {
        const rev = args[1];
        if (!rev) {
            throw new Instrument('--at needs a revision');
        }
        where = `writer and reader at ${rev}`;
        stage = mkdtempSync(join(tmpdir(), 'ng088-at-'));
        writerPath = join(stage, 'PowerBrowserAPI.sys.mjs');
        writeFileSync(writerPath, gitShow(rev, WRITER));
        readerText = gitShow(rev, READER);
    } else {
        readerText = readFileSync(join(REPO_ROOT, READER), 'utf8');
    }
    try {
        const failures = await run(writerPath, readerText);
        if (failures.length) {
            report(`${LABEL}: FAIL (${where})`);
            failures.forEach(f => report(`  ${f}`));
            process.exit(1);
        }
        console.log(`${LABEL}: PASS -- ${where}: the hand order [${HAND.join(', ')}] (not URI order) comes back from the getGroupTabs SQL after setGroupOrder and after restart and re-track`);
    } finally {
        if (stage) {
            rmSync(stage, { recursive: true, force: true });
        }
    }
}

main().catch(err => {
    if (err instanceof Instrument) {
        report(`${LABEL}: FAIL -- broken instrument: ${err.message}`);
        process.exit(2);
    }
    report(`${LABEL}: FAIL -- ${err && err.stack ? err.stack : err}`);
    process.exit(1);
});
