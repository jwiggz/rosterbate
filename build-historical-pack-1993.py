#!/usr/bin/env python
import csv
import hashlib
import io
import json
import math
import re
import sys
import tarfile
import time
from collections import defaultdict
from datetime import UTC, datetime
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import quote

import requests


REPO_ROOT = Path(__file__).resolve().parent
PACK_ID = "nba_1993_full_season_v1"
PACK_ROOT = REPO_ROOT / "historical-packs" / PACK_ID
CACHE_ROOT = REPO_ROOT / ".historical-cache" / PACK_ID
SOURCE_ROOT = REPO_ROOT / "historical-pack-sources" / PACK_ID
SEASON_ID = "nba_1993_historic"
SEASON_LABEL = "1992-93 NBA Historic Season"
SOURCE_SEASON = "1992-93"
SOURCE_SEASON_KEY = "1992"
REGULAR_SEASON_START = "1992-11-06"
REGULAR_SEASON_END = "1993-04-25"
SOURCE_MODE = "foundation_snapshot"
ENTITY_PREFIX = "nba_1993"
ERA_KEY = "1990s"
ERA_TAGS = ["1990s", "First Three-Peat Prestige", "Historic Season"]
SOURCE_PROFILE = "historical_curated"
FEATURED_TEAM_ID = f"{ENTITY_PREFIX}_chi"
SOURCE_NBASTATS_KEY = "nbastats_1992"
SOURCE_PBPSTATS_KEY = "pbpstats_1992"
HTTP_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36"
)
WIKIPEDIA_API_URL = "https://en.wikipedia.org/w/api.php"
NBAALLELO_URL = "https://raw.githubusercontent.com/fivethirtyeight/data/master/nba-elo/nbaallelo.csv"

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
    {"slug": "phl", "abbr": "PHL", "city": "Philadelphia", "name": "76ers", "displayName": "Philadelphia 76ers", "conference": "East", "division": "Atlantic", "palette": {"primary": "#006BB6", "secondary": "#ED174C"}},
    {"slug": "was", "abbr": "WAS", "city": "Washington", "name": "Bullets", "displayName": "Washington Bullets", "conference": "East", "division": "Atlantic", "palette": {"primary": "#C8102E", "secondary": "#002B5C"}},
    {"slug": "dal", "abbr": "DAL", "city": "Dallas", "name": "Mavericks", "displayName": "Dallas Mavericks", "conference": "West", "division": "Midwest", "palette": {"primary": "#00538C", "secondary": "#B8C4CA"}},
    {"slug": "den", "abbr": "DEN", "city": "Denver", "name": "Nuggets", "displayName": "Denver Nuggets", "conference": "West", "division": "Midwest", "palette": {"primary": "#0E2240", "secondary": "#FEC524"}},
    {"slug": "gos", "abbr": "GOS", "city": "Golden State", "name": "Warriors", "displayName": "Golden State Warriors", "conference": "West", "division": "Pacific", "palette": {"primary": "#1D428A", "secondary": "#FFC72C"}},
    {"slug": "hou", "abbr": "HOU", "city": "Houston", "name": "Rockets", "displayName": "Houston Rockets", "conference": "West", "division": "Midwest", "palette": {"primary": "#CE1141", "secondary": "#C4CED4"}},
    {"slug": "lac", "abbr": "LAC", "city": "Los Angeles", "name": "Clippers", "displayName": "LA Clippers", "conference": "West", "division": "Pacific", "palette": {"primary": "#ED174C", "secondary": "#1D428A"}},
    {"slug": "lal", "abbr": "LAL", "city": "Los Angeles", "name": "Lakers", "displayName": "Los Angeles Lakers", "conference": "West", "division": "Pacific", "palette": {"primary": "#552583", "secondary": "#FDB927"}},
    {"slug": "min", "abbr": "MIN", "city": "Minnesota", "name": "Timberwolves", "displayName": "Minnesota Timberwolves", "conference": "West", "division": "Midwest", "palette": {"primary": "#0C2340", "secondary": "#236192"}},
    {"slug": "phx", "abbr": "PHX", "city": "Phoenix", "name": "Suns", "displayName": "Phoenix Suns", "conference": "West", "division": "Pacific", "palette": {"primary": "#1D1160", "secondary": "#E56020"}},
    {"slug": "por", "abbr": "POR", "city": "Portland", "name": "Trail Blazers", "displayName": "Portland Trail Blazers", "conference": "West", "division": "Pacific", "palette": {"primary": "#E03A3E", "secondary": "#000000"}},
    {"slug": "sac", "abbr": "SAC", "city": "Sacramento", "name": "Kings", "displayName": "Sacramento Kings", "conference": "West", "division": "Pacific", "palette": {"primary": "#5A2D81", "secondary": "#63727A"}},
    {"slug": "san", "abbr": "SAN", "city": "San Antonio", "name": "Spurs", "displayName": "San Antonio Spurs", "conference": "West", "division": "Midwest", "palette": {"primary": "#C4CED4", "secondary": "#000000"}},
    {"slug": "sea", "abbr": "SEA", "city": "Seattle", "name": "SuperSonics", "displayName": "Seattle SuperSonics", "conference": "West", "division": "Pacific", "palette": {"primary": "#00653A", "secondary": "#FFC200"}},
    {"slug": "uth", "abbr": "UTH", "city": "Utah", "name": "Jazz", "displayName": "Utah Jazz", "conference": "West", "division": "Midwest", "palette": {"primary": "#002B5C", "secondary": "#00471B"}},
]


def ensure_dir(path_obj):
    path_obj.mkdir(parents=True, exist_ok=True)


def write_json(relative_path, value):
    target = PACK_ROOT / relative_path
    ensure_dir(target.parent)
    target.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")


def write_source_json(relative_path, value):
    target = SOURCE_ROOT / relative_path
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
    headers = {
        "User-Agent": HTTP_USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://thebasketballdatabase.com/seasonindex.html" if "thebasketballdatabase.com" in url else "https://en.wikipedia.org/",
    }
    last_error = None
    for attempt in range(5):
        response = requests.get(url, timeout=180, headers=headers)
        if response.status_code == 429:
            last_error = RuntimeError(f"429 rate limit while fetching `{url}`.")
            time.sleep(2 + attempt * 2)
            continue
        response.raise_for_status()
        text = response.text
        cache_path.write_text(text, encoding="utf-8")
        if "thebasketballdatabase.com" in url:
            time.sleep(0.5)
        return text
    if last_error is not None:
        raise last_error
    raise RuntimeError(f"Unable to fetch `{url}`.")


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


