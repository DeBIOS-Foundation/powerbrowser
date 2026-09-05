---
audit_acknowledged:
  milestone: v1.1
  at: 2026-09-05
  gap_snapshot: "unknown::scenarios=0"
---

# Phase 5: Hook-Only Patches and Upstream Uptake — UAT (human items)

All static checks pass (`verify-platform.sh --quick`: 95 PASS, 0 FAIL). These 3 items need a human
environment — they were deliberately staged, not executed, by plans 05-03/05-04. Tier-3 builds
and upstream clones are never run by verification.

## UAT-1: Live ESR rebase drill (UPD-01 live half)

**Prerequisite:** a real next ESR tag exists (the manifest pin `FIREFOX_153_1_0esr_RELEASE` is current; there is nothing newer to adopt yet) + CI minutes or ~1.1 GB clone bandwidth.

**Test (preferred, CI dispatch):**

```sh
gh workflow run "Rebase upstream" --ref <default-branch> -f tag=<new-pin>
```

**Test (local equivalent):**

```sh

# Manifest first: edit configuration.toml [upstreams] firefox_esr_tag, mirror the

# .github/workflows/rebase-upstream.yml input default, then:

node scripts/generate.mjs
TAG=<new-pin> bash scripts/rebase-upstream.sh --tag <new-pin>
```

**Expected:** Rebase completes: replay applies, surface check + `scan-brand-residue --extra-root $UPSTREAM_DIR` + fetch re-check all green, `verify-generated-identity.mjs` post-replay green. Any drift aborts loudly naming the patch (that is the designed behavior, not a failure).
**Why human:** Requires network clone of upstream Gecko + operator judgment on conflict remediation (regenerate from patched tree). Reference timing: clone + replay minutes; toolchain diff seconds.
**Follow-up:** toolchain-baseline diff per `docs/BUILD.md` PITFALLS #2:

```sh
nix develop .#firefox --command bash scripts/toolchain-baseline.sh
diff toolchain-baseline.txt <fresh-output>
```

## UAT-2: Tier-3 branded build after rebase (UPD-01 build half)

**Prerequisite:** UAT-1 green at the new tag.

**Test:** `docs/BUILD.md` build procedure (dev variant), then the built-artifact branding proof per the 03-04 precedent (six identity surfaces against the built artifact, positive control green).

**Expected:** Working branded build at the new ESR pin — this is the "yields a working branded build" clause of success criterion 3.
**Why human:** ~47–54 min reference timing on the reference host; verification never spends build time.

## UAT-3: Theia core-untouched proof (UPD-02 live half)

**Prerequisite:** `nix develop .#theia` (provides `yarn`). Nothing to install beyond the shell — `theia/node_modules/@theia` (49 packages) is already present.

**Test:**

```sh
nix develop .#theia --command bash scripts/diff-theia-core.sh
```

(`--quick` stage 1 alone is the minimum; the full run's fresh install doubles as the re-pin procedure's step-5 proof shape.)

**Expected:** Exit 0 — integrity + fresh-resolve diff prove zero in-tree changes to `@theia/*`.
**Why human:** `yarn` is unavailable outside the nix shell (`diff-theia-core.sh --quick` exits 1 here with `yarn: command not found` — toolchain absence, not tree state). No re-pin is performed: the procedure is proven structurally and exercised live only when a real Theia release demands it.

---
*Sign off by recording date + result under each item. When all three are green, Phase 5 is closed in full.*
