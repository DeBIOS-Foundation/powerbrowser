---
phase: "23"
slug: "modes-leftovers-and-sketch-005-verdict"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-10-18"
---

# Phase 23 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| User keyboard and clipboard to the name field | Untyped text of any length enters the Save as Mode and Save Setup quick input | Typed and pasted names |
| Name field to user storage | The accepted name is written to modes.json or setups.json and later rendered as text | Mode and setup names |
| Agent to the hash-locked check files | An edit to a locked check that Chris has not sealed would let a check be weakened without anyone seeing it | check_locks hashes, ledger versions |
| Chris's recorded answer to the 23-03 code | 23-03 reads the G-32 answer from the ROADMAP line that 23-04 wrote | K and N |
| Chrome-bar DI rebind to the whole shell | One constant value replaces the options of every panel | ApplicationShellOptions |
| Agent to Chris's open decision | G-32 has no recommended option, so an agent choice would replace Chris's | Option a/b/c, the v1.5 milestone name |
| This phase's commits to another session's files | Untracked files from another session sit beside the sketch in `.planning/` | Commit file lists |
| Agent-written records to Chris's UAT results | A result set by the agent would claim a pass that Chris never saw | `result:`, `status:` and `truth:` lines; GUI-DEFECTS status |
| Source comment to regex-reading checks | Five checks read mode-descriptors.ts by pattern, so comment text can change what they derive | The header comment |
| Agent-written verification to the milestone record | A report that overstates what was proven would close Phase 14 on claims that no check made | 14-VERIFICATION score, overrides, digest |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-23-01 | Tampering | an oversized name reaching the store if the listener is bypassed | medium | mitigate | The commit-time backstops stay: `answer.trim().slice(0, MODE_NAME_MAX)` (mode-service.ts:449) and `answer.trim().slice(0, SETUP_NAME_MAX)` (setups-service.ts:586). The loader slices also stay (mode-service.ts:196, setups-service.ts:323). The 8b7f484 diff changes only the two call sites, the imports and the comments. modes-name-cap-at-input fails when a backstop is missing (verify-name-cap-at-input.mjs:144-145). An in-memory replay at audit removed each backstop from a scratch copy of the check. Each removal went red, naming `saveCurrentAsMode` or `saveCurrentAsSetup` "lost its commit-time .trim().slice(0, X) backstop". The check PASSES at audit | closed (R-2) |
| T-23-02 | Repudiation | a locked ng check edited and passed off as unchanged | high | mitigate | Each ng file has exactly one commit since 02ce825, 58fa9cb `(23-02)`, and that commit lists only the two ng files. The re-lock is `checkpoint:human-action gate="blocking-human"` (23-02-PLAN.md:176). The lock command appears only in `<instructions>` (:203). Ledger commit 5a5606c holds exactly the three ledger files. Its v394 `lock-checks` at 58fa9cb changes only the ng-035 and ng-036 hashes, from a1ca6db5…/b1dacbce… to fe71e1fe…/2a01c4ca…. At audit the old values equal sha256 of the files at 58fa9cb^, and the new values equal sha256 at HEAD. phase-gate printed nothing (exit 0). The "phase-gate output recorded verbatim" leg is **absent** (23-02-SUMMARY deviation 2). The audit reconstructed that output from these hashes | closed (R-1) |
| T-23-03 | Repudiation | a live probe that can never fail | medium | mitigate | The probe control fails the row unless the stock input holds all 70 characters (`seen.control !== V`, verify-name-cap-at-input-live.mjs:122-125). name-cap-live-23-02.log contains "probe control: the stock uncapped input held 70 characters" and PASS, with `PHASE23_EXIT=0`. It was written after build-23-02.log, which in turn was written after 8b7f484. Self-test re-run at audit: PASS, with all nine plants red (:213-229) | closed (R-2) |
| T-23-04 | Elevation of privilege | G-32 decided by the agent | high | mitigate | `checkpoint:decision gate="blocking-human"` (23-04-PLAN.md:114). No Phase 23 plan contains `auto_select` outside the register text. The `<options>` block lists a, b, c in that order, with no "recommend" or "prefer". The defer path stops the plan (23-04-PLAN.md:129; 23-03-PLAN.md:84). The answer was recorded at ROADMAP.md:315 in 985afa9 (21:21:21), before c86f432 (21:26:25). The only Phase 23 spec edit before 985afa9 is ea5301d, which changes three name-cap lines and no Motion line. Phase 23 changed no file under theia/ that affects motion: chrome-bar-frontend-module.ts has no commit since 02ce825 | closed (R-3) |
| T-23-05 | Tampering | a foreign untracked file swept into the sketch commit | medium | mitigate | `git show --name-only 68bf812` lists exactly the sketch README.md, the sketch index.html and MANIFEST.md. HANDOFF-plan-reorg.md, the 13-VERIFICATION file and every phase logs/ directory are untracked at audit (`git ls-files` count 0). The file list of every other Phase 23 commit (16 commits) is within its plan's `files_modified`, or is a SUMMARY, ROADMAP or ledger file | closed |
| T-23-06 | Tampering | a second `rebind(ApplicationShellOptions)` silently dropping `expandThreshold: 0` | medium | mitigate | modes-panel-motion counts rebind sites across `theia/extensions/*/src`, outside comments, and fails unless there is exactly one (verify-panel-motion.mjs:184-191). It fails on any panel without `expandThreshold: 0` (:215). Plants 3 and 4 cover these (:319-320). There is one site, chrome-bar-frontend-module.ts:53-56, and every panel has `expandThreshold: 0`. Check PASS "kind=a" and self-test PASS (8 plants), re-run at audit. Both rows are in `--quick` (verify-platform.sh:3843-3844, before :4626) | closed (R-4) |
| T-23-07 | Elevation of privilege | the executor picking or adjusting K or N | high | mitigate | Replay at audit: the 23-03 verify's sed parse of the fixed-form line at ROADMAP.md:315 gives K=a and an empty N. `node scripts/verify-panel-motion.mjs` prints exactly `modes-panel-motion: PASS -- kind=a`. 14-UI-SPEC has no "slid" line. c86f432 touches no theia/ file. A deferral stops the plan before any edit (23-03-PLAN.md:84) | closed (R-3) |
| T-23-08 | Repudiation | a UAT result or GUI-DEFECTS status claiming a live confirmation that never happened | medium | mitigate | In the diffs of 36eaa29 and 41643cb, every changed `result:` line goes to `pending`: 14.1.1 tests 11, 23 and 32, and 14-UAT test 3. Each carries a dated "2026-10-18 (23-01 …)" reason that names the Phase 24 session. No `truth:` line is removed. truth_correction lines were added at 14.1.1-UAT.md:686 and :939. GUI-DEFECTS item 2 is `IN TREE` at :29, under "Fixed in the tree, unconfirmed in the window" (:25). Its only "CONFIRMED" is the sentence "it becomes CONFIRMED there". The GUI-07 box is still unchecked | closed |
| T-23-09 | Tampering | a comment that a check's regex picks up, silently changing its derivation | medium | mitigate | 36eaa29 is the only Phase 23 commit to mode-descriptors.ts. Its `-U0` diff has 0 changed lines that do not start with ` *`. The header has 0 hits for a quote, `textContent` or a lowercase mode id before a colon. Re-run at audit, each with and without `--self-test`, all exit 0: mode-toggle-commands, mode-switch-tabs-invariant, gui08-panorama-copy, gui08-view-parity and dependent-window-content | closed (R-5) |
| T-23-10 | Repudiation | a hand-written or stale verification digest | medium | mitigate | At audit, the seam (`gsd-tools.cjs query verification.fingerprint`) was re-run over the 32 non-plan files that 14-VERIFICATION.md lists in its own `covered_files`. It returns `v3:sha256:617b930e…e298eb`, which equals the report's `covered_digest` (14-VERIFICATION.md:49). The report has no uncommitted change | closed (R-7) |
| T-23-11 | Elevation of privilege | an override invented by the agent to lift the score | medium | mitigate | Re-derived denominator: 4+5+5+5+6 = 25, which equals `score: 17/25`. The truth table has 12 VERIFIED, 5 overrides and 8 human_needed rows. Each override names a record and a date, and each record exists: 14-UI-SPEC.md:22 "AMENDED 2026-09-08"; :264 "The tab-count chip is removed (owner decision, 2026-09-08)"; :277-279 SUPERSEDED (2026-09-07, 14.1.1-10); ROADMAP.md:315 G-32 a; GUI-DEFECTS.md:21-22 "CONFIRMED by Chris 2026-09-07". Truths with no owner decision are human_needed, not overridden | closed (R-6) |
| T-23-SC | Tampering | npm/pip/cargo installs (plans 23-01 to 23-05) | low | accept | AR-23-01. `git diff 02ce825^ HEAD` over every package.json, yarn.lock, package-lock, requirements, Cargo, pyproject and flake file is empty. The last theia/yarn.lock commit is 2700e4c (Phase 19). The new imports resolve to `@theia/core` (already declared in modes/package.json:8), node: built-ins and scripts/lib/pb-relaunch.mjs | closed |

