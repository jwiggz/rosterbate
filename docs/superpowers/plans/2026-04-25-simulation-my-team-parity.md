# Simulation My Team Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make simulation-league `My Team` use the same page structure and interaction surface as single-player `My Team` for both NBA and NFL, while keeping simulation-backed data and sport-specific slot rules intact.

**Architecture:** Reuse the existing single-player roster renderer in `rosterbate-season.html` instead of maintaining a second simulation roster page. Expand `simulation-season-adapter.js` so simulation mode produces a single-player-shaped roster view model, then add a thin mode-aware bridge in the roster renderer to swap between legacy globals and adapter-backed actions/data.

**Tech Stack:** Plain HTML/JS in `rosterbate-season.html`, browser-side adapter code in `simulation-season-adapter.js`, Node-based regression scripts in `tools/*.js`, local manual verification on `http://localhost:8080`.

---

## File Map

- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`
  - Keep the existing single-player `renderRoster()` page structure.
  - Add a shared roster view-model bridge so simulation mode can render through the same structure.
  - Route roster actions through mode-aware handlers instead of simulation-only markup.

- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-season-adapter.js`
  - Expand `getRosterViewModel()` into a single-player-shaped contract for both NBA and NFL simulation leagues.
  - Preserve NFL slot normalization and expose row/action metadata needed by the shared renderer.

- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js`
  - Add focused adapter tests for the richer roster view model.

- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js`
  - Assert simulation mode renders through the shared roster-page path and keeps quota fallback behavior intact.

- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-page.js`
  - Add season-page assertions that simulation `My Team` exposes the same structural sections as single-player.

## Task 1: Lock The Shared Roster Contract In Tests

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-page.js`

- [ ] **Step 1: Write the failing adapter expectations for the richer simulation roster contract**

Add assertions to `tools/test-simulation-season-adapter.js` for both NBA and NFL-style roster view models:

```js
assert.equal(rosterVm.layoutMode, 'single-player-parity');
assert.ok(Array.isArray(rosterVm.summaryCards));
assert.ok(Array.isArray(rosterVm.actionCards));
assert.ok(Array.isArray(rosterVm.operations.actions));
assert.ok(Array.isArray(rosterVm.tabs));
assert.ok(Array.isArray(rosterVm.sections.starters.rows));
assert.ok(Array.isArray(rosterVm.sections.bench.rows));
assert.equal(rosterVm.sport, 'nfl');
assert.deepStrictEqual(
  rosterVm.starterSlots,
  ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'DST', 'K']
);
```

- [ ] **Step 2: Write the failing season-page assertions for shared rendering**

Add assertions to `tools/test-shared-season-shell-simulation.js` and `tools/test-simulation-season-page.js` that simulation `My Team` now uses the single-player roster sections instead of the separate simulation-only renderer output:

```js
assert.doesNotMatch(
  html,
  /function renderSimulationRosterInSharedShell\(\)\{[\s\S]*Ready For Week/,
  'simulation roster should no longer own a standalone roster page layout'
);
assert.match(
  html,
  /function renderRoster\(\)\{[\s\S]*const rosterVm = buildActiveRosterPageViewModel\(\);/,
  'shared roster renderer should build a common roster page view model before rendering'
);
```

- [ ] **Step 3: Run the targeted tests to verify they fail**

Run:

```bash
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-page.js
```

Expected:

- at least one failure complaining that the richer roster contract or shared renderer bridge is missing

- [ ] **Step 4: Commit the red-test checkpoint**

```bash
git add C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-page.js
git commit -m "test: lock simulation my-team parity contract"
```

## Task 2: Expand The Simulation Adapter Into A Single-Player-Shaped Roster View Model

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-season-adapter.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js`

- [ ] **Step 1: Implement helper builders for shared roster sections**

Add focused helpers near the existing roster helpers so `getRosterViewModel()` can return richer sections without embedding all formatting inline:

```js
function buildSimulationRosterSummaryCards(state, rosterState){
  return [
    { key: 'last-matchup', title: 'Last Matchup', body: rosterState.lastMatchupLabel },
    { key: 'current-matchup', title: 'Current Matchup', body: rosterState.currentMatchupLabel }
  ];
}

