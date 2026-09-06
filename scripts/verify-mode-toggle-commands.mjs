#!/usr/bin/env node
/**
 * GUI-07's shipped-mode defaults gate (14-01): the three shipped modes are
 * the contract between the modes extension and the chrome-bar toggle.
 *
 * Descriptor ids, labels, order, and the placement map are DERIVED from
 * `mode-descriptors.ts` at check time, the toggle segments from the widget
 * `MODES` literal, and both are compared to the one EXPECTED const below as
 * SET EQUALITY: a surplus mode is an unreviewed default, a missing one is a
 * dead toggle segment, a reworded label breaks the toggle mapping, and a
 * placement drift moves panels nobody reviewed -- each reported by name. An
 * empty derivation fails as a broken instrument, never passes as clean. The
 * widget never imports the descriptors: both sides agree through this gate,
 * and the label-to-id rule the bridge relies on (lowercased labels equal
 * descriptor ids, in order) is asserted here rather than trusted.
 *
 * Modes ship as data, never manifest flags: a scoped negated search fails on
 * any bare `[modes]` section in the configuration schema, the generator, or
 * the modes sources. Backtick-wrapped prose mentions (this file's own
 * contract discussion, descriptor comments) are exempt -- and the self-test
 * plants a bare flag in every scope to prove the search is not vacuous.
 *
 * Honestly --quick: reads text sources only. No build, no browser, no
 * display, no network.
 *
 * Usage:
 *   node scripts/verify-mode-toggle-commands.mjs
 *   node scripts/verify-mode-toggle-commands.mjs --self-test
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'verify-mode-toggle-commands';

const DESCRIPTORS_REL = 'theia/extensions/modes/src/browser/mode-descriptors.ts';
const WIDGET_REL = 'theia/extensions/chrome-bar/src/browser/chrome-bar-widget.tsx';
const SCHEMA_REL = 'scripts/lib/config-schema.json';
const GENERATOR_REL = 'scripts/generate.mjs';
const MODES_GLOB_RELS = [
    'theia/extensions/modes/src/browser/mode-descriptors.ts',
    'theia/extensions/modes/src/browser/modes-frontend-module.ts',
    'theia/extensions/modes/src/browser/mode-service.ts',
    'theia/extensions/modes/src/browser/modes-commands.ts',
    'theia/extensions/modes/src/browser/organising-placeholder-widget.ts',
    'theia/extensions/modes/src/browser/setups-service.ts',
    'theia/extensions/modes/src/browser/setups-commands.ts',
    'theia/extensions/modes/src/browser/dependent-windows.ts',
];

/**
 * The declared shipped-mode contract, in contracted toggle order. The ONE
 * hand-kept list in this file: editing it is how a deliberate contract
 * change is made -- it shows up in the diff for review. Everything it is
 * compared against is derived at check time.
 */
const EXPECTED_MODES = Object.freeze([
    Object.freeze({
        id: 'coding', label: 'Coding',
        collapseAreas: Object.freeze([]),
        placements: Object.freeze({ 'explorer-view-container': 'left' }),
    }),
    Object.freeze({
        id: 'browsing', label: 'Browsing',
        collapseAreas: Object.freeze(['left', 'right', 'bottom']),
        placements: Object.freeze({}),
    }),
    Object.freeze({
        id: 'organising', label: 'Organising',
        collapseAreas: Object.freeze(['left', 'right', 'bottom']),
        placements: Object.freeze({}),
    }),
]);

function diff(actual, expected) {
    const a = new Set(actual);
    const e = new Set(expected);
    return {
        surplus: [...a].filter(x => !e.has(x)),
        missing: [...e].filter(x => !a.has(x)),
    };
}

/** Every `id: '...'` value in the descriptors source, in source order. */
function derivedIdsOf(source) {
    const ids = [];
    for (const match of source.matchAll(/^\s*id:\s*'([^']+)'/gm)) {
        ids.push(match[1]);
    }
    return ids;
}

/** Maps each derived id to its `label: '...'` value. */
function derivedLabelsById(source) {
    const out = {};
    for (const match of source.matchAll(/^\s*id:\s*'([^']+)',\s*\n\s*label:\s*'([^']+)'/gm)) {
        out[match[1]] = match[2];
    }
    return out;
}

