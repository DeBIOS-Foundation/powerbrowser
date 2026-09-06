#!/usr/bin/env node
// scripts/verify-gui08-view-parity.mjs
//
// GUI-08's view-parity gate (15-03): the tree renders over the SAME
// GroupModel as the canvas -- parity by construction, never a second store.
//
// It DERIVES at check time from the tree: the model-query call sites across
// the modes browser sources (exactly the widget reads; the tree module
// carries none), the widget's ownership of the tree render functions, and
// the toggle-flip code shape (visibility only -- no reload, no selection
// touch). Each is compared as SET EQUALITY against the one EXPECTED block:
// a second fetch site outside the model is unreviewed divergence surface, a
// missing widget read is a dropped render root, a flip that touches
// selection breaks the contract -- each reported BY NAME. An empty
// derivation fails as a broken instrument, never passes as clean.
//
// The live halves (membership equality plus flip-keeps-selection through a
// headed shell) are recorded below as flat BACKSTOPS: at verify time no
// explicit evidence is attached, so they report HELD-OUT for the full
// suite -- reserved live, never a silent pass.
//
// Honestly --quick: reads text sources only. No build, no browser, no
// display, no network.
//
// Usage:
//   node scripts/verify-gui08-view-parity.mjs
//   node scripts/verify-gui08-view-parity.mjs --self-test

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const NAME = 'verify-gui08-view-parity';
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..');

const MODES_BROWSER_REL = 'theia/extensions/modes/src/browser';
const WIDGET_REL = `${MODES_BROWSER_REL}/organising-widget.ts`;
const TREE_REL = `${MODES_BROWSER_REL}/organising-tree.ts`;
const MODEL_REL = `${MODES_BROWSER_REL}/group-model.ts`;

/**
 * The declared single-model contract. The ONE hand-kept block in this file:
 * editing it is how a deliberate contract change is made -- it shows up in
 * the diff for review. Everything it is compared against is derived at
 * check time from the sources named above.
 */
const EXPECTED_MODEL_READERS = Object.freeze([WIDGET_REL]);
const EXPECTED_TREE_OWNER_IMPORT = "from './organising-tree'";
const EXPECTED_TREE_ENTRY = 'buildTreeSection';

/**
 * Held-out live halves (15-UI-SPEC.md parity backstop). Flat scalars: no
 * evidence attached, so the gate reports them HELD-OUT -- never a silent
 * pass.
 */
