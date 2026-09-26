#!/usr/bin/env node
/**
 * NG-032 (full tier, live-main lane): quitting saves the current session and
 * the next launch restores it with no saved setup -- 14-UI-SPEC.md:245's
 * "guaranteed restore on relaunch", GUI-09. Evidence: onStop persists only
 * the last-session pointer (setups-service.ts:364-368), and the backend is
 * already stopped when the page unloads.
 *
 * A real quit (the core window's close button) and a real relaunch on the
 * same profile, with the first launch's port held so the sidecar comes back
 * on another one, as it does in use (TheiaService.sys.mjs:602). The mode must
 * come back through ModeService (furniture and attribute): NG-029's launch path.
 */
import { holdPort, probe, runCheck, servePages, sourceConst, withShell } from './lib/pb-relaunch.mjs';

const LABEL = 'ng-032-quit-restores-session';
const ACTIVATE = sourceConst('theia/extensions/modes/src/browser/modes-commands.ts', 'MODES_ACTIVATE_COMMAND_ID');
const MODE_ATTRIBUTE = sourceConst('theia/extensions/modes/src/browser/mode-attribute.ts', 'MODE_ATTRIBUTE');

await runCheck(LABEL, async ({ profile, fail, defer }) => {
    const pages = await servePages({ '/a': { title: 'NG032 A' } });
    defer(pages.close);
    const A = pages.url('/a');

    const first = await withShell(profile, async app => {
        const before = await probe(app, `
            await get('WebTabOpenHandler').openUrl(${JSON.stringify(A)});
            if (!(await until(() => webTabs().some(tab => tab.url === ${JSON.stringify(A)}), 15000))) {
                return { error: 'the web tab never loaded its page' };
            }
            await get('CommandRegistry').executeCommand(${JSON.stringify(ACTIVATE)}, 'coding');
            await sleep(1000);
            return { setups: get('SetupsService').listRows().length };
        `);
        return { before, port: app.port, quit: before.error ? 'skipped' : await app.quit() };
    });
    if (first.before.error) {
        fail(`harness: first launch: ${first.before.error}`);
        return;
    }
    if (first.before.setups !== 0) {
        fail(`harness: the profile already holds ${first.before.setups} saved setup(s); this check needs none`);
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
                await until(() => webTabs().some(tab => tab.url === ${JSON.stringify(A)}), 20000);
                await sleep(1500);
                return {
                    onA: webTabs().filter(tab => tab.url === ${JSON.stringify(A)}).length,
                    modeAttribute: document.body.getAttribute(${JSON.stringify(MODE_ATTRIBUTE)}),
                    statusBarHidden: get('StatusBarImpl').isHidden,
                    setups: get('SetupsService').listRows().length,
                };
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
    if (after.onA !== 1) {
        fail(`after the relaunch ${after.onA} web tab(s) show ${A}; the session quit with exactly one`);
    }
    if (after.modeAttribute !== 'coding') {
        fail(`after the relaunch the mode attribute reads '${after.modeAttribute}'; the session quit in 'coding'`);
    }
    if (after.statusBarHidden !== false) {
        fail('after the relaunch the status bar is hidden, so Coding furniture was not applied through ModeService');
    }
    if (after.setups !== 0) {
        fail(`after the relaunch ${after.setups} saved setup(s) are listed; the session restore must not need one`);
    }
});
