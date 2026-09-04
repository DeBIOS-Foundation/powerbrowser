#!/usr/bin/env node
// scripts/verify-branding-preflight.mjs
//
// The cheap static gate that runs BEFORE the build. No compile, no browser, no
// objdir, no network -- it reads files off disk and exits in milliseconds.
//
// WHY IT EXISTS. Pitfall 6 measures a full tier-3 Gecko rebuild at ~39 minutes.
// Every display literal in this tree becomes a compiled define or a packaged
// resource, so a typo in `MOZ_APP_DISPLAYNAME` is not caught by anything until
// scripts/verify-branding-identity.mjs runs against a BUILT binary. That is a
// forty-minute feedback loop on a one-character mistake. This script closes it
// to about a second.
//
// WHY THE INVENTORY IS THE EXPECTED-VALUE SOURCE -- the load-bearing design
// decision in this file. Pitfall 1: the upstream project's own nine-character
// name -- spelled out only in inventory/brand-tokens.json, because every other
// file here is inside the D-18 scan's scope -- was
// simultaneously a display name and an identifier prefix, so a single global
// replace produces a build that SUCCEEDS, a window titled with the wrong
// string, and a verifier that AGREES -- because the same pass rewrote both the
// value and the expectation that checks it. That is not hypothetical here. The
// plan 01-02 rename pass left `scripts/verify-branding-identity.mjs`'s VARIANTS
// descriptor expecting `PowerBrowser Dev`, the space-less identifier form, and
// nothing in the tree disagreed with it: brand.ftl said one thing, the verifier
// expected another, and both had been written by the same automated pass.
//
// A check can only catch that if its expectation comes from somewhere neither
// the value nor the checker was produced from. `inventory/brand-tokens.json`'s
// `brand_display_expectations` block is that third source: hand-authored from
// the recorded identity decisions (D-09 as amended, D-10, D-12, D-13), never
// written by scripts/rename-brand.mjs (which is hard-excluded from every
// brand-display row by class and from every hand-write surface by site), and
// never read back out of the branding files. This script compares the branding
// files AND verify-branding-identity.mjs's own descriptor against it. Two
// sources agreeing with each other proves nothing when one pass wrote both;
// three sources agreeing, one of which no pass writes, is evidence.
//
// Usage:
//   node scripts/verify-branding-preflight.mjs
//   node scripts/verify-branding-preflight.mjs --self-test

