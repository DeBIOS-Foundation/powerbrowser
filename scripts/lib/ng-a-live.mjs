// scripts/lib/ng-a-live.mjs
//
// Wave A's live harness (non-GUI build). Launches the built browser on a
// profile the check keeps -- withFirefoxPage's `profileDir` (R3, f4818a0) -- so
// it can quit and relaunch on the same profile; waits for the Theia frontend;
// and installs `window.__ngA`: helpers that reach the frontend's own DI-bound
// services (opener, GroupModel, GroupActorClient, the group reader, the shell,
// commands). Checks drive behaviour only through those (G6) and read
// tabs.sqlite from outside. SIGTERM ends each launch; Gecko on GTK turns it
// into an orderly quit (nsAppShell::TermSignalHandler).

import { createServer } from 'node:http';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withFirefoxPage } from './firefox-bidi.mjs';
import { readStore } from './tab-store-fixtures.mjs';

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/** Polls `probe` until it returns something truthy or `ms` passes; resolves that value or undefined. */
export async function waitUntil(probe, ms = 20000, stepMs = 250) {
    const end = Date.now() + ms;
    for (;;) {
        const value = await probe();
        if (value) {
            return value;
        }
        if (Date.now() >= end) {
            return undefined;
        }
        await sleep(stepMs);
    }
}

/**
 * Review Focus: a live check never runs on a checkout carrying uncommitted
 * work. Tracked changes only: the kit's own runs leave an untracked
 * scripts/__pycache__/ behind, which tests nothing.
 */
export function assertCleanTree() {
    if (process.env.PB_NG_ALLOW_DIRTY === '1') {
        return;
    }
    const status = spawnSync('git', ['-C', REPO_ROOT, 'status', '--short', '--untracked-files=no'], { encoding: 'utf8' }).stdout.trim();
    if (status) {
        throw new Error(`uncommitted changes in ${REPO_ROOT}; a live run would test code that is not committed:\n${status}`);
    }
}

const profiles = [];

/**
 * A fresh profile (space-free, outside the repo) with the prefs every wave A
 * live check needs: sessionstore writes every second, so the store's sweep
 * runs within a check's budget; the last session restores at launch with every
 * tab loaded at once, so a restart check sees restored tabs as contexts.
 * withFirefoxPage appends its own overrides to this user.js (R3).
 */
export function newProfile(name, extraPrefs = {}) {
    const dir = mkdtempSync(join(tmpdir(), `pb-ng-a-${name}-`));
    const prefs = {
        'browser.sessionstore.interval': 1000,
        'browser.startup.page': 3,
        'browser.sessionstore.restore_on_demand': false,
        'browser.sessionstore.max_resumed_crashes': 999,
        ...extraPrefs,
    };
    writeFileSync(join(dir, 'user.js'), Object.entries(prefs)
        .map(([key, value]) => `user_pref(${JSON.stringify(key)}, ${JSON.stringify(value)});`).join('\n') + '\n');
    profiles.push(dir);
    return dir;
}

export function removeProfiles() {
    if (process.env.PB_NG_KEEP_PROFILES === '1') {
        console.log(`kept profiles: ${profiles.join(' ')}`);
        return;
    }
    profiles.splice(0).forEach(dir => rmSync(dir, { recursive: true, force: true }));
}

