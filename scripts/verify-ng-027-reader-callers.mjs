#!/usr/bin/env node
// scripts/verify-ng-027-reader-callers.mjs
//
// NG-027: every reader in PowerBrowserAPI.sys.mjs and TabQueryService has a
// caller on the runtime path; a reader with no consumer is deleted.
//
// Derive and compare (CLAUDE.md verification rule 2); nothing is hand-kept.
//   PowerBrowserAPI readers: object methods and module-level functions whose
//     names start read/list/get/project/search/query/fetch/find.
//   TabQueryService readers: its public methods, except set* and the
//     constructor.
// A caller is a call site in tracked runtime source -- powerbrowser/shell/
// (*.sys.mjs, *.js) and theia/extensions/*/src/ (*.ts, *.tsx) -- on a line
// that is not a comment and not inside the body of a reader already found
// dead. That rule iterates to a fixpoint, so a reader called only by a dead
// reader is dead too. Call shapes: `PowerBrowserAPI.name(` for object
// methods, a bare `name(` for module functions, and `.name(` not preceded by
// `PowerBrowserAPI` for TabQueryService (reached through JSON-RPC proxies,
// e.g. `this.groups.listGroups(`). scripts/ never counts: a check calling a
// reader is not a consumer.
//
// Honestly --quick: text reads only. --self-test runs the analyzer over a
// synthetic tree: it must find exactly the planted dead readers, then go red
// on a removed call site and on a planted reader, and fail distinctly on an
// empty scan.
// ponytail: braces are counted character by character, so a brace inside a
// string or regex literal can skew a body span; the self-test pins the
// shapes this tree uses.

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const NAME = 'ng-027-reader-callers';
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PBA_REL = 'powerbrowser/shell/PowerBrowserAPI.sys.mjs';
const TQS_REL = 'theia/extensions/tab-uris/src/node/tab-query-service.ts';
const READER = /^(read|list|get|project|search|query|fetch|find)[A-Z]/;

