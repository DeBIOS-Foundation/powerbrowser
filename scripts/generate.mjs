#!/usr/bin/env node
// scripts/generate.mjs
//
// THE generator. It reads configuration.toml, checks it, and writes the derived
// build surfaces under generated/. It is the only thing in this tree that turns
// a brand setting into a build artifact (CFG-01).
//
// WHAT IT COVERS. Thirty-three targets, each byte-identical to the file
// Phase 1 wrote by hand: the five Phase 2 build surfaces (the two branding
// configure.sh files, .mozconfig, and the two .desktop files), the
// eighteen GEN-01 branding-directory surfaces (per variant: brand.ftl,
// brand.properties, moz.build, content/jar.mn, content/moz.build,
// locales/jar.mn, locales/moz.build, content/aboutDialog.css and
// pref/firefox-branding.js), and the ten GEN-02 icon rasters (per variant:
// default16/32/48/64/128.png, drawn from the single brand/mark.svg through
// the system inkscape). That byte-identity IS the acceptance test, which
// is why no emitter here is allowed to reformat, reorder or "tidy" what it
// reproduces. The ICO/ICNS containers are the second half of plan 03-02 and
// the installer fields are plan 03-03 (GEN-02/GEN-03).
//
// WHY THE PIPELINE ORDER IS LOAD-BEARING. Parse, then reject unknown settings,
// then mask, then merge, then validate, then emit, then write -- in that order
// and no other:
//
//  * Unknown-setting rejection runs BEFORE anything is merged or assigned. A
//    merge over an unchecked document assigns by computed key, and a reserved
//    key name reaches the prototype chain that way. Rejecting first means such
//    a name never reaches an assignment at all.
//  * Masking runs BEFORE the merge and on the defaults layer OBJECT, never on
//    the merged result. The two orderings agree on the wholly-absent case and
//    disagree on the PARTIAL case -- a downstream that sets some identity keys
//    and omits others -- and the partial case is the one that actually ships.
//  * Unknown-setting rejection also runs before the required-setting check, so
//    a misspelled section header is reported as the misspelling it is, rather
//    than as five separate complaints about the correctly-spelled settings it
//    shadowed.
//  * Nothing is written under generated/ until every check has passed. A failed
//    run leaves the output tree exactly as it found it.
//
// TWO COPY RULES THIS FILE OBEYS BY CONSTRUCTION (D-11, and CLAUDE.md's
// user-facing copy section). First, the parser's own error text is never
// printed: it embeds a caret diagram and parser vocabulary, so the caught error
// is re-emitted from its structured line and column fields alone. Second, every
// failure line names a setting by the dotted path a reader can find in
// configuration.toml, states the rule in plain words, and ends with a real next
// step. No stack trace, no internal variable name, no host path.
//
// ENCODING. The unset test is a plain JS code-unit trim and comparisons are
// byte-level over UTF-8. No Unicode normalisation is applied anywhere in this
// file: two values differing only in normalisation form are different values,
// and silently folding them would make a rebrand that looks right produce bytes
// that are not.
//
// The repo root is derived from this file's own location, never from the
// working directory -- scripts/verify-platform.sh invokes every check with
// absolute paths. The desktop-entry emitter carries a placeholder token in
// place of that root (see emitDesktopEntry): no emitted byte may depend on
// where this checkout happens to live.
//
// Usage:
//   node scripts/generate.mjs
//   node scripts/generate.mjs --check
//   node scripts/generate.mjs --self-test

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, readdirSync, realpathSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse, TomlError } from './lib/toml.cjs';

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'generate';

const MANIFEST_NAME = 'configuration.toml';
const MANIFEST_PATH = join(REPO_ROOT, MANIFEST_NAME);
const SCHEMA_PATH = join(REPO_ROOT, 'scripts/lib/config-schema.json');
const OUTPUT_ROOT = join(REPO_ROOT, 'generated');
const RERUN = 'node scripts/generate.mjs';

// --- argument handling ------------------------------------------------------

const args = process.argv.slice(2);

/**
 * True only when this file is the process entry point.
 *
 * WHY IT EXISTS (02-05). scripts/verify-generated-identity.mjs imports the
 * frozen target table and the resolver from here rather than restating either,
 * which is the whole reason that check can go red on an emitter being ADDED.
 * Without this guard, that import would run the CLI as a side effect: it would
 * write generated/ during a check that promises to write nothing, it would
 * reject the IMPORTER's arguments as if they were the generator's, and its
 * process.exit(0) would end the check before it asserted anything -- a check
 * that exits green having run none of its own body.
 *
 * The comparison is between resolved absolute paths, not between argv[1] and a
 * name, so a relative invocation and an absolute one agree.
 *
 * BOTH SIDES ARE REALPATHED, and that is not belt and braces. `resolve`
 * normalises a path but does not follow a symlink, while import.meta.url has
 * ALREADY been realpath-resolved by Node. Compared with only one side resolved,
 * any symlinked invocation -- bin/generate -> ../scripts/generate.mjs, a nix
 * develop shim, a node_modules/.bin entry -- made the two differ, so main()
 * never ran, nothing was written, and the process exited 0. A CI step or a
 * Makefile target wired that way reported success having generated nothing,
 * and generate-check then called the tree stale for a reason nobody could
 * locate.
 *
 * Wrapped, returning false, because realpathSync throws on a path that is not
 * there and a nonexistent argv[1] must not take the process down.
 */
function isEntryPoint() {
    if (process.argv[1] === undefined) return false;
    try {
        return realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url));
    } catch {
        return false;
    }
}

const IS_MAIN = isEntryPoint();

// The argument check lives INSIDE the main guard for the same reason the two
// flag dispatches do: an importer's own flags are not this file's, and
// rejecting them here would make `verify-generated-identity.mjs --self-test`
// die at import time complaining about an argument the generator never saw.
function rejectUnknownArguments() {
    for (const a of args) {
        if (a !== '--check' && a !== '--self-test') {
            console.error(`${NAME}: FAIL -- unknown argument '${a}'`);
            process.exit(1);
        }
    }
}
// Both flags are dispatched at the BOTTOM of this file, not here. --check has
// to echo the applied defaults on its way past (D-08), and --self-test has to
// run the same pipeline the default invocation runs; neither can act before
// that pipeline is defined.

// --- the schema, and the names refused outright -----------------------------

/**
 * Names that never reach an assignment, refused by name as well as by the
 * schema. The schema alone would already reject them, but a rejection that
 * rests on one list is a rejection that a future edit to that list can remove.
 */
const RESERVED_NAMES = Object.freeze(['__proto__', 'constructor', 'prototype']);

const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));
const SCHEMA_KEYS = Object.freeze(schema.keys);

/** The section header a reader opens to fix a setting at this dotted path. */
function sectionOf(path) {
    return `[${path.split('.')[0].replace('[]', '')}]`;
}

/** The bare setting name, without its section prefix. */
function settingOf(path) {
    return path.split('.').pop();
}

// --- 1. parse ---------------------------------------------------------------

/**
 * Parse ONE layer. The path is a parameter rather than a constant because the
 * pipeline takes two layers -- the repo-root manifest, and a downstream
 * manifest that overlays it. In Phase 2 the only caller that supplies a
 * downstream path is --self-test; PB_CONFIG_DIR is CFG-05 and arrives in
 * Phase 7. The downstream parameter is therefore NOT dead code awaiting a
 * caller: it is the merge's only Phase-2 coverage, and deleting it would
 * delete the merge's tests along with it.
 */
function loadLayer(path) {
    let text;
    try {
        text = readFileSync(path, 'utf8');
    } catch {
        console.error(`${NAME}: FAIL -- ${MANIFEST_NAME} was not found at the top of the project.`);
        console.error(`  ${MANIFEST_NAME} holds every brand setting and the project cannot be generated without it.`);
        console.error(`  Next step: restore ${MANIFEST_NAME} at the top of the project, then run: ${RERUN}`);
        process.exit(1);
    }
    try {
        return parse(text);
    } catch (err) {
        if (!(err instanceof TomlError)) throw err;
        // Only the structured line and column are used. The caught error's own
        // text carries a caret diagram and parser vocabulary and is never shown.
        const at = `line ${err.line}, column ${err.column}`;
        console.error(`${NAME}: FAIL -- ${MANIFEST_NAME} could not be read as a settings file (${at}).`);
        console.error('  A setting is written as a name, an equals sign, and a value in double quotes, all on one line, like this: display_name = "Power Browser"');
        console.error('  A section header is written as the section name in square brackets, alone on its own line, like this: [identity]');
        console.error(`  Next step: open ${MANIFEST_NAME}, correct line ${err.line}, then run: ${RERUN}`);
        process.exit(1);
    }
}

// --- 2. reject unknown settings, before anything is merged ------------------

/**
 * A TOML table: an object that is neither an array nor a date. The parser
 * returns dates as a Date subclass, which is why that case is excluded by name
 * rather than by shape -- a date has own properties of its own and descending
 * into one would invent settings nobody wrote.
 */
function isTable(value) {
    return value !== null
        && typeof value === 'object'
        && !Array.isArray(value)
        && !(value instanceof Date);
}

/**
 * Flatten the document to dotted leaf paths. An element of an array of tables
 * contributes an empty-bracket segment, so every element of `[[variants]]`
 * folds onto the single schema path `variants[].id` and friends.
 */
function collectLeaves(node, prefix, leaves, refused) {
    for (const key of Object.keys(node)) {
        const path = prefix ? `${prefix}.${key}` : key;
        if (RESERVED_NAMES.includes(key)) {
            refused.push(path);
            continue;
        }
        const value = node[key];
        if (Array.isArray(value) && value.every(isTable) && value.length > 0) {
            for (const element of value) collectLeaves(element, `${path}[]`, leaves, refused);
        } else if (isTable(value)) {
            collectLeaves(value, path, leaves, refused);
        } else {
            leaves.push({ path, value });
        }
    }
}

function rejectUnknown(leaves, refused) {
    const failures = [];
    for (const path of refused) {
        failures.push(
            `unknown setting '${path}' -- that name is reserved by the settings reader and is refused outright. `
            + `Remove it from ${MANIFEST_NAME}, then run: ${RERUN}`,
        );
    }
    for (const { path } of leaves) {
        if (Object.hasOwn(SCHEMA_KEYS, path)) continue;
        failures.push(
            `unknown setting '${path}' -- ${MANIFEST_NAME} has no setting by that name. `
            + `Check the spelling of the setting and of the section header above it, then run: ${RERUN}`,
        );
    }
    return failures;
}

// --- 3. mask the defaults layer, then merge the downstream layer over it ----

/**
 * Every dotted path the schema marks required. This list is DERIVED from the
 * schema's `required` flag and is not a second list: D-06's "one schema table
 * consumed by both the masker and the validator" is satisfied by reading that
 * flag, and a required key added to the schema is masked the moment it is
 * added, with no edit here.
 *
 * An array is a leaf to the masker exactly as it is to the merge, so no
 * `variants[]` path is consulted here even though all four are now required.
 * That is deliberate and it is not the same question. The mask decides whether
 * a downstream may INHERIT a setting; the required check decides whether a
 * section a downstream DID write is complete. A downstream that states no
 * [[variants]] at all inherits this project's two, which is the intended
 * fallback -- a variant is a build arrangement, not an identity. A downstream
 * that states one and leaves out its objdir is incomplete, and that is what
 * validateVariantElements refuses.
 */
function requiredPathsOf(schemaKeys) {
    return Object.entries(schemaKeys).filter(([, spec]) => spec.required).map(([path]) => path);
}

/**
 * Copy a layer keeping only the leaves whose required-ness matches `keepRequired`.
 * Tables that end up empty are dropped rather than left as empty sections, so a
 * masked layer has no `identity` key at all rather than an `identity` holding
 * nothing -- an empty table would still merge, and would still be a table the
 * downstream's own table has to win against.
 */
function projectLayer(layer, prefix, required, keepRequired) {
    const out = Object.create(null);
    for (const key of Object.keys(layer)) {
        if (RESERVED_NAMES.includes(key)) continue;
        const path = prefix ? `${prefix}.${key}` : key;
        const value = layer[key];
        if (isTable(value)) {
            const sub = projectLayer(value, path, required, keepRequired);
            if (Object.keys(sub).length > 0) out[key] = sub;
        } else if (required.includes(path) === keepRequired) {
            out[key] = value;
        }
    }
    return out;
}

/**
 * D-06. Strip every schema-required key path out of the defaults layer, so no
 * downstream can inherit one.
 *
 * WHAT THIS PREVENTS. Without it, "the repo-root manifest IS the defaults
 * layer" means a downstream that omits [identity] silently ships under Power
 * Browser's mark, and one that omits [legal] silently ships Power Browser's
 * copyright holder and trademark notice. Removal is per key path and not per
 * table, so omitting three keys out of five behaves exactly like omitting the
 * whole table.
 *
 * The call site passes the defaults layer OBJECT and appears before the
 * mergeLayers call. Moving it after the merge would still catch a wholly
 * absent table and would silently stop catching the partial case.
 */
function maskDefaults(defaultsLayer, schemaKeys) {
    return projectLayer(defaultsLayer, '', requiredPathsOf(schemaKeys), false);
}

/**
 * The complement of the mask: the required keys alone.
 *
 * WHY POWER BROWSER IS ITS OWN DOWNSTREAM. Phase 2 has no second manifest, but
 * the merge must still have exactly one code path rather than a fast path and a
 * real one. So the root manifest is split along the mask line: its optional
 * keys are the defaults layer, its required keys are the downstream layer.
 * Their union is the manifest, which is why byte-identity survives; and the
 * split is what makes this project's own build exercise the same merge a
 * downstream will, instead of leaving it exercised only by its own test.
 */
function requiredLayer(layer, schemaKeys) {
    return projectLayer(layer, '', requiredPathsOf(schemaKeys), true);
}

const EMPTY_LAYER = Object.freeze(Object.create(null));

/**
 * Recursive, key-level merge of a downstream layer over a defaults layer.
 * Returns the resolved value AND the dotted paths whose value came from the
 * defaults layer. The provenance comes OUT of the merge rather than being
 * re-derived by a later traversal: a second traversal is a second source of
 * truth about the same fact, and it can disagree with the merge.
 *
 * A leaf present in the downstream layer wins and is never recorded, even when
 * its value equals the default -- an equal value is still a value the
 * downstream stated.
 */
function mergeLayers(defaults, downstream) {
    const defaulted = [];
    const value = mergeInto(defaults, downstream, '', defaulted);
    return { value, defaulted };
}