*Status: open · closed · open — below high threshold (non-blocking)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-23-01 | T-23-SC | No Phase 23 plan adds a package. The sidecar builds in 23-02 and 23-03 use the committed lock audited in Phase 19 | plans 23-01 to 23-05 (autonomous run) | 2026-10-18 |

---

## Residual Notes

None of these reopens a threat at L1.

- R-1 (T-23-02): one of the three declared legs is missing.
  - The pre-re-lock phase-gate output was not saved (23-02-SUMMARY:100, :117).
  - The audit reconstructed it from the ledger diff. phase-gate prints `test file changed (locked X, now Y)` on a hash mismatch (scripts/phase-gate.py:155-160). At 58fa9cb it would have printed exactly two lines: ng-035 locked a1ca6db5…, now fe71e1fe…; and ng-036 locked b1dacbce…, now 2a01c4ca….
  - The ledger records no actor. v394 (03:27:23Z) and v395 (03:27:29Z, empty changes) match the SUMMARY's "pasted twice". The SUMMARY is the only evidence that Chris ran the command.
  - The ledger commit subject is `chore(23)`, not `chore(23-02)`.
  - phase-gate was red from 58fa9cb (09:27) until the re-lock (20:27).
- R-2 (T-23-01, T-23-03):
  - None of the nine self-test plants removes a commit backstop. Only the audit replay shows that the check goes red on that removal.
  - modes-name-cap-at-input does not guard the loader slices. verify-setup-roundtrip.mjs:262 asserts only that `.slice(0, SETUP_NAME_MAX)` appears somewhere in setups-service, and either setups slice satisfies it. The mode loader slice (mode-service.ts:196) has no check.
  - The live row ran on build-23-02. capped-name-input.ts has not changed since.
