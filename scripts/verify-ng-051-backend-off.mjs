#!/usr/bin/env node
// scripts/verify-ng-051-backend-off.mjs -- NG-051 (wave E, D2(b)): with [ai] backend = "off"
// no opencode process and no /mcp endpoint start.
//   Static half: the app composes @powerbrowser/backend-opencode exactly when the manifest
//   selects "opencode", and powerbrowserAiBackend equals the manifest value.
//   Live half: boots the BUILT backend with a fake `opencode` first on PATH. A same-run
//   positive control proves the fake is what `opencode` resolves to; the backend must
//   never spawn it, and GET /mcp must answer 404 while GET / answers 200.
// Tier: full (boots the built backend). Marker: live-clone.
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { emitAiBackend, resolveConfig } from './generate.mjs';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'ng051-backend-off';
const APP_PKG = join(REPO_ROOT, 'theia/applications/browser/package.json');
const MAIN_JS = join(REPO_ROOT, 'theia/applications/browser/lib/backend/main.js');
const ADAPTER = '@powerbrowser/backend-opencode';
const failures = [];

const { failures: rf, config } = resolveConfig(join(REPO_ROOT, 'configuration.toml'), undefined);
if (rf.length) failures.push(`configuration.toml does not resolve: ${rf.join('; ')}`);
const backend = JSON.parse(emitAiBackend(config, { id: 'dev' })).backend;
const pkg = JSON.parse(readFileSync(APP_PKG, 'utf8'));
const composed = Object.hasOwn(pkg.dependencies ?? {}, ADAPTER);
if (composed !== (backend === 'opencode')) {
    failures.push(`${ADAPTER} is ${composed ? '' : 'not '}a dependency of theia/applications/browser while [ai] backend is "${backend}" -- it must be composed exactly when the manifest selects "opencode"`);
}
const key = pkg.theia?.frontend?.config?.powerbrowserAiBackend;
if (key !== backend) failures.push(`package.json powerbrowserAiBackend is ${JSON.stringify(key)}, the manifest resolves "${backend}"`);

if (backend === 'off') {
    if (!existsSync(MAIN_JS)) failures.push(`${MAIN_JS} is absent -- run yarn build in theia/ first`);
    else await live();
}
finish();

async function live() {
    const dir = mkdtempSync(join(tmpdir(), 'ng051-'));
    const marker = join(dir, 'opencode-spawned');
    const bin = join(dir, 'bin');
    mkdirSync(bin);
    writeFileSync(join(bin, 'opencode'), `#!/bin/sh\necho "$@" >> '${marker}'\nexec sleep 60\n`);
    chmodSync(join(bin, 'opencode'), 0o755);
    const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
    delete env.POWERBROWSER_SUPERVISED;
    delete env.POWERBROWSER_TOKEN_DISABLE;
    const inShell = argv => ['develop', `${REPO_ROOT}#theia`, '--command', ...argv];
    // Positive control: through the same shell and PATH, `opencode` is the fake.
    spawnSync('nix', inShell(['bash', '-c', 'opencode acp & pid=$!; sleep 2; kill "$pid"']), { env, timeout: 120000 });
    if (!existsSync(marker)) {
        failures.push('instrument: a direct `opencode acp` through the theia shell did not reach the fake on PATH -- the absence below would prove nothing');
        rmSync(dir, { recursive: true, force: true });
        return;
    }
    rmSync(marker);
    const token = randomBytes(24).toString('hex');
    const log = join(dir, 'backend.log');
    const child = spawn('nix', inShell(['node', MAIN_JS, '--hostname', '127.0.0.1', '--port', '0']), {
        cwd: dir, detached: true, stdio: ['ignore', openSync(log, 'a'), openSync(log, 'a')],
        env: { ...env, POWERBROWSER_TOKEN: token, THEIA_CONFIG_DIR: join(dir, 'cfg') },
    });
    try {
        const port = await readyPort(log, child, 240000);
        await new Promise(r => setTimeout(r, 5000)); // the adapter spawns in initialize(), before READY; 5 s covers one respawn
        if (existsSync(marker)) failures.push(`an opencode process started with backend "off" (argv: ${readFileSync(marker, 'utf8').trim()})`);
        const auth = { headers: { Cookie: `POWERBROWSER_TOKEN=${token}` } };
        const control = await fetch(`http://127.0.0.1:${port}/`, auth);
        if (control.status !== 200) failures.push(`control: GET / answered ${control.status}, not 200 -- the /mcp probe proves nothing`);
        const mcp = await fetch(`http://127.0.0.1:${port}/mcp`, auth);
        if (mcp.status !== 404) failures.push(`GET /mcp answered ${mcp.status} with backend "off" -- expected 404 (no /mcp endpoint)`);
    } catch (err) {
        failures.push(err.message);
    } finally {
        try { process.kill(-child.pid, 'SIGKILL'); } catch { /* gone */ }
        rmSync(dir, { recursive: true, force: true });
    }
}

function readyPort(log, child, ms) {
    return new Promise((resolve, reject) => {
        const deadline = Date.now() + ms;
        const t = setInterval(() => {
            let text = '';
            try { text = readFileSync(log, 'utf8'); } catch { /* not yet */ }
            const hit = text.split('\n').find(l => l.startsWith('POWERBROWSER_BACKEND_READY '));
            if (hit) {
                clearInterval(t);
                try { resolve(JSON.parse(hit.slice('POWERBROWSER_BACKEND_READY '.length)).port); } catch { reject(new Error(`malformed READY line: ${hit}`)); }
            } else if (child.exitCode !== null) {
                clearInterval(t);
                reject(new Error(`the backend exited before READY (code ${child.exitCode}) -- log tail: ${text.slice(-1500)}`));
            } else if (Date.now() > deadline) {
                clearInterval(t);
                reject(new Error('POWERBROWSER_BACKEND_READY did not appear within 240 s'));
            }
        }, 500);
    });
}

function finish() {
    if (failures.length) {
        console.error(`${NAME}: FAIL -- ${failures.length} failure(s):\n  ${failures.join('\n  ')}`);
        process.exit(1);
    }
    console.log(`${NAME}: PASS -- adapter not composed with backend "off"; no opencode spawn; /mcp is 404`);
}
