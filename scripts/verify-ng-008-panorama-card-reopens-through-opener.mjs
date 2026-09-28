#!/usr/bin/env node
// scripts/verify-ng-008-panorama-card-reopens-through-opener.mjs -- NG-008
// (non-GUI wave A): after a restart, a Panorama card for a tab that is not
// open reopens that tab through the opener, on the card's own row; a card for
// an open tab activates it and opens nothing.

import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { newProfile, runCheck, show, sleep, tabsOf, waitUntil, withShellQuit } from './lib/ng-a-live.mjs';

await runCheck('verify-ng-008-panorama-card-reopens-through-opener', async ({ pages, expect, failures }) => {
    const profile = newProfile('ng008');
    const a = pages.url('/a');
    const first = await withShellQuit(profile, async ({ run }) => {
        const out = await run(`
            const web = await A.open(${JSON.stringify(a)});
            const term = await A.open('terminal:ng008', { widgetOptions: { area: 'main' } });
            await A.sleep(1500);
            const group = await A.model().createGroup(A.actor(), { x: 40, y: 40 });
            await A.model().moveCard(A.actor(), await A.cardKey(web), group.id);
            await A.model().moveCard(A.actor(), await A.cardKey(term), group.id);
            return { group: group.id, port: location.port };
        `);
        await waitUntil(() => tabsOf(profile).some(r => r.url === a && r.group_id === out.group), 15000);
        await sleep(1500);
        return out;
    });
    const webRow = tabsOf(profile).find(r => r.url === a && r.group_id === first.group);
    if (!webRow) {
        failures.push(`setup: the web tab on ${a} never got a grouped row; rows: ${show(tabsOf(profile))}`);
        return;
    }
    // The relaunch starts with no saved session (a quit that saved none): the shell state and web-tab history go, tabs.sqlite stays.
    if (!existsSync(join(profile, 'powerbrowser-shell-state.json'))) failures.push('setup: the quit wrote no powerbrowser-shell-state.json');
    for (const file of ['powerbrowser-shell-state.json', 'powerbrowser-web-tab-history.json']) rmSync(join(profile, file), { force: true });
    const second = await withShellQuit(profile, async ({ run }) => run(`
        const webKey = ${JSON.stringify(webRow.uri)};
        const pageUrl = ${JSON.stringify(a)};
        const cardFor = key => document.querySelector('.pb-org-card[data-u="' + CSS.escape(key) + '"]');
        const dbl = el => el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
        await A.organising();
        const report = { port: location.port, webCard: !!cardFor(webKey), termCard: !!cardFor('terminal:ng008') };
        if (report.webCard) {
            report.webOpenBefore = A.webTabs().filter(w => w.url === pageUrl).length;
            dbl(cardFor(webKey));
            await A.sleep(3000);
            const open = A.webTabs().filter(w => w.url === pageUrl);
            report.webOpen = open.length;
            report.webKey = open.length ? open[0].rowKey || null : null;
        }
        if (report.termCard) {
            await A.organising();
            report.termOpenBefore = A.mainWidgets().some(w => A.registry().uriOf(w)?.toString(true) === 'terminal:ng008');
            dbl(cardFor('terminal:ng008'));
            const termUp = () => A.mainWidgets().some(w => {
                const address = A.registry().uriOf(w);
                return !!address && address.toString(true) === 'terminal:ng008';
            });
            for (let i = 0; i < 40 && !termUp(); i++) await A.sleep(250);
            report.termOpen = termUp();
        }
        if (report.webCard) {
            await A.organising();
            const panel = A.shell().mainPanel;
            const activated = [];
            const onActivated = (_, w) => activated.push(w);
            panel.widgetActivated.connect(onActivated);
            dbl(cardFor(webKey));
            for (let i = 0; i < 40 && !activated.some(w => w.url === pageUrl); i++) await A.sleep(250);
            await A.sleep(1500); // settle kept on purpose: a late duplicate from a reopen-instead-of-activate bug must be counted
            panel.widgetActivated.disconnect(onActivated);
            const open = A.webTabs().filter(w => w.url === pageUrl);
            report.webOpenAgain = open.length;
            const web = open[0];
            const bar = web ? A.shell().mainAreaTabBars.find(b => b.titles.includes(web.title)) : undefined;
            report.activated = open.length === 1 && activated.length > 0 && activated[activated.length - 1] === web
                && panel.currentTitle === web.title && !!bar && bar.currentTitle === web.title && web.isVisible;
            report.activatedIds = activated.map(w => w.id);
            const cur = A.shell().currentWidget;
            report.shellCurrent = cur ? cur.id : null; // recorded, not asserted: WebTabWidget takes no DOM focus on activate (UI-SPEC A14)
        }
        return report;
    `));
    expect(first.port !== second.port, `the backend port did not change between launches (${first.port})`);
    expect(second.webCard, `after the restart Panorama shows no card for the web tab that is not open (${webRow.uri})`);
    expect(second.termCard, 'after the restart Panorama shows no card for the terminal that is not open (terminal:ng008)');
    expect(!second.webCard || second.webOpenBefore === 0, `the web card ${webRow.uri} is not for a tab that is not open: ${second.webOpenBefore} tab(s) on ${a} were open before the double-click`);
    expect(!second.termCard || !second.termOpenBefore, 'the terminal card terminal:ng008 is not for a tab that is not open: terminal:ng008 was open before the double-click');
    expect(second.webOpen === 1, `double-clicking the web card opened ${second.webOpen} tab(s) on ${a}, want 1`);
    expect(second.webKey === webRow.uri, `the reopened web tab writes row ${second.webKey}, not the card's row ${webRow.uri}`);
    expect(second.termOpen, 'double-clicking the terminal card did not reopen terminal:ng008');
    expect(second.webOpenAgain === 1 && second.activated, `double-clicking the card of the now-open web tab opened another tab or did not activate it (tabs ${second.webOpenAgain}, activated ${second.activated})`);
    const rows = tabsOf(profile).filter(r => r.url === a || r.url === pages.url('/b'));
    expect(rows.length === 1, `reopening created a second row for ${a}: ${show(rows)}`);
});
