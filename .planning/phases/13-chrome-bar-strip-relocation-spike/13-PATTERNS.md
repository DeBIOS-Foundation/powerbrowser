# Phase 13: Chrome Bar + Strip-Relocation Spike — Pattern Map

**Mapped:** 2026-09-06
**Files classified:** 7 pattern areas (1 new extension + spike record + 2 verify rows)
**Analogs found:** 7 / 7 (all git-tracked; verified via `git ls-files`)

All analog paths below are git-TRACKED source (checked with `git ls-files`).
No mirror/untracked paths are named.

---

## 1. New `@powerbrowser/*` extension skeleton

**Closest analogs (all tracked):**

- `theia/extensions/telemetry/package.json` — minimal frontend-only skeleton (copy this base)
- `theia/extensions/customize/package.json` — cross-extension dep precedent (`"@powerbrowser/tab-uris": "0.1.0"`)
- `theia/extensions/tab-uris/package.json` — fullest shape (frontend + backend + extra dep)
- `theia/extensions/telemetry/src/browser/telemetry-frontend-module.ts` — concrete-class DI binds
- `theia/extensions/customize/src/browser/customize-frontend-module.ts` — `FrontendApplicationContribution.toService` + flag-gated binds
- `theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts` — static binds + guarded rebind idiom
- `theia/extensions/tab-uris/tsconfig.json` — tsconfig to copy verbatim
- `theia/applications/browser/package.json` (lines 37–42) — sidecar composition point
- `theia/package.json` (line 69) — hand-kept `build:extensions` list (must append)

### What to copy

**`package.json` shape** (from `theia/extensions/telemetry/package.json`, lines 1–22):

```json
{
  "private": true,
  "name": "@powerbrowser/<id>",
  "version": "0.1.0",
  "license": "MIT",
  "dependencies": {
    "@theia/core": "1.74.1"
  },
  "theiaExtensions": [
    {
      "frontend": "lib/browser/<id>-frontend-module"
    }
  ],
  "files": ["lib", "src"],
  "scripts": {
    "clean": "rm -rf lib *.tsbuildinfo",
    "build": "tsc -b"
  }
}
```

- Add only the `@theia/*` feature deps the bar needs (all pinned `1.74.1`, matching `theia/package.json` resolutions — 50 exact pins, no floats). If the bar reads tab identity, add `"@powerbrowser/tab-uris": "0.1.0"` exactly as `theia/extensions/customize/package.json` line 7 does.
- Frontend-only unless the bar needs a backend (no backend module = no `lib/node/*` entry; `token-gate/package.json` is the backend-only mirror precedent).

**`tsconfig.json`** — copy `theia/extensions/tab-uris/tsconfig.json` verbatim (composite, `rootDir`/`outDir` src→lib, `experimentalDecorators` + `emitDecoratorMetadata`, `jsx: react`, target ES2017, `strictNullChecks`).

**Frontend-module wiring** — combine three idioms:

```typescript
// From tab-uris-frontend-module.ts lines 90-91: bind statically at module load.
// ContributionProvider.getContributions() caches on first call (D-50) — a
// CommandContribution bound after first enumeration is permanently invisible.
bind(ChromeBarCommandContribution).toSelf().inSingletonScope();
bind(CommandContribution).toService(ChromeBarCommandContribution);
```

```typescript
// From customize-frontend-module.ts lines 11-12: contributions that paint on boot.
bind(ChromeBarContribution).toSelf().inSingletonScope();
bind(FrontendApplicationContribution).toService(ChromeBarContribution);
```

```typescript
// Guarded rebind (tab-uris-frontend-module.ts lines 51-55; branding module
// lines 26-30, 35-44): keeps the module loadable where the base binding is absent.
if (isBound(BaseContribution)) {
    rebind(BaseContribution).to(PowerBrowserSubclass).inSingletonScope();
} else {
    bind(BaseContribution).to(PowerBrowserSubclass).inSingletonScope();
}
```

**Sidecar composition — two edits, both required:**

