#!/usr/bin/env python3
"""PreToolUse gate: block direct ledger writes; vet Bash ledger mentions;
block agents from answering file-queue questions."""
import json
import os
import re
import shlex
import sys
from pathlib import Path

PARSE_MSG = "ledger-verify-hook: cannot parse hook input"
BLOCK_FILE = ("LEDGER FROZEN: read the ledger with the Read tool or "
              "scripts/ledger-report.py; change it only with scripts/ledger-amend.py.")
BLOCK_BASH = ("LEDGER FROZEN: this command touches ledger/. Change the ledger only with "
              "scripts/ledger-amend.py; read it with the Read tool, scripts/ledger-report.py, "
              "or one plain read-only command (cat, grep, jq, ls, git diff/log/show/status, "
              "git add) with no shell operators.")
BLOCK_APPROVAL = ("LEDGER FROZEN: only the user can approve, reject or cut. "
                  "The agent must stop and ask the user for APPROVE <ID> or "
                  "REJECT <ID> <reason> (one per line) instead of running "
                  "ledger-amend.py approve, reject, drop, acknowledge-handoff, "
                  "or set-status into deferred-approved or dropped.")
BLOCK_QUESTION = ("QUESTIONS FROZEN: only the user can answer questions. "
                  "The agent must stop and ask the user instead of running "
                  "question-queue.py answer or writing under questions/. "
                  "The user answers from their own terminal: "
                  'python3 scripts/question-queue.py answer --id <QID> --text "<answer>".')
BLOCK_DECISION = ("LEDGER: only the user decides deferrals, through the panel buttons "
                  "or their own terminal")
NESTED_APPROVAL_MSG = ("LEDGER: APPROVE/REJECT/DROP <ID> lines are the user's to type; "
                       "do not pass one to a command (another agent session would record it "
                       "as the user's)")
APPROVAL_LINE = re.compile(r"\b(approve|reject|drop)\s+[a-z][a-z0-9]*-[0-9]+\b", re.IGNORECASE)
AGENT_SUBCOMMANDS = {"init", "add", "set", "set-status", "set-phase", "import-brainstorm",
                     "record-handoff", "record-fail"}
AGENT_STATUSES = {"open", "done", "verified", "deferred-requested"}
AGENT_QUESTION_SUBCOMMANDS = {"ask", "list", "expire"}
KIT_SCRIPTS = {"ledger-amend.py", "check-ledger.py", "ledger-report.py", "phase-gate.py"}  # exact: a look-alike name is not a kit script
READ_ONLY = {"cat", "head", "tail", "grep", "rg", "wc", "jq", "ls", "stat", "diff", "sha256sum"}
SAFE_GIT = {"add", "diff", "log", "show", "status", "blame"}
SHELL_OPS = (";", "&", "|", "<", ">", "`", "$(", "\n")
SPLIT = re.compile(r"[<>|;&()`=$'\",]+")  # pieces of a token that can be paths: >file, --opt=path, code strings
FILE_TOOLS = {"edit", "write", "multiedit", "notebookedit"}  # compared lowercased: Claude Code sends Edit, DSH sends edit
WRITE_TOOLS = {"edit", "write", "multiedit", "notebookedit", "bash", "pwsh"}
BLOCK_HANDOFF = ("LEDGER: ledger changed since the pause hand-off "
                 "(recorded ledger_version={old}, now {new}); stop and ask "
                 "the user to run python3 scripts/ledger-amend.py "
                 "acknowledge-handoff in their own terminal.")


