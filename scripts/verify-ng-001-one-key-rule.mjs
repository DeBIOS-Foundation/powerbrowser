#!/usr/bin/env node
// scripts/verify-ng-001-one-key-rule.mjs -- NG-001 (non-GUI wave A): every tab
// kind (in-shell web tab, stock tab, terminal, editor) is keyed by its
// identity, never its page URL, and no row is keyed on the webview: scheme.
// Live: the built binary and a built theia/ app, driven through the Theia
// frontend's services (scripts/lib/ng-a-live.mjs).

import { newProfile, runCheck, show, sleep, tabsOf, waitUntil, withShell } from './lib/ng-a-live.mjs';

await runCheck('verify-ng-001-one-key-rule', async ({ pages, expect }) => {
    const profile = newProfile('ng001');
    const a = pages.url('/a');
    const s = pages.url('/s');
    const seen = await withShell(profile, async ({ run }) => {
        const out = await run(`
            const web = await A.open(${JSON.stringify(a)});
            await A.mutate({ kind: 'openStockTab', url: ${JSON.stringify(s)} });
            const term = await A.open('terminal:ng001', { widgetOptions: { area: 'main' } });
            await A.get('CommandRegistry').executeCommand('workbench.action.files.newUntitledFile');
            await A.sleep(1000);
            const editor = A.mainWidgets().find(w => typeof w.getResourceUri === 'function'
                && String(w.getResourceUri()).startsWith('untitled:'));
            const group = await A.model().createGroup(A.actor(), { x: 40, y: 40 });
            const grouping = [];
            for (const [kind, w] of [['terminal', term], ['editor', editor]]) {
                if (w) {
                    const key = await A.cardKey(w);
                    const result = await A.outcome(() => A.model().moveCard(A.actor(), key, group.id));
                    grouping.push({ kind, key, result, inGroup: A.model().getTabs(group.id).some(t => t.uri === key) });
                }
            }
            return {
                webTabId: web.tabId,
                termKey: A.registry().uriOf(term).toString(true),
                editorKey: editor ? editor.getResourceUri().toString(true) : null,
                grouping,
            };
        `);
        await waitUntil(() => tabsOf(profile).some(r => r.url === a) && tabsOf(profile).some(r => r.url === s), 20000);
        await sleep(2000);
        return out;
    });
    const rows = tabsOf(profile);
    expect(seen.editorKey, 'no untitled editor opened, so the editor kind was not exercised');
    for (const g of seen.grouping) {
        expect(g.result.resolved && g.inGroup, `setup: grouping the ${g.kind} (card ${g.key}) failed: ${g.result.resolved ? 'the card is not in the group' : g.result.message}`);
    }
    expect(rows.some(r => r.uri === `web:${seen.webTabId}` && r.url === a), `the in-shell tab on ${a} has no row keyed web:${seen.webTabId}; rows: ${show(rows)}`);
    expect(rows.some(r => r.url === s && /^stock:/.test(r.uri)), `the stock tab on ${s} has no row keyed stock:<id>; rows: ${show(rows)}`);
    expect(rows.some(r => r.uri === seen.termKey), `the grouped terminal has no row keyed by its registry address ${seen.termKey}; rows: ${show(rows)}`);
    expect(rows.some(r => r.uri === seen.editorKey), `the grouped editor has no row keyed by its resource address ${seen.editorKey}; rows: ${show(rows)}`);
    expect(!rows.some(r => r.uri.startsWith('webview:')), `a row is keyed on the plugin-panel scheme webview:; rows: ${show(rows)}`);
    expect(!rows.some(r => /^https?:/.test(r.uri)), `a row is keyed by its page URL; rows: ${show(rows)}`);
});