function mergeInto(defaults, downstream, prefix, defaulted) {
    // A null-prototype accumulator, and the reserved names skipped by name.
    // Unknown-setting rejection has already refused those names, so this is
    // belt and braces (D-12) -- but this becomes a real trust boundary in
    // Phase 7 and it costs three lines.
    const out = Object.create(null);
    for (const key of new Set([...Object.keys(defaults), ...Object.keys(downstream)])) {
        if (RESERVED_NAMES.includes(key)) continue;
        const path = prefix ? `${prefix}.${key}` : key;
        const fromDefaults = defaults[key];
        const setDownstream = Object.hasOwn(downstream, key);

        if (isTable(fromDefaults) && isTable(downstream[key])) {
            out[key] = mergeInto(fromDefaults, downstream[key], path, defaulted);
        } else if (setDownstream) {
            // D-07. An array is a LEAF: a downstream array replaces the whole
            // default array and the two are never joined end to end. That is
            // deliberate and it is the only way a downstream can DROP a default
            // entry -- joining them makes dropping impossible. Every
            // off-the-shelf deep-merge library joins arrays by default, so a
            // reviewer's instinct is to "fix" this; the self-test case named
            // 'downstream array shorter than default' is what goes red.
            out[key] = downstream[key];
        } else if (isTable(fromDefaults)) {
            // The table is absent downstream entirely. Descend against an empty
            // layer anyway, so what gets recorded is the LEAF paths inside it
            // rather than the table's own path.
            out[key] = mergeInto(fromDefaults, EMPTY_LAYER, path, defaulted);
        } else {
            out[key] = fromDefaults;
            defaulted.push(path);
        }
    }
    return out;
}

// --- 4. validate, collecting every failure before exiting -------------------

function readPath(doc, path) {
    let node = doc;
    for (const segment of path.split('.')) {
        if (!isTable(node) || !Object.hasOwn(node, segment)) return undefined;
        node = node[segment];
    }
    return node;
}

/**
 * The exact words the required-setting failure uses, named once so the
 * self-test's `unknown key` case can assert that a MISSPELLED section header
 * never produces this phrase. That case derives the phrase from the emitter
 * here rather than copying it, so rewording the message below moves the
 * assertion with it instead of quietly making the case unfalsifiable.
 */
const UNSET_MARK = 'is not set.';

/** Unset means absent, or a string whose code-unit trim is empty. */
function isUnset(value) {
    return value === undefined || (typeof value === 'string' && value.trim() === '');
}

const VARIANT_PREFIX = 'variants[].';

/**
 * The required-setting check for the elements of an array of tables.
 *
 * WHY IT IS A SECOND LOOP. The scalar loop above addresses a setting by a
 * dotted path through ONE document; `variants[].objdir` is not one setting, it
 * is one per element, and readPath cannot address any of them. Without this
 * loop every `variants[].*` key was unreachable by the required check whatever
 * its `required` flag said -- a `[[variants]]` section carrying nothing but an
 * id resolved with ZERO failures, emitted the literal string `undefined` into
 * .mozconfig and configure.sh, and then threw out of path.join.
 *
 * PRESENCE, NOT isUnset. The release variant's name_suffix is deliberately the
 * empty string -- that empty suffix is the whole reason the release display
 * name is shorter than the dev one -- so a trim-to-empty test would reject the
 * shipping manifest. What must be stated is the KEY; whether its value may be
 * blank is the `regex` in the schema's business, and name_suffix's is the one
 * that admits the empty string.
 */
function validateVariantElements(doc) {
    const failures = [];
    const variants = readPath(doc, 'variants');
    if (!Array.isArray(variants)) return failures;

    for (const [index, variant] of variants.entries()) {
        for (const [path, spec] of Object.entries(SCHEMA_KEYS)) {
            if (!path.startsWith(VARIANT_PREFIX) || !spec.required) continue;
            const key = path.slice(VARIANT_PREFIX.length);
            if (isTable(variant) && variant[key] !== undefined) continue;
            failures.push(
                `the ${ordinal(index + 1)} [[variants]] section (id ${JSON.stringify(variant?.id ?? '')}): `
                + `${key} ${UNSET_MARK} Open ${MANIFEST_NAME}, find that [[variants]] section, and give `
                + `${key} a value. Then run: ${RERUN}`,
            );
        }
    }
    return failures;
}

/**
 * The three ways a `[[variants]]` id can be wrong without anything noticing.
 *
 * variantById is a `find`, so it takes the FIRST match and says nothing about
 * the rest. That silence covered three distinct mistakes: a variant with no id
 * at all is unreachable dead configuration; two variants sharing an id resolve
 * to the first, so a downstream that edits the second gets no effect and no
 * message; and a typo'd `id = "relase"` surfaced only as the missing-variant
 * error for "release", sending the reader to ADD a section rather than fix a
 * letter. All three are reported here, by the id involved.
 *
 * The set of ids the project actually builds is DERIVED from the frozen target
 * table rather than written out, so adding a target adds it here with no edit.
 */
function validateVariantIds(doc) {
    const failures = [];
    const variants = readPath(doc, 'variants');
    if (!Array.isArray(variants)) return failures;

    const ids = variants.map(v => (isTable(v) ? v.id : undefined));

    for (const id of new Set(ids.filter((id, i) => id !== undefined && ids.indexOf(id) !== i))) {
        failures.push(
            `two or more [[variants]] sections both use the id ${JSON.stringify(id)}, and only the first is `
            + `ever used. Give each variant its own id in ${MANIFEST_NAME}, then run: ${RERUN}`,
        );
    }

    const built = [...new Set(TARGETS.map(t => t.variant))];
    for (const id of ids) {
        if (id === undefined || built.includes(id)) continue;
        failures.push(
            `the [[variants]] section with id ${JSON.stringify(id)} is never used; this project builds `
            + `${built.map(b => JSON.stringify(b)).join(' and ')}. Check the spelling in ${MANIFEST_NAME}, `
            + `then run: ${RERUN}`,
        );
    }

    return failures;
}

/** 1 -> "1st". Plain enough for a message that has to name one section of several. */
function ordinal(n) {
    const suffix = (n % 100 >= 11 && n % 100 <= 13) ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th');
    return `${n}${suffix}`;
}

function validate(doc, leaves) {
    const failures = [];
    const reportedUnset = new Set();

    for (const [path, spec] of Object.entries(SCHEMA_KEYS)) {
        if (!spec.required || path.includes('[]')) continue;
        if (isUnset(readPath(doc, path))) {
            reportedUnset.add(path);
            failures.push(
                `${path} ${UNSET_MARK} Open ${MANIFEST_NAME}, find the ${sectionOf(path)} section, and give `
                + `${settingOf(path)} a value. Then run: ${RERUN}`,
            );
        }
    }

    failures.push(...validateVariantElements(doc));
    failures.push(...validateVariantIds(doc));

    for (const { path, value } of leaves) {
        const spec = SCHEMA_KEYS[path];
        if (reportedUnset.has(path)) continue;
        if (spec.type === 'string' && typeof value !== 'string') {
            failures.push(
                `${path} is ${JSON.stringify(value)}, but this setting has to be text written inside double `
                + `quotes. Open ${MANIFEST_NAME}, quote the value, then run: ${RERUN}`,
            );
            continue;
        }
        if (spec.regex && typeof value === 'string' && !new RegExp(spec.regex).test(value)) {
            failures.push(
                `${path} is ${JSON.stringify(value)}, which is not allowed here. Write it as ${spec.regex_help}. `
                + `Allowed form: ${spec.regex} . A valid value looks like ${JSON.stringify(spec.regex_example)}. `
                + `Correct it in ${MANIFEST_NAME}, then run: ${RERUN}`,
            );
        }
    }

    return failures;
}

