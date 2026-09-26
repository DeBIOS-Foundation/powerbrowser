#!/usr/bin/env node
// scripts/verify-ng-065-mar-signature.mjs -- NG-065 (wave E): update MARs are signed with
// the fork's key and the built updater verifies them. Drives the PACKAGED tree's own
// `updater` (the program the client execs) on four full MARs made from the packaged tree:
//   - signed with the fork key            -> "succeeded", payload applied;
//   - unsigned                            -> "failed: <CERT_VERIFY_ERROR>";
//   - signed with a throwaway key         -> "failed: <CERT_VERIFY_ERROR>";
//   - fork-signed for another MAR channel -> "failed: <MAR_CHANNEL_MISMATCH_ERROR>".
// Error codes and the updater's argument version are read from upstream/ at check time.
// The private key lives outside the repo (decisions.md D5). Its NSS store has a password,
// read from password.txt in the same directory (R12). signmar reads a password from stdin
// when stdin is not a terminal (modules/libmar/sign/nss_secutil.c GetPasswordString).
// Tier: full. Marker: live-main.
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { builtVersion, configStatus, extractPackage, OBJDIR, REPO_ROOT } from './lib/built-tree.mjs';

const NAME = 'ng065-mar-signature-enforced';
const KEY_DB = join(homedir(), '.config', 'powerbrowser-release', 'mar-key');
const KEY_PASSWORD = join(KEY_DB, 'password.txt');
const NICK = 'powerbrowser-mar';
const CERT = join(REPO_ROOT, 'powerbrowser/packaging/mar/mar-primary.der');
const NSS_ENV = { ...process.env, LD_LIBRARY_PATH: join(OBJDIR, 'dist', 'bin') };
const failures = [];
const temps = [];

try {
    if (/--enable-unverified-updates/.test(readFileSync(join(REPO_ROOT, '.mozconfig'), 'utf8'))) {
        failures.push('.mozconfig carries --enable-unverified-updates, which compiles every MAR check out');
    }
    const substs = configStatus();
    if (!substs.MOZ_VERIFY_MAR_SIGNATURE) failures.push('objdir/config.status: MOZ_VERIFY_MAR_SIGNATURE is not set');
    const channel = substs.ACCEPTED_MAR_CHANNEL_IDS;
    if (!channel || channel !== substs.MAR_CHANNEL_ID) failures.push(`objdir/config.status: ACCEPTED_MAR_CHANNEL_IDS=${channel} MAR_CHANNEL_ID=${substs.MAR_CHANNEL_ID} -- both must be set and equal`);
    if (!existsSync(CERT)) failures.push(`${CERT} (the public MAR certificate) is absent`);
    if (!existsSync(join(KEY_DB, 'key4.db'))) failures.push(`${KEY_DB}/key4.db is absent -- the fork signing key was never generated (wave E Task 8 Step 1, Chris)`);
    if (!existsSync(KEY_PASSWORD) || readFileSync(KEY_PASSWORD, 'utf8').trim() === '') failures.push(`${KEY_PASSWORD} is absent or empty -- the key store must have a password (R12)`);
    if (failures.length === 0) drive(channel);
} catch (err) {
    failures.push(err.message);
} finally {
    for (const t of temps) rmSync(t, { recursive: true, force: true });
}
if (failures.length) {
    console.error(`${NAME}: FAIL -- ${failures.length} failure(s):\n  ${failures.join('\n  ')}`);
    process.exit(1);
}
console.log(`${NAME}: PASS -- the fork-signed MAR applied; unsigned, foreign-key and wrong-channel MARs were refused`);

