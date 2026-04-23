# Mixed-Era NBA Simulation Mode V1 Design

Date: 2026-04-22

## Goal

Add a separate single-player `Simulation Mode` that lets a user build a mixed-era NBA universe by selecting multiple historical seasons, drafting from a shared star-heavy combined player pool, and then simulating a full `2025-26 NBA` style season from opening day through the `Play-In`, playoffs, Finals, and championship trophy.

This mode should feel like a real NBA season shell with fantasy-era crossover talent, not like a reskinned fantasy weekly league.

## Product Intent

The fantasy lane and the historical pack lane are now strong enough that the next high-value product step is a more authentic NBA simulation experience.

This mode should deliver a specific fantasy:

- real modern NBA league structure
- real `2025-26` franchises, conferences, and divisions
- mixed-era superstar team building
- fast season progression
- true NBA-style standings, bracket pressure, and championship payoff

The emotional promise is:

- draft a dream roster from chosen eras
- guide that roster through a believable NBA season
- chase a real playoff run and title

## Season Anchor

The league shell is fixed to the `2025-26 NBA` season format.

For clarity, this means:

- regular season opens on `October 21, 2025`
- regular season ends on `April 12, 2026`
- `Play-In Tournament` runs `April 14-17, 2026`
- playoffs begin `April 18, 2026`
- the Finals begin `June 3, 2026`

This mode should mirror that season structure and calendar framing, but it does **not** need to reproduce the literal real-world nightly game schedule.

## Scope

### In Scope

- a separate NBA-only `Simulation Mode`
- league shell fixed to `2025-26 NBA`
- all `30` real `2025-26` NBA franchises
- real conference and division alignment
- user-selected historical source seasons
- one shared mixed-era draft pool built from those selected seasons
- star-heavy curated pool design
- league-wide redraft for all `30` teams
- user control of one franchise only
- day-by-day regular season simulation
- lineup, waiver, trade, and injury management
- NBA-style standings and seeding
- `Play-In Tournament`
- conference playoffs, `NBA Finals`, and championship trophy
- saved-universe archive/details support for this mode

### Out of Scope

- multiplayer support
- non-NBA sports
- exact real-world `2025-26` nightly schedule replication
- full franchise-management systems
- contracts, cap rules, owner mode, coaching systems, or offseason economy
- multi-year dynasty progression
- custom teams or relocation
- merging this directly into the existing fantasy season mode

## Recommended Approach

### Option 1: Separate Simulation Mode On Top Of The Current Mixed-Era Pipeline

Build a new simulation-universe lane that reuses the existing historical pack loaders, mixed-era player calibration, and simulation foundations while giving the mode its own state model and season UI surface.

Pros:

- matches the intended product exactly
- isolates this work from the fantasy season lane
- reuses proven mixed-era and simulation building blocks
- leaves room for future franchise-sim depth without polluting current flows

Cons:

- requires real new mode boundaries instead of a quick patch

### Option 2: Re-skin The Existing Fantasy Season Flow

Keep most of the current season surface and try to make it feel NBA-authentic through visual and data tweaks.

Pros:

- lower initial implementation effort

Cons:

- wrong structural foundation
- likely to leak weekly fantasy assumptions into an NBA sim mode
- harder to maintain and extend later

### Option 3: Full Franchise-Sim Foundation Now

Use this mode as the start of a deeper owner/GM simulation product.

Pros:

- strongest long-term simulation ceiling

Cons:

- too large for this pass
- slows down the core mixed-era season fantasy the user actually wants first

### Recommendation

Use `Option 1`.

## Mode Identity

This should be a separate single-player simulation product lane.

The mode has two layers:

### 1. League Shell Layer

Always fixed to the `2025-26 NBA` structure:

- `30` real teams
- East and West conferences
- real division alignment
- regular season standings
- `Play-In Tournament`
- conference playoffs
- `NBA Finals`
- champion and trophy outcome

### 2. Player Universe Layer

Customized by the user at league creation:

- select multiple historical seasons such as `1987 + 1993 + 1996 + 2016`
- merge those seasons into one shared mixed-era player universe
- redraft the league from that combined pool

The result should allow combinations like `Michael Jordan + Stephen Curry` while preserving a modern NBA league structure around them.

## League Creation Flow

The entry point should be visibly separate from the current fantasy start flow, such as `Start Simulation League`.

