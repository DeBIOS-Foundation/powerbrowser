#!/usr/bin/env node
// scripts/verify-crash-collector.mjs
//
// The crash-collector contract gate (09-02, TEL-04): the Antenna-protocol
// surface stays pinned while the native reporter stays compiled out.
//
// WHAT IT ASSERTS. Every expectation is DERIVED at check time -- from
// scripts/crash-collector.mjs's own exports -- never kept here:
//
//  1. docs/CRASH-POLICY.md states every contract literal the code exports
//     (submit path, minidump part name, response shapes, rejection
//     vocabulary, retention window, throttle rule and budget, annotation
//     allowlist). A policy edit that drops a literal fails NAMING it: the
//     doc is the reviewable source, so drift there is the defect.
//  2. The contract builders emit their exact shapes (CrashID=, Discarded=).
//  3. --self-test exercises handleSubmit in process with byte fixtures in a
//     temp dir and no sockets: well-formed input answers the CrashID body
//     plus a matching store record, each malformed class answers its named
//     discard reason on the rejection status, over-cap input answers the
//     oversized rejection, and a tripped throttle rule answers the
//     soft-reject body on the success status -- with the store dir proven
//     empty after every rejection, so no plant passes vacuously.
//
// Honestly --quick: node:crypto plus text/bytes in mkdtemp. No build, no
// browser, no display, no network.
//
// Usage:
//   node scripts/verify-crash-collector.mjs
//   node scripts/verify-crash-collector.mjs --self-test
//
// The self-test runs a green control first, then one plant per contract
// direction, each required to go red naming its rule.

import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import {
    ANNOTATION_ALLOWLIST,
    LOOPBACK_HOST,
    MAX_ANNOTATION_BYTES,
    MAX_BODY_BYTES,
    MAX_PARTS,
    MINIDUMP_PART_NAME,
    REASON_NO_MINIDUMP,
    REASON_OVERSIZED,
    REASON_STORE_UNAVAILABLE,
    REASON_WRONG_CONTENT_TYPE,
    RETENTION_DAYS,
    SUBMIT_PATH,
    THROTTLE_MAX_SUBMITS,
    THROTTLE_RULE,
    THROTTLE_WINDOW_MS,
    buildCrashIdResponse,
    buildDiscardResponse,
    checkThrottle,
    createThrottleState,
    handleSubmit,
    parseMultipart,
} from './crash-collector.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'verify-crash-collector';

const args = process.argv.slice(2);
const SELF_TEST = args.includes('--self-test');
for (const a of args) {
    if (a !== '--self-test') {
        console.error(`${NAME}: FAIL -- unknown argument '${a}'`);
        process.exit(2);
    }
}

const POLICY_REL = 'docs/CRASH-POLICY.md';

// --- assertion plumbing (the installer-schema skeleton) ----------------------
//
// Failures accumulate rather than throwing: one run should report every
// wrong literal, not just the first.
function makeReporter() {
    const failures = [];
    return {
        failures,
        fail(msg) { failures.push(msg); },
        eq(label, actual, expected, where) {
            if (actual === expected) return true;
            failures.push(
                `${label}: ${where} carries ${JSON.stringify(actual)} but must equal ` +
                `${JSON.stringify(expected)}`,
            );
            return false;
        },
    };
}

function runChecks(root) {
    const r = makeReporter();

    // --- 1. the policy states every contract literal the code exports ------
    let policy;
    try {
        policy = readFileSync(join(root, POLICY_REL), 'utf8');
    } catch {
        r.fail(`${POLICY_REL} is absent, so the enforced crash policy has no reviewable source. Next step: restore it; the collector enforces what that page states.`);
        return { failures: r.failures };
    }
    const states = (literal, what) => {
        if (!policy.includes(literal)) {
            r.fail(`${POLICY_REL} no longer states ${what} (${JSON.stringify(literal)}) but the collector enforces it -- policy drift. Next step: restore the literal in the doc (the doc wins; the code is not the place to fix this).`);
        }
    };
    states(SUBMIT_PATH, 'the submit path');
    states(MINIDUMP_PART_NAME, 'the minidump part name');
    states('CrashID=', 'the accept response shape');
    states('Discarded=', 'the rejection response shape');
    states(REASON_WRONG_CONTENT_TYPE, 'the wrong-content-type reason');
    states(REASON_NO_MINIDUMP, 'the missing-minidump reason');
    states(REASON_OVERSIZED, 'the oversized reason');
    states(REASON_STORE_UNAVAILABLE, 'the store-unavailable reason');
    states(THROTTLE_RULE, 'the throttle rule');
    states(String(RETENTION_DAYS), 'the retention window');
    states(String(THROTTLE_MAX_SUBMITS), 'the throttle budget');
    states(String(THROTTLE_WINDOW_MS / 1000), 'the throttle window seconds');
    states(String(MAX_PARTS), 'the part-count cap');
    states(String(MAX_ANNOTATION_BYTES), 'the annotation value cap');
    states(LOOPBACK_HOST, 'the loopback bind');
    for (const field of ANNOTATION_ALLOWLIST) {
        states(field, `the allowlisted annotation ${JSON.stringify(field)}`);
    }

    // --- 2. the contract surface is importable and shaped -------------------
    for (const f of ['parseMultipart', 'buildCrashIdResponse', 'buildDiscardResponse']) {
        if (f === 'parseMultipart' && typeof parseMultipart !== 'function') r.fail(`the collector no longer exports a parseMultipart function -- the contract surface moved. Next step: restore the export; this gate imports it, never a kept copy.`);
        if (f === 'buildCrashIdResponse' && typeof buildCrashIdResponse !== 'function') r.fail(`the collector no longer exports a buildCrashIdResponse function -- the contract surface moved. Next step: restore the export; this gate imports it, never a kept copy.`);
        if (f === 'buildDiscardResponse' && typeof buildDiscardResponse !== 'function') r.fail(`the collector no longer exports a buildDiscardResponse function -- the contract surface moved. Next step: restore the export; this gate imports it, never a kept copy.`);
    }
    r.eq('CrashID shape', buildCrashIdResponse('test-id'), 'CrashID=test-id', 'buildCrashIdResponse');
    r.eq('Discard shape', buildDiscardResponse('some_rule'), 'Discarded=some_rule', 'buildDiscardResponse');

    return { failures: r.failures };
}

