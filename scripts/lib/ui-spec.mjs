// scripts/lib/ui-spec.mjs -- the one parse of a UI-SPEC's machine sections, shared by
// verify-gui08-panorama-copy and verify-gui08-canvas-geometry. Both checks derive their
// expectations from .planning/milestones/v1.3-phases/15-panorama-organising/15-UI-SPEC.md
// through this module, so a parse change here changes both checks at once.
//
// Form (fixed in Phase 21, plan 21-01):
//   - a section is the text under a line that is exactly `## {heading}`;
//   - Copywriting Contract literals are `**"..."**` in table cells after the first, and the
//     section splits at the line `### Retired copy` into contract and retired literals;
//   - Canvas Geometry machine rows have a Key of identifiers joined by ` × ` (consts) or a
//     backticked selector plus a property (CSS); numbers are read from the Value cell before
//     its first `(`. Every other row is prose and is not compared.

const ESC_RE = /[.*+?^${}()|[\]\\]/g;
const esc = s => s.replace(ESC_RE, '\\$&');

/** Text of the section under the line exactly `## {heading}`, or '' if absent or doubled. */
export function specSection(src, heading) {
    const lines = src.split('\n');
    const at = lines.flatMap((l, i) => (l === `## ${heading}` ? [i] : []));
    if (at.length !== 1) return '';
    let end = at[0] + 1;
    while (end < lines.length && !lines[end].startsWith('## ')) end++;
    return lines.slice(at[0], end).join('\n');
}

const isSeparator = cells => cells.length > 0 && cells.every(c => /^:?-+:?$/.test(c));

function splitRow(line) {
    const inner = line.trim().replace(/^\|/, '').replace(/\|$/, '');
    return inner.split('|').map(c => c.trim());
}

/** One trimmed cell array per table body row; separators and their header line are skipped. */
export function tableRows(text) {
    const lines = text.split('\n');
    const rows = [];
    for (let i = 0; i < lines.length; i++) {
        if (!lines[i].startsWith('|')) continue;
        const cells = splitRow(lines[i]);
        if (isSeparator(cells)) continue;
        const next = lines[i + 1];
        if (next !== undefined && next.startsWith('|') && isSeparator(splitRow(next))) continue;
        rows.push(cells);
    }
    return rows;
}

/** Every `**"…"**` content, lazily matched, in order. */
export function boldLiterals(text) {
    return [...text.matchAll(/\*\*"(.*?)"\*\*/g)].map(m => m[1]);
}

function rowLiterals(text) {
    return tableRows(text).flatMap(cells => cells.slice(1).flatMap(boldLiterals));
}

/** `{ contract, retired }` literals of the Copywriting Contract, split at `### Retired copy`. */
export function copyContract(spec) {
    const lines = specSection(spec, 'Copywriting Contract').split('\n');
    const cut = lines.indexOf('### Retired copy');
    const head = cut < 0 ? lines : lines.slice(0, cut);
    const tail = cut < 0 ? [] : lines.slice(cut + 1);
    return { contract: rowLiterals(head.join('\n')), retired: rowLiterals(tail.join('\n')) };
}

/** `${…}` template slots and spec `{word}` slots both read as `{}`. */
export function normaliseSlots(s) {
    return s.replace(/\$\{[^}]*\}/g, '{}').replace(/\{[A-Za-z]+\}/g, '{}');
}

const CONST_KEY = /^[A-Za-z][A-Za-z0-9_]*( × [A-Za-z][A-Za-z0-9_]*)*$/;
const CSS_KEY = /^`(\.[a-z][a-z0-9-]*)` ([a-z-]+)$/;

function valueNumbers(value) {
    const before = value.split('(')[0];
    return [...before.matchAll(/\d+(?:\.\d+)?/g)].map(m => Number(m[0]));
}

