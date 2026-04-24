# NFL Shared Season Shell Weekly Sim Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make NFL simulation leagues playable in the shared season shell by adding a real 2014 weekly schedule, football lineup slots, week-based sim flow, football standings views, and a stable postseason-ready handoff.

**Architecture:** Keep the shared season shell as the single product surface, but make the simulation stack sport-aware. Reuse the existing `schedule.byDay` engine shape by treating its keys as NFL week numbers, which lets one `simulateNextDay()` call resolve one full NFL week while preserving the NBA path with minimal churn.

**Tech Stack:** Vanilla JavaScript, existing HTML season shell, simulation adapter/runtime/engine modules, Node-based regression tests in `tools/`, PowerShell, git

---

## File Map

- Create: `simulation-nfl-2014-schedule.js`
  - Own the real 2014 NFL regular-season schedule as a focused helper instead of bloating the engine file.

- Modify: `simulation-league-engine.js`
  - Delegate NFL schedule generation to the new helper while preserving the existing generated NBA schedule path.

- Modify: `simulation-mode-runtime.js`
  - Add football starter-slot helpers and make lineup persistence/validation shell-aware instead of NBA-shaped.

- Modify: `simulation-season-adapter.js`
  - Accept both NBA and NFL simulation mode ids, branch cycle labels/action labels by sport, expose NFL roster/schedule/standings view models, and mark the season postseason-ready when Week 17 completes.

- Modify: `rosterbate-season.html`
  - Render NFL-native simulation content inside the shared shell for Hub, Roster, Schedule, Standings, and Playoffs preview.

- Modify: `tools/test-simulation-mode-runtime.js`
  - Lock sport-aware starter-slot behavior and football lineup persistence.

- Modify: `tools/test-simulation-season-adapter.js`
  - Lock NFL adapter support, weekly progression, football hub labels, roster slots, standings grouping, and postseason-ready handoff.

- Modify: `tools/test-simulation-season-page.js`
  - Lock football-native shared-shell rendering and guard against NBA copy leaking into NFL.

- Create: `tools/test-nfl-2014-schedule.js`
  - Lock the real 2014 weekly schedule helper independently of the adapter/UI.

---

### Task 1: Add A Real 2014 NFL Weekly Schedule Source

**Files:**
- Create: `simulation-nfl-2014-schedule.js`
- Modify: `simulation-league-engine.js`
- Create: `tools/test-nfl-2014-schedule.js`
- Test: `tools/test-nfl-2014-schedule.js`

- [ ] **Step 1: Write the failing schedule test**

Create `tools/test-nfl-2014-schedule.js`:

```js
const assert = require('node:assert/strict');
const {
  buildNfl2014ScheduleByWeek,
  flattenNfl2014Schedule
} = require('../simulation-nfl-2014-schedule.js');

const byWeek = buildNfl2014ScheduleByWeek();
const allGames = flattenNfl2014Schedule(byWeek);

assert.equal(Object.keys(byWeek).length, 17, '2014 NFL schedule should expose 17 weeks');
assert.equal(allGames.length, 256, '2014 NFL schedule should expose 256 regular-season games');

assert.deepStrictEqual(
  byWeek[1][0],
  {
    homeAbbr: 'SEA',
    awayAbbr: 'GB'
  },
  'Week 1 should open with Packers at Seahawks'
);

assert.ok(
  byWeek[4].some((game) => game.homeAbbr === 'SF' && game.awayAbbr === 'PHI'),
  'Week 4 should include Eagles at 49ers'
);

assert.ok(
  byWeek[17].some((game) => game.homeAbbr === 'GB' && game.awayAbbr === 'DET'),
  'Week 17 should include Lions at Packers'
);

console.log('nfl 2014 schedule test passed');
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
node tools/test-nfl-2014-schedule.js
```

Expected: FAIL with `Cannot find module '../simulation-nfl-2014-schedule.js'`.

