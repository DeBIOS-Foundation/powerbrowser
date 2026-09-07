#!/usr/bin/env node
// scripts/verify-gui09-setups-copy.mjs
//
// GUI-09's setups-copy gate (14.1.1-03): every user-facing string the
// setups surface paints is the string 14-UI-SPEC.md's Copywriting Contract
// says it is.
//
// G-14.1.1-21 is the reason this file exists: one failure constant was
// flashed for three different failures, so a failed SAVE reported a failed
// restore and a failed DELETE told the user to delete the setup that had
// just failed to delete. Per-action copy is now contracted, and this gate
// pins it.
//
// It DERIVES BOTH SIDES and compares as SET EQUALITY -- there is no
// hand-kept list of expected copy anywhere in this file:
//   * from `setups-service.ts`, comments stripped first, the user-facing
//     literal at every enumerated PAINT SITE (each `flash(...)` argument
//     resolved through the exported constant and template-function tables,
//     the quick-input prompt and placeholder, the ConfirmDialog
//     title/msg/ok/cancel fields, and the `pickSetup` placeholders), with
//     each interpolation slot normalised to `{name}`;
//   * from `14-UI-SPEC.md`, the bolded literals of the Copywriting Contract
//     rows that name a setups surface.
// A literal in the service with no table row is UNREVIEWED COPY; a table
// row with no literal in the service is DROPPED CONTRACT. Both are reported
// by name, so the gate goes red on an addition AND on a removal.
//
// The one hand-kept datum is SETUP_ROW_LABELS below -- a SCOPE SELECTOR
// (which rows of a table shared with modes, panorama and dependent windows
// belong to setups), never an expectation. Every string compared is derived.
//
// A no-internals shape check runs over the same derived service strings. An
// empty derivation on either side fails DISTINCTLY as a broken instrument,
// never passes as clean.
//
// Honestly --quick: it reads two text files. No build, no browser, no
// display, no network.
//
// Usage:
//   node scripts/verify-gui09-setups-copy.mjs
//   node scripts/verify-gui09-setups-copy.mjs --self-test

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const NAME = 'verify-gui09-setups-copy';
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..');

const SERVICE_REL = 'theia/extensions/modes/src/browser/setups-service.ts';
const SPEC_REL = '.planning/milestones/v1.3-phases/14-modes-windows-setups/14-UI-SPEC.md';

/**
 * SCOPE SELECTOR, not an expectation: the Copywriting Contract table is
 * shared by setups, modes, panorama and dependent windows, so the gate has
 * to be told which row labels name a setups surface. The literals in those
 * rows are read from the table at check time and never restated here --
 * editing this list changes WHAT IS COMPARED, never WHAT IT IS COMPARED TO.
 *
 * `Setup row meta` is deliberately absent: it is assembled from stored
 * counts at render time, not painted from a literal in this service.
 */
const SETUP_ROW_LABELS = Object.freeze([
    'Primary CTA (setups)',
    'Setup dialog title',
    'Setup name placeholder',
    'Setup picker placeholder',
    'Empty setup name error',
    'Duplicate setup name error',
    'Empty setups heading',
    'Empty setups body',
    'Restore-failure error',
    'Setup save-failure error',
    'Setup delete-failure error',
    'Setup gone-tabs notice',
    'Setup mode-fallback notice',
    'Setup saved confirmation',
    'Destructive confirmation',
]);

function diff(actual, expected) {
    const a = new Set(actual);
    const e = new Set(expected);
    return {
        surplus: [...a].filter(x => !e.has(x)),
        missing: [...e].filter(x => !a.has(x)),
    };
}

/** Unescape the escapes a single-quoted TS literal may carry. */
function unescapeLiteral(raw) {
    return raw
        .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/\\'/g, '\'')
        .replace(/\\"/g, '"')
        .replace(/\\n/g, '\n')
        .replace(/\\\\/g, '\\');
}