function drive(channel) {
    const errs = readFileSync(join(REPO_ROOT, 'upstream/toolkit/mozapps/update/common/updatererrors.h'), 'utf8');
    const code = n => new RegExp(`#define ${n} (\\d+)`).exec(errs)?.[1] ?? fail(`broken instrument: ${n} not in updatererrors.h`);
    const CERT_ERR = code('CERT_VERIFY_ERROR');
    const CHANNEL_ERR = code('MAR_CHANNEL_MISMATCH_ERROR');
    const argVersion = /argv\[1\] = const_cast<char\*>\("(\d+)"\)/.exec(readFileSync(join(REPO_ROOT, 'upstream/toolkit/xre/nsUpdateDriver.cpp'), 'utf8'))?.[1]
        ?? fail('broken instrument: the updater argument version is not in nsUpdateDriver.cpp');
    const work = mkdtempSync(join(tmpdir(), 'ng065-'));
    temps.push(work);
    const payload = extractPackage();
    temps.push(dirname(payload));
    writeFileSync(join(payload, 'ng065-marker.txt'), 'applied\n');
    const run = (cmd, args, env, input) => {
        const r = spawnSync(cmd, args, { env, encoding: 'utf8', timeout: 600000, input });
        if (r.status !== 0) fail(`${cmd} ${args.join(' ')} exited ${r.status}: ${(r.stderr || r.stdout).slice(-600)}`);
    };
    const mar = (name, ch) => {
        const out = join(work, name);
        run('bash', [join(REPO_ROOT, 'upstream/tools/update-packaging/make_full_update.sh'), out, payload],
            { ...process.env, MAR: join(OBJDIR, 'dist/host/bin/mar'), MOZ_PRODUCT_VERSION: builtVersion(), MAR_CHANNEL_ID: ch });
        return out;
    };
    const sign = (db, nick, input, name, password = '') => {
        const out = join(work, name);
        run(join(OBJDIR, 'dist/bin/signmar'), ['-d', db, '-n', nick, '-s', input, out], NSS_ENV, `${password}\n`);
        return out;
    };
    const forkPassword = readFileSync(KEY_PASSWORD, 'utf8').trim();
    const throwaway = join(work, 'throwaway-db');
    mkdirSync(throwaway);
    writeFileSync(join(work, 'noise'), Buffer.alloc(2048, Date.now() % 251));
    run(join(OBJDIR, 'dist/bin/certutil'), ['-N', '-d', throwaway, '--empty-password'], NSS_ENV);
    run(join(OBJDIR, 'dist/bin/certutil'), ['-S', '-d', throwaway, '-z', join(work, 'noise'), '-n', 'ng065-throwaway',
        '-s', 'CN=ng065-throwaway', '-x', '-t', ',,', '-k', 'rsa', '-g', '2048', '-Z', 'SHA384', '-v', '12'], NSS_ENV);
    const unsigned = mar('unsigned.mar', channel);
    const cases = [
        ['fork-signed', sign(KEY_DB, NICK, unsigned, 'good.mar', forkPassword), 'succeeded'],
        ['unsigned', unsigned, `failed: ${CERT_ERR}`],
        ['throwaway-key', sign(throwaway, 'ng065-throwaway', unsigned, 'wrong-key.mar'), `failed: ${CERT_ERR}`],
        ['other-channel', sign(KEY_DB, NICK, mar('other.unsigned.mar', `${channel}-other`), 'wrong-channel.mar', forkPassword), `failed: ${CHANNEL_ERR}`],
    ];
    for (const [label, file, expect] of cases) {
        const install = extractPackage();
        temps.push(dirname(install));
        const patch = mkdtempSync(join(tmpdir(), 'ng065-patch-'));
        temps.push(patch);
        copyFileSync(file, join(patch, 'update.mar'));
        writeFileSync(join(patch, 'update.status'), 'pending\n');
        spawnSync(join(install, 'updater'), [argVersion, patch, install, install, 'first'],
            { env: { ...process.env, LD_LIBRARY_PATH: install }, timeout: 300000 });
        const status = existsSync(join(patch, 'update.status')) ? readFileSync(join(patch, 'update.status'), 'utf8').trim() : '<no update.status>';
        const applied = existsSync(join(install, 'ng065-marker.txt'));
        if (status !== expect) failures.push(`${label} MAR: update.status is "${status}", expected "${expect}"`);
        if (applied !== (expect === 'succeeded')) failures.push(`${label} MAR: the payload ${applied ? 'was' : 'was not'} applied`);
    }
}

function fail(message) { throw new Error(message); }
