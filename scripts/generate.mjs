#!/usr/bin/env node
// scripts/generate.mjs
//
// THE generator. It reads configuration.toml, checks it, and writes the derived
// build surfaces under generated/. It is the only thing in this tree that turns
// a brand setting into a build artifact (CFG-01).
//
// WHAT IT COVERS. Five targets, each byte-identical to the file Phase 1 wrote
// by hand: the two branding configure.sh files, .mozconfig, and the two
// .desktop files. That byte-identity IS the phase's acceptance test, which is
// why no emitter here is allowed to reformat, reorder or "tidy" what it
// reproduces. The Theia and packaging surfaces are Phase 3 (GEN-03).
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
// absolute paths, and this same root is the base for the absolute Exec and Icon
// lines a later plan emits.
//
// Usage:
//   node scripts/generate.mjs
//   node scripts/generate.mjs --check
//   node scripts/generate.mjs --self-test

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, readdirSync, rmSync, existsSync } from 'node:fs';
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
 */
const IS_MAIN = process.argv[1] !== undefined
    && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

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
 * `variants[]` path is consulted. None of them is required today. If one ever
 * becomes required, the masker has to learn to descend into each element --
 * validate() carries the same assumption in its `path.includes('[]')` skip.
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
        '# Generated from configuration.toml by scripts/generate.mjs -- do not edit here.',
        '# To change it, edit configuration.toml and run: node scripts/generate.mjs',
        '# A disagreement reddens: scripts/verify-platform.sh --only generated-byte-identity',
        // Both halves pass the sink guard. This line is a double-quoted shell
        // assignment in a file the Gecko build sources, so an unchecked value
        // here executes at build time; see assertEmittable.
        `MOZ_APP_DISPLAYNAME="${assertEmittable('identity.display_name', config.identity.display_name)}`
        + `${assertEmittable(variantPath(variant, 'name_suffix'), variant.name_suffix)}"`,
    ];
    return lines.join('\n') + '\n';
}

/**
 * The root .mozconfig, eleven lines against the file Phase 1 wrote by hand.
 *
 * FOUR VALUES come from the manifest: the --with-app-basename argument, the
 * --with-distribution-id argument, the exported MOZ_APP_REMOTINGNAME, and --
 * inside the two shell-default expansions on lines 1 and 10 -- the variant's
 * objdir and branding_dir.
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
    // build sources, so each passes the sink guard on its way in.
    const objdir = assertEmittable(variantPath(variant, 'objdir'), variant.objdir);
    const brandingDir = assertEmittable(variantPath(variant, 'branding_dir'), variant.branding_dir);
    const lines = [
        'mk_add_options MOZ_OBJDIR=@TOPSRCDIR@/../${POWERBROWSER_OBJDIR:-' + objdir + '}',
        'ac_add_options --enable-application=browser',
        'ac_add_options --disable-updater',
        'ac_add_options --without-wasm-sandboxed-libraries',
        'ac_add_options --with-libclang-path="$LIBCLANG_PATH"',
        `ac_add_options --with-app-basename=${assertEmittable('identity.app_basename', config.identity.app_basename)}`,
        `ac_add_options --with-distribution-id=${assertEmittable('identity.distribution_id', config.identity.distribution_id)}`,
        'ac_add_options --disable-crashreporter',
        'ac_add_options --with-ccache=sccache',
        'ac_add_options --with-branding=${POWERBROWSER_BRANDING:-' + brandingDir + '}',
        `mk_add_options "export MOZ_APP_REMOTINGNAME=${assertEmittable('identity.remoting_name', config.identity.remoting_name)}"`,
    ];
    return lines.join('\n') + '\n';
}

/**
 * A freedesktop .desktop entry, nine lines against the files Phase 1 wrote by
 * hand. One emitter, both variants; the dev and release files differ in exactly
 * three lines and all three differences come from the variant.
 *
 * THE ABSOLUTE PATHS ARE DERIVED, NOT CONFIGURED (D-04). A desktop entry must
 * name an absolute executable, so Exec and Icon carry the repo root -- but the
 * root comes from REPO_ROOT, which this file derives from its OWN location, not
 * from the working directory and not from a manifest key. Putting a host path
 * in configuration.toml would make the manifest machine-specific, which is the
 * one thing D-04 forbids; deriving it from process.cwd() would make the emitted
 * bytes depend on where the generator was invoked from.
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
    const exec = join(
        assertUnderRepo(variantPath(variant, 'objdir'), assertEmittable(variantPath(variant, 'objdir'), variant.objdir)),
        'dist/bin',
        assertEmittable('identity.binary_name', config.identity.binary_name),
    );
    const icon = join(
        assertUnderRepo(variantPath(variant, 'branding_dir'), assertEmittable(variantPath(variant, 'branding_dir'), variant.branding_dir)),
        'default128.png',
    );
    const lines = [
        '[Desktop Entry]',
        `Name=${assertEmittable('identity.display_name', config.identity.display_name)}`
        + `${assertEmittable(variantPath(variant, 'name_suffix'), variant.name_suffix)}`,
        `Exec=${exec} %u`,
        `Icon=${icon}`,
        'Terminal=false',
        'Type=Application',
        'Categories=Development;IDE;',
        `StartupWMClass=${assertEmittable('identity.remoting_name', config.identity.remoting_name)}`,
        'MimeType=text/html;text/xml;application/xhtml+xml;application/xml;application/vnd.mozilla.xul+xml;application/rss+xml;application/rdf+xml;image/gif;image/jpeg;image/png;x-scheme-handler/http;x-scheme-handler/https;',
    ];
    return lines.join('\n') + '\n';
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
    let written = 0;
    for (const target of TARGETS) {
        const variant = variantById(config, target.variant);
        if (variant === undefined) {
            console.error(`${NAME}: FAIL -- ${MANIFEST_NAME} declares no build variant with id "${target.variant}".`);
            console.error(`  Open ${MANIFEST_NAME}, add a [[variants]] section whose id is "${target.variant}", then run: ${RERUN}`);
            process.exit(1);
        }
        const outPath = join(root, target.generated);
        mkdirSync(dirname(outPath), { recursive: true });
        writeFileSync(outPath, target.emit(config, variant), 'utf8');
        written += 1;
    }
    return written;
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
 * reporting it as five stale files reads as five problems and sends the reader
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
 * it at a throwaway tree it is free to corrupt. The five tracked files and the
 * real generated/ are never touched by a planted fault (02-05's rule). The
 * reported paths keep the `generated/` prefix whatever the root is, because
 * that prefix names the output surface a reader has to go and fix, not the
 * directory this invocation happened to read.
 */