/**
 * Splits the source into per-descriptor segments keyed by id, then reads
 * each segment's `collapseAreas: [...]` list and `['view', 'area']`
 * placement rows. A descriptor with no collapse block collapses nothing;
 * one with an empty Map places nothing.
 */
function derivedPlacementById(source) {
    const segments = {};
    const blocks = source.split(/^const \w+: PerspectiveDescriptor = \{$/m).slice(1);
    for (const block of blocks) {
        const idMatch = /^\s*id:\s*'([^']+)'/m.exec(block);
        if (!idMatch) {
            continue;
        }
        const collapseMatch = /collapseAreas:\s*\[([^\]]*)\]/.exec(block);
        const collapse = collapseMatch
            ? [...collapseMatch[1].matchAll(/'([^']+)'/g)].map(m => m[1])
            : [];
        // Read placements from the block with the collapse list removed:
        // `['right', 'bottom']` inside a collapse list is not a placement.
        const deCollapsed = block.replace(/collapseAreas:\s*\[[^\]]*\]/, '');
        const placements = {};
        for (const m of deCollapsed.matchAll(/\[\s*'([^']+)'\s*,\s*'([^']+)'\s*\]/g)) {
            placements[m[1]] = m[2];
        }
        segments[idMatch[1]] = { collapseAreas: collapse, placements };
    }
    return segments;
}

/** The widget `MODES = [...]` literal, in source order. */
function derivedModesLiteralOf(source) {
    const m = /MODES\s*=\s*\[([^\]]*)\]/.exec(source);
    if (!m) {
        return [];
    }
    return [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]);
}

/**
 * Bare `[modes]` section markers per scoped file, with backtick-wrapped
 * prose mentions exempted. Returns { rel, line } rows -- empty is clean.
 */
function derivedManifestFlags(sources, rels) {
    const rows = [];
    for (const rel of rels) {
        const src = sources[rel] ?? '';
        const lines = src.split('\n');
        lines.forEach((line, index) => {
            const stripped = line.replace(/`\[modes\]`/g, '');
            if (stripped.includes('[modes]')) {
                rows.push({ rel, line: index + 1 });
            }
        });
    }
    return rows;
}

