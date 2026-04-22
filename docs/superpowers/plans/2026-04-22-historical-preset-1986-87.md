# Historical Preset 1986-87 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `nba_1987_full_season_v1` as a real, bootable `1986-87` historical universe preset instead of a preview-only shelf card.

**Architecture:** Reuse the proven historical-preset promotion lane from `2000-01`, but do not pretend the same raw source feeds exist. Because the live `1986` `pbpstats` / `nbastats` archives are missing, this pack should be built as an honest playable foundation: real team/player season data from TheBasketballDatabase, a checked-in real schedule/results snapshot, and deterministic inferred player-game coverage that is clearly disclosed in manifest and summary copy.

**Tech Stack:** Static HTML/CSS/JS (`historic-seasons.html`, `historic-universe.html`, `rosterbate-season.html`), JSON pack assets under `historical-packs/`, Python build script with `requests`, checked-in JSON source snapshots, Node-based regression tests in `tools/`, git for small intentional commits.

---

## File Structure

- **Create:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/build-historical-pack-1987.py`
  - Build the `1986-87` pack from source snapshots plus TheBasketballDatabase team/player pages.
- **Create:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-pack-sources/nba_1987_full_season_v1/schedule_results.json`
  - Real `1986-87` regular-season schedule/results snapshot used when live archive feeds are absent.
- **Create:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_1987_full_season_v1/manifest.json`
  - Pack manifest with explicit provenance and inferred-coverage disclosure.
- **Create:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_1987_full_season_v1/season.json`
  - Season-level metadata for the `1986-87` preset.
- **Create:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_1987_full_season_v1/teams.json`
  - Full 23-team `1986-87` NBA team set with real-era abbreviations and palette data.
- **Create:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_1987_full_season_v1/players.json`
  - Draftable player pool with real season totals and external refs.
- **Create:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_1987_full_season_v1/roster_snapshots.json`
  - Baseline roster roles and depth tags used by season and draft flows.
- **Create:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_1987_full_season_v1/schedule.json`
  - Canonicalized schedule rows built from the checked-in real schedule snapshot.
- **Create:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_1987_full_season_v1/games.json`
  - Canonicalized final results aligned to the schedule.
- **Create:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_1987_full_season_v1/player_game_stats.json`
  - Deterministic inferred player-game coverage derived from season totals and real schedule.
- **Create:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_1987_full_season_v1/optional/presentation.json`
  - Prestige-rivalry preset art/copy metadata with Lakers focus team and Bird/Magic/Jordan star trio.
- **Create:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_1987_full_season_v1/optional/summaries.json`
  - Pack summary, trust notes, and archive-facing storyline copy.
- **Create:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_1987_full_season_v1/optional/pack_challenges.json`
  - Real-season, Draft The Era, and Reimagined Season challenge definitions.
- **Create:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-preset-1987.js`
  - Focused regression harness for pack assets, preset promotion, trust disclosure, and fallback wiring.
- **Modify:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/catalog.json`
  - Promote `nba_1987_full_season_v1` from `preview` to `playable`, refresh copy, and add launch URLs.
- **Modify:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historic-seasons.html`
  - Promote the embedded fallback catalog entry from preview to playable with matching copy and URLs.
- **Modify:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historic-universe.html`
  - Add the `1986-87` fallback catalog/details entry so saved universes still resolve if the runtime catalog fetch fails.
- **Modify:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/rosterbate-season.html`
  - Add the `nba_1987_full_season_v1 -> 1986-87` short-label mapping.

### Task 1: Add A Failing 1986-87 Preset Regression Harness

**Files:**
- Create: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-preset-1987.js`
- Test: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-preset-1987.js`

- [ ] **Step 1: Write the failing regression test**

Create `tools/test-historical-preset-1987.js` with a focused harness that checks:

- `historical-packs/catalog.json` contains `nba_1987_full_season_v1`
- the entry is `playable`, not `preview`
- playable URLs point to `historicalPackId=nba_1987_full_season_v1`
- the real pack directory and required files exist
- the bundle validates through `historical-pack-validator.js`
- trust notes disclose inferred player-game coverage
- `historic-seasons.html` and `historic-universe.html` both contain `1986-87` fallback entries
- `rosterbate-season.html` maps `nba_1987_full_season_v1` to `1986-87`

