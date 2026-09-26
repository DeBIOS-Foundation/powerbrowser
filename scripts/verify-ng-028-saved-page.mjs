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
// does not exist answers, without a copy and without hanging; a 127.0.0.1 page in
// the selected stock tab cannot trigger a save. The positive control: the same
// savePageCopy message from the Theia frame is served, and the page's own
// request reaches chrome's handler for the kind. The row is read from a stage copy
// of tabs.sqlite in a mkdtemp directory, never from the profile file.

import { copyFileSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { GET_BY_NAME, actorRequest, actorRequestExpr, diCall, runCheck, servePages, shellContext, unanswered, until, waitTheiaReady, withProfile } from './lib/ng-b-live.mjs';

const NAME = 'ng-028-saved-page-copy';
const NONCE = `ng028${Date.now().toString(36)}`;
const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
// How long one save may take before the check calls it hung.
const SAVE_BUDGET_MS = 30000;

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
        await withProfile(pageUrl, async ({ evaluate, evaluateIn, topLevelContexts, profileDir }) => {
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
            // Started in one evaluation and read back by polling, so a save may
            // take longer than firefox-bidi's 20 s per-request limit.
            // Resolves { value } | { error } | { hung: true }.
            let saves = 0;
            const save = async uri => {
                const slot = JSON.stringify(`__ng028save${saves += 1}`);
                await evaluateIn(shell, `(() => { ${GET_BY_NAME}
                    window[${slot}] = null;
                    Promise.resolve()
                        .then(() => __getByName(window.theia.container, 'CommandRegistry').executeCommand('powerbrowser.tab.savePageCopy', ${JSON.stringify(uri)}))
                        .then(value => ({ value }), e => ({ error: String((e && e.message) || e) }))
                        .then(result => { window[${slot}] = JSON.stringify(result); });
                    return true;
                })()`);
                const text = await until(() => evaluateIn(shell, `window[${slot}]`), SAVE_BUDGET_MS);
                return text ? JSON.parse(text) : { hung: true };
            };
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
            const missing = await save(`unknown-${NONCE}`);
            if (missing.hung || (missing.value && missing.value.dir)) {
                failures.push(`a save for a tab that does not exist did not answer without a copy within ${SAVE_BUDGET_MS / 1000} s: ${JSON.stringify(missing)}`);
            }
            // The same message the hostile page sends below, from the shell frame: it
            // must be served, so the hostile refusal is the wall and not a missing kind.
            const saveMsg = { kind: 'savePageCopy', uri: tabUri };
            const own = await actorRequest(evaluateIn, shell, saveMsg, 15000);
            if (own.reply?.ok !== true || typeof own.reply.dir !== 'string') failures.push(`actor savePageCopy from the Theia frame answered ${JSON.stringify(own)}`);
            const hostile = JSON.parse(await evaluate(actorRequestExpr(saveMsg, 4000)));
            const silent = unanswered(hostile, 'savePageCopy');
            if (silent) failures.push(silent);
            if (hostile.reply?.ok === true) failures.push(`a 127.0.0.1 page in a stock tab triggered a save: ${JSON.stringify(hostile)}`);
        });
    } finally {
        await pages.close();
    }
    return failures;
});
