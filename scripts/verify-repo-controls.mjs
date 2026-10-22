#!/usr/bin/env node
// scripts/verify-repo-controls.mjs
//
// The repo-controls row (Phase 41, GH-02). Every repository-scope setting the
// release pipeline relies on is one tracked JSON body under .github/settings/,
// and this row reads the live org and repo back against those bodies.
//
//  1. Owner and repo. Both come from configuration.toml [urls] release_notes
//     through resolveConfig, so no org or repo name is written here.
//  2. Settings set. The files under .github/settings/ must equal the set of
//     files the CONTROLS table references. An orphan body, a missing body and
//     an absent or empty directory are each red, naming the file.
//  3. Read-back. Each control's read endpoint is fetched with read-only
//     `gh api` GETs, pinned to X-GitHub-Api-Version 2022-11-28, and compared:
//       projection: only the declared keys decide, so keys GitHub adds
//                   (_links, node_id, created_at, defaulted parameters) never do;
//       sets:       every array compares as a set, and named entities
//                   (rulesets, bypass actors) compare by set equality, so an
//                   addition and a removal are both red.
//  4. Fail closed. A non-2xx response, a missing or unauthenticated gh, or
//     unparseable JSON is a FAIL naming the endpoint and the next step, never
//     a SKIP and never a PASS.
//
// CONTROLS is the one table: scripts/apply-repo-controls.mjs imports
// planWrites, which turns the same entries into the ordered writes, so the
// endpoint a body is applied through and the one it is read back from cannot
// drift apart. This row and its --self-test only read; every self-test plant
// is applied in memory through runChecks' overrides, with no network and no gh.

import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { resolveConfig } from './generate.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'repo-controls';
const SELF_REL = 'scripts/verify-repo-controls.mjs';
const MANIFEST_REL = 'configuration.toml';
export const SETTINGS_REL = '.github/settings';
export const API_VERSION_HEADER = 'X-GitHub-Api-Version: 2022-11-28';
const APPLY = 'the owner runs node scripts/apply-repo-controls.mjs --yes from a terminal (plan 41-04)';

// --- reads ------------------------------------------------------------------

// Lists are read with per_page=100 and refused, not paginated, when the
// response says more items exist than it returned. Every list here is far
// below 100.
function truncated(body) {
    if (Array.isArray(body)) return body.length >= 100 ? `${body.length} items, the page limit` : null;
    if (body === null || typeof body !== 'object' || typeof body.total_count !== 'number') return null;
    const lists = Object.values(body).filter(Array.isArray);
    if (lists.length !== 1 || body.total_count <= lists[0].length) return null;
    return `total_count ${body.total_count} but ${lists[0].length} returned`;
}

const NEXT_AUTH = 'Next step: run gh auth status; the row needs scopes repo and read:org.';

export function ghGet(path) {
    let out;
    try {
        out = execFileSync('gh', ['api', '-H', API_VERSION_HEADER, path],
            { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 16 * 1024 * 1024 });
    } catch (e) {
        const first = String(e.stderr || e.message).trim().split('\n')[0];
        return { ok: false, why: `GET ${path} could not be read (${first}). ${NEXT_AUTH}` };
    }
    try {
        return { ok: true, body: JSON.parse(out) };
    } catch {
        return { ok: false, why: `GET ${path} could not be read (the response is not JSON). ${NEXT_AUTH}` };
    }
}

// Every getter, real or planted, goes through this: a throw, a malformed
// result and a truncated list are each unreadable, never green.
function safeGetter(get) {
    const cache = new Map();
    return (path) => {
        if (cache.has(path)) return cache.get(path);
        let r;
        try {
            r = get(path);
        } catch (e) {
            r = { ok: false, why: `GET ${path} could not be read (${String(e?.message ?? e).split('\n')[0]}). ${NEXT_AUTH}` };
        }
        if (r === null || typeof r !== 'object' || (r.ok !== true && typeof r.why !== 'string')) {
            r = { ok: false, why: `GET ${path} could not be read (no result). ${NEXT_AUTH}` };
        } else if (r.ok === true) {
            const cut = truncated(r.body);
            if (cut !== null) r = { ok: false, why: `GET ${path} could not be read completely (${cut}). Next step: add pagination to ${SELF_REL}.` };
        }
        cache.set(path, r);
        return r;
    };
}

