#!/usr/bin/env node
/**
 * NG-040 (--quick): every line reference in powerbrowser/INTERNAL-APIS.md
 * matches the file it names, in both directions:
 *   1. every forbidden-pattern occurrence in the boundary files has a row --
 *      the pattern rule is written once, in scripts/check-internals-boundary.sh,
 *      and this runs its --catalogue mode rather than re-spelling it;
 *   2. every Touchpoints row's `<file>:<line>` points at a non-comment line
 *      carrying one of the row's backticked internals and, when the Method
 *      cell names a method of that file, inside that method.
 * Direction 2 is what the catalogue gate lacked: a row left behind by an edit
 * above it still satisfied direction 1 whenever another row happened to name
 * that number (2026-09-25 audit: catalogue 2312, 2562, 2563; file 2313, 2563,
 * 2564).
 *
 * --fix rewrites each stale reference to the nearest line that satisfies (2)
 * and that no other row claims for the same internal, stale rows taken top to
 * bottom; it never writes a row, so a new touchpoint still needs one by hand.
 * Any merge that edits PowerBrowserAPI.sys.mjs runs it.
 * --self-test plants a shift and a wrong-method row on scratch fixtures,
 * requires both red, and requires --fix to repair the shift. Text only: --quick.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'ng-040-internals-catalogue-lines';
const METHOD_RE = /^ {2}(?:async )?([A-Za-z_$][\w$]*)\s*\(.*\)\s*\{\s*$/;
const COMMENT_RE = /^\s*(\/\/|\*|\/\*)/;

function parseRows(md) {
    const lines = md.split('\n');
    const start = lines.findIndex(line => line.startsWith('## Touchpoints'));
    const rows = [];
    if (start < 0) {
        return rows;
    }
    for (let i = start + 1; i < lines.length && !lines[i].startsWith('## '); i += 1) {
        if (!lines[i].startsWith('|')) {
            continue;
        }
        const cells = lines[i].split('|').map(cell => cell.trim());
        if (cells.length < 5 || cells[1] === 'Internal' || /^-+$/.test(cells[1])) {
            continue;
        }
        rows.push({
            mdIndex: i,
            tokens: [...cells[1].matchAll(/`([^`]+)`/g)].map(m => m[1]),
            refs: [...cells[2].matchAll(/([A-Za-z][\w-]*\.sys\.mjs):(\d+)/g)].map(m => ({ file: m[1], line: Number(m[2]) })),
            method: /^`([A-Za-z_$][\w$]*)`/.exec(cells[3])?.[1] ?? null,
        });
    }
    return rows;
}

function enclosingMethod(lines, index) {
    for (let i = index; i >= 0; i -= 1) {
        const m = METHOD_RE.exec(lines[i]);
        if (m) {
            return m[1];
        }
    }
    return null;
}

/** The row's internals that line `index` carries, honouring the row's method; empty when none. */
function lineHolds(lines, index, row) {
    const text = lines[index];
    if (text === undefined || COMMENT_RE.test(text)) {
        return [];
    }
    const held = row.tokens.filter(token => text.includes(token));
    if (held.length === 0) {
        return [];
    }
    const methodInFile = row.method && lines.some(line => METHOD_RE.exec(line)?.[1] === row.method);
    if (methodInFile && enclosingMethod(lines, index) !== row.method) {
        return [];
    }
    return held;
}

function sourceReader(shellDir) {
    const cache = new Map();
    return file => {
        if (!cache.has(file)) {
            try {
                cache.set(file, readFileSync(join(shellDir, file), 'utf8').split('\n'));
            } catch {
                cache.set(file, null);
            }
        }
        return cache.get(file);
    };
}

function findStale(md, readSource) {
    const stale = [];
    for (const row of parseRows(md)) {
        for (const ref of row.refs) {
            const lines = readSource(ref.file);
            if (!lines) {
                stale.push(`${ref.file}:${ref.line}: ${ref.file} does not exist under powerbrowser/shell`);
                continue;
            }
            if (lineHolds(lines, ref.line - 1, row).length === 0) {
                const text = (lines[ref.line - 1] ?? '(past the end of the file)').trim().slice(0, 120);
                stale.push(`${ref.file}:${ref.line} is named for [${row.tokens.join(', ')}]${row.method ? ` in ${row.method}` : ''} but reads: ${text}`);
            }
        }
    }
    return stale;
}

function fix(md, readSource) {
    const mdLines = md.split('\n');
    const claimed = new Set();
    const key = (file, line, token) => `${file}:${line}:${token}`;
    const staleRefs = [];
    for (const row of parseRows(md)) {
        for (const ref of row.refs) {
            const lines = readSource(ref.file);
            if (!lines) {
                continue;
            }
            const held = lineHolds(lines, ref.line - 1, row);
            if (held.length) {
                held.forEach(token => claimed.add(key(ref.file, ref.line, token)));
            } else {
                staleRefs.push({ row, ref, lines });
            }
        }
    }
    staleRefs.sort((a, b) => a.ref.line - b.ref.line);
    const changes = [];
    const unresolved = [];
    for (const { row, ref, lines } of staleRefs) {
        let best = null;
        let tie = false;
        for (let i = 0; i < lines.length; i += 1) {
            const free = lineHolds(lines, i, row).filter(token => !claimed.has(key(ref.file, i + 1, token)));
            if (free.length === 0) {
                continue;
            }
            const distance = Math.abs(i + 1 - ref.line);
            if (best === null || distance < best.distance) {
                best = { line: i + 1, token: free[0], distance };
                tie = false;
            } else if (distance === best.distance) {
                tie = true;
            }
        }
        if (!best || tie) {
            unresolved.push(`${ref.file}:${ref.line} [${row.tokens.join(', ')}]${row.method ? ` in ${row.method}` : ''}: ${best ? 'two lines are equally near' : 'no line carries it'}`);
            continue;
        }
        claimed.add(key(ref.file, best.line, best.token));
        const parts = mdLines[row.mdIndex].split('|');
        parts[2] = parts[2].replace(new RegExp(`${ref.file.replace(/\./g, '\\.')}:${ref.line}(?!\\d)`), `${ref.file}:${best.line}`);
        mdLines[row.mdIndex] = parts.join('|');
        changes.push(`${ref.file}:${ref.line} -> ${best.line}`);
    }
    return { md: mdLines.join('\n'), changes, unresolved };
}

