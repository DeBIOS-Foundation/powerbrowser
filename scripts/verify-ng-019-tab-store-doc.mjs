#!/usr/bin/env node
// scripts/verify-ng-019-tab-store-doc.mjs -- NG-019 (non-GUI wave A).
//
// Derives the tab store's schema from the writer's DDL marker blocks and
// requires docs/TAB-STORE.md to document it: a "## vN" section for every
// version up to the head and none beyond, every table, index, column and
// settings key in backticks, `user_version = <head>`, the stock: and web: key
// forms, and its five contracted sections. docs/URI-SCHEMES.md must point at
// the page and no longer say the store keys rows by the page URL; the v1.2
// SCHEMA.md and MIGRATIONS.md must carry the controller's pointer line
// (decisions.md R4). After a green tree it plants each drift in memory and
// requires each to go red.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT, schemaHead, versionBlocks } from './lib/tab-store-fixtures.mjs';

const API = 'powerbrowser/shell/PowerBrowserAPI.sys.mjs';
const DOC = 'docs/TAB-STORE.md';
const URIS = 'docs/URI-SCHEMES.md';
const PLANNING = [
    '.planning/milestones/v1.2-phases/11-sql-store-design/schema/SCHEMA.md',
    '.planning/milestones/v1.2-phases/11-sql-store-design/schema/MIGRATIONS.md',
];
const SECTIONS = ['## Row keys', '## Open and closed rows', '## Settings', '## Integrity and quarantine', '## Reader contract'];

function derive(apiSrc) {
    const blocks = versionBlocks(apiSrc);
    const names = new Set();
    const settings = new Set();
    for (const block of blocks) {
        for (const s of block.statements) {
            let m;
            if ((m = /^create table (?:if not exists )?(\w+)/i.exec(s))) {
                names.add(m[1]);
                for (const col of s.matchAll(/^\s*([a-z_]+)\s+(?:TEXT|INTEGER)\b/gim)) {
                    names.add(col[1]);
                }
            }
            if ((m = /^create index (?:if not exists )?(\w+)/i.exec(s))) {
                names.add(m[1]);
            }
            if ((m = /^alter table \w+ add column (\w+)/i.exec(s))) {
                names.add(m[1]);
            }
            if ((m = /^insert or ignore into settings \(key, value\) values \('([^']+)'/i.exec(s))) {
                settings.add(m[1]);
            }
        }
    }
    return { head: schemaHead(apiSrc), blocks: blocks.length, names: [...names], settings: [...settings] };
}

function check({ apiSrc, doc, uris, planning }) {
    const failures = [];
    const d = derive(apiSrc);
    if (d.blocks !== d.head) {
        failures.push(`${API} has ${d.blocks} DDL marker blocks for schema head ${d.head}`);
    }
    for (let v = 1; v <= d.head; v += 1) {
        if (!new RegExp(`^## v${v}\\b`, 'm').test(doc)) {
            failures.push(`${DOC} has no "## v${v}" section`);
        }
    }
    if (new RegExp(`^## v${d.head + 1}\\b`, 'm').test(doc)) {
        failures.push(`${DOC} documents v${d.head + 1}, beyond the head ${d.head}`);
    }
    for (const name of d.names) {
        if (!doc.includes(`\`${name}\``)) {
            failures.push(`${DOC} never names \`${name}\``);
        }
    }
    for (const key of d.settings) {
        if (!doc.includes(`\`${key}\``)) {
            failures.push(`${DOC} never names the setting \`${key}\``);
        }
    }
    if (!doc.includes(`\`user_version = ${d.head}\``)) {
        failures.push(`${DOC} does not state \`user_version = ${d.head}\``);
    }
    for (const prefix of ['stock:', 'web:']) {
        if (!doc.includes(`\`${prefix}`)) {
            failures.push(`${DOC} does not state the ${prefix} key form`);
        }
    }
    for (const section of SECTIONS) {
        if (!doc.split('\n').includes(section)) {
            failures.push(`${DOC} has no "${section}" section`);
        }
    }
    if (/keys its rows by that URL/.test(uris)) {
        failures.push(`${URIS} still says the store keys its rows by the page URL`);
    }
    if (!uris.includes('TAB-STORE.md')) {
        failures.push(`${URIS} does not point at ${DOC}`);
    }
    for (const [path, text] of Object.entries(planning)) {
        if (!text.includes('docs/TAB-STORE.md')) {
            failures.push(`${path} has no pointer line to ${DOC} (controller-owned; decisions.md R4)`);
        }
    }
    return failures;
}

const read = rel => readFileSync(join(REPO_ROOT, rel), 'utf8');
const tree = {
    apiSrc: read(API),
    doc: read(DOC),
    uris: read(URIS),
    planning: Object.fromEntries(PLANNING.map(p => [p, read(p)])),
};
const failures = check(tree);
if (failures.length) {
    console.error('verify-ng-019-tab-store-doc: FAIL');
    failures.forEach(f => console.error(`  ${f}`));
    process.exit(1);
}
const d = derive(tree.apiSrc);
const plants = [
    ['missing version section', { ...tree, doc: tree.doc.replace(new RegExp(`^## v${d.head}\\b`, 'm'), '## gone') }, `"## v${d.head}"`],
    ['section beyond the head', { ...tree, doc: `${tree.doc}\n## v${d.head + 1}\n` }, `v${d.head + 1}`],
    ['undocumented column', { ...tree, doc: tree.doc.split('`closed_at`').join('closed_at') }, '`closed_at`'],
    ['undocumented setting', { ...tree, doc: tree.doc.split('`restore_behaviour`').join('restore_behaviour') }, '`restore_behaviour`'],
    ['stale URI-SCHEMES sentence', { ...tree, uris: `${tree.uris}\nThe store keys its rows by that URL.\n` }, 'page URL'],
];
let bad = 0;
for (const [label, planted, naming] of plants) {
    const got = check(planted);
    if (!got.some(f => f.includes(naming))) {
        console.error(`verify-ng-019-tab-store-doc: FAIL -- plant '${label}' did not go red naming ${naming}; got: ${got.join(' | ') || '(nothing)'}`);
        bad += 1;
    }
}
if (bad) {
    process.exit(1);
}
console.log(`verify-ng-019-tab-store-doc: PASS -- ${DOC} documents schema v1..v${d.head}; ${plants.length} planted drifts each went red`);
