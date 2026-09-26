#!/usr/bin/env node
// scripts/verify-ng-010-closed-tab-history.mjs -- NG-010 (non-GUI wave A):
// closing a tab keeps its row as closed-tab history; a rebuild from
// sessionstore re-projects its _closedTabs; and closed_retention_days decides
// what the prune deletes.

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { newProfile, runCheck, show, sleep, tabsOf, waitUntil, withShell } from './lib/ng-a-live.mjs';
import { buildStore, plantIndexMismatch, schemaHead } from './lib/tab-store-fixtures.mjs';

await runCheck('verify-ng-010-closed-tab-history', async ({ pages, expect, failures }) => {
    const head = schemaHead();
    // 1. History on close, and a rebuild from sessionstore that projects _closedTabs.
    const profile = newProfile('ng010');
    const dbPath = join(profile, 'tabs.sqlite');
    buildStore(dbPath, head, {
        tabs: [{ uri: 'terminal:ng010-seed', url: '', title: 'seed', last_active: 77 }],
        settings: { integrity_check_minutes: '0.25' },
    });
    plantIndexMismatch(dbPath);
    const [s1, s2] = ['/s1', '/s2'].map(p => pages.url(p));
    await withShell(profile, async ({ run, topLevelContexts, send }) => {
        await run(`
            await A.mutate({ kind: 'openStockTab', url: ${JSON.stringify(s1)} });
            await A.sleep(1000);
            await A.mutate({ kind: 'openStockTab', url: ${JSON.stringify(s2)} });
        `);
        const s1Row = await waitUntil(() => tabsOf(profile).find(r => r.url === s1), 15000);
        const ctx = (await topLevelContexts()).find(x => x.url === s1);
        if (!s1Row || !ctx) {
            failures.push(`setup: the stock tab on ${s1} has no row or no context`);
            return;
        }
        await send('browsingContext.close', { context: ctx.context });
        await sleep(2500);
        const closed = tabsOf(profile).find(r => r.uri === s1Row.uri);
        expect(closed && Number.isInteger(closed.closed_at), `closing the stock tab on ${s1} did not keep its row as history: ${JSON.stringify(closed)}`);
        const rebuilt = await waitUntil(() => existsSync(`${dbPath}.corrupt-1`), 60000);
        expect(rebuilt, 'the store was never rebuilt from sessionstore (the scheduled integrity check never quarantined it)');
        await sleep(3000);
        const after = tabsOf(profile).find(r => r.uri === s1Row.uri);
        expect(after && Number.isInteger(after.closed_at), `after the rebuild from sessionstore the closed tab ${s1Row.uri} is not in the store as history, so _closedTabs was not projected: ${JSON.stringify(after)}`);
    });
    // 2. Retention is a setting.
    const retained = newProfile('ng010-retention');
    const day = 86400000;
    const now = Date.now();
    buildStore(join(retained, 'tabs.sqlite'), head, {
        tabs: [
            { uri: 'stock:ng010-old', url: 'https://old.example/', title: 'old', last_active: now, closed_at: now - 2 * day },
            { uri: 'stock:ng010-recent', url: 'https://recent.example/', title: 'recent', last_active: now, closed_at: now - 3600000 },
        ],
        settings: { closed_retention_days: '1' },
    });
    await withShell(retained, async ({ run }) => {
        await run(`await A.mutate({ kind: 'openStockTab', url: ${JSON.stringify(pages.url('/s3'))} });`);
        await sleep(6000);
    });
    const rows = tabsOf(retained);
    expect(!rows.some(r => r.uri === 'stock:ng010-old'), `a row closed two days ago survived a one-day closed_retention_days: ${show(rows)}`);
    expect(rows.some(r => r.uri === 'stock:ng010-recent'), `a row closed an hour ago was pruned under a one-day closed_retention_days: ${show(rows)}`);
});
