#!/usr/bin/env node
// scripts/verify-upstream-pins.mjs
//
// The pin-agreement gate (05-02, UPD-01): the ESR tag is declared once in
// configuration.toml ([upstreams] firefox_esr_tag) and every consumer
// reads that declaration. This check derives the expected tag from the
// manifest at check time via the vendored parser and asserts agreement in
// both directions:
//
//  1. generated/upstream-pins.env carries the manifest tag (stale output
//     fails naming the fragment and the rerun command). An absent
//     fragment SKIPS this step only: generated/ is git-ignored, so that
//     is the state of every fresh clone, and a gate red on it would be a
//     gate its readers skip (generate-check's own rule). A present but
//     unreadable fragment FAILs -- that is broken output, not a fresh
//     clone.
//  2. .github/workflows/rebase-upstream.yml's input default equals the
//     manifest tag. The default is a literal because a workflow input
//     cannot read TOML, so it is a check-covered mirror, never a second
//     source: drift fails naming the workflow.
//  3. scripts/fetch-upstream.sh's effective default equals the manifest
//     tag, resolved by PARSING, never by executing the clone path: the
//     script must source the fragment and must carry no tag literal of
//     its own. Either half missing fails naming the script.
//  4. No other in-scope tracked file carries a tag literal. Scope is the
//     build-relevant tree -- scripts/, theia/, .github/ and the root
//     toml/nix/mk files, read off `git ls-files` so the set is derived,
//     not kept. generated/ is excluded as derived output; .planning/ and
//     inventory/ are excluded as historical record, not build input
//     (they quote past pins the way they quote everything else, and
//     renaming history would destroy the provenance the project keeps).
//     The three allowed carriers above -- manifest (authoritative),
//     workflow mirror (equality-checked) and this script's own self-test
//     fixtures -- are excluded from the sweep by path.
//
// A tag literal is `FIREFOX_` followed by a digit. The narrower shape is
// deliberate: the variable and constant names around it (the fragment key,
// the driver's path constants) carry letters after the prefix, so a bare
// prefix match would flag every legitimate reader and the gate would
// train its readers to ignore it.
//
// Honestly --quick: it reads text files and runs one git ls-files. No
// clone, no fetch, no build, no browser, no display, no network.
//
// Usage:
//   node scripts/verify-upstream-pins.mjs
//   node scripts/verify-upstream-pins.mjs --self-test
//
// The self-test plants two faults and requires each to go red naming the
// file -- a drifted workflow mirror and a second literal under scripts/ --
// with the unmutated tree as the clean control proving each red is
// plant-caused.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse } from './lib/toml.cjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'verify-upstream-pins';
const SELF_REL = 'scripts/verify-upstream-pins.mjs';

const args = process.argv.slice(2);
for (const a of args) {
    if (a !== '--self-test') {
        console.error(`${NAME}: FAIL -- unknown argument '${a}'`);
        console.error(`  Next step: run: node ${SELF_REL}, or add --self-test to prove the agreement discriminates.`);
        process.exit(2);
    }
}

const MANIFEST_REL = 'configuration.toml';
const FRAGMENT_REL = 'generated/upstream-pins.env';
const WORKFLOW_REL = '.github/workflows/rebase-upstream.yml';
const FETCH_REL = 'scripts/fetch-upstream.sh';
const FRAGMENT_KEY = 'FIREFOX_ESR_TAG';
const RERUN_GENERATE = 'node scripts/generate.mjs';

// A tag literal: the prefix followed by a digit. Reader names (the
// fragment key, driver constants) carry letters there and never match.
const TAG_LITERAL = /FIREFOX_[0-9][A-Za-z0-9._-]*/g;
const TAG_SHAPE = /^[A-Za-z0-9._-]+$/;
const PIN_DOTTED = 'upstreams.firefox_esr_tag';
const PIN_SECTION = '[upstreams]';

function readBytes(root, rel) {
    const p = join(root, rel);
    if (!existsSync(p)) return null;
    return readFileSync(p);
}

// The in-scope set, derived from version control -- never a hand-kept
// list, which could only ever agree with the tree it was copied from.
function listTracked(root) {
    try {
        return execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
            .split('\n')
            .map(l => l.trim())
            .filter(l => l !== '');
    } catch {
        return null;
    }
}

function inScope(rel) {
    if (rel.startsWith('scripts/') || rel.startsWith('theia/') || rel.startsWith('.github/')) return true;
    if (!rel.includes('/')) {
        return /\.toml$/.test(rel) || /\.nix$/.test(rel) || /\.mk$/.test(rel)
            || rel === '.mozconfig' || rel.startsWith('Makefile');
    }
    return false;
}

// The allowed carriers: the manifest (authoritative), the workflow
// mirror (equality-checked in step 2) and this script (whose self-test
// plants tag-shaped fixtures). Everything else in scope must be clean.
function sweepExcluded(rel) {
    return rel.startsWith('generated/')
        || rel.startsWith('.planning/')
        || rel.startsWith('inventory/')
        || rel === MANIFEST_REL
        || rel === WORKFLOW_REL
        || rel === SELF_REL;
}