def audit_source_mode():
    urls = parse_list_data_urls()
    feed_keys = ["nbastats_1992", "pbpstats_1992"]
    present_feeds = [feed_key for feed_key in feed_keys if feed_key in urls]
    missing_feeds = [feed_key for feed_key in feed_keys if feed_key not in urls]
    if present_feeds:
        raise RuntimeError(
            "1992-93 live archive feeds unexpectedly exist: "
            f"{', '.join(present_feeds)}. Revisit the builder plan before silently switching source lanes."
        )
    return {
        "mode": SOURCE_MODE,
        "liveArchivesPresent": bool(present_feeds),
        "missingFeeds": missing_feeds,
    }


def read_source_json(name):
    path = SOURCE_ROOT / name
    if not path.exists():
        raise RuntimeError(f"Required source snapshot `{path}` is missing.")
    return json.loads(path.read_text(encoding="utf-8"))


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


class TableHtmlParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tables = []
        self.table_stack = []
        self.row_stack = []
        self.current_cell = None

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        if tag == "table":
            self.table_stack.append({"attrs": attrs_dict, "rows": []})
            return
        if not self.table_stack:
            return
        if tag == "tr":
            self.row_stack.append({"attrs": attrs_dict, "cells": []})
        elif tag in ("td", "th") and self.row_stack:
            self.current_cell = {"tag": tag, "attrs": attrs_dict, "text": "", "links": []}
        elif tag == "br" and self.current_cell is not None:
            self.current_cell["text"] += "\n"
        elif tag == "a" and self.current_cell is not None and attrs_dict.get("href"):
            self.current_cell["links"].append(attrs_dict["href"])

    def handle_endtag(self, tag):
        if tag in ("td", "th") and self.current_cell is not None and self.row_stack:
            self.current_cell["text"] = normalize_whitespace(self.current_cell["text"])
            self.row_stack[-1]["cells"].append(self.current_cell)
            self.current_cell = None
            return
        if tag == "tr" and self.row_stack and self.table_stack:
            self.table_stack[-1]["rows"].append(self.row_stack.pop())
            return
        if tag == "table" and self.table_stack:
            table = self.table_stack.pop()
            self.tables.append(table)

    def handle_data(self, data):
        if self.current_cell is not None:
            self.current_cell["text"] += data


def normalize_whitespace(value):
    return re.sub(r"\s+", " ", str(value or "")).strip()


def parse_html_tables(html_text):
    parser = TableHtmlParser()
    parser.feed(str(html_text or ""))
    parser.close()
    return parser.tables


def fetch_wikipedia_render_html(page_title, label):
    encoded_title = quote(page_title, safe="")
    url = (
        f"{WIKIPEDIA_API_URL}?action=parse&page={encoded_title}"
        "&prop=text&format=json&formatversion=2"
    )
    payload = fetch_text(url, label)
    data = json.loads(payload)
    if "parse" not in data or "text" not in data["parse"]:
        raise RuntimeError(f"Wikipedia render API did not return HTML for `{page_title}`.")
    return data["parse"]["text"]


def extract_section_html(page_html, start_markers, end_markers):
    html_text = str(page_html or "")
    start_index = -1
    for marker in start_markers:
        candidate = html_text.find(marker)
        if candidate >= 0 and (start_index < 0 or candidate < start_index):
            start_index = candidate
    if start_index < 0:
        return ""
    end_index = len(html_text)
    for marker in end_markers:
        candidate = html_text.find(marker, start_index + 1)
        if candidate >= 0:
            end_index = min(end_index, candidate)
    return html_text[start_index:end_index]


def normalize_header(value):
    header = normalize_whitespace(value).lower()
    header = re.sub(r"[^a-z0-9]+", "_", header).strip("_")
    return header


def parse_wikipedia_date(date_text):
    cleaned = normalize_whitespace(date_text)
    cleaned = re.sub(r"^(mon|tue|wed|thu|thur|thurs|fri|sat|sun)\.?,?\s*", "", cleaned, flags=re.I)
    cleaned = cleaned.replace(",", "")
    month_lookup = {
        "oct": 10,
        "october": 10,
        "nov": 11,
        "november": 11,
        "dec": 12,
        "december": 12,
        "jan": 1,
        "january": 1,
        "feb": 2,
        "february": 2,
        "mar": 3,
        "march": 3,
        "apr": 4,
        "april": 4,
    }
    match = re.search(r"(Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?)\.?\s+(\d{1,2})", cleaned, flags=re.I)
    if not match:
        raise RuntimeError(f"Unable to parse Wikipedia date `{date_text}`.")
    month_name = match.group(1).lower().rstrip(".")
    day = int(match.group(2))
    month_number = month_lookup[month_name]
    year = 1992 if month_number >= 11 else 1993
    return f"{year:04d}-{month_number:02d}-{day:02d}"


def parse_record_tuple(record_text):
    match = re.search(r"(\d+)\s*[–-]\s*(\d+)", str(record_text or ""))
    if not match:
        return None
    return int(match.group(1)), int(match.group(2))


def result_from_row_attrs(row_attrs):
    attr_values = " ".join(str(value or "") for value in row_attrs.values()).lower()
    if any(token in attr_values for token in ("#ccffcc", "#cfc", "#bbffbb", "bbffbb", "cfc")):
        return "W"
    if any(token in attr_values for token in ("#ffcccc", "#fcc", "#ffbbbb", "ffbbbb", "fcc", "edbebf")):
        return "L"
    return ""


