# NFL Simulation Setup And 2014 Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Phase 1 of the NFL simulation lane by making the simulation stack sport-aware, authoring the first `2014 NFL` playable pack foundation, and enabling football setup plus draft/bootstrap flow without building the full weekly season engine yet.

**Architecture:** Extend the current NBA-only simulation shell/config/runtime into a registry that can resolve either `2025-26 NBA` or `2014 NFL`, then reuse the shared setup and draft pages with sport-aware copy, roster assumptions, and mode ids. Author the first football historical pack as a real catalog entry with enough curated players to fill a `32 x 13` mixed-era draft, and make post-draft handoff degrade gracefully into the shared season shell until Phase 2 adds the weekly football sim engine.

**Tech Stack:** Vanilla JavaScript, existing browser HTML shell, historical pack JSON bundles, Node-based regression tests in `tools/`, PowerShell, git

---

## File Map

- Modify: `simulation-mode-config.js`
  - Replace the single hard-coded NBA shell with a shell registry keyed by sport and anchor season.
  - Preserve the existing NBA default so current links/tests keep working.

- Modify: `simulation-mode-runtime.js`
  - Make simulation bootstrap state and auto-draft helpers sport-aware.
  - Add NFL mode ids, football roster coverage heuristics, and shell-derived roster sizes/team counts.

- Modify: `rosterbate-simulation-setup.html`
  - Render NFL copy, shell facts, and source-pack filtering from `sport=nfl`.
  - Persist either `nba_mixed_era_single_player_v1` or `nfl_mixed_era_single_player_v1`.

- Modify: `rosterbate-draft.html`
  - Accept football simulation payloads, lock the room to `32` teams and `13` rounds, and finish into the shared season shell query for NFL.

- Modify: `rosterbate-season.html`
  - Add a minimal football simulation fallback banner so completed NFL drafts reopen into a stable shell instead of crashing before Phase 2.

- Modify: `historical-packs/catalog.json`
  - Add the first `2014 NFL` playable historical pack entry.

- Create: `historical-packs/nfl_2014_full_season_v1/manifest.json`
- Create: `historical-packs/nfl_2014_full_season_v1/season.json`
- Create: `historical-packs/nfl_2014_full_season_v1/teams.json`
- Create: `historical-packs/nfl_2014_full_season_v1/players.json`
- Create: `historical-packs/nfl_2014_full_season_v1/roster_snapshots.json`
- Create: `historical-packs/nfl_2014_full_season_v1/schedule.json`
- Create: `historical-packs/nfl_2014_full_season_v1/games.json`
- Create: `historical-packs/nfl_2014_full_season_v1/optional/presentation.json`
- Create: `historical-packs/nfl_2014_full_season_v1/optional/summaries.json`
  - Provide the first football source season with enough draftable players for Phase 1 setup and draft generation.

- Create: `tools/test-historical-preset-nfl-2014.js`
  - Lock the new pack's manifest/catalog/team/player expectations.

- Modify: `tools/test-simulation-mode-config.js`
- Modify: `tools/test-simulation-mode-runtime.js`
- Modify: `tools/test-simulation-setup-page.js`
- Modify: `tools/test-simulation-draft-boot.js`
  - Extend the regression suite from NBA-only assumptions to sport-aware coverage.

## Task 1: Convert Simulation Shell Config Into A Sport-Aware Registry

**Files:**
- Modify: `simulation-mode-config.js`
- Modify: `tools/test-simulation-mode-config.js`
- Test: `tools/test-simulation-mode-config.js`

- [ ] **Step 1: Write the failing config assertions for NFL shell lookup**

Update `tools/test-simulation-mode-config.js` so it expects the config module to serve both the current NBA shell and the new NFL shell:

```js
const assert = require('node:assert/strict');

const {
  getSimulationShell,
  findSimulationTeamByAbbr,
  listSimulationShells
} = require('../simulation-mode-config.js');

assert.equal(typeof listSimulationShells, 'function');

const defaultShell = getSimulationShell();
const nflShell = getSimulationShell({ sport: 'nfl' });
const allShells = listSimulationShells();

assert.equal(defaultShell.anchorSeasonId, 'nba_2025_26');
assert.equal(defaultShell.sport, 'nba');
assert.equal(nflShell.anchorSeasonId, 'nfl_2014');
assert.equal(nflShell.anchorSeasonLabel, '2014 NFL');
assert.equal(nflShell.sport, 'nfl');
assert.equal(nflShell.teams.length, 32);
assert.equal(nflShell.rosterSize, 13);
assert.equal(nflShell.regularSeasonWeeks, 17);
assert.equal(nflShell.playoffFieldPerConference, 6);
assert.ok(Array.isArray(allShells) && allShells.some((shell) => shell.anchorSeasonId === 'nfl_2014'));

const patriots = findSimulationTeamByAbbr('NE', { sport: 'nfl' });
const packers = findSimulationTeamByAbbr('GB', { sport: 'nfl' });

assert.deepStrictEqual(
  { conference: patriots.conference, division: patriots.division },
  { conference: 'AFC', division: 'East' }
);
assert.deepStrictEqual(
  { conference: packers.conference, division: packers.division },
  { conference: 'NFC', division: 'North' }
);

nflShell.teams[0].conference = 'Mutated';

assert.equal(
  getSimulationShell({ sport: 'nfl' }).teams[0].conference,
  'AFC',
  'football shell lookups should return fresh clones'
);
```

