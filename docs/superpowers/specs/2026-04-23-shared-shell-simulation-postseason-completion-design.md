# Shared Shell Simulation Postseason Completion Design

**Date:** 2026-04-23  
**Branch:** `shared-season-shell-simulation-backend`

## Goal

Complete the mixed-era NBA simulation mode by extending the shared season shell from regular-season simulation into a full modern NBA postseason flow:

- exact modern NBA play-in format
- day-by-day postseason game simulation
- dedicated `Playoffs` tab in the shared shell
- full bracket progression through the Finals
- champion and trophy state saved into the universe

This work must preserve the current product direction:

- one shared season shell
- one saved simulation universe flow
- one day-by-day calendar rhythm across regular season and postseason
- roster moves remain open through the playoffs

## Product Direction

The postseason should feel like a continuation of the same season, not a handoff into a separate mode or page.

The user should be able to:

1. complete the regular season
2. enter a `postseason_ready` state
3. follow play-in and playoff games one day at a time
4. keep managing lineups, waivers, trades, and injuries throughout
5. win a championship and see a trophy/champion payoff

This mode remains intentionally more gamey than a full real-world NBA operations sim because roster moves stay open through the playoffs. That is a product choice, not a bug.

## Core Experience

The shared shell should remain the only season manager for mixed-era simulation universes.

The user journey becomes:

1. create a simulation league
2. draft manually or use `Sim Draft and Start Season`
3. play through the regular season day by day
4. enter postseason
5. use the new `Playoffs` tab to track bracket and title race
6. complete the Finals
7. receive champion/trophy state in the finished universe

## Postseason State Model

The simulation universe should keep postseason progression inside `postseasonState`.

Supported phases:

- `regular_season`
- `postseason_ready`
- `play_in`
- `playoffs_round_1`
- `playoffs_round_2`
- `conference_finals`
- `finals`
- `completed`

`seasonState.currentDay` should continue advancing through the postseason. We are not switching to a separate calendar model.

`postseasonState` should carry:

- `phase`
- `playIn`
- `bracket`
- `seriesById` or equivalent round/series state
- `currentRound`
- `champion`
- `runnerUp`
- `completedAt`

At minimum, each series should track:

- conference or finals scope
- round
- higher seed team
- lower seed team
- wins by side
- scheduled games
- played game log
- winner when resolved

## Play-In Format

The first postseason version should use the exact modern NBA play-in structure in each conference:

- `7 vs 8` for the `7` seed
- `9 vs 10` elimination game
- loser of `7 vs 8` vs winner of `9 vs 10` for the `8` seed

These are real scheduled postseason game days, not instant results.

The shell should simulate them one day at a time using the same overall rhythm as the regular season.

## Playoff Series Format

After the play-in resolves:

- East and West brackets should be seeded `1-8`
- Round 1, Conference Semifinals, Conference Finals, and NBA Finals should all be best-of-7
- each postseason day should only simulate the games scheduled for that day

The mode does not need the exact real-world 2025-26 playoff calendar.
It does need a believable generated postseason calendar that preserves day-by-day drama and bracket progression.

## Shared Shell Navigation

Add a new `Playoffs` tab to the shared season shell.

Navigation behavior:

- hidden during `regular_season`
- appears at `postseason_ready`
- remains visible through `completed`

Tab responsibilities:

- `Schedule`
  - today's postseason games
  - recently completed game results
  - day-by-day calendar progression

- `Playoffs`
  - play-in bracket
  - East / West bracket overview
  - active series status
  - Finals promotion
  - champion/trophy state when finished

The `Playoffs` tab is the bracket/story view.
The `Schedule` tab remains the daily game-feed view.

## Playoffs Tab UX

The `Playoffs` tab should render by phase:

### `postseason_ready`

- final conference standings locked
- East and West seeding preview
- play-in field preview
- clear state that the regular season is complete

### `play_in`

- current play-in matchups prominently shown
- completed play-in games summarized beneath
- bracket placeholders updating as seeds `7` and `8` are earned

### playoff rounds

- full East and West bracket visible together
- each series card shows:
  - seed matchup
  - current series score
  - next scheduled game
  - elimination pressure where relevant

