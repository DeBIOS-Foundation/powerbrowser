// scripts/lib/scratch-app.mjs -- runs the Theia application's `download:plugins` script,
// the plugin step `yarn build` runs, exactly as theia/applications/browser/package.json
// declares it, against a caller-supplied theiaPlugins block. The scratch app dir sits
// beside the real one, so every relative path in the script resolves the same way; it
// is dot-named (outside the `applications/*` workspace glob) and removed by cleanup().
// Used by the NG-071 and NG-073 checks.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const APP = join(REPO_ROOT, 'theia', 'applications', 'browser');

export function runDeclaredPluginStep(theiaPlugins, env = {}) {
    const pkg = JSON.parse(readFileSync(join(APP, 'package.json'), 'utf8'));
    const script = pkg.scripts?.['download:plugins'];
    if (!script) throw new Error(`${APP}/package.json declares no download:plugins script`);
    const dir = join(dirname(APP), `.scratch-${process.pid}-${Date.now()}`);
    mkdirSync(dir);
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ ...pkg, theiaPlugins, theiaPluginsDir: 'plugins' }, null, 2));
    // What yarn adds for a workspace script: the workspace bin dir ahead of PATH.
    const PATH = `${join(REPO_ROOT, 'theia', 'node_modules', '.bin')}:${process.env.PATH}`;
    const r = spawnSync('nix', ['develop', `${REPO_ROOT}#theia`, '--command', 'bash', '-c', script],
        { cwd: dir, env: { ...process.env, ...env, PATH }, encoding: 'utf8', timeout: 600000 });
    return {
        status: r.status,
        output: `${r.stdout ?? ''}${r.stderr ?? ''}`,
        pluginsDir: join(dir, 'plugins'),
        cleanup: () => rmSync(dir, { recursive: true, force: true }),
    };
}