def build_team_alias_map(team_defs):
    alias_map = {}
    manual_aliases = {
        "washington bullets": "WAS",
        "washington": "WAS",
        "bullets": "WAS",
        "golden state": "GOS",
        "golden state warriors": "GOS",
        "warriors": "GOS",
        "la clippers": "LAC",
        "l.a. clippers": "LAC",
        "los angeles clippers": "LAC",
        "clippers": "LAC",
        "la lakers": "LAL",
        "l.a. lakers": "LAL",
        "los angeles lakers": "LAL",
        "lakers": "LAL",
        "philadelphia": "PHL",
        "philadelphia 76ers": "PHL",
        "76ers": "PHL",
        "sixers": "PHL",
        "phoenix": "PHX",
        "phoenix suns": "PHX",
        "suns": "PHX",
        "san antonio": "SAN",
        "san antonio spurs": "SAN",
        "spurs": "SAN",
        "utah": "UTH",
        "utah jazz": "UTH",
        "jazz": "UTH",
        "indiana": "IND",
        "indiana pacers": "IND",
        "pacers": "IND",
        "new jersey": "NJN",
        "new jersey nets": "NJN",
        "nets": "NJN",
        "new york": "NYK",
        "new york knicks": "NYK",
        "knicks": "NYK",
        "seattle": "SEA",
        "seattle supersonics": "SEA",
        "supersonics": "SEA",
        "sonics": "SEA",
        "portland": "POR",
        "portland trail blazers": "POR",
        "trail blazers": "POR",
        "blazers": "POR",
        "sacramento": "SAC",
        "sacramento kings": "SAC",
        "kings": "SAC",
        "atlanta": "ATL",
        "atlanta hawks": "ATL",
        "hawks": "ATL",
        "boston": "BOS",
        "boston celtics": "BOS",
        "celtics": "BOS",
        "chicago": "CHI",
        "chicago bulls": "CHI",
        "bulls": "CHI",
        "cleveland": "CLE",
        "cleveland cavaliers": "CLE",
        "cavaliers": "CLE",
        "cavs": "CLE",
        "dallas": "DAL",
        "dallas mavericks": "DAL",
        "mavericks": "DAL",
        "denver": "DEN",
        "denver nuggets": "DEN",
        "nuggets": "DEN",
        "detroit": "DET",
        "detroit pistons": "DET",
        "pistons": "DET",
        "houston": "HOU",
        "houston rockets": "HOU",
        "rockets": "HOU",
        "milwaukee": "MIL",
        "milwaukee bucks": "MIL",
        "bucks": "MIL",
    }
    for alias, abbr in manual_aliases.items():
        alias_map[normalize_name(alias)] = abbr
    for team in team_defs:
        alias_map[normalize_name(team["displayName"])] = team["abbr"]
        alias_map[normalize_name(team["city"])] = team["abbr"]
        alias_map[normalize_name(team["name"])] = team["abbr"]
        alias_map[normalize_name(team["abbr"])] = team["abbr"]
    return alias_map


def parse_wikipedia_schedule_entries(team, page_title, page_html, alias_map):
    section_html = extract_section_html(
        page_html,
        ["Game log", "Game Log"],
        ["Player statistics", "Transactions", "References", "Awards and records", "Awards", "References and notes"],
    )
    if not section_html:
        return []

    entries = []
    for table in parse_html_tables(section_html):
        rows = table.get("rows", [])
        if len(rows) < 2:
            continue
        headers = [normalize_header(cell["text"]) for cell in rows[0]["cells"]]
        if "date" not in headers or "score" not in headers:
            continue
        opponent_key = "team" if "team" in headers else "opponent" if "opponent" in headers else ""
        if not opponent_key:
            continue
        if "series" in headers:
            continue

        date_index = headers.index("date")
        opponent_index = headers.index(opponent_key)
        score_index = headers.index("score")
        record_index = headers.index("record") if "record" in headers else -1
        previous_record = (0, 0)

        for row in rows[1:]:
            cells = row.get("cells", [])
            if max(date_index, opponent_index, score_index) >= len(cells):
                continue

            score_text = normalize_whitespace(cells[score_index]["text"])
            score_numbers = re.findall(r"\d+", score_text)
            if len(score_numbers) < 2:
                continue

            result_match = re.match(r"^([WL])\s*(\d+)\s*[-–]\s*(\d+)", score_text, re.I)
            result = result_match.group(1).upper() if result_match else result_from_row_attrs(row.get("attrs", {}))

            record_tuple = None
            if record_index >= 0 and record_index < len(cells):
                record_tuple = parse_record_tuple(cells[record_index]["text"])
                if not result and record_tuple is not None:
                    if record_tuple[0] > previous_record[0]:
                        result = "W"
                    elif record_tuple[1] > previous_record[1]:
                        result = "L"
            if not result and len(score_numbers) >= 2:
                result = "W" if int(score_numbers[1]) > int(score_numbers[0]) else "L"
            if record_tuple is not None:
                previous_record = record_tuple

            game_date = parse_wikipedia_date(cells[date_index]["text"])
            opponent_raw = normalize_whitespace(cells[opponent_index]["text"])
            is_away = bool(re.match(r"^(?:@\s*|at\s+|vs\.?\s+)", opponent_raw, re.I))
            opponent_clean = re.sub(r"^(?:@\s*|at\s+|vs\.?\s+)", "", opponent_raw, flags=re.I).strip()
            opponent_abbr = alias_map.get(normalize_name(opponent_clean))
            if not opponent_abbr:
                raise RuntimeError(f"Unable to map Wikipedia opponent label `{opponent_clean}` on `{page_title}`.")

            team_score_first = int(score_numbers[0])
            team_score_second = int(score_numbers[1])
            team_score = max(team_score_first, team_score_second) if result == "W" else min(team_score_first, team_score_second)
            opponent_score = min(team_score_first, team_score_second) if result == "W" else max(team_score_first, team_score_second)

            home_team_abbr = opponent_abbr if is_away else team["abbr"]
            away_team_abbr = team["abbr"] if is_away else opponent_abbr
            home_score = opponent_score if is_away else team_score
            away_score = team_score if is_away else opponent_score
            source_game_id = f"{game_date.replace('-', '')}_{away_team_abbr.lower()}_{home_team_abbr.lower()}"
            boxscore_url = ""
            for link in cells[score_index].get("links", []):
                if "basketball-reference.com/boxscores/" in link:
                    boxscore_url = link
                    break

            entries.append(
                {
                    "sourceGameId": source_game_id,
                    "gameDate": game_date,
                    "homeTeamAbbr": home_team_abbr,
                    "awayTeamAbbr": away_team_abbr,
                    "homeScore": home_score,
                    "awayScore": away_score,
                    "boxscoreUrl": boxscore_url,
                    "pageTitle": page_title,
                    "pageTeamAbbr": team["abbr"],
                }
            )

    deduped = {}
    for entry in entries:
        deduped.setdefault(entry["sourceGameId"], entry)
    return list(deduped.values())


