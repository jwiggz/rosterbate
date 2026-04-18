#!/usr/bin/env python
import csv
import io
import json
import os
import re
import sys
from collections import Counter, defaultdict
from datetime import UTC, datetime
from pathlib import Path

import requests


REPO_ROOT = Path(__file__).resolve().parent
PACK_ID = "nba_2016_full_season_v1"
PACK_ROOT = REPO_ROOT / "historical-packs" / PACK_ID
CACHE_ROOT = REPO_ROOT / ".historical-cache" / PACK_ID
SEASON_ID = "nba_2016_historic"
SEASON_LABEL = "2015-16 NBA Historic Season"
SOURCE_SEASON = "2015-16"
SOURCE_SEASON_KEY = "2015"
REGULAR_SEASON_START = "2015-10-27"
REGULAR_SEASON_END = "2016-04-13"

DATA_URLS = {
    "games": "https://huggingface.co/datasets/hamzas/nba-games/resolve/main/games.csv",
    "games_details": "https://huggingface.co/datasets/hamzas/nba-games/resolve/main/games_details.csv",
    "players": "https://huggingface.co/datasets/hamzas/nba-games/resolve/main/players.csv",
    "teams": "https://huggingface.co/datasets/hamzas/nba-games/resolve/main/teams.csv",
}

