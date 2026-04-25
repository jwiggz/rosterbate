# NFL Simulation Realism Score Shape Design

Date: 2026-04-24
Status: Approved design for implementation planning

## Summary

Improve NFL simulation realism by retuning weekly outcome resolution around football-shaped score behavior while keeping the shared season shell intact.

This pass is focused on:

- more believable NFL weekly score shape
- football-specific starter influence inside weekly sim resolution
- balanced week-to-week variance with real upset pressure
- lineup recommendations that support the new football model without taking control away from the user

This pass does not create a separate NFL product flow. The shared season shell remains the product surface for both NBA and NFL simulation leagues.

## Goals

- Make NFL weekly simulation results feel more like football than a generic starter-strength translation.
- Preserve the shared season shell, weekly progression flow, and existing NFL postseason structure.
- Increase the realism of weekly NFL score distribution and upset frequency.
- Make QB, RB, WR, TE, FLEX, K, and DST matter in more believable proportions.
- Improve lineup recommendations so they better reflect football-specific weekly value.

## Non-Goals

- Building a full team identity or scheme system in this pass.
- Replacing fantasy-slot lineup management with a full football depth chart.
- Reworking the shared shell UI or navigation model.
- Adding broader CPU roster-building or waiver-priority intelligence in this milestone.
- Turning lineup recommendations into auto-management or mandatory optimization.

## Product Intent

The NFL lane should keep feeling like the football version of the same simulation product shell already used by NBA.

That means:

- same shell tabs
- same season progression structure
- same user-controlled lineup flow
- same save and reopen expectations

The football-specific change should live under the hood in weekly matchup resolution and recommendation quality, not in a forked shell experience.

## Recommended Approach

Use an outcome-layer retune inside the existing NFL engine path.

This is the preferred approach because it:

- improves realism at the point where weekly results are actually decided
- keeps the shared shell and adapter contracts stable
- avoids a larger team-identity system before the core football feel is right
- creates a clean base for later recommendation and CPU-intelligence work

## Architecture

### Shared shell boundary

The shared season shell stays intact.

The following should not materially change in this milestone:

- shared navigation
- weekly `Sim Week` control flow
- roster legality gating
- standings/playoff routing
- archive and reopen behavior

### Engine boundary

[simulation-league-engine.js](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/simulation-league-engine.js) should remain the primary home for NFL realism tuning.

The engine already:

- branches by sport
- understands NFL weekly sim flow
- honors NFL slot-based user lineups
- auto-builds valid NFL CPU lineups

This pass should add or refine NFL-specific weekly matchup helpers inside that layer rather than pushing football math into the shell or scattering one-off conditionals across unrelated files.

### Adapter and runtime boundary

[simulation-season-adapter.js](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/simulation-season-adapter.js) should continue to expose season-shell view models and recommendation-facing data, but it should not become the home of score-resolution math.

[simulation-mode-runtime.js](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/simulation-mode-runtime.js) should continue owning lineup legality, slot eligibility, and recommendation helpers. It should support the new football model for recommendation quality, but not resolve game scores.

## Weekly NFL Resolution Model

### Source lineups

Weekly NFL resolution should continue using:

- the exact assigned slot lineup for the user-controlled team
- the best legal auto-built slot lineup for CPU teams

Bench players should not silently contribute as starters.

### Football-shaped contribution model

Instead of treating NFL results as a flatter translation of general starter strength, the engine should resolve each active lineup into football-facing components such as:

- passing strength
- rushing strength
- receiving support
- special teams value
- defensive resistance

These components should be derived from existing player fields where possible so this stays a tuning pass rather than a new data-model initiative.

### Position influence priorities

NFL slot influence should be intentionally uneven.

Recommended weighting direction:

- `QB` should carry the single largest offensive share
- `RB` should matter strongly to rushing floor and clock-control style output
- `WR` should matter strongly to passing ceiling and explosive scoring potential
- `TE` should contribute as a meaningful but smaller receiving stabilizer
- `FLEX` should add partial value based on whether the assigned player is `RB`, `WR`, or `TE`
- `K` should add a small scoring-floor modifier rather than acting like a full-skill-position starter
- `DST` should influence both opponent suppression and upset volatility rather than acting like a normal offensive contributor

The purpose is not perfect real-football simulation. The purpose is to make weekly outcomes feel recognizably football-shaped and more believable within the fantasy-slot model.

## Score Shape

### Desired result profile

NFL weekly scores should feel like football:

- lower scoring than NBA simulation
- tighter central scoring bands
- meaningful but not constant upset potential
- occasional lopsided outcomes
- enough variation to avoid deterministic weekly results

### Two-stage resolution

Weekly score generation should happen in two steps.

1. Build each team's weekly expectation from football-shaped lineup components plus opponent resistance and matchup pressure.
2. Convert that expectation into a final football-style score with balanced NFL variance.

This should avoid hard-coded score templates unless absolutely needed. The goal is a believable score distribution that still clearly responds to roster strength and lineup quality.

### Balanced variance target

This milestone is explicitly a balanced-variance pass.

That means:

- favorites should usually still feel stronger
- underdogs should win often enough to feel NFL-real
- weekly swings should matter more than in a low-variance ratings-only model
- randomness should not be so high that lineup quality stops mattering

