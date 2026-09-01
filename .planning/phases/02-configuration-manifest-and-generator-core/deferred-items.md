# Deferred items — phase 02

Out-of-scope discoveries logged during execution. Not fixed here.

- **.planning/WINDOWS.md frontmatter counts are stale** (found during 02-01, appending a ledger entry). `gsd-tools windows append` refuses to write: frontmatter declares open/waived/fixed/total = 5/0/16/21 but the entries yield 7/0/14/21. Pre-existing, unrelated to this plan, and it silently blocks every ledger append until reconciled.

## 02-03 — scripts/generate.mjs is not a verify-platform.sh row

`node scripts/generate.mjs --self-test` and the `cmp` byte-identity check run only when
invoked by hand. Plan 02-03 does not ask for the registry row and its acceptance criteria
require only that `--quick` stays green. Register it alongside the remaining emitters in
02-04/02-06, as one row appended to `scripts/verify-platform.sh` — never a sibling driver.

Logged here rather than in `.planning/WINDOWS.md`: that file's frontmatter counts are
inconsistent and `gsd-tools windows append` refuses to write to it.
