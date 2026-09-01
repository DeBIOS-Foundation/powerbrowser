#!/usr/bin/env node
// scripts/generate.mjs
//
// THE generator. It reads configuration.toml, checks it, and writes the derived
// build surfaces under generated/. It is the only thing in this tree that turns
// a brand setting into a build artifact (CFG-01).
//
// WHAT IT IS NOT, YET. This is still one target, the dev variant's
// configure.sh, whose bytes are compared against the file plan 01-03 wrote by
// hand. Four more targets arrive in plan 02-04. Resist adding a second emitter
// here before then -- the whole point of proving one path end to end is that
// nine more layers are not committed on top of an unproven one.
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
//   node scripts/generate.mjs --check       (arrives in plan 02-04)
//   node scripts/generate.mjs --self-test

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse, TomlError } from './lib/toml.cjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'generate';

const MANIFEST_NAME = 'configuration.toml';
const MANIFEST_PATH = join(REPO_ROOT, MANIFEST_NAME);
const SCHEMA_PATH = join(REPO_ROOT, 'scripts/lib/config-schema.json');
const OUTPUT_ROOT = join(REPO_ROOT, 'generated');
const RERUN = 'node scripts/generate.mjs';

// --- argument handling ------------------------------------------------------

const args = process.argv.slice(2);
for (const a of args) {
    if (a !== '--check' && a !== '--self-test') {
        console.error(`${NAME}: FAIL -- unknown argument '${a}'`);
        process.exit(1);
    }
}
if (args.includes('--check')) {
    console.log(`${NAME}: --check arrives in plan 02-04; nothing was compared`);
    process.exit(0);
}
if (args.includes('--self-test')) {
    console.log(`${NAME}: --self-test arrives in plan 02-06; nothing was planted`);
    process.exit(0);
}

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
                `${path} is not set. Open ${MANIFEST_NAME}, find the ${sectionOf(path)} section, and give `
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
 * The dev variant's configure.sh, line for line against the file plan 01-03
 * wrote by hand. Lines 1-3 are the Mozilla Public License boilerplate: a
 * source-file licence notice, literal emitter text, not a rebrand input.
 * Lines 5-7 are that file's hand-written comment reproduced verbatim -- D-03 is
 * explicit that these bytes come across first and the comment is only rewritten
 * in plan 02-06, after the byte-identity check is green.
 *
 * Joined with a literal newline, never the platform line-ending constant, which
 * would emit CRLF on a Windows host and break byte-identity.
 */
function emitDevConfigureSh(config, variant) {
    const lines = [
        '# This Source Code Form is subject to the terms of the Mozilla Public',
        '# License, v. 2.0. If a copy of the MPL was not distributed with this',
        '# file, You can obtain one at http://mozilla.org/MPL/2.0/.',
        '',
        '# A COMPILED define, hand-written (plan 01-03). A typo here costs a full',
        '# tier-3 rebuild (~40 min), which is why scripts/verify-branding-preflight.mjs',
        '# cross-checks it against the inventory before the build rather than after.',
        `MOZ_APP_DISPLAYNAME="${config.identity.display_name}${variant.name_suffix}"`,
    ];
    return lines.join('\n') + '\n';
}

/**
 * Every output path lives here and nowhere else. No value out of
 * configuration.toml is ever joined into a write path -- a variant carries
 * branding_dir and objdir as emitted CONTENT, never as a write target.
 */
const TARGETS = Object.freeze([
    Object.freeze({
        generated: 'branding/dev/configure.sh',
        tracked: 'powerbrowser/branding/dev/configure.sh',
        variant: 'dev',
        emit: emitDevConfigureSh,
    }),
]);

function variantById(config, id) {
    return (config.variants ?? []).find(v => v.id === id);
}

function writeTargets(config) {
    let written = 0;
    for (const target of TARGETS) {
        const variant = variantById(config, target.variant);
        if (variant === undefined) {
            console.error(`${NAME}: FAIL -- ${MANIFEST_NAME} declares no build variant with id "${target.variant}".`);
            console.error(`  Open ${MANIFEST_NAME}, add a [[variants]] section whose id is "${target.variant}", then run: ${RERUN}`);
            process.exit(1);
        }
        const outPath = join(OUTPUT_ROOT, target.generated);
        mkdirSync(dirname(outPath), { recursive: true });
        writeFileSync(outPath, target.emit(config, variant), 'utf8');
        written += 1;
    }
    return written;
}

// --- the pipeline ------------------------------------------------------------

/**
 * Parse both layers, reject unknown settings in either, mask, merge, validate.
 *
 * RETURNS rather than exits on a validation failure, because --self-test has to
 * read the failures a planted fault produced. Only the two conditions a
 * self-test can never provoke -- a missing file and an unparseable one -- still
 * exit from inside loadLayer.
 */
function resolveConfig(defaultsPath, downstreamPath) {
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

// --- run --------------------------------------------------------------------

const { failures, config, defaulted } = resolveConfig(MANIFEST_PATH, undefined);
report(failures);

const count = writeTargets(config);
console.log(
    `${NAME}: PASS -- ${count} file(s) written under generated/ from ${MANIFEST_NAME}, `
    + `${defaulted.length} default(s) applied`,
);
process.exit(0);
