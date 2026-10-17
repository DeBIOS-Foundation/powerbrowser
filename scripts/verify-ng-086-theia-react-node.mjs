#!/usr/bin/env node
// scripts/verify-ng-086-theia-react-node.mjs
//
// NG-086 (Phase 19, UPD-07..UPD-09): the installed Theia closure equals the
// manifest pin, the installed React packages satisfy @theia/core's peers, and
// the dev shell's Node major meets the workspace engines. Label:
// ng086-theia-react-node. Test ref: this file::ng086-theia-react-node.
//
// verify-upstream-pins.mjs proves the DECLARED pins agree (manifest,
// resolutions, member manifests, lock stanzas). It does not read the
// INSTALLED tree, react, engines or the flake. This check does, and every
// expectation is read from the tree at check time:
//
//  1. upstreams.theia_release from configuration.toml (scripts/lib/toml.cjs)
//     is the only source of the expected version. Every @theia/* package.json
//     found in the real node_modules dirs under theia/ carries that version.
//     @theia/monaco-editor-core is excepted by exact name: it tracks
//     upstream's own monaco line, as verify-upstream-pins.mjs records.
//  2. Every installed react, react-dom, @types/react and @types/react-dom
//     satisfies the range for that name in the installed @theia/core
//     manifest's peerDependencies. A missing package is a FAIL.
//  3. The NN of `nodejs = pkgs.nodejs_NN;` in flake.nix intersects
//     theia/package.json engines.node.
//
// The walk is lstat-based and never follows a symlink, the same walk as
// verify-single-copy-deps.mjs. It is re-implemented here on purpose: this
// file is sha-locked on its own, so it shares no walk helper whose edit would
// change what the locked check does. Its one repo import is the vendored
// TOML parser, whose body verify-vendored-parser.mjs pins by digest. semver is loaded from theia's own
// workspace (createRequire anchored at theia/package.json); absent, that is a
// broken-instrument FAIL. Zero @theia packages found is a FAIL: an empty
// walk agrees with any pin.
//
// --self-test builds one mkdtemp root per case (clean control, version drift,
// monaco-editor-core exception, React peer miss, Node engines miss, empty
// walk) and requires each stated result. No tracked file is touched.

import { existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse } from './lib/toml.cjs';

const NAME = 'ng086-theia-react-node';
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MONACO = '@theia/monaco-editor-core';
const REACT_NAMES = ['react', 'react-dom', '@types/react', '@types/react-dom'];

function isRealDir(p) {
  try { const s = lstatSync(p); return s.isDirectory() && !s.isSymbolicLink(); } catch { return false; }
}

// Every package manifest under one node_modules dir, recursing into nested ones.
function walkNodeModules(nm, out) {
  for (const entry of readdirSync(nm)) {
    if (entry.startsWith('.')) continue;
    const p = join(nm, entry);
    if (!isRealDir(p)) continue;
    if (entry.startsWith('@')) {
      for (const child of readdirSync(p)) visitPackage(join(p, child), out);
    } else {
      visitPackage(p, out);
    }
  }
}

function visitPackage(dir, out) {
  if (!isRealDir(dir)) return;
  const pj = join(dir, 'package.json');
  if (existsSync(pj)) {
    try {
      const pkg = JSON.parse(readFileSync(pj, 'utf8'));
      if (typeof pkg.name === 'string') out.push({ path: dir, pkg });
    } catch { /* unreadable manifest: not a package */ }
  }
  const nested = join(dir, 'node_modules');
  if (isRealDir(nested)) walkNodeModules(nested, out);
}

function readJson(p) {
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; }
}

