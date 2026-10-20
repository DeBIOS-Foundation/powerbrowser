---
phase: "21"
slug: "panorama-spec-and-gui08-checks"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-10-17"
---

# Phase 21 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| 15-UI-SPEC text to the gui08 checks | Since this phase a spec edit changes which geometry, type and copy values pass; the spec diff is the review surface | Canvas Geometry, Typography and Copywriting Contract rows |
| Parallel plans in one checkout | 21-01 and 21-02 (wave 1), then 21-03 and 21-04 (wave 2), commit in one checkout while the other plan edits or reads shared files | Staged files, commits |
| Theia frontend model to the chrome writer | The auto-box path sent createGroup plus membership writes through GroupActorClient; 21-02 deletes it as a write path with no caller | Group writes |
| Painted copy to the user | No internal identifier may reach painted text (CLAUDE.md copy rule) | User-facing strings |
| Keyboard user to the canvas | Loose and expanded-stack cards could not be reached by arrow keys; A5 changes the focus scope | Focus, keydown |
| Live harness to Chris's machine | The headless shell and its sidecar run on the host Chris uses; port 3000 is his container | Ports, processes |
| Baseline file to every later wave gate | Every R33 gate subtracts docs/non-gui/quick-baseline.txt, so a typed line would hide a red in every later phase | FAIL row labels |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-21-01 | Repudiation | geometryDiff, a parse that can never go red | high | mitigate | geometryDiff names every drift: value (scripts/lib/ui-spec.mjs:196), CSS count and value (:208, :213), undeclared const (:220), and a ZERO-row broken instrument (:180-181). The 21-01 Task 1 verify planted LOOSE_W 170, a deleted TILE_GAP row and thumb 125px (21-01-PLAN.md:129; results in 21-01-SUMMARY). The committed self-test re-plants spec value drift, spec row deleted and CSS out of its rule (scripts/verify-gui08-canvas-geometry.mjs:370, :372, :373). Self-test PASS (12 plants) re-run at audit; a stripped-heading probe run in memory at audit returned both ZERO lines | closed (R-1) |
| T-21-02 | Tampering | a by-path commit carrying another plan's work | medium | mitigate | The plans require `git commit -- {paths}` (21-01-PLAN.md:70, 21-02-PLAN.md:66-68). `git show --stat` at audit: 38d0893 lists only ui-spec.mjs and 15-UI-SPEC.md; e0ea793 lists only the spec; c5812c9 lists the two Theia files; 0b6ae33 lists the four planned files; af75de6 and adff6b5 list only verify-gui08-panorama-copy.mjs; 101b383, 9db6371 and 0462f88 list only 21-04's files; 04bb426, 0256597, 81c5952 and 41a1975 list only 21-05's planned files. 89a2b20 (same second as 38d0893) holds only 21-02-SUMMARY.md | closed |
| T-21-03 | DoS | a deleted method that still had a live caller | medium | mitigate | c5812c9 removes only `dropCardOntoCard`, `autoBox`, the unused `targetCard` local and the `autobox:` key. `git grep` for all four over theia, scripts and powerbrowser returns rc 1 at audit, and no class extends OrganisingWidget. Every helper keeps a caller (locateCard, removeCardLocal, insertCardLocal, writeMembership, persist, UNTITLED_GROUP_TITLE, canvasPoint, dissolveEmptied). The gui08 before and after logs for 21-02 are cmp-equal | closed |
| T-21-04 | Tampering | INTERNAL-APIS.md line references drifting after a PowerBrowserAPI edit | medium | mitigate | 0b6ae33 numstat on powerbrowser/shell/PowerBrowserAPI.sys.mjs is `1 1`, a comment word (tray to canvas). It is the only phase-21 commit under powerbrowser/. `check-internals-boundary.sh --catalogue` PASS re-run at audit | closed |
| T-21-05 | Info disclosure | an internal identifier inside a painted string | medium | mitigate | `internalsOf` runs over `new Set(derived)`, the raw strings (scripts/verify-gui08-panorama-copy.mjs:160-163). `normaliseSlots` is applied only to the set diff (:153). gui08-panorama-copy PASS ("no internals in copy") re-run at audit | closed |
| T-21-06 | Repudiation | a copy gate that passes without reading the spec | high | mitigate | Spec-side plants: Done row deleted, Retry reworded, heading stripped, Retired copy heading stripped (verify-gui08-panorama-copy.mjs:251, :253, :255, :259). Separate ZERO failures for the contract (:149-151) and the retired table (:165-167). The spec is excluded from the retired search (:172). Self-test PASS (9 plants) re-run at audit | closed |
| T-21-07 | Repudiation | a geometry gate that passes by substring accident or without reading the spec | high | mitigate | Rule-scoped CSS through `ruleBodies` (ui-spec.mjs:114-122), planted by "CSS out of its rule" (verify-gui08-canvas-geometry.mjs:373). Spec plants 4, 6 and 12 (:370, :372, :378). Spec-named prefix on every geometryDiff failure (:174). Red logs predate their commits: geometry-red-21-04-t1.log 16:51:53 before 101b383 at 16:52:39, and geometry-red-21-04-t2.log 16:53:50 before 9db6371 at 16:54:37 | closed (R-2) |
| T-21-08 | DoS | the zero-group canvas hiding every tab, or arrow keys stranded outside a box | medium | mitigate | R4: the zero-group branch calls `this.renderLoose()` (theia/extensions/modes/src/browser/organising-widget.ts:493-500). A5: `moveCardFocus` scopes is-loose and `.pb-org-box-cards, .pb-org-expand-cards` (:1863-1874). Source-shape clauses (verify-gui08-canvas-geometry.mjs:195-203, :301-307) with plants 10 and 11 (:376, :377). The live row PASS (logs/loose-cards-21-05.log, 17:08:28) ran after the rebuild (build-21-05.log 17:08:00), which followed 81c5952 (17:07:45). The clipping found live is fixed by `display: flow-root` (modes.css:230-231) and guarded by the in-host assertion (verify-gui08-loose-cards-live.mjs:52-57, :109, :182) | closed (R-3) |
| T-21-09 | DoS | a live run taking port 3000 or killing a sidecar from this checkout | medium | mitigate | The driver defaults and exports PB_VERIFY_PORT=3939 (scripts/verify-platform.sh:62-63). The binary-hosted sidecar binds port 0 on 127.0.0.1 before its first swap (powerbrowser/shell/TheiaService.sys.mjs:676-677). scripts/lib/ng-a-live.mjs is unchanged in the phase. No phase-21 diff under scripts/ adds kill, pkill or a 3000 literal. The pgrep guard and "stop and ask" are 21-05-PLAN.md:81-82, and 21-05-SUMMARY states they held | closed (R-4) |
| T-21-10 | Tampering | a hand-typed or truncated baseline hiding a real red | high | mitigate | docs/non-gui/quick-baseline.txt is 0 bytes (41a1975 deletes the four gui08 lines). quick-21-05-base.log (17:10:45, before the commit at 17:10:56) and quick-21-05.log (17:11:56, after it) each have 132 PASS and 0 FAIL summary rows. fail-21-05.log is cmp-equal to the baseline. The two logs differ only in random self-test fixture hashes (verify-extension-pins). Commits after 41a1975 are docs only | closed (R-6) |
| T-21-11 | Repudiation | a live probe that can never fail | medium | mitigate | Positive control in the same query pass: `trayProbe` counts `[class*="pb-org-card"]` beside the tray count (verify-gui08-loose-cards-live.mjs:30-33), required > 0 (:111). Three in-run page faults (renderLoose stubbed, moveCardFocus stubbed, tray element appended) re-run the shared probes and must go red (:130-160), with a restore check (:161-162). The red run (loose-cards-red-21-05.log) shows the in-host assertion failing on the pre-fix bundle | closed (R-5) |
| T-21-SC | Tampering | npm/pip/cargo installs (plans 21-01 to 21-05) | low | accept | AR-21-01. `git diff b660c36 HEAD` over `*.lock`, `*package.json`, `*requirements*.txt`, `*Cargo.toml`, `*pyproject.toml`, flake.nix and flake.lock is empty. The last theia/yarn.lock commit is 2700e4c (Phase 19). ui-spec.mjs has no imports, and the gui08 checks import only `node:` built-ins and ./lib | closed |

