#!/usr/bin/env node
// scripts/verify-gui08-panorama-copy.mjs
//
// GUI-08's panorama-copy gate (15-03, re-derived in 21-03): every contracted
// 15-UI-SPEC string renders verbatim with no internal identifier in
// user-facing copy, and no retired copy survives in shipped sources.
//
// The EXPECTATION is the spec, read at check time: the contracted set is the
// bolded literals of the Copywriting Contract table and the retired set is
// the bolded literals of its `### Retired copy` table, both parsed by
// scripts/lib/ui-spec.mjs from SPEC_REL. No copy list is kept in this file;
// a deliberate copy change is a spec edit, reviewed in the spec's diff.
//
// The ACTUAL is derived from the Theia sources: user-facing literals at the
// enumerated paint sites (textContent, title, aria-label, placeholder,
// buildEmpty/buildBar call args, the ConfirmDialog fields, flash args,
// command labels, the widget label, the Untitled const). The two compare as
// SET EQUALITY after slot normalisation (`${...}` and `{name}`/`{N}` become
// one token; apostrophes and dashes compare exactly) -- a surplus string is
// unreviewed copy, a missing one is dropped contract, each reported BY NAME.
// A NEGATED search asserts zero occurrences of each retired literal in every
// shipped modes-browser source (never the spec, which names them). A
// no-internals shape check runs over the raw derived strings (no pref key,
// table, group_id, bounds, URI-scheme literal, or raw exception shape). An
// empty derivation on either side fails as a broken instrument, never passes.
//
// Honestly --quick: reads text sources only. No build, no browser, no
// display, no network.
//
// Usage:
//   node scripts/verify-gui08-panorama-copy.mjs
//   node scripts/verify-gui08-panorama-copy.mjs --self-test

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { copyContract, normaliseSlots } from './lib/ui-spec.mjs';

const NAME = 'verify-gui08-panorama-copy';
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..');

const MODES_BROWSER_REL = 'theia/extensions/modes/src/browser';
const WIDGET_REL = `${MODES_BROWSER_REL}/organising-widget.ts`;
const TREE_REL = `${MODES_BROWSER_REL}/organising-tree.ts`;
const COMMANDS_REL = `${MODES_BROWSER_REL}/panorama-commands.ts`;
const MODEL_REL = `${MODES_BROWSER_REL}/group-model.ts`;
const CSS_REL = `${MODES_BROWSER_REL}/modes.css`;
const MODULE_REL = `${MODES_BROWSER_REL}/modes-frontend-module.ts`;
const SPEC_REL = '.planning/milestones/v1.3-phases/15-panorama-organising/15-UI-SPEC.md';

function fail(message) {
    throw new Error(`${NAME}: FAIL -- ${message}`);
}

function diff(actual, expected) {
    const a = new Set(actual);
    const e = new Set(expected);
    return {
        surplus: [...a].filter(x => !e.has(x)),
        missing: [...e].filter(x => !x || !a.has(x)),
    };
}

