#!/usr/bin/env node
// modes-name-cap-at-input (--quick: text reads only, Node standard library).
//
// G-23 / MODE-02: the Save as Mode and Save Setup name fields are cut at the
// contracted cap while typing, through inputCappedName, and 14-UI-SPEC says so.
// Everything compared is derived at check time:
//   - MODE_NAME_MAX, SETUP_NAME_MAX and GROUP_TITLE_MAX_CHARS from source;
//   - every cap number in the named-setups Save bullet, the custom-modes bullet
//     and the E2 long-text row of 14-UI-SPEC, each of which must say
//     "while typing";
//   - the bodies of saveCurrentAsMode and saveCurrentAsSetup (brace matched),
//     which must call inputCappedName(this.quickInput, {...}, OWN_CONSTANT) and
//     keep the .trim().slice(0, OWN_CONSTANT) backstop;
//   - the helper's exported function, its max parameter and body, which must
//     use createInputBox, onDidChangeValue and .slice(0, max);
//   - every .input( call on a quick-input service across the modes sources,
//     which must be none: a name prompt there goes through inputCappedName.
// A derivation that finds nothing is a broken instrument, not a clean tree.
// The live half is modes-name-cap-at-input-live.
//
//   node scripts/verify-name-cap-at-input.mjs
//   node scripts/verify-name-cap-at-input.mjs --self-test
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const NAME = 'modes-name-cap-at-input';
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MODES_SRC = 'theia/extensions/modes/src';
const MODE_REL = `${MODES_SRC}/browser/mode-service.ts`;
const SETUP_REL = `${MODES_SRC}/browser/setups-service.ts`;
const GROUP_REL = `${MODES_SRC}/browser/group-model.ts`;
const HELPER_REL = `${MODES_SRC}/browser/capped-name-input.ts`;
const SPEC_REL = '.planning/milestones/v1.3-phases/14-modes-windows-setups/14-UI-SPEC.md';