function report(failures) {
    if (failures.length === 0) return;
    console.error(`${NAME}: FAIL -- ${failures.length} problem(s) in ${MANIFEST_NAME}`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
}

// --- 4. emit and write ------------------------------------------------------

/**
 * Characters a manifest value may never carry into an emitted build surface.
 *
 * A double quote or a backslash closes or escapes its way out of the
 * double-quoted shell assignment in configure.sh; a dollar sign or a backtick
 * makes the shell evaluate the rest as a command, and the Gecko build SOURCES
 * that file, so the evaluation happens with the developer's privileges. A line
 * break ends the assignment and starts a new shell statement -- and in a
 * freedesktop .desktop file it ends the current key and starts another, which
 * is how a Name= value injects its own Exec= line into the group.
 */
const UNEMITTABLE = /["`$\\\r\n\t\0]/;

/**
 * A manifest value on its way into a shell assignment or a freedesktop key.
 *
 * DEFENCE IN DEPTH, NOT THE PRIMARY GUARD. The primary guard is the schema:
 * every value that reaches a sink below carries a `regex` in
 * config-schema.json, so a metacharacter is rejected in validate() alongside
 * every other failure, with the whole list reported at once. This function is
 * what stops a future schema edit that drops or loosens one of those patterns
 * from silently reopening the sink -- the sink itself refuses.
 *
 * CFG-03: a bad value is REJECTED, never quietly mangled into a passing one.
 * Escaping the metacharacter would emit a build setting whose text is not what
 * the manifest says, which is the same class of surprise as silently
 * normalising Unicode. It reports through report() rather than throwing, so the
 * reader sees the same plain-language copy every other failure uses and never a
 * stack trace.
 */
function assertEmittable(path, value) {
    if (typeof value !== 'string' || UNEMITTABLE.test(value)) {
        report([
            `${path} cannot be written into a build setting as it stands. A brand value may not `
            + 'contain a quote, a backslash, a dollar sign, a backtick, a tab or a line break. '
            + `Open ${MANIFEST_NAME}, correct it, then run: ${RERUN}`,
        ]);
    }
    return value;
}

/**
 * The "this file is derived" banner, carried by EVERY generated target.
 *
 * ONE constant, not one per emitter. It went in as three lines on configure.sh
 * alone, which left .mozconfig and the two .desktop files equally derived,
 * equally hand-editable and equally silent about it -- and a reader could no
 * longer tell generated from hand-written by opening the file, which is the
 * banner's whole purpose. A shared constant is also what stops the
 * thirty-three files drifting into thirty-three wordings.
 *
 * `#` is a comment in all three formats: mozconfig is shell, configure.sh is
 * shell, and freedesktop permits comment lines in a .desktop file including
 * ahead of the first group header. The two .desktop parsers in this repo find
 * their keys by prefix rather than by line number, so a leading comment block
 * moves nothing they read.
 */
const GENERATED_BANNER = Object.freeze([
    '# Generated from configuration.toml by scripts/generate.mjs -- do not edit here.',
    '# To change it: edit configuration.toml, run: node scripts/generate.mjs, then copy the',
    '# matching file out of generated/ over this one. Phase 2 does not write it in place.',
    '# A disagreement reddens: scripts/verify-platform.sh --only generated-byte-identity',
]);

/** The dotted path a reader opens to fix a value inside one [[variants]] section. */
function variantPath(variant, key) {
    return `the [[variants]] section with id ${JSON.stringify(variant?.id ?? '')}: ${key}`;
}

/**
 * A manifest folder path resolved against the repo root, refused if it escapes.
 *
 * The schema patterns for branding_dir and objdir already forbid a leading
 * slash and a `..` segment, so this cannot fire on a validated manifest. It is
 * here for the same reason assertEmittable is: the emitted Exec= and Icon=
 * lines are absolute paths a desktop launcher runs, and a guard that rests on
 * one pattern is a guard a future edit to that pattern can remove. Resolution,
 * not string inspection -- `..` is only one of the ways a path leaves a tree.
 */
function assertUnderRepo(path, relative) {
    const absolute = resolve(REPO_ROOT, relative);
    if (absolute !== REPO_ROOT && !absolute.startsWith(REPO_ROOT + sep)) {
        report([
            `${path} is ${JSON.stringify(relative)}, which points outside the project folder. `
            + `Write it as a folder path inside the project, then run: ${RERUN}`,
        ]);
    }
    return absolute;
}

/**
 * A branding configure.sh, line for line against the files plan 01-03 wrote by
 * hand. Lines 1-3 are the Mozilla Public License boilerplate: a source-file
 * licence notice, literal emitter text, not a rebrand input.
 *
 * Lines 5-7 are D-03 STEP 2, done in plan 02-06 and not before. Until then
 * they reproduced verbatim the comment those files carried when they were
 * hand-written, because the byte-identity check had to be established GREEN
 * against the original bytes first: a comment rewritten ahead of the proof
 * would have left nothing independent to compare against. That proof was run
 * and recorded green at commit 94c47d1, and only then did these three lines
 * and the two tracked files change together in one commit. The header they now
 * carry is instructions, not description -- it names the file to edit instead,
 * the command to re-run, and the registry label that reddens on a
 * disagreement. If the emitter and either tracked file ever diverge, the
 * emitter is what changes; the tracked files are the comparand and are never
 * edited to make a check green.
 *
 * THE COPY STEP IS NAMED BECAUSE IT IS REAL. OUTPUT_ROOT is REPO_ROOT/generated
 * and the build still consumes the TRACKED file under D-01, so "edit
 * configuration.toml and run the generator" -- what these lines used to say --
 * changes nothing a reader can see and then reddens generated-byte-identity
 * with no documented recovery other than the one thing the first line forbids.
 * The header now says to copy the emitted file over the tracked one, which is
 * the procedure that actually works in Phase 2. A --write-tracked mode would
 * replace that sentence; until one exists, the sentence stays honest.
 *
 * ONE emitter serves BOTH variants. The dev and release files differ in exactly
 * one line, and that difference is entirely the variant's name_suffix -- the
 * release variant's is empty, which is what yields the shorter display name. If
 * the two emitted files ever differ by anything else, the emitter is wrong, not
 * the variant, and a second emitter would be the wrong repair.
 *
 * Joined with a literal newline, never the platform line-ending constant, which
 * would emit CRLF on a Windows host and break byte-identity.
 */
function emitConfigureSh(config, variant) {
    const lines = [
        '# This Source Code Form is subject to the terms of the Mozilla Public',
        '# License, v. 2.0. If a copy of the MPL was not distributed with this',
        '# file, You can obtain one at http://mozilla.org/MPL/2.0/.',
        '',
        ...GENERATED_BANNER,
        // Both halves pass the sink guard. This line is a double-quoted shell
        // assignment in a file the Gecko build sources, so an unchecked value
        // here executes at build time; see assertEmittable.
        `MOZ_APP_DISPLAYNAME="${assertEmittable('identity.display_name', config.identity.display_name)}`
        + `${assertEmittable(variantPath(variant, 'name_suffix'), variant.name_suffix)}"`,
    ];
    return lines.join('\n') + '\n';
}

/**
 * A branding locale's Fluent terms, line for line against the files plan 01-03
 * wrote by hand. ONE emitter serves BOTH variants, exactly like
 * emitConfigureSh: the dev and release files differ in exactly one line, and
 * that difference is entirely the variant's name_suffix.
 *
 * THE DERIVATION POINTS, AND NOTHING ELSE. Every other line is a literal copy
 * of the tracked bytes, comments included:
 *
 *  * -brand-shorter-name, -brand-short-name and -brand-shortcut-name carry the
 *    BASE display name with no suffix; only -brand-full-name carries base plus
 *    the variant's name_suffix.
 *  * -brand-product-name is the literal Firefox per D-78: a small set of
 *    "requires Firefox" compatibility strings interpolates this term, and
 *    byte-identical UA/product naming is the same rationale D-78 already
 *    applied to the User-Agent.
 *  * -vendor-short-name carries product.vendor_display, the DISPLAY-side
 *    vendor (D-09 as amended).
 *  * trademarkInfo is the literal brace-space line exactly as the tracked file
 *    carries it. The tracked bytes win here: no manifest value reaches that
 *    line, so legal.trademark_notice is validated and required but never
 *    interpolated into this file.
 *
 * Joined with a literal newline, never the platform line-ending constant.
 */
function emitBrandFtl(config, variant) {
    // Both halves pass the sink guard. A Fluent term value ends at the line
    // break, so the guard's newline rejection is what stops one value from
    // becoming two terms; the quote/backslash/dollar/backtick rejections cost
    // nothing here and keep every interpolation in this file under one rule.
    const base = assertEmittable('identity.display_name', config.identity.display_name);
    const suffix = assertEmittable(variantPath(variant, 'name_suffix'), variant.name_suffix);
    const vendor = assertEmittable('product.vendor_display', config.product.vendor_display);
    const lines = [
        '# This Source Code Form is subject to the terms of the Mozilla Public',
        '# License, v. 2.0. If a copy of the MPL was not distributed with this',
        '# file, You can obtain one at http://mozilla.org/MPL/2.0/.',
        '',
        '# Display literals, hand-written (plan 01-03, Pitfall 1). The product name is',
        '# TWO WORDS WITH A SPACE here; the space-less `PowerBrowser` is the identifier',
        '# form and must never appear in a display string.',
        `-brand-shorter-name = ${base}`,
        `-brand-short-name = ${base}`,
        `-brand-shortcut-name = ${base}`,
        `-brand-full-name = ${base}${suffix}`,
        '# This brand name can be used in messages where the product name needs to',
        '# remain unchanged across different versions (Nightly, Beta, etc.). Kept at',
        '# Firefox (not Power Browser) per D-78: a small set of "requires Firefox"',
        '# compatibility strings interpolate this term, and byte-identical UA/product',
        '# naming is the same rationale D-78 already applied to the User-Agent.',
        '-brand-product-name = Firefox',
        '# The DISPLAY-side vendor (D-09 as amended). The machine-side vendor is the',
        '# space-free `DeBIOS` in patches/010, because MOZ_APP_VENDOR is lowercased into',
        '# the profile path with no space stripping.',
        `-vendor-short-name = ${vendor}`,
        'trademarkInfo = { " " }',
    ];
    return lines.join('\n') + '\n';
}

/**
 * A branding locale's legacy properties file, line for line against the files
 * plan 01-03 wrote by hand. ONE emitter serves BOTH variants: the dev and
 * release files differ in exactly one line (brandFullName), and that
 * difference is entirely the variant's name_suffix.
 *
 * brandShorterName and brandShortName carry the BASE display name;
 * brandFullName carries base plus suffix -- the same split emitBrandFtl
 * applies, which is what the agreement assertion below checks.
 */
function emitBrandProperties(config, variant) {
    const base = assertEmittable('identity.display_name', config.identity.display_name);
    const suffix = assertEmittable(variantPath(variant, 'name_suffix'), variant.name_suffix);
    const lines = [
        '# This Source Code Form is subject to the terms of the Mozilla Public',
        '# License, v. 2.0. If a copy of the MPL was not distributed with this',
        '# file, You can obtain one at http://mozilla.org/MPL/2.0/.',
        '',
        '# Hand-written display literals (plan 01-03). These must equal the matching',
        '# terms in this same variant\'s brand.ftl -- verify-branding-identity.mjs',
        '# surface 4 asserts BOTH files against one expected value precisely so the two',
        '# halves of one display surface cannot silently disagree.',
        `brandShorterName=${base}`,
        `brandShortName=${base}`,
        `brandFullName=${base}${suffix}`,
    ];
    return lines.join('\n') + '\n';
}

/**
 * The root .mozconfig: the shared generated-from banner, a blank line, then
 * eleven lines against the file Phase 1 wrote by hand.
 *
 * FOUR VALUES come from the manifest: the --with-app-basename argument, the
 * --with-distribution-id argument, the exported MOZ_APP_REMOTINGNAME, and --
 * inside the MOZ_OBJDIR shell-default expansion on line 1 -- the variant's
 * objdir.
 *
 * THE --with-branding DEFAULT IS A STRING LITERAL, NOT A FIFTH VALUE. The
 * 03-01 spike proved a branding path outside topsrcdir is rejected -- the
 * moz.build sandbox refuses files outside its allowed paths -- so the flag
 * points through the topsrcdir-internal symlink
 * powerbrowser/branding-generated (itself pointing at generated/branding),
 * with the dev variant as the default a release build overrides via
 * POWERBROWSER_BRANDING. The symlink sits one level above the per-variant
 * directories it serves rather than inside powerbrowser/branding/: the
 * --with-branding VALUE must sit exactly three levels under topsrcdir,
 * because the branding moz.build reaches upstream with a ../../../ include
 * resolved against that value's own path. A link one level deeper puts the
 * value at depth four and the include escapes topsrcdir -- proven red by a
 * configure run during this plan. That spelling was chosen by configure
 * runs, not by a manifest key, and T-03-03 keeps it that way: no manifest
 * value may select the branding flag, so this line joins nothing from the
 * config.
 *
 * WHY THE DEV VARIANT, ALWAYS. There is one .mozconfig, and the two expansions
 * spell out what the build falls back on when POWERBROWSER_OBJDIR and
 * POWERBROWSER_BRANDING are unset. Those fallbacks are the DEV defaults; a
 * release build sets the two environment variables. So this emitter takes the
 * dev variant not as a default that could reasonably be parameterised, but
 * because dev IS what an unset environment means here.
 *
 * WHY THE ENVIRONMENT VARIABLE NAMES STAY LITERAL. POWERBROWSER_OBJDIR and
 * POWERBROWSER_BRANDING are read by scripts and by the developer's shell, not
 * written by this phase; renaming them is not a rebrand operation and no
 * manifest key selects them. Their VALUES are configurable; their NAMES are
 * part of the build's interface.
 *
 * WHY SIX LINES ARE LITERAL TEXT (research assumption A3, and a recorded
 * decision rather than an oversight). Lines 2-5 and 8-9 are toolchain and
 * feature flags -- the application selection, the updater, the wasm sandbox,
 * the libclang path, the crash reporter, the compiler cache. None of them is a
 * rebrand input: changing a brand never changes whether the crash reporter is
 * built. Promoting one to a [build] key later is purely additive -- one schema
 * entry and one emitter line -- so the cheap direction is to leave them literal
 * until a downstream actually needs to differ.
 *
 * Built by concatenation rather than by template interpolation on the two
 * expansion lines: `${...}` inside a JS template literal is JS interpolation,
 * and the shell-default syntax has to survive to the emitted bytes intact.
 */
function emitMozconfig(config, variant) {
    // Every manifest value on these eleven lines lands in a file the Gecko
    // build sources, so each passes the sink guard on its way in. The
    // --with-branding default is the one line that carries no manifest value
    // at all -- see above -- so branding_dir is neither read nor guarded
    // here. (It is still read and guarded where it IS emitted as content:
    // the desktop entry's Icon line.)
    const objdir = assertEmittable(variantPath(variant, 'objdir'), variant.objdir);
    const lines = [
        ...GENERATED_BANNER,
        '',
        'mk_add_options MOZ_OBJDIR=@TOPSRCDIR@/../${POWERBROWSER_OBJDIR:-' + objdir + '}',
        'ac_add_options --enable-application=browser',
        'ac_add_options --disable-updater',
        'ac_add_options --without-wasm-sandboxed-libraries',
        'ac_add_options --with-libclang-path="$LIBCLANG_PATH"',
        `ac_add_options --with-app-basename=${assertEmittable('identity.app_basename', config.identity.app_basename)}`,
        `ac_add_options --with-distribution-id=${assertEmittable('identity.distribution_id', config.identity.distribution_id)}`,
        'ac_add_options --disable-crashreporter',
        'ac_add_options --with-ccache=sccache',
        'ac_add_options --with-branding=${POWERBROWSER_BRANDING:-powerbrowser/branding-generated/dev}',
        `mk_add_options "export MOZ_APP_REMOTINGNAME=${assertEmittable('identity.remoting_name', config.identity.remoting_name)}"`,
    ];
    return lines.join('\n') + '\n';
}

/**
 * The placeholder standing in for the checkout's absolute path in both
 * emitted .desktop entries (02-DESIGN-G-02-11.md, option-4-placeholder). The
 * `POWERBROWSER_` prefix already appears literally in tracked files
 * (POWERBROWSER_OBJDIR and POWERBROWSER_BRANDING in .mozconfig), so the token
 * introduces no new residue class for scripts/scan-brand-residue.mjs.
 */
const DESKTOP_ROOT_TOKEN = '@POWERBROWSER_REPO_ROOT@';

/**
 * A freedesktop .desktop entry: the shared generated-from banner, one
 * install-substitution comment line, then nine lines against the files Phase 1
 * wrote by hand. One emitter, both variants; the dev and release files differ
 * in exactly three lines and all three differences come from the variant.
 *
 * THE ABSOLUTE PATHS ARE A TOKEN, NOT A PATH (D-04 as amended in
 * 02-DESIGN-G-02-11.md). A desktop entry must name an absolute executable, but
 * a tracked file carrying this checkout's absolute path is wrong at every
 * other checkout -- and the byte-identity gate comparing the tracked file
 * against the emitter output would then be red everywhere but here. So Exec
 * and Icon carry the token above followed by the variant's relative objdir /
 * branding_dir, and the substitution to a real absolute path happens at
 * install time (see the emitted comment line and docs/BUILD.md). No
 * machine-specific value enters configuration.toml -- that half of D-04 is
 * unchanged -- and the root is still never derived from the working directory.
 *
 * The header, Terminal, Type, Categories and the MimeType list are freedesktop
 * platform constants, not rebrand inputs, and are emitted literally.
 */
function emitDesktopEntry(config, variant) {
    // A .desktop group is line-oriented: a line break inside a value ends the
    // key it belongs to and starts a new one, so an unchecked Name= can write
    // its own Exec= line -- a launcher that runs an attacker-chosen command on
    // click. Every value below therefore passes the sink guard, and the two
    // folder paths are resolved and required to stay inside the project.
    const objdir = assertEmittable(variantPath(variant, 'objdir'), variant.objdir);
    const brandingDir = assertEmittable(variantPath(variant, 'branding_dir'), variant.branding_dir);
    // Resolved and required to stay inside the project, exactly as before --
    // but the resolved ABSOLUTE value no longer reaches the emitted line. The
    // guard stays because a manifest folder path escaping the tree must still
    // be refused; only the interpolation target changed to the token, which
    // carries no path and therefore cannot smuggle one past the guard.
    assertUnderRepo(variantPath(variant, 'objdir'), objdir);
    assertUnderRepo(variantPath(variant, 'branding_dir'), brandingDir);
    const binary = assertEmittable('identity.binary_name', config.identity.binary_name);
    const lines = [
        ...GENERATED_BANNER,
        `# Before installing, replace ${DESKTOP_ROOT_TOKEN} with this checkout's absolute path (docs/BUILD.md names the command).`,
        '[Desktop Entry]',
        `Name=${assertEmittable('identity.display_name', config.identity.display_name)}`
        + `${assertEmittable(variantPath(variant, 'name_suffix'), variant.name_suffix)}`,
        `Exec=${DESKTOP_ROOT_TOKEN}/${objdir}/dist/bin/${binary} %u`,
        `Icon=${DESKTOP_ROOT_TOKEN}/${brandingDir}/default128.png`,
        'Terminal=false',
        'Type=Application',
        'Categories=Development;IDE;',
        `StartupWMClass=${assertEmittable('identity.remoting_name', config.identity.remoting_name)}`,
        'MimeType=text/html;text/xml;application/xhtml+xml;application/xml;application/vnd.mozilla.xul+xml;application/rss+xml;application/rdf+xml;image/gif;image/jpeg;image/png;x-scheme-handler/http;x-scheme-handler/https;',
    ];
    return lines.join('\n') + '\n';
}

/**
 * The branding-directory layout files that carry zero manifest-derived
 * values, reproduced byte for byte. Each constant below is a literal copy of
 * its tracked counterpart at the time of writing -- dev and release are
 * byte-identical for all five, grep-verified -- and the tracked file stays
 * the independent comparand: verify-generated-identity.mjs compares every
 * new TARGETS row below against it, so a later hand edit to either side goes
 * red instead of drifting.
 *
 * A file carrying brand values would get a format emitter like emitBrandFtl
 * instead; a literal that froze a brand value would ship it under every
 * downstream's name. Nothing below interpolates the manifest, so no line
 * passes assertEmittable -- there is no sink to guard.
 */
const BRANDING_MOZ_BUILD_LINES = Object.freeze([
    '# This Source Code Form is subject to the terms of the Mozilla Public',
    '# License, v. 2.0. If a copy of the MPL was not distributed with this',
    '# file, You can obtain one at http://mozilla.org/MPL/2.0/.',
    '',
    'DIRS += ["content", "locales"]',
    '',
    'DIST_SUBDIR = "browser"',
    'export("DIST_SUBDIR")',
    '',
    'include("../../../browser/branding/branding-common.mozbuild")',
    'FirefoxBranding()',
]);

const BRANDING_CONTENT_JAR_LINES = Object.freeze([
    '# This Source Code Form is subject to the terms of the Mozilla Public',
    '# License, v. 2.0. If a copy of the MPL was not distributed with this',
    '# file, You can obtain one at http://mozilla.org/MPL/2.0/.',
    '#',
    '# Packages what this tree ships into the branding chrome package: the five',
    '# default*.png icons, and aboutDialog.css -- the branding stylesheet that',
    '# upstream\'s aboutDialog.xhtml loads as the third entry of its linkset.',
    '# Deliberately does not reference about.png, about-logo*, about-wordmark.svg,',
    '# firefox-wordmark.svg, document.ico or document_pdf.svg -- those are Mozilla',
    '# marks or assets this tree does not ship, and Phase 3\'s icon pipeline owns',
    '# the ones that will eventually be replaced.',
    '',
    'browser.jar:',
    '% content branding %content/branding/ contentaccessible=yes',
    '  content/branding/icon16.png                    (../default16.png)',
    '  content/branding/icon32.png                    (../default32.png)',
    '  content/branding/icon48.png                    (../default48.png)',
    '  content/branding/icon64.png                    (../default64.png)',
    '  content/branding/icon128.png                   (../default128.png)',
    '  content/branding/aboutDialog.css               (aboutDialog.css)',
]);

const BRANDING_CONTENT_MOZBUILD_LINES = Object.freeze([
    '# This Source Code Form is subject to the terms of the Mozilla Public',
    '# License, v. 2.0. If a copy of the MPL was not distributed with this',
    '# file, You can obtain one at http://mozilla.org/MPL/2.0/.',
    '',
    'JAR_MANIFESTS += ["jar.mn"]',
]);

const BRANDING_LOCALES_JAR_LINES = Object.freeze([
    '#filter substitution',
    '# This Source Code Form is subject to the terms of the Mozilla Public',
    '# License, v. 2.0. If a copy of the MPL was not distributed with this',
    '# file, You can obtain one at http://mozilla.org/MPL/2.0/.',
    '',
    '[localization] @AB_CD@.jar:',
    '  branding                                          (en-US/**/*.ftl)',
    '',
    '@AB_CD@.jar:',
    '% locale branding @AB_CD@ %locale/branding/',
    '# Unofficial branding only exists in en-US',
    '  locale/branding/brand.properties (en-US/brand.properties)',
]);

const BRANDING_LOCALES_MOZBUILD_LINES = Object.freeze([
    '# This Source Code Form is subject to the terms of the Mozilla Public',
    '# License, v. 2.0. If a copy of the MPL was not distributed with this',
    '# file, You can obtain one at http://mozilla.org/MPL/2.0/.',
    '',
    'JAR_MANIFESTS += ["jar.mn"]',
]);

/**
 * One literal emitter per layout file above. Each ignores its arguments --
 * writeTargets calls every emitter as emit(config, variant), and uniformity
 * there is worth more than a shorter parameter list here.
 */
function emitBrandingMozBuild() {
    return BRANDING_MOZ_BUILD_LINES.join('\n') + '\n';
}

function emitBrandingContentJarMn() {
    return BRANDING_CONTENT_JAR_LINES.join('\n') + '\n';
}

function emitBrandingContentMozBuild() {
    return BRANDING_CONTENT_MOZBUILD_LINES.join('\n') + '\n';
}

function emitBrandingLocalesJarMn() {
    return BRANDING_LOCALES_JAR_LINES.join('\n') + '\n';
}

function emitBrandingLocalesMozBuild() {
    return BRANDING_LOCALES_MOZBUILD_LINES.join('\n') + '\n';
}

/**
 * The branding stylesheet, reproduced byte for byte. It carries zero
 * manifest-derived values -- structural selectors, shell neutrals and prose
 * comments only, grep-verified -- so it is a literal like the five layout
 * files above, and for the same reason it cannot stay behind: the content
 * jar.mn above packages (aboutDialog.css), so a generated branding directory
 * without it is not a drop-in but a build break. Dev and release are
 * byte-identical.
 */
const BRANDING_ABOUT_DIALOG_CSS_LINES = Object.freeze([
    '/* This Source Code Form is subject to the terms of the Mozilla Public',
    ' * License, v. 2.0. If a copy of the MPL was not distributed with this',
    ' * file, You can obtain one at http://mozilla.org/MPL/2.0/. */',
    '',
    '@media not ((prefers-contrast) and (prefers-color-scheme: light)) {',
    '  #aboutDialogContainer {',
    '    /* The shell\'s dominant neutral (01-UI-SPEC.md "Color"). Replaces the',
    '       inherited Mozilla brand purple, which was a Mozilla brand value sitting',
    '       inside Power Browser\'s branding directory and invisible to the residual',
    '       scan, which matches brand tokens rather than hexes. */',
    '    background-color: #1a1a1a;',
    '    color: #fff;',
    '    color-scheme: dark;',
    '  }',
    '',
    '  #bottomBox {',
    '    /* #111 at 50% -- the shell\'s diagnostics-well neutral. Replaces the',
    '       translucent form of the same Mozilla brand hue. */',
    '    background-color: rgba(17, 17, 17, 0.5);',
    '  }',
    '}',
    '',
    '/* The wordmark-positioning block that used to sit here is removed. Every',
    '   declaration in it -- background sizing, inline margin, 64px top padding --',
    '   positioned the wordmark that upstream\'s own aboutDialog.css loads from',
    '   chrome://branding/content/about-wordmark.svg. This tree does not ship that',
    '   asset and this directory\'s jar.mn correctly does not package it. While this',
    '   stylesheet was itself unpackaged the block was inert; now that it loads, the',
    '   padding would reserve an empty 64px band above the version text for an image',
    '   that 404s. Phase 3\'s icon pipeline owns the wordmark; the block returns with',
    '   the asset. */',
    '',
    '#bottomBox {',
    '  padding: 15px 10px;',
    '}',
    '',
    '/* Suppress the stock outbound-link rows (G-01-3). Upstream hard-codes every',
    '   one of these hrefs as a literal attribute in aboutDialog.xhtml, so no pref',
    '   can reach them; this stylesheet is the third and last entry in that file\'s',
    '   linkset, which is the hook upstream provides to branding for exactly this.',
    '',
    '   #contributeDesc -- renders "Make a donation" and "get involved!".',
    '   #communityDesc  -- renders the community blurb. It was not in the user',
    '                      report; it is suppressed with the others rather than',
    '                      deferred because its visible label is this product\'s own',
    '                      vendor name while its target is mozilla.org -- the',
    '                      reported defect in its worst instance.',
    '   #communityExperimentalDesc -- the same blurb in its experimental-channel',
    '                      form. It renders inside upstream\'s',
    '                      <vbox id="experimental" hidden="true"> and is unhidden by',
    '                      upstream\'s own channel logic, so its mozilla.org link is',
    '                      dormant at the current ESR channel rather than absent. It',
    '                      is suppressed rather than exempted because an exemption',
    '                      list inside the checker would be a hand-kept expectation',
    '                      that can only ever agree with the tree it was copied from',
    '                      (01-REVIEW.md WR-08, CR-02).',
    '',
    '   The bottom row is MIXED, not outbound, and that is why the third entry is',
    '   qualified by href rather than naming the container. #bottomBox\'s link row',
    '   holds three children: "Licensing Information", whose href is the internal',
    '   about:license, and "Terms of Use" and "Privacy Notice", both destined for',
    '   https://www.mozilla.org. Only the two mozilla.org-destined children are',
    '   suppressed. The licence link STAYS VISIBLE: it is this product\'s only in-UI',
    '   route to its aggregated open-source licence text, and a build that ships',
    '   MPL-covered and third-party code with no such route has no surface on which',
    '   to discharge that disclosure. The row keeps its pack="center" layout with',
    '   one visible child. #trademark is #bottomBox\'s other child and is untouched.',
    '',
    '   A container-wide rule here took the licence link down with the vendor ones',
    '   (01-VERIFICATION.md Truth 9, 01-REVIEW.md CR-01); the qualified form and',
    '   scripts/verify-about-dialog-suppression.mjs together keep that closed. */',
    '#communityDesc,',
    '#communityExperimentalDesc,',
    '#contributeDesc,',
    '#bottomBox > hbox > .bottom-link[href^="https://www.mozilla.org"] {',
    '  display: none;',
    '}',
]);

function emitBrandingAboutDialogCss() {
    return BRANDING_ABOUT_DIALOG_CSS_LINES.join('\n') + '\n';
}

/**
 * The branding pref file, reproduced byte for byte with exactly one
 * variant-parameterised difference. The release file IS the first 164 lines
 * below; the dev file appends the BRAND-06 title-bar block (lines 166-188 of
 * the tracked dev file), which is a VARIANT property -- dev-only by design,
 * the release tree deliberately carries no such default -- and not a brand
 * value, so neither half interpolates the manifest.
 *
 * Split as base plus dev tail rather than two full copies: the two tracked
 * files share their first 164 lines, and two copies would let the shared
 * head drift into testing -- and shipping -- two things.
 */
const FIREFOX_BRANDING_BASE_LINES = Object.freeze([
    '/* This Source Code Form is subject to the terms of the Mozilla Public',
    ' * License, v. 2.0. If a copy of the MPL was not distributed with this',
    ' * file, You can obtain one at http://mozilla.org/MPL/2.0/. */',
    '',
    '// BRAND-04 (D-83..D-88): every pref that gates an unattended callout to a',
    '// host not in powerbrowser/endpoint-allowlist.json\'s `hosts` array. Every key',
    '// here that appears in the allowlist\'s `prefs` array must match its',
    '// `expect` value exactly -- scripts/verify-endpoints.sh layer 1 asserts',
    '// this on the installed, unpreprocessed copy of this file',
    '// (branding-common.mozbuild:13-15 hardcodes the filename).',
    '//',
    '// Prefs stay UNLOCKED (plain pref(), never the locking variant) so the',
    '// developer can flip them while debugging -- D-84. No autoconfig.js / .cfg',
    '// pair exists anywhere under powerbrowser/ (D-84 rejects that mechanism',
    '// explicitly).',
    '',
    'pref("startup.homepage_override_url", "");',
    'pref("startup.homepage_welcome_url", "");',
    'pref("startup.homepage_welcome_url.additional", "");',
    '',
    '// The Mozilla update-wizard URLs must not be carried forward from the',
    '// unofficial/ template (both pointed at nightly.mozilla.org).',
    'pref("app.update.url.manual", "");',
    'pref("app.update.url.details", "");',
    '',
    '// --- D-86: GMP manager -- Widevine stays working, no Mozilla host involved ---',
    '// Blanked so the GMP manager never contacts aus5.mozilla.org for a plugin',
    '// manifest. Widevine\'s own CDM fetch (widevinecdm.json\'s fileUrl,',
    '// edgedl.me.gvt1.com) does not depend on this pref, and',
    '// media.gmp-manager.allowLocalSources is deliberately left at its default',
    '// (true) -- it is a fallback flag, not an unattended-callout gate.',
    'pref("media.gmp-manager.url", "");',
    '// media.gmp-widevinecdm.enabled is intentionally NOT set here (D-86): it',
    '// routes to a handler that never fetches, and already defaults true on',
    '// Linux.',
    '',
    '// --- D-87: OpenH264 -- the one genuinely unattended download at startup ---',
    'pref("media.gmp-gmpopenh264.enabled", false);',
    '',
    '// --- D-84/D-87: system-addon update callout, killed before the URL is read ---',
    'pref("extensions.systemAddon.update.enabled", false);',
    'pref("extensions.systemAddon.update.url", "");',
    '',
    '// --- Telemetry / health-report / data-submission: defence in depth. The',
    '// health-report subsystem itself is compiled out (MOZ_SERVICES_HEALTHREPORT',
    '// = False, D-84), but these prefs are set anyway so a reader of this file',
    '// sees the intent stated even if a future rebuild ever restored the flag. ---',
    'pref("toolkit.telemetry.unified", false);',
    'pref("toolkit.telemetry.server", "");',
    'pref("datareporting.healthreport.uploadEnabled", false);',
    'pref("datareporting.policy.dataSubmissionEnabled", false);',
    '',
    '// --- Captive portal: browser/app/profile/firefox.js:1375 re-enables this',
    '// after toolkit\'s own all.js:3255 default of false -- our branding file',
    '// loads last (JS_PREFERENCE_FILES, branding-common.mozbuild) so this wins. ---',
    'pref("network.captive-portal-service.enabled", false);',
    'pref("captivedetect.canonicalURL", "");',
    '',
    '// --- Normandy/Shield: MOZ_NORMANDY is compiled out (D-84), so these prefs',
    '// are moot at runtime, but disabled anyway so the intent is stated in the',
    '// one place a reader would look. ---',
    'pref("app.normandy.enabled", false);',
    'pref("app.shield.optoutstudies.enabled", false);',
    '',
    '// --- Pocket / Discover feed / sponsored New Tab content ---',
    'pref("browser.newtabpage.activity-stream.discoverystream.enabled", false);',
    'pref("browser.newtabpage.activity-stream.showSponsored", false);',
    'pref("browser.newtabpage.activity-stream.showSponsoredTopSites", false);',
    'pref("browser.topsites.contile.enabled", false);',
    '',
    '// --- Region-lookup and Web Push server URLs (both resolve',
    '// location.services.mozilla.com / push.services.mozilla.com respectively,',
    '// which powerbrowser/endpoint-allowlist.json disposition `deny` -- neither',
    '// URL is essential to this phase\'s scope, no Theia-side feature depends on',
    '// them yet). The GEOLOCATION and PUSH *APIs themselves*',
    '// (geo.enabled/geo.provider.network.url, dom.push.enabled) are deliberately',
    '// left untouched: both fire only on an explicit site request, never at',
    '// unattended startup, and disabling the API surface would remove real',
    '// browser capability this phase has no reason to take away. ---',
    'pref("browser.region.network.url", "");',
    'pref("dom.push.serverURL", "");',
    '',
    '// --- AMO (services.addons.mozilla.org): discovered only once the layer-3',
    '// observation window was corrected from 20s to 35s (see verify-endpoints.sh)',
    '// -- Firefox\'s general periodic AddonManager update-check timer',
    '// (toolkit/components/timermanager/UpdateTimerManager.sys.mjs,',
    '// app.update.timerFirstInterval defaults to 30000ms) does not fire inside a',
    '// 20-second capture, so 03-02\'s original session never observed it. The',
    '// master switch stops every AddonRepository network call (langpack',
    '// matching, addon search/discovery, browser-mappings) in one pref; the',
    '// individual URLs are blanked too, belt-and-braces. ---',
    'pref("extensions.getAddons.cache.enabled", false);',
    'pref("extensions.getAddons.get.url", "");',
    'pref("extensions.getAddons.langpacks.url", "");',
    'pref("extensions.getAddons.discovery.api_url", "");',
    'pref("extensions.getAddons.browserMappings.url", "");',
    'pref("extensions.addonAbuseReport.url", "");',
    '',
    '// --- NetworkConnectivityService: the actual source of the cloudflare-dns.com',
    '// / example.org / ipv4only.arpa hosts observed by 03-02\'s real layer-3',
    '// capture. These are NOT network.trr.mode (which already defaults to 0/off',
    '// in this build, per modules/libpref/init/StaticPrefList.yaml -- TRR is not',
    '// active) -- they come from NetworkConnectivityService.cpp\'s own DNSv4/DNSv6/',
    '// DNS_HTTPS domain probes (network.connectivity-service.DNSv4.domain =',
    '// "example.org", .DNS_HTTPS.domain = "cloudflare-dns.com") and its hardcoded',
    '// ipv4only.arpa NAT64-prefix check (netwerk/base/NetworkConnectivityService.cpp:400).',
    '// Turned off at the single master switch: no DRM/security-parity rationale',
    '// applies (unlike Remote Settings/Safe Browsing), so per D-85 this',
    '// unattended, non-Mozilla-host-producing background prober is disabled',
    '// rather than waived. ---',
    'pref("network.connectivity-service.enabled", false);',
    '',
    '// --- BRAND-04 ledger entry 5 fix (2026-08-29): Gecko speculatively',
    '// DNS-prefetches link targets rendered by the Theia frontend --',
    '// network.dns.disablePrefetch defaults false',
    '// (modules/libpref/init/StaticPrefList.yaml:15308) and',
    '// network.dns.disablePrefetchFromHTTPS also defaults false (:15161), so',
    '// the origin scheme is irrelevant. Root cause traced to',
    '// theia/extensions/branding/src/browser/powerbrowser-welcome-widget.tsx:13\'s',
    '// POWERBROWSER_REPO_URL link to github.com. Disabled rather than removing',
    '// the link -- the link is a real, wanted affordance, and an explicit',
    '// click is a user request this pref does not block, only the',
    '// speculative prefetch. github.com stays a `deny` entry in',
    '// endpoint-allowlist.json so a regression fails the check. ---',
    'pref("network.dns.disablePrefetch", true);',
    '',
    '// --- BRAND-04 ledger entry 5 fix (2026-08-29): media.gmp-gmpopenh264.enabled',
    '// (above) does not stop the periodic auto-update task from resolving',
    '// ciscobinary.openh264.org. GMPProvider.findUpdates()',
    '// (toolkit/mozapps/extensions/internal/GMPProvider.sys.mjs:380-451) runs',
    '// on the general periodic AddonManager update timer regardless of',
    '// .enabled -- that pref only feeds GMPUtils.isPluginHidden/userDisabled,',
    '// and permissions (GMPProvider.sys.mjs:299-307) grants PERM_CAN_UPGRADE',
    '// unconditionally for a non-EME plugin like OpenH264. The real gate is',
    '// AddonManager.shouldAutoUpdate() (AddonManager.sys.mjs:4577-4598), which',
    '// falls through to this.autoUpdateDefault whenever the addon\'s own',
    '// applyBackgroundUpdates getter reports AUTOUPDATE_DEFAULT rather than an',
    '// explicit ENABLE/DISABLE -- and it always does here, because that getter',
    '// (GMPProvider.sys.mjs:347-358) gates on GMPPrefs.isSet(), which calls',
    '// Services.prefs.prefHasUserValue() and is therefore permanently false for',
    '// any value this default-branch pref file sets (media.gmp-gmpopenh264.',
    '// autoupdate cannot be closed from here at all -- confirmed live: setting',
    '// it false via this file had zero effect on the resolution). This global',
    '// switch is the one lever that IS a plain default-branch-readable bool',
    '// pref. Confirmed safe for Widevine: its own findUpdates() never reaches',
    '// this fallback at all -- media.eme.enabled defaults false on Linux',
    '// (StaticPrefList.yaml:12162-12175), so GMPProvider.appDisabled is true',
    '// for the EME plugin, and shouldAutoUpdate() returns false at the',
    '// PERM_CAN_UPGRADE check (line 4588) before applyBackgroundUpdates is',
    '// even read; a real EME/DRM request instead drives checkForUpdates() ->',
    '// simpleCheckAndInstall() (GMPProvider.sys.mjs:557-574), a separate call',
    '// path gated by its own media.gmp-widevinecdm.enabled default (true),',
    '// untouched by this pref. Traced live: with this pref at its stock true,',
    '// findUpdates() ran checkForAddons() ->',
    '// downloadLocalConfig(chrome://global/content/gmp-sources/openh264.json)',
    '// -> installAddon(), genuinely downloading and extracting the OpenH264',
    '// zip from ciscobinary.openh264.org; with it false, that call never ran.',
    '// media.gmp-gmpopenh264.enabled stays false too -- still correct, still',
    '// wanted, just not sufficient alone. ---',
    'pref("extensions.update.autoUpdateDefault", false);',
    '',
    '// Number of usages of the web console.',
    '// If this is less than 5, then pasting code into the web console is disabled',
    'pref("devtools.selfxss.count", 5);',
]);

const FIREFOX_BRANDING_DEV_TAIL_LINES = Object.freeze([
    '',
    '// --- BRAND-06 / D-82 / D-84: dev-only title bar for at-a-glance',
    '// distinguishability. Unlocked plain pref(), same mechanism as every other',
    '// entry in this file -- a developer can flip it while debugging, and no',
    '// autoconfig/.cfg pair exists anywhere under powerbrowser/ (D-84 rejects that',
    '// mechanism explicitly). This is a runtime default only: it changes no',
    '// compiled define, so no rebuild follows from editing it.',
    '//',
    '// browser.tabs.inTitlebar is a tri-state int (StaticPrefList.yaml:2096):',
    '// 0 = no (draw a real title bar), 1 = yes (tabs-in-titlebar/CSD),',
    '// 2 = default (true everywhere except Linux). The dev variant sets it to',
    '// the "no" case; the release tree deliberately carries no such default --',
    '// the absence is what makes the two variants differ.',
    '//',
    '// Mechanism chain: LookAndFeel::DrawInTitlebar()',
    '// (widget/nsXPLookAndFeel.cpp:1452, case 0 returns false) ->',
    '// Services.appinfo.drawInTitlebar -> browser-customtitlebar.js drops the',
    '// customtitlebar attribute -> a real title bar is painted, carrying the',
    '// window title (page title, then this variant\'s own -brand-full-name).',
    '//',
    '// Empirical reason this exists: 03-MANUAL-VERIFICATION.md Item A found',
    '// that with tabs-in-titlebar on, this desktop paints no title bar at all,',
    '// so the display name never reaches any surface a person can see.',
    'pref("browser.tabs.inTitlebar", 0);',
]);

/**
 * The one emitter both pref rows share. The dev-only tail is a property of
 * the VARIANT, not of the brand: no manifest value selects it, so the branch
 * is on the variant id, the two values this project builds.
 */
function emitFirefoxBrandingJs(config, variant) {
    void config;
    const lines = variant.id === 'dev'
        ? [...FIREFOX_BRANDING_BASE_LINES, ...FIREFOX_BRANDING_DEV_TAIL_LINES]
        : FIREFOX_BRANDING_BASE_LINES;
    return lines.join('\n') + '\n';
}

/**
 * One `name = value` term out of an in-memory locale body. The same shape as
 * verify-branding-preflight.mjs's ftlTerm/propTerm: a line-anchored match on
 * the term name, trimmed. All three agreement keys below are letters and
 * hyphens only, so no escaping is needed to interpolate them.
 */
function localeTermValue(body, key) {
    const m = body.match(new RegExp(`^${key}\\s*=\\s*(.*)$`, 'm'));
    return m ? m[1].trim() : null;
}

/**
 * The ftl-versus-properties term pairs that must agree within one variant.
 * Each row names the Fluent term, the properties key, and the plain-words
 * surface they are two halves of.
 */
const LOCALE_AGREEMENT_PAIRS = Object.freeze([
    Object.freeze({ ftl: '-brand-full-name', props: 'brandFullName', what: 'the full name' }),
    Object.freeze({ ftl: '-brand-short-name', props: 'brandShortName', what: 'the short name' }),
    Object.freeze({ ftl: '-brand-shorter-name', props: 'brandShorterName', what: 'the shorter name' }),
]);

/**
 * Assert the cross-file agreement on the IN-MEMORY bodies of one emit pass,
 * before anything is written. A mismatch here means the two emitters
 * disagree with each other -- both derive from the same manifest, so
 * configuration.toml is never the cause and the message says so, naming
 * both files and both values.
 *
 * Returns failures rather than reporting them, so writeTargets folds them
 * into its single emit-all-then-write report and --self-test drives this
 * function directly on crafted bodies.
 */
function localeAgreementFailures(entries) {
    const groups = new Map();
    for (const { rel, body } of entries) {
        const base = rel.split('/').pop();
        if (base !== 'brand.ftl' && base !== 'brand.properties') continue;
        const dir = rel.slice(0, rel.length - base.length);
        let group = groups.get(dir);
        if (group === undefined) {
            group = {};
            groups.set(dir, group);
        }
        group[base === 'brand.ftl' ? 'ftl' : 'props'] = { rel, body };
    }
    const failures = [];
    for (const group of groups.values()) {
        if (group.ftl === undefined || group.props === undefined) continue;
        for (const { ftl, props, what } of LOCALE_AGREEMENT_PAIRS) {
            const ftlValue = localeTermValue(group.ftl.body, ftl);
            const propsValue = localeTermValue(group.props.body, props);
            if (ftlValue !== propsValue) {
                failures.push(
                    `generated/${group.ftl.rel}'s ${ftl} carries ${JSON.stringify(ftlValue)} but generated/${group.props.rel}'s ${props} carries ${JSON.stringify(propsValue)} -- the two halves of ${what} disagree. `
                    + `Next step: report this; ${MANIFEST_NAME} is not the cause and editing it will not help.`,
                );
            }
        }
    }
    return failures;
}

// --- GEN-02: the icon pipeline ------------------------------------------------
//
// brand/mark.svg is the ONLY icon input a downstream touches. Five square PNG
// rasters per variant are drawn from it through the system inkscape, and the
// Windows ICO plus macOS ICNS containers (this plan's second task) wrap those
// same bytes. No manifest key selects the source artwork, the sizes, or the
// outputs: the source is the literal below, the sizes are the frozen array
// below, and the ten destination paths are TARGETS rows like every other
// output. That is structurally what stops a hostile filename reaching the
// inkscape command line: no manifest value is ever joined into it (T-03-04).
//
// The raster runs INSIDE the emit pass, before any write: writeTargets calls
// rasterizeIcons before its text emitters and long before its write loop, so
// a missing or non-square source fails with the tree exactly as it was found.
// A source already at a target size takes the same path -- there is no
// passthrough shortcut to drift out of sync with the rest. Dev and release
// rasters come from the same source, so their bytes are identical, and they
// are still written as ten separate files: separate, never merged or
// deduplicated.

/** The icon sizes in pixels, ascending. The raster order is this order. */
const ICON_SIZES = Object.freeze([16, 32, 48, 64, 128]);

/**
 * The single source artwork. A fixed literal, never a manifest value -- see
 * above -- so the path a reader restores on a missing-source failure is
 * always this one.
 */
const MARK_SVG_REL = 'brand/mark.svg';
const MARK_SVG_ABS = join(REPO_ROOT, MARK_SVG_REL);

/** The first eight bytes of every PNG, checked on each raster output. */
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * The squareness rule against one SVG document's text. Returns failures
 * rather than reporting them, so writeTargets folds them into its single
 * emit-all-then-write report and --self-test drives this function directly
 * on crafted fixtures -- the same split localeAgreementFailures uses.
 *
 * P-GEN-02: a non-square source is a hard failure naming the asset and the
 * rule, never a stretch, a letterbox, or a quiet substitution.
 */
function iconSourceFailuresForText(svgText) {
    const m = svgText.match(/viewBox\s*=\s*"([^"]+)"/);
    if (m === null) {
        return [
            `${MARK_SVG_REL} does not declare a viewBox, so its shape cannot be checked against the square-artwork rule every icon depends on. `
            + `Give the svg element a square viewBox, then run: ${RERUN}`,
        ];
    }
    const parts = m[1].split(/[\s,]+/).filter(p => p !== '').map(Number);
    if (parts.length !== 4 || parts.some(n => !Number.isFinite(n))) {
        return [
            `${MARK_SVG_REL} declares a viewBox of ${JSON.stringify(m[1])}, which is not four numbers, so its shape cannot be checked against the square-artwork rule. `
            + `Give the svg element a square viewBox, then run: ${RERUN}`,
        ];
    }
    const width = parts[2];
    const height = parts[3];
    if (!(width > 0) || width !== height) {
        return [
            `${MARK_SVG_REL} is ${width} wide by ${height} tall, but every icon must come from square artwork. `
            + `Replace it with a square logo, then run: ${RERUN}`,
        ];
    }
    return [];
}

/**
 * The squareness rule against the source file. `readFrom` is a parameter for
 * one reason: --self-test points it at a path that is not there, to prove
 * the missing-source message, without touching the real artwork. The message
 * still names MARK_SVG_REL -- the fixed asset a reader restores, not the
 * probe's throwaway path, which must never reach what a reader sees.
 */
function iconSourceFailures(readFrom = MARK_SVG_ABS) {
    let svgText;
    try {
        svgText = readFileSync(readFrom, 'utf8');
    } catch {
        return [
            `${MARK_SVG_REL} is missing, so the icons for both variants cannot be generated. `
            + `Restore ${MARK_SVG_REL} at the top of the project, then run: ${RERUN}`,
        ];
    }
    if (svgText.length === 0) {
        return [
            `${MARK_SVG_REL} is empty, so the icons for both variants cannot be generated. `
            + `Restore the artwork in ${MARK_SVG_REL}, then run: ${RERUN}`,
        ];
    }
    return iconSourceFailuresForText(svgText);
}

/**
 * Raster bytes by size, warmed once per process. The inkscape invocation is
 * a fixed argument array -- no shell, no joined strings, sizes from the
 * frozen array -- with the scratch output under a mkdtemp directory removed
 * in a finally.
 */
const iconRasterCache = new Map();

function iconPngBytes(size) {
    const hit = iconRasterCache.get(size);
    if (hit !== undefined) return hit;
    // Validated on every cold miss, not only on the writeTargets path, so a
    // direct emitter call -- the byte-identity gate, the agreement mirror --
    // fails with the same plain-words message instead of spawning inkscape
    // on artwork that already failed the rule.
    report(iconSourceFailures());
    const scratch = mkdtempSync(join(tmpdir(), 'generate-icons-'));
    try {
        const out = join(scratch, `icon${size}.png`);
        const child = spawnSync('inkscape', [
            MARK_SVG_ABS,
            '--export-filename', out,
            '-w', String(size),
            '-h', String(size),
        ], { encoding: 'utf8' });
        // The child's own output is deliberately unread: a failure here must
        // speak plain words, never inkscape's vocabulary or this machine's
        // paths, which the self-test's no-internals assertion enforces.
        let bytes = null;
        try {
            bytes = readFileSync(out);
        } catch {
            bytes = null;
        }
        if (child.error !== undefined || child.status !== 0 || bytes === null
            || bytes.length < 24 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)
            || bytes.readUInt32BE(16) !== size || bytes.readUInt32BE(20) !== size) {
            report([
                `${MARK_SVG_REL} could not be turned into the ${size}-pixel icon. `
                + `Check that the artwork opens as an image, then run: ${RERUN}`,
            ]);
        }
        iconRasterCache.set(size, bytes);
        return bytes;
    } finally {
        rmSync(scratch, { recursive: true, force: true });
    }
}