def handoff_tripped(root):
    """(recorded, current) ledger_version of a tripped pause record, else None.
    ledger-session-check.py trips the record at the next session's start when
    the ledger hash changed during the pause (P7-3); only the user's
    acknowledge-handoff clears it. No record, or an untripped one, never blocks."""
    state = Path(root) / ".claude" / "ledger-state" / "handoff.json"
    try:
        record = json.loads(state.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    if isinstance(record, dict) and record.get("tripped") is True:
        new = record.get("current_ledger_version")  # null: the ledger was unreadable
        return record.get("ledger_version"), "unreadable" if new is None else new
    return None


def project_root(payload):
    env = os.environ.get("CLAUDE_PROJECT_DIR")
    if env:
        return env
    cwd = payload.get("cwd")
    if isinstance(cwd, str) and cwd:
        return cwd
    return os.getcwd()


def inside(target, directory):
    """True when target is directory or below it. Case-insensitive on purpose:
    on macOS and Windows file systems LEDGER/ and ledger/ are the same folder."""
    t, d = str(target).lower(), str(directory).lower().rstrip(os.sep)
    return t == d or t.startswith(d + os.sep)


def queue_tail(toks, index):
    """Tokens after a question-queue.py call minus the --root flag and its value."""
    tail = []
    skip_next = False
    for tok in toks[index + 1:]:
        if skip_next:
            skip_next = False
            continue
        if tok == "--root":
            skip_next = True
            continue
        if tok.startswith("--root="):
            continue
        tail.append(tok)
    return tail


def blocks_answer(toks):
    """True unless every question-queue.py call is one the agent may run. An
    allowlist, so answer or an unknown subcommand is blocked too. Any shell
    token that reaches the queue through a wrapper (bash -c
    "...question-queue..." or a variable holding its path) is blocked as well."""
    for i, tok in enumerate(toks):
        base = os.path.basename(tok).lower()
        if base == "question-queue.py":
            tail = queue_tail(toks, i)
            sub = next((t for t in tail if not t.startswith("-")), None)
            if sub is None:
                continue
            if sub not in AGENT_QUESTION_SUBCOMMANDS:
                return True
        elif "question-queue" in tok.lower():
            return True
    return False


def touches_protected(toks, cwd, *dirs):
    """True when any path-like piece of the command resolves into one of dirs."""
    for tok in toks:
        for part in SPLIT.split(tok):
            if not part:
                continue
            p = Path(part).expanduser()
            if not p.is_absolute():
                p = Path(cwd) / p
            try:
                resolved = p.resolve()
            except (OSError, RuntimeError, ValueError):
                return True
            if any(inside(resolved, d) for d in dirs):
                return True
    return False


def touches_ledger(toks, cwd, ledger_dir):
    """True when any path-like piece of the command resolves into ledger/."""
    return touches_protected(toks, cwd, ledger_dir)


def safe_single(command, toks):
    """One plain command that cannot write: a read-only viewer, git inspection or
    staging, or a kit script. Names are matched exactly."""
    if not toks or any(op in command for op in SHELL_OPS):
        return False
    first = os.path.basename(toks[0])
    if first in READ_ONLY:
        return True
    if first == "git":
        return (len(toks) > 1 and toks[1] in SAFE_GIT
                and not any(t.startswith("--output") for t in toks))
    rest = toks[2:] if toks[:2] == ["uv", "run"] else toks
    if rest and rest[0] in ("python", "python3"):
        rest = rest[1:]
    return bool(rest) and os.path.basename(rest[0]) in KIT_SCRIPTS


def amend_tail(toks, index):
    """Tokens after a ledger-amend.py call minus the --root flag and its value."""
    tail = []
    skip_next = False
    for tok in toks[index + 1:]:
        if skip_next:
            skip_next = False
            continue
        if tok == "--root":
            skip_next = True
            continue
        if tok.startswith("--root="):
            continue
        tail.append(tok)
    return tail


def blocks_approval(toks):
    """True unless every ledger-amend.py call is one the agent may run. An allowlist,
    so a substituted, quoted-away or unknown subcommand is blocked too. Any shell
    token that reaches the writer through a wrapper (bash -c "...ledger-amend..."
    or a variable holding its path) is blocked as well."""
    for i, tok in enumerate(toks):
        base = os.path.basename(tok).lower()
        if base == "ledger-amend.py":
            tail = amend_tail(toks, i)
            sub = next((t for t in tail if not t.startswith("-")), None)
            if sub is None:
                continue
            if sub not in AGENT_SUBCOMMANDS:
                return True
            if sub == "set-status":
                status = None
                for j, t in enumerate(tail):
                    if t == "--status" and j + 1 < len(tail):
                        status = tail[j + 1]
                    elif t.startswith("--status="):
                        status = t.split("=", 1)[1]
                if status not in AGENT_STATUSES:
                    return True
        elif "ledger-amend" in tok.lower():
            return True
    return False


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        print(PARSE_MSG, file=sys.stderr)
        return 2
    if not isinstance(payload, dict):
        print(PARSE_MSG, file=sys.stderr)
        return 2
    root = project_root(payload)
    try:
        ledger_dir = (Path(root) / "ledger").resolve()
        questions_dir = (Path(root) / "questions").resolve()
    except OSError:
        print(PARSE_MSG, file=sys.stderr)
        return 2
    tool = str(payload.get("tool_name", "")).lower()
    if tool in WRITE_TOOLS:
        tripped = handoff_tripped(root)
        if tripped is not None:
            print(BLOCK_HANDOFF.format(old=tripped[0], new=tripped[1]), file=sys.stderr)
            return 2
    tool_input = payload.get("tool_input", {})
    if not isinstance(tool_input, dict):
        tool_input = {}
    if tool in FILE_TOOLS:
        raw = tool_input.get("file_path", "") or tool_input.get("notebook_path", "")
        if not isinstance(raw, str) or not raw:
            return 0
        base = payload.get("cwd") if isinstance(payload.get("cwd"), str) else root
        base = base or root
        p = Path(raw)
        if not p.is_absolute():
            p = Path(base) / p
        try:
            target = p.resolve()
        except OSError:
            print(BLOCK_FILE, file=sys.stderr)
            return 2
        if inside(target, ledger_dir):
            print(BLOCK_FILE, file=sys.stderr)
            return 2
        if inside(target, questions_dir):
            print(BLOCK_QUESTION, file=sys.stderr)
            return 2
        return 0
    if tool in ("bash", "pwsh"):
        cmd = tool_input.get("command", "")
        if not isinstance(cmd, str) or not cmd:
            return 0
        if "ledger-decision" in cmd.lower():  # the UltraDogmatic panel's decision route
            print(BLOCK_DECISION, file=sys.stderr)
            return 2
        try:
            toks = shlex.split(cmd)
        except ValueError:
            toks = None  # e.g. a heredoc with an apostrophe; fall back to the name
        if toks is None:
            if "ledger-amend" in cmd.lower():
                print(BLOCK_APPROVAL, file=sys.stderr)
                return 2
            if "question-queue" in cmd.lower() or "questions" in cmd.lower():
                print(BLOCK_QUESTION, file=sys.stderr)
                return 2
        elif blocks_approval(toks):
            print(BLOCK_APPROVAL, file=sys.stderr)
            return 2
        if toks is not None and blocks_answer(toks):
            print(BLOCK_QUESTION, file=sys.stderr)
            return 2
        if APPROVAL_LINE.search(cmd):
            print(NESTED_APPROVAL_MSG, file=sys.stderr)
            return 2
        cwd = payload.get("cwd")
        base = cwd if isinstance(cwd, str) and cwd else root
        touched = ("ledger" in cmd.lower() if toks is None
                   else touches_ledger(toks, base, ledger_dir))
        if touched:
            if toks is not None and safe_single(cmd, toks):
                pass
            else:
                print(BLOCK_BASH, file=sys.stderr)
                return 2
        qtouched = ("questions" in cmd.lower() if toks is None
                    else touches_protected(toks, base, questions_dir))
        if qtouched:
            if toks is not None and safe_single(cmd, toks):
                return 0
            print(BLOCK_QUESTION, file=sys.stderr)
            return 2
        return 0
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
