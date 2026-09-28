#!/usr/bin/env node
// scripts/verify-gui09-setups-copy.mjs
//
// GUI-09's setups-copy gate (14.1.1-03): every user-facing string the
// setups surface paints is the string 14-UI-SPEC.md's Copywriting Contract
// says it is, and the Delete Setup confirmation -- the ONLY destructive
// action in Phase 14 -- carries the destructive-ink class the spec reserves
// for it.
//
// Two gaps are the reason this file exists:
//   G-14.1.1-21 -- one failure constant was flashed for three different
//     failures, so a failed SAVE reported a failed restore and a failed
//     DELETE told the user to delete the setup that had just failed to
//     delete. Per-action copy is now contracted, and this gate pins it.
//   G-14.1.1-22 -- `deleteSetup` opened a stock ConfirmDialog with no class,
//     so the phase's only destructive button rendered in stock accent while
//     14-UI-SPEC.md:136 reserves `--color-danger` for exactly it.
//
// It DERIVES BOTH SIDES and compares as SET EQUALITY -- there is no
// hand-kept list of expected copy anywhere in this file:
//   * from `setups-service.ts`, comments stripped first, the user-facing
//     literal at every one of the FIVE enumerated PAINT SITES (each
//     `flash(...)` argument resolved through the exported constant and
//     template-function tables, the quick-input prompt and placeholder, the
//     ConfirmDialog title/msg/ok/cancel fields, the `pickSetup`
//     placeholders, and every `throw new Error(...)` argument), with each
//     interpolation slot normalised to `{name}`;
//     The fifth site was added by 14.1.1-09 (CR-03): Theia renders a thrown
//     command error verbatim, so a thrown string is user copy. It resolves
//     only a bare identifier; a raw literal, concatenation or template at
//     that site is UNRESOLVED and red, which is the point -- after this, a
//     thrown user-facing string that is not a contracted constant cannot
//     reach the screen past the commit gate.
//   * from `14-UI-SPEC.md`, the bolded literals of the Copywriting Contract
//     rows that name a setups surface.
// A literal in the service with no table row is UNREVIEWED COPY; a table
// row with no literal in the service is DROPPED CONTRACT. Both are reported
// by name, so the gate goes red on an addition AND on a removal. The
// ConfirmDialog site (paint site 3) is enumerated, not positional: since
// 14.1.1-12 it walks EVERY `new ConfirmDialog({...})` construction in the
// service, reads all four copy fields of each one's own object literal
// (`title`, `ok`, `cancel` as literals; `msg` in any of the four forms the
// flash site accepts, since pass-3 CR-01), and attributes each `addClass`
// to that dialog's own binding -- so a second dialog's copy, its body text
// in particular, and a second dialog's missing class are all red (self-test
// plants 9, 10, 11 and 12).
// Two limits, stated here because a comment may claim only the reach that
// exists: the gate reads ONLY `setups-service.ts`, so a confirmation painted
// from another file in the modes extension is outside its scope; and each
// dialog body is found by brace counting, so a `{` or `}` inside a string
// literal would confuse it (see confirmDialogs()).
//
// The one hand-kept datum is SETUP_ROW_LABELS below -- a SCOPE SELECTOR
// (which rows of a table shared with modes, panorama and dependent windows
// belong to setups), never an expectation. Every string compared is derived.
//
// A no-internals shape check runs over the same derived service strings, and
// the destructive-ink half derives each dialog's class from its own binding
// in the service and the danger-scoped selectors from `modes.css`, and
// requires every dialog to carry a class in that set -- neither side is a
// literal kept here either, and there is no count assertion. An empty
// derivation on either side fails DISTINCTLY as a broken instrument, never
// passes as clean.
//
// Honestly --quick: it reads three text files. No build, no browser, no
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
const CSS_REL = 'theia/extensions/modes/src/browser/modes.css';
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
    'Dependent-window unsupported-tab error',
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
 *
 * `opts.throwSite` exists ONLY for the self-test's plant 7, which needs the
 * pre-widening derivation (paint sites 1-4) to show that the hole this plan
 * closed was real. It is the SAME code with site 5 skipped, never a
 * hand-copied replica that could drift away from the real deriver.
 */
