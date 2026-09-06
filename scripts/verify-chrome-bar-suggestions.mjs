#!/usr/bin/env node
/**
 * GUI-06's suggestion-search gate (13-02): the chrome-bar prefix search over
 * `tabs.sqlite` returns at most the UI cap of recency-ordered rows with
 * wildcard input escaped, served through the first `TabQueryService`
 * consumer over the existing authenticated JSON-RPC channel.
 *
 * Two halves share this file:
 *
 *  STATIC -- the search statement text is DERIVED from
 *  `tab-query-service.ts` at check time (the `prepare(...)` literal inside
 *  `searchByPrefix`, unescaped from its TS quoting) and compared to the one
 *  EXPECTED const below: projection columns as SET EQUALITY (an addition is
 *  a surplus column nobody reviewed -- T-13-02-02; a removal is a shortfall
 *  that starves the dropdown), plus the escape clause, the recency
 *  ordering, and a bound (never interpolated) limit. An empty derivation --
 *  method or statement not found -- fails as a broken instrument, never
 *  passes as clean. The RPC half derives the path constant from the token
 *  source and requires both modules to import that const (never re-spell
 *  the literal), the impl to delegate to `searchByPrefix`, and both
 *  modules to bind statically in singleton scope.
 *
 *  LIVE -- the derived SQL statement (the tree's own text, not a
 *  reimplementation of it) runs against a scratch `tabs.sqlite` fixture in
 *  a mkdtemp directory outside the repo, using the stdlib `node:sqlite`
 *  engine. That engine choice is load-bearing, not incidental: the
 *  second-writer gate (`verify-sql-store-second-writer.mjs`, rule (c))
 *  exempts exactly the `DatabaseSync` shape in stage-disciplined scripts/
 *  instruments carrying the mkdtempSync marker -- a better-sqlite3
 *  `new Database(` open here would read as a second writer and fail the
 *  quick gate. LIKE/ESCAPE/LIMIT semantics are core SQLite, identical
 *  across both engines, so nothing is lost by the stdlib choice. Proven:
 *  prefix matching, literal `%`/`_` input matching literally only (no
 *  wildcard dump -- T-13-02-01), the UI cap honoured, recency newest-first.
 *  The only reimplemented logic
 *  is the three-replace LIKE escape, which the static half pins to the same
 *  three spellings in source; the --self-test's discrimination proof shows
 *  this live half CAN go red on an unescaped implementation.
 *
 * Activation backstop (13-UI-SPEC.md): committing a suggestion must
 * navigate through the existing opener path. The widget lands in 13-03, so
 * with no activation call site present this prints STAGED with the exact
 * rerun command and exits cleanly -- a loud held-out check, never a silent
 * pass. Once a call site exists, it must route through `OpenerService.open`.
 *
 *  Honestly --quick: reads text sources, runs a scratch fixture through the
 *  stdlib engine, touches no build, no browser, no display, no network.
 *
 * Usage:
 *   node scripts/verify-chrome-bar-suggestions.mjs
 *   node scripts/verify-chrome-bar-suggestions.mjs --self-test
 */

import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'verify-chrome-bar-suggestions';

const QUERY_SERVICE_REL = 'theia/extensions/tab-uris/src/node/tab-query-service.ts';
const TOKEN_REL = 'theia/extensions/chrome-bar/src/browser/chrome-bar-suggestion-service.ts';
const IMPL_REL = 'theia/extensions/chrome-bar/src/node/chrome-bar-suggestion-service-impl.ts';
const FRONTEND_MODULE_REL = 'theia/extensions/chrome-bar/src/browser/chrome-bar-frontend-module.ts';
const BACKEND_MODULE_REL = 'theia/extensions/chrome-bar/src/node/chrome-bar-backend-module.ts';
const RERUN = `node scripts/${NAME}.mjs`;

/**
 * The declared search contract. The ONE hand-kept list in the static half:
 * editing it is how a deliberate contract change is made -- it shows up in
 * the diff for review. Everything it is compared against is derived at
 * check time.
 */
const EXPECTED = Object.freeze({
    projection: Object.freeze(['uri', 'url', 'title', 'last_active']),
    escapeClause: "ESCAPE '\\'",
    recencyOrder: 'ORDER BY last_active DESC',
    uiCap: 8,
});

function diff(actual, expected) {
    const a = new Set(actual);
    const e = new Set(expected);
    return {
        surplus: [...a].filter(x => !e.has(x)),
        missing: [...e].filter(x => !a.has(x)),
    };
}

