---
phase: 01-platform-extraction-and-rename
plan: 09
subsystem: shell-supervisor
tags: [gap-closure, supervisor, verification, recovery, MIG-04, GUI-01]
status: complete

requires:
  - 01-08 (residual-brand gate and the consolidated verify-platform.sh registry)
  - a built objdir (01-04) — the runtime row launches the binary
provides:
  - a supervisor whose one-time initialisation is keyed on completion, not on port-pinning
  - scripts/verify-start-path-recovery.mjs (static + log analyzer + self-test)
  - three registry labels — start-path-recovery, start-path-recovery-self-test, health-gate-recovery-swaps
affects:
  - powerbrowser/shell/TheiaService.sys.mjs
  - scripts/verify-platform.sh

tech-stack:
  added: []
  patterns:
    - derive-and-compare (D-21 rule 2) applied to two independent source derivations
    - emitter proof before log matching — the analyzer proves its sentinel prefixes are emitted by the code under test
    - fixture-count assertion held OUTSIDE the analyzer, so a wrong analyzer cannot excuse a fixture that never fired

key-files:
  created:
    - scripts/verify-start-path-recovery.mjs
  modified:
    - powerbrowser/shell/TheiaService.sys.mjs
    - scripts/verify-platform.sh

decisions:
  - "The one-time initialisation block and _restart()'s per-attempt port choice are both keyed on this._swapped — the same field _swap()'s own early-return guard reads — so 'a port has been pinned' and 'a spawn has actually completed' stop being one condition."
  - "_spawnAndGate's parameter is renamed firstSpawn -> beforeFirstSwap. The old name is what encoded the conflation; keeping it while changing its meaning would re-encode the defect in a name."
  - "_swap() sets the completion field AFTER the navigation returns. With three sites now keyed on that field, a flag that could read true for a throwing swap would reintroduce the conflation class."
  - "D-104's pinned-port respawn invariant is preserved exactly where it is load-bearing — every respawn AFTER a completed swap still targets the pinned port. Before a completed swap nothing is loaded at that origin, so re-pinning it had no beneficiary and a real cost (D-112 classifies a squatted pre-swap port as unrecoverable)."
  - "The hand-planted red used `this._port === null` (the real conflated fact) rather than the literal old parameter, because only a plant naming an instance field can exercise the both-values-named branch the acceptance criterion asks for. The parameter plant was run first and is recorded below; it goes red on a different, also-correct branch."

metrics:
  duration: ~1h05m
  tasks: 2
  files: 3
  completed: 2026-08-31

actuals:
  tokens: 9459
  tasks: 2
  commits: 2
---

# Phase 01 Plan 09: Health-Gate Recovery Summary

The backend supervisor no longer conflates "a port has been pinned" with "a spawn has actually
completed": a launch whose first spawn announces readiness and then fails the health gate now
recovers to the interface, proven by a registered check observed RED on the defective build and
GREEN on the fixed one, same binary, only the supervisor source differing.

## What Changed

**`powerbrowser/shell/TheiaService.sys.mjs`** — three re-keyings, no new field, no renamed field:

| Site | Before | After |
|---|---|---|
| `_spawnAndGate`'s one-time cookie / navigate / health-loop block | `if (firstSpawn)` | `if (!this._swapped)` |
| `_restart()`'s per-attempt spawn argument | `this._spawnAndGate(this._port === null)` | `this._spawnAndGate(!this._swapped)` |
| `_swap()`'s completion assignment | set **before** `powerbrowserSwapToUrl(...)` | set **after** it returns |

`_spawnAndGate`'s parameter is renamed `firstSpawn` → `beforeFirstSwap`; the port choice
(`beforeFirstSwap ? 0 : this._port`) and the D-104 pinned-port assertion
(`beforeFirstSwap ? null : this._port`) are unchanged in shape, only in what feeds them. Every
inherited decision-ID citation in the touched comment blocks is intact — `grep -c` reports D-104 at
7 sites and D-113 at 5 sites, and D-96, D-112, D-121, SIDE-01, SIDE-04 are all still present.

**`scripts/verify-start-path-recovery.mjs`** (new, 592 lines) — one script, three modes:

- default: the static half. Derivation A = the instance field in `_swap()`'s early-return guard;
  derivation B = the instance field in the guard of the block that sets the session cookie, calls
  `this._swap()` and starts `this._healthLoop()` (located by its *body*, never a line number).
  Assertion is A === B, plus the assignment-order assertion. No field name is written into the
  checker for the tree to agree with.
- `--log <path>`: the runtime half. Proves both sentinel prefixes are emitted as `dump(` literals
  by `powerbrowser.js`, derives the health-gate failure signature from the `_fatal()` template that
  writes it, then asserts: the failure fired; the swap sentinel is present; exactly once; the
  deck-state payload whose `where` is `"swap"` reports `loading: "none"` (JSON-parsed); and the
  failure **precedes** the swap by byte offset.
