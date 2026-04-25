# NFL Fantasy-Slot Roster Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make NFL roster management in the shared simulation season shell feel like the NBA sim season while using fantasy football lineup slots, manual user control, and valid-lineup gating for `Sim Week`.

**Architecture:** Keep `rosterbate-season.html` as the shared shell and extend the existing NFL simulation runtime, adapter, and engine rather than inventing a second season experience. Store NFL lineup state as slot assignments, derive a legacy starter array for compatibility, block weekly sim when the user lineup is invalid, and let the engine respect those slot assignments for the controlled team while auto-filling valid CPU lineups.

**Tech Stack:** Vanilla JavaScript, shared season shell HTML, simulation runtime/adapter/engine modules, Node-based regression tests in `tools/`, PowerShell, git

---

## File Map

- Modify: `simulation-mode-runtime.js`
  - Add NFL fantasy-slot definitions, slot eligibility helpers, slot-based lineup normalization/validation, suggestion logic, and cleanup after waivers/trades.

- Modify: `simulation-season-adapter.js`
  - Expose richer NFL roster view models, slot assignments, readiness state, invalid-lineup details, and gate weekly simulation when the controlled NFL team lineup is illegal.

- Modify: `rosterbate-season.html`
  - Render the NFL shared-shell roster screen with lineup slot cards, bench assignment actions, readiness warnings, and recommendation affordances while preserving the existing NBA path.

- Modify: `simulation-league-engine.js`
  - Read the user's NFL slot lineup for the controlled team and auto-build valid NFL fantasy lineups for CPU teams.

- Modify: `tools/test-simulation-mode-runtime.js`
  - Lock NFL slot definitions, slot validation, lineup suggestion behavior, and cleanup after waivers/trades.

- Modify: `tools/test-simulation-season-adapter.js`
  - Lock NFL roster view-model shape, hub CTA readiness behavior, and blocked `Sim Week` behavior when the lineup is invalid.

- Modify: `tools/test-shared-season-shell-simulation.js`
  - Lock NFL shared-shell roster rendering, slot-card states, and the lineup-warning experience.

- Modify: `tools/test-simulation-league-engine.js`
  - Lock controlled-team slot usage and CPU valid-lineup auto-fill behavior for NFL weekly sims.

---

### Task 1: Introduce NFL Slot-Based Lineup State In The Runtime

**Files:**
- Modify: `tools/test-simulation-mode-runtime.js`
- Modify: `simulation-mode-runtime.js`
- Test: `tools/test-simulation-mode-runtime.js`

- [ ] **Step 1: Write the failing runtime tests for NFL slot state, validation, and suggestions**

Extend `tools/test-simulation-mode-runtime.js` with:

```js
const {
  getSimulationStarterSlots,
  setSimulationLineup,
  validateSimulationLineup,
  buildSuggestedSimulationLineup
} = runtimeApi;

const nflFantasyShell = {
  sport: 'nfl',
  teams: [{ abbr: 'GB', name: 'Green Bay Packers', conference: 'NFC', division: 'North' }]
};

const nflFantasyRoster = [
  { id: 12, name: 'Aaron Rodgers', pos: 'QB', designation: 'ACTIVE', mixedEraOverall: 99, fp: 26 },
  { id: 27, name: 'Eddie Lacy', pos: 'RB', designation: 'ACTIVE', mixedEraOverall: 93, fp: 17 },
  { id: 44, name: 'James Starks', pos: 'RB', designation: 'ACTIVE', mixedEraOverall: 81, fp: 10 },
  { id: 87, name: 'Jordy Nelson', pos: 'WR', designation: 'ACTIVE', mixedEraOverall: 96, fp: 19 },
  { id: 18, name: 'Randall Cobb', pos: 'WR', designation: 'ACTIVE', mixedEraOverall: 94, fp: 18 },
  { id: 89, name: 'Andrew Quarless', pos: 'TE', designation: 'ACTIVE', mixedEraOverall: 76, fp: 8 },
  { id: 84, name: 'Davante Adams', pos: 'WR', designation: 'ACTIVE', mixedEraOverall: 82, fp: 11 },
  { id: 2, name: 'Mason Crosby', pos: 'K', designation: 'ACTIVE', mixedEraOverall: 78, fp: 8 },
  { id: 9001, name: 'Packers DST', pos: 'DST', designation: 'ACTIVE', mixedEraOverall: 83, fp: 9 }
];

assert.deepStrictEqual(
  getSimulationStarterSlots(nflFantasyShell),
  ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'TE', 'FLEX', 'K', 'DST'],
  'nfl starter slots should be named fantasy lineup slots rather than duplicated raw positions'
);

const validLineupState = setSimulationLineup({
  simulationMode: 'nfl_mixed_era_single_player_v1',
  leagueShell: nflFantasyShell,
  draftState: { rostersByTeam: { GB: nflFantasyRoster } },
  seasonState: { lineupSlotsByTeam: {}, lineupIdsByTeam: {}, activityLog: [] }
}, 'GB', {
  QB: 12,
  RB1: 27,
  RB2: 44,
  WR1: 87,
  WR2: 18,
  TE: 89,
  FLEX: 84,
  K: 2,
  DST: 9001
});

assert.deepStrictEqual(validLineupState.seasonState.lineupSlotsByTeam.GB, {
  QB: 12,
  RB1: 27,
  RB2: 44,
  WR1: 87,
  WR2: 18,
  TE: 89,
  FLEX: 84,
  K: 2,
  DST: 9001
});
assert.deepStrictEqual(
  validLineupState.seasonState.lineupIdsByTeam.GB,
  [12, 27, 44, 87, 18, 89, 84, 2, 9001],
  'nfl slot state should still derive a flat starter cache for compatibility'
);
assert.deepStrictEqual(
  validateSimulationLineup(validLineupState, 'GB'),
  { valid: true, issues: [] }
);

const invalidLineupState = setSimulationLineup({
  simulationMode: 'nfl_mixed_era_single_player_v1',
  leagueShell: nflFantasyShell,
  draftState: { rostersByTeam: { GB: nflFantasyRoster.map((player) => ({ ...player, designation: player.id === 89 ? 'OUT' : player.designation })) } },
  seasonState: { lineupSlotsByTeam: {}, lineupIdsByTeam: {}, activityLog: [] }
}, 'GB', {
  QB: 12,
  RB1: 27,
  RB2: 44,
  WR1: 87,
  WR2: 18,
  TE: 89,
  FLEX: 18,
  K: 2,
  DST: 9001
});

assert.deepStrictEqual(
  validateSimulationLineup(invalidLineupState, 'GB'),
  {
    valid: false,
    issues: [
      { slot: 'TE', code: 'player_out', message: 'TE starter is OUT.' },
      { slot: 'FLEX', code: 'duplicate_player', message: 'Randall Cobb is already assigned to another slot.' }
    ]
  }
);

assert.deepStrictEqual(
  buildSuggestedSimulationLineup({
    simulationMode: 'nfl_mixed_era_single_player_v1',
    leagueShell: nflFantasyShell,
    draftState: { rostersByTeam: { GB: nflFantasyRoster } },
    seasonState: { lineupSlotsByTeam: {}, lineupIdsByTeam: {}, activityLog: [] }
  }, 'GB'),
  {
    QB: 12,
    RB1: 27,
    RB2: 44,
    WR1: 87,
    WR2: 18,
    TE: 89,
    FLEX: 84,
    K: 2,
    DST: 9001
  },
  'suggested nfl lineup should fill a legal fantasy lineup from the best eligible players'
);
```

