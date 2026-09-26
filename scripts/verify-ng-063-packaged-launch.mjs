#!/usr/bin/env node
// scripts/verify-ng-063-packaged-launch.mjs -- NG-063 (wave E): the Linux package contains
// the Theia app, a Node runtime and distribution/, and launched from a temp prefix it
// reaches a ready workbench with the sidecar's backend entry AND its Node binary inside
// that prefix (/proc/<pid>/cmdline and /proc/<pid>/exe) -- never the checkout's dev tree,
// which also exists on the build host. R13: the packaged node/bin/node is the official
// release pinned in powerbrowser/packaging/node-runtime.json. Its `--version` must equal
// the pin, and its bytes must name no /nix/store/ path (no Nix interpreter, no Nix RPATH).
// Tier: full. Marker: live-main.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { withFirefoxPage } from './lib/firefox-bidi.mjs';
import { extractPackage, REPO_ROOT } from './lib/built-tree.mjs';
import { resolveConfig } from './generate.mjs';

const NAME = 'ng063-packaged-launch';
const failures = [];
const { config } = resolveConfig(join(REPO_ROOT, 'configuration.toml'), undefined);
let prefix;
try {
    prefix = extractPackage();
    const need = [config.identity.binary_name, 'theia/lib/backend/main.js', 'theia/lib/frontend/index.html',
        'theia/package.json', 'node/bin/node', 'distribution/policies.json'];
    for (const rel of need) if (!existsSync(join(prefix, rel))) failures.push(`the package lacks ${rel}`);
    if (failures.length === 0) checkNode(join(prefix, 'node/bin/node'));
    if (failures.length === 0) await launch();
} catch (err) {
    failures.push(err.message);
} finally {
    if (prefix) rmSync(dirname(prefix), { recursive: true, force: true });
}
if (failures.length) {
    console.error(`${NAME}: FAIL -- ${failures.length} failure(s):\n  ${failures.join('\n  ')}`);
    process.exit(1);
}
console.log(`${NAME}: PASS -- the packaged tree reached a ready workbench on its own Theia and Node`);

async function launch() {
    delete process.env.PB_BACKEND_MAIN; // the launch must use the install's own resolution
    process.env.XDG_CONFIG_HOME = mkdtempSync(join(tmpdir(), 'ng063-cfg-'));
    await withFirefoxPage('', async ({ waitFor }) => {
        await waitFor('window.theia && window.theia.container ? true : false', { timeoutMs: 90000 });
        await waitFor('!!document.querySelector("#theia-app-shell")', { timeoutMs: 60000 });
        const ours = backends().filter(b => b.main.startsWith(`${prefix}/`));
        if (ours.length === 0) failures.push(`no running backend has its entry inside ${prefix} (running: ${backends().map(b => b.main).join(', ') || 'none'})`);
        for (const b of ours) if (!b.exe.startsWith(`${prefix}/`)) failures.push(`the backend runs on Node ${b.exe}, outside the install prefix`);
    }, { binPath: join(prefix, config.identity.binary_name) });
}

function checkNode(bin) {
    const pinPath = join(REPO_ROOT, 'powerbrowser/packaging/node-runtime.json');
    if (!existsSync(pinPath)) { failures.push('powerbrowser/packaging/node-runtime.json (the Node pin) is absent'); return; }
    const pin = JSON.parse(readFileSync(pinPath, 'utf8'))['linux-x64'];
    if (readFileSync(bin).includes('/nix/store/')) failures.push('the packaged node/bin/node names a /nix/store/ path -- it is not the official release binary');
    const version = execFileSync(bin, ['--version'], { encoding: 'utf8' }).trim();
    if (version !== pin?.version) failures.push(`the packaged node is ${version}, the pin is ${pin?.version}`);
}

function backends() {
    const out = [];
    for (const pid of readdirSync('/proc').filter(n => /^\d+$/.test(n))) {
        let argv;
        try { argv = readFileSync(`/proc/${pid}/cmdline`, 'utf8').split('\0'); } catch { continue; }
        const main = argv.find(a => a.endsWith('/lib/backend/main.js'));
        if (!main || !argv.includes('--hostname')) continue;
        let exe = '';
        try { exe = readlinkSync(`/proc/${pid}/exe`); } catch { /* raced */ }
        out.push({ pid, main, exe });
    }
    return out;
}
