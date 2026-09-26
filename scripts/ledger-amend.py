#!/usr/bin/env python3
"""Only writer for ledger/. One write path: validate, bump, log, write, sums."""
import argparse
import datetime
import hashlib
import json
import os
import re
import sys
import tempfile
from pathlib import Path

ID_RE = re.compile(r"^[A-Z][A-Z0-9]*-[0-9]+$")
REQ_RE = re.compile(r"^REQ-([0-9]+)$")
STATUS_VALUES = ["open", "done", "verified", "deferred-requested",
                 "deferred-approved", "dropped"]
ROW_FIELDS = ["id", "text", "status", "spec_ref", "test_ref", "code_ref",
              "evidence", "owner", "phase", "deferred_at", "reason"]
DATE_RE = re.compile(r"^[0-9]{4}-[0-9]{2}-[0-9]{2}$")
SOURCE_RE = re.compile(r"^[a-z][a-z0-9-]{0,31}$")
SUMS_MISMATCH = ("ledger/ does not match checksums.sha256: it was changed outside "
                 "ledger-amend.py. Stop and ask the user to restore it (for example "
                 "`git checkout -- ledger/`).")


def fail(msg):
    print(f"ledger-amend: error: {msg}", file=sys.stderr)
    return 1


def ledger_paths(root):
    ledger = Path(root) / "ledger"
    return (ledger / "REQUIREMENTS.json", ledger / "checksums.sha256",
            ledger / "history" / "log.jsonl")


def utc_now():
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def today():
    return datetime.date.today().isoformat()


def atomic_text(path, text):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=str(path.parent),
                               prefix=path.name + ".", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            fh.write(text)
        os.replace(tmp, path)
    finally:
        try:
            os.unlink(tmp)
        except OSError:
            pass
    os.chmod(path, 0o444)


def blank_row(id_, text, spec_ref):
    row = {k: "" for k in ROW_FIELDS}
    row.update({"id": id_, "text": text, "status": "open",
                "spec_ref": spec_ref})
    return row


def validate(data):
    errs = []
    if not isinstance(data.get("ledger_version"), int) or data["ledger_version"] < 1:
        errs.append("ledger_version must be an int >= 1")
    frozen = data.get("frozen_at")
    if frozen is not None and (not isinstance(frozen, str) or not DATE_RE.match(frozen)):
        errs.append("frozen_at must be null or YYYY-MM-DD")
    for key in ("current_phase", "check_cmd"):
        if key in data and data[key] is not None and not isinstance(data[key], str):
            errs.append(f"{key} must be a string or null")
    mf = data.get("mockup_freeze")
    if mf is not None and (not isinstance(mf, dict)
                           or not isinstance(mf.get("variant"), str)
                           or not isinstance(mf.get("path"), str)
                           or not isinstance(mf.get("sha256"), str)):
        errs.append("mockup_freeze must be null or {variant, path, sha256} strings")
    lock = data.get("scope_lock")
    if lock is not None:
        if not isinstance(lock, dict) or not isinstance(lock.get("phase"), str) or not all(
                isinstance(lock.get(k), str) and lock.get(k, "").strip()
                for k in ("source", "sha256")):
            errs.append("scope_lock must be null or {phase, source, sha256} strings")
    if "check_locks" in data and data["check_locks"] is not None:
        locks = data["check_locks"]
        if not isinstance(locks, dict) or not isinstance(locks.get("commit"), str) \
                or not isinstance(locks.get("files"), dict) \
                or any(not isinstance(k, str) or not isinstance(v, str)
                       for k, v in locks["files"].items()):
            errs.append("check_locks must be an object or null")
    base = data.get("check_baseline")
    if base is not None and (not isinstance(base, int) or isinstance(base, bool)):
        errs.append("check_baseline must be an integer or null")
    items = data.get("items")
    if not isinstance(items, list):
        return ["items must be a list"]
    seen = set()
    for row in items:
        rid = str(row.get("id", "?")) if isinstance(row, dict) else "?"
        if not isinstance(row, dict):
            errs.append(f"{rid}: row must be an object")
            continue
        for k in ROW_FIELDS:
            if k not in row:
                errs.append(f"{rid}: missing field {k}")
            elif not isinstance(row[k], str):
                errs.append(f"{rid}: field {k} must be a string")
        if rid in seen:
            errs.append(f"{rid}: duplicate id")
        seen.add(rid)
        if not ID_RE.match(rid):
            errs.append(f"{rid}: malformed id")
        if not row.get("text", ""):
            errs.append(f"{rid}: empty text")
        if row.get("status") not in STATUS_VALUES:
            errs.append(f"{rid}: bad status")
    return errs


