# NFL Shared Season Shell Postseason Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the NFL simulation lane by adding exact 2014 playoff seeding, week-by-week postseason progression, shared-shell playoff rendering, and saved Super Bowl champion/archive state.

**Architecture:** Keep the shared season shell as the single product surface and extend the existing simulation adapter with an NFL postseason branch rather than inventing a second season page. Let the adapter own bracket policy and weekly round progression, while the shared shell and archive/detail consumers render the richer NFL postseason state the adapter produces.

**Tech Stack:** Vanilla JavaScript, existing shared season shell HTML, simulation adapter/runtime modules, historic universe/detail helpers, Node-based regression tests in `tools/`, PowerShell, git

---

## File Map

- Modify: `simulation-season-adapter.js`
  - Extend the existing postseason helpers with exact 2014 NFL seeding, bye handling, divisional reseeding, conference championships, Super Bowl, and completion state.

- Modify: `rosterbate-season.html`
  - Render NFL-specific postseason Hub and Playoffs tab states inside the shared shell and remove the lingering NFL placeholder copy.

- Modify: `historic-universe.html`
  - Teach the archive/details helpers how to summarize NFL postseason-ready, round-in-progress, and completed Super Bowl states.

- Modify: `tools/test-simulation-season-adapter.js`
  - Lock exact 2014 field seeding, weekly round progression, divisional reseeding, Super Bowl completion, and reopened state behavior.

- Modify: `tools/test-shared-season-shell-simulation.js`
  - Lock shared-shell hub/playoffs rendering and CTA behavior for NFL postseason phases.

- Modify: `tools/test-simulation-universe-details.js`
  - Lock NFL postseason archive/detail summaries so completed universes tell the Super Bowl story correctly.

---

### Task 1: Seed The Exact 2014 NFL Playoff Field

**Files:**
- Modify: `tools/test-simulation-season-adapter.js`
- Modify: `simulation-season-adapter.js`
- Test: `tools/test-simulation-season-adapter.js`

- [ ] **Step 1: Write the failing test for exact 2014 NFL seeding**

Extend `tools/test-simulation-season-adapter.js` with:

