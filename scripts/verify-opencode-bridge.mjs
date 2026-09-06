#!/usr/bin/env node
/**
 * 16-03's opencode bridge-plus-selection gate: the slice-0 bridge (minimal
 * read-only /mcp endpoint, per-spawn token injection via opencode
 * {env:} interpolation) and the configuration.toml backend selection,
 * under mechanical enforcement.
 *
 * WHAT IT ASSERTS, all derived from the tree at check time and compared
 * as SET EQUALITY against the one EXPECTED const below, so additions and
 * removals each go red naming the drift:
 *   - the /mcp route plus the read-only tool set (workspace_list,
 *     workspace_read -- a writable tool planted anywhere in the
 *     contribution goes red)
 *   - reference-only checked-in config (URL plus {env:} refs, no value;
 *     a hardcoded secret planted in it goes red) plus the same refs in
 *     the supervisor's per-session entry path
 *   - selection default-off through the generator's own resolver and
 *     emitter (a default-on manifest goes red), fragment equality when
 *     generated/ exists, block equality on the composed manifest key,
 *     and missing-key-means-off proven by resolving a manifest copy with
 *     the [ai] table removed
 *   - doc coverage: the ownership doc names every CLI-owned tool id,
 *     states opencode-side model selection, notes serve-attach as
 *     fallback-only, and carries the bridge setup steps (a removed tool
 *     row goes red)
 *   - fixture proofs for live-read shape (POST dispatch covers
 *     initialize/tools-list/tools-call, GET carries the live root),
 *     reference-only config, missing-key-off, and variables-plus-skills
 *     resolution (the agent consumes the framework-resolved prompt text
 *     and the shared Change Set surface, declaring no variables of its
 *     own -- resolution happens framework-side)
 *   - hygiene: captured-env use (no host-env read in the contribution,
 *     supervisor, or bridge-env helper), fail-closed exit(78) in the
 *     contribution, the backend-module bind, and user copy carrying no
 *     internal identifiers
 *
 * LIVE /mcp AUTH IS MANDATORY, never staged: the gate boots the built
 * backend on 127.0.0.1 with an OS-assigned port (start_backend idiom: a
 * minted token, a fresh config dir, READY-line poll), then asserts an
 * authenticated GET plus an authenticated POST tool call return 200 with
 * live workspace state while anonymous GET plus POST are refused 403
 * with no Set-Cookie leak. A backend that never becomes ready fails the
 * gate non-zero. The backend stops on every path.
 *
 * THE R5 BACKSTOP IS A HELD-OUT STAGED TEST, never a silent pass:
 * concurrent workspace read during an applied write needs a live host.
 * The default entry point prints STAGED with the exact rerun command and
 * exits cleanly. `node scripts/verify-opencode-bridge.mjs --live-backstop`
 * runs the real hammer (concurrent reads around a mid-flight applied
 * write: every read 200 with whole before-or-after bytes, never mixed,
 * never a crash) and fails naming the drift when it regresses.
 *
 * Honestly --quick with one declared exception (tracer-gate precedent):
 * text reads plus compiled-tree derivation, plus one backend boot
 * (typically one to two minutes: nix develop cold start plus Theia
 * backend init). Requires the built app bundle (theia build output is
 * git-ignored -- rebuild it after extension changes or the live half
 * tests a stale backend). No browser, no display, no live model.
 *
 * Usage:
 *   node scripts/verify-opencode-bridge.mjs
 *   node scripts/verify-opencode-bridge.mjs --self-test
 *   node scripts/verify-opencode-bridge.mjs --live-backstop
 */

import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { emitAiBackend, resolveConfig } from './generate.mjs';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'verify-opencode-bridge';
const RERUN_BACKSTOP = 'node scripts/verify-opencode-bridge.mjs --live-backstop';
const MAIN_JS = 'theia/applications/browser/lib/backend/main.js';

