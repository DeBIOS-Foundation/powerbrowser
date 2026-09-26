#!/usr/bin/env node
// scripts/verify-ng-025-store-read-endpoint.mjs
//
// NG-025: users and MCP clients run read-only SQL against tabs.sqlite through
// a documented, token-gated endpoint. Theia-side (live-clone).
// Static half: the tool list is derived from TAB_STORE_TOOL_NAMES and must
// equal tools/list and be documented in docs/tab-store-access.md.
// Live half, against the running browser: the 0600 access file; a SELECT
// returning the open tab's row; refusal of every statement that writes,
// attaches, vacuums, sets a pragma or loads an extension, with the row count
// unchanged; the token, Origin and Host walls; a 127.0.0.1 page on a second
// port in the selected stock tab, holding the real token, reading nothing
// (its no-cors POST coming back opaque is the positive control that its
// traffic reached the endpoint); and a runaway query stopped at the time
// limit while the endpoint and the Theia backend RPC keep answering.

import { existsSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { callTool, diCall, hostileFetchExpr, mcp, post, runCheck, servePages, shellContext, storeAccess, unreached, until, waitTheiaReady, withProfile } from './lib/ng-b-live.mjs';

const NAME = 'ng-025-store-read-endpoint';
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROTOCOL_REL = 'theia/extensions/tab-uris/src/browser/tab-store-access-protocol.ts';
const DOC_REL = 'docs/tab-store-access.md';
const NONCE = `ng025${Date.now().toString(36)}`;

function read(rel) {
    try {
        return readFileSync(join(REPO_ROOT, rel), 'utf8');
    } catch {
        return '';
    }
}

function staticHalf(failures) {
    const protocol = read(PROTOCOL_REL);
    if (!protocol) failures.push(`${PROTOCOL_REL} is missing -- the endpoint has no protocol`);
    const block = /TAB_STORE_TOOL_NAMES\s*=\s*\[([^\]]*)\]/.exec(protocol);
    const tools = block ? [...block[1].matchAll(/'([a-z_]+)'/g)].map(m => m[1]) : [];
    if (protocol && tools.length === 0) failures.push(`${PROTOCOL_REL}: derived ZERO tool names from TAB_STORE_TOOL_NAMES`);
    const doc = read(DOC_REL);
    if (!doc) failures.push(`${DOC_REL} is missing -- the endpoint is undocumented`);
    for (const tool of tools) {
        if (doc && !doc.includes('`' + tool + '`')) failures.push(`${DOC_REL} does not document the ${tool} tool`);
    }
    for (const phrase of ['store-access.json', 'Authorization: Bearer', 'Origin']) {
        if (doc && !doc.includes(phrase)) failures.push(`${DOC_REL} does not explain ${phrase}`);
    }
    return tools;
}

