---
phase: 01
phase_name: "platform-extraction-and-rename"
project: "Power Browser"
generated: "2026-09-01"
counts:
  decisions: 17
  lessons: 19
  patterns: 18
  surprises: 22
missing_artifacts: []
sources_read:
  - 01-01..01-21-PLAN.md
  - 01-01..01-21-SUMMARY.md
  - 01-VERIFICATION.md
  - 01-UAT.md
  - STATE.md
  - 01-REVIEW.md
  - 01-REVIEW-FIX.md
  - deferred-items.md
---

# Phase 01 Learnings: platform-extraction-and-rename

## Decisions

### No generator in Phase 1; every branding value is a hand-written literal
Every branding value in the tree is a literal written by hand. No template, generator, or derive-at-build helper was introduced.

**Rationale:** Phase 2's acceptance test is that generated output is byte-identical to Phase 1's hand-written files. A generator introduced early leaves nothing independent to compare against.
**Source:** STATE.md

---

### One inventory JSON feeds both the rename codemod and the residue scan
`inventory/brand-tokens.json` is simultaneously `rename-brand.mjs`'s replacement plan and `scan-brand-residue.mjs`'s token source. Per-site classification uses file-scoped `only_in` rows rather than line-pinned overrides.

**Rationale:** What is scanned and what is renamed cannot drift when both read one file. JSON over TOML because both consumers are Node with zero dependencies. A pinned line number stops meaning anything once an edit above it shifts the file.
**Source:** 01-01-SUMMARY.md

---

### Scope flags narrow the file set, never the row set; cross-tier contracts land in one commit
`--scope-chain` / `--scope-files` restrict which files a run touches but always apply the full ruleset. The six cross-tier contract groups (the npm scope, the `TheiaService.sys.mjs` couplings) were committed together.

**Rationale:** A scoped run must be the full ruleset over fewer files, not a second weaker ruleset. Holding back one side of a contract (e.g. `customize/package.json` while `@sourcerer/tab-uris` was already renamed) broke `yarn install --frozen-lockfile` immediately.
**Source:** 01-01-SUMMARY.md, 01-02-SUMMARY.md

---

### The interim residue gate excepted hand-write sites, not a token class, and was then dropped
`--except-hand-write` called the codemod's own `excludedWholeFile`/`excludedLine` predicates. Once the bare scan exited 0 in 01-03 the carve-out was removed entirely.

**Rationale:** The 31 outstanding offenses spanned two classes, so no `--except-class` value could go green without gutting the gate. Reusing the codemod's predicates made the carve-out and the prohibition one definition. A carve-out that excepts nothing is indistinguishable from one hiding residue.
**Source:** 01-02-SUMMARY.md, 01-03-SUMMARY.md

---

### Verifier expectations come from a third source no rename pass writes
`verify-branding-preflight.mjs` reads a hand-authored `brand_display_expectations` block in the inventory rather than the `VARIANTS` descriptor inside `verify-branding-identity.mjs`.

**Rationale:** The rename pass had rewritten both the branding files and the descriptor, and they agreed on a wrong value (`PowerBrowser Dev`). An expectation the codemod can rewrite is not an expectation.
**Source:** 01-03-SUMMARY.md

---

### Four per-phase verify drivers consolidated into `scripts/verify-platform.sh`; checks are re-tiered, never excused
45 labels were ported with label/check-function parity asserted programmatically before `git rm`. `desktop-entry-quick` and `apply-patches-self-test` moved out of `--quick` into the full set. The two `objdir-release` checks became named `--gate` exclusions keyed on a WINDOWS.md ledger entry.

**Rationale:** One registry means adding a check is appending a row. Re-tiering keeps a build-dependent check honest instead of skipping it; a named exclusion keeps the exclusion visible.
**Source:** 01-03-SUMMARY.md, 01-07-SUMMARY.md, STATE.md

---

### Patches are regenerated from a patched tree; the chain proof runs against a blob-pruned pristine `upstream/`
01-02 left patch `index` blob hashes untouched so 01-04 could regenerate them. The apply proof first ran `git reset --hard HEAD && git prune --expire=now` and asserted all three blobs absent.

**Rationale:** Hand-edited hunk bodies degrade `git apply --3way` into a silent no-op. `git apply --3way` also writes its post-image blob into the object DB, so an unpruned re-test passes vacuously.
**Source:** 01-02-SUMMARY.md, 01-04-SUMMARY.md, STATE.md

---