1. `theia/applications/browser/package.json` dependencies block (lines 37–42): add `"@powerbrowser/<id>": "0.1.0"` alongside the five existing entries.
2. `theia/package.json` line 69 `build:extensions`: append `&& yarn --cwd extensions/<id> build`. The `workspaces` glob (`applications/*`, `extensions/*`) picks up the directory automatically, but this script is a **hand-kept list** — a new extension that forgets it never compiles.

**Config-channel read** (if the bar needs runtime values): copy the GEN-05 read-site shape from `theia/extensions/branding/src/browser/powerbrowser-branding-config.ts` lines 42–58 — synchronous `FrontendApplicationConfigProvider.get()` read, `try/catch`, narrowing (`textOrUndefined`), compiled fallback at the call site, never throws. See also `telemetry-frontend-module.ts` lines 35–44 (`readTelemetryConfig`, fail-closed to `off`).

### What to avoid

- No `backend` entry in `theiaExtensions` unless the bar genuinely needs one (keeps the token-gated backend surface unchanged).
- No new `@theia/*` version: only the pinned `1.74.1` in `theia/package.json` resolutions (UI-SPEC Registry Safety: no new packages, no new trust boundary).
- Never `bind()` a contribution lazily/after startup — D-50 makes it invisible (tab-uris-frontend-module.ts lines 83–89 comment).
- Never vendor Theia sources into the tree; consume `@theia/*` as npm deps (`scripts/diff-theia-core.sh` enforces zero changes inside `theia/node_modules/@theia/*`).

---

## 2. Toolbar / command / menu contribution idioms

**Closest analogs:**

- `theia/extensions/tab-uris/src/browser/browser-window-command.ts` — the command-contribution model (copy this)
- `theia/extensions/branding/src/browser/powerbrowser-welcome-contribution.ts` — `AbstractViewContribution` + toggle command
- `theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts` lines 41–50 — why Theia's own binding block matters (comment cites every `toService` target a rebind reaches)

**No-analog notice (verified):** `grep TabBarToolbarContribution|registerToolbar|registerMenus theia/extensions/*.ts` returns **zero** `@powerbrowser/*` hits. The chrome bar is the tree's **first toolbar-like contribution**. There is no in-tree toolbar anchor to copy — only the command half has a model. The toolbar half (`TabBarToolbarContribution` / `MenuContribution` / `ToolbarContribution` interfaces from `@theia/core`, already a pinned dep at 1.74.1) is consumed as a library API, never patched.

### What to copy

**Command per action** (from `browser-window-command.ts` lines 14–25, 60–64):

```typescript
export const CHROME_BAR_BACK_COMMAND_ID = 'powerbrowser.chrome-bar.back';
export const CHROME_BAR_BACK: Command = {
    id: CHROME_BAR_BACK_COMMAND_ID,
    label: 'Back',   // 13-UI-SPEC contracted literals: Back / Forward / Reload / New Tab
};
@injectable()
export class ChromeBarCommandContribution implements CommandContribution {
    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(CHROME_BAR_BACK, {
            execute: () => this.goBack(),
        });
    }
}
```

- Export the id as a named const (so the verify row in §5 can derive it from source instead of duplicating the string — the `verify-gui01-command.mjs` discipline).
- Labels are 13-UI-SPEC contracted copy, verbatim: `Back`, `Forward`, `Reload`, `New Tab`, `Search or enter address` (placeholder), `Coding` / `Browsing` / `Organising` (toggle order fixed). No internal identifier in any label (CLAUDE.md copy rule; `shell-error-copy-no-internals` enforces by pattern).
- `Ctrl+L` / `Cmd+L` focus-address keybinding: register via Theia's `KeybindingContribution` from `@theia/core` (same static-bind rule as commands).
- Disabled state (Back/Forward with no history, Reload with no tab): styled-dimmed with tooltip retained, never removed — layout must not shift (13-UI-SPEC). Use the command `isEnabled`/`isVisible` hooks, not DOM removal.

