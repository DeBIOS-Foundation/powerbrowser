#!/usr/bin/env node
// scripts/verify-gui08-canvas-geometry.mjs
//
// GUI-08's canvas-geometry gate: the static half of the Panorama canvas
// contract -- groups as boxes, loose cards on the canvas, zoom, the keyboard
// scope, and PNG cards with the guaranteed text-first fallback.
//
// Geometry and type come from 15-UI-SPEC at check time, through
// scripts/lib/ui-spec.mjs: every Canvas Geometry row is compared with the
// tree (geometryDiff), and the stylesheet's font sizes and weights with the
// Typography table. Nothing numeric is hand-kept here. The command registry
// and the Close Group dialog literals have no 15-UI-SPEC home, so they are
// this script's declared contract (the EXPECTED block below), compared as set
// equality or exact text and reported BY NAME. PAN-07 is a negated search of
// the code under test: a surviving tray selector or hook is red. An empty
// derivation fails as a broken instrument, never passes as clean.
//
// The live halves are recorded below as flat BACKSTOPS and report HELD-OUT:
// reserved live, never a silent pass. gui08-loose-cards-live (21-05) is the
// live proof for loose cards.
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
import { geometryDiff, geometryRows, stripCssComments, typography } from './lib/ui-spec.mjs';

const NAME = 'verify-gui08-canvas-geometry';
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..');

const SPEC_REL = '.planning/milestones/v1.3-phases/15-panorama-organising/15-UI-SPEC.md';
const WIDGET_REL = 'theia/extensions/modes/src/browser/organising-widget.ts';
const TILING_REL = 'theia/extensions/modes/src/browser/organising-tiling.ts';
const GEOMETRY_REL = 'theia/extensions/modes/src/browser/organising-geometry.ts';
const TREE_REL = 'theia/extensions/modes/src/browser/organising-tree.ts';
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

/**
 * Held-out live halves (15-UI-SPEC.md backstops). Flat scalars: no evidence
 * attached, so the gate reports them HELD-OUT -- never a silent pass.
 */
