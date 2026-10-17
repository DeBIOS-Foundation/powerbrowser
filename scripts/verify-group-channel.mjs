#!/usr/bin/env node
/**
 * PLAT-02 (G-14.1.1-10): the PowerBrowserGroup channel's static contract.
 *
 * The channel is web content (the Theia frontend) posting DOM CustomEvents
 * that a JSWindowActorChild forwards to chrome, and the child posting the
 * reply back. Five independent faults kept it dead for a whole phase (15-01),
 * each masking the others, and each is visible in source text:
 *   1. the child events entry lacked `wantUntrusted: true`, so Gecko dropped
 *      every untrusted request before handleEvent;
 *   2. the child module was a chrome:// URI, which the content process
 *      cannot load (upstream ships every child on resource:// or moz-src://);
 *   3. the resource alias that makes that URI loadable must be in jar.mn;
 *   4. requests must go to `document.dispatchEvent` with `bubbles: true`,
 *      because the actor listens on the window root;
 *   5. the reply detail must be built in the content compartment, through
 *      the content window's own JSON round trip.
 * Plus event-name agreement, and response listeners on `window` (the child
 * dispatches on `win` without bubbling, so a `document` listener never fires).
 *
 * ## Derived, never hand-kept
 *
 * The request name comes from the child's guard, the response name from the
 * child's CustomEvents minus the receiveMessage name, the prefix from
 * GROUP_ACTOR_NAME, the allowed child schemes from upstream's
 * DesktopActorRegistry.sys.mjs, the frontend files from `git ls-files`. A
 * derivation that yields nothing fails as ZERO (a broken instrument).
 *
 * Static by construction: text reads only (upstream/ read-only), no build,
 * no browser, no port -- `gui02-web-tab-live` is the runtime proof.
 */

import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'group-channel';

const API = 'powerbrowser/shell/PowerBrowserAPI.sys.mjs';
const CHILD = 'powerbrowser/shell/GroupActorChild.sys.mjs';
const JAR = 'powerbrowser/shell/jar.mn';
const UPSTREAM_REGISTRY = 'upstream/browser/components/DesktopActorRegistry.sys.mjs';
const FRONTEND_RE = /^theia\/extensions\/[^/]+\/src\/.+\.tsx?$/;

// Helpers derived from verify-web-tab-bridge.mjs:61-107, minus the unused diff (importing it would run its main()).
/**
 * Strip `/* … *\/` blocks and `//` line comments with a scanner that skips
 * quoted text, so a `/*` inside a `//` comment or a string ('image/*') never
 * opens a block. A backslash outside a string escapes the next character,
 * which keeps `\/\//` inside a regex literal intact.
 * shortcut: a quote inside a regex literal opens a string; '/" strings end at
 * the line break to bound that, and `${}` nesting in templates is not tracked.
 */
function stripComments(text) {
    let out = '';
    let i = 0;
    while (i < text.length) {
        const c = text[i];
        const two = text.slice(i, i + 2);
        if (two === '/*') {
            const end = text.indexOf('*/', i + 2);
            i = end === -1 ? text.length : end + 2;
        } else if (two === '//') {
            const end = text.indexOf('\n', i);
            i = end === -1 ? text.length : end;
        } else if (c === '\\') {
            out += two;
            i += 2;
        } else if (c === '\'' || c === '"' || c === '`') {
            let j = i + 1;
            while (j < text.length && text[j] !== c && !(c !== '`' && text[j] === '\n')) {
                j += text[j] === '\\' ? 2 : 1;
            }
            out += text.slice(i, j + 1);
            i = j + 1;
        } else {
            out += c;
            i += 1;
        }
    }
    return out;
}

function derive(text, re) {
    return [...text.matchAll(re)].map(m => m[1]);
}

/**
 * The body of the `PowerBrowserAPI` object method `name(…) {` (two-space
 * indentation), up to the next method declared at the same indentation.
 */