// --- owner and repo ---------------------------------------------------------

export function loadConfig(root) {
    const resolved = resolveConfig(join(root, MANIFEST_REL));
    if (resolved.config === undefined || resolved.failures.length > 0) {
        throw new Error(`${MANIFEST_REL} does not resolve, so the owner and repo cannot be derived. Next step: run node scripts/generate.mjs -- it reports the faulty key.`);
    }
    return resolved.config;
}

export function repoSlug(root, config = loadConfig(root)) {
    const raw = config.urls?.release_notes;
    let url = null;
    try {
        url = new URL(raw);
    } catch { /* reported below */ }
    const parts = url?.pathname.split('/').filter(Boolean) ?? [];
    if (url === null || url.hostname !== 'github.com' || parts.length < 2) {
        throw new Error(`${MANIFEST_REL} [urls] release_notes is ${JSON.stringify(raw)}, which is not https://github.com/<owner>/<repo>/..., so the owner and repo cannot be derived. Next step: correct it in ${MANIFEST_REL}.`);
    }
    return { owner: parts[0], repo: parts[1], org: parts[0] };
}

const fill = (tpl, slug) => tpl.replace(/\{(owner|repo|org)\}/g, (_, k) => slug[k]);

// --- comparison -------------------------------------------------------------

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// Keep only what the declaration states: declared keys of objects, and for an
// array of declared objects, the union of their keys on each live element.
function project(decl, live) {
    if (Array.isArray(decl) && Array.isArray(live)) {
        const keys = decl.length > 0 && decl.every(isObj) ? [...new Set(decl.flatMap(Object.keys))] : null;
        return live.map(x => (keys !== null && isObj(x) ? Object.fromEntries(keys.map(k => [k, x[k]])) : x));
    }
    if (isObj(decl) && isObj(live)) return Object.fromEntries(Object.keys(decl).map(k => [k, project(decl[k], live[k])]));
    return live;
}

