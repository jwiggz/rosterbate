# Mixed-Era Safe Default League Size Design

Date: 2026-04-19

## Goal
Make the current mixed-era draft lane immediately playable out of the box by changing its default lobby setup from an invalid `10-team` configuration to a safe smaller-league default that still preserves normal NBA roster depth.

## Problem
The current authored mixed-era board contains `100` players:
- top `50` from `1995-96`
- top `50` from `2015-16`

But the mixed-era draft lobby currently boots with the same default league size used by standard NBA drafts:
- `10` teams
- normal NBA roster depth

That creates an invalid default because the lobby expects `160` total draft slots while the mixed-era board only contains `100` players.

This means the feature works, but the first-run experience does not feel product-ready.

## Decision
Mixed-era should default to a smaller league while preserving normal NBA roster depth.

For the current `1996-2016-top100` authored config:
- default league size becomes `6`
- roster construction remains standard NBA draft depth
- validation behavior remains unchanged if a user manually chooses a larger setup

This produces a playable default room:
- `6 teams x 16 roster spots = 96 slots`
- `100-player pool`

## Approaches Considered

### 1. Recommended: authored default league size in mixed-era config
Add a `suggestedLeagueSize` field to the mixed-era config and have the mixed-era runtime pass that into the draft lobby.

Why this wins:
- it stays aligned with the config-driven mixed-era system
- future mixed-era boards with larger pools can choose different safe defaults without code edits
- it keeps normal NBA defaults untouched for non-mixed drafts

### 2. Hardcode `6` in mixed-era runtime
This would fix the immediate issue quickly, but it would make every future mixed-era board inherit the same default whether it fits or not.

### 3. Derive league size automatically from pool size
This is more dynamic, but it adds behavior and ambiguity the product does not need yet. The mixed-era shelf is curated content, so authored defaults are a better fit than opaque runtime math for now.

## Selected Design

### Authored content
Add `suggestedLeagueSize: 6` to the current mixed-era config:
- `historical-packs/mixed-era/1996-2016-top100.json`

This makes the safe default part of the authored crossover entry itself.

### Runtime behavior
The mixed-era runtime should read:
- `suggestedLeagueSize`

and include it in the draft context returned to `rosterbate-draft.html`.

The draft page should continue to use:
- mixed-era `suggestedLeagueSize` when present
- existing sport defaults for standard drafts

### User experience
When a user launches the current mixed-era entry:
- the lobby should open with `6` teams selected by default
- the existing roster-depth controls should stay unchanged
- the draft should be immediately startable without first reducing league size manually

### Validation
No new validation rules are needed for this patch.

If a user manually changes league size high enough to exceed the `100`-player pool:
- the current validation error should still appear
- no new warning or recommendation UI is required yet

## Scope

### In scope
- config-driven safe default league size for mixed-era
- wiring the mixed-era runtime to expose that authored default
- lobby boot using that safe default for the current `100`-player mixed-era board

### Out of scope
- pool-aware maximum team-size enforcement
- dynamic league-size calculation from player-pool size
- new mixed-era lobby warnings or helper copy
- changing standard NBA default draft settings
- expanding the mixed-era board beyond `100` players in this patch

## Files Expected To Change
- `historical-packs/mixed-era/1996-2016-top100.json`
- `mixed-era-runtime.js`
- likely one small regression test update if coverage exists around mixed-era context defaults

## Verification Plan
1. Confirm the mixed-era draft context now resolves `suggestedLeagueSize: 6`.
2. Open the mixed-era draft entry and verify the lobby boots with `6` teams selected.
3. Confirm normal roster depth is unchanged.
4. Start the draft without first reducing league size and verify the lobby no longer fails validation by default.
5. Rerun the previously verified full loop:
   - `Mixed Era Draft -> Season -> Start Sim Season -> Run Sim Day -> resume universe`

## Success Criteria
- the current mixed-era entry opens in a playable default state
- the fix is driven by authored mixed-era config, not a one-off runtime override
- standard draft modes remain unchanged
