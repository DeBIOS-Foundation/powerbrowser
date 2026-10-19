#!/usr/bin/env node
/**
 * modes-panel-motion (Phase 23, G-32, MODE-03): the side-panel motion that
 * 14-UI-SPEC declares equals the motion the shipped code produces.
 *
 * Chris chose the motion at the 23-04 checkpoint (a instant; b slide open in
 * N ms and close instantly; c slide both ways in N ms). This check never
 * holds that answer itself: it DERIVES both halves at check time and compares.
 *
 *   Spec half:  the 14-UI-SPEC `### Motion` "Side panels" sentence, in one of
 *               three fixed forms, and the `| loading | E4+E7 switch |` row.
 *   Code half:  the one `rebind(ApplicationShellOptions)` across
 *               theia/extensions/[name]/src, its per-panel expandThreshold and
 *               expandDuration (an identifier must resolve to the
 *               `matchMedia('(prefers-reduced-motion: reduce)')` ternary), the
 *               panel keys and expandDuration of stock ApplicationShell.DEFAULT_OPTIONS
 *               (a panel the rebind leaves without expandDuration inherits it), and every
 *               `this.shell.resize(0, area)` in activateMode before that area's
 *               collapse.
 *
 * Kinds: a = no panel duration and no shrink; b = every panel slides open and
 * no shrink; c = every panel slides open and every collapsing area shrinks
 * first. Anything else is red, named. So are: spec Motion and loading row
 * disagreeing, spec and code disagreeing, N over 200, a rebind count other
 * than 1 (a second rebind replaces the first and loses the drag-reveal fix),
 * rebind panel keys differing from stock's, a panel without expandThreshold 0,
 * a slide without the reduced-motion guard, any "slid" left in 14-UI-SPEC
 * under a, and any ZERO derivation (a broken instrument, not a clean tree).
 *
 * Honestly --quick: text reads only. No build, no browser, no display, no
 * network. The live half under a slide is modes-panel-motion-live.
 *
 * Usage:
 *   node scripts/verify-panel-motion.mjs
 *   node scripts/verify-panel-motion.mjs --self-test
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const NAME = 'modes-panel-motion';
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SPEC_REL = '.planning/milestones/v1.3-phases/14-modes-windows-setups/14-UI-SPEC.md';
const STOCK_REL = 'theia/node_modules/@theia/core/lib/browser/shell/application-shell.js';
const SERVICE_REL = 'theia/extensions/modes/src/browser/mode-service.ts';
const EXT_DIR = 'theia/extensions';
const MAX_MS = 200; // ROADMAP Phase 23 criterion 3
const REBIND = 'rebind(ApplicationShellOptions)';
const GUARD = /^window\.matchMedia\(\s*'\(prefers-reduced-motion: reduce\)'\s*\)\.matches\s*\?\s*0\s*:\s*(\d+)$/;
const DATE = '\\d{4}-\\d{2}-\\d{2}';

// The three fixed forms 23-03 writes; whitespace is normalised before matching.
const MOTION_FORMS = {
    a: new RegExp(`Side panels switch instantly on a mode switch, with no animation \\(Chris, G-32, ${DATE}\\)\\.`, 'g'),
    b: new RegExp(`Side panels slide open in (\\d+) ms and close instantly \\(Chris, G-32, ${DATE}\\); the motion is linear, runs on every panel open once the app is ready, and is instant when \`prefers-reduced-motion: reduce\` matches at startup\\.`, 'g'),
    c: new RegExp(`Side panels slide open and closed in (\\d+) ms on a mode switch \\(Chris, G-32, ${DATE}\\); the motion is linear, the opening slide also runs on every panel open once the app is ready, and both directions are instant when \`prefers-reduced-motion: reduce\` matches at startup\\.`, 'g'),
};
const LOADING_TAIL = '; tabs never unmount so there is no tab loading state on switch';
const LOADING_FORMS = {
    a: /^Panels switch instantly$/,
    b: /^Panels slide open in (\d+) ms and close instantly \(instant under reduced motion\)$/,
    c: /^Panels slide open and closed in (\d+) ms \(instant under reduced motion\)$/,
};

/** Blank out comments, keeping strings and offsets intact. */
export function stripComments(src) {
    let out = '';
    for (let i = 0; i < src.length; i++) {
        const ch = src[i];
        if (ch === '/' && src[i + 1] === '/') {
            while (i < src.length && src[i] !== '\n') { out += ' '; i++; }
            out += src[i] ?? '';
        } else if (ch === '/' && src[i + 1] === '*') {
            const end = src.indexOf('*/', i + 2);
            const stop = end === -1 ? src.length : end + 2;
            out += src.slice(i, stop).replace(/[^\n]/g, ' ');
            i = stop - 1;
        } else if (ch === '\'' || ch === '"' || ch === '`') {
            let j = i + 1;
            while (j < src.length && src[j] !== ch) { j += src[j] === '\\' ? 2 : 1; }
            out += src.slice(i, j + 1);
            i = j;
        } else {
            out += ch;
        }
    }
    return out;
}

