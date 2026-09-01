# Deferred items — phase 02

Out-of-scope discoveries logged during execution. Not fixed here.

- **.planning/WINDOWS.md frontmatter counts are stale** (found during 02-01, appending a ledger entry). `gsd-tools windows append` refuses to write: frontmatter declares open/waived/fixed/total = 5/0/16/21 but the entries yield 7/0/14/21. Pre-existing, unrelated to this plan, and it silently blocks every ledger append until reconciled.
