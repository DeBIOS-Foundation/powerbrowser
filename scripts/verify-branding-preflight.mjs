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
        // Exec= and Icon= each carry THREE tokens with three different correct
        // targets: the absolute repo root, the objdir, and the binary basename.
        // A token-boundary rename produces a path that does not exist, reports
        // success, and the entry silently does nothing when clicked.
        const deskPath = variant.desktop_entry;
        const desk = readText(root, deskPath);
        if (desk === null) {
            r.fail(`variant ${variantId}: ${deskPath} does not exist`);
        } else {
            r.eq(`variant ${variantId} desktop Name`, desktopKey(desk, 'Name'), variant.app_display_name, deskPath);
            r.eq(`variant ${variantId} desktop StartupWMClass`, desktopKey(desk, 'StartupWMClass'), exp.app_basename, deskPath);

            const execLine = desktopKey(desk, 'Exec');
            const wantExec = `${exp.repo_root}/${variant.objdir}/dist/bin/${exp.app_basename} %u`;
            r.eq(`variant ${variantId} desktop Exec`, execLine, wantExec, deskPath);

            const iconLine = desktopKey(desk, 'Icon');
            const wantIcon = `${exp.repo_root}/${variant.branding_dir}/default128.png`;
            r.eq(`variant ${variantId} desktop Icon`, iconLine, wantIcon, deskPath);
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
        if (!new RegExp(`stockControl \\? 'Mozilla' : '${exp.vendor_machine}'`).test(identity)) {
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
        r.fail('patches/010-powerbrowser-identity.patch does not exist -- MOZ_APP_VENDOR has no declared site');
    } else if (!patch.includes(`+imply_option("MOZ_APP_VENDOR", "${exp.vendor_machine}")`)) {
        r.fail(
            `patches/010-powerbrowser-identity.patch does not set MOZ_APP_VENDOR to ${JSON.stringify(exp.vendor_machine)}. ` +
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
    // `<` joins the space and the quote as a terminator for the same reason:
    // `PowerBrowser<` is a JSX text node closing its tag, i.e. a rendered
    // string, while `PowerBrowserWelcomeWidget` (a class name) and
    // `PowerBrowserAPI` remain untouched because the next character is a
    // letter. The identifier form's legitimate uses all continue into an
    // identifier; its illegitimate ones all end.
    const leak = new RegExp(`${exp.identifier_form}[ "<]`);
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
    // powerbrowser/branding/mark.svg is the source all ten rasters derive from;
    // powerbrowser-mark.ts carries the same markup inline as a data URI for the
    // tab-strip favicon. Nothing else in the tree would notice them drifting --
    // the module keeps compiling and the window icon and the favicon just
    // quietly stop being the same mark.
    const markSvg = readText(root, 'powerbrowser/branding/mark.svg');
    const markTs = readText(root, 'theia/extensions/branding/src/browser/powerbrowser-mark.ts');
    if (markSvg === null) {
        r.fail('powerbrowser/branding/mark.svg does not exist -- the ten rasters have no declared source');
    } else if (markTs === null) {
        r.fail('theia/extensions/branding/src/browser/powerbrowser-mark.ts does not exist');
    } else {
        const svgLine = markSvg.split('\n').find((l) => l.startsWith('<svg'));
        const tsMatch = markTs.match(/POWERBROWSER_MARK_SVG = `([\s\S]*?)`;/);
        if (!svgLine) {
            r.fail('powerbrowser/branding/mark.svg has no single-line <svg> element to compare against');
        } else if (!tsMatch) {
            r.fail('powerbrowser-mark.ts does not export a POWERBROWSER_MARK_SVG template literal');
        } else if (tsMatch[1].trim() !== svgLine.trim()) {
            r.fail(
                'powerbrowser/branding/mark.svg and powerbrowser-mark.ts\'s POWERBROWSER_MARK_SVG have DRIFTED. They are ' +
                'the same asset expressed twice; the window icon and the tab-strip favicon must be the same mark.',
            );
        }
        if (!/viewBox="0 0 128 128"/.test(markSvg)) {
            r.fail('powerbrowser/branding/mark.svg is not square (viewBox must be "0 0 128 128") -- Gecko\'s icon slots are square and a non-square source silently reintroduces the magic render sizes');
        }
        if (!/prefers-color-scheme: dark/.test(markSvg)) {
            r.fail('powerbrowser/branding/mark.svg has lost its prefers-color-scheme dual fill -- a single-fill mark is invisible on one of the two tab-strip themes');
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
            'scripts/verify-branding-identity.mjs',
            'theia/applications/browser/package.json',
            'powerbrowser/branding/mark.svg',
            'powerbrowser/powerbrowser.desktop',
            'powerbrowser/powerbrowser-release.desktop',
            'LICENSE',
        ];
        for (const v of ['dev', 'release']) {
            copy.push(
                `powerbrowser/branding/${v}/locales/en-US/brand.ftl`,
                `powerbrowser/branding/${v}/locales/en-US/brand.properties`,
                `powerbrowser/branding/${v}/configure.sh`,
                `powerbrowser/branding/${v}/content/aboutDialog.css`,
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
