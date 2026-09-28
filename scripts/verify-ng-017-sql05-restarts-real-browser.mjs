#!/usr/bin/env node
// scripts/verify-ng-017-sql05-restarts-real-browser.mjs -- NG-017 (non-GUI
// wave A).
//
// The SQL-05 round-trip check (scripts/verify-sql-store-roundtrip.mjs) must
// restart the REAL browser on one profile, through a real quit. Observed from
// outside: the check runs with PB_FIREFOX_BIN pointing at a wrapper that logs
// every launch's arguments, runs the real binary, and logs how that launch
// ended -- "quit" when the browser exited on its own (the app's own quit,
// quitApp in scripts/lib/ng-a-live.mjs), "signalled" when the harness had to
// signal it (the wrapper passes the SIGTERM on). The check must pass, launch
// the browser at least twice with the same --profile, and end every launch a
// relaunch follows by a quit, never a signal: a SIGTERM skips
// profile-before-change and the shutdown writes the relaunch reads.

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
/** The launch wrapper: logs `launch <pid> <args>`, runs `real`, then logs `end <quit|signalled> <status|signal> <pid> <args>`, keeping the child's exit status/signal. */
function wrapperScript(real, logPath) {
    return [
        '#!/bin/sh',
        `log=${JSON.stringify(logPath)}`,
        'printf \'launch %s %s\\n\' "$$" "$*" >> "$log"',
        'how=quit',
        'status=0',
        `${JSON.stringify(real)} "$@" &`,
        'child=$!',
        'trap \'st=; { read -r st < "/proc/$child/stat"; } 2>/dev/null; case "${st##*) }" in ""|Z*) ;; *) how=signalled; kill -TERM "$child" 2>/dev/null;; esac\' TERM INT',
        '# A trapped signal interrupts wait; wait again until the browser is gone.',
        'while kill -0 "$child" 2>/dev/null; do wait "$child"; status=$?; done',
        'printf \'end %s %s %s %s\\n\' "$how" "$status" "$$" "$*" >> "$log"',
        '',
    ].join('\n');
}
writeFileSync(wrapper, wrapperScript(FIREFOX_BIN, log));
chmodSync(wrapper, 0o755);
const run = spawnSync(process.execPath, [join(REPO_ROOT, 'scripts/verify-sql-store-roundtrip.mjs')], {
    env: { ...process.env, PB_FIREFOX_BIN: wrapper },
    encoding: 'utf8',
    timeout: 600000,
});
const lines = existsSync(log) ? readFileSync(log, 'utf8').split('\n').filter(Boolean) : [];
const launches = lines.filter(line => line.startsWith('launch ')).map(line => line.slice('launch '.length).split(' ').slice(1).join(' '));
const ends = new Map(lines.filter(line => line.startsWith('end ')).map(line => {
    const [, how, , , ...args] = line.split(' ');
    return [args.join(' '), how];
}));
const byProfile = new Map();
for (const args of launches) {
    const profile = (/--profile (\S+)/.exec(args) || [])[1];
    if (profile) {
        byProfile.set(profile, [...(byProfile.get(profile) || []), args]);
    }
}
const relaunched = [...byProfile].filter(([, runs]) => runs.length > 1);
const repeated = relaunched.length ? relaunched[0][0] : undefined;
rmSync(stage, { recursive: true, force: true });
const failures = [];
if (run.status !== 0) {
    failures.push(`the SQL-05 round-trip check failed (exit ${run.status}):\n${`${run.stdout}${run.stderr}`.trim().split('\n').slice(-15).join('\n')}`);
}
if (!repeated) {
    failures.push(`the SQL-05 round-trip check launched the browser ${launches.length} time(s) and never twice on one profile, so it does not restart the real browser`);
}
for (const [profile, runs] of relaunched) {
    runs.slice(0, -1).forEach((args, i) => {
        const how = ends.get(args);
        if (how !== 'quit') {
            failures.push(`the SQL-05 round-trip check relaunched on ${profile} after launch ${i + 1} ${how ? 'was ended by a signal' : 'left no recorded end'}, not by the app's own quit (quitApp in scripts/lib/ng-a-live.mjs)`);
        }
    });
}
if (failures.length) {
    console.error('verify-ng-017-sql05-restarts-real-browser: FAIL');
    failures.forEach(f => console.error(`  ${f}`));
    process.exit(1);
}
console.log(`verify-ng-017-sql05-restarts-real-browser: PASS -- ${launches.length} launches, profile ${repeated} relaunched`);
