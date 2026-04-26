# Simulation Season Shell Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make simulation leagues feel much closer to single-player leagues across `Hub`, `My Team`, `Matchup`, `Waivers`, `Trades`, and `Standings`, while making missing single-player-style controls truly functional in simulation wherever possible.

**Architecture:** Extend the shared season shell in `rosterbate-season.html` so simulation screens reuse single-player composition instead of separate reduced renderers. Use `simulation-season-adapter.js` as the primary mode boundary for page view models and action hooks, with sport-specific and simulation-specific mechanics staying in the adapter/runtime layer.

**Tech Stack:** Plain HTML/CSS/JavaScript in `rosterbate-season.html`, browser-side adapter/runtime modules, Node-based regression tests in `tools/*.js`, local verification on `http://localhost:8080`.

---

## File Map

- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`
  - Unify simulation page composition with single-player shell patterns for Hub, Matchup, Waivers, Trades, and Standings.
  - Wire shared simulation page actions and powerup affordances through adapter/runtime hooks.

- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-season-adapter.js`
  - Expand page-level view models and action metadata for Hub, Matchup, Waivers, Trades, and Standings.
  - Add missing parity metadata and action hooks needed by the shared shell.

- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-mode-runtime.js`
  - Support simulation-facing powerup interaction and any deeper roster/waiver/trade action wiring needed by the shell.

- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js`
  - Add regression coverage for screen-level shared-shell parity and simulation action routing.

- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js`
  - Add richer page-level adapter contract tests for Hub, Matchup, Waivers, Trades, and Standings.

- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-mode-runtime.js`
  - Add runtime tests for simulation powerup interaction and any new state mutations.

- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-nfl-shared-season-shell-weekly-sim.js`
  - Protect NFL weekly behavior while parity work expands shared shell interactions.

- Modify if needed: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-page.js`
  - Keep page-routing parity aligned with the shared shell only if page-entry behavior changes.

## Task 1: Lock Screen-Level Parity Contracts In Tests

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-mode-runtime.js`

- [ ] **Step 1: Write failing shared-shell tests for Hub, Matchup, Waivers, Trades, and Standings parity markers**

Add parity expectations that simulation versions of these screens expose the same major shell sections/patterns single-player uses:

```js
assert.match(elements.hub.innerHTML, /Weekly Powerups/, 'simulation hub should reuse the single-player powerup rail');
assert.match(elements.matchupContent.innerHTML, /season-hero-card|Current Matchup/, 'simulation matchup should reuse the single-player matchup framing');
assert.match(elements.waiverContent.innerHTML, /Watch List|Waiver Order/, 'simulation waivers should expose parity meta affordances');
assert.match(elements.tradesContent.innerHTML, /Trade Desk|Pending Offers/, 'simulation trades should feel like the single-player trade desk');
assert.match(elements.standingsContent.innerHTML, /season-hero-card|Standings/, 'simulation standings should reuse the single-player standings framing');
```

- [ ] **Step 2: Write failing adapter tests for the richer page-level contracts**

Add expectations for the page view models that will feed the shared shell:

```js
const hubVm = adapter.getHubViewModel();
assert.ok(Array.isArray(hubVm.summaryCards));
assert.ok(Array.isArray(hubVm.powerupCards));

const scheduleVm = adapter.getScheduleViewModel();
assert.ok(Array.isArray(scheduleVm.detailCards));

const waiverVm = adapter.getWaiverViewModel();
assert.ok(waiverVm.teamSummary);
assert.ok(Array.isArray(waiverVm.sections?.available?.rows));

const tradeVm = adapter.getTradeViewModel();
assert.ok(Array.isArray(tradeVm.sections?.partners?.rows));

const standingsVm = adapter.getStandingsViewModel();
assert.ok(Array.isArray(standingsVm.sections));
```

- [ ] **Step 3: Write failing runtime tests for simulation powerup interaction**

Add tests that lock the expectation that powerups shown in simulation can actually mutate simulation state:

```js
const nextState = runtime.activateSimulationPowerup(state, {
  teamAbbr: 'LAL',
  powerupId: 'captain_mode',
  targetId: 23
});
assert.equal(nextState.seasonState.powerupsByWeek[2].captain_mode.active, true);
```

- [ ] **Step 4: Run the targeted red-test suite**

Run:

```bash
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-mode-runtime.js
```

Expected:

- FAIL on the new parity contract assertions

- [ ] **Step 5: Commit**

```bash
git add C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-mode-runtime.js
git commit -m "test: lock simulation season shell parity contracts"
```

## Task 2: Expand Simulation View Models And Runtime Hooks

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-season-adapter.js`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-mode-runtime.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-mode-runtime.js`

- [ ] **Step 1: Add page-level parity metadata to simulation adapter view models**

Expand page view models with normalized fields the shared shell can consume:

```js
return {
  sport,
  pageLayout: 'single-player-parity',
  teamSummary,
  summaryCards,
  powerupCards,
  primaryActions,
  sections: {
    available: { title: 'Available Players', rows },
    partners: { title: 'Trade Partners', rows }
  }
};
```

- [ ] **Step 2: Add simulation powerup/runtime action hooks**

Add or extend runtime helpers so simulation screens can mutate state for visible powerups and deeper actions:

```js
function activateSimulationPowerup(state, payload){
  const nextState = clone(state);
  const week = Number(nextState?.seasonState?.currentWeek || 1);
  nextState.seasonState.powerupsByWeek = nextState.seasonState.powerupsByWeek || {};
  nextState.seasonState.powerupsByWeek[week] = nextState.seasonState.powerupsByWeek[week] || {};
  nextState.seasonState.powerupsByWeek[week][payload.powerupId] = {
    active: true,
    targetId: payload.targetId || null
  };
  return nextState;
}
```

- [ ] **Step 3: Make NFL view models sport-friendly without changing simulation rules**

Keep NFL-specific cadence and slots, but expose football-friendly page labels and rows:

```js
sections: {
  starters: { title: 'Weekly Starters', rows: starterRows },
  bench: { title: 'Bench / Depth', rows: benchRows }
}
```

- [ ] **Step 4: Run the adapter/runtime tests to verify they pass**

Run:

```bash
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-mode-runtime.js
```

Expected:

- PASS

- [ ] **Step 5: Commit**

```bash
git add C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-season-adapter.js C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-mode-runtime.js C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-mode-runtime.js
git commit -m "feat: expand simulation season shell view models"
```

## Task 3: Move The Remaining Simulation Screens Onto Shared Single-Player Composition

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-page.js`

