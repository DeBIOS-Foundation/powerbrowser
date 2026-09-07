#!/usr/bin/env node
/**
 * GUI-02's in-shell web tab, PROVEN BY OBSERVATION in the built shell (14.1-01).
 *
 * The overlay bridge has no bare-Node observable: the placeholder is a Theia
 * widget in a live frontend, the page is a chrome-owned <xul:browser> in the
 * shell window, and the only thing that joins them is the PowerBrowserGroup
 * actor channel inside the built binary. Every static gate in the tree reads
 * text; this file drives the real product and looks at the real contexts.
 *
 * WHAT IT DRIVES: one path only. In the frontend's own realm it resolves the
 * `WebTabOpenHandler` by DI name, calls `openUrl(<served page>)`, and reads
 * back what the shell now holds. Outside the realm it re-queries the BiDi
 * browsing-context tree: an overlay that chrome created and loaded shows up
 * as a SECOND top-level context carrying the served URL, because the host
 * pushes every overlay into `win.gBrowser.tabs` with a `permanentKey` (the
 * same shape powerbrowser.js fakes for the one content browser).
 *
 * WHAT IT ASSERTS, each a named failure:
 *   - `window.open` was called ZERO times. The page realm wraps it with a
 *     counter BEFORE anything else runs, so a handler that fell back to the
 *     GUI-01 popup path is caught by count, not by inference.
 *   - the shell's current widget was created by the web-tab factory (id
 *     derived from web-tab.ts) and its id is among the main-area titles.
 *   - exactly ONE top-level context carries the served URL, and the total is
 *     TWO (the shell's own frontend plus the overlay). A stock window opened
 *     by a popup would add a context too, which is why the window.open count
 *     is asserted separately and first.
 *   - the launched binary's stdout tee contains at least one
 *     POWERBROWSER_SHELL_READY line -- the PRESENCE of the shell's own
 *     sentinel, so a session that never reached a real shell cannot pass.
 *     Never an absence assertion (CLAUDE.md verification rule 1).
 *
 * WHAT IT DERIVES, never hand-keeps: the factory id and the open-handler
 * class name from web-tab.ts, and the DI binding line from the frontend
 * module. A zero derivation is a named FAIL (broken instrument), never a skip.
 *
 * The served pages come from a `node:http` server this script starts on an
 * ephemeral loopback port, so no fixture host on the network is involved and
 * the URL the overlay must carry is known exactly.
 *
 * HONESTLY TIERED -- THIS CANNOT BE `--quick`. It launches the built
 * `objdir/dist/bin/powerbrowser` headless over WebDriver BiDi and needs the
 * last Theia app build (the harness uses a fresh profile, so chrome-side
 * edits are live, but the frontend bundle is whatever `theia build` last
 * wrote). Register it in the full set, never the commit gate. One clean run
 * is roughly 30 seconds; `--self-test` boots three sessions.
 *
 * Usage:
 *   node scripts/verify-web-tab-live.mjs
 *   node scripts/verify-web-tab-live.mjs --self-test
 *   node scripts/verify-web-tab-live.mjs --help
 *
 * No import of any package name -- Node built-ins and scripts/lib/firefox-bidi.mjs
 * only (D-69).
 */

import { mkdtempSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withFirefoxPage } from './lib/firefox-bidi.mjs';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'verify-web-tab-live';

const WEB_TAB_REL = 'theia/extensions/tab-uris/src/browser/web-tab.ts';
const MODULE_REL = 'theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts';

/** The shell's own readiness sentinel (powerbrowser.js dump channel). */
const SHELL_READY_SENTINEL = 'POWERBROWSER_SHELL_READY';

const HELP = `Usage: node scripts/${NAME}.mjs [--self-test]

GUI-02: opens a served http page through the web-tab open handler inside the
live built shell and asserts it became a main-area web tab rendered by a
chrome-owned overlay context -- with zero window.open calls. Needs the built
browser and the last Theia app build; not a --quick check.

  --self-test  Re-run the protocol with planted faults; each must go red
  --help       Print this message and exit 0
`;

// --------------------------------------------------------------------------
// Tree derivations. Every expectation the live half compares against is read
// off a source here; nothing below is spelled twice.
// --------------------------------------------------------------------------

function read(rel) {
    return readFileSync(join(REPO_ROOT, rel), 'utf8');
}

