#!/usr/bin/env node
// scripts/verify-ng-012-reader-reports-schema-errors.mjs -- NG-012 (non-GUI
// wave A): the Theia reader checks user_version and reports a store it cannot
// read as an error naming the version, instead of answering []; Organising
// shows its load-error state.

import { join } from 'node:path';
import { newProfile, runCheck, withShell } from './lib/ng-a-live.mjs';
import { buildStore, schemaHead, setUserVersion } from './lib/tab-store-fixtures.mjs';

await runCheck('verify-ng-012-reader-reports-schema-errors', async ({ expect }) => {
    const profile = newProfile('ng012');
    const path = join(profile, 'tabs.sqlite');
    buildStore(path, schemaHead(), { tabs: [{ uri: 'terminal:ng012', url: '', title: 't', last_active: 5 }] });
    setUserVersion(path, 99);
    const got = await withShell(profile, async ({ run }) => run(`
        await A.organising();
        return {
            groups: await A.outcome(() => A.reader().listGroups()),
            tray: await A.outcome(() => A.reader().listUngroupedTabs()),
            loadFailed: A.model().hasLoadFailed,
        };
    `));
    for (const name of ['groups', 'tray']) {
        expect(!got[name].resolved, `the reader answered ${name} from a schema-99 store instead of reporting an error: ${JSON.stringify(got[name])}`);
        expect(!got[name].resolved && /99/.test(got[name].message), `the reader's ${name} error does not name the store's version: ${JSON.stringify(got[name])}`);
    }
    expect(got.loadFailed === true, 'Organising painted an empty canvas instead of its load-error state');
});
