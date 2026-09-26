#!/usr/bin/env node
// scripts/download-plugins.mjs -- the plugin step of the Theia application build (NG-071).
// theia/applications/browser/package.json runs it as `download:plugins`, so `yarn build`
// installs every declared extension with no file placed by hand. Run with the
// application directory as cwd.
// Tarball kinds (the `.tgz` entries the generator emits for npm registry tarballs and
// local-path packs) are fetched or packed here, checked against their manifest sha256
// pin, and written to <pluginsDir>/<id>.tar.gz, the slot the extension-pins gate hashes.
// Every other entry goes to the stock `theia download:plugins --packed`, which rejects
// `.tgz` URLs. A pin mismatch fails the build naming the entry, and nothing is written for it.
// Last, every packed archive in <pluginsDir> is unpacked beside itself into <pluginsDir>/<id>/
// (NG-073): Theia's plugin deployer treats a THEIA_PLUGINS / THEIA_DEFAULT_PLUGINS folder
// as system plugins and refuses packed files there, while the pin gate needs the packed
// bytes. So both stay: the archive for the gate, the folder Theia loads.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { REPO_ROOT, resolveConfig } from './generate.mjs';

const NAME = 'download-plugins';
const appDir = process.cwd();
const pkg = JSON.parse(readFileSync(join(appDir, 'package.json'), 'utf8'));
const block = pkg.theiaPlugins ?? {};
const pluginsDir = resolve(appDir, pkg.theiaPluginsDir ?? 'plugins');
const configDir = process.env.PB_CONFIG_DIR ? resolve(process.env.PB_CONFIG_DIR) : undefined;
const { failures, config } = resolveConfig(join(REPO_ROOT, 'configuration.toml'), configDir ? join(configDir, 'configuration.toml') : undefined);
if (failures.length) die(`the manifest does not resolve: ${failures.join('; ')}`);
const entries = new Map((config.extensions ?? []).map(e => [e.id, e]));
const tarballIds = Object.keys(block).filter(id => block[id].endsWith('.tgz'));

mkdirSync(pluginsDir, { recursive: true });
for (const id of tarballIds) {
    const entry = entries.get(id);
    if (!entry) die(`theiaPlugins declares ${id}, which no [[extensions]] entry names -- regenerate and copy the theiaPlugins block over`);
    const bytes = entry.source === 'local-path' ? pack(resolve(configDir ?? REPO_ROOT, entry.path)) : await fetchBytes(block[id]);
    const actual = createHash('sha256').update(bytes).digest('hex');
    if (actual !== entry.sha256) {
        // A copy from an earlier build is removed too: the entry is not installed at all.
        rmSync(join(pluginsDir, `${id}.tar.gz`), { force: true });
        rmSync(join(pluginsDir, id), { recursive: true, force: true });
        die(`${id}: the ${entry.source} archive has sha256 ${actual}, the manifest pins ${entry.sha256} -- nothing was installed for it`);
    }
    writeFileSync(join(pluginsDir, `${id}.tar.gz`), bytes);
    console.log(`${NAME}: ${id} (${entry.source}) installed, bytes match the manifest`);
}

const rest = Object.fromEntries(Object.entries(block).filter(([id]) => !tarballIds.includes(id)));
if (Object.keys(rest).length > 0) {
    const tmp = mkdtempSync(join(tmpdir(), 'pb-plugins-'));
    writeFileSync(join(tmp, 'package.json'), JSON.stringify({ name: 'pb-plugin-download', private: true, theiaPluginsDir: pluginsDir, theiaPlugins: rest }));
    const r = spawnSync(join(REPO_ROOT, 'theia', 'node_modules', '.bin', 'theia'), ['download:plugins', '--packed'], { cwd: tmp, stdio: 'inherit' });
    rmSync(tmp, { recursive: true, force: true });
    if (r.status !== 0) process.exit(r.status ?? 1);
}

// The same unpacker the stock step uses in its unpacked mode.
const decompress = createRequire(join(REPO_ROOT, 'theia', 'package.json'))('decompress');
for (const file of readdirSync(pluginsDir)) {
    const suffix = ['.vsix', '.theia', '.tar.gz'].find(s => file.endsWith(s));
    if (!suffix || !statSync(join(pluginsDir, file)).isFile()) continue;
    const target = join(pluginsDir, file.slice(0, -suffix.length));
    rmSync(target, { recursive: true, force: true });
    await decompress(join(pluginsDir, file), target);
    console.log(`${NAME}: unpacked ${file}`);
}

function pack(folder) {
    const out = mkdtempSync(join(tmpdir(), 'pb-pack-'));
    const r = spawnSync('npm', ['pack', folder, '--pack-destination', out], { encoding: 'utf8' });
    const file = r.status === 0 && readdirSync(out).find(n => n.endsWith('.tgz'));
    const bytes = file && readFileSync(join(out, file));
    rmSync(out, { recursive: true, force: true });
    if (!bytes) die(`npm pack ${folder} failed: ${r.stderr}`);
    return bytes;
}

async function fetchBytes(url) {
    const res = await fetch(url);
    if (!res.ok) die(`${url} answered ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
}

function die(message) {
    console.error(`${NAME}: FAIL -- ${message}`);
    process.exit(1);
}