function derive() {
    const failures = [];
    const webTab = read(WEB_TAB_REL);
    const factoryId = /WEB_TAB_FACTORY_ID\s*=\s*'([^']+)'/.exec(webTab)?.[1];
    if (!factoryId) {
        failures.push(`${WEB_TAB_REL}: derived NO web-tab factory id -- the check cannot tell a web tab from any other main-area widget`);
    }
    const handlerClass = /export class (\w+)\s+implements OpenHandler/.exec(webTab)?.[1];
    if (!handlerClass) {
        failures.push(`${WEB_TAB_REL}: derived NO open-handler class -- the protocol resolves the handler by its class name and cannot invent one`);
    }
    const requestEvent = /GROUP_REQUEST_EVENT\s*=\s*'([^']+)'/.exec(webTab)?.[1];
    if (!requestEvent) {
        failures.push(`${WEB_TAB_REL}: derived NO group request event name -- the swallow plant has nothing to drop`);
    }
    const bound = handlerClass ? new RegExp(`toService\\(${handlerClass}\\)`).test(read(MODULE_REL)) : false;
    if (handlerClass && !bound) {
        failures.push(`${MODULE_REL}: no 'toService(${handlerClass})' binding -- the handler is not registered with OpenerService, so nothing in the product can reach it`);
    }
    return { failures, factoryId, handlerClass, requestEvent };
}

// --------------------------------------------------------------------------
// The served pages. Two titled documents on an ephemeral loopback port.
// --------------------------------------------------------------------------

const PAGES = {
    '/a': { title: 'Web tab A' },
    '/b': { title: 'Web tab B' },
};

function servePages() {
    const server = createServer((req, res) => {
        const page = PAGES[req.url];
        if (!page) {
            res.writeHead(404, { 'content-type': 'text/plain' });
            res.end('not found');
            return;
        }
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(`<!doctype html><html><head><title>${page.title}</title></head><body><h1>${page.title}</h1></body></html>`);
    });
    return new Promise((resolve, reject) => {
        server.on('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const { port } = server.address();
            resolve({
                urls: { a: `http://127.0.0.1:${port}/a`, b: `http://127.0.0.1:${port}/b` },
                close: () => new Promise(done => server.close(() => done())),
            });
        });
    });
}

// --------------------------------------------------------------------------
// The live half.
// --------------------------------------------------------------------------

/**
 * Inversify identifier lookup by NAME -- the same walk verify-mode-switch-
 * tabs-live.mjs and verify-gui01-command.mjs use, for the same reason: BiDi
 * `script.evaluate` runs a bare expression in the page realm with no module
 * resolution, so DI identifier VALUES are unreachable. Pinned against
 * inversify 6.2.2's `_bindingDictionary`.
 */
const GET_BY_NAME = `
function __getByName(container, name) {
    let found;
    container._bindingDictionary.traverse(key => {
        if (found) return;
        const keyStr = typeof key === 'symbol' ? key.toString() : (key && key.name) || String(key);
        if (keyStr === 'Symbol(' + name + ')' || keyStr === name) found = key;
    });
    if (!found) throw new Error('DI binding not found for identifier name: ' + name);
    return container.get(found);
}`;

/**
 * The protocol, as one page-realm expression. `plant` is '' for the real
 * check; the self-test passes one of two fault names, each applied through
 * the SAME code path the real run takes, so a plant can only go red by the
 * assertions actually working.
 */
function protocolExpression(derived, servedA, plant) {
    const cfg = JSON.stringify({
        handlerClass: derived.handlerClass,
        requestEvent: derived.requestEvent,
        servedA,
        plant,
    });
    return `(async () => { ${GET_BY_NAME}
    const cfg = ${cfg};
    const report = { failures: [], notes: [], steps: [], windowOpenCalls: 0 };
    const fail = message => report.failures.push(message);
    try {
        // FIRST, before anything else: count every window.open. A handler
        // that falls back to the GUI-01 popup path is caught by count.
        const realOpen = window.open;
        window.open = function (...args) {
            report.windowOpenCalls += 1;
            return realOpen.apply(window, args);
        };

        const container = window.theia.container;
        const shell = __getByName(container, 'ApplicationShell');
        const widgets = __getByName(container, 'WidgetManager');
        const handler = __getByName(container, cfg.handlerClass);
        const settle = () => new Promise(resolve => setTimeout(resolve, 600));

        if (cfg.plant === 'swallow') {
            const realDispatch = document.dispatchEvent.bind(document);
            document.dispatchEvent = event => (event && event.type === cfg.requestEvent) ? true : realDispatch(event);
            report.notes.push('PLANT swallow: document.dispatchEvent drops every ' + cfg.requestEvent + ' event, so nothing reaches the actor child');
        } else if (cfg.plant === 'popup') {
            Object.getPrototypeOf(handler).openUrl = function (url) {
                window.open(url, '_blank');
                return undefined;
            };
            report.notes.push('PLANT popup: ' + cfg.handlerClass + '.openUrl replaced by a window.open fallback');
        }

        report.steps.push('openUrl ' + cfg.servedA);
        const opened = await handler.openUrl(cfg.servedA);
        await settle();

        // The widget the handler returned, and whether the main dock made it
        // the CURRENT title. Not shell.currentWidget: that is the DOM
        // FocusTracker's answer, and a headless window never delivers the
        // focus event activateWidget's node.focus() would raise, so it
        // stays undefined here regardless of what the strip did. The tab
        // bar's currentTitle is Lumino state and answers the same question.
        report.currentWidgetId = opened ? opened.id : undefined;
        report.widgetFactoryId = opened ? (widgets.getDescription(opened) || {}).factoryId : undefined;
        report.mainIds = shell.mainAreaTabBars
            .flatMap(bar => Array.from(bar.titles).map(title => title.owner.id));
        report.currentTitleIds = shell.mainAreaTabBars
            .map(bar => bar.currentTitle && bar.currentTitle.owner.id)
            .filter(id => typeof id === 'string');
    } catch (e) {
        fail('the protocol threw at step [' + report.steps.join(' -> ') + ']: ' + String(e));
    }
    return JSON.stringify(report);
})()`;
}