def read_log(log_path):
    ops = []
    if Path(log_path).is_file():
        for line in Path(log_path).read_text(encoding="utf-8").splitlines():
            if line.strip():
                ops.append(json.loads(line))
    return ops


def next_req_id(ops):
    best = 0
    for op in ops:
        if isinstance(op, dict) and op.get("op") == "add":
            m = REQ_RE.match(str(op.get("id", "")))
            if m:
                best = max(best, int(m.group(1)))
    return f"REQ-{best + 1:03d}"


def ever_added(ops, items, rid):
    if any(isinstance(r, dict) and r.get("id") == rid for r in items):
        return True
    return any(isinstance(op, dict) and op.get("op") == "add"
               and op.get("id") == rid for op in ops)


def commit(root, data, op, rid, extra, more=()):
    """`more` holds further (op, id, extra) entries, one version each, that go
    into the same single write of each file. A failure between the file
    writes leaves the files out of step with checksums.sha256, which the
    checksum check reports loudly."""
    entries = [(op, rid, extra), *more]
    base = int(data.get("ledger_version", 0))
    data["ledger_version"] = base + len(entries)
    errs = validate(data)
    if errs:
        return fail("; ".join(errs))
    ledger_file, sums_file, log_path = ledger_paths(root)
    try:
        ops = read_log(log_path)
    except (ValueError, OSError) as exc:
        return fail(f"history/log.jsonl unparsable: {exc}")
    ts = utc_now()
    for v, (entry_op, entry_id, entry_extra) in enumerate(entries, start=base + 1):
        ops.append({"v": v, "ts": ts, "op": entry_op, "id": entry_id, **entry_extra})
    atomic_text(ledger_file, json.dumps(data, indent=2) + "\n")
    atomic_text(log_path, "".join(json.dumps(o) + "\n" for o in ops))
    d1 = hashlib.sha256(ledger_file.read_bytes()).hexdigest()
    d2 = hashlib.sha256(log_path.read_bytes()).hexdigest()
    atomic_text(sums_file, f"{d1}  REQUIREMENTS.json\n{d2}  history/log.jsonl\n")
    return 0


def sums_match(ledger_file, sums_file, log_path):
    """True when checksums.sha256 matches both files, so a write never seals an out-of-band change."""
    try:
        want = {}
        for line in sums_file.read_text(encoding="utf-8").splitlines():
            parts = line.split()
            if len(parts) == 2:
                want[parts[1]] = parts[0]
        return all(want.get(name) == hashlib.sha256(path.read_bytes()).hexdigest()
                   for name, path in (("REQUIREMENTS.json", ledger_file),
                                      ("history/log.jsonl", log_path)))
    except OSError:
        return False


def find_row(data, rid):
    for row in data.get("items", []):
        if isinstance(row, dict) and row.get("id") == rid:
            return row
    return None


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


def parse_phase_like(value):
    try:
        parts = str(value).strip().split(".")
        if not parts or any(p == "" for p in parts):
            return None
        return tuple(int(p) for p in parts)
    except ValueError:
        return None


def phase_move_allowed(current, existing, new):
    """True when a frozen-ledger phase write does not push the row later.

    Empty stays allowed (due now). Otherwise the new phase must parse and be
    at or below the larger of the ledger's current_phase and the row's
    existing phase; with no parsable baseline any parsable phase is allowed
    (the row stays due while the current phase is unset)."""
    if isinstance(new, str) and not new.strip():
        return True
    new_p = parse_phase_like(new)
    if new_p is None:
        return False
    cap = None
    if isinstance(current, str) and current.strip():
        cap = parse_phase_like(current)
    if isinstance(existing, str) and existing.strip():
        ex_p = parse_phase_like(existing)
        if ex_p is not None and (cap is None or ex_p > cap):
            cap = ex_p
    if cap is None:
        return True
    return new_p <= cap


def handoff_state_path(root):
    return Path(root) / ".claude" / "ledger-state" / "handoff.json"


def current_handoff(root, ledger_file, sums_file, data):
    try:
        digest = hashlib.sha256(sums_file.read_bytes()).hexdigest()
    except OSError as exc:
        return fail(f"cannot read checksums.sha256: {exc}")
    return {"ledger_version": data.get("ledger_version"),
            "checksums_sha256": digest, "recorded_at": utc_now()}


