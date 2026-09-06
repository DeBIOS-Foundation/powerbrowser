# AI Review UX + Backend Adapters — Discussion Brief

Date: 2026-09-06. Purpose: capture the Antigravity research, the goal, and Theia's
existing capabilities so a build plan can be written later. No code changes proposed.

## Goal

Recreate Antigravity 1.x's best editor GUI inside Power Browser's Theia sidecar —
see what the LLM just generated, highlight a section and chat about only that,
accept/reject/edit per chunk or line — while letting the user pick the backend
(opencode, Pi, DSH). GUI stays backend-agnostic; each backend snaps in as a
Theia extension.

## What was discussed

1. Antigravity was never open source (proprietary VS Code fork + licensed Windsurf
   tech). Only `google-antigravity/antigravity-cli` is public. Behaviors were
   reconstructed from docs, changelog, and community guides instead of source.
2. Theia 1.74.1 already composes the full AI stack in this repo
   (`theia/applications/browser/package.json`): ai-chat, ai-chat-ui,
   ai-code-completion, ai-core, ai-editor, ai-ide, ai-mcp, ai-openai,
   ai-anthropic, ai-terminal. Change Sets + context variables cover the two core
   behaviors (review what was added; highlight-to-chat a section).
3. Recommended design: one thin extension per backend
   (`backend-opencode`, `backend-pi`, `backend-dsh`) + one shared
   `@powerbrowser/ai-review-ui` for the Antigravity-style polish. Selection reuses
   the built-in `@agent`/model picker. Config-only OpenAI-compatible hookup first,
   native ChatAgent wrapper second.

## Antigravity behavior spec (what to copy)

- Inline chat (Cmd/Ctrl+I) scoped to cursor or selection; selection = precision.
- Diff View: inline/split, per-chunk Accept/Reject/Edit, per-line +/- on hover,
  per-file and Accept/Reject All, file list with counts, History + Revert.
- Review Changes pane: conversation-scoped multi-file diff list.
- Artifacts with line comments: agent pauses per review policy, `C` comments on a
  line, `D` deletes, submit steers the agent's next turn without stopping it.
- Highlight-to-ask: selection explain/fix/review, `Explain and fix` on hover,
  `Send to Agent` from Problems, quote-response-as-context, `/btw` side question.
- Tab family: file-wide Supercomplete, Tab-to-Jump/Import, highlight inserted text.
- Manager View + built-in Chromium visual verification (parallel agents, task
  lists, plans, screenshots, recordings).

## Theia capabilities already present (Theia 1.74.1)

- Change Sets: proposed edits staged above chat input, diff-editor review, apply
  selectively or all, session persistence (25 sessions, changesets restorable).
- Context variables: `#file`, `#selectedText`, drag-drop, `#`-autocomplete;
  start-chat-from-editor; terminal assistance on Ctrl+I; inline assists (Ctrl+I)
  documented for the Claude Code agent since the 2025-11 release.
- Agents (Coder, Architect, Universal, Orchestrator, Command), modes on Ctrl+M,
  model picker, slash commands, MCP, skills, tool-call confirmation, App Tester
  (browser E2E via DevTools/Playwright MCP).
- Gaps vs Antigravity: no per-line comment-to-steer loop, no `/btw` ephemeral
  question, no file-wide Supercomplete Tab-accept. That gap list is the build scope.

## Snap-in contract (agnostic core)

- Backend extensions implement `LanguageModel` (+ registry) and `ChatAgent`
  (`bind(ChatAgent).toService(...)`) with prompt templates, tool functions, and
  key/URL/binary preferences. They emit Change Sets; they never touch review UI.
- GUI extensions consume only the agent/ChangeSet/context-variable contracts.
- Packaging follows `theia/extensions/tab-uris`: `theiaExtensions`
  frontend/backend modules, versions pinned in `theia/package.json` resolutions,
  one dependency line in `theia/applications/browser/package.json`,
  built by `yarn build:extensions`. Adding a backend = add a folder + one line.
- Rebrand selects backends via `configuration.toml`, consistent with Phase 2 inputs.

## Pointers

- Antigravity CLI (open): https://github.com/google-antigravity/antigravity-cli
- Diff Command spec: https://antigravity.google/docs/cli/commands/diff/
- Reviewing Artifacts spec: https://antigravity.google/docs/cli/artifacts/
- Review Changes (IDE): https://antigravity.google/docs/ide/review-changes-editor/
- Diff View guide: https://antigravitylab.net/en/articles/editor/antigravity-diff-view-advanced-guide
- Inline chat guide: https://antigravitylab.net/en/articles/editor/antigravity-inline-chat-cmd-i-mastery
- Theia AI framework: https://theia-ide.org/docs/theia_ai/
- Theia AI end-user features: https://theia-ide.org/docs/user_ai/
- Theia Coder (modes, changesets): https://theia-ide.org/docs/theia_coder/
- Change Sets deep dive: https://eclipsesource.com/blogs/2025/03/11/theia-ai-change-sets-managing-complex-ai-change-suggestions/
- Claude Code native integration (adapter template):
  https://eclipsesource.com/blogs/2025/10/14/its-released-your-native-claude-code-ide-integration-in-theia/
- Cline DiffViewProvider (diff pattern cited by Theia maintainers):
  https://github.com/cline/cline/blob/main/src/integrations/editor/DiffViewProvider.ts
- Kilo Code vs Cline vs Continue comparison (OSS alternatives):
  https://andrew.ooo/answers/kilo-code-vs-cline-vs-continue-open-source-coding-agents-july-2026/
- Old Antigravity builds: https://antigravity.google/releases (last good 1.x: 1.23.2;
  set `update.mode: none` immediately; server-side minimum-version lockout may
  eventually refuse old clients)

## Open questions for planning

- What exactly are "Pi" and "DSH" here (binary, SDK, or HTTP endpoint)? Decides
  config-only vs native-wrapper adapter per backend.
- Which backend goes first? Suggestion: opencode (open source, inspectable).
- Is the shared review-UI scope just line-comment steering + Review Changes pane,
  or also Supercomplete-style Tab accept and browser verification?
- Does the sidecar currently enable AI features by default, and with which
  provider keys? Verify before speccing UX on top.