/**
 * GEN-02's named step: validate the source once, then rasterize every size
 * in the frozen ascending order. Called from writeTargets inside the emit
 * pass, before any write.
 */
function rasterizeIcons() {
    report(iconSourceFailures());
    for (const size of ICON_SIZES) iconPngBytes(size);
}

/**
 * One TARGETS row's emitter per size: the cached raster bytes for it. The
 * variant contributes nothing -- both variants rasterize the same source --
 * and uniformity with every other row's emit(config, variant) signature is
 * worth more than a shorter parameter list here.
 */
function emitIconPng(size) {
    return (config, variant) => {
        void config;
        void variant;
        return iconPngBytes(size);
    };
}

/**
 * Every output path lives here and nowhere else, and the default run, --check
 * and plan 02-05's byte-identity gate all iterate this one array.
 *
 * BOTH PATHS IN EVERY ENTRY ARE STRING LITERALS. No value out of
 * configuration.toml is ever joined into a write path -- a variant carries
 * branding_dir and objdir as emitted CONTENT, never as a write target. That is
 * structurally what stops a config key directing a write outside generated/
 * (T-02-02, GEN-04), and it is why the variant schema carries no
 * output-filename key at all: there is nowhere for one to be honoured.
 *
 * THAT PROPERTY IS ABOUT WRITE PATHS AND NOTHING ELSE. It says where the bytes
 * land, not what they say, and reading it as the whole threat model is a
 * mistake this comment used to invite: manifest values ARE joined into the
 * emitted CONTENT, and that content is a shell script the Gecko build sources
 * and a launcher the desktop runs. Those sinks have their own guard --
 * a schema pattern per key, backed by assertEmittable at each interpolation.
 *
 * The two generated .desktop filenames are FIXED platform identifiers in Phase
 * 2. Naming a downstream's installed desktop entry after its own binary is
 * GEN-03 and belongs to Phase 3's packaging surfaces; doing it here would mean
 * a manifest value chose a filename, which is exactly the property above.
 */
