#!/usr/bin/env node
/**
 * NG-035 (full tier, live-clone lane): a custom mode saves the layout, not
 * only three panel flags, and the shipped defaults are data. Evidence:
 * mode-service.ts:23-28, 76-81, 371-376; the hard-coded furniture rule
 * (:306) and visibilityFor (:403-414); 14-CONTEXT.md:33.
 *
 *   (a) data: mode-service.ts branches on no shipped mode id -- the ids are
 *       derived from the descriptors, so a new shipped mode is covered;
 *   (b) load: a modes.json row with views and furniture is applied when the
 *       mode is activated through the modes command (the Explorer moves to
 *       the right panel, the IDE furniture shows);
 *   (c) save: Save as Mode, run through the command registry, writes the
 *       views and the furniture into the new row;
 *   (d) Review Focus: a row written before this wave (three flags only)
 *       still loads and applies its flags.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT, probe, runCheck, sourceConst, sourceMatch, withShell } from './lib/pb-relaunch.mjs';

const LABEL = 'ng-035-custom-mode-saves-layout';
const SERVICE_REL = 'theia/extensions/modes/src/browser/mode-service.ts';
const DESCRIPTORS_REL = 'theia/extensions/modes/src/browser/mode-descriptors.ts';
const COMMANDS_REL = 'theia/extensions/modes/src/browser/modes-commands.ts';
const ACTIVATE = sourceConst(COMMANDS_REL, 'MODES_ACTIVATE_COMMAND_ID');
const SAVE_AS_MODE = sourceConst(COMMANDS_REL, 'MODES_SAVE_AS_MODE_COMMAND_ID');
const EXPLORER = sourceMatch(DESCRIPTORS_REL, /\['([^']+)',\s*'left'\]/);
const STORE = JSON.stringify({
    version: 1,
    customs: [
        { name: 'NG035 Data', leftVisible: false, rightVisible: true, bottomVisible: false, furniture: true, views: { left: [], right: [EXPLORER], bottom: [] } },
        { name: 'NG035 Legacy', leftVisible: true, rightVisible: false, bottomVisible: false },
    ],
});

function shippedIdBranches() {
    const ids = [...readFileSync(join(REPO_ROOT, DESCRIPTORS_REL), 'utf8').matchAll(/\bid:\s*'([^']+)'/g)].map(m => m[1]);
    const code = readFileSync(join(REPO_ROOT, SERVICE_REL), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1');
    return ids.flatMap(id => [...code.matchAll(new RegExp(`(?:===|!==)\\s*'${id}'|'${id}'\\s*(?:===|!==)`, 'g'))].map(m => m[0]));
}

await runCheck(LABEL, async ({ profile, fail }) => {
    const branches = shippedIdBranches();
    if (branches.length) {
        fail(`${SERVICE_REL} branches on shipped mode ids (${branches.join(', ')}); the shipped defaults are code, not data`);
    }
    const seen = await withShell(profile, app => probe(app, `
        const modes = get('ModeService');
        const commands = get('CommandRegistry');
        const appShell = get('ApplicationShell');
        const files = get('FileService');
        await files.write(modes.modesUri, ${JSON.stringify(STORE)});
        if (!(await until(() => modes.getCustomModes().length === 2, 10000))) {
            return { error: 'the two custom modes never loaded from modes.json' };
        }
        const explorerArea = () => {
            const widget = get('WidgetManager').tryGetWidget(${JSON.stringify(EXPLORER)});
            return widget && widget.isAttached ? appShell.getAreaFor(widget) : null;
        };
        await commands.executeCommand(${JSON.stringify(ACTIVATE)}, 'custom-ng035-legacy');
        await sleep(1000);
        const legacy = { left: appShell.isExpanded('left'), right: appShell.isExpanded('right'), statusBarHidden: get('StatusBarImpl').isHidden };
        await commands.executeCommand(${JSON.stringify(ACTIVATE)}, 'custom-ng035-data');
        await sleep(1000);
        const data = { explorer: explorerArea(), right: appShell.isExpanded('right'), statusBarHidden: get('StatusBarImpl').isHidden };
        const input = get('QuickInputService');
        const original = input.input;
        input.input = async () => 'NG035 Saved';
        try {
            await commands.executeCommand(${JSON.stringify(SAVE_AS_MODE)});
        } finally {
            input.input = original;
        }
        await sleep(500);
        const stored = JSON.parse((await files.read(modes.modesUri)).value);
        return { legacy, data, saved: (stored.customs || []).find(row => row.name === 'NG035 Saved') || null };
    `));
    if (seen.error) {
        fail(`harness: ${seen.error}`);
        return;
    }
    if (seen.legacy.left !== true || seen.legacy.right !== false || seen.legacy.statusBarHidden !== true) {
        fail(`a modes.json row written before this wave no longer applies its flags (${JSON.stringify(seen.legacy)})`);
    }
    if (seen.data.explorer !== 'right') {
        fail(`activating a custom mode whose views dock the Explorer on the right left it in '${seen.data.explorer}'`);
    }
    if (seen.data.right !== true) {
        fail('activating a custom mode with the right panel open left it collapsed');
    }
    if (seen.data.statusBarHidden !== false) {
        fail('activating a custom mode with furniture: true hid the status bar; furniture is not data');
    }
    if (!seen.saved) {
        fail('Save as Mode wrote no NG035 Saved row');
        return;
    }
    if (!seen.saved.views || !Array.isArray(seen.saved.views.right) || !seen.saved.views.right.includes(EXPLORER)) {
        fail(`Save as Mode stored no layout: the saved row's views are ${JSON.stringify(seen.saved.views)}, and the Explorer was docked right`);
    }
    if (seen.saved.furniture !== true) {
        fail(`Save as Mode stored furniture ${JSON.stringify(seen.saved.furniture)} while the status bar was showing`);
    }
});
