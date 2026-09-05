# Phase 12: sql-store-build - Pattern Map

**Mapped:** 2026-09-05
**Files analyzed:** 12 (5 new chrome/Theia source, 2 modified source, 4 new gates, 1 modified registry)
**Analogs found:** 10 / 12

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `powerbrowser/shell/PowerBrowserAPI.sys.mjs` (modify: writer wrappers + lazy imports) | boundary/controller | CRUD | itself (`powerbrowser/shell/PowerBrowserAPI.sys.mjs:14-24, 36-42, 477-479`) | exact |
| `powerbrowser/shell/TabStore.sys.mjs` (new, optional writer helper) | service | CRUD | `powerbrowser/shell/TheiaService.sys.mjs:16` (consumer import) + boundary method conventions | role-match |
| `powerbrowser/shell/jar.mn` (modify: +1 content line) | config | n/a (packaging) | itself (`powerbrowser/shell/jar.mn:11-17`) | exact |
| `powerbrowser/INTERNAL-APIS.md` (modify: new catalogue rows) | config/docs | n/a | itself (touchpoint table) + `scripts/check-internals-boundary.sh:199-230` catalogue mechanics | exact |
| `theia/extensions/tab-uris/src/node/tab-query-backend-module.ts` (new) | provider | request-response | `theia/extensions/token-gate/src/node/token-gate-backend-module.ts` | exact |
| `theia/extensions/tab-uris/src/node/tab-query-service.ts` (new, beside-registry query service) | service | request-response | `theia/extensions/tab-uris/src/browser/tab-uri-registry.ts:90-96, 123-131` (emission semantics, beside-not-on) | role-match |
| `theia/extensions/tab-uris/package.json` (modify: +backend entry) | config | n/a | `theia/extensions/token-gate/package.json:9-13` | exact |
| `scripts/verify-sql-store-second-writer.mjs` (new, --quick) | test/gate | batch (tree scan) | `scripts/check-internals-boundary.sh:92-147` (scan) + `:239-264` (self-test) | exact |
| `scripts/verify-sql-store-soak.mjs` (new, split quick/full) | test/gate | batch | `scripts/verify-registry-shape.mjs:131-166` (derive-and-compare) + `:179-250` (self-test) | role-match |
| `scripts/verify-sql-store-roundtrip.mjs` (new, full-tier) | test/gate | batch | `scripts/verify-platform.sh:4209-4222` (full-tier placement) + registry-shape self-test idiom | partial |
| `scripts/verify-sql-store-absence.mjs` (new, full-tier) | test/gate | event-driven | same as roundtrip; emitter-exercising shape has no in-tree precedent | partial |
| `scripts/verify-platform.sh` (modify: 8 new rows) | config | n/a | itself (`scripts/verify-platform.sh:3667-3668`, `:4209-4210`) | exact |

## Pattern Assignments

### `powerbrowser/shell/PowerBrowserAPI.sys.mjs` (modify — boundary/controller, CRUD)

**Analog:** itself — the file IS the pattern. New Gecko modules land only in the lazy-getter block; new behavior lands as thin named wrappers on the frozen `PowerBrowserAPI` object.

**Imports pattern** (lines 14-24) — the ONLY legal import shape for a new Gecko module:
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
Phase 12 appends `Sqlite: "resource://gre/modules/Sqlite.sys.mjs"` (+ `PrivateBrowsingUtils`, `SessionStore`, `PlacesUtils` as needed) to this same block. The guard excludes this file by basename (`BOUNDARY_FILE_BASENAME="PowerBrowserAPI.sys.mjs"`, `scripts/check-internals-boundary.sh:31`), so `FORBIDDEN_PATTERNS` needs zero changes.

