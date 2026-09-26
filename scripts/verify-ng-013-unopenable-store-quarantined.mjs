#!/usr/bin/env node
// scripts/verify-ng-013-unopenable-store-quarantined.mjs -- NG-013 (non-GUI
// wave A): a tabs.sqlite that cannot be opened is quarantined byte for byte
// and rebuilt at the head (MIGRATIONS.md:53); one newer than the build is left
// untouched and never quarantined (MIGRATIONS.md rule 4).

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { newProfile, runCheck, sleep, withShell } from './lib/ng-a-live.mjs';
import { buildStore, integrityOk, readStore, schemaHead, setUserVersion } from './lib/tab-store-fixtures.mjs';

await runCheck('verify-ng-013-unopenable-store-quarantined', async ({ expect }) => {
    const profile = newProfile('ng013');
    const path = join(profile, 'tabs.sqlite');
    const garbage = Buffer.alloc(8192, 0x5a);
    writeFileSync(path, garbage);
    await withShell(profile, async () => sleep(3000));
    const corrupt = `${path}.corrupt-1`;
    const quarantined = existsSync(corrupt) && readFileSync(corrupt).equals(garbage);
    expect(quarantined, `the unopenable tabs.sqlite was not quarantined byte for byte to ${corrupt}`);
    // Without the quarantine the live file is still the garbage, which no reader opens.
    if (quarantined) {
        const store = readStore(path);
        expect(store.version === schemaHead(), `after the quarantine tabs.sqlite is at version ${store.version}, want the head ${schemaHead()}`);
        expect(integrityOk(path), 'the rebuilt tabs.sqlite does not pass integrity_check');
    }
    const newer = newProfile('ng013-newer');
    const newerPath = join(newer, 'tabs.sqlite');
    buildStore(newerPath, schemaHead());
    setUserVersion(newerPath, 99);
    const bytes = readFileSync(newerPath);
    await withShell(newer, async () => sleep(3000));
    expect(!existsSync(`${newerPath}.corrupt-1`), 'a newer-than-head tabs.sqlite was quarantined instead of left untouched');
    expect(readFileSync(newerPath).equals(bytes), 'a newer-than-head tabs.sqlite was modified');
});
