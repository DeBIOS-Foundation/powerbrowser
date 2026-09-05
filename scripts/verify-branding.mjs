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
// Usage: node scripts/verify-branding.mjs
//
// Reads the shell's own supervised frontend; takes no URL argument (WINDOWS
// 14 -- a URL would open a redundant stock window beside the shell).
//
// Later plans extend this same file rather than adding sibling scripts.

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { withFirefoxPage } from './lib/firefox-bidi.mjs';

// -- Expected values come from the inventory, not from this file (01-08) --
// This file's own comments already argued that inventory/brand-tokens.json is
// the third source neither the rendered value nor the checker was produced
// from, and then hard-coded the literals anyway -- which is the same shape as
// the bug those comments describe. They are read at run time now, so a rename
// pass that rewrote both the JSX and this checker still fails against a source
// it did not write.
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EXPECT = JSON.parse(
    readFileSync(join(REPO_ROOT, 'inventory/brand-tokens.json'), 'utf8')
).brand_display_expectations;
const DISPLAY_FORM = EXPECT.variants.release.brand_short_name;
const IDENTIFIER_FORM = new RegExp(EXPECT.identifier_form);

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

/**
 * The three assertions EVERY display surface must satisfy, applied through one
 * function so a surface cannot pass by carrying fewer of them than its sibling.
 *
 * That is not hypothetical. Until 01-08 the About dialog check carried two
 * assertions where the welcome check carried five, and the two it was missing
 * were exactly the two that would have caught `<h3>PowerBrowser</h3>` rendering
 * as user-visible product identity. The bug class was found and fixed once, on
 * the welcome widget, and not generalised -- so it survived on the surface next
 * to it. Fixed here, where both callers route through, so a third display
 * surface added later inherits the assertion instead of having to remember it.
 */
function assertDisplayForm(surface, text) {
    if (typeof text !== 'string') {
        throw new Error(`${surface} textContent was never read: ${JSON.stringify(text)}`);
    }
    if (!text.includes(DISPLAY_FORM)) {
        throw new Error(`${surface} textContent missing the display form ${JSON.stringify(DISPLAY_FORM)}: ${JSON.stringify(text)}`);
    }
    if (IDENTIFIER_FORM.test(text)) {
        throw new Error(`${surface} textContent leaks the IDENTIFIER form ${JSON.stringify(EXPECT.identifier_form)} into a display surface: ${JSON.stringify(text)}`);
    }
    if (NO_STOCK_IDENTITY.test(text)) {
        throw new Error(`${surface} textContent matched /Theia|Eclipse/i: ${JSON.stringify(text)}`);
    }
}

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

    // The DISPLAY form, spaceless since NAME-01 carried it to `PowerBrowser`.
    // Until 01-07 this expected the
    // IDENTIFIER form and the widget rendered it -- the mechanical rename had
    // rewritten both the literal and the expectation that checks it, so they
    // agreed and the wrong product name shipped unnoticed. That is Pitfall 1
    // exactly, and it is why the inventory is a third source neither side
    // writes.
    assertDisplayForm('welcome widget', text);

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

    // The same three assertions the welcome surface carries, through the same
    // function -- this is the fix for the gap that let this dialog render the
    // identifier form while the check printed a pass.
    assertDisplayForm('about dialog', text);

    // The two below have no welcome counterpart: they are specific to D-35's
    // dropped renderExtensions()/renderHeader(), so they stay local.
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

    // WINDOWS 14: empty URL -- this check reads the shell, never a URL page.
    const result = await withFirefoxPage('', async ({ evaluate, waitFor }) => {
        await waitFor('window.theia && window.theia.container ? true : false');

        // The DISPLAY form, spaceless since NAME-01 carried it to
        // `PowerBrowser`. Theia derives document.title from
        // `applicationName` in theia/applications/browser/package.json, which
        // the inventory's brand_display_expectations pins to the release
        // brand_short_name `PowerBrowser` -- and verify-branding-preflight.mjs
        // asserts that pinning. This expectation said `PowerBrowser` until
        // 01-07: the rename had rewritten it to the identifier form while the
        // package.json literal was hand-written correctly, so the two
        // disagreed and this check was simply red for a reason that was never
        // the product's fault.
        const title = await evaluate('document.title');
        if (title !== DISPLAY_FORM) {
            throw new Error(`document.title was ${JSON.stringify(title)}, expected ${JSON.stringify(DISPLAY_FORM)}`);
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
