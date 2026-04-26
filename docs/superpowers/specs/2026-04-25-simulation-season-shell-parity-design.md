# Simulation Season Shell Parity Design

Date: 2026-04-25

## Goal

Make simulation leagues feel much closer to single-player leagues across the main season shell, not just on `My Team`. The target screens are:

- Hub
- My Team
- Matchup
- Waivers
- Trades
- Standings

This parity pass should improve both presentation and functionality. If a single-player-style control appears on a simulation screen, it should work in simulation wherever the backend can realistically support it now.

## Problem

Simulation leagues still feel like a separate product inside the season shell. Even after recent `My Team` parity work, there is still a large difference between a single-player league and a simulation league in:

- page composition
- side rails and powerups
- top-level framing and identity
- roster-management affordances
- action depth on matchup, waiver, trade, and standings screens

That difference creates a jarring user experience. Simulation screens can look stripped down, and some single-player affordances are still absent, decorative, or only partially wired.

## Decision

Treat simulation as another season mode using the same shell renderers and interaction patterns as single-player, screen by screen.

`rosterbate-season.html` should own shared screen composition for the major season pages. `simulation-season-adapter.js` should provide single-player-shaped view models and action hooks for simulation mode so the shared shell can render and behave consistently without hardcoding simulation-specific layout branches across the file.

## Approaches Considered

### 1. Full parity shell

Bring the main simulation screens onto the same single-player-style composition and wire missing high-value interactions so the controls actually work.

Why this is recommended:

- It matches the product goal most closely.
- It avoids repeating the “looks similar but behaves differently” problem.
- It reduces long-term shell drift.

### 2. Visual parity first

Make simulation screens look like single-player screens first, and defer missing functionality.

Why it was rejected:

- It solves the screenshot problem more than the product problem.
- Decorative controls would still feel broken.
- The UI would continue to teach users the wrong expectations.

### 3. Feature parity first

Prioritize mechanics like powerups and deeper roster actions before full shell parity.

Why it was rejected:

- Users would still move across obviously different page surfaces.
- The shell would remain uneven even if more buttons technically worked.

## Architecture

### Shared shell boundary

`rosterbate-season.html` should provide the main screen composition for:

- Hub
- My Team
- Matchup
- Waivers
- Trades
- Standings

That shared shell should own:

- page framing
- hero cards and summary cards
- side rails and powerup panels
- major action strips
- tables, cards, and detail sections
- navigation affordances and top metadata

The shell should not own simulation-specific business logic beyond deciding which mode/view model/action provider to use.

### Simulation boundary

`simulation-season-adapter.js` should be the main simulation-facing boundary.

It should provide:

- single-player-shaped view models for each target page
- action hooks for user interactions on those pages
- sport-specific data shaping
- simulation-state mutations through runtime/engine helpers

Simulation-specific rules such as weekly NFL cadence, lineup legality, CPU state, waiver/trade mutation rules, and football slot handling should remain below the shared renderer layer.

### Sport-specific boundary

NBA and NFL should share shell composition, but not forced data semantics.

Examples:

- NBA can stay daily where simulation uses day-based flow
- NFL can stay weekly where simulation uses week-based flow
- football lineup slots and row labels stay football-specific
- standings grouping and matchup detail remain sport-aware

The shared shell should consume normalized page data, not infer sport rules from raw state whenever possible.

## Screen Parity

### Hub

Simulation hub should feel like single-player league home:

- stronger team identity framing
- powerup rail visible in the normal side location
- recent activity / feed treatment
- consistent summary-card composition
- page actions that feel like part of a live league, not a temporary dashboard

Simulation-specific content such as cycle labels, generated activity, and current sim state can remain simulation-specific, but the composition should match single-player.

### My Team

This screen should complete the parity direction already started:

- single-player-style hero card
- same side-rail presence and affordances
- same action deck / roster operations structure
- same powerup presence
- same tabbed table feel

Simulation-specific row data and lineup rules should remain, but the page should not feel like a separate roster tool.

### Matchup

Simulation matchup should inherit the same detail-oriented page composition as single-player:

- stronger head-to-head framing
- more complete scoreboard/detail layout
- clearer navigation into recent and upcoming context
- powerup presence when relevant

The matchup view should feel complete, not like a reduced inspection panel.

### Waivers

Simulation waivers should use the same broad single-player structure:

- stronger player-list presentation
- clear add/drop flow
- visible roster-pressure context
- side-rail parity
- watch-list and waiver-order framing where supported

If watch-list support remains partial, it should still appear intentionally rather than disappearing from the page.

### Trades

Simulation trades should look and feel like a real trade desk:

- shared layout and framing
- clearer partner selection and roster comparison
- response/proposal affordances that feel complete
- visible state for pending offers and trade pressure