- [ ] **Step 3: Add the focused schedule helper**

Create `simulation-nfl-2014-schedule.js` with a schedule map keyed by week number:

```js
(function(root){
  'use strict';

  const NFL_2014_SCHEDULE_BY_WEEK = Object.freeze({
    1: Object.freeze([
      { homeAbbr: 'SEA', awayAbbr: 'GB' },
      { homeAbbr: 'NYJ', awayAbbr: 'OAK' },
      { homeAbbr: 'BAL', awayAbbr: 'CIN' }
    ]),
    2: Object.freeze([
      { homeAbbr: 'BAL', awayAbbr: 'PIT' }
    ])
    // Continue through Week 17 with the full real schedule.
  });

  function clone(value){
    return JSON.parse(JSON.stringify(value));
  }

  function buildNfl2014ScheduleByWeek(){
    return clone(NFL_2014_SCHEDULE_BY_WEEK);
  }

  function flattenNfl2014Schedule(byWeek){
    return Object.keys(byWeek || {})
      .map((week) => Number(week))
      .filter((week) => Number.isFinite(week) && week > 0)
      .sort((a, b) => a - b)
      .flatMap((week) => (byWeek[week] || []).map((game) => ({ ...clone(game), week })));
  }

  const api = {
    buildNfl2014ScheduleByWeek,
    flattenNfl2014Schedule
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.RosterBateNfl2014Schedule = api;
})(typeof window !== 'undefined' ? window : globalThis);
```

Important implementation note:

- fill all `17` weeks in this file before moving on
- keep the raw schedule in this file only
- do not inline the full NFL schedule into `simulation-league-engine.js`

- [ ] **Step 4: Wire the engine schedule builder to the helper**

Update the top of `simulation-league-engine.js`:

```js
const nfl2014ScheduleApi = (typeof module !== 'undefined' && module.exports)
  ? require('./simulation-nfl-2014-schedule.js')
  : root?.RosterBateNfl2014Schedule;
```

Then branch inside `buildSimulationSeasonSchedule(shell)`:

```js
function buildSimulationSeasonSchedule(shell){
  const sport = String(shell?.sport || 'nba').trim().toLowerCase();
  const anchorSeasonId = String(shell?.anchorSeasonId || '').trim().toLowerCase();

  if (sport === 'nfl' && anchorSeasonId === 'nfl_2014') {
    const byWeek = nfl2014ScheduleApi.buildNfl2014ScheduleByWeek();
    return {
      byDay: byWeek
    };
  }

  // existing NBA/generated schedule path stays here
}
```

- [ ] **Step 5: Re-run the test and confirm it passes**

Run:

```powershell
node tools/test-nfl-2014-schedule.js
```

Expected: `nfl 2014 schedule test passed`

- [ ] **Step 6: Commit**

```bash
git add simulation-nfl-2014-schedule.js simulation-league-engine.js tools/test-nfl-2014-schedule.js
git commit -m "feat: add real 2014 nfl weekly schedule source"
```

---

### Task 2: Make Runtime Lineup Slots Football-Aware

**Files:**
- Modify: `simulation-mode-runtime.js`
- Modify: `tools/test-simulation-mode-runtime.js`
- Test: `tools/test-simulation-mode-runtime.js`

- [ ] **Step 1: Add the failing runtime test for football starter slots**

Extend `tools/test-simulation-mode-runtime.js` with:

```js
const runtimeApi = require('../simulation-mode-runtime.js');

assert.equal(typeof runtimeApi.getSimulationStarterSlots, 'function');

const nflShell = {
  sport: 'nfl',
  rosterSize: 13,
  teams: [{ abbr: 'DAL' }]
};

assert.deepStrictEqual(
  runtimeApi.getSimulationStarterSlots(nflShell),
  ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'DST', 'K']
);

const nflState = {
  simulationMode: 'nfl_mixed_era_single_player_v1',
  leagueShell: nflShell,
  draftState: {
    controlledTeamAbbr: 'DAL',
    rostersByTeam: {
      DAL: [
        { id: 12, name: 'Tony Romo', pos: 'QB' },
        { id: 22, name: 'DeMarco Murray', pos: 'RB' },
        { id: 88, name: 'Dez Bryant', pos: 'WR' },
        { id: 82, name: 'Jason Witten', pos: 'TE' },
        { id: 1, name: 'Dallas DST', pos: 'DST' },
        { id: 2, name: 'Dan Bailey', pos: 'K' }
      ]
    },
    freeAgents: []
  },
  seasonState: {
    lineupIdsByTeam: {}
  }
};

const nextState = runtimeApi.setSimulationLineup(nflState, 'DAL', [12, 22, 88, 82, 1, 2]);

assert.deepStrictEqual(
  nextState.seasonState.lineupIdsByTeam.DAL,
  [12, 22, 88, 82, 1, 2],
  'NFL lineup persistence should use football slots without forcing NBA starter count'
);
```

- [ ] **Step 2: Run the runtime test and verify it fails**

Run:

```powershell
node tools/test-simulation-mode-runtime.js
```

Expected: FAIL because `getSimulationStarterSlots` does not exist yet.

- [ ] **Step 3: Add explicit starter-slot helpers in the runtime**

In `simulation-mode-runtime.js`, add:

```js
function getSimulationStarterSlots(shell){
  if (getSimulationSport(shell) === 'nfl') {
    return ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'DST', 'K'];
  }
  return ['PG', 'SG', 'SF', 'PF', 'C'];
}

function getSimulationRequiredStarterCount(shell){
  return getSimulationStarterSlots(shell).length;
}
```

Then update any starter-count logic that currently assumes NBA:

```js
const starterCount = getSimulationRequiredStarterCount(state?.leagueShell || {});
```

Export the helper:

```js
getSimulationStarterSlots,
```

- [ ] **Step 4: Re-run the runtime test and confirm it passes**

Run:

```powershell
node tools/test-simulation-mode-runtime.js
```

Expected: existing runtime test output plus a passing NFL slot assertion.

- [ ] **Step 5: Commit**

```bash
git add simulation-mode-runtime.js tools/test-simulation-mode-runtime.js
git commit -m "feat: add nfl starter slots to simulation runtime"
```

---

### Task 3: Make The Simulation Adapter Support NFL Weekly Flow

**Files:**
- Modify: `simulation-season-adapter.js`
- Modify: `tools/test-simulation-season-adapter.js`
- Create: `tools/test-nfl-shared-season-shell-weekly-sim.js`
- Test: `tools/test-simulation-season-adapter.js`
- Test: `tools/test-nfl-shared-season-shell-weekly-sim.js`

- [ ] **Step 1: Add the failing NFL adapter tests**

Append to `tools/test-simulation-season-adapter.js`:

