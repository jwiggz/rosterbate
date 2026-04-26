# Unified Simulation Engine Single-Player Replacement Design

Date: 2026-04-25

## Goal

Unify all leagues onto the newer simulation engine so every league in RosterBate uses generated, ratings-driven outcomes and simulated stats instead of legacy historical stat playback.

The target product state is:

- single-player leagues keep the polished shell and premium league feel users already like
- simulation leagues and single-player leagues share the same underlying gameplay engine
- NBA outcomes and stat lines are driven by 2K-style ratings context
- NFL outcomes and stat lines are driven by Madden-style ratings context
- legacy historical-stat gameplay is removed rather than maintained in parallel

## Problem

RosterBate currently behaves like two different games:

- older single-player leagues rely on legacy season logic and historical stat assumptions
- newer simulation leagues use engine-backed, ratings-driven outcomes

That split causes multiple product and engineering problems:

- single-player and simulation drift in behavior and feel
- realism tuning only benefits part of the product
- the codebase has to support two outcome models
- shell parity work keeps fighting backend differences
- historical stat replay feels less alive than generated simulation

The user goal is no longer to preserve that split. The user wants the product to look like the current best single-player league shell while playing like a full simulation league.

## Decision

Make the newer simulation engine the only season gameplay engine in the product.

`simulation-mode-runtime.js`, `simulation-season-adapter.js`, and `simulation-league-engine.js` should become the canonical source of truth for:

- generated scores
- player stat outputs
- standings movement
- lineup effects
- waiver and trade consequences
- powerup effects
- progression through the season

Single-player should become a presentation and league-mode layer on top of that engine instead of a separate stat-replay gameplay system.

## Approaches Considered

### 1. Unify everything onto the simulation engine

Make the newer simulation engine the only outcome model and re-home single-player on top of it.

Why this is recommended:

- It creates one gameplay model across the product.
- Realism tuning benefits every league type.
- Shell parity becomes much simpler because the backend is shared.
- It removes long-term drift and duplicated maintenance.

### 2. Keep separate backends and swap single-player outputs to simulated stats

Preserve the single-player backend but make it emit simulated-looking stats.

Why it was rejected:

- It still keeps two rule systems.
- It preserves the same debugging and maintenance tax.
- Backend drift would continue even if the UI looked unified.

### 3. Add a compatibility bridge for legacy single-player seasons

Support old leagues and try to map them into the new model without resets.

Why it was rejected:

- The user explicitly does not care about preserving those leagues.
- Compatibility work would slow the replacement and keep legacy assumptions alive.
- A hard reset or recreation path is cleaner and lower risk.

## Architecture

### Canonical gameplay engine

The simulation engine stack should become the only gameplay backend for seasons:

- `simulation-mode-runtime.js`
- `simulation-season-adapter.js`
- `simulation-league-engine.js`

Those modules should own all engine-native season state and all outcome generation logic.

No season flow should continue resolving games by replaying old historical stat outputs once this replacement is complete.

### Presentation separation

`rosterbate-season.html` should stop branching into fundamentally different gameplay paths for single-player versus simulation.

Instead, it should render different league presentations over one engine-backed state model:

- single-player keeps the polished hub, reveal framing, and premium presentation
- simulation keeps broader management framing where desired
- both read from the same generated season state and generated stat outputs

The renderer can still vary by league flavor, but the actual stats, scores, and season consequences must come from the same engine.

### Sport-specific realism layer

The unified engine should still branch by sport where needed:

- NBA uses 2K-style ratings context and basketball-specific sim tuning
- NFL uses Madden-style ratings context and football-specific sim tuning

That sport logic belongs in the engine/runtime layer, not in separate single-player versus simulation gameplay branches.

## Data Model

### Canonical season state

All leagues should center around one simulation-native season state shape with concepts like:

- league shell
- source seasons / ratings context
- draft state
- rosters by team
- free agents / waiver state
- lineup state
- standings
- generated game logs
- activity log
- powerups
- postseason state

Single-player-only UX concepts like reveal copy, hub framing, and page emphasis should sit on top of that engine state instead of defining a separate gameplay storage model.

### Existing leagues

Because the user is comfortable deleting or restarting old leagues, legacy single-player saves do not need full fidelity migration.

The preferred approach is:

- treat old single-player seasons as disposable
- recreate or reset them into fresh simulation-native seasons
- avoid field-by-field translation unless a minimal import is clearly cheaper than recreation

This keeps the new data model clean and avoids carrying legacy stat-replay assumptions forward.

## Product Behavior

### Single-player feel, simulation gameplay

The target user experience is:

- single-player still looks like the current polished league shell
- but every score, stat line, matchup result, and roster consequence is generated by simulation

That means actions like `Reveal Day`, `Sim Week`, or equivalent progression buttons should reveal simulation-generated outcomes rather than loading pre-authored historical stat results.

### Simulated stats only

All visible stats should come from the unified simulation engine:

- matchup scores
- player stat lines
- standings movement
- recent results
- team and player performance summaries
- league activity summaries tied to generated outcomes

No league type should continue surfacing old historical-stat gameplay once the replacement is complete.

## Legacy Removal

This project should be treated as a replacement, not a long-lived hybrid.

The intended end state is:

- new leagues default to the unified simulation engine
- old single-player leagues are reset, recreated, or discarded
- legacy historical-stat resolution paths are removed
- shell and page code stop assuming two separate season gameplay systems

Short-term staging is fine during development, but the product should not settle into a permanent dual-backend architecture.

## Rollout

The safest internal rollout is staged, even though the final product state is a full replacement:

1. Make the simulation engine the canonical outcome/stats path for all new league creation.
2. Re-home single-player boot and season flow onto simulation-native state.
3. Keep the polished single-player shell while replacing legacy result generation underneath.
4. Reset or recreate existing single-player leagues onto the unified model.
5. Remove retired legacy stat-replay paths after validation.

## Risks

The biggest risks are:

- hidden code paths in single-player still depending on legacy stat structures
- shell screens that look unified but still dispatch into old season logic
- migration/reset entry points that leave some old leagues in inconsistent states
- sport-specific tuning regressions when all traffic now flows through the unified engine

The mitigation is to aggressively centralize outcome generation and treat legacy seasons as disposable instead of preserving half-migrated compatibility paths.

## Testing

Testing should prove both backend unification and front-end continuity.

Backend checks:

- all league types now resolve outcomes through simulation-native state
- no remaining legacy stat-replay result path is active
- NBA and NFL both generate ratings-driven stats and outcomes through the unified engine
- waivers, trades, lineups, and powerups still mutate engine-backed state correctly

Frontend checks:

- single-player keeps its polished shell and reveal framing
- simulation and single-player screens both read coherent engine-generated stats
- old single-player entry points now land in the unified engine flow
- boot flows remain stable under storage-pressure and local resume conditions

## Non-Goals

This project is not about preserving old single-player leagues exactly as they were.

It is also not about keeping a long-term legacy backend alive for safety. The point is to replace it.
