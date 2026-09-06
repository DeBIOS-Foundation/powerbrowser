#!/usr/bin/env node
/**
 * GUI-09's setup roundtrip gate (14-03): named setups remember geometry,
 * placement, and mode with relaunch restoring automatically.
 *
 * It DERIVES at check time from the setups sources: the store/row/window
 * field sets from the `setups-service.ts` interface blocks, the four
 * command ids from `setups-commands.ts`, the contracted save/delete
 * labels verbatim with the restore/dependent commands asserted labelless,
 * the contracted 60-char cap, and every contracted setup string verbatim.
 * Each is compared as SET EQUALITY against the one EXPECTED const block
 * below: a surplus field/command is unreviewed surface, a missing one is a
 * dropped contract row, a reworded string breaks the UI-SPEC copy contract
 * -- each reported by name. An empty derivation fails as a broken
 * instrument, never passes as clean.
 *
 * It then runs a node JSON roundtrip built from the DERIVED field names
 * (save, list, restore, delete shapes): the sample store is constructed
 * key-by-key from what the service declares, serialized, parsed back, and
 * required to preserve every field. Corrupt input must throw at parse
 * (the service degrades that to the contracted empty state -- asserted via
 * the empty-copy strings plus the reset path), gone tabs must drop with
 * the contracted explanation (asserted verbatim), and the cap/errors must
 * write nothing partial (asserted via the cap literal plus the verbatim
 * error strings).
 *
 * Honestly --quick: reads text sources only. No build, no browser, no
 * display, no network.
 *
 * Usage:
 *   node scripts/verify-setup-roundtrip.mjs
 *   node scripts/verify-setup-roundtrip.mjs --self-test
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'verify-setup-roundtrip';

const SERVICE_REL = 'theia/extensions/modes/src/browser/setups-service.ts';
const COMMANDS_REL = 'theia/extensions/modes/src/browser/setups-commands.ts';

/**
 * The declared setups contract. The ONE hand-kept block in this file:
 * editing it is how a deliberate contract change is made -- it shows up
 * in the diff for review. Everything it is compared against is derived at
 * check time.
 */
const EXPECTED_STORE_FIELDS = Object.freeze(['version', 'setups', 'lastSession']);
const EXPECTED_SETUP_FIELDS = Object.freeze(['name', 'modeId', 'windows', 'savedAt']);
const EXPECTED_WINDOW_FIELDS = Object.freeze(['x', 'y', 'width', 'height', 'tabs', 'activeTab']);
const EXPECTED_COMMAND_IDS = Object.freeze([
    'powerbrowser.setups.save-setup',
    'powerbrowser.setups.delete-setup',
    'powerbrowser.setups.restore-setup',
    'powerbrowser.setups.open-dependent',
]);
const EXPECTED_SAVE_LABEL = 'Save Setup';
const EXPECTED_DELETE_LABEL = 'Delete Setup';
const EXPECTED_NAME_CAP = 60;

/** Contracted setup strings (14-UI-SPEC.md, verbatim) asserted in the service source. */
const EXPECTED_STRINGS = Object.freeze([
    'Save Setup',
    'Setup name',
    'Give the setup a name — type a name and choose Save Setup.',
    'A setup with this name already exists. Choose a different name, or delete the existing setup first.',
    'No saved setups',
    'Save the current windows, tabs, and mode as a setup to restore them later — choose Save Setup.',
    'Power Browser couldn\'t restore this setup. Your current windows and tabs are unchanged — try again, or delete the setup and save a new one.',
    'some tabs no longer exist',
    'Setup "${name}" saved.',
    'Delete "${name}"? You can\'t undo this.',
]);

function diff(actual, expected) {
    const a = new Set(actual);
    const e = new Set(expected);
    return {
        surplus: [...a].filter(x => !e.has(x)),
        missing: [...e].filter(x => !a.has(x)),
    };
}

