---
phase: "20"
slug: "non-gui-gaps"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-10-17"
---

# Phase 20 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Generator to the user's session bus | inkscape children inherit the user's environment | Environment (DBUS_SESSION_BUS_ADDRESS) |
| Harness to the shared generated/ tree | Other checks and other checkouts read generated/ | Generated files |
| Planning archive to verify scripts | Fixture and record paths move at each milestone closeout | Path literals |
| Theia frontend (web content) to the chrome actor | Untrusted CustomEvents cross into the PowerBrowserGroup child; `wantUntrusted: true` admits them, the `matches` pin and chrome-side validation wall them | Group requests and replies |
| Agent to ledger | The agent adds, points, fails and closes; acceptance and the lock are Chris's | Ledger state |
| Shell command text to the ledger hook | Operators or forbidden subcommands are blocked before they run | Bash command text |
| npm registry and yarn cache to the scratch clone | The clone installs the committed lock | Dependency tarballs |
| Plant mode to tracked files | P1-P3 rewrite tracked files and clean every lib/ | Source files, build output |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-20-01 | Elevation of privilege | inkscape child joining the session bus | low | mitigate | `RASTER_ENV` sets `DBUS_SESSION_BUS_ADDRESS: 'disabled:'` (scripts/generate.mjs:2920); the one `spawnSync('inkscape'` passes `env: RASTER_ENV` (:2985-2990); `rasterBusFailures` (:2964-2972) and three concurrent-raster plants (:5886-5911) go red on a missing key, a host address, or a spawn site without RASTER_ENV; ccf792d | closed |
| T-20-02 | Tampering | inherited variable redirecting generate output | medium | mitigate | `--out` is read from argv only (generate.mjs:165-186); `--check --out` and `--self-test --out` exit 1 (:181-184, re-run at audit); `--check` returns before the out path is used (:6038-6042); verify-platform.sh:56 unsets an inherited PB_CONFIG_DIR | closed |
| T-20-03 | Repudiation | harness rewriting a tree other checks read | medium | mitigate | `runGenerate` throws without an out dir (scripts/verify-downstream-fixture.mjs:183-186); its only generate spawn passes `--out` (:191); the other spawn runs in a copied tree (:693); plants `shared-tree-refused` (:680) and `out-dir-isolation` (:701-704); no `REPO_ROOT, 'generated'` in the harness; e63ad9d | closed |
| T-20-04 | Repudiation | check passing on a fixture it can no longer find | medium | mitigate | `findUnresolved` fails on `n !== 1` and on zero references (scripts/verify-planning-paths.mjs:51-71); 743bb59 deletes the soak LIVE/ARCHIVED fallback and both verify-platform.sh fallback blocks (:287-299 are now bare globs); `git grep '.planning/phases/' -- scripts .github` is empty; planning-paths PASS (12 references) and self-test PASS (7 cases) re-run at audit; rows at verify-platform.sh:4595-4596 | closed (R-1) |
| T-20-05 | Tampering | planning-paths seeing its own plant literals | low | mitigate | plant paths assembled at runtime by `p`/`live`/`arch` (verify-planning-paths.mjs:73-76); a grep of the file for a concrete planning path finds nothing | closed |
| T-20-06 | DoS | group write channel silently dead | high | mitigate | D1 wantUntrusted (scripts/verify-group-channel.mjs:139-151); D2 child scheme derived from upstream DesktopActorRegistry, plus jar alias and entry (:157-185); D4 bubbles and document dispatch (:231-273); product today: PowerBrowserAPI.sys.mjs:2196 `wantUntrusted: true`, :255 `resource://`; `--quick` rows at verify-platform.sh:3768-3769; group-channel PASS and self-test "12 plants red" re-run at audit; fd29ac9, 7f6f732 | closed (R-2) |
| T-20-07 | Info disclosure | reply delivered as a chrome-compartment object | medium | mitigate | D5 requires `new win.CustomEvent` with a `win.wrappedJSObject.JSON.parse(JSON.stringify(` detail on every child event (verify-group-channel.mjs:188-204); both product sites carry it (powerbrowser/shell/GroupActorChild.sys.mjs:117, :136); plant 8 (:341-344) goes red | closed |
| T-20-08 | Tampering | the check widening what the registration admits | low | accept | AR-20-02. The check has no write call; its only spawn is a `git ls-files` read (verify-group-channel.mjs:298). No phase-20 commit touches powerbrowser/, theia/extensions/, upstream/ or patches/; the two product commits in the range, 0b6ae33 and c5812c9, are Phase 21 | closed |
| T-20-09 | Repudiation | row text recorded as Chris's without his words | medium | mitigate | blocking-human checkpoint (20-04-PLAN.md:145); 20-04-SUMMARY quotes "accept"; check files committed (b3e8883, 22:36:29Z) before the first `add` (ledger v379, 22:36:42Z); one commit per check file | closed |
| T-20-10 | Tampering | recorded red produced by a broken instrument | medium | mitigate | `Instrument` gives exit 2 on a git show failure (verify-ng-087-loose-position-across-restart.mjs:144-146, :227-230; verify-ng-088-group-order-across-restart.mjs:131, :212-215); a real red gives exit 1; ledger/history/log.jsonl:382 and :388 record "unknown kind setTabPosition" and "unknown kind setGroupOrder" | closed (R-3) |
| T-20-11 | Tampering | check file changed between record-fail and the lock | high | mitigate | each NG-087/088 check file has exactly one commit (b3e8883) and none after facaba2; the sha256 of both files equals check_locks (ledger/REQUIREMENTS.json:1210-1211); phase-gate.py silent at audit | closed |
| T-20-12 | Tampering | ledger commit sweeping foreign staged files | medium | mitigate | d8ddcf7 and 44e44fb each hold exactly ledger/REQUIREMENTS.json, ledger/checksums.sha256 and ledger/history/log.jsonl | closed |
| T-20-13 | Tampering | install scripts running in the clone | medium | mitigate | .github/workflows/verify.yml:83 runs `yarn install --ignore-scripts --frozen-lockfile`; the row reads that run: value at check time (verify-theia-fresh-clone-build.sh:41-46, :48-57); no lock or manifest changed in 8529bfa..HEAD (last theia/yarn.lock commit is 2700e4c, 19-05) | closed (R-4) |
| T-20-14 | DoS | plant mode in the main checkout cleaning a live sidecar's lib/ | high | mitigate | `run_plant` exits 3 unless pwd is `$TMPDIR/fresh-clone-verify-*/clone` and the script is the clone's own copy (verify-theia-fresh-clone-build.sh:108-118); the clone prefix comes from scripts/fresh-clone-verify.py:26; `plant()` restores bytes with `cp -p`, never git (:74-106); re-run at audit from the repo root: REFUSED, rc 3 | closed |
| T-20-15 | Tampering | check lock re-derived by the agent, or after a check file changed | high | mitigate | blocking-human checkpoint (20-05-PLAN.md:195); lock-checks at facaba2 is ledger v391 (22:53:35Z), after the facaba2 commit (22:46:05Z); 20-05-SUMMARY quotes Chris's pasted command; the agent's ledger ops in phase 20 (v379-v390) are add, set-status, set and check-fail only; locked hashes equal the files; phase-gate silent | closed (R-5) |
| T-20-16 | Repudiation | stale gap record claiming a fix with non-resolving hashes | low | mitigate | G-14.1.1-9 closed_by (14.1.1-UAT.md:655): cd8c4c1, b991b2d, 32b144d, 4ce6f34, b528590; G-14.1.1-10 (:670): fd29ac9, 7f6f732; all pass `git cat-file -e`, as does every hash facaba2 adds | closed |
| T-20-SC | Tampering | npm/pip/cargo installs (plans 20-01 to 20-05) | low | accept | AR-20-01. `git diff 8529bfa HEAD` over `*.lock`, `*package.json`, `*requirements*.txt`, `*Cargo.toml`, `*pyproject.toml` and flake.nix is empty | closed |