## Matchup Realism

The engine should use lineup shape to create football-specific matchup pressure.

Examples of desired behavior:

- stronger QBs with strong WR support should lift offensive ceiling
- RB-heavy builds should improve floor more than explosive upside
- weak DST should make opponents more likely to reach stronger scoring outcomes
- K should add marginal finishing value but should not swing games like a premium starter

This should produce stronger differentiation between teams without requiring a full team-style or coaching subsystem.

## Recommendation Model

### Product role

Lineup recommendations remain advisory only.

They should:

- help the user understand better football-shaped choices
- align with the new sim model
- never auto-fix the lineup
- never override user control

The legal-lineup gate remains about validity, not optimality.

### Runtime behavior

[simulation-mode-runtime.js](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/simulation-mode-runtime.js) should move from a mostly generic ranking approach toward football-aware slot recommendation logic.

Recommended direction:

- `QB` recommendation should heavily favor the strongest clear weekly passing option
- `RB` slots should lean toward players who strengthen rushing floor and stable output
- `WR` slots should lean toward players with stronger ceiling and pass-game contribution
- `TE` should be treated as its own role, not just a weaker FLEX body
- `FLEX` should compare `RB`, `WR`, and `TE` options with partial-value logic
- `K` and `DST` should remain lower-impact but sensible weekly suggestions

### Adapter behavior

[simulation-season-adapter.js](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/simulation-season-adapter.js) should expose recommendation-facing hints that help explain why a suggestion is better.

Examples:

- `Higher passing ceiling`
- `Safer RB floor`
- `Better FLEX value`
- `DST downgrade this week`

These hints are explanatory, not prescriptive.

## Shared Shell Guardrails

This milestone must preserve the current shared product shape.

Do not add:

- a separate NFL shell
- football-only shell navigation
- deeper depth-chart management
- hidden auto-substitution for the user team
- shell-level logic that depends on optimal lineup quality instead of lineup legality

The user should still recognize this as the same simulation shell, just with more believable football outcomes.

## Technical Scope

### In scope

- NFL-specific weekly score-shape retuning in the simulation engine
- football-specific component weighting for active NFL slot lineups
- balanced NFL weekly variance tuning
- football-aware lineup recommendation improvements
- adapter-level recommendation messaging support
- regression coverage for existing NBA and NFL shell flows

### Out of scope

- full team-identity system
- scheme or coaching layers
- major CPU roster-intelligence overhaul
- waiver-priority intelligence redesign
- depth-chart expansion
- shell redesign

## Likely Files

- [simulation-league-engine.js](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/simulation-league-engine.js)
- [simulation-mode-runtime.js](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/simulation-mode-runtime.js)
- [simulation-season-adapter.js](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/simulation-season-adapter.js)
- [tools/test-simulation-league-engine.js](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/tools/test-simulation-league-engine.js)
- [tools/test-simulation-mode-runtime.js](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/tools/test-simulation-mode-runtime.js)
- [tools/test-simulation-season-adapter.js](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/tools/test-simulation-season-adapter.js)
- [tools/test-nfl-shared-season-shell-weekly-sim.js](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/tools/test-nfl-shared-season-shell-weekly-sim.js)
- [tools/test-shared-season-shell-simulation.js](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/tools/test-shared-season-shell-simulation.js)

## Verification Plan

### Regression

Verify that:

- NBA simulation behavior remains stable
- NFL shared-shell navigation and weekly progression remain stable
- saved NFL leagues still reopen correctly
- lineup legality gating still works as before

### NFL realism shape

Verify that:

- NFL weekly scores land in more believable football-style ranges
- favorites still have an edge, but underdogs win at a believable rate
- QB impact is meaningfully stronger than before
- K and DST matter, but do not behave like premium offensive starters
- lineup quality still bends outcomes without making results deterministic

### Recommendation alignment

Verify that:

- suggested NFL lineups remain legal
- suggested NFL lineups generally improve football-shaped weekly strength
- slot-level recommendation hints render cleanly in the season shell
- recommendation quality improves without creating shell-level auto-management

## Risks

### Cross-sport regression

Football tuning could accidentally leak into NBA behavior if shared helpers are not split cleanly.

Mitigation:

- keep football weighting behind explicit NFL engine helpers
- keep NBA paths untouched unless a shared helper truly needs extension

### Artificial-feeling outcomes

If score shape is over-tuned, games could start looking staged or disconnected from roster quality.

Mitigation:

- prefer weighted expectation plus variance over rigid score templates
- verify that stronger lineups still win more often over time

### Recommendation overreach

If recommendation messaging becomes too forceful, the product can feel like it is second-guessing the user instead of supporting them.

Mitigation:

- keep recommendation language advisory
- keep `Sim Week` blocking tied only to legality

## Rollout Recommendation

Implement this as the next NFL simulation milestone before broader CPU football management work.

That order is important because:

- the NFL shell and weekly flow already exist
- the biggest product gap is football feel inside weekly outcomes
- better recommendation quality makes more sense once the sim model itself is football-shaped

## Planning Readiness

This design is intentionally scoped as one implementation-planning unit.

The next step after spec review should be a written implementation plan that breaks the work into:

- engine weighting and score-shape tuning
- runtime recommendation retune
- adapter hint wiring
- regression and realism verification