/** Pages the overlays load: every path links to /b; /hang accepts and never answers. */
export async function servePages() {
    const hung = [];
    const server = createServer((req, res) => {
        if (req.url.startsWith('/hang')) {
            hung.push(res);
            return;
        }
        const name = req.url.replace(/[^A-Za-z0-9]/g, '') || 'root';
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(`<!doctype html><title>page ${name}</title><body style="background:#3a6"><a id="next" href="/b">next</a></body>`);
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    return {
        url: path => `http://127.0.0.1:${port}${path}`,
        close: () => {
            hung.forEach(res => res.destroy());
            server.close();
        },
    };
}

export function tabsOf(profile) {
    try {
        return readStore(join(profile, 'tabs.sqlite')).tabs;
    } catch {
        return [];
    }
}

export const show = rows => JSON.stringify(rows.map(r => ({ uri: r.uri, url: r.url, group_id: r.group_id, closed_at: r.closed_at })));

// Page-realm helpers. No template literals inside: this whole string is one.
const PAGE_HELPERS = `
window.__ngA = window.__ngA || (function () {
    var container = window.theia.container;
    function get(name) {
        var found;
        container._bindingDictionary.traverse(function (key) {
            if (found) return;
            var keyStr = typeof key === 'symbol' ? key.toString() : (key && key.name) || String(key);
            if (keyStr === 'Symbol(' + name + ')' || keyStr === name) found = key;
        });
        if (!found) throw new Error('DI binding not found: ' + name);
        return container.get(found);
    }
    var A = {
        get: get,
        sleep: function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); },
        shell: function () { return get('ApplicationShell'); },
        registry: function () { return get('TabUriRegistry'); },
        model: function () { return get('GroupModel'); },
        actor: function () { return get('GroupActorClient'); },
        reader: function () { return get('GroupQueryService'); },
        ready: function () {
            try { return get('FrontendApplicationStateService').state === 'ready'; } catch (e) { return false; }
        },
        uri: function (text) {
            var shell = A.shell();
            var areas = ['left', 'right', 'bottom', 'main'];
            for (var i = 0; i < areas.length; i++) {
                var widgets = shell.getWidgets(areas[i]);
                for (var j = 0; j < widgets.length; j++) {
                    var address = A.registry().uriOf(widgets[j]);
                    if (address) return new address.constructor(text);
                }
            }
            throw new Error('no addressable widget to take the URI class from');
        },
        open: async function (text, options) {
            var target = A.uri(text);
            var opener = await get('OpenerService').getOpener(target, options);
            return opener.open(target, options);
        },
        mutate: async function (msg) {
            try { return { ok: true, reply: await A.actor().mutate(msg) }; }
            catch (e) { return { ok: false, message: String((e && e.message) || e) }; }
        },
        outcome: async function (call) {
            try { return { resolved: true, value: await call() }; }
            catch (e) { return { resolved: false, message: String((e && e.message) || e) }; }
        },
        mainWidgets: function () { return Array.from(A.shell().mainPanel.widgets()); },
        webTabs: function () {
            return A.mainWidgets().filter(function (w) { return typeof w.tabId === 'string' && typeof w.url === 'string'; });
        },
        organising: async function () {
            await get('ModeService').activateMode('organising');
            var org;
            for (var i = 0; i < 100 && !org; i++) {
                org = A.shell().getWidgetById('powerbrowser.modes.organising');
                if (!org) await A.sleep(100);
            }
            if (!org) throw new Error('the Organising surface never attached');
            await org.initialize();
            return org;
        },
        cardKey: async function (widget) {
            var org = await A.organising();
            var widgets = A.mainWidgets().filter(function (w) { return w !== org; });
            var live = org.liveTabs();
            var at = widgets.indexOf(widget);
            if (at < 0 || !live[at]) throw new Error('the Panorama model has no card for widget ' + widget.id);
            return live[at].uri;
        },
        confirmDialog: async function () {
            var button;
            for (var i = 0; i < 100 && !button; i++) {
                button = document.querySelector('.pb-org-close-confirm .theia-button.main');
                if (!button) await A.sleep(100);
            }
            if (!button) throw new Error('the Close Group dialog never opened');
            button.click();
        },
    };
    return A;
})();
`;

/**
 * Launches the built browser on `profileDir` (kept after exit, R3), waits for
 * the Theia frontend, installs the page helpers, and calls
 * fn({ run, topLevelContexts, evaluateIn, send, ... }). `run(body)` evaluates
 * an async function body in the Theia frame with `A` bound to the helpers and
 * resolves its JSON result; a throw inside rejects naming the page error.
 */
export async function withShell(profileDir, fn, { url = '' } = {}) {
    return withFirefoxPage(url, async page => {
        await page.waitFor('window.theia && window.theia.container ? true : false', { timeoutMs: 90000 });
        await page.evaluate(`${PAGE_HELPERS}; true`);
        await page.waitFor('window.__ngA.ready()', { timeoutMs: 90000 });
        const run = async body => {
            const text = await page.evaluate(`(async () => {
                const A = window.__ngA;
                try {
                    const out = await (async () => { ${body} })();
                    return JSON.stringify({ out: out === undefined ? null : out });
                } catch (error) {
                    return JSON.stringify({ error: String((error && error.stack) || error) });
                }
            })()`);
            const parsed = JSON.parse(text);
            if (parsed.error) {
                throw new Error(`page: ${parsed.error}`);
            }
            return parsed.out;
        };
        return fn({ ...page, run });
    }, { profileDir });
}

/**
 * Entry for every live check file: one scenario, receiving { pages, expect,
 * failures }; exits 1 naming every failure, 0 with a PASS line.
 */
export async function runCheck(name, scenario) {
    const failures = [];
    const expect = (ok, message) => {
        if (!ok) {
            failures.push(message);
        }
    };
    assertCleanTree();
    const pages = await servePages();
    try {
        await scenario({ pages, expect, failures });
    } catch (error) {
        failures.push(`harness: ${error && error.stack ? error.stack : error}`);
    } finally {
        pages.close();
        removeProfiles();
    }
    if (failures.length) {
        console.error(`${name}: FAIL`);
        failures.forEach(f => console.error(`  ${f}`));
        process.exit(1);
    }
    console.log(`${name}: PASS`);
}
