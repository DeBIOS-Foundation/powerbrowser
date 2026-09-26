#!/usr/bin/env python3
"""PostToolUse check: verify both ledger checksum lines."""
import hashlib
import json
import os
import sys
from pathlib import Path

PARSE_MSG = "ledger-checksum-guard: cannot parse hook input"
FIX = ("ledger/ changed outside ledger-amend.py; stop and ask the user to restore it "
       "(for example `git checkout -- ledger/`)")


def project_root(payload):
    env = os.environ.get("CLAUDE_PROJECT_DIR")
    if env:
        return env
    cwd = payload.get("cwd")
    if isinstance(cwd, str) and cwd:
        return cwd
    return os.getcwd()


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        print(f"{PARSE_MSG}; {FIX}", file=sys.stderr)
        return 2
    if not isinstance(payload, dict):
        print(f"{PARSE_MSG}; {FIX}", file=sys.stderr)
        return 2
    root = Path(project_root(payload))
    ledger_dir = root / "ledger"
    if not ledger_dir.is_dir():
        print("LEDGER: ledger/ directory missing; if this project has no ledger yet, "
              f"run `python3 scripts/ledger-amend.py init`; otherwise {FIX}", file=sys.stderr)
        return 2
    ledger = ledger_dir / "REQUIREMENTS.json"
    log = ledger_dir / "history" / "log.jsonl"
    sums = ledger_dir / "checksums.sha256"
    for path, name in ((ledger, "REQUIREMENTS.json"),
                       (log, "history/log.jsonl"),
                       (sums, "checksums.sha256")):
        if not path.is_file():
            print(f"LEDGER: {name} missing; {FIX}", file=sys.stderr)
            return 2
    try:
        lines = sums.read_text(encoding="utf-8").splitlines()
    except OSError:
        print(f"LEDGER: checksums.sha256 unreadable; {FIX}", file=sys.stderr)
        return 2
    want = {}
    for line in lines:
        parts = line.split()
        if len(parts) >= 2:
            want[parts[1]] = parts[0]
    ok = True
    for name, path in (("REQUIREMENTS.json", ledger),
                       ("history/log.jsonl", log)):
        try:
            digest = sha(path)
        except OSError:
            print(f"LEDGER: {name} unreadable; {FIX}", file=sys.stderr)
            ok = False
            continue
        if want.get(name) != digest:
            print(f"LEDGER: checksum mismatch for {name}; {FIX}", file=sys.stderr)
            ok = False
    return 0 if ok else 2


if __name__ == "__main__":
    raise SystemExit(main())
