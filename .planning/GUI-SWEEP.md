# GUI conformance sweep — protocol (Phase 14.1.1)

**The list.** `.planning/phases/14.1.1-gui-conformance-sweep/14.1.1-UAT.md` is the one
authoritative list of every way the built GUI does not follow its documentation. Built
2026-09-07 from GUI-DEFECTS.md (every item not CONFIRMED), the Phase 14 UAT gaps still
in_tree/open, the ten pending 14.1 human tests, the three UI-SPECs, the GUI requirements,
and commit `2857353`. 42 tests, 29 gaps. Each test says `fixable: yes` (a live check or
static gate can prove the fix), `needs-chris` (only his screen can), or `decision` (docs and
his stated intent disagree). GUI-DEFECTS.md stays as the history; new findings go here.

## Step 1 — list (done: the read-only sweep that produced 14.1.1-UAT.md)


## Step 2 — automated fix pass (fixable: yes only)

    /gsd-plan-phase 14.1.1 --gaps
    /gsd-execute-phase 14.1.1 --gaps-only --auto

Executor rules: one gap per task; every task ends with a live check or a `--quick` row that
goes red without the fix (frontend: the standalone sidecar on :4000 driven by gsd-browser;
built binary: a `scripts/lib/firefox-bidi.mjs` check like `scripts/verify-web-tab-live.mjs`);
a `needs-chris` or `decision` gap is never marked fixed by an executor — it may only gain
evidence. `scripts/verify-platform.sh --quick` green before each commit.

## Step 3 — one at a time with Chris

    /gsd-verify-work 14.1.1

Chris passes or fails each test on his own screen, top to bottom. A failure becomes a gap
(next `G-14.1.1-N`, `status: open`). Then loop until the list is clean:

    /gsd-plan-phase 14.1.1 --gaps
    /gsd-execute-phase 14.1.1 --gaps-only
    /gsd-verify-work 14.1.1

Decision tests (11, 12, 28, 29, 30, 31) are answered by Chris in this step; the answer is
recorded in the gap's `root_cause` and the gap re-classified `yes` or closed.

## Adding a bug

Append a `### N. title` block under `## Tests` (next number, `result: issue`) and a matching
`G-14.1.1-N` entry under `## Gaps` with truth, contract (file:line), severity, test, reason,
root_cause (or "unknown — investigate"), artifacts, fixable. Or tell Claude
"add bug: …" and it does the same. Never edit an existing id; append.

## Binding rules

- **One fix at a time, confirmed on Chris's screen** for anything `needs-chris`. Batch
  workflows are for investigation, never for changes (memory: one-fix-at-a-time-confirmed).
- **Purge the startup cache before any chrome-side live test** — edits under
  `powerbrowser/shell/*.js` otherwise silently do not run (memory: chrome-js-startup-cache):

      rm -rf objdir/tmp/profile-default/startupCache
      MOZ_PURGE_CACHES=1 ./objdir/dist/bin/powerbrowser -purgecaches

- **Theia rebuild loop** after editing an extension (memory: live-gui-debug-loop):

      nix develop .#theia --command bash -c 'cd theia && yarn --cwd extensions/<ext> build \
        && cd applications/browser && PATH="$PWD/node_modules/.bin:$PWD/../../node_modules/.bin:$PATH" \
        theia build --app-target=browser --mode development'

  then restart the sidecar (`theia build` kills the running backend); measure the live DOM, never trust a green gate for anything visual:

      cd theia/applications/browser && POWERBROWSER_TOKEN_DISABLE=1 \
        THEIA_CONFIG_DIR="$HOME/.config/powerbrowser" \
        PATH="$PWD/node_modules/.bin:$PWD/../../node_modules/.bin:$PATH" \
        theia start --port 4000 --hostname 127.0.0.1

- **Explicit-path commits** (`git commit -- <files>`), never `-a`; leave `.planning/STATE.md`
  and `.planning/state.json` alone (memory: concurrent-sessions-on-main).
- **The other session's uncommitted files stay untouched:** `main-area-exemption.ts`,
  `mode-service.ts`, `modes-frontend-module.ts`, `group-actor-client.ts`,
  `browser-window-command.ts`, `tab-query-service.ts`, `jar.mn`, the three `verify-mode-*`
  scripts, 14-04/14-05 plans, 14-UAT.md, GUI-DEFECTS.md (test 12). Do not stage or commit them.
- **User-facing copy:** product named "Power Browser", plain language, a real on-screen next
  step, no internal identifier (no pref key, port, tab id, message kind, command id, raw
  exception). Every new string goes into the phase's copy table first.
- **Hard rules hold:** never edit Theia core or Gecko outside the patch stack; stage before
  trusting `scan-brand-residue.mjs`; patches are regenerated, never text-edited.