- [ ] **Step 2: Run the config test to verify it fails**

Run:

```powershell
node tools/test-simulation-mode-config.js
```

Expected: FAIL with `listSimulationShells is not a function` or an assertion that `nflShell.anchorSeasonId` is still `nba_2025_26`.

- [ ] **Step 3: Implement the shell registry with explicit NBA and NFL entries**

Replace the single `SIMULATION_SHELL` constant in `simulation-mode-config.js` with a registry shape like this:

```js
const NFL_2014_TEAMS = deepFreeze([
  { abbr: 'ARI', name: 'Arizona Cardinals', conference: 'NFC', division: 'West' },
  { abbr: 'ATL', name: 'Atlanta Falcons', conference: 'NFC', division: 'South' },
  { abbr: 'BAL', name: 'Baltimore Ravens', conference: 'AFC', division: 'North' },
  { abbr: 'BUF', name: 'Buffalo Bills', conference: 'AFC', division: 'East' },
  { abbr: 'CAR', name: 'Carolina Panthers', conference: 'NFC', division: 'South' },
  { abbr: 'CHI', name: 'Chicago Bears', conference: 'NFC', division: 'North' },
  { abbr: 'CIN', name: 'Cincinnati Bengals', conference: 'AFC', division: 'North' },
  { abbr: 'CLE', name: 'Cleveland Browns', conference: 'AFC', division: 'North' },
  { abbr: 'DAL', name: 'Dallas Cowboys', conference: 'NFC', division: 'East' },
  { abbr: 'DEN', name: 'Denver Broncos', conference: 'AFC', division: 'West' },
  { abbr: 'DET', name: 'Detroit Lions', conference: 'NFC', division: 'North' },
  { abbr: 'GB', name: 'Green Bay Packers', conference: 'NFC', division: 'North' },
  { abbr: 'HOU', name: 'Houston Texans', conference: 'AFC', division: 'South' },
  { abbr: 'IND', name: 'Indianapolis Colts', conference: 'AFC', division: 'South' },
  { abbr: 'JAX', name: 'Jacksonville Jaguars', conference: 'AFC', division: 'South' },
  { abbr: 'KC', name: 'Kansas City Chiefs', conference: 'AFC', division: 'West' },
  { abbr: 'MIA', name: 'Miami Dolphins', conference: 'AFC', division: 'East' },
  { abbr: 'MIN', name: 'Minnesota Vikings', conference: 'NFC', division: 'North' },
  { abbr: 'NE', name: 'New England Patriots', conference: 'AFC', division: 'East' },
  { abbr: 'NO', name: 'New Orleans Saints', conference: 'NFC', division: 'South' },
  { abbr: 'NYG', name: 'New York Giants', conference: 'NFC', division: 'East' },
  { abbr: 'NYJ', name: 'New York Jets', conference: 'AFC', division: 'East' },
  { abbr: 'OAK', name: 'Oakland Raiders', conference: 'AFC', division: 'West' },
  { abbr: 'PHI', name: 'Philadelphia Eagles', conference: 'NFC', division: 'East' },
  { abbr: 'PIT', name: 'Pittsburgh Steelers', conference: 'AFC', division: 'North' },
  { abbr: 'SD', name: 'San Diego Chargers', conference: 'AFC', division: 'West' },
  { abbr: 'SEA', name: 'Seattle Seahawks', conference: 'NFC', division: 'West' },
  { abbr: 'SF', name: 'San Francisco 49ers', conference: 'NFC', division: 'West' },
  { abbr: 'STL', name: 'St. Louis Rams', conference: 'NFC', division: 'West' },
  { abbr: 'TB', name: 'Tampa Bay Buccaneers', conference: 'NFC', division: 'South' },
  { abbr: 'TEN', name: 'Tennessee Titans', conference: 'AFC', division: 'South' },
  { abbr: 'WAS', name: 'Washington', conference: 'NFC', division: 'East' }
]);

const SIMULATION_SHELLS = deepFreeze({
  nba_2025_26: {
    ...CURRENT_NBA_SHELL,
    sport: 'nba'
  },
  nfl_2014: {
    anchorSeasonId: 'nfl_2014',
    anchorSeasonLabel: '2014 NFL',
    sport: 'nfl',
    regularSeasonStartDate: '2014-09-04',
    regularSeasonEndDate: '2014-12-28',
    playoffsStartDate: '2015-01-03',
    championshipDate: '2015-02-01',
    championshipLabel: 'Super Bowl XLIX',
    regularSeasonWeeks: 17,
    rosterSize: 13,
    playoffFieldPerConference: 6,
    conferences: ['AFC', 'NFC'],
    teams: NFL_2014_TEAMS
  }
});

function normalizeShellSelector(selector){
  if (typeof selector === 'string') {
    return { sport: selector };
  }
  const input = selector && typeof selector === 'object' ? selector : {};
  return {
    sport: String(input.sport || 'nba').trim().toLowerCase(),
    anchorSeasonId: String(input.anchorSeasonId || '').trim().toLowerCase()
  };
}

function getSimulationShell(selector){
  const normalized = normalizeShellSelector(selector);
  const explicitId = normalized.anchorSeasonId;
  if (explicitId && SIMULATION_SHELLS[explicitId]) {
    return clone(SIMULATION_SHELLS[explicitId]);
  }
  if (normalized.sport === 'nfl') {
    return clone(SIMULATION_SHELLS.nfl_2014);
  }
  return clone(SIMULATION_SHELLS.nba_2025_26);
}

function listSimulationShells(){
  return Object.keys(SIMULATION_SHELLS).map((key) => clone(SIMULATION_SHELLS[key]));
}

function findSimulationTeamByAbbr(abbr, selector){
  const key = String(abbr || '').trim().toUpperCase();
  return getSimulationShell(selector).teams.find((team) => team.abbr === key) || null;
}
```

