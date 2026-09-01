#!/usr/bin/env node
// scripts/verify-about-dialog-suppression.mjs
//
// The About dialog's debranding stylesheet hides stock Mozilla link rows. This
// script asserts that it hides the RIGHT ones, and that it still hides anything
// at all.
//
// WHY IT EXISTS. Plan 01-18 shipped `#bottomBox > hbox { display: none }` to
// remove two outbound mozilla.org links (UAT G-01-3). That container also holds
// the internal `about:license` disclosure -- the product's only in-UI route to
// its aggregated open-source licence text -- so the wholesale container rule
// took a legally-load-bearing link down with the vendor ones. Nothing went red,
// because nothing was comparing the selectors against the document they target.
// 01-VERIFICATION.md found it as Truth 9; 01-REVIEW.md found it independently
// as CR-01 and named the missing gate as WR-03.
//
// The two failure modes this closes are opposites, and a check for one is not a
// check for the other:
//
//   over-reach   a selector removes content it must not (the defect above).
//   under-reach  a selector matches nothing at all. Upstream owns
//                aboutDialog.xhtml and rewrites it on every ESR rebase; an id
//                rename turns every suppression selector into a silent no-op.
//                The CSS still parses, nothing errors, and mozilla.org links
//                reappear inside a Power-Browser-branded dialog.
//
// BOTH SIDES ARE DERIVED AT CHECK TIME (CLAUDE.md verification rule 2). The
// left side is whatever selectors the shipped stylesheets actually declare
// `display: none` for; the right side is whatever element tree the upstream
// markup actually contains. This file hand-keeps no list of expected ids,
// selectors, or hrefs -- a hand-kept list can only ever agree with the tree it
// was copied from, and would go green through both an addition and a removal.
// The only authored markup in this file is the --self-test fixture, which is a
// fault-planting harness rather than an expectation; the check never reads it
// outside --self-test.
//
// A MISSING INPUT IS A FAILURE, NEVER A SKIP. `upstream/` is the git-ignored
// clone scripts/fetch-upstream.sh materialises. When it is absent this script
// exits 1 naming the path and the fetch script. A check that goes green because
// it could not find its own subject is the green-by-construction shape recorded
// in deferred-items.md rows 4, 9 and 10.
//
// Usage:
//   node scripts/verify-about-dialog-suppression.mjs
//   node scripts/verify-about-dialog-suppression.mjs --self-test

import { readFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'verify-about-dialog-suppression';

const CSS_RELS = [
    'powerbrowser/branding/dev/content/aboutDialog.css',
    'powerbrowser/branding/release/content/aboutDialog.css',
];
const MARKUP_REL = 'upstream/browser/base/content/aboutDialog.xhtml';

// The one internal disclosure this check protects. It is not an expectation
// about upstream's markup -- assertion 4 requires the element to EXIST and
// fails when it does not, so this constant can never make the check vacuous.
const DISCLOSURE_HREF = 'about:license';

const args = process.argv.slice(2);
const SELF_TEST = args.includes('--self-test');
for (const a of args) {
    if (a !== '--self-test') {
        console.error(`${NAME}: FAIL -- unknown argument '${a}'`);
        process.exit(1);
    }
}

// --- assertion plumbing -----------------------------------------------------
//
// Failures accumulate rather than throwing: one run should report every wrong
// selector, not just the first.
function makeReporter() {
    const failures = [];
    return { failures, fail(msg) { failures.push(msg); } };
}

// --- left side: the selectors the shipped stylesheets actually suppress ------

// Every comma-separated selector of every rule whose declaration block carries
// `display: none`. Block comments are stripped first so a selector quoted in
// prose (this stylesheet's own comment block quotes several) is not collected
// as if it shipped.
export function parseSuppressionSelectors(css) {
    const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const out = [];
    const rule = /([^{}]+)\{([^{}]*)\}/g;
    let m;
    while ((m = rule.exec(stripped)) !== null) {
        if (!/display\s*:\s*none/i.test(m[2])) continue;
        for (const s of m[1].split(',')) {
            const t = s.trim();
            if (t) out.push(t);
        }
    }
    return out;
}

// --- right side: the element tree the upstream markup actually declares ------

// Tag name, id, class list, href, and parent link for every element. Comments,
// the XML declaration, the doctype, and the `#ifdef`/`#endif` preprocessor
// lines are removed first -- upstream's aboutDialog.xhtml carries all of them.
export function parseMarkup(xhtml) {
    const text = xhtml
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<\?[\s\S]*?\?>/g, '')
        .replace(/<!DOCTYPE[^>]*>/gi, '')
        .split('\n')
        .filter((l) => !/^\s*#/.test(l))
        .join('\n');

    const elements = [];
    const stack = [];
    const tag = /<(\/?)([A-Za-z][\w:.-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
    let m;
    while ((m = tag.exec(text)) !== null) {
        const [, closing, name, rawAttrs] = m;
        if (closing) {
            stack.pop();
            continue;
        }
        const selfClosing = /\/\s*$/.test(rawAttrs);
        const attrs = {};
        const attr = /([A-Za-z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
        let a;
        while ((a = attr.exec(rawAttrs)) !== null) {
            attrs[a[1]] = a[2] !== undefined ? a[2] : a[3];
        }
        const el = {
            tag: name,
            id: attrs.id ?? null,
            classes: (attrs.class ?? '').split(/\s+/).filter(Boolean),
            href: attrs.href ?? null,
            parent: stack.length ? stack[stack.length - 1] : null,
        };
        elements.push(el);
        if (!selfClosing) stack.push(el);
    }
    return elements;
}

// A human-readable rendering of one element, for failure messages. Callers need
// to see WHICH element a selector reached, not just that one did.
function describe(el) {
    let s = `<${el.tag}`;
    if (el.id !== null) s += ` id="${el.id}"`;
    if (el.classes.length) s += ` class="${el.classes.join(' ')}"`;
    if (el.href !== null) s += ` href="${el.href}"`;
    return `${s}>`;
}

// --- the selector grammar ---------------------------------------------------
//
// Exactly what the shipped stylesheet uses: a compound of optional tag name,
// optional #id, zero or more .class, and an optional [href^="value"] test;
// descendant (whitespace) and child (>) combinators. Anything outside that
// grammar throws, and runChecks turns the throw into a named FAIL. A selector
// this parser cannot read must never be silently skipped -- a skipped selector
// is an unchecked selector wearing a green row.

function tokenizeSelector(raw) {
    let out = '';
    let inBracket = false;
    let quote = null;
    for (const c of raw) {
        if (quote) {
            out += c;
            if (c === quote) quote = null;
            continue;
        }
        if (c === '"' || c === "'") { quote = c; out += c; continue; }
        if (c === '[') inBracket = true;
        if (c === ']') inBracket = false;
        if (!inBracket) {
            if (/\s/.test(c)) { out += ' '; continue; }
            if (c === '>') { out += ' > '; continue; }
        }
        out += c;
    }
    return out.trim().split(/ +/).filter(Boolean);
}

function parseCompound(token, full) {
    const bad = (why) =>
        new Error(`selector ${JSON.stringify(full)}: ${why} -- outside the grammar this checker supports (tag, #id, .class, [href^="value"], with descendant and > combinators)`);

    let rest = token;
    let attribute = null;
    const attrM = rest.match(/\[([^\]]*)\]$/);
    if (attrM) {
        const inner = attrM[1];
        const parsed = inner.match(/^href\^=(?:"([^"]*)"|'([^']*)')$/);
        if (!parsed) throw bad(`attribute test [${inner}] is unsupported`);
        attribute = { name: 'href', op: '^=', value: parsed[1] !== undefined ? parsed[1] : parsed[2] };
        rest = rest.slice(0, attrM.index);
    }

    const shape = rest.match(/^([A-Za-z][\w:-]*)?((?:[#.][\w-]+)*)$/);
    if (!shape) throw bad(`compound ${JSON.stringify(token)} is unreadable`);

    const compound = { tag: shape[1] ?? null, id: null, classes: [], attribute };
    for (const piece of (shape[2] ?? '').match(/[#.][\w-]+/g) ?? []) {
        if (piece[0] === '#') {
            if (compound.id !== null) throw bad(`compound ${JSON.stringify(token)} carries two ids`);
            compound.id = piece.slice(1);
        } else {
            compound.classes.push(piece.slice(1));
        }
    }
    if (compound.tag === null && compound.id === null && !compound.classes.length && attribute === null) {
        throw bad(`compound ${JSON.stringify(token)} selects nothing`);
    }
    return compound;
}

export function parseSelector(text) {
    const tokens = tokenizeSelector(text);
    if (!tokens.length) throw new Error(`selector ${JSON.stringify(text)}: empty`);

    const parts = [];
    let pending = 'descendant';
    let expectCompound = true;
    for (const t of tokens) {
        if (t === '>') {
            if (expectCompound) throw new Error(`selector ${JSON.stringify(text)}: '>' where a compound was expected`);
            pending = 'child';
            expectCompound = true;
            continue;
        }
        parts.push({ combinator: parts.length === 0 ? null : pending, compound: parseCompound(t, text) });
        pending = 'descendant';
        expectCompound = false;
    }
    if (expectCompound) throw new Error(`selector ${JSON.stringify(text)}: ends with a combinator`);
    return { text, parts };
}

function matchCompound(compound, el) {
    if (compound.tag !== null && el.tag !== compound.tag) return false;
    if (compound.id !== null && el.id !== compound.id) return false;
    for (const c of compound.classes) if (!el.classes.includes(c)) return false;
    if (compound.attribute !== null) {
        if (el.href === null) return false;
        if (!el.href.startsWith(compound.attribute.value)) return false;
    }
    return true;
}

// Right-to-left over the ancestor chain, the way a real selector engine does it.
export function matches(selector, el) {
    const step = (i, node) => {
        if (!node) return false;
        if (!matchCompound(selector.parts[i].compound, node)) return false;
        if (i === 0) return true;
        if (selector.parts[i].combinator === 'child') return step(i - 1, node.parent);
        for (let a = node.parent; a; a = a.parent) if (step(i - 1, a)) return true;
        return false;
    };
    return step(selector.parts.length - 1, el);
}

// --- the four assertions ----------------------------------------------------
//
// Rooted at a directory rather than at the repository so --self-test can point
// the whole check at a mktemp fixture.
export function runChecks(root) {
    const rep = makeReporter();

    const markupPath = join(root, MARKUP_REL);
    if (!existsSync(markupPath)) {
        rep.fail(
            `${MARKUP_REL} is missing under ${root}. It is the right-hand side of every assertion here, ` +
            `so without it this check has nothing to compare the shipped selectors against. Run ` +
            `scripts/fetch-upstream.sh to materialise the clone. This is a FAIL, never a skip.`,
        );
        return rep;
    }
    const elements = parseMarkup(readFileSync(markupPath, 'utf8'));

    // Assertion 1, right half: a markup walk that found no links has proven
    // nothing about which links survive.
    const links = elements.filter((e) => e.href !== null);
    if (links.length === 0) {
        rep.fail(
            `VACUOUS: ${MARKUP_REL} parsed to ${elements.length} element(s) and ZERO carrying an href. ` +
            `Every assertion below would pass having examined nothing.`,
        );
        return rep;
    }

    // Assertion 4, premise half: the disclosure link must exist upstream. If it
    // is gone, the check's subject is gone and the result is a FAIL, not a pass.
    const disclosure = elements.filter((e) => e.href === DISCLOSURE_HREF);
    if (disclosure.length === 0) {
        rep.fail(
            `MISSING PREMISE: no element in ${MARKUP_REL} carries href="${DISCLOSURE_HREF}". ` +
            `This check exists to prove that link survives debranding; upstream no longer offers it, ` +
            `so the product's in-UI route to its aggregated open-source licence text needs re-deciding ` +
            `rather than re-asserting.`,
        );
    }

    for (const rel of CSS_RELS) {
        const cssPath = join(root, rel);
        if (!existsSync(cssPath)) {
            rep.fail(`${rel} is missing under ${root}; the shipped suppression selectors cannot be derived.`);
            continue;
        }
        const raw = parseSuppressionSelectors(readFileSync(cssPath, 'utf8'));

        // Assertion 1, left half.
        if (raw.length === 0) {
            rep.fail(
                `VACUOUS: ${rel} declares ZERO \`display: none\` selectors. The debranding suppression is ` +
                `not shipping at all, and every assertion over the derived set would pass having checked nothing.`,
            );
            continue;
        }

        // Assertion 2: grammar totality. An unparsed selector is named, never skipped.
        const parsed = [];
        for (const text of raw) {
            try {
                parsed.push(parseSelector(text));
            } catch (e) {
                rep.fail(`${rel}: ${e.message}. An unreadable selector is an unchecked selector; extend the grammar rather than skipping it.`);
            }
        }

        for (const sel of parsed) {
            // Assertion 3 (WR-03): staleness. A selector matching nothing is a
            // silent no-op after an upstream rename.
            const hits = elements.filter((e) => matches(sel, e));
            if (hits.length === 0) {
                rep.fail(
                    `STALE: ${rel} suppresses ${JSON.stringify(sel.text)} but that selector matches NOTHING in ` +
                    `${MARKUP_REL}. The rule is a silent no-op -- the content it was written to hide is either ` +
                    `renamed or gone, and whatever replaced it is rendering.`,
                );
            }

            // Assertion 4: disclosure preservation. The selector must not reach
            // the licence link, nor any element on its ancestor chain -- hiding
            // an ancestor hides the link just as completely.
            for (const el of disclosure) {
                for (let node = el; node; node = node.parent) {
                    if (!matches(sel, node)) continue;
                    const through = node === el
                        ? 'the link element itself'
                        : `its ancestor ${describe(node)}`;
                    rep.fail(
                        `SUPPRESSES THE LICENCE DISCLOSURE: ${rel}'s selector ${JSON.stringify(sel.text)} matches ` +
                        `${through}, which hides ${describe(el)}. That link is the product's only in-UI route to its ` +
                        `aggregated open-source licence text (href="${DISCLOSURE_HREF}") and must survive debranding. ` +
                        `Qualify the selector so it reaches only the outbound vendor links.`,
                    );
                    break;
                }
            }
        }
    }

    return rep;
}

// --- --self-test ------------------------------------------------------------
//
// Hermetic: runChecks is called ONLY with the mkdtemp fixture path, never with
// REPO_ROOT, so this row needs no `upstream/` clone and belongs in --quick.
//
// The fixture's stylesheets are the REAL shipped files, copied. Its markup is
// authored -- a minimal mirror of upstream's three suppressed structures --
// because --quick must not depend on the git-ignored 1.1 GB clone. That is a
// real ceiling and it is recorded in deferred-items.md row 11: fixture drift
// can only weaken this self-test, never the gate, because the registered
// `about-dialog-suppression` row reads the real markup.
function fixtureMarkup() {
    return `<?xml version="1.0"?>
<!-- Authored fault-planting fixture, not an expectation. -->
<window id="aboutDialog">
  <html:div id="aboutDialogContainer">
    <description class="text-blurb" id="communityDesc">
      <label is="text-link" href="https://www.mozilla.org/"/>
      <label is="text-link" useoriginprincipal="true" href="about:credits"/>
    </description>
    <description class="text-blurb" id="contributeDesc">
      <label is="text-link" href="https://foundation.mozilla.org/"/>
      <label is="text-link" href="https://www.mozilla.org/contribute/"/>
    </description>
    <vbox id="bottomBox">
      <hbox pack="center">
        <label is="text-link" class="bottom-link" useoriginprincipal="true" href="about:license"/>
        <label is="text-link" class="bottom-link" href="https://www.mozilla.org/about/legal/terms/firefox/"/>
        <label is="text-link" class="bottom-link" href="https://www.mozilla.org/privacy/firefox/"/>
      </hbox>
      <description id="trademark"/>
    </vbox>
  </html:div>
</window>
`;
}

// Delete the whole rule whose declaration block carries `display: none`, along
// with the comment block that introduces it.
function dropSuppressionRule(css) {
    const d = css.indexOf('display: none');
    if (d < 0) throw new Error('fixture stylesheet carries no `display: none` rule to drop');
    const end = css.indexOf('}', d) + 1;
    const start = css.lastIndexOf('}', d) + 1;
    return `${css.slice(0, start)}\n${css.slice(end)}`;
}

function selfTest() {
    const dir = mkdtempSync(join(tmpdir(), 'about-dialog-suppression-selftest-'));
    let ok = true;

    const write = (rel, body) => {
        const p = join(dir, rel);
        mkdirSync(dirname(p), { recursive: true });
        writeFileSync(p, body);
    };
    const restore = () => {
        for (const rel of CSS_RELS) write(rel, readFileSync(join(REPO_ROOT, rel), 'utf8'));
        write(MARKUP_REL, fixtureMarkup());
    };

    // Each row: a label, a mutation of the fixture, and the substrings the
    // resulting red must contain. Requiring the message content -- not merely a
    // non-empty failure list -- is what makes a red informative rather than
    // decorative.
    const rows = [
        {
            label: '(a) internal-link suppression -- the pre-fix 01-18 selector, restored',
            plant() {
                for (const rel of CSS_RELS) {
                    const p = join(dir, rel);
                    write(rel, readFileSync(p, 'utf8').replace(
                        /#bottomBox > hbox > \.bottom-link\[href\^="[^"]*"\]/g,
                        '#bottomBox > hbox',
                    ));
                }
            },
            names: ['about:license', '#bottomBox > hbox'],
        },
        {
            label: '(b) stale selector -- upstream renames the bottom-row container',
            plant() {
                write(MARKUP_REL, fixtureMarkup().replace(/bottomBox/g, 'bottomBoxRenamed'));
            },
            names: ['STALE', '#bottomBox > hbox > .bottom-link'],
        },
        {
            label: '(c) empty derived selector set -- the suppression rule stops shipping',
            plant() {
                for (const rel of CSS_RELS) {
                    write(rel, dropSuppressionRule(readFileSync(join(dir, rel), 'utf8')));
                }
            },
            names: ['VACUOUS', 'ZERO'],
        },
        {
            label: '(d) missing premise -- upstream drops the licence disclosure link',
            plant() {
                write(MARKUP_REL, fixtureMarkup().split('\n').filter((l) => !l.includes('about:license')).join('\n'));
            },
            names: ['MISSING PREMISE', 'about:license'],
        },
    ];

    try {
        restore();

        // Control FIRST. A red after a plant proves nothing when the unmutated
        // fixture is already red for an unrelated reason.
        const control = runChecks(dir);
        if (control.failures.length !== 0) {
            console.error(`${NAME}: --self-test FAIL -- the unmutated fixture is already red, so a red after any plant would prove nothing:`);
            for (const f of control.failures) console.error(`  - ${f}`);
            ok = false;
        } else {
            console.log(`${NAME}: --self-test -- control: the unmutated fixture is GREEN`);
        }

        for (const row of rows) {
            restore();
            row.plant();
            const planted = runChecks(dir);
            const all = planted.failures.join('\n');
            const missing = row.names.filter((n) => !all.includes(n));
            if (planted.failures.length === 0) {
                console.error(`${NAME}: --self-test FAIL -- fault ${row.label} was NOT rejected`);
                ok = false;
            } else if (missing.length) {
                console.error(`${NAME}: --self-test FAIL -- fault ${row.label} went red, but the message does not name ${missing.map((m) => JSON.stringify(m)).join(', ')}`);
                for (const f of planted.failures) console.error(`  - ${f}`);
                ok = false;
            } else {
                console.log(`${NAME}: --self-test -- fault ${row.label} was REJECTED naming the drift: ${planted.failures[0]}`);
            }
        }
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }

    if (!ok) {
        console.error(`${NAME}: --self-test FAIL`);
        process.exit(1);
    }
    console.log(`${NAME}: --self-test PASS -- green control plus ${rows.length} planted faults, each red and each naming its drift`);
    process.exit(0);
}

if (SELF_TEST) selfTest();

const result = runChecks(REPO_ROOT);
if (result.failures.length > 0) {
    console.error(`${NAME}: FAIL -- ${result.failures.length} problem(s) with the About dialog's suppression selectors`);
    for (const f of result.failures) console.error(`  - ${f}`);
    process.exit(1);
}
console.log(`${NAME}: PASS -- every shipped suppression selector matches upstream markup and none reaches the ${DISCLOSURE_HREF} disclosure link`);
process.exit(0);
