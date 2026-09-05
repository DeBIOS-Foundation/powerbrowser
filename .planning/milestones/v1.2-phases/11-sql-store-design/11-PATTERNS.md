# Phase 11: SQL Store Design - Pattern Map

**Mapped:** 2026-09-05
**Files analyzed:** 6 (5 design docs + 1 fixture/exercise scaffold)
**Analogs found:** 6 / 6

> Tracked-source gate: every analog path below was verified with
> `git ls-files` (non-empty = tracked). `upstream/toolkit/modules/Sqlite.sys.mjs`
> is **gitignored** (`.gitignore:20: upstream/`) — it is a fetched-tree source pin
> the planner may cite for API line numbers (already captured in 11-RESEARCH.md),
> but it is **not** a copy-pattern analog and no plan action may present it as one.
> All copy-patterns come from tracked files only.

## File Classification

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `authority/AUTHORITY.md` | doc (invariant table) | n/a (design-only) | `powerbrowser/INTERNAL-APIS.md` | exact |
| `authority/SIGN-OFF.md` | doc (review record) | n/a (design-only) | `brand/HUMAN-REVIEW.md` | exact |
| `schema/SCHEMA.md` | doc (schema/DDL) | n/a (design-only) | `docs/URI-SCHEMES.md` | role-match |
| `schema/MIGRATIONS.md` | doc (migration plan) | batch (forward-only chain) | `.planning/research/duckdb-vs-sqlite/03-INTEGRATION.md` + `scripts/verify-downstream-fixture.mjs` | role-match |
| `schema/SIGN-OFF.md` | doc (review record) | n/a (design-only) | `brand/HUMAN-REVIEW.md` | exact |
| `fixtures/tabs-vN.sqlite` + throwaway exercise script | test scaffold (fixture) | batch | `scripts/verify-downstream-fixture.mjs` + `.planning/milestones/v1.0-phases/07-sourcerer-as-downstream/fixtures/README.md` | role-match |

Plans `11-01-PLAN.md` / `11-02-PLAN.md` / `11-03-PLAN.md` are planner outputs,
not executor files — no analog needed.

## Pattern Assignments

### `authority/AUTHORITY.md` (doc, invariant table)

**Analog:** `powerbrowser/INTERNAL-APIS.md`

Copy the catalogue-doc shape: a table where one row = one invariant + why,
a "deliberately not touched" section for the negative invariants, and a
consistency section naming the mechanical enforcement.

**Table pattern** (`powerbrowser/INTERNAL-APIS.md` lines 18-20):
```markdown
## Touchpoints

| Internal | File:Line | `PowerBrowserAPI` Method | Purpose | Threat Notes |
|---|---|---|---|---|
| `resource://gre/modules/Subprocess.sys.mjs` + `resource://gre/modules/ctypes.sys.mjs` (`ChromeUtils.defineESModuleGetters`) | `PowerBrowserAPI.sys.mjs:15` | *(module-level lazy import, backs `spawnProcess`/`pathSearch` and, since Phase 5, `signalBarePid`)* | Lazy-imports Firefox's `Subprocess` module ... | **Process-spawn row.** ... |
```

Adapt columns to invariants: `| # | Invariant | Enforced where (Phase 12) | Why / threat if violated |`.
AUTHORITY.md needs 6 rows per RESEARCH §Recommended Plan Decomposition:
single chrome writer; sessionstore restore authority; registry-URI join key;
backend-never-opens-profile-SQLite; own-file rule; token-never-in-SQL
(ASVS V3 adjacent, RESEARCH §Security Domain).

**Negative-invariant pattern** (`powerbrowser/INTERNAL-APIS.md` lines 50-54):
```markdown
## Deliberately not touched

| Internal | Reason |
|---|---|
| Firefox's session store (`sessionstore.jsonlz4`, `SessionStore.sys.mjs`) | **D-107:** Phase 4 introduces no persistence of its own ... **D-108:** naming it here, un-touched, keeps the storage ground clean ... |
```

AUTHORITY.md's sessionstore-authoritative and backend-never-opens rows follow
this voice: name the untouched thing, give the decision ID, state what stays clean.

**Consistency pattern** (`powerbrowser/INTERNAL-APIS.md` lines 56-65):
```markdown
## Consistency

Enforced by `scripts/check-internals-boundary.sh --catalogue`, run as the
`internals-catalogue` check in `verify-platform.sh`'s `--quick` set.
...
```

