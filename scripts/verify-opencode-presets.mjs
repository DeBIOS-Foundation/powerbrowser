#!/usr/bin/env node
/**
 * 16-02's opencode preset-plus-history gate: the review-UX slice
 * (per-session gated/auto-accept toggle defaulting to gated, mandatory
 * ordered history with revert, latest-supersedes, stale-hunk refuse, the
 * history-write-failure guard, and the D-03 apply-then-record fallback)
 * under mechanical enforcement.
 *
 * WHAT IT ASSERTS, all derived from the tree at check time and compared
 * as SET EQUALITY against the one EXPECTED const below, so additions and
 * removals each go red naming the drift:
 *   - preset command ids plus labelless shape, preset literal set, gated
 *     default, per-session scope with no persistence surface anywhere
 *   - chat-header surfacing (toolbar items on ChatViewWidget.ID with
 *     change-driven refresh) and static binds beside the Task-01 binds
 *   - the auto-accept key link (store -> chat agent apply-all -> emitter)
 *   - history API surface, intercept/fallback via markers, captured-env
 *     hygiene (no host-env read in the emitter), fail-closed exit(78)
 *   - prohibitions as BEHAVIOR against the compiled extension libs:
 *     default-gated, explicit-action-only auto-accept, history order
 *     equals apply order, emission order equals staging order, supersede
 *     marking without merge, stale-refuse preserving the proposal,
 *     history-write failure blocking the apply, redaction of token-shaped
 *     strings from history while accept writes exact bytes, idempotent
 *     re-stage, zero-edit silence, fallback recording without touching
 *     disk, working revert, concurrent-edit revert refusal
 *
 * THE R3 BACKSTOP IS A HELD-OUT STAGED TEST, never a silent pass:
 * revert-after-concurrent-external-edit on one hunk needs a live driver.
 * The default entry point prints STAGED with the exact rerun command and
 * exits cleanly. `node scripts/verify-opencode-presets.mjs --live-backstop`
 * runs the one-hunk scenario for real against the shipped lib and fails
 * naming the drift when the guard regresses.
 *
 * Honestly --quick: text reads plus compiled-lib behavior (the gate
 * requires the extension already built, like tab-uris-typecheck), no
 * browser, no display, no live model. The core-diff half shells to
 * diff-theia-core.sh --quick through nix (yarn lives there only).
 *
 * Usage:
 *   node scripts/verify-opencode-presets.mjs
 *   node scripts/verify-opencode-presets.mjs --self-test
 *   node scripts/verify-opencode-presets.mjs --live-backstop
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'verify-opencode-presets';
const RERUN = 'node scripts/verify-opencode-presets.mjs --live-backstop';

const REL = {
    presetCommands: 'theia/extensions/backend-opencode/src/browser/opencode-preset-commands.ts',
    presetContribution: 'theia/extensions/backend-opencode/src/browser/opencode-preset-contribution.ts',
    frontendModule: 'theia/extensions/backend-opencode/src/browser/backend-opencode-frontend-module.ts',
    agent: 'theia/extensions/backend-opencode/src/browser/opencode-chat-agent.ts',
    emitter: 'theia/extensions/backend-opencode/src/node/opencode-changeset-emitter.ts',
    service: 'theia/extensions/backend-opencode/src/common/opencode-service.ts',
    supervisor: 'theia/extensions/backend-opencode/src/node/opencode-acp-supervisor.ts',
};
const PRESET_LIB = 'theia/extensions/backend-opencode/lib/browser/opencode-preset-commands.js';
const EMITTER_LIB = 'theia/extensions/backend-opencode/lib/node/opencode-changeset-emitter.js';
const CHAT_VIEW_WIDGET_JS = 'theia/node_modules/@theia/ai-chat-ui/lib/browser/chat-view-widget.js';

/**
 * The declared preset-plus-history contract, in one place. The ONE
 * hand-kept list in this file: editing it is how a deliberate contract
 * change is made -- it shows up in the diff for review. Everything it is
 * compared against is derived at check time.
 */
const EXPECTED = Object.freeze({
    presetDefault: 'gated',
    presetIds: Object.freeze(['gated', 'auto-accept']),
    presetCommandIds: Object.freeze([
        'powerbrowser.opencode.preset.use-gated',
        'powerbrowser.opencode.preset.enable-auto-accept',
    ]),
    historyApi: Object.freeze([
        'appendHistory',
        'historyFor',
        'historyWriteFailure',
        'recordExternalApply',
        'revertApplied',
        'supersededFor',
    ]),
});

function diffSets(actual, expected) {
    const a = new Set(actual);
    const e = new Set(expected);
    return {
        surplus: [...a].filter(x => !e.has(x)),
        missing: [...e].filter(x => !a.has(x)),
    };
}