- [ ] **Step 4: Re-run the config test and confirm it passes**

Run:

```powershell
node tools/test-simulation-mode-config.js
```

Expected: `simulation mode config test passed`

- [ ] **Step 5: Commit the config registry task**

```bash
git add simulation-mode-config.js tools/test-simulation-mode-config.js
git commit -m "feat: add nfl simulation shell registry"
```

## Task 2: Make Simulation Runtime And Auto-Draft Sport-Aware

**Files:**
- Modify: `simulation-mode-runtime.js`
- Modify: `tools/test-simulation-mode-runtime.js`
- Test: `tools/test-simulation-mode-runtime.js`

- [ ] **Step 1: Add failing runtime coverage for NFL bootstrap and roster fill**

Extend `tools/test-simulation-mode-runtime.js` with a football bootstrap case and a football auto-draft case:

```js
const nflShell = getSimulationShell({ sport: 'nfl' });
const nflMixedEraContext = {
  mixedEraConfigId: 'nfl_2014_only',
  sourcePackIds: ['nfl_2014_full_season_v1'],
  sourceSeasonLabels: ['2014 NFL'],
  playerPool: [
    ...Array.from({ length: 64 }, (_, index) => ({
      id: `qb-${index + 1}`,
      name: `Quarterback ${index + 1}`,
      pos: 'QB',
      fp: 28,
      mixedEraOverall: 90 - (index % 8)
    })),
    ...Array.from({ length: 96 }, (_, index) => ({
      id: `rb-${index + 1}`,
      name: `Running Back ${index + 1}`,
      pos: 'RB',
      fp: 22,
      mixedEraOverall: 86 - (index % 8)
    })),
    ...Array.from({ length: 128 }, (_, index) => ({
      id: `wr-${index + 1}`,
      name: `Wide Receiver ${index + 1}`,
      pos: 'WR',
      fp: 20,
      mixedEraOverall: 85 - (index % 8)
    })),
    ...Array.from({ length: 48 }, (_, index) => ({
      id: `te-${index + 1}`,
      name: `Tight End ${index + 1}`,
      pos: 'TE',
      fp: 16,
      mixedEraOverall: 80 - (index % 6)
    })),
    ...Array.from({ length: 48 }, (_, index) => ({
      id: `flex-${index + 1}`,
      name: `Flex ${index + 1}`,
      pos: 'FLEX',
      fp: 15,
      mixedEraOverall: 78 - (index % 6)
    })),
    ...Array.from({ length: 48 }, (_, index) => ({
      id: `ol-${index + 1}`,
      name: `Offensive Line ${index + 1}`,
      pos: 'OL',
      fp: 12,
      mixedEraOverall: 79 - (index % 6)
    })),
    ...Array.from({ length: 48 }, (_, index) => ({
      id: `dl-${index + 1}`,
      name: `Defensive Line ${index + 1}`,
      pos: 'DL',
      fp: 14,
      mixedEraOverall: 81 - (index % 6)
    })),
    ...Array.from({ length: 48 }, (_, index) => ({
      id: `lb-${index + 1}`,
      name: `Linebacker ${index + 1}`,
      pos: 'LB',
      fp: 14,
      mixedEraOverall: 80 - (index % 6)
    })),
    ...Array.from({ length: 48 }, (_, index) => ({
      id: `cb-${index + 1}`,
      name: `Cornerback ${index + 1}`,
      pos: 'CB',
      fp: 13,
      mixedEraOverall: 79 - (index % 6)
    })),
    ...Array.from({ length: 48 }, (_, index) => ({
      id: `s-${index + 1}`,
      name: `Safety ${index + 1}`,
      pos: 'S',
      fp: 13,
      mixedEraOverall: 79 - (index % 6)
    })),
    ...Array.from({ length: 32 }, (_, index) => ({
      id: `k-${index + 1}`,
      name: `Kicker ${index + 1}`,
      pos: 'K',
      fp: 9,
      mixedEraOverall: 72 - (index % 4)
    })),
    ...Array.from({ length: 32 }, (_, index) => ({
      id: `dst-${index + 1}`,
      name: `Defense ${index + 1}`,
      pos: 'DST',
      fp: 10,
      mixedEraOverall: 74 - (index % 4)
    }))
  ]
};

const nflBootstrap = buildSimulationUniverseBootstrap({
  shell: nflShell,
  mixedEraContext: nflMixedEraContext,
  controlledTeamAbbr: 'GB',
  draftSlot: 1
});

assert.equal(nflBootstrap.simulationMode, 'nfl_mixed_era_single_player_v1');
assert.equal(nflBootstrap.leagueShell.sport, 'nfl');
assert.equal(nflBootstrap.draftState.teamCount, 32);
assert.equal(nflBootstrap.draftState.rosterSize, 13);
assert.equal(nflBootstrap.seasonState.currentWeek, 1);
assert.equal(nflBootstrap.draftState.controlledTeamAbbr, 'GB');

const nflCompleted = buildCompletedSimulationAutoDraftState({
  shell: nflShell,
  mixedEraContext: nflMixedEraContext,
  controlledTeamAbbr: 'GB'
});

assert.equal(nflCompleted.draftState.rostersByTeam.GB.length, 13);
assert.ok(nflCompleted.draftState.rostersByTeam.GB.some((player) => player.pos === 'QB'));
assert.ok(nflCompleted.draftState.rostersByTeam.GB.some((player) => player.pos === 'OL'));
assert.ok(nflCompleted.draftState.rostersByTeam.GB.some((player) => player.pos === 'DST'));
assert.ok(
  Object.values(nflCompleted.draftState.rostersByTeam).every((roster) => roster.length === 13),
  'every football team should auto-draft to the locked 13-slot roster size'
);
```

