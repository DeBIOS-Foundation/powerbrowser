#!/usr/bin/env node
// scripts/verify-gui08-panorama-copy.mjs
//
// GUI-08's panorama-copy gate (15-03): every contracted 15-UI-SPEC string
// renders verbatim with no internal identifier in user-facing copy, and no
// retired placeholder copy survives in shipped sources.
//
// It DERIVES at check time from the Theia sources: user-facing literals at
// the enumerated paint sites (textContent, title, aria-label, placeholder,
// buildEmpty/buildBar call args, the ConfirmDialog fields, flash args,
// command labels, the widget label, the Untitled const) versus the one
// EXPECTED block, compared as SET EQUALITY -- a surplus string is
// unreviewed copy, a missing one is dropped contract, a reworded label
// breaks the contract -- each reported BY NAME. A NEGATED search asserts
// zero occurrences of the retired placeholder copy in shipped sources. A
// no-internals shape check runs over the same derived strings (no pref
// key, table, group_id, bounds, URI-scheme literal, or raw exception
// shape inside user-facing copy). An empty derivation fails as a broken
// instrument, never passes as clean.
//
// This is a NEW file rather than an extension of the shell-error-copy
// harness: that harness proves table-derived error text plus a leak shape,
// while this gate proves verbatim contracted literals plus placeholder
// absence -- one gate owns these strings.
//
// Honestly --quick: reads text sources only. No build, no browser, no
// display, no network.
//
// Usage:
//   node scripts/verify-gui08-panorama-copy.mjs
//   node scripts/verify-gui08-panorama-copy.mjs --self-test

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const NAME = 'verify-gui08-panorama-copy';
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..');

const WIDGET_REL = 'theia/extensions/modes/src/browser/organising-widget.ts';
const TREE_REL = 'theia/extensions/modes/src/browser/organising-tree.ts';
const COMMANDS_REL = 'theia/extensions/modes/src/browser/panorama-commands.ts';
const MODEL_REL = 'theia/extensions/modes/src/browser/group-model.ts';
const CSS_REL = 'theia/extensions/modes/src/browser/modes.css';
const MODULE_REL = 'theia/extensions/modes/src/browser/modes-frontend-module.ts';

/**
 * The declared panorama copy contract. The ONE hand-kept block in this
 * file: editing it is how a deliberate copy change is made -- it shows up
 * in the diff for review. Everything it is compared against is derived at
 * check time from the sources named above. Entries marked MECHANICAL are
 * control glyphs and carried a11y labels the enumeration surfaces, not
 * contracted UI-SPEC prose -- pinned so their removal still goes red.
 */
const EXPECTED_COPY = Object.freeze([
    'New Group',
    'Canvas',
    'Tree',
    'Zoom in',
    'Zoom out',
    'Reset zoom',
    'Group name',
    'Untitled group',
    'No tab groups',
    'There are no tab groups yet \u2014 choose New Group, or drag a tab onto the canvas to start one.',
    'There are no tab groups yet \u2014 choose New Group to start one.',
    'Empty group \u2014 drag tabs here.',
    'Ungrouped',
    'No ungrouped tabs \u2014 drag a tab here to ungroup it.',
    'Power Browser couldn\u2019t load your tab groups. Your tabs are unchanged \u2014 choose Retry.',
    'Power Browser couldn\u2019t save your tab groups. The canvas shows your latest arrangement \u2014 choose Retry.',
    'Retry',
    'Close group',
    'Close Group',
    'Close "${group.title}"? Its ${count} tab(s) will close too. You can\'t undo this.',
    'Cancel',
    'Group "${closed.name}" closed.',
    'Organising',
    // MECHANICAL: resize-grip screen-reader label, kept verbatim.
    'Resize group',
    // MECHANICAL: zoom-step and close control glyphs, kept verbatim.
    '\u2212',
    '+',
    '100%',
    '\u00d7',
]);

/** Retired placeholder copy: zero occurrences allowed in shipped sources. */
const RETIRED_COPY = Object.freeze([
    'Organising arrives next',
    'Back to Browsing',
    'The freeform canvas for arranging tabs lands in the next update',
]);

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
        for (const m of dialog.matchAll(/msg:\s*`([^`]+)`/g)) {
            out.push(m[1]);
        }
        pushAll(out, dialog.matchAll(/ok:\s*'([^']+)'/g));
        pushAll(out, dialog.matchAll(/cancel:\s*'([^']+)'/g));
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
    const copyDiff = diff(derived, [...EXPECTED_COPY]);
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
    const shipped = [WIDGET_REL, TREE_REL, CSS_REL, COMMANDS_REL, MODEL_REL, MODULE_REL]
        .map(rel => sources[rel] ?? '');
    RETIRED_COPY.forEach((needle, index) => {
        const holder = [WIDGET_REL, TREE_REL, CSS_REL, COMMANDS_REL, MODEL_REL, MODULE_REL][shipped.findIndex(src => src.includes(needle))];
        if (holder) {
            failures.push(`retired placeholder copy ${JSON.stringify(RETIRED_COPY[index])} survives in ${holder} -- the placeholder is retired, not reused`);
        }
    });
    return failures;
}

function readSources() {
    const read = rel => readFileSync(join(REPO_ROOT, rel), 'utf8');
    return {
        [WIDGET_REL]: read(WIDGET_REL),
        [TREE_REL]: read(TREE_REL),
        [COMMANDS_REL]: read(COMMANDS_REL),
        [MODEL_REL]: read(MODEL_REL),
        [CSS_REL]: read(CSS_REL),
        [MODULE_REL]: read(MODULE_REL),
    };
}

function main() {
    const sources = readSources();
    const failures = [...checkStatic(sources)];
    if (failures.length) {
        console.error(`${NAME}: FAIL -- ${failures.length} failure(s):`);
        failures.forEach(f => console.error(`  ${f}`));
        process.exit(1);
    }
    console.log(`${NAME}: PASS -- contracted copy verbatim, placeholder absent, no internals in copy`);
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

    if (failed) {
        process.exit(1);
    }
    console.log(`${NAME} --self-test: PASS -- all three fault directions went red naming the drift`);
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
