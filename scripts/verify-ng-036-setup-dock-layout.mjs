#!/usr/bin/env node
/**
 * NG-036 (full tier, live-clone lane): a setup records dock and split
 * positions, tab order across tab bars, and the mode of each window.
 * Evidence: one flat URI list per window plus one modeId
 * (setups-service.ts:538-564); notes/browser-window-model.md:41-43.
 *
 * Three web tabs arranged as two tab bars side by side -- [B, A] | [C] --
 * in Coding; Save Setup through the command registry; the stored row must
 * carry the split and the per-window mode. Then everything is merged into
 * one bar in another order and mode, and Restore Setup must bring back the
 * two bars in their order, each tab once, in Coding. Review Focus: a row
 * written before this wave (flat list, no dock, no per-window mode) still
 * restores.
 */
import { probe, runCheck, servePages, sourceConst, withShell } from './lib/pb-relaunch.mjs';

const LABEL = 'ng-036-setup-records-dock-layout';
const SETUPS_REL = 'theia/extensions/modes/src/browser/setups-commands.ts';
const SAVE_SETUP = sourceConst(SETUPS_REL, 'SETUPS_SAVE_COMMAND_ID');
const RESTORE = sourceConst(SETUPS_REL, 'SETUPS_RESTORE_COMMAND_ID');
const ACTIVATE = sourceConst('theia/extensions/modes/src/browser/modes-commands.ts', 'MODES_ACTIVATE_COMMAND_ID');

/** Tab lists of a stored dock node, left to right. */
function leafLists(node) {
    if (!node) {
        return [];
    }
    if (node.type === 'tabs') {
        return [node.tabs];
    }
    return (node.children || []).flatMap(leafLists);
}

await runCheck(LABEL, async ({ profile, fail, defer }) => {
    const pages = await servePages({ '/a': { title: 'A' }, '/b': { title: 'B' }, '/c': { title: 'C' }, '/d': { title: 'D' } });
    defer(pages.close);
    const [A, B, C, D] = ['/a', '/b', '/c', '/d'].map(pages.url);
    const expected = JSON.stringify([[B, A], [C]]);
    const seen = await withShell(profile, app => probe(app, `
        const [A, B, C, D] = ${JSON.stringify([A, B, C, D])};
        const appShell = get('ApplicationShell');
        const commands = get('CommandRegistry');
        const setups = get('SetupsService');
        const files = get('FileService');
        for (const url of [A, B, C]) {
            await get('WebTabOpenHandler').openUrl(url);
        }
        if (!(await until(() => [A, B, C].every(url => webTabs().some(tab => tab.url === url)), 20000))) {
            return { error: 'the three web tabs never loaded' };
        }
        const tab = url => webTabs().find(candidate => candidate.url === url);
        const bars = () => appShell.mainAreaTabBars
            .map(bar => Array.from(bar.titles).map(title => title.owner).filter(owner => webTabs().includes(owner)).map(owner => owner.url))
            .filter(list => list.length > 0);
        await appShell.addWidget(tab(C), { area: 'main', mode: 'split-right', ref: tab(A) });
        await appShell.addWidget(tab(B), { area: 'main', mode: 'tab-before', ref: tab(A) });
        await commands.executeCommand(${JSON.stringify(ACTIVATE)}, 'coding');
        await sleep(800);
        const arranged = bars();
        const input = get('QuickInputService');
        const original = input.input;
        input.input = async () => 'NG036';
        try {
            await commands.executeCommand(${JSON.stringify(SAVE_SETUP)});
        } finally {
            input.input = original;
        }
        const stored = JSON.parse((await files.read(setups.setupsUri)).value);
        const row = (stored.setups || []).find(entry => entry.name === 'NG036') || null;
        await appShell.addWidget(tab(C), { area: 'main', mode: 'tab-after', ref: tab(A) });
        await appShell.addWidget(tab(A), { area: 'main', mode: 'tab-before', ref: tab(B) });
        await commands.executeCommand(${JSON.stringify(ACTIVATE)}, 'browsing');
        await sleep(800);
        const merged = bars();
        await commands.executeCommand(${JSON.stringify(RESTORE)}, 'NG036');
        await sleep(2500);
        const restored = bars();
        const counts = [A, B, C].map(url => webTabs().filter(candidate => candidate.url === url).length);
        const perspective = get('PerspectiveService').getActivePerspectiveId();
        const legacyStore = {
            version: 1,
            lastSession: null,
            setups: [...(stored.setups || []), { name: 'NG036 Legacy', modeId: 'browsing', savedAt: '2026-09-25T00:00:00.000Z', windows: [{ x: 0, y: 0, width: 1280, height: 800, tabs: [D], activeTab: null }] }],
        };
        await files.write(setups.setupsUri, JSON.stringify(legacyStore));
        await until(() => setups.listRows().some(entry => entry.name === 'NG036 Legacy'), 10000);
        await commands.executeCommand(${JSON.stringify(RESTORE)}, 'NG036 Legacy');
        await until(() => webTabs().some(candidate => candidate.url === D), 15000);
        return { arranged, row, merged, restored, counts, perspective, legacyOnD: webTabs().filter(candidate => candidate.url === D).length };
    `));
    if (seen.error) {
        fail(`harness: ${seen.error}`);
        return;
    }
    if (JSON.stringify(seen.arranged) !== expected) {
        fail(`harness: the arrangement before saving is ${JSON.stringify(seen.arranged)}, not ${expected}`);
        return;
    }
    const core = seen.row && seen.row.windows && seen.row.windows[0];
    if (!core) {
        fail('Save Setup wrote no NG036 row');
        return;
    }
    if (core.modeId !== 'coding') {
        fail(`the saved core window carries mode ${JSON.stringify(core.modeId)}; the window was in 'coding'`);
    }
    const main = core.dock && core.dock.main;
    if (!main || main.type !== 'split' || main.orientation !== 'horizontal' || JSON.stringify(leafLists(main)) !== expected) {
        fail(`the saved row does not record the split and tab order: dock.main is ${JSON.stringify(main)}`);
    }
    if (seen.merged.length !== 1) {
        fail(`harness: merging the tabs left ${seen.merged.length} tab bars`);
        return;
    }
    if (JSON.stringify(seen.restored) !== expected) {
        fail(`Restore Setup produced tab bars ${JSON.stringify(seen.restored)}, not the saved ${expected}`);
    }
    if (seen.counts.some(count => count !== 1)) {
        fail(`after the restore the web-tab counts on A, B, C are ${seen.counts.join(', ')}; each must be 1`);
    }
    if (seen.perspective !== 'coding') {
        fail(`after the restore the mode is '${seen.perspective}', not the saved 'coding'`);
    }
    if (seen.legacyOnD !== 1) {
        fail(`a setup row written before this wave restored ${seen.legacyOnD} tab(s) on its one page`);
    }
});