- R-3 (T-23-04, T-23-07):
  - Chris's reply "a" reached the record through the orchestrator's chat relay. 23-04-SUMMARY:57 and ROADMAP.md:315 are its only records.
  - The same checkpoint asked for the v1.5 milestone name. Chris gave none, and the orchestrator took "Coding Workbench Layout". This crosses the same trust boundary but is outside T-23-04's G-32 scope. It is recorded as such at ROADMAP.md:315, and item 4 of the 23-05 end-of-phase list offers a rename.
- R-4 (T-23-06):
  - The rebind count matches the exact string `rebind(ApplicationShellOptions)` (verify-panel-motion.mjs:47, :187). A spacing variant, a type argument, or an `unbind` plus `bind` pair would not be counted.
  - `stripComments` does not recognise regex literals (23-03-SUMMARY:104).
  - Only the kind=a plant variants are exercised on this tree.
- R-5 (T-23-09): the audit verified the comment-only diff and the forbidden patterns, and re-ran the five checks. It did not compare their derived values before and after the comment edit.
- R-6 (T-23-11):
  - Override 3's `accepted_by` credits Chris with a v1.3 ROADMAP sequencing record. The SUPERSEDED note it cites (14-UI-SPEC.md:279) was written by plan 14.1.1-10, not by Chris.
  - Override 5 goes beyond the four candidates the research named (23-05-SUMMARY deviation 1). Its record, GUI-DEFECTS.md:21-22, exists.
- R-7 (T-23-10): the digest matches at HEAD 7ac5da7. An edit to any of the 40 covered files makes it stale by design.
- Outside the register:
  - No SUMMARY has a Threat Flags section, so there are no unregistered flags.
  - The audit found 23-VALIDATION.md modified in the working tree by another session. It was not used as evidence.
  - Every phase log is untracked and exists on this host only.
  - 14-VERIFICATION records that `973608f` (the G-14.1.1-25 `closed_by`) does not resolve, and names `6562412`.

---

## Security Audit

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-10-18 | 12 | 12 | 0 | gsd-security-auditor at HEAD 7ac5da7. Method: L1 grep depth. Static re-runs of modes-name-cap-at-input and modes-panel-motion, each with its self-test, and of the five mode-descriptors readers, each with its self-test. In-memory replay of backstop removal in a scratch copy of the name-cap check. Replay of the 23-03 K/N parse. Re-run of the verification.fingerprint seam. sha256 reconstruction of the ng-035/036 lock. Every Phase 23 commit file list read; phase-gate silent; phase logs read, not re-run. No verify-platform.sh, no live checks, no builds; check-ledger not run because it writes a stamp |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-10-18.
