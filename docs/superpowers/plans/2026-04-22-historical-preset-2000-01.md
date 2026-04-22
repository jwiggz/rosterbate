# Historical Preset 2000-01 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `nba_2001_full_season_v1` as a real, bootable `2000-01` historical universe preset instead of a preview shell.

**Architecture:** Reuse the existing historical-pack pattern instead of inventing new preset infrastructure. Build a real `historical-packs/nba_2001_full_season_v1/` bundle with the same manifest/content contract as `1996` and `2016`, then promote the already-advertised `2000-01` catalog entry from preview to playable across the historical browser, universe-details fallback, and season-page labeling.

**Tech Stack:** Static HTML/CSS/JS (`historic-seasons.html`, `historic-universe.html`, `rosterbate-season.html`), JSON pack assets under `historical-packs/`, Python build script patterned after `build-historical-pack-2016.py`, Node-based regression tests in `tools/`, git for small intentional commits.

---

## File Structure

- **Create:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/build-historical-pack-2001.py`
  - Generate the real `2000-01` historical pack files from source season data using the same output contract as the `2016` builder.
- **Create:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_2001_full_season_v1/manifest.json`
  - Pack manifest with pack identity, supported modes, content file pointers, provenance, and audit summary.
- **Create:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_2001_full_season_v1/season.json`
  - Season-level metadata (`seasonId`, date range, era tags, notes).
- **Create:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_2001_full_season_v1/teams.json`
  - Full `2000-01` team set with IDs, names, conferences/divisions, and palette data.
- **Create:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_2001_full_season_v1/players.json`
  - Draftable player pool with real season totals/per-game stats and external refs.
- **Create:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_2001_full_season_v1/roster_snapshots.json`
  - Depth tags and baseline roster roles used by season boot and draft flows.
- **Create:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_2001_full_season_v1/schedule.json`
  - Real regular-season schedule rows for `2000-01`.
- **Create:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_2001_full_season_v1/games.json`
  - Real game results aligned to the schedule.
- **Create:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_2001_full_season_v1/player_game_stats.json`
  - Real per-game player stat rows used for sim/season enrichment.
- **Create:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_2001_full_season_v1/optional/presentation.json`
  - Hero art direction, featured team, featured stars, and entry-mode copy.
- **Create:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_2001_full_season_v1/optional/summaries.json`
  - Pack summary, storyline copy, team spotlights, and audit notes.
- **Create:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nba_2001_full_season_v1/optional/pack_challenges.json`
  - Featured real-season, draft-the-era, and optional reimagined-season challenge definitions.
- **Create:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-preset-2001.js`
  - Focused regression harness that verifies the new pack assets, catalog metadata, fallback presence, and short-label mapping.
- **Modify:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/catalog.json`
  - Promote `nba_2001_full_season_v1` from `preview` to `playable`, add launch URLs, and tighten the preset copy.
- **Modify:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historic-seasons.html`
  - Promote the embedded fallback catalog entry for `2000-01` to playable with matching copy and URLs.
- **Modify:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historic-universe.html`
  - Add the `2000-01` fallback catalog/details entry so saved universes still resolve if the runtime catalog fetch fails.
- **Modify:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/rosterbate-season.html`
  - Teach `formatHistoricalPackShortLabel()` about `nba_2001_full_season_v1` so mixed-source labels and saved-universe summaries render cleanly.

### Task 1: Add A Failing 2000-01 Preset Regression Harness

**Files:**
- Create: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-preset-2001.js`
- Test: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-preset-2001.js`

- [ ] **Step 1: Write the failing regression test**

Create `tools/test-historical-preset-2001.js` with a focused harness that checks:

- `historical-packs/catalog.json` contains `nba_2001_full_season_v1`
- the entry is `playable`, not `preview`
- playable URLs point to `historicalPackId=nba_2001_full_season_v1`
- the real pack directory and required files exist
- `historical-pack-validator.js` accepts the assembled bundle
- `historic-seasons.html` and `historic-universe.html` both contain `2000-01` fallback entries
- `rosterbate-season.html` maps `nba_2001_full_season_v1` to `2000-01`

Use this exact harness:

```js
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const validator = require('../historical-pack-validator.js');