function judge(root) {
  const fails = [];
  const fail = (m) => fails.push(`${NAME}: FAIL -- ${m}`);
  const rel = (p) => relative(root, p);
  const theia = join(root, 'theia');

  // The pin.
  let pin = null;
  try {
    pin = parse(readFileSync(join(root, 'configuration.toml'), 'utf8'))?.upstreams?.theia_release ?? null;
  } catch (e) {
    fail(`configuration.toml could not be read or parsed (${e.message}), so there is no Theia pin to compare against`);
  }
  if (pin !== null && (typeof pin !== 'string' || pin.trim() === '')) pin = null;
  if (pin === null && fails.length === 0) fail('configuration.toml upstreams.theia_release is not set');

  // semver from theia's own workspace.
  let semver = null;
  try {
    semver = createRequire(join(theia, 'package.json'))('semver');
  } catch {
    fail(`broken instrument: semver is not installed in ${rel(theia) || 'theia'}/ (run yarn install in theia/ first)`);
  }

  // The installed tree.
  const top = join(theia, 'node_modules');
  const installed = [];
  if (!isRealDir(top)) {
    fail(`${rel(top)} is absent (run yarn install in theia/ first)`);
  } else {
    const starts = [top];
    for (const group of ['applications', 'extensions']) {
      const g = join(theia, group);
      if (!isRealDir(g)) continue;
      for (const member of readdirSync(g)) {
        const nm = join(g, member, 'node_modules');
        if (isRealDir(nm)) starts.push(nm);
      }
    }
    for (const nm of starts) walkNodeModules(nm, installed);
  }

  // 1. Installed @theia closure equals the pin.
  const theiaPkgs = installed.filter((c) => c.pkg.name.startsWith('@theia/'));
  const checked = theiaPkgs.filter((c) => c.pkg.name !== MONACO);
  const monaco = theiaPkgs.filter((c) => c.pkg.name === MONACO);
  if (checked.length === 0) {
    fail('empty walk: no installed @theia/* package was found under theia/, and an empty closure agrees with any pin');
  } else if (pin !== null) {
    for (const c of checked) {
      if (c.pkg.version !== pin) fail(`${c.pkg.name} is installed at ${c.pkg.version} (${rel(c.path)}), but configuration.toml upstreams.theia_release is ${pin}`);
    }
  }

  // 2. React packages satisfy the installed @theia/core peers.
  const cores = theiaPkgs.filter((c) => c.pkg.name === '@theia/core');
  const reactReport = [];
  if (checked.length > 0 && cores.length !== 1) {
    fail(`expected exactly one installed @theia/core to read peerDependencies from, found ${cores.length}${cores.length ? `: ${cores.map((c) => rel(c.path)).join(', ')}` : ''}`);
  } else if (cores.length === 1 && semver) {
    const peers = cores[0].pkg.peerDependencies ?? {};
    for (const name of REACT_NAMES) {
      const range = peers[name];
      const copies = installed.filter((c) => c.pkg.name === name);
      if (typeof range !== 'string') {
        fail(`installed @theia/core (${rel(cores[0].path)}) declares no peerDependencies range for ${name}`);
        continue;
      }
      if (copies.length === 0) {
        fail(`${name} is not installed under theia/; @theia/core peers ${range}`);
        continue;
      }
      for (const c of copies) {
        if (!semver.valid(c.pkg.version) || !semver.satisfies(c.pkg.version, range)) {
          fail(`${name} ${c.pkg.version} (${rel(c.path)}) does not satisfy the installed @theia/core peer range ${range}`);
        }
      }
      reactReport.push(`${name} ${copies.map((c) => c.pkg.version).join('/')} satisfies ${range}`);
    }
  }

  // 3. The flake's Node major meets engines.node.
  let nodeReport = null;
  let flake = null;
  try { flake = readFileSync(join(root, 'flake.nix'), 'utf8'); } catch { fail('flake.nix could not be read, so the dev shell Node major is unknown'); }
  if (flake !== null) {
    const majors = [...flake.matchAll(/^\s*nodejs\s*=\s*pkgs\.nodejs_(\d+)\s*;/gm)].map((m) => m[1]);
    const engines = readJson(join(theia, 'package.json'))?.engines?.node;
    if (majors.length !== 1) {
      fail(`flake.nix must hold exactly one \`nodejs = pkgs.nodejs_NN;\` line, found ${majors.length}${majors.length ? ` (${majors.join(', ')})` : ''}`);
    } else if (typeof engines !== 'string') {
      fail('theia/package.json declares no engines.node');
    } else if (semver) {
      let ok = false;
      try { ok = semver.intersects(engines, `${majors[0]}.x`); } catch { /* invalid range */ }
      if (!ok) fail(`flake.nix pins nodejs_${majors[0]}, which does not meet theia/package.json engines.node ${engines}`);
      nodeReport = `Node ${majors[0]} (flake.nix nodejs_${majors[0]}) meets engines.node ${engines}`;
    }
  }

  if (fails.length) return { ok: false, lines: fails };
  const monacoNote = monaco.length ? ` (${MONACO} excepted at ${monaco.map((c) => c.pkg.version).join('/')})` : '';
  return {
    ok: true,
    lines: [`${NAME}: PASS -- ${checked.length} @theia packages at ${pin}${monacoNote}; ${reactReport.join('; ')}; ${nodeReport}`],
  };
}