import { readFileSync, existsSync, mkdtempSync, mkdirSync, readdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'verify-branding-preflight';

// The install-time placeholder the tracked .desktop entries carry in place of
// a checkout's absolute path (02-DESIGN-G-02-11.md, option-4-placeholder).
// A single literal, not derived from configuration.toml or generate.mjs:
// Pitfall 7 forbids this gate reading its expectation from the source the
// generator writes from, and the token is a fixed contract string, not a
// manifest value.
const DESKTOP_ROOT_TOKEN = '@POWERBROWSER_REPO_ROOT@';

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
// literal, not just the first. A single wrong value and eight right ones is a
// typo; nine wrong values is a whole surface that was never written.
function makeReporter() {
    const failures = [];
    return {
        failures,
        fail(msg) { failures.push(msg); },
        eq(label, actual, expected, where) {
            if (actual === expected) return true;
            failures.push(
                `${label}: ${where} carries ${JSON.stringify(actual)} but the inventory declares ` +
                `${JSON.stringify(expected)}`,
            );
            return false;
        },
    };
}

function readText(root, rel) {
    const p = join(root, rel);
    if (!existsSync(p)) return null;
    return readFileSync(p, 'utf8');
}

function countOccurrences(haystack, needle) {
    if (!needle) return 0;
    return haystack.split(needle).length - 1;
}

/**
 * An inventory value made safe to interpolate into a RegExp source.
 *
 * Every value this file reads comes out of inventory/brand-tokens.json, which
 * is hand-authored and, for identifier_form, entirely unconstrained. Dropped
 * into a pattern raw, a `.` is a wildcard that makes an assertion pass on a
 * value that is not the declared one -- and a `(` or `[` throws SyntaxError at
 * construction, uncaught, out of a gate. A check that can pass on the wrong
 * value is the tautology this whole file exists to prevent.
 */
function escapeForRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// `-brand-full-name = Power Browser Dev` -> "Power Browser Dev"
function ftlTerm(text, term) {
    const m = text.match(new RegExp(`^${term}\\s*=\\s*(.*)$`, 'm'));
    return m ? m[1].trim() : null;
}

// `brandFullName=Power Browser Dev` -> "Power Browser Dev"
function propTerm(text, key) {
    const m = text.match(new RegExp(`^${key}\\s*=\\s*(.*)$`, 'm'));
    return m ? m[1].trim() : null;
}

// `MOZ_APP_DISPLAYNAME="Power Browser Dev"` -> "Power Browser Dev"
function shellAssign(text, name) {
    const m = text.match(new RegExp(`^${name}="([^"]*)"`, 'm'));
    return m ? m[1] : null;
}

// `Name=Power Browser Dev` in a .desktop entry.
function desktopKey(text, key) {
    const m = text.match(new RegExp(`^${key}=(.*)$`, 'm'));
    return m ? m[1].trim() : null;
}

// --- the checks -------------------------------------------------------------

function runChecks(root) {
    const r = makeReporter();

    const invText = readText(root, 'inventory/brand-tokens.json');
    if (invText === null) {
        r.fail('inventory/brand-tokens.json does not exist -- there is no expected-value source, so nothing here could be checked');
        return r;
    }
    let inv;
    try {
        inv = JSON.parse(invText);
    } catch (err) {
        r.fail(`inventory/brand-tokens.json is not valid JSON (${err.message}) -- the expected-value source is unreadable`);
        return r;
    }

    const exp = inv.brand_display_expectations;
    if (!exp || typeof exp !== 'object') {
        r.fail(
            'inventory/brand-tokens.json has no `brand_display_expectations` block. This script has NO expectations of its ' +
            'own by design -- without that block it would have nothing to compare against and would exit 0 having asserted ' +
            'nothing, which is the silent pass it exists to prevent.',
        );
        return r;
    }

    // --- 1. the brand-display census -----------------------------------------
    //
    // Every `brand-display` row declares how many times its target must appear
    // in each named file. An empty row set is a FAILURE, not a clean run: a
    // check that scanned nothing exits 0 for exactly the same reason a check
    // that scanned everything and found nothing wrong does, and the exit code
    // cannot tell the two apart. This is the condition that catches an
    // inventory someone emptied, renamed a class in, or pointed at moved paths.
    const displayRows = (inv.tokens || []).filter((t) => t.class === 'brand-display');
    if (displayRows.length === 0) {
        r.fail(
            'the inventory carries ZERO `brand-display` rows, so this run checked no display literal at all. A clean result ' +
            'from an empty check set proves nothing -- it is indistinguishable from a clean result over a full one. Either ' +
            'the rows were removed or `class` was renamed; both are inventory bugs, not passes.',
        );
    }
    for (const row of displayRows) {
        for (const file of row.expected_files || []) {
            const text = readText(root, file);
            if (text === null) {
                r.fail(`brand-display census: ${file} is named by an inventory row but does not exist on disk`);
                continue;
            }
            const got = countOccurrences(text, row.target);
            if (got !== row.expected_count) {
                r.fail(
                    `brand-display census: ${file} contains the declared target ${JSON.stringify(row.target)} ` +
                    `${got} time(s), but the inventory row declares ${row.expected_count}`,
                );
            }
            const stale = countOccurrences(text, row.token);
            if (stale !== 0) {
                r.fail(
                    `brand-display census: ${file} still contains the pre-rename token ${JSON.stringify(row.token)} ` +
                    `${stale} time(s) -- it should be zero`,
                );
            }
        }
    }

    // --- 2. the per-variant display literals ---------------------------------
    //
    // Both halves of each variant's display surface -- brand.ftl and
    // brand.properties -- are compared against the SAME inventory value.
    // Reading only one let the two silently disagree within a variant, which is
    // the seam verify-branding-identity.mjs surface 4 was widened to close.
    for (const [variantId, variant] of Object.entries(exp.variants || {})) {
        const ftlPath = `${variant.branding_dir}/locales/en-US/brand.ftl`;
        const propPath = `${variant.branding_dir}/locales/en-US/brand.properties`;
        const confPath = `${variant.branding_dir}/configure.sh`;

        const ftl = readText(root, ftlPath);
        if (ftl === null) {
            r.fail(`variant ${variantId}: ${ftlPath} does not exist`);
        } else {
            r.eq(`variant ${variantId} brand-full-name`, ftlTerm(ftl, '-brand-full-name'), variant.brand_full_name, ftlPath);
            r.eq(`variant ${variantId} brand-short-name`, ftlTerm(ftl, '-brand-short-name'), variant.brand_short_name, ftlPath);
            r.eq(`variant ${variantId} brand-shorter-name`, ftlTerm(ftl, '-brand-shorter-name'), variant.brand_shorter_name, ftlPath);
            r.eq(`variant ${variantId} brand-shortcut-name`, ftlTerm(ftl, '-brand-shortcut-name'), variant.brand_shortcut_name, ftlPath);
            r.eq(`variant ${variantId} vendor-short-name`, ftlTerm(ftl, '-vendor-short-name'), exp.vendor_display, ftlPath);
            // Frozen on purpose (D-78): a small set of "requires Firefox"
            // compatibility strings interpolate this term, and byte-identical
            // UA/product naming is the same rationale applied to the
            // User-Agent. Asserted here so a future debranding pass that finds
            // it "missed" cannot quietly rebrand it.
            r.eq(`variant ${variantId} brand-product-name (FROZEN, D-78)`, ftlTerm(ftl, '-brand-product-name'), 'Firefox', ftlPath);
        }

        const prop = readText(root, propPath);
        if (prop === null) {
            r.fail(`variant ${variantId}: ${propPath} does not exist`);
        } else {
            r.eq(`variant ${variantId} brandFullName`, propTerm(prop, 'brandFullName'), variant.brand_full_name, propPath);
            r.eq(`variant ${variantId} brandShortName`, propTerm(prop, 'brandShortName'), variant.brand_short_name, propPath);
            r.eq(`variant ${variantId} brandShorterName`, propTerm(prop, 'brandShorterName'), variant.brand_shorter_name, propPath);
        }

        const conf = readText(root, confPath);
        if (conf === null) {
            r.fail(`variant ${variantId}: ${confPath} does not exist`);
        } else {
            r.eq(`variant ${variantId} MOZ_APP_DISPLAYNAME`, shellAssign(conf, 'MOZ_APP_DISPLAYNAME'), variant.app_display_name, confPath);
        }

        // --- 3. the desktop entry (Pitfall 4) --------------------------------
        //
        // Exec= and Icon= each carry the install-time placeholder token plus
        // the variant's relative objdir / branding_dir -- never a resolved
        // absolute path (02-DESIGN-G-02-11.md, option-4-placeholder). A tracked
        // entry carrying a real absolute path is wrong at every checkout but
        // the one that wrote it, so any `/`-leading segment outside the token
        // is a drift this section rejects by name below.
        const deskPath = variant.desktop_entry;
        const desk = readText(root, deskPath);
        if (desk === null) {
            r.fail(`variant ${variantId}: ${deskPath} does not exist`);
        } else {
            r.eq(`variant ${variantId} desktop Name`, desktopKey(desk, 'Name'), variant.app_display_name, deskPath);
            r.eq(`variant ${variantId} desktop StartupWMClass`, desktopKey(desk, 'StartupWMClass'), exp.app_basename, deskPath);

            const execLine = desktopKey(desk, 'Exec');
            const wantExec = `${DESKTOP_ROOT_TOKEN}/${variant.objdir}/dist/bin/${exp.app_basename} %u`;
            r.eq(`variant ${variantId} desktop Exec`, execLine, wantExec, deskPath);

            const iconLine = desktopKey(desk, 'Icon');
            const wantIcon = `${DESKTOP_ROOT_TOKEN}/${variant.branding_dir}/default128.png`;
            r.eq(`variant ${variantId} desktop Icon`, iconLine, wantIcon, deskPath);
            // The drift this branch can still catch, and what keeps this row
            // from being a tautology in the other direction: the expectation
            // above is token-shaped, so a whole-line equality alone is the
            // only thing standing between a planted absolute path and a green
            // run. A whitespace-separated fragment that starts with `/` yet
            // carries no token is a checkout-specific literal in a file that
            // must be identical at every checkout -- the legitimate
            // `@TOKEN@/relative/suffix` fragments all carry the token, and
            // the `%u` trailer starts with `%`, so neither trips this.
            // The offending fragment is reported, never the whole line.
            for (const [key, line] of [['Exec', execLine], ['Icon', iconLine]]) {
                if (line === null) continue;
                const stray = line.split(/\s+/).find((f) => f.startsWith('/') && !f.includes(DESKTOP_ROOT_TOKEN));
                if (stray !== undefined) {
                    r.fail(
                        `variant ${variantId} desktop ${key}: ${deskPath} carries an absolute path ` +
                        `${JSON.stringify(stray)} outside ${DESKTOP_ROOT_TOKEN}. The tracked entry ` +
                        'must be identical at every checkout; substitute the token at install time instead.',
                    );
                }
            }
            // The Exec target does not exist until the tree is built, and that
            // residual is accepted. The Icon target is a checked-in file, so a
            // broken one is a defect available now and is asserted now.
            const iconRel = `${variant.branding_dir}/default128.png`;
            if (!existsSync(join(root, iconRel))) {
                r.fail(`variant ${variantId}: the desktop entry's Icon target ${iconRel} does not exist on disk`);
            }
            // http and https scheme handlers matter for the browser-window
            // feature and must not be dropped when this file is rewritten.
            const mime = desktopKey(desk, 'MimeType') || '';
            for (const scheme of ['x-scheme-handler/http', 'x-scheme-handler/https']) {
                if (!mime.includes(scheme)) {
                    r.fail(`variant ${variantId}: ${deskPath} no longer registers ${scheme}`);
                }
            }
        }
    }

    // --- 4. the identity verifier's own descriptor ---------------------------
    //
    // THE ANTI-TAUTOLOGY CHECK. verify-branding-identity.mjs runs against a
    // BUILT binary and compares the branding files against its own VARIANTS
    // descriptor. Both of those were rewritten by the same rename pass, so they
    // can agree on a wrong value indefinitely. Here the descriptor is compared
    // against the inventory instead -- the one source that pass never touched.
    const identityPath = 'scripts/verify-branding-identity.mjs';
    const identity = readText(root, identityPath);
    if (identity === null) {
        r.fail(`${identityPath} does not exist -- the surface this check exists to cross-examine is missing`);
    } else {
        for (const [variantId, variant] of Object.entries(exp.variants || {})) {
            const block = identity.match(new RegExp(`\\n\\s{4}${variantId}:\\s*\\{([\\s\\S]*?)\\n\\s{4}\\},`));
            if (!block) {
                r.fail(`${identityPath}: no VARIANTS descriptor entry found for variant '${variantId}'`);
                continue;
            }
            const m = block[1].match(/brandFullName:\s*'([^']*)'/);
            r.eq(
                `${identityPath} VARIANTS.${variantId}.brandFullName`,
                m ? m[1] : null,
                variant.brand_full_name,
                identityPath,
            );
        }
        // The machine-side vendor, read back from application.ini's Vendor=.
        // A LITERAL comparison, not a pattern. Built as a RegExp this
        // interpolated an inventory value whose own schema permits `.`, `-`
        // and `_`, so a vendor of `Ac.e` became the wildcard `Ac.e` and matched
        // `Acme` -- the assertion passing on a vendor string that is not the
        // declared one, which is the exact tautology this file exists to
        // prevent. Nothing here needed pattern semantics in the first place.
        if (!identity.includes(`stockControl ? 'Mozilla' : '${exp.vendor_machine}'`)) {
            r.fail(
                `${identityPath} does not expect the machine-side vendor ${JSON.stringify(exp.vendor_machine)}. ` +
                'The version surface concatenates vendor and basename, so a wrong value here is a wrong `--version` string.',
            );
        }
    }

    // --- 5. the vendor split -------------------------------------------------
    //
    // Two distinct values by design. Collapsing them either puts a space in the
    // Firefox profile path (the display form is lowercased into it with no
    // space stripping) or ships a vendor string that is not the foundation's
    // name. The preflight asserts BOTH the distinctness and each side's site.
    if (exp.vendor_display === exp.vendor_machine) {
        r.fail(
            'the inventory declares the display-side and machine-side vendor as the SAME string. D-09 as amended splits them ' +
            'precisely because the machine-side value is lowercased into the profile path with no space stripping; a single ' +
            'value is either a space in a path or a wrong vendor name.',
        );
    }
    const patch = readText(root, 'patches/010-powerbrowser-identity.patch');
    if (patch === null) {
        r.fail('patches/010-powerbrowser-identity.patch does not exist -- the identity include hook has no declared site');
    } else {
        // 03-04: the machine-side vendor no longer lives in the patch stack.
        // The patch carries a single include() hook into generated output;
        // the value itself is asserted on the fragment below.
        if (!patch.includes('include("../identity.configure")')) {
            r.fail(
                'patches/010-powerbrowser-identity.patch does not carry the generated-identity include hook. ' +
                'The machine-side vendor must reach the build from generated output, not from a hard-coded patch line.',
            );
        }
        // Added lines only: the patch's own `-` removal of the upstream
        // Mozilla default is the de-configuration itself, not a hard-code.
        const addedHardCode = patch.split('\n').some(
            (l) => l.startsWith('+') && (l.includes('imply_option("MOZ_APP_VENDOR"') || l.includes('imply_option("MOZ_APP_UA_NAME"')),
        );
        if (addedHardCode) {
            r.fail(
                'patches/010-powerbrowser-identity.patch still hard-codes an identity brand value. ' +
                'Vendor and UA name live in generated/identity.configure now; the patch carries only the hook.',
            );
        }
    }
    const identityConfigure = readText(root, 'generated/identity.configure');
    if (identityConfigure === null) {
        r.fail('generated/identity.configure does not exist -- MOZ_APP_VENDOR has no declared site (run: node scripts/generate.mjs)');
    } else if (!identityConfigure.includes(`imply_option("MOZ_APP_VENDOR", "${exp.vendor_machine}")`)) {
        r.fail(
            `generated/identity.configure does not set MOZ_APP_VENDOR to ${JSON.stringify(exp.vendor_machine)}. ` +
            'This is the compiled, path-forming vendor; the display-side value belongs only in the branding files.',
        );
    }
    const mozconfig = readText(root, '.mozconfig');
    if (mozconfig === null) {
        r.fail('.mozconfig does not exist');
    } else {
        if (!mozconfig.includes(`--with-app-basename=${exp.app_basename}`)) {
            r.fail(`.mozconfig does not set --with-app-basename=${exp.app_basename}`);
        }
        if (!mozconfig.includes(`--with-distribution-id=${exp.distribution_id}`)) {
            r.fail(`.mozconfig does not set --with-distribution-id=${exp.distribution_id}`);
        }
    }

    // --- 6. the identifier form must never reach a display string ------------
    //
    // `PowerBrowser Dev` is exactly what a token-boundary rename produces, and
    // exactly what nothing else in this tree objects to. Matched with a
    // trailing space or quote so the legitimate identifier uses (class names,
    // symbol keys, PowerBrowserAPI) are untouched.
    const displaySurfaces = [];
    for (const variant of Object.values(exp.variants || {})) {
        displaySurfaces.push(
            `${variant.branding_dir}/locales/en-US/brand.ftl`,
            `${variant.branding_dir}/locales/en-US/brand.properties`,
            `${variant.branding_dir}/configure.sh`,
            variant.desktop_entry,
        );
    }
    displaySurfaces.push('theia/applications/browser/package.json');

    // The branding extension's browser sources are DERIVED, not enumerated.
    //
    // 01-07 hand-appended the welcome widget here after `<h1>PowerBrowser</h1>`
    // had sat in a display surface through the entire rename, unseen because
    // that one path was missing from this list. 01-08 fixes the class rather
    // than the site: a hand-kept list can only ever cover the file someone
    // remembered, and this directory is where display surfaces are authored, so
    // the set is read from the directory at check time. It therefore goes red
    // when a leaking surface is ADDED and red when the directory it derives
    // from DISAPPEARS -- neither of which an appended path can do.
    //
    // NOTE ON WHAT THIS SEES: this walks the FILESYSTEM, not the git index.
    // Unlike scan-brand-residue.mjs -- which iterates `git ls-files` and is
    // therefore blind to an unstaged new file -- a leaking surface here is
    // caught before it is ever staged.
    //
    // The variant files and the Theia application manifest above stay as
    // explicitly named files: they are specific declared paths whose source is
    // the inventory, not a directory whose membership can grow.
    const BRANDING_BROWSER_DIR = 'theia/extensions/branding/src/browser';
    let brandingSources = [];
    try {
        brandingSources = readdirSync(join(root, BRANDING_BROWSER_DIR))
            .filter((n) => n.endsWith('.ts') || n.endsWith('.tsx'))
            .sort()
            .map((n) => `${BRANDING_BROWSER_DIR}/${n}`);
    } catch {
        brandingSources = [];
    }
    if (brandingSources.length === 0) {
        // Same non-vacuity rule this file applies to its other derived sets: a
        // walk that yields nothing has not proven the surfaces are clean, it has
        // proven nothing at all.
        r.fail(
            `${BRANDING_BROWSER_DIR}/ yielded ZERO TypeScript source files, so the display-surface leak scan ` +
            'checked nothing. An empty derived set is a failure, not a clean run.',
        );
    }
    displaySurfaces.push(...brandingSources);

    // The shell's chrome markup is DERIVED TOO, from its packaging manifest.
    //
    // G-01-25: `<title>PowerBrowser</title>` sat in the shell's chrome document
    // through the entire rename and shipped as the OS window title -- the one
    // OS-level statement of which application owns the window. The leak pattern
    // below already matched it exactly (`PowerBrowser<` is a text node closing
    // its tag). The ONLY reason nothing went red is that this file was never in
    // the read set. The fix is therefore a READ SET, not a pattern.
    //
    // Derived from powerbrowser/shell/jar.mn at check time -- the same
    // manifest-derived file-set idiom scripts/verify-platform.sh's
    // shell-csp-inline-attrs already uses -- so a second chrome document is
    // covered the day it is packaged rather than the day someone remembers it.
    //
    // RESTRICTED TO MARKUP, deliberately. The same manifest also packages
    // powerbrowser.js, PowerBrowserAPI.sys.mjs and TheiaService.sys.mjs, whose
    // prose comments legitimately spell the identifier form followed by a space.
    // Widening the derivation to them would manufacture a false red rather than
    // close a hole, and a checker that cries wolf gets switched off. Markup is
    // where user-facing chrome text is authored, which is exactly the surface
    // class this section exists for.
    const SHELL_DIR = 'powerbrowser/shell';
    const shellManifest = readText(root, `${SHELL_DIR}/jar.mn`);
    const shellMarkup = shellManifest === null
        ? []
        : [...shellManifest.replace(/#.*/g, '').matchAll(/\(([^)]+\.x?html)\)/g)]
            .map((m) => `${SHELL_DIR}/${m[1]}`)
            .sort();
    if (shellMarkup.length === 0) {
        // The same non-vacuity rule the branding walk above applies: a
        // derivation that yields nothing has not proven the shell chrome is
        // clean, it has scanned nothing at all.
        r.fail(
            `${SHELL_DIR}/jar.mn yielded ZERO packaged markup files, so the display-surface leak scan ` +
            'never read the shell chrome. An empty derived set is a failure, not a clean run.',
        );
    }
    displaySurfaces.push(...shellMarkup);
    // `<` joins the space and the quote as a terminator for the same reason:
    // `PowerBrowser<` is a JSX text node closing its tag, i.e. a rendered
    // string, while `PowerBrowserWelcomeWidget` (a class name) and
    // `PowerBrowserAPI` remain untouched because the next character is a
    // letter. The identifier form's legitimate uses all continue into an
    // identifier; its illegitimate ones all end.
    // ESCAPED before interpolation. identifier_form is unconstrained in the
    // inventory, so a value carrying `(`, `[` or `+` either changed the match
    // semantics silently or threw SyntaxError at construction, uncaught. This
    // one genuinely needs pattern semantics for the `[ "<]` terminator class,
    // so escaping is the fix rather than a literal comparison.
    const leak = new RegExp(`${escapeForRegExp(exp.identifier_form)}[ "<]`);
    for (const rel of displaySurfaces) {
        const text = readText(root, rel);
        if (text === null) continue;
        for (const [i, line] of text.split('\n').entries()) {
            if (leak.test(line)) {
                r.fail(
                    `${rel}:${i + 1} leaks the IDENTIFIER form ${JSON.stringify(exp.identifier_form)} into a display ` +
                    `surface: ${JSON.stringify(line.trim())}. The display form has a space.`,
                );
            }
        }
    }
    const appPkg = readText(root, 'theia/applications/browser/package.json');
    if (appPkg !== null) {
        const m = appPkg.match(/"applicationName":\s*"([^"]*)"/);
        r.eq(
            'theia applicationName',
            m ? m[1] : null,
            exp.variants?.release?.brand_short_name,
            'theia/applications/browser/package.json',
        );
    }

    // --- 7. the mark and its Theia twin --------------------------------------
    //
    // brand/mark.svg is the source all ten rasters derive from;
    // powerbrowser-mark.ts carries the same markup inline as a data URI for the
    // tab-strip favicon. Nothing else in the tree would notice them drifting --
    // the module keeps compiling and the window icon and the favicon just
    // quietly stop being the same mark.
    const markSvg = readText(root, 'brand/mark.svg');
    const markTs = readText(root, 'theia/extensions/branding/src/browser/powerbrowser-mark.ts');
    if (markSvg === null) {
        r.fail('brand/mark.svg does not exist -- the ten rasters have no declared source');
    } else if (markTs === null) {
        r.fail('theia/extensions/branding/src/browser/powerbrowser-mark.ts does not exist');
    } else {
        const svgLine = markSvg.split('\n').find((l) => l.startsWith('<svg'));
        const tsMatch = markTs.match(/POWERBROWSER_MARK_SVG = `([\s\S]*?)`;/);
        if (!svgLine) {
            r.fail('brand/mark.svg has no single-line <svg> element to compare against');
        } else if (!tsMatch) {
            r.fail('powerbrowser-mark.ts does not export a POWERBROWSER_MARK_SVG template literal');
        } else if (tsMatch[1].trim() !== svgLine.trim()) {
            r.fail(
                'brand/mark.svg and powerbrowser-mark.ts\'s POWERBROWSER_MARK_SVG have DRIFTED. They are ' +
                'the same asset expressed twice; the window icon and the tab-strip favicon must be the same mark.',
            );
        }
        if (!/viewBox="0 0 128 128"/.test(markSvg)) {
            r.fail('brand/mark.svg is not square (viewBox must be "0 0 128 128") -- Gecko\'s icon slots are square and a non-square source silently reintroduces the magic render sizes');
        }
        if (!/prefers-color-scheme: dark/.test(markSvg)) {
            r.fail('brand/mark.svg has lost its prefers-color-scheme dual fill -- a single-fill mark is invisible on one of the two tab-strip themes');
        }

        // WHICH THEME EACH SURFACE FOLLOWS, asserted per surface.
        //
        // The dual fill above is correct for the FAVICON, which is OS chrome,
        // and wrong for the two in-shell surfaces, which sit on the Theia
        // theme's own background: prefers-color-scheme inside a data-URI <img>
        // follows the OS, so on a light-mode OS those two drew #1a1a1a on a
        // #1a1a1a-family background and the mark vanished. Asserting only that
        // the dual fill is preserved -- which is all this section used to do --
        // locked that defect in.
        if (!/export function powerBrowserMarkInline\b/.test(markTs)) {
            r.fail('powerbrowser-mark.ts no longer exports powerBrowserMarkInline -- the in-shell surfaces have no theme-correct mark and fall back to the OS-driven one, which is invisible on one OS/theme combination');
        } else if (!/currentColor/.test(markTs)) {
            r.fail('powerbrowser-mark.ts\'s inline mark no longer resolves its fill through currentColor, so it stops following the Theia theme');
        }

        // The split, from the consumer side, asserted FROM BOTH DIRECTIONS.
        //
        // The positive half alone does not discriminate, and that was found by
        // planting the fault rather than by reasoning about it: swapping a
        // render site back to the OS-driven variant leaves the import of the
        // theme-correct one in place, so "the file mentions the right name"
        // stays true while the rendered mark is wrong. The forbidden name is
        // what actually goes red, because a file that renders one variant has
        // no reason to name the other at all.
        const OS_THEMED = 'POWERBROWSER_MARK_DATA_URI';
        const THEIA_THEMED = 'powerBrowserMarkInline';
        const MARK_CONSUMERS = [
            {
                rel: 'theia/extensions/branding/src/browser/powerbrowser-favicon-contribution.ts',
                wants: OS_THEMED, forbids: THEIA_THEMED,
                why: 'the favicon is OS chrome and follows the OS theme, which is what the dual fill is for',
            },
            {
                rel: 'theia/extensions/branding/src/browser/powerbrowser-about-dialog.tsx',
                wants: THEIA_THEMED, forbids: OS_THEMED,
                why: 'it renders on the Theia shell background and must follow the THEIA theme -- the OS-driven mark is invisible there on a light-mode OS',
            },
            {
                rel: 'theia/extensions/branding/src/browser/powerbrowser-welcome-widget.tsx',
                wants: THEIA_THEMED, forbids: OS_THEMED,
                why: 'it renders on the Theia shell background and must follow the THEIA theme -- the OS-driven mark is invisible there on a light-mode OS',
            },
        ];
        for (const consumer of MARK_CONSUMERS) {
            const text = readText(root, consumer.rel);
            if (text === null) {
                r.fail(`${consumer.rel} does not exist -- a declared consumer of the mark is missing`);
                continue;
            }
            if (!text.includes(consumer.wants)) {
                r.fail(`${consumer.rel} does not use ${consumer.wants}: ${consumer.why}`);
            }
            if (text.includes(consumer.forbids)) {
                r.fail(`${consumer.rel} uses ${consumer.forbids}, which follows the wrong theme for it: ${consumer.why}`);
            }
        }
    }

    // --- 8. no Mozilla brand colour under our branding directory -------------
    //
    // These are coincidental-class inventory rows with expected_count 0. They
    // are invisible to the residual scan, which matches brand TOKENS, never a
    // hex -- which is how they survived the whole rename unnoticed.
    for (const row of (inv.tokens || []).filter((t) => t.class === 'coincidental' && t.expected_count === 0)) {
        for (const file of row.expected_files || []) {
            const text = readText(root, file);
            if (text === null) continue;
            const n = countOccurrences(text, row.token);
            if (n !== 0) {
                r.fail(
                    `${file} contains ${JSON.stringify(row.token)} ${n} time(s); the inventory declares it must be zero. ` +
                    `Replacement: ${JSON.stringify(row.target)}.`,
                );
            }
        }
    }

    // --- 9. every branding chrome resource is actually packaged --------------
    //
    // The class fix for G-01-3. `content/aboutDialog.css` sat in both branding
    // content directories from 01-03 onward while neither `content/jar.mn`
    // named it, so `chrome://branding/content/aboutDialog.css` -- referenced by
    // upstream's own aboutDialog.xhtml linkset -- 404'd silently for the file's
    // whole life. Nothing was red. The stylesheet's restyle never applied and
    // the stock link rows it could have suppressed stayed on screen. That was
    // not a typo; it was a resource with no packaging line and no gate that
    // could notice one was missing.
    //
    // THE SET IS READ FROM THE DIRECTORY at check time, never kept here. A
    // literal list of expected resources could only ever agree with the tree it
    // was copied from, which is precisely the defect: the file was present and
    // the manifest was the thing that had forgotten it.
    //
    // SCOPE. Only the branding content directories. `powerbrowser/shell/`
    // deliberately mixes chrome resources with non-chrome files
    // (`components.conf`, the sidecar script), so applying the same rule there
    // would need a hand-kept exclusion list -- which is the thing this repo's
    // verification rules forbid, and the thing that fails open.
    const CONTENT_BUILD_INPUTS = new Set(['jar.mn', 'moz.build']);
    const packagedDestinations = {};
    for (const [variantName, variant] of Object.entries(exp.variants || {})) {
        const contentRel = `${variant.branding_dir}/content`;
        let resources;
        try {
            resources = readdirSync(join(root, contentRel))
                .filter((n) => !CONTENT_BUILD_INPUTS.has(n))
                .sort();
        } catch {
            r.fail(`${contentRel}/ does not exist, so the ${variantName} branding chrome package's payload could not be checked at all`);
            continue;
        }
        if (resources.length === 0) {
            // The same non-vacuity rule this file applies to its other derived
            // sets: a walk that found nothing has proven nothing.
            r.fail(
                `${contentRel}/ yielded ZERO chrome resources, so the packaging-completeness check verified nothing. ` +
                'An empty derived set is a failure, not a clean run.',
            );
            continue;
        }
        const manifestRel = `${contentRel}/jar.mn`;
        const manifest = readText(root, manifestRel);
        if (manifest === null) {
            r.fail(`${manifestRel} does not exist, so ${resources.length} chrome resource(s) in ${contentRel}/ ship nowhere`);
            continue;
        }
        // A packaging line is `<destination> (<source>)`, once `#` comments are
        // stripped. `browser.jar:` and the `% content branding %...` package
        // registration carry no parenthesised source and are skipped by shape.
        const entries = [];
        for (const raw of manifest.split('\n')) {
            const m = raw.split('#')[0].trim().match(/^(\S+)\s+\((\S+)\)$/);
            if (m) entries.push({ destination: m[1], source: m[2] });
        }
        packagedDestinations[variantName] = new Set(entries.map((e) => e.destination));
        const sources = new Set(entries.map((e) => e.source));

        // (a) ADDITION direction -- the G-01-3 defect itself.
        for (const res of resources) {
            if (!sources.has(res)) {
                r.fail(
                    `${contentRel}/${res} is a chrome resource that ${manifestRel} does not package. ` +
                    'It will not ship, and every chrome:// reference to it will 404 SILENTLY -- which is exactly ' +
                    'how the branding aboutDialog.css stayed dead from 01-03 to 01-18. Add a packaging line.',
                );
            }
        }

        // (b) REMOVAL direction -- a manifest naming a file that is gone.
        for (const e of entries) {
            if (!existsSync(join(root, contentRel, e.source))) {
                r.fail(
                    `${manifestRel} packages ${JSON.stringify(e.source)} into ${JSON.stringify(e.destination)}, but that ` +
                    `source does not exist relative to ${contentRel}/. Deleting a shipped resource must not stay green.`,
                );
            }
        }
    }

    // (c) DIVERGENCE direction -- fix one variant, forget the other. A live
    // risk here because every branding change in this tree is written twice.
    const packagedVariants = Object.keys(packagedDestinations).sort();
    for (let i = 1; i < packagedVariants.length; i++) {
        const a = packagedVariants[0];
        const b = packagedVariants[i];
        const setA = packagedDestinations[a];
        const setB = packagedDestinations[b];
        const onlyA = [...setA].filter((d) => !setB.has(d)).sort();
        const onlyB = [...setB].filter((d) => !setA.has(d)).sort();
        if (onlyA.length || onlyB.length) {
            r.fail(
                `the ${a} and ${b} branding manifests package DIFFERENT destination sets -- ` +
                `only in ${a}: ${JSON.stringify(onlyA)}; only in ${b}: ${JSON.stringify(onlyB)}. ` +
                'The two variants are byte-identical by design; a one-sided packaging fix is a half fix.',
            );
        }
    }

    // --- 10. the welcome widget reads its display name at runtime ------------
    //
    // GEN-05 (04-01): the welcome heading is the one Theia display surface
    // that resolves at runtime instead of at generate time. Three
    // assertions, all read off the live source:
    //
    // (a) the read: the widget resolves its heading through
    // FrontendApplicationConfigProvider's applicationName -- a heading that
    // stops reading the provider is a per-rebrand TypeScript edit again.
    // (b) the fallback: the file still carries the expected display name as
    // a quoted literal -- the boot fallback where the provider is unset.
    // (c) the render: no line paints the display name as JSX text -- the
    // literal may appear in code, never as a rendered string.
    //
    // The expected VALUE comes from the inventory's brand_display_expectations
    // (release short name), never the manifest: this file's whole design
    // forbids reading the manifest as expectation source.
    const WELCOME_WIDGET_REL = 'theia/extensions/branding/src/browser/powerbrowser-welcome-widget.tsx';
    const welcomeWidget = readText(root, WELCOME_WIDGET_REL);
    if (welcomeWidget === null) {
        r.fail(`${WELCOME_WIDGET_REL} does not exist -- the welcome tab has no declared read site`);
    } else {
        if (!welcomeWidget.includes('FrontendApplicationConfigProvider') || !welcomeWidget.includes('.applicationName')) {
            r.fail(
                `${WELCOME_WIDGET_REL} does not resolve its heading through FrontendApplicationConfigProvider's applicationName. ` +
                'A heading that stops reading the provider is a per-rebrand TypeScript edit again.',
            );
        }
        const runtimeName = exp.variants?.release?.brand_short_name;
        if (typeof runtimeName !== 'string' || runtimeName === '') {
            r.fail('the inventory declares no release brand_short_name, so the welcome fallback has no expected value');
        } else {
            if (!welcomeWidget.includes(`'${runtimeName}'`) && !welcomeWidget.includes(`"${runtimeName}"`)) {
                r.fail(
                    `${WELCOME_WIDGET_REL} does not carry the boot fallback ${JSON.stringify(runtimeName)} as a quoted literal. ` +
                    'Without it the tree cannot boot where the provider is unset.',
                );
            }
            // ESCAPED before interpolation, like the section 6 leak pattern:
            // brand_short_name is hand-authored and unconstrained, so a value
            // carrying pattern syntax must not change the match semantics.
            const rendered = new RegExp(`>\\s*${escapeForRegExp(runtimeName)}\\s*<`);
            for (const [i, line] of welcomeWidget.split('\n').entries()) {
                if (rendered.test(line)) {
                    r.fail(
                        `${WELCOME_WIDGET_REL}:${i + 1} paints the display literal as rendered text: ${JSON.stringify(line.trim())}. ` +
                        'Resolve it through the provider instead; the literal may appear in code, never in render.',
                    );
                }
            }
        }
    }

    return r;
}

// --- --self-test ------------------------------------------------------------
//
// Plants a fixture whose display literal disagrees with its inventory row and
// asserts this script rejects it, naming the offending file and BOTH values. A
// verifier that has never been seen to go red is a verifier nobody has checked.
function selfTest() {
    const dir = mkdtempSync(join(tmpdir(), 'branding-preflight-selftest-'));
    let ok = true;
    try {
        // Mirror the real tree's shape, then mutate exactly one literal.
        const copy = [
            'inventory/brand-tokens.json',
            '.mozconfig',
            'patches/010-powerbrowser-identity.patch',
            // Section 5 reads the generated identity carrier alongside the
            // patch hook (03-04): the fixture carries the fragment so the
            // unmutated control stays green and the hook plant below has a
            // carrier to corrupt.
            'generated/identity.configure',
            'scripts/verify-branding-identity.mjs',
            'theia/applications/browser/package.json',
            'brand/mark.svg',
            'powerbrowser/powerbrowser.desktop',
            'powerbrowser/powerbrowser-release.desktop',
            'LICENSE',
            // Section 6 derives the shell's markup set from this manifest, so
            // the fixture needs BOTH: a fixture missing the manifest would
            // exercise the new derived set vacuously and the plant below would
            // land in a file the fixture does not contain.
            'powerbrowser/shell/jar.mn',
            'powerbrowser/shell/powerbrowser.xhtml',
        ];
        for (const v of ['dev', 'release']) {
            copy.push(
                `powerbrowser/branding/${v}/locales/en-US/brand.ftl`,
                `powerbrowser/branding/${v}/locales/en-US/brand.properties`,
                `powerbrowser/branding/${v}/configure.sh`,
                `powerbrowser/branding/${v}/content/aboutDialog.css`,
                // Section 9 reads the content directory and then requires every
                // manifest source to resolve, so the fixture needs the manifest
                // AND all five icons it reaches through `../`. Without them the
                // removal direction would be red on the UNMUTATED control and a
                // red after the plant below would prove nothing.
                `powerbrowser/branding/${v}/content/jar.mn`,
                `powerbrowser/branding/${v}/default16.png`,
                `powerbrowser/branding/${v}/default32.png`,
                `powerbrowser/branding/${v}/default48.png`,
                `powerbrowser/branding/${v}/default64.png`,
                `powerbrowser/branding/${v}/default128.png`,
            );
        }
        // The WHOLE branding browser directory, not one remembered file from
        // it. Section 6 now derives its display-surface set by walking this
        // directory, so a fixture carrying a single file would exercise the
        // derived walk vacuously -- it would have almost nothing to walk, and
        // the plant below would land in a file the fixture does not contain.
        const brandingDir = 'theia/extensions/branding/src/browser';
        for (const name of readdirSync(join(REPO_ROOT, brandingDir))) {
            if (name.endsWith('.ts') || name.endsWith('.tsx')) copy.push(`${brandingDir}/${name}`);
        }

        for (const rel of copy) {
            const src = join(REPO_ROOT, rel);
            if (!existsSync(src)) continue;
            const dst = join(dir, rel);
            mkdirSync(dirname(dst), { recursive: true });
            writeFileSync(dst, readFileSync(src));
        }

        // Control: the unmutated copy must be GREEN. Without this, a self-test
        // that plants a mutation and sees red proves nothing -- the fixture
        // might be red for an unrelated reason and the plant irrelevant.
        const control = runChecks(dir);
        if (control.failures.length !== 0) {
            console.error(`${NAME}: --self-test FAIL -- the unmutated fixture is already red, so a red result after the plant would prove nothing:`);
            for (const f of control.failures) console.error(`  - ${f}`);
            ok = false;
        }

        // The plant: the space-less identifier form in a display literal, which
        // is exactly what a token-boundary rename produces.
        const ftlRel = 'powerbrowser/branding/dev/locales/en-US/brand.ftl';
        const ftlPath = join(dir, ftlRel);
        writeFileSync(
            ftlPath,
            readFileSync(ftlPath, 'utf8').replace('-brand-full-name = Power Browser Dev', '-brand-full-name = PowerBrowser Dev'),
        );

        const planted = runChecks(dir);
        if (planted.failures.length === 0) {
            console.error(`${NAME}: --self-test FAIL -- the planted mismatch (\`PowerBrowser Dev\` for \`Power Browser Dev\`) was NOT rejected`);
            ok = false;
        } else {
            const all = planted.failures.join('\n');
            const namesFile = all.includes(ftlRel);
            const namesActual = all.includes('PowerBrowser Dev');
            const namesExpected = all.includes('Power Browser Dev');
            if (!namesFile || !namesActual || !namesExpected) {
                console.error(`${NAME}: --self-test FAIL -- the rejection message must name the offending file and BOTH disagreeing values`);
                console.error(`  names the file (${ftlRel}): ${namesFile}`);
                console.error(`  names the actual value ("PowerBrowser Dev"): ${namesActual}`);
                console.error(`  names the expected value ("Power Browser Dev"): ${namesExpected}`);
                for (const f of planted.failures) console.error(`  - ${f}`);
                ok = false;
            } else {
                console.log(`${NAME}: --self-test -- planted \`PowerBrowser Dev\` in ${ftlRel} and it was REJECTED, naming the file and both values:`);
                for (const f of planted.failures) console.log(`  - ${f}`);
            }
        }

        // Second plant (01-08): the identifier form as a JSX text node in the
        // About dialog's copy. This is the same plant-and-require-red shape as
        // the branding-term plant above, aimed at the DERIVED half of the
        // display-surface set: the About dialog is reached only because section
        // 6 walks the branding browser directory, never because anyone
        // remembered to append its path. It is also the exact defect this plan
        // closes -- `<h3>PowerBrowser</h3>` shipped as rendered display text
        // while both guards that should have seen it stayed green.
        writeFileSync(ftlPath, readFileSync(join(REPO_ROOT, ftlRel)));
        const aboutRel = 'theia/extensions/branding/src/browser/powerbrowser-about-dialog.tsx';
        const aboutPath = join(dir, aboutRel);
        const aboutOriginal = readFileSync(aboutPath, 'utf8');
        writeFileSync(aboutPath, aboutOriginal.replace('<h3>Power Browser</h3>', '<h3>PowerBrowser</h3>'));
        const aboutPlanted = runChecks(dir);
        const aboutMsg = aboutPlanted.failures.find((f) => f.includes(aboutRel) && f.includes('IDENTIFIER form'));
        if (!aboutMsg) {
            console.error(`${NAME}: --self-test FAIL -- the identifier form planted as a JSX text node in ${aboutRel} was NOT rejected; the derived display-surface walk did not reach it`);
            for (const f of aboutPlanted.failures) console.error(`  - ${f}`);
            ok = false;
        } else {
            console.log(`${NAME}: --self-test -- planted the identifier form in ${aboutRel} and it was REJECTED by the DERIVED surface walk: ${aboutMsg}`);
        }
        writeFileSync(aboutPath, aboutOriginal);

        // Third plant: an inventory with zero brand-display rows must FAIL
        // with a distinct message, never pass silently having checked nothing.
        writeFileSync(ftlPath, readFileSync(join(REPO_ROOT, ftlRel)));
        const invPath = join(dir, 'inventory/brand-tokens.json');
        const inv = JSON.parse(readFileSync(invPath, 'utf8'));
        inv.tokens = inv.tokens.filter((t) => t.class !== 'brand-display');
        writeFileSync(invPath, JSON.stringify(inv, null, 2));
        const emptied = runChecks(dir);
        const emptyMsg = emptied.failures.find((f) => f.includes('ZERO `brand-display` rows'));
        if (!emptyMsg) {
            console.error(`${NAME}: --self-test FAIL -- an inventory with zero brand-display rows was not rejected with a distinct message; an empty check set exited as if it were a clean one`);
            ok = false;
        } else {
            console.log(`${NAME}: --self-test -- an emptied brand-display row set was REJECTED: ${emptyMsg}`);
        }

        // Fourth plant (01-18): the EXACT pre-fix state of the G-01-3 defect --
        // delete the aboutDialog.css packaging line from the dev manifest, so a
        // chrome resource sits in the content directory with nothing shipping
        // it. Section 9 must go red NAMING the unpackaged file; a red that only
        // says something is wrong would not have told anyone which file 404'd.
        writeFileSync(invPath, readFileSync(join(REPO_ROOT, 'inventory/brand-tokens.json')));
        const jarRel = 'powerbrowser/branding/dev/content/jar.mn';
        const unpackagedRel = 'powerbrowser/branding/dev/content/aboutDialog.css';
        const jarPath = join(dir, jarRel);
        const jarOriginal = readFileSync(jarPath, 'utf8');
        writeFileSync(
            jarPath,
            jarOriginal.split('\n').filter((l) => !/\(aboutDialog\.css\)\s*$/.test(l)).join('\n'),
        );
        const unpackaged = runChecks(dir);
        const unpackagedMsg = unpackaged.failures.find((f) => f.includes(unpackagedRel) && f.includes('does not package'));
        if (!unpackagedMsg) {
            console.error(`${NAME}: --self-test FAIL -- a chrome resource with no packaging line (${unpackagedRel}, the pre-fix G-01-3 state) was NOT rejected by name`);
            for (const f of unpackaged.failures) console.error(`  - ${f}`);
            ok = false;
        } else {
            console.log(`${NAME}: --self-test -- removed the packaging line for ${unpackagedRel} and it was REJECTED by name: ${unpackagedMsg}`);
        }
        writeFileSync(jarPath, jarOriginal);

        // Fifth plant (01-19): the EXACT pre-fix state of the G-01-25 defect --
        // the identifier form back in the shell chrome document's title, which
        // is the literal Gecko's AppWindow hands the window manager for the
        // window's whole lifetime. Section 6 must go red NAMING the file, the
        // line number and the offending text. The shell markup is reached only
        // because that set is DERIVED from powerbrowser/shell/jar.mn, never
        // because anyone remembered to append the path -- which is precisely
        // why this leak survived the rename.
        const shellRel = 'powerbrowser/shell/powerbrowser.xhtml';
        const shellPath = join(dir, shellRel);
        const shellOriginal = readFileSync(shellPath, 'utf8');
        writeFileSync(shellPath, shellOriginal.replace('<title>Power Browser</title>', '<title>PowerBrowser</title>'));
        const shellPlanted = runChecks(dir);
        const shellMsg = shellPlanted.failures.find(
            (f) => f.includes(`${shellRel}:`) && f.includes('IDENTIFIER form') && f.includes('<title>PowerBrowser</title>'),
        );
        if (!shellMsg) {
            console.error(`${NAME}: --self-test FAIL -- the identifier form planted in ${shellRel}'s chrome document title (the pre-fix G-01-25 state) was NOT rejected naming the file and the offending line; the derived shell-markup set did not reach it`);
            for (const f of shellPlanted.failures) console.error(`  - ${f}`);
            ok = false;
        } else {
            console.log(`${NAME}: --self-test -- planted the identifier form in ${shellRel}'s title and it was REJECTED by the DERIVED shell-markup set: ${shellMsg}`);
        }
        writeFileSync(shellPath, shellOriginal);

        // Sixth plant (02-08, option-4-placeholder): a literal absolute path
        // where the install-time token belongs -- the drift the token design
        // can still catch, and the reason the desktop row is not a tautology
        // in the other direction. The foreign root is derived from REPO_ROOT,
        // never typed as a literal, so no machine path is spelled out here --
        // and it is a sibling this tree has never lived at, so no line of
        // this output carries this checkout's own path either.
        const deskRel = 'powerbrowser/powerbrowser.desktop';
        const deskPath = join(dir, deskRel);
        const deskOriginal = readFileSync(deskPath, 'utf8');
        const foreignRoot = `${dirname(REPO_ROOT)}/foreign-checkout-pb`;
        writeFileSync(deskPath, deskOriginal.split(DESKTOP_ROOT_TOKEN).join(foreignRoot));
        const deskPlanted = runChecks(dir);
        const deskMsg = deskPlanted.failures.find((f) => f.includes(deskRel) && f.includes(foreignRoot));
        if (!deskMsg) {
            console.error(`${NAME}: --self-test FAIL -- a literal absolute path planted where ${DESKTOP_ROOT_TOKEN} belongs (${deskRel}) was NOT rejected naming the file and the offending value`);
            for (const f of deskPlanted.failures) console.error(`  - ${f}`);
            ok = false;
        } else {
            console.log(`${NAME}: --self-test -- planted a literal absolute path where the token belongs in ${deskRel} and it was REJECTED naming the file and the offending value: ${deskMsg}`);
        }
        writeFileSync(deskPath, deskOriginal);

        // Seventh plant (03-04): the pre-deconfiguration patch shape -- the
        // include hook stripped back out, so the carrier the build actually
        // reads has no hook reaching it. Section 5 must go red NAMING the
        // patch; a red that only says the vendor disagrees would not tell
        // anyone the hook is what went missing.
        const hookPatchRel = 'patches/010-powerbrowser-identity.patch';
        const hookPatchPath = join(dir, hookPatchRel);
        const hookPatchOriginal = readFileSync(hookPatchPath, 'utf8');
        writeFileSync(
            hookPatchPath,
            hookPatchOriginal.split('\n').filter((l) => !l.includes('include("../identity.configure")')).join('\n'),
        );
        const hookPlanted = runChecks(dir);
        const hookMsg = hookPlanted.failures.find((f) => f.includes(hookPatchRel) && f.includes('include hook'));
        if (!hookMsg) {
            console.error(`${NAME}: --self-test FAIL -- the include hook stripped from ${hookPatchRel} (the pre-03-04 shape) was NOT rejected naming the file and the hook`);
            for (const f of hookPlanted.failures) console.error(`  - ${f}`);
            ok = false;
        } else {
            console.log(`${NAME}: --self-test -- stripped the include hook from ${hookPatchRel} and it was REJECTED by name: ${hookMsg}`);
        }
        writeFileSync(hookPatchPath, hookPatchOriginal);

        // Eighth plant (04-01): the pre-tracer render -- the welcome heading
        // back as a JSX literal, the exact line the runtime read replaced.
        // Section 10 must go red NAMING the file, the line number and the
        // offending text; a red that only says something disagrees would not
        // tell anyone the heading is a per-rebrand edit again.
        const widgetRel = 'theia/extensions/branding/src/browser/powerbrowser-welcome-widget.tsx';
        const widgetPath = join(dir, widgetRel);
        const widgetOriginal = readFileSync(widgetPath, 'utf8');
        writeFileSync(widgetPath, widgetOriginal.replace('<h1>{this.displayName}</h1>', '<h1>Power Browser</h1>'));
        const widgetPlanted = runChecks(dir);
        const widgetMsg = widgetPlanted.failures.find(
            (f) => f.includes(`${widgetRel}:`) && f.includes('rendered text') && f.includes('<h1>Power Browser</h1>'),
        );
        if (!widgetMsg) {
            console.error(`${NAME}: --self-test FAIL -- the display literal planted as rendered JSX text in ${widgetRel} (the pre-04-01 shape) was NOT rejected naming the file, the line and the offending text`);
            for (const f of widgetPlanted.failures) console.error(`  - ${f}`);
            ok = false;
        } else {
            console.log(`${NAME}: --self-test -- planted the display literal as rendered text in ${widgetRel} and it was REJECTED naming the file and the offending line: ${widgetMsg}`);
        }
        writeFileSync(widgetPath, widgetOriginal);

        // Ninth plant (04-01): the runtime read broken -- the provider call
        // replaced by the fallback constant, so the heading compiles and
        // renders yet no longer follows a rebrand. Section 10 must go red
        // NAMING the file and the provider it no longer reads.
        writeFileSync(
            widgetPath,
            widgetOriginal.replace(
                'FrontendApplicationConfigProvider.get().applicationName',
                'FALLBACK_DISPLAY_NAME',
            ),
        );
        const channelPlanted = runChecks(dir);
        const channelMsg = channelPlanted.failures.find(
            (f) => f.includes(widgetRel) && f.includes('FrontendApplicationConfigProvider'),
        );
        if (!channelMsg) {
            console.error(`${NAME}: --self-test FAIL -- the welcome heading with its provider read removed (${widgetRel}) was NOT rejected naming the file and the provider`);
            for (const f of channelPlanted.failures) console.error(`  - ${f}`);
            ok = false;
        } else {
            console.log(`${NAME}: --self-test -- removed the provider read from ${widgetRel} and it was REJECTED by name: ${channelMsg}`);
        }
        writeFileSync(widgetPath, widgetOriginal);

        // Tenth plant (04-01): the boot fallback deleted -- the quoted
        // literal gone while the runtime read still stands. Section 10 must
        // go red NAMING the file and the missing fallback value; without it
        // the tree cannot boot where the provider is unset.
        writeFileSync(widgetPath, widgetOriginal.replace(`= 'Power Browser';`, `= '';`));
        const fallbackPlanted = runChecks(dir);
        const fallbackMsg = fallbackPlanted.failures.find(
            (f) => f.includes(widgetRel) && f.includes('boot fallback') && f.includes('"Power Browser"'),
        );
        if (!fallbackMsg) {
            console.error(`${NAME}: --self-test FAIL -- the boot fallback deleted from ${widgetRel} was NOT rejected naming the file and the missing value`);
            for (const f of fallbackPlanted.failures) console.error(`  - ${f}`);
            ok = false;
        } else {
            console.log(`${NAME}: --self-test -- deleted the boot fallback from ${widgetRel} and it was REJECTED by name: ${fallbackMsg}`);
        }
        writeFileSync(widgetPath, widgetOriginal);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }

    if (!ok) {
        console.error(`${NAME}: --self-test FAIL`);
        process.exit(1);
    }
    console.log(`${NAME}: --self-test PASS`);
    process.exit(0);
}

if (SELF_TEST) selfTest();

const result = runChecks(REPO_ROOT);
if (result.failures.length > 0) {
    console.error(`${NAME}: FAIL -- ${result.failures.length} branding literal(s) disagree with inventory/brand-tokens.json`);
    for (const f of result.failures) console.error(`  - ${f}`);
    process.exit(1);
}
console.log(`${NAME}: PASS -- every hand-written branding literal equals the inventory's declared target`);
process.exit(0);
