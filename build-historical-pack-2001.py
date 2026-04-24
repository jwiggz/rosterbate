#!/usr/bin/env python
import csv
import hashlib
import io
import json
import math
import re
import sys
import tarfile
from collections import defaultdict
from datetime import UTC, datetime
from html import unescape
from pathlib import Path
from urllib.parse import quote

import requests


REPO_ROOT = Path(__file__).resolve().parent
PACK_ID = "nba_2001_full_season_v1"
PACK_ROOT = REPO_ROOT / "historical-packs" / PACK_ID
CACHE_ROOT = REPO_ROOT / ".historical-cache" / PACK_ID
SEASON_ID = "nba_2001_historic"
SEASON_LABEL = "2000-01 NBA Historic Season"
SOURCE_SEASON = "2000-01"
SOURCE_SEASON_KEY = "2000"
REGULAR_SEASON_START = "2000-10-31"
REGULAR_SEASON_END = "2001-04-18"

LIST_DATA_URL = "https://raw.githubusercontent.com/shufinskiy/nba_data/main/list_data.txt"
TEAM_PAGE_URL = "https://thebasketballdatabase.com/{season}{abbr}RegularSeasonBoxScore.html"
PLAYER_PAGE_URL = "https://thebasketballdatabase.com/{player_numeric_id}RegularSeasonBoxScore.html"

TEAM_PAGE_TOTAL_FIELDS = [
    ("points", "PTS"),
    ("fgm", "FGM"),
    ("fga", "FGA"),
    ("twoPointersMade", "2PM"),
    ("twoPointersAttempted", "2PA"),
    ("threePointersMade", "3PM"),
    ("threePointersAttempted", "3PA"),
    ("ftm", "FTM"),
    ("fta", "FTA"),
    ("offensiveRebounds", "OREB"),
    ("defensiveRebounds", "DREB"),
    ("rebounds", "REB"),
    ("assists", "AST"),
    ("turnovers", "TOV"),
    ("steals", "STL"),
    ("blocks", "BLK"),
    ("personalFouls", "PF"),
]

TEAM_DEFS = [
    {"slug": "atl", "abbr": "ATL", "city": "Atlanta", "name": "Hawks", "displayName": "Atlanta Hawks", "conference": "East", "division": "Central", "palette": {"primary": "#9D2235", "secondary": "#FDB927"}},
    {"slug": "bos", "abbr": "BOS", "city": "Boston", "name": "Celtics", "displayName": "Boston Celtics", "conference": "East", "division": "Atlantic", "palette": {"primary": "#007A33", "secondary": "#BA9653"}},
    {"slug": "chh", "abbr": "CHH", "city": "Charlotte", "name": "Hornets", "displayName": "Charlotte Hornets", "conference": "East", "division": "Central", "palette": {"primary": "#00788C", "secondary": "#5A2D81"}},
    {"slug": "chi", "abbr": "CHI", "city": "Chicago", "name": "Bulls", "displayName": "Chicago Bulls", "conference": "East", "division": "Central", "palette": {"primary": "#CE1141", "secondary": "#000000"}},
    {"slug": "cle", "abbr": "CLE", "city": "Cleveland", "name": "Cavaliers", "displayName": "Cleveland Cavaliers", "conference": "East", "division": "Central", "palette": {"primary": "#860038", "secondary": "#FDBB30"}},
    {"slug": "det", "abbr": "DET", "city": "Detroit", "name": "Pistons", "displayName": "Detroit Pistons", "conference": "East", "division": "Central", "palette": {"primary": "#C8102E", "secondary": "#1D42BA"}},
    {"slug": "ind", "abbr": "IND", "city": "Indiana", "name": "Pacers", "displayName": "Indiana Pacers", "conference": "East", "division": "Central", "palette": {"primary": "#002D62", "secondary": "#FDBB30"}},
    {"slug": "mia", "abbr": "MIA", "city": "Miami", "name": "Heat", "displayName": "Miami Heat", "conference": "East", "division": "Atlantic", "palette": {"primary": "#98002E", "secondary": "#F9A01B"}},
    {"slug": "mil", "abbr": "MIL", "city": "Milwaukee", "name": "Bucks", "displayName": "Milwaukee Bucks", "conference": "East", "division": "Central", "palette": {"primary": "#00471B", "secondary": "#EEE1C6"}},
    {"slug": "njn", "abbr": "NJN", "city": "New Jersey", "name": "Nets", "displayName": "New Jersey Nets", "conference": "East", "division": "Atlantic", "palette": {"primary": "#000000", "secondary": "#FFFFFF"}},
    {"slug": "nyk", "abbr": "NYK", "city": "New York", "name": "Knicks", "displayName": "New York Knicks", "conference": "East", "division": "Atlantic", "palette": {"primary": "#006BB6", "secondary": "#F58426"}},
    {"slug": "orl", "abbr": "ORL", "city": "Orlando", "name": "Magic", "displayName": "Orlando Magic", "conference": "East", "division": "Atlantic", "palette": {"primary": "#0077C0", "secondary": "#C4CED4"}},
    {"slug": "phi", "abbr": "PHI", "city": "Philadelphia", "name": "76ers", "displayName": "Philadelphia 76ers", "conference": "East", "division": "Atlantic", "palette": {"primary": "#006BB6", "secondary": "#ED174C"}},
    {"slug": "tor", "abbr": "TOR", "city": "Toronto", "name": "Raptors", "displayName": "Toronto Raptors", "conference": "East", "division": "Central", "palette": {"primary": "#753BBD", "secondary": "#BA0C2F"}},
    {"slug": "was", "abbr": "WAS", "city": "Washington", "name": "Wizards", "displayName": "Washington Wizards", "conference": "East", "division": "Atlantic", "palette": {"primary": "#002B5C", "secondary": "#E31837"}},
    {"slug": "dal", "abbr": "DAL", "city": "Dallas", "name": "Mavericks", "displayName": "Dallas Mavericks", "conference": "West", "division": "Midwest", "palette": {"primary": "#00538C", "secondary": "#B8C4CA"}},
    {"slug": "den", "abbr": "DEN", "city": "Denver", "name": "Nuggets", "displayName": "Denver Nuggets", "conference": "West", "division": "Midwest", "palette": {"primary": "#0E2240", "secondary": "#FEC524"}},
    {"slug": "gsw", "abbr": "GSW", "city": "Golden State", "name": "Warriors", "displayName": "Golden State Warriors", "conference": "West", "division": "Pacific", "palette": {"primary": "#1D428A", "secondary": "#FFC72C"}},
    {"slug": "hou", "abbr": "HOU", "city": "Houston", "name": "Rockets", "displayName": "Houston Rockets", "conference": "West", "division": "Midwest", "palette": {"primary": "#CE1141", "secondary": "#C4CED4"}},
    {"slug": "lac", "abbr": "LAC", "city": "Los Angeles", "name": "Clippers", "displayName": "LA Clippers", "conference": "West", "division": "Pacific", "palette": {"primary": "#ED174C", "secondary": "#1D428A"}},
    {"slug": "lal", "abbr": "LAL", "city": "Los Angeles", "name": "Lakers", "displayName": "Los Angeles Lakers", "conference": "West", "division": "Pacific", "palette": {"primary": "#552583", "secondary": "#FDB927"}},
    {"slug": "min", "abbr": "MIN", "city": "Minnesota", "name": "Timberwolves", "displayName": "Minnesota Timberwolves", "conference": "West", "division": "Midwest", "palette": {"primary": "#0C2340", "secondary": "#236192"}},
    {"slug": "phx", "abbr": "PHX", "city": "Phoenix", "name": "Suns", "displayName": "Phoenix Suns", "conference": "West", "division": "Pacific", "palette": {"primary": "#1D1160", "secondary": "#E56020"}},
    {"slug": "por", "abbr": "POR", "city": "Portland", "name": "Trail Blazers", "displayName": "Portland Trail Blazers", "conference": "West", "division": "Pacific", "palette": {"primary": "#E03A3E", "secondary": "#000000"}},
    {"slug": "sac", "abbr": "SAC", "city": "Sacramento", "name": "Kings", "displayName": "Sacramento Kings", "conference": "West", "division": "Pacific", "palette": {"primary": "#5A2D81", "secondary": "#63727A"}},
    {"slug": "sas", "abbr": "SAS", "city": "San Antonio", "name": "Spurs", "displayName": "San Antonio Spurs", "conference": "West", "division": "Midwest", "palette": {"primary": "#C4CED4", "secondary": "#000000"}},
    {"slug": "sea", "abbr": "SEA", "city": "Seattle", "name": "SuperSonics", "displayName": "Seattle SuperSonics", "conference": "West", "division": "Pacific", "palette": {"primary": "#00653A", "secondary": "#FFC200"}},
    {"slug": "uta", "abbr": "UTA", "city": "Utah", "name": "Jazz", "displayName": "Utah Jazz", "conference": "West", "division": "Midwest", "palette": {"primary": "#002B5C", "secondary": "#00471B"}},
    {"slug": "van", "abbr": "VAN", "city": "Vancouver", "name": "Grizzlies", "displayName": "Vancouver Grizzlies", "conference": "West", "division": "Midwest", "palette": {"primary": "#041E42", "secondary": "#00B2A9"}},
]