- [ ] **Step 2: Run the runtime test and verify it fails**

Run:

```powershell
node tools/test-simulation-mode-runtime.js
```

Expected: FAIL because the runtime still uses unnamed NFL starter slots and has no slot-aware validation or suggestion helpers.

- [ ] **Step 3: Implement NFL slot definitions, validation, and suggestion helpers**

In `simulation-mode-runtime.js`, add focused NFL lineup helpers:

```js
function getSimulationStarterSlots(shell){
  if (getSimulationSport(shell) === 'nfl') {
    return ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'TE', 'FLEX', 'K', 'DST'];
  }
  return ['PG', 'SG', 'SF', 'PF', 'C'];
}

function getSimulationLineupSlotTemplate(shell){
  return Object.fromEntries(getSimulationStarterSlots(shell).map((slot) => [slot, null]));
}

function getNflSlotEligibilityMap(){
  return {
    QB: ['QB'],
    RB1: ['RB'],
    RB2: ['RB'],
    WR1: ['WR'],
    WR2: ['WR'],
    TE: ['TE'],
    FLEX: ['RB', 'WR', 'TE'],
    K: ['K'],
    DST: ['DST']
  };
}

function normalizeSimulationLineupSlots(shell, lineupValue){
  const template = getSimulationLineupSlotTemplate(shell);
  if (getSimulationSport(shell) !== 'nfl') {
    return template;
  }
  Object.keys(template).forEach((slot) => {
    const value = lineupValue && typeof lineupValue === 'object' ? lineupValue[slot] : null;
    template[slot] = Number.isFinite(Number(value)) ? Number(value) : null;
  });
  return template;
}
```

Then implement the validation and suggestion helpers:

```js
function validateSimulationLineup(state, teamAbbr){
  const shell = normalizeShell(state?.leagueShell || {});
  if (getSimulationSport(shell) !== 'nfl') {
    return { valid: true, issues: [] };
  }
  const key = normalizeTeamAbbr(teamAbbr);
  const slotMap = clone(state?.seasonState?.lineupSlotsByTeam?.[key] || {});
  const roster = Array.isArray(state?.draftState?.rostersByTeam?.[key]) ? state.draftState.rostersByTeam[key] : [];
  const byId = new Map(roster.map((player) => [Number(player.id), player]));
  const eligibility = getNflSlotEligibilityMap();
  const seenPlayerIds = new Set();
  const issues = [];

  Object.keys(getSimulationLineupSlotTemplate(shell)).forEach((slot) => {
    const playerId = Number(slotMap?.[slot]);
    if (!playerId) {
      issues.push({ slot, code: 'missing_player', message: `${slot} is empty.` });
      return;
    }
    const player = byId.get(playerId);
    if (!player) {
      issues.push({ slot, code: 'player_missing', message: `${slot} starter is no longer on the roster.` });
      return;
    }
    const position = getSimulationPlayerPosition(player);
    if (!eligibility[slot].includes(position)) {
      issues.push({ slot, code: 'invalid_position', message: `${player.name} is not eligible for ${slot}.` });
    }
    if (String(player?.designation || 'ACTIVE').trim().toUpperCase() === 'OUT') {
      issues.push({ slot, code: 'player_out', message: `${slot} starter is OUT.` });
    }
    if (seenPlayerIds.has(playerId)) {
      issues.push({ slot, code: 'duplicate_player', message: `${player.name} is already assigned to another slot.` });
    }
    seenPlayerIds.add(playerId);
  });

  return { valid: issues.length === 0, issues };
}

function buildSuggestedSimulationLineup(state, teamAbbr){
  const shell = normalizeShell(state?.leagueShell || {});
  if (getSimulationSport(shell) !== 'nfl') {
    return null;
  }
  const key = normalizeTeamAbbr(teamAbbr);
  const roster = sortPlayers(state?.draftState?.rostersByTeam?.[key] || []);
  const usedIds = new Set();
  const eligibility = getNflSlotEligibilityMap();
  return Object.keys(getSimulationLineupSlotTemplate(shell)).reduce((slots, slot) => {
    const candidate = roster.find((player) => (
      !usedIds.has(Number(player.id)) &&
      String(player?.designation || 'ACTIVE').trim().toUpperCase() !== 'OUT' &&
      eligibility[slot].includes(getSimulationPlayerPosition(player))
    ));
    slots[slot] = candidate ? Number(candidate.id) : null;
    if (candidate) usedIds.add(Number(candidate.id));
    return slots;
  }, {});
}
```

