---
phase: 19-node-24-react-19-theia-1-76-0
plan: 08
subsystem: packaged Node runtime re-pin to v24.19.0 and the node-major-agreement --quick row
tags: [UPD-07, UPD-10, NG-063, NG-074, NG-084, gap-closure, packaging, node]
status: complete
requires: [19-07]
provides:
  - "powerbrowser/packaging/node-runtime.json pins linux-x64 to v24.19.0, sha256 from Chris's GPG-verified SHASUMS256.txt"
  - "node-major-agreement and node-major-agreement-self-test --quick rows (19-REVIEW.md WR-05, 19-VALIDATION.md escalation)"
  - "The Linux package re-made on Node v24.19.0; ng063, ng065 and ng072 pass on it"
affects: [19-verification, 999.2]
tech-stack:
  added: []
  patterns: ["derived three-input agreement check with a tree-derived clean control in its self-test"]
key-files:
  created:
    - scripts/verify-node-major-agreement.mjs
    - .planning/phases/19-node-24-react-19-theia-1-76-0/19-08-SUMMARY.md
  modified:
    - scripts/verify-platform.sh
    - powerbrowser/packaging/node-runtime.json
decisions:
  - "The packaged Node runtime is v24.19.0, equal to the .#theia dev shell's node --version (VDEV); sha256 14b342e7...409647 comes only from Chris's gpgv-verified SHASUMS256.txt grep line"
  - "The packaged/flake/engines Node major agreement lives in its own --quick check, because NG-086's check is hash-locked by Chris"
metrics:
  duration: ~25m
  completed: 2026-10-17
  tasks: 3
  files: 3
estimate_ref: {tokens: 35000, tasks: 3}
actuals:
  tokens: 3050
  tasks: 3
  commits: 2
commits: 2
plan_head_before: 3c78f15429fda904bc919262a104e5766599be43
plan_head_after: 160652db667889562bf89347bc9de3137bb49d08
---

# Phase 19 Plan 08: Packaged Node runtime to v24.19.0 Summary

The Linux package now ships Node v24.19.0. That is the dev shell's major and the one Theia 1.76.0 requires. The pin's sha256 comes from Chris's gpgv-verified SHASUMS256.txt, and an independent download hashed to the same value. A new derived `--quick` row, node-major-agreement, keeps the packaged major, the flake major and engines.node in agreement from now on.

## Task 1: Chris's GPG step (checkpoint input supplied in the resume context)

VDEV: `nix develop .#theia --command node --version` printed `v24.19.0`. The precondition held: `git diff --quiet HEAD -- powerbrowser/packaging/node-runtime.json` succeeded.

Chris ran the gpgv route in his own terminal on 2026-10-17, in ~/coding/Power-Browser-fixtures/node-v24.19.0, and pasted this output verbatim:

```
gpgv: Signature made Mon 03 Aug 2026 06:44:56 AM PDT
gpgv:                using EDDSA key 5BE8A3F6C8A5C01D106C0AD820B1A390B168D356
gpgv: Good signature from "Antoine du Hamel <antoine.duhamel@platformatic.dev>"
gpgv:                 aka "Antoine du Hamel <duhamelantoine1995@gmail.com>"
14b342e71204f811bde6153be8e04b62aef63c236fef92b55f9c83154b409647  node-v24.19.0-linux-x64.tar.xz
```

- README fingerprint comparison: **not reported**. It is recommended, not required, so it did not block. Residual risk T-19-26 stays as the threat register states it.
- Chris's version equals VDEV, so no reason was needed.
- The agent ran no curl, git clone, gpg or gpgv against nodejs.org or nodejs/release-keys for the sha. It took the values only from his paste and did not ask him to repeat the step.
- `logs/node-pin-19-08.log` (git-ignored) holds the five lines `NODE_PIN_VERSION=v24.19.0`, `NODE_PIN_SHA256=14b342e7…409647`, the grep line unchanged, the `gpgv: Good signature from ...` line unchanged, and `GPG_KEY_FPR=5BE8A3F6C8A5C01D106C0AD820B1A390B168D356`. Task 1's `<verify>` passed.

## Task 2: node-major-agreement check, then the pin

- **Check commit:** `a42c962` `test(19-08): add the node-major-agreement --quick check for the packaged Node major (WR-05)`. It touches only scripts/verify-node-major-agreement.mjs and scripts/verify-platform.sh.
- **Pin commit:** `160652d` `build(19-08): re-pin the packaged Node runtime to v24.19.0 from a GPG-verified SHASUMS256.txt (UPD-07)`. It touches only powerbrowser/packaging/node-runtime.json. Its body is `SHASUMS256.txt signature verified by Chris against Node.js release key 5BE8A3F6C8A5C01D106C0AD820B1A390B168D356`. a42c962 is its parent, so the window with one red outside the baseline lasted one commit.
- **Red on the v22 pin** (logs/node-major-red-19-08.log, `NODE_MAJOR_EXIT=1`):
  `node-major-agreement: FAIL -- powerbrowser/packaging/node-runtime.json target linux-x64 version v22.23.2 has Node major 22, but flake.nix pins nodejs_24`
  A second line also reported the engines miss: `... has Node major 22, below theia/package.json engines.node >=24`.
