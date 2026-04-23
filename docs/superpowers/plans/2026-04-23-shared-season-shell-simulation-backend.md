# Shared Season Shell With Simulation Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html` the canonical season manager shell for mixed-era NBA simulation leagues so simulation mode has the same management surface as a regular league while still using simulation state and simulation mutations underneath.

**Architecture:** Keep the existing regular season shell and its familiar navigation, but insert a mode adapter seam so simulation leagues render normalized view models into the same Hub, Roster, Matchup, Waiver, Trades, and Standings containers. Reuse the existing simulation universe storage and mutation helpers in `simulation-mode-runtime.js`, route archive links into the shared shell, and turn `rosterbate-simulation-season.html` into a redirect shim so older links still work.

**Tech Stack:** Vanilla HTML/CSS/JS, inline season-page scripts in `rosterbate-season.html`, shared browser/Node modules, historical-universe slot storage, Node `assert/fs/path/vm`, existing simulation runtime and league-engine helpers.

---

## File Structure

- **Create:** `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-season-adapter.js`
  - Own the simulation-mode adapter contract, view-model shaping, shared-shell nav config, and mutation wrappers backed by `simulation-mode-runtime.js` and `simulation-league-engine.js`.
- **Create:** `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js`
  - Verify adapter boot, nav items, hub/roster/schedule/waiver/trades/standings view models, and mutation wrappers.
- **Create:** `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js`
  - Verify the regular season shell loads the adapter, chooses simulation mode, relabels `Matchup` to `Schedule`, hides `Commissioner`, and branches renderers into simulation-aware paths.
- **Modify:** `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`
  - Add adapter script loading, route normalization, shared-shell mode detection, dynamic nav/page config, adapter-backed simulation renderers, and persistence after lineup/waiver/trade/sim actions.
- **Modify:** `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\historical-universe-slots.js`
  - Update simulation season URLs so archive entries open the shared season shell instead of the legacy simulation page.
- **Modify:** `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-simulation-season.html`
  - Replace the dedicated dashboard boot with a redirect shim into `rosterbate-season.html`.
- **Modify:** `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-slot-routing.js`
  - Lock the new shared-shell route so future work does not drift back to the legacy simulation page.
- **Modify:** `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-page.js`
  - Convert the old dedicated-page assertions into redirect-shim assertions.

## Assumptions Locked For This Plan

- The shared shell path for simulation remains NBA-only in v1.
- Simulation universes continue to persist through historical universe slot storage.
- Existing query-param usage stays backward compatible:
  - `historicalUniverse=<slot-id>` remains valid.
  - `slot=<slot-id>` is accepted as an alias and normalized.
  - `simulation=nba_mixed_era` is the mode hint for the shared shell and the shim.
- The shared shell keeps the existing `matchup` screen id for layout reuse, but the label and content become `Schedule / Results` in simulation mode.
- `Commissioner` is not exposed as a top-level page in simulation mode.

### Task 1: Create the simulation season adapter seam

**Files:**
- Create: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-season-adapter.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js`

- [ ] **Step 1: Write the failing adapter regression**

Create `tools/test-simulation-season-adapter.js` with a focused adapter harness:

```js
const assert = require('node:assert/strict');

const {
  createSimulationSeasonAdapter,
  isSupportedSimulationSeasonState
} = require('../simulation-season-adapter.js');

const slotState = {
  simulationMode: 'nba_mixed_era_single_player_v1',
  leagueShell: {
    anchorSeasonLabel: '2025-26 NBA',
    teams: [
      { abbr: 'LAL', name: 'Los Angeles Lakers', conference: 'West', division: 'Pacific' },
      { abbr: 'BOS', name: 'Boston Celtics', conference: 'East', division: 'Atlantic' }
    ]
  },
  sourceSeasons: {
    sourceSeasonLabels: ['1986-87', '1995-96', '2015-16']
  },
  draftState: {
    controlledTeamAbbr: 'LAL',
    rostersByTeam: {
      LAL: [
        { id: 23, name: 'Michael Jordan', pos: 'SG', team: 'CHI', fp: 60.2 },
        { id: 34, name: 'Hakeem Olajuwon', pos: 'C', team: 'HOU', fp: 61.8 }
      ],
      BOS: [
        { id: 30, name: 'Stephen Curry', pos: 'PG', team: 'GSW', fp: 57.1 }
      ]
    },
    freeAgents: [
      { id: 50, name: 'Scottie Pippen', pos: 'SF', team: 'CHI', fp: 46.4 }
    ]
  },
  seasonState: {
    currentDay: 12,
    currentWeek: 2,
    lineupIdsByTeam: { LAL: [23, 34] },
    standings: [
      { teamAbbr: 'LAL', conference: 'West', division: 'Pacific', w: 9, l: 3, pf: 1360, pa: 1288, streak: 'W3' },
      { teamAbbr: 'BOS', conference: 'East', division: 'Atlantic', w: 7, l: 5, pf: 1299, pa: 1274, streak: 'L1' }
    ],
    completedGameLogs: [
      { day: 11, awayAbbr: 'BOS', awayName: 'Boston Celtics', awayScore: 108, homeAbbr: 'LAL', homeName: 'Los Angeles Lakers', homeScore: 112 }
    ],
    upcomingGamesByTeam: {
      LAL: [{ day: 12, opponentAbbr: 'BOS', opponentName: 'Boston Celtics', home: true }]
    },
    activityLog: [
      { type: 'trade', text: 'Lakers acquired Hakeem Olajuwon', day: 9 }
    ]
  },
  postseasonState: {
    phase: 'regular_season',
    champion: null
  }
};

