# Unified Simulation Engine Single-Player Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace legacy single-player historical-stat gameplay with the newer simulation engine so every league uses ratings-driven generated outcomes and simulated stats, while preserving the polished single-player shell and feel.

**Architecture:** Make `simulation-mode-runtime.js`, `simulation-season-adapter.js`, and `simulation-league-engine.js` the only season gameplay engine. Re-home single-player league boot, progression, and stat rendering onto simulation-native season state, with `rosterbate-season.html` rendering different league presentations over one shared engine-backed model. Remove legacy stat-replay season resolution rather than maintaining it in parallel.

**Tech Stack:** Plain HTML/CSS/JavaScript in `rosterbate-season.html`, browser-side simulation runtime/adapter modules, engine-backed generated stat output, Node-based regression tests in `tools/*.js`, local verification on `http://localhost:8080`.

---

## File Map

- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-mode-runtime.js`
  - Treat simulation-native season state as the canonical league state for all season types.
  - Add or expand helpers needed for single-player boot/reset on top of simulation-native state.

- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-season-adapter.js`
  - Support single-player presentation mode on top of simulation-native state.
  - Expose view models and action hooks needed by polished single-player shell flows without relying on legacy stat playback.

- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-league-engine.js`
  - Ensure generated game outputs and generated stat lines are the only source of scores and results for supported sports.
  - Preserve and extend sport-specific realism tuning for NBA and NFL.

- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`
  - Re-home single-player season boot and progression onto simulation-native state.
  - Remove or bypass legacy historical-stat result resolution in favor of engine-generated results.
  - Keep the polished single-player shell, reveal framing, and page composition on top of simulation data.

- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-mode-runtime.js`
  - Add coverage for unified engine-backed season state expectations.

- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js`
  - Add coverage for single-player presentation on top of simulation-native state.

- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js`
  - Add regression coverage for single-player entry points landing in unified simulation-backed season flow.

- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-league-engine.js`
  - Protect generated stat output and realism assumptions as the engine becomes universal.

- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-page.js`
  - Add page/boot regression coverage if single-player boot routing changes.

- Modify if needed: legacy season tests in `tools/` that currently lock old stat-replay behavior
  - Remove or rewrite expectations so they align with the unified simulation engine target.

## Task 1: Lock The Replacement Contract In Tests

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-mode-runtime.js`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-page.js`

- [ ] **Step 1: Add a failing single-player boot test that expects the unified simulation path**

```js
assert.equal(getResolvedSeasonBackend(singlePlayerLeagueState), 'simulation');
assert.equal(activeSeasonMode, 'simulation');
assert.ok(seasonState.seasonState, 'single-player boot should normalize into simulation-native season state');
```

- [ ] **Step 2: Add failing adapter tests for simulation-native single-player view models**

```js
const rosterVm = adapter.getRosterViewModel();
assert.equal(rosterVm.layoutMode, 'single-player-parity');
assert.equal(rosterVm.statSourceLabel, 'Simulated');

const hubVm = adapter.getHubViewModel();
assert.ok(Array.isArray(hubVm.summaryCards));
assert.ok(Array.isArray(hubVm.recentActivity));
```

- [ ] **Step 3: Add failing runtime tests that reject legacy stat-only season assumptions**

```js
const next = runtime.buildUnifiedSeasonState(legacySinglePlayerSeed);
assert.ok(next.seasonState, 'unified state should always carry simulation-native season state');
assert.equal(next.legacyHistoricalStatMode ?? false, false);
```

- [ ] **Step 4: Run the targeted red-test suite**

Run:

```bash
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-mode-runtime.js
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-page.js
```

Expected:

- FAIL on unified-engine expectations for old single-player paths

- [ ] **Step 5: Record the local red-test checkpoint**

Run:

```bash
git -C "C:\Users\jabro\Desktop\Fantasy Project\rosterbate" status --short
```

Expected:

- targeted local test changes only for this task, with no commit required

## Task 2: Define One Canonical Season State For All Leagues

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-mode-runtime.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-mode-runtime.js`

- [ ] **Step 1: Add or expand unified season-state bootstrap helpers**

Create explicit runtime helpers so all leagues can normalize into one engine-backed state shape:

```js
function buildUnifiedSimulationSeasonState(seed) { ... }
function normalizeLegacySeasonIntoSimulationState(seed) { ... }
```

- [ ] **Step 2: Ensure unified state always carries simulation-native structures**

Guarantee presence of:

- `leagueShell`
- `draftState`
- `seasonState`
- `postseasonState`
- engine-backed standings/logs/lineup stores

- [ ] **Step 3: Remove runtime reliance on legacy stat-only season payloads**

Where legacy single-player state is still read directly for outcomes, redirect that usage into normalized simulation-native state instead.

