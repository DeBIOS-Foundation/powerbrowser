#!/usr/bin/env python3
"""PreToolUse/SessionEnd guard: one session per worktree via .worktree-lock."""
import json
import os
import subprocess
import sys
import time
from pathlib import Path

PARSE_MSG = "worktree-session-guard: cannot parse hook input"
WRITE_MSG = "worktree-session-guard: cannot write lock file"
LOCK_NAME = ".worktree-lock"
LOCK_TMP = ".worktree-lock.tmp"
STALE_SECONDS = 2 * 60 * 60
WRITE_TOOLS = {"edit", "write", "multiedit", "notebookedit", "bash", "pwsh"}


def project_root(payload):
    env = os.environ.get("CLAUDE_PROJECT_DIR")
    if env:
        return env
    cwd = payload.get("cwd")
    if isinstance(cwd, str) and cwd:
        return cwd
    return os.getcwd()


def worktree_of(start):
    try:
        proc = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            cwd=str(start), capture_output=True, text=True, timeout=15)
    except (OSError, subprocess.SubprocessError):
        return None
    if proc.returncode != 0:
        return None
    top = proc.stdout.strip()
    return top or None


def branch_of(worktree):
    try:
        proc = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            cwd=str(worktree), capture_output=True, text=True, timeout=15)
    except (OSError, subprocess.SubprocessError):
        return "unknown"
    name = proc.stdout.strip()
    if not name or name == "HEAD":
        try:
            sha = subprocess.run(
                ["git", "rev-parse", "--short", "HEAD"],
                cwd=str(worktree), capture_output=True, text=True,
                timeout=15)
        except (OSError, subprocess.SubprocessError):
            return "unknown"
        short = sha.stdout.strip()
        return f"detached@{short}" if short else "unknown"
    return name


def exclude_path(top):
    try:
        proc = subprocess.run(
            ["git", "rev-parse", "--git-path", "info/exclude"],
            cwd=str(top), capture_output=True, text=True, timeout=15)
    except (OSError, subprocess.SubprocessError):
        return None
    if proc.returncode != 0:
        return None
    raw = proc.stdout.strip()
    if not raw:
        return None
    path = Path(raw)
    if not path.is_absolute():
        path = Path(top) / path
    return path


def ensure_excluded(top):
    path = exclude_path(top)
    if path is None:
        return
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        raw = path.read_text(encoding="utf-8") if path.is_file() else ""
    except OSError:
        return
    wanted = {LOCK_NAME, LOCK_TMP}
    if wanted <= {line.strip() for line in raw.splitlines()}:
        return
    try:
        with path.open("a", encoding="utf-8") as fh:
            if raw and not raw.endswith("\n"):
                fh.write("\n")
            for line in sorted(wanted):
                if line not in {l.strip() for l in raw.splitlines()}:
                    fh.write(line + "\n")
    except OSError:
        pass


def read_lock(path):
    try:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def claim(path, worktree, branch, session_id):
    data = {
        "worktree": str(worktree),
        "branch": branch,
        "session_id": session_id,
        "started": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    tmp = Path(str(path) + ".tmp")
    tmp.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    os.replace(tmp, path)


def touch(path):
    try:
        os.utime(path, None)
    except OSError:
        pass


def lock_stale(path):
    try:
        age = time.time() - os.path.getmtime(path)
    except OSError:
        return True
    return age > STALE_SECONDS


def block_message(worktree, branch, owner, path):
    return (
        f"STOP: {branch} owned by session {owner} in {worktree} "
        f"({LOCK_NAME} holds the lock). If that session is gone, "
        f"clear the stale lock with: rm {path} and retry."
    )


def handle_session_end(payload):
    session_id = str(payload.get("session_id") or "")
    top = worktree_of(project_root(payload))
    if top is None:
        return 0
    lock_path = Path(top) / LOCK_NAME
    if not session_id:
        return 0
    lock = read_lock(str(lock_path))
    if isinstance(lock, dict) and lock.get("session_id") == session_id:
        try:
            lock_path.unlink()
        except OSError:
            pass
    return 0


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        print(PARSE_MSG, file=sys.stderr)
        return 2
    if not isinstance(payload, dict):
        print(PARSE_MSG, file=sys.stderr)
        return 2
    if str(payload.get("hook_event_name") or "") == "SessionEnd":
        return handle_session_end(payload)
    tool = str(payload.get("tool_name", "")).lower()
    if tool not in WRITE_TOOLS:
        return 0
    session_id = str(payload.get("session_id") or "")
    if not session_id:
        return 0
    top = worktree_of(project_root(payload))
    if top is None:
        return 0
    branch = branch_of(top)
    lock_path = str(Path(top) / LOCK_NAME)
    lock = read_lock(lock_path)
    if isinstance(lock, dict) and lock.get("session_id") == session_id:
        touch(lock_path)
        return 0
    if lock is None or not isinstance(lock, dict) or not lock.get(
            "session_id") or lock_stale(lock_path):
        try:
            claim(lock_path, top, branch, session_id)
        except OSError:
            print(f"{WRITE_MSG} {lock_path}", file=sys.stderr)
            return 2
        ensure_excluded(top)
        return 0
    print(block_message(top, branch, lock.get("session_id"), lock_path),
          file=sys.stderr)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
