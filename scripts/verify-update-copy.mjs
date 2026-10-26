#!/usr/bin/env node
// scripts/verify-update-copy.mjs
//
// The update-copy shape gate (Phase 46, UPD-32). The six contracted
// in-app-update strings (UPD-20 ready, UPD-21 cannot-update + macOS variant,
// UPD-22 could-not-check, UPD-23 two command titles) live once in the
// @powerbrowser/branding contribution
// (theia/extensions/branding/src/browser/powerbrowser-update-copy.ts). This
// row derives them at check time and applies the no-internal-identifier
// shape test: each names "PowerBrowser", matches neither the ALL-CAPS token
// pattern nor the DOTTED_KEY pattern, and ends with a next step that is an
// on-screen affordance. A seventh string is red (enumeration completeness),
// and the client must import the copy (no second literal site).
//
// HOW IT ASSERTS, and why it is not a banned-literal list. It DERIVES, from
// the contribution at check time, the exported const's string values (never
// a literal list in this row), plus the affordance set, and compares as set
// equality. A hand-kept list of forbidden strings can only ever agree with
// the tree it was written from; these comparisons go red on an ADDED leak,
// an ad-hoc literal in the client, a STALE string, and a REMOVED string.
//
// The once-per-session rule (UPD-22, review CR-06) is checked BEHAVIOURALLY:
// the real update client is transpiled from the tree and driven through its
// push path, stubbed only at the Theia import boundary. No constant stands in
// for the transition.
//
// Usage:
//   node scripts/verify-update-copy.mjs
//   node scripts/verify-update-copy.mjs --self-test
//
// Exit 0 pass, 1 fail. --self-test plants every fault in memory and requires
// each to go red naming the string or the prompt count; a check that can only
// go green is not a check.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const SELF = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(dirname(SELF), '..');
const NAME = 'update-copy';
const SELF_REL = 'scripts/verify-update-copy.mjs';

const args = process.argv.slice(2);
for (const a of args) {
    if (a !== '--self-test') {
        console.error(`${NAME}: FAIL -- unknown argument '${a}'`);
        console.error(`  Next step: run: node ${SELF_REL}, or add --self-test to prove the copy contract discriminates.`);
        process.exit(2);
    }
}

const COPY_REL = 'theia/extensions/branding/src/browser/powerbrowser-update-copy.ts';
const CLIENT_REL = 'theia/extensions/tab-uris/src/browser/update-client.ts';
const THEIA_PKG_REL = 'theia/package.json';

// An ALL-CAPS underscored token, four characters or more.
const ALL_CAPS_TOKEN = /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/g;
// A dotted key of three or more segments.
const DOTTED_KEY = /\b[A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*){2,}\b/g;

// The contracted affordance each BODY wires to (REQUIREMENTS.md UPD-20..22:
// the buttons + status-bar item, not sentence text). Titles are labels, not
// sentences: they name PowerBrowser with no internals and carry no
// affordance-ending requirement.
const BODY_AFFORDANCES = Object.freeze({
    readyBody: ['Restart now', 'Later', 'status'],
    cannotUpdateBody: ['Open download page', 'download page'],
    cannotUpdateMacBody: ['Applications folder', 'open it again', 'Open download page'],
    couldNotCheckBody: ['Check again'],
});
const TITLE_KEYS = new Set(['readyTitle', 'restartToUpdateTitle', 'checkForUpdatesTitle']);

function readText(root, rel) {
    try {
        return readFileSync(join(root, rel), 'utf8');
    } catch {
        return null;
    }
}

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

/** The exported const's NAME = "..." string values, in file order. */
function deriveStrings(src) {
    const m = src.match(/export\s+const\s+POWERBROWSER_UPDATE_COPY\s*=\s*Object\.freeze\(\{([\s\S]*?)\}\);/);
    if (!m) return null;
    const out = [];
    for (const x of m[1].matchAll(/([A-Za-z_$][\w$]*)\s*:\s*('(?:[^'\\\n]|\\.)*'|"(?:[^"\\]|\\.)*")/g)) {
        let value;
        try {
            value = JSON.parse(x[2].startsWith("'") ? `"${x[2].slice(1, -1).replace(/"/g, '\\"')}"` : x[2]);
        } catch {
            return null;
        }
        out.push({ key: x[1], value });
    }
    return out;
}

function lastSentence(text) {
    const parts = text.split(/(?<=[.!?])\s+/);
    return parts[parts.length - 1] ?? text;
}

