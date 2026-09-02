---
status: diagnosed
phase: 02-configuration-manifest-and-generator-core
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md, 02-04-SUMMARY.md, 02-05-SUMMARY.md, 02-06-SUMMARY.md]
started: 2026-09-02T00:00:00Z
updated: 2026-09-02T00:00:00Z
executed_by: claude (operator could not run the checks; every command below was run live in the working tree)
---

## Current Test

[testing complete]

## Tests

### 1. Generate the Whole Build Surface from the Manifest
expected: `node scripts/generate.mjs` exits 0, writes 5 files under `generated/`, and echoes exactly four sorted "default applied" lines with nothing under `identity.` or `legal.`.
result: pass
evidence: "exit 0; PASS line '5 file(s) written ... 4 default(s) applied'; generated/{.mozconfig, branding/{dev,release}/configure.sh, powerbrowser{,-release}.desktop}; the four echoed keys were product.description, product.homepage, theia.default_theme, variants — none under identity./legal."

### 2. Byte-Identity with the Hand-Written Phase 1 Files
expected: `--only generated-byte-identity` passes, and passes even after `rm -rf generated/` — it needs no prior generate.
result: pass
evidence: "PASS with generated/ present and again after rm -rf generated/; the gate emits its comparand into mkdtemp and never recreates generated/. NOTE: this holds at THIS checkout path only — see test 11."

### 3. Rebrand Round-Trip — One Value Changed by Hand
expected: Change one manifest value, regenerate, see it land; restore and the gate returns to green.
result: pass
evidence: "identity.display_name 'Power Browser' -> 'Acme Navigator' propagated to both configure.sh (line 9, with and without the ' Dev' suffix) and both .desktop (line 6); gate went red naming all four paths with first-differing line numbers; restore -> green; configuration.toml left unmodified."
note: "First attempt used theia.default_theme, which has no Phase 2 emitter (it is a Phase 4 surface). Not a defect — the key is carried and echoed correctly, it simply reaches no build surface yet."

### 4. --check Tells Fresh from Stale from Absent
expected: fresh -> exit 0 PASS; stale -> exit 1 naming the path and first differing line; absent -> its own distinct message that does not list the five target paths.
result: pass
evidence: "fresh: exit 0, '--check PASS -- all 5 generated file(s) match configuration.toml'. stale (stray byte appended): exit 1, 'generated/.mozconfig -- differs, from line 17' plus the regenerate next step. absent: distinct SKIP message, none of the five paths listed."
note: "The absent case exits 0 as a SKIP, not 1. My expectation was copied from 02-04-SUMMARY.md, which is STALE — 02-REVIEW-FIX.md:98 records the change, and scripts/generate.mjs:961-981 carries a 15-line comment explaining it (a gate red on every fresh clone for a non-defect is a gate its readers learn to skip). The code is correct; the SUMMARY text is not. Logged as a documentation gap, not a code gap."

### 5. Bad Settings Are Refused Clearly, and Nothing Is Written
expected: misspelled section reported as an unknown setting naming the misspelling, not as a missing key; blank required value refused naming the key; a space in binary_name refused with the rule in words and a corrected example; multiple faults all reported; nothing written.
result: pass
evidence: "[identiy] -> five 'unknown setting identiy.*' lines, and NOT the missing-key phrase. display_name = '   ' -> 'identity.display_name is not set' (the unset test is a trim, not an absence check). binary_name = 'two words' -> names the key, quotes the value, states 'lowercase letters, digits and hyphens only; 2 to 32 characters; must start with a letter' and offers 'acme-browser'. Three faults in one run -> all three reported before exit. [__proto__] refused by name; ({}).polluted === undefined afterwards. generated/.mozconfig md5 unchanged across every rejection."
note: "My first harness run reported a false negative here: String.replace with a string argument hit the FIRST '[identity]' in the file, which is inside a comment at line 17, so the section header was never mutated. Re-run anchored with /^\\[identity\\]$/m."

### 6. Failure Messages Carry No Internals
expected: no stack frame, no `node:` specifier, no absolute path to this checkout, no parser class name or caret diagram; a malformed manifest reported by file and line only.
result: pass
evidence: "Across all captured failure copy (unknown-setting, unset, pattern, reserved-name, malformed, and all 12 self-test cases): 0 stack frames, 0 'node:' specifiers, 0 occurrences of /home/chris. Malformed manifest: 'configuration.toml could not be read as a settings file (line 44, column 2)' plus two plain-language shape examples and a next step — no parser class, no caret diagram."

### 7. Required Keys Are Not Inheritable
expected: a downstream omitting one required key hard-fails naming that key rather than silently inheriting Power Browser's value.
result: pass
evidence: "Built a genuine two-layer call (defaults = Power Browser's manifest, downstream = an 'Acme' manifest). Complete Acme downstream: 0 failures, identity.binary_name resolves to 'acme-navigator', and exactly the three cosmetic keys inherit (product.description, product.homepage, theia.default_theme). Acme downstream omitting identity.binary_name: hard-fails naming identity.binary_name, and the resolved value is undefined — Power Browser's 'powerbrowser' is NOT inherited. This is the core CFG-01/CFG-02 promise and it holds."
note: "The downstream-layer failure copy says 'Open configuration.toml' even when the offending file is the downstream manifest. Harmless in Phase 2 (no --config flag exists yet, so no user can reach this path), but it will read wrong once a downstream CLI surface lands."

