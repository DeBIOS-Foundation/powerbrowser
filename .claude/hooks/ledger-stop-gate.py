#!/usr/bin/env python3
"""Stop hook: the completion gate. Refuse to stop while the ledger is incomplete."""
import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path

PARSE_MSG = "ledger-stop-gate: cannot parse hook input"


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


def check_script(root):
    for cand in (Path(root) / "scripts" / "check-ledger.py",
                 Path(root) / "core" / "scripts" / "check-ledger.py",
                 kit_root() / "core" / "scripts" / "check-ledger.py"):
        if cand.is_file():
            return cand
    return None


def block_once(payload, message, root):
    """2 the first time this session sees this exact message, then 0. State lives
    in <root>/.claude/ledger-state/ (never committed), not /tmp: DSH's hook
    bridge always sends stop_hook_active false, so this is what ends a loop
    there, and a sandboxed /tmp may not survive until the next Stop."""
    sid = str(payload.get("session_id") or "")
    if not sid:
        print(message, file=sys.stderr)
        return 2
    state_dir = Path(root) / ".claude" / "ledger-state"
    state = state_dir / (
        "stop-gate-" + hashlib.sha256(sid.encode()).hexdigest()[:16])
    digest = hashlib.sha256(stable_digest_source(message).encode()).hexdigest()
    try:
        if state.read_text(encoding="utf-8") == digest:
            return 0
    except OSError:
        pass
    try:
        state_dir.mkdir(parents=True, exist_ok=True)
        ignore = state_dir / ".gitignore"
        if not ignore.exists():
            ignore.write_text("*\n", encoding="utf-8")
        state.write_text(digest, encoding="utf-8")
    except OSError:
        pass
    print(message, file=sys.stderr)
    return 2


def stable_digest_source(message):
    """Violation lines only: checker `check output:` tail lines and the
    `check_cmd skipped ...` / `check_cmd not set ...` notice lines change
    between runs (durations, timestamps), and the digest must not cover them,
    or block_once would never yield in DSH while a real check fails."""
    kept = [line for line in message.splitlines()
            if not line.strip().startswith("LEDGER: check output:")
            and "check_cmd skipped" not in line
            and "check_cmd not set" not in line]
    return "\n".join(kept)


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        print(PARSE_MSG, file=sys.stderr)
        return 2
    if not isinstance(payload, dict):
        print(PARSE_MSG, file=sys.stderr)
        return 2
    if payload.get("stop_hook_active") is True:
        return 0
    root = project_root(payload)
    if not (Path(root) / "ledger").is_dir():
        return 0
    script = check_script(root)
    if script is None:
        return block_once(payload, "LEDGER: check-ledger.py not found; "
                                    "install the kit scripts (G11 layout)", root)
    proc = subprocess.run([sys.executable, str(script),
                           "--root", str(root),
                           "--complete", "--run-check"],
                          capture_output=True, text=True)
    if proc.returncode != 0:
        lines = [line.strip() for line in
                 (proc.stdout + proc.stderr).splitlines()
                 if line.strip()]
        message = "\n".join(["LEDGER: completion gate fails; "
                              "do not claim the phase is complete while this fails:"]
                             + [f"LEDGER: {line}" for line in lines]
                             + ["LEDGER: finish the due rows; if you are waiting "
                                "on the user, say so and stop.",
                                "LEDGER: list the pending deferral requests for the user "
                                "and ask for APPROVE <ID> or REJECT <ID> <reason>, "
                                "one per line.",
                                "LEDGER: Never approve them yourself."])
        return block_once(payload, message, root)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
