#!/usr/bin/env node
/**
 * NG-039 (--quick): every Firefox-internal touchpoint, including the Xray
 * waiver `wrappedJSObject` and the privileged `drawSnapshot`, has an
 * INTERNAL-APIS.md row, and check-internals-boundary.sh detects both.
 * Evidence: GroupActorChild.sys.mjs:117, 136; captureShellRegion
 * (PowerBrowserAPI.sys.mjs:1533); the guard's patterns (:38-64) name neither.
 *
 * 1. Plants one file per name in a scratch directory and requires the
 *    guard's own --scan verdict to reject each, naming file and pattern.
 * 2. Requires a catalogue row for every non-comment occurrence of either
 *    name under powerbrowser/shell, derived from the tree at check time.
 * Text reads only: honestly --quick.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LABEL = 'ng-039-internals-detects-waivers';
const GUARD = join(REPO_ROOT, 'scripts/check-internals-boundary.sh');
const CATALOGUE = readFileSync(join(REPO_ROOT, 'powerbrowser/INTERNAL-APIS.md'), 'utf8');
const SHELL_DIR = join(REPO_ROOT, 'powerbrowser/shell');
const PLANTS = [
    { file: 'planted-waiver.sys.mjs', name: 'wrappedJSObject', body: 'export function readReply(win, text) {\n  return win.wrappedJSObject.JSON.parse(text);\n}\n' },
    { file: 'planted-snapshot.sys.mjs', name: 'drawSnapshot', body: 'export async function paint(browser) {\n  return browser.drawSnapshot(0, 0, 1, 1, 1, "white");\n}\n' },
];
const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const failures = [];
const dir = mkdtempSync(join(tmpdir(), 'ng039-'));
try {
    for (const plant of PLANTS) {
        writeFileSync(join(dir, plant.file), plant.body);
    }
    const scan = spawnSync('bash', [GUARD, '--scan', dir], { encoding: 'utf8' });
    const output = `${scan.stdout}${scan.stderr}`;
    if (scan.status === 0) {
        failures.push('the boundary guard accepted files that use wrappedJSObject and drawSnapshot outside PowerBrowserAPI.sys.mjs');
    }
    for (const plant of PLANTS) {
        if (!new RegExp(`${escape(plant.file)}:\\d+: ${plant.name}`).test(output)) {
            failures.push(`the boundary guard does not detect ${plant.name} (planted in ${plant.file})`);
        }
    }
} finally {
    rmSync(dir, { recursive: true, force: true });
}

let count = 0;
for (const file of readdirSync(SHELL_DIR).filter(name => /\.(mjs|js)$/.test(name))) {
    readFileSync(join(SHELL_DIR, file), 'utf8').split('\n').forEach((line, index) => {
        if (!/wrappedJSObject|drawSnapshot/.test(line) || /^\s*(\/\/|\*)/.test(line)) {
            return;
        }
        count += 1;
        if (!new RegExp(`${escape(file)}:${index + 1}(?!\\d)`).test(CATALOGUE)) {
            failures.push(`${file}:${index + 1} uses a Firefox internal (${line.trim().slice(0, 80)}) with no INTERNAL-APIS.md row`);
        }
    });
}
if (count === 0) {
    failures.push('found no occurrence of either name under powerbrowser/shell; the tree moved, so this proves nothing');
}

if (failures.length) {
    for (const reason of failures) {
        console.error(`${LABEL}: FAIL -- ${reason}`);
    }
    process.exit(1);
}
console.log(`${LABEL}: PASS -- the guard detects both names, and all ${count} occurrences have catalogue rows`);
