---
created: 2026-04-20
title: Mixed-Era Composition-First Retune Design
---

# Mixed-Era Composition-First Retune Design

## Goal

Run one focused flagship retune for `1996-2016-top300` that improves `top25` and `top50` board composition first, while keeping `2K` strictly audit-only.

This pass should make the mixed-era board healthier in the premium tiers without changing simulation gameplay, authored content, or draft/sim flow outside the mixed-era ranking layer.

## Why This Exists

The new calibration-assisted audit moved the flagship board out of the "flying blind" phase.

We now know two things at once:

- the board is still playable and exciting
- the board is still not trustworthy enough to call `Pass`

The latest live audit shows:

- `top10`: `Pass` at `6 / 4`
- `top25`: `Tune` at `16 / 9`
- `top50`: `Tune` at `30 / 20`
- `top100`: `Tune` at `60 / 40`
- full pool: `Pass` at `150 / 150`

The expanded `44`-player 2K calibration sample also shows that the remaining disagreement is not just one or two outliers. The current board still:

- favors some `1995-96` premium interior / defense profiles too strongly in `11-25` and `26-50`
- leaves a set of modern spacing / hybrid / two-way profiles too low through `26-100`

That means the next retune should optimize for **board shape first**, not direct 2K alignment.

## Scope

This pass is intentionally narrow.

In scope:

- retune the mixed-era board ordering model in [simulation-league-engine.js](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/simulation-league-engine.js:237)
- keep `2K` audit-only and use it only as evidence for whether the new board shape is healthier
- rerun the flagship calibration-assisted audit after the retune
- update the flagship calibration-assisted notebook with the new verdict

Out of scope:

- any direct blending of 2K values into live board ranking
- simulation day or season-engine changes
- authored mixed-era config changes
- new mixed-era boards
- per-player overrides
- new UI features

## Product Behavior

This is a **board-only** retune.

It should affect:

- mixed-era rank ordering
- mixed-era draft board projections
- audit-page board composition outcomes

It should not affect:

- historical source stats
- `simulateLeagueDay`
- season results outside whatever changes indirectly from different drafted rosters
- the authored calibration file itself

The board should still feel like RosterBate, not like a 2K export.

## Design Principle

This pass should use the new calibration layer as a **compass**, not a knob.

The model goal is:

- improve premium-tier composition
- keep the top of the board exciting
- make the board more explainable against the calibration summary

The model goal is not:

- make the board numerically match 2K
- remove every disagreement
- flatten all era personality out of the board

## Retune Strategy

Use a **two-sided composition-first retune** inside `buildMixedEraRatings()`.

### 1. Slightly strengthen the older-era premium interior trim

Refine the `1995-96` side of the mixed-era board model so the premium interior / defense cluster stops crowding `11-25` and `26-50`.

This trim should:

- apply only in mixed-era board ratings
- be strongest in premium-middle tiers rather than the sacred top tier
- focus on older-era profiles that are strongest in:
  - rebounding
  - defense events
  - interior-style value
  - lower spacing portability
- remain small and continuous, not a cliff

This is not a broad `1995-96` nerf. It is a targeted board-portability correction.

### 2. Add a small modern spacing / hybrid portability lift

Add a second small board-only lift for `2015-16` profiles that are still reading too low in `26-100`.

This lift should:

- apply only in mixed-era board ratings
- reward profiles with stronger perimeter scoring, spacing, hybrid-forward value, and modern two-way portability
- be modest and strongest outside the very top tier
- avoid turning the board into a modern-dominant board

This lift exists so the retune is not just subtractive. The audit evidence shows the board also needs better support for some modern player shapes.

## Exact Model Surface

The intended implementation surface is [buildMixedEraRatings()](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/simulation-league-engine.js:237).

The pass should keep:

- existing season-context normalization
- existing low-games confidence handling
- current mixed-era output shape and consumers

The pass may extend the mixed-era context/debug output so future audits can explain the new board-shape adjustments, but this should stay lightweight and internal.

## Guardrails

The retune must satisfy these constraints:

- `2K` remains audit-only
- no gameplay sim tuning
- no authored content edits
- no player-specific rules
- no new hard thresholds that create obvious cliffs
- no regression that breaks the sub-`25 GP` protection

If a candidate retune improves composition by simply creating a new distortion somewhere else, reject it.

## Verification Target

Judge this pass against the live flagship board, not just unit math.

Primary success target:

- `top10` remains `Pass`
- `top25` improves from `16 / 9`
- `top50` improves from `30 / 20`
- `top100` does not get worse than `60 / 40`
- full pool remains `150 / 150`

Secondary success target:

- the calibration-assisted audit still reads as more explainable, not less
- the strongest remaining disagreements feel more concentrated and interpretable
- modern spacing / hybrid names appear in more believable zones through `26-100`

Reject any retune that:

- harms `top10`
- reintroduces premium-tier low-games weirdness
- fixes composition only by creating a new era-skewed premium cluster

## Audit Reading Guidance

After the retune, the calibration-assisted audit should be interpreted like this:

- if `top25` and `top50` improve while the strongest calibration disagreements become easier to explain, the pass is working
- if composition improves but the board becomes obviously stranger at the player level, the pass is not good enough
- if composition barely moves, the current lever set is too weak and should be reconsidered before more blind tuning

## Success Criteria

This pass is successful if:

- the flagship board is healthier in `11-25` and `26-50`
- the board still feels exciting at the top
- `2K` remains a review aid rather than a live ranking dependency
- the post-retune audit can honestly argue that the board moved closer to `Pass`

This pass is not required to eliminate every calibration disagreement.

## Files Likely To Change

- [simulation-league-engine.js](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/simulation-league-engine.js:237)
- [tools/test-mixed-era-normalization-retune.js](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/tools/test-mixed-era-normalization-retune.js:1)
- [tools/test-mixed-era-top300-balance.js](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/tools/test-mixed-era-top300-balance.js:1)
- the flagship calibration-assisted audit notebook in the vault after rerunning the live page

## Recommended Next Step After This Spec

Write an implementation plan for the composition-first flagship retune, then execute it with:

- one red/green regression loop around the mixed-era balance tests
- one live calibration-assisted audit rerun
- one notebook update with the new verdict
