#!/usr/bin/env node
// scripts/verify-package-target-natives.mjs -- PKG-23 (Phase 45): every
// staged native matches the package's target. For linux-x64: every `.node`,
// `rg` and `node` binary in the staged package is ELF x86-64 (magic
// `7f 45 4c 46 ... 3e 00`, read as exact bytes, never merged or accepted
// truncated). The checker is `--target` parameterised from day one
// (`linux-x64` now; `win64` expects PE32+, `macos` expects Mach-O universal
// later) so Phases H/I reuse it without a rewrite.
//
// Native paths are sorted before comparing, so output order is stable across
// runs and filesystems. A staged package with zero natives is red naming the
// EMPTY universe (staging dropped the sidecar), never green-by-absence; one
// native is checked alone.
//
// Honestly --quick for the twin only: mkdtemp fixtures, no build, no browser,
// no display, no network. The full row needs the container-built tarball (or
// a --stage dir) and FAILs naming the container-build procedure when neither
// exists (mar-hop precedent), never skips green.
//
// Usage:
//   node scripts/verify-package-target-natives.mjs [--target linux-x64]
//   node scripts/verify-package-target-natives.mjs --self-test [--target linux-x64]

import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'verify-package-target-natives';
const BUILD_CMD = 'podman run --rm -v "$PWD:/src:rw" -w /src pb-gecko-build bash powerbrowser/packaging/package-linux.sh (after the plan 45-01 container build)';

const TARGETS = Object.freeze({
    'linux-x64': Object.freeze({ magic: Buffer.from([0x7f, 0x45, 0x4c, 0x46]), machine: Buffer.from([0x3e, 0x00]), label: 'ELF x86-64' }),
    'win64': Object.freeze({ magic: Buffer.from([0x4d, 0x5a]), machine: null, label: 'PE32+' }),
    'macos': Object.freeze({ magic: Buffer.from([0xca, 0xfe, 0xba, 0xbe]), machine: null, label: 'Mach-O universal' }),
});

const rawArgs = process.argv.slice(2);
let SELF_TEST = false;
let target = 'linux-x64';
for (let i = 0; i < rawArgs.length; i += 1) {
    const a = rawArgs[i];
    if (a === '--self-test') SELF_TEST = true;
    else if (a === '--target') {
        target = rawArgs[i + 1];
        i += 1;
        if (!target || !TARGETS[target]) {
            console.error(`${NAME}: FAIL -- unknown --target ${JSON.stringify(target)} (expected one of ${Object.keys(TARGETS).join(', ')})`);
            process.exit(2);
        }
    } else {
        console.error(`${NAME}: FAIL -- unknown argument '${a}'`);
        process.exit(2);
    }
}

function isNativeName(name) {
    return name.endsWith('.node') || name === 'rg' || name === 'node';
}

function listNatives(root) {
    const out = [];
    const walk = (dir) => {
        for (const n of readdirSync(dir)) {
            const p = join(dir, n);
            let st;
            try { st = statSync(p); } catch { continue; }
            if (st.isDirectory()) walk(p);
            else if (st.isFile() && isNativeName(basename(p))) out.push(p);
        }
    };
    walk(root);
    return out.sort();
}

function magicOf(path, length) {
    try {
        const buf = readFileSync(path);
        return buf.subarray(0, length);
    } catch {
        return null;
    }
}

function checkTree(root, targetId) {
    const spec = TARGETS[targetId];
    const natives = listNatives(root);
    // EMPTY-universe branch: zero natives is red (staging dropped the
    // sidecar), never green-by-absence.
    if (natives.length === 0) {
        return { failures: [`EMPTY native universe under ${root} -- no .node, rg or node binary found (staging dropped the sidecar?)`], natives: 0 };
    }
    const failures = [];
    for (const native of natives) {
        const rel = native.startsWith(`${root}/`) ? native.slice(root.length + 1) : native;
        const head = magicOf(native, 20);
        if (!head || head.length < 4) {
            failures.push(`${rel}: truncated magic (fewer than 4 bytes) -- expected ${spec.label}, never merged or accepted`);
            continue;
        }
        if (!head.subarray(0, spec.magic.length).equals(spec.magic)) {
            failures.push(`${rel}: magic ${head.subarray(0, 4).toString('hex')} is not ${spec.label} for --target ${targetId} -- wrong-OS sidecar?`);
            continue;
        }
        if (spec.machine) {
            if (head.length < 20) {
                failures.push(`${rel}: truncated magic (fewer than 20 bytes) -- expected ${spec.label}, never merged or accepted`);
                continue;
            }
            const machine = head.subarray(18, 20);
            if (!machine.equals(spec.machine)) {
                failures.push(`${rel}: ELF machine ${machine.toString('hex')} is not x86-64 (3e 00) for --target ${targetId} -- wrong-architecture sidecar?`);
            }
        }
    }
    return { failures, natives: natives.length };
}

