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
