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

import { releaseIdentity, resolveConfig } from './generate.mjs';

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

const PERMISSIONS_PATH = 'repos/{owner}/{repo}/actions/permissions';
const RELEASES_PATH = 'repos/{owner}/{repo}/releases?per_page=1';

// GET selected-actions answers 409 while allowed_actions is not 'selected'.
// That is a readable state, and drift: report it as such instead of reading.
function requiresSelected(c, ctx) {
    const r = ctx.get(ctx.fill(PERMISSIONS_PATH));
    if (!r.ok) return `${c.id}: ${r.why}`;
    if (r.body?.allowed_actions === 'selected') return null;
    return `${where(c)}: the admission list does not apply, because allowed_actions is ${show(r.body?.allowed_actions)} live, not "selected" (GitHub answers 409 for this list until then). Next step: ${APPLY}.`;
}

// GH-09: immutable releases may be enabled only while no Release exists.
function planImmutableReleases(c, declared, ctx) {
    const r = ctx.get(ctx.fill(RELEASES_PATH));
    if (!r.ok) return { blocked: `immutable releases are not enabled because the zero-Releases check could not run (GH-09): ${r.why}`, error: r.why };
    if (!Array.isArray(r.body)) {
        const why = `GET ${ctx.fill(RELEASES_PATH)} returned ${show(r.body)}, not a list`;
        return { blocked: `immutable releases are not enabled because the zero-Releases check could not run (GH-09): ${why}`, error: why };
    }
    if (r.body.length > 0) {
        // per_page=1: one item means at least one Release.
        return { blocked: `immutable releases may be enabled only while the repository has zero Releases (GH-09); at least ${r.body.length} Release(s) exist` };
    }
    return { write: { method: c.write.method, path: ctx.fill(c.write.path), body: null } };
}

function secretCount(c, declared, live) {
    if (live?.total_count === 0) return [];
    return [`${c.id}: the repository holds ${show(live?.total_count)} Actions secret(s) (${(live?.secrets ?? []).map(s => s.name).join(', ') || 'names unread'}); the count must be 0, because every secret lives in a branch-restricted environment (GH-08). Next step: move each one to its environment and delete the repository secret.`];
}

// --- rulesets ---------------------------------------------------------------

const RULESETS_PATH = 'repos/{owner}/{repo}/rulesets?per_page=100';
const RULESET_PATH = 'repos/{owner}/{repo}/rulesets/{id}';
const INSTALLATIONS_PATH = 'orgs/{org}/installations?per_page=100';
// An actor that is a person or the owner role: the owner can bypass such a ruleset.
const HUMAN_ACTORS = new Set(['OrganizationAdmin', 'User', 'Team', 'RepositoryRole']);
const appRef = (a) => (typeof a?.actor_id === 'string' ? /^app:(.+)$/.exec(a.actor_id)?.[1] ?? null : null);

// "app:<slug>" becomes the App's app_id from the org's installations, never
// the installation id; the tree cannot carry an id that does not exist yet.
export function resolveActors(body, installations) {
    const out = clone(body);
    for (const a of out.bypass_actors ?? []) {
        const slug = appRef(a);
        if (slug === null) continue;
        const inst = (installations ?? []).find(i => i.app_slug === slug);
        if (inst === undefined) throw new Error(`${slug} is not installed on the org; the owner creates and installs it at plan 41-04`);
        a.actor_id = inst.app_id;
    }
    return out;
}

function resolvedBody(c, declared, ctx) {
    if (!(declared.bypass_actors ?? []).some(a => appRef(a) !== null)) return { body: declared };
    const r = ctx.get(ctx.fill(INSTALLATIONS_PATH));
    if (!r.ok) return { why: `${c.id}: ${r.why}`, unreadable: true };
    try {
        return { body: resolveActors(declared, r.body?.installations) };
    } catch (e) {
        return { why: `${where(c)}: ${e.message}. Next step: install it, then re-run.` };
    }
}

// OrganizationAdmin compares on type and mode only, whatever id GitHub
// returns for it; an Integration id compares as an integer.
const actorKey = (a) => `${a.actor_type}|${a.actor_type === 'OrganizationAdmin' ? '*' : Number(a.actor_id)}|${a.bypass_mode}`;
const onMain = (body) => (body.conditions?.ref_name?.include ?? []).includes('refs/heads/main');