function apiMethodBody(text, name) {
    const start = text.search(new RegExp(`^ {2}${name}\\([^)]*\\)\\s*\\{`, 'm'));
    if (start === -1) {
        return '';
    }
    const rest = text.slice(start + 1);
    const next = rest.search(/^ {2}(?:async\s+)?[A-Za-z_$][\w$]*\([^)]*\)\s*\{/m);
    return next === -1 ? text.slice(start) : text.slice(start, start + 1 + next);
}

/** Index just past the bracket closing the one at `open`, or -1. */
function matchClose(text, open) {
    const pair = { '(': ')', '{': '}', '[': ']' }[text[open]];
    let depth = 0;
    for (let i = open; i < text.length; i += 1) {
        if (text[i] === text[open]) {
            depth += 1;
        } else if (text[i] === pair) {
            depth -= 1;
            if (depth === 0) {
                return i + 1;
            }
        }
    }
    return -1;
}

const quoted = name => new RegExp(`^(['"\`])${name.replace(/[$]/g, '\\$')}\\1$`);
const fmtSet = set => `{${[...set].sort().join(', ')}}`;

/**
 * The whole check over a Map of repo-relative path -> text, so the self-test
 * can plant faults in memory.
 * @returns {{ failures: string[], stats: object }}
 */