/** The `searchByPrefix` method body, derived from the reader source. */
function methodBodyOf(source) {
    const start = source.indexOf('searchByPrefix(prefix');
    if (start === -1) {
        return null;
    }
    const brace = source.indexOf('{', start);
    let depth = 0;
    for (let i = brace; i < source.length; i++) {
        if (source[i] === '{') {
            depth++;
        } else if (source[i] === '}') {
            depth--;
            if (depth === 0) {
                return source.slice(start, i + 1);
            }
        }
    }
    return null;
}

/**
 * The SQL statement text inside `prepare(...)`, with TS single-quote
 * escapes undone. Returns null when no statement derives -- the caller
 * reports a broken instrument, never a clean comparison against nothing.
 */
function searchSqlOf(source) {
    const body = methodBodyOf(source);
    if (!body) {
        return null;
    }
    const match = /\.prepare\(\s*'((?:[^'\\]|\\.)*)'\s*\)/.exec(body);
    if (!match) {
        return null;
    }
    return match[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\');
}

function projectionOf(sql) {
    const match = /SELECT\s+([\s\S]*?)\s+FROM\b/i.exec(sql);
    if (!match) {
        return [];
    }
    return match[1].split(',').map(c => c.trim()).filter(Boolean);
}

/** @returns {string[]} failure messages -- empty means the static half holds. */
function checkStatic(sources) {
    const failures = [];
    const querySrc = sources[QUERY_SERVICE_REL] ?? '';

    const sql = searchSqlOf(querySrc);
    if (!sql) {
        failures.push(
            `${QUERY_SERVICE_REL}: derived ZERO search statements from searchByPrefix -- ` +
            `the method or its prepare() literal was not found, so this comparison proves nothing`
        );
        return failures;
    }

    const actualProjection = projectionOf(sql);
    if (actualProjection.length === 0) {
        failures.push(`${QUERY_SERVICE_REL}: derived ZERO projection columns -- the SELECT did not parse, so this comparison proves nothing`);
    } else {
        const { surplus, missing } = diff(actualProjection, EXPECTED.projection);
        if (surplus.length) {
            failures.push(`${QUERY_SERVICE_REL}: search projects columns NOT in the declared contract (T-13-02-02 -- never add a column without review): ${surplus.join(', ')}`);
        }
        if (missing.length) {
            failures.push(`${QUERY_SERVICE_REL}: declared contract columns are GONE from the search projection: ${missing.join(', ')}`);
        }
    }

    if (!sql.includes(EXPECTED.escapeClause)) {
        failures.push(`${QUERY_SERVICE_REL}: search carries no ${EXPECTED.escapeClause} clause -- metacharacter input degrades to a wildcard dump (T-13-02-01)`);
    }
    if (!sql.includes(EXPECTED.recencyOrder)) {
        failures.push(`${QUERY_SERVICE_REL}: search is not ${EXPECTED.recencyOrder} -- the recency-ordering contract (IN-02) drifted`);
    }
    if (/LIMIT\s+\d+/i.test(sql)) {
        failures.push(`${QUERY_SERVICE_REL}: search LIMIT is an interpolated literal -- the cap must be a bound parameter, never string-interpolated SQL`);
    } else if (!/LIMIT\s+(\?|:\w+)/i.test(sql)) {
        failures.push(`${QUERY_SERVICE_REL}: search carries no bound LIMIT -- the caller-supplied cap is unenforceable`);
    }
    if (!/url\s+LIKE\s+\S+\s+ESCAPE/i.test(sql) || !/title\s+LIKE\s+\S+\s+ESCAPE/i.test(sql)) {
        failures.push(`${QUERY_SERVICE_REL}: search must filter BOTH url and title under an escape clause -- one column lost its pattern guard`);
    }
    // The three-replace LIKE escape the live half's oracle mirrors. Pinned
    // by spelling so the mirror cannot drift silently from the source.
    for (const spelling of ['\\\\', '\\%', '\\_']) {
        if (!querySrc.includes(spelling)) {
            failures.push(`${QUERY_SERVICE_REL}: LIKE-escape routine lost the '${spelling}' neutralization -- typed text no longer matches literally`);
        }
    }

    // RPC half: the path is derived from the token source; every module
    // must carry that derived value, never a re-spelled copy.
    const tokenSrc = sources[TOKEN_REL] ?? '';
    const pathMatch = /CHROME_SUGGESTION_PATH\s*=\s*'([^']+)'/.exec(tokenSrc);
    if (!pathMatch) {
        failures.push(`${TOKEN_REL}: derived ZERO RPC paths -- CHROME_SUGGESTION_PATH was not found, so the channel comparison proves nothing`);
    } else {
        const rpcPath = pathMatch[1];
        // The proxy pair (backend handler + frontend proxy) must import the
        // shared path const -- never re-spell the literal (a copy drifts
        // silently, per the browser-window-command precedent). So the
        // assertion is two-sided: the symbol must be referenced, and no
        // `/services/` literal may appear where the const belongs.
        for (const rel of [BACKEND_MODULE_REL, FRONTEND_MODULE_REL]) {
            const src = sources[rel] ?? '';
            if (!src.includes('CHROME_SUGGESTION_PATH')) {
                failures.push(`${rel}: does not reference CHROME_SUGGESTION_PATH -- the proxy pair forked off the shared RPC path`);
            }
            const literal = /'\/services\/[^']*'/.exec(src);
            if (literal) {
                failures.push(`${rel}: re-spells the RPC path as ${literal[0]} instead of importing CHROME_SUGGESTION_PATH -- the copy drifts silently from '${rpcPath}'`);
            }
        }
        const backendSrc = sources[BACKEND_MODULE_REL] ?? '';
        if (!backendSrc.includes('JsonRpcConnectionHandler') || !backendSrc.includes('ConnectionHandler')) {
            failures.push(`${BACKEND_MODULE_REL}: does not bind the connection handler to the JSON-RPC handler -- the suggestion path left the authenticated channel`);
        }
        const frontendSrc = sources[FRONTEND_MODULE_REL] ?? '';
        if (!frontendSrc.includes('createProxy') || !frontendSrc.includes('inSingletonScope')) {
            failures.push(`${FRONTEND_MODULE_REL}: does not bind the interface to the websocket proxy in singleton scope`);
        }
    }
    const implSrc = sources[IMPL_REL] ?? '';
    if (!implSrc.includes('searchByPrefix') || !implSrc.includes('TabQueryService')) {
        failures.push(`${IMPL_REL}: does not delegate to TabQueryService.searchByPrefix -- the first-consumer link is broken`);
    }
    const capMatch = /CHROME_SUGGESTION_LIMIT\s*=\s*(\d+)/.exec(tokenSrc);
    if (!capMatch) {
        failures.push(`${TOKEN_REL}: derived ZERO UI caps -- CHROME_SUGGESTION_LIMIT was not found`);
    } else if (Number(capMatch[1]) !== EXPECTED.uiCap) {
        failures.push(`${TOKEN_REL}: UI cap is ${capMatch[1]} but the declared contract is ${EXPECTED.uiCap} visible rows`);
    }

    return failures;
}