/** Transpiles one TypeScript source to CommonJS and evaluates it against `requireFn`. */
function loadTsModule(ts, src, requireFn) {
    const out = ts.transpileModule(src, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2017,
            experimentalDecorators: true,
            esModuleInterop: true,
        },
    }).outputText;
    const mod = { exports: {} };
    runInNewContext(out, { require: requireFn, module: mod, exports: mod.exports }, { filename: 'transpiled-tree-source.js' });
    return mod.exports;
}

const flush = () => new Promise(resolveFlush => setImmediate(resolveFlush));

/**
 * Behavioural once-per-session check (UPD-22, review CR-06). Loads the REAL
 * update client from the tree and drives it through its push path: a failure
 * prompts once, a Check-again click starts a check (the warn stub answers the
 * click), a second failure in the same session does not prompt, a completed
 * check clears the flag, and the next failure prompts again. The prompt
 * counts must be 1, 1, 2. Returns failures; empty when the rule holds.
 */
export async function onceSessionFailures(read) {
    let ts;
    try {
        ts = createRequire(join(REPO_ROOT, THEIA_PKG_REL))('typescript');
    } catch {
        return [`theia/node_modules/typescript is not installed, so the once-per-session behaviour is unproven. Next step: run yarn install in theia/ (nix develop .#theia).`];
    }
    const copySrc = read(COPY_REL);
    const clientSrc = read(CLIENT_REL);
    if (copySrc === null || clientSrc === null) {
        return [`${COPY_REL} or ${CLIENT_REL} could not be read, so the once-per-session behaviour is unproven. Next step: restore them.`];
    }
    const copy = loadTsModule(ts, copySrc, () => ({}));
    const client = loadTsModule(ts, clientSrc, (id) => {
        switch (id) {
            case 'inversify':
            case '@theia/core/shared/inversify':
                return { inject: () => () => {}, injectable: () => () => {}, postConstruct: () => () => {} };
            case '@theia/core/lib/common':
                return { MessageService: class {}, CommandRegistry: class {} };
            case '@theia/core/lib/browser':
                return { FrontendApplication: class {}, StatusBar: class {}, StatusBarAlignment: { LEFT: 0, RIGHT: 1 } };
            case './web-tab':
                return { WEB_TAB_STATE_EVENT: 'PowerBrowserWebTabState' };
            case '@powerbrowser/branding/src/browser/powerbrowser-update-copy':
                return copy;
            default:
                throw new Error(`unexpected import '${id}' in the update client`);
        }
    });

    const instance = new client.UpdateClientContribution();
    let prompts = 0;
    instance.messages = {
        info: async () => undefined,
        warn: async (_body, action) => {
            prompts += 1;
            return action;
        },
    };
    instance.statusBar = { setElement: async () => undefined };
    instance.request = async () => ({ ok: true, accepted: true });
    const push = async (status) => {
        instance.onAppUpdatePush({ detail: { kind: 'appUpdate', status } });
        await flush();
        await flush();
    };

    await push('error');
    const first = prompts;
    await push('error');
    const second = prompts;
    await push('available');
    await push('error');
    const third = prompts;
    if (first !== 1 || second !== 1 || third !== 2) {
        return [`once-per-session: Check-again prompts were ${first}, ${second}, ${third} after failure, failure, completed check + failure; want 1, 1, 2. Next step: clear checkAgainShown only on an observed completed check in onAppUpdatePush, never on request acceptance (CR-06).`];
    }
    return [];
}

