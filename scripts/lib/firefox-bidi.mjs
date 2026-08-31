// scripts/lib/firefox-bidi.mjs
//
// Zero-dependency WebDriver BiDi driver for `objdir/dist/bin/firefox`, the
// Firefox build this repo already produces (Phase 1). Per D-69: not
// Playwright, not Puppeteer, not geckodriver -- the pinned `nodejs_22`
// exposes a global `WebSocket`, so this file imports no package, only Node
// built-ins and globals.
//
// Dev-shell note, settled live on this host 2026-08-20: `objdir/dist/bin/
// firefox --version` was run both from a plain shell and from inside
// `nix develop .#theia` and returned `Mozilla Firefox 153.1.0esr` in both,
// with no shared-library error. The binary does NOT require
// `nix develop .#firefox` to run, so this driver spawns it directly rather
// than through a `nix develop .#firefox --command` wrapper.
//
// Process hygiene is a hard requirement, not a nicety (D-69): every caller
// goes through `withFirefoxPage`, whose `finally` always kills the spawned
// Firefox and removes its temporary profile directory -- on the success
// path, on a thrown assertion, and on SIGINT. Phase 5's whole subject is
// orphaned processes; this harness must not manufacture that failure mode.

import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';
import { existsSync, createWriteStream } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
// Phase 3 (03-02): the binary this driver targets by default is the
// PowerBrowser-branded build, not stock `firefox` -- plan 03-01 step 8 removes
// the stale `dist/bin/firefox` entirely, and identity surface 1 requires
// that no file by that name remain. Every caller that passes no override
// (four of the five Phase 2 checks) now routes through this renamed target;
// callers that need a different binary (e.g. a release-branding build) pass
// `binPath` explicitly.
export const FIREFOX_BIN = join(REPO_ROOT, 'objdir', 'dist', 'bin', 'powerbrowser');

const BIDI_LINE_RE = /WebDriver BiDi listening on (ws:\/\/127\.0\.0\.1:\d+)/;

async function freePort() {
    return new Promise((resolve, reject) => {
        const srv = createServer();
        srv.on('error', reject);
        srv.listen(0, '127.0.0.1', () => {
            const { port } = srv.address();
            srv.close(() => resolve(port));
        });
    });
}

function waitForBiDiUrl(child) {
    return new Promise((resolve, reject) => {
        let buf = '';
        const onData = chunk => {
            buf += chunk.toString('utf8');
            const m = buf.match(BIDI_LINE_RE);
            if (m) {
                child.stderr.off('data', onData);
                child.off('exit', onExit);
                resolve(m[1]);
            }
        };
        const onExit = code => {
            child.stderr.off('data', onData);
            reject(new Error(`firefox exited (code ${code}) before printing its BiDi listening line; stderr so far:\n${buf}`));
        };
        child.stderr.on('data', onData);
        child.once('exit', onExit);
        child.once('error', reject);
    });
}

class BiDiClient {
    constructor(ws) {
        this.ws = ws;
        this.nextId = 1;
        this.pending = new Map();
        ws.addEventListener('message', event => {
            let msg;
            try {
                msg = JSON.parse(event.data);
            } catch {
                return;
            }
            const pending = this.pending.get(msg.id);
            if (!pending) return;
            this.pending.delete(msg.id);
            if (msg.type === 'error') {
                pending.reject(new Error(`BiDi error: ${msg.error} -- ${msg.message}`));
            } else {
                pending.resolve(msg);
            }
        });
        // CR-02: without these, a Firefox crash mid-session leaves every
        // in-flight send() pending forever -- the socket closes (or stops
        // producing messages) but nothing ever settles the pending promise,
        // which also silently defeats waitFor()'s own timeoutMs (it only
        // checks its deadline after an `await evaluate(...)` returns).
        // `closedError` (CR-03 follow-up, found live while proving CR-03
        // with a real SIGINT): 'close'/'error' fire once and reject only
        // whatever was pending AT THAT MOMENT -- a caller whose current
        // await is a plain `setTimeout` sleep, not a BiDi call, issues its
        // *next* send() only after the socket has already closed, and that
        // new pending entry would otherwise sit unrejected until its own
        // per-request timeout (measured live: a captureScreenshot call
        // issued after SIGINT-triggered close took the full 20s instead of
        // rejecting immediately). Recording the terminal error and having
        // every subsequent send() reject with it immediately closes that
        // gap.
        this.closedError = null;
        const failAll = err => {
            this.closedError = err;
            for (const { reject } of this.pending.values()) reject(err);
            this.pending.clear();
        };
        ws.addEventListener('close', () => failAll(new Error('BiDi WebSocket closed (browser likely died)')));
        ws.addEventListener('error', err => failAll(new Error(`BiDi WebSocket error: ${err.message || err}`)));
    }

