# Testing Patterns

**Analysis Date:** 2026-09-07

## Test Framework

**There is no unit-test framework and no test runner.** No Jest, Vitest, Mocha, or `*.test.ts` /
`*.spec.ts` file exists anywhere in project code (`git ls-files | grep -E '\.(test|spec)\.'`
returns nothing). Do not add one to satisfy a habit — verification here is a **registry of
executable checks** driven by one script.

**The driver:**
- `scripts/verify-platform.sh` — ~5000 lines, one `CHECKS` registry, one summary table.
- Runs `set -uo pipefail` with **no** `-e`: every check runs even after a failure, because the
  value of a run is the whole table, not the first red row.
- Every check is invoked under `setsid` so `kill -- "-$PID"` reaches the whole process group;
  checks that launch a browser or the sidecar are two layers deep.
- A run-scoped throwaway `XDG_CONFIG_HOME` is exported so live checks never litter the real
  `$HOME/.config/powerbrowser`.

**Run commands:**
```bash
scripts/verify-platform.sh --quick          # no build, no browser, no display — the commit gate
scripts/verify-platform.sh --only <label>   # exactly one registry row
scripts/verify-platform.sh                  # everything
scripts/verify-platform.sh --gate           # everything plus the WINDOWS.md known-open exclusions
scripts/verify-platform.sh --build          # build the Theia app first, then run
```
`--gate` cannot be combined with `--quick` or `--only`; the combination is a loud named error.

**Adding a check means appending one row to that registry.** It does not mean creating a sibling
driver. `verify-phase-0{2,3,4,5}.sh` were deleted in the commit that created the driver and must
not come back — they were named against the *upstream* project's phase numbering, so a reader
following a driver name landed on the wrong work every time.

## Test File Organization

**Location:** all checks are flat in `scripts/`.

**Naming:**
- `scripts/verify-<subject>.mjs` — derived assertions, run with `node`.
- `scripts/check-<subject>.sh` — shell gates, run with `bash`.
- `scripts/scan-<subject>.mjs` — whole-tree scans.
- `scripts/smoke-<target>.sh` — live boot smoke (`smoke-firefox.sh`, `smoke-theia.sh`).
- Shared helpers live in `scripts/lib/` (`firefox-bidi.mjs`, `toml.cjs`, `config-schema.json`).

**Registry row format** (in `scripts/verify-platform.sh`):
```bash
"label|command"
# each row preceded by a comment naming: the requirement id, why the row exists,
# and whether it is honestly --quick (no build, no browser, no display, no network)
```

## Check Structure

Every `verify-*.mjs` follows the same shape (canonical example:
`scripts/verify-registry-shape.mjs`):

```js
#!/usr/bin/env node
/** Header: requirement id, what is asserted, why it is derived not listed,
 *  and whether it is honestly --quick. */
import { readFileSync } from 'node:fs';

const EXPECTED = Object.freeze([...]);   // the ONE hand-written contract

function checkShape(sources) { /* returns an array of failure strings */ }

function selfTest() { /* plant faults, require each to go red by name */ }

function main() {
    if (process.argv.includes('--self-test')) { return selfTest(); }
    const failures = checkShape(readSources());
    if (failures.length) {
        console.error('verify-registry-shape: FAIL -- ...');
        failures.forEach(f => console.error(`  ${f}`));
        return 1;
    }
    console.log('verify-registry-shape: PASS -- ...counts...');
    return 0;
}
process.exit(main());
```

**Output contract:** one `FAIL --` or `PASS --` line prefixed with the check name; the PASS line
states counts so a check that silently stopped asserting is visible; each failure names the
specific drift.

## The Two Earned Rules

Both were learned by shipping the mistake first. Every new check must satisfy both.

**1. Never assert on the absence of a log line** unless that line is proven to be emitted by the
code under test rather than by your own instrumentation. An absence assertion over an emitter you
also wrote can never go red.

**2. Derive from the tree and compare; do not hand-keep an expectation list.** A hand-kept probe
list agrees with every tree: it cannot go red on an addition, nor on a removal nobody remembered
to list. Derive the ACTUAL set from the sources at check time and compare as **set equality**, so
both surplus and shortfall are reported by name.
- `scripts/verify-registry-shape.mjs` derives exported names and `TabUriRegistry` members from the
  TypeScript source, comparing against one deliberately hand-written `EXPECTED` constant so a
  contract change shows up in the diff.
- `scripts/verify-shell-error-copy.mjs` derives the `USER_MESSAGE` table, its references, every
  `message:` property, and every `this._showError()` argument from
  `powerbrowser/shell/TheiaService.sys.mjs`, then tests leaks by **shape** (an all-caps
  underscored token ≥4 chars, or a dotted key ≥3 segments) rather than by a banned-string list —
  so a failure path added next year is covered without touching the check.

## Self-Tests: the Mocking Substitute

There is no mocking framework. In its place, ~60 checks carry a `--self-test` mode that **plants
faults on a fixture copy of the real sources and requires each planted fault to go red naming the
drift**, with an unplanted control proving green first.

```js
if (!mutated) { /* FAIL: the anchor the plant edits has drifted */ }
const failures = checkShape(testCase.sources);
if (!failures.some(f => f.includes(testCase.expect))) { /* FAIL: did not go red naming X */ }
```

**Rules:**
- A new check gets a `--self-test`, and the self-test is registered as **its own registry row**
  (`"<label>-self-test|node .../<check>.mjs --self-test"`) so a check that can never go red is
  itself caught. Rows like `scan-brand-residue-self-test` exist because the parent row was green
  for its whole life over an unreachable condition.
