#!/usr/bin/env node
// scripts/verify-branding.mjs
//
// Headless proof that `@powerbrowser/branding` is loaded by the running app:
// document title, favicon link, the `theia.frontend.config` custom-key path
// (D-62), the PowerBrowser welcome widget (D-33), and the PowerBrowser About
// dialog (D-35) -- all read live in the page over WebDriver BiDi, not by
// reading source or package.json on disk (D-64's vacuous-pass caveat). No
// npm test dependency is added to the `theia` workspace (D-69).
//
// -- Reflection note (same root cause as verify-uri-roundtrip.mjs's, and
// D-64's Symbol.for requirement) --
// `script.evaluate` runs as a bare expression string in the page's own
// realm: there is no module resolution for a bare specifier and Theia's DI
// identifiers (a bare `Symbol('X')`, a class reference) are not reachable
// by reference from this external context. `__getByName` walks Inversify's
// *internal* `container._bindingDictionary` and matches each bound
// identifier's `.toString()`/`.name` against the service's well-known name.
// Pinned against inversify 6.2.2 (theia/node_modules/inversify); a future
// inversify bump renaming `_bindingDictionary` breaks this file first, not
// the feature it tests.
//
// There is no selector-waiting primitive in the shared driver: each "wait
// for the widget/dialog node" step is a poll loop built on the driver's
// existing `waitFor` (the same one the favicon assertion already uses),
// not a second waiting mechanism.
//
// `FrontendApplicationConfigProvider` stores the merged config on
// `window[Symbol('FrontendApplicationConfigProvider')]` -- a bare Symbol, so
// there is no fixed key to read from an external evaluation context. It is
// found instead via `Object.getOwnPropertySymbols(window)`.
//
// Usage: node scripts/verify-branding.mjs [url]   (default http://localhost:3000)
//
// Later plans extend this same file rather than adding sibling scripts.

import { withFirefoxPage } from './lib/firefox-bidi.mjs';

const url = process.argv[2] || 'http://localhost:3000';

const FIND_FRONTEND_CONFIG =
    "Object.getOwnPropertySymbols(window).map(s => window[s])" +
    ".find(v => v && typeof v === 'object' && Object.prototype.hasOwnProperty.call(v, 'applicationName'))";

const PRELUDE = `
function __getByName(container, name) {
    let found;
    container._bindingDictionary.traverse((key) => {
        if (found) return;
        const keyStr = typeof key === 'symbol' ? key.toString() : (key && key.name) || String(key);
        if (keyStr === 'Symbol(' + name + ')' || keyStr === name) found = key;
    });
    if (!found) throw new Error('DI binding not found for identifier name: ' + name);
    return container.get(found);
}
`;

const NO_STOCK_IDENTITY = /Theia|Eclipse/i;

// -- BRAND-05 surface: the PowerBrowser welcome widget (D-33) --
// Not toggled through the command (AbstractViewContribution.toggleView()
// closes an already-open main-area widget instead of re-opening it, and a
// fresh headless profile already has the widget open via
// `initializeLayout()`) -- resolved directly and opened non-destructively.
async function checkWelcome({ evaluate, waitFor }) {
    await evaluate(`(async function() {
        ${PRELUDE}
        const contribution = __getByName(window.theia.container, 'PowerBrowserWelcomeViewContribution');
        await contribution.openView({ reveal: true, activate: true });
        return true;
    })()`);

    const text = await waitFor(`(function() {
        ${PRELUDE}
        try {
            const widgetManager = __getByName(window.theia.container, 'WidgetManager');
            const widgets = widgetManager.getWidgets('welcome');
            return widgets.length === 1 ? widgets[0].node.textContent : false;
        } catch (e) {
            return false;
        }
    })()`);

    if (!text.includes('PowerBrowser')) {
        throw new Error(`welcome widget textContent missing "PowerBrowser": ${JSON.stringify(text)}`);
    }
    if (NO_STOCK_IDENTITY.test(text)) {
        throw new Error(`welcome widget textContent matched /Theia|Eclipse/i: ${JSON.stringify(text)}`);
    }

    const version = await evaluate(`(async function() {
        ${PRELUDE}
        const appServer = __getByName(window.theia.container, 'ApplicationServer');
        const info = await appServer.getApplicationInfo();
        return info ? info.version : null;
    })()`);
    if (!version || !text.includes(version)) {
        throw new Error(`welcome widget textContent missing version ${JSON.stringify(version)}: ${JSON.stringify(text)}`);
    }

    return { text, version };
}

