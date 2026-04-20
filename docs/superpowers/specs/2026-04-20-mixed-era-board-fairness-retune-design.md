---
created: 2026-04-20
title: Mixed-Era Board Fairness Retune Design
---

# Mixed-Era Board Fairness Retune Design

## Goal

Run one more bounded normalization pass on the flagship `1996-2016-top300` mixed-era board so the draft board becomes fairer without changing actual game simulation behavior.

This pass is specifically about cross-era draft-board trust:

- preserve the strong top-of-board crossover feel
- keep the sub-`25 GP` safeguard intact
- reduce `1995-96` overrepresentation in `11-25`, `26-50`, and `51-100`
- leave `simulateLeagueDay` gameplay behavior unchanged

## Current Problem

The current flagship board is improved but still not fully stable.

From the official audit:

- `top10`: `Pass`
- `top25`: `Tune`
- `top50`: `Tune`
- `top100`: `Tune`
- `fullPool`: `Pass`

The remaining issue is not a general all-board bias and not primarily a low-games issue. The remaining skew is concentrated in older-era interior / defense-heavy profiles from `1995-96`, especially through the middle-premium tiers.

## Scope

This pass only changes mixed-era draft-board ranking behavior.

In scope:

- `buildMixedEraRatings()` in [simulation-league-engine.js](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/simulation-league-engine.js:237)
- pack-era context metadata used by mixed-era board normalization
- regression coverage for board-fairness behavior
- rerunning the `1996-2016-top300` audit notebook after the retune

Out of scope:

- `simulateLeagueDay()` game-simulation logic
- rewriting real season stats
- changing authored mixed-era configs
- manual player overrides
- widening the system to a full possession-based rewrite

## Design Principles

1. Keep actual sim gameplay untouched.
2. Treat pace as explanatory context, not the main corrective lever for this pass.
3. Use a small, continuous trim instead of categorical archetype cliffs.
4. Apply the new correction only at final mixed-era board ranking time.
5. Preserve flagship-board excitement over mechanical symmetry.

## Rating Model Changes

### 1. Keep The Existing Low-Games Safeguard

The current sub-`25 GP` confidence rule remains unchanged.

This pass should not alter:

- the `25 GP` cutoff
- the confidence curve below `25 GP`
- current regression expectations around low-games handling

### 2. Add Explicit Pace Metadata To Era Context

Extend `PACK_ERA_CONTEXT` to carry explicit pace metadata for each source season.

Purpose:

- make the model more honest and inspectable
- support future audit/debug visibility
- document that slower-era production cannot be interpreted the same way as faster-era production

For this pass, pace metadata is not the main board correction. It is model context and future-proofing, not a full per-possession normalization rewrite.

### 3. Keep A Small Pack-Level 1995-96 Softening

Retain a modest pack-level context softening for `nba_1996_full_season_v1`.

Intent:

- reduce broad older-era pressure on the middle tiers
- avoid a large era-wide nerf
- keep `top10` stable

This pack-level softening should stay small and should not be the primary tool used to solve the remaining board skew.

### 4. Add A Board-Only Interior Portability Compression

Add one new continuous board-only value inside `buildMixedEraRatings()`:

- `interiorPortabilityScore`

This score exists only to slightly compress the mixed-era board placement of older-era interior / defense-heavy profiles that are still over-owning the flagship board.

This score:

- applies only to `nba_1996_full_season_v1`
- applies only inside `buildMixedEraRatings()`
- affects only final `mixedEraOverall`
- does not alter `simProfile.ratings` used by actual game simulation

## Interior Portability Score

### Inputs

Build the score from existing baseline signals already present in the model:

- positive pressure toward interior profile:
  - `reb`
  - `blk`
  - a smaller amount of `stl`
- negative pressure:
  - `threes`
  - spacing-friendly context
- soft portability offset:
  - a small `ast` offset so more skill-diverse bigs are not compressed as hard

### Shape

The score should be continuous and bounded:

- normalize each component into a small bounded contribution
- combine them into a final score in the range `0` to `1`
- low score means no practical compression
- high score means a small board-only trim

### Application

Use the score only at final mixed-era overall calculation time:

- compute adjusted category ratings as normal
- compute `adjustedOverall` as normal
- compute `interiorPortabilityCompression = 1 - score * smallCap`
- apply the compression only to final `adjusted.overall`

Recommended behavior:

- `smallCap` should remain tight, around a `1-3%` max effect
- effect should feel like a board-order nudge, not a player rewrite

### Why Continuous Signals Instead Of Archetype Gates

Do not gate this behavior on archetypes like `rim_anchor` or `glass_cleaner`.

Reason:

- archetype gates create cliffs
- the current skew is subtle, not categorical
- continuous signals allow gentle trimming without over-hitting hybrid stars

Archetypes may still be used later for audit explanation, but they should not trigger the correction.

## Expected Product Effect

This pass should:

- preserve `top10` as a `Pass`
- keep low-games outliers out of premium tiers
- slightly open the board in `11-25`
- slightly open the board in `26-50`
- slightly open the board in `51-100`
- preserve the excitement and recognizability of the top board

This pass should not:

- make `1995-96` feel erased
- flatten elite 90s stars
- materially change full-season sim gameplay

## Testing And Verification

### Unit-Style Regression

Extend the targeted mixed-era retune regression so it proves:

- interior-heavy `1995-96` profiles receive a small board-only trim
- perimeter-friendly or more portable `1995-96` profiles remain mostly intact
- the trim does not apply to `2015-16`
- the low-games rule still behaves exactly as before

### Real Board Regression

Update the flagship board regression for `1996-2016-top300`.

Success expectations:

- `top10` remains `pass`
- `top25` does not worsen
- `top50` improves or remains on the healthier edge
- `top100` stays out of `fail`
- no sub-`25 GP` players appear in premium tiers

### Audit Rerun

After implementation, rerun the official notebook for `1996-2016-top300` and record the result honestly.

Valid outcomes:

- `Pass`
- `Tune`

If the board remains `Tune`, the notebook should say so clearly rather than overstating the effect of the retune.

## Success Criteria

The pass is successful if:

- the mixed-era board becomes modestly fairer in upper-middle draft tiers
- the flagship board does not lose its top-tier crossover appeal
- the low-games safeguard remains intact
- the actual simulation engine remains behaviorally unchanged
- the resulting logic is still simple enough to explain later

## Files Likely To Change

- [simulation-league-engine.js](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/simulation-league-engine.js:1)
- [test-mixed-era-normalization-retune.js](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/tools/test-mixed-era-normalization-retune.js:1)
- [test-mixed-era-top300-balance.js](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/tools/test-mixed-era-top300-balance.js:1)
- audit notebook in the vault after rerun