- [ ] **Step 2: Run the runtime test to verify it fails**

Run:

```powershell
node tools/test-simulation-mode-runtime.js
```

Expected: FAIL because bootstrap still stamps `nba_mixed_era_single_player_v1`, NFL shell-derived team counts are ignored, or football rosters never satisfy `QB` / `OL` / `DST` coverage.

- [ ] **Step 3: Implement shell-derived mode ids and football roster heuristics**

Add these helpers near the top of `simulation-mode-runtime.js` and update the existing bootstrap / auto-draft helpers to use them:

```js
function getSimulationSport(shell){
  return String(shell?.sport || 'nba').trim().toLowerCase();
}

function getSimulationModeId(shell){
  return getSimulationSport(shell) === 'nfl'
    ? 'nfl_mixed_era_single_player_v1'
    : 'nba_mixed_era_single_player_v1';
}

function getSimulationRosterNeeds(shell){
  if (getSimulationSport(shell) !== 'nfl') {
    return ['PG', 'SG', 'SF', 'PF', 'C'];
  }
  return ['QB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'DST'];
}

function getFootballCoverageBonus(position, roster){
  const counts = (Array.isArray(roster) ? roster : []).reduce((acc, player) => {
    const key = getSimulationPlayerPosition(player);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const required = {
    QB: 1,
    RB: 1,
    WR: 2,
    TE: 1,
    FLEX: 1,
    OL: 1,
    DL: 1,
    LB: 1,
    CB: 1,
    S: 1,
    K: 1,
    DST: 1
  };
  const needed = required[position] || 0;
  const current = counts[position] || 0;
  return current < needed ? 30 - (current * 4) : 0;
}

function getSimulationAutoDraftScore(player, roster, shell){
  const nextRoster = Array.isArray(roster) ? roster : [];
  const position = getSimulationPlayerPosition(player);
  const samePositionCount = nextRoster.reduce((count, entry) => (
    getSimulationPlayerPosition(entry) === position ? count + 1 : count
  ), 0);
  const baseScore = (Number(player?.mixedEraOverall || 0) * 100) + Number(player?.fp || 0);

  if (getSimulationSport(shell) === 'nfl') {
    return baseScore + getFootballCoverageBonus(position, nextRoster) - (samePositionCount * 2);
  }

  const coverageBonus = samePositionCount === 0 ? 6 : 0;
  const duplicatePenalty = samePositionCount * 3;
  return baseScore + coverageBonus - duplicatePenalty;
}
```

Then update the existing writers to call those helpers:

```js
return {
  simulationMode: getSimulationModeId(leagueShell),
  leagueShell: clone(leagueShell),
  // ...
};
```

and:

```js
const score = getSimulationAutoDraftScore(draftablePlayers[index], roster, next.leagueShell);
```

- [ ] **Step 4: Re-run the runtime test and confirm it passes**

Run:

```powershell
node tools/test-simulation-mode-runtime.js
```

Expected: `simulation mode runtime test passed`

- [ ] **Step 5: Commit the runtime task**

```bash
git add simulation-mode-runtime.js tools/test-simulation-mode-runtime.js
git commit -m "feat: add sport-aware simulation runtime bootstrap"
```

