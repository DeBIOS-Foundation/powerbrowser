---
phase: 13-chrome-bar-strip-relocation-spike
fixed_at: 2026-09-06T04:43:46Z
review_path: .planning/phases/13-chrome-bar-strip-relocation-spike/REVIEW.md
iteration: 1
findings_in_scope: 10
fixed: 10
skipped: 0
status: all_fixed
---

# Phase 13: Code Review Fix Report

**Fixed at:** 2026-09-06T04:43:46Z
**Source review:** .planning/phases/13-chrome-bar-strip-relocation-spike/REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 10
- Fixed: 10
- Skipped: 0

**Verification location:** main checkout (`.planning/config.json`
`workflow.use_worktrees` is `false`, so no isolated worktree was created;
all gates ran against the tree as committed).

## Fixed Issues

### WR-01: RPC-supplied `limit` reaches `LIMIT ?` with no server-side clamp

**Files modified:** `theia/extensions/chrome-bar/src/node/chrome-bar-suggestion-service-impl.ts`
**Commit:** e38eae3
**Applied fix:** `searchByPrefix` now clamps the RPC-supplied limit to
`[1, CHROME_SUGGESTION_LIMIT]` (`Number.isFinite` guard fails closed to the
cap for NaN/Infinity/undefined), so `LIMIT -1` unbounded is impossible; the
prefix is additionally coerced and sliced to 256 chars to bound the `%...%`
scan. Logic proof run for -1/0/3.7/8/1000/NaN/Infinity/undefined (all clamp
as contracted); transpile OK; suggestions gate + self-test + full
`verify-platform.sh --quick` all PASS.

### WR-02: `runCommand` awaits `executeCommand` with no catch — blocked-popup throw becomes an unhandled rejection

**Files modified:** `theia/extensions/chrome-bar/src/browser/chrome-bar-widget.tsx`
**Commit:** db6140b
**Applied fix:** `runCommand` now try/catches `executeCommand`, logging via
the file's own `console.error('[@powerbrowser/chrome-bar] command failed:', ...)`
idiom, with `this.update()` unconditional afterwards. Behaviour proof:
rejected execute still runs update. Transpile OK; commands + suggestions
gates + full `--quick` PASS.

### WR-03: Activation gate is file-granular — a same-file `window.open` still passes

**Files modified:** `scripts/verify-chrome-bar-suggestions.mjs`
**Commit:** a6da1c5
**Applied fix:** Cheap structural fix, no behaviour risk: extracted pure
`checkActivationSources(entries)`; a bare `window.open(` now fails in EVERY
file even when `OpenerService` is mentioned elsewhere (verified zero
legitimate `window.open` exists under `theia/extensions/chrome-bar` — the
ratified channel lives in tab-uris). Extended `--self-test` with three
activation proofs (same-file bypass goes red naming `window.open`;
routed-only stays routed-green; live tree is routed-green, 1 file).
Gate + self-test + full `--quick` PASS.

### WR-04: Verdict gate's shipped-tree check sees Added files only and anchors on a grep

**Files modified:** `scripts/verify-strip-spike-verdict.mjs`
**Commit:** c5fb11f
**Applied fix:** (a) `--diff-filter=A` → `--diff-filter=AM`, so a plan edit
to an already-shipped file is caught; per-file note reworded to
`(changed in ...)`. (b) Commit derivation anchored to
`--grep='^docs(13-01)' --grep='^fix(13-01)'` subject-line prefixes instead of
the bare `13-01` substring. Proven against the live repo: anchored set is
byte-identical to the old set (no plan commit lost), none of the `fix(13)`
follow-ups can join it, and no AM path under `theia/`/`scripts/` exists in
the plan commits (gate stays green). Added `--self-test` shipped-tree proofs
(injected path goes red naming the file; live anchored derivation is
non-vacuous). Gate + self-test + full `--quick` PASS.

### IN-01: `ChromeBarWidget` lacks `@injectable()` — every sibling carries it

**Files modified:** `theia/extensions/chrome-bar/src/browser/chrome-bar-widget.tsx`
**Commit:** f147621
**Applied fix:** One line: `@injectable()` above the class (import already
present). Zero behaviour change on pinned inversify 6.2.2. Transpile OK;
commands + suggestions gates + full `--quick` PASS.

### IN-02: CSS header contradicts the file on caption typeface

**Files modified:** `theia/extensions/chrome-bar/src/browser/chrome-bar.css`
**Commit:** ed8a142
**Applied fix:** Header reworded to the deferred-to-inheritance decision
(captions inherit theme type; even naming the code variable is deferred per
the caption rule's own comment). Comment-only; no new tokens a typeface grep
could trip. Gates + full `--quick` PASS.

### IN-03: `searchByPrefix` is a contains search, not a prefix search

**Files modified:** `theia/extensions/tab-uris/src/node/tab-query-service.ts`
**Commit:** 5f470d4
**Applied fix:** Documented on the reader (source of truth): "Prefix" names
the user's typed input, matched anywhere in either column (substring
semantics, never anchored). Comment-only — the rename alternative was
declined as non-one-line churn across interface/impl/gates/tokens.
Suggestions gate + self-test + full `--quick` PASS.

### IN-04: Cross-layer type imports rely on incidental tsc elision instead of `import type`

**Files modified:** `theia/extensions/chrome-bar/src/browser/chrome-bar-suggestion-service.ts`, `theia/extensions/chrome-bar/src/browser/chrome-bar-widget.tsx`, `theia/extensions/chrome-bar/src/node/chrome-bar-suggestion-service-impl.ts`
**Commit:** 99da0f7
**Applied fix:** All three type-only `TabQueryRow` imports converted to
`import type` (impl's shared line split so the `TabQueryService` value
import stays a value import). Proven via transpile emit: browser files carry
no runtime `tab-query-service` reference. Accepted remainder: the backend
`CHROME_SUGGESTION_PATH` value import needs a `common/` move — recorded as
accepted (non-one-line, same carve-out the backend module already operates
under). Gates + full `--quick` PASS.

### IN-05: Stale engine/method wording in gate comments

**Files modified:** `scripts/verify-platform.sh`, `scripts/verify-chrome-bar-suggestions.mjs`
**Commit:** 702e110
**Applied fix:** "vendored engine" → "stdlib `node:sqlite` engine
(second-writer carve-out)"; "`OpenerService.open`" → "`OpenerService.getOpener`
plus `handler.open`". Comment-only. `bash -n` + `node --check` OK; gates +
full `--quick` PASS.

### IN-06: Style hook constant lives in the commands module

**Files modified:** `theia/extensions/chrome-bar/src/browser/chrome-bar-commands.ts`
**Commit:** a64178a
**Applied fix:** One-line doc extension naming the placement deliberate
(shared import with the command ids for widget/focus/stylesheet). The move
alternative was declined as non-one-line churn. Transpile OK; commands gate +
self-test + full `--quick` PASS.

## Skipped Issues

None — all findings were fixed. Accepted-without-code-change remainders are
noted inline above (IN-03 rename alternative, IN-04 `common/` move,
IN-06 relocation).

---

_Fixed: 2026-09-06T04:43:46Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
