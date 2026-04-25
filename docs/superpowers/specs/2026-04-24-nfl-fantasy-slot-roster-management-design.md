# NFL Fantasy-Slot Roster Management Design

Date: 2026-04-24
Status: Approved design for implementation planning

## Summary

Extend the shared simulation season shell so NFL roster management feels like the NBA sim season in how it interacts with the site, while using football-specific fantasy lineup slots underneath.

The NFL season should continue to use the same shared shell experience:

- Hub
- Roster
- Schedule
- Waivers
- Trades
- Standings
- Playoffs

The football-specific difference is inside the roster-management model. Instead of a generic starter list, the user controls a slot-based weekly fantasy lineup:

- `QB`
- `RB1`
- `RB2`
- `WR1`
- `WR2`
- `TE`
- `FLEX`
- `K`
- `DST`

This is intentionally not a full football depth chart. There is no offensive-line management, no `QB2/RB3/WR4` charting, and no real-world coaching depth-chart simulation in this phase.

## Goals

- Keep the NFL season experience aligned with the same shared shell behavior as the NBA sim season.
- Make NFL roster interaction feel football-specific through slot-based lineup management.
- Keep the user in control of weekly lineup decisions.
- Allow flexible roster construction through waivers and trades.
- Block weekly simulation when the user lineup is invalid.
- Preserve existing NFL weekly regular-season and postseason flows.

## Non-Goals

- Full real-football depth chart management.
- Offensive line, defensive front, or special-teams sub-unit configuration.
- Auto-fixing the user lineup at sim time.
- Forcing realistic roster-balance rules.
- Replacing the shared season shell with a separate NFL season product.

## Product Shape

The NFL season must behave like the NBA sim season at the site level.

That means the user should stay inside the same shared season shell and use the same overall interaction model:

- open the season shell
- manage the team
- review schedule and standings
- use waivers and trades
- simulate forward
- move through playoffs

The difference is local to NFL roster management:

- NBA remains a basketball starter/bench flow
- NFL becomes a weekly fantasy-slot lineup flow

This preserves product consistency while making football management feel correct.

## NFL Lineup Model

### Source of truth

NFL lineup state should be slot-based rather than a flat list of starter IDs.

Use a team-scoped structure like:

`lineupSlotsByTeam[teamAbbr] = { QB, RB1, RB2, WR1, WR2, TE, FLEX, K, DST }`

Each slot holds one assigned player ID or is empty.

NBA can continue using the simpler starter-ID model.

### Slot eligibility

- `QB` accepts only `QB`
- `RB1` accepts only `RB`
- `RB2` accepts only `RB`
- `WR1` accepts only `WR`
- `WR2` accepts only `WR`
- `TE` accepts only `TE`
- `FLEX` accepts `RB`, `WR`, or `TE`
- `K` accepts only `K`
- `DST` accepts only `DST`

### Invalid lineup conditions

A weekly NFL lineup is invalid when any of the following is true:

- a required slot is empty
- a slot contains an ineligible position
- the same player is assigned to multiple slots
- a player marked `OUT` occupies a starting slot

Bench composition is otherwise unrestricted.

## Roster Page Behavior

The NFL roster tab should present two clear sections:

### Starting lineup

Show fixed slot cards for:

- `QB`
- `RB1`
- `RB2`
- `WR1`
- `WR2`
- `TE`
- `FLEX`
- `K`
- `DST`

Each slot should show:

- assigned player name
- position
- team metadata
- availability state when relevant
- empty-state warning when unfilled

### Bench and full roster

All players not assigned to an active slot appear in the bench list.

The bench area should still support the current season-shell browsing patterns where reasonable, such as:

- position filtering
- sorting
- quick assignment actions

### Readiness state

The roster page should prominently show whether the team is ready to sim the next week.

Examples:

- `Ready For Week`
- `2 lineup issues to fix`

Broken slots should be visually highlighted so the user can fix them quickly.

## User Control Rules

### No auto-fixes

The user must control the lineup manually.

The system should not:

- auto-substitute benched players into open slots
- auto-remove `OUT` starters and replace them
- silently optimize the lineup before `Sim Week`

### Sim gating

`Sim Week` should be blocked when the user lineup is invalid.

The error state should explain what needs to be fixed, such as:

- missing `TE`
- `FLEX` contains an invalid position
- `WR1` is `OUT`

### Flexible roster construction

The user can stockpile positions as long as a valid starting lineup can still be set.

There is no minimum roster-balance enforcement for waivers or trades beyond what is needed to set a legal weekly lineup.

## Waivers And Trades

Waivers and trades remain open and flexible, including during the postseason, consistent with the current gamey simulation rules.

After a waiver or trade:

- any removed player must be cleared from occupied lineup slots
- emptied slots stay empty until the user fills them
- lineup validity must refresh immediately
- the roster screen should warn the user if the move broke the weekly lineup

This preserves freedom while keeping weekly consequences visible.

## Recommendations

The NFL roster screen should help the user without taking control away.

Provide advisory helpers such as:

- suggested starters
- best legal lineup recommendation
- slot-level hints

Examples:

- `Best RB on bench available for RB2`
- `FLEX upgrade available`
- `Current starter is OUT`

These recommendations are advisory only.

## Sim Behavior

### User team

The sim engine should treat the user's assigned NFL slot lineup as the active weekly lineup.

Only the assigned starters should contribute as that team's starting unit for the current week.

Bench players should not silently count as starters.

### CPU teams

CPU teams can remain auto-managed in this phase.

They should automatically field the strongest valid fantasy lineup available from their roster each week.

This keeps the league functional without requiring full manual NFL roster management across all 32 teams.

## Technical Shape

### `simulation-mode-runtime.js`

Add NFL-specific roster helpers for:

- slot definitions
- slot eligibility checks
- slot assignment and clearing
- lineup validation
- suggested valid lineup generation
- cleanup after waivers and trades

NFL lineup state should become slot-based here.

### `simulation-season-adapter.js`

Expose NFL roster view models that include:

- slot assignments
- bench list
- invalid slot details
- readiness state
- recommendation hints

The adapter should also block `Sim Week` when the controlled NFL team lineup is invalid.

### `rosterbate-season.html`

Render NFL roster management inside the shared shell with:

- lineup slot cards
- assignment actions
- invalid-state highlighting
- readiness messaging
- recommendation affordances

NBA surfaces should remain unchanged.

### `simulation-league-engine.js`

Use the user's assigned NFL slot lineup when calculating user-team weekly contribution.

CPU teams may still derive valid weekly lineups automatically.

## Verification Plan

### Lineup state

Verify:

- valid slot assignments save correctly
- invalid position assignments are rejected
- duplicate player assignment is rejected
- `OUT` starters make the lineup invalid
- waivers and trades clear removed players from occupied slots

### Roster UI

Verify:

- the NFL roster tab shows slot cards and bench correctly
- invalid states are clearly visible
- readiness state updates immediately
- recommendation hints render correctly

### Sim gating

Verify:

- `Sim Week` is blocked when the user lineup is invalid
- `Sim Week` proceeds when the user lineup is valid
- CPU teams still field legal lineups automatically

### Regression

Verify:

- NBA roster flow still works unchanged
- NFL regular season still advances week by week
- NFL postseason still advances correctly after lineup validation is introduced

## Rollout Guardrails

Phase 1 should stay limited to fantasy-slot roster management only.

Do not add:

- full real-football depth charts
- offensive line assignment
- defensive sub-package management
- coaching/scheme layers
- auto-management that overrides user choices

The goal of this feature is to make NFL season-shell management feel as polished and controllable as NBA, while staying true to a fantasy football slot model.
