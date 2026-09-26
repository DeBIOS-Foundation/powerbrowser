#!/usr/bin/env node
// scripts/verify-ng-016-gui08-persistence-at-head.mjs -- NG-016 (non-GUI wave
// A): the gui08-persistence-roundtrip quick check passes against the writer's
// current schema head -- it declares that head, and both its default run and
// its --self-test (which requires the default run green) exit 0.

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { REPO_ROOT, schemaHead } from './lib/tab-store-fixtures.mjs';

const GATE = join(REPO_ROOT, 'scripts/verify-gui08-persistence-roundtrip.mjs');
const failures = [];
const declared = /const EXPECTED_SCHEMA_HEAD = (\d+);/.exec(readFileSync(GATE, 'utf8'));
const head = schemaHead();
if (!declared || Number(declared[1]) !== head) {
    failures.push(`the gui08 gate declares schema head ${declared ? declared[1] : '(none)'}, the writer's head is ${head}`);
}
for (const args of [[], ['--self-test']]) {
    const run = spawnSync(process.execPath, [GATE, ...args], { encoding: 'utf8' });
    if (run.status !== 0) {
        const tail = `${run.stdout}${run.stderr}`.trim().split('\n').slice(-6).join('\n    ');
        failures.push(`verify-gui08-persistence-roundtrip.mjs ${args.join(' ')} exits ${run.status}:\n    ${tail}`);
    }
}
if (failures.length) {
    console.error('verify-ng-016-gui08-persistence-at-head: FAIL');
    failures.forEach(f => console.error(`  ${f}`));
    process.exit(1);
}
console.log(`verify-ng-016-gui08-persistence-at-head: PASS -- the gui08 gate holds at schema head ${head}, self-test included`);
