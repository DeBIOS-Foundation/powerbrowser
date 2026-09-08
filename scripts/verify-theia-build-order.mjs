#!/usr/bin/env node
// scripts/verify-theia-build-order.mjs
//
// The Theia extension build-order gate (14.1.1-08), closing G-14.1.1-9 --
// `theia/package.json`'s `build:extensions` hand-ordered the chain with
// `tab-uris` ahead of `token-gate` while
// `tab-uris/src/node/tab-query-service.ts` imports
// `@powerbrowser/token-gate/lib/node/powerbrowser-env`, and `.gitignore`
// ignores `theia/**/lib/`. On a clean checkout that chain compiles tab-uris
// against a `token-gate/lib` that does not exist yet; it worked on the
// authoring machine only because that `lib` tree was already on disk.
//
// The quieter half of the same defect: `tab-uris` did not declare
// `@powerbrowser/token-gate` in its own `package.json` at all, so the edge
// was invisible to the workspace graph and a topological build order could
// not have rescued it either. Both halves are asserted here.
//
// It DERIVES ALL THREE INPUTS from the tree and compares them -- there is no
// hand-kept ordering, extension list or edge list anywhere in this file:
//   * the CHAIN -- the ordered extension directory names parsed out of
//     `build:extensions` in `theia/package.json`;
//   * the EXTENSION SET -- the directory names actually present under
//     `theia/extensions`;
//   * the EDGES -- for each extension, the other extensions it imports,
//     taken ONLY from import/export specifiers of the form
//     `from '@powerbrowser/<name>...'` in its own `src` tree. A bare
//     `@powerbrowser/<name>` occurrence anywhere else is deliberately NOT
//     accepted: prose comments in branding, chrome-bar, customize, modes,
//     tab-uris and telemetry all carry that string, and a substring scan
//     mints phantom edges from every one of them.
//
// Four assertions ride those derivations, each red on an addition AND on a
// removal: chain equals extension set as SET EQUALITY in both directions; no
// duplicate in the chain; every edge points BACKWARDS (the imported
// extension's chain index is strictly less than the importer's); and every
// edge is DECLARED in the importer's own `package.json`. An empty derivation
// on any of the three fails DISTINCTLY as a broken instrument, never passes
// as a clean tree.
//
// Honestly --quick: it reads `theia/package.json`, each extension manifest
// and each extension's `src` tree as text. No build, no browser, no display,
// no network, no dev shell.
//
// What it does NOT prove: that a clean-checkout `yarn build:extensions`
// actually succeeds. It proves the ordering and declaration invariants that
// build depends on. The literal clean-lib build is DEFERRED to pass 3 --
// running it here would delete the `theia/extensions/*/lib` trees a
// concurrent session's running sidecar is served from, and compile that
// session's uncommitted TypeScript into them. Deleting another session's
// build outputs to prove a build order is a worse defect than the one being
// fixed, so G-14.1.1-9 is flipped to `in_tree` by plan 10, never to `fixed`.
//
// Usage:
//   node scripts/verify-theia-build-order.mjs
//   node scripts/verify-theia-build-order.mjs --self-test

import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const NAME = 'verify-theia-build-order';
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..');

const ROOT_MANIFEST_REL = 'theia/package.json';
const EXTENSIONS_REL = 'theia/extensions';
const SCOPE = '@powerbrowser';

/** Source extensions whose import specifiers are read. */
const SOURCE_EXT = /\.(?:ts|tsx|js|jsx|mjs|cjs)$/;

function readJson(path) {
    return JSON.parse(readFileSync(path, 'utf8'));
}

function exists(path) {
    try {
        statSync(path);
        return true;
    } catch {
        return false;
    }
}

function listDirs(path) {
    if (!exists(path)) {
        return [];
    }
    return readdirSync(path, { withFileTypes: true })
        .filter(e => e.isDirectory())
        .map(e => e.name)
        .sort();
}