Use this exact harness:

```js
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const validator = require('../historical-pack-validator.js');

const repoRoot = path.join(__dirname, '..');
const packId = 'nba_1987_full_season_v1';
const packRoot = path.join(repoRoot, 'historical-packs', packId);

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

const catalog = readJson('historical-packs/catalog.json');
const entry = catalog.find(item => item.packId === packId);
assert.ok(entry, 'catalog is missing the 1986-87 pack entry');
assert.equal(entry.availability, 'playable', '1986-87 catalog entry should be playable');
assert.equal(entry.statusLabel, 'Playable Now');
['seasonUrl', 'simUrl', 'draftUrl', 'reimaginedUrl'].forEach(key => {
  assert.match(String(entry[key] || ''), /historicalPackId=nba_1987_full_season_v1/, `${key} should target the 1986-87 pack`);
});

[
  'manifest.json',
  'season.json',
  'teams.json',
  'players.json',
  'roster_snapshots.json',
  'schedule.json',
  'games.json',
  'player_game_stats.json',
  'optional/presentation.json',
  'optional/summaries.json',
  'optional/pack_challenges.json'
].forEach(file => {
  assert.equal(fs.existsSync(path.join(packRoot, file)), true, `missing ${file}`);
});

const manifest = readJson(`historical-packs/${packId}/manifest.json`);
const contentKeyMap = {
  season: 'season',
  teams: 'teams',
  players: 'players',
  rosterSnapshots: 'rosterSnapshots',
  schedule: 'schedule',
  games: 'games',
  playerGameStats: 'playerGameStats',
  packChallenges: 'packChallenges',
  presentation: 'presentation',
  summaries: 'summaries'
};

const bundle = { manifest };
for (const [fileKey, bundleKey] of Object.entries(contentKeyMap)) {
  const relativePath = manifest.contentFiles[fileKey];
  bundle[bundleKey] = relativePath
    ? readJson(`historical-packs/${packId}/${relativePath}`)
    : null;
}

const validation = validator.validateHistoricalPackBundle(bundle);
assert.notEqual(validation.status, 'validation_failed', '1986-87 bundle should pass historical-pack validation');
assert.equal(validation.summary.seasonId, 'nba_1987_historic');
assert.equal(validation.summary.teamCount, 23);
assert.ok(validation.summary.playerCount > 250, '1986-87 should ship a full-league player pool');

const summaries = readJson(`historical-packs/${packId}/optional/summaries.json`);
assert.match(
  JSON.stringify(summaries),
  /inferred|estimated|foundation/i,
  '1986-87 summaries should disclose inferred player-game coverage'
);

const historicSeasonsSource = readText('historic-seasons.html');
assert.match(
  historicSeasonsSource,
  /packId:\s*'nba_1987_full_season_v1'[\s\S]*?availability:\s*'playable'[\s\S]*?seasonUrl:\s*'rosterbate-season\.html\?sport=nba&historical=dev&historicalPackId=nba_1987_full_season_v1'/,
  'historic-seasons fallback catalog should promote 1986-87 to playable'
);

const historicUniverseSource = readText('historic-universe.html');
assert.match(
  historicUniverseSource,
  /packId:\s*'nba_1987_full_season_v1'/,
  'historic-universe fallback catalog should know about 1986-87'
);

const rosterbateSeasonSource = readText('rosterbate-season.html');
assert.match(
  rosterbateSeasonSource,
  /nba_1987_full_season_v1:'1986-87'/,
  'season page short-label mapping should include 1986-87'
);

console.log('historical 1986-87 preset test passed');
```

- [ ] **Step 2: Run the new regression and verify it fails**

Run:

```powershell
node .\tools\test-historical-preset-1987.js
```

Expected:

```text
AssertionError [ERR_ASSERTION]: 1986-87 catalog entry should be playable
```

- [ ] **Step 3: Commit the failing harness**

Run:

```powershell
git add .\tools\test-historical-preset-1987.js
git commit -m "test: add failing 1986-87 preset regression"
```

Expected:

```text
The commit succeeds with subject line: test: add failing 1986-87 preset regression
```

### Task 2: Scaffold A Source-Aware 1986-87 Builder

