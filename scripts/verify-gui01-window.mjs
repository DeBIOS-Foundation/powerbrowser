#!/usr/bin/env node
// scripts/verify-gui01-window.mjs
//
// GUI-01, half two: the browser window actually OPENS, and closing it does not
// take the application (and the user's Theia state) with it.
//
// Two assertions, one launch, because they are two halves of one flow and
// splitting them would launch the shell twice to observe one sequence:
//
//   1. THE POPUP PATH (01-SPIKE-GUI-01.md observation 7, the ratified
//      candidate A's one named risk). The frontend-to-chrome channel is a
//      bare `window.open(url, '_blank')` from content. A popup blocked for want
//      of transient user activation returns `null` and fails SILENTLY -- which
//      would be a dead headline feature, not a visible defect. The spike could
//      not verify this: it had no harness that could drive the Theia frontend.
//      This check is that harness, and it is the reason the pre-approved
//      JSWindowActor fallback was not taken.
//
//   2. THE LAST-WINDOW HAZARD (T-05-04; 01-UI-SPEC.md calls the failure mode
//      "and back silently becomes and gone"). Gecko quits on last-window-close.
//      If window ordering ever leaves the browser window last, closing it
//      discards every open Theia editor, terminal and unsaved buffer with no
//      prompt. That is data loss dressed up as a window close, so it gets a
//      permanent check rather than a spike observation.
//
// -- Why the assertions look the way they do --
//
// The chrome window wrapping a browser tab is INVISIBLE to this harness:
// chrome-context Marionette is platform-blocked on Linux (WINDOWS.md 7) and
// BiDi's browsingContext tree carries content contexts only. The spike also
// discarded the obvious instrument -- counting X windows -- for cause: this is
// a Wayland host, Gecko ignores the Xvfb DISPLAY, and `xwininfo` reported 0
// windows beside a demonstrably open, focused one. So both facts are read from
// what IS observable, and each is read two independent ways:
//
//   * "a window opened" -> a NEW top-level browsing context appears, carrying
//     the exact URL passed to window.open. A blocked popup produces neither
//     that context nor a non-null return value.
//   * "it was a STOCK BROWSER window, not a second shell" -> the shell's own
//     POWERBROWSER_SHELL_READY sentinel count stays at 1 across the whole
//     sequence (a second shell window runs powerbrowser.js and would emit its
//     own), AND the new context stays on the URL it was given instead of being
//     swapped to the Theia backend the way a shell window's content browser is.
//     That the document behind it is stock chrome with a working address bar,
//     tab strip and in-window modal dialogs is the spike's observation 4, taken
//     from inside the opened window against the same BROWSER_CHROME_URL
//     constant; it is not re-derived here.
//   * "closing it did not quit" -> the context disappears, the shell still
//     answers script.evaluate, and the browser process is still alive.
//
// Timing constraint, inherited from the ratification: the window is opened only
// AFTER the Theia frontend has finished loading, never during the shell's own
// startup. The spike found (observation 4) that a browser window opened
// synchronously inside the shell's DOMContentLoaded comes up with `gURLBar`
// permanently `undefined` -- upstream's own lazy getter losing a race with its
// own document parse. A check that opened one during startup would assert
// against a window upstream itself left half-initialised.
//
// Usage:
//   node scripts/verify-gui01-window.mjs
//   node scripts/verify-gui01-window.mjs --help
//
// No import/require of any package name -- only Node built-ins and
// scripts/lib/firefox-bidi.mjs (D-69).

import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { withFirefoxPage } from './lib/firefox-bidi.mjs';

const HELP = `Usage: node scripts/verify-gui01-window.mjs

GUI-01: launches the built binary, waits for the Theia frontend, opens a stock
browser window through the ratified window.open channel, and asserts the popup
was not blocked, that no second shell window appeared, and that closing the
browser window leaves the application running.

  --help   Print this message and exit 0
`;

