#!/usr/bin/env node
/**
 * GUI-07's mode-switch tabs-invariant gate (14-02): no switch path can
 * close, move, or detach a tab without this gate going red by name.
 *
 * It DERIVES at check time, from the mode service and the chrome-bar widget
 * sources, the set of shell-mutating calls on every mode-switch path and
 * compares as SET EQUALITY against the one EXPECTED_SWITCH_CALLS allowlist
 * below: stock perspective switching, side-panel expand and collapse (plus
 * the bottom dock's expandPanel/collapsePanel spelling), contribution-routed
 * placeholder open and close through the descriptor slot seam, and the chip
 * re-assertion. A surplus call is an unreviewed shell mutation on the switch
 * path; a missing call is a dropped invariant surface; an empty derivation
 * fails as a broken instrument, never passes as clean.
 *
 * The switch path is scoped to named functions, not whole files: the save
 * and load paths legitimately touch storage, the file service, and input,
 * and scanning them here would either allowlist storage calls on the switch
 * path or red on every save. The anchors are the function definitions; a
 * renamed function fails distinctly as anchor drift, not as a false clean.
 *
 * The second half derives the two mode command ids from the commands source
 * with set equality plus the contracted save label verbatim and the labelless
 * activate command, and requires code call sites to import the exported
 * consts rather than re-spelling the strings.
 *
 * Honestly --quick: reads text sources only. No build, no browser, no
 * display, no network.
 *
 * Usage:
 *   node scripts/verify-mode-switch-tabs-invariant.mjs
 *   node scripts/verify-mode-switch-tabs-invariant.mjs --self-test
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'verify-mode-switch-tabs-invariant';

const SERVICE_REL = 'theia/extensions/modes/src/browser/mode-service.ts';
const WIDGET_REL = 'theia/extensions/chrome-bar/src/browser/chrome-bar-widget.tsx';
const COMMANDS_REL = 'theia/extensions/modes/src/browser/modes-commands.ts';
const DESCRIPTORS_REL = 'theia/extensions/modes/src/browser/mode-descriptors.ts';
const PLACEHOLDER_REL = 'theia/extensions/modes/src/browser/organising-placeholder-widget.ts';
const MODES_MODULE_REL = 'theia/extensions/modes/src/browser/modes-frontend-module.ts';

/**
 * The declared switch-path contract. The ONE hand-kept allowlist in this
 * file: editing it is how a deliberate switch-path change is made -- it
 * shows up in the diff for review. Everything it is compared against is
 * derived at check time.
 */
const EXPECTED_SWITCH_CALLS = Object.freeze([
    'switchPerspective',
    'expand',
    'collapse',
    'expandPanel',
    'collapsePanel',
    'openOrganisingSlot',
    'closeOrganisingSlot',
    'setElement',
]);

const EXPECTED_COMMAND_IDS = Object.freeze([
    'powerbrowser.modes.activate',
    'powerbrowser.modes.save-as-mode',
]);

const SAVE_LABEL = 'Save as Mode';

