#!/usr/bin/env node
/**
 * GUI-02's in-shell web tab, PROVEN BY OBSERVATION in the built shell
 * (14.1-01 tracer; 14.1-03 v2: the whole contract).
 *
 * The overlay bridge has no bare-Node observable: the placeholder is a Theia
 * widget in a live frontend, the page is a chrome-owned <xul:browser> in the
 * shell window, and the only thing that joins them is the PowerBrowserGroup
 * actor channel inside the built binary. Every static gate in the tree reads
 * text; this file drives the real product and looks at the real contexts.
 *
 * WHAT IT DRIVES -- Chris's own sequence, through the product's own paths:
 *   1. the chrome bar's New Tab command ("+");
 *   2. a typed address committed with Enter in the pill (React-compatible
 *      value write + `input` event, then a `keydown` Enter);
 *   3. a second typed address, which must navigate the SAME overlay;
 *   4. the mode walk Coding -> Browsing -> Organising -> Browsing -> Coding,
 *      derived from mode-descriptors.ts in source order, through the modes
 *      activate command (second visits included);
 *   5. the chrome-side tab store, read through the frontend's own
 *      ChromeBarSuggestionService (a reader independent of the writer);
 *   6. the tab's close glyph (`widget.close()`).
 *
 * WHAT IT ASSERTS, each a named failure: zero `window.open` calls; exactly
 * one new main-area title from the web-tab factory, focused pill, "New Tab"
 * label; the overlay is a SECOND top-level BiDi context carrying the served
 * URL whose screen rect (`mozInnerScreenX/Y`, `innerWidth/Height`, read
 * INSIDE the overlay with `evaluateIn`) equals the placeholder's screen rect
 * within 1 CSS px on all four edges; the second commit changes that same
 * context's URL (id unchanged); the pill equals chrome's canonical URL and
 * `uriOf(widget)` equals the overlay's live URL; Back is disabled after the
 * first commit and enabled after the second; the tab stays attached and in
 * the main area across every hop, realigned wherever it is current and
 * hidden (`document.hidden` in the overlay) wherever it is not; a store row
 * for the served URL is readable after navigation and gone after close; no
 * context carries a served URL after close; the main-area id set after close
 * equals the set before "+"; the shell's own POWERBROWSER_SHELL_READY line
 * is PRESENT in the launched binary's stdout (never an absence assertion).
 *
 * HEADLESS ACCOMMODATION (14.1-01 finding, carried): a headless window never
 * delivers the DOM focus event a click raises, so Lumino's FocusTracker --
 * and therefore `shell.currentWidget` and the chrome bar's current-web-tab
 * slot -- never learn that the new tab was activated. The check dispatches
 * ONE synthetic `focus` event on the placeholder node after "+", which is
 * exactly what the click delivers in a real window; it then asserts
 * `shell.currentWidget` is the web tab. Per-hop currency is read from the
 * main dock's `currentTitle` (Lumino state), as v1 did.
 *
 * WHAT IT DERIVES, never hand-keeps: factory id, empty-page URL, state event
 * name, the three class names and the DI binding line from web-tab.ts and
 * the frontend module; the New Tab command id and the pill input class from
 * chrome-bar-commands.ts; the shipped mode ids (exactly three), the activate
 * command id and the organising widget id from the modes extension. A zero
 * derivation is a named FAIL (broken instrument), never a skip.
 *
 * The served pages come from a `node:http` server this script starts on an
 * ephemeral loopback port, so no fixture host on the network is involved and
 * the URL the overlay must carry is known exactly.
 *
 * HONESTLY TIERED -- THIS CANNOT BE `--quick`. It launches the built
 * `objdir/dist/bin/powerbrowser` headless over WebDriver BiDi and needs the
 * last Theia app build (fresh profile, so chrome-side edits are live, but the
 * frontend bundle is whatever `theia build` last wrote). Register it in the
 * full set, never the commit gate. One clean run is roughly a minute;
 * `--self-test` boots seven sessions.
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
const CHROME_BAR_COMMANDS_REL = 'theia/extensions/chrome-bar/src/browser/chrome-bar-commands.ts';
const DESCRIPTORS_REL = 'theia/extensions/modes/src/browser/mode-descriptors.ts';
const MODES_COMMANDS_REL = 'theia/extensions/modes/src/browser/modes-commands.ts';
const ORGANISING_REL = 'theia/extensions/modes/src/browser/organising-widget.ts';

/** The shell's own readiness sentinel (powerbrowser.js dump channel). */
const SHELL_READY_SENTINEL = 'POWERBROWSER_SHELL_READY';

/** Alignment tolerance, CSS px, on each of sx / sy / w / h. */
const ALIGN_TOLERANCE_PX = 1;

