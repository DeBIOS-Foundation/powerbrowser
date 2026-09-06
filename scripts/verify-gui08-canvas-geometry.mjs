#!/usr/bin/env node
// scripts/verify-gui08-canvas-geometry.mjs
//
// GUI-08's canvas-geometry gate (15-02): the full Panorama interaction
// contract over the 15-01 write path -- free header-drag, corner resize,
// auto-box drops, zoom, tray, renames, confirmed Close Group, PNG cards with
// the guaranteed text-first fallback.
//
// It DERIVES at check time from the tree: canvas hooks (data-canvas/data-g/
// data-u), zoom range consts, min-size consts, tray height, card geometry,
// the thumbnail-fallback shape, and the panorama command registry from the
// sources named below. Each is compared as SET EQUALITY (or exact value)
// against the one EXPECTED block: a surplus id is unreviewed surface, a
// missing one is a dropped contract row, a reworded label breaks the
// contracted copy -- each reported BY NAME. An empty derivation fails as a
// broken instrument, never passes as clean.
//
// The live halves (drag feel, auto-box matrix through a headed shell, the
// close exactness matrix) are recorded below as flat BACKSTOPS: at verify
// time no explicit evidence is attached, so they report HELD-OUT for the
// full suite -- reserved live, never a silent pass.
//
// Honestly --quick: reads text sources only. No build, no browser, no
// display, no network.
//
// Usage:
//   node scripts/verify-gui08-canvas-geometry.mjs
//   node scripts/verify-gui08-canvas-geometry.mjs --self-test

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const NAME = 'verify-gui08-canvas-geometry';
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..');

const WIDGET_REL = 'theia/extensions/modes/src/browser/organising-widget.ts';
const CSS_REL = 'theia/extensions/modes/src/browser/modes.css';
const COMMANDS_REL = 'theia/extensions/modes/src/browser/panorama-commands.ts';
const MODEL_REL = 'theia/extensions/modes/src/browser/group-model.ts';
const API_REL = 'powerbrowser/shell/PowerBrowserAPI.sys.mjs';
const CATALOGUE_REL = 'powerbrowser/INTERNAL-APIS.md';

/**
 * The declared canvas contract. The ONE hand-kept block in this file:
 * editing it is how a deliberate contract change is made -- it shows up in
 * the diff for review. Everything it is compared against is derived at
 * check time from the sources named above.
 */
const EXPECTED_COMMAND_IDS = Object.freeze([
    'powerbrowser.panorama.new-group',
    'powerbrowser.panorama.close-group',
    'powerbrowser.panorama.show-canvas',
    'powerbrowser.panorama.show-tree',
    'powerbrowser.panorama.retry-save',
]);
const EXPECTED_LABELLED_COMMAND = "label: 'New Group'";
const EXPECTED_CLOSE_DIALOG_TITLE = "title: 'Close Group'";
const EXPECTED_CLOSE_DIALOG_OK = "ok: 'Close Group'";
const EXPECTED_CLOSE_TOOLTIP = "= 'Close group'";
const EXPECTED_ZOOM_MIN = 25;
const EXPECTED_ZOOM_MAX = 200;
const EXPECTED_ZOOM_RESET = 100;
const EXPECTED_BOX_MIN_W = 200;
const EXPECTED_BOX_MIN_H = 144;
const EXPECTED_TRAY_HEIGHT = 144;
const EXPECTED_CARD_WIDTH = 160;
const EXPECTED_THUMB_HEIGHT = 90;
const EXPECTED_CAPTURE_TARGET_WIDTH = 160;
const EXPECTED_CAPTURE_CAP = 102400;

/**
 * Held-out live halves (15-UI-SPEC.md backstops). Flat scalars: no evidence
 * attached, so the gate reports them HELD-OUT -- never a silent pass.
 */
