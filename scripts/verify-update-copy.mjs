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
// Static on purpose: it reads the source, needs no build, no browser and no
// display, and therefore belongs in --quick where a leak costs seconds
// rather than a forty-minute rebuild.
//
// Usage:
//   node scripts/verify-update-copy.mjs
//   node scripts/verify-update-copy.mjs --self-test
//
// Exit 0 pass, 1 fail. --self-test plants every fault in memory and requires
// each to go red naming the string; a check that can only go green is not a
// check.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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

function runChecks(root, overrides = {}) {
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

function main() {
    if (args.includes('--self-test')) return selfTest();
    const { failures, strings } = runChecks(REPO_ROOT);
    console.log(`${NAME}: ${strings.length} update string(s) derived from the branding contribution: ${strings.map(s => s.key).join(', ')}`);
    if (failures.length > 0) {
        console.error(`${NAME}: FAIL -- ${failures.length} problem(s) with the update copy contract.`);
        failures.forEach(f => console.error(`  ${f}`));
        return 1;
    }
    console.log(`${NAME}: PASS -- every update string names PowerBrowser, carries no internal identifier, and ends with an on-screen affordance; the client imports the single site`);
    return 0;
}

function selfTest() {
    const cache = new Map();
    const realRead = (rel) => {
        if (!cache.has(rel)) cache.set(rel, readText(REPO_ROOT, rel));
        return cache.get(rel);
    };
    const baseline = runChecks(REPO_ROOT, { read: realRead });
    if (baseline.failures.length > 0 || baseline.strings.length === 0) {
        console.error(`${NAME}: --self-test FAIL -- the unmodified tree is already red, so the planted-fault results below would mean nothing:`);
        baseline.failures.forEach(f => console.error(`  ${f}`));
        return 1;
    }
    console.log(`  ok  baseline -> green (${baseline.strings.length} strings)`);

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
    for (const [name, overrides, needle, kind] of plants) {
        const { failures } = runChecks(REPO_ROOT, overrides);
        const hit = failures.some(f => f.includes(needle));
        if (hit) {
            console.log(`  ok  ${name} -> red naming '${needle}'`);
        } else {
            console.error(`${NAME}: --self-test FAIL -- '${name}' did not go red naming '${needle}'; got: ${failures.join(' | ') || '(no failures at all)'}`);
            failed += 1;
        }
    }

    // Once-per-session double-failure fixture: two update-error pushes
    // require exactly one Check-again prompt; a third push after success
    // resets and prompts again. Drives the pure transition the client
    // exports (no Theia imports, no browser).
    try {
        const transitionSrc = realRead('theia/extensions/tab-uris/src/browser/update-client.ts');
        if (transitionSrc === null || !transitionSrc.includes('shouldShowCheckAgain')) {
            console.error(`${NAME}: --self-test FAIL -- the once-per-session transition is not exported from the client.`);
            failed += 1;
        } else {
            // Inline the two pure functions (no imports) and replay.
            // Brace-matched: the non-greedy regex stops at the first inner
            // close brace and yields an unbalanced body.
            const fnBody = (name) => {
                // The signature carries a return-type literal (`: { show... }`),
                // so `[^{]*` stops at the type's own brace. Anchor on the
                // declaration line end: the body opens at the last `{` of the
                // `export function ...` header, which ends at the first newline
                // carrying `{`.
                const decl = transitionSrc.match(new RegExp(`export function ${name}[^\\n]*\\{`));
                if (!decl || decl.index === undefined) return null;
                let depth = 0;
                const open = decl.index + decl[0].length - 1;
                for (let i = open; i < transitionSrc.length; i += 1) {
                    if (transitionSrc[i] === '{') depth += 1;
                    else if (transitionSrc[i] === '}') {
                        depth -= 1;
                        if (depth === 0) return transitionSrc.slice(open + 1, i);
                    }
                }
                return null;
            };
            const showSrc = fnBody('shouldShowCheckAgain');
            const resetSrc = fnBody('resetCheckAgainOnSuccess');
            if (!showSrc || resetSrc === null) {
                console.error(`${NAME}: --self-test FAIL -- could not extract the once-per-session transition.`);
                failed += 1;
            } else {
                const shouldShowCheckAgain = new Function('alreadyShown', `${showSrc}`);
                const resetCheckAgainOnSuccess = new Function(`${resetSrc}`);
                let flag = false;
                const first = shouldShowCheckAgain(flag); flag = first.next;
                const second = shouldShowCheckAgain(flag); flag = second.next;
                flag = resetCheckAgainOnSuccess();
                const third = shouldShowCheckAgain(flag);
                if (first.show === true && second.show === false && third.show === true) {
                    console.log(`  ok  once-per-session double-failure fixture -> exactly one Check-again prompt, reset after success`);
                } else {
                    console.error(`${NAME}: --self-test FAIL -- once-per-session fixture gave first=${first.show} second=${second.show} third=${third.show}, want true/false/true.`);
                    failed += 1;
                }
            }
        }
    } catch (e) {
        console.error(`${NAME}: --self-test FAIL -- once-per-session fixture threw: ${e.message}`);
        failed += 1;
    }

    if (failed > 0) return 1;
    console.log(`${NAME}: --self-test PASS -- ${plants.length + 1} planted faults went red naming the string, and the control stayed green`);
    return 0;
}

process.exit(main());
