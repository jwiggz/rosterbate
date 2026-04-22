# Historical Preset 1992-93 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `nba_1993_full_season_v1` as a real, bootable `1992-93` historical universe preset instead of leaving the early-1990s shelf empty.

**Architecture:** Reuse the proven historical-preset expansion lane from `1986-87`, not the higher-fidelity `2000-01` lane. Because the live `1992` `pbpstats` / `nbastats` archives are absent, this pack should be built as an honest playable foundation: real team/player season data, a checked-in real schedule/results snapshot, and deterministic inferred player-game coverage that is explicitly disclosed in manifest and summary copy.

**Tech Stack:** Static HTML/CSS/JS (`historic-seasons.html`, `historic-universe.html`, `rosterbate-season.html`), JSON pack assets under `historical-packs/`, Python build script with `requests`, checked-in JSON source snapshots, Node-based regression tests in `tools/`, git for small intentional commits.

---

## File Structure

- **Create:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/build-historical-pack-1993.py`
  - Build the `1992-93` pack from source snapshots plus trusted season-source team/player pages.
- **Create:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-pack-sources/nba_1993_full_season_v1/schedule_results.json`
  - Real `1992-93` regular-season schedule/results snapshot used because live archive feeds are absent.
- **Create:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-pack-sources/nba_1993_full_season_v1/normalized_players.json`
  - Checked-in normalized player source snapshot for the canonical primary-team player pool.
- **Create:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_1993_full_season_v1/manifest.json`
  - Pack manifest with explicit provenance and inferred-coverage disclosure.
- **Create:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_1993_full_season_v1/season.json`
  - Season-level metadata for the `1992-93` preset.
- **Create:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_1993_full_season_v1/teams.json`
  - Full 27-team `1992-93` NBA team set with era-appropriate abbreviations and palette data.
- **Create:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_1993_full_season_v1/players.json`
  - Draftable player pool with real season totals and external refs.
- **Create:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_1993_full_season_v1/roster_snapshots.json`
  - Baseline roster roles and depth tags used by season and draft flows.
- **Create:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_1993_full_season_v1/schedule.json`
  - Canonicalized schedule rows built from the checked-in real schedule snapshot.
- **Create:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_1993_full_season_v1/games.json`
  - Canonicalized final results aligned to the schedule.
- **Create:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_1993_full_season_v1/player_game_stats.json`
  - Deterministic inferred player-game coverage derived from season totals and real schedule.
- **Create:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_1993_full_season_v1/optional/presentation.json`
  - First-three-peat preset art/copy metadata with Bulls focus team and Jordan/Barkley/Pippen pillars.
- **Create:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_1993_full_season_v1/optional/summaries.json`
  - Pack summary, trust notes, and archive-facing storyline copy.
- **Create:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_1993_full_season_v1/optional/pack_challenges.json`
  - Real-season, Draft The Era, and Reimagined Season challenge definitions.
- **Create:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-preset-1993.js`
  - Focused regression harness for pack assets, preset wiring, trust disclosure, and fallback coverage.
- **Modify:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/catalog.json`
  - Add `nba_1993_full_season_v1` as a playable preset with approved copy and launch URLs.
- **Modify:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historic-seasons.html`
  - Add the embedded fallback catalog entry for `1992-93` as playable.
- **Modify:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historic-universe.html`
  - Add the `1992-93` fallback details entry so saved universes still resolve if the runtime catalog fetch fails.
- **Modify:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/rosterbate-season.html`
  - Add the `nba_1993_full_season_v1 -> 1992-93` short-label mapping.

### Task 1: Add A Failing 1992-93 Preset Regression Harness

**Files:**
- Create: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-preset-1993.js`
- Test: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-preset-1993.js`

- [ ] **Step 1: Write the failing regression test**

Create `tools/test-historical-preset-1993.js` with a focused harness that checks:

- `historical-packs/catalog.json` contains `nba_1993_full_season_v1`
- the entry is `playable`
- playable URLs point to `historicalPackId=nba_1993_full_season_v1`
- the real pack directory and required files exist
- the bundle validates through `historical-pack-validator.js`
- trust notes disclose inferred/foundation player-game coverage
- `historic-seasons.html` and `historic-universe.html` both contain `1992-93` fallback entries
- `rosterbate-season.html` maps `nba_1993_full_season_v1` to `1992-93`

Use this exact harness:

```js
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const validator = require('../historical-pack-validator.js');

