# Pitfalls Research

**Domain:** Fork debranding / rebrandable browser platform (Firefox-ESR fork + Theia sidecar, driven by a single `configuration.toml`)
**Researched:** 2026-08-29
**Confidence:** HIGH for everything sourced from `/home/chris/coding/sourcerer` (its own `.planning/` learnings, verification reports, and the live tree, all read directly this session) and from `upstream/` Gecko source read directly. LOW for the two trademark-policy items, which are web-sourced and not legal advice.

> **Framing.** The dangerous failure mode in this project is not "the build breaks." It is **"the build succeeds and is silently wrong"** — a patch that no-ops, a check that passes vacuously, a downstream that ships someone else's trademark. Sourcerer's own Phase 3 hit exactly this class three separate times and caught it only because it had built positive controls. Every pitfall below is ordered by how silently it fails, not by how hard it is to fix.

---

## Critical Pitfalls

### Pitfall 1: A blind `s/sourcerer/powerbrowser/g` rewrites tokens that are not brand names

**What goes wrong:**
The rename pass changes strings whose value is load-bearing for reasons unrelated to branding, and the build still succeeds. Concrete instances that exist in the tree today:

| Occurrence | File | Why a blind rename is wrong |
|---|---|---|
| `@sourcerer.dev/single-instance-clh;1` | `sourcerer/shell/components.conf` | XPCOM contract ID keyed on a **DNS name**. Renaming produces `@powerbrowser.dev/...` — a domain the DeBIOS Foundation may not own. Contract IDs are supposed to be namespaced by a domain you control. |
| `"a-sourcerer"` (category entry name) | `sourcerer/shell/components.conf` | Load-bearing **sort key** — see Pitfall 2. |
| `SOURCERER_APP_IDENTITY` | 13 sites incl. `verify-branding-identity.mjs:347` | The env var name is also embedded in a verifier regex (`APP_IDENTITY_LINE_RE = /^(?:\[SourcererAPI\] [a-z]+: )?SOURCERER_APP_IDENTITY (\{.*\})$/m`). Renaming the var without the regex makes the runtime-identity surface fail; renaming the regex without the var makes it fail the other way. |
| `-brand-product-name = Firefox` | `sourcerer/branding/*/locales/en-US/brand.ftl` | Deliberately stays `Firefox` (resolved 03-01, per D-78's byte-identical-UA rationale). A pass that "helpfully" brands every Fluent term breaks UA-compat strings. |
| `MOZ_APP_ID = {ec8030f7-...}` | `patches/010-*.patch` | Firefox's own app ID, kept on purpose for extension compatibility. Must not be regenerated. |
| MPL-2.0 boilerplate headers, `LICENSE` | 40+ files | The copyright *holder* line legitimately changes; the MPL notice text does not. |
| `sourcererPrivilegedJs` | `theia/applications/browser/package.json` + 7 sites | A **config schema key**, not a display string. Branding it per-downstream forks the schema so no shared doc, extension, or verifier can reference it. |

**Why it happens:**
The brand token is lexically indistinguishable from the non-brand tokens. There are ~1,090 occurrences across 80 files outside `upstream/`, `objdir*/`, `node_modules/`, and `.planning/` — enough that nobody reviews them one at a time, so the pass gets automated and the exceptions get lost.

**How to avoid:**
Produce a **token-classification inventory before any replacement runs**. Every occurrence is assigned to exactly one of four buckets, and the pass refuses to run while any occurrence is unassigned:

1. `brand` — display strings, package scopes, file/dir names, chrome package name → renamed
2. `identity` — derived from the *organization*, not the product (domains, contract IDs, app IDs) → changed deliberately and individually, with the new value's ownership verified
3. `frozen` — must not change (`-brand-product-name`, `MOZ_APP_ID`, MPL text, schema keys, sort keys)
4. `coincidental` — the token appears inside a longer unrelated word

Commit the inventory. It is also the input the downstream-rebrand generator needs later, so it is not throwaway work.

**Warning signs:**
- A rename plan expressed as a `sed` one-liner or a single `git grep -l | xargs sed -i`.
- Any diff where `LICENSE` or a `*.patch` file changed in the same commit as source files.
- The word "just" in the plan ("just rename the scope, then the class names").

**Phase to address:** The debranding/rename phase, as its **first** task — the inventory precedes the rename, it is not a review of it.

---

### Pitfall 2: `configuration.toml` feeds a value into a position-sensitive sort key, and a downstream silently loses a feature

**What goes wrong:**
`sourcerer/shell/components.conf` registers the single-instance command-line handler under category entry name `"a-sourcerer"`. Its own comment states the mechanism outright: the name *sorts ahead* of the stock browser handler's `"m-browser"` under ascending `strcmp` (`upstream/xpcom/components/nsCategoryManager.cpp:210-213`), and ahead of `"x-default"`, the handler that actually opens a window. **The ordering is the entire mechanism.**

If the generator emits this entry as `{binary_name}` from `configuration.toml`, then a downstream named e.g. "Zebra" or "Nexus" produces `"zebra"` / `"nexus"` — both of which sort *after* `m-browser`. The build succeeds, every check passes, and the product just quietly opens a second window instead of routing to the running instance.

**Why it happens:**
The `a-` prefix looks like a naming convention, so a templating pass treats the whole token as the brand slot. Nothing in the file's shape signals that the first character is semantic.

**How to avoid:**
- Keep `a-` as a **literal** in the generator template; only the suffix is substituted.
- Add a generator-time assertion: the emitted category name must `strcmp`-sort strictly before `"m-browser"`. Fail the build, naming the file and the two compared strings, if it does not.
- Generalize the rule: **audit `configuration.toml` for every field whose value participates in an ordering, a length limit, a filesystem path, or a regex** — those are not free-text fields and each needs its own validator.

**Warning signs:**
- A template file where a substituted value appears at the start of a string that is compared, sorted, or globbed.
- A downstream rebrand that "works" but where nobody tested launching the binary twice.

**Phase to address:** The generator phase, with the assertion landing in the same commit as the template.

---

### Pitfall 3: `MOZ_APP_NAME` is `MOZ_APP_BASENAME.lower()` with no sanitization — a display name with a space produces a binary with a space in it

**What goes wrong:**
`[product] name = "Power Browser"` fed to `--with-app-basename` yields a binary literally named `power browser`. That breaks `.desktop` `Exec=`, `StartupWMClass`, every shell invocation in every script, the profile directory path, and `verify-*` argument passing — mostly as confusing quoting errors far from the cause.

**Why it happens:**
Verified directly in Gecko source, `upstream/js/moz.configure:26-32`:

```python
@depends("--with-app-name", js_standalone, moz_app_basename)
def moz_app_name(value, js_standalone, moz_app_basename):
    if value:
        return value[0]
    if js_standalone:
        return "js"
    return moz_app_basename.lower()
```

A plain `.lower()`. No whitespace strip, no character-class validation, no error. Gecko trusts the packager.

Compounding it, `--with-app-basename`'s own help text (`upstream/build/moz.configure/init.configure:1272-1279`) says `MOZ_APP_BASENAME` is used for `application.ini`'s `Name` field, *"which controls profile location"*, plus *"various system integration hooks (Unix remoting, Windows MessageWindow name, etc)"* — so this one field silently fans out into the profile path and the remoting identity.

**How to avoid:**
`configuration.toml` carries **three separate fields**, never derived from each other:

```toml
[product]
name = "Power Browser"        # display; spaces and caps allowed
[identity]
basename = "PowerBrowser"     # MOZ_APP_BASENAME; profile dir + remoting
binary_name = "powerbrowser"  # MOZ_APP_NAME; validated ^[a-z][a-z0-9-]{1,31}$
```

The generator validates `binary_name` against that regex and **hard-fails** on violation rather than sanitizing silently — a silently-sanitized name means the TOML and the artifact disagree, which is Pitfall 6.

**Warning signs:**
- Any generator code path containing `.lower()`, `.replace(" ", "")`, or `slugify(` applied to a display name.
- A `configuration.toml` with one `name` field feeding more than one Gecko option.

**Phase to address:** The `configuration.toml` schema phase — this is a schema-design decision, not a generator bug.

---

### Pitfall 4: The silent patch no-op (D-75) regresses during extraction, and templating patch files reintroduces it in a new form

**What goes wrong (part A — regression):**
Sourcerer empirically established that `git apply --3way` **exits 0 with a completely silent no-op** on already-adopted content: empty `git status --porcelain`, empty `git diff HEAD`, exit code 0. Plain `git apply` and `git am` without `--3way` both correctly fail, but `--3way` is required for legitimate upstream drift to still apply. The only mechanism that catches the silent drop is the per-patch before/after `git hash-object` comparison in `scripts/apply-patches.sh`.

During extraction that script gets rewritten (paths change, patch filenames change, it may become TOML-driven). The assertion is ~30 lines of unglamorous bash that looks redundant next to a `set -e`. Dropping it restores a state where a patch can vanish from the build and nothing reports it.

**What goes wrong (part B — new, worse):**
If the generator ever **templates a `.patch` file** from `configuration.toml` (the obvious move, since `patches/010-sourcerer-identity.patch` contains `imply_option("MOZ_APP_VENDOR", "Sourcerer")` and `patches/020-sourcerer-shell.patch` contains `chrome://sourcerer/content/sourcerer.xhtml`), it invalidates the patch's own `index <before>..<after>` blob hashes — which is precisely what lets `git apply --3way` perform a real three-way merge. With a wrong post-image hash, `--3way` degrades to a plain apply, and the failure surface flips back to the one D-75 warns about.

Worse, the stack is **hash-chained**: `patches/020-sourcerer-shell.patch:18` carries `index 33098ee135..a3dbfad2f5`, whose before-hash equals `010`'s after-hash. Regenerating patch 010 breaks patch 020 even if 020 itself is untouched.

**How to avoid:**
- **Never template a `.patch` file.** Brand-varying values that today live inside a patch must move out: either behind a Gecko preprocessor `DEFINE` (the existing `sourcerer/shell/moz.build` already does this for `SOURCERER_DEV_TREE` via `JS_PREFERENCE_PP_FILES`), or into a non-patched file the patch merely *references* by a brand-neutral path. A patch that inserts `imply_option("MOZ_APP_VENDOR", "@VENDOR@")` and lets the preprocessor fill it is fine; a patch whose bytes are generated is not.
- Carry `apply-patches.sh`'s non-vacuity assertion across **verbatim**, and carry its `--self-test` with it. The self-test is the proof the assertion can go red; it currently hardcodes `010-sourcerer-identity.patch` at `scripts/apply-patches.sh:71` and will need that one string updated.
- Keep the patch stack minimal. Sourcerer holds the entire Gecko surface to **two patch files, one hunk each** for identity — that is what makes the hash-chain manageable at all.

**Warning signs:**
- A generator that writes to `patches/`.
- `apply-patches.sh` reporting success on a tree where `git -C upstream diff HEAD` is empty.
- Any patch whose `index` line was hand-edited.

**Phase to address:** Extraction phase (part A — carry the assertion + self-test forward as a named deliverable); generator phase (part B — the "no generated patches" constraint is a design invariant to write down, not discover).

---

### Pitfall 5: Unset `configuration.toml` values silently fall back to Power Browser defaults, and a downstream ships someone else's trademark

**What goes wrong:**
`PROJECT.md` states: *"Unset values fall back to Power Browser defaults."* A downstream that forgets `[product] vendor` or `[legal] copyright_holder` gets a build that says **Power Browser** in `application.ini`, in `--version`, in the About dialog, and in the `.desktop` file — with no warning at any point. They ship it. Now they are distributing under a mark that is not theirs, which is the exact failure the whole project exists to prevent for Mozilla's mark.

**Why it happens:**
Silent defaulting is genuinely the right behavior for the ~80% of the file that is cosmetic (theme, welcome text, build channel). The design instinct is to apply one policy uniformly. Identity fields are the minority that must behave differently.

**How to avoid:**
Two-tier schema, enforced by the generator, not by documentation:

- **Required identity keys** — `[product] name`, `short_name`, `vendor`; `[identity] basename`, `binary_name`, `app_id`; `[legal] copyright_holder`. Missing → generator hard-fails, printing the missing key path and a one-line remediation. No default exists in code for these.
- **Optional keys** — everything else defaults silently, and the generator **echoes every default it applied** to stdout at build time.

There is direct in-repo precedent for the echo pattern: `rebase-upstream.sh` deliberately echoes its target tag to stdout *before* the remote-existence check, on every path, "so a dry run against a tag that turns out not to exist still proves it never silently substituted the pinned default" (03-04). Apply the same reasoning to every defaulted field.

**Warning signs:**
- A generator with `config.get("vendor", "Power Browser")` anywhere.
- `docs/REBRANDING.md` saying "fill in the fields you care about."
- A downstream build log that never mentions which values it defaulted.

**Phase to address:** `configuration.toml` schema phase (the required/optional split), enforced in the generator phase. Verified by the Sourcerer-as-downstream reproduction phase — that phase should also test a *deliberately incomplete* TOML and assert the build fails.

---

### Pitfall 6: The verification layer reads the manifest instead of the artifact, and proves nothing

**What goes wrong:**
`verify-branding.mjs` asserts that `configuration.toml`'s `name` matches the value the generator wrote into `application.ini` — which the generator wrote from `configuration.toml`. The check is a tautology. It stays green through a build that never ran, a stale objdir, a symlink pointing at the wrong variant, and a generated file that was hand-edited afterward.

**Why it happens:**
Reading the TOML is trivial; driving a built binary is not. Sourcerer's own note on this is blunt (`verify-branding.mjs` header, D-64): everything is *"read live in the page over WebDriver BiDi, not by reading source or `package.json` on disk (D-64's vacuous-pass caveat)."*