- [ ] **Step 4: Update `setSimulationLineup()` to store slot state and maintain a derived starter cache**

In `simulation-mode-runtime.js`, branch the existing mutation:

```js
function setSimulationLineup(state, teamAbbr, lineupValue){
  const next = clone(state);
  const key = normalizeTeamAbbr(teamAbbr);
  if (!key) return next;

  next.seasonState = next.seasonState || {};
  next.seasonState.lineupSlotsByTeam = next.seasonState.lineupSlotsByTeam || {};
  next.seasonState.lineupIdsByTeam = next.seasonState.lineupIdsByTeam || {};
  next.seasonState.activityLog = Array.isArray(next.seasonState.activityLog) ? next.seasonState.activityLog : [];

  if (getSimulationSport(next.leagueShell || {}) === 'nfl') {
    const slots = normalizeSimulationLineupSlots(next.leagueShell || {}, lineupValue);
    next.seasonState.lineupSlotsByTeam[key] = slots;
    next.seasonState.lineupIdsByTeam[key] = getSimulationStarterSlots(next.leagueShell || {})
      .map((slot) => Number(slots[slot] || 0))
      .filter((id) => Number.isFinite(id) && id > 0);
  } else {
    next.seasonState.lineupIdsByTeam[key] = (Array.isArray(lineupValue) ? lineupValue : []).map((id) => Number(id));
  }

  next.seasonState.activityLog.unshift({
    type: 'lineup',
    teamAbbr: key,
    title: `${key} updated its lineup`,
    ts: Date.now()
  });
  return next;
}
```

- [ ] **Step 5: Clear invalid slot assignments after waivers and trades**

Add a shared cleanup helper in `simulation-mode-runtime.js` and call it from both `claimSimulationFreeAgent()` and `applySimulationTrade()`:

```js
function pruneLineupState(next, teamAbbr, removedPlayerIds){
  pruneLineupIds(next, teamAbbr, removedPlayerIds);
  const slots = next?.seasonState?.lineupSlotsByTeam?.[teamAbbr];
  if (!slots || typeof slots !== 'object') return;
  const removedIds = new Set((Array.isArray(removedPlayerIds) ? removedPlayerIds : []).map(Number));
  Object.keys(slots).forEach((slot) => {
    if (removedIds.has(Number(slots[slot]))) {
      slots[slot] = null;
    }
  });
}
```

Replace the current calls:

```js
pruneLineupState(next, teamAbbr, [dropId]);
pruneLineupState(next, fromTeamAbbr, Array.from(outgoingIds));
pruneLineupState(next, toTeamAbbr, Array.from(incomingIds));
```

- [ ] **Step 6: Re-run the runtime test and confirm it passes**

Run:

```powershell
node tools/test-simulation-mode-runtime.js
```

Expected: PASS, with named NFL lineup slots, valid and invalid lineup detection, slot suggestions, and slot cleanup after roster changes.

- [ ] **Step 7: Commit**

```bash
git add simulation-mode-runtime.js tools/test-simulation-mode-runtime.js
git commit -m "feat: add nfl fantasy-slot lineup runtime"
```

---

### Task 2: Expose NFL Slot View Models And Block Invalid `Sim Week`

**Files:**
- Modify: `tools/test-simulation-season-adapter.js`
- Modify: `simulation-season-adapter.js`
- Test: `tools/test-simulation-season-adapter.js`

- [ ] **Step 1: Write the failing adapter tests for NFL roster view and sim gating**

Extend `tools/test-simulation-season-adapter.js` with:

```js
const nflRosterPlayers = [
  { id: 12, name: 'Aaron Rodgers', pos: 'QB', designation: 'ACTIVE', mixedEraOverall: 99, fp: 26 },
  { id: 27, name: 'Eddie Lacy', pos: 'RB', designation: 'ACTIVE', mixedEraOverall: 93, fp: 17 },
  { id: 44, name: 'James Starks', pos: 'RB', designation: 'ACTIVE', mixedEraOverall: 81, fp: 10 },
  { id: 87, name: 'Jordy Nelson', pos: 'WR', designation: 'ACTIVE', mixedEraOverall: 96, fp: 19 },
  { id: 18, name: 'Randall Cobb', pos: 'WR', designation: 'ACTIVE', mixedEraOverall: 94, fp: 18 },
  { id: 89, name: 'Andrew Quarless', pos: 'TE', designation: 'ACTIVE', mixedEraOverall: 76, fp: 8 },
  { id: 84, name: 'Davante Adams', pos: 'WR', designation: 'ACTIVE', mixedEraOverall: 82, fp: 11 },
  { id: 2, name: 'Mason Crosby', pos: 'K', designation: 'ACTIVE', mixedEraOverall: 78, fp: 8 },
  { id: 9001, name: 'Packers DST', pos: 'DST', designation: 'ACTIVE', mixedEraOverall: 83, fp: 9 }
];

const nflAdapter = createSimulationSeasonAdapter({
  slotId: 'nfl-slot-roster',
  state: {
    simulationMode: 'nfl_mixed_era_single_player_v1',
    leagueShell: {
      anchorSeasonLabel: '2014 NFL',
      sport: 'nfl',
      teams: [{ abbr: 'GB', name: 'Green Bay Packers', conference: 'NFC', division: 'North' }]
    },
    draftState: {
      controlledTeamAbbr: 'GB',
      rostersByTeam: { GB: nflRosterPlayers },
      freeAgents: []
    },
    seasonState: {
      currentDay: 1,
      currentWeek: 1,
      scheduleByDay: { 1: [] },
      standings: [{ teamAbbr: 'GB', conference: 'NFC', division: 'North', w: 0, l: 0, pf: 0, pa: 0 }],
      lineupSlotsByTeam: {
        GB: { QB: 12, RB1: 27, RB2: 44, WR1: 87, WR2: 18, TE: 89, FLEX: 84, K: 2, DST: 9001 }
      },
      lineupIdsByTeam: { GB: [12, 27, 44, 87, 18, 89, 84, 2, 9001] },
      activityLog: [],
      completedGameLogs: []
    },
    postseasonState: { phase: 'regular_season' }
  }
});

const rosterVm = nflAdapter.getRosterViewModel();
assert.equal(rosterVm.sport, 'nfl');
assert.deepStrictEqual(Object.keys(rosterVm.lineupSlots), ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'TE', 'FLEX', 'K', 'DST']);
assert.equal(rosterVm.validation.valid, true);
assert.equal(rosterVm.readyLabel, 'Ready For Week');
assert.equal(rosterVm.bench.length, 0);

const invalidNflAdapter = createSimulationSeasonAdapter({
  slotId: 'nfl-slot-roster-invalid',
  state: {
    ...nflAdapter.getState(),
    seasonState: {
      ...nflAdapter.getState().seasonState,
      lineupSlotsByTeam: { GB: { QB: 12, RB1: 27, RB2: 44, WR1: 87, WR2: 18, TE: null, FLEX: 84, K: 2, DST: 9001 } },
      lineupIdsByTeam: { GB: [12, 27, 44, 87, 18, 84, 2, 9001] }
    }
  }
});

assert.equal(invalidNflAdapter.getHubViewModel().primaryAction.id, 'fix-lineup');
assert.equal(invalidNflAdapter.getHubViewModel().primaryAction.label, 'Fix Lineup');

const blockedState = invalidNflAdapter.simulateNextDay();
assert.equal(blockedState.seasonState.currentWeek, 1);
assert.equal(blockedState.seasonState.activityLog[0].type, 'lineup-warning');
assert.match(blockedState.seasonState.activityLog[0].title, /must fix/i);
```

- [ ] **Step 2: Run the adapter test and verify it fails**

Run:

```powershell
node tools/test-simulation-season-adapter.js
```

Expected: FAIL because the adapter currently returns a simple lineup and bench split and still advances NFL weeks without validating the user lineup.

- [ ] **Step 3: Teach the adapter to expose slot-aware NFL roster view models**

In `simulation-season-adapter.js`, update `getRosterViewModel()`:

```js
getRosterViewModel(){
  const roster = getControlledRoster(state);
  const sport = getSimulationSportForState(state);
  if (sport !== 'nfl') {
    const lineupIdList = Array.isArray(state?.seasonState?.lineupIdsByTeam?.[getControlledTeamAbbr(state)])
      ? state.seasonState.lineupIdsByTeam[getControlledTeamAbbr(state)]
      : [];
    const lineupIds = new Set(lineupIdList);
    return {
      sport,
      starterSlots: getSimulationStarterSlotsForState(state),
      roster,
      lineup: lineupIdList
        .map((playerId) => roster.find((player) => Number(player?.id) === Number(playerId)))
        .filter(Boolean)
        .map((player) => clone(player)),
      bench: roster.filter((player) => !lineupIds.has(player.id)).map((player) => clone(player))
    };
  }

  const teamAbbr = getControlledTeamAbbr(state);
  const slotMap = clone(state?.seasonState?.lineupSlotsByTeam?.[teamAbbr] || {});
  const validation = runtimeApi.validateSimulationLineup(clone(state), teamAbbr);
  const suggested = runtimeApi.buildSuggestedSimulationLineup(clone(state), teamAbbr) || {};
  const assignedIds = new Set(Object.values(slotMap).map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0));

  return {
    sport,
    starterSlots: getSimulationStarterSlotsForState(state),
    lineupSlots: Object.fromEntries(
      getSimulationStarterSlotsForState(state).map((slot) => [
        slot,
        {
          slot,
          playerId: Number(slotMap?.[slot] || 0) || null,
          player: roster.find((player) => Number(player?.id) === Number(slotMap?.[slot])) || null,
          suggestedPlayerId: Number(suggested?.[slot] || 0) || null
        }
      ])
    ),
    validation,
    readyLabel: validation.valid ? 'Ready For Week' : `${validation.issues.length} lineup issues to fix`,
    recommendationSummary: validation.valid ? 'Starting lineup is legal.' : 'Suggested fixes are available below.',
    roster,
    bench: roster.filter((player) => !assignedIds.has(Number(player.id))).map((player) => clone(player))
  };
}
```

