#!/usr/bin/env node
// scripts/verify-rebranding-docs.mjs
//
// DOC-01's completeness pin (06-05): docs/REBRANDING.md must document every
// configuration.toml field and carry the load-bearing walkthrough commands,
// or the stranger this guide serves strands on the first omission.
//
// WHAT IT ASSERTS. Everything is DERIVED at check time, never kept here:
//
//  1. The documented-field list is the generator's own known-setting schema
//     table -- scripts/lib/config-schema.json, the exact file
//     scripts/generate.mjs reads as SCHEMA_KEYS and the same table that
//     rejects unknown settings. A second hand-kept field list here would be
//     the defect: a setting added to the schema without a guide row would
//     still pass. The variant and extensions entry shapes
//     (`variants[].id`, `extensions[].sha256`, ...) are schema rows like
//     any other, so they ride the same derivation with no special case.
//  2. Each dotted path must appear in the guide as inline code (an exact
//     backtick span) or inside a Markdown heading. An exact-span match, so
//     `product.homepage` does not cover `urls.homepage` and a longer span
//     carrying the path as a substring does not count.
//  3. The walkthrough's load-bearing commands (fetch-upstream,
//     generate.mjs, generate --check, verify-platform.sh --quick) must each
//     appear inside a code span, failing with the missing command named --
//     a command named only in prose is not one a stranger can paste.
//  4. Non-vacuity, each with its own message: a missing guide, an empty
//     derived field set, or zero matched fields each fail distinctly rather
//     than pass.
//
// The manifest itself must resolve first (via scripts/generate.mjs's own
// resolveConfig, imported never restated): coverage proven against a broken
// manifest proves nothing, so a red manifest fails this check naming it.
//
// Honestly --quick: it reads text files off disk only. No build, no
// browser, no display, no network.
//
// Usage:
//   node scripts/verify-rebranding-docs.mjs
//   node scripts/verify-rebranding-docs.mjs --self-test
//
// The --self-test runs against scratch copies of the real guide: the
// unmutated copy goes green first, then one field's mentions removed goes
// red naming the field, and one command removed goes red naming the
// command. Every verdict below names the compared values; nothing asserts
// on the absence of a log line.

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveConfig } from './generate.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'verify-rebranding-docs';
const GUIDE_REL = 'docs/REBRANDING.md';
const SCHEMA_REL = 'scripts/lib/config-schema.json';
const MANIFEST_REL = 'configuration.toml';

// The walkthrough commands a stranger pastes in order. Each must appear
// inside a backtick code span; matching is substring-inside-span so
// `node scripts/generate.mjs --check` covers its command.
const REQUIRED_COMMANDS = Object.freeze([
  'scripts/fetch-upstream.sh',
  'scripts/generate.mjs',
  'generate.mjs --check',
  'verify-platform.sh --quick',
]);

const args = process.argv.slice(2);
const SELF_TEST = args.includes('--self-test');
for (const a of args) {
  if (a !== '--self-test') {
    console.error(`${NAME}: FAIL -- unknown argument '${a}'`);
    process.exit(2);
  }
}

/** Every backtick code span in the text, in order. */
function codeSpans(text) {
  const out = [];
  for (const m of text.matchAll(/`([^`\n]+)`/g)) out.push(m[1]);
  return out;
}

/** Every ATX heading line in the text. */
function headings(text) {
  return text.split('\n').filter((line) => /^#{1,6}\s/.test(line));
}

/**
 * THE gate as a pure function of guide text and schema keys, so the
 * self-test can drive mutated scratch copies without touching the tree.
 * Returns the failure list (empty means green) plus the counts the PASS
 * line reports.
 */
export function checkDocs(guideText, schemaKeys) {
  const failures = [];

  if (guideText === null) {
    failures.push(
      `${GUIDE_REL} is missing -- the rebranding guide is the DOC-01 deliverable, and without it there is nothing to cover. Next step: write ${GUIDE_REL} with a clone-to-build walkthrough plus a reference row per setting, then re-run this check.`,
    );
    return { failures, fields: schemaKeys.length, matched: 0, commands: 0 };
  }

  if (schemaKeys.length === 0) {
    failures.push(
      `derived zero documented fields from ${SCHEMA_REL} -- an empty field set covers nothing and would pass any guide. Next step: check that the schema's keys table resolved, then re-run this check.`,
    );
    return { failures, fields: 0, matched: 0, commands: 0 };
  }

  const spans = codeSpans(guideText);
  const heads = headings(guideText);

  let matched = 0;
  for (const key of schemaKeys) {
    const covered = spans.includes(key) || heads.some((h) => h.includes(key));
    if (!covered) {
      failures.push(
        `${GUIDE_REL} does not document '${key}' -- every setting the schema knows must appear as inline code or a heading. Next step: add a reference row for '${key}', then re-run this check.`,
      );
    } else {
      matched += 1;
    }
  }

  if (matched === 0) {
    failures.push(
      `${GUIDE_REL} matched zero of ${schemaKeys.length} schema fields -- a guide that documents nothing would pass field by field only because there is no field left to name. Next step: write the per-setting reference, then re-run this check.`,
    );
  }

  let commands = 0;
  for (const cmd of REQUIRED_COMMANDS) {
    const carried = spans.some((span) => span.includes(cmd));
    if (!carried) {
      failures.push(
        `${GUIDE_REL} never shows '${cmd}' as a command a reader can paste -- the walkthrough must carry every load-bearing step as a code span. Next step: add the '${cmd}' step to the walkthrough, then re-run this check.`,
      );
    } else {
      commands += 1;
    }
  }

  return { failures, fields: schemaKeys.length, matched, commands };
}

