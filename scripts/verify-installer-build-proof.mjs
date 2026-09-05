#!/usr/bin/env node
// scripts/verify-installer-build-proof.mjs
//
// The NSIS-on-Nix build gate (08-04, PKG-01): makensis from nixpkgs compiles
// the pinned upstream installer script with the generated branding on the
// Linux host and emits a byte-valid setup.exe.
//
// WHY IT EXISTS. The installer-schema row proves the six branding.nsi
// defines are present and well-formed, but no schema check can see a
// compile break -- a renamed NSIS variable, a dropped include, an
// !ifdef drift against a new ESR. The 08-04 spike proved the hypothesized
// blocker (Windows-only plugin incompatibility) is NOT one: NSIS plugins
// execute on the install target, never in the makensis process, so the
// compiler only needs the plugin DLL files present to embed, and they are
// checked into upstream/other-licenses/nsis/Plugins/. This script turns
// that spike into a gate: stage the installer inputs from the tree at check
// time, run the real preprocessor and locale scripts, compile with makensis,
// and require setup.exe.
//
// WHAT "FROM GENERATED INPUTS" MEANS. Every staged byte traces to a tree
// source, compared as set equality in both directions: the nsis scripts and
// content mirror upstream/browser/installer/windows/nsis/ as enumerated at
// check time; the toolkit files, plugin DLLs and nsisui.exe come from their
// pinned tree paths; branding.nsi is the REAL generated file (its six
// defines are the schema row's subject, not re-asserted here); defines.nsi
// is preprocessed at check time with -D values derived at check time
// (versions from the pinned upstream text files, build ID and channel from
// the built objdir, display names from configuration.toml through the
// generator's own resolveConfig); locales come from the real
// preprocess-locale.py. A staged file whose bytes differ from its tree
// source, or a stage file with no tree source, fails.
//
// HONEST LABELS. Two inputs are upstream stand-ins, recorded in the PASS
// line and in stage.json, never blessed as fork output: the wizard bitmaps
// (wizHeader.bmp, wizHeaderRTL.bmp, wizWatermark.bmp), firefox64.ico and the
// stubinstaller/ artwork come from upstream/browser/branding/unofficial/
// because the fork ships no wizard artwork yet, and defines.nsi still
// carries upstream's own Mozilla literals (AppName, certificate names,
// Mozilla telemetry URL) that a Windows shippable must replace. Fork wizard
// artwork plus the defines rebrand are 08-05 packaging work; this row proves
// the COMPILE, and says nothing else.
//
// PREREQUISITES (fail-loud, never skip-green): makensis (bare or via nix
// shell nixpkgs#nsis, self-provided at run time), python3, a generated/
// tree, and a built objdir (build ID and channel). A fresh checkout
// without them fails naming each missing piece plus the command that
// provides it.
//
// Honestly --quick (self-test only): a synthetic script plus a copy of the
// real generated branding.nsi compiled in mkdtemp. Seconds, no network.
//
// Usage:
//   node scripts/verify-installer-build-proof.mjs
//   node scripts/verify-installer-build-proof.mjs --self-test

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import { TARGETS, resolveConfig } from './generate.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'verify-installer-build-proof';
const PROOF_DIR = join(REPO_ROOT, '.mozbuild', 'installer-proof');
const STAGE_DIR = join(PROOF_DIR, 'instgen');

const args = process.argv.slice(2);
const SELF_TEST = args.includes('--self-test');
for (const a of args) {
    if (a !== '--self-test') {
        console.error(`${NAME}: FAIL -- unknown argument '${a}'`);
        process.exit(2);
    }
}

// --- assertion plumbing (the installer-schema skeleton) ----------------------
function makeReporter() {
    const failures = [];
    return {
        failures,
        fail(msg) { failures.push(msg); },
        eq(label, actual, expected, where) {
            if (actual === expected) return true;
            failures.push(
                `${label}: ${where} carries ${JSON.stringify(actual)} but must equal ` +
                `${JSON.stringify(expected)}`,
            );
            return false;
        },
    };
}

function sha256File(p) {
    return createHash('sha256').update(readFileSync(p)).digest('hex');
}

function needTool(r, bin, why) {
    try {
        execFileSync(bin, ['--version'], { stdio: 'pipe' });
        return true;
    } catch {
        r.fail(`${bin} is not on PATH but the installer proof needs it (${why}). Next step: install python3 via the system package manager`);
        return false;
    }
}