AUTHORITY.md ends with the same: each invariant names its Phase 12 enforcement
(single-writer negative scan, roundtrip gate, absence test) so the doc and the
future gates cannot drift apart.

---

### `authority/SIGN-OFF.md` and `schema/SIGN-OFF.md` (doc, review record)

**Analog:** `brand/HUMAN-REVIEW.md`

Copy the sign-off ritual shape: STATUS header, procedure, reviewed-files table,
evidence basis, dated sign-off. Both SIGN-OFF.md files share this structure;
only the table contents differ (AUTHORITY.md rows vs SCHEMA.md/MIGRATIONS.md rows).

**Status + procedure pattern** (`brand/HUMAN-REVIEW.md` lines 1-13):
```markdown
# Brand human review record (06-03)

STATUS: SIGNED — the human review ritual below was performed and signed
2026-09-04 (see Confirmations recorded). The mechanical gate
(`scripts/verify-trademark-surface.mjs`, review-agreement section) proves
the file list on disk still equals the list recorded here; it does not
re-prove the human judgment. ...
## Procedure

For every file listed under `brand/` (derived by listing the directory at
review time — currently `brand/mark.svg` only; see the table):
```

Adaptation: STATUS line (`DRAFT — awaiting review` → `SIGNED — <name> <date>`);
procedure lists the review checklist per doc (e.g. "read each invariant row,
confirm each names its enforcement, confirm no brand token, no internal
identifier in user-facing prose"); in autonomous nonstop mode the signature is
a recorded approval with checklist per 11-VALIDATION.md line 60, not a live
human signature.

**Table + sign-off pattern** (`brand/HUMAN-REVIEW.md` lines 38-43, 72-78):
```markdown
## Reviewed files

| File | Reviewer | Date | Verdict |
| ---- | -------- | ---- | ------- |
| `brand/mark.svg` | Chris | 2026-09-04 | CONFIRMED |
| `brand/HUMAN-REVIEW.md` | Chris | 2026-09-04 | RECORD |
...
## Sign-off 2026-09-04 (Chris)

- Opened `brand/mark.svg` and judged it by inspection: ... Verdict: CONFIRMED.
```

**Evidence-basis pattern** (`brand/HUMAN-REVIEW.md` lines 45-62): the
"Primary-source basis" section records LOW-confidence inputs re-checked against
primary texts verbatim. SIGN-OFF.md files mirror this: record the [ASSUMED]
items from RESEARCH (private-window symbol A1, Places APIs A2, better-sqlite3
shape A3, UPSERT A5) as pinned-or-deferred with the in-tree pinning procedure,
so the signature covers known uncertainty explicitly.

---

### `schema/SCHEMA.md` (doc, schema/DDL)

**Analog:** `docs/URI-SCHEMES.md`

Copy the design-doc voice: canonical-form rule stated once up front, vocabulary
borrowed (never invented), coverage boundary naming what is excluded and why it
costs nothing later.

**Canonical-rule pattern** (`docs/URI-SCHEMES.md` lines 16-30):
```markdown
## General rules

- **Canonical printed form is the opaque `scheme:path`** — never
  `scheme://authority`. A URI's authority component is lower-cased on
  serialization, and Theia's own widget ids are not uniformly lowercase, so
  the authority form would silently fork two spellings of one address into
  two widgets. ...
- **Parsing is lenient, emission is canonical.** `scheme:x`, `scheme:/x`,
  `scheme:///x` and `scheme://x` all parse to the identical name. ...
```

SCHEMA.md's header mirrors this: URI TEXT PRIMARY KEY in opaque `scheme:path`
form (never `scheme://authority`), chrome binds the string as a parameter and
never parses it. The join-key semantics being documented live in the tracked
analog `theia/extensions/tab-uris/src/browser/tab-uri-registry.ts` lines 82-96:
```typescript
    /**
     * Parses `scheme:x`, `scheme:/x`, `scheme:///x` and `scheme://x` to the
     * identical name (D-39/D-40). Reads `uri.authority` directly (never
     * `uri.toString()`): the authority form lower-cases its authority only
     * on *serialization*, and Theia's widget ids are not uniformly
     * lowercase, so two typeable spellings of one address would otherwise
     * fork into two widgets.
     */
    parseName(uri: URI): string {
        if (uri.authority) {
            return uri.authority;
        }
        const raw = uri.path.toString();
        return raw.startsWith('/') ? raw.slice(1) : raw;
    }
```
And the frozen-contract header the design must not disturb
(`tab-uri-registry.ts` lines 16-19):
```typescript
 * The `factoryId <-> URI` registry (D-38). Its exported shape is the
 * public interface `@powerbrowser/browser-bridge` consumes post-4.0 -- treat
 * it as an API, not an implementation detail.
```

**Coverage-boundary pattern** (`docs/URI-SCHEMES.md` lines 62-80): an
"Excluded from this phase, and addressable later at zero design cost" section.
SCHEMA.md uses it for: no FTS index in v1 (RESEARCH Open Question 3), minimal
columns per YAGNI (every column names its Phase 12 consumer), no private column
at all (exclusion total — RESEARCH Pitfall 5), fixed `tabs.sqlite` filename +
`user_version` as platform content (not manifest keys).

**DDL source pins:** the DDL sketch cites the pinned-tree primitives collected
in RESEARCH (openConnection ProfD-relative, `get/setSchemaVersion`,
`executeTransaction`, bound params) — cite as source pins, not copy-patterns,
per the tracked-source gate note at the top of this file.

---

### `schema/MIGRATIONS.md` (doc, migration plan)

**Analogs:** `.planning/research/duckdb-vs-sqlite/03-INTEGRATION.md` (migration mechanics, tracked) + `scripts/verify-downstream-fixture.mjs` (fixture-exercise discipline, tracked)

**Migration-mechanics pattern** — the doc states the forward-only chain as
procedure, not code: `user_version = 1` at creation, numbered idempotent
migrations applied in order inside one transaction each, `tableExists`
pre-checks, never downgrades. The normative mechanics live in the tracked
research doc `.planning/research/duckdb-vs-sqlite/03-INTEGRATION.md`
(grep-verified tracked); the planner lifts the procedure from RESEARCH §Pattern 2
and the corruption procedure from RESEARCH §Pattern 3 (exact-`['ok']` keying,
`backupToFile` → `.corrupt-N` → rebuild from sessionstore, never delete).

**Fixture-exercise pattern** (`scripts/verify-downstream-fixture.mjs` lines 14-18,
20-35):
```javascript
// CONTRACT. --source <committed-fixture-dir> [--expect-fail <substring>];
// --all --fixtures-root <dir> drives every committed fixture ...
// Per fixture the
// harness copies the source to a mkdtemp external dir (path-independence --
// never generates from inside the repo), snapshots the platform generated/
// tree hashes, then runs env PB_CONFIG_DIR=<stage> node scripts/generate.mjs
// in a child process.
//
// EXPECTED-PASS: exit 0; expectations derived at check time through the
// imported resolveConfig (platform manifest as defaults, staged manifest as
// downstream -- the same call main() makes), never kept here (T-07-02); ...
```

MIGRATIONS.md's exercise log follows this discipline point for point:
committed fixture DBs (`fixtures/tabs-v1.sqlite`, …); the throwaway script
copies fixtures to a mktemp dir and mutates only the copies (never the
fixtures); expectations derived at run time (final `user_version`,
`integrity_check = ['ok']`, row preservation, index presence); the script is
test scaffolding, not store code and not a registry row (per RESEARCH
§Validation Architecture). Space-free staging paths per CLAUDE.md rule 4
(cf. `fixtures/README.md` line 11-14: "the stage lives outside the repo at a
space-free path").

**Quarantine precedent:** places' `.corrupt`-rename-and-rebuild loop is the
cited prior art (RESEARCH §Pattern 3 / Pitfall record) — MIGRATIONS.md states
the procedure (copy/quarantine → remove sidecar state → rebuild live rows from
sessionstore + registry → degraded mode) as steps with the exact-`['ok']`
tripwire, `quick_check` per launch with full `integrity_check` on
schedule/suspicion at planner's discretion.

---

### `fixtures/tabs-vN.sqlite` + throwaway exercise script (test scaffold, batch)

**Analogs:** `scripts/verify-downstream-fixture.mjs` (tracked, 788 lines) + `.planning/milestones/v1.0-phases/07-sourcerer-as-downstream/fixtures/README.md` (tracked)

**Harness-imports pattern** (`scripts/verify-downstream-fixture.mjs` lines 61-76):
```javascript
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveConfig } from './generate.mjs';
import { findMatches } from './scan-brand-residue.mjs';
```

The throwaway exercise script copies this import block shape: `mkdtempSync` +
`tmpdir` for staging, `cpSync` for fixture copies, `execFileSync` if it shells
out, `createHash` if it snapshots. better-sqlite3 read-write opens point at
the staged copies only.

**Fixture-doc pattern** (`fixtures/README.md` lines 1-16): every drill states
UNEXECUTED-vs-executed status, shared conventions (stage outside repo,
space-free, restore neutrality), and cost. MIGRATIONS.md's exercise log
mirrors this: per-version drive recorded with pass/fail, ending state
(fixture files untouched — the script mutated copies), so a reviewer can
re-run verbatim.

**Non-vacuity + self-test obligation:** per CLAUDE.md verification rule 2 and
the `verify-registry-shape.mjs` precedent (lines 175-250 `selfTest()` planting
addition + removal in both directions), any assertion the exercise script makes
must be shown able to fail — at minimum the log records a control (e.g. run
against a deliberately stale `user_version` and show the chain advancing it,
run `integrity_check` against a clean copy showing exactly `['ok']`).
Promoting the script to a registry row is explicitly Phase 12's decision
(RESEARCH §Validation Architecture), not this phase's.

---

## Shared Patterns

### Boundary-write shape (applies to: AUTHORITY.md writer invariant, SCHEMA.md enforcement column, MIGRATIONS.md writer-side filter)

**Source:** `powerbrowser/shell/PowerBrowserAPI.sys.mjs` (tracked)

Lazy-import block, the only legal shape for a new Gecko-module import
(lines 14-24):
```javascript
const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  Subprocess: "resource://gre/modules/Subprocess.sys.mjs",
  ctypes: "resource://gre/modules/ctypes.sys.mjs",
  // D-119 (05-03): MOZ_APP_VERSION_DISPLAY is a build-time preprocessor
  // substitution (config/version_display.txt), not a runtime API -- but
  // AppConstants is on the boundary guard's own forbidden-pattern list
  // (FORBIDDEN_PATTERNS), so it is reached here, in the one lazy-getter
  // block, rather than imported anywhere else.
  AppConstants: "resource://gre/modules/AppConstants.sys.mjs",
});
```
Phase 12's `Sqlite` import lands in this same block; AUTHORITY.md states that
placement as part of the single-writer invariant (guard excludes the boundary
file by basename — `scripts/check-internals-boundary.sh` line 31
`BOUNDARY_FILE_BASENAME="PowerBrowserAPI.sys.mjs"` — so `FORBIDDEN_PATTERNS`
needs zero changes).

Never-throw accessor convention (lines 36-42, 69-75):
```javascript
  getStringPref(name, fallback) {
    try {
      return Services.prefs.getStringPref(name, fallback);
    } catch {
      return fallback;
    }
  },