## Task 3: Author The First Playable 2014 NFL Historical Pack Foundation

**Files:**
- Modify: `historical-packs/catalog.json`
- Create: `historical-packs/nfl_2014_full_season_v1/manifest.json`
- Create: `historical-packs/nfl_2014_full_season_v1/season.json`
- Create: `historical-packs/nfl_2014_full_season_v1/teams.json`
- Create: `historical-packs/nfl_2014_full_season_v1/players.json`
- Create: `historical-packs/nfl_2014_full_season_v1/roster_snapshots.json`
- Create: `historical-packs/nfl_2014_full_season_v1/schedule.json`
- Create: `historical-packs/nfl_2014_full_season_v1/games.json`
- Create: `historical-packs/nfl_2014_full_season_v1/optional/presentation.json`
- Create: `historical-packs/nfl_2014_full_season_v1/optional/summaries.json`
- Create: `tools/test-historical-preset-nfl-2014.js`
- Test: `tools/test-historical-preset-nfl-2014.js`

- [ ] **Step 1: Write the failing preset test for the NFL pack**

Create `tools/test-historical-preset-nfl-2014.js` with the exact expectations for the first football pack:

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');
const packRoot = path.join(repoRoot, 'historical-packs', 'nfl_2014_full_season_v1');
const catalog = JSON.parse(fs.readFileSync(path.join(repoRoot, 'historical-packs', 'catalog.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(packRoot, 'manifest.json'), 'utf8'));
const season = JSON.parse(fs.readFileSync(path.join(packRoot, 'season.json'), 'utf8'));
const teams = JSON.parse(fs.readFileSync(path.join(packRoot, 'teams.json'), 'utf8'));
const players = JSON.parse(fs.readFileSync(path.join(packRoot, 'players.json'), 'utf8'));

const catalogEntry = catalog.find((entry) => entry.packId === 'nfl_2014_full_season_v1');

assert.ok(catalogEntry, 'catalog should advertise the 2014 NFL pack');
assert.equal(catalogEntry.sport, 'nfl');
assert.equal(catalogEntry.shortLabel, '2014');
assert.match(catalogEntry.seasonLabel, /2014 NFL Historic Season/i);
assert.deepStrictEqual(catalogEntry.plannedModes, ['Draft The Era', 'Sim Season']);

assert.equal(manifest.packId, 'nfl_2014_full_season_v1');
assert.equal(manifest.sport, 'nfl');
assert.equal(manifest.league, 'nfl');
assert.deepStrictEqual(manifest.supportedModes, ['historical_draft', 'single_player_season']);
assert.equal(manifest.defaultEntryMode, 'single_player_season');

assert.equal(season.sport, 'nfl');
assert.equal(season.seasonLabel, '2014 NFL Historic Season');
assert.equal(teams.length, 32);
assert.ok(players.length >= 416, 'pack needs enough players to fill a 32-team x 13-slot sim draft');
assert.ok(players.some((player) => player.pos === 'QB' && /Tom Brady/i.test(player.name)));
assert.ok(players.some((player) => player.pos === 'RB' && /Le'Veon Bell/i.test(player.name)));
assert.ok(players.some((player) => player.pos === 'WR' && /Antonio Brown/i.test(player.name)));
assert.ok(players.some((player) => player.pos === 'DST'));

console.log('historical preset nfl 2014 test passed');
```

- [ ] **Step 2: Run the preset test to verify it fails**

Run:

```powershell
node tools/test-historical-preset-nfl-2014.js
```

Expected: FAIL because the pack directory and catalog entry do not exist yet.

- [ ] **Step 3: Add the NFL catalog entry and manifest scaffolding**

Append a new football entry to `historical-packs/catalog.json` and create `historical-packs/nfl_2014_full_season_v1/manifest.json` with this exact skeleton:

```json
{
  "packId": "nfl_2014_full_season_v1",
  "schemaVersion": 1,
  "canonicalModelVersion": 1,
  "sport": "nfl",
  "league": "nfl",
  "seasonId": "nfl_2014_historic",
  "seasonLabel": "2014 NFL Historic Season",
  "seasonType": "historical_pack",
  "isHistorical": true,
  "era": "2010s",
  "version": 1,
  "status": "concept",
  "sourceProfile": "historical_curated",
  "supportedModes": [
    "historical_draft",
    "single_player_season"
  ],
  "defaultEntryMode": "single_player_season",
  "subtitle": "Draft the era or build a mixed-era football universe.",
  "description": "A 2014 NFL historical season pack with Madden 25-era ratings context, football roster roles, and a full-league player pool for mixed-era simulation setup.",
  "tagline": "Legion of Boom, Brady, Rodgers, and one full-season football sandbox.",
  "contentFiles": {
    "season": "season.json",
    "teams": "teams.json",
    "players": "players.json",
    "rosterSnapshots": "roster_snapshots.json",
    "schedule": "schedule.json",
    "games": "games.json",
    "presentation": "optional/presentation.json",
    "summaries": "optional/summaries.json"
  }
}
```

Use this catalog entry shape so the setup page can render it immediately:

```json
{
  "packId": "nfl_2014_full_season_v1",
  "sport": "nfl",
  "seasonLabel": "2014 NFL Historic Season",
  "shortLabel": "2014",
  "era": "2010s",
  "availability": "playable",
  "statusLabel": "Playable Now",
  "significanceLabel": "Modern Football Anchor",
  "significanceTone": "modern",
  "completenessLabel": "Simulation setup foundation",
  "completenessPercent": 60,
  "tagline": "Build a 2014 football universe from Brady, Rodgers, Watt, and the whole season pool.",
  "summary": "A playable 2014 NFL historical foundation with football rating baselines, historical season context, and a draft-ready player pool for simulation setup.",
  "whyItMatters": "This is the first football anchor season for the archive lane and the foundation for mixed-era NFL simulation leagues.",
  "focusTeamName": "Seattle Seahawks",
  "plannedModes": [
    "Draft The Era",
    "Sim Season"
  ],
  "previewStars": [
    "Tom Brady",
    "Aaron Rodgers",
    "J.J. Watt"
  ],
  "seasonUrl": "rosterbate-season.html?sport=nfl&historical=sim&historicalPackId=nfl_2014_full_season_v1",
  "simUrl": "rosterbate-season.html?sport=nfl&historical=sim&historicalPackId=nfl_2014_full_season_v1",
  "draftUrl": "rosterbate-draft.html?sport=nfl&historical=dev&historicalPackId=nfl_2014_full_season_v1"
}
```

- [ ] **Step 4: Author the pack payload files with football-specific data shape**

Create the structural JSON files using these exact top-level shapes:

```json
{
  "sport": "nfl",
  "seasonId": "nfl_2014_historic",
  "seasonLabel": "2014 NFL Historic Season",
  "shellSeasonId": "nfl_2014",
  "regularSeasonWeeks": 17,
  "playoffFormat": "2014_nfl"
}
```

for `season.json`,

```json
[
  {
    "teamId": "nfl_2014_ne",
    "abbr": "NE",
    "name": "New England Patriots",
    "conference": "AFC",
    "division": "East",
    "wins": 12,
    "losses": 4,
    "pointsFor": 468,
    "pointsAgainst": 313
  }
]
```

for `teams.json`, and player objects shaped like this in `players.json`:

```json
{
  "id": 2014001,
  "historicalPackId": "nfl_2014_full_season_v1",
  "historicalSeasonId": "nfl_2014_historic",
  "historicalTeamId": "nfl_2014_ne",
  "name": "Tom Brady",
  "team": "NE",
  "pos": "QB",
  "gp": 16,
  "fp": 26.4,
  "mixedEraOverall": 97,
  "simulationProfile": {
    "mixedEraRatings": {
      "overall": 97,
      "passing": 96,
      "decisionMaking": 94,
      "athleticism": 72
    }
  },
  "seasonStats": {
    "games": 16,
    "totals": {
      "passYds": 4109,
      "passTd": 33,
      "int": 9,
      "rushYds": 21,
      "rushTd": 0
    },
    "perGame": {
      "passYds": 256.8,
      "passTd": 2.1,
      "int": 0.6,
      "rushYds": 1.3
    }
  }
}
```

Use the same object shape for all football players, then make sure the final data set includes at least:
- `32` quarterbacks
- `32` kickers
- `32` DST entries
- enough offense/defense role players to exceed `416` total draftable records

Set `roster_snapshots.json`, `schedule.json`, and `games.json` to valid JSON arrays even if they are trimmed placeholders for Phase 1:

```json
[]
```

Populate `optional/presentation.json` and `optional/summaries.json` with the same headline/summary structure the NBA packs use so the archive browser can render the football card without special cases.

- [ ] **Step 5: Run the NFL preset test and confirm it passes**

Run:

```powershell
node tools/test-historical-preset-nfl-2014.js
```

Expected: `historical preset nfl 2014 test passed`

- [ ] **Step 6: Commit the pack foundation task**

```bash
git add historical-packs/catalog.json historical-packs/nfl_2014_full_season_v1 tools/test-historical-preset-nfl-2014.js
git commit -m "feat: add 2014 nfl historical pack foundation"
```

## Task 4: Make The Shared Simulation Setup Page Render Correctly For Football

**Files:**
- Modify: `rosterbate-simulation-setup.html`
- Modify: `tools/test-simulation-setup-page.js`
- Test: `tools/test-simulation-setup-page.js`

- [ ] **Step 1: Add failing NFL setup-page assertions**

Extend `tools/test-simulation-setup-page.js` with a football branch so the shared page must render sport-specific shell info and filter the catalog correctly:

```js
const nflLocationState = { href: 'rosterbate-simulation-setup.html?sport=nfl', search: '?sport=nfl' };
const nflCatalog = [
  { packId: 'nfl_2014_full_season_v1', seasonLabel: '2014 NFL', sport: 'nfl' },
  { packId: 'nba_1996_full_season_v1', seasonLabel: '1995-96', sport: 'nba' }
];

const nflContext = {
  console,
  URLSearchParams,
  setTimeout,
  clearTimeout,
  Promise,
  Array,
  Number,
  String,
  Object,
  JSON,
  Math,
  document: {
    getElementById(id){
      if (id === 'simulationSourceSeasonList') return { innerHTML: '', dataset: {} };
      if (id === 'simulationSetupStatus') return { textContent: '' };
      if (id === 'simulationContinueBtn') return { disabled: false };
      if (id === 'simulationAutoDraftBtn') return { disabled: false };
      if (id === 'simulationFranchiseSelect') return { value: 'GB', innerHTML: '', disabled: false };
      if (id === 'simulationDraftSlotSelect') return { value: '1', innerHTML: '', disabled: false };
      throw new Error(`Unknown element requested: ${id}`);
    },
    querySelectorAll(){
      return [];
    }
  }
};

nflContext.window = nflContext;
nflContext.window.location = nflLocationState;
nflContext.window.RosterBateHistoricalPackLoader = {
  loadCatalog(){
    return Promise.resolve(nflCatalog);
  }
};
nflContext.window.RosterBateSimulationModeConfig = {
  getSimulationShell(){
    return {
      sport: 'nfl',
      rosterSize: 13,
      teams: Array.from({ length: 32 }, (_, index) => ({
        abbr: index === 0 ? 'GB' : `T${index + 1}`,
        name: index === 0 ? 'Green Bay Packers' : `Team ${index + 1}`
      }))
    };
  }
};

vm.runInNewContext(inlineScript, nflContext, { filename: 'rosterbate-simulation-setup.inline.nfl.js' });
await Promise.resolve();
await Promise.resolve();

assert.match(setupHtml, /Build The Mixed-Era Player Pool/i);
assert.match(inlineScript, /function getSimulationSport\(\)/);
assert.match(inlineScript, /if \(getSimulationSport\(\) === 'nfl'\)/);
```

Also add a direct string assertion on the HTML for football copy:

```js
assert.match(setupHtml, /2014 NFL shell/i, 'setup page should include football shell copy');
```

- [ ] **Step 2: Run the setup-page test to verify it fails**

Run:

```powershell
node tools/test-simulation-setup-page.js
```

Expected: FAIL because the page is still NBA-branded and the inline script does not branch on `sport=nfl`.

- [ ] **Step 3: Make the setup page branch by sport while keeping one shared HTML file**

Inside `rosterbate-simulation-setup.html`, add small sport-aware helpers near the existing inline setup functions:

```js
function getSimulationSport(){
  return String(new URLSearchParams(window.location.search).get('sport') || 'nba').trim().toLowerCase();
}

function getSimulationShell(){
  return window.RosterBateSimulationModeConfig.getSimulationShell({ sport: getSimulationSport() });
}

function getSimulationModeId(){
  return getSimulationSport() === 'nfl'
    ? 'nfl_mixed_era_single_player_v1'
    : 'nba_mixed_era_single_player_v1';
}

function getSimulationCopy(){
  if (getSimulationSport() === 'nfl') {
    return {
      eyebrow: 'Archive Commission',
      heroTitle: 'Start Simulation League',
      heroBody: 'Choose the historical NFL seasons that feed your mixed-era draft pool, then claim a 2014 franchise before the football season shell takes over.',
      shellChip: '2014 NFL shell',
      rosterChip: '13-slot football roster',
      teamLabel: 'Franchise',
      draftSlotLabel: 'Manual Draft Slot Only'
    };
  }
  return {
    eyebrow: 'Archive Commission',
    heroTitle: 'Start Simulation League',
    heroBody: 'Choose the historical NBA seasons that feed your mixed-era draft pool, then claim a 2025-26 franchise before the season shell takes over.',
    shellChip: '2025-26 NBA shell',
    rosterChip: '10-slot mixed-era roster',
    teamLabel: 'Franchise',
    draftSlotLabel: 'Manual Draft Slot Only'
  };
}
```

Use those helpers in the existing render flow to:
- filter the catalog by `entry.sport === getSimulationSport()`
- populate the franchise select from the sport-specific shell
- stamp `mode: getSimulationModeId()` into the saved setup payload

- [ ] **Step 4: Re-run the setup-page test and confirm it passes**

Run:

```powershell
node tools/test-simulation-setup-page.js
```

Expected: `simulation setup page test passed`

- [ ] **Step 5: Commit the shared setup task**

```bash
git add rosterbate-simulation-setup.html tools/test-simulation-setup-page.js
git commit -m "feat: add nfl simulation setup flow"
```

## Task 5: Support Football Manual Draft, Auto-Draft Handoff, And Graceful Season Reopen

**Files:**
- Modify: `rosterbate-draft.html`
- Modify: `rosterbate-season.html`
- Modify: `tools/test-simulation-draft-boot.js`
- Test: `tools/test-simulation-draft-boot.js`

- [ ] **Step 1: Add failing football draft-boot assertions**

Extend `tools/test-simulation-draft-boot.js` so the draft page accepts the NFL setup payload and routes it into the shared season shell:

```js
assert.match(source, /simulationMode===['"]nfl_mixed_era_single_player_v1['"]/, 'draft page should recognize the NFL simulation mode id');
assert.match(
  source,
  /if\s*\(simulationContext\s*&&\s*simulationLeagueSize!==32\)\s*\{/,
  'football simulation drafts should enforce the locked 32-team shell size'
);
assert.match(
  source,
  /if\s*\(simulationContext\s*&&\s*simulationRosterSize!==13\)\s*\{/,
  'football simulation drafts should enforce the locked 13-slot roster size'
);
assert.match(
  source,
  /rosterbate-season\.html\?sport=nfl&simulation=nfl_mixed_era/,
  'completed football simulation drafts should route into the shared season shell'
);
```

Add one more direct season-shell fallback assertion by reading `rosterbate-season.html`:

```js
const seasonSource = fs.readFileSync(path.join(__dirname, '..', 'rosterbate-season.html'), 'utf8');
assert.match(
  seasonSource,
  /Football simulation season shell is coming next/i,
  'season page should degrade gracefully for nfl simulation saves before Phase 2'
);
```

- [ ] **Step 2: Run the football draft-boot test to verify it fails**

Run:

```powershell
node tools/test-simulation-draft-boot.js
```

Expected: FAIL because the draft page only knows `nba_mixed_era_single_player_v1` and the season page has no football fallback copy.

- [ ] **Step 3: Teach the draft page to honor shell-derived football room locks**

Update the simulation boot helpers in `rosterbate-draft.html` so the locked team count, round count, and redirect target derive from the setup payload instead of the NBA defaults:

```js
function getSimulationLeagueSize(simulationContext){
  return Number(simulationContext?.leagueShell?.teams?.length || simulationContext?.draftState?.teamCount || 0);
}

function getSimulationRosterSize(simulationContext){
  return Number(simulationContext?.leagueShell?.rosterSize || simulationContext?.draftState?.rosterSize || 0);
}

function getSimulationSeasonRedirect(simulationMode){
  if (simulationMode === 'nfl_mixed_era_single_player_v1') {
    return 'rosterbate-season.html?sport=nfl&simulation=nfl_mixed_era';
  }
  return 'rosterbate-season.html?sport=nba&simulation=nba_mixed_era';
}
```

Use those helpers where the current draft page locks the room and where it finishes the save:

```js
const simulationLeagueSize = getSimulationLeagueSize(simulationContext);
const simulationRosterSize = getSimulationRosterSize(simulationContext);

if (simulationContext && simulationLeagueSize !== ls) {
  setSetupError(`This simulation shell is locked to ${simulationLeagueSize} teams.`);
  return;
}

if (simulationContext && simulationRosterSize !== rounds) {
  setSetupError(`This simulation shell is locked to ${simulationRosterSize} rounds.`);
  return;
}

window.location.href = getSimulationSeasonRedirect(simulationMode);
```

- [ ] **Step 4: Add the minimal football season-shell fallback**

In `rosterbate-season.html`, add a small early branch in the simulation boot path so football saves render a stable placeholder instead of falling into NBA-only logic:

```js
function renderFootballSimulationPhaseOnePlaceholder(simulationState){
  const controlledTeam = String(simulationState?.draftState?.controlledTeamAbbr || '').trim().toUpperCase();
  seasonBoard.innerHTML = `
    <section class="season-card sim-phase-one-card">
      <p class="season-kicker">Football Simulation</p>
      <h2>Football simulation season shell is coming next.</h2>
      <p>Your ${controlledTeam || 'selected'} franchise and mixed-era draft state are saved. Phase 2 will add the weekly schedule, standings, playoffs, and Super Bowl flow.</p>
    </section>
  `;
}

if (simulationState?.leagueShell?.sport === 'nfl') {
  renderFootballSimulationPhaseOnePlaceholder(simulationState);
  return;
}
```

Keep this branch deliberately small. The goal is only to avoid a broken handoff until the football weekly engine is built.

- [ ] **Step 5: Re-run the draft-boot test and confirm it passes**

Run:

```powershell
node tools/test-simulation-draft-boot.js
```

Expected: `simulation draft boot test passed`

- [ ] **Step 6: Run the full Phase 1 verification sweep**

Run:

```powershell
node tools/test-simulation-mode-config.js
node tools/test-simulation-mode-runtime.js
node tools/test-historical-preset-nfl-2014.js
node tools/test-simulation-setup-page.js
node tools/test-simulation-draft-boot.js
git diff --check
```

Expected:
- each Node test prints its `... passed` line
- `git diff --check` prints nothing

- [ ] **Step 7: Commit the football draft/bootstrap task**

```bash
git add rosterbate-draft.html rosterbate-season.html tools/test-simulation-draft-boot.js
git commit -m "feat: wire nfl simulation draft handoff"
```

## Scope Guardrails

- Do not add weekly football season simulation in this plan.
- Do not add NFL playoff/Super Bowl resolution in this plan.
- Do not split the setup page into sport-specific HTML files.
- Do keep the new football mode ids, shell metadata, and pack format compatible with later Phase 2 weekly-season work.
