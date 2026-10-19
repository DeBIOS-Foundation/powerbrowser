#!/usr/bin/env node
// scripts/verify-ng-089-uat-sheets.mjs -- NG-089 (Phase 24, UAT-01): the UAT sheets named in
// NG-089's own row text have no pending result, and each records a React 19 runtime result.
// The sheet list is parsed from the numbers after the words "UAT sheets" in the row text, never
// typed here. Each key resolves to exactly one tracked <key>-UAT.md under an archived
// milestone's v*-phases/<key>-*/ directory. Results are read as the GSD UAT predicate reads them:
// frontmatter, HTML comments, fenced code and blockquote lines are stripped first, then each
// `### N. Name` block's first column-0 `result:` line is its result.
// Exit 1 names every fault; exit 2 means the instrument broke (row missing, text unparsable,
// git or JSON failure). --self-test plants every fault in memory.
// Tier: the main run is full only -- it is red until Chris has run every sheet live; the
// self-test is quick. This file never spells a concrete planning path: the planning-paths row
// scans it, so every path is assembled from pieces at runtime.
import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'ng089-uat-sheets';
const ROW_ID = 'NG-089';
const MILESTONES = ['.planning', 'milestones'].join('/');

class InstrumentError extends Error {}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The sheet keys after "UAT sheets", up to the first word that is not a number, comma or "and". */
export function sheetList(rowText) {
    const at = String(rowText ?? '').search(/\bUAT sheets\b/);
    if (at === -1) throw new InstrumentError('row text has no "UAT sheets" list');
    const keys = [];
    for (const word of rowText.slice(at + 'UAT sheets'.length).trim().split(/\s+/)) {
        const w = word.replace(/,+$/, '');
        if (w === '' || w === 'and') continue;
        if (!/^\d+(?:\.\d+)*$/.test(w)) break;
        keys.push(w);
    }
    if (keys.length < 1) throw new InstrumentError('row text lists no sheet numbers after "UAT sheets"');
    return keys;
}

/** { path } for exactly one tracked match, else { problem }. */
export function resolveSheet(key, tracked) {
    const re = new RegExp(`^${esc(MILESTONES)}/v[^/]+-phases/${esc(key)}-[^/]+/${esc(key)}-UAT\\.md$`);
    const hits = tracked.filter((p) => re.test(p));
    if (hits.length === 0) return { problem: `sheet ${key}: no tracked UAT file` };
    if (hits.length > 1) return { problem: `sheet ${key}: ${hits.length} tracked UAT files` };
    return { path: hits[0] };
}

