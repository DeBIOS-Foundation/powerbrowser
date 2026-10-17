#!/usr/bin/env node
// scripts/verify-node-major-agreement.mjs
//
// Phase 19, 19-08 (19-REVIEW.md WR-05, 19-VALIDATION.md escalation): the Node
// major shipped in the Linux package agrees with the dev shell's, and both meet
// the workspace engines. Label: node-major-agreement.
//
// NG-086 reads only flake.nix against engines.node, so a packaged runtime left on
// an older major passed it green (CR-01). This check reads all three inputs at
// check time and holds no expected version or major:
//
//  1. The NN of the one `nodejs = pkgs.nodejs_NN;` line in flake.nix (the binding
//     the theia shell uses; the same regex as NG-086) is the flake major.
//  2. theia/package.json engines.node must be a single `>=N[.N[.N]]` minimum; its
//     first number is the engines minimum major.
//  3. Every target in powerbrowser/packaging/node-runtime.json carries a
//     `vX.Y.Z` version; X is that target's packaged major.
//
// FAIL when a packaged major differs from the flake major, or when the flake
// major or a packaged major is below the engines minimum. Every unreadable or
// unparseable input is a FAIL naming the file and the raw value, never a skip.
// Standard library only, so it runs on a fresh checkout with no install.
//
// --self-test builds one mkdtemp root per case from copies of the three real
// files (a clean control derived from the tree, and six planted faults) and
// requires each stated result. No tracked file is touched.

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const NAME = 'node-major-agreement';
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FLAKE = 'flake.nix';
const ENGINES = 'theia/package.json';
const RUNTIME = 'powerbrowser/packaging/node-runtime.json';
const FLAKE_RE = /^\s*nodejs\s*=\s*pkgs\.nodejs_(\d+)\s*;/gm;
const ENGINES_RE = /^>=(\d+)(?:\.\d+){0,2}$/;
const VERSION_RE = /^v(\d+)\.(\d+)\.(\d+)$/;

function judge(root) {
  const fails = [];
  const fail = (msg) => fails.push(`${NAME}: FAIL -- ${msg}`);
  const read = (rel) => {
    try { return readFileSync(join(root, rel), 'utf8'); } catch (e) { fail(`${rel} could not be read (${e.code ?? e.message})`); return null; }
  };
  const readJson = (rel) => {
    const text = read(rel);
    if (text === null) return undefined;
    try { return JSON.parse(text); } catch (e) { fail(`${rel} is not valid JSON (${e.message})`); return undefined; }
  };

  // 1. The flake major.
  let flakeMajor = null;
  const flake = read(FLAKE);
  if (flake !== null) {
    const majors = [...flake.matchAll(FLAKE_RE)].map((m) => m[1]);
    if (majors.length !== 1) {
      fail(`${FLAKE} must hold exactly one \`nodejs = pkgs.nodejs_NN;\` line, found ${majors.length}${majors.length ? ` (${majors.map((m) => `nodejs_${m}`).join(', ')})` : ''}`);
    } else {
      flakeMajor = Number(majors[0]);
    }
  }

  // 2. The engines minimum major.
  let enginesMin = null;
  let enginesRaw;
  const pkg = readJson(ENGINES);
  if (pkg !== undefined) {
    enginesRaw = pkg?.engines?.node;
    const m = typeof enginesRaw === 'string' ? ENGINES_RE.exec(enginesRaw.trim()) : null;
    if (!m) fail(`${ENGINES} engines.node must be a single \`>=N\` minimum, found ${JSON.stringify(enginesRaw)}`);
    else enginesMin = Number(m[1]);
  }

  // 3. Every packaged target's major.
  const targets = [];
  const runtime = readJson(RUNTIME);
  if (runtime !== undefined) {
    if (runtime === null || typeof runtime !== 'object' || Array.isArray(runtime) || Object.keys(runtime).length === 0) {
      fail(`${RUNTIME} must be an object with at least one target, found ${JSON.stringify(runtime)}`);
    } else {
      for (const [target, entry] of Object.entries(runtime)) {
        const version = entry?.version;
        const m = typeof version === 'string' ? VERSION_RE.exec(version) : null;
        if (!m) fail(`${RUNTIME} target ${target} version ${JSON.stringify(version)} does not parse as vX.Y.Z`);
        else targets.push({ target, version, major: Number(m[1]) });
      }
    }
  }

  // The comparisons, each on the inputs that parsed.
  if (flakeMajor !== null) {
    for (const t of targets) {
      if (t.major !== flakeMajor) fail(`${RUNTIME} target ${t.target} version ${t.version} has Node major ${t.major}, but ${FLAKE} pins nodejs_${flakeMajor}`);
    }
  }
  if (enginesMin !== null) {
    if (flakeMajor !== null && flakeMajor < enginesMin) fail(`${FLAKE} pins nodejs_${flakeMajor}, below ${ENGINES} engines.node ${enginesRaw}`);
    for (const t of targets) {
      if (t.major < enginesMin) fail(`${RUNTIME} target ${t.target} version ${t.version} has Node major ${t.major}, below ${ENGINES} engines.node ${enginesRaw}`);
    }
  }

  if (fails.length) return { ok: false, lines: fails };
  return {
    ok: true,
    lines: [`${NAME}: PASS -- ${FLAKE} nodejs_${flakeMajor}; ${RUNTIME} ${targets.map((t) => `${t.target} ${t.version}`).join(', ')}; ${ENGINES} engines.node ${enginesRaw}`],
  };
}

