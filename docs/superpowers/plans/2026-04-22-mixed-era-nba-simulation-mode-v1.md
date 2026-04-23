# Mixed-Era NBA Simulation Mode V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a separate single-player NBA simulation lane that uses a fixed `2025-26 NBA` shell, a user-selected mixed-era draft pool, day-by-day season simulation, real play-in/playoff progression, and a championship/trophy outcome.

**Architecture:** Add one new simulation configuration/runtime layer, one dedicated setup page, one dedicated season page, and targeted boot hooks into the current draft and archive surfaces. Reuse the existing historical loaders, mixed-era calibration, and core simulation math, but keep this mode on its own save shape and UI path so weekly-fantasy assumptions do not leak into it.

**Tech Stack:** Static HTML pages with inline browser JavaScript, shared browser/Node helper modules, Node `assert` test scripts in `tools/`, existing historical pack loader and mixed-era runtime utilities.

---

## File Structure

### Create

- `simulation-mode-config.js`
  - owns the fixed `2025-26 NBA` shell: teams, conferences, divisions, season anchor dates, and postseason rules

- `simulation-mode-runtime.js`
  - owns simulation-mode bootstrap, curated draft-pool shaping, local-storage keys, roster mutations, and save-shape helpers

- `rosterbate-simulation-setup.html`
  - owns the new `Start Simulation League` creation flow: season selection, franchise choice, draft slot choice, and handoff into the draft room

- `rosterbate-simulation-season.html`
  - owns the day-by-day simulation experience: standings, game results, lineup management, waivers, trades, injuries, playoffs, and champion state

- `tools/test-simulation-mode-config.js`
  - verifies the fixed NBA shell and helper lookups

- `tools/test-simulation-mode-runtime.js`
  - verifies curated pool sizing, universe bootstrap shape, and save metadata

- `tools/test-simulation-mode-management.js`
  - verifies lineup, waiver, trade, and injury state mutations

- `tools/test-simulation-draft-boot.js`
  - verifies the draft page can boot in simulation mode from saved setup state

- `tools/test-simulation-league-engine.js`
  - verifies schedule generation, daily game simulation, and standings updates

- `tools/test-simulation-postseason.js`
  - verifies play-in resolution, bracket creation, series advancement, and champion persistence

- `tools/test-simulation-setup-page.js`
  - verifies the setup page and main entry CTA

- `tools/test-simulation-season-page.js`
  - verifies the dedicated season page structure and main boot/render hooks

- `tools/test-simulation-universe-details.js`
  - verifies archive/details rendering for saved simulation universes

### Modify

- `index.html`
  - add a visible entry point to `rosterbate-simulation-setup.html`

- `rosterbate-draft.html`
  - add a simulation-mode boot path that reuses the draft room for the `30`-team mixed-era redraft and saves a simulation-universe state on completion

- `simulation-league-engine.js`
  - add generated `82`-game schedule support, day-result conversion to NBA scores, standings mutation, postseason helpers, and champion resolution

- `historic-universe.html`
  - detect saved simulation-mode universes and render shell-aware standings, bracket, and champion/trophy context

## Assumptions Locked For This Plan

- `2025-26 NBA` is the only supported shell in v1
- all `30` real NBA teams participate
- the draft is a `10`-round star-heavy redraft
- each team gets a `10`-player roster at draft completion
- the leftover free-agent pool starts at `60` players
- the user controls one franchise only
- schedule generation targets `82` games per team but does not mirror the literal real-world nightly schedule

## Task 1: Add The Fixed NBA Simulation Shell

**Files:**
- Create: `simulation-mode-config.js`
- Test: `tools/test-simulation-mode-config.js`

- [ ] **Step 1: Write the failing shell-config test**

```js
const assert = require('node:assert/strict');

const {
  getSimulationShell,
  findSimulationTeamByAbbr
} = require('../simulation-mode-config.js');

assert.equal(typeof getSimulationShell, 'function');
assert.equal(typeof findSimulationTeamByAbbr, 'function');

const shell = getSimulationShell();

assert.equal(shell.anchorSeasonId, 'nba_2025_26');
assert.equal(shell.anchorSeasonLabel, '2025-26 NBA');
assert.equal(shell.teams.length, 30);
assert.equal(shell.regularSeasonGamesPerTeam, 82);
assert.deepStrictEqual(shell.playInSeeds, [7, 8, 9, 10]);
assert.equal(shell.finalsStartDate, '2026-06-03');

const lakers = findSimulationTeamByAbbr('LAL');
const magic = findSimulationTeamByAbbr('ORL');

assert.deepStrictEqual(
  { conference: lakers.conference, division: lakers.division },
  { conference: 'West', division: 'Pacific' }
);
assert.deepStrictEqual(
  { conference: magic.conference, division: magic.division },
  { conference: 'East', division: 'Southeast' }
);

console.log('simulation mode config test passed');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tools/test-simulation-mode-config.js`  
Expected: FAIL with `Cannot find module '../simulation-mode-config.js'`

- [ ] **Step 3: Write the minimal shell-config implementation**