export const TARGETS = Object.freeze([
    Object.freeze({
        generated: '.mozconfig',
        tracked: '.mozconfig',
        variant: 'dev',
        emit: emitMozconfig,
    }),
    Object.freeze({
        generated: 'branding/dev/configure.sh',
        tracked: 'powerbrowser/branding/dev/configure.sh',
        variant: 'dev',
        emit: emitConfigureSh,
    }),
    Object.freeze({
        generated: 'branding/release/configure.sh',
        tracked: 'powerbrowser/branding/release/configure.sh',
        variant: 'release',
        emit: emitConfigureSh,
    }),
    Object.freeze({
        generated: 'powerbrowser.desktop',
        tracked: 'powerbrowser/powerbrowser.desktop',
        variant: 'dev',
        emit: emitDesktopEntry,
    }),
    Object.freeze({
        generated: 'powerbrowser-release.desktop',
        tracked: 'powerbrowser/powerbrowser-release.desktop',
        variant: 'release',
        emit: emitDesktopEntry,
    }),
    Object.freeze({
        generated: 'branding/dev/locales/en-US/brand.ftl',
        tracked: 'powerbrowser/branding/dev/locales/en-US/brand.ftl',
        variant: 'dev',
        emit: emitBrandFtl,
    }),
    Object.freeze({
        generated: 'branding/dev/locales/en-US/brand.properties',
        tracked: 'powerbrowser/branding/dev/locales/en-US/brand.properties',
        variant: 'dev',
        emit: emitBrandProperties,
    }),
    Object.freeze({
        generated: 'branding/release/locales/en-US/brand.ftl',
        tracked: 'powerbrowser/branding/release/locales/en-US/brand.ftl',
        variant: 'release',
        emit: emitBrandFtl,
    }),
    Object.freeze({
        generated: 'branding/release/locales/en-US/brand.properties',
        tracked: 'powerbrowser/branding/release/locales/en-US/brand.properties',
        variant: 'release',
        emit: emitBrandProperties,
    }),
    Object.freeze({
        generated: 'branding/dev/moz.build',
        tracked: 'powerbrowser/branding/dev/moz.build',
        variant: 'dev',
        emit: emitBrandingMozBuild,
    }),
    Object.freeze({
        generated: 'branding/dev/content/jar.mn',
        tracked: 'powerbrowser/branding/dev/content/jar.mn',
        variant: 'dev',
        emit: emitBrandingContentJarMn,
    }),
    Object.freeze({
        generated: 'branding/dev/content/moz.build',
        tracked: 'powerbrowser/branding/dev/content/moz.build',
        variant: 'dev',
        emit: emitBrandingContentMozBuild,
    }),
    Object.freeze({
        generated: 'branding/dev/locales/jar.mn',
        tracked: 'powerbrowser/branding/dev/locales/jar.mn',
        variant: 'dev',
        emit: emitBrandingLocalesJarMn,
    }),
    Object.freeze({
        generated: 'branding/dev/locales/moz.build',
        tracked: 'powerbrowser/branding/dev/locales/moz.build',
        variant: 'dev',
        emit: emitBrandingLocalesMozBuild,
    }),
    Object.freeze({
        generated: 'branding/dev/content/aboutDialog.css',
        tracked: 'powerbrowser/branding/dev/content/aboutDialog.css',
        variant: 'dev',
        emit: emitBrandingAboutDialogCss,
    }),
    Object.freeze({
        generated: 'branding/dev/pref/firefox-branding.js',
        tracked: 'powerbrowser/branding/dev/pref/firefox-branding.js',
        variant: 'dev',
        emit: emitFirefoxBrandingJs,
    }),
    Object.freeze({
        generated: 'branding/release/moz.build',
        tracked: 'powerbrowser/branding/release/moz.build',
        variant: 'release',
        emit: emitBrandingMozBuild,
    }),
    Object.freeze({
        generated: 'branding/release/content/jar.mn',
        tracked: 'powerbrowser/branding/release/content/jar.mn',
        variant: 'release',
        emit: emitBrandingContentJarMn,
    }),
    Object.freeze({
        generated: 'branding/release/content/moz.build',
        tracked: 'powerbrowser/branding/release/content/moz.build',
        variant: 'release',
        emit: emitBrandingContentMozBuild,
    }),
    Object.freeze({
        generated: 'branding/release/locales/jar.mn',
        tracked: 'powerbrowser/branding/release/locales/jar.mn',
        variant: 'release',
        emit: emitBrandingLocalesJarMn,
    }),
    Object.freeze({
        generated: 'branding/release/locales/moz.build',
        tracked: 'powerbrowser/branding/release/locales/moz.build',
        variant: 'release',
        emit: emitBrandingLocalesMozBuild,
    }),
    Object.freeze({
        generated: 'branding/release/content/aboutDialog.css',
        tracked: 'powerbrowser/branding/release/content/aboutDialog.css',
        variant: 'release',
        emit: emitBrandingAboutDialogCss,
    }),
    Object.freeze({
        generated: 'branding/release/pref/firefox-branding.js',
        tracked: 'powerbrowser/branding/release/pref/firefox-branding.js',
        variant: 'release',
        emit: emitFirefoxBrandingJs,
    }),
    // NEW (03-02): GEN-02's icon rasters. Five exact-size PNGs per variant
    // drawn from the single brand/mark.svg through the system inkscape, with
    // the tracked Phase 1 rasters as comparands -- inkscape 1.4.4 on this
    // host reproduces those bytes deterministically. Dev and release come
    // from the same source, so their bytes are identical, and they are still
    // ten separate rows and ten separate files, never merged or deduplicated.
    Object.freeze({
        generated: 'branding/dev/default16.png',
        tracked: 'powerbrowser/branding/dev/default16.png',
        variant: 'dev',
        emit: emitIconPng(16),
    }),
    Object.freeze({
        generated: 'branding/dev/default32.png',
        tracked: 'powerbrowser/branding/dev/default32.png',
        variant: 'dev',
        emit: emitIconPng(32),
    }),
    Object.freeze({
        generated: 'branding/dev/default48.png',
        tracked: 'powerbrowser/branding/dev/default48.png',
        variant: 'dev',
        emit: emitIconPng(48),
    }),
    Object.freeze({
        generated: 'branding/dev/default64.png',
        tracked: 'powerbrowser/branding/dev/default64.png',
        variant: 'dev',
        emit: emitIconPng(64),
    }),
    Object.freeze({
        generated: 'branding/dev/default128.png',
        tracked: 'powerbrowser/branding/dev/default128.png',
        variant: 'dev',
        emit: emitIconPng(128),
    }),
    Object.freeze({
        generated: 'branding/release/default16.png',
        tracked: 'powerbrowser/branding/release/default16.png',
        variant: 'release',
        emit: emitIconPng(16),
    }),
    Object.freeze({
        generated: 'branding/release/default32.png',
        tracked: 'powerbrowser/branding/release/default32.png',
        variant: 'release',
        emit: emitIconPng(32),
    }),
    Object.freeze({
        generated: 'branding/release/default48.png',
        tracked: 'powerbrowser/branding/release/default48.png',
        variant: 'release',
        emit: emitIconPng(48),
    }),
    Object.freeze({
        generated: 'branding/release/default64.png',
        tracked: 'powerbrowser/branding/release/default64.png',
        variant: 'release',
        emit: emitIconPng(64),
    }),
    Object.freeze({
        generated: 'branding/release/default128.png',
        tracked: 'powerbrowser/branding/release/default128.png',
        variant: 'release',
        emit: emitIconPng(128),
    }),
]);