```js
const nflSeedingAdapter = createSimulationSeasonAdapter({
  slotId: 'nfl-postseason-seeding',
  state: {
    simulationMode: 'nfl_mixed_era_single_player_v1',
    leagueShell: {
      anchorSeasonId: 'nfl_2014',
      anchorSeasonLabel: '2014 NFL',
      sport: 'nfl',
      teams: [
        { abbr: 'NE', name: 'New England Patriots', conference: 'AFC', division: 'East' },
        { abbr: 'DEN', name: 'Denver Broncos', conference: 'AFC', division: 'West' },
        { abbr: 'IND', name: 'Indianapolis Colts', conference: 'AFC', division: 'South' },
        { abbr: 'PIT', name: 'Pittsburgh Steelers', conference: 'AFC', division: 'North' },
        { abbr: 'CIN', name: 'Cincinnati Bengals', conference: 'AFC', division: 'North' },
        { abbr: 'BAL', name: 'Baltimore Ravens', conference: 'AFC', division: 'North' },
        { abbr: 'SEA', name: 'Seattle Seahawks', conference: 'NFC', division: 'West' },
        { abbr: 'GB', name: 'Green Bay Packers', conference: 'NFC', division: 'North' },
        { abbr: 'DAL', name: 'Dallas Cowboys', conference: 'NFC', division: 'East' },
        { abbr: 'CAR', name: 'Carolina Panthers', conference: 'NFC', division: 'South' },
        { abbr: 'ARI', name: 'Arizona Cardinals', conference: 'NFC', division: 'West' },
        { abbr: 'DET', name: 'Detroit Lions', conference: 'NFC', division: 'North' }
      ]
    },
    sourceSeasons: { sourceSeasonLabels: ['2014'] },
    draftState: {
      controlledTeamAbbr: 'NE',
      rostersByTeam: { NE: [], DEN: [], IND: [], PIT: [], CIN: [], BAL: [], SEA: [], GB: [], DAL: [], CAR: [], ARI: [], DET: [] },
      freeAgents: []
    },
    seasonState: {
      currentDay: 18,
      currentWeek: 18,
      standings: [
        { teamAbbr: 'NE', conference: 'AFC', division: 'East', w: 12, l: 4, divisionLeader: true },
        { teamAbbr: 'DEN', conference: 'AFC', division: 'West', w: 12, l: 4, divisionLeader: true },
        { teamAbbr: 'IND', conference: 'AFC', division: 'South', w: 11, l: 5, divisionLeader: true },
        { teamAbbr: 'PIT', conference: 'AFC', division: 'North', w: 11, l: 5, divisionLeader: true },
        { teamAbbr: 'CIN', conference: 'AFC', division: 'North', w: 10, l: 5, divisionLeader: false },
        { teamAbbr: 'BAL', conference: 'AFC', division: 'North', w: 10, l: 6, divisionLeader: false },
        { teamAbbr: 'SEA', conference: 'NFC', division: 'West', w: 12, l: 4, divisionLeader: true },
        { teamAbbr: 'GB', conference: 'NFC', division: 'North', w: 12, l: 4, divisionLeader: true },
        { teamAbbr: 'DAL', conference: 'NFC', division: 'East', w: 12, l: 4, divisionLeader: true },
        { teamAbbr: 'CAR', conference: 'NFC', division: 'South', w: 7, l: 8, divisionLeader: true },
        { teamAbbr: 'ARI', conference: 'NFC', division: 'West', w: 11, l: 5, divisionLeader: false },
        { teamAbbr: 'DET', conference: 'NFC', division: 'North', w: 11, l: 5, divisionLeader: false }
      ],
      scheduleByDay: { 1: [] },
      lineupIdsByTeam: {},
      completedGameLogs: [],
      activityLog: []
    },
    postseasonState: { phase: 'regular_season' }
  }
});

const seededState = nflSeedingAdapter.simulateNextDay();

assert.equal(seededState.postseasonState.phase, 'wild_card');
assert.deepStrictEqual(
  seededState.postseasonState.playoffPicture.afc.map((row) => row.teamAbbr),
  ['NE', 'DEN', 'IND', 'PIT', 'CIN', 'BAL']
);
assert.deepStrictEqual(
  seededState.postseasonState.playoffPicture.nfc.map((row) => row.teamAbbr),
  ['SEA', 'GB', 'DAL', 'CAR', 'ARI', 'DET']
);
assert.deepStrictEqual(
  seededState.postseasonState.currentWeekSchedule.map((game) => [game.homeAbbr, game.awayAbbr]),
  [['IND', 'BAL'], ['PIT', 'CIN'], ['DAL', 'DET'], ['CAR', 'ARI']]
);
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```powershell
node tools/test-simulation-season-adapter.js
```

Expected: FAIL because the current NFL branch only stops at `postseason_ready` and does not yet seed an exact 2014 Wild Card week.

- [ ] **Step 3: Implement exact NFL field seeding and Wild Card week generation**

In `simulation-season-adapter.js`, add focused NFL helpers:

```js
function buildNflConferenceField(rows){
  const divisionWinners = rows
    .filter((row) => row.divisionLeader || row.divisionWinner || row.clinchedDivision || Number(row.divisionRank || 0) === 1)
    .sort(compareStandingsRows)
    .slice(0, 4);
  const wildCards = rows
    .filter((row) => !divisionWinners.some((winner) => winner.teamAbbr === row.teamAbbr))
    .sort(compareStandingsRows)
    .slice(0, 2);

  return divisionWinners.concat(wildCards).map((row, index) => ({
    ...clone(row),
    seed: index + 1
  }));
}