...
  getProfileDir() {
    try {
      return Services.dirsvc.get("ProfD", Ci.nsIFile).path;
    } catch {
      return "";
    }
  },
```
New writer wrappers follow the same never-throw shape; catalogue gains 2–4 rows
of the existing shape (cf. `powerbrowser/INTERNAL-APIS.md` line 27, the
`getProfileDir` state-file-scoping row — the closest single-row analog for a
future `openTabStore` row).

### Catalogue-row discipline (applies to: AUTHORITY.md consistency section)

**Source:** `powerbrowser/INTERNAL-APIS.md` lines 3-13 + `scripts/check-internals-boundary.sh` lines 30-65

One row = one touchpoint + why; the doc is derived from the guard's
`FORBIDDEN_PATTERNS`, not maintained beside it; `--catalogue` fails naming the
uncatalogued `file:line`. AUTHORITY.md's consistency section promises the same
for Phase 12: new writer methods get one catalogue row each, and the design adds
zero catalogue rows itself (design-only, holds by construction — asserted in
11-03, not assumed).

### Registry-row discipline (applies to: 11-03 gate assertions)

**Source:** `scripts/verify-platform.sh` lines 3649-3651, 3660-3667 (tracked, 4619 lines total)

```bash
    "internals-boundary-self-test|bash $REPO_ROOT/scripts/check-internals-boundary.sh --self-test"
    "internals-boundary|bash $REPO_ROOT/scripts/check-internals-boundary.sh"
    "internals-catalogue|bash $REPO_ROOT/scripts/check-internals-boundary.sh --catalogue"
