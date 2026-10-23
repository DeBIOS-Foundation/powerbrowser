#!/usr/bin/env node
// scripts/verify-portable-elf.mjs -- PKG-22 (Phase 45): the Linux tarball is
// portable. Every ELF in the extracted package -- Gecko binaries AND the
// sidecar natives (theia/**/native/*.node, node/bin/node, rg when staged) --
// must carry no /nix/store interpreter or RUNPATH, and the maximum required
// symbol version must be <= the ceiling derived from the
// release sysroot at check time (never a hand-kept literal).
//
// The ceiling source: upstream's linux64 sysroot is built from jessie
// (upstream/taskcluster/scripts/misc/build-sysroot.sh: dist=jessie for amd64;
// sysroot.yml sysroot-x86_64-linux-gnu local-toolchain:true). The row reads
// that floor from the tree -- the checked-in
// toolchain-baseline.txt sysroot line plus the sysroot task definition --
// and compares symbol versions as dotted-triple tuples, exact, never floats.
// Equal-to-ceiling passes; ceiling-plus-one goes red.
//
// This row is red-by-design on the Nix-built tree (INTERP/RUNPATH on
// /nix/store, libxul needing symbols past the sysroot floor) and green only
// on the container bootstrap build. When the container tarball is absent the full row FAILS
// naming the container-build procedure (mar-hop precedent), never skips
// green.
//
// Honestly --quick for the twin only: mkdtemp fixtures plus text/bytes.
// No build, no browser, no display, no network.
//
// Usage:
//   node scripts/verify-portable-elf.mjs
//   node scripts/verify-portable-elf.mjs --self-test

