# Phase 15: Panorama Organising — Pattern Map

**Mapped:** 2026-09-06
**Files analyzed:** 6 pattern areas (placeholder host, widget idioms, style layer, persistence fork, gates, probe records)
**Analogs found:** 6 / 6 (all git-tracked; verified via `git ls-files`)

All analog paths below are git-TRACKED source (checked with `git ls-files`
— 17/17 paths printed). No mirror/untracked paths are named.

**Binding constraints carried in:** 13-01 spike verdict RED (strip STAYS TOP —
no contract below moves, filters, or re-skins the strip); 14 REVIEW-FIX WR-10
(dead `layout` blob in modes store kept deliberately for this canvas to
consume); never fork/patch Theia core (`scripts/diff-theia-core.sh`); never
modify Gecko outside `patches/` regeneration; no new npm packages; Theia side
never opens profile SQLite read-write (second-writer gate goes red by design).

---

## 1. organising-placeholder-widget.ts — the exact file being replaced

**Analog (tracked):** `theia/extensions/modes/src/browser/organising-placeholder-widget.ts` (84 lines)

### Structure to reuse / extend

**Contribution seam (lines 63–84) — KEEP the shape, swap the widget class:**

```typescript
// Lines 63–84: view contribution registers the descriptor slot seam;
// the descriptor hooks (mode-descriptors.ts openOrganisingSlot/closeOrganisingSlot)
// and the mode service share one open/close path.
bindViewContribution(bind, OrganisingPlaceholderContribution);  // modes-frontend-module.ts line 64
```

- The Phase-15 canvas contribution binds through the SAME
  `bindViewContribution(bind, …)` point in
  `theia/extensions/modes/src/browser/modes-frontend-module.ts` (lines 61–64)
  and registers the SAME `registerOrganisingSlot({open, close})` seam
  (placeholder lines 74–83). `openView({ activate: false, reveal: true })`
  — open without activation so tabs keep focus — is the carried call shape.
- Static binds at module load (D-50, modes-frontend-module.ts header):
  a contribution bound after first enumeration is permanently invisible.

**Widget shell (lines 22–35) — KEEP the skeleton:**

```typescript
// Lines 24, 29–35: stable ID, non-closable title, host class hook.
static readonly ID = 'powerbrowser.modes.organising-placeholder';
this.id = OrganisingPlaceholderWidget.ID;
this.title.label = 'Organising';
this.title.closable = false;
this.addClass('pb-modes-organising');
```

- New canvas widget keeps: stable `ID` const, `title.closable = false`,
  one host `pb-modes-*` class. Planner picks whether the ID string is kept
  (slot continuity) or versioned — either way it is a named const.
- `import '../../src/browser/modes.css'` (line 7): keep the opaque
  self-import idiom (REVIEW-FIX IN-07 — shared bundler precedent with
  chrome-bar, fix neither without the other).

**Command invocation (lines 54–60) — KEEP the const-import discipline:**

```typescript
// Lines 5, 54–60: imported command const, never a re-spelled string;
// try/catch + console.error, never a throw out of a void handler.
import { MODES_ACTIVATE_COMMAND_ID } from './modes-commands';
back.onclick = () => { void this.backToBrowsing(); };
// catch: console.error('[@powerbrowser/modes] back-to-browsing failed:', error);
```

- Canvas buttons (New Group, zoom, retry, close) follow the same shape:
  `void this.<method>()` + try/catch logging `[@powerbrowser/modes] …`.
- Names render as `textContent` (lines 37–46), never `innerHTML` — canvas
  group titles, card titles, URI captions render as text nodes with
  ellipsis + `title` tooltip (T-13-03-01 / T-14-02-02 precedent).

### What to retire (15-UI-SPEC binding)

- The whole placeholder slot copy (heading `Organising arrives next`, body,
  `Back to Browsing`) is REMOVED, not reused. 15-UI-SPEC: "none of its copy
  survives." The contracted empty-canvas copy (`No tab groups`, …) is new
  UI-SPEC literals, asserted verbatim by the new copy gate (§5).

### What to avoid

- No spinner/skeleton beyond the contracted E1 skeleton boxes; placeholder
  painted synchronously with the switch — canvas paints local SQL reads the
  same way (text first, snapshots fill in).
