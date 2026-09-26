#!/usr/bin/env node
// scripts/verify-telemetry.mjs
//
// The telemetry gate (04-03, TEL-01/TEL-02): the manifest's [telemetry]
// reaches the sidecar as the powerbrowserTelemetry block, and the
// batching sender's unit suite is green.
//
// WHAT IT ASSERTS. All three expectations are DERIVED at check time --
// from the manifest through scripts/generate.mjs's own resolver and
// emitter -- never kept here:
//
//  1. generated/theia-telemetry.json parses and equals what the manifest
//     emits right now (a drifted level or endpoint fails naming the key).
//     Absent fragment SKIPS this step only: generated/ is git-ignored,
//     so that is the state of every fresh clone, and a gate red on it
//     would be a gate its readers skip (generate-check's own rule).
//  2. theia/applications/browser/package.json's theia.frontend.config
//     powerbrowserTelemetry block equals that same map (a manifest at
//     level off and a block still carrying an endpoint is stale output,
//     not a clean tree). The tracked file is committed, so this step
//     always runs -- it is what pins the yarn-managed side.
//  3. The sender compiles (tsc -b, skipped with a message where the theia
//     install is absent) and its plain-node unit suite passes: off sends
//     nothing, batches flush on size and interval, failures retry then
//     drop, runtime level changes take effect.
//
// Honestly --quick: it reads text files, runs tsc on one extension and
// runs a dependency-free node suite. No app build, no browser, no
// display, no network.
//
// Usage:
//   node scripts/verify-telemetry.mjs
//   node scripts/verify-telemetry.mjs --self-test
//
// The self-test plants three faults and requires each to go red: the
// suite run against the always-send stub (the off assertion must fail),
// a drifted tracked block, and a drifted fragment -- each with the
// unmutated control green first, so a red is plant-caused. It also drives
// the NG-067 error reporter into the real sender: the sent payload carries
// no message, no stack and no path beyond a base name, a hostile event
// never throws out of the listener, and a repeated error is sent once.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { emitTheiaTelemetry, resolveConfig } from './generate.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'verify-telemetry';

const args = process.argv.slice(2);
const SELF_TEST = args.includes('--self-test');
for (const a of args) {
    if (a !== '--self-test') {
        console.error(`${NAME}: FAIL -- unknown argument '${a}'`);
        process.exit(2);
    }
}

const MANIFEST_REL = 'configuration.toml';
const FRAGMENT_REL = 'generated/theia-telemetry.json';
const APP_PKG_REL = 'theia/applications/browser/package.json';
const BLOCK_KEY = 'powerbrowserTelemetry';
const TEST_REL = 'theia/extensions/telemetry/test/telemetry-sender.test.mjs';
const SENDER_REL = 'theia/extensions/telemetry/src/browser/telemetry-sender.ts';
const REPORT_REL = 'theia/extensions/telemetry/src/browser/telemetry-error-report.ts';
const TSC_REL = 'theia/node_modules/typescript/bin/tsc';
const EXT_REL = 'theia/extensions/telemetry';
const RERUN_GENERATE = 'node scripts/generate.mjs';

function readBytes(root, rel) {
    const p = join(root, rel);
    if (!existsSync(p)) return null;
    return readFileSync(p);
}

