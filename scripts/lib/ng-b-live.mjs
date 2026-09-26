// scripts/lib/ng-b-live.mjs
//
// Shared plumbing for the non-GUI wave B live checks (NG-021..NG-028).
// Everything here is fixture SETUP or OBSERVATION: serving pages from a
// second loopback port, seeding Places through the Places API, owning the
// profile directory (withProfile), reading the endpoint's access file. Each check drives
// the behaviour its row promises through a real entry point -- an actor
// message sent from the Theia frame, a DI-bound Theia service, a command
// through the registry, or the documented endpoint -- never by calling the
// function under test (program constraint G6).
//
// chromeEval() needs --remote-allow-system-access, which withFirefoxPage
// already passes (scripts/lib/firefox-bidi.mjs).

import { createServer, request } from 'node:http';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { withFirefoxPage } from './firefox-bidi.mjs';

/**
 * withFirefoxPage on a profile this check owns (its `{ profileDir }` option,
 * decisions.md R3), so the check knows the profile directory without asking
 * chrome; the callback also receives `profileDir`. Removed afterwards.
 */
export async function withProfile(url, callback) {
    const profileDir = await mkdtemp(join(tmpdir(), 'ng-b-profile-'));
    try {
        return await withFirefoxPage(url, api => callback({ ...api, profileDir }), { profileDir });
    } finally {
        await rm(profileDir, { recursive: true, force: true });
    }
}

/** Inversify lookup by identifier name -- the walk verify-web-tab-live.mjs uses. */
export const GET_BY_NAME = `
function __getByName(container, name) {
    let found;
    container._bindingDictionary.traverse(key => {
        if (found) return;
        const keyStr = typeof key === 'symbol' ? key.toString() : (key && key.name) || String(key);
        if (keyStr === 'Symbol(' + name + ')' || keyStr === name) found = key;
    });
    if (!found) throw new Error('DI binding not found for identifier name: ' + name);
    return container.get(found);
}`;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/** Polls `probe` until it returns a truthy value; resolves that value, or undefined after `timeoutMs`. */
export async function until(probe, timeoutMs, intervalMs = 250) {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
        let value;
        try {
            value = await probe();
        } catch {
            value = undefined;
        }
        if (value) return value;
        if (Date.now() >= deadline) return undefined;
        await sleep(intervalMs);
    }
}

/** Prints the verdict in the registry's style; exit 1 on any failure or throw. */
export function runCheck(name, body) {
    body().then(failures => {
        if (failures.length) {
            console.error(`${name}: FAIL`);
            for (const failure of failures) console.error(`  - ${failure}`);
            process.exit(1);
        }
        console.log(`${name}: PASS`);
        process.exit(0);
    }, err => {
        console.error(`${name}: FAIL -- ${err && err.stack ? err.stack : err}`);
        process.exit(1);
    });
}

/**
 * Serves `pages` on 127.0.0.1 at an ephemeral port: the "second port" the
 * hostile-page walls are tested from. A page is { title, body } (HTML) or
 * { type, bytes } (anything else).
 */