/** Every interpolation slot reads as the spec's `{name}` placeholder token. */
function normaliseSlots(value) {
    return value.replace(/\$\{[^}]*\}/g, '{name}');
}

/**
 * Strip block comments and whole-line `//` comments, so a string named only
 * in a doc comment can never satisfy the derived set. Trailing `//` after
 * code is left alone deliberately: cutting it would need a string-aware
 * scanner, and this source has no such comment on a paint-site line.
 */
function stripComments(src) {
    return src
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .split('\n')
        .filter(line => !/^\s*(\/\/|\*)/.test(line))
        .join('\n');
}

/** name -> value for every exported single-quoted string constant. */
function constantTable(src) {
    const table = new Map();
    for (const m of src.matchAll(/export const (\w+)\s*=\s*'((?:[^'\\]|\\.)*)'\s*;/g)) {
        table.set(m[1], unescapeLiteral(m[2]));
    }
    return table;
}

/** name -> normalised template for every exported string-returning helper. */
function templateTable(src) {
    const table = new Map();
    for (const m of src.matchAll(/export function (\w+)\([^)]*\)\s*:\s*string\s*\{\s*return\s+`([^`]*)`\s*;/g)) {
        table.set(m[1], normaliseSlots(m[2]));
    }
    return table;
}

/**
 * The user-facing literal at every enumerated paint site of the setups
 * service. Returns { copy, unresolved } -- an argument naming no known
 * constant or helper is a broken instrument, not a silent skip.
 */
function derivedServiceCopy(rawSrc) {
    const src = stripComments(rawSrc);
    const consts = constantTable(src);
    const templates = templateTable(src);
    const copy = [];
    const unresolved = [];

    const resolveIdent = (ident) => {
        if (consts.has(ident)) {
            copy.push(consts.get(ident));
        } else {
            unresolved.push(ident);
        }
    };

    // Paint site 1: every status-bar flash argument.
    for (const m of src.matchAll(/this\.flash\(\s*([^;]+?)\s*\)\s*;/g)) {
        const arg = m[1].trim();
        if (arg.startsWith('`')) {
            // A composite flash paints only the constants it splices, so
            // each is derived on its own; the composite is not new copy.
            for (const slot of arg.matchAll(/\$\{\s*(\w+)\s*\}/g)) {
                resolveIdent(slot[1]);
            }
            continue;
        }
        const call = arg.match(/^(\w+)\(.*\)$/);
        if (call) {
            if (templates.has(call[1])) {
                copy.push(templates.get(call[1]));
            } else {
                unresolved.push(call[1]);
            }
            continue;
        }
        if (/^\w+$/.test(arg)) {
            resolveIdent(arg);
            continue;
        }
        if (/^'((?:[^'\\]|\\.)*)'$/.test(arg)) {
            copy.push(unescapeLiteral(arg.slice(1, -1)));
            continue;
        }
        unresolved.push(arg);
    }

    // Paint site 2: the save dialog's quick-input prompt and placeholder.
    for (const m of src.matchAll(/\b(?:prompt|placeHolder|placeholder)\s*:\s*(\w+)\s*[,}]/g)) {
        // `placeHolder: placeHolder` forwards the pickSetup argument; the
        // literal it forwards is derived at the call site below.
        if (consts.has(m[1])) {
            copy.push(consts.get(m[1]));
        }
    }

    // Paint site 3: the Delete Setup confirmation's own fields.
    const dialogAt = src.indexOf('new ConfirmDialog({');
    if (dialogAt >= 0) {
        const dialog = src.slice(dialogAt, dialogAt + 600);
        for (const m of dialog.matchAll(/\b(?:title|ok|cancel)\s*:\s*'((?:[^'\\]|\\.)*)'/g)) {
            copy.push(unescapeLiteral(m[1]));
        }
        const msg = dialog.match(/\bmsg\s*:\s*(\w+)\(/);
        if (msg) {
            if (templates.has(msg[1])) {
                copy.push(templates.get(msg[1]));
            } else {
                unresolved.push(msg[1]);
            }
        }
    }

    // Paint site 4: the quick-pick placeholders naming the picked action.
    for (const m of src.matchAll(/this\.pickSetup\(\s*'((?:[^'\\]|\\.)*)'\s*\)/g)) {
        copy.push(unescapeLiteral(m[1]));
    }

    return { copy: copy.map(normaliseSlots), unresolved };
}