**Files:**
- Create: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/build-historical-pack-1987.py`
- Create: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-pack-sources/nba_1987_full_season_v1/schedule_results.json`
- Test: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-preset-1987.js`

- [ ] **Step 1: Seed the new builder from the proven 2000-01 script**

Start from the `2000-01` builder so the manifest/content contract stays aligned with the modern real-pack lane:

```powershell
Copy-Item `
  'C:\Users\jabro\Desktop\Fantasy Project\rosterbate\build-historical-pack-2001.py' `
  'C:\Users\jabro\Desktop\Fantasy Project\rosterbate\build-historical-pack-1987.py'
```

Then replace the top-level constants with the `1986-87` identity:

```python
REPO_ROOT = Path(__file__).resolve().parent
PACK_ID = "nba_1987_full_season_v1"
PACK_ROOT = REPO_ROOT / "historical-packs" / PACK_ID
CACHE_ROOT = REPO_ROOT / ".historical-cache" / PACK_ID
SOURCE_ROOT = REPO_ROOT / "historical-pack-sources" / PACK_ID
SEASON_ID = "nba_1987_historic"
SEASON_LABEL = "1986-87 NBA Historic Season"
SOURCE_SEASON = "1986-87"
SOURCE_SEASON_KEY = "1986"
REGULAR_SEASON_START = "1986-10-31"
REGULAR_SEASON_END = "1987-04-19"
SOURCE_MODE = "foundation_snapshot"
```

- [ ] **Step 2: Add a hard source-audit guard that records the missing archive feed instead of silently assuming it exists**

Near the existing `parse_list_data_urls()` helper, add this exact audit helper:

```python
def audit_source_mode():
    urls = parse_list_data_urls()
    has_live_archives = (
        "nbastats_1986" in urls and "pbpstats_1986" in urls
    )
    if has_live_archives:
        raise RuntimeError(
            "1986-87 live archive feeds unexpectedly exist. Revisit the builder plan before silently switching source lanes."
        )
    return {
        "mode": SOURCE_MODE,
        "liveArchivesPresent": False,
        "missingFeeds": ["nbastats_1986", "pbpstats_1986"],
    }
```

Use it at the start of `main()`:

```python
source_audit = audit_source_mode()
```

And carry the result into manifest/summaries:

```python
manifest["buildSourceMode"] = source_audit["mode"]
manifest["missingSourceFeeds"] = source_audit["missingFeeds"]
```

- [ ] **Step 3: Add the checked-in schedule/results source snapshot contract**

Create `historical-pack-sources/nba_1987_full_season_v1/schedule_results.json` with this exact top-level shape:

```json
{
  "season": "1986-87",
  "packId": "nba_1987_full_season_v1",
  "sourceMode": "foundation_snapshot",
  "notes": [
    "Real 1986-87 regular-season schedule and final scores captured for the playable foundation build.",
    "Player-game box score rows remain inferred from season totals because the live 1986 archive feeds are absent."
  ],
  "games": [
    {
      "sourceGameId": "19861031_bos_atl",
      "gameDate": "1986-10-31",
      "homeTeamAbbr": "ATL",
      "awayTeamAbbr": "BOS",
      "homeScore": 95,
      "awayScore": 103
    }
  ]
}
```

Then add a loader helper in `build-historical-pack-1987.py`:

```python
def read_source_json(name):
    path = SOURCE_ROOT / name
    if not path.exists():
        raise RuntimeError(f"Required source snapshot `{path}` is missing.")
    return json.loads(path.read_text(encoding="utf-8"))
