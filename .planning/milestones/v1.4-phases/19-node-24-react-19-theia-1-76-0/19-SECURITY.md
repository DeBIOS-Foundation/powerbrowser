---
phase: "19"
slug: "node-24-react-19-theia-1-76-0"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-10-17"
---

# Phase 19 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| npm registry to `theia/node_modules` | React 19.2.8 and the @theia 1.76.0 set, plus their transitive closure | Dependency tarballs |
| Nix store to the theia dev shell | The locked nixpkgs rev supplies node, yarn, node-gyp | Toolchain binaries |
| Browser to sidecar backend | The token gate under Node 24, React 19 and 1.76's token lifecycle (#17762) | Connection token |
| Sidecar to the network | New 1.76 egress (AI model discovery, @theia/telemetry, getting-started) | Outbound requests |
| Frontend errors to telemetry capture | React 19 reports render errors differently | Error reports |
| Fixture directory to the repo | The carried-over profile must never be committed | Profile state |
| Driver output to baseline / FAIL set | A hand-edited file could hide a new red | Check results |
| Agent to ledger | Removal, lock and decisions are Chris's | Ledger state |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-19-01 | Info disclosure | carried-over fixture | low | mitigate | verify-first-boot-surface.mjs:355 refuses an in-repo dir, :356 a non-empty one; fixture outside the repo, untracked | closed |
| T-19-02 | Repudiation | vacuous live assertions | medium | mitigate | getting-started positive control, missing-counter FAIL, forced ForcedRenderError must reach logError and the counter; self-test 13 plants red | closed |
| T-19-03 | DoS | another session's sidecar on theia/ | medium | mitigate | pgrep clean before each long run; port 3000 untouched (19-01-SUMMARY) | closed |
| T-19-04 | Tampering | single-copy walk | medium | mitigate | lstat walk never follows symlinks, recurses nested node_modules; self-test plants nested and symlinked duplicates | closed |
| T-19-05 | Repudiation | NG-086 check on an empty install | medium | mitigate | empty walk and missing semver are FAILs; `--root <empty dir>` exits 1 | closed |
| T-19-06 | Tampering | gui07 perspective accounting | medium | mitigate | upstream ids feed the surplus side only; unaccounted-plant self-test red | closed |
| T-19-07 | Tampering | flake.lock / nixpkgs input | medium | mitigate | `git diff 446b395 HEAD -- flake.lock` empty | closed |
| T-19-08 | Spoofing | token gate at Node 24 | high | mitigate | side02-token-negative/positive PASS (logs/live-19-03.log) | closed |
| T-19-09 | DoS | drivelist.node ABI | medium | mitigate | nodedir nodejs-slim-24.19.0 (logs/drivelist-19-05.log); drivelist.node present | closed |
| T-19-10 | Tampering | duplicate React / inversify | medium | mitigate | single-copy-deps PASS, a `--quick` row | closed |
| T-19-11 | Spoofing | token gate at React 19 | high | mitigate | side02-token-negative/positive PASS (logs/live-19-04.log) | closed |
| T-19-12 | Repudiation | React 19 render errors bypassing telemetry | medium | mitigate | forced ForcedRenderError reached logError (live-19-04); ng067 PASS | closed |
| T-19-13 | Info disclosure | Welcome page at first boot | medium | mitigate | `workbench.startupEditor: "none"` (theia/applications/browser/package.json:21); first-boot-surface fresh and carried PASS | closed |
| T-19-14 | Info disclosure | telemetry level default | high | mitigate | full property, default `off` (telemetry-preferences.ts:43, :65-70); ng067 off sends nothing; Chris: "telemetry ok (Recommended)" | closed |
| T-19-15 | Tampering | Theia core during the re-pin | high | mitigate | only pins and own extensions move in 2700e4c; no tracked node_modules; diff-theia-core PASS | closed |
| T-19-16 | Repudiation | ledger bypassing Chris's removal | medium | mitigate | NG-082 dropped by Chris (0d4f2c9); agent ran only add/set/set-status/record-fail with explicit `--id` | closed |
| T-19-17 | Spoofing | token gate at 1.76 | high | mitigate | side02-token-negative/positive PASS in the full run at dfef881 | closed |
| T-19-18 | Info disclosure | new upstream egress at 1.76 | high | mitigate | ng069-sidecar-egress PASS; theia-endpoints PASS in `--quick`; ng067 PASS | closed |
| T-19-19 | Repudiation | hand-typed baseline / FAIL set | medium | mitigate | full-run FAIL labels set-equal 19-FAILSET-1.76.txt (5, all owned 153.5 rows); quick FAIL labels set-equal docs/non-gui/quick-baseline.txt (4) | closed |
| T-19-20 | Tampering | Theia core edited by the re-pin | high | mitigate | diff-theia-core PASS "zero changes inside @theia/*" (full run) | closed |
| T-19-21 | Tampering | check lock by agent / after file change | high | mitigate | NG-086 check file has one commit (85d80a5); Chris ran lock-checks at e0fbf8b; checksums ok | closed |
| T-19-22 | Tampering | ledger commit sweeping foreign files | medium | mitigate | 0d4f2c9, 02864f8, e0fbf8b, 5db8a80 each hold exactly the three ledger files | closed |
| T-19-23 | Repudiation | telemetry decision without Chris's words | medium | mitigate | 19-07-SUMMARY quotes "telemetry ok (Recommended)" | closed |
| T-19-SC | Tampering | npm installs (React 19.2.8 set, @theia 1.76.0 set) | high | mitigate | Chris's "approved" before any install; registry probe and provenance; "Ignored scripts due to flag" in every install log; exact pins; no @theia stanza moved in 5800706; no new non-@theia package in 2700e4c; frozen reinstall lock `cmp` identical | closed |
| T-19-NR | DoS | packaged Node runtime pin (v22.23.2) vs Theia 1.76 `engines.node >=24` | medium | transfer | Gap plan `/gsd-plan-phase 19 --gaps`: Chris supplies a GPG-verified v24.x sha256 at a blocking-human checkpoint; node-runtime.json unchanged in phase 19; ng063-packaged-launch PASS on v22 | closed — 19-08: 160652d pins v24.19.0 (sha from Chris's gpgv-verified SHASUMS256.txt, key 5BE8A3F6…B168D356; independent download hash equal); ng063/ng065/ng072 PASS on the rebuilt package; node-major-agreement in --quick (a42c962) |

*Status: open · closed · open — below high threshold (non-blocking)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-19-01 | T-19-SC | In plans 19-01, 19-02, 19-03 and 19-07 no package is added; 19-03's only install is smoke-theia's frozen `--ignore-scripts` install against the unchanged lock | plans 19-01, 19-02, 19-03, 19-07 (autonomous run) | 2026-10-17 |

T-19-NR was not an accepted risk. It was transferred to gap plan 19-08 and closed there. Residual (T-19-26): Chris did not report the optional README fingerprint cross-check of the release keyring.

---

## Security Audit

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-10-17 | 25 | 24 | 1 (non-blocking) | gsd-security-auditor (L1 grep-depth plus re-run static checks and re-derived set equality) |
| 2026-10-17 | 25 | 25 | 0 | orchestrator, after gap plan 19-08 (evidence in 19-08-SUMMARY.md) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-10-17. T-19-NR closed by gap plan 19-08.
