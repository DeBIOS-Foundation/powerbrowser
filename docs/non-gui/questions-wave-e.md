# Wave E — questions

Rows NG-051 and NG-063 to NG-074. Every row is still planned and built. Nothing here drops, defers or
narrows a row.

**Status (2026-09-25):**

- The controller's rulings R9 to R16 in `docs/non-gui/decisions.md` answer Q2 and Q4 to Q11, and the
  plan follows them.
- Q1 and Q3 are with Chris. The plan steps that depend on those answers are marked `(waits: Chris Q1)`
  or `(waits: Chris Q3)`, and every other step builds without them.
- Q8 is a notice.
- Q12 and Q13 are new, raised by applying R11 and R13.

## Q1. NG-074: two GUI-track quick rows are red on main and belong to no wave — OPEN (Chris)

`gui08-canvas-geometry` (and its self-test) and `gui08-panorama-copy` (and its self-test) have been red
since `7b7a1f7`, the Panorama work committed under D1(a):

- `organising-widget.ts` no longer carries the `dataset.tray` canvas anchor.
- `modes.css` lost the 160px card and the 160x90 thumbnail.
- The copy drifted: "Expand" and "Done" were added; "Ungrouped" and the no-ungrouped-tabs line were removed.

Neither row has an NG ID. CI must pass on main (NG-074), and it cannot while these rows are red. The
plan does not exclude them. Only its final green-run step (Task 12 Step 4) waits on this answer.

Unblock, one of:

- (a) Assign the fix to the GUI track, to land before NG-074 is marked done.
- (b) Approve a named exclusion. `verify.yml` would print each excluded label and your reason on every
  run, following the `GATE_KNOWN_OPEN_EXCLUSIONS` pattern.
- (c) Re-pin the two contracts to the committed Panorama design. This edits
  `scripts/verify-gui08-canvas-geometry.mjs` and `scripts/verify-gui08-panorama-copy.mjs`, which are
  not wave E's files.

## Q2. NG-051: the six ai-opencode rows run only while the adapter is composed — ANSWERED (R9)

R9: they run only when the adapter is composed; otherwise `ai-opencode-held` stands in and reports them
held. Task 2 implements this.

## Q3. NG-070: most spaced-name surfaces are outside wave E, and CLAUDE.md requires the spaced form — OPEN (Chris)

The row's evidence names three places: `configuration.toml:47`, `TheiaService.sys.mjs:42-44` and
`mode-service.ts:380/514/530`. A scan of the tree finds the spaced form in many more user-visible
strings.

**Built now, in Task 11** (not error or legal text, so no wait):

- `theia/extensions/telemetry/src/browser/telemetry-preferences.ts:41`
- `scripts/crash-collector.mjs:354, 402`

**Task 14, `(waits: Chris Q3)`, wave E's own files:**

- the `configuration.toml` trademark notice and its `package.json` copy, which are legal text
- `scripts/crash-collector.mjs:303`, an error string

**Task 14, `(waits: Chris Q3)`, wave C's files** (`Needs: wave-c`):

- `powerbrowser/shell/TheiaService.sys.mjs`, all of `USER_MESSAGE`
- `theia/extensions/modes/src/browser/mode-service.ts:380, 514, 530`
- `theia/extensions/modes/src/browser/setups-service.ts:112-158`

**Files no wave owns:**

- `theia/extensions/branding/src/browser/powerbrowser-about-dialog.tsx:27`
- `theia/extensions/chrome-bar/src/browser/chrome-bar-widget.tsx:608, 614`
- `theia/extensions/modes/src/browser/dependent-windows.ts:52`
- `theia/extensions/modes/src/browser/organising-widget.ts:2061, 2067`
- `theia/extensions/tab-uris/src/browser/web-tab.ts:72` (wave A owns only the row writes in this file)

**Copy-contract checks that pin the spaced string** (no wave owns them):

- `scripts/verify-shell-error-copy.mjs`. It requires every `USER_MESSAGE` to include the spaced form
  (:318) and pins contract strings (:537-539, 558-559, 768-778).
- `scripts/verify-setup-roundtrip.mjs:72-73`
- `scripts/verify-gui09-setups-copy.mjs:592-593`
- `scripts/verify-dependent-window-content.mjs:96`
- `scripts/verify-gui08-panorama-copy.mjs:72-73`

`CLAUDE.md`, under "User-facing copy", says every user-facing error string "names the product as
'Power Browser'". That directly contradicts NG-070. Changing the trademark notice from "Power Browser is
a trademark of <product.vendor_display>." to the one-word form changes legal text.