function readSources() {
    const out = {};
    for (const rel of Object.values(REL)) {
        try {
            out[rel] = readFileSync(join(REPO_ROOT, rel), 'utf8');
        } catch {
            out[rel] = '';
        }
    }
    return out;
}

/** Strip line plus block comments so doc words never satisfy code asserts. */
function codeOnly(source) {
    return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

/** Widget id derived from the installed tree, never hand-kept here. */
function derivedChatWidgetId() {
    try {
        const src = readFileSync(join(REPO_ROOT, CHAT_VIEW_WIDGET_JS), 'utf8');
        const m = /this\.ID = '([^']+)'/.exec(src);
        return m ? m[1] : '';
    } catch {
        return '';
    }
}

/** @returns {string[]} failure messages -- empty means the gate holds. */
function checkStatic(sources) {
    const failures = [];
    const cmds = sources[REL.presetCommands] ?? '';
    const contrib = sources[REL.presetContribution] ?? '';
    const fmod = sources[REL.frontendModule] ?? '';
    const agent = sources[REL.agent] ?? '';
    const emi = sources[REL.emitter] ?? '';
    const svc = sources[REL.service] ?? '';
    const sup = sources[REL.supervisor] ?? '';

    for (const [rel, src] of Object.entries(sources)) {
        if (!src) {
            failures.push(`${rel}: unreadable -- the preset sources must exist for this comparison to prove anything`);
        }
    }
    if (failures.length) {
        return failures;
    }

    // Preset command ids: named consts, set equality against EXPECTED.
    const idLiterals = [...cmds.matchAll(/OPENCODE_PRESET_[A-Z_]*COMMAND_ID\s*=\s*'([^']+)'/g)].map(m => m[1]);
    const idDiff = diffSets([...new Set(idLiterals)], EXPECTED.presetCommandIds);
    if (idDiff.surplus.length || idDiff.missing.length) {
        failures.push(`${REL.presetCommands}: command-id drift (surplus [${idDiff.surplus.join(', ')}], missing [${idDiff.missing.join(', ')}]) -- contract is [${[...EXPECTED.presetCommandIds].join(', ')}]`);
    }
    // Labelless by design: palette-invisible toggles carry no label copy.
    for (const name of ['OPENCODE_PRESET_USE_GATED', 'OPENCODE_PRESET_ENABLE_AUTO_ACCEPT']) {
        const block = new RegExp(`${name}: Command = \\{[^}]*\\}`, 's').exec(cmds)?.[0] ?? '';
        if (/label\s*:/.test(block)) {
            failures.push(`${REL.presetCommands}: ${name} carries a label -- toggles stay labelless and palette-invisible`);
        }
    }

    // Preset literal set plus gated default, derived from source.
    const presetLiterals = [...codeOnly(cmds).matchAll(/'(gated|auto-accept)'/g)].map(m => m[1]);
    const presetDiff = diffSets([...new Set(presetLiterals)], EXPECTED.presetIds);
    if (presetDiff.surplus.length || presetDiff.missing.length) {
        failures.push(`${REL.presetCommands}: preset-literal drift (surplus [${presetDiff.surplus.join(', ')}], missing [${presetDiff.missing.join(', ')}]) -- contract is [${[...EXPECTED.presetIds].join(', ')}]`);
    }
    if (!/OPENCODE_PRESET_DEFAULT: OpenCodePreset = 'gated'/.test(codeOnly(cmds))) {
        failures.push(`${REL.presetCommands}: default-preset drift -- fresh sessions must open gated (T-16-02-01, SPEC prohibition)`);
    }
    if (!codeOnly(cmds).includes('?? OPENCODE_PRESET_DEFAULT')) {
        failures.push(`${REL.presetCommands}: getPreset fallback drift -- untouched sessions must resolve through the gated default`);
    }

    // Per-session scope with no persistence surface (comment-stripped: docs
    // may name the forbidden APIs, code must not reference them).
    const presetCode = `${codeOnly(cmds)}\n${codeOnly(contrib)}`;
    const persistHits = [...presetCode.matchAll(/StorageService|PreferenceService|Memento|localStorage|sessionStorage|globalState|workspaceState|serialize|deserialize/g)].map(m => m[0]);
    if ([...new Set(persistHits)].length) {
        failures.push(`preset files reference a persistence API ([${[...new Set(persistHits)].join(', ')}]) -- presets must never persist across sessions (T-16-02-01)`);
    }
    if (!codeOnly(cmds).includes('Map<string, OpenCodePreset>')) {
        failures.push(`${REL.presetCommands}: store drift -- presets must live in a per-session map, nowhere else`);
    }

    // Chat-header surfacing: toolbar items on the chat widget id with
    // change-driven refresh, commands plus store bound statically.
    const widgetId = derivedChatWidgetId();
    if (!widgetId) {
        failures.push(`${CHAT_VIEW_WIDGET_JS}: chat widget id underivable -- the toolbar target cannot be proven`);
    }
    if (!contrib.includes('ChatViewWidget.ID') || !contrib.includes('registerToolbarItems')) {
        failures.push(`${REL.presetContribution}: chat-header surfacing drift -- toolbar items must target ChatViewWidget.ID`);
    }
    if (!contrib.includes('isVisible') || !contrib.includes('onDidChange')) {
        failures.push(`${REL.presetContribution}: toolbar refresh drift -- items must scope by widget and refresh on preset change`);
    }
    if (!contrib.includes('resolvePresetSessionId')) {
        failures.push(`${REL.presetContribution}: session-resolution drift -- commands must resolve the acting chat session, never a global`);
    }
    for (const bind of ['OpencodePresetStore', 'CommandContribution).toService(OpencodePresetContribution', 'TabBarToolbarContribution).toService(OpencodePresetContribution']) {
        if (!fmod.includes(bind)) {
            failures.push(`${REL.frontendModule}: static bind drift -- '${bind}' missing beside the Task-01 binds`);
        }
    }

    // The auto-accept key link: store -> agent apply-all -> emitter.
    if (!contrib.includes('auto-accept') || !emi.includes('auto-accept')) {
        failures.push(`preset/emitter: the auto-accept key link drifted -- the toggle must select the emitter's immediate-apply path`);
    }
    if (!agent.includes('applyAllStaged') || !agent.includes('getPreset')) {
        failures.push(`${REL.agent}: preset-selection drift -- the agent must apply-all on auto-accept and stage-only otherwise`);
    }
    if (!agent.includes(`'auto-accept'`) || !agent.includes('revertApplied')) {
        failures.push(`${REL.agent}: history-reuse drift -- apply-all must record the preset and revert must reach mandatory history (D-06)`);
    }

    // History API surface on the emitter, set equality.
    const apiHits = [...EXPECTED.historyApi].filter(name => emi.includes(name));
    const apiDiff = diffSets(apiHits, EXPECTED.historyApi);
    if (apiDiff.missing.length) {
        failures.push(`${REL.emitter}: history API drift -- missing [${apiDiff.missing.join(', ')}] from [${[...EXPECTED.historyApi].join(', ')}]`);
    }
    if (!emi.includes(`via: 'intercept'`) || !emi.includes(`via: 'fallback'`)) {
        failures.push(`${REL.emitter}: path-marker drift -- history must tag intercept versus D-03 fallback applies`);
    }
    if (!emi.includes('status = \'superseded\'') && !emi.includes('status: \'superseded\'')) {
        failures.push(`${REL.emitter}: supersede-marking drift -- old proposals must be marked superseded, never merged (T-16-02-03)`);
    }
    // Service plus supervisor carry the revert; hygiene stays fail-closed.
    if (!svc.includes('revertApplied') || !svc.includes('NO_APPLIED_HISTORY')) {
        failures.push(`${REL.service}: revert-contract drift -- the JSON-RPC surface must expose history revert with its sentinel`);
    }
    if (!sup.includes('revertApplied')) {
        failures.push(`${REL.supervisor}: revert pass-through drift -- the supervisor must serve history revert over the existing channel`);
    }
    if (!sup.includes('exit(78)')) {
        failures.push(`${REL.supervisor}: fail-closed exit(78) missing -- supervision handshake must gate listen`);
    }
    if (!sup.includes('POWERBROWSER_ENV')) {
        failures.push(`${REL.supervisor}: captured-env use missing -- secrets must travel the captured module, never the host object`);
    }
    const emitterCode = codeOnly(emi);
    const hostEnvReads = emitterCode.split('\n').filter(line => line.includes('process.env'));
    if (hostEnvReads.length) {
        failures.push(`${REL.emitter}: ${hostEnvReads.length} direct host-env read(s) -- use the captured env module (T-16-02-04)`);
    }

    return failures;
}

