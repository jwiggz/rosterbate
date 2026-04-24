# NFL Shared Season Shell Postseason Completion Design

**Date:** 2026-04-24  
**Status:** Draft for review

## Goal

Complete the NFL simulation lane by extending the shared season shell from a playable `2014 NFL` regular season into a full postseason run with:

- the exact `2014 NFL` playoff format
- `12` total playoff teams
- `2` byes per conference
- Wild Card, Divisional, Conference Championship, and Super Bowl rounds
- week-by-week postseason simulation inside the existing shared shell

This pass finishes the NFL season loop. It does not create a separate football-only season page.

## Product Intent

The NFL mode should now feel complete in the same way the NBA simulation lane does:

1. create or reopen a mixed-era NFL league
2. play through the real 2014 regular season week by week
3. transition into the real 2014 playoff field
4. simulate the postseason one NFL week at a time
5. finish with a real Super Bowl champion saved into archive/details

The shell stays gamey where we already chose to be gamey:

- waivers stay open
- trades stay open
- lineup changes stay open between sim steps

The playoff structure is exact 2014 NFL, but the roster-management rules remain sandbox-friendly.

## Exact 2014 Playoff Format

The postseason must use the exact `2014 NFL` structure, not the modern `14-team` format.

### Conference field

Each conference (`AFC`, `NFC`) gets:

- `4` division winners seeded `1-4`
- `2` wild cards seeded `5-6`

Total field:

- `6` teams per conference
- `12` teams overall

### Byes

In each conference:

- seed `1` gets a bye
- seed `2` gets a bye

Seeds `3-6` play in Wild Card weekend.

### Wild Card Round

In each conference:

- `3 vs 6`
- `4 vs 5`

### Divisional Round

After Wild Card results:

- seed `1` hosts the lowest remaining seed
- seed `2` hosts the other remaining seed

This reseeding is required and should be exact.

### Conference Championships

The two remaining teams in each conference play for:

- `AFC Championship`
- `NFC Championship`

### Super Bowl

The AFC champion and NFC champion advance to a single championship game:

- `Super Bowl XLIX`

The winner becomes the league champion and the season moves to `completed`.

## Shared Shell Behavior

The NFL postseason stays inside the shared season shell in [rosterbate-season.html](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/rosterbate-season.html).

### Hub

The Hub should stay week-based and change meaning by phase:

- `regular_season`
  - current week
  - next opponent
  - division/conference race

- `postseason_ready`
  - playoff qualification locked
  - your seed / whether you earned a bye
  - next postseason round preview

- active postseason rounds
  - current round
  - current matchup
  - win-or-go-home stakes

- `completed`
  - season complete state
  - champion summary
  - no further sim CTA

The primary action should stay `Sim Week` through active postseason rounds, then stop once a champion exists.

### Schedule tab

The `Schedule` tab remains the literal week board:

- current playoff week games
- completed postseason results
- the next week’s slate when applicable

This is still the “what games are happening now?” view.

### Playoffs tab

The `Playoffs` tab becomes the bracket/story view for NFL.

It should show:

- seeded AFC and NFC fields
- bye teams
- current round matchups
- round-to-round advancement
- conference champions
- Super Bowl matchup and result

This is the “what does this week mean?” view.

## Weekly Postseason Simulation Model

NFL postseason cadence should match the regular-season NFL shell:

- one user sim action equals one NFL week block

That means:

- Wild Card round resolves in one `Sim Week`
- Divisional round resolves in one `Sim Week`
- Conference Championship round resolves in one `Sim Week`
- Super Bowl resolves in one `Sim Week`

The postseason does not need a day-by-day breakdown. It should feel like the football continuation of the weekly regular-season loop.

## State Model

The existing simulation universe shape stays intact, but `postseasonState` needs full NFL progression data.

### Phase values

- `regular_season`
- `postseason_ready`
- `wild_card`
- `divisional`
- `conference_championship`
- `super_bowl`
- `completed`

### Required postseason data

- `playoffPicture`
  - `afc`
  - `nfc`
  - seeded teams `1-6`
  - division-winner and wild-card identity

- `bracket`
  - round-by-round matchup objects
  - winners
  - reseeded divisional pairings
  - conference champions

- `championship`
  - Super Bowl matchup
  - winner
  - runner-up
  - final score/result metadata

The season save should preserve this state so reopening a completed NFL universe still shows the playoff path that actually happened.

## Technical Responsibilities

### `simulation-season-adapter.js`

This file should own most of the NFL postseason orchestration:

- detect end of Week `17`
- seed the exact 2014 `12-team` playoff field
- build Wild Card, Divisional, Conference Championship, and Super Bowl schedules
- perform divisional-round reseeding correctly
- transition the state phase week by week
- stop advancement once the champion exists

### `simulation-league-engine.js`

The engine should continue to do what it already does best:

- simulate the games in the current week schedule
- return winners/results cleanly

It does not need to own bracket policy. It should remain the result engine, not the rules arbiter.

### `rosterbate-season.html`

The shell page should:

- render NFL postseason Hub content
- render the Playoffs tab for each postseason round
- keep `Sim Week` aligned with the current phase
- stop showing a live sim action once the season is complete

### Archive/detail consumers

The saved universe output should retain:

- playoff seeds
- round winners
- conference champions
- Super Bowl matchup
- champion
- runner-up

So archive/details can tell the postseason story instead of only the regular-season story.

## Management Rules During Playoffs

Per current product direction, these remain open through the NFL postseason:

- lineup changes
- waivers
- trades
- injuries

This intentionally does **not** mirror real NFL transaction restrictions. It should remain consistent with the sandbox behavior already chosen for simulation mode.

## Verification Plan

### Seeding

Verify:

- exact `12-team` field
- exact `6-team` field per conference
- division winners seeded `1-4`
- wild cards seeded `5-6`
- seeds `1-2` get byes

### Progression

Verify:

- Wild Card round resolves correctly
- Divisional round reseeds correctly
- Conference Championships resolve correctly
- Super Bowl produces exactly one champion

### Shared shell behavior

Verify:

- Hub changes labels/state by postseason phase
- `Schedule` shows the current playoff week slate/results
- `Playoffs` shows the correct bracket/story state
- `Sim Week` remains available through Super Bowl week and then stops

### Persistence

Verify:

- reopened in-progress playoff universes preserve the bracket correctly
- reopened completed universes preserve the champion and path correctly

## Out Of Scope

This pass does not include:

- deeper football AI roster strategy
- stricter real-world NFL transaction rules
- exact real-world postseason calendar dates beyond the round structure
- a separate football-only season page

## Recommendation

Implement this as a direct continuation of the current NFL weekly-sim foundation on the shared shell.

Do not fork a parallel NFL postseason page. The value here is completing the same season-shell product lane with exact 2014 playoff rules and a real Super Bowl endpoint.
