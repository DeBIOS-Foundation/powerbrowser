#!/usr/bin/env node
// scripts/verify-ng-066-nsis-branding.mjs -- NG-066 (wave E): the NSIS installer takes its
// branding from the manifest and sends no Mozilla ping. Reads the PATCHED upstream NSIS
// sources the installer build consumes, with defines.nsi.in's @VAR@ tokens substituted
// from objdir/config.status (the build's own preprocessor inputs) and ${X} expanded from
// the generated branding.nsi (included before defines.nsi, installer.nsi:99-100):
//   - AppName equals application.ini Name (the comment above AppName says it must);
//   - CERTIFICATE_NAME equals the manifest vendor (product.vendor_display);
//   - TELEMETRY_BASE_URL names no Mozilla host;
//   - Function SendPingIfApplicable returns before doing anything.
// Then it runs the installer-build-proof compile over the same patched inputs.
// Tier: full (upstream/, objdir, makensis). Marker: live-main.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { configStatus, REPO_ROOT } from './lib/built-tree.mjs';
import { resolveConfig } from './generate.mjs';

const NAME = 'ng066-nsis-branding-no-ping';
const NSIS = join(REPO_ROOT, 'upstream/browser/installer/windows/nsis');
const failures = [];

const defines = text => Object.fromEntries([...text.matchAll(/^!define\s+(\S+)\s+(?:"([^"]*)"|(\S*))/gm)].map(m => [m[1], m[2] ?? m[3] ?? '']));
try {
    const substs = configStatus();
    const branding = defines(readFileSync(join(REPO_ROOT, 'generated/branding/dev/branding.nsi'), 'utf8'));
    const raw = readFileSync(join(NSIS, 'defines.nsi.in'), 'utf8').replace(/@([A-Z0-9_]+)@/g, (t, k) => (substs[k] ?? t));
    const defs = defines(raw);
    const expand = v => String(v ?? '').replace(/\$\{(\w+)\}/g, (t, k) => branding[k] ?? t);
    const appName = /^Name=(.+)$/m.exec(readFileSync(join(REPO_ROOT, 'objdir/dist/bin/application.ini'), 'utf8'))?.[1]?.trim();
    const { config } = resolveConfig(join(REPO_ROOT, 'configuration.toml'), undefined);

    if (expand(defs.AppName) !== appName) failures.push(`defines.nsi AppName is ${JSON.stringify(expand(defs.AppName))}; application.ini Name is ${JSON.stringify(appName)}`);
    if (expand(defs.CERTIFICATE_NAME) !== config.product.vendor_display) failures.push(`defines.nsi CERTIFICATE_NAME is ${JSON.stringify(expand(defs.CERTIFICATE_NAME))}; the manifest vendor is ${JSON.stringify(config.product.vendor_display)}`);
    if (/mozilla\.(org|com|net)/i.test(defs.TELEMETRY_BASE_URL ?? '')) failures.push(`defines.nsi TELEMETRY_BASE_URL is ${defs.TELEMETRY_BASE_URL}`);

    const installer = readFileSync(join(NSIS, 'installer.nsi'), 'utf8');
    const body = installer.split(/^Function SendPingIfApplicable\s*$/m)[1]?.split(/^FunctionEnd/m)[0];
    if (body === undefined) failures.push('broken instrument: installer.nsi has no Function SendPingIfApplicable');
    else {
        const first = body.split('\n').map(l => l.trim()).find(l => l && !l.startsWith(';') && !l.startsWith('#'));
        if (!/^Return\b/.test(first ?? '')) failures.push(`installer.nsi SendPingIfApplicable starts with "${first}", not Return -- the installer still pings`);
    }

    const proof = spawnSync('node', [join(REPO_ROOT, 'scripts/verify-installer-build-proof.mjs')], { encoding: 'utf8' });
    if (proof.status !== 0) failures.push(`installer-build-proof is red over the same inputs: ${(proof.stderr || proof.stdout).slice(-500)}`);
} catch (err) {
    failures.push(`prerequisite: ${err.message}`);
}

if (failures.length) {
    console.error(`${NAME}: FAIL -- ${failures.length} failure(s):\n  ${failures.join('\n  ')}`);
    process.exit(1);
}
console.log(`${NAME}: PASS -- AppName and CERTIFICATE_NAME come from the build and the manifest; no installer ping`);