const HELP = `Usage: node scripts/${NAME}.mjs [--self-test]

GUI-02: drives the built shell through "+", a typed address, a second typed
address, the five-hop mode walk, the tab store and close, and asserts the
in-shell web tab's overlay is aligned, persistent, navigated in place and
cleaned up -- with zero window.open calls. Needs the built browser and the
last Theia app build; not a --quick check.

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
    const emptyUrl = /EMPTY_PAGE_URL\s*=\s*'([^']+)'/.exec(webTab)?.[1];
    if (!emptyUrl) {
        failures.push(`${WEB_TAB_REL}: derived NO empty-page URL -- "+" opens it and the New Tab plant needs it`);
    }
    const stateEvent = /WEB_TAB_STATE_EVENT\s*=\s*'([^']+)'/.exec(webTab)?.[1];
    if (!stateEvent) {
        failures.push(`${WEB_TAB_REL}: derived NO state event name -- the state-ignored plant has no listener to remove`);
    }
    const requestEvent = /GROUP_REQUEST_EVENT\s*=\s*'([^']+)'/.exec(webTab)?.[1];
    if (!requestEvent) {
        failures.push(`${WEB_TAB_REL}: derived NO group request event name -- the swallow plant has nothing to drop`);
    }
    const blockingSelector = /BLOCKING_LAYER_SELECTOR\s*=\s*'([^']+)'/.exec(webTab)?.[1];
    if (!blockingSelector) {
        failures.push(`${WEB_TAB_REL}: derived NO blocking-layer selector -- a hidden overlay could not be explained by the layer that hid it`);
    }
    const handlerClass = /export class (\w+)\s+implements OpenHandler/.exec(webTab)?.[1];
    if (!handlerClass) {
        failures.push(`${WEB_TAB_REL}: derived NO open-handler class -- the protocol resolves the handler by its class name and cannot invent one`);
    }
    const widgetClass = /export class (\w+)\s+extends BaseWidget/.exec(webTab)?.[1];
    if (!widgetClass) {
        failures.push(`${WEB_TAB_REL}: derived NO widget class -- the geometry plant has no publisher to silence`);
    }
    const channelClass = /export class (\w+)\s*\{/.exec(webTab)?.[1];
    if (!channelClass) {
        failures.push(`${WEB_TAB_REL}: derived NO channel class -- the state-ignored plant has no listener to remove`);
    }
    const bound = handlerClass ? new RegExp(`toService\\(${handlerClass}\\)`).test(read(MODULE_REL)) : false;
    if (handlerClass && !bound) {
        failures.push(`${MODULE_REL}: no 'toService(${handlerClass})' binding -- the handler is not registered with OpenerService, so nothing in the product can reach it`);
    }

    const chromeBar = read(CHROME_BAR_COMMANDS_REL);
    const newTabCommandId = /CHROME_BAR_NEW_TAB_COMMAND_ID\s*=\s*'([^']+)'/.exec(chromeBar)?.[1];
    if (!newTabCommandId) {
        failures.push(`${CHROME_BAR_COMMANDS_REL}: derived NO New Tab command id -- "+" cannot be driven`);
    }
    const inputClass = /CHROME_BAR_INPUT_CLASS\s*=\s*'([^']+)'/.exec(chromeBar)?.[1];
    if (!inputClass) {
        failures.push(`${CHROME_BAR_COMMANDS_REL}: derived NO pill input class -- the typed commit has no input to type into`);
    }

    const shipped = [...read(DESCRIPTORS_REL).matchAll(/^\s*id:\s*'([^']+)'/gm)].map(m => m[1]);
    if (shipped.length !== 3) {
        failures.push(`${DESCRIPTORS_REL}: derived ${shipped.length} shipped mode ids, expected exactly three (coding, browsing, organising) -- the walk cannot be built from a set of any other size`);
    }
    const activateCommandId = /MODES_ACTIVATE_COMMAND_ID\s*=\s*'([^']+)'/.exec(read(MODES_COMMANDS_REL))?.[1];
    if (!activateCommandId) {
        failures.push(`${MODES_COMMANDS_REL}: derived NO mode activate command id -- the walk drives the product's own switch path through that command`);
    }
    const organisingWidgetId = /static readonly ID = '([^']+)'/.exec(read(ORGANISING_REL))?.[1];
    if (!organisingWidgetId) {
        failures.push(`${ORGANISING_REL}: derived NO organising widget id -- the one contracted main-area mutation on a switch cannot be excluded from the id sets`);
    }
    // Chris's sequence, from the derived source order (Coding, Browsing,
    // Organising): every mode is visited twice, so second visits are covered.
    const walk = shipped.length === 3 ? [shipped[0], shipped[1], shipped[2], shipped[1], shipped[0]] : [];

    return {
        failures, factoryId, emptyUrl, stateEvent, requestEvent, blockingSelector, handlerClass, widgetClass, channelClass,
        newTabCommandId, inputClass, shipped, activateCommandId, organisingWidgetId, walk,
    };
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
            const origin = `http://127.0.0.1:${port}`;
            resolve({
                origin,
                urls: { a: `${origin}/a`, b: `${origin}/b` },
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
 * Page-realm helpers shared by every phase, installed once by the 'setup'
 * phase on `window.__pbWebTabProbe` (the probe) so later phases -- which run
 * as separate evaluations, because the Node side must read the overlay
 * context between them -- find the widget and the counters again.
 */
const PROBE_HELPERS = `
    P.settle = () => new Promise(resolve => setTimeout(resolve, 600));
    P.until = async (predicate, timeoutMs) => {
        const deadline = Date.now() + timeoutMs;
        for (;;) {
            let value;
            try { value = await predicate(); } catch (e) { value = false; }
            if (value) return true;
            if (Date.now() >= deadline) return false;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    };
    P.mainIds = () => P.shell.mainAreaTabBars
        .flatMap(bar => Array.from(bar.titles).map(title => title.owner.id))
        .filter(id => id !== P.cfg.organisingWidgetId);
    P.currentTitleIds = () => P.shell.mainAreaTabBars
        .map(bar => bar.currentTitle && bar.currentTitle.owner.id)
        .filter(id => typeof id === 'string');
    P.input = () => document.querySelector('.' + P.cfg.inputClass);
    P.backDisabled = () => {
        const button = document.querySelector('.pb-chrome-bar-button[aria-label="Back"]');
        return button ? button.disabled : undefined;
    };
    P.placeholderRect = () => {
        const r = P.widget.node.getBoundingClientRect();
        return { sx: window.mozInnerScreenX + r.left, sy: window.mozInnerScreenY + r.top, w: r.width, h: r.height };
    };
    P.uriOf = () => {
        const uri = P.registry.uriOf(P.widget);
        return uri ? uri.toString(true) : undefined;
    };
    P.lastSentVisible = () => {
        try { return JSON.parse(P.widget.lastSent).visible; } catch (e) { return undefined; }
    };
    // The widget's own visibility term, taken apart, so a hidden overlay is
    // explained by the factor that hid it (diagnostic record, not an assertion).
    P.visibility = () => ({
        attached: P.widget.isAttached,
        visible: P.widget.isVisible,
        hasPage: P.widget.hasPage,
        blocking: Array.from(document.querySelectorAll(P.cfg.blockingSelector))
            .filter(el => el.getClientRects().length > 0)
            .map(el => el.className || el.tagName),
    });
    // The React-compatible typed commit: the native value setter (so React's
    // tracker sees a change), an input event (onChange), then Enter (onKeyDown).
    P.commit = text => {
        const input = P.input();
        if (!input) throw new Error('no pill input to type into');
        input.focus();
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, text);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    };
`;

/**
 * One phase of the protocol as a page-realm expression. `plant` is '' for
 * the real check; the self-test passes one of six fault names, each applied
 * in the 'setup' phase through the SAME code path the real run takes, so a
 * plant can only go red by the assertions actually working.
 */
function phaseExpression(cfg, phase, arg) {
    const body = {
        setup: `
        // FIRST, before anything else: count every window.open. A "+" or a
        // commit that falls back to the GUI-01 popup path is caught by count.
        window.__pbWebTabProbe = P;
        P.cfg = cfg;
        P.windowOpenCalls = 0;
        const realOpen = window.open;
        window.open = function (...args) {
            P.windowOpenCalls += 1;
            return realOpen.apply(window, args);
        };
        // Diagnostic record only, never an assertion: every state push chrome
        // delivers, as the raw event detail, so a red above can be read
        // against what chrome actually said.
        P.pushes = [];
        window.addEventListener(cfg.stateEvent, event => {
            try { P.pushes.push(JSON.stringify(event.detail)); } catch (e) { P.pushes.push('(unserialisable)'); }
        });
        ${PROBE_HELPERS}
        const container = window.theia.container;
        P.shell = __getByName(container, 'ApplicationShell');
        P.widgets = __getByName(container, 'WidgetManager');
        P.commands = __getByName(container, 'CommandRegistry');
        P.registry = __getByName(container, 'TabUriRegistry');
        P.channel = __getByName(container, cfg.channelClass);
        const handler = __getByName(container, cfg.handlerClass);
        const suggestions = __getByName(container, 'ChromeBarSuggestionService');
        // The store reader the check polls. Wrapped here so the store-unread
        // plant can replace the reader through one seam.
        P.search = (prefix, limit) => suggestions.searchByPrefix(prefix, limit);

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
        } else if (cfg.plant === 'no-geometry') {
            const proto = Object.getPrototypeOf(__getByName(container, cfg.widgetClass));
            if (typeof proto.publish !== 'function') {
                fail('plant no-geometry could not be applied: ' + cfg.widgetClass + '.prototype.publish is not a function');
            } else {
                proto.publish = function () {};
                report.notes.push('PLANT no-geometry: ' + cfg.widgetClass + '.prototype.publish is a no-op, so chrome never receives a rect');
            }
        } else if (cfg.plant === 'state-ignored') {
            if (typeof P.channel.onState !== 'function') {
                fail('plant state-ignored could not be applied: ' + cfg.channelClass + '.onState is not a function');
            } else {
                window.removeEventListener(cfg.stateEvent, P.channel.onState);
                report.notes.push('PLANT state-ignored: the ' + cfg.stateEvent + ' listener was removed, so chrome pushes never reach the widget');
            }
        } else if (cfg.plant === 'store-unread') {
            P.search = async () => [];
            report.notes.push('PLANT store-unread: the store reader returns no rows');
        } else if (cfg.plant === 'newtab-popup') {
            const handlers = P.commands._handlers && P.commands._handlers[cfg.newTabCommandId];
            if (!handlers || !handlers.length) {
                fail('plant newtab-popup could not be applied: no handler registered for ' + cfg.newTabCommandId);
            } else {
                handlers.splice(0, handlers.length, { execute: () => { window.open(cfg.emptyUrl, '_blank'); } });
                report.notes.push('PLANT newtab-popup: ' + cfg.newTabCommandId + ' rerouted to window.open');
            }
        }

        report.mainIdsBefore = P.mainIds();
        P.mainIdsBefore = report.mainIdsBefore;

        // --- NEW TAB ("+") ---------------------------------------------------
        report.steps.push('new tab');
        await P.commands.executeCommand(cfg.newTabCommandId);
        await P.settle();
        const after = P.mainIds();
        const added = after.filter(id => !report.mainIdsBefore.includes(id));
        report.addedIds = added;
        if (added.length !== 1) {
            fail('"+" added ' + added.length + ' main-area title(s) [' + added.join(', ') + '], expected exactly one');
        }
        const owners = P.shell.mainAreaTabBars
            .flatMap(bar => Array.from(bar.titles).map(title => title.owner))
            .filter(owner => added.includes(owner.id));
        P.widget = owners[0];
        if (!P.widget) {
            // Thrown, not returned: the phase must still hand back its report
            // (window.open count included) for the assertions to read.
            throw new Error('"+" produced no web-tab widget in the main area');
        }
        report.widgetId = P.widget.id;
        report.widgetFactoryId = (P.widgets.getDescription(P.widget) || {}).factoryId;
        report.newTabLabel = P.widget.title.label;
        report.pillFocused = document.activeElement === P.input();
        report.pillValueAfterNewTab = P.input() ? P.input().value : undefined;
        report.currentAfterNewTab = P.currentTitleIds().includes(P.widget.id);

        // The headless accommodation (file header): the focus event a click
        // delivers in a real window, so the FocusTracker -- and the chrome
        // bar's current-web-tab slot -- learn the tab was activated.
        P.widget.node.dispatchEvent(new FocusEvent('focus'));
        await P.settle();
        report.notes.push('headless: one synthetic focus event dispatched on the placeholder node after "+"');
        report.isShellCurrentWidget = P.shell.currentWidget === P.widget;

        // --- TYPED COMMIT A ---------------------------------------------------
        report.steps.push('commit ' + cfg.typedA);
        P.commit(cfg.typedA);
        await P.until(() => P.widget.hasPage && P.input() && P.input().value === cfg.servedA, 8000);
        await P.settle();
        report.afterA = {
            widgetUrl: P.widget.url,
            hasPage: P.widget.hasPage,
            lostView: P.widget.lostView,
            placeholderRect: P.placeholderRect(),
            uriOf: P.uriOf(),
            pill: P.input() ? P.input().value : undefined,
            backDisabled: P.backDisabled(),
            mainIds: P.mainIds(),
        };`,

        commitB: `
        report.steps.push('commit ' + cfg.servedB);
        P.commit(cfg.servedB);
        await P.until(() => P.input() && P.input().value === cfg.servedB && P.widget.canGoBack, 8000);
        await P.settle();
        report.afterB = {
            widgetUrl: P.widget.url,
            placeholderRect: P.placeholderRect(),
            uriOf: P.uriOf(),
            pill: P.input() ? P.input().value : undefined,
            backDisabled: P.backDisabled(),
            canGoBack: P.widget.canGoBack,
            canGoForward: P.widget.canGoForward,
            mainIds: P.mainIds(),
            pushes: P.pushes.slice(),
            visibility: P.visibility(),
            lastSent: P.widget.lastSent,
        };`,

        hop: `
        const hop = ${JSON.stringify(arg)};
        report.steps.push('activate ' + hop);
        await P.commands.executeCommand(cfg.activateCommandId, hop);
        await P.settle();
        report.hop = {
            hop,
            attached: P.widget.isAttached,
            inMain: P.mainIds().includes(P.widget.id),
            isCurrent: P.currentTitleIds().includes(P.widget.id),
            currentTitleIds: P.currentTitleIds(),
            placeholderRect: P.placeholderRect(),
            lastSentVisible: P.lastSentVisible(),
            lastSent: P.widget.lastSent,
            visibility: P.visibility(),
        };`,

        store: `
        report.steps.push('store rows for ' + cfg.servedOrigin);
        let rows = [];
        await P.until(async () => {
            rows = await P.search(cfg.servedOrigin, 8);
            return rows.some(row => row.url === cfg.servedB);
        }, 5000);
        report.rowsAfterNavigation = rows.map(row => ({ url: row.url, title: row.title }));`,

        close: `
        report.steps.push('close');
        P.widget.close();
        await P.settle();
        let rows = [];
        await P.until(async () => {
            rows = await P.search(cfg.servedOrigin, 8);
            return !rows.some(row => row.url === cfg.servedA || row.url === cfg.servedB);
        }, 5000);
        report.rowsAfterClose = rows.map(row => ({ url: row.url, title: row.title }));
        report.mainIdsAfterClose = P.mainIds();
        report.widgetDisposed = P.widget.isDisposed;
        report.windowOpenCalls = P.windowOpenCalls;`,
    }[phase];

    return `(async () => { ${GET_BY_NAME}
    const cfg = ${JSON.stringify(cfg)};
    const report = { phase: ${JSON.stringify(phase)}, failures: [], notes: [], steps: [] };
    const fail = message => report.failures.push(message);
    const P = ${phase === 'setup' ? '{}' : 'window.__pbWebTabProbe'};
    try {
        if (!P) throw new Error('the probe from the setup phase is gone');
        ${body}
    } catch (e) {
        fail('the ' + report.phase + ' phase threw at step [' + report.steps.join(' -> ') + ']: ' + String(e));
    }
    report.windowOpenCalls = P && P.windowOpenCalls;
    return JSON.stringify(report);
})()`;
}

/** Read inside the overlay: its screen rect and hidden state, as JSON. */
const OVERLAY_RECT_EXPR = 'JSON.stringify({ sx: window.mozInnerScreenX, sy: window.mozInnerScreenY, w: window.innerWidth, h: window.innerHeight, hidden: document.hidden })';

/** Poll the live context tree until `predicate(contexts)` holds, or the deadline passes. */
async function awaitContexts(topLevelContexts, predicate, timeoutMs = 10000) {
    const deadline = Date.now() + timeoutMs;
    let seen = [];
    for (;;) {
        seen = await topLevelContexts();
        if (predicate(seen)) {
            break;
        }
        if (Date.now() >= deadline) {
            break;
        }
        await new Promise(r => setTimeout(r, 250));
    }
    return seen;
}

function delta(a, b) {
    return Math.max(...['sx', 'sy', 'w', 'h'].map(key => Math.abs(Number(a[key]) - Number(b[key]))));
}

function rectString(r) {
    return r ? `(sx ${Number(r.sx).toFixed(1)}, sy ${Number(r.sy).toFixed(1)}, w ${Number(r.w).toFixed(1)}, h ${Number(r.h).toFixed(1)})` : '(none)';
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
    const cfg = {
        plant,
        handlerClass: derived.handlerClass,
        widgetClass: derived.widgetClass,
        channelClass: derived.channelClass,
        requestEvent: derived.requestEvent,
        stateEvent: derived.stateEvent,
        blockingSelector: derived.blockingSelector,
        emptyUrl: derived.emptyUrl,
        newTabCommandId: derived.newTabCommandId,
        inputClass: derived.inputClass,
        activateCommandId: derived.activateCommandId,
        organisingWidgetId: derived.organisingWidgetId,
        // Typed with an upper-case scheme: chrome canonicalises it, and the
        // pill must show the CANONICAL URL from the state push, not the typed
        // text -- which is what makes the pill assertion depend on the push.
        typedA: pages.urls.a.replace(/^http:/, 'HTTP:'),
        servedA: pages.urls.a,
        servedB: pages.urls.b,
        servedOrigin: pages.origin,
    };
    try {
        // Empty URL: the shell's own supervised frontend is the app under
        // test, and a URL on the command line would open a stock window
        // beside it (WINDOWS 14).
        return await withFirefoxPage('', async ({ evaluate, evaluateIn, send, waitFor, topLevelContexts }) => {
            await waitFor('window.theia && window.theia.container ? true : false', { timeoutMs: 60000 });
            await waitFor('!!document.querySelector("#theia-app-shell")', { timeoutMs: 60000 });
            await waitFor(`(() => { try { ${GET_BY_NAME}
                return __getByName(window.theia.container, 'FrontendApplicationStateService').state === 'ready';
            } catch (e) { return false; } })()`, { timeoutMs: 60000 });

            const report = { failures: [], notes: [], steps: [], alignments: [], hops: [], servedA: cfg.servedA, servedB: cfg.servedB };
            const phase = async (name, arg) => {
                const part = JSON.parse(await evaluate(phaseExpression(cfg, name, arg)));
                report.failures.push(...part.failures);
                report.notes.push(...part.notes);
                report.steps.push(...part.steps);
                return part;
            };
            const overlayRect = async context => JSON.parse(await evaluateIn(context, OVERLAY_RECT_EXPR));
            const align = async (label, context, placeholderRect) => {
                const overlay = await overlayRect(context);
                const d = delta(overlay, placeholderRect);
                report.alignments.push({ label, delta: d, overlay, placeholderRect });
                if (!(d <= ALIGN_TOLERANCE_PX)) {
                    report.failures.push(`${label}: the overlay rect ${rectString(overlay)} is not aligned with the placeholder rect ${rectString(placeholderRect)} (max delta ${d.toFixed(2)} CSS px, tolerance ${ALIGN_TOLERANCE_PX})`);
                }
                return overlay;
            };

            const setup = await phase('setup');
            Object.assign(report, {
                mainIdsBefore: setup.mainIdsBefore, addedIds: setup.addedIds, widgetId: setup.widgetId,
                widgetFactoryId: setup.widgetFactoryId, newTabLabel: setup.newTabLabel, pillFocused: setup.pillFocused,
                pillValueAfterNewTab: setup.pillValueAfterNewTab, currentAfterNewTab: setup.currentAfterNewTab,
                isShellCurrentWidget: setup.isShellCurrentWidget, afterA: setup.afterA, windowOpenCalls: setup.windowOpenCalls,
            });

            if (setup.widgetId && setup.afterA) {
                // The overlay: exactly one context carrying servedA.
                let contexts = await awaitContexts(topLevelContexts, seen => seen.some(c => c.url === cfg.servedA));
                report.contextsAfterA = contexts.map(c => c.url);
                const carrying = contexts.filter(c => c.url === cfg.servedA);
                let overlay;
                if (carrying.length !== 1) {
                    report.failures.push(`expected exactly one top-level browsing context carrying ${cfg.servedA} (the overlay), saw ${carrying.length} in ${JSON.stringify(report.contextsAfterA)}`);
                } else {
                    overlay = carrying[0].context;
                    report.overlayContext = overlay;
                    report.overlayUrlAfterA = carrying[0].url;
                    await align('after the first commit', overlay, setup.afterA.placeholderRect);
                    // One TRUSTED click inside the first page. Session history
                    // only offers Back to an earlier entry the user interacted
                    // with (nsSHistory::CanGoBackFromEntryAtIndex under the
                    // default browser.navigation.requireUserInteraction), so
                    // a page nobody touched would leave Back disabled after the
                    // second commit on a correct product. This is what Chris's
                    // hand on the page does; a script-dispatched event is not it.
                    try {
                        await send('input.performActions', {
                            context: overlay,
                            actions: [{
                                type: 'pointer', id: 'pb-mouse', parameters: { pointerType: 'mouse' },
                                actions: [
                                    { type: 'pointerMove', x: 20, y: 20 },
                                    { type: 'pointerDown', button: 0 },
                                    { type: 'pointerUp', button: 0 },
                                ],
                            }],
                        });
                        await send('input.releaseActions', { context: overlay });
                        report.notes.push('one trusted pointer click delivered inside the first page before the second commit (session-history user interaction)');
                    } catch (error) {
                        // An overlay with no viewport (geometry never applied)
                        // cannot take a click; the alignment read above has
                        // already named that, so this only records why Back
                        // will stay disabled.
                        report.notes.push(`the click inside the first page could not be delivered: ${error.message}`);
                    }
                }

                // The second commit navigates the SAME context in place.
                const b = await phase('commitB');
                report.afterB = b.afterB;
                if (overlay) {
                    contexts = await awaitContexts(topLevelContexts, seen => seen.some(c => c.context === overlay && c.url === cfg.servedB));
                    const same = contexts.find(c => c.context === overlay);
                    report.overlayUrlAfterB = same ? same.url : undefined;
                    report.contextsAfterB = contexts.map(c => c.url);
                    if (!same || same.url !== cfg.servedB) {
                        report.failures.push(`the second commit did not navigate the same overlay context in place: context ${overlay} now carries ${JSON.stringify(same ? same.url : '(gone)')}, expected ${cfg.servedB}; contexts: ${JSON.stringify(report.contextsAfterB)}`);
                    }
                    if (b.afterB) {
                        await align('after the second commit', overlay, b.afterB.placeholderRect);
                    }
                }

                // The mode walk: every hop a second visit somewhere.
                for (const id of derived.walk) {
                    const h = (await phase('hop', id)).hop;
                    if (!h) {
                        report.failures.push(`the hop into '${id}' produced no record`);
                        continue;
                    }
                    report.hops.push(h);
                    if (!overlay) {
                        continue;
                    }
                    if (h.isCurrent) {
                        await align(`after the hop into '${id}'`, overlay, h.placeholderRect);
                    } else {
                        const o = await overlayRect(overlay);
                        h.overlayHidden = o.hidden;
                        if (o.hidden !== true) {
                            // Assumption A4 fallback -- stated, never silent.
                            if (h.lastSentVisible === false) {
                                report.notes.push(`FALLBACK after the hop into '${id}': document.hidden read ${JSON.stringify(o.hidden)} in the overlay while the tab was not current; the frontend's last published visible=false is the observable used instead`);
                            } else {
                                report.failures.push(`after the hop into '${id}' the web tab is not current (current: [${h.currentTitleIds.join(', ')}]) but the overlay is not hidden: document.hidden=${JSON.stringify(o.hidden)}, last published visible=${JSON.stringify(h.lastSentVisible)}`);
                            }
                        }
                    }
                }

                const store = await phase('store');
                report.rowsAfterNavigation = store.rowsAfterNavigation;
                const closed = await phase('close');
                Object.assign(report, {
                    rowsAfterClose: closed.rowsAfterClose, mainIdsAfterClose: closed.mainIdsAfterClose,
                    widgetDisposed: closed.widgetDisposed, windowOpenCalls: closed.windowOpenCalls,
                });
                contexts = await awaitContexts(topLevelContexts, seen => !seen.some(c => c.url === cfg.servedA || c.url === cfg.servedB));
                report.contextsAfterClose = contexts.map(c => c.url);
            }

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
        failures.push(`window.open was called ${report.windowOpenCalls} time(s) -- "+" or a commit fell back to the popup path instead of an in-shell web tab`);
    }
    if (!report.widgetId) {
        failures.push('"+" produced no web-tab widget in the main area, so nothing below it could be exercised');
        if (!(report.shellReadyLines > 0)) {
            failures.push(`the launched binary's stdout carried no ${SHELL_READY_SENTINEL} line -- this session never reached a real shell`);
        }
        return failures;
    }
    if (report.widgetFactoryId !== derived.factoryId) {
        failures.push(`the tab "+" added was created by factory '${report.widgetFactoryId}', not the web-tab factory '${derived.factoryId}'`);
    }
    if (report.newTabLabel !== 'New Tab') {
        failures.push(`the new tab's label is ${JSON.stringify(report.newTabLabel)}, expected "New Tab"`);
    }
    if (report.pillFocused !== true) {
        failures.push('the address pill does not have focus after "+"');
    }
    if (report.pillValueAfterNewTab !== '') {
        failures.push(`the address pill reads ${JSON.stringify(report.pillValueAfterNewTab)} after "+", expected empty`);
    }
    if (report.currentAfterNewTab !== true) {
        failures.push(`the new tab '${report.widgetId}' is not the current title of its dock after "+" -- the tab was added without being activated`);
    }
    if (report.isShellCurrentWidget !== true) {
        failures.push(`shell.currentWidget is not the new web tab after activation`);
    }
    const a = report.afterA ?? {};
    if (a.pill !== report.servedA) {
        failures.push(`after the first commit the pill reads ${JSON.stringify(a.pill)}, expected the canonical URL ${report.servedA} from chrome's state push`);
    }
    if (report.overlayUrlAfterA && a.uriOf !== report.overlayUrlAfterA) {
        failures.push(`after the first commit uriOf(widget) is ${JSON.stringify(a.uriOf)} but the overlay's live URL is ${report.overlayUrlAfterA}`);
    }
    if (a.backDisabled !== true) {
        failures.push(`Back is ${a.backDisabled === false ? 'enabled' : 'unreadable'} after the first commit, expected disabled (no history behind)`);
    }
    const b = report.afterB ?? {};
    if (b.pill !== report.servedB) {
        failures.push(`after the second commit the pill reads ${JSON.stringify(b.pill)}, expected ${report.servedB}`);
    }
    if (report.overlayUrlAfterB && b.uriOf !== report.overlayUrlAfterB) {
        failures.push(`after the second commit uriOf(widget) is ${JSON.stringify(b.uriOf)} but the overlay's live URL is ${report.overlayUrlAfterB}`);
    }
    if (b.backDisabled !== false) {
        failures.push(`Back is ${b.backDisabled === true ? 'disabled' : 'unreadable'} after the second commit, expected enabled (one entry behind)`);
    }
    const hops = report.hops ?? [];
    if (hops.length !== derived.walk.length) {
        failures.push(`walked ${hops.length} hop(s), expected ${derived.walk.length}: ${derived.walk.join(' -> ')}`);
    }
    for (const h of hops) {
        if (!h.attached) {
            failures.push(`the web tab is no longer attached after the hop into '${h.hop}'`);
        }
        if (!h.inMain) {
            failures.push(`the web tab is not in the main area after the hop into '${h.hop}'`);
        }
    }
    const walkAlignments = (report.alignments ?? []).filter(x => x.label.startsWith('after the hop'));
    if (hops.length && walkAlignments.length === 0) {
        failures.push('the web tab was current after none of the hops, so the walk asserted no realignment at all (broken instrument, never a clean pass)');
    }
    const organisingHops = hops.filter(h => h.hop === derived.shipped[2]);
    if (organisingHops.some(h => h.isCurrent)) {
        failures.push(`the web tab stayed the current title while '${derived.shipped[2]}' was active -- the organising slot did not take the main area`);
    }
    if (!(report.rowsAfterNavigation ?? []).some(row => row.url === report.servedB)) {
        failures.push(`no store row for ${report.servedB} was readable through ChromeBarSuggestionService.searchByPrefix after the navigation (rows: ${JSON.stringify(report.rowsAfterNavigation ?? [])})`);
    }
    if ((report.rowsAfterClose ?? []).some(row => row.url === report.servedA || row.url === report.servedB)) {
        failures.push(`a store row for a served URL is still readable after the tab was closed (rows: ${JSON.stringify(report.rowsAfterClose)})`);
    }
    const leftover = (report.contextsAfterClose ?? []).filter(url => url === report.servedA || url === report.servedB);
    if (leftover.length) {
        failures.push(`a top-level browsing context still carries a served URL after close: ${JSON.stringify(report.contextsAfterClose)} -- the overlay context was not removed`);
    }
    const before = [...(report.mainIdsBefore ?? [])].sort();
    const after = [...(report.mainIdsAfterClose ?? [])].sort();
    if (JSON.stringify(before) !== JSON.stringify(after)) {
        failures.push(`the main-area id set after close [${after.join(', ')}] differs from the set before "+" [${before.join(', ')}] -- residue`);
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
    console.log(`${NAME}: served ${report.servedA} and ${report.servedB}; "+" added [${(report.addedIds ?? []).join(', ')}] from factory '${report.widgetFactoryId}' labelled ${JSON.stringify(report.newTabLabel)}; pill focused: ${report.pillFocused}; shell.currentWidget is the tab: ${report.isShellCurrentWidget}`);
    const a = report.afterA ?? {};
    const b = report.afterB ?? {};
    console.log(`${NAME}: after A: pill ${JSON.stringify(a.pill)}, uriOf ${JSON.stringify(a.uriOf)}, overlay ${JSON.stringify(report.overlayUrlAfterA)}, Back disabled ${a.backDisabled}; after B: pill ${JSON.stringify(b.pill)}, uriOf ${JSON.stringify(b.uriOf)}, overlay ${JSON.stringify(report.overlayUrlAfterB)} (context ${report.overlayContext}), Back disabled ${b.backDisabled}`);
    for (const x of report.alignments ?? []) {
        console.log(`${NAME}: ${x.label}: overlay ${rectString(x.overlay)} vs placeholder ${rectString(x.placeholderRect)} -> delta ${x.delta.toFixed(2)} px`);
    }
    for (const h of report.hops ?? []) {
        console.log(`${NAME}: hop '${h.hop}': attached ${h.attached}, in main ${h.inMain}, current ${h.isCurrent}${h.isCurrent ? '' : `, overlay hidden ${h.overlayHidden}`}; last published ${h.lastSent}; visibility ${JSON.stringify(h.visibility)}`);
    }
    if (b.pushes) {
        console.log(`${NAME}: state pushes received (${b.pushes.length}); last: ${b.pushes.slice(-3).join(' | ')}`);
        console.log(`${NAME}: after B: last published ${b.lastSent}; visibility ${JSON.stringify(b.visibility)}`);
    }
    console.log(`${NAME}: rows after navigation: ${JSON.stringify((report.rowsAfterNavigation ?? []).map(r => r.url))}; rows after close: ${JSON.stringify((report.rowsAfterClose ?? []).map(r => r.url))}`);
    console.log(`${NAME}: contexts after close: ${JSON.stringify(report.contextsAfterClose ?? [])}; main-area ids before/after: [${(report.mainIdsBefore ?? []).join(', ')}] / [${(report.mainIdsAfterClose ?? []).join(', ')}]; window.open calls: ${report.windowOpenCalls}; ${SHELL_READY_SENTINEL} lines: ${report.shellReadyLines}`);
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
    console.log(`${NAME}: derived factory '${derived.factoryId}', handler '${derived.handlerClass}', new-tab command '${derived.newTabCommandId}', walk ${derived.walk.join(' -> ')}`);
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
    const maxDelta = Math.max(0, ...(report.alignments ?? []).map(x => x.delta));
    console.log(`${NAME}: PASS -- "+" opened an in-shell web tab, two typed commits navigated one overlay context, ${report.hops.length} mode hops walked with the tab attached (${report.alignments.length} alignment reads, max delta ${maxDelta.toFixed(2)} CSS px), store row present then absent, overlay removed on close, zero window.open calls`);
    return 0;
}

/**
 * Fault plants. The clean control runs FIRST: a plant harness whose clean
 * pass is already red proves nothing about the plants that follow. Each
 * plant runs in its OWN browser session so no plant inherits another's
 * damage, and each must report that it was applied.
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
        // The open handler regresses to the GUI-01 popup path.
        { name: 'handler falls back to a popup', plant: 'popup', expect: 'window.open' },
        // Geometry is never published, so the overlay never reaches the placeholder.
        { name: 'geometry never published', plant: 'no-geometry', expect: 'rect' },
        // Chrome's pushes never reach the widget, so the pill keeps the typed text.
        { name: 'state pushes ignored', plant: 'state-ignored', expect: 'pill' },
        // The store reader returns nothing.
        { name: 'store rows unread', plant: 'store-unread', expect: 'row' },
        // "+" itself regresses to a popup.
        { name: 'New Tab rerouted to a popup', plant: 'newtab-popup', expect: 'window.open' },
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
            for (const message of failures.filter(f => f.includes(testCase.expect)).slice(0, 2)) {
                console.log(`      ${message}`);
            }
        }
    }

    if (failed) {
        console.error(`${NAME} --self-test: FAIL -- ${failed} case(s) did not behave as required`);
        return 1;
    }
    console.log(`${NAME} --self-test: PASS -- the clean control is green and all six planted faults went red`);
    return 0;
}

const args = process.argv.slice(2);
if (args.includes('--help')) {
    console.log(HELP.trimEnd());
    process.exit(0);
}
process.exit(args.includes('--self-test') ? await selfTest() : await main());
