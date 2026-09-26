#!/usr/bin/env node
// scripts/verify-ng-014-rebuild-at-head.mjs -- NG-014 (non-GUI wave A): the
// quarantine rebuild of a store that trips quick_check creates the head
// schema, every head column included, and the Theia reader works on it.

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { newProfile, runCheck, withShell } from './lib/ng-a-live.mjs';
import { buildStore, columnsOf, readStore, schemaHead, tabColumnsAt, tamperBodyPage } from './lib/tab-store-fixtures.mjs';

await runCheck('verify-ng-014-rebuild-at-head', async ({ expect }) => {
    const profile = newProfile('ng014');
    const path = join(profile, 'tabs.sqlite');
    const head = schemaHead();
    buildStore(path, head, { tabs: [{ uri: 'terminal:ng014', url: '', title: 't', last_active: 5 }] });
    tamperBodyPage(path);
    const seen = await withShell(profile, async ({ run }) => run(`
        return {
            tray: await A.outcome(() => A.reader().listUngroupedTabs()),
            members: await A.outcome(() => A.reader().getGroupTabs('none')),
        };
    `));
    const quarantined = existsSync(`${path}.corrupt-1`);
    expect(quarantined, 'the tampered store was not quarantined, so the rebuild was not exercised');
    // Without the quarantine the live file is still the tampered one, which no reader opens.
    if (quarantined) {
        expect(readStore(path).version === head, `the quarantine rebuild left tabs.sqlite at version ${readStore(path).version}, want the head ${head}`);
        const cols = columnsOf(path, 'tabs');
        for (const col of tabColumnsAt(head)) {
            expect(cols.includes(col), `the rebuilt tabs table lacks the head column ${col}`);
        }
    }
    expect(seen.tray.resolved && seen.members.resolved, `the Theia reader failed on the rebuilt store: ${JSON.stringify(seen)}`);
});