    send(method, params, { timeoutMs = 20000 } = {}) {
        if (this.closedError) {
            return Promise.reject(this.closedError);
        }
        const id = this.nextId++;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(id);
                reject(new Error(`BiDi request '${method}' timed out after ${timeoutMs}ms`));
            }, timeoutMs);
            this.pending.set(id, {
                resolve: v => { clearTimeout(timer); resolve(v); },
                reject: e => { clearTimeout(timer); reject(e); },
            });
            this.ws.send(JSON.stringify({ id, method, params }));
        });
    }
}

/**
 * Poll `evaluate(expression)` until it returns a truthy value or the
 * timeout elapses. Used to wait for `window.theia?.container` to exist --
 * the page is a single-page app and the container appears after load, not
 * on first paint.
 */
export async function waitFor(evaluate, expression, { timeoutMs = 15000, intervalMs = 100 } = {}) {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
        const value = await evaluate(expression);
        if (value) return value;
        if (Date.now() >= deadline) {
            throw new Error(`waitFor timed out after ${timeoutMs}ms waiting for truthy: ${expression}`);
        }
        await new Promise(r => setTimeout(r, intervalMs));
    }
}

/**
 * Launch `objdir/dist/bin/firefox --headless --screenshot` against `url` and
 * write a PNG to `outputPath`. This is a separate, simpler launch mode from
 * `withFirefoxPage`'s BiDi one -- no remote agent, no socket, just
 * `--screenshot` and wait for the process to exit -- kept a sibling export
 * rather than bending the BiDi helper to do both. Plan 05's pixel comparison
 * is the consumer; this file has no caller of its own.
 *
 * Shares the same cleanup discipline as `withFirefoxPage`: the process is
 * killed if it outlives `timeoutMs`, and the temporary profile is removed
 * unconditionally in a `finally`, on the success path, the timeout path, and
 * on SIGINT.
 */
export async function captureScreenshot(url, outputPath, { windowSize = '800,600', timeoutMs = 15000, binPath = FIREFOX_BIN } = {}) {
    if (!existsSync(binPath)) {
        throw new Error(
            `firefox-bidi: ${binPath} does not exist. Run the Phase 1 Firefox build first ` +
            `(see docs/BUILD.md "Firefox half") -- a fresh clone has no objdir/ until that build runs.`
        );
    }

    const profileDir = await mkdtemp(join(tmpdir(), 'powerbrowser-firefox-bidi-'));
    let sigintHandler;

    const child = spawn(binPath, [
        '--headless',
        '--profile', profileDir,
        '--window-size', windowSize,
        '--screenshot', outputPath,
        url,
    ], { stdio: ['ignore', 'ignore', 'pipe'] });

    const cleanup = async () => {
        if (sigintHandler) process.off('SIGINT', sigintHandler);
        if (!child.killed && child.exitCode === null) {
            child.kill('SIGTERM');
            await new Promise(resolve => {
                const timer = setTimeout(() => {
                    if (child.exitCode === null) child.kill('SIGKILL');
                    resolve();
                }, 5000);
                child.once('exit', () => { clearTimeout(timer); resolve(); });
            });
        }
        await rm(profileDir, { recursive: true, force: true });
    };

    sigintHandler = () => {
        cleanup().finally(() => process.exit(130));
    };
    process.on('SIGINT', sigintHandler);

    try {
        await new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`captureScreenshot: firefox did not exit within ${timeoutMs}ms`));
            }, timeoutMs);
            child.once('exit', code => {
                clearTimeout(timer);
                if (code === 0) resolve();
                else reject(new Error(`captureScreenshot: firefox exited with code ${code}`));
            });
            child.once('error', err => {
                clearTimeout(timer);
                reject(err);
            });
        });
        return outputPath;
    } finally {
        await cleanup();
    }
}