/** The text between the brace at `open` and its partner. */
function braced(text, open) {
    let depth = 0;
    for (let i = open; i < text.length; i++) {
        if (text[i] === '{') depth++;
        else if (text[i] === '}' && --depth === 0) return text.slice(open + 1, i);
    }
    return null;
}

export function loadTree(root = REPO_ROOT) {
    const modules = {};
    for (const ext of readdirSync(join(root, EXT_DIR))) {
        let entries;
        try {
            entries = readdirSync(join(root, EXT_DIR, ext, 'src'), { recursive: true });
        } catch {
            continue;
        }
        for (const entry of entries) {
            const rel = `${EXT_DIR}/${ext}/src/${String(entry)}`;
            if (/\.tsx?$/.test(rel)) modules[rel] = readFileSync(join(root, rel), 'utf8');
        }
    }
    return {
        spec: readFileSync(join(root, SPEC_REL), 'utf8'),
        stock: readFileSync(join(root, STOCK_REL), 'utf8'),
        modules,
    };
}

function deriveSpec(spec, failures) {
    const lines = spec.split('\n');
    const start = lines.findIndex(l => l.trim() === '### Motion');
    if (start === -1) {
        failures.push('ZERO: no `### Motion` section in 14-UI-SPEC (broken instrument)');
        return null;
    }
    let end = lines.findIndex((l, i) => i > start && (/^#{1,3} /.test(l) || l.trim() === '---'));
    if (end === -1) end = lines.length;
    const motion = lines.slice(start + 1, end).join(' ').replace(/\s+/g, ' ');
    if (!motion.includes('Side panels')) {
        failures.push('ZERO: the Motion section has no "Side panels" sentence (broken instrument)');
        return null;
    }
    const hits = [];
    for (const [kind, re] of Object.entries(MOTION_FORMS)) {
        for (const m of motion.matchAll(re)) hits.push({ kind, ms: m[1] ? Number(m[1]) : 0 });
    }
    if (hits.length !== 1) {
        failures.push(`spec Motion: expected exactly one "Side panels" sentence in a fixed form, found ${hits.length}`);
        return null;
    }
    const rows = lines.filter(l => l.startsWith('| loading | E4+E7 switch |'));
    if (rows.length !== 1) {
        failures.push(`ZERO: expected one \`| loading | E4+E7 switch |\` row, found ${rows.length} (broken instrument)`);
        return null;
    }
    const cell = rows[0].split('|').map(c => c.trim()).filter(Boolean).pop() ?? '';
    let loading = null;
    if (cell.endsWith(LOADING_TAIL)) {
        const head = cell.slice(0, -LOADING_TAIL.length);
        for (const [kind, re] of Object.entries(LOADING_FORMS)) {
            const m = head.match(re);
            if (m) loading = { kind, ms: m[1] ? Number(m[1]) : 0 };
        }
    }
    if (!loading) {
        failures.push(`spec loading row: resolution is in no fixed form: "${cell}"`);
        return null;
    }
    const [motionHit] = hits;
    if (motionHit.kind !== loading.kind || motionHit.ms !== loading.ms) {
        failures.push(`spec disagrees with itself: Motion says kind=${motionHit.kind} ms=${motionHit.ms}, loading row says kind=${loading.kind} ms=${loading.ms}`);
    }
    if (motionHit.kind === 'a') {
        const slid = lines.flatMap((l, i) => (/slid/i.test(l) ? [i + 1] : []));
        if (slid.length) failures.push(`spec: kind=a but 14-UI-SPEC still mentions a slide ("slid") on line(s) ${slid.join(', ')}`);
    }
    return motionHit;
}

function stockPanelKeys(stock, failures) {
    const at = stock.indexOf('ApplicationShell.DEFAULT_OPTIONS = Object.freeze(');
    const body = at === -1 ? null : braced(stock, stock.indexOf('{', at));
    const keys = {};
    for (const m of (body ?? '').matchAll(/(\w+Panel):\s*Object\.freeze\(\{([^}]*)\}/g)) {
        const d = m[2].match(/expandDuration:\s*(\d+)/);
        if (d) keys[m[1]] = Number(d[1]);
    }
    if (!Object.keys(keys).length) failures.push('ZERO: no panel with expandDuration in stock ApplicationShell.DEFAULT_OPTIONS (broken instrument)');
    return keys;
}

function deriveCode(tree, failures, stock) {
    const sites = [];
    for (const [rel, text] of Object.entries(tree.modules)) {
        const code = stripComments(text);
        for (let i = code.indexOf(REBIND); i !== -1; i = code.indexOf(REBIND, i + 1)) sites.push({ rel, code, i });
    }
    if (sites.length !== 1) {
        failures.push(sites.length ? `rebind count is ${sites.length}, not 1 (${sites.map(s => s.rel).join(', ')}); a second rebind replaces the first and loses expandThreshold 0`
            : `ZERO: no ${REBIND} in ${EXT_DIR}/*/src (broken instrument)`);
        return null;
    }
    const { rel, code, i } = sites[0];
    const body = braced(code, code.indexOf('{', i));
    if (body === null) {
        failures.push(`ZERO: the rebind in ${rel} has no object literal (broken instrument)`);
        return null;
    }
    const panels = {};
    for (const m of body.matchAll(/(\w+Panel)\s*:\s*\{([^}]*)\}/g)) {
        const threshold = m[2].match(/expandThreshold\s*:\s*([^,\s]+)/)?.[1];
        const raw = m[2].match(/expandDuration\s*:\s*([^,\s]+)/)?.[1];
        let ms;
        let guarded = true;
        let from = '';
        if (raw === undefined) {
            // Absent => inherited: application-shell.js spreads DEFAULT_OPTIONS.<panel> under the rebind.
            ms = stock[m[1]] ?? NaN;
            guarded = ms === 0;
            from = ' (inherited from stock DEFAULT_OPTIONS)';
            if (Number.isNaN(ms)) failures.push(`ZERO: ${m[1]} has no expandDuration and stock declares none (broken instrument)`);
        } else if (/^\d+$/.test(raw)) {
            ms = Number(raw);
            guarded = ms === 0;
        } else {
            const decl = code.match(new RegExp(`const\\s+${raw}\\s*=\\s*([^;]+);`))?.[1]?.trim() ?? '';
            const g = decl.match(GUARD);
            ms = g ? Number(g[1]) : NaN;
            if (!g) failures.push(`${m[1]}.expandDuration '${raw}' does not resolve to the prefers-reduced-motion ternary (found: ${decl || 'no declaration'})`);
        }
        if (threshold !== '0') failures.push(`${m[1]} lost expandThreshold 0 (found: ${threshold ?? 'absent'}); the drag-reveal fix depends on it`);
        if (!guarded && !Number.isNaN(ms)) failures.push(`${m[1]}.expandDuration is a bare ${ms}${from} with no prefers-reduced-motion guard`);
        panels[m[1]] = ms;
    }
    return { rel, panels };
}

function deriveShrinks(tree, failures) {
    const code = stripComments(tree.modules[SERVICE_REL] ?? '');
    const at = code.search(/async\s+activateMode\s*\(/);
    const body = at === -1 ? null : braced(code, code.indexOf('{', at));
    if (body === null) {
        failures.push(`ZERO: no activateMode in ${SERVICE_REL} (broken instrument)`);
        return null;
    }
    const collapses = {
        left: body.search(/this\.shell\.leftPanelHandler\.collapse\(/),
        right: body.search(/this\.shell\.rightPanelHandler\.collapse\(/),
        bottom: body.search(/this\.shell\.collapsePanel\(\s*'bottom'\s*\)/),
    };
    const areas = Object.keys(collapses).filter(a => collapses[a] !== -1);
    if (!areas.length) {
        failures.push('ZERO: activateMode collapses no panel (broken instrument)');
        return null;
    }
    const shrunk = new Set();
    for (const m of body.matchAll(/this\.shell\.resize\(\s*0\s*,\s*([^)]+?)\s*\)/g)) {
        const lit = m[1].match(/^'(left|right|bottom)'$/)?.[1];
        // shortcut: a non-literal area counts for every later collapse; read the loop by hand if c ever ships one.
        for (const a of lit ? [lit] : areas) if (m.index < collapses[a]) shrunk.add(a);
    }
    return { areas, shrunk: areas.filter(a => shrunk.has(a)) };
}

/** Returns { failures, spec, code } where code.kind/ms is the shipped motion. */
export function analyse(tree) {
    const failures = [];
    const spec = deriveSpec(tree.spec, failures);
    const stock = stockPanelKeys(tree.stock, failures);
    const rebind = deriveCode(tree, failures, stock);
    const shrinks = deriveShrinks(tree, failures);
    let code = null;
    if (rebind && Object.keys(stock).length) {
        const want = Object.keys(stock).sort().join(',');
        const got = Object.keys(rebind.panels).sort().join(',');
        if (want !== got) failures.push(`rebind panel keys {${got}} differ from stock DEFAULT_OPTIONS keys {${want}}`);
    }
    if (rebind && shrinks) {
        const values = Object.values(rebind.panels);
        const slides = values.filter(ms => ms > 0);
        const uniform = new Set(values).size === 1;
        const none = slides.length === 0;
        const allShrink = shrinks.shrunk.length === shrinks.areas.length;
        const noShrink = shrinks.shrunk.length === 0;
        const ms = none ? 0 : values[0];
        if (none && noShrink) code = { kind: 'a', ms: 0 };
        else if (slides.length === values.length && uniform && noShrink) code = { kind: 'b', ms };
        else if (slides.length === values.length && uniform && allShrink) code = { kind: 'c', ms };
        else {
            failures.push(`code motion is no kind: panel durations ${JSON.stringify(rebind.panels)}, shrink before collapse on [${shrinks.shrunk.join(', ')}] of [${shrinks.areas.join(', ')}]`);
        }
    }
    for (const [who, v] of [['spec', spec], ['code', code]]) {
        if (v && v.ms > MAX_MS) failures.push(`${who} N=${v.ms} ms is over ${MAX_MS} ms (ROADMAP Phase 23 criterion 3)`);
    }
    if (spec && code && (spec.kind !== code.kind || spec.ms !== code.ms)) {
        failures.push(`spec and code disagree: spec kind=${spec.kind} ms=${spec.ms}, code kind=${code.kind} ms=${code.ms}`);
    }
    return { failures, spec, code };
}

const label = v => (v.kind === 'a' ? 'kind=a' : `kind=${v.kind} ms=${v.ms}`);

function selfTest() {
    const clean = loadTree();
    const base = analyse(clean);
    if (base.failures.length) {
        console.error(`${NAME} --self-test: FAIL -- the unmodified tree is already red:`);
        base.failures.forEach(f => console.error(`  ${f}`));
        return 1;
    }
    const K = base.code.kind;
    const N = base.code.ms || 150;
    const D = '2026-01-01';
    const rebindRel = Object.keys(clean.modules).find(r => stripComments(clean.modules[r]).includes(REBIND));
    const forms = {
        a: `Side panels switch instantly on a mode switch, with no animation (Chris, G-32, ${D}).`,
        b: `Side panels slide open in ${N} ms and close instantly (Chris, G-32, ${D}); the motion is linear, runs on every panel open once the app is ready, and is instant when \`prefers-reduced-motion: reduce\` matches at startup.`,
    };
    const spec = f => t => ({ ...t, spec: f(t.spec) });
    const mod = (rel, f) => t => ({ ...t, modules: { ...t.modules, [rel]: f(t.modules[rel]) } });
    const panel = (name, f) => mod(rebindRel, s => s.replace(new RegExp(`(${name}\\s*:\\s*\\{)([^}]*)(\\})`), (_, a, b, c) => a + f(b) + c));
    // Replace the Motion "Side panels" sentence, wherever it wraps, with another form.
    const swapMotion = s => {
        const at = s.indexOf('Side panels', s.indexOf('### Motion'));
        const end = s.indexOf('.', s.indexOf('(Chris, G-32,', at));
        return s.slice(0, at) + (K === 'a' ? forms.b : forms.a) + s.slice(end + 1);
    };
    const leftCollapse = 'void this.shell.leftPanelHandler.collapse()';
    const cases = [
        { name: '1 spec Motion switched to another form', mutate: spec(swapMotion), expect: 'disagree' },
        K === 'a'
            ? { name: '2 expandDuration: 150 added to bottomPanel', mutate: panel('bottomPanel', b => `${b.trimEnd()}, expandDuration: 150 `), expect: 'bottomPanel' }
            : { name: '2 bottomPanel expandDuration removed', mutate: panel('bottomPanel', b => b.replace(/,?\s*expandDuration\s*:\s*[^,\s}]+/, '')), expect: 'no kind' },
        { name: '3 second rebind added', mutate: mod(rebindRel, s => s.replace(/\}\);\s*$/, `    ${REBIND}.toConstantValue({});\n});\n`)), expect: 'rebind count is 2' },
        { name: '4 expandThreshold 0 removed from leftPanel', mutate: panel('leftPanel', b => b.replace(/expandThreshold\s*:\s*0\s*,?\s*/, '')), expect: 'leftPanel lost expandThreshold 0' },
        K === 'a'
            ? { name: '5 loading row says it slides', mutate: spec(s => s.replace('| Panels switch instantly;', `| Panels slide open in 150 ms and close instantly (instant under reduced motion);`)), expect: 'disagree' }
            : { name: '5 reduced-motion guard replaced by a bare N', mutate: mod(rebindRel, s => s.replace(/window\.matchMedia\([^;]+;/, `${N};`)), expect: 'prefers-reduced-motion' },
        K === 'a'
            ? { name: '6 slide-distance row restored', mutate: spec(s => s.replace(/(\| `radius-full: 9999px` \|[^\n]*\n)/, `$1| Panel slide distance | Theia region width (stock) | The slide animates the stock region's own width |\n`)), expect: 'slid' }
            : { name: '6 N set to 250 in code and spec', mutate: t => mod(rebindRel, s => s.replace(new RegExp(`: ${N};`), ': 250;'))(spec(s => s.split(`${N} ms`).join('250 ms'))(t)), expect: 'over 200' },
        K === 'c'
            ? { name: '7 left shrink removed', mutate: mod(SERVICE_REL, s => s.replace(/this\.shell\.resize\(\s*0\s*,\s*'left'\s*\)/, "this.shell.isExpanded('left')")), expect: 'no kind' }
            : { name: '7 left shrink added', mutate: mod(SERVICE_REL, s => s.replace(leftCollapse, `this.shell.resize(0, 'left'); ${leftCollapse}`)), expect: 'no kind' },
        { name: '8 `### Motion` heading renamed', mutate: spec(s => s.replace('### Motion', '### Movement')), expect: 'ZERO' },
        // Only a panel that inherits its duration reads stock's value; under b/c every panel sets its own.
        K === 'a' && { name: '9 stock leftPanel expandDuration 0 -> 150 (a re-pin that slides)', mutate: t => ({ ...t, stock: t.stock.replace(/(leftPanel:\s*Object\.freeze\(\{[^}]*expandDuration:\s*)0\b/, '$1150') }), expect: 'leftPanel.expandDuration is a bare 150 (inherited' },
    ].filter(Boolean);
    let failed = 0;
    for (const c of cases) {
        const mutated = c.mutate(clean);
        if (JSON.stringify(mutated) === JSON.stringify(clean)) {
            console.error(`${NAME} --self-test: FAIL -- '${c.name}' did not modify the tree; its anchor drifted`);
            failed++;
            continue;
        }
        const { failures } = analyse(mutated);
        if (failures.some(f => f.includes(c.expect))) {
            console.log(`  ok  ${c.name} -> red, naming '${c.expect}'`);
        } else {
            console.error(`${NAME} --self-test: FAIL -- '${c.name}' did not go red naming '${c.expect}'; got: ${failures.join(' | ') || '(no failures)'}`);
            failed++;
        }
    }
    if (failed) return 1;
    console.log(`${NAME} --self-test: PASS -- all ${cases.length} planted faults went red on a kind=${K} tree`);
    return 0;
}

function main() {
    if (process.argv.includes('--self-test')) return selfTest();
    const { failures, code } = analyse(loadTree());
    if (failures.length) {
        console.error(`${NAME}: FAIL -- 14-UI-SPEC's side-panel motion and the shipped code drifted apart:`);
        failures.forEach(f => console.error(`  - ${f}`));
        return 1;
    }
    console.log(`${NAME}: PASS -- ${label(code)}`);
    return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main());