- No second IDE frame, no strip touch, no tab close/move on view switch
  (chip invariant, §2).

---

## 2. chrome-bar-widget.tsx idioms — React widget, commands, text-only rendering

**Analog (tracked):** `theia/extensions/chrome-bar/src/browser/chrome-bar-widget.tsx` (477 lines)

### What to copy

**ReactWidget contribution (lines 57–60, 113–119, 456–477):**

```tsx
// Lines 57–60, 113–119: ReactWidget subclass, stable ID, non-closable.
export class ChromeBarWidget extends ReactWidget {
    static readonly ID = 'powerbrowser.chrome-bar';
    constructor() { super(); this.id = ChromeBarWidget.ID; /* … */ }
```

- If the canvas is built React (planner picks React vs plain `Widget`):
  subclass `ReactWidget`, keep `render()` pure over protected fields +
  `this.update()` after every mutation (lines 334–453). Plain-`Widget` +
  DOM (the placeholder, §1) is equally precedented — either is fine, but
  the file must pick ONE idiom, not mix both.
- Startup add: `shell.addWidget(barWidget, { area: 'top' })` guarded by
  `getWidgetById` (lines 468–471). Canvas rides the organising
  contribution path (§1), never a hardcoded second add.

**Command-per-action via imported consts (lines 17–23, 121–128, 293–300):**

```tsx
// Lines 17–23: ids imported as consts from the commands module.
import { CHROME_BAR_BACK_COMMAND_ID, … } from './chrome-bar-commands';
// Lines 121–128: runCommand wraps execute + log + update.
protected runCommand = (id: string) => async (): Promise<void> => {
    try { await this.commands.executeCommand(id); }
    catch (error) { console.error('[@powerbrowser/chrome-bar] command failed:', id, error); }
    this.update();
};
```

- Canvas commands live in a new `panorama-commands.ts` (planner names it)
  following `chrome-bar-commands.ts` lines 17–46 + `modes-commands.ts` /
  `setups-commands.ts`: `export const X_COMMAND_ID = 'powerbrowser.…'`;
  labelled commands carry 15-UI-SPEC labels verbatim (`New Group`);
  toggle-only commands carry NO label (modes-activate precedent).
- Call sites import the const — a re-spelled literal fails the gate (§5,
  `verify-chrome-bar-commands.mjs` precedent).

**Text-only rendering + contracted copy (lines 334–366):**

```tsx
// Lines 338–365: suggestion rows as text nodes with title tooltips,
// empty caption, provider-failure copy, footer hint — never markup.
<div className='pb-chrome-bar-row-title' title={row.title}>{row.title}</div>
<div className='pb-chrome-bar-row-caption' title={row.url}>{row.url}</div>
```

- Cards: title 13px + URI caption 12px mono, ellipsis + `title` tooltip;
  snapshot-absent renders the title + URI block alone — never a
  broken-image glyph, never a spinner (15-UI-SPEC E3 partial/loading).
- Load failure → contracted load-error bar + `Retry`; save failure →
  contracted save-error bar + `Retry`, painted change reverted on repeated
  failure. One error surface (E1/E9), not two — tree paints from the same
  in-memory model, no second loading/error state (15-UI-SPEC dismissals).

**Debounce pin (line 111):** `pDebounce(fn, 150)` — the in-tree pin, no new
dep. Canvas uses it for zoom/drag-write coalescing if needed.

**Tabs invariant (lines 235–255, 266–285):** `countTabs()` over
`shell.allTabBars` + `publishTabCount()` asserting before/after on every
switch; mismatch logged, never thrown. Close Group (the ONLY destructive
action) closes exactly its group's tabs — the chip re-asserts after; any
other count change is a defect. Confirm via stock `ConfirmDialog`
(setups-service.ts lines 443–449: `title`/`msg`/`ok`/`cancel` + `if
(!confirmed) return;`) with the contracted `Close Group` title/body/buttons.

### What to avoid

- No `font-size`/`font-weight` literal outside the 15-UI-SPEC 3-size/2-weight
  contract; no second brand hue; accent only in the 7 reserved uses
  (15-UI-SPEC items 1–4 carried, 5–7 net-new: view toggle, active-group
  marker, drag-target outline).