function main() {
    const { failures } = runChecks(REPO_ROOT);
    if (failures.length > 0) {
        console.error(`${NAME}: FAIL -- ${failures.length} problem(s)`);
        for (const f of failures) console.error(`  - ${f}`);
        process.exit(1);
    }
    console.log(`${NAME}: PASS -- policy states the enforced contract and the response shapes hold`);
}

// --- --self-test ---------------------------------------------------------------

const SELFTEST_BOUNDARY = 'SELFTEST-BOUNDARY';

function buildMultipart(parts) {
    const chunks = [];
    for (const part of parts) {
        chunks.push(Buffer.from(
            `--${SELFTEST_BOUNDARY}\r\n`
            + `Content-Disposition: form-data; name="${part.name}"${part.filename ? `; filename="${part.filename}"` : ''}\r\n`
            + `Content-Type: ${part.contentType ?? 'application/octet-stream'}\r\n\r\n`,
            'latin1',
        ));
        chunks.push(part.data);
        chunks.push(Buffer.from('\r\n', 'latin1'));
    }
    chunks.push(Buffer.from(`--${SELFTEST_BOUNDARY}--\r\n`, 'latin1'));
    return Buffer.concat(chunks);
}

const SELFTEST_CONTENT_TYPE = `multipart/form-data; boundary=${SELFTEST_BOUNDARY}`;
const NOW = 1720000000000;

function wellFormedBody() {
    return buildMultipart([
        { name: MINIDUMP_PART_NAME, filename: 'a1b2.dmp', data: Buffer.from('MINIDUMP-BYTES-FIXTURE') },
        { name: 'ProductName', data: Buffer.from('PowerBrowser') },
        { name: 'Version', data: Buffer.from('1.0') },
        { name: 'SecretField', data: Buffer.from('must-never-be-stored') },
    ]);
}