```

- [ ] **Step 4: Run the builder once and verify the new audit fails for missing source snapshot instead of pretending the archives exist**

Run:

```powershell
python .\build-historical-pack-1987.py
```

Expected:

```text
RuntimeError: Required source snapshot `...\historical-pack-sources\nba_1987_full_season_v1\schedule_results.json` is missing.
```

If the file already exists, expected output is the next still-unimplemented builder failure, not a silent “archive not found” branch.

- [ ] **Step 5: Commit the scaffold**

Run:

```powershell
git add .\build-historical-pack-1987.py .\historical-pack-sources\nba_1987_full_season_v1\schedule_results.json
git commit -m "feat: scaffold 1986-87 historical pack builder"
```

Expected:

```text
The commit succeeds with subject line: feat: scaffold 1986-87 historical pack builder
```

### Task 3: Build The Playable 1986-87 Foundation Pack

**Files:**
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/build-historical-pack-1987.py`
- Create: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_1987_full_season_v1/manifest.json`
- Create: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_1987_full_season_v1/season.json`
- Create: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_1987_full_season_v1/teams.json`
- Create: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_1987_full_season_v1/players.json`
- Create: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_1987_full_season_v1/roster_snapshots.json`
- Create: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_1987_full_season_v1/schedule.json`
- Create: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_1987_full_season_v1/games.json`
- Create: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_1987_full_season_v1/player_game_stats.json`
- Create: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_1987_full_season_v1/optional/presentation.json`
- Create: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_1987_full_season_v1/optional/summaries.json`
- Create: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_1987_full_season_v1/optional/pack_challenges.json`
- Test: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-preset-1987.js`

- [ ] **Step 1: Retarget the team map and preset metadata to the 1986-87 league**

Replace `TEAM_DEFS` with the real 23-team `1986-87` league using era-appropriate abbreviations:

```python
TEAM_DEFS = [
    {"slug": "atl", "abbr": "ATL", "city": "Atlanta", "name": "Hawks", "displayName": "Atlanta Hawks", "conference": "East", "division": "Central", "palette": {"primary": "#C8102E", "secondary": "#FDB927"}},
    {"slug": "bos", "abbr": "BOS", "city": "Boston", "name": "Celtics", "displayName": "Boston Celtics", "conference": "East", "division": "Atlantic", "palette": {"primary": "#007A33", "secondary": "#BA9653"}},
    {"slug": "chi", "abbr": "CHI", "city": "Chicago", "name": "Bulls", "displayName": "Chicago Bulls", "conference": "East", "division": "Central", "palette": {"primary": "#CE1141", "secondary": "#000000"}},
    {"slug": "lal", "abbr": "LAL", "city": "Los Angeles", "name": "Lakers", "displayName": "Los Angeles Lakers", "conference": "West", "division": "Pacific", "palette": {"primary": "#552583", "secondary": "#FDB927"}},
    {"slug": "sea", "abbr": "SEA", "city": "Seattle", "name": "SuperSonics", "displayName": "Seattle SuperSonics", "conference": "West", "division": "Pacific", "palette": {"primary": "#00653A", "secondary": "#FFC72C"}}
]
```

Use the same full list pattern for all 23 franchises, including `GOS`, `PHL`, `SAN`, and `UTH`.

Then replace the authored metadata blocks with this exact identity:

```python
season = {
    "seasonId": SEASON_ID,
    "sport": "nba",
    "league": "nba",
    "label": SEASON_LABEL,
    "startDate": REGULAR_SEASON_START,
    "endDate": REGULAR_SEASON_END,
    "seasonType": "historical_pack",
    "isHistorical": True,
    "eraTags": ["1980s", "Finals Prestige", "Historic Season"],
    "notes": [
        "Full-league historical foundation pack for 1986-87.",
        "Real schedule/results with inferred player-game coverage because live 1986 play-by-play archives were unavailable."
    ]
}

manifest["focusTeamId"] = "nba_1987_lal"
manifest["subtitle"] = "Step into the prestige rivalry season or redraft the full Bird-Magic-Jordan player pool."
manifest["description"] = "A 1986-87 NBA historical foundation pack built from real team/player season data, real schedule/results, and disclosed inferred player-game coverage."
manifest["tagline"] = "Magic. Bird. Jordan. One prestige-rivalry universe."
manifest["era"] = "1980s"
manifest["eraTags"] = ["1980s", "Finals Prestige", "Historic Season"]

presentation = {
    "heroTitle": SEASON_LABEL,
    "heroSubtitle": "The Lakers-Celtics prestige season, with a young Jordan entering the frame.",
    "featuredTeamId": "nba_1987_lal",
    "featuredStars": [
        "nba_1987_magicjohnson",
        "nba_1987_larrybird",
        "nba_1987_michaeljordan",
        "nba_1987_kareemabduljabbar",
        "nba_1987_kevinmchale",
        "nba_1987_isiahthomas"
    ],
    "artDirection": {
        "heroTone": "heritage",
        "primaryPalette": ["#552583", "#007A33", "#C8102E"],
        "backgroundStyle": "historic_finals_spotlight"
    }
}
```

