#!/usr/bin/env node
// scripts/verify-ng-024-tabs-places-join.mjs
//
// NG-024: a query API joins tabs with history and bookmarks (FEATURES.md
// Area 4: "which open tabs have I never bookmarked", "which bookmarks are
// open right now", ranked by frecency). Live, chrome-side (live-main). Two
// open stock tabs, A bookmarked and B not. The join must answer through the
// actor message sent from the Theia frame, the DI-bound ChromeStoreClient and
// the endpoint's tabs_with_places tool; the bookmarked filter must split A
// from B; rows come ranked by frecency; a 127.0.0.1 page in the selected
// stock tab (B, which openStockTab selects) gets no rows, but does get a
// reply (the positive control that its request reached chrome).

import { actorRequest, actorRequestExpr, callTool, diCall, runCheck, seedPlaces, servePages, shellContext, storeAccess, unanswered, until, waitTheiaReady, withProfile } from './lib/ng-b-live.mjs';

const NAME = 'ng-024-tabs-places-join';
const NONCE = `ng024${Date.now().toString(36)}`;

runCheck(NAME, async () => {
    const failures = [];
    const pages = await servePages({ '/a': { title: `A ${NONCE}` }, '/b': { title: `B ${NONCE}` } });
    const aUrl = pages.url('/a');
    const bUrl = pages.url('/b');
    const has = (rows, url) => Array.isArray(rows) && rows.some(r => r.url === url);
    try {
        await withProfile(aUrl, async ({ evaluateIn, send, topLevelContexts, profileDir }) => {
            const shell = await shellContext(topLevelContexts, pages.origin);
            await waitTheiaReady(evaluateIn, shell);
            await actorRequest(evaluateIn, shell, { kind: 'openStockTab', url: bUrl });
            const bTab = await until(async () => (await topLevelContexts()).find(c => c.url === bUrl), 20000);
            if (!bTab) throw new Error(`openStockTab never opened ${bUrl} in a stock tab`);
            await seedPlaces(send, { bookmarks: [{ url: aUrl, title: `Bookmarked A ${NONCE}` }] });
            const query = args => actorRequest(evaluateIn, shell, { kind: 'queryTabsWithPlaces', ...args });

            const all = await until(async () => {
                const r = await query({});
                const rows = r.reply?.rows;
                const a = has(rows, aUrl) && rows.find(x => x.url === aUrl);
                return a && a.visited && has(rows, bUrl) ? r : undefined;
            }, 30000);
            if (!all) {
                failures.push(`queryTabsWithPlaces from the Theia frame never joined both open tabs: ${JSON.stringify(await query({}))}`);
            } else {
                const rows = all.reply.rows;
                const a = rows.find(r => r.url === aUrl);
                const b = rows.find(r => r.url === bUrl);
                if (!a.bookmark_guid || a.bookmark_title !== `Bookmarked A ${NONCE}`) failures.push(`the bookmarked tab lost its bookmark in the join: ${JSON.stringify(a)}`);
                if (b.bookmark_guid !== null) failures.push(`the unbookmarked tab carries a bookmark: ${JSON.stringify(b)}`);
                if (a.open !== true || b.open !== true) failures.push(`an open tab is not marked open: ${JSON.stringify([a, b])}`);
                if (typeof a.uri !== 'string' || !a.uri) failures.push(`a joined row has no tab key: ${JSON.stringify(a)}`);
                const rank = rows.map(r => (r.frecency === null ? -Infinity : r.frecency));
                if (rank.some((v, i) => i > 0 && v > rank[i - 1])) failures.push(`rows are not ranked by frecency: ${JSON.stringify(rank)}`);
            }
            const marked = await query({ bookmarked: true });
            if (!has(marked.reply?.rows, aUrl) || has(marked.reply?.rows, bUrl)) failures.push(`bookmarked:true answered ${JSON.stringify(marked)}`);
            const unmarked = await query({ bookmarked: false });
            if (!has(unmarked.reply?.rows, bUrl) || has(unmarked.reply?.rows, aUrl)) failures.push(`bookmarked:false answered ${JSON.stringify(unmarked)}`);

            const viaReader = await diCall(evaluateIn, shell, 'ChromeStoreClient', 'queryTabsWithPlaces', [{ bookmarked: true }]);
            if (!has(viaReader.value, aUrl) || has(viaReader.value, bUrl)) failures.push(`ChromeStoreClient.queryTabsWithPlaces answered ${JSON.stringify(viaReader)}`);
            const access = await storeAccess(profileDir);
            if (!access) {
                failures.push('store-access.json never appeared in the profile -- the endpoint is not running');
            } else {
                const tool = await callTool(access, 'tabs_with_places', { bookmarked: false });
                if (!tool.ok || !has(tool.value?.rows, bUrl) || has(tool.value?.rows, aUrl)) failures.push(`tool tabs_with_places answered ${JSON.stringify(tool)}`);
            }
            const hostile = JSON.parse(await evaluateIn(bTab.context, actorRequestExpr({ kind: 'queryTabsWithPlaces' }, 4000)));
            const silent = unanswered(hostile, 'queryTabsWithPlaces');
            if (silent) failures.push(silent);
            if (hostile.reply?.ok === true || Array.isArray(hostile.reply?.rows)) {
                failures.push(`a 127.0.0.1 page in a stock tab ran the join: ${JSON.stringify(hostile)}`);
            }
        });
    } finally {
        await pages.close();
    }
    return failures;
});