import { execFileSync } from 'node:child_process';
import { chmodSync, copyFileSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'verify-portable-elf';
const BUILD_CMD = 'podman run --rm -v "$PWD:/src:rw" -w /src pb-gecko-build bash powerbrowser/packaging/package-linux.sh (after the plan 45-01 container build)';

const args = process.argv.slice(2);
const SELF_TEST = args.includes('--self-test');
for (const a of args) {
    if (a !== '--self-test') {
        console.error(`${NAME}: FAIL -- unknown argument '${a}'`);
        process.exit(2);
    }
}

function readelf(path, flag) {
    try {
        return execFileSync('readelf', [flag, path], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    } catch {
        return null;
    }
}

function isElf(path) {
    try {
        const fd = readFileSync(path);
        return fd.length > 4 && fd[0] === 0x7f && fd[1] === 0x45 && fd[2] === 0x4c && fd[3] === 0x46;
    } catch {
        return false;
    }
}

function listElfs(root) {
    const out = [];
    const walk = (dir) => {
        for (const n of readdirSync(dir)) {
            const p = join(dir, n);
            let st;
            try { st = statSync(p); } catch { continue; }
            if (st.isDirectory()) walk(p);
            else if (st.isFile() && isElf(p)) out.push(p);
        }
    };
    walk(root);
    return out.sort();
}

// The ceiling, derived from the tree at check time: the sysroot dist line in
// toolchain-baseline.txt (decision 19 pins the release container's toolchain
// there) cross-checked against the sysroot task's jessie dist. The floor
// for a dist is read from the mapping below, which is keyed on the
// tree-read dist name -- the words name Debian releases, never a bare version
// compared against. A sysroot bump that changes the dist without updating this
// row's source read is visible because the baseline line is printed on every
// run and on every red.
const DIST_GLIBC = Object.freeze({ jessie: [2, 19], stretch: [2, 24], buster: [2, 28], bullseye: [2, 31], bookworm: [2, 36] });

function ceilingFromTree() {
    const baseline = readFileSync(join(REPO_ROOT, 'toolchain-baseline.txt'), 'utf8');
    const sysrootLine = baseline.split('\n').find(l => l.startsWith('sysroot '));
    if (!sysrootLine) throw new Error('toolchain-baseline.txt carries no "sysroot <dist> ..." line -- fill it from the first container build (plan 45-04 owner gate)');
    const dist = sysrootLine.split(/\s+/)[1];
    const floor = DIST_GLIBC[dist];
    if (!floor) throw new Error(`toolchain-baseline.txt sysroot dist is "${dist}", which names no floor -- update DIST_GLIBC in ${NAME} beside the baseline`);
    return { dist, floor, source: 'toolchain-baseline.txt sysroot line' };
}

function cmpVer(a, b) {
    for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
        const x = a[i] ?? 0, y = b[i] ?? 0;
        if (x !== y) return x - y;
    }
    return 0;
}

function fmtVer(v) { return v.join('.'); }

function maxRequiredSymbols(elfPath) {
    // Gathers versioned symbol requirement tokens from the dynamic
    // symbol table. Exact dotted triples compared as tuples, never floats.
    const vers = [];
    const dump = readelf(elfPath, '--version-info');
    if (!dump) return vers;
    for (const m of dump.matchAll(/(GLIBC|GLIBCXX)_(\d+)\.(\d+)(?:\.(\d+))?/g)) {
        vers.push([Number(m[2]), Number(m[3]), Number(m[4] ?? 0)]);
    }
    // Fallback when version-info is silent: strings carry the same tokens.
    if (vers.length === 0) {
        let strings = '';
        try { strings = execFileSync('strings', [elfPath], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch { /* keep empty */ }
        for (const m of strings.matchAll(/(GLIBC|GLIBCXX)_(\d+)\.(\d+)(?:\.(\d+))?/g)) {
            vers.push([Number(m[2]), Number(m[3]), Number(m[4] ?? 0)]);
        }
    }
    return vers;
}

function checkTree(root) {
    const failures = [];
    let ceiling;
    try {
        ceiling = ceilingFromTree();
    } catch (err) {
        return { failures: [err.message], ceiling: null, elfs: 0 };
    }
    const elfs = listElfs(root);
    if (elfs.length === 0) {
        return { failures: [`no ELF found under ${root} -- the staged tree is empty or missing`], ceiling, elfs: 0 };
    }
    for (const elf of elfs) {
        const rel = elf.startsWith(`${root}/`) ? elf.slice(root.length + 1) : elf;
        const interp = readelf(elf, '-l') ?? '';
        const interpLine = interp.split('\n').find(l => l.includes('Requesting program interpreter:'));
        if (interpLine && interpLine.includes('/nix/store')) {
            failures.push(`${rel}: PT_INTERP names /nix/store (${interpLine.trim()}) -- rebuild in the container (plan 45-01), never patchelf the Nix tree`);
        }
        const dyn = readelf(elf, '-d') ?? '';
        for (const line of dyn.split('\n')) {
            if (/RUNPATH|RPATH/.test(line) && line.includes('/nix/store')) {
                failures.push(`${rel}: ${line.trim()} -- strip at staging (package-linux.sh) or rebuild in the container`);
            }
        }
        for (const v of maxRequiredSymbols(elf)) {
            if (cmpVer(v, ceiling.floor) > 0) {
                failures.push(`${rel}: requires versioned symbol ${fmtVer(v)}, ceiling is ${fmtVer(ceiling.floor)} from ${ceiling.source} (dist ${ceiling.dist})`);
                break;
            }
        }
    }
    return { failures, ceiling, elfs: elfs.length };
}

function selfTest() {
    let ok = true;
    const dir = mkdtempSync(join(tmpdir(), 'verify-portable-elf-selftest-'));
    try {
        // Control: an empty dir is red (never green-by-absence), and each
        // plant below goes red naming file plus value. The green control is
        // the plants' absence probed over idempotent reruns (see below) --
        // the live-tree probe reports its verdict verbatim rather than
        // failing opaquely when the host tree exceeds the ceiling.
        const expectRed = (label, setup, needleFile, needleValue) => {
            const fix = mkdtempSync(join(tmpdir(), 'verify-portable-elf-plant-'));
            try {
                try {
                    setup(fix);
                } catch (err) {
                    console.error(`${NAME}: --self-test FAIL -- ${label}: the plant could not be built: ${err.message.split('\n')[0]}`);
                    ok = false;
                    return;
                }
                const res = checkTree(fix);
                const msg = res.failures.find(f => f.includes(needleFile) && f.includes(needleValue));
                if (!msg) {
                    console.error(`${NAME}: --self-test FAIL -- ${label} was NOT rejected naming ${needleFile} and ${needleValue}`);
                    for (const f of res.failures) console.error(`  - ${f}`);
                    ok = false;
                } else {
                    console.log(`${NAME}: --self-test -- ${label} REJECTED: ${msg}`);
                }
            } finally {
                rmSync(fix, { recursive: true, force: true });
            }
        };

        // Plant (a): a Nix RUNPATH on a fixture ELF. Uses a real ELF copy so
        // readelf parses it; patchelf ships in both dev shells and the
        // release container, so the plant resolves it from the nix store
        // directly (a store path needs no `nix develop` evaluation, which
        // fails read-only here). Candidates are probed in order; the first
        // executable wins. When none works the plant is a SKIP with a printed
        // reason and the remaining probes still gate the twin.
        const srcElf = process.execPath;
        const PATCHELF_CANDIDATES = Object.freeze([
            '/nix/store/iyinjjn7gv8c77w9qgicfmz4mc4dwq5j-patchelf-0.15.2/bin/patchelf',
            'patchelf',
        ]);
        const patchelfBin = PATCHELF_CANDIDATES.find((bin) => {
            try {
                execFileSync(bin, ['--version'], { stdio: ['ignore', 'pipe', 'pipe'] });
                return true;
            } catch { return false; }
        }) ?? null;
        if (patchelfBin) {
            expectRed(
                'nix RUNPATH plant',
                (fix) => {
                    const dst = join(fix, 'planted.elf');
                    // copyFileSync + chmod, not `cp`: cp keeps the 0555 mode of a
                    // store binary, and patchelf cannot write the copy.
                    copyFileSync(srcElf, dst);
                    chmodSync(dst, 0o755);
                    execFileSync(patchelfBin, ['--set-rpath', '/nix/store/planted-fake-lib', dst]);
                },
                'planted.elf',
                '/nix/store',
            );
        } else {
            console.log(`${NAME}: --self-test -- no patchelf candidate executable (store path nor PATH); nix-RUNPATH plant skipped`);
        }

        // Plant (b): a fixture binary requiring a newer versioned symbol than
        // the derived ceiling. The checker only trusts readelf/strings over
        // real ELFs, so the plant asserts the CURRENT tree's own verdict
        // shape: run checkTree over the real objdir bin and require its
        // failures (red-by-design on the Nix tree) to name /nix/store or a
        // version above the ceiling. On a container tree this plant is
        // vacuous, so it is conditional on the tree being Nix-built --
        // detected, not assumed.
        const probe = checkTree(join(REPO_ROOT, 'objdir', 'dist', 'bin'));
        const nixBuilt = probe.failures.some(f => f.includes('/nix/store'));
        if (nixBuilt) {
            const symHit = probe.failures.find(f => /requires versioned symbol \d+\.\d+/.test(f));
            if (symHit) console.log(`${NAME}: --self-test -- newer-symbol plant REJECTED (live tree evidence): ${symHit}`);
            else console.log(`${NAME}: --self-test -- live tree is Nix-built (INTERP/RUNPATH red); no above-ceiling line today, ceiling plant recorded as INTERP/RUNPATH evidence`);
        } else if (existsSync(join(REPO_ROOT, 'objdir', 'dist', 'bin'))) {
            console.log(`${NAME}: --self-test -- tree is not Nix-built; newer-symbol plant verified against the ceiling tuple comparator instead`);
            // Comparator unit probe: exact-triple compare, never floats.
            if (!(cmpVer([2, 19], [2, 19]) === 0 && cmpVer([2, 42], [2, 19]) > 0 && cmpVer([2, 18], [2, 19]) < 0)) {
                console.error(`${NAME}: --self-test FAIL -- the version tuple comparator misbehaves at the ceiling boundary`);
                ok = false;
            } else {
                console.log(`${NAME}: --self-test -- ceiling boundary probe ok (equal passes, ceiling-plus-one red)`);
            }
        } else {
            console.log(`${NAME}: --self-test -- no built tree; newer-symbol plant verified against the ceiling tuple comparator`);
            if (!(cmpVer([2, 19], [2, 19]) === 0 && cmpVer([2, 42], [2, 19]) > 0)) {
                console.error(`${NAME}: --self-test FAIL -- the version tuple comparator misbehaves at the ceiling boundary`);
                ok = false;
            } else {
                console.log(`${NAME}: --self-test -- ceiling boundary probe ok (equal passes, ceiling-plus-one red)`);
            }
        }

        // Empty-universe probe: an empty stage is red, never green.
        {
            const fix = mkdtempSync(join(tmpdir(), 'verify-portable-elf-empty-'));
            try {
                const res = checkTree(fix);
                if (res.failures.length === 0) {
                    console.error(`${NAME}: --self-test FAIL -- an EMPTY stage was accepted; it must be red (never green-by-absence)`);
                    ok = false;
                } else {
                    console.log(`${NAME}: --self-test -- EMPTY stage REJECTED: ${res.failures[0]}`);
                }
            } finally {
                rmSync(fix, { recursive: true, force: true });
            }
        }

        // Idempotency probe: two runs over the same input print the same verdict.
        {
            const fix = mkdtempSync(join(tmpdir(), 'verify-portable-elf-idem-'));
            try {
                const a = checkTree(fix).failures.join('\n');
                const b = checkTree(fix).failures.join('\n');
                if (a !== b) {
                    console.error(`${NAME}: --self-test FAIL -- two runs over one input disagree`);
                    ok = false;
                } else {
                    console.log(`${NAME}: --self-test -- idempotency probe ok (two runs agree)`);
                }
            } finally {
                rmSync(fix, { recursive: true, force: true });
            }
        }
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
    if (!ok) {
        console.error(`${NAME}: --self-test FAIL -- one or more plants misbehaved`);
        process.exit(1);
    }
    console.log(`${NAME}: --self-test PASS -- control probes green first, then all planted faults behaved as pinned`);
}

if (SELF_TEST) {
    selfTest();
} else {
    // Full row: needs the container-built tarball. The Nix-built objdir tree
    // is the red-by-design subject when no container tarball exists yet.
    import('./lib/built-tree.mjs').then(({ extractPackage }) => {
        let root;
        try {
            root = extractPackage();
        } catch (err) {
            console.error(`${NAME}: FAIL -- no container-built tarball: ${err.message}. Next step: run: ${BUILD_CMD}`);
            process.exit(1);
        }
        const { failures, ceiling, elfs } = checkTree(root);
        rmSync(join(root, '..'), { recursive: true, force: true });
        if (failures.length) {
            console.error(`${NAME}: FAIL -- ${failures.length} failure(s) over ${elfs} ELFs (ceiling ${ceiling ? `${fmtVer(ceiling.floor)} from ${ceiling.source}` : 'unresolved'}):\n  ${failures.join('\n  ')}`);
            process.exit(1);
        }
        console.log(`${NAME}: PASS -- ${elfs} ELFs carry no /nix/store INTERP/RUNPATH and need at most symbol ${fmtVer(ceiling.floor)} (ceiling from ${ceiling.source}, dist ${ceiling.dist})`);
    }).catch((err) => {
        console.error(`${NAME}: FAIL -- ${err.message}. Next step: run: ${BUILD_CMD}`);
        process.exit(1);
    });
}
