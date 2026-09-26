#!/usr/bin/env node
// scripts/verify-ng-085-quit-closes-store.mjs -- NG-085 (non-GUI wave A,
// ruling R29): quitting closes the tab store's connection before shutdown, so
// the app quits in seconds instead of hanging until AsyncShutdown aborts it
// in profile-before-change. The browser runs on a kept profile with the store
// open (a web tab has written its row), then quits through the app's own quit
// (quitApp in scripts/lib/ng-a-live.mjs, the quit every restart check uses).
// It must exit within 15s, and its stdout (AsyncShutdown dump()s there) must
// carry no AsyncShutdown timeout naming tabs.sqlite. The quit is watched for
// up to 120s, so today's hang runs through to the abort.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { newProfile, quitApp, runCheck, show, tabsOf, waitUntil, withShell } from './lib/ng-a-live.mjs';

const QUIT_LIMIT_MS = 15000;
const OBSERVE_MS = 120000;

await runCheck('verify-ng-085-quit-closes-store', async ({ pages, expect, failures }) => {
    const profile = newProfile('ng085');
    const log = join(profile, 'ng085-stdout.log');
    const a = pages.url('/a');
    const quit = await withShell(profile, async page => {
        await page.run(`await A.open(${JSON.stringify(a)});`);
        if (!await waitUntil(() => tabsOf(profile).some(r => r.url === a), 20000)) {
            failures.push(`setup: the web tab on ${a} never wrote its row, so the store was never shown open; rows: ${show(tabsOf(profile))}`);
            return null;
        }
        return { ms: await quitApp(page, profile, OBSERVE_MS) };
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
