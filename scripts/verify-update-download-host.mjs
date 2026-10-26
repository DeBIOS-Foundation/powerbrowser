#!/usr/bin/env node
// scripts/verify-update-download-host.mjs
//
// The update-download host gate (Phase 46, WR-07 owner ruling 2026-10-25).
// github.com is user-initiated in powerbrowser/endpoint-allowlist.json, so an
// unattended request to it fails the verdict model (scripts/lib/endpoint-verdict.mjs).
// The unattended MAR download must therefore never name a github.com
// /releases/download/ URL as its update source. The update descriptor's
// patchURL (and servedMarUrl) must point at release-assets.githubusercontent.com
// or the updates host.
//
// The descriptor is emitted by a later phase (49/50), so this row guards every
// tracked file that could carry one: descriptor templates, generator output and
// fixtures. It reads the tracked tree (git ls-files), skips prose and binaries,
// and fails on a github.com /releases/download/ URL that sits in update-download
// context: on a line that names a MAR or a patch, or in a file that does.
// A release-notes URL (no /releases/download/ segment) is not a download and passes.
//
// Usage:
//   node scripts/verify-update-download-host.mjs
//   node scripts/verify-update-download-host.mjs --self-test
//
// Exit 0 pass, 1 fail. --self-test plants a descriptor template, a generator
// output and a fixture carrying the github.com form, and requires each to go
// red naming the file; two controls (a release-assets URL and a release-notes
// URL) must stay green.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(dirname(SELF), '..');
const NAME = 'update-download-host';
const SELF_REL = 'scripts/verify-update-download-host.mjs';
const CONSTRAINT = 'the constraint is recorded in .planning/workstreams/deploy/phases/49-release-pipeline-and-legion-runner-e/49-CONTEXT.md and 46-VERIFICATION.md';

const args = process.argv.slice(2);
for (const a of args) {
    if (a !== '--self-test') {
        console.error(`${NAME}: FAIL -- unknown argument '${a}'`);
        console.error(`  Next step: run: node ${SELF_REL}, or add --self-test to prove the host rule discriminates.`);
        process.exit(2);
    }
}