def ensure_dir(path_obj):
    path_obj.mkdir(parents=True, exist_ok=True)


def write_json(relative_path, value):
    target = PACK_ROOT / relative_path
    ensure_dir(target.parent)
    target.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")


def cache_text_path(label):
    return CACHE_ROOT / f"{label}.txt"


def cache_tar_path(label):
    return CACHE_ROOT / f"{label}.tar.xz"


def fetch_text(url, label):
    ensure_dir(CACHE_ROOT)
    cache_path = cache_text_path(label)
    if cache_path.exists():
        return cache_path.read_text(encoding="utf-8")
    response = requests.get(url, timeout=180)
    response.raise_for_status()
    text = response.text
    cache_path.write_text(text, encoding="utf-8")
    return text


def fetch_tar_csv_rows(url, label):
    ensure_dir(CACHE_ROOT)
    cache_path = cache_tar_path(label)
    if cache_path.exists():
        payload = cache_path.read_bytes()
    else:
        response = requests.get(url, timeout=240)
        response.raise_for_status()
        payload = response.content
        cache_path.write_bytes(payload)

    with tarfile.open(fileobj=io.BytesIO(payload), mode="r:xz") as archive:
        members = archive.getmembers()
        if not members:
            raise RuntimeError(f"Archive `{label}` did not contain any members.")
        csv_member = next((member for member in members if member.name.endswith(".csv")), None)
        if not csv_member:
            raise RuntimeError(f"Archive `{label}` did not contain a CSV file.")
        extracted = archive.extractfile(csv_member)
        if extracted is None:
            raise RuntimeError(f"Archive `{label}` CSV could not be extracted.")
        text = extracted.read().decode("utf-8", errors="replace")
    return list(csv.DictReader(io.StringIO(text)))


def normalize_name(value):
    return re.sub(r"[^a-z0-9]+", "", str(value or "").lower()).strip()


def slugify(value):
    slug = re.sub(r"[^a-z0-9]+", "_", str(value or "").lower())
    return slug.strip("_")


def to_int(value):
    try:
        cleaned = str(value or "").replace(",", "").strip()
        return int(float(cleaned)) if cleaned else 0
    except Exception:
        return 0


def round_stat(value, digits=1):
    return round(float(value or 0), digits)


def stable_fraction(value):
    digest = hashlib.sha1(str(value or "").encode("utf-8")).hexdigest()
    return int(digest[:8], 16) / 0xFFFFFFFF


def estimate_player_game_minute_weight(stat_row):
    return (
        1.0
        + (to_int(stat_row.get("fga")) * 0.7)
        + (to_int(stat_row.get("fta")) * 0.35)
        + (to_int(stat_row.get("rebounds")) * 0.65)
        + (to_int(stat_row.get("assists")) * 0.85)
        + (to_int(stat_row.get("steals")) * 1.25)
        + (to_int(stat_row.get("blocks")) * 1.25)
        + (to_int(stat_row.get("turnovers")) * 0.4)
        + (stable_fraction(f"{stat_row.get('playerId', '')}:{stat_row.get('gameId', '')}") * 0.2)
    )


def assign_inferred_player_game_minutes(player_rows, average_minutes):
    if not player_rows:
        return

    average_minutes = max(0.0, float(average_minutes or 0))
    target_total = int(round(average_minutes * len(player_rows)))
    if average_minutes > 0:
        target_total = max(len(player_rows), target_total)

    if target_total <= 0:
        for row in player_rows:
            row["minutes"] = 0
            row["minutesSource"] = "season_average_weighted_estimate"
        return

    weighted_rows = []
    total_weight = 0.0
    for row in player_rows:
        weight = estimate_player_game_minute_weight(row)
        weighted_rows.append({
            "row": row,
            "weight": weight,
            "minutes": 0,
            "fraction": 0.0,
        })
        total_weight += weight

    if total_weight <= 0:
        total_weight = float(len(weighted_rows))
        for item in weighted_rows:
            item["weight"] = 1.0

    allocated = 0
    for item in weighted_rows:
        raw_minutes = target_total * item["weight"] / total_weight
        item["minutes"] = int(math.floor(raw_minutes))
        item["fraction"] = raw_minutes - item["minutes"]
        allocated += item["minutes"]

    if target_total >= len(weighted_rows):
        for item in weighted_rows:
            if item["minutes"] < 1:
                item["minutes"] = 1

    allocated = sum(item["minutes"] for item in weighted_rows)
    if allocated > target_total:
        excess = allocated - target_total
        weighted_rows.sort(
            key=lambda item: (
                -item["minutes"],
                item["fraction"],
                str(item["row"].get("gameId") or ""),
            )
        )
        index = 0
        while excess > 0 and index < len(weighted_rows) * max(2, target_total):
            item = weighted_rows[index % len(weighted_rows)]
            if item["minutes"] > 1:
                item["minutes"] -= 1
                excess -= 1
            index += 1
    elif allocated < target_total:
        deficit = allocated - target_total
        weighted_rows.sort(
            key=lambda item: (
                -item["fraction"],
                -item["weight"],
                str(item["row"].get("gameId") or ""),
            )
        )
        for index in range(-deficit):
            weighted_rows[index % len(weighted_rows)]["minutes"] += 1

    for item in weighted_rows:
        item["row"]["minutes"] = item["minutes"]
        item["row"]["minutesSource"] = "season_average_weighted_estimate"