...
    # NEW (01-06): GUI-04's bridge-contract assertion. Reads the TypeScript
    # sources, never a compiled artifact, so it is honestly --quick: no build,
    # no browser, no display, no network. The self-test is registered
    # alongside it for the same reason every other self-test in this registry
    # is -- a shape comparison that can only go green is not a check, and
    # 01-05 shipped two assertions resting on a non-discriminating instrument
    # before that was caught.
    "gui04-registry-shape|node $REPO_ROOT/scripts/verify-registry-shape.mjs"
```

Phase 11 adds **no** registry rows (any Phase 12 gate — second-writer scan,
integrity soak, roundtrip, absence test — is *specified* in the design docs as
future registry rows with `--self-test`, never sibling drivers, per CLAUDE.md
"one driver, one registry"). The 11-03 gate asserts `--quick` green by
construction plus the explicit negative assertions (no DuckDB surface, no
`[features]`/`[sql]` key, no GUI surface, no registry-shape change, no new
catalogue rows).

### Derive-and-compare, never hand-kept lists (applies to: exercise script, any specified future check)

**Source:** `scripts/verify-registry-shape.mjs` lines 55-71, 118-126, 179-250

```javascript
const EXPECTED = Object.freeze({
    [REGISTRY_TS]: Object.freeze(['TabUriRegistry']),
    [TABLE_TS]: Object.freeze([
        'ViewFactoryTableRow',
        'POWERBROWSER_VIEW_FACTORY_IDS',
        'SETTINGS_WIDGET_FACTORY_ID',
        'PLUGIN_VIEW_CONTAINER_FACTORY_ID',
    ]),
});
...
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
The one hand-kept list is the declared expectation; the actual is always derived
at check time; set equality discriminates surplus AND missing; `--self-test`
plants faults in both directions. The fixture-exercise script derives its
expectations at run time the same way; any Phase 12 check the design specifies
must carry the same `--self-test` discipline.