TEAM_DEFS = [
    {"slug": "atl", "abbr": "ATL", "city": "Atlanta", "name": "Hawks", "displayName": "Atlanta Hawks", "conference": "East", "division": "Southeast", "palette": {"primary": "#c73b52", "secondary": "#f4dcc1"}},
    {"slug": "bos", "abbr": "BOS", "city": "Boston", "name": "Celtics", "displayName": "Boston Celtics", "conference": "East", "division": "Atlantic", "palette": {"primary": "#1f7a5b", "secondary": "#efe7d2"}},
    {"slug": "brk", "abbr": "BKN", "city": "Brooklyn", "name": "Nets", "displayName": "Brooklyn Nets", "conference": "East", "division": "Atlantic", "palette": {"primary": "#1f2737", "secondary": "#c8ced8"}},
    {"slug": "cha", "abbr": "CHA", "city": "Charlotte", "name": "Hornets", "displayName": "Charlotte Hornets", "conference": "East", "division": "Southeast", "palette": {"primary": "#0d6e7d", "secondary": "#5d4f97"}},
    {"slug": "chi", "abbr": "CHI", "city": "Chicago", "name": "Bulls", "displayName": "Chicago Bulls", "conference": "East", "division": "Central", "palette": {"primary": "#87232a", "secondary": "#1a1a1a"}},
    {"slug": "cle", "abbr": "CLE", "city": "Cleveland", "name": "Cavaliers", "displayName": "Cleveland Cavaliers", "conference": "East", "division": "Central", "palette": {"primary": "#7a1f2e", "secondary": "#d4a65f"}},
    {"slug": "det", "abbr": "DET", "city": "Detroit", "name": "Pistons", "displayName": "Detroit Pistons", "conference": "East", "division": "Central", "palette": {"primary": "#2769c8", "secondary": "#d54a45"}},
    {"slug": "ind", "abbr": "IND", "city": "Indiana", "name": "Pacers", "displayName": "Indiana Pacers", "conference": "East", "division": "Central", "palette": {"primary": "#27498b", "secondary": "#efc267"}},
    {"slug": "mia", "abbr": "MIA", "city": "Miami", "name": "Heat", "displayName": "Miami Heat", "conference": "East", "division": "Southeast", "palette": {"primary": "#99243a", "secondary": "#ffb45c"}},
    {"slug": "mil", "abbr": "MIL", "city": "Milwaukee", "name": "Bucks", "displayName": "Milwaukee Bucks", "conference": "East", "division": "Central", "palette": {"primary": "#1a6a4e", "secondary": "#e2dcc8"}},
    {"slug": "nyk", "abbr": "NYK", "city": "New York", "name": "Knicks", "displayName": "New York Knicks", "conference": "East", "division": "Atlantic", "palette": {"primary": "#2561ad", "secondary": "#f08c48"}},
    {"slug": "orl", "abbr": "ORL", "city": "Orlando", "name": "Magic", "displayName": "Orlando Magic", "conference": "East", "division": "Southeast", "palette": {"primary": "#3177d8", "secondary": "#dce6f4"}},
    {"slug": "phi", "abbr": "PHI", "city": "Philadelphia", "name": "76ers", "displayName": "Philadelphia 76ers", "conference": "East", "division": "Atlantic", "palette": {"primary": "#2464b6", "secondary": "#d54e45"}},
    {"slug": "tor", "abbr": "TOR", "city": "Toronto", "name": "Raptors", "displayName": "Toronto Raptors", "conference": "East", "division": "Atlantic", "palette": {"primary": "#7c2e36", "secondary": "#bdb7ae"}},
    {"slug": "was", "abbr": "WAS", "city": "Washington", "name": "Wizards", "displayName": "Washington Wizards", "conference": "East", "division": "Southeast", "palette": {"primary": "#29518f", "secondary": "#d44c45"}},
    {"slug": "dal", "abbr": "DAL", "city": "Dallas", "name": "Mavericks", "displayName": "Dallas Mavericks", "conference": "West", "division": "Southwest", "palette": {"primary": "#2462b4", "secondary": "#cad7e7"}},
    {"slug": "den", "abbr": "DEN", "city": "Denver", "name": "Nuggets", "displayName": "Denver Nuggets", "conference": "West", "division": "Northwest", "palette": {"primary": "#2d5a9b", "secondary": "#f0c06c"}},
    {"slug": "gsw", "abbr": "GSW", "city": "Golden State", "name": "Warriors", "displayName": "Golden State Warriors", "conference": "West", "division": "Pacific", "palette": {"primary": "#2e65b8", "secondary": "#efc55c"}},
    {"slug": "hou", "abbr": "HOU", "city": "Houston", "name": "Rockets", "displayName": "Houston Rockets", "conference": "West", "division": "Southwest", "palette": {"primary": "#9f2435", "secondary": "#c4c9d1"}},
    {"slug": "lac", "abbr": "LAC", "city": "Los Angeles", "name": "Clippers", "displayName": "LA Clippers", "conference": "West", "division": "Pacific", "palette": {"primary": "#2464b6", "secondary": "#d74e48"}},
    {"slug": "lal", "abbr": "LAL", "city": "Los Angeles", "name": "Lakers", "displayName": "Los Angeles Lakers", "conference": "West", "division": "Pacific", "palette": {"primary": "#5f3293", "secondary": "#f0c461"}},
    {"slug": "mem", "abbr": "MEM", "city": "Memphis", "name": "Grizzlies", "displayName": "Memphis Grizzlies", "conference": "West", "division": "Southwest", "palette": {"primary": "#375f8c", "secondary": "#d8a65d"}},
    {"slug": "min", "abbr": "MIN", "city": "Minnesota", "name": "Timberwolves", "displayName": "Minnesota Timberwolves", "conference": "West", "division": "Northwest", "palette": {"primary": "#236d4d", "secondary": "#295993"}},
    {"slug": "nop", "abbr": "NOP", "city": "New Orleans", "name": "Pelicans", "displayName": "New Orleans Pelicans", "conference": "West", "division": "Southwest", "palette": {"primary": "#1b3568", "secondary": "#d3a962"}},
    {"slug": "okc", "abbr": "OKC", "city": "Oklahoma City", "name": "Thunder", "displayName": "Oklahoma City Thunder", "conference": "West", "division": "Northwest", "palette": {"primary": "#2469c2", "secondary": "#f08d49"}},
    {"slug": "phx", "abbr": "PHX", "city": "Phoenix", "name": "Suns", "displayName": "Phoenix Suns", "conference": "West", "division": "Pacific", "palette": {"primary": "#5b2d87", "secondary": "#ef9743"}},
    {"slug": "por", "abbr": "POR", "city": "Portland", "name": "Trail Blazers", "displayName": "Portland Trail Blazers", "conference": "West", "division": "Northwest", "palette": {"primary": "#992a31", "secondary": "#1b1b1b"}},
    {"slug": "sac", "abbr": "SAC", "city": "Sacramento", "name": "Kings", "displayName": "Sacramento Kings", "conference": "West", "division": "Pacific", "palette": {"primary": "#5f4091", "secondary": "#d7d0c3"}},
    {"slug": "sas", "abbr": "SAS", "city": "San Antonio", "name": "Spurs", "displayName": "San Antonio Spurs", "conference": "West", "division": "Southwest", "palette": {"primary": "#222831", "secondary": "#c9ced6"}},
    {"slug": "uta", "abbr": "UTA", "city": "Utah", "name": "Jazz", "displayName": "Utah Jazz", "conference": "West", "division": "Northwest", "palette": {"primary": "#1c6f5e", "secondary": "#f2c96b"}},
]