### GUI-01 lands as spiked: bare `window.open('_blank')` from the Theia frontend, startup-window selection in the single-instance handler
No chrome-side command, no JSWindowActor fallback, no new internals catalogue row. Patch `020` is hook-only and no longer overrides `BROWSER_CHROME_URL`, so the stock browser window is upstream chrome.

**Rationale:** The shell window carries no `nsIBrowserDOMWindow`, so `nsWindowWatcher` falls through to `AppWindow::CreateNewContentWindow`. The absence of a chrome-side command is the ratified design.
**Source:** 01-05-SUMMARY.md, STATE.md

---

### GUI-02 (`@theia/mini-browser`) descoped on runtime surface, not supply chain
Rejected at the D-22 human gate. If revisited, the preferred direction is a tab backed by a real `<xul:browser>`.

**Rationale:** It would have been the second backend module beside `token-gate` and mounted a `vhost` file-serving route; being iframe-backed it cannot render `X-Frame-Options: DENY` origins. The open question was `vhost`/cookie-scope compatibility, not attack surface.
**Source:** 01-06-SUMMARY.md

---

### One `USER_MESSAGE` table; keys minted only when the distinction is the action
Nine failure paths collapse to four sentences. 01-10 declined to mint a generic backstop key; 01-13 minted `couldNotStartUnrecoverable` because one screen offers Retry and the other does not. One `getFailureDetails()` accessor feeds both the diagnostics rows and the `POWERBROWSER_ERROR_DIAGNOSTICS` sentinel.

**Rationale:** A key that no screen renders differently is scaffolding. Existing sentinels gained no keys so exact-shape assertions in `shell03-*` hold.
**Source:** 01-07-SUMMARY.md, 01-10-SUMMARY.md, 01-13-SUMMARY.md, STATE.md

---

### Supervisor lifecycle keyed on completion (`_swapped`), not on port pinning
`_spawnAndGate`'s one-time block, `_restart()`'s per-attempt port choice, and `_swap()`'s assignment order were all re-keyed on the field `_swap()`'s own guard reads. Parameter renamed `firstSpawn` to `beforeFirstSwap`.

**Rationale:** "A port has been pinned" and "a spawn completed" had been conflated; keeping the old name would re-encode the defect.
**Source:** 01-09-SUMMARY.md

---

### Retry authority lives in the supervisor; the DOM mirrors state, never owns it
`TheiaService.retry()` guards on `_errorRecoverable` and returns before `_hideError()`. `powerbrowserRetry()` no longer writes `style.display`; visibility has one owner. The probe gate reuses the existing `recoverable` parameter rather than a second flag.

**Rationale:** `powerbrowserRetry()` is a window global any chrome-privileged caller can invoke. The guard ordering is what preserves `_failureDetails`. A second source of truth for one fact is the shape of the defect.
**Source:** 01-11-SUMMARY.md, 01-12-SUMMARY.md, 01-13-SUMMARY.md, deferred-items.md

---

### Residue scan gains `--extra-root` for the rebased `upstream/`; unknown flags exit 2; only `coincidental` rows are filtered
`--extra-root` adds a second file-set source feeding the one existing `scan()` and does not run the census. `main()` validates argv. Unreadable files are collected in `scan()` with per-caller failure policy.

**Rationale:** The census counts this repo's own migrating tree and cannot close over a foreign checkout. The pre-fix script silently dropped a mistyped flag and reported PASS. `coincidental` rows are assertions about this checkout; longest-token-first claiming let one swallow a nested brand-identifier span.
**Source:** 01-15-SUMMARY.md, 01-17-SUMMARY.md, deferred-items.md

---

### About-dialog debranding: CSS through upstream's branding linkset hook, hidden-not-removed, href-prefix selector, per-variant coverage
`aboutDialog.css` is packaged in `jar.mn` with zero Gecko patch. Bottom links are suppressed by `.bottom-link[href^="https://www.mozilla.org"]` so `about:license` survives. Coverage is evaluated per stylesheet variant with no exemption list and no host filter; `#communityExperimentalDesc` was suppressed rather than exempted.

**Rationale:** Deleting elements would need a regenerated patch against `aboutDialog.xhtml`. Upstream gives the labels no ids; href prefix survives reordering. A union across variants passes a link covered in dev but not release. An exemption list is a hand-kept expectation.
**Source:** 01-18-SUMMARY.md, 01-20-SUMMARY.md, 01-21-SUMMARY.md, STATE.md

---

### Display-surface leak scan reads a set derived from `powerbrowser/shell/jar.mn`, restricted to `.xhtml`/`.html`
The preflight's shell-markup surface is derived from the packaging manifest rather than a hand-appended path list.