Recommended creation sequence:

1. choose `Simulation Mode`
2. pick source seasons
3. preview the mixed-era player pool
4. choose user franchise and draft slot
5. run the `30`-team draft
6. boot into simulation day `1`

### Source Season Selection

The user selects multiple historical NBA season packs.

Those selected seasons become the only input sources for:

- draft pool construction
- universe identity
- saved archive metadata for the run

### Curated Star-Heavy Pool

This mode should not use a full exhaustive historical census.

Instead, it should build a tighter simulation board that:

- guarantees star recognition
- preserves enough strong secondary players for believable league-wide roster construction
- leaves a smaller but usable undrafted pool for waivers/free agency
- aggressively trims low-value filler

This should optimize for fun, recognizability, and league quality over archival completeness.

### Franchise Identity

All `30` teams remain the real `2025-26` NBA franchises in their real conference and division slots.

The user controls exactly one franchise.

No custom-team layer is included in v1.

### Draft Flow

Every NBA franchise redrafts from the same shared combined player pool.

Recommended behavior:

- user manually makes their own picks
- CPU teams draft quickly between user turns
- later rounds accelerate harder once team cores are established

This keeps the setup process interactive without making the initial league build too slow.

The draft output must produce:

- one rebuilt roster for each of the `30` teams
- a leftover undrafted pool for waivers/free agency
- a saved simulation universe containing draft provenance and chosen season sources

## Regular Season Flow

After the draft, the mode should boot directly into Day `1` of the `2025-26 NBA` regular season simulation.

The default cadence is fast `day-by-day / auto-sim`.

### Core User Loop

1. review current day, standings, and team state
2. make optional management moves
3. simulate the next day or auto-sim forward
4. resolve league-wide NBA game outcomes
5. update standings, injuries, transactions, and short storylines
6. repeat through the regular season

### Game Model

This mode resolves `simulated NBA game results`, not fantasy head-to-head totals.

That means each simulated day should produce:

- team vs team scores
- wins and losses
- streaks and momentum
- conference seeding movement
- league standings pressure

The underlying roster strength comes from mixed-era drafted talent, but the user should experience the output as a living NBA season, not a fantasy schedule.

### Management Scope

V1 management should stay intentionally narrow:

- lineups / rotations
- injuries and availability reactions
- waivers / free agency
- trades

It should not include:

- contracts
- cap management
- ownership tools
- coaching trees
- long-term franchise economy systems

### Schedule Model

The mode should use a generated NBA-style season schedule that fits the `2025-26` league shell.

It should preserve:

- `30`-team league scale
- conference logic
- division alignment
- realistic regular-season length
- believable standings and seeding pressure

It should not require exact real-world nightly schedule replication.

### Always-Visible Season Context

The user should always be able to see:

- current date / day / week in the season
- team record and conference seed
- recent results
- injuries and roster availability
- waiver / trade opportunities
- upcoming postseason pressure

The surface should consistently answer:

- where am I in the NBA calendar?
- how is my team doing?
- what matters before the next sim?

## Postseason Flow

When the regular season ends, the mode should transition into the real modern NBA postseason shape.

### Play-In Tournament

Each conference should resolve seeds `7-10` through the modern structure:

- `7 vs 8` for the `7` seed
- `9 vs 10` elimination game
- loser of `7 vs 8` vs winner of `9 vs 10` for the `8` seed

### Playoff Bracket

After the play-in completes:

- seeds lock for East and West
- conference playoff brackets form
- teams advance by NBA-style series outcomes
- East and West remain separate until the `NBA Finals`

The bracket should feel visually close to a live NBA playoff board:

- clear matchup path
- current series score
- round progression
- centered Finals / championship resolution

### Finals And Trophy

When the Finals end, the universe should save a clear championship outcome:

- champion
- runner-up
- Finals result
- playoff path
- trophy / title summary

If the user wins, the mode should feel like they completed a true mixed-era NBA title run, not just another season checkpoint.

## Archive And Universe Details

Saved simulation universes should preserve enough state to tell the story later.

That means archive/details surfaces should be able to show:

- source seasons used to build the universe
- user franchise identity
- current or final standings context
- recent simulation momentum
- roster/activity context
- playoff path
- champion / trophy result

This should extend the current `Universe Details` direction rather than replacing it.

## Existing Assets To Reuse

This mode should reuse strong existing building blocks where possible:

- [`historical-pack-loader.js`](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/historical-pack-loader.js)
- [`mixed-era-runtime.js`](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/mixed-era-runtime.js)
- [`simulation-league-engine.js`](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/simulation-league-engine.js)
- [`historic-universe.html`](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/historic-universe.html)

These already provide:

- historical pack loading
- mixed-era board construction
- player-level simulation foundations
- simulation-universe archive/details surfaces

## Architecture

This should be implemented as a new simulation-universe lane rather than by stretching the current fantasy season state.

### State Model

The save shape should carry five distinct state groups:

#### 1. `leagueShell`

- fixed `2025-26 NBA` identity
- `30` teams
- conference + division alignment
- postseason rules
- trophy/champion structure

#### 2. `sourceSeasons`

- selected historical pack ids
- readable season labels
- mixed-era configuration metadata

#### 3. `draftState`

- curated player pool
- drafted rosters for all teams
- leftover waiver/free-agent pool
- user team id and draft slot

#### 4. `seasonState`

- current date/day/week
- generated schedule template
- completed results
- standings
- injuries
- trades / waivers / activity
- daily recap data

#### 5. `postseasonState`

- play-in matchups and outcomes
- playoff bracket
- series states
- Finals outcome
- champion/trophy metadata

This mode should carry a distinct top-level identity such as:

- `simulationMode: 'nba_mixed_era_single_player_v1'`

The important guardrail is that the current fantasy season save shape should not become the source of truth for this mode.

### Surface Boundaries

Recommended page/file direction:

- keep the current loaders/runtime as data inputs
- expand [`simulation-league-engine.js`](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/simulation-league-engine.js) from player/game modeling into fuller league-result generation
- add a separate simulation season surface instead of overloading [`rosterbate-season.html`](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/rosterbate-season.html)
- add a dedicated simulation creation / boot path rather than hiding this inside the normal draft start flow
- extend [`historic-universe.html`](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/historic-universe.html) so saved simulation runs can explain standings, momentum, bracket, and champion state

This keeps the simulation lane separate while still reusing mixed-era and archive infrastructure.

## Verification

### Draft Bootstrap

Verify that:

- selected source seasons produce the intended mixed-era pool
- the pool is star-heavy and curated rather than exhaustive
- all `30` teams receive rebuilt rosters
- a leftover undrafted pool remains for waivers/free agency

### Regular Season Simulation

Verify that:

- the generated season schedule completes cleanly
- standings update correctly over time
- day-by-day auto-sim can advance from opening day through the end of the regular season
- injuries, waivers, and trades do not corrupt state

### Postseason

Verify that:

- `Play-In Tournament` seeding resolves correctly
- playoff brackets form correctly by conference
- series advancement works correctly
- the Finals produce exactly one champion
- trophy/champion metadata persists correctly

### Product Surface QA

Verify that:

- this mode is clearly separate from fantasy mode
- users can always tell where they are in the season
- saved universes can explain the run in archive/details surfaces
- the postseason feels like an NBA bracket path rather than a fantasy playoff tab

## Success Criteria

This pass is successful if:

- users can create a separate single-player mixed-era NBA simulation universe
- the league always uses the `2025-26 NBA` shell
- all `30` teams redraft from selected-era combined pools
- the season runs day by day from opening day through Finals
- standings, seeding, play-in, playoffs, and champion state behave coherently
- the experience feels like a true NBA season simulation, not a fantasy reskin

## Risks And Guardrails

### Risks

- leaking weekly fantasy assumptions into the new mode
- making the mixed-era pool too deep and diluting the star fantasy
- making the pool too shallow and breaking league-wide roster quality
- overloading the current season page instead of preserving mode boundaries
- under-saving postseason state and losing archive storytelling value

### Guardrails

- NBA only
- `2025-26` shell only
- single-player only
- mixed-era draft only
- star-heavy curated pool
- no full franchise economy systems
- no exact official nightly calendar replication
- no multiplayer crossover in v1

## Implementation Notes

This is a mode-foundation pass, not a full franchise-sim pass.

The implementation should spend risk budget on:

- strong mode boundaries
- believable season structure
- clean mixed-era draft bootstrap
- clear playoff/championship payoff

It should not spend risk budget on:

- contracts/cap systems
- literal real-world schedule recreation
- generalized multi-sport abstractions
- turning the fantasy season page into a second product