function buildNflWildCardSchedule(postseasonState){
  const afc = clone(postseasonState?.playoffPicture?.afc || []);
  const nfc = clone(postseasonState?.playoffPicture?.nfc || []);
  return [
    { id: 'afc-wc-1', round: 'wild_card', conference: 'AFC', homeAbbr: afc[2]?.teamAbbr, awayAbbr: afc[5]?.teamAbbr },
    { id: 'afc-wc-2', round: 'wild_card', conference: 'AFC', homeAbbr: afc[3]?.teamAbbr, awayAbbr: afc[4]?.teamAbbr },
    { id: 'nfc-wc-1', round: 'wild_card', conference: 'NFC', homeAbbr: nfc[2]?.teamAbbr, awayAbbr: nfc[5]?.teamAbbr },
    { id: 'nfc-wc-2', round: 'wild_card', conference: 'NFC', homeAbbr: nfc[3]?.teamAbbr, awayAbbr: nfc[4]?.teamAbbr }
  ].filter((game) => game.homeAbbr && game.awayAbbr);
}
```

Then branch inside `buildSeededPostseasonState(nextState)`:

```js
if (getSimulationSportForState(nextState) === 'nfl') {
  const standings = normalizeSimulationStandingsRows(nextState, teamMeta);
  const afc = buildNflConferenceField(standings.filter((row) => row.conference === 'AFC'));
  const nfc = buildNflConferenceField(standings.filter((row) => row.conference === 'NFC'));
  return {
    ...existingState,
    phase: 'wild_card',
    currentRound: 'wild_card',
    playoffPicture: { afc, nfc },
    bracket: {
      wild_card: {
        afc: clone(buildNflWildCardSchedule({ playoffPicture: { afc } })),
        nfc: clone(buildNflWildCardSchedule({ playoffPicture: { nfc } }))
      }
    },
    currentWeekSchedule: buildNflWildCardSchedule({ playoffPicture: { afc, nfc } })
  };
}
```

- [ ] **Step 4: Re-run the adapter test and confirm it passes**

Run:

```powershell
node tools/test-simulation-season-adapter.js
```

Expected: PASS, with exact AFC/NFC seeds and Wild Card pairings.

- [ ] **Step 5: Commit**

```bash
git add simulation-season-adapter.js tools/test-simulation-season-adapter.js
git commit -m "feat: seed exact 2014 nfl playoff field"
```

---

### Task 2: Advance The NFL Bracket Through Divisional, Conference Championship, And Super Bowl

**Files:**
- Modify: `tools/test-simulation-season-adapter.js`
- Modify: `simulation-season-adapter.js`
- Test: `tools/test-simulation-season-adapter.js`

- [ ] **Step 1: Write the failing progression test for reseeding and completion**

Extend `tools/test-simulation-season-adapter.js` with a self-contained deterministic NFL playoff progression case:

```js
const seededNflPostseasonState = {
  simulationMode: 'nfl_mixed_era_single_player_v1',
  leagueShell: {
    anchorSeasonId: 'nfl_2014',
    anchorSeasonLabel: '2014 NFL',
    sport: 'nfl',
    teams: [
      { abbr: 'NE', name: 'New England Patriots', conference: 'AFC', division: 'East' },
      { abbr: 'DEN', name: 'Denver Broncos', conference: 'AFC', division: 'West' },
      { abbr: 'IND', name: 'Indianapolis Colts', conference: 'AFC', division: 'South' },
      { abbr: 'PIT', name: 'Pittsburgh Steelers', conference: 'AFC', division: 'North' },
      { abbr: 'CIN', name: 'Cincinnati Bengals', conference: 'AFC', division: 'North' },
      { abbr: 'BAL', name: 'Baltimore Ravens', conference: 'AFC', division: 'North' },
      { abbr: 'SEA', name: 'Seattle Seahawks', conference: 'NFC', division: 'West' },
      { abbr: 'GB', name: 'Green Bay Packers', conference: 'NFC', division: 'North' },
      { abbr: 'DAL', name: 'Dallas Cowboys', conference: 'NFC', division: 'East' },
      { abbr: 'CAR', name: 'Carolina Panthers', conference: 'NFC', division: 'South' },
      { abbr: 'ARI', name: 'Arizona Cardinals', conference: 'NFC', division: 'West' },
      { abbr: 'DET', name: 'Detroit Lions', conference: 'NFC', division: 'North' }
    ]
  },
  sourceSeasons: { sourceSeasonLabels: ['2014'] },
  draftState: {
    controlledTeamAbbr: 'NE',
    rostersByTeam: { NE: [], DEN: [], IND: [], PIT: [], CIN: [], BAL: [], SEA: [], GB: [], DAL: [], CAR: [], ARI: [], DET: [] },
    freeAgents: []
  },
  seasonState: {
    currentDay: 19,
    currentWeek: 19,
    standings: [],
    scheduleByDay: { 1: [] },
    lineupIdsByTeam: {},
    completedGameLogs: []
  },
  postseasonState: {
    phase: 'wild_card',
    currentRound: 'wild_card',
    playoffPicture: {
      afc: [
        { teamAbbr: 'NE', seed: 1 },
        { teamAbbr: 'DEN', seed: 2 },
        { teamAbbr: 'IND', seed: 3 },
        { teamAbbr: 'PIT', seed: 4 },
        { teamAbbr: 'CIN', seed: 5 },
        { teamAbbr: 'BAL', seed: 6 }
      ],
      nfc: [
        { teamAbbr: 'SEA', seed: 1 },
        { teamAbbr: 'GB', seed: 2 },
        { teamAbbr: 'DAL', seed: 3 },
        { teamAbbr: 'CAR', seed: 4 },
        { teamAbbr: 'ARI', seed: 5 },
        { teamAbbr: 'DET', seed: 6 }
      ]
    },
    currentWeekSchedule: [
      { id: 'afc-wc-1', round: 'wild_card', conference: 'AFC', homeAbbr: 'IND', awayAbbr: 'BAL', winner: 'BAL' },
      { id: 'afc-wc-2', round: 'wild_card', conference: 'AFC', homeAbbr: 'PIT', awayAbbr: 'CIN', winner: 'PIT' },
      { id: 'nfc-wc-1', round: 'wild_card', conference: 'NFC', homeAbbr: 'DAL', awayAbbr: 'DET', winner: 'DAL' },
      { id: 'nfc-wc-2', round: 'wild_card', conference: 'NFC', homeAbbr: 'CAR', awayAbbr: 'ARI', winner: 'CAR' }
    ]
  }
};

