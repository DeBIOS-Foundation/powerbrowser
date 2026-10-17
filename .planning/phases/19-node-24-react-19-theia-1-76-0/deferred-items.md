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