/** Machine rows of the Canvas Geometry table: `{ consts, css }`. */
export function geometryRows(spec) {
    const consts = [];
    const css = [];
    for (const cells of tableRows(specSection(spec, 'Canvas Geometry'))) {
        const [key, value = ''] = cells;
        const cssKey = CSS_KEY.exec(key);
        if (cssKey) {
            const numbers = valueNumbers(value);
            css.push({ key, selector: cssKey[1], property: cssKey[2], value: numbers.length === 1 ? numbers[0] : NaN });
        } else if (CONST_KEY.test(key)) {
            consts.push({ key, names: key.split(' × '), numbers: valueNumbers(value) });
        }
    }
    return { consts, css };
}

/** Sorted unique `{ sizes, weights }` from the Typography table (cells 2 and 3). */
export function typography(spec) {
    const sizes = new Set();
    const weights = new Set();
    for (const cells of tableRows(specSection(spec, 'Typography'))) {
        for (const m of (cells[1] ?? '').matchAll(/(\d+)px/g)) sizes.add(Number(m[1]));
        for (const m of (cells[2] ?? '').matchAll(/\b[1-9]00\b/g)) weights.add(Number(m[0]));
    }
    const sorted = s => [...s].sort((a, b) => a - b);
    return { sizes: sorted(sizes), weights: sorted(weights) };
}

