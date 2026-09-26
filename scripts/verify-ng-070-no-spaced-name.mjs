#!/usr/bin/env node
// scripts/verify-ng-070-no-spaced-name.mjs -- NG-070 (wave E): no user-visible or generated
// surface shows the spaced product name. Scans the STRING CONTENT of every shipped surface:
//   - string literals, template text and JSX text of theia/extensions/*/src (tests excluded),
//     of powerbrowser/shell/*.{sys.mjs,js}, and of the operator-facing scripts/crash-collector.mjs
//     (TypeScript's parser, so comments are skipped by construction, not by pattern);
//   - value lines of every .ftl/.properties locale file (tracked and generated);
//   - every string value of generated/**/*.json and of the application package.json.
// --self-test plants a literal hit, a comment-only mention, a JSX hit, a locale hit, a JSON
// hit and a clean one-word string, and requires exactly the four hits.
// Tier: quick. Marker: quick.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'ng070-no-spaced-name';
const SPACED = 'Power Browser';
const ts = createRequire(join(REPO_ROOT, 'theia', 'package.json'))('typescript');

export function hitsInCode(file, text) {
    const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : file.endsWith('.ts') ? ts.ScriptKind.TS : ts.ScriptKind.JS;
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
    const hits = [];
    const visit = node => {
        const isText = ts.isStringLiteralLike(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node) || ts.isJsxText(node);
        if (isText && node.text.includes(SPACED)) {
            hits.push(`${file}:${sf.getLineAndCharacterOfPosition(node.getStart()).line + 1}: ${JSON.stringify(node.text.trim().slice(0, 100))}`);
        }
        ts.forEachChild(node, visit);
    };
    visit(sf);
    return hits;
}

export function hitsInLocale(file, text) {
    return text.split('\n').flatMap((l, i) => (!/^\s*#/.test(l) && l.includes(SPACED)) ? [`${file}:${i + 1}: ${JSON.stringify(l.trim())}`] : []);
}

export function hitsInJson(file, text) {
    const hits = [];
    const walk = (v, path) => {
        if (typeof v === 'string') { if (v.includes(SPACED)) hits.push(`${file}: ${path}: ${JSON.stringify(v.slice(0, 100))}`); }
        else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
    };
    walk(JSON.parse(text), '$');
    return hits;
}

function scanTree() {
    const tracked = execFileSync('git', ['-C', REPO_ROOT, 'ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
    const code = tracked.filter(f => (/^theia\/extensions\/[^/]+\/src\/.+\.tsx?$/.test(f) && !/(^|\/)test\/|\.(spec|test)\.tsx?$/.test(f))
        || /^powerbrowser\/shell\/[^/]+\.(sys\.mjs|js)$/.test(f) || f === 'scripts/crash-collector.mjs');
    const locale = tracked.filter(f => /^powerbrowser\/branding\/.+\.(ftl|properties)$/.test(f));
    const json = ['theia/applications/browser/package.json'];
    const gen = join(REPO_ROOT, 'generated');
    if (!existsSync(gen)) throw new Error('generated/ is absent -- run: node scripts/generate.mjs');
    const walk = d => readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]);
    for (const abs of walk(gen)) {
        const rel = relative(REPO_ROOT, abs);
        if (rel.endsWith('.json')) json.push(rel);
        else if (/\.(ftl|properties)$/.test(rel)) locale.push(rel);
    }
    const read = f => readFileSync(join(REPO_ROOT, f), 'utf8');
    return [...code.flatMap(f => hitsInCode(f, read(f))), ...locale.flatMap(f => hitsInLocale(f, read(f))), ...json.flatMap(f => hitsInJson(f, read(f)))];
}

function selfTest() {
    const got = [
        ...hitsInCode('a.ts', `const s = '${SPACED} x';\n// ${SPACED} in a comment\n`),
        ...hitsInCode('b.tsx', `export const X = () => <div>${SPACED} here</div>;\n`),
        ...hitsInLocale('c.ftl', `# ${SPACED} comment\nkey = ${SPACED} value\n`),
        ...hitsInJson('d.json', JSON.stringify({ a: { b: SPACED } })),
        ...hitsInCode('e.ts', `const s = 'PowerBrowser';\n`),
    ];
    const want = ['a.ts:1:', 'b.tsx:1:', 'c.ftl:2:', 'd.json: $.a.b:'];
    if (got.length !== want.length || !want.every((w, i) => got[i].startsWith(w))) {
        console.error(`${NAME} --self-test: FAIL -- planted hits came back as ${JSON.stringify(got)}`);
        process.exit(1);
    }
    console.log(`${NAME} --self-test: PASS -- four planted hits found, the comment and the one-word form ignored`);
}

if (process.argv.includes('--self-test')) selfTest();
else {
    const hits = scanTree();
    if (hits.length) {
        console.error(`${NAME}: FAIL -- ${hits.length} surface(s) show the spaced name:\n  ${hits.join('\n  ')}`);
        process.exit(1);
    }
    console.log(`${NAME}: PASS -- no shipped surface shows the spaced name`);
}
