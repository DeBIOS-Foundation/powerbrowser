#!/usr/bin/env python3
"""UserPromptSubmit hook: the only path recording approvals, rejections and cuts."""
import json
import os
import re
import subprocess
import sys
from pathlib import Path

PARSE_MSG = "ledger-approve-hook: cannot parse hook input"
CMD_RE = re.compile(r"^(APPROVE|REJECT|DROP)\s+(\S+)(?:\s+(.*))?$", re.IGNORECASE)
ID_RE = re.compile(r"^[A-Z][A-Z0-9]*-[0-9]+$")
ID_LIKE = re.compile(r"^[A-Za-z][A-Za-z0-9]*-[0-9]+$")
BULK_MSG = ("one APPROVE per ID; bulk approvals are refused "
            "(item 14: name a single ID per line)")


def project_root(payload):
    env = os.environ.get("CLAUDE_PROJECT_DIR")
    if env:
        return env
    cwd = payload.get("cwd")
    if isinstance(cwd, str) and cwd:
        return cwd
    return os.getcwd()


def kit_root():
    return Path(__file__).resolve().parents[3]


def amend_script(root):
    for cand in (Path(root) / "scripts" / "ledger-amend.py",
                 Path(root) / "core" / "scripts" / "ledger-amend.py",
                 kit_root() / "core" / "scripts" / "ledger-amend.py"):
        if cand.is_file():
            return cand
    return None


def refuse(line, why):
    return f"LEDGER: {line}: {why}"


def is_bulk(target):
    return target.lower() == "all" or any(c in target for c in "*?,") or ".." in target


def parse_line(raw):
    """None for prose; ("error", msg) for a refused command; (action, id, reason) otherwise.

    A line is a command only when its second word is an ID or a bulk marker, so prose
    such as "Approve the design" or "Drop the retry logic" passes through untouched.
    A bulk marker counts only after an upper-case verb, so "Approve all the changes"
    is prose too."""
    line = raw.strip()
    m = CMD_RE.match(line)
    if not m:
        return None
    verb, target, rest = m.group(1), m.group(2).rstrip(".!;:"), (m.group(3) or "").strip()
    if is_bulk(target):
        if verb != verb.upper():
            return None
        return ("error", refuse(line, BULK_MSG))
    if not ID_LIKE.match(target):
        return None
    if not ID_RE.match(target):
        return ("error", refuse(line, f"use the exact ledger ID {target.upper()!r}"))
    verb = verb.upper()
    if verb == "APPROVE":
        if rest:
            return ("error", refuse(line, "APPROVE takes exactly one ID and nothing else"))
        return ("approve", target, "")
    if not rest:
        return ("error", refuse(line, f"{verb} needs a reason "
                                      f"(for example {verb} {target} <reason>)"))
    return (verb.lower(), target, rest)


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        print(PARSE_MSG, file=sys.stderr)
        return 2
    if not isinstance(payload, dict):
        print(PARSE_MSG, file=sys.stderr)
        return 2
    prompt = payload.get("prompt", "")
    if prompt is None:
        prompt = ""
    if not isinstance(prompt, str):
        print(PARSE_MSG, file=sys.stderr)
        return 2
    root = project_root(payload)
    commands, errors = [], []
    for raw in prompt.splitlines():
        parsed = parse_line(raw)
        if parsed is None:
            continue
        if parsed[0] == "error":
            errors.append(parsed[1])
        else:
            action, rid, reason = parsed
            commands.append({"quote": raw.strip(), "action": action,
                             "id": rid, "reason": reason})
    if errors:
        for err in errors:
            print(err, file=sys.stderr)
        return 2
    if not commands:
        return 0
    script = amend_script(root)
    if script is None:
        print("LEDGER: ledger-amend.py is not installed; "
              "cannot record the decision", file=sys.stderr)
        return 2
    failures = []
    recorded = []
    for cmd in commands:
        argv = [str(script), "--root", str(root), cmd["action"],
                "--id", cmd["id"]]
        if cmd["action"] in ("reject", "drop"):
            argv += ["--reason", cmd["reason"]]
        argv += ["--quote", cmd["quote"]]
        proc = subprocess.run([sys.executable, *argv],
                              capture_output=True, text=True)
        if proc.returncode != 0:
            tail = (proc.stderr or proc.stdout).strip().splitlines()
            failures.append(tail[-1] if tail else
                            f"LEDGER: {cmd['quote']}: amend failed")
        else:
            recorded.append(f"LEDGER: recorded {cmd['action']} {cmd['id']} "
                            f"from your line: {cmd['quote']}")
    if failures:
        # The earlier lines are already in the ledger.
        for line in recorded:
            print(line, file=sys.stderr)
        for failure in failures:
            print(failure, file=sys.stderr)
        return 2
    for line in recorded:
        print(line)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