- No chrome-side command registration (CLAUDE.md rule 5 — absence is design).
- No new npm packages: no drag library, no canvas library — hand-rolled
  header-drag + corner-resize + CSS-transform zoom per the Panorama note.

---

## 3. modes.css layer idiom + sketch tokens for canvas/cards/tray/tree

**Analogs (tracked):** `theia/extensions/modes/src/browser/modes.css` (171 lines);
`theia/extensions/chrome-bar/src/browser/chrome-bar.css` (238 lines);
tokens: `.claude/skills/sketch-findings-Power-Browser/sources/themes/default.css` (45 lines, ONLY token source)

### What to copy — the layer idiom (modes.css lines 22–171)

```css
/* modes.css lines 22–35: one @layer block; host fills main area. */
@layer powerbrowser-modes {
.pb-modes-organising {
    display: flex; align-items: center; justify-content: center;
    width: 100%; height: 100%; box-sizing: border-box; padding: 16px;
    background: var(--color-bg, #1c1b22);
    color: var(--color-text, #fbfbfe);
}
```

- New canvas/tray/tree/toolbar classes EXTEND this same
  `@layer powerbrowser-modes` block (same file): `pb-modes-canvas*`,
  `pb-modes-group-box*`, `pb-modes-card*`, `pb-modes-tray*`,
  `pb-modes-tree*`, `pb-modes-toolbar*` (planner names them). One layer
  per extension — never a second `@layer` or an unlayered overrides sheet.
- Layered sheet loses to unlayered author CSS by construction, so the
  `customize.css` user layer keeps winning with no specificity arms race —
  never `!important` (modes.css header + chrome-bar.css lines 1–20).
- Focus idiom (modes.css lines 77–80, repeated per control):
  `outline: 2px solid var(--color-primary, #00a6f5); outline-offset: 2px`
  on EVERY Phase-15 control (15-UI-SPEC §Color/Focus).
- Motion baseline: `transition: all 0.15s ease`; drag follows pointer
  (no transition while dragging, `opacity: 0.7`); drop/zoom ≤150ms;
  `prefers-reduced-motion` renders instantly (modes.css lines 160–169).
- Type delegated, never literal: inherit `--theia-*` theme type; sizes only
  14px/13px/12px with the contracted roles; 600 reserved for the three
  selection families (active toggle segment, current-setup/mode row,
  active-group title) — card titles and inactive group titles never 600.

### Sketch tokens (verbatim — planner maps, never invents)

```css
/* default.css lines 1–44: the ONLY token source. */
--color-bg: #1c1b22; --color-surface: #2b2a33;
--color-surface-raised: #35343f; --color-border: #3f3e4a;
--color-text: #fbfbfe; --color-text-muted: #9a99a8;
--color-primary: #00a6f5; --color-primary-hover: #0090d4;
--color-danger: #ff848b; --color-success: #8ad38a;
--space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
--space-6: 24px; --space-8: 32px;
--radius-sm: 4px; --radius-full: 9999px;
```

- Geometry literals come from 15-UI-SPEC, not the ramp: card 160px,
  thumbnail 160×90 cover, group minimum 200×144, tray 144px fixed bottom,
  resize handle 16×16 hit area, hairline `1px var(--color-border)`.
- `--color-danger` ONLY for the Close Group confirm button + dialog
  warning marker. `--color-success` untouched (lock glyph only, carried).

### What to avoid

- No stock Theia region selectors; panels actuated through the shell API;
  canvas paints inside its own contribution host (modes.css header).
- No `font-family` literal in `@powerbrowser/*` (15-UI-SPEC: delegated
  `--theia-ui-font-family` / `--theia-code-font-family` + system fallbacks).

---

## 4. Persistence fork — user-storage JSON does NOT govern; the chrome-side single writer does

**Analogs (tracked):**
read side — `theia/extensions/tab-uris/src/node/tab-query-service.ts` (167 lines);
write side — `powerbrowser/shell/PowerBrowserAPI.sys.mjs` lines 42–68 (schema + single connection), 596–660 (open/migrate), 669–741 (write/remove/read/list);
negative gate — `scripts/verify-sql-store-second-writer.mjs`;
counter-analogs (do NOT follow for groups) — `theia/extensions/modes/src/browser/mode-service.ts`, `theia/extensions/modes/src/browser/setups-service.ts`;
read-consumer precedent — `theia/extensions/chrome-bar/src/node/chrome-bar-suggestion-service-impl.ts` (32 lines) + `theia/extensions/chrome-bar/src/browser/chrome-bar-suggestion-service.ts` (CHROME_SUGGESTION_PATH/LIMIT).