export async function servePages(pages) {
    const server = createServer((req, res) => {
        const page = pages[new URL(req.url, 'http://127.0.0.1').pathname];
        if (!page) {
            res.writeHead(404).end();
            return;
        }
        if (page.bytes) {
            res.writeHead(200, { 'Content-Type': page.type }).end(page.bytes);
            return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(
            `<!doctype html><html><head><meta charset="utf-8"><title>${page.title}</title></head><body>${page.body ?? ''}</body></html>`);
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    return {
        origin,
        url: path => origin + path,
        close: () => new Promise(resolve => {
            server.closeAllConnections();
            server.close(resolve);
        }),
    };
}

/** The Theia shell's content context: a loopback page that is not on the fixture origin. */
export async function shellContext(topLevelContexts, fixtureOrigin) {
    const found = await until(async () => (await topLevelContexts())
        .find(c => c.url.startsWith('http://127.0.0.1:') && !c.url.startsWith(fixtureOrigin)), 90000);
    if (!found) throw new Error('the Theia shell context never appeared');
    return found.context;
}

/** Waits for the Theia frontend in `ctx` to reach the ready state. */
export async function waitTheiaReady(evaluateIn, ctx) {
    const ready = await until(() => evaluateIn(ctx, `(() => { try { ${GET_BY_NAME}
        return __getByName(window.theia.container, 'FrontendApplicationStateService').state === 'ready';
    } catch (e) { return false; } })()`), 90000);
    if (!ready) throw new Error('the Theia frontend never reached the ready state');
}

/** Page-realm expression: one actor request exactly as any page would send it; resolves a JSON string. */
export function actorRequestExpr(msg, timeoutMs = 8000) {
    return `new Promise(resolve => {
        const requestId = 'ng-b-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
        const onReply = event => {
            const detail = event.detail;
            if (detail && detail.requestId === requestId) done({ reply: detail.reply });
        };
        const done = value => {
            window.removeEventListener('PowerBrowserGroupResponse', onReply);
            clearTimeout(timer);
            resolve(JSON.stringify(value));
        };
        const timer = setTimeout(() => done({ timeout: true }), ${timeoutMs});
        window.addEventListener('PowerBrowserGroupResponse', onReply);
        document.dispatchEvent(new CustomEvent('PowerBrowserGroupRequest', { bubbles: true, detail: { requestId, msg: ${JSON.stringify(msg)} } }));
    })`;
}

/** One actor request sent from the page in `ctx`; resolves { reply } or { timeout: true }. */
export async function actorRequest(evaluateIn, ctx, msg, timeoutMs) {
    return JSON.parse(await evaluateIn(ctx, actorRequestExpr(msg, timeoutMs)));
}

/**
 * The positive control of every hostile-page actor wall: the page's request
 * must get a reply, which proves it reached chrome. A timeout means the
 * message never left the page, and a missing answer would prove nothing
 * about the wall. Returns the failure line, or null.
 */
export function unanswered(r, kind) {
    return r && r.timeout
        ? `positive control: the 127.0.0.1 page's ${kind} request got no reply at all, so it never reached chrome and its refusal proves nothing`
        : null;
}

/** Calls a DI-bound Theia service in the shell frame; resolves { value } or { error }. */
export async function diCall(evaluateIn, ctx, identifier, method, args = []) {
    return JSON.parse(await evaluateIn(ctx, `(async () => { ${GET_BY_NAME}
        try {
            const target = __getByName(window.theia.container, ${JSON.stringify(identifier)});
            return JSON.stringify({ value: await target[${JSON.stringify(method)}](...${JSON.stringify(args)}) });
        } catch (e) {
            return JSON.stringify({ error: String((e && e.message) || e) });
        }
    })()`));
}

/** SETUP ONLY: evaluates `expression` in a chrome-scope context and returns its value. */
export async function chromeEval(send, expression) {
    const tree = await send('browsingContext.getTree', { 'moz:scope': 'chrome' });
    const context = tree.contexts && tree.contexts[0] && tree.contexts[0].context;
    if (!context) throw new Error('no chrome-scope browsing context');
    const result = await send('script.evaluate', { expression, target: { context }, awaitPromise: true });
    if (result.type !== 'success') throw new Error(`chrome-scope evaluation threw: ${JSON.stringify(result.exceptionDetails ?? result)}`);
    return result.result.value;
}

/** SETUP ONLY: history visits and one bookmark folder through the Places API; resolves the folder guid. */
export function seedPlaces(send, { history = [], bookmarks = [] } = {}) {
    return chromeEval(send, `(async () => {
        const { PlacesUtils } = ChromeUtils.importESModule('resource://gre/modules/PlacesUtils.sys.mjs');
        for (const h of ${JSON.stringify(history)}) {
            await PlacesUtils.history.insert({ url: h.url, title: h.title, visits: [{ date: new Date() }] });
        }
        const folder = await PlacesUtils.bookmarks.insert({
            parentGuid: PlacesUtils.bookmarks.unfiledGuid,
            type: PlacesUtils.bookmarks.TYPE_FOLDER,
            title: 'Wave B fixture folder',
        });
        for (const b of ${JSON.stringify(bookmarks)}) {
            await PlacesUtils.bookmarks.insert({ parentGuid: folder.guid, url: b.url, title: b.title });
        }
        return folder.guid;
    })()`);
}

/** The endpoint's access file from the check's profile once the backend wrote it; null when it never appears. */
export async function storeAccess(profileDir) {
    const file = join(profileDir, 'store-access.json');
    const text = await until(() => readFile(file, 'utf8'), 60000);
    if (!text) return null;
    return { ...JSON.parse(text), file, mode: (await stat(file)).mode & 0o777 };
}

/**
 * One raw POST; `headers` go out as given, so a check can drop the token,
 * plant an Origin or spoof Host. An answer that takes longer than
 * `timeoutMs` resolves { status: 0, timedOut: true }, so a query the endpoint
 * never stops is a red line, not a hung check.
 */
export function post(url, headers, body, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
        const target = new URL(url);
        const req = request({ host: target.hostname, port: target.port, path: target.pathname, method: 'POST', headers }, res => {
            let text = '';
            res.setEncoding('utf8');
            res.on('data', chunk => { text += chunk; });
            res.on('end', () => resolve({ status: res.statusCode, text }));
        });
        req.setTimeout(timeoutMs, () => {
            resolve({ status: 0, text: '', timedOut: true });
            req.destroy();
        });
        req.on('error', reject);
        req.end(body);
    });
}

/** One JSON-RPC call carrying the right token; resolves { status, json }. */
export async function mcp(access, method, params, headers = {}) {
    const res = await post(access.url, { 'Content-Type': 'application/json', Authorization: `Bearer ${access.token}`, ...headers },
        JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }));
    let json = null;
    try {
        json = JSON.parse(res.text);
    } catch {
        json = null;
    }
    return { status: res.status, json };
}