```js
(function(root){
  'use strict';

  const SIMULATION_SHELL = Object.freeze({
    anchorSeasonId: 'nba_2025_26',
    anchorSeasonLabel: '2025-26 NBA',
    regularSeasonStartDate: '2025-10-21',
    regularSeasonEndDate: '2026-04-12',
    playInStartDate: '2026-04-14',
    playInEndDate: '2026-04-17',
    playoffsStartDate: '2026-04-18',
    finalsStartDate: '2026-06-03',
    regularSeasonGamesPerTeam: 82,
    rosterSize: 10,
    playInSeeds: [7, 8, 9, 10],
    teams: [
      { abbr: 'ATL', name: 'Atlanta Hawks', conference: 'East', division: 'Southeast' },
      { abbr: 'BOS', name: 'Boston Celtics', conference: 'East', division: 'Atlantic' },
      { abbr: 'BKN', name: 'Brooklyn Nets', conference: 'East', division: 'Atlantic' },
      { abbr: 'CHA', name: 'Charlotte Hornets', conference: 'East', division: 'Southeast' },
      { abbr: 'CHI', name: 'Chicago Bulls', conference: 'East', division: 'Central' },
      { abbr: 'CLE', name: 'Cleveland Cavaliers', conference: 'East', division: 'Central' },
      { abbr: 'DET', name: 'Detroit Pistons', conference: 'East', division: 'Central' },
      { abbr: 'IND', name: 'Indiana Pacers', conference: 'East', division: 'Central' },
      { abbr: 'MIA', name: 'Miami Heat', conference: 'East', division: 'Southeast' },
      { abbr: 'MIL', name: 'Milwaukee Bucks', conference: 'East', division: 'Central' },
      { abbr: 'NYK', name: 'New York Knicks', conference: 'East', division: 'Atlantic' },
      { abbr: 'ORL', name: 'Orlando Magic', conference: 'East', division: 'Southeast' },
      { abbr: 'PHI', name: 'Philadelphia 76ers', conference: 'East', division: 'Atlantic' },
      { abbr: 'TOR', name: 'Toronto Raptors', conference: 'East', division: 'Atlantic' },
      { abbr: 'WAS', name: 'Washington Wizards', conference: 'East', division: 'Southeast' },
      { abbr: 'DAL', name: 'Dallas Mavericks', conference: 'West', division: 'Southwest' },
      { abbr: 'DEN', name: 'Denver Nuggets', conference: 'West', division: 'Northwest' },
      { abbr: 'GSW', name: 'Golden State Warriors', conference: 'West', division: 'Pacific' },
      { abbr: 'HOU', name: 'Houston Rockets', conference: 'West', division: 'Southwest' },
      { abbr: 'LAC', name: 'Los Angeles Clippers', conference: 'West', division: 'Pacific' },
      { abbr: 'LAL', name: 'Los Angeles Lakers', conference: 'West', division: 'Pacific' },
      { abbr: 'MEM', name: 'Memphis Grizzlies', conference: 'West', division: 'Southwest' },
      { abbr: 'MIN', name: 'Minnesota Timberwolves', conference: 'West', division: 'Northwest' },
      { abbr: 'NOP', name: 'New Orleans Pelicans', conference: 'West', division: 'Southwest' },
      { abbr: 'OKC', name: 'Oklahoma City Thunder', conference: 'West', division: 'Northwest' },
      { abbr: 'PHX', name: 'Phoenix Suns', conference: 'West', division: 'Pacific' },
      { abbr: 'POR', name: 'Portland Trail Blazers', conference: 'West', division: 'Northwest' },
      { abbr: 'SAC', name: 'Sacramento Kings', conference: 'West', division: 'Pacific' },
      { abbr: 'SAS', name: 'San Antonio Spurs', conference: 'West', division: 'Southwest' },
      { abbr: 'UTA', name: 'Utah Jazz', conference: 'West', division: 'Northwest' }
    ]
  });

  function clone(value){
    return JSON.parse(JSON.stringify(value));
  }

  function getSimulationShell(){
    return clone(SIMULATION_SHELL);
  }

  function findSimulationTeamByAbbr(abbr){
    const key = String(abbr || '').trim().toUpperCase();
    return getSimulationShell().teams.find((team) => team.abbr === key) || null;
  }

  const api = {
    SIMULATION_SHELL,
    getSimulationShell,
    findSimulationTeamByAbbr
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.RosterBateSimulationModeConfig = api;
})(typeof window !== 'undefined' ? window : globalThis);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node tools/test-simulation-mode-config.js`  
Expected: PASS with `simulation mode config test passed`

- [ ] **Step 5: Commit**

```bash
git add simulation-mode-config.js tools/test-simulation-mode-config.js
git commit -m "feat: add simulation mode shell config"
```

## Task 2: Add Simulation Bootstrap And Curated Pool Helpers

**Files:**
- Create: `simulation-mode-runtime.js`
- Test: `tools/test-simulation-mode-runtime.js`

- [ ] **Step 1: Write the failing runtime test**

```js
const assert = require('node:assert/strict');

const { getSimulationShell } = require('../simulation-mode-config.js');
const {
  buildSimulationPlayerPool,
  buildSimulationUniverseBootstrap
} = require('../simulation-mode-runtime.js');

const shell = getSimulationShell();

const mixedEraContext = {
  mixedEraConfigId: '1987-1993-1996-2016',
  sourcePackIds: [
    'nba_1987_full_season_v1',
    'nba_1993_full_season_v1',
    'nba_1996_full_season_v1',
    'nba_2016_full_season_v1'
  ],
  sourceSeasonLabels: ['1986-87', '1992-93', '1995-96', '2015-16'],
  playerPool: Array.from({ length: 420 }, (_, index) => ({
    id: index + 1,
    name: `Player ${String(index + 1).padStart(3, '0')}`,
    team: 'HIS',
    pos: index % 5 === 0 ? 'PG' : index % 5 === 1 ? 'SG' : index % 5 === 2 ? 'SF' : index % 5 === 3 ? 'PF' : 'C',
    fp: 99 - (index * 0.15),
    mixedEraOverall: 99 - (index * 0.12),
    historicalPackId: index < 105 ? 'nba_1987_full_season_v1' : index < 210 ? 'nba_1993_full_season_v1' : index < 315 ? 'nba_1996_full_season_v1' : 'nba_2016_full_season_v1'
  }))
};

const pool = buildSimulationPlayerPool({ mixedEraContext, shell });

assert.equal(pool.draftPool.length, 300);
assert.equal(pool.freeAgents.length, 60);
assert.equal(pool.poolMeta.rosterSize, 10);
assert.equal(pool.poolMeta.teamCount, 30);
assert.ok(pool.draftPool.slice(0, 30).every((player) => player.simulationTier === 'franchise'));

const bootstrap = buildSimulationUniverseBootstrap({
  shell,
  mixedEraContext,
  controlledTeamAbbr: 'LAL',
  draftSlot: 4
});

assert.equal(bootstrap.simulationMode, 'nba_mixed_era_single_player_v1');
assert.equal(bootstrap.leagueShell.teams.length, 30);
assert.equal(bootstrap.sourceSeasons.sourcePackIds.length, 4);
assert.equal(bootstrap.draftState.controlledTeamAbbr, 'LAL');
assert.equal(bootstrap.draftState.draftSlot, 4);
assert.equal(bootstrap.draftState.draftPool.length, 300);
assert.equal(bootstrap.draftState.freeAgents.length, 60);
assert.equal(bootstrap.seasonState.currentDay, 1);
assert.equal(bootstrap.postseasonState.phase, 'regular_season');

console.log('simulation mode runtime test passed');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tools/test-simulation-mode-runtime.js`  
Expected: FAIL with `Cannot find module '../simulation-mode-runtime.js'`

- [ ] **Step 3: Write the minimal runtime implementation**

