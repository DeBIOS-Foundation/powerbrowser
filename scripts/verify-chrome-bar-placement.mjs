#!/usr/bin/env node
/**
 * GUI-06's bar-placement gate (13-05): the chrome bar sits immediately above
 * the tab strip by public shell API, and the contract says so.
 *
 * Two facts are DERIVED at check time and compared, never copied:
 * the contribution area from the `addWidget` call in the widget
 * contribution source, and the ordered region names from the contract's
 * ratified order line in 13-UI-SPEC.md. An empty derivation on either side
 * fails as a broken instrument, never passes as clean. The gate passes only
 * when the derived area is the top area and the derived order places the
 * chrome bar immediately above the tab strip; any other area, any flipped
 * or separated order, or any extra bar-adjacency claim fails naming the
 * drift on both sides.
 *
 * Honestly --quick: reads text sources only. No build, no browser, no
 * display, no network.
 *
 * Usage:
 *   node scripts/verify-chrome-bar-placement.mjs
 *   node scripts/verify-chrome-bar-placement.mjs --self-test
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'verify-chrome-bar-placement';

const WIDGET_REL = 'theia/extensions/chrome-bar/src/browser/chrome-bar-widget.tsx';
const SPEC_REL = '.planning/milestones/v1.3-phases/13-chrome-bar-strip-relocation-spike/13-UI-SPEC.md';

/**
 * The ratified Variant-A order. The ONE hand-kept list in this file:
 * editing it is how a deliberate contract change is made -- it shows up
 * in the diff for review. Everything it is compared against is derived at
 * check time.
 */
const EXPECTED_ORDER = Object.freeze([
    'menubar',
    'chrome bar',
    'tab strip',
    'workarea',
    'status bar',
]);

/**
 * The shell area every widget this file contributes goes to.
 *
 * AMENDED 2026-09-08 with the strip relocation: the top panel now carries TWO
 * of ours, the URL row and the tab strip's Browsing home, so the assertion is
 * "every contributed area is top" rather than "there is exactly one". Pinning
 * the count was pinning Variant A -- the fallback this phase left behind --
 * and the count is not the property worth protecting. Which area they land in
 * is; a contribution that drifted to 'main' or 'bottom' still fails.
 */
const EXPECTED_AREA = 'top';

/** Contributions expected in the top panel, for the message on drift. */
const EXPECTED_TOP_CONTRIBUTIONS = 2;

/** Every `area: '...'` value carried by an `addWidget` call, in source order. */
function derivedAreasOf(source) {
    const areas = [];
    for (const match of source.matchAll(/addWidget\s*\([^)]*\{\s*area:\s*'([^']+)'/g)) {
        areas.push(match[1]);
    }
    return areas;
}

/**
 * The ordered region names from the contract's ratified order line.
 * The line spans a source wrap (`... tab strip →\nworkarea → status bar`),
 * so the section is matched across lines, bold markers stripped, and the
 * run between the menubar and status-bar anchors split on the arrows.
 */
function derivedOrderOf(specSource) {
    const sectionStart = specSource.indexOf('### Bar placement and order');
    if (sectionStart === -1) {
        return [];
    }
    const section = specSource.slice(sectionStart).split('\n### ')[0].replaceAll('*', '');
    const run = /menubar\s*→([\s\S]*?)status bar/.exec(section);
    if (!run) {
        return [];
    }
    const middle = run[1]
        .split('→')
        .map(part => part.trim().replace(/\.+$/, ''))
        .filter(part => part.length > 0);
    return ['menubar', ...middle, 'status bar'];
}

/** @returns {string[]} failure messages -- empty means the gate holds. */
function checkPlacement(sources) {
    const failures = [];
    const widgetSrc = sources[WIDGET_REL] ?? '';
    const specSrc = sources[SPEC_REL] ?? '';

    const areas = derivedAreasOf(widgetSrc);
    if (areas.length === 0) {
        failures.push(`${WIDGET_REL}: derived ZERO contribution areas -- no addWidget area found, so this comparison proves nothing`);
    }

    const order = derivedOrderOf(specSrc);
    if (order.length === 0) {
        failures.push(`${SPEC_REL}: derived ZERO ratified order lines -- the menubar-to-status-bar order line is missing, so this comparison proves nothing`);
    }

    if (failures.length) {
        return failures;
    }

    const expectedRun = EXPECTED_ORDER.join(' → ');
    const derivedRun = order.join(' → ');
    const strays = areas.filter(area => area !== EXPECTED_AREA);
    if (areas.length === 0) {
        failures.push(`${WIDGET_REL}: derived ZERO addWidget areas -- the contribution enumeration matches nothing, so this comparison proves nothing (broken instrument, not a clean tree)`);
    } else if (strays.length) {
        failures.push(`${WIDGET_REL}: contribution area drifted -- derived [${areas.join(', ')}], every one must be '${EXPECTED_AREA}' (the contracted order [${expectedRun}] keeps both the URL row and the strip's Browsing home in the top panel)`);
    } else if (areas.length !== EXPECTED_TOP_CONTRIBUTIONS) {
        failures.push(`${WIDGET_REL}: derived ${areas.length} top-panel contribution(s), expected ${EXPECTED_TOP_CONTRIBUTIONS} (the URL row and the tab strip). A third would be an unreviewed addition to the panel the strip's geometry depends on; edit EXPECTED_TOP_CONTRIBUTIONS with the reason.`);
    }
    if (derivedRun !== expectedRun) {
        failures.push(`${SPEC_REL}: contracted order drifted -- derived [${derivedRun}], expected [${expectedRun}] (the contribution area derives as [${areas.join(', ')}])`);
    }

    return failures;
}