const repoRoot = path.join(__dirname, '..');
const packId = 'nba_2001_full_season_v1';
const packRoot = path.join(repoRoot, 'historical-packs', packId);

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

const catalog = readJson('historical-packs/catalog.json');
const entry = catalog.find(item => item.packId === packId);
assert.ok(entry, 'catalog is missing the 2000-01 pack entry');
assert.equal(entry.availability, 'playable', '2000-01 catalog entry should be playable');
assert.equal(entry.statusLabel, 'Playable Now');
['seasonUrl', 'simUrl', 'draftUrl'].forEach(key => {
  assert.match(String(entry[key] || ''), /historicalPackId=nba_2001_full_season_v1/, `${key} should target the 2000-01 pack`);
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
assert.notEqual(validation.status, 'validation_failed', '2000-01 bundle should pass historical-pack validation');
assert.equal(validation.summary.seasonId, 'nba_2001_historic');
assert.equal(validation.summary.teamCount, 29);
assert.ok(validation.summary.playerCount > 300, '2000-01 should ship a full-league player pool');

const historicSeasonsSource = readText('historic-seasons.html');
assert.match(
  historicSeasonsSource,
  /packId:\s*'nba_2001_full_season_v1'[\s\S]*?availability:\s*'playable'[\s\S]*?seasonUrl:\s*'rosterbate-season\.html\?sport=nba&historical=dev&historicalPackId=nba_2001_full_season_v1'/,
  'historic-seasons fallback catalog should promote 2000-01 to playable'
);

const historicUniverseSource = readText('historic-universe.html');
assert.match(
  historicUniverseSource,
  /packId:\s*'nba_2001_full_season_v1'/,
  'historic-universe fallback catalog should know about 2000-01'
);

const rosterbateSeasonSource = readText('rosterbate-season.html');
assert.match(
  rosterbateSeasonSource,
  /nba_2001_full_season_v1:'2000-01'/,
  'season page short-label mapping should include 2000-01'
);

console.log('historical 2000-01 preset test passed');
```

- [ ] **Step 2: Run the new regression and verify it fails**

Run:

```powershell
node .\tools\test-historical-preset-2001.js
```

Expected:

```text
AssertionError [ERR_ASSERTION]: 2000-01 catalog entry should be playable
```

- [ ] **Step 3: Commit the failing test harness**

Run:

```powershell
git add tools/test-historical-preset-2001.js
git commit -m "test: add failing 2000-01 preset regression"
```

Expected:

```text
The commit succeeds with subject line: test: add failing 2000-01 preset regression
```

### Task 2: Create The 2000-01 Historical Pack Builder

**Files:**
- Create: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/build-historical-pack-2001.py`
- Test: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-preset-2001.js`

- [ ] **Step 1: Seed the new builder from the proven 2016 script**

Start from the existing `2016` builder so the output contract stays identical:

```powershell
Copy-Item `
  'C:\Users\jabro\Desktop\Fantasy Project\rosterbate\build-historical-pack-2016.py' `
  'C:\Users\jabro\Desktop\Fantasy Project\rosterbate\build-historical-pack-2001.py'
```

Then replace the top-level constants with the `2000-01` identity:

```python
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
```

- [ ] **Step 2: Retarget the team map and season metadata to 2000-01**

Rewrite the `TEAM_DEFS` and presentation metadata for the actual `2000-01` league shape:

- keep the same `slug / abbr / city / name / displayName / conference / division / palette` schema
- use `29` teams
- include early-2000s abbreviations like `CHH`, `NJN`, and `VAN`
- make the featured team the Lakers (`nba_2001_lal`)

Update the builder's authored metadata blocks to this exact identity:

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
    "eraTags": ["2000s", "Dynasty Transition", "Historic Season"],
    "notes": [
        "Full-league historical foundation pack for 2000-01.",
        "Supports real-season boots, Draft The Era, and Reimagined Season."
    ],
}

manifest["focusTeamId"] = "nba_2001_lal"
manifest["subtitle"] = "Play the real season, redraft the era, or branch into a turn-of-the-century alternate universe."
manifest["description"] = "A 2000-01 NBA historical season pack built from real team, player, schedule, result, and player-game data."
manifest["tagline"] = "Shaq, Kobe, Iverson, and the league at a turn-of-the-century peak."
manifest["era"] = "2000s"
manifest["eraTags"] = ["2000s", "Dynasty Era", "Historic Season"]

presentation = {
    "heroTitle": SEASON_LABEL,
    "heroSubtitle": "Step into the Shaq-and-Kobe title-defense season or redraft the full turn-of-the-century league.",
    "featuredTeamId": "nba_2001_lal",
    "featuredStars": [
        "nba_2001_shaquilleoneal_406",
        "nba_2001_kobebryant_977",
        "nba_2001_alleniverson_947",
        "nba_2001_timduncan_1495",
        "nba_2001_kevingarnett_708",
        "nba_2001_chrisswebber_1713"
    ],
    "artDirection": {
        "heroTone": "dynasty",
        "primaryPalette": ["#5f3293", "#f0c461", "#111111"],
        "backgroundStyle": "historic_arena_spotlight"
    },
    "entryModes": [
        {"mode": "real_season", "label": "Play The Real Season", "description": "Step into 2000-01 with the historical league intact."},
        {"mode": "historical_draft", "label": "Draft The Era", "description": "Redraft the full 2000-01 player pool into a new fantasy universe."},
        {"mode": "reimagined_season", "label": "Reimagined Season", "description": "Launch a reshuffled 2000-01 and play the alternate branch from opening night."}
    ]
}
```

- [ ] **Step 3: Add a hard fail if the source data does not actually yield a real 2000-01 season**

Keep this guard near the season/game filtering so the build never silently writes empty files:

```python
if not regular_games:
    raise RuntimeError("No 2000-01 regular-season game rows were found in the source dataset.")

if not union_player_ids:
    raise RuntimeError("No 2000-01 player rows were discovered while building the pack.")
```

That guard matters because this pass should ship a real playable pack, not a half-empty placeholder that only looks complete in the catalog.

- [ ] **Step 4: Run the builder once and verify it emits a full pack summary**

Run:

```powershell
python .\build-historical-pack-2001.py
```

Expected:

A JSON summary prints with:

- `"packId": "nba_2001_full_season_v1"`
- `"teams": 29`
- positive integer counts for `players`, `rosterSnapshots`, `scheduleGames`, `playerGameStats`, and `realSeasonStats`
- a non-negative integer count for `zeroGamePlayers`

- [ ] **Step 5: Commit the builder and generated pack assets**

Run:

```powershell
git add `
  build-historical-pack-2001.py `
  historical-packs/nba_2001_full_season_v1
git commit -m "feat: build historical 2000-01 pack"
```

Expected:

```text
The commit succeeds with subject line: feat: build historical 2000-01 pack
```

### Task 3: Promote 2000-01 From Preview To Playable Across The Preset Surfaces

**Files:**
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/catalog.json`
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historic-seasons.html`
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historic-universe.html`
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/rosterbate-season.html`
- Test: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-preset-2001.js`

- [ ] **Step 1: Promote the real catalog entry in `historical-packs/catalog.json`**

Replace the `2000-01` entry so it matches the new real pack:

```json
{
  "packId": "nba_2001_full_season_v1",
  "sport": "nba",
  "seasonLabel": "2000-01 NBA Historic Season",
  "shortLabel": "2000-01",
  "era": "2000s",
  "availability": "playable",
  "statusLabel": "Playable Now",
  "significanceLabel": "Dynasty Spotlight",
  "significanceTone": "dynasty",
  "completenessLabel": "Playable iconic season",
  "completenessPercent": 80,
  "tagline": "Draft a turn-of-the-century superteam from one loaded player pool.",
  "summary": "A first-class 2000-01 historical universe with real season data, a full league player pool, and marquee early-2000s star power.",
  "whyItMatters": "This is the archive lane's turn-of-the-century flagship: a recognizable Shaq-and-Kobe title-defense universe that plays differently from both the 1990s and 2010s packs.",
  "focusTeamName": "Los Angeles Lakers",
  "art": {
    "theme": "dynasty",
    "eyebrow": "Turn-of-Century Dynasty",
    "headline": "Shaq.\nKobe.\nAI.",
    "subline": "An early-2000s spotlight season built on dominant bigs, electric guards, and playoff gravity."
  },
  "plannedModes": [
    "Draft The Era",
    "Sim Season",
    "Reimagined Season",
    "Replay Era Rosters"
  ],
  "previewStars": [
    "Shaquille O'Neal",
    "Kobe Bryant",
    "Allen Iverson"
  ],
  "seasonUrl": "rosterbate-season.html?sport=nba&historical=dev&historicalPackId=nba_2001_full_season_v1",
  "simUrl": "rosterbate-season.html?sport=nba&historical=sim&historicalPackId=nba_2001_full_season_v1",
  "draftUrl": "rosterbate-draft.html?sport=nba&historical=dev&historicalPackId=nba_2001_full_season_v1",
  "reimaginedUrl": "rosterbate-season.html?sport=nba&historical=reimagined&historicalPackId=nba_2001_full_season_v1"
}
```

- [ ] **Step 2: Mirror the same promotion in the `historic-seasons.html` fallback catalog**

Update the embedded `FALLBACK_CATALOG` block so the `2000-01` row is no longer preview-only:

```js
{
  packId: 'nba_2001_full_season_v1',
  sport: 'nba',
  seasonLabel: '2000-01 NBA Historic Season',
  shortLabel: '2000-01',
  era: '2000s',
  availability: 'playable',
  statusLabel: 'Playable Now',
  significanceLabel: 'Dynasty Spotlight',
  significanceTone: 'dynasty',
  completenessLabel: 'Playable iconic season',
  completenessPercent: 80,
  tagline: 'Draft a turn-of-the-century superteam from one loaded player pool.',
  summary: 'A first-class 2000-01 historical universe with real season data, a full league player pool, and marquee early-2000s star power.',
  whyItMatters: 'This is the archive lane\\'s turn-of-the-century flagship: a recognizable Shaq-and-Kobe title-defense universe that plays differently from both the 1990s and 2010s packs.',
  focusTeamName: 'Los Angeles Lakers',
  art: {
    theme: 'dynasty',
    eyebrow: 'Turn-of-Century Dynasty',
    headline: 'Shaq. Kobe. AI.',
    subline: 'An early-2000s spotlight season built on dominant bigs, electric guards, and playoff gravity.'
  },
  plannedModes: ['Draft The Era', 'Sim Season', 'Reimagined Season', 'Replay Era Rosters'],
  previewStars: ["Shaquille O'Neal", 'Kobe Bryant', 'Allen Iverson'],
  seasonUrl: 'rosterbate-season.html?sport=nba&historical=dev&historicalPackId=nba_2001_full_season_v1',
  simUrl: 'rosterbate-season.html?sport=nba&historical=sim&historicalPackId=nba_2001_full_season_v1',
  draftUrl: 'rosterbate-draft.html?sport=nba&historical=dev&historicalPackId=nba_2001_full_season_v1',
  reimaginedUrl: 'rosterbate-season.html?sport=nba&historical=reimagined&historicalPackId=nba_2001_full_season_v1'
}
```

- [ ] **Step 3: Add the same preset to the `historic-universe.html` fallback catalog**

The details page currently falls back to an embedded catalog if the loader fetch fails, so add a `2000-01` entry there too:

```js
{
  packId: 'nba_2001_full_season_v1',
  sport: 'nba',
  seasonLabel: '2000-01 NBA Historic Season',
  shortLabel: '2000-01',
  era: '2000s',
  significanceLabel: 'Dynasty Spotlight',
  significanceTone: 'dynasty',
  tagline: 'Shaq, Kobe, Iverson, and a full turn-of-the-century historical universe.',
  summary: 'A first-class 2000-01 historical season pack with real season data, a full player pool, and early-2000s dynasty energy.',
  whyItMatters: 'This preset gives the archive a widely recognizable turn-of-the-century tentpole that feels distinct from the 1990s and 2010s seasons.',
  focusTeamName: 'Los Angeles Lakers',
  art: {
    theme: 'dynasty',
    eyebrow: 'Turn-of-Century Dynasty',
    headline: 'Shaq. Kobe. AI.',
    subline: 'Dominant bigs, electric guards, and a championship-era universe.'
  }
}
```

- [ ] **Step 4: Add the short-label mapping in `rosterbate-season.html`**

Extend `formatHistoricalPackShortLabel()` with the new pack:

```js
const known = {
  nba_1996_full_season_v1:'1995-96',
  nba_2001_full_season_v1:'2000-01',
  nba_2016_full_season_v1:'2015-16',
  mixed_era_1996_2016_top300_v1:'95-96 x 15-16',
  mixed_era_1996_2016_top100_v1:'95-96 x 15-16'
};
```

- [ ] **Step 5: Run the focused regression and verify it now passes**

Run:

```powershell
node .\tools\test-historical-preset-2001.js
```

Expected:

```text
historical 2000-01 preset test passed
```

- [ ] **Step 6: Commit the catalog and fallback promotion**

Run:

```powershell
git add `
  historical-packs/catalog.json `
  historic-seasons.html `
  historic-universe.html `
  rosterbate-season.html
git commit -m "feat: promote 2000-01 historical preset"
```

Expected:

```text
The commit succeeds with subject line: feat: promote 2000-01 historical preset
```

### Task 4: Run The Historical Regression Sweep And Boot The New Preset

**Files:**
- Test: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-preset-2001.js`
- Test: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-universe-details.js`
- Test: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-drafted-universe-snapshot.js`
- Test: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-universe-slot-storage.js`

- [ ] **Step 1: Run the focused historical regression sweep**

Run:

```powershell
node .\tools\test-historical-preset-2001.js
node .\tools\test-historical-universe-details.js
node .\tools\test-historical-drafted-universe-snapshot.js
node .\tools\test-historical-universe-slot-storage.js
```

Expected:

```text
historical 2000-01 preset test passed
historical universe details test passed
historical drafted-universe snapshot test passed
historical universe slot storage test passed
```

- [ ] **Step 2: Do the manual localhost smoke check**

Open these URLs and verify the new preset is visible and bootable:

```text
http://localhost:8000/historic-seasons.html?sport=nba
http://localhost:8000/rosterbate-season.html?sport=nba&historical=dev&historicalPackId=nba_2001_full_season_v1
http://localhost:8000/rosterbate-season.html?sport=nba&historical=sim&historicalPackId=nba_2001_full_season_v1
```

Manual acceptance criteria:

- `2000-01` appears as a playable preset, not a preview card
- the preset copy and art read as a first-class early-2000s flagship
- the real-season boot opens without pack-id or manifest errors
- the sim boot opens without missing-content errors

- [ ] **Step 3: Commit any final polish revealed by the smoke check**

If the smoke check reveals a copy mismatch, URL typo, or fallback drift, fix it immediately and land a small follow-up:

```powershell
git add historical-packs/catalog.json historic-seasons.html historic-universe.html rosterbate-season.html
git commit -m "fix: polish 2000-01 preset wiring"
```

Expected:

```text
The commit succeeds with subject line: fix: polish 2000-01 preset wiring
```

If the smoke check is clean, skip this step and move straight to implementation handoff.