```js
(function(root){
  'use strict';

  const STORAGE_KEY = 'rbSimulationModeLocalState';
  const COMPLETED_DRAFT_KEY = 'rbSimulationModeCompletedDraft';

  function clone(value){
    return JSON.parse(JSON.stringify(value));
  }

  function sortPlayers(players){
    return (Array.isArray(players) ? players.slice() : []).sort((a, b) => {
      const overallDiff = Number(b?.mixedEraOverall || 0) - Number(a?.mixedEraOverall || 0);
      if (overallDiff) return overallDiff;
      const fpDiff = Number(b?.fp || 0) - Number(a?.fp || 0);
      if (fpDiff) return fpDiff;
      return String(a?.name || '').localeCompare(String(b?.name || ''));
    });
  }

  function decorateSimulationTier(players){
    return players.map((player, index) => ({
      ...player,
      simulationTier: index < 30 ? 'franchise' : index < 120 ? 'core' : index < 300 ? 'rotation' : 'reserve'
    }));
  }

  function buildSimulationPlayerPool({ mixedEraContext, shell }){
    const rosterSize = Number(shell?.rosterSize || 10);
    const teamCount = Array.isArray(shell?.teams) ? shell.teams.length : 30;
    const draftTarget = rosterSize * teamCount;
    const freeAgentTarget = 60;
    const ranked = decorateSimulationTier(sortPlayers(mixedEraContext?.playerPool || []));
    return {
      draftPool: ranked.slice(0, draftTarget),
      freeAgents: ranked.slice(draftTarget, draftTarget + freeAgentTarget),
      poolMeta: {
        rosterSize,
        teamCount,
        draftTarget,
        freeAgentTarget
      }
    };
  }

  function buildSimulationUniverseBootstrap({
    shell,
    mixedEraContext,
    controlledTeamAbbr,
    draftSlot
  }){
    const pool = buildSimulationPlayerPool({ mixedEraContext, shell });
    return {
      simulationMode: 'nba_mixed_era_single_player_v1',
      leagueShell: clone(shell),
      sourceSeasons: {
        mixedEraConfigId: String(mixedEraContext?.mixedEraConfigId || '').trim(),
        sourcePackIds: clone(mixedEraContext?.sourcePackIds || []),
        sourceSeasonLabels: clone(mixedEraContext?.sourceSeasonLabels || [])
      },
      draftState: {
        controlledTeamAbbr: String(controlledTeamAbbr || '').trim().toUpperCase(),
        draftSlot: Number(draftSlot || 1),
        teamCount: pool.poolMeta.teamCount,
        rosterSize: pool.poolMeta.rosterSize,
        draftPool: clone(pool.draftPool),
        freeAgents: clone(pool.freeAgents),
        rostersByTeam: Object.fromEntries(shell.teams.map((team) => [team.abbr, []]))
      },
      seasonState: {
        currentDay: 1,
        currentWeek: 1,
        scheduleByDay: {},
        completedGameLogs: [],
        standings: shell.teams.map((team, index) => ({
          teamIdx: index,
          teamAbbr: team.abbr,
          conference: team.conference,
          division: team.division,
          w: 0,
          l: 0,
          pf: 0,
          pa: 0
        })),
        activityLog: []
      },
      postseasonState: {
        phase: 'regular_season',
        playIn: null,
        bracket: null,
        champion: null
      }
    };
  }

  const api = {
    STORAGE_KEY,
    COMPLETED_DRAFT_KEY,
    buildSimulationPlayerPool,
    buildSimulationUniverseBootstrap
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.RosterBateSimulationModeRuntime = api;
})(typeof window !== 'undefined' ? window : globalThis);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node tools/test-simulation-mode-runtime.js`  
Expected: PASS with `simulation mode runtime test passed`

- [ ] **Step 5: Commit**

```bash
git add simulation-mode-runtime.js tools/test-simulation-mode-runtime.js
git commit -m "feat: add simulation universe bootstrap runtime"
```

## Task 3: Add The Dedicated Simulation Setup Entry

**Files:**
- Create: `rosterbate-simulation-setup.html`
- Modify: `index.html`
- Test: `tools/test-simulation-setup-page.js`

- [ ] **Step 1: Write the failing setup-page test**

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const setupHtml = fs.readFileSync(path.join(__dirname, '..', 'rosterbate-simulation-setup.html'), 'utf8');

assert.match(indexHtml, /Start Simulation League/, 'index should link to the simulation setup flow');
assert.match(setupHtml, /id="simulationSourceSeasonList"/, 'setup page needs a season multi-select list');
assert.match(setupHtml, /id="simulationFranchiseSelect"/, 'setup page needs a franchise selector');
assert.match(setupHtml, /id="simulationDraftSlotSelect"/, 'setup page needs a draft-slot selector');
assert.match(setupHtml, /function enterSimulationDraft\(\)/, 'setup page needs a draft handoff function');
assert.match(setupHtml, /rbSimulationModeLocalState/, 'setup page should save a simulation setup payload');

console.log('simulation setup page test passed');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tools/test-simulation-setup-page.js`  
Expected: FAIL with `ENOENT: no such file or directory, open '...\\rosterbate-simulation-setup.html'`

- [ ] **Step 3: Write the setup page and entry CTA**

```html
<!-- index.html -->
<a class="hero-cta secondary" href="rosterbate-simulation-setup.html?sport=nba">Start Simulation League</a>
```

```html
<!-- rosterbate-simulation-setup.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>RosterBate Simulation Setup</title>
  <script src="historical-pack-loader.js"></script>
  <script src="mixed-era-runtime.js"></script>
  <script src="simulation-mode-config.js"></script>
  <script src="simulation-mode-runtime.js"></script>
</head>
<body>
  <section>
    <h1>Start Simulation League</h1>
    <div id="simulationSourceSeasonList"></div>
    <select id="simulationFranchiseSelect"></select>
    <select id="simulationDraftSlotSelect"></select>
    <button id="simulationContinueBtn" onclick="enterSimulationDraft()">Enter Draft</button>
  </section>
  <script>
    const SIMULATION_SETUP_STORAGE_KEY = 'rbSimulationModeLocalState';

    async function bootSimulationSetup(){
      const shell = window.RosterBateSimulationModeConfig.getSimulationShell();
      const catalog = await window.RosterBateHistoricalPackLoader.loadCatalog();
      const nbaSeasons = catalog.filter((entry) => String(entry?.sport || 'nba') === 'nba' && String(entry?.syntheticType || '') !== 'mixed_era');
      document.getElementById('simulationSourceSeasonList').innerHTML = nbaSeasons.map((entry) => (
        `<label><input type="checkbox" value="${entry.packId}"> ${entry.seasonLabel}</label>`
      )).join('');
      document.getElementById('simulationFranchiseSelect').innerHTML = shell.teams.map((team) => (
        `<option value="${team.abbr}">${team.name}</option>`
      )).join('');
      document.getElementById('simulationDraftSlotSelect').innerHTML = Array.from({ length: shell.teams.length }, (_, index) => (
        `<option value="${index + 1}">Pick ${index + 1}</option>`
      )).join('');
    }

    function enterSimulationDraft(){
      const selectedPackIds = Array.from(document.querySelectorAll('#simulationSourceSeasonList input:checked')).map((node) => node.value);
      const payload = {
        mode: 'nba_mixed_era_single_player_v1',
        sourcePackIds: selectedPackIds,
        controlledTeamAbbr: document.getElementById('simulationFranchiseSelect').value,
        draftSlot: Number(document.getElementById('simulationDraftSlotSelect').value || 1)
      };
      localStorage.setItem(SIMULATION_SETUP_STORAGE_KEY, JSON.stringify(payload));
      window.location.href = 'rosterbate-draft.html?simulation=nba_mixed_era';
    }

    bootSimulationSetup();
  </script>
