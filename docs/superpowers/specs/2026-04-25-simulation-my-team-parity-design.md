# Simulation My Team Parity Design

Date: 2026-04-25

## Goal

Make simulation-league `My Team` match the single-player `My Team` experience for both NBA and NFL. The simulation page should use the same overall layout, card structure, operations strip, table structure, and side panel patterns as single-player leagues, while still respecting simulation-backed data and sport-specific lineup rules.

The target is parity in feel and structure, not a second simulation-only roster page that merely looks similar.

## Problem

Simulation `My Team` currently uses a lighter shared-shell roster screen that diverges from the single-player roster experience. That divergence creates three issues:

1. The page feels like a different product depending on league mode.
2. NFL simulation work lands on a page that does not reflect the richer single-player roster operations flow.
3. UI drift is already happening across roster surfaces, making future improvements more expensive.

## Decision

Use one shared `My Team` page structure for single-player and simulation modes.

`rosterbate-season.html` should stop treating simulation roster rendering as a separate page experience. Instead, both modes should feed a common roster-page renderer through a normalized view model. Single-player can continue to source data from its existing season globals, while simulation should provide the same concepts through `simulation-season-adapter.js`.

## Approaches Considered

### 1. Single-player renderer reuse

Use the same roster-page renderer and section layout for single-player and simulation, with different backing data sources.

Why this is recommended:

- It gives the closest parity to the user-visible single-player page.
- It prevents future UI drift.
- It keeps polish and bug fixes on one page surface instead of two.

### 2. Shared-shell visual clone

Rebuild the simulation roster page to look like single-player while keeping it separate internally.

Why it was rejected:

- It duplicates layout and behavior.
- It almost guarantees drift over time.
- It makes every future roster-page change a double update.

### 3. Hybrid section reuse

Reuse some single-player sections but preserve a simulation-specific page composition.

Why it was rejected:

- It reduces duplication somewhat, but still leaves two page experiences.
- It is more complex than a clean shared renderer without delivering true parity.

## Architecture

### Shared renderer boundary

`rosterbate-season.html` should expose one roster-page rendering path for both:

- single-player leagues
- simulation leagues

That shared renderer should own:

- page header and top context
- matchup summary cards
- action deck cards
- roster operations strip
- visible tabs
- roster table and section layout
- side panel presentation for team info, settings, and powerups

The shared renderer should not know league-mode-specific business rules.

### Mode-specific data boundary

Single-player and simulation should each provide a normalized roster-page view model.

Single-player mode can continue deriving that model from existing page state and helpers.

Simulation mode should provide the same contract through `simulation-season-adapter.js`, with NFL-specific lineup logic and recommendation logic staying in the simulation adapter/runtime layer instead of the page renderer.

### Sport-specific boundary

Sport-specific slot rules belong below the renderer:

- NBA: existing simulation lineup shape
- NFL: `QB`, `RB`, `RB`, `WR`, `WR`, `TE`, `FLEX`, `DST`, `K`

The renderer should only consume normalized slot rows and action metadata. It should not branch on football lineup semantics beyond display decisions that are already encoded in the view model.

## View Model Contract

The shared roster renderer should consume a normalized roster-page view model with the following categories.

### Header and top context

- page title
- cycle label
- page note copy
- matchup chip state
- home link state

### Team summary and side rail

- team name
- avatar/media
- record and summary text
- team settings entry state
- watch list summary
- waiver order summary
- powerup/supporting side content

### Matchup summary area

- last matchup card
- current matchup card
- optional schedule shortcut

### Action deck / status cards

- reveal state
- lineup readiness
- add / IL pressure
- trade pressure
- lineup status
- roster space
- next move / action guidance

Simulation should provide the same card structure as single-player, even when the copy is simulation-specific.

### Roster operations strip

- starter count summary
- add/drop pressure summary
- IL summary
- day or week selector state
- action buttons
- active pane state

Simulation should render the same strip shape as single-player. If a supported action routes through simulation adapters instead of legacy handlers, that should be invisible to the user.

### Table and tabs

