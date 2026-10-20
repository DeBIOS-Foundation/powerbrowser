# Milestones

## v1.4 Platform Updates and GUI Close-out (Shipped: 2026-10-19)

**Phases completed:** 8 phases, 43 plans, 44 tasks

**Key accomplishments:**
- One commit (B, `02fffb6210fda013fe22c0794c3bad92b1daa2c5`) removes the `[ai]` manifest table, the `ai.backend` schema key, `emitAiBackend` with its TARGETS row (generator now 53 targets), `powerbrowserAiBackend`, the REBRANDING `[ai]` section, the three verify-opencode scripts, the NG-051 check, the adapter doc, and every registry row and helper that named them.
- The 153.1 full-run FAIL baseline (218 rows, 188 PASS, 30 FAIL, every red row owned) is committed before the substrate moves. The fetch-upstream `_RELEASE`/`_BUILD<n>` comment and `configuration.toml:104` are corrected without a gate changing state.
- Gecko is pinned to `FIREFOX_153_5_0esr_BUILD1` (`223014c6b9299ac9b035b4c50ea481e5c6de282c`). The four patches replayed byte-unchanged. A clobbered dev build reports `DeBIOS powerbrowser 153.5.0esr`, a 153.5.0 package exists, and smoke-firefox now compares against `version_display.txt` instead of a literal.
- The release objdir is rebuilt at 153.5.0esr with release branding (2620 s). The full 153.5 run has 218 rows, 206 PASS and 12 FAIL. Every FAIL label is in the 153.1 set B, and all 17 version-sensitive rows PASS. Seven of the 12 reds are unmeasured because port 3000 is still held.
- GroupModel loads itself at layout init. The Browsing strip paints only the active group's tabs, the loose tabs and the current tab. "+" writes the new tab into the active group. pan03 proves all of this live, on a rebuilt sidecar, with two probe controls shown able to go red.
- The copy check now reads every single-quoted and template literal at every text sink, including the ARIA text attributes. The empty-canvas body ships in Chris's C1 item 4a wording. The grip value, card tooltip and zoom readout (21-REVIEW WR-05) are contracted in 15-UI-SPEC.
- A closed group is hidden for UNDO_CLOSE_MS (15000 ms) on GroupModel, writing nothing. Undo restores it exactly. The close is written through the unchanged closeGroupRows when the timer ends or when PowerBrowser quits, and never by a mode switch. During the window its tabs show in no tab bar in any mode. pan04 proves this live with three probe controls.
- × closes a group at once, with no dialog. An Undo Close Group control appears in the group's bounds on the canvas, or in its section's place in the tree, and takes focus. Undo restores the group. When the window ends, the close commits. The 15-UI-SPEC and the three gui08 checks changed in the same commit as the code (SC3), and each passed there. ng-006 now proves the tabs close when the window ends.
- The last visible group has no x on the canvas or in the tree, and the close-group command does nothing for it: no undo window, no Undo control, no status-bar notice. A pending group does not count as remaining. GroupModel.canCloseGroup implements the rule, and the guard is the first statement of `closeGroup`. close-exactness derives the guard in the model, the canvas and the tree, and pan04 shows it live.
- Each card that takes the pointer has a 24 × 24 round × at its top right, labelled "Close tab", and Delete on a focused card does the same. An open tab closes through Theia's own close, so a dirty editor shows the stock save prompt and Cancel keeps it. A card whose tab is not open marks its row closed. A group emptied this way stays. pan05 shows all of this live, with both probe controls turning red.

**Closeout:** override closeout, chosen by Chris on 2026-10-19 after the audit (status gaps_found). CI run 39340825244 is green on the pushed 0efb116, and NG-074 is done.

### Known Gaps

- **UAT-01**: Chris ran A01–A20 live. The rest of the live UAT is deferred by Chris (NG-089 deferred-approved to phase 26: "I want to do the GUI checks when everthing is done on my own time"). His list is `milestones/v1.4-phases/24-live-uat-pass/24-CHRIS-CHECKLIST.md`.
- **MODE-01 (live half)**: A18 failed. Organising opens inside one pane of a split main area, and G-11 is not earned.
- **PAN-03..06 (live)**: Phase 22 is verified statically (14/14). Its live checks are among the deferred UAT rows.
- **12 defects for v1.5**: listed in `milestones/v1.4-phases/24-live-uat-pass/24-GAPS.md`. They are A18, chrome-side errors, A21, B01, A25, A27, A31/A42, A40, A44, A45/B03, B02 and B07.
- Known verification overrides: Phase 22 (human_needed), Phase 24 (no VERIFICATION.md; 24-05 not run), Phase 25 (no phase directory; CI run is the evidence).

---

## v1.3 Browser GUI (Shipped: 2026-09-06)

**Phases completed:** 3 phases, 10 plans (13: 3, 14: 3, 15: 3 + 1 revision), ~30 tasks

**Key accomplishments:**

- Chrome bar as a toolbar-like `@powerbrowser/*` contribution (back/forward/reload, pill address with 8-row suggestions, New Tab via stock-window escape, mode toggle) with derive-and-compare gates, all green.
- Strip-relocation spike verdict RED (mechanics proven live; zero-core pillar unprovable on pre-existing core-diff drift) → Variant-A fallback recorded: strip stays top, modes still ship, re-probe runway documented.
- Modes as data (coding/browsing/organising defaults + user-saved customs in user-storage JSON, no manifest flag); sliding panels; tabs invariant asserted by gate; dependent windows via stock secondary-window route (probe GREEN); named setups with restore applicator; core-close-full-kill.
- Panorama organising canvas (free drag, corner resize, auto-box on canvas drop, zoom, ungrouped tray) + tree over identical group data; SQL groups table + `group_id` via single chrome-side writer (JSWindowActor pair, origin-scoped); PNG snapshots with guaranteed text fallback; placeholder retired.
- Reviews: 10/10 (13), 13/13 + 3 UI (14), 19 + 3 UI (15) dispositioned; security SECURED ×2; UI audits 15/24 and 20/24; `--quick` green throughout; single driver, no core fork, no new packages.

**Carried as tech debt:** verifications 13/14/15 deferred per standing nonstop rule; GUI-07/GUI-08 box flips; 14 minor UI batch; piles + type-anywhere search OUT; IN-07 same-origin forgery inherent.

---

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
- Readonly better-sqlite3 query API beside the frozen registry, chrome-side Places reads plus sessionstore projection, and an emitter-exercising absence instrument whose startup wiring has landed (NG-020 done on main, merge 5f990e6)
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