- [ ] **Step 4: Block invalid NFL sim advancement and redirect the primary action to the roster screen**

Update `getSimulationPrimaryAction()` in `simulation-season-adapter.js`:

```js
function getSimulationPrimaryAction(state){
  const sport = getSimulationSportForState(state);
  const postseasonPhase = String(state?.postseasonState?.phase || 'regular_season').trim().toLowerCase();
  if (sport !== 'nfl') {
    return { id: 'sim-day', label: 'Sim Day' };
  }
  const validation = runtimeApi.validateSimulationLineup(clone(state), getControlledTeamAbbr(state));
  if (!validation.valid) {
    return { id: 'fix-lineup', label: 'Fix Lineup' };
  }
  if (postseasonPhase === 'completed') {
    return { id: 'season-complete', label: 'Season Complete' };
  }
  if (postseasonPhase === 'postseason_ready') {
    return { id: 'review-playoffs', label: 'Review Playoffs' };
  }
  return { id: 'sim-day', label: 'Sim Week' };
}
```

Then gate `simulateNextDay()`:

```js
if (sport === 'nfl') {
  const validation = runtimeApi.validateSimulationLineup(clone(state), getControlledTeamAbbr(state));
  if (!validation.valid) {
    state = {
      ...clone(state),
      seasonState: {
        ...clone(state?.seasonState || {}),
        activityLog: [
          {
            type: 'lineup-warning',
            teamAbbr: getControlledTeamAbbr(state),
            title: `${getControlledTeamAbbr(state)} must fix its lineup before simming Week ${Number(state?.seasonState?.currentWeek || 1)}.`,
            ts: Date.now()
          }
        ].concat(clone(state?.seasonState?.activityLog || []))
      }
    };
    return this.getState();
  }
}
```

- [ ] **Step 5: Re-run the adapter test and confirm it passes**

Run:

```powershell
node tools/test-simulation-season-adapter.js
```

Expected: PASS, with slot-aware NFL roster view models and invalid-lineup sim blocking covered.

- [ ] **Step 6: Commit**

```bash
git add simulation-season-adapter.js tools/test-simulation-season-adapter.js
git commit -m "feat: gate nfl weekly sim on valid fantasy lineup"
```

---

### Task 3: Render NFL Slot Cards And Bench Controls In The Shared Shell

**Files:**
- Modify: `tools/test-shared-season-shell-simulation.js`
- Modify: `rosterbate-season.html`
- Test: `tools/test-shared-season-shell-simulation.js`

- [ ] **Step 1: Write the failing shared-shell UI test for NFL slot cards**

Extend `tools/test-shared-season-shell-simulation.js` with an NFL roster adapter stub:

```js
const nflRosterAdapterStub = {
  getState(){ return {}; },
  getNavItems(){ return [{ id: 'hub', label: 'Hub' }, { id: 'roster', label: 'Roster' }]; },
  getHubViewModel(){
    return {
      sport: 'nfl',
      leagueLabel: '2014 NFL Simulation',
      shellLabel: '2014 NFL Shell',
      primaryAction: { id: 'fix-lineup', label: 'Fix Lineup' },
      sourceSeasonLabels: ['2014'],
      recentActivity: []
    };
  },
  getRosterViewModel(){
    return {
      sport: 'nfl',
      readyLabel: '2 lineup issues to fix',
      recommendationSummary: 'Suggested fixes are available below.',
      validation: {
        valid: false,
        issues: [
          { slot: 'TE', code: 'missing_player', message: 'TE is empty.' },
          { slot: 'DST', code: 'missing_player', message: 'DST is empty.' }
        ]
      },
      starterSlots: ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'TE', 'FLEX', 'K', 'DST'],
      lineupSlots: {
        QB: { slot: 'QB', playerId: 12, player: { id: 12, name: 'Aaron Rodgers', pos: 'QB', designation: 'ACTIVE' }, suggestedPlayerId: 12 },
        RB1: { slot: 'RB1', playerId: 27, player: { id: 27, name: 'Eddie Lacy', pos: 'RB', designation: 'ACTIVE' }, suggestedPlayerId: 27 },
        RB2: { slot: 'RB2', playerId: 44, player: { id: 44, name: 'James Starks', pos: 'RB', designation: 'ACTIVE' }, suggestedPlayerId: 44 },
        WR1: { slot: 'WR1', playerId: 87, player: { id: 87, name: 'Jordy Nelson', pos: 'WR', designation: 'ACTIVE' }, suggestedPlayerId: 87 },
        WR2: { slot: 'WR2', playerId: 18, player: { id: 18, name: 'Randall Cobb', pos: 'WR', designation: 'ACTIVE' }, suggestedPlayerId: 18 },
        TE: { slot: 'TE', playerId: null, player: null, suggestedPlayerId: 89 },
        FLEX: { slot: 'FLEX', playerId: 84, player: { id: 84, name: 'Davante Adams', pos: 'WR', designation: 'ACTIVE' }, suggestedPlayerId: 84 },
        K: { slot: 'K', playerId: 2, player: { id: 2, name: 'Mason Crosby', pos: 'K', designation: 'ACTIVE' }, suggestedPlayerId: 2 },
        DST: { slot: 'DST', playerId: null, player: null, suggestedPlayerId: 9001 }
      },
      bench: [
        { id: 89, name: 'Andrew Quarless', pos: 'TE', designation: 'ACTIVE' },
        { id: 9001, name: 'Packers DST', pos: 'DST', designation: 'ACTIVE' }
      ]
    };
  }
};

api.setSeasonModeAdapter(nflRosterAdapterStub);
api.goPage('roster');

assert.match(elements.rosterContent.innerHTML, /QB/i);
assert.match(elements.rosterContent.innerHTML, /RB1/i);
assert.match(elements.rosterContent.innerHTML, /2 lineup issues to fix/i);
assert.match(elements.rosterContent.innerHTML, /TE is empty/i);
assert.match(elements.rosterContent.innerHTML, /Bench/i);
assert.match(elements.rosterContent.innerHTML, /Andrew Quarless/i);
assert.match(elements.rosterContent.innerHTML, /Use Suggestion/i);
```