def parse_wikipedia_player_stats(page_html):
    section_html = extract_section_html(
        page_html,
        ["Player statistics", "Player Statistics"],
        ["Transactions", "References", "Award winners", "Awards and records", "Awards"],
    )
    if not section_html:
        return {}

    parsed = {}
    for table in parse_html_tables(section_html):
        rows = table.get("rows", [])
        if len(rows) < 2:
            continue
        headers = [normalize_header(cell["text"]) for cell in rows[0]["cells"]]
        if "player" not in headers or "gp" not in headers:
            continue
        player_index = headers.index("player")
        gp_index = headers.index("gp")
        gs_index = headers.index("gs") if "gs" in headers else -1
        mpg_index = headers.index("mpg") if "mpg" in headers else -1

        row_count = 0
        for row in rows[1:]:
            cells = row.get("cells", [])
            if max(player_index, gp_index) >= len(cells):
                continue
            player_name = normalize_whitespace(cells[player_index]["text"])
            games_played = to_int(cells[gp_index]["text"])
            if not player_name or games_played <= 0:
                continue
            row_count += 1
            parsed[normalize_name(player_name)] = {
                "games": games_played,
                "gamesStarted": to_int(cells[gs_index]["text"]) if gs_index >= 0 and gs_index < len(cells) else 0,
                "minutesPerGame": float(str(cells[mpg_index]["text"]).strip() or "0") if mpg_index >= 0 and mpg_index < len(cells) else 0.0,
            }
        if row_count >= 5:
            return parsed
    return parsed


def parse_nbaallelo_schedule():
    abbr_map = {
        "ATL": "ATL",
        "BOS": "BOS",
        "CHI": "CHI",
        "CLE": "CLE",
        "DAL": "DAL",
        "DEN": "DEN",
        "DET": "DET",
        "GSW": "GOS",
        "HOU": "HOU",
        "IND": "IND",
        "LAC": "LAC",
        "LAL": "LAL",
        "MIL": "MIL",
        "NJN": "NJN",
        "NYK": "NYK",
        "PHI": "PHL",
        "PHO": "PHX",
        "POR": "POR",
        "SAC": "SAC",
        "SAS": "SAN",
        "SEA": "SEA",
        "UTA": "UTH",
        "WSB": "WAS",
    }
    games = {}
    csv_text = fetch_text(NBAALLELO_URL, "nbaallelo")
    for row in csv.DictReader(io.StringIO(csv_text)):
        if str(row.get("year_id") or "").strip() != "1993":
            continue
        if str(row.get("is_playoffs") or "").strip() != "0":
            continue
        if str(row.get("game_location") or "").strip() != "H":
            continue

        home_team_abbr = abbr_map.get(str(row.get("team_id") or "").strip())
        away_team_abbr = abbr_map.get(str(row.get("opp_id") or "").strip())
        if not home_team_abbr or not away_team_abbr:
            continue

        game_date = datetime.strptime(str(row.get("date_game") or "").strip(), "%m/%d/%Y").strftime("%Y-%m-%d")
        source_game_id = f"{game_date.replace('-', '')}_{away_team_abbr.lower()}_{home_team_abbr.lower()}"
        games[source_game_id] = {
            "sourceGameId": source_game_id,
            "gameDate": game_date,
            "homeTeamAbbr": home_team_abbr,
            "awayTeamAbbr": away_team_abbr,
            "homeScore": to_int(row.get("pts")),
            "awayScore": to_int(row.get("opp_pts")),
            "sourceTypes": ["five_thirty_eight_nbaallelo"],
            "sourceRefs": [
                {
                    "type": "five_thirty_eight_nbaallelo",
                    "gameId": str(row.get("game_id") or "").strip(),
                    "teamId": str(row.get("team_id") or "").strip(),
                }
            ],
            "boxscoreUrl": "",
        }
    return games


def build_schedule_results_snapshot(team_defs, wiki_pages, wiki_player_stats_by_abbr, source_audit):
    elo_games = parse_nbaallelo_schedule()
    if len(elo_games) != 943:
        raise RuntimeError(f"Expected 943 regular-season games from nbaallelo, found {len(elo_games)}.")

    alias_map = build_team_alias_map(team_defs)
    wiki_matched_games = set()
    wikipedia_only_refs = 0
    unmatched_wiki_rows = []
    mismatched_wiki_rows = []
    team_coverage = []

    for team in team_defs:
        page_title = wiki_pages[team["abbr"]]["pageTitle"]
        page_html = wiki_pages[team["abbr"]]["html"]
        wiki_entries = parse_wikipedia_schedule_entries(team, page_title, page_html, alias_map)
        matched_for_team = set()
        for entry in wiki_entries:
            source_key = entry["sourceGameId"]
            reverse_key = f"{entry['gameDate'].replace('-', '')}_{entry['homeTeamAbbr'].lower()}_{entry['awayTeamAbbr'].lower()}"
            resolved_key = source_key if source_key in elo_games else reverse_key if reverse_key in elo_games else ""
            if not resolved_key:
                unmatched_wiki_rows.append(entry)
                continue

            target = elo_games[resolved_key]
            matched_for_team.add(resolved_key)
            wiki_matched_games.add(resolved_key)
            wikipedia_only_refs += 1
            reference = {
                "type": "wikipedia_team_season_page",
                "pageTitle": entry["pageTitle"],
                "pageTeamAbbr": entry["pageTeamAbbr"],
                "boxscoreUrl": entry["boxscoreUrl"],
            }
            if reference not in target["sourceRefs"]:
                target["sourceRefs"].append(reference)
            if "wikipedia_team_season_page" not in target["sourceTypes"]:
                target["sourceTypes"].append("wikipedia_team_season_page")
            if (
                target["homeTeamAbbr"] != entry["homeTeamAbbr"]
                or target["awayTeamAbbr"] != entry["awayTeamAbbr"]
                or target["homeScore"] != entry["homeScore"]
                or target["awayScore"] != entry["awayScore"]
            ):
                mismatched_wiki_rows.append(
                    {
                        "sourceGameId": resolved_key,
                        "wikipedia": {
                            "homeTeamAbbr": entry["homeTeamAbbr"],
                            "awayTeamAbbr": entry["awayTeamAbbr"],
                            "homeScore": entry["homeScore"],
                            "awayScore": entry["awayScore"],
                            "pageTitle": entry["pageTitle"],
                        },
                        "backfill": {
                            "homeTeamAbbr": target["homeTeamAbbr"],
                            "awayTeamAbbr": target["awayTeamAbbr"],
                            "homeScore": target["homeScore"],
                            "awayScore": target["awayScore"],
                        },
                    }
                )

        team_coverage.append(
            {
                "teamAbbr": team["abbr"],
                "pageTitle": page_title,
                "wikipediaRegularSeasonGames": len(matched_for_team),
                "hasWikipediaGameLog": len(wiki_entries) > 0,
                "hasWikipediaPlayerStats": bool(wiki_player_stats_by_abbr.get(team["abbr"])),
                "wikipediaPlayerStatRows": len(wiki_player_stats_by_abbr.get(team["abbr"], {})),
            }
        )

    ordered_games = sorted(elo_games.values(), key=lambda item: (item["gameDate"], item["sourceGameId"]))
    for game in ordered_games:
        game["wasBackfilled"] = "wikipedia_team_season_page" not in game["sourceTypes"]

    return {
        "season": SOURCE_SEASON,
        "packId": PACK_ID,
        "sourceMode": SOURCE_MODE,
        "status": "complete_real_regular_season_foundation",
        "isPartial": False,
        "coverage": {
            "scope": "full_regular_season",
            "gamesCaptured": len(ordered_games),
            "expectedRegularSeasonGames": 943,
            "isCompleteSeason": len(ordered_games) == 943,
            "sampledDateRange": {
                "start": REGULAR_SEASON_START,
                "end": REGULAR_SEASON_END,
            },
            "wikipediaGamesMatched": len(wiki_matched_games),
            "backfilledGames": sum(1 for game in ordered_games if game["wasBackfilled"]),
            "wikipediaSourceRowsProcessed": wikipedia_only_refs,
            "unmatchedWikipediaRows": len(unmatched_wiki_rows),
            "mismatchedWikipediaRows": len(mismatched_wiki_rows),
            "missingData": [],
        },
        "provenance": {
            "liveArchivesPresent": False,
            "missingFeeds": source_audit["missingFeeds"],
            "primaryScheduleSource": "wikipedia_team_season_pages",
            "fallbackScheduleSource": "five_thirty_eight_nbaallelo",
        },
        "teamCoverage": team_coverage,
        "notes": [
            "Live nbastats_1992 / pbpstats_1992 feeds are absent, so the pack cannot use the same play-by-play ingestion lane as later seasons.",
            "Accessible Wikipedia team-season game logs are parsed wherever they expose real regular-season rows.",
            "A FiveThirtyEight historical results backfill completes the schedule grid for teams whose Wikipedia season pages are empty or partial.",
            "Player-game stat rows remain inferred from season totals and are not marketed as real event box scores.",
        ],
        "games": ordered_games,
        "audit": {
            "unmatchedWikipediaRows": unmatched_wiki_rows[:25],
            "mismatchedWikipediaRows": mismatched_wiki_rows[:25],
        },
    }