/** The bolded literals of the Copywriting Contract rows naming a setups surface. */
function derivedSpecCopy(specSrc) {
    const copy = [];
    for (const line of specSrc.split('\n')) {
        const row = line.match(/^\|\s*([^|]+?)\s*\|\s*(.*?)\s*\|\s*$/);
        if (!row || !SETUP_ROW_LABELS.includes(row[1])) {
            continue;
        }
        for (const m of row[2].matchAll(/\*\*"(.*?)"\*\*/g)) {
            copy.push(m[1]);
        }
    }
    return copy;
}

/**
 * Internal-identifier shapes that must never sit inside user copy. Shared
 * predicate list with the panorama gate (15-03) rather than a second,
 * divergent one.
 */
function internalsOf(value) {
    const hits = [];
    const bare = value.replace(/\{[^}]+\}/g, '');
    for (const hit of bare.match(/[A-Z]{2,}[A-Z0-9_]*/g) ?? []) {
        hits.push(hit);
    }
    for (const hit of bare.match(/[A-Za-z]{2,}(?:\.[A-Za-z0-9_]{2,}){2,}/g) ?? []) {
        hits.push(hit);
    }
    for (const hit of bare.match(/[a-zA-Z][a-zA-Z0-9+.-]*:\/\//g) ?? []) {
        hits.push(hit);
    }
    for (const hit of bare.match(/:\d{3,5}\b/g) ?? []) {
        hits.push(hit);
    }
    for (const hit of bare.match(/\b\w+[\\/]\w+[\\/]\w+/g) ?? []) {
        hits.push(hit);
    }
    for (const hit of bare.match(/\b\w*(?:Error|Exception)\b:/g) ?? []) {
        hits.push(hit);
    }
    return hits;
}

/** @returns {string[]} failure messages -- empty means the gate holds. */
function checkStatic(sources) {
    const failures = [];
    const serviceSrc = sources[SERVICE_REL] ?? '';
    const specSrc = sources[SPEC_REL] ?? '';

    const { copy: derived, unresolved } = derivedServiceCopy(serviceSrc);
    const contracted = derivedSpecCopy(specSrc);

    if (!derived.length) {
        failures.push(`derived ZERO user-facing strings from ${SERVICE_REL} -- the paint-site enumeration matches nothing, so this comparison proves nothing (broken instrument, not a clean tree)`);
    }
    if (!contracted.length) {
        failures.push(`derived ZERO contracted literals from the Copywriting Contract table in ${SPEC_REL} -- the table parse matches nothing, so this comparison proves nothing (broken instrument, not a clean tree)`);
    }
    if (!derived.length || !contracted.length) {
        return failures;
    }

    for (const ident of new Set(unresolved)) {
        failures.push(`a setups paint site is fed ${JSON.stringify(ident)}, which names no exported copy constant or template helper -- the derivation cannot see the string it paints`);
    }

    const copyDiff = diff(derived, contracted);
    if (copyDiff.surplus.length) {
        failures.push(`user-facing setups strings with NO row in the Copywriting Contract (unreviewed copy): ${copyDiff.surplus.map(s => JSON.stringify(s)).join(', ')}`);
    }
    if (copyDiff.missing.length) {
        failures.push(`contracted setups literals NOT painted by the service (dropped contract): ${copyDiff.missing.map(s => JSON.stringify(s)).join(', ')}`);
    }

    for (const value of new Set(derived)) {
        for (const hit of internalsOf(value)) {
            failures.push(`user-facing string ${JSON.stringify(value)} leaks the internal identifier ${JSON.stringify(hit)} -- it belongs in a diagnostics field row, never in user copy`);
        }
    }

    return failures;
}

