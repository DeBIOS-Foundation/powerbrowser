// scripts/lib/built-tree.mjs -- the built Gecko tree and its Linux package, for the
// wave E checks (NG-063, NG-065, NG-066, NG-072). The package is
// objdir/dist/<app>-<Version>.en-US.linux-x86_64.tar.xz, the name `./mach package`
// gives it and powerbrowser/packaging/package-linux.sh rewrites. Version is read from
// the built application.ini, never typed.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const OBJDIR = join(REPO_ROOT, 'objdir');

export function builtVersion() {
    const ini = readFileSync(join(OBJDIR, 'dist', 'bin', 'application.ini'), 'utf8');
    const version = /^Version=(.+)$/m.exec(ini)?.[1];
    if (!version) throw new Error('objdir/dist/bin/application.ini has no Version= line -- build first (docs/BUILD.md)');
    return version.trim();
}

export function packagePath() {
    const suffix = `-${builtVersion()}.en-US.linux-x86_64.tar.xz`;
    const hits = readdirSync(join(OBJDIR, 'dist')).filter(n => n.endsWith(suffix));
    if (hits.length !== 1) {
        throw new Error(`expected exactly one objdir/dist/*${suffix}, found ${hits.length} -- run: `
            + 'nix develop .#firefox --command bash powerbrowser/packaging/package-linux.sh');
    }
    return join(OBJDIR, 'dist', hits[0]);
}

/** Extracts the package into a fresh temp dir and returns the install prefix (its one top-level dir). */
export function extractPackage() {
    const dir = mkdtempSync(join(tmpdir(), 'pb-pkg-'));
    execFileSync('tar', ['-xJf', packagePath(), '-C', dir]);
    const top = readdirSync(dir);
    if (top.length !== 1) throw new Error(`the package has ${top.length} top-level entries, expected one application dir`);
    return join(dir, top[0]);
}

/** objdir/config.status `substs` as an object. run_path with a non-main name runs no build step.
 * It runs under the file's own #! interpreter (the build virtualenv): config.status imports
 * mozbuild, which a bare python3 cannot. */
export function configStatus() {
    const file = join(OBJDIR, 'config.status');
    const python = /^#!(\S+)/.exec(readFileSync(file, 'utf8'))?.[1];
    if (!python) throw new Error(`${file} has no #! interpreter line -- rebuild (docs/BUILD.md)`);
    let out;
    try {
        out = execFileSync(python, ['-c',
            'import json,runpy,sys; ns=runpy.run_path(sys.argv[1], run_name="cs"); print(json.dumps(dict(ns["substs"]), default=str))',
            file], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (err) {
        throw new Error(`${file} could not be read under ${python}: ${String(err.stderr || err.message).trim().split('\n').pop()}`);
    }
    return JSON.parse(out);
}