- [ ] **Step 2: Canonicalize real schedule/results from the checked-in snapshot**

Add this helper and use it instead of the `2000-01` live archive ingestion:

```python
def build_schedule_and_games(schedule_snapshot, team_by_abbr):
    schedule = []
    games = []
    for game_number, source_row in enumerate(schedule_snapshot["games"], start=1):
        home_team = team_by_abbr[source_row["homeTeamAbbr"]]
        away_team = team_by_abbr[source_row["awayTeamAbbr"]]
        canonical_game_id = f"{PACK_ID}_g{game_number:04d}"
        schedule.append({
            "gameId": canonical_game_id,
            "seasonId": SEASON_ID,
            "gameDate": source_row["gameDate"],
            "homeTeamId": home_team["teamId"],
            "awayTeamId": away_team["teamId"],
            "isRegularSeason": True,
            "gameNumber": game_number,
            "externalRefs": {
                "sourceGameId": source_row["sourceGameId"]
            }
        })
        games.append({
            "gameId": canonical_game_id,
            "seasonId": SEASON_ID,
            "status": "final",
            "homeScore": int(source_row["homeScore"]),
            "awayScore": int(source_row["awayScore"]),
            "winnerTeamId": home_team["teamId"] if int(source_row["homeScore"]) >= int(source_row["awayScore"]) else away_team["teamId"],
            "loserTeamId": away_team["teamId"] if int(source_row["homeScore"]) >= int(source_row["awayScore"]) else home_team["teamId"]
        })
    return schedule, games
```

Also add the hard guard:

```python
if not schedule_snapshot.get("games"):
    raise RuntimeError("The 1986-87 schedule snapshot does not contain any regular-season games.")
```

- [ ] **Step 3: Replace live per-game ingestion with deterministic inferred player-game coverage**

Add a foundation helper that distributes each player’s season totals across the real schedule for that player’s primary team:

```python
def distribute_total(total_value, game_count, key_seed):
    if game_count <= 0:
        return []
    base = int(total_value) // game_count
    remainder = int(total_value) % game_count
    values = [base] * game_count
    for index in range(remainder):
        slot = int((stable_fraction(f"{key_seed}:{index}") * game_count)) % game_count
        values[slot] += 1
    return values
```

Then build player-game rows with explicit provenance:

```python
player_game_stats.append({
    "playerId": player["playerId"],
    "gameId": game_ref["gameId"],
    "seasonId": SEASON_ID,
    "teamId": player["teamId"],
    "opponentTeamId": game_ref["opponentTeamId"],
    "minutes": distributed_minutes[index],
    "points": distributed_points[index],
    "rebounds": distributed_rebounds[index],
    "assists": distributed_assists[index],
    "steals": distributed_steals[index],
    "blocks": distributed_blocks[index],
    "turnovers": distributed_turnovers[index],
    "threePointersMade": distributed_threes[index],
    "fgm": distributed_fgm[index],
    "fga": distributed_fga[index],
    "ftm": distributed_ftm[index],
    "fta": distributed_fta[index],
    "statSource": "season_average_weighted_estimate",
    "minutesSource": "season_average_weighted_estimate"
})
```

That keeps the pack bootable while making the inferred coverage impossible to confuse with real event rows.

- [ ] **Step 4: Write trust-forward summaries and challenges**

Make the summaries tell the truth about the pack:

```python
summaries = {
    "packSummary": "The 1986-87 NBA season pack is a playable prestige-rivalry foundation centered on the Lakers, Celtics, and a rising Michael Jordan.",
    "historicalNotes": [
        "Schedule and final results are captured as real 1986-87 season data.",
        "Player-game stat rows are deterministic estimates distributed from real season totals because the live 1986 archive feeds were unavailable."
    ],
    "teamSpotlights": [
        "Showtime Lakers with Magic and Kareem as the featured entry point.",
        "Bird's Celtics as the prestige rival anchor.",
        "Young Jordan's Bulls as the third pillar for draft and reimagined universes."
    ]
}

pack_challenges = [
    {"id": "real_season_lakers", "mode": "real_season", "label": "Defend Showtime", "teamId": "nba_1987_lal"},
    {"id": "draft_the_era_1987", "mode": "historical_draft", "label": "Redraft Bird, Magic, and Jordan"},
    {"id": "reimagined_1987", "mode": "reimagined_season", "label": "Break the Finals collision course"}
]
```