</body>
</html>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node tools/test-simulation-setup-page.js`  
Expected: PASS with `simulation setup page test passed`

- [ ] **Step 5: Commit**

```bash
git add index.html rosterbate-simulation-setup.html tools/test-simulation-setup-page.js
git commit -m "feat: add simulation mode setup flow"
```

## Task 4: Boot The Draft Room In Simulation Mode

**Files:**
- Modify: `rosterbate-draft.html`
- Test: `tools/test-simulation-draft-boot.js`

- [ ] **Step 1: Write the failing draft-boot test**

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'rosterbate-draft.html'), 'utf8');

assert.match(source, /RB_SIMULATION_MODE_LOCAL_STATE_KEY/, 'draft page should define a simulation setup storage key');
assert.match(source, /function shouldBootSimulationModeDraft\(\)/, 'draft page needs a simulation boot predicate');
assert.match(source, /function buildSimulationDraftContextFromState\(/, 'draft page needs a simulation context builder');
assert.match(source, /simulationMode===['"]nba_mixed_era_single_player_v1['"]/, 'draft page should stamp simulation mode onto the finished save');
assert.match(source, /rosterbate-simulation-season\.html/, 'draft completion should route to the dedicated simulation season page');

console.log('simulation draft boot test passed');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tools/test-simulation-draft-boot.js`  
Expected: FAIL with `draft page should define a simulation setup storage key`

- [ ] **Step 3: Add the simulation draft boot branch**

```js
// rosterbate-draft.html
const RB_SIMULATION_MODE_LOCAL_STATE_KEY = 'rbSimulationModeLocalState';
const RB_SIMULATION_MODE_COMPLETED_DRAFT_KEY = 'rbSimulationModeCompletedDraft';

function shouldBootSimulationModeDraft(){
  try{
    const params = new URLSearchParams(window.location.search || '');
    return String(params.get('simulation') || '').trim().toLowerCase() === 'nba_mixed_era';
  }catch(e){
    return false;
  }
}

function readSimulationModeLocalState(){
  try{
    return JSON.parse(localStorage.getItem(RB_SIMULATION_MODE_LOCAL_STATE_KEY) || 'null');
  }catch(e){
    return null;
  }
}

async function buildSimulationDraftContextFromState(){
  const setupState = readSimulationModeLocalState();
  const shell = window.RosterBateSimulationModeConfig.getSimulationShell();
  const bundles = await Promise.all(
    (setupState?.sourcePackIds || []).map((packId) => window.RosterBateHistoricalPackLoader.loadPackById(packId))
  );
  const mixedEraContext = window.RosterBateMixedEraRuntime.buildMixedEraDraftContextFromBundles({
    config: {
      mixedEraConfigId: 'simulation_custom_mix',
      sport: 'nba',
      seasonLabel: 'Simulation Mode Mixed Era Draft',
      sourcePackIds: setupState.sourcePackIds,
      topPlayersPerPack: 120
    },
    bundles,
    requestedSport: 'nba',
    buildPlayerSimulationProfile: window.RosterBateSimulationEngine.buildPlayerSimulationProfile
  });
  const bootstrap = window.RosterBateSimulationModeRuntime.buildSimulationUniverseBootstrap({
    shell,
    mixedEraContext: {
      ...mixedEraContext,
      sourceSeasonLabels: bundles.map((bundle) => bundle?.season?.seasonLabel || bundle?.manifest?.seasonLabel).filter(Boolean)
    },
    controlledTeamAbbr: setupState.controlledTeamAbbr,
    draftSlot: setupState.draftSlot
  });
  return {
    bootstrap,
    draftPool: bootstrap.draftState.draftPool,
    teams: shell.teams.map((team) => team.name),
    teamCount: shell.teams.length,
    myPos: Math.max(0, Number(setupState.draftSlot || 1) - 1)
  };
}

function completeSimulationModeDraft(finalState){
  const payload = {
    ...finalState,
    simulationMode: 'nba_mixed_era_single_player_v1'
  };
  localStorage.setItem(RB_SIMULATION_MODE_COMPLETED_DRAFT_KEY, JSON.stringify(payload));
  window.location.href = 'rosterbate-simulation-season.html?simulation=nba_mixed_era';
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node tools/test-simulation-draft-boot.js`  
Expected: PASS with `simulation draft boot test passed`

- [ ] **Step 5: Commit**

```bash
git add rosterbate-draft.html tools/test-simulation-draft-boot.js
git commit -m "feat: boot simulation drafts from setup state"
```

## Task 5: Add Simulation Management Mutations

**Files:**
- Modify: `simulation-mode-runtime.js`
- Test: `tools/test-simulation-mode-management.js`

- [ ] **Step 1: Write the failing management test**