def estimate_games_played(total_minutes, team_game_count):
    total_minutes = max(0, int(total_minutes or 0))
    if total_minutes <= 0 or team_game_count <= 0:
        return 0
    estimate = int(round(total_minutes / 24))
    if total_minutes >= team_game_count * 28:
        estimate = team_game_count
    return max(1, min(team_game_count, estimate))


def estimate_games_started(total_minutes, games_played):
    if games_played <= 0:
        return 0
    average_minutes = float(total_minutes or 0) / games_played
    if average_minutes >= 32:
        return max(1, min(games_played, int(round(games_played * 0.82))))
    if average_minutes >= 26:
        return max(0, min(games_played, int(round(games_played * 0.55))))
    if average_minutes >= 20:
        return max(0, min(games_played, int(round(games_played * 0.25))))
    return 0


def build_weight_vector(length, seed):
    if length <= 0:
        return []
    weights = []
    for index in range(length):
        weights.append(1.0 + stable_fraction(f"{seed}:{index}") + ((index + 1) / max(1, length)) * 0.35)
    return weights


def allocate_weighted_integers(total, weights, capacities=None):
    count = len(weights)
    allocations = [0] * count
    total = max(0, int(total or 0))
    if total <= 0 or count == 0:
        return allocations

    if capacities is None:
        capacities = [sys.maxsize] * count
    else:
        capacities = [max(0, int(value)) for value in capacities]

    active = {index for index in range(count) if capacities[index] > 0}
    remaining = total

    while remaining > 0 and active:
        weight_total = sum(weights[index] for index in active)
        if weight_total <= 0:
            for index in active:
                weights[index] = 1.0
            weight_total = float(len(active))

        raw_allocations = {index: remaining * weights[index] / weight_total for index in active}
        progress = False
        for index in active:
            base = int(math.floor(raw_allocations[index]))
            if base <= 0:
                continue
            available = capacities[index] - allocations[index]
            if available <= 0:
                continue
            applied = min(base, available)
            allocations[index] += applied
            remaining -= applied
            progress = progress or applied > 0

        if remaining <= 0:
            break

        ranked = sorted(active, key=lambda index: (raw_allocations[index] - math.floor(raw_allocations[index]), weights[index]), reverse=True)
        for index in ranked:
            if remaining <= 0:
                break
            if allocations[index] >= capacities[index]:
                continue
            allocations[index] += 1
            remaining -= 1
            progress = True

        if not progress:
            break

        active = {index for index in active if allocations[index] < capacities[index]}

    return allocations


def select_inferred_games(team_schedule, desired_count, seed):
    if desired_count <= 0 or not team_schedule:
        return []
    if desired_count >= len(team_schedule):
        return list(team_schedule)

    desired_count = max(1, int(desired_count))
    used_indexes = set()
    selected = []
    offset = stable_fraction(seed)
    schedule_length = len(team_schedule)

    for pick_index in range(desired_count):
        raw_position = int(math.floor(((pick_index + offset) * schedule_length) / desired_count))
        candidate = max(0, min(schedule_length - 1, raw_position))
        while candidate in used_indexes:
            candidate = (candidate + 1) % schedule_length
        used_indexes.add(candidate)
        selected.append(team_schedule[candidate])

    return sorted(selected, key=lambda game: (game["gameDate"], game["gameId"]))