**Rationale:** Appending one path is what 01-07 did and what let the title-bar leak survive. The same manifest packages `.js`/`.sys.mjs` whose comments legitimately spell the identifier form, so widening would manufacture a false red.
**Source:** 01-19-SUMMARY.md

---

### Perceptual walkthroughs stay open on WINDOWS.md; no automated proxy
Items 15 and 16 were left open in every gap-closure plan.

**Rationale:** Chrome-context Marionette is platform-blocked on Linux (ledger 7). A check that cannot observe the perceptual outcome produces an unearned green and removes the surface that would resurface the gap.
**Source:** 01-08-SUMMARY.md, 01-10-SUMMARY.md, 01-11-SUMMARY.md, 01-12-SUMMARY.md, 01-13-SUMMARY.md

---

### Placeholder mark is the IEC 60417-5009 power glyph; shell display-form gate deferred onto the inventory route
The interim icon is a standard symbol. G-01-25's optional registry row over hand-kept literals in `scripts/` was deferred by decision onto the route where a later phase rebuilds those expectations from `inventory/brand-tokens.json`.

**Rationale:** A standard symbol makes non-derivation from Sourcerer or Mozilla artwork answerable. A gate over hand-kept literals is the expectation-list anti-pattern.
**Source:** STATE.md, deferred-items.md

---

## Lessons

### A mechanical rename rewrites the literal and the expectation that checks it
Instance 1: `verify-branding-identity.mjs` expected `PowerBrowser Dev`. Instance 2: the welcome widget rendered `<h1>PowerBrowser</h1>` and `verify-branding.mjs` expected exactly that, while the preflight's leak pattern required a trailing space or quote so `PowerBrowser<` matched nothing.

**Context:** Both were live in the repo and green. A verifier whose expectation the codemod can rewrite is a tautology.
**Source:** 01-03-SUMMARY.md, 01-07-SUMMARY.md

---

### `git apply --3way` degrades to direct application silently and exits 0
With stale `index` hashes it prints `repository lacks the necessary blob ... Falling back to direct application` and still returns success. Only the message distinguishes the cases. It also writes its post-image blob, so a re-run on the same clone passes for the wrong reason, and `git checkout -- <path>` afterwards restores the patched content because the apply staged it.

**Context:** Discovered while proving the regenerated chain in 01-04.
**Source:** 01-04-SUMMARY.md

---

### The residue scan iterates `git ls-files`, so an unstaged new file is invisible
Two commits in 01-03 passed the gate untracked and went red once staged. Later plans adopted `git add -A` before every `--quick` run.

**Context:** A green scan over a tree with unstaged additions proves nothing about those additions.
**Source:** 01-02-SUMMARY.md, 01-03-SUMMARY.md, 01-11-SUMMARY.md, 01-12-SUMMARY.md, 01-14-SUMMARY.md

---

### The GUI-01 spike rested on a non-discriminating instrument
`01-SPIKE-GUI-01.md` inferred "no browser window opened" from the absence of `chrome://browser/content` log lines that only the spike's own instrumentation emitted. A run that demonstrably opened a stock window logged zero of them. The claim that a command-line URL is silently dropped was also false.

**Context:** Absence assertions over an emitter you also wrote can never go red.
**Source:** 01-05-SUMMARY.md

---

### Plan acceptance criteria repeatedly named the wrong file, count, value, or contradicted their own actions
`grep -c` off by one; `@theia/*` pin count 49 vs 50; `.mozconfig` credited for what patch `010` sets; `--version` expected `DeBIOS Power Browser` when `DumpVersion()` yields `DeBIOS powerbrowser 153.1.0esr`; fault-row arithmetic 13 vs 11; WINDOWS.md id 19 already taken; `grep -c extraRootFiles >= 3` incompatible with spawning the real CLI; a row-count criterion incompatible with adding a row; `grep -c` counting lines when three records share one table row.

**Context:** Every instance was reconciled against the binding property in the tree, and the literal prediction was recorded as wrong rather than padded or weakened.
**Source:** 01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md, 01-04-SUMMARY.md, 01-11-SUMMARY.md, 01-12-SUMMARY.md, 01-14-SUMMARY.md, 01-15-SUMMARY.md, 01-18-SUMMARY.md, 01-21-SUMMARY.md

---

### Plan frontmatter can over-claim requirements
01-03's `requirements: [MIG-03, MIG-04]` checked MIG-04 off in REQUIREMENTS.md though nothing had been built. It was reverted and closed properly on build evidence in 01-04.