const progressingAdapter = createSimulationSeasonAdapter({
  slotId: 'nfl-postseason-progression',
  state: seededNflPostseasonState
});

const afterWildCard = progressingAdapter.simulateNextDay();
assert.equal(afterWildCard.postseasonState.phase, 'divisional');
assert.deepStrictEqual(
  afterWildCard.postseasonState.currentWeekSchedule.map((game) => [game.homeAbbr, game.awayAbbr]),
  [['NE', 'BAL'], ['DEN', 'PIT'], ['SEA', 'CAR'], ['GB', 'DAL']]
);

const afterConferenceTitles = createSimulationSeasonAdapter({
  slotId: 'nfl-super-bowl-setup',
  state: {
    ...afterWildCard,
    postseasonState: {
      ...afterWildCard.postseasonState,
      phase: 'conference_championship',
      currentRound: 'conference_championship',
      currentWeekSchedule: [
        { id: 'afc-cc', round: 'conference_championship', conference: 'AFC', homeAbbr: 'NE', awayAbbr: 'DEN', winner: 'NE' },
        { id: 'nfc-cc', round: 'conference_championship', conference: 'NFC', homeAbbr: 'SEA', awayAbbr: 'GB', winner: 'SEA' }
      ]
    }
  }
}).simulateNextDay();

assert.equal(afterConferenceTitles.postseasonState.phase, 'super_bowl');
assert.deepStrictEqual(
  afterConferenceTitles.postseasonState.currentWeekSchedule.map((game) => [game.homeAbbr, game.awayAbbr]),
  [['NE', 'SEA']]
);

