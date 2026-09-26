#!/usr/bin/env node
/**
 * NG-029 (full tier, live-clone lane): restoring a setup activates its mode
 * through ModeService -- mode attribute, furniture, Explorer dock and panel
 * map -- not through a bare switchPerspective (setups-service.ts:438, 441;
 * same class as GUI-DEFECTS item 6). Drives the restore command through the
 * command registry, on a setups.json written by the frontend's own
 * FileService. The launch restore (:350 -> :842) runs the same body; ng-032
 * drives it across a real relaunch.
 */
import { probe, runCheck, sourceConst, sourceMatch, withShell } from './lib/pb-relaunch.mjs';

const LABEL = 'ng-029-setup-restore-activates-mode';
const RESTORE = sourceConst('theia/extensions/modes/src/browser/setups-commands.ts', 'SETUPS_RESTORE_COMMAND_ID');
const ACTIVATE = sourceConst('theia/extensions/modes/src/browser/modes-commands.ts', 'MODES_ACTIVATE_COMMAND_ID');
const MODE_ATTRIBUTE = sourceConst('theia/extensions/modes/src/browser/mode-attribute.ts', 'MODE_ATTRIBUTE');
const EXPLORER = sourceMatch('theia/extensions/modes/src/browser/mode-descriptors.ts', /\['([^']+)',\s*'left'\]/);
const STORE = JSON.stringify({
    version: 1,
    lastSession: null,
    setups: [{ name: 'NG029', modeId: 'coding', savedAt: '2026-09-25T00:00:00.000Z', windows: [{ x: 0, y: 0, width: 1280, height: 800, tabs: [], activeTab: null }] }],
});

await runCheck(LABEL, async ({ profile, fail }) => {
    const seen = await withShell(profile, app => probe(app, `
        const setups = get('SetupsService');
        await get('FileService').write(setups.setupsUri, ${JSON.stringify(STORE)});
        if (!(await until(() => setups.listRows().some(row => row.name === 'NG029'), 10000))) {
            return { error: 'the NG029 setup never loaded from setups.json' };
        }
        await get('CommandRegistry').executeCommand(${JSON.stringify(ACTIVATE)}, 'browsing');
        await sleep(800);
        await get('CommandRegistry').executeCommand(${JSON.stringify(RESTORE)}, 'NG029');
        await sleep(1500);
        const appShell = get('ApplicationShell');
        const explorer = get('WidgetManager').tryGetWidget(${JSON.stringify(EXPLORER)});
        return {
            perspective: get('PerspectiveService').getActivePerspectiveId(),
            modeAttribute: document.body.getAttribute(${JSON.stringify(MODE_ATTRIBUTE)}),
            statusBarHidden: get('StatusBarImpl').isHidden,
            leftRailHidden: appShell.leftPanelHandler.container.isHidden,
            explorerArea: explorer && explorer.isAttached ? appShell.getAreaFor(explorer) : null,
            leftExpanded: appShell.isExpanded('left'),
        };
    `));
    if (seen.error) {
        fail(`harness: ${seen.error}`);
        return;
    }
    if (seen.perspective !== 'coding') {
        fail(`the active perspective is '${seen.perspective}', not the setup's 'coding'`);
    }
    if (seen.modeAttribute !== 'coding') {
        fail(`the mode attribute reads '${seen.modeAttribute}', not 'coding' -- the restore switched the perspective without ModeService`);
    }
    if (seen.statusBarHidden !== false) {
        fail('the status bar is hidden after restoring a Coding setup -- Coding furniture was not applied');
    }
    if (seen.leftRailHidden !== false) {
        fail('the left icon rail is hidden after restoring a Coding setup -- Coding furniture was not applied');
    }
    if (seen.explorerArea !== 'left') {
        fail(`the Explorer is docked in '${seen.explorerArea}', not 'left' -- the Coding panel map was not applied`);
    }
    if (seen.leftExpanded !== true) {
        fail('the left panel is collapsed after restoring a Coding setup');
    }
});