**Anchoring:** exactly one 40px full-bleed bar adjacent to the tab strip (menubar → tab strip → chrome bar → workarea → status bar per 13-UI-SPEC; above/below the Theia toolbar is the planner's call). Never two bars.

### What to avoid

- Do not duplicate command-id strings at call sites — import the exported const (drift-proofing per `browser-window-command.ts` header).
- Do not call `shell.addWidget(...)` directly for anything the bar opens — route through `AbstractViewContribution.openView(...)` so placement comes from the contribution's own `defaultViewOptions` (`view-open-handler.ts` header lines 9–20 explains why the `WidgetOpenHandler` base class is wrong: it hardcodes `{ area: 'main' }`).
- Do not `rebind(ApplicationShell)` — the D-27 precedent (`tab-uris-frontend-module.ts` lines 93–132) uses `WidgetManager.onDidCreateWidget` + mutable-field set instead of a rebind for the identical outcome.
- No chrome-side command registration — *"No chrome-side command is registered, and that absence is the ratified design, not an omission"* (CLAUDE.md rule 5).

---

## 3. OpenHandler + WidgetFactory idioms (only if the bar opens anything)

**Closest analogs:**

- `theia/extensions/tab-uris/src/browser/view-open-handler.ts` — bare-`OpenHandler` model (copy this)
- `theia/extensions/tab-uris/src/browser/terminal-open-handler.ts` — multi-instance + delegate-to-contribution model
- `theia/extensions/branding/src/browser/powerbrowser-frontend-module.ts` lines 16–22 — `WidgetFactory` + `bindViewContribution`
- `theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts` lines 23–28 — `registerLateOpenHandler` escape hatch

### What to copy

**Bare `OpenHandler`, never `WidgetOpenHandler`** (from `view-open-handler.ts` lines 21–32, 49–56):

```typescript
@injectable()
export class ChromeBarOpenHandler implements OpenHandler {
    readonly id = 'powerbrowser.chrome-bar-open-handler';
    // 1000 or 0, synchronously, on scheme alone — never negative
    // (Prioritizeable.isValid tests priority > 0). 1000 clears in-tree
    // bidders while leaving defaultHandlerPriority (100_000) above it.
    canHandle(uri: URI): number {
        return uri.scheme === '<scheme>' ? 1000 : 0;
    }
    async open(uri: URI, options?: OpenerOptions): Promise<object | undefined> {
        // Delegate to the contribution's own openView/open — never
        // shell.addWidget, never reimplemented placement.
    }
}
```

**Binding** (from `tab-uris-frontend-module.ts` lines 38–39, 67–68):

```typescript
bind(ChromeBarOpenHandler).toSelf().inSingletonScope();
bind(OpenHandler).toService(ChromeBarOpenHandler);
```

**WidgetFactory for a bar-owned view** (from `powerbrowser-frontend-module.ts` lines 16–22):

```typescript
bind(ChromeBarWidget).toSelf();
bind(WidgetFactory).toDynamicValue(context => ({
    id: '<factory-id>',   // the view: path addresses this id verbatim (D-43)
    createWidget: () => context.container.get<ChromeBarWidget>(ChromeBarWidget),
})).inSingletonScope();
bindViewContribution(bind, ChromeBarViewContribution);
bind(FrontendApplicationContribution).toService(ChromeBarViewContribution);
```

**Suggestion activation** navigates through the existing tab-URI rules (`OpenerService.open` / `TabUriRegistry`) — the bar never invents a new addressability scheme (13-UI-SPEC). Unknown addresses throw a caller-visible `Error` naming the handler (view-open-handler.ts lines 106–110), never a silent `undefined` no-op.

### What to avoid

- `WidgetOpenHandler` base class (hardcodes `main` area; breaks panel placement — both handler headers document this).
- Negative `canHandle` priorities (contradicts `Prioritizeable.isValid`).
- Calling `getOrCreateWidget` + `activateWidget` for a never-attached widget (silently no-ops — `view-open-handler.ts` lines 78–97 delegates to the registry's real open path instead).
- Adding `getResourceUri` to a widget to make it addressable (lights up Save-As through the saveable gate — `tab-uri-registry.ts` lines 114–120 comment; terminal is the sole sanctioned `Navigatable`).

---

## 4. Styling idiom

**Closest analogs:**

- `theia/extensions/customize/src/browser/customize-css-contribution.ts` — the CSS-layer pattern (copy this)
- `.claude/skills/sketch-findings-Power-Browser/sources/themes/default.css` — locked token values (only token source)
- `.claude/skills/sketch-findings-Power-Browser/references/chrome-bar-and-navigation.md` — pill/dropdown/motion patterns
- `theia/extensions/branding/src/browser/powerbrowser-welcome-widget.tsx` lines 114–142 — ReactWidget render without style literals (theme inheritance via `currentColor`)

**No-analog notice:** no `@powerbrowser/*` extension ships a `.css` file today (glob `theia/extensions/**/*.{css}` is empty). The bar is the first shipped stylesheet.

### What to copy

**Layer mechanics** (from `customize-css-contribution.ts` lines 82–105, 131–144):

```typescript
onStart(): void {
    this.replaceStyleElement('');   // sync empty layer: present on first paint, no flash
    this.applyCss();                // fire-and-forget — never awaited (boot-chain deadlock note)
}
protected replaceStyleElement(content: string): void {
    const previous = this.styleElement;
    const style = document.createElement('style');  // bare style element, textContent —
    style.textContent = content;                    // NOT insertRule (throws on user input),
    document.head.appendChild(style);               // NOT <link> (404 text/html refused)
    this.styleElement = style;
    if (previous) { previous.remove(); }            // append-fresh-before-remove: no unstyled frame
}
```

- Express the bar's values as **one CSS layer** inside the contribution, tokens from `sources/themes/default.css` (`--color-bg/surface/border/text/primary/success`, `--space-*` ramp, `--radius-full: 9999px` for the address pill only, `--radius-sm: 4px` for dropdown rows).
- **Delegate, don't literalize:** fonts are `var(--theia-ui-font-family)` (UI) / `var(--theia-code-font-family)` (URI captions) with `system-ui, sans-serif` / `ui-monospace, monospace` fallbacks (13-UI-SPEC). Only three sizes exist (14px body / 13px label / 12px caption); 600 weight is reserved for the active toggle segment alone.
- Icons are **codicons only** (`chevron-left/right`, `refresh`, `plus`, `lock` — supplied by Theia; `@vscode/codicons` already in `theia/yarn.lock`). No new icon set.
- Focus: `outline: 2px solid var(--color-primary); outline-offset: 2px` on every bar control (13-UI-SPEC Color/Focus).
- Motion: `transition: all 0.15s ease` baseline (sketch-locked); suggestion filtering is synchronous-feeling, row-level shimmer only past 150ms (debounce precedent: `p-debounce(..., 150)` in customize-css-contribution.ts line 80).
- Cascade: the bar layer sits **below** the `customize.css` user layer so user CSS overrides it (D-59 ordering rationale in the file header).
- Accent `#00a6f5` in exactly the three reserved uses (pill focus ring, active toggle segment fill-or-ink never both, keyboard-highlighted suggestion row) — nothing else, no second hue.

### What to avoid

- No `font-family` literal in `@powerbrowser/*` (13-UI-SPEC checker rule; shadcn `Tool: none` — a second token system forks theming and breaks rebrand-without-recompile).
- No new npm/CSS component package (UI-SPEC Registry Safety: bar, dropdown, toggle are hand-built).
- No hardcoded Theia-region geometry — the bar never resizes stock regions; strip overflow/many-tab behavior stays Theia stock (13-UI-SPEC Exceptions).
- No `font-size`/`font-weight` literal outside the 14/13/12 contract; no muted-ink-as-sole-carrier of active state (weight + accent carry it).
- No replacement error UI for navigation failures — stock `browser.xhtml`/mini-browser surfaces own them (13-UI-SPEC, same precedent as 01-UI-SPEC GUI-02).

---

## 5. Derive-and-compare gate idiom (new verify rows)

**Closest analogs (all tracked):**

- `scripts/verify-registry-shape.mjs` — the shape to imitate line-for-line (copy this)
- `scripts/verify-extension-pins.mjs` — generated-output comparison + `mkdtemp` synthetic fixture
- `scripts/verify-shell-error-copy.mjs` lines 13–62 — shape-test over derived sets + enumeration-completeness
- `scripts/verify-platform.sh` lines 3572+ `CHECKS=(...)` — the **only** place a check is registered

### What to copy

**Structure** (from `verify-registry-shape.mjs`):

1. **One hand-kept `EXPECTED` const** (lines 55–71) — the declared contract; editing it *is* the deliberate-change process (shows in the diff for review).
2. **Actual set derived at check time** from the tree (`exportedNamesOf` regex lines 74–81; `publicMembersOf` indentation parse lines 91–116) — never a second hand-kept list (header lines 17–31: a probe list *"silently stops testing anything the moment it goes stale"*).
3. **Set-equality `diff`** both directions (lines 119–126): surplus (addition) and missing (removal) reported **by name**.
4. **Non-vacuity guards** (lines 139–143, 153–155): zero derived members fails as *"broken instrument"*, never passes as clean.
5. **`--self-test` with planted faults in both directions** (lines 179–250): baseline-green-first control, then planted addition + planted removal (registry-shape plants 4: export add/remove, member add/remove); each plant asserts the source mutation actually landed, then requires red **naming** the drift.
6. **Honestly `--quick`**: reads text sources only — no build, no browser, no display, no network (header lines 32–35). Say so in the header.
7. **Failure messages name the fix**: e.g. lines 258–260 tell the reader to edit `EXPECTED` in the same commit.

**Registration** — append two rows to `CHECKS` in `scripts/verify-platform.sh` (~line 3572), beside the `gui04-registry-shape` pair (lines 3688–3689):

```bash
"chrome-bar-<what>|node $REPO_ROOT/scripts/verify-chrome-bar-<what>.mjs"
"chrome-bar-<what>-self-test|node $REPO_ROOT/scripts/verify-chrome-bar-<what>.mjs --self-test"
```

The self-test row rides alongside *"for the same reason every other self-test in this registry"* does — a comparison nobody has seen go red is not a check.

**Candidate new rows for Phase 13** (planner picks; all static/`--quick`-eligible):

- Chrome-bar command registry shape: expected command ids derived vs. the extension sources as set equality (addition = surplus bar button nobody reviewed; removal = dead palette entry).
- `TabUriRegistry` bridge shape unchanged (extend `EXPECTED`/`EXPECTED_MEMBERS` in `verify-registry-shape.mjs` itself if the bar touches the registry — contract change visible in the same-commit diff).
- `diff-theia-core.sh` already covers the spike's zero-core-modification half — the spike needs no new gate for that, only a citation.

### What to avoid

- Never a sibling driver (`verify-phase-*.sh` are deleted and *"must not come back"* — CLAUDE.md Verification). New checks are registry rows only.
- Never assert on the **absence of a log line** unless the line is proven emitted by the code under test, not your own instrumentation (CLAUDE.md rule 1).
- Never hand-keep the expectation list the check compares (CLAUDE.md rule 2) — derive-then-compare as set equality, red on addition *and* removal.
- Never read compiled `lib/` artifacts in a static check — read TypeScript sources (registry-shape header).
- Never ship a check without its `--self-test` row — the registry convention is absolute.

---

## 6. The `window.open` candidate-A channel (New Tab must reuse it)

**Closest analog (tracked):** `theia/extensions/tab-uris/src/browser/browser-window-command.ts` — the whole file (86 lines) is the contract. Guarding checks: `scripts/verify-gui01-command.mjs`, `scripts/verify-gui01-window.mjs` (label `gui01-browser-close-does-not-quit`).

### What to copy

**The call** (from `browser-window-command.ts` lines 66–85):

```typescript
protected openBrowserWindow(url?: string): void {
    const opened = window.open(url ?? '', '_blank');
    if (!opened) {
        throw new Error(
            `${OPEN_BROWSER_WINDOW_COMMAND_ID}: the browser window was blocked and did not open -- ` +
            'invoke the command directly from the command palette (a keypress or click carries the ' +
            'user activation a popup needs) rather than from a script or a delayed handler'
        );
    }
}
```

- New Tab invokes the **existing command** via `CommandRegistry.executeCommand(OPEN_BROWSER_WINDOW_COMMAND_ID)` (import the exported const at line 14 — never retype `'powerbrowser.open-browser-window'`; `verify-gui01-command.mjs` lines 65–85 derives id+label from this source by regex so copies would drift silently).
- With no URL, `''` opens `about:blank` where the stock address bar is the affordance (lines 66–69 comment) — that is New Tab's behavior until GUI-02.
- **Reuse the popup-blocked error path**: `null` return → the thrown `Error` above. 13-UI-SPEC contracts this explicitly (*"a blocked new-tab popup takes the existing browser-window-command error path, never a new dialog"*).
- Mechanism (for the spike record, not to re-verify): shell chrome window carries no `nsIBrowserDOMWindow` → `nsWindowWatcher` cannot divert into a tab → `AppWindow::CreateNewContentWindow` opens `BROWSER_CHROME_URL`, which patch `020` leaves stock (file header lines 27–56).

### What to avoid

- No new dialog, toast, or error UI for a blocked popup — the throw path is the path.
- No JSWindowActor pair (candidate B): pre-approved fallback **only** on an actually-observed popup failure; adopting it obliges adding `ChromeUtils.registerWindowActor` to `check-internals-boundary.sh`'s `FORBIDDEN_PATTERNS` (01-SPIKE-GUI-01.md Ratification). It was not taken; the gap stays recorded in `.planning/WINDOWS.md`.
- No new HTTP route / log-stream-as-control-channel (rejected candidate C) and no binary-reinvoke-with-URL (rejected candidate D — observation 3, as corrected).
- Never open the window during shell startup — observation 4's constraint: a startup-opened window gets `gURLBar` permanently `undefined` with `browser.js` TypeErrors. User-gesture time only.

---

## 7. Spike precedent: strip-relocation record to imitate

**Closest analog (tracked):** `.planning/milestones/v1.0-phases/01-platform-extraction-and-rename/01-SPIKE-GUI-01.md` (487 lines) — imitate its structure section-for-section.

### Structure to imitate

| Spike section | What it contains | Strip-relocation equivalent |
|---|---|---|
| Title + header block (lines 1–12) | Plan/Task, Decision D-?, Run (host, date, ESR tag, upstream commit), Binary under test, one-line **Verdict** | Plan/Task, GUI-07 decision ref, run host/date/Theia pin (`1.74.1`), app under test, GREEN/RED verdict |
| What was changed (lines 16–75) | Enumerated working-tree edits, scaffolding named as scaffolding, patch hash chain re-asserted non-vacuously | Enumerated probe edits (throwaway extension/code), `diff-theia-core.sh` clean cited as the zero-core-modification proof, `git -C upstream diff` empty |
| Build (lines 79–96) | Command, exit code, timing vs. budget | Theia build command/exit/timing (seconds-scale; never a 40-min Gecko build) |
| Instrumentation note (lines 100–115) | Discarded instrument named with cause (Wayland/Xvfb) so nobody rebuilds it | Any discarded probe instrument (e.g. DOM-scrape vs. `ApplicationShell` API reads) |
| Observations 1..N (lines 118–377) | Numbered, each a prediction-vs-observed table with commands + verbatim evidence | Relocation attempts: area→area moves tried, tab identity before/after (`TabUriRegistry.uriOf` set equality, selection intact), what broke verbatim |
| Constraints found | Neither predicted nor blocking, recorded anyway (startup-open, popup risk) | E.g. ordering constraints, restoral behavior, focus loss |
| Summary table (lines 380–398) | Question → Answer, one row per plan question | Green = strip moves areas + core-diff clean + identity preserved → Variant B; Red = blocking cause → Variant-A fallback, modes still ship |
| Artefacts (lines 402–408) | Harness = scratchpad, **not committed**; logs as scratchpad | Probe harness uncommitted; verdict committed in SUMMARY/decision log (verdict is not user-facing copy — no UI-SPEC copy rules apply to it) |
| Correction (lines 411–440) | Wrong inferences corrected in place, reasoning left visible | Same discipline if a probe observation misreads (e.g. selection vs. activation) |
| Ratification (lines 443–487) | Decision-gate table (land-as-spiked / fallback), constraints binding the next phase, was-fallback-taken + which check guards it | GREEN → Phase 14 Variant B strip work; RED → Variant A, strip stays top; fallback question answered explicitly either way |

### Spike-specific constraints (from the tree, not invented)

- Probe moves the **live** strip between Theia shell areas using only public `ApplicationShell` API (addWidget/activateWidget area options, view-contribution `defaultViewOptions`). `rebind(ApplicationShell)` is forbidden — D-27 precedent.
- Identity oracle is `TabUriRegistry` (`uriOf`/`parseName` — the GUI-04 bridge contract `verify-registry-shape.mjs` freezes): same URI set + same selection after the move.
- Tabs invariant holds in every outcome including Variant-A fallback: no tab closed, moved windows, or detached by a mode change (13-UI-SPEC).
- Never touch Gecko outside `patches/`; never hand-edit a patch hunk (regenerate from a patched tree — CLAUDE.md; `check-patch-surface.sh` + `apply-patches.sh --self-test` guard). The spike should need no patch at all.
- Residual-brand scan still gates: stage new files before trusting a green scan (`git ls-files` iteration); originating-product token only in `inventory/brand-tokens.json`.

---

## Shared patterns (apply to every Phase 13 plan)

- **User-facing copy** — product named "Power Browser", plain-language problem, next step that is a real on-screen affordance, zero internal identifiers (pref keys, ports, URI internals, raw exceptions). Source: CLAUDE.md + `scripts/verify-shell-error-copy.mjs` (pattern, not literal list). Diagnostics rows carry what copy omits.
- **No-internals boundary** — Firefox internals only via `powerbrowser/shell/PowerBrowserAPI.sys.mjs`, catalogued in `powerbrowser/INTERNAL-APIS.md`; enforced by `scripts/check-internals-boundary.sh` (`--self-test`, `--catalogue`). Theia side adds no second boundary file.
- **One driver, one registry** — `scripts/verify-platform.sh`; `--quick` is the commit gate; new checks are rows + self-test rows.

## No analog found

| Need | Role | Data flow | Reason / substitute |
|---|---|---|---|
| Toolbar-item anchoring (`TabBarToolbarContribution`) | contribution | request-response | No `@powerbrowser/*` toolbar contribution exists (grep-verified). Consume `TabBarToolbarContribution`/`MenuContribution` from pinned `@theia/core@1.74.1` as a library API; command half follows `browser-window-command.ts`. |
| Shipped `.css` in an extension | style | — | Glob empty. First stylesheet; follow §4 layer idiom + sketch `default.css` tokens. |
| Strip relocation | spike | event-driven | No prior relocation probe. Follow §7 spike structure; identity oracle = `TabUriRegistry`; zero-core proof = `diff-theia-core.sh`. |

## Metadata

**Analog search scope:** `theia/extensions/*/package.json`, `theia/extensions/*/tsconfig.json`, `theia/extensions/*/src/browser/*`, `theia/extensions/token-gate/src/node/*`, `theia/applications/browser/package.json`, `theia/package.json`, `scripts/verify-*.mjs`, `scripts/diff-theia-core.sh`, `scripts/verify-platform.sh` CHECKS registry, `.planning/milestones/v1.0-phases/01-platform-extraction-and-rename/01-SPIKE-GUI-01.md`, `.claude/skills/sketch-findings-Power-Browser/` (SKILL.md + `sources/themes/default.css`).
**Files read:** 20 source/config/script files + spike record + skill index/theme + CONTEXT/UI-SPEC.
**Pattern extraction date:** 2026-09-06