function buildSimulationRosterActionCards(state, rosterState){
  return [
    { key: 'lineup-status', label: 'Lineup Status', value: rosterState.readyLabel, tone: rosterState.validation.valid ? 'live' : 'alert' },
    { key: 'roster-space', label: 'Roster Space', value: rosterState.rosterSpaceLabel, tone: 'info' }
  ];
}
```

- [ ] **Step 2: Expand `getRosterViewModel()` to return the shared contract**

Update `getRosterViewModel()` so both NBA and NFL simulation return a single-player-shaped object:

```js
return {
  layoutMode: 'single-player-parity',
  sport,
  starterSlots,
  summaryCards,
  actionCards,
  operations: {
    starterSummary: `${filledStarters}/${starterSlots.length} starters set`,
    actions: [
      { id: 'matchup', label: 'Matchup', enabled: true },
      { id: 'add', label: 'Add Player', enabled: true },
      { id: 'il', label: `Manage ${ilLabel}`, enabled: ilEnabled },
      { id: 'drop', label: pendingAdd ? 'Drop for Add' : 'Drop Player', enabled: true }
    ]
  },
  tabs: ['stats', 'schedule'],
  sections: {
    starters: { rows: starterRows },
    bench: { rows: benchRows },
    il: { rows: ilRows }
  },
  teamSummary: {
    name: controlledTeam?.name || '',
    settingsEnabled: true,
    watchListLabel,
    waiverOrderLabel
  },
  validation,
  recommendationSummary
};
```

- [ ] **Step 3: Preserve NFL-specific row and slot behavior under the shared contract**

Keep NFL-specific slot mapping and recommendation metadata, but expose it through the normalized row objects:

```js
const starterRows = starterSlots.map((slot) => ({
  slot,
  player: lineupSlots[slot]?.player || null,
  suggestedPlayerId: lineupSlots[slot]?.suggestedPlayerId || null,
  warning: slotWarningsByKey[slot] || '',
  actionLabel: 'Move'
}));
```

- [ ] **Step 4: Run the adapter test to verify it passes**

Run:

```bash
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js
```

Expected:

- PASS for the new richer roster-view-model assertions

- [ ] **Step 5: Commit the adapter contract work**

```bash
git add C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-season-adapter.js C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js
git commit -m "feat: expand simulation roster view model for my-team parity"
```

## Task 3: Route Simulation My Team Through The Shared Roster Renderer

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-page.js`

- [ ] **Step 1: Add a mode-aware roster view-model bridge in `rosterbate-season.html`**

Introduce a helper that lets `renderRoster()` consume one source regardless of mode:

```js
function buildActiveRosterPageViewModel(){
  if (ACTIVE_SEASON_MODE === 'simulation' && SEASON_MODE_ADAPTER?.getRosterViewModel) {
    return SEASON_MODE_ADAPTER.getRosterViewModel();
  }
  return buildSinglePlayerRosterViewModel();
}
```

- [ ] **Step 2: Convert `renderRoster()` to use the shared view model**

Keep the existing single-player structure, but have it read from the normalized model instead of branching immediately into `renderSimulationRosterInSharedShell()`:

```js
function renderRoster(){
  const rosterVm = buildActiveRosterPageViewModel();
  if (!rosterVm) return;
  renderRosterHeader(rosterVm);
  renderRosterSummaryBands(rosterVm);
  renderRosterOperationsStrip(rosterVm);
  renderRosterSections(rosterVm);
}
```

- [ ] **Step 3: Reduce `renderSimulationRosterInSharedShell()` to a compatibility wrapper or remove its page layout**

Replace the standalone simulation roster markup with a thin pass-through so there is no second page implementation:

```js
function renderSimulationRosterInSharedShell(){
  return renderRoster();
}
```