### Decision: groups persist in SQLite through the single chrome-side writer

15-CONTEXT.md commits the shape: SQL groups table
`(id, title, bounds, activeGroupId)` + `group_id` on URI-keyed tab rows;
canvas reads/writes via the single chrome-side writer path; sessionstore
stays restore-authoritative (never sessionstore-coupled — Bugzilla 1221050,
Panorama note lines 39–42). This OVERRIDES the Phase-14 §3 rule for this
data: modes/setups stay user-storage JSON; **groups are chrome-owned tab
rows, so the writer row governs, not the user-storage precedent.**

**Writer extension (copy this — PowerBrowserAPI.sys.mjs):**

```javascript
// Lines 47–57: DDL carried ONCE between markers; roundtrip gate extracts
// the marked text at check time — never a copy.
const TAB_STORE_SCHEMA_HEAD = 1;
const TABS_STORE_V1_DDL = /* PB-SQL-TABS-DDL-START */ `CREATE TABLE tabs ( … ); …` /* PB-SQL-TABS-DDL-END */;
// Lines 65–68: module-level single connection (never on the frozen object).
let tabStoreConn = null;
// Lines 596–627: openTabStore — WAL pinned OUTSIDE any transaction with
// read-back assert; version guard refuses newer-than-head loudly.
// Lines 636–660: forward migration, tableExists/indexExists pre-checks,
// DDL + version bump in exactly one executeTransaction.
// Lines 669–684: write path — bound parameters, never interpolated;
// loud errors naming method + key.
```

- Groups land as a v1→v2 forward migration: new `groups` table + `group_id`
  column, same marker idiom (new `PB-SQL-GROUPS-DDL-START/END` markers —
  planner names them), same pre-check + single-transaction + version-bump
  shape, `user_version` head bumped. New writer methods
  (`writeGroupRow`/`removeGroupRow`/`setTabGroupId`/…, planner names them)
  follow `writeTabRow`: private-tab exclusion where applicable, bound
  params, `INSERT … ON CONFLICT … DO UPDATE`, loud errors.
- New chrome methods are catalogued in `powerbrowser/INTERNAL-APIS.md`
  (`check-internals-boundary.sh --catalogue`); a second file importing a
  Firefox internal is the failure the boundary exists to prevent.

**Theia read side (copy this — tab-query-service.ts lines 51–98, 100–166):**

```typescript
// Lines 82–98: lazy readonly open; missing file → null → callers serve
// empty answers; readonly flag asserted at runtime.
new Database(join(this.profileDir, TAB_QUERY_FILE_NAME), { readonly: true })
// ^ the `readonly: true` literal MUST sit on the same line (second-writer
// gate rule (b) — a stripped flag or `readonly: false` fails naming file:line).
// Lines 100–139: never-throw reads — getByUri → undefined, listByRecency → [].
```

- Canvas reads come from NEW readonly methods on `TabQueryService`
  (`listGroups`, `getTabsByGroup`, … — planner names them): same lazy
  readonly handle, same never-throw convention (unreadable → `[]` /
  `undefined` → contracted empty/error copy, never an exception in
  UI paths), same bound-parameter + LIKE-escape discipline
  (`escapeLikePattern` + `ESCAPE '\'`, lines 43–45) for any search text.
- The suggestion-service RPC is the consumer precedent: thin backend impl
  delegating to the reader (`chrome-bar-suggestion-service-impl.ts`
  lines 17–32, incl. the LIMIT clamp) behind a path const
  (`CHROME_SUGGESTION_PATH`). A groups-read RPC follows the same file trio
  (browser contract + node impl + RPC path const) — do NOT generalize the
  suggestion path for group writes.

**Theia write side — flagged, no analog:**

- NO existing Theia→chrome mutation channel exists (modes/setups write via
  `FileService` to user-storage; the tab writer is chrome-observed only).
  Group mutations MUST reach the chrome-side writer without Theia opening
  SQLite read-write (gate rule (a): only `powerbrowser/shell/` opens
  read-write). Transport is a planner decision under these constraints;
  if it needs a live comparison, it gets a probe record per §6.