function compareRuleset(c, declared, list, ctx) {
    if (!Array.isArray(list)) return [`${where(c)}: the live ruleset list is ${show(list)}, not a list. Next step: check the endpoint in ${SELF_REL}.`];
    const found = list.filter(r => r.name === declared.name);
    if (found.length === 0) return [`${where(c)}: ruleset ${declared.name} is missing from the live repo. Next step: ${APPLY}.`];
    if (found.length > 1) return [`${where(c)}: ${found.length} live rulesets are named ${declared.name} (ids ${found.map(r => r.id).join(', ')}). Next step: delete the duplicates in the repository settings.`];
    const r = ctx.get(ctx.fill(RULESET_PATH).replace('{id}', found[0].id));
    if (!r.ok) return [`${c.id}: ${r.why}`];
    const live = r.body;
    const f = [];
    const drift = (what, l, d) => f.push(`${where(c)}: ${what} is ${show(l)} live but ${show(d)} declared. Next step: ${APPLY}.`);
    for (const k of ['target', 'enforcement']) if (live?.[k] !== declared[k]) drift(k, live?.[k], declared[k]);
    if (!same(declared.conditions, live?.conditions)) drift('conditions', live?.conditions, declared.conditions);
    const liveRules = Array.isArray(live?.rules) ? live.rules : [];
    const types = (rules) => rules.map(x => x.type);
    if (canon(types(declared.rules)) !== canon(types(liveRules))) drift('the rule type set', types(liveRules).sort(), types(declared.rules).sort());
    for (const rule of declared.rules.filter(x => x.parameters !== undefined)) {
        const lr = liveRules.find(x => x.type === rule.type);
        if (lr !== undefined && !same(rule.parameters, lr.parameters)) drift(`rule ${rule.type} parameters`, project(rule.parameters, lr.parameters), rule.parameters);
    }
    const liveActors = Array.isArray(live?.bypass_actors) ? live.bypass_actors : [];
    const res = resolvedBody(c, declared, ctx);
    if (res.why !== undefined) {
        f.push(res.why);
    } else {
        const want = res.body.bypass_actors.map(actorKey).sort();
        const got = liveActors.map(actorKey).sort();
        if (want.join(',') !== got.join(',')) drift('the bypass actor set (actor_type|actor_id|bypass_mode)', got, want);
    }
    // Named assertions: these hold whatever the declaration says.
    if (onMain(declared)) {
        for (const a of liveActors.filter(x => x.actor_type === 'Integration')) {
            f.push(`${where(c)}: Integration ${a.actor_id} is a bypass actor, and no App may bypass a main ruleset (GH-05). Next step: remove it in the repository settings.`);
        }
    }
    for (const lr of liveRules.filter(x => x.type === 'pull_request')) {
        const n = lr.parameters?.required_approving_review_count;
        if (n !== 1) f.push(`${where(c)}: required_approving_review_count is ${show(n)} live; it must equal exactly 1 (GH-05). Next step: ${APPLY}.`);
    }
    if (!(declared.bypass_actors ?? []).some(a => HUMAN_ACTORS.has(a.actor_type)) && live?.current_user_can_bypass !== 'never') {
        f.push(`${where(c)}: current_user_can_bypass is ${show(live?.current_user_can_bypass)} for the owner's token, not "never", so the owner could bypass a ruleset that names no person. Next step: remove the owner's bypass in the repository settings.`);
    }
    return f;
}

// The live ruleset name set must equal the declared one; each ruleset entry
// names its own absence, so this names the extras.
function rulesetSet(c, declared, list, ctx) {
    if (!Array.isArray(list)) return [`${c.id}: the live ruleset list is ${show(list)}, not a list. Next step: check the endpoint in ${SELF_REL}.`];
    const names = new Set(CONTROLS.filter(x => x.compare === compareRuleset).map(x => ctx.bodies[x.file]?.name));
    return list.filter(r => !names.has(r.name)).map(r => `${c.id}: live ruleset ${r.name} (id ${r.id}) is extra: no ${SETTINGS_REL}/ruleset-*.json declares it. Next step: declare it in a reviewed commit, or delete it in the repository settings.`);
}