If direct recursion would occur, remove callers and keep the old function as a dead-simple compatibility wrapper that only delegates through the shared helper.

- [ ] **Step 4: Make roster actions mode-aware instead of simulation-page-specific**

Update `handleRosterAction()` and any roster action helpers so simulation uses the same visible controls but dispatches through adapter-backed behavior when appropriate:

```js
function handleRosterAction(action){
  if (ACTIVE_SEASON_MODE === 'simulation') {
    return handleSimulationRosterAction(action);
  }
  return handleFantasyRosterAction(action);
}
```

- [ ] **Step 5: Run the page-level tests to verify they pass**

Run:

```bash
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-page.js
```

Expected:

- PASS with simulation `My Team` assertions now hitting the shared roster path

- [ ] **Step 6: Commit the shared-renderer integration**

```bash
git add C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-page.js
git commit -m "feat: route simulation my-team through shared roster renderer"
```

## Task 4: Finish NFL And NBA Interaction Parity On The Shared Page

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-season-adapter.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js`

- [ ] **Step 1: Fill in watch list, waiver order, team settings, and disabled-state copy in the shared simulation view model**

Use explicit labels so the page never drops single-player sections just because the backend is simulation:

```js
teamSummary: {
  watchListLabel: watchListCount > 0 ? `Watch List (${watchListCount})` : 'Watch List',
  waiverOrderLabel: waiverOrderSize > 0 ? `Waiver Order (${waiverOrderRank} of ${waiverOrderSize})` : 'Waiver Order',
  settingsEnabled: true
}
```

- [ ] **Step 2: Ensure NFL rows render through the same structure with football-specific slots and columns**

Keep the shared table structure, but let NFL row metadata decide column values and labels:

```js
{
  slot: 'FLEX',
  playerName: player?.name || 'Open Slot',
  secondaryText: player ? `${player.team} ${player.pos}` : 'RB / WR / TE',
  statusLabel: availabilityLabel,
  metrics: [
    { key: 'fp', value: projectedFp },
    { key: 'overall', value: overallLabel }
  ]
}
```

- [ ] **Step 3: Run the full targeted regression set**

Run:

```bash
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-page.js
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-nfl-shared-season-shell-weekly-sim.js
```

Expected:

- all PASS

- [ ] **Step 4: Verify manually on local `8080`**

Open and verify:

```text
http://localhost:8080/rosterbate-season.html?sport=nba&simulation=nba_mixed_era
http://localhost:8080/rosterbate-season.html?sport=nfl&simulation=nfl_mixed_era
```

Check:

- simulation `My Team` layout matches single-player page structure
- NBA still shows basketball lineup shape
- NFL shows `QB/RB/RB/WR/WR/TE/FLEX/DST/K`
- side rail includes team settings/watch list/waiver order patterns
- page still boots under local quota-pressure fallback without redirect breakage

- [ ] **Step 5: Commit the parity finish**

```bash
git add C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-season-adapter.js C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-page.js
git commit -m "feat: align simulation my-team with single-player layout"
```

## Self-Review

### Spec coverage

- Shared renderer boundary: covered by Task 3.
- Rich simulation roster contract: covered by Task 2.
- NBA and NFL parity: covered by Tasks 2 and 4.
- Interaction parity and action routing: covered by Tasks 3 and 4.
- Regression and quota fallback validation: covered by Tasks 1 and 4.

### Placeholder scan

- No `TODO`, `TBD`, or deferred “write tests later” placeholders remain.
- Every task includes exact file paths, commands, and concrete code direction.

### Type consistency

- The plan consistently uses `buildActiveRosterPageViewModel()`, `buildSinglePlayerRosterViewModel()`, `getRosterViewModel()`, `handleSimulationRosterAction()`, and `handleFantasyRosterAction()` as the shared naming direction.
- The normalized simulation output consistently uses `summaryCards`, `actionCards`, `operations`, `tabs`, `sections`, and `teamSummary`.

