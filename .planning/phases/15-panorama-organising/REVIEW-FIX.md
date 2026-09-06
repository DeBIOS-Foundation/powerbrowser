# Phase 15: Code Review Fix Report (panorama-organising)

**Fixed at:** 2026-09-06
**Source review:** `.planning/phases/15-panorama-organising/REVIEW.md`
**Scope:** 1 critical + 5 warnings + 13 info (all 19 findings dispositioned)

**Summary:**
- Fixed: 12 (CR-01, WR-01..WR-05, IN-01, IN-02, IN-04, IN-09, IN-10, IN-11)
- Accepted (no code change): 7 (IN-03, IN-05, IN-06, IN-07, IN-08, IN-12, IN-13)
- Fix commits: 12, each atomic per finding

## Fixed Issues

### CR-01: Actor parent origin check rejects all port-bearing Theia senders (BLOCKER)

**Commit:** `c04e8ee` — `fix(15): CR-01 host-based Theia origin check with gate plants`
**Files modified:**
- `powerbrowser/shell/PowerBrowserAPI.sys.mjs` — replaced the exact-or-slash-prefix
  string match against portless `http://127.0.0.1` with parsed-host comparison:
  new pure predicates `groupSenderSpecIsTheia(spec)` (via `Services.io.newURI`,
  `schemeIs("http")`, host `127.0.0.1`/`localhost`, any port, reject all else)
  and `groupSenderIsTheia(actorRef)`; `handleGroupMutation` now gates on
  `if (!groupSenderIsTheia(actorRef))`. A naive `startsWith(ORIGIN)` was
  deliberately not used (admits `http://127.0.0.1.evil.com/`).
- `scripts/verify-gui08-persistence-roundtrip.mjs` — gate now asserts the
  host-based wall statically (predicate present, scheme/host/localhost checks,
  old `senderSpec` string-prefix shape absent, naive-`startsWith` absent,
  dispatch gates on the predicate) plus a WHATWG-URL mirror covering
  port-bearing positives, suffix negatives, and empty/undefined rejects;
  self-test grows 3 origin plants (string-prefix wall, naive startsWith,
  dropped localhost), 6 plants total at that point.
- `powerbrowser/INTERNAL-APIS.md` — new `Services.io.newURI` catalogue row
  (`:119`); all shifted `File:Line` rows renumbered (insertion moved every
  occurrence below it; the check matches exact lines).
**Verification:** gate PASS + `--self-test` 6/6 red-naming-drift; `internals-catalogue`
PASS; full `verify-platform.sh --quick` PASS.

### WR-01: Cross-key write failure evicts the earlier pending write

**Commit:** `e1aeae9` — `fix(15): WR-01 per-key pending writes so cross-key failure cannot evict`
**Files modified:** `theia/extensions/modes/src/browser/group-model.ts` — single
`pending` slot replaced with `pendingWrites` map keyed by mutation key (own-key
read/write/delete only; same-key reuse keeps the original revert/attempts);
`hasPendingWrite` = `size > 0`; `retryPending` replays every entry (success
clears, second failure reverts + clears, first error rethrown); map bounded at
20 with drop-oldest.
**Verification:** `tsc --noEmit -p theia/extensions/modes` exit 0; all five
gui08 gates PASS; `--quick` PASS.

### WR-02: `closeGroupRows` rejects unknown groups (not idempotent)

**Commit:** `ed8cc1e` — `fix(15): WR-02 idempotent closeGroupRows with gate plant`
**Files modified:**
- `powerbrowser/shell/PowerBrowserAPI.sys.mjs` — missing group row returns
  `"already-closed"` instead of throwing `unknown group` (empty-id refusal
  unchanged); doc comment updated. Actor ack stays `{ok: true}`.
- `scripts/verify-gui08-close-exactness.mjs` — asserts `return "already-closed"`
  present and the `unknown group` throw absent; self-test Plant 4 reintroduces
  the throw and must go red naming the idempotency loss.
- `powerbrowser/INTERNAL-APIS.md` — shifted rows renumbered.
**Verification:** close-exactness PASS + `--self-test` 4/4; `internals-catalogue`
PASS; `--quick` PASS.