**Context:** The revert also left the REQUIREMENTS.md traceability table stale for five IDs through four verification passes.
**Source:** 01-03-SUMMARY.md, STATE.md, 01-VERIFICATION.md

---

### `--gate` had never completed on a built tree; three latent driver defects surfaced only in 01-07
`run_own_checks 2>&1 | tee` put the checks in a subshell so `SERVER_PID` was invisible to `cleanup()` and the surviving app held the pipe open. `theia_app_up()` raced the previous check's EXIT-trap teardown on `:3000`. An undeclared `local` in a `while read` loop clobbered the caller's `label` via bash dynamic scoping.

**Context:** A driver that has never run end to end has untested plumbing regardless of how many rows are green individually.
**Source:** 01-07-SUMMARY.md

---

### Theia's `CommandRegistry` is unpopulated when `window.theia.container` first exists
Contributions enumerate in `onStart`. A check that waits only for the container reads one command and misreports an absent command.

**Context:** Hit while writing the GUI-01 command-presence check.
**Source:** 01-05-SUMMARY.md

---

### A wired, registered guard is not a proof until it has been observed red
01-08's condition-4 walk sat below an early return; the About-dialog check lacked the assertions its welcome sibling had. 01-14's rule 4 regex matched any identifier. 01-20's coverage gate had four assertions and exited 0 with the outbound selector deleted.

**Context:** In each case the green was an artefact of the instrument. 01-21 landed its fifth assertion before the fix so its red was observed against the real tree.
**Source:** 01-08-SUMMARY.md, 01-14-SUMMARY.md, 01-21-SUMMARY.md, 01-REVIEW.md

---

### Fix the bug class where all surfaces route through, not at the one site named
The About-dialog identifier leak was the same class fixed once in the welcome widget in 01-07 and never generalised. 01-08 replaced the hand-kept display-surface list with a directory walk and one shared assertion function.

**Context:** A guard in one caller leaves every sibling caller broken.
**Source:** 01-08-SUMMARY.md

---

### A check asserting "exactly one error sentinel" is blind to the second
The failing-Retry blank screen shipped green through 01-08, 01-09, and 01-10 because `shell03-budget-exhausted-error` asserts one sentinel and is correct for its own launch.

**Context:** Exhaustive-count assertions guard the case they were written for and nothing adjacent.
**Source:** 01-11-SUMMARY.md

---

### Under an immediately-resolving fake `sleep`, the probe loop is a pure microtask loop and the planned measurement is unobservable
Node drains microtasks before any macrotask, so the whole 50-sleep budget burns inside one drain. The count "at the moment the sentinel appears" read 51 both times. Replaced with a causal counter (`spawnsAfterError`) and a hard park in the fake `sleep` past budget to avoid starving `setImmediate`.

**Context:** The park was also needed to stop `--quick` hanging.
**Source:** 01-11-SUMMARY.md, 01-12-SUMMARY.md

---

### Adjacency-assumption derivations break when code is legitimately restructured
Derivation B matched `if (...) {\s*PowerBrowserAPI.setSessionCookie(`; wrapping the call in `try {` made it yield nothing. Replaced with a nearest-enclosing-guard search allowing whitespace or one `try {`.

**Context:** A derivation that breaks on valid restructuring is fragile, not strict.
**Source:** 01-10-SUMMARY.md

---

### The branding CSS hook was dead for fifteen plans
`aboutDialog.css` was authored in 01-03 but never packaged in `jar.mn` (a header comment claimed the omission was deliberate). `chrome://branding/content/aboutDialog.css` 404'd silently, so the dark-neutral restyle and every suppression rule shipped dead. Root cause of UAT gap G-01-3.

**Context:** Fixed in 01-18, with packaging completeness asserted from a directory read in three directions.
**Source:** 01-18-SUMMARY.md, 01-UAT.md, STATE.md

---

### Wholesale container suppression removed the `about:license` disclosure
01-18's `#bottomBox > hbox { display: none }` hid the product's only in-UI licence route along with the two mozilla.org links. Found independently by VERIFICATION Truth 9 and REVIEW CR-01; fixed by 01-20's href-qualified selector.

**Context:** The fix for one gap introduced the next.
**Source:** 01-20-SUMMARY.md, 01-REVIEW.md, deferred-items.md

---

### A leak pattern that was correct on day one still misses if the read set is wrong
The 01-03 regex would have matched `<title>PowerBrowser</title>` immediately; it never ran because `powerbrowser.xhtml` was never in the read set. Failed twice (01-07, 01-19). Both fixes derived the set from something the tree already maintains.

**Context:** Root cause of UAT gap G-01-25.
**Source:** 01-19-SUMMARY.md, 01-UAT.md

