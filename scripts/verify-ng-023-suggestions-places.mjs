#!/usr/bin/env node
// scripts/verify-ng-023-suggestions-places.mjs
//
// NG-023: address-bar suggestions include history and bookmark matches, not
// only open tabs (13-UI-SPEC.md:141,192). Live, chrome-side (live-main).
// Driven through the DI-bound ChromeBarSuggestionService, the service the
// chrome bar widget injects and calls on every keystroke. Fixtures: one open
// tab, one history-only page, one bookmark, plus a bookmarklet and a file:
// bookmark that must never be offered as an address. Also: each address
// once, open tabs first, at most 8 rows, a typed % matches literally, and a
// 127.0.0.1 page in the selected stock tab cannot run the Places search
// (and gets a reply, the positive control that its request reached chrome).

import { actorRequestExpr, diCall, runCheck, seedPlaces, servePages, shellContext, unanswered, until, waitTheiaReady, withProfile } from './lib/ng-b-live.mjs';

const NAME = 'ng-023-suggestions-history-bookmarks';
const NONCE = `ng023${Date.now().toString(36)}`;
const HISTORY_ONLY = { url: `https://example.invalid/${NONCE}/history-only`, title: `HistoryOnly ${NONCE}` };
const BOOKMARKED = { url: `https://example.invalid/${NONCE}/bookmarked`, title: `Bookmarked ${NONCE}` };
const BOOKMARKLET = { url: `javascript:void('${NONCE}')`, title: `Bookmarklet ${NONCE}` };
const FILE_BOOKMARK = { url: `file:///tmp/${NONCE}.html`, title: `File ${NONCE}` };

runCheck(NAME, async () => {
    const failures = [];
    const pages = await servePages({ '/open': { title: `Open ${NONCE}` } });
    const openUrl = pages.url('/open');
    try {
        await withProfile(openUrl, async ({ evaluate, evaluateIn, send, topLevelContexts }) => {
            const shell = await shellContext(topLevelContexts, pages.origin);
            await waitTheiaReady(evaluateIn, shell);
            await seedPlaces(send, { history: [HISTORY_ONLY], bookmarks: [BOOKMARKED, BOOKMARKLET, FILE_BOOKMARK] });
            const search = prefix => diCall(evaluateIn, shell, 'ChromeBarSuggestionService', 'searchByPrefix', [prefix, 8]);
            const want = [openUrl, HISTORY_ONLY.url, BOOKMARKED.url];
            const complete = r => r.value && want.every(u => r.value.some(row => row.url === u));
            const final = (await until(async () => { const r = await search(NONCE); return complete(r) ? r : undefined; }, 30000)) ?? await search(NONCE);
            const rows = final.value ?? [];
            const urls = rows.map(row => row.url);
            for (const u of want) {
                if (!urls.includes(u)) failures.push(`the suggestions for the typed text lack ${u}: ${JSON.stringify(final)}`);
            }
            if (urls.some(u => !/^https?:\/\//.test(u))) failures.push(`a non-web address was suggested: ${JSON.stringify(urls)}`);
            if (new Set(urls).size !== urls.length) failures.push(`an address was suggested twice: ${JSON.stringify(urls)}`);
            if (rows.length > 8) failures.push(`${rows.length} rows came back; the dropdown cap is 8`);
            const placeIndexes = [HISTORY_ONLY.url, BOOKMARKED.url].map(u => urls.indexOf(u)).filter(i => i >= 0);
            if (urls.includes(openUrl) && placeIndexes.some(i => i < urls.indexOf(openUrl))) {
                failures.push(`an open tab ranks below a history or bookmark match: ${JSON.stringify(urls)}`);
            }
            const percent = await search('%');
            if ((percent.value ?? []).some(row => row.url.includes(NONCE))) failures.push('typing % listed the fixtures -- the Places search does not escape wildcards');
            const hostile = JSON.parse(await evaluate(actorRequestExpr({ kind: 'searchPlaces', text: NONCE, limit: 8 }, 4000)));
            const silent = unanswered(hostile, 'searchPlaces');
            if (silent) failures.push(silent);
            if (hostile.reply?.ok === true || JSON.stringify(hostile).includes(`${NONCE}/`)) {
                failures.push(`a 127.0.0.1 page in a stock tab ran the Places search: ${JSON.stringify(hostile)}`);
            }
        });
    } finally {
        await pages.close();
    }
    return failures;
});
