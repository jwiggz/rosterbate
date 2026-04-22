---
title: "Simulation Universe CPU Trade Market V1 Design"
type: spec
tags: [rosterbate, simulation, cpu, trades, market, design]
created: 2026-04-21
updated: 2026-04-21
---

## Goal
Add a first believable CPU trade market to simulation universes so CPU teams can occasionally correct real roster imbalances instead of only relying on lineups, IL moves, and waivers.

## Why This Pass
The simulation-universe lane has improved in several important ways:

- CPU teams now build better sim lineups
- CPU team personalities are varied enough to keep
- CPU teams now manage IL and dead roster spots more realistically
- `Universe Details` now explains recent sim days and recent roster moves

That means the main remaining realism gap is no longer:

- can CPU teams keep a legal lineup?

It is:

- can CPU teams reshape a roster when the season reveals a real weakness?

This pass fills that gap with a conservative market layer.

## Scope
This is a narrow `v1`.

It should:

- run only in simulation universes
- create only CPU-to-CPU trades
- use only conservative need-based logic
- run on a fixed cadence of every `3` sim days
- allow only `1-for-1` player trades
- execute accepted trades directly without a pending negotiation flow
- log accepted trades into normal season activity

It should not:

- create CPU offers to the user
- touch multiplayer trade workflows
- touch real-data leagues
- add `2-for-1` or `2-for-2` packages
- simulate long trade negotiations or counters
- turn the market into a high-frequency streaming engine

## Product Behavior
The target feel is:

- rare
- readable
- believable

CPU teams should trade only when both sides can solve a real roster problem with one swap.

This is not a fantasy-stock-market system.
This is a conservative roster-correction layer.

## Existing Seam
The right home for `v1` is still [rosterbate-season.html](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/rosterbate-season.html).

That file already contains the simulation-universe CPU maintenance stack:

- lineup rebuilding
- IL management
- starter-fill waivers
- dead-spot cleanup waivers
- roster-need-aware add/drop scoring

This trade layer should sit beside those helpers rather than create a brand-new subsystem.

## Architecture
The CPU trade market should use a direct scheduled execution path, not the existing pending `tradeOffers` inbox flow.

Why:

- `tradeOffers` are built for user-facing reply workflows
- CPU-to-CPU sim trades do not need pending inbox state
- direct execution plus logging is simpler, safer, and easier to inspect in `v1`

So the architecture becomes:

1. schedule/cadence gate
2. CPU roster-need analysis
3. tradable surplus identification
4. target matching against another CPU team
5. fairness + coverage validation
6. direct roster swap
7. activity logging

## Trade Cadence
The market should check only every `3` sim days.

That cadence is the accepted `v1` balance because:

- daily checks would feel too noisy
- weekly checks would feel too inert
- every `3` days gives the market a rhythm without making it feel frantic

The cadence should be deterministic and tied to simulation-day progression, not wall-clock time.

## Trade Shape
`v1` should allow only:

- `1-for-1` player trades

That keeps the first market:

- easier to validate
- easier to explain
- less likely to produce silly package abuse

It also keeps the fairness model much smaller and more trustworthy.

## Team Need Model
This pass should reuse the same broad roster-need vocabulary already established for CPU waiver logic.

Each CPU team should derive a simple need profile from its current roster:

### Position coverage
- `G`
- `F`
- `C`

### Role-shape need
- scoring
- playmaking
- rebounding
- defense

This should remain intentionally light.
Do not introduce deep archetype taxonomies in `v1`.

## Protected Core
Each CPU team should derive a protected group of players who are not valid `v1` trade chips.

Protected players should include:

- obvious top stars
- thin-position anchors
- clearly high-value multi-use players
- players whose departure would break the team's safety floor

This is the main guardrail against fake-feeling CPU trades.

If the system cannot identify a safe outgoing player, that team should simply not trade.

## Tradable Surplus
Each CPU team should identify tradable surplus from positions or roles where it has extra depth.

Preferred trade chips:

- non-core players
- bench or fringe-core players
- strong players from an area of real surplus

Avoid:

- top-end stars
- the only credible player at a thin position
- players whose versatility is doing too much roster-stability work

## Target Selection
A CPU trade target should only be considered when:

- the receiving team has a real need the player can address
- the sending team has enough surplus to give that player up
- the other team has a return player who addresses a different real need

This means the system should look for opposite-need matches, not just raw fantasy-point differences.

The intended logic is:

- Team A trades from surplus into Team B's need
- Team B trades from surplus into Team A's need

If both sides do not improve structurally, no trade should happen.

## Fairness Model
`V1` fairness should be conservative and narrow.

A trade should only execute if:

- both sides are in a reasonable value band
- neither side loses protected core value
- both sides preserve safe position coverage after the swap
- both sides improve at least one actual weakness or surplus imbalance

The fairness check should prefer rejecting borderline deals.

This pass should bias heavily toward:

- fewer trades
- better trades

not:

- more market activity

## Execution Rules
Per market check:

- maximum `1` accepted CPU-to-CPU trade total
- maximum `1` trade involving any given team
- no immediate re-trading loops inside the same check

Per trade:

- direct swap between `G.rosters[fromTeam]` and `G.rosters[toTeam]`
- rebuild affected CPU lineups after execution
- preserve roster legality and season continuity

This keeps the market legible and prevents chain-reaction churn.

## Visibility
Even though this is CPU-only, it should not be invisible.

Accepted trades should be logged into the normal season activity stream with a trade-specific activity entry so they can appear in:

- reveal activity context
- archive chatter
- future `Universe Details` history surfaces

This pass should not route CPU-to-CPU trades into the user's pending `Trade Desk` inbox.

The user is not being asked to answer these deals, so they should read as league events, not personal tasks.

## File-Level Direction
Likely implementation files:

- modify [rosterbate-season.html](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/rosterbate-season.html)
  - add scheduled simulation-universe CPU trade-market helpers
  - add need/surplus/protection/fairness scoring helpers
  - wire the cadence into the existing sim-universe maintenance flow

- add or modify a focused regression in `tools/`
  - likely a new CPU trade-market test file or an extension of the existing CPU sim maintenance suite

This pass should not require:

- new persistence schema
- new page-level UI
- multiplayer trade contract changes

## Verification

### 1. Focused trade-market regression
Add a dedicated test that proves:

- no CPU trade runs outside simulation universes
- no CPU trade runs off cadence
- opposite-need CPU teams can complete one conservative trade
- protected core players are not traded
- unfair or coverage-breaking trades are rejected
- only one accepted trade fires per market check

### 2. Wiring and safety regression
Verify:

- accepted trades preserve legal roster structure
- affected teams rebuild starters after the swap
- activity logging records the trade cleanly

### 3. Manual sim sanity
Run a short simulation universe and confirm:

- trades are rare
- trades are understandable
- trades read like roster correction, not random churn
- the league feels more alive without turning noisy

## Success Criteria
This pass is successful if:

- simulation universes now occasionally show believable CPU-to-CPU roster correction
- trades are rare and readable
- the market does not feel hyperactive
- no user-facing trade inbox behavior is polluted
- the trade layer clearly improves league realism without destabilizing the sim lane

## Out of Scope
This design intentionally excludes:

- CPU-to-user trade offers
- multiplayer trade workflow changes
- complex package trades
- counteroffers / expiration systems
- long-term asset strategy
- pick trading in season mode
- a full market simulation engine