/** Source with comments blanked, line structure kept. */
function code(src) {
    return src
        .replace(/\/\*[\s\S]*?\*\//g, c => c.replace(/[^\n]/g, ''))
        .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/** The brace-matched body that follows the first match of `anchor`, or null. */
function bodyAfter(src, anchor) {
    const m = anchor.exec(src);
    if (!m) {
        return null;
    }
    const open = src.indexOf('{', m.index + m[0].length);
    if (open < 0) {
        return null;
    }
    let depth = 0;
    for (let i = open; i < src.length; i += 1) {
        if (src[i] === '{') depth += 1;
        if (src[i] === '}' && (depth -= 1) === 0) return src.slice(open + 1, i);
    }
    return null;
}

function readSources() {
    const files = readdirSync(join(REPO_ROOT, MODES_SRC), { recursive: true })
        .map(name => `${MODES_SRC}/${name}`)
        .filter(rel => /\.tsx?$/.test(rel));
    const sources = {};
    for (const rel of [...files, SPEC_REL]) {
        sources[rel] = readFileSync(join(REPO_ROOT, rel), 'utf8');
    }
    return sources;
}

function capOf(src, constant) {
    const m = src === undefined ? null : new RegExp(`\\bexport const ${constant}\\s*=\\s*(\\d+)\\b`).exec(code(src));
    return m ? Number(m[1]) : null;
}

/** The three spec rule lines: [label, text] with text null when the anchor is gone. */
function specRules(spec) {
    const lines = spec.split('\n');
    const setupsAt = lines.findIndex(line => /^### Named setups\b/.test(line));
    const saveBullet = setupsAt < 0 ? null : lines.slice(setupsAt).find(line => line.startsWith('- **Save:**')) ?? null;
    const customAt = lines.findIndex(line => /^- Custom modes save\b/.test(line));
    let customBullet = null;
    if (customAt >= 0) {
        const end = lines.findIndex((line, i) => i > customAt && !/^ {2}\S/.test(line));
        customBullet = lines.slice(customAt, end < 0 ? lines.length : end).join(' ');
    }
    const e2Row = lines.find(line => line.startsWith('| long-text | E2 name input |')) ?? null;
    return [['the named-setups Save bullet', saveBullet], ['the custom-modes bullet', customBullet], ['the E2 long-text row', e2Row]];
}

function check(sources) {
    const failures = [];
    const caps = [['MODE_NAME_MAX', MODE_REL], ['SETUP_NAME_MAX', SETUP_REL], ['GROUP_TITLE_MAX_CHARS', GROUP_REL]]
        .map(([constant, rel]) => {
            const value = capOf(sources[rel], constant);
            if (value === null) {
                failures.push(`derived ZERO: ${rel} declares no ${constant}, so the cap cannot be derived (broken instrument, not a clean tree)`);
            }
            return [constant, value];
        });
    const values = [];
    for (const [constant, value] of caps) {
        if (value !== null) values.push([constant, value]);
    }
    for (const [label, text] of specRules(sources[SPEC_REL] ?? '')) {
        if (text === null) {
            failures.push(`derived ZERO: ${SPEC_REL} has no ${label} (missing anchor), so the contract cannot be read`);
            continue;
        }
        // Every cap number on the line, so a line that states the cap twice cannot contradict itself unseen.
        const nums = [...text.matchAll(/\b(?:at most|more than|capped at|first)\s+(\d+)\b/g)].map(m => Number(m[1]));
        if (!nums.length) {
            failures.push(`${label} in ${SPEC_REL} names no cap ("at most N", "more than N", "capped at N" or "first N")`);
        }
        nums.forEach((n, k) => values.push([`${label} #${k + 1}`, n]));
        if (!text.includes('while typing')) {
            failures.push(`${label} in ${SPEC_REL} does not say "while typing", so the contract no longer states the cut-while-typing rule`);
        }
    }
    if (new Set(values.map(([, v]) => v)).size > 1) {
        failures.push(`the caps disagree: ${values.map(([k, v]) => `${k} = ${v}`).join(', ')}`);
    }

    for (const [method, rel, own, other] of [
        ['saveCurrentAsMode', MODE_REL, 'MODE_NAME_MAX', 'SETUP_NAME_MAX'],
        ['saveCurrentAsSetup', SETUP_REL, 'SETUP_NAME_MAX', 'MODE_NAME_MAX'],
    ]) {
        const body = sources[rel] === undefined ? null : bodyAfter(code(sources[rel]), new RegExp(`\\basync\\s+${method}\\s*\\(\\s*\\)[^{]*`));
        if (body === null) {
            failures.push(`derived ZERO: ${rel} has no ${method} body (missing anchor), so its name prompt cannot be checked`);
            continue;
        }
        const call = /\binputCappedName\(this\.quickInput,\s*\{[^}]*\},\s*([^)\s]+)\s*\)/.exec(body);
        if (!call) {
            failures.push(`${method} does not call inputCappedName(this.quickInput, { prompt, placeHolder }, ${own}); its name field is not cut while typing`);
        } else if (call[1] === other) {
            failures.push(`${method} passes the other constant ${other} to inputCappedName, not ${own}`);
        } else if (/^\d+$/.test(call[1])) {
            failures.push(`${method} passes the literal ${call[1]} to inputCappedName, not ${own}`);
        } else if (call[1] !== own) {
            failures.push(`${method} passes ${call[1]} to inputCappedName, not ${own}`);
        }
        if (!body.includes(`.trim().slice(0, ${own})`)) {
            failures.push(`${method} lost its commit-time .trim().slice(0, ${own}) backstop`);
        }
    }

    const helper = sources[HELPER_REL] === undefined ? null : code(sources[HELPER_REL]);
    const signature = helper === null ? null : /\bexport function inputCappedName\s*\(([^)]*)\)[^{]*/.exec(helper);
    const maxParam = signature ? /(\w+)\s*:\s*number\b/.exec(signature[1]) : null;
    const helperBody = signature ? bodyAfter(helper, /\bexport function inputCappedName\s*\([^)]*\)[^{]*/) : null;
    if (!maxParam || helperBody === null) {
        failures.push(`derived ZERO: ${HELPER_REL} exports no inputCappedName(…, max: number) with a body (missing anchor)`);
    } else {
        for (const needle of ['createInputBox', 'onDidChangeValue', `.slice(0, ${maxParam[1]})`]) {
            if (!helperBody.includes(needle)) {
                failures.push(`the helper inputCappedName lacks ${needle}, so it does not cut the stock input box at its ${maxParam[1]} parameter while typing`);
            }
        }
    }

    const tsFiles = Object.keys(sources).filter(rel => rel.startsWith(`${MODES_SRC}/`));
    if (tsFiles.length === 0) {
        failures.push(`derived ZERO: no .ts source under ${MODES_SRC} (broken instrument, not a clean tree)`);
    }
    const rawInputs = [];
    for (const rel of tsFiles) {
        code(sources[rel]).split('\n').forEach((line, i) => {
            if (/\bquick\w*\s*\.\s*input\s*\(/i.test(line)) rawInputs.push(`${rel.split('/').pop()}:${i + 1}`);
        });
    }
    if (rawInputs.length) {
        failures.push(`a quick-input .input( call remains in the modes sources (${rawInputs.join(', ')}); route a name prompt through inputCappedName, or extend this check with a reason`);
    }
    return failures;
}

function main() {
    const failures = check(readSources());
    if (failures.length) {
        failures.forEach(f => console.error(`${NAME}: FAIL -- ${f}`));
        process.exit(1);
    }
    console.log(`${NAME}: PASS -- MODE_NAME_MAX, SETUP_NAME_MAX, GROUP_TITLE_MAX_CHARS and the three 14-UI-SPEC rule lines are one cap; both saves route through inputCappedName with their own constant and keep the commit backstop; no raw quick-input .input( call remains`);
}

function selfTest() {
    const real = readSources();
    const baseline = check(real);
    if (baseline.length) {
        console.error(`${NAME} --self-test: FAIL -- the unmodified tree is already red:`);
        baseline.forEach(f => console.error(`  ${f}`));
        process.exit(1);
    }
    let failed = 0;
    const plant = (label, rel, from, to, pattern) => {
        const src = real[rel];
        if (src === undefined || !src.includes(from)) {
            console.error(`${NAME} --self-test: FAIL -- '${label}' plant did not land`);
            failed += 1;
            return;
        }
        const result = check({ ...real, [rel]: src.replace(from, to) });
        if (!result.some(f => pattern.test(f))) {
            console.error(`${NAME} --self-test: FAIL -- '${label}' did not go red naming ${pattern}; got: ${result.join(' | ') || '(no failures)'}`);
            failed += 1;
            return;
        }
        console.log(`  ok  ${label} -> red, naming ${pattern}`);
    };
    const OTHER = `${MODES_SRC}/browser/group-model.ts`;
    plant('1 mode save back on quickInput.input(', MODE_REL,
        'inputCappedName(this.quickInput, { prompt: \'Save as Mode\', placeHolder: \'Mode name\' }, MODE_NAME_MAX)',
        'this.quickInput.input({ prompt: \'Save as Mode\', placeHolder: \'Mode name\' })', /saveCurrentAsMode does not call inputCappedName/);
    plant('2 a 60 literal at the setup call', SETUP_REL, 'SETUP_NAME_PLACEHOLDER }, SETUP_NAME_MAX)', 'SETUP_NAME_PLACEHOLDER }, 60)',
        /saveCurrentAsSetup passes the literal 60/);
    plant('3 MODE_NAME_MAX passed in setups', SETUP_REL, 'SETUP_NAME_PLACEHOLDER }, SETUP_NAME_MAX)', 'SETUP_NAME_PLACEHOLDER }, MODE_NAME_MAX)',
        /saveCurrentAsSetup passes the other constant MODE_NAME_MAX/);
    plant('4 the helper slice removed', HELPER_REL, 'value.slice(0, max)', 'value', /helper inputCappedName lacks \.slice\(0, max\)/);
    plant('5 MODE_NAME_MAX = 61', MODE_REL, 'export const MODE_NAME_MAX = 60', 'export const MODE_NAME_MAX = 61', /caps disagree: MODE_NAME_MAX = 61/);
    plant('6 the E2 row cap set to 80', SPEC_REL, '| long-text | E2 name input | ✅ covered | Input holds at most 60 characters',
        '| long-text | E2 name input | ✅ covered | Input holds at most 80 characters', /caps disagree: .*the E2 long-text row #1 = 80/);
    plant('7 "while typing" removed from the Save bullet', SPEC_REL, 'capped at 60 characters while typing;', 'capped at 60 characters;',
        /named-setups Save bullet .* does not say "while typing"/);
    plant('8 saveCurrentAsMode renamed', MODE_REL, 'async saveCurrentAsMode(', 'async saveCurrentAsModeRenamed(',
        /derived ZERO: .* no saveCurrentAsMode body \(missing anchor\)/);
    plant('9 an extra quickInput.input( in another modes file', OTHER, 'export const GROUP_TITLE_MAX_CHARS',
        'void this.quickInput.input({});\nexport const GROUP_TITLE_MAX_CHARS', /quick-input \.input\( call remains .*group-model\.ts/);
    plant('10 only the second cap on the custom-modes bullet set to 80', SPEC_REL, 'it keeps the first 60 characters of the result', 'it keeps the first 80 characters of the result',
        /caps disagree: .*the custom-modes bullet #2 = 80/);
    if (failed) {
        console.error(`${NAME} --self-test: FAIL -- ${failed} plant(s) misbehaved`);
        process.exit(1);
    }
    console.log(`${NAME} --self-test: PASS -- baseline green and all ten plants went red naming their drift`);
}

if (process.argv.includes('--self-test')) {
    selfTest();
} else {
    main();
}