def build_inferred_player_game_rows(player_id, season_id, stint, selected_games):
    if not selected_games:
        return []

    rows = []
    for game in selected_games:
        opponent_team_id = game["awayTeamId"] if game["homeTeamId"] == stint["teamId"] else game["homeTeamId"]
        rows.append(
            {
                "playerId": player_id,
                "gameId": game["gameId"],
                "seasonId": season_id,
                "teamId": stint["teamId"],
                "opponentTeamId": opponent_team_id,
                "minutes": 0,
                "points": 0,
                "rebounds": 0,
                "assists": 0,
                "steals": 0,
                "blocks": 0,
                "turnovers": 0,
                "threePointersMade": 0,
                "fgm": 0,
                "fga": 0,
                "ftm": 0,
                "fta": 0,
                "statSource": "season_average_weighted_estimate",
                "minutesSource": "season_average_weighted_estimate",
            }
        )

    field_totals = {
        "minutes": stint["minutesTotal"],
        "rebounds": stint["totals"].get("rebounds", 0),
        "assists": stint["totals"].get("assists", 0),
        "steals": stint["totals"].get("steals", 0),
        "blocks": stint["totals"].get("blocks", 0),
        "turnovers": stint["totals"].get("turnovers", 0),
        "fga": stint["totals"].get("fga", 0),
        "fta": stint["totals"].get("fta", 0),
        "fgm": min(stint["totals"].get("fgm", 0), stint["totals"].get("fga", 0)),
        "ftm": min(stint["totals"].get("ftm", 0), stint["totals"].get("fta", 0)),
        "threePointersMade": min(stint["totals"].get("threePointersMade", 0), stint["totals"].get("fgm", 0)),
    }

    assignments = {}
    for field in ("minutes", "rebounds", "assists", "steals", "blocks", "turnovers", "fga", "fta"):
        assignments[field] = allocate_weighted_integers(
            field_totals[field],
            build_weight_vector(len(rows), f"{player_id}:{stint['teamId']}:{field}"),
        )
    assignments["fgm"] = allocate_weighted_integers(
        field_totals["fgm"],
        build_weight_vector(len(rows), f"{player_id}:{stint['teamId']}:fgm"),
        capacities=assignments["fga"],
    )
    assignments["ftm"] = allocate_weighted_integers(
        field_totals["ftm"],
        build_weight_vector(len(rows), f"{player_id}:{stint['teamId']}:ftm"),
        capacities=assignments["fta"],
    )
    assignments["threePointersMade"] = allocate_weighted_integers(
        field_totals["threePointersMade"],
        build_weight_vector(len(rows), f"{player_id}:{stint['teamId']}:threes"),
        capacities=assignments["fgm"],
    )

    for index, row in enumerate(rows):
        row["minutes"] = assignments["minutes"][index]
        row["rebounds"] = assignments["rebounds"][index]
        row["assists"] = assignments["assists"][index]
        row["steals"] = assignments["steals"][index]
        row["blocks"] = assignments["blocks"][index]
        row["turnovers"] = assignments["turnovers"][index]
        row["fga"] = assignments["fga"][index]
        row["fta"] = assignments["fta"][index]
        row["fgm"] = assignments["fgm"][index]
        row["ftm"] = assignments["ftm"][index]
        row["threePointersMade"] = assignments["threePointersMade"][index]
        row["points"] = (2 * (row["fgm"] - row["threePointersMade"])) + (3 * row["threePointersMade"]) + row["ftm"]

    return rows


def featured_star_ids(players):
    by_name = {normalize_name(player["displayName"]): player["playerId"] for player in players}
    return [
        player_id
        for player_id in (
            by_name.get(normalize_name("Michael Jordan")),
            by_name.get(normalize_name("Charles Barkley")),
            by_name.get(normalize_name("Scottie Pippen")),
            by_name.get(normalize_name("Kevin Johnson")),
        )
        if player_id
    ]


def source_audit_from_snapshot(schedule_results_snapshot):
    provenance = dict(schedule_results_snapshot.get("provenance") or {})
    missing_feeds = list(provenance.get("missingFeeds") or ["nbastats_1992", "pbpstats_1992"])
    return {
        "mode": schedule_results_snapshot.get("sourceMode") or SOURCE_MODE,
        "liveArchivesPresent": bool(provenance.get("liveArchivesPresent", False)),
        "missingFeeds": missing_feeds,
    }


def recompute_per_game_from_totals(totals, games):
    stat_key_pairs = (
        ("min", "min"),
        ("pts", "pts"),
        ("reb", "reb"),
        ("ast", "ast"),
        ("stl", "stl"),
        ("blk", "blk"),
        ("to", "to"),
        ("fgm", "fgm"),
        ("fga", "fga"),
        ("ftm", "ftm"),
        ("fta", "fta"),
        ("threes", "threes"),
    )
    divisor = games if games > 0 else 0
    per_game = {}
    for total_key, per_game_key in stat_key_pairs:
        total_value = to_int(totals.get(total_key))
        per_game[per_game_key] = round_stat((total_value / divisor) if divisor else 0, 1)
    return per_game


def sanitize_player_source_record(player):
    cleaned = json.loads(json.dumps(player))
    season_stats = dict(cleaned.get("seasonStats") or {})
    totals = dict(season_stats.get("totals") or {})
    games = max(0, min(82, to_int(season_stats.get("games"))))
    games_started = max(0, min(games, to_int(season_stats.get("gamesStarted"))))
    season_stats["games"] = games
    season_stats["gamesStarted"] = games_started
    season_stats["totals"] = totals
    season_stats["perGame"] = recompute_per_game_from_totals(totals, games)
    cleaned["seasonStats"] = season_stats
    return cleaned


def validate_player_source_snapshot(player_source_snapshot):
    metadata_expectations = {
        "packId": PACK_ID,
        "season": SOURCE_SEASON,
        "sourceMode": SOURCE_MODE,
    }
    for key, expected_value in metadata_expectations.items():
        actual_value = player_source_snapshot.get(key)
        if actual_value != expected_value:
            raise RuntimeError(
                f"Expected normalized_players.json {key} to be `{expected_value}`, found `{actual_value}`."
            )

    source_players = list(player_source_snapshot.get("players") or [])
    if not source_players:
        raise RuntimeError("Expected normalized_players.json to contain a non-empty `players` array.")
    return source_players


def build_primary_team_inferred_stint(player):
    season_stats = dict(player.get("seasonStats") or {})
    totals = dict(season_stats.get("totals") or {})
    return {
        "teamId": player["teamId"],
        "minutesTotal": to_int(totals.get("min")),
        "games": max(0, min(82, to_int(season_stats.get("games")))),
        "gamesStarted": max(0, min(82, to_int(season_stats.get("gamesStarted")))),
        "totals": {
            "points": to_int(totals.get("pts")),
            "rebounds": to_int(totals.get("reb")),
            "assists": to_int(totals.get("ast")),
            "steals": to_int(totals.get("stl")),
            "blocks": to_int(totals.get("blk")),
            "turnovers": to_int(totals.get("to")),
            "threePointersMade": to_int(totals.get("threes")),
            "fgm": to_int(totals.get("fgm")),
            "fga": to_int(totals.get("fga")),
            "ftm": to_int(totals.get("ftm")),
            "fta": to_int(totals.get("fta")),
        },
    }