- **Green after the re-pin:**
  `node-major-agreement: PASS -- flake.nix nodejs_24; powerbrowser/packaging/node-runtime.json linux-x64 v24.19.0; theia/package.json engines.node >=24`
- **Self-test:** `node-major-agreement-self-test: PASS -- 7 cases`. The cases are the clean control, packaged major mismatch, flake below engines, missing node-runtime.json, unparseable version, duplicate flake line and malformed engines. The control is derived from the tree: each target's major is set to the copied flake's major.
- **Independent hash:** the tarball downloaded fresh from `https://nodejs.org/dist/v24.19.0/node-v24.19.0-linux-x64.tar.xz` hashed to `14b342e71204f811bde6153be8e04b62aef63c236fef92b55f9c83154b409647`. That **equals** Chris's value.
- **Docs:** no tracked doc names the packaged Node version, so none needed an edit. The verify's `git grep` for `node-v22` / `dist/v22` under powerbrowser/, docs/BUILD.md and docs/RELEASING.md is empty.
- **Task 2 `<verify>` passed in full.** package-linux.sh's python3 reader returns Chris's version, the derived URL and his sha. The file has one target and three keys. phase-gate exited 0 with no output. plan-gate printed `plan gate passed: 2/2 IDs cited (phase 19)`, citing and carrying NG-074 and NG-084. The brand scan passed on 350 files.
- **--quick after the pin** (logs/quick-19-08.log): 120 PASS and 4 FAIL. The four FAILs are exactly the gui08 rows in docs/non-gui/quick-baseline.txt, so nothing fails outside the baseline. `node-major-agreement: PASS` and `node-major-agreement-self-test: PASS` are both listed. quick-baseline.txt and verify-ng-086-theia-react-node.mjs are unchanged.

## Task 3: package re-made, packaged rows re-run

No Gecko build and no release were needed. package-linux.sh ran `./mach package` on the existing 153.5.0 objdir.

| Step | Log | Wall s | Result |
|------|-----|--------|--------|
| Sidecar `yarn build` | logs/build-19-08.log | 9 | PHASE19_EXIT=0 (19-05: 18 s) |
| package-linux.sh | logs/package-19-08.log | 53 | PHASE19_EXIT=0, `package-linux: wrote .../powerbrowser-153.5.0.en-US.linux-x86_64.tar.xz` (18-02: 51 s) |
| ng063-packaged-launch | logs/ng063-19-08.log | 8 | PASS |
| ng065-mar-signature-enforced | logs/ng065-19-08.log | 370 | PASS |
| ng072-policies-packaged-webextension | logs/ng072-19-08.log | 2 | PASS |

- ng063: `ng063-packaged-launch: PASS -- the packaged tree reached a ready workbench on its own Theia and Node`
- ng065: `ng065-mar-signature-enforced: PASS -- the fork-signed MAR applied; unsigned, foreign-key and wrong-channel MARs were refused`
- ng072: `ng072-policies-packaged-webextension: PASS -- policies.json is packaged and a policy-declared WebExtension loads`
- Packaged node version: **v24.19.0**. ng063's checkNode compared it with the pin. As a cross-check, the agent extracted `powerbrowser/node/bin/node` from the rewritten tarball into the scratchpad and ran it: it printed `v24.19.0`.
- `.mozbuild/node-dist/node-v24.19.0-linux-x64.tar.xz` exists. package-linux.sh's `sha256sum -c` against the pin passed, which is the real consumer's second check.
- No row needed an R28 re-run. Every row passed on its first run.
- Task 3 `<verify>` passed. `git status --porcelain --untracked-files=no` printed nothing. The locked checks and scripts/lib are unchanged, and flake.nix and flake.lock are unchanged since 3c78f15.

## Deviations from Plan

None. The plan executed as written. The Task 1 checkpoint was satisfied from the resume context, as the plan's action step 3 allows.

## Ledger

No ledger rows changed. NG-063 is re-proven on the new runtime with its check unedited. NG-074 and NG-084 stay deferred-approved and carried.

## Self-Check: PASSED

- FOUND: scripts/verify-node-major-agreement.mjs, powerbrowser/packaging/node-runtime.json (v24.19.0), the registry rows in scripts/verify-platform.sh
- FOUND: commits a42c962 and 160652d, both ancestors of HEAD, in that order
- FOUND: logs node-pin, node-major-red, quick, build, package, ng063, ng065 and ng072 (all git-ignored)