function selfTest() {
    const dir = mkdtempSync(join(tmpdir(), 'crash-collector-selftest-'));
    let ok = true;
    try {
        const storeOf = (plant) => join(dir, `store-${plant}`);
        const storeIsEmpty = (storeDir) => {
            try {
                return readdirSync(storeDir).length === 0;
            } catch {
                return true; // never created: nothing was written, which is the claim
            }
        };
        const expectVerdict = (label, verdict, wantStatus, wantBody, storeDir) => {
            const namesRule = verdict.body.includes(wantBody);
            if (verdict.status !== wantStatus || !namesRule) {
                console.error(`${NAME}: --self-test FAIL -- ${label} answered ${verdict.status} ${JSON.stringify(verdict.body)}, want ${wantStatus} naming ${JSON.stringify(wantBody)}`);
                ok = false;
            } else if (!storeIsEmpty(storeDir)) {
                console.error(`${NAME}: --self-test FAIL -- ${label} wrote to the store on a rejection path -- rejections must leave no record`);
                ok = false;
            } else {
                console.log(`${NAME}: --self-test -- ${label} REJECTED: ${verdict.status} ${verdict.body}`);
            }
        };

        // Control: well-formed input is GREEN -- answers CrashID plus a
        // matching store record with the allowlist enforced. Without this,
        // a red after a plant below could be fixture-shaped rather than
        // plant-caused.
        {
            const storeDir = storeOf('control');
            const verdict = handleSubmit({
                body: wellFormedBody(),
                contentType: SELFTEST_CONTENT_TYPE,
                storeDir,
                throttle: createThrottleState(),
                nowMs: NOW,
            });
            const idMatch = /^CrashID=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/.exec(verdict.body);
            if (verdict.status !== 200 || !idMatch) {
                console.error(`${NAME}: --self-test FAIL -- the well-formed control is already red (${verdict.status} ${JSON.stringify(verdict.body)}), so a red result after a plant would prove nothing`);
                ok = false;
            } else {
                const id = idMatch[1];
                let record;
                try {
                    record = JSON.parse(readFileSync(join(storeDir, `${id}.json`), 'utf8'));
                } catch {
                    record = null;
                }
                const dump = (() => {
                    try {
                        return readFileSync(join(storeDir, `${id}.dmp`));
                    } catch {
                        return null;
                    }
                })();
                if (!record || record.id !== id) {
                    console.error(`${NAME}: --self-test FAIL -- the well-formed control left no matching store record for ${id}`);
                    ok = false;
                } else if (record.annotations.SecretField !== undefined) {
                    console.error(`${NAME}: --self-test FAIL -- the well-formed control stored the unlisted annotation SecretField -- the allowlist is not enforced`);
                    ok = false;
                } else if (record.annotations.ProductName !== 'PowerBrowser') {
                    console.error(`${NAME}: --self-test FAIL -- the well-formed control dropped the allowlisted annotation ProductName`);
                    ok = false;
                } else if (!dump || dump.toString() !== 'MINIDUMP-BYTES-FIXTURE') {
                    console.error(`${NAME}: --self-test FAIL -- the well-formed control stored wrong minidump bytes`);
                    ok = false;
                } else {
                    console.log(`${NAME}: --self-test -- the well-formed control is GREEN (${verdict.body}, record matches, allowlist holds)`);
                }
            }
        }

        // Plant 1: non-multipart content -- the wrong-content-type reason on 400.
        expectVerdict(
            'non-multipart content',
            handleSubmit({
                body: Buffer.from('{"not":"multipart"}'),
                contentType: 'application/json',
                storeDir: storeOf('content-type'),
                throttle: createThrottleState(),
                nowMs: NOW,
            }),
            400,
            REASON_WRONG_CONTENT_TYPE,
            storeOf('content-type'),
        );

        // Plant 2: multipart framing with no minidump part -- the
        // missing-minidump reason on 400.
        expectVerdict(
            'multipart with no minidump part',
            handleSubmit({
                body: buildMultipart([{ name: 'ProductName', data: Buffer.from('PowerBrowser') }]),
                contentType: SELFTEST_CONTENT_TYPE,
                storeDir: storeOf('no-minidump'),
                throttle: createThrottleState(),
                nowMs: NOW,
            }),
            400,
            REASON_NO_MINIDUMP,
            storeOf('no-minidump'),
        );

        // Plant 3: body past the total cap -- the oversized rejection on 413.
        expectVerdict(
            'over-cap body',
            handleSubmit({
                body: Buffer.concat([Buffer.alloc(MAX_BODY_BYTES + 1, 0x41)]),
                contentType: SELFTEST_CONTENT_TYPE,
                storeDir: storeOf('oversized'),
                throttle: createThrottleState(),
                nowMs: NOW,
            }),
            413,
            REASON_OVERSIZED,
            storeOf('oversized'),
        );

        // Plant 4: more parts than the count cap -- the oversized
        // rejection on 413. Proves the count cap is not the total-body
        // cap wearing a second message: this body is far under it.
        {
            const many = [{ name: MINIDUMP_PART_NAME, filename: 'a.dmp', data: Buffer.from('D') }];
            for (let i = 0; i < MAX_PARTS; i++) many.push({ name: 'ProductName', data: Buffer.from(`v${i}`) });
            expectVerdict(
                'over-count parts',
                handleSubmit({
                    body: buildMultipart(many),
                    contentType: SELFTEST_CONTENT_TYPE,
                    storeDir: storeOf('count'),
                    throttle: createThrottleState(),
                    nowMs: NOW,
                }),
                413,
                REASON_OVERSIZED,
                storeOf('count'),
            );
        }

        // Plant 5: a tripped throttle rule -- the soft-reject body on the
        // SUCCESS status. The body is well-formed (it would be accepted
        // but for the throttle), so the soft-reject proves the throttle
        // fired rather than the parser.
        {
            const storeDir = storeOf('throttle');
            const throttle = createThrottleState();
            for (let i = 0; i < THROTTLE_MAX_SUBMITS; i++) checkThrottle(throttle, NOW - 1000);
            expectVerdict(
                'tripped throttle',
                handleSubmit({
                    body: wellFormedBody(),
                    contentType: SELFTEST_CONTENT_TYPE,
                    storeDir,
                    throttle,
                    nowMs: NOW,
                }),
                200,
                THROTTLE_RULE,
                storeDir,
            );
        }
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }

    if (!ok) {
        console.error(`${NAME}: --self-test FAIL`);
        process.exit(1);
    }
    console.log(`${NAME}: --self-test PASS -- control green first, then all planted faults behaved as pinned`);
    process.exit(0);
}

if (SELF_TEST) selfTest();
else if (args.length === 0) main();