Unblock: say "wave E may edit the NG-070 string literals, the copy-contract checks listed above, the
trademark notice, and CLAUDE.md's copy rule". Task 14 then covers them all. Until then the
`ng070-no-spaced-name` check stays red and names each remaining file.

## Q4. NG-064: bare aus5 host mentions — ANSWERED (R10)

R10: the bare hosts in upstream's HTTP/3 list and in the Remote Settings fallback map are not update
URLs. The check asserts that no update URL points at aus5.

## Q5. NG-064: a downstream inheriting the platform update URL — ANSWERED (R11)

R11: the generator refuses a downstream build whose `urls.update` host is the platform's own (fail
closed). This is Task 15, and the NG-064 check has an arm for it. See Q12.

## Q6. NG-065: certificate location, keys, password, docs — ANSWERED (R12, R14)

R12:

- The certificate is `powerbrowser/packaging/mar/mar-primary.der`.
- One key fills both updater slots.
- The key store's password is read from `~/.config/powerbrowser-release/mar-key/password.txt`, which is
  created in Chris's key step (Task 8 Step 1) and is never empty.

Wave E updates `docs/BUILD.md` and `docs/RELEASING.md` in Task 8.

## Q7. NG-063: packaged Node runtime — ANSWERED (R13)

R13: the package ships the official upstream Node release, `v22.23.2`, pinned in
`powerbrowser/packaging/node-runtime.json` and sha256-checked.

- `package-linux.sh` fetches it from `nodejs.org`, which has a build-time allowlist row.
- `ng063-packaged-launch` requires the packaged `node` to match the pin and to name no `/nix/store/`
  path.

See Q13.

## Q8. NG-073: the check may pass on the current code — NOTICE

The `ng073-declared-extension-loads` check works as follows:

1. It builds a fixture `.vsix`.
2. It declares that `.vsix` in a scratch copy of the app `package.json`.
3. It runs the app's own `download:plugins` step.
4. It launches the built app with that plugins folder and waits for the extension's `activate()`
   marker.

The stock Theia downloader and loader may already do all of this. If `record-fail` refuses the check
because it passes, the evidence says the behaviour exists. The controller then proposes
`DROP NG-073` with the check output. The row's gap was that nothing had ever proven it.

## Q9. Documentation that wave E makes stale — ANSWERED (R14)

R14: wave E updates `docs/REBRANDING.md`, `docs/ai-opencode-adapter.md`, `docs/BUILD.md` and
`docs/RELEASING.md`. The doc steps are in Tasks 2, 6, 7, 8, 9 and 10, each in the same commit as the
change that makes the doc stale.

## Q10. NG-069: allowlist dispositions — ANSWERED (R15)

R15: `open-vsx.org`, the AI provider hosts and the download hosts are allowed, with the reason
"user-initiated" and the feature named. The AI hosts are contacted only when a key is configured.
This is Task 5.

## Q11. NG-066: the Windows certificate issuer — ANSWERED (R16)

R16: accepted. `CERTIFICATE_ISSUER` stays upstream's, and Windows signing is deferred with NG-075.

## Q12. R11 turns seven committed downstream fixtures red — OPEN (controller)

Seven expected-pass downstream fixture manifests state no `[urls] update`. They are:

- four under the archived v1.0 phase-07 fixture root
- three under the archived v1.1 phase-09 fixture root

Both roots are globbed by `check_verify_downstream_fixtures` in `scripts/verify-platform.sh`. Once
`configuration.toml` states the platform update host (Task 7) and the generator refuses an inherited
host (Task 15), each of these fixtures fails generation. That turns the quick row
`verify-downstream-fixtures` red.

The fixtures live under `.planning/`, which only the controller may edit (G3).

Unblock: the controller adds these two lines to each of the seven manifests in main:

```toml
[urls]
update = "https://updates.example.org/update.xml"
```

The expect-fail fixtures need no change. The wave E clone then pulls main, and Task 15 proceeds.
Task 15 is ordered last and blocks no other task.

## Q13. R13 makes Node portable, but not the package — NOTICE

Verified 2026-09-25, read only:

- The packaged Gecko launcher `powerbrowser-bin` has the ELF interpreter
  `/nix/store/…-glibc-2.42-67/lib/ld-linux-x86-64.so.2`.
- `libxul.so` carries 25 `/nix/store/` references.

With the official Node release the sidecar runtime no longer depends on the Nix store, but the Gecko
half of the package still runs only where those store paths exist. A package that runs on other Linux
hosts needs a non-Nix Gecko toolchain or a release build environment. That work belongs with the
deferred rows NG-075 to NG-078.

Unblock: none needed for wave E. Record it if R13 was meant to cover the whole package.
