---
phase: 15-panorama-organising
reviewed: 2026-09-06T09:30:00Z
depth: deep
files_reviewed: 21
files_reviewed_list:
  - powerbrowser/shell/PowerBrowserAPI.sys.mjs
  - powerbrowser/shell/GroupActorChild.sys.mjs
  - powerbrowser/shell/jar.mn
  - powerbrowser/shell/TheiaService.sys.mjs
  - powerbrowser/INTERNAL-APIS.md
  - theia/extensions/modes/src/browser/group-model.ts
  - theia/extensions/modes/src/browser/group-actor-client.ts
  - theia/extensions/modes/src/browser/organising-widget.ts
  - theia/extensions/modes/src/browser/organising-tree.ts
  - theia/extensions/modes/src/browser/panorama-commands.ts
  - theia/extensions/modes/src/browser/modes-frontend-module.ts
  - theia/extensions/modes/src/browser/modes.css
  - theia/extensions/tab-uris/src/node/tab-query-service.ts
  - theia/extensions/tab-uris/src/node/tab-query-backend-module.ts
  - theia/extensions/tab-uris/src/browser/group-query-service.ts
  - scripts/verify-gui08-persistence-roundtrip.mjs
  - scripts/verify-gui08-canvas-geometry.mjs
  - scripts/verify-gui08-view-parity.mjs
  - scripts/verify-gui08-close-exactness.mjs
  - scripts/verify-gui08-panorama-copy.mjs
  - scripts/verify-platform.sh
findings:
  critical: 1
  warning: 5
  info: 13
  total: 19
status: findings
---

# Phase 15: Code Review Report (panorama-organising)

**Reviewed:** 2026-09-06T09:30:00Z
**Depth:** deep (per-file analysis plus cross-file tracing: actor wire both
halves, model persist/retry state machine, chrome migration/write surface,
gate derivations vs sources)
**Files Reviewed:** 21
**Status:** findings

## Summary

Phase 15 (12 commits: 15-01 transport/migration/tracer, 15-02 canvas/capture,
15-03 tree/gates/retirement) was reviewed against its hard rules: actor-pair
scoping, single chrome-side writer, sessionstore authority, no Theia-core
fork, no Gecko outside the 2 hook-only patches, no new npm packages, no
sibling drivers, text-only rendering, Close Group as the sole confirmed
tab-closing path.

One BLOCKER: the parent-side origin check in `handleGroupMutation` rejects
every legitimate Theia sender because Theia is always served with a port and
the check is an exact-or-slash-prefix string match. The full 8-kind actor
write channel nacks 100% of production traffic. All five gui08 gates pass
despite this — none exercises the check with a port-bearing sender — so the
gates are blind to it. Five WARNINGs (pending-slot eviction on cross-key
failure, non-idempotent close vs idempotent dissolve, orphan empty box on
cross-group onto-card drops, group-id/title validation gaps, gate-enumeration
holes) and thirteen INFO items follow. Hard-rule compliance that verified
clean is recorded at the end so the phase record shows what was proven, not
just what failed.

## Critical Issues

### CR-01: Actor parent origin check rejects all port-bearing Theia senders — write channel dead in production

**File:** `powerbrowser/shell/PowerBrowserAPI.sys.mjs:1353`
**Issue:** The W5 second wall is a string match against a portless origin:

```js
const GROUP_ACTOR_THEIA_ORIGIN = "http://127.0.0.1";          // :103
if (senderSpec !== GROUP_ACTOR_THEIA_ORIGIN
    && !senderSpec.startsWith(`${GROUP_ACTOR_THEIA_ORIGIN}/`)) { // :1353
  return { ok: false, reason: "validation", ... };              // :1354-1355
}
```

The shell always loads Theia with a port
(`powerbrowserSwapToUrl(\`http://127.0.0.1:${this._port}/\`)`,
`powerbrowser/shell/TheiaService.sys.mjs:1373`; backend binds
`--hostname 127.0.0.1 --port <port>`, `TheiaService.sys.mjs:603`). The
actor's sender `documentURI.spec` is therefore always of the form
`http://127.0.0.1:PORT/...`: not equal to the bare origin, and
`startsWith("http://127.0.0.1/")` is false (the character after the host is
`:`, not `/`). Every one of the 8 mutation kinds nacks with
`reason: 'validation'`, so every `GroupModel` mutation lands in the pending
slot behind a permanent save-error bar and every Retry fails identically.
The `matches: ["http://127.0.0.1/*"]` pin (`:1329`) is unaffected
(MatchPattern ignores ports, so the child still loads) — only the parent
string check is wrong. Verified gate-blind: all five gui08 gates plus
self-tests pass on the current tree (re-ran during this review); no gate
derives or plants a port-bearing sender spec.
**Fix:** Compare parsed host, not string prefix (a naive
`startsWith(ORIGIN)` repair would admit `http://127.0.0.1.evil.com/`):

