#!/usr/bin/env python3
"""
Apply a Firebase RTDB multi-location update map.

Supported modes:
1. `admin`
   - Uses Firebase Admin SDK credentials to write updates to the live RTDB.
   - Writes are path-by-path for safety and easy backup/reporting.
2. `safe-import`
   - Applies the update map to an RTDB export JSON and writes a patched copy.
   - Useful when you want a no-risk import path instead of touching production directly.

Examples:
  python tools/apply_rtdb_updates.py updates.json --mode safe-import --source-export export.json
  python tools/apply_rtdb_updates.py updates.json --mode admin --service-account svc.json --database-url https://<db>.firebasedatabase.app --yes
"""

from __future__ import annotations

import argparse
import json
import pathlib
import sys
from typing import Any


def load_json(path: pathlib.Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path: pathlib.Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        json.dump(data, handle, indent=2, ensure_ascii=True)
        handle.write("\n")


def split_path(path: str) -> list[str]:
    return [segment for segment in str(path or "").strip("/").split("/") if segment]


def parse_segment(segment: str) -> int | str:
    if segment.isdigit():
        return int(segment)
    return segment


def ensure_container(parent: Any, key: int | str, next_key: int | str) -> Any:
    wants_list = isinstance(next_key, int)
    if isinstance(key, int):
        if not isinstance(parent, list):
            raise TypeError(f"Cannot index non-list with integer key {key}")
        while len(parent) <= key:
            parent.append(None)
        existing = parent[key]
        if existing is None:
            parent[key] = [] if wants_list else {}
        elif wants_list and not isinstance(existing, list):
            raise TypeError(f"Expected list at key {key}, found {type(existing).__name__}")
        elif not wants_list and not isinstance(existing, dict):
            if isinstance(existing, list):
                converted = {str(idx): value for idx, value in enumerate(existing) if value is not None}
                parent[key] = converted
            else:
                raise TypeError(f"Expected dict at key {key}, found {type(existing).__name__}")
        return parent[key]

    if not isinstance(parent, dict):
        raise TypeError(f"Cannot index non-dict with string key {key}")
    existing = parent.get(key)
    if existing is None:
        parent[key] = [] if wants_list else {}
    elif wants_list and not isinstance(existing, list):
        raise TypeError(f"Expected list at key {key}, found {type(existing).__name__}")
    elif not wants_list and not isinstance(existing, dict):
        if isinstance(existing, list):
            parent[key] = {str(idx): value for idx, value in enumerate(existing) if value is not None}
        else:
            raise TypeError(f"Expected dict at key {key}, found {type(existing).__name__}")
    return parent[key]


def set_path_value(document: Any, path: str, value: Any) -> None:
    segments = [parse_segment(segment) for segment in split_path(path)]
    if not segments:
        raise ValueError("Update path cannot be empty")

    current = document
    for index, segment in enumerate(segments[:-1]):
        current = ensure_container(current, segment, segments[index + 1])

    final_key = segments[-1]
    if isinstance(final_key, int):
        if not isinstance(current, list):
            raise TypeError(f"Cannot set integer key {final_key} on non-list")
        while len(current) <= final_key:
            current.append(None)
        current[final_key] = value
        return

    if not isinstance(current, dict):
        raise TypeError(f"Cannot set string key {final_key} on non-dict")
    current[final_key] = value


def get_path_value(document: Any, path: str) -> Any:
    current = document
    for segment in [parse_segment(part) for part in split_path(path)]:
        if isinstance(segment, int):
            if not isinstance(current, list) or segment >= len(current):
                return None
            current = current[segment]
        else:
            if not isinstance(current, dict) or segment not in current:
                return None
            current = current[segment]
    return current


def apply_updates_to_export(source_export: pathlib.Path, updates: dict[str, Any], output_path: pathlib.Path) -> pathlib.Path:
    export_data = load_json(source_export)
    if not isinstance(export_data, dict):
        raise ValueError("Export root must be a JSON object")
    for path, value in updates.items():
        set_path_value(export_data, path, value)
    write_json(output_path, export_data)
    return output_path


def require_admin_sdk():
    try:
        import firebase_admin  # type: ignore
        from firebase_admin import credentials, db  # type: ignore
    except Exception as exc:  # pragma: no cover - dependency branch
        raise RuntimeError(
            "firebase_admin is not installed. Install it with `pip install firebase-admin` "
            "or use `--mode safe-import`."
        ) from exc
    return firebase_admin, credentials, db


def init_admin_app(service_account: pathlib.Path, database_url: str):
    firebase_admin, credentials, db = require_admin_sdk()
    if not firebase_admin._apps:
        cred = credentials.Certificate(str(service_account))
        firebase_admin.initialize_app(cred, {"databaseURL": database_url})
    return db


def fetch_backup_via_admin(db_module: Any, updates: dict[str, Any]) -> dict[str, Any]:
    backup: dict[str, Any] = {}
    for path in sorted(updates.keys()):
        backup[path] = db_module.reference(path).get()
    return backup


def apply_updates_via_admin(
    service_account: pathlib.Path,
    database_url: str,
    updates: dict[str, Any],
    dry_run: bool,
    backup_out: pathlib.Path | None,
) -> dict[str, Any]:
    db_module = init_admin_app(service_account, database_url)
    backup = fetch_backup_via_admin(db_module, updates)
    if backup_out:
        write_json(backup_out, backup)

    results = {
        "mode": "admin",
        "databaseUrl": database_url,
        "updateCount": len(updates),
        "dryRun": dry_run,
        "backupWritten": str(backup_out) if backup_out else "",
        "paths": sorted(updates.keys()),
    }

    if dry_run:
        return results

    for path, value in updates.items():
        db_module.reference(path).set(value)

    return results


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Apply a Firebase RTDB update map to live data or to an export copy.")
    parser.add_argument("updates_json", help="Path to the multi-location update map JSON")
    parser.add_argument("--mode", choices=["admin", "safe-import"], default="safe-import")
    parser.add_argument("--service-account", help="Path to Firebase service-account JSON for admin mode")
    parser.add_argument("--database-url", help="Realtime Database URL for admin mode")
    parser.add_argument("--source-export", help="Source RTDB export JSON for safe-import mode")
    parser.add_argument("--output-json", help="Output JSON path for safe-import mode or admin report output")
    parser.add_argument("--backup-out", help="Write current values at target paths before admin writes")
    parser.add_argument("--dry-run", action="store_true", help="Show what would happen without writing live data")
    parser.add_argument("--yes", action="store_true", help="Acknowledge that live admin writes should proceed")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    updates_path = pathlib.Path(args.updates_json).expanduser()
    if not updates_path.exists():
        print(f"Update map not found: {updates_path}", file=sys.stderr)
        return 1

    updates = load_json(updates_path)
    if not isinstance(updates, dict):
        print("Update map root must be an object", file=sys.stderr)
        return 1

    if args.mode == "safe-import":
        if not args.source_export:
            print("--source-export is required for safe-import mode", file=sys.stderr)
            return 1
        source_export = pathlib.Path(args.source_export).expanduser()
        if not source_export.exists():
            print(f"Source export not found: {source_export}", file=sys.stderr)
            return 1
        output_path = pathlib.Path(args.output_json).expanduser() if args.output_json else source_export.with_name(source_export.stem + ".applied.json")
        apply_updates_to_export(source_export, updates, output_path)
        print(f"Safe-import patched export written: {output_path}")
        print(json.dumps({
            "mode": "safe-import",
            "sourceExport": str(source_export),
            "outputJson": str(output_path),
            "updateCount": len(updates),
        }, indent=2))
        return 0

    if not args.service_account or not args.database_url:
        print("--service-account and --database-url are required for admin mode", file=sys.stderr)
        return 1
    if not args.dry_run and not args.yes:
        print("Refusing live admin writes without --yes. Use --dry-run first if you want a preview.", file=sys.stderr)
        return 1

    service_account = pathlib.Path(args.service_account).expanduser()
    if not service_account.exists():
        print(f"Service account not found: {service_account}", file=sys.stderr)
        return 1

    backup_out = pathlib.Path(args.backup_out).expanduser() if args.backup_out else None
    result = apply_updates_via_admin(
        service_account=service_account,
        database_url=args.database_url,
        updates=updates,
        dry_run=args.dry_run,
        backup_out=backup_out,
    )

    if args.output_json:
        write_json(pathlib.Path(args.output_json).expanduser(), result)
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
