---
schema_version: 1
open_count: 7
waived_count: 0
fixed_count: 13
total_count: 20
last_updated: 2026-08-31T20:51:24.322Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 01 | deviation | sourcerer/endpoint-allowlist.json | 82 | GitHub org URL becomes https://github.com/DeBIOS/PowerBrowser under the mechanical vendor rename; the DeBIOS Foundation's actual GitHub org is not established (D-12 fixes only the domain). Must be confirmed before release. | fixed |  | 2026-08-30T17:53:27.054Z | 2026-08-30T22:00:12.411Z |
| 2 | 01 | deviation | theia/extensions/branding/src/browser/sourcerer-welcome-widget.tsx | 13 | SOURCERER_REPO_URL points at github.com/Deocracy/Sourcerer; same unestablished-org problem as endpoint-allowlist.json:82. | fixed |  | 2026-08-30T17:53:27.157Z | 2026-08-30T22:00:12.510Z |
| 3 | 01 | unrun-verify | scripts/apply-patches.sh |  | apply-patches.sh --self-test cannot run: needs upstream/browser/moz.configure and upstream/ has never been materialized (pre-existing, rename-independent) | fixed |  | 2026-08-30T20:24:37.919Z | 2026-08-30T22:00:12.608Z |
| 4 | 01 | unrun-verify | scripts/verify-customize-inert.mjs |  | verify-customize-inert.mjs unrun: needs a built binary at objdir/dist/bin/powerbrowser (Tier 3 Gecko build) | fixed |  | 2026-08-30T20:24:38.018Z | 2026-08-30T22:00:12.714Z |
| 5 | 01 | unrun-verify | scripts/verify-dev-flag-off.mjs |  | verify-dev-flag-off.mjs unrun: needs a built binary at objdir/dist/bin/powerbrowser (Tier 3 Gecko build) | fixed |  | 2026-08-30T20:24:38.116Z | 2026-08-30T22:00:12.816Z |
| 6 | 01 | deviation | inventory/brand-tokens.json |  | scan-brand-residue.mjs --reconcile no longer closes post-rename; its expected_count census describes the pre-rename tree. Gate is the plain run. Terminal census owned by plan 01-03. | fixed | Both halves of this entry are now false, which is why it closes. (1) --reconcile DOES close post-rename: plan 01-08 reconciled the four drifted rows against the current tree by name -- the absolute-repo-root row to 0 (both .desktop entries hand-rewritten in 01-03), MOZ_APP_UA_NAME and MOZ_APP_ID to 1 each (the second site was a patch-020 context line dropped when 020 was regenerated in 01-05), and the -PLAN.md provenance row to 28 (+2 from the 01-03 driver consolidation, +5 from 01-05's INTERNAL-APIS.md catalogue rows), each with its justification written into its own reason field. (2) The plain run is NO LONGER a separate, weaker gate: reconciliation failures now fail the un-flagged invocation too, through a single gateFailures() exit source, so the two modes agree on the same tree. | 2026-08-30T20:24:38.216Z | 2026-08-31T04:25:03.312Z |
| 7 | 01 | unrun-verify | scripts/verify-platform.sh |  | 31 of verify-platform.sh's 48 checks could not run: they need a built tree, a launched browser, or a display. objdir/ does not exist yet (plan 01-04). | fixed |  | 2026-08-30T20:49:13.526Z | 2026-08-30T22:00:29.468Z |
| 8 | 01 | unrun-verify | scripts/verify-platform.sh |  | apply-patches-self-test cannot run: it derives its fixture from upstream/browser/moz.configure and upstream/ is a git-ignored 1.1 GB clone absent on a fresh checkout. Pre-existing, rename-independent. | fixed |  | 2026-08-30T20:49:13.628Z | 2026-08-30T22:00:12.915Z |
| 9 | 01 | deviation | .planning/REQUIREMENTS.md |  | MIG-04 was auto-checked from plan 01-03's frontmatter but nothing has been built; reverted to unchecked. Plan 01-04 owns the build that closes it. | fixed |  | 2026-08-30T20:49:13.723Z | 2026-08-30T22:00:13.014Z |
| 10 | 01 | unrun-verify | scripts/verify-platform.sh |  | verify-branding-identity-release and branding-variant-divergence still unrun: both read objdir-release/dist/bin, i.e. a second full ~47m release build that 01-04-PLAN.md explicitly declined to spend. Runnable the moment a release objdir exists. | open |  | 2026-08-30T22:00:29.574Z |  |
| 11 | 01 | unrun-verify | scripts/verify-platform.sh |  | The ~20 launch-lifecycle checks (side03-*, side04-*, side05-*, shell03-*, shell04-diagnostics-with-backend-down, cr01-*, harness-display-available) became RUNNABLE with 01-04's build but were not run: none is named by 01-04-PLAN.md's verify blocks and each launches a real browser. Not blocked -- unexercised. | open |  | 2026-08-30T22:00:29.678Z |  |
| 12 | 01 | stub | powerbrowser/shell/powerbrowser.js |  | Env-gated POWERBROWSER_SPIKE_GUI01 instrumentation left in the shell bootstrap by plan 01-05 Task 1; it is spike scaffolding and Task 3 of the same plan removes it | fixed |  | 2026-08-30T23:38:09.088Z | 2026-08-31T00:39:32.952Z |
| 13 | 01 | deviation | scripts/check-internals-boundary.sh |  | ChromeUtils.registerWindowActor is absent from FORBIDDEN_PATTERNS. Latent, not exploited: candidate B (the JSWindowActor pair) was NOT adopted in 01-05, so nothing in-tree uses it. Any future actor pair must add it in the same commit or the boundary guard has a hole. | open |  | 2026-08-31T00:39:33.061Z |  |
| 14 | 01 | deviation | scripts/lib/firefox-bidi.mjs |  | Every withFirefoxPage caller that passes a URL launches TWO windows (the shell plus a stock browser window for the URL argument), and contexts[0] resolves to the shell's own supervised Theia frontend rather than the URL passed. Pre-existing, unrelated to 01-05's change: the four _run_app_check_mjs checks boot a dev app at localhost:3000 they then do not read. | open |  | 2026-08-31T00:39:33.163Z |  |
| 15 | 01 | unrun-verify | .planning/phases/01-platform-extraction-and-rename/01-VALIDATION.md |  | GUI-01 manual browser-window verification not performed: 01-07 executed autonomously with no human present. Five steps outstanding (launch app; open a browser window; address bar takes keyboard focus and navigates a typed URL; an in-window modal appears; closing the window returns the shell with the app still running). Automation cannot substitute -- BiDi cannot see chrome contexts on Linux (ledger 7). | open |  | 2026-08-31T02:09:45.801Z |  |
| 16 | 01 | unrun-verify | .planning/phases/01-platform-extraction-and-rename/01-VALIDATION.md |  | GUI-03 manual customize-bridge verification not performed: 01-07 executed autonomously with no human present. Three steps outstanding (with the dev flag on, edit customize.css and see the shell restyle without a rebuild; delete it; see the shell revert). Its automatable halves -- inertness and flag-gating -- are green (verify-customize-inert, verify-dev-flag-off); only the perceptual half is open. | open |  | 2026-08-31T02:09:45.906Z |  |
| 17 | 01 | deviation | scripts/verify-branding-preflight.mjs |  | The preflight's display-surface list is HAND-KEPT, and that omission is exactly what let the welcome widget render the identifier form through the whole rename (fixed in 01-07 by adding the file). The list should derive the set of display surfaces from the tree rather than enumerate it; until then, any new file that renders the product name must be added here by hand or the leak class returns. | fixed | Closed by plan 01-08 Task 2, which fixed the class rather than the site: section 6 of verify-branding-preflight.mjs now DERIVES its display-surface set by reading theia/extensions/branding/src/browser/ at check time, so it goes red when a leaking surface is added and red when that directory disappears. A zero-file walk is its own distinct failure, not a clean run. Proven both ways -- a scratch .tsx dropped into that directory was rejected by name with the script unedited, and the self-test now copies the whole directory and plants the identifier form in the About dialog copy. The walk reads the filesystem, not the git index, so unlike scan-brand-residue.mjs it also sees an unstaged new file. Residual exposure, recorded as a backstop truth rather than as a closed gap: a display surface authored OUTSIDE that directory and outside the inventory-declared variant files is still not reached by this scan and rests on code review. | 2026-08-31T02:09:52.011Z | 2026-08-31T04:37:15.633Z |
| 18 | 01 | deviation | powerbrowser/shell/TheiaService.sys.mjs |  | The supervisor's start path shipped two defects with one user-visible outcome. (a) State-keying conflation: "a port has been pinned" and "a spawn has actually completed" were one condition, so a first spawn that announced readiness and then failed the health gate made every later successful respawn skip the one-time initialisation -- the user sat on the branded loading layer with a healthy backend behind it. (b) No terminal handler: powerbrowser.js called TheiaService.start(browserElement) with no await and no catch, and three reachable throw sites inside that path (settings-folder creation, leftover reap, session-cookie minting) were unguarded, so any of them became an unhandled promise rejection in chrome with the identical dead screen -- no message, no Retry, no Details. Found by 01-VERIFICATION.md rather than by any check: every launch check in the registry drove a failure that already had a classified result, and none drove a rejection that ESCAPED. | fixed | Closed by plans 01-09 (a) and 01-10 (b). (a) The one-time initialisation block and _restart()'s per-attempt port choice are now keyed on this._swapped -- the same field _swap()'s own guard reads -- and _swap() sets it AFTER the navigation returns. (b) One public terminal handler, TheiaService.reportUnexpectedFailure, attached at all four fire-and-forget entry points (the bootstrap's start call, the Retry control's retry call, and the _healthLoop and _recoveryProbeLoop roots); it paints a direct USER_MESSAGE.couldNotStart reference with the failed step and the rejection text as diagnostics rows, minting no new copy. The settings-folder and session-cookie sites now return the same classified-result shape every other _spawnAndGate failure returns, with the cookie catch returning BEFORE the navigation so a launch whose credential was never minted never reaches the backend origin; the reap site is guarded, logged on its existing dual channel and deliberately non-fatal, because failing a launch over a previous launch's stale pid would turn a cosmetic cleanup miss into the dead screen being fixed. PROVEN BY TWO REGISTERED CHECKS, each observed red before its own fix and green after, same binary, only chrome source differing: health-gate-recovery-swaps (red -- no swap sentinel after a recovered health gate) and start-failure-shows-error (red -- no error sentinel at all within 30s of a real throw). start-path-recovery's static half additionally derives, from the tree on both sides, the set of promise-returning supervisor methods and requires every bootstrap call to one of them to carry a terminal handler; that rule was hand-proven red by stripping the handler from the start call and naming that exact site, and its self-test carries 11 planted faults plus 2 clean controls. RESIDUAL, NOT CLOSED: no registered check drives a rejection out of either long-lived supervisor loop -- that would need a fault injected into a mid-session code path with no external control surface -- so those two terminal handlers rest on the source-derived coverage rule rather than on a runtime red. Ledger items 15 and 16 are untouched by this work and remain open. | 2026-08-31T12:10:00.000Z | 2026-08-31T12:10:00.000Z |
| 19 | 01 | unrun-verify | scripts/verify-platform.sh |  | 01-11 changed the error layer's visible behaviour; shell03-budget-exhausted-error and shell03-auto-dismiss-on-selfheal not re-run against a repackaged binary (tier-3, phase-gate scope). Neither clicks Retry, so neither is expected to move. | open |  | 2026-08-31T20:39:31.590Z |  |
| 20 | 01 | deviation | powerbrowser/shell/TheiaService.sys.mjs |  | The supervisor's error-state contract shipped three defects in one class, found together by a code review run against the post-01-09/01-10 tree and independently re-derived from source by 01-VERIFICATION.md -- not by any registered check. (2c) A failing Retry permanently disabled the error layer: the chrome Retry global blanked the error element directly while the supervisor's _errorShown repaint guard stayed set, so the FIRST Retry that did not succeed left a blank screen with no message, no Retry and no Details for the rest of the session. (2d) _showError started D-115's background recovery probe unconditionally, ignoring the recoverable classification it had just been handed, so the one class the supervisor's own D-113 comment calls unrecoverable by construction with no retry at all drove a process spawn every probe interval, for the life of the session, against a _configDir and a _stateFilePath that branch returns before ever assigning. (2e) PowerBrowserAPI.onQuitGranted was registered AFTER the settings-folder ensureDirectory try/catch -- a returnable branch whose failure is classified recoverable and which therefore still probes -- so a probe-driven spawn could reach a live, healthy, swapped backend on a launch that had registered no quit observer and derived no state-file path: stop() never runs on quit, a Node process with the extension host's file access and terminal surface outlives the browser still holding the token it was handed at spawn, and a crash on that launch leaves the next launch's _reapLeftover() nothing to find. NO REGISTERED CHECK COULD GO RED ON ANY OF THE THREE, and all three shipped green through three full verification runs. shell03-budget-exhausted-error asserts there is exactly ONE error sentinel, which is correct for the launch it drives and blind to a second one; shell03-unrecoverable-immediate-error asserts no spawn attempt within a 15-second window and was green precisely because the probe's first interval had not elapsed yet. | fixed | Closed by plans 01-11 (2c) and 01-12 (2d, 2e). Two analyzers do the work, both riding already-registered rows and both deriving rather than hand-keeping. scripts/verify-shell-error-contract.mjs evaluates the SHIPPED supervisor and the SHIPPED chrome bootstrap in-process -- the supervisor imported with ChromeUtils faked, the bootstrap run through node:vm against a sandbox that is also its own window -- and drives them by firing the bootstrap's own DOMContentLoaded handler, so the entry point stays under test rather than under simulation. scripts/verify-start-path-recovery.mjs derives its rules from the tree at check time and compares. FOUR INDEPENDENT REDS WERE OBSERVED, one per clause, each before its own fix and green after. (2c), plan 01-11, scenario two-consecutive-failing-retries-repaint: "verify-shell-error-contract: FAIL -- scenario two-consecutive-failing-retries-repaint: no POWERBROWSER_SHELL_ERROR_CLEARED was emitted after the first failing Retry; no second POWERBROWSER_SHELL_ERROR was emitted -- the error layer never came back. ... (Stale recovery probe still active after the first Retry: true.)" Fixed by retry() calling _hideError() before _restart(), with the bootstrap's Retry global no longer writing style.display behind the supervisor's back. (2d), plan 01-12, scenario unrecoverable-classification-starts-no-probe: "verify-shell-error-contract: FAIL -- scenario unrecoverable-classification-starts-no-probe: the recovery probe ran for a failure the supervisor classified unrecoverable -- the boundary's spawn was called 50 time(s) after an error state whose recoverable flag was false." On that SAME unfixed run the positive control recoverable-classification-starts-the-probe was GREEN; the asymmetry is the evidence that the instrument discriminates rather than failing everything. Fixed by gating _showError's _startRecoveryProbe() call on the recoverable parameter the method already receives. The verification's suggested alternative -- a dedicated "sidecar resolved" boolean -- was considered and REJECTED: the classification is already carried into _showError by every caller, so a second flag would be a second source of truth for one fact, which is the shape of the defect rather than its fix. (2e), plan 01-12, derivation E in verify-start-path-recovery.mjs, in two independently failing clauses. Clause 2, the ordering: "verify-start-path-recovery: FAIL -- `start()` can return at byte 1017 of its own body -- BEFORE it has both registered the quit observer (`PowerBrowserAPI.onQuitGranted`) and derived `this._stateFilePath`." Clause 3, the retention, observed separately with the reorder already applied and the boundary's return value still discarded: "verify-start-path-recovery: FAIL -- `start()` discards the unregister function `PowerBrowserAPI.onQuitGranted` returns -- the observer's lifetime is then the application's rather than this supervisor's, and nothing can ever detach it." Fixed by deriving _stateFilePath and registering the observer immediately after _configDir and ahead of the settings-folder try/catch, retaining the unregister function as _quitObserverOff, and detaching it in stop() only after the process has been signalled, awaited and cleared. The probe gate is TWO-DIRECTIONAL by construction: the registered positive control requires a recoverable classification to still drive at least one probe spawn, so a fix that simply stopped probing everywhere fails it, and the analyzer's --self-test plants exactly that fault ("the recovery probe never started at all") and requires it red. Derivation E's window is derived from the tree -- the first return after the _resolveSidecar call, through to the later of the two anchors, with both anchors located structurally and no identifier written down for the tree to agree with -- so it goes red on ANY future early return inserted ahead of the registration, not only the settings-folder one this gap named. shell-error-contract-self-test now stands at 5 planted faults plus 1 clean control; start-path-recovery-self-test at 16 plus 2. scripts/verify-platform.sh --quick is green at 24 rows and neither plan added a registry row. RESIDUAL, NOT CLOSED: the behavioural half runs the shipped sources under NODE against a faked PowerBrowserAPI, not under Gecko. It proves the classification-to-probe wiring, the spawn counts and the sentinel ordering; it does NOT prove that Gecko's quit-application-granted topic actually fires the retained observer in a real quit, and it does not prove the pixels of a repainted error layer. Both rest on the human record rather than on these checks, because chrome-context Marionette is platform-blocked on Linux (ledger item 7). No registered check drives a spawn whose settings folder could not be created, so the reorder's one accepted consequence -- a _stateFilePath pointing into a directory that may not exist -- rests on reading writeStateFile's existing non-fatal try/catch and readStateFile's null-for-absent contract rather than on a red. The two tier-3 regression confirmations recorded as ledger item 19 remain unrun, and shell03-auto-dismiss-on-selfheal is the one that could genuinely move, because its subject is the recoverable side of this gate. Ledger items 15 and 16 are untouched by this work and remain OPEN. | 2026-08-31T20:51:20.010Z | 2026-08-31T20:51:24.322Z |

````json
[
  {
    "id": 1,
    "kind": "deviation",
    "phase": "01",
    "file": "sourcerer/endpoint-allowlist.json",
    "line": 82,
    "description": "GitHub org URL becomes https://github.com/DeBIOS/PowerBrowser under the mechanical vendor rename; the DeBIOS Foundation's actual GitHub org is not established (D-12 fixes only the domain). Must be confirmed before release.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-30T17:53:27.054Z",
    "resolved_at": "2026-08-30T22:00:12.411Z"
  },
  {
    "id": 2,
    "kind": "deviation",
    "phase": "01",
    "file": "theia/extensions/branding/src/browser/sourcerer-welcome-widget.tsx",
    "line": 13,
    "description": "SOURCERER_REPO_URL points at github.com/Deocracy/Sourcerer; same unestablished-org problem as endpoint-allowlist.json:82.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-30T17:53:27.157Z",
    "resolved_at": "2026-08-30T22:00:12.510Z"
  },
  {
    "id": 3,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "scripts/apply-patches.sh",
    "line": null,
    "description": "apply-patches.sh --self-test cannot run: needs upstream/browser/moz.configure and upstream/ has never been materialized (pre-existing, rename-independent)",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-30T20:24:37.919Z",
    "resolved_at": "2026-08-30T22:00:12.608Z"
  },
  {
    "id": 4,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "scripts/verify-customize-inert.mjs",
    "line": null,
    "description": "verify-customize-inert.mjs unrun: needs a built binary at objdir/dist/bin/powerbrowser (Tier 3 Gecko build)",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-30T20:24:38.018Z",
    "resolved_at": "2026-08-30T22:00:12.714Z"
  },
  {
    "id": 5,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "scripts/verify-dev-flag-off.mjs",
    "line": null,
    "description": "verify-dev-flag-off.mjs unrun: needs a built binary at objdir/dist/bin/powerbrowser (Tier 3 Gecko build)",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-30T20:24:38.116Z",
    "resolved_at": "2026-08-30T22:00:12.816Z"
  },
  {
    "id": 6,
    "kind": "deviation",
    "phase": "01",
    "file": "inventory/brand-tokens.json",
    "line": null,
    "description": "scan-brand-residue.mjs --reconcile no longer closes post-rename; its expected_count census describes the pre-rename tree. Gate is the plain run. Terminal census owned by plan 01-03.",
    "status": "fixed",
    "reason": "Both halves of this entry are now false, which is why it closes. (1) --reconcile DOES close post-rename: plan 01-08 reconciled the four drifted rows against the current tree by name -- the absolute-repo-root row to 0 (both .desktop entries hand-rewritten in 01-03), MOZ_APP_UA_NAME and MOZ_APP_ID to 1 each (the second site was a patch-020 context line dropped when 020 was regenerated in 01-05), and the -PLAN.md provenance row to 28 (+2 from the 01-03 driver consolidation, +5 from 01-05's INTERNAL-APIS.md catalogue rows), each with its justification written into its own reason field. (2) The plain run is NO LONGER a separate, weaker gate: reconciliation failures now fail the un-flagged invocation too, through a single gateFailures() exit source, so the two modes agree on the same tree.",
    "recorded_at": "2026-08-30T20:24:38.216Z",
    "resolved_at": "2026-08-31T04:25:03.312Z"
  },
  {
    "id": 7,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "scripts/verify-platform.sh",
    "line": null,
    "description": "31 of verify-platform.sh's 48 checks could not run: they need a built tree, a launched browser, or a display. objdir/ does not exist yet (plan 01-04).",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-30T20:49:13.526Z",
    "resolved_at": "2026-08-30T22:00:29.468Z"
  },
  {
    "id": 8,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "scripts/verify-platform.sh",
    "line": null,
    "description": "apply-patches-self-test cannot run: it derives its fixture from upstream/browser/moz.configure and upstream/ is a git-ignored 1.1 GB clone absent on a fresh checkout. Pre-existing, rename-independent.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-30T20:49:13.628Z",
    "resolved_at": "2026-08-30T22:00:12.915Z"
  },
  {
    "id": 9,
    "kind": "deviation",
    "phase": "01",
    "file": ".planning/REQUIREMENTS.md",
    "line": null,
    "description": "MIG-04 was auto-checked from plan 01-03's frontmatter but nothing has been built; reverted to unchecked. Plan 01-04 owns the build that closes it.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-30T20:49:13.723Z",
    "resolved_at": "2026-08-30T22:00:13.014Z"
  },
  {
    "id": 10,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "scripts/verify-platform.sh",
    "line": null,
    "description": "verify-branding-identity-release and branding-variant-divergence still unrun: both read objdir-release/dist/bin, i.e. a second full ~47m release build that 01-04-PLAN.md explicitly declined to spend. Runnable the moment a release objdir exists.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-30T22:00:29.574Z",
    "resolved_at": null
  },
  {
    "id": 11,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "scripts/verify-platform.sh",
    "line": null,
    "description": "The ~20 launch-lifecycle checks (side03-*, side04-*, side05-*, shell03-*, shell04-diagnostics-with-backend-down, cr01-*, harness-display-available) became RUNNABLE with 01-04's build but were not run: none is named by 01-04-PLAN.md's verify blocks and each launches a real browser. Not blocked -- unexercised.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-30T22:00:29.678Z",
    "resolved_at": null
  },
  {
    "id": 12,
    "kind": "stub",
    "phase": "01",
    "file": "powerbrowser/shell/powerbrowser.js",
    "line": null,
    "description": "Env-gated POWERBROWSER_SPIKE_GUI01 instrumentation left in the shell bootstrap by plan 01-05 Task 1; it is spike scaffolding and Task 3 of the same plan removes it",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-30T23:38:09.088Z",
    "resolved_at": "2026-08-31T00:39:32.952Z"
  },
  {
    "id": 13,
    "kind": "deviation",
    "phase": "01",
    "file": "scripts/check-internals-boundary.sh",
    "line": null,
    "description": "ChromeUtils.registerWindowActor is absent from FORBIDDEN_PATTERNS. Latent, not exploited: candidate B (the JSWindowActor pair) was NOT adopted in 01-05, so nothing in-tree uses it. Any future actor pair must add it in the same commit or the boundary guard has a hole.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-31T00:39:33.061Z",
    "resolved_at": null
  },
  {
    "id": 14,
    "kind": "deviation",
    "phase": "01",
    "file": "scripts/lib/firefox-bidi.mjs",
    "line": null,
    "description": "Every withFirefoxPage caller that passes a URL launches TWO windows (the shell plus a stock browser window for the URL argument), and contexts[0] resolves to the shell's own supervised Theia frontend rather than the URL passed. Pre-existing, unrelated to 01-05's change: the four _run_app_check_mjs checks boot a dev app at localhost:3000 they then do not read.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-31T00:39:33.163Z",
    "resolved_at": null
  },
  {
    "id": 15,
    "kind": "unrun-verify",
    "phase": "01",
    "file": ".planning/phases/01-platform-extraction-and-rename/01-VALIDATION.md",
    "line": null,
    "description": "GUI-01 manual browser-window verification not performed: 01-07 executed autonomously with no human present. Five steps outstanding (launch app; open a browser window; address bar takes keyboard focus and navigates a typed URL; an in-window modal appears; closing the window returns the shell with the app still running). Automation cannot substitute -- BiDi cannot see chrome contexts on Linux (ledger 7).",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-31T02:09:45.801Z",
    "resolved_at": null
  },
  {
    "id": 16,
    "kind": "unrun-verify",
    "phase": "01",
    "file": ".planning/phases/01-platform-extraction-and-rename/01-VALIDATION.md",
    "line": null,
    "description": "GUI-03 manual customize-bridge verification not performed: 01-07 executed autonomously with no human present. Three steps outstanding (with the dev flag on, edit customize.css and see the shell restyle without a rebuild; delete it; see the shell revert). Its automatable halves -- inertness and flag-gating -- are green (verify-customize-inert, verify-dev-flag-off); only the perceptual half is open.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-31T02:09:45.906Z",
    "resolved_at": null
  },
  {
    "id": 17,
    "kind": "deviation",
    "phase": "01",
    "file": "scripts/verify-branding-preflight.mjs",
    "line": null,
    "description": "The preflight's display-surface list is HAND-KEPT, and that omission is exactly what let the welcome widget render the identifier form through the whole rename (fixed in 01-07 by adding the file). The list should derive the set of display surfaces from the tree rather than enumerate it; until then, any new file that renders the product name must be added here by hand or the leak class returns.",
    "status": "fixed",
    "reason": "Closed by plan 01-08 Task 2, which fixed the class rather than the site: section 6 of verify-branding-preflight.mjs now DERIVES its display-surface set by reading theia/extensions/branding/src/browser/ at check time, so it goes red when a leaking surface is added and red when that directory disappears. A zero-file walk is its own distinct failure, not a clean run. Proven both ways -- a scratch .tsx dropped into that directory was rejected by name with the script unedited, and the self-test now copies the whole directory and plants the identifier form in the About dialog copy. The walk reads the filesystem, not the git index, so unlike scan-brand-residue.mjs it also sees an unstaged new file. Residual exposure, recorded as a backstop truth rather than as a closed gap: a display surface authored OUTSIDE that directory and outside the inventory-declared variant files is still not reached by this scan and rests on code review.",
    "recorded_at": "2026-08-31T02:09:52.011Z",
    "resolved_at": "2026-08-31T04:37:15.633Z"
  },
  {
    "id": 18,
    "kind": "deviation",
    "phase": "01",
    "file": "powerbrowser/shell/TheiaService.sys.mjs",
    "line": null,
    "description": "The supervisor's start path shipped two defects with one user-visible outcome. (a) State-keying conflation: \"a port has been pinned\" and \"a spawn has actually completed\" were one condition, so a first spawn that announced readiness and then failed the health gate made every later successful respawn skip the one-time initialisation -- the user sat on the branded loading layer with a healthy backend behind it. (b) No terminal handler: powerbrowser.js called TheiaService.start(browserElement) with no await and no catch, and three reachable throw sites inside that path (settings-folder creation, leftover reap, session-cookie minting) were unguarded, so any of them became an unhandled promise rejection in chrome with the identical dead screen -- no message, no Retry, no Details. Found by 01-VERIFICATION.md rather than by any check: every launch check in the registry drove a failure that already had a classified result, and none drove a rejection that ESCAPED.",
    "status": "fixed",
    "reason": "Closed by plans 01-09 (a) and 01-10 (b). (a) The one-time initialisation block and _restart()'s per-attempt port choice are now keyed on this._swapped -- the same field _swap()'s own guard reads -- and _swap() sets it AFTER the navigation returns. (b) One public terminal handler, TheiaService.reportUnexpectedFailure, attached at all four fire-and-forget entry points (the bootstrap's start call, the Retry control's retry call, and the _healthLoop and _recoveryProbeLoop roots); it paints a direct USER_MESSAGE.couldNotStart reference with the failed step and the rejection text as diagnostics rows, minting no new copy. The settings-folder and session-cookie sites now return the same classified-result shape every other _spawnAndGate failure returns, with the cookie catch returning BEFORE the navigation so a launch whose credential was never minted never reaches the backend origin; the reap site is guarded, logged on its existing dual channel and deliberately non-fatal, because failing a launch over a previous launch's stale pid would turn a cosmetic cleanup miss into the dead screen being fixed. PROVEN BY TWO REGISTERED CHECKS, each observed red before its own fix and green after, same binary, only chrome source differing: health-gate-recovery-swaps (red -- no swap sentinel after a recovered health gate) and start-failure-shows-error (red -- no error sentinel at all within 30s of a real throw). start-path-recovery's static half additionally derives, from the tree on both sides, the set of promise-returning supervisor methods and requires every bootstrap call to one of them to carry a terminal handler; that rule was hand-proven red by stripping the handler from the start call and naming that exact site, and its self-test carries 11 planted faults plus 2 clean controls. RESIDUAL, NOT CLOSED: no registered check drives a rejection out of either long-lived supervisor loop -- that would need a fault injected into a mid-session code path with no external control surface -- so those two terminal handlers rest on the source-derived coverage rule rather than on a runtime red. Ledger items 15 and 16 are untouched by this work and remain open.",
    "recorded_at": "2026-08-31T12:10:00.000Z",
    "resolved_at": "2026-08-31T12:10:00.000Z"
  },
  {
    "id": 19,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "scripts/verify-platform.sh",
    "line": null,
    "description": "01-11 changed the error layer's visible behaviour; shell03-budget-exhausted-error and shell03-auto-dismiss-on-selfheal not re-run against a repackaged binary (tier-3, phase-gate scope). Neither clicks Retry, so neither is expected to move.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-31T20:39:31.590Z",
    "resolved_at": null
  },
  {
    "id": 20,
    "kind": "deviation",
    "phase": "01",
    "file": "powerbrowser/shell/TheiaService.sys.mjs",
    "line": null,
    "description": "The supervisor's error-state contract shipped three defects in one class, found together by a code review run against the post-01-09/01-10 tree and independently re-derived from source by 01-VERIFICATION.md -- not by any registered check. (2c) A failing Retry permanently disabled the error layer: the chrome Retry global blanked the error element directly while the supervisor's _errorShown repaint guard stayed set, so the FIRST Retry that did not succeed left a blank screen with no message, no Retry and no Details for the rest of the session. (2d) _showError started D-115's background recovery probe unconditionally, ignoring the recoverable classification it had just been handed, so the one class the supervisor's own D-113 comment calls unrecoverable by construction with no retry at all drove a process spawn every probe interval, for the life of the session, against a _configDir and a _stateFilePath that branch returns before ever assigning. (2e) PowerBrowserAPI.onQuitGranted was registered AFTER the settings-folder ensureDirectory try/catch -- a returnable branch whose failure is classified recoverable and which therefore still probes -- so a probe-driven spawn could reach a live, healthy, swapped backend on a launch that had registered no quit observer and derived no state-file path: stop() never runs on quit, a Node process with the extension host's file access and terminal surface outlives the browser still holding the token it was handed at spawn, and a crash on that launch leaves the next launch's _reapLeftover() nothing to find. NO REGISTERED CHECK COULD GO RED ON ANY OF THE THREE, and all three shipped green through three full verification runs. shell03-budget-exhausted-error asserts there is exactly ONE error sentinel, which is correct for the launch it drives and blind to a second one; shell03-unrecoverable-immediate-error asserts no spawn attempt within a 15-second window and was green precisely because the probe's first interval had not elapsed yet.",
    "status": "fixed",
    "reason": "Closed by plans 01-11 (2c) and 01-12 (2d, 2e). Two analyzers do the work, both riding already-registered rows and both deriving rather than hand-keeping. scripts/verify-shell-error-contract.mjs evaluates the SHIPPED supervisor and the SHIPPED chrome bootstrap in-process -- the supervisor imported with ChromeUtils faked, the bootstrap run through node:vm against a sandbox that is also its own window -- and drives them by firing the bootstrap's own DOMContentLoaded handler, so the entry point stays under test rather than under simulation. scripts/verify-start-path-recovery.mjs derives its rules from the tree at check time and compares. FOUR INDEPENDENT REDS WERE OBSERVED, one per clause, each before its own fix and green after. (2c), plan 01-11, scenario two-consecutive-failing-retries-repaint: \"verify-shell-error-contract: FAIL -- scenario two-consecutive-failing-retries-repaint: no POWERBROWSER_SHELL_ERROR_CLEARED was emitted after the first failing Retry; no second POWERBROWSER_SHELL_ERROR was emitted -- the error layer never came back. ... (Stale recovery probe still active after the first Retry: true.)\" Fixed by retry() calling _hideError() before _restart(), with the bootstrap's Retry global no longer writing style.display behind the supervisor's back. (2d), plan 01-12, scenario unrecoverable-classification-starts-no-probe: \"verify-shell-error-contract: FAIL -- scenario unrecoverable-classification-starts-no-probe: the recovery probe ran for a failure the supervisor classified unrecoverable -- the boundary's spawn was called 50 time(s) after an error state whose recoverable flag was false.\" On that SAME unfixed run the positive control recoverable-classification-starts-the-probe was GREEN; the asymmetry is the evidence that the instrument discriminates rather than failing everything. Fixed by gating _showError's _startRecoveryProbe() call on the recoverable parameter the method already receives. The verification's suggested alternative -- a dedicated \"sidecar resolved\" boolean -- was considered and REJECTED: the classification is already carried into _showError by every caller, so a second flag would be a second source of truth for one fact, which is the shape of the defect rather than its fix. (2e), plan 01-12, derivation E in verify-start-path-recovery.mjs, in two independently failing clauses. Clause 2, the ordering: \"verify-start-path-recovery: FAIL -- `start()` can return at byte 1017 of its own body -- BEFORE it has both registered the quit observer (`PowerBrowserAPI.onQuitGranted`) and derived `this._stateFilePath`.\" Clause 3, the retention, observed separately with the reorder already applied and the boundary's return value still discarded: \"verify-start-path-recovery: FAIL -- `start()` discards the unregister function `PowerBrowserAPI.onQuitGranted` returns -- the observer's lifetime is then the application's rather than this supervisor's, and nothing can ever detach it.\" Fixed by deriving _stateFilePath and registering the observer immediately after _configDir and ahead of the settings-folder try/catch, retaining the unregister function as _quitObserverOff, and detaching it in stop() only after the process has been signalled, awaited and cleared. The probe gate is TWO-DIRECTIONAL by construction: the registered positive control requires a recoverable classification to still drive at least one probe spawn, so a fix that simply stopped probing everywhere fails it, and the analyzer's --self-test plants exactly that fault (\"the recovery probe never started at all\") and requires it red. Derivation E's window is derived from the tree -- the first return after the _resolveSidecar call, through to the later of the two anchors, with both anchors located structurally and no identifier written down for the tree to agree with -- so it goes red on ANY future early return inserted ahead of the registration, not only the settings-folder one this gap named. shell-error-contract-self-test now stands at 5 planted faults plus 1 clean control; start-path-recovery-self-test at 16 plus 2. scripts/verify-platform.sh --quick is green at 24 rows and neither plan added a registry row. RESIDUAL, NOT CLOSED: the behavioural half runs the shipped sources under NODE against a faked PowerBrowserAPI, not under Gecko. It proves the classification-to-probe wiring, the spawn counts and the sentinel ordering; it does NOT prove that Gecko's quit-application-granted topic actually fires the retained observer in a real quit, and it does not prove the pixels of a repainted error layer. Both rest on the human record rather than on these checks, because chrome-context Marionette is platform-blocked on Linux (ledger item 7). No registered check drives a spawn whose settings folder could not be created, so the reorder's one accepted consequence -- a _stateFilePath pointing into a directory that may not exist -- rests on reading writeStateFile's existing non-fatal try/catch and readStateFile's null-for-absent contract rather than on a red. The two tier-3 regression confirmations recorded as ledger item 19 remain unrun, and shell03-auto-dismiss-on-selfheal is the one that could genuinely move, because its subject is the recoverable side of this gate. Ledger items 15 and 16 are untouched by this work and remain OPEN.",
    "recorded_at": "2026-08-31T20:51:20.010Z",
    "resolved_at": "2026-08-31T20:51:24.322Z"
  }
]
````