function runPinChecks(root) {
    const failures = [];

    // --- 0. the manifest resolves -----------------------------------------
    const { failures: resolveFailures, config } = resolveConfig(join(root, MANIFEST_REL), undefined);
    if (resolveFailures.length > 0) {
        for (const f of resolveFailures) failures.push(`${MANIFEST_REL} is red, so the telemetry pins prove nothing: ${f}`);
        return { failures, skipped: [], expected: null };
    }
    const skipped = [];

    // The expectation both file comparisons measure against: what the
    // manifest emits right now.
    let expected;
    try {
        expected = JSON.parse(emitTheiaTelemetry(config, { id: 'dev' }));
    } catch {
        failures.push(`the emitted ${FRAGMENT_REL} is not valid JSON, so it cannot be compared. Next step: report this; ${MANIFEST_REL} is not the cause and editing it will not help.`);
        return { failures, skipped, expected: null };
    }

    // --- 1. the generated fragment -----------------------------------------
    const fragmentBytes = readBytes(root, FRAGMENT_REL);
    if (fragmentBytes === null) {
        skipped.push(`${FRAGMENT_REL} is absent (nothing generated in this copy yet) -- fragment equality unchecked; run ${RERUN_GENERATE} to cover it.`);
    } else {
        let fragment;
        try {
            fragment = JSON.parse(fragmentBytes.toString('utf8'));
        } catch {
            failures.push(`${FRAGMENT_REL} is not valid JSON, so it cannot be compared against ${MANIFEST_REL}. Next step: run ${RERUN_GENERATE} to rewrite it, then re-run this check.`);
            fragment = null;
        }
        if (fragment !== null) {
            for (const key of Object.keys(expected)) {
                if (!Object.hasOwn(fragment, key)) {
                    failures.push(`${FRAGMENT_REL} is missing ${JSON.stringify(key)} -- stale output. Next step: run ${RERUN_GENERATE}, then re-run this check.`);
                } else if (JSON.stringify(fragment[key]) !== JSON.stringify(expected[key])) {
                    failures.push(`${FRAGMENT_REL} carries ${JSON.stringify(key)} = ${JSON.stringify(fragment[key])} but ${MANIFEST_REL} emits ${JSON.stringify(expected[key])} -- stale output. Next step: run ${RERUN_GENERATE}, then re-run this check.`);
                }
            }
            for (const key of Object.keys(fragment ?? {})) {
                if (!Object.hasOwn(expected, key)) {
                    failures.push(`${FRAGMENT_REL} carries ${JSON.stringify(key)}, which ${MANIFEST_REL} no longer emits -- stale output. Next step: run ${RERUN_GENERATE}, then re-run this check.`);
                }
            }
        }
    }

    // --- 2. the application package.json block ------------------------------
    const pkgBytes = readBytes(root, APP_PKG_REL);
    if (pkgBytes === null) {
        failures.push(`${APP_PKG_REL} does not exist, so the ${BLOCK_KEY} block cannot be checked at all.`);
        return { failures, skipped, expected };
    }
    let pkg;
    try {
        pkg = JSON.parse(pkgBytes.toString('utf8'));
    } catch {
        failures.push(`${APP_PKG_REL} is not valid JSON, so the ${BLOCK_KEY} block cannot be checked at all.`);
        return { failures, skipped, expected };
    }
    const block = pkg?.theia?.frontend?.config?.[BLOCK_KEY];
    if (block === undefined) {
        failures.push(`${APP_PKG_REL}'s theia.frontend.config carries no ${BLOCK_KEY} block but ${MANIFEST_REL} emits ${JSON.stringify(expected)} -- stale output. Next step: copy the block from ${FRAGMENT_REL} (that key only; leave every sibling key byte-identical), then re-run this check.`);
    } else if (JSON.stringify(block) !== JSON.stringify(expected)) {
        failures.push(`${APP_PKG_REL}'s ${BLOCK_KEY} block is ${JSON.stringify(block)} but ${MANIFEST_REL} emits ${JSON.stringify(expected)} -- stale output. Next step: copy the block from ${FRAGMENT_REL} (that key only; leave every sibling key byte-identical), then re-run this check.`);
    }

    return { failures, skipped, expected };
}

function runChild(label, cmd, argv, env) {
    const child = spawnSync(cmd, argv, { cwd: REPO_ROOT, encoding: 'utf8', env: env ?? process.env });
    const output = `${child.stdout ?? ''}${child.stderr ?? ''}`;
    return { status: child.status ?? 1, output, label };
}