runCheck(NAME, async () => {
    const failures = [];
    const tools = staticHalf(failures);
    const pages = await servePages({ '/page': { title: `Endpoint ${NONCE}` } });
    const pageUrl = pages.url('/page');
    try {
        await withProfile(pageUrl, async ({ evaluate, evaluateIn, topLevelContexts, profileDir }) => {
            const shell = await shellContext(topLevelContexts, pages.origin);
            await waitTheiaReady(evaluateIn, shell);
            const access = await storeAccess(profileDir);
            if (!access) {
                failures.push('store-access.json never appeared in the profile -- the endpoint is not running');
                return;
            }
            if (access.mode & 0o077) failures.push(`store-access.json is open to other users (mode ${access.mode.toString(8)})`);
            if (!/^http:\/\/127\.0\.0\.1:\d+\/mcp$/.test(access.url)) failures.push(`the endpoint URL is not a 127.0.0.1 /mcp address: ${access.url}`);

            const listed = await mcp(access, 'tools/list', {});
            const names = ((listed.json && listed.json.result && listed.json.result.tools) || []).map(t => t.name).sort();
            if (JSON.stringify(names) !== JSON.stringify([...tools].sort())) failures.push(`tools/list answered [${names}] but TAB_STORE_TOOL_NAMES is [${tools}]`);

            const select = () => callTool(access, 'tabs_sql', { sql: 'SELECT uri, url, title FROM tabs WHERE url = ?', params: [pageUrl] });
            const found = await until(async () => {
                const r = await select();
                return r.ok && r.value.rows.some(row => row.title === `Endpoint ${NONCE}`) ? r : undefined;
            }, 30000);
            if (!found) failures.push(`tabs_sql never returned the open tab's row: ${JSON.stringify(await select())}`);

            const count = async () => {
                const r = await callTool(access, 'tabs_sql', { sql: 'SELECT count(*) AS n FROM tabs' });
                return r.ok ? r.value.rows[0].n : `error: ${r.error}`;
            };
            const before = await count();
            const copy = join(tmpdir(), `${NONCE}-copy.sqlite`);
            const places = join(dirname(access.file), 'places.sqlite');
            for (const sql of [
                'DELETE FROM tabs',
                "UPDATE tabs SET title = 'x'",
                `ATTACH DATABASE '${places}' AS p`,
                'SELECT 1; DELETE FROM tabs',
                `VACUUM INTO '${copy}'`,
                'PRAGMA query_only = 0',
                "SELECT load_extension('x')",
            ]) {
                const r = await callTool(access, 'tabs_sql', { sql });
                if (r.ok) failures.push(`tabs_sql accepted a statement that is not a plain read: ${sql}`);
            }
            if (existsSync(copy)) {
                failures.push('VACUUM INTO wrote a copy of the store');
                rmSync(copy, { force: true });
            }
            const after = await count();
            if (after !== before) failures.push(`the tab count went from ${before} to ${after} across refused statements`);

            // The walls, before the runaway query so a busy worker cannot mask them.
            const probe = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} });
            const json = { 'Content-Type': 'application/json' };
            const bearer = { Authorization: `Bearer ${access.token}` };
            const port = new URL(access.url).port;
            for (const [label, headers, want] of [
                ['no token', { ...json, Authorization: '' }, 401],
                ['a wrong token', { ...json, Authorization: `Bearer ${'0'.repeat(64)}` }, 401],
                ['a browser Origin with the right token', { ...json, ...bearer, Origin: pages.origin }, 403],
                ['a rebinding Host with the right token', { ...json, ...bearer, Host: `attacker.example:${port}` }, 403],
            ]) {
                const r = await post(access.url, headers, probe);
                if (r.status !== want) failures.push(`${label}: HTTP ${r.status}, expected ${want}`);
            }
            const hostile = JSON.parse(await evaluate(hostileFetchExpr(access.url, access.token,
                { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'tabs_sql', arguments: { sql: 'SELECT url, title FROM tabs' } } })));
            const silent = unreached(hostile);
            if (silent) failures.push(silent);
            if (JSON.stringify(hostile).includes(NONCE) || hostile.some(r => r.status === 200 && r.type !== 'opaque')) {
                failures.push(`a 127.0.0.1 page in a stock tab read the store through the endpoint: ${JSON.stringify(hostile)}`);
            }

            // A runaway query: stopped at the limit; the endpoint and the Theia RPC keep answering.
            const started = Date.now();
            const slow = await callTool(access, 'tabs_sql', { sql: 'WITH t(x) AS (VALUES (1),(2),(3),(4),(5),(6),(7),(8),(9),(10)) SELECT count(*) AS n FROM t a, t b, t c, t d, t e, t f, t g, t h, t i' });
            const took = Date.now() - started;
            if (slow.ok || took > 15000) failures.push(`a runaway query was not stopped at the time limit (ok=${slow.ok}, ${took} ms)`);
            const t1 = Date.now();
            const alive = await mcp(access, 'tools/list', {});
            if (alive.status !== 200 || Date.now() - t1 > 3000) failures.push('the endpoint stopped answering after a runaway query');
            const t2 = Date.now();
            const rpc = await diCall(evaluateIn, shell, 'GroupQueryService', 'listGroups');
            if (rpc.error || Date.now() - t2 > 3000) failures.push(`the Theia backend RPC stalled behind a runaway query: ${JSON.stringify(rpc)}`);
        });
    } finally {
        await pages.close();
    }
    return failures;
});
