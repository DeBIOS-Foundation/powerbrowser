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
// command labels, the widget label, the Untitled const), plus (22-02) every
// single-quoted or template literal at any text sink, ternary branches
// included and conditions excluded (see SINK). The two compare as
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

/**
 * 22-02 sink pass: every text sink, any quote style. The right-hand side of a
 * property assignment to .textContent/.title/.placeholder/.alt/.label (a
 * `const title =` declaration is not a sink), or the value of a
 * text-bearing ARIA attribute. State attributes (aria-hidden, -pressed,
 * -valuemin, -valuenow) carry no copy and are not sinks.
 */
const SINK = /\.(?:textContent|title|placeholder|alt|label)\s*=(?!=)\s*([^;\n]+)|setAttribute\('(?:aria-label|aria-valuetext|aria-description|aria-roledescription|aria-placeholder)',\s*([^;\n]+)\)/g;

/** The text after a ternary's top-level `?`, or the whole text when there is none. */
function ternaryBranches(rhs) {
    let quote = null;
    let depth = 0;
    for (let i = 0; i < rhs.length; i += 1) {
        const c = rhs[i];
        if (quote) {
            if (c === '\\') i += 1;
            else if (c === quote) quote = null;
        } else if (c === "'" || c === '"' || c === '`') {
            quote = c;
        } else if ('([{'.includes(c)) {
            depth += 1;
        } else if (')]}'.includes(c)) {
            depth -= 1;
        } else if (c === '?' && depth === 0 && rhs[i + 1] !== '.' && rhs[i + 1] !== '?' && rhs[i - 1] !== '?') {
            return rhs.slice(i + 1);
        }
    }
    return rhs;
}

