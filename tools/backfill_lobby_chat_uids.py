#!/usr/bin/env python3
"""
Backfill missing `uid` fields into lobby waiting-room chat and draft chat messages.

The utility reads an RTDB export and writes:
- a multi-location update map JSON
- a patched export JSON
- a summary report JSON

Resolution strategy:
1. `lobbies/{lobbyId}/players/{playerId}/uid`
2. `publicUsers/{userNumber}/uid`
3. `users` fallback via userNumber
"""

from __future__ import annotations

import argparse
import json
import pathlib
from typing import Any


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


def build_lobby_player_uid_map(lobby: dict[str, Any], number_to_uid: dict[int, str]) -> dict[str, str]:
    result: dict[str, str] = {}
    players = lobby.get("players") or {}
    if not isinstance(players, dict):
        return result
    for player_id, player in players.items():
        if not isinstance(player, dict):
            continue
        uid = str(player.get("uid") or "").strip()
        if not uid:
            try:
                user_number = int(player.get("userNumber"))
            except (TypeError, ValueError):
                user_number = 0
            uid = number_to_uid.get(user_number, "")
        if uid:
            result[str(player_id)] = uid
    return result


def resolve_message_uid(message: dict[str, Any], lobby_player_uids: dict[str, str], number_to_uid: dict[int, str]) -> str:
    existing = str(message.get("uid") or "").strip()
    if existing:
        return existing
    player_id = str(message.get("playerId") or "").strip()
    if player_id and player_id in lobby_player_uids:
        return lobby_player_uids[player_id]
    try:
        user_number = int(message.get("userNumber"))
    except (TypeError, ValueError):
        user_number = 0
    if user_number > 0:
        return number_to_uid.get(user_number, "")
    return ""


def build_backfill(export_data: dict[str, Any]) -> dict[str, Any]:
    lobbies = export_data.get("lobbies") or {}
    if not isinstance(lobbies, dict):
        raise ValueError("Expected lobbies to be an object in the export")

    number_to_uid = build_user_number_uid_map(export_data)
    patched_export = json.loads(json.dumps(export_data))
    updates: dict[str, str] = {}
    report_lobbies: list[dict[str, Any]] = []
    patched_waiting = 0
    patched_draft = 0

    for lobby_id, lobby in lobbies.items():
        if not isinstance(lobby, dict):
            continue
        lobby_player_uids = build_lobby_player_uid_map(lobby, number_to_uid)
        lobby_report = {
            "lobbyId": lobby_id,
            "waitingRoomMessagesPatched": [],
            "draftMessagesPatched": [],
        }

        chat = lobby.get("chat") or {}
        if isinstance(chat, dict):
          for message_id, message in chat.items():
            if not isinstance(message, dict):
                continue
            uid = resolve_message_uid(message, lobby_player_uids, number_to_uid)
            existing_uid = str(message.get("uid") or "").strip()
            if uid and not existing_uid:
                path = f"lobbies/{lobby_id}/chat/{message_id}/uid"
                updates[path] = uid
                patched_export["lobbies"][lobby_id]["chat"][message_id]["uid"] = uid
                patched_waiting += 1
                lobby_report["waitingRoomMessagesPatched"].append({
                    "messageId": message_id,
                    "playerId": message.get("playerId"),
                    "userNumber": message.get("userNumber"),
                    "uid": uid,
                })

        draft_messages = ((lobby.get("draftChat") or {}).get("messages") or {})
        if isinstance(draft_messages, dict):
            for message_id, message in draft_messages.items():
                if not isinstance(message, dict):
                    continue
                uid = resolve_message_uid(message, lobby_player_uids, number_to_uid)
                existing_uid = str(message.get("uid") or "").strip()
                if uid and not existing_uid:
                    path = f"lobbies/{lobby_id}/draftChat/messages/{message_id}/uid"
                    updates[path] = uid
                    patched_export["lobbies"][lobby_id]["draftChat"]["messages"][message_id]["uid"] = uid
                    patched_draft += 1
                    lobby_report["draftMessagesPatched"].append({
                        "messageId": message_id,
                        "playerId": message.get("playerId"),
                        "userNumber": message.get("userNumber"),
                        "uid": uid,
                    })

        if lobby_report["waitingRoomMessagesPatched"] or lobby_report["draftMessagesPatched"]:
            report_lobbies.append(lobby_report)

    return {
        "updates": updates,
        "patchedExport": patched_export,
        "report": {
            "summary": {
                "lobbyCount": len(lobbies),
                "patchedLobbyCount": len(report_lobbies),
                "waitingRoomMessagesPatched": patched_waiting,
                "draftMessagesPatched": patched_draft,
                "updateCount": len(updates),
                "resolvedUserCount": len(number_to_uid),
            },
            "lobbies": report_lobbies,
        },
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Backfill missing uid fields into lobby and draft chat messages from an RTDB export.")
    parser.add_argument("export_json", help="Path to the Firebase RTDB export JSON file")
    parser.add_argument("--updates-out", default=None, help="Output path for the multi-location update map JSON")
    parser.add_argument("--patched-export-out", default=None, help="Output path for the patched export JSON")
    parser.add_argument("--report-out", default=None, help="Output path for the report JSON")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    export_path = pathlib.Path(args.export_json).expanduser()
    if not export_path.exists():
        raise SystemExit(f"Export file not found: {export_path}")

    export_data = load_json(export_path)
    if not isinstance(export_data, dict):
        raise SystemExit("Export root must be a JSON object")

    result = build_backfill(export_data)
    base_name = export_path.stem
    default_dir = pathlib.Path.cwd()
    updates_out = pathlib.Path(args.updates_out) if args.updates_out else default_dir / f"{base_name}.lobby-chat-uid-updates.json"
    patched_export_out = pathlib.Path(args.patched_export_out) if args.patched_export_out else default_dir / f"{base_name}.lobby-chat-uid-patched.json"
    report_out = pathlib.Path(args.report_out) if args.report_out else default_dir / f"{base_name}.lobby-chat-uid-report.json"

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