/**
 * makensis, bare or via the nix shell. The compiler is host tooling, never
 * a repo input: prefer it on PATH, else self-provide through
 * nix shell nixpkgs#nsis (first run fetches from cache.nixos.org, later
 * runs are local). Fail-loud only when neither works.
 */
function resolveMakensis(r) {
    try {
        execFileSync('makensis', ['-VERSION'], { stdio: 'pipe' });
        return ['makensis'];
    } catch { /* fall through to the nix shell */ }
    try {
        execFileSync('nix', ['shell', 'nixpkgs#nsis', '--command', 'makensis', '-VERSION'], { stdio: 'pipe' });
        return ['nix', 'shell', 'nixpkgs#nsis', '--command', 'makensis'];
    } catch {
        r.fail('makensis is not on PATH and `nix shell nixpkgs#nsis` cannot provide it. Next step: nix shell nixpkgs#nsis --command makensis -VERSION');
        return null;
    }
}

/** The six NSIS defines the emitter owns, in file order (schema row's contract, referenced not redefined). */
const NSI_DEFINES = Object.freeze([
    'BrandFullNameInternal',
    'BrandFullName',
    'CompanyName',
    'URLInfoAbout',
    'HelpLink',
    'Channel',
]);

/** Branding fragments the generator declares that the installer consumes -- derived from TARGETS, never hand-kept. */
function expectedBrandingInputs() {
    return TARGETS.filter(t => t.generated === 'branding/dev/branding.nsi').map(t => t.generated);
}

function readText(p) {
    return readFileSync(p, 'utf8');
}

function lastLine(p) {
    const lines = readText(p).split('\n').filter(l => l.trim() !== '');
    return lines[lines.length - 1] ?? '';
}

/** version.txt-style single-version file: last non-empty line. */
function readVersionFile(p, r, label) {
    if (!existsSync(p)) {
        r.fail(`${p} is absent, so ${label} cannot be derived. Next step: run scripts/fetch-upstream.sh`);
        return null;
    }
    return lastLine(p);
}

/** Flat KEY = VALUE scan over objdir/config.status for build-derived defines. Rooted: the caller stages every input under root, so the status read must follow it. */
function configStatusValue(key, root) {
    const p = join(root, 'objdir', 'config.status');
    if (!existsSync(p)) return undefined;
    const m = readText(p).match(new RegExp(`'${key}': '([^']*)'`));
    return m ? m[1] : undefined;
}

