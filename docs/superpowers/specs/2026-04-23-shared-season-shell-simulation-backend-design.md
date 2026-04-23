# Shared Season Shell With Simulation Backend Design

Date: 2026-04-23

## Goal

Make [`rosterbate-season.html`](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/rosterbate-season.html) the single canonical season manager shell for both:

- regular fantasy leagues
- mixed-era NBA simulation leagues

The user experience should feel the same at the shell level, while the underlying game model changes by mode.

## Product Intent

The current simulation page proves the league state and day sim loop work, but it feels like a stripped-down dashboard rather than a real season manager.

The user wants simulation mode to feel like their normal league page:

- same full season shell
- same familiar navigation
- same ability to manage team, waivers, trades, and players
- simulation data backend instead of fantasy matchup logic

The product promise is:

- one season manager UI
- two backends
- no second-class simulation experience

## Problem Statement

Today the two season surfaces are split:

- [`rosterbate-season.html`](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/rosterbate-season.html) has the richer manager shell, including roster, waivers, trades, standings, and settings flows
- [`rosterbate-simulation-season.html`](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/rosterbate-simulation-season.html) is a lighter simulation dashboard with `Sim Day` plus read-only panels

That leaves simulation mode missing the management depth users already expect from the regular season lane.

## Recommended Approach

### Option 1: Shared Full Season Shell With Mode-Specific Backends

Use [`rosterbate-season.html`](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/rosterbate-season.html) as the actual shell for both modes, and branch behavior through mode adapters.

Pros:

- matches the requested product shape exactly
- keeps one true season manager surface
- gives simulation mode immediate parity with the regular shell
- avoids long-term UI duplication

Cons:

- requires careful separation of fantasy-only assumptions from shell behavior

### Option 2: Expand The Dedicated Simulation Page Until It Matches The Regular Shell

Keep [`rosterbate-simulation-season.html`](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/rosterbate-simulation-season.html) separate and keep adding management surfaces there.

Pros:

- isolates work from live fantasy flow
- lower short-term coupling risk

Cons:

- duplicates season-shell UI and logic
- guarantees future drift between the two experiences
- increases maintenance cost

### Option 3: Keep The Current Simulation Dashboard And Bolt On More Panels

Pros:

- fastest short-term

Cons:

- still would not feel like the normal league manager
- remains a patchwork dashboard instead of a full season surface

### Recommendation

Use `Option 1`.

## Shell Model

[`rosterbate-season.html`](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/rosterbate-season.html) should become the one canonical season shell.

The shell owns:

- page routing
- screen navigation
- layout and visual structure
- common modal / panel infrastructure
- shared action patterns and screen transitions

The backend mode owns:

- state loading
- view-model shaping
- mutation behavior
- persistence
- mode-specific availability of actions

This should preserve a single familiar experience while allowing completely different game rules underneath.

## Routing

Recommended routing shape:

- `rosterbate-season.html?...fantasy params...`
  loads the current fantasy manager path
- `rosterbate-season.html?simulation=nba_mixed_era&slot=<slot-id>`
  loads the same shell in simulation mode
- [`rosterbate-simulation-season.html`](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/rosterbate-simulation-season.html)
  becomes a redirect/shim into [`rosterbate-season.html`](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/rosterbate-season.html) so existing simulation links keep working

The shell should determine mode early in boot, before it renders mode-specific screens.

## Shared Navigation

Simulation mode should use the same general season-shell navigation shape as the regular league page:

- `Hub`
- `Roster`
- `Waivers`
- `Trades`
- `Standings`

The nav should stay familiar, but the meaning of each screen should come from simulation state instead of fantasy matchup state.

### Screen Slot Replacement

The current fantasy `Matchup` slot should not remain a fantasy matchup screen in simulation mode.

Recommended simulation replacement:

- replace `Matchup` with `Schedule / Results`

The `Commissioner` area should not expose the full fantasy rules editor for simulation mode. It should either be hidden or reduced to lightweight mode-appropriate settings.

## Screen Parity

### Hub

Simulation `Hub` should stay the home screen, but show simulation-season context instead of fantasy reveal/matchup framing.

Keep:

- league identity
- team identity
- quick links
- standings snapshot
- recent activity

Replace fantasy-specific emphasis with:

- current sim date / week
- record
- conference seed
- streak
- point differential
- recent results
- next opponent
- injuries / playoff pressure
- `Sim Day`

### Roster

Simulation `Roster` should feel close to the regular league roster screen.

It should support:

- controlled-team roster rendering
- starters / bench management
- lineup changes
- injury visibility
- lightweight team settings entry point

It should not use fantasy reveal or matchup language.

Lineup changes should persist through simulation state such as `seasonState.lineupIdsByTeam`.

### Waivers

Simulation `Waivers` should use the same season-shell place where users already expect player acquisition.

It should support:

- browse available free agents
- compare players against the current roster
- add + drop flow
- roster-fit / depth framing
- future watchlist compatibility

It should stop talking like a fantasy waiver wire and instead talk like roster management inside a sim league.

### Trades

Simulation `Trades` should become a real management surface, not just an activity feed.

V1 should support:

- choose trade partner
- choose outgoing and incoming players
- instant apply for single-player simulation mode
- trade history / recent activity context

No negotiation engine is needed in this pass.

### Standings

Simulation `Standings` should show:

- conference standings
- division context
- streak / differential / form
- playoff line / play-in line pressure
- team detail drill-in where practical
- postseason context when available

### Schedule / Results

This is the recommended replacement for `Matchup` in simulation mode.

It should show:

- recent game results
- upcoming opponent
- schedule context
- recent team form
- clear path back to `Sim Day`