- Optimistic paint + revert-on-retry-failure (15-UI-SPEC) mirrors the
  setups `placeTabs` validate-before-touch discipline (setups-service.ts
  lines 394–399): never leave a half-applied state unexplained.

### What to avoid (hard)

- NEVER `new Database(` / `new DatabaseSync(` / `openConnection` /
  `Services.storage` / `openDatabase` outside `powerbrowser/shell/`
  (second-writer gate fails naming file:line); NEVER open profile SQLite
  from Theia except the `readonly: true` reader extension.
- NEVER store groups in `modes.json`/`setups.json` or any new user-storage
  JSON (wrong owner, wrong process — 14-PATTERNS §3 reasoning inverted:
  groups ARE chrome-observed tab rows).
- NEVER couple to sessionstore extData (Panorama removal lesson); NEVER add
  `group_id` handling that parses the URI (keys are opaque — `browserTabKey`
  one-line rule, PowerBrowserAPI.sys.mjs lines 574–583).
- Thumbnails: NO capture analog exists in-tree (substrate note proposes PNG
  last-view snapshots as future work; no `captureToCanvas`/thumbnail code
  found). Capture is chrome-side (planner designs it); Theia renders the
  PNG (or data-URL/file URL the writer publishes) with the text block
  painting first and filling in — never a per-card spinner or blank frame.

---

## 5. Derive-and-compare gate idiom — canvas/view/persistence rows

**Analogs (tracked):** `scripts/verify-registry-shape.mjs` (structure model);
`scripts/verify-chrome-bar-commands.mjs` (id-derivation + const discipline);
`scripts/verify-mode-toggle-commands.mjs` (defaults + order + negated search);
`scripts/verify-setup-roundtrip.mjs` (schema/ids/labels/copy + node JSON roundtrip);
`scripts/verify-sql-store-second-writer.mjs` (negative scan — already guards the writer);
`scripts/verify-platform.sh` lines 3698–3764 (the ONLY registration point — two rows per check).

### What to copy — structure (registry-shape lines 41–63, 73–126, 139–155)

1. ONE hand-kept `EXPECTED` const (canvas command ids, view-toggle literals,
   group-schema fields, contracted copy verbatim). Editing it IS the
   deliberate-change process.
2. Actual set DERIVED at check time from sources (regex like `derivedIdsOf`
   lines 64–71; DDL text between markers; interface field blocks) — never a
   second hand-kept list.
3. Set-equality `diff` both directions — surplus AND missing reported BY NAME.
4. Non-vacuity guards: empty derivation fails as broken instrument, never
   clean. Failure messages name the fix.
5. `--self-test`: green-first control, planted addition + removal (plant
   asserted to have landed), each required to go red NAMING the drift.
6. Honestly `--quick`: text reads (+ mkdtemp fixtures) only — no build, no
   browser, no display, no network. Say so in the header.
7. Registration — append two rows per check beside the `gui09-*` pair
   (verify-platform.sh lines 3747–3764), e.g.:

```bash
"gui08-panorama-<what>|node $REPO_ROOT/scripts/verify-panorama-<what>.mjs"
"gui08-panorama-<what>-self-test|node $REPO_ROOT/scripts/verify-panorama-<what>.mjs --self-test"
```

### Candidate new rows (planner picks; all static/`--quick`-eligible)

- **Canvas command registry shape** (commands-gate mirror): expected
  panorama command ids derived from the new commands source as set
  equality + contracted labels verbatim (`New Group`, `Close Group`,
  `Close group` tooltip) + labelless toggle-only commands asserted
  labelless + call-site const-import discipline (widget imports consts,
  never re-spells strings).
- **Group-schema shape** (roundtrip-gate mirror): groups DDL derived from
  the writer source between the new markers + `group_id` column presence +
  schema-head bump, compared as set equality; node JSON roundtrip over
  group create/rename/move/resize/close covering the 60-char cap, empty
  revert, duplicate-allowed rule, corrupt-degrades-to-empty, dropped
  write-reverts-paint — 3-plant self-test (dropped field, removed command
  id, label drift).