assert.equal(isSupportedSimulationSeasonState(slotState), true);

const adapter = createSimulationSeasonAdapter({
  slotId: 'sim-slot-1',
  state: slotState
});

assert.deepStrictEqual(
  adapter.getNavItems().map((item) => item.id),
  ['hub', 'roster', 'matchup', 'waiver', 'trades', 'standings']
);
assert.equal(adapter.getNavItems().find((item) => item.id === 'matchup').label, 'Schedule');

const hub = adapter.getHubViewModel();
assert.equal(hub.leagueLabel, '2025-26 NBA Simulation');
assert.equal(hub.controlledTeam.abbr, 'LAL');
assert.equal(hub.primaryAction.label, 'Sim Day');

const roster = adapter.getRosterViewModel();
assert.equal(roster.lineup.length, 2);
assert.equal(roster.bench.length, 0);

const schedule = adapter.getScheduleViewModel();
assert.equal(schedule.recentResults.length, 1);
assert.equal(schedule.nextGame.opponentAbbr, 'BOS');

const waivers = adapter.getWaiverViewModel();
assert.equal(waivers.availablePlayers.length, 1);

const trades = adapter.getTradeViewModel();
assert.equal(trades.tradePartners.length, 1);

const standings = adapter.getStandingsViewModel();
assert.equal(standings.userRow.teamAbbr, 'LAL');

