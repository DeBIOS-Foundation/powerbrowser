# Phase 19 deferred items

Out-of-scope findings logged during execution. None is fixed here.

## From 19-01

- **Stale emitted files in extension `lib/`.** `yarn build` (logs/build-19-01.log, 12 s) ran
  `tsc -b` in all seven extensions and each was already up to date, so no `lib/` file was
  rewritten. Three emitted files have no source: `theia/extensions/modes/lib/browser/organising-placeholder-widget.js`,
  `theia/extensions/modes/lib/browser/gui02-overlay-spike.js` and
  `theia/extensions/tab-uris/lib/browser/browser-tab-uri.js`. `tsc -b` does not delete them
  (19-RESEARCH Assumption A1 holds). Nothing found during this plan imports them. A `yarn clean` per
  extension before the commit-3 build would remove them, along with the ai-layout file RM-02 deletes.

## From 19-05

- **`first-boot-surface-carried` went red once at 1.76.0, then passed on the next run.** The first
  run (logs/live-19-05.log) restored main area `["view:welcome","view:disassembly-view-widget"]`
  and was missing the fixture's web tab `http://127.0.0.1:42079/carried`. The immediate re-run
  (logs/live-carried-rerun-19-05.log) restored all three and passed. This looks like a timing race
  in web-tab restoration or in the check's read of the main area; the cause was not investigated.
  19-06 runs this row in the full tier and must pass it, so a repeat there needs a root cause, not
  another re-run.
- **Stale lib files in modes and tab-uris remain.** 19-05 ran only branding's `clean`, as its plan
  specified. The three source-less files listed under 19-01 are still in `lib/`.

## From 19-06

- **The 19-05 `first-boot-surface-carried` intermittent red is root-caused and fixed (commit
  dfef881).** It is not a product regression. Web tabs come back from
  `SetupsService.applyLastSession`, which by design runs after `ready` (setups-service.ts
  `onStart`). A tight poll (logs/carried-timeline2-19-06.log) shows that at `ready` the main area
  is the core layout alone, `[view:welcome, view:disassembly-view-widget]`, which is exactly the
  failing observation. The web tab follows about 40 ms later. The check read at `ready`, so it
  raced that restore. Carried mode now waits up to 20 s for the fixture's set before it reads.
- **`.planning/codebase/STACK.md:24` still says Node.js 22** (`pkgs.nodejs_22`,
  `engines.node >= 22`). It is outside 19-06's docs file list. The next `/gsd-map-codebase`
  refresh should correct it.
- **The chrome-bar dropdown does not follow a pill that moves while the dropdown is open.**
  At 1.76.0 the top panel grows from 72 to 73 px, and the pill moves from 65.5 to 68.5 px, in the
  first ~0.5 s after the address input becomes visible (logs/dropdown-diag-19-06.log). The
  dropdown derives its geometry on render and on window resize only (chrome-bar-widget.tsx
  `renderDropdown`). A dropdown opened inside that window therefore sits 2.5 px above its
  designed anchor until the next keystroke. Opened after layout settles, it is 0.5 px from the
  anchor. This is pre-existing design, and only a sub-second boot window exposes it. A
  ResizeObserver on the pill would close it, if it ever matters.