def handoff_tripped(root):
    """True when the SessionStart hook marked the pause record tripped."""
    try:
        record = json.loads(handoff_state_path(root).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return False
    return isinstance(record, dict) and record.get("tripped") is True


def write_handoff(root, record):
    state = handoff_state_path(root)
    ignore = state.parent / ".gitignore"
    try:
        state.parent.mkdir(parents=True, exist_ok=True)
        if not ignore.exists():
            ignore.write_text("*\n", encoding="utf-8")
        tmp_fd, tmp = tempfile.mkstemp(dir=str(state.parent),
                                       prefix="handoff.", suffix=".tmp")
        with os.fdopen(tmp_fd, "w", encoding="utf-8") as fh:
            fh.write(json.dumps(record, indent=2) + "\n")
        os.replace(tmp, state)
    except OSError as exc:
        return fail(f"cannot write handoff state: {exc}")
    return None


def main(argv=None):
    ap = argparse.ArgumentParser(prog="ledger-amend.py")
    ap.add_argument("--root", default=".")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("init")
    p_add = sub.add_parser("add")
    p_add.add_argument("--text", required=True)
    p_add.add_argument("--id", default=None)
    p_add.add_argument("--spec-ref", default="")
    p_set = sub.add_parser("set")
    p_set.add_argument("--id", required=True)
    p_set.add_argument("--spec-ref", default=None)
    p_set.add_argument("--test-ref", default=None)
    p_set.add_argument("--code-ref", default=None)
    p_set.add_argument("--evidence", default=None)
    p_st = sub.add_parser("set-status")
    p_st.add_argument("--id", required=True)
    p_st.add_argument("--status", required=True)
    p_st.add_argument("--reason", default=None)
    p_st.add_argument("--owner", default=None)
    p_st.add_argument("--phase", default=None)
    p_ap = sub.add_parser("approve")
    p_ap.add_argument("--id", required=True)
    p_ap.add_argument("--quote", required=True)
    p_ap.add_argument("--source", default=None)
    p_rj = sub.add_parser("reject")
    p_rj.add_argument("--id", required=True)
    p_rj.add_argument("--reason", required=True)
    p_rj.add_argument("--quote", required=True)
    p_rj.add_argument("--source", default=None)
    p_dr = sub.add_parser("drop")
    p_dr.add_argument("--id", required=True)
    p_dr.add_argument("--reason", required=True)
    p_dr.add_argument("--quote", required=True)
    p_dr.add_argument("--source", default=None)
    p_sp = sub.add_parser("set-phase")
    p_sp.add_argument("--phase", required=True)
    p_sc = sub.add_parser("set-check")
    p_sc.add_argument("--cmd", dest="check_cmd_value", required=True)
    p_fv = sub.add_parser("freeze-variant")
    p_fv.add_argument("--variant", required=True)
    p_fv.add_argument("--path", required=True)
    p_ls = sub.add_parser("lock-scope")
    p_ls.add_argument("--phase", required=False, default=None)
    p_ls.add_argument("--source", required=False, default=None)
    p_rf = sub.add_parser("record-fail")
    p_rf.add_argument("--id", required=True)
    p_rf.add_argument("--cmd", dest="fail_cmd", required=True)
    p_rf.add_argument("--timeout", type=int, default=300)
    p_lc = sub.add_parser("lock-checks")
    p_lc.add_argument("--commit", required=True)
    sub.add_parser("baseline-checks")
    p_ib = sub.add_parser("import-brainstorm")
    p_ib.add_argument("--file", required=True)
    sub.add_parser("freeze")
    sub.add_parser("record-handoff")
    sub.add_parser("acknowledge-handoff")
    args = ap.parse_args(argv)
    source = {}  # who recorded a user decision, such as the UltraDogmatic panel
    if args.cmd in ("approve", "reject", "drop") and args.source is not None:
        if not SOURCE_RE.fullmatch(args.source):
            return fail("--source must be a short lowercase name (such as panel)")
        source = {"source": args.source}
    ledger_file, sums_file, log_path = ledger_paths(args.root)
    if args.cmd == "init":
        if ledger_file.exists():
            return fail("ledger already exists")
        data = {"ledger_version": 0, "frozen_at": None, "items": [],
                "current_phase": None, "check_cmd": None,
                "mockup_freeze": None, "scope_lock": None,
                "check_locks": None}
        return commit(args.root, data, "init", "", {})
    try:
        data = json.loads(ledger_file.read_text(encoding="utf-8"))
    except Exception as exc:
        return fail(f"cannot read ledger: {exc}")
    if not sums_match(ledger_file, sums_file, log_path):
        return fail(SUMS_MISMATCH)
    try:
        ops = read_log(log_path)
    except (ValueError, OSError) as exc:
        return fail(f"history/log.jsonl unparsable: {exc}")
    if not isinstance(data.get("items"), list):
        return fail("items must be a list")
    if args.cmd == "add":
        rid = args.id or next_req_id(ops)
        if not ID_RE.match(rid):
            return fail(f"{rid}: malformed id")
        if ever_added(ops, data["items"], rid):
            return fail(f"{rid}: id was already added")
        row = blank_row(rid, args.text, args.spec_ref)
        data["items"].append(row)
        return commit(args.root, data, "add", rid, {"row": row})
    if args.cmd == "set":
        row = find_row(data, args.id)
        if row is None:
            return fail(f"{args.id}: unknown id")
        given = {k: v for k, v in
                 (("spec_ref", args.spec_ref), ("test_ref", args.test_ref),
                  ("code_ref", args.code_ref), ("evidence", args.evidence))
                 if v is not None}
        if not given:
            return fail("set needs at least one of --spec-ref/--test-ref/--code-ref/--evidence")
        changes = {k: [row.get(k, ""), v] for k, v in given.items()
                   if row.get(k, "") != v}
        for k, v in given.items():
            row[k] = v
        return commit(args.root, data, "set", args.id, {"changes": changes})
    if args.cmd == "set-status":
        row = find_row(data, args.id)
        if row is None:
            return fail(f"{args.id}: unknown id")
        if args.status not in STATUS_VALUES:
            return fail(f"{args.id}: bad status {args.status}")
        if args.status in ("deferred-approved", "dropped"):
            return fail(f"{args.id}: set-status cannot set {args.status}; "
                         "only the user approval path (approve/drop) reaches it")
        changes = {}
        if args.status == "deferred-requested":
            if not args.owner or not args.phase or not args.reason:
                return fail(f"{args.id}: deferral needs --owner, --phase and --reason")
            if parse_phase_like(args.phase) is None:
                return fail(f"{args.id}: deferral phase must be a phase number (such as 4 or 2.1)")
            for k, v in (("owner", args.owner), ("phase", args.phase),
                         ("reason", args.reason)):
                if row.get(k, "") != v:
                    changes[k] = [row.get(k, ""), v]
                row[k] = v
            if row.get("deferred_at", "") != today():
                changes["deferred_at"] = [row.get("deferred_at", ""), today()]
            row["deferred_at"] = today()
        else:
            for k, v in (("reason", args.reason), ("owner", args.owner),
                         ("phase", args.phase)):
                if v is not None and row.get(k, "") != v:
                    if k == "phase" and data.get("frozen_at") is not None \
                            and not phase_move_allowed(data.get("current_phase"),
                                                       row.get("phase", ""), v):
                        return fail(f"{args.id}: moving phase later is a deferral; "
                                    "use set-status deferred-requested and wait for "
                                    "the user's APPROVE")
                    changes[k] = [row.get(k, ""), v]
                    row[k] = v
        if row.get("status", "") != args.status:
            changes["status"] = [row.get("status", ""), args.status]
        row["status"] = args.status
        return commit(args.root, data, "set-status", args.id, {"changes": changes})
    if args.cmd == "approve":
        row = find_row(data, args.id)
        if row is None:
            return fail(f"{args.id}: unknown id")
        if row.get("status") != "deferred-requested":
            return fail(f"{args.id}: approve needs status deferred-requested "
                        f"(found {row.get('status')})")
        if not isinstance(args.quote, str) or not args.quote.strip():
            return fail(f"{args.id}: approve needs --quote with the user's quoted text")
        changes = {"status": [row.get("status", ""), "deferred-approved"]}
        row["status"] = "deferred-approved"
        return commit(args.root, data, "approve", args.id,
                      {"quote": args.quote, **source, "changes": changes})
    if args.cmd == "reject":
        row = find_row(data, args.id)
        if row is None:
            return fail(f"{args.id}: unknown id")
        if row.get("status") != "deferred-requested":
            return fail(f"{args.id}: reject needs status deferred-requested "
                        f"(found {row.get('status')})")
        if not isinstance(args.reason, str) or not args.reason.strip():
            return fail(f"{args.id}: reject needs --reason")
        if not isinstance(args.quote, str) or not args.quote.strip():
            return fail(f"{args.id}: reject needs --quote with the user's quoted text")
        changes = {"status": [row.get("status", ""), "open"]}
        if row.get("reason", "") != args.reason:
            changes["reason"] = [row.get("reason", ""), args.reason]
        old_phase = row.get("phase", "")
        if old_phase != "":
            changes["phase"] = [old_phase, ""]
            row["phase"] = ""
        row["status"] = "open"
        row["reason"] = args.reason
        return commit(args.root, data, "reject", args.id,
                      {"quote": args.quote, **source, "changes": changes})
    if args.cmd == "drop":
        row = find_row(data, args.id)
        if row is None:
            return fail(f"{args.id}: unknown id")
        if row.get("status") == "dropped":
            return fail(f"{args.id}: already dropped")
        if not isinstance(args.reason, str) or not args.reason.strip():
            return fail(f"{args.id}: drop needs --reason")
        if not isinstance(args.quote, str) or not args.quote.strip():
            return fail(f"{args.id}: drop needs --quote with the user's quoted text")
        changes = {"status": [row.get("status", ""), "dropped"]}
        if row.get("reason", "") != args.reason:
            changes["reason"] = [row.get("reason", ""), args.reason]
        row["status"] = "dropped"
        row["reason"] = args.reason
        return commit(args.root, data, "drop", args.id,
                      {"quote": args.quote, **source, "changes": changes})
    if args.cmd == "set-phase":
        new = args.phase.strip() if isinstance(args.phase, str) else ""
        if not new:
            return fail("set-phase needs --phase with a phase value")
        if parse_phase_like(new) is None:
            return fail(f"current_phase must be a number such as 3 or 2.1: {new}")
        cur = data.get("current_phase")
        if isinstance(cur, str) and cur.strip():
            new_p = parse_phase_like(new)
            cur_p = parse_phase_like(cur)
            if new_p is not None and cur_p is not None and new_p < cur_p:
                return fail(f"set-phase refuses backwards move "
                            f"(current phase {cur}, requested {new})")
        old = data.get("current_phase")
        data["current_phase"] = new
        changes = {"current_phase": [old, new]} if old != new else {}
        return commit(args.root, data, "set-phase", "",
                      {"changes": changes})
    if args.cmd == "set-check":
        raw = args.check_cmd_value
        cmd = raw.strip() if isinstance(raw, str) else ""
        value = cmd if cmd else None
        old = data.get("check_cmd")
        data["check_cmd"] = value
        changes = {"check_cmd": [old, value]} if old != value else {}
        return commit(args.root, data, "set-check", "",
                      {"changes": changes})
    if args.cmd == "freeze-variant":
        variant = args.variant.strip() if isinstance(args.variant, str) else ""
        rel = args.path.strip() if isinstance(args.path, str) else ""
        if not variant:
            return fail("freeze-variant needs --variant with a variant ID")
        if not rel:
            return fail("freeze-variant needs --path with the frozen mockup path")
        try:
            root_resolved = Path(args.root).resolve()
            target_resolved = (root_resolved / rel).resolve()
        except OSError:
            return fail(f"freeze-variant: mockup file not found: {rel}")
        try:
            target_resolved.relative_to(root_resolved)
        except ValueError:
            return fail(f"freeze-variant: path must be inside the project root: {rel}")
        rel = target_resolved.relative_to(root_resolved).as_posix()
        target = root_resolved / rel
        if not target.is_file():
            return fail(f"freeze-variant: mockup file not found: {rel}")
        try:
            blob = target.read_bytes()
        except OSError:
            return fail(f"freeze-variant: mockup file not found: {rel}")
        value = {"variant": variant, "path": rel,
                 "sha256": hashlib.sha256(blob).hexdigest()}
        old = data.get("mockup_freeze")
        data["mockup_freeze"] = value
        changes = {"mockup_freeze": [old, value]} if old != value else {}
        return commit(args.root, data, "freeze-variant", "",
                      {"changes": changes})
    def extract_phase_field(section, label):
        import re as _re
        lab = _re.escape(label)
        m = _re.search(r"\*\*" + lab + r"(?::\*\*|\*\*\s*:?)\s*([^\n]+)",
                       section, _re.IGNORECASE)
        if not m:
            return None
        first = m.group(1).strip()
        cont = []
        for raw in section[m.end():].split("\n")[1:]:
            if not raw.strip():
                break
            if _re.match(r"\s*\*\*[A-Z][A-Za-z ]*:?(\*\*)?:?\s", raw):
                break
            if _re.match(r"\s*#{1,4}\s", raw):
                break
            if _re.match(r"\s*\|", raw):
                break
            cont.append(raw.strip())
        val = " ".join([first] + cont).strip()
        return val or None

    def scope_prose_of(text, phase):
        import re as _re
        head = r"^#{2,4}\s*(?:\[[^\]]+\]\s*)?Phase\s+"
        blocks = _re.findall(r"(?m)" + head + _re.escape(phase) + r"(?![0-9.])[\s\S]*?"
                             r"(?=" + head + r"|\Z)", text, _re.IGNORECASE)
        if not blocks:
            return None, "block"
        if len(blocks) > 1:
            return None, "ambiguous"
        section = blocks[0]
        goal = extract_phase_field(section, "Goal")
        if goal is None:
            return None, "Goal"
        reqs = extract_phase_field(section, "Requirements")
        if reqs is None:
            return None, "Requirements"
        norm = lambda t: " ".join(t.split())
        blob = f"{norm(goal)}\n{norm(reqs)}".encode("utf-8")
        return hashlib.sha256(blob).hexdigest(), None

    if args.cmd == "lock-scope":
        raw_p = args.phase.strip() if isinstance(args.phase, str) else ""
        if args.phase is not None and parse_phase_like(raw_p) is None:
            return fail("lock-scope needs --phase with a phase value (such as 3 or 2.1)")
        if args.source is None:
            src = "ROADMAP.md" if raw_p else ""
            if src and not (Path(args.root) / src).exists() \
                    and (Path(args.root) / ".planning" / "ROADMAP.md").is_file():
                src = ".planning/ROADMAP.md"  # GSD layout
        else:
            src = args.source.strip() if isinstance(args.source, str) else ""
        if not src:
            return fail("lock-scope needs --source with the scope file path")
        target = Path(args.root) / src
        try:
            content = target.read_bytes()
        except OSError:
            return fail(f"lock-scope: scope file not found: {src}")
        if raw_p:
            try:
                text = content.decode("utf-8")
            except UnicodeDecodeError:
                return fail(f"lock-scope: scope file not found: {src}")
            digest, missing = scope_prose_of(text, raw_p)
            if missing == "block":
                return fail(f"lock-scope: phase block not found: phase {raw_p} in {src}")
            if missing == "ambiguous":
                return fail(f"lock-scope: phase block ambiguous: phase {raw_p} in {src}")
            if missing in ("Goal", "Requirements"):
                return fail(f"lock-scope: scope field missing: {missing} (locked phase {raw_p})")
        else:
            digest = hashlib.sha256(content).hexdigest()
        old = data.get("scope_lock")
        data["scope_lock"] = {"phase": raw_p, "source": src, "sha256": digest}
        rc = commit(args.root, data, "lock-scope", "",
                    {"changes": {"scope_lock": [old, data["scope_lock"]]}})
        if rc == 0 and isinstance(old, dict) and old.get("phase") \
                and parse_phase_like(old["phase"]) != parse_phase_like(raw_p):
            print(f"replaced lock on phase {old['phase']}")
        return rc
    if args.cmd == "record-fail":
        import hashlib as _hl
        import os as _os
        import signal as _sig
        import subprocess as _sp
        from pathlib import Path as _Path
        row = find_row(data, args.id)
        if row is None:
            return fail(f"{args.id}: unknown id")
        ref = row.get("test_ref", "")
        ref = ref if isinstance(ref, str) else ""
        if not ref.strip():
            return fail(f"{args.id}: missing check (empty test_ref)")
        path_part = ref.split("::", 1)[0].strip()
        try:
            root = _Path(args.root).resolve()
            test_file = root / check_key(root, path_part)
            digest = _hl.sha256(test_file.read_bytes()).hexdigest()
        except ValueError as exc:
            return fail(f"{args.id}: {exc} ({ref})")
        except OSError:
            return fail(f"{args.id}: check not found ({ref})")
        cmd = args.fail_cmd if isinstance(args.fail_cmd, str) else ""
        if not cmd.strip() or path_part not in cmd:
            return fail(f"{args.id}: record-fail needs --cmd containing the check path")
        try:
            timeout = int(args.timeout)
        except (TypeError, ValueError):
            return fail(f"{args.id}: record-fail needs --timeout as seconds")
        if timeout <= 0:
            return fail(f"{args.id}: record-fail needs --timeout as seconds")
        try:
            child = _sp.Popen(cmd, shell=True, cwd=str(root),
                              stdout=_sp.PIPE, stderr=_sp.STDOUT,
                              start_new_session=True, text=True, errors="replace")
        except Exception:
            return fail(f"{args.id}: record-fail could not run the check command")
        try:
            text, _ = child.communicate(timeout=timeout)
        except _sp.TimeoutExpired:
            try:
                if hasattr(_os, "killpg"):
                    _os.killpg(child.pid, _sig.SIGKILL)
                else:  # no process groups (Windows): kill the shell itself
                    child.kill()
            except OSError:
                pass
            try:
                child.communicate(timeout=5)
            except _sp.TimeoutExpired:
                pass
            return fail(f"{args.id}: check command timed out after {timeout}s")
        code = child.returncode
        if code == 0:
            print(f"{args.id}: check passed, so it cannot prove a failure; "
                  f"record-fail needs a failing run before the code exists",
                  file=sys.stderr)
            return 1
        tail = [line for line in (text or "").splitlines() if line.strip()][-20:]
        if not tail:
            return fail(f"{args.id}: check failed with no output, so the failure cannot be shown")
        # The run can take minutes. Re-read everything it could have changed and commit
        # from the fresh data, so an amend made meanwhile survives and nothing that
        # changed out of band gets sealed (commit() re-reads the log itself).
        try:
            data = json.loads(ledger_file.read_text(encoding="utf-8"))
        except Exception as exc:
            return fail(f"cannot read ledger: {exc}")
        if not sums_match(ledger_file, sums_file, log_path):
            return fail(SUMS_MISMATCH)
        row = find_row(data, args.id)
        if row is None or row.get("test_ref") != ref:
            return fail(f"{args.id}: test_ref changed while the check ran")
        try:
            after = _hl.sha256(test_file.read_bytes()).hexdigest()
        except OSError:
            after = None
        if after != digest:
            return fail(f"{args.id}: test file changed while the check ran")
        try:
            head_c = _sp.run(["git", "-C", str(root), "rev-parse", "HEAD"],
                             capture_output=True, text=True, timeout=30)
            head = head_c.stdout.strip() if head_c.returncode == 0 else ""
        except Exception:
            head = ""
        return commit(args.root, data, "check-fail", args.id,
                      {"ref": ref, "cmd": cmd, "exit": code,
                       "output": "\n".join(tail), "head": head,
                       "sha256": digest})
    if args.cmd == "lock-checks":
        import re as _re
        import subprocess as _sp
        sha = args.commit.strip() if isinstance(args.commit, str) else ""
        if not _re.fullmatch(r"[0-9a-fA-F]{4,64}", sha):
            return fail("lock-checks needs --commit with a hex commit id")
        try:
            rev = _sp.run(["git", "-C", str(args.root), "rev-parse", "--verify", "--quiet",
                           f"{sha}^{{commit}}"], capture_output=True, text=True, timeout=30)
        except Exception:
            return fail(f"lock-checks: unknown commit {sha}")
        full = rev.stdout.strip()
        if rev.returncode != 0 or not full:
            return fail(f"lock-checks: unknown commit {sha}")
        cur_raw = data.get("current_phase")
        cur_p = parse_phase_like(cur_raw) if isinstance(cur_raw, str) and cur_raw.strip() else None
        files = {}
        for row in data.get("items", []):
            if not isinstance(row, dict) or row.get("status") not in ("open", "done", "verified"):
                continue
            rp_raw = str(row.get("phase", ""))
            row_p = parse_phase_like(rp_raw) if rp_raw.strip() else None
            if rp_raw.strip() and cur_p is not None and row_p is not None and row_p > cur_p:
                continue
            ref = row.get("test_ref", "")
            if not isinstance(ref, str) or not ref.strip():
                continue
            path_part = ref.split("::", 1)[0].strip()
            if not path_part:
                continue
            try:
                key = check_key(args.root, path_part)
            except ValueError as exc:
                return fail(f"{row.get('id')}: {exc} ({ref})")
            try:
                # ./ reads the path from --root, not the repo top; --filters gives the
                # working-tree form (eol, smudge), which is what phase-gate.py hashes.
                child = _sp.run(["git", "-C", str(args.root), "cat-file", "--filters",
                                 f"{full}:./{key}"], capture_output=True, timeout=30)
            except Exception:
                return fail(f"lock-checks: cannot read {key} at commit {full}")
            if child.returncode != 0:
                return fail(f"lock-checks: missing file {key} at commit {full}")
            files[key] = hashlib.sha256(child.stdout).hexdigest()
        old = data.get("check_locks")
        new = {"commit": full, "files": files}
        data["check_locks"] = new
        changes = {"check_locks": [old, new]} if old != new else {}
        return commit(args.root, data, "lock-checks", "", {"commit": full, "changes": changes})
    if args.cmd == "baseline-checks":
        # User-only (kept off the agent allowlist). Rows completed at or before this
        # version need a resolving check but no failure proof in phase-gate.py.
        top = max((op["v"] for op in ops if isinstance(op, dict)
                   and isinstance(op.get("v"), int) and not isinstance(op["v"], bool)), default=0)
        old = data.get("check_baseline")
        data["check_baseline"] = top
        changes = {"check_baseline": [old, top]} if old != top else {}
        return commit(args.root, data, "baseline-checks", "", {"changes": changes})
    if args.cmd == "import-brainstorm":
        if data.get("frozen_at") is not None:
            return fail("import-brainstorm: ledger is already frozen")
        parser_file = Path(__file__).with_name("brainstorm_import.py")
        if not parser_file.is_file():
            return fail("import-brainstorm: brainstorm_import.py not found beside ledger-amend.py")
        import importlib.util  # loaded here only: no other subcommand needs the parser

        spec = importlib.util.spec_from_file_location("brainstorm_import", parser_file)
        brainstorm_import = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(brainstorm_import)
        try:  # spec_ref is a file pointer (s14_link_recovery.py): root-relative, POSIX
            source = Path(args.file).resolve().relative_to(
                Path(args.root).resolve()).as_posix()
        except ValueError:
            return fail(f"import-brainstorm: --file {args.file} is outside --root {args.root}")
        try:
            text = Path(args.file).read_text(encoding="utf-8-sig")
        except (OSError, UnicodeDecodeError) as exc:
            return fail(f"import-brainstorm: cannot read file {args.file}: {exc}")
        rows, skipped, error = brainstorm_import.plan_import(text, source, ops, data["items"])
        if error is not None:
            return fail(error)
        entries = []
        for rid, rtext, spec_ref in rows:
            row = blank_row(rid, rtext, spec_ref)
            data["items"].append(row)
            entries.append(("add", rid, {"row": row}))
        rc = commit(args.root, data, *entries[0], more=entries[1:])
        if rc != 0:
            return rc
        for rid, rtext, spec_ref in rows:
            print(f"{rid}: {rtext} [{spec_ref}]")
        sys.stdout.flush()  # the review list first, then what the import left out
        for line in skipped:
            print(f"skipped {line}", file=sys.stderr)
        return 0
    if args.cmd == "freeze":
        if data.get("frozen_at") is not None:
            return fail("ledger is already frozen")
        old = data.get("frozen_at")
        data["frozen_at"] = today()
        return commit(args.root, data, "freeze", "",
                      {"changes": {"frozen_at": [old, data["frozen_at"]]}})
    if args.cmd == "record-handoff":
        if handoff_tripped(args.root):
            return fail("record-handoff: a tripped hand-off is waiting for "
                        "the user's acknowledge-handoff")
        record = current_handoff(args.root, ledger_file, sums_file, data)
        if isinstance(record, int):
            return record
        err = write_handoff(args.root, record)
        if isinstance(err, int):
            return err
        print(f"LEDGER: handoff recorded (ledger_version={record['ledger_version']})")
        return 0
    if args.cmd == "acknowledge-handoff":
        try:
            handoff_state_path(args.root).unlink()
        except FileNotFoundError:
            print("LEDGER: no hand-off record")
            return 0
        except OSError as exc:
            return fail(f"cannot remove handoff state: {exc}")
        print(f"LEDGER: handoff acknowledged (ledger_version={data.get('ledger_version')})")
        return 0
    return fail("unknown command")


if __name__ == "__main__":
    raise SystemExit(main())