// Canonical text: sorted keys, and every array compared as a set.
function canon(v) {
    if (Array.isArray(v)) return `[${v.map(canon).sort().join(',')}]`;
    if (isObj(v)) return `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canon(v[k])}`).join(',')}}`;
    return JSON.stringify(v ?? null);
}

const same = (decl, live) => canon(decl) === canon(project(decl, live));
const show = (v) => JSON.stringify(v ?? null);
const where = (c) => (c.file ? `${c.id} (${SETTINGS_REL}/${c.file})` : c.id);

function projection(c, declared, live) {
    if (!isObj(live)) return [`${where(c)}: the live response is ${show(live)}, not an object. Next step: check the endpoint in ${SELF_REL}.`];
    return Object.keys(declared)
        .filter(k => !same(declared[k], live[k]))
        .map(k => `${where(c)}: ${k} is ${show(live[k])} live but ${show(declared[k])} declared. Next step: ${APPLY}.`);
}

// --- the table --------------------------------------------------------------

// RESEARCH Pattern 1's apply order; planWrites follows this order.
export const CONTROLS = Object.freeze([
    {
        id: 'actions-permissions',
        file: 'actions-permissions.json',
        write: { method: 'PUT', path: 'repos/{owner}/{repo}/actions/permissions' },
        read: 'repos/{owner}/{repo}/actions/permissions',
        compare: projection,
    },
].map(Object.freeze));

const referencedFiles = () => [...new Set(CONTROLS.map(c => c.file).filter(Boolean))].sort();

function listSettingsDir(root) {
    try {
        return readdirSync(join(root, SETTINGS_REL)).sort();
    } catch {
        return null;
    }
}

const readSettingsBody = (root) => (file) => JSON.parse(readFileSync(join(root, SETTINGS_REL, file), 'utf8'));

// Read every declared body that is present; a parse error is a failure.
function loadBodies(root, overrides, failures) {
    const listed = (overrides.listSettings ?? (() => listSettingsDir(root)))();
    const readBody = overrides.readBody ?? readSettingsBody(root);
    const bodies = {};
    if (listed === null || listed.length === 0) {
        failures.push(`${SETTINGS_REL}/ is ${listed === null ? 'absent' : 'empty'}, so no control is declared. Next step: restore the settings bodies from git.`);
        if (listed === null) return bodies;
    }
    const want = referencedFiles();
    for (const f of listed.filter(f => !want.includes(f))) {
        failures.push(`${SETTINGS_REL}/${f} is an orphan: no CONTROLS entry in ${SELF_REL} references it. Next step: add its control to CONTROLS, or delete the file.`);
    }
    for (const f of want) {
        if (!listed.includes(f)) {
            failures.push(`${SETTINGS_REL}/${f} is missing, but CONTROLS references it. Next step: restore it from git.`);
            continue;
        }
        try {
            bodies[f] = readBody(f);
        } catch (e) {
            failures.push(`${SETTINGS_REL}/${f} could not be read as JSON (${String(e?.message ?? e).split('\n')[0]}). Next step: fix the file.`);
        }
    }
    return bodies;
}

function context(root, overrides, failures) {
    let config = null;
    let slug = null;
    try {
        config = overrides.config ?? loadConfig(root);
        slug = repoSlug(root, config);
    } catch (e) {
        failures.push(e.message);
    }
    const bodies = loadBodies(root, overrides, failures);
    const get = safeGetter(overrides.get ?? ghGet);
    return { root, config, slug, bodies, get, fill: (tpl) => fill(tpl, slug) };
}

export function runChecks(root, overrides = {}) {
    const failures = [];
    const compared = [];
    const ctx = context(root, overrides, failures);
    if (ctx.slug === null) return { failures, compared, slug: null };
    for (const c of CONTROLS) {
        const declared = c.file ? ctx.bodies[c.file] : null;
        if (c.file && declared === undefined) continue; // already red: missing or unparseable
        const r = ctx.get(ctx.fill(c.read));
        if (!r.ok) {
            failures.push(`${c.id}: ${r.why}`);
            continue;
        }
        compared.push(c.id);
        failures.push(...c.compare(c, declared, r.body, ctx));
    }
    return { failures, compared, slug: ctx.slug };
}

// The ordered writes. Each entry carries the parsed body; a control may
// replace its write with a BLOCKED reason through its plan hook.
export function planWrites(root, get = ghGet, overrides = {}) {
    const errors = [];
    const ctx = context(root, { ...overrides, get }, errors);
    const writes = [];
    const blocked = [];
    if (ctx.slug === null) return { writes, blocked, errors };
    for (const c of CONTROLS) {
        if (c.write === null) continue;
        const declared = c.file ? ctx.bodies[c.file] : null;
        if (c.file && declared === undefined) continue; // already in errors
        const step = c.plan
            ? c.plan(c, declared, ctx)
            : { write: { method: c.write.method, path: ctx.fill(c.write.path), body: c.bodiless ? null : declared } };
        if (step.blocked) blocked.push(step.blocked);
        if (step.error) errors.push(step.error);
        if (step.write) writes.push({ id: c.id, file: c.file, ...step.write });
    }
    return { writes, blocked, errors };
}

// --- main -------------------------------------------------------------------

function main() {
    const args = process.argv.slice(2);
    for (const a of args) {
        if (a !== '--self-test') {
            console.error(`${NAME}: FAIL -- unknown argument '${a}'`);
            console.error(`  Next step: run: node ${SELF_REL}, or add --self-test to prove the comparison discriminates.`);
            return 2;
        }
    }
    if (args.includes('--self-test')) return selfTest();
    const { failures, compared, slug } = runChecks(REPO_ROOT);
    const target = slug ? `${slug.owner}/${slug.repo}` : 'the configured repo';
    if (failures.length > 0) {
        console.error(`${NAME}: FAIL -- ${failures.length} problem(s) between ${SETTINGS_REL}/ and the live state of ${target}`);
        failures.forEach(f => console.error(`  ${f}`));
        return 1;
    }
    console.log(`${NAME}: PASS -- ${compared.length} control(s) equal the live state of ${target}: ${compared.join(', ')}`);
    return 0;
}

// --- self-test --------------------------------------------------------------

const clone = (v) => JSON.parse(JSON.stringify(v));

// The live state the declared bodies would produce, in GitHub's response
// shape, with the extra keys GitHub adds so the projection is exercised.
function fakeState(ctx) {
    const p = ctx.fill;
    const b = ctx.bodies;
    return {
        [p('repos/{owner}/{repo}/actions/permissions')]: {
            ...b['actions-permissions.json'],
            selected_actions_url: `https://api.github.com/${p('repos/{owner}/{repo}/actions/permissions/selected-actions')}`,
        },
    };
}