- [ ] **Step 4: Run runtime verification**

Run:

```bash
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-mode-runtime.js
```

Expected:

- PASS with unified season-state expectations

## Task 3: Make The Simulation Engine The Only Source Of Outcomes And Stats

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-league-engine.js`
- Modify if needed: engine helpers that still assume mixed legacy/simulation output models
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-league-engine.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-nfl-shared-season-shell-weekly-sim.js`

- [ ] **Step 1: Audit remaining legacy output assumptions in season resolution**

Find and remove places where old single-player seasons still rely on pre-authored or replayed historical stat output.

- [ ] **Step 2: Ensure generated game logs and generated stats are canonical**

Keep engine outputs authoritative for:

- scores
- winners and losers
- player stat lines
- standings deltas
- recent results and league activity summaries

- [ ] **Step 3: Preserve sport-specific realism branches**

Do not flatten NBA and NFL behavior together. Keep:

- NBA score/stat generation tied to 2K-style ratings context
- NFL weekly score/stat generation tied to Madden-style ratings context

- [ ] **Step 4: Run engine verification**

Run:

```bash
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-league-engine.js
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-nfl-shared-season-shell-weekly-sim.js
```

Expected:

- PASS with no remaining legacy stat-playback path assertions

## Task 4: Re-Home Single-Player Boot And Season Flow Onto Simulation-Native State

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-season-adapter.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-page.js`

- [ ] **Step 1: Route single-player season entry points into simulation-native boot**

Single-player league loads should normalize into simulation-native state instead of branching into old season logic.

- [ ] **Step 2: Keep the polished single-player shell over the unified engine**

Preserve:

- the polished hub layout
- reveal framing
- matchup presentation
- powerup rail
- premium league feel

But source all stats and outcomes from simulation state.

- [ ] **Step 3: Replace old progression actions with simulation-backed reveal/progression**

Buttons like `Reveal Day` or equivalent should reveal engine-generated outcomes rather than loading legacy historical outputs.

- [ ] **Step 4: Run page/boot verification**

Run:

```bash
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-page.js
```

Expected:

- PASS with single-player entry points landing in unified engine-backed season flow

## Task 5: Finish Single-Player Presentation Parity On Top Of The Unified Engine

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-season-adapter.js`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js`

- [ ] **Step 1: Make sure single-player pages still look like the best current league shell**

Keep the polished single-player presentation on:

- Hub
- My Team
- Matchup
- Waivers
- Trades
- Standings

even though the backend is now fully simulation-native.

- [ ] **Step 2: Expose simulated-stat labels and engine-backed summaries where useful**

Where the UI refers to stat sources, make it clear that results are simulated/generated rather than historical replay.

- [ ] **Step 3: Remove presentation assumptions that depend on legacy stat playback**

Any UI text or state that implies old historical stat behavior should be rewritten or removed.

- [ ] **Step 4: Run parity verification**

Run:

```bash
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js
```

Expected:

- PASS with single-player presentation still polished over the unified engine

## Task 6: Retire Legacy Historical-Stat Season Paths

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`
- Modify legacy helpers/modules still responsible for historical-stat season gameplay
- Modify affected tests in `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\`

- [ ] **Step 1: Identify dead or superseded legacy stat-replay code paths**

Specifically target season resolution and progression branches that should no longer run after the unified engine replacement.

- [ ] **Step 2: Remove or bypass retired legacy logic**

Prefer deletion where safe. If temporary shims are needed during the rollout, keep them small and clearly transitional.

- [ ] **Step 3: Rewrite tests that still lock old behavior**

Do not preserve assertions whose only purpose is to keep legacy stat-replay gameplay alive.

- [ ] **Step 4: Run the broader regression set**

Run:

```bash
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-mode-runtime.js
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-league-engine.js
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-page.js
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-nfl-shared-season-shell-weekly-sim.js
```

Expected:

- PASS with no remaining legacy season gameplay path relied upon

## Task 7: Local Product Verification And Reset Path

**Files:**
- Modify if needed: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`
- Modify if needed: boot/reset helpers used by local leagues

- [ ] **Step 1: Verify local single-player seasons now boot into the unified engine**

Use local test leagues and reset any old single-player saves as needed instead of preserving them.

- [ ] **Step 2: Verify local simulation leagues still behave correctly**

Make sure the replacement did not regress the newer engine-backed league paths while unifying single-player.

- [ ] **Step 3: Record any required local reset/delete instructions**

If old single-player saves must be discarded, document the minimal local reset path needed for clean testing.

- [ ] **Step 4: Run final local verification commands and inspect `git status`**

Run:

```bash
git -C "C:\Users\jabro\Desktop\Fantasy Project\rosterbate" status --short
```

Expected:

- only intended local changes remain
- no commits or pushes are required