### WR-03: Card-onto-card drop across groups orphans the target's emptied box

**Commit:** `1db01ed` — `fix(15): WR-03 dissolve both evacuated sources on card-onto-card drop`
**Files modified:** `theia/extensions/modes/src/browser/organising-widget.ts` —
`dropCardOntoCard` takes the target card's `groupId` (threaded from the
`buildCard(tab, groupId)` drop closure) and calls `dissolveEmptied` for both
the drag source and the target source (skipped when identical to the drag
source; `dissolveEmptied`'s own guards make repeats no-ops).
**Verification:** modes `tsc` exit 0; all five gui08 gates PASS; `--quick` PASS.

### WR-04: Group-id validation unbounded; titles coerce non-strings

**Commit:** `78552c0` — `fix(15): WR-04 bound group-id shape and reject non-string titles with gate plants`
**Files modified:**
- `powerbrowser/shell/PowerBrowserAPI.sys.mjs` — `normalizeGroupRow` requires
  `/^[A-Za-z0-9_-]{1,128}$/` ids (`refusing malformed group id`) and rejects
  non-string titles (`refusing non-string title`); client generator shape
  (`group-<base36>-<base36>`) already matches. The `/refusing|unknown/`
  → `validation` mapping in `handleGroupMutation` is preserved.
- `scripts/verify-gui08-persistence-roundtrip.mjs` — static pins for the regex
  and both refusal strings, plus a mirrored id/title rule (client-shaped
  positive, over-long/charset/type negatives); self-test Plants 7–8.
- `powerbrowser/INTERNAL-APIS.md` — shifted rows renumbered.
**Verification:** persistence gate PASS + `--self-test` 8/8 at that point;
`internals-catalogue` PASS; `--quick` PASS.

### WR-05: Three gate-enumeration holes

**Commit:** `8c83f93` — `fix(15): WR-05 close gate-enumeration holes in parity copy and cap gates`
**Files modified:**
- `scripts/verify-gui08-view-parity.mjs` — (a) `derivedModelReaders` matches all
  four reader entry points (`listGroups`, `getGroupTabs`, `listUngroupedTabs`,
  `getThumbnail`); clean tree still green (widget is sole reader); self-test
  Plant 4 plants a `getGroupTabs` fetch site in `mode-descriptors.ts`.
- `scripts/verify-gui08-panorama-copy.mjs` — (b) the retired-copy proof scans the
  derived shipped set (every modes-browser `.ts` via `readdirSync` plus CSS and
  module files) instead of six hand-kept entries; self-test Plant 4 revives a
  placeholder in `mode-descriptors.ts` and must name the file.
- `scripts/verify-gui08-persistence-roundtrip.mjs` — (c) asserts
  `GROUP_TITLE_MAX_CHARS` (model) equals `GROUP_TITLE_MAX` (chrome);
  self-test Plant 9 drifts the model cap to 61.
**Verification:** all three gates PASS with `--self-test` 4/4, 4/4, 9/9
respectively; `--quick` PASS.

### IN-01: `tabStoreHasColumn` interpolates the table name

**Commit:** `c71a359` — `fix(15): IN-01 allowlist table in tabStoreHasColumn`
**Files modified:** `powerbrowser/shell/PowerBrowserAPI.sys.mjs` (one-line
allowlist guard: only `tabs`/`groups`, else throw) + catalogue renumbering.
Both call sites pass `"tabs"`.
**Verification:** `node --check` OK; `internals-catalogue` PASS; `--quick` PASS.

### IN-02: `listGroups`/`getTabs`/`listUngrouped` return live collections

**Commit:** `4d89d3e` — `fix(15): IN-02 return frozen copies from group-model getters`
**Files modified:** `theia/extensions/modes/src/browser/group-model.ts` — getters
return `Object.freeze([...])` copies. All current callers only iterate.
**Verification:** modes `tsc` exit 0; parity/close/geometry gates PASS; `--quick` PASS.

### IN-04: Fragile CSS self-import path

**Commit:** `3d6c1a6` — `fix(15): IN-04 direct CSS import path in organising-widget`
**Files modified:** `theia/extensions/modes/src/browser/organising-widget.ts` —
`import '../../src/browser/modes.css'` → `import './modes.css'` (same file).
**Verification:** modes `tsc` exit 0; geometry/copy gates PASS; `--quick` PASS.

### IN-10: Synchronous `sendQuery` throw escapes with no nack

**Commit:** `99774f6` — `fix(15): IN-10 nack immediately on sync sendQuery throw`
**Files modified:** `powerbrowser/shell/GroupActorChild.sys.mjs` — `sendQuery`
call wrapped in try/catch; sync throw dispatches the immediate
`{ok: false, reason: 'store', message}` nack instead of a 5s timeout.
**Verification:** `node --check` OK; `internals-boundary` PASS (no new
privileged surface); `--quick` PASS.

### IN-11: `focusRename` interpolates the group id unescaped

**Commit:** `fe54a26` — `fix(15): IN-11 escape group id in focusRename selector`
**Files modified:** `theia/extensions/modes/src/browser/organising-widget.ts` —
one-line `CSS.escape(id)` in the `[data-g="..."]` selector.
**Verification:** modes `tsc` exit 0; geometry gate PASS; `--quick` PASS.

### IN-09: Untracked root `yarn.lock`

**Commit:** `10b6a7f` — `fix(15): IN-09 ignore root yarn.lock byproduct`
**Files modified:** `.gitignore` (`/yarn.lock` with rationale comment); the empty
header-only file itself deleted (untracked, no root `package.json` to lock —
the real lockfile lives under `theia/`).
**Verification:** `git check-ignore yarn.lock` → ignored; `--quick` PASS.

## Accepted (no code change)

- **IN-03 (tree roving tabindex):** larger a11y rework (thread `tabbable` flag,
  add arrow-key travel to tree sections). No contract breach, canvas behavior
  unchanged. Defer to a dedicated a11y pass.
- **IN-05 (`capture-failed` keeps stale thumbnail):** needs a per-URI consecutive-
  failure counter design; cosmetic only (card keeps a snapshot, text fallback
  intact on `no-live-tab`). File as a follow-up, do not half-fix with a comment.
- **IN-06 (no chrome→Theia invalidation):** documented limitation, explicitly not
  a 15-01/15-02 must-have; no corruption follows (chrome authoritative at close,
  dive re-opens dead URLs fresh). 15-04/15-05 consideration as the review notes.
- **IN-07 (UI-side-only close confirmation):** inherent to the DOM-event bridge —
  no code change available at this layer. Accepted risk for the 15 threat model;
  origin check still stops cross-origin forgery.
- **IN-08 (read-modify-write outside a transaction):** reviewed benign — single
  SQLite writer serializes, last-writer-wins on positions only, no CHECK
  violation reachable through `normalizeGroupRow`. No change.
- **IN-12 (close-active promotes without persisting):** cosmetic, self-heals,
  zero-active is a legal store state. No change.
- **IN-13 (`dissolveGroup` revert vs pre-existing duplicates):** requires a prior
  store/model invariant violation to trigger. No change.

## Verification record

- Every fix: source read before editing; Tier-1 re-read after editing; Tier-2
  syntax check (`node --check` for `.sys.mjs`/gate `.mjs`, `tsc --noEmit -p
  theia/extensions/modes` for `.ts`); affected gate rows plus their
  `--self-test` rows run; `scripts/verify-platform.sh --quick` run green before
  each commit.
- Environment note (`workflow.use_worktrees: false`): all edits, gate runs, and
  commits happened in the main checkout — no isolated worktree. Gate results
  above are reproducible from the tree as committed.
- Final state: `verify-platform.sh --quick` PASS (all rows); `internals-catalogue`
  PASS; `internals-boundary` PASS; modes `tsc` exit 0; all five gui08 gates plus
  self-tests PASS (persistence 9/9, parity 4/4, close 4/4, copy 4/4, geometry 3/3).
- Held for 15-05: one real headed `createGroup` roundtrip before GUI-08
  completion (CR-01 review requirement); live halves remain HELD-OUT backstops
  per gate design. No new npm packages, no Theia-core edits, no Gecko changes
  outside the two hook-only patches (untouched), no sibling drivers.

_Fixer: Muse Spark (gsd-code-fixer)_