*Status: open · closed · open — below high threshold (non-blocking)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-21-01 | T-21-SC | No phase-21 plan adds a package. The modes and sidecar builds in 21-02, 21-04 and 21-05 use the committed lock audited in Phase 19 | plans 21-01 to 21-05 (autonomous run) | 2026-10-17 |

---

## Residual Notes

None of these reopens a threat at L1.

- R-1 (T-21-01): no committed self-test plant strips the Canvas Geometry or Typography heading. The ZERO guards (ui-spec.mjs:180-181; verify-gui08-canvas-geometry.mjs:273-274) were planted only by 21-01's one-shot verify, and again in memory at this audit. 21-04-SUMMARY says the geometry self-test has "4 plants on the spec". PLANTS has 3 on SPEC_REL (4, 6, 12), which matches the threat register. The 4-spec-plant count belongs to the copy self-test.
- R-2 (T-21-07): font sizes are compared over the whole comment-stripped sheet, not per rule (21-04 decision). A size moved between rules does not go red. Only weights are rule-scoped. The red logs are git-ignored (`*.log`, .gitignore:53), so their order before the commits rests on file mtimes on this host.
- R-3 (T-21-08): `display: flow-root` on `.pb-org-canvas` has no `--quick` guard. gui08-canvas-geometry derives px rows only, so removing it would go red only in the full-tier gui08-loose-cards-live row. Expanded-stack keyboard reach has a static shape clause and a HELD-OUT backstop; the live row drives ArrowRight across loose cards only.
- R-4 (T-21-09): the pgrep guard and "never kill" are procedure. Their only evidence is the 21-05-SUMMARY statement, with no logged pgrep output. The structural protection is the 3939 default and the port-0 sidecar bind.
- R-5 (T-21-11): detail lines print even when an assertion fails (21-05 Deferred Issues). The FAIL lines and the exit code are authoritative. The row has no `--self-test`; the in-run controls stand in, as for the other ng-a-live rows.
- R-6 (T-21-10): the baseline's derivation evidence (quick-21-05-base.log, quick-21-05.log, fail-21-05.log) is git-ignored and exists on this host only.

---

## Security Audit

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-10-17 | 12 | 12 | 0 | gsd-security-auditor at HEAD 12c5916 (L1 grep-depth; static re-runs of gui08-panorama-copy, gui08-canvas-geometry and both self-tests, check-internals-boundary --catalogue, in-memory ZERO-row probes of ui-spec.mjs; phase-gate silent; no verify-platform.sh, no live checks, no builds) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-10-17.
