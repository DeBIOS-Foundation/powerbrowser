#!/usr/bin/env node
// scripts/verify-ng-004-new-tab-row-unknown-uri-error.mjs -- NG-004 (non-GUI
// wave A): a New Tab on the empty page has a row that setTabGroup,
// setGroupOrder and setTabPosition act on, and each of those mutations on a
// key with no row is refused naming the unknown tab.

import { newProfile, runCheck, show, sleep, tabsOf, withShell } from './lib/ng-a-live.mjs';

await runCheck('verify-ng-004-new-tab-row-unknown-uri-error', async ({ expect }) => {
    const profile = newProfile('ng004');
    await withShell(profile, async ({ run }) => {
        const out = await run(`
            const tab = await A.open('about:blank');
            await A.sleep(1000);
            const key = await A.cardKey(tab);
            const group = await A.model().createGroup(A.actor(), { x: 40, y: 40 });
            const missing = 'web:ng004-missing';
            return {
                key,
                group: group.id,
                results: {
                    group: await A.mutate({ kind: 'setTabGroup', uri: key, groupId: group.id }),
                    order: await A.mutate({ kind: 'setGroupOrder', groupId: group.id, uris: [key] }),
                    ungroup: await A.mutate({ kind: 'setTabGroup', uri: key, groupId: null }),
                    place: await A.mutate({ kind: 'setTabPosition', uri: key, x: 120, y: 80 }),
                    unknownPlace: await A.mutate({ kind: 'setTabPosition', uri: missing, x: 1, y: 1 }),
                    unknownOrder: await A.mutate({ kind: 'setGroupOrder', groupId: group.id, uris: [missing] }),
                    unknownGroup: await A.mutate({ kind: 'setTabGroup', uri: missing, groupId: group.id }),
                },
            };
        `);
        await sleep(1000);
        const rows = tabsOf(profile);
        const row = rows.find(r => r.uri === out.key);
        expect(row, `the New Tab (card key ${out.key}) has no row; rows: ${show(rows)}`);
        expect(row && row.url === '', `the New Tab's row carries url ${row && JSON.stringify(row.url)}, want the empty string`);
        for (const name of ['group', 'order', 'ungroup', 'place']) {
            expect(out.results[name].ok, `${name} on the New Tab was refused: ${out.results[name].message}`);
        }
        expect(row && row.x === 120 && row.y === 80, `setTabPosition did not place the New Tab: ${JSON.stringify(row)}`);
        for (const name of ['unknownPlace', 'unknownOrder', 'unknownGroup']) {
            const result = out.results[name];
            expect(!result.ok && /unknown tab/i.test(result.message), `${name} on a key with no row answered ${JSON.stringify(result)}, want a refusal naming the unknown tab`);
        }
    });
});