function runBoundaryCatalogue() {
    const result = spawnSync('bash', [join(REPO_ROOT, 'scripts/check-internals-boundary.sh'), '--catalogue'], { encoding: 'utf8' });
    return result.status === 0 ? [] : [(result.stderr || result.stdout || 'check-internals-boundary.sh --catalogue failed').trim()];
}

function check({ catalogue, shellDir, boundary }) {
    const md = readFileSync(catalogue, 'utf8');
    const failures = boundary ? runBoundaryCatalogue() : [];
    if (parseRows(md).length === 0) {
        failures.push(`${catalogue}: parsed ZERO Touchpoints rows; the table moved, so this proves nothing`);
    }
    for (const reason of findStale(md, sourceReader(shellDir))) {
        failures.push(`stale row: ${reason}`);
    }
    return failures;
}

const FIXTURE_SOURCE = [
    'export const API = Object.freeze({',
    '  alpha() {',
    '    return Services.prefs.getBoolPref("a", false);',
    '  },',
    '  beta() {',
    '    return Services.io.newURI("http://127.0.0.1/");',
    '  },',
    '});',
    '',
].join('\n');

function fixtureCatalogue(alphaLine, betaLine, alphaMethod = 'alpha') {
    return [
        '# Fixture', '', '## Touchpoints', '',
        '| Internal | File:Line | Method | Purpose | Threat Notes |',
        '|---|---|---|---|---|',
        `| \`Services.prefs.getBoolPref\` | \`Fixture.sys.mjs:${alphaLine}\` | \`${alphaMethod}\` | reads a pref | none |`,
        `| \`Services.io.newURI\` | \`Fixture.sys.mjs:${betaLine}\` | \`beta\` | parses a URI | none |`,
        '', '## Consistency', '',
    ].join('\n');
}

function selfTest() {
    const dir = mkdtempSync(join(tmpdir(), 'ng040-'));
    try {
        writeFileSync(join(dir, 'Fixture.sys.mjs'), FIXTURE_SOURCE);
        const cases = [
            { name: 'clean control', catalogue: fixtureCatalogue(3, 6), red: false },
            { name: 'planted shift (both rows one line late)', catalogue: fixtureCatalogue(4, 7), red: true, expect: 'Fixture.sys.mjs:4', fixTo: fixtureCatalogue(3, 6) },
            { name: 'planted wrong method', catalogue: fixtureCatalogue(3, 6, 'beta'), red: true, expect: 'in beta' },
        ];
        let failed = 0;
        for (const testCase of cases) {
            const path = join(dir, 'CATALOGUE.md');
            writeFileSync(path, testCase.catalogue);
            const failures = check({ catalogue: path, shellDir: dir, boundary: false });
            const wentRed = failures.length > 0;
            if (wentRed !== testCase.red || (testCase.expect && !failures.some(reason => reason.includes(testCase.expect)))) {
                console.error(`${NAME} --self-test: FAIL -- '${testCase.name}' expected ${testCase.red ? `red naming '${testCase.expect}'` : 'green'}, got: ${failures.join(' | ') || '(green)'}`);
                failed += 1;
                continue;
            }
            if (testCase.fixTo) {
                const repaired = fix(testCase.catalogue, sourceReader(dir));
                if (repaired.md !== testCase.fixTo) {
                    console.error(`${NAME} --self-test: FAIL -- --fix did not restore '${testCase.name}' (changes: ${repaired.changes.join(', ') || 'none'}; unresolved: ${repaired.unresolved.join(', ') || 'none'})`);
                    failed += 1;
                    continue;
                }
            }
            console.log(`  ok  ${testCase.name}`);
        }
        if (failed) {
            return 1;
        }
        console.log(`${NAME} --self-test: PASS -- the clean control is green, both plants went red, and --fix repaired the shift`);
        return 0;
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}

const args = process.argv.slice(2);
if (args.includes('--self-test')) {
    process.exit(selfTest());
}
const CATALOGUE = join(REPO_ROOT, 'powerbrowser/INTERNAL-APIS.md');
const SHELL_DIR = join(REPO_ROOT, 'powerbrowser/shell');
if (args.includes('--fix')) {
    const { md, changes, unresolved } = fix(readFileSync(CATALOGUE, 'utf8'), sourceReader(SHELL_DIR));
    writeFileSync(CATALOGUE, md);
    for (const change of changes) {
        console.log(`${NAME} --fix: ${change}`);
    }
    for (const line of unresolved) {
        console.error(`${NAME} --fix: UNRESOLVED ${line}`);
    }
    process.exit(unresolved.length ? 1 : 0);
}
const failures = check({ catalogue: CATALOGUE, shellDir: SHELL_DIR, boundary: true });
if (failures.length) {
    for (const reason of failures) {
        console.error(`${NAME}: FAIL -- ${reason}`);
    }
    process.exit(1);
}
console.log(`${NAME}: PASS -- every INTERNAL-APIS.md line reference points at the internal it names, and every occurrence has a row`);