function tagLiterals(text) {
    return text.match(TAG_LITERAL) ?? [];
}

function runChecks(root, overrides = {}) {
    const failures = [];
    const skipped = [];
    const read = overrides.read ?? ((rel) => readBytes(root, rel)?.toString('utf8') ?? null);

    // --- 0. the manifest pin ------------------------------------------------
    let expected = null;
    {
        const text = read(MANIFEST_REL);
        if (text === null) {
            failures.push(`${MANIFEST_REL} could not be read, so the pin proves nothing. Next step: restore it at the top of the project.`);
        } else {
            let manifest = null;
            try {
                manifest = parse(text);
            } catch {
                failures.push(`${MANIFEST_REL} could not be read as a settings file, so the pin proves nothing. Next step: run ${RERUN_GENERATE} -- it reports the faulty line.`);
            }
            if (manifest !== null) {
                const pin = manifest?.upstreams?.firefox_esr_tag;
                if (typeof pin !== 'string' || pin.trim() === '') {
                    failures.push(`${PIN_DOTTED} is not set. Open ${MANIFEST_REL}, find the ${PIN_SECTION} section, and give firefox_esr_tag a value. Then run: ${RERUN_GENERATE}`);
                } else if (!TAG_SHAPE.test(pin)) {
                    failures.push(`${PIN_DOTTED} is ${JSON.stringify(pin)}, which is not a plain tag name. Write it as letters, digits, dots, underscores and hyphens only in ${MANIFEST_REL}, then run: ${RERUN_GENERATE}`);
                } else {
                    expected = pin;
                }
            }
        }
    }

    // --- 1. the generated fragment ------------------------------------------
    let fragmentPin = null;
    {
        const text = read(FRAGMENT_REL);
        if (text === null) {
            skipped.push(`${FRAGMENT_REL} is absent (nothing generated in this copy yet) -- fragment equality unchecked; run ${RERUN_GENERATE} to cover it.`);
        } else {
            const m = text.match(new RegExp(`^${FRAGMENT_KEY}=(\\S+)\\s*$`, 'm'));
            if (m === null) {
                failures.push(`${FRAGMENT_REL} is present but carries no ${FRAGMENT_KEY}= line -- broken output. Next step: run ${RERUN_GENERATE} to rewrite it, then re-run this check.`);
            } else {
                fragmentPin = m[1];
            }
        }
    }
    if (expected !== null && fragmentPin !== null && fragmentPin !== expected) {
        failures.push(`${FRAGMENT_REL} carries ${FRAGMENT_KEY}=${fragmentPin} but ${MANIFEST_REL} declares ${expected} -- stale output. Next step: run ${RERUN_GENERATE}, then re-run this check.`);
    }

    // --- 2. the workflow mirror ----------------------------------------------
    {
        const text = read(WORKFLOW_REL);
        if (text === null) {
            failures.push(`${WORKFLOW_REL} could not be read, so the mirror proves nothing. Next step: restore it.`);
        } else if (expected !== null) {
            const found = tagLiterals(text);
            if (found.length !== 1 || found[0] !== expected) {
                failures.push(`${WORKFLOW_REL} mirrors ${found.length === 0 ? 'no tag' : found.join(', ')} but ${MANIFEST_REL} declares ${expected} -- the mirror drifted. Next step: bump the manifest first, then mirror its tag in the workflow input default.`);
            }
        }
    }

    // --- 3. fetch's effective default, by parsing -----------------------------
    {
        const text = read(FETCH_REL);
        if (text === null) {
            failures.push(`${FETCH_REL} could not be read, so its default proves nothing. Next step: restore it.`);
        } else {
            if (!text.includes('upstream-pins.env')) {
                failures.push(`${FETCH_REL} no longer sources the generated pin fragment, so its default is not the manifest pin. Next step: source ${FRAGMENT_REL} for the TAG default instead of carrying one.`);
            }
            const found = tagLiterals(text);
            if (found.length > 0) {
                failures.push(`${FETCH_REL} carries its own tag literal ${found.join(', ')} instead of reading the single pin. Next step: remove the literal and let the TAG default come from ${FRAGMENT_REL}.`);
            }
        }
    }

    // --- 4. no second literal anywhere else in scope ----------------------------
    {
        const tracked = overrides.files ?? listTracked(root);
        if (tracked === null) {
            failures.push(`the project's version control could not be read, so the literal sweep proves nothing. Next step: run this from a working copy of the project, with git available.`);
        } else {
            for (const rel of tracked) {
                if (!inScope(rel) || sweepExcluded(rel)) continue;
                const text = read(rel);
                if (text === null) continue;
                const lines = text.split('\n');
                for (let i = 0; i < lines.length; i += 1) {
                    const found = tagLiterals(lines[i]);
                    if (found.length > 0) {
                        failures.push(`${rel}:${i + 1} carries a tag literal ${found.join(', ')} outside the three allowed carriers -- the pin lives in ${MANIFEST_REL} alone. Next step: read the pin from ${FRAGMENT_REL} instead of restating it.`);
                    }
                }
            }
        }
    }

    return { failures, skipped, expected };
}

