#!/usr/bin/env node
// scripts/verify-ng-085-quit-closes-store.mjs -- NG-085 (non-GUI wave A,
// ruling R29): quitting closes the tab store's connection before shutdown, so
// the app quits in seconds instead of hanging until AsyncShutdown aborts it
// in profile-before-change. The browser runs on a kept profile with the store
// open (a web tab has written its row), then quits through the app's own quit,
// Services.startup.quit(eAttemptQuit), called in the shell's chrome window. It
// must exit within 15s, and its stdout (AsyncShutdown dump()s there) must
// carry no AsyncShutdown timeout naming tabs.sqlite.
//
// Not SIGTERM, the restart checks' quit: on GTK that stops the event loop and
// the process is gone in ~0.1s without reaching profile-before-change, so it
// cannot see this defect. The quit is timed here from /proc, because
// withFirefoxPage's cleanup escalates to SIGKILL after 5s.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { newProfile, runCheck, show, tabsOf, waitUntil, withShell } from './lib/ng-a-live.mjs';

const QUIT_LIMIT_MS = 15000;
/** Long enough to watch today's hang through to AsyncShutdown's abort. */
const OBSERVE_MS = 120000;

/** /proc/<pid>/stat after the command name: [state, ppid, ...]. Throws once the process is gone. */
const statOf = pid => {
    const text = readFileSync(`/proc/${pid}/stat`, 'utf8');
    return text.slice(text.lastIndexOf(')') + 2).split(' ');
};

/** The browser this process launched on `profile`: its child whose argv names that profile. */
function browserPid(profile) {
    for (const pid of readdirSync('/proc').filter(name => /^\d+$/.test(name))) {
        try {
            const argv = readFileSync(`/proc/${pid}/cmdline`, 'utf8').split('\0');
            if (Number(statOf(pid)[1]) === process.pid && argv[argv.indexOf('--profile') + 1] === profile) {
                return Number(pid);
            }
        } catch {
            // It exited while being read.
        }
    }
    return null;
}

/** False once the process is gone, or a zombie waiting to be reaped. */
function running(pid) {
    try {
        return statOf(pid)[0] !== 'Z';
    } catch {
        return false;
    }
}

await runCheck('verify-ng-085-quit-closes-store', async ({ pages, expect, failures }) => {
    const profile = newProfile('ng085');
    const log = join(profile, 'ng085-stdout.log');
    const a = pages.url('/a');
    const quit = await withShell(profile, async ({ run, send, evaluateIn }) => {
        await run(`await A.open(${JSON.stringify(a)});`);
        if (!await waitUntil(() => tabsOf(profile).some(r => r.url === a), 20000)) {
            failures.push(`setup: the web tab on ${a} never wrote its row, so the store was never shown open; rows: ${show(tabsOf(profile))}`);
            return null;
        }
        const pid = browserPid(profile);
        const tree = await send('browsingContext.getTree', { 'moz:scope': 'chrome' });
        const shell = tree.contexts.find(c => c.url.startsWith('chrome://powerbrowser/'));
        if (!pid || !shell) {
            failures.push(`setup: found no browser process (${pid}) or no shell chrome window (${JSON.stringify(tree.contexts.map(c => c.url))})`);
            return null;
        }
        const start = Date.now();
        // Deferred, so the evaluation answers before the quit starts.
        await evaluateIn(shell.context, 'setTimeout(() => Services.startup.quit(Ci.nsIAppStartup.eAttemptQuit), 0); true');
        const exited = await waitUntil(() => !running(pid), OBSERVE_MS, 100);
        return { ms: exited ? Date.now() - start : null };
    }, { stdoutPath: log });
    if (!quit) {
        return;
    }
    expect(quit.ms !== null && quit.ms <= QUIT_LIMIT_MS, quit.ms === null
        ? `the browser was still running ${OBSERVE_MS / 1000}s after the quit`
        : `the browser took ${(quit.ms / 1000).toFixed(1)}s to quit, want at most ${QUIT_LIMIT_MS / 1000}s`);
    const abort = readFileSync(log, 'utf8').split('\n').find(line => /AsyncShutdown timeout in .*tabs\.sqlite/.test(line));
    expect(!abort, `the browser's stdout carries an AsyncShutdown abort naming tabs.sqlite: ${abort && abort.slice(0, 240)}`);
});