function readSources() {
    const read = rel => readFileSync(join(REPO_ROOT, rel), 'utf8');
    return {
        [SERVICE_REL]: read(SERVICE_REL),
        [SPEC_REL]: read(SPEC_REL),
    };
}

function main() {
    const sources = readSources();
    const failures = checkStatic(sources);
    if (failures.length) {
        console.error(`${NAME}: FAIL -- ${failures.length} failure(s):`);
        failures.forEach(f => console.error(`  ${f}`));
        process.exit(1);
    }
    const { copy } = derivedServiceCopy(sources[SERVICE_REL]);
    const contracted = derivedSpecCopy(sources[SPEC_REL]);
    console.log(`${NAME}: PASS -- ${new Set(copy).size} painted setups strings match ${new Set(contracted).size} contracted literals as set equality, no internals in copy`);
}

/** Run one plant: assert it landed, then require the named drift to go red. */
function plant(state, label, mutated, landed, namePattern) {
    if (!landed) {
        console.error(`${NAME} --self-test: FAIL -- '${label}' plant did not land`);
        state.failed += 1;
        return;
    }
    const result = checkStatic(mutated);
    if (!result.some(f => namePattern.test(f))) {
        console.error(`${NAME} --self-test: FAIL -- '${label}' did not go red naming ${namePattern}; got: ${result.join(' | ') || '(no failures at all)'}`);
        state.failed += 1;
        return;
    }
    console.log(`  ok  ${label} -> red, naming ${namePattern}`);
}

function selfTest() {
    const real = readSources();
    const baseline = checkStatic(real);
    if (baseline.length) {
        console.error(`${NAME} --self-test: FAIL -- the unmodified tree is already red, so the planted-fault results below would be meaningless:`);
        baseline.forEach(f => console.error(`  ${f}`));
        process.exit(1);
    }
    console.log(`${NAME} --self-test: unmodified tree green, planting faults`);
    const state = { failed: 0 };

    // Plant 1 (G-14.1.1-21): a reworded save-failure literal in the service
    // must go red -- the table row it drifted away from is now unpainted.
    {
        const service = real[SERVICE_REL].replace('Your saved setups are unchanged', 'Nothing was saved');
        const mutated = { ...real, [SERVICE_REL]: service };
        plant(state, 'reworded save-failure literal', mutated, service.includes('Nothing was saved'), /Nothing was saved/);
    }

    // Plant 2 (G-14.1.1-21): a deleted delete-failure table row must go red
    // naming the now-unreviewed service literal.
    {
        const spec = real[SPEC_REL].split('\n').filter(line => !line.startsWith('| Setup delete-failure error |')).join('\n');
        const mutated = { ...real, [SPEC_REL]: spec };
        plant(state, 'deleted delete-failure table row', mutated, !spec.includes('| Setup delete-failure error |'), /couldn't delete this setup/);
    }

    // Plant 3: an internal identifier inside user copy must go red naming
    // the shape, not merely the set difference.
    {
        const service = real[SERVICE_REL].replace('It\\\'s still in your list', 'powerbrowser.setups.delete failed');
        const mutated = { ...real, [SERVICE_REL]: service };
        plant(state, 'internal identifier in user copy', mutated, service.includes('powerbrowser.setups.delete'), /leaks the internal identifier "powerbrowser\.setups\.delete"/);
    }

    // Plant 4: an empty derivation must fail as a broken instrument rather
    // than pass as a clean tree.
    {
        const mutated = { ...real, [SERVICE_REL]: '' };
        plant(state, 'empty service derivation', mutated, true, /broken instrument/);
    }

    if (state.failed) {
        process.exit(1);
    }
    console.log(`${NAME} --self-test: PASS -- all four fault directions went red naming the drift`);
}

try {
    if (process.argv.includes('--self-test')) {
        selfTest();
    } else {
        main();
    }
} catch (err) {
    console.error(`${NAME}: FAIL -- ${err.message}`);
    process.exit(1);
}