- [ ] **Step 2: Run the shared-shell test and verify it fails**

Run:

```powershell
node tools/test-shared-season-shell-simulation.js
```

Expected: FAIL because the shared shell currently renders a generic lineup and bench layout instead of NFL slot cards with warnings and recommendations.

- [ ] **Step 3: Render NFL lineup slot cards, warnings, and bench actions in `rosterbate-season.html`**

Update `renderSimulationRosterInSharedShell()` with an NFL branch:

```js
function renderSimulationRosterInSharedShell(){
  const vm = SEASON_MODE_ADAPTER.getRosterViewModel?.() || {};
  if (String(vm?.sport || '').trim().toLowerCase() !== 'nfl') {
    return renderLegacySimulationRoster(vm);
  }

  const issueMap = new Map((vm.validation?.issues || []).map((issue) => [issue.slot, issue]));
  const slotCards = (vm.starterSlots || []).map((slot) => {
    const slotState = vm.lineupSlots?.[slot] || { slot, player: null, suggestedPlayerId: null };
    const issue = issueMap.get(slot) || null;
    return `
      <div class="season-now-card ${issue ? 'alert' : slotState.player ? 'live' : 'info'} nfl-slot-card">
        <div class="season-now-label">${slot}</div>
        <div class="season-now-value">${slotState.player?.name || 'Empty Slot'}</div>
        <div class="season-now-copy">${issue?.message || `${slotState.player?.pos || 'No player assigned yet.'}`}</div>
        <div class="season-inline-actions">
          ${slotState.player ? `<button type="button" class="lineup-move-btn" onclick="clearSimulationLineupSlot('${slot}')">Bench</button>` : ''}
          ${slotState.suggestedPlayerId ? `<button type="button" class="lineup-move-btn" onclick="useSuggestedSimulationSlot('${slot}')">Use Suggestion</button>` : ''}
        </div>
      </div>
    `;
  }).join('');

  const benchCards = (vm.bench || []).map((player) => `
    <div class="picker-card">
      <div class="picker-copy">
        <div class="picker-title">${player.name}</div>
        <div class="picker-meta">${player.pos} - ${player.designation || 'ACTIVE'}</div>
      </div>
      <div class="season-inline-actions">
        ${(vm.starterSlots || []).map((slot) => (
          getNflSimulationSlotEligibility(slot).includes(String(player.pos || '').trim().toUpperCase())
            ? `<button type="button" class="lineup-move-btn" onclick="assignSimulationBenchPlayerToSlot(${Number(player.id)}, '${slot}')">${slot}</button>`
            : ''
        )).join('')}
      </div>
    </div>
  `).join('');

  rosterContent.innerHTML = `
    <div class="season-page-note ${vm.validation?.valid ? '' : 'alert'}">${vm.readyLabel}</div>
    <div class="season-soft-muted" style="margin-bottom:12px;">${vm.recommendationSummary || ''}</div>
    <div class="comm-hero-stats">${slotCards}</div>
    <div class="card" style="margin-top:14px;">
      <div class="season-subbar-copy">Bench</div>
      <div class="picker-shell">${benchCards || '<div class="season-soft-muted">No bench players available.</div>'}</div>
    </div>
  `;
}
```

Also add the small shared-shell helpers the buttons call:

```js
function getNflSimulationSlotEligibility(slot){
  return ({
    QB: ['QB'],
    RB1: ['RB'],
    RB2: ['RB'],
    WR1: ['WR'],
    WR2: ['WR'],
    TE: ['TE'],
    FLEX: ['RB', 'WR', 'TE'],
    K: ['K'],
    DST: ['DST']
  })[String(slot || '').trim().toUpperCase()] || [];
}

function clearSimulationLineupSlot(slot){
  const vm = SEASON_MODE_ADAPTER?.getRosterViewModel?.() || {};
  const nextSlots = Object.fromEntries(
    Object.entries(vm.lineupSlots || {}).map(([key, value]) => [key, Number(value?.playerId || 0) || null])
  );
  nextSlots[slot] = null;
  SEASON_MODE_ADAPTER.setLineup(nextSlots);
  renderSimulationRosterInSharedShell();
}

function useSuggestedSimulationSlot(slot){
  const vm = SEASON_MODE_ADAPTER?.getRosterViewModel?.() || {};
  const nextSlots = Object.fromEntries(
    Object.entries(vm.lineupSlots || {}).map(([key, value]) => [key, Number(value?.playerId || 0) || null])
  );
  nextSlots[slot] = Number(vm.lineupSlots?.[slot]?.suggestedPlayerId || 0) || null;
  SEASON_MODE_ADAPTER.setLineup(nextSlots);
  renderSimulationRosterInSharedShell();
}

function assignSimulationBenchPlayerToSlot(playerId, slot){
  const vm = SEASON_MODE_ADAPTER?.getRosterViewModel?.() || {};
  const nextSlots = Object.fromEntries(
    Object.entries(vm.lineupSlots || {}).map(([key, value]) => [key, Number(value?.playerId || 0) || null])
  );
  nextSlots[slot] = Number(playerId || 0) || null;
  SEASON_MODE_ADAPTER.setLineup(nextSlots);
  renderSimulationRosterInSharedShell();
}
```

- [ ] **Step 4: Re-run the shared-shell test and confirm it passes**

Run:

```powershell
node tools/test-shared-season-shell-simulation.js
```

Expected: PASS, with slot cards, lineup warnings, and bench-assignment affordances covered.

- [ ] **Step 5: Commit**

```bash
git add rosterbate-season.html tools/test-shared-season-shell-simulation.js
git commit -m "feat: render nfl fantasy slots in shared season shell"
```

---

### Task 4: Make The Engine Respect NFL Slot Assignments

**Files:**
- Modify: `tools/test-simulation-league-engine.js`
- Modify: `simulation-league-engine.js`
- Test: `tools/test-simulation-league-engine.js`

- [ ] **Step 1: Write the failing engine tests for user slot usage and CPU auto-fill**

Extend `tools/test-simulation-league-engine.js` with:

```js
const controlledNflState = {
  simulationMode: 'nfl_mixed_era_single_player_v1',
  leagueShell: {
    anchorSeasonLabel: '2014 NFL',
    sport: 'nfl',
    teams: [
      { abbr: 'GB', name: 'Green Bay Packers', conference: 'NFC', division: 'North' },
      { abbr: 'CHI', name: 'Chicago Bears', conference: 'NFC', division: 'North' }
    ]
  },
  draftState: {
    controlledTeamAbbr: 'GB',
    rostersByTeam: {
      GB: [
        { id: 12, name: 'Aaron Rodgers', pos: 'QB', designation: 'ACTIVE', mixedEraOverall: 99, fp: 26 },
        { id: 88, name: 'Backup Tight End', pos: 'TE', designation: 'ACTIVE', mixedEraOverall: 40, fp: 3 },
        { id: 89, name: 'Starter Tight End', pos: 'TE', designation: 'ACTIVE', mixedEraOverall: 76, fp: 8 },
        { id: 27, name: 'Eddie Lacy', pos: 'RB', designation: 'ACTIVE', mixedEraOverall: 93, fp: 17 },
        { id: 44, name: 'James Starks', pos: 'RB', designation: 'ACTIVE', mixedEraOverall: 81, fp: 10 },
        { id: 87, name: 'Jordy Nelson', pos: 'WR', designation: 'ACTIVE', mixedEraOverall: 96, fp: 19 },
        { id: 18, name: 'Randall Cobb', pos: 'WR', designation: 'ACTIVE', mixedEraOverall: 94, fp: 18 },
        { id: 84, name: 'Davante Adams', pos: 'WR', designation: 'ACTIVE', mixedEraOverall: 82, fp: 11 },
        { id: 2, name: 'Mason Crosby', pos: 'K', designation: 'ACTIVE', mixedEraOverall: 78, fp: 8 },
        { id: 9001, name: 'Packers DST', pos: 'DST', designation: 'ACTIVE', mixedEraOverall: 83, fp: 9 }
      ],
      CHI: [
        { id: 6, name: 'Jay Cutler', pos: 'QB', designation: 'ACTIVE', mixedEraOverall: 84, fp: 19 },
        { id: 22, name: 'Matt Forte', pos: 'RB', designation: 'ACTIVE', mixedEraOverall: 94, fp: 20 },
        { id: 39, name: 'Bears RB2', pos: 'RB', designation: 'ACTIVE', mixedEraOverall: 63, fp: 7 },
        { id: 17, name: 'Alshon Jeffery', pos: 'WR', designation: 'ACTIVE', mixedEraOverall: 91, fp: 17 },
        { id: 15, name: 'Brandon Marshall', pos: 'WR', designation: 'ACTIVE', mixedEraOverall: 90, fp: 16 },
        { id: 83, name: 'Martellus Bennett', pos: 'TE', designation: 'ACTIVE', mixedEraOverall: 86, fp: 12 },
        { id: 11, name: 'Bears Flex', pos: 'WR', designation: 'ACTIVE', mixedEraOverall: 74, fp: 9 },
        { id: 7, name: 'Robbie Gould', pos: 'K', designation: 'ACTIVE', mixedEraOverall: 80, fp: 8 },
        { id: 9002, name: 'Bears DST', pos: 'DST', designation: 'ACTIVE', mixedEraOverall: 71, fp: 6 }
      ]
    }
  },
  seasonState: {
    lineupSlotsByTeam: {
      GB: { QB: 12, RB1: 27, RB2: 44, WR1: 87, WR2: 18, TE: 88, FLEX: 84, K: 2, DST: 9001 }
    },
    lineupIdsByTeam: {
      GB: [12, 27, 44, 87, 18, 88, 84, 2, 9001]
    }
  }
};

const gbStarterIds = engineApi.getSimulationLineupPlayerIds(controlledNflState, 'GB');
assert.deepStrictEqual(gbStarterIds, [12, 27, 44, 87, 18, 88, 84, 2, 9001], 'engine should honor the user-assigned nfl slot lineup even when it is not the highest-overall combination');

const chiStarterIds = engineApi.getSimulationLineupPlayerIds(controlledNflState, 'CHI');
assert.deepStrictEqual(chiStarterIds, [6, 22, 39, 17, 15, 83, 11, 7, 9002], 'engine should auto-build a valid nfl fantasy lineup for cpu teams without persisted slot assignments');
```