function selfTest() {
    let ok = true;
    const dir = mkdtempSync(join(tmpdir(), 'verify-package-target-natives-selftest-'));
    try {
        // Control green first: one real Linux native alone passes.
        const clean = join(dir, 'clean-stage', 'theia', 'lib', 'backend', 'native');
        mkdirSync(clean, { recursive: true });
        const realNode = join(REPO_ROOT, 'theia', 'applications', 'browser', 'lib', 'backend', 'native', 'drivelist.node');
        if (existsSync(realNode)) {
            copyFileSync(realNode, join(clean, 'drivelist.node'));
            const control = checkTree(join(dir, 'clean-stage'), 'linux-x64');
            if (control.failures.length !== 0) {
                console.error(`${NAME}: --self-test FAIL -- the unplanted single-native fixture is already red, so a red result after a plant would prove nothing:`);
                for (const f of control.failures) console.error(`  - ${f}`);
                ok = false;
            } else {
                console.log(`${NAME}: --self-test -- the unplanted single-native fixture is GREEN (${control.natives} native)`);
            }
        } else {
            console.log(`${NAME}: --self-test -- no built theia natives; control is the EMPTY-universe red branch instead`);
            const res = checkTree(join(dir, 'clean-stage'), 'linux-x64');
            const msg = res.failures.find((f) => f.includes('EMPTY native universe'));
            if (!msg) {
                console.error(`${NAME}: --self-test FAIL -- EMPTY native universe was NOT rejected`);
                ok = false;
            } else {
                console.log(`${NAME}: --self-test -- EMPTY native universe REJECTED: ${msg}`);
            }
        }

        // Plant: a Linux .node inside a fixture Windows staging copy goes red
        // naming the file and the expected magic. The fixture stages one real
        // Linux native under a win64 target, so the plant is a genuine
        // wrong-OS byte, not a text stub.
        const planted = join(dir, 'planted-stage');
        mkdirSync(join(planted, 'theia'), { recursive: true });
        if (existsSync(realNode)) {
            copyFileSync(realNode, join(planted, 'theia', 'planted.node'));
            const res = checkTree(planted, 'win64');
            const msg = res.failures.find((f) => f.includes('planted.node') && (f.includes('PE32+') || f.includes('magic')));
            if (!msg) {
                console.error(`${NAME}: --self-test FAIL -- Linux .node in a Windows fixture was NOT rejected naming planted.node and the expected magic`);
                for (const f of res.failures) console.error(`  - ${f}`);
                ok = false;
            } else {
                console.log(`${NAME}: --self-test -- Linux .node in Windows fixture REJECTED: ${msg}`);
            }
        } else {
            // No real native to plant: assert the EMPTY branch from the other
            // side -- a win64 check over an EMPTY native universe stage is
            // still red.
            const res = checkTree(planted, 'win64');
            if (res.failures.length === 0) {
                console.error(`${NAME}: --self-test FAIL -- EMPTY native universe Windows fixture was accepted`);
                ok = false;
            } else {
                console.log(`${NAME}: --self-test -- EMPTY native universe Windows fixture REJECTED: ${res.failures[0]}`);
            }
        }

        // Ordering probe: two runs list natives in the same sorted order.
        {
            const a = listNatives(dir).join('\n');
            const b = [...listNatives(dir)].sort().join('\n');
            if (a !== b) {
                console.error(`${NAME}: --self-test FAIL -- native listing order is not stable-sorted`);
                ok = false;
            } else {
                console.log(`${NAME}: --self-test -- ordering probe ok (native paths sorted, stable across runs)`);
            }
        }
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
    if (!ok) {
        console.error(`${NAME}: --self-test FAIL -- one or more plants misbehaved`);
        process.exit(1);
    }
    console.log(`${NAME}: --self-test PASS -- control green first, then all planted faults behaved as pinned`);
}

if (SELF_TEST) {
    selfTest();
} else {
    let stageOverride = null;
    // --stage is accepted on the full row for local staging proofs; the
    // default subject is the container-built tarball.
    const stageIdx = rawArgs.indexOf('--stage');
    if (stageIdx !== -1) stageOverride = rawArgs[stageIdx + 1];
    const run = async () => {
        let root;
        let cleanup = null;
        if (stageOverride) {
            root = stageOverride;
        } else {
            const { extractPackage } = await import('./lib/built-tree.mjs');
            try {
                root = extractPackage();
            } catch (err) {
                console.error(`${NAME}: FAIL -- no container-built tarball: ${err.message}. Next step: run: ${BUILD_CMD}`);
                process.exit(1);
            }
            cleanup = join(root, '..');
        }
        const { failures, natives } = checkTree(root, target);
        if (cleanup) rmSync(cleanup, { recursive: true, force: true });
        if (failures.length) {
            console.error(`${NAME}: FAIL -- ${failures.length} failure(s) over ${natives} native(s) (--target ${target}):\n  ${failures.join('\n  ')}`);
            process.exit(1);
        }
        console.log(`${NAME}: PASS -- ${natives} native(s) match --target ${target} (${TARGETS[target].label}), sorted and stable`);
    };
    run().catch((err) => {
        console.error(`${NAME}: FAIL -- ${err.message}. Next step: run: ${BUILD_CMD}`);
        process.exit(1);
    });
}
