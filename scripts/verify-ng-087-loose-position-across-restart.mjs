#!/usr/bin/env node
// scripts/verify-ng-087-loose-position-across-restart.mjs -- NG-087 (Phase 20,
// PLAT-03; tab store schema v3, x and y, landed in 7b7a1f7): a tab placed loose
// on the Panorama canvas keeps its position across a quit and relaunch. Runs
// the real writer (PowerBrowserAPI.sys.mjs over node:sqlite, through
// lib/tab-store-fakes.mjs) and reads with the loose-tab SQL taken from
// tab-query-service.ts listUngroupedTabs at check time:
//   - a loose terminal row keeps (x, y) across a writer restart and re-track;
//   - a loose in-shell web tab's row becomes closed-tab history with (x, y)
//     kept, and reopening it through writeTabRow brings them back.
//
//   node scripts/verify-ng-087-loose-position-across-restart.mjs              # the tree
//   node scripts/verify-ng-087-loose-position-across-restart.mjs --at <rev>   # writer and reader at <rev>
//   node scripts/verify-ng-087-loose-position-across-restart.mjs --self-test  # plants
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

const LABEL = 'ng087-loose-position-across-restart';
const WRITER = 'powerbrowser/shell/PowerBrowserAPI.sys.mjs';
const READER = 'theia/extensions/tab-uris/src/node/tab-query-service.ts';
const PORT = 3939; // the fake sender's port; nothing listens on it
const TERM = 'terminal:ng087-t1';
const WEB = 'web:wt-ng087-1';
const WEB_URL = 'https://a.example/';

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
    const loose = readerSql(readerText, 'listUngroupedTabs');
    const failures = [];
    const profile = mkdtempSync(join(tmpdir(), 'ng087-'));
    const read = (sql, uri) => {
        const db = new DatabaseSync(join(profile, 'tabs.sqlite'), { readOnly: true });
        try {
            return db.prepare(sql).all().find(row => row.uri === uri);
        } finally {
            db.close();
        }
    };
    const at = row => (row ? `(${row.x}, ${row.y})` : '(no row)');
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
    try {
        let { api, mutate } = await start();
        await api.writeTabRow({ uri: TERM, url: '', title: 'T1' });
        await api.writeTabRow({ uri: WEB, url: WEB_URL, title: 'A' });
        await mutate({ kind: 'setTabPosition', uri: TERM, x: 40, y: 60 });
        await mutate({ kind: 'setTabPosition', uri: WEB, x: 300, y: 200 });
        let t = read(loose, TERM);
        let w = read(loose, WEB);
        if (!t || !('x' in t) || !('y' in t)) {
            failures.push(`the loose-tab reader SQL (listUngroupedTabs) does not select x and y: ${loose}`);
        }
        if (at(t) !== '(40, 60)' || at(w) !== '(300, 200)') {
            failures.push(`after setTabPosition the loose reader shows terminal ${at(t)} and web ${at(w)}, expected (40, 60) and (300, 200)`);
        }

        await closeAll();
        ({ api, mutate } = await start());
        t = read(loose, TERM);
        if (at(t) !== '(40, 60)') {
            failures.push(`after restart the loose terminal row reads ${at(t)}, expected (40, 60)`);
        }
        if (!loose.includes(' AND closed_at IS NULL')) {
            throw new Error(`the loose-tab reader SQL (listUngroupedTabs) does not exclude closed rows, so closed-tab history cannot be told from an open tab: ${loose}`);
        }
        // The same loose-tab read over closed rows: what closed-tab history keeps.
        const history = loose.replace(' AND closed_at IS NULL', ' AND closed_at IS NOT NULL');
        const open = read(loose, WEB);
        const kept = read(history, WEB);
        if (open || at(kept) !== '(300, 200)') {
            failures.push(`after restart the loose web row is not closed-tab history with (300, 200) kept: open ${at(open)}, history ${at(kept)}`);
        }
        // The frontend re-tracks a Theia tab the way the runtime does, through trackTab.
        await mutate({ kind: 'trackTab', uri: TERM, url: '', title: 'T1' });
        t = read(loose, TERM);
        if (at(t) !== '(40, 60)') {
            failures.push(`after re-track the loose terminal row reads ${at(t)}, expected (40, 60)`);
        }
        await api.writeTabRow({ uri: WEB, url: WEB_URL, title: 'A' });
        w = read(loose, WEB);
        if (at(w) !== '(300, 200)') {
            failures.push(`reopening the web row through writeTabRow brought back ${at(w)}, expected (300, 200)`);
        }
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
    { name: '(a) setTabPosition binds x: null, y: null', file: 'writer', from: 'x: clear ? null : clamp(x), y: clear ? null : clamp(y)', to: 'x: null, y: null', expect: /after setTabPosition/ },
    { name: '(b) closeEndedWebRows adds x = NULL, y = NULL', file: 'writer', from: "SET closed_at = :now WHERE closed_at IS NULL AND uri GLOB 'web:*' AND group_id IS NULL", to: "SET closed_at = :now, x = NULL, y = NULL WHERE closed_at IS NULL AND uri GLOB 'web:*' AND group_id IS NULL", expect: /closed-tab history/ },
    { name: '(c) trackShellTab loses AND closed_at IS NOT NULL', file: 'writer', from: 'ord = NULL WHERE uri = :uri AND closed_at IS NOT NULL', to: 'ord = NULL WHERE uri = :uri', expect: /after re-track/ },
    { name: '(d) the loose reader drops x, y', file: 'reader', from: 'thumbnail, x, y FROM tabs WHERE group_id IS NULL', to: 'thumbnail FROM tabs WHERE group_id IS NULL', expect: /does not select x and y/ },
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
    const stage = mkdtempSync(join(tmpdir(), 'ng087-plant-'));
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
        stage = mkdtempSync(join(tmpdir(), 'ng087-at-'));
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
        console.log(`${LABEL}: PASS -- ${where}: a loose terminal keeps (40, 60) across restart and re-track; a loose web row keeps (300, 200) as closed-tab history and gets it back on reopen (reads use the listUngroupedTabs SQL)`);
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