### `finals`

- Finals series visually promoted above conference bracket context
- remaining bracket path still visible underneath

### `completed`

- champion banner / trophy treatment
- Finals result
- runner-up
- playoff path summary
- season-complete framing

## Championship and Trophy

When the Finals end:

- `postseasonState.phase` becomes `completed`
- champion and runner-up are saved
- championship metadata is written into the universe
- the `Playoffs` tab becomes a finished title screen rather than an active bracket view

Saved champion data should include at minimum:

- `championTeamAbbr`
- `runnerUpTeamAbbr`
- `finalsGames`
- Finals series result
- completion timestamp

Universe details and archive views should be able to show:

- champion
- runner-up
- Finals result
- playoff bracket path or summary
- source seasons used in the universe

## Technical Shape

### `simulation-season-adapter.js`

This should become the primary postseason state machine.

Responsibilities:

- detect regular-season completion
- transition to `postseason_ready`
- seed play-in and bracket state
- schedule postseason game days
- resolve day-by-day postseason progression
- stop advancing once the season is complete

This logic belongs in the adapter because the shared shell already delegates simulation progression there.

### `simulation-league-engine.js`

Continue using engine helpers for:

- game simulation
- play-in field construction
- playoff bracket creation

Extend only where needed for clean series progression helpers.
Do not duplicate bracket logic in the shell if the engine can own it cleanly.

### `rosterbate-season.html`

Add:

- `Playoffs` tab in simulation mode nav
- playoff-phase-aware rendering
- day-by-day postseason schedule presentation
- champion/trophy rendering once complete

The season shell should stay thin where possible:
it should render adapter state, not become the main postseason rules engine.

## State and Persistence Rules

- postseason progression must persist through the same historical universe slot pathway already used by the shared simulation shell
- reopening a saved simulation universe mid-playoffs should restore:
  - phase
  - bracket
  - series scores
  - next scheduled games
- reopening a completed simulation universe should restore:
  - champion state
  - completed playoff bracket data

## Open Management During Playoffs

For v1 postseason completion, keep these management paths open throughout the playoffs:

- lineups
- waivers
- trades
- injuries

This is intentionally different from the real NBA transaction calendar, but consistent with the current simulation mode direction.

The shell should not silently lock these systems when the postseason starts.

## Testing Requirements

### Adapter tests

Add or extend adapter coverage for:

- regular season end transitions to `postseason_ready`
- play-in structure seeded correctly from final standings
- first postseason game day updates play-in / series state correctly
- series winners advance to the next round
- Finals completion writes champion / runner-up / completion state
- later `simulateNextDay()` calls do not keep mutating a completed season

### Shared-shell tests

Add or extend shared-shell coverage for:

- `Playoffs` tab visibility timing
- playoff tab rendering after `postseason_ready`
- `Schedule` and `Playoffs` state staying in sync
- management actions continuing to work during playoffs
- reopening saved universes mid-playoffs and after completion

### Browser smoke expectations

Manual smoke testing should cover:

1. simulate into postseason from a real mixed-era universe
2. advance through play-in
3. advance through bracket rounds day by day
4. finish Finals
5. reopen the completed universe and verify champion/trophy state

## Guardrails

To keep this implementation focused:

- no exact real-world nightly playoff calendar replication
- no franchise economy systems
- no multiplayer postseason integration
- no offseason / multi-year carryover
- no custom tournament variants
- no deep narrative engine beyond what falls naturally out of bracket state

## Recommended Implementation Order

1. extend adapter state and tests for postseason-ready transition
2. add generated day-by-day play-in / bracket schedule support
3. add shared-shell `Playoffs` tab rendering
4. add Finals completion and champion/trophy persistence
5. add archive/details rendering for completed champion state

## Success Criteria

This work is successful when:

- a mixed-era simulation league can move from regular season to play-in without leaving the shared shell
- the user can simulate the entire postseason day by day
- the `Playoffs` tab clearly communicates bracket progress
- the league ends with a champion and trophy state
- saved universes reopen correctly in progress and after completion