const getterOf = (state) => (path) => (Object.hasOwn(state, path)
    ? { ok: true, body: clone(state[path]) }
    : { ok: false, why: `GET ${path} could not be read (HTTP 404 in the self-test fixture). ${NEXT_AUTH}` });

function selfTest() {
    const setupFailures = [];
    const ctx = context(REPO_ROOT, { get: () => { throw new Error('no network in the self-test'); } }, setupFailures);
    if (setupFailures.length > 0) {
        console.error(`${NAME}: --self-test FAIL -- the declared settings do not load, so no plant would mean anything:`);
        setupFailures.forEach(f => console.error(`  ${f}`));
        return 1;
    }
    const base = fakeState(ctx);
    const listed = listSettingsDir(REPO_ROOT);
    const fixed = { config: ctx.config, listSettings: () => listed };
    const run = (extra) => runChecks(REPO_ROOT, { ...fixed, get: getterOf(base), ...extra });
    const mutated = (mutate) => {
        const s = clone(base);
        mutate(s, ctx.fill);
        return { get: getterOf(s) };
    };

    const baseline = run({});
    if (baseline.failures.length > 0 || baseline.compared.length !== CONTROLS.length) {
        console.error(`${NAME}: --self-test FAIL -- the declared state served back is not green, so the planted-fault results below would mean nothing:`);
        baseline.failures.forEach(f => console.error(`  ${f}`));
        return 1;
    }
    console.log(`  ok  baseline: the declared state served back -> green (${baseline.compared.length} control(s))`);

    const PERMS = 'repos/{owner}/{repo}/actions/permissions';
    const plants = [
        ['allowed_actions all', mutated((s, p) => { s[p(PERMS)].allowed_actions = 'all'; }), ['actions-permissions', '"all"']],
        ['sha_pinning_required false', mutated((s, p) => { s[p(PERMS)].sha_pinning_required = false; }), ['actions-permissions', 'sha_pinning_required']],
        ['an orphan settings file', { listSettings: () => [...listed, 'orphan.json'] }, ['orphan.json', 'orphan']],
        ['a missing settings file', { listSettings: () => listed.filter(f => f !== 'actions-permissions.json') }, ['actions-permissions.json', 'missing']],
        ['an empty settings directory', { listSettings: () => [] }, [SETTINGS_REL, 'empty']],
        ['a getter that throws', { get: () => { throw new Error('planted: gh is not installed'); } }, ['could not be read', 'planted: gh is not installed']],
    ];

    let failed = 0;
    for (const [name, extra, needles] of plants) {
        const { failures } = run(extra);
        if (failures.some(f => needles.every(n => f.includes(n)))) {
            console.log(`  ok  ${name} -> red, naming ${needles.map(n => `'${n}'`).join(' and ')}`);
        } else {
            console.error(`${NAME}: --self-test FAIL -- '${name}' did not go red naming ${needles.join(' and ')}; got: ${failures.join(' | ') || '(no failures at all)'}`);
            failed += 1;
        }
    }

    if (failed > 0) return 1;
    console.log(`${NAME}: --self-test PASS -- ${plants.length} planted faults went red naming the control, and the declared state stayed green`);
    return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(main());