// --- self-test --------------------------------------------------------------

function copyTree() {
  const root = mkdtempSync(join(tmpdir(), 'node-major-'));
  for (const rel of [FLAKE, ENGINES, RUNTIME]) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), readFileSync(join(REPO_ROOT, rel)));
  }
  return root;
}

const readText = (root, rel) => readFileSync(join(root, rel), 'utf8');
const readObj = (root, rel) => JSON.parse(readText(root, rel));
const writeObj = (root, rel, obj) => writeFileSync(join(root, rel), `${JSON.stringify(obj, null, 2)}\n`);
const setMajor = (version, major) => version.replace(/^v\d+/, `v${major}`);

function flakeMajorOf(root) {
  const majors = [...readText(root, FLAKE).matchAll(FLAKE_RE)].map((m) => Number(m[1]));
  if (majors.length !== 1) throw new Error(`the real ${FLAKE} holds ${majors.length} nodejs lines`);
  return majors[0];
}

function enginesMinOf(root) {
  const m = ENGINES_RE.exec(String(readObj(root, ENGINES)?.engines?.node).trim());
  if (!m) throw new Error(`the real ${ENGINES} engines.node is not a single >=N`);
  return Number(m[1]);
}

// The clean control: every target's major moved to the copied flake's major,
// minor and patch kept, so it passes whichever pin is committed.
function control() {
  const root = copyTree();
  const major = flakeMajorOf(root);
  const rt = readObj(root, RUNTIME);
  for (const entry of Object.values(rt)) entry.version = setMajor(entry.version, major);
  writeObj(root, RUNTIME, rt);
  return root;
}

function firstTarget(root) {
  return Object.keys(readObj(root, RUNTIME))[0];
}

function selfTest() {
  const has = (r, ...parts) => r.lines.some((l) => l.includes(`${NAME}: FAIL -- `) && parts.every((p) => l.includes(p)));
  const real = copyTree();
  const F = flakeMajorOf(real);
  const E = enginesMinOf(real);
  rmSync(real, { recursive: true, force: true });
  const cases = [
    {
      label: 'clean control',
      build: control,
      want: (r) => r.ok && r.lines[0].startsWith(`${NAME}: PASS -- `) && r.lines[0].includes(`nodejs_${F}`),
    },
    {
      label: 'packaged major mismatch',
      build: () => {
        const root = control();
        const rt = readObj(root, RUNTIME);
        const t = firstTarget(root);
        rt[t].version = setMajor(rt[t].version, F - 1);
        writeObj(root, RUNTIME, rt);
        return root;
      },
      want: (r) => !r.ok && has(r, RUNTIME, `v${F - 1}.`, `nodejs_${F}`),
    },
    {
      label: 'flake below engines',
      build: () => {
        const root = control();
        writeFileSync(join(root, FLAKE), readText(root, FLAKE).replace(FLAKE_RE, (line) => line.replace(/nodejs_\d+/, `nodejs_${E - 1}`)));
        const rt = readObj(root, RUNTIME);
        for (const entry of Object.values(rt)) entry.version = setMajor(entry.version, E - 1);
        writeObj(root, RUNTIME, rt);
        return root;
      },
      want: (r) => !r.ok && has(r, FLAKE, `nodejs_${E - 1}`, 'engines.node') && has(r, RUNTIME, `v${E - 1}.`, 'engines.node'),
    },
    {
      label: 'missing node-runtime.json',
      build: () => { const root = control(); rmSync(join(root, RUNTIME)); return root; },
      want: (r) => !r.ok && has(r, RUNTIME, 'could not be read'),
    },
    {
      label: 'unparseable version',
      build: () => {
        const root = control();
        const rt = readObj(root, RUNTIME);
        rt[firstTarget(root)].version = String(F);
        writeObj(root, RUNTIME, rt);
        return root;
      },
      want: (r) => !r.ok && has(r, RUNTIME, `"${F}"`, 'does not parse'),
    },
    {
      label: 'duplicate flake line',
      build: () => {
        const root = control();
        writeFileSync(join(root, FLAKE), `${readText(root, FLAKE)}\n      nodejs = pkgs.nodejs_${F + 1};\n`);
        return root;
      },
      want: (r) => !r.ok && has(r, FLAKE, 'exactly one', `nodejs_${F + 1}`),
    },
    {
      label: 'malformed engines',
      build: () => {
        const root = control();
        const pkg = readObj(root, ENGINES);
        pkg.engines.node = '^24 || ^26';
        writeObj(root, ENGINES, pkg);
        return root;
      },
      want: (r) => !r.ok && has(r, ENGINES, '^24 || ^26'),
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
  const r = judge(REPO_ROOT);
  for (const l of r.lines) (r.ok ? console.log : console.error)(l);
  process.exit(r.ok ? 0 : 1);
}