```js
const nflState = {
  simulationMode: 'nfl_mixed_era_single_player_v1',
  leagueShell: {
    anchorSeasonId: 'nfl_2014',
    anchorSeasonLabel: '2014 NFL',
    sport: 'nfl',
    rosterSize: 13,
    teams: [
      { abbr: 'DAL', name: 'Dallas Cowboys', conference: 'NFC', division: 'East' },
      { abbr: 'PHI', name: 'Philadelphia Eagles', conference: 'NFC', division: 'East' },
      { abbr: 'NE', name: 'New England Patriots', conference: 'AFC', division: 'East' }
    ]
  },
  sourceSeasons: {
    sourceSeasonLabels: ['2014']
  },
  draftState: {
    controlledTeamAbbr: 'DAL',
    rostersByTeam: {
      DAL: [
        { id: 9, name: 'Tony Romo', pos: 'QB' },
        { id: 29, name: 'DeMarco Murray', pos: 'RB' },
        { id: 88, name: 'Dez Bryant', pos: 'WR' },
        { id: 82, name: 'Jason Witten', pos: 'TE' },
        { id: 9001, name: 'Dallas DST', pos: 'DST' },
        { id: 5, name: 'Dan Bailey', pos: 'K' }
      ],
      PHI: [],
      NE: []
    },
    freeAgents: []
  },
  seasonState: {
    currentDay: 1,
    currentWeek: 1,
    scheduleByDay: {
      1: [
        { homeAbbr: 'SEA', awayAbbr: 'GB' },
        { homeAbbr: 'DAL', awayAbbr: 'SF' }
      ],
      2: [
        { homeAbbr: 'TEN', awayAbbr: 'DAL' }
      ]
    },
    standings: [
      { teamAbbr: 'DAL', conference: 'NFC', division: 'East', w: 0, l: 0, pf: 0, pa: 0 },
      { teamAbbr: 'PHI', conference: 'NFC', division: 'East', w: 0, l: 0, pf: 0, pa: 0 },
      { teamAbbr: 'NE', conference: 'AFC', division: 'East', w: 0, l: 0, pf: 0, pa: 0 }
    ],
    lineupIdsByTeam: { DAL: [9, 29, 88, 82, 9001, 5] },
    completedGameLogs: [],
    activityLog: []
  },
  postseasonState: {
    phase: 'regular_season'
  }
};

assert.equal(isSupportedSimulationSeasonState(nflState), true);

const nflAdapter = createSimulationSeasonAdapter({
  slotId: 'nfl-slot-1',
  state: nflState
});

assert.equal(nflAdapter.getModeId(), 'nfl_mixed_era_single_player_v1');
assert.equal(nflAdapter.getHubViewModel().leagueLabel, '2014 NFL Simulation');
assert.equal(nflAdapter.getHubViewModel().primaryAction.label, 'Sim Week');
assert.equal(nflAdapter.getScheduleViewModel().cycleLabel, 'Week 1');
assert.ok(Array.isArray(nflAdapter.getRosterViewModel().starterSlots));
assert.deepStrictEqual(
  nflAdapter.getRosterViewModel().starterSlots,
  ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'DST', 'K']
);
assert.ok(
  nflAdapter.getStandingsViewModel().sections.some((section) => section.title === 'NFC East'),
  'NFL standings view should expose division-grouped sections'
);
```

Create `tools/test-nfl-shared-season-shell-weekly-sim.js`:

```js
const assert = require('node:assert/strict');
const { createSimulationSeasonAdapter } = require('../simulation-season-adapter.js');

const adapter = createSimulationSeasonAdapter({
  slotId: 'nfl-weekly-flow',
  state: {
    simulationMode: 'nfl_mixed_era_single_player_v1',
    leagueShell: {
      anchorSeasonId: 'nfl_2014',
      anchorSeasonLabel: '2014 NFL',
      sport: 'nfl',
      rosterSize: 13,
      teams: [
        { abbr: 'DAL', name: 'Dallas Cowboys', conference: 'NFC', division: 'East' },
        { abbr: 'SF', name: 'San Francisco 49ers', conference: 'NFC', division: 'West' }
      ]
    },
    draftState: {
      controlledTeamAbbr: 'DAL',
      rostersByTeam: {
        DAL: [{ id: 9, name: 'Tony Romo', pos: 'QB', fp: 30 }],
        SF: [{ id: 7, name: 'Colin Kaepernick', pos: 'QB', fp: 26 }]
      },
      freeAgents: []
    },
    seasonState: {
      currentDay: 1,
      currentWeek: 1,
      scheduleByDay: {
        1: [{ homeAbbr: 'DAL', awayAbbr: 'SF' }]
      },
      standings: [
        { teamAbbr: 'DAL', conference: 'NFC', division: 'East', w: 0, l: 0, pf: 0, pa: 0 },
        { teamAbbr: 'SF', conference: 'NFC', division: 'West', w: 0, l: 0, pf: 0, pa: 0 }
      ],
      lineupIdsByTeam: { DAL: [9], SF: [7] },
      completedGameLogs: [],
      activityLog: []
    },
    postseasonState: { phase: 'regular_season' }
  }
});

const nextState = adapter.simulateNextDay();

assert.equal(nextState.seasonState.currentWeek, 2);
assert.equal(nextState.seasonState.currentDay, 2);
assert.equal(nextState.seasonState.completedGameLogs.length, 1);

console.log('nfl shared season shell weekly sim test passed');
```

