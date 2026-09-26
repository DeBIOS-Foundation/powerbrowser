#!/usr/bin/env node
// scripts/verify-ng-021-places-reads.mjs
//
// NG-021: Theia reads history entries, bookmarks and bookmark folders
// through the actor. Live, chrome-side (live-main). Three real entry points
// must each answer with the seeded fixture:
//   1. the actor message, sent from the Theia frame;
//   2. the DI-bound ChromeStoreClient (Theia's reader);
//   3. the endpoint's history_entry / bookmark_by_url / bookmark_folder tools,
//      relayed through the Theia frame (the runtime consumer).
// Then the hostile-page wall: a 127.0.0.1 page on a second port, in the
// selected stock tab, sends the same kinds and must get no data -- and must
// get a reply from chrome's handler for the kind (the positive control). Fixtures
// are seeded through the Places API from a chrome-scope evaluation (setup only).

import { actorRequest, actorRequestExpr, callTool, diCall, runCheck, seedPlaces, servePages, shellContext, storeAccess, unanswered, waitTheiaReady, withProfile } from './lib/ng-b-live.mjs';

const NAME = 'ng-021-places-reads-via-actor';
const NONCE = `ng021${Date.now().toString(36)}`;
const HISTORY = { url: `https://example.invalid/${NONCE}/history`, title: `History ${NONCE}` };
const BOOKMARK = { url: `https://example.invalid/${NONCE}/bookmark`, title: `Bookmark ${NONCE}` };

runCheck(NAME, async () => {
    const failures = [];
    const pages = await servePages({ '/loopback': { title: `Loopback ${NONCE}` } });
    try {
        await withProfile(pages.url('/loopback'), async ({ evaluate, evaluateIn, send, topLevelContexts, profileDir }) => {
            const shell = await shellContext(topLevelContexts, pages.origin);
            await waitTheiaReady(evaluateIn, shell);
            const folderGuid = await seedPlaces(send, { history: [HISTORY], bookmarks: [BOOKMARK] });
            const kinds = [
                { kind: 'readHistoryEntry', url: HISTORY.url },
                { kind: 'readBookmarkByUrl', url: BOOKMARK.url },
                { kind: 'listBookmarkFolder', folderGuid },
            ];

            // 1. The actor message from the Theia frame.
            const h = await actorRequest(evaluateIn, shell, kinds[0]);
            if (h.reply?.ok !== true || h.reply.entry?.url !== HISTORY.url || h.reply.entry?.title !== HISTORY.title) {
                failures.push(`actor readHistoryEntry from the Theia frame answered ${JSON.stringify(h)}`);
            }
            const b = await actorRequest(evaluateIn, shell, kinds[1]);
            if (b.reply?.ok !== true || b.reply.bookmark?.url !== BOOKMARK.url || b.reply.bookmark?.title !== BOOKMARK.title || typeof b.reply.bookmark?.guid !== 'string') {
                failures.push(`actor readBookmarkByUrl from the Theia frame answered ${JSON.stringify(b)}`);
            }
            const f = await actorRequest(evaluateIn, shell, kinds[2]);
            if (f.reply?.ok !== true || !Array.isArray(f.reply.rows) || !f.reply.rows.some(r => r.url === BOOKMARK.url && r.title === BOOKMARK.title)) {
                failures.push(`actor listBookmarkFolder from the Theia frame answered ${JSON.stringify(f)}`);
            }

            // 2. The DI-bound Theia reader.
            const dh = await diCall(evaluateIn, shell, 'ChromeStoreClient', 'readHistoryEntry', [HISTORY.url]);
            if (dh.value?.title !== HISTORY.title) failures.push(`ChromeStoreClient.readHistoryEntry answered ${JSON.stringify(dh)}`);
            const db = await diCall(evaluateIn, shell, 'ChromeStoreClient', 'readBookmarkByUrl', [BOOKMARK.url]);
            if (db.value?.title !== BOOKMARK.title) failures.push(`ChromeStoreClient.readBookmarkByUrl answered ${JSON.stringify(db)}`);
            const df = await diCall(evaluateIn, shell, 'ChromeStoreClient', 'listBookmarkFolder', [folderGuid]);
            if (!Array.isArray(df.value) || !df.value.some(r => r.url === BOOKMARK.url)) failures.push(`ChromeStoreClient.listBookmarkFolder answered ${JSON.stringify(df)}`);

            // 3. The endpoint's tools, relayed through a Theia window to the actor.
            const access = await storeAccess(profileDir);
            if (access.missing) {
                failures.push(access.missing);
            } else {
                const th = await callTool(access, 'history_entry', { url: HISTORY.url });
                if (!th.ok || th.value?.entry?.title !== HISTORY.title) failures.push(`tool history_entry answered ${JSON.stringify(th)}`);
                const tb = await callTool(access, 'bookmark_by_url', { url: BOOKMARK.url });
                if (!tb.ok || tb.value?.bookmark?.title !== BOOKMARK.title) failures.push(`tool bookmark_by_url answered ${JSON.stringify(tb)}`);
                const tf = await callTool(access, 'bookmark_folder', { guid: folderGuid });
                if (!tf.ok || !tf.value?.rows?.some(r => r.url === BOOKMARK.url)) failures.push(`tool bookmark_folder answered ${JSON.stringify(tf)}`);
            }

            // 4. Hostile local page: the selected stock tab sends the same kinds.
            for (const msg of kinds) {
                const r = JSON.parse(await evaluate(actorRequestExpr(msg, 4000)));
                const silent = unanswered(r, msg.kind);
                if (silent) failures.push(silent);
                if (r.reply?.ok === true || JSON.stringify(r).includes(`${NONCE}/`)) {
                    failures.push(`a 127.0.0.1 page in a stock tab read ${msg.kind}: ${JSON.stringify(r)}`);
                }
            }
        });
    } finally {
        await pages.close();
    }
    return failures;
});
