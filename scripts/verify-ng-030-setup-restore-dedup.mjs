#!/usr/bin/env node
/**
 * NG-030 (full tier, live-clone lane): restoring a setup opens each web tab
 * once and does not duplicate a tab that is already open. Evidence:
 * setups-service.ts:666-667 opens the active tab a second time, and
 * WebTabOpenHandler mints a new tab per call (web-tab.ts:643). Drives the
 * restore command on a setup listing pages A and B (A active) while B is
 * already open, then counts web tabs per page.
 */
import { probe, runCheck, servePages, sourceConst, withShell } from './lib/pb-relaunch.mjs';

const LABEL = 'ng-030-setup-restore-opens-tabs-once';
const RESTORE = sourceConst('theia/extensions/modes/src/browser/setups-commands.ts', 'SETUPS_RESTORE_COMMAND_ID');

await runCheck(LABEL, async ({ profile, fail, defer }) => {
    const pages = await servePages({ '/a': { title: 'NG030 A' }, '/b': { title: 'NG030 B' } });
    defer(pages.close);
    const A = pages.url('/a');
    const B = pages.url('/b');
    const store = JSON.stringify({
        version: 1,
        lastSession: null,
        setups: [{ name: 'NG030', modeId: 'browsing', savedAt: '2026-09-25T00:00:00.000Z', windows: [{ x: 0, y: 0, width: 1280, height: 800, tabs: [A, B], activeTab: A }] }],
    });
    const seen = await withShell(profile, app => probe(app, `
        const A = ${JSON.stringify(A)};
        const B = ${JSON.stringify(B)};
        const setups = get('SetupsService');
        await get('WebTabOpenHandler').openUrl(B);
        if (!(await until(() => webTabs().some(tab => tab.url === B), 15000))) {
            return { error: 'the web tab on B never opened' };
        }
        await get('FileService').write(setups.setupsUri, ${JSON.stringify(store)});
        if (!(await until(() => setups.listRows().some(row => row.name === 'NG030'), 10000))) {
            return { error: 'the NG030 setup never loaded from setups.json' };
        }
        await get('CommandRegistry').executeCommand(${JSON.stringify(RESTORE)}, 'NG030');
        await sleep(3000);
        const current = get('ApplicationShell').mainPanel.currentTitle;
        return {
            onA: webTabs().filter(tab => tab.url === A).length,
            onB: webTabs().filter(tab => tab.url === B).length,
            currentUrl: current && current.owner ? current.owner.url : null,
        };
    `));
    if (seen.error) {
        fail(`harness: ${seen.error}`);
        return;
    }
    if (seen.onA !== 1) {
        fail(`restoring the setup left ${seen.onA} web tabs on A; it lists A once (the active tab was opened a second time)`);
    }
    if (seen.onB !== 1) {
        fail(`restoring the setup left ${seen.onB} web tabs on B; B was already open and must not be duplicated`);
    }
    if (seen.currentUrl !== A) {
        fail(`after the restore the current main-area tab shows ${seen.currentUrl}, not the setup's active tab ${A}`);
    }
});