---

### `verify-shell-error-copy.mjs`'s copy-safety gate was decorative three passes in a row
Rule (4) admitted any identifier's `.message` including a caught exception's; the enumeration regex required a literal receiver and trailing comma so non-matching sites were never examined; a `.bind` alias was invisible. The rebase scan in `rebase-upstream.sh` likewise never saw `upstream/` because `.gitignore` excludes it.

**Context:** Fixed across 01-14, 01-15, 01-16, and REVIEW-FIX. Each was a gate that could only go green.
**Source:** deferred-items.md, 01-REVIEW-FIX.md, 01-15-SUMMARY.md, 01-16-SUMMARY.md

---

### Adopting a reviewer's proposed patch verbatim can delete an earned check
REVIEW-FIX CR-01: the review derived `parsed` from `/this\._showError\(/g`, wider than the enumeration regex; adopting it would have turned the pre-existing "no trailing comma" fault row green. Offsets were recorded inside the enumeration loop instead.

**Context:** Review feedback needs the same discrimination control as any other change.
**Source:** 01-REVIEW-FIX.md

---

### Planning ledgers drift out of sync with the tree
REQUIREMENTS.md traceability still marks five IDs `Gaps Found` after the revert; SEC-01 reads Complete in the table but unchecked in the list; UAT's Notes predate 01-19/01-20 closures; deferred-items row 10 went stale after REVIEW-FIX; STATE.md header says `Plan: 2 of 21` at 100% progress.

**Context:** Info-tier, not gaps, but each is a false statement a future reader will trust.
**Source:** 01-VERIFICATION.md, 01-UAT.md, 01-REVIEW-FIX.md, deferred-items.md, STATE.md

---

## Patterns

### Every net-new script carries `--self-test` that plants faults, each required red naming its drift, with a clean control first
Assert the unmutated fixture is green before planting. Treat empty input as FAIL with its own message. A row that cannot establish its precondition (e.g. `chmod 000` as root) fails loudly rather than skipping. Fixtures live under `mktemp -d`, never inside the repo.

**When to use:** Any new verification script or new assertion.
**Source:** 01-01-SUMMARY.md, 01-03-SUMMARY.md, 01-06-SUMMARY.md, 01-07-SUMMARY.md, 01-15-SUMMARY.md, 01-17-SUMMARY.md, 01-20-SUMMARY.md, 01-21-SUMMARY.md

---

### Derive both sides from the tree at check time and compare as set equality
`verify-registry-shape.mjs`, `verify-shell-error-copy.mjs`, the preflight's display-surface walk, the `jar.mn`-derived shell-markup set, the `readdirSync` vs `jar.mn` packaging check, and the parsed-upstream external-link set all go red on an addition and a removal. No identifier is written into the checker; `grep -v` over comments finds zero derived names.

**When to use:** Any check tempted to keep an expectation list or a hard-coded count.
**Source:** 01-06-SUMMARY.md, 01-07-SUMMARY.md, 01-16-SUMMARY.md, 01-18-SUMMARY.md, 01-21-SUMMARY.md, STATE.md

---

### RED then GREEN on the same binary, plus a discrimination control against the pre-fix checker restored from git
Capture the failing check output on the pre-fix tree verbatim, then the passing output post-fix. For each new fault row, run the same input against `git show HEAD~N:scripts/<file>` and require green there and red on the fixed script. A row red under both is not evidence.

**When to use:** Landing any check alongside the fix it guards.
**Source:** 01-09-SUMMARY.md, 01-10-SUMMARY.md, 01-14-SUMMARY.md, 01-15-SUMMARY.md, 01-16-SUMMARY.md, 01-17-SUMMARY.md, 01-REVIEW-FIX.md

---

### Reconcile against a number your tooling never wrote
Reconciliation condition 4 re-probes with a raw case-insensitive substring so a matcher bug cannot audit itself. The ground-truth assertion closes `928 + 57 + 17 = 1002 = 755 + 247` against the independent grep census in 01-RESEARCH.md and is kept `HISTORICAL` rather than rewritten to zeros post-rename.

**When to use:** Any codemod or scanner whose own matcher is the thing under suspicion.
**Source:** 01-01-SUMMARY.md, 01-03-SUMMARY.md

---

### Stage a codemod by contract, and assert the partition is a disjoint complete cover before running any stage
`556 + 125 + 59 + 1 + 161 = 902`. Both sides of a cross-tier contract land in one commit, verifiable by matching `git log -1 --format=%H`.

**When to use:** Any multi-stage mechanical rewrite.
**Source:** 01-02-SUMMARY.md