function runBuildChecks() {
    const failures = [];
    const skipped = [];

    // --- 3. the extension compiles ------------------------------------------
    if (!existsSync(join(REPO_ROOT, TSC_REL))) {
        skipped.push(`the theia install is absent (${TSC_REL} not found) -- tsc proof unchecked; run the audited theia install, then re-run this check.`);
    } else {
        const tsc = runChild('tsc', process.execPath, [TSC_REL, '-b', EXT_REL]);
        if (tsc.status !== 0) {
            failures.push(`${EXT_REL} does not compile cleanly:\n${tsc.output.split('\n').filter(l => l.trim() !== '').slice(0, 20).join('\n')}`);
        }
    }

    // --- 4. the unit suite ----------------------------------------------------
    // Dependency-free: the sender imports nothing, so this runs on a bare
    // node with no install and no build.
    const suite = runChild('suite', process.execPath, [TEST_REL]);
    if (suite.status !== 0) {
        failures.push(`the telemetry unit suite is red:\n${suite.output.split('\n').filter(l => l.trim() !== '' && !l.includes('MODULE_TYPELESS_PACKAGE_JSON') && !l.includes('trace-warnings')).join('\n')}`);
    }

    return { failures, skipped };
}

function main() {
    const { failures: pinFailures, skipped: pinSkipped } = runPinChecks(REPO_ROOT);
    const { failures: buildFailures, skipped: buildSkipped } = runBuildChecks();
    for (const s of [...pinSkipped, ...buildSkipped]) console.log(`${NAME}: SKIP -- ${s}`);
    const failures = [...pinFailures, ...buildFailures];
    if (failures.length > 0) {
        console.error(`${NAME}: FAIL -- ${failures.length} problem(s)`);
        for (const f of failures) console.error(`  - ${f}`);
        process.exit(1);
    }
    console.log(`${NAME}: PASS -- telemetry fragment, block, compile and suite all green`);
}

function copyInto(root, rel) {
    const dest = join(root, rel);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(join(REPO_ROOT, rel), dest);
}

