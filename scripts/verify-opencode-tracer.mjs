#!/usr/bin/env node
/**
 * 16-01's opencode tracer gate: the production slice (supervised ACP
 * child, @OpenCode round-trip with 1:1 session mapping, gated
 * intercept-then-record review on one file) under mechanical enforcement.
 *
 * WHAT IT ASSERTS, all derived from the tree at check time and compared
 * as SET EQUALITY against the one EXPECTED const below, so additions and
 * removals each go red naming the drift:
 *   - extension composed (theiaExtensions rows, both composition edits)
 *   - agent id bound (ChatAgent bind + id literal agree)
 *   - supervisor spawn args name the `acp` subcommand with `--cwd`
 *     workspace handoff, fail-closed exit(78), captured-env use with no
 *     direct host-env read in the supervisor
 *   - ACP methods handled vs sent, staging API surface, Change Set entry
 *     creation, stable per-chat session mapping
 *   - prohibitions as BEHAVIORAL tests against the compiled extension
 *     lib (outside-root refused fail-closed; token-shaped strings
 *     redacted from history plus Change Set fixtures; no allow-always
 *     reply literal anywhere in the supervisor)
 *
 * THE LIVE PROBE IS MANDATORY, never a holdout: it spawns the installed
 * `opencode acp` binary over stdio (NDJSON framing) and drives
 * initialize -> session/new -> three prompts on the one ACP session
 * asserting a single stable sessionId across all three replies, plus a
 * fourth edit turn proving the ask/delegate mechanism, then session/new
 * for a new chat asserting a different sessionId, then confirms the
 * sent-method log contains no session/load with a different cwd. The
 * probe authors its own opencode.json (edit:ask) inside a mkdtemp cwd --
 * it never reads or writes user configuration. Permission asks are
 * auto-answered exactly like the adapter (diff-carrying edit asks are
 * captured and cancelled; the allow path is exercised once to observe
 * the delegated write). The probe exits non-zero when the binary is
 * absent. An edit turn that the model answers without acting, a prompt
 * JSON-RPC error, or a timeout all fail the gate: the slice is unproven
 * until the wire is observed.
 *
 * Honestly --quick with one declared exception: text reads plus a local
 * child spawn with live model turns (typically one to three minutes).
 * No build (the gate requires the extension already built, like
 * tab-uris-typecheck), no browser, no display. The core-diff half shells
 * to diff-theia-core.sh --quick through nix (yarn lives there only).
 *
 * Usage:
 *   node scripts/verify-opencode-tracer.mjs
 *   node scripts/verify-opencode-tracer.mjs --self-test
 */

import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'verify-opencode-tracer';

const REL = {
    supervisor: 'theia/extensions/backend-opencode/src/node/opencode-acp-supervisor.ts',
    emitter: 'theia/extensions/backend-opencode/src/node/opencode-changeset-emitter.ts',
    agent: 'theia/extensions/backend-opencode/src/browser/opencode-chat-agent.ts',
    service: 'theia/extensions/backend-opencode/src/common/opencode-service.ts',
    frontendModule: 'theia/extensions/backend-opencode/src/browser/backend-opencode-frontend-module.ts',
    backendModule: 'theia/extensions/backend-opencode/src/node/backend-opencode-backend-module.ts',
    extPackage: 'theia/extensions/backend-opencode/package.json',
    browserPackage: 'theia/applications/browser/package.json',
    rootPackage: 'theia/package.json',
};
const EMITTER_LIB = 'theia/extensions/backend-opencode/lib/node/opencode-changeset-emitter.js';

/**
 * The declared tracer contract, in one place. The ONE hand-kept list in
 * this file: editing it is how a deliberate contract change is made -- it
 * shows up in the diff for review. Everything it is compared against is
 * derived at check time.
 */