- [ ] **Step 5: Run the builder and verify it emits a full pack summary**

Run:

```powershell
python .\build-historical-pack-1987.py
```

Expected:

A JSON summary prints with:

- `"packId": "nba_1987_full_season_v1"`
- `"teams": 23`
- positive integer counts for `players`, `rosterSnapshots`, `scheduleGames`, `playerGameStats`, and `realSeasonStats`
- a manifest/source mode summary that references `"foundation_snapshot"`

- [ ] **Step 6: Run the focused regression and verify it now passes**

Run:

```powershell
node .\tools\test-historical-preset-1987.js
```

Expected:

```text
historical 1986-87 preset test passed
```

- [ ] **Step 7: Commit the builder and generated pack**

Run:

```powershell
git add `
  .\build-historical-pack-1987.py `
  .\historical-pack-sources\nba_1987_full_season_v1\schedule_results.json `
  .\historical-packs\nba_1987_full_season_v1 `
  .\tools\test-historical-preset-1987.js
git commit -m "feat: build 1986-87 historical foundation pack"
```

Expected:

```text
The commit succeeds with subject line: feat: build 1986-87 historical foundation pack
```

### Task 4: Promote 1986-87 Across The Archive Surfaces

**Files:**
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/catalog.json`
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historic-seasons.html`
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historic-universe.html`
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/rosterbate-season.html`
- Test: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-preset-1987.js`

- [ ] **Step 1: Promote the catalog entry from preview to playable**

In `historical-packs/catalog.json`, replace the current `1986-87` preview block with this playable shape:

```json
{
  "packId": "nba_1987_full_season_v1",
  "sport": "nba",
  "seasonLabel": "1986-87 NBA Historic Season",
  "shortLabel": "1986-87",
  "era": "1980s",
  "availability": "playable",
  "statusLabel": "Playable Now",
  "significanceLabel": "Finals Prestige",
  "significanceTone": "heritage",
  "tagline": "Magic. Bird. Jordan. One prestige-rivalry universe.",
  "summary": "A playable 1986-87 historical foundation built around the Lakers-Celtics prestige season and Jordan entering the frame.",
  "whyItMatters": "This is the archive's premium 1980s tentpole: Finals rivalry gravity, Lakers focus-team energy, and a young Jordan expanding the draft sandbox.",
  "focusTeamName": "Los Angeles Lakers",
  "seasonUrl": "rosterbate-season.html?sport=nba&historical=dev&historicalPackId=nba_1987_full_season_v1",
  "simUrl": "rosterbate-season.html?sport=nba&historical=sim&historicalPackId=nba_1987_full_season_v1",
  "draftUrl": "rosterbate-draft.html?sport=nba&historical=1&historicalPackId=nba_1987_full_season_v1",
  "reimaginedUrl": "rosterbate-season.html?sport=nba&historical=reimagined&historicalPackId=nba_1987_full_season_v1"
}
```

- [ ] **Step 2: Promote the `historic-seasons.html` fallback entry**

Mirror the same copy and URLs inside the embedded fallback entry around `packId: 'nba_1987_full_season_v1'`, so it reads as playable and no longer exposes preview-only fields like `plannedModes`.

Use this exact playable block shape:

```js
{
  packId: 'nba_1987_full_season_v1',
  sport: 'nba',
  seasonLabel: '1986-87 NBA Historic Season',
  shortLabel: '1986-87',
  era: '1980s',
  availability: 'playable',
  statusLabel: 'Playable Now',
  significanceLabel: 'Finals Prestige',
  significanceTone: 'heritage',
  tagline: 'Magic. Bird. Jordan. One prestige-rivalry universe.',
  summary: 'A playable 1986-87 historical foundation built around the Lakers-Celtics prestige season and Jordan entering the frame.',
  whyItMatters: 'This is the archive\\'s premium 1980s tentpole: Finals rivalry gravity, Lakers focus-team energy, and a young Jordan expanding the draft sandbox.',
  focusTeamName: 'Los Angeles Lakers',
  seasonUrl: 'rosterbate-season.html?sport=nba&historical=dev&historicalPackId=nba_1987_full_season_v1',
  simUrl: 'rosterbate-season.html?sport=nba&historical=sim&historicalPackId=nba_1987_full_season_v1',
  draftUrl: 'rosterbate-draft.html?sport=nba&historical=1&historicalPackId=nba_1987_full_season_v1',
  reimaginedUrl: 'rosterbate-season.html?sport=nba&historical=reimagined&historicalPackId=nba_1987_full_season_v1',
  previewStars: ['Magic Johnson', 'Larry Bird', 'Michael Jordan']
}
```

- [ ] **Step 3: Add the `historic-universe.html` fallback entry**

Add a fallback entry for `nba_1987_full_season_v1` alongside the other playable packs. Keep it compact and aligned to the catalog copy:

```js
{
  packId: 'nba_1987_full_season_v1',
  seasonLabel: '1986-87 NBA Historic Season',
  shortLabel: '1986-87',
  era: '1980s',
  statusLabel: 'Playable Now',
  significanceLabel: 'Finals Prestige',
  focusTeamName: 'Los Angeles Lakers',
  tagline: 'Magic. Bird. Jordan. One prestige-rivalry universe.'
}
```

- [ ] **Step 4: Add the short-label mapping in the season page**

In `formatHistoricalPackShortLabel()` inside `rosterbate-season.html`, extend the `known` map to include:

```js
const known = {
  nba_1987_full_season_v1:'1986-87',
  nba_1996_full_season_v1:'1995-96',
  nba_2001_full_season_v1:'2000-01',
  nba_2016_full_season_v1:'2015-16',
  mixed_era_1996_2016_top300_v1:'95-96 x 15-16',
  mixed_era_1996_2016_top100_v1:'95-96 x 15-16'
};
```

- [ ] **Step 5: Rerun the focused regression and the universe details guardrail**

Run:

```powershell
node .\tools\test-historical-preset-1987.js
node .\tools\test-historical-universe-details.js
```

Expected:

```text
historical 1986-87 preset test passed
historical universe details test passed
```

- [ ] **Step 6: Commit the preset promotion**

Run:

```powershell
git add `
  .\historical-packs\catalog.json `
  .\historic-seasons.html `
  .\historic-universe.html `
  .\rosterbate-season.html