function sinkCopy(src, out) {
    for (const m of src.matchAll(SINK)) {
        for (const lit of ternaryBranches(m[1] ?? m[2]).matchAll(/'((?:[^'\\\n]|\\.)*)'|`([^`\n]*)`/g)) {
            const text = lit[1] ?? lit[2];
            // Empty literals and pure-slot templates (`${tabs.length}`) are values, not copy.
            if (text && !/^\$\{[^}]*\}$/.test(text)) {
                out.push(unescapeUnicode(text));
            }
        }
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
        sinkCopy(src, out);
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
    // WR-04: both spellings -- raw text and \uXXXX-unescaped -- so an escaped
    // revival cannot hide from a needle that holds the real character.
    const shippedRels = Object.keys(sources).filter(rel => rel !== SPEC_REL);
    const unescaped = Object.fromEntries(shippedRels.map(rel => [rel, unescapeUnicode(sources[rel] ?? '')]));
    for (const needle of retired) {
        const at = shippedRels.find(rel => (sources[rel] ?? '').includes(needle) || unescaped[rel].includes(needle));
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

/** A planted edit: `from` replaced by `to`, or `to` appended when `from` is null. */
function swap(from, to) {
    return {
        apply: text => (from === null ? `${text}\n${to}\n` : text.replace(from, to)),
        // The planted form must be present (or, for a deletion, the anchor gone).
        landed: (before, after) => after !== before && (to ? after.includes(to) : !(typeof from === 'string' ? after.includes(from) : from.test(after))),
    };
}

const matches = (line, m) => (typeof m === 'string' ? line.includes(m) : m.test(line));

function selfTest() {
    const real = readSources();
    const baseline = [...checkStatic(real)];
    if (baseline.length) {
        console.error(`${NAME} --self-test: FAIL -- the unmodified tree is already red, so the planted-fault results below would be meaningless:`);
        baseline.forEach(f => console.error(`  ${f}`));
        process.exit(1);
    }
    console.log(`${NAME} --self-test: unmodified tree green, planting faults`);

    const DESCRIPTORS_REL = `${MODES_BROWSER_REL}/mode-descriptors.ts`;
    // `expect` is a list of groups; each group must be matched in full by one failure line.
    const plants = [
        { id: 'label drift', file: COMMANDS_REL, ...swap("label: 'New Group'", "label: 'New group'"),
            expect: [[/unreviewed copy/, '"New group"']] },
        { id: 'Expand removed', file: WIDGET_REL, ...swap(/^[ \t]*expander\.textContent = 'Expand';\n/m, ''),
            expect: [[/are GONE/, '"Expand"']] },
        { id: 'placeholder revival', file: WIDGET_REL, ...swap(null, "hint.textContent = 'Organising arrives next';"),
            expect: [[/retired copy/, '"Organising arrives next"', WIDGET_REL]] },
        { id: 'unscanned-file revival', file: DESCRIPTORS_REL, ...swap(null, "hint.textContent = 'Back to Browsing';"),
            expect: [[/retired copy/, '"Back to Browsing"', DESCRIPTORS_REL]] },
        { id: 'spec Done row deleted', file: SPEC_REL, ...swap(/^\|[^\n]*\*\*"Done"\*\*[^\n]*\n/m, ''),
            expect: [[/unreviewed copy/, '"Done"']] },
        { id: 'spec Retry reworded', file: SPEC_REL, ...swap('**"Retry"**', '**"Try again"**'),
            expect: [[/unreviewed copy/, '"Retry"'], [/are GONE/, '"Try again"']] },
        { id: 'spec heading stripped', file: SPEC_REL, ...swap(/^## Copywriting Contract$/m, '## Copy Contract'),
            expect: [[/ZERO contracted literals/, SPEC_REL]] },
        { id: 'retired caption revived', file: WIDGET_REL, ...swap(null, "caption.textContent = 'No ungrouped tabs \u2014 drag a tab here to ungroup it.';"),
            expect: [[/retired copy/, '"No ungrouped tabs \u2014 drag a tab here to ungroup it."', WIDGET_REL]] },
        { id: 'escaped revival in an unscanned file', file: DESCRIPTORS_REL, ...swap(null, "x.textContent = 'No ungrouped tabs \\u2014 drag a tab here to ungroup it.';"),
            expect: [[/retired copy/, '"No ungrouped tabs \u2014 drag a tab here to ungroup it."', DESCRIPTORS_REL]] },
        { id: 'Retired copy heading stripped', file: SPEC_REL, ...swap(/^### Retired copy$/m, '### Retired strings'),
            expect: [[/ZERO retired literals/, SPEC_REL]] },
        // 22-02: the broadened sink pass sees ARIA text attributes and template literals.
        { id: 'aria-description literal added', file: WIDGET_REL, ...swap(null, "x.setAttribute('aria-description', 'Planted words')"),
            expect: [[/unreviewed copy/, '"Planted words"']] },
        { id: 'template textContent added', file: WIDGET_REL, ...swap(null, 'x.textContent = `Planted ${n} words`;'),
            expect: [[/unreviewed copy/, '"Planted {} words"']] },
        { id: 'grip value reworded', file: WIDGET_REL, ...swap('`${group.w} by ${group.h} pixels`', '`${group.w} wide, ${group.h} high`'),
            expect: [[/unreviewed copy/, '"{} wide, {} high"'], [/are GONE/, '"{} by {} pixels"']] },
    ];

    let failed = 0;
    for (const plant of plants) {
        const before = real[plant.file] ?? '';
        const after = plant.apply(before);
        if (!plant.landed(before, after)) {
            console.error(`${NAME} --self-test: FAIL -- plant '${plant.id}': anchor drifted in ${plant.file}, so the plant did not land`);
            failed += 1;
            continue;
        }
        const result = checkStatic({ ...real, [plant.file]: after });
        const hits = plant.expect.map(group => result.find(line => group.every(m => matches(line, m))));
        if (hits.some(h => !h)) {
            console.error(`${NAME} --self-test: FAIL -- plant '${plant.id}' did not go red naming the drift; got: ${result.join(' | ') || '(no failures at all)'}`);
            failed += 1;
        } else {
            console.log(`  ok  ${plant.id} -> ${hits.join(' | ')}`);
        }
    }

    if (failed) {
        process.exit(1);
    }
    console.log(`${NAME} --self-test: PASS -- ${plants.length} planted faults went red naming the drift`);
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