function strip(text) {
    let lines = text.replace(/^﻿/, '').split(/\r?\n/);
    if (lines[0] === '---') {
        const close = lines.indexOf('---', 1);
        if (close !== -1) lines = lines.slice(close + 1);
    }
    // An unterminated comment swallows to the end, as in the predicate (fail closed).
    lines = lines.join('\n').replace(/<!--[\s\S]*?(?:-->|$)/g, '').split('\n');
    const kept = [];
    let fence = null;
    for (const line of lines) {
        const m = /^( {0,3})(`{3,}|~{3,})(.*)$/.exec(line);
        if (m) {
            if (fence === null) {
                if (m[2][0] === '`' && m[3].includes('`')) { kept.push(line); continue; }
                fence = { ch: m[2][0], len: m[2].length };
            } else if (m[2][0] === fence.ch && m[2].length >= fence.len && /^\s*$/.test(m[3])) {
                fence = null;
            }
            continue;
        }
        if (fence === null && !/^\s*>/.test(line)) kept.push(line);
    }
    return kept;
}

function unrecorded(value) {
    if (value === null) return 'no result line';
    const v = (/^\[?([\w-]*)/.exec(value.trim())[1] || '').toLowerCase();
    if (v === '') return 'empty result';
    if (v === 'pending') return 'result pending';
    return null;
}

/** Every fault on one sheet's text. */
export function sheetProblems(text) {
    const lines = strip(text);
    const tests = [];
    for (const line of lines) {
        const h = /^###\s*(\d+)\.\s*(.+)$/.exec(line);
        if (h) { tests.push({ n: h[1], name: h[2].trim(), result: null }); continue; }
        const r = /^result:[ \t]*(.*)$/.exec(line);
        const t = tests[tests.length - 1];
        if (r && t && t.result === null) t.result = r[1];
    }
    const problems = [];
    for (const t of tests) {
        const why = unrecorded(t.result);
        if (why) problems.push(`test ${t.n}: ${why}`);
    }
    if (!tests.some((t) => t.name.includes('React 19') && unrecorded(t.result) === null)) {
        problems.push('no recorded React 19 runtime test');
    }
    return problems;
}

/** { sheets, problems } across every sheet the row lists. read(path) returns the text. */
export function verdict(rowText, tracked, read) {
    const keys = sheetList(rowText);
    const problems = [];
    for (const key of keys) {
        const { path, problem } = resolveSheet(key, tracked);
        if (problem) { problems.push(problem); continue; }
        for (const p of sheetProblems(read(path))) problems.push(`${path}: ${p}`);
    }
    return { sheets: keys.length, problems };
}

function selfTest() {
    const dir = (v, key, slug) => [MILESTONES, `${v}-phases`, `${key}-${slug}`, `${key}-UAT.md`].join('/');
    const row = 'UAT sheets 10, 13, 14, 14.1, 14.1.1 and 15 have no pending result, and each records a React 19 runtime result (UAT-01).';
    const good = [
        '---', 'status: complete', 'result: pending', '---', '',
        '## Tests', '', '### 1. Opens', 'expected: it opens', 'result: pass', '',
        '### 2. React 19 runtime', 'result: issue', 'reported: "slow"', '',
    ].join('\n');
    const base = {
        [dir('v1.2', '10', 'sign-off')]: good,
        [dir('v1.3', '13', 'spike')]: good,
        [dir('v1.3', '14', 'modes')]: good,
        [dir('v1.3', '14.1', 'tabs')]: good,
        [dir('v1.3', '14.1.1', 'sweep')]: good,
        [dir('v1.4', '15', 'panorama')]: good,
    };
    const run = (files, text = row) => verdict(text, Object.keys(files), (p) => files[p]);
    const with14 = (body) => ({ ...base, [dir('v1.3', '14', 'modes')]: body });
    const rest = '\n### 2. React 19 runtime\nresult: pass\n';
    const plants = [
        ['sheet missing', () => { const f = { ...base }; delete f[dir('v1.3', '14', 'modes')]; return run(f); }, /sheet 14: no tracked UAT file/],
        ['result: pending', () => run(with14(`### 1. A\nresult: pending\n${rest}`)), /test 1: result pending/],
        ['result: [pending]', () => run(with14(`### 1. A\nresult: [pending]\n${rest}`)), /test 1: result pending/],
        ['empty result', () => run(with14(`### 1. A\nresult:\n${rest}`)), /test 1: empty result/],
        ['heading with no result line', () => run(with14(`### 1. A\nexpected: x\n${rest}`)), /test 1: no result line/],
        ['result only inside a fence', () => run(with14(`### 1. A\n\`\`\`\nresult: pass\n\`\`\`\n${rest}`)), /test 1: no result line/],
        ['result only inside a tilde fence', () => run(with14(`### 1. A\n   ~~~yaml\nresult: pass\n   ~~~\n${rest}`)), /test 1: no result line/],
        ['result only in a blockquote', () => run(with14(`### 1. A\n> result: pass\n${rest}`)), /test 1: no result line/],
        ['result only in a comment', () => run(with14(`### 1. A\n<!--\nresult: pass\n-->\n${rest}`)), /test 1: no result line/],
        ['no React 19 heading', () => run(with14('### 1. A\nresult: pass\n')), /no recorded React 19 runtime test/],
        ['React 19 heading pending', () => run(with14('### 1. A\nresult: pass\n### 2. React 19 runtime\nresult: pending\n')), /no recorded React 19 runtime test/],
        ['two tracked files for one key', () => run({ ...base, [dir('v1.4', '14', 'again')]: good }), /sheet 14: 2 tracked UAT files/],
        ['row text with no sheet list', () => run(base, 'The sheets are signed.'), 'instrument'],
        ['row text with no numbers', () => run(base, 'UAT sheets are signed.'), 'instrument'],
    ];
    const stayedGreen = [];
    const control = run(base);
    if (control.problems.length !== 0 || control.sheets !== 6) stayedGreen.push(`control (${control.problems.join('; ') || `${control.sheets} sheets`})`);
    for (const [label, plant, want] of plants) {
        let red = false;
        try {
            const { problems } = plant();
            red = want !== 'instrument' && problems.some((p) => want.test(p));
        } catch (err) {
            red = want === 'instrument' && err instanceof InstrumentError;
        }
        if (!red) stayedGreen.push(label);
    }
    if (stayedGreen.length) {
        console.error(`${NAME} --self-test: FAIL -- ${stayedGreen.join(', ')}`);
        process.exit(1);
    }
    console.log(`${NAME} --self-test: PASS -- ${plants.length} plants red, control green`);
}

const IS_MAIN = process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));

if (!IS_MAIN) {
    // imported for its exports: no I/O
} else if (process.argv.includes('--self-test')) {
    selfTest();
} else {
    let result;
    try {
        let ledger;
        try {
            ledger = JSON.parse(readFileSync(join(REPO_ROOT, 'ledger', 'REQUIREMENTS.json'), 'utf8'));
        } catch (err) {
            throw new InstrumentError(`cannot read the ledger: ${err.message}`);
        }
        const item = (Array.isArray(ledger.items) ? ledger.items : []).find((i) => i && i.id === ROW_ID);
        if (!item) throw new InstrumentError(`ledger row ${ROW_ID} is missing`);
        let tracked;
        try {
            tracked = execFileSync('git', ['ls-files', '--', MILESTONES], { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
                .split('\n').filter(Boolean);
        } catch (err) {
            throw new InstrumentError(`git ls-files failed: ${String(err.stderr || err.message).trim().split('\n')[0]}`);
        }
        result = verdict(item.text, tracked, (p) => {
            try { return readFileSync(join(REPO_ROOT, p), 'utf8'); } catch (err) { throw new InstrumentError(`cannot read ${p}: ${err.message}`); }
        });
    } catch (err) {
        console.error(`${NAME}: ERROR -- ${err.message}`);
        process.exit(2);
    }
    if (result.problems.length) {
        for (const p of result.problems) console.error(`${NAME}: FAIL -- ${p}`);
        process.exit(1);
    }
    console.log(`${NAME}: PASS -- ${result.sheets} sheets, no pending result, each with a recorded React 19 test`);
}
