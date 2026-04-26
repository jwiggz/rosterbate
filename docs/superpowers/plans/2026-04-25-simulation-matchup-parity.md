# Simulation Matchup Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make simulation `Matchup` feel much closer to the single-player matchup room for NBA and NFL with richer side-by-side context, valid navigation, and real matchup actions where simulation already supports them.

**Architecture:** Extend the simulation matchup view model in `simulation-season-adapter.js` so `rosterbate-season.html` can render a fuller shared-shell matchup room instead of a thin schedule/results card. Keep NBA day-based and NFL week-based behavior in the adapter layer, with the renderer consuming one richer matchup contract for both sports.

**Tech Stack:** Plain HTML/CSS/JavaScript in `rosterbate-season.html`, browser-side simulation adapter/runtime modules, Node regression tests in `tools/*.js`, local verification on `http://localhost:8080`.

---

## File Map

- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-season-adapter.js`
  - Expand the simulation matchup view model with hero, navigation, team panels, action cards, and lineup comparison sections.

- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`
  - Upgrade `renderSimulationScheduleInSharedShell()` to render a richer single-player-style matchup room from the adapter view model.
  - Wire matchup action cards and valid navigation through shared-shell handlers.

- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js`
  - Add regression coverage for the richer matchup view model contract for NBA and NFL.

- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js`
  - Add screen-level parity assertions for the richer matchup layout, navigation, and shared-shell actions.

- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-nfl-shared-season-shell-weekly-sim.js`
  - Keep NFL weekly matchup behavior and weekly rendering assumptions protected while the page becomes richer.

## Task 1: Lock Rich Matchup Parity Contracts In Tests

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js`

- [ ] **Step 1: Write failing adapter assertions for the richer matchup contract**

Add expectations around the current `getScheduleViewModel()` result so the adapter must expose real matchup-room primitives instead of only `recentResults` and `detailCards`:

```js
const schedule = adapter.getScheduleViewModel();
assert.ok(schedule.hero, 'schedule vm should expose matchup hero data');
assert.ok(schedule.navigation, 'schedule vm should expose matchup navigation state');
assert.ok(Array.isArray(schedule.actionCards), 'schedule vm should expose matchup action cards');
assert.ok(schedule.teamPanels?.mine, 'schedule vm should expose my team matchup panel');
assert.ok(schedule.teamPanels?.opponent, 'schedule vm should expose opponent matchup panel');
assert.ok(schedule.lineupSections?.mine, 'schedule vm should expose my lineup comparison sections');
assert.ok(schedule.lineupSections?.opponent, 'schedule vm should expose opponent lineup comparison sections');
```

- [ ] **Step 2: Write failing screen-level assertions for richer matchup rendering**

Extend the shared-shell simulation test so `renderSimulationScheduleInSharedShell()` must render more than a title and results list:

```js
api.renderSimulationScheduleInSharedShell();
assert.match(elements.matchupContent.innerHTML, /Current Matchup|Matchup Room/);
assert.match(elements.matchupContent.innerHTML, /Open My Team|Open Waivers|Review Schedule/);
assert.match(elements.matchupContent.innerHTML, /Michael Jordan|Boston Celtics/);
assert.match(elements.matchupContent.innerHTML, /Previous Matchup|Recent Results/);
assert.match(elements.matchupContent.innerHTML, /season-outline-btn/, 'simulation matchup should render interactive action controls');
```

- [ ] **Step 3: Write failing NFL-specific matchup assertions**

Add expectations that NFL still renders week-based matchup context rather than inheriting NBA-style daily navigation:

```js
api.renderSimulationScheduleInSharedShell();
assert.match(elements.matchupContent.innerHTML, /Week 1|Wild Card Weekend/);
assert.doesNotMatch(elements.matchupContent.innerHTML, /Tue|Wed|Thu/, 'nfl matchup should not render nba-style daily chips');
```

- [ ] **Step 4: Run the red tests**

Run:

```bash
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js
```

Expected:

- FAIL on the new matchup contract assertions

- [ ] **Step 5: Commit**

```bash
git add C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js
git commit -m "test: lock simulation matchup parity contracts"
```

## Task 2: Expand The Simulation Matchup View Model

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-season-adapter.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js`

- [ ] **Step 1: Add helper builders for matchup hero, navigation, team panels, and lineup comparison**

Introduce focused adapter helpers instead of bloating `getScheduleViewModel()` directly:

```js
function buildSimulationMatchupHero(state, matchupContext){ ... }
function buildSimulationMatchupNavigation(state, matchupContext){ ... }
function buildSimulationMatchupTeamPanels(state, matchupContext){ ... }
function buildSimulationMatchupLineupSections(state, matchupContext){ ... }
function buildSimulationMatchupActionCards(state, matchupContext){ ... }
```

Each helper should return plain objects/arrays that the renderer can consume without more sport inference.

- [ ] **Step 2: Keep NBA navigation day-based and NFL navigation week-based**

Build navigation state from the adapter instead of hard-coding chips in the page:

```js
return sport === 'nfl'
  ? { mode: 'week', selectedLabel: formatSimulationCycleLabel(state), items: weeklyItems }
  : { mode: 'day', selectedLabel: formatSimulationCycleLabel(state), items: dailyItems };
