# Codebase Concerns

**Analysis Date:** 2026-09-07

Scope: project code only — `powerbrowser/`, `theia/`, `patches/`, `scripts/`, `inventory/`,
`brand/`. `upstream/` is a pinned, never-hand-edited Gecko checkout and is deliberately not
audited here.

Every entry is tagged:

- **[CATALOGUED]** — already recorded with an owner or plan in `.planning/WINDOWS.md`,
  `.planning/GUI-DEFECTS.md`, or a phase VERIFICATION report. Reflected, not rediscovered.
- **[NEW]** — found in this pass and not recorded anywhere. These are the entries that earn
  their place in this document.

---

## Tech Debt

### [NEW] The verification suite is 2.8× the size of the product it verifies

- Files: `scripts/` (48,273 lines across 74 files, 60 of them `verify-*`), versus
  `powerbrowser/` (6,086) plus `theia/extensions/**/src` (11,009) = 17,095 lines of product.
- The two largest files in the repo are gates, not product: `scripts/verify-platform.sh`
  (5,053 lines) and `scripts/generate.mjs` (5,882). `scripts/verify-branding-preflight.mjs`
  (1,782) and `scripts/verify-web-tab-live.mjs` (1,700) each exceed the largest product file
  (`powerbrowser/shell/PowerBrowserAPI.sys.mjs`, 2,592).
- Impact: every product change carries a proportionally larger gate-maintenance cost, and each
  new gate is itself unverified code that can only be trusted through its own `--self-test`.
  The project's own rules make this partly deliberate (derive-and-compare gates are longer than
  hand-kept lists), so the concern is the *trend*, not the existence.
- Fix approach: before adding a check, ask whether an existing registry row can be extended.
  `scripts/verify-platform.sh` is one file and one registry by design (CLAUDE.md
  `## Verification`); the growth pressure now falls on the per-check `.mjs` files, where shared
  derivation helpers belong in `scripts/lib/` rather than being re-authored per gate.

### [NEW] `TabQueryService` swallows every error into an empty result

- File: `theia/extensions/tab-uris/src/node/tab-query-service.ts` — five bare `catch` blocks
  (lines 114, 140, 147, 162, 189, 216, 235) each return `null`, `undefined`, or `[]` with no
  log line.
- Impact: this swallow is the *mechanism* behind three separately-catalogued defects
  (GUI-DEFECTS items 9, 18, 19 — env scrubbing, `SQLITE_BUSY`, and an unresolvable
  `better-sqlite3` binding). Each of those three causes was fixed; the swallow that hid all
  three for months is unchanged, so a fourth cause produces the identical silent `[]` and
  Panorama looks merely empty rather than broken.
- Fix approach: log the caught error once per distinct cause on the backend's existing stderr
  channel, or return a discriminated `{ rows } | { error }` so the frontend can render a real
  failure state. Do not add a gate first — the observability is the fix.

### [NEW] `better-sqlite3` is an esbuild external with no packaging gate

- Files: `theia/applications/browser/esbuild.mjs:28`,
  `theia/extensions/tab-uris/src/node/tab-query-service.ts:25`.
- Marking the module external (the fix for GUI-DEFECTS item 19) means the bundle resolves the
  native binding at runtime from `node_modules`. Nothing in `scripts/` references
  `better_sqlite3.node` or asserts the binding ships — `scripts/verify-installer-build-proof.mjs`
  does not cover it.
- Impact: an installer or packaging step that omits the native module reintroduces the exact
  silent-`[]` failure item 19 closed, and the swallow above guarantees it fails quietly.
- Fix approach: one assertion in the installer proof that the native binding exists inside the
  packaged tree.

### [NEW] Two of the three ESLint-invisible workarounds are documented only in prose

- `-purgecaches` after editing `powerbrowser/shell/*.js`: zero occurrences anywhere in
  `scripts/` or `docs/`. It exists only in CLAUDE.md and in session memory, where it has
  already invalidated one live test.
- `git ls-files` blindness in `scripts/scan-brand-residue.mjs:329` — an unstaged new file is
  invisible to the brand-residue gate. Documented in the script's own header (line 92) and in
  CLAUDE.md; not enforced.
- Impact: both are single-step traps that produce a *green* result on a broken tree, which is
  the worst failure shape this project has.
- Fix approach (cheap, and in that order): have `scripts/smoke-firefox.sh` / the launch path
  pass `-purgecaches` unconditionally in dev; have `scan-brand-residue.mjs` warn when
  `git status --porcelain` reports untracked non-ignored files, naming them.

## Known Bugs

### [CATALOGUED] GUI defects still open on Chris's screen

`.planning/GUI-DEFECTS.md` is the live register; it is maintained one item at a time and each
item closes only on Chris's confirmation. Still `OPEN` there:

- Item 2 — tabs do not move between modes (Variant B; Phase 13 spike proved the mechanics, the
  blocking instrument `scripts/diff-theia-core.sh` now passes, so the re-probe can reopen).
- Item 4 — Organising / Panorama near-empty; both blockers cleared and real rows now flow, open
  pending confirmation in the real window.