function variantById(config, id) {
    return (config.variants ?? []).find(v => v.id === id);
}

/**
 * Emit every target under `root`. The root is a PARAMETER for one reason: it is
 * what lets --check emit a fresh comparand into a temporary directory using the
 * same writer the default run uses. Two writers would let the checked bytes and
 * the written bytes drift apart, and the check would then be comparing against
 * something no run ever produces.
 *
 * The root is the ONLY thing a caller supplies. Every path underneath it still
 * comes from the frozen table, so passing a different root moves the whole tree
 * and cannot reshape it.
 */
function writeTargets(config, root) {
    // EMIT EVERYTHING FIRST, WRITE NOTHING YET. The file header promises that a
    // failed run leaves the output tree exactly as it found it, and a check
    // inside the write loop cannot keep that promise: a manifest declaring only
    // the dev variant used to write the first two targets and then exit on the
    // third, and the next --check reported two stale files and two absent ones
    // on top of the real problem. Every failure a target can raise -- a missing
    // variant here, a rejected value inside an emitter -- is raised during this
    // pass, while the tree is still untouched.
    const failures = [];
    const pending = [];
    // GEN-02. The icon source is validated and every size rasterized BEFORE
    // the text emitters run and long before the write loop below -- a missing
    // or non-square brand/mark.svg fails with the tree exactly as it was
    // found, and the ten PNG rows below read their bodies straight out of the
    // same cache, so what is written is what was just rasterized.
    rasterizeIcons();
    for (const target of TARGETS) {
        const variant = variantById(config, target.variant);
        if (variant === undefined) {
            failures.push(
                `${MANIFEST_NAME} declares no build variant with id ${JSON.stringify(target.variant)}. `
                + `Open ${MANIFEST_NAME}, add a [[variants]] section whose id is ${JSON.stringify(target.variant)}, `
                + `then run: ${RERUN}`,
            );
            continue;
        }
        pending.push({ outPath: join(root, target.generated), rel: target.generated, body: target.emit(config, variant) });
    }
    report(failures);

    // GEN-01. The ftl-versus-properties agreement runs HERE, on the in-memory
    // bodies, while the tree is still untouched -- a failed run leaves the
    // output exactly as it found it, which the file header promises. A
    // mismatch means the two emitters disagree with each other, never that
    // the manifest is wrong, so its message already says where to look.
    failures.push(...localeAgreementFailures(pending));
    report(failures);

    for (const { outPath, body } of pending) {
        mkdirSync(dirname(outPath), { recursive: true });
        writeFileSync(outPath, body, 'utf8');
    }
    return pending.length;
}

// --- 5. --check: report whether the tree matches, and change nothing --------

/**
 * Every file under `dir`, as slash-joined paths relative to it. Recursive,
 * because the comparison has to see a leftover at any depth -- a stale
 * branding/dev/configure.sh from an emitter that was later removed sits two
 * levels down, and a top-level-only listing would never notice it.
 */
function filesUnder(dir, prefix, out) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) filesUnder(join(dir, entry.name), rel, out);
        else out.push(rel);
    }
    return out;
}

/**
 * The 1-based number of the first line that differs, or 0 if they are equal.
 * REPORTING AID ONLY. The assertion above is Buffer.compare -- byte-identity --
 * and this runs only after that assertion has already failed, to say where. A
 * line differ used as the check itself would call two files identical when they
 * differ in trailing whitespace or in line endings, which is exactly the class
 * of difference this phase's acceptance test is about.
 */
function firstDifferingLine(a, b) {
    const x = a.split('\n');
    const y = b.split('\n');
    for (let i = 0; i < Math.max(x.length, y.length); i += 1) {
        if (x[i] !== y[i]) return i + 1;
    }
    return 0;
}

/**
 * Compare what is on disk against what the manifest would produce right now.
 *
 * WRITES NOTHING UNDER generated/, EVER. The fresh copy goes into a unique
 * mkdtempSync directory removed in a finally. That is not tidiness: a check
 * that regenerates in place and then compares cannot tell "was already fresh"
 * from "I just made it fresh", and a check that cannot go red is not a check.
 * The directory is unique per invocation rather than a fixed temporary path, so
 * two runs at once compare against their own emission instead of overwriting
 * each other's (T-02-12).
 *
 * THREE OUTCOMES, THREE MESSAGES, deliberately not one. An absent generated/ is
 * the state every fresh copy of the project and every automated run begins in;
 * reporting it as thirty-three stale files reads as thirty-three problems and sends the reader
 * hunting a mismatch that does not exist.
 *
 * The set comparison runs in BOTH directions. A per-target loop alone sees a
 * file that is missing or wrong but is blind to one that should no longer be
 * there at all, so an emitter deleted later would leave its output behind
 * forever with nothing to notice.
 *
 * Returns an exit code rather than exiting, so the temporary directory's
 * cleanup is not skipped on the way out.
 *
 * `root` is a PARAMETER for the same reason writeTargets' is, and for one more:
 * --self-test drives THIS function, not a re-implementation of it, by pointing
 * it at a throwaway tree it is free to corrupt. The tracked files and the
 * real generated/ are never touched by a planted fault (02-05's rule). The
 * reported paths keep the `generated/` prefix whatever the root is, because
 * that prefix names the output surface a reader has to go and fix, not the
 * directory this invocation happened to read.
 */