**Core wrapper pattern** (lines 36-42) — thin named method, never-throw read convention:
```javascript
getStringPref(name, fallback) {
  try {
    return Services.prefs.getStringPref(name, fallback);
  } catch {
    return fallback;
  }
},
```
Writer wrappers (`openTabStore`/`writeTabRow`/`removeTabRow`/`readTabRows`/prune-class names at planner's discretion) copy this: one method per touchpoint, D-comment header naming the decision, no policy beyond the call. Write-path failures that must be loud (constraint violations, downgrade refusal) throw with a `method-name: detail` message per the `setSessionCookie` precedent (lines 178-182).

**Window-lookup pattern** (lines 477-479) — `Services.wm` reach-through for trigger attachment:
```javascript
findShellWindow() {
  return Services.wm.getMostRecentWindow("powerbrowser:main");
},
```
Per-window tab-listener enumeration (`Services.wm.getEnumerator("navigator:browser")`) lives in a wrapper here, same shape. Each new touchpoint line (`Sqlite` import, `PrivateBrowsingUtils` line, `SessionStore`/`PlacesUtils` lines, `Services.wm`/`Services.obs` lines if newly touched) gains one `INTERNAL-APIS.md` catalogue row — `--catalogue` derives occurrences from the code and fails naming any uncatalogued `file:line` (`scripts/check-internals-boundary.sh:199-230`).

---

### `powerbrowser/shell/TabStore.sys.mjs` (new, optional — service, CRUD)

**Analog:** `powerbrowser/shell/TheiaService.sys.mjs:6-16` — the consumer discipline plus the single permitted import line.

**Consumer pattern** (lines 6-16):
```javascript
/*
 * D-96: TheiaService is a *consumer* of the PowerBrowserAPI boundary, not a
 * second one -- it imports nothing else. Supervises the Theia backend
 ...
 */

const { PowerBrowserAPI } = ChromeUtils.importESModule("chrome://powerbrowser/content/PowerBrowserAPI.sys.mjs");
```
If the planner splits a writer helper out of the boundary file, it MUST follow this: import nothing but `PowerBrowserAPI` (the boundary guard scans this dir minus `PowerBrowserAPI.sys.mjs` — any `Services.`/`lazy.Sqlite`/direct `ChromeUtils.defineESModuleGetters` line in the helper fails the guard). Planner's choice: helper module vs. all-in-boundary. All-in-boundary needs no `jar.mn` change; a helper needs the `jar.mn` row below.

---

### `powerbrowser/shell/jar.mn` (modify — config, packaging)

**Analog:** itself, lines 11-17.

**Content-line pattern** (lines 11-17):
```
browser.jar:
%  content powerbrowser %content/powerbrowser/
   content/powerbrowser/powerbrowser.xhtml         (powerbrowser.xhtml)
   content/powerbrowser/powerbrowser.js            (powerbrowser.js)
   content/powerbrowser/powerbrowser.css           (powerbrowser.css)
   content/powerbrowser/PowerBrowserAPI.sys.mjs    (PowerBrowserAPI.sys.mjs)
   content/powerbrowser/TheiaService.sys.mjs    (TheiaService.sys.mjs)
```
A new `TabStore.sys.mjs` adds one `content/powerbrowser/TabStore.sys.mjs    (TabStore.sys.mjs)` line, same alignment grain. This-tree packaging only — no patch regeneration (patch 020 is one `DIRS` line; `XPCOM_MANIFESTS` registration is forbidden — it forces a tier-3 `./mach build`, `powerbrowser/shell/moz.build:25-31`). Plain ES module imported by `chrome://` URL stays on the fast preprocessing tier.

---

### `powerbrowser/INTERNAL-APIS.md` (modify — config/docs)

**Analog:** itself — one row = one touchpoint + why, derived-from-code discipline.

**Row pattern** (`powerbrowser/INTERNAL-APIS.md:22`, abbreviated):
```
| `resource://gre/modules/Subprocess.sys.mjs` + ... (`ChromeUtils.defineESModuleGetters`) | `PowerBrowserAPI.sys.mjs:15` | *(module-level lazy import, backs ...)* | Lazy-imports ... | **Process-spawn row.** ... |
```
New writer rows name the internal, the exact `PowerBrowserAPI.sys.mjs:<line>`, the backing method, purpose, and threat note. The `file:line` is load-bearing: `check_catalogue_consistency` greps `${basename}:${line}([^0-9]|$)` (`scripts/check-internals-boundary.sh:218`) — a wrong line number fails exactly like a missing row. Also note the `## Deliberately not touched` section (`INTERNAL-APIS.md:50-54`): Phase 12 amends the SessionStore row there if the writer touches `SessionStore.sys.mjs` (D-107/D-108 named it un-touched; touching it without amending is doc drift).

---

### `theia/extensions/tab-uris/src/node/tab-query-backend-module.ts` (new — provider, request-response)

**Analog:** `theia/extensions/token-gate/src/node/token-gate-backend-module.ts` (whole file, 12 lines).

**ContainerModule pattern** (lines 1-12):
```typescript
import { ContainerModule } from '@theia/core/shared/inversify';
import { BackendApplicationContribution } from '@theia/core/lib/node';
import { PowerBrowserTokenGateContribution } from './token-gate-backend-contribution';
import { PowerBrowserParentWatchdogContribution } from './parent-watchdog-backend-contribution';

export default new ContainerModule(bind => {
    bind(PowerBrowserTokenGateContribution).toSelf().inSingletonScope();
    bind(BackendApplicationContribution).toService(PowerBrowserTokenGateContribution);

    bind(PowerBrowserParentWatchdogContribution).toSelf().inSingletonScope();
    bind(BackendApplicationContribution).toService(PowerBrowserParentWatchdogContribution);
});
```
Copy verbatim shape: `import { ContainerModule } from '@theia/core/shared/inversify'`, `export default new ContainerModule(bind => { bind(X).toSelf().inSingletonScope(); ... })`. If the query surface is a plain injectable service (no HTTP route), bind `toSelf().inSingletonScope()` and skip the `BackendApplicationContribution` line; if it serves an HTTP route, copy the `toService(BackendApplicationContribution)` second line and the `configure(app)` shape from `token-gate-backend-contribution.ts:76-80` (`app.get('/powerbrowser/health', ...)` — route registered in `configure()` runs after early middleware, so gating applies for free). Single readonly `better-sqlite3` handle held by the service, opened lazily with missing-file catch (Pitfall 3 — no in-tree analog, RESEARCH §Pattern 3 skeleton is the source).

---

### `theia/extensions/tab-uris/src/node/tab-query-service.ts` (new — service, request-response)

**Analog:** `theia/extensions/tab-uris/src/browser/tab-uri-registry.ts:90-96` (emission semantics) + frozen-shape constraint.

**Emission-semantics pattern** (lines 90-96) — WHY the PK must be the opaque form:
```typescript
parseName(uri: URI): string {
    if (uri.authority) {
        return uri.authority;
    }
    const raw = uri.path.toString();
    return raw.startsWith('/') ? raw.slice(1) : raw;
}
```
With header comment (lines 82-89): reads `uri.authority` directly, never `toString()`, because the authority form lower-cases on serialization while widget ids are not uniformly lowercase. Chrome binds the `uriOf` emission string as an opaque TEXT parameter and never parses it. The query service lives BESIDE `TabUriRegistry` (new file, new binding in the node module) — never as new public members on the class, or `gui04-registry-shape` set-equality fails on surplus. For the `ContainerModule` binding-block idiom with comments explaining each binding's ordering hazard, copy `theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts:30-39` (`export default new ContainerModule((bind, _unbind, isBound, rebind) => {...})` with `bind(X).toSelf().inSingletonScope()` per service).

---

### `theia/extensions/tab-uris/package.json` (modify — config)

**Analog:** `theia/extensions/token-gate/package.json:9-13`.

**Backend-entry pattern** (lines 9-13):
```json
"theiaExtensions": [
  {
    "backend": "lib/node/token-gate-backend-module"
  }
]
```
Phase 12 appends a second entry `{"backend": "lib/node/tab-query-backend-module"}` to tab-uris' `theiaExtensions` array (which currently holds only `{"frontend": "lib/browser/tab-uris-frontend-module"}`), same shape. The browser app already depends on `@powerbrowser/tab-uris: 0.1.0`, so no app-file edit and no core patch. `better-sqlite3@13.0.3` lands in tab-uris' `dependencies` (exact pin; install ONLY inside `nix develop .#theia`, never host `yarn` — CLAUDE.md Environment).

---

### `scripts/verify-sql-store-second-writer.mjs` (new, --quick — test/gate, batch)

**Analog:** `scripts/check-internals-boundary.sh:92-147` (tree-walking negative scan) + `:239-264` (mktemp self-test).

**Scan pattern** (lines 92-147, shape): `scan_internals_boundary()` walks a bounded dir set with `find <dir> -type f \( -name ... \) -print0`, skips comment lines (`is_comment_line`, lines 78-85: first-non-whitespace `//` or `*`), matches each `FORBIDDEN_PATTERNS` entry per line, prints one `path:line: pattern` row per offense to stderr, returns 1 on any offense — INCLUDING the non-vacuity case (empty scan set fails distinctly, lines 111-114: "an empty file set is not a clean boundary"). Gate 1 copies this exactly: walk this repo's own trees (`powerbrowser/`, `theia/`, `scripts/`, `patches/` — NOT `upstream/`), match profile-DB open shapes (`openConnection`, `Services.storage`, `new Database`, `openDatabase`), fail naming `file:line` unless allowlisted: (a) inside `powerbrowser/shell/`, or (b) the single backend reader call carrying `readonly:true` (derive-and-compare: every `new Database(` in `theia/` must carry the flag).

**Self-test pattern** (lines 239-264, shape): plant exactly one offending fixture in `mktemp -d` (never a real repo file), assert the scan rejects it AND names the planted path; `trap 'find "$tmp" -delete' RETURN` for cleanup. Gate 1 plants an offending open (must go red naming it) and strips the readonly flag (must go red).

---

### `scripts/verify-sql-store-soak.mjs` / `-roundtrip.mjs` / `-absence.mjs` (new — test/gate, batch)

**Analog:** `scripts/verify-registry-shape.mjs:131-166` (derive-and-compare) + `:179-250` (both-directions self-test) for instrument design; `scripts/verify-platform.sh:4209-4210` for tier placement.

**Derive-and-compare pattern** (lines 131-166): `checkShape()` derives the ACTUAL set from the tree at check time, compares against EXPECTED as set equality via `diff()` reporting `surplus` (addition) and `missing` (removal) BY NAME (lines 119-126), with a non-vacuity guard (lines 139-142: zero derived exports fails as "broken instrument, not clean"). Applies to soak (fixture DB `integrity_check` result must be exactly `['ok']`; tampered copy trips) and roundtrip (restored set vs sessionstore set compared as equality — surplus names the extra URI, missing names the lost one).

**Both-directions self-test pattern** (lines 179-250): `selfTest()` asserts the unmodified tree green FIRST (lines 180-186 — planted-fault results meaningless otherwise), then runs ≥2 planted cases in opposite directions (addition + removal), each asserting (a) the mutation actually landed (`testCase.sources[file] !== clean[file]`, lines 231-235 — a no-op plant that "passes" is vacuous) and (b) the failure names the planted token (`failures.some(f => f.includes(testCase.expect))`, lines 236-243). Every new gate copies this skeleton; absence gate adds the positive control (same drive through a public window must produce rows — RESEARCH Pitfall 7).

**Tier-placement pattern** (`scripts/verify-platform.sh:4209-4210`):
```bash
  if [ "$QUICK" -eq 0 ]; then
    CHECKS+=(
```
Second-writer scan registers in the base (`--quick`) array beside `gui04-registry-shape` (lines 3667-3668: `"gui04-registry-shape|node $REPO_ROOT/scripts/verify-registry-shape.mjs"` + `"gui04-registry-shape-self-test|... --self-test"` — the exact row shape to copy, one row per gate plus one `--self-test` row). Roundtrip/absence live halves and soak live half register inside the `QUICK -eq 0` block (need built binary + temp profile + restart); soak static-fixture half may ride `--quick`.

---

### `scripts/verify-platform.sh` (modify — config)

**Analog:** itself.

**Row pattern** (lines 3667-3668):
```bash
    "gui04-registry-shape|node $REPO_ROOT/scripts/verify-registry-shape.mjs"
    "gui04-registry-shape-self-test|node $REPO_ROOT/scripts/verify-registry-shape.mjs --self-test"
```
Eight new rows: `sql-store-second-writer` + `-self-test` (base array), `sql-store-soak` + `-self-test` (split per tier decision), `sql-store-roundtrip` + `-self-test`, `sql-store-absence` + `-self-test` (full-tier block). Each row commented with the same honesty note the gui04 rows carry (what tier it honestly is and why). No sibling driver — one driver, one registry (CLAUDE.md Verification).

**ESR rebase drill** (no new file): run over the new touchpoints via `scripts/rebase-upstream.sh --tag <NEXT_ESR> [--dry-run]` (tracked analog, verified). Drill asserts patch 020's `DIRS` line still the whole Gecko surface, every pinned `upstream/` line re-resolves, `--quick` + store gates green, `git -C upstream diff` empty.

## Shared Patterns

### Lazy-getter boundary import (chrome side)
**Source:** `powerbrowser/shell/PowerBrowserAPI.sys.mjs:14-24`
**Apply to:** Writer wrappers + any new Gecko touchpoint (`Sqlite`, `PrivateBrowsingUtils`, `SessionStore`, `PlacesUtils`)
```javascript
const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  Sqlite: "resource://gre/modules/Sqlite.sys.mjs",
  // + PrivateBrowsingUtils, SessionStore, PlacesUtils as needed, same block
});
```
Zero `FORBIDDEN_PATTERNS` changes (basename exclusion); one catalogue row per new touchpoint line.

### Consumer-imports-only-boundary (chrome side)
**Source:** `powerbrowser/shell/TheiaService.sys.mjs:16`
**Apply to:** Any new `powerbrowser/shell/*.sys.mjs` helper (e.g. `TabStore.sys.mjs`)
```javascript
const { PowerBrowserAPI } = ChromeUtils.importESModule("chrome://powerbrowser/content/PowerBrowserAPI.sys.mjs");
```
Helper imports nothing else — the guard scans this dir minus the boundary file.

### Never-throw accessor + loud-write errors (chrome side)
**Source:** `powerbrowser/shell/PowerBrowserAPI.sys.mjs:36-42` (reads return fallback), `:178-182` (rejected writes throw naming method + cause)
**Apply to:** All reader accessors (serve empty/degraded on missing store) and all writer paths (constraint violations and downgrade refusal throw, never mask as success).

### Theia backend composition
**Source:** `theia/extensions/token-gate/src/node/token-gate-backend-module.ts:1-12` + `theia/extensions/token-gate/package.json:9-13`
**Apply to:** Query API module + `tab-uris/package.json`
```typescript
export default new ContainerModule(bind => {
    bind(X).toSelf().inSingletonScope();
});
```

### Gate instrument (derive-and-compare + both-directions self-test)
**Source:** `scripts/verify-registry-shape.mjs:119-126` (named surplus/missing), `:139-142` (non-vacuity), `:179-250` (self-test skeleton); scan half from `scripts/check-internals-boundary.sh:78-85` (comment skip), `:111-114` (empty-set-is-red), `:239-264` (mktemp plant)
**Apply to:** All four store gates. Registry rows per `scripts/verify-platform.sh:3667-3668`; tier split per `:4209-4210`.

### Catalogue consistency
**Source:** `scripts/check-internals-boundary.sh:199-230` + `powerbrowser/INTERNAL-APIS.md:20-48`
**Apply to:** Every new writer touchpoint. Grep shape `${basename}:${line}([^0-9]|$)` — exact line numbers required.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| Chrome-side `Sqlite.sys.mjs` open/execute/transaction call sites | service | CRUD | Grep over `powerbrowser/` + `theia/` for `SessionStore\|PlacesUtils\|Sqlite\|PrivateBrowsingUtils\|better-sqlite3\|getBrowserState` returns zero hits — no first-party chrome-side data-layer code exists yet. Planner uses RESEARCH.md §Code Examples skeletons (open + version-guard + WAL pre-BEGIN; bound-param upsert + private filter; `quick_check` tripwire; sessionstore projection) verbatim. |
| Theia `better-sqlite3` readonly reader body | service | request-response | Package not installed (`theia/` grep zero hits); no readonly-DB-reader precedent in tree. Planner uses RESEARCH.md §Pattern 3 skeleton (try/catch open, serve-empty + lazy re-open, `readonly: true` at open). |
| Emitter-exercising absence instrument | test | event-driven | No existing gate drives real browser-window tab events and asserts absence-with-positive-control. Planner builds from the registry-shape self-test skeleton + RESEARCH Pattern 4 gate-4 spec; harness choice (headless vs Xvfb) per Open Question 2 spike. |

## Metadata

**Analog search scope:** `powerbrowser/shell/`, `powerbrowser/INTERNAL-APIS.md`, `scripts/verify-*.mjs`, `scripts/check-internals-boundary.sh`, `scripts/verify-platform.sh` (CHECKS array + tier split), `theia/extensions/tab-uris/`, `theia/extensions/token-gate/`; negative greps over `powerbrowser/` + `theia/` for data-layer symbols
**Files scanned:** 15 tracked files read or excerpted; 2 negative greps (both zero hits in first-party trees)
**Tracked-source gate:** all 15 analog paths verified via `git ls-files` (non-empty = tracked); no mirror/gitignored paths emitted
**Pattern extraction date:** 2026-09-05