- **Canvas/view copy gate** (or extend `verify-shell-error-copy.mjs` if the
  harness fits): every contracted 15-UI-SPEC string derived from sources
  vs EXPECTED literals verbatim (empty headings/bodies, tray captions,
  error bars + `Retry`, close confirmation singular/plural, flash).
- **View-parity + interaction backstops** (15-UI-SPEC held-out rows):
  auto-box on drop, canvas/tree parity after every mutation + flip,
  close-group exactness — flat `{ statement, verification: backstop }`
  scalars; at verify time no explicit evidence → `insufficient_spec` →
  `human_needed`, never a silent pass.

### What to avoid

- Never a sibling driver (`verify-phase-*.sh` deleted, must not come back).
- Never assert on the ABSENCE of a log line unless proven emitted by the
  code under test (CLAUDE.md rule 1).
- Never hand-keep the expectation the check compares (rule 2) — derive,
  then compare as set equality, red on addition AND removal.
- Never read compiled `lib/` artifacts — TypeScript sources (+ DDL markers).
- Never ship a check without its `--self-test` row. Stage new scripts
  before trusting any scan (`git ls-files` iteration).

---

## 6. Decision-record idiom — only if a probe is needed

**Analogs (tracked):**
`.planning/phases/13-chrome-bar-strip-relocation-spike/13-SPIKE-STRIP-RELOCATION.md` (400 lines, RED — binding-verdict model);
`.planning/phases/14-modes-windows-setups/14-PROBE-DEPENDENT-WINDOWS.md` (400 lines, GREEN — routing model).

### When Phase 15 needs one

A record is written ONLY if a plan decision hinges on a live observation.
Candidates: the Theia→chrome group-mutation transport choice (§4, if two
mechanisms are live); the PNG capture mechanism (if capture fidelity is
decisive); headed drag/zoom behaviour the UI-SPEC holds as backstops.
Purely static choices (class names, copy, gate shape) NEVER get a record.

### Structure to imitate

| Spike section | What it contains |
|---|---|
| Title + header block (13-SPIKE lines 1–21; 14-PROBE lines 1–26) | Plan/Task, Decision ref, Run (host, date, pins: Theia `1.74.1`, ESR tag, `objdir/dist/bin/powerbrowser --version`), binary/app under test, one-line **Verdict** (GREEN routes build, RED routes fallback — both binding) |
| What was changed (13-SPIKE lines 25–50) | Enumerated edits, scaffolding named as scaffolding, shipped-tree-clean proof; harness = untracked scratch (`.tmp-*/`), never staged, removed at closeout |
| Build | Command, exit code, timing vs budget; Theia builds seconds-scale, never a Gecko build |
| Instrumentation note | Discarded instruments named with cause; harness bugs corrected visibly |
| Observations 1..N | Numbered, prediction-vs-observed + verbatim evidence |
| Constraints found | Neither predicted nor blocking, recorded anyway |
| Summary table | Question → Answer, one row per plan question |
| Artefacts | Harness = scratch, not committed; verdict committed |
| Correction | Wrong inferences corrected in place, reasoning visible |
| Ratification | Land-as-probed / fallback table, binding constraints, guard check |
| Proofs | `diff-theia-core.sh --quick` output, `git -C upstream diff` empty, shipped-tree clean |

The verdict line pattern (copy the voice):

```
Verdict: GREEN — <mechanism> <observed behaviour>; <fallback> is not taken.
Verdict: RED — <mechanics result>, but <pillar> is unprovable by its ratified
instrument: <cause>. Fallback: <route>; <what still ships>.
```

- A RED verdict still binds (13-01: strip stays top, modes still ship).
  Phase-15 equivalent: if a transport/capture probe goes RED, the record
  names the fallback route and what still ships — never silent scope.
- A verdict gate (`verify-strip-spike-verdict.mjs` precedent) guards a
  RED/GREEN record mechanically only if a later plan could silently
  re-litigate it; otherwise the record + UI-SPEC backstop rows suffice.

### What to avoid

- No probe writes under `theia/` or `scripts/` (verdict gate fails naming
  the file).
- No Gecko touch (`git -C upstream diff` empty); never hand-edit a patch
  hunk (regenerate from a patched tree).