- visible tabs
- selected tab
- starter rows
- bench rows
- IL rows
- optional schedule rows
- row-level action metadata

For NFL, the same table composition should be preserved, but rows should use football slots and football-appropriate data columns.

### Pending action state

- move mode
- pending add
- pending drop
- disabled reasons
- guidance copy for incomplete actions

If a simulation action is not fully supported yet, the section should remain present with a clear informational or disabled state rather than disappearing from the page.

## Simulation Adapter Changes

`simulation-season-adapter.js` should expand `getRosterViewModel()` from a lightweight roster payload into a single-player-shaped roster-page payload.

That adapter output should include:

- normalized starter slots
- populated starter row models
- bench row models
- IL row models when relevant
- summary card content
- roster operations metadata
- visible tabs and tab content
- lineup validation and recommendation context
- action availability and disabled reasons

The adapter should also continue to normalize legacy NFL slot storage so persisted football seasons still render correctly on the shared page.

## Interaction Model

The main rule is interaction parity first.

If a user is on `My Team`, the page should behave like single-player regardless of whether the backend is single-player or simulation.

### Shared controls

The following should appear in the same locations and follow the same page flow:

- matchup shortcut
- add player
- manage IL
- drop player
- team settings
- watch list summary
- waiver order summary
- lineup row actions

### Action dispatch

Actions should route by mode behind the scenes:

- single-player continues through existing season handlers
- simulation routes through adapter-backed actions and runtime helpers

The user should not need to learn a different page just because the league is simulation-backed.

### Unsupported actions

If a section is present but not fully supported in simulation yet, it should:

- remain in the normal single-player location
- show a clear disabled or informational state
- avoid breaking overall page composition

This keeps parity while allowing staged backend support.

## Scope

This milestone covers only `My Team` parity for simulation leagues in:

- NBA simulation
- NFL simulation

This milestone does not redesign:

- hub
- standings
- schedule
- playoffs
- broader shell navigation

It also does not expand NFL free agency depth or rework overall simulation economy.

## Risks

### Renderer coupling risk

The single-player roster page already contains a lot of implicit assumptions about legacy season globals. Pulling simulation into the same renderer can create fragile mode checks if the normalization boundary is weak.

Mitigation:

- keep a clear normalized view model boundary
- avoid scattering simulation conditionals across the markup
- prefer mode-specific data shaping before render time

### Partial feature parity risk

Some single-player controls may not yet have full simulation backend support.

Mitigation:

- preserve control placement
- provide disabled or informative states where needed
- do not silently remove single-player sections from simulation

### Regression risk

Because the single-player roster page is widely used, parity work could regress existing single-player behavior.

Mitigation:

- keep single-player rendering path intact behind the same normalized renderer
- add regression coverage for both single-player and simulation render shape

## Testing

### Visual and structural checks

Verify that simulation `My Team` now matches the single-player page structure for both NBA and NFL:

- same overall layout
- same top card sections
- same roster operations strip
- same tabs and table zones
- same side rail patterns

### Data correctness checks

Verify:

- NBA simulation renders correct lineup and bench state
- NFL simulation renders correct football slots and legal lineup state
- watch list and waiver order summaries render in the expected locations
- disabled states are clear when actions are not available

### Regression checks

Verify:

- single-player `My Team` still behaves as before
- simulation boot still works under quota-pressure fallback
- legacy NFL simulation lineups still normalize into the shared roster page correctly

### Suggested verification targets

- `rosterbate-season.html`
- `simulation-season-adapter.js`
- any simulation runtime helpers touched to support row actions or view-model shaping
- local `8080` manual verification for NBA and NFL simulation boots

## Implementation Direction

The implementation should proceed by:

1. identifying the existing single-player roster renderer sections that must become shared
2. defining the normalized roster-page view model contract
3. expanding simulation adapter output to satisfy that contract
4. routing simulation `My Team` through the shared roster renderer for NBA and NFL
5. preserving single-player behavior and adding targeted regressions

## Out of Scope

- redesigning non-roster simulation screens
- new NFL free-agent pool behavior
- new simulation roster-management rules beyond parity support
- broader hub or shell redesign