def parse_clock_to_seconds(clock_text):
    minutes_text, seconds_text = str(clock_text or "0:00").split(":")
    return int(minutes_text) * 60 + int(seconds_text)


def split_name(display_name):
    tokens = [token for token in str(display_name or "").strip().split(" ") if token]
    if not tokens:
        return "", ""
    if len(tokens) == 1:
        return tokens[0], tokens[0]
    return tokens[0], " ".join(tokens[1:])


def map_position_code(raw_position):
    mapping = {
        "1": "PG",
        "2": "SG",
        "3": "SF",
        "4": "PF",
        "5": "C",
        "G": "SG",
        "F": "SF",
        "C": "C",
        "PG": "PG",
        "SG": "SG",
        "SF": "SF",
        "PF": "PF",
    }
    return mapping.get(str(raw_position or "").strip().upper(), "SF")


def secondary_positions(primary):
    mapping = {
        "PG": ["SG"],
        "SG": ["PG", "SF"],
        "SF": ["SG", "PF"],
        "PF": ["SF", "C"],
        "C": ["PF"],
    }
    return mapping.get(primary, [])


def infer_depth_tag(position, role_index):
    return f"{position}{role_index}"


def parse_dropdown_players(team_html):
    pattern = re.compile(
        r'<a class="dropdown-item" href="\\(?P<player_id>\d+)RegularSeasonBoxScore\.html">(?P<name>[^<]+)</a>'
    )
    players = []
    seen = set()
    for match in pattern.finditer(team_html):
        player_numeric_id = str(match.group("player_id")).strip()
        display_name = str(match.group("name")).strip()
        if not player_numeric_id or not display_name or player_numeric_id in seen:
            continue
        seen.add(player_numeric_id)
        players.append({"playerNumericId": player_numeric_id, "displayName": display_name})
    return players


def parse_player_position(player_html):
    match = re.search(r"<b>Position:\s*</b>\s*([^<]+)</p>", player_html)
    return map_position_code(match.group(1) if match else "")


def strip_html_text(value):
    return unescape(re.sub(r"<[^>]+>", "", str(value or ""))).strip()