---

### A gate exception reports what it holds back, by file and class, on every run, and announces when it can be dropped
`--except-hand-write` printed its carve-out each run until the bare scan went green.

**When to use:** Any temporary carve-out in a gate.
**Source:** 01-02-SUMMARY.md

---

### Positive controls and two-directional gates
`verify-branding-identity.mjs --positive-control runtime-identity` swaps in the stock Firefox value and passes only by reporting FAILURE. The Retry classification gate has a "refuse every Retry" reverse plant and the probe gate a "probe never started" plant.

**When to use:** Any gate whose negative half would pass if the feature under test simply stopped happening.
**Source:** 01-04-SUMMARY.md, 01-12-SUMMARY.md, 01-13-SUMMARY.md, STATE.md

---

### Amend, do not fix forward, when a commit fails the gate it registers
Applied in 01-02 and 01-03 so no bisect point is red.

**When to use:** The commit that introduces a check fails that check.
**Source:** 01-02-SUMMARY.md, 01-03-SUMMARY.md

---

### Read window existence from BiDi's browsing-context tree; prove the emitter before matching logs
Never a log grep or X window count. The analyzer proves its sentinel prefixes are emitted as `dump(` literals by the file under test before any scenario runs; only presence assertions, never absence. The fixture-count assertion lives outside the analyzer so a wrong analyzer cannot excuse a fixture that never fired.

**When to use:** Any runtime check over browser windows or log output.
**Source:** 01-05-SUMMARY.md, 01-09-SUMMARY.md, 01-11-SUMMARY.md

---

### Evaluate the shipped source rather than re-implement it
`verify-shell-error-contract.mjs` `await import()`s the ES module with `globalThis.ChromeUtils` faked and runs the classic chrome script via `node:vm` with the sandbox as its own `window`; firing the captured `DOMContentLoaded` handler is the drive. The fake boundary is a Proxy with a throwing trap so an unstubbed `PowerBrowserAPI.<name>` throws by name.

**When to use:** A Gecko chrome path needs in-process behavioural coverage without a display.
**Source:** 01-11-SUMMARY.md

---

### Causal, not temporal, instrumentation
Count what happened after the code under test emitted its own sentinel; never depend on winning a microtask race. Both probe scenarios share one drain constant so the negative side's zero is meaningful only because the positive side proves the drain is long enough.

**When to use:** Asserting on counts inside async loops under fake timers.
**Source:** 01-12-SUMMARY.md

---

### Self-test fault anchors match code shape, not prose
`RETRY_GUARD_RE` / `RETRY_GUARD_ORDER_RE` match the guard's structure. A prose anchor rots when the log sentence is reworded; a mutation that produces unchanged source fails its row.

**When to use:** Writing planted-fault mutators.
**Source:** 01-13-SUMMARY.md

---

### Self-test rows spawn the real CLI via `execFileSync(process.execPath, [SELF, ...])`
Argument parsing, exit codes, and reporting are inside what is proven, not just the inner function.

**When to use:** Any script whose CLI surface is part of the contract.
**Source:** 01-15-SUMMARY.md, 01-17-SUMMARY.md

---

### One collection point in the shared function, one policy per caller
`scan()` records `unreadable` on both return shapes; callers decide what fails because justification differs by provenance (foreign checkout vs tracked tree).

**When to use:** A shared function serves callers with different failure semantics.
**Source:** 01-17-SUMMARY.md

---

### Add alongside; never replace or promote
A second file-set source beside `git ls-files`; a singular must-survive constant beside a derived must-suppress set; new self-test rows appended with original labels and order untouched.

**When to use:** Extending a check that already has earned rows.
**Source:** 01-15-SUMMARY.md, 01-21-SUMMARY.md

---

### Hermetic self-test in `--quick`; real-input row re-tiered into the full set with "re-tiered, not excused"
The self-test fixture is authored, not copied from `upstream/`, so `--quick` needs no clone. The real row fails loudly naming `fetch-upstream.sh` when the clone is absent.

**When to use:** A check needs the git-ignored `upstream/` clone.
**Source:** 01-20-SUMMARY.md, deferred-items.md

---

### Tier-1/tier-2 edits verified by symlink `cmp` and `./mach build faster`, never a full compile
`objdir/dist/bin/.../*.css|*.xhtml` are symlinks into the source tree. `./mach build faster` (seconds) for a `jar.mn` change, `cmp` against source for content changes, `git -C upstream diff --stat` empty after every run. Tier-3 regression confirmations deferred to the phase gate, not skipped.