function loadSchemaKeys() {
  const schema = JSON.parse(readFileSync(join(REPO_ROOT, SCHEMA_REL), 'utf8'));
  return Object.keys(schema.keys ?? {});
}

function main() {
  let guideText;
  try {
    guideText = readFileSync(join(REPO_ROOT, GUIDE_REL), 'utf8');
  } catch {
    guideText = null;
  }

  const schemaKeys = loadSchemaKeys();

  // The manifest must resolve before coverage means anything: a guide that
  // covers a broken manifest's fields is agreement with a tree that cannot
  // build. resolveConfig is the generator's own pipeline, not a recheck.
  const { failures: resolveFailures } = resolveConfig(join(REPO_ROOT, MANIFEST_REL), undefined);
  if (resolveFailures.length > 0) {
    console.error(`${NAME}: FAIL -- ${MANIFEST_REL} is red, so doc coverage proves nothing:`);
    for (const f of resolveFailures) console.error(`  - ${f}`);
    process.exit(1);
  }

  const { failures, fields, matched, commands } = checkDocs(guideText, schemaKeys);
  if (failures.length > 0) {
    console.error(`${NAME}: FAIL -- ${failures.length} problem(s) across ${fields} schema field(s)`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log(`${NAME}: PASS -- ${matched}/${fields} schema field(s) documented, ${commands} walkthrough command(s) carried`);
}

// ---------------------------------------------------------------------------
// Self-test: scratch copies of the real guide through checkDocs, green first.
// ---------------------------------------------------------------------------

const FIELD_PLANT = 'installer.tile_color';
const COMMAND_PLANT = 'generate.mjs --check';

function selfTest() {
  let failed = 0;
  const complain = (name, why) => {
    console.error(`${NAME}: --self-test FAIL -- '${name}' ${why}`);
    failed += 1;
  };

  const guideText = readFileSync(join(REPO_ROOT, GUIDE_REL), 'utf8');
  const schemaKeys = loadSchemaKeys();

  // Green control first: the unmutated copy goes green, or every plant
  // below proves nothing.
  {
    const { failures } = checkDocs(guideText, schemaKeys);
    if (failures.length > 0) {
      complain('unmutated control', `is already red, so the plants below would mean nothing: ${failures.join(' | ')}`);
    } else {
      console.log('  ok  unmutated copy -> green');
    }
  }

  // Plant 1: every mention of one field removed goes red naming the field.
  {
    const mutated = guideText.split(`\`${FIELD_PLANT}\``).join('`installer.REDACTED`');
    if (mutated === guideText) {
      complain('planted field removal', `the scratch copy is unchanged -- '${FIELD_PLANT}' has no exact code span to remove`);
    } else {
      const { failures } = checkDocs(mutated, schemaKeys);
      const hit = failures.find((f) => f.includes(FIELD_PLANT));
      if (!hit) {
        complain('planted field removal', `did not go red naming the field; got: ${failures.join(' | ') || '(no failures at all)'}`);
      } else {
        console.log(`  ok  '${FIELD_PLANT}' mentions removed -> red, naming the field`);
      }
    }
  }

  // Plant 2: the one command removed goes red naming the command.
  {
    const mutated = guideText.split(COMMAND_PLANT).join('generate.mjs --REDACTED');
    if (mutated === guideText) {
      complain('planted command removal', `the scratch copy is unchanged -- '${COMMAND_PLANT}' never occurs`);
    } else {
      const { failures } = checkDocs(mutated, schemaKeys);
      const hit = failures.find((f) => f.includes(COMMAND_PLANT));
      if (!hit) {
        complain('planted command removal', `did not go red naming the command; got: ${failures.join(' | ') || '(no failures at all)'}`);
      } else {
        console.log(`  ok  '${COMMAND_PLANT}' removed -> red, naming the command`);
      }
    }
  }

  if (failed > 0) return 1;
  console.log(`${NAME}: --self-test PASS -- 2 planted faults both behaved as pinned`);
  return 0;
}

if (SELF_TEST) {
  process.exit(selfTest());
} else if (args.length === 0) {
  main();
}