**How to avoid:**
Every branding surface is asserted against **the built artifact or the running process**, with the expected value sourced from `configuration.toml` — the TOML is the *expectation*, never the *observation*. Sourcerer's six-surface checklist (`verify-branding-identity.mjs`, `SURFACE_IDS = ['executable', 'application-ini', 'runtime-identity', 'brand-full-name', 'desktop-entry', 'version']`) is the shape to inherit and extend:

| Surface | Observation source (never the TOML) |
|---|---|
| executable | the file at `objdir/dist/bin/<binary_name>` exists and is executable |
| application-ini | parsed out of the built `dist/bin/application.ini` |
| runtime-identity | printed by the **launched binary**, scraped from its stderr |
| brand-full-name | both `brand.ftl` **and** `brand.properties` in the built tree |
| desktop-entry | the installed `.desktop` file **and** the live window's `WM_CLASS` |
| version | the binary's own `--version` output |
| icons | PNG IHDR dimensions of the installed `chrome/icons/default/default*.png` |
| Theia branding | read live in the page over BiDi (title, favicon, about dialog, welcome widget) |

**Warning signs:**
- Any verifier that imports/parses `configuration.toml` and nothing else.
- A verifier that passes when `objdir/` has been deleted.

**Phase to address:** Verification phase, but the *contract* ("expectations from the manifest, observations from artifacts") belongs in the generator phase's design so the generator emits what the verifier needs (e.g. a manifest of every file it wrote).