if (process.argv.slice(2).includes('--help')) {
    console.log(HELP.trimEnd());
    process.exit(0);
}

// Distinctive enough that it cannot be confused with the shell's own
// about:blank content browser, and a fragment rather than a real navigation so
// the check needs no network and no local server of its own.
const PROBE_URL = 'about:blank#gui01-verify';
const SHELL_READY = 'POWERBROWSER_SHELL_READY';
// Generous: the whole Theia backend must spawn and answer before the window is
// opened, which is the point -- opening earlier is the thing the spike forbids.
const FRONTEND_TIMEOUT_MS = 180000;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const failures = [];
const fail = message => {
    failures.push(message);
    console.error(`verify-gui01-window: FAIL -- ${message}`);
};

const workDir = await mkdtemp(join(tmpdir(), 'powerbrowser-gui01-'));
const logPath = join(workDir, 'shell.log');

const shellReadyCount = async () => {
    const text = await readFile(logPath, 'utf8').catch(() => '');
    return (text.match(new RegExp(SHELL_READY, 'g')) || []).length;
};

try {
    // Empty url on purpose: NO command-line URL argument. A URL argument opens
    // a stock browser window of its own alongside the shell (found live, this
    // plan -- upstream's nsDefaultCommandLineHandler gates only its no-URI
    // branch on cmdLine.preventDefault), which would put a second top-level
    // context in the baseline and destroy the "the shell opened alone"
    // assertion below.
    await withFirefoxPage('', async ({ evaluate, waitFor, topLevelContexts }) => {
        // Wait for the shell to swap its content browser to the supervised
        // Theia backend, then for the frontend itself to finish booting. Both
        // waits are the "not during startup" constraint, expressed as a
        // precondition rather than a sleep.
        await waitFor("location.href.startsWith('http://127.0.0.1') ? location.href : ''", { timeoutMs: FRONTEND_TIMEOUT_MS });
        await waitFor('window.theia && window.theia.container ? true : false', { timeoutMs: FRONTEND_TIMEOUT_MS });

        // Non-vacuity, before anything is concluded from a count: the shell
        // really did announce itself exactly once. Without this, every
        // "still 1" assertion below would also be satisfied by a shell that
        // never started.
        const readyBefore = await shellReadyCount();
        if (readyBefore !== 1) {
            fail(`expected exactly one ${SHELL_READY} sentinel before opening a browser window, found ${readyBefore} -- the launch under test is not in the state this check assumes`);
            return;
        }

        const before = await topLevelContexts();
        const beforeIds = new Set(before.map(c => c.context));

        // WINDOW COMPOSITION, and the only place it is asserted. A bare launch
        // must produce the shell and nothing else: exactly one top-level
        // browsing context, and it is the shell's own content browser showing
        // the supervised Theia backend. A stock browser window opening
        // alongside -- the symptom of the single-instance handler failing to
        // preventDefault, now that BROWSER_CHROME_URL is stock -- shows up here
        // as a second context and nowhere else.
        //
        // This assertion lives here rather than in gui01-single-shell-window
        // because the shell's stdout carries NO signal for it. 01-SPIKE-GUI-01.md
        // observation 1 inferred "no browser window opened" from the absence of
        // `chrome://browser/content` lines in the launch log; that inference is
        // WRONG, and was an artifact of the spike's own instrumentation, which
        // dumped chrome hrefs itself. Measured live while writing this check: a
        // run that demonstrably opened a stock browser window logged zero such
        // lines. The browsing-context tree is the real instrument.
        if (before.length !== 1) {
            fail(`expected exactly one top-level browsing context on a bare launch (the shell's own content browser), found ${before.length}: ${JSON.stringify(before)} -- a window opened alongside the shell`);
            return;
        }
        if (!before[0].url.startsWith('http://127.0.0.1')) {
            fail(`the single top-level browsing context is at ${before[0].url}, expected the supervised Theia backend on http://127.0.0.1 -- this is not the shell's content browser`);
            return;
        }

        const opened = await evaluate(`(() => {
            try {
                window.__gui01Window = window.open(${JSON.stringify(PROBE_URL)}, '_blank');
                return JSON.stringify({ opened: !!window.__gui01Window });
            } catch (e) {
                return JSON.stringify({ opened: false, error: String(e) });
            }
        })()`);
        const openResult = JSON.parse(opened);
        if (!openResult.opened) {
            fail(
                'window.open returned null from the Theia frontend -- the popup path is BLOCKED on this platform. ' +
                'This is the exact risk 01-SPIKE-GUI-01.md observation 7 named; the pre-approved remedy is candidate B ' +
                '(a JSWindowActor pair calling PowerBrowserAPI.openBrowserWindow), which also obliges adding ' +
                `ChromeUtils.registerWindowActor to check-internals-boundary.sh's FORBIDDEN_PATTERNS.${openResult.error ? ` Underlying error: ${openResult.error}` : ''}`
            );
            return;
        }

        // The window is opened asynchronously by the platform; give it time to
        // register a browsing context before concluding it did not.
        await sleep(5000);

        const after = await topLevelContexts();
        const fresh = after.filter(c => !beforeIds.has(c.context));
        const probeContext = fresh.find(c => c.url === PROBE_URL);
        if (!probeContext) {
            fail(
                `window.open returned a window object but no new top-level browsing context carrying ${PROBE_URL} appeared. ` +
                `New contexts seen: ${JSON.stringify(fresh)}`
            );
        }

        // The discriminator between "a stock browser window opened" and "a
        // second SHELL window opened": a shell window runs powerbrowser.js,
        // whose very first act is this sentinel.
        const readyAfterOpen = await shellReadyCount();
        if (readyAfterOpen !== 1) {
            fail(`opening a browser window produced ${readyAfterOpen} ${SHELL_READY} sentinels (expected 1) -- what opened was a second SHELL window, not stock browser chrome`);
        }

        const closed = await evaluate(`(() => {
            try {
                window.__gui01Window.close();
                return JSON.stringify({ closed: true });
            } catch (e) {
                return JSON.stringify({ closed: false, error: String(e) });
            }
        })()`);
        const closeResult = JSON.parse(closed);
        if (!closeResult.closed) {
            fail(`could not close the opened browser window: ${closeResult.error}`);
            return;
        }

        await sleep(5000);

        // T-05-04. Each of these three is independently sufficient to catch a
        // quit; together they also catch "the shell survived but its content
        // process died", which would be the same data loss by another route.
        const stillAlive = await evaluate('1 + 1').catch(e => `THREW ${e}`);
        if (stillAlive !== 2) {
            fail(`the shell stopped answering after the browser window was closed (got ${JSON.stringify(stillAlive)}) -- closing a browser window must never quit the application`);
        }

        const afterClose = await topLevelContexts();
        if (afterClose.some(c => c.context === probeContext?.context)) {
            fail(`the opened browser window's browsing context ${probeContext.context} is still present after close() -- the window did not actually close, so this check proves nothing about the last-window hazard`);
        }
        if (!afterClose.some(c => beforeIds.has(c.context))) {
            fail('every browsing context that existed before the browser window opened is gone after closing it -- the shell window did not survive');
        }

        const readyAfterClose = await shellReadyCount();
        if (readyAfterClose !== 1) {
            fail(`expected the ${SHELL_READY} count to still be 1 after closing the browser window, found ${readyAfterClose}`);
        }
    }, { stdoutPath: logPath });
} finally {
    await rm(workDir, { recursive: true, force: true });
}

if (failures.length) {
    console.error(`verify-gui01-window: FAIL -- ${failures.length} assertion(s) failed`);
    process.exit(1);
}
console.log('verify-gui01-window: PASS -- window.open opened a stock browser window (popup not blocked, no second shell), and closing it left the application running');
