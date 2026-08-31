#!/usr/bin/env node
/**
 * GUI-04's bridge-contract assertion: the tab-URI registry's exported shape
 * is unchanged by this phase.
 *
 * GUI-04 is a negative requirement -- "nothing welds Theia to full-window
 * presentation" -- and a negative has no data-shape edge to probe. The
 * closest positive proxy available is the one recorded in
 * `tab-uri-registry.ts`'s own header: "Its exported shape is the public
 * interface `@powerbrowser/browser-bridge` consumes post-4.0 -- treat it as
 * an API, not an implementation detail." The future unified tab strip is
 * landable precisely because that shape did not drift while web tabs were
 * added, so asserting it is cheap and it is the declared contract.
 *
 * ## Why the ACTUAL set is derived and only the EXPECTED set is written down
 *
 * The tempting shape for this check is a hand-kept list of probes --
 * `['parseName', 'uriOf'].forEach(m => assert(m in registry))`. That check
 * silently stops testing anything the moment it goes stale: it can never go
 * red on a member being *added*, and it can never go red on a member being
 * removed that nobody remembered to list. It agrees with every tree.
 *
 * So the actual surface is DERIVED from the module's own source at check
 * time and compared to the expected surface as a SET EQUALITY. That
 * discriminates in both directions: an addition is a surplus, a removal is a
 * shortfall, and both are reported by name. `--self-test` proves exactly
 * that against a planted addition and a planted removal, rather than
 * trusting it -- the same discipline 01-05 had to learn the hard way when
 * two of its assertions turned out to rest on an instrument that could not
 * go red.
 *
 * Static by construction: this reads the TypeScript sources, never a
 * compiled artifact, so it belongs in `verify-platform.sh --quick` (no
 * build, no browser, no display, no network).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BROWSER_DIR = join(REPO_ROOT, 'theia/extensions/tab-uris/src/browser');

const REGISTRY_TS = 'tab-uri-registry.ts';
const TABLE_TS = 'view-factory-table.ts';

/**
 * The declared bridge contract. This is the ONE hand-kept list in the file,
 * and it is deliberate: without a written-down expectation there is nothing
 * to compare a derived set against, and the check degenerates into
 * "the module exports whatever it exports". Editing this constant is how a
 * deliberate contract change is made -- it shows up in the diff and the
 * reviewer sees it, which is the entire point of freezing a shape.
 */
const EXPECTED = Object.freeze({
    [REGISTRY_TS]: Object.freeze(['TabUriRegistry']),
    [TABLE_TS]: Object.freeze([
        'ViewFactoryTableRow',
        'POWERBROWSER_VIEW_FACTORY_IDS',
        'SETTINGS_WIDGET_FACTORY_ID',
        'PLUGIN_VIEW_CONTAINER_FACTORY_ID',
    ]),
});

/** `TabUriRegistry`'s public members -- the methods the bridge calls. */
const EXPECTED_MEMBERS = Object.freeze([
    'getViewContribution',
    'parseName',
    'createWidgetOptions',
    'uriOf',
]);

/** Top-level `export` declarations, by name, in source order. */
function exportedNamesOf(source) {
    const re = /^export\s+(?:default\s+)?(?:abstract\s+)?(?:declare\s+)?(?:class|interface|const|let|var|function|type|enum)\s+([A-Za-z_$][\w$]*)/gm;
    const names = [];
    for (const match of source.matchAll(re)) {
        names.push(match[1]);
    }
    return names;
}

/**
 * Public member names of a class, derived from its source body.
 *
 * Members are declared at exactly one level of indentation inside the class
 * body; a member with no explicit `public`/`protected`/`private` modifier is
 * public. Method bodies sit two levels deeper and so cannot collide, and
 * comment lines are skipped explicitly rather than relied on not to match.
 */
function publicMembersOf(source, className) {
    const start = source.indexOf(`export class ${className} {`);
    if (start === -1) {
        return [];
    }
    const body = source.slice(start);
    const members = [];
    for (const line of body.split('\n')) {
        if (/^\s*(\/\/|\/\*|\*)/.test(line)) {
            continue;
        }
        const match = /^ {4}(?:(public|protected|private)\s+)?(?:static\s+)?(?:readonly\s+)?(?:(?:get|set)\s+)?([A-Za-z_$][\w$]*)\s*[(:<]/.exec(line);
        if (!match) {
            // A line at column 0 that is not a member ends the class body.
            if (/^}/.test(line)) {
                break;
            }
            continue;
        }
        if (match[1] === 'protected' || match[1] === 'private') {
            continue;
        }
        members.push(match[2]);
    }
    return members;
}

/** Set difference reported by name, so a failure says WHICH name drifted. */
function diff(actual, expected) {
    const a = new Set(actual);
    const e = new Set(expected);
    return {
        surplus: [...a].filter(name => !e.has(name)),
        missing: [...e].filter(name => !a.has(name)),
    };
}

/**
 * @returns {string[]} failure messages -- empty means the shape holds.
 */