const args = process.argv.slice(2);
const SELF_TEST = args.includes('--self-test');
const LIVE_BACKSTOP = args.includes('--live-backstop');
for (const a of args) {
    if (a !== '--self-test' && a !== '--live-backstop') {
        console.error(`${NAME}: FAIL -- unknown argument '${a}'`);
        process.exit(2);
    }
}

const REL = {
    contribution: 'theia/extensions/backend-opencode/src/node/opencode-mcp-contribution.ts',
    bridgeEnv: 'theia/extensions/backend-opencode/src/node/opencode-bridge-env.ts',
    backendModule: 'theia/extensions/backend-opencode/src/node/backend-opencode-backend-module.ts',
    supervisor: 'theia/extensions/backend-opencode/src/node/opencode-acp-supervisor.ts',
    frontendModule: 'theia/extensions/backend-opencode/src/browser/backend-opencode-frontend-module.ts',
    agent: 'theia/extensions/backend-opencode/src/browser/opencode-chat-agent.ts',
    mcpJson: 'theia/extensions/backend-opencode/opencode.mcp.json',
    manifest: 'configuration.toml',
    doc: 'docs/ai-opencode-adapter.md',
    appPkg: 'theia/applications/browser/package.json',
    fragment: 'generated/ai-backend.json',
};

/**
 * The declared bridge-plus-selection contract, in one place. The ONE
 * hand-kept list in this file: editing it is how a deliberate contract
 * change is made -- it shows up in the diff for review. Everything it is
 * compared against is derived at check time. CLI-owned ids verified
 * against the opencode 1.18.25 tool sources (sst/opencode tag v1.18.25,
 * packages/opencode/src/tool/*.ts Tool.define ids).
 */
