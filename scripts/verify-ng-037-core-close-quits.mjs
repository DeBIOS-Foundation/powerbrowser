#!/usr/bin/env node
/**
 * NG-037 (full tier, live-main lane): closing the core window quits the app
 * and stops the backend, including when stock browser windows are open.
 * Evidence: the close button calls window.close() (powerbrowser.js:356), and
 * the backend stops only on quit-application-granted (TheiaService.sys.mjs:211).
 *
 * Two launches on one profile, each with a stock browser window opened
 * through the Open Browser Window command: the first closes the core window
 * with its close button, the second with the window's close event (what the
 * desktop's own close sends). Each must end the browser and the backend
 * process whose pid the supervisor reported.
 */
import { pollFor, probe, runCheck, servePages, sourceConst, withShell } from './lib/pb-relaunch.mjs';

const LABEL = 'ng-037-core-close-quits';
const OPEN_BROWSER_WINDOW = sourceConst('theia/extensions/tab-uris/src/browser/browser-window-command.ts', 'OPEN_BROWSER_WINDOW_COMMAND_ID');
const THEIA_SERVICE_URL = 'chrome://powerbrowser/content/TheiaService.sys.mjs';

function alive(pid) {
    try {
        process.kill(pid, 0);
        return true;
    } catch (error) {
        return error.code === 'EPERM';
    }
}

await runCheck(LABEL, async ({ profile, fail, defer }) => {
    const pages = await servePages({ '/stock': { title: 'NG037 stock' } });
    defer(pages.close);
    const STOCK = pages.url('/stock');
    for (const how of ['button', 'close-event']) {
        const outcome = await withShell(profile, async app => {
            await probe(app, `await get('CommandRegistry').executeCommand(${JSON.stringify(OPEN_BROWSER_WINDOW)}, ${JSON.stringify(STOCK)}); return {};`);
            const stock = await pollFor(async () => (await app.contexts()).find(entry => entry.url === STOCK), 20000, 'a stock browser window')
                .catch(() => undefined);
            if (!stock) {
                return { error: 'no stock browser window opened, so the precondition does not hold' };
            }
            const pid = await app.evaluateIn(app.chrome, `ChromeUtils.importESModule(${JSON.stringify(THEIA_SERVICE_URL)}).TheiaService.getState().pid`);
            return { pid, quit: await app.quit({ how, timeoutMs: 30000 }) };
        });
        if (outcome.error) {
            fail(`harness (${how}): ${outcome.error}`);
            continue;
        }
        if (outcome.quit === 'timeout') {
            fail(`${how}: the app was still running 30 s after the core window was closed with a stock browser window open`);
            continue;
        }
        if (typeof outcome.pid !== 'number') {
            fail(`harness (${how}): the supervisor reported no backend pid`);
            continue;
        }
        const stopped = await pollFor(async () => !alive(outcome.pid), 10000, `backend pid ${outcome.pid} to exit`).catch(() => false);
        if (!stopped) {
            fail(`${how}: backend pid ${outcome.pid} was still alive 10 s after the app quit`);
        }
    }
});