def main():
    ensure_dir(PACK_ROOT)
    generated_at = datetime.now(UTC).isoformat(timespec="milliseconds").replace("+00:00", "Z")

    team_defs = []
    team_by_abbr = {}
    for team in TEAM_DEFS:
        team_copy = dict(team)
        team_copy["teamId"] = f"{ENTITY_PREFIX}_{team['slug']}"
        team_copy["wikiPageTitle"] = f"1992\u201393 {team['displayName']} season"
        team_defs.append(team_copy)
        team_by_abbr[team_copy["abbr"]] = team_copy

    schedule_results_snapshot = read_source_json("schedule_results.json")
    player_source_snapshot = read_source_json("normalized_players.json")
    source_audit = audit_source_mode()

    if schedule_results_snapshot.get("sourceMode") != SOURCE_MODE:
        raise RuntimeError(
            f"Expected schedule_results.json sourceMode to be `{SOURCE_MODE}`, found `{schedule_results_snapshot.get('sourceMode')}`."
        )

    source_games = list(schedule_results_snapshot.get("games") or [])
    if len(source_games) != 943:
        raise RuntimeError(f"Expected 943 regular-season games in schedule_results.json, found {len(source_games)}.")
    source_players = validate_player_source_snapshot(player_source_snapshot)

    source_games.sort(key=lambda item: (item["gameDate"], item["sourceGameId"]))

    unique_dates = []
    date_to_index = {}
    schedule = []
    games = []
    team_schedule_by_id = defaultdict(list)
    source_game_to_canonical = {}

    for game_number, source_game in enumerate(source_games, start=1):
        game_date = source_game["gameDate"]
        if game_date not in date_to_index:
            date_to_index[game_date] = len(unique_dates)
            unique_dates.append(game_date)

        home_team = team_by_abbr[source_game["homeTeamAbbr"]]
        away_team = team_by_abbr[source_game["awayTeamAbbr"]]
        canonical_game_id = f"{ENTITY_PREFIX}_game_{game_number:04d}"
        source_game_to_canonical[source_game["sourceGameId"]] = canonical_game_id

        schedule_row = {
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
                "sourceGameId": source_game["sourceGameId"],
                "sourceTypes": list(source_game.get("sourceTypes") or []),
                "sourceRefs": list(source_game.get("sourceRefs") or []),
            },
        }
        schedule.append(schedule_row)
        team_schedule_by_id[home_team["teamId"]].append(schedule_row)
        team_schedule_by_id[away_team["teamId"]].append(schedule_row)

        winner_team_id = home_team["teamId"] if source_game["homeScore"] > source_game["awayScore"] else away_team["teamId"]
        loser_team_id = away_team["teamId"] if winner_team_id == home_team["teamId"] else home_team["teamId"]
        games.append(
            {
                "gameId": canonical_game_id,
                "seasonId": SEASON_ID,
                "status": "final",
                "homeScore": source_game["homeScore"],
                "awayScore": source_game["awayScore"],
                "winnerTeamId": winner_team_id,
                "loserTeamId": loser_team_id,
            }
        )

    players = [sanitize_player_source_record(player) for player in source_players]
    players.sort(key=lambda item: (item["teamId"], item["displayName"], item["playerId"]))

    team_player_buckets = defaultdict(list)
    for player in players:
        team_player_buckets[player["teamId"]].append(player)

    roster_snapshots = []
    for team_id, team_players in team_player_buckets.items():
        ordered_players = sorted(
            team_players,
            key=lambda player: (
                -to_int(player["seasonStats"]["gamesStarted"]),
                -round_stat(player["seasonStats"]["perGame"]["min"], 1),
                player["displayName"],
            ),
        )
        position_counts = defaultdict(int)
        for player in ordered_players:
            games_started = to_int(player["seasonStats"]["gamesStarted"])
            games_played = to_int(player["seasonStats"]["games"])
            per_game_min = round_stat(player["seasonStats"]["perGame"]["min"], 1)
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

    player_game_stats = []
    for player in players:
        primary_stint = build_primary_team_inferred_stint(player)
        team_schedule = team_schedule_by_id[player["teamId"]]
        games_to_cover = min(len(team_schedule), max(0, to_int(primary_stint["games"])))
        selected_games = select_inferred_games(team_schedule, games_to_cover, f"{player['playerId']}:{player['teamId']}")
        player_game_stats.extend(build_inferred_player_game_rows(player["playerId"], SEASON_ID, primary_stint, selected_games))

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
                    "wikipediaSeasonPage": team["wikiPageTitle"],
                },
            }
        )

    real_stat_players = sum(1 for player in players if to_int(player["seasonStats"]["totals"]["min"]) > 0)
    zero_game_players = sum(1 for player in players if to_int(player["seasonStats"]["games"]) <= 0)
    featured_stars = featured_star_ids(players)

    season = {
        "seasonId": SEASON_ID,
        "sport": "nba",
        "league": "nba",
        "label": SEASON_LABEL,
        "startDate": REGULAR_SEASON_START,
        "endDate": REGULAR_SEASON_END,
        "seasonType": "historical_pack",
        "isHistorical": True,
        "eraTags": ERA_TAGS,
        "notes": [
            "This pack uses the real 1992-93 regular-season schedule and final scores.",
            "Normal builds consume checked-in schedule and normalized player source snapshots rather than live network fetches.",
            "Player season totals originate from curated checked-in historical source artifacts.",
            "Player-game rows are deterministic season-average weighted estimates because live 1992 play-by-play feeds are absent.",
        ],
    }

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
        "era": ERA_KEY,
        "version": 1,
        "status": "ready",
        "sourceProfile": SOURCE_PROFILE,
        "buildSourceMode": source_audit["mode"],
        "missingSourceFeeds": source_audit["missingFeeds"],
        "supportedModes": ["real_season", "historical_draft", "single_player_season", "reimagined_season"],
        "defaultEntryMode": "real_season",
        "focusTeamId": FEATURED_TEAM_ID,
        "subtitle": "Jordan, Barkley, and Pippen lead a trust-forward 1992-93 replay foundation centered on the Bulls.",
        "description": "A playable 1992-93 NBA historical season pack with the full real schedule/results grid, real season totals, and explicitly inferred player-game rows.",
        "tagline": "Replay the Jordan-Barkley-Pippen season with real scores and disclosed inferred box lines.",
        "eraTags": ERA_TAGS,
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
            "sourceProfile": SOURCE_PROFILE,
            "curationOwner": "RosterBate",
            "reviewStatus": "draft",
            "importNotes": (
                "1992-93 live nbastats_1992 / pbpstats_1992 feeds are absent. Normal builds consume the checked-in mixed-source "
                "schedule snapshot plus the checked-in normalized player source snapshot, then emit deterministic inferred player-game rows "
                "against each player's canonical primary-team schedule lane."
            ),
        },
        "auditSummary": {
            "realStatCoverage": {
                "playersWithRealSeasonStats": real_stat_players,
                "playerCount": len(players),
                "label": "Real season stats",
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
            "The 27-team league map uses era-appropriate 1992-93 abbreviations, including CHH, GOS, SAN, UTH, and WAS.",
            "Schedule/results span the full 943-game regular season from a checked-in mixed-source foundation snapshot with explicit provenance.",
            "Player-game rows are season-average weighted estimates built only against each player's canonical primary-team schedule subset.",
            "The Bulls are the featured prestige lane, but the full Jordan-Barkley-Pippen league remains draftable and replayable.",
        ],
        "createdAt": generated_at,
        "updatedAt": generated_at,
    }

    presentation = {
        "heroTitle": SEASON_LABEL,
        "heroSubtitle": "Jordan's Bulls, Barkley's Suns, and a full-season 1992-93 foundation built with honest provenance.",
        "featuredTeamId": FEATURED_TEAM_ID,
        "featuredStars": featured_stars,
        "artDirection": {
            "heroTone": "prestige_rivalry",
            "primaryPalette": ["#552583", "#007A33", "#CE1141"],
            "backgroundStyle": "historic_arena_spotlight",
        },
        "entryModes": [
            {"mode": "real_season", "label": "Play The Real Season", "description": "Replay 1992-93 with the real full schedule and final scores."},
            {"mode": "historical_draft", "label": "Draft The Era", "description": "Redraft the Jordan-Barkley-Pippen season from the full-league player pool."},
            {"mode": "reimagined_season", "label": "Reimagined Season", "description": "Launch an alternate-history 1992-93 branch from the same foundation pack."},
        ],
    }

    summaries = {
        "packSummary": "The 1992-93 foundation pack brings the full 27-team league into Historic Seasons with real regular-season schedule/results, real player season totals, and clearly disclosed inferred player-game coverage.",
        "featuredStorylines": [
            "The Bulls headline the pack as the featured prestige lane, with Jordan's title chase defining the front door.",
            "Phoenix and Chicago keep the Barkley-Jordan Finals collision alive, while New York and the rest of the East keep the season from collapsing into a one-team nostalgia pack.",
            "Every included game result is real, and every inferred player-game row is labeled as an estimate rather than being passed off as event-level truth.",
        ],
        "teamSpotlights": [
            {"teamId": f"{ENTITY_PREFIX}_chi", "summary": "Chicago is the flagship prestige route, built around Jordan, Pippen, and the first three-peat front door."},
            {"teamId": f"{ENTITY_PREFIX}_phx", "summary": "Phoenix keeps Barkley's challenger Suns at full strength as the Finals counterweight."},
            {"teamId": f"{ENTITY_PREFIX}_nyk", "summary": "New York anchors the East contention lane and keeps the playoff chase from narrowing to just Chicago and Phoenix."},
            {"teamId": f"{ENTITY_PREFIX}_sea", "summary": "Seattle carries the West's top-seed pressure track and the best non-Finals challenger lane."},
            {"teamId": f"{ENTITY_PREFIX}_orl", "summary": "Orlando gives the expansion-era growth story a real 1992-93 home inside the playable league."},
        ],
        "modeSummaries": [
            {"mode": "real_season", "summary": "Replay the real 1992-93 campaign from opening night through the final regular-season standings."},
            {"mode": "historical_draft", "summary": "Reshuffle the full Jordan-Barkley-Pippen player pool and discover how the era changes under a custom draft."},
            {"mode": "reimagined_season", "summary": "Branch into an alternate-history 1992-93 universe while keeping the same real team and player foundation."},
        ],
        "auditSummary": manifest["auditSummary"],
        "buildSourceMode": source_audit["mode"],
        "missingSourceFeeds": source_audit["missingFeeds"],
        "auditNotes": [
            "Live nbastats_1992 / pbpstats_1992 feeds are absent, so player-game rows are inferred rather than imported from event archives.",
            "Normal builds are reproducible from checked-in source artifacts and do not need live Wikipedia, TheBasketballDatabase, or list-data fetches.",
            "Schedule and results cover the complete regular season from a mixed-source checked-in snapshot where the FiveThirtyEight backfill supplies more than half the games.",
            "Every player-game row sets statSource and minutesSource to season_average_weighted_estimate and is emitted only for the player's canonical teamId.",
        ],
    }

    pack_challenges = {
        "packId": PACK_ID,
        "version": 1,
        "challengeGroups": [
            {"groupId": "real_season_paths", "label": "Play The Real Season", "mode": "real_season"},
            {"groupId": "draft_the_era_paths", "label": "Draft The Era", "mode": "historical_draft"},
            {"groupId": "reimagined_paths", "label": "Reimagined Season", "mode": "reimagined_season"},
        ],
        "challenges": [
            {
                "challengeId": "bulls_threepeat_push",
                "mode": "real_season",
                "path": "featured_team_path",
                "title": "Complete The First Three-Peat",
                "description": "Take the featured Bulls lane and clear 60 wins in a season whose game results are real but whose player-game box lines remain explicitly inferred.",
                "type": "season_wins_min",
                "target": 60,
                "evaluation": "season_end",
                "reward": "Three-Peat Standard",
                "required": False,
                "featured": True,
            },
            {
                "challengeId": "east_challenger_55",
                "mode": "real_season",
                "path": "open_team_path",
                "title": "Break The Finals Track",
                "description": "Choose any team and reach 55 wins while trying to interrupt the Jordan-Barkley prestige track.",
                "type": "season_wins_min",
                "target": 55,
                "evaluation": "season_end",
                "reward": "Era Disruptor",
                "required": False,
                "featured": False,
            },
            {
                "challengeId": "draft_jordan_barkley_pippen",
                "mode": "historical_draft",
                "path": "alternate_history_success",
                "title": "Draft The Superteam",
                "description": "Redraft 1992-93 from the full player pool, knowing the schedule is real but the player-game box lines are weighted season estimates.",
                "type": "season_wins_min",
                "target": 58,
                "evaluation": "season_end",
                "reward": "Era Architect",
                "required": False,
                "featured": True,
            },
            {
                "challengeId": "rewrite_1992_93",
                "mode": "reimagined_season",
                "path": "reshuffled_league",
                "title": "Rewrite 1992-93",
                "description": "Spin the league into an alternate-history branch and win the title with the same trust-forward data disclosures intact.",
                "type": "win_championship",
                "target": True,
                "evaluation": "season_end",
                "reward": "Alternate History Champion",
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
                "realSeasonStats": real_stat_players,
                "zeroGamePlayers": zero_game_players,
                "wikipediaScheduleGames": schedule_results_snapshot["coverage"]["wikipediaGamesMatched"],
                "backfilledScheduleGames": schedule_results_snapshot["coverage"]["backfilledGames"],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Failed to build historical 1992-93 pack: {exc}", file=sys.stderr)
        raise
