#!/usr/bin/env python3
"""Checks-before-code gate: every claimed due row names a check; done and verified due rows prove it failed first."""
import argparse
import hashlib
import json
import os
from pathlib import Path

DONE = ("done", "verified")


def parse_phase(value):
    try:
        parts = str(value).strip().split(".")
        if not parts or any(p == "" for p in parts):
            return None
        return tuple(int(p) for p in parts)
    except ValueError:
        return None


def due_rows(data):
    cur_raw = data.get("current_phase")
    cur_p = parse_phase(cur_raw) if isinstance(cur_raw, str) and cur_raw.strip() else None
    rows = []
    items = data.get("items")
    if not isinstance(items, list):
        return None
    for row in items:
        if not isinstance(row, dict):
            continue
        if row.get("status") not in ("open", "done", "verified"):
            continue
        rp_raw = str(row.get("phase", ""))
        row_p = parse_phase(rp_raw) if rp_raw.strip() else None
        if not rp_raw.strip() or cur_p is None or row_p is None or row_p <= cur_p:
            rows.append(row)
    return rows


def check_key(root, path_part):
    """Canonical key of a test_ref path part: the path resolved under root, relative
    to root, in POSIX form. phase-gate.py and ledger-amend.py hold this same code. Raises
    ValueError with the violation text for an absolute path, one that leaves root, or
    one that passes through a symlink (its resolved and lexically normalized paths differ)."""
    if Path(path_part).anchor:
        raise ValueError("check path must be relative")
    try:
        root_r = Path(root).resolve()
        target = (root_r / path_part).resolve()
        key = target.relative_to(root_r).as_posix()
    except (OSError, RuntimeError, ValueError):
        raise ValueError("check not found") from None
    if target != Path(os.path.normpath(root_r / path_part)):
        raise ValueError("check path must not pass through a symlink")
    return key


def main(argv=None):
    ap = argparse.ArgumentParser(prog="phase-gate.py")
    ap.add_argument("--root", default=".")
    args = ap.parse_args(argv)
    root = Path(args.root)
    ledger = root / "ledger" / "REQUIREMENTS.json"
    log = root / "ledger" / "history" / "log.jsonl"
    if not ledger.is_file():
        print("LEDGER: REQUIREMENTS.json missing")
        return 1
    try:
        data = json.loads(ledger.read_text(encoding="utf-8"))
    except Exception:
        print("LEDGER: REQUIREMENTS.json unparsable")
        return 1
    if not log.is_file():
        print("LEDGER: history/log.jsonl missing")
        return 1
    try:
        ops = [json.loads(line) for line in log.read_text(encoding="utf-8").splitlines()
               if line.strip()]
    except Exception:
        print("LEDGER: history/log.jsonl unparsable")
        return 1
    items = data.get("items")
    if not isinstance(items, list):
        print("LEDGER: items is not a list")
        return 1
    failed = {}
    completed_at = {}
    for op in ops:
        if not isinstance(op, dict):
            continue
        changes = op.get("changes")
        moved = changes.get("status") if isinstance(changes, dict) else None
        # The row's last move into done/verified; done -> verified is not a new completion.
        if isinstance(moved, list) and len(moved) == 2 and moved[0] not in DONE \
                and moved[1] in DONE and isinstance(op.get("v"), int):
            completed_at[op.get("id")] = op["v"]
        if op.get("op") == "check-fail" and isinstance(op.get("id"), str) \
                and isinstance(op.get("ref"), str) and op.get("ref").strip() \
                and isinstance(op.get("cmd"), str) and op.get("cmd").strip() \
                and isinstance(op.get("exit"), int) and op["exit"] != 0 \
                and isinstance(op.get("output"), str) and op.get("output").strip() \
                and isinstance(op.get("sha256"), str) and op.get("sha256").strip() \
                and isinstance(op.get("head"), str):
            failed[(op["id"], op["ref"])] = op
    locks = data.get("check_locks")
    if locks is not None and not (
            isinstance(locks, dict) and isinstance(locks.get("commit"), str)
            and isinstance(locks.get("files"), dict)
            and all(isinstance(v, str) for v in locks["files"].values())):
        print("LEDGER: check_locks must be an object or null")
        return 1
    lock_files = locks["files"] if locks is not None else {}
    baseline = data.get("check_baseline")
    if not isinstance(baseline, int) or isinstance(baseline, bool):
        baseline = None
    root_r = root.resolve()
    out = []
    owners = {}  # canonical check (key plus any ::node part) -> first due row naming it
    for row in due_rows(data):
        rid = str(row.get("id", "?"))
        status = row.get("status")
        ref = row.get("test_ref", "")
        ref = ref if isinstance(ref, str) else ""
        if not ref.strip():
            out.append(f"{rid}: missing check (empty test_ref)")
            continue
        path_part, sep, node = ref.partition("::")
        try:
            key = check_key(root_r, path_part.strip())
        except ValueError as exc:
            out.append(f"{rid}: {exc} ({ref})")
            continue
        check = key + sep + node
        if check in owners:
            out.append(f"{rid}: check {ref} is also the check of {owners[check]}; "
                       "each row needs its own test")
        else:
            owners[check] = rid
        if not (root_r / key).is_file():
            out.append(f"{rid}: check not found ({ref})")
            continue
        if status == "open":
            continue
        done_v = completed_at.get(rid)
        if baseline is not None and done_v is not None and done_v <= baseline:
            continue  # completed before the user's check baseline: no failure proof needed
        proof = failed.get((rid, ref))
        if proof is None:
            out.append(f"{rid}: check never failed (no recorded failure for {ref})")
        elif key in lock_files and proof.get("sha256") != lock_files[key]:
            out.append(f"{rid}: recorded failure is stale (test file changed since the failing run for {ref})")
    for key, locked in lock_files.items():
        try:
            now = hashlib.sha256((root_r / key).read_bytes()).hexdigest()
        except OSError:
            out.append(f"locked check missing: {key}")
            continue
        if now != locked:
            out.append(f"{key}: test file changed (locked {locked}, now {now})")
    for line in out:
        print(line)
    return 1 if out else 0


if __name__ == "__main__":
    raise SystemExit(main())