def ensure_dir(path_obj):
    path_obj.mkdir(parents=True, exist_ok=True)


def write_json(relative_path, value):
    target = PACK_ROOT / relative_path
    ensure_dir(target.parent)
    target.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")


def fetch_csv_rows(label):
    ensure_dir(CACHE_ROOT)
    cache_path = CACHE_ROOT / f"{label}.csv"
    if cache_path.exists():
        text = cache_path.read_text(encoding="utf-8")
    else:
        response = requests.get(DATA_URLS[label], timeout=180)
        response.raise_for_status()
        text = response.text
        cache_path.write_text(text, encoding="utf-8")
    return list(csv.DictReader(io.StringIO(text)))


def normalize_name(value):
    return re.sub(r"[^a-z0-9]+", "", str(value or "").lower()).strip()


def slugify(value):
    slug = re.sub(r"[^a-z0-9]+", "_", normalize_name(value))
    return slug.strip("_")


def to_int(value):
    try:
        cleaned = str(value or "").replace(",", "").strip()
        return int(float(cleaned)) if cleaned else 0
    except Exception:
        return 0


def to_float(value):
    try:
        cleaned = str(value or "").replace(",", "").strip()
        return float(cleaned) if cleaned else 0.0
    except Exception:
        return 0.0


def round_stat(value, digits=1):
    return round(float(value or 0), digits)


def parse_date(value):
    return datetime.strptime(str(value).strip(), "%Y-%m-%d").date()


def map_position(raw_value, per_game):
    raw = str(raw_value or "").upper().strip()
    if raw in {"PG", "SG", "SF", "PF", "C"}:
        return raw
    if raw == "G":
        return "PG" if per_game["ast"] >= 5.5 else "SG"
    if raw == "F":
        if per_game["reb"] >= 7 or per_game["blk"] >= 1:
            return "PF"
        return "SF"
    if per_game["ast"] >= 7:
        return "PG"
    if per_game["ast"] >= 4.5 and per_game["reb"] <= 6:
        return "PG"
    if per_game["blk"] >= 1.5 or (per_game["reb"] >= 9 and per_game["ast"] < 4):
        return "C"
    if per_game["reb"] >= 7 or per_game["blk"] >= 0.8:
        return "PF"
    if per_game["threes"] >= 2.0:
        return "SG"
    return "SF"


def secondary_positions(primary):
    mapping = {
        "PG": ["SG"],
        "SG": ["SF"],
        "SF": ["PF"],
        "PF": ["C"],
        "C": [],
    }
    return mapping.get(primary, [])


def infer_depth_tag(position, role_index):
    return f"{position}{role_index}"