// Found by name means PUT by id; absent means POST. A second run never
// creates a duplicate.
function planRuleset(c, declared, ctx) {
    const lr = ctx.get(ctx.fill(RULESETS_PATH));
    if (!lr.ok) return { blocked: `ruleset ${declared.name} is not written: ${lr.why}`, error: lr.why };
    const res = resolvedBody(c, declared, ctx);
    if (res.why !== undefined) return { blocked: res.why, error: res.unreadable ? res.why : undefined };
    const found = Array.isArray(lr.body) ? lr.body.find(r => r.name === declared.name) : undefined;
    return {
        write: found
            ? { method: 'PUT', path: ctx.fill(RULESET_PATH).replace('{id}', found.id), body: res.body }
            : { method: c.write.create.method, path: ctx.fill(c.write.create.path), body: res.body },
    };
}

// --- the static tag-pattern check (no network) -------------------------------

// Ruleset ref patterns are fnmatch: ** crosses '/', * and ? stay within one
// segment, [...] classes pass through, everything else is literal.
export function fnmatchRegex(pattern) {
    let re = '';
    for (let i = 0; i < pattern.length; i += 1) {
        const ch = pattern[i];
        if (ch === '*' && pattern[i + 1] === '*') {
            re += '.*';
            i += 1;
        } else if (ch === '*') {
            re += '[^/]*';
        } else if (ch === '?') {
            re += '[^/]';
        } else if (ch === '[' && pattern.indexOf(']', i + 2) > 0) {
            const end = pattern.indexOf(']', i + 2);
            const cls = pattern.slice(i + 1, end);
            re += `[${cls.startsWith('!') ? `^${cls.slice(1)}` : cls}]`.replace(/\\/g, '\\\\');
            i = end;
        } else {
            re += ch.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
        }
    }
    return new RegExp(`^${re}$`);
}

// The release-tag shape; the same regex as RELEASE_TAG in scripts/verify-release-identity.mjs.
const RELEASE_TAG = /^v(\d+)\.(\d+)(?:\.(\d+))?-(\d+)$/;
// The x.0 release of the pinned ESR major, so the two-part key comes from
// releaseIdentity itself. Derived from the pin: verify-upstream-pins refuses a
// tag literal outside configuration.toml.
const twoPartConfig = (config) => ({
    ...config,
    upstreams: {
        ...config.upstreams,
        firefox_esr_tag: String(config.upstreams?.firefox_esr_tag).replace(/^([A-Za-z]+_\d+)_\d+(?:_\d+)?(esr_RELEASE)$/, '$1_0$2'),
    },
});

