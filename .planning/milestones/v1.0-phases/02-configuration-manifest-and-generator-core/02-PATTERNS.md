# Phase 2: Configuration Manifest and Generator Core - Pattern Map

**Mapped:** 2026-09-01
**Files analyzed:** 11 (6 new, 5 modified)
**Analogs found:** 9 / 11

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `scripts/generate.mjs` (new) | generator CLI + gate | transform (file-in → file-out) | `scripts/verify-branding-preflight.mjs` | role-match (collect-all-failures + `--self-test` + mkdtemp fixture) |
| `scripts/verify-generated-identity.mjs` (new) | check | file-I/O compare | `scripts/verify-registry-shape.mjs` | exact (derive-and-compare set equality + `--self-test`) |
| `scripts/lib/config-schema.json` (new) | committed data table | static data, multi-reader | `inventory/brand-tokens.json` | exact (one file, three readers) |
| `scripts/lib/toml.cjs` + `toml.LICENSE` (new, vendored) | vendored library | — | `scripts/lib/firefox-bidi.mjs` | partial (hand-written, not vendored — copy only the provenance-header convention) |
| `configuration.toml` (new) | config manifest | static data | `inventory/brand-tokens.json` | role-match |
| `brand/mark.svg` (moved from `powerbrowser/branding/mark.svg`) | asset | — | n/a | move only |
| `scripts/verify-platform.sh` (modified) | registry | dispatch | itself — append rows to the `--quick` array | exact |
| `.github/workflows/rebase-upstream.yml` (modified) | CI config | — | its own "Scan for residual brand strings" step | exact |
| `.gitignore` (modified) | config | — | the "Theia / TypeScript build output" block (anchoring comment) | exact |
| `scripts/verify-branding-preflight.mjs` (modified) | check | file-I/O compare | itself — path update only, 3 sites | exact |
| `inventory/brand-tokens.json` | — | — | **no edit** (research: no row references `mark.svg`) | n/a |

---

## Pattern Assignments

### `scripts/generate.mjs` (generator CLI, transform)

**Analog:** `scripts/verify-branding-preflight.mjs`

**Header + repo-root + arg-parse pattern** (`verify-branding-preflight.mjs:1-58`) — copy this shape whole; it is the repo's CLI convention (a `NAME` const used in every message, unknown args rejected loudly):

```js
import { readFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
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
```

Generator variant: accept `--check` as well as `--self-test`; keep the reject-unknown-arg loop
(D-12's spirit applied to the CLI itself). `REPO_ROOT` derived this way is also D-04's
`Exec=`/`Icon=` path base — do not use `process.cwd()`.

**Collect-all-failures reporter** (`verify-branding-preflight.mjs:60-77`) — this is D-09/D-11's
implementation, already written:

```js
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
```

Reuse `makeReporter()`'s shape for the validator (unknown-key, required-unset, regex all push into
one `failures` array). Note the message idiom: `JSON.stringify(actual)` so an empty string renders
as `""` — which is exactly what D-10 needs to make `identity.vendor = ""` legible.

**Exit pattern** (`verify-branding-preflight.mjs`, last 10 lines):

