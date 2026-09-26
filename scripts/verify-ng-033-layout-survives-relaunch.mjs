#!/usr/bin/env node
/**
 * NG-033 (full tier, live-main lane): the active mode, per-mode layouts and
 * the shell layout survive a relaunch. Evidence: the first spawn uses port 0
 * (TheiaService.sys.mjs:602), so the frontend origin -- and localStorage,
 * where Theia keeps 'perspective-layouts' -- changes per launch;
 * mode-service.ts:562-592 reads it.
 *
 * Launch 1 visits Coding and Browsing and sets the left panel to 333 px in
 * Coding; a real quit; launch 2 on the same profile with the old port held.
 * The assertions are ones only the persisted layout satisfies: both modes
 * have saved layouts and the left panel is 333 px (NG-032's session restore
 * brings back tabs and mode, not these).
 *
 * Launch 3 (Review Focus): the page swallows chrome's quit-flush push, as a
 * hung frontend would, and the app must still exit within 20 s.
 */
import { holdPort, probe, runCheck, sourceConst, withShell } from './lib/pb-relaunch.mjs';

const LABEL = 'ng-033-layout-survives-relaunch';
const ACTIVATE = sourceConst('theia/extensions/modes/src/browser/modes-commands.ts', 'MODES_ACTIVATE_COMMAND_ID');
const STATE_EVENT = sourceConst('theia/extensions/tab-uris/src/browser/web-tab.ts', 'WEB_TAB_STATE_EVENT');
const LEFT_WIDTH = 333;

await runCheck(LABEL, async ({ profile, fail }) => {
    const first = await withShell(profile, async app => {
        const before = await probe(app, `
            const commands = get('CommandRegistry');
            const appShell = get('ApplicationShell');
            await commands.executeCommand(${JSON.stringify(ACTIVATE)}, 'coding');
            await sleep(800);
            appShell.resize(${LEFT_WIDTH}, 'left');
            await sleep(800);
            await commands.executeCommand(${JSON.stringify(ACTIVATE)}, 'browsing');
            await sleep(800);
            await commands.executeCommand(${JSON.stringify(ACTIVATE)}, 'coding');
            await sleep(800);
            const left = appShell.getLayoutData().leftPanel;
            return { perspective: get('PerspectiveService').getActivePerspectiveId(), leftSize: left ? left.size : null };
        `);
        const ready = before.perspective === 'coding' && typeof before.leftSize === 'number' && Math.abs(before.leftSize - LEFT_WIDTH) <= 2;
        return { before, ready, port: app.port, quit: ready ? await app.quit() : 'skipped' };
    });
    if (!first.ready) {
        fail(`harness: the first launch could not set up Coding with a ${LEFT_WIDTH} px left panel (${JSON.stringify(first.before)})`);
        return;
    }
    if (first.quit === 'timeout') {
        fail('closing the core window did not quit the app within 30 s');
        return;
    }

    const release = await holdPort(first.port);
    let second;
    try {
        second = await withShell(profile, async app => ({
            port: app.port,
            after: await probe(app, `
                await sleep(1500);
                const perspectives = get('PerspectiveService');
                const left = get('ApplicationShell').getLayoutData().leftPanel;
                return { perspective: perspectives.getActivePerspectiveId(), saved: perspectives.getSavedPerspectiveIds(), leftSize: left ? left.size : null };
            `),
        }));
    } finally {
        await release();
    }
    if (second.port === first.port) {
        fail(`harness: the relaunch reused port ${first.port}; the check could not force the port change`);
        return;
    }
    const after = second.after;
    if (after.perspective !== 'coding') {
        fail(`after the relaunch the active mode is '${after.perspective}'; the app quit in 'coding'`);
    }
    for (const id of ['coding', 'browsing']) {
        if (!Array.isArray(after.saved) || !after.saved.includes(id)) {
            fail(`after the relaunch there is no saved layout for '${id}' (saved: ${JSON.stringify(after.saved)}); the per-mode layouts did not survive`);
        }
    }
    if (typeof after.leftSize !== 'number' || Math.abs(after.leftSize - LEFT_WIDTH) > 2) {
        fail(`after the relaunch the left panel is ${after.leftSize} px, not ${LEFT_WIDTH}; the shell layout did not survive`);
    }

    const third = await withShell(profile, async app => {
        await app.evaluate(`window.addEventListener(${JSON.stringify(STATE_EVENT)}, event => {
            const kind = event.detail && event.detail.kind;
            if (kind !== 'state' && kind !== 'focusAddress') event.stopImmediatePropagation();
        }, true); true`);
        return app.quit({ timeoutMs: 20000 });
    });
    if (third === 'timeout') {
        fail('with a frontend that never answers the quit flush, the app was still running 20 s after the core window closed; the flush must be bounded');
    }
});