- Item 13 — no gate for the group channel: `wantUntrusted` (`powerbrowser/shell/PowerBrowserAPI.sys.mjs`)
  can silently regress with every other assertion green.
- Item 16 — nothing committed.

Items 5–7, 9, 17–20 are `IN TREE`: code landed, not yet seen working.

### [NEW] `.planning/GUI-DEFECTS.md` item 11 is stale — the defect it describes is fixed

- Item 11 ("Clean build breaks — `build:extensions` is a hand-ordered `&&` chain") is recorded
  `OPEN`, but `scripts/verify-theia-build-order.mjs` landed in 14.1.1-08 and derives the chain,
  the extension set, and the import edges from the tree, asserting all four properties. The
  chain in `theia/package.json:69` now orders `token-gate` ahead of `tab-uris`.
- Impact: a register that carries a false `OPEN` is read as noise, which is how the next real
  `OPEN` gets skipped.
- Fix approach: mark item 11 `CONFIRMED FIXED` with the reproducer
  (`scripts/verify-platform.sh --only theia-build-order`), in the same form items 12, 14, 15,
  23–25 already use.

### [CATALOGUED] Two open broken-windows ledger entries

`.planning/WINDOWS.md` (`open_count: 2`):

- Item 11 — ~20 launch-lifecycle checks (`side03-*`, `side04-*`, `side05-*`, `shell03-*`,
  `cr01-*`, `harness-display-available`) became runnable with 01-04's build but have never been
  run. Not blocked — unexercised.
- Item 19 — `shell03-budget-exhausted-error` and `shell03-auto-dismiss-on-selfheal` not re-run
  against a repackaged binary after 01-11 changed the error layer's visible behaviour.

`scripts/verify-platform.sh --gate` reads this ledger's own JSON block
(`ledger_entry_status()`, line 4911) and applies the exclusions keyed on entries that are still
`open`, so closing an entry automatically tightens the gate.

## Security Considerations

### [CATALOGUED] Token gate is the trust root, and its dev bypass is a named env var

- File: `theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts`.
- The gate replaces Theia's stock `BrowserConnectionTokenBackendContribution`, which never
  rejects a plain GET of the index document (comment at line 9). Unconfigured token is
  fail-closed. On a supervised launch the token arrives over stdin
  (`theia/extensions/token-gate/src/node/powerbrowser-env.ts:122`) so it never appears in
  `/proc/<pid>/environ`.
- `POWERBROWSER_TOKEN_DISABLE=1` disables the gate entirely and the backend is reachable
  without a token. It is set by `scripts/smoke-theia.sh:99` and `scripts/verify-platform.sh:217`
  only; `powerbrowser/shell/TheiaService.sys.mjs:644` explicitly blanks it on the supervised
  path, and the gate writes a loud stderr warning when it fires.
