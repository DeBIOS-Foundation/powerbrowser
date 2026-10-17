#!/usr/bin/env node
// scripts/verify-single-copy-deps.mjs
//
// Phase 19, UPD-08: exactly one installed copy each of react, react-dom,
// @types/react, @types/react-dom and inversify under theia/. Two copies of
// React render two reconcilers that cannot see each other's hooks; two copies
// of inversify give two DI containers whose symbols never match. Both fail at
// runtime, not at build time, so the install itself is what this row judges.
//
// The five names are the requirement (UPD-08), not a measured expectation
// list, so they are named here. Everything else is read off disk.
//
// WALK. Real directories only, with lstat, so no symlink is ever followed:
// theia/node_modules and <group>/*/node_modules for every <group>/* pattern
// in theia/package.json's `workspaces` field (a pattern of any other shape
// is a FAIL, not a skip), recursing into every <pkg>/node_modules
// and @scope/<pkg>/node_modules. The yarn workspace links
// (node_modules/@powerbrowser/*, node_modules/powerbrowser-theia-browser-app)
// are symlinks and are therefore never entered; following them would
// double-count. A copy is a node_modules/<name>/package.json whose `name`
// field equals one of the five.
//
// FAIL when a count is not exactly 1 (every path is named), when a package
// is missing (count 0), and when theia/node_modules does not exist: an absent
// install is a FAIL, never a skip, for the reason check_tab_uris_typecheck
// gives in verify-platform.sh. CI installs before --quick.
//
// --self-test builds mkdtemp trees, one per case (clean control, nested
// duplicate, missing @types/react-dom, absent node_modules, symlinked
// duplicate, duplicate under a third workspace group, unexpandable workspace
// pattern), and requires each to give its stated result naming the package.
// No tracked file is touched.

import { existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const NAME = 'single-copy-deps';
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TARGETS = ['react', 'react-dom', '@types/react', '@types/react-dom', 'inversify'];

function isRealDir(p) {
  try { const s = lstatSync(p); return s.isDirectory() && !s.isSymbolicLink(); } catch { return false; }
}

// Visit every package directly inside one node_modules dir, then recurse.
function walkNodeModules(nm, found) {
  for (const entry of readdirSync(nm)) {
    if (entry.startsWith('.')) continue;
    const p = join(nm, entry);
    if (!isRealDir(p)) continue;
    if (entry.startsWith('@')) {
      for (const child of readdirSync(p)) visitPackage(join(p, child), found);
    } else {
      visitPackage(p, found);
    }
  }
}

function visitPackage(dir, found) {
  if (!isRealDir(dir)) return;
  const pj = join(dir, 'package.json');
  if (existsSync(pj)) {
    let pkg = null;
    try { pkg = JSON.parse(readFileSync(pj, 'utf8')); } catch { /* unreadable manifest: not a copy of anything */ }
    if (pkg && found.has(pkg.name)) found.get(pkg.name).push({ path: dir, version: pkg.version });
  }
  const nested = join(dir, 'node_modules');
  if (isRealDir(nested)) walkNodeModules(nested, found);
}

function judge(root) {
  const theia = join(root, 'theia');
  const top = join(theia, 'node_modules');
  if (!isRealDir(top)) {
    return { ok: false, lines: [`${NAME}: FAIL -- ${top} is absent (run yarn install in theia/ first); an uninstalled tree proves nothing`] };
  }
  const found = new Map(TARGETS.map((n) => [n, []]));
  const starts = [top];
  let ws;
  try { ws = JSON.parse(readFileSync(join(theia, 'package.json'), 'utf8')).workspaces ?? []; } catch (e) {
    return { ok: false, lines: [`${NAME}: FAIL -- cannot read the workspaces field of ${join(theia, 'package.json')}: ${e.message}`] };
  }
  for (const pat of (Array.isArray(ws) ? ws : ws.packages ?? [])) {
    const m = /^([^*]+)\/\*$/.exec(pat);
    if (!m) return { ok: false, lines: [`${NAME}: FAIL -- workspace pattern '${pat}' is not <dir>/*; the walk cannot expand it`] };
    const g = join(theia, m[1]);
    if (!isRealDir(g)) continue;
    for (const member of readdirSync(g)) {
      const nm = join(g, member, 'node_modules');
      if (isRealDir(nm)) starts.push(nm);
    }
  }
  for (const nm of starts) walkNodeModules(nm, found);

  const rel = (p) => relative(root, p);
  const fails = [];
  for (const [name, copies] of found) {
    if (copies.length !== 1) {
      const where = copies.map((c) => `${rel(c.path)} (${c.version})`).join(', ');
      fails.push(`${NAME}: FAIL -- ${name}: ${copies.length} installed copies, expected exactly 1${copies.length ? `: ${where}` : ''}`);
    }
  }
  if (fails.length) return { ok: false, lines: fails };
  const summary = [...found].map(([name, [c]]) => `${name} ${c.version} at ${rel(c.path)}`).join('; ');
  return { ok: true, lines: [`${NAME}: PASS -- ${summary}`] };
}

function rootArg() {
  const i = process.argv.indexOf('--root');
  return i === -1 ? REPO_ROOT : resolve(process.argv[i + 1] ?? '');
}

function plantPackage(dir, name, version) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name, version }));
}