function readSources() {
    return {
        [WIDGET_REL]: readFileSync(join(REPO_ROOT, WIDGET_REL), 'utf8'),
        [SPEC_REL]: readFileSync(join(REPO_ROOT, SPEC_REL), 'utf8'),
    };
}

function main() {
    if (process.argv.includes('--self-test')) {
        return selfTest();
    }
    const failures = checkPlacement(readSources());
    if (failures.length) {
        console.error(`${NAME}: FAIL -- the chrome-bar placement drifted from the ratified Variant-A contract.`);
        console.error(`If the change is deliberate, edit EXPECTED_ORDER/EXPECTED_AREA in this script in the SAME commit so the contract change is visible in the diff.`);
        failures.forEach(f => console.error(`  - ${f}`));
        return 1;
    }
    console.log(`${NAME}: PASS -- ${EXPECTED_TOP_CONTRIBUTIONS} contribution(s), every one in area '${EXPECTED_AREA}', with the contracted region order intact`);
    return 0;
}

function selfTest() {
    const clean = readSources();
    const baseline = checkPlacement(clean);
    if (baseline.length !== 0) {
        console.error(`${NAME} --self-test: FAIL -- the unmodified tree is already red, so the planted-fault results below would be meaningless:`);
        baseline.forEach(f => console.error(`  ${f}`));
        return 1;
    }

    const cleanWidget = clean[WIDGET_REL];
    const cleanSpec = clean[SPEC_REL];
    const cases = [
        {
            name: 'planted area respell',
            file: WIDGET_REL,
            mutate: src => src.replace(
                "addWidget(this.barWidget, { area: 'top' })",
                "addWidget(this.barWidget, { area: 'main' })"
            ),
            // The derived list now carries both top-panel contributions, so
            // the plant reads as [main, top]. Match the stray itself rather
            // than the whole rendered list: pinning the exact list made this
            // plant fail on the day a second contribution landed, reporting a
            // drifted expectation instead of the drift it exists to catch.
            expect: "must be 'top'",
        },
        {
            name: 'planted order flip',
            file: SPEC_REL,
            mutate: src => src.replace(
                'menubar → chrome bar → tab strip →',
                'menubar → tab strip → chrome bar →'
            ),
            expect: 'tab strip → chrome bar',
        },
        {
            name: 'planted order deletion',
            file: SPEC_REL,
            mutate: src => src.replace(
                'menubar → chrome bar → tab strip →',
                'menubar, chrome bar, tab strip, workarea, status bar'
            ),
            expect: 'ZERO',
        },
    ];

    let failed = 0;
    for (const testCase of cases) {
        const before = testCase.file === WIDGET_REL ? cleanWidget : cleanSpec;
        const after = testCase.mutate(before);
        // A planted fault that does not change the source at all would make
        // the case vacuous -- assert the mutation actually landed.
        if (after === before) {
            console.error(`${NAME} --self-test: FAIL -- '${testCase.name}' did not modify the source; the anchor it edits has drifted`);
            failed++;
            continue;
        }
        const mutated = { ...clean, [testCase.file]: after };
        const failures = checkPlacement(mutated);
        if (!failures.some(f => f.includes(testCase.expect))) {
            console.error(`${NAME} --self-test: FAIL -- '${testCase.name}' did not go red naming '${testCase.expect}'; got: ${failures.join(' | ') || '(no failures at all)'}`);
            failed++;
        } else {
            console.log(`  ok  ${testCase.name} -> red, naming '${testCase.expect}'`);
        }
    }

    if (failed) {
        return 1;
    }
    console.log(`${NAME} --self-test: PASS -- ${cases.length} planted faults all went red`);
    return 0;
}

process.exit(main());