- [ ] **Step 2: Run the engine test and verify it fails**

Run:

```powershell
node tools/test-simulation-league-engine.js
```

Expected: FAIL because the engine still treats NFL starters as a simple starter list and does not distinguish the user's slot assignments from CPU auto-fill.

- [ ] **Step 3: Add NFL lineup resolution helpers in the engine**

In `simulation-league-engine.js`, add focused helpers:

```js
function getNflSlotEligibilityMap(){
  return {
    QB: ['QB'],
    RB1: ['RB'],
    RB2: ['RB'],
    WR1: ['WR'],
    WR2: ['WR'],
    TE: ['TE'],
    FLEX: ['RB', 'WR', 'TE'],
    K: ['K'],
    DST: ['DST']
  };
}

function selectBestValidNflLineup(roster){
  const sorted = clone(roster || []).sort((a, b) => Number(b?.mixedEraOverall || b?.fp || 0) - Number(a?.mixedEraOverall || a?.fp || 0));
  const usedIds = new Set();
  const eligibility = getNflSlotEligibilityMap();
  return ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'TE', 'FLEX', 'K', 'DST']
    .map((slot) => {
      const candidate = sorted.find((player) => (
        !usedIds.has(Number(player.id)) &&
        String(player?.designation || 'ACTIVE').trim().toUpperCase() !== 'OUT' &&
        eligibility[slot].includes(String(player?.pos || '').trim().toUpperCase())
      ));
      if (!candidate) return null;
      usedIds.add(Number(candidate.id));
      return Number(candidate.id);
    })
    .filter(Boolean);
}

function getSimulationLineupPlayerIds(state, teamAbbr){
  const sport = String(state?.leagueShell?.sport || 'nba').trim().toLowerCase();
  if (sport !== 'nfl') {
    return clone(state?.seasonState?.lineupIdsByTeam?.[teamAbbr] || []);
  }
  const controlled = String(state?.draftState?.controlledTeamAbbr || '').trim().toUpperCase();
  const normalizedTeamAbbr = String(teamAbbr || '').trim().toUpperCase();
  if (normalizedTeamAbbr === controlled) {
    return clone(state?.seasonState?.lineupIdsByTeam?.[controlled] || []);
  }
  const roster = clone(state?.draftState?.rostersByTeam?.[normalizedTeamAbbr] || []);
  return selectBestValidNflLineup(roster);
}
```

- [ ] **Step 4: Route NFL weekly sim calculations through the new lineup helper**

Update the NFL path that currently derives starters to use the new helper:

```js
const starterIds = getSimulationLineupPlayerIds(state, teamAbbr);
const starters = starterIds
  .map((playerId) => roster.find((player) => Number(player.id) === Number(playerId)))
  .filter(Boolean);
```

Append the new helper to the existing engine exports:

```js
getSimulationLineupPlayerIds,
```

- [ ] **Step 5: Re-run the engine test and confirm it passes**

Run:

```powershell
node tools/test-simulation-league-engine.js
```

Expected: PASS, with the controlled NFL team respecting the stored slot lineup and CPU teams auto-filling a legal fantasy lineup.

- [ ] **Step 6: Commit**

```bash
git add simulation-league-engine.js tools/test-simulation-league-engine.js
git commit -m "feat: respect nfl fantasy slots in weekly sim"
```

---

### Task 5: Run The NFL Roster-Management Regression Sweep

**Files:**
- Test only: files touched in Tasks 1-4

- [ ] **Step 1: Run the focused regression sweep**

Run:

```powershell
node tools/test-simulation-mode-runtime.js
node tools/test-simulation-season-adapter.js
node tools/test-shared-season-shell-simulation.js
node tools/test-simulation-league-engine.js
node tools/test-nfl-shared-season-shell-weekly-sim.js
node tools/test-simulation-universe-details.js
git diff --check
```

Expected:

- all Node tests PASS
- `git diff --check` returns clean or only CRLF normalization warnings, not whitespace errors

- [ ] **Step 2: Apply any minimal fixups exposed by the sweep**

If the sweep exposed issues, patch only the touched files and then commit:

```bash
git add simulation-mode-runtime.js simulation-season-adapter.js rosterbate-season.html simulation-league-engine.js tools/test-simulation-mode-runtime.js tools/test-simulation-season-adapter.js tools/test-shared-season-shell-simulation.js tools/test-simulation-league-engine.js
git commit -m "fix: polish nfl fantasy-slot roster management"
```

- [ ] **Step 3: Request final code review**

Use the `requesting-code-review` skill before merging or pushing.
