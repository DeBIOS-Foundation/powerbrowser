#!/usr/bin/env node
// scripts/verify-ng-020-absence-wiring-by-call.mjs -- NG-020 (non-GUI wave A).
//
// The SQL-store absence instrument decides whether the startup wiring exists
// before its live drive. That answer must rest on the call itself, not on a
// text pattern a comment also satisfies, and absent wiring must fail the
// instrument rather than let it exit STAGED (0).
//   1. Plant: TheiaService's source with each startup call turned into a
//      comment that still names it -> the gate must answer "unwired"; the
//      real source -> "wired".
//   2. The instrument must take its answer from that gate, and its
//      absent-wiring branch must fail, not stage.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { startupWiringPresent } from './lib/startup-wiring.mjs';
import { REPO_ROOT } from './lib/tab-store-fixtures.mjs';

const failures = [];
const file = 'powerbrowser/shell/TheiaService.sys.mjs';
const real = readFileSync(join(REPO_ROOT, file), 'utf8');
const planted = real
    .replace(/await PowerBrowserAPI\.ensureTabStore\(\)/g, 'undefined /* PowerBrowserAPI.ensureTabStore() */')
    .replace(/PowerBrowserAPI\.startTabStoreTriggers\(\)/g, 'undefined /* PowerBrowserAPI.startTabStoreTriggers() */');
if (planted === real) {
    failures.push(`the plant did not land: no startup call found in ${file}`);
} else {
    if (!startupWiringPresent({ [file]: real })) {
        failures.push(`the real ${file} reads as unwired`);
    }
    if (startupWiringPresent({ [file]: planted })) {
        failures.push(`a ${file} whose startup calls are only comments still reads as wired: the gate matches text, not the call`);
    }
}
const instrument = readFileSync(join(REPO_ROOT, 'scripts/verify-sql-store-absence.mjs'), 'utf8');
if (!/from '\.\/lib\/startup-wiring\.mjs'/.test(instrument)) {
    failures.push('the absence instrument does not take its wiring answer from scripts/lib/startup-wiring.mjs');
}
/** `text` with comments removed and string literals emptied: only code is left to hold a call. */
const codeOf = text => text.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*|'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/g,
    token => (token[0] === '/' ? '' : token[0] + token[0]));
const branch = /^\s*if \(!startupWiringPresent\(\)\) \{([\s\S]*?)\n  \}/m.exec(instrument);
const body = branch ? codeOf(branch[1]) : '';
if (!branch || !/\bfail\(/.test(body) || /\bstaged\(/.test(body)) {
    failures.push('absent startup wiring ends the absence instrument as STAGED (exit 0), not as a failure');
}
if (failures.length) {
    console.error('verify-ng-020-absence-wiring-by-call: FAIL');
    failures.forEach(f => console.error(`  ${f}`));
    process.exit(1);
}
console.log('verify-ng-020-absence-wiring-by-call: PASS -- the gate needs the call, and absent wiring fails the instrument');
