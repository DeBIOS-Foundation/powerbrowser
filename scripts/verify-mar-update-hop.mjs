#!/usr/bin/env node
// scripts/verify-mar-update-hop.mjs
//
// The self-hosted MAR update gate (08-04, PKG-02): one real Linux N to N+1
// MAR hop from the fork update descriptor with zero Mozilla update hosts
// contacted.
//
// WHY IT EXISTS. The updater enablement (--enable-unverified-updates) and the
// AppUpdateURL policy are configuration, and configuration that is never
// exercised is a story, not a proof. This script gates the story in two
// halves: a static half that reads the tracked policy (the effective update
// URL lives there, never in user-branch prefs -- Bug 1468948 silently ignores
// user-branch app.update.url edits, and app.update.url itself was removed in
// Bug 1468948's follow-up Bug 1568994, so a pref file cannot carry it at
// all), and an evidence half that re-verifies a completed proof run from the
// files it left behind.
//
// WHAT THE EVIDENCE HALF ASSERTS. The proof procedure (docs/BUILD.md,
// packaging procedure) stages one N to N+1 hop and leaves hop.json,
// update.xml, the N+1 MAR, a fork-server access log and a client resolver
// log under .mozbuild/mar-hop/. This script asserts, from those files only:
// the two builds are two DISTINCT versions with two DISTINCT build IDs (a
// same-version loop is plumbing, never the exit proof); the served
// descriptor is byte-identical to what the in-file generator emits from the
// MAR bytes (hash-pinned sha512 plus size, generated twice to prove the
// format carries no timestamp or nonce); the descriptor advertises the N+1
// payload the MAR actually carries; the fork server logged serving both the
// descriptor and the MAR (a green hop with no access-log entry is a failure,
// not a pass -- Pitfall 1); and the client's resolver log, sifted with the
// anchored `Resolving host [...]` shape verify-endpoints.sh layer 3 uses
// (nsHostResolver.cpp:455), names zero *.mozilla.org / *.mozilla.net hosts
// while still naming the host that served the descriptor, so an empty
// capture cannot pass.
//
// ON A TREE WITH NO .mozbuild/mar-hop/, THIS ROW FAILS AND NAMES THE
// MISSING EVIDENCE plus the BUILD.md procedure that produces it -- the
// about-dialog-suppression precedent. A check that goes green because it
// could not find its own subject is the green-by-construction shape
// deferred-items.md records. The self-test twin below is the --quick half.
//
// Honestly --quick (self-test only): node:crypto plus text files in mkdtemp.
// No build, no browser, no display, no network.
//
// Usage:
//   node scripts/verify-mar-update-hop.mjs
//   node scripts/verify-mar-update-hop.mjs --self-test

import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { isIP } from 'node:net';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'verify-mar-update-hop';
const EVIDENCE_DIR = join(REPO_ROOT, '.mozbuild', 'mar-hop');
const POLICY_REL = 'powerbrowser/distribution/policies.json';

const args = process.argv.slice(2);
const SELF_TEST = args.includes('--self-test');
for (const a of args) {
    if (a !== '--self-test') {
        console.error(`${NAME}: FAIL -- unknown argument '${a}'`);
        process.exit(2);
    }
}

// --- assertion plumbing (the installer-schema skeleton) ----------------------
//
// Failures accumulate rather than throwing: one run should report every wrong
// file, not just the first.
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

/** sha512 hex plus byte size of MAR bytes -- the two values pinning the descriptor. */
function marDigest(bytes) {
    return {
        hashValue: createHash('sha512').update(bytes).digest('hex'),
        size: String(bytes.length),
    };
}