---

### Pitfall 7: A parameterized check with one hardcoded path is vacuous for every parameter value but one

**What goes wrong:**
The check accepts `--variant dev|release` (or, in Power Browser's case, a downstream config), threads the parameter through most of its logic, and then reads one path from a constant. It reports PASS for every variant while only ever having examined one.

This is not hypothetical — it happened twice in Sourcerer's Phase 3 alone:

- **03-05:** *"`verify-branding-identity.mjs` `BIN_DIR` is now derived from `--bin` (`dirname(BIN_PATH)`), not hardcoded to `objdir` — the executable surface previously silently re-checked the dev binary even when pointed at release."*
- **03-07:** *"Promoted a per-variant `VARIANTS` descriptor (bin/desktop/configStatus/brandFtl/brandFullName) ... closing CR-01's vacuous release-variant PASS."*

And a third, at the data layer (03-11 / `03-VERIFICATION.md`): dev and release `brand.properties` were **byte-identical**, silently contradicting `brand.ftl`'s correct divergence — invisible to the automated suite because *nothing read `brand.properties` at all*. It took a human looking at two windows side by side to find it, and even that first failed because neither variant painted a title bar.

**Why it happens:**
Parameterization is added incrementally. The first surface written is parameterized because that was the point; the fifth reuses a module-level constant because it is right there.

**How to avoid:**
- One **descriptor object per configuration** (Sourcerer's `VARIANTS`), with every path a property of it. No module-level path constants. Adding a surface means adding a property to the descriptor, which makes the omission a missing-key error rather than a silent fallback.
- A **coverage guard**: each surface pushes its id onto a `surfacesRun` array *at the point its assertion completes*, and the runner fails loudly if any declared surface never ran. Sourcerer's already does this.
- **Differential assertion**: for any two configurations that must differ, assert the difference directly rather than asserting each one independently. `branding-variant-divergence` is exactly this, and it is what would have caught the byte-identical `brand.properties`.

**Warning signs:**
- `const SOMETHING_PATH = join(REPO_ROOT, 'objdir', ...)` at module scope in a script that takes a variant flag.
- A check that passes identically whichever configuration you point it at.
- Two config files that are supposed to differ and `diff` reports no output.

**Phase to address:** Verification phase. Also a standing review criterion for every later phase that touches a verifier.

---

### Pitfall 8: The residual-brand scan is scoped wrong, and is either pure noise or a false PASS

**What goes wrong:**
The "fail the build if any branding value is hardcoded outside the manifest" check is the project's headline requirement, and it is very easy to build a version of it that is worthless in one of two directions:

- **Too wide** — scanning the repo root matches `upstream/` (a full Gecko tree), `objdir*/` (multi-GB of build output, including every generated copy of the branding files), `node_modules/`, and `.planning/`. Thousands of hits, all expected. The check gets `|| true`'d within a week.
- **Too narrow / substring-matched** — scanning only `src/`, or matching substrings, produces a green that means nothing.

Both directions have in-repo precedent:

- **04-01:** *"`check-internals-boundary.sh` default scan target is `sourcerer/shell/`, not the whole `sourcerer/` tree D-97 names literally — existing `sourcerer/branding/*/pref/firefox-branding.js` files match the `*.js` glob with zero offenses, so scanning all of `sourcerer/` would make internals-boundary a false PASS before any Phase 4 code exists, defeating Wave 0's red-by-design requirement."*
- **03-09:** *"`allowlist-doc-consistency` matches hosts as whole tokens (character-class boundary regex), not substrings — a plain substring search would let `cdn.mozilla.net` pass vacuously as a suffix of two genuinely-documented hosts."*

**How to avoid:**
The scan is defined by three committed artifacts, all reviewable:

1. **Scope** — an explicit include/exclude list (exclude `upstream/`, `objdir*/`, `node_modules/`, `.git/`, `logo/`), committed, with a comment per exclusion saying why.
2. **Token set** — every case variant, matched with **word/character-class boundaries**, never bare substrings. Today's tree carries five disjoint forms: `sourcerer` (424), `SOURCERER` (228), `Sourcerer` (225), `SourcererAPI` (158), `@sourcerer` (52) — ≈1,090 occurrences across 80 files. A single-case pass leaves four-fifths of the problem.
3. **Allowlist** — a committed file of legitimate remaining occurrences (attribution text, historical `.planning/` records, the `frozen` bucket from Pitfall 1), each with a one-line reason. **An unexplained new hit fails the build; an allowlist entry that no longer matches anything also fails the build**, so the allowlist cannot rot into a permanent mute.

**Warning signs:**
- The scan has no allowlist file (means it is either too narrow or already disabled).
- The allowlist has entries but no reasons.
- The scan is green on a tree where you just typed the old brand name into a source file (test it — see the "Looks Done" checklist).

**Phase to address:** Verification phase, written **before** the rename pass runs (red by design), so the rename's completion is measured by it rather than asserted.

---

### Pitfall 9: Generated assets are committed once, then drift from the manifest with nothing detecting it

**What goes wrong:**
A build-time artifact gets hand-tuned during development and committed, and thereafter the manifest and the artifact disagree. Two real instances:

- `theia/extensions/branding/src/browser/sourcerer-mark.ts` inlines the logo SVG as a **TypeScript string literal**, hand-recolored from `logo/LE logo.svg` with an added `@media (prefers-color-scheme: dark)` block and a chosen neutral `#1a1a1a`. It is a generated artifact living in hand-maintained source. Change the logo in `brand/` and nothing updates it, and nothing notices.
- **03-05:** *"release icon set is unbadged base-accent recolor (#2B6CB0), not a distinct accent hex — dev's committed PNGs were found (**pixel inspection**) to carry an orange corner-badge overlay, contradicting 03-01-SUMMARY.md's prose."* The written record and the committed bytes disagreed, and only opening the pixels found it.

**Why it happens:**
Generation is slow or requires a tool (inkscape) that not every contributor has, so the output gets committed "for convenience." Convenience is correct; the missing half is the staleness detector.

**How to avoid:**
- Every generated file carries a **provenance header**: source path, SHA-256 of the source, generator version. Non-text outputs (PNGs) carry it in a sidecar `.provenance` file or a PNG text chunk.
- The verifier **regenerates into a temp directory and diffs**. Mismatch = FAIL with the regeneration command printed.
- Prefer runtime reads over build-time inlining where it is free: the Theia mark should be a file the frontend fetches, not a `.ts` literal, unless there is a measured reason (favicon data-URI timing) it must be inlined — and if it must be inlined, the file is *generated*, marked as such, and gitignored or provenance-stamped.

**Warning signs:**
- A `.ts` / `.js` / `.json` file whose contents are a serialized asset.
- Any committed binary whose generation command is documented in prose but not runnable.
- A SUMMARY describing an asset's appearance without a command that verifies it.

**Phase to address:** Generator phase (provenance + regenerate-and-diff), asset-pipeline phase (the icon/mark pipeline itself).

---

## Moderate Pitfalls

### Pitfall 10: The Firefox branding directory has a fixed file contract that a generator cannot rename around

Verified directly in `upstream/browser/branding/branding-common.mozbuild`:

- **`pref/firefox-branding.js` is a hardcoded filename.** It cannot be renamed to `powerbrowser-branding.js`. The generator writes to that exact path.
- **The gtk branch installs exactly five PNGs**: `default{16,32,48,64,128}.png` via `FINAL_TARGET_FILES.chrome.icons.default`. Not four, not six, not `.svg`. Missing one is a build error; an extra one is silently ignored.
- **Non-official branding directories take the unpreprocessed branch.** `FirefoxBranding()` uses `JS_PREFERENCE_PP_FILES` only when `MOZ_BRANDING_DIRECTORY == "browser/branding/official"`; every other directory gets plain `JS_PREFERENCE_FILES`. **You cannot use the Gecko preprocessor to inject TOML values into the branding pref file** — the generator must write it whole.
- **Two branding directories cannot derive from each other.** `--with-branding` points at one directory and installs whatever five PNGs are in it; there is no build-system relationship between `dev/` and `release/`. Both icon sets are independent static files, so the generator produces both.
- **`configure.sh` sets `MOZ_APP_DISPLAYNAME`** — this is where a dev/release display-name split lives.
- **Do not copy the Windows/macOS assets forward.** `Assets.car`, `*.icns`, non-`default*` `*.ico`, `msix/`, `stubinstaller/`, `*.VisualElementsManifest.xml`, `wizHeader*.bmp`, `branding.nsi`, `dsstore`, `background.png` are Windows/Mac-only and several **are literally Mozilla's fox-logo binaries**. The correct action is never copying them, not deleting them afterward — a deleted-then-restored file is a trademark violation one `git checkout` away.

**Detection:** Verifier asserts the exact five-PNG set exists in each branding dir with correct IHDR dimensions, that no file outside a committed allowlist exists there, and that `pref/firefox-branding.js` is present under that exact name.
**Phase:** Generator phase.

---

### Pitfall 11: `--version` concatenates vendor and name with no dedup

`DumpVersion()` (`upstream/toolkit/xre/nsAppRunner.cpp:2247-2260`) prints `vendor` then `name` then version, unconditionally. With `[product] vendor` and `[identity] basename` both set to the same string — the natural thing for a small project — `--version` prints `Foo Foo 153.1.0`. Stock Firefox hides this only because `Mozilla` ≠ `Firefox`.

**Detection:** The `version` surface asserts the **two-token** string composed from the TOML's actual vendor and basename values, not a hand-written literal. Test it with a config where vendor == basename and one where they differ.
**Prevention:** Document the behavior in `docs/REBRANDING.md` and have the generator warn (not fail) when `vendor == basename`.
**Phase:** Verification phase.

---

### Pitfall 12: `StartupWMClass` has three independent failure points

1. **Channel-dependent default.** `MOZ_APP_REMOTINGNAME`, if unset, resolves to `MOZ_APP_NAME` only on the `release` channel; otherwise `MOZ_APP_NAME-MOZ_UPDATE_CHANNEL` (`upstream/toolkit/moz.configure:3337-3354`). A dev build on a non-release channel reports `powerbrowser-nightly`, and a `.desktop` file saying `StartupWMClass=powerbrowser` fails to associate the window with the launcher.
2. **Two GTK call sites.** The window class comes from `gdk_set_program_class()` (`widget/gtk/nsAppShell.cpp:485`) *and* per-window `XSetClassHint` (`widget/gtk/nsWindow.cpp:4664-4680`), the latter falling back to the former only when `mGtkWindowAppClass` is empty.
3. **Grepping the `.desktop` file proves nothing** — it matches by construction, since the generator wrote both strings from the same TOML field.

**Prevention:** Generator emits an explicit `MOZ_APP_REMOTINGNAME` (sidestepping the channel default entirely) and uses that same literal in `.desktop`.
**Detection:** Read the **live window's** `WM_CLASS` (`xprop` or BiDi), not the `.desktop` text. Sourcerer settled on `StartupWMClass=sourcerer` in both variants' `.desktop` files, with `Icon=` an absolute path to each variant's own `default128.png` rather than an icon-theme name (03-05).
**Phase:** Generator + verification phases.

---

### Pitfall 13: The icon pipeline distorts a downstream's non-square logo, silently

Empirically reproduced in Sourcerer's Phase 3: `inkscape -w N -h N` produces **exactly** N×N and stretches the source to fit — it does not letterbox. Sourcerer's own mark is 99×85.9 (≈1.153:1) and takes a ~13% vertical squish, judged acceptable for an abstract mark.

The platform cannot make that judgment for downstreams. A downstream logo with a 3:1 wordmark aspect ratio becomes unrecognizable at every icon size, and nothing fails.

**Prevention:** The generator exports at the **native aspect ratio into the larger dimension** (`-w 128` alone, letting Inkscape derive height) and pads the shorter axis to square as an explicit second step.
**Detection:** Assert PNG IHDR dimensions are exactly N×N **and** that the padding step ran (e.g. compare the pre-pad and post-pad dimensions in the generator's own log, or assert transparent border rows exist for a non-square source). Also validate the source SVG's `viewBox` ratio at generator time and warn when it exceeds ~1.5:1.
**Phase:** Asset-pipeline phase.

---

### Pitfall 14: Trademark obligations are broader than "remove the fox," and they apply to Theia too

**Mozilla** (LOW confidence — web-sourced, not legal advice): a functionally modified Firefox may not be redistributed under any Mozilla trademark without written consent; the executable name must change; and **Mozilla's logo files are copyrighted, so a derivative of the logo is a copyright infringement independent of trademark**. The sanctioned framing is "based on Mozilla technology." Debian/Iceweasel is the canonical precedent.

**Eclipse Foundation** (LOW confidence — web-sourced): project names, logos, and acronyms are Eclipse Foundation IP, and a derivative product **may not incorporate an Eclipse project trademark into its own product name**. Permitted forms are `<product> for <Eclipse project>` or `<product>, <Eclipse project> Edition`. So the platform must not be named "PowerBrowser Theia," and the sidecar's About dialog must *attribute* Theia rather than adopt it.

**Why it bites here specifically:** the platform's whole value proposition is that a stranger clones it and ships. Every compliance gap is inherited by every downstream, and the platform is the one place it can be fixed once.

**Prevention + detection:**
- The mechanical half is automatable: no `moz.png`/`*.icns`/`Assets.car`/`msix/` in the tree; no `Firefox`/`Mozilla` in display-name-bearing fields; a required `[legal] trademark_notice` and `[legal] attribution` that the generator surfaces in the About dialog.
- The judgment half is **not** automatable and must be a named human-verification item. Sourcerer's Item B was 15 files, *"opened not judged by filename,"* 0 findings, recorded durably in `03-MANUAL-VERIFICATION.md` with the reviewer and date. Reproduce that ritual, and require it again whenever a file is added to `brand/`.
- `docs/REBRANDING.md` must state the downstream's obligation explicitly, including that a downstream may not use *Power Browser's* marks either.

**Phase:** Trademark/legal-surface phase, with the human-verification item gating milestone completion.

---

### Pitfall 15: Theia's rebrandable surface is narrower than `applicationName` suggests

`theia.frontend.config.applicationName` covers the window title and some chrome. It does **not** cover, in the current tree:

| Surface | Where the brand actually lives |
|---|---|
| About dialog body | `sourcerer-about-dialog.tsx` — a literal `<h3>Sourcerer</h3>` in JSX |
| Favicon / mark | `sourcerer-mark.ts` — inlined SVG string (Pitfall 9) |
| Welcome widget | `sourcerer-welcome-widget.tsx` + `SOURCERER_REPO_URL` |
| Config key names | `sourcererPrivilegedJs` in `theia.frontend.config` |
| Package identity | `"name": "sourcerer-theia-browser-app"`, `@sourcerer/*` scope across 5 extensions |
| App title / DI class names | `SourcererAboutDialog`, `SourcererWelcomeViewContribution`, etc. |

Additional trap: Sourcerer's Theia verifiers resolve DI bindings by **reflecting on Inversify's internal `_bindingDictionary` and matching identifier `.toString()`/`.name` against a well-known string** (`verify-branding.mjs`, `verify-uri-roundtrip.mjs`). Renaming a DI-bound class therefore breaks the verifier *by string*, with a "DI binding not found" error whose cause is the rename, not the feature.

**Prevention:** Route **all** Theia-visible brand text through the generated config (`applicationName` + a generated `branding.json` the extension reads), leaving zero brand literals in `.tsx`. Keep **config key names and DI identifier names brand-neutral** (`privilegedJs`, not `powerbrowserPrivilegedJs`) — they are schema, not branding, and branding them forks the schema per downstream.
**Detection:** The BiDi verifier reads title, favicon `href`, About-dialog text, and welcome-widget text **live in the page** and asserts each equals the TOML value; plus the residual scan (Pitfall 8) covers `theia/**/src/**`.
**Phase:** Theia-branding phase.

---

### Pitfall 16: Renaming a file desyncs from the three-to-four places that reference it by path or symbol

Renaming `SourcererAPI.sys.mjs` → `PowerBrowserAPI.sys.mjs` requires coordinated edits in four different file formats:

| Reference | File | Form |
|---|---|---|
| JAR mapping | `sourcerer/shell/jar.mn` | `content/sourcerer/SourcererAPI.sys.mjs (SourcererAPI.sys.mjs)` — path appears **twice** on one line |
| Chrome package root | `sourcerer/shell/jar.mn` | `% content sourcerer %content/sourcerer/` |
| XPCOM registration | `sourcerer/shell/components.conf` | `esModule: "chrome://sourcerer/content/SourcererAPI.sys.mjs"` **and** `constructor: "SourcererSingleInstanceHandler"` (a JS export name) |
| Preprocessed pref file | `sourcerer/shell/moz.build` | `JS_PREFERENCE_PP_FILES += ["sourcerer-sidecar.js"]` |
| Patch content | `patches/020-sourcerer-shell.patch` | `imply_option("BROWSER_CHROME_URL", "chrome://sourcerer/content/sourcerer.xhtml")` |
| Verifier regex | `verify-branding-identity.mjs:347` | `/^(?:\[SourcererAPI\] [a-z]+: )?SOURCERER_APP_IDENTITY .../` |

A `git mv` plus a content `sed` catches most of these by accident, which is why the miss is usually the *one that isn't a plain string* — the JSON-ish `components.conf` constructor name, or the escaped regex.

**Detection:** After the rename, a **build from a clean objdir** is the only real proof (a stale objdir keeps serving the old `chrome://` package). Plus: assert `chrome://<new>/content/<new>API.sys.mjs` resolves at runtime, and that the single-instance handler actually registers (launch the binary twice, assert one window).
**Phase:** Rename phase; verified by the first clean full build.

---

### Pitfall 17: Case-variant coverage is four separate problems, not one

Counted in the live tree (excluding `upstream/`, `objdir*/`, `node_modules/`, `.planning/`): `sourcerer` 424, `SOURCERER` 228, `Sourcerer` 225, `SourcererAPI` 158, `@sourcerer` 52. Each form lives in a different syntactic role — lowercase in paths/URIs/binary names, UPPER in env vars and build DEFINEs, Pascal in class and file names, `@scope` in npm.

A pass that handles one form and calls it done leaves a build that compiles (the leftovers are in a different namespace) and fails at runtime or, worse, doesn't fail at all.

**Prevention:** The rename mapping is a **table of five explicit pairs**, applied in one pass with longest-match-first ordering (so `SourcererAPI` is not first mangled by the `Sourcerer` rule into `PowerBrowserAPI`... which happens to be right here, but will not be for a downstream whose mapping is not a clean prefix).
**Detection:** The residual scan (Pitfall 8) enumerates all five forms independently and reports counts per form, so "0 of 5 forms remain" is visible rather than inferred.
**Phase:** Rename phase.

---

## Minor Pitfalls

### Pitfall 18: `--quick` verification modes silently acquire heavy prerequisites
`03-REVIEW.md` WR-01: a new check landed in `verify-phase-03.sh`'s base `CHECKS` array, so it ran under `--quick` — but its real half read from both `objdir/` and `objdir-release/`, i.e. **two ~45-minute Tier-3 builds**. It passed locally only because both objdirs happened to exist. A fresh-clone contributor got an unexplained hard FAIL naming a path they had never heard of. The fix (`03-REVIEW-FIX.md`) split the check: the cheap self-test stayed in `--quick`, the build-dependent half moved to full mode. **Prevention:** every check declares its prerequisite tier; the runner groups by tier; the `--quick` header comment enumerates its actual check list.

### Pitfall 19: A positive control that goes red for the wrong reason
`03-08`: an interrupt self-test grepped for a bare pref *key* name to detect mutation — but the pristine file already contained that key, so the grep matched instantly and the test was vacuous. It was fixed by matching the appended **value** specifically. Related: `verify-dev-flag-off` *"was green for the wrong reason for three plans"* because the token was simply not registered anywhere yet. **Prevention:** a positive control must be **observed going red in the session it is written**, and its red must be attributable to the specific mutation.

### Pitfall 20: Docs and prose are the last place the old name survives
`docs/BUILD.md`, `docs/CUSTOMIZE.md` ("# Customizing Sourcerer"), `README.md`, `CLAUDE.md`, `.claude/CLAUDE.md`, and 6 files under `docs/research/` all carry the brand. Prose is skimmed in review. **Prevention:** the residual scan covers `docs/**` and `*.md` with the same rigor as source; `.planning/` and historical research docs go in the allowlist with a reason rather than being rewritten (rewriting history makes the learnings unciteable).

### Pitfall 21: `LICENSE` contains the brand and needs surgical, not automated, treatment
`LICENSE` is in the grep hit list. The copyright-holder line legitimately becomes the new entity; the MPL-2.0 notice text does not change; and the *upstream* copyright attributions must survive untouched. **Prevention:** `LICENSE` and all MPL headers are `frozen` in the Pitfall-1 inventory and edited by hand, once, with review.

### Pitfall 22: Renaming changes the profile directory
`application.ini`'s `Name` (from `MOZ_APP_BASENAME`) controls profile location. Power Browser is greenfield, so there is nothing to migrate — but **every downstream rebrand of an already-shipped product is a profile-migration event**, and a rebrand that silently strands a user's profile looks identical to data loss. **Prevention:** `docs/REBRANDING.md` states this explicitly with the old→new path mapping and a copy command.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|---|---|---|---|
| `sed -i` the whole tree, review the diff after | Rename done in an afternoon | Silently rewrites contract IDs, sort keys, license text, and frozen Fluent terms (Pitfall 1); the diff is ~1,090 hunks and gets rubber-stamped | **Never** — the classification inventory is the deliverable, the `sed` is a detail |
| Template the `.patch` files from TOML | One obvious mechanism for every branded string | Invalidates `index` blob hashes, breaks the 3-way merge and the hash chain, restores the D-75 silent-no-op surface (Pitfall 4) | **Never** — move brand values out of patches instead |
| Verify by comparing TOML to generated files | Cheap, fast, no build required | Tautological; green through stale objdirs and hand-edited artifacts (Pitfall 6) | **Never** as the *only* check; fine as a fast pre-flight *in addition to* artifact assertions |
| Commit generated icons/mark without provenance | Contributors without inkscape can still build | Silent drift between `brand/` and shipped bytes, found only by pixel inspection (Pitfall 9) | Acceptable **only** with a provenance stamp + a regenerate-and-diff check |
| Silent defaults for every unset TOML key | Simple, uniform generator | A downstream ships Power Browser's mark and never knows (Pitfall 5) | Acceptable for cosmetic keys only, and only with a build-time echo of every default applied |
| Skip the `--self-test` when porting `apply-patches.sh` | 60 fewer lines to move | The non-vacuity assertion becomes unproven, i.e. exactly the state D-75 exists to prevent | **Never** |
| One `brand/` asset set, derive dev from release at build time | Half the icons to maintain | No build-system mechanism exists for it (`FINAL_TARGET_FILES` installs whatever is in the pointed-at dir, with zero relationship between dirs) — you would be writing the derivation yourself | Fine, but own it in the generator; do not expect Gecko to help |
| Brand the Theia config keys and DI identifiers | Feels consistent | Forks the config schema per downstream; breaks every shared doc and the `_bindingDictionary` reflection in the verifiers | **Never** — keys are schema, not branding |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|---|---|---|
| Gecko `moz.configure` | Trying to set `MOZ_APP_VENDOR` / `MOZ_APP_UA_NAME` / `MOZ_NORMANDY` / `MOZ_SERVICES_HEALTHREPORT` via `.mozconfig` | These are `project_flag`s with `possible_origins=("implied",)` (`util.configure:529`) — they **categorically cannot** be set any other way. One patched hunk in `browser/moz.configure` is the only route. Keep it to one hunk. |
| Gecko branding overlay | Copying `brand/` into `upstream/` at build time (dirties the Gecko tree) | Symlink `upstream/<name> -> ../../<name>`. Verified to work because `is_read_allowed()` (`reader.py:109-132`) does pure string-prefix matching with **no `realpath()`** — the source comment says so: *"realpath() is needed for true security. But, this isn't for security protection, so it is omitted."* Register the symlink in `upstream/.git/info/exclude` (written by `fetch-upstream.sh` right after cloning) or the dirty-tree gate fires. |
| Telemetry endpoints | Blanking the pref values and calling it done | Three layers, each with a positive control: static grep of `greprefs.js`; `strace` for filesystem (**exact-path** match — a bare `.mozilla` substring false-fails, because `nsXREDirProvider.cpp:427,1295` hardcodes `.mozilla` as a path *component* on every build); `MOZ_LOG=nsHostResolver:5` for DNS. Capture window ≥35s — 20s missed the `app.update.timerFirstInterval` 30s timer. |
| Telemetry → `configuration.toml` | Exposing only an `enabled` boolean | Mirror Theia's model: endpoint + send toggle + send-to-upstream toggle, default **off**. A downstream that sets an endpoint but leaves the toggle off, or vice versa, must get a generator warning — silent half-configuration is how data leaks. |
| Remote Settings carve-out | Documenting "6-hour polling" | Wrong subsystem. `services.settings.poll_interval` is **86400 (24h)** (`modules/libpref/init/all.js:1745`); the 6-hour figure is Normandy's `app.normandy.run_interval_seconds` (`firefox.js:2870`), which is disabled anyway. Also: the carve-out is **three** hosts, not one (`firefox.settings.services.mozilla.com`, `content-signature-2.cdn.mozilla.net`, `firefox-settings-attachments.cdn.mozilla.net`), discovered only by a real layer-3 run. |
| Open VSX / npm extension install | Resolving `[extensions]` entries at build time without pins | Every entry needs id + source + **pin**, and the installer must fail loudly on a pin miss. `VSX_REGISTRY_URL` and `THEIA_CONFIG_DIR` must be set explicitly in the start script, never defaulted (02-LEARNINGS). |
| Yarn Classic (Theia workspace) | `yarn install` after any rebuild step | Any `yarn install` that relinks `node_modules` **drops the rebuilt `drivelist.node`**; and `yarn check --integrity` fails misleadingly unless called with the same flags `yarn install` used. Preserve the documented `--ignore-scripts` + explicit node-gyp rebuild sequence. |
| GitHub Actions rebase workflow | Interpolating a `workflow_dispatch` input directly into `run:` | Consume it via `env:` into a shell variable (03-04) — direct interpolation is the standard Actions shell-injection pattern. |

---

## Build-Time Traps

*(the template's "performance" section, repurposed — this project's scaling axis is build minutes and downstream count, not users)*

| Trap | Symptoms | Prevention | When it breaks |
|---|---|---|---|
| Compiled-define change treated as a fast rebuild | Branding "didn't take"; old strings persist | `MOZ_APP_VENDOR` etc. are compiled defines; `XPCOM_MANIFESTS` (`components.conf`) feeds the generated `StaticComponents.cpp` compiled into libxul. Both are **Tier 3 — full `./mach build`** (~40-47 min). Encode the tier in the generator's output so it can tell you what it just invalidated. | Immediately, on the first branded build |
| Stale binary from the previous name | A "does `firefox` still exist?" check passes negatively for the wrong reason | Unresolved open question from Sourcerer's research: whether incremental `mach build` removes the orphaned `dist/bin/firefox` when `MOZ_APP_NAME` changes. **Check it on the first branded build; do not assume.** Safest is a `mach clobber` on any identity change. | First rename; then every downstream's first build |
| Verification suite requiring N full builds | `--quick` takes 90 minutes | Tier every check (Pitfall 18) | At 2 variants; catastrophically at N downstreams |
| Testing the rebrand mechanism with one downstream | The generator hardcodes something that happens to be true for Sourcerer | The Sourcerer-reproduction phase must be joined by at least one **adversarial** fixture config: a name with a space, a name starting with `z`, a 3:1 logo, a config missing a required key | At the second downstream — i.e. exactly when the project's value proposition is first tested |
| Multi-GB objdirs copied instead of rebuilt | Days lost, disk exhausted, stale artifacts pass checks | Never copy objdirs (already a PROJECT.md decision); re-fetch `upstream/` via `fetch-upstream.sh` | Extraction, day one |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---|---|---|
| Contract ID / app ID keyed on a domain the org does not own | Namespace collision with a real owner; a downstream inherits a squatted identifier | `[identity]` domain-derived fields are **required** (no default), and `docs/REBRANDING.md` states the downstream must use a domain they control |
| Telemetry endpoint defaults to Power Browser's | Every downstream silently reports to the platform maintainer | Default **off** and **unset**; generator fails if `enabled = true` with no endpoint |
| `chrome://<brand>/` package registered web-accessible | Web content reaches privileged chrome | Keep the `jar.mn` registration line free of the web-accessible flag (as today) and assert its absence in the verifier |
| Rebranding removes the privileged-JS dev flag's guard | A downstream ships with the developer-only JS injection layer live | `verify-dev-flag-off` (with its `--expect-bound` positive control) is a platform-level check that must survive the rename, and must be **proven red** afterward |
| `[extensions]` entries installed from unpinned or arbitrary URLs | Supply-chain injection into every downstream build | Pin every entry; restrict sources to an allowlisted set (Open VSX / npm / explicit URL with a hash); fail on unpinned |
| Trademark-bearing binary assets restored by a `git checkout` | Compliance violation reintroduced silently | Never copy Mozilla's Windows/Mac branding assets into the tree at all; assert the branding dirs contain only allowlisted filenames |

---

## Rebrander-Experience Pitfalls

*(the template's "UX" section — the user here is the stranger doing a rebrand)*

| Pitfall | Impact on the rebrander | Better approach |
|---|---|---|
| Generator fails with a Gecko error 40 minutes into the build | They cannot tell whether their TOML or their machine is wrong | Validate the **entire** `configuration.toml` up front — required keys, regex-constrained fields, asset existence and dimensions, extension pin resolution — and fail in the first second, naming the key path |
| "Rebrand complete" with no way to check | They ship a half-branded product | One command (`verify-branding`) that prints a per-surface PASS/FAIL table, runnable *before* the full build for everything that does not need one |
| `docs/REBRANDING.md` written as reference, not as a walkthrough | They give up or guess | Numbered walkthrough ending in a verified build, with the exact commands. Sourcerer's own `docs/BUILD.md` had a real gap here: "Verifying a fresh clone" never invoked `verify-phase-03.sh` at all |
| Silent defaults (Pitfall 5) | They believe they rebranded; they did not | Required-key hard-fail + echo every default applied |
| Errors that name internal decision IDs | Meaningless to an outsider | Keep the repo's own convention — `script: FAIL -- <one-line cause>` then an **indented, copy-pastable remediation command** — and drop the D-number from user-facing output |

---

## "Looks Done But Isn't" Checklist

Run each of these against a tree that reports fully branded. Each has a recorded precedent for having been wrong.

- [ ] **Rename pass complete:** type the *old* brand name into a source file and confirm the residual scan goes **red**. A green scan on an untested scanner proves nothing.
- [ ] **All five case variants:** the scan reports a per-form count. `0 remaining` for `sourcerer` while `SOURCERER_*` env vars survive is a partial rename that still builds.
- [ ] **Patch stack non-vacuous:** run `apply-patches.sh` twice; the second run must **fail by patch name**, not report success. Then run `--self-test` and confirm it goes red.
- [ ] **Clean-objdir build:** `rm -rf objdir && ./mach build`. A stale objdir keeps serving the old `chrome://` package and the old binary name, masking Pitfall 16 entirely.
- [ ] **Old binary gone:** `objdir/dist/bin/<old_name>` and `objdir/dist/bin/firefox` do not exist after a branded build. (Open question in Sourcerer's research — verify, do not assume.)
- [ ] **Two configs actually differ:** `diff` the dev and release `brand.properties`, `brand.ftl`, `firefox-branding.js`, and icon sets. Byte-identical files that are supposed to diverge shipped once already.
- [ ] **Every surface ran:** the verifier's coverage guard reports all declared surfaces executed. A surface that silently never ran is indistinguishable from a passing one.
- [ ] **Every negative assertion has a red-proven control:** and the red was **observed this session**, attributable to the specific mutation (Pitfall 19).
- [ ] **Live window, not the `.desktop` file:** `WM_CLASS` read off the running window matches `MOZ_APP_REMOTINGNAME`.
- [ ] **Icons are the right five, right sizes, right aspect:** IHDR-checked, and the padding step is proven to have run on a deliberately non-square fixture.
- [ ] **Generated files are current:** regenerate into a temp dir and diff. Zero output.
- [ ] **Theia surfaces read live:** title, favicon href, About-dialog text, welcome-widget text — read in the page over BiDi, not from `package.json`.
- [ ] **Single instance still works:** launch the binary twice; one window. This is the check that catches the sort-key regression (Pitfall 2) and it is trivially easy to never write.
- [ ] **Incomplete-config fixture fails:** a `configuration.toml` missing `[product] vendor` must fail the build, naming the key.
- [ ] **Adversarial-config fixture:** a name with a space, and a name starting with `z`, both either build correctly or fail with a clear message. Neither may silently succeed-and-be-wrong.
- [ ] **No Mozilla/Eclipse marks:** automated filename+string scan, **plus** a human who opened every file in `brand/` and did not judge by filename. Recorded with reviewer and date.
- [ ] **Endpoint allowlist:** three-layer run with ≥35s capture window, positive control confirmed red, and the doc-consistency check matching **whole tokens**.
- [ ] **Builds with Sourcerer absent:** delete every Sourcerer-specific file and confirm the platform still builds and ships. The boundary rule is only real if it is tested.

---

## Recovery Strategies

| Pitfall | Recovery cost | Recovery steps |
|---|---|---|
| Blind rename rewrote frozen tokens (P1) | **LOW if caught pre-merge, HIGH after** | Revert the rename commit, build the classification inventory, re-run. Do the rename as **one reviewable commit** with no other changes so revert is clean. |
| Sort-key regression (P2) | LOW | One-line generator fix + the strcmp assertion. Cheap because the fix is small — expensive because it may go undetected for months. |
| Binary name with a space (P3) | LOW | Add `[identity] binary_name` + validator, clobber, rebuild. Costs one full build. |
| Silent patch no-op (P4) | **HIGH** | The build has been wrong for however long the assertion was absent. Every artifact since is suspect. Restore the assertion, clobber, rebuild, re-verify all surfaces. |
| Downstream shipped with defaulted branding (P5) | **HIGH — external** | Nothing technical fixes a distributed binary. Prevention is the only real control; this is why required-key enforcement is a milestone-gating requirement, not a nice-to-have. |
| Tautological verifier (P6) | MEDIUM | Rewrite each surface against artifacts, then **re-verify every previously-passed claim** — prior greens carry no information. |
| Vacuous parameterized check (P7) | MEDIUM | Promote to a descriptor object, add the coverage guard and a differential assertion, re-run for all configurations. |
| Residual scan mis-scoped (P8) | LOW | Fix scope + allowlist, re-run. Cheap; the cost is the false confidence in the interim. |
| Generated asset drift (P9) | LOW | Regenerate, diff, stamp provenance. |
| Trademark asset shipped (P14) | **HIGH — legal** | Pull the release, purge from git history if the asset was ever committed, re-review. Prevention is the only sane strategy: never copy the assets in. |

---

## Pitfall-to-Phase Mapping

Phase names are descriptive, not prescriptive — the roadmap may combine or split them. What matters is the **ordering constraints** below the table.

| # | Pitfall | Prevention phase | Verification |
|---|---|---|---|
| 1 | Blind rename hits non-brand tokens | Rename (task 1: inventory) | Classification inventory committed; every occurrence bucketed; rename is one reviewable commit |
| 2 | Sort key from TOML | Generator | `strcmp` assertion in generator + launch-twice-get-one-window check |
| 3 | `MOZ_APP_NAME` = `.lower()` | TOML schema | `binary_name` regex validator; adversarial fixture with a space |
| 4 | Silent patch no-op / templated patches | Extraction (A) + Generator (B) | `apply-patches.sh --self-test` proven red; "no generated patches" invariant documented and scanned for |
| 5 | Silent TOML defaults | TOML schema → Generator | Incomplete-config fixture fails the build; defaults echoed at build time |
| 6 | Tautological verification | Verification (contract set in Generator) | Every surface's observation traced to an artifact or process, not the TOML |
| 7 | Vacuous parameterized check | Verification | Descriptor object + coverage guard + differential assertion |
| 8 | Residual scan mis-scoped | Verification (**before** Rename) | Scan proven red by typing the old name into a file |
| 9 | Generated-asset drift | Generator + Asset pipeline | Regenerate-and-diff; provenance headers |
| 10 | Branding-dir file contract | Generator | Exact five-PNG set + `pref/firefox-branding.js` present; no non-allowlisted files in branding dirs |
| 11 | `--version` double vendor | Verification | Two-token assertion composed from TOML values |
| 12 | `StartupWMClass` | Generator + Verification | Live `WM_CLASS` read, explicit `MOZ_APP_REMOTINGNAME` |
| 13 | Icon distortion | Asset pipeline | IHDR check + non-square fixture + viewBox-ratio warning |
| 14 | Trademark scope | Legal-surface phase | Automated asset/string scan **+ named human review**, recorded with reviewer and date |
| 15 | Theia surface narrower than it looks | Theia branding | BiDi live reads of title/favicon/about/welcome; residual scan over `theia/**/src` |
| 16 | Filename/manifest desync | Rename | Clean-objdir build + runtime `chrome://` resolution + single-instance launch |
| 17 | Case variants | Rename | Per-form counts in the residual scan |
| 18 | Heavy `--quick` prerequisites | Verification | Each check declares a prerequisite tier; `--quick` header enumerates its real list |
| 19 | Wrong-reason positive control | Verification | Every control observed red in the session it was written |
| 20 | Docs carry the brand | Rename | Residual scan covers `docs/**` and `*.md` |
| 21 | `LICENSE` / MPL headers | Rename (frozen bucket) | Manual, reviewed, single commit |
| 22 | Profile directory change | Docs | `REBRANDING.md` states old→new path mapping |

**Ordering constraints that fall out of the above:**

1. **The residual scan (P8) is written before the rename runs**, and proven red. Otherwise the rename's completion has no measure. This is Sourcerer's own Wave-0 red-by-design pattern.
2. **The classification inventory (P1) precedes the rename**, in the same phase, as its first task.
3. **The `configuration.toml` schema (P3, P5) precedes the generator.** The required/optional split and the field-separation decisions are schema design; discovering them inside the generator means rewriting it.
4. **The generator precedes the verification rewrite (P6),** because the verifier's contract depends on what the generator emits — specifically a manifest of every file written, which is what makes regenerate-and-diff and the "nothing hardcoded outside the manifest" scan tractable.
5. **The Sourcerer-as-downstream reproduction is the last phase, and is not sufficient alone.** It must be joined by adversarial fixtures (P: space in name, `z`-initial name, non-square logo, missing required key). Sourcerer's own config is a *friendly* input — it is the one config the platform was accidentally built around.

**Phases likely to need their own deeper research:**

- **Generator phase** — HIGH. The TOML→artifact mapping crosses four systems with different substitution mechanisms (Gecko preprocessor, `moz.build` `DEFINES`, plain file writes, Theia JSON config), and the Gecko preprocessor is unavailable in non-official branding dirs (P10).
- **Rename phase** — HIGH. ~1,090 occurrences, five case forms, six coupled reference formats.
- **Trademark/legal phase** — MEDIUM. The two trademark findings here are LOW-confidence web-sourced and should be re-checked against current primary policy text before the milestone gates on them.
- **Asset pipeline, Theia branding, extraction** — LOW. Well-trodden by Sourcerer's Phase 3; the work is porting, not discovery.

---

## Confidence by Area

| Area | Confidence | Basis |
|---|---|---|
| Rename-pass pitfalls (1, 16, 17, 20, 21) | **HIGH** | Enumerated from the live tree this session — file contents, occurrence counts, coupled references all read directly |
| Sort-key / contract-ID hazard (2) | **HIGH** | `components.conf` states the mechanism and cites `nsCategoryManager.cpp:210-213` in its own comment |
| `MOZ_APP_NAME` derivation (3) | **HIGH** | `upstream/js/moz.configure:26-32` and `build/moz.configure/init.configure:1268-1290` read directly |
| Patch-stack mechanics (4) | **HIGH** | D-75 experiment empirically run and recorded; `index` hash-chain observed directly in `patches/*.patch` |
| Verification vacuity patterns (6, 7, 18, 19) | **HIGH** | Four independently recorded real occurrences in `03-REVIEW.md`, `03-VERIFICATION.md`, `STATE.md`, `02-LEARNINGS.md` |
| Branding-dir contract (10, 11, 12, 13) | **HIGH** | `branding-common.mozbuild`, `nsAppRunner.cpp`, `toolkit/moz.configure`, and the inkscape experiment all recorded verbatim in `03-RESEARCH.md` and re-checked against `upstream/` this session |
| Manifest-generation failure modes (5, 9) | **MEDIUM** | No generator exists yet to observe. Inferred from the design in `PROJECT.md` plus two real drift incidents (03-05 icon badge; `sourcerer-mark.ts`) |
| Mozilla trademark (14) | **LOW** | Web search only, largely against archived policy pages. Not legal advice. **Re-verify against current primary policy before gating a milestone on it.** |
| Eclipse Theia trademark (14) | **LOW** | Web search only. The derivative-naming restriction is specific enough to matter and should be confirmed against the Eclipse Foundation Trademark Usage Policy directly. |

---

## Gaps

- **No generator exists to observe.** Pitfalls 5 and 9 are the best-supported inferences available, not observed failures. Expect the generator phase to surface its own.
- **Whether incremental `mach build` removes the orphaned old-name binary** is an open question carried from Sourcerer's own research, never resolved (a full build was out of scope there). Cheap to answer on the first branded build; do not assume either way.
- **The update channel this build configures** was never chased down (`.mozconfig` sets no `--enable-update-channel`). Mitigated by exporting `MOZ_APP_REMOTINGNAME` explicitly, but it also affects `MOZ_APP_REMOTINGNAME`'s auto-derived fallback for any downstream that does not.
- **Both trademark findings are LOW confidence.** They shape the roadmap's risk ordering, but the legal-surface phase needs primary sources.
- **No second real downstream exists.** Everything about the rebrand mechanism's generality is untested until one does, which is why the adversarial fixtures matter more than the Sourcerer reproduction.

---

## Sources

**Primary — read or executed directly this session (HIGH):**
- `/home/chris/coding/sourcerer/.planning/phases/03-branded-firefox-fork/` — `03-RESEARCH.md` (Common Pitfalls, branding-directory file classification, overlay mechanism, D-75 experiment), `03-PATTERNS.md`, `03-VERIFICATION.md`, `03-REVIEW.md` (WR-01), `03-REVIEW-FIX.md`
- `/home/chris/coding/sourcerer/.planning/phases/02-sourcerer-theia-extensions/02-LEARNINGS.md` — positive-control patterns; "`verify-dev-flag-off` was green for the wrong reason for three plans"
- `/home/chris/coding/sourcerer/.planning/STATE.md` — the per-plan learnings log (03-05 `BIN_DIR`, 03-07 `VARIANTS`, 03-08 vacuous grep, 03-09 token-vs-substring, 04-01 scan scope, 03-04 echo-before-check)
- Live tree: `sourcerer/shell/{jar.mn,components.conf,moz.build}`, `patches/*.patch`, `scripts/apply-patches.sh`, `scripts/verify-branding*.mjs`, `theia/applications/browser/package.json`, `theia/extensions/branding/src/browser/*`
- Gecko `upstream/`: `js/moz.configure:16-37`, `build/moz.configure/init.configure:1268-1296`, `toolkit/moz.configure:3337-3354`, `browser/branding/branding-common.mozbuild`

**Secondary — web search (LOW):**
- [Mozilla Trademark Guidelines](https://www.mozilla.org/en-US/foundation/trademarks/policy/) · [Distribution Policy for Mozilla Software](https://www.mozilla.org/en-US/foundation/trademarks/distribution-policy/) · [Mozilla Trademark Policy FAQ (archived)](https://www-archive.mozilla.org/foundation/trademarks/faq)
- [Eclipse Foundation Trademark Usage Policy](https://www.eclipse.org/legal/logo-guidelines/) · [Eclipse Foundation Trademarks](https://www.eclipse.org/legal/trademarks/)
- [Debian–Mozilla trademark dispute](https://en.wikipedia.org/wiki/Debian%E2%80%93Mozilla_trademark_dispute) · [Bugzilla 525306 — MOZ_APP_DISPLAYNAME and official branding](https://bugzilla.mozilla.org/show_bug.cgi?id=525306) · [LibreWolf FAQ (profile migration)](https://librewolf.net/docs/faq/)

---
*Pitfalls research for: fork debranding + single-manifest rebrandable browser platform*
*Researched: 2026-08-29*