function checkTargets(config, root = OUTPUT_ROOT) {
    if (!existsSync(root)) {
        // NOT A FAILURE, and the message already said so while exiting 1
        // anyway. This row's contract is IDEMPOTENCE -- that a second run
        // produces the same bytes as the first -- and a tree that has never
        // generated cannot disagree with itself. generated/ is git-ignored, so
        // that is the state of every fresh clone, which made
        // `verify-platform.sh --quick` -- the documented commit gate -- red on
        // every fresh clone for a non-defect. A gate red for a non-defect is a
        // gate its readers learn to skip, which is the failure mode
        // verify-generated-identity.mjs's own header is built to avoid.
        //
        // Whether the emitters agree with the hand-written files is the
        // DIFFERENT question generated-byte-identity answers, and it answers it
        // without needing a prior generate at all -- so nothing goes unchecked
        // on the tree this branch reports on.
        console.log(`${NAME}: --check SKIP -- nothing has been generated in this copy of the project yet, so there is nothing to compare.`);
        console.log('  The generated/ folder is not stored with the project, so a fresh copy of it starts out without one. This is not a mismatch.');
        console.log(`  To generate it, run: ${RERUN}`);
        return 0;
    }

    const dir = mkdtempSync(join(tmpdir(), 'generate-check-'));
    try {
        writeTargets(config, dir);
        const fresh = filesUnder(dir, '', []).sort();

        // Non-vacuity. A comparison whose comparand is empty agrees with
        // anything at all, so it must fail as broken instrumentation rather
        // than report a clean diff of nothing against nothing.
        if (fresh.length === 0) {
            console.error(`${NAME}: FAIL -- the check produced no files of its own to compare against, so its result would mean nothing either way.`);
            console.error(`  Next step: report this; ${MANIFEST_NAME} is not the cause and editing it will not help.`);
            return 1;
        }

        const onDisk = filesUnder(root, '', []).sort();

        // The two classes are collected SEPARATELY because they have different
        // next steps, and a next step that does not fix the thing it is offered
        // for is worse than none: regenerating replaces a file that differs, but
        // it never removes one that should not be there.
        const stale = [];
        const extra = [];

        for (const rel of fresh) {
            if (!onDisk.includes(rel)) {
                stale.push(`generated/${rel} -- is not there`);
                continue;
            }
            const want = readFileSync(join(dir, rel));
            const have = readFileSync(join(root, rel));
            if (Buffer.compare(want, have) !== 0) {
                const at = firstDifferingLine(have.toString('utf8'), want.toString('utf8'));
                stale.push(`generated/${rel} -- differs, from line ${at}`);
            }
        }

        for (const rel of onDisk) {
            if (!fresh.includes(rel)) {
                extra.push(`generated/${rel} -- is not one of the files this project generates`);
            }
        }

        if (stale.length === 0 && extra.length === 0) {
            console.log(`${NAME}: --check PASS -- all ${fresh.length} generated file(s) match ${MANIFEST_NAME}`);
            return 0;
        }

        console.error(`${NAME}: FAIL -- ${stale.length + extra.length} file(s) under generated/ do not match ${MANIFEST_NAME}`);
        for (const line of [...stale, ...extra]) console.error(`  ${line}`);
        if (stale.length > 0) {
            console.error(`  Next step: run: ${RERUN}`);
            console.error(`  Anything changed by hand under generated/ is overwritten by that -- make the change in ${MANIFEST_NAME} instead.`);
        }
        if (extra.length > 0) {
            console.error('  Next step for the file(s) above that this project does not generate: delete them, or move them out of generated/ if you meant to keep them.');
        }
        return 1;
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}

// --- the pipeline ------------------------------------------------------------

/**
 * Parse both layers, reject unknown settings in either, mask, merge, validate.
 *
 * RETURNS rather than exits on a validation failure, because --self-test has to
 * read the failures a planted fault produced. Only the two conditions a
 * self-test can never provoke -- a missing file and an unparseable one -- still
 * exit from inside loadLayer.
 *
 * The defaults path DEFAULTS to this repo's manifest so an importer -- 02-05's
 * byte-identity gate -- can ask for the resolved config without being handed a
 * fourth export naming the manifest, and without spelling that filename a
 * second time somewhere it could drift.
 */
export function resolveConfig(defaultsPath = MANIFEST_PATH, downstreamPath) {
    const defaultsLayer = loadLayer(defaultsPath);
    const downstreamLayer = downstreamPath === undefined
        ? requiredLayer(defaultsLayer, SCHEMA_KEYS)
        : loadLayer(downstreamPath);

    const leaves = [];
    const refused = [];
    collectLeaves(defaultsLayer, '', leaves, refused);
    collectLeaves(downstreamLayer, '', leaves, refused);
    const unknown = [...new Set(rejectUnknown(leaves, refused))];
    if (unknown.length > 0) return { failures: unknown, config: undefined, defaulted: [] };

    const masked = maskDefaults(defaultsLayer, SCHEMA_KEYS);
    const { value: config, defaulted } = mergeLayers(masked, downstreamLayer);

    const mergedLeaves = [];
    collectLeaves(config, '', mergedLeaves, []);
    return { failures: validate(config, mergedLeaves), config, defaulted };
}

/**
 * D-08. One line per inherited default, on stderr, on EVERY run -- so a
 * downstream is told exactly which of this project's values it is shipping
 * rather than having to diff two manifests to find out.
 *
 * Nothing is printed for a setting the downstream stated: the merge only
 * recorded the ones it defaulted, so this is a sort and a loop and not a
 * filter. Dotted key paths are unique, so the sort has no ties and needs no
 * tiebreaker. Values are rendered with JSON.stringify, which quotes a string,
 * makes an empty one visible, and puts an array on one line.
 *
 * stderr, because stdout carries the single PASS line every registered gate in
 * this repo reports through.
 */
function echoDefaults(defaulted, config) {
    for (const path of [...defaulted].sort()) {
        console.error(`${NAME}: default applied -- ${path} = ${JSON.stringify(readPath(config, path))}`);
    }
}

// --- self-test: planted faults that must each go red ------------------------

/** Every required setting, stated. Each fixture below breaks exactly one thing. */
const FIXTURE_BASE = [
    '[product]',
    'vendor_machine = "AcmeWorks"',
    'vendor_display = "Acme Works"',
    '',
    '[identity]',
    'display_name = "Acme Browser"',
    'app_basename = "acme-browser"',
    'binary_name = "acme-browser"',
    'remoting_name = "acme-browser"',
    'distribution_id = "org.acmeworks"',
    '',
    '[legal]',
    'license = "MIT"',
    'copyright_holder = "Acme Works"',
    'trademark_notice = "Acme Browser is a trademark of Acme Works."',
    '',
].join('\n');

/**
 * ONE complete build variant, stated. Written out once because two cases below
 * need it -- one whole, one with a single setting removed -- and a second copy
 * would let the two drift into testing different things.
 */
const FIXTURE_VARIANT = [
    '[[variants]]',
    'id = "dev"',
    'name_suffix = " Dev"',
    'branding_dir = "powerbrowser/branding/dev"',
    'objdir = "objdir"',
    '',
].join('\n');

/** Does `text` carry `needle`, which is either a literal or a pattern? */
function carries(text, needle) {
    return needle instanceof RegExp ? needle.test(text) : text.includes(needle);
}

/**
 * Run `fn` with console.log and console.error COLLECTED rather than printed,
 * so a case can assert on what a caller would have seen. The freshness cases
 * drive checkTargets, which reports through the console rather than by
 * returning a failure list, and a case that could not read that report could
 * only assert the exit code -- which is 1 for every one of the distinct
 * outcomes and so cannot tell them apart.
 *
 * Restored in a finally. A self-test that left the console swallowed on its way
 * out would silence every case after it and the run would still say PASS.
 */
function capture(fn) {
    const lines = [];
    const [log, error] = [console.log, console.error];
    const collect = (...parts) => { lines.push(parts.join(' ')); };
    console.log = collect;
    console.error = collect;
    try {
        fn();
    } finally {
        console.log = log;
        console.error = error;
    }
    return lines;
}

/** Sentinel for a probe whose planted fault did not land. See BROKEN below. */
const BROKEN = 'planted-fault instrument broken --';

/**
 * The absent-output case's second assertion, named once and read from here by
 * both the probe that can emit it and the case that forbids it, so the two
 * cannot drift into agreeing about different strings.
 */
const ABSENT_EXIT_MARK = 'a fresh copy of the project was failed for something that is not a mismatch:';

/**
 * The state of generated/ as one comparable string, or the fact that it is
 * absent. CFG-03's rule is that a rejected value is REJECTED, never quietly
 * transformed into a passing one -- and a rejection that still emitted output
 * would be a half-rejection. This is what lets a case assert that.
 */
function snapshotOutputRoot() {
    return existsSync(OUTPUT_ROOT) ? filesUnder(OUTPUT_ROOT, '', []).sort().join('\n') : '(absent)';
}

/**
 * Generate a whole tree into a throwaway directory, corrupt ONE byte of ONE
 * file, and ask the freshness comparison about it. The corruption lands in a
 * mkdtemp copy and never on the tracked files: they are the independent
 * comparand this phase's acceptance test rests on, and a self-test one
 * interrupted run away from damaging them would be trading the thing proved
 * for the proof.
 */
function probeStaleOutput(config) {
    const root = mkdtempSync(join(tmpdir(), 'generate-selftest-stale-'));
    try {
        writeTargets(config, root);
        const victim = join(root, TARGETS[0].generated);
        const before = readFileSync(victim);
        writeFileSync(victim, Buffer.concat([before, Buffer.from(' ')]));
        // Mutation-landed guard. A drift the comparison then fails to notice is
        // the finding; a drift that was never written is broken instrumentation
        // reporting green, which is worse than a red.
        if (Buffer.compare(before, readFileSync(victim)) === 0) {
            return [`${BROKEN} the planted byte did not land in ${TARGETS[0].generated}`];
        }
        return capture(() => checkTargets(config, root));
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
}

/**
 * Ask the freshness comparison about a directory that is not there -- the state
 * every fresh copy of the project and every CI runner starts in, because
 * generated/ is git-ignored. The distinct message this must produce is the
 * whole point: thirty-three phantom stale paths would read as thirty-three defects on a tree
 * with none, and a gate red for a non-defect is a gate its readers skip.
 *
 * The EXIT CODE is asserted here too, and separately from the message, because
 * the two disagreed for a while: the message said "This is not a mismatch" and
 * the function returned 1 regardless, which put the documented commit gate in a
 * FAIL state on every fresh clone. A case reading only the message could not
 * see that.
 */
function probeAbsentOutput(config) {
    const parent = mkdtempSync(join(tmpdir(), 'generate-selftest-absent-'));
    try {
        let code;
        const lines = capture(() => { code = checkTargets(config, join(parent, 'never-generated')); });
        if (code !== 0) lines.push(`${ABSENT_EXIT_MARK} it exited ${code}`);
        return lines;
    } finally {
        rmSync(parent, { recursive: true, force: true });
    }
}

/**
 * GEN-01. The ftl-versus-properties agreement, driven directly on crafted
 * bodies: the real dev pair with the ftl full-name term drifted by one
 * value. The drift lands in a throwaway pair of strings, never on a tracked
 * file and never under generated/ -- 02-05's rule.
 *
 * A probe rather than a fixture because no manifest can provoke it: both
 * emitters derive from the same config, so only a directly-called
 * localeAgreementFailures with a planted drift can go red here.
 */
function probeLocaleAgreementDrift(config) {
    const dev = (config.variants ?? []).find(v => v.id === 'dev');
    if (dev === undefined) return [`${BROKEN} the resolved config has no dev variant`];
    const clean = emitBrandFtl(config, dev);
    const drifted = clean.replace(/^(-brand-full-name = ).*$/m, '$1Planted Drift');
    // Mutation-landed guard, same contract as probeStaleOutput's: a drift
    // that was never written reporting green is worse than a red.
    if (drifted === clean) {
        return [`${BROKEN} the planted full-name drift did not land in the ftl body`];
    }
    return localeAgreementFailures([
        { rel: 'branding/dev/locales/en-US/brand.ftl', body: drifted },
        { rel: 'branding/dev/locales/en-US/brand.properties', body: emitBrandProperties(config, dev) },
    ]);
}

/**
 * GEN-02, P-GEN-02. A downstream logo that is not square, driven straight at
 * the squareness rule on fixture text. A probe rather than a fixture because
 * no manifest can provoke it: no manifest value selects the artwork, so only
 * a directly-called iconSourceFailuresForText with a non-square viewBox can
 * go red here.
 */
function probeNonSquareSource() {
    return iconSourceFailuresForText(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 64"></svg>',
    );
}

/**
 * GEN-02's empty probe: the artwork missing outright. Points the source
 * check at a path that is not there; the message still names brand/mark.svg,
 * the fixed asset a reader restores.
 */
function probeMissingSource() {
    const dir = mkdtempSync(join(tmpdir(), 'generate-selftest-nosource-'));
    try {
        return iconSourceFailures(join(dir, 'mark.svg'));
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}

/**
 * GEN-02. One byte of one rasterized PNG changed by hand, and the freshness
 * comparison has to name THAT file -- the icon half of probeStaleOutput,
 * aimed at branding/dev/default32.png instead of TARGETS[0]. The corruption
 * lands in a mkdtemp copy and never on the tracked files: they are the
 * independent comparand this phase's acceptance test rests on.
 */
function probeIconPngDrift(config) {
    const root = mkdtempSync(join(tmpdir(), 'generate-selftest-icondrift-'));
    try {
        writeTargets(config, root);
        const victim = join(root, 'branding/dev/default32.png');
        const before = readFileSync(victim);
        const after = Buffer.from(before);
        after[after.length - 1] ^= 0xff;
        writeFileSync(victim, after);
        // Mutation-landed guard, same contract as probeStaleOutput's: a drift
        // that was never written reporting green is worse than a red.
        if (Buffer.compare(before, readFileSync(victim)) === 0) {
            return [`${BROKEN} the planted byte did not land in branding/dev/default32.png`];
        }
        return capture(() => checkTargets(config, root));
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
}

/**
 * A manifest that is not valid TOML, read by a CHILD process.
 *
 * It has to be a child: an unparseable layer exits from inside loadLayer rather
 * than returning failures, because there is no document to carry on with. That
 * is the right behaviour for the pipeline and it is precisely why this case
 * cannot run in-process -- it would take the self-test down with it.
 *
 * What is asserted is the copy, not just the redness: the caught parser error's
 * own text carries a caret diagram and parser vocabulary, and D-11 forbids
 * showing it. This is the case that keeps that rule from resting on a
 * reviewer's memory of it, and it is the one most likely to be quietly broken
 * by a refactor that reaches for the caught error's own message.
 */
function probeMalformedManifest() {
    const dir = mkdtempSync(join(tmpdir(), 'generate-selftest-malformed-'));
    try {
        const fixturePath = join(dir, MANIFEST_NAME);
        writeFileSync(fixturePath, `${FIXTURE_BASE}\n[identity\ndisplay_name = "Acme"\n`, 'utf8');
        const child = spawnSync(process.execPath, [
            '--input-type=module',
            '-e',
            `import { resolveConfig } from ${JSON.stringify(import.meta.url)};`
            + `resolveConfig(undefined, ${JSON.stringify(fixturePath)});`,
        ], { encoding: 'utf8' });
        if (child.status === 0) return [`${BROKEN} the malformed fixture parsed cleanly`];
        return `${child.stderr}${child.stdout}`.split('\n').filter(line => line !== '');
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}

/**
 * THE CROSS-CUTTING ASSERTION, applied to every case's output rather than
 * written as one more case -- because it is a property of every case, and a case
 * of its own would only ever check whatever fixture that case happened to use.
 *
 * CLAUDE.md's user-facing copy rule in executable form: no failure a reader
 * sees may carry a stack frame, a module specifier, or this machine's path to
 * the project. Each marker is named so a red says which one leaked.
 */
const INTERNAL_MARKERS = Object.freeze([
    Object.freeze({ what: 'a stack-trace frame', found: text => /^\s+at\s/m.test(text) }),
    Object.freeze({ what: "a 'node:' module specifier", found: text => text.includes('node:') }),
    Object.freeze({ what: "this machine's path to the project", found: text => text.includes(REPO_ROOT) }),
]);

function internalsLeaked(output) {
    const text = output.join('\n');
    return INTERNAL_MARKERS.filter(marker => marker.found(text)).map(marker => marker.what);
}

/**
 * The malformed case's extra rule, beyond the three markers above: none of the
 * parser's own idiom may survive into the copy. Parenthesised parser vocabulary
 * and a caret alone on a line are what the caught error's text looks like, and
 * a leading-slash token is a host path.
 */
function parserIdiomLeaked(output) {
    const text = output.join('\n');
    const leaks = [];
    if (/\([^)]*\b(?:token|unexpected|expected|syntax|parse|parser|EOF)\b[^)]*\)/i.test(text)) {
        leaks.push('parser vocabulary in parentheses');
    }
    if (/^\s*\^+\s*$/m.test(text)) leaks.push('a caret diagram line');
    if (/(?:^|\s)\/\S/m.test(text)) leaks.push('an absolute filesystem path');
    return leaks;
}

/**
 * Proves the mask, the unset rule, array-replace, the required-setting check,
 * the value rules, the misspelled-header ordering, the locale agreement, the
 * icon squareness and presence guards, all freshness outcomes and the
 * parse-failure copy actually discriminate, rather than merely being
 * intended. A check that can only go green is not a check.
 */
function selfTest() {
    // A planted-fault result measured against an already-red baseline says
    // nothing about the fault, so establish the baseline first and bail if the
    // unmodified manifest is the thing that is broken.
    const baseline = resolveConfig(MANIFEST_PATH, undefined);
    if (baseline.failures.length > 0) {
        console.error(`${NAME}: --self-test FAIL -- the unmodified ${MANIFEST_NAME} is already red, so the planted-fault results below would mean nothing:`);
        baseline.failures.forEach(f => console.error(`  - ${f}`));
        return 1;
    }

    const clean = readFileSync(MANIFEST_PATH, 'utf8');

    // Taken ONCE, before any case runs, so the invalid-basename case can prove
    // that a rejected value left the output tree exactly as it found it.
    const outputRootBefore = snapshotOutputRoot();

    // Derived from the frozen table, not written out here: a hand-kept copy of
    // these paths could only ever agree with the table it was copied from.
    const everyTargetPath = TARGETS.map(t => t.generated);

    // GEN-01's green control, computed once: the locale pairs the emitters
    // actually produce for both variants, run through the same agreement
    // function the drift case plants against. The baseline above is already
    // established green, so a non-empty result here is a broken assertion,
    // not a broken manifest.
    const agreementControl = localeAgreementFailures(
        ['dev', 'release'].map(id => baseline.config.variants.find(v => v.id === id)).flatMap(variant => ([
            { rel: `branding/${variant.id}/locales/en-US/brand.ftl`, body: emitBrandFtl(baseline.config, variant) },
            { rel: `branding/${variant.id}/locales/en-US/brand.properties`, body: emitBrandProperties(baseline.config, variant) },
        ])),
    );

    const cases = [
        {
            // D-10. A whitespace-only value is not a value.
            name: 'whitespace identity value',
            toml: FIXTURE_BASE.replace('remoting_name = "acme-browser"', 'remoting_name = "   "'),
            expect: 'identity.remoting_name',
        },
        {
            // THE case that pins the mask ORDERING. The defaults layer carries
            // binary_name, so if the mask were moved after the merge this
            // downstream would silently inherit it and the case would go green.
            // A self-test whose only identity fault is a wholly missing table
            // cannot catch that.
            name: 'partial identity table',
            toml: FIXTURE_BASE.replace('binary_name = "acme-browser"\n', ''),
            expect: 'identity.binary_name',
        },
        {
            // D-07. Goes red if array-replace is ever turned into joining the
            // two arrays end to end.
            //
            // THE ONE ELEMENT IS COMPLETE, and that matters. This case used to
            // declare `id = "dev"` and nothing else, which made it pin two
            // claims at once: that a short array replaces a long one, and --
            // silently -- that an INCOMPLETE variant resolves successfully. The
            // second is a defect, and pinning it as the contract is what let a
            // partial [[variants]] table emit the literal string `undefined`
            // and then throw. Replacement is what this case exists to prove;
            // the case below is what proves incompleteness is refused.
            name: 'downstream array shorter than default',
            toml: `${FIXTURE_BASE}\n${FIXTURE_VARIANT}`,
            holds: 'one variant, not three',
            resolved: c => Array.isArray(c.variants) && c.variants.length === 1,
        },
        {
            // CR-03. A [[variants]] section missing one of its four settings.
            // Every variants[] key is required PER ELEMENT, and readPath cannot
            // address an element, so without validateVariantElements this
            // fixture resolved with zero failures and the emitters carried the
            // missing value straight through as `undefined`.
            name: 'variant missing a required setting',
            toml: `${FIXTURE_BASE}\n${FIXTURE_VARIANT.replace('objdir = "objdir"\n', '')}`,
            expect: 'objdir',
        },
        {
            // WR-08. variantById is a find, so the second of two variants
            // sharing an id was silently unreachable -- a downstream editing it
            // got no effect and no message.
            name: 'two variants sharing one id',
            toml: `${FIXTURE_BASE}\n${FIXTURE_VARIANT}\n${FIXTURE_VARIANT}`,
            expect: 'both use the id "dev"',
        },
        {
            // WR-08. A typo'd id used to surface only as the missing-variant
            // error for the id it was meant to be, sending the reader to ADD a
            // section rather than fix a letter.
            name: 'variant with an id nothing builds',
            toml: `${FIXTURE_BASE}\n${FIXTURE_VARIANT.replace('id = "dev"', 'id = "relase"')}`,
            expect: 'is never used',
        },
        {
            // CFG-02's core. A required setting is one a downstream must state
            // for itself; omitting it is a hard failure, never a quiet
            // fallback to this project's identity under someone else's name.
            name: 'missing required key',
            toml: FIXTURE_BASE.replace('display_name = "Acme Browser"\n', ''),
            expect: 'identity.display_name',
        },
        {
            // CFG-03. The value is REJECTED, never transformed into a passing
            // one -- so the message has to state the length bounds in words,
            // because the pattern's quantifier is not self-explanatory to a
            // stranger, and the run has to leave generated/ untouched.
            name: 'invalid basename',
            toml: FIXTURE_BASE.replace('binary_name = "acme-browser"', 'binary_name = "two words"'),
            expect: 'identity.binary_name',
            also: [SCHEMA_KEYS['identity.binary_name'].regex_help],
            extra: () => (snapshotOutputRoot() === outputRootBefore
                ? []
                : ['the rejected run changed what is under generated/']),
        },
        {
            // THE case that pins the unknown-key check's position AHEAD of the
            // merge. A misspelled table that survived to the merge would
            // produce missing-key errors naming keys that are spelled
            // correctly, sending the author to look in the wrong place -- so
            // the misspelling has to be named and the missing-key phrase has to
            // be absent. That phrase is read from the emitter, not copied.
            name: 'unknown key',
            toml: FIXTURE_BASE.replace('[identity]', '[identiy]'),
            expect: 'identiy',
            notExpect: [UNSET_MARK],
        },
        {
            // D-12. One byte of one generated file changed by hand, and the
            // freshness comparison has to name THAT file -- naming some other
            // one would prove it can go red, not that it goes red on the thing
            // that drifted.
            name: 'stale generated output',
            probe: probeStaleOutput,
            expect: TARGETS[0].generated,
        },
        {
            // The absent-directory outcome is a DISTINCT message, not thirty-three
            // stale paths, AND it is not a failure. Asserted from three sides:
            // the message is there, no target path is, and the exit code was
            // zero -- so a future collapse of the three outcomes into one goes
            // red here, and so does a return to exiting 1 on a tree that has
            // simply never generated.
            name: 'absent generated directory',
            probe: probeAbsentOutput,
            expect: 'nothing has been generated in this copy of the project yet',
            notExpect: [...everyTargetPath, ABSENT_EXIT_MARK],
        },
        {
            // D-11. Red on the manifest and the line, and free of the parser's
            // own idiom -- see parserIdiomLeaked.
            name: 'malformed manifest',
            probe: probeMalformedManifest,
            expect: MANIFEST_NAME,
            also: [/line \d+/],
            extra: parserIdiomLeaked,
        },
        {
            // GEN-01. The agreement assertion must name BOTH files and BOTH
            // values when the ftl full-name term drifts from the properties
            // value -- a red that only says something disagrees would not
            // tell anyone which half to fix.
            name: 'locale agreement rejects a drifted full name',
            probe: probeLocaleAgreementDrift,
            expect: 'brand.ftl',
            also: ['brand.properties', 'Planted Drift', 'Power Browser Dev'],
        },
        {
            // GEN-01's control: the pairs the emitters actually produce --
            // both variants -- hold with zero failures. Without this, a red
            // result from the drift case above could be the assertion firing
            // on the unmodified bodies rather than on the plant.
            name: 'locale agreement holds on the emitted pairs',
            probe: () => agreementControl,
            holds: 'no failures on the matching pairs',
            resolved: () => agreementControl.length === 0,
        },
        {
            // GEN-02, P-GEN-02. A non-square downstream logo must fail naming
            // the asset and the squareness rule -- never a stretch, a
            // letterbox, or a quiet substitution of the placeholder mark.
            name: 'non-square icon source',
            probe: probeNonSquareSource,
            expect: MARK_SVG_REL,
            also: ['square'],
        },
        {
            // GEN-02's empty probe: a missing brand/mark.svg is a hard
            // failure naming the asset, never an empty icon set and never a
            // quiet reuse of the checked-in PNGs.
            name: 'missing icon source',
            probe: probeMissingSource,
            expect: MARK_SVG_REL,
            also: ['missing'],
        },
        {
            // GEN-02. One byte of one raster changed by hand, and the
            // freshness comparison has to name THAT png -- naming some other
            // file would prove it can go red, not that it goes red on the
            // thing that drifted.
            name: 'drifted icon raster',
            probe: probeIconPngDrift,
            expect: 'branding/dev/default32.png',
        },
    ];

    const dir = mkdtempSync(join(tmpdir(), 'generate-self-test-'));
    let failed = 0;
    const complain = (testCase, why) => {
        console.error(`${NAME}: --self-test FAIL -- '${testCase.name}' ${why}`);
        failed++;
    };
    try {
        cases.forEach((testCase, index) => {
            let output;
            let config;

            if (testCase.probe !== undefined) {
                // A probe plants its fault on a throwaway tree or in a child
                // process and reports what a caller would have seen. Its own
                // mutation-landed guard emits BROKEN rather than a failure, so
                // instrument damage reads as instrument damage and can never be
                // mistaken for the case passing.
                output = testCase.probe(baseline.config);
                if (output.some(line => line.includes(BROKEN))) {
                    complain(testCase, `planted no fault at all: ${output.join(' | ')}`);
                    return;
                }
            } else {
                // A fixture identical to the clean manifest plants nothing and
                // its result would be vacuous.
                if (testCase.toml === clean) {
                    complain(testCase, `plants a fixture identical to ${MANIFEST_NAME}; the case proves nothing`);
                    return;
                }
                const fixturePath = join(dir, `case-${index}.toml`);
                writeFileSync(fixturePath, testCase.toml, 'utf8');
                const resolvedCase = resolveConfig(MANIFEST_PATH, fixturePath);
                output = resolvedCase.failures;
                config = resolvedCase.config;
            }

            // Cross-cutting, applied to EVERY case: nothing a reader sees may
            // carry an internal.
            const leaked = [...internalsLeaked(output), ...(testCase.extra?.(output) ?? [])];
            if (leaked.length > 0) {
                complain(testCase, `leaked ${leaked.join(', ')} into what a reader sees: ${output.join(' | ')}`);
                return;
            }

            if (testCase.expect !== undefined) {
                const seen = output.join('\n');
                const missing = [testCase.expect, ...(testCase.also ?? [])].filter(n => !carries(seen, n));
                const present = (testCase.notExpect ?? []).filter(n => carries(seen, n));
                if (missing.length > 0) {
                    complain(testCase, `did not go red naming ${missing.map(String).join(' and ')}; got: ${output.join(' | ') || '(no failures at all)'}`);
                    return;
                }
                if (present.length > 0) {
                    complain(testCase, `went red naming ${present.map(String).join(' and ')}, which sends the reader to the wrong place: ${output.join(' | ')}`);
                    return;
                }
                console.log(`  ok  ${testCase.name} -> red, naming '${testCase.expect}'`);
                return;
            }

            if (output.length === 0 && testCase.resolved(config)) {
                console.log(`  ok  ${testCase.name} -> resolved to ${testCase.holds}`);
            } else {
                complain(testCase, `did not resolve to ${testCase.holds}; failures: ${output.join(' | ') || '(none)'}`);
            }
        });
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }

    if (failed > 0) return 1;
    console.log(`${NAME}: --self-test PASS -- ${cases.length} planted faults all behaved as pinned`);
    return 0;
}

// --- run --------------------------------------------------------------------

// Everything below runs ONLY when this file is the entry point. Importing it
// parses no manifest, writes no file and exits no process -- see IS_MAIN.
function main() {
    rejectUnknownArguments();

    if (args.includes('--self-test')) return selfTest();

    const { failures, config, defaulted } = resolveConfig(MANIFEST_PATH, undefined);
    report(failures);
    echoDefaults(defaulted, config);

    // The default echo above has already run, so --check reports its inherited
    // defaults exactly as a default run does (D-08). That is why this dispatch
    // sits here and not next to the argument loop at the top of the file.
    if (args.includes('--check')) return checkTargets(config);

    const count = writeTargets(config, OUTPUT_ROOT);
    console.log(
        `${NAME}: PASS -- ${count} file(s) written under generated/ from ${MANIFEST_NAME}, `
        + `${defaulted.length} default(s) applied`,
    );
    return 0;
}

/**
 * THE LAST LINE OF THE COPY RULE. Every failure this file raises deliberately
 * goes through report(), which prints plain language and a next step -- but an
 * uncaught throw bypasses all of it and Node prints a stack trace carrying `at`
 * frames, `node:` module specifiers and this machine's path to the project.
 * That is exactly the three-marker set INTERNAL_MARKERS forbids, and until this
 * catch existed the self-test could not see it, because no case drove an
 * emitter to the point of throwing.
 *
 * The error object is deliberately not printed. There is nothing in it a reader
 * can act on that the manifest-shaped advice below does not already say better.
 */
if (IS_MAIN) {
    let code;
    try {
        code = main();
    } catch {
        console.error(`${NAME}: FAIL -- the project could not be generated from ${MANIFEST_NAME}.`);
        console.error(`  Check that every setting in ${MANIFEST_NAME} has a value, and that every [[variants]] section is complete.`);
        console.error(`  Next step: correct ${MANIFEST_NAME}, then run: ${RERUN}`);
        code = 1;
    }
    process.exit(code);
}