- `--self-test`: 9 planted faults + 2 clean controls.

**`scripts/verify-platform.sh`** — `check_health_gate_recovery_swaps` plus three appended registry
rows. No sibling driver: `ls scripts/verify-phase-*.sh` finds nothing.

## The RED → GREEN Observation (Task 1)

**RED, on the pre-fix build**, after `./mach build faster` synced the tree
(`scripts/verify-platform.sh --only health-gate-recovery-swaps`, exit 1) — verbatim:

```
verify-platform: running health-gate-recovery-swaps...
verify-start-path-recovery: FAIL -- the launch log carries no POWERBROWSER_SHELL_SWAP sentinel -- the spawn that passed the health gate never performed the one-time initialisation, so the user is still looking at the loading layer with a healthy backend behind it
verify-start-path-recovery: FAIL -- the launch log carries no POWERBROWSER_DECK_STATE payload whose `where` is "swap" -- the deck's resolved visibility at the navigation was never announced, so nothing here observes it
health-gate-recovery-swaps: FAIL -- see the analyzer failures above; log:
*** You are running in headless mode.
POWERBROWSER_SHELL_READY chrome://powerbrowser/content/powerbrowser.xhtml
POWERBROWSER_SIDECAR_PREFS backendMain=/tmp/tmp.l02A63sb6L/main.js nodePath=
POWERBROWSER_APP_IDENTITY {"name":"powerbrowser","vendor":"DeBIOS","version":"153.1.0esr"}
Crash Annotation GraphicsCriticalError: |[0][GFX1-]: RenderCompositorSWGL failed mapping default framebuffer, no dt (t=0.632703) [GFX1-]: RenderCompositorSWGL failed mapping default framebuffer, no dt
[PowerBrowserAPI] log: POWERBROWSER_BACKEND_READY {"port":39527,"pid":837033}
console.log: "POWERBROWSER_BACKEND_READY {\"port\":39527,\"pid\":837033}"
[PowerBrowserAPI] error: [TheiaService] Health probe on port 39527 never returned 200 within 3000ms.
console.error: "[TheiaService] Health probe on port 39527 never returned 200 within 3000ms."
[PowerBrowserAPI] log: POWERBROWSER_BACKEND_READY {"port":39527,"pid":837207}
console.log: "POWERBROWSER_BACKEND_READY {\"port\":39527,\"pid\":837207}"

verify-platform: summary
  health-gate-recovery-swaps: FAIL
verify-platform: FAIL -- see summary above
```

This is the defect, not a fixture failure: the plant fired (the health-probe failure line is
present), the second spawn announced readiness on the *same pinned port 39527* and passed the
health gate — and no swap followed. The fixture's own marker reached ≥2, so the harness assertion
did not trip.

**GREEN, after the supervisor edit and `./mach build faster`**, identical command, exit 0 — verbatim:

```
verify-platform: running health-gate-recovery-swaps...
verify-start-path-recovery: PASS -- the launch recovered from a failed health gate and swapped exactly once (/tmp/tmp.Peu1RqtTUE)

verify-platform: summary
  health-gate-recovery-swaps: PASS
verify-platform: PASS -- all checks passed
```

Re-confirmed after Task 2's registry edits (`/tmp/tmp.GomkbORlnn`, exit 0).

## The Hand-Planted RED (Task 2)

Two plants were run against the working tree, and both restored afterwards.

**Plant 1 — the literal old condition** (`if (!this._swapped)` → `if (beforeFirstSwap)`),
`scripts/verify-platform.sh --only start-path-recovery`, exit 1 — verbatim:

```
verify-platform: running start-path-recovery...
verify-start-path-recovery: FAIL -- derivation B yielded nothing: the one-time initialisation block's guard `beforeFirstSwap` names no instance field

verify-platform: summary
  start-path-recovery: FAIL
verify-platform: FAIL -- see summary above
```

Correct, but it exercises the *derivation-yielded-nothing* branch rather than the both-values-named
branch, because the pre-fix condition was a **parameter**, not an instance field.

**Plant 2 — the conflated fact itself** (`if (!this._swapped)` → `if (this._port === null)`, which
is exactly what `_restart()` used to compute), same command, exit 1 — verbatim:

```
verify-platform: running start-path-recovery...
verify-start-path-recovery: FAIL -- the one-time initialisation block is keyed on `this._port` while `_swap()`'s own guard reads `this._swapped` -- "a spawn has actually completed" and whatever `this._port` records are two different facts, and treating them as one is the conflation that strands a launch on the loading layer after a failed health gate
verify-platform: summary
  start-path-recovery: FAIL
verify-platform: FAIL -- see summary above
```

**Restored** (`git diff --stat` on the file reports no change against the committed version), same
command, exit 0 — verbatim:

```
verify-start-path-recovery: PASS -- the one-time initialisation block and _swap()'s guard are keyed on the same completion field (/home/chris/coding/Power-Browser/powerbrowser/shell/TheiaService.sys.mjs)

verify-platform: summary
  start-path-recovery: PASS
verify-platform: PASS -- all checks passed
```

## Verification Results

| Step | Command | Result |
|---|---|---|
| 1 | `node scripts/verify-start-path-recovery.mjs --self-test` | exit 0 — 11 rows (2 clean controls + 9 faults), each red naming its drift |
| 2 | `scripts/verify-platform.sh --quick` | exit 0 — 22 rows PASS, zero `: FAIL` |
| 3 | `check-internals-boundary.sh` and `--catalogue` | exit 0 both |
| 4 | `scan-brand-residue.mjs` and `--reconcile` | exit 0 both, new script staged first |
| 5 | `./mach build faster` (tier 2) | 22s cold in this session, 1.9s warm |
| 6 | `--only health-gate-recovery-swaps` | exit 0 |
| 7 | `git -C upstream diff --quiet` | clean |

`--only start-path-recovery` and `--only start-path-recovery-self-test` each dispatch a row;
`grep -c 'health-gate-recovery-swaps' scripts/verify-platform.sh` = 7.
`node scripts/verify-start-path-recovery.mjs --file /nonexistent/TheiaService.sys.mjs` exits 1 naming
the unreadable path — it fails loudly rather than vacuously passing on a missing derivation source.

## Deviation from the Packaging Assertion

The plan's acceptance criterion expected
`grep -rl 'this._swapped' objdir/dist/bin --include='TheiaService.sys.mjs'` to print at least one
path. **It printed nothing, and the packaging is nonetheless correct.** The chrome package is not
jarred on this configuration — the packaged copy exists as a loose file at
`objdir/dist/bin/browser/chrome/browser/content/powerbrowser/TheiaService.sys.mjs`, and a direct
`grep -c` against that path reports `this._swapped` 7 times and `beforeFirstSwap` 4 times, so the
build did repackage the edit. The criterion's `-r` form misses it because `dist/bin`'s chrome tree
is reached through a symlink and `grep -r` does not follow symlinks encountered during recursion
(`-R` would). The green runtime row is the independent proof either way, and it is green.

## Deviations from Plan

**None affecting behaviour.** Two judgment calls, both recorded above as decisions:

1. `_spawnAndGate`'s parameter was renamed `firstSpawn` → `beforeFirstSwap`. The plan mandated
   re-keying the block's *guard*; it did not mandate the rename. Keeping a parameter named
   `firstSpawn` whose meaning is now "no swap has completed yet" would re-encode in a name exactly
   the conflation the plan removes from the code. Four lines, no behaviour change.
2. The hand-planted red was run twice (Plant 1 and Plant 2 above) because the literal old condition
   cannot reach the both-values-named branch the acceptance criterion asks for. Both outputs are
   recorded verbatim rather than only the one that matched the criterion.

No auto-fixes were needed — no bug, missing critical functionality, or blocking issue was
encountered. No architectural decision arose. No authentication gate was hit. No package was
installed; the new script uses only `node:` builtins.

## Known Stubs

None. The verification fixture's stub backend is a `mktemp`-scoped test double registered with
`track_temp`, not production code, and it binds `127.0.0.1` explicitly on both branches (T-01-02).

## Threat Flags

None. No new network endpoint, auth path, file access pattern, or trust-boundary schema change was
introduced. `check-internals-boundary.sh` is green, `powerbrowser/INTERNAL-APIS.md` is unchanged,
and no new symbol is exported from `PowerBrowserAPI.sys.mjs`.

## Requirements

- **MIG-04** — the renamed tree now reaches the interface after a transient backend-startup failure
  requiring no user action, which is what `01-VERIFICATION.md`'s "SATISFIED ON THE HAPPY PATH ONLY"
  row was downgraded for. The *error-affordance* half of the same gap remains open and is plan 01-10.
- **GUI-01** — idempotency and concurrency both hold: the one-time block runs exactly once per
  browser session, on whichever spawn completes the health gate, and `_restartInFlight` remains the
  single shared in-flight guard. An interrupted attempt leaves `_swapped` false, so the next attempt
  still performs the full initialisation.
- **GUI-04** — untouched. `_swap()` remains the single navigation site, reached through the browser
  element's owner window; no chrome-side command was registered; `gui04-registry-shape` is green.
- **SEC-01** — untouched. The credential still crosses on stdin and is set as a session cookie
  exactly once, before the navigation, on the spawn that completes the health gate.
  `shell04-log-redacts-token` is green.

## Self-Check: PASSED

- `scripts/verify-start-path-recovery.mjs` — FOUND
- `powerbrowser/shell/TheiaService.sys.mjs` — FOUND
- `scripts/verify-platform.sh` — FOUND
- commit `5b78eef` (Task 1) — FOUND
- commit `f57ef78` (Task 2) — FOUND
