---
status: complete
phase: 02-configuration-manifest-and-generator-core
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md, 02-04-SUMMARY.md, 02-05-SUMMARY.md, 02-06-SUMMARY.md, 02-07-SUMMARY.md, 02-08-SUMMARY.md, 02-09-SUMMARY.md]
started: 2026-09-02T00:00:00Z
updated: 2026-09-04T00:00:00Z
executed_by: claude (operator could not run the checks; every command below was run live in the working tree)
---

## Current Test

[testing complete]

## Deferred Follow-Ups

- test: 13-17 confirmation
  idea: "Human confirmation of gap-closure (desktop entries honest at any checkout) deferred — user declined to spot-check, signed off as to-do later (if ever)"
  deferred_at: 2026-09-04

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

### 13. Tracked .desktop entries carry the install token (02-08 D1)
expected: Tracked .desktop entries carry @POWERBROWSER_REPO_ROOT@ instead of a checkout path; byte-identity exits 0 at a relocated checkout
result: pass
source: automated
coverage_id: 02-08/D1

### 14. Token-based preflight, green relocated (02-08 D2)
expected: Preflight builds wantExec/wantIcon from the token and rejects absolute paths outside it; exits 0 at a relocated checkout
result: pass
source: automated
coverage_id: 02-08/D2

### 15. repo_root gone from inventory (02-08 D3)
expected: repo_root gone from inventory and preflight; coincidental zero-count row byte-unchanged
result: pass
source: automated
coverage_id: 02-08/D3

### 16. Repo-location correction on the record (02-09 D1)
expected: 02-04-SUMMARY.md carries an additive repo-location correction naming G-02-11 and option-4-placeholder; original claim byte-unchanged
result: pass
source: automated
coverage_id: 02-09/D1

### 17. Verification report honest about both gaps (02-09 D2)
expected: 02-VERIFICATION.md reports passed-with-corrections, names both gaps, explains the single-checkout blindness, and keeps all five requirement IDs
result: pass
source: automated
coverage_id: 02-09/D2

## Summary

total: 17
passed: 16
issues: 1
note_issues: "test 11 only — both its gaps (G-02-11, G-02-12) resolved by 02-08-PLAN.md; human re-confirmation deferred, see Deferred Follow-Ups"
pending: 0
skipped: 0
blocked: 0
automated: 5

## Gaps

- gap_id: G-02-11
  truth: "On a clean clone with no node_modules and no network, scripts/verify-platform.sh --quick runs to completion green"
  status: resolved
  resolved_by: 02-08-PLAN.md
  resolved_at: 2026-09-04
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

- gap_id: G-02-12
  truth: "A gate that checks the tracked .desktop entries catches one that is wrong for the checkout it is in"
  status: resolved
  resolved_by: 02-08-PLAN.md
  resolved_at: 2026-09-04
  reason: "Found while fixing G-02-11: verify-branding-preflight PASSES at a relocated clone while blessing Exec=/home/chris/coding/Power-Browser/objdir/dist/bin/powerbrowser %u, a path that does not exist there."
  severity: major
  test: 11
  root_cause: "scripts/verify-branding-preflight.mjs:256,260 builds wantExec/wantIcon from exp.repo_root, which is the hand-authored absolute literal at inventory/brand-tokens.json:105. The tracked .desktop files contain that same literal, so both sides of the comparison read the same stale string and the check is a tautology with respect to location. It can never catch a desktop entry that is wrong for the actual checkout -- which is Pitfall 4, the exact failure the row exists to prevent (the entry silently does nothing when clicked). This is the MIRROR of G-02-11: byte-identity is a false POSITIVE everywhere but this machine, preflight is a false NEGATIVE everywhere including where the file is broken. Any fix must address both directions or it leaves one of them standing."
  artifacts:
    - path: "scripts/verify-branding-preflight.mjs"
      issue: "wantExec/wantIcon derived from a hand-kept absolute path rather than from where the repo actually is"
    - path: "inventory/brand-tokens.json"
      issue: "repo_root at line 105 is a machine fact hand-kept in the expectation source; CLAUDE.md forbids hand-kept expectation lists"
  missing:
    - "Decide whether repo_root becomes live-derived (restores the Pitfall-4 check, but then a tracked .desktop is honestly red at any other checkout) or whether the tracked entries stop carrying an absolute path at all."
  debug_session: "found during G-02-11 remediation; reproduced live at a relocated clone"