const completedState = createSimulationSeasonAdapter({
  slotId: 'nfl-super-bowl-complete',
  state: {
    ...afterConferenceTitles,
    postseasonState: {
      ...afterConferenceTitles.postseasonState,
      phase: 'super_bowl',
      currentRound: 'super_bowl',
      currentWeekSchedule: [
        { id: 'super-bowl-xlix', round: 'super_bowl', conference: 'league', homeAbbr: 'NE', awayAbbr: 'SEA', winner: 'NE' }
      ]
    }
  }
}).simulateNextDay();

assert.equal(completedState.postseasonState.phase, 'completed');
assert.equal(completedState.postseasonState.champion.teamAbbr, 'NE');
assert.equal(completedState.postseasonState.runnerUp.teamAbbr, 'SEA');
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```powershell
node tools/test-simulation-season-adapter.js
```

Expected: FAIL because the current NFL postseason flow does not yet reseed divisional games or advance to a completed Super Bowl state.

- [ ] **Step 3: Implement NFL round advancement, reseeding, and completion**

In `simulation-season-adapter.js`, add focused NFL progression helpers:

```js
function buildNflDivisionalSchedule(postseasonState){
  const afc = clone(postseasonState?.playoffPicture?.afc || []);
  const nfc = clone(postseasonState?.playoffPicture?.nfc || []);
  const afcWinners = getWinningTeamsForRound(postseasonState, 'wild_card', 'AFC').sort((a, b) => Number(a.seed) - Number(b.seed));
  const nfcWinners = getWinningTeamsForRound(postseasonState, 'wild_card', 'NFC').sort((a, b) => Number(a.seed) - Number(b.seed));
  return [
    { id: 'afc-div-1', round: 'divisional', conference: 'AFC', homeAbbr: afc[0]?.teamAbbr, awayAbbr: afcWinners[afcWinners.length - 1]?.teamAbbr },
    { id: 'afc-div-2', round: 'divisional', conference: 'AFC', homeAbbr: afc[1]?.teamAbbr, awayAbbr: afcWinners[0]?.teamAbbr },
    { id: 'nfc-div-1', round: 'divisional', conference: 'NFC', homeAbbr: nfc[0]?.teamAbbr, awayAbbr: nfcWinners[nfcWinners.length - 1]?.teamAbbr },
    { id: 'nfc-div-2', round: 'divisional', conference: 'NFC', homeAbbr: nfc[1]?.teamAbbr, awayAbbr: nfcWinners[0]?.teamAbbr }
  ].filter((game) => game.homeAbbr && game.awayAbbr);
}

function buildNflConferenceChampionshipSchedule(postseasonState){
  const afcTeams = getWinningTeamsForRound(postseasonState, 'divisional', 'AFC').sort((a, b) => Number(a.seed) - Number(b.seed));
  const nfcTeams = getWinningTeamsForRound(postseasonState, 'divisional', 'NFC').sort((a, b) => Number(a.seed) - Number(b.seed));
  return [
    { id: 'afc-cc', round: 'conference_championship', conference: 'AFC', homeAbbr: afcTeams[0]?.teamAbbr, awayAbbr: afcTeams[1]?.teamAbbr },
    { id: 'nfc-cc', round: 'conference_championship', conference: 'NFC', homeAbbr: nfcTeams[0]?.teamAbbr, awayAbbr: nfcTeams[1]?.teamAbbr }
  ].filter((game) => game.homeAbbr && game.awayAbbr);
}

function buildNflSuperBowlSchedule(postseasonState){
  const afcChampion = getWinningTeamsForRound(postseasonState, 'conference_championship', 'AFC')[0];
  const nfcChampion = getWinningTeamsForRound(postseasonState, 'conference_championship', 'NFC')[0];
  return afcChampion && nfcChampion
    ? [{ id: 'super-bowl-xlix', round: 'super_bowl', conference: 'league', homeAbbr: afcChampion.teamAbbr, awayAbbr: nfcChampion.teamAbbr }]
    : [];
}
```