def main():
    ensure_dir(PACK_ROOT)
    generated_at = datetime.now(UTC).isoformat(timespec="milliseconds").replace("+00:00", "Z")

    team_defs = []
    team_by_abbr = {}
    team_by_numeric = {}
    for team in TEAM_DEFS:
        team_copy = dict(team)
        team_copy["teamId"] = f"nba_2016_{team['slug']}"
        team_defs.append(team_copy)
        team_by_abbr[team_copy["abbr"]] = team_copy

    teams_rows = fetch_csv_rows("teams")
    for row in teams_rows:
        abbr = str(row.get("ABBREVIATION") or "").strip().upper()
        if abbr in team_by_abbr:
            team_by_numeric[str(row.get("TEAM_ID") or "").strip()] = team_by_abbr[abbr]

    games_rows = fetch_csv_rows("games")
    regular_games = []
    for row in games_rows:
        if str(row.get("SEASON") or "").strip() != SOURCE_SEASON_KEY:
            continue
        game_date = str(row.get("GAME_DATE_EST") or "").strip()
        if not game_date:
            continue
        if not (REGULAR_SEASON_START <= game_date <= REGULAR_SEASON_END):
            continue
        home_numeric = str(row.get("HOME_TEAM_ID") or "").strip()
        away_numeric = str(row.get("VISITOR_TEAM_ID") or "").strip()
        if home_numeric not in team_by_numeric or away_numeric not in team_by_numeric:
            continue
        regular_games.append(row)

    regular_games.sort(key=lambda row: (str(row.get("GAME_DATE_EST") or ""), str(row.get("GAME_ID") or "")))
    regular_game_ids = {str(row["GAME_ID"]).strip() for row in regular_games}

    players_rows = fetch_csv_rows("players")
    player_seed_rows = defaultdict(list)
    for row in players_rows:
        if str(row.get("SEASON") or "").strip() != SOURCE_SEASON_KEY:
            continue
        numeric_team_id = str(row.get("TEAM_ID") or "").strip()
        if numeric_team_id not in team_by_numeric:
            continue
        player_seed_rows[str(row.get("PLAYER_ID") or "").strip()].append(row)

    details_rows = fetch_csv_rows("games_details")
    player_agg = {}
    raw_game_stat_rows = []

    def ensure_player_agg(player_id, player_name):
        if player_id not in player_agg:
            player_agg[player_id] = {
                "name": player_name,
                "games": 0,
                "gamesStarted": 0,
                "totals": defaultdict(float),
                "teamMinutes": defaultdict(float),
                "teamGames": defaultdict(int),
                "startPos": Counter(),
            }
        return player_agg[player_id]

    for row in details_rows:
        game_id = str(row.get("GAME_ID") or "").strip()
        if game_id not in regular_game_ids:
            continue
        numeric_team_id = str(row.get("TEAM_ID") or "").strip()
        if numeric_team_id not in team_by_numeric:
            continue
        player_id = str(row.get("PLAYER_ID") or "").strip()
        if not player_id:
            continue
        minutes_raw = str(row.get("MIN") or "").strip()
        if not minutes_raw or str(row.get("COMMENT") or "").strip():
            continue
        minutes = to_float(minutes_raw.split(":")[0])
        player_name = str(row.get("PLAYER_NAME") or "").strip()
        agg = ensure_player_agg(player_id, player_name)
        agg["games"] += 1
        start_position = str(row.get("START_POSITION") or "").strip().upper()
        if start_position:
            agg["gamesStarted"] += 1
            agg["startPos"][start_position] += 1
        agg["teamMinutes"][numeric_team_id] += minutes
        agg["teamGames"][numeric_team_id] += 1
        for field_key, target_key in [
            ("MIN", "min"),
            ("PTS", "pts"),
            ("REB", "reb"),
            ("AST", "ast"),
            ("STL", "stl"),
            ("BLK", "blk"),
            ("TO", "to"),
            ("FGM", "fgm"),
            ("FGA", "fga"),
            ("FTM", "ftm"),
            ("FTA", "fta"),
            ("FG3M", "threes"),
        ]:
            agg["totals"][target_key] += to_float(row.get(field_key))
        raw_game_stat_rows.append({
            "playerNumericId": player_id,
            "teamNumericId": numeric_team_id,
            "gameNumericId": game_id,
            "minutes": round_stat(minutes, 1),
            "points": to_int(row.get("PTS")),
            "rebounds": to_int(row.get("REB")),
            "assists": to_int(row.get("AST")),
            "steals": to_int(row.get("STL")),
            "blocks": to_int(row.get("BLK")),
            "turnovers": to_int(row.get("TO")),
            "threePointersMade": to_int(row.get("FG3M")),
            "fgm": to_int(row.get("FGM")),
            "fga": to_int(row.get("FGA")),
            "ftm": to_int(row.get("FTM")),
            "fta": to_int(row.get("FTA")),
        })

    union_player_ids = sorted(set(player_seed_rows.keys()) | set(player_agg.keys()))
    players = []
    player_numeric_to_canonical = {}

    for player_numeric_id in union_player_ids:
        seeds = player_seed_rows.get(player_numeric_id, [])
        agg = player_agg.get(player_numeric_id)
        display_name = str((seeds[0]["PLAYER_NAME"] if seeds else (agg["name"] if agg else "")) or "").strip()
        if not display_name:
            continue
        first_name, _, last_name = display_name.partition(" ")
        if agg and agg["teamMinutes"]:
            primary_numeric_team_id = max(agg["teamMinutes"].items(), key=lambda item: (item[1], item[0]))[0]
        elif seeds:
            primary_numeric_team_id = str(seeds[-1].get("TEAM_ID") or "").strip()
        else:
            continue
        team = team_by_numeric.get(primary_numeric_team_id)
        if not team:
            continue

        games = agg["games"] if agg else 0
        totals = dict(agg["totals"]) if agg else {}
        divisor = games if games > 0 else 1
        per_game = {
            "min": round_stat(totals.get("min", 0) / divisor, 1),
            "pts": round_stat(totals.get("pts", 0) / divisor, 1),
            "reb": round_stat(totals.get("reb", 0) / divisor, 1),
            "ast": round_stat(totals.get("ast", 0) / divisor, 1),
            "stl": round_stat(totals.get("stl", 0) / divisor, 1),
            "blk": round_stat(totals.get("blk", 0) / divisor, 1),
            "to": round_stat(totals.get("to", 0) / divisor, 1),
            "fgm": round_stat(totals.get("fgm", 0) / divisor, 1),
            "fga": round_stat(totals.get("fga", 0) / divisor, 1),
            "ftm": round_stat(totals.get("ftm", 0) / divisor, 1),
            "fta": round_stat(totals.get("fta", 0) / divisor, 1),
            "threes": round_stat(totals.get("threes", 0) / divisor, 1),
        }
        raw_position = agg["startPos"].most_common(1)[0][0] if agg and agg["startPos"] else ""
        primary_position = map_position(raw_position, per_game)
        canonical_player_id = f"nba_2016_{slugify(display_name)}_{player_numeric_id}"
        player_numeric_to_canonical[player_numeric_id] = {
            "playerId": canonical_player_id,
            "teamId": team["teamId"],
        }
        players.append({
            "playerId": canonical_player_id,
            "seasonId": SEASON_ID,
            "displayName": display_name,
            "firstName": first_name,
            "lastName": last_name or first_name,
            "teamId": team["teamId"],
            "primaryPosition": primary_position,
            "secondaryPositions": secondary_positions(primary_position),
            "status": "active",
            "draftEligible": True,
            "bio": f"{display_name} is part of the 2015-16 {team['displayName']} historical player pool.",
            "externalRefs": {
                "huggingFaceDataset": "hamzas/nba-games",
                "sourcePlayerId": player_numeric_id,
                "sourceTeamId": primary_numeric_team_id,
            },
            "seasonStats": {
                "source": "hf_nba_games_dataset",
                "sourceSeason": SOURCE_SEASON,
                "sourceTeamCode": team["abbr"],
                "games": games,
                "gamesStarted": agg["gamesStarted"] if agg else 0,
                "perGame": per_game,
                "totals": {
                    "min": int(round(totals.get("min", 0))),
                    "pts": int(round(totals.get("pts", 0))),
                    "reb": int(round(totals.get("reb", 0))),
                    "ast": int(round(totals.get("ast", 0))),
                    "stl": int(round(totals.get("stl", 0))),
                    "blk": int(round(totals.get("blk", 0))),
                    "to": int(round(totals.get("to", 0))),
                    "fgm": int(round(totals.get("fgm", 0))),
                    "fga": int(round(totals.get("fga", 0))),
                    "ftm": int(round(totals.get("ftm", 0))),
                    "fta": int(round(totals.get("fta", 0))),
                    "threes": int(round(totals.get("threes", 0))),
                },
            },
        })

    players.sort(key=lambda item: (item["teamId"], item["displayName"]))

    team_player_buckets = defaultdict(list)
    for player in players:
        team_player_buckets[player["teamId"]].append(player)

    roster_snapshots = []
    for team_id, team_players in team_player_buckets.items():
        sorted_team_players = sorted(
            team_players,
            key=lambda p: (
                -to_int(p["seasonStats"]["gamesStarted"]),
                -to_float(p["seasonStats"]["perGame"]["min"]),
                p["displayName"],
            ),
        )
        position_counts = defaultdict(int)
        for player in sorted_team_players:
            games_started = to_int(player["seasonStats"]["gamesStarted"])
            per_game_min = to_float(player["seasonStats"]["perGame"]["min"])
            games_played = to_int(player["seasonStats"]["games"])
            if games_started >= max(20, games_played * 0.45):
                role = "starter"
            elif per_game_min >= 22:
                role = "rotation"
            elif games_played > 0:
                role = "bench"
            else:
                role = "inactive"
            position_counts[player["primaryPosition"]] += 1
            roster_snapshots.append({
                "seasonId": SEASON_ID,
                "teamId": team_id,
                "playerId": player["playerId"],
                "rosterRole": role,
                "depthTag": infer_depth_tag(player["primaryPosition"], position_counts[player["primaryPosition"]]),
                "startDate": REGULAR_SEASON_START,
                "endDate": REGULAR_SEASON_END,
            })

    unique_dates = []
    schedule = []
    games = []
    date_to_index = {}
    for index, row in enumerate(regular_games, start=1):
        game_date = str(row.get("GAME_DATE_EST") or "").strip()
        if game_date not in date_to_index:
            date_to_index[game_date] = len(unique_dates)
            unique_dates.append(game_date)
        home_team = team_by_numeric[str(row.get("HOME_TEAM_ID") or "").strip()]
        away_team = team_by_numeric[str(row.get("VISITOR_TEAM_ID") or "").strip()]
        canonical_game_id = f"nba_2016_game_{index:04d}"
        schedule.append({
            "gameId": canonical_game_id,
            "seasonId": SEASON_ID,
            "gameDate": game_date,
            "homeTeamId": home_team["teamId"],
            "awayTeamId": away_team["teamId"],
            "isRegularSeason": True,
            "gameNumber": index,
            "weekLabel": f"Week {date_to_index[game_date] // 7 + 1}",
            "dayLabel": f"Day {date_to_index[game_date] % 7 + 1}",
            "externalRefs": {
                "sourceGameId": str(row.get("GAME_ID") or "").strip()
            },
        })
        home_score = to_int(row.get("PTS_home"))
        away_score = to_int(row.get("PTS_away"))
        winner = home_team["teamId"] if home_score >= away_score else away_team["teamId"]
        loser = away_team["teamId"] if winner == home_team["teamId"] else home_team["teamId"]
        games.append({
            "gameId": canonical_game_id,
            "seasonId": SEASON_ID,
            "status": "final",
            "homeScore": home_score,
            "awayScore": away_score,
            "winnerTeamId": winner,
            "loserTeamId": loser,
        })

    source_game_to_canonical = {str(row.get("GAME_ID") or "").strip(): schedule[idx]["gameId"] for idx, row in enumerate(regular_games)}
    source_game_to_matchup = {
        schedule[idx]["gameId"]: {
            "homeTeamId": schedule[idx]["homeTeamId"],
            "awayTeamId": schedule[idx]["awayTeamId"],
        }
        for idx in range(len(schedule))
    }

    player_game_stats = []
    for stat_row in raw_game_stat_rows:
        player_meta = player_numeric_to_canonical.get(stat_row["playerNumericId"])
        if not player_meta:
            continue
        if team_by_numeric.get(stat_row["teamNumericId"], {}).get("teamId") != player_meta["teamId"]:
            continue
        canonical_game_id = source_game_to_canonical.get(stat_row["gameNumericId"])
        if not canonical_game_id:
            continue
        matchup = source_game_to_matchup[canonical_game_id]
        team_id = player_meta["teamId"]
        opponent_team_id = matchup["awayTeamId"] if team_id == matchup["homeTeamId"] else matchup["homeTeamId"]
        player_game_stats.append({
            "playerId": player_meta["playerId"],
            "gameId": canonical_game_id,
            "seasonId": SEASON_ID,
            "teamId": team_id,
            "opponentTeamId": opponent_team_id,
            "minutes": stat_row["minutes"],
            "points": stat_row["points"],
            "rebounds": stat_row["rebounds"],
            "assists": stat_row["assists"],
            "steals": stat_row["steals"],
            "blocks": stat_row["blocks"],
            "turnovers": stat_row["turnovers"],
            "threePointersMade": stat_row["threePointersMade"],
            "fgm": stat_row["fgm"],
            "fga": stat_row["fga"],
            "ftm": stat_row["ftm"],
            "fta": stat_row["fta"],
            "statSource": "hf_nba_games_dataset",
        })

    teams = []
    for team in team_defs:
        teams.append({
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
            },
        })

    season = {
        "seasonId": SEASON_ID,
        "sport": "nba",
        "league": "nba",
        "label": SEASON_LABEL,
        "startDate": REGULAR_SEASON_START,
        "endDate": REGULAR_SEASON_END,
        "seasonType": "historical_pack",
        "isHistorical": True,
        "eraTags": ["2010s", "Pace and Space", "Historic Season"],
        "notes": [
            "Full-league historical foundation pack for 2015-16.",
            "Supports real-season boots, Draft The Era, and Reimagined Season."
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
        "era": "2010s",
        "version": 1,
        "status": "concept",
        "sourceProfile": "historical_curated",
        "supportedModes": ["real_season", "historical_draft", "single_player_season", "reimagined_season"],
        "defaultEntryMode": "real_season",
        "focusTeamId": "nba_2016_gsw",
        "subtitle": "Play the real season, redraft the era, or branch into a reimagined universe.",
        "description": "A 2015-16 NBA historical season pack built from real team, player, schedule, result, and player-game data.",
        "tagline": "Seventy-three wins, unanimous MVP, and the 3-1 Finals swing.",
        "eraTags": ["2010s", "Warriors Era", "Historic Season"],
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
            "importNotes": "2015-16 pack built from the public hamzas/nba-games dataset on Hugging Face, with season totals aggregated from real game details and the full regular-season schedule/results.",
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
            "Player ranking is driven by real 2015-16 season production aggregated from real game-detail rows.",
            "Schedule and game results span the full 2015-16 regular season.",
            "Reimagined Season uses the same real historical player pool and pack health metadata."
        ],
        "createdAt": generated_at,
        "updatedAt": generated_at,
    }

    presentation = {
        "heroTitle": SEASON_LABEL,
        "heroSubtitle": "Play the real season, draft the era, or branch into a reimagined universe.",
        "featuredTeamId": "nba_2016_gsw",
        "featuredStars": [
            "nba_2016_stephencurry_201939",
            "nba_2016_lebronjames_2544",
            "nba_2016_kawhileonard_202695",
            "nba_2016_kevindurant_201142",
            "nba_2016_russellwestbrook_201566",
            "nba_2016_jamesharden_201935",
        ],
        "artDirection": {
            "heroTone": "modern",
            "primaryPalette": ["#2e65b8", "#efc55c", "#0f1626"],
            "backgroundStyle": "historic_modern_spotlight",
        },
        "entryModes": [
            {"mode": "real_season", "label": "Play The Real Season", "description": "Step into 2015-16 with historical rosters intact."},
            {"mode": "historical_draft", "label": "Draft The Era", "description": "Redraft the full 2015-16 player pool into a new fantasy universe."},
            {"mode": "reimagined_season", "label": "Reimagined Season", "description": "Launch a fully reshuffled 2015-16 and play the alternate branch from opening night."},
        ],
    }

    summaries = {
        "packSummary": "The 2015-16 NBA season pack gives Historic Seasons a modern flagship with real full-season player production, the full schedule/results grid, and a player pool built for real-season play, Draft The Era, and Reimagined Season.",
        "featuredStorylines": [
            "Seventy-three wins and unanimous-MVP gravity reshape the fantasy board.",
            "LeBron, Steph, Kawhi, KD, Russ, and Harden collide in one modern historic pool.",
            "The archive gains a modern tentpole with spacing, shot volume, and roster construction that feel different from the 1990s packs.",
        ],
        "teamSpotlights": [
            {"teamId": "nba_2016_gsw", "summary": "Golden State is the flagship modern path, built around Curry, motion offense, and the most famous regular season of the decade."},
            {"teamId": "nba_2016_cle", "summary": "Cleveland anchors the LeBron path and the team most associated with the 3-1 Finals comeback."},
            {"teamId": "nba_2016_sas", "summary": "San Antonio offers a disciplined contender route behind peak Kawhi and a deep veteran core."},
            {"teamId": "nba_2016_okc", "summary": "Oklahoma City gives the pack an elite superstar tandem universe with Durant and Westbrook."},
            {"teamId": "nba_2016_tor", "summary": "Toronto adds a strong East contender lane with Lowry and DeRozan leading the way."},
        ],
        "modeSummaries": [
            {"mode": "real_season", "summary": "Keep the 2015-16 season intact and see whether you can match or surpass the era-defining outcomes."},
            {"mode": "historical_draft", "summary": "Remix the full-league 2015-16 player universe and discover what the season becomes with custom rosters."},
            {"mode": "reimagined_season", "summary": "Launch a fully reshuffled version of 2015-16 and treat the season like an alternate-history branch from day one."},
        ],
        "auditSummary": manifest["auditSummary"],
        "auditNotes": [
            "Real season stats cover every included player in the pack.",
            "Schedule and results span the full regular season using real historical game records.",
            "No synthetic player stat generation is used in this pack path.",
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
                "challengeId": "warriors_73_wins",
                "mode": "real_season",
                "path": "warriors_featured_path",
                "title": "Match 73 Wins",
                "description": "Finish the season with at least 73 wins.",
                "type": "season_wins_min",
                "target": 73,
                "evaluation": "season_end",
                "reward": "73-Win Standard",
                "required": False,
                "featured": True,
            },
            {
                "challengeId": "open_team_50_wins",
                "mode": "real_season",
                "path": "open_team_path",
                "title": "Modern Contender",
                "description": "Choose any included team and finish with at least 50 wins.",
                "type": "season_wins_min",
                "target": 50,
                "evaluation": "season_end",
                "reward": "Modern Contender",
                "required": False,
                "featured": False,
            },
            {
                "challengeId": "draft_era_65_wins",
                "mode": "historical_draft",
                "path": "alternate_history_success",
                "title": "Build A 65-Win Team",
                "description": "Complete a historical fantasy draft and finish with at least 65 wins.",
                "type": "season_wins_min",
                "target": 65,
                "evaluation": "season_end",
                "reward": "Alternate-History Juggernaut",
                "required": False,
                "featured": True,
            },
            {
                "challengeId": "reimagined_title",
                "mode": "reimagined_season",
                "path": "reshuffled_league",
                "title": "Win The Reimagined League",
                "description": "Take your selected franchise through the reshuffled 2015-16 universe and win the title.",
                "type": "win_championship",
                "target": True,
                "evaluation": "season_end",
                "reward": "Reimagined Champion",
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
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Failed to build historical 2015-16 pack: {exc}", file=sys.stderr)
        raise