```js
function groupSenderIsTheia(actorRef) {
  let spec = "";
  try {
    spec = actorRef?.browsingContext?.currentWindowGlobal?.documentURI?.spec ?? "";
  } catch { spec = ""; }
  try {
    const uri = Services.io.newURI(spec);
    return uri.schemeIs("http") && uri.host === "127.0.0.1";
  } catch { return false; }
}
```

Extract as a pure, unit-testable predicate and add gate plants:
port-bearing positive (`http://127.0.0.1:3000/` → accept), suffix negative
(`http://127.0.0.1.evil.com/` → reject), empty/undefined actorRef → reject.
Headed verification must include one real createGroup roundtrip before GUI-08
can complete in 15-05.

## Warnings

### WR-01: Cross-key write failure evicts the earlier pending write — stranded paint, misleading save bar

**File:** `theia/extensions/modes/src/browser/group-model.ts:458-480`
**Issue:** `persist()` keeps a single `pending` slot. On the failure path the
new slot unconditionally overwrites it:

```js
} catch (error) {
  slot.attempts += 1;
  if (slot.attempts >= 2) { revert(); ... } else { this.pending = slot; }
```

Trace: rename fails → `pending = {key: 'rename:g1', revert→P0,
write→"x"}` (painted "x" kept, save bar shown). An unrelated move then fails
→ `pending = {key: 'move:g1', ...}`. The rename's revert closure is
discarded: Retry replays only the move, the painted-but-unpersisted rename
has no recovery path, and a reload silently drops it. (Re-traced the success
direction: a cross-key success does NOT clear the earlier pending — the
condition `this.pending === slot || this.pending?.key === key` is false for
both — so the defect is failure-eviction only, plus permanent stranding.)
Same-key sequences self-clear correctly, so this bites exactly when two
independent writes fail in sequence — routine in a degraded store, where
every write fails.
**Fix:** Key pending writes per mutation key instead of one slot:

```ts
private readonly pendingWrites = new Map<string, { attempts: number; revert: () => void; write: () => Promise<unknown> }>();
```

`persist` reads/writes/deletes only its own key; `hasPendingWrite` becomes
`pendingWrites.size > 0`; `retryPending` replays every entry (or takes a key)
so no failure can evict another's revert. Bound the map (e.g. drop-oldest
past 20) so a pathological failure storm cannot grow it without limit.

### WR-02: `closeGroupRows` rejects unknown groups — retry-after-success resurrects a ghost group

**File:** `powerbrowser/shell/PowerBrowserAPI.sys.mjs:1082-1085`
**Issue:** `closeGroupRows` throws `unknown group` when the row is already
gone, while the sibling `removeGroupRow` (`:942-956`) performs no existence
check and returns success on a no-op DELETE. Close is therefore not
idempotent, but the frontend Retry discipline assumes idempotency: if the
chrome close succeeds and only the ack is lost (timeout), the model holds a
pending close; user hits Retry → `closeGroupRows` throws validation →
`attempts` reaches 2 → `revert()` re-inserts the deleted group plus member
cards whose rows are gone. Result: a ghost box of dead cards (dive re-opens
their URLs as fresh ungrouped tabs). `setTabGroupId`/`writeGroupRow`/
`setActiveGroup` are all naturally idempotent; close is the lone outlier, on
the only destructive path.
**Fix:** Treat a missing group row as already-closed success:

```js
const group = await conn.execute("SELECT 1 FROM groups WHERE id = :id", { id });
if (!group.length) {
  return "already-closed";
}
```

The actor ack stays `{ok: true}` and no gate text changes (the
close-exactness gate pins the dispatch arm and call sites, not this branch).
Add a gate plant or mirror-case asserting unknown-group close resolves
without throwing.

### WR-03: Card-onto-card drop across groups orphans the target's emptied box

**File:** `theia/extensions/modes/src/browser/organising-widget.ts:788-806`
**Issue:** `dropCardOntoCard` moves both cards via `autoBox` (which relocates
every listed URI out of its source), then runs last-card-out only for the
dragged card's source:

```js
const box = await this.model.autoBox(this.actor, [drag.uri, targetUri], ...);
if (box && drag.fromGroup !== null && drag.fromGroup !== box.id) {
  await this.dissolveEmptied(drag.fromGroup, box.id);
}
```