Then branch inside `finalizePostseasonRound()`:

```js
if (getSimulationSportForState(nextState) === 'nfl') {
  if (resolvedState.phase === 'wild_card' && roundIsComplete(resolvedState, 'wild_card')) {
    resolvedState.phase = 'divisional';
    resolvedState.currentRound = 'divisional';
    resolvedState.currentWeekSchedule = buildNflDivisionalSchedule(resolvedState);
  } else if (resolvedState.phase === 'divisional' && roundIsComplete(resolvedState, 'divisional')) {
    resolvedState.phase = 'conference_championship';
    resolvedState.currentRound = 'conference_championship';
    resolvedState.currentWeekSchedule = buildNflConferenceChampionshipSchedule(resolvedState);
  } else if (resolvedState.phase === 'conference_championship' && roundIsComplete(resolvedState, 'conference_championship')) {
    resolvedState.phase = 'super_bowl';
    resolvedState.currentRound = 'super_bowl';
    resolvedState.currentWeekSchedule = buildNflSuperBowlSchedule(resolvedState);
  } else if (resolvedState.phase === 'super_bowl' && roundIsComplete(resolvedState, 'super_bowl')) {
    const champion = getWinningTeamsForRound(resolvedState, 'super_bowl', 'league')[0];
    const runnerUp = getLosingTeamsForRound(resolvedState, 'super_bowl', 'league')[0];
    resolvedState.phase = 'completed';
    resolvedState.currentRound = 'completed';
    resolvedState.currentWeekSchedule = [];
    resolvedState.champion = buildPostseasonTeamMetadata(nextState, champion);
    resolvedState.runnerUp = buildPostseasonTeamMetadata(nextState, runnerUp);
    resolvedState.completedAt = Date.now();
  }
}
```

- [ ] **Step 4: Re-run the adapter test and confirm it passes**

Run:

```powershell
node tools/test-simulation-season-adapter.js
```

Expected: PASS, including divisional reseeding and completed champion assertions.

- [ ] **Step 5: Commit**

```bash
git add simulation-season-adapter.js tools/test-simulation-season-adapter.js
git commit -m "feat: advance nfl postseason through super bowl"
```

---

### Task 3: Render NFL Postseason States In The Shared Season Shell

**Files:**
- Modify: `tools/test-shared-season-shell-simulation.js`
- Modify: `rosterbate-season.html`
- Test: `tools/test-shared-season-shell-simulation.js`

- [ ] **Step 1: Write the failing shared-shell render test for NFL postseason states**

Extend `tools/test-shared-season-shell-simulation.js` with an NFL-specific adapter stub and assertions like:

