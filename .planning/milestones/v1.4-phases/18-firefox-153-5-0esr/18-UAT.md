---
status: complete
phase: 18-firefox-153-5-0esr
source: [18-VERIFICATION.md]
started: 2026-10-17
updated: 2026-10-17
---

## Current Test

number: 1
name: Measure the 7 port-bound rows at 153.5
expected: |
  With localhost:3000 free (it is held by the mem0-dashboard-1 container), each of
  these prints "<label>: PASS":
  scripts/verify-platform.sh --only smoke-theia
  scripts/verify-platform.sh --only diff-theia-core
  scripts/verify-platform.sh --only gui01-command-registered
  scripts/verify-platform.sh --only verify-branding
  scripts/verify-platform.sh --only verify-customize-inert
  scripts/verify-platform.sh --only verify-dev-flag-off
  scripts/verify-platform.sh --only verify-uri-roundtrip
awaiting: none

## Tests

### 1. Measure the 7 port-bound rows at 153.5
expected: each of the seven --only rows above prints PASS with port 3000 free
result: pass — all 7 PASS on :3939 (3079774)

## Summary

total: 1
passed: 1
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