const BACKSTOPS = Object.freeze([
    { statement: 'tree renders identical group order and membership as the canvas after every mutation', verification: 'backstop' },
    { statement: 'flipping canvas and tree never reloads, never loses selection, and is never destructive', verification: 'backstop' },
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

/** Every modes-browser file calling the shared model reader. */
function derivedModelReaders(browsedFiles) {
    const readers = [];
    for (const [rel, src] of browsedFiles) {
        if (rel === MODEL_REL) {
            continue;
        }
        if (/\.listGroups\(/.test(src)) {
            readers.push(rel);
        }
    }
    return readers;
}

/** A method body from the widget source, spanning its brace block. */
function derivedMethodBody(widgetSrc, name) {
    const at = widgetSrc.indexOf(`${name}(`);
    if (at < 0) {
        return '';
    }
    const open = widgetSrc.indexOf('{', at);
    if (open < 0) {
        return '';
    }
    let depth = 0;
    for (let i = open; i < widgetSrc.length; i += 1) {
        if (widgetSrc[i] === '{') {
            depth += 1;
        } else if (widgetSrc[i] === '}') {
            depth -= 1;
            if (depth === 0) {
                return widgetSrc.slice(at, i + 1);
            }
        }
    }
    return '';
}

/** @returns {string[]} failure messages -- empty means the gate holds. */
function checkStatic(sources) {
    const failures = [];
    const widgetSrc = sources[WIDGET_REL] ?? '';
    const treeSrc = sources[TREE_REL] ?? '';
    if (!widgetSrc) {
        failures.push(`${WIDGET_REL}: unreadable -- the widget anchor drifted`);
        return failures;
    }
    if (!treeSrc) {
        failures.push(`${TREE_REL}: unreadable -- the tree anchor drifted`);
        return failures;
    }

    // 1. Single-model readers as set equality: exactly the widget reads the
    // model outside the model itself. A second file with a listGroups call
    // site is a second store opinion, not a render root.
    const browsed = Object.entries(sources).filter(([rel]) => rel !== MODEL_REL && rel !== WIDGET_REL && rel !== TREE_REL);
    const readers = derivedModelReaders([[WIDGET_REL, widgetSrc], [TREE_REL, treeSrc], ...browsed]);
    if (!readers.length && !widgetSrc.includes('listGroups')) {
        failures.push(`${WIDGET_REL}: derived ZERO model reads -- the single-reader anchor drifted`);
    } else {
        const readerDiff = diff(readers, [...EXPECTED_MODEL_READERS]);
        if (readerDiff.surplus.length) {
            failures.push(`model readers NOT in the declared single-reader contract (second fetch site): ${readerDiff.surplus.join(', ')}`);
        }
        if (readerDiff.missing.length) {
            failures.push(`declared model readers are GONE (a render root lost its data): ${readerDiff.missing.join(', ')}`);
        }
    }

    // 2. Negated search: the tree module carries no query of its own -- no
    // reader call, no fetch channel, no store handle.
    for (const needle of ['listGroups', 'fetchGroups', 'getGroupTabs', 'GroupQueryService', 'GroupActorClient', 'createProxy', 'WebSocketConnectionProvider', 'new Database']) {
        if (treeSrc.includes(needle)) {
            failures.push(`${TREE_REL}: carries '${needle}' -- the tree holds a fetch of its own instead of rendering widget-supplied data`);
        }
    }

    // 3. Ownership: the widget imports and calls the tree render functions;
    // a render root the widget never calls is dead surface.
    if (!widgetSrc.includes(EXPECTED_TREE_OWNER_IMPORT)) {
        failures.push(`${WIDGET_REL}: no '${EXPECTED_TREE_OWNER_IMPORT}' import -- the widget does not own the tree render functions`);
    }
    if (!widgetSrc.includes(EXPECTED_TREE_ENTRY)) {
        failures.push(`${WIDGET_REL}: never calls '${EXPECTED_TREE_ENTRY}' -- the tree module is unowned dead surface`);
    }
    if (!widgetSrc.includes('this.model.getTabs(')) {
        failures.push(`${WIDGET_REL}: no model membership read for the tree -- sections render without the shared membership`);
    }

    // 4. Flip shape: both flip methods set visibility and re-render only.
    // Any load, draft, zoom, or activity touch inside the flip loses
    // selection across views.
    for (const method of ['showCanvasView', 'showTreeView']) {
        const body = derivedMethodBody(widgetSrc, method);
        if (!body) {
            failures.push(`${WIDGET_REL}: '${method}' underivable -- the flip anchor drifted`);
            continue;
        }
        if (!body.includes('this.view =')) {
            failures.push(`${WIDGET_REL}: '${method}' never sets the view -- the toggle flips nothing`);
        }
        if (!body.includes('this.render()')) {
            failures.push(`${WIDGET_REL}: '${method}' never re-renders -- the flip paints stale content`);
        }
        for (const needle of ['load(', 'editingGroupId', 'zoomIndex', 'setActiveGroup', 'createGroup', 'closeGroup']) {
            if (body.includes(needle)) {
                failures.push(`${WIDGET_REL}: '${method}' touches '${needle}' -- the flip mutates selection instead of flipping visibility only`);
            }
        }
    }
    return failures;
}

function readSources() {
    const read = rel => readFileSync(join(REPO_ROOT, rel), 'utf8');
    const sources = {
        [WIDGET_REL]: read(WIDGET_REL),
        [TREE_REL]: read(TREE_REL),
        [MODEL_REL]: read(MODEL_REL),
    };
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
    console.log(`${NAME}: PASS -- one model, widget-owned tree renders, visibility-only flip`);
    for (const backstop of BACKSTOPS) {
        console.log(`${NAME}: HELD-OUT (reserved live) -- ${backstop.statement} [verification: ${backstop.verification}]`);
    }
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

    // Plant 1: a second fetch site in the tree module must go red naming it.
    {
        const mutated = { ...real, [TREE_REL]: `${real[TREE_REL]}\nconst extra = model.listGroups();\n` };
        const landed = mutated[TREE_REL].includes('model.listGroups()');
        const result = checkStatic(mutated);
        if (!landed) {
            console.error(`${NAME} --self-test: FAIL -- 'second fetch site' plant did not land`);
            failed += 1;
        } else if (!result.some(f => /second fetch site|listGroups/.test(f))) {
            console.error(`${NAME} --self-test: FAIL -- 'second fetch site' did not go red naming the fetch; got: ${result.join(' | ') || '(no failures at all)'}`);
            failed += 1;
        } else {
            console.log(`  ok  second fetch site -> red, naming the fetch`);
        }
    }

    // Plant 2: a flip that clears the New Group draft must go red naming it.
    {
        const mutated = { ...real, [WIDGET_REL]: real[WIDGET_REL].replace('showTreeView(): void {\n        this.view = ', 'showTreeView(): void {\n        this.editingGroupId = undefined;\n        this.view = ') };
        const landed = mutated[WIDGET_REL].includes('showTreeView(): void {\n        this.editingGroupId = undefined;');
        const result = checkStatic(mutated);
        if (!landed) {
            console.error(`${NAME} --self-test: FAIL -- 'flip clears draft' plant did not land`);
            failed += 1;
        } else if (!result.some(f => /editingGroupId/.test(f))) {
            console.error(`${NAME} --self-test: FAIL -- 'flip clears draft' did not go red naming 'editingGroupId'; got: ${result.join(' | ') || '(no failures at all)'}`);
            failed += 1;
        } else {
            console.log(`  ok  flip clears draft -> red, naming 'editingGroupId'`);
        }
    }

    // Plant 3: removing the widget's ownership import must go red naming it.
    {
        const mutated = { ...real, [WIDGET_REL]: real[WIDGET_REL].replace("from './organising-tree'", "from './organising-plant'") };
        const landed = mutated[WIDGET_REL].includes("from './organising-plant'");
        const result = checkStatic(mutated);
        if (!landed) {
            console.error(`${NAME} --self-test: FAIL -- 'ownership removal' plant did not land`);
            failed += 1;
        } else if (!result.some(f => /organising-tree/.test(f))) {
            console.error(`${NAME} --self-test: FAIL -- 'ownership removal' did not go red naming 'organising-tree'; got: ${result.join(' | ') || '(no failures at all)'}`);
            failed += 1;
        } else {
            console.log(`  ok  ownership removal -> red, naming 'organising-tree'`);
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
