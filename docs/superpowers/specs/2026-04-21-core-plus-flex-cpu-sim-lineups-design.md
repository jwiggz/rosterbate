Date: 2026-04-21

# Core-Plus-Flex CPU Sim Lineups Design

## Goal
Improve CPU lineup selection for historical simulation leagues so AI teams behave like competent fantasy managers: they keep a stable core of high-upside stars, react to injuries and no-game days, and still make clear daily upgrades when the gap is meaningful.

The first version should make sim-league CPU behavior feel smarter without rewriting the underlying simulation engine or turning CPU lineup logic into a hyperactive daily optimizer.

## Why This Exists
The current CPU maintenance layer already does legal-roster work:
- it moves injured players to and from IL
- it fills missing starters from waivers
- it keeps solo-league rosters usable

What it does not yet do well is preserve strong simulation lineups over time.

Right now `normalizeCpuTeamLineups(teamIdx)` rebuilds starters from the same generic `buildBestLineupIdsForRoster()` logic used elsewhere. That means CPU teams:
- have no stable star core
- can churn starters too easily
- do not distinguish between a tiny daily edge and a meaningful upgrade
- are not explicitly optimized for historical simulation leagues

Since `simulateLeagueDay()` only uses the chosen starters, smarter CPU lineup behavior is the highest-leverage gameplay improvement in this lane.

## Scope

### In scope
- smarter CPU starter selection for historical simulation leagues
- a core-plus-flex lineup model for CPU-managed teams
- stable star-preserving behavior on close daily decisions
- day-level reactions to injuries, no-game days, and clear upgrades
- a testable CPU lineup helper extracted from the giant season page
- focused automated coverage for the new lineup policy

### Out of scope
- changing simulation-game math in `simulation-league-engine.js`
- rewriting waiver or IL automation from scratch
- adding personality systems, trade tendencies, or long-term franchise AI
- changing user-controlled lineup behavior
- changing non-simulation season lineup rules

## Recommended Approach
Use a `core-plus-flex` model.

### Core idea
Each CPU sim-league team should:
1. identify a small stable core of its highest-upside starters
2. preserve those players on game days when the alternatives are only marginally better
3. fill the remaining slots with the best day-specific options
4. still bench core players when they are unavailable or when a bench alternative is clearly better

This is better than pure daily optimization because it avoids unrealistic churn.
It is better than role stability alone because it still reacts to day-level opportunities.

## Product Behavior

### 1. Stable core of stars
CPU teams should default to a `3-player` core.

The core should be chosen from simulation-facing strength, not generic fantasy points alone. The main signal should be:
- `simProfile.ratings.overall`

with extra weight toward:
- `usage`
- `scoring`
- `playmaking`

Core size should stay dynamic, but tightly bounded:
- allow `2` if the roster drops off sharply after the top two
- allow `4` if the fourth player is effectively in the same tier as the top three
- otherwise use `3`

### 2. Daily flex optimization
Once the core is identified, the CPU should fill the rest of the lineup with the best day-specific options.

That means:
- inactive players sit
- unavailable or serious-injury players sit
- flexible starters can change by day
- the CPU still uses slot legality correctly

### 3. Star-preserving close-call logic
If a core player has a game and is healthy enough to play, a tiny bench edge should not force them out.

On close calls:
- keep the higher-upside star

Only replace a playable core starter when:
- the bench alternative is a clear upgrade for that day

The point is not to force stars into every lineup.
The point is to stop CPU teams from acting like emotionless projection sorters when the difference is trivial.

### 4. No-game and injury behavior
Core status is not immunity.

If a core player:
- has no game that day
- is unavailable
- or cannot legally fill the slot in question

the CPU should use the best valid replacement.

### 5. Fallback behavior
This behavior should apply only to historical simulation universes.

Non-simulation seasons should keep the current generic lineup rebuild behavior unless a future spec expands the scope.

If the helper is unavailable for any reason, the season page should safely fall back to the existing `buildBestLineupIdsForRoster()` flow.

## Technical Design

### Extract a small pure helper
Add a new browser-and-Node-safe helper file:
- `cpu-sim-lineups.js`

This file should expose a focused API such as:
- `scoreCpuSimLineupCandidate(player, options)`
- `selectCpuSimCoreStarterIds(roster, options)`
- `buildCpuSimLineupIds(options)`

The helper should:
- stay pure
- accept callbacks for day/game/injury/slot checks
- be require-able from Node tests
- attach itself to `window` for browser use

### Use the helper inside the season page
Keep season-state orchestration in:
- `rosterbate-season.html`

That file should:
- load `cpu-sim-lineups.js`
- detect historical simulation universes with existing season-state helpers
- route CPU lineup normalization through the new helper for CPU-managed sim teams
- keep existing fallback behavior for everything else

### Preserve the current roster-maintenance entry point
Do not build a separate CPU lineup scheduler yet.

The existing flow is already correct structurally:
- `maintainCpuTeamRoster()`
- `maintainCpuLeagueRosters()`
- `normalizeCpuTeamLineups()`

The first pass should change lineup quality by upgrading `normalizeCpuTeamLineups()`, not by adding a second orchestration system.

## Files

### `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\cpu-sim-lineups.js`
Purpose:
- hold the pure CPU sim-lineup scoring and lineup-building logic
- expose a browser global and a Node-friendly export surface

### `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`
Purpose:
- load the new helper
- route CPU sim-league lineup normalization through it
- preserve current fallback behavior for non-simulation flows

### `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-cpu-sim-lineups.js`
Purpose:
- prove the core-plus-flex behavior directly with synthetic players
- verify star stability, no-game benching, and clear-upgrade replacement

### `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-cpu-sim-lineup-wiring.js`
Purpose:
- statically verify the season page includes the new helper and uses it in CPU sim-lineup normalization

## Verification Strategy

### 1. Focused policy regression
Add a direct helper test that proves:
- a higher-upside core star wins close daily ties
- a core star with no game sits
- a clear bench upgrade can replace a core player
- dynamic core sizing still stays within the approved `2-4` band

### 2. Wiring regression
Add a small static wiring test that proves:
- `rosterbate-season.html` loads `cpu-sim-lineups.js`
- CPU lineup normalization can route historical simulation universes through the helper
- fallback behavior still exists

### 3. Manual sim-league check
After implementation:
- boot a historical simulation universe
- inspect at least one CPU team across multiple days
- confirm the team keeps a stable star core on playable days
- confirm injuries and no-game days force replacements
- confirm the lineup does not churn just because of tiny daily deltas

## Success Criteria
- CPU teams in historical simulation leagues keep a believable star core
- playable stars are no longer benched on tiny projection edges
- inactive or unavailable players still sit automatically
- flex slots still react to meaningful day-level upgrades
- the new logic is isolated enough to test without loading the whole season page into Node

## Failure Conditions
This pass should be considered unsuccessful if:
- CPU teams still churn starters constantly on close calls
- core players become too sticky and ignore obvious upgrades
- unavailable or no-game players remain in simulated lineups
- the implementation only works inside the HTML page and cannot be tested directly
- non-simulation flows break because the fallback path was not preserved