- No package-manager installs inside a probe plan.
- Verdict is a decision artifact, not user-facing copy — but every
  user-facing string the probed feature adds follows the copy contract
  (product named "Power Browser", plain language, real on-screen next
  step, zero internal identifiers).

---

## Shared patterns (apply to every Phase 15 plan)

- **User-facing copy** — "Power Browser", plain-language problem, next step
  that is a real on-screen affordance, zero internal identifiers (no pref
  key, table name, `group_id`, bounds, URI-scheme internals, raw exception
  text). Long names wrap in the Close Group dialog, never truncate there.
- **No-internals boundary** — Firefox internals only via
  `powerbrowser/shell/PowerBrowserAPI.sys.mjs`, catalogued in
  `powerbrowser/INTERNAL-APIS.md`; enforced by
  `scripts/check-internals-boundary.sh` (`--self-test`, `--catalogue`).
  Theia side adds no second boundary file.
- **One driver, one registry** — `scripts/verify-platform.sh`; `--quick` is
  the commit gate; new checks are rows + self-test rows (§5).
- **No fork / no patch-stack escape** — Theia consumed as pinned
  `@theia/*@1.74.1` deps (`diff-theia-core.sh`); Gecko touched only via
  `patches/` regeneration (`check-patch-surface.sh`,
  `apply-patches.sh --self-test`).
- **Residual-brand scan still gates** — stage new files before trusting a
  green scan (`git ls-files` iteration); originating-product token only in
  `inventory/brand-tokens.json`.
- **Total parsing everywhere** — unknown fields dropped, corrupt degrades
  to contracted empty/error copy, failures leave current state untouched,
  restore/apply validates before touching the session (mode-service.ts
  `parseModeStore` lines 92–151; setups-service.ts `parseSetupStore` lines
  208–235; tab-query-service.ts never-throw reads). Group + thumbnail
  parsing follows the same discipline.
- **Destructive-action discipline** — Close Group is the ONLY destructive
  action: contracted confirmation, no undo,exact tab-set closure, activity
  never rests on a removed box, closing the last box lands on contracted
  empty copy. Everything else (toggle flip, drag cancel via Esc, rename
  cancel, zoom) is non-destructive and confirmation-free.

## No analog found

| Need | Role | Data flow | Reason / substitute |
|---|---|---|---|
| Theia→chrome group-mutation transport | channel | request-response | No Theia-initiated SQLite-write channel exists. Planner designs under §4 constraints; probe per §6 only if two mechanisms are live. |
| PNG last-view capture | chrome capture | file-I/O | No capture code in-tree (substrate note only). Chrome-side capture; Theia renders with text-first fallback. |
| Freeform canvas DnD/resize/zoom | view | event-driven | No DnD/canvas code in-tree (placeholder explicitly carried none). Hand-rolled per Panorama note; no library. |
| Groups table + `group_id` migration | migration | batch | No v2 migration exists yet. Follow §4 writer-extension shape (markers, pre-checks, single transaction). |

## Metadata

**Analog search scope:** `theia/extensions/modes/src/browser/*`,
`theia/extensions/chrome-bar/src/{browser,node}/*`,
`theia/extensions/tab-uris/src/node/tab-query-service.ts`,
`powerbrowser/shell/PowerBrowserAPI.sys.mjs`,
`scripts/verify-{registry-shape,chrome-bar-commands,mode-toggle-commands,setup-roundtrip,sql-store-second-writer,strip-spike-verdict}.mjs`,
`scripts/verify-platform.sh` CHECKS registry,
`.planning/phases/13-chrome-bar-strip-relocation-spike/13-PATTERNS.md`,
`.planning/phases/14-modes-windows-setups/14-PATTERNS.md`,
`13-SPIKE-STRIP-RELOCATION.md`, `14-PROBE-DEPENDENT-WINDOWS.md`,
`.planning/notes/{browser-organising-panorama,tab-sql-substrate}.md`,
14 `REVIEW-FIX.md` WR-10, 15-CONTEXT.md + 15-UI-SPEC.md,
`.claude/skills/sketch-findings-Power-Browser/sources/themes/default.css`.
**Files read:** 17 source/script/config/skill files + 14-PATTERNS.md + spike/probe records + CONTEXT/UI-SPEC/notes.
**Pattern extraction date:** 2026-09-06