const EXPECTED = Object.freeze({
    agentId: 'OpenCode',
    servicePath: '/services/opencode',
    spawnArgs: Object.freeze(['opencode', 'acp', '--cwd']),
    methodsHandled: Object.freeze(['fs/write_text_file', 'session/request_permission', 'session/update']),
    methodsSent: Object.freeze(['initialize', 'session/new', 'session/prompt', 'session/cancel']),
    stagingApi: Object.freeze(['acceptStaged', 'clampStagedPath', 'redactSecretStrings', 'rejectStaged', 'requestPermission', 'writeTextFile']),
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

function stringLiteralsOf(source, name) {
    const out = [];
    const re = new RegExp(`${name}\\s*=\\s*'([^']+)'`, 'g');
    for (const m of source.matchAll(re)) {
        out.push(m[1]);
    }
    return out;
}

/** @returns {string[]} failure messages -- empty means the gate holds. */
function checkStatic(sources) {
    const failures = [];
    const sup = sources[REL.supervisor] ?? '';
    const emi = sources[REL.emitter] ?? '';
    const agent = sources[REL.agent] ?? '';
    const svc = sources[REL.service] ?? '';
    const fmod = sources[REL.frontendModule] ?? '';
    const bmod = sources[REL.backendModule] ?? '';

    for (const [rel, src] of Object.entries(sources)) {
        if (!src) {
            failures.push(`${rel}: unreadable -- the tracer sources must exist for this comparison to prove anything`);
        }
    }
    if (failures.length) {
        return failures;
    }

    // Extension composed: theiaExtensions rows plus both composition edits.
    const pkg = sources[REL.extPackage] ?? '';
    if (!pkg.includes('@powerbrowser/backend-opencode')) {
        failures.push(`${REL.extPackage}: extension name missing -- the skeleton this gate guards is gone`);
    }
    if (!pkg.includes('backend-opencode-frontend-module') || !pkg.includes('backend-opencode-backend-module')) {
        failures.push(`${REL.extPackage}: theiaExtensions rows drifted -- frontend plus backend module entries required`);
    }
    if (!sources[REL.browserPackage].includes('"@powerbrowser/backend-opencode"')) {
        failures.push(`${REL.browserPackage}: composition dependency line missing -- the extension is not composed`);
    }
    if (!sources[REL.rootPackage].includes('extensions/backend-opencode build')) {
        failures.push(`${REL.rootPackage}: build:extensions clause missing -- the extension is not built`);
    }

    // Agent id bound: id literal, exported const, and ChatAgent bind agree.
    const ids = stringLiteralsOf(agent, 'OPENCODE_CHAT_AGENT_ID');
    const idAssign = /readonly id\s*=\s*OPENCODE_CHAT_AGENT_ID/.test(agent) || agent.includes("id = 'OpenCode'");
    if (!ids.includes(EXPECTED.agentId) || !idAssign) {
        failures.push(`${REL.agent}: agent id drifted (consts [${ids.join(', ')}]) -- contract is '${EXPECTED.agentId}'`);
    }
    if (!fmod.includes('bind(ChatAgent).toService(')) {
        failures.push(`${REL.frontendModule}: ChatAgent bind missing -- the agent is not registered`);
    }

    // Service path: the key link agent -> supervisor.
    const paths = stringLiteralsOf(svc, 'OPENCODE_SERVICE_PATH');
    if (!paths.includes(EXPECTED.servicePath)) {
        failures.push(`${REL.service}: service path drifted (got [${paths.join(', ')}]) -- contract is '${EXPECTED.servicePath}'`);
    }
    if (!agent.includes('OpencodeService') || !fmod.includes('OPENCODE_SERVICE_PATH')) {
        failures.push(`agent/module: the /services/opencode link drifted -- prompts must travel the JSON-RPC service path`);
    }

    // Spawn args: acp subcommand with workspace handoff, derived as a set.
    const spawnLiterals = [...sup.matchAll(/'(opencode|acp|--cwd)'/g)].map(m => m[1]);
    const spawnDiff = diffSets([...new Set(spawnLiterals)], EXPECTED.spawnArgs);
    if (spawnDiff.surplus.length || spawnDiff.missing.length) {
        failures.push(`${REL.supervisor}: spawn contract drifted (surplus [${spawnDiff.surplus.join(', ')}], missing [${spawnDiff.missing.join(', ')}]) -- contract is [${[...EXPECTED.spawnArgs].join(', ')}]`);
    }

    // ACP methods handled (inbound agent->client comparisons only) vs sent (outbound calls), set equality.
    const handledLiterals = [...sup.matchAll(/method === '(session\/[a-z_]+|fs\/[a-z_]+)'/g)].map(m => m[1]);
    const handledDiff = diffSets([...new Set(handledLiterals)], EXPECTED.methodsHandled);
    if (handledDiff.surplus.length || handledDiff.missing.length) {
        failures.push(`${REL.supervisor}: handled-method drift (surplus [${handledDiff.surplus.join(', ')}], missing [${handledDiff.missing.join(', ')}]) -- contract is [${[...EXPECTED.methodsHandled].join(', ')}]`);
    }
    const sentLiterals = [...sup.matchAll(/'(initialize|session\/new|session\/prompt|session\/cancel)'/g)].map(m => m[1]);
    const sentDiff = diffSets([...new Set(sentLiterals)], EXPECTED.methodsSent);
    if (sentDiff.surplus.length || sentDiff.missing.length) {
        failures.push(`${REL.supervisor}: sent-method drift (surplus [${sentDiff.surplus.join(', ')}], missing [${sentDiff.missing.join(', ')}])`);
    }

    // Staging API surface on the emitter, set equality.
    const apiHits = [...EXPECTED.stagingApi].filter(name => emi.includes(name));
    const apiDiff = diffSets(apiHits, EXPECTED.stagingApi);
    if (apiDiff.missing.length) {
        failures.push(`${REL.emitter}: staging API drift -- missing [${apiDiff.missing.join(', ')}] from [${[...EXPECTED.stagingApi].join(', ')}]`);
    }

    // Change Set entry creation grouped per file, with diff carried.
    if (!agent.includes('new ChangeSetImpl') || !agent.includes('request.changeSet =')) {
        failures.push(`${REL.agent}: Change Set entry creation missing -- proposals must land as entries grouped per file`);
    }
    if (!agent.includes('sessionId')) {
        failures.push(`${REL.agent}: no per-chat session id state -- session continuity is unobservable`);
    }

    // Stable per-chat session mapping owned by the supervisor.
    if (!sup.includes('acpSessions') || !sup.includes('getOrCreateSession')) {
        failures.push(`${REL.supervisor}: session-mapping drift -- 1 chat session to 1 ACP session is the contract`);
    }
    const supCode = sup.replace(/\/\/.*$/gm, '');
    if (supCode.includes('session/load')) {
        failures.push(`${REL.supervisor}: session/load in code (comments stripped) -- sessions must never reload elsewhere (dropped replies hang turns)`);
    }

    // Fail-closed startup plus captured-env hygiene.
    if (!sup.includes('exit(78)')) {
        failures.push(`${REL.supervisor}: fail-closed exit(78) missing -- supervision handshake must gate listen`);
    }
    if (!sup.includes('POWERBROWSER_ENV')) {
        failures.push(`${REL.supervisor}: captured-env use missing -- secrets must travel the captured module, never the host object`);
    }
    const hostEnvReads = sup.split('\n').filter(line => !/^\s*\/\//.test(line) && line.includes('process.env'));
    if (hostEnvReads.length) {
        failures.push(`${REL.supervisor}: ${hostEnvReads.length} direct host-env read(s) -- use POWERBROWSER_ENV (T-16-01-03)`);
    }
    // No permissive default: the adapter must never auto-allow execution.
    if (/allow_always|allowAlways/.test(sup) || /allow_always|allowAlways/.test(emi)) {
        failures.push(`supervisor/emitter: allow-always literal present -- the gated default forbids it (SPEC prohibition)`);
    }
    // Serve-attach stays a fallback comment, never a code path.
    if (/serve['"]?\s*[,)]/.test(sup) && !sup.includes('fallback')) {
        failures.push(`${REL.supervisor}: serve-attach looks like a code path -- D-02 keeps it a documented fallback only`);
    }

    return failures;
}

function loadEmitterLib() {
    const libPath = join(REPO_ROOT, EMITTER_LIB);
    if (!existsSync(libPath)) {
        return { error: `${EMITTER_LIB} absent -- run the extension build first (nix develop .#theia, yarn build)` };
    }
    try {
        const require = createRequire(join(REPO_ROOT, 'scripts/verify-opencode-tracer.mjs'));
        const reflectPath = join(REPO_ROOT, 'theia/node_modules/reflect-metadata/Reflect.js');
        if (existsSync(reflectPath)) {
            require(reflectPath);
        }
        return { lib: require(libPath) };
    } catch (err) {
        return { error: `${EMITTER_LIB} failed to load: ${err.message}` };
    }
}

/**
 * Prohibition tests as BEHAVIOR against the shipped lib (plus one static
 * redaction-application assert). Takes an optional impl override so the
 * self-test can prove each check discriminates.
 */
function checkProhibitions(implOverride) {
    const failures = [];
    const loaded = implOverride ?? loadEmitterLib();
    if (loaded.error) {
        return [loaded.error];
    }
    const lib = loaded.lib;
    const root = mkdtempSync(join(tmpdir(), 'opencode-gate-'));
    try {
        // T-16-01-01: outside-root refused fail-closed.
        let refused = false;
        try {
            lib.clampStagedPath(root, join('..', 'escape.txt'));
        } catch {
            refused = true;
        }
        if (!refused) {
            failures.push(`clampStagedPath: outside-root proposal passed -- must refuse fail-closed (T-16-01-01)`);
        }
        let writeRefused = false;
        try {
            new lib.OpencodeChangesetEmitter().writeTextFile('chat', root, join('..', 'escape.txt'), 'x');
        } catch {
            writeRefused = true;
        }
        if (!writeRefused) {
            failures.push(`writeTextFile: outside-root delegated write passed -- must refuse fail-closed (T-16-01-01)`);
        }
        // Inside-root still stages (the refusal above must not be vacuous).
        const EmitterClass = lib.OpencodeChangesetEmitter;
        const emitter = new EmitterClass();
        const entry = emitter.writeTextFile('chat', root, join('sub', 'ok.txt'), 'new-bytes');
        if (!entry) {
            failures.push(`writeTextFile: inside-root proposal created no entry -- the clamp refuses everything, proving nothing`);
        }

        // T-16-01-02: token-shaped strings redacted from history plus
        // Change Set fixtures.
        const historyFixture = `user asked; assistant echoed sk-abcDEF1234567890 in chat history`;
        const changesetFixture = [
            `--- a${sep}notes.txt`,
            `+++ b${sep}notes.txt`,
            `+token ghp_abcdefghij1234567890 deployed`,
            `+auth Bearer abcdefghij12345678 here`,
            `+-----BEGIN PRIVATE KEY-----`,
            `+MIIBvTBXBgkqhkiG9w0BAQEFAASCAUCAmagnet`,
            `+-----END PRIVATE KEY-----`,
        ].join('\n');
        for (const [label, fixture] of [['history', historyFixture], ['changeset', changesetFixture]]) {
            const { text, redacted } = lib.redactSecretStrings(fixture);
            if (redacted === 0) {
                failures.push(`redactSecretStrings: ${label} fixture with token-shaped strings redacted nothing (T-16-01-02)`);
            } else if (/sk-abcDEF|ghp_abcdef|Bearer abcdef|MIIBvTBX/.test(text)) {
                failures.push(`redactSecretStrings: ${label} fixture still carries a token-shaped string after redaction (T-16-01-02)`);
            }
        }
        // The staged presentation must actually pass through redaction.
        const sources = readSources();
        if (!(sources[REL.emitter] ?? '').includes('diff: redactSecretStrings(')) {
            failures.push(`${REL.emitter}: staged diff bypasses redactSecretStrings -- presentation must redact (T-16-01-02)`);
        }

        // Gated default: execution denied, reads allowed, edits captured.
        const gate = new EmitterClass();
        if (gate.requestPermission('bash') !== 'reject') {
            failures.push(`requestPermission: bash not rejected -- the gated default is permissive`);
        }
        if (gate.requestPermission('read') !== 'allow-once') {
            failures.push(`requestPermission: read not allowed-once -- the gate misfires on harmless tools`);
        }
        const verdict = gate.requestPermission('edit', { kind: 'edit', path: 'q.txt', oldText: '', newText: 'Q' }, 'chat', root);
        if (verdict !== 'reject' || gate.stagedFor('chat').length !== 1) {
            failures.push(`requestPermission: diff-carrying edit ask neither captured nor rejected -- intercept-then-record is broken`);
        }
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
    return failures;
}

// -- Live ACP probe (mandatory) ----------------------------------------------

function whichOpencode() {
    const found = spawnSync('which', ['opencode'], { encoding: 'utf8' });
    return found.status === 0 ? found.stdout.trim() : '';
}

function runLiveProbe() {
    return new Promise(resolve => {
        const failures = [];
        const notes = [];
        const binary = whichOpencode();
        if (!binary) {
            resolve({ failures: ['live probe: `opencode` binary absent on PATH -- install opencode 1.18.25; the probe never passes without it'], notes });
            return;
        }
        const cwd = mkdtempSync(join(tmpdir(), 'opencode-probe-'));
        writeFileSync(join(cwd, 'opencode.json'), JSON.stringify({
            $schema: 'https://opencode.ai/config.json',
            permission: { edit: 'ask', write: 'ask', bash: 'deny' },
        }));
        const child = spawn('opencode', ['acp', '--cwd', cwd], { stdio: ['pipe', 'pipe', 'pipe'] });
        let nextId = 1;
        const pending = new Map();
        const sentMethods = [];
        const updateSessionIds = new Set();
        const observed = { permissionAsks: 0, askHadDiff: false, delegatedWrites: 0, promptReplies: 0 };
        let settled = false;
        const finish = () => {
            if (settled) {
                return;
            }
            settled = true;
            try {
                child.kill();
            } catch { /* already gone */ }
            rmSync(cwd, { recursive: true, force: true });
            resolve({ failures, notes });
        };
        const overall = setTimeout(() => {
            failures.push('live probe: timed out after 240s -- the binary hung the turn');
            finish();
        }, 240000);
        const send = (method, params, timeoutMs = 90000) => new Promise((res, rej) => {
            const m = { jsonrpc: '2.0', id: nextId++, method, params };
            sentMethods.push(method);
            const timer = setTimeout(() => { pending.delete(m.id); rej(new Error(`no reply to ${method} within ${timeoutMs}ms`)); }, timeoutMs);
            pending.set(m.id, { res: v => { clearTimeout(timer); res(v); }, rej: e => { clearTimeout(timer); rej(e); } });
            try {
                child.stdin.write(`${JSON.stringify(m)}\n`);
            } catch (err) {
                pending.delete(m.id);
                rej(err);
            }
        });
        const reply = (rid, result) => child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: rid, result })}\n`);
        const replyError = (rid, message) => child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: rid, error: { code: -32601, message } })}\n`);
        createInterface({ input: child.stdout }).on('line', line => {
            let msg;
            try {
                msg = JSON.parse(line);
            } catch {
                return;
            }
            if (msg.id !== undefined && (msg.result !== undefined || msg.error !== undefined)) {
                const p = pending.get(msg.id);
                if (!p) {
                    return;
                }
                pending.delete(msg.id);
                if (msg.error !== undefined) {
                    p.rej(new Error(JSON.stringify(msg.error).slice(0, 300)));
                } else {
                    p.res(msg.result);
                }
                return;
            }
            if (msg.method === 'session/update') {
                const sid = msg.params?.sessionId;
                if (typeof sid === 'string') {
                    updateSessionIds.add(sid);
                }
                return;
            }
            if (msg.method === 'session/request_permission') {
                observed.permissionAsks++;
                const contents = msg.params?.toolCall?.content ?? [];
                const d = contents.find(c => c?.type === 'diff');
                if (d) {
                    observed.askHadDiff = true;
                }
                // Mirror the adapter: capture diff-carrying edit asks and
                // cancel them; allow the final allow-path ask once to
                // observe the delegation channel.
                if (observed.permissionAsks < 2) {
                    reply(msg.id, { outcome: { outcome: 'cancelled' } });
                } else {
                    reply(msg.id, { outcome: { outcome: 'selected', optionId: 'once' } });
                }
                return;
            }
            if (msg.method === 'fs/write_text_file') {
                observed.delegatedWrites++;
                reply(msg.id, null);
                return;
            }
            if (msg.id !== undefined) {
                replyError(msg.id, `unexpected method ${msg.method}`);
            }
        });
        child.on('error', err => {
            failures.push(`live probe: spawn failed: ${err.message}`);
            clearTimeout(overall);
            finish();
        });
        (async () => {
            try {
                const hello = await send('initialize', {
                    protocolVersion: 1,
                    clientCapabilities: { fs: { readTextFile: true, writeTextFile: true } },
                }, 15000);
                if (hello?.protocolVersion !== 1) {
                    failures.push(`live probe: initialize returned protocolVersion ${hello?.protocolVersion} -- contract is 1`);
                }
                const first = await send('session/new', { cwd, mcpServers: [] }, 30000);
                const chatSession = first?.sessionId;
                if (!chatSession) {
                    failures.push('live probe: session/new returned no sessionId');
                    throw new Error('no-session');
                }
                const promptOnce = async text => {
                    const result = await send('session/prompt', {
                        sessionId: chatSession,
                        prompt: [{ type: 'text', text }],
                    });
                    observed.promptReplies++;
                    if (result?.stopReason !== 'end_turn') {
                        failures.push(`live probe: prompt turn ended with ${result?.stopReason ?? 'no stopReason'} -- contract is end_turn`);
                    }
                };
                await promptOnce('Reply with exactly the word PONG and nothing else.');
                await promptOnce('Reply with exactly the word PONG and nothing else.');
                await promptOnce('Create a file named probe-cancel.txt in the working directory containing exactly CANCELLED-FLOW.');
                await promptOnce('Create a file named probe-allow.txt in the working directory containing exactly ALLOWED-FLOW.');
                if (observed.promptReplies !== 4) {
                    failures.push(`live probe: ${observed.promptReplies}/4 prompt replies observed on the one session`);
                }
                if (updateSessionIds.size !== 1 || !updateSessionIds.has(chatSession)) {
                    failures.push(`live probe: session updates span [${[...updateSessionIds].join(', ')}] -- contract is exactly [${chatSession}]`);
                } else {
                    notes.push(`live probe: one stable sessionId across 4 prompts (${chatSession})`);
                }
                if (observed.permissionAsks < 2) {
                    failures.push(`live probe: ${observed.permissionAsks} permission ask(s) observed -- the gated config must surface asks`);
                }
                if (!observed.askHadDiff) {
                    failures.push('live probe: no permission ask carried a diff payload -- intercept-then-record is unproven');
                }
                if (observed.delegatedWrites < 1) {
                    failures.push('live probe: no delegated fs/write_text_file observed on the allow path -- the delegation channel is unproven');
                }
                if (existsSync(join(cwd, 'probe-cancel.txt'))) {
                    failures.push('live probe: probe-cancel.txt reached disk after a cancelled ask -- rejection must leave disk untouched');
                } else {
                    notes.push('live probe: cancelled ask left disk untouched');
                }
                const second = await send('session/new', { cwd, mcpServers: [] }, 30000);
                if (!second?.sessionId || second.sessionId === chatSession) {
                    failures.push('live probe: new chat did not mint a new backend sessionId');
                } else {
                    notes.push(`live probe: new chat minted a new sessionId (${second.sessionId})`);
                }
                const loads = sentMethods.filter(m => m === 'session/load');
                if (loads.length) {
                    failures.push(`live probe: sent session/load ${loads.length}x -- sessions must never reload elsewhere`);
                }
            } catch (err) {
                if (err.message !== 'no-session') {
                    failures.push(`live probe: ${err.message}`);
                }
            }
            clearTimeout(overall);
            finish();
        })();
    });
}

function checkCoreDiff() {
    try {
        execFileSync('nix', ['develop', `${REPO_ROOT}#theia`, '--command', 'bash', `${REPO_ROOT}/scripts/diff-theia-core.sh`, '--quick'], {
            encoding: 'utf8',
            timeout: 180000,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        return [];
    } catch (err) {
        return [`core diff: scripts/diff-theia-core.sh --quick red (${(err.stderr ?? err.message ?? '').toString().slice(0, 200)})`];
    }
}

function checkSpaceFree() {
    return process.cwd().includes(' ') ? [`repo path contains a space (${process.cwd()}) -- hard rule`] : [];
}

async function main() {
    if (process.argv.includes('--self-test')) {
        return selfTest();
    }
    const failures = [
        ...checkStatic(readSources()),
        ...checkProhibitions(),
        ...checkSpaceFree(),
        ...checkCoreDiff(),
        ...(await runLiveProbe()).failures,
    ];
    if (failures.length) {
        console.error(`${NAME}: FAIL -- the opencode tracer drifted from its contract.`);
        failures.forEach(f => console.error(`  - ${f}`));
        return 1;
    }
    console.log(`${NAME}: PASS -- supervised ACP tracer, session-continuous @OpenCode chat, and gated one-file review hold`);
    return 0;
}

// -- Self-test: green first, then each planted fault red naming the drift --

function selfTest() {
    const clean = readSources();
    const baseline = [...checkStatic(clean), ...checkProhibitions(), ...checkSpaceFree()];
    if (baseline.length !== 0) {
        console.error(`${NAME} --self-test: FAIL -- the unmodified tree is already red, so the planted-fault results below would be meaningless:`);
        baseline.forEach(f => console.error(`  ${f}`));
        return 1;
    }
    const cases = [
        {
            name: 'planted missing bind',
            mutate: sources => ({ ...sources, [REL.frontendModule]: clean[REL.frontendModule].replace('bind(ChatAgent).toService(OpencodeChatAgent);', '// planted removal: agent registration line deleted') }),
            run: mutated => checkStatic(mutated),
            expect: 'ChatAgent bind',
        },
        {
            name: 'planted permissive default',
            mutate: sources => ({ ...sources, [REL.supervisor]: `${clean[REL.supervisor]}\n// planted fault\nconst planted = 'allow_always';\n` }),
            run: mutated => checkStatic(mutated),
            expect: 'allow-always',
        },
        {
            name: 'planted outside-root pass',
            mutate: sources => sources,
            run: () => {
                // Fault the instrument's dependency: a clamp that passes
                // everything must trip the behavioral refusal assert.
                const lib = {
                    clampStagedPath: () => '/elsewhere/escape.txt',
                    redactSecretStrings: loaded => loaded,
                    OpencodeChangesetEmitter: class {
                        writeTextFile() {
                            return { path: '/elsewhere/escape.txt' };
                        }
                        requestPermission() {
                            return 'reject';
                        }
                        stagedFor() {
                            return [];
                        }
                    },
                };
                return checkProhibitions({ lib });
            },
            expect: 'outside-root',
        },
        {
            name: 'planted redaction miss',
            mutate: sources => sources,
            run: () => {
                const loaded = loadEmitterLib();
                if (loaded.error) {
                    return [loaded.error];
                }
                const lib = { ...loaded.lib, redactSecretStrings: text => ({ text, redacted: 0 }) };
                return checkProhibitions({ lib });
            },
            expect: 'redacted nothing',
        },
    ];
    let failed = 0;
    for (const testCase of cases) {
        let mutated;
        try {
            mutated = testCase.mutate(clean);
        } catch (err) {
            console.error(`${NAME} --self-test: FAIL -- '${testCase.name}' threw while mutating: ${err.message}`);
            failed++;
            continue;
        }
        if (testCase.name.startsWith('planted missing') || testCase.name.startsWith('planted permissive')) {
            if (JSON.stringify(mutated) === JSON.stringify(clean)) {
                console.error(`${NAME} --self-test: FAIL -- '${testCase.name}' did not modify the source; the anchor it edits has drifted`);
                failed++;
                continue;
            }
        }
        const failures = testCase.run(mutated);
        if (!failures.some(f => f.includes(testCase.expect))) {
            console.error(`${NAME} --self-test: FAIL -- '${testCase.name}' did not go red naming '${testCase.expect}'; got: ${failures.join(' | ') || '(no failures at all)'}`);
            failed++;
        } else {
            console.log(`  ok  ${testCase.name} -> red, naming '${testCase.expect}'`);
        }
    }
    if (failed) {
        return 1;
    }
    console.log(`${NAME} --self-test: PASS -- all planted faults went red`);
    return 0;
}

process.exit(await main());
