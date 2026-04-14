#!/usr/bin/env python3
"""
One-time DM membership backfill utility for RosterBate Firebase exports.

What it does:
- Reads an RTDB export JSON file
- Finds legacy direct-message threads such as `dm_1_2`
- Resolves each participant's Firebase UID from `publicUsers` / `users`
- Adds UID-keyed membership entries alongside legacy numeric membership
- Writes:
  1. a Firebase multi-location update map JSON
  2. an optional patched export JSON
  3. a human-readable summary report JSON

This is intentionally export-driven and safe. It does not write to Firebase directly.
"""

from __future__ import annotations

import argparse
import json
import pathlib
import re
import sys
from typing import Any


THREAD_ID_RE = re.compile(r"^dm_(\d+)_(\d+)$")


def load_json(path: pathlib.Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path: pathlib.Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        json.dump(data, handle, indent=2, ensure_ascii=True)
        handle.write("\n")


def iter_numeric_collection(node: Any):
    if isinstance(node, list):
        for idx, value in enumerate(node):
            if value is not None:
                yield str(idx), value
    elif isinstance(node, dict):
        for key, value in node.items():
            if value is not None:
                yield str(key), value


def parse_thread_participants(thread_id: str) -> tuple[int, int] | None:
    match = THREAD_ID_RE.match(str(thread_id or "").strip())
    if not match:
        return None
    return int(match.group(1)), int(match.group(2))


def normalize_members(node: Any) -> dict[str, bool]:
    members: dict[str, bool] = {}
    if isinstance(node, list):
        for idx, value in enumerate(node):
            if value is True:
                members[str(idx)] = True
    elif isinstance(node, dict):
        for key, value in node.items():
            if value is True:
                members[str(key)] = True
    return members


def build_user_number_uid_map(data: dict[str, Any]) -> dict[int, str]:
    result: dict[int, str] = {}

    for key, public_user in iter_numeric_collection(data.get("publicUsers")):
        if not isinstance(public_user, dict):
            continue
        try:
            user_number = int(public_user.get("userNumber", key))
        except (TypeError, ValueError):
            continue
        uid = str(public_user.get("uid") or "").strip()
        if user_number > 0 and uid:
            result[user_number] = uid

    users = data.get("users") or {}
    if isinstance(users, dict):
        for uid, user in users.items():
            if not isinstance(user, dict):
                continue
            try:
                user_number = int(user.get("userNumber"))
            except (TypeError, ValueError):
                continue
            uid_value = str(uid or "").strip()
            if user_number > 0 and uid_value and user_number not in result:
                result[user_number] = uid_value

    return result


def infer_thread_participants(
    thread_id: str,
    thread_data: dict[str, Any],
    user_threads: Any,
) -> list[int]:
    participants: set[int] = set()

    parsed = parse_thread_participants(thread_id)
    if parsed:
        participants.update(parsed)

    for member_key in normalize_members(thread_data.get("members")).keys():
        try:
            number = int(member_key)
        except (TypeError, ValueError):
            continue
        if number > 0:
            participants.add(number)

    if isinstance(user_threads, dict):
        for user_number_key, thread_index in user_threads.items():
            if not isinstance(thread_index, dict):
                continue
            if thread_id not in thread_index:
                continue
            try:
                owner_number = int(user_number_key)
            except (TypeError, ValueError):
                owner_number = 0
            if owner_number > 0:
                participants.add(owner_number)
            metadata = thread_index.get(thread_id) or {}
            if isinstance(metadata, dict):
                try:
                    other_number = int(metadata.get("otherUserNumber"))
                except (TypeError, ValueError):
                    other_number = 0
                if other_number > 0:
                    participants.add(other_number)

    return sorted(participants)


def apply_membership_patch(thread_data: dict[str, Any], legacy_numbers: list[int], uids: list[str]) -> dict[str, Any]:
    patched = dict(thread_data)
    members = normalize_members(thread_data.get("members"))

    for number in legacy_numbers:
        if number > 0:
            members[str(number)] = True
    for uid in uids:
        if uid:
            members[uid] = True

    patched["members"] = members
    return patched


def build_backfill(export_data: dict[str, Any]) -> dict[str, Any]:
    direct_threads = export_data.get("directThreads") or {}
    user_threads = export_data.get("userThreads") or {}
    number_to_uid = build_user_number_uid_map(export_data)

    updates: dict[str, bool] = {}
    patched_export = json.loads(json.dumps(export_data))
    report_threads: list[dict[str, Any]] = []
    patched_count = 0
    skipped_count = 0

    if not isinstance(direct_threads, dict):
        raise ValueError("Expected directThreads to be an object in the export")

    for thread_id, thread_data in direct_threads.items():
        if not isinstance(thread_data, dict):
            skipped_count += 1
            report_threads.append({
                "threadId": thread_id,
                "status": "skipped",
                "reason": "thread_data_not_object",
            })
            continue

        participants = infer_thread_participants(thread_id, thread_data, user_threads)
        resolved = [{"userNumber": number, "uid": number_to_uid.get(number, "")} for number in participants]
        resolved_uids = [entry["uid"] for entry in resolved if entry["uid"]]
        existing_members = normalize_members(thread_data.get("members"))
        existing_uid_members = sorted(key for key in existing_members if not key.isdigit())
        missing_uids = sorted(uid for uid in resolved_uids if existing_members.get(uid) is not True)

        if not missing_uids:
            skipped_count += 1
            report_threads.append({
                "threadId": thread_id,
                "status": "already_backfilled",
                "participants": resolved,
                "existingUidMembers": existing_uid_members,
            })
            continue

        for uid in missing_uids:
            updates[f"directThreads/{thread_id}/members/{uid}"] = True

        patched_export.setdefault("directThreads", {})
        patched_export["directThreads"][thread_id] = apply_membership_patch(thread_data, participants, resolved_uids)
        patched_count += 1
        report_threads.append({
            "threadId": thread_id,
            "status": "patched",
            "participants": resolved,
            "existingUidMembers": existing_uid_members,
            "addedUidMembers": missing_uids,
        })

    return {
        "updates": updates,
        "patchedExport": patched_export,
        "report": {
            "summary": {
                "threadCount": len(direct_threads),
                "patchedThreadCount": patched_count,
                "skippedThreadCount": skipped_count,
                "updateCount": len(updates),
                "resolvedUserCount": len(number_to_uid),
            },
            "threads": report_threads,
        },
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Backfill UID membership into legacy DM threads from an RTDB export.")
    parser.add_argument("export_json", help="Path to the Firebase RTDB export JSON file")
    parser.add_argument(
        "--updates-out",
        help="Where to write the Firebase multi-location update map JSON",
        default=None,
    )
    parser.add_argument(
        "--patched-export-out",
        help="Where to write a patched export JSON copy",
        default=None,
    )
    parser.add_argument(
        "--report-out",
        help="Where to write a JSON summary report",
        default=None,
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    export_path = pathlib.Path(args.export_json).expanduser()
    if not export_path.exists():
        print(f"Export file not found: {export_path}", file=sys.stderr)
        return 1

    export_data = load_json(export_path)
    if not isinstance(export_data, dict):
        print("Export root must be a JSON object", file=sys.stderr)
        return 1

    result = build_backfill(export_data)

    base_name = export_path.stem
    default_dir = pathlib.Path.cwd()
    updates_out = pathlib.Path(args.updates_out) if args.updates_out else default_dir / f"{base_name}.dm-membership-updates.json"
    patched_export_out = pathlib.Path(args.patched_export_out) if args.patched_export_out else default_dir / f"{base_name}.dm-membership-patched.json"
    report_out = pathlib.Path(args.report_out) if args.report_out else default_dir / f"{base_name}.dm-membership-report.json"

    write_json(updates_out, result["updates"])
    write_json(patched_export_out, result["patchedExport"])
    write_json(report_out, result["report"])

    print(f"Export analyzed: {export_path}")
    print(f"Updates written: {updates_out}")
    print(f"Patched export written: {patched_export_out}")
    print(f"Report written: {report_out}")
    print(json.dumps(result["report"]["summary"], indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