function loadLibs() {
    for (const lib of [PRESET_LIB, EMITTER_LIB]) {
        if (!existsSync(join(REPO_ROOT, lib))) {
            return { error: `${lib} absent -- run the extension build first (nix develop .#theia, yarn build)` };
        }
    }
    try {
        const require = createRequire(join(REPO_ROOT, 'scripts/verify-opencode-presets.mjs'));
        const reflectPath = join(REPO_ROOT, 'theia/node_modules/reflect-metadata/Reflect.js');
        if (existsSync(reflectPath)) {
            require(reflectPath);
        }
        return {
            preset: require(join(REPO_ROOT, PRESET_LIB)),
            emitter: require(join(REPO_ROOT, EMITTER_LIB)),
        };
    } catch (err) {
        return { error: `compiled preset/emitter lib failed to load: ${err.message}` };
    }
}

function stageRoot() {
    return mkdtempSync(join(tmpdir(), 'opencode-presets-'));
}

/** Default-gated assertion (SPEC prohibition, T-16-02-01). */
function checkPresetDefault(P) {
    if (P.OPENCODE_PRESET_DEFAULT !== EXPECTED.presetDefault) {
        return [`preset default is '${P.OPENCODE_PRESET_DEFAULT}' -- fresh sessions must open gated`];
    }
    const store = new P.OpencodePresetStore();
    if (store.getPreset('never-touched-session') !== EXPECTED.presetDefault) {
        return [`untouched session resolved '${store.getPreset('never-touched-session')}' -- the gated default must hold without any action`];
    }
    return [];
}