When the target card lived in a different group B (or the drag came from the
tray while B loses its sole card), B is left at zero cards and never
dissolved — a stray `Empty group — drag tabs here.` box the user did not
create. Same-key and into-box/into-tray drops are correct; only the
two-source onto-card gesture misses the second source.
**Fix:** Dissolve every evacuated source, not just the drag source —
e.g. have `autoBox` return the evacuated group ids (sources whose cards all
moved and are not the new box), and dissolve each emptied one; or expose the
target card's `groupId` (already threaded as `dropCardOntoCard`'s context via
`buildCard(tab, groupId)`) and call `dissolveEmptied` for both groups.

### WR-04: Group-id validation has no length/charset bound; titles coerce non-strings instead of rejecting

**File:** `powerbrowser/shell/PowerBrowserAPI.sys.mjs:892-913`
**Issue:** `normalizeGroupRow` — documented as the wall behind the origin
check — accepts any non-empty string id of unbounded length and any title
type via `String(title ?? ...)`. A buggy or compromised same-origin sender
can store megabyte ids (the DDL constrains only `length(id) > 0`, no upper
bound) to bloat `tabs.sqlite`, and a non-string title (object/array) stores
literally as `"[object Object]"` instead of rejecting. Client-generated ids
(`group-<base36>-<base36>` in `group-model.ts:156,284`) combined with
upsert semantics also mean an id collision silently overwrites an unrelated
group row.
**Fix:** Bound and shape the id, reject non-string titles:

```js
if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) {
  throw new Error(`${method}: refusing malformed group id`);
}
if (title !== undefined && title !== null && typeof title !== "string") {
  throw new Error(`${method}: refusing non-string title for ${id}`);
}
```

Client generators already emit matching ids, so no frontend change is needed;
add the over-long/malformed-id case to the persistence gate's live mirror.

### WR-05: Three gate-enumeration holes let future divergence ship green

**File:** `scripts/verify-gui08-view-parity.mjs:75-87`,
`scripts/verify-gui08-panorama-copy.mjs:199-206`,
`theia/extensions/modes/src/browser/group-model.ts:24`
**Issue:** (a) The parity gate's single-reader derivation matches only
`/\.listGroups\(/` — a second fetch site that reads `getGroupTabs`,
`listUngroupedTabs`, or `getThumbnail` without calling `listGroups` in
another modes-browser file trips neither the reader set-equality nor the
tree-only negated search. (b) The copy gate's placeholder-absence proof
scans exactly 6 files; retired copy reintroduced in any other shipped source
(e.g. `mode-descriptors.ts`, a commands file) is invisible to it — the
Task-4 tree-wide grep proved retirement once but is not a regression guard.
(c) The 60-char rename cap is pinned chrome-side (`GROUP_TITLE_MAX`) but the
model's `GROUP_TITLE_MAX_CHARS` appears in no gate; drift between the two
paints titles the store will cut on write (paint/store divergence until
reload).
**Fix:** (a) Extend `derivedModelReaders` to `getGroupTabs`,
`listUngroupedTabs`, `getThumbnail` call sites. (b) Derive the shipped-file
list (modes-browser `*.ts` plus the CSS/module files) instead of hand-keeping
six entries, or add a seventh negated plant in an unscanned file to the
self-test. (c) Assert `GROUP_TITLE_MAX === GROUP_TITLE_MAX_CHARS` across
`PowerBrowserAPI.sys.mjs` / `group-model.ts` in the persistence gate.

## Info

### IN-01: `tabStoreHasColumn` interpolates the table name into SQL

**File:** `powerbrowser/shell/PowerBrowserAPI.sys.mjs:793-801`
**Issue:** `` conn.execute(`PRAGMA table_info(${table})`) `` interpolates.
Both call sites pass the literal `"tabs"`, so no injection is reachable
today; PRAGMA does not take bound parameters, so the shape is understandable.
Harden with an allowlist (`if (table !== "tabs" && table !== "groups") throw`)
so a future caller cannot turn this into an injection sink.
**Fix:** One-line allowlist guard at the top of `tabStoreHasColumn`.

### IN-02: `listGroups`/`getTabs`/`listUngrouped` return live internal collections

**File:** `theia/extensions/modes/src/browser/group-model.ts:80-94`
**Issue:** Getters hand out the actual `groups` array and member arrays. All
current callers only iterate, but any future in-place sort/mutation corrupts
the single store silently.
**Fix:** Return frozen copies (`Object.freeze([...this.groups])`,
`Object.freeze([...(this.members.get(groupId) ?? [])])`).

### IN-03: Tree rows skip the roving-tabindex discipline the canvas follows

