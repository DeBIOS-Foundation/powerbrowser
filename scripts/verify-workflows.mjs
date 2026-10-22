#!/usr/bin/env node
// scripts/verify-workflows.mjs
//
// The workflows row (Phase 41, GH-12 and GH-08's admission half). The
// server-side Actions policy binds only at run time; this row checks the same
// trust boundary at commit time, offline, over every .github/workflows/*.yml
// and *.yaml (found with readdir, so an unstaged workflow is checked too).
//
// Instrument: js-yaml from theia/ through createRequire. YAML 1.2's core
// schema keeps `on` a string key, and a duplicate key throws, so a second
// `on:` cannot hide a schedule; a throw is a FAIL naming the file. A missing
// js-yaml is a broken-instrument FAIL, and zero workflow files is a FAIL: an
// agreement over nothing is vacuous.
//
// Rules:
//  uses-pinned    Every non-local `uses:` (step and job level) is
//                 owner/repo[/path]@<40 lowercase hex>. docker:// is red.
//  uses-admitted  actions/* and github/* are admitted through
//                 .github/settings/actions-selected.json github_owned_allowed;
//                 any other owner/repo needs a patterns_allowed entry
//                 owner/repo@*.
//  admission-used The owner/repo set in patterns_allowed equals the set of
//                 non-GitHub-owned owner/repo actually used, so an admission
//                 nobody uses is red too.
//
// Failures print sorted by file, then job, then rule, so two runs over one
// tree print identical output. This script and its --self-test only read the
// tree; every plant is applied in memory through runChecks' overrides.

import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'workflows';
const SELF_REL = 'scripts/verify-workflows.mjs';
const WF_DIR = '.github/workflows';
const SELECTED_REL = '.github/settings/actions-selected.json';
const PERMS_REL = '.github/settings/workflow-permissions.json';

const args = process.argv.slice(2);
for (const a of args) {
    if (a !== '--self-test') {
        console.error(`${NAME}: FAIL -- unknown argument '${a}'`);
        console.error(`  Next step: run: node ${SELF_REL}, or add --self-test to prove the rules discriminate.`);
        process.exit(2);
    }
}

let yaml;
try {
    yaml = createRequire(join(REPO_ROOT, 'theia', 'package.json'))('js-yaml');
} catch {
    console.error(`${NAME}: FAIL -- broken instrument: js-yaml is not installed in theia/ (run yarn install in theia/ first)`);
    process.exit(1);
}

const RULES = ['uses-pinned', 'uses-admitted', 'admission-used'];
const PIN = /^([^/@]+)\/([^@/]+)(\/[^@]*)?@([0-9a-f]{40})$/;
const PATTERN = /^([^/@]+\/[^/@]+)@\*$/;
const WF_LEVEL = '(workflow)';

function readJson(root, rel) {
    return JSON.parse(readFileSync(join(root, rel), 'utf8'));
}

function readWorkflows(root) {
    const out = {};
    for (const f of readdirSync(join(root, WF_DIR)).filter(f => /\.ya?ml$/.test(f)).sort()) {
        out[f] = readFileSync(join(root, WF_DIR, f), 'utf8');
    }
    return out;
}