- [ ] **Step 1: Add shared simulation render helpers for Hub, Matchup, Waivers, Trades, and Standings**

Follow the My Team pattern by introducing shared-render helpers that use the adapter VM:

```js
function renderSharedSimulationHubPageFromViewModel(vm){ ... }
function renderSharedSimulationMatchupPageFromViewModel(vm){ ... }
function renderSharedSimulationWaiverPageFromViewModel(vm){ ... }
function renderSharedSimulationTradesPageFromViewModel(vm){ ... }
function renderSharedSimulationStandingsPageFromViewModel(vm){ ... }
```

- [ ] **Step 2: Replace reduced simulation-only page layouts with shared page composition**

Update screen render entrypoints to call the new shared helpers instead of bespoke reduced layouts:

```js
function renderSimulationHubInSharedShell(){
  return renderSharedSimulationHubPageFromViewModel(SEASON_MODE_ADAPTER.getHubViewModel());
}
```

- [ ] **Step 3: Wire cross-screen simulation actions through the shared shell**

Keep interactions consistent with single-player positioning while using simulation backends:

```js
function handleSimulationShellAction(action, payload){
  if(action === 'open-waivers') return goPage('waiver');
  if(action === 'open-trades') return goPage('trades');
  if(action === 'open-matchup') return goPage('matchup');
  if(action === 'activate-powerup') return applySimulationPowerup(payload);
}
```

- [ ] **Step 4: Run screen-level tests**

Run:

```bash
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-page.js
```

Expected:

- PASS

- [ ] **Step 5: Commit**

```bash
git add C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html C:\Users\\jabro\\Desktop\\Fantasy Project\\rosterbate\\tools\\test-shared-season-shell-simulation.js C:\Users\\jabro\\Desktop\\Fantasy Project\\rosterbate\\tools\\test-simulation-season-page.js
git commit -m "feat: align simulation season shell screens with single-player"
```

## Task 4: Finish Functional Parity And Verify NBA/NFL End To End

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-season-adapter.js`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-mode-runtime.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-mode-runtime.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-nfl-shared-season-shell-weekly-sim.js`

- [ ] **Step 1: Finish powerup and deeper-action parity where backend support exists**

Make visible simulation controls work where practical:

```js
if(action === 'activate-powerup'){
  const nextState = window.RosterBateSimulationModeRuntime.activateSimulationPowerup(SEASON_MODE_ADAPTER.getState(), payload);
  SEASON_MODE_ADAPTER.replaceState(nextState);
  renderActiveSeasonScreen();
  return;
}
```

- [ ] **Step 2: Keep unsupported controls intentionally visible and clearly disabled**

Use disabled-state copy only where the backend truly cannot support the action yet:

```js
{
  id: 'watch-list',
  enabled: false,
  disabledCopy: 'Watch list tracking stays visible for parity, but simulation waivers do not support saved targets yet.'
}
```

- [ ] **Step 3: Run the full targeted regression set**

Run:

```bash
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-mode-runtime.js
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

- Hub, My Team, Matchup, Waivers, Trades, and Standings all feel much closer to the single-player shell
- powerups are visible and work where supported
- simulation-specific controls are not decorative
- NFL remains sport-correct in labels, cadence, and rows
- quota-pressure fallback still lands in the correct shared shell state

- [ ] **Step 5: Commit**

```bash
git add C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-season-adapter.js C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-mode-runtime.js C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-mode-runtime.js C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-nfl-shared-season-shell-weekly-sim.js
git commit -m "feat: complete simulation season shell parity"
```

## Self-Review

### Spec coverage

- Shared shell parity across six target screens: covered by Tasks 1 and 3.
- Functional parity for powerups and deeper actions: covered by Tasks 1, 2, and 4.
- Adapter-driven view model direction: covered by Task 2.
- Cross-screen actions: covered by Tasks 3 and 4.
- NBA/NFL regressions and manual localhost verification: covered by Task 4.

### Placeholder scan

- No `TODO`, `TBD`, or deferred “fill this in later” language remains.
- Each task has exact file paths, commands, and concrete code direction.

### Type consistency

- The plan consistently uses `renderSharedSimulation*PageFromViewModel(...)` for shared screen renderers.
- Page-level adapter methods remain `getHubViewModel()`, `getScheduleViewModel()`, `getWaiverViewModel()`, `getTradeViewModel()`, and `getStandingsViewModel()`.
- Runtime action naming is consistently `activateSimulationPowerup(...)` and `handleSimulationShellAction(...)`.