/** Poll the live context tree until one carries `url`, or the deadline passes. */
async function awaitServedContext(topLevelContexts, url, timeoutMs = 10000) {
    const deadline = Date.now() + timeoutMs;
    let seen = [];
    for (;;) {
        seen = await topLevelContexts();
        if (seen.some(c => c.url === url)) {
            break;
        }
        if (Date.now() >= deadline) {
            break;
        }
        await new Promise(r => setTimeout(r, 250));
    }
    return seen.map(c => c.url);
}

async function runProtocol(derived, plant) {
    try {
        return await drive(derived, plant);
    } catch (error) {
        return { driveError: String(error), failures: [], notes: [], steps: [] };
    }
}

async function drive(derived, plant) {
    const pages = await servePages();
    const stdoutPath = join(mkdtempSync(join(tmpdir(), 'powerbrowser-web-tab-live-')), 'shell-stdout.log');
    try {
        // Empty URL: the shell's own supervised frontend is the app under
        // test, and a URL on the command line would open a stock window
        // beside it (WINDOWS 14).
        return await withFirefoxPage('', async ({ evaluate, waitFor, topLevelContexts }) => {
            await waitFor('window.theia && window.theia.container ? true : false', { timeoutMs: 60000 });
            await waitFor('!!document.querySelector("#theia-app-shell")', { timeoutMs: 60000 });
            await waitFor(`(() => { try { ${GET_BY_NAME}
                return __getByName(window.theia.container, 'FrontendApplicationStateService').state === 'ready';
            } catch (e) { return false; } })()`, { timeoutMs: 60000 });
            const raw = await evaluate(protocolExpression(derived, pages.urls.a, plant));
            const report = JSON.parse(raw);
            report.servedA = pages.urls.a;
            report.contexts = await awaitServedContext(topLevelContexts, pages.urls.a);
            let stdout = '';
            try {
                stdout = readFileSync(stdoutPath, 'utf8');
            } catch {
                stdout = '';
            }
            report.shellReadyLines = stdout.split('\n').filter(line => line.includes(SHELL_READY_SENTINEL)).length;
            return report;
        }, { stdoutPath });
    } finally {
        await pages.close();
    }
}

/** Tree-side assertions over one live report. @returns {string[]} */
function assertReport(derived, report) {
    if (report.driveError) {
        return [`could not drive the live frontend: ${report.driveError}`];
    }
    const failures = [...report.failures];
    if (report.windowOpenCalls !== 0) {
        failures.push(`window.open was called ${report.windowOpenCalls} time(s) during the open -- the handler fell back to the popup path instead of an in-shell web tab`);
    }
    if (report.widgetFactoryId !== derived.factoryId) {
        failures.push(`the shell's current widget was created by factory '${report.widgetFactoryId}', not the web-tab factory '${derived.factoryId}'`);
    }
    if (!report.currentWidgetId || !(report.mainIds ?? []).includes(report.currentWidgetId)) {
        failures.push(`the opened widget '${report.currentWidgetId}' is not among the main-area titles [${(report.mainIds ?? []).join(', ')}] -- the web tab did not land in the shell's own strip`);
    } else if (!(report.currentTitleIds ?? []).includes(report.currentWidgetId)) {
        failures.push(`the opened widget '${report.currentWidgetId}' is in the strip but is not the current title of its dock (current: [${(report.currentTitleIds ?? []).join(', ')}]) -- the tab was added without being activated`);
    }
    const served = (report.contexts ?? []).filter(url => url === report.servedA).length;
    if (served !== 1) {
        failures.push(`expected exactly one top-level browsing context carrying ${report.servedA} (the overlay), saw ${served} in ${JSON.stringify(report.contexts ?? [])}`);
    }
    if ((report.contexts ?? []).length !== 2) {
        failures.push(`expected two top-level browsing contexts (shell + overlay), saw ${(report.contexts ?? []).length}: ${JSON.stringify(report.contexts ?? [])}`);
    }
    if (!(report.shellReadyLines > 0)) {
        failures.push(`the launched binary's stdout carried no ${SHELL_READY_SENTINEL} line -- this session never reached a real shell, so nothing it reported is about the product`);
    }
    return failures;
}

