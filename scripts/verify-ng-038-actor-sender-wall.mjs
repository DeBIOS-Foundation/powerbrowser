#!/usr/bin/env node
/**
 * NG-038 (full tier, live-main lane): the actor accepts messages only from
 * the shell's own Theia frame on the sidecar's port. Evidence: `matches`
 * ignores the port (PowerBrowserAPI.sys.mjs:1705), and stock tabbrowser marks
 * its selected tab's browser primary="true" (upstream tabbrowser.js:728,
 * 1720), which passes groupSenderIsTheia (:150-166).
 *
 * Review Focus: a page served from 127.0.0.1 on a second port, in a selected
 * stock tab (opened through Open Browser Window), sends probeChannel and a
 * createGroup; then the same tab loads a page on the sidecar's own port and
 * does it again. Neither may get an ok:true reply, and neither group may
 * reach the store. Positive control first: the shell's own frame gets ok:true
 * for probeChannel, so a refusal below is the wall and not a dead channel.
 */
import { pollFor, probe, runCheck, servePages, sourceConst, withShell } from './lib/pb-relaunch.mjs';

const LABEL = 'ng-038-actor-refuses-hostile-senders';
const OPEN_BROWSER_WINDOW = sourceConst('theia/extensions/tab-uris/src/browser/browser-window-command.ts', 'OPEN_BROWSER_WINDOW_COMMAND_ID');
const CLIENT_REL = 'theia/extensions/modes/src/browser/group-actor-client.ts';
const REQUEST_EVENT = sourceConst(CLIENT_REL, 'GROUP_REQUEST_EVENT');
const RESPONSE_EVENT = sourceConst(CLIENT_REL, 'GROUP_RESPONSE_EVENT');

/** Page-realm attempt: probeChannel, plus a createGroup when `groupId` is given; every reply for 6 s. */
function attempt(groupId) {
    return `(async () => {
        const replies = [];
        window.addEventListener(${JSON.stringify(RESPONSE_EVENT)}, event => {
            try { replies.push(JSON.parse(JSON.stringify(event.detail))); } catch (error) { replies.push({ unreadable: String(error) }); }
        });
        const send = (requestId, msg) => document.dispatchEvent(new CustomEvent(${JSON.stringify(REQUEST_EVENT)}, {
            bubbles: true, cancelable: true, detail: { requestId, msg },
        }));
        send('ng038-probe', { kind: 'probeChannel' });
        ${groupId ? `send('ng038-create', { kind: 'createGroup', id: ${JSON.stringify(groupId)}, title: 'NG038', x: 0, y: 0, w: 240, h: 160, isActive: false });` : ''}
        await new Promise(resolve => setTimeout(resolve, 6000));
        return JSON.stringify(replies);
    })()`;
}

const accepted = replies => replies.filter(entry => entry && entry.reply && entry.reply.ok === true);

await runCheck(LABEL, async ({ profile, fail, defer }) => {
    const pages = await servePages({ '/hostile': { title: 'NG038 hostile' } });
    defer(pages.close);
    const HOSTILE = pages.url('/hostile');
    const result = await withShell(profile, async app => {
        const own = JSON.parse(await app.evaluate(attempt(null)) ?? '[]');
        if (accepted(own).length === 0) {
            return { error: `the shell's own frame got no ok:true reply to probeChannel (${JSON.stringify(own)}), so a refusal below would prove nothing` };
        }
        await probe(app, `await get('CommandRegistry').executeCommand(${JSON.stringify(OPEN_BROWSER_WINDOW)}, ${JSON.stringify(HOSTILE)}); return {};`);
        const stock = await pollFor(async () => (await app.contexts()).find(entry => entry.url === HOSTILE), 20000, 'the hostile page in a stock tab');
        const otherPort = JSON.parse(await app.evaluateIn(stock.context, attempt('ng038a')) ?? '[]');
        const sidecarPage = `http://127.0.0.1:${app.port}/ng038-probe`;
        await app.evaluateIn(stock.context, `location.href = ${JSON.stringify(sidecarPage)}; true`).catch(() => undefined);
        const sidecar = await pollFor(async () => (await app.contexts()).find(entry => entry.url.startsWith(sidecarPage)), 20000, 'the stock tab on the sidecar port');
        const samePort = JSON.parse(await app.evaluateIn(sidecar.context, attempt('ng038b')) ?? '[]');
        const groups = await probe(app, `
            try { return { ids: (await get('GroupQueryService').listGroups()).map(group => group.id) }; }
            catch (error) { return { unreadable: String(error) }; }
        `);
        return { otherPort, samePort, groups };
    });
    if (result.error) {
        fail(`harness: ${result.error}`);
        return;
    }
    if (accepted(result.otherPort).length) {
        fail(`a 127.0.0.1 page on another port in a selected stock tab got ok:true for ${accepted(result.otherPort).map(entry => entry.requestId).join(', ')}`);
    }
    if (accepted(result.samePort).length) {
        fail(`a page on the sidecar's own port in a stock tab got ok:true for ${accepted(result.samePort).map(entry => entry.requestId).join(', ')}`);
    }
    for (const id of ['ng038a', 'ng038b'].filter(id => (result.groups.ids || []).includes(id))) {
        fail(`the store holds group '${id}', written by a hostile sender`);
    }
});