*Status: open · closed · open — below high threshold (non-blocking)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-20-01 | T-20-SC | No package is added in any phase-20 plan. 20-05's clone runs the frozen `--ignore-scripts` install of the lock audited in Phase 19 | plans 20-01 to 20-05 (autonomous run) | 2026-10-17 |
| AR-20-02 | T-20-08 | group-channel only reads; it asserts the registration shape and changes no product code | plan 20-03 (autonomous run) | 2026-10-17 |

---

## Residual Notes

None of these reopens a threat at L1.

- R-1 (T-20-04): plan 20-02 kept `resolveRecord`'s archive scan on purpose (20-02-PLAN.md:142; verify-strip-spike-verdict.mjs:76-97, verify-dependent-window-content.mjs:60-81). It fails on zero or several copies, and the literal it starts from is under planning-paths. planning-paths does not see split `join()` paths, `v*` version globs or leading phase globs (20-REVIEW.md WR-05).
- R-2 (T-20-06): D4 and D6 count a dispatch site only through a quoted literal or a same-file `const`. A file that imports GROUP_REQUEST_EVENT or GROUP_RESPONSE_EVENT would be skipped (WR-03). No file imports them today. `stripComments` can drop code after a `/*` inside a line comment or string (WR-04). The runtime proof is still gui02-web-tab-live.
- R-3 (T-20-10): a non-Instrument exception also exits 1 (verify-ng-087…:231-232). The recorded unknown-kind text is what attributes the red. WR-06, WR-07 and WR-08 are in locked files: a fix needs a new commit and Chris's re-lock.
- R-4 (T-20-13): the row does not check that the extracted command contains `--ignore-scripts`. If a verify.yml edit drops the flag, the clone runs install scripts and the row does not go red.
- R-5 (T-20-15): ledger history records no actor. That Chris ran lock-checks rests on 20-05-SUMMARY and the 44e44fb commit message.
- R-6 (T-20-01): the guard matches only `spawnSync('inkscape'` (IN-01). The self-test's own `spawn('inkscape'` inherits RASTER_ENV from its parent.
- R-7 (T-20-02): `--out ''` or `--out .` writes into the cwd (WR-02). The only caller, `runGenerate`, always passes a mkdtemp path.

---

## Security Audit

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-10-17 | 17 | 17 | 0 | gsd-security-auditor at HEAD 2f1e60d (L1 grep-depth; static re-runs of group-channel, planning-paths and both self-tests, the plant-mode refusal and the `--out` refusals; no verify-platform.sh, no live checks) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-10-17.