The backend can still remain simulation-specific, but the UX should stop feeling like a simplified placeholder.

### Standings

Simulation standings should share the same full-screen presence and drill-in feel:

- stronger rankings presentation
- team detail drill-ins
- more complete side context
- better parity with single-player browsing and team inspection

NFL division/conference structure and NBA conference ordering should remain sport-correct.

## Functional Parity

### Powerups

Powerups should not be decorative in simulation if they appear in the shell.

This pass should make powerup interaction work in simulation where the backend can support it now. That includes:

- visible inventory/state
- activation affordances
- simulation-state mutation
- correct downstream effect on sim outcomes or page state

If a specific powerup cannot be supported yet, it should be explicitly deferred rather than presented as if it works.

### Deeper roster actions

Simulation should support deeper single-player-style roster interactions where feasible:

- suggested-lineup application
- add/drop resolution
- waiver-driven roster replacement
- trade proposal/response flow
- matchup/schedule navigation from roster context

Unsupported actions should remain visible only if their disabled state is clearly intentional and temporary.

### Cross-screen actions

Simulation pages should support meaningful navigation and stateful actions between screens, not just local page refreshes. For example:

- hub actions route into real pages
- matchup links reflect real schedule context
- waiver/trade actions mutate simulation state
- standings drill-ins feel connected to roster/matchup context

## View Model Direction

Each target simulation screen should expose a normalized view model shaped closely enough to single-player expectations that the shared shell can render without a custom page implementation.

At minimum, that means page-level view models should expose:

- identity/header metadata
- summary cards
- main content sections
- side-rail and powerup metadata
- page actions
- disabled-state copy where needed
- sport-aware display details

Action providers should be explicit where interaction matters, rather than inferred ad hoc from raw state.

## Scope

This project includes parity work for these simulation screens:

- Hub
- My Team
- Matchup
- Waivers
- Trades
- Standings

It includes making missing single-player-style features functional in simulation where feasible, especially:

- powerup interaction
- deeper roster actions
- richer cross-screen actions

## Out Of Scope

This project does not automatically include:

- playoff-shell redesign beyond incidental parity needs
- fundamental simulation rule changes outside what is necessary for usable parity
- turning simulation into a perfect architectural clone of single-player league storage/state
- broad non-shell redesign work unrelated to the six target screens

## Risks

### Shared-renderer coupling

Single-player shell code still has implicit assumptions about legacy globals and fantasy-specific state. Extending parity across six screens could create fragile mode checks if normalization boundaries are weak.

Mitigation:

- keep simulation data shaping in the adapter layer
- prefer shared renderers with normalized inputs over in-render business logic
- avoid scattering simulation conditionals throughout the shell

### Decorative parity risk

The biggest product risk is showing single-player-looking controls that still are not truly usable.

Mitigation:

- if a control appears, it should work unless explicitly justified otherwise
- unsupported features should be intentionally disabled, not ambiguous

### Cross-sport drift

NBA assumptions can easily leak into NFL and vice versa when parity work touches broad shell code.

Mitigation:

- preserve sport-aware labels and row structure
- keep sport-specific logic below the renderer
- add targeted NBA and NFL regression coverage

### Boot-state regression

Simulation already has quota-pressure and slot-backed boot complexity. Broad shell parity work could accidentally break landing users into the right season state.

Mitigation:

- preserve boot regression coverage
- keep shared-shell work separate from boot-state mutation logic where possible

## Testing

### Structural parity checks

Verify that simulation screens render the same major shell sections as single-player across:

- Hub
- My Team
- Matchup
- Waivers
- Trades
- Standings

### Functional parity checks

Verify:

- powerups mutate simulation state correctly
- roster actions preserve legal lineup transitions
- NFL suggested-lineup flow preserves keyed football slot order
- waiver actions resolve through simulation state
- trade actions resolve through simulation state
- standings and matchup drill-ins remain sport-correct

### Regression checks

Keep regression coverage for:

- simulation boot and slot-backed routing
- quota-pressure fallback paths
- NBA simulation page rendering
- NFL simulation page rendering
- existing weekly sim behavior for NFL

### Manual verification targets

Primary local verification targets:

- `http://localhost:8080/rosterbate-season.html?sport=nba&simulation=nba_mixed_era`
- `http://localhost:8080/rosterbate-season.html?sport=nfl&simulation=nfl_mixed_era`

Verify that those pages now feel much closer to a real single-player league shell, not just a simulation dashboard with borrowed pieces.

## Implementation Direction

The likely implementation order should be:

1. expand screen-level simulation view models and action hooks
2. move target screens onto shared single-player-style composition
3. wire missing interactions like powerups and deeper roster actions
4. harden cross-screen navigation and drill-ins
5. run targeted regression and localhost verification for NBA and NFL