const BACKSTOPS = Object.freeze([
    { statement: 'dropping a card onto another card auto-draws a box containing both', verification: 'backstop' },
    { statement: 'dropping a card onto empty field auto-draws a box around it', verification: 'backstop' },
    { statement: 'dropping into a box joins; dropping into the tray ungroups', verification: 'backstop' },
    { statement: 'tree renders identical order and membership after every mutation and flip', verification: 'backstop' },
    { statement: 'confirming Close Group closes exactly that group tabs; cancel changes nothing', verification: 'backstop' },
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

/** CSS with block comments stripped (so prose never counts as code). */
function stripCssComments(css) {
    return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Every panorama command id declared in the commands source. */
function derivedCommandIds(commandsSrc) {
    const ids = [];
    for (const m of commandsSrc.matchAll(/export const (PANORAMA_[A-Z_]+_COMMAND_ID)\s*=\s*'([^']+)'/g)) {
        if (!ids.includes(m[2])) {
            ids.push(m[2]);
        }
    }
    return ids;
}

/** The ZOOM_STEPS literal from the widget source. */
function derivedZoomSteps(widgetSrc) {
    const m = /const ZOOM_STEPS\s*=\s*\[([^\]]+)\]/.exec(widgetSrc);
    if (!m) {
        return [];
    }
    return m[1].split(',').map(s => Number(s.trim())).filter(n => Number.isFinite(n));
}

function derivedZoomReset(widgetSrc, steps) {
    const m = /const DEFAULT_ZOOM_INDEX\s*=\s*(\d+)/.exec(widgetSrc);
    if (!m || !steps.length) {
        return undefined;
    }
    return steps[Number(m[1])];
}

function derivedModelMin(modelSrc, name) {
    const m = new RegExp(`const ${name}\\s*=\\s*(\\d+)`).exec(modelSrc);
    return m ? Number(m[1]) : undefined;
}

/** The buildCard function body (for the text-first ordering check). */
function derivedBuildCard(widgetSrc) {
    const start = widgetSrc.indexOf('protected buildCard(');
    if (start < 0) {
        return '';
    }
    const end = widgetSrc.indexOf('\n    protected ', start + 1);
    return widgetSrc.slice(start, end < 0 ? undefined : end);
}

/** Span of the `if (tab.thumbnail) { ... }` block inside buildCard. */
function thumbnailIfSpan(cardBody) {
    const at = cardBody.indexOf('if (tab.thumbnail)');
    if (at < 0) {
        return null;
    }
    const open = cardBody.indexOf('{', at);
    if (open < 0) {
        return null;
    }
    let depth = 0;
    for (let i = open; i < cardBody.length; i += 1) {
        if (cardBody[i] === '{') {
            depth += 1;
        } else if (cardBody[i] === '}') {
            depth -= 1;
            if (depth === 0) {
                return { start: at, end: i + 1 };
            }
        }
    }
    return null;
}

/** @returns {string[]} failure messages -- empty means the gate holds. */
function checkStatic(sources) {
    const failures = [];
    const widgetSrc = sources[WIDGET_REL] ?? '';
    const cssSrc = stripCssComments(sources[CSS_REL] ?? '');
    const commandsSrc = sources[COMMANDS_REL] ?? '';
    const modelSrc = sources[MODEL_REL] ?? '';
    const apiSrc = sources[API_REL] ?? '';
    const catalogueSrc = sources[CATALOGUE_REL] ?? '';

    // 1. Canvas hooks derived from the widget source.
    for (const hook of ['dataset.canvas', 'dataset.tray', 'dataset.g', 'dataset.u']) {
        if (!widgetSrc.includes(hook)) {
            failures.push(`${WIDGET_REL}: canvas hook '${hook}' underivable -- the data-canvas/data-g/data-u anchor drifted`);
        }
    }
    if (!widgetSrc.includes('pb-org-box-resize')) {
        failures.push(`${WIDGET_REL}: the corner-resize handle hook 'pb-org-box-resize' is gone -- resize has no affordance`);
    }

    // 2. Zoom range consts: 25-200 fixed steps with a 100 reset.
    const steps = derivedZoomSteps(widgetSrc);
    if (!steps.length) {
        failures.push(`${WIDGET_REL}: ZOOM_STEPS underivable -- the zoom anchor drifted`);
    } else {
        if (Math.min(...steps) !== EXPECTED_ZOOM_MIN || Math.max(...steps) !== EXPECTED_ZOOM_MAX) {
            failures.push(`${WIDGET_REL}: zoom range is ${Math.min(...steps)}-${Math.max(...steps)}, declared ${EXPECTED_ZOOM_MIN}-${EXPECTED_ZOOM_MAX} -- zoom drifted off contract`);
        }
        if (!steps.includes(EXPECTED_ZOOM_RESET)) {
            failures.push(`${WIDGET_REL}: zoom steps ${steps.join(',')} carry no ${EXPECTED_ZOOM_RESET} -- the reset level is gone`);
        }
        const reset = derivedZoomReset(widgetSrc, steps);
        if (reset === undefined) {
            failures.push(`${WIDGET_REL}: DEFAULT_ZOOM_INDEX underivable -- the reset anchor drifted`);
        } else if (reset !== EXPECTED_ZOOM_RESET) {
            failures.push(`${WIDGET_REL}: zoom reset resolves to ${reset}, declared ${EXPECTED_ZOOM_RESET}`);
        }
    }

    // 3. Box minimums: model consts plus the CSS floor plus the live clamp.
    const minW = derivedModelMin(modelSrc, 'GROUP_BOX_MIN_W');
    const minH = derivedModelMin(modelSrc, 'GROUP_BOX_MIN_H');
    if (minW === undefined || minH === undefined) {
        failures.push(`${MODEL_REL}: GROUP_BOX_MIN_W/H underivable -- the min-size anchor drifted`);
    } else {
        if (minW !== EXPECTED_BOX_MIN_W || minH !== EXPECTED_BOX_MIN_H) {
            failures.push(`${MODEL_REL}: box minimum is ${minW}x${minH}, declared ${EXPECTED_BOX_MIN_W}x${EXPECTED_BOX_MIN_H}`);
        }
    }
    if (!cssSrc.includes(`min-width: ${EXPECTED_BOX_MIN_W}px`) || !cssSrc.includes(`min-height: ${EXPECTED_BOX_MIN_H}px`)) {
        failures.push(`${CSS_REL}: the ${EXPECTED_BOX_MIN_W}x${EXPECTED_BOX_MIN_H} box floor is gone from the stylesheet`);
    }
    if (!widgetSrc.includes('GROUP_BOX_MIN_W') || !widgetSrc.includes('GROUP_BOX_MIN_H')) {
        failures.push(`${WIDGET_REL}: the resize path no longer clamps at GROUP_BOX_MIN_W/H -- the live floor drifted`);
    }

    // 4. Tray height plus card geometry on the locked tokens.
    if (!cssSrc.includes('.pb-org-tray {') || !cssSrc.includes(`height: ${EXPECTED_TRAY_HEIGHT}px`)) {
        failures.push(`${CSS_REL}: the ${EXPECTED_TRAY_HEIGHT}px tray height is gone -- the tray contract drifted`);
    }
    if (!cssSrc.includes(`width: ${EXPECTED_CARD_WIDTH}px`)) {
        failures.push(`${CSS_REL}: the ${EXPECTED_CARD_WIDTH}px card width is gone -- the card contract drifted`);
    }
    if (!cssSrc.includes(`height: ${EXPECTED_THUMB_HEIGHT}px`)) {
        failures.push(`${CSS_REL}: the ${EXPECTED_CARD_WIDTH}x${EXPECTED_THUMB_HEIGHT} thumbnail box is gone`);
    }

    // 5. Thumbnail fallback: img-behind-guard, no spinner, text first.
    if (!widgetSrc.includes("createElement('img')")) {
        failures.push(`${WIDGET_REL}: no card img element -- the snapshot surface is gone, not text-fallback`);
    }
    if (!widgetSrc.includes("addEventListener('error'")) {
        failures.push(`${WIDGET_REL}: the img broken-image guard (error listener) is gone -- failed snapshots render glyphs`);
    }
    for (const [rel, src] of [[WIDGET_REL, widgetSrc], [CSS_REL, cssSrc]]) {
        if (/spinner/i.test(src)) {
            failures.push(`${rel}: a spinner pattern is present -- cards must never spin, text paints first`);
        }
    }
    const cardBody = derivedBuildCard(widgetSrc);
    if (!cardBody) {
        failures.push(`${WIDGET_REL}: buildCard underivable -- the card anchor drifted`);
    } else {
        const span = thumbnailIfSpan(cardBody);
        if (!span) {
            failures.push(`${WIDGET_REL}: the 'if (tab.thumbnail)' gate is gone -- snapshots no longer fill in behind text`);
        } else {
            const gated = cardBody.slice(span.start, span.end);
            if (gated.includes('pb-org-card-title') || gated.includes('pb-org-card-uri')) {
                failures.push(`${WIDGET_REL}: title/URI text moved INSIDE the thumbnail gate -- cards without bytes render blank`);
            }
            if (!cardBody.includes('pb-org-card-title') || !cardBody.includes('pb-org-card-uri')) {
                failures.push(`${WIDGET_REL}: the title-plus-URI text block is gone -- the guaranteed fallback surface broke`);
            }
        }
    }

    // 6. Command registry: ids as set equality, one labelled command, rest labelless.
    const ids = derivedCommandIds(commandsSrc);
    if (!ids.length) {
        failures.push(`${COMMANDS_REL}: derived ZERO command ids -- the registry anchor drifted`);
    } else {
        const idDiff = diff(ids, [...EXPECTED_COMMAND_IDS]);
        if (idDiff.surplus.length) {
            failures.push(`${COMMANDS_REL}: command ids NOT in the declared registry (unreviewed surface): ${idDiff.surplus.join(', ')}`);
        }
        if (idDiff.missing.length) {
            failures.push(`${COMMANDS_REL}: declared command ids are GONE: ${idDiff.missing.join(', ')}`);
        }
    }
    const labelCount = (commandsSrc.match(/label:/g) || []).length;
    if (labelCount !== 1 || !commandsSrc.includes(EXPECTED_LABELLED_COMMAND)) {
        failures.push(`${COMMANDS_REL}: exactly one labelled command ('New Group') is declared -- found ${labelCount} label sites; toggles and close stay labelless`);
    }
    if (!widgetSrc.includes(EXPECTED_CLOSE_DIALOG_TITLE) || !widgetSrc.includes(EXPECTED_CLOSE_DIALOG_OK)) {
        failures.push(`${WIDGET_REL}: the contracted Close Group dialog copy drifted -- title/ok must read 'Close Group' verbatim`);
    }
    if ((widgetSrc.match(/= 'Close group'/g) || []).length < 2) {
        failures.push(`${WIDGET_REL}: the contracted 'Close group' tooltip is gone from a close button -- canvas and tree each carry it`);
    }

    // 7. Call-site const discipline: import consts, never re-spell them.
    if (!widgetSrc.includes("from './panorama-commands'")) {
        failures.push(`${WIDGET_REL}: no panorama-commands import -- call sites must import command consts`);
    }
    if (!/dataset\.command = PANORAMA_[A-Z_]+/.test(widgetSrc)) {
        failures.push(`${WIDGET_REL}: no dataset.command const wiring -- the const-import discipline has no call site`);
    }
    if (widgetSrc.includes("'powerbrowser.panorama.")) {
        failures.push(`${WIDGET_REL}: a re-spelled 'powerbrowser.panorama.*' literal -- call sites import the const, never the string`);
    }

    // 8. Type and ink discipline on the locked tokens.
    const sizes = new Set();
    for (const m of cssSrc.matchAll(/font-size:\s*(\d+)px/g)) {
        sizes.add(Number(m[1]));
    }
    if (!sizes.size) {
        failures.push(`${CSS_REL}: derived ZERO font-size literals -- the type anchor drifted`);
    } else {
        const rogue = [...sizes].filter(n => n !== 12 && n !== 13 && n !== 14);
        if (rogue.length) {
            failures.push(`${CSS_REL}: font-size literals outside the 14/13/12 roles: ${rogue.join(', ')}px`);
        }
    }
    let currentSelector = '';
    for (const line of cssSrc.split('\n')) {
        const brace = line.indexOf('{');
        if (brace >= 0) {
            currentSelector = line.slice(0, brace).trim();
        }
        if (/font-weight:\s*600/.test(line) && currentSelector.startsWith('.pb-org-') && !currentSelector.includes('is-active')) {
            failures.push(`${CSS_REL}: 600 weight on '${currentSelector}' -- semibold rides the active-group title and active toggle only`);
        }
    }
    if (cssSrc.includes('!important')) {
        failures.push(`${CSS_REL}: '!important' present -- the user layer wins by cascade position, never by force`);
    }

    // 9. Capture surface: PageThumbs reach-through, 160px target, 100KB cap,
    // private skip, catalogue row.
    for (const [needle, why] of [
        ['PageThumbs', 'the PageThumbs reach-through is gone'],
        ['captureToCanvas', 'the captureToCanvas call is gone'],
        [`targetWidth: ${EXPECTED_CAPTURE_TARGET_WIDTH}`, `the ${EXPECTED_CAPTURE_TARGET_WIDTH}px capture target drifted`],
        [`TAB_THUMBNAIL_CAPTURE_MAX_CHARS = ${EXPECTED_CAPTURE_CAP}`, 'the 100KB capture cap drifted'],
        ['scheduleSettleCapture', 'the settle scheduler is gone -- captures run on the hot path'],
        ['captureTabThumbnail', 'the capture method is gone'],
        ['isWindowPrivate', 'the private-window skip is gone from a capture site'],
    ]) {
        if (!apiSrc.includes(needle)) {
            failures.push(`${API_REL}: ${why} -- '${needle}' underivable`);
        }
    }
    if (!catalogueSrc.includes('PageThumbs')) {
        failures.push(`${CATALOGUE_REL}: the PageThumbs catalogue row is gone -- the touchpoint is uncatalogued`);
    }
    return failures;
}

function readSources() {
    const read = rel => readFileSync(join(REPO_ROOT, rel), 'utf8');
    return {
        [WIDGET_REL]: read(WIDGET_REL),
        [CSS_REL]: read(CSS_REL),
        [COMMANDS_REL]: read(COMMANDS_REL),
        [MODEL_REL]: read(MODEL_REL),
        [API_REL]: read(API_REL),
        [CATALOGUE_REL]: read(CATALOGUE_REL),
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
    console.log(`${NAME}: PASS -- hooks, zoom, minimums, tray, cards, fallback, registry, discipline, and capture surface hold`);
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

    // Plant 1: a removed canvas hook must go red naming the drift.
    {
        const mutated = { ...real, [WIDGET_REL]: real[WIDGET_REL].replace("dataset.canvas = 'true'", "dataset.field = 'true'") };
        const landed = !mutated[WIDGET_REL].includes('dataset.canvas');
        const result = checkStatic(mutated);
        if (!landed) {
            console.error(`${NAME} --self-test: FAIL -- 'removed hook' plant did not land`);
            failed += 1;
        } else if (!result.some(f => /dataset\.canvas/.test(f))) {
            console.error(`${NAME} --self-test: FAIL -- 'removed hook' did not go red naming 'dataset.canvas'; got: ${result.join(' | ') || '(no failures at all)'}`);
            failed += 1;
        } else {
            console.log(`  ok  removed hook -> red, naming 'dataset.canvas'`);
        }
    }

    // Plant 2: zoom-range drift must go red naming the drift.
    {
        const mutated = { ...real, [WIDGET_REL]: real[WIDGET_REL].replace('const ZOOM_STEPS = [25, 50, 75, 100, 125, 150, 200]', 'const ZOOM_STEPS = [25, 50, 75, 100, 125, 150, 250]') };
        const landed = mutated[WIDGET_REL].includes('150, 250]');
        const result = checkStatic(mutated);
        if (!landed) {
            console.error(`${NAME} --self-test: FAIL -- 'zoom-range drift' plant did not land`);
            failed += 1;
        } else if (!result.some(f => /zoom range/.test(f))) {
            console.error(`${NAME} --self-test: FAIL -- 'zoom-range drift' did not go red naming the zoom range; got: ${result.join(' | ') || '(no failures at all)'}`);
            failed += 1;
        } else {
            console.log(`  ok  zoom-range drift -> red, naming the zoom range`);
        }
    }

    // Plant 3: label drift must go red naming the drift.
    {
        const mutated = { ...real, [COMMANDS_REL]: real[COMMANDS_REL].replace("label: 'New Group'", "label: 'New group'") };
        const landed = mutated[COMMANDS_REL].includes("label: 'New group'");
        const result = checkStatic(mutated);
        if (!landed) {
            console.error(`${NAME} --self-test: FAIL -- 'label drift' plant did not land`);
            failed += 1;
        } else if (!result.some(f => /New Group/.test(f))) {
            console.error(`${NAME} --self-test: FAIL -- 'label drift' did not go red naming 'New Group'; got: ${result.join(' | ') || '(no failures at all)'}`);
            failed += 1;
        } else {
            console.log(`  ok  label drift -> red, naming 'New Group'`);
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