- A plant that fails to mutate its anchor is itself a FAIL — that is how anchor drift is caught.
- Plant both directions where the assertion is a set equality: one addition and one removal.

**Files with `--self-test`** include `scan-brand-residue.mjs`, `check-patch-surface.sh`,
`apply-patches.sh`, `check-internals-boundary.sh` (which also has a `--catalogue` mode),
`fetch-upstream.sh`, `generate.mjs`, and nearly every `verify-*.mjs`.

## Permanent Gates

| Gate | Command | What it protects |
|------|---------|------------------|
| Residual brand | `node scripts/scan-brand-residue.mjs` | No originating-product token anywhere; the only file allowed to name it is `inventory/brand-tokens.json` |
| Internals boundary | `bash scripts/check-internals-boundary.sh` | Only `powerbrowser/shell/PowerBrowserAPI.sys.mjs` reaches a Firefox internal, and `powerbrowser/INTERNAL-APIS.md` catalogues every touchpoint |
| Theia core purity | `bash scripts/diff-theia-core.sh` | Theia is never forked or patched |
| Patch surface | `bash scripts/check-patch-surface.sh` | `patches/` touches only the declared surface; `--brand-values` mode scans manifest-derived display names |
| Bridge contract | `node scripts/verify-registry-shape.mjs` | `TabUriRegistry`'s exported shape stays landable for `@powerbrowser/browser-bridge` (GUI-04) |
| User-facing copy | `node scripts/verify-shell-error-copy.mjs` (`shell-error-copy-no-internals`) | No internal identifier reaches `#powerbrowser-error-message` |
| Generated freshness | `node scripts/generate.mjs --check` | A second generate run produces identical bytes |

The residual-brand scan iterates `git ls-files` — **an unstaged new file is invisible to it.**
Stage before trusting a green scan. It is also wired into `scripts/rebase-upstream.sh` and
`.github/workflows/rebase-upstream.yml`, so an upstream rebase that reintroduces a token fails
there rather than in a release.

## Check Tiers

**Tier 1 — `--quick` (seconds).** Reads text files off disk only. No build, no browser, no
display, no network. This is the commit gate and the whole of CI. Every registry row comment
states explicitly whether the row is "honestly --quick".

**Tier 2 — live Theia.** Boots the sidecar or the built app and drives it. Includes
`smoke-theia.sh`, `verify-web-tab-live.mjs`, `verify-mode-switch-tabs-live.mjs`,
`verify-gui08-*`. Needs a display.

**Tier 3 — full Gecko build (~47–54 min on the reference host).** `verify-branding-identity.mjs`
(`--variant dev` / `--variant release`), `verify-endpoints.sh` layers 2–3 (exact-path `strace`,
`MOZ_LOG=nsHostResolver:5` host observation), `smoke-firefox.sh`,
`branding-variant-divergence`. Run `--quick` first — it costs seconds and catches the typo that
would otherwise surface forty minutes in. Timings are in `docs/BUILD.md`, each naming the tree,
host, and toolchain measured.

## Live-Drive Harness

Live checks drive a real browser over **WebDriver BiDi** through `scripts/lib/firefox-bidi.mjs`.
`scripts/verify-platform.sh` exports the throwaway config home so that helper's own
`child_process.spawn` children inherit it.

For interactive debugging, run the sidecar standalone on port 4000 with
`POWERBROWSER_TOKEN_DISABLE=1` and drive it with the `gsd-browser` MCP tools — static gates cannot
see DOM geometry or DI wiring.

## Known-Open Ledger

`--gate` applies documented exclusions rather than deleting or skipping a red row. Each excluded
row carries `label|id|reason` in the driver, e.g.:
- `verify-endpoints|5|` three hosts absent from the BRAND-04 allowlist — a product/privacy
  decision, not a code defect.
- `verify-branding-identity-release|10|` reads `objdir-release/dist/bin`, which does not exist
  because the second ~47m release build was declined; runnable unchanged once one exists.

**Nothing is silently skipped.** A check CI cannot honestly run stays a local drill and is
recorded as such, in the workflow file and in the phase summary.

## CI

**`.github/workflows/verify.yml`** — every push and pull request, `ubuntu-latest`,
`timeout-minutes: 30`, `permissions: contents: read`, `persist-credentials: false` (a 1.1 GB
third-party tree is on disk during the run, so the token is neither powerful nor present).

Three steps, inside `nix develop .#theia`, and **the order is load-bearing**:
1. `node scripts/generate.mjs` — `generated/` is git-ignored, so a fresh clone has none.
2. `node scripts/generate.mjs --check` — asserts idempotence.
3. `scripts/verify-platform.sh --quick` — the same table developers run before committing.

The `.#theia` shell is required, not convenient: `generate.mjs` rasterises `brand/mark.svg` with
`inkscape`, and only the pinned inkscape 1.4.4 reproduces the byte-compared PNGs. No Gecko
toolchain closure is fetched; tier-3 rows are deliberately out of CI.

**`.github/workflows/rebase-upstream.yml`** — runs the residual-brand scan and the patch stack
against a new upstream tag. All actions are pinned by commit SHA.

## Coverage

No coverage tooling and no coverage target. Coverage is expressed as **registry rows per
requirement id**, and the honest gaps are the known-open ledger plus the tier-3 rows CI cannot
run. If you want to know whether something is verified, grep the requirement id in
`scripts/verify-platform.sh`.

---

*Testing analysis: 2026-09-07*
