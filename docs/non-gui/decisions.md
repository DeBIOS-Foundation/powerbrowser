# Non-GUI build — decisions

Answered by Chris on 2026-09-25 (program plan: GUI-research
docs/superpowers/plans/2026-09-25-powerbrowser-non-gui.md, "Decisions for you").

- **D1 Uncommitted work: (a) committed to main** as `7b7a1f7`. The wave clones start from it.
- **D2 AI backend: (b) retire the opencode adapter for the PowerBrowser-Assistant plugin.**
  - Kept: NG-051 (with `backend = "off"`, no opencode process and no `/mcp` endpoint start).
  - Also built, in wave E: the adapter leaves the default build — `backend = "off"` is the
    `configuration.toml` default, and `@powerbrowser/backend-opencode` is not a dependency of
    `theia/applications/browser` unless the manifest selects it. The adapter's source stays in
    the tree.
  - Dropped with your quote: NG-041 to NG-050 and NG-052 to NG-062.
  - Doc sync (Task 12) writes the retirement into `.planning/REQUIREMENTS.md` (AI-01..AI-05)
    and `.planning/ROADMAP.md` (Phase 16). PBA itself is planned in ~/coding/PowerBrowser-Assistant.
- **D3 Encryption: (a) dropped.** NG-083. mozStorage has no SQLCipher; full-disk encryption
  covers the threat; the file stays queryable (NG-025).
- **D4 Hosts, accounts, long builds: (a) deferred to a later milestone.** NG-075 to NG-082,
  each with your APPROVE. Wave E builds Linux-local rows only.
- **D5 MAR signing key: (a)** generated locally, private key at
  `~/.config/powerbrowser-release/mar-key/` (outside the repo), public cert in the tree.
- **D6 Backlog and seeds:** Phase 999.1, seeds content-gui-plugins and hister-style-history
  stay where they are. Not rows.
- **D7 UAT sheets: (a)** you run the five v1.2 sheets in Task 12 (NG-084).

## Waves after these answers

| Wave | Rows | Clone |
|---|---|---|
| A tab identity and store | NG-001 – NG-020 (20) | ~/coding/Power-Browser-ng-a |
| B queries, history, access | NG-021 – NG-028 (8) | ~/coding/Power-Browser-ng-b |
| C modes, setups, windows, bridge | NG-029 – NG-040 (12) | ~/coding/Power-Browser-ng-c |
| E platform (Linux) + adapter off | NG-051, NG-063 – NG-074 (13) | ~/coding/Power-Browser-ng-e |

No wave D. NG-084 is yours (Task 12).

## Quick-tier baseline

`docs/non-gui/quick-baseline.txt` lists the nine `--quick` rows already red on `7b7a1f7`.
The commit gate for every wave is: no `--quick` failure outside that list, except a wave's own
recorded NG checks. Command:

    scripts/verify-platform.sh --quick 2>&1 | sed -n '/^verify-platform: summary/,$p' \
      | grep ': FAIL$' | awk '{print $1}' | sed 's/:$//' | sort \
      | comm -13 docs/non-gui/quick-baseline.txt -

It prints the new failures; empty output passes. NG-016 and NG-040 own two baseline rows
(`gui08-persistence-roundtrip`, `internals-catalogue`) and must turn them green.