```js
const assert = require('node:assert/strict');

const {
  setSimulationLineup,
  claimSimulationFreeAgent,
  applySimulationTrade,
  applySimulationInjuryDesignations
} = require('../simulation-mode-runtime.js');

const baseState = {
  draftState: {
    rostersByTeam: {
      LAL: [
        { id: 1, name: 'Michael Jordan', pos: 'SG' },
        { id: 2, name: 'Stephen Curry', pos: 'PG' },
        { id: 3, name: 'Kevin Garnett', pos: 'PF' }
      ],
      BOS: [
        { id: 4, name: 'Larry Bird', pos: 'SF' },
        { id: 5, name: 'Kevin McHale', pos: 'PF' }
      ],
      FA: []
    },
    freeAgents: [
      { id: 99, name: 'Ray Allen', pos: 'SG' }
    ]
  },
  seasonState: {
    lineupIdsByTeam: { LAL: [1, 2, 3], BOS: [4, 5] },
    activityLog: []
  }
};

const lineupState = setSimulationLineup(baseState, 'LAL', [2, 1, 3]);
assert.deepStrictEqual(lineupState.seasonState.lineupIdsByTeam.LAL, [2, 1, 3]);

const waiverState = claimSimulationFreeAgent(baseState, {
  teamAbbr: 'LAL',
  addPlayerId: 99,
  dropPlayerId: 3
});
assert.ok(waiverState.draftState.rostersByTeam.LAL.some((player) => player.id === 99));
assert.ok(waiverState.draftState.freeAgents.some((player) => player.id === 3));

const tradeState = applySimulationTrade(baseState, {
  fromTeamAbbr: 'LAL',
  toTeamAbbr: 'BOS',
  outgoingPlayerIds: [1],
  incomingPlayerIds: [4]
});
assert.ok(tradeState.draftState.rostersByTeam.LAL.some((player) => player.id === 4));
assert.ok(tradeState.draftState.rostersByTeam.BOS.some((player) => player.id === 1));

const injuryState = applySimulationInjuryDesignations(baseState, [
  { teamAbbr: 'LAL', playerId: 2, designation: 'OUT' }
]);
assert.equal(
  injuryState.draftState.rostersByTeam.LAL.find((player) => player.id === 2).designation,
  'OUT'
);

console.log('simulation mode management test passed');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tools/test-simulation-mode-management.js`  
Expected: FAIL with `setSimulationLineup is not a function`

- [ ] **Step 3: Add the mutation helpers**

```js
// simulation-mode-runtime.js
function clone(value){
  return JSON.parse(JSON.stringify(value));
}

function setSimulationLineup(state, teamAbbr, lineupIds){
  const next = clone(state);
  const key = String(teamAbbr || '').trim().toUpperCase();
  next.seasonState.lineupIdsByTeam = next.seasonState.lineupIdsByTeam || {};
  next.seasonState.lineupIdsByTeam[key] = (Array.isArray(lineupIds) ? lineupIds : []).map((id) => Number(id));
  next.seasonState.activityLog.unshift({
    type: 'lineup',
    teamAbbr: key,
    title: `${key} updated its lineup`,
    ts: Date.now()
  });
  return next;
}

function claimSimulationFreeAgent(state, move){
  const next = clone(state);
  const teamAbbr = String(move?.teamAbbr || '').trim().toUpperCase();
  const addId = Number(move?.addPlayerId);
  const dropId = Number(move?.dropPlayerId);
  const addPlayer = next.draftState.freeAgents.find((player) => Number(player.id) === addId);
  const roster = next.draftState.rostersByTeam[teamAbbr] || [];
  next.draftState.rostersByTeam[teamAbbr] = roster.filter((player) => Number(player.id) !== dropId);
  const droppedPlayer = roster.find((player) => Number(player.id) === dropId);
  if (addPlayer) next.draftState.rostersByTeam[teamAbbr].push(addPlayer);
  if (droppedPlayer) next.draftState.freeAgents.push(droppedPlayer);
  next.draftState.freeAgents = next.draftState.freeAgents.filter((player) => Number(player.id) !== addId);
  next.seasonState.activityLog.unshift({
    type: 'waiver',
    teamAbbr,
    title: `${teamAbbr} added ${addPlayer?.name || 'player'}`,
    ts: Date.now()
  });
  return next;
}

function applySimulationTrade(state, trade){
  const next = clone(state);
  const fromTeamAbbr = String(trade?.fromTeamAbbr || '').trim().toUpperCase();
  const toTeamAbbr = String(trade?.toTeamAbbr || '').trim().toUpperCase();
  const outgoingIds = new Set((trade?.outgoingPlayerIds || []).map(Number));
  const incomingIds = new Set((trade?.incomingPlayerIds || []).map(Number));
  const fromRoster = next.draftState.rostersByTeam[fromTeamAbbr] || [];
  const toRoster = next.draftState.rostersByTeam[toTeamAbbr] || [];
  const outgoing = fromRoster.filter((player) => outgoingIds.has(Number(player.id)));
  const incoming = toRoster.filter((player) => incomingIds.has(Number(player.id)));
  next.draftState.rostersByTeam[fromTeamAbbr] = fromRoster.filter((player) => !outgoingIds.has(Number(player.id))).concat(incoming);
  next.draftState.rostersByTeam[toTeamAbbr] = toRoster.filter((player) => !incomingIds.has(Number(player.id))).concat(outgoing);
  next.seasonState.activityLog.unshift({
    type: 'trade',
    title: `${fromTeamAbbr} traded with ${toTeamAbbr}`,
    ts: Date.now()
  });
  return next;
}

function applySimulationInjuryDesignations(state, injuries){
  const next = clone(state);
  (Array.isArray(injuries) ? injuries : []).forEach((injury) => {
    const teamAbbr = String(injury?.teamAbbr || '').trim().toUpperCase();
    const roster = next.draftState.rostersByTeam[teamAbbr] || [];
    const player = roster.find((entry) => Number(entry.id) === Number(injury?.playerId));
    if (player) player.designation = String(injury?.designation || 'ACTIVE').trim().toUpperCase();
  });
  return next;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node tools/test-simulation-mode-management.js`  
Expected: PASS with `simulation mode management test passed`

- [ ] **Step 5: Commit**

```bash
git add simulation-mode-runtime.js tools/test-simulation-mode-management.js
git commit -m "feat: add simulation mode roster management helpers"
```

## Task 6: Add Regular-Season Schedule And Daily Game Resolution

**Files:**
- Modify: `simulation-league-engine.js`
- Test: `tools/test-simulation-league-engine.js`

- [ ] **Step 1: Write the failing regular-season engine test**

