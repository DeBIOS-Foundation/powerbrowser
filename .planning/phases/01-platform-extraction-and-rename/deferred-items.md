# Deferred items — phase 01

Discovered during execution, out of scope for the plan that found them.

| # | Found in | Item | Route to |
|---|---|---|---|
| 1 | 01-01 Task 2 | The DeBIOS Foundation's GitHub organisation is not established. `sourcerer/endpoint-allowlist.json:82` and `theia/extensions/branding/src/browser/sourcerer-welcome-widget.tsx:13` carry `https://github.com/Deocracy/Sourcerer`, which the mechanical vendor rename turns into `https://github.com/DeBIOS/PowerBrowser`. D-12 establishes only the `powerbrowser.org` domain, so this URL is an assumption, not a decision. | Confirm before any release; plan 01-03 or 01-06 |
| 2 | 01-01 Task 1 | Plan 01-01's acceptance criterion `grep -c 'content/powerbrowser/' … → 5` returns 6, because the `%  content powerbrowser %content/powerbrowser/` package-declaration line matches too. Re-anchor on `^   content/powerbrowser/` if the criterion is reused. | Plan 01-02, if it copies the criterion |
| 3 | 01-01 Task 1 | `sourcerer/shell/jar.mn`'s column alignment drifted by three characters on the `TheiaService.sys.mjs` line, because `content/sourcerer/` → `content/powerbrowser/` is longer. `jar.mn` is whitespace-tolerant and D-06 forbids restructuring during a rename, so it was left alone. | Cosmetic; fix opportunistically or never |