/** Every source file under `dir`, recursively. */
function sourceFiles(dir, acc = []) {
    if (!exists(dir)) {
        return acc;
    }
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            sourceFiles(full, acc);
        } else if (entry.isFile() && SOURCE_EXT.test(entry.name)) {
            acc.push(full);
        }
    }
    return acc;
}

/**
 * The ordered extension directory names named by `build:extensions`.
 * A missing or empty script yields [], which the caller reports as a broken
 * instrument rather than as a vacuous pass.
 */
function derivedChain(rootManifest) {
    const script = rootManifest?.scripts?.['build:extensions'] ?? '';
    return [...script.matchAll(/extensions\/([a-z0-9][a-z0-9-]*)/g)].map(m => m[1]);
}

/**
 * The `@powerbrowser` packages an extension imports, taken only from import
 * and export SPECIFIERS. Returns Map<packageName, firstImportingFileRel>.
 */
function derivedImports(extDir, relBase) {
    const found = new Map();
    for (const file of sourceFiles(join(extDir, 'src'))) {
        const src = readFileSync(file, 'utf8');
        const rel = join(relBase, file.slice(extDir.length + 1));
        for (const m of src.matchAll(/\bfrom\s*['"]@powerbrowser\/([a-z0-9][a-z0-9-]*)/g)) {
            if (!found.has(m[1])) {
                found.set(m[1], rel);
            }
        }
    }
    return found;
}

/** The `@powerbrowser` package names an extension declares it depends on. */
function declaredDeps(manifest) {
    return new Set(
        [...Object.keys(manifest?.dependencies ?? {}), ...Object.keys(manifest?.peerDependencies ?? {})]
            .filter(k => k.startsWith(`${SCOPE}/`))
            .map(k => k.slice(SCOPE.length + 1)),
    );
}

/**
 * Derive the three inputs from a tree rooted at `root` (the repo, or a
 * scratch copy of its inputs during --self-test).
 */
function deriveInputs(root) {
    const rootManifestPath = join(root, ROOT_MANIFEST_REL);
    const rootManifest = exists(rootManifestPath) ? readJson(rootManifestPath) : null;
    const chain = derivedChain(rootManifest);

    const extensionsDir = join(root, EXTENSIONS_REL);
    const extensions = listDirs(extensionsDir);

    // dir name -> its own package short-name, so an edge is matched by the
    // package it actually names rather than by a guessed directory spelling.
    const pkgNameOf = new Map();
    const declared = new Map();
    for (const dir of extensions) {
        const manifestPath = join(extensionsDir, dir, 'package.json');
        const manifest = exists(manifestPath) ? readJson(manifestPath) : null;
        const full = manifest?.name ?? '';
        pkgNameOf.set(dir, full.startsWith(`${SCOPE}/`) ? full.slice(SCOPE.length + 1) : dir);
        declared.set(dir, declaredDeps(manifest));
    }
    const dirOfPkg = new Map([...pkgNameOf].map(([dir, pkg]) => [pkg, dir]));

    /** @type {{importer: string, imported: string, pkg: string, file: string}[]} */
    const edges = [];
    /** @type {{importer: string, pkg: string, file: string}[]} */
    const unresolved = [];
    for (const dir of extensions) {
        const extDir = join(extensionsDir, dir);
        for (const [pkg, file] of derivedImports(extDir, join(EXTENSIONS_REL, dir))) {
            if (pkg === pkgNameOf.get(dir)) {
                continue; // self-reference
            }
            const imported = dirOfPkg.get(pkg);
            if (imported === undefined) {
                unresolved.push({ importer: dir, pkg, file });
                continue;
            }
            edges.push({ importer: dir, imported, pkg, file });
        }
    }
    edges.sort((a, b) => (a.importer + a.imported).localeCompare(b.importer + b.imported));

    return { chain, extensions, edges, unresolved, declared, pkgNameOf };
}

function diff(actual, expected) {
    const a = new Set(actual);
    const e = new Set(expected);
    return {
        surplus: [...a].filter(x => !e.has(x)),
        missing: [...e].filter(x => !a.has(x)),
    };
}

/** @returns {string[]} failure messages -- empty means the gate holds. */
function checkStatic(inputs) {
    const failures = [];
    const { chain, extensions, edges, unresolved, declared, pkgNameOf } = inputs;

    if (!chain.length) {
        failures.push(`derived ZERO chain entries from \`build:extensions\` in ${ROOT_MANIFEST_REL} -- the chain parse matches nothing, so this comparison proves nothing (broken instrument, not a clean tree)`);
    }
    if (!extensions.length) {
        failures.push(`derived ZERO extension directories under ${EXTENSIONS_REL} -- the directory listing is empty, so this comparison proves nothing (broken instrument, not a clean tree)`);
    }
    if (!chain.length || !extensions.length) {
        return failures;
    }
    if (!edges.length) {
        failures.push(`derived ZERO ${SCOPE} edges from any extension's src tree -- the specifier scan matches nothing, so the backwards-edge and declared-edge assertions below prove nothing (broken instrument, not a clean tree)`);
        return failures;
    }

    const seen = new Set();
    const dupes = new Set();
    for (const entry of chain) {
        if (seen.has(entry)) {
            dupes.add(entry);
        }
        seen.add(entry);
    }
    if (dupes.size) {
        failures.push(`\`build:extensions\` names a duplicate extension: ${[...dupes].map(d => JSON.stringify(d)).join(', ')} -- an extension built twice hides which position the chain actually relies on`);
    }

    const setDiff = diff(chain, extensions);
    if (setDiff.surplus.length) {
        failures.push(`\`build:extensions\` names ${setDiff.surplus.map(d => JSON.stringify(d)).join(', ')}, which is not a directory under ${EXTENSIONS_REL} -- the chain and the tree disagree (chain names ${chain.length}, tree holds ${extensions.length})`);
    }
    if (setDiff.missing.length) {
        failures.push(`extension directories present under ${EXTENSIONS_REL} but NOT named by \`build:extensions\`: ${setDiff.missing.map(d => JSON.stringify(d)).join(', ')} -- they are silently absent from the build and therefore from the bundle`);
    }

    for (const u of unresolved) {
        failures.push(`${u.importer} imports ${JSON.stringify(`${SCOPE}/${u.pkg}`)} (${u.file}), which is not an extension under ${EXTENSIONS_REL} -- the workspace cannot resolve it`);
    }

    const indexOf = new Map(chain.map((name, i) => [name, i]));
    for (const edge of edges) {
        const from = indexOf.get(edge.importer);
        const to = indexOf.get(edge.imported);
        if (from === undefined || to === undefined) {
            continue; // already reported by the set-equality assertion above
        }
        if (to >= from) {
            failures.push(`backwards edge: ${edge.importer} (chain index ${from}) imports ${SCOPE}/${edge.pkg} at ${edge.file}, but ${edge.imported} is built at chain index ${to} -- on a clean checkout ${edge.imported}/lib does not exist when ${edge.importer} compiles`);
        }
        if (!declared.get(edge.importer)?.has(edge.pkg)) {
            failures.push(`undeclared edge: ${edge.importer} imports ${SCOPE}/${edge.pkg} at ${edge.file}, but ${EXTENSIONS_REL}/${edge.importer}/package.json declares no ${JSON.stringify(`${SCOPE}/${edge.pkg}`)} dependency -- the edge is invisible to the workspace graph, so no topological build order can rescue it`);
        }
    }

    // Guard the pkg-name map itself: an extension whose manifest carries no
    // @powerbrowser name would silently answer to its directory spelling.
    for (const dir of extensions) {
        if (!pkgNameOf.has(dir)) {
            failures.push(`${EXTENSIONS_REL}/${dir} has no readable package.json name -- its edges cannot be matched by package`);
        }
    }

    return failures;
}

function main() {
    const inputs = deriveInputs(REPO_ROOT);
    const failures = checkStatic(inputs);
    if (failures.length) {
        console.error(`${NAME}: FAIL -- ${failures.length} failure(s):`);
        failures.forEach(f => console.error(`  ${f}`));
        process.exit(1);
    }
    console.log(`${NAME}: PASS -- ${inputs.chain.length} chain entries equal ${inputs.extensions.length} extension directories as set equality with no duplicate, and all ${inputs.edges.length} derived ${SCOPE} edges point backwards in the chain and are declared in the importer's own manifest`);
}

// ---------------------------------------------------------------------------
// --self-test: plant one fault per case in a scratch copy of the real inputs
// and require each to go red naming the drift.
// ---------------------------------------------------------------------------

/** Copy the tree's real inputs -- root manifest, extension manifests, src trees. */
function copyInputs(dest) {
    const theia = join(dest, 'theia');
    cpSync(join(REPO_ROOT, ROOT_MANIFEST_REL), join(theia, 'package.json'), { recursive: false, force: true });
    for (const dir of listDirs(join(REPO_ROOT, EXTENSIONS_REL))) {
        const from = join(REPO_ROOT, EXTENSIONS_REL, dir);
        const to = join(dest, EXTENSIONS_REL, dir);
        cpSync(join(from, 'package.json'), join(to, 'package.json'), { force: true });
        if (exists(join(from, 'src'))) {
            cpSync(join(from, 'src'), join(to, 'src'), { recursive: true, force: true });
        }
    }
}

function readRootManifest(root) {
    return readJson(join(root, ROOT_MANIFEST_REL));
}

function writeChain(root, names) {
    const manifest = readRootManifest(root);
    manifest.scripts['build:extensions'] = names.map(n => `yarn --cwd extensions/${n} build`).join(' && ');
    writeFileSync(join(root, ROOT_MANIFEST_REL), `${JSON.stringify(manifest, null, 2)}\n`);
}

function plant(state, label, caseRoot, landed, namePattern) {
    if (!landed) {
        console.error(`${NAME} --self-test: FAIL -- '${label}' plant did not land`);
        state.failed += 1;
        return;
    }
    let result;
    try {
        result = checkStatic(deriveInputs(caseRoot));
    } catch (err) {
        result = [`derivation threw: ${err.message}`];
    }
    if (!result.some(f => namePattern.test(f))) {
        console.error(`${NAME} --self-test: FAIL -- '${label}' did not go red naming ${namePattern}; got: ${result.join(' | ') || '(no failures at all)'}`);
        state.failed += 1;
        return;
    }
    console.log(`  ok  ${label} -> red, naming ${namePattern}`);
}

function selfTest() {
    const scratch = mkdtempSync(join(tmpdir(), 'pb-build-order-'));
    try {
        const pristine = join(scratch, 'pristine');
        copyInputs(pristine);

        const baseline = checkStatic(deriveInputs(pristine));
        if (baseline.length) {
            console.error(`${NAME} --self-test: FAIL -- the scratch copy of the unmodified tree is already red, so the planted-fault results below would be meaningless:`);
            baseline.forEach(f => console.error(`  ${f}`));
            process.exit(1);
        }
        console.log(`${NAME} --self-test: unmodified tree green, planting faults`);

        const real = deriveInputs(pristine);
        const state = { failed: 0 };
        let caseNo = 0;
        const freshCase = () => {
            const dir = join(scratch, `case-${++caseNo}`);
            cpSync(pristine, dir, { recursive: true });
            return dir;
        };

        // (a) swap the chain positions of an extension and one it imports.
        {
            const edge = real.edges[0];
            const root = freshCase();
            const chain = [...real.chain];
            const i = chain.indexOf(edge.importer);
            const j = chain.indexOf(edge.imported);
            [chain[i], chain[j]] = [chain[j], chain[i]];
            writeChain(root, chain);
            plant(state, `swapped ${edge.imported} after its importer ${edge.importer}`, root,
                derivedChain(readRootManifest(root)).indexOf(edge.imported) > derivedChain(readRootManifest(root)).indexOf(edge.importer),
                new RegExp(`backwards edge: ${edge.importer} .* imports @powerbrowser/${edge.pkg}`));
        }

        // (b) drop one extension from the chain.
        {
            const dropped = real.chain[real.chain.length - 1];
            const root = freshCase();
            writeChain(root, real.chain.filter(n => n !== dropped));
            plant(state, `dropped ${dropped} from the chain`, root,
                !derivedChain(readRootManifest(root)).includes(dropped),
                new RegExp(`NOT named by \`build:extensions\`: "${dropped}"`));
        }

        // (c) name a directory in the chain that does not exist.
        {
            const ghost = 'ghost-extension';
            const root = freshCase();
            writeChain(root, [ghost, ...real.chain]);
            plant(state, `chain names the non-existent ${ghost}`, root,
                derivedChain(readRootManifest(root)).includes(ghost),
                new RegExp(`names "${ghost}", which is not a directory`));
        }

        // (d) a second chain entry for an extension already in it.
        {
            const dupe = real.chain[0];
            const root = freshCase();
            writeChain(root, [...real.chain, dupe]);
            plant(state, `duplicate chain entry for ${dupe}`, root,
                derivedChain(readRootManifest(root)).filter(n => n === dupe).length === 2,
                new RegExp(`duplicate extension: "${dupe}"`));
        }

        // (e) remove a workspace dependency while leaving the import in place.
        {
            const edge = real.edges.find(e => real.declared.get(e.importer)?.has(e.pkg));
            const root = freshCase();
            const manifestPath = join(root, EXTENSIONS_REL, edge.importer, 'package.json');
            const manifest = readJson(manifestPath);
            delete manifest.dependencies?.[`${SCOPE}/${edge.pkg}`];
            delete manifest.peerDependencies?.[`${SCOPE}/${edge.pkg}`];
            writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
            plant(state, `undeclared ${SCOPE}/${edge.pkg} in ${edge.importer}`, root,
                !declaredDeps(readJson(manifestPath)).has(edge.pkg),
                new RegExp(`undeclared edge: ${edge.importer} imports @powerbrowser/${edge.pkg}`));
        }

        // (f) empty the chain entirely -- must fail as a broken instrument.
        {
            const root = freshCase();
            writeChain(root, []);
            plant(state, 'empty chain', root,
                derivedChain(readRootManifest(root)).length === 0,
                /ZERO chain entries.*broken instrument/);
        }

        // (g) empty the extensions directory listing -- same.
        {
            const root = freshCase();
            rmSync(join(root, EXTENSIONS_REL), { recursive: true, force: true });
            plant(state, 'empty extensions directory', root,
                listDirs(join(root, EXTENSIONS_REL)).length === 0,
                /ZERO extension directories.*broken instrument/);
        }

        if (state.failed) {
            process.exit(1);
        }
        console.log(`${NAME} --self-test: PASS -- all seven planted faults went red naming the drift`);
    } finally {
        rmSync(scratch, { recursive: true, force: true });
    }
}

const args = process.argv.slice(2);
const unknown = args.filter(a => a !== '--self-test');
if (unknown.length) {
    console.error(`${NAME}: unrecognised argument(s): ${unknown.join(', ')}`);
    console.error(`usage: node scripts/${NAME}.mjs [--self-test]`);
    process.exit(2);
}

try {
    if (args.includes('--self-test')) {
        selfTest();
    } else {
        main();
    }
} catch (err) {
    console.error(`${NAME}: FAIL -- ${err.message}`);
    process.exit(1);
}