```js
const assert = require('node:assert/strict');

const { getSimulationShell } = require('../simulation-mode-config.js');
const {
  buildSimulationSeasonSchedule,
  simulateSimulationGameDay,
  applySimulationDayResults
} = require('../simulation-league-engine.js');

const shell = getSimulationShell();

const schedule = buildSimulationSeasonSchedule(shell);
assert.equal(schedule.byDay[1].length, 15);
assert.equal(schedule.teamGameCounts.LAL, 82);
assert.equal(schedule.teamGameCounts.BOS, 82);

const roster = Array.from({ length: 10 }, (_, index) => ({
  id: index + 1,
  name: `Starter ${index + 1}`,
  team: 'SIM',
  pos: index < 2 ? 'G' : index < 4 ? 'F' : 'C',
  fp: 55 - index,
  mixedEraOverall: 95 - index
}));

const state = {
  seasonId: 'sim-season-1',
  currentDay: 1,
  currentWeek: 1,
  teams: shell.teams.map((team) => team.name),
  teamMeta: shell.teams,
  allRosters: shell.teams.map(() => roster.map((player, idx) => ({ ...player, id: player.id + idx }))),
  standings: shell.teams.map((team, index) => ({
    teamIdx: index,
    teamAbbr: team.abbr,
    conference: team.conference,
    division: team.division,
    w: 0,
    l: 0,
    pf: 0,
    pa: 0
  }))
};

const dayResult = simulateSimulationGameDay({
  state,
  schedule,
  day: 1,
  lineupIdsByTeam: Object.fromEntries(shell.teams.map((team) => [team.abbr, []]))
});

assert.equal(dayResult.gameLogs.length, 15);
assert.ok(dayResult.gameLogs.every((game) => game.homeScore >= 70 && game.awayScore >= 70));

const updated = applySimulationDayResults(state, dayResult);
assert.equal(updated.currentDay, 2);
assert.equal(updated.completedGameLogs.length, 15);
assert.equal(
  updated.standings.reduce((sum, row) => sum + Number(row.w || 0) + Number(row.l || 0), 0),
  30
);

console.log('simulation league engine test passed');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tools/test-simulation-league-engine.js`  
Expected: FAIL with `buildSimulationSeasonSchedule is not a function`

- [ ] **Step 3: Add schedule generation and day-resolution helpers**

```js
// simulation-league-engine.js
function buildSimulationSeasonSchedule(shell){
  const teams = Array.isArray(shell?.teams) ? shell.teams : [];
  const byDay = {};
  const teamGameCounts = Object.fromEntries(teams.map((team) => [team.abbr, 0]));
  let day = 1;

  while (Object.values(teamGameCounts).some((count) => count < Number(shell?.regularSeasonGamesPerTeam || 82))) {
    const today = [];
    for (let index = 0; index < teams.length; index += 2) {
      const home = teams[index];
      const away = teams[(index + day) % teams.length];
      if (!home || !away || home.abbr === away.abbr) continue;
      if (teamGameCounts[home.abbr] >= 82 || teamGameCounts[away.abbr] >= 82) continue;
      today.push({ homeAbbr: home.abbr, awayAbbr: away.abbr });
      teamGameCounts[home.abbr] += 1;
      teamGameCounts[away.abbr] += 1;
    }
    if (today.length) byDay[day] = today;
    day += 1;
  }

  return { byDay, teamGameCounts };
}

function convertFantasyTotalToNbaScore(total){
  return Math.max(70, Math.round(82 + (Number(total || 0) * 0.72)));
}

function simulateSimulationGameDay(options){
  const teamMeta = Array.isArray(options?.state?.teamMeta) ? options.state.teamMeta : [];
  const lineupMap = options?.lineupIdsByTeam && !Array.isArray(options.lineupIdsByTeam)
    ? options.lineupIdsByTeam
    : {};
  const lowLevel = simulateLeagueDay({
    state: options.state,
    matchups: (options.schedule?.byDay?.[Number(options.day)] || []).map((matchup) => ({
      home: teamMeta.findIndex((team) => team.abbr === matchup.homeAbbr),
      away: teamMeta.findIndex((team) => team.abbr === matchup.awayAbbr)
    })),
    lineupIdsByTeam: teamMeta.map((team) => lineupMap[team.abbr] || []),
    day: options.day,
    week: options.state.currentWeek
  });

  return {
    ...lowLevel,
    gameLogs: lowLevel.gameLogs.map((game) => ({
      ...game,
      homeScore: convertFantasyTotalToNbaScore(game.homeTotal),
      awayScore: convertFantasyTotalToNbaScore(game.awayTotal),
      winner: game.homeTotal === game.awayTotal ? 'home' : (game.homeTotal > game.awayTotal ? 'home' : 'away')
    }))
  };
}

function applySimulationDayResults(state, dayResult){
  const next = JSON.parse(JSON.stringify(state));
  next.completedGameLogs = (next.completedGameLogs || []).concat(dayResult.gameLogs);
  dayResult.gameLogs.forEach((game) => {
    const home = next.standings.find((row) => Number(row.teamIdx) === Number(game.home));
    const away = next.standings.find((row) => Number(row.teamIdx) === Number(game.away));
    if (!home || !away) return;
    home.pf += game.homeScore;
    home.pa += game.awayScore;
    away.pf += game.awayScore;
    away.pa += game.homeScore;
    if (game.homeScore >= game.awayScore) {
      home.w += 1;
      away.l += 1;
    } else {
      away.w += 1;
      home.l += 1;
    }
  });
  next.currentDay = Number(next.currentDay || 1) + 1;
  next.currentWeek = Math.max(1, Math.ceil(next.currentDay / 7));
  return next;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node tools/test-simulation-league-engine.js`  
Expected: PASS with `simulation league engine test passed`

- [ ] **Step 5: Commit**

```bash
git add simulation-league-engine.js tools/test-simulation-league-engine.js
git commit -m "feat: add regular season simulation engine"
```

## Task 7: Add Play-In, Playoff, And Champion Resolution

**Files:**
- Modify: `simulation-league-engine.js`
- Test: `tools/test-simulation-postseason.js`

- [ ] **Step 1: Write the failing postseason test**

```js
const assert = require('node:assert/strict');

const {
  buildSimulationPlayIn,
  resolveSimulationPlayIn,
  buildSimulationPlayoffBracket,
  advanceSimulationSeries,
  finalizeSimulationChampion
} = require('../simulation-league-engine.js');

const standings = Array.from({ length: 15 }, (_, index) => ({
  seed: index + 1,
  teamAbbr: `E${index + 1}`,
  conference: 'East',
  w: 60 - index,
  l: 22 + index
}));

const playIn = buildSimulationPlayIn(standings);
assert.deepStrictEqual(playIn.sevenEight.map((entry) => entry.teamAbbr), ['E7', 'E8']);
assert.deepStrictEqual(playIn.nineTen.map((entry) => entry.teamAbbr), ['E9', 'E10']);

const seededField = resolveSimulationPlayIn(playIn, {
  sevenEightWinner: 'E7',
  nineTenWinner: 'E9',
  finalWinner: 'E8'
});
assert.deepStrictEqual(seededField.map((entry) => entry.teamAbbr), ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8']);

const bracket = buildSimulationPlayoffBracket({
  east: seededField,
  west: seededField.map((entry) => ({ ...entry, teamAbbr: entry.teamAbbr.replace('E', 'W'), conference: 'West' }))
});
assert.equal(bracket.east.firstRound.length, 4);
assert.equal(bracket.west.firstRound.length, 4);

const advancedSeries = advanceSimulationSeries(bracket.east.firstRound[0], {
  winner: bracket.east.firstRound[0].higherSeed.teamAbbr,
  games: 5
});
assert.equal(advancedSeries.winnerTeamAbbr, 'E1');
assert.equal(advancedSeries.games, 5);

const champion = finalizeSimulationChampion({
  finals: {
    higherSeed: { teamAbbr: 'E1', seed: 1 },
    lowerSeed: { teamAbbr: 'W1', seed: 1 },
    winnerTeamAbbr: 'E1',
    games: 6
  }
});
assert.deepStrictEqual(champion, {
  championTeamAbbr: 'E1',
  runnerUpTeamAbbr: 'W1',
  finalsGames: 6
});

console.log('simulation postseason test passed');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tools/test-simulation-postseason.js`  
Expected: FAIL with `buildSimulationPlayIn is not a function`