**File:** `theia/extensions/modes/src/browser/organising-tree.ts:85-89`
**Issue:** Every tree row sets `tabIndex = 0`, so a 50-tab group puts 50 stops
in the tab order, while canvas cards use roving tabindex (`i === 0`) with
arrow-key travel (`organising-widget.ts:864-879`). Tree rows also lack the
arrow-key handler entirely.
**Fix:** Thread a `tabbable` flag into `buildTreeRow` like `buildCard`, and
mirror the arrow-key travel within `.pb-org-tree-section`.

### IN-04: Fragile CSS self-import path

**File:** `theia/extensions/modes/src/browser/organising-widget.ts:49`
**Issue:** `import '../../src/browser/modes.css'` resolves to the same file
as `./modes.css` via a roundabout relative path. It is the sole importer, so
no duplicate module is bundled today, but the path breaks silently on file
moves and reads as a copy-paste error.
**Fix:** `import './modes.css';`

### IN-05: `capture-failed` keeps a stale thumbnail while `no-live-tab` clears

**File:** `powerbrowser/shell/PowerBrowserAPI.sys.mjs:1154-1187`
**Issue:** When capture fails after finding a live tab (`toDataURL` throws,
tainted canvas), the old bytes stay and the card shows a stale snapshot; when
no live tab is found the row is cleared to the text fallback. A tab whose
content becomes uncapturable keeps a misleading image indefinitely.
**Fix:** Clear to NULL after N consecutive failures per URI (small counter
beside `settleCaptureTokens`), or accept stale-by-design in a comment.

### IN-06: No chrome→Theia invalidation — model goes stale on external tab activity

**File:** `theia/extensions/modes/src/browser/group-model.ts:101-151`,
`theia/extensions/modes/src/browser/organising-widget.ts:128-159`
**Issue:** The model loads once at startup. Tabs opened/closed in stock
windows afterwards never update it: Close Group dialog counts drift from the
(current, authoritative) chrome rows, dead cards linger, and new tabs miss
the tray until reload. No corruption follows (chrome is authoritative at
close time; dive re-opens dead URLs fresh), and no live-sync requirement
exists in the 15-01/15-02 must-haves, so this is a documented limitation, not
a contract breach.
**Fix:** File as a 15-04/15-05 consideration: subscribe the widget to a
tab-event signal or re-`load()` on view activation; gate the dialog count
against a pre-close member re-read if cheap.

### IN-07: Close confirmation is UI-side only — forgeable by same-origin script

**File:** `theia/extensions/modes/src/browser/organising-widget.ts:128-159`,
`powerbrowser/shell/GroupActorChild.sys.mjs:20-43`
**Issue:** The contracted ConfirmDialog gates the widget path, but any script
running in the Theia origin can dispatch `PowerBrowserGroupRequest` with
`kind: 'closeGroup'` directly at `window` and bypass confirmation entirely.
This is inherent to the DOM-event bridge (the child cannot distinguish the
widget from other same-origin script); the origin check stops cross-origin
forgery, not same-origin. The hard rule (Close Group is the sole tab-closing
path, and the UI confirms) still holds as stated.
**Fix:** No code change available at this layer — record the accepted risk in
the 15 threat model so a future hardening pass (e.g. user-gesture
attestation) has a starting point.

### IN-08: Move/resize/rename are read-modify-write outside a transaction

**File:** `powerbrowser/shell/PowerBrowserAPI.sys.mjs:1379-1426`
**Issue:** Each reads the current row then rewrites the full row in separate
statements. Two concurrent mutations interleave as last-writer-wins on
overlapping fields (positions only — both writes are individually valid, and
the single SQLite writer serializes them). No corruption, no CHECK violation
possible through `normalizeGroupRow`.
**Fix:** None required; note as reviewed-and-benign, or fold the read plus
write into one `executeTransaction` for hygiene.

### IN-09: Untracked root `yarn.lock` — confirm it is not a phase artifact

**File:** `yarn.lock` (untracked)
**Issue:** An untracked `yarn.lock` sits at the repo root. The phase range
(`f420ee9~1..HEAD`) touches no `package.json`/`yarn.lock`, and all three
SUMMARYs assert zero npm changes, so it is not a shipped phase artifact —
most likely a sidecar-build byproduct. It is, however, exactly the kind of
file that silently converts a future `git add -A` into an npm-surface change.
**Fix:** Delete it if regenerable, or add the root `yarn.lock` to
`.gitignore` with a comment if the build recreates it.

### IN-10: Synchronous `sendQuery` throw escapes the actor child with no nack