```js
const nflPlayoffAdapterStub = {
  getState(){ return {}; },
  getNavItems(){ return [{ id: 'hub', label: 'Hub' }, { id: 'playoffs', label: 'Playoffs' }]; },
  getHubViewModel(){
    return {
      sport: 'nfl',
      leagueLabel: '2014 NFL Simulation',
      cycleLabel: 'Wild Card',
      currentWeek: 19,
      postseasonPhase: 'wild_card',
      primaryAction: { id: 'sim-day', label: 'Sim Week', enabled: true },
      controlledTeam: { abbr: 'NE', name: 'New England Patriots' },
      userRow: { teamAbbr: 'NE', w: 12, l: 4 }
    };
  },
  getPlayoffsViewModel(){
    return {
      sport: 'nfl',
      phase: 'wild_card',
      currentRound: 'wild_card',
      championship: { title: 'Super Bowl XLIX' },
      currentDaySchedule: [
        { round: 'wild_card', conference: 'AFC', homeAbbr: 'IND', awayAbbr: 'BAL' }
      ],
      playoffPicture: {
        afc: [{ seed: 1, teamName: 'New England Patriots', teamAbbr: 'NE' }],
        nfc: [{ seed: 1, teamName: 'Seattle Seahawks', teamAbbr: 'SEA' }]
      },
      bracket: {
        wild_card: {
          afc: [{ higherSeed: { teamAbbr: 'IND' }, lowerSeed: { teamAbbr: 'BAL' } }]
        }
      }
    };
  }
};

api.setSeasonModeAdapter(nflPlayoffAdapterStub);
api.goPage('playoffs');

assert.match(elements.playoffsContent.innerHTML, /Wild Card/i);
assert.match(elements.playoffsContent.innerHTML, /Bye/i);
assert.match(elements.playoffsContent.innerHTML, /Super Bowl XLIX/i);
assert.match(elements.playoffsContent.innerHTML, /IND/);
assert.match(elements.playoffsContent.innerHTML, /BAL/);
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```powershell
node tools/test-shared-season-shell-simulation.js
```

Expected: FAIL because the current shell still renders NBA-flavored postseason copy and does not yet present NFL bye/Super Bowl context cleanly.

- [ ] **Step 3: Implement NFL postseason Hub and Playoffs rendering**

Update `rosterbate-season.html` in the shared-shell simulation section:

```js
function renderSimulationHubInSharedShell(){
  const vm = SEASON_MODE_ADAPTER.getHubViewModel?.() || {};
  const sport = String(vm.sport || 'nba').trim().toLowerCase();
  const phase = String(vm.postseasonPhase || 'regular_season').trim().toLowerCase();
  const isNfl = sport === 'nfl';
  const cycleCopy = isNfl
    ? (phase === 'regular_season' ? `Week ${vm.currentWeek}` : formatLabel(phase))
    : vm.cycleLabel;
  const primaryActionLabel = vm.primaryAction?.label || (isNfl ? 'Sim Week' : 'Sim Day');
  // keep the shared layout, but swap phase summary, CTA copy, and labels for nfl postseason
}

function renderSimulationPlayoffsInSharedShell(){
  const vm = SEASON_MODE_ADAPTER.getPlayoffsViewModel?.() || {};
  const isNfl = String(vm.sport || '').trim().toLowerCase() === 'nfl';
  const championshipTitle = isNfl ? 'Super Bowl XLIX' : 'Championship';
  // render seeded afc/nfc fields, bye badges, current round schedule, and champion card
}
```

Also replace the old NFL placeholder copy with real postseason copy.

- [ ] **Step 4: Re-run the test and confirm it passes**

Run:

```powershell
node tools/test-shared-season-shell-simulation.js
```

Expected: PASS, with NFL postseason labels and Super Bowl copy rendering correctly.

- [ ] **Step 5: Commit**

```bash
git add rosterbate-season.html tools/test-shared-season-shell-simulation.js
git commit -m "feat: render nfl postseason in shared season shell"
```

---

### Task 4: Persist And Summarize NFL Postseason Story In Archive/Details

**Files:**
- Modify: `tools/test-simulation-universe-details.js`
- Modify: `historic-universe.html`
- Modify: `simulation-season-adapter.js`
- Test: `tools/test-simulation-universe-details.js`

- [ ] **Step 1: Write the failing archive/detail tests for NFL playoff summaries**

Extend `tools/test-simulation-universe-details.js` with:

```js
const nflWildCardState = buildState({
  simulationMode: 'nfl_mixed_era_single_player_v1',
  leagueShell: { anchorSeasonLabel: '2014 NFL', sport: 'nfl' },
  postseasonState: {
    phase: 'wild_card',
    currentRound: 'wild_card',
    champion: null,
    bracket: {
      wild_card: {
        afc: [{ higherSeed: { teamAbbr: 'IND' }, lowerSeed: { teamAbbr: 'BAL' } }],
        nfc: [{ higherSeed: { teamAbbr: 'DAL' }, lowerSeed: { teamAbbr: 'DET' } }]
      }
    }
  }
});