/** @returns {string[]} failure messages -- empty means the gate holds. */
function checkModes(sources) {
    const failures = [];
    const descriptorsSrc = sources[DESCRIPTORS_REL] ?? '';
    const widgetSrc = sources[WIDGET_REL] ?? '';

    const ids = derivedIdsOf(descriptorsSrc);
    if (ids.length === 0) {
        failures.push(`${DESCRIPTORS_REL}: derived ZERO descriptor ids -- no id: '...' line found, so this comparison proves nothing`);
        return failures;
    }
    const expectedIds = EXPECTED_MODES.map(m => m.id);
    const idDiff = diff(ids, expectedIds);
    if (idDiff.surplus.length) {
        failures.push(`${DESCRIPTORS_REL}: descriptor ids NOT in the declared contract (unreviewed shipped mode): ${idDiff.surplus.join(', ')}`);
    }
    if (idDiff.missing.length) {
        failures.push(`${DESCRIPTORS_REL}: declared contract ids are GONE (dead toggle segment): ${idDiff.missing.join(', ')}`);
    }
    if (ids.join(',') !== expectedIds.join(',')) {
        failures.push(`${DESCRIPTORS_REL}: descriptor order drifted (got [${ids.join(', ')}], contract is [${expectedIds.join(', ')}]) -- the toggle contract is order-sensitive`);
    }

    const labels = derivedLabelsById(descriptorsSrc);
    for (const expected of EXPECTED_MODES) {
        if (!(expected.id in labels)) {
            failures.push(`${DESCRIPTORS_REL}: no label derived for descriptor '${expected.id}' -- the id/label pair the bridge maps on is broken`);
        } else if (labels[expected.id] !== expected.label) {
            failures.push(`${DESCRIPTORS_REL}: label drift on '${expected.id}' (got '${labels[expected.id]}', contract is '${expected.label}')`);
        }
    }

    const placements = derivedPlacementById(descriptorsSrc);
    for (const expected of EXPECTED_MODES) {
        const actual = placements[expected.id];
        if (!actual) {
            failures.push(`${DESCRIPTORS_REL}: no descriptor block derived for '${expected.id}' -- placement comparison proves nothing for it`);
            continue;
        }
        if (actual.collapseAreas.join(',') !== [...expected.collapseAreas].join(',')) {
            failures.push(`${DESCRIPTORS_REL}: collapse drift on '${expected.id}' (got [${actual.collapseAreas.join(', ')}], contract is [${[...expected.collapseAreas].join(', ')}])`);
        }
        const actualRows = Object.entries(actual.placements).map(([v, a]) => `${v}->${a}`).sort().join(',');
        const expectedRows = Object.entries(expected.placements).map(([v, a]) => `${v}->${a}`).sort().join(',');
        if (actualRows !== expectedRows) {
            failures.push(`${DESCRIPTORS_REL}: placement drift on '${expected.id}' (got {${actualRows || 'none'}}, contract is {${expectedRows || 'none'}})`);
        }
    }

    // Toggle agreement through the gate, never imports: the widget literal
    // lowercased must equal the descriptor ids in order -- the exact rule
    // the bridge's switchPerspective mapping relies on.
    const segments = derivedModesLiteralOf(widgetSrc);
    if (segments.length === 0) {
        failures.push(`${WIDGET_REL}: derived ZERO toggle segments -- no MODES = [...] literal found, so the agreement comparison proves nothing`);
    } else if (segments.map(s => s.toLowerCase()).join(',') !== expectedIds.join(',')) {
        failures.push(`${WIDGET_REL}: toggle segments [${segments.join(', ')}] disagree with descriptor ids [${expectedIds.join(', ')}] (lowercased, in order) -- the bridge would switch nothing`);
    }

    // Bridge presence: the toggle must route through the stock service.
    if (!widgetSrc.includes('switchPerspective')) {
        failures.push(`${WIDGET_REL}: no switchPerspective call -- the toggle is not bridged to stock perspective switching`);
    }

    // Modes ship as data: no manifest flag in schema, generator, or sources.
    const flagRels = [SCHEMA_REL, GENERATOR_REL, ...MODES_GLOB_RELS];
    const flags = derivedManifestFlags(sources, flagRels);
    for (const row of flags) {
        failures.push(`${row.rel}:${row.line}: bare [modes] manifest flag -- modes ship as descriptors plus user data only`);
    }

    return failures;
}

function readSources() {
    const out = {};
    for (const rel of [DESCRIPTORS_REL, WIDGET_REL, SCHEMA_REL, GENERATOR_REL, ...MODES_GLOB_RELS]) {
        try {
            out[rel] = readFileSync(join(REPO_ROOT, rel), 'utf8');
        } catch {
            out[rel] = '';
        }
    }
    return out;
}

function main() {
    if (process.argv.includes('--self-test')) {
        return selfTest();
    }
    const failures = checkModes(readSources());
    if (failures.length) {
        console.error(`${NAME}: FAIL -- the shipped-mode defaults drifted from the declared contract.`);
        console.error(`If the change is deliberate, edit EXPECTED_MODES in this script in the SAME commit so the contract change is visible in the diff.`);
        failures.forEach(f => console.error(`  - ${f}`));
        return 1;
    }
    console.log(`${NAME}: PASS -- ${EXPECTED_MODES.length} shipped modes (ids, labels, order, placements) match the declared contract and the toggle agrees`);
    return 0;
}

