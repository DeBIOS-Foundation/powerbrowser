#!/usr/bin/env node
/**
 * NG-034 (full tier, live-main lane; the row is Needs: wave-a): in-shell web
 * tabs survive a restart with their back/forward history. Evidence: the
 * layout restore refuses them (tab-uris-frontend-module.ts:107), and the
 * shell window is not a navigator:browser window, so sessionstore never
 * sees them.
 *
 * Launch 1: a web tab on page A; one trusted click on A's full-page link
 * (session history only offers Back to an entry the user touched) takes the
 * same tab to B. A real quit; a relaunch on the same profile with the old
 * port held. The tab must come back once, on B, with Back available, and the
 * chrome bar's Back must take it to A.
 */
import { holdPort, pollFor, probe, runCheck, servePages, withShell } from './lib/pb-relaunch.mjs';

const LABEL = 'ng-034-web-tab-history-survives-restart';

await runCheck(LABEL, async ({ profile, fail, defer }) => {
    const pages = await servePages({
        '/a': { title: 'NG034 A', body: '<a id="next" href="/b" style="display:block;width:100vw;height:100vh">next</a>' },
        '/b': { title: 'NG034 B' },
    });
    defer(pages.close);
    const A = pages.url('/a');
    const B = pages.url('/b');

    const first = await withShell(profile, async app => {
        const opened = await probe(app, `
            await get('WebTabOpenHandler').openUrl(${JSON.stringify(A)});
            return { ok: await until(() => webTabs().some(tab => tab.url === ${JSON.stringify(A)}), 15000) };
        `);
        if (!opened.ok) {
            return { error: 'the web tab never loaded A' };
        }
        const overlay = await pollFor(async () => (await app.contexts()).find(entry => entry.url === A), 15000, 'the overlay context on A');
        await app.send('input.performActions', {
            context: overlay.context,
            actions: [{
                type: 'pointer', id: 'ng034-mouse', parameters: { pointerType: 'mouse' },
                actions: [{ type: 'pointerMove', x: 20, y: 20 }, { type: 'pointerDown', button: 0 }, { type: 'pointerUp', button: 0 }],
            }],
        });
        await app.send('input.releaseActions', { context: overlay.context });
        const navigated = await probe(app, `
            return { ok: await until(() => webTabs().some(tab => tab.url === ${JSON.stringify(B)} && tab.canGoBack), 15000) };
        `);
        if (!navigated.ok) {
            return { error: 'the link click did not take the web tab to B with Back available' };
        }
        return { port: app.port, quit: await app.quit() };
    });
    if (first.error) {
        fail(`harness: first launch: ${first.error}`);
        return;
    }
    if (first.quit === 'timeout') {
        fail('closing the core window did not quit the app within 30 s');
        return;
    }

    const release = await holdPort(first.port);
    let second;
    try {
        second = await withShell(profile, async app => {
            const after = await probe(app, `
                await until(() => webTabs().some(tab => tab.url === ${JSON.stringify(B)}), 20000);
                await sleep(1500);
                const tabs = webTabs().filter(tab => tab.url === ${JSON.stringify(A)} || tab.url === ${JSON.stringify(B)});
                const onB = tabs.find(tab => tab.url === ${JSON.stringify(B)});
                if (onB) {
                    await get('ApplicationShell').activateWidget(onB.id);
                    await sleep(800);
                }
                return { count: tabs.length, onB: !!onB, canGoBack: onB ? onB.canGoBack : null };
            `);
            let wentBack = null;
            let backButton = null;
            if (after.onB && after.canGoBack === true) {
                backButton = await app.evaluate(`(() => {
                    const back = document.querySelector('.pb-chrome-bar-button[aria-label="Back"]');
                    if (back) back.click();
                    return !!back;
                })()`);
                if (backButton === true) {
                    wentBack = await pollFor(async () => (await app.contexts()).some(entry => entry.url === A), 15000, 'the tab going back to A')
                        .catch(() => false);
                }
            }
            return { port: app.port, after, backButton, wentBack };
        });
    } finally {
        await release();
    }
    if (second.port === first.port) {
        fail(`harness: the relaunch reused port ${first.port}; the check could not force the port change`);
        return;
    }
    const { after, backButton, wentBack } = second;
    if (after.count !== 1) {
        fail(`after the restart ${after.count} web tab(s) show A or B; the session quit with exactly one`);
    }
    if (!after.onB) {
        fail('after the restart no web tab shows B, the page the tab was on at quit');
        return;
    }
    if (after.canGoBack !== true) {
        fail('after the restart the web tab on B cannot go Back; its back/forward history did not survive');
        return;
    }
    if (backButton !== true) {
        fail('harness: the chrome bar shows no Back button to press, so going Back could not be driven');
        return;
    }
    if (!wentBack) {
        fail('pressing Back after the restart did not return the web tab to A');
    }
});
