#!/usr/bin/env node
// scripts/verify-ng-002-navigation-keeps-row.mjs -- NG-002 (non-GUI wave A): a
// link click keeps the tab's row -- its key, group, ord and thumbnail for a
// grouped tab, its canvas position for a loose one.

import { newProfile, runCheck, show, sleep, tabsOf, waitUntil, withShell } from './lib/ng-a-live.mjs';

await runCheck('verify-ng-002-navigation-keeps-row', async ({ pages, expect, failures }) => {
    const profile = newProfile('ng002');
    const a = pages.url('/a');
    const c = pages.url('/c');
    const b = pages.url('/b');
    let before;
    await withShell(profile, async ({ run, topLevelContexts, evaluateIn }) => {
        const out = await run(`
            const grouped = await A.open(${JSON.stringify(a)});
            // Loads while it is the visible tab, so the settle capture (network
            // STOP + 500ms) photographs a painted page.
            await A.sleep(2500);
            const loose = await A.open(${JSON.stringify(c)});
            await A.sleep(1500);
            const group = await A.model().createGroup(A.actor(), { x: 40, y: 40 });
            await A.model().moveCard(A.actor(), await A.cardKey(grouped), group.id);
            await A.model().placeCard(A.actor(), await A.cardKey(loose), 300, 200);
            return { group: group.id };
        `);
        before = await waitUntil(() => {
            const rows = tabsOf(profile);
            const g = rows.find(r => r.url === a && r.group_id === out.group);
            const l = rows.find(r => r.url === c && r.x === 300 && r.y === 200);
            return g && l && g.thumbnail ? { g, l, group: out.group } : undefined;
        }, 30000);
        if (!before) {
            failures.push(`setup: the grouped tab on ${a} (with a thumbnail) and the placed tab on ${c} never both had rows; rows: ${show(tabsOf(profile))}`);
            return;
        }
        for (const target of [a, c]) {
            const ctx = (await topLevelContexts()).find(x => x.url === target);
            if (!ctx) {
                failures.push(`no overlay context shows ${target}`);
                continue;
            }
            await evaluateIn(ctx.context, "document.getElementById('next').click(); true");
        }
        await waitUntil(() => tabsOf(profile).filter(r => r.url === b).length >= 2, 20000);
        await sleep(1500);
    });
    if (!before) {
        return;
    }
    const rows = tabsOf(profile);
    const g = rows.find(r => r.url === b && r.group_id === before.group);
    expect(g, `after a link click the tab that was in group ${before.group} has no row in that group; rows: ${show(rows)}`);
    if (g) {
        expect(g.uri === before.g.uri, `the grouped tab's row key changed on navigation (${before.g.uri} -> ${g.uri})`);
        expect(g.ord === before.g.ord, `the grouped tab's ord changed on navigation (${before.g.ord} -> ${g.ord})`);
        expect(!!g.thumbnail, 'the grouped tab lost its thumbnail on navigation');
    }
    expect(rows.some(r => r.url === b && r.x === 300 && r.y === 200), `after a link click the placed tab lost its canvas position (300, 200); rows: ${show(rows)}`);
    expect(!rows.some(r => r.url === a || r.url === c), `rows for the pages the tabs left still exist beside the navigated ones; rows: ${show(rows)}`);
});
