#!/usr/bin/env python3
"""Status summary: one line per row plus a totals line."""
import argparse
import datetime
import hashlib
import json
from pathlib import Path

STATUS_VALUES = ["open", "done", "verified", "deferred-requested",
                 "deferred-approved", "dropped"]
DEFERRAL_SET = {"deferred-requested", "deferred-approved"}


def age_days(raw):
    try:
        day = datetime.date.fromisoformat(str(raw))
    except ValueError:
        return "?"
    return str((datetime.date.today() - day).days)


def parse_phase_like(value):
    try:
        parts = str(value).strip().split(".")
        if not parts or any(p == "" for p in parts):
            return None
        return tuple(int(p) for p in parts)
    except ValueError:
        return None


def snapshot_payload(data, digest):
    counts = {s: 0 for s in STATUS_VALUES}
    rows = []
    for row in data.get("items", []):
        if not isinstance(row, dict):
            continue
        if row.get("status") in counts:
            counts[row["status"]] += 1
        rows.append({"id": row.get("id", "?"), "status": row.get("status", "?"),
                     "text": str(row.get("text", ""))[:120]})
    cur = data.get("current_phase")
    return {"ledger_version": data.get("ledger_version"),
            "checksums_sha256": digest,
            "current_phase": cur if isinstance(cur, str) else None,
            "counts": counts, "rows": rows}


def write_snapshot(root, data, phase_dir):
    try:
        digest = hashlib.sha256((Path(root) / "ledger" / "checksums.sha256")
                                .read_bytes()).hexdigest()
    except OSError:
        print("LEDGER: checksums.sha256 missing or unreadable")
        return 1
    payload = snapshot_payload(data, digest)
    target = Path(root) / phase_dir / "LEDGER_SNAPSHOT.md"  # a relative --phase-dir is under --root
    target.parent.mkdir(parents=True, exist_ok=True)
    body = ("# LEDGER_SNAPSHOT\n\n"
            "Machine-readable ledger state for this GSD phase directory. "
            "The JSON block below is the contract; the prose above it is context.\n\n"
            f"ledger_version: {payload['ledger_version']} | "
            f"current_phase: {payload['current_phase']} | "
            f"rows: {len(payload['rows'])}\n\n"
            "```json\n" + json.dumps(payload, indent=2) + "\n```\n")
    target.write_text(body, encoding="utf-8")
    print(f"LEDGER: snapshot wrote {target}")
    return 0


def main():
    ap = argparse.ArgumentParser(prog="ledger-report.py")
    ap.add_argument("--root", default=".")
    ap.add_argument("--export-gsd", action="store_true",
                    help="write LEDGER_SNAPSHOT.md into --phase-dir")
    ap.add_argument("--phase-dir", default=None)
    args = ap.parse_args()
    if args.export_gsd and not args.phase_dir:
        ap.error("--export-gsd needs --phase-dir DIR")
    ledger = Path(args.root) / "ledger" / "REQUIREMENTS.json"
    if not ledger.is_file():
        print("LEDGER: REQUIREMENTS.json missing")
        return 1
    try:
        data = json.loads(ledger.read_text(encoding="utf-8"))
    except Exception:
        print("LEDGER: REQUIREMENTS.json unparsable")
        return 1
    items = data.get("items")
    if not isinstance(items, list):
        print("LEDGER: items is not a list")
        return 1
    if args.export_gsd:
        return write_snapshot(args.root, data, args.phase_dir)
    counts = {s: 0 for s in STATUS_VALUES}
    for row in items:
        rid = str(row.get("id", "?"))
        status = str(row.get("status", "?"))
        text = str(row.get("text", ""))[:80]
        line = f"{rid}  {status}  {text}"
        if status in DEFERRAL_SET:
            line += (f"  owner={row.get('owner', '')} "
                     f"phase={row.get('phase', '')} "
                     f"age={age_days(row.get('deferred_at', ''))}d")
        print(line)
        if status in counts:
            counts[status] += 1
    parts = [f"{s}={counts[s]}" for s in STATUS_VALUES if counts[s]]
    tail = ", ".join(parts) if parts else "none"
    cur = data.get("current_phase")
    phase_str = cur.strip() if isinstance(cur, str) and cur.strip() else "unset"
    cur_p = parse_phase_like(cur) if isinstance(cur, str) and cur.strip() else None
    due = 0
    for row in items:
        if not isinstance(row, dict) or row.get("status") != "open":
            continue
        rp = str(row.get("phase", ""))
        row_p = parse_phase_like(rp) if rp.strip() else None
        if not rp.strip() or cur_p is None or row_p is None or row_p <= cur_p:
            due += 1
    print(f"{len(items)} rows: {tail} | phase={phase_str} due={due}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