git commit -m "feat: promote 1986-87 historical preset"
```

Expected:

```text
The commit succeeds with subject line: feat: promote 1986-87 historical preset
```

### Task 5: Final Verification And Merge Readiness

**Files:**
- Test: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-preset-1987.js`
- Test: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-universe-details.js`
- Test: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-drafted-universe-snapshot.js`
- Test: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-universe-slot-storage.js`

- [ ] **Step 1: Run the full focused verification sweep**

Run:

```powershell
python .\build-historical-pack-1987.py
node .\tools\test-historical-preset-1987.js
node .\tools\test-historical-universe-details.js
node .\tools\test-historical-drafted-universe-snapshot.js
node .\tools\test-historical-universe-slot-storage.js
```

Expected:

```text
The builder prints a `nba_1987_full_season_v1` summary with positive counts.
historical 1986-87 preset test passed
historical universe details test passed
historical drafted universe snapshot test passed
historical universe slot storage test passed
```

- [ ] **Step 2: Do one manual boot sanity check**

Open these URLs in the local app/browser:

```text
C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html?sport=nba&historical=dev&historicalPackId=nba_1987_full_season_v1
C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html?sport=nba&historical=sim&historicalPackId=nba_1987_full_season_v1
```

Confirm:

- the preset opens without missing-pack errors
- the hero copy reads as Finals-prestige / Lakers-anchored, not preview text
- the short label reads `1986-87`
- the trust notes mention inferred player-game coverage somewhere in the pack summary/details path

- [ ] **Step 3: Commit any last trust-copy or validation touch-ups**

Run:

```powershell
git add -A
git commit -m "chore: finalize 1986-87 preset verification"
```

Expected:

```text
Either no-op because nothing changed, or a small final verification commit lands cleanly.
```