**When to use:** Any chrome-JS, CSS, or markup change under `powerbrowser/`.
**Source:** 01-09-SUMMARY.md, 01-10-SUMMARY.md, 01-18-SUMMARY.md, 01-19-SUMMARY.md, 01-20-SUMMARY.md

---

### Verifier reproduces the load-bearing mutation and splits truths by direction; UAT keyed by provenance
Pass 4 re-ran the exact scratch-root mutation that exited 0 at the prior HEAD and confirmed exit 1. Truth 9 became 9a (over-reach), 9b (current state), 9c (durability). UAT tests 14 through 41 are `source: automated` keyed to SUMMARY coverage blocks; gaps carry `root_cause`, `artifacts[]`, `missing[]`, `resolved_by`.

**When to use:** Every re-verification and UAT write-up.
**Source:** 01-VERIFICATION.md, 01-UAT.md

---

## Surprises

### Token estimates are the wrong unit for prove-it plans
01-04 realised 1,017 tokens against a 70,000 estimate; its cost was a 677 s clone, a 2830 s compile, and about 25 min of verification. Plans 01-08 through 01-21 came in at 0.12 to 0.59 of estimate. Conversely 01-01 reported 311,284 tokens, 273,000 of it verbatim `git archive` import. No PLAN carried a wall-clock estimate; all 21 were `confidence: low`.

**Impact:** Estimate calibration on this phase measures tool pass-through, not authored work.
**Source:** 01-01-SUMMARY.md through 01-21-SUMMARY.md

---

### `upstream/` is 5.6 GB, not the 1.1 GB cited in three documents
WINDOWS.md, deferred-items.md, and the 01-03 summary had the wrong figure; `docs/BUILD.md` was right. A live `--extra-root` walk over it cost 55 s across 463,930 files.

**Impact:** The cost concern on scanning the rebased tree was retired by measurement.
**Source:** 01-04-SUMMARY.md, 01-15-SUMMARY.md

---

### Incremental and chrome-JS rebuilds are minutes or seconds, not the budgeted forty minutes
The 01-05 patch change rebuilt in about 3 min. `./mach build faster` repackages chrome JS in 22 s cold / 1.9 s warm.

**Impact:** Tier-3 confirmations could be deferred to the phase gate rather than skipped.
**Source:** 01-05-SUMMARY.md, 01-09-SUMMARY.md, 01-10-SUMMARY.md

---

### A `--only smoke-firefox | head` invocation during the real build could have started a second `./mach build` into the same objdir
SIGPIPE kills the driver but checks are `setsid`'d. Only process inspection confirmed one chain was alive.

**Impact:** Corruption would have surfaced 40 minutes later.
**Source:** 01-04-SUMMARY.md

---

### `LICENSE:133` was a hand-write surface the plan omitted, and the `.desktop` `Exec=` line carries three tokens with three targets
The mechanical vendor rename would have produced "DeBIOS Foundation Institute Corporation", not a legal entity.

**Impact:** Hand-write classification had to be extended mid-plan.
**Source:** 01-01-SUMMARY.md, 01-02-SUMMARY.md

---

### Three Mozilla egress hosts were allow-listed with no documentation in this project
The docs lived in the upstream tree and were never imported. `allowlist-doc-consistency` caught it only once all checks sat in one table.

**Impact:** Driver consolidation surfaced a gap no per-phase driver could see.
**Source:** 01-03-SUMMARY.md

---

### The `@theia/mini-browser` supply-chain verdict derived from 1.75.0, not the pinned 1.74.1
The pinned version was clean. `token-gate` `unshift`s into `EarlyExpressMiddleware`, so ordinary backend routes are gated by construction.

**Impact:** The "new attack surface" framing was overstated; the rejection ground moved to runtime surface.
**Source:** 01-06-SUMMARY.md

---

### Every `withFirefoxPage` caller passing a URL launches two windows
`contexts[0]` resolves to the shell's own frontend, so the four `_run_app_check_mjs` checks boot a dev app at `:3000` they never read.

**Impact:** Pre-existing; recorded in WINDOWS.md.
**Source:** 01-05-SUMMARY.md

---

### A stale Theia bundle produced a false runtime red after the TSX fix
`verify-branding` kept reporting the identifier form until the branding extension and browser app were rebuilt in the Theia dev shell.

**Impact:** A runtime check can report a red that is not a fact about the tree.
**Source:** 01-08-SUMMARY.md

---

### `grep -r` does not follow symlinks; the installed chrome path resolves through two of them
`grep -rl` over `objdir/dist/bin` found nothing though packaging was correct (`-R` would). `powerbrowser.xhtml` resolves via `upstream/powerbrowser/shell/...` back into this repo.