/**
 * Launch `objdir/dist/bin/firefox` headless against `url`, connect over
 * WebDriver BiDi, and invoke `callback({ evaluate, waitFor, screenshot })`.
 * Guarantees Firefox is killed and its temporary profile removed before
 * returning or throwing, including on SIGINT.
 *
 * `screenshot()` (added for Plan 05's pixel-comparison harness) captures
 * the CURRENT state of the already-loaded page via BiDi
 * `browsingContext.captureScreenshot`, returning a `Buffer` -- callers
 * decide what to do with the bytes (write to disk, hash, decode). This is
 * a deliberately different mechanism from the sibling `captureScreenshot`
 * export below: that one launches `--headless --screenshot`, a one-shot
 * "load and screenshot" process mode with no scripting hook in between,
 * which was found (Plan 05, live) to fire on the page's early `load` event
 * -- well before a Theia SPA's `startContributions()`/shell-attach
 * sequence finishes, so it only ever captures a near-blank loading screen.
 * `withFirefoxPage`'s `screenshot()` instead runs inside the same session
 * `waitFor` already uses, so a caller can wait for `#theia-app-shell` (and
 * settle past any debounce) before capturing -- the only way to actually
 * see the rendered app.
 */
export async function withFirefoxPage(url, callback, { binPath = FIREFOX_BIN, stdoutPath } = {}) {
    if (!existsSync(binPath)) {
        throw new Error(
            `firefox-bidi: ${binPath} does not exist. Run the Phase 1 Firefox build first ` +
            `(see docs/BUILD.md "Firefox half") -- a fresh clone has no objdir/ until that build runs.`
        );
    }

    const profileDir = await mkdtemp(join(tmpdir(), 'powerbrowser-firefox-bidi-'));
    const port = await freePort();

    // Without the flag below, script.evaluate against a parent-process
    // browsing context (e.g. about:support, identity surface 3) is refused
    // outright -- upstream/remote/webdriver-bidi/modules/root/
    // script.sys.mjs:844 checks RemoteAgent.allowSystemAccess and throws
    // "unsupported operation" otherwise. Empirically confirmed both
    // directions this session (03-02 Task 1): identical BiDi session reads
    // about:support's application-box live when it is present, and the same
    // read throws that exact error when it is absent.
    // GUI-01 (01-05): `stdoutPath` tees the launched binary's stdout to a file
    // so a caller can assert against the shell's own dump() sentinel channel
    // (POWERBROWSER_SHELL_READY and friends) in the SAME session it drives
    // over BiDi. Without it stdout is discarded, which is right for every
    // caller that only reads the page -- but the window checks need the
    // sentinel stream, and launching a second, differently-configured
    // instance to get it would assert against a different process than the
    // one under test.
    const stdoutSink = stdoutPath ? createWriteStream(stdoutPath) : undefined;
    // An EMPTY `url` means "launch with no URL argument at all", which is not
    // the same launch as `about:blank`. Found live (01-05): with GUI-01's
    // startup-window move landed, a URL on the command line opens a stock
    // browser window IN ADDITION to the shell -- upstream's
    // nsDefaultCommandLineHandler gates only its no-URI branch on
    // `cmdLine.preventDefault`, and takes the URI branch regardless. So every
    // caller passing a url gets two top-level browsing contexts, and a caller
    // that needs to assert the shell opened ALONE must pass none.
    const child = spawn(binPath, [
        '--headless',
        '--profile', profileDir,
        `--remote-debugging-port=${port}`,
        '--remote-allow-hosts', '127.0.0.1',
        '--remote-allow-system-access',
        ...(url ? [url] : []),
    ], { stdio: ['ignore', stdoutSink ? 'pipe' : 'ignore', 'pipe'] });
    if (stdoutSink) {
        child.stdout.pipe(stdoutSink);
    }

    let ws;
    let client;
    let sigintHandler;

    const cleanup = async () => {
        if (sigintHandler) process.off('SIGINT', sigintHandler);
        if (ws) {
            try { ws.close(); } catch { /* already closed */ }
        }
        if (!child.killed && child.exitCode === null) {
            child.kill('SIGTERM');
            await new Promise(resolve => {
                const timer = setTimeout(() => {
                    if (child.exitCode === null) child.kill('SIGKILL');
                    resolve();
                }, 5000);
                child.once('exit', () => { clearTimeout(timer); resolve(); });
            });
        }
        if (stdoutSink) {
            await new Promise(resolve => stdoutSink.end(resolve));
        }
        await rm(profileDir, { recursive: true, force: true });
    };

    // CR-03: this handler must not call process.exit() itself. A caller
    // (e.g. verify-customize-inert.mjs) may have its own teardown to run
    // in its own `finally` after this function's promise settles -- if
    // this handler force-exits, it races ahead of that, and ahead of the
    // 5s SIGKILL-escalation + `rm(profileDir, ...)` sequence inside
    // cleanup() below, exactly the orphaned-process/leaked-profile bug
    // CR-03 describes. Closing the socket here is what unblocks an
    // in-flight BiDi call (CR-02's failAll(), fired by the WebSocket
    // 'close' event), which lets the awaited `callback(...)` above reject
    // and this function's own `try/finally` unwind naturally and
    // deterministically -- no forced exit, no race. `process.exitCode`
    // (not `process.exit()`) marks the eventual natural exit with the
    // conventional SIGINT code, without terminating anything early.
    sigintHandler = () => {
        process.exitCode = 130;
        cleanup();
    };
    process.on('SIGINT', sigintHandler);

    try {
        const wsUrl = await waitForBiDiUrl(child);
        ws = new WebSocket(`${wsUrl}/session`);
        await new Promise((resolve, reject) => {
            ws.addEventListener('open', resolve, { once: true });
            ws.addEventListener('error', reject, { once: true });
        });

        client = new BiDiClient(ws);
        await client.send('session.new', { capabilities: {} });
        const tree = await client.send('browsingContext.getTree', {});
        const context = tree.result.contexts[0].context;

        const evaluate = async expression => {
            const result = await client.send('script.evaluate', {
                expression,
                target: { context },
                awaitPromise: true,
            });
            return result.result.result.value;
        };

        const screenshot = async () => {
            const result = await client.send('browsingContext.captureScreenshot', { context });
            return Buffer.from(result.result.data, 'base64');
        };

        // GUI-01 (01-05): the top-level browsing contexts this session can
        // see, url and context id only. `evaluate` above is pinned to the one
        // context found at session start, so a caller asserting that a SECOND
        // window opened has no other way to see it -- and the chrome window
        // wrapping it is invisible on this platform (WINDOWS.md 7), so the
        // content context it owns is the only observable.
        const topLevelContexts = async () => {
            const tree = await client.send('browsingContext.getTree', {});
            return tree.result.contexts.map(c => ({ context: c.context, url: c.url }));
        };

        return await callback({
            evaluate,
            waitFor: (expr, opts) => waitFor(evaluate, expr, opts),
            screenshot,
            topLevelContexts,
        });
    } finally {
        if (ws && client && ws.readyState === WebSocket.OPEN) {
            try {
                await Promise.race([client.send('session.end', {}), new Promise(r => setTimeout(r, 2000))]);
            } catch {
                // best-effort -- cleanup() below still kills the process regardless
            }
        }
        await cleanup();
    }
}