function gitTags(root) {
    try {
        return execFileSync('git', ['tag', '-l'], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
    } catch {
        return null;
    }
}

function tagPatternFailures(ctx, tags) {
    const f = [];
    for (const c of CONTROLS.filter(x => x.compare === compareRuleset)) {
        const body = ctx.bodies[c.file];
        if (body?.target !== 'tag') continue;
        const inc = (body.conditions?.ref_name?.include ?? []).map(fnmatchRegex);
        const exc = (body.conditions?.ref_name?.exclude ?? []).map(fnmatchRegex);
        const hits = (ref) => inc.some(re => re.test(ref)) && !exc.some(re => re.test(ref));
        const pat = show(body.conditions?.ref_name?.include);
        const twoPart = twoPartConfig(ctx.config);
        for (const [key, from] of [[releaseIdentity(ctx.config).releaseKey, MANIFEST_REL], [releaseIdentity(twoPart).releaseKey, `the x.0 ESR tag ${twoPart.upstreams.firefox_esr_tag}`]]) {
            if (!hits(`refs/tags/${key}`)) f.push(`${where(c)}: the include pattern ${pat} does not match release key ${key} (refs/tags/${key}), derived by releaseIdentity() from ${from}. Next step: widen the pattern.`);
        }
        if (tags === null) {
            f.push(`${where(c)}: git tag -l failed, so the pattern cannot be checked against milestone tags. Next step: run this check inside the repository.`);
        } else {
            const milestone = tags.filter(t => !RELEASE_TAG.test(t) && hits(`refs/tags/${t}`));
            if (milestone.length > 0) f.push(`${where(c)}: the include pattern ${pat} matches milestone tag(s) ${milestone.join(', ')}, which are not release-shaped; only the bot App could then create them. Next step: narrow the pattern.`);
        }
        if (hits('refs/heads/main')) f.push(`${where(c)}: the include pattern ${pat} matches refs/heads/main. Next step: narrow the pattern to refs/tags/.`);
    }
    return f;
}

const ruleset = (id) => ({
    id,
    file: `ruleset-${id}.json`,
    write: { method: 'PUT', path: RULESET_PATH, create: { method: 'POST', path: 'repos/{owner}/{repo}/rulesets' } },
    plan: planRuleset,
    read: RULESETS_PATH,
    compare: compareRuleset,
});

// RESEARCH Pattern 1's apply order; planWrites follows this order. Plan 41-02
// inserts the environments directly before the rulesets. The repo PATCH stays
// last, so a refused has_discussions key cannot stop any other write.
export const CONTROLS = Object.freeze([
    {
        id: 'actions-permissions',
        file: 'actions-permissions.json',
        write: { method: 'PUT', path: PERMISSIONS_PATH },
        read: PERMISSIONS_PATH,
        compare: projection,
    },
    {
        id: 'actions-selected',
        file: 'actions-selected.json',
        write: { method: 'PUT', path: 'repos/{owner}/{repo}/actions/permissions/selected-actions' },
        read: 'repos/{owner}/{repo}/actions/permissions/selected-actions',
        gate: requiresSelected,
        compare: projection,
    },
    {
        id: 'workflow-permissions',
        file: 'workflow-permissions.json',
        write: { method: 'PUT', path: 'repos/{owner}/{repo}/actions/permissions/workflow' },
        read: 'repos/{owner}/{repo}/actions/permissions/workflow',
        compare: projection,
    },
    {
        id: 'fork-pr-approval',
        file: 'fork-pr-approval.json',
        write: { method: 'PUT', path: 'repos/{owner}/{repo}/actions/permissions/fork-pr-contributor-approval' },
        read: 'repos/{owner}/{repo}/actions/permissions/fork-pr-contributor-approval',
        compare: projection,
    },
    ruleset('main-integrity'),
    ruleset('main-review'),
    ruleset('release-tags'),
    {
        id: 'rulesets',
        file: null,
        write: null,
        read: RULESETS_PATH,
        compare: rulesetSet,
    },
    {
        id: 'immutable-releases',
        file: 'immutable-releases.json',
        write: { method: 'PUT', path: 'repos/{owner}/{repo}/immutable-releases' },
        bodiless: true,
        plan: planImmutableReleases,
        read: 'repos/{owner}/{repo}/immutable-releases',
        compare: projection, // enabled only; enforced_by_owner is GitHub's and never decides
    },
    {
        id: 'private-vulnerability-reporting',
        file: 'private-vulnerability-reporting.json',
        write: { method: 'PUT', path: 'repos/{owner}/{repo}/private-vulnerability-reporting' },
        bodiless: true,
        read: 'repos/{owner}/{repo}/private-vulnerability-reporting',
        compare: projection,
    },
    {
        id: 'repo',
        file: 'repo.json',
        write: { method: 'PATCH', path: 'repos/{owner}/{repo}' },
        read: 'repos/{owner}/{repo}',
        compare: projection,
    },
    {
        id: 'repository-secrets',
        file: null,
        write: null,
        read: 'repos/{owner}/{repo}/actions/secrets?per_page=100',
        compare: secretCount,
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
    failures.push(...tagPatternFailures(ctx, overrides.tags !== undefined ? overrides.tags : gitTags(root)));
    for (const c of CONTROLS) {
        const declared = c.file ? ctx.bodies[c.file] : null;
        if (c.file && declared === undefined) continue; // already red: missing or unparseable
        const gated = c.gate ? c.gate(c, ctx) : null;
        if (gated !== null) {
            failures.push(gated);
            continue;
        }
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
    const { owner, repo } = ctx.slug;
    return {
        [p(PERMISSIONS_PATH)]: {
            ...b['actions-permissions.json'],
            selected_actions_url: `https://api.github.com/${p('repos/{owner}/{repo}/actions/permissions/selected-actions')}`,
        },
        [p('repos/{owner}/{repo}/actions/permissions/selected-actions')]: { ...b['actions-selected.json'] },
        [p('repos/{owner}/{repo}/actions/permissions/workflow')]: { ...b['workflow-permissions.json'] },
        [p('repos/{owner}/{repo}/actions/permissions/fork-pr-contributor-approval')]: { ...b['fork-pr-approval.json'] },
        [p('repos/{owner}/{repo}/immutable-releases')]: { ...b['immutable-releases.json'], enforced_by_owner: false },
        [p('repos/{owner}/{repo}/private-vulnerability-reporting')]: { ...b['private-vulnerability-reporting.json'] },
        [p('repos/{owner}/{repo}')]: {
            id: 1, node_id: 'R_fixture', name: repo, full_name: `${owner}/${repo}`, private: false,
            visibility: 'public', default_branch: 'main', has_issues: true, allow_squash_merge: true,
            ...b['repo.json'],
        },
        [p('repos/{owner}/{repo}/actions/secrets?per_page=100')]: { total_count: 0, secrets: [] },
        [p(RELEASES_PATH)]: [],
        ...fakeRulesets(ctx),
    };
}

// Fixture ids: an installation id and an app_id that differ, so a resolver
// taking the wrong one goes red.
const FAKE_INSTALLATION_ID = 800001;
const FAKE_APP_ID = 900001;

function fakeRulesets(ctx) {
    const p = ctx.fill;
    const { owner, repo } = ctx.slug;
    const rs = CONTROLS.filter(c => c.compare === compareRuleset).map(c => ctx.bodies[c.file]);
    const slugs = [...new Set(rs.flatMap(b => b.bypass_actors.map(appRef)).filter(Boolean))];
    const installations = slugs.map((app_slug, i) => ({
        id: FAKE_INSTALLATION_ID + i, app_id: FAKE_APP_ID + i, app_slug, target_type: 'Organization',
        repository_selection: 'selected', permissions: { metadata: 'read' }, events: [],
    }));
    const state = { [p(INSTALLATIONS_PATH)]: { total_count: installations.length, installations } };
    const list = rs.map((b, i) => ({
        id: 1001 + i, name: b.name, target: b.target, source_type: 'Repository', source: `${owner}/${repo}`,
        enforcement: b.enforcement, node_id: `RRS_fixture${i}`, created_at: '2026-10-22T00:00:00Z', updated_at: '2026-10-22T00:00:00Z',
        _links: { self: { href: `https://api.github.com/${p('repos/{owner}/{repo}/rulesets')}/${1001 + i}` } },
    }));
    state[p(RULESETS_PATH)] = list;
    rs.forEach((b, i) => {
        const live = resolveActors(b, installations);
        live.rules = live.rules.map(r => (r.type === 'pull_request'
            ? { ...r, parameters: { ...r.parameters, automatic_copilot_code_review_enabled: false } }
            : r));
        live.conditions.ref_name.exclude = [...live.conditions.ref_name.exclude];
        live.current_user_can_bypass = b.bypass_actors.some(a => HUMAN_ACTORS.has(a.actor_type)) ? 'always' : 'never';
        state[p(RULESET_PATH).replace('{id}', 1001 + i)] = { ...list[i], ...live };
    });
    return state;
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
    const fixed = { config: ctx.config, listSettings: () => listed, tags: ['v1.0', 'v1.4'] };
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

    const PERMS = PERMISSIONS_PATH;
    const rulesetId = (name) => base[ctx.fill(RULESETS_PATH)].find(r => r.name === name).id;
    const ruleMut = (name, mutate) => mutated((s, p) => mutate(s[p(RULESET_PATH).replace('{id}', rulesetId(name))]));
    const pr = (r) => r.rules.find(x => x.type === 'pull_request').parameters;
    const readBody = readSettingsBody(REPO_ROOT);
    const withTagPattern = (include) => ({
        readBody: (f) => {
            const b = readBody(f);
            if (f === 'ruleset-release-tags.json') b.conditions.ref_name.include = include;
            return b;
        },
    });
    const twoPartKey = releaseIdentity(twoPartConfig(ctx.config)).releaseKey;
    const set = (path, key, value) => mutated((s, p) => { s[p(path)][key] = value; });
    const plants = [
        ['allowed_actions all', set(PERMS, 'allowed_actions', 'all'), ['actions-permissions', '"all"']],
        ['allowed_actions all leaves the admission list unapplied', set(PERMS, 'allowed_actions', 'all'), ['actions-selected', 'does not apply']],
        ['sha_pinning_required false', set(PERMS, 'sha_pinning_required', false), ['actions-permissions', 'sha_pinning_required']],
        ['patterns_allowed without cachix/install-nix-action@*', set(`${PERMS}/selected-actions`, 'patterns_allowed', []), ['actions-selected', 'cachix/install-nix-action@*']],
        ['can_approve_pull_request_reviews true', set(`${PERMS}/workflow`, 'can_approve_pull_request_reviews', true), ['workflow-permissions', 'can_approve_pull_request_reviews']],
        ['fork approval first_time_contributors', set(`${PERMS}/fork-pr-contributor-approval`, 'approval_policy', 'first_time_contributors'), ['fork-pr-approval', '"first_time_contributors"']],
        ['fork approval first_time_contributors_new_to_github', set(`${PERMS}/fork-pr-contributor-approval`, 'approval_policy', 'first_time_contributors_new_to_github'), ['fork-pr-approval', 'first_time_contributors_new_to_github']],
        ['an unreadable fork approval endpoint', mutated((s, p) => { delete s[p(`${PERMS}/fork-pr-contributor-approval`)]; }), ['fork-pr-approval', 'could not be read']],
        ['has_discussions false', set('repos/{owner}/{repo}', 'has_discussions', false), ['repo (', 'has_discussions']],
        ['allow_auto_merge false', set('repos/{owner}/{repo}', 'allow_auto_merge', false), ['repo (', 'allow_auto_merge']],
        ['immutable releases disabled', set('repos/{owner}/{repo}/immutable-releases', 'enabled', false), ['immutable-releases', 'enabled']],
        ['private vulnerability reporting disabled', set('repos/{owner}/{repo}/private-vulnerability-reporting', 'enabled', false), ['private-vulnerability-reporting', 'enabled']],
        ['main-review missing from the live list', mutated((s, p) => { s[p(RULESETS_PATH)] = s[p(RULESETS_PATH)].filter(r => r.name !== 'main-review'); }), ['main-review', 'missing']],
        ['an approving-review count of 2', ruleMut('main-review', (r) => { pr(r).required_approving_review_count = 2; }), ['main-review', 'required_approving_review_count is 2']],
        ['an approving-review count of 0', ruleMut('main-review', (r) => { pr(r).required_approving_review_count = 0; }), ['main-review', 'required_approving_review_count is 0']],
        ['an Integration bypass actor on main-review', ruleMut('main-review', (r) => { r.bypass_actors.push({ actor_id: FAKE_APP_ID, actor_type: 'Integration', bypass_mode: 'always' }); }), ['main-review', 'no App may bypass a main ruleset']],
        ['current_user_can_bypass always on main-integrity', ruleMut('main-integrity', (r) => { r.current_user_can_bypass = 'always'; }), ['main-integrity', 'current_user_can_bypass is "always"']],
        ['a release-tags bypass actor holding the installation id', ruleMut('release-tags', (r) => { r.bypass_actors[0].actor_id = FAKE_INSTALLATION_ID; }), ['release-tags', String(FAKE_INSTALLATION_ID)]],
        ['the bot App not installed', mutated((s, p) => { s[p(INSTALLATIONS_PATH)] = { total_count: 0, installations: [] }; }), ['release-tags', 'is not installed on the org']],
        ['an extra live ruleset', mutated((s, p) => { s[p(RULESETS_PATH)].push({ id: 1999, name: 'stray-ruleset', target: 'branch', enforcement: 'active' }); }), ['stray-ruleset', 'extra']],
        ['release-tags pattern refs/tags/v*', withTagPattern(['refs/tags/v*']), ['release-tags', 'milestone tag(s) v1.0, v1.4']],
        ['release-tags pattern missing the two-part key', withTagPattern(['refs/tags/v[0-9]*.[0-9]*.[0-9]*-[0-9]*']), ['release-tags', `release key ${twoPartKey}`]],
        ['release-tags pattern refs/** reaching main', withTagPattern(['refs/**']), ['release-tags', 'matches refs/heads/main']],
        ['a repository secret count of 1', mutated((s, p) => { s[p('repos/{owner}/{repo}/actions/secrets?per_page=100')] = { total_count: 1, secrets: [{ name: 'PLANTED' }] }; }), ['repository-secrets', 'holds 1']],
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

    // Controls: keys GitHub owns never decide.
    const controls = [
        ['immutable releases enforced_by_owner true', set('repos/{owner}/{repo}/immutable-releases', 'enforced_by_owner', true)],
        ['an OrganizationAdmin actor returned with actor_id 1', ruleMut('main-review', (r) => { r.bypass_actors[0].actor_id = 1; })],
    ];
    for (const [name, extra] of controls) {
        const { failures } = run(extra);
        if (failures.length === 0) {
            console.log(`  ok  control: ${name} -> green`);
        } else {
            console.error(`${NAME}: --self-test FAIL -- the control '${name}' went red: ${failures.join(' | ')}`);
            failed += 1;
        }
    }

    // planWrites: the apply order, and the zero-Releases guard (GH-09).
    const plan = (state) => planWrites(REPO_ROOT, getterOf(state), fixed);
    {
        const { writes, blocked, errors } = plan(base);
        const at = (id) => writes.findIndex(w => w.id === id);
        const order = CONTROLS.filter(c => c.write !== null).map(c => c.id);
        const inOrder = writes.length === order.length && writes.every((w, i) => w.id === order[i]);
        if (errors.length === 0 && blocked.length === 0 && inOrder && at('actions-permissions') < at('actions-selected') && at('immutable-releases') >= 0
            && writes[at('immutable-releases')].body === null && writes.at(-1).id === 'repo'
            && writes.filter(w => w.file?.startsWith('ruleset-')).every(w => w.method === 'PUT' && /\/rulesets\/\d+$/.test(w.path))
            && writes[at('release-tags')].body.bypass_actors[0].actor_id === FAKE_APP_ID) {
            console.log(`  ok  planWrites with zero Releases -> ${writes.map(w => w.id).join(', ')}`);
        } else {
            console.error(`${NAME}: --self-test FAIL -- planWrites order or content is wrong: ${writes.map(w => `${w.id}:${w.method}`).join(', ')} | blocked: ${blocked.join(' | ')} | errors: ${errors.join(' | ')}`);
            failed += 1;
        }
    }
    {
        const s = clone(base);
        s[ctx.fill(RELEASES_PATH)] = [{ id: 1 }];
        const { writes, blocked } = plan(s);
        if (!writes.some(w => w.id === 'immutable-releases') && blocked.some(b => b.includes('GH-09'))) {
            console.log(`  ok  planWrites with one Release -> no immutable-releases write, BLOCKED naming 'GH-09'`);
        } else {
            console.error(`${NAME}: --self-test FAIL -- planWrites with one Release did not block immutable releases: ${writes.map(w => w.id).join(', ')} | blocked: ${blocked.join(' | ') || '(none)'}`);
            failed += 1;
        }
    }

    {
        const s = clone(base);
        s[ctx.fill(RULESETS_PATH)] = [];
        s[ctx.fill(INSTALLATIONS_PATH)] = { total_count: 0, installations: [] };
        const { writes, blocked } = plan(s);
        const rs = writes.filter(w => w.file?.startsWith('ruleset-'));
        if (rs.length === 2 && rs.every(w => w.method === 'POST') && blocked.some(b => b.includes('release-tags') && b.includes('is not installed on the org'))) {
            console.log(`  ok  planWrites with no live ruleset and no bot App -> POST main-integrity and main-review, BLOCKED naming 'release-tags'`);
        } else {
            console.error(`${NAME}: --self-test FAIL -- planWrites over an empty ruleset list: ${rs.map(w => `${w.id}:${w.method}`).join(', ')} | blocked: ${blocked.join(' | ') || '(none)'}`);
            failed += 1;
        }
    }

    if (failed > 0) return 1;
    console.log(`${NAME}: --self-test PASS -- ${plants.length} planted faults went red naming the control, ${controls.length} control(s) and the declared state stayed green, and planWrites kept its order and its guard`);
    return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(main());
