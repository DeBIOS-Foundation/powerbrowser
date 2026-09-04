---
phase: 04-theia-surface-branding-extensions-telemetry
plan: 04
subsystem: theia-branding
tags: [theia, gen-05, tel-03, runtime-channel, endpoint-allowlist, firefox-branding]

# Dependency graph
requires:
  - phase: 02-rebrand-inputs-and-generator
    provides: scripts/generate.mjs frozen TARGETS table, config-schema validation, sink guards
  - phase: 04-theia-surface-branding-extensions-telemetry
    provides: fragment-emitter + surgical copy-over precedent (04-01), pin-gate pattern (04-02), telemetry fragment + sender (04-03)
provides:
  - "GEN-05 remainder: theme + texts + logo + repo URL on the runtime channel, zero .ts literals per rebrand"
  - "TEL-03: manifest-driven toolkit.telemetry.server + breakpad.reportURL, endpoint-allowlist coverage gate"
  - "Single-edit propagation proof (manifest-only rebrand file list)"
affects: [theia-surface-branding-extensions-telemetry, phase-06-verification-rewrite]

# Actuals — pairs with the plan's estimate to calibrate future estimates.
actuals:
  tokens: 31000
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns: ["manifest-marked allowlist entries (opt-in provenance for the stale direction)"]

key-files:
  created: [scripts/verify-theia-branding.mjs, scripts/verify-theia-endpoints.mjs, generated/theia-branding.json, generated/endpoint-hosts.json, theia/extensions/branding/src/browser/powerbrowser-branding-config.ts]
  modified: [scripts/generate.mjs, scripts/lib/config-schema.json, scripts/verify-branding-preflight.mjs, scripts/verify-platform.sh, theia/extensions/branding/src/browser/powerbrowser-welcome-widget.tsx, theia/extensions/branding/src/browser/powerbrowser-about-dialog.tsx, theia/extensions/branding/src/browser/powerbrowser-favicon-contribution.ts, theia/extensions/branding/src/browser/powerbrowser-mark.ts, theia/applications/browser/package.json, powerbrowser/branding/dev/pref/firefox-branding.js, powerbrowser/branding/release/pref/firefox-branding.js, powerbrowser/endpoint-allowlist.json, inventory/brand-tokens.json]

key-decisions:
  - "LOGO RIDES JSON AS TEXT (D-04-04-01): the mark SVG is text, so it rides the channel as a string key; the 04-01 binary-channel concern never applied to it. PNG rasters stay in the Phase-3 icon pipeline."
  - "ONE FRAGMENT PER BRAND-OWNED KEY (D-04-04-02): theia-branding.json is a new TARGETS row for powerbrowserBranding (04-03 precedent); frontend-config is extended in place with defaultTheme."
  - "REPO URL REUSED, HOMEPAGE EXCLUDED (D-04-04-03): no urls.support_url key (installer.support_url IS the one support URL); product.homepage is metadata, not a contacted surface, so it feeds no coverage."
  - "SHIPPED TEXTS NULL (D-04-04-04): welcome/about ship unset and render no element; no UI copy invented. Fixture values prove the channel."
  - "CRASH PREF CONFIRMED AT firefox.js:1551 (D-04-04-05): breakpad.reportURL lives in browser/app/profile/firefox.js, not all.js; always emitted (blank default closes the stock Mozilla URL)."
  - "STALE DIRECTION SCOPED TO MARKED ENTRIES (D-04-04-06): full-set equality against the 23-host allowlist is impossible; entries carrying a manifest field must track their key."
  - "DERIVATION OWNED BY generate.mjs (D-04-04-07): mozillaEndpointPrefs is the single source; allowlist expects are layer-1's comparand; the new check asserts they stay in sync."
  - "THEME STRING PASSTHROUGH (D-04-04-08): manifest carries the string form; unset omits the key rather than restating Theia's default pair."

patterns-established:
  - "Manifest-marked allowlist entries: an allowlist host with a `manifest` dotted-key field must equal that key's current host (unset or repointed goes red as stale); unmarked entries stay owned by BRAND-04 product decisions."

