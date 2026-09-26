#!/usr/bin/env node
// scripts/verify-ng-017-sql05-restarts-real-browser.mjs -- NG-017 (non-GUI
// wave A).
//
// The SQL-05 round-trip check (scripts/verify-sql-store-roundtrip.mjs) must
// restart the REAL browser on one profile. Observed from outside: the check
// runs with PB_FIREFOX_BIN pointing at a wrapper that logs every launch's
// arguments before exec'ing the real binary; it must pass AND launch the
// browser at least twice with the same --profile.

import { chmodSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { FIREFOX_BIN } from './lib/firefox-bidi.mjs';
import { REPO_ROOT, assertCleanTree } from './lib/ng-a-live.mjs';
import { newStage } from './lib/tab-store-fixtures.mjs';

assertCleanTree();
const stage = newStage('ng017');
const log = join(stage, 'launches.log');
const wrapper = join(stage, 'powerbrowser');
writeFileSync(wrapper, `#!/bin/sh\nprintf '%s\\n' "$*" >> ${JSON.stringify(log)}\nexec ${JSON.stringify(FIREFOX_BIN)} "$@"\n`);
chmodSync(wrapper, 0o755);
const run = spawnSync(process.execPath, [join(REPO_ROOT, 'scripts/verify-sql-store-roundtrip.mjs')], {
    env: { ...process.env, PB_FIREFOX_BIN: wrapper },
    encoding: 'utf8',
    timeout: 600000,
});
const launches = existsSync(log) ? readFileSync(log, 'utf8').split('\n').filter(Boolean) : [];
const profiles = launches.map(line => (/--profile (\S+)/.exec(line) || [])[1]).filter(Boolean);
const repeated = profiles.find((p, i) => profiles.indexOf(p) !== i);
rmSync(stage, { recursive: true, force: true });
const failures = [];
if (run.status !== 0) {
    failures.push(`the SQL-05 round-trip check failed (exit ${run.status}):\n${`${run.stdout}${run.stderr}`.trim().split('\n').slice(-15).join('\n')}`);
}
if (!repeated) {
    failures.push(`the SQL-05 round-trip check launched the browser ${launches.length} time(s) and never twice on one profile, so it does not restart the real browser`);
}
if (failures.length) {
    console.error('verify-ng-017-sql05-restarts-real-browser: FAIL');
    failures.forEach(f => console.error(`  ${f}`));
    process.exit(1);
}
console.log(`verify-ng-017-sql05-restarts-real-browser: PASS -- ${launches.length} launches, profile ${repeated} relaunched`);