function rootArg() {
  const i = process.argv.indexOf('--root');
  return i === -1 ? REPO_ROOT : resolve(process.argv[i + 1] ?? '');
}

// --- self-test --------------------------------------------------------------

function plantPackage(root, name, version, extra = {}) {
  const dir = join(root, 'theia', 'node_modules', name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name, version, ...extra }));
}

function stubTree({ node = 24, engines = '>=24', react = '19.0.0', theia = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'ng086-'));
  writeFileSync(join(root, 'configuration.toml'), '[upstreams]\ntheia_release = "1.0.0"\n');
  writeFileSync(join(root, 'flake.nix'), `{\n  outputs = { ... }: let\n      nodejs = pkgs.nodejs_${node};\n  in { };\n}\n`);
  mkdirSync(join(root, 'theia', 'node_modules'), { recursive: true });
  writeFileSync(join(root, 'theia', 'package.json'), JSON.stringify({ private: true, engines: { node: engines } }));
  // The real semver, linked in; the walk never follows the link.
  const realSemver = dirname(createRequire(join(REPO_ROOT, 'theia', 'package.json')).resolve('semver/package.json'));
  symlinkSync(realSemver, join(root, 'theia', 'node_modules', 'semver'));
  if (theia) {
    plantPackage(root, '@theia/core', '1.0.0', {
      peerDependencies: { react: '^19.0.0', 'react-dom': '^19.0.0', '@types/react': '^19.0.0', '@types/react-dom': '^19.0.0' },
    });
    plantPackage(root, '@theia/editor', '1.0.0');
  }
  plantPackage(root, 'react', react);
  for (const n of ['react-dom', '@types/react', '@types/react-dom']) plantPackage(root, n, '19.0.0');
  return root;
}

function selfTest() {
  const has = (r, ...parts) => r.lines.some((l) => parts.every((p) => l.includes(p)));
  const cases = [
    { label: 'clean control', build: () => stubTree(), want: (r) => r.ok && has(r, '2 @theia packages at 1.0.0') },
    {
      label: 'version drift',
      build: () => { const root = stubTree(); plantPackage(root, '@theia/x', '1.0.1'); return root; },
      want: (r) => !r.ok && has(r, '@theia/x is installed at 1.0.1', join('theia', 'node_modules', '@theia', 'x')),
    },
    {
      label: 'monaco-editor-core exception',
      build: () => { const root = stubTree(); plantPackage(root, MONACO, '9.9.9'); return root; },
      want: (r) => r.ok && has(r, `${MONACO} excepted at 9.9.9`),
    },
    {
      label: 'React peer miss',
      build: () => stubTree({ react: '18.3.1' }),
      want: (r) => !r.ok && has(r, 'react 18.3.1', '^19.0.0'),
    },
    {
      label: 'Node engines miss',
      build: () => stubTree({ node: 22, engines: '>=24' }),
      want: (r) => !r.ok && has(r, 'nodejs_22', 'engines.node >=24'),
    },
    {
      label: 'empty walk',
      build: () => stubTree({ theia: false }),
      want: (r) => !r.ok && has(r, 'empty walk'),
    },
  ];
  const misses = [];
  for (const c of cases) {
    const root = c.build();
    try {
      const r = judge(root);
      if (!c.want(r)) misses.push(`${NAME}-self-test: FAIL -- case '${c.label}' gave the wrong result: ${r.lines.join(' | ')}`);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
  if (misses.length) {
    for (const m of misses) console.error(m);
    process.exit(1);
  }
  console.log(`${NAME}-self-test: PASS -- ${cases.length} cases`);
}

if (process.argv.includes('--self-test')) {
  selfTest();
} else {
  const r = judge(rootArg());
  for (const l of r.lines) (r.ok ? console.log : console.error)(l);
  process.exit(r.ok ? 0 : 1);
}