```

The returned items should include enough information for the renderer to show active/inactive state and route clicks safely.

- [ ] **Step 3: Expose side-by-side lineup sections for both teams**

Use the controlled roster and current opponent to build grouped comparison data:

```js
return {
  mine: [
    { title: sport === 'nfl' ? 'Weekly Starters' : 'Starters', rows: myStarterRows },
    { title: sport === 'nfl' ? 'Bench / Depth' : 'Bench', rows: myBenchRows }
  ],
  opponent: [
    { title: sport === 'nfl' ? 'Weekly Starters' : 'Starters', rows: oppStarterRows },
    { title: sport === 'nfl' ? 'Bench / Depth' : 'Bench', rows: oppBenchRows }
  ]
};
```

- [ ] **Step 4: Expand `getScheduleViewModel()` to return the richer matchup-room contract**

Update the method so it returns:

```js
return {
  sport,
  title,
  subtitle,
  cycleLabel,
  hero,
  navigation,
  detailCards,
  previousMatchup,
  currentMatchup,
  recentResults,
  actionCards,
  teamPanels,
  lineupSections
};
```

- [ ] **Step 5: Run the adapter test**

Run:

```bash
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js
```

Expected:

- PASS

- [ ] **Step 6: Commit**

```bash
git add C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-season-adapter.js C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js
git commit -m "feat: expand simulation matchup view model"
```

## Task 3: Upgrade The Shared Simulation Matchup Renderer

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js`

- [ ] **Step 1: Replace the thin simulation schedule card with a richer matchup-room layout**

Refactor `renderSimulationScheduleInSharedShell()` so it renders:

```js
document.getElementById('matchupContent').innerHTML = `
  <div style="display:flex;flex-direction:column;gap:18px;">
    <div class="season-hero-card season-card-pad">...</div>
    <div class="season-now-band">...</div>
    <div class="season-split-grid">...</div>
    <div class="season-table-card">...</div>
  </div>
`;
```

The hero should use the new matchup hero/team panel data rather than only `vm.title` and `vm.cycleLabel`.

- [ ] **Step 2: Render adapter-driven navigation and matchup action cards**

Render only the navigation style the adapter says is valid:

```js
const navigationMarkup = vm.navigation?.mode === 'week'
  ? renderSimulationWeekNavigation(vm.navigation)
  : renderSimulationDayNavigation(vm.navigation);
```

Render action cards/buttons that route through existing shared-shell destinations like:

```js
goPage('roster')
goPage('waiver')
goPage('matchup')
```

- [ ] **Step 3: Render side-by-side lineup comparison sections**

Use the adapter-provided lineup sections to build two columns:

```js
const matchupColumns = ['mine', 'opponent'].map(side => `
  <div class="season-table-card season-card-pad">
    ...
    ${vm.lineupSections[side].map(section => ...).join('')}
  </div>
`).join('');
```

This should work for both NBA and NFL without the page hard-coding sport slot logic.

- [ ] **Step 4: Keep unsupported matchup controls absent or clearly non-live**

Do not introduce fake actions. If a single-player matchup control cannot be backed by simulation state, omit it or render it explicitly disabled with clear copy.

- [ ] **Step 5: Run the shared-shell test**

Run:

```bash
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js
```

Expected:

- PASS

- [ ] **Step 6: Commit**

```bash
git add C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js
git commit -m "feat: align simulation matchup with shared shell"
```

## Task 4: Verify NFL Weekly Safety And Full Matchup Parity Regression

**Files:**
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-nfl-shared-season-shell-weekly-sim.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js`

- [ ] **Step 1: Add or update NFL matchup regression assertions if needed**

If the current NFL test does not already cover the richer matchup page assumptions, extend it with explicit checks such as:

```js
assert.match(elements.matchupContent.innerHTML, /Weekly Schedule \/ Results/);
assert.match(elements.matchupContent.innerHTML, /Weekly Starters|Bench \/ Depth/);
assert.doesNotMatch(elements.matchupContent.innerHTML, /Oct 22|Thu|Fri/, 'nfl matchup should stay week-based');
```

- [ ] **Step 2: Run the full targeted regression set**

Run:

```bash
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-nfl-shared-season-shell-weekly-sim.js
```

Expected:

- all PASS

- [ ] **Step 3: Verify manually on local `8080`**

Open and verify:

```text
http://localhost:8080/rosterbate-season.html?sport=nba&simulation=nba_mixed_era
http://localhost:8080/rosterbate-season.html?sport=nfl&simulation=nfl_mixed_era
```

Check:

- simulation `Matchup` feels much closer to the single-player matchup room
- NBA navigation remains day-based
- NFL navigation remains week-based
- both teams render richer side-by-side lineup context
- matchup action cards route into real shared-shell screens where supported

- [ ] **Step 4: Commit**

```bash
git add C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-nfl-shared-season-shell-weekly-sim.js C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js
git commit -m "test: verify simulation matchup parity across nba and nfl"
```

## Self-Review

### Spec coverage

- richer single-player-style matchup composition: covered by Tasks 1 and 3
- deeper side-by-side lineup detail: covered by Tasks 2 and 3
- day/week navigation by sport: covered by Tasks 1, 2, and 4
- matchup-specific action cards: covered by Tasks 2 and 3
- NFL cadence safety: covered by Task 4

### Placeholder scan

- No `TODO`, `TBD`, or deferred filler language remains.
- Each task includes explicit files, commands, and concrete code direction.

### Type consistency

- The plan consistently uses `getScheduleViewModel()` as the adapter entry point for simulation matchup data.
- Matchup additions use `hero`, `navigation`, `actionCards`, `teamPanels`, and `lineupSections` consistently across tasks.
- Shared-shell work remains inside `renderSimulationScheduleInSharedShell()` rather than introducing a second matchup renderer.
