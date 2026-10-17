#!/usr/bin/env node
// planning-paths (PLAT-05): every path literal a tracked script or workflow
// spells into the planning tree (the live phases dir, or an archived
// milestones/v<N>-phases dir) must resolve against `git ls-files`: a tracked
// file, a tracked directory prefix, or a `*` glob matching exactly one of
// those. Derived from the tree at check time; there is no hand-kept path list.
//
// The tracked set is both the scan input and the resolution target, so the
// row sees what a clean clone and CI see. An unresolved literal has no
// fallback here: a fallback is the breakage this row exists to catch.
//
// This file is inside its own scan scope, so it never spells a concrete
// planning path; the self-test assembles its plant paths at runtime.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const NAME = 'planning-paths';
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCOPE = ['scripts/', '.github/'];
const LITERAL = /\.planning\/(?:phases|milestones\/v[0-9.]+-phases)\/[0-9][^\s'"`$<>{}()]*/g;

function clean(literal) {
    let prev;
    do {
        prev = literal;
        literal = literal.replace(/:[0-9]+$/, '').replace(/[.,:;]+$/, '').replace(/\/+$/, '');
    } while (literal !== prev);
    return literal;
}

/** Distinct tracked files or directory prefixes the literal (or glob) names. */
function matches(literal, tracked) {
    const body = literal.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*');
    const re = new RegExp(`^(${body})(?:/|$)`);
    const hits = new Set();
    for (const path of tracked) {
        const m = re.exec(path);
        if (m) {
            hits.add(m[1]);
        }
    }
    return hits.size;
}

/**
 * sources: Map<path, text>; tracked: Set<path>.
 * Returns { references, failures } where failures are ready-to-print strings.
 */
export function findUnresolved(sources, tracked) {
    let references = 0;
    const failures = [];
    for (const [file, text] of sources) {
        for (const m of text.matchAll(LITERAL)) {
            const literal = clean(m[0]);
            references += 1;
            const n = matches(literal, tracked);
            if (n !== 1) {
                const line = text.slice(0, m.index).split('\n').length;
                const why = literal.includes('*') ? `matches ${n}` : '0 tracked';
                failures.push(`${file}:${line} ${literal} (${why})`);
            }
        }
    }
    if (references === 0) {
        failures.push(`zero references found in ${sources.size} source files (broken instrument: the scan saw nothing)`);
    }
    return { references, failures };
}

function selfTest() {
    const p = (...parts) => ['.planning', ...parts].join('/');
    const live = (...parts) => p('phases', ...parts);
    const arch = (v, ...parts) => p('milestones', `${v}-phases`, ...parts);
    const tracked = new Set([
        arch('v1.0', '07-alpha', 'fixtures', 'a.toml'),
        arch('v1.0', '07-alpha', 'REC.md'),
        arch('v1.1', '09-beta', 'fixtures', 'b.toml'),
        arch('v1.1', '09-gamma', 'fixtures', 'c.toml'),
        'scripts/x.mjs',
    ]);
    const one = (text) => new Map([['scripts/plant.mjs', text]]);
    const cases = [
        { name: 'untracked JS literal', src: one(`const R = '${live('99-gone', 'rec.md')}';\n`), expect: [`scripts/plant.mjs:1 ${live('99-gone', 'rec.md')} (0 tracked)`] },
        { name: 'shell glob matching 0', src: one(`root=$(echo "$R"/${arch('v1.0', '08-*', 'fixtures')})\n`), expect: [`scripts/plant.mjs:1 ${arch('v1.0', '08-*', 'fixtures')} (matches 0)`] },
        { name: 'glob matching 2', src: one(`x\nroot=$(echo "$R"/${arch('v1.1', '09-*', 'fixtures')})\n`), expect: [`scripts/plant.mjs:2 ${arch('v1.1', '09-*', 'fixtures')} (matches 2)`] },
        { name: 'wrong milestone', src: one(`const R = '${arch('v1.1', '07-alpha', 'REC.md')}';\n`), expect: [`scripts/plant.mjs:1 ${arch('v1.1', '07-alpha', 'REC.md')} (0 tracked)`] },
        { name: 'empty source set', src: new Map(), expect: ['zero references'] },
        {
            name: 'mixed file',
            src: one(`a = '${arch('v1.0', '07-alpha', 'REC.md')}';\nb = '${live('98-gone')}/';\n`),
            expect: [`scripts/plant.mjs:2 ${live('98-gone')} (0 tracked)`],
        },
        {
            name: 'clean control',
            src: one([
                `a = '${arch('v1.0', '07-alpha', 'REC.md')}:12.'`,
                `b = "${arch('v1.0', '07-alpha', 'fixtures')}/"`,
                `c=$(echo "$R"/${arch('v1.0', '07-*', 'fixtures')})`,
                `d = \`${p('phases')}/\${phaseDir}/x.md\``,
                `e = '${p('milestones', '<v>-phases')}/07-alpha'`,
            ].join('\n')),
            expect: [],
        },
    ];
    const bad = [];
    for (const c of cases) {
        const { failures } = findUnresolved(c.src, tracked);
        const ok = c.expect.length === 0
            ? failures.length === 0
            : failures.length === c.expect.length && c.expect.every((e, i) => failures[i].includes(e));
        if (!ok) {
            bad.push(`${NAME}-self-test: FAIL -- '${c.name}' expected ${c.expect.length ? c.expect.join(' | ') : 'no failures'}; got: ${failures.join(' | ') || '(no failures)'}`);
        }
    }
    if (bad.length) {
        bad.forEach((l) => console.error(l));
        process.exit(1);
    }
    console.log(`${NAME}-self-test: PASS -- ${cases.length} cases`);
}

function main() {
    const trackedList = execFileSync('git', ['ls-files', '-z'], { cwd: REPO_ROOT, encoding: 'utf8' })
        .split('\0')
        .filter(Boolean);
    const sources = new Map();
    for (const path of trackedList) {
        if (!SCOPE.some((s) => path.startsWith(s))) {
            continue;
        }
        try {
            sources.set(path, readFileSync(join(REPO_ROOT, path), 'utf8'));
        } catch (err) {
            // A tracked path missing from the working tree is not a source to scan.
            if (err.code !== 'ENOENT') {
                throw err;
            }
        }
    }
    const { references, failures } = findUnresolved(sources, new Set(trackedList));
    if (failures.length) {
        failures.forEach((f) => console.log(`${NAME}: FAIL -- ${f}`));
        process.exit(1);
    }
    console.log(`${NAME}: PASS -- ${references} references in ${sources.size} tracked files under scripts/ and .github/ resolve to tracked paths (scope is scripts/ and .github/ only; docs/ and CLAUDE.md are not checked)`);
}

if (process.argv.includes('--self-test')) {
    selfTest();
} else {
    main();
}