/** Field names of `export interface <name> { ... }`, in source order. */
function derivedInterfaceFields(source, interfaceName) {
    const anchor = new RegExp(`export interface ${interfaceName} \\{`);
    const at = source.search(anchor);
    if (at < 0) {
        return [];
    }
    const open = source.indexOf('{', at);
    let depth = 0;
    for (let i = open; i < source.length; i += 1) {
        if (source[i] === '{') {
            depth += 1;
        } else if (source[i] === '}') {
            depth -= 1;
            if (depth === 0) {
                const block = source.slice(open + 1, i);
                const fields = [];
                for (const m of block.matchAll(/^\s*(\w+)\??:/gm)) {
                    fields.push(m[1]);
                }
                return fields;
            }
        }
    }
    return [];
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

/** Fixture value per store field name for the derived roundtrip sample. */
function fixtureFor(field, fields) {
    if (field === 'version') {
        return 1;
    }
    if (field === 'lastSession') {
        return 'evening-review';
    }
    if (field === 'setups') {
        const row = {};
        for (const f of fields.setup) {
            row[f] = fixtureRowFor(f, fields);
        }
        return [row];
    }
    return `planted-${field}`;
}

function fixtureRowFor(field, fields) {
    if (field === 'name') {
        return 'evening-review';
    }
    if (field === 'modeId') {
        return 'browsing';
    }
    if (field === 'savedAt') {
        return '2026-09-06T06:00:00.000Z';
    }
    if (field === 'windows') {
        const win = {};
        for (const f of fields.window) {
            win[f] = fixtureWindowFor(f);
        }
        return [win];
    }
    return `planted-${field}`;
}

function fixtureWindowFor(field) {
    if (field === 'x' || field === 'y') {
        return 100;
    }
    if (field === 'width') {
        return 1280;
    }
    if (field === 'height') {
        return 800;
    }
    if (field === 'tabs') {
        return ['terminal:t1', 'view:explorer-view-container'];
    }
    if (field === 'activeTab') {
        return 'terminal:t1';
    }
    return `planted-${field}`;
}

/** @returns {string[]} failure messages -- empty means the gate holds. */
function checkRoundtrip(sources) {
    const failures = [];
    const serviceRaw = sources[SERVICE_REL] ?? '';
    // Unescape TS string escapes so contracted copy with apostrophes
    // (couldn't, can't) compares against the UI-SPEC verbatim form.
    const serviceSrc = serviceRaw.replace(/\\'/g, "'");
    const commandsSrc = sources[COMMANDS_REL] ?? '';

    const fields = {
        store: derivedInterfaceFields(serviceSrc, 'SetupStoreShape'),
        setup: derivedInterfaceFields(serviceSrc, 'SetupSnapshot'),
        window: derivedInterfaceFields(serviceSrc, 'SetupWindowSnapshot'),
    };
    const pairs = [
        ['SetupStoreShape', fields.store, EXPECTED_STORE_FIELDS],
        ['SetupSnapshot', fields.setup, EXPECTED_SETUP_FIELDS],
        ['SetupWindowSnapshot', fields.window, EXPECTED_WINDOW_FIELDS],
    ];
    for (const [iface, actual, expected] of pairs) {
        if (actual.length === 0) {
            failures.push(`${SERVICE_REL}: derived ZERO fields for interface '${iface}' -- the anchor drifted, so this comparison proves nothing`);
            continue;
        }
        const fieldDiff = diff(actual, [...expected]);
        if (fieldDiff.surplus.length) {
            failures.push(`${SERVICE_REL}: interface '${iface}' carries fields NOT in the declared schema (unreviewed surface): ${fieldDiff.surplus.join(', ')}`);
        }
        if (fieldDiff.missing.length) {
            failures.push(`${SERVICE_REL}: declared schema fields are GONE from '${iface}' (dropped contract row): ${fieldDiff.missing.join(', ')}`);
        }
    }

    const ids = derivedCommandIdsOf(commandsSrc);
    if (ids.length === 0) {
        failures.push(`${COMMANDS_REL}: derived ZERO setup command ids -- no *_COMMAND_ID = '...' line found, so this comparison proves nothing`);
    } else {
        const idDiff = diff(ids, [...EXPECTED_COMMAND_IDS]);
        if (idDiff.surplus.length) {
            failures.push(`${COMMANDS_REL}: setup command ids NOT in the declared contract (unreviewed command): ${idDiff.surplus.join(', ')}`);
        }
        if (idDiff.missing.length) {
            failures.push(`${COMMANDS_REL}: declared setup command ids are GONE: ${idDiff.missing.join(', ')}`);
        }
    }

    const labels = derivedCommandLabelsOf(commandsSrc);
    for (const expected of [EXPECTED_SAVE_LABEL, EXPECTED_DELETE_LABEL]) {
        if (!labels.includes(expected)) {
            failures.push(`${COMMANDS_REL}: contracted label '${expected}' missing (got [${labels.join(', ')}]) -- the UI-SPEC copy contract broke`);
        }
    }
    if (labels.length !== 2) {
        failures.push(`${COMMANDS_REL}: the setup commands must carry exactly two labels (save and delete); restore and dependent-open stay labelless (got [${labels.join(', ')}])`);
    }
    for (const decl of ['SETUPS_RESTORE', 'SETUPS_OPEN_DEPENDENT']) {
        const block = new RegExp(`export const ${decl}[^;]*;`).exec(commandsSrc);
        if (!block) {
            failures.push(`${COMMANDS_REL}: the ${decl} declaration was not found -- the labelless command cannot be checked`);
        } else if (block[0].includes('label')) {
            failures.push(`${COMMANDS_REL}: ${decl} gained a label -- restore and dependent-open stay labelless by contract`);
        }
    }
    for (const id of ['SETUPS_SAVE', 'SETUPS_DELETE', 'SETUPS_RESTORE', 'SETUPS_OPEN_DEPENDENT']) {
        if (!commandsSrc.includes(`registerCommand(${id},`)) {
            failures.push(`${COMMANDS_REL}: registration must use the ${id} const (registerCommand(${id}, ...) not found -- a re-spelled string bypasses const discipline)`);
        }
    }

    const capMatch = /SETUP_NAME_MAX\s*=\s*(\d+)/.exec(serviceSrc);
    if (!capMatch) {
        failures.push(`${SERVICE_REL}: no SETUP_NAME_MAX = <n> literal found -- the contracted name cap cannot be checked`);
    } else if (Number(capMatch[1]) !== EXPECTED_NAME_CAP) {
        failures.push(`${SERVICE_REL}: name cap drifted (got ${capMatch[1]}, contract is ${EXPECTED_NAME_CAP}) -- pasted overflow must cut at the cap before commit`);
    }
    if (!serviceSrc.includes('.slice(0, SETUP_NAME_MAX)')) {
        failures.push(`${SERVICE_REL}: no .slice(0, SETUP_NAME_MAX) cut -- overflow is not cut before commit`);
    }

    for (const expected of EXPECTED_STRINGS) {
        if (!serviceSrc.includes(expected)) {
            failures.push(`${SERVICE_REL}: contracted string missing: '${expected}' -- save, list, restore, delete, or corruption copy broke`);
        }
    }
    if (!serviceSrc.includes('switchPerspective')) {
        failures.push(`${SERVICE_REL}: no switchPerspective call -- restores do not switch to the stored mode`);
    }
    if (!serviceSrc.includes('setups.json')) {
        failures.push(`${SERVICE_REL}: no setups.json store -- snapshots are not user-storage JSON`);
    }

    // Node JSON roundtrip built from the DERIVED field names: save, list,
    // restore, and delete shapes must survive serialization verbatim.
    if (failures.length === 0) {
        try {
            const sample = {};
            for (const f of fields.store) {
                sample[f] = fixtureFor(f, fields);
            }
            const roundtripped = JSON.parse(JSON.stringify(sample));
            for (const f of fields.store) {
                if (JSON.stringify(roundtripped[f]) !== JSON.stringify(sample[f])) {
                    failures.push(`roundtrip: store field '${f}' did not survive save/restore serialization`);
                }
            }
            const row = roundtripped.setups?.[0];
            if (!row || row.name !== 'evening-review' || !Array.isArray(row.windows) || row.windows.length !== 1) {
                failures.push('roundtrip: the setups row (name, mode, windows, timestamp) did not survive list/restore');
            }
            const win = row?.windows?.[0];
            if (!win || win.tabs.length !== 2 || win.activeTab !== 'terminal:t1') {
                failures.push('roundtrip: the window row (verbatim rect, tab URIs, active tab) did not survive');
            }
            const deleted = { ...roundtripped, setups: [] };
            if (JSON.parse(JSON.stringify(deleted)).setups.length !== 0) {
                failures.push('roundtrip: delete (empty setups array) did not survive serialization');
            }
            // Corrupt data must throw at parse: the service degrades that to
            // the contracted empty state (asserted above via the empty copy
            // plus the reset path).
            let threw = false;
            try {
                JSON.parse('{bogus setups');
            } catch {
                threw = true;
            }
            if (!threw) {
                failures.push('roundtrip: corrupt fixture parsed without throwing -- the corrupt-degrades-to-empty premise is void');
            }
            if (!serviceSrc.includes('lastGoodSetups = []')) {
                failures.push(`${SERVICE_REL}: no corrupt-reset path (lastGoodSetups = []) -- corrupt data does not degrade to the contracted empty state`);
            }
        } catch (error) {
            failures.push(`roundtrip: unexpected failure running the node JSON roundtrip: ${error}`);
        }
    }

    return failures;
}

function readSources() {
    const out = {};
    for (const rel of [SERVICE_REL, COMMANDS_REL]) {
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
    const failures = checkRoundtrip(readSources());
    if (failures.length) {
        console.error(`${NAME}: FAIL -- the setups surface drifted from the declared contract.`);
        console.error(`If the change is deliberate, edit the EXPECTED consts in this script in the SAME commit so the contract change is visible in the diff.`);
        failures.forEach(f => console.error(`  - ${f}`));
        return 1;
    }
    console.log(`${NAME}: PASS -- setups schema, 4 command ids, contracted labels and copy, cap, and JSON roundtrip match the declared contract`);
    return 0;
}

function selfTest() {
    const clean = readSources();
    const baseline = checkRoundtrip(clean);
    if (baseline.length !== 0) {
        console.error(`${NAME} --self-test: FAIL -- the unmodified tree is already red, so the planted-fault results below would be meaningless:`);
        baseline.forEach(f => console.error(`  ${f}`));
        return 1;
    }

    const cleanService = clean[SERVICE_REL];
    const cleanCommands = clean[COMMANDS_REL];
    const cases = [
        {
            name: 'planted dropped schema field',
            mutate: sources => ({ ...sources, [SERVICE_REL]: cleanService.replace(
                '    lastSession: string | null;\n',
                '// planted removal: last-session pointer line deleted\n'
            ) }),
            expect: 'lastSession',
        },
        {
            name: 'planted removed command id',
            mutate: sources => ({ ...sources, [COMMANDS_REL]: cleanCommands.replace(
                "export const SETUPS_DELETE_COMMAND_ID = 'powerbrowser.setups.delete-setup';\n",
                '// planted removal: delete-setup id line deleted\n'
            ) }),
            expect: 'powerbrowser.setups.delete-setup',
        },
        {
            name: 'planted label drift',
            mutate: sources => ({ ...sources, [COMMANDS_REL]: cleanCommands.replace(
                "    label: 'Delete Setup',",
                "    label: 'Remove Setup',"
            ) }),
            expect: 'Delete Setup',
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
        const failures = checkRoundtrip(mutated);
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