export function runChecks(root, overrides = {}) {
    const failures = [];
    const read = overrides.read ?? ((rel) => readText(root, rel));

    const copySrc = read(COPY_REL);
    if (copySrc === null) {
        failures.push(`${COPY_REL} could not be read, so the update copy contract is unproven. Next step: restore it.`);
        return { failures, strings: [] };
    }
    const strings = deriveStrings(copySrc);
    if (strings === null || strings.length === 0) {
        failures.push(`${COPY_REL} carries no POWERBROWSER_UPDATE_COPY strings this check can read, so the contract is unproven. Next step: check the instrument (${SELF_REL}: its derivation) against the contribution.`);
        return { failures, strings: [] };
    }

    // Six contracted strings. The count is the contract: a seventh string is
    // red until the row's affordance set covers it, and a removed one is red
    // as a missing member.
    const EXPECTED_KEYS = ['readyTitle', 'readyBody', 'cannotUpdateBody', 'cannotUpdateMacBody', 'couldNotCheckBody', 'restartToUpdateTitle', 'checkForUpdatesTitle'];
    // readyTitle + readyBody are the UPD-20 pair; the row counts seven keys
    // (title plus body) for six contracted sentences.
    if (strings.length !== EXPECTED_KEYS.length) {
        failures.push(`${COPY_REL} declares ${strings.length} update strings but the contract is ${EXPECTED_KEYS.length} (${EXPECTED_KEYS.join(', ')}); a new string is red until the row covers it. Next step: extend the row's affordance set or remove the string.`);
    }
    const keys = new Set(strings.map(s => s.key));
    for (const k of EXPECTED_KEYS) {
        if (!keys.has(k)) {
            failures.push(`${COPY_REL} is missing the contracted string '${k}'. Next step: restore it from REQUIREMENTS.md UPD-20..23.`);
        }
    }
    for (const s of strings) {
        if (!EXPECTED_KEYS.includes(s.key)) {
            failures.push(`${COPY_REL} carries an extra update string '${s.key}' the contract does not cover. Next step: extend the row or remove the string.`);
        }
    }

    for (const s of strings) {
        if (!s.value.includes('PowerBrowser')) {
            failures.push(`${COPY_REL} string '${s.key}' does not name the product ("PowerBrowser"): ${JSON.stringify(s.value)}. Next step: name PowerBrowser in the string.`);
        }
        for (const hit of s.value.match(ALL_CAPS_TOKEN) ?? []) {
            if (hit.length >= 4) {
                failures.push(`${COPY_REL} string '${s.key}' leaks the internal identifier "${hit}" (all-caps underscored token) into user-facing copy -- it belongs in a diagnostics field row. Next step: reword without the token.`);
            }
        }
        for (const hit of s.value.match(DOTTED_KEY) ?? []) {
            failures.push(`${COPY_REL} string '${s.key}' leaks the internal identifier "${hit}" (dotted multi-segment key) into user-facing copy -- it belongs in a diagnostics field row. Next step: reword without the key.`);
        }
        if (TITLE_KEYS.has(s.key)) continue;
        const affordances = BODY_AFFORDANCES[s.key];
        if (affordances === undefined) continue;
        // The affordance lives in the client wiring (buttons + status-bar),
        // not necessarily the sentence text: require the client to render it
        // next to the string's use. Derive from the client at check time.
        const clientForAffordance = read(CLIENT_REL) ?? '';
        const wired = affordances.some(a => clientForAffordance.includes(a) && clientForAffordance.includes(s.key));
        if (!wired) {
            failures.push(`${COPY_REL} string '${s.key}' has none of its contracted affordances (${affordances.join(' / ')}) wired in the client next to its use; every update body must end with a next step that is a real affordance. Next step: render one of them beside this string in ${CLIENT_REL}.`);
        }
    }

    // No second literal site: the client must import the copy module, and no
    // update sentence may appear literally in the client.
    const clientSrc = read(CLIENT_REL);
    if (clientSrc === null) {
        failures.push(`${CLIENT_REL} could not be read, so the single-site rule is unproven. Next step: restore it.`);
    } else {
        if (!clientSrc.includes('powerbrowser-update-copy')) {
            failures.push(`${CLIENT_REL} does not import the update copy module -- a literal sentence in the client would ship beside the contribution. Next step: import POWERBROWSER_UPDATE_COPY and use it.`);
        }
        for (const s of strings) {
            if (TITLE_KEYS.has(s.key)) continue;
            // A 24-char slice is long enough to be sentence-specific, short
            // enough to survive interpolation splits. Titles necessarily
            // appear via the label import; bodies must never be quoted.
            const needle = s.value.slice(0, 24);
            if (needle.length >= 24 && clientSrc.includes(needle)) {
                failures.push(`${CLIENT_REL} carries the literal sentence slice ${JSON.stringify(needle)}... -- update sentences live once in the branding contribution. Next step: replace it with the POWERBROWSER_UPDATE_COPY import.`);
            }
        }
        // The client must render the once-per-session rule: the flag names.
        if (!clientSrc.includes('Check again')) {
            failures.push(`${CLIENT_REL} never mentions 'Check again' -- the UPD-22 affordance has no client path. Next step: render the could-not-check notification with Check again.`);
        }
    }

    return { failures, strings };
}

async function main() {
    if (args.includes('--self-test')) return selfTest();
    const { failures, strings } = runChecks(REPO_ROOT);
    failures.push(...await onceSessionFailures((rel) => readText(REPO_ROOT, rel)));
    console.log(`${NAME}: ${strings.length} update string(s) derived from the branding contribution: ${strings.map(s => s.key).join(', ')}`);
    if (failures.length > 0) {
        console.error(`${NAME}: FAIL -- ${failures.length} problem(s) with the update copy contract.`);
        failures.forEach(f => console.error(`  ${f}`));
        return 1;
    }
    console.log(`${NAME}: PASS -- every update string names PowerBrowser, carries no internal identifier, and ends with an on-screen affordance; the client imports the single site; the once-per-session rule holds in the real client`);
    return 0;
}