function xmlEscape(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * THE SINGLE SOURCE for the fork descriptor format. The proof procedure
 * serves exactly what this emits -- never a hand-written update.xml -- so
 * the gate below can require the served bytes byte-identical to a fresh
 * emission. Deterministic by construction: no timestamps, no nonces, no
 * random boundary. PKG-02/idempotency (regenerating from identical MAR
 * bytes is byte-identical) is asserted by emitting twice in runChecks.
 */
export function buildUpdateXml({ marBytes, marUrl, appVersion, platformVersion, buildID, displayVersion, updateType = 'minor' }) {
    const { hashValue, size } = marDigest(marBytes);
    return `<?xml version="1.0" encoding="UTF-8"?>\n`
        + `<updates>\n`
        + `  <update type="${xmlEscape(updateType)}" displayVersion="${xmlEscape(displayVersion)}" appVersion="${xmlEscape(appVersion)}" platformVersion="${xmlEscape(platformVersion)}" buildID="${xmlEscape(buildID)}">\n`
        + `    <patch type="complete" URL="${xmlEscape(marUrl)}" hashFunction="sha512" hashValue="${hashValue}" size="${size}"/>\n`
        + `  </update>\n`
        + `</updates>\n`;
}

/** Parse the one descriptor shape buildUpdateXml emits. Returns null when the shape is absent. */
export function parseUpdateXml(text) {
    const update = text.match(/<update\b([^>]*)>/);
    const patch = text.match(/<patch\b([^>]*)\/>/);
    if (!update || !patch) return null;
    const attr = (tag, name) => (tag[1].match(new RegExp(`${name}="([^"]*)"`)) || [])[1];
    const appVersion = attr(update, 'appVersion');
    const buildID = attr(update, 'buildID');
    const platformVersion = attr(update, 'platformVersion');
    const displayVersion = attr(update, 'displayVersion');
    const url = attr(patch, 'URL');
    const hashFunction = attr(patch, 'hashFunction');
    const hashValue = attr(patch, 'hashValue');
    const size = attr(patch, 'size');
    if (!appVersion || !buildID || !url || !hashFunction || !hashValue || !size) return null;
    const unescape = s => s.replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
    return {
        appVersion: unescape(appVersion),
        buildID: unescape(buildID),
        platformVersion: platformVersion ? unescape(platformVersion) : platformVersion,
        displayVersion: displayVersion ? unescape(displayVersion) : displayVersion,
        url: unescape(url),
        hashFunction,
        hashValue,
        size,
    };
}

/**
 * The anchored resolver-log sift, same shape as verify-endpoints.sh layer 3:
 * hostnames come ONLY from `Resolving host [...]` (nsHostResolver.cpp:455).
 * An unanchored whole-log grep also matches zero-traffic names and would
 * corrupt the verdict either way.
 */
export function siftResolverHosts(logText) {
    const out = [];
    for (const line of logText.split('\n')) {
        const m = line.match(/Resolving host \[([^\]]+)\]/);
        if (m) out.push(m[1]);
    }
    return [...new Set(out)];
}

function isMozillaHost(host) {
    const h = host.toLowerCase();
    return h === 'mozilla.org' || h === 'mozilla.net'
        || h.endsWith('.mozilla.org') || h.endsWith('.mozilla.net');
}

function servedHost(servedUrl) {
    try {
        return new URL(servedUrl).hostname;
    } catch {
        return null;
    }
}

/** The tracked policy's effective update URL -- read from the file, never from prefs. */
function readPolicyUrl(root) {
    const p = join(root, POLICY_REL);
    if (!existsSync(p)) return { error: `${POLICY_REL} is absent, so no effective update URL is configured. Next step: restore the file per docs/BUILD.md packaging procedure` };
    let doc;
    try {
        doc = JSON.parse(readFileSync(p, 'utf8'));
    } catch {
        return { error: `${POLICY_REL} is not valid JSON. Next step: fix the file; it must carry policies.AppUpdateURL` };
    }
    const url = doc?.policies?.AppUpdateURL;
    if (typeof url !== 'string' || url.trim() === '') {
        return { error: `${POLICY_REL} carries no policies.AppUpdateURL, so a self-updating client is impossible. Next step: point it at the fork update descriptor` };
    }
    return { url };
}