function main() {
    if (args.includes('--self-test')) return selfTest();
    const { failures, skipped } = runChecks(REPO_ROOT);
    for (const s of skipped) console.log(`${NAME}: SKIP -- ${s}`);
    if (failures.length > 0) {
        console.error(`${NAME}: FAIL -- ${failures.length} problem(s) with the ESR pin agreement.`);
        failures.forEach(f => console.error(`  ${f}`));
        return 1;
    }
    console.log(`${NAME}: PASS -- the manifest pin agrees with the fragment, the workflow mirror and fetch's default, with no second literal in scope`);
    return 0;
}

// A tag-shaped neighbour of the pin, derived -- never a literal kept in
// this file, which would be a hand-kept tag the sweep excludes by path.
function neighborTag(pin) {
    return pin.replace(/\d+/, d => String(Number(d) + 1));
}

function selfTest() {
    const baseline = runChecks(REPO_ROOT);
    if (baseline.failures.length > 0) {
        console.error(`${NAME}: --self-test FAIL -- the unmodified tree is already red, so the planted-fault results below would mean nothing:`);
        baseline.failures.forEach(f => console.error(`  ${f}`));
        return 1;
    }
    const { expected } = baseline;
    if (expected === null) {
        console.error(`${NAME}: --self-test FAIL -- the unmodified tree states no pin, so no plant could mean anything.`);
        return 1;
    }
    const neighbor = neighborTag(expected);
    if (neighbor === expected || !TAG_SHAPE.test(neighbor)) {
        console.error(`${NAME}: --self-test FAIL -- planted no fault at all: the neighbour tag did not land.`);
        return 1;
    }

    let failed = 0;
    const checkNoRoot = (caseName, lines) => {
        const text = lines.join('\n');
        if (text.length === 0) {
            console.error(`${NAME}: --self-test FAIL -- '${caseName}' produced no output text at all, so the no-path predicate would pass vacuously`);
            return false;
        }
        if (text.includes(REPO_ROOT)) {
            console.error(`${NAME}: --self-test FAIL -- '${caseName}' leaked this checkout's path into its output: ${text}`);
            return false;
        }
        return true;
    };

    // Plant 1: the workflow mirror drifted to the neighbour tag must go
    // red NAMING the workflow. The substitution lands in memory -- the
    // tracked file is the independent comparand and is never edited, not
    // even temporarily.
    {
        const name = 'drifted workflow mirror';
        const real = readBytes(REPO_ROOT, WORKFLOW_REL)?.toString('utf8') ?? '';
        const planted = real.split(expected).join(neighbor);
        if (planted === real) {
            console.error(`${NAME}: --self-test FAIL -- '${name}' planted no fault at all: the substitution did not land.`);
            failed += 1;
        } else {
            const { failures } = runChecks(REPO_ROOT, { read: (rel) => (rel === WORKFLOW_REL ? planted : readBytes(REPO_ROOT, rel)?.toString('utf8') ?? null) });
            if (failures.some(f => f.includes(WORKFLOW_REL) && f.includes(neighbor))) {
                console.log(`  ok  ${name} -> red, naming '${WORKFLOW_REL}'`);
                if (!checkNoRoot(name, failures)) failed += 1;
            } else {
                console.error(`${NAME}: --self-test FAIL -- '${name}' did not go red naming '${WORKFLOW_REL}'; got: ${failures.join(' | ') || '(no failures at all)'}`);
                failed += 1;
            }
        }
    }

    // Plant 2: a second tag literal under scripts/ must go red NAMING the
    // planted path. The file is synthetic and in-memory only -- writing it
    // to disk would dirty the tree the sweep reads.
    {
        const name = 'second tag literal under scripts/';
        const plantedRel = 'scripts/self-test-planted-pin.sh';
        const plantedText = `# self-test plant only\nTAG=${neighbor}\n`;
        if (tagLiterals(plantedText).length === 0) {
            console.error(`${NAME}: --self-test FAIL -- '${name}' planted no fault at all: the literal did not land.`);
            failed += 1;
        } else {
            const tracked = listTracked(REPO_ROOT) ?? [];
            const { failures } = runChecks(REPO_ROOT, {
                files: [...tracked, plantedRel],
                read: (rel) => {
                    if (rel === plantedRel) return plantedText;
                    return readBytes(REPO_ROOT, rel)?.toString('utf8') ?? null;
                },
            });
            if (failures.some(f => f.includes(plantedRel))) {
                console.log(`  ok  ${name} -> red, naming '${plantedRel}'`);
                if (!checkNoRoot(name, failures)) failed += 1;
            } else {
                console.error(`${NAME}: --self-test FAIL -- '${name}' did not go red naming '${plantedRel}'; got: ${failures.join(' | ') || '(no failures at all)'}`);
                failed += 1;
            }
        }
    }

    if (failed > 0) return 1;
    console.log(`${NAME}: --self-test PASS -- 2 planted faults went red naming the drifted file`);
    return 0;
}

process.exit(main());
