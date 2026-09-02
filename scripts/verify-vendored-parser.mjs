#!/usr/bin/env node
/**
 * D-13's provenance record, made mechanical.
 *
 * scripts/lib/toml.cjs is vendored third-party source. Its header records the
 * package, the version, the size of the body and a sha256 over that body, and
 * it forbids hand-editing the body. Until this check existed, NOTHING in the
 * repo read any of that: a grep for `toml.cjs` across verify-platform.sh and
 * every scripts/*.mjs found exactly one reference, the import in generate.mjs.
 * A re-vendor to a different upstream version, a hand-edit to the body, or a
 * supply-chain substitution all passed every gate this repo has.
 *
 * That is the pattern CLAUDE.md's verification section forbids -- a hand-kept
 * expectation that can only ever agree with the tree it was copied from --
 * except worse, because there was no comparison at all.
 *
 * ## Both sides are DERIVED. Neither is written down here.
 *
 * The EXPECTED digest is read out of the file's own header. The ACTUAL digest
 * is computed over the file's own body. This script carries no literal digest,
 * no literal size and no literal line number, so it cannot drift out of
 * agreement with a legitimate re-vendor: re-vendoring updates the header and
 * this check follows it. What it catches is the body changing WITHOUT the
 * header changing, which is every one of the three cases above.
 *
 * ## Why the body boundary is derived rather than `tail -n +23`
 *
 * The header's recorded command hard-codes 23, which couples the digest to the
 * header being exactly 22 lines -- and nothing enforced that. Adding one
 * comment line to the header silently made the recorded command hash the wrong
 * bytes and still "pass" by eye. The boundary here is the first line that is
 * not a `//` comment: the provenance header is `//` lines and nothing else, so
 * the boundary moves with the header instead of being pinned to its length.
 *
 * Honestly --quick: it reads one file and hashes it. No build, no browser, no
 * display, no network.
 *
 * Usage:
 *   node scripts/verify-vendored-parser.mjs
 *   node scripts/verify-vendored-parser.mjs --self-test
 */

import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'verify-vendored-parser';
const VENDORED_REL = 'scripts/lib/toml.cjs';

/**
 * Where the vendored body begins: the first line that is not a `//` comment.
 *
 * The provenance header is `//` lines and nothing else, so this boundary is
 * derived from the header's own shape and moves with it. It is deliberately
 * NOT a search for the upstream `/*!` banner -- writing that token into the
 * header, which describing the rule naturally does, would move the boundary
 * into the header and hash the wrong bytes. Found for real while adding this
 * check.
 *
 * @returns {number} the character offset the body starts at, or -1.
 */
function bodyOffset(text) {
    let at = 0;
    for (const line of text.split('\n')) {
        if (!line.startsWith('//')) return at;
        at += line.length + 1;
    }
    return -1;
}

/**
 * Check one copy of the vendored file. A PARAMETER, not the constant, so
 * `--self-test` drives THIS function against a corrupted copy in mkdtemp
 * rather than a re-implementation of it -- and never against the real file,
 * which is the thing being protected.
 *
 * @returns {string[]} failure messages -- empty means the record holds.
 */
function checkVendored(path, label) {
    const failures = [];

    let text;
    try {
        text = readFileSync(path, 'utf8');
    } catch {
        return [`${label} could not be read. Next step: restore it from the package named in its own header.`];
    }

    const bodyAt = bodyOffset(text);
    if (bodyAt === -1) {
        return [`${label} has no vendored body below its provenance header. Next step: re-vendor the file as its header describes.`];
    }
    const body = Buffer.from(text.slice(bodyAt), 'utf8');

    const declaredDigest = /^\/\/\s+sha256:\s+([0-9a-f]{64})\b/m.exec(text);
    if (declaredDigest === null) {
        return [`${label} carries no recorded sha256 in its header, so there is nothing to check its body against. Next step: restore the provenance header the file's own rules require.`];
    }

    const actualDigest = createHash('sha256').update(body).digest('hex');
    if (actualDigest !== declaredDigest[1]) {
        failures.push(
            `${label} does not match the sha256 its own header records. The body below the header has changed `
            + 'without the header changing, which means it was hand-edited, re-vendored without updating the '
            + 'record, or replaced. Next step: re-vendor it exactly as its header describes, or, if the change '
            + 'is deliberate, update the recorded sha256 and size in the same commit.',
        );
    }

    const declaredSize = /^\/\/\s+Size:\s+(\d+) bytes of body/m.exec(text);
    if (declaredSize === null) {
        failures.push(`${label} carries no recorded body size in its header. Next step: restore the provenance header the file's own rules require.`);
    } else if (Number(declaredSize[1]) !== body.length) {
        failures.push(
            `${label} is ${body.length} bytes of body where its header records ${declaredSize[1]}. `
            + 'Next step: re-vendor it exactly as its header describes, or, if the change is deliberate, '
            + 'update the recorded sha256 and size in the same commit.',
        );
    }

    return failures;
}

