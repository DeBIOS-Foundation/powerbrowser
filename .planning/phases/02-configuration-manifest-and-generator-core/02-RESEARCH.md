# Phase 2: Configuration Manifest and Generator Core - Research

**Researched:** 2026-09-01
**Domain:** Deterministic config-driven code generation (TOML manifest → build-surface emitters) in zero-dependency Node
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Byte-identity targets**
- **D-01:** The generator writes into `generated/` and a registered check **diffs each output against the Phase 1 hand-written file**. Build consumers (`--with-branding`, `.mozconfig`, desktop install) keep reading the hand-written copies in Phase 2. Repointing consumers into `generated/` is Phase 3/5 work, already flagged in ROADMAP as an unexecuted spike. — **Reversibility:** reversible — repointing later is additive.
- **D-02:** The target set is **exactly five files**: `powerbrowser/branding/dev/configure.sh`, `powerbrowser/branding/release/configure.sh`, `.mozconfig`, `powerbrowser/powerbrowser.desktop`, `powerbrowser/powerbrowser-release.desktop`. `brand.ftl`/`brand.properties`, PNG icons, `firefox-branding.js`, `policies.json`, and `endpoint-allowlist.json` stay hand-written until Phases 3/4.
- **D-03:** The `configure.sh` files carry a comment reading "A COMPILED define, hand-written (plan 01-03)...". The emitter **reproduces those bytes verbatim first**; once the byte-identity check is green, a same-phase follow-up commit rewrites the comment in both hand-written files AND the emitter to a "generated from configuration.toml — do not edit" header, and the check must stay green against the new bytes. Order matters: proof before the target moves.
- **D-04:** The desktop files' absolute `Exec=` and `Icon=` paths (`/home/chris/coding/Power-Browser/...`) are **derived from the resolved repo root at generate time** plus the objdir and branding-variant names. On the reference host the output is byte-identical; on another clone it is correct for that clone. **No machine-specific value enters `configuration.toml`.**

**Defaults + merge**
- **D-05:** **The repo-root `configuration.toml` IS the defaults layer.** It is Power Browser's complete brand and doubles as the defaults a downstream's file overlays (the overlay source arrives with `PB_CONFIG_DIR` in Phase 7; Phase 2 must still implement the two-layer merge and exercise it in tests). No separate `defaults.toml`. — **Reversibility:** costly — splitting later changes what every downstream's file is merged against.
- **D-06:** Before merging, the loader **masks `[identity]`, `[legal]`, and the vendor key out of the defaults layer**, so a downstream omitting them hits the hard-fail even though Power Browser's own file supplies values. The required-key list is **one schema table** consumed by both the masker and the validator.
- **D-07:** Merge is **recursive, key-level, at any depth**; a leaf set downstream wins; **arrays replace** the whole default array (no concatenation), so a downstream can drop a default entry.
- **D-08:** Every applied default is echoed as **one stderr line per key**: dotted path plus value (e.g. `default applied: theia.default_theme = "dark"`), sorted by key path, printed on every run including `--check`. Nothing is echoed for keys the downstream set.

**Validation failure UX**
- **D-09:** Validation **collects all failures and reports them all**, one per line, then exits non-zero. Never fail-on-first.
- **D-10:** A required key counts as **unset when missing OR when its value is an empty/whitespace-only string**. `identity.vendor = ""` fails identically to an absent key.
- **D-11:** Failure message shape: file, dotted key path, offending value, the rule in plain words, and a fix hint. Example: `configuration.toml: identity.binary_name = "My Browser" does not match ^[a-z][a-z0-9-]{1,31}$ (lowercase letters, digits, hyphens; 2-32 chars; starts with a letter)`. **No stack traces, no internal variable names** — the 01-UI-SPEC no-internals copy rule applies to generator output too.
- **D-12:** **Unknown keys are a hard error** naming the key, on the same channel as missing keys. A typo like `[identiy]` cannot silently do nothing. Consequence accepted: every new key needs a schema entry first.

**Runtime + CLI shape**
- **D-13:** The generator is **Node (`scripts/generate.mjs`) with exactly one TOML parser dependency**, pinned in a root `package.json` or vendored under `scripts/lib/`. Node 24 has no built-in TOML parser (verified: `util.parseToml` undefined). Runs outside a dev shell like the other Node gates. Parser choice and vendoring form are researcher's pick.
- **D-14:** CLI: `scripts/generate.mjs [--check] [--self-test]`. Default run writes `generated/`. `--check` regenerates to a temp dir, diffs against `generated/`, exits 1 naming the stale paths. `--self-test` plants faults (missing vendor, invalid basename, unknown key, empty-string identity value, stale output) and requires each to go red naming the drift, per the repo's gate convention.
- **D-15:** Freshness joins `scripts/verify-platform.sh` as **two `--quick` registry rows**: one runs `generate.mjs --check`; one runs the byte-identity diff of `generated/` against the five Phase 1 files. Both also run in `.github/workflows/rebase-upstream.yml`. Appended rows only — no sibling driver.
- **D-16:** Layout: **`brand/` at repo root holds `mark.svg` from Phase 2** (moved from `powerbrowser/branding/mark.svg`); the ten PNG rasters stay hand-placed in `powerbrowser/branding/{dev,release}/` until Phase 3's icon pipeline. **`generated/` at repo root, added to `.gitignore`**; nothing under it is ever committed.

### Claude's Discretion
- TOML parser package and whether it is vendored or npm-pinned (D-13).
- Exact schema table representation (JSON vs JS module) and the section list `configuration.toml` carries in Phase 2 — at minimum the keys the five target files consume ([product], [identity], [legal], the dev/release variant selector, objdir names) plus whatever PROJECT.md's planned sections need as placeholders for hard-fail/default behaviour.
- How the dev/release variant pair is expressed (two variant tables vs one table plus a variant list).
- Whether `generated/` carries a committed `.gitkeep`.

### Deferred Ideas (OUT OF SCOPE)
- Emitting `brand.ftl` / `brand.properties` from the manifest — Phase 3 (GEN-01), offered and declined for Phase 2.
- Emitting `powerbrowser/endpoint-allowlist.json` from `[urls]`/`[telemetry]` hosts — Phase 4 criterion 4, offered and declined for Phase 2.
- Repointing `.mozconfig` / `--with-branding` / desktop install into `generated/` and deleting the hand-written copies — Phase 3/5, after the `--with-branding`-into-`generated/` spike.
- Real Power Browser logo replacing the placeholder mark — any time, asset swap only (carried from Phase 1).
- Custom default homepage/search via `[urls]` — carried from Phase 1 D-14; `[urls]` keys may exist in the schema in Phase 2 but drive no output until Phase 4.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CFG-01 | A downstream author can define their entire brand in `configuration.toml` + a `brand/` assets folder and touch no other file | §Standard Stack (parser), §Architecture Patterns P-1 (schema table), P-2 (two-layer load), §Code Examples E-1/E-2 |
| CFG-02 | Identity fields (vendor, app basename, binary name, remoting name) and legal fields are required — generation hard-fails with a clear message when any is unset | §Architecture Patterns P-3 (mask-then-validate), §Code Examples E-3, §Pitfall 4 (mask must precede merge) |
| CFG-03 | Binary/basename fields are validated (`^[a-z][a-z0-9-]{1,31}$`) so no invalid `MOZ_APP_NAME` can be produced | §Architecture Patterns P-3, §Code Examples E-3, §Pitfall 6 (never sanitize) |
| CFG-04 | Cosmetic fields fall back to Power Browser defaults with a visible echo at generate time; the defaults are themselves a `configuration.toml` (one merge code path) | §Architecture Patterns P-2/P-4 (merge with provenance), §Code Examples E-4, §Pitfall 3 (prototype pollution), §Pitfall 5 (array replace) |
| GEN-04 | Generated output is never committed (single gitignored `generated/` root) and `generate --check` verifies freshness in CI | §Architecture Patterns P-5 (one target table, three consumers), P-6 (`--check` semantics), §Pitfall 1 (`--check` on a fresh clone), §Validation Architecture |

</phase_requirements>

## Summary

