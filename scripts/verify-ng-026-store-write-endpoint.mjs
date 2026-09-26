#!/usr/bin/env node
// scripts/verify-ng-026-store-write-endpoint.mjs
//
// NG-026: users and MCP clients change tab and group data through a
// documented write path that goes through the single chrome-side writer.
// live-main: the endpoint relays each op through a connected Theia window to
// the actor, where chrome's writer applies it; setSetting (decisions.md R18)
// is a chrome-side store kind. Static half: the ops are derived from
// TAB_STORE_WRITE_FIELDS and must be documented, and the setting keys the
// writer validates (STORE_SETTING_RULES) must equal the keys docs/TAB-STORE.md
// documents. Live half: createGroup, renameGroup, moveGroup, setTabGroup,
// setSetting and dissolveGroup land, each read back through Theia's own
// reader (GroupQueryService, never the endpoint); an op outside the list, the
// tab-closing op, an unknown tab (refused as "unknown tab URI", decisions.md
// R26), an unknown setting and an invalid setting value are refused; the
// token and Origin walls refuse writes; and a 127.0.0.1 page on a second port
// in the selected stock tab, holding the real token, cannot create a group
// (its no-cors POST coming back opaque is the positive control that its
// traffic reached the endpoint).

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { callTool, diCall, hostileFetchExpr, post, runCheck, servePages, shellContext, storeAccess, unreached, until, waitTheiaReady, withProfile } from './lib/ng-b-live.mjs';

const NAME = 'ng-026-store-write-endpoint';
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROTOCOL_REL = 'theia/extensions/tab-uris/src/browser/tab-store-access-protocol.ts';
const DOC_REL = 'docs/tab-store-access.md';
const STORE_DOC_REL = 'docs/TAB-STORE.md';
const API_REL = 'powerbrowser/shell/PowerBrowserAPI.sys.mjs';
const NONCE = `ng026${Date.now().toString(36)}`;

function read(rel) {
    try {
        return readFileSync(join(REPO_ROOT, rel), 'utf8');
    } catch {
        return '';
    }
}