### 8. Generator Self-Test — Planted Faults
expected: `--self-test` exits 0 with a counted PASS line, each planted fault red naming its drift, and the five tracked files never edited.
result: pass
evidence: "exit 0, 'PASS -- 12 planted faults all behaved as pinned'. 12 cases, not the 9 documented in 02-06-SUMMARY — the extra three are [[variants]] cases added by the WR-08 review fix (missing required setting, duplicate id, unused id). More coverage than documented, not less. git status on the five tracked files: clean."

### 9. Byte-Identity Gate Self-Test — Seven Planted Faults
expected: five one-byte emitter drifts, one surplus target, one deleted target, each red naming the path; faults planted in memory only.
result: pass
evidence: "PASS -- 7 planted faults all went red naming the drift, including the surplus 'powerbrowser/planted-surplus.mozconfig'. git status on the five tracked files after the run: clean."

### 10. The Commit Gate Is Still Green
expected: `--quick` passes with every row green, including the four generator rows; no sibling driver exists.
result: pass
evidence: "exit 0, 31/31 rows PASS, including generated-byte-identity, generated-byte-identity-self-test, generate-check, generate-self-test, plus vendored-parser-digest{,-self-test} added by review fixes. Run in seconds, no build. `ls scripts/verify-phase-*.sh` finds nothing."

### 11. Fresh-Clone Property — No Install, No Network
expected: on a clean clone with no `node_modules/`, no root `package.json` and no network, `scripts/verify-platform.sh --quick` runs to completion green.
result: issue
reported: "On a genuine fresh clone (git clone --no-hardlinks to a scratch path; no node_modules, no package.json, no generated/, no upstream/), --quick exits 1: generated-byte-identity and generated-byte-identity-self-test both FAIL. The failure is a non-defect — the two .desktop emitters build absolute Exec=/Icon= paths from REPO_ROOT, while the tracked .desktop files contain this machine's path, so the gate can only be green at /home/chris/coding/Power-Browser."
severity: major
gap_id: G-02-11

### 12. Generated Files Say So, and the Rebrand Surface Is Two Places
expected: both tracked configure.sh carry a header pointing at configuration.toml, the re-run command, and the check label; configuration.toml + brand/ are the rebrand surface; preflight green; generated/ ignored and untracked.
result: pass
evidence: "Both files carry a 4-line header at lines 5-8 (after the MPL boilerplate) naming configuration.toml, the re-run command, the copy-out step, and 'A disagreement reddens: scripts/verify-platform.sh --only generated-byte-identity'. It honestly states 'Phase 2 does not write it in place.' brand/ holds mark.svg; configuration.toml present; branding-preflight PASS; .gitignore:31 '/generated/' matches and 0 files tracked under it."

## Summary

total: 12
passed: 11
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- gap_id: G-02-11
  truth: "On a clean clone with no node_modules and no network, scripts/verify-platform.sh --quick runs to completion green"
  status: failed
  reason: "User reported: on a genuine fresh clone --quick exits 1; generated-byte-identity and generated-byte-identity-self-test both FAIL for a non-defect"
  severity: major
  test: 11
  root_cause: "emitDesktopEntry builds absolute Exec= and Icon= paths from REPO_ROOT (scripts/generate.mjs:65, derived from import.meta.url). The two TRACKED .desktop files were written by Phase 1 containing this checkout's absolute path, /home/chris/coding/Power-Browser. generated-byte-identity compares emitter output against those tracked bytes, so the comparison can only succeed when the repo sits at that exact path. Any other location — a fresh clone, a second developer, a CI runner — makes the gate red without anything being wrong. This is the same class of bug 02-05 already fixed once for `git check-ignore` on an absent generated/, and it is the exact failure mode 02-04/02-05/02-06 each name as fatal to a gate's credibility. 02-04-SUMMARY.md's claim that 'the emitted bytes do not depend on where the generator was invoked from' is true for cwd but false for repo location."
  artifacts:
    - path: "scripts/generate.mjs"
      issue: "emitDesktopEntry embeds REPO_ROOT-derived absolute paths into bytes that a byte-identity gate then compares against a checkout-specific tracked file"
    - path: "powerbrowser/powerbrowser.desktop"
      issue: "tracked comparand hard-codes /home/chris/coding/Power-Browser at lines 7-8"
    - path: "powerbrowser/powerbrowser-release.desktop"
      issue: "tracked comparand hard-codes /home/chris/coding/Power-Browser at lines 7-8"
    - path: ".github/workflows/rebase-upstream.yml"
      issue: "runs verify-generated-identity.mjs at lines 110 and 132 on a fresh clone at a runner path — exposed to the same failure"
  missing:
    - "Decide the contract: either the .desktop targets are excluded from byte-identity comparison (they are inherently machine-specific), or the comparison normalises the repo-root prefix on both sides before comparing, or the tracked .desktop files stop being the comparand and become generated-only artifacts."
    - "Whichever is chosen, add a self-test case that plants a DIFFERENT repo root and requires the gate to stay green — the current 7 cases all run at the one path where the bug is invisible."
    - "Correct 02-04-SUMMARY.md's claim that emitted bytes do not depend on where the generator was invoked from."
  debug_session: "diagnosed inline during UAT — root cause reproduced and confirmed by direct command execution, no debug agent required"

## Documentation Drift (not code gaps)

- test: 4
  file: ".planning/phases/02-configuration-manifest-and-generator-core/02-04-SUMMARY.md"
  says: "`generated/` absent -> exit 1, its own single message"
  actual: "exit 0, a --check SKIP message — changed deliberately per 02-REVIEW-FIX.md:98"
- test: 8
  file: ".planning/phases/02-configuration-manifest-and-generator-core/02-06-SUMMARY.md"
  says: "nine --self-test cases"
  actual: "twelve — three [[variants]] cases were added by the WR-08 review fix"