- [ ] **Step 2: Run the adapter tests to verify they fail**

Run:

```powershell
node tools/test-simulation-season-adapter.js
node tools/test-nfl-shared-season-shell-weekly-sim.js
```

Expected:

- adapter test fails because `MODE_ID` and `isSupportedSimulationSeasonState` are NBA-only
- weekly-flow test fails because the adapter still exposes `Sim Day` / `Day X - Week Y` semantics

- [ ] **Step 3: Refactor the adapter entry to be sport-aware**

In `simulation-season-adapter.js`, replace the NBA-only mode constant with:

```js
const MODE_IDS = Object.freeze({
  nba: 'nba_mixed_era_single_player_v1',
  nfl: 'nfl_mixed_era_single_player_v1'
});

function getSimulationSportForState(state){
  return String(state?.leagueShell?.sport || '').trim().toLowerCase()
    || (String(state?.simulationMode || '').trim().toLowerCase().startsWith('nfl_') ? 'nfl' : 'nba');
}

function getModeIdForState(state){
  return MODE_IDS[getSimulationSportForState(state)] || MODE_IDS.nba;
}

function isSupportedSimulationSeasonState(state){
  return Object.values(MODE_IDS).includes(String(state?.simulationMode || '').trim().toLowerCase());
}
```

- [ ] **Step 4: Add NFL-specific cycle labels, primary actions, and roster slots**

Inside `simulation-season-adapter.js`, add:

```js
function formatSimulationCycleLabel(state){
  const sport = getSimulationSportForState(state);
  if (sport === 'nfl') {
    return `Week ${Number(state?.seasonState?.currentWeek || state?.seasonState?.currentDay || 1)}`;
  }
  return `Day ${Number(state?.seasonState?.currentDay || 1)} - Week ${Number(state?.seasonState?.currentWeek || 1)}`;
}

function getSimulationPrimaryActionLabel(state){
  return getSimulationSportForState(state) === 'nfl' ? 'Sim Week' : 'Sim Day';
}

function getSimulationStarterSlots(state){
  return runtimeApi.getSimulationStarterSlots(state?.leagueShell || {});
}
```

Then use them in `getHubViewModel()` and `getRosterViewModel()`:

```js
primaryAction: { id: 'sim-day', label: getSimulationPrimaryActionLabel(state) }
```

```js
starterSlots: getSimulationStarterSlots(state)
```

- [ ] **Step 5: Add NFL standings grouping and postseason-ready handoff**

Still in `simulation-season-adapter.js`, add:

```js
function buildNflStandingsSections(rows){
  const sections = {};
  (rows || []).forEach((row) => {
    const title = `${row.conference} ${row.division}`;
    if (!sections[title]) sections[title] = [];
    sections[title].push(clone(row));
  });
  return Object.keys(sections).sort().map((title) => ({
    title,
    rows: sortStandingsRows(sections[title])
  }));
}
```

And in `getStandingsViewModel()`:

```js
const sport = getSimulationSportForState(state);
return {
  rows: standings,
  userRow: ...,
  postseasonPhase: state?.postseasonState?.phase || 'regular_season',
  sections: sport === 'nfl' ? buildNflStandingsSections(standings) : []
};
```

In `simulateNextDay()`, keep the public method name, but for NFL treat `scheduleByDay` keys as weeks:

```js
const sport = getSimulationSportForState(state);
const totalDays = getScheduleDayCount(scheduleByDay);

if (sport === 'nfl' && Number(state?.seasonState?.currentWeek || 1) > totalDays) {
  state = ensurePostseasonSnapshot(state, totalDays);
  return this.getState();
}
```

After applying results:

```js
if (sport === 'nfl') {
  nextSeasonState.currentWeek = Number(nextSeasonState.currentDay || currentSeasonState.currentWeek || 1);
}
```

- [ ] **Step 6: Re-run the adapter tests and confirm they pass**

Run:

```powershell
node tools/test-simulation-season-adapter.js
node tools/test-nfl-shared-season-shell-weekly-sim.js
```

Expected:

- existing NBA adapter assertions still pass
- NFL adapter assertions pass
- weekly sim test advances from Week `1` to Week `2`

- [ ] **Step 7: Commit**

```bash
git add simulation-season-adapter.js tools/test-simulation-season-adapter.js tools/test-nfl-shared-season-shell-weekly-sim.js
git commit -m "feat: add nfl weekly flow to simulation season adapter"
```

---

### Task 4: Render Football-Native Views In The Shared Season Shell

**Files:**
- Modify: `rosterbate-season.html`
- Modify: `tools/test-simulation-season-page.js`
- Test: `tools/test-simulation-season-page.js`

- [ ] **Step 1: Add the failing season-page assertions**

Extend `tools/test-simulation-season-page.js` with:

```js
const seasonHtml = fs.readFileSync(path.join(__dirname, '..', 'rosterbate-season.html'), 'utf8');

assert.match(seasonHtml, /Sim Week/, 'season shell should expose nfl weekly action copy');
assert.match(seasonHtml, /QB/, 'season shell should render football lineup slots');
assert.match(seasonHtml, /DST/, 'season shell should render defense slot copy');
assert.match(seasonHtml, /AFC|NFC/, 'season shell should support football standings copy');
```

- [ ] **Step 2: Run the season-page test to verify it fails**

Run:

```powershell
node tools/test-simulation-season-page.js
```

Expected: FAIL because the shared shell still assumes basketball simulation copy/layout.

- [ ] **Step 3: Make the shared-shell renderers branch on simulation sport**

In `rosterbate-season.html`, update the simulation renderers to inspect the adapter state:

```js
function getSharedSimulationSport(){
  return String(SEASON_MODE_ADAPTER?.getState?.()?.leagueShell?.sport || 'nba').trim().toLowerCase();
}
```

Update the hub renderer so NFL gets:

```js
const isNflSimulation = getSharedSimulationSport() === 'nfl';
const primaryActionLabel = isNflSimulation ? 'Sim Week' : 'Sim Day';
const hubSubtitle = isNflSimulation
  ? 'Weekly control room for your 2014 NFL simulation league.'
  : 'Daily control room for your mixed-era NBA simulation league.';
```

Update the roster renderer so it prints slot labels from the adapter:

```js
const starterSlots = Array.isArray(viewModel?.starterSlots) ? viewModel.starterSlots : [];
const starterRows = starterSlots.map((slot, index) => {
  const player = lineup[index] || null;
  return `<div class="season-lineup-slot">
    <div class="season-lineup-slot-label">${slot}</div>
    <div class="season-lineup-slot-player">${player ? player.name : 'Empty Slot'}</div>
  </div>`;
}).join('');
```

Update the schedule renderer so NFL uses week-centric headers:

```js
const isNflSimulation = getSharedSimulationSport() === 'nfl';
const scheduleTitle = isNflSimulation ? 'Weekly Schedule / Results' : 'Schedule / Results';
const cycleLabel = viewModel?.cycleLabel || (isNflSimulation ? 'Week 1' : 'Day 1 - Week 1');
```

Update the standings renderer so NFL sections appear above or instead of one flat table:

```js
if (isNflSimulation && Array.isArray(viewModel?.sections) && viewModel.sections.length) {
  standingsMount.innerHTML = viewModel.sections.map((section) => `
    <div class="season-division-card">
      <div class="season-division-title">${section.title}</div>
      ${renderStandingsRows(section.rows)}
    </div>
  `).join('');
  return;
}
```

Update the Playoffs preview copy for NFL:

```js
const playoffCopy = isNflSimulation
  ? 'Conference race, division leaders, wildcard pressure, and postseason-ready picture.'
  : 'Postseason bracket, play-in races, and the champion path';
```

- [ ] **Step 4: Re-run the season-page test and confirm it passes**

Run:

```powershell
node tools/test-simulation-season-page.js
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add rosterbate-season.html tools/test-simulation-season-page.js
git commit -m "feat: render nfl weekly simulation views in shared shell"
```

---

### Task 5: Final Integration Sweep And Postseason-Ready Gate

**Files:**
- Modify: `simulation-season-adapter.js`
- Modify: `tools/test-shared-season-shell-simulation.js`
- Test: `tools/test-simulation-season-adapter.js`
- Test: `tools/test-simulation-season-page.js`
- Test: `tools/test-simulation-mode-runtime.js`
- Test: `tools/test-nfl-2014-schedule.js`
- Test: `tools/test-nfl-shared-season-shell-weekly-sim.js`
- Test: `tools/test-shared-season-shell-simulation.js`

- [ ] **Step 1: Add the failing postseason-ready integration test**

Extend `tools/test-shared-season-shell-simulation.js` with:

```js
assert.match(adapterSource, /nfl_mixed_era_single_player_v1/, 'shared shell adapter should support nfl simulation mode');
assert.match(adapterSource, /Week \\$\\{Number\\(/, 'shared shell adapter should format weekly cycle labels for nfl');
assert.match(adapterSource, /postseason_ready/, 'shared shell should advance nfl seasons into a postseason-ready phase');
```

- [ ] **Step 2: Run the integration sweep and verify at least one test fails**

Run:

```powershell
node tools/test-simulation-season-adapter.js
node tools/test-simulation-season-page.js
node tools/test-simulation-mode-runtime.js
node tools/test-nfl-2014-schedule.js
node tools/test-nfl-shared-season-shell-weekly-sim.js
node tools/test-shared-season-shell-simulation.js
```

Expected: any remaining missing NFL weekly behavior should fail here before final cleanup.

- [ ] **Step 3: Finish the postseason-ready handoff and copy cleanup**

In `simulation-season-adapter.js`, make the regular-season handoff explicit for NFL:

```js
if (sport === 'nfl' && totalDays > 0 && Number(nextSeasonState.currentWeek || nextSeasonState.currentDay || 1) > totalDays) {
  state = ensurePostseasonSnapshot({
    ...clone(state),
    seasonState: {
      ...nextSeasonState,
      scheduleByDay: clone(scheduleByDay)
    }
  }, totalDays);
  return this.getState();
}
```

Also confirm all NFL-facing copy paths in `rosterbate-season.html` avoid NBA-specific terms like:

- `Sim Day`
- `play-in`
- `daily slate`

Replace those with football-native weekly wording where appropriate.

- [ ] **Step 4: Run the full targeted verification sweep**

Run:

```powershell
node tools/test-simulation-mode-runtime.js
node tools/test-simulation-season-adapter.js
node tools/test-simulation-season-page.js
node tools/test-nfl-2014-schedule.js
node tools/test-nfl-shared-season-shell-weekly-sim.js
node tools/test-shared-season-shell-simulation.js
git diff --check
```

Expected:

- all tests pass
- `git diff --check` returns cleanly (CRLF warnings only are acceptable if there is no non-zero exit)

- [ ] **Step 5: Commit**

```bash
git add simulation-season-adapter.js rosterbate-season.html tools/test-shared-season-shell-simulation.js
git commit -m "feat: finish nfl weekly simulation shell flow"
```
