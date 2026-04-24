# NFL Shared Season Shell And Weekly Sim Design

**Date:** 2026-04-24  
**Status:** Draft for review

## Goal

Extend the shared simulation season shell so NFL simulation leagues become truly playable after setup and draft, using:

- the real `2014 NFL` shell
- the real week-by-week `2014` schedule
- a football-native weekly sim cadence
- the same shared season-shell product family already used by NBA

This pass focuses on **NFL season shell + weekly sim flow first**, not full playoff completion.

## Product Intent

The NFL mode should feel like the football counterpart to the NBA simulation lane:

- same overall season-shell experience
- same management mindset
- same save/reopen behavior
- football-native backend rules underneath

The user should be able to:

1. create an NFL simulation league from historical source seasons
2. reach the shared season shell after draft or auto-draft
3. manage a football roster
4. simulate one full NFL week at a time
5. progress through the real 2014 regular season in weekly cadence

## Mode Shape

The NFL version uses the same full shell structure as NBA:

- `Hub`
- `Roster`
- `Schedule`
- `Waivers`
- `Trades`
- `Standings`
- `Playoffs`

The shell must read as football immediately, not as basketball with a few renamed labels.

## Weekly Core Loop

NFL tempo is **week-by-week**, not day-by-day.

The main loop is:

1. review your roster/depth
2. make lineup, waiver, or trade moves
3. inspect the current NFL week slate
4. hit `Sim Week`
5. resolve that full week's games
6. update standings, injuries, transactions, and weekly storylines
7. repeat until the regular season ends

The shell should use `week` as the meaningful simulation clock for NFL mode.

## Roster Shape

NFL v1 lineup should use common fantasy-style football positions, without `OL`.

Starting lineup:

- `QB`
- `RB`
- `RB`
- `WR`
- `WR`
- `TE`
- `FLEX`
- `DST`
- `K`

Everything else on the `13`-slot roster is bench/depth.

V1 does not need a deep coaching or full depth-chart subsystem. It only needs:

- starter/bench swapping
- clean required-slot validation
- clear visibility into missing starters before simming a week

## Real 2014 Schedule

NFL v1 must use the **real 2014 NFL week-by-week schedule**, not a generated approximation.

That means preserving:

- actual Week `1` through Week `17`
- real byes
- real matchup pairings by week
- regular season progression in real NFL order

The schedule tab should be week-centric:

- current week label
- all games in the current week
- completed results for simulated weeks
- next week preview after advancement

## Management Rules

Per product direction, management remains intentionally gamey through the full season:

- waivers stay open
- trades stay open
- lineup changes stay open before the next weekly sim
- this permissive behavior continues into playoffs later

We are not mirroring real NFL transaction restrictions here.

## Tab Behavior

### Hub

The NFL hub should emphasize:

- current week
- your team's record
- division/conference position
- next opponent
- key injuries
- weekly recap after each sim

### Roster

The roster tab should present football starters first, then bench/depth.

It must support:

- filling the required starting slots
- starter/bench swaps
- clear slot-based viewing rather than a flat basketball-style rotation panel

### Schedule

The schedule tab becomes the week board:

- current week slate
- completed week results
- upcoming week preview

### Waivers / Trades

These stay active all season and remain part of the same permissive simulation-management layer used in NBA mode.

### Standings

NFL standings should prioritize:

- overall record
- division grouping
- conference race
- wildcard pressure

The view should feel like AFC/NFC playoff-picture tracking, not a flat NBA conference table.

### Playoffs

The `Playoffs` tab can exist immediately as a stable shell destination, but in this phase it only needs to support:

- postseason preview
- projected seed picture
- division leaders
- wildcard race context

Full NFL playoff simulation can follow in a later phase.

## Technical Shape

This should evolve the shared simulation adapter from **NBA-shaped** to **sport-aware**.

### Adapter Direction

[simulation-season-adapter.js](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/simulation-season-adapter.js) currently carries heavy NBA assumptions:

- NBA-only mode identity
- day-based cycle labels
- NBA-shaped schedule and postseason helpers

For NFL weekly sim, the adapter should split by sport at a higher level rather than sprinkling one-off `if nfl` conditionals everywhere.

Recommended structure:

- shared adapter entry point
- sport-aware helper branches underneath
  - NBA helpers
  - NFL helpers

### NFL-Specific Concerns

The NFL branch needs its own handling for:

- week labels instead of day labels
- football lineup slots
- real weekly schedule parsing
- football standings presentation
- regular-season weekly advancement

### Compatibility

This work must preserve:

- NBA simulation shell behavior
- saved NBA simulation universes
- existing shared-shell reopen flow

NFL should be additive, not a reset of the NBA mode.

## Proposed Implementation Scope

### In Scope

- NFL shared season-shell boot
- real 2014 weekly schedule consumption
- NFL weekly `Sim Week` progression
- football roster slot rendering
- football standings rendering
- open waivers/trades/injury handling during regular season
- stable postseason-ready handoff at regular-season end

### Out Of Scope For This Pass

- full NFL playoff bracket simulation
- full Super Bowl completion flow
- advanced coaching/depth-chart systems
- contracts/cap/franchise economy systems
- generalized multi-sport refactor beyond what NFL weekly sim actually needs

## Likely Files

- [simulation-season-adapter.js](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/simulation-season-adapter.js)
- [simulation-league-engine.js](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/simulation-league-engine.js)
- [simulation-mode-runtime.js](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/simulation-mode-runtime.js)
- [rosterbate-season.html](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/rosterbate-season.html)
- [historical-packs/nfl_2014_full_season_v1](</C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historical-packs/nfl_2014_full_season_v1>)
- tests under [tools](</C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools>)

## Verification Plan

### Adapter / State

Verify that:

- NFL state boots into the shared shell correctly
- football lineup slots are used instead of NBA starter assumptions
- weekly progression advances from Week `1` through Week `17`

### Rendering

Verify that:

- hub/roster/schedule/standings render football-native content
- no NBA copy leaks into NFL mode
- the shell remains stable when reopening saved NFL simulation universes

### Season Flow

Verify that:

- the real 2014 weekly schedule is loaded correctly
- `Sim Week` resolves the correct week's games together
- standings remain coherent over the season
- waivers/trades remain usable through the regular season
- the season reaches a stable postseason-ready state

## Recommendation

Implement this as the next NFL milestone before building playoff completion.

That gives the product its first **actually playable football simulation season**, rather than stopping at setup and draft creation.