function printReport(report) {
    if (report.driveError) {
        return;
    }
    console.log(`${NAME}: served ${report.servedA}; opened widget '${report.currentWidgetId}' from factory '${report.widgetFactoryId}'`);
    console.log(`${NAME}: main-area tabs: [${(report.mainIds ?? []).join(', ')}]; current titles: [${(report.currentTitleIds ?? []).join(', ')}]; window.open calls: ${report.windowOpenCalls}`);
    console.log(`${NAME}: top-level contexts: ${JSON.stringify(report.contexts ?? [])}; ${SHELL_READY_SENTINEL} lines: ${report.shellReadyLines}`);
    for (const note of report.notes ?? []) {
        console.log(`${NAME}: ${note}`);
    }
}

async function main() {
    const derived = derive();
    if (derived.failures.length) {
        for (const message of derived.failures) {
            console.error(`${NAME}: FAIL -- ${message}`);
        }
        return 1;
    }
    console.log(`${NAME}: derived factory '${derived.factoryId}', handler '${derived.handlerClass}', request event '${derived.requestEvent}'`);
    const report = await runProtocol(derived, '');
    printReport(report);
    const failures = assertReport(derived, report);
    if (failures.length) {
        for (const message of failures) {
            console.error(`${NAME}: FAIL -- ${message}`);
        }
        console.error(`${NAME}: FAIL -- ${failures.length} assertion(s) failed`);
        return 1;
    }
    console.log(`${NAME}: PASS -- the served page opened as a main-area web tab rendered by an overlay context, with zero window.open calls`);
    return 0;
}

/**
 * Fault plants. The clean control runs FIRST: a plant harness whose clean
 * pass is already red proves nothing about the plants that follow. Each
 * plant runs in its OWN browser session so no plant inherits another's
 * damage.
 */
async function selfTest() {
    const derived = derive();
    if (derived.failures.length) {
        for (const message of derived.failures) {
            console.error(`${NAME} --self-test: FAIL -- derivation is broken before any plant: ${message}`);
        }
        return 1;
    }

    const cases = [
        { name: 'clean control (no plant)', plant: '', expectClean: true },
        // The frontend never reaches chrome: no overlay is ever created, so
        // the served URL appears in no context.
        { name: 'requests swallowed before the actor child', plant: 'swallow', expect: 'context' },
        // The handler regresses to the GUI-01 popup path.
        { name: 'handler falls back to a popup', plant: 'popup', expect: 'window.open' },
    ];

    let failed = 0;
    for (const testCase of cases) {
        const report = await runProtocol(derived, testCase.plant);
        const failures = assertReport(derived, report);
        if (report.driveError) {
            console.error(`${NAME} --self-test: FAIL -- '${testCase.name}' could not be driven at all: ${report.driveError}`);
            failed++;
            continue;
        }
        if (testCase.expectClean) {
            if (failures.length) {
                console.error(`${NAME} --self-test: FAIL -- '${testCase.name}' is red before any fault is planted: ${failures.join(' | ')}`);
                failed++;
            } else {
                console.log(`  ok  ${testCase.name} -> green`);
            }
            continue;
        }
        if (!(report.notes ?? []).some(note => note.startsWith('PLANT'))) {
            console.error(`${NAME} --self-test: FAIL -- '${testCase.name}' never applied its fault (the plant site drifted), so a red or green here would mean nothing`);
            failed++;
            continue;
        }
        if (!failures.some(f => f.includes(testCase.expect))) {
            console.error(`${NAME} --self-test: FAIL -- '${testCase.name}' did not go red naming '${testCase.expect}'; got: ${failures.join(' | ') || '(no failures at all)'}`);
            failed++;
        } else {
            console.log(`  ok  ${testCase.name} -> red, naming '${testCase.expect}'`);
            for (const message of failures.filter(f => f.includes(testCase.expect)).slice(0, 3)) {
                console.log(`      ${message}`);
            }
        }
    }

    if (failed) {
        console.error(`${NAME} --self-test: FAIL -- ${failed} case(s) did not behave as required`);
        return 1;
    }
    console.log(`${NAME} --self-test: PASS -- the clean control is green and both planted faults went red`);
    return 0;
}

const args = process.argv.slice(2);
if (args.includes('--help')) {
    console.log(HELP.trimEnd());
    process.exit(0);
}
process.exit(args.includes('--self-test') ? await selfTest() : await main());