function readSources() {
    const out = {};
    for (const rel of [QUERY_SERVICE_REL, TOKEN_REL, IMPL_REL, FRONTEND_MODULE_REL, BACKEND_MODULE_REL]) {
        out[rel] = readFileSync(join(REPO_ROOT, rel), 'utf8');
    }
    return out;
}

/** Script-side mirror of the source's three-replace LIKE escape + wrap. */
function escapeLikePattern(raw) {
    return raw.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

function loadEngine() {
    // Stdlib engine (see header: the second-writer gate's rule-(c)
    // carve-out). Required eagerly -- a missing engine is a broken
    // instrument (red), never a silent pass.
    try {
        return createRequire(import.meta.url)('node:sqlite').DatabaseSync;
    } catch (error) {
        throw new Error(`node:sqlite DatabaseSync unavailable (need node >= 22.5): ${error.message}`);
    }
}

/**
 * Scratch fixture: mirrors the writer's four-column shape
 * (`PowerBrowserAPI.sys.mjs` TABS_STORE_V1_DDL) with rows that discriminate
 * every live assertion -- shared-prefix rows for matching, literal `%`/`_`
 * rows for the escape proof, and more than the UI cap for the limit proof.
 */
function seedFixture(db) {
    db.exec(`CREATE TABLE tabs (
  uri         TEXT PRIMARY KEY CHECK(length(uri) > 0),
  url         TEXT NOT NULL,
  title       TEXT NOT NULL DEFAULT '',
  last_active INTEGER NOT NULL CHECK(last_active >= 0)
)`);
    const insert = db.prepare('INSERT INTO tabs (uri, url, title, last_active) VALUES (?, ?, ?, ?)');
    const rows = [
        ['view:alpha-1', 'https://alpha.example/one', 'Alpha One', 100],
        ['view:alpha-2', 'https://alpha.example/two', 'Alpha Two', 300],
        ['view:alpha-3', 'https://alpha.example/three', 'Alpha Three', 200],
        ['view:beta-1', 'https://beta.example/one', 'Beta One', 400],
        ['view:pct-1', 'https://pct.example/100%coverage', 'Full percent title', 150],
        ['view:us-1', 'https://us.example/under_score', 'Under score title', 160],
        ['view:g1', 'https://g1.example/', 'Gamma', 90],
        ['view:g2', 'https://g2.example/', 'Delta', 80],
        ['view:g3', 'https://g3.example/', 'Epsilon', 70],
        ['view:g4', 'https://g4.example/', 'Zeta', 60],
    ];
    for (const row of rows) {
        insert.run(...row);
    }
    return rows.length;
}

/**
 * Runs the TREE'S OWN derived SQL (not a reimplementation of the
 * statement) with a caller-supplied escaping discipline, so the escape
 * proof below measures the statement + discipline pair honestly.
 */
function runDerivedQuery(DatabaseSync, sql, rawPrefix, limit, escape) {
    const dir = mkdtempSync(join(tmpdir(), 'chrome-bar-suggestions-'));
    try {
        const db = new DatabaseSync(join(dir, 'tabs.sqlite'));
        try {
            seedFixture(db);
            const pattern = `%${escape(rawPrefix)}%`;
            return db.prepare(sql).all(pattern, pattern, limit);
        } finally {
            db.close();
        }
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}

/** @returns {string[]} failure messages -- empty means the live half holds. */
function checkLive() {
    const failures = [];
    let DatabaseSync;
    try {
        DatabaseSync = loadEngine();
    } catch (error) {
        failures.push(`fixture engine did not load, so the fixture proves nothing: ${error.message}`);
        return failures;
    }
    const sql = searchSqlOf(readFileSync(join(REPO_ROOT, QUERY_SERVICE_REL), 'utf8'));
    if (!sql) {
        failures.push('derived ZERO search statements -- the live half has no statement to execute');
        return failures;
    }
    const tokenSrc = readFileSync(join(REPO_ROOT, TOKEN_REL), 'utf8');
    const cap = Number(/CHROME_SUGGESTION_LIMIT\s*=\s*(\d+)/.exec(tokenSrc)?.[1] ?? EXPECTED.uiCap);

    // Prefix matching: only alpha rows, none of the others.
    const alpha = runDerivedQuery(DatabaseSync, sql, 'alpha', cap, escapeLikePattern);
    const alphaUris = alpha.map(r => r.uri).sort();
    const wantAlpha = ['view:alpha-1', 'view:alpha-2', 'view:alpha-3'];
    if (JSON.stringify(alphaUris) !== JSON.stringify(wantAlpha)) {
        failures.push(`prefix 'alpha' returned [${alphaUris.join(', ')}] -- want exactly [${wantAlpha.join(', ')}]`);
    }

    // Metacharacters match literally only: '%' hits the one literal-% row,
    // '_' hits rows carrying a literal underscore -- never the full table.
    const pct = runDerivedQuery(DatabaseSync, sql, '%', cap, escapeLikePattern);
    if (pct.length !== 1 || pct[0].uri !== 'view:pct-1') {
        failures.push(`input '%' returned ${pct.length} rows -- want exactly the 1 literal-% row, never a wildcard dump`);
    }
    const us = runDerivedQuery(DatabaseSync, sql, '_', cap, escapeLikePattern);
    if (!us.length || us.some(r => !(`${r.url}${r.title}`.includes('_')))) {
        failures.push(`input '_' returned ${us.length} rows with a non-literal match -- '_' must match literally only`);
    }

    // UI cap honoured: '' matches all 10 rows, the derived cap lets 8 through.
    const all = runDerivedQuery(DatabaseSync, sql, '', cap, escapeLikePattern);
    if (all.length !== cap) {
        failures.push(`empty prefix with limit ${cap} returned ${all.length} rows -- want exactly the UI cap`);
    }

    // Recency: newest first across the whole result.
    const ordered = all.every((row, i) => i === 0 || all[i - 1].last_active >= row.last_active);
    if (!ordered) {
        failures.push('results are not newest-first by last_active -- the recency-ordering contract drifted');
    }
    return failures;
}

/**
 * Activation backstop (13-UI-SPEC.md, held-out): a committed suggestion
 * must navigate through the existing tab-URI opener path. Scans every
 * chrome-bar browser source for an `.open(` call site: with none present
 * (widget lands in 13-03) the caller reports STAGED loudly -- never a
 * silent pass. A call site that commits without the OpenerService (e.g. a
 * bare window.open) fails naming the file. A bare `window.open` fails in
 * EVERY file -- even one that mentions OpenerService elsewhere -- so a
 * same-file bypass can never hide behind file-granular co-occurrence.
 */
function checkActivationSources(entries) {
    const failures = [];
    const routed = [];
    for (const { file, src } of entries) {
        if (!/\.open\(/.test(src)) {
            continue;
        }
        const rel = `theia/extensions/chrome-bar/src/browser/${file}`;
        if (/window\.open\s*\(/.test(src)) {
            failures.push(`${rel}: bare window.open bypasses the OpenerService routing -- suggestion activation must navigate through the existing tab-URI opener path`);
            continue;
        }
        if (src.includes('OpenerService')) {
            routed.push(rel);
        } else {
            failures.push(`${rel}: commits through .open() without the OpenerService -- suggestion activation must navigate through the existing tab-URI opener path`);
        }
    }
    return { failures, routed };
}

function checkActivation() {
    const dir = join(REPO_ROOT, 'theia/extensions/chrome-bar/src/browser');
    const entries = readdirSync(dir)
        .filter(f => f.endsWith('.ts') || f.endsWith('.tsx'))
        .map(file => ({ file, src: readFileSync(join(dir, file), 'utf8') }));
    return checkActivationSources(entries);
}

function main() {
    if (process.argv.includes('--self-test')) {
        return selfTest();
    }
    const failures = [...checkStatic(readSources()), ...checkLive()];
    const activation = checkActivation();
    failures.push(...activation.failures);
    if (activation.routed.length === 0 && activation.failures.length === 0) {
        console.log(
            `${NAME}: STAGED -- suggestion-activation backstop held out: no activation call site exists yet ` +
            `(widget lands in 13-03); committing a suggestion must navigate through the existing opener path. ` +
            `Rerun: ${RERUN}`
        );
    }
    if (failures.length) {
        console.error(`${NAME}: FAIL`);
        failures.forEach(f => console.error(`  - ${f}`));
        return 1;
    }
    console.log(`${NAME}: PASS -- search shape matches the declared contract and fixture semantics hold (prefix, escape, cap ${EXPECTED.uiCap}, recency)`);
    return 0;
}

function selfTest() {
    const clean = readSources();
    const baseline = [...checkStatic(clean), ...checkLive()];
    if (baseline.length !== 0) {
        console.error(`${NAME} --self-test: FAIL -- the unmodified tree is already red, so the planted-fault results below would be meaningless:`);
        baseline.forEach(f => console.error(`  ${f}`));
        return 1;
    }

    // Plants operate on the searchByPrefix method body where the assertion
    // reads: an unscoped `LIMIT ?` plant would hit listByRecency's identical
    // clause first and leave the asserted statement green (caught live --
    // the plant must change what the check derives, not just the file).
    const searchBody = methodBodyOf(clean[QUERY_SERVICE_REL]);
    if (!searchBody) {
        console.error(`${NAME} --self-test: FAIL -- searchByPrefix body did not derive on the clean tree; the plants below would be meaningless`);
        return 1;
    }
    const withScopedBody = mutatedBody => clean[QUERY_SERVICE_REL].split(searchBody).join(mutatedBody);
    const cases = [
        {
            name: 'planted unescaped-wildcard',
            // Two scopes, one plant: the escape clause lives in the method
            // body (source spelling `ESCAPE \'\\\'` per the od ground
            // truth), while the percent-neutralizer lives in the
            // module-level routine -- scoping either step to the wrong
            // text plants nothing. A step that does not land returns the
            // original source so the plant-landed assertion below reports
            // the drifted anchor instead of a vacuous green.
            mutate: fullSrc => {
                const neutered = fullSrc.replace(/\.replace\(\/%\/g, '\\\\%'\)/, ".replace(/%/g, '%')");
                if (neutered === fullSrc) {
                    return fullSrc;
                }
                const target = methodBodyOf(neutered);
                const stripped = target.replace(/ESCAPE \\'\\\\\\'/g, '');
                if (stripped === target) {
                    return fullSrc;
                }
                return neutered.split(target).join(stripped);
            },
            expect: 'escape',
        },
        {
            name: 'planted limit breach',
            mutate: () => withScopedBody(searchBody.replace(/LIMIT \?/, 'LIMIT 100')),
            expect: 'LIMIT',
        },
    ];

    let failed = 0;
    for (const testCase of cases) {
        const mutated = { ...clean, [QUERY_SERVICE_REL]: testCase.mutate(clean[QUERY_SERVICE_REL]) };
        // A planted fault that does not change the source at all would make
        // the case vacuous -- assert the mutation actually landed.
        if (mutated[QUERY_SERVICE_REL] === clean[QUERY_SERVICE_REL]) {
            console.error(`${NAME} --self-test: FAIL -- '${testCase.name}' did not modify the source; the anchor it edits has drifted`);
            failed++;
            continue;
        }
        const failures = checkStatic(mutated);
        if (!failures.some(f => f.includes(testCase.expect))) {
            console.error(`${NAME} --self-test: FAIL -- '${testCase.name}' did not go red naming '${testCase.expect}'; got: ${failures.join(' | ') || '(no failures at all)'}`);
            failed++;
        } else {
            console.log(`  ok  ${testCase.name} -> red, naming '${testCase.expect}'`);
        }
    }

    // Fixture-discrimination proof: the same derived statement with the
    // escape discipline REMOVED must dump on '%' input -- otherwise the
    // live half could never catch an unescaped implementation.
    try {
        const DatabaseSync = loadEngine();
        const sql = searchSqlOf(clean[QUERY_SERVICE_REL]);
        const dumped = runDerivedQuery(DatabaseSync, sql, '%', EXPECTED.uiCap, raw => raw);
        if (dumped.length <= 1) {
            console.error(`${NAME} --self-test: FAIL -- the unescaped oracle returned ${dumped.length} rows on '%' input; the fixture cannot discriminate an unescaped implementation`);
            failed++;
        } else {
            console.log(`  ok  fixture discrimination -> unescaped oracle dumps ${dumped.length} rows on '%' (escaped oracle returns 1)`);
        }
    } catch (error) {
        console.error(`${NAME} --self-test: FAIL -- discrimination proof errored: ${error.message}`);
        failed++;
    }

    // Activation-backstop proof: a bare window.open in a file that ALSO
    // mentions OpenerService must go red (the file-granularity hole), a
    // routed-only call site must stay routed-green, and the live tree must
    // be routed-green with no failure.
    const bypass = checkActivationSources([{
        file: 'chrome-bar-widget.tsx',
        src: "import { OpenerService } from '@theia/core/lib/browser';\n"
            + 'const handler = await opener.getOpener(uri); await handler.open(uri);\n'
            + "window.open('https://bypass.example', '_blank');\n",
    }]);
    if (!bypass.failures.some(f => f.includes('window.open'))) {
        console.error(`${NAME} --self-test: FAIL -- same-file window.open bypass did not go red naming 'window.open'; got: ${bypass.failures.join(' | ') || '(no failures at all)'}`);
        failed++;
    } else {
        console.log(`  ok  same-file window.open bypass -> red, naming 'window.open'`);
    }
    const routedOnly = checkActivationSources([{
        file: 'chrome-bar-widget.tsx',
        src: "import { OpenerService } from '@theia/core/lib/browser';\n"
            + 'const handler = await opener.getOpener(uri); await handler.open(uri);\n',
    }]);
    if (routedOnly.failures.length !== 0 || routedOnly.routed.length !== 1) {
        console.error(`${NAME} --self-test: FAIL -- routed-only call site was not routed-green; got: ${routedOnly.failures.join(' | ') || `(routed ${routedOnly.routed.length})`}`);
        failed++;
    } else {
        console.log(`  ok  routed-only call site -> routed-green`);
    }
    const liveActivation = checkActivation();
    if (liveActivation.failures.length !== 0 || liveActivation.routed.length === 0) {
        console.error(`${NAME} --self-test: FAIL -- the live tree is not routed-green (failures: ${liveActivation.failures.join(' | ') || 'none'}, routed: ${liveActivation.routed.length})`);
        failed++;
    } else {
        console.log(`  ok  live tree activation -> routed-green (${liveActivation.routed.length} file(s))`);
    }

    if (failed) {
        return 1;
    }
    console.log(`${NAME} --self-test: PASS -- ${cases.length} planted faults all went red plus the fixture-discrimination and activation-backstop proofs`);
    return 0;
}

process.exit(main());
