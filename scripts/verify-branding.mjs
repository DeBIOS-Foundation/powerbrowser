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
// NAME-01 re-scope of the identifier assertion (08-05; inventory
// identifier_form_reason states the principle): the canonical display value
// IS the identifier form, so a bare absence-assertion over it is jointly
// unsatisfiable with the display-presence assertion on any correct tree
// (observed red on the all-green tree: welcome textContent legitimately
// carries "PowerBrowser"). What still discriminates is the token-boundary
// failure mode -- the identifier adjoined to other alphanumerics inside a
// SINGLE text node ("PowerBrowserDev", "myPowerBrowser"). Node-boundary
// concatenation ("PowerBrowser" + "Version 1.74.1" as sibling nodes, which
// textContent flattens separator-free) is legitimate display content and
// must pass, so the check runs per text node, never over the joined text.
function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
const IDENTIFIER_EMBEDDED = new RegExp(
    `[A-Za-z0-9]${escapeRegExp(EXPECT.identifier_form)}|${escapeRegExp(EXPECT.identifier_form)}[A-Za-z0-9]`
);
// Collects the surface's direct text-node data (TreeWalker SHOW_TEXT): one
// entry per DOM text node, so node-boundary concatenation stays separable.
const COLLECT_TEXT_NODES = `(function(root) {
    const out = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) out.push(n.data);
    return out;
})`;

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

// Legal-notice exemption for the stock-identity assertion (08-05): the
// About dialog is REQUIRED to render the three generator-owned legal
// notices (06-04 -- own trademark, Mozilla non-association, Eclipse
// attribution), so a blanket /Theia|Eclipse/i absence over the raw surface
// has been unsatisfiable since 06-04 landed (observed red on the all-green
// tree). The exemption is derived, never hand-kept: the exact notice
// strings are read at check time from generated/theia-branding.json (the
// dev fragment TARGETS runs on, the same artifact the running build
// renders through the powerbrowserBranding channel) and stripped before
// the stock-identity test. A notice edit follows automatically; a stray
// "Theia"/"Eclipse" OUTSIDE the notices still goes red. Absent or empty
// notices fail loud -- never a skip.
function readLegalNotices() {
    const path = join(REPO_ROOT, 'generated', 'theia-branding.json');
    let parsed;
    try {
        parsed = JSON.parse(readFileSync(path, 'utf8'));
    } catch (err) {
        throw new Error(`legal notices unreadable at ${path}: ${err.message} -- run: node scripts/generate.mjs`);
    }
    if (!Array.isArray(parsed?.legalNotices) || parsed.legalNotices.length === 0) {
        throw new Error(`legal notices absent in ${path}: expected a non-empty legalNotices array`);
    }
    return parsed.legalNotices;
}
const LEGAL_NOTICES = readLegalNotices();

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
function assertDisplayForm(surface, text, textNodes) {
    if (typeof text !== 'string') {
        throw new Error(`${surface} textContent was never read: ${JSON.stringify(text)}`);
    }
    if (!Array.isArray(textNodes)) {
        throw new Error(`${surface} text nodes were never read: per-node collection is the token-boundary evidence`);
    }
    if (!text.includes(DISPLAY_FORM)) {
        throw new Error(`${surface} textContent missing the display form ${JSON.stringify(DISPLAY_FORM)}: ${JSON.stringify(text)}`);
    }
    for (const nodeText of textNodes) {
        if (IDENTIFIER_EMBEDDED.test(nodeText)) {
            throw new Error(`${surface} text node adjoins the IDENTIFIER form ${JSON.stringify(EXPECT.identifier_form)} to other alphanumerics: ${JSON.stringify(nodeText)} (full surface: ${JSON.stringify(text)})`);
        }
    }
    let scannable = text;
    for (const notice of LEGAL_NOTICES) scannable = scannable.split(notice).join('');
    if (NO_STOCK_IDENTITY.test(scannable)) {
        throw new Error(`${surface} textContent matched /Theia|Eclipse/i outside the generator-owned legal notices: ${JSON.stringify(text)}`);
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

    const found = await waitFor(`(function() {
        ${PRELUDE}
        try {
            const widgetManager = __getByName(window.theia.container, 'WidgetManager');
            const widgets = widgetManager.getWidgets('welcome');
            if (widgets.length !== 1) return false;
            const root = widgets[0].node;
            return JSON.stringify({ text: root.textContent, nodes: (${COLLECT_TEXT_NODES})(root) });
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
    const { text, nodes } = JSON.parse(found);
    assertDisplayForm('welcome widget', text, nodes);

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

    const aboutFound = await waitFor(
        `(function() {
            const node = document.querySelector('.theia-aboutDialog');
            if (!node) return false;
            return JSON.stringify({ text: node.textContent, nodes: (${COLLECT_TEXT_NODES})(node) });
        })()`
    );
    const { text, nodes } = JSON.parse(aboutFound);

    // The same three assertions the welcome surface carries, through the same
    // function -- this is the fix for the gap that let this dialog render the
    // identifier form while the check printed a pass.
    assertDisplayForm('about dialog', text, nodes);

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