// --- self-test: planted faults that must each go red ------------------------

/**
 * Plant `mutate` on a COPY and require the check to go red about it.
 *
 * The faults never touch scripts/lib/toml.cjs. It is the thing this check
 * protects, and a self-test one interrupted run away from corrupting it would
 * be trading the thing proved for the proof.
 */
function planted(name, mutate) {
    const dir = mkdtempSync(join(tmpdir(), 'verify-vendored-parser-'));
    try {
        const copy = join(dir, 'toml.cjs');
        const original = readFileSync(join(REPO_ROOT, VENDORED_REL), 'utf8');
        const mutated = mutate(original);
        if (mutated === original) {
            return { name, ok: false, why: 'the planted fault changed nothing, so the case is vacuous' };
        }
        writeFileSync(copy, mutated, 'utf8');
        const failures = checkVendored(copy, VENDORED_REL);
        return failures.length > 0
            ? { name, ok: true, why: failures[0] }
            : { name, ok: false, why: 'the check stayed green on a corrupted copy' };
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}

function selfTest() {
    // A planted-fault result measured against an already-red baseline says
    // nothing about the fault. Establish the baseline first.
    const baseline = checkVendored(join(REPO_ROOT, VENDORED_REL), VENDORED_REL);
    if (baseline.length > 0) {
        console.error(`${NAME}: --self-test FAIL -- the unmodified ${VENDORED_REL} is already red, so the planted-fault results below would mean nothing:`);
        baseline.forEach(f => console.error(`  ${f}`));
        return 1;
    }

    const results = [
        // One byte of the BODY, which is the case that matters: a hand-edit or
        // a substitution that leaves the header untouched.
        planted('one byte changed in the vendored body', text => {
            const at = bodyOffset(text);
            return `${text.slice(0, at)} ${text.slice(at)}`;
        }),
        // A re-vendor that swapped the body and forgot the record. Appending to
        // the body changes both the digest and the size, and both halves of the
        // check must see it.
        planted('the vendored body grew without the record following', text => `${text}\n// appended\n`),
        // The record itself removed. A check that reads its expectation from
        // the file must refuse when the file states no expectation, rather than
        // finding nothing to disagree with and reporting green.
        planted('the recorded sha256 deleted from the header', text => text.replace(/^\/\/\s+sha256:.*$/m, '//   sha256:')),
        // The header's other half removed, for the same reason.
        planted('the recorded body size deleted from the header', text => text.replace(/^\/\/\s+Size:.*$/m, '//   Size:')),
        // The vendored body removed entirely. Without this the check would
        // report on an empty body and a comparison against nothing.
        planted('the vendored body removed entirely', text => text.slice(0, bodyOffset(text))),
    ];

    let failed = 0;
    for (const result of results) {
        if (result.ok) {
            console.log(`  ok  ${result.name} -> red: ${result.why}`);
        } else {
            console.error(`${NAME}: --self-test FAIL -- '${result.name}': ${result.why}`);
            failed++;
        }
    }

    if (failed > 0) return 1;
    console.log(`${NAME}: --self-test PASS -- ${results.length} planted faults all went red`);
    return 0;
}

function main() {
    for (const arg of process.argv.slice(2)) {
        if (arg !== '--self-test') {
            console.error(`${NAME}: FAIL -- unknown argument '${arg}'`);
            return 1;
        }
    }
    if (process.argv.includes('--self-test')) return selfTest();

    const failures = checkVendored(join(REPO_ROOT, VENDORED_REL), VENDORED_REL);
    if (failures.length > 0) {
        console.error(`${NAME}: FAIL -- ${failures.length} problem(s) with the vendored settings parser.`);
        failures.forEach(f => console.error(`  ${f}`));
        return 1;
    }

    console.log(`${NAME}: PASS -- ${VENDORED_REL} matches the sha256 and size its own provenance header records`);
    return 0;
}

process.exit(main());
