# Phase 1: Platform Extraction and Rename - Research

**Researched:** 2026-08-30
**Domain:** Firefox-ESR fork extraction + mechanical brand rename + Theia sidecar GUI surfaces
**Confidence:** HIGH (nearly every claim is a direct read of `/home/chris/coding/sourcerer` at `bce68bb468e4dc160da8c9e238e030a400b806f8` or of `upstream/` Gecko source, this session)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Migration boundary**
- **D-01:** Fresh snapshot import, not history import — copy the sourcerer working tree at one commit into this repo as a single "import platform tree from sourcerer@<sha>" commit recording provenance. No Sourcerer-branded git history enters the public platform repo. — **Reversibility:** one-way — once phases build on the snapshot, retrofitting filter-repo history would rewrite every subsequent commit.
- **D-02:** All four Theia sidecar extensions migrate and rename to `@powerbrowser/*`: `branding`, `customize`, `tab-uris`, **and `token-gate`**. Inspection confirmed token-gate is platform security (fail-closed backend auth token gate + parent watchdog coupled to the browser's `TheiaService.sys.mjs` supervision), not a Sourcerer feature.
- **D-03:** Non-code root items: `flake.nix`, `toolchain-baseline.txt`, and technical docs (`BUILD.md`, `CUSTOMIZE.md`, `URI-SCHEMES.md`) migrate and are debranded. Sourcerer's `logo/` directory and `docs/PRODUCT-REQUIREMENTS.md` stay downstream — they are Sourcerer's, not the platform's.
- **D-04:** The sourcerer repo is frozen — no development there at all — until Power Browser is ready; Sourcerer is then remade **on top of** Power Browser as a pure downstream (Phase 7). Not a reconciliation of two evolving trees. Snapshot SHA recorded in the import commit.

**Rename execution**
- **D-05:** The rename is executed by a **committed, rerunnable script** that consumes the MIG-02 inventory as its input data and applies token-boundary replacements per case form. Reset → rerun until the diff is right; the script is auditable evidence the rename was mechanical.
- **D-06:** Staged commits, not one atomic commit: file/dir renames via `git mv` first (preserves rename detection), then content renames per token class/format, then coupled-format fixups (jar.mn, components.conf, moz.build). Each stage bisectable.
- **D-07:** Both patches (`010-sourcerer-identity.patch`, `020-sourcerer-shell.patch`) are fully renamed in Phase 1 — file names and content (identifiers plus hand-written "Power Browser" display literals) — and regenerated so they apply cleanly against re-fetched upstream with a valid 3-way-merge blob-hash chain. Phase 5 (MIG-05) later strips brand *values* into generated includes; Phase 1 only replaces Sourcerer literals with Power Browser literals.
- **D-08:** Historical Sourcerer planning citations in comments (decision IDs like D-98/SIDE-04, plan-file references like `05-01-PLAN.md`) stay **verbatim** as provenance, classified `frozen` in the inventory. Only brand tokens naming the product rename in comments.

**Brand identity values (hand-written in Phase 1)**
- **D-09:** Display name **Power Browser**; `MOZ_APP_VENDOR` **DeBIOS Foundation** (the 501(c)(3) platform owner). Replaces sourcerer's vendor "Deocracy".
- **D-10:** App basename / binary / remoting name / StartupWMClass: **`powerbrowser`** — one word, matching the fixed internal identifiers (`chrome://powerbrowser/`, `@powerbrowser/*`) exactly. No hyphenated sixth case-variant.
- **D-11:** Logo: an original **placeholder geometric mark** created during Phase 1 (SVG source, rasterized to the needed PNG sizes). A real logo replaces the asset files later without structural change.
- **D-12:** Domain: **powerbrowser.org** — homepage/support/release-notes URLs hand-written against it; exact URL paths are researcher/planner discretion.
- **D-13:** Keep both dev and release presentation: "Power Browser Dev" desktop entry (local objdir builds) and "Power Browser" release entry, mirroring the existing `branding/dev` / release split.
- **D-14:** Default homepage and search engine: **keep stock defaults** — no custom homepage/search changes in Phase 1. Revisit when `[urls]` lands in Phase 2.

**Inventory & red scan**
- **D-15:** The MIG-02 inventory is **one committed structured data file** (TOML or JSON — planner's pick): token, case form, classification (brand / identity / frozen / coincidental), format context. It is simultaneously the rename script's input AND the red scan's token source — one source of truth, no drift.
- **D-16:** The red scan is a **new standalone static script** (working name `scripts/scan-brand-residue`, final name planner's pick) reading tokens from the inventory with a committed scope list. Grep-class, no build required. It is a separate layer from the runtime `verify-branding*.mjs` verifiers and grows into VER-01 in Phase 6.
- **D-17:** "Demonstrably red" (success criterion 1) means **reconciled counts**: on the pre-rename tree, every inventoried brand/identity token is found where the inventory says, totals reconcile, and the run's report is committed in the phase dir as evidence. A nonzero exit alone is insufficient — it wouldn't catch an under-scanning scanner.
- **D-18:** After the rename turns it green, the scan becomes a **permanent gate** — it joins the verify/smoke script set immediately and must pass from Phase 1 onward. Residual Sourcerer strings can never re-enter.

### Claude's Discretion
- Inventory file format (TOML vs JSON) and exact scan script name.
- URL paths under powerbrowser.org (support, release notes, etc.).
- Placeholder mark design.
- Rename script language/tooling and the exact staging of the per-class commits.

### Deferred Ideas (OUT OF SCOPE)
- Real Power Browser logo to replace the Phase 1 placeholder mark (any time; pure asset swap by Phase 2+)
- Custom default homepage/search (`powerbrowser.org`, engine choice) — revisit when `[urls]` lands in Phase 2
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MIG-01 | Platform code migrated from the sourcerer tree with `upstream/` re-fetched via script (never copied) and no objdirs copied | `scripts/fetch-upstream.sh` migrates as-is; it clones `FIREFOX_153_1_0esr_RELEASE` from `https://github.com/mozilla-firefox/firefox.git` at `--depth 1`. Two coupled fixups needed (`ensure_branding_overlay` symlink name + `.git/info/exclude` entry). Objdirs are already gitignored. See *Architecture Patterns → Pattern 2*. |
| MIG-02 | Committed token-classification inventory (brand/identity/frozen/coincidental) exists before any rename | Exact measured scope: **755 occurrences across 69 migrating files** in 3 raw case forms (372 `sourcerer` / 291 `Sourcerer` / 92 `SOURCERER`), plus `Deocracy` ×13 and one `sourcerer.dev` domain. Full per-class breakdown in *Token Inventory Ground Truth*. |
| MIG-03 | Internal identifiers renamed to fixed platform names, never varying per downstream | Six coupled reference formats enumerated with file:line in *Coupled Reference Formats*. The `Sourcerer` TitleCase form is **ambiguous** — display (`→ "Power Browser"`, with space) vs identifier prefix (`→ "PowerBrowser"`, no space). This is the phase's central rename hazard. |
| MIG-04 | Renamed tree builds and boots on Linux under Power Browser branding (proven by existing smoke tests) | `scripts/smoke-firefox.sh` + `scripts/smoke-theia.sh` migrate. Full `./mach build` is unavoidable (~39–47 min measured on this host; sccache hit rate 0.14%; artifact builds structurally impossible). See *Environment Availability* and *Pitfall 6*. |
| GUI-01 | User can toggle away from Theia to proper web-browser UI and back | **DOES NOT EXIST in sourcerer — this is net-new work.** `020-sourcerer-shell.patch` replaces `BROWSER_CHROME_URL` with the chrome-less shell; sourcerer's own CLAUDE.md states "No custom browser chrome". See *Finding 1* and *Architecture Patterns → Pattern 1*. |
| GUI-02 | User can open and browse web pages inside Theia as tabs (URL-addressable) | **DOES NOT EXIST in sourcerer — net-new work.** `tab-uris` covers `view:`/`settings:`/`terminal:`/`output:`/`preference:`/`vscode-extension:`/`webview:` only; no `http:`/`https:` handler. See *Finding 2*. |
| GUI-03 | GUI customization bridge (runtime CSS layer + dev-flagged privileged JS) ships as a platform feature | **Fully exists.** `theia/extensions/customize/` + `docs/CUSTOMIZE.md` + `scripts/verify-customize-inert.mjs` + `scripts/verify-dev-flag-off.mjs`. Survives migration; rename-only. Watch the `$THEIA_CONFIG_DIR` path rename (runtime state). |
| GUI-04 | Nothing in v1 welds Theia to full-window presentation; future unified tab strip stays landable | Negative requirement. Currently satisfied by discipline, not by code. `TabUriRegistry`'s exported shape is the declared bridge interface. Reverting the `BROWSER_CHROME_URL` override (recommended for GUI-01) strengthens GUI-04 materially. |
</phase_requirements>

---

## Summary

The extraction half of this phase is smaller and better-tooled than the roadmap's "~1,090 occurrences" figure implies. After applying D-03's exclusions (`docs/research/`, `docs/PRODUCT-REQUIREMENTS.md`, `logo/`, `.planning/`), the real rename surface is **755 occurrences across 69 files**, and only **three** raw case forms of the literal exist on disk — `sourcerer` (372), `Sourcerer` (291), `SOURCERER` (92). The "five case-variant forms" is better understood as three literal cases fanning out into five *replacement targets*, because the TitleCase form `Sourcerer` is lexically ambiguous: it is simultaneously a display name (which must become `Power Browser`, two words with a space) and an identifier prefix (which must become `PowerBrowser`, one word). That ambiguity, not the raw count, is the central hazard. A fourth measurement question is open: `scripts/verify-phase-0{2,3,4,5}.sh` carry another 247 occurrences across 4 files and nobody has decided whether they migrate.

The migration machinery is in unusually good shape and should be carried forward almost untouched. The patch stack is **53 lines total** across two files, both of which chain blob hashes (`010` produces `33098ee135`, which is `020`'s pre-image) — so D-07's "regenerate" is genuinely cheap, but must be done by re-deriving the diff from a patched tree, never by text-editing the patch. `apply-patches.sh` already carries the non-vacuity blob-hash assertion and a self-test; `fetch-upstream.sh` already carries the dirt classifier and its self-test. Neither should be rewritten. The build cost dominates the schedule: a full `./mach build` is unavoidable (a compiled define changes, `XPCOM_MANIFESTS` is a tier-3 trigger, and artifact builds cannot produce a renamed binary because `MOZ_APP_NAME` is a compiled define), measured at 2368s dev / 2822s release on this exact host with a 0.14% sccache hit rate.

The genuinely surprising finding is on the GUI side. **GUI-01 and GUI-02 do not exist in the sourcerer tree and are net-new work in this phase.** ROADMAP.md and CONTEXT.md both assert "the customize bridge and browser toggle already exist in sourcerer" — that is true for GUI-03 and defensible for GUI-04, but false for GUI-01 and GUI-02. Sourcerer's CLAUDE.md states the opposite requirement outright ("Theia is the only GUI in v4.0. No custom browser chrome — no tab strip, toolbar, or panels"), `020-sourcerer-shell.patch` replaces `BROWSER_CHROME_URL` with a deliberately chrome-less shell window, and `tab-uris` registers no `http:`/`https:` scheme. Planning this phase as "migrate + rename" would under-scope it by two features. The good news is that the cheapest correct fix for GUI-01 also *removes* a brand literal from the patch stack, pre-paying part of Phase 5's MIG-05.

**Primary recommendation:** Split the phase into two independent tracks — a mechanical extract-and-rename track that is fully specified by the ground-truth tables below, and a GUI track that treats GUI-01/GUI-02 as new features with their own design risk. On the GUI track, revert the `BROWSER_CHROME_URL` override and move startup-window selection into the already-registered `a-sourcerer` command-line handler (`SourcererSingleInstanceHandler`), which restores stock Firefox chrome as a first-class reachable window and satisfies GUI-01 with almost no new code.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Token classification inventory (MIG-02) | Repo tooling (committed data file) | — | It is the shared input for two consumers (rename script, residual scan); it belongs to neither. |
| Residual-brand scan (D-16/D-18) | Repo tooling (static script) | CI/verify set | Grep-class, no build, no runtime. Must not live inside the runtime verifiers (`verify-branding*.mjs`) — different layer, different trigger. |
| Rename execution (D-05) | Repo tooling (script) | Git (staged commits) | Mechanical text transform over the working tree. Not a build step. |
| Upstream fetch + patch apply (MIG-01) | Build orchestration (`scripts/*.sh`) | Gecko build (`mach`) | Already correct; migrates as-is. |
| Product identity (name/vendor/basename/remoting) | Gecko build (`.mozconfig`, `moz.configure` patch, `branding/`) | — | These are **compiled defines**. Not runtime-configurable — this is why artifact builds cannot help. |
| Chrome window / startup window selection | Gecko chrome (`powerbrowser/shell/`) + XPCOM command-line handler | `browser/moz.configure` patch | Currently in the patch (`BROWSER_CHROME_URL`); *recommended* to move to the CLH tier. See Pattern 1. |
| **GUI-01 browser-UI toggle** | Gecko chrome (`PowerBrowserAPI.sys.mjs` + shell) | Theia frontend (command that calls into it) | Opening a real `chrome://browser/content/browser.xhtml` window is a privileged chrome operation; only the anti-corruption layer may do it. |
| **GUI-02 web pages as Theia tabs** | Theia frontend extension (`@powerbrowser/tab-uris`) | — | The tab model lives in Theia in v1. Chrome-owned tabs are explicitly Milestone 2 (`browser-bridge`). |
| GUI-03 customize bridge | Theia frontend extension (`@powerbrowser/customize`) | Filesystem (`$THEIA_CONFIG_DIR`) | Already correct; rename-only. |
| Backend auth gate + watchdog | Theia backend extension (`@powerbrowser/token-gate`) | Gecko chrome (`TheiaService.sys.mjs` supervision) | Cross-tier contract carried by env vars — see *Pitfall 3*. |
| Runtime six-surface identity verification | Repo tooling (`verify-branding-identity.mjs`) | Built artifact (`objdir/dist/bin/`) | Reads the built binary, never the sources. Preserve that property. |

---

## Token Inventory Ground Truth

Everything in this section was measured this session against `git ls-files` at `sourcerer@bce68bb468e4dc160da8c9e238e030a400b806f8` (working tree clean, `git status --porcelain` empty).

### Occurrence counts by migration disposition

| Bucket | Files | `sourcerer` | `Sourcerer` | `SOURCERER` | Total |
|---|---|---|---|---|---|
| **MIGRATING** (D-03 scope) | 69 | 372 | 291 | 92 | **755** |
| `scripts/verify-phase-0{2,3,4,5}.sh` (**disposition undecided**) | 4 | 70 | 42 | 135 | **247** |
| Excluded per D-03 (`docs/research/`, `docs/PRODUCT-REQUIREMENTS.md`, `logo/`) | 7 | 37 | 51 | 1 | 89 |
| Whole tree excluding `.planning/` | 80 | 479 | 384 | 228 | **1091** |

`[VERIFIED: computed this session over git ls-files at sourcerer@bce68bb]`

The roadmap's "~1,090" is the whole-tree figure. **The number the plan should budget against is 755 (or 1,002 if the phase verifiers migrate).**

### The five replacement targets from three literal case forms

| # | Source form | Example occurrence | Target | Why it is its own form |
|---|---|---|---|---|
| 1 | `sourcerer` (lowercase) | `chrome://sourcerer/`, `sourcerer/shell/`, `@sourcerer/branding`, `MOZ_APP_REMOTINGNAME=sourcerer` | `powerbrowser` | The fixed-identifier form. D-10 chose one word specifically so camelCase (`sourcererPrivilegedJs`, `sourcererOk`, `sourcererPath`, `window.sourcererShowDiagnostics`) collapses into this same replacement instead of needing a sixth form. |
| 2 | `Sourcerer` **as identifier prefix** | `SourcererAPI`, `SourcererWelcomeWidget`, `SourcererSingleInstanceHandler`, `Symbol.for('SourcererPrivilegedJs')` | `PowerBrowser` (no space) | Class/symbol names. |
| 3 | `Sourcerer` **as display literal** | `-brand-short-name = Sourcerer`, `MOZ_APP_DISPLAYNAME="Sourcerer"`, `"applicationName": "Sourcerer"`, `Name=Sourcerer Dev` | `Power Browser` (**with space**) | Human-facing. **Lexically identical to form 2** — this is the ambiguity a naive replace destroys. |
| 4 | `SOURCERER` (UPPER_SNAKE) | `SOURCERER_TOKEN`, `SOURCERER_APP_IDENTITY`, `SOURCERER_DEV_TREE` | `POWERBROWSER` | Env vars, sentinel constants, build defines. |
| 5 | `Deocracy` (vendor) | `-vendor-short-name = Deocracy`, `imply_option("MOZ_APP_VENDOR", "Deocracy")`, `--with-distribution-id=org.deocracy` | `DeBIOS Foundation` / `org.debios` | A second brand token entirely, 13 occurrences. **Easy to forget** — it is not a case variant of "sourcerer" and will not be found by scanning for it. |

`[VERIFIED: sourcerer/branding/{dev,release}/locales/en-US/brand.ftl:5-15, .mozconfig:1-11, sourcerer/sourcerer.desktop:2-8, theia/applications/browser/package.json:13-14]`

Verbatim, for form 3 vs form 2 disambiguation:
```
sourcerer/branding/dev/locales/en-US/brand.ftl:5-8
  -brand-shorter-name = Sourcerer
  -brand-short-name = Sourcerer
  -brand-shortcut-name = Sourcerer
  -brand-full-name = Sourcerer Dev
sourcerer/branding/release/locales/en-US/brand.ftl:8
  -brand-full-name = Sourcerer
```

### Complete `SOURCERER_*` constant census

`[VERIFIED: computed via grep -ohE 'SOURCERER_[A-Z_]+' over migrating + excluded tracked files]`

| Constant | Count | Kind | Cross-tier? |
|---|---|---|---|
| `SOURCERER_BACKEND_READY` | 59 | stdout sentinel (Node → chrome) | **yes** |
| `SOURCERER_TOKEN` | 21 | env var (chrome → Node) | **yes** |
| `SOURCERER_SHELL_ERROR` | 17 | `dump()` sentinel | chrome → test |
| `SOURCERER_SHELL_SWAP` | 16 | `dump()` sentinel | chrome → test |
| `SOURCERER_SHELL_READY` | 15 | `dump()` sentinel | chrome → test |
| `SOURCERER_SUPERVISED` | 14 | env var (chrome → Node) | **yes** |
| `SOURCERER_APP_IDENTITY` | 13 | stdout sentinel **+ verifier regex** | **yes** |
| `SOURCERER_REPO_URL` | 10 | TS export (welcome widget link) | no |
| `SOURCERER_TOKEN_DISABLE` | 9 | env var (test bypass) | **yes** |
| `SOURCERER_ENV` | 8 | TS module name (`sourcerer-env.ts`) | no |
| `SOURCERER_MARK_DATA_URI` | 7 | TS export | no |
| `SOURCERER_DECK_STATE` | 6 | `dump()` sentinel | chrome → test |
| `SOURCERER_DEV_TREE` | 5 | **mozbuild `DEFINES[]` + `#filter substitution`** | build → runtime pref |
| `SOURCERER_SHELL_ERROR_CLEARED` | 4 | `dump()` sentinel | chrome → test |
| `SOURCERER_DIAGNOSTICS` | 4 | DOM id / sentinel | no |
| `SOURCERER_VIEW_FACTORY_IDS` | 3 | TS export | no |
| `SOURCERER_OBJDIR` | 3 | shell env var (`.mozconfig`) | build |
| `SOURCERER_TOKEN_COOKIE_NAME` | 2 | shared constant | **yes** |
| `SOURCERER_MARK_SVG` | 2 | TS export | no |
| `SOURCERER_BRANDING` | 2 | shell env var (`.mozconfig`) | build |
| `SOURCERER_SIDECAR_PREFS` | 1 | constant | no |

Every row marked "yes" is a **contract that must be renamed on both sides in the same commit** or the app boots and silently fails auth / hangs waiting for a sentinel.

### File and directory renames (the `git mv` stage, D-06)

`[VERIFIED: git ls-files, paths containing 'sourcerer' case-insensitively, excluding .planning/]`

- `sourcerer/` → `powerbrowser/` (whole tree, 44 tracked files)
- `sourcerer/shell/SourcererAPI.sys.mjs` → `powerbrowser/shell/PowerBrowserAPI.sys.mjs`
- `sourcerer/shell/sourcerer.{xhtml,js,css}` → `powerbrowser/shell/powerbrowser.{xhtml,js,css}`
- `sourcerer/shell/sourcerer-sidecar.js` → `powerbrowser/shell/powerbrowser-sidecar.js`
- `sourcerer/sourcerer.desktop` → `powerbrowser/powerbrowser.desktop`
- `sourcerer/sourcerer-release.desktop` → `powerbrowser/powerbrowser-release.desktop`
- `patches/010-sourcerer-identity.patch` → `patches/010-powerbrowser-identity.patch`
- `patches/020-sourcerer-shell.patch` → `patches/020-powerbrowser-shell.patch`
- `theia/extensions/branding/src/browser/sourcerer-*.{ts,tsx}` → `powerbrowser-*` (7 files)
- `theia/extensions/customize/src/browser/sourcerer-privileged-js.ts` → `powerbrowser-privileged-js.ts`
- `theia/extensions/token-gate/src/node/sourcerer-env.ts` → `powerbrowser-env.ts`
- `sourcerer/INTERNAL-APIS.md` → `powerbrowser/INTERNAL-APIS.md`
- `docs/research/sourcerer-architecture.md` — **does not migrate** (D-03 excludes `docs/research/`)

Note `sourcerer/branding/{dev,release}/default{16,32,48,64,128}.png` are **binary** files that keep their names but whose *content* must be replaced by D-11's placeholder mark.

---

## Coupled Reference Formats

The six formats the roadmap names, each with a concrete file:line and the specific coupling that breaks if one side is renamed without the other.

### 1. `jar.mn` — chrome package registration

`[VERIFIED: sourcerer/shell/jar.mn:11-17]`
```
browser.jar:
%  content sourcerer %content/sourcerer/
   content/sourcerer/sourcerer.xhtml         (sourcerer.xhtml)
   content/sourcerer/sourcerer.js            (sourcerer.js)
   content/sourcerer/sourcerer.css           (sourcerer.css)
   content/sourcerer/SourcererAPI.sys.mjs    (SourcererAPI.sys.mjs)
   content/sourcerer/TheiaService.sys.mjs    (TheiaService.sys.mjs)
```
Each line carries the package name (col 2), the virtual path, and the **source filename in parentheses**. All three change; the parenthesised name must match the `git mv`'d file on disk exactly or the build fails at packaging. Coupled to every `chrome://sourcerer/content/...` string in the tree (28 sites) and to `components.conf`'s `esModule` key.

Also `sourcerer/branding/{dev,release}/content/jar.mn` and `.../locales/jar.mn` — these register under `%content/branding/` and `%locale/branding/`, which are **stock upstream names and must not be renamed** (`branding` here is Gecko's slot, not our brand).

### 2. `components.conf` — XPCOM registration

`[VERIFIED: sourcerer/shell/components.conf:14-22]`
```
Classes = [
    {
        "cid": "{7539c85c-f1f6-43a3-9a45-48fd27140596}",
        "contract_ids": ["@sourcerer.dev/single-instance-clh;1"],
        "esModule": "chrome://sourcerer/content/SourcererAPI.sys.mjs",
        "constructor": "SourcererSingleInstanceHandler",
        "categories": {"command-line-handler": "a-sourcerer"},
    },
]
```
Four different token classes in one 9-line file:
- `"cid"` — a UUID. **frozen**. Do not regenerate; nothing depends on it being new, and changing it is churn.
- `"contract_ids"` — `@sourcerer.dev/...` is **identity class**: an XPCOM contract ID namespaced by a DNS name. `powerbrowser.dev` is a domain the DeBIOS Foundation does not own; D-12 establishes `powerbrowser.org`. Correct target: `@powerbrowser.org/single-instance-clh;1`.
- `"esModule"` — **brand class**, coupled to `jar.mn` and the `git mv`.
- `"constructor"` — **brand class**, coupled to the exported class name in `PowerBrowserAPI.sys.mjs:509`.
- `"a-sourcerer"` — **the `a-` prefix is frozen, the suffix is brand.** The file's own comment states the mechanism: it sorts ahead of `"m-browser"` and `"x-default"` under ascending `strcmp`. `a-powerbrowser` still sorts ahead of both — verified by inspection of the strings, not by a live run.

### 3. `moz.build` — build-system wiring

`[VERIFIED: sourcerer/shell/moz.build:12-25]`
```
JAR_MANIFESTS += ["jar.mn"]

DEFINES["SOURCERER_DEV_TREE"] = TOPSRCDIR + "/.."

JS_PREFERENCE_PP_FILES += [
    "sourcerer-sidecar.js",
]
...
XPCOM_MANIFESTS += [
    "components.conf",
]
```
`DEFINES["SOURCERER_DEV_TREE"]` is consumed by `#filter substitution` in the preprocessed pref file — `[VERIFIED: sourcerer/shell/powerbrowser-sidecar.js source, line "pref(\"sourcerer.sidecar.backendMain\", \"@SOURCERER_DEV_TREE@/theia/applications/browser/lib/backend/main.js\");"]`. The define name and the `@...@` substitution token must rename together. `JS_PREFERENCE_PP_FILES` names the file being `git mv`'d.

The file's own comment states `XPCOM_MANIFESTS` is a **tier-3 build trigger** — a full `./mach build` after any change, not `mach build faster`.

### 4. Patch content and the 3-way-merge hash chain

`[VERIFIED: patches/010-sourcerer-identity.patch and patches/020-sourcerer-shell.patch, read in full; 24 + 29 = 53 lines total]`

`010`'s header: `index 3ea3d88b93..33098ee135`. `020`'s second hunk header: `index 33098ee135..a3dbfad2f5`. **`010`'s post-image hash is `020`'s pre-image hash — the chain is literal.**

`010` content changes:
```
-imply_option("MOZ_APP_VENDOR", "Mozilla")
+imply_option("MOZ_APP_VENDOR", "Deocracy")
+imply_option("MOZ_APP_UA_NAME", "Firefox")
 imply_option("MOZ_APP_ID", "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}")
```
`010` contains **zero** occurrences of "sourcerer" in its body — only its filename carries the brand. Its brand token is `Deocracy`. `MOZ_APP_UA_NAME`/`MOZ_APP_ID` are **frozen** (deliberate Firefox compatibility, per D-78 / extension compat).

`020` content changes:
```
+# D-89/D-92: sourcerer/shell/ resolves through the upstream/sourcerer
+# symlink to the repo's own sourcerer/ tree -- our chrome code stays
+# entirely in sourcerer/, never inside upstream/.
+DIRS += ["../sourcerer/shell"]
...
-imply_option("BROWSER_CHROME_URL", "chrome://browser/content/browser.xhtml")
+imply_option("BROWSER_CHROME_URL", "chrome://sourcerer/content/sourcerer.xhtml")
```

**Regeneration procedure (do not text-edit):** fetch upstream → apply the *old* patches → rename the working files → `git -C upstream diff -- browser/moz.build browser/moz.configure` split back into two files → verify each `index` line and that `010`'s post-image equals `020`'s pre-image. Anything else invalidates `git apply --3way`'s ability to do a genuine 3-way merge, which degrades it into the exact silent-drop mode `apply-patches.sh` exists to catch.

### 5. Verifier regexes

`[VERIFIED: scripts/verify-branding-identity.mjs:347]`
```js
const APP_IDENTITY_LINE_RE = /^(?:\[SourcererAPI\] [a-z]+: )?SOURCERER_APP_IDENTITY (\{.*\})$/m;
```
Two independent brand tokens inside one regex literal, both coupled to emitters in `powerbrowser/shell/`. Renaming the emitter without the regex fails the runtime-identity surface; renaming the regex without the emitter fails it the other way. Neither failure names the cause.

Other regex/string-literal couplings found:
- `scripts/verify-dev-flag-off.mjs:68` — `"window.theia.container.isBound(Symbol.for('SourcererPrivilegedJs'))"` — a **string containing a symbol key**, coupled to `theia/extensions/customize/src/browser/sourcerer-privileged-js.ts`. TypeScript will not catch this.
- `scripts/check-internals-boundary.sh:119,172` — `*'chrome://sourcerer/'*) offense=0 ;;` — a shell glob allowlisting the chrome package. A missed rename here silently *widens* the boundary guard.
- `scripts/check-internals-boundary.sh:31,150,151` — hardcoded `SourcererAPI.sys.mjs` basename and `sourcerer/INTERNAL-APIS.md` path.
- `scripts/apply-patches.sh` `run_self_test()` — hardcodes `"$PATCHES_DIR/010-sourcerer-identity.patch"` and `browser/moz.configure`.

### 6. File/directory names

Covered in *Token Inventory Ground Truth → File and directory renames*. The distinctive hazard is `sourcerer/sourcerer.desktop:4`:
```
Icon=/home/chris/coding/sourcerer/sourcerer/branding/dev/default128.png
```
`[VERIFIED: sourcerer/sourcerer.desktop:2-8]`

Three different `sourcerer` tokens on one line with **three different correct targets**: the repo root directory (`Power-Browser` — *coincidental class*, not `powerbrowser`), the tree directory (`powerbrowser` — brand class), and nothing else. Line 3 has the same shape:
```
Exec=/home/chris/coding/sourcerer/objdir/dist/bin/sourcerer %u
```
Repo-root token → `Power-Browser`; binary name → `powerbrowser`. **A token-boundary replacement cannot get this right without a path-aware rule.** Recommend handling the `.desktop` files by hand-write rather than by script, and classifying `/home/chris/coding/sourcerer` as its own inventory row in the `coincidental` bucket.

---

## Finding 1 — GUI-01 does not exist, and the fix improves Phase 5

### Evidence that it does not exist

`[VERIFIED: /home/chris/coding/sourcerer/CLAUDE.md, "Hard rules" section]`
> **Theia is the only GUI in v4.0.** No custom browser chrome — no tab strip, toolbar, or panels. Those are post-4.0 milestones.

`[VERIFIED: sourcerer/shell/sourcerer.xhtml:6-9]`
> D-89/D-91/D-94: the entire startup window. No custom browser chrome: no tab strip, toolbar, address bar, or menu. One branded loading layer (chrome-rendered, no network, no sidecar) painted above one remote `<browser>` element waiting for a URL. Theia's own shell is the UI.

The word "swap" throughout `sourcerer.js` / `TheiaService.sys.mjs` refers to the **startup** transition from the branded loading layer to the Theia URL (`window.sourcererSwapToUrl`, `SOURCERER_SHELL_SWAP`), not a user-facing UI toggle. `@sourcerer/browser-bridge` appears only in prose (`CLAUDE.md`, `docs/PRODUCT-REQUIREMENTS.md`, `docs/research/*`) — **no such directory or package exists** `[VERIFIED: ls theia/extensions/ → branding, customize, tab-uris, token-gate]`.

### Why the current architecture blocks the naive fix

`020-*-shell.patch` sets `BROWSER_CHROME_URL` to the shell. Upstream compares `window.location.href` against `AppConstants.BROWSER_CHROME_URL` in several places to decide "am I the main browser window":

`[VERIFIED: upstream/browser/base/content/browser.js:1312, 1335, 4677; browser-commands.js:297; utilityOverlay.js:418]`
- `browser.js:4677` — `if (window.location.href != AppConstants.BROWSER_CHROME_URL) { gDialogBox = null; }` → a real `browser.xhtml` window would lose in-window modal dialogs.
- `browser.js:1335` — `openLocation()` takes the "not a browser window, redirect elsewhere" branch → **Ctrl+L would not focus the address bar**.
- `browser.js:1312` — `loadOneOrMoreURIs` would `openDialog(BROWSER_CHROME_URL)` → recursing into the shell.

So "just open `chrome://browser/content/browser.xhtml`" produces a visibly degraded browser window.

### Recommended approach: move startup-window selection into the command-line handler

The handler is already registered and already sorts first:

`[VERIFIED: sourcerer/shell/SourcererAPI.sys.mjs:509-526]`
```js
export class SourcererSingleInstanceHandler {
  QueryInterface = ChromeUtils.generateQI([Ci.nsICommandLineHandler]);
  helpInfo = "";
  handle(cmdLine) {
    try {
      const win = SourcererAPI.findShellWindow();
      if (!win) { return; }
      SourcererAPI.focusWindow(win);
      cmdLine.preventDefault = true;
    } catch (err) { ... }
  }
}
```

It currently only handles the *second* launch. The stock default handler (`x-default`) gates window creation on `preventDefault`:

`[VERIFIED: upstream/browser/components/BrowserContentHandler.sys.mjs:1722-1737]`
```js
} else if (!cmdLine.preventDefault) {
  ...
  openBrowserWindow(cmdLine, lazy.gSystemPrincipal);
} else {
  // ... blank window getting closed quickly ...
  let win = Services.wm.getMostRecentWindow("navigator:blank");
  if (win) { win.close();
```

Therefore: extend `handle()` so that on first launch (`cmdLine.state == STATE_INITIAL_LAUNCH` and no shell window exists) it opens `chrome://powerbrowser/content/powerbrowser.xhtml` itself and sets `preventDefault = true`. Then **drop the `BROWSER_CHROME_URL` hunk from `020` entirely**.

Consequences:
- `BROWSER_CHROME_URL` keeps its stock value → every upstream `window.location.href == BROWSER_CHROME_URL` check behaves correctly for a real browser window → **GUI-01 becomes "open a stock Firefox window", with full address bar, tabs, and dialogs.**
- `020`'s remaining brand value is only the `DIRS += ["../powerbrowser/shell"]` path, so `020` becomes a **pure hook patch** — pre-paying a large slice of Phase 5's MIG-05.
- GUI-04 is materially strengthened: the shell is no longer the compiled-in only window.
- Known cost: the early `navigator:blank` window is closed rather than reused (`replaceStartupWindow` is what reuses it, and it assigns `win.location = AppConstants.BROWSER_CHROME_URL`), producing the brief flicker upstream's own comment describes as acceptable.

**Confidence:** HIGH for the mechanism (all four call sites read directly). MEDIUM for "no other side effects" — this has not been run. **Recommend the planner insert a spike task that builds this change and confirms first-launch, second-launch, and `powerbrowser <url>` command-line behaviour before the rest of the GUI track depends on it.**

### The "and back" half of GUI-01

Closing the browser window returns focus to the shell window; that satisfies "and back" with zero new code, provided the shell window is not the last window (Gecko quits on last-window-close). Verify that a Theia shell window kept open behind a browser window does not trip `browser.tabs.closeWindowWithLastTab` / session-end logic. **Not verified this session — flag as a spike sub-item.**

---

## Finding 2 — GUI-02 does not exist; the only in-scope path has a hard limitation

`tab-uris` registers `view:`, `settings:`, `terminal:`, `output:`, `preference:`, `vscode-extension:`, `webview:` `[VERIFIED: docs/URI-SCHEMES.md section headings; theia/extensions/tab-uris/src/browser/existing-scheme-coverage.ts:151,195-207]`. There is **no** `http:`/`https:` open handler anywhere in the Theia workspace.

### Options

| Approach | Mechanism | Verdict |
|---|---|---|
| **`@theia/mini-browser@1.74.1`** + an `http`/`https` `OpenHandler` in `@powerbrowser/tab-uris` | Renders the URL in an `<iframe>` as a Theia widget/tab; URL is the widget's resource URI, so it round-trips through the existing registry | **Recommended.** Package exists, first-party Eclipse Theia, same monorepo and version line as the 49 `@theia/*` packages already pinned. Smallest diff by a wide margin. |
| Chrome-owned web tab mirrored into Theia's tab bar | `browser-bridge` / `TabModel` / JSWindowActor pair | **Out of scope** — explicitly Milestone 2 in `docs/PRODUCT-REQUIREMENTS.md` and `.planning/research/ARCHITECTURE.md`. Would blow the phase. |
| Reuse `webview:` via `plugin-ext` | Webview panels are minted by the plugin host per `createWebviewPanel` | **Rejected** — panel ids are not addressable from memory; `docs/URI-SCHEMES.md` already lists `webview` as carve-out #4 for exactly this reason. |

### The limitation that must be documented, not discovered

An iframe-rendered web tab **cannot display any site that sends `X-Frame-Options: DENY/SAMEORIGIN` or a restrictive `Content-Security-Policy: frame-ancestors`** — which includes most large sites. `[ASSUMED]` (well-known browser behaviour; not re-verified against a live build this session).

This is the same class of accepted, documented degradation as the four existing `CARVE_OUTS` in `existing-scheme-coverage.ts:195-207`. **Recommend the planner require a fifth carve-out entry plus a `docs/URI-SCHEMES.md` section**, so GUI-02's boundary is asserted as documented behaviour rather than filed as a defect later. Sites that refuse framing are exactly what GUI-01's real browser window is for — the two requirements complement each other, and the plan should say so.

---

## Standard Stack

Everything carries over from the sourcerer tree unchanged. Phase 1 adds **one** dependency, and only for GUI-02.

### Core (migrating, unchanged)

| Library / Component | Version | Purpose | Why Standard |
|---|---|---|---|
| Firefox ESR | `153.1.0esr`, tag `FIREFOX_153_1_0esr_RELEASE` | `upstream/` substrate | Pinned in `scripts/fetch-upstream.sh` as `TAG="${TAG:-FIREFOX_153_1_0esr_RELEASE}"`; upstream checkout confirmed at `468445e58d3acc7e4e059be99856daff1f2ae8f1` `[VERIFIED: git -C upstream rev-parse HEAD]` |
| Eclipse Theia | `1.74.1` | IDE sidecar | 49 `@theia/*` packages pinned via `resolutions` in `theia/package.json` `[VERIFIED: theia/package.json]` |
| Node.js | `22.x` (nix `nodejs_22`) | Theia backend + toolchain | `flake.nix` pins `nodejs = pkgs.nodejs_22` and overrides `yarn` onto it — the comment explains that nixpkgs' default `yarn` shebang hardcodes Node 24, which would build native modules for the wrong `MODULE_VERSION` |
| Yarn Classic | `>=1.7.0 <2` | Theia workspace | `theia/package.json` `engines` |
| TypeScript | `~5.9.3` | Theia extensions | `theia/package.json` `devDependencies` |
| React | `18.3.1` | Theia widgets (branding) | `theia/applications/browser/package.json` |
| Nix flakes | nixpkgs rev `ffb3c9b700e759be2ef13237c9d8f953b32a1e46` | Both toolchains | `flake.lock` — **migrates verbatim, which is what makes MIG-01 reproducible**. Do not re-lock in Phase 1. |
| sccache | via nixpkgs | Gecko compile cache | `.mozconfig:9` `ac_add_options --with-ccache=sccache` + `RUSTC_WRAPPER=sccache` in the firefox devShell |

### Supporting (net-new, GUI-02 only)

| Library | Version | Purpose | When to Use |
|---|---|---|---|
| `@theia/mini-browser` | `1.74.1` | iframe-backed web-page widget for GUI-02 | Only if the planner adopts the recommended GUI-02 approach. Must be pinned to `1.74.1` and added to `theia/package.json`'s `resolutions` block alongside the other 49, or the workspace will resolve a mismatched Theia core. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|---|---|---|
| Extending `SourcererSingleInstanceHandler` for startup-window selection | Keeping the `BROWSER_CHROME_URL` patch hunk | Keeps the diff smaller *now*, but leaves GUI-01's browser window structurally degraded (no Ctrl+L, no modal dialogs) and leaves a brand value in the patch stack for Phase 5 to remove. |
| `@theia/mini-browser` | Hand-rolled iframe widget in `@powerbrowser/tab-uris` | ~200 lines to reimplement widget lifecycle, focus, reload, and navigation state that a first-party pinned package already does. No upside. |
| Node for the rename script | `sed`/`git grep | xargs sed -i` | Ruled out by the ground truth above: three tokens on one `.desktop` line need three different targets, and the TitleCase form is ambiguous. A `sed` one-liner is listed as an explicit warning sign in the project's own PITFALLS.md. Use Node (already a required toolchain dependency) driving the D-15 inventory. |
| Bespoke residual scan | Extending `verify-branding-identity.mjs` | Rejected by D-16. Also correct on the merits: the runtime verifier launches a built binary; the scan must run with no build. Different trigger, different layer. |

### Installation

Phase 1 requires **no `npm install` of a third-party package** except the optional GUI-02 dependency:

```bash
# Only if adopting the recommended GUI-02 approach:
cd theia && yarn workspace @powerbrowser/tab-uris add @theia/mini-browser@1.74.1
# and add "@theia/mini-browser": "1.74.1" to theia/package.json resolutions
```

Everything else is `nix develop`-supplied. `[VERIFIED: flake.nix devShells.theia / devShells.firefox]`

---

## Package Legitimacy Audit

| Package | Registry | Age (latest publish) | Downloads | Source Repo | Verdict | Disposition |
|---|---|---|---|---|---|---|
| `@theia/mini-browser` | npm | 2026-08-27 (v1.75.0) | 9,054/wk | `github.com/eclipse-theia/theia` | **SUS** (`too-new`) | **Flagged** — planner must add `checkpoint:human-verify` before install |

`[VERIFIED: gsd-tools query package-legitimacy check --ecosystem npm "@theia/mini-browser"]` returned `{"verdict":"SUS","signals":{"exists":true,"publishedAt":"2026-08-27T13:52:42.117Z","weeklyDownloads":9054,"repoUrl":"git+https://github.com/eclipse-theia/theia.git","deprecated":false,"postinstall":null}}`.

`[VERIFIED: npm view @theia/mini-browser scripts.postinstall]` → empty (no postinstall script).
`[VERIFIED: npm view @theia/mini-browser@1.74.1 version]` → `1.74.1` exists.

**Reading the flag honestly:** the `too-new` reason is derived from the *latest* version's publish date (v1.75.0, three days ago), not from the pinned `1.74.1`. The package is published from `eclipse-theia/theia` — the identical repository and publisher as the 49 `@theia/*` packages already pinned in `theia/package.json`, i.e. it adds no new trust boundary. That is an argument the human reviewer should evaluate, not a reason for research to overrule the seam. The checkpoint stands.

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** `@theia/mini-browser` — planner inserts `checkpoint:human-verify` before the install task.

---

## Architecture Patterns

### System Architecture Diagram

```
                          ┌──────────────────────────────────────┐
   scripts/               │  patches/010-powerbrowser-identity   │
   fetch-upstream.sh ────►│    (MOZ_APP_VENDOR, UA_NAME, APP_ID) │
   (git clone --depth 1   │  patches/020-powerbrowser-shell      │
    FIREFOX_153_1_0esr)   │    (DIRS += ../powerbrowser/shell)   │
          │               └───────────────┬──────────────────────┘
          │                               │ git apply --3way
          ▼                               │ + blob-hash non-vacuity assert
   upstream/  ◄──── symlink ────  upstream/powerbrowser ──► ../powerbrowser/
   (Gecko src)      + .git/info/exclude entry                    │
          │                                                      │
          │  MOZCONFIG=../.mozconfig ./mach build  (tier 3, ~40m)│
          ▼                                                      │
   objdir/dist/bin/powerbrowser  ◄───────────────────────────────┘
          │
          │ launch
          ▼
   ┌───────────────────────────────────────────────────────────────┐
   │ XPCOM: a-powerbrowser command-line-handler (sorts < m-browser) │
   │        decides which window opens                              │
   └────────────┬───────────────────────────────┬──────────────────┘
                │ default                       │ GUI-01 toggle
                ▼                               ▼
   chrome://powerbrowser/content/       chrome://browser/content/
   powerbrowser.xhtml                   browser.xhtml
   (shell: loading layer + error        (STOCK Firefox UI: tab strip,
    deck + one remote <browser>)         address bar, dialogs)
                │                               ▲
                │ PowerBrowserAPI.sys.mjs       │ opened via
                │ (sole anti-corruption layer)  │ PowerBrowserAPI
                ▼                               │
   TheiaService.sys.mjs ──spawn(env: POWERBROWSER_TOKEN,
          │                    POWERBROWSER_SUPERVISED)──┐
          │  ◄── stdout sentinel POWERBROWSER_BACKEND_READY
          │                                              ▼
          │  health probe → set token cookie    Node: Theia backend
          │  → loadURIInBrowser(localhost:3000)  @powerbrowser/token-gate
          ▼                                      (fail-closed auth +
   <browser remoteType=web> renders               parent watchdog)
   Theia frontend                                        │
          │                                              │
          ├─ @powerbrowser/branding  (welcome, about, mark, favicon)
          ├─ @powerbrowser/tab-uris  (view:/settings:/terminal:/output:/
          │                            preference:/vscode-extension:/webview:
          │                            + NEW http:/https: → GUI-02)
          └─ @powerbrowser/customize ($THEIA_CONFIG_DIR/customize.css always,
                                      customize.js iff powerbrowserPrivilegedJs)
```

### Recommended Project Structure

Identical to sourcerer's, with the renames applied. Do not restructure during a rename — a diff that both moves and reshapes is unreviewable.

```
Power-Browser/
├── flake.nix, flake.lock      # both nix devShells (theia, firefox) — verbatim
├── .mozconfig                 # hand-written Power Browser literals (Phase 1)
├── toolchain-baseline.txt     # rustc/cargo/cbindgen pins — verbatim
├── patches/                   # 010-powerbrowser-identity, 020-powerbrowser-shell
├── upstream/                  # gitignored; materialized by fetch-upstream.sh
├── powerbrowser/              # our Gecko-side tree (was sourcerer/)
│   ├── shell/                 # chrome package: xhtml/js/css + 2 sys.mjs + build files
│   ├── branding/{dev,release}/# Firefox branding dirs, hand-written literals
│   ├── distribution/policies.json
│   ├── endpoint-allowlist.json
│   └── INTERNAL-APIS.md
├── theia/
│   ├── package.json           # workspaces + 49-package resolutions block
│   ├── applications/browser/  # the composed app
│   └── extensions/{branding,customize,tab-uris,token-gate}/  # @powerbrowser/*
├── scripts/                   # fetch/apply/rebase, smoke-*, verify-*, check-*
│   ├── scan-brand-residue.*   # NEW (D-16)
│   └── rename-brand.*         # NEW (D-05)
├── inventory/                 # NEW (D-15) — the one structured token file
└── docs/                      # BUILD.md, CUSTOMIZE.md, URI-SCHEMES.md (debranded)
```

### Pattern 1: Startup-window selection belongs to the command-line handler, not to a compiled define

**What:** Choose the startup window in the `a-powerbrowser` `nsICommandLineHandler` and set `cmdLine.preventDefault = true`, rather than by overriding `BROWSER_CHROME_URL` in a patch.
**When to use:** Whenever a Firefox fork wants a non-standard startup window *and* wants stock browser chrome to remain reachable.
**Why:** `BROWSER_CHROME_URL` is not just "which window opens at startup" — upstream treats it as the identity test for "is this the main browser window", in at least five places. See *Finding 1*.

```js
// Source: derived from upstream/browser/components/BrowserContentHandler.sys.mjs:1722
//         and sourcerer/shell/SourcererAPI.sys.mjs:509-526 (both read this session)
export class PowerBrowserSingleInstanceHandler {
  QueryInterface = ChromeUtils.generateQI([Ci.nsICommandLineHandler]);
  helpInfo = "";

  handle(cmdLine) {
    try {
      const win = PowerBrowserAPI.findShellWindow();
      if (win) {                       // second launch: focus the running instance
        PowerBrowserAPI.focusWindow(win);
        cmdLine.preventDefault = true;
        return;
      }
      if (cmdLine.state === Ci.nsICommandLine.STATE_INITIAL_LAUNCH) {
        PowerBrowserAPI.openShellWindow();   // opens chrome://powerbrowser/content/powerbrowser.xhtml
        cmdLine.preventDefault = true;       // stops x-default from opening browser.xhtml
      }
    } catch (err) {
      PowerBrowserAPI.log("error", `[PowerBrowserSingleInstanceHandler] ${err}`);
    }
  }
}
```

### Pattern 2: The `upstream/<tree>` symlink is a four-way coupling

**What:** `powerbrowser/shell/` is reached from inside the Gecko tree via a git-excluded symlink.
**Coupled sites — all four must change together:**

`[VERIFIED: scripts/fetch-upstream.sh:114-119]`
```bash
  ln -sfn ../sourcerer "$git_dir/sourcerer"
  local exclude_file="$git_dir/.git/info/exclude"
  if [ -f "$exclude_file" ] && ! grep -qxF '/sourcerer' "$exclude_file"; then
    echo "/sourcerer" >> "$exclude_file"
```
1. `fetch-upstream.sh:114` — the symlink name and target.
2. `fetch-upstream.sh:116-119` — the `.git/info/exclude` line.
3. `patches/020-*.patch` — `DIRS += ["../powerbrowser/shell"]` (relative from `upstream/browser/`).
4. `.mozconfig:10` — `--with-branding=${..._BRANDING:-powerbrowser/branding/dev}` (relative to `TOPSRCDIR` = `upstream/`, resolving *through* the symlink).
5. `scripts/rebase-upstream.sh:98-100` — asserts `readlink -f "$UPSTREAM_DIR/sourcerer"` resolves back to `$REPO_ROOT/sourcerer`.

The function's own comment names the failure mode: an absent symlink is invisible to `git status --porcelain` (it's excluded), so the dirt classifier reports the legal fully-applied state on a tree that cannot configure.

### Pattern 3: Rename by inventory-driven, per-class passes — never one global replace

**What:** The rename script reads the D-15 inventory and applies one pass per `(token, case form, class)` tuple, honouring per-file overrides.
**Why:** The `.desktop` three-token line, the TitleCase display/identifier ambiguity, and the `frozen` bucket (MPL text, `MOZ_APP_ID`, `-brand-product-name = Firefox`, `a-` prefix, cid UUID, D-98/SIDE-04 citations per D-08) each defeat a single global replace.
**Mechanism:** refuse to run while any inventoried occurrence is unclassified — the classification file is the gate, not documentation.

### Pattern 4: Preserve every existing self-test verbatim

`fetch-upstream.sh --self-test`, `apply-patches.sh --self-test`, `check-patch-surface.sh`'s scan self-test, and `verify-branding-identity.mjs --positive-control <surface>` are the controls that caught three separate classes of silent failure in sourcerer's own history. Rename their strings; do not rewrite their logic. `verify-branding-identity.mjs` deliberately does *not* catch errors thrown during the live launch in `--positive-control` mode — that is load-bearing, not a bug.

### Anti-Patterns to Avoid

- **Text-editing a `.patch` file to rename its content.** Invalidates the `index` blob hashes, which degrades `git apply --3way` into the silent-no-op mode `apply-patches.sh` exists to detect. Regenerate from a patched tree.
- **`git grep -l sourcerer | xargs sed -i`.** Named as a warning sign in the project's own `.planning/research/PITFALLS.md`; the ground-truth tables above show at least four concrete cases it gets wrong.
- **Renaming `content/branding/` or `locale/branding/` in the branding `jar.mn` files.** Those are Gecko's own slot names, not our brand.
- **Regenerating the XPCOM `cid` UUID.** Nothing requires it; it is pure churn in a bisect.
- **Restructuring the tree during the rename.** Keep `git mv` pure so rename detection survives (the entire point of D-06's staging).
- **Copying `objdir/`, `objdir-release/`, `.mozbuild/`, or `upstream/` from the sourcerer tree.** Explicitly forbidden by MIG-01 and already gitignored `[VERIFIED: sourcerer/.gitignore]`. They total 35 GB.
- **Treating "the build succeeded" as evidence the rename worked.** Every hazard in this document produces a successful build.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Detecting a patch that silently applied to nothing | A "did the file change?" heuristic | `scripts/apply-patches.sh`'s `apply_patch_with_assertion` (before/after `git hash-object` on every `+++ b/` path) | Already written, already self-tested, and empirically derived from a measured `git apply --3way` failure. Migrate it. |
| Detecting Gecko modified outside the patch stack | A `git status` check | `scripts/fetch-upstream.sh`'s `classify_upstream_dirt` | Handles both directions (unaccounted dirt AND a patch whose targets are clean), excludes `.mozbuild`, and has a four-case self-test. |
| Blocking patches from touching compiled files | A suffix list in the plan | `scripts/check-patch-surface.sh` | Its suffix set is transcribed from `upstream/python/mozbuild/mozbuild/frontend/emitter.py:1126-1133`, reads targets from `+++ b/` headers only, and has its own self-test. |
| Verifying branding on the built artifact | A grep over sources | `scripts/verify-branding-identity.mjs` (six surfaces, exact equality, positive controls) | Its header documents why `grep -ri firefox comes back empty` is unachievable. Reading the manifest instead of the artifact is the tautology trap. |
| Driving the built browser for verification | A new WebDriver harness | `scripts/lib/firefox-bidi.mjs` | Shared BiDi driver, already used by four verifiers. |
| Rendering a web page as a Theia tab | A custom iframe widget | `@theia/mini-browser@1.74.1` | Widget lifecycle, focus, and navigation state are already solved by a first-party pinned package. |
| Firefox/Gecko toolchain provisioning | A package list | `nix develop .#firefox` (`inputsFrom = [ pkgs.firefox-esr-153-unwrapped ]`) | `flake.nix`'s comments document two non-obvious corrections (llvm stdenv override; unsetting `AS/LD/NM/...`) that cost real debugging to find. |

**Key insight:** the sourcerer tree's `scripts/` directory is not incidental tooling — it is the accumulated encoding of every silent-failure mode this project already hit once. The extraction's job is to carry it across intact with new names, not to improve it. Phase 6 is where verification gets rewritten.

---

## Runtime State Inventory

Rename/migration phase — all five categories answered explicitly.

| Category | Items Found | Action Required |
|---|---|---|
| **Stored data** | `~/.config/sourcerer/` — the live `THEIA_CONFIG_DIR`. Contains `recentworkspace.json`, `workspace-storage/`, `workspace-metadata/`, `globalStorage/`, `plugin-storage/`, `logs/`, and 22 `sidecar-state-*.json` files `[VERIFIED: ls -la ~/.config/sourcerer]`. Renaming the config dir key in `theia/applications/browser/package.json:84` orphans all of it. | **Code edit only.** Fresh product, no user data to migrate; a clean `~/.config/powerbrowser` is the correct outcome. But GUI-03's `customize.css`/`customize.js` live here — the new path must be reflected in `docs/CUSTOMIZE.md` and in `scripts/verify-customize-inert.mjs:61` (`join(..., 'sourcerer')`). |
| | `~/.config/deocracy/sourcerer/` — the **Firefox profile root**, containing `profiles.ini`, `installs.ini`, and four profile directories `[VERIFIED: ls -la ~/.config/deocracy]`. Derived from `MOZ_APP_VENDOR` and `MOZ_APP_BASENAME`, both lowercased, per `upstream/toolkit/xre/nsXREDirProvider.cpp:1621-1637`. | **No migration.** New identity → new profile root. **But see Open Question 1: `MOZ_APP_VENDOR = "DeBIOS Foundation"` produces a profile path containing a space.** |
| | `~/.sourcerer/` — ad-hoc dev artifacts (`launch.log`, `launch.log.prev`, `profile-dev/`) `[VERIFIED: ls -la ~/.sourcerer]`. Not produced by any tracked script found this session. | **None** for Power Browser (leave sourcerer's alone; the repo is frozen per D-04). |
| **Live service config** | **None.** No n8n, no Datadog, no Cloudflare, no Tailscale, no external SaaS holds a "sourcerer" identifier for this project. `[VERIFIED: no such integrations referenced anywhere in the tracked tree; git remote is only `https://github.com/Deocracy/Sourcerer.git`]` | None. Power-Browser's own git remote is a separate, unrelated setup task. |
| **OS-registered state** | `~/.local/share/applications/` contains **no** sourcerer `.desktop` entry, and `grep -rl -i sourcerer` over both `~/.local/share/applications/` and `/usr/share/applications/` returns nothing `[VERIFIED: probed this session]`. `docs/BUILD.md:466-472` documents installing them there as a manual dev step that has not been performed. No user systemd units match `[VERIFIED: systemctl --user list-units | grep -i sourc → empty]`. No pm2, no cron. | **None to un-register.** Power Browser's own `.desktop` files are new files with new absolute `Exec=`/`Icon=` paths — see the *coincidental* class note in *Coupled Reference Formats §6*. |
| **Secrets / env vars** | `SOURCERER_TOKEN` is **minted at runtime** by `TheiaService.sys.mjs` and passed to the spawned backend — it is not a stored secret. No `.env`, no SOPS, no CI secret in the tree. `[VERIFIED: .gitignore lists .env/.env.* as ignored; no .env file is tracked; no secret-store references found]` The env-var *names* (21 occurrences of `SOURCERER_TOKEN`, 14 of `SOURCERER_SUPERVISED`, 9 of `SOURCERER_TOKEN_DISABLE`, 59 of `SOURCERER_BACKEND_READY`) are cross-tier contracts. | **Code edit, both sides in one commit.** Chrome side (`powerbrowser/shell/TheiaService.sys.mjs`), Node side (`theia/extensions/token-gate/src/node/powerbrowser-env.ts`, `token-gate-backend-contribution.ts`), and test side (`scripts/smoke-theia.sh`, which sets `SOURCERER_TOKEN_DISABLE=1`). Split across commits ⇒ the backend boots and rejects every request with no error naming the cause. |
| **Build artifacts / installed packages** | `sourcerer/objdir` (17 GB), `objdir-release` (13 GB), `upstream/` (5.6 GB), `.mozbuild/` (367 MB), plus built binaries at `objdir{,-release}/dist/bin/sourcerer` `[VERIFIED: du -sh, ls -la]`. All gitignored. `upstream/.git/info/exclude` contains a literal `/sourcerer` line `[VERIFIED: tail of the file]`. `theia/**/lib/`, `node_modules/`, `.theia/`, `plugins/` are gitignored build output. `~/.cache/sccache` is 6.1 GB. | **Build fresh, copy nothing** (MIG-01). Power Browser's `upstream/` is a new clone whose `.git/info/exclude` will get `/powerbrowser` written by the migrated `ensure_branding_overlay`. sccache is shared and safe to reuse (content-addressed), though its measured hit rate on a compiled-define change is 0.14%. Free space is adequate: 1.2 TB available `[VERIFIED: df -h /home]`. |

**The canonical question — after every file in the repo is updated, what still has the old string?**
Only three things, all of them fresh-start-correct rather than migration problems: the two config directories under `$HOME`, and `sourcerer/upstream/.git/info/exclude` (which belongs to the frozen sourcerer tree and is never touched by Power Browser).

---

## Common Pitfalls

### Pitfall 1: The TitleCase `Sourcerer` is two different tokens

**What goes wrong:** A single `Sourcerer → PowerBrowser` pass renames `-brand-full-name = Sourcerer Dev` to `PowerBrowser Dev`. The build succeeds. The window title says "PowerBrowser Dev". `verify-branding-identity.mjs` surface 4 passes, because it compares against the `VARIANTS` descriptor's `brandFullName` — which the same pass also rewrote to `PowerBrowser Dev`. **Both sides move together, so the verifier agrees with the wrong answer.**
**Why it happens:** 291 TitleCase occurrences, lexically identical, ~40 of which are display strings.
**How to avoid:** classify TitleCase occurrences **per site** in the inventory, not per token. Pin the six display-surface expectations (`brand.ftl` ×2 variants ×4 terms, `brand.properties` ×2 ×3, `configure.sh` ×2, `.desktop` ×2, `package.json` `applicationName`) as literal `Power Browser` strings written by hand, and have the inventory mark them `brand-display` so the script never touches them.
**Warning signs:** the string `PowerBrowser ` (with a trailing space, no space between the words) appearing anywhere in a diff; `verify-branding-identity.mjs` passing on the first try after a rename.

### Pitfall 2: The verifier regex and its emitter drift apart

**What goes wrong:** `APP_IDENTITY_LINE_RE` at `verify-branding-identity.mjs:347` embeds *two* brand tokens — `SourcererAPI` (in the console-mirror prefix) and `SOURCERER_APP_IDENTITY`. Their emitters live in `powerbrowser/shell/`. Rename one file and not the other and the runtime-identity surface fails with "did not appear within Nms" — a timeout message that names nothing.
**How to avoid:** treat every regex/string literal that encodes a brand token as a coupled-format row in the inventory, with an explicit `couples_with` field. The known set is listed in *Coupled Reference Formats §5*.
**Warning signs:** a surface failing with a timeout rather than a value mismatch.

### Pitfall 3: Cross-tier env-var contracts renamed in separate commits

**What goes wrong:** D-06's staged-commit strategy is correct for bisectability but hazardous here. `SOURCERER_TOKEN` crosses chrome → Node. If the chrome half renames in the "identity class" commit and the Node half in the "Theia class" commit, the tree at the intermediate commit boots a backend that rejects every request with a 403 and a chrome side that waits for a health probe that will never pass — and `smoke-theia.sh` (which sets `SOURCERER_TOKEN_DISABLE=1`) *still passes*, because it bypasses the gate.
**How to avoid:** stage by **contract**, not by tier. Every row in the `SOURCERER_*` census marked cross-tier must have all its sites in one commit. Add a check that the residual scan is green *within each staged commit*, not only at the end.

### Pitfall 4: `.desktop` paths silently point at the sourcerer repo

**What goes wrong:** `Exec=/home/chris/coding/sourcerer/objdir/dist/bin/sourcerer` under a token-boundary rename becomes `/home/chris/coding/powerbrowser/objdir/dist/bin/powerbrowser` — a directory that does not exist. The rename script reports success. The desktop entry silently does nothing when clicked. `verify-branding-identity.mjs` surface 5 only checks `Name=` and `StartupWMClass=` against `config.status`, **not** that `Exec=` resolves.
**How to avoid:** hand-write both `.desktop` files (they are 9 lines each). Add `/home/chris/coding/sourcerer` as a `coincidental`-class inventory row with target `/home/chris/coding/Power-Browser`, so the scan reports it and the script leaves it alone. Consider a scan rule asserting the `Exec=` target exists.

### Pitfall 5: The symlink and the git-exclude drift from the tree name

**What goes wrong:** `ensure_branding_overlay` is renamed but `upstream/.git/info/exclude` on a pre-existing `upstream/` still says `/sourcerer`. The new `/powerbrowser` symlink is then **visible** to `git status --porcelain`, so `classify_upstream_dirt` reports "dirty in paths no patch accounts for" and `fetch-upstream.sh` fails. Or, worse, the reverse: the symlink is missing, is invisible because it *is* excluded, and the classifier reports the legal fully-applied state on a tree that cannot configure — the exact failure the function's own comment documents.
**How to avoid:** Power Browser's `upstream/` is a fresh clone, so the exclude file starts clean — but only if the rename lands before the first `fetch-upstream.sh` run. Sequence: rename → fetch → apply → build. If `upstream/` was already materialized, `rm -rf upstream` is the remediation the scripts themselves recommend.

### Pitfall 6: The build cost is budgeted as if it were incremental

**What goes wrong:** the plan assumes iteration on branding is cheap. It is not: `.mozconfig` options and `patches/010-*` are **compiled defines**, `XPCOM_MANIFESTS` is a tier-3 trigger, and sccache measured a **0.14% hit rate** on exactly this kind of change.
**Measured ground truth `[VERIFIED: docs/BUILD.md:269, 283]`:**

| Build | Command | Wall time |
|---|---|---|
| dev (`objdir/`) | `MOZCONFIG=../.mozconfig ./mach build` | **2368s (~39m28s)** |
| release (`objdir-release/`) | `SOURCERER_OBJDIR=objdir-release SOURCERER_BRANDING=... ./mach build` | **2822s (~47m2s)** |

`docs/BUILD.md:290-295` states artifact builds cannot help: `MOZ_APP_NAME` is a compiled define and the Taskcluster job configuration hardcodes `product="firefox"`, so there is no faster path to a first branded binary than tier 3.
**How to avoid:** budget **one** dev build for the walking skeleton and treat a second (release-variant) build as optional in Phase 1. Get every hand-written branding literal right *before* the first build — a typo in `brand.ftl` costs 40 minutes. Verify what can be verified without a build first: the residual scan, `check-patch-surface.sh`, `apply-patches.sh --self-test`, `fetch-upstream.sh --self-test`, `tsc -b` on the four Theia extensions, and `smoke-theia.sh` (which needs no Gecko build at all).

### Pitfall 7: Scoping the residual scan wrong in either direction

**What goes wrong:** scoped to include `upstream/`, `objdir*/`, or `node_modules/`, the scan drowns in Gecko's own thousands of `firefox`-named files and someone appends `|| true`. Scoped by substring rather than token boundary, it misses `sourcererPrivilegedJs` or false-matches inside longer words.
**How to avoid:** D-16's committed scope list, derived from `git ls-files` (which already excludes every ignored path), plus token-boundary matching per case form. D-17's reconciled-counts requirement is the specific control against an under-scanning scanner — the report must show *where* each token was found, not just that some were.

### Pitfall 8: `Deocracy` is forgotten because it is not a case variant of "sourcerer"

**What goes wrong:** the inventory is built by scanning for `sourcerer` in three cases. `Deocracy` (13 occurrences) and `org.deocracy` are invisible to that scan, so `MOZ_APP_VENDOR` stays "Deocracy", `-vendor-short-name` stays "Deocracy", and `--with-distribution-id=org.deocracy` ships. `verify-branding-identity.mjs:338` hardcodes `const expectedVendor = stockControl ? 'Mozilla' : 'Deocracy';` — so the verifier agrees.
**How to avoid:** the D-15 inventory is a token *set*, not a search for one string. Seed it with `sourcerer`, `Sourcerer`, `SOURCERER`, `Deocracy`, `deocracy`, `sourcerer.dev`, and the repo-root path. `[VERIFIED: 13 Deocracy occurrences across .mozconfig:7, LICENSE:133, patches/010:20, verify-branding-identity.mjs:31,338, verify-endpoints.sh:300, brand.ftl ×2, endpoint-allowlist.json:82, sourcerer-welcome-widget.tsx:13, and 3 in docs/PRODUCT-REQUIREMENTS.md]`

---

## Code Examples

### Regenerating a patch so the blob-hash chain stays valid

```bash
# Source: derived from patches/010-sourcerer-identity.patch + 020-sourcerer-shell.patch
#         (index-line chain read directly) and scripts/apply-patches.sh's own logic.
set -euo pipefail
rm -rf upstream && scripts/fetch-upstream.sh
scripts/apply-patches.sh                     # tree now carries the OLD patch content

# Edit upstream/browser/moz.configure and upstream/browser/moz.build in place
# to the new Power Browser literals, then re-derive:
git -C upstream diff -- browser/moz.configure > /tmp/all-configure.diff
git -C upstream diff -- browser/moz.build     > /tmp/all-build.diff

# Split by hunk into 010 (identity: MOZ_APP_VENDOR/UA_NAME/ID, healthreport, normandy)
# and 020 (shell: DIRS += ../powerbrowser/shell  [+ BROWSER_CHROME_URL, if kept]).
# Then ASSERT the chain, which is what makes --3way a real 3-way merge:
grep '^index' patches/010-powerbrowser-identity.patch   # -> index <A>..<B>
grep '^index' patches/020-powerbrowser-shell.patch      # -> the moz.configure hunk
                                                        #    MUST read index <B>..<C>

# Prove it end-to-end, including the non-vacuity assertion:
rm -rf upstream && scripts/fetch-upstream.sh
scripts/apply-patches.sh          # must print "all 2 patches applied and verified non-vacuous"
scripts/apply-patches.sh          # must FAIL by patch name (D-75 silent-no-op guard)
scripts/check-patch-surface.sh
```

### The residual scan's reconciled-counts contract (D-17)

```js
// Shape only. The point is that the report is evidence, not an exit code.
// Source: D-16/D-17 in 01-CONTEXT.md; scope derived from `git ls-files`.
const inventory = JSON.parse(readFileSync('inventory/brand-tokens.json', 'utf8'));
const scope = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split('\n').filter(p => p && !SCOPE_EXCLUSIONS.some(x => p.startsWith(x)));

const found = new Map();   // "token@case" -> [{file, line, col}]
for (const file of scope) {
  for (const entry of inventory.tokens) {
    for (const m of matchAtTokenBoundary(readFileSync(file, 'utf8'), entry)) {
      push(found, `${entry.token}@${entry.case}`, { file, line: m.line });
    }
  }
}

// Reconciliation is the assertion, not `found.size > 0`:
//   1. every inventoried token with expected_count > 0 was found
//   2. each token's observed count EQUALS its expected count
//   3. every observed file appears in that token's expected file list
//   4. no occurrence was found that the inventory does not account for
// (4) is what catches an under-scanning scanner; (1)-(3) catch a stale inventory.
```

### An `http:`/`https:` open handler for GUI-02

```ts
// Source: shape follows theia/extensions/tab-uris/src/browser/existing-scheme-coverage.ts
//         (SourcererWebviewOpenHandler, lines 140-170, read this session).
@injectable()
export class PowerBrowserWebOpenHandler implements OpenHandler {
    readonly id = 'powerbrowser.web-uri-open-handler';

    @inject(WidgetManager) protected readonly widgetManager: WidgetManager;
    @inject(ApplicationShell) protected readonly shell: ApplicationShell;

    canHandle(uri: URI): number {
        return (uri.scheme === 'http' || uri.scheme === 'https') ? 1000 : 0;
    }

    async open(uri: URI): Promise<Widget> {
        // MiniBrowser's factory keys on the URI, so the same URL round-trips
        // to the same tab -- which is what makes it URL-addressable (GUI-02).
        const widget = await this.widgetManager.getOrCreateWidget(
            MiniBrowser.FACTORY_ID, { uri: uri.toString(true) });
        if (!widget.isAttached) { this.shell.addWidget(widget, { area: 'main' }); }
        await this.shell.activateWidget(widget.id);
        return widget;
    }
}
```
`[ASSUMED]` — `MiniBrowser.FACTORY_ID` and its options shape are not verified against `@theia/mini-browser@1.74.1` source (the package is not installed in this tree). **The planner must add a task to read the package's own source before writing this**, and the executor must not treat the identifiers above as confirmed.

---

## State of the Art

| Old approach (in sourcerer today) | Current approach (Phase 1 target) | Impact |
|---|---|---|
| `BROWSER_CHROME_URL` overridden to the shell | Startup window chosen by the `a-*` command-line handler; `BROWSER_CHROME_URL` left stock | Unblocks GUI-01, strengthens GUI-04, and removes a brand value from `020` ahead of Phase 5 |
| `Theia is the only GUI` (sourcerer CLAUDE.md hard rule) | Theia is the *default* GUI; stock browser chrome is reachable | This hard rule **must be rewritten** in Power Browser's CLAUDE.md, not copied. Copying it verbatim would encode a constraint that contradicts GUI-01. |
| `--with-app-basename=Sourcerer` (TitleCase) | `--with-app-basename=powerbrowser` (lowercase, per D-10 and CFG-03's `^[a-z][a-z0-9-]{1,31}$`) | Profile dir becomes `.../powerbrowser` rather than `.../sourcerer`; aligns Phase 1's hand-written value with Phase 2's validator so Phase 2's byte-identical test can pass |
| 7 URI schemes, no web pages | 8 schemes, `http:`/`https:` added | GUI-02 |

**Deprecated / not carried forward:**
- `docs/research/` (9 files, 89 occurrences) and `docs/PRODUCT-REQUIREMENTS.md` — Sourcerer's, per D-03.
- `logo/` (3 files, including `LE logo.svg` and two `LE`-prefixed PNGs) — Sourcerer's, per D-03. Replaced by D-11's placeholder mark.
- `.github/workflows/rebase-upstream.yml`'s comment block referencing sourcerer's plan `03-04`/`03-06` — keep the workflow, D-08-classify the citations as `frozen`.

---

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|---|---|---|
| A1 | `X-Frame-Options`/`frame-ancestors` will block most large sites in an iframe-backed Theia web tab | Finding 2 | If wrong (unlikely), the documented carve-out is unnecessary — harmless. If right and undocumented, GUI-02 is filed as a defect after shipping. |
| A2 | `MiniBrowser.FACTORY_ID` and `{ uri }` are the correct factory id and options for `@theia/mini-browser@1.74.1` | Code Examples | The GUI-02 handler does not compile or does not round-trip. **Planner must gate on reading the installed package's source.** |
| A3 | Extending the CLH to open the shell on first launch has no further side effects (session restore, `navigator:blank` handling, `--new-window`/URL arguments) | Finding 1 | First launch opens no window, or two windows. **Mitigated by requiring a spike task.** |
| A4 | Keeping a Theia shell window open behind a stock browser window does not trip last-window-close / session-end logic | Finding 1, "and back" | GUI-01's "and back" fails; app quits when the browser window closes. Spike sub-item. |
| A5 | `a-powerbrowser` sorts ahead of `m-browser` and `x-default` under the same ascending `strcmp` the current `a-sourcerer` relies on | Coupled Formats §2 | Single-instance activation silently breaks. String comparison is trivially true; only unverified in that no live run confirmed it post-rename. Cheap to assert in a test. |
| A6 | `~/.cache/sccache` (6.1 GB, shared, content-addressed) is safe to reuse across the two repos | Environment | A poisoned cache would produce a wrong binary. Content-addressing makes this near-impossible; measured hit rate is 0.14% anyway, so the upside is small. |
| A7 | The Theia workspace builds unchanged after the `@sourcerer/*` → `@powerbrowser/*` scope rename with a regenerated `yarn.lock` | Stack | `yarn install --frozen-lockfile` fails because the workspace package names changed. Expected and recoverable: drop `--frozen-lockfile` once, commit the new lock. Planner should schedule this explicitly rather than let the executor discover it. |
| A8 | `scripts/verify-phase-0{2,3,4,5}.sh` migrate (247 occurrences, 4 files) | Token Inventory | If they do not migrate, the rename scope drops by 25% and 4 files of real regression coverage are lost. **This is an unresolved decision, not an assumption to act on — see Open Question 2.** |

---

## Open Questions

1. **`MOZ_APP_VENDOR = "DeBIOS Foundation"` puts a space in the Firefox profile directory path.**
   - What we know: `[VERIFIED: upstream/toolkit/xre/nsXREDirProvider.cpp:1621-1637]` the profile root is `$XDG_CONFIG_HOME/<vendor>/<appName>` with `ToLowerCase()` applied to each component and **no space stripping**. Corroborated live: sourcerer's vendor is `Deocracy`, basename `Sourcerer`, and the directory on disk is `~/.config/deocracy/sourcerer/` `[VERIFIED: ls -la ~/.config/deocracy]`. So `"DeBIOS Foundation"` yields `~/.config/debios foundation/powerbrowser/`.
   - What's unclear: whether a space is acceptable. It is legal on Linux, but this project already has a hard rule about spaces in paths (`CLAUDE.md`: the repo must live at a space-free path because `NIX_LDFLAGS` splits on spaces), `verify-endpoints.sh` builds strace/profile paths from it, and the Theia sidecar encodes the profile path into a filename (`sidecar-state-_home_chris_config_deocracy_sourcerer_...json`).
   - Recommendation: set `MOZ_APP_VENDOR = "DeBIOS"` (space-free) and keep `"DeBIOS Foundation"` as the *display* vendor in `brand.ftl`'s `-vendor-short-name`. Note this changes `--version` output to `DeBIOS Power Browser 153.1.0esr` (surface 6 concatenates vendor + name unconditionally). **Needs user confirmation — D-09 as written locks the full string.**

2. **Do `scripts/verify-phase-0{2,3,4,5}.sh` migrate?** 247 occurrences across 4 files — 25% of the rename budget.
   - Arguments for: they are the only aggregated regression suite in the tree, and they cover real platform behaviour (token gate, bind scope, shell paint ordering, kill-and-recover, branding-variant divergence, internals catalogue, `.desktop`/`config.status` equality).
   - Arguments against: they are named and documented against *Sourcerer's* GSD phases, cite Sourcerer plan files throughout, and Power Browser's phase numbering means something different. Migrating them imports a numbering scheme that will confuse every future reader.
   - Recommendation: **migrate the checks, rename the drivers.** Consolidate the four into one `scripts/verify-platform.sh` with `--only <label>` preserved, and D-08-freeze the plan-file citations inside as provenance comments. This keeps the coverage and drops the misleading numbering. Costs one extra task; the alternative is silently losing the only real test suite.

3. **What exactly does `docs/BUILD.md` become?** It is 31 occurrences of sourcerer plus per-machine paths, measured timings attributed to `legion`, and references to sourcerer plan summaries. Debranding it per D-03 is straightforward; deciding whether the measured build timings (2368s/2822s, dated 2026-08-21, from sourcerer builds) stay as-is or are re-measured for Power Browser is not.
   - Recommendation: keep them, attributed as "measured on the sourcerer tree at `bce68bb`, same host, same toolchain" — re-measuring costs 80 minutes and would produce the same number.

4. **Does Power Browser get a `CLAUDE.md`, and what happens to the "Theia is the only GUI" hard rule?** There is no `CLAUDE.md` in this repo today `[VERIFIED: ls -la /home/chris/coding/Power-Browser]`, and `.planning/config.json` sets `"claude_md_path": "./CLAUDE.md"`.
   - Recommendation: write one in Phase 1. Carry forward the four hard rules that still hold (never fork/patch Theia core; consume `@theia/*` as npm deps; never modify Gecko outside the patch stack; design for the bridge) **and the space-free-path environment rule**, but rewrite the fifth rule to reflect GUI-01. See *Project Constraints* below.

---

## Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|---|---|---|---|---|
| Nix (flakes enabled) | Both devShells | ✓ | 2.34.8, `nix flake` works | — |
| git | fetch/apply/rebase, `git mv` staging | ✓ | 2.54.0 | — |
| node | Rename script, `verify-*.mjs`, Theia | ✓ | v24.19.0 (system); **nix shell supplies 22.x for Theia** | — |
| npm | package checks | ✓ | 11.17.0 | — |
| yarn (Classic 1.x) | Theia workspace | ✗ (system) / ✓ (via `nix develop .#theia`) | — | Always run Theia commands inside the devShell, as every migrated script already does |
| python3 | mach, mozbuild | ✓ | 3.13.15 (system); nix shell supplies the build one | — |
| `firefox-esr-153-unwrapped` (nixpkgs) | firefox devShell `inputsFrom` | ✓ (pinned) | nixpkgs rev `ffb3c9b700e759be2ef13237c9d8f953b32a1e46` via `flake.lock` | — (migrating `flake.lock` verbatim is what guarantees this) |
| sccache | `.mozconfig` `--with-ccache`, `RUSTC_WRAPPER` | ✓ | supplied by firefox devShell; `~/.cache/sccache` is 6.1 GB warm | — |
| Network access to `github.com/mozilla-firefox/firefox` | `fetch-upstream.sh` clone | ✓ (assumed; not exercised this session) | — | none — MIG-01 requires the fetch |
| Disk (≈25 GB: 5.6 GB upstream + ~14–17 GB objdir) | Gecko build | ✓ | **1.2 TB free on `/home`** | — |
| jq, rg, curl | scripts / dev loop | ✓ | jq 1.8.2, rg 15.1.0, curl 8.21.0 | — |
| `/home/chris/coding/Power-Browser` is space-free | Nix `NIX_LDFLAGS` linker rule | ✓ | — | Hard requirement; the path is compliant |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** `yarn` — supplied by `nix develop .#theia`, which is how every migrated script already invokes it.

---

## Validation Architecture

### Test Framework

There is **no** conventional test framework in this tree — no jest, no vitest, no mocha, no pytest. Validation is a set of hand-written executable scripts.

| Property | Value |
|---|---|
| Framework | None (bash + Node ESM scripts, zero npm test dependencies) |
| Config file | none — each script is self-contained and self-testing |
| Quick run command | `scripts/fetch-upstream.sh --self-test && scripts/apply-patches.sh --self-test && scripts/check-patch-surface.sh && scripts/scan-brand-residue` (all no-build, seconds) |
| Full suite command | `scripts/smoke-theia.sh && scripts/smoke-firefox.sh && node scripts/verify-branding-identity.mjs && node scripts/verify-branding.mjs && scripts/verify-endpoints.sh && node scripts/verify-uri-roundtrip.mjs && node scripts/verify-customize-inert.mjs && node scripts/verify-dev-flag-off.mjs` |

`[VERIFIED: scripts/ directory listing; smoke-firefox.sh header states "WARNING: this runs a full Gecko compile and takes HOURS"]`

### Phase Requirements → Test Map

| Req | Behavior | Type | Automated command | File exists? |
|---|---|---|---|---|
| MIG-01 | `upstream/` materializes from a script, at the pinned tag, with a valid dirt classification | integration | `rm -rf upstream && scripts/fetch-upstream.sh` | ✅ migrates |
| MIG-01 | Dirt classifier logic is correct | unit (self-test) | `scripts/fetch-upstream.sh --self-test` | ✅ migrates |
| MIG-01 | Patches apply non-vacuously with a valid hash chain | integration | `scripts/apply-patches.sh` then re-run (must fail by name) | ✅ migrates |
| MIG-01 | Non-vacuity assertion actually goes red | unit (self-test) | `scripts/apply-patches.sh --self-test` | ✅ migrates |
| MIG-01 | No patch touches a compiled path | unit | `scripts/check-patch-surface.sh` | ✅ migrates |
| MIG-02 | Inventory is complete and reconciles against the pre-rename tree | unit | `scripts/scan-brand-residue --reconcile --report <path>` | ❌ **Wave 0** |
| MIG-03 | Zero residual brand tokens post-rename | unit | `scripts/scan-brand-residue` (exit 0) | ❌ **Wave 0** |
| MIG-03 | Internals boundary + chrome package allowlist still correct | unit | `scripts/check-internals-boundary.sh` (+ its self-test mode) | ✅ migrates (strings rename) |
| MIG-04 | Theia half installs, builds, node-pty spawns, backend answers :3000 | integration | `scripts/smoke-theia.sh` | ✅ migrates |
| MIG-04 | Gecko half compiles and reports the right version | integration (**~40 min**) | `scripts/smoke-firefox.sh` | ✅ migrates |
| MIG-04 | Six branding surfaces equal Power Browser values on the built artifact | e2e | `node scripts/verify-branding-identity.mjs` | ✅ migrates |
| MIG-04 | The comparison discriminates (not vacuous) | e2e control | `node scripts/verify-branding-identity.mjs --positive-control runtime-identity` | ✅ migrates |
| MIG-04 | No unattended callout to a non-allowlisted host | e2e | `scripts/verify-endpoints.sh` | ✅ migrates |
| GUI-01 | A stock browser window opens, has a working address bar, and closing it returns to the shell | **manual-only** | — | ❌ **Wave 0** — needs a new check; BiDi cannot see chrome contexts on Linux (`WINDOWS.md #7`, cited in `verify-branding-identity.mjs` header) |
| GUI-01 | First launch opens exactly one shell window; second launch focuses it | integration | new check (spawn twice, count windows via `SHELL_READY` sentinels) | ❌ **Wave 0** |
| GUI-02 | `https://<url>` opens as a tab and the tab's URI round-trips | unit/e2e | extend `node scripts/verify-uri-roundtrip.mjs` (table-driven) | ✅ harness migrates; **new table row is Wave 0** |
| GUI-03 | Absent `customize.css` renders pixel-identically to an empty one | e2e | `node scripts/verify-customize-inert.mjs` | ✅ migrates (config-dir path renames) |
| GUI-03 | Privileged-JS binding is absent with the flag off | e2e | `node scripts/verify-dev-flag-off.mjs` | ✅ migrates |
| GUI-03 | Branding extension is actually loaded in the running app | e2e | `node scripts/verify-branding.mjs` | ✅ migrates |
| GUI-04 | `TabUriRegistry`'s exported shape is unchanged | unit | new assertion over the module's exports | ❌ **Wave 0** (cheap; the shape is the declared bridge contract) |

### Sampling Rate

- **Per task commit:** `scripts/scan-brand-residue` + `scripts/check-patch-surface.sh` + `tsc -b` on the four Theia extensions. All seconds, no build.
- **Per wave merge:** add the three self-tests (`fetch-upstream --self-test`, `apply-patches --self-test`, `check-internals-boundary` self-test) + `scripts/smoke-theia.sh`.
- **Phase gate:** full suite including the one `./mach build`, before `/gsd-verify-work`.

**Nyquist note:** the Gecko build is the sampling bottleneck — at ~40 minutes it cannot be sampled per-commit. Compensate by making everything the build would catch catchable without it: the residual scan, the patch-surface guard, the hash-chain assertion, and a **static pre-flight check that every hand-written branding literal matches the value `verify-branding-identity.mjs`'s `VARIANTS` descriptor expects**, run before the build rather than after it.

### Wave 0 Gaps

- [ ] `scripts/scan-brand-residue` + `inventory/brand-tokens.{toml,json}` — covers MIG-02, MIG-03; **must exist and be proven red before any rename runs** (binding ordering constraint)
- [ ] `scripts/rename-brand.*` — the D-05 rerunnable rename script
- [ ] New GUI-01 checks: first-launch/second-launch window count; browser-window reachability (may be manual-only — justify in the plan)
- [ ] New GUI-02 row in `verify-uri-roundtrip.mjs`'s table + a documented X-Frame-Options carve-out
- [ ] New GUI-04 assertion over `TabUriRegistry`'s exported shape
- [ ] Static pre-flight branding-literal consistency check (cheap; saves 40-minute round trips)
- [ ] Decision + consolidation of `scripts/verify-phase-0*.sh` (Open Question 2)
- [ ] `CLAUDE.md` for this repo (Open Question 4)

---

## Security Domain

`security_enforcement` is not set to `false` in `.planning/config.json`, so this section applies.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard control (already in the tree) |
|---|---|---|
| V2 Authentication | **yes** | `@powerbrowser/token-gate` — fail-closed backend auth gate. The token is minted per-launch by `TheiaService.sys.mjs` and passed via `POWERBROWSER_TOKEN`; the backend rejects unauthenticated requests. **The rename must not weaken it: `POWERBROWSER_TOKEN_DISABLE` is a named test bypass and must stay test-only.** |
| V3 Session Management | **yes** | Token delivered as a cookie set by the chrome side before the swap (`TheiaService.sys.mjs`, `SourcererAPI.sys.mjs:143-176` — the file's own comment describes the expired-token 403 path). Rename-only. |
| V4 Access Control | **yes** | `check-internals-boundary.sh` enforces that only `PowerBrowserAPI.sys.mjs` touches Firefox internals, and every touch is catalogued in `powerbrowser/INTERNAL-APIS.md`. Its `chrome://sourcerer/` allowlist globs must rename or the boundary silently widens. |
| V5 Input Validation | **yes** | URI parsing in `@powerbrowser/tab-uris` (`parseName`, lenient-parse/canonical-emit). **GUI-02 adds a new input surface**: an arbitrary user-supplied `http(s)` URL entering an iframe. Validate the scheme before constructing the widget; do not accept `javascript:`, `data:`, or `file:` through the same handler. |
| V6 Cryptography | no | No crypto is implemented in-tree; the auth token is a random value minted by chrome-privileged code. Do not hand-roll a replacement during the rename. |
| V14 Configuration | **yes** | `powerbrowser/branding/*/pref/firefox-branding.js` — ~30 prefs that gate unattended network callouts, cross-checked against `powerbrowser/endpoint-allowlist.json` by `verify-endpoints.sh`. **Every pref key here is `frozen` class** (they are Gecko's names, not ours) — only the comment text mentioning sourcerer renames. |

### Known Threat Patterns

| Pattern | STRIDE | Standard mitigation |
|---|---|---|
| Rename silently disables the backend auth gate (env-var name renamed on one side only) | Elevation of Privilege | Stage the rename by **contract**, not by tier (*Pitfall 3*). Add a check that the backend rejects an unauthenticated request post-rename — a positive control, not just "it booted". |
| Rename widens the internals-boundary allowlist (`chrome://sourcerer/` glob left stale) | Elevation of Privilege | `check-internals-boundary.sh` has a self-test mode; run it and confirm it still goes red on a synthesized offense after the rename. |
| GUI-01's stock browser window exposes surfaces the shell deliberately hid (about: pages, devtools, URL bar) | Information Disclosure | Intentional — that is what GUI-01 asks for. But confirm `verify-endpoints.sh` still passes with a stock browser window openable, since it changes what a launched session can reach. |
| GUI-02 iframe loads a hostile page that escapes into the Theia frontend | Elevation of Privilege | The Theia frontend publishes its whole DI container on `window.theia.container` in every build (`docs/CUSTOMIZE.md` states this plainly). Ensure the mini-browser iframe is sandboxed and cross-origin, and that `powerbrowserPrivilegedJs` stays `false` in release. |
| Placeholder logo (D-11) accidentally derives from a Mozilla or Sourcerer mark | Spoofing / legal | D-11 requires an *original* geometric mark. Record a named human review of every file under the branding directories (opened, not judged by filename) — ROADMAP Phase 6 already requires this discipline; start the record in Phase 1. |
| `@sourcerer.dev` → `@powerbrowser.dev` renames a contract ID to a domain the foundation does not own | Spoofing | Classify as `identity`, target `@powerbrowser.org` (D-12). Already flagged in *Coupled Reference Formats §2*. |

---

## Project Constraints (from CLAUDE.md)

**This repo has no `CLAUDE.md`** `[VERIFIED: ls -la /home/chris/coding/Power-Browser → only .git and .planning]`, though `.planning/config.json` points at `./CLAUDE.md`. The following are the inherited hard rules from `/home/chris/coding/sourcerer/CLAUDE.md`, which the planner should carry into a new Power Browser `CLAUDE.md` (Open Question 4). They are echoed in `REQUIREMENTS.md`'s *Out of Scope* section, so they are already binding on this project regardless.

Carry forward unchanged:
- **Never fork or patch Theia core.** Theia-side additions are `@powerbrowser/*` extensions composed into the sidecar. Upstream Theia is adopted by re-pinning.
- **Consume `@theia/*` as npm dependencies.** Never vendor the framework monorepo.
- **Never modify Gecko.** Zen-style patch-set repo (`upstream/` ESR tag + `patches/` + own tree). Firefox internals are touched only through the single anti-corruption layer (`PowerBrowserAPI.sys.mjs`), with every touchpoint catalogued in `powerbrowser/INTERNAL-APIS.md`.
- **Design for the bridge.** Nothing may weld Theia to full-window presentation; the mirror/proxy bridge (chrome-owned tab model, `@powerbrowser/browser-bridge`) must remain landable without rework. *(This is GUI-04.)*
- **The repo must live at a path with no space character.** `pkgs.mkShell` appends an rpath to the space-separated `NIX_LDFLAGS`; a space makes the cc-wrapper split on it and every native link step fails. Affects both the Gecko compile and Theia's node-gyp modules. `/home/chris/coding/Power-Browser` is compliant.

**Rewrite, do not copy:**
- ~~"Theia is the only GUI. No custom browser chrome."~~ → Power Browser's rule is that Theia is the **default** GUI and stock browser chrome is reachable via GUI-01. Copying sourcerer's wording verbatim would encode a constraint that directly contradicts this phase's own requirements.

---

## Sources

### Primary (HIGH confidence) — all read directly this session

- `/home/chris/coding/sourcerer` @ `bce68bb468e4dc160da8c9e238e030a400b806f8`, working tree clean:
  - `CLAUDE.md`, `.claude/CLAUDE.md`, `.gitignore`, `.mozconfig`, `flake.nix`, `flake.lock`, `LICENSE`, `toolchain-baseline.txt`, `.github/workflows/rebase-upstream.yml`
  - `patches/010-sourcerer-identity.patch`, `patches/020-sourcerer-shell.patch` (both in full)
  - `scripts/fetch-upstream.sh`, `apply-patches.sh`, `check-patch-surface.sh` (head), `smoke-firefox.sh`, `smoke-theia.sh`, `verify-branding-identity.mjs` (header + all brand lines), and brand-line greps of `verify-branding.mjs`, `check-internals-boundary.sh`, `verify-endpoints.sh`, `verify-dev-flag-off.mjs`, `verify-customize-inert.mjs`, `verify-uri-roundtrip.mjs`, `lib/firefox-bidi.mjs`, `rebase-upstream.sh`
  - `sourcerer/shell/`: `jar.mn`, `components.conf`, `moz.build`, `sourcerer.xhtml`, `sourcerer-sidecar.js`, `sourcerer.js` (header), `SourcererAPI.sys.mjs:509-526`
  - `sourcerer/branding/dev/`: `configure.sh`, `moz.build`, `content/jar.mn`, `locales/jar.mn`, `locales/en-US/brand.ftl`, `locales/en-US/brand.properties`, `pref/firefox-branding.js`; release-variant equivalents
  - `sourcerer/sourcerer.desktop`, `sourcerer/sourcerer-release.desktop`
  - `theia/package.json`, `theia/applications/browser/package.json`, all four `theia/extensions/*/package.json`, `tab-uris/src/browser/{view-factory-table.ts,existing-scheme-coverage.ts}`
  - `docs/BUILD.md` (incl. measured build-time table at :255-296), `docs/CUSTOMIZE.md`, `docs/URI-SCHEMES.md`
- `/home/chris/coding/sourcerer/upstream` @ `468445e58d3acc7e4e059be99856daff1f2ae8f1` (`FIREFOX_153_1_0esr_BUILD1`):
  - `browser/components/BrowserContentHandler.sys.mjs:1195-1250, 1690-1745`
  - `browser/base/content/browser.js:1300-1360, 4670-4690`; `browser-commands.js:290-315`; `utilityOverlay.js:405-430`
  - `browser/base/jar.mn:35`; `browser/moz.configure` (patched state)
  - `toolkit/xre/nsXREDirProvider.cpp:1600-1690`
- Live host probes: `df -h /home`, `du -sh objdir objdir-release upstream .mozbuild ~/.cache/sccache`, `ls -la ~/.config/sourcerer ~/.config/deocracy ~/.sourcerer`, `ls upstream/sourcerer`, `tail upstream/.git/info/exclude`, `systemctl --user list-units`, `grep -rl -i sourcerer ~/.local/share/applications /usr/share/applications`, tool `--version` sweep
- `/home/chris/coding/Power-Browser/.planning/`: `REQUIREMENTS.md`, `ROADMAP.md`, `STATE.md`, `config.json`, `phases/01-.../01-CONTEXT.md`, `phases/01-.../01-DISCUSSION-LOG.md`, `research/SUMMARY.md`, `research/PITFALLS.md` (head)

### Secondary (MEDIUM confidence)

- `gsd-tools query package-legitimacy check --ecosystem npm "@theia/mini-browser"` → `SUS` / `too-new`, with full signal payload
- `npm view @theia/mini-browser@1.74.1 version` → `1.74.1`; `npm view @theia/mini-browser scripts.postinstall` → empty; `repository.url` → `git+https://github.com/eclipse-theia/theia.git`; 9,054 weekly downloads

### Tertiary (LOW confidence)

- `X-Frame-Options` / `frame-ancestors` blocking most large sites in an iframe — training knowledge, not re-verified against a live build (A1)
- `MiniBrowser.FACTORY_ID` shape — training knowledge; the package is not installed in this tree (A2)

**Note on method:** this phase's research is overwhelmingly codebase-grounded rather than web-sourced. The `research-plan` provider seam was not exercised because ~95% of the questions were answerable only by reading `/home/chris/coding/sourcerer` and `upstream/` directly; the two external lookups went through `npm view` and the `package-legitimacy` seam.

---

## Metadata

**Confidence breakdown:**
- Token inventory ground truth: **HIGH** — every count computed this session over `git ls-files`; every cited value quoted verbatim with file:line
- Coupled reference formats: **HIGH** — all six read directly, including both patches in full
- Migration machinery (fetch/apply/patch-surface/verify): **HIGH** — scripts read directly, including their self-tests
- Build cost and tiering: **HIGH** — measured figures quoted from `docs/BUILD.md`'s own measurement table, with the commands that produced them
- GUI-01/GUI-02 non-existence: **HIGH** — negative claim verified three independent ways (CLAUDE.md hard rule, `sourcerer.xhtml` header comment, absence of any `http`/`https` handler or `browser-bridge` package)
- GUI-01 recommended fix (CLH + `preventDefault`): **HIGH** for the mechanism (all four upstream call sites read); **MEDIUM** for absence of side effects — not executed, spike required
- GUI-02 recommended fix (`@theia/mini-browser`): **MEDIUM** — package existence and provenance verified; API shape assumed
- Runtime state inventory: **HIGH** — every category probed on the live host, including the negatives
- Security domain: **MEDIUM-HIGH** — controls read directly; threat mapping is analysis, not measurement

**Research date:** 2026-08-30
**Valid until:** 2026-09-29 (30 days). The sourcerer tree is frozen per D-04, so the ground-truth tables do not decay. The two time-sensitive items are the `@theia/mini-browser` version line and the ESR 153 point-release cadence.