assert.deepStrictEqual(
  JSON.parse(JSON.stringify(context.buildSimulationPlayoffSummary({}, nflWildCardState))),
  {
    title: 'NFL Wild Card weekend is live',
    body: 'The 2014 bracket is open, the bye teams are waiting, and the wild-card winners will advance to the divisional round.',
    meta: ['Phase: Wild Card', 'Byes: Seeds 1 and 2']
  }
);

const nflCompletedState = buildState({
  simulationMode: 'nfl_mixed_era_single_player_v1',
  leagueShell: { anchorSeasonLabel: '2014 NFL', sport: 'nfl' },
  postseasonState: {
    phase: 'completed',
    champion: { teamAbbr: 'NE', teamName: 'New England Patriots' },
    runnerUp: { teamAbbr: 'SEA', teamName: 'Seattle Seahawks' },
    championship: { title: 'Super Bowl XLIX', result: 'NE beat SEA 28-24' }
  }
});

assert.equal(
  context.buildSimulationPlayoffSummary({}, nflCompletedState).title,
  'Super Bowl champion crowned'
);
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```powershell
node tools/test-simulation-universe-details.js
```

Expected: FAIL because the current archive/detail helpers still tell the NBA postseason story.

- [ ] **Step 3: Implement NFL postseason archive/detail summaries**

Update `historic-universe.html` to branch on NFL postseason phases:

```js
if (sport === 'nfl' && phase === 'wild_card') {
  return {
    title: 'NFL Wild Card weekend is live',
    body: 'The 2014 bracket is open, the bye teams are waiting, and the wild-card winners will advance to the divisional round.',
    meta: ['Phase: Wild Card', 'Byes: Seeds 1 and 2']
  };
}

if (sport === 'nfl' && phase === 'super_bowl') {
  return {
    title: 'Super Bowl matchup is set',
    body: `${championship?.matchup?.homeAbbr || 'AFC champion'} vs ${championship?.matchup?.awayAbbr || 'NFC champion'} will decide the title in Super Bowl XLIX.`,
    meta: ['Phase: Super Bowl', championship?.title || 'Super Bowl XLIX']
  };
}

if (sport === 'nfl' && phase === 'completed') {
  return {
    title: 'Super Bowl champion crowned',
    body: `${champion?.teamAbbr || 'Champion'} beat ${runnerUp?.teamAbbr || 'runner-up'} and closed the 2014 NFL simulation season with the Lombardi Trophy.`,
    meta: ['Phase: Completed', championship?.title || 'Super Bowl XLIX']
  };
}
```

If needed, add the corresponding `championship`, `champion`, and `runnerUp` fields to the adapter’s completed NFL state in a render-friendly shape before the helpers consume them.

- [ ] **Step 4: Re-run the test and confirm it passes**

Run:

```powershell
node tools/test-simulation-universe-details.js
```

Expected: PASS with NFL postseason summaries covered.

- [ ] **Step 5: Commit**

```bash
git add historic-universe.html simulation-season-adapter.js tools/test-simulation-universe-details.js
git commit -m "feat: add nfl postseason archive summaries"
```

---

### Task 5: Run The Focused NFL Postseason Verification Sweep

**Files:**
- Test only: files touched in Tasks 1-4

- [ ] **Step 1: Run the focused NFL postseason regression sweep**

Run:

```powershell
node tools/test-simulation-season-adapter.js
node tools/test-shared-season-shell-simulation.js
node tools/test-simulation-universe-details.js
git diff --check
```

Expected:

- all three Node tests PASS
- `git diff --check` returns clean or only CRLF normalization warnings, not whitespace errors

- [ ] **Step 2: Commit any final fixups if the sweep exposed issues**

If anything needed to be patched during the sweep:

```bash
git add simulation-season-adapter.js rosterbate-season.html historic-universe.html tools/test-simulation-season-adapter.js tools/test-shared-season-shell-simulation.js tools/test-simulation-universe-details.js
git commit -m "fix: polish nfl postseason completion"
```

- [ ] **Step 3: Request final code review**

Use the `requesting-code-review` skill before merging or pushing.