function isRuntime(rel) {
    if (rel.split('/').some(seg => seg === 'lib' || seg === 'node_modules')) return false;
    return (rel.startsWith('powerbrowser/shell/') && /\.(sys\.mjs|js)$/.test(rel))
        || (/^theia\/extensions\/[^/]+\/src\//.test(rel) && /\.tsx?$/.test(rel));
}

function isComment(line) {
    const t = line.trimStart();
    return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*');
}

/** [first, last] 0-based lines of the brace body opened on or after line `start`. */
function bodySpan(lines, start) {
    let depth = 0;
    let opened = false;
    for (let i = start; i < lines.length; i += 1) {
        for (const ch of lines[i]) {
            if (ch === '{') {
                depth += 1;
                opened = true;
            } else if (ch === '}') {
                depth -= 1;
                if (opened && depth === 0) return [start, i];
            }
        }
    }
    return [start, lines.length - 1];
}

function deriveReaders(sources) {
    const readers = [];
    (sources[PBA_REL] ?? '').split('\n').forEach((line, i) => {
        const method = /^ {2}(?:async )?([A-Za-z_$][\w$]*)\([^)]*\)\s*\{\s*$/.exec(line);
        const fn = /^(?:export )?(?:async )?function ([A-Za-z_$][\w$]*)\(/.exec(line);
        if (method && READER.test(method[1])) readers.push({ kind: 'method', name: method[1], file: PBA_REL, line: i });
        if (fn && READER.test(fn[1])) readers.push({ kind: 'function', name: fn[1], file: PBA_REL, line: i });
    });
    const tqs = (sources[TQS_REL] ?? '').split('\n');
    const classAt = tqs.findIndex(l => /^export class TabQueryService\b/.test(l));
    if (classAt >= 0) {
        const [, end] = bodySpan(tqs, classAt);
        for (let i = classAt + 1; i < end; i += 1) {
            // A method may share its line with the end of the previous doc comment ("*/    async getThumbnail(").
            const text = tqs[i].replace(/^\s*\*\/(?=\s)/, '');
            const m = /^ {4}(?:async )?([A-Za-z_$][\w$]*)\([^)]*\)[^;]*\{\s*$/.exec(text);
            if (m && m[1] !== 'constructor' && !m[1].startsWith('set')) readers.push({ kind: 'service', name: m[1], file: TQS_REL, line: i });
        }
    }
    return readers;
}

function callPattern(reader) {
    if (reader.kind === 'method') return new RegExp(`PowerBrowserAPI\\.${reader.name}\\(`);
    if (reader.kind === 'function') return new RegExp(`(?<![\\w$.])${reader.name}\\(`);
    return new RegExp(`(?<!PowerBrowserAPI)\\.${reader.name}\\(`);
}

/** Readers, and the dead ones (null when no reader derived at all). */
export function analyze(sources) {
    const readers = deriveReaders(sources);
    if (readers.length === 0) return { readers, dead: null };
    const split = Object.fromEntries(Object.entries(sources).map(([file, text]) => [file, text.split('\n')]));
    let dead = [];
    for (;;) {
        const deadSpans = dead.map(r => ({ file: r.file, span: bodySpan(split[r.file], r.line) }));
        const next = readers.filter(reader => {
            const pattern = callPattern(reader);
            for (const [file, lines] of Object.entries(split)) {
                for (let i = 0; i < lines.length; i += 1) {
                    if (file === reader.file && i === reader.line) continue;
                    if (isComment(lines[i])) continue;
                    if (deadSpans.some(d => d.file === file && i >= d.span[0] && i <= d.span[1])) continue;
                    if (pattern.test(lines[i])) return false;
                }
            }
            return true;
        });
        if (next.length === dead.length) return { readers, dead: next };
        dead = next;
    }
}

function filterSources(all) {
    return Object.fromEntries(Object.entries(all).filter(([rel]) => rel === PBA_REL || rel === TQS_REL || isRuntime(rel)));
}

function trackedSources() {
    const out = spawnSync('git', ['-C', REPO_ROOT, 'ls-files', '-z'], { encoding: 'utf8' });
    if (out.status !== 0) throw new Error('git ls-files failed -- cannot derive the tracked set');
    const all = {};
    for (const rel of out.stdout.split('\0').filter(Boolean)) {
        if (rel === PBA_REL || rel === TQS_REL || isRuntime(rel)) all[rel] = readFileSync(join(REPO_ROOT, rel), 'utf8');
    }
    return all;
}

function failuresOf(result) {
    if (result.dead === null) return [`derived ZERO readers from ${PBA_REL} and ${TQS_REL} -- the derivation is broken, so a clean result would prove nothing`];
    return result.dead.map(r => `${r.file}:${r.line + 1} ${r.name} -- no caller on the runtime path (give it a consumer or delete it)`);
}

const FIXTURE = {
    [PBA_REL]: [
        'export const PowerBrowserAPI = Object.freeze({',
        '  readUsed() {',
        '    return 1;',
        '  },',
        '  readOnlyByDead() {',
        '    return 2;',
        '  },',
        '  listDead() {',
        '    return PowerBrowserAPI.readOnlyByDead();',
        '  },',
        '});',
        'function searchUsed() {',
        '  return 3;',
        '}',
        'export function run() {',
        '  // PowerBrowserAPI.listDead() in a comment is not a caller',
        '  return PowerBrowserAPI.readUsed() + searchUsed();',
        '}',
    ].join('\n'),
    [TQS_REL]: [
        'export class TabQueryService {',
        '    getUsed(): number {',
        '        return 1;',
        '    }',
        '    getUnused(): number {',
        '        return 2;',
        '    }',
        '    setProfileDir(dir: string): void {',
        '        void dir;',
        '    }',
        '}',
    ].join('\n'),
    'theia/extensions/modes/src/browser/caller.ts': 'export const use = (svc: { getUsed(): number }) => svc.getUsed();',
    'scripts/verify-something.mjs': 'svc.getUnused();',
};

function names(result) {
    return result.dead === null ? null : result.dead.map(r => r.name).sort();
}

function selfTest() {
    const problems = [];
    const control = names(analyze(filterSources(FIXTURE)));
    if (JSON.stringify(control) !== JSON.stringify(['getUnused', 'listDead', 'readOnlyByDead'])) {
        problems.push(`control: expected exactly [getUnused, listDead, readOnlyByDead] dead, got ${JSON.stringify(control)}`);
    }
    const noCaller = { ...FIXTURE, 'theia/extensions/modes/src/browser/caller.ts': 'export const use = 1;' };
    if (!(names(analyze(filterSources(noCaller))) ?? []).includes('getUsed')) problems.push('removing the only call site of getUsed did not turn it red');
    const planted = { ...FIXTURE, [PBA_REL]: FIXTURE[PBA_REL].replace('Object.freeze({', 'Object.freeze({\n  readPlanted() {\n    return 0;\n  },') };
    if (planted[PBA_REL] === FIXTURE[PBA_REL]) problems.push('the planted reader did not land');
    if (!(names(analyze(filterSources(planted))) ?? []).includes('readPlanted')) problems.push('a planted uncalled reader stayed green');
    if (failuresOf(analyze({})).length !== 1 || !failuresOf(analyze({}))[0].includes('derived ZERO')) problems.push('an empty scan did not fail distinctly');
    if (problems.length) {
        console.error(`${NAME} --self-test: FAIL`);
        for (const p of problems) console.error(`  - ${p}`);
        return 1;
    }
    console.log(`${NAME} --self-test: PASS -- control found exactly the planted dead readers; a removed call site, a planted reader and an empty scan each went red`);
    return 0;
}

function main() {
    if (process.argv.includes('--self-test')) return selfTest();
    const result = analyze(trackedSources());
    const failures = failuresOf(result);
    if (failures.length) {
        console.error(`${NAME}: FAIL`);
        for (const f of failures) console.error(`  - ${f}`);
        return 1;
    }
    console.log(`${NAME}: PASS -- ${result.readers.length} readers, every one called on the runtime path`);
    return 0;
}

process.exit(main());