/** Switch-path function anchors: [rel, name, definition-pattern]. */
const SWITCH_FUNCTIONS = Object.freeze([
    { rel: SERVICE_REL, name: 'activateMode', pattern: /async\s+activateMode\s*\([^)]*\)\s*(?::\s*[^{]+)?\{/ },
    { rel: WIDGET_REL, name: 'selectMode', pattern: /selectMode\s*=\s*\([^)]*\)\s*=>/ },
    { rel: WIDGET_REL, name: 'selectCustomMode', pattern: /selectCustomMode\s*=\s*\([^)]*\)\s*=>/ },
    { rel: WIDGET_REL, name: 'syncModeFromPerspective', pattern: /syncModeFromPerspective\s*\([^)]*\)\s*(?::\s*[^{]+)?\{/ },
    { rel: WIDGET_REL, name: 'publishTabCount', pattern: /publishTabCount\s*\(\s*\)\s*(?::\s*[^{]+)?\{/ },
]);

function diff(actual, expected) {
    const a = new Set(actual);
    const e = new Set(expected);
    return {
        surplus: [...a].filter(x => !e.has(x)),
        missing: [...e].filter(x => !a.has(x)),
    };
}

/**
 * Blank strings (then comments) so brace matching and call derivation see
 * code shape only. Strings go first: a `//` inside a string is not a
 * comment, and an apostrophe inside a comment is not a string.
 */
function stripTs(src) {
    const noStrings = src
        .replace(/`(?:[^`\\]|\\.)*`/g, '``')
        .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
        .replace(/"(?:[^"\\\n]|\\.)*"/g, '""');
    return noStrings
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .split('\n')
        .filter(line => !/^\s*\/\//.test(line))
        .join('\n')
        .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/** Body of the anchored definition via brace matching on stripped source. */
function bodyOf(stripped, anchor, fnName, rel) {
    const at = stripped.search(anchor);
    if (at < 0) {
        return { error: `${rel}: switch-path anchor '${fnName}' not found -- the function was renamed or removed, so this comparison proves nothing` };
    }
    const open = stripped.indexOf('{', at);
    if (open < 0) {
        return { error: `${rel}: no body brace after switch-path anchor '${fnName}' -- the anchor pattern no longer matches the definition` };
    }
    let depth = 0;
    for (let i = open; i < stripped.length; i += 1) {
        if (stripped[i] === '{') {
            depth += 1;
        } else if (stripped[i] === '}') {
            depth -= 1;
            if (depth === 0) {
                return { body: stripped.slice(open + 1, i) };
            }
        }
    }
    return { error: `${rel}: unbalanced braces after switch-path anchor '${fnName}' -- the body cannot be derived` };
}

/**
 * Shell-mutating calls in a switch-path body: dotted calls on the shell
 * objects plus the descriptor slot seam both callers share.
 */
function switchCallsOf(body) {
    const out = new Set();
    for (const m of body.matchAll(/this\.(?:shell|perspectives|statusBar)[\w.]*\.(\w+)\s*\(/g)) {
        out.add(m[1]);
    }
    for (const m of body.matchAll(/(openOrganisingSlot|closeOrganisingSlot)\s*\(/g)) {
        out.add(m[1]);
    }
    return [...out];
}

/** Every `*_COMMAND_ID = '...'` value in the commands source. */
function derivedCommandIdsOf(source) {
    const ids = [];
    for (const m of source.matchAll(/\b[A-Z][A-Z0-9_]*_COMMAND_ID\s*=\s*'([^']+)'/g)) {
        ids.push(m[1]);
    }
    return ids;
}

/** Every `label: '...'` value in the commands source. */
function derivedCommandLabelsOf(source) {
    const labels = [];
    for (const m of source.matchAll(/label:\s*'([^']+)'/g)) {
        labels.push(m[1]);
    }
    return labels;
}

/** @returns {string[]} failure messages -- empty means the gate holds. */
function checkInvariant(sources) {
    const failures = [];
    const serviceSrc = sources[SERVICE_REL] ?? '';
    const widgetSrc = sources[WIDGET_REL] ?? '';
    const commandsSrc = sources[COMMANDS_REL] ?? '';
    const stripped = {
        [SERVICE_REL]: stripTs(serviceSrc),
        [WIDGET_REL]: stripTs(widgetSrc),
    };

    const derived = new Set();
    for (const fn of SWITCH_FUNCTIONS) {
        const found = bodyOf(stripped[fn.rel], fn.pattern, fn.name, fn.rel);
        if (found.error) {
            failures.push(found.error);
            continue;
        }
        for (const call of switchCallsOf(found.body)) {
            derived.add(call);
        }
    }
    if (derived.size === 0 && failures.length === 0) {
        failures.push('derived ZERO switch-path calls -- no shell call found in any switch-path body, so this comparison proves nothing');
    } else {
        const callDiff = diff([...derived].sort(), [...EXPECTED_SWITCH_CALLS].sort());
        if (callDiff.surplus.length) {
            failures.push(`switch path calls NOT in the allowlist (unreviewed shell mutation on a mode switch): ${callDiff.surplus.join(', ')}`);
        }
        if (callDiff.missing.length) {
            failures.push(`allowlisted switch path calls are GONE (dropped invariant surface): ${callDiff.missing.join(', ')}`);
        }
    }

    const ids = derivedCommandIdsOf(commandsSrc);
    if (ids.length === 0) {
        failures.push(`${COMMANDS_REL}: derived ZERO mode command ids -- no *_COMMAND_ID = '...' line found, so this comparison proves nothing`);
    } else {
        const idDiff = diff(ids, [...EXPECTED_COMMAND_IDS]);
        if (idDiff.surplus.length) {
            failures.push(`${COMMANDS_REL}: mode command ids NOT in the declared contract (unreviewed command): ${idDiff.surplus.join(', ')}`);
        }
        if (idDiff.missing.length) {
            failures.push(`${COMMANDS_REL}: declared mode command ids are GONE: ${idDiff.missing.join(', ')}`);
        }
    }

    const labels = derivedCommandLabelsOf(commandsSrc);
    if (labels.length !== 1 || labels[0] !== SAVE_LABEL) {
        failures.push(`${COMMANDS_REL}: the mode commands must carry exactly one label, the contracted '${SAVE_LABEL}' (got [${labels.join(', ')}]) -- the activate command stays labelless`);
    }
    const activateBlock = /export const MODES_ACTIVATE[^;]*;/.exec(commandsSrc);
    if (!activateBlock) {
        failures.push(`${COMMANDS_REL}: the MODES_ACTIVATE declaration was not found -- the labelless activate command cannot be checked`);
    } else if (activateBlock[0].includes('label')) {
        failures.push(`${COMMANDS_REL}: the activate command gained a label -- it stays labelless by contract, toggle-invoked only`);
    }

    for (const id of ['MODES_ACTIVATE', 'MODES_SAVE_AS_MODE']) {
        if (!commandsSrc.includes(`registerCommand(${id},`)) {
            failures.push(`${COMMANDS_REL}: registration must use the ${id} const (registerCommand(${id}, ...) not found -- a re-spelled string bypasses const discipline)`);
        }
    }

    // Call-site const discipline: the bare command strings live in the const
    // definitions only; every other modes source imports the consts.
    for (const id of EXPECTED_COMMAND_IDS) {
        for (const rel of [SERVICE_REL, DESCRIPTORS_REL, PLACEHOLDER_REL, WIDGET_REL, MODES_MODULE_REL]) {
            if ((sources[rel] ?? '').includes(`'${id}'`)) {
                failures.push(`${rel}: re-spelled mode command string '${id}' -- import the exported const from modes-commands instead`);
            }
        }
    }
    for (const [rel, from] of [
        [WIDGET_REL, "'@powerbrowser/modes/lib/browser/modes-commands'"],
        [PLACEHOLDER_REL, "'./modes-commands'"],
    ]) {
        const src = sources[rel] ?? '';
        if (!new RegExp(`import\\s*\\{[^}]*MODES_ACTIVATE_COMMAND_ID[^}]*\\}\\s*from\\s*${from.replace(/[./]/g, m => `\\${m}`)}`).test(src)) {
            failures.push(`${rel}: no MODES_ACTIVATE_COMMAND_ID const import from the mode commands -- call sites import the const, never re-spell the string`);
        }
    }

    return failures;
}

function readSources() {
    const out = {};
    for (const rel of [SERVICE_REL, WIDGET_REL, COMMANDS_REL, DESCRIPTORS_REL, PLACEHOLDER_REL, MODES_MODULE_REL]) {
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
    const failures = checkInvariant(readSources());
    if (failures.length) {
        console.error(`${NAME}: FAIL -- the mode-switch surface drifted from the declared contract.`);
        console.error(`If the change is deliberate, edit EXPECTED_SWITCH_CALLS in this script in the SAME commit so the contract change is visible in the diff.`);
        failures.forEach(f => console.error(`  - ${f}`));
        return 1;
    }
    console.log(`${NAME}: PASS -- ${EXPECTED_SWITCH_CALLS.length} allowlisted switch calls and ${EXPECTED_COMMAND_IDS.length} mode commands match the declared contract`);
    return 0;
}

function selfTest() {
    const clean = readSources();
    const baseline = checkInvariant(clean);
    if (baseline.length !== 0) {
        console.error(`${NAME} --self-test: FAIL -- the unmodified tree is already red, so the planted-fault results below would be meaningless:`);
        baseline.forEach(f => console.error(`  ${f}`));
        return 1;
    }

    const cleanService = clean[SERVICE_REL];
    const cleanCommands = clean[COMMANDS_REL];
    const cases = [
        {
            name: 'planted switch-path close call',
            mutate: sources => {
                const anchor = "        if (target === 'organising') {\n            openOrganisingSlot();";
                if (!cleanService.includes(anchor)) {
                    return sources;
                }
                return {
                    ...sources,
                    [SERVICE_REL]: cleanService.replace(
                        anchor,
                        "        if (target === 'organising') {\n            this.shell.closeWidget('planted');\n            openOrganisingSlot()"
                    ),
                };
            },
            expect: 'closeWidget',
        },
        {
            name: 'planted command-id removal',
            mutate: sources => ({
                ...sources,
                [COMMANDS_REL]: cleanCommands.replace(
                    "export const MODES_SAVE_AS_MODE_COMMAND_ID = 'powerbrowser.modes.save-as-mode';\n",
                    '// planted removal: save-as-mode id line deleted\n'
                ),
            }),
            expect: 'powerbrowser.modes.save-as-mode',
        },
        {
            name: 'planted label drift',
            mutate: sources => ({
                ...sources,
                [COMMANDS_REL]: cleanCommands.replace(
                    "    label: 'Save as Mode',",
                    "    label: 'Save Mode',"
                ),
            }),
            expect: 'Save as Mode',
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
        const failures = checkInvariant(mutated);
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
    console.log(`${NAME} --self-test: PASS -- all planted faults went red`);
    return 0;
}

process.exit(main());