## Documentation Drift (not code gaps)

- test: 4
  file: ".planning/phases/02-configuration-manifest-and-generator-core/02-04-SUMMARY.md"
  says: "`generated/` absent -> exit 1, its own single message"
  actual: "exit 0, a --check SKIP message — changed deliberately per 02-REVIEW-FIX.md:98"
- test: 8
  file: ".planning/phases/02-configuration-manifest-and-generator-core/02-06-SUMMARY.md"
  says: "nine --self-test cases"
  actual: "twelve — three [[variants]] cases were added by the WR-08 review fix"

## Design Panel — G-02-11 (17 agents, 3 proposals x 4 adversarial lenses, 2026-09-02)

Ranked by fatal-count then total score. Full transcript:
`.claude/projects/-home-chris-coding-Power-Browser/2a3112ca-4094-429d-bace-15504273c76e/subagents/workflows/wf_ac31bcb2-d5e/journal.jsonl`

**1. Quotient out the checkout root — 0 fatal, 2 serious, avg 7.3. RECOMMENDED.**
`Buffer.compare` still runs FIRST and still decides. Only once it has failed may a fallback ask a
single question: are these the same bytes at a different absolute root? A helper splits the
generator's OWN output on the root it just emitted at, turning the emitted bytes into literal
fragments with a hole wherever an absolute path went; the fragments are escaped into an anchored
regex and matched against the tracked bytes. The captured string must not span a line, must be
identical at every hole, and must be absolute. Otherwise the plain byte failure stands. No path is
written down anywhere.

  - **SERIOUS (hides-drift), and it must be closed in the same change.** Whenever every absolute
    path in a file shares a leading segment, the decomposition is under-determined and a drift that
    DROPS that segment is absorbed into the hole. The auditor executed the proposed helper against a
    post-Phase-3 shape (`Icon=` moved under `objdir/dist/bin/`, which ROADMAP.md:194 makes the
    natural way to satisfy Phase 3 criterion 2) and got a GREEN gate on an emitter that had stopped
    honouring the variant's objdir — a launcher naming a non-existent binary would ship green.
    Three-line closure, verified against every case, to run before the regex:
      `const after = fixed.slice(1);`
      `const seg = /^\/[^/\n]+/.exec(after[0])?.[0];`
      `if (seg !== undefined && after.every(f => f.startsWith(seg))) return null;`
    It fails safe: a shared-prefix file loses the relaxation and goes red on a clone — a false red
    rather than a hidden green.
  - **SERIOUS (honesty).** The claim is restated in only one of three places that carry it. All
    three must move in the same commit: the module docblock at `verify-generated-identity.mjs:3-5`
    (still says "byte-for-byte", now false at any checkout but one); the registry comment at
    `verify-platform.sh:3623-3626` (says every planted case must go red — after this change one
    registered case must stay GREEN); and the `GENERATED_BANNER` in the tracked files, which the
    auditor ranked last and would leave, since a hand-edited root still reddens `--quick` on the
    preflight row — the banner is wrong about WHICH row, not about the fact.
  - Two further notes worth carrying: the proposed PASS line would print the author's absolute home
    directory on a CI runner, which is in tension with the no-internals copy rule this same file
    cites; and the helper as proposed ACCEPTS a space-bearing root, which CLAUDE.md hard rule 4
    forbids and nothing else in the tree catches.

**2. Emitter-as-stencil (sentinel-split) — 0 fatal, avg lower.** Same family; its PASS line was
found to print a false statement on exactly the machines the change exists to serve.

**3. Probe-emit root discovery (parameterise-root) — 0 fatal.** Threads an explicit root through
`emitDesktopEntry`/`assertUnderRepo`. Audited flaw: it silently retires the only mechanised
assertion on the emitted desktop root, and its three new self-test fixtures are themselves
hard-wired to this checkout through the one variable that changes on a clone.

**NOT AUDITED — evaluate before choosing.** A fourth option was raised after the panel launched and
never went through it: have the tracked `.desktop` files carry a PLACEHOLDER token substituted at
install time. That keeps exact byte comparison with no normalisation logic at all and would also
dissolve G-02-12, at the cost of the tracked entry no longer being directly usable and of
preflight losing its ability to check a real absolute path (Pitfall 4). It should be scored against
option 1 before implementation, not assumed better or worse.