function runChecks(root, overrides = {}) {
    const failures = [];
    const fail = (file, job, rule, msg) => failures.push({ file, job, rule, msg });
    let usesCount = 0;

    let files = overrides.files;
    if (files === undefined) {
        try {
            files = readWorkflows(root);
        } catch (e) {
            fail(`${WF_DIR}/`, WF_LEVEL, 'discovery', `could not be read (${e.message}). Next step: run this check inside the repository.`);
            return { failures, count: 0, usesCount };
        }
    }
    let selected = overrides.selected;
    if (selected === undefined) {
        try {
            selected = readJson(root, SELECTED_REL);
        } catch (e) {
            fail(SELECTED_REL, WF_LEVEL, 'uses-admitted', `could not be read or parsed (${e.message}), so no action is admitted. Next step: restore the file.`);
            selected = { github_owned_allowed: false, patterns_allowed: [] };
        }
    }

    const names = Object.keys(files).sort();
    if (names.length === 0) {
        fail(`${WF_DIR}/`, WF_LEVEL, 'discovery', `no workflow files found under ${WF_DIR}/; an agreement over nothing is vacuous. Next step: check the instrument (${SELF_REL}) and that the directory holds the workflows.`);
        return { failures, count: 0, usesCount };
    }

    // Admission table.
    const githubOwned = selected.github_owned_allowed === true;
    const admitted = new Set();
    for (const p of selected.patterns_allowed ?? []) {
        const m = typeof p === 'string' ? p.match(PATTERN) : null;
        if (m) admitted.add(m[1]);
        else fail(SELECTED_REL, WF_LEVEL, 'uses-admitted', `patterns_allowed entry ${JSON.stringify(p)} is not of the form owner/repo@*. Next step: admit actions by owner/repo@*; sha_pinning_required already forces SHAs.`);
    }
    const used = new Set();

    const docs = {};
    for (const file of names) {
        const rel = `${WF_DIR}/${file}`;
        let wf;
        try {
            wf = yaml.load(files[file]);
        } catch (e) {
            fail(rel, WF_LEVEL, 'parse', `does not parse as YAML 1.2 (${e.message.split('\n')[0]}). Next step: fix the file; a duplicate key such as a second on: is refused on purpose.`);
            continue;
        }
        if (wf === null || typeof wf !== 'object' || wf.jobs === null || typeof wf.jobs !== 'object') {
            fail(rel, WF_LEVEL, 'parse', `carries no jobs map. Next step: fix the file.`);
            continue;
        }
        docs[file] = wf;
    }

    for (const file of Object.keys(docs)) {
        const rel = `${WF_DIR}/${file}`;
        const wf = docs[file];
        for (const [jobId, job] of Object.entries(wf.jobs)) {
            const refs = [];
            if (job && job.uses !== undefined) refs.push(['job-level uses', job.uses]);
            (job?.steps ?? []).forEach((s, i) => { if (s && s.uses !== undefined) refs.push([`step ${i}`, s.uses]); });
            for (const [where, value] of refs) {
                const v = String(value);
                if (v.startsWith('./')) continue;
                usesCount += 1;
                if (v.startsWith('docker://')) {
                    fail(rel, jobId, 'uses-pinned', `${where} uses '${v}'; docker:// images are not admitted. Next step: use a SHA-pinned action instead.`);
                    continue;
                }
                const m = v.match(PIN);
                if (!m) {
                    fail(rel, jobId, 'uses-pinned', `${where} uses '${v}'. Next step: pin it to a full 40-character commit SHA.`);
                    continue;
                }
                const owner = m[1];
                const repo = `${m[1]}/${m[2]}`;
                if (githubOwned && (owner === 'actions' || owner === 'github')) continue;
                used.add(repo);
                if (!admitted.has(repo)) {
                    fail(rel, jobId, 'uses-admitted', `${where} uses '${v}', and ${SELECTED_REL} admits no '${repo}@*'. Next step: add '${repo}@*' to patterns_allowed and re-apply, or drop the action.`);
                }
            }
        }
    }
    for (const repo of [...admitted].sort()) {
        if (!used.has(repo)) fail(SELECTED_REL, WF_LEVEL, 'admission-used', `patterns_allowed admits '${repo}@*', which no workflow uses. Next step: remove it from ${SELECTED_REL} and re-apply.`);
    }

    const key = f => [f.file, f.job, f.rule, f.msg];
    failures.sort((a, b) => {
        const ka = key(a), kb = key(b);
        for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] < kb[i] ? -1 : 1;
        return 0;
    });
    return { failures, count: names.length, usesCount };
}

const fmt = f => `${f.file} job ${f.job} [${f.rule}]: ${f.msg}`;

function main() {
    if (args.includes('--self-test')) return selfTest();
    const { failures, count, usesCount } = runChecks(REPO_ROOT);
    if (failures.length > 0) {
        console.error(`${NAME}: FAIL -- ${failures.length} problem(s) across the workflow trust boundary.`);
        failures.forEach(f => console.error(`  ${fmt(f)}`));
        return 1;
    }
    console.log(`${NAME}: PASS -- ${count} workflow(s), ${usesCount} uses: line(s) pinned and admitted, rules enforced: ${RULES.join(', ')}`);
    return 0;
}