This phase is not a research problem in the "which framework" sense. Every architectural
decision is already locked in CONTEXT.md, the five output files exist on disk as executable
specifications, and the repository has a strong, self-consistent gate convention that the new
generator must join rather than invent. The genuinely open question — the one D-13 handed the
researcher — is which TOML parser and in what form, and that resolves cleanly: **vendor
`smol-toml@1.8.0`'s `dist/index.cjs` as a single self-contained file under `scripts/lib/`.**
It is a 22,907-byte CommonJS bundle with zero `require()` and zero `import` statements
(verified by reading the extracted tarball this session), BSD-3-Clause, importable by name from
ESM, and it preserves the repository's most valuable property: `scripts/verify-platform.sh
--quick` runs on a fresh clone with no install step, no network, and no dev shell.

The second-order findings are where the risk actually lives. Byte-identity is mechanically easy
— all five targets are pure LF, each ends in exactly one `0x0a`, and `.gitattributes` pins
`* text=auto eol=lf` so no checkout can reintroduce CRLF — but *four adjacent systems break if
the plan is careless*. `generate --check` cannot work on a fresh CI clone because `generated/`
is gitignored and absent, so the byte-identity check must generate into its own temp directory
rather than depend on a prior run. A naive recursive merge over a downstream's TOML **does
pollute `Object.prototype`** via a `[__proto__]` table — demonstrated live in this session — so
the unknown-key rejection (D-12) has to run *before* the merge, not after. `smol-toml`'s
`TomlError.message` embeds a caret diagram and parser vocabulary, which violates the D-11 /
01-UI-SPEC no-internals copy rule if passed through. And moving `mark.svg` to `brand/` (D-16)
touches `verify-branding-preflight.mjs` at two separate sites, one of which is inside its own
`--self-test` fixture list.

The single most important non-obvious constraint: `inventory/brand-tokens.json`'s
`brand_display_expectations` block is *deliberately* an independent third source, authored by
hand from the recorded decisions and explicitly not derived from the branding files, because
that independence is the only thing that stops `verify-branding-preflight.mjs` from being a
tautology. `configuration.toml` will hold the same values. **The plan must not wire the preflight
to read from `configuration.toml`** — doing so collapses two sources into one and silently
disarms the gate that caught Pitfall 1 in Phase 1.

**Primary recommendation:** Vendor `smol-toml`'s single-file CJS bundle to
`scripts/lib/toml.cjs`; drive everything from one frozen schema table and one frozen target
table; validate-then-mask-then-merge in that order; and make the byte-identity check
self-sufficient (generate to `mkdtemp`, diff against the tracked files) so it never depends on
gitignored state.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| TOML parsing | Build tooling (Node, host `node`) | — | Runs outside every dev shell; `node` is on PATH unconditionally (`CLAUDE.md` §Environment) |
| Schema definition (required/optional/regex/unknown) | Build tooling — one committed data table | — | Same one-source pattern as `inventory/brand-tokens.json`, which feeds two consumers |
| Two-layer merge + default echo | Build tooling (`scripts/generate.mjs`) | — | Pure data transform; no build, no browser, no display |
| Emission of build surfaces | Build tooling → `generated/` | Gecko build (Phase 3/5 consumer) | D-01 keeps consumers on hand-written copies this phase |
| Freshness / byte-identity gating | `scripts/verify-platform.sh` registry (`--quick`) | GitHub Actions (`rebase-upstream.yml`) | CLAUDE.md: one driver, one registry; adding a check = appending a row |
| Fault injection proof | Each script's own `--self-test` | Registry row alongside the check | Repo convention: a check nobody has seen go red is not a check |
| Asset staging (`brand/mark.svg`) | Repo filesystem | `verify-branding-preflight.mjs` (reader) | D-16 moves the file; the reader must move with it in the same plan |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js | v24.19.0 (host) | Generator runtime | `[VERIFIED: node --version → v24.19.0]` — every other `.mjs` gate in `scripts/` already runs on host `node` outside a dev shell |
| `smol-toml` | 1.8.0 | TOML 1.0.0 parse | `[VERIFIED: npm view smol-toml version → 1.8.0; license BSD-3-Clause; repository github:squirrelchat/smol-toml; 34,053,544 downloads/week]` — the only viable candidate that ships a **single self-contained bundle** with no runtime `require()`/`import` |

**Verified parser facts** (all confirmed this session by unpacking `npm pack smol-toml@1.8.0`):

| Fact | Evidence |
|------|----------|
| `dist/index.cjs` is 22,907 bytes and contains **zero** `require(` or `import` statements | `grep -n "require(\|^import" package/dist/index.cjs` → no output |
| sha256 of `dist/index.cjs` | `195ca51fc784617d361af3697756a896518e45bec4e35976baec2dffd656cb8f` |
| sha256 of `LICENSE` (BSD-3-Clause, "Copyright (c) Squirrel Chat et al.") | `fa5659948374d4f555594f47f6da073b40dc503e921aeeece30df4362b3051a5` |
| Zero runtime dependencies | `package.json` has no `dependencies` key |
| No install scripts | `npm view smol-toml scripts` → `{ test: 'vitest', 'update-gha': 'pin-github-action .github/workflows' }` — no `postinstall`/`preinstall` |
| **Named ESM import from the vendored `.cjs` works** | `import { parse, TomlError } from './toml.cjs'` → `function function` |
| Returns plain `Object.prototype` objects, arrays of tables become JS arrays | `Object.getPrototypeOf(parse(src)) === Object.prototype` → `true` |
| Duplicate key is a hard error | `parse('a=1\na=2\n')` → `TomlError`, `.line === 2`, `.column === 1` |
| `TomlError` carries structured `.line` / `.column` | syntax-error probe → `line 1 col 2` |
| A `[__proto__]` table becomes an **own** property, not a prototype write, at parse time | `parse('[__proto__]\npolluted = true\n')` → `Object.prototype.polluted === undefined` |
| Contains no `sourcerer` / `deocracy` token | `grep -c -i "sourcerer\|deocracy" package/dist/index.cjs` → `0` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node:fs` | stdlib | read/write/`mkdtempSync` | All I/O. `mkdtempSync` is the repo's established fixture idiom (`scan-brand-residue.mjs`, `verify-branding-preflight.mjs` both use it) |
| `node:path`, `node:url` | stdlib | Repo-root derivation | Existing convention: `resolve(dirname(fileURLToPath(import.meta.url)), '..')` `[VERIFIED: scripts/scan-brand-residue.mjs:126]` |
| `node:assert` | stdlib | none needed | The repo does **not** use assert-style tests; it uses `--self-test` fault planting |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vendored `smol-toml` | npm-pin `smol-toml` in a root `package.json` | Requires `npm ci` before `verify-platform.sh --quick` can run at all — destroys the "no install, no dev shell, seconds on a fresh clone" property that every existing `--quick` row relies on, and adds a step to `rebase-upstream.yml`. **Rejected.** |
| `smol-toml` | `@iarna/toml@2.2.5` | `[VERIFIED: npm view @iarna/toml version → 2.2.5, time.modified 2023-07-15, license ISC]`. Legitimacy verdict `OK` (older, 7.3M/wk). But it targets TOML **0.5**, is unmaintained since 2020, and ships a multi-file CJS layout — a worse vendoring unit (no single self-contained bundle). |
| `smol-toml` | `@ltd/j-toml@1.38.0` | `[VERIFIED: npm view @ltd/j-toml license → LGPL-3.0]`. **Rejected on license**: the repo is PolyForm Noncommercial 1.0.0 `[VERIFIED: LICENSE:1]`; vendoring LGPL source into it creates relicensing obligations this project has no reason to take on. |
| Any dependency | Hand-written TOML subset parser | Would honour "zero non-Theia dependencies" but **contradicts locked decision D-13**, which states the generator has exactly one TOML parser dependency. Not adopted. Flagged in §Open Questions in case the planner wants to re-raise it with the user. |
| Node built-in | `util.parseToml` / `node:toml` | Do not exist. `[VERIFIED: node -e '...' → util.parseTOML: undefined \| parseToml: undefined; node:toml: absent]` on v24.19.0 |

**Installation (vendoring form — recommended):**

```bash
# One-time, recorded in the plan as the provenance of scripts/lib/toml.cjs
npm pack smol-toml@1.8.0
tar xzf smol-toml-1.8.0.tgz
cp package/dist/index.cjs scripts/lib/toml.cjs      # then prepend the provenance header
cp package/LICENSE        scripts/lib/toml.LICENSE  # BSD-3-Clause requires the notice be retained
sha256sum scripts/lib/toml.cjs
# expected: 195ca51fc784617d361af3697756a896518e45bec4e35976baec2dffd656cb8f
```

The provenance header prepended to `scripts/lib/toml.cjs` should name: the package and exact
version, the upstream sha256 above, the license and where its text lives, and the command that
produced the file — so a future re-vendor is a mechanical repeat rather than an archaeology
project. This mirrors how every other non-obvious artifact in this tree carries its own
rationale in a header comment.

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `smol-toml` | npm | first published 2023-05-07; latest 1.8.0 published 2026-08-11 | 34,053,544 / week | github.com/squirrelchat/smol-toml | **SUS** (`too-new`) | **Kept, flagged** — see below |
| `@iarna/toml` | npm | published 2020-04-22 | 7,318,253 / week | github.com/iarna/iarna-toml | OK | Not selected (TOML 0.5, unmaintained, multi-file) |
| `@ltd/j-toml` | npm | 1.38.0, 2023-01-16 | not queried | — | not run | Rejected on license (LGPL-3.0) before legitimacy mattered |

**Packages removed due to [SLOP] verdict:** none.

**Packages flagged as suspicious [SUS]:** `smol-toml` `[WARNING: flagged as suspicious — verify before using.]`
The seam's `too-new` reason keys on `publishedAt` `2026-08-11`, which is the **latest release**
date, not the package's creation date. `npm view smol-toml time.created` returns
`2023-05-07T21:58:07.406Z` — the package is over three years old with 34M weekly downloads, a
public GitHub repository, and no install scripts. On the available evidence this is a false
positive, but the protocol is not overridden by my judgement: **the planner must add a
`checkpoint:human-verify` task before the vendoring step**, at which point the operator confirms
the sha256 above matches what they fetch. Because the recommendation is vendoring rather than an
npm install, that checkpoint is cheap — the operator is reviewing 22,907 bytes of committed
source, not trusting a lockfile.

## Architecture Patterns

### System Architecture Diagram

```
  configuration.toml (repo root, tracked)          [PB_CONFIG_DIR]/configuration.toml
   = Power Browser's brand AND the defaults layer    = downstream overlay (Phase 7;
                                                       Phase 2 exercises it only in tests)
            │                                                    │
            └──────────────┬─────────────────────────────────────┘
                           ▼
                  scripts/lib/toml.cjs  (vendored smol-toml — parse only)
                           │
                           │  TomlError caught here; NEVER re-thrown raw
                           ▼
             ┌─────────────────────────────────────────┐
             │ 1. UNKNOWN-KEY REJECTION  (D-12)        │◄── schema table
             │    walks both layers against the schema │    (one file, three readers)
             │    MUST precede the merge — Pitfall 3   │
             └─────────────────┬───────────────────────┘
                               ▼
             ┌─────────────────────────────────────────┐
             │ 2. MASK defaults layer   (D-06)         │◄── same schema table:
             │    drop [identity], [legal], vendor     │    required=true ⇒ maskable
             └─────────────────┬───────────────────────┘
                               ▼
             ┌─────────────────────────────────────────┐
             │ 3. MERGE, recursive, arrays replace     │
             │    (D-07) — records provenance per leaf │──► stderr: "default applied: <path> = <v>"
             └─────────────────┬───────────────────────┘    sorted by dotted path (D-08)
                               ▼
             ┌─────────────────────────────────────────┐
             │ 4. VALIDATE — collect ALL failures      │──► stderr, one line per failure,
             │    required-unset (D-10) + regex (CFG-03)│    then exit 1  (D-09/D-11)
             └─────────────────┬───────────────────────┘
                               ▼
                    resolved config  +  repoRoot (derived, D-04)
                               ▼
             ┌─────────────────────────────────────────┐
             │ TARGET TABLE — frozen, one declaration  │
             │  path ──► emitter(config, variant)      │
             └───┬──────────────┬──────────────┬───────┘
                 │              │              │
       default run│      --check│   byte-identity check
                 ▼              ▼              ▼
          write generated/  emit to mkdtemp   emit to mkdtemp
                            diff vs           diff vs the five
                            generated/        TRACKED Phase 1 files
                            exit 1 naming     + set-equality on the
                            stale paths       target list (derive & compare)
```

### Recommended Project Structure

```
configuration.toml              # tracked. Power Browser's brand AND the defaults layer (D-05)
brand/
└── mark.svg                    # moved from powerbrowser/branding/mark.svg (D-16)
generated/                      # gitignored (D-16). Nothing here is ever committed.
├── .mozconfig
├── branding/{dev,release}/configure.sh
└── {powerbrowser,powerbrowser-release}.desktop
scripts/
├── generate.mjs                # the one generator: [--check] [--self-test]
├── verify-generated-identity.mjs   # D-15 row 2: byte-identity vs the five tracked files
└── lib/
    ├── toml.cjs                # vendored smol-toml 1.8.0 dist/index.cjs + provenance header
    ├── toml.LICENSE            # BSD-3-Clause notice, retained per license terms
    └── config-schema.json      # the ONE schema table (masker + validator + unknown-key check)
```

Exact filenames beyond `scripts/generate.mjs` and `configuration.toml` are the planner's call;
what matters is that the schema table is one file with three readers, and that the target table
is one declaration with three consumers.

### Pattern 1: One schema table, three readers

**What:** A single committed data file declares, per dotted key path: whether it is required,
its type, any regex, and whether it belongs to the maskable identity/legal group. The
unknown-key check, the defaults masker, and the validator all read it; none of them carries its
own list.

**When to use:** Always here. It is the direct analogue of `inventory/brand-tokens.json`, which
is simultaneously `rename-brand.mjs`'s replacement plan and `scan-brand-residue.mjs`'s token
source — `[VERIFIED: .planning/phases/01-platform-extraction-and-rename/01-LEARNINGS.md:35-38]`,
which states verbatim: *"`inventory/brand-tokens.json` is simultaneously `rename-brand.mjs`'s
replacement plan and `scan-brand-residue.mjs`'s token source"* and *"What is scanned and what is
renamed cannot drift when both read one file."*

**Format:** JSON, for the same reason 01-LEARNINGS gives for the inventory —
`[VERIFIED: 01-LEARNINGS.md:38]` *"JSON over TOML because both consumers are Node with zero
dependencies."* That reasoning is weaker now that a TOML parser is vendored, but JSON keeps the
schema table readable by any tool without going through the vendored parser, and matches the
existing precedent. A frozen JS module (`export const SCHEMA = Object.freeze({...})`) is an
equally defensible discretion call and matches `verify-registry-shape.mjs`'s `Object.freeze`
idiom `[VERIFIED: scripts/verify-registry-shape.mjs:56-71]`.

### Pattern 2: Validate → mask → merge → validate (order is load-bearing)

**What:** Unknown-key rejection runs on both raw layers *before* anything is merged. Only then
is the defaults layer masked and the merge performed. Required/regex validation runs on the
merged result.

**Why the order:** two independent reasons, both real.
1. **Security:** a naive recursive merge over an unvalidated `[__proto__]` table pollutes
   `Object.prototype` — demonstrated live this session (see §Common Pitfalls, Pitfall 3).
   Rejecting unknown keys first means `__proto__` never reaches the merge, because it is not in
   the schema.
2. **Message quality:** a typo'd table (`[identiy]`) that survives to the merge produces a
   *missing required key* error naming `identity.vendor`, which sends the author looking in the
   wrong place. Caught pre-merge it produces `unknown key: identiy` — which is the actual
   problem. D-12's stated purpose ("a typo like `[identiy]` cannot silently do nothing") only
   holds if the unknown-key check runs where it can still see the typo.

### Pattern 3: The merge records provenance, it does not just produce a value

**What:** The merge returns `{ value, defaulted: [dottedPath, ...] }` rather than only the merged
object. D-08's echo is then a `.sort().forEach()` over `defaulted`, not a second traversal that
re-derives which keys came from where.

**Why:** a second traversal is a second source of truth about the same fact and can disagree with
the merge — precisely the failure mode CLAUDE.md's "derive from the tree and compare; do not
hand-keep an expectation list" rule exists to prevent, in miniature.

### Pattern 4: One target table, three consumers

**What:**

```js
const TARGETS = Object.freeze([
    { generated: '.mozconfig',
      tracked:   '.mozconfig',
      emit:      emitMozconfig },
    { generated: 'branding/dev/configure.sh',
      tracked:   'powerbrowser/branding/dev/configure.sh',
      emit:      cfg => emitConfigureSh(cfg, 'dev') },
    // ... release configure.sh, both .desktop files
]);
```

The default run, `--check`, and the byte-identity check all iterate this one array. The
byte-identity check additionally asserts **set equality** between `TARGETS.map(t => t.tracked)`
and the declared five-file target list, so adding a sixth emitter without updating the declared
set goes red, and removing one goes red too.

**Why:** this is CLAUDE.md's derive-and-compare rule applied to the emitter set.
`verify-registry-shape.mjs` is the shipped template for exactly this discipline —
`[VERIFIED: scripts/verify-registry-shape.mjs:16-31]`: *"That check silently stops testing
anything the moment it goes stale: it can never go red on a member being added, and it can never
go red on a member being removed that nobody remembered to list. It agrees with every tree."*

### Pattern 5: Emitters return strings; the writer owns every byte

**What:** each emitter is `(config, variant) => string`. It builds an array of lines and returns
`lines.join('\n') + '\n'`. The writer does `writeFileSync(path, text, 'utf8')`. No template
engine, no `os.EOL`, no `console.log` shaping, no trailing-whitespace trimming pass.

**Why:** all five targets are LF-only and end in exactly one `0x0a`
`[VERIFIED: tail -c1 | od -An -tx1 → 0a for all five]`, and `.gitattributes:4` pins
`* text=auto eol=lf` `[VERIFIED: .gitattributes:4]` with `.gitattributes:9` adding
`*.sh text eol=lf`, so the working tree can never present them as CRLF. `join('\n') + '\n'` is
therefore byte-exact by construction on every platform, whereas `os.EOL` would silently emit
CRLF on a Windows host and break the acceptance test.

### Pattern 6: `--check` regenerates to `mkdtemp`, never in place

**What:** `--check` emits to a fresh `mkdtempSync` directory, byte-compares each file against
`generated/`, and exits 1 listing every stale path. It writes nothing to `generated/`.

**Why:** a `--check` that writes and then compares cannot distinguish "was already fresh" from
"I just made it fresh", which is the same class of non-discriminating instrument
`verify-registry-shape.mjs`'s header warns about. `mkdtempSync` is the established fixture idiom
in this tree — `[VERIFIED: scripts/verify-branding-preflight.mjs:624]`:
`const dir = mkdtempSync(join(tmpdir(), 'branding-preflight-selftest-'));`

### Anti-Patterns to Avoid

- **Template files on disk (`templates/mozconfig.tmpl` + `{{placeholder}}`).** Adds a second
  artifact class to keep in sync with the schema, a substitution engine to write, and a new
  failure mode (unsubstituted placeholder ships silently). Five files of 8–11 lines each do not
  earn it. Emit from code.
- **Passing `TomlError.message` through to the user.** See Pitfall 2 — it violates the
  no-internals copy rule by construction.
- **Sanitizing an invalid basename.** CFG-03's wording is explicit: *"never silently sanitized
  into an invalid `MOZ_APP_NAME`."* Reject, name the key, name the rule.
- **Wiring `verify-branding-preflight.mjs` to read `configuration.toml`.** See Pitfall 7. It is
  the single change in this phase's blast radius that would disarm a working gate while leaving
  it green.
- **Making the byte-identity check depend on `generated/` existing.** See Pitfall 1.
- **A second driver script.** CLAUDE.md §Verification: *"Adding a check means appending one row
  to that registry. It does not mean creating a sibling driver."*

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TOML parsing | A subset parser | Vendored `smol-toml` | TOML 1.0.0 has multiline basic/literal strings, dotted keys, inline tables, arrays of tables, offset/local datetimes, and underscore-separated numeric literals. A subset parser that *silently* mis-reads a construct it does not know is worse than no parser — and D-13 already locks in a dependency |
| Duplicate-key detection | A manual key-seen set | `smol-toml` | Already a hard `TomlError` with `.line`/`.column` `[VERIFIED: parse('a=1\na=2\n') → TomlError, line 2 col 1]` |
| Deep merge | `structuredClone` + spread chains | A ~20-line explicit recursive merge with a `defaulted` accumulator | Off-the-shelf deep-merge libraries concatenate arrays by default, which directly contradicts D-07 ("arrays replace"), and none of them return the provenance D-08 needs. This is the one place hand-writing is correct — it is 20 lines and the semantics are project-specific |
| Byte comparison | Line-diff parsing | `Buffer.compare()` / `readFileSync` string equality, then a line-level diff **only for the failure message** | The assertion is byte-identity; a line differ is a reporting aid, not the check |
| Temp directories | `/tmp/<fixed-name>` | `mkdtempSync(join(tmpdir(), '<prefix>-'))` | Established repo idiom; a fixed path collides between concurrent runs |
| Repo-root discovery | `process.cwd()` | `resolve(dirname(fileURLToPath(import.meta.url)), '..')` | `[VERIFIED: scripts/scan-brand-residue.mjs:126]` — `cwd` is wrong the moment the script is invoked from anywhere but the root, and `verify-platform.sh` invokes with `$REPO_ROOT`-absolute paths |

**Key insight:** the repository's convention is that *the gate* is hand-written and *the
primitive* is not. Every existing `verify-*.mjs` hand-writes its comparison logic (because the
invariant is project-specific) while leaning on stdlib for I/O and process control. The generator
should sit in exactly that groove: hand-written merge, validator, and emitters; vendored parser;
stdlib everything else.

## Runtime State Inventory

> D-16 moves `powerbrowser/branding/mark.svg` → `brand/mark.svg`. That is a path refactor, so
> this section is required.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | **None** — the generator reads two config files and writes files; no database, no cache, no user-scoped record | none |
| Live service config | **None** — verified by grepping `.github/workflows/` (one workflow, `rebase-upstream.yml`, `workflow_dispatch`-only) and `scripts/` for external service calls; the only network egress in the tree is `verify-endpoints.sh` and the Open VSX registry URL used by Theia checks | none |
| OS-registered state | **The two `.desktop` files are the OS-registered surface.** They are *not* installed by any script in this repo — no `xdg-desktop-menu`, `desktop-file-install`, or `~/.local/share/applications` write exists in `scripts/`. If the operator has hand-copied them, a regenerated copy under `generated/` does not update the installed one. D-01 keeps consumers on the hand-written copies, so nothing changes this phase | none in Phase 2; note for Phase 3/5 when consumers repoint |
| Secrets / env vars | `POWERBROWSER_OBJDIR` and `POWERBROWSER_BRANDING` are the two build-time env vars the `.mozconfig` reads `[VERIFIED: .mozconfig:1,10]`, used as `POWERBROWSER_OBJDIR=objdir-release POWERBROWSER_BRANDING=powerbrowser/branding/release` `[VERIFIED: docs/BUILD.md:295]`. Their **names** are unchanged by this phase; the generator must emit the same `${POWERBROWSER_OBJDIR:-objdir}` shell-default text verbatim | none — emit verbatim |
| Build artifacts | `objdir/` and `objdir-release/` are gitignored `[VERIFIED: .gitignore]` and unaffected. **No** rebuild is triggered by this phase — D-01 means no consumer reads `generated/` yet, so `--with-branding` still points at the hand-written `powerbrowser/branding/dev` | none |
| **Path refactor: `mark.svg`** | Three in-repo readers, all in one file: `scripts/verify-branding-preflight.mjs:467` (`readText(root, 'powerbrowser/branding/mark.svg')`), `:633` (inside the `--self-test` fixture copy list), and the failure strings at `:470,477,482,487,490` that name the old path in user-visible copy | **Update all three sites in the same plan as the move**, or `branding-preflight` and `branding-preflight-self-test` both go red. CONTEXT §Integration Points already flags lines ~462-477; note that **line 633 is a second, separate site inside the self-test fixture list** and is easy to miss |
| **`inventory/brand-tokens.json` references** | No row references `mark.svg` `[VERIFIED: grep "mark.svg" inventory/brand-tokens.json → no match]`. Rows *do* reference the five target paths (`:110-111`, `:116-117`, `:144`, `:159`, `:171-174`, `:361-362`, `:453-456`, `:467-470`, `:481-484`, `:495-498`, `:593`) but only as `expected_files` for **source-token** (Sourcerer-form) counts, several of which are load-bearing zeros | No inventory edit needed for the mark move. **Do not touch the zero-count rows** — `:364` states *"ZERO IS LOAD-BEARING HERE"* |

## Common Pitfalls

### Pitfall 1: `generate --check` is red on every fresh clone, for a reason that is not staleness

**What goes wrong:** `generated/` is gitignored (D-16), so a fresh clone — including every
GitHub Actions run — has no `generated/` at all. A `--check` that compares a temp emission
against a directory that does not exist reports every one of the five files as stale, and the
CI row is red on a tree with no defect.

**Why it happens:** `--check` in the `gofmt`/`prettier` sense asserts "the committed output
matches what I'd write". Here the output is deliberately *not* committed, so there is nothing to
check against until something generates it.

**How to avoid:** two decisions the plan must make explicitly.
1. `--check` treats an absent `generated/` as **stale, with its own distinct message** — not a
   crash, not a silent pass. Something like `generated/ does not exist — run scripts/generate.mjs
   first` reads correctly for a human and is honest about the state.
2. **The byte-identity check (D-15 row 2) must not depend on `generated/`.** Have it emit into
   its own `mkdtempSync` and diff against the five *tracked* files. That makes it green on a
   fresh clone with zero setup, which is what a `--quick` row promises.
3. In `rebase-upstream.yml`, order the steps `generate` → `generate --check` → byte-identity.
   The middle step then proves **idempotence** (two runs produce identical bytes), which is a
   real property worth gating and is exactly what `--check` can honestly assert in CI.

**Warning signs:** the byte-identity row passing locally and failing in CI; a `--check` failure
message that names all five files at once.

### Pitfall 2: `TomlError.message` violates the no-internals copy rule

**What goes wrong:** a parse failure is caught and re-printed as `console.error(e.message)`. The
observed message for `parse('[identity\nx = 1\n')` is, verbatim:

```
Invalid TOML document: incomplete key-value: cannot find end of key

1:  [identity
     ^
2:  x = 1
```

That is parser vocabulary ("incomplete key-value") plus a caret diagram — an internal artifact by
any reading of CLAUDE.md §User-facing copy (*"no internal identifier may appear in user-facing
text… no pref key, sentinel name, port, timeout, or raw exception message"*) and of D-11 (*"No
stack traces, no internal variable names"*).

**Why it happens:** it is the path of least resistance, and the message is genuinely useful — so
it survives review.

**How to avoid:** catch `TomlError` at the single parse call site and re-emit using its
**structured** fields, which are reliable: `.line` and `.column` were verified this session.
Target shape:

```
configuration.toml line 4: this line is not valid TOML.
  Each setting is written as  key = "value"  and each section header as  [section].
  Fix line 4, then run scripts/generate.mjs again.
```

Names the file, names the location, states the rule in plain words, ends with a real next step —
which is D-11's shape and the 01-UI-SPEC contract. `verify-shell-error-copy.mjs` enforces this
pattern for the shell; the generator's output is not currently in that check's scope, so the
discipline here is on the author and the reviewer.

**Warning signs:** the string `Invalid TOML document` appearing anywhere in generator output;
a `catch` block whose body is `console.error(e.message)`.

### Pitfall 3: A naive recursive merge over downstream TOML pollutes `Object.prototype`

**What goes wrong:** demonstrated live this session, not theorised:

```js
function merge(t, s) { for (const k of Object.keys(s)) { /* recurse or assign t[k] = s[k] */ } return t; }
merge({}, parse('[__proto__]\npwned = true\n'));
console.log(({}).pwned);   // → true
```

The parser itself is safe — `parse` puts `__proto__` on the object as an **own** property and
`Object.prototype` is untouched at that point `[VERIFIED: parse('[__proto__]\npolluted = true\n')
→ Object.prototype.polluted === undefined]`. The pollution happens in **our** merge, at
`t[k] = ...` with `k === '__proto__'`.

**Why it happens:** `configuration.toml` reads like a config file the author controls, so it does
not feel like a trust boundary. With `PB_CONFIG_DIR` (CFG-05, Phase 7) it becomes one: an
arbitrary downstream's file is parsed and merged by the platform's own generator.

**How to avoid:** D-12 already fixes this **provided the unknown-key rejection runs before the
merge** — `__proto__` is not in the schema, so it is rejected as an unknown key and never reaches
`merge`. Belt and braces, cheap and worth it: build merge accumulators with `Object.create(null)`
and skip the three dangerous key names (`__proto__`, `constructor`, `prototype`) explicitly. This
is input validation at a trust boundary, which is on the never-simplify-away list.

**Warning signs:** the merge function assigning with bracket notation onto an object literal;
unknown-key validation implemented as a post-merge walk of the resolved config.

### Pitfall 4: Masking after the merge instead of before it silently disarms CFG-02

**What goes wrong:** the defaults layer is merged first and the mask applied to the result. Now
`identity.vendor` is present in the merged object (it came from Power Browser's own file), the
mask removes it, and the validator reports it missing — which happens to be the right answer.
But a downstream that sets *some* identity keys and omits others gets Power Browser's values
merged in for the omitted ones before masking, and depending on how the mask is scoped
(whole-table vs per-key) it may or may not strip them. The two orderings agree on the simple
case and diverge on the partial case, which is the case that actually ships.

**Why it happens:** "merge then post-process" is the intuitive pipeline shape.

**How to avoid:** mask the **defaults layer object**, before it is an input to the merge, exactly
as D-06 words it (*"Before merging, the loader masks…out of the defaults layer"*). Then no
identity value can ever enter the merge from the defaults side, and the partial case behaves
identically to the total case. The `--self-test` should plant a *partial* identity table (vendor
set, `binary_name` omitted) specifically to pin this, not only a wholly-absent one.

**Warning signs:** the mask taking the merged config as its argument; a self-test whose only
identity fault is a completely missing `[identity]` table.

### Pitfall 5: Array-replace looks like a merge bug in review

**What goes wrong:** D-07 says arrays replace wholesale, so a downstream declaring one extension
gets one extension, not one plus Power Browser's defaults. A reviewer who expects concat sees
this as a lost-data bug and "fixes" it. Every off-the-shelf deep-merge library defaults to
concat, so the reviewer's instinct has support.

**Why it happens:** the two semantics are both defensible and the code looks the same at a glance.

**How to avoid:** a comment at the array branch naming D-07 and its *purpose* — arrays replace
**so a downstream can drop a default entry**, which concat makes impossible. Add a `--self-test`
case that plants a shorter downstream array and requires the resolved value to be the short one.
That is the check that goes red if someone changes it back.

### Pitfall 6: Sanitizing an invalid basename

**What goes wrong:** `binary_name = "My Browser"` is helpfully lowercased and hyphenated to
`my-browser`, generation succeeds, and the downstream ships under a name they never wrote. CFG-03
exists to forbid exactly this: *"never silently sanitized into an invalid `MOZ_APP_NAME`."*

**How to avoid:** the regex is a gate, not a transform. `^[a-z][a-z0-9-]{1,31}$` — note it
requires 2–32 characters total (one leading letter plus 1–31 more), so a single-character name
like `x` is **invalid**. Say so in the message; "1,31" is not self-explanatory to the stranger
doing their first rebrand.

### Pitfall 7: Wiring the preflight to `configuration.toml` disarms it while leaving it green

**What goes wrong:** `configuration.toml` will contain `Power Browser`, `Power Browser Dev`,
`powerbrowser`, `DeBIOS`, `DeBIOS Foundation`, `org.debios` — the same values
`inventory/brand-tokens.json` carries. Deduplicating looks obviously correct. It is not.

**Why it matters:** `brand-tokens.json`'s own `$comment` states the reason verbatim
`[VERIFIED: inventory/brand-tokens.json, brand_display_expectations.$comment]`:

> *"THE EXPECTED-VALUE SOURCE for scripts/verify-branding-preflight.mjs, and the reason that
> script is not a tautology. Authored by hand in plan 01-03 from the RECORDED IDENTITY DECISIONS
> … not read back out of the branding files … That independence is the whole point: Pitfall 1's
> failure mode is a mechanical pass that rewrites BOTH a display literal and the expectation that
> checks it, so the build succeeds, the window title is wrong, and the verifier agrees. It
> actually happened."*

Once the generator writes `configure.sh` from `configuration.toml` and the preflight reads its
expectation from `configuration.toml`, a wrong value in the manifest produces a wrong build that
the preflight certifies as correct — the exact defect that comment records as having already
happened once.

**How to avoid:** Phase 2 changes nothing about the preflight's expectation source. CONTEXT
already states the preflight "should keep passing unchanged". Treat that as a hard constraint, not
an observation. VER-02 (Phase 6) does eventually require reading expectations from
`configuration.toml`; re-establishing independence at that point is Phase 6's problem and needs
its own design.

**Warning signs:** any diff to `verify-branding-preflight.mjs` in this phase other than the
`mark.svg` path update.

### Pitfall 8: A green residue scan over an unstaged file

**What goes wrong:** `configuration.toml`, `brand/mark.svg`, `scripts/generate.mjs`,
`scripts/lib/toml.cjs`, and the schema table are all new. `scan-brand-residue.mjs` derives its
file set from `git ls-files` `[VERIFIED: scripts/scan-brand-residue.mjs:329]`
(`execFileSync('git', ['ls-files', '-z'], …)`), so **an unstaged new file is invisible to it** and
the scan is green having never looked at the new code.

**How to avoid:** `git add` before trusting the scan. CLAUDE.md calls this out as a trap that has
been hit for real.

**Relevant fact:** `scope.exclude` is `[".planning/", "inventory/", "scripts/scan-brand-residue.mjs",
"scripts/rename-brand.mjs"]` `[VERIFIED: inventory/brand-tokens.json, scope.exclude]` — the new
files are **not** excluded and will be scanned. The vendored parser is clean:
`grep -c -i "sourcerer\|deocracy" dist/index.cjs` → `0`. `.svg` is not in `binary_extensions`
(`.png .ico .icns .jpg .gif .woff .woff2 .zip`), so `brand/mark.svg` is scanned as text — it
already is at its current path, so the move changes nothing there.

### Pitfall 9: `.gitignore`-ing `generated/` and then not staging anything

`generated/` must be added to `.gitignore` (D-16). A trailing-slash entry `generated/` matches the
directory anywhere in the tree; anchor it as `/generated/` if the intent is repo-root only. The
existing file already uses both anchored (`/`-less) and comment-annotated forms — see the
`theia/**/lib/` entry, whose comment exists precisely because an unanchored pattern almost ate
`scripts/lib/` `[VERIFIED: .gitignore, "Theia / TypeScript build output" block]`. That is a live
warning: **an unanchored `generated/` is fine today, but the same class of mistake has already
cost this repo a comment block.** The `.gitkeep` question (CONTEXT discretion) resolves naturally
— if `generated/` is created by the generator with `mkdirSync(..., {recursive:true})`, no
`.gitkeep` is needed and none should be added, since D-16 says nothing under `generated/` is ever
committed.

## Code Examples

### E-1: The five targets, verbatim (these are the spec)

`.mozconfig` — 566 bytes, 11 lines, final byte `0x0a` `[VERIFIED: .mozconfig:1-11]`:

```
mk_add_options MOZ_OBJDIR=@TOPSRCDIR@/../${POWERBROWSER_OBJDIR:-objdir}
ac_add_options --enable-application=browser
ac_add_options --disable-updater
ac_add_options --without-wasm-sandboxed-libraries
ac_add_options --with-libclang-path="$LIBCLANG_PATH"
ac_add_options --with-app-basename=powerbrowser
ac_add_options --with-distribution-id=org.debios
ac_add_options --disable-crashreporter
ac_add_options --with-ccache=sccache
ac_add_options --with-branding=${POWERBROWSER_BRANDING:-powerbrowser/branding/dev}
mk_add_options "export MOZ_APP_REMOTINGNAME=powerbrowser"
```

`powerbrowser/branding/dev/configure.sh` — 468 bytes, 8 lines
`[VERIFIED: powerbrowser/branding/dev/configure.sh:1-8]`:

```
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# A COMPILED define, hand-written (plan 01-03). A typo here costs a full
# tier-3 rebuild (~40 min), which is why scripts/verify-branding-preflight.mjs
# cross-checks it against the inventory before the build rather than after.
MOZ_APP_DISPLAYNAME="Power Browser Dev"
```

`powerbrowser/branding/release/configure.sh` — 464 bytes, 8 lines, byte-identical to the above
except the final line `[VERIFIED: powerbrowser/branding/release/configure.sh:8]`:

```
MOZ_APP_DISPLAYNAME="Power Browser"
```

`powerbrowser/powerbrowser.desktop` — 491 bytes, 9 lines
`[VERIFIED: powerbrowser/powerbrowser.desktop:1-9]`:

```
[Desktop Entry]
Name=Power Browser Dev
Exec=/home/chris/coding/Power-Browser/objdir/dist/bin/powerbrowser %u
Icon=/home/chris/coding/Power-Browser/powerbrowser/branding/dev/default128.png
Terminal=false
Type=Application
Categories=Development;IDE;
StartupWMClass=powerbrowser
MimeType=text/html;text/xml;application/xhtml+xml;application/xml;application/vnd.mozilla.xul+xml;application/rss+xml;application/rdf+xml;image/gif;image/jpeg;image/png;x-scheme-handler/http;x-scheme-handler/https;
```

`powerbrowser/powerbrowser-release.desktop` — 499 bytes, 9 lines, differing in exactly three
lines `[VERIFIED: powerbrowser/powerbrowser-release.desktop:2-4]`:

```
Name=Power Browser
Exec=/home/chris/coding/Power-Browser/objdir-release/dist/bin/powerbrowser %u
Icon=/home/chris/coding/Power-Browser/powerbrowser/branding/release/default128.png
```

**Which bytes come from config, and which are platform constants.** In `.mozconfig` only four
values are brand/identity-derived: `--with-app-basename=powerbrowser` (line 6),
`--with-distribution-id=org.debios` (line 7), `MOZ_APP_REMOTINGNAME=powerbrowser` (line 11), and
the dev variant's `objdir` / `powerbrowser/branding/dev` defaults inside the shell-default
expansions on lines 1 and 10. Lines 2–5 and 8–9 (`--enable-application=browser`,
`--disable-updater`, `--without-wasm-sandboxed-libraries`,
`--with-libclang-path="$LIBCLANG_PATH"`, `--disable-crashreporter`, `--with-ccache=sccache`) are
**toolchain constants, not rebrand inputs** — CFG-01 scopes the manifest to *brand*, and
PROJECT.md's `[build]` section is described as *"channel, release/debug defaults"*, not a
compiler-flag passthrough. Recommendation: keep them as literal emitter text in Phase 2.

### E-2: Identity values Power Browser's own `configuration.toml` must carry

Every value below is quoted verbatim from
`[VERIFIED: inventory/brand-tokens.json, brand_display_expectations, lines 78-105]`:

```
"variants": {
  "dev":     { "brand_full_name": "Power Browser Dev",  // (from the dev block above line 78)
               "brand_short_name": "Power Browser",
               "brand_shorter_name": "Power Browser",
               "brand_shortcut_name": "Power Browser",
               "app_display_name": "Power Browser Dev",
               "branding_dir": "powerbrowser/branding/dev",
               "objdir": "objdir",
               "desktop_entry": "powerbrowser/powerbrowser.desktop" },
  "release": { "brand_full_name": "Power Browser",
               "brand_short_name": "Power Browser",
               "brand_shorter_name": "Power Browser",
               "brand_shortcut_name": "Power Browser",
               "app_display_name": "Power Browser",
               "branding_dir": "powerbrowser/branding/release",
               "objdir": "objdir-release",
               "desktop_entry": "powerbrowser/powerbrowser-release.desktop" }
},
"vendor_display": "DeBIOS Foundation",
"vendor_machine": "DeBIOS",
"app_basename": "powerbrowser",
"distribution_id": "org.debios",
"domain": "powerbrowser.org",
"identifier_form": "PowerBrowser",
"repo_root": "/home/chris/coding/Power-Browser"
```

**The vendor split is not optional and must survive into the manifest.** From the same file's
`vendor_split_reason`, verbatim: *"MOZ_APP_VENDOR is lowercased and concatenated into the Firefox
profile path with no space stripping (upstream/toolkit/xre/nsXREDirProvider.cpp:1621-1637), so
the display-side `DeBIOS Foundation` would yield `~/.config/debios foundation/powerbrowser/` — a
space in a path, against this repo's hard no-spaces rule. The two values MUST be distinct and the
preflight asserts that they are."* So `configuration.toml` needs **two** vendor keys, not one —
a machine vendor (`DeBIOS`) and a display vendor (`DeBIOS Foundation`).

The machine vendor must also agree with the patch stack:
`[VERIFIED: patches/010-powerbrowser-identity.patch:20]` → `+imply_option("MOZ_APP_VENDOR", "DeBIOS")`.

`repo_root` is present in the inventory but is **machine-specific**; D-04 forbids it entering
`configuration.toml`. Derive it at generate time.

### E-3: Failure-message shape (D-11 / 01-UI-SPEC compliant)

```
configuration.toml: identity.binary_name = "My Browser" does not match ^[a-z][a-z0-9-]{1,31}$
  (lowercase letters, digits and hyphens only; 2 to 32 characters; must start with a letter)
  Try: binary_name = "my-browser"

configuration.toml: identity.vendor is not set
  Every build needs its own vendor name so it does not ship under Power Browser's mark.
  Add it under [identity], for example: vendor = "Acme"

configuration.toml: unknown setting "identiy"
  There is no section by that name. Did you mean [identity]?
```

Each line names the file, the dotted key, the offending value, the rule in words a stranger can
act on, and a concrete next step. No stack trace, no internal variable name, no regex jargon left
unexplained. All failures printed, then a single non-zero exit (D-09).

### E-4: The default echo (D-08)

```
default applied: product.description = "A rebrandable browser platform"
default applied: theia.default_theme = "dark"
default applied: urls.support = "https://powerbrowser.org/support"
```

stderr, one line per key, sorted by dotted path, printed on every run **including `--check`**.
Nothing is echoed for a key the downstream set. Keeping this on stderr leaves stdout free for
the single PASS line, which is the shape every registered `.mjs` gate already uses
`[VERIFIED: scripts/verify-registry-shape.mjs:284-288]` — `console.log` for the PASS summary,
`console.error` for every failure line.

### E-5: The registry rows to append (D-15)

Following the exact `"label|command"` form the registry documents
`[VERIFIED: scripts/verify-platform.sh:3468-3486]` — *"Each entry is `label|command`, where
command is either a bare argument-free shell function name or a plain `bash <path> [args]` /
`node <path> [args]` external invocation"*:

```bash
"generate-check|node $REPO_ROOT/scripts/generate.mjs --check"
"generate-self-test|node $REPO_ROOT/scripts/generate.mjs --self-test"
"generated-byte-identity|node $REPO_ROOT/scripts/verify-generated-identity.mjs"
"generated-byte-identity-self-test|node $REPO_ROOT/scripts/verify-generated-identity.mjs --self-test"
```

All four belong in the `--quick` array (no build, no browser, no display, no network). D-15 names
two rows; the two self-test siblings are required independently by CLAUDE.md §Verification
(*"Give a new check a `--self-test` that plants faults and requires each one to go red naming the
drift"*) and by the registry's own pattern — every `--quick` check in the array today has its
self-test registered beside it. Note the `--only <label>` contract: labels are the public
citation surface and must not be renamed later.

### E-6: The self-test template

`scripts/verify-registry-shape.mjs` is the model and should be read end to end before writing the
generator's self-test. Its structure, verbatim in shape
`[VERIFIED: scripts/verify-registry-shape.mjs:177-247]`:

1. Establish a **clean baseline** and bail if the unmodified tree is already red — *"the
   unmodified tree is already red, so the planted-fault results below would be meaningless"*.
2. For each planted fault, **assert the mutation actually landed** before running the check —
   *"A planted fault that does not change the source at all would make the case vacuous."*
3. Require the failure to **name** the planted drift, not merely to be non-empty —
   `if (!failures.some(f => f.includes(testCase.expect)))`.
4. Print `ok  <case> -> red, naming '<expect>'` per case and a counted PASS line at the end.

D-14 names five faults; two more are worth adding from the pitfalls above:

| # | Planted fault | Must go red naming |
|---|---------------|--------------------|
| 1 | `identity.vendor` key removed | `identity.vendor` |
| 2 | `identity.binary_name = "My Browser"` | `identity.binary_name` and the regex |
| 3 | unknown key `[identiy]` added | `identiy` |
| 4 | `identity.vendor = "   "` (whitespace only) | `identity.vendor` (D-10) |
| 5 | one byte changed in a `generated/` file | that file's path (staleness) |
| 6 | **partial** identity table (vendor set, `binary_name` absent) | `identity.binary_name` (Pitfall 4) |
| 7 | downstream array shorter than the default array | the resolved array is the short one (Pitfall 5) |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Node has no TOML support; every project ships a parser | Still true on Node 24 | — | `[VERIFIED: node v24.19.0 → util.parseTOML undefined, util.parseToml undefined, node:toml absent]`. Confirms CONTEXT D-13's premise; a dependency is unavoidable |
| `@iarna/toml` was the de facto Node TOML parser | `smol-toml` carries the ecosystem | ~2023 onward | `@iarna/toml` last modified 2023-07-15 and targets TOML **0.5**; `smol-toml` is at 34M downloads/week and tracks TOML 1.0.0 |
| TOML spec churn | TOML 1.0.0 frozen since Jan 2021 | 2021 | `[ASSUMED]` — from training knowledge, not verified this session. If true it makes vendoring low-maintenance: a frozen spec has no upgrade treadmill |

**Deprecated / outdated for this phase:**
- `@iarna/toml` — TOML 0.5, unmaintained; would silently reject valid 1.0.0 documents a downstream
  might reasonably write.
- Any deep-merge library as the merge implementation — array-concat default contradicts D-07 and
  none return the provenance D-08 requires.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | TOML 1.0.0 has been spec-frozen since January 2021, making the vendored parser low-maintenance | State of the Art | Low. If the spec moves, the vendored copy lags — but the manifest uses only the simplest constructs (tables, string/bool/int scalars, arrays, arrays-of-tables), all stable since TOML 0.4 |
| A2 | `smol-toml`'s SUS verdict is a false positive caused by the seam reading `publishedAt` (latest release) rather than package creation date | Package Legitimacy Audit | Medium. Mitigated by the recommended `checkpoint:human-verify` and by the recorded sha256 — the operator reviews 22,907 bytes of committed source rather than trusting a registry |
| A3 | The `.mozconfig` toolchain flags (lines 2–5, 8–9) should stay literal emitter text rather than becoming `[build]` config keys | Code Examples E-1 | Low, and cheap to reverse — promoting a literal to a config key later is additive. But it is a discretion call the planner should surface, not bury |
| A4 | No script in this repo installs the `.desktop` files to `~/.local/share/applications` | Runtime State Inventory | Low. Verified by absence of `xdg-desktop-menu`/`desktop-file-install` in `scripts/`; if the operator installed them by hand, the installed copy is stale until Phase 3/5 repoints consumers anyway |
| A5 | Vendoring a built bundle under `scripts/lib/` is acceptable despite `.gitignore`'s note that the directory holds "hand-written source, not build output" | Standard Stack | Low. That comment exists to explain why `theia/**/lib/` is anchored, not to state a policy about the directory's contents. Worth a one-line confirmation from the user if the planner wants certainty |
| A6 | `smol-toml@1.8.0` was discovered from training knowledge, then confirmed against the npm registry and by unpacking the tarball — **not** from official documentation or Context7 | Standard Stack | See A2. Registry existence alone is not proof of legitimacy; the sha256 + human checkpoint is what closes this |

## Open Questions (RESOLVED)

> Resolution note (plan-phase): Q1 vendoring → locked D-13 and plan 02-01; Q2 section list → `[theia]` section in plan 02-01; Q3 variant shape → `[[variants]]` in plan 02-01; Q4 `--check` leftover files → set-equality check in plan 02-04 Task 2.

1. **Should the plan re-raise the hand-written-subset-parser option with the user?**
   - What we know: D-13 locks in "exactly one TOML parser dependency". Vendoring satisfies it.
   - What's unclear: whether the user would prefer zero third-party bytes in the tree given the
     repo's strong zero-dependency culture, if they knew a full parser is ~50KB of source.
   - Recommendation: **do not re-open it.** D-13 is a locked decision, vendoring costs nothing at
     runtime, and hand-writing a TOML parser is the kind of work that looks small and is not.

2. **Does `configuration.toml` carry placeholder sections for `[telemetry]` / `[extensions]` /
   `[urls]` in Phase 2?**
   - What we know: PROJECT.md lists them among the planned sections; CONTEXT §Deferred says
     `[urls]` keys "may exist in the schema in Phase 2 but drive no output until Phase 4". D-12
     makes unknown keys a hard error, so any key not in the schema is rejected.
   - What's unclear: the exact section list is explicitly the planner's discretion.
   - Recommendation: include the sections needed to *demonstrate* CFG-04's default-and-echo
     behaviour (at minimum one cosmetic section with a defaultable key — `[theia] default_theme`
     is the natural one, since it is a real GEN-05 key with a real default). Adding empty
     placeholder sections that drive nothing and default nothing buys no coverage and costs
     schema entries.

3. **Two variant tables, or one table plus a variant list?**
   - What we know: CONTEXT lists this as discretion. Every emitter runs twice per generate.
   - Recommendation: `[[variants]]` array-of-tables with an `id` field, verified parseable this
     session (`parse` returns a JS array of objects). It makes the "run every emitter once per
     variant" loop fall out of the data, and it extends to a third variant without a schema
     change. But note it interacts with D-07's array-replace rule: a downstream declaring one
     variant *replaces* both of Power Browser's, which is probably the right semantics and should
     be stated in the plan rather than discovered.

4. **Does `--check` need to also assert `generated/` contains nothing beyond the target set?**
   - What we know: GEN-04 says "everything the generator writes lands under a single gitignored
     `generated/` root". A stale file left behind by a removed emitter would sit in `generated/`
     forever without failing anything.
   - Recommendation: yes, and it is two lines — `readdirSync` recursively and require set equality
     against the target paths. This is the same derive-and-compare discipline as the emitter-set
     assertion and closes the removal direction.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `node` (host, no dev shell) | `scripts/generate.mjs`, both new gates | ✓ | v24.19.0 | — |
| `npm` (host) | one-time `npm pack` to vendor the parser | ✓ | 11.17.0 | download the tarball directly from registry.npmjs.org |
| `git` | `scan-brand-residue.mjs` file set; repo-root ops | ✓ | in PATH | — |
| `yarn` (host) | **not needed** | ✗ | — | Not required: only `theia/` needs yarn, and the generator does not touch it. `CLAUDE.md` §Environment states `node` works outside a dev shell and `yarn` does not |
| `nix develop .#theia` (Node 22) | **not needed** | n/a | flake pins `nodejs_22` for the Theia shell `[VERIFIED: flake.nix:20]` | The generator runs on host `node` v24 like every other `.mjs` gate |
| Network | **not needed at run time** | n/a | — | Vendoring means no install step; `--quick` stays offline. Network is needed exactly once, by a human, to vendor the parser |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none material — `yarn`'s absence on the host is expected
and irrelevant to this phase.

## Validation Architecture

`workflow.nyquist_validation` is `true` `[VERIFIED: .planning/config.json]`, so this section is
required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | **None, by design.** This repo has no test runner — `git ls-files \| grep -Ei 'test\|spec\|vitest\|jest\|mocha'` returns only a planning doc. The convention is per-script `--self-test` fault planting, registered as rows in one driver |
| Config file | `scripts/verify-platform.sh` — the single registry `[VERIFIED: scripts/verify-platform.sh:3468-3486]` |
| Quick run command | `scripts/verify-platform.sh --quick` |
| Single-check command | `scripts/verify-platform.sh --only <label>` |
| Full suite command | `scripts/verify-platform.sh` |
| Gate command | `scripts/verify-platform.sh --gate` |

Adding a test here means **appending a row**, not adding a framework. Introducing vitest/jest for
this phase would violate CLAUDE.md §Verification's one-driver rule and is explicitly not
recommended.

### Phase Requirements → Test Map

| Req | Success criterion | Behavior under test | Test type | Automated command |
|-----|-------------------|---------------------|-----------|-------------------|
| GEN-04 / SC-1 | Generated output is byte-identical to the five Phase 1 files | emit to mkdtemp, byte-compare each target; set-equality on the target list | gate + self-test | `scripts/verify-platform.sh --only generated-byte-identity` |
| — | that gate discriminates | planted one-byte drift in each of the five emitters goes red naming the file | self-test | `scripts/verify-platform.sh --only generated-byte-identity-self-test` |
| CFG-02 / SC-2 | Missing identity or legal field hard-fails naming the key | faults 1, 4, 6 from §E-6 | self-test | `scripts/verify-platform.sh --only generate-self-test` |
| CFG-03 / SC-3 | Invalid basename rejected, never sanitized | fault 2 from §E-6; assert the message names both the key and the regex, and that **no output file was written** | self-test | `scripts/verify-platform.sh --only generate-self-test` |
| CFG-04 / SC-4 | Cosmetic defaults applied through one merge path, each echoed | two-layer merge over a synthetic downstream overlay in mkdtemp; assert one stderr line per defaulted key, sorted; assert nothing echoed for downstream-set keys; faults 5, 7 | self-test | `scripts/verify-platform.sh --only generate-self-test` |
| CFG-01 / SC-4 | Two-layer merge is exercised even though `PB_CONFIG_DIR` is Phase 7 | synthetic overlay fixture in mkdtemp — the merge code path has no Phase-2 production caller, so **the self-test is its only coverage** | self-test | `scripts/verify-platform.sh --only generate-self-test` |
| GEN-04 / SC-5 | `generated/` is gitignored and nothing under it is committed | `git check-ignore generated/` succeeds AND `git ls-files generated/` is empty | gate | fold into `verify-generated-identity.mjs` |
| GEN-04 / SC-5 | `--check` fails when output is stale | fault 5 from §E-6; plus absent-`generated/` produces its own distinct message | self-test | `scripts/verify-platform.sh --only generate-self-test` |
| GEN-04 | Generation is idempotent | `generate` then `generate --check` exits 0 | gate | `scripts/verify-platform.sh --only generate-check` (after a generate) |
| D-12 | Unknown key is a hard error naming the key | fault 3 from §E-6 | self-test | `scripts/verify-platform.sh --only generate-self-test` |
| CLAUDE.md | No brand residue in the new files | new files staged, then scanned | gate | `node scripts/scan-brand-residue.mjs` (existing row) |
| D-16 | `mark.svg` move did not break the preflight | existing gate, unchanged assertions, new path | gate | `scripts/verify-platform.sh --only branding-preflight` and `--only branding-preflight-self-test` |

### Sampling Rate

- **Per task commit:** `scripts/verify-platform.sh --quick` (seconds; no build, no browser, no
  network). CLAUDE.md names this the commit gate.
- **Per plan / wave merge:** `scripts/verify-platform.sh --quick` plus targeted `--only` runs of
  the four new rows.
- **Phase gate:** `scripts/verify-platform.sh --quick` fully green, and
  `scripts/verify-platform.sh --gate` if a built tree is available. **No `./mach build` is
  required by this phase** — D-01 keeps every build consumer on the hand-written files, so
  nothing this phase produces reaches the compiler. That is the single largest cost saving
  available here (a full build is 47–54 minutes per `CLAUDE.md` §Environment) and the plan should
  say so explicitly so nobody schedules one out of caution.

### Wave 0 Gaps

- [ ] `scripts/lib/toml.cjs` + `scripts/lib/toml.LICENSE` — vendored parser, gated behind a
      `checkpoint:human-verify` (sha256 `195ca51f…`)
- [ ] `configuration.toml` — must exist before any emitter can be exercised
- [ ] the schema table file — required by the unknown-key check, the masker and the validator, so
      it blocks all three
- [ ] four registry rows appended to `scripts/verify-platform.sh`
- [ ] `.gitignore` entry for `generated/`
- [ ] two `run:` steps in `.github/workflows/rebase-upstream.yml`. **Note:** that workflow
      currently contains **no** `verify-platform.sh` invocation at all — its only gate is
      `run: node scripts/scan-brand-residue.mjs` `[VERIFIED: .github/workflows/rebase-upstream.yml:69]`.
      D-15's "both also run in the workflow" therefore means adding new steps, not extending an
      existing verify step.
- No test framework install is needed. None should be added.

## Security Domain

`security_enforcement` is not set to `false`, so this section applies.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | The generator has no principals |
| V3 Session Management | no | No sessions |
| V4 Access Control | no | Local build tool; filesystem permissions are the boundary |
| **V5 Input Validation** | **yes** | `configuration.toml` is parsed and merged. Schema-driven allowlist (D-12 unknown-key rejection) is the control, applied **before** the merge. Plus `Object.create(null)` accumulators and explicit rejection of `__proto__` / `constructor` / `prototype` |
| V6 Cryptography | no | No crypto. The vendored parser's sha256 is a supply-chain provenance record, not a security control the generator enforces at run time |
| V12 File & Resource | **yes** | The generator writes files. Output paths come from the frozen `TARGETS` table, never from config values, so no config key can direct a write outside `generated/` |
| V14 Configuration | **yes** | Supply chain: exactly one vendored dependency, sha256-recorded, license-retained, no install scripts, human-checkpointed |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| **Prototype pollution via `[__proto__]` in a downstream config** | Tampering / EoP | **Demonstrated live this session** (Pitfall 3). Schema allowlist before merge; `Object.create(null)`; explicit dangerous-key rejection. Becomes a genuine trust boundary at CFG-05/Phase 7 when `PB_CONFIG_DIR` accepts an arbitrary external file |
| Path traversal via a config value reaching an output path | Tampering | Output paths come from the frozen `TARGETS` table only. **No config value may ever be joined into a write path.** Note that `branding_dir` and `objdir` *are* config values that appear in emitted *content* (the `.desktop` `Icon=`/`Exec=` lines) — that is text, not a write target, and must stay that way |
| Slopsquatted / typosquatted dependency | Spoofing | One dependency, vendored, sha256 recorded, `checkpoint:human-verify` before it lands. Vendoring removes the install-time execution vector entirely |
| Malicious `postinstall` | EoP | Non-issue by construction: nothing is installed. Verified anyway — `npm view smol-toml scripts` shows no `postinstall` |
| Denial of service via pathological TOML | DoS | Out of scope. Local build tool, operator-supplied input, no service exposure |

## Project Constraints (from CLAUDE.md)

Directives the planner must verify compliance against:

| # | Directive | Bearing on this phase |
|---|-----------|----------------------|
| 1 | Never fork or patch Theia core | Not engaged — the generator does not touch `theia/` |
| 2 | Never modify Gecko outside the patch stack | Not engaged in Phase 2 — D-01 means nothing generated reaches `upstream/`. `patches/010`'s `imply_option("MOZ_APP_VENDOR", "DeBIOS")` stays put until Phase 5 (MIG-05) |
| 3 | Design for the bridge | Not engaged |
| 4 | Repo path contains no space | Reinforced: the vendor split (`DeBIOS` vs `DeBIOS Foundation`) exists precisely to keep a space out of the profile path. The generator must not collapse the two vendor keys |
| 5 | Theia is the default GUI; stock chrome reachable | Not engaged |
| 6 | **No generator in Phase 1 — every branding value is a hand-written literal** | This is the phase that consumes that investment. The five hand-written files are the independent comparand; **do not edit any of them except the D-03 comment rewrite, and only after the check is green** |
| 7 | **The residual-brand scan is a permanent gate; it iterates `git ls-files`, so an unstaged new file is invisible** | Stage `configuration.toml`, `brand/mark.svg`, `scripts/generate.mjs`, `scripts/lib/toml.cjs`, and the schema table before trusting a green scan (Pitfall 8) |
| 8 | `inventory/brand-tokens.json` is the only file that may name the originating product | The generator source, `configuration.toml`, and the vendored parser must not. Vendored parser verified clean (0 hits) |
| 9 | Patches are regenerated, never text-edited | Not engaged |
| 10 | **One driver, one registry — adding a check is appending a row** | Four rows appended to `scripts/verify-platform.sh`. No `verify-generator.sh` sibling driver |
| 11 | **Never assert on the absence of a log line** unless the emitter is proven to be the code under test | Relevant to CFG-04's echo: asserting "nothing echoed for a downstream-set key" is an absence assertion. Pair it with a **presence** assertion in the same run (a defaulted key that *is* echoed), so the instrument is proven able to see an echo before its absence means anything |
| 12 | **Derive from the tree and compare; do not hand-keep an expectation list** | The byte-identity check derives its emitter set from `TARGETS` and compares as set equality; `--check` derives the on-disk set from `readdirSync` and compares as set equality. Both go red on addition *and* removal |
| 13 | Every new check gets a `--self-test` that plants faults and requires each to go red naming the drift | §E-6, seven fault cases |
| 14 | No internal identifier in user-facing text | D-11 applies to every generator error line. Pitfall 2 is the concrete trap |
| 15 | `node` works outside a dev shell; `yarn` does not | The generator and both gates use host `node` only |
| 16 | A full build is 47–54 min; use `--quick` first | This phase needs **no build at all** (D-01). Say so in the plan |

## Sources

### Primary (HIGH confidence)

- **This repository, read this session:** `.mozconfig:1-11`,
  `powerbrowser/branding/{dev,release}/configure.sh:1-8`,
  `powerbrowser/powerbrowser{,-release}.desktop:1-9`, `.gitattributes:1-9`, `.gitignore`,
  `LICENSE:1`, `flake.nix:15-44`, `.planning/config.json`,
  `scripts/verify-platform.sh:3468-3620,3755-3900`, `scripts/verify-registry-shape.mjs:1-300`,
  `scripts/verify-branding-preflight.mjs:192-233,323-347,462-490,620-660`,
  `scripts/scan-brand-residue.mjs:60-130,286-485,592-593`,
  `inventory/brand-tokens.json` (`scope`, `brand_display_expectations`, `hand_write`, `tokens`),
  `patches/010-powerbrowser-identity.patch:19-20`,
  `.github/workflows/rebase-upstream.yml:1-69`, `scripts/rebase-upstream.sh:100,151-152`,
  `docs/BUILD.md:295,454-455`, `.planning/PROJECT.md:63-108`, `.planning/REQUIREMENTS.md`,
  `.planning/ROADMAP.md:147-193`, `.planning/STATE.md:89`,
  `.planning/phases/01-platform-extraction-and-rename/01-LEARNINGS.md:25-56`
- **npm registry, queried this session:** `npm view smol-toml version time.created time.modified
  license repository.url scripts`; `npm view @iarna/toml`; `npm view @ltd/j-toml`;
  `api.npmjs.org/downloads/point/last-week/smol-toml`
- **`smol-toml@1.8.0` tarball, unpacked and executed this session:** dist layout, import graph,
  sha256, ESM interop, parse behaviour, duplicate-key and syntax-error shapes, `__proto__`
  handling, prototype-pollution demonstration
- **Node runtime, probed this session:** `node --version`; `util.parseTOML` / `util.parseToml` /
  `node:toml` absence

### Secondary (MEDIUM confidence)

- `gsd-tools query package-legitimacy check --ecosystem npm smol-toml @iarna/toml` — verdicts
  `SUS` (`too-new`) and `OK` respectively; the `too-new` signal is contradicted by
  `time.created` from the registry itself

### Tertiary (LOW confidence)

- TOML 1.0.0 spec-freeze date (A1) — training knowledge, not verified this session

## Metadata

**Confidence breakdown:**

| Area | Level | Reason |
|------|-------|--------|
| Byte-identity targets & their exact bytes | **HIGH** | All five files read verbatim with line numbers, sizes, and trailing-byte checks; `.gitattributes` line-ending policy confirmed |
| Registry integration | **HIGH** | Registry format, dispatch branches, and label contract read directly from `verify-platform.sh:3468-3486` and `:3790-3830` |
| TOML parser choice | **HIGH** on the technical facts (tarball unpacked, bundle executed, interop proven); **MEDIUM** on legitimacy (SUS verdict outstanding, mitigated by sha256 + human checkpoint) |
| Merge / validation design | **HIGH** — every decision is locked in CONTEXT; the ordering constraint is backed by a live prototype-pollution demonstration |
| Pitfalls | **HIGH** — 8 of 9 grounded in files read this session; Pitfall 3 reproduced experimentally |
| Identity values | **HIGH** — quoted verbatim from `inventory/brand-tokens.json`, cross-checked against `patches/010` |
| `.mozconfig` config-vs-constant split (A3) | **MEDIUM** — a judgement call flagged for the planner, not a verified fact |

**Research date:** 2026-09-01
**Valid until:** 2026-10-01 (30 days — the in-repo facts are stable; the only moving part is the
npm registry state of `smol-toml`, and vendoring freezes that at the recorded sha256)
</content>
</invoke>