### Residual-brand + no-internals-in-prose (applies to: all five docs)

**Source:** `CLAUDE.md` residual-brand gate + `scripts/scan-brand-residue.mjs` (tracked)

- New docs must never spell the originating-product token (only
  `inventory/brand-tokens.json` may name it); "upstream"/"originating product"
  prose is fine (RESEARCH Pitfall 7).
- **Stage new files before trusting a green scan** — the scan iterates
  `git ls-files`, unstaged files are invisible (CLAUDE.md lines 96-102).
- DISCUSS-phase lineage: `docs/URI-SCHEMES.md` demonstrates token-free design
  prose over 302 lines — the voice to copy.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| *(none)* | — | — | Every Phase 11 deliverable has a tracked analog above. The only gap is the SQLite engine primitives themselves (`openConnection`, `get/setSchemaVersion`, `executeTransaction`, `backupToFile`), which exist solely in the gitignored `upstream/` fetch — the planner uses the RESEARCH §Code Examples skeletons + cited line pins instead of a codebase copy-pattern. |

## Metadata

**Analog search scope:** `powerbrowser/`, `scripts/`, `theia/extensions/tab-uris/src/browser/`, `docs/`, `brand/`, `.planning/research/`, `.planning/milestones/v1.0-phases/07-sourcerer-as-downstream/fixtures/`, `.planning/phases/10-sign-off-closeout/`
**Files scanned:** ~15 (7 read in full: INTERNAL-APIS.md, PowerBrowserAPI.sys.mjs, verify-registry-shape.mjs, tab-uri-registry.ts, URI-SCHEMES.md (head), check-internals-boundary.sh (head), verify-downstream-fixture.mjs (head); registry + fixture README + HUMAN-REVIEW.md + 11-VALIDATION.md in full; remainder via grep)
**Project skills:** none — `.claude/skills/` and `.agents/skills/` do not exist
**Pattern extraction date:** 2026-09-05
**Prior phase pattern maps consulted for existence only:** `.planning/phases/10-sign-off-closeout/10-PATTERNS.md` (sign-off-phase precedent, not re-read for excerpts)
