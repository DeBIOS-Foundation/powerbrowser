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
