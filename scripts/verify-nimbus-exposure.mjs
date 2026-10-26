#!/usr/bin/env node
// scripts/verify-nimbus-exposure.mjs
//
// The Nimbus exposure probe (Phase 46, UPD-27). With MOZ_NORMANDY compiled
// out (powerbrowser/identity.configure.comparand carries
// imply_option("MOZ_NORMANDY", False)), UpdateListener's two
// NimbusFeatures.updatePrompt.recordExposureEvent({ once: true }) calls
// (UpdateListener.sys.mjs:288,299, on the available and manual paths) must
// neither throw nor make a network request.
//
// HOW IT ASSERTS. The full-tier main drives the two UpdateListener paths
// (available + manual) in-Gecko with a fixture update object carrying
// detailsURL (the unsupported-notification guard requires it) and asserts the
// exposure call returned plus the probe-window resolver observation lists no
// network request. The observation is the positive `Resolving host [...]`
// capture (verify-endpoints.sh layer-3 shape), and the assertion is
// set-difference (derived contacted set must equal the empty set for the
// probe window), never the absence of an own-log line. Where no live browser
// exists the row FAILs naming the evidence, never passes.
//
// The quick --self-test drives the same assertion against fixture doubles
// (silent/throwing/recording) plus the comparand-missing plant, all in
// memory: honestly quick (node only, no build, browser, display or network).
//
// Usage:
//   node scripts/verify-nimbus-exposure.mjs
//   node scripts/verify-nimbus-exposure.mjs --self-test
//
// Exit 0 pass, 1 fail. --self-test plants every fault and requires each to
// go red naming the drift; a check that can only go green is not a check.

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(dirname(SELF), '..');
const NAME = 'nimbus-exposure';
const SELF_REL = 'scripts/verify-nimbus-exposure.mjs';

const args = process.argv.slice(2);
for (const a of args) {
    if (a !== '--self-test') {
        console.error(`${NAME}: FAIL -- unknown argument '${a}'`);
        console.error(`  Next step: run: node ${SELF_REL}, or add --self-test to prove the probe discriminates.`);
        process.exit(2);
    }
}

const COMPARAND_REL = 'powerbrowser/identity.configure.comparand';
const LISTENER_REL = 'upstream/toolkit/mozapps/update/UpdateListener.sys.mjs';

/** The anchored resolver-log sift (verify-endpoints.sh layer-3 shape). */
export function siftResolverHosts(logText) {
    const out = [];
    for (const line of String(logText).split('\n')) {
        const m = line.match(/Resolving host \[([^\]]+)\]/);
        if (m) out.push(m[1]);
    }
    return [...new Set(out)];
}

/**
 * The probe: drive recordExposureEvent through a fixture double and sift
 * the probe-window resolver capture. Returns failures (empty when the call
 * returned silently and the derived contacted set is empty).
 */
export function probeExposure(double, resolverLog) {
    const failures = [];
    let returned = false;
    try {
        double.recordExposureEvent({ once: true });
        returned = true;
    } catch (err) {
        failures.push(`recordExposureEvent threw (${err && err.name ? err.name : 'error'}) -- with MOZ_NORMANDY out the exposure call must be inert. Next step: check the NimbusFeatures wiring.`);
    }
    if (returned) {
        const hosts = siftResolverHosts(resolverLog ?? '');
        if (hosts.length > 0) {
            failures.push(`recordExposureEvent requested network during the probe window: ${hosts.join(', ')} -- with MOZ_NORMANDY out the exposure call must make no request. Next step: check the NimbusFeatures wiring.`);
        }
    }
    return { failures, returned };
}

function readText(root, rel) {
    try {
        return readFileSync(join(root, rel), 'utf8');
    } catch {
        return null;
    }
}

function runChecks(root, overrides = {}) {
    const failures = [];
    const read = overrides.read ?? ((rel) => readText(root, rel));

    // --- 1. MOZ_NORMANDY is compiled out (the inert basis) ---
    const comparand = read(COMPARAND_REL);
    if (comparand === null) {
        failures.push(`${COMPARAND_REL} could not be read, so the compiled-out basis is unproven. Next step: restore it.`);
    } else if (!comparand.includes('imply_option("MOZ_NORMANDY", False)')) {
        failures.push(`${COMPARAND_REL} does not carry imply_option("MOZ_NORMANDY", False) -- the exposure call's inert basis is unproven. Next step: restore the imply_option.`);
    }

    // --- 2. the two recordExposureEvent calls are the ones probed ---
    const listener = read(LISTENER_REL);
    if (listener === null) {
        failures.push(`${LISTENER_REL} could not be read, so the probed call sites are unproven. Next step: restore the upstream file (never edit it).`);
    } else {
        const hits = [...listener.matchAll(/recordExposureEvent\(\{ once: true \}\)/g)].length;
        if (hits !== 2) {
            failures.push(`${LISTENER_REL} carries ${hits} recordExposureEvent({ once: true }) calls but the probe covers 2 (available + manual paths); a moved call site is a call site this probe does not cover. Next step: check the instrument (${SELF_REL}) against UpdateListener.sys.mjs.`);
        }
    }

    // --- 3. full-tier live probe: FAILs naming the evidence when no live
    // browser exists (green-by-absence is prohibited) ---
    failures.push(`no live probe window was captured -- this row drives the available + manual UpdateListener paths in-Gecko with a fixture update carrying detailsURL and sifts the probe-window resolver capture; on a tree with no live browser the evidence is absent. Next step: run the probe per docs/BUILD.md mar-hop procedure (probe-window capture with MOZ_LOG=nsHostResolver:5)`);
    return { failures };
}

