# Phase 10 Plan 02: Live Drills Summary

**Probe-first live drills green on the current tree where runnable, staged-with-unblock where environment-bound; one inert packaged-data delta synced byte-faithfully, no rebuild**

## Task 1 — Environment probes plus GEN-01 and GEN-03 delta re-proofs

### Probes (2026-09-05, this session)

1. **Display probe** — `scripts/verify-platform.sh --only harness-display-available` — **PASS** (headed session; `DISPLAY=:0`, `WAYLAND_DISPLAY=wayland-0` observed). Display-bound drills are runnable; any red they produce is product signal, not environment signal.
2. **Shell probe** — host shell answers trivial commands (`echo`/`head` OK); `node` available. **Nix theia shell (`yarn`) NOT on host PATH** (`yarn: command not found`) — expected per CLAUDE.md (`yarn` lives in `nix develop .#theia`); `theia/node_modules` present. Sidecar drills that need `yarn` must run under the Nix shell or stage with unblock.
3. **Staleness ruling** — change history since the v1.1 build proofs vs compiled surfaces:
   - Shell sources + patch stack: latest commit `bb92d6e` (2026-09-04 17:04 -0700) predates both the release build (`objdir-release/.../powerbrowser` 2026-09-04 21:32 -0700) and the dev build (`objdir/.../powerbrowser` 2026-09-05 00:01 -0700). **Zero deltas.**
   - Branding inputs (`configuration.toml`, `brand/`): **zero deltas** since the builds.
   - One packaged-data delta: `dfe34fb` (2026-09-05 01:23, post-dev-build) added exactly one inert key (`"ExtensionSettings": {}` — empty object, zero policy-engine behavior change, siblings identical) to `powerbrowser/distribution/policies.json`. Both objdir copies matched the pre-commit tree (proven by diff).
   - **Ruling: no rebuild scheduled.** A tier-3 rebuild (~47–54 min per docs/BUILD.md) for one inert data key is disproportionate; the file is a verbatim package-time copy, so both objdir copies were refreshed with `cp` from the tree and proven byte-equal by `diff` (empty diff both sides). Compiled surfaces are untouched. `theia/extensions/telemetry/test/telemetry-sender.test.mjs` also changed post-build (`8337589`) — test-only file, runs from the current tree, not a compiled surface.
   - **No rebuild happens without a staleness delta; this delta was closed by byte-identical sync, not by rebuild.**

### GEN-01 emitter delta re-proof (release-variant half credited to BLD-01 per 10-01)

- `scripts/verify-platform.sh --only generate-check` — **PASS** (`generate: --check PASS -- all 53 generated file(s) match configuration.toml`).
- `scripts/verify-platform.sh --only generated-byte-identity` — **PASS** (`verify-generated-identity: PASS -- 34 generated file(s) are byte-identical to their hand-written counterparts, and generated/ is untracked`).

### GEN-03 delta re-proof (host-build half credited to PKG-01 per 10-01; MSIX/DMG out of scope)

- `scripts/verify-platform.sh --only installer-schema` — **PASS** (`verify-installer-schema: PASS -- every installer fragment is present and schema-complete`).

### Task 1 verify chain

- `scripts/verify-platform.sh --quick` — **PASS** (all checks passed, full row list incl. `webextensions`, `crash-collector`, `installer-build-proof-self-test`).

### Task 1 done

Probes recorded and emitter plus installer deltas re-proven on the current tree. BLD-01 (release-variant) and PKG-01 (host-build) halves credited by pointer to 10-01-SUMMARY.md, not re-run.