function staticHalf(failures) {
    const block = /TAB_STORE_WRITE_FIELDS[^=]*=\s*\{([^}]*)\}/.exec(read(PROTOCOL_REL));
    const ops = block ? [...block[1].matchAll(/(\w+)\s*:\s*\[/g)].map(m => m[1]) : [];
    if (ops.length === 0) failures.push(`${PROTOCOL_REL}: derived ZERO write ops from TAB_STORE_WRITE_FIELDS`);
    const doc = read(DOC_REL);
    if (!doc.includes('`tab_store_write`')) failures.push(`${DOC_REL} does not document the tab_store_write tool`);
    for (const op of ops) {
        if (!doc.includes('`' + op + '`')) failures.push(`${DOC_REL} does not document the ${op} op`);
    }
    // R18: the writer validates exactly the settings docs/TAB-STORE.md documents.
    const settingsSection = (/^## Settings\n([\s\S]*?)(?=^## )/m.exec(read(STORE_DOC_REL)) || [])[1] || '';
    const documented = [...settingsSection.matchAll(/^\| `([a-z_]+)` \|/gm)].map(m => m[1]).sort();
    const rulesBlock = /STORE_SETTING_RULES = \{([\s\S]*?)\n\};/.exec(read(API_REL));
    const validated = rulesBlock ? [...rulesBlock[1].matchAll(/^ {2}([a-z_]+): \{/gm)].map(m => m[1]).sort() : [];
    if (documented.length === 0) failures.push(`${STORE_DOC_REL}: derived ZERO settings keys from its "## Settings" table`);
    if (JSON.stringify(documented) !== JSON.stringify(validated)) {
        failures.push(`the settings writer validates [${validated}] but ${STORE_DOC_REL} documents [${documented}]`);
    }
}

runCheck(NAME, async () => {
    const failures = [];
    staticHalf(failures);
    const pages = await servePages({ '/page': { title: `Write ${NONCE}` } });
    const pageUrl = pages.url('/page');
    const groupId = `ng026-${NONCE}`;
    try {
        await withProfile(pageUrl, async ({ evaluate, evaluateIn, topLevelContexts, profileDir }) => {
            const shell = await shellContext(topLevelContexts, pages.origin);
            await waitTheiaReady(evaluateIn, shell);
            const access = await storeAccess(profileDir);
            if (!access) {
                failures.push('store-access.json never appeared in the profile -- the endpoint is not running');
                return;
            }
            const groups = async () => (await diCall(evaluateIn, shell, 'GroupQueryService', 'listGroups')).value || [];
            const group = async id => (await groups()).find(g => g.id === id);
            const members = async id => (await diCall(evaluateIn, shell, 'GroupQueryService', 'getGroupTabs', [id])).value || [];
            const write = args => callTool(access, 'tab_store_write', args);
            const tabUri = await until(async () => {
                const r = await diCall(evaluateIn, shell, 'GroupQueryService', 'listUngroupedTabs');
                const row = (r.value || []).find(t => t.url === pageUrl);
                return row && row.uri;
            }, 30000);
            if (!tabUri) {
                failures.push(`the open tab ${pageUrl} never appeared in Theia's own reader`);
                return;
            }

            let r = await write({ op: 'createGroup', id: groupId, title: `Probe ${NONCE}` });
            let g = await group(groupId);
            if (!r.ok || !g || g.title !== `Probe ${NONCE}`) failures.push(`createGroup: ${JSON.stringify(r)} then ${JSON.stringify(g)}`);
            r = await write({ op: 'renameGroup', id: groupId, title: `Renamed ${NONCE}` });
            g = await group(groupId);
            if (!r.ok || !g || g.title !== `Renamed ${NONCE}`) failures.push(`renameGroup: ${JSON.stringify(r)} then ${JSON.stringify(g)}`);
            r = await write({ op: 'moveGroup', id: groupId, x: 40, y: 60 });
            g = await group(groupId);
            if (!r.ok || !g || g.x !== 40 || g.y !== 60) failures.push(`moveGroup: ${JSON.stringify(r)} then ${JSON.stringify(g)}`);
            r = await write({ op: 'setTabGroup', uri: tabUri, groupId });
            if (!r.ok || !(await members(groupId)).some(t => t.uri === tabUri)) failures.push(`setTabGroup: ${JSON.stringify(r)}`);

            for (const args of [
                { op: 'closeGroup', id: groupId },
                { op: 'captureShellRegion', rect: { x: 0, y: 0, w: 1, h: 1 } },
                { op: 'dropTable' },
                { op: '__proto__' },
            ]) {
                const refused = await write(args);
                if (refused.ok) failures.push(`tab_store_write accepted ${JSON.stringify(args)}`);
            }
            // R26: the unknown tab is refused by the writer's own rule, not by some earlier wall.
            const unknownTab = await write({ op: 'setTabGroup', uri: `unknown-${NONCE}`, groupId });
            if (unknownTab.ok || !String(unknownTab.error).includes('unknown tab URI')) {
                failures.push(`setTabGroup on a tab with no row was not refused as "unknown tab URI": ${JSON.stringify(unknownTab)}`);
            }
            if (!(await group(groupId))) failures.push('a refused closeGroup still removed the group');
            if (!(await members(groupId)).some(t => t.uri === tabUri)) failures.push('a refused closeGroup still closed the tab');

            // setSetting (R18), read back through wave A's settings reader.
            const settings = async () => (await diCall(evaluateIn, shell, 'GroupQueryService', 'getSettings')).value || {};
            const before = (await settings()).restore_live_minutes;
            const next = before === '6' ? '7' : '6';
            r = await write({ op: 'setSetting', key: 'restore_live_minutes', value: next });
            if (!r.ok || (await settings()).restore_live_minutes !== next) failures.push(`setSetting restore_live_minutes=${next}: ${JSON.stringify(r)}`);
            for (const args of [
                { op: 'setSetting', key: 'restore_live_minutes', value: 'soon' },
                { op: 'setSetting', key: 'restore_behaviour', value: 'everything' },
                { op: 'setSetting', key: `unknown_${NONCE}`, value: '1' },
            ]) {
                const refused = await write(args);
                if (refused.ok) failures.push(`setSetting accepted ${JSON.stringify(args)}`);
            }
            if ((await settings()).restore_live_minutes !== next) failures.push('a refused setSetting still changed restore_live_minutes');
            if (typeof before === 'string') await write({ op: 'setSetting', key: 'restore_live_minutes', value: before });

            const rpc = id => ({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'tab_store_write', arguments: { op: 'createGroup', id, title: 'refused' } } });
            const nodeId = `ng026-node-${NONCE}`;
            for (const [label, headers, want] of [
                ['no token', { 'Content-Type': 'application/json', Authorization: '' }, 401],
                ['a browser Origin with the right token', { 'Content-Type': 'application/json', Authorization: `Bearer ${access.token}`, Origin: pages.origin }, 403],
            ]) {
                const res = await post(access.url, headers, JSON.stringify(rpc(nodeId)));
                if (res.status !== want) failures.push(`${label}: HTTP ${res.status}, expected ${want}`);
            }
            const pageId = `ng026-page-${NONCE}`;
            const hostile = JSON.parse(await evaluate(hostileFetchExpr(access.url, access.token, rpc(pageId))));
            const silent = unreached(hostile);
            if (silent) failures.push(silent);
            if (hostile.some(x => x.status === 200 && x.type !== 'opaque')) failures.push(`a 127.0.0.1 page in a stock tab got an answer from the write path: ${JSON.stringify(hostile)}`);
            const ids = (await groups()).map(x => x.id);
            for (const id of [nodeId, pageId]) {
                if (ids.includes(id)) failures.push(`a refused request still created group ${id}`);
            }

            r = await write({ op: 'dissolveGroup', id: groupId });
            if (!r.ok || (await group(groupId))) failures.push(`dissolveGroup: ${JSON.stringify(r)}`);
        });
    } finally {
        await pages.close();
    }
    return failures;
});