function derivedServiceCopy(rawSrc, opts = {}) {
    const withThrowSite = opts.throwSite !== false;
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

    /**
     * The four ways one argument can name copy: a composite that splices
     * constants, a template-helper call, a bare identifier, or a raw
     * literal. Anything else is unresolved and red.
     *
     * Shared by the flash site and the ConfirmDialog `msg` field so the two
     * cannot see different subsets of those forms. They did: `msg` matched
     * only `ident(`, so a raw literal or a bare constant in a dialog body
     * was neither counted as copy nor reported (14.1.1 pass-3 CR-01), and a
     * second dialog whose body was uncontracted text passed green.
     */
    const resolveArg = (arg) => {
        if (arg.startsWith('`')) {
            // A composite paints only the constants it splices, so each is
            // derived on its own; the composite is not new copy.
            for (const slot of arg.matchAll(/\$\{\s*(\w+)\s*\}/g)) {
                resolveIdent(slot[1]);
            }
            return;
        }
        const call = arg.match(/^(\w+)\(.*\)$/);
        if (call) {
            if (templates.has(call[1])) {
                copy.push(templates.get(call[1]));
            } else {
                unresolved.push(call[1]);
            }
            return;
        }
        if (/^\w+$/.test(arg)) {
            resolveIdent(arg);
            return;
        }
        if (/^'((?:[^'\\]|\\.)*)'$/.test(arg)) {
            copy.push(unescapeLiteral(arg.slice(1, -1)));
            return;
        }
        unresolved.push(arg);
    };

    // Paint site 1: every status-bar flash argument.
    for (const m of src.matchAll(/this\.flash\(\s*([^;]+?)\s*\)\s*;/g)) {
        resolveArg(m[1].trim());
    }

    // Paint site 2: the save dialog's quick-input prompt and placeholder.
    for (const m of src.matchAll(/\b(?:prompt|placeHolder|placeholder)\s*:\s*(\w+)\s*[,}]/g)) {
        // `placeHolder: placeHolder` forwards the pickSetup argument; the
        // literal it forwards is derived at the call site below.
        if (consts.has(m[1])) {
            copy.push(consts.get(m[1]));
        }
    }

    // Paint site 3: every ConfirmDialog's own title/msg/ok/cancel fields,
    // one dialog at a time over that dialog's matched object literal
    // (14.1.1-12, gap 2). A second dialog is read exactly like the first;
    // the positional `indexOf` plus fixed slice this replaces read only one.
    for (const dialog of confirmDialogs(src)) {
        for (const m of dialog.body.matchAll(/\b(?:title|ok|cancel)\s*:\s*'((?:[^'\\]|\\.)*)'/g)) {
            copy.push(unescapeLiteral(m[1]));
        }
        // The whole `msg:` value, to end of its line, minus a trailing
        // comma -- then resolved by the same dispatch the flash site uses.
        // A value the line match cannot capture whole (a call broken across
        // lines) lands in `unresolved` and is red, never a silent skip.
        const msg = dialog.body.match(/\bmsg\s*:\s*(.+?),?\s*$/m);
        if (msg) {
            resolveArg(msg[1].trim());
        }
    }

    // Paint site 4: the quick-pick placeholders naming the picked action.
    for (const m of src.matchAll(/this\.pickSetup\(\s*'((?:[^'\\]|\\.)*)'\s*\)/g)) {
        copy.push(unescapeLiteral(m[1]));
    }

    // Paint site 5 (14.1.1-09, CR-03): every `throw new Error(...)` argument.
    // Theia renders a thrown command error verbatim, so this IS a paint site.
    // Only a bare identifier resolves; a raw literal, a concatenation or a
    // template goes to `unresolved` and is red. That asymmetry is the point:
    // thrown user-facing copy must be a contracted constant like every other
    // string this service paints.
    if (withThrowSite) {
        for (const m of src.matchAll(/throw new Error\(\s*([\s\S]*?)\s*\)\s*;/g)) {
            const arg = m[1].trim();
            if (/^\w+$/.test(arg)) {
                resolveIdent(arg);
            } else {
                unresolved.push(arg);
            }
        }
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

/**
 * Every `new ConfirmDialog({ ... })` construction in the comment-stripped
 * source, in source order, as `{ binding, body }`: `binding` is the simple
 * `const`/`let`/`var` name the construction is assigned to (undefined when
 * it is not assigned to one), `body` is the object literal from its opening
 * `{` to the matching `}`.
 *
 * This is a BRACE COUNTER, not a parser. A `{` or `}` inside a string
 * literal would confuse it; template interpolations are balanced, so they
 * do not; the service today contains neither case. That limit is stated
 * here beside the code in place of the fixed 600-character slice it
 * replaces, which silently truncated a long dialog and read unrelated code
 * after a short one.
 */
function confirmDialogs(src) {
    const dialogs = [];
    for (const m of src.matchAll(/(?:(?:const|let|var)\s+(\w+)\s*=\s*)?new ConfirmDialog\(\s*\{/g)) {
        const open = m.index + m[0].length - 1;
        let depth = 0;
        let close = src.length - 1;
        for (let i = open; i < src.length; i += 1) {
            if (src[i] === '{') {
                depth += 1;
            } else if (src[i] === '}' && --depth === 0) {
                close = i;
                break;
            }
        }
        dialogs.push({ binding: m[1], body: src.slice(open, close + 1) });
    }
    return dialogs;
}

/**
 * Per dialog, the class names handed to THAT dialog through the public
 * Widget addClass API -- matched by a pattern anchored on the dialog's own
 * binding, never by a file-wide count of `.addClass(` calls. An unbound
 * construction gets `classes: []`, because a class cannot be attributed to
 * a construction that is never bound; checkStatic() flags it. Two dialogs
 * bound to the same name in different scopes would share attributions; the
 * service today binds each dialog to its own name.
 *
 * @returns {{ binding: string | undefined, classes: string[] }[]}
 */
function derivedDialogClasses(rawSrc) {
    const src = stripComments(rawSrc);
    return confirmDialogs(src).map(({ binding }) => {
        if (!binding) {
            return { binding, classes: [] };
        }
        const addClass = new RegExp('\\b' + binding + '\\.addClass\\(\\s*\'([^\']+)\'\\s*\\)', 'g');
        return { binding, classes: [...src.matchAll(addClass)].map(m => m[1]) };
    });
}

/**
 * Class names of the sheet's rules that set a property to the danger token.
 * Comments are stripped first, then every innermost `selector { decls }`
 * block is walked -- the leading `}` of the previous rule is deliberately NOT
 * part of the pattern, because consuming it makes two ADJACENT rules
 * unmatchable and the second one invisible to this gate.
 */
function derivedDangerClasses(cssSrc) {
    const classes = [];
    const stripped = cssSrc.replace(/\/\*[\s\S]*?\*\//g, '');
    for (const m of stripped.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        if (!/--color-danger/.test(m[2])) {
            continue;
        }
        for (const hit of m[1].matchAll(/\.([A-Za-z][\w-]*)/g)) {
            classes.push(hit[1]);
        }
    }
    return classes;
}

/** @returns {string[]} failure messages -- empty means the gate holds. */
function checkStatic(sources) {
    const failures = [];
    const serviceSrc = sources[SERVICE_REL] ?? '';
    const specSrc = sources[SPEC_REL] ?? '';
    const cssSrc = sources[CSS_REL] ?? '';

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

    // G-14.1.1-22: the destructive-ink half, per dialog (14.1.1-12). Both
    // sides derived -- each dialog's class from its own binding in the
    // service, the danger-scoped selectors from the sheet -- so the gate goes
    // red on a removal at either end AND on a second dialog that adds no
    // class. There is deliberately no count assertion: "exactly one dialog"
    // would be a hand-kept number with nothing in the tree to derive it
    // from; "every dialog carries a danger-scoped class" is derived on both
    // sides.
    const dialogs = derivedDialogClasses(serviceSrc);
    const dangerClasses = new Set(derivedDangerClasses(cssSrc));
    const dangerList = [...dangerClasses].map(c => JSON.stringify(c)).join(', ') || 'none';
    if (dialogs.length === 0) {
        failures.push(`derived ZERO ConfirmDialog constructions from ${SERVICE_REL} -- the dialog enumeration matches nothing, so the destructive-ink comparison proves nothing (broken instrument, not a clean tree)`);
    }
    for (const { binding, classes } of dialogs) {
        if (!binding) {
            failures.push(`${SERVICE_REL} constructs a ConfirmDialog that is not assigned to a binding, so no class can be attributed to it -- the destructive-ink assertion cannot see whether it carries one`);
            continue;
        }
        if (classes.length === 0) {
            failures.push(`${SERVICE_REL} adds NO class to the confirmation dialog bound to "${binding}" -- 14-UI-SPEC.md:218 contracts one confirmation on this surface and it is destructive, so every dialog here must carry the danger-scoped class`);
            continue;
        }
        for (const cls of classes) {
            if (!dangerClasses.has(cls)) {
                failures.push(`the setups dialog class ${JSON.stringify(cls)} on the dialog bound to "${binding}" has no danger-scoped rule in ${CSS_REL} -- the confirm button renders in stock accent (danger-scoped classes found: ${dangerList})`);
            }
        }
    }

    return failures;
}

function readSources() {
    const read = rel => readFileSync(join(REPO_ROOT, rel), 'utf8');
    return {
        [SERVICE_REL]: read(SERVICE_REL),
        [CSS_REL]: read(CSS_REL),
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
    const dialogs = derivedDialogClasses(sources[SERVICE_REL]);
    const ink = dialogs.map(d => `"${d.binding}" carries ${d.classes.map(c => JSON.stringify(c)).join(' + ')}`).join('; ');
    console.log(`${NAME}: PASS -- ${new Set(copy).size} painted setups strings, derived from five paint sites, match ${new Set(contracted).size} contracted literals as set equality, no internals in copy, ${dialogs.length} ConfirmDialog construction(s) each with a danger-scoped class (${ink})`);
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

    // Plant 5 (G-14.1.1-22): the addClass call removed must go red naming
    // the dialog that lost its destructive class.
    {
        const service = real[SERVICE_REL].replace(/^\s*dialog\.addClass\('[^']+'\);\n/m, '');
        const mutated = { ...real, [SERVICE_REL]: service };
        plant(state, 'removed dialog addClass', mutated, !/addClass\(/.test(service), /adds NO class to the confirmation dialog/);
    }

    // Plant 6 (G-14.1.1-22): the danger-scoped CSS rule removed must go red
    // naming the class that lost its rule.
    {
        const css = real[CSS_REL].replace(/\.pb-setup-delete-confirm \.theia-button\.main \{[^}]*\}/, '');
        const mutated = { ...real, [CSS_REL]: css };
        plant(state, 'removed danger-scoped CSS rule', mutated, !css.includes('.pb-setup-delete-confirm .theia-button.main'), /has no danger-scoped rule/);
    }

    // Plant 7 (14.1.1-09, CR-03) -- at the `throw new Error` site
    // specifically: an internal identifier put back into the thrown refusal
    // must go red naming the shape. This is the plant that proves the fifth
    // paint site is load-bearing, so it carries its own POSITIVE CONTROL:
    // the same scratch copy is re-derived with site 5 skipped (the
    // pre-widening deriver), and that derivation must NOT see the planted
    // identifier. The absence claim is safe to make only because the widened
    // path above just went red on the identical input -- the instrument is
    // proven capable of firing before its silence is read as evidence.
    {
        const service = real[SERVICE_REL].replace(
            "'PowerBrowser can\\'t open this tab",
            "'powerbrowser.setups.open-dependent: PowerBrowser can\\'t open this tab"
        );
        const mutated = { ...real, [SERVICE_REL]: service };
        plant(
            state,
            'internal identifier back in the thrown refusal (throw site)',
            mutated,
            service.includes('powerbrowser.setups.open-dependent'),
            /leaks the internal identifier "powerbrowser\.setups\.open"/
        );
        const preWidening = derivedServiceCopy(service, { throwSite: false });
        const preWideningHits = [...new Set(preWidening.copy)]
            .flatMap(internalsOf)
            .filter(hit => hit.startsWith('powerbrowser.setups.open'));
        if (preWideningHits.length) {
            console.error(`${NAME} --self-test: FAIL -- the pre-widening deriver saw ${JSON.stringify(preWideningHits)}, so plant 7 proves nothing about the hole the fifth paint site closed`);
            state.failed += 1;
        } else {
            console.log('  ok  pre-widening deriver (sites 1-4) on the same plant: GREEN -- the hole was real');
        }
    }

    // Plant 8 (14.1.1-09, CR-03) -- also at the `throw new Error` site: an
    // uncontracted raw literal thrown in place of the constant must go red as
    // unresolved, naming the argument the derivation could not resolve.
    {
        const service = real[SERVICE_REL].replace(
            'throw new Error(SETUP_DEPENDENT_UNSUPPORTED);',
            "throw new Error('this tab cannot open in a dependent window');"
        );
        const mutated = { ...real, [SERVICE_REL]: service };
        plant(
            state,
            'raw literal thrown instead of the contracted constant (throw site)',
            mutated,
            service.includes("throw new Error('this tab cannot open"),
            /a setups paint site is fed .*this tab cannot open in a dependent window.*which names no exported copy constant/
        );
    }

    // Plants 9 and 10 (14.1.1-12, gap 2) insert a SECOND ConfirmDialog
    // immediately after the first dialog's addClass line -- the anchor is the
    // exact text of that line, so a drifted anchor fails as `did not land`
    // rather than passing silently.
    const ADD_CLASS_ANCHOR = "            dialog.addClass('pb-setup-delete-confirm');\n";

    // Plant 9: a second dialog whose title/ok/cancel have no Copywriting
    // Contract row. It carries the danger class so the ink half stays green
    // and only the copy half fires -- red naming one of ITS OWN literals,
    // which the positional pre-change gate could not see at all.
    {
        const service = real[SERVICE_REL].replace(ADD_CLASS_ANCHOR, ADD_CLASS_ANCHOR
            + '            const second = new ConfirmDialog({\n'
            + "                title: 'Discard Draft',\n"
            + '                msg: setupDeleteBody(row.name),\n'
            + "                ok: 'Discard',\n"
            + "                cancel: 'Keep',\n"
            + '            });\n'
            + "            second.addClass('pb-setup-delete-confirm');\n");
        const mutated = { ...real, [SERVICE_REL]: service };
        plant(state, 'second ConfirmDialog with uncontracted copy', mutated, service.includes('Discard Draft'), /Discard Draft/);
    }

    // Plant 10: a second destructive dialog carrying NO class. Its literals
    // are the contracted ones the first dialog already uses, so the derived
    // copy SET is unchanged and the copy half stays green -- the only red is
    // the ink one, naming the binding that lacks a class. The absence of a
    // copy-set red is asserted too, because that is what makes the red
    // attributable to the ink half rather than to the plant's own text.
    {
        const service = real[SERVICE_REL].replace(ADD_CLASS_ANCHOR, ADD_CLASS_ANCHOR
            + '            const second = new ConfirmDialog({\n'
            + "                title: 'Delete Setup',\n"
            + '                msg: setupDeleteBody(row.name),\n'
            + "                ok: 'Delete',\n"
            + "                cancel: 'Cancel',\n"
            + '            });\n');
        const mutated = { ...real, [SERVICE_REL]: service };
        const landed = service.includes('const second = new ConfirmDialog');
        plant(state, 'second destructive dialog with no class', mutated, landed, /adds NO class to the confirmation dialog bound to "second"/);
        if (landed) {
            const copyReds = checkStatic(mutated).filter(f => /unreviewed copy|dropped contract/.test(f));
            if (copyReds.length) {
                console.error(`${NAME} --self-test: FAIL -- plant 10 also went red on the copy set (${copyReds.join(' | ')}), so its ink red is not attributable`);
                state.failed += 1;
            } else {
                console.log('  ok  plant 10 copy half: GREEN -- the red is the ink assertion alone');
            }
        }
    }

    // Plants 11 and 12 (pass-3 CR-01) exercise the two `msg:` forms the
    // pre-fix deriver could not see at all. Both carry the danger class and
    // reuse the first dialog's contracted title/ok/cancel, so the ink half
    // and the rest of the copy set stay green and the ONLY red is the one
    // the dialog's own body text causes.

    // Plant 11: a raw literal body. Pre-fix this was neither copy nor
    // unresolved -- the gate printed PASS over uncontracted dialog text.
    {
        const service = real[SERVICE_REL].replace(ADD_CLASS_ANCHOR, ADD_CLASS_ANCHOR
            + '            const second = new ConfirmDialog({\n'
            + "                title: 'Delete Setup',\n"
            + "                msg: 'Everything you saved will be wiped.',\n"
            + "                ok: 'Delete',\n"
            + "                cancel: 'Cancel',\n"
            + '            });\n'
            + "            second.addClass('pb-setup-delete-confirm');\n");
        const mutated = { ...real, [SERVICE_REL]: service };
        plant(
            state,
            'raw literal dialog body (msg)',
            mutated,
            service.includes("msg: 'Everything you saved will be wiped.'"),
            /unreviewed copy.*Everything you saved will be wiped\./
        );
    }

    // Plant 12: a bare identifier naming an exported constant with no
    // Copywriting Contract row. Same hole, one form over: pre-fix the
    // identifier did not match `ident(` either, so it too was invisible.
    {
        const service = real[SERVICE_REL].replace(ADD_CLASS_ANCHOR, ADD_CLASS_ANCHOR
            + '            const second = new ConfirmDialog({\n'
            + "                title: 'Delete Setup',\n"
            + '                msg: WIPE_BODY,\n'
            + "                ok: 'Delete',\n"
            + "                cancel: 'Cancel',\n"
            + '            });\n'
            + "            second.addClass('pb-setup-delete-confirm');\n")
            + "\nexport const WIPE_BODY = 'Everything you saved will be wiped.';\n";
        const mutated = { ...real, [SERVICE_REL]: service };
        plant(
            state,
            'uncontracted exported constant as dialog body (msg)',
            mutated,
            service.includes('msg: WIPE_BODY') && service.includes('export const WIPE_BODY'),
            /unreviewed copy.*Everything you saved will be wiped\./
        );
    }

    if (state.failed) {
        process.exit(1);
    }
    console.log(`${NAME} --self-test: PASS -- all twelve fault directions went red naming the drift (two at the throw paint site, four from a second ConfirmDialog, two of those its body copy), and the pre-widening deriver stayed green on plant 7`);
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