**File:** `powerbrowser/shell/GroupActorChild.sys.mjs:31-42`
**Issue:** If `sendQuery` throws synchronously (actor shutting down,
message-manager gone), `handleEvent` throws, no `PowerBrowserGroupResponse`
is dispatched, and the frontend waits out the full 5s timeout instead of
failing fast to the save-error bar.
**Fix:** Wrap in try/catch and `sendResponse` an immediate
`{ok: false, reason: 'store', message}` on sync throw.

### IN-11: `focusRename` interpolates the group id into a selector unescaped

**File:** `theia/extensions/modes/src/browser/organising-widget.ts:905-911`
**Issue:** `` querySelector(`[data-g="${id}"]`) `` throws on ids containing
quotes/brackets. Ids are internally generated (`group-<base36>-<base36>`) and
chrome-side WR-04 is the only abnormal-id source, so this is latent.
**Fix:** `querySelector(`[data-g="${CSS.escape(id)}"]`)`.

### IN-12: Closing the active group promotes in memory without persisting

**File:** `theia/extensions/modes/src/browser/group-model.ts:385-393`
**Issue:** `closeGroup.apply` sets `activeGroupId = groups[0]?.id` and flips
`isActive` flags, but the actor write is only `closeGroup` — chrome deletes
the row and no `setActiveGroup` follows. The store holds zero active rows
until the next explicit activation; a reload lands with no active group.
Cosmetic only (active never filters or hides anything) and self-heals.
**Fix:** After a was-active close, follow with `setActiveGroup` for the
promoted id (best-effort, folded into the same pending key), or document
zero-active as a legal store state.

### IN-13: `dissolveGroup` revert can drop pre-existing ungrouped duplicates

**File:** `theia/extensions/modes/src/browser/group-model.ts:364-371`
**Issue:** The revert re-inserts stragglers into their group, then filters
every straggler URI out of `ungrouped`. If the store/model invariant (a card
in exactly one place) was ever violated and a straggler URI already lived in
the tray before apply, the pre-existing tray copy is removed too. Requires a
prior divergence to trigger.
**Fix:** Snapshot the pre-apply `ungrouped` URI set in the closure and only
remove URIs the apply added.

## Hard-rule verification (held — not findings)

- **Actor scoping:** `matches: ["http://127.0.0.1/*"]` keeps the child out of
  stock-window web content; child carries zero privileged strings
  (`handleEvent`/`sendQuery`/DOM dispatch only); sole `registerWindowActor`
  caller is `PowerBrowserAPI.sys.mjs` (exactly one file matches); catalogue
  rows landed in the introducing commits (`3c9fb9f` actor pair,
  `a9cce96` PageThumbs) with `--catalogue` green.
- **Single writer:** Theia reads through one `readonly: true` handle
  (`tab-query-service.ts:108`, same line per gate rule b); no Theia-side
  `openConnection`/read-write open; second-writer gate re-run green per
  SUMMARYs.
- **Sessionstore authority, no extData coupling:** quarantine/sweep source is
  `parseSessionStoreTabRows`; zero `extData` references in phase files.
- **No Theia-core fork / no Gecko outside patches:** phase touches only
  `@powerbrowser/*` extensions, `powerbrowser/shell/*`, scripts, and gates;
  `jar.mn` packaging line only — no `patches/` touch, no core edit.
- **No new npm packages:** zero `package.json`/`yarn.lock` touches across the
  phase range (verified by diff).
- **No sibling drivers:** all five gates are text-only checks invoked through
  `verify-platform.sh` registry pairs (10 rows); no new driver scripts.
- **Text-only rendering:** no `innerHTML` in phase sources; titles/URIs via
  `textContent`; `img.src` guarded by an error listener that removes broken
  shots; no spinner patterns.
- **Close discipline:** `closeStockTabByUri` is reachable only from
  `closeGroupRows` (single caller); `gBrowser.removeTab` appears only there;
  widget cancel path returns before any mutation (gate-pinned ordering).

## Out of scope (observed, not reported)

- `git -C upstream` staged `browser/moz.build` + `browser/moz.configure`
  entries predate the session with an empty working diff; the two hook-only
  patches verified intact per 15-03 SUMMARY — untouched, per instructions.
- Pre-existing `diff-theia-core.sh` install-state drift (13-01 diagnosed) —
  not re-reported.
- Untracked `theia/*/lib` build output still carries stale placeholder
  strings; untracked and `git-ls-files`-invisible, regenerates on build —
  noted in 15-03 SUMMARY, left alone.
- Pre-existing catalogue row 28 (`:817` with no occurrence) noted in the
  15-02 SUMMARY — not introduced here, not reported.

---

_Reviewed: 2026-09-06T09:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
