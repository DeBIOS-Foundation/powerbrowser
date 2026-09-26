#!/usr/bin/env node
// scripts/verify-ng-005-prune-keeps-open-rows.mjs -- NG-005 (non-GUI wave A):
// the sweep's prune never deletes the row of an open tab. A v4 store keys the
// in-shell tab on /hang by its URL, grouped and last written long ago; the tab
// is open (its page never answers, so no navigation refreshes the row) while
// sessionstore writes drive the sweep. The open tab's own row, web:<tabId>,
// must be there and open (the seeded row alone migrates to web:legacy-1, so
// it cannot stand in for it), and the seeded grouped row must survive.

import { join } from 'node:path';
import { newProfile, runCheck, show, sleep, tabsOf, withShell } from './lib/ng-a-live.mjs';
import { buildStore } from './lib/tab-store-fixtures.mjs';

await runCheck('verify-ng-005-prune-keeps-open-rows', async ({ pages, expect }) => {
    const profile = newProfile('ng005');
    const hang = pages.url('/hang');
    buildStore(join(profile, 'tabs.sqlite'), 4, {
        groups: [{ id: 'g-ng005', title: 'Kept', x: 10, y: 10, w: 400, h: 300, is_active: 0 }],
        tabs: [{ uri: hang, url: hang, title: 'hang', last_active: 1, group_id: 'g-ng005' }],
    });
    await withShell(profile, async ({ run }) => {
        const out = await run(`
            await A.mutate({ kind: 'openStockTab', url: ${JSON.stringify(pages.url('/s1'))} });
            // Resolves once the tab exists; its page never answers.
            const web = await A.open(${JSON.stringify(hang)});
            await A.sleep(2000);
            await A.mutate({ kind: 'openStockTab', url: ${JSON.stringify(pages.url('/s2'))} });
            return { tabId: web.tabId };
        `);
        // Several sessionstore writes, each followed by the sweep and its prune.
        await sleep(8000);
        const rows = tabsOf(profile);
        const own = `web:${out.tabId}`;
        expect(rows.some(r => r.uri === own && r.closed_at == null), `the open in-shell tab on ${hang} has no open row ${own}: it was pruned or never written; rows: ${show(rows)}`);
        expect(rows.some(r => r.group_id === 'g-ng005'), `the seeded grouped row (group g-ng005, last written long ago) was pruned; rows: ${show(rows)}`);
        expect(rows.some(r => r.url === pages.url('/s1')), `the open stock tab's row was pruned; rows: ${show(rows)}`);
    });
});