## Adapter Boundaries

The shared shell should not be implemented as scattered `if(simulationMode)` checks across all season functions.

Instead, the season shell should load a mode adapter.

### Shared Shell Responsibilities

- routing
- active screen selection
- layout / navigation
- modal infrastructure
- common button/action surfaces

### Adapter Responsibilities

- load state
- save state
- shape screen view models
- define available nav items
- perform mutations
- persist changes

### Adapter Interface

At minimum, the shell should delegate through functions like:

- `getMode()`
- `loadState()`
- `saveState()`
- `getNavItems()`
- `getHubViewModel()`
- `getRosterViewModel()`
- `getWaiverViewModel()`
- `getTradeViewModel()`
- `getStandingsViewModel()`
- `getScheduleViewModel()`
- `performRosterMove(...)`
- `claimFreeAgent(...)`
- `proposeOrApplyTrade(...)`
- `simulateNextDay()`

The shell should render from normalized view models rather than directly reaching into fantasy globals or simulation globals wherever possible.

## Simulation Adapter

Add a dedicated simulation adapter module, such as:

- [`simulation-season-adapter.js`](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/simulation-season-adapter.js)

This adapter should translate simulation universe state into season-shell view models and actions.

It should wrap existing simulation structures including:

- `leagueShell`
- `draftState`
- `seasonState`
- `postseasonState`

It should integrate with the existing simulation runtime mutations already available in [`simulation-mode-runtime.js`](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/simulation-mode-runtime.js), including:

- lineup updates
- free-agent claims
- trades
- injury designation updates

## Fantasy Adapter Strategy

Do not try to fully abstract the entire fantasy season page on day one.

Recommended migration path:

1. make the shell capable of entering simulation mode
2. add a simulation adapter for the first shared screens
3. route simulation screens through adapter-backed renderers
4. keep fantasy behavior working with minimal disruption
5. progressively extract fantasy behavior into a cleaner adapter only if shared-shell work makes it necessary

This keeps the first pass controlled and avoids a full fantasy rewrite.

## V1 Scope

### In Scope

#### 1. Shared Routing Into The Regular Season Shell

- simulation route enters [`rosterbate-season.html`](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/rosterbate-season.html)
- old simulation season links redirect into the shared shell
- boot logic identifies simulation mode before screen render

#### 2. Simulation Hub In The Shared Shell

- team summary
- league identity
- standings snapshot
- recent results
- recent activity
- `Sim Day`
- quick navigation into management screens

#### 3. Simulation Roster Screen

- controlled-team roster rendering
- lineup management
- injury visibility
- lineup persistence through simulation runtime

#### 4. Simulation Waivers Screen

- browse free agents
- add + drop claim flow
- roster/activity updates after claim

#### 5. Simulation Trades Screen

- team picker
- outgoing / incoming selection
- single-player instant apply
- activity logging

#### 6. Simulation Standings Screen

- league standings
- conference context
- playoff / play-in pressure visibility
- team detail drill-in if light enough

#### 7. Simulation Schedule / Results Screen

- replaces fantasy matchup screen in simulation mode
- shows recent and upcoming game context

### Explicitly Deferred

- full commissioner settings parity
- fantasy reveal / matchup systems inside simulation mode
- trade negotiation systems
- advanced waiver economics such as full FAAB unless trivially reusable
- multi-season offseason carryover
- contracts, salary cap, ownership, coaching, or franchise economy systems
- a separate simulation-specific shell redesign

## Existing Files To Reuse

- [`rosterbate-season.html`](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/rosterbate-season.html)
- [`rosterbate-simulation-season.html`](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/rosterbate-simulation-season.html)
- [`simulation-mode-runtime.js`](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/simulation-mode-runtime.js)
- [`simulation-league-engine.js`](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/simulation-league-engine.js)
- [`historical-universe-slots.js`](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/historical-universe-slots.js)

## Verification

### Routing

Verify that:

- simulation links land in the shared season shell
- legacy simulation page URLs redirect correctly
- fantasy routes still boot correctly

### Hub / Roster / Waivers / Trades / Standings

Verify that:

- simulation screens render inside the normal season shell
- nav works screen to screen
- `Sim Day` still advances simulation state correctly
- roster changes persist
- claims persist
- trades persist
- standings refresh after mutations and sims

### Mode Separation

Verify that:

- fantasy mode keeps its current behavior
- simulation mode does not show fantasy reveal / matchup logic
- simulation nav only exposes mode-appropriate screens

### Persistence

Verify that:

- simulation mutations save back into the universe slot state
- reloading the page preserves roster, waiver, trade, and standings changes

## Success Criteria

This work is successful if:

- a simulation league opens in the normal season manager shell
- the user can manage roster, waivers, trades, standings, and day sim from there
- the experience feels like the same season manager product they already know
- simulation mode no longer feels like a stripped-down side page

## Risks And Guardrails

### Risks

- shared-shell work accidentally breaking fantasy mode
- too many ad hoc simulation conditionals inside the regular season page
- keeping the current simulation page alive too long and reintroducing duplication
- leaking fantasy wording or behavior into simulation screens

### Guardrails

- one canonical shell
- simulation-specific data via adapter boundaries
- shared navigation only where semantics still fit
- `Matchup` replaced in simulation mode
- no full commissioner-rule parity in v1

## Implementation Notes

This is a shell-convergence pass, not a new simulation-feature pass.

The implementation should spend risk budget on:

- mode-aware routing
- clean simulation adapter boundaries
- screen parity for the core management surfaces
- keeping fantasy mode stable

It should not spend risk budget on:

- redesigning the whole season UI
- adding new franchise-management systems
- building a second long-term simulation shell