- [ ] **Step 3: Add postseason helpers**

```js
// simulation-league-engine.js
function buildSimulationPlayIn(conferenceStandings){
  const ordered = conferenceStandings.slice().sort((a, b) => Number(a.seed || 99) - Number(b.seed || 99));
  return {
    topSix: ordered.filter((entry) => Number(entry.seed) >= 1 && Number(entry.seed) <= 6),
    sevenEight: ordered.filter((entry) => Number(entry.seed) === 7 || Number(entry.seed) === 8),
    nineTen: ordered.filter((entry) => Number(entry.seed) === 9 || Number(entry.seed) === 10)
  };
}

function resolveSimulationPlayIn(playIn, results){
  const topSix = []
    .concat(playIn?.topSix || [])
    .filter(Boolean);
  const sevenSeed = (playIn.sevenEight || []).find((entry) => entry.teamAbbr === results.sevenEightWinner);
  const nineTenWinner = (playIn.nineTen || []).find((entry) => entry.teamAbbr === results.nineTenWinner);
  const sevenEightLoser = (playIn.sevenEight || []).find((entry) => entry.teamAbbr !== results.sevenEightWinner);
  const eightSeedCandidates = [sevenEightLoser, nineTenWinner].filter(Boolean);
  const eightSeed = eightSeedCandidates.find((entry) => entry.teamAbbr === results.finalWinner);
  return topSix.concat([sevenSeed, eightSeed]).filter(Boolean);
}

function buildSimulationPlayoffBracket({ east, west }){
  function buildConferenceRound(field){
    return [
      { higherSeed: field[0], lowerSeed: field[7] },
      { higherSeed: field[1], lowerSeed: field[6] },
      { higherSeed: field[2], lowerSeed: field[5] },
      { higherSeed: field[3], lowerSeed: field[4] }
    ];
  }
  return {
    east: { firstRound: buildConferenceRound(east) },
    west: { firstRound: buildConferenceRound(west) },
    finals: null
  };
}

function advanceSimulationSeries(series, outcome){
  return {
    ...series,
    winnerTeamAbbr: String(outcome?.winner || '').trim(),
    games: Number(outcome?.games || 4)
  };
}

function finalizeSimulationChampion(state){
  return {
    championTeamAbbr: state?.finals?.winnerTeamAbbr || null,
    runnerUpTeamAbbr: state?.finals?.higherSeed?.teamAbbr === state?.finals?.winnerTeamAbbr
      ? state?.finals?.lowerSeed?.teamAbbr
      : state?.finals?.higherSeed?.teamAbbr,
    finalsGames: Number(state?.finals?.games || 0)
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node tools/test-simulation-postseason.js`  
Expected: PASS with `simulation postseason test passed`

- [ ] **Step 5: Commit**

```bash
git add simulation-league-engine.js tools/test-simulation-postseason.js
git commit -m "feat: add simulation postseason engine"
```

## Task 8: Build The Dedicated Simulation Season Surface

**Files:**
- Create: `rosterbate-simulation-season.html`
- Modify: `simulation-mode-runtime.js`
- Test: `tools/test-simulation-season-page.js`

- [ ] **Step 1: Write the failing season-page test**

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'rosterbate-simulation-season.html'), 'utf8');

assert.match(html, /id="simulationSeasonDate"/, 'season page needs a season-date label');
assert.match(html, /id="simulationStandingsTable"/, 'season page needs a standings table');
assert.match(html, /id="simulationGameResults"/, 'season page needs a daily results panel');
assert.match(html, /id="simulationPlayoffBracket"/, 'season page needs a playoff bracket panel');
assert.match(html, /id="simulationChampionBanner"/, 'season page needs a champion banner');
assert.match(html, /function bootSimulationSeason\(\)/, 'season page needs a boot function');
assert.match(html, /function simulateNextSimulationDay\(\)/, 'season page needs a next-day action');
assert.match(html, /function renderSimulationDashboard\(/, 'season page needs a render function');

console.log('simulation season page test passed');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tools/test-simulation-season-page.js`  
Expected: FAIL with `ENOENT: no such file or directory, open '...\\rosterbate-simulation-season.html'`

- [ ] **Step 3: Build the season page and wire it to runtime/engine helpers**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>RosterBate Simulation Season</title>
  <script src="simulation-mode-config.js"></script>
  <script src="simulation-mode-runtime.js"></script>
  <script src="simulation-league-engine.js"></script>
</head>
<body>
  <header>
    <h1 id="simulationLeagueTitle">Simulation League</h1>
    <div id="simulationSeasonDate"></div>
    <button onclick="simulateNextSimulationDay()">Sim Day</button>
  </header>
  <main>
    <section id="simulationStandingsTable"></section>
    <section id="simulationGameResults"></section>
    <section id="simulationRosterPanel"></section>
    <section id="simulationWaiverPanel"></section>
    <section id="simulationTradePanel"></section>
    <section id="simulationPlayoffBracket"></section>
    <section id="simulationChampionBanner"></section>
  </main>
  <script>
    let SIM_STATE = null;
    let SIM_SCHEDULE = null;

    function readCompletedSimulationDraft(){
      return JSON.parse(localStorage.getItem(window.RosterBateSimulationModeRuntime.COMPLETED_DRAFT_KEY) || 'null');
    }

    function formatSimulationDate(shell, day){
      const base = new Date(`${shell.regularSeasonStartDate}T12:00:00`);
      base.setDate(base.getDate() + Math.max(0, Number(day || 1) - 1));
      return base.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function renderSimulationDashboard(state){
      const shell = state.leagueShell;
      document.getElementById('simulationLeagueTitle').textContent = `${shell.anchorSeasonLabel} Simulation`;
      document.getElementById('simulationSeasonDate').textContent = `Day ${state.seasonState.currentDay} · ${formatSimulationDate(shell, state.seasonState.currentDay)}`;
      document.getElementById('simulationStandingsTable').innerHTML = state.seasonState.standings.slice(0, 10).map((row) => (
        `<div>${row.teamAbbr} ${row.w}-${row.l}</div>`
      )).join('');
      document.getElementById('simulationGameResults').innerHTML = (state.seasonState.completedGameLogs || []).slice(-15).map((game) => (
        `<div>${game.awayName} ${game.awayScore} at ${game.homeName} ${game.homeScore}</div>`
      )).join('');
      document.getElementById('simulationChampionBanner').innerHTML = state.postseasonState.champion
        ? `<strong>Champion: ${state.postseasonState.champion.championTeamAbbr}</strong>`
        : '';
    }

    function simulateNextSimulationDay(){
      const dayResult = window.RosterBateSimulationEngine.simulateSimulationGameDay({
        state: {
          ...SIM_STATE.seasonState,
          teamMeta: SIM_STATE.leagueShell.teams,
          teams: SIM_STATE.leagueShell.teams.map((team) => team.name),
          allRosters: SIM_STATE.leagueShell.teams.map((team) => SIM_STATE.draftState.rostersByTeam[team.abbr] || [])
        },
        schedule: SIM_SCHEDULE,
        day: SIM_STATE.seasonState.currentDay,
        lineupIdsByTeam: SIM_STATE.seasonState.lineupIdsByTeam || {}
      });
      SIM_STATE.seasonState = window.RosterBateSimulationEngine.applySimulationDayResults(SIM_STATE.seasonState, dayResult);
      renderSimulationDashboard(SIM_STATE);
      localStorage.setItem(window.RosterBateSimulationModeRuntime.COMPLETED_DRAFT_KEY, JSON.stringify(SIM_STATE));
    }

    function bootSimulationSeason(){
      SIM_STATE = readCompletedSimulationDraft();
      SIM_SCHEDULE = window.RosterBateSimulationEngine.buildSimulationSeasonSchedule(SIM_STATE.leagueShell);
      renderSimulationDashboard(SIM_STATE);
    }

    bootSimulationSeason();
  </script>
</body>
</html>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node tools/test-simulation-season-page.js`  
Expected: PASS with `simulation season page test passed`

- [ ] **Step 5: Commit**

```bash
git add rosterbate-simulation-season.html simulation-mode-runtime.js tools/test-simulation-season-page.js
git commit -m "feat: add simulation season page"
```

## Task 9: Extend Archive Details For Simulation Universes

**Files:**
- Modify: `historic-universe.html`
- Test: `tools/test-simulation-universe-details.js`

- [ ] **Step 1: Write the failing simulation-details test**

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'historic-universe.html'), 'utf8');

