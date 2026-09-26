#!/usr/bin/env node
// scripts/verify-ng-071-tarball-extensions.mjs -- NG-071 (wave E): npm and local-path (.tgz)
// extension sources install through `yarn build` with no files placed by hand.
//   1. Declares one npm entry (chart.js 4.5.1, the 09-04 drill package) and one local-path
//      entry in a fixture manifest (a copy of configuration.toml plus two [[extensions]]
//      tables, pins computed from the real bytes).
//   2. Emits the theiaPlugins block with the generator's own emitter.
//   3. Runs the app's declared download:plugins step with PB_CONFIG_DIR at the fixture.
//      Both archives must land at <plugins>/<id>.tar.gz with their pinned sha256.
//   4. With a wrong local pin, the step must fail naming the entry and install nothing
//      for it.
// Tier: full (npm registry). Marker: live-clone.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { emitTheiaPlugins, npmDistTarballUrl, resolveConfig } from './generate.mjs';
import { runDeclaredPluginStep } from './lib/scratch-app.mjs';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'ng071-tarball-extensions-build';
const sha256 = b => createHash('sha256').update(b).digest('hex');
const failures = [];
const dir = mkdtempSync(join(tmpdir(), 'ng071-'));
const cfg = join(dir, 'cfg');
const steps = [];
try {
    cpSync(join(REPO_ROOT, 'brand'), join(cfg, 'brand'), { recursive: true });
    const local = join(cfg, 'extensions', 'ng071-local');
    mkdirSync(local, { recursive: true });
    writeFileSync(join(local, 'package.json'), JSON.stringify({ name: 'ng071-local', version: '0.0.1', main: 'index.js' }));
    writeFileSync(join(local, 'index.js'), 'module.exports = {};\n');
    const npmBytes = Buffer.from(await (await fetch(npmDistTarballUrl({ id: 'chart.js', version: '4.5.1' }))).arrayBuffer());
    const pack = spawnSync('nix', ['develop', `${REPO_ROOT}#theia`, '--command', 'npm', 'pack', local, '--pack-destination', dir], { encoding: 'utf8' });
    if (pack.status !== 0) throw new Error(`npm pack failed: ${pack.stderr}`);
    const localPin = sha256(readFileSync(join(dir, 'ng071-local-0.0.1.tgz')));
    const manifest = pin => `${readFileSync(join(REPO_ROOT, 'configuration.toml'), 'utf8')}
[[extensions]]
id = "chart.js"
source = "npm"
version = "4.5.1"
integrity = "sha512-${createHash('sha512').update(npmBytes).digest('base64')}"
sha256 = "${sha256(npmBytes)}"

[[extensions]]
id = "ng071.local"
source = "local-path"
path = "extensions/ng071-local"
sha256 = "${pin}"
`;
    writeFileSync(join(cfg, 'configuration.toml'), manifest(localPin));
    const { failures: rf, config } = resolveConfig(join(cfg, 'configuration.toml'), undefined);
    if (rf.length) throw new Error(`fixture manifest does not resolve: ${rf.join('; ')}`);
    const block = JSON.parse(emitTheiaPlugins(config, { id: 'dev' }));

    const good = runDeclaredPluginStep(block, { PB_CONFIG_DIR: cfg });
    steps.push(good);
    if (good.status !== 0) failures.push(`the declared plugin step exited ${good.status}: ${good.output.slice(-800)}`);
    for (const [id, pin] of [['chart.js', sha256(npmBytes)], ['ng071.local', localPin]]) {
        const f = join(good.pluginsDir, `${id}.tar.gz`);
        if (!existsSync(f)) failures.push(`${id}: the build placed no ${id}.tar.gz`);
        else if (sha256(readFileSync(f)) !== pin) failures.push(`${id}: the placed archive does not hash to its pin`);
    }

    writeFileSync(join(cfg, 'configuration.toml'), manifest('0'.repeat(64)));
    const bad = runDeclaredPluginStep(block, { PB_CONFIG_DIR: cfg });
    steps.push(bad);
    if (bad.status === 0) failures.push('a wrong local-path pin did not fail the plugin step');
    if (!bad.output.includes('ng071.local')) failures.push('the pin failure does not name the entry ng071.local');
    if (existsSync(join(bad.pluginsDir, 'ng071.local.tar.gz'))) failures.push('the mismatched archive was installed anyway');
} catch (err) {
    failures.push(err.message);
} finally {
    for (const s of steps) s.cleanup();
    rmSync(dir, { recursive: true, force: true });
}
if (failures.length) {
    console.error(`${NAME}: FAIL -- ${failures.length} failure(s):\n  ${failures.join('\n  ')}`);
    process.exit(1);
}
console.log(`${NAME}: PASS -- npm and local-path archives install at their pins through the build's plugin step; a bad pin fails it`);