/** Auto-accept enabled only by an explicit per-session action. */
function checkExplicitAction(P) {
    const failures = [];
    const store = new P.OpencodePresetStore();
    store.enableAutoAccept('s1');
    if (store.getPreset('s1') !== 'auto-accept') {
        failures.push(`enableAutoAccept did not switch s1 -- the explicit action must take effect`);
    }
    if (store.getPreset('s2') !== EXPECTED.presetDefault) {
        failures.push(`enabling s1 leaked into s2 ('${store.getPreset('s2')}') -- scope is strictly per session`);
    }
    store.useGated('s1');
    if (store.getPreset('s1') !== EXPECTED.presetDefault) {
        failures.push(`useGated did not return s1 to gated -- the safe preset must always be reachable`);
    }
    if (P.resolvePresetSessionId({ sessionId: 'w1' }) !== 'w1'
        || P.resolvePresetSessionId('direct-id') !== 'direct-id'
        || P.resolvePresetSessionId(42) !== undefined
        || P.resolvePresetSessionId({}) !== undefined) {
        failures.push(`resolvePresetSessionId misroutes -- widget sessions and explicit ids resolve, anything else is a strict no-op`);
    }
    const proto = Object.getOwnPropertyNames(Object.getPrototypeOf(store));
    const persistish = proto.filter(n => /save|load|persist|serial|store|memento/i.test(n));
    if (persistish.length) {
        failures.push(`store exposes persistence-shaped methods ([${persistish.join(', ')}]) -- presets must never persist`);
    }
    return failures;
}

/** History append order equals apply order. */
function checkHistoryOrder(E, root) {
    const e = new E.OpencodeChangesetEmitter();
    e.writeTextFile('c', root, 'b.txt', 'B-bytes');
    e.writeTextFile('c', root, 'a.txt', 'A-bytes');
    e.acceptStaged('c', join(root, 'b.txt'));
    e.acceptStaged('c', join(root, 'a.txt'));
    const got = e.historyFor('c').map(h => h.path);
    if (got.length !== 2 || got[0] !== join(root, 'b.txt') || got[1] !== join(root, 'a.txt')) {
        return [`history order [${got.join(', ')}] -- append order must equal apply order`];
    }
    const orders = e.historyFor('c').map(h => h.order);
    if (orders[0] !== 0 || orders[1] !== 1) {
        return [`history orders [${orders.join(', ')}] -- sequence must count applies from zero`];
    }
    return [];
}

/** Staging order matches backend emission order (two-file fixture). */
function checkEmissionOrder(E, root) {
    const e = new E.OpencodeChangesetEmitter();
    e.writeTextFile('c', root, 'a.txt', 'A-bytes');
    e.writeTextFile('c', root, 'b.txt', 'B-bytes');
    const got = e.stagedFor('c').map(entry => entry.path);
    if (got.length !== 2 || got[0] !== join(root, 'a.txt') || got[1] !== join(root, 'b.txt')) {
        return [`staging order [${got.join(', ')}] -- emission order A,B must stage A,B`];
    }
    return [];
}

/** Latest supersedes: old marked, never merged. */
function checkSupersede(E, root) {
    const e = new E.OpencodeChangesetEmitter();
    e.writeTextFile('c', root, 's.txt', 'v1-bytes');
    e.writeTextFile('c', root, 's.txt', 'v2-bytes');
    const staged = e.stagedFor('c');
    const old = e.supersededFor('c');
    if (staged.length !== 1 || staged[0].proposedText !== 'v2-bytes') {
        return [`supersede staged [${staged.map(x => x.proposedText).join(', ')}] -- exactly the latest proposal must stage`];
    }
    if (old.length !== 1 || old[0].proposedText !== 'v1-bytes' || old[0].status !== 'superseded') {
        return [`supersede archive [${old.map(x => `${x.proposedText}:${x.status}`).join(', ')}] -- the old entry must be marked superseded, never merged`];
    }
    if (staged[0].proposedText.includes('v1-bytes')) {
     
...[truncated 14068 chars]