function runChecks(root) {
    const r = makeReporter();
    const evDir = root === REPO_ROOT ? EVIDENCE_DIR : join(root, '.mozbuild', 'mar-hop');

    // Static half: the tracked policy must carry a shippable fork URL. An
    // http URL would ship MARs over cleartext (T-08-04a tampering vector);
    // a Mozilla host would point the fork's clients at Mozilla's AUS
    // (Pitfall 1). Both fail naming the file and the value.
    const policy = readPolicyUrl(root);
    if (policy.error) {
        r.fail(policy.error);
    } else {
        let u = null;
        try { u = new URL(policy.url); } catch { /* falls through */ }
        if (!u) {
            r.fail(`${POLICY_REL} AppUpdateURL ${JSON.stringify(policy.url)} is not a URL. Next step: set it to the fork update descriptor`);
        } else {
            r.eq('AppUpdateURL scheme', u.protocol, 'https:', POLICY_REL);
            if (isMozillaHost(u.hostname)) {
                r.fail(`${POLICY_REL} AppUpdateURL points at Mozilla host ${JSON.stringify(u.hostname)} -- the fork's clients must never update from Mozilla (Pitfall 1). Next step: point it at the fork update descriptor`);
            }
        }
    }

    // Evidence half: every file the proof procedure leaves behind. Absent
    // evidence FAILS naming the procedure -- never skips green.
    const need = ['hop.json', 'update.xml', 'server-access.log', 'client-resolver.log'];
    const missing = need.filter(f => !existsSync(join(evDir, f)));
    if (missing.length > 0) {
        r.fail(
            `no MAR-hop proof evidence under ${root === REPO_ROOT ? '.mozbuild/mar-hop' : join(root, '.mozbuild', 'mar-hop')}: `
            + `absent ${missing.join(', ')}. Next step: run the N to N-plus-1 hop per docs/BUILD.md packaging procedure`,
        );
        return { skipped: false, failures: r.failures };
    }

    let hop;
    try {
        hop = JSON.parse(readFileSync(join(evDir, 'hop.json'), 'utf8'));
    } catch {
        r.fail(`hop.json under .mozbuild/mar-hop/ is not valid JSON. Next step: re-run the hop procedure; the file is written, never hand-edited`);
        return { skipped: false, failures: r.failures };
    }
    for (const k of ['n', 'nplus1', 'mar', 'descriptor', 'servedUrl', 'result', 'postHop']) {
        if (hop[k] === undefined) r.fail(`hop.json is missing required key ${JSON.stringify(k)}. Next step: re-run the hop procedure; the file is written, never hand-edited`);
    }
    if (r.failures.length > 0) return { skipped: false, failures: r.failures };

    // Two DISTINCT versions and build IDs. A same-version loop proves the
    // plumbing moves bytes, never that an upgrade happened -- presenting one
    // as the exit proof is prohibited, so it fails here naming both values.
    r.eq('hop result', hop.result, 'applied', 'hop.json');
    const sameVersion = hop.n.version === hop.nplus1.version;
    const sameBuild = hop.n.buildID === hop.nplus1.buildID;
    if (sameVersion || sameBuild) {
        r.fail(
            `hop.json describes a same-${sameVersion ? 'version' : 'buildID'} loop `
            + `(N ${hop.n.version}/${hop.n.buildID} vs N+1 ${hop.nplus1.version}/${hop.nplus1.buildID}) -- plumbing-only, never the exit proof. `
            + `Next step: build N+1 as a distinct version per docs/BUILD.md packaging procedure`,
        );
    }

    // The MAR the descriptor pins must exist and match, byte for byte.
    const marPath = join(evDir, hop.mar);
    if (!existsSync(marPath)) {
        r.fail(`hop.json names MAR ${JSON.stringify(hop.mar)} but it is absent under .mozbuild/mar-hop/. Next step: re-run the hop procedure`);
        return { skipped: false, failures: r.failures };
    }
    const marBytes = readFileSync(marPath);
    const served = readFileSync(join(evDir, hop.descriptor ?? 'update.xml'), 'utf8');

    // Idempotency (PKG-02): two generations from identical bytes are
    // byte-identical -- the format carries no timestamp or nonce -- and the
    // served descriptor equals a fresh emission, so no hand edit intervened.
    const genArgs = {
        marBytes,
        marUrl: hop.servedMarUrl ?? hop.servedUrl,
        appVersion: hop.nplus1.version,
        platformVersion: hop.nplus1.platformVersion ?? hop.nplus1.version,
        buildID: hop.nplus1.buildID,
        displayVersion: hop.nplus1.displayVersion ?? hop.nplus1.version,
    };
    const gen1 = buildUpdateXml(genArgs);
    const gen2 = buildUpdateXml(genArgs);
    r.eq('descriptor idempotency', gen1, gen2, 'buildUpdateXml (two generations from identical MAR bytes)');
    if (served !== gen1) {
        r.fail(
            `served descriptor ${join('.mozbuild', 'mar-hop', hop.descriptor ?? 'update.xml')} is not byte-identical to a fresh emission from the MAR bytes `
            + `(served ${served.length} bytes vs emitted ${gen1.length} bytes) -- a hand edit may have intervened. `
            + `Next step: serve exactly what buildUpdateXml emits`,
        );
    }

    const parsed = parseUpdateXml(served);
    if (!parsed) {
        r.fail(`served update.xml does not carry the fork descriptor shape (update plus complete patch). Next step: serve exactly what buildUpdateXml emits`);
    } else {
        r.eq('descriptor hashFunction', parsed.hashFunction, 'sha512', 'update.xml patch');
        const { hashValue, size } = marDigest(marBytes);
        r.eq('descriptor hashValue', parsed.hashValue, hashValue, 'update.xml patch vs MAR bytes');
        r.eq('descriptor size', parsed.size, size, 'update.xml patch vs MAR bytes');
        r.eq('descriptor appVersion', parsed.appVersion, hop.nplus1.version, 'update.xml vs hop.json nplus1');
        r.eq('descriptor buildID', parsed.buildID, hop.nplus1.buildID, 'update.xml vs hop.json nplus1');
        r.eq('post-hop version', hop.postHop.version, hop.nplus1.version, 'hop.json (the hop must land on N+1)');
        r.eq('post-hop buildID', hop.postHop.buildID, hop.nplus1.buildID, 'hop.json (the hop must land on N+1)');
    }

    // Fork-server proof: the access log must show the descriptor AND the MAR
    // actually served. No access-log entry is a failure, not a pass.
    const access = readFileSync(join(evDir, 'server-access.log'), 'utf8');
    const gotDescriptor = access.split('\n').some(l => l.includes('GET') && l.includes('/update.xml'));
    const gotMar = access.split('\n').some(l => l.includes('GET') && l.includes('.mar'));
    if (!gotDescriptor) r.fail(`server-access.log shows no GET /update.xml -- the fork server never served the descriptor. Next step: re-run the hop with the access log captured`);
    if (!gotMar) r.fail(`server-access.log shows no GET for a .mar -- the fork server never served the MAR. Next step: re-run the hop with the access log captured`);

    // Zero-Mozilla-host proof over the client's own resolver log, with the
    // layer-3 capture-broken detectors: an empty extract fails (the check
    // never ran), and the serving host must appear unless it is a literal
    // IP (no DNS resolution happens for one, so requiring it would fail a
    // correct local proof forever).
    const resolver = readFileSync(join(evDir, 'client-resolver.log'), 'utf8');
    const hosts = siftResolverHosts(resolver);
    if (hosts.length === 0) {
        r.fail(`client-resolver.log yielded zero Resolving host lines -- the capture never ran. Next step: re-run the hop client with MOZ_LOG=nsHostResolver:5 per docs/BUILD.md`);
    } else {
        const moz = hosts.filter(isMozillaHost);
        if (moz.length > 0) {
            r.fail(`client contacted Mozilla host(s) during the hop: ${moz.join(', ')} -- the hop must touch zero Mozilla update hosts (Pitfall 1). Full host set: ${hosts.join(', ')}`);
        }
        const host = servedHost(hop.servedUrl);
        if (host && isIP(host) === 0 && !hosts.includes(host)) {
            r.fail(`client-resolver.log never resolved the serving host ${JSON.stringify(host)} -- the capture may be from a different run. Hosts seen: ${hosts.join(', ')}`);
        }
    }

    return { skipped: false, failures: r.failures };
}

// --- --self-test ---------------------------------------------------------------
//
// Control green first on a mock proof, then one plant per fault class, each
// required to go red naming the file and the values. Everything lives in
// mkdtemp -- no network, no builds, no browser.
function selfTest() {
    const dir = mkdtempSync(join(tmpdir(), 'verify-mar-update-hop-selftest-'));
    let ok = true;
    try {
        const evDir = join(dir, '.mozbuild', 'mar-hop');
        const mirror = ({ version = '153.1.1', buildID = '20260905010000', servedHost = 'updates.powerbrowser.org', staleMar = false, mozillaHost = false } = {}) => {
            mkdirSync(evDir, { recursive: true });
            mkdirSync(join(dir, 'powerbrowser', 'distribution'), { recursive: true });
            writeFileSync(join(dir, POLICY_REL), JSON.stringify({ policies: { AppUpdateURL: 'https://updates.powerbrowser.org/update.xml' } }));
            const marBytes = randomBytes(65536);
            writeFileSync(join(evDir, 'nplus1.mar'), staleMar ? Buffer.concat([marBytes, Buffer.from('x')]) : marBytes);
            const servedUrl = `http://${servedHost}:8000/update.xml`;
            const xml = buildUpdateXml({
                marBytes,
                marUrl: `http://${servedHost}:8000/nplus1.mar`,
                appVersion: version,
                platformVersion: '153.1.0',
                buildID,
                displayVersion: version,
            });
            writeFileSync(join(evDir, 'update.xml'), xml);
            writeFileSync(join(evDir, 'hop.json'), JSON.stringify({
                n: { version: '153.1.0', buildID: '20260904000000' },
                nplus1: { version, buildID, platformVersion: '153.1.0', displayVersion: version },
                mar: 'nplus1.mar',
                descriptor: 'update.xml',
                servedUrl,
                servedMarUrl: `http://${servedHost}:8000/nplus1.mar`,
                result: 'applied',
                postHop: { version, buildID },
            }));
            const resolverLines = [
                'Resolving host [firefox.settings.services.mozilla.com]',
                `Resolving host [${servedHost}]`,
            ];
            if (mozillaHost) resolverLines.push('Resolving host [aus5.mozilla.org]');
            writeFileSync(join(evDir, 'client-resolver.log'), resolverLines.join('\n') + '\n');
            writeFileSync(
                join(evDir, 'server-access.log'),
                `127.0.0.1 - - [05/Sep/2026 01:00:00] "GET /update.xml HTTP/1.1" 200 -\n`
                + `127.0.0.1 - - [05/Sep/2026 01:00:01] "GET /nplus1.mar HTTP/1.1" 200 -\n`,
            );
        };
        const expectRed = (label, mutate, needleFile, needleValue) => {
            mirror();
            mutate();
            const res = runChecks(dir);
            const msg = res.failures.find(f => f.includes(needleFile) && f.includes(needleValue));
            if (!msg) {
                console.error(`${NAME}: --self-test FAIL -- ${label} was NOT rejected naming ${needleFile} and ${needleValue}`);
                for (const f of res.failures) console.error(`  - ${f}`);
                ok = false;
            } else {
                console.log(`${NAME}: --self-test -- ${label} REJECTED: ${msg}`);
            }
        };

        // Control: the unmutated mock proof must be GREEN.
        mirror();
        const control = runChecks(dir);
        if (control.skipped || control.failures.length !== 0) {
            console.error(`${NAME}: --self-test FAIL -- the unmutated mock proof is already red, so a red result after a plant would prove nothing:`);
            for (const f of control.failures) console.error(`  - ${f}`);
            ok = false;
        } else {
            console.log(`${NAME}: --self-test -- the unmutated mock proof is GREEN`);
        }

        // Plant 1: same-version descriptor -- the plumbing-only loop.
        expectRed(
            'same-version N to N loop',
            () => {
                const hopPath = join(evDir, 'hop.json');
                const hop = JSON.parse(readFileSync(hopPath, 'utf8'));
                hop.nplus1.version = hop.n.version;
                hop.nplus1.buildID = hop.n.buildID;
                hop.postHop = { version: hop.n.version, buildID: hop.n.buildID };
                writeFileSync(hopPath, JSON.stringify(hop));
                const marBytes = readFileSync(join(evDir, 'nplus1.mar'));
                writeFileSync(join(evDir, 'update.xml'), buildUpdateXml({
                    marBytes,
                    marUrl: 'http://updates.powerbrowser.org:8000/nplus1.mar',
                    appVersion: hop.n.version,
                    platformVersion: '153.1.0',
                    buildID: hop.n.buildID,
                    displayVersion: hop.n.version,
                }));
            },
            'hop.json',
            'same-version',
        );

        // Plant 2: stale descriptor -- MAR bytes changed after generation.
        mirror();
        {
            const marPath = join(evDir, 'nplus1.mar');
            writeFileSync(marPath, Buffer.concat([readFileSync(marPath), Buffer.from('tampered')]));
            const res = runChecks(dir);
            const msg = res.failures.find(f => f.includes('hashValue'));
            if (!msg) {
                console.error(`${NAME}: --self-test FAIL -- the stale-hash descriptor was NOT rejected naming hashValue`);
                for (const f of res.failures) console.error(`  - ${f}`);
                ok = false;
            } else {
                console.log(`${NAME}: --self-test -- stale MAR bytes REJECTED: ${msg}`);
            }
        }

        // Plant 3: a Mozilla host in the resolver log.
        mirror({ mozillaHost: true });
        {
            const res = runChecks(dir);
            const msg = res.failures.find(f => f.includes('aus5.mozilla.org'));
            if (!msg) {
                console.error(`${NAME}: --self-test FAIL -- the Mozilla host in the resolver log was NOT rejected naming it`);
                for (const f of res.failures) console.error(`  - ${f}`);
                ok = false;
            } else {
                console.log(`${NAME}: --self-test -- Mozilla host in resolver log REJECTED: ${msg}`);
            }
        }

        // Literal-IP carve-out: serving from 127.0.0.1 needs no resolver
        // line for it, but a Mozilla host there must still go red.
        mirror({ servedHost: '127.0.0.1' });
        {
            const res = runChecks(dir);
            if (res.failures.length !== 0) {
                console.error(`${NAME}: --self-test FAIL -- the literal-IP proof should be green without a 127.0.0.1 resolver line:`);
                for (const f of res.failures) console.error(`  - ${f}`);
                ok = false;
            } else {
                console.log(`${NAME}: --self-test -- literal-IP serving host correctly needs no resolver line (GREEN)`);
            }
        }
        mirror({ servedHost: '127.0.0.1', mozillaHost: true });
        {
            const res = runChecks(dir);
            const msg = res.failures.find(f => f.includes('aus5.mozilla.org'));
            if (!msg) {
                console.error(`${NAME}: --self-test FAIL -- the Mozilla host beside a literal-IP serve was NOT rejected`);
                for (const f of res.failures) console.error(`  - ${f}`);
                ok = false;
            } else {
                console.log(`${NAME}: --self-test -- Mozilla host beside literal-IP serve REJECTED: ${msg}`);
            }
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

// Import guard: importing this module (to reuse buildUpdateXml as the
// descriptor's single source) must not run the gate's main. Direct
// invocation still does.
const INVOKED_DIRECTLY = (() => {
    try {
        return process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
    } catch {
        return false;
    }
})();
if (INVOKED_DIRECTLY) {
const result = runChecks(REPO_ROOT);
if (result.failures.length > 0) {
    console.error(`${NAME}: FAIL -- ${result.failures.length} MAR-hop problem(s)`);
    for (const f of result.failures) console.error(`  - ${f}`);
    process.exit(1);
}
console.log(`${NAME}: PASS -- policy carries the fork update URL and the N to N-plus-1 hop evidence verifies end to end`);
}