const repoRoot = path.join(__dirname, '..');
const packId = 'nba_1993_full_season_v1';
const packRoot = path.join(repoRoot, 'historical-packs', packId);

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

const catalog = readJson('historical-packs/catalog.json');
const entry = catalog.find(item => item.packId === packId);
assert.ok(entry, 'catalog is missing the 1992-93 pack entry');
assert.equal(entry.availability, 'playable', '1992-93 catalog entry should be playable');
assert.equal(entry.statusLabel, 'Playable Now');
['seasonUrl', 'simUrl', 'draftUrl', 'reimaginedUrl'].forEach(key => {
  assert.match(String(entry[key] || ''), /historicalPackId=nba_1993_full_season_v1/, `${key} should target the 1992-93 pack`);
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
assert.notEqual(validation.status, 'validation_failed', '1992-93 bundle should pass historical-pack validation');
assert.equal(validation.summary.seasonId, 'nba_1993_historic');
assert.equal(validation.summary.teamCount, 27);
assert.ok(validation.summary.playerCount > 300, '1992-93 should ship a full-league player pool');

const summaries = readJson(`historical-packs/${packId}/optional/summaries.json`);
assert.match(
  JSON.stringify(summaries),
  /inferred|estimated|foundation/i,
  '1992-93 summaries should disclose inferred player-game coverage'
);

const historicSeasonsSource = readText('historic-seasons.html');
assert.match(
  historicSeasonsSource,
  /packId:\s*'nba_1993_full_season_v1'[\s\S]*?availability:\s*'playable'[\s\S]*?seasonUrl:\s*'rosterbate-season\.html\?sport=nba&historical=dev&historicalPackId=nba_1993_full_season_v1'/,
  'historic-seasons fallback catalog should include 1992-93 as playable'
);

const historicUniverseSource = readText('historic-universe.html');
assert.match(
  historicUniverseSource,
  /packId:\s*'nba_1993_full_season_v1'/,
  'historic-universe fallback catalog should know about 1992-93'
);

const rosterbateSeasonSource = readText('rosterbate-season.html');
assert.match(
  rosterbateSeasonSource,
  /nba_1993_full_season_v1:'1992-93'/,
  'season page short-label mapping should include 1992-93'
);

console.log('historical 1992-93 preset test passed');
```

- [ ] **Step 2: Run the new regression and verify it fails**

Run:

```powershell
node .\tools\test-historical-preset-1993.js
```

Expected:

```text
AssertionError [ERR_ASSERTION]: catalog is missing the 1992-93 pack entry
```

- [ ] **Step 3: Commit the failing harness**

Run:

```powershell
git add .\tools\test-historical-preset-1993.js
git commit -m "test: add failing 1992-93 preset regression"
```

Expected:

```text
The commit succeeds with subject line: test: add failing 1992-93 preset regression
```

### Task 2: Scaffold A Source-Aware 1992-93 Foundation Builder

**Files:**
- Create: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/build-historical-pack-1993.py`
- Create: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-pack-sources/nba_1993_full_season_v1/schedule_results.json`
- Test: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-preset-1993.js`

- [ ] **Step 1: Seed the new builder from the proven 1986-87 foundation builder**

Start from the `1986-87` builder so the foundation-pack contract, source-validation path, and trust-disclosure lane stay aligned:

```powershell
Copy-Item `
  'C:\Users\jabro\Desktop\Fantasy Project\rosterbate\build-historical-pack-1987.py' `
  'C:\Users\jabro\Desktop\Fantasy Project\rosterbate\build-historical-pack-1993.py'
```

Then replace the top-level constants with the `1992-93` identity:

```python
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
```

- [ ] **Step 2: Keep the hard source-audit guard and retarget it to the missing 1992 archive feeds**

Replace the existing source-audit helper with this exact guard:

```python
def audit_source_mode():
    urls = parse_list_data_urls()
    has_live_archives = (
        "nbastats_1992" in urls and "pbpstats_1992" in urls
    )
    if has_live_archives:
        raise RuntimeError(
            "1992-93 live archive feeds unexpectedly exist. Revisit the builder plan before silently switching source lanes."
        )
    return {
        "mode": SOURCE_MODE,
        "liveArchivesPresent": False,
        "missingFeeds": ["nbastats_1992", "pbpstats_1992"],
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

Create `historical-pack-sources/nba_1993_full_season_v1/schedule_results.json` with this exact top-level shape:

```json
{
  "season": "1992-93",
  "packId": "nba_1993_full_season_v1",
  "sourceMode": "foundation_snapshot",
  "notes": [
    "Real 1992-93 regular-season schedule and final scores captured for the playable foundation build.",
    "Player-game box score rows remain inferred from season totals because the live 1992 archive feeds are absent."
  ],
  "games": [
    {
      "sourceGameId": "19921106_chi_cle",
      "gameDate": "1992-11-06",
      "homeTeamAbbr": "CLE",
      "awayTeamAbbr": "CHI",
      "homeScore": 96,
      "awayScore": 101
    }
  ]
}
```

Then keep this loader helper in `build-historical-pack-1993.py`:

```python
def read_source_json(name):
    path = SOURCE_ROOT / name
    if not path.exists():
        raise RuntimeError(f"Required source snapshot `{path}` is missing.")
    return json.loads(path.read_text(encoding="utf-8"))
```

- [ ] **Step 4: Run the builder once and verify the source contract fails honestly instead of pretending live archives exist**

Run:

```powershell
python .\build-historical-pack-1993.py
```

Expected:

Either:

```text
RuntimeError: Required source snapshot `...\historical-pack-sources\nba_1993_full_season_v1\normalized_players.json` is missing.
```

or the next still-unimplemented pack-build failure, but never a silent live-archive path.

- [ ] **Step 5: Commit the scaffold**

Run:

```powershell
git add .\build-historical-pack-1993.py .\historical-pack-sources\nba_1993_full_season_v1\schedule_results.json
git commit -m "feat: scaffold 1992-93 historical pack builder"
```

Expected:

```text
The commit succeeds with subject line: feat: scaffold 1992-93 historical pack builder
```

### Task 3: Build The Playable 1992-93 Foundation Pack

**Files:**
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/build-historical-pack-1993.py`
- Create: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-pack-sources/nba_1993_full_season_v1/normalized_players.json`
- Create: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_1993_full_season_v1/manifest.json`
- Create: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_1993_full_season_v1/season.json`
- Create: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_1993_full_season_v1/teams.json`
- Create: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_1993_full_season_v1/players.json`
- Create: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_1993_full_season_v1/roster_snapshots.json`
- Create: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_1993_full_season_v1/schedule.json`
- Create: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_1993_full_season_v1/games.json`
- Create: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_1993_full_season_v1/player_game_stats.json`
- Create: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_1993_full_season_v1/optional/presentation.json`
- Create: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_1993_full_season_v1/optional/summaries.json`
- Create: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_1993_full_season_v1/optional/pack_challenges.json`
- Test: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-preset-1993.js`

- [ ] **Step 1: Expand the builder to the real 27-team 1992-93 league and early-90s identity**

Replace the star-identity helper with the `1992-93` pillars:

```python
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
```

Retarget the presentation block to the approved identity:

```python
presentation = {
    "packId": PACK_ID,
    "seasonLabel": SEASON_LABEL,
    "shortLabel": "1992-93",
    "significanceLabel": "First Three-Peat Prestige",
    "significanceTone": "dynasty",
    "focusTeamName": "Chicago Bulls",
    "art": {
        "theme": "dynasty",
        "eyebrow": "First Three-Peat",
        "headline": "Jordan.\nBarkley.\nPippen.",
        "subline": "Bulls title gravity with Phoenix and Barkley as the Finals counterweight."
    },
    "previewStars": ["Michael Jordan", "Charles Barkley", "Scottie Pippen"],
    "tagline": "Jordan. Barkley. Pippen. One first-three-peat universe."
}
```

- [ ] **Step 2: Normalize and check in the primary-team player source snapshot**

Create and validate the checked-in source snapshot instead of trusting only live scrape output:

```python
player_source_snapshot = {
    "season": SOURCE_SEASON,
    "packId": PACK_ID,
    "sourceMode": SOURCE_MODE,
    "status": "normalized_primary_team_player_pool",
    "notes": [
        "Primary-team player pool normalized from trusted season-source tables for the 1992-93 foundation build.",
        "Traded-player duplicates collapse to a canonical primary-team season record before inferred player-game rows are emitted."
    ],
    "players": normalized_players
}
write_source_json("normalized_players.json", player_source_snapshot)
```

Keep the 1987-style metadata validation guard, retargeted to `1992-93`:

```python
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
```

- [ ] **Step 3: Build canonical schedule/games and deterministic inferred player-game coverage**

Keep the 1987 foundation-lane helper shape and retarget it to `1992-93` schedule/results plus the 27-team league:

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

Every generated player-game row must keep explicit provenance:

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

- [ ] **Step 4: Write trust-forward summaries and challenge metadata**

Make the summaries tell the truth about the pack:

```python
summaries = {
    "packSummary": "The 1992-93 foundation pack brings the full 27-team league into Historic Seasons with real regular-season schedule/results, real player season totals, and clearly disclosed inferred player-game coverage.",
    "historicalNotes": [
        "Schedule and final results are captured as real 1992-93 season data.",
        "Player-game stat rows are deterministic estimates distributed from real season totals because the live 1992 archive feeds were unavailable."
    ],
    "teamSpotlights": [
        "Chicago is the flagship title-era lane, built around Jordan, Pippen, and the first three-peat front door.",
        "Phoenix keeps Barkley's challenger Suns at full strength as the Finals counterweight.",
        "New York and the rest of the early-90s East keep the season from collapsing into a one-team nostalgia pack."
    ]
}

pack_challenges = {
    "packId": PACK_ID,
    "version": 1,
    "challengeGroups": [
        {"groupId": "real_season_paths", "label": "Play The Real Season", "mode": "real_season"},
        {"groupId": "draft_the_era_paths", "label": "Draft The Era", "mode": "historical_draft"},
        {"groupId": "reimagined_paths", "label": "Reimagined Season", "mode": "reimagined_season"}
    ],
    "challenges": [
        {"challengeId": "bulls_threepeat_push", "groupId": "real_season_paths", "teamId": f"{ENTITY_PREFIX}_chi", "label": "Complete The First Three-Peat"},
        {"challengeId": "redraft_1993", "groupId": "draft_the_era_paths", "label": "Redraft Jordan, Barkley, and Pippen"},
        {"challengeId": "rewrite_1993_finals", "groupId": "reimagined_paths", "label": "Break The Bulls-Suns Collision Course"}
    ]
}
```

- [ ] **Step 5: Run the builder and verify it emits a full pack summary**

Run:

```powershell
python .\build-historical-pack-1993.py
```

Expected:

A JSON summary prints with:

- `"packId": "nba_1993_full_season_v1"`
- `"teams": 27`
- positive integer counts for `players`, `rosterSnapshots`, `scheduleGames`, `playerGameStats`, and `realSeasonStats`
- a manifest/source mode summary that references `"foundation_snapshot"`

- [ ] **Step 6: Run the focused regression and verify it still fails only on the archive-promotion boundary**

Run:

```powershell
node .\tools\test-historical-preset-1993.js
```

Expected:

Either:

```text
AssertionError [ERR_ASSERTION]: 1992-93 catalog entry should be playable
```

or the equivalent missing fallback-entry failure, but not a pack-validation failure.

- [ ] **Step 7: Commit the builder, source snapshots, and generated pack**

Run:

```powershell
git add `
  .\build-historical-pack-1993.py `
  .\historical-pack-sources\nba_1993_full_season_v1 `
  .\historical-packs\nba_1993_full_season_v1 `
  .\tools\test-historical-preset-1993.js
git commit -m "feat: build 1992-93 historical foundation pack"
```

Expected:

```text
The commit succeeds with subject line: feat: build 1992-93 historical foundation pack
```

### Task 4: Add 1992-93 Across The Archive Surfaces

**Files:**
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/catalog.json`
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historic-seasons.html`
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historic-universe.html`
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/rosterbate-season.html`
- Test: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-preset-1993.js`

- [ ] **Step 1: Add the playable catalog entry**

In `historical-packs/catalog.json`, add this exact playable block for `nba_1993_full_season_v1`:

```json
{
  "packId": "nba_1993_full_season_v1",
  "sport": "nba",
  "seasonLabel": "1992-93 NBA Historic Season",
  "shortLabel": "1992-93",
  "era": "1990s",
  "availability": "playable",
  "statusLabel": "Playable Now",
  "significanceLabel": "First Three-Peat Prestige",
  "significanceTone": "dynasty",
  "completenessLabel": "Playable foundation",
  "completenessPercent": 18,
  "tagline": "Jordan. Barkley. Pippen. One first-three-peat universe.",
  "summary": "A playable 1992-93 historical foundation built around the Bulls' first three-peat push and the Suns' Finals-era challenge.",
  "whyItMatters": "This is the archive's premium early-1990s tentpole: Jordan's title-era gravity, Barkley's challenger Suns, and a player pool that bridges 1980s prestige to 1995-96 dynasty apex.",
  "focusTeamName": "Chicago Bulls",
  "seasonUrl": "rosterbate-season.html?sport=nba&historical=dev&historicalPackId=nba_1993_full_season_v1",
  "simUrl": "rosterbate-season.html?sport=nba&historical=sim&historicalPackId=nba_1993_full_season_v1",
  "draftUrl": "rosterbate-draft.html?sport=nba&historical=dev&historicalPackId=nba_1993_full_season_v1",
  "reimaginedUrl": "rosterbate-season.html?sport=nba&historical=reimagined&historicalPackId=nba_1993_full_season_v1"
}
```

- [ ] **Step 2: Add the `historic-seasons.html` fallback entry**

Add this exact playable fallback block:

```js
const HISTORIC_1993_FALLBACK = {
  packId: 'nba_1993_full_season_v1',
  sport: 'nba',
  seasonLabel: '1992-93 NBA Historic Season',
  shortLabel: '1992-93',
  era: '1990s',
  availability: 'playable',
  statusLabel: 'Playable Now',
  significanceLabel: 'First Three-Peat Prestige',
  significanceTone: 'dynasty',
  completenessLabel: 'Playable foundation',
  completenessPercent: 18,
  tagline: 'Jordan. Barkley. Pippen. One first-three-peat universe.',
  summary: 'A playable 1992-93 historical foundation built around the Bulls\' first three-peat push and the Suns\' Finals-era challenge.',
  whyItMatters: 'This is the archive\'s premium early-1990s tentpole: Jordan\'s title-era gravity, Barkley\'s challenger Suns, and a player pool that bridges 1980s prestige to 1995-96 dynasty apex.',
  focusTeamName: 'Chicago Bulls',
  art: {
    theme: 'dynasty',
    eyebrow: 'First Three-Peat',
    headline: 'Jordan.\nBarkley.\nPippen.',
    subline: 'Bulls title gravity with Phoenix and Barkley as the Finals counterweight.'
  },
  previewStars: ['Michael Jordan', 'Charles Barkley', 'Scottie Pippen'],
  seasonUrl: 'rosterbate-season.html?sport=nba&historical=dev&historicalPackId=nba_1993_full_season_v1',
  simUrl: 'rosterbate-season.html?sport=nba&historical=sim&historicalPackId=nba_1993_full_season_v1',
  draftUrl: 'rosterbate-draft.html?sport=nba&historical=dev&historicalPackId=nba_1993_full_season_v1',
  reimaginedUrl: 'rosterbate-season.html?sport=nba&historical=reimagined&historicalPackId=nba_1993_full_season_v1'
};
```

- [ ] **Step 3: Add the `historic-universe.html` fallback entry**

Add this exact fallback block:

```js
const HISTORIC_UNIVERSE_1993_FALLBACK = {
  packId: 'nba_1993_full_season_v1',
  seasonLabel: '1992-93 NBA Historic Season',
  shortLabel: '1992-93',
  era: '1990s',
  availability: 'playable',
  statusLabel: 'Playable Now',
  significanceLabel: 'First Three-Peat Prestige',
  significanceTone: 'dynasty',
  focusTeamName: 'Chicago Bulls',
  tagline: 'Jordan. Barkley. Pippen. One first-three-peat universe.',
  summary: 'A playable 1992-93 historical foundation built around the Bulls\' first three-peat push and the Suns\' Finals-era challenge.',
  whyItMatters: 'This is the archive\'s premium early-1990s tentpole: Jordan\'s title-era gravity, Barkley\'s challenger Suns, and a player pool that bridges 1980s prestige to 1995-96 dynasty apex.',
  art: { theme:'dynasty', eyebrow:'First Three-Peat', headline:'Jordan.\nBarkley.\nPippen.', subline:'Bulls title gravity with Phoenix and Barkley as the Finals counterweight.' }
};
```

- [ ] **Step 4: Add the short-label mapping in the season page**

In `formatHistoricalPackShortLabel()` inside `rosterbate-season.html`, extend the `known` map to include:

```js
const known = {
  nba_1987_full_season_v1:'1986-87',
  nba_1993_full_season_v1:'1992-93',
  nba_1996_full_season_v1:'1995-96',
  nba_2001_full_season_v1:'2000-01',
  nba_2016_full_season_v1:'2015-16',
  mixed_era_1996_2016_top300_v1:'95-96 x 15-16',
  mixed_era_1996_2016_top100_v1:'95-96 x 15-16'
};
```

- [ ] **Step 5: Rerun the focused regression and the universe-details guardrail**

Run:

```powershell
node .\tools\test-historical-preset-1993.js
node .\tools\test-historical-universe-details.js
```

Expected:

```text
historical 1992-93 preset test passed
historical universe details test passed
```

- [ ] **Step 6: Commit the archive promotion**

Run:

```powershell
git add `
  .\historical-packs\catalog.json `
  .\historic-seasons.html `
  .\historic-universe.html `
  .\rosterbate-season.html
git commit -m "feat: add 1992-93 historical preset"
```

Expected:

```text
The commit succeeds with subject line: feat: add 1992-93 historical preset
```

### Task 5: Final Verification And Merge Readiness

**Files:**
- Test: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-preset-1993.js`
- Test: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-universe-details.js`
- Test: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-drafted-universe-snapshot.js`
- Test: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-universe-slot-storage.js`

- [ ] **Step 1: Run the full focused verification sweep**

Run:

```powershell
python .\build-historical-pack-1993.py
node .\tools\test-historical-preset-1993.js
node .\tools\test-historical-universe-details.js
node .\tools\test-historical-drafted-universe-snapshot.js
node .\tools\test-historical-universe-slot-storage.js
```

Expected:

```text
The builder prints a `nba_1993_full_season_v1` summary with positive counts.
historical 1992-93 preset test passed
historical universe details test passed
historical drafted universe snapshot test passed
historical universe slot storage test passed
```

- [ ] **Step 2: Do one manual boot sanity check**

Open these URLs in the local app/browser:

```text
C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html?sport=nba&historical=dev&historicalPackId=nba_1993_full_season_v1
C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html?sport=nba&historical=sim&historicalPackId=nba_1993_full_season_v1
```

Confirm:

- the preset opens without missing-pack errors
- the hero copy reads as Bulls/title-era prestige, not generic preview text
- the short label reads `1992-93`
- the trust notes mention inferred player-game coverage somewhere in the pack summary/details path

- [ ] **Step 3: Commit any last trust-copy or validation touch-ups**

Run:

```powershell
git add .
git commit -m "fix: polish 1992-93 preset trust copy"
```

Expected:

```text
If no final touch-ups are needed, skip this step.
If needed, the commit succeeds with subject line: fix: polish 1992-93 preset trust copy
```