function cleanTree(workspaces = ['applications/*', 'extensions/*']) {
  const root = mkdtempSync(join(tmpdir(), 'single-copy-'));
  const nm = join(root, 'theia', 'node_modules');
  for (const n of TARGETS) plantPackage(join(nm, n), n, '1.0.0');
  writeFileSync(join(root, 'theia', 'package.json'), JSON.stringify({ workspaces }));
  return root;
}

function selfTest() {
  const cases = [
    {
      label: 'clean control',
      build: () => cleanTree(),
      want: (r) => r.ok,
    },
    {
      label: 'nested duplicate',
      build: () => {
        const root = cleanTree();
        plantPackage(join(root, 'theia', 'node_modules', 'x', 'node_modules', 'react'), 'react', '2.0.0');
        return root;
      },
      want: (r) => !r.ok && r.lines.some((l) => l.includes('-- react: 2 ')
        && l.includes(join('theia', 'node_modules', 'react') + ' ')
        && l.includes(join('theia', 'node_modules', 'x', 'node_modules', 'react') + ' ')),
    },
    {
      label: 'missing @types/react-dom',
      build: () => {
        const root = cleanTree();
        rmSync(join(root, 'theia', 'node_modules', '@types', 'react-dom'), { recursive: true });
        return root;
      },
      want: (r) => !r.ok && r.lines.some((l) => l.includes('-- @types/react-dom: 0 ')),
    },
    {
      label: 'absent node_modules',
      build: () => mkdtempSync(join(tmpdir(), 'single-copy-')),
      want: (r) => !r.ok && r.lines.some((l) => l.includes('is absent')),
    },
    {
      label: 'symlinked duplicate',
      build: () => {
        const root = cleanTree();
        const elsewhere = join(root, 'elsewhere');
        plantPackage(join(elsewhere, 'node_modules', 'react'), 'react', '2.0.0');
        // A workspace-style link whose target holds a second react copy.
        symlinkSync(elsewhere, join(root, 'theia', 'node_modules', 'linked-workspace'));
        return root;
      },
      want: (r) => r.ok,
    },
    {
      label: 'duplicate under a third workspace group',
      build: () => {
        const root = cleanTree(['applications/*', 'extensions/*', 'packages/*']);
        plantPackage(join(root, 'theia', 'packages', 'p', 'node_modules', 'inversify'), 'inversify', '2.0.0');
        return root;
      },
      want: (r) => !r.ok && r.lines.some((l) => l.includes('-- inversify: 2 ')
        && l.includes(join('theia', 'packages', 'p', 'node_modules', 'inversify') + ' ')),
    },
    {
      label: 'unexpandable workspace pattern',
      build: () => cleanTree(['packages/**']),
      want: (r) => !r.ok && r.lines.some((l) => l.includes("'packages/**' is not <dir>/*")),
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
