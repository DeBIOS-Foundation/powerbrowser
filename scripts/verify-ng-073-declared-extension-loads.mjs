#!/usr/bin/env node
// scripts/verify-ng-073-declared-extension-loads.mjs -- NG-073 (wave E): a declared Theia
// extension loads in the built app (EXT-01).
//   1. Builds a fixture VS Code extension (.vsix) whose activate() writes a marker file,
//      and serves it on loopback.
//   2. Declares it in a scratch copy of the app package.json (theiaPlugins).
//   3. Runs the app's declared download:plugins step.
//   4. Launches the browser and the built sidecar with that plugins folder (THEIA_PLUGINS,
//      read by Theia's plugin deployer) and waits for the marker.
// May pass on the current code -- see questions-wave-e.md Q8.
// Tier: full. Marker: live-clone.
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { withFirefoxPage } from './lib/firefox-bidi.mjs';
import { runDeclaredPluginStep } from './lib/scratch-app.mjs';

const NAME = 'ng073-declared-extension-loads';
const failures = [];
const dir = mkdtempSync(join(tmpdir(), 'ng073-'));
const marker = join(dir, 'activated');
const browserLog = join(dir, 'browser-stdout.log');
let step;
let server;
try {
    const ext = join(dir, 'src', 'extension');
    mkdirSync(ext, { recursive: true });
    writeFileSync(join(ext, 'package.json'), JSON.stringify({ name: 'ng073-probe', publisher: 'powerbrowser-test', version: '0.0.1',
        engines: { vscode: '^1.50.0' }, activationEvents: ['*'], main: './extension.js' }));
    writeFileSync(join(ext, 'extension.js'), `exports.activate = () => require('fs').writeFileSync(${JSON.stringify(marker)}, 'activated');\nexports.deactivate = () => {};\n`);
    writeFileSync(join(dir, 'src', 'extension.vsixmanifest'), '<?xml version="1.0" encoding="utf-8"?><PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011"><Metadata><Identity Id="ng073-probe" Version="0.0.1" Publisher="powerbrowser-test"/><DisplayName>ng073 probe</DisplayName></Metadata><Installation><InstallationTarget Id="Microsoft.VisualStudio.Code"/></Installation><Assets><Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json"/></Assets></PackageManifest>');
    writeFileSync(join(dir, 'src', '[Content_Types].xml'), '<?xml version="1.0" encoding="utf-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="json" ContentType="application/json"/><Default Extension="js" ContentType="application/javascript"/><Default Extension="vsixmanifest" ContentType="text/xml"/></Types>');
    execFileSync('python3', ['-c', 'import os,sys,zipfile\nz=zipfile.ZipFile(sys.argv[1],"w")\nfor r,_,fs in os.walk(sys.argv[2]):\n  [z.write(os.path.join(r,f), os.path.relpath(os.path.join(r,f), sys.argv[2])) for f in fs]\nz.close()', join(dir, 'probe.vsix'), join(dir, 'src')]);
    // The .vsix is served by a child process: runDeclaredPluginStep blocks this one (spawnSync),
    // so an in-process server could never answer the download.
    server = spawn(process.execPath, ['-e', `require('http').createServer((q, s) => { s.setHeader('Content-Type', 'application/octet-stream'); s.end(require('fs').readFileSync(${JSON.stringify(join(dir, 'probe.vsix'))})); }).listen(0, '127.0.0.1', function () { console.log(this.address().port); });`],
        { stdio: ['ignore', 'pipe', 'inherit'] });
    const port = await new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('the .vsix server did not report its port within 15 s')), 15000);
        server.stdout.once('data', d => { clearTimeout(t); resolve(String(d).trim()); });
        server.once('exit', c => { clearTimeout(t); reject(new Error(`the .vsix server exited (${c}) before listening`)); });
    });
    step = runDeclaredPluginStep({ 'powerbrowser-test.ng073-probe': `http://127.0.0.1:${port}/ng073-probe-0.0.1.vsix` });
    if (step.status !== 0) throw new Error(`the declared plugin step exited ${step.status}: ${step.output.slice(-800)}`);
    process.env.THEIA_PLUGINS = `local-dir:${step.pluginsDir}`;
    process.env.XDG_CONFIG_HOME = join(dir, 'xdg');
    await withFirefoxPage('', async ({ waitFor }) => {
        await waitFor('window.theia && window.theia.container ? true : false', { timeoutMs: 90000 });
        const deadline = Date.now() + 60000;
        while (!existsSync(marker) && Date.now() < deadline) await new Promise(r => setTimeout(r, 500));
    }, { stdoutPath: browserLog });
    if (!existsSync(marker)) {
        // The sidecar's plugin deployer says whether the plugin was never deployed or deployed
        // and never activated; its WARN/ERROR lines reach the browser's stdout.
        const deployer = existsSync(browserLog) ? [...new Set(readFileSync(browserLog, 'utf8').split('\n')
            .map(l => /plugin-ext:PluginDeployerImpl (?:WARN|ERROR) (.*?)"?$/.exec(l)?.[1]).filter(Boolean))] : [];
        failures.push('the declared extension never activated in the built app (no marker within 60 s of a ready workbench)'
            + (deployer.length ? ` -- PluginDeployerImpl: ${deployer.join(' | ')}` : ' -- PluginDeployerImpl logged no warning'));
    }
} catch (err) {
    failures.push(err.message);
} finally {
    server?.kill();
    step?.cleanup();
    rmSync(dir, { recursive: true, force: true });
}
if (failures.length) {
    console.error(`${NAME}: FAIL -- ${failures.length} failure(s):\n  ${failures.join('\n  ')}`);
    process.exit(1);
}
console.log(`${NAME}: PASS -- a declared extension was downloaded by the build's plugin step and activated`);