def parse_team_boxscore_totals(team_html):
    table_match = re.search(r"<table>(.*?)</table>", team_html, re.S)
    if not table_match:
        return []

    rows = re.findall(r"<tr>(.*?)</tr>", table_match.group(1), re.S)
    parsed_rows = []
    for row in rows[2:]:
        cells = [strip_html_text(cell) for cell in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", row, re.S)]
        if len(cells) < 3 + (len(TEAM_PAGE_TOTAL_FIELDS) * 3):
            continue
        display_name = cells[0]
        if not display_name or display_name.upper() == "PLAYER":
            continue
        totals = [to_int(cells[index]) for index in range(3, len(cells), 3)]
        if len(totals) < len(TEAM_PAGE_TOTAL_FIELDS):
            continue
        totals_by_key = {}
        for stat_index, (target_key, _) in enumerate(TEAM_PAGE_TOTAL_FIELDS):
            totals_by_key[target_key] = totals[stat_index]
        parsed_rows.append(
            {
                "displayName": display_name,
                "rawPosition": cells[1],
                "position": map_position_code(cells[1]),
                "minutes": to_int(cells[2]),
                "totals": totals_by_key,
            }
        )
    return parsed_rows


def align_team_page_totals(dropdown_players, total_rows, team_abbr):
    if len(dropdown_players) != len(total_rows):
        raise RuntimeError(
            f"Team page `{team_abbr}` exposed {len(dropdown_players)} dropdown players but {len(total_rows)} total rows."
        )

    totals_by_normalized_name = defaultdict(list)
    for row in total_rows:
        totals_by_normalized_name[normalize_name(row["displayName"])].append(row)

    aligned = {}
    for player_entry in dropdown_players:
        player_numeric_id = player_entry["playerNumericId"]
        normalized_name = normalize_name(player_entry["displayName"])
        matching_rows = totals_by_normalized_name.get(normalized_name, [])
        if not matching_rows:
            raise RuntimeError(
                f"Team page `{team_abbr}` player `{player_entry['displayName']}` was missing a totals row."
            )
        aligned[player_numeric_id] = matching_rows.pop(0)

    return aligned


def parse_list_data_urls():
    urls = {}
    for line in fetch_text(LIST_DATA_URL, "list_data").splitlines():
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        urls[key.strip()] = value.strip()
    return urls


def team_key_from_row(row):
    return str(row.get("PLAYER1_TEAM_ID") or row.get("PLAYER2_TEAM_ID") or row.get("PLAYER3_TEAM_ID") or "").strip()


def row_side_from_legacy(row):
    if str(row.get("HOMEDESCRIPTION") or "").strip():
        return "home"
    if str(row.get("VISITORDESCRIPTION") or "").strip():
        return "away"
    return ""


def extract_involved_players(row, team_numeric_id):
    involved = []
    for index in (1, 2, 3):
        player_id = str(row.get(f"PLAYER{index}_ID") or "").strip()
        player_team_id = str(row.get(f"PLAYER{index}_TEAM_ID") or "").strip()
        if player_team_id != team_numeric_id:
            continue
        if not player_id or player_id == "0":
            continue
        involved.append(player_id)
    return involved


def infer_period_starters(period_rows, team_numeric_id, previous_lineup):
    first_seen = {}
    active_order = []
    active_set = set()

    for row in period_rows:
        if str(row.get("EVENTMSGTYPE") or "").strip() == "8" and str(row.get("PLAYER1_TEAM_ID") or "").strip() == team_numeric_id:
            outgoing = str(row.get("PLAYER1_ID") or "").strip()
            incoming = str(row.get("PLAYER2_ID") or "").strip()
            if outgoing and outgoing != "0" and outgoing not in first_seen:
                first_seen[outgoing] = "outgoing"
            if incoming and incoming != "0" and incoming not in first_seen:
                first_seen[incoming] = "incoming"

        for player_id in extract_involved_players(row, team_numeric_id):
            if player_id not in first_seen:
                first_seen[player_id] = "action"
            if player_id not in active_set:
                active_set.add(player_id)
                active_order.append(player_id)

    starters = [player_id for player_id in active_order if first_seen.get(player_id) != "incoming"]

    if len(starters) < 5 and previous_lineup:
        for player_id in previous_lineup:
            if player_id in active_set and player_id not in starters and first_seen.get(player_id) != "incoming":
                starters.append(player_id)
            if len(starters) == 5:
                break

    deduped = []
    seen = set()
    for player_id in starters:
        if player_id in seen:
            continue
        seen.add(player_id)
        deduped.append(player_id)

    return deduped[:5]


def derive_game_boxscore(game_rows, game_id):
    rows = sorted(game_rows, key=lambda row: (to_int(row.get("PERIOD")), -parse_clock_to_seconds(row.get("PCTIMESTRING")), to_int(row.get("EVENTNUM"))))

    team_side_map = {}
    for row in rows:
        side = row_side_from_legacy(row)
        if not side:
            continue
        for team_field in ("PLAYER1_TEAM_ID", "PLAYER2_TEAM_ID", "PLAYER3_TEAM_ID"):
            team_id = str(row.get(team_field) or "").strip()
            if team_id and team_id != "0":
                team_side_map.setdefault(side, team_id)
                break
        if "home" in team_side_map and "away" in team_side_map:
            break

    if "home" not in team_side_map or "away" not in team_side_map:
        raise RuntimeError(f"Could not infer home/away teams for game `{game_id}`.")

    home_team_numeric_id = team_side_map["home"]
    away_team_numeric_id = team_side_map["away"]

    player_stats = defaultdict(lambda: defaultdict(int))
    player_games = defaultdict(set)
    player_team_refs = defaultdict(lambda: defaultdict(int))
    player_start_counts = defaultdict(int)
    player_start_pos = defaultdict(lambda: defaultdict(int))
    first_period_rows = [row for row in rows if to_int(row.get("PERIOD")) == 1]
    for team_numeric_id in (home_team_numeric_id, away_team_numeric_id):
        starters = infer_period_starters(first_period_rows, team_numeric_id, [])
        if len(starters) != 5:
            continue
        for order_index, player_id in enumerate(starters):
            player_games[player_id].add(game_id)
            player_team_refs[player_id][team_numeric_id] += 1
            player_start_counts[player_id] += 1
            start_position = ["PG", "SG", "SF", "PF", "C"][order_index]
            player_start_pos[player_id][start_position] += 1

    for row in rows:
        msg_type = str(row.get("EVENTMSGTYPE") or "").strip()
        player_id = str(row.get("PLAYER1_ID") or "").strip()
        team_numeric_id = str(row.get("PLAYER1_TEAM_ID") or "").strip()
        secondary_player_id = str(row.get("PLAYER2_ID") or "").strip()
        secondary_team_numeric_id = str(row.get("PLAYER2_TEAM_ID") or "").strip()
        tertiary_player_id = str(row.get("PLAYER3_ID") or "").strip()
        tertiary_team_numeric_id = str(row.get("PLAYER3_TEAM_ID") or "").strip()
        description = str(row.get("HOMEDESCRIPTION") or row.get("VISITORDESCRIPTION") or "")
        description_upper = description.upper()

        for involved_team_id, involved_player_id in (
            (team_numeric_id, player_id),
            (secondary_team_numeric_id, secondary_player_id),
            (tertiary_team_numeric_id, tertiary_player_id),
        ):
            if not involved_team_id or not involved_player_id or involved_player_id == "0":
                continue
            player_games[involved_player_id].add(game_id)
            player_team_refs[involved_player_id][involved_team_id] += 1

        if msg_type == "1" and player_id and team_numeric_id:
            player_stats[player_id]["points"] += 3 if "3PT" in description_upper else 2
            player_stats[player_id]["fgm"] += 1
            player_stats[player_id]["fga"] += 1
            if "3PT" in description_upper:
                player_stats[player_id]["threePointersMade"] += 1
            if secondary_player_id and secondary_player_id != "0" and secondary_team_numeric_id == team_numeric_id:
                player_stats[secondary_player_id]["assists"] += 1
            continue

        if msg_type == "2" and player_id and team_numeric_id:
            player_stats[player_id]["fga"] += 1
            if tertiary_player_id and tertiary_player_id != "0" and tertiary_team_numeric_id:
                player_stats[tertiary_player_id]["blocks"] += 1
            continue

        if msg_type == "3" and player_id and team_numeric_id:
            player_stats[player_id]["fta"] += 1
            if "MISS" not in description_upper:
                player_stats[player_id]["points"] += 1
                player_stats[player_id]["ftm"] += 1
            continue

        if msg_type == "4" and player_id and player_id != "0" and team_numeric_id and team_numeric_id != "0":
            player_stats[player_id]["rebounds"] += 1
            continue

        if msg_type == "5" and player_id and team_numeric_id:
            player_stats[player_id]["turnovers"] += 1
            if secondary_player_id and secondary_player_id != "0" and secondary_team_numeric_id:
                player_stats[secondary_player_id]["steals"] += 1
            continue

    final_score_home = 0
    final_score_away = 0
    for row in rows:
        score_text = str(row.get("SCORE") or "").strip()
        if not score_text or " - " not in score_text:
            continue
        away_score_text, home_score_text = [part.strip() for part in score_text.split(" - ", 1)]
        final_score_home = max(final_score_home, to_int(home_score_text))
        final_score_away = max(final_score_away, to_int(away_score_text))

    per_player_game_stats = {}
    for player_id, stats in player_stats.items():
        team_refs = player_team_refs.get(player_id, {})
        if not team_refs:
            continue
        primary_team_numeric_id = max(team_refs.items(), key=lambda item: (item[1], item[0]))[0]
        per_player_game_stats[player_id] = {
            "teamNumericId": primary_team_numeric_id,
            "minutes": 0,
            "points": stats["points"],
            "rebounds": stats["rebounds"],
            "assists": stats["assists"],
            "steals": stats["steals"],
            "blocks": stats["blocks"],
            "turnovers": stats["turnovers"],
            "threePointersMade": stats["threePointersMade"],
            "fgm": stats["fgm"],
            "fga": stats["fga"],
            "ftm": stats["ftm"],
            "fta": stats["fta"],
        }

    return {
        "homeTeamNumericId": home_team_numeric_id,
        "awayTeamNumericId": away_team_numeric_id,
        "homeScore": final_score_home,
        "awayScore": final_score_away,
        "playerGameStats": per_player_game_stats,
        "playerTeamRefs": player_team_refs,
        "playerGames": player_games,
        "playerStartCounts": player_start_counts,
        "playerStartPos": player_start_pos,
    }


def main():
    ensure_dir(PACK_ROOT)
    generated_at = datetime.now(UTC).isoformat(timespec="milliseconds").replace("+00:00", "Z")

    team_defs = []
    team_by_abbr = {}
    for team in TEAM_DEFS:
        team_copy = dict(team)
        team_copy["teamId"] = f"nba_2001_{team['slug']}"
        team_defs.append(team_copy)
        team_by_abbr[team_copy["abbr"]] = team_copy

    list_data_urls = parse_list_data_urls()
    if "nbastats_2000" not in list_data_urls or "pbpstats_2000" not in list_data_urls:
        raise RuntimeError("Required 2000-01 season archives were not found in the source dataset index.")

    pbp_rows = fetch_tar_csv_rows(list_data_urls["nbastats_2000"], "nbastats_2000")
    possession_rows = fetch_tar_csv_rows(list_data_urls["pbpstats_2000"], "pbpstats_2000")

    game_dates = {}
    for row in possession_rows:
        game_id = str(row.get("GAMEID") or "").strip()
        game_date = str(row.get("GAMEDATE") or "").strip()
        if not game_id or not game_date:
            continue
        if REGULAR_SEASON_START <= game_date <= REGULAR_SEASON_END:
            game_dates[game_id] = game_date

    regular_games_by_id = defaultdict(list)
    team_numeric_to_abbr = {}
    for row in pbp_rows:
        game_id = str(row.get("GAME_ID") or "").strip()
        if not game_id or game_id not in game_dates:
            continue
        regular_games_by_id[game_id].append(row)
        for index in (1, 2, 3):
            team_numeric_id = str(row.get(f"PLAYER{index}_TEAM_ID") or "").strip()
            abbr = str(row.get(f"PLAYER{index}_TEAM_ABBREVIATION") or "").strip().upper()
            if team_numeric_id and team_numeric_id != "0" and abbr:
                team_numeric_to_abbr[team_numeric_id] = abbr

    if not regular_games_by_id:
        raise RuntimeError("No 2000-01 regular-season game rows were found in the source dataset.")

    team_by_numeric = {}
    for team_numeric_id, abbr in sorted(team_numeric_to_abbr.items()):
        if abbr not in team_by_abbr:
            raise RuntimeError(f"Source team abbreviation `{abbr}` is not defined in the 2000-01 team map.")
        team_by_numeric[team_numeric_id] = team_by_abbr[abbr]

    if len({team["teamId"] for team in team_by_numeric.values()}) != 29:
        raise RuntimeError(
            f"Expected 29 teams from the 2000-01 source rows, found {len({team['teamId'] for team in team_by_numeric.values()})}."
        )

    team_page_players = defaultdict(dict)
    team_page_totals = defaultdict(dict)
    player_team_candidates = defaultdict(set)
    team_numeric_by_team_id = {team["teamId"]: team_numeric_id for team_numeric_id, team in team_by_numeric.items()}
    for team in team_defs:
        team_html = fetch_text(
            TEAM_PAGE_URL.format(season=SOURCE_SEASON, abbr=quote(team["abbr"])),
            f"team_page_{team['abbr'].lower()}",
        )
        dropdown_players = parse_dropdown_players(team_html)
        if not dropdown_players:
            raise RuntimeError(f"Team page for `{team['abbr']}` did not expose any player links.")
        aligned_totals = align_team_page_totals(dropdown_players, parse_team_boxscore_totals(team_html), team["abbr"])
        for player_entry in dropdown_players:
            player_numeric_id = player_entry["playerNumericId"]
            team_page_players[team["teamId"]][player_numeric_id] = player_entry["displayName"]
            team_page_totals[team["teamId"]][player_numeric_id] = aligned_totals[player_numeric_id]
            player_team_candidates[player_numeric_id].add(team["teamId"])

    game_ids = sorted(regular_games_by_id.keys(), key=lambda value: (game_dates[value], value))

    player_season = defaultdict(
        lambda: {
            "displayName": "",
            "games": set(),
            "teamRefs": defaultdict(int),
            "gamesStarted": 0,
            "startPos": defaultdict(int),
        }
    )

    schedule = []
    games = []
    player_game_stats = []
    source_game_to_canonical = {}

    unique_dates = []
    date_to_index = {}

    for game_number, source_game_id in enumerate(game_ids, start=1):
        derived = derive_game_boxscore(regular_games_by_id[source_game_id], source_game_id)
        game_date = game_dates[source_game_id]
        if game_date not in date_to_index:
            date_to_index[game_date] = len(unique_dates)
            unique_dates.append(game_date)

        home_team = team_by_numeric[derived["homeTeamNumericId"]]
        away_team = team_by_numeric[derived["awayTeamNumericId"]]
        canonical_game_id = f"nba_2001_game_{game_number:04d}"
        source_game_to_canonical[source_game_id] = canonical_game_id

        schedule.append(
            {
                "gameId": canonical_game_id,
                "seasonId": SEASON_ID,
                "gameDate": game_date,
                "homeTeamId": home_team["teamId"],
                "awayTeamId": away_team["teamId"],
                "isRegularSeason": True,
                "gameNumber": game_number,
                "weekLabel": f"Week {date_to_index[game_date] // 7 + 1}",
                "dayLabel": f"Day {date_to_index[game_date] % 7 + 1}",
                "externalRefs": {
                    "sourceGameId": source_game_id,
                    "sourceGameDate": game_date,
                },
            }
        )

        winner_team_id = home_team["teamId"] if derived["homeScore"] >= derived["awayScore"] else away_team["teamId"]
        loser_team_id = away_team["teamId"] if winner_team_id == home_team["teamId"] else home_team["teamId"]
        games.append(
            {
                "gameId": canonical_game_id,
                "seasonId": SEASON_ID,
                "status": "final",
                "homeScore": derived["homeScore"],
                "awayScore": derived["awayScore"],
                "winnerTeamId": winner_team_id,
                "loserTeamId": loser_team_id,
            }
        )

        matchup_team_ids = {
            "home": home_team["teamId"],
            "away": away_team["teamId"],
        }

        for player_numeric_id, games_seen in derived["playerGames"].items():
            player_season[player_numeric_id]["games"].update(games_seen)
        for player_numeric_id, team_refs in derived["playerTeamRefs"].items():
            for numeric_team_id, ref_count in team_refs.items():
                player_season[player_numeric_id]["teamRefs"][numeric_team_id] += ref_count

        for player_numeric_id, stat_line in derived["playerGameStats"].items():
            canonical_team = team_by_numeric.get(stat_line["teamNumericId"])
            if not canonical_team:
                raise RuntimeError(
                    f"Game `{source_game_id}` produced player `{player_numeric_id}` on unknown team `{stat_line['teamNumericId']}`."
                )

            opponent_team_id = matchup_team_ids["away"] if canonical_team["teamId"] == matchup_team_ids["home"] else matchup_team_ids["home"]
            canonical_player_id = f"nba_2001_{slugify(player_numeric_id)}"
            display_name = ""
            for team_id in player_team_candidates.get(player_numeric_id, set()):
                display_name = team_page_players[team_id].get(player_numeric_id, "")
                if display_name:
                    break
            if not display_name:
                display_name = str(player_numeric_id)

            player_season[player_numeric_id]["displayName"] = display_name

            player_game_stats.append(
                {
                    "playerId": f"nba_2001_{slugify(display_name)}_{player_numeric_id}",
                    "gameId": canonical_game_id,
                    "seasonId": SEASON_ID,
                    "teamId": canonical_team["teamId"],
                    "opponentTeamId": opponent_team_id,
                    "minutes": 0,
                    "points": stat_line["points"],
                    "rebounds": stat_line["rebounds"],
                    "assists": stat_line["assists"],
                    "steals": stat_line["steals"],
                    "blocks": stat_line["blocks"],
                    "turnovers": stat_line["turnovers"],
                    "threePointersMade": stat_line["threePointersMade"],
                    "fgm": stat_line["fgm"],
                    "fga": stat_line["fga"],
                    "ftm": stat_line["ftm"],
                    "fta": stat_line["fta"],
                    "statSource": "stats_nba_com_event_boxscore",
                }
            )

        for player_numeric_id, start_count in derived["playerStartCounts"].items():
            player_season[player_numeric_id]["gamesStarted"] += start_count
        for player_numeric_id, start_positions in derived["playerStartPos"].items():
            for position, count in start_positions.items():
                player_season[player_numeric_id]["startPos"][position] += count

    union_player_ids = sorted(set(player_team_candidates.keys()) | set(player_season.keys()), key=lambda value: (to_int(value), value))
    if not union_player_ids:
        raise RuntimeError("No 2000-01 player rows were discovered while building the pack.")

    players = []
    player_numeric_to_canonical = {}

    for player_numeric_id in union_player_ids:
        display_name = player_season[player_numeric_id]["displayName"]
        if not display_name:
            roster_names = []
            for team_id in sorted(player_team_candidates.get(player_numeric_id, set())):
                roster_name = team_page_players[team_id].get(player_numeric_id, "")
                if roster_name:
                    roster_names.append(roster_name)
            display_name = roster_names[0] if roster_names else f"Player {player_numeric_id}"
        first_name, last_name = split_name(display_name)

        aggregate_totals = defaultdict(int)
        team_minutes = defaultdict(int)
        primary_position = ""
        for team_id in sorted(player_team_candidates.get(player_numeric_id, set())):
            team_totals = team_page_totals.get(team_id, {}).get(player_numeric_id)
            if not team_totals:
                continue
            team_minutes[team_id] += team_totals["minutes"]
            if not primary_position and team_totals["position"]:
                primary_position = team_totals["position"]
            for stat_key in (
                "points",
                "rebounds",
                "assists",
                "steals",
                "blocks",
                "turnovers",
                "threePointersMade",
                "fgm",
                "fga",
                "ftm",
                "fta",
            ):
                aggregate_totals[stat_key] += team_totals["totals"].get(stat_key, 0)

        if team_minutes:
            primary_team_id = max(team_minutes.items(), key=lambda item: (item[1], item[0]))[0]
            primary_team = next(team for team in team_defs if team["teamId"] == primary_team_id)
            primary_team_numeric_id = team_numeric_by_team_id.get(primary_team_id, "")
        elif player_season[player_numeric_id]["teamRefs"]:
            primary_team_numeric_id = max(player_season[player_numeric_id]["teamRefs"].items(), key=lambda item: (item[1], item[0]))[0]
            primary_team = team_by_numeric[primary_team_numeric_id]
            primary_team_id = primary_team["teamId"]
        else:
            candidate_team_ids = sorted(player_team_candidates.get(player_numeric_id, set()))
            if not candidate_team_ids:
                raise RuntimeError(f"Player `{player_numeric_id}` had no team candidates.")
            primary_team_id = candidate_team_ids[0]
            primary_team = next(team for team in team_defs if team["teamId"] == primary_team_id)
            primary_team_numeric_id = team_numeric_by_team_id.get(primary_team_id, "")

        if not primary_position:
            primary_position = "SF"

        games_played = len(player_season[player_numeric_id]["games"])
        if games_played <= 0 and (sum(aggregate_totals.values()) > 0 or sum(team_minutes.values()) > 0):
            games_played = 1
        games_played = max(games_played, player_season[player_numeric_id]["gamesStarted"])
        divisor = games_played if games_played > 0 else 1
        per_game = {
            "min": round_stat(sum(team_minutes.values()) / divisor if team_minutes else 0, 1),
            "pts": round_stat(aggregate_totals["points"] / divisor, 1),
            "reb": round_stat(aggregate_totals["rebounds"] / divisor, 1),
            "ast": round_stat(aggregate_totals["assists"] / divisor, 1),
            "stl": round_stat(aggregate_totals["steals"] / divisor, 1),
            "blk": round_stat(aggregate_totals["blocks"] / divisor, 1),
            "to": round_stat(aggregate_totals["turnovers"] / divisor, 1),
            "fgm": round_stat(aggregate_totals["fgm"] / divisor, 1),
            "fga": round_stat(aggregate_totals["fga"] / divisor, 1),
            "ftm": round_stat(aggregate_totals["ftm"] / divisor, 1),
            "fta": round_stat(aggregate_totals["fta"] / divisor, 1),
            "threes": round_stat(aggregate_totals["threePointersMade"] / divisor, 1),
        }

        canonical_player_id = f"nba_2001_{slugify(display_name)}_{player_numeric_id}"
        player_numeric_to_canonical[player_numeric_id] = {
            "playerId": canonical_player_id,
            "teamId": primary_team["teamId"],
        }

        players.append(
            {
                "playerId": canonical_player_id,
                "seasonId": SEASON_ID,
                "displayName": display_name,
                "firstName": first_name,
                "lastName": last_name or first_name,
                "teamId": primary_team["teamId"],
                "primaryPosition": primary_position,
                "secondaryPositions": secondary_positions(primary_position),
                "status": "active",
                "draftEligible": True,
                "bio": f"{display_name} is part of the 2000-01 {primary_team['displayName']} historical player pool.",
                "externalRefs": {
                    "sourcePlayerId": player_numeric_id,
                    "theBasketballDatabasePage": f"{player_numeric_id}RegularSeasonBoxScore.html",
                    "sourceTeamId": primary_team_numeric_id,
                },
                "seasonStats": {
                    "source": "the_basketball_database_team_box_scores",
                    "sourceSeason": SOURCE_SEASON,
                    "sourceTeamCode": primary_team["abbr"],
                    "games": games_played,
                    "gamesStarted": player_season[player_numeric_id]["gamesStarted"],
                    "perGame": per_game,
                    "totals": {
                        "min": int(round(sum(team_minutes.values()))) if team_minutes else 0,
                        "pts": aggregate_totals["points"],
                        "reb": aggregate_totals["rebounds"],
                        "ast": aggregate_totals["assists"],
                        "stl": aggregate_totals["steals"],
                        "blk": aggregate_totals["blocks"],
                        "to": aggregate_totals["turnovers"],
                        "fgm": aggregate_totals["fgm"],
                        "fga": aggregate_totals["fga"],
                        "ftm": aggregate_totals["ftm"],
                        "fta": aggregate_totals["fta"],
                        "threes": aggregate_totals["threePointersMade"],
                    },
                },
            }
        )

    players.sort(key=lambda item: (item["teamId"], item["displayName"]))

    canonical_id_remap = {player["playerId"]: player["playerId"] for player in players}
    players_by_id = {player["playerId"]: player for player in players}
    player_game_stats_by_player = defaultdict(list)
    for stat_row in player_game_stats:
        player_match = players_by_id.get(stat_row["playerId"])
        if player_match is None:
            # Player rows are built from the same ids; if one is missing, hard fail rather than silently dropping it.
            raise RuntimeError(f"Generated player game stat row for `{stat_row['playerId']}` without a matching player record.")
        player_game_stats_by_player[stat_row["playerId"]].append(stat_row)

    for player_id, stat_rows in player_game_stats_by_player.items():
        player_match = players_by_id[player_id]
        assign_inferred_player_game_minutes(stat_rows, player_match["seasonStats"]["perGame"]["min"])

    team_player_buckets = defaultdict(list)
    for player in players:
        team_player_buckets[player["teamId"]].append(player)

    roster_snapshots = []
    for team_id, team_players in team_player_buckets.items():
        sorted_team_players = sorted(
            team_players,
            key=lambda player: (
                -to_int(player["seasonStats"]["gamesStarted"]),
                -round_stat(player["seasonStats"]["perGame"]["min"], 1),
                player["displayName"],
            ),
        )
        position_counts = defaultdict(int)
        for player in sorted_team_players:
            games_started = to_int(player["seasonStats"]["gamesStarted"])
            per_game_min = round_stat(player["seasonStats"]["perGame"]["min"], 1)
            games_played = to_int(player["seasonStats"]["games"])
            if games_started >= max(20, int(games_played * 0.45)):
                role = "starter"
            elif per_game_min >= 20:
                role = "rotation"
            elif games_played > 0:
                role = "bench"
            else:
                role = "inactive"
            position_counts[player["primaryPosition"]] += 1
            roster_snapshots.append(
                {
                    "seasonId": SEASON_ID,
                    "teamId": team_id,
                    "playerId": player["playerId"],
                    "rosterRole": role,
                    "depthTag": infer_depth_tag(player["primaryPosition"], position_counts[player["primaryPosition"]]),
                    "startDate": REGULAR_SEASON_START,
                    "endDate": REGULAR_SEASON_END,
                }
            )

    teams = []
    for team in team_defs:
        teams.append(
            {
                "teamId": team["teamId"],
                "seasonId": SEASON_ID,
                "city": team["city"],
                "name": team["name"],
                "displayName": team["displayName"],
                "abbreviation": team["abbr"],
                "conference": team["conference"],
                "division": team["division"],
                "palette": team["palette"],
                "externalRefs": {
                    "sourceTeamCode": team["abbr"],
                    "theBasketballDatabasePage": f"{SOURCE_SEASON}{team['abbr']}RegularSeasonBoxScore.html",
                },
            }
        )

    season = {
        "seasonId": SEASON_ID,
        "sport": "nba",
        "league": "nba",
        "label": SEASON_LABEL,
        "startDate": REGULAR_SEASON_START,
        "endDate": REGULAR_SEASON_END,
        "seasonType": "historical_pack",
        "isHistorical": True,
        "eraTags": ["2000s", "Dynasty Transition", "Historic Season"],
        "notes": [
            "Full-league historical foundation pack for 2000-01.",
            "Supports Historic Season, Draft The Era, and Reimagined Season.",
        ],
    }

    real_stat_players = sum(1 for player in players if to_int(player["seasonStats"]["games"]) > 0)
    zero_game_players = sum(1 for player in players if to_int(player["seasonStats"]["games"]) <= 0)

    manifest = {
        "packId": PACK_ID,
        "schemaVersion": 1,
        "canonicalModelVersion": 1,
        "sport": "nba",
        "league": "nba",
        "seasonId": SEASON_ID,
        "seasonLabel": SEASON_LABEL,
        "seasonType": "historical_pack",
        "isHistorical": True,
        "era": "2000s",
        "version": 1,
        "status": "ready",
        "sourceProfile": "historical_curated",
        "supportedModes": ["historical_draft", "single_player_season", "reimagined_season"],
        "defaultEntryMode": "single_player_season",
        "focusTeamId": "nba_2001_lal",
        "subtitle": "Start a historic season, redraft the era, or branch into a turn-of-the-century alternate universe.",
        "description": "A 2000-01 NBA historical season pack built from historical team, player, schedule, result, and player-game data.",
        "tagline": "Shaq, Kobe, Iverson, and the league at a turn-of-the-century peak.",
        "eraTags": ["2000s", "Dynasty Era", "Historic Season"],
        "packTags": ["historical-full-league-foundation", "single-player", "historical-draft", "reimagined-season", "featured-pack"],
        "playerPoolType": "full_season_player_pool",
        "draftModes": ["snake", "auction"],
        "challengeProfile": "featured_team_plus_open_draft",
        "contentFiles": {
            "season": "season.json",
            "teams": "teams.json",
            "players": "players.json",
            "rosterSnapshots": "roster_snapshots.json",
            "schedule": "schedule.json",
            "games": "games.json",
            "playerGameStats": "player_game_stats.json",
            "packChallenges": "optional/pack_challenges.json",
            "presentation": "optional/presentation.json",
            "summaries": "optional/summaries.json",
        },
        "provenance": {
            "sourceProfile": "historical_curated",
            "curationOwner": "RosterBate",
            "reviewStatus": "draft",
            "importNotes": "2000-01 pack built from official stats.nba.com play-by-play archives published by shufinskiy/nba_data for schedule, results, and game-event stats, with team-page season totals and roster metadata sourced from TheBasketballDatabase.",
        },
        "auditSummary": {
            "realStatCoverage": {
                "playersWithRealSeasonStats": real_stat_players,
                "playerCount": len(players),
                "label": "Historical season stats",
            },
            "zeroGamePlayers": {
                "count": zero_game_players,
                "label": "Zero-game players",
            },
            "removedInvalidPlayers": {
                "count": 0,
                "label": "Removed invalid players",
            },
        },
        "notes": [
            "Schedule and final scores come from official 2000-01 regular-season play-by-play archives.",
            "Season totals, minutes, and roster metadata come from TheBasketballDatabase team box-score pages.",
            "Per-game player stat rows carry official event totals with weighted minute estimates normalized to season-average workloads.",
            "The pack spotlights the Lakers dynasty lane while preserving the full-league player pool.",
        ],
        "createdAt": generated_at,
        "updatedAt": generated_at,
    }

    presentation = {
        "heroTitle": SEASON_LABEL,
        "heroSubtitle": "Choose a historic season path around Shaq and Kobe or redraft the full turn-of-the-century league.",
        "featuredTeamId": "nba_2001_lal",
        "featuredStars": [
            "nba_2001_shaquille_o_neal_406",
            "nba_2001_kobe_bryant_977",
            "nba_2001_allen_iverson_947",
            "nba_2001_tim_duncan_1495",
            "nba_2001_kevin_garnett_708",
            "nba_2001_chris_webber_185",
        ],
        "artDirection": {
            "heroTone": "dynasty",
            "primaryPalette": ["#5f3293", "#f0c461", "#111111"],
            "backgroundStyle": "historic_arena_spotlight",
        },
        "entryModes": [
            {"mode": "single_player_season", "label": "Historic Season", "description": "Choose one 2000-01 team and play through the full historical season."},
            {"mode": "historical_draft", "label": "Draft The Era", "description": "Redraft the full 2000-01 player pool into a new fantasy universe."},
            {"mode": "reimagined_season", "label": "Reimagined Season", "description": "Launch a reshuffled 2000-01 and play the alternate branch from opening night."},
        ],
    }

    summaries = {
        "packSummary": "The 2000-01 NBA season pack gives Historic Seasons a turn-of-the-century flagship with historical full-season player production, the full schedule/results grid, and a full-league player pool built for Historic Season runs, Draft The Era, and Reimagined Season.",
        "featuredStorylines": [
            "The Lakers title-defense season anchors the pack with Shaq-and-Kobe dynasty energy from opening night forward.",
            "Iverson's MVP season, Duncan's Spurs, Garnett's rise, and Webber's Kings keep the full-league fantasy board loaded well beyond Los Angeles.",
            "The archive gains a true early-2000s lane with different pacing, spacing, and roster texture from both the 1990s and modern packs.",
        ],
        "teamSpotlights": [
            {"teamId": "nba_2001_lal", "summary": "The Lakers are the flagship dynasty path, built around Shaq's force, Kobe's ascent, and a title-defense season with championship gravity."},
            {"teamId": "nba_2001_phi", "summary": "Philadelphia offers the Allen Iverson MVP route and one of the era's clearest one-star-versus-the-league challenges."},
            {"teamId": "nba_2001_sas", "summary": "San Antonio provides the Duncan path with elite interior play and a disciplined contender profile."},
            {"teamId": "nba_2001_sac", "summary": "Sacramento delivers the Webber-era Kings lane and one of the era's most creative offensive cores."},
            {"teamId": "nba_2001_por", "summary": "Portland brings a deep veteran roster and a different West contender route from the dynasty spotlight teams."},
        ],
        "modeSummaries": [
            {"mode": "single_player_season", "summary": "Choose one franchise and guide it through the full 2000-01 historical season."},
            {"mode": "historical_draft", "summary": "Remix the full-league 2000-01 player universe and discover what the era becomes with custom rosters."},
            {"mode": "reimagined_season", "summary": "Launch a reshuffled version of 2000-01 and treat the season like an alternate-history branch from day one."},
        ],
        "auditSummary": manifest["auditSummary"],
        "auditNotes": [
            "Historical season stats cover every included player who logged official 2000-01 regular-season minutes.",
            "Schedule and results span the full regular season using historical game records.",
            "Per-game stat lines use official event totals with inferred minute estimates normalized to season-average workloads.",
        ],
    }

    pack_challenges = {
        "packId": PACK_ID,
        "version": 1,
        "challengeGroups": [
            {"groupId": "historic_season_paths", "label": "Historic Season Paths", "mode": "single_player_season"},
            {"groupId": "draft_the_era_paths", "label": "Draft The Era", "mode": "historical_draft"},
            {"groupId": "reimagined_paths", "label": "Reimagined Season", "mode": "reimagined_season"},
        ],
        "challenges": [
            {
                "challengeId": "lakers_repeat",
                "mode": "single_player_season",
                "path": "lakers_dynasty_path",
                "title": "Repeat The Title Run",
                "description": "Choose the Lakers and finish the season with the league's best record.",
                "type": "season_wins_min",
                "target": 56,
                "evaluation": "season_end",
                "reward": "Dynasty Standard",
                "required": False,
                "featured": True,
            },
            {
                "challengeId": "iverson_50_wins",
                "mode": "single_player_season",
                "path": "open_team_path",
                "title": "MVP Support Run",
                "description": "Choose any included team and finish with at least 50 wins.",
                "type": "season_wins_min",
                "target": 50,
                "evaluation": "season_end",
                "reward": "Turn-of-the-Century Contender",
                "required": False,
                "featured": False,
            },
            {
                "challengeId": "draft_era_60_wins",
                "mode": "historical_draft",
                "path": "alternate_history_success",
                "title": "Build A 60-Win Team",
                "description": "Complete a historical fantasy draft and finish with at least 60 wins.",
                "type": "season_wins_min",
                "target": 60,
                "evaluation": "season_end",
                "reward": "Loaded Era Architect",
                "required": False,
                "featured": True,
            },
            {
                "challengeId": "reimagined_title",
                "mode": "reimagined_season",
                "path": "reshuffled_league",
                "title": "Win The Reimagined League",
                "description": "Take your selected franchise through the reshuffled 2000-01 universe and win the title.",
                "type": "win_championship",
                "target": True,
                "evaluation": "season_end",
                "reward": "Alternate Millennium Champion",
                "required": False,
                "featured": True,
            },
        ],
    }

    write_json("manifest.json", manifest)
    write_json("season.json", season)
    write_json("teams.json", teams)
    write_json("players.json", players)
    write_json("roster_snapshots.json", roster_snapshots)
    write_json("schedule.json", schedule)
    write_json("games.json", games)
    write_json("player_game_stats.json", player_game_stats)
    write_json("optional/presentation.json", presentation)
    write_json("optional/summaries.json", summaries)
    write_json("optional/pack_challenges.json", pack_challenges)

    print(
        json.dumps(
            {
                "packId": PACK_ID,
                "teams": len(teams),
                "players": len(players),
                "rosterSnapshots": len(roster_snapshots),
                "scheduleGames": len(schedule),
                "playerGameStats": len(player_game_stats),
                "historicalSeasonStats": real_stat_players,
                "zeroGamePlayers": zero_game_players,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Failed to build historical 2000-01 pack: {exc}", file=sys.stderr)
        raise