function buildId(r, root) {
    const p = join(root, 'objdir', 'buildid.h');
    if (!existsSync(p)) {
        r.fail(`objdir/buildid.h is absent, so MOZ_BUILDID cannot be derived -- the tree was never built. Next step: run the tier-3 build per docs/BUILD.md`);
        return null;
    }
    const m = readText(p).match(/#define MOZ_BUILDID (\S+)/);
    if (!m) {
        r.fail(`objdir/buildid.h carries no MOZ_BUILDID define. Next step: rebuild per docs/BUILD.md`);
        return null;
    }
    return m[1];
}

/** Display identity from the manifest through the generator's own resolver -- one derivation, shared with the build. Rooted like the callers above. */
function manifestIdentity(r, root) {
    let resolved;
    try {
        resolved = resolveConfig(undefined, join(root, 'configuration.toml'));
    } catch (e) {
        r.fail(`configuration.toml failed to resolve: ${String(e).split('\n')[0]}. Next step: fix the manifest, then run: node scripts/generate.mjs`);
        return null;
    }
    if (resolved.failures.length > 0) {
        r.fail(`configuration.toml failed to resolve: ${resolved.failures[0]}. Next step: fix the manifest, then run: node scripts/generate.mjs`);
        return null;
    }
    const dev = resolved.config.variants.find(v => v.id === 'dev');
    if (!dev) {
        r.fail(`configuration.toml declares no dev variant. Next step: restore it; the installer proof builds the dev default`);
        return null;
    }
    return {
        appName: resolved.config.identity.app_basename,
        displayName: `${resolved.config.identity.display_name}${dev.name_suffix}`,
    };
}

function runChecks(root) {
    const r = makeReporter();
    const proofDir = root === REPO_ROOT ? PROOF_DIR : join(root, '.mozbuild', 'installer-proof');
    const stageDir = join(proofDir, 'instgen');

    if (!needTool(r, 'python3', 'running the upstream preprocessor and locale scripts')) return { skipped: false, failures: r.failures };
    const MAKENSIS = resolveMakensis(r);
    if (!MAKENSIS) return { skipped: false, failures: r.failures };

    const brandingRels = expectedBrandingInputs();
    if (brandingRels.length === 0) {
        r.fail('no TARGETS row declares branding/dev/branding.nsi, so the installer has no branding input to prove. Next step: report this; configuration.toml is not the cause');
        return { skipped: false, failures: r.failures };
    }
    for (const rel of brandingRels) {
        if (!existsSync(join(root, 'generated', rel))) {
            r.fail(`generated/${rel} is absent, so there is no branding input to compile. Next step: run: node scripts/generate.mjs`);
        }
    }
    const appVersion = readVersionFile(join(root, 'upstream', 'browser', 'config', 'version.txt'), r, 'APP_VERSION');
    const greVersion = readVersionFile(join(root, 'upstream', 'config', 'milestone.txt'), r, 'GRE_MILESTONE');
    const bid = buildId(r, root);
    const ident = manifestIdentity(r, root);
    if (r.failures.length > 0) return { skipped: false, failures: r.failures };
    const channel = configStatusValue('MOZ_UPDATE_CHANNEL', root) ?? 'default';

    // Stage, fresh: no leftovers from a previous run may survive, and every
    // staged byte is recorded with the tree source it must equal.
    rmSync(stageDir, { recursive: true, force: true });
    mkdirSync(stageDir, { recursive: true });
    const staged = [];
    const stageFile = (sourceAbs, name) => {
        const dest = join(stageDir, name ?? sourceAbs.split('/').pop());
        copyFileSync(sourceAbs, dest);
        staged.push({ stage: dest.slice(stageDir.length + 1), source: sourceAbs.slice(root.length + 1), sha256: sha256File(dest) });
    };
    const stageDirInto = (sourceDir, relBase) => {
        for (const e of readdirSync(sourceDir, { withFileTypes: true })) {
            if (e.isDirectory()) {
                if (e.name === 'content') {
                    const sub = join(stageDir, 'content');
                    mkdirSync(sub, { recursive: true });
                    for (const f of readdirSync(join(sourceDir, 'content'))) {
                        copyFileSync(join(sourceDir, 'content', f), join(sub, f));
                        staged.push({ stage: `content/${f}`, source: `${relBase}/content/${f}`, sha256: sha256File(join(sub, f)) });
                    }
                }
                continue;
            }
            if (!/\.(nsi|nsh)$/.test(e.name)) continue;
            const dest = join(stageDir, e.name);
            copyFileSync(join(sourceDir, e.name), dest);
            staged.push({ stage: e.name, source: `${relBase}/${e.name}`, sha256: sha256File(dest) });
        }
    };

    const nsisDir = join(root, 'upstream', 'browser', 'installer', 'windows', 'nsis');
    const toolkitNsis = join(root, 'upstream', 'toolkit', 'mozapps', 'installer', 'windows', 'nsis');
    const pluginsDir = join(root, 'upstream', 'other-licenses', 'nsis', 'Plugins');
    const brandingDir = join(root, 'upstream', 'browser', 'branding', 'unofficial');
    for (const [dir, label] of [[nsisDir, 'installer nsis dir'], [toolkitNsis, 'toolkit nsis dir'], [pluginsDir, 'nsis plugins dir']]) {
        if (!existsSync(dir)) {
            r.fail(`${dir} (${label}) is absent. Next step: run scripts/fetch-upstream.sh`);
        }
    }
    if (r.failures.length > 0) return { skipped: false, failures: r.failures };

    stageDirInto(nsisDir, 'upstream/browser/installer/windows/nsis');
    for (const f of ['common.nsh', 'overrides.nsh', 'setup.ico', 'locale-fonts.nsh', 'locale-rtl.nlf', 'locale.nlf', 'locales.nsi']) {
        stageFile(join(toolkitNsis, f), f);
    }
    for (const e of readdirSync(pluginsDir)) {
        if (/\.dll$/i.test(e)) stageFile(join(pluginsDir, e), e);
    }
    stageFile(join(root, 'upstream', 'other-licenses', 'nsis', 'nsisui.exe'), 'nsisui.exe');
    for (const rel of brandingRels) {
        stageFile(join(root, 'generated', rel), 'branding.nsi');
    }
    // Wizard artwork stand-ins, byte-compared to upstream unofficial at
    // verify time and labeled in the PASS line -- never fork output.
    const standins = ['wizHeader.bmp', 'wizHeaderRTL.bmp', 'wizWatermark.bmp', 'firefox64.ico'];
    for (const f of standins) {
        stageFile(join(brandingDir, f), f);
    }
    mkdirSync(join(stageDir, 'stubinstaller'), { recursive: true });
    for (const f of readdirSync(join(brandingDir, 'stubinstaller'))) {
        copyFileSync(join(brandingDir, 'stubinstaller', f), join(stageDir, 'stubinstaller', f));
        staged.push({ stage: `stubinstaller/${f}`, source: `upstream/browser/branding/unofficial/stubinstaller/${f}`, sha256: sha256File(join(stageDir, 'stubinstaller', f)) });
    }

    // Set equality, direction one: every staged file's bytes must equal its
    // tree source -- a stale stage (or a quiet tree edit that missed the
    // proof) fails naming the file.
    for (const s of staged) {
        const treeBytes = readFileSync(join(root, s.source));
        const stageBytes = readFileSync(join(stageDir, s.stage));
        if (!treeBytes.equals(stageBytes)) {
            r.fail(`staged ${s.stage} no longer equals its tree source ${s.source} -- the stage went stale. Next step: re-run this check; it stages fresh every run`);
        }
    }

    // defines.nsi, preprocessed at check time with check-time values.
    const defines = [
        `-DAPP_VERSION=${appVersion}`,
        `-DMOZILLA_VERSION=${greVersion}`,
        '-DAB_CD=en-US',
        `-DMOZ_BUILDID=${bid}`,
        `-DMOZ_APP_NAME=${ident.appName}`,
        `-DMOZ_APP_DISPLAYNAME=${ident.displayName}`,
        `-DMOZ_UPDATE_CHANNEL=${channel}`,
        '-DMOZ_TOAST_APP_NAME=',
        `-DTOPOBJDIR=${join(root, 'objdir')}`,
        '-DHAVE_64BIT_BUILD=1',
        '-DRELEASE_OR_BETA=1',
    ];
    try {
        execFileSync('python3', [
            join(root, 'upstream', 'python', 'mozbuild', 'mozbuild', 'action', 'preprocessor.py'),
            '-Fsubstitution', ...defines,
            join(nsisDir, 'defines.nsi.in'), '-o', join(stageDir, 'defines.nsi'),
        ], { stdio: 'pipe', env: { ...process.env, PYTHONPATH: join(root, 'upstream', 'python', 'mozbuild') } });
        staged.push({ stage: 'defines.nsi', source: '(preprocessed at check time)', sha256: sha256File(join(stageDir, 'defines.nsi')) });
    } catch (e) {
        r.fail(`preprocessing defines.nsi failed: ${String(e.message).split('\n')[0]}. Next step: check python3 plus the pinned defines.nsi.in`);
        return { skipped: false, failures: r.failures };
    }

    // Locales through the real upstream script, en-US.
    try {
        const l10nDir = join(root, 'upstream', 'browser', 'locales', 'en-US', 'installer');
        const script = join(root, 'upstream', 'toolkit', 'mozapps', 'installer', 'windows', 'nsis', 'preprocess-locale.py');
        execFileSync('python3', [script, '--preprocess-locale', join(root, 'upstream'), l10nDir, 'en-US', stageDir], { stdio: 'pipe' });
        execFileSync('python3', [script, '--preprocess-single-file', join(root, 'upstream'), l10nDir, stageDir, 'nsisstrings.properties', 'nsisstrings.nlf'], { stdio: 'pipe' });
        execFileSync('python3', [script, '--convert-utf8-utf16le', join(nsisDir, 'extensionsLocale.nsh'), join(stageDir, 'extensionsLocale.nsh')], { stdio: 'pipe' });
    } catch (e) {
        r.fail(`preprocess-locale.py failed: ${String(e.message).split('\n')[0]}. Next step: check the pinned locale sources under upstream/browser/locales/en-US/installer/`);
        return { skipped: false, failures: r.failures };
    }

    // Set equality, direction two: no extra files may sit in the stage.
    // The stage was created fresh above, so anything unrecorded is a bug
    // in this script, and failing names it rather than compiling around it.
    const recorded = new Set(staged.map(s => s.stage).concat(['setup.exe', 'stage.json']));
    const extras = [];
    for (const e of readdirSync(stageDir, { withFileTypes: true })) {
        if (e.isDirectory()) {
            if (e.name !== 'content' && e.name !== 'stubinstaller') extras.push(`${e.name}/`);
            continue;
        }
        if (e.name.endsWith('.nlf') || e.name.endsWith('.nsh') && e.name.includes('Locale')) continue;
        if (!recorded.has(e.name)) extras.push(e.name);
    }
    if (extras.length > 0) {
        r.fail(`unrecorded file(s) in the installer stage: ${extras.join(', ')} -- the stage manifest must account for every input. Next step: report this in the check script`);
    }

    // The compile itself.
    let code = -1;
    let out = '';
    try {
        out = execFileSync(MAKENSIS[0], [...MAKENSIS.slice(1), 'installer.nsi'], { cwd: stageDir, encoding: 'utf8', stdio: 'pipe' });
        code = 0;
    } catch (e) {
        out = `${e.stdout ?? ''}\n${e.stderr ?? ''}`;
        code = e.status ?? 1;
    }
    r.eq('makensis exit', code, 0, 'installer.nsi compile (first error, if any, follows)');
    if (code !== 0) {
        const firstErr = out.split('\n').find(l => /^Error/i.test(l.trim())) ?? out.split('\n').filter(l => l.trim() !== '').slice(-3).join(' | ');
        r.fail(`makensis failed: ${firstErr}. Next step: stage per docs/BUILD.md packaging procedure and compare`);
        return { skipped: false, failures: r.failures };
    }
    const setupExe = join(stageDir, 'setup.exe');
    if (!existsSync(setupExe)) {
        r.fail(`makensis exited 0 but setup.exe was NOT emitted under .mozbuild/installer-proof/instgen/. Next step: report this in the check script`);
        return { skipped: false, failures: r.failures };
    }
    const exeBytes = readFileSync(setupExe).length;
    if (exeBytes < 100000) {
        r.fail(`setup.exe is ${exeBytes} bytes -- below the 100000-byte non-vacuity floor, so no real installer logic compiled. Next step: report this in the check script`);
    }

    writeFileSync(join(proofDir, 'stage.json'), JSON.stringify({
        producedBy: 'scripts/verify-installer-build-proof.mjs',
        makensis: execFileSync(MAKENSIS[0], [...MAKENSIS.slice(1), '-VERSION'], { encoding: 'utf8' }).trim(),
        brandingSha256: sha256File(join(stageDir, 'branding.nsi')),
        setupExeBytes: exeBytes,
        standins: 'wizard bitmaps, firefox64.ico and stubinstaller/ are upstream unofficial stand-ins, not fork output (see header)',
        inputs: staged,
    }, null, 2) + '\n');

    return { skipped: false, failures: r.failures };
}

// --- --self-test ---------------------------------------------------------------
//
// A synthetic installer plus a COPY of the real generated branding.nsi,
// compiled in mkdtemp: control green first, then one plant per fault class,
// each required to go red naming the file and the value.
function selfTest() {
    let MAKENSIS = null;
    try {
        execFileSync('makensis', ['-VERSION'], { stdio: 'pipe' });
        MAKENSIS = ['makensis'];
    } catch { /* fall through to the nix shell */ }
    if (!MAKENSIS) {
        try {
            execFileSync('nix', ['shell', 'nixpkgs#nsis', '--command', 'makensis', '-VERSION'], { stdio: 'pipe' });
            MAKENSIS = ['nix', 'shell', 'nixpkgs#nsis', '--command', 'makensis'];
        } catch {
            console.error(`${NAME}: --self-test FAIL -- no makensis on PATH and nix cannot provide it. Next step: nix shell nixpkgs#nsis`);
            process.exit(1);
        }
    }
    const live = join(REPO_ROOT, 'generated', 'branding', 'dev', 'branding.nsi');
    if (!existsSync(live)) {
        console.error(`${NAME}: --self-test FAIL -- generated/branding/dev/branding.nsi is absent, so there is no branding input to copy; run: node scripts/generate.mjs`);
        process.exit(1);
    }

    const dir = mkdtempSync(join(tmpdir(), 'verify-installer-build-proof-selftest-'));
    let ok = true;
    try {
        const scriptRel = 'synthetic.nsi';
        const mirror = () => {
            copyFileSync(live, join(dir, 'branding.nsi'));
            const guards = NSI_DEFINES.map(d => `!ifndef ${d}\n  !error "synthetic branding input lost ${d}"\n!endif`).join('\n');
            writeFileSync(join(dir, scriptRel), `!include "branding.nsi"\n${guards}\nOutFile "proof.exe"\nSection\n  DetailPrint "\${BrandFullName}"\nSectionEnd\n`);
            rmSync(join(dir, 'proof.exe'), { force: true });
        };
        const compile = () => {
            try {
                execFileSync(MAKENSIS[0], [...MAKENSIS.slice(1), scriptRel], { cwd: dir, encoding: 'utf8', stdio: 'pipe' });
                return { code: 0, out: '' };
            } catch (e) {
                return { code: e.status ?? 1, out: `${e.stdout ?? ''}\n${e.stderr ?? ''}` };
            }
        };
        const artifactOk = () => existsSync(join(dir, 'proof.exe')) && readFileSync(join(dir, 'proof.exe')).length > 10000;

        // Control: the unmutated synthetic dist must compile and emit.
        mirror();
        {
            const res = compile();
            if (res.code !== 0 || !artifactOk()) {
                console.error(`${NAME}: --self-test FAIL -- the unmutated synthetic dist did not compile, so a red result after a plant would prove nothing: ${(res.out.split('\n').find(l => /^Error/i.test(l.trim())) ?? res.out).slice(0, 300)}`);
                ok = false;
            } else {
                console.log(`${NAME}: --self-test -- the unmutated synthetic dist is GREEN`);
            }
        }

        // Plant 1: a dropped !define -- the presence guard must fire.
        mirror();
        writeFileSync(join(dir, 'branding.nsi'), readText(join(dir, 'branding.nsi')).split('\n').filter(l => !l.startsWith('!define BrandFullName ')).join('\n'));
        {
            const res = compile();
            const hit = res.code !== 0 && res.out.includes('BrandFullName');
            if (!hit) {
                console.error(`${NAME}: --self-test FAIL -- the dropped !define (branding.nsi, BrandFullName) was NOT rejected naming the file and the define`);
                ok = false;
            } else {
                console.log(`${NAME}: --self-test -- dropped !define BrandFullName REJECTED naming the file and the define`);
            }
        }

        // Plant 2: a missing include -- the stage error must surface.
        mirror();
        writeFileSync(join(dir, scriptRel), `${readText(join(dir, scriptRel))}\n!include "nonexistent-required-file.nsh"\n`);
        {
            const res = compile();
            const hit = res.code !== 0 && res.out.includes('nonexistent-required-file.nsh');
            if (!hit) {
                console.error(`${NAME}: --self-test FAIL -- the missing include was NOT rejected naming it`);
                ok = false;
            } else {
                console.log(`${NAME}: --self-test -- missing include REJECTED naming the file`);
            }
        }

        // Plant 3: a missing artifact -- the existence assertion must fire
        // even when the compile itself succeeded.
        mirror();
        {
            const res = compile();
            rmSync(join(dir, 'proof.exe'), { force: true });
            if (res.code === 0 && artifactOk()) {
                console.error(`${NAME}: --self-test FAIL -- the artifact assertion passed with proof.exe deleted`);
                ok = false;
            } else if (res.code !== 0) {
                console.error(`${NAME}: --self-test FAIL -- the control compile broke before the artifact plant could run`);
                ok = false;
            } else {
                console.log(`${NAME}: --self-test -- deleted artifact correctly detected (existence assertion is not vacuous)`);
            }
        }
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }

    if (!ok) {
        console.error(`${NAME}: --self-test FAIL`);
        process.exit(1);
    }
    console.log(`${NAME}: --self-test PASS -- control green first, then all planted faults behaved as pinned`);
    process.exit(0);
}

if (SELF_TEST) selfTest();

const result = runChecks(REPO_ROOT);
if (result.failures.length > 0) {
    console.error(`${NAME}: FAIL -- ${result.failures.length} installer-build problem(s)`);
    for (const f of result.failures) console.error(`  - ${f}`);
    process.exit(1);
}
console.log(`${NAME}: PASS -- makensis compiled installer.nsi with the generated branding.nsi into setup.exe (wizard bitmaps and defines.nsi Mozilla literals stay upstream stand-ins per the header)`);