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
 *
 * The live layout is read two ways: `bars()` (web tabs only, the harness
 * arrangement guard) and `full()` (web tabs plus the Welcome view, the
 * saved/restored contract -- audit 3.2). The split is sized 70/30 before
 * saving so the sizes assertion can tell a dropped restore from an equal
 * split; saved sizes come from the stored row, restored sizes from the live
 * layout. A second restore after closing one tab proves the reopen path.
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

/**
 * Split sizes are Lumino-normalised fractions of the available space (they
 * sum to 1), so an absolute per-element tolerance applies. 0.05 absorbs the
 * sub-pixel settle of BoxEngine.calc (0.01 px on a ~1000 px area is ~1e-5)
 * and any min-size nudge of plain web-tab bars, while a restore that drops
 * the sizes falls back to the default equal split [0.5, 0.5] -- 0.20 away
 * from the arranged [0.7, 0.3], four times the tolerance.
 */
function sizesClose(saved, restored, tolerance) {
    return Array.isArray(saved) && Array.isArray(restored) && saved.length === restored.length
        && saved.every((value, index) => typeof value === 'number' && typeof restored[index] === 'number'
            && Math.abs(value - restored[index]) <= tolerance);
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
        const wm = get('WidgetManager');
        const full = () => appShell.mainAreaTabBars
            .map(bar => Array.from(bar.titles).map(title => title.owner)
                .map(owner => webTabs().includes(owner) ? owner.url
                    : ((wm.getDescription(owner) || {}).factoryId === 'welcome' ? 'view:welcome' : null))
                .filter(uri => uri !== null))
            .filter(list => list.length > 0);
        const liveSizes = () => {
            const layout = appShell.mainPanel.saveLayout().main;
            return layout && layout.type === 'split-area' ? layout.sizes : null;
        };
        await appShell.addWidget(tab(C), { area: 'main', mode: 'split-right', ref: tab(A) });
        await appShell.addWidget(tab(B), { area: 'main', mode: 'tab-before', ref: tab(A) });
        await commands.executeCommand(${JSON.stringify(ACTIVATE)}, 'coding');
        await sleep(800);
        const sized = (() => {
            const layout = appShell.mainPanel.saveLayout().main;
            if (!layout || layout.type !== 'split-area') {
                return false;
            }
            const sizes = layout.sizes.map((_, index, all) => (index === 0 ? 0.7 : 0.3 / (all.length - 1)));
            appShell.mainPanel.restoreLayout({ main: { ...layout, sizes } });
            return true;
        })();
        await sleep(800);
        if (!sized) {
            return { error: 'the arranged layout has no split to size' };
        }
        const arranged = bars();
        const arrangedFull = full();
        const arrangedSizes = liveSizes();
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
        const restoredFull = full();
        const restoredSizes = liveSizes();
        const counts = [A, B, C].map(url => webTabs().filter(candidate => candidate.url === url).length);
        const perspective = get('PerspectiveService').getActivePerspectiveId();
        tab(C).close();
        if (!(await until(() => !webTabs().some(candidate => candidate.url === C), 10000))) {
            return { error: 'the closed tab never went away' };
        }
        await commands.executeCommand(${JSON.stringify(RESTORE)}, 'NG036');
        await sleep(2500);
        const reopenBars = bars();
        const reopenFull = full();
        const reopenCounts = [A, B, C].map(url => webTabs().filter(candidate => candidate.url === url).length);
        const legacyStore = {
            version: 1,
            lastSession: null,
            setups: [...(stored.setups || []), { name: 'NG036 Legacy', modeId: 'browsing', savedAt: '2026-09-25T00:00:00.000Z', windows: [{ x: 0, y: 0, width: 1280, height: 800, tabs: [D], activeTab: null }] }],
        };
        await files.write(setups.setupsUri, JSON.stringify(legacyStore));
        await until(() => setups.listRows().some(entry => entry.name === 'NG036 Legacy'), 10000);
        await commands.executeCommand(${JSON.stringify(RESTORE)}, 'NG036 Legacy');
        await until(() => webTabs().some(candidate => candidate.url === D), 15000);
        return { arranged, arrangedFull, arrangedSizes, row, merged, restored, restoredFull, restoredSizes, counts, perspective, reopenBars, reopenFull, reopenCounts, legacyOnD: webTabs().filter(candidate => candidate.url === D).length };
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
    if (!main || main.type !== 'split' || main.orientation !== 'horizontal' || JSON.stringify(leafLists(main)) !== JSON.stringify(seen.arrangedFull)) {
        fail(`the saved row does not record the split and tab order: dock.main is ${JSON.stringify(main)}, arrangedFull is ${JSON.stringify(seen.arrangedFull)}`);
    }
    if (seen.merged.length !== 1) {
        fail(`harness: merging the tabs left ${seen.merged.length} tab bars`);
        return;
    }
    if (JSON.stringify(seen.restored) !== expected) {
        fail(`Restore Setup produced tab bars ${JSON.stringify(seen.restored)}, not the saved ${expected}`);
    }
    if (JSON.stringify(seen.restoredFull) !== JSON.stringify(seen.arrangedFull)) {
        fail(`Restore Setup placed the tabs as ${JSON.stringify(seen.restoredFull)}, not the saved ${JSON.stringify(seen.arrangedFull)}`);
    }
    const savedSizes = core.dock && core.dock.main && core.dock.main.sizes;
    if (!sizesClose(savedSizes, seen.restoredSizes, 0.05)) {
        fail(`Restore Setup restored split sizes ${JSON.stringify(seen.restoredSizes)}, not the saved ${JSON.stringify(savedSizes)} (tolerance 0.05)`);
    }
    if (JSON.stringify(seen.reopenBars) !== expected) {
        fail(`Restore Setup after closing one tab produced tab bars ${JSON.stringify(seen.reopenBars)}, not the saved ${expected}`);
    }
    if (seen.reopenCounts.some(count => count !== 1)) {
        fail(`after closing one tab and restoring, the web-tab counts on A, B, C are ${seen.reopenCounts.join(', ')}; each must be 1`);
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
