---
phase: "18"
slug: "firefox-153-5-0esr"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-10-16"
---

# Phase 18 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| github.com mirror to `upstream/` | A third-party remote's tag decides which Gecko source is compiled | Gecko source at a pinned SHA |
| `patches/` to `upstream/` | The patch stack is the only sanctioned modification of Gecko | Patch hunks |
| Nix toolchain to build | The compiler set must not drift or self-bootstrap at the new tag | Toolchain binaries |
| Build env to release objdir | Two environment variables decide objdir and branding | Branding identity |
| Driver output to baseline / verdict | The SC4 verdict is derived from the driver's summary lines | Check results |
| Evidence to docs | Docs must not present stale or unexercised evidence as a 153.5 proof | Claims |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-18-01 | Tampering | fetch-upstream.sh comment planting a tag literal | low | mitigate | `verify-upstream-pins.mjs` PASS (no second literal in scope) | closed |
| T-18-02 | Repudiation | 18-FAILSET-153.1.txt | medium | mitigate | Baseline derived from driver summary before any tree change; owner on every row | closed |
| T-18-03 | Tampering | Mozilla tag re-pointed after the pin | high | mitigate | `git -C upstream rev-parse HEAD` = `223014c6b9299ac9b035b4c50ea481e5c6de282c`; SHA recorded in docs/BUILD.md | closed |
| T-18-04 | Tampering | Gecko modified outside the patch stack / silent no-op patch | high | mitigate | `git diff 802f2f8 HEAD -- patches/` empty; `apply-patches.sh --self-test`, check-patch-surface PASS (18-02-SUMMARY) | closed |
| T-18-05 | Tampering | Upstream content reintroducing a brand string | medium | mitigate | `scan-brand-residue.mjs --extra-root upstream` inside rebase-upstream.sh; staged scan PASS | closed |
| T-18-06 | Tampering | Toolchain drift / bootstrap download | medium | mitigate | `flake.lock` unchanged; toolchain-baseline diff empty; zero `mach bootstrap` (18-02, 18-03 SUMMARY) | closed |
| T-18-07 | Repudiation | mar-update-hop PASS or never-run workflow cited as 153.5 proof | medium | mitigate | docs/BUILD.md carries two `predates 153.5` labels and the `unexercised` CI note | closed |
| T-18-08 | Tampering | Node runtime downloaded by package-linux.sh | low | accept | Existing sha256 pin in powerbrowser/packaging/node-runtime.json, unchanged | closed |
| T-18-09 | Tampering | Release objdir built with dev branding | medium | mitigate | `objdir-release/config.status` has `with-branding=powerbrowser/branding/release`; identity rows PASS | closed |
| T-18-10 | Tampering | Clobber removing the wrong objdir | low | mitigate | Both `application.ini` read `Version=153.5.0` after the release clobber/build | closed |
| T-18-11 | Repudiation | 153.5 regression hidden behind a known red | medium | mitigate | 18-FAILSET-153.5.txt ⊆ 18-FAILSET-153.1.txt; label sets equal; 17 version rows PASS; owners on every red row | closed |
| T-18-12 | Repudiation | mar-update-hop PASS presented as 153.5 proof | medium | mitigate | hop.json N=153.1.0 vs built 153.5.0 recorded; pre-153.5 label in SUMMARY and docs | closed |
| T-18-SC | Tampering | npm/pip/cargo installs | low | accept | No package-manager install; Gecko source covered by T-18-03/T-18-04 | closed |

*Status: open · closed · open — below high threshold (non-blocking)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-18-01 | T-18-08 | Node runtime download is pinned by an existing sha256; this phase does not change it | plan 18-02 (autonomous run) | 2026-10-16 |
| AR-18-02 | T-18-SC | No package-manager install in this phase | plans 18-01..03 (autonomous run) | 2026-10-16 |

---

## Security Audit

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-10-16 | 13 | 13 | 0 | orchestrator (L1 grep-depth, short-circuit: register authored at plan time, ASVS 1) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-10-16