**Impact:** Verification of packaged files must `cmp` through the symlink chain.
**Source:** 01-09-SUMMARY.md, 01-19-SUMMARY.md

---

### The pre-fix refused Retry replaced the diagnostic rows with a second, different failure's rows
The click had already driven a spawn against unassigned state, so "spawning the backend process" rows overwrote the original.

**Impact:** The defect was worse than "rows erased".
**Source:** 01-13-SUMMARY.md

---

### Fifty spawns in one drive on the unfixed tree
The ungated probe burned its full sleep budget against a launch that had resolved nothing.

**Impact:** Not a rounding error; the probe gate was load-bearing.
**Source:** 01-12-SUMMARY.md

---

### The fake boundary needed three methods the plan's stub list omitted
`createPermanentKey`, `getAppIdentity`, `notifyStartupFinished`. The plan enumerated from the supervisor's reach; the chrome bootstrap reaches the boundary too. The Proxy's throwing trap surfaced each by name.

**Impact:** The throwing-trap design paid for itself on first run.
**Source:** 01-11-SUMMARY.md

---

### WINDOWS.md is YAML frontmatter plus a markdown table plus a fenced JSON block, not bare JSON
The plan's `<verify>` sliced from the first `[`, which occurs inside table prose, and never parsed.

**Impact:** Plan verify snippets need to be run, not trusted.
**Source:** 01-12-SUMMARY.md

---

### `#experimental` / `#communityExperimentalDesc` is dormant at ESR but still counted
`aboutDialog.js` un-hides it only on nightly builds. 01-18 left it alone; 01-21's derived external-link set flagged it anyway and it was suppressed.

**Impact:** A derived set catches what a human reading the ESR build would skip.
**Source:** 01-18-SUMMARY.md, 01-21-SUMMARY.md

---

### Adding a selector turned the self-test control red
`restore()` pairs the real stylesheets with the authored `fixtureMarkup()`, so adding `#communityExperimentalDesc` failed the unmutated control on staleness until a mirroring `<vbox id="experimental">` was added. 01-21 also widened the coupling from ids to hrefs.

**Impact:** The fixture-coupling ceiling fired in the commit gate one plan after being recorded.
**Source:** 01-21-SUMMARY.md, 01-REVIEW.md

---

### A tracer task auto-satisfied with no human affordance
With auto mode off, a `type="tracer"` task normally fires a human-verify checkpoint, but the tracer's `<verify>` was CLI-only with nothing painted, so no checkpoint emitted (01-14 and 01-15).

**Impact:** Checkpoint semantics depend on the verify block's shape.
**Source:** 01-15-SUMMARY.md

---

### `_branding_variant_divergence_impl` has never run
It reads `objdir-release/`, which does not exist (ledger 10 `--gate` exclusion), and carried a stale expectation that would have demanded the wrong `brandFullName` the day a release objdir exists.

**Impact:** A never-run check can hide a latent wrong expectation indefinitely.
**Source:** 01-19-SUMMARY.md

---

### The green-by-construction shape survived three closures through a fourth vector
After the coverage assertion landed, wrapping the entire suppression rule in `@media print` leaves every vendor link visible while the check prints a PASS in which every clause is false; the flat brace-pair regex discards at-rule context.

**Impact:** Still open as REVIEW CR-03.
**Source:** 01-REVIEW.md

---

### Hidden is not silent: `aria-describedby` still announces suppressed nodes
Upstream lists `communityDesc contributeDesc` in the dialog's description chain; the referenced-node exception overrides the hidden-node rule. CSS cannot reach this.

**Impact:** Open as REVIEW WR-01; screen readers still hear vendor copy.
**Source:** 01-REVIEW.md

---

### Importing the checker module runs the whole check and exits; the `jar.mn` parser misses the dominant line shape
`verify-about-dialog-suppression.mjs` has five exports but an unguarded main body ending in `process.exit`. Entries omitting the parenthesised source (11 of 17 in upstream's manifest) match nothing, so a correctly packaged resource can be reported as unpackaged.

**Impact:** Open as REVIEW WR-12 and WR-05.
**Source:** 01-REVIEW.md

---

### Removing the `#rightBox` padding did not stop the 404 its comment blames
Upstream sets `background-image: url("chrome://branding/content/about-wordmark.svg")`; the request still 404s, and the version column lost its inset.

**Impact:** Open as REVIEW WR-02 until Phase 3 ships the wordmark.
**Source:** 01-REVIEW.md