async function selfTest() {
    let failed = 0;
    const complain = (name, why) => {
        console.error(`${NAME}: --self-test FAIL -- '${name}' ${why}`);
        failed += 1;
    };

    // Green control first: the unmutated tree proves nothing if red.
    const control = runPinChecks(REPO_ROOT);
    if (control.failures.length > 0) {
        complain('unmutated control', `is already red, so the plants below would mean nothing: ${control.failures.join(' | ')}`);
    } else {
        console.log(`  ok  unmutated control -> pin checks green`);
    }
    const suiteControl = runChild('suite', process.execPath, [TEST_REL]);
    if (suiteControl.status !== 0) {
        complain('unmutated suite', `is already red, so the stub plant below would mean nothing: ${suiteControl.output}`);
    } else {
        console.log(`  ok  unmutated suite -> green`);
    }

    // Plant 1: the suite against the always-send stub must go red ON THE
    // OFF ASSERTION -- this is the discrimination proof Task 2 requires.
    {
        const stubbed = runChild('stubbed-suite', process.execPath, [TEST_REL], { ...process.env, TELEMETRY_TEST_STUB: 'always-send' });
        if (stubbed.status === 0) {
            complain('always-send stub', 'planted no fault at all: the suite stayed green against a sender that ignores the level');
        } else if (!stubbed.output.includes('not ok - off sends nothing')) {
            complain('always-send stub', `went red, but not on the off assertion: ${stubbed.output}`);
        } else {
            console.log(`  ok  always-send stub -> red, naming 'not ok - off sends nothing'`);
        }
    }

    // Plant 2: a drifted tracked block must go red naming the block.
    // Plant 3: a drifted fragment must go red naming the fragment.
    for (const plant of [
        { name: 'drifted tracked block', rel: APP_PKG_REL, drift: text => text.replace('"level": "off"', '"level": "all"'), expect: BLOCK_KEY },
        { name: 'drifted fragment', rel: FRAGMENT_REL, drift: text => text.replace('"level": "off"', '"level": "error"'), expect: FRAGMENT_REL },
    ]) {
        const dir = mkdtempSync(join(tmpdir(), 'telemetry-selftest-'));
        try {
            copyInto(dir, MANIFEST_REL);
            copyInto(dir, FRAGMENT_REL);
            copyInto(dir, APP_PKG_REL);
            const target = join(dir, plant.rel);
            writeFileSync(target, plant.drift(readFileSync(target, 'utf8')), 'utf8');
            if (readFileSync(target, 'utf8') === readFileSync(join(REPO_ROOT, plant.rel), 'utf8')) {
                complain(plant.name, 'planted no fault at all: the drift did not land');
                continue;
            }
            const { failures } = runPinChecks(dir);
            if (!failures.some(f => f.includes(plant.expect))) {
                complain(plant.name, `did not go red naming '${plant.expect}'; got: ${failures.join(' | ') || '(no failures at all)'}`);
            } else {
                console.log(`  ok  ${plant.name} -> red, naming '${plant.expect}'`);
            }
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    }

    // Case 4 (NG-067): the error reporter and the sender are both
    // zero-dependency, so this drives them together under plain node. The
    // logger stand-in is telemetry-logger.ts's error translation (that file
    // imports Theia and cannot load here).
    {
        const { ErrorReporter } = await import(pathToFileURL(join(REPO_ROOT, REPORT_REL)).href);
        const { PowerBrowserTelemetrySender } = await import(pathToFileURL(join(REPO_ROOT, SENDER_REL)).href);
        const bodies = [];
        const sender = new PowerBrowserTelemetrySender({
            endpoint: 'https://self-test.invalid/collect',
            getLevel: () => 'error',
            fetchFn: (url, init) => { bodies.push(init.body); return Promise.resolve({ ok: true }); },
            flushIntervalMs: 0,
        });
        const reporter = new ErrorReporter({ sender, logError: (name, data) => sender.sendErrorData(name, data) });
        const secret = '/home/self-test/private/notes.txt';
        const thrown = {
            error: new TypeError(`Unable to read file '${secret}'`),
            message: `Uncaught TypeError: Unable to read file '${secret}'`,
            filename: 'http://127.0.0.1:3000/lib/frontend/bundle.js?v=1#top',
            lineno: 12,
            colno: 34,
        };
        const escaped = [];
        for (const call of [
            () => reporter.onError(thrown),
            () => reporter.onError(thrown),
            () => reporter.onRejection({ reason: new RangeError(secret) }),
            () => reporter.onError({ get error() { throw new Error(secret); }, filename: `data:text/javascript,${secret}`, lineno: '12' }),
            () => reporter.onRejection({ reason: Object.create(null) }),
            () => reporter.onRejection(null),
        ]) {
            try { call(); } catch (e) { escaped.push(String(e)); }
        }
        await sender.flush();
        const text = bodies.join('\n');
        const events = bodies.flatMap(b => JSON.parse(b).events);
        const repeated = events.filter(e => e.data?.source === 'bundle.js');
        const problems = [];
        if (escaped.length > 0) problems.push(`a hostile event threw out of the listener: ${escaped.join(' | ')}`);
        if (repeated.length !== 1) problems.push(`the repeated error was sent ${repeated.length} time(s), not once`);
        else if (JSON.stringify(repeated[0].data) !== JSON.stringify({ type: 'TypeError', source: 'bundle.js', line: 12, column: 34 })) problems.push(`the uncaught-error payload is ${JSON.stringify(repeated[0].data)}`);
        if (!events.some(e => e.name === 'frontend.unhandled-rejection' && e.data?.type === 'RangeError')) problems.push('the rejection was not sent with its type');
        if (events.length !== 5) problems.push(`expected 5 events (one per distinct error), got ${events.length}`);
        if (/message|stack|Unable|self-test|notes|\//.test(text)) problems.push(`the sent bodies carry message text, a stack or a path: ${text}`);
        if (problems.length > 0) complain('error report', problems.join('; '));
        else console.log(`  ok  error report -> no message, stack or path; hostile events contained; a repeat sent once`);
    }

    if (failed > 0) return 1;
    console.log(`${NAME}: --self-test PASS -- 3 planted faults and the error-report case all behaved as pinned`);
    return 0;
}

if (SELF_TEST) {
    process.exit(await selfTest());
} else if (args.length === 0) {
    main();
}