console.log('simulation season adapter test passed');
```

- [ ] **Step 2: Run the new adapter test to verify it fails**

Run:

```powershell
node .\tools\test-simulation-season-adapter.js
```

Expected:

```text
Error: Cannot find module '../simulation-season-adapter.js'
```

- [ ] **Step 3: Create the minimal adapter module**

Add `simulation-season-adapter.js` with the browser/Node dual export pattern already used by the simulation modules:

```js
(function(root){
  'use strict';

  const MODE_ID = 'nba_mixed_era_single_player_v1';
  const runtimeApi = (typeof module !== 'undefined' && module.exports)
    ? require('./simulation-mode-runtime.js')
    : root.RosterBateSimulationModeRuntime;
  const engineApi = (typeof module !== 'undefined' && module.exports)
    ? require('./simulation-league-engine.js')
    : root.RosterBateSimulationEngine;
  const NAV_ITEMS = Object.freeze([
    { id: 'hub', label: 'Hub' },
    { id: 'roster', label: 'Roster' },
    { id: 'matchup', label: 'Schedule' },
    { id: 'waiver', label: 'Waivers' },
    { id: 'trades', label: 'Trades' },
    { id: 'standings', label: 'Stand.' }
  ]);

  function clone(value){
    return JSON.parse(JSON.stringify(value));
  }

  function isSupportedSimulationSeasonState(state){
    return String(state?.simulationMode || '').trim().toLowerCase() === MODE_ID;
  }

  function getControlledTeam(state){
    const abbr = String(state?.draftState?.controlledTeamAbbr || '').trim().toUpperCase();
    return (state?.leagueShell?.teams || []).find((team) => team.abbr === abbr) || null;
  }

  function getControlledRoster(state){
    const team = getControlledTeam(state);
    if (!team) return [];
    return Array.isArray(state?.draftState?.rostersByTeam?.[team.abbr])
      ? state.draftState.rostersByTeam[team.abbr].slice()
      : [];
  }

  function createSimulationSeasonAdapter(options){
    const slotId = String(options?.slotId || '').trim();
    let state = clone(options?.state || {});

    return {
      getModeId(){
        return MODE_ID;
      },
      getNavItems(){
        return clone(NAV_ITEMS);
      },
      getState(){
        return clone(state);
      },
      replaceState(nextState){
        state = clone(nextState || {});
        return this.getState();
      },
      getHubViewModel(){
        const team = getControlledTeam(state);
        const standings = Array.isArray(state?.seasonState?.standings) ? state.seasonState.standings : [];
        const userRow = standings.find((row) => row.teamAbbr === team?.abbr) || null;
        return {
          slotId,
          leagueLabel: `${state?.leagueShell?.anchorSeasonLabel || 'NBA'} Simulation`,
          controlledTeam: team,
          userRow,
          primaryAction: { id: 'sim-day', label: 'Sim Day' },
          sourceSeasonLabels: clone(state?.sourceSeasons?.sourceSeasonLabels || []),
          recentActivity: clone(state?.seasonState?.activityLog || []).slice(-5).reverse()
        };
      },
      getRosterViewModel(){
        const roster = getControlledRoster(state);
        const lineupIds = new Set(state?.seasonState?.lineupIdsByTeam?.[state?.draftState?.controlledTeamAbbr] || []);
        return {
          roster,
          lineup: roster.filter((player) => lineupIds.has(player.id)),
          bench: roster.filter((player) => !lineupIds.has(player.id))
        };
      },
      getScheduleViewModel(){
        const teamAbbr = String(state?.draftState?.controlledTeamAbbr || '').trim().toUpperCase();
        const nextGame = (state?.seasonState?.upcomingGamesByTeam?.[teamAbbr] || [])[0] || null;
        return {
          recentResults: clone(state?.seasonState?.completedGameLogs || []).slice(-10).reverse(),
          nextGame
        };
      },
      getWaiverViewModel(){
        return {
          availablePlayers: clone(state?.draftState?.freeAgents || [])
        };
      },
      getTradeViewModel(){
        const controlled = String(state?.draftState?.controlledTeamAbbr || '').trim().toUpperCase();
        return {
          tradePartners: clone(state?.leagueShell?.teams || []).filter((team) => team.abbr !== controlled),
          tradeHistory: clone(state?.seasonState?.activityLog || []).filter((entry) => entry.type === 'trade')
        };
      },
      getStandingsViewModel(){
        const standings = clone(state?.seasonState?.standings || []);
        return {
          rows: standings,
          userRow: standings.find((row) => row.teamAbbr === state?.draftState?.controlledTeamAbbr) || null
        };
      }
    };
  }

  const api = {
    MODE_ID,
    isSupportedSimulationSeasonState,
    createSimulationSeasonAdapter
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.RosterBateSimulationSeasonAdapter = api;
})(typeof window !== 'undefined' ? window : globalThis);
```

- [ ] **Step 4: Run the adapter test to verify it passes**

Run:

```powershell
node .\tools\test-simulation-season-adapter.js
```

Expected:

```text
simulation season adapter test passed
```

- [ ] **Step 5: Commit the adapter seam**

Run:

```powershell
git add .\simulation-season-adapter.js .\tools\test-simulation-season-adapter.js
git commit -m "feat: add simulation season adapter seam"
```

Expected:

```text
The commit succeeds with subject line: feat: add simulation season adapter seam
```

### Task 2: Route simulation universes into the shared season shell

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\historical-universe-slots.js:443-445`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html:1240-1242, 2033-2041, 2760-2776, 6760-6796, 7688-7708`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-slot-routing.js`
- Create: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js`

- [ ] **Step 1: Write the failing shared-shell routing regression**

Create `tools/test-shared-season-shell-simulation.js`:

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'rosterbate-season.html'), 'utf8');

assert.match(html, /simulation-season-adapter\.js/, 'season shell should load the simulation adapter');
assert.match(html, /function getRequestedSimulationMode\(/, 'season shell needs a simulation query-param helper');
assert.match(html, /function getRequestedHistoricalUniverseSlotId\(/, 'season shell should normalize historical slot lookup');
assert.match(html, /function isSharedSimulationSeason\(/, 'season shell should detect shared-shell simulation mode');
assert.match(html, /function getActiveSeasonPages\(/, 'season shell should build dynamic page lists');
assert.match(html, /matchup:\s*'Schedule'/, 'simulation page labels should rename matchup to schedule');
assert.match(html, /simulation=nba_mixed_era/, 'season shell should understand the simulation mode query param');

console.log('shared season shell simulation test passed');
```

Update `tools/test-simulation-slot-routing.js` so the simulation route expectation becomes:

```js
assert.equal(
  api.buildSeasonUrl({
    slotId: 'sim-slot-1',
    sport: 'nba',
    simulationMode: 'nba_mixed_era_single_player_v1'
  }, 'nba'),
  'rosterbate-season.html?sport=nba&simulation=nba_mixed_era&historicalUniverse=sim-slot-1',
  'simulation universes should open in the shared season shell'
);
```

- [ ] **Step 2: Run the routing tests to verify they fail**

Run:

```powershell
node .\tools\test-shared-season-shell-simulation.js
node .\tools\test-simulation-slot-routing.js
```

Expected:

```text
AssertionError [ERR_ASSERTION]: season shell should load the simulation adapter
AssertionError [ERR_ASSERTION]: simulation universes should open in the shared season shell
```

- [ ] **Step 3: Wire route normalization and page config into the season shell**

Update the season shell boot and nav seams with a mode-aware layer:

```html
<!-- rosterbate-season.html head scripts -->
<script src="simulation-mode-runtime.js"></script>
<script src="simulation-league-engine.js"></script>
<script src="simulation-season-adapter.js"></script>
```

```js
const DEFAULT_PAGES = ['hub', 'roster', 'matchup', 'waiver', 'trades', 'standings', 'commissioner'];
const DEFAULT_LABELS = { hub: 'Hub', roster: 'Roster', matchup: 'Matchup', waiver: 'Wire', trades: 'Trade', standings: 'Stand.', commissioner: 'Comm.' };
let ACTIVE_SEASON_MODE = 'fantasy';
let SEASON_MODE_ADAPTER = null;

function getRequestedSimulationMode(params){
  return String(params?.get('simulation') || '').trim().toLowerCase();
}

function getRequestedHistoricalUniverseSlotId(params){
  const direct = String(params?.get('historicalUniverse') || '').trim();
  if (direct) return direct;
  const alias = String(params?.get('slot') || '').trim();
  return alias || null;
}

function isHistoricalSimulationUniverse(state){
  const mode = String(state?.historicalEntryMode || state?.simulationMode || '').trim().toLowerCase();
  return mode === 'simulation_season'
    || mode === 'simulation'
    || mode === 'sim'
    || mode === 'historical_box_score'
    || mode === 'nba_mixed_era_single_player_v1';
}

function isSharedSimulationSeason(params, state){
  if (getRequestedSimulationMode(params) === 'nba_mixed_era') return true;
  return !!(window.RosterBateSimulationSeasonAdapter?.isSupportedSimulationSeasonState?.(state));
}

function getActiveSeasonPages(){
  if (ACTIVE_SEASON_MODE === 'simulation') {
    return ['hub', 'roster', 'matchup', 'waiver', 'trades', 'standings'];
  }
  return DEFAULT_PAGES.slice();
}

function getActiveSeasonLabels(){
  if (ACTIVE_SEASON_MODE === 'simulation') {
    return { hub: 'Hub', roster: 'Roster', matchup: 'Schedule', waiver: 'Waivers', trades: 'Trades', standings: 'Stand.' };
  }
  return { ...DEFAULT_LABELS };
}

function goPage(id){
  const pages = getActiveSeasonPages();
  const labels = getActiveSeasonLabels();
  const safeId = pages.includes(id) ? id : 'hub';
  document.querySelectorAll('.screen').forEach((screen) => screen.classList.remove('active'));
  document.getElementById(safeId).classList.add('active');
  pages.forEach((pageId) => {
    const navId = NAVIDS[pageId];
    const mount = document.getElementById(navId);
    if (!mount) return;
    mount.innerHTML = pages.map((candidate) => (
      `<button class="nb${candidate === safeId ? ' on' : ''}" onclick="goPage('${candidate}')">${labels[candidate]}</button>`
    )).join('');
  });
  renderActiveSeasonScreen(safeId);
}
```

Update `historical-universe-slots.js`:

```js
if (String(slot?.simulationMode || '').trim() === 'nba_mixed_era_single_player_v1') {
  return 'rosterbate-season.html?sport='
    + encodeURIComponent(targetSport)
    + '&simulation=nba_mixed_era&historicalUniverse='
    + encodeURIComponent(id);
}
```

- [ ] **Step 4: Run the routing tests to verify they pass**

Run:

```powershell
node .\tools\test-shared-season-shell-simulation.js
node .\tools\test-simulation-slot-routing.js
```

Expected:

```text
shared season shell simulation test passed
simulation slot routing test passed
```

- [ ] **Step 5: Commit the shared-shell route work**

Run:

```powershell
git add .\rosterbate-season.html .\historical-universe-slots.js .\tools\test-simulation-slot-routing.js .\tools\test-shared-season-shell-simulation.js
git commit -m "feat: route simulation universes into shared season shell"
```

Expected:

```text
The commit succeeds with subject line: feat: route simulation universes into shared season shell
```

### Task 3: Render Hub, Roster, and Schedule views through the shared shell

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-season-adapter.js`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html:806-920, 923-972, 7477-7750, 7896-9154`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js`

- [ ] **Step 1: Add failing assertions for simulation render branches**

Extend `tools/test-shared-season-shell-simulation.js`:

```js
assert.match(html, /function renderSimulationHubInSharedShell\(/, 'season shell should add a simulation hub renderer');
assert.match(html, /function renderSimulationRosterInSharedShell\(/, 'season shell should add a simulation roster renderer');
assert.match(html, /function renderSimulationScheduleInSharedShell\(/, 'season shell should add a simulation schedule renderer');
assert.match(html, /function renderActiveSeasonScreen\(/, 'season shell should centralize mode-aware screen rendering');
assert.match(html, /if \(ACTIVE_SEASON_MODE === 'simulation'\) return renderSimulationHubInSharedShell\(\);/, 'renderHub should branch into simulation rendering');
assert.match(html, /if \(ACTIVE_SEASON_MODE === 'simulation'\) return renderSimulationRosterInSharedShell\(\);/, 'renderRoster should branch into simulation rendering');
assert.match(html, /if \(ACTIVE_SEASON_MODE === 'simulation'\) return renderSimulationScheduleInSharedShell\(\);/, 'renderMatchup should branch into simulation rendering');
```

Extend `tools/test-simulation-season-adapter.js` with schedule/hub detail checks:

```js
assert.equal(adapter.getHubViewModel().sourceSeasonLabels.join(', '), '1986-87,1995-96,2015-16');
assert.equal(adapter.getScheduleViewModel().recentResults[0].homeAbbr, 'LAL');
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```powershell
node .\tools\test-shared-season-shell-simulation.js
node .\tools\test-simulation-season-adapter.js
```

Expected:

```text
AssertionError [ERR_ASSERTION]: season shell should add a simulation hub renderer
```

- [ ] **Step 3: Build the shared-shell simulation renderers and boot hook**

Expand the adapter and season shell:

```js
// simulation-season-adapter.js
function formatSimulationCycleLabel(state){
  return `Day ${Number(state?.seasonState?.currentDay || 1)} · Week ${Number(state?.seasonState?.currentWeek || 1)}`;
}

function buildSimulationRecordLabel(row){
  if (!row) return '0-0';
  return `${Number(row.w || 0)}-${Number(row.l || 0)}`;
}

// inside createSimulationSeasonAdapter(...)
getScheduleViewModel(){
  const teamAbbr = String(state?.draftState?.controlledTeamAbbr || '').trim().toUpperCase();
  const nextGame = (state?.seasonState?.upcomingGamesByTeam?.[teamAbbr] || [])[0] || null;
  return {
    title: 'Schedule / Results',
    cycleLabel: formatSimulationCycleLabel(state),
    recentResults: clone(state?.seasonState?.completedGameLogs || []).slice(-10).reverse(),
    nextGame
  };
},
simulateNextDay(){
  const shell = clone(state?.leagueShell || {});
  const schedule = engineApi.buildSimulationSeasonSchedule(shell);
  const teamMeta = clone(shell.teams || []);
  const teamNames = teamMeta.map((team) => team.name);
  const allRosters = teamMeta.map((team) => clone(state?.draftState?.rostersByTeam?.[team.abbr] || []));
  const currentSeasonState = clone(state?.seasonState || {});
  const dayResult = engineApi.simulateSimulationGameDay({
    state: {
      ...currentSeasonState,
      seasonId: state?.seasonId || state?.historicalUniverseSlotId || null,
      teamMeta,
      teams: teamNames,
      allRosters
    },
    schedule,
    day: Number(currentSeasonState.currentDay || 1),
    lineupIdsByTeam: clone(currentSeasonState.lineupIdsByTeam || {})
  });
  state = {
    ...clone(state),
    seasonState: engineApi.applySimulationDayResults(currentSeasonState, dayResult)
  };
  return this.getState();
}
```

```js
// rosterbate-season.html
function buildSimulationSeasonAdapterFromState(slotId, state){
  return window.RosterBateSimulationSeasonAdapter.createSimulationSeasonAdapter({
    slotId,
    state
  });
}

function renderSimulationHubInSharedShell(){
  const vm = SEASON_MODE_ADAPTER.getHubViewModel();
  document.getElementById('hubLeagueName').textContent = vm.leagueLabel;
  document.getElementById('hubCycleMeta').textContent = `Simulation · ${vm.primaryAction.label} ready`;
  document.getElementById('hubFormat').textContent = '2025-26 NBA Shell';
  document.getElementById('hubScoringType').textContent = 'Simulated NBA Results';
  document.getElementById('hubTeamCount').textContent = String((D?.leagueShell?.teams || []).length || 30);
  document.getElementById('hubOpp').textContent = vm.userRow ? `${vm.userRow.w}-${vm.userRow.l}` : '0-0';
  document.getElementById('hubProj').textContent = vm.controlledTeam?.abbr || '---';
  document.getElementById('hubOppProj').textContent = vm.sourceSeasonLabels.join(' + ');
  document.getElementById('hubStreak').textContent = vm.userRow?.streak || 'EVEN';
  document.getElementById('advBtn').textContent = 'Sim Day';
  document.getElementById('hubMatchups').innerHTML = (SEASON_MODE_ADAPTER.getScheduleViewModel().recentResults || []).slice(0, 4).map((game) => (
    `<div class="hub-mini-row">${game.awayAbbr} ${game.awayScore} at ${game.homeAbbr} ${game.homeScore}</div>`
  )).join('') || '<div class="hub-card-sub">No completed games yet.</div>';
}

function renderSimulationRosterInSharedShell(){
  const vm = SEASON_MODE_ADAPTER.getRosterViewModel();
  document.getElementById('rWk').textContent = 'Set starters, bench order, and injury availability';
  document.getElementById('rosterContent').innerHTML = vm.roster.map((player) => (
    `<div class="card" data-player-id="${player.id}">
      <div style="font-family:var(--fd);font-weight:800;">${player.name}</div>
      <div style="color:var(--text2);font-size:12px;">${player.team} · ${player.pos}</div>
    </div>`
  )).join('');
}

function renderSimulationScheduleInSharedShell(){
  const vm = SEASON_MODE_ADAPTER.getScheduleViewModel();
  document.getElementById('matchupContent').innerHTML = `
    <div class="card">
      <div style="font-family:var(--fd);font-size:18px;font-weight:800;text-transform:uppercase;">${vm.title}</div>
      <div style="color:var(--text2);margin-top:6px;">${vm.cycleLabel}</div>
      <div style="margin-top:14px;">
        ${(vm.recentResults || []).map((game) => `<div>${game.awayAbbr} ${game.awayScore} at ${game.homeAbbr} ${game.homeScore}</div>`).join('') || '<div class="muted">No results yet.</div>'}
      </div>
    </div>
  `;
}

function renderActiveSeasonScreen(id){
  if (ACTIVE_SEASON_MODE !== 'simulation') {
    return ({ hub: renderHub, roster: renderRoster, matchup: renderMatchup, waiver: renderWaiver, trades: renderTrades, standings: renderStandings, commissioner: renderCommissioner })[id]?.();
  }
  return ({ hub: renderSimulationHubInSharedShell, roster: renderSimulationRosterInSharedShell, matchup: renderSimulationScheduleInSharedShell, waiver: renderWaiver, trades: renderTrades, standings: renderStandings })[id]?.();
}
```

Also update `window.onload`/`initSeason()` to create the adapter before the first render:

```js
if (isSharedSimulationSeason(urlParams, D)) {
  ACTIVE_SEASON_MODE = 'simulation';
  SEASON_MODE_ADAPTER = buildSimulationSeasonAdapterFromState(requestedHistoricalUniverse, D);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run:

```powershell
node .\tools\test-shared-season-shell-simulation.js
node .\tools\test-simulation-season-adapter.js
```

Expected:

```text
shared season shell simulation test passed
simulation season adapter test passed
```

- [ ] **Step 5: Commit the shared Hub/Roster/Schedule renderers**

Run:

```powershell
git add .\simulation-season-adapter.js .\rosterbate-season.html .\tools\test-shared-season-shell-simulation.js .\tools\test-simulation-season-adapter.js
git commit -m "feat: render simulation hub roster and schedule in shared shell"
```

Expected:

```text
The commit succeeds with subject line: feat: render simulation hub roster and schedule in shared shell
```

### Task 4: Add simulation waivers, trades, standings, and `Sim Day` persistence in the shared shell

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-season-adapter.js`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html:9155-10454, 7710-7745`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-mode-management.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-league-engine.js`

- [ ] **Step 1: Add failing assertions for the management surfaces**

Extend `tools/test-simulation-season-adapter.js`:

```js
assert.equal(typeof adapter.setLineup, 'function');
assert.equal(typeof adapter.claimFreeAgent, 'function');
assert.equal(typeof adapter.applyTrade, 'function');
assert.equal(typeof adapter.simulateNextDay, 'function');
assert.equal(adapter.getWaiverViewModel().availablePlayers[0].name, 'Scottie Pippen');
assert.equal(adapter.getTradeViewModel().tradePartners[0].abbr, 'BOS');
assert.equal(adapter.getStandingsViewModel().rows.length, 2);
```

Extend `tools/test-shared-season-shell-simulation.js`:

```js
assert.match(html, /function renderSimulationWaiverInSharedShell\(/, 'season shell should add a simulation waiver renderer');
assert.match(html, /function renderSimulationTradesInSharedShell\(/, 'season shell should add a simulation trade renderer');
assert.match(html, /function renderSimulationStandingsInSharedShell\(/, 'season shell should add a simulation standings renderer');
assert.match(html, /RosterBateSimulationModeRuntime\.claimSimulationFreeAgent/, 'shared shell should use the simulation waiver runtime');
assert.match(html, /RosterBateSimulationModeRuntime\.applySimulationTrade/, 'shared shell should use the simulation trade runtime');
assert.match(html, /RosterBateSimulationModeRuntime\.setSimulationLineup/, 'shared shell should use the simulation lineup runtime');
assert.match(html, /SEASON_MODE_ADAPTER\.simulateNextDay\(\)/, 'Sim Day should flow through the adapter');
```

- [ ] **Step 2: Run the management tests to verify they fail**

Run:

```powershell
node .\tools\test-simulation-season-adapter.js
node .\tools\test-shared-season-shell-simulation.js
```

Expected:

```text
AssertionError [ERR_ASSERTION]: season shell should add a simulation waiver renderer
```

- [ ] **Step 3: Implement simulation mutation wrappers and shared-shell renderers**

Add mutation wrappers in `simulation-season-adapter.js`:

```js
setLineup(lineupIds){
  const nextState = runtimeApi.setSimulationLineup(
    clone(state),
    state?.draftState?.controlledTeamAbbr,
    lineupIds
  );
  state = clone(nextState);
  return this.getState();
},
claimFreeAgent(move){
  const nextState = runtimeApi.claimSimulationFreeAgent(clone(state), move);
  state = clone(nextState);
  return this.getState();
},
applyTrade(trade){
  const nextState = runtimeApi.applySimulationTrade(clone(state), trade);
  state = clone(nextState);
  return this.getState();
},
getWaiverViewModel(){
  const roster = getControlledRoster(state);
  return {
    roster,
    availablePlayers: clone(state?.draftState?.freeAgents || []).slice(0, 40)
  };
},
getTradeViewModel(){
  const controlled = String(state?.draftState?.controlledTeamAbbr || '').trim().toUpperCase();
  return {
    userTeamAbbr: controlled,
    tradePartners: clone(state?.leagueShell?.teams || []).filter((team) => team.abbr !== controlled),
    outgoingRoster: getControlledRoster(state),
    incomingRostersByTeam: clone(state?.draftState?.rostersByTeam || {})
  };
},
getStandingsViewModel(){
  const rows = clone(state?.seasonState?.standings || []).sort((a, b) => Number(b.w || 0) - Number(a.w || 0));
  return {
    rows,
    userRow: rows.find((row) => row.teamAbbr === state?.draftState?.controlledTeamAbbr) || null,
    postseasonPhase: state?.postseasonState?.phase || 'regular_season'
  };
}
```

Branch the season renderers and save path in `rosterbate-season.html`:

```js
function persistSimulationSeasonState(reason){
  if (ACTIVE_SEASON_MODE !== 'simulation' || !SEASON_MODE_ADAPTER) return;
  D = SEASON_MODE_ADAPTER.getState();
  persistHistoricalUniverseSlotSnapshot(reason || 'simulation_shared_shell');
}

function renderSimulationWaiverInSharedShell(){
  const vm = SEASON_MODE_ADAPTER.getWaiverViewModel();
  document.getElementById('waiverContent').innerHTML = vm.availablePlayers.map((player) => (
    `<div class="card">
      <div style="font-family:var(--fd);font-weight:800;">${player.name}</div>
      <div style="color:var(--text2);font-size:12px;">${player.team} · ${player.pos}</div>
      <button class="bp" style="margin-top:10px;" onclick="claimSimulationFreeAgentFromShell(${player.id})">Add</button>
    </div>`
  )).join('') || '<div class="card">No free agents available.</div>';
}

function claimSimulationFreeAgentFromShell(playerId){
  const vm = SEASON_MODE_ADAPTER.getWaiverViewModel();
  const addPlayer = vm.availablePlayers.find((player) => Number(player.id) === Number(playerId));
  const dropPlayer = (SEASON_MODE_ADAPTER.getRosterViewModel().bench || [])[0] || null;
  SEASON_MODE_ADAPTER.claimFreeAgent({
    teamAbbr: D?.draftState?.controlledTeamAbbr,
    addPlayerId: addPlayer?.id,
    dropPlayerId: dropPlayer?.id || null
  });
  persistSimulationSeasonState('simulation_claim');
  renderSimulationWaiverInSharedShell();
  renderSimulationHubInSharedShell();
}

function renderSimulationTradesInSharedShell(){
  const vm = SEASON_MODE_ADAPTER.getTradeViewModel();
  document.getElementById('tradesContent').innerHTML = vm.tradePartners.map((team) => (
    `<button class="card" onclick="applySimulationTradeFromShell('${team.abbr}')">${team.name}</button>`
  )).join('');
}

function applySimulationTradeFromShell(partnerAbbr){
  const vm = SEASON_MODE_ADAPTER.getTradeViewModel();
  const outgoing = (vm.outgoingRoster || [])[0] || null;
  const incoming = (vm.incomingRostersByTeam?.[partnerAbbr] || [])[0] || null;
  if (!(outgoing && incoming)) return;
  SEASON_MODE_ADAPTER.applyTrade({
    fromTeamAbbr: D?.draftState?.controlledTeamAbbr,
    toTeamAbbr: partnerAbbr,
    outgoingPlayerIds: [outgoing.id],
    incomingPlayerIds: [incoming.id]
  });
  persistSimulationSeasonState('simulation_trade');
  renderSimulationTradesInSharedShell();
  renderSimulationRosterInSharedShell();
  renderSimulationHubInSharedShell();
}

function renderSimulationStandingsInSharedShell(){
  const vm = SEASON_MODE_ADAPTER.getStandingsViewModel();
  document.getElementById('standingsContent').innerHTML = vm.rows.map((row) => (
    `<div class="card">${row.teamAbbr} · ${row.w}-${row.l}</div>`
  )).join('');
}

function advanceWeek(){
  if (ACTIVE_SEASON_MODE === 'simulation' && SEASON_MODE_ADAPTER) {
    SEASON_MODE_ADAPTER.simulateNextDay();
    persistSimulationSeasonState('simulation_day_advance');
    renderSimulationHubInSharedShell();
    if (document.getElementById('matchup').classList.contains('active')) renderSimulationScheduleInSharedShell();
    if (document.getElementById('waiver').classList.contains('active')) renderSimulationWaiverInSharedShell();
    if (document.getElementById('trades').classList.contains('active')) renderSimulationTradesInSharedShell();
    if (document.getElementById('standings').classList.contains('active')) renderSimulationStandingsInSharedShell();
    return;
  }
  // existing fantasy flow remains below
}
```

- [ ] **Step 4: Run the management and engine regressions**

Run:

```powershell
node .\tools\test-simulation-season-adapter.js
node .\tools\test-shared-season-shell-simulation.js
node .\tools\test-simulation-mode-management.js
node .\tools\test-simulation-league-engine.js
```

Expected:

```text
simulation season adapter test passed
shared season shell simulation test passed
simulation mode management test passed
simulation league engine test passed
```

- [ ] **Step 5: Commit the shared-shell management layer**

Run:

```powershell
git add .\simulation-season-adapter.js .\rosterbate-season.html .\tools\test-simulation-season-adapter.js .\tools\test-shared-season-shell-simulation.js
git commit -m "feat: add simulation management surfaces to shared season shell"
```

Expected:

```text
The commit succeeds with subject line: feat: add simulation management surfaces to shared season shell
```

### Task 5: Turn the legacy simulation page into a redirect shim

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-simulation-season.html`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-page.js`

- [ ] **Step 1: Rewrite the dedicated-page test to expect a redirect shim**

Replace the old dashboard assertions in `tools/test-simulation-season-page.js` with:

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'rosterbate-simulation-season.html'), 'utf8');

assert.match(html, /function resolveLegacySimulationTarget\(\)/, 'legacy simulation page should compute a shared-shell redirect target');
assert.match(html, /function redirectToSharedSeasonShell\(\)/, 'legacy simulation page should redirect into the shared season shell');
assert.match(html, /rosterbate-season\.html/, 'legacy simulation page should point at the regular season shell');
assert.match(html, /simulation=nba_mixed_era/, 'legacy simulation page should preserve the simulation mode query param');
assert.match(html, /historicalUniverse/, 'legacy simulation page should forward historical universe slot ids');
assert.doesNotMatch(html, /function renderSimulationDashboard\(/, 'legacy simulation page should no longer own the main simulation dashboard');

console.log('simulation season page test passed');
```

- [ ] **Step 2: Run the redirect-shim test to verify it fails**

Run:

```powershell
node .\tools\test-simulation-season-page.js
```

Expected:

```text
AssertionError [ERR_ASSERTION]: legacy simulation page should compute a shared-shell redirect target
```

- [ ] **Step 3: Replace the old page boot with a redirect shim**

Rewrite `rosterbate-simulation-season.html` as a compatibility page:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>RosterBate Simulation Redirect</title>
</head>
<body>
  <script>
    function resolveLegacySimulationTarget(){
      const params = new URLSearchParams(window.location.search || '');
      const target = new URL('rosterbate-season.html', window.location.href);
      target.searchParams.set('sport', 'nba');
      target.searchParams.set('simulation', params.get('simulation') || 'nba_mixed_era');
      const slotId = params.get('historicalUniverse') || params.get('slot');
      if (slotId) target.searchParams.set('historicalUniverse', slotId);
      const page = String(params.get('page') || '').trim().toLowerCase();
      if (page) target.searchParams.set('page', page);
      return target.toString();
    }

    function redirectToSharedSeasonShell(){
      const nextUrl = resolveLegacySimulationTarget();
      document.body.innerHTML = '<div style="font-family:system-ui;padding:24px;">Redirecting to the season manager...</div>';
      window.location.replace(nextUrl);
    }

    redirectToSharedSeasonShell();
  </script>
</body>
</html>
```

- [ ] **Step 4: Run the redirect-shim test to verify it passes**

Run:

```powershell
node .\tools\test-simulation-season-page.js
```

Expected:

```text
simulation season page test passed
```

- [ ] **Step 5: Commit the legacy-route shim**

Run:

```powershell
git add .\rosterbate-simulation-season.html .\tools\test-simulation-season-page.js
git commit -m "refactor: redirect legacy simulation page into shared shell"
```

Expected:

```text
The commit succeeds with subject line: refactor: redirect legacy simulation page into shared shell
```

### Task 6: Final verification and manual season-shell sanity pass

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-season-adapter.js`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\historical-universe-slots.js`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-simulation-season.html`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-slot-routing.js`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-page.js`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js`

- [ ] **Step 1: Run the full focused regression sweep**

Run:

```powershell
node .\tools\test-simulation-season-adapter.js
node .\tools\test-shared-season-shell-simulation.js
node .\tools\test-simulation-slot-routing.js
node .\tools\test-simulation-season-page.js
node .\tools\test-simulation-mode-management.js
node .\tools\test-simulation-league-engine.js
node .\tools\test-historical-universe-slot-storage.js
git diff --check
```

Expected:

```text
simulation season adapter test passed
shared season shell simulation test passed
simulation slot routing test passed
simulation season page test passed
simulation mode management test passed
simulation league engine test passed
historical universe slot storage test passed
git diff --check prints no output
```

- [ ] **Step 2: Do one manual browser pass through the shared shell**

Open a simulation universe through either of these routes:

```text
https://rosterbate.net/rosterbate-season.html?sport=nba&simulation=nba_mixed_era&historicalUniverse=<slot-id>
https://rosterbate.net/rosterbate-simulation-season.html?simulation=nba_mixed_era&historicalUniverse=<slot-id>
```

Confirm all of the following:
- the second URL redirects into the first shell
- nav shows `Hub`, `Roster`, `Schedule`, `Waivers`, `Trades`, `Stand.`
- `Commissioner` is absent
- `Hub` shows simulation context instead of weekly fantasy reveal language
- `Roster` lets you inspect your mixed-era roster and manage starters
- `Waivers` can add a player and the change persists after refresh
- `Trades` can apply a simple single-player trade and the change persists after refresh
- `Standings` updates after `Sim Day`
- `Schedule` shows recent results / next opponent instead of fantasy matchup content

Expected:

```text
Simulation leagues now feel like the same season manager product, backed by simulation data instead of fantasy matchup state.
```

- [ ] **Step 3: Confirm branch/worktree state is clean**

Run:

```powershell
git status --short
git rev-parse --abbrev-ref HEAD
git rev-parse --short HEAD
```

Expected:

```text
No modified or untracked product files remain, and the branch points at the final shared-season-shell simulation commit.
```

- [ ] **Step 4: Prepare the finish summary**

Capture these exact delivery points for the finish message:

```text
- simulation universes now open inside the regular season shell
- the season shell uses adapter-backed simulation nav and screen labels
- Hub, Roster, Schedule, Waivers, Trades, and Standings all render from simulation state
- lineup, waiver, trade, and Sim Day actions persist through the simulation save
- the legacy simulation page now forwards into the shared shell
```

- [ ] **Step 5: Commit any final tiny cleanup if needed**

If a last tiny cleanup is needed after the verification sweep, finish with:

```powershell
git add .\simulation-season-adapter.js .\rosterbate-season.html .\historical-universe-slots.js .\rosterbate-simulation-season.html .\tools\test-simulation-slot-routing.js .\tools\test-simulation-season-page.js .\tools\test-simulation-season-adapter.js .\tools\test-shared-season-shell-simulation.js
git commit -m "chore: finalize shared season shell simulation backend"
```

Expected:

```text
Only use this step if a final tiny cleanup was needed after the verification sweep.
```

## Self-Review

### Spec Coverage

- shared shell instead of second-class simulation page: covered by Tasks `2`, `3`, and `5`
- shared routing into `rosterbate-season.html`: covered by Task `2`
- simulation adapter boundaries: covered by Task `1`
- simulation Hub / Roster / Schedule / Waivers / Trades / Standings parity: covered by Tasks `3` and `4`
- same familiar shell with simulation backend and management mutations: covered by Tasks `1`, `3`, and `4`
- legacy simulation URL continuity: covered by Task `5`
- persistence through archive slot storage: covered by Tasks `2`, `4`, and `6`

No approved requirement from the spec is left without a task.

### Placeholder Scan

- no `TODO`
- no `TBD`
- no "implement later" placeholders
- every task includes exact file paths, concrete code, explicit commands, and pass/fail expectations

### Type Consistency

- the simulation mode id stays `nba_mixed_era_single_player_v1`
- the public route hint stays `simulation=nba_mixed_era`
- screen ids stay `hub`, `roster`, `matchup`, `waiver`, `trades`, `standings`
- the shared-shell rename changes the label for `matchup` to `Schedule`, not the underlying screen id
- persistence continues to key through `historicalUniverse` slot ids with `slot` accepted as an alias