// -- BRAND-05 surface: the PowerBrowser About dialog (D-35) --
async function checkAbout({ evaluate, waitFor }) {
    await evaluate(`(async function() {
        ${PRELUDE}
        const commandRegistry = __getByName(window.theia.container, 'CommandRegistry');
        await commandRegistry.executeCommand('core.about');
        return true;
    })()`);

    const text = await waitFor(
        "document.querySelector('.theia-aboutDialog')?.textContent || false"
    );

    if (NO_STOCK_IDENTITY.test(text)) {
        throw new Error(`about dialog textContent matched /Theia|Eclipse/i: ${JSON.stringify(text)}`);
    }
    if (/@theia\//.test(text)) {
        throw new Error(`about dialog textContent matched /@theia\\//: ${JSON.stringify(text)}`);
    }

    const hasEclipseTheiaLink = await evaluate(`(function() {
        const node = document.querySelector('.theia-aboutDialog');
        const anchors = node ? Array.from(node.querySelectorAll('a')) : [];
        return anchors.some(a => (a.getAttribute('href') || '').includes('eclipse-theia'));
    })()`);
    if (hasEclipseTheiaLink) {
        throw new Error('about dialog contains an anchor linking eclipse-theia');
    }

    // Close so the app is left in a usable state for any later check in
    // this same driver session.
    await evaluate(`(function() {
        ${PRELUDE}
        const dialog = __getByName(window.theia.container, 'AboutDialog');
        if (dialog && dialog.close) dialog.close();
        return true;
    })()`);

    return { text };
}

async function main() {
    const surfacesRun = [];

    const result = await withFirefoxPage(url, async ({ evaluate, waitFor }) => {
        await waitFor('window.theia && window.theia.container ? true : false');

        const title = await evaluate('document.title');
        if (title !== 'PowerBrowser') {
            throw new Error(`document.title was ${JSON.stringify(title)}, expected "PowerBrowser"`);
        }
        surfacesRun.push('title');

        // `window.theia.container` is assigned before `application.start()`
        // runs the `onStart` contributions (src-gen/frontend/index.js), so
        // the favicon link -- appended from `onStart` -- needs its own poll,
        // not just the container's.
        const iconHref = await waitFor(
            'document.querySelector(\'link[rel="icon"]\')?.getAttribute("href") || false'
        );
        if (typeof iconHref !== 'string' || !iconHref.startsWith('data:image/svg+xml')) {
            throw new Error(`favicon href was ${JSON.stringify(iconHref)}, expected a data:image/svg+xml URI`);
        }
        surfacesRun.push('favicon');

        const powerbrowserPrivilegedJs = await evaluate(`(${FIND_FRONTEND_CONFIG})?.powerbrowserPrivilegedJs`);
        if (powerbrowserPrivilegedJs !== false) {
            throw new Error(`powerbrowserPrivilegedJs was ${JSON.stringify(powerbrowserPrivilegedJs)}, expected boolean false`);
        }

        const welcome = await checkWelcome({ evaluate, waitFor });
        surfacesRun.push('welcome');

        const about = await checkAbout({ evaluate, waitFor });
        surfacesRun.push('about');

        return { title, iconHref, powerbrowserPrivilegedJs, welcome, about };
    });

    // Coverage guard: a surface that silently never ran (widget/dialog
    // never found, an internal catch that swallowed instead of throwing)
    // must fail the run rather than pass by omission.
    const EXPECTED_SURFACES = ['title', 'favicon', 'welcome', 'about'];
    const missing = EXPECTED_SURFACES.filter(s => !surfacesRun.includes(s));
    if (missing.length > 0) {
        throw new Error(`coverage guard: surface(s) never ran: ${missing.join(', ')}`);
    }

    for (const surface of EXPECTED_SURFACES) {
        console.log(`verify-branding: PASS ${surface}`);
    }
    return result;
}

main()
    .then(() => {
        console.log('verify-branding: PASS');
        process.exit(0);
    })
    .catch(err => {
        console.error(`verify-branding: FAIL -- ${err.message}`);
        process.exit(1);
    });