const BACKSTOPS = Object.freeze([
    { statement: 'drawing a band of at least 30px on empty canvas creates a group there and takes the enclosed loose cards', verification: 'backstop' },
    { statement: 'a drop over a group joins it at the previewed slot; a drop on empty canvas places the card loose', verification: 'backstop' },
    { statement: 'every loose and expanded-stack card is reachable by Tab plus arrows, and Enter opens it', verification: 'backstop' },
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

/** The buildCard function body (for the text-first ordering check). */
function derivedBuildCard(widgetSrc) {
    const start = widgetSrc.indexOf('protected buildCard(');
    if (start < 0) {
        return '';
    }
    const end = widgetSrc.indexOf('\n    protected ', start + 1);
    return widgetSrc.slice(start, end < 0 ? undefined : end);
}

/** Span from `head` to the brace that closes the first `{` after it, or null. */
function braceSpan(src, head) {
    const at = src.indexOf(head);
    if (at < 0) {
        return null;
    }
    const open = src.indexOf('{', at + head.length);
    if (open < 0) {
        return null;
    }
    let depth = 0;
    for (let i = open; i < src.length; i += 1) {
        if (src[i] === '{') {
            depth += 1;
        } else if (src[i] === '}') {
            depth -= 1;
            if (depth === 0) {
                return { start: at, end: i + 1 };
            }
        }
    }
    return null;
}

/** Text of `head`'s brace-matched block, or '' when it is not found. */
function braceBlock(src, head) {
    const span = braceSpan(src, head);
    return span ? src.slice(span.start, span.end) : '';
}

/** Every selector in the stylesheet (comments already stripped). */
function cssSelectors(css) {
    return [...css.matchAll(/([^{};]+)\{/g)].flatMap(m => m[1].split(',').map(s => s.trim().replace(/\s+/g, ' ')));
}

/** @returns {string[]} failure messages -- empty means the gate holds. */
function checkStatic(sources) {
    const failures = [];
    const widgetSrc = sources[WIDGET_REL] ?? '';
    const treeSrc = sources[TREE_REL] ?? '';
    const cssSrc = stripCssComments(sources[CSS_REL] ?? '');
    const commandsSrc = sources[COMMANDS_REL] ?? '';
    const apiSrc = sources[API_REL] ?? '';
    const catalogueSrc = sources[CATALOGUE_REL] ?? '';
    const spec = sources[SPEC_REL] ?? '';

    // 1. Canvas hooks derived from the widget source.
    for (const hook of ['dataset.canvas', 'dataset.g', 'dataset.u']) {
        if (!widgetSrc.includes(hook)) {
            failures.push(`${WIDGET_REL}: canvas hook '${hook}' underivable -- the data-canvas/data-g/data-u anchor drifted`);
        }
    }
    if (!widgetSrc.includes('pb-org-box-resize')) {
        failures.push(`${WIDGET_REL}: the corner-resize handle hook 'pb-org-box-resize' is gone -- resize has no affordance`);
    }

    // 2. Every geometry value (zoom, box floor, tiles, loose cards, capture
    // target and cap, CSS sizes) from the 15-UI-SPEC Canvas Geometry table.
    // Code sources only: the spec and the catalogue never count as the tree.
    const codeSources = Object.fromEntries(Object.entries(sources).filter(([rel]) => /\.(ts|mjs|css)$/.test(rel)));
    for (const f of geometryDiff(spec, codeSources, { canvasRels: [WIDGET_REL, TILING_REL, GEOMETRY_REL], cssRel: CSS_REL })) {
        failures.push(`${SPEC_REL} Canvas Geometry vs tree: ${f}`);
    }

    // 3. The live clamp: the resize path uses the model's box floor.
    if (!widgetSrc.includes('GROUP_BOX_MIN_W') || !widgetSrc.includes('GROUP_BOX_MIN_H')) {
        failures.push(`${WIDGET_REL}: the resize path no longer clamps at GROUP_BOX_MIN_W/H -- the live floor drifted`);
    }

    // 4. PAN-07: the tray is gone. A search of the code under test.
    for (const selector of cssSelectors(cssSrc)) {
        if (selector.includes('.pb-org-tray')) {
            failures.push(`${CSS_REL}: tray selector '${selector}' survives -- ungrouped tabs are loose cards on the canvas (PAN-07)`);
        }
    }
    for (const needle of ['pb-org-tray', 'dataset.tray']) {
        if (widgetSrc.includes(needle)) {
            failures.push(`${WIDGET_REL}: tray reference '${needle}' survives -- ungrouped tabs are loose cards on the canvas (PAN-07)`);
        }
    }

    // 4a. 21-UI-SPEC A5: every card scope is in the roving focus.
    const focusBody = braceBlock(widgetSrc, 'protected moveCardFocus(');
    if (!focusBody) {
        failures.push(`${WIDGET_REL}: moveCardFocus underivable -- the keyboard-focus anchor drifted`);
    } else {
        const missing = ['.pb-org-box-cards', '.pb-org-expand-cards', 'is-loose'].filter(s => !focusBody.includes(s));
        if (missing.length) {
            failures.push(`${WIDGET_REL}: moveCardFocus does not scope ${missing.join(', ')} -- those cards cannot be reached by keyboard (21-UI-SPEC A5)`);
        }
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
        const span = braceSpan(cardBody, 'if (tab.thumbnail)');
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
    if ((widgetSrc.match(/= 'Close group'/g) || []).length < 1
        || (treeSrc.match(/= 'Close group'/g) || []).length < 1) {
        failures.push(`the contracted 'Close group' tooltip is gone from a close button -- canvas (${WIDGET_REL}) and tree (${TREE_REL}) each carry it`);
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

    // 8. Type and ink: sizes and weights from the 15-UI-SPEC Typography table.
    const type = typography(spec);
    if (!type.sizes.length || !type.weights.length) {
        failures.push(`derived ZERO type roles from the Typography table in ${SPEC_REL} -- broken instrument`);
    } else {
        // Sizes and weights read the same rule set: rules whose selector names
        // a .pb-org-* class, comments stripped so a leading one cannot hide a
        // rule. The .pb-modes-* rules belong to 14-UI-SPEC, not this table.
        const orgRules = [...cssSrc.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(?<=^|[{};])\s*([^{};@]+?)\s*\{([^{}]*)\}/g)]
            .map(m => ({ selector: m[1].replace(/\s+/g, ' '), body: m[2] }))
            .filter(r => r.selector.includes('.pb-org-'));
        const sizes = new Set(orgRules.flatMap(r => [...r.body.matchAll(/font-size:\s*(\d+)px/g)].map(m => Number(m[1]))));
        const sizeDiff = diff([...sizes], type.sizes);
        if (sizeDiff.surplus.length) {
            failures.push(`${CSS_REL}: font-size ${sizeDiff.surplus.join(', ')}px under .pb-org-* is not a ${SPEC_REL} Typography size (${type.sizes.join('/')})`);
        }
        if (sizeDiff.missing.length) {
            failures.push(`${CSS_REL}: Typography size ${sizeDiff.missing.join(', ')}px from ${SPEC_REL} is declared under no .pb-org-* rule`);
        }
        for (const { selector, body } of orgRules) {
            for (const w of body.matchAll(/font-weight:\s*(\d+)/g)) {
                const weight = Number(w[1]);
                if (!type.weights.includes(weight)) {
                    failures.push(`${CSS_REL}: font-weight ${weight} on '${selector}' is not a ${SPEC_REL} Typography weight (${type.weights.join('/')})`);
                } else if (weight === 600 && !selector.includes('is-active')) {
                    failures.push(`${CSS_REL}: 600 weight on '${selector}' -- semibold rides the active-group title and active toggle only`);
                }
            }
        }
    }

    // 8a. 21-UI-SPEC A3: with zero groups the canvas still draws loose cards.
    const renderCanvas = braceBlock(widgetSrc, 'protected renderCanvas(');
    const zeroGroups = braceBlock(renderCanvas, 'if (groups.length === 0)');
    if (!zeroGroups) {
        failures.push(`${WIDGET_REL}: the zero-group branch of renderCanvas is underivable -- the empty-canvas anchor drifted`);
    } else if (!zeroGroups.includes('this.renderLoose(')) {
        failures.push(`${WIDGET_REL}: renderCanvas returns on zero groups without renderLoose() -- ungrouped tabs vanish when no group exists (21-UI-SPEC A3)`);
    }
    if (cssSrc.includes('!important')) {
        failures.push(`${CSS_REL}: '!important' present -- the user layer wins by cascade position, never by force`);
    }

    // 9. Capture surface: PageThumbs reach-through, settle scheduler, private
    // skip, catalogue row. The 160px target and the cap are spec rows (2).
    for (const [needle, why] of [
        ['PageThumbs', 'the PageThumbs reach-through is gone'],
        ['captureToCanvas', 'the captureToCanvas call is gone'],
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
        [SPEC_REL]: read(SPEC_REL),
        [WIDGET_REL]: read(WIDGET_REL),
        [TILING_REL]: read(TILING_REL),
        [GEOMETRY_REL]: read(GEOMETRY_REL),
        [TREE_REL]: read(TREE_REL),
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
    const rows = geometryRows(sources[SPEC_REL]);
    const type = typography(sources[SPEC_REL]);
    console.log(`${NAME}: PASS -- ${rows.consts.length} const rows and ${rows.css.length} CSS rows equal 15-UI-SPEC Canvas Geometry; type sizes ${type.sizes.join('/')}px and weights ${type.weights.join('/')} from its Typography table; no tray; loose cards with zero groups; loose and expanded cards in focus scope; fallback, registry, discipline and capture hold`);
    for (const backstop of BACKSTOPS) {
        console.log(`${NAME}: HELD-OUT (reserved live) -- ${backstop.statement} [verification: ${backstop.verification}]`);
    }
}

const once = (from, to) => src => src.replace(from, to);

/** Planted faults on in-memory copies: code, CSS and spec, each red naming its drift. */
const PLANTS = [
    { id: 'removed canvas hook', file: WIDGET_REL, apply: once("dataset.canvas = 'true'", "dataset.field = 'true'"), landed: s => !s.includes('dataset.canvas'), expect: /dataset\.canvas/ },
    { id: 'zoom step drift', file: WIDGET_REL, apply: once('const ZOOM_STEPS = [25, 50, 75, 100, 125, 150, 200]', 'const ZOOM_STEPS = [25, 50, 75, 100, 125, 150, 250]'), landed: s => s.includes('150, 250]'), expect: /ZOOM_STEPS/ },
    { id: 'label drift', file: COMMANDS_REL, apply: once("label: 'New Group'", "label: 'New group'"), landed: s => s.includes("label: 'New group'"), expect: /New Group/ },
    { id: 'spec value drift', file: SPEC_REL, apply: once('| LOOSE_W × LOOSE_H | 160 ×', '| LOOSE_W × LOOSE_H | 170 ×'), landed: s => s.includes('| LOOSE_W × LOOSE_H | 170 ×'), expect: /LOOSE_W/ },
    { id: 'source value drift', file: TILING_REL, apply: once('export const TILE_GAP = 8;', 'export const TILE_GAP = 10;'), landed: s => s.includes('TILE_GAP = 10;'), expect: /TILE_GAP is 10/ },
    { id: 'spec row deleted', file: SPEC_REL, apply: s => s.replace(/^\| TILE_GAP \|.*\n/m, ''), landed: s => !/^\| TILE_GAP \|/m.test(s), expect: /undeclared canvas constant TILE_GAP/ },
    { id: 'CSS out of its rule', file: CSS_REL, apply: s => s.replace(/(\n\.pb-org-card-thumb \{[^}]*?)\n    height: 124px;/, '$1') + '\n.pb-org-x { height: 124px; }\n', landed: s => s.includes('.pb-org-x { height: 124px; }') && !/\n\.pb-org-card-thumb \{[^}]*height: 124px;/.test(s), expect: /\.pb-org-card-thumb/ },
    { id: 'tray revived', file: CSS_REL, apply: s => `${s}\n.pb-org-tray { height: 144px; }\n`, landed: s => s.includes('.pb-org-tray { height: 144px; }'), expect: /tray selector '\.pb-org-tray'/ },
    { id: 'heading weight 500', file: CSS_REL, apply: once('.pb-org-expand-heading {\n    font-size: 14px;\n    font-weight: 400;', '.pb-org-expand-heading {\n    font-size: 14px;\n    font-weight: 500;'), landed: s => s.includes('.pb-org-expand-heading {\n    font-size: 14px;\n    font-weight: 500;'), expect: /font-weight 500 on '\.pb-org-expand-heading'/ },
    { id: 'zero groups without loose cards', file: WIDGET_REL, apply: s => s.replace(/\n *this\.renderLoose\([^)\n]*\);(\n *return;)/, '$1'), landed: s => (s.match(/this\.renderLoose\(/g) || []).length === 1, expect: /without renderLoose\(\)/ },
    { id: 'focus scope back to the tray', file: WIDGET_REL, apply: once("'.pb-org-box-cards, .pb-org-expand-cards'", "'.pb-org-box-cards, .pb-org-tray-cards'"), landed: s => s.includes("'.pb-org-box-cards, .pb-org-tray-cards'"), expect: /pb-org-tray|moveCardFocus does not scope/ },
    { id: 'every .pb-org-* 13px deleted', file: CSS_REL, apply: s => s.replace(/(\.pb-org-[^{}]*\{[^{}]*?)\n    font-size: 13px;/g, '$1'), landed: s => /\.pb-modes-custom-row \{[^}]*font-size: 13px/.test(s) && !/\.pb-org-[^{}]*\{[^{}]*font-size: 13px/.test(s), expect: /Typography size 13px .* declared under no \.pb-org-\* rule/ },
    { id: 'spec Typography 13px deleted', file: SPEC_REL, apply: s => s.replace(/^\| Label \| 13px \|.*\n/m, ''), landed: s => !/^\| Label \| 13px \|/m.test(s), expect: /font-size 13px/ },
];

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
    for (const plant of PLANTS) {
        const text = plant.apply(real[plant.file]);
        if (text === real[plant.file] || !plant.landed(text)) {
            console.error(`${NAME} --self-test: FAIL -- '${plant.id}' anchor drifted in ${plant.file}: the plant did not land`);
            failed += 1;
            continue;
        }
        const result = checkStatic({ ...real, [plant.file]: text });
        const hit = result.find(f => plant.expect.test(f));
        if (!hit) {
            console.error(`${NAME} --self-test: FAIL -- '${plant.id}' did not go red naming ${plant.expect}; got: ${result.join(' | ') || '(no failures at all)'}`);
            failed += 1;
        } else {
            console.log(`  ok  ${plant.id} -> ${hit}`);
        }
    }
    if (failed) {
        process.exit(1);
    }
    console.log(`${NAME} --self-test: PASS -- ${PLANTS.length} planted faults went red naming the drift`);
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