function checkChannel(sources) {
    const failures = [];
    const fail = (file, rule, detail) => failures.push(`${NAME}: FAIL -- ${file}: ${rule} -- ${detail}`);
    const stats = {};

    for (const path of [API, CHILD, JAR, UPSTREAM_REGISTRY]) {
        if (!sources.has(path)) {
            fail(path, 'source', `${path} is missing (the upstream registry needs a fetched upstream/)`);
        }
    }
    if (failures.length) {
        return { failures, stats };
    }
    const api = stripComments(sources.get(API));
    const child = stripComments(sources.get(CHILD));
    const jar = sources.get(JAR).split('\n').filter(line => !line.trimStart().startsWith('#')).join('\n');
    const upstream = stripComments(sources.get(UPSTREAM_REGISTRY));
    const frontend = [...sources.keys()].filter(p => FRONTEND_RE.test(p)).sort()
        .map(p => [p, stripComments(sources.get(p))]);

    // D0: the names, all derived.
    const requests = [...new Set(derive(child, /event\.type\s*!==\s*["']([^"']+)["']/g))];
    const pushes = new Set(derive(child, /message\.name\s*!==\s*["']([^"']+)["']/g));
    const childEvents = derive(child, /new\s+win\.CustomEvent\(\s*["']([^"']+)["']/g);
    const responses = [...new Set(childEvents)].filter(n => !pushes.has(n));
    const prefix = derive(api, /const\s+GROUP_ACTOR_NAME\s*=\s*["']([^"']+)["']/g)[0];
    if (requests.length === 0) fail(CHILD, 'D0 request name', 'ZERO request names derived from the `event.type !==` guard');
    if (requests.length > 1) fail(CHILD, 'D0 request name', `ambiguous: ${requests.join(', ')}`);
    if (responses.length === 0) fail(CHILD, 'D0 response name', 'ZERO response names derived from `new win.CustomEvent(` minus the receiveMessage name');
    if (responses.length > 1) fail(CHILD, 'D0 response name', `ambiguous: ${responses.join(', ')}`);
    if (!prefix) fail(API, 'D0 prefix', 'ZERO prefix derived from GROUP_ACTOR_NAME');
    if (failures.length) {
        return { failures, stats };
    }
    const [request] = requests;
    const [response] = responses;
    const domNames = new Set([request, response, ...pushes]);
    stats.request = request;

    // D1: the registration admits untrusted requests.
    const register = apiMethodBody(api, 'registerGroupActor');
    if (!register) {
        fail(API, 'D1 wantUntrusted', 'registerGroupActor() not found, so wantUntrusted cannot be checked');
    } else {
        const eventsAt = register.search(/\bevents\s*:\s*\{/);
        const events = eventsAt === -1 ? '' : register.slice(eventsAt, matchClose(register, register.indexOf('{', eventsAt)));
        const entry = events.match(new RegExp(`["']?\\b${request}\\b["']?\\s*:\\s*(\\{[^}]*\\})`));
        if (!entry) {
            fail(API, 'D1 wantUntrusted', `registerGroupActor child events has no ${request} entry, so wantUntrusted: true is absent`);
        } else if (!/\bwantUntrusted\s*:\s*true\b/.test(entry[1])) {
            fail(API, 'D1 wantUntrusted', `${request} events entry ${entry[1].replace(/\s+/g, ' ')} lacks wantUntrusted: true; Gecko drops every untrusted request`);
        }
        if (!/\bchild\s*:\s*\{\s*esModuleURI\s*:\s*GROUP_ACTOR_CHILD_MODULE\b/.test(register)) {
            fail(API, 'D2 child module', 'registerGroupActor child.esModuleURI does not reference GROUP_ACTOR_CHILD_MODULE');
        }
    }

    // D2: the child module URI is content-process loadable and packaged.
    const upstreamSchemes = new Set(derive(upstream, /\bchild\s*:\s*\{\s*esModuleURI\s*:\s*["']([a-z][a-z0-9+.-]*):/g));
    stats.schemes = upstreamSchemes;
    const moduleUri = derive(api, /const\s+GROUP_ACTOR_CHILD_MODULE\s*=\s*["']([^"']+)["']/g)[0];
    if (upstreamSchemes.size === 0) {
        fail(UPSTREAM_REGISTRY, 'D2 child scheme', 'ZERO child esModuleURI schemes derived from the upstream registry');
    } else if (!moduleUri) {
        fail(API, 'D2 child scheme', 'ZERO: GROUP_ACTOR_CHILD_MODULE not found');
    } else {
        const m = moduleUri.match(/^([a-z][a-z0-9+.-]*):\/\/([^/]*)\/(.+)$/);
        if (!m) {
            fail(API, 'D2 child scheme', `GROUP_ACTOR_CHILD_MODULE ${moduleUri} is not scheme://host/path`);
        } else {
            const [, scheme, host, path] = m;
            stats.scheme = scheme;
            if (!upstreamSchemes.has(scheme)) {
                fail(API, 'D2 child scheme', `GROUP_ACTOR_CHILD_MODULE ${moduleUri} uses ${scheme}:, not in the upstream child scheme set ${fmtSet(upstreamSchemes)}; the content process cannot load it`);
            }
            const alias = jar.match(new RegExp(`^%\\s*resource\\s+${host.replace(/[.$]/g, '\\$&')}\\s+%?(\\S+)`, 'm'));
            if (!alias) {
                fail(JAR, 'D2 jar alias', `jar.mn has no "% resource ${host}" line for GROUP_ACTOR_CHILD_MODULE ${moduleUri}`);
            } else {
                const target = `${alias[1].replace(/\/?$/, '/')}${path}`;
                const entries = new Set(derive(jar, /^\s+(\S+)\s+\(/gm));
                if (!entries.has(target)) {
                    fail(JAR, 'D2 jar entry', `${basename(path)} is not packaged at ${target} (GROUP_ACTOR_CHILD_MODULE ${moduleUri})`);
                }
            }
        }
    }

    // D5: every child CustomEvent is built in the content window, its detail
    // through the content window's own JSON round trip.
    const childSites = [...child.matchAll(/new\s+(?:([\w$.]+)\.)?CustomEvent\(/g)];
    stats.childEvents = childSites.filter(s => s[1] === 'win').length;
    if (stats.childEvents === 0) fail(CHILD, 'D5 reply clone', 'ZERO `new win.CustomEvent(` sites in the child');
    for (const site of childSites) {
        const open = site.index + site[0].length - 1;
        const call = child.slice(open, matchClose(child, open));
        const name = (call.match(/^\(\s*["']([^"']+)["']/) || [])[1] || '?';
        if (site[1] !== 'win') {
            fail(CHILD, 'D5 reply clone', `${name} built as new ${site[1] ? `${site[1]}.` : ''}CustomEvent, not new win.CustomEvent (chrome-compartment event)`);
            continue;
        }
        const detail = call.match(/\bdetail\s*:\s*([\s\S]*)/);
        if (!detail || !detail[1].startsWith('win.wrappedJSObject.JSON.parse(JSON.stringify(')) {
            fail(CHILD, 'D5 reply clone', `${name} detail is not the content window's win.wrappedJSObject.JSON.parse(JSON.stringify( round trip; got ${detail ? detail[1].slice(0, 40).replace(/\s+/g, ' ') : 'no detail'}`);
        }
    }

    // D3, D4, D6 over every frontend source.
    let sites = 0;
    let files = 0;
    for (const [file, text] of frontend) {
        // D3: every prefixed literal is a DOM name the child uses.
        for (const lit of derive(text, new RegExp(`(['"\`]${prefix}[\\w$]*['"\`])`, 'g'))) {
            const value = lit.slice(1, -1);
            if (!domNames.has(value)) {
                fail(file, 'D3 event name', `'${value}' is not a child DOM name ${fmtSet(domNames)}`);
            }
        }
        const isName = (token, name) => {
            const t = token.trim();
            return quoted(name).test(t) || bindings(name).has(t);
        };
        const bindingCache = new Map();
        function bindings(name) {
            if (!bindingCache.has(name)) {
                bindingCache.set(name, new Set(derive(text, new RegExp(`\\bconst\\s+([\\w$]+)\\s*=\\s*(['"\`])${name}\\2`, 'g'))));
            }
            return bindingCache.get(name);
        }
        const namesRequest = new RegExp(`(['"\`])${request}\\1`).test(text);

        // D4: every request CustomEvent bubbles and reaches document.dispatchEvent.
        let fileSites = 0;
        for (const site of text.matchAll(/new\s+CustomEvent\(/g)) {
            const open = site.index + site[0].length - 1;
            const end = matchClose(text, open);
            const args = text.slice(open + 1, end - 1);
            const comma = args.indexOf(',');
            const first = comma === -1 ? args : args.slice(0, comma);
            if (!isName(first, request)) {
                continue;
            }
            fileSites += 1;
            const options = comma === -1 ? '' : args.slice(comma + 1);
            if (!/\bbubbles\s*:\s*true\b/.test(options)) {
                fail(file, 'D4 bubbles', `${request} CustomEvent lacks bubbles: true; it never reaches the actor's window-root listener`);
            }
            const before = text.slice(0, site.index);
            const inline = before.match(/([\w$.]+)\s*\.\s*dispatchEvent\(\s*$/);
            const bound = before.match(/\bconst\s+([\w$]+)\s*=\s*$/);
            if (inline) {
                if (inline[1] !== 'document') {
                    fail(file, 'D4 dispatch target', `${request} dispatched via ${inline[1]}.dispatchEvent, not document.dispatchEvent`);
                }
            } else if (bound) {
                const later = [...text.slice(end).matchAll(new RegExp(`([\\w$.]+)\\s*\\.\\s*dispatchEvent\\(\\s*${bound[1]}\\s*\\)`, 'g'))];
                if (later.length === 0) {
                    fail(file, 'D4 dispatch target', `${request} event bound to ${bound[1]} is never dispatched`);
                }
                for (const call of later) {
                    if (call[1] !== 'document') {
                        fail(file, 'D4 dispatch target', `${request} event ${bound[1]} dispatched via ${call[1]}.dispatchEvent, not document.dispatchEvent`);
                    }
                }
            } else {
                fail(file, 'D4 dispatch target', `${request} CustomEvent is neither passed to document.dispatchEvent( nor bound by const for a later document.dispatchEvent`);
            }
        }
        if (namesRequest) {
            files += 1;
            if (fileSites === 0) {
                fail(file, 'D4 dispatch target', `names ${request} but has 0 request dispatch sites`);
            }
        }
        sites += fileSites;

        // D6: response listeners are on window.
        for (const call of text.matchAll(/(?:([\w$.]+)\s*\.\s*)?\baddEventListener\(\s*([^,)]+)/g)) {
            if (isName(call[2], response) && call[1] !== 'window') {
                fail(file, 'D6 response listener', `${response} listener is on ${call[1] || '(no receiver)'}, not window; the child dispatches on the window without bubbling`);
            }
        }
    }
    if (files === 0) fail('theia/extensions', 'D4 dispatch target', `ZERO frontend files name ${request}`);
    stats.sites = sites;
    stats.files = files;
    return { failures, stats };
}

/** The real sources, read from the tree (read-only). */
function loadSources() {
    const sources = new Map();
    for (const path of [API, CHILD, JAR, UPSTREAM_REGISTRY]) {
        const abs = join(REPO_ROOT, path);
        if (existsSync(abs)) {
            sources.set(path, readFileSync(abs, 'utf8'));
        }
    }
    const listed = execFileSync('git', ['ls-files', '-z', '--', 'theia/extensions'], { cwd: REPO_ROOT, encoding: 'utf8' });
    for (const path of listed.split('\0').filter(p => FRONTEND_RE.test(p))) {
        sources.set(path, readFileSync(join(REPO_ROOT, path), 'utf8'));
    }
    return sources;
}

/**
 * Planted faults, each applied in memory to one source: `from` (string or
 * non-global RegExp anchored on today's text) is replaced once by `to`, and
 * some failure line must contain every `expect` substring. Plants 1-3, 4-7
 * and 8 are the five 15-01 faults; 3, 5, 7 and 11 are second forms and the
 * broken-instrument case.
 */
const PLANTS = [
    { id: '1 chrome child module', file: API,
        from: 'const GROUP_ACTOR_CHILD_MODULE = "resource://powerbrowser/GroupActorChild.sys.mjs"',
        to: 'const GROUP_ACTOR_CHILD_MODULE = "chrome://powerbrowser/content/GroupActorChild.sys.mjs"',
        expect: ['GROUP_ACTOR_CHILD_MODULE', 'chrome:'] },
    { id: '2 wantUntrusted false', file: API,
        from: 'PowerBrowserGroupRequest: { capture: true, wantUntrusted: true }',
        to: 'PowerBrowserGroupRequest: { capture: true, wantUntrusted: false }',
        expect: ['wantUntrusted'] },
    { id: '3 wantUntrusted deleted (15-01 shape)', file: API,
        from: 'PowerBrowserGroupRequest: { capture: true, wantUntrusted: true }',
        to: 'PowerBrowserGroupRequest: { capture: true }',
        expect: ['wantUntrusted'] },
    { id: '4 window dispatch', file: 'theia/extensions/tab-uris/src/browser/chrome-store-client.ts',
        from: 'document.dispatchEvent(new CustomEvent(GROUP_REQUEST_EVENT, { bubbles: true, detail: { requestId, msg } }));',
        to: 'window.dispatchEvent(new CustomEvent(GROUP_REQUEST_EVENT, { bubbles: true, detail: { requestId, msg } }));',
        expect: ['chrome-store-client.ts', 'not document.dispatchEvent'] },
    { id: '5 window dispatch of a bound event', file: 'theia/extensions/tab-uris/src/browser/browser-window-command.ts',
        from: 'return !document.dispatchEvent(request);',
        to: 'return !window.dispatchEvent(request);',
        expect: ['browser-window-command.ts', 'D4 dispatch target'] },
    { id: '6 bubbles false', file: 'theia/extensions/modes/src/browser/group-actor-client.ts',
        from: '{ detail: { requestId, msg }, bubbles: true }',
        to: '{ detail: { requestId, msg }, bubbles: false }',
        expect: ['group-actor-client.ts', 'bubbles'] },
    { id: '7 bubbles deleted', file: 'theia/extensions/tab-uris/src/browser/profile-storage.ts',
        from: /bubbles: true,\n(\s*detail: \{ requestId, msg: \{ kind: 'shellStateSave')/,
        to: '$1',
        expect: ['profile-storage.ts', 'bubbles'] },
    { id: '8 reply round trip removed', file: CHILD,
        from: 'detail: win.wrappedJSObject.JSON.parse(JSON.stringify({ requestId, reply })),',
        to: 'detail: { requestId, reply },',
        expect: ['PowerBrowserGroupResponse', 'win.wrappedJSObject.JSON.parse(JSON.stringify( round trip'] },
    { id: '9 jar resource alias removed', file: JAR,
        from: /^%\s+resource powerbrowser .*\n/m,
        to: '',
        expect: ['jar.mn', '% resource powerbrowser'] },
    { id: '10 request name respelled', file: 'theia/extensions/tab-uris/src/browser/profile-storage.ts',
        from: "export const SHELL_STATE_REQUEST_EVENT = 'PowerBrowserGroupRequest';",
        to: "export const SHELL_STATE_REQUEST_EVENT = 'PowerBrowserGroupRequets';",
        expect: ['profile-storage.ts', 'PowerBrowserGroupRequets'] },
    { id: '11 child guard renamed', file: CHILD,
        from: 'event.type !== "PowerBrowserGroupRequest"',
        to: 'event.kind !== "PowerBrowserGroupRequest"',
        expect: ['ZERO'] },
    { id: '12 response listener on document', file: 'theia/extensions/modes/src/browser/group-actor-client.ts',
        from: 'window.addEventListener(GROUP_RESPONSE_EVENT, this.onResponse);',
        to: 'document.addEventListener(GROUP_RESPONSE_EVENT, this.onResponse);',
        expect: ['group-actor-client.ts', 'not window'] },
    { id: '13 block opener inside a string', file: 'theia/extensions/tab-uris/src/browser/chrome-store-client.ts',
        from: 'document.dispatchEvent(new CustomEvent(GROUP_REQUEST_EVENT, { bubbles: true, detail: { requestId, msg } }));',
        to: "const accept = 'image/*'; window.dispatchEvent(new CustomEvent(GROUP_REQUEST_EVENT, { bubbles: true, detail: { requestId, msg } })); /* end */",
        expect: ['chrome-store-client.ts', 'not document.dispatchEvent'] },
];

function selfTest() {
    const sources = loadSources();
    const clean = checkChannel(sources).failures;
    if (clean.length) {
        console.error(`${NAME}-self-test: FAIL -- unmodified tree is already red, so the plants would be meaningless:`);
        clean.forEach(line => console.error(`  ${line}`));
        return 1;
    }
    let bad = 0;
    for (const plant of PLANTS) {
        const original = sources.get(plant.file);
        const planted = original === undefined ? undefined : original.replace(plant.from, plant.to);
        if (planted === undefined || planted === original) {
            console.error(`${NAME}-self-test: FAIL -- plant ${plant.id}: anchor drifted in ${plant.file}, nothing was planted`);
            bad += 1;
            continue;
        }
        const copy = new Map(sources);
        copy.set(plant.file, planted);
        const { failures } = checkChannel(copy);
        const hit = failures.find(line => plant.expect.every(s => line.includes(s)));
        if (hit) {
            console.log(`  plant ${plant.id}: red -- ${hit}`);
        } else {
            console.error(`${NAME}-self-test: FAIL -- plant ${plant.id} did not go red naming ${plant.expect.join(' + ')}; got: ${failures.join(' | ') || '(no failures)'}`);
            bad += 1;
        }
    }
    if (bad) {
        return 1;
    }
    console.log(`${NAME}-self-test: PASS -- clean tree green, ${PLANTS.length} plants red`);
    return 0;
}

function main() {
    if (process.argv.includes('--self-test')) {
        return selfTest();
    }
    const { failures, stats } = checkChannel(loadSources());
    if (failures.length) {
        failures.forEach(line => console.error(line));
        return 1;
    }
    console.log(`${NAME}: PASS -- ${stats.sites} dispatch sites in ${stats.files} frontend files, ` +
        `${stats.childEvents} child CustomEvents, request ${stats.request}, wantUntrusted set, ` +
        `child scheme ${stats.scheme} in upstream set ${fmtSet(stats.schemes)}; static: gui02-web-tab-live is the runtime proof`);
    return 0;
}

process.exit(main());