function selfTest() {
    const clean = readSources();
    const baseline = checkModes(clean);
    if (baseline.length !== 0) {
        console.error(`${NAME} --self-test: FAIL -- the unmodified tree is already red, so the planted-fault results below would be meaningless:`);
        baseline.forEach(f => console.error(`  ${f}`));
        return 1;
    }

    const cleanDescriptors = clean[DESCRIPTORS_REL];
    const cleanWidget = clean[WIDGET_REL];
    const cases = [
        {
            name: 'planted id removal',
            mutate: sources => ({ ...sources, [DESCRIPTORS_REL]: cleanDescriptors.replace(
                "    id: 'browsing',\n",
                '// planted removal: browsing id line deleted\n'
            ) }),
            expect: 'browsing',
        },
        {
            name: 'planted label drift',
            mutate: sources => ({ ...sources, [DESCRIPTORS_REL]: cleanDescriptors.replace(
                "    label: 'Browsing',",
                "    label: 'Surfing',"
            ) }),
            expect: 'Browsing',
        },
        {
            name: 'planted reorder',
            mutate: sources => {
                const browsingBlock = /const browsing: PerspectiveDescriptor = \{[\s\S]*?\n\};\n/.exec(cleanDescriptors);
                const organisingBlock = /const organising: PerspectiveDescriptor = \{[\s\S]*?\n\};\n/.exec(cleanDescriptors);
                if (!browsingBlock || !organisingBlock) {
                    return { ...sources, [DESCRIPTORS_REL]: cleanDescriptors };
                }
                const TOKEN = '/* planted-reorder-token */';
                return {
                    ...sources,
                    [DESCRIPTORS_REL]: cleanDescriptors
                        .replace(browsingBlock[0], TOKEN)
                        .replace(organisingBlock[0], browsingBlock[0])
                        .replace(TOKEN, organisingBlock[0]),
                };
            },
            expect: 'order',
        },
        {
            name: 'planted placement drift',
            mutate: sources => ({ ...sources, [DESCRIPTORS_REL]: cleanDescriptors.replace(
                "    chromeOptions: { collapseAreas: ['left', 'right', 'bottom'] },\n};\n\nconst organising",
                "    chromeOptions: { collapseAreas: ['left', 'right'] },\n};\n\nconst organising"
            ) }),
            expect: 'bottom',
        },
        {
            name: 'planted manifest flag',
            mutate: sources => ({ ...sources, [DESCRIPTORS_REL]: cleanDescriptors + "\n// planted flag below\n[modes]\n" }),
            expect: '[modes]',
        },
    ];

    let failed = 0;
    for (const testCase of cases) {
        const mutated = testCase.mutate(clean);
        // A planted fault that does not change the source at all would make
        // the case vacuous -- assert the mutation actually landed.
        if (JSON.stringify(mutated) === JSON.stringify(clean)) {
            console.error(`${NAME} --self-test: FAIL -- '${testCase.name}' did not modify the source; the anchor it edits has drifted`);
            failed++;
            continue;
        }
        const failures = checkModes(mutated);
        if (!failures.some(f => f.includes(testCase.expect))) {
            console.error(`${NAME} --self-test: FAIL -- '${testCase.name}' did not go red naming '${testCase.expect}'; got: ${failures.join(' | ') || '(no failures at all)'}`);
            failed++;
        } else {
            console.log(`  ok  ${testCase.name} -> red, naming '${testCase.expect}'`);
        }
    }

    // The widget half needs its own plant: a reordered MODES literal must
    // break the toggle/descriptor agreement even when descriptors are clean.
    const reorderedWidget = cleanWidget.replace(
        "static readonly MODES = ['Coding', 'Browsing', 'Organising'];",
        "static readonly MODES = ['Browsing', 'Coding', 'Organising'];"
    );
    if (reorderedWidget === cleanWidget) {
        console.error(`${NAME} --self-test: FAIL -- 'planted toggle reorder' did not modify the widget; the anchor it edits has drifted`);
        failed++;
    } else {
        const failures = checkModes({ ...clean, [WIDGET_REL]: reorderedWidget });
        if (!failures.some(f => f.includes('toggle segments'))) {
            console.error(`${NAME} --self-test: FAIL -- 'planted toggle reorder' did not go red on the agreement; got: ${failures.join(' | ') || '(no failures at all)'}`);
            failed++;
        } else {
            console.log(`  ok  planted toggle reorder -> red, naming the agreement`);
        }
    }

    if (failed) {
        return 1;
    }
    console.log(`${NAME} --self-test: PASS -- all planted faults went red`);
    return 0;
}

process.exit(main());