/** Unescape \uXXXX sequences so raw source text compares with literals. */
function unescapeUnicode(raw) {
    return raw.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function pushAll(out, matches) {
    for (const m of matches) {
        out.push(unescapeUnicode(m[1]));
    }
}

/** Every user-facing literal at the enumerated paint sites. */
function derivedCopy(sources) {
    const out = [];
    const widgetSrc = sources[WIDGET_REL] ?? '';
    const treeSrc = sources[TREE_REL] ?? '';
    const commandsSrc = sources[COMMANDS_REL] ?? '';
    const modelSrc = sources[MODEL_REL] ?? '';
    for (const src of [widgetSrc, treeSrc]) {
        pushAll(out, src.matchAll(/textContent\s*=\s*'((?:[^'\\\n]|\\.)+)'/g));
        pushAll(out, src.matchAll(/\btitle\s*=\s*'((?:[^'\\\n]|\\.)+)'/g));
        pushAll(out, src.matchAll(/setAttribute\('aria-label',\s*'([^']+)'\)/g));
        pushAll(out, src.matchAll(/placeholder\s*=\s*'([^']+)'/g));
        for (const m of src.matchAll(/buildEmpty\(\s*'([^']+)'\s*,\s*'([^']+)'/g)) {
            out.push(unescapeUnicode(m[1]), unescapeUnicode(m[2]));
        }
        pushAll(out, src.matchAll(/buildBar\(\s*'((?:[^'\\]|\\.)+)'/g));
        pushAll(out, src.matchAll(/\.label\s*=\s*'([^']+)'/g));
        pushAll(out, src.matchAll(/widgetName:\s*'([^']+)'/g));
    }
    const dialogAt = widgetSrc.indexOf('new ConfirmDialog({');
    if (dialogAt >= 0) {
        const dialog = widgetSrc.slice(dialogAt, dialogAt + 800);
        pushAll(out, dialog.matchAll(/title:\s*'([^']+)'/g));
        pushAll(out, dialog.matchAll(/ok:\s*'([^']+)'/g));
        pushAll(out, dialog.matchAll(/cancel:\s*'([^']+)'/g));
        // 15-UI-REVIEW Top Fix #3: the body rides a `count === 1` branch
        // declared above the dialog block, so both templates are derived
        // by shape (every template naming the close-too clause) rather
        // than by a `msg:`-anchored literal.
        const msgRegion = widgetSrc.slice(Math.max(0, dialogAt - 600), dialogAt + 800);
        for (const m of msgRegion.matchAll(/`([^`]*will close too[^`]*)`/g)) {
            out.push(m[1]);
        }
    }
    for (const m of widgetSrc.matchAll(/flash\(\s*(`[^`]+`)/g)) {
        out.push(m[1].slice(1, -1));
    }
    pushAll(out, commandsSrc.matchAll(/label:\s*'([^']+)'/g));
    pushAll(out, modelSrc.matchAll(/UNTITLED_GROUP_TITLE\s*=\s*'([^']+)'/g));
    return out;
}

/** Internal-identifier shapes that must never sit inside user copy. */
function internalsOf(value) {
    const hits = [];
    const bare = value.replace(/\$\{[^}]+\}/g, '');
    if (/group_id/.test(bare)) {
        hits.push('group_id');
    }
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
    return hits;
}

/** @returns {string[]} failure messages -- empty means the gate holds. */
function checkStatic(sources) {
    const failures = [];
    const derived = derivedCopy(sources);
    if (!derived.length) {
        failures.push('derived ZERO user-facing strings from the panorama sources -- the enumeration matches nothing, so this comparison proves nothing');
        return failures;
    }
    const { contract, retired } = copyContract(sources[SPEC_REL] ?? '');
    if (!contract.length) {
        failures.push(`derived ZERO contracted literals from the Copywriting Contract table in ${SPEC_REL} -- the table parse matches nothing, so this comparison proves nothing (broken instrument, not a clean tree)`);
        return failures;
    }
    const copyDiff = diff(derived.map(normaliseSlots), contract.map(normaliseSlots));
    if (copyDiff.surplus.length) {
        failures.push(`user-facing strings NOT in the declared contract (unreviewed copy): ${copyDiff.surplus.map(s => JSON.stringify(s)).join(', ')}`);
    }
    if (copyDiff.missing.length) {
        failures.push(`declared contract strings are GONE (drifted or removed copy): ${copyDiff.missing.map(s => JSON.stringify(s)).join(', ')}`);
    }
    for (const value of new Set(derived)) {
        for (const hit of internalsOf(value)) {
            failures.push(`user-facing string ${JSON.stringify(value)} leaks the internal identifier ${JSON.stringify(hit)} -- it belongs in a diagnostics field row`);
        }
    }
    if (!retired.length) {
        failures.push(`derived ZERO retired literals from the ### Retired copy table in ${SPEC_REL} -- the table parse matches nothing, so the retired-copy search proves nothing (broken instrument, not a clean tree)`);
        return failures;
    }
    // WR-05b: the retired-copy proof scans the DERIVED shipped set (every
    // modes-browser .ts plus the CSS/module files). The spec names every
    // retired literal, so it is never part of the shipped set.
    const shippedRels = Object.keys(sources).filter(rel => rel !== SPEC_REL);
    for (const needle of retired) {
        const at = shippedRels.find(rel => (sources[rel] ?? '').includes(needle));
        if (at) {
            failures.push(`retired copy ${JSON.stringify(needle)} survives in ${at} -- the 15-UI-SPEC Retired copy table says it must not ship`);
        }
    }
    return failures;
}

function readSources() {
    const read = rel => readFileSync(join(REPO_ROOT, rel), 'utf8');
    const sources = {
        [WIDGET_REL]: read(WIDGET_REL),
        [TREE_REL]: read(TREE_REL),
        [COMMANDS_REL]: read(COMMANDS_REL),
        [MODEL_REL]: read(MODEL_REL),
        [CSS_REL]: read(CSS_REL),
        [MODULE_REL]: read(MODULE_REL),
        [SPEC_REL]: read(SPEC_REL),
    };
    // WR-05b: derive the shipped set -- every modes-browser .ts rides the
    // retired-copy proof, so a seventh file cannot silently carry a revival.
    for (const file of readdirSync(join(REPO_ROOT, MODES_BROWSER_REL))) {
        if (file.endsWith('.ts')) {
            const rel = `${MODES_BROWSER_REL}/${file}`;
            if (!(rel in sources)) {
                sources[rel] = read(rel);
            }
        }
    }
    return sources;
}

function main() {
    const sources = readSources();
    const failures = [...checkStatic(sources)];
    if (failures.length) {
        console.error(`${NAME}: FAIL -- ${failures.length} failure(s):`);
        failures.forEach(f => console.error(`  ${f}`));
        process.exit(1);
    }
    const { contract, retired } = copyContract(sources[SPEC_REL]);
    const painted = new Set(derivedCopy(sources).map(normaliseSlots)).size;
    console.log(`${NAME}: PASS -- ${painted} painted strings equal the ${new Set(contract.map(normaliseSlots)).size} literals of the 15-UI-SPEC Copywriting Contract; ${retired.length} retired literals absent; no internals in copy`);
}

function selfTest() {
    const real = readSources();
    const baseline = [...checkStatic(real)];
    if (baseline.length) {
        console.error(`${NAME} --self-test: FAIL -- the unmodified tree is already red, so the planted-fault results below would be meaningless:`);
        baseline.forEach(f => console.error(`  ${f}`));
        process.exit(1);
    }
    console.log(`${NAME} --self-test: unmodified tree green, planting faults`);
    let failed = 0;

    // Plant 1: label drift must go red naming the drift.
    {
        const mutated = { ...real, [COMMANDS_REL]: real[COMMANDS_REL].replace("label: 'New Group'", "label: 'New group'") };
        const landed = mutated[COMMANDS_REL].includes("label: 'New group'");
        const result = checkStatic(mutated);
        if (!landed) {
            console.error(`${NAME} --self-test: FAIL -- 'label drift' plant did not land`);
            failed += 1;
        } else if (!result.some(f => /New group/.test(f))) {
            console.error(`${NAME} --self-test: FAIL -- 'label drift' did not go red naming 'New group'; got: ${result.join(' | ') || '(no failures at all)'}`);
            failed += 1;
        } else {
            console.log(`  ok  label drift -> red, naming 'New group'`);
        }
    }

    // Plant 2: a removed string must go red naming the drift.
    {
        const needle = "caption.textContent = 'No ungrouped tabs";
        const mutated = { ...real, [WIDGET_REL]: real[WIDGET_REL].replace(`${needle} \u2014 drag a tab here to ungroup it.';`, '') };
        const landed = !mutated[WIDGET_REL].includes('No ungrouped tabs');
        const result = checkStatic(mutated);
        if (!landed) {
            console.error(`${NAME} --self-test: FAIL -- 'removed string' plant did not land`);
            failed += 1;
        } else if (!result.some(f => /No ungrouped tabs/.test(f))) {
            console.error(`${NAME} --self-test: FAIL -- 'removed string' did not go red naming the caption; got: ${result.join(' | ') || '(no failures at all)'}`);
            failed += 1;
        } else {
            console.log(`  ok  removed string -> red, naming the caption`);
        }
    }

    // Plant 3: a reintroduced placeholder line must go red naming the drift.
    {
        const mutated = { ...real, [WIDGET_REL]: `${real[WIDGET_REL]}\nhint.textContent = 'Organising arrives next';\n` };
        const landed = mutated[WIDGET_REL].includes('Organising arrives next');
        const result = checkStatic(mutated);
        if (!landed) {
            console.error(`${NAME} --self-test: FAIL -- 'reintroduced placeholder' plant did not land`);
            failed += 1;
        } else if (!result.some(f => /Organising arrives next/.test(f))) {
            console.error(`${NAME} --self-test: FAIL -- 'reintroduced placeholder' did not go red naming the placeholder; got: ${result.join(' | ') || '(no failures at all)'}`);
            failed += 1;
        } else {
            console.log(`  ok  reintroduced placeholder -> red, naming the placeholder`);
        }
    }

    // Plant 4 (WR-05b): retired copy revived in a previously-unscanned file
    // must go red naming the file.
    {
        const OTHER_REL = `${MODES_BROWSER_REL}/mode-descriptors.ts`;
        const mutated = { ...real, [OTHER_REL]: `${real[OTHER_REL]}\nhint.textContent = 'Back to Browsing';\n` };
        const landed = mutated[OTHER_REL].includes('Back to Browsing');
        const result = checkStatic(mutated);
        if (!landed) {
            console.error(`${NAME} --self-test: FAIL -- 'unscanned-file placeholder' plant did not land`);
            failed += 1;
        } else if (!result.some(f => /Back to Browsing/.test(f) && new RegExp(OTHER_REL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(f))) {
            console.error(`${NAME} --self-test: FAIL -- 'unscanned-file placeholder' did not go red naming the file; got: ${result.join(' | ') || '(no failures at all)'}`);
            failed += 1;
        } else {
            console.log(`  ok  unscanned-file placeholder -> red, naming the file`);
        }
    }

    if (failed) {
        process.exit(1);
    }
    console.log(`${NAME} --self-test: PASS -- all four fault directions went red naming the drift`);
}

if (process.argv.includes('--self-test')) {
    try {
        selfTest();
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
} else {
    try {
        main();
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
}