export function stripCssComments(css) {
    return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Body of every rule whose whole selector list is exactly `selector` (nested at-rules included). */
export function ruleBodies(css, selector) {
    const out = [];
    // Innermost rules only: a body holds no braces, and an at-rule header carries `@`.
    for (const m of css.matchAll(/(?<=^|[{};])\s*([^{};@]+?)\s*\{([^{}]*)\}/g)) {
        const list = m[1].split(',').map(s => s.trim().replace(/\s+/g, ' '));
        if (list.length === 1 && list[0] === selector) out.push(m[2]);
    }
    return out;
}

const NUM = '-?\\d+(?:\\.\\d+)?';
const ID = '[A-Za-z_][A-Za-z0-9_]*';

/**
 * Map of SCREAMING_CASE name to expression for every top-level const that is
 * not a string or a string list -- any spacing, a type annotation, a
 * multi-line or derived expression. Nothing is dropped for being outside the
 * evaluator's grammar: such a const still needs a row, and resolveConst then
 * reports its form as unsupported rather than the check skipping it.
 */
export function topLevelNumericConsts(src) {
    const out = new Map();
    for (const m of src.matchAll(/^(?:export\s+)?const\s+([A-Z][A-Z0-9_]*)\s*(?::[^=\n]+)?=\s*([^;]+);/gm)) {
        const expr = m[2].trim();
        if (/^['"`]/.test(expr) || /^\[\s*['"`]/.test(expr)) continue;
        out.set(m[1], expr);
    }
    return out;
}

function evaluate(expr, texts, depth) {
    const e = expr.trim();
    if (new RegExp(`^${NUM}$`).test(e)) return { value: Number(e) };
    const list = new RegExp(`^\\[\\s*(${NUM}(?:\\s*,\\s*${NUM})*)\\s*,?\\s*\\]$`).exec(e);
    if (list) return { value: list[1].split(',').map(n => Number(n.trim())) };
    const round = new RegExp(`^Math\\.round\\(\\s*(${ID}|${NUM})\\s*\\*\\s*(${ID}|${NUM})\\s*\\)$`).exec(e);
    if (round) {
        const operand = t => (new RegExp(`^${NUM}$`).test(t) ? { value: Number(t) } : resolveConst(t, texts, depth + 1));
        const a = operand(round[1]);
        const b = operand(round[2]);
        if (a.error) return a;
        if (b.error) return b;
        if (typeof a.value !== 'number' || typeof b.value !== 'number') return { error: `${e} multiplies a list` };
        return { value: Math.round(a.value * b.value) };
    }
    return { error: `unsupported expression '${e}'` };
}

/** Value of `name` across `texts`: its `const` definitions, else its `name: <number>` properties. */
export function resolveConst(name, texts, depth = 0) {
    if (depth > 8) return { error: `${name}: definition chain too deep` };
    const all = texts.join('\n');
    let exprs = [...all.matchAll(new RegExp(`(?:^|\\n)[ \\t]*(?:export\\s+)?const\\s+${esc(name)}\\s*(?::[^=\\n]+)?=\\s*([^;\\n]+);`, 'g'))].map(m => m[1]);
    if (!exprs.length) {
        exprs = [...all.matchAll(new RegExp(`(?<![A-Za-z0-9_$.])${esc(name)}\\s*:\\s*(${NUM})(?![0-9.])`, 'g'))].map(m => m[1]);
    }
    if (!exprs.length) return { error: `${name} is not defined in the tree` };
    const values = exprs.map(x => evaluate(x, texts, depth));
    const bad = values.find(v => v.error);
    if (bad) return { error: `${name}: ${bad.error}` };
    const shown = values.map(v => JSON.stringify(v.value));
    if (new Set(shown).size !== 1) return { error: `${name} has disagreeing definitions ${[...new Set(shown)].join(' vs ')}` };
    return { value: values[0].value };
}

/**
 * Failure strings comparing the Canvas Geometry rows with the tree. `sources` maps a
 * repo-relative path to its text; `cssRel` is the stylesheet; `canvasRels` are the files
 * whose every top-level numeric const must have a row.
 */
export function geometryDiff(spec, sources, { canvasRels, cssRel }) {
    const fails = [];
    const { consts, css } = geometryRows(spec);
    if (!consts.length) fails.push('Canvas Geometry has ZERO const rows -- broken instrument (heading or Key form drifted)');
    if (!css.length) fails.push('Canvas Geometry has ZERO CSS rows -- broken instrument (heading or Key form drifted)');

    const codeTexts = Object.entries(sources).filter(([rel]) => rel !== cssRel).map(([, t]) => t);
    for (const row of consts) {
        const list = row.names.length === 1 && row.numbers.length > 1;
        if (!list && row.names.length !== row.numbers.length) {
            fails.push(`row '${row.key}': malformed -- ${row.names.length} name(s) against ${row.numbers.length} number(s)`);
            continue;
        }
        row.names.forEach((name, i) => {
            const want = list ? row.numbers : row.numbers[i];
            const got = resolveConst(name, codeTexts);
            if (got.error) {
                fails.push(`row '${row.key}': ${got.error}`);
            } else if (JSON.stringify(got.value) !== JSON.stringify(want)) {
                fails.push(`row '${row.key}': ${name} is ${JSON.stringify(got.value)} in the tree, the spec says ${JSON.stringify(want)}`);
            }
        });
    }

    const sheet = stripCssComments(sources[cssRel] ?? '');
    for (const row of css) {
        const decls = ruleBodies(sheet, row.selector).flatMap(body => body.split(';')
            .map(d => d.trim())
            .filter(d => d.split(':')[0].trim() === row.property)
            .map(d => d.slice(d.indexOf(':') + 1).trim()));
        if (decls.length !== 1) {
            fails.push(`row '${row.key}': ${row.selector} declares ${row.property} ${decls.length} time(s) in ${cssRel}, expected exactly once`);
            continue;
        }
        const px = /^(\d+(?:\.\d+)?)px$/.exec(decls[0]);
        if (!px || Number(px[1]) !== row.value) {
            fails.push(`row '${row.key}': ${row.selector} ${row.property} is '${decls[0]}' in ${cssRel}, the spec says ${row.value}px`);
        }
    }

    const declared = new Set(consts.flatMap(r => r.names));
    for (const rel of canvasRels) {
        for (const name of topLevelNumericConsts(sources[rel] ?? '').keys()) {
            if (!declared.has(name)) fails.push(`undeclared canvas constant ${name} (${rel})`);
        }
    }
    return fails;
}