- Residual, **[NEW]**: the bypass is also the documented live-debug loop (session memory, "Live
  GUI debug loop"). A developer who leaves a `POWERBROWSER_TOKEN_DISABLE=1` sidecar running on
  :4000 has an unauthenticated Node process with extension-host file and terminal access bound
  to a local port. Mitigation is the stderr warning only; no timeout, no loopback-only bind
  assertion.

### [CATALOGUED] Sidecar lifetime versus quit observer

Ledger item 20 (2e) documented a launch that could reach a live backend with no registered quit
observer, leaving a Node process with the extension host's file and terminal surface outliving
the browser while still holding its token. Fixed in 01-12 by registering
`PowerBrowserAPI.onQuitGranted` ahead of the settings-folder try/catch and retaining the
unregister function. Residual recorded there: nothing proves Gecko's
`quit-application-granted` topic actually fires the retained observer in a real quit — that rests
on the human record, because chrome-context Marionette is platform-blocked on Linux.

### [NEW] One internals boundary, one file, 2,592 lines

`powerbrowser/shell/PowerBrowserAPI.sys.mjs` is the sole anti-corruption layer and is enforced
as such by `scripts/check-internals-boundary.sh`. The rule is right; the consequence is that a
single file concentrates every privileged Firefox touchpoint, including the `wantUntrusted`
message surface that GUI-DEFECTS item 13 says has no gate. A regression there is privileged
by construction.

## Performance Bottlenecks

### [CATALOGUED] Full Gecko build is 47–54 minutes

`docs/BUILD.md` records the tier-3 cost on the reference host; `--quick` runs in seconds and is
the commit gate. This is why the static gates exist and is not itself a defect.

### [NEW] 44 GB of build output on disk

`objdir/` (13G), `objdir-release/` (13G), `objdir-nplus1/` (13G), `upstream/` (5.6G) — all
gitignored, none reclaimed. Impact is local disk only, but `objdir-nplus1` is a rebase-proof
artifact that is not needed between rebases.

## Fragile Areas

Each of these has bitten this project for real. All four are stated in CLAUDE.md; the
*enforcement* status is what varies.

| Area | Files | Why fragile | Enforced by |
|---|---|---|---|
| Patch stack | `patches/010-powerbrowser-identity.patch`, `patches/020-powerbrowser-shell.patch` | A hand-edited hunk body without recomputed blob hashes degrades the three-way merge into a **silent no-op** — the patch appears to apply and changes nothing. Regenerate from a patched tree; never text-edit. | `scripts/check-patch-surface.sh`, `scripts/apply-patches.sh --self-test` |
| Brand-residue scan | `scripts/scan-brand-residue.mjs:329`, `inventory/brand-tokens.json` | Iterates `git ls-files`; an unstaged new file is invisible. `inventory/brand-tokens.json` is the only file allowed to name the originating product. | Nothing enforces the staging precondition — **[NEW]**, see Tech Debt |
| Chrome JS startup cache | `powerbrowser/shell/*.js` | Edits are silently served from cache without `-purgecaches`; already invalidated one live test. | Nothing — **[NEW]**, see Tech Debt |
| Repo path | Repo root | `pkgs.mkShell` appends an rpath to space-separated `NIX_LDFLAGS`; a space in the path breaks every native link step, in Gecko and in Theia's node-gyp modules alike. `/home/chris/coding/Power-Browser` is compliant. | Nothing automated; documented only |

### [NEW] The uncommitted working tree spans shipped code

`git status --porcelain` reports 25 paths, including `powerbrowser/shell/jar.mn`,
`theia/extensions/modes/src/browser/mode-service.ts`,
`theia/extensions/modes/src/browser/main-area-exemption.ts` (added, staged),
`theia/extensions/tab-uris/src/node/tab-query-service.ts`, and
`scripts/verify-mode-switch-tabs-live.mjs` (added). GUI-DEFECTS item 16 records "nothing
committed" as a repo problem; what is not recorded is that a **concurrent session may also be
committing to `main`** (session memory), so `git add -A` here can sweep another session's work.
Commit with explicit paths, and re-read `.planning/STATE.md` first.

## Scaling Limits

### [NEW] `scripts/verify-platform.sh` at 5,053 lines is a single-file registry

The one-driver rule is load-bearing (the sibling drivers `verify-phase-0{2,3,4,5}.sh` were
deleted to create it and must not return). At current growth the file is approaching the size
where a merge between two concurrent sessions on `main` becomes a conflict every time, since
every new check appends a row to the same file.

Mitigation that preserves the rule: keep the per-check logic in its own `scripts/verify-*.mjs`
and keep the registry row to a single line, so the shared-file diff is one line per check.

## Dependencies at Risk

### [NEW] Every `@theia/*` package is pinned to 1.74.1 through `resolutions`

- File: `theia/package.json` — a large explicit `resolutions` block pinning ~40 `@theia/*`
  packages plus `@theia/monaco-editor-core` at `1.108.201`.
- This is correct given hard rule 1 (adopt upstream Theia by re-pinning a version, never by
  editing it), but the pin is hand-maintained across ~40 entries: an upgrade is a 40-line edit
  where one missed entry produces a mixed-version tree.
- `scripts/verify-extension-pins.mjs` and `scripts/verify-upstream-pins.mjs` exist and should be
  checked as the first step of any Theia version bump.

## Missing Critical Features

### [CATALOGUED] Group channel has no gate

GUI-DEFECTS item 13. `wantUntrusted` can silently regress while every other assertion stays
green — the same shape as the five-defect channel outage in item 10, which "had never once
worked" and was invisible to every check in the registry.

## Test Coverage Gaps

### [CATALOGUED] The launch-lifecycle checks have never been run

Ledger item 11: ~20 checks that launch a real browser. Not blocked — unexercised.

### [CATALOGUED] Chrome-context Marionette is platform-blocked on Linux

Ledger item 7. Consequence, restated across ledger items 15, 16, 18, 20, 21: no registered check
can ever cover a pixel or a chrome-context interaction. Those rest permanently on the human
record via UAT documents such as
`.planning/phases/01-platform-extraction-and-rename/01-UAT.md`.

### [NEW] The supervisor's error contract is proven under Node, not under Gecko

`scripts/verify-shell-error-contract.mjs` imports `powerbrowser/shell/TheiaService.sys.mjs` with
`ChromeUtils` faked and runs the chrome bootstrap through `node:vm`. This proves the
classification-to-probe wiring, the spawn counts, and the sentinel ordering. It does not prove
that Gecko's `quit-application-granted` fires the retained observer, and it does not prove the
pixels of a repainted error layer. Recorded as a residual inside ledger items 20 and 21 but not
tracked anywhere as an open coverage gap in its own right.

### [NEW] No registered check drives a rejection out of the two long-lived supervisor loops

`_healthLoop` and `_recoveryProbeLoop` in `powerbrowser/shell/TheiaService.sys.mjs`: their
terminal handlers rest on the source-derived coverage rule in
`scripts/verify-start-path-recovery.mjs`, not on an observed runtime red. Doing better would need
a fault injected into a mid-session code path with no external control surface. Priority: low —
the static derivation is genuinely two-directional — but it is the one place in the supervisor
where a fix could be wrong and still green.

---

*Concerns audit: 2026-09-07*
