# Milestones

## v1.2 Sign-off Closeout and SQL Store (Shipped: 2026-09-05)

**Phases completed:** 3 phases, 9 plans, 22 tasks

- **Git:** 80 commits v1.1..v1.2 · 65 files, +11,457/−219 · 2026-09-05 → 2026-09-05 · tag `v1.2`
- **Archives:** `.planning/milestones/v1.2-ROADMAP.md`, `.planning/milestones/v1.2-REQUIREMENTS.md`, `.planning/milestones/v1.2-MILESTONE-AUDIT.md`, `.planning/milestones/v1.2-phases/` (10, 11, 12)
- **Closeout type:** override_closeout. Audit status `tech_debt` (accepted per standing nonstop instruction — proceed). 20/20 requirements implemented with evidence; 17/20 boxes checked. All 3 code reviews clean (Phase 12's 4 blockers fixed with live binary proof). Verifications 10/11/12 deferred (resume `/gsd-verify-work 10|11|12`).
- **Known verification overrides:** 1 newly acknowledged at close (uat_gaps 10/10-UAT.md, 5 pending-human scenarios), 14 carried forward from prior closes (see STATE.md Deferred Items); 13 archived v1.0 deferred items disclosed in the v1.0 archive — acknowledge-call cannot match archived text (tooling, same as v1.1), carried without re-suppression.

**Key accomplishments:**

- Six record-close boxes with cited evidence plus the 16-vs-15 reconciliation plus five staged UAT sheets, --quick green
- Probe-first live drills green on the current tree where runnable, staged-with-unblock where environment-bound; one inert packaged-data delta synced byte-faithfully, no rebuild
- Final tree gates-green on every cited row plus full-tier drill re-runs, registry alone with twinned checks, all 15 requirements dispositioned, human remainder routed as five staged sheets — VERIFIED
- SQL store authority rules signed before schema work: six invariants with Phase 12 enforcement pointers plus a recorded approval
- Readonly better-sqlite3 query API beside the frozen registry, chrome-side Places reads plus sessionstore projection, and an emitter-exercising absence instrument that stages honestly until startup wiring lands
- Second-writer scan and integrity soak as proven instruments, nine SQL-05 registry rows with honest tiers, and the ESR rebase drill evidenced at the live newer tag

Known gaps / tech debt carried (non-blocking, see audit):
Phase 10 — five human UAT signatures staged (10-UAT.md runbooks); Phase 11 — missing 11-02/11-03 summaries, SQL-03 box unchecked despite landed evidence; Phase 12 — missing 12-01 summary, SQL-01/SQL-04 boxes unchecked despite landed evidence; ROADMAP plan checkboxes (11-02/11-03, 12-01) vs Progress-table 3/3 mismatch (same doc-sync class).

Deviations from the standard close workflow:

- `.planning/REQUIREMENTS.md` was NOT removed via `git rm` (same v1.0 idiom): deleting it
  turns `allowlist-doc-consistency` (a `--quick` gate requiring the three
  inherited Mozilla egress hosts in both ROADMAP.md and REQUIREMENTS.md)
  red with no replacement until `/gsd-new-milestone` writes the next file.
  The v1.2 content is preserved verbatim in the archive above; new-milestone
  overwrites the live file. Tree stays green at the tag.

---

## v1.1 Hardening and SQL Tabs (Shipped: 2026-09-05)

**Phases completed:** 2 phases, 9 plans, 25 tasks

**Key accomplishments:**

- WR-04 bare-dollar NSIS rejection plus WR-07 fixture-rooted tile check, with identity.display_name carried to PowerBrowser through the emitter, comparands, and re-pinned gates -- byte-identity and full --quick green.
- Display gates re-pinned to PowerBrowser, canonical-form Ironwood fixture proving no-space emission byte-exact, full --quick green with identity pins frozen -- build-anchored rows staged for tier-3 with dated evidence.
- registerWindowActor boundary guard with a file-and-pattern plant plus URL-matched BiDi context selection with live two-context proof -- ledger 13 and 14 closed, single-touchpoint invariant holds.
- Updater compiled in, one real Linux N→N+1 MAR hop from the fork descriptor with zero Mozilla hosts, Nix-built NSIS setup.exe, and the packaging procedure with attributed timings — PKG-01/02/03 proven on Linux.
- Named packaging hosts with staged win/mac unblocks, a live-green Linux install matrix with alongside proof, a fresh 54-minute release build closing ledger 10, a green live rebase drill to 153.2.0esr with restore, and a NAME-01 re-scope of the live branding gate -- full --gate green.
- Synthetic npm plus local-path entries generate pinned theiaPlugins lines, floated and absent inputs fail loud naming the entry, and the downloader placeholder passes through verbatim — zero network, commit gate green.
- Minimal Antenna-protocol crash collector (stdlib-only, loopback-bound) with a discriminating contract gate, a written PII/retention/throttle policy, and ping/report separation cases — loopback round-trip proven.
- Manifest `[[webextensions]]` table emitted as `ExtensionSettings` into the tracked `policies.json` with a discriminating agreement gate, ESR unsigned-install mechanism confirmed in-tree — zero bundled add-ons, commit gate green.
- Five-entry staged manifest proves every extension source kind on real nix-linux artifacts (stock vsix download with placeholder expansion, per-target hashes, pin re-proof green, sidecar build 0 errors), win/mac cells honestly staged, and the Theia re-pin agreement holds at 1.74.1 with the token gate intact — tracked tree restored byte-identical.

---

## v1.0 PowerBrowser — SHIPPED 2026-09-04 (override closeout)

- **Phases:** 7 (1–7) | **Plans:** 52/52 executed | **Tasks:** ~140 (from phase summaries)
- **Git:** 326 commits (68 `feat(`), 352 files, +93,852/−34 · 2026-08-22 → 2026-09-04 · tag `v1.0`
- **Archives:** `.planning/milestones/v1.0-ROADMAP.md`, `.planning/milestones/v1.0-REQUIREMENTS.md`
- **Closeout type:** override_closeout. No milestone audit file; all phase verifications `human_needed` (static checks green, human/tier-3 drills staged); 16/31 requirements unchecked (deferred verification batch, not missing code).
- **Known verification overrides:** launch-lifecycle batch (WINDOWS #11 + #19, 19/19 green on dev binary, run 2026-09-04 by executor); trademark ritual signed (Chris, 2026-09-04, CONFIRMED).

Shipped: a booting, browsable PowerBrowser tree rebrandable through
`configuration.toml` + `brand/` alone — byte-identical generator core,
Gecko + Theia branding emitters, hook-only patches, two-layer verification
in CI, and Sourcerer reproduced as a pure downstream.

Known gaps (carried to v2, see `.planning/NEXT-MILESTONE-INPUTS.md` §3):
human-eyes drills (03 icon pixel look, 04 welcome/about render drill);
heavy-machine drills (release build + release-variant rows, per-fixture
tier-3 builds, live ESR rebase, Theia re-pin proof); WINDOWS #13
(registerWindowActor boundary hole), #14 (BiDi double-window).

Deviations from the standard close workflow:

- `.planning/REQUIREMENTS.md` was NOT removed via `git rm`: deleting it
  turns `allowlist-doc-consistency` (a `--quick` gate requiring the three
  inherited Mozilla egress hosts in both ROADMAP.md and REQUIREMENTS.md)
  red with no replacement until `/gsd-new-milestone` writes the v2 file.
  The v1 content is preserved verbatim in the archive above; new-milestone
  overwrites the live file. Tree stays green at the tag.
- Phase directories were left in place (equivalent to
  `--no-archive-phases`): the v1.0-ROADMAP archive carries the phase
  record, and the raw execution history remains browsable.