async function selfTest() {
    const cache = new Map();
    const realRead = (rel) => {
        if (!cache.has(rel)) cache.set(rel, readText(REPO_ROOT, rel));
        return cache.get(rel);
    };
    const baseline = runChecks(REPO_ROOT, { read: realRead });
    const baselineOnce = await onceSessionFailures(realRead);
    if (baseline.failures.length > 0 || baseline.strings.length === 0 || baselineOnce.length > 0) {
        console.error(`${NAME}: --self-test FAIL -- the unmodified tree is already red, so the planted-fault results below would mean nothing:`);
        [...baseline.failures, ...baselineOnce].forEach(f => console.error(`  ${f}`));
        return 1;
    }
    console.log(`  ok  baseline -> green (${baseline.strings.length} strings; once-per-session holds in the real client)`);

    const withCopy = (fn) => ({
        read: (rel) => (rel === COPY_REL ? fn(realRead(rel)) : realRead(rel)),
    });
    const withClient = (fn) => ({
        read: (rel) => (rel === CLIENT_REL ? fn(realRead(rel)) : realRead(rel)),
    });
    const victim = baseline.strings[1].key;

    const plants = [
        ['pref key in one string', withCopy(t => t.replace(baseline.strings[1].value.slice(0, 20), 'app.update.url.manual is not here ')), victim, 'pref'],
        ['ALL-CAPS token in one string', withCopy(t => t.replace(baseline.strings[2].value.slice(0, 20), 'POWERBROWSER_TOKEN reached here ')), baseline.strings[2].key, 'caps'],
        ['product name removed', withCopy(t => t.replace(baseline.strings[0].value, baseline.strings[0].value.replace('PowerBrowser', 'Browser'))), baseline.strings[0].key, 'name'],
        ['affordance unwired (client drops Check again)', { read: (rel) => { if (rel === CLIENT_REL) return realRead(rel).split('\n').filter(l => !l.includes('Check again')).join('\n'); if (rel === COPY_REL) return realRead(rel); return realRead(rel); } }, 'couldNotCheckBody', 'affordance'],
        ['seventh string added', withCopy(t => t.replace('});', `    extraString: 'PowerBrowser extra string. Choose Check again.',\n});`)), 'extraString', 'extra'],
        ['literal sentence in the client', withClient(t => `${t}\n// plant: ${baseline.strings[1].value.slice(0, 30)}\n`), CLIENT_REL, 'literal'],
    ];

    let failed = 0;
    for (const [name, overrides, needle] of plants) {
        const { failures } = runChecks(REPO_ROOT, overrides);
        const hit = failures.some(f => f.includes(needle));
        if (hit) {
            console.log(`  ok  ${name} -> red naming '${needle}'`);
        } else {
            console.error(`${NAME}: --self-test FAIL -- '${name}' did not go red naming '${needle}'; got: ${failures.join(' | ') || '(no failures at all)'}`);
            failed += 1;
        }
    }

    // CR-06 plants, driven through the real client. Each must change the
    // client text first, or it proves nothing.
    const clientPlants = [
        ['Check-again flag reset on request acceptance', (t) => t.replace("await this.request({ kind: 'checkForUpdates' });", "await this.request({ kind: 'checkForUpdates' }); this.checkAgainShown = false;")],
        ['flag never cleared by a completed check', (t) => t.replace('CHECK_COMPLETED_STATUSES.has(status) ? false : alreadyShown', 'alreadyShown')],
    ];
    for (const [name, mutate] of clientPlants) {
        const planted = withClient(mutate);
        if (planted.read(CLIENT_REL) === realRead(CLIENT_REL)) {
            console.error(`${NAME}: --self-test FAIL -- '${name}' did not apply (its search text is gone); the plant proves nothing.`);
            failed += 1;
            continue;
        }
        const failures = await onceSessionFailures(planted.read);
        if (failures.some(f => f.includes('Check-again prompts'))) {
            console.log(`  ok  ${name} -> red naming the Check-again prompt count`);
        } else {
            console.error(`${NAME}: --self-test FAIL -- '${name}' did not go red naming the Check-again prompt count; got: ${failures.join(' | ') || '(no failures at all)'}`);
            failed += 1;
        }
    }

    if (failed > 0) return 1;
    console.log(`${NAME}: --self-test PASS -- ${plants.length + clientPlants.length} planted faults went red naming their drift, and the control stayed green`);
    return 0;
}

process.exit(await main());
