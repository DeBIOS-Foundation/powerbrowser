# Phase 18 — Review Disposition

Source: `18-REVIEW.md` (iteration 2: clean). Fix report: `18-REVIEW-FIX.md`.

| Finding | Severity | Disposition | Evidence |
|---------|----------|-------------|----------|
| WR-01 | warning | fixed | 01d92d4; `--only smoke-firefox` PASS on the real tree with the new pin check |
| WR-02 | warning | fixed | 8075360 |
| WR-03 | warning | fixed | 657657b |
| WR-04 | warning | fixed | de37088 (docs only; workflow not wrapped in Nix — 18-CONTEXT lock) |
| WR-05 | warning | fixed | 2e810ea (reworded; a SHA gate deferred — needs manifest + generator + check change) |
| IN-01 | info | open | stale "the pinned" wording in the 08-05 drill paragraph |
| IN-02 | info | open | PASS line hardcodes the version-file path |
| IN-03 | info | open | version match is an unanchored substring |
| IN-04 | info | open | stale workflow header comment |
| IN-05 | info | open | smoke-firefox's precheck failure message names one cause of three |