function checkTargets(config, root = OUTPUT_ROOT) {
    if (!existsSync(root)) {
        console.error(`${NAME}: FAIL -- nothing has been generated in this copy of the project yet, so there is nothing to compare.`);
        console.error('  The generated/ folder is not stored with the project, so a fresh copy of it starts out without one. This is not a mismatch.');
        console.error(`  Next step: run: ${RERUN}`);
        return 1;
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

/** Does `text` carry `needle`, which is either a literal or a pattern? */
function carries(text, needle) {
    return needle instanceof RegExp ? needle.test(text) : text.includes(needle);
}

/**
 * Run `fn` with console.log and console.error COLLECTED rather than printed,
 * so a case can assert on what a caller would have seen. Three of the nine
 * cases drive checkTargets, which reports through the console rather than by
 * returning a failure list, and a case that could not read that report could
 * only assert the exit code -- which is 1 for every one of the three distinct
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
 * mkdtemp copy and never on the five tracked files: they are the independent
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
 * whole point: five phantom stale paths would read as five defects on a tree
 * with none, and a gate red for a non-defect is a gate its readers skip.
 */
function probeAbsentOutput(config) {
    const parent = mkdtempSync(join(tmpdir(), 'generate-selftest-absent-'));
    try {
        return capture(() => checkTargets(config, join(parent, 'never-generated')));
    } finally {
        rmSync(parent, { recursive: true, force: true });
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
 * written as a tenth case -- because it is a property of all nine, and a case
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
 * the value rules, the misspelled-header ordering, all three freshness outcomes
 * and the parse-failure copy actually discriminate, rather than merely being
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
    // these five paths could only ever agree with the table it was copied from.
    const everyTargetPath = TARGETS.map(t => t.generated);

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
            name: 'downstream array shorter than default',
            toml: `${FIXTURE_BASE}\n[[variants]]\nid = "dev"\n`,
            holds: 'one variant, not three',
            resolved: c => Array.isArray(c.variants) && c.variants.length === 1,
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
            // The absent-directory outcome is a DISTINCT message, not five
            // stale paths. Asserted from both sides: the message is there and
            // no target path is, so a future collapse of the three outcomes
            // into one goes red here.
            name: 'absent generated directory',
            probe: probeAbsentOutput,
            expect: 'nothing has been generated in this copy of the project yet',
            notExpect: everyTargetPath,
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

if (IS_MAIN) process.exit(main());