/** tools/call; resolves { ok: true, value } with the structured result, or { ok: false, error }. */
export async function callTool(access, name, args, headers) {
    const res = await mcp(access, 'tools/call', { name, arguments: args }, headers);
    const result = res.json && res.json.result;
    if (res.status !== 200 || !result) return { ok: false, error: (res.json && res.json.error && res.json.error.message) || `HTTP ${res.status}` };
    if (result.isError) return { ok: false, error: (result.content && result.content[0] && result.content[0].text) || 'tool error' };
    return { ok: true, value: result.structuredContent };
}

/**
 * Page-realm expression: the endpoint called from a web page three ways --
 * with the real token (as if it had leaked), as a plain CORS POST, and as a
 * no-cors POST. Resolves a JSON array of what the page could observe.
 */
export function hostileFetchExpr(url, token, rpc) {
    return `(async () => {
        const body = ${JSON.stringify(JSON.stringify(rpc))};
        const out = [];
        for (const init of [
            { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + ${JSON.stringify(token)} }, body },
            { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body },
            { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body },
        ]) {
            try {
                const res = await fetch(${JSON.stringify(url)}, { ...init, signal: AbortSignal.timeout(5000) });
                out.push({ type: res.type, status: res.status, text: res.type === 'opaque' ? '' : await res.text() });
            } catch (e) {
                out.push({ error: String(e) });
            }
        }
        return JSON.stringify(out);
    })()`;
}

/**
 * The positive control of the hostile-page endpoint walls: the no-cors POST
 * (the third attempt of hostileFetchExpr) must come back as an opaque
 * response, which only a server that answered produces -- a closed port or a
 * blocked request rejects instead. So the page's traffic reached the
 * endpoint, and the refusal is the endpoint's. Returns the failure line, or null.
 */
export function unreached(attempts) {
    return attempts[2] && attempts[2].type === 'opaque'
        ? null
        : `positive control: the 127.0.0.1 page's no-cors POST never reached the endpoint (${JSON.stringify(attempts[2])}), so its refusal proves nothing`;
}