function selfTest() {
    const files = readWorkflows(REPO_ROOT);
    const selected = readJson(REPO_ROOT, SELECTED_REL);
    const baseline = runChecks(REPO_ROOT, { files, selected });
    if (baseline.failures.length > 0) {
        console.error(`${NAME}: --self-test FAIL -- the unmodified tree is already red, so the planted-fault results below would mean nothing:`);
        baseline.failures.forEach(f => console.error(`  ${fmt(f)}`));
        return 1;
    }
    console.log(`  ok  baseline -> green`);

    const V = 'verify.yml';
    const CHECKOUT = 'actions/checkout@11d5960a326750d5838078e36cf38b85af677262';
    const NIX = 'cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24';
    for (const needle of [CHECKOUT, NIX]) {
        if (!files[V]?.includes(needle)) {
            console.error(`${NAME}: --self-test FAIL -- ${WF_DIR}/${V} no longer carries '${needle}', so the plants below have nothing to mutate. Next step: update the anchors in ${SELF_REL}.`);
            return 1;
        }
    }
    const edit = (file, from, to) => ({ files: { ...files, [file]: files[file].replace(from, to) } });
    const H40 = 'abcdef0123456789abcdef0123456789abcdef01';
    const rel = f => `${WF_DIR}/${f}`;

    // [name, overrides, file, job, rule, value]
    const plants = [
        ['actions/checkout@v4', edit(V, CHECKOUT, 'actions/checkout@v4'), rel(V), 'verify', 'uses-pinned', 'actions/checkout@v4'],
        ['a 7-character SHA', edit(V, CHECKOUT, 'actions/checkout@11d5960'), rel(V), 'verify', 'uses-pinned', 'actions/checkout@11d5960'],
        ['a 39-character SHA', edit(V, CHECKOUT, CHECKOUT.slice(0, -1)), rel(V), 'verify', 'uses-pinned', CHECKOUT.slice(0, -1)],
        ['a 40-character uppercase SHA', edit(V, CHECKOUT, CHECKOUT.toUpperCase().replace('ACTIONS/CHECKOUT', 'actions/checkout')), rel(V), 'verify', 'uses-pinned', '11D5960A'],
        ['docker://alpine:3', edit(V, CHECKOUT, 'docker://alpine:3'), rel(V), 'verify', 'uses-pinned', 'docker://alpine:3'],
        ['unadmitted foo/bar@<sha>', edit(V, NIX, `foo/bar@${H40}`), rel(V), 'verify', 'uses-admitted', 'foo/bar'],
        ['unused admission unused/action@*', { files, selected: { ...selected, patterns_allowed: [...selected.patterns_allowed, 'unused/action@*'] } }, SELECTED_REL, WF_LEVEL, 'admission-used', 'unused/action'],
        ['patterns_allowed empty', { files, selected: { ...selected, patterns_allowed: [] } }, rel(V), 'verify', 'uses-admitted', 'cachix/install-nix-action'],
        ['a duplicate on: key', edit(V, '\njobs:', '\non:\n  schedule:\n    - cron: "0 0 * * *"\n\njobs:'), rel(V), WF_LEVEL, 'parse', 'duplicated mapping key'],
        ['zero workflow files', { files: {} }, `${WF_DIR}/`, WF_LEVEL, 'discovery', 'no workflow files'],
    ];

    let failed = 0;
    for (const [name, overrides, file, job, rule, value] of plants) {
        const { failures } = runChecks(REPO_ROOT, { files, selected, ...overrides });
        if (failures.some(f => f.file === file && f.job === job && f.rule === rule && f.msg.includes(value))) {
            console.log(`  ok  ${name} -> red, naming ${file} job ${job} [${rule}] '${value}'`);
        } else {
            console.error(`${NAME}: --self-test FAIL -- '${name}' did not go red naming ${file} job ${job} [${rule}] '${value}'; got: ${failures.map(fmt).join(' | ') || '(no failures at all)'}`);
            failed += 1;
        }
    }
    if (failed > 0) return 1;
    console.log(`${NAME}: --self-test PASS -- ${plants.length} planted faults went red naming the file and job`);
    return 0;
}

process.exit(main());