// A github.com Releases DOWNLOAD URL (the asset path), not a releases page.
const GITHUB_DOWNLOAD = /https?:\/\/github\.com\/[^\s"'<>]+\/releases\/download\//i;
// Update-download context: a MAR, a patch, a descriptor, or the update XML.
const UPDATE_CONTEXT = /\.mar\b|patchURL|servedMarUrl|<patch\b|update\.xml/i;
// Prose, binaries and lockfiles are not descriptors, templates or fixtures.
const SKIP = [
    /^\.planning\//,
    /^docs\//,
    /^upstream\//,
    /^theia\/yarn\.lock$/,
    /\.(png|jpe?g|gif|ico|icns|svg|woff2?|ttf|otf|tar|gz|xz|zip|mar|bin)$/i,
];

function listTracked(root) {
    try {
        return execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
            .split('\n')
            .map(l => l.trim())
            .filter(l => l !== '');
    } catch {
        return null;
    }
}

function readText(root, rel) {
    try {
        return readFileSync(join(root, rel), 'utf8');
    } catch {
        return null;
    }
}

/** The file:line hits of a github.com download URL in update-download context. */
export function githubDownloadHits(files, read) {
    const hits = [];
    for (const rel of files) {
        if (rel === SELF_REL || SKIP.some(re => re.test(rel))) continue;
        const text = read(rel);
        if (text === null || text === undefined) continue;
        const fileIsUpdate = UPDATE_CONTEXT.test(text);
        text.split('\n').forEach((line, i) => {
            if (GITHUB_DOWNLOAD.test(line) && (fileIsUpdate || UPDATE_CONTEXT.test(line))) {
                hits.push(`${rel}:${i + 1}`);
            }
        });
    }
    return hits;
}

export function runChecks(root, overrides = {}) {
    const files = overrides.files ?? listTracked(root);
    if (files === null) {
        return { failures: [`git ls-files could not list the tracked tree, so no descriptor, template or fixture can be proven free of a github.com update download. Next step: run this row inside the git worktree.`] };
    }
    const read = overrides.read ?? ((rel) => readText(root, rel));
    const hits = githubDownloadHits(files, read);
    const failures = hits.map(h => `${h} names a github.com /releases/download/ URL as an update download. github.com is user-initiated, so the unattended update fetch would fail the verdict model. Next step: point patchURL and servedMarUrl at release-assets.githubusercontent.com or the updates host; ${CONSTRAINT}.`);
    return { failures, files: files.length };
}

function main() {
    if (args.includes('--self-test')) return selfTest();
    const { failures, files } = runChecks(REPO_ROOT);
    if (failures.length > 0) {
        console.error(`${NAME}: FAIL -- ${failures.length} tracked file(s) name a github.com update download.`);
        failures.forEach(f => console.error(`  ${f}`));
        return 1;
    }
    console.log(`${NAME}: PASS -- no tracked descriptor, template, generator output or fixture (${files} tracked file(s) read) names a github.com /releases/download/ URL as an update download`);
    return 0;
}

function selfTest() {
    const real = listTracked(REPO_ROOT);
    if (real === null) {
        console.error(`${NAME}: --self-test FAIL -- git ls-files failed, so the control is unproven.`);
        return 1;
    }
    const cache = new Map();
    const realRead = (rel) => {
        if (!cache.has(rel)) cache.set(rel, readText(REPO_ROOT, rel));
        return cache.get(rel);
    };
    const baseline = runChecks(REPO_ROOT, { files: real, read: realRead });
    if (baseline.failures.length > 0) {
        console.error(`${NAME}: --self-test FAIL -- the unmodified tree is already red:`);
        baseline.failures.forEach(f => console.error(`  ${f}`));
        return 1;
    }
    console.log(`  ok  baseline -> green (${baseline.files} tracked file(s))`);

    // In-memory synthetic files: nothing is written to the tree.
    const fixtures = {
        'theia/extensions/tab-uris/fixtures/update.xml.tmpl': '<updates><update appVersion="{{v}}"><patch type="complete" URL="https://github.com/DeBIOS-Foundation/powerbrowser/releases/download/{{tag}}/powerbrowser.mar"/></update></updates>\n',
        'scripts/generated-update-descriptor.json': '{\n  "servedMarUrl": "https://github.com/DeBIOS-Foundation/powerbrowser/releases/download/v1.0.0/powerbrowser-1.0.0.mar"\n}\n',
        'powerbrowser/branding/release/fixtures/patch-manifest.json': '{ "patchURL": "https://github.com/DeBIOS-Foundation/powerbrowser/releases/download/v1.0.0/x.mar" }\n',
        'control/release-assets-patch.xml': '<updates><update><patch URL="https://release-assets.githubusercontent.com/github-production-release-asset/1/x.mar"/></update></updates>\n',
        'control/release-notes-link.json': '{ "app.releaseNotesURL": "https://github.com/DeBIOS-Foundation/powerbrowser/releases" }\n',
    };
    const planted = (rels) => ({ files: [...real, ...rels], read: (rel) => (rel in fixtures ? fixtures[rel] : realRead(rel)) });

    let failed = 0;
    const plants = [
        ['descriptor template names the github.com download', 'theia/extensions/tab-uris/fixtures/update.xml.tmpl'],
        ['generator output names the github.com download', 'scripts/generated-update-descriptor.json'],
        ['fixture names the github.com download as patchURL', 'powerbrowser/branding/release/fixtures/patch-manifest.json'],
    ];
    for (const [name, rel] of plants) {
        const { failures } = runChecks(REPO_ROOT, planted([rel]));
        if (failures.some(f => f.includes(rel))) {
            console.log(`  ok  ${name} -> red naming ${rel}`);
        } else {
            console.error(`${NAME}: --self-test FAIL -- '${name}' did not go red naming ${rel}; got: ${failures.join(' | ') || '(no failures)'}`);
            failed += 1;
        }
    }
    for (const rel of ['control/release-assets-patch.xml', 'control/release-notes-link.json']) {
        const { failures } = runChecks(REPO_ROOT, planted([rel]));
        if (failures.length === 0) {
            console.log(`  ok  control ${rel} -> green`);
        } else {
            console.error(`${NAME}: --self-test FAIL -- control ${rel} went red: ${failures.join(' | ')}`);
            failed += 1;
        }
    }

    if (failed > 0) return 1;
    console.log(`${NAME}: --self-test PASS -- ${plants.length} planted github.com download(s) went red naming their file, and both controls stayed green`);
    return 0;
}

process.exit(main());
