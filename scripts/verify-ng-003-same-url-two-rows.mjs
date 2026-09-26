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