assert.match(html, /function isSimulationModeUniverse\(/, 'details page needs a simulation-mode detector');
assert.match(html, /function buildSimulationModeSummary\(/, 'details page needs a simulation summary builder');
assert.match(html, /function buildSimulationPlayoffSummary\(/, 'details page needs a playoff summary builder');
assert.match(html, /simulation champion/i, 'details page should render champion wording for simulation universes');
assert.match(html, /play-in/i, 'details page should mention play-in context for simulation universes');

console.log('simulation universe details test passed');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tools/test-simulation-universe-details.js`  
Expected: FAIL with `details page needs a simulation-mode detector`

- [ ] **Step 3: Add simulation-mode archive rendering**

```js
// historic-universe.html
function isSimulationModeUniverse(slot, state){
  return String(slot?.simulationMode || state?.simulationMode || '').trim() === 'nba_mixed_era_single_player_v1';
}

function buildSimulationModeSummary(slot, state){
  const standing = (state?.seasonState?.standings || []).find((row) => String(row.teamAbbr || '') === String(state?.draftState?.controlledTeamAbbr || ''));
  return {
    title: 'Simulation champion chase',
    body: `${state?.leagueShell?.anchorSeasonLabel || 'NBA'} shell · ${state?.sourceSeasons?.sourceSeasonLabels?.join(' + ') || 'Mixed era'} player universe`,
    meta: [
      standing ? `Record ${standing.w}-${standing.l}` : 'Record pending',
      state?.postseasonState?.phase === 'regular_season' ? 'Play-In race active' : `Phase: ${state?.postseasonState?.phase || 'regular_season'}`
    ]
  };
}

function buildSimulationPlayoffSummary(slot, state){
  if (state?.postseasonState?.champion) {
    return {
      title: `Simulation champion: ${state.postseasonState.champion.championTeamAbbr}`,
      body: `Defeated ${state.postseasonState.champion.runnerUpTeamAbbr} in ${state.postseasonState.champion.finalsGames} games.`,
      meta: ['Trophy awarded']
    };
  }
  return {
    title: 'Play-In and playoff path pending',
    body: 'The regular season is still shaping the final conference seeds.',
    meta: ['Play-In race active']
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node tools/test-simulation-universe-details.js`  
Expected: PASS with `simulation universe details test passed`

- [ ] **Step 5: Run the focused regression suite**

Run:

```bash
node tools/test-simulation-mode-config.js
node tools/test-simulation-mode-runtime.js
node tools/test-simulation-mode-management.js
node tools/test-simulation-setup-page.js
node tools/test-simulation-draft-boot.js
node tools/test-simulation-league-engine.js
node tools/test-simulation-postseason.js
node tools/test-simulation-season-page.js
node tools/test-simulation-universe-details.js
```

Expected: all commands PASS and print their `... test passed` messages

- [ ] **Step 6: Commit**

```bash
git add historic-universe.html tools/test-simulation-universe-details.js
git commit -m "feat: add simulation universe archive details"
```

## Self-Review

### Spec Coverage

- separate mode lane: covered by Tasks `2`, `3`, `4`, and `8`
- fixed `2025-26 NBA` shell: covered by Task `1`
- user-selected seasons and mixed-era pool: covered by Tasks `2` and `3`
- `30`-team redraft: covered by Task `4`
- lineups, waivers, trades, injuries: covered by Task `5`
- day-by-day season progression: covered by Tasks `6` and `8`
- play-in, playoffs, Finals, trophy: covered by Tasks `7` and `8`
- archive/details continuity: covered by Task `9`

No uncovered spec requirement remains.

### Placeholder Scan

- no `TBD`
- no `TODO`
- no `implement later`
- no vague “add tests” steps without concrete files, code, and commands

### Type Consistency

- top-level mode id is consistently `nba_mixed_era_single_player_v1`
- shell helpers consistently use `teamAbbr`
- save-shape buckets consistently use `leagueShell`, `sourceSeasons`, `draftState`, `seasonState`, and `postseasonState`
- season entry points consistently use `rbSimulationModeLocalState` and `rbSimulationModeCompletedDraft`