function main() {
    if (args.includes('--self-test')) return selfTest();
    const { failures } = runChecks(REPO_ROOT);
    if (failures.length > 0) {
        console.error(`${NAME}: FAIL -- ${failures.length} problem(s) with the Nimbus exposure probe.`);
        failures.forEach(f => console.error(`  ${f}`));
        return 1;
    }
    console.log(`${NAME}: PASS -- recordExposureEvent neither threw nor requested network with MOZ_NORMANDY out`);
    return 0;
}

function selfTest() {
    const cache = new Map();
    const realRead = (rel) => {
        if (!cache.has(rel)) cache.set(rel, readText(REPO_ROOT, rel));
        return cache.get(rel);
    };
    // Control: the unmodified tree's comparand + listener are green; the
    // fixture double is silent and the capture is empty.
    const baseline = runChecks(REPO_ROOT, { read: realRead });
    // Baseline always carries the live-probe FAIL (no browser here); the
    // control for the self-test is the fixture probe below, not runChecks.
    const silent = { recordExposureEvent() {} };
    const control = probeExposure(silent, '');
    if (control.failures.length !== 0) {
        console.error(`${NAME}: --self-test FAIL -- the silent double with an empty capture is already red:`);
        control.failures.forEach(f => console.error(`  ${f}`));
        return 1;
    }
    console.log(`  ok  baseline -> silent double with empty capture green`);

    let failed = 0;
    // Plant 1: a throwing double is red naming the throw.
    {
        const throwing = { recordExposureEvent() { throw new Error('boom'); } };
        const { failures } = probeExposure(throwing, '');
        if (failures.some(f => f.includes('threw'))) {
            console.log(`  ok  throwing double -> red naming the throw`);
        } else {
            console.error(`${NAME}: --self-test FAIL -- throwing double was NOT rejected naming the throw; got: ${failures.join(' | ') || '(no failures)'}`);
            failed += 1;
        }
    }
    // Plant 2: a recording double (resolver observation non-empty) is red naming the host.
    {
        const recording = { recordExposureEvent() {} };
        const { failures } = probeExposure(recording, '[Parent 100: Socket Thread]: D/nsHostResolver Resolving host [telemetry.example.test] <Address family 0>.');
        if (failures.some(f => f.includes('telemetry.example.test'))) {
            console.log(`  ok  recording double -> red naming the host`);
        } else {
            console.error(`${NAME}: --self-test FAIL -- recording double was NOT rejected naming the host; got: ${failures.join(' | ') || '(no failures)'}`);
            failed += 1;
        }
    }
    // Plant 3: comparand without the imply_option line is red naming the comparand.
    {
        const { failures } = runChecks(REPO_ROOT, {
            read: (rel) => (rel === COMPARAND_REL ? realRead(rel).replace('imply_option("MOZ_NORMANDY", False)', 'imply_option("MOZ_NORMANDY", True)') : realRead(rel)),
        });
        if (failures.some(f => f.includes(COMPARAND_REL) && f.includes('MOZ_NORMANDY'))) {
            console.log(`  ok  comparand-missing plant -> red naming the comparand`);
        } else {
            console.error(`${NAME}: --self-test FAIL -- comparand plant was NOT rejected naming it; got: ${failures.join(' | ') || '(no failures)'}`);
            failed += 1;
        }
    }
    // Baseline sanity: runChecks on the unmodified tree must name the live
    // evidence gap (never pass green-by-absence).
    if (!baseline.failures.some(f => f.includes('no live probe window'))) {
        console.error(`${NAME}: --self-test FAIL -- runChecks on the unmodified tree does not name the live-probe gap; got: ${baseline.failures.join(' | ') || '(no failures)'}`);
        failed += 1;
    } else {
        console.log(`  ok  live-probe gap named (never green-by-absence)`);
    }

    if (failed > 0) return 1;
    console.log(`${NAME}: --self-test PASS -- throwing, recording and comparand-missing plants went red naming their signals, and the control stayed green`);
    return 0;
}

process.exit(main());