const EXPECTED = Object.freeze({
    route: '/mcp',
    tools: Object.freeze(['workspace_list', 'workspace_read']),
    postMethods: Object.freeze(['initialize', 'notifications/initialized', 'tools/list', 'tools/call']),
    configRefs: Object.freeze(['{env:POWERBROWSER_MCP_TOKEN}', '{env:POWERBROWSER_MCP_PORT}']),
    bridgeEnvVar: 'POWERBROWSER_MCP_TOKEN',
    selectionDefault: 'off',
    selectionValues: Object.freeze(['off', 'opencode']),
    composedKey: 'powerbrowserAiBackend',
    cliOwnedTools: Object.freeze([
        'bash', 'edit', 'read', 'write', 'glob', 'grep', 'task', 'todowrite',
        'webfetch', 'websearch', 'lsp', 'skill', 'question', 'plan_exit', 'apply_patch',
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

/** Full-line // comments are documentation; anything else carrying the text counts. */
function uncommentedLines(source) {
    return source.split('\n').filter(line => !/^\s*\/\//.test(line));
}

/** @returns {string[]} failure messages -- empty means the gate holds. */
function checkStatic(sources, workDir) {
    const failures = [];
    const contrib = sources[REL.contribution] ?? '';
    const benv = sources[REL.bridgeEnv] ?? '';
    const bmod = sources[REL.backendModule] ?? '';
    const sup = sources[REL.supervisor] ?? '';
    const fmod = sources[REL.frontendModule] ?? '';
    const agent = sources[REL.agent] ?? '';
    const mcpJson = sources[REL.mcpJson] ?? '';
    const doc = sources[REL.doc] ?? '';
    const appPkg = sources[REL.appPkg] ?? '';

    for (const [rel, src] of Object.entries(sources)) {
        if (rel === REL.fragment) {
            continue;
        }
        if (!src) {
            failures.push(`${rel}: unreadable -- the bridge sources must exist for this comparison to prove anything`);
        }
    }
    if (failures.length) {
        return failures;
    }

    const contribCode = codeOnly(contrib);

    // Route plus read-only tool set, set equality: a writable tool planted
    // anywhere in the contribution both widens the surface and goes red.
    if (!contribCode.includes(`'${EXPECTED.route}'`) && !contribCode.includes(`"${EXPECTED.route}"`)) {
        failures.push(`${REL.contribution}: route drift -- '${EXPECTED.route}' is not served`);
    }
    const toolLiterals = [...contribCode.matchAll(/'(workspace_[a-z_]+)'/g)].map(m => m[1]);
    const toolDiff = diffSets([...new Set(toolLiterals)], EXPECTED.tools);
    if (toolDiff.surplus.length || toolDiff.missing.length) {
        failures.push(`${REL.contribution}: tool-surface drift (surplus [${toolDiff.surplus.join(', ')}], missing [${toolDiff.missing.join(', ')}]) -- contract is [${[...EXPECTED.tools].join(', ')}] (T-16-03-02)`);
    }

    // POST dispatch covers the live-read shape the live half exercises.
    const methodHits = [...EXPECTED.postMethods].filter(m => contribCode.includes(`'${m}'`));
    const methodDiff = diffSets(methodHits, EXPECTED.postMethods);
    if (methodDiff.missing.length) {
        failures.push(`${REL.contribution}: dispatch drift -- missing [${methodDiff.missing.join(', ')}] from [${[...EXPECTED.postMethods].join(', ')}]`);
    }
    if (!contribCode.includes('workspaceRoot')) {
        failures.push(`${REL.contribution}: GET-shape drift -- the descriptor must carry the live workspace root`);
    }

    // Reference-only checked-in config: URL plus interpolation refs, no
    // value. A hardcoded secret planted here goes red (T-16-03-01).
    let bridge = null;
    try {
        bridge = JSON.parse(mcpJson);
    } catch {
        failures.push(`${REL.mcpJson}: not valid JSON -- opencode must be able to read it`);
    }
    if (bridge) {
        const entry = bridge?.mcp?.powerbrowser;
        if (!entry || entry.type !== 'remote') {
            failures.push(`${REL.mcpJson}: shape drift -- mcp.powerbrowser must be a remote entry`);
        }
        for (const ref of EXPECTED.configRefs) {
            if (!mcpJson.includes(ref)) {
                failures.push(`${REL.mcpJson}: reference drift -- '${ref}' missing (per-spawn value injected, never committed)`);
            }
        }
        const headerValues = Object.values(entry?.headers ?? {});
        for (const value of headerValues) {
            if (typeof value === 'string' && !value.includes('{env:')) {
                failures.push(`${REL.mcpJson}: hardcoded secret -- header value '${value}' carries no interpolation reference`);
            }
        }
        if (typeof entry?.url === 'string' && !entry.url.includes('{env:')) {
            failures.push(`${REL.mcpJson}: checked-in port -- the URL must reference the per-launch port, never a value`);
        }
    }

    // The per-session entry path carries the same reference, never a value.
    if (!sup.includes('buildBridgeServerEntry') || !sup.includes('bridgeServers')) {
        failures.push(`${REL.supervisor}: bridge-entry drift -- session/new must carry the per-session server entry`);
    }
    if (!contribCode.includes('{env:')) {
        failures.push(`${REL.contribution}: entry-builder drift -- the server entry must reference the per-spawn variable`);
    }
    if (!benv.includes('buildBridgeChildEnv') || !benv.includes('POWERBROWSER_SUPERVISED') || !benv.includes('POWERBROWSER_TOKEN')) {
        failures.push(`${REL.bridgeEnv}: scrub drift -- the child-env builder must scrub the marker plus the supervisor token name`);
    }
    if (!benv.includes(EXPECTED.bridgeEnvVar)) {
        failures.push(`${REL.bridgeEnv}: injection drift -- the child env must set ${EXPECTED.bridgeEnvVar}`);
    }

    // Selection default-off through the generator's own resolver plus
    // emitter (T-16-03-03): a default-on manifest goes red here.
    const manifestPath = join(workDir, 'manifest-check.toml');
    writeFileSync(manifestPath, sources[REL.manifest] ?? '', 'utf8');
    const { failures: resolveFailures, config } = resolveConfig(manifestPath, undefined);
    if (resolveFailures.length > 0) {
        failures.push(`${REL.manifest}: unresolvable -- ${resolveFailures[0]}`);
    } else {
        const backend = config?.ai?.backend;
        if (backend !== EXPECTED.selectionDefault) {
            failures.push(`${REL.manifest}: selection drift -- ai.backend is ${JSON.stringify(backend)}, contract is '${EXPECTED.selectionDefault}' (T-16-03-03)`);
        }
        const emitted = JSON.parse(emitAiBackend(config, 'dev'));
        if (emitted.backend !== EXPECTED.selectionDefault) {
            failures.push(`emitAiBackend: derivation drift -- emitted ${JSON.stringify(emitted.backend)} for the checked-in manifest`);
        }
        // Fragment equality when generated/ exists (absent on a fresh
        // clone -- the tracked pin below is what always runs).
        const fragment = sources[REL.fragment];
        if (fragment) {
            let parsed = null;
            try {
                parsed = JSON.parse(fragment);
            } catch {
                failures.push(`${REL.fragment}: not valid JSON -- regenerate from the manifest`);
            }
            if (parsed && parsed.backend !== emitted.backend) {
                failures.push(`${REL.fragment}: stale -- carries ${JSON.stringify(parsed.backend)}, the manifest emits ${JSON.stringify(emitted.backend)} (run the generator)`);
            }
        }
        // Block equality on the composed key: the yarn-managed manifest
        // must agree with what the manifest emits.
        let pkg = null;
        try {
            pkg = JSON.parse(appPkg);
        } catch {
            failures.push(`${REL.appPkg}: not valid JSON`);
        }
        const composed = pkg?.theia?.frontend?.config?.[EXPECTED.composedKey];
        if (composed !== emitted.backend) {
            failures.push(`${REL.appPkg}: copy-over drift -- ${EXPECTED.composedKey} is ${JSON.stringify(composed)}, the manifest emits ${JSON.stringify(emitted.backend)}`);
        }
        // Missing key means off: resolve a manifest copy with the [ai]
        // table removed and prove the emitter still says off.
        const stripped = (sources[REL.manifest] ?? '').replace(/^\[ai\][^\[]*/ms, '');
        const strippedPath = join(workDir, 'manifest-stripped.toml');
        writeFileSync(strippedPath, stripped, 'utf8');
        const noKey = resolveConfig(strippedPath, undefined);
        if (noKey.failures.length > 0) {
            failures.push(`missing-key fixture: unresolvable without [ai] -- ${noKey.failures[0]}`);
        } else if (JSON.parse(emitAiBackend(noKey.config, 'dev')).backend !== 'off') {
            failures.push('missing-key fixture: a manifest without [ai] did not resolve to off');
        }
    }

    // The composition consumes the fragment through a plain conditional so
    // the binding is skipped entirely when off (missing key means off).
    if (!fmod.includes(`['${EXPECTED.composedKey}']`) || !fmod.includes(`=== 'opencode'`)) {
        failures.push(`${REL.frontendModule}: selection-gate drift -- the binds must sit behind a plain conditional on ${EXPECTED.composedKey}`);
    }

    // Variables-plus-skills resolution: the agent consumes the
    // framework-resolved prompt text and the shared Change Set surface
    // while declaring no variables of its own -- resolution happens
    // framework-side, before invoke.
    for (const marker of ['request.message.request.text', 'new ChangeSetImpl', 'OpencodeService']) {
        if (!agent.includes(marker)) {
            failures.push(`${REL.agent}: sharing drift -- '${marker}' missing (R6: shared sessions, variables, skills)`);
        }
    }
    if (!/readonly variables[^=]*=\s*\[\]/.test(agent)) {
        failures.push(`${REL.agent}: ownership drift -- the agent must declare no variables of its own (CLI tools stay opencode-side)`);
    }

    // Doc coverage: every CLI-owned tool named, model selection
    // opencode-side, serve-attach fallback-only, setup steps present.
    if (!doc.includes('CLI-owned')) {
        failures.push(`${REL.doc}: ownership drift -- the shared-versus-CLI-owned split is not stated`);
    }
    const toolHits = [...EXPECTED.cliOwnedTools].filter(id => doc.includes(`\`${id}\``));
    const toolDocDiff = diffSets(toolHits, EXPECTED.cliOwnedTools);
    if (toolDocDiff.missing.length) {
        failures.push(`${REL.doc}: tool-coverage drift -- missing [${toolDocDiff.missing.join(', ')}] from the CLI-owned list (R6)`);
    }
    for (const marker of ['Model selection stays opencode-side', 'fallback only', 'configuration.toml', 'node scripts/generate.mjs']) {
        if (!doc.includes(marker)) {
            failures.push(`${REL.doc}: coverage drift -- '${marker}' missing`);
        }
    }

    // Hygiene: captured-env use, fail-closed exits, the module bind.
    for (const [rel, src] of [[REL.contribution, contrib], [REL.supervisor, sup]]) {
        const hits = uncommentedLines(src).filter(line => line.includes('process.env'));
        if (hits.length) {
            failures.push(`${rel}: ${hits.length} direct host-env read(s) -- use the captured env module (T-16-01-03)`);
        }
    }
    if (!contrib.includes('exit(78)')) {
        failures.push(`${REL.contribution}: fail-closed exit(78) missing -- handshake must gate listen`);
    }
    if (!bmod.includes('BackendApplicationContribution).toService(OpencodeMcpContribution')) {
        failures.push(`${REL.backendModule}: bind drift -- the /mcp contribution is not composed`);
    }

    // User copy carries no internal identifiers (diagnostic file paths in
    // failure text are fine -- this is the user-facing doc only).
    for (const marker of ['node:', '/home/', '.ts', 'ChatAgent', 'BackendApplicationContribution', 'OPENCODE_SERVICE_PATH']) {
        if (doc.includes(marker)) {
            failures.push(`${REL.doc}: copy drift -- internal identifier '${marker}' leaked into user copy`);
        }
    }

    return failures;
}

// -- live backend ------------------------------------------------------------

function cookieFetch(port, token, path, init = {}) {
    const headers = { ...(init.headers ?? {}), Cookie: `POWERBROWSER_TOKEN=${token}` };
    return fetch(`http://127.0.0.1:${port}${path}`, { ...init, headers });
}

/**
 * Boot the built backend (start_backend idiom) with its cwd at markerDir,
 * so the endpoint's workspace-root fallback serves live state the gate
 * authored. Resolves {port, token, stop} -- rejects when the backend
 * never becomes ready (fail, never skip).
 */
function bootBackend(markerDir) {
    return new Promise((resolve, reject) => {
        const token = randomBytes(24).toString('hex');
        const configDir = mkdtempSync(join(tmpdir(), 'pb-bridge-cfg-'));
        const logPath = join(markerDir, 'backend.log');
        const env = { ...process.env };
        delete env.POWERBROWSER_SUPERVISED;
        delete env.POWERBROWSER_TOKEN_DISABLE;
        env.POWERBROWSER_TOKEN = token;
        env.THEIA_CONFIG_DIR = configDir;
        env.VSX_REGISTRY_URL = 'https://open-vsx.org';
        let outFd;
        try {
            outFd = openSync(logPath, 'a');
        } catch (err) {
            reject(new Error(`bootBackend: cannot open log -- ${err.message}`));
            return;
        }
        let child;
        try {
            child = spawn('nix',
                ['develop', `${REPO_ROOT}#theia`, '--command', 'node', join(REPO_ROOT, MAIN_JS),
                    '--hostname', '127.0.0.1', '--port', '0'],
                { cwd: markerDir, env, detached: true, stdio: ['ignore', outFd, outFd] });
        } catch (err) {
            reject(new Error(`bootBackend: spawn failed -- ${err.message}`));
            return;
        }
        const stop = () => {
            try {
                process.kill(-child.pid, 'SIGTERM');
            } catch { /* already gone */ }
            setTimeout(() => {
                try {
                    process.kill(-child.pid, 'SIGKILL');
                } catch { /* reaped */ }
            }, 5000).unref?.();
        };
        const deadline = Date.now() + 240000;
        const poll = setInterval(() => {
            if (child.exitCode !== null) {
                clearInterval(poll);
                let tail = '';
                try {
                    tail = readFileSync(logPath, 'utf8').slice(-2000);
                } catch { /* no log */ }
                stop();
                reject(new Error(`bootBackend: backend exited before READY -- log tail: ${tail}`));
                return;
            }
            if (Date.now() > deadline) {
                clearInterval(poll);
                stop();
                reject(new Error('bootBackend: POWERBROWSER_BACKEND_READY did not appear within 240s'));
                return;
            }
            let line = '';
            try {
                const log = readFileSync(logPath, 'utf8');
                const hit = log.split('\n').find(l => l.startsWith('POWERBROWSER_BACKEND_READY '));
                if (hit) {
                    line = hit.slice('POWERBROWSER_BACKEND_READY '.length);
                }
            } catch { /* not yet */ }
            if (!line) {
                return;
            }
            let port = 0;
            try {
                port = JSON.parse(line).port;
            } catch { /* malformed */ }
            if (typeof port === 'number' && port > 0) {
                clearInterval(poll);
                resolve({ port, token, stop, configDir });
                return;
            }
        }, 1000);
    });
}

/** Mandatory live /mcp auth proof: token holders read live state, anonymous callers are refused. */
async function checkLive() {
    const failures = [];
    if (!existsSync(join(REPO_ROOT, MAIN_JS))) {
        return [`${MAIN_JS} absent -- rebuild the browser app first (theia build output is git-ignored)`];
    }
    const markerDir = mkdtempSync(join(tmpdir(), 'pb-bridge-live-'));
    const markerName = 'bridge-marker.txt';
    const markerBytes = `live-bytes-${randomBytes(8).toString('hex')}\n`;
    writeFileSync(join(markerDir, markerName), markerBytes, 'utf8');
    let backend;
    try {
        backend = await bootBackend(markerDir);
    } catch (err) {
        rmSync(markerDir, { recursive: true, force: true });
        return [`live backend: ${err.message}`];
    }
    const { port, token, stop, configDir } = backend;
    const done = () => {
        stop();
        rmSync(markerDir, { recursive: true, force: true });
        rmSync(configDir, { recursive: true, force: true });
    };
    try {
        // Anonymous GET plus POST are refused fail-closed with no cookie leak.
        for (const init of [{}, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }]) {
            let res;
            try {
                res = await fetch(`http://127.0.0.1:${port}/mcp`, init);
            } catch (err) {
                failures.push(`live anonymous ${init.method ?? 'GET'}: unreachable -- ${err.message}`);
                continue;
            }
            if (res.status !== 403) {
                failures.push(`live anonymous ${init.method ?? 'GET'}: status ${res.status}, contract is 403`);
            }
            if (res.headers.get('set-cookie') !== null) {
                failures.push(`live anonymous ${init.method ?? 'GET'}: refusal set a cookie`);
            }
            await res.arrayBuffer().catch(() => undefined);
        }
        // Authenticated GET returns 200 with the LIVE workspace root.
        try {
            const res = await cookieFetch(port, token, '/mcp');
            if (res.status !== 200) {
                failures.push(`live auth GET: status ${res.status}, contract is 200`);
            } else {
                const body = await res.json();
                if (body.workspaceRoot !== markerDir) {
                    failures.push(`live auth GET: workspaceRoot ${JSON.stringify(body.workspaceRoot)}, contract is the live dir ${markerDir}`);
                }
                const tools = new Set(body.tools ?? []);
                for (const t of EXPECTED.tools) {
                    if (!tools.has(t)) {
                        failures.push(`live auth GET: tool '${t}' missing from [${[...tools].join(', ')}]`);
                    }
                }
            }
        } catch (err) {
            failures.push(`live auth GET: unreachable -- ${err.message}`);
        }
        // Authenticated POST tools/list plus a tools/call file read return
        // 200 with live bytes.
        const post = (payload, withToken) => {
            const init = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            };
            return withToken ? cookieFetch(port, token, '/mcp', init) : fetch(`http://127.0.0.1:${port}/mcp`, init);
        };
        try {
            const res = await post({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }, true);
            if (res.status !== 200) {
                failures.push(`live tools/list: status ${res.status}, contract is 200`);
            } else {
                const names = new Set(((await res.json()).result?.tools ?? []).map(t => t.name));
                for (const t of EXPECTED.tools) {
                    if (!names.has(t)) {
                        failures.push(`live tools/list: tool '${t}' missing`);
                    }
                }
            }
        } catch (err) {
            failures.push(`live tools/list: unreachable -- ${err.message}`);
        }
        try {
            const res = await post({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'workspace_read', arguments: { path: markerName } } }, true);
            if (res.status !== 200) {
                failures.push(`live tools/call: status ${res.status}, contract is 200`);
            } else {
                const text = (await res.json()).result?.content?.[0]?.text;
                if (text !== markerBytes) {
                    failures.push(`live tools/call: read ${JSON.stringify(text)}, contract is the live bytes ${JSON.stringify(markerBytes)}`);
                }
            }
        } catch (err) {
            failures.push(`live tools/call: unreachable -- ${err.message}`);
        }
    } finally {
        done();
    }
    return failures;
}

/**
 * R5 backstop hammer, live only: concurrent reads around a mid-flight
 * applied write. Every read must be 200 with WHOLE before-or-after bytes
 * (point-in-time, never mixed) and nothing may crash.
 */
async function checkLiveBackstop() {
    if (!existsSync(join(REPO_ROOT, MAIN_JS))) {
        return [`${MAIN_JS} absent -- rebuild the browser app first`];
    }
    const failures = [];
    const markerDir = mkdtempSync(join(tmpdir(), 'pb-bridge-backstop-'));
    const markerName = 'backstop.txt';
    const before = `before-${randomBytes(8).toString('hex')}\n`;
    const after = `before-${randomBytes(8).toString('hex')}-AND-AFTER\n`;
    writeFileSync(join(markerDir, markerName), before, 'utf8');
    let backend;
    try {
        backend = await bootBackend(markerDir);
    } catch (err) {
        rmSync(markerDir, { recursive: true, force: true });
        return [`backstop backend: ${err.message}`];
    }
    const { port, token, stop, configDir } = backend;
    try {
        const readOnce = () => cookieFetch(port, token, '/mcp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'workspace_read', arguments: { path: markerName } } }),
        }).then(async res => {
            if (res.status !== 200) {
                return { status: res.status, text: null };
            }
            return { status: 200, text: (await res.json()).result?.content?.[0]?.text ?? null };
        });
        const readers = Array.from({ length: 8 }, () => readOnce());
        await new Promise(r => setTimeout(r, 250));
        writeFileSync(join(markerDir, markerName), after, 'utf8');
        const results = await Promise.all(readers);
        for (const [i, r] of results.entries()) {
            if (r.status !== 200) {
                failures.push(`backstop read ${i}: status ${r.status} during an applied write (contract: 200, never a crash)`);
            } else if (r.text !== before && r.text !== after) {
                failures.push(`backstop read ${i}: mixed bytes ${JSON.stringify(r.text)} (contract: whole before-or-after only)`);
            }
        }
        const settled = await readOnce();
        if (settled.text !== after) {
            failures.push(`backstop settle: read ${JSON.stringify(settled.text)} after the write landed (contract: ${JSON.stringify(after)})`);
        }
    } finally {
        stop();
        rmSync(markerDir, { recursive: true, force: true });
        rmSync(configDir, { recursive: true, force: true });
    }
    return failures;
}

// -- entry points ------------------------------------------------------------

async function runDefault() {
    const workDir = mkdtempSync(join(tmpdir(), 'pb-bridge-gate-'));
    try {
        const sources = readSources();
        const staticFailures = checkStatic(sources, workDir);
        for (const f of staticFailures) {
            console.error(`${NAME}: FAIL -- ${f}`);
        }
        if (staticFailures.length) {
            process.exit(1);
        }
        console.log(`${NAME}: PASS -- static bridge-plus-selection contract holds`);
        const liveFailures = await checkLive();
        for (const f of liveFailures) {
            console.error(`${NAME}: FAIL -- ${f}`);
        }
        if (liveFailures.length) {
            process.exit(1);
        }
        console.log(`${NAME}: PASS -- live /mcp auth proven (token GET plus POST read live state, anonymous refused)`);
        console.log(`${NAME}: STAGED -- R5 concurrent-read backstop held out (rerun: ${RERUN_BACKSTOP})`);
    } finally {
        rmSync(workDir, { recursive: true, force: true });
    }
}

async function runLiveBackstop() {
    const failures = await checkLiveBackstop();
    for (const f of failures) {
        console.error(`${NAME}: FAIL -- ${f}`);
    }
    if (failures.length) {
        process.exit(1);
    }
    console.log(`${NAME}: PASS -- R5 backstop holds (concurrent reads point-in-time across an applied write)`);
}

async function runSelfTest() {
    const { spawnSync } = await import('node:child_process');
    const run = (extra) => spawnSync(process.execPath, [join(REPO_ROOT, 'scripts/verify-opencode-bridge.mjs'), ...extra],
        { encoding: 'utf8', timeout: 600000 });
    // Green first: the unmutated control (including the live backend half
    // and the STAGED backstop line) must pass before any plant means anything.
    const control = run([]);
    if (control.status !== 0) {
        console.error(`${NAME}: --self-test FAIL -- unmutated control is already red, so the plants below would mean nothing:\n${control.stderr.slice(-2000)}`);
        process.exit(1);
    }
    if (!control.stdout.includes('STAGED')) {
        console.error(`${NAME}: --self-test FAIL -- control green but the R5 STAGED holdout line is missing`);
        process.exit(1);
    }
    console.log(`${NAME}: --self-test -- unmutated control green (live half included), planting four faults`);
    const workDir = mkdtempSync(join(tmpdir(), 'pb-bridge-selftest-'));
    try {
        const clean = readSources();
        const plants = [
            {
                name: 'writable-tool plant',
                want: 'tool-surface drift',
                mutate: s => ({
                    ...s,
                    [REL.contribution]: `${s[REL.contribution]}\nexport const OPENCODE_MCP_TOOL_WRITE = 'workspace_write';\n`,
                }),
            },
            {
                name: 'hardcoded-secret plant',
                want: 'hardcoded secret',
                mutate: s => ({
                    ...s,
                    [REL.mcpJson]: s[REL.mcpJson].replace('{env:POWERBROWSER_MCP_TOKEN}', 'tok-hardcoded-abc123'),
                }),
            },
            {
                name: 'default-on plant',
                want: 'selection drift',
                mutate: s => ({
                    ...s,
                    [REL.manifest]: s[REL.manifest].replace('backend = "off"', 'backend = "opencode"'),
                }),
            },
            {
                name: 'missing-doc-row plant',
                want: 'tool-coverage drift',
                mutate: s => ({
                    ...s,
                    [REL.doc]: s[REL.doc].split('\n').filter(l => !l.startsWith('| `bash`')).join('\n'),
                }),
            },
        ];
        for (const plant of plants) {
            const failures = checkStatic(plant.mutate(clean), workDir);
            if (!failures.some(f => f.includes(plant.want))) {
                console.error(`${NAME}: --self-test FAIL -- ${plant.name} did not go red naming the drift (got [${failures.join(' | ')}])`);
                process.exit(1);
            }
            console.log(`${NAME}: --self-test -- ${plant.name} went red naming the drift`);
        }
    } finally {
        rmSync(workDir, { recursive: true, force: true });
    }
    console.log(`${NAME}: --self-test PASS -- all four plants behaved as pinned`);
}

if (SELF_TEST) {
    await runSelfTest();
} else if (LIVE_BACKSTOP) {
    await runLiveBackstop();
} else {
    await runDefault();
}