function checkShape(sources) {
    const failures = [];

    for (const [file, expected] of Object.entries(EXPECTED)) {
        const actual = exportedNamesOf(sources[file]);
        // Non-vacuity: an unreadable or restructured source that yields no
        // exports at all must fail as a broken instrument, not pass as a
        // clean set comparison against nothing.
        if (actual.length === 0) {
            failures.push(`${file}: derived ZERO exports -- the parse found nothing, so this comparison proves nothing`);
            continue;
        }
        const { surplus, missing } = diff(actual, expected);
        if (surplus.length) {
            failures.push(`${file}: exports NOT in the declared bridge contract: ${surplus.join(', ')}`);
        }
        if (missing.length) {
            failures.push(`${file}: declared bridge contract exports are GONE: ${missing.join(', ')}`);
        }
    }

    const members = publicMembersOf(sources[REGISTRY_TS], 'TabUriRegistry');
    if (members.length === 0) {
        failures.push('TabUriRegistry: derived ZERO public members -- the class body was not found or not parsed');
    } else {
        const { surplus, missing } = diff(members, EXPECTED_MEMBERS);
        if (surplus.length) {
            failures.push(`TabUriRegistry: public members NOT in the declared bridge contract: ${surplus.join(', ')}`);
        }
        if (missing.length) {
            failures.push(`TabUriRegistry: declared bridge contract members are GONE: ${missing.join(', ')}`);
        }
    }

    return failures;
}

function readSources() {
    return {
        [REGISTRY_TS]: readFileSync(join(BROWSER_DIR, REGISTRY_TS), 'utf8'),
        [TABLE_TS]: readFileSync(join(BROWSER_DIR, TABLE_TS), 'utf8'),
    };
}

/**
 * Proves the comparison discriminates in BOTH directions before it is
 * trusted in either. A check that can only go green is not a check.
 */
function selfTest() {
    const clean = readSources();
    const baseline = checkShape(clean);
    if (baseline.length !== 0) {
        console.error('verify-registry-shape --self-test: FAIL -- the unmodified tree is already red, so the planted-fault results below would be meaningless:');
        baseline.forEach(f => console.error(`  ${f}`));
        return 1;
    }

    const cases = [
        {
            name: 'planted export addition',
            sources: {
                ...clean,
                [TABLE_TS]: clean[TABLE_TS] + '\nexport const PLANTED_BRIDGE_LEAK = 1;\n',
            },
            expect: 'PLANTED_BRIDGE_LEAK',
        },
        {
            name: 'planted export removal',
            sources: {
                ...clean,
                [TABLE_TS]: clean[TABLE_TS].replace('export const SETTINGS_WIDGET_FACTORY_ID', 'const SETTINGS_WIDGET_FACTORY_ID'),
            },
            expect: 'SETTINGS_WIDGET_FACTORY_ID',
        },
        {
            name: 'planted public-member addition',
            sources: {
                ...clean,
                [REGISTRY_TS]: clean[REGISTRY_TS].replace(
                    '    parseName(uri: URI): string {',
                    '    plantedBridgeMethod(): void {\n    }\n\n    parseName(uri: URI): string {'
                ),
            },
            expect: 'plantedBridgeMethod',
        },
        {
            name: 'planted public-member removal',
            sources: {
                ...clean,
                [REGISTRY_TS]: clean[REGISTRY_TS].replace('    uriOf(widget: Widget)', '    protected uriOf(widget: Widget)'),
            },
            expect: 'uriOf',
        },
    ];

    let failed = 0;
    for (const testCase of cases) {
        // A planted fault that does not change the source at all would make
        // the case vacuous -- assert the mutation actually landed.
        const mutated = Object.keys(clean).some(file => testCase.sources[file] !== clean[file]);
        if (!mutated) {
            console.error(`verify-registry-shape --self-test: FAIL -- '${testCase.name}' did not modify any source; the anchor it edits has drifted`);
            failed++;
            continue;
        }
        const failures = checkShape(testCase.sources);
        if (!failures.some(f => f.includes(testCase.expect))) {
            console.error(`verify-registry-shape --self-test: FAIL -- '${testCase.name}' did not go red naming '${testCase.expect}'; got: ${failures.join(' | ') || '(no failures at all)'}`);
            failed++;
        } else {
            console.log(`  ok  ${testCase.name} -> red, naming '${testCase.expect}'`);
        }
    }

    if (failed) {
        return 1;
    }
    console.log(`verify-registry-shape --self-test: PASS -- ${cases.length} planted faults all went red`);
    return 0;
}

function main() {
    if (process.argv.includes('--self-test')) {
        return selfTest();
    }
    const failures = checkShape(readSources());
    if (failures.length) {
        console.error('verify-registry-shape: FAIL -- the tab-URI registry\'s exported shape drifted from the declared bridge contract.');
        console.error('This shape is the interface the future unified tab strip consumes (tab-uri-registry.ts header). If the change is deliberate, edit EXPECTED/EXPECTED_MEMBERS in this script in the SAME commit so the contract change is visible in the diff.');
        failures.forEach(f => console.error(`  ${f}`));
        return 1;
    }
    console.log(
        `verify-registry-shape: PASS -- ${Object.values(EXPECTED).flat().length} exported names across ` +
        `${Object.keys(EXPECTED).length} modules and ${EXPECTED_MEMBERS.length} TabUriRegistry public members match the declared bridge contract`
    );
    return 0;
}

process.exit(main());