requirements-completed: []

# Coverage metadata — drives DETERMINISTIC UAT routing in verify-work.
coverage:
  - id: D1
    description: "Theme, texts, logo and repo URL ride the runtime channel; rebrand needs no .ts edit"
    requirement: "GEN-05"
    verification:
      - kind: unit
        ref: "scripts/generate.mjs --self-test (bad theme id, markup welcome text, bad crash URL, branding + endpoint controls; 39 cases)"
        status: pass
      - kind: unit
        ref: "scripts/verify-theia-branding.mjs + --self-test (3 plants red-naming)"
        status: pass
      - kind: unit
        ref: "scripts/verify-branding-preflight.mjs + --self-test (20 plants red-naming)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Welcome, about, favicon and theme show fixture values after an app-bundle rebuild"
    requirement: "GEN-05"
    verification: []
    human_judgment: true
    rationale: "Static gates prove emission, read sites, fallbacks and the theme passthrough, but no app-bundle rebuild or live render ran in this static pass — the fixture rebrand drill is deferred to end-of-roadmap verification (see Deferred Live Drill)."
  - id: D3
    description: "Mozilla telemetry/crash prefs driven from the manifest; every manifest host allowlisted"
    requirement: "TEL-03"
    verification:
      - kind: unit
        ref: "scripts/verify-theia-endpoints.mjs + --self-test (absent-host and stale-entry plants red-naming)"
        status: pass
      - kind: unit
        ref: "scripts/verify-generated-identity.mjs (33 files byte-identical incl. regenerated pref files)"
        status: pass
      - kind: unit
        ref: "propagation drill: fixture manifest fails the coverage check naming both new hosts until allowlisted"
        status: pass
    human_judgment: false
  - id: D4
    description: "Repointed prefs hold on the installed build (verify-endpoints layer 1 green with telemetry on)"
    requirement: "TEL-03"
    verification: []
    human_judgment: true
    rationale: "Layer 1 needs the built binary (tier-3 Gecko build); the pref agreement is proven statically by the new check, but the installed-file assertion never ran — same deferred drill as D2."

# Metrics
duration: 19min
completed: 2026-09-04
status: complete
---

# Phase 04 Plan 04: Wiring Close-Out Summary

**Theme, texts, logo and repo URL ride the 04-01 runtime channel with compiled fallbacks; Gecko telemetry/crash prefs are manifest-driven; a new gate keeps every manifest host allowlisted — proven by a manifest-only drill that touched zero `.ts` files.**

## Performance

- **Duration:** ~19 min
- **Started:** 2026-09-04T07:13:26Z
- **Completed:** 2026-09-04T07:32:07Z
- **Tasks:** 3 of 3
- **Files modified:** 16 tracked (5 created, 11 modified) + 2 generated (gitignored)

## Accomplishments

- Schema carries `[theia]` welcome/about texts (sink-safe plain-text pattern) + `[urls]` release_notes/update/crash_report/homepage/search (https pattern); `default_theme` constrained to Theia's four builtin ids in `validateTheia` (no schema regex, enum-by-design like the telemetry level).
- Generator emits an extended frontend-config fragment (`applicationName` + `defaultTheme`), a new `theia-branding.json` fragment (texts, repo URL, verbatim mark SVG), and a new `endpoint-hosts.json` fragment (sorted manifest hosts) — 51 TARGETS rows, `--check` green.
- Welcome widget, about dialog and favicon read every display value through one shared reader with compiled fallbacks; the OS-`prefers-color-scheme` favicon vs `currentColor` in-shell split survives (channel SVG carries the dual fill; the transform is shared); `view:welcome` factory id, guarded `AboutDialog` rebind and first-boot-only layout untouched.
- `emitFirefoxBrandingJs` splices `toolkit.telemetry.server` (blank when off, endpoint verbatim when set) and `breakpad.reportURL` (blank when unstated, crash URL verbatim when set) at an anchor line; tracked pref files regenerated through the emitter; byte-identity green on the shipped manifest.
- New `verify-theia-endpoints.mjs` (--quick): fragment pin, coverage (missing names the host), marked-entry staleness (both directions, no hand-kept list), driven-pref agreement with the allowlist (the single-source rule); `--self-test` with both plan-mandated plants.
- New `verify-theia-branding.mjs` (--quick): fragment pins + tracked block/key equality + `tsc -b`; `--self-test` with 3 red-naming plants.
- Preflight sections 11–13: about name triple, widget/favicon channel reads, repo-fallback pin derived from the inventory domain, theme value pin against a new `brand_display_expectations.theia` entry, no-geometry-restatement rule; 10 new self-test plants (20 total), each observed red.
- Full `verify-platform.sh --quick` green with all four new rows, each also passing via `--only` alone.

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema `[urls]` + remaining `[theia]` keys; theme/logo/about onto the channel** - `7ffca72` (feat)
2. **Task 2: Manifest-driven Mozilla telemetry/crash prefs + allowlist coverage check** - `bac86ba` (feat)
3. **Task 3: Single-edit propagation proof + phase gate** - `81c47ea` (feat)