```js
if (SELF_TEST) selfTest();

const result = runChecks(REPO_ROOT);
if (result.failures.length > 0) {
    console.error(`${NAME}: FAIL -- ${result.failures.length} branding literal(s) disagree with inventory/brand-tokens.json`);
    for (const f of result.failures) console.error(`  - ${f}`);
    process.exit(1);
}
console.log(`${NAME}: PASS -- every hand-written branding literal equals the inventory's declared target`);
process.exit(0);
```

The PASS line **counts what was checked** — a count in the pass message is the repo's non-vacuity
tell. Generator's version should name the number of files written and the number of defaults echoed.

**`--self-test` mkdtemp fixture pattern** (`verify-branding-preflight.mjs:618-660`) — the fixture
idiom for D-14's planted faults:

```js
function selfTest() {
    const dir = mkdtempSync(join(tmpdir(), 'branding-preflight-selftest-'));
    let ok = true;
    try {
        // Mirror the real tree's shape, then mutate exactly one literal.
        const copy = [ 'inventory/brand-tokens.json', '.mozconfig', /* ... */ ];
        // ... copy, plant one fault, assert the failure message names it ...
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
    if (!ok) { console.error(`${NAME}: --self-test FAIL`); process.exit(1); }
    console.log(`${NAME}: --self-test PASS`);
    process.exit(0);
}
```

For the generator the fixture is cheaper: plant faults in a **TOML string**, not a copied tree —
each case is `{ name, toml, expect }` and the assertion is `failures.some(f => f.includes(expect))`
(see the `verify-registry-shape.mjs` case-table below, which is the better structural template for
the fault list).

**Emitter/target-table pattern:** no analog in the tree — nothing here emits files. Use
RESEARCH.md Pattern 4/5 (`Object.freeze` target array; each emitter returns
`lines.join('\n') + '\n'`; writer does `writeFileSync(p, text, 'utf8')`). The `Object.freeze`
idiom itself is `verify-registry-shape.mjs:55-71`.

---

### `scripts/verify-generated-identity.mjs` (check, file-I/O compare)

**Analog:** `scripts/verify-registry-shape.mjs` — the shipped template for derive-and-compare.

**Header rationale block** (`verify-registry-shape.mjs:15-34`) — copy the *structure*: why the
actual set is derived and only the expected set is written down, and an explicit statement that the
check is honestly `--quick`:

```js
/**
 * ## Why the ACTUAL set is derived and only the EXPECTED set is written down
 *
 * The tempting shape for this check is a hand-kept list of probes ... That
 * check silently stops testing anything the moment it goes stale: it can never
 * go red on a member being *added*, and it can never go red on a member being
 * removed that nobody remembered to list. It agrees with every tree.
 *
 * So the actual surface is DERIVED from the module's own source at check time
 * and compared to the expected surface as a SET EQUALITY.
 *
 * Static by construction: ... so it belongs in `verify-platform.sh --quick`
 * (no build, no browser, no display, no network).
 */
```

**Frozen expectation constant** (`verify-registry-shape.mjs:47-71`) — the one hand-kept list, with
the comment explaining why one is permitted:

```js
const EXPECTED = Object.freeze({
    [REGISTRY_TS]: Object.freeze(['TabUriRegistry']),
    // ...
});
```

Here: the declared five-file target list. Assert set equality against `TARGETS.map(t => t.tracked)`
(RESEARCH Pattern 4) so a sixth emitter or a deleted one goes red.

**Set-difference reporter** (`verify-registry-shape.mjs:118-126`) — reuse verbatim:

```js
/** Set difference reported by name, so a failure says WHICH name drifted. */
function diff(actual, expected) {
    const a = new Set(actual);
    const e = new Set(expected);
    return {
        surplus: [...a].filter(name => !e.has(name)),
        missing: [...e].filter(name => !a.has(name)),
    };
}
```

**Non-vacuity guard** (`verify-registry-shape.mjs:139-142`) — the pattern that stops a broken
instrument from passing as a clean comparison:

```js
if (actual.length === 0) {
    failures.push(`${file}: derived ZERO exports -- the parse found nothing, so this comparison proves nothing`);
    continue;
}
```

Byte-identity analogue: if the temp emission produced zero files, fail as a broken instrument, not
as a clean diff-of-nothing. This is also the guard that makes Pitfall 1 (absent `generated/`)
report honestly.

**Self-test case table + baseline-clean guard + mutation-landed guard**
(`verify-registry-shape.mjs:179-249`) — this is the exact shape D-14 asks for:

```js
function selfTest() {
    const clean = readSources();
    const baseline = checkShape(clean);
    if (baseline.length !== 0) {
        console.error('...: FAIL -- the unmodified tree is already red, so the planted-fault results below would be meaningless:');
        baseline.forEach(f => console.error(`  ${f}`));
        return 1;
    }

    const cases = [
        { name: 'planted export addition', sources: {...}, expect: 'PLANTED_BRIDGE_LEAK' },
        // ...
    ];

    let failed = 0;
    for (const testCase of cases) {
        // A planted fault that does not change the source at all would make
        // the case vacuous -- assert the mutation actually landed.
        const mutated = Object.keys(clean).some(file => testCase.sources[file] !== clean[file]);
        if (!mutated) { /* FAIL: the anchor it edits has drifted */ }
        const failures = checkShape(testCase.sources);
        if (!failures.some(f => f.includes(testCase.expect))) {
            console.error(`...: FAIL -- '${testCase.name}' did not go red naming '${testCase.expect}'; got: ${failures.join(' | ') || '(no failures at all)'}`);
            failed++;
        } else {
            console.log(`  ok  ${testCase.name} -> red, naming '${testCase.expect}'`);
        }
    }
    if (failed) return 1;
    console.log(`...--self-test: PASS -- ${cases.length} planted faults all went red`);
    return 0;
}
```

D-14's five faults map onto `cases` one-for-one, plus Pitfall 4's **partial** identity table
(vendor set, `binary_name` omitted) and Pitfall 5's short-array case.

**Main dispatch** (`verify-registry-shape.mjs:252-270`) — `process.exit(main())` with a
FAIL banner that tells the reader what to do if the change was deliberate:

```js
function main() {
    if (process.argv.includes('--self-test')) return selfTest();
    const failures = checkShape(readSources());
    if (failures.length) {
        console.error('verify-registry-shape: FAIL -- ...drifted from the declared bridge contract.');
        console.error('...If the change is deliberate, edit EXPECTED... in the SAME commit so the contract change is visible in the diff.');
        failures.forEach(f => console.error(`  ${f}`));
        return 1;
    }
    console.log(`verify-registry-shape: PASS -- ${...} match the declared bridge contract`);
    return 0;
}
process.exit(main());
```

---

### `scripts/lib/config-schema.json` (committed data table, multi-reader)

**Analog:** `inventory/brand-tokens.json` — the precedent for one committed structured file with
multiple consumers. The reader-side idiom is `scripts/scan-brand-residue.mjs:124-133`:

```js
export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const INVENTORY_PATH = join(REPO_ROOT, 'inventory/brand-tokens.json');

export const CLASSES = Object.freeze([
  'brand-identifier',
  'brand-display',
  // ...
]);
```

Copy two things: (1) the path constant exported from one module so both readers import it rather
than re-deriving; (2) `Object.freeze` on the enumerated categories. The schema's three readers
(unknown-key check, masker, validator) must all import from here — never carry their own key list.

Also copy `brand-tokens.json`'s `$comment` convention: a prose block inside the JSON stating what
the file is the source of truth *for* and what must not be derived from it. The schema table's
`$comment` should state that `configuration.toml` is **not** an expectation source for
`verify-branding-preflight.mjs` (Pitfall 7).

---

### `scripts/lib/toml.cjs` (vendored parser)

**Analog:** `scripts/lib/firefox-bidi.mjs` — only for the header convention. That file is
hand-written, not vendored, so the code inside is not a template. What to copy is the
"every non-obvious artifact carries its own rationale in a header comment" discipline
(`firefox-bidi.mjs:1-20`):

```js
// scripts/lib/firefox-bidi.mjs
//
// Zero-dependency WebDriver BiDi driver for `objdir/dist/bin/firefox` ...
// Per D-69: not Playwright, not Puppeteer, not geckodriver -- the pinned
// `nodejs_22` exposes a global `WebSocket`, so this file imports no package,
// only Node built-ins and globals.
```

The vendored header must name: package + exact version, upstream sha256, license and where the
notice lives (`scripts/lib/toml.LICENSE`), and the `npm pack` command that produced it.

**Note for the planner:** `.gitignore`'s `theia/**/lib/` entry carries a comment explaining it is
anchored so it does not swallow `scripts/lib/`. The vendored parser lands in that same directory —
the anchoring is already correct, do not regress it.

---

### `scripts/verify-platform.sh` (registry — append two `--quick` rows)

**Analog:** the `--quick` array in the same file (`verify-platform.sh:3487-3510`). Row format is
`"label|command"`; external node/bash invocations are `$REPO_ROOT`-absolute and get `setsid`:

```bash
  local -a CHECKS=(
    "scan-brand-residue|node $REPO_ROOT/scripts/scan-brand-residue.mjs"
    "scan-brand-residue-self-test|node $REPO_ROOT/scripts/scan-brand-residue.mjs --self-test"
    "branding-preflight|node $REPO_ROOT/scripts/verify-branding-preflight.mjs"
    "branding-preflight-self-test|node $REPO_ROOT/scripts/verify-branding-preflight.mjs --self-test"
```

**Hard constraint from the runner** (`verify-platform.sh:3800-3818`): the dispatcher only
`setsid`s commands matching `bash */*|node */*`; anything else must be a **bare, argument-free
shell function name** — a command string with a space in that branch is rejected loudly. So the
new rows must be `node $REPO_ROOT/scripts/...` form (they are), not wrapper-function form.

Each new row gets an adjacent comment in the house style: what it asserts, why it is honestly
`--quick`, and why its self-test rides alongside. Four rows total is the natural landing:

```bash
    "generate-check|node $REPO_ROOT/scripts/generate.mjs --check"
    "generate-self-test|node $REPO_ROOT/scripts/generate.mjs --self-test"
    "generated-identity|node $REPO_ROOT/scripts/verify-generated-identity.mjs"
    "generated-identity-self-test|node $REPO_ROOT/scripts/verify-generated-identity.mjs --self-test"
```

D-15 specifies two rows; the self-test rows are the registry's own convention (every check in the
`--quick` array has one) and the planner should confirm the count with the user if it matters.

---

### `.github/workflows/rebase-upstream.yml` (CI — append steps)

**Analog:** the existing residue step in the same file (`:68-69`):

```yaml
      - name: Scan for residual brand strings
        run: node scripts/scan-brand-residue.mjs
```

Per Pitfall 1, order the new steps `generate` → `generate --check` → byte-identity, so `--check`
asserts idempotence rather than failing on an absent gitignored directory.

---

### `.gitignore` (append `generated/`)

**Analog:** the "Theia / TypeScript build output" block in the same file — the precedent for an
anchoring comment on a pattern that could over-match:

```
# Theia / TypeScript build output
# Anchored under theia/ so this doesn't also swallow scripts/lib/, which is
# hand-written source (the shared BiDi driver), not build output.
theia/**/lib/
```

New block follows the same shape (comment naming the requirement, then the anchored pattern):

```
# Generator output (D-16 / GEN-04) -- nothing under here is ever committed.
/generated/
```

---

### `scripts/verify-branding-preflight.mjs` (modified — `mark.svg` path only)

**Three sites, all in this one file.** Site 1, the read + the five user-visible failure strings
that name the old path (`:467-490`):

```js
    const markSvg = readText(root, 'powerbrowser/branding/mark.svg');
    const markTs = readText(root, 'theia/extensions/branding/src/browser/powerbrowser-mark.ts');
    if (markSvg === null) {
        r.fail('powerbrowser/branding/mark.svg does not exist -- the ten rasters have no declared source');
    }
    // ... four further r.fail() strings each spelling the same path
```

Site 2, the `--self-test` fixture copy list (`:633`) — separate site, easy to miss:

```js
        const copy = [
            'inventory/brand-tokens.json',
            // ...
            'powerbrowser/branding/mark.svg',
```

**Blast-radius rule (Pitfall 7):** the path update is the *only* permitted diff to this file in
this phase. Any change to its expectation source disarms the gate while leaving it green.

---

## Shared Patterns

### Message shape: `${NAME}: FAIL -- <what> ... <why it matters>`
**Source:** `scripts/verify-branding-preflight.mjs` (last 10 lines), `scripts/verify-registry-shape.mjs:258-260`
**Apply to:** every new script.
Failure lines are indented list items under a one-line banner carrying a **count**; the banner also
tells the reader what to do next. This is D-11's shape and it is already the house style.

### `--self-test` with a clean-baseline guard and a mutation-landed guard
**Source:** `scripts/verify-registry-shape.mjs:179-243`
**Apply to:** `generate.mjs`, `verify-generated-identity.mjs`.
Two guards that make the self-test itself non-vacuous: the unmodified tree must be green before any
plant is trusted, and each plant must be proven to have actually changed its input.

### Repo-root derivation
**Source:** `scripts/scan-brand-residue.mjs:124`, `scripts/verify-branding-preflight.mjs:48`, `scripts/verify-registry-shape.mjs:41`
```js
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
```
**Apply to:** every new `.mjs`, and to D-04's absolute `Exec=`/`Icon=` derivation. Never `cwd`.

### mkdtemp fixture, always cleaned in `finally`
**Source:** `scripts/verify-branding-preflight.mjs:624` + its `finally { rmSync(dir, {recursive:true, force:true}) }`
```js
const dir = mkdtempSync(join(tmpdir(), 'branding-preflight-selftest-'));
```
**Apply to:** `--check`'s temp emission, the byte-identity check's temp emission, and both self-tests.

### `Object.freeze` on every declared table
**Source:** `scripts/verify-registry-shape.mjs:55-71`, `scripts/scan-brand-residue.mjs:127`
**Apply to:** the target table, the schema constants, the variant list.

### Staging before trusting the residue scan
**Source:** `scripts/scan-brand-residue.mjs:329` — `execFileSync('git', ['ls-files', '-z'], ...)`
**Apply to:** every plan that creates a file. `configuration.toml`, `brand/mark.svg`,
`scripts/generate.mjs`, `scripts/lib/toml.cjs`, and the schema table are all new and all in scan
scope; unstaged they are invisible to the gate.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `scripts/generate.mjs` — emitter + merge + TOML-load halves | generator | transform | Nothing in this tree **writes** a build surface; every existing `.mjs` only reads and compares. Use RESEARCH.md Patterns 2–6 for the pipeline order (validate → mask → merge → validate), the emitter contract (`lines.join('\n') + '\n'`), and `--check`-to-mkdtemp. The CLI/reporting/self-test halves DO have analogs, above. |
| `configuration.toml` | config manifest | static data | First TOML file in the repo. Values come from `inventory/brand-tokens.json`'s `brand_display_expectations` block (RESEARCH E-2) — copied by hand, **not** read at runtime (Pitfall 7). |

## Metadata

**Analog search scope:** `scripts/`, `scripts/lib/`, `.github/workflows/`, `.gitignore`, `inventory/`
**Files scanned:** 8 read in full or in targeted ranges; 26 scripts enumerated
**Pattern extraction date:** 2026-09-01
