#!/usr/bin/env node
// scripts/verify-ng-022-sessionstore-projection.mjs
//
// NG-022: the sessionstore projection is reachable from Theia. Live,
// chrome-side (live-main). A served page opens in a stock tab; the projection
// must list it through the actor message sent from the Theia frame, through
// the DI-bound ChromeStoreClient, and through the endpoint's sessionstore_tabs
// tool (the runtime consumer). The same page -- a 127.0.0.1 page on a second
// port in the selected stock tab -- asks for the projection and gets no rows,
// but does get a reply from chrome's handler for the kind (the positive control).

import { actorRequest, actorRequestExpr, callTool, diCall, runCheck, servePages, shellContext, storeAccess, unanswered, until, waitTheiaReady, withProfile } from './lib/ng-b-live.mjs';

const NAME = 'ng-022-sessionstore-projection-via-actor';
const NONCE = `ng022${Date.now().toString(36)}`;

runCheck(NAME, async () => {
    const failures = [];
    const pages = await servePages({ '/page': { title: `Session ${NONCE}` } });
    const pageUrl = pages.url('/page');
    const lists = rows => Array.isArray(rows)
        && rows.some(row => row.url === pageUrl && row.title === `Session ${NONCE}` && typeof row.uri === 'string' && row.uri.length > 0);
    try {
        await withProfile(pageUrl, async ({ evaluate, evaluateIn, send, topLevelContexts, profileDir }) => {
            const shell = await shellContext(topLevelContexts, pages.origin);
            await waitTheiaReady(evaluateIn, shell);
            const ask = () => actorRequest(evaluateIn, shell, { kind: 'projectSessionStoreTabs' });
            if (!(await until(async () => lists((await ask()).reply?.rows), 30000))) {
                failures.push(`projectSessionStoreTabs from the Theia frame never listed ${pageUrl}: ${JSON.stringify(await ask())}`);
            }
            const viaReader = await diCall(evaluateIn, shell, 'ChromeStoreClient', 'projectSessionStoreTabs');
            if (!lists(viaReader.value)) failures.push(`ChromeStoreClient.projectSessionStoreTabs answered ${JSON.stringify(viaReader)}`);
            const access = await storeAccess(profileDir);
            if (access.missing) {
                failures.push(access.missing);
            } else {
                const tool = await callTool(access, 'sessionstore_tabs', {});
                if (!tool.ok || !lists(tool.value?.rows)) failures.push(`tool sessionstore_tabs answered ${JSON.stringify(tool)}`);
            }
            const hostile = JSON.parse(await evaluate(actorRequestExpr({ kind: 'projectSessionStoreTabs' }, 4000)));
            const silent = unanswered(hostile, 'projectSessionStoreTabs');
            if (silent) failures.push(silent);
            if (hostile.reply?.ok === true || Array.isArray(hostile.reply?.rows)) {
                failures.push(`a 127.0.0.1 page in a stock tab read the sessionstore projection: ${JSON.stringify(hostile)}`);
            }
        });
    } finally {
        await pages.close();
    }
    return failures;
});
