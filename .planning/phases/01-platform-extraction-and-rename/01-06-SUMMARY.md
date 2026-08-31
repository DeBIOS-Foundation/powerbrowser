---
phase: 01-platform-extraction-and-rename
plan: 06
status: complete-descoped
requirements: [GUI-04]
requirements_dropped: [GUI-02]
completed: 2026-08-30
commits:
  - f0471ba
---

# 01-06 Summary — descoped at the D-22 gate

## Outcome

The plan reached its `blocking-human` D-22 gate and the user **declined the
dependency**. GUI-02 is deferred to v2; the GUI-04 portion of the plan landed
and stands on its own.

This is a deliberate scope decision, not a failure. Requirement traceability was
updated in the same change: GUI-02 moved to `## v2 Requirements (deferred)` in
REQUIREMENTS.md with the rejection rationale, and removed from Phase 1's
requirement set in ROADMAP.md (three sites).

## What shipped

**`f0471ba` — test(01-06): assert the tab-URI registry's exported shape (GUI-04)**

- `scripts/verify-registry-shape.mjs` (new)
- `scripts/verify-platform.sh` — two rows added to the `--quick` set

The check derives the actual exported surface from `tab-uri-registry.ts` and
`view-factory-table.ts` **at check time** and compares it to the declared bridge
contract as a set equality, so it goes red on an addition *and* on a removal.
This was chosen over the hand-kept probe list the plan sketched, which can only
ever agree with the tree. `--self-test` plants four faults (export added, export
removed, public member added, public member removed) and requires each to go red
naming the drifted symbol.

Closes 01-VALIDATION.md line 71's pending GUI-04 row.

| Command | Result |
|---|---|
| `verify-platform.sh --only gui04-registry-shape` | PASS |
| `verify-platform.sh --only gui04-registry-shape-self-test` | PASS — 4/4 planted faults went red |
| `verify-platform.sh --quick` | PASS — 17/17 |
| `node scripts/scan-brand-residue.mjs` | exit 0 |

## Why GUI-02 was dropped

`@theia/mini-browser@1.74.1` **passed** its supply-chain audit. The `SUS` /
`too-new` verdict derived from `1.75.0` (published 2026-08-27), not the pinned
version; `1.74.1` was published 17 seconds after `@theia/core@1.74.1` in the same
Eclipse Theia monorepo release batch, from the same repository and publisher as
the 49 `@theia/*` packages already in the tree, with no `preinstall`/`install`/
`postinstall` scripts.

It was rejected on **runtime surface**, a question the D-22 gate's evidence
checklist never asked:

```
theiaExtensions:  backend:  lib/node/mini-browser-backend-module
                  frontend: lib/browser/mini-browser-frontend-module
dependencies:     vhost ^3.0.2, mime-types, pdfobject, @theia/filesystem
```

Installing it would have made it the **second** backend module in the tree,
beside `token-gate` — the extension whose job is guarding that backend — and
mounted a file-serving virtual host. That is materially the same pattern this
project rejected as candidate C in 01-05's channel analysis ("a new HTTP route on
the token-gated backend... a new `backend` entry in an extension that is
frontend-only today").

Being iframe-backed, it additionally cannot render any origin sending
`X-Frame-Options: DENY` — most large sites — which the plan already conceded by
requiring an always-visible "open in a real browser window" escape on every tab.

**Two corrections to the record, for whoever revisits this:**

1. The "new attack surface" framing was **overstated** in the discussion that led
   here. `token-gate` front-inserts into `EarlyExpressMiddleware` (`unshift`,
   not `push`), and `BackendApplication` applies those handlers *before* running
   `configure()` on contributions — so a backend route registered the ordinary
   way is gated by construction. The unresolved question was narrower and is a
   *compatibility* one: `vhost` mounts on a different `Host`, and the
   `POWERBROWSER_TOKEN` cookie is scoped to the main origin, so mini-browser's
   iframe requests may simply have been 403'd. Never tested — the package was
   never installed.
2. The supply chain is clean. If mini-browser is ever reconsidered, do not
   re-litigate the audit; re-examine the backend module and the vhost/cookie
   interaction.

**Preferred direction if GUI-02 returns:** a tab backed by a real
`<xul:browser>` element rather than an iframe. Power Browser already has Gecko,
so this sidesteps frame-refusal entirely and needs no third-party dependency.
Unverified — Theia widgets live in the content process and a browser element is
chrome, so the bridging is real work.

## Deliberately not done

The fifth `CARVE_OUTS` entry and the `docs/URI-SCHEMES.md` web-schemes section
were **withheld** rather than front-loaded while the gate was open. Both document
the behaviour of a web tab that does not exist; committing them would have put
false user-facing documentation in the tree, and it would now be permanently
wrong. This turned out to be the right call.

`theia/package.json`, `theia/yarn.lock`, and
`theia/extensions/tab-uris/package.json` are untouched — no dependency entered
the tree.

## Self-Check: PASSED

- [x] Gate respected — `@theia/mini-browser` absent from all manifests
- [x] Landed work verified by its own self-test, not only by its own assertion
- [x] Requirement traceability updated before phase verification runs
- [x] Rejection rationale recorded where the next person will look