**Plan metadata:** pending final docs commit (this SUMMARY).

## Files Created/Modified

- `scripts/lib/config-schema.json` - Seven new keys: `theia.welcome_text/about_text` (plain-text pattern), `theia.default_theme` (no pattern; enum in code), `urls.release_notes/update/crash_report/homepage/search` (https pattern). No `urls.support_url` (reuse) by design.
- `scripts/generate.mjs` - `THEIA_THEME_IDS` + `validateTheia`; extended `emitTheiaFrontendConfig`; new `emitTheiaBranding`, `mozillaEndpointPrefs`, `manifestEndpointSources/Hosts`, `emitEndpointHosts`; driven `emitFirefoxBrandingJs` with `DYNAMIC_PREF_ANCHOR`; two new TARGETS rows (51 total); 5 new self-test cases (39 total); header/count comments corrected (including the stale "Forty-eight" the 49-row tree carried).
- `generated/theia-branding.json`, `generated/endpoint-hosts.json` - NEW (gitignored): branding map (null texts shipped) and `["powerbrowser.org"]` on the shipped manifest.
- `theia/extensions/branding/src/browser/powerbrowser-branding-config.ts` - NEW: the one shared synchronous channel reader with narrowing.
- `theia/extensions/branding/src/browser/powerbrowser-welcome-widget.tsx` - Welcome text, repo link and mark via channel; compiled fallbacks stay; texts render as escaped React nodes only when stated.
- `theia/extensions/branding/src/browser/powerbrowser-about-dialog.tsx` - Title, about text, repo link and mark via channel with its own name fallback const; guarded rebind untouched.
- `theia/extensions/branding/src/browser/powerbrowser-favicon-contribution.ts` - Channel mark encoded exactly like the compiled twin, twin kept as fallback; still OS-driven, never the inline variant.
- `theia/extensions/branding/src/browser/powerbrowser-mark.ts` - `inlineMarkFromSvg` extracted pure; `powerBrowserMarkInline` delegates (no brand values added).
- `theia/applications/browser/package.json` - Surgical apply: `defaultTheme: "dark"` + `powerbrowserBranding` block (add-only diff).
- `powerbrowser/branding/{dev,release}/pref/firefox-branding.js` - Regenerated (copied, never hand-edited): new comment + blanked `breakpad.reportURL` line.
- `powerbrowser/endpoint-allowlist.json` - New `breakpad.reportURL` pref entry (`""`, hand-authored TEL-03 reason); `toolkit.telemetry.server` reason notes the manifest-driven tracking.
- `scripts/verify-theia-endpoints.mjs`, `scripts/verify-theia-branding.mjs` - NEW gates + self-tests (see above).
- `scripts/verify-branding-preflight.mjs` - Sections 11–13 + 10 new plants (20 total).
- `scripts/verify-platform.sh` - `theia-branding` and `theia-endpoints` pairs; generate fault enumeration 34 → 39.
- `inventory/brand-tokens.json` - `brand_display_expectations.theia.default_theme = "dark"`; `pref("` frozen count 67 → 69 (the two new breakpad lines, COUNT MOVED by name).

## Decisions Made

### D-04-04-01 (logo rides JSON as text)
The 04-01 summary left the logo BINARY channel open because a PNG cannot ride a JSON string. The mark SVG is text, so it rides as the `markSvg` string key read from `brand/mark.svg` at emit time — no new channel, no new module. PNG rasters stay sourced from the same file through the Phase-3 icon pipeline, untouched.

### D-04-04-02 (one fragment per brand-owned key)
`theia-branding.json` is a new TARGETS row for the `powerbrowserBranding` key (04-03's `powerbrowserTelemetry` precedent: separate fragments, one copy-over region, distinct keys). `theia-frontend-config.json` is extended in place with `defaultTheme` (upstream keys stay in the upstream-keyed fragment).

### D-04-04-03 (repo URL reused; product homepage excluded)
There is no `urls.repo_url` key: `installer.support_url` (falling back to `product.homepage`) IS the one support URL — one setting, one path. `product.homepage` feeds no coverage derivation: it is product metadata, not a contacted surface. `installer.support_url` does, as the rendered in-app link target whose host the allowlist already tracks.

### D-04-04-04 (shipped texts null)
`welcome_text`/`about_text` ship unset and render no element, rather than inventing UI copy the manifest never stated. An explicitly emptied string fails validation naming the key (the pattern needs 1+ chars). Fixture values in the drill prove the render path.

### D-04-04-05 (crash pref confirmed at firefox.js:1551)
`breakpad.reportURL` lives in `upstream/browser/app/profile/firefox.js:1551`, not `all.js` (which carries only `toolkit.*` crashreporter lines) — confirmed against the 1.1 GB checkout, not guessed. Always emitted: blank-by-default closes the stock Mozilla URL (omitting the line would leave it standing, since this branding file loads last and wins).

### D-04-04-06 (stale direction scoped to marked entries)
Full-set equality between manifest hosts and the 23-host allowlist is impossible (Mozilla/Google/product hosts are not manifest-derived). An allowlist host carrying a `manifest` dotted-key field must equal that key's current host; unmarked entries stay owned by BRAND-04 decisions and layer 3. The shipped allowlist carries no marked entries, so the direction is vacuous until a downstream adds its first host.

### D-04-04-07 (derivation owned by generate.mjs)
`mozillaEndpointPrefs` is the single source: the emitter splices it into the pref files, and the new check asserts the allowlist `expect` entries equal it. `verify-endpoints.sh` layer 1 is untouched (still a static compare needing the built binary); disagreement now goes red in `--quick` in seconds via the new check instead of after a tier-3 build.

### D-04-04-08 (theme string passthrough)
The manifest carries the string form only; Theia's `DefaultTheme` also accepts `{light, dark}` but no manifest key selects the pair form. Unset omits `defaultTheme` rather than restating Theia's `{light:'light',dark:'dark'}` default — restating it would fork Theia's default into this tree.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Preflight plant 2 retargeted at the runtime render line**
- **Found during:** Task 1 (post-edit `branding-preflight --self-test` red)
- **Issue:** The identifier-form plant replaced `<h3>Power Browser</h3>`, which Task 1's channel edit had already replaced with `<h3>{this.displayName}</h3>` — the mutation no longer landed, so the plant failed without proving anything.
- **Fix:** Retargeted the replace at the runtime render line; the section-6 leak pattern still rejects the planted identifier.
- **Verification:** `--self-test` PASS (then 20/20 after Task 3 additions).
- **Committed in:** `7ffca72`

**2. [Rule 1 — Bug] Branding self-test control read the wrong `<svg` prefix**
- **Found during:** Task 1 (`generate --self-test` red on the new control)
- **Issue:** The control searched for lines starting with `<svg>` (with closing bracket); the element line starts with `<svg xmlns=` — the fault was the control's, not the emitter's.
- **Fix:** Prefix `<svg`, matching the emitter and the preflight derivation.
- **Verification:** `--self-test PASS — 39 planted faults`.
- **Committed in:** `7ffca72` (fixed before commit; recorded here for completeness)

**3. [Rule 3 — Blocking] Residual-scan frozen count 67 → 69**
- **Found during:** Task 2 (`scan-brand-residue` red after staging)
- **Issue:** The `pref("` frozen row counts pref statements in both branding pref files; the new `breakpad.reportURL` line (+1 per variant) moved the count by name.
- **Fix:** `expected_count` 67 → 69 with a COUNT MOVED reason citing the TEL-03 line (the `%content/branding/` 2 → 3 precedent).
- **Verification:** Scan PASS over 132 files.
- **Committed in:** `bac86ba`

**4. [Rule 1 — Bug] Endpoint self-test crashed on missing fixture dirs**
- **Found during:** Task 2 (self-test ENOENT with stack trace)
- **Issue:** Two fixture writes targeted nested paths (`generated/`, `powerbrowser/`) without creating the directories first.
- **Fix:** `mkdirSync` before the fragment write; `copyInto` (which creates parents) before the allowlist overwrite.
- **Verification:** `--self-test PASS — 2 planted faults`.
- **Committed in:** `bac86ba` (fixed before commit; recorded here for completeness)

**5. [Rule 1 — Bug] Favicon plant reshaped after comment-collision discovery**
- **Found during:** Task 3 (19/20 preflight plants green)
- **Issue:** The plant removed the code read of `markSvg`, but the favicon's own comment names `powerbrowserBranding.markSvg` — the token survived in prose, so the presence assertion could not discriminate code from comment.
- **Fix:** The plant now renames the `readBrandingConfig` calls (a token no comment carries), mirroring the widget/about plants; the assertion checks both tokens so coverage is intact either way.
- **Verification:** `--self-test PASS` (20/20).
- **Committed in:** `81c47ea` (fixed before commit; recorded here for completeness)

---

**Total deviations:** 5 auto-fixed (2 missing/blocking instrumentation, 3 bug-class)
**Impact on plan:** All required for the plan's own gates (a red self-test or scan at any commit would have broken the phase gate). No scope creep: no new manifest keys beyond the plan's list, no layer-1 rewrite, no `toolkit.telemetry.server_owner` handling (observed adjacent, left alone — out of scope).

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: runtime-markup | theia/extensions/branding/src/browser/powerbrowser-welcome-widget.tsx, powerbrowser-about-dialog.tsx, powerbrowser-favicon-contribution.ts | The mark SVG now flows from `brand/mark.svg` through generated JSON into `dangerouslySetInnerHTML` (in-shell, via the shared currentColor transform) and `encodeURIComponent` data URIs (favicon). Bounds: source is the tree's own `brand/mark.svg` (same trust as the compiled twin it replaces as the render source); manifest TEXTS never take this path (escaped React nodes only); a downstream's mark.svg is its own tree content. No new network egress: shipped texts/endpoint unset, telemetry level off. |

## Propagation Drill (Task 3.1 — the GEN-05/TEL-03 acceptance in miniature)

From a clean tree, the ONLY hand-edited file was `configuration.toml`: `display_name` → "Acme Browser", `[theia]` theme → "light" + `welcome_text`, `[telemetry]` level → "all" + endpoint, `[urls]` crash_report added, one temporary `[[extensions]]` entry. Then `node scripts/generate.mjs` → surgical block apply → regenerated pref-file copy. `git status` showed changes ONLY under:

- `configuration.toml` (the one hand edit)
- `generated/` (gitignored: all five fragments regenerated)
- `theia/applications/browser/package.json` (surgical blocks: applicationName, defaultTheme, powerbrowserBranding, powerbrowserTelemetry, theiaPlugins)
- `powerbrowser/branding/{dev,release}/pref/firefox-branding.js` (regenerated comparands: server + reportURL repointed)

No second hand-edited file. Fixture values verified in fragments (`Acme Browser`/`light`/texts/endpoint/plugin URL); `grep -rn "Acme Browser" theia/**/src` empty (zero `.ts` edits — the name reaches the tree only through the surgical block); prefs carried the repointed URLs. Per-plan reds observed: reverted-branding-payload → `--check` FAIL naming `generated/theia-branding.json` (line 2); fixture endpoint hosts → coverage check FAIL naming `collector.example.org` + `crash.example.org` until allowlisted (proves the check reads the manifest); rendered display literal → preflight FAIL naming the file and line (plant 11). Drill fully reverted (`checkout` + regenerate, `--check` green, shipped fragments restored).

## Deferred Live Drill (for end-of-roadmap verification)

Not run in this plan (no app-bundle build or browser boot in the autonomous static pass — same deferral as 04-01..04-03, hence `requirements-completed: []`). Exact drill:

```sh
# 1. Fixture rebrand (edit + revert, as in the propagation drill above):
#    display_name + welcome_text + theia.default_theme + logo (brand/mark.svg
#    replaced with a square fixture SVG) + telemetry.level/endpoint + one
#    [urls] value + one real [[extensions]] entry (bootstrapped pin)
node scripts/generate.mjs   # expect theia-branding.json to carry the fixture mark verbatim
# 2. Surgical apply: applicationName + defaultTheme + powerbrowserBranding +
#    powerbrowserTelemetry + theiaPlugins from the fragments (keys only)
# 3. Copy generated/branding/*/pref/firefox-branding.js over the tracked files
# 4. Add the fixture hosts to powerbrowser/endpoint-allowlist.json (marked entries)
nix develop .#theia --command bash -c "cd theia && yarn build"   # app-bundle step
node scripts/verify-theia-branding.mjs      # expect PASS (pin follows the fragment)
node scripts/verify-theia-endpoints.mjs     # expect PASS (coverage follows the manifest)
# 5. Start the app, open welcome + about: fixture name/texts/mark, fixture theme,
#    favicon = fixture mark; preferences show the contributed telemetry level
# 6. Revert every fixture value, regenerate, restore package.json + pref files + allowlist
```

**Intentional gap:** the full `--gate` (browser-boot layers: verify-endpoints layers 1–3, live Theia checks) was not run — no built binary exists in this pass. Human/executor command at end-of-roadmap: `scripts/verify-platform.sh --gate` after the drill above. No WINDOWS.md entry opened for this deferral, matching 04-01..04-03 (the drill is phased verification scope, not a defect).

## Issues Encountered

- `upstream/` is present (1.1 GB checkout), which is what made the crash-pref confirmation possible without guessing: `breakpad.reportURL` stock value and readers cited by file:line. Without it the plan's "do not guess" rule would have forced a checkpoint.
- Preflight self-test fixture already copied the whole branding browser directory and the application package.json, so all ten new plants needed no fixture-shape changes — the 04-01/01-08 fixture design carried the full cost.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 4 surfaces are closed statically: every Theia display value, the default theme, the Gecko endpoint prefs and the extension pipeline are manifest-driven with pin gates on both sides. What remains is the single deferred live drill above (shared with 04-01..04-03) at end-of-roadmap verification.
- Phase 6 owns the verification rewrite: it inherits two new `--quick` gates (`theia-branding`, `theia-endpoints`) and a 20-plant preflight. The `manifest`-field convention on allowlist entries is downstream documentation material for `docs/REBRANDING.md` (with 04-02's pin-bootstrapping procedure).
- Intended follow-ups noted but not taken: `toolkit.telemetry.server_owner` still says "Mozilla" when the server repoints (adjacent pref, out of plan scope); `urls.homepage` vs `product.homepage` duality is documented in D-04-04-03.

## Self-Check: PASSED

- Created files found: `scripts/verify-theia-branding.mjs`, `scripts/verify-theia-endpoints.mjs`, `generated/theia-branding.json`, `generated/endpoint-hosts.json`, `theia/extensions/branding/src/browser/powerbrowser-branding-config.ts`.
- Task commits present: `7ffca72`, `bac86ba`, `81c47ea` (all in `git log`).
- No unexpected deletions in any task commit; working tree holds only this SUMMARY as uncommitted (verified before writing).

---
*Phase: 04-theia-surface-branding-extensions-telemetry*
*Completed: 2026-09-04*
