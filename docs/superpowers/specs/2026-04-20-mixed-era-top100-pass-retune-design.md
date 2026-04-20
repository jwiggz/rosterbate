---
created: 2026-04-20
title: Mixed-Era Top 100 Pass Retune Design
---

# Mixed-Era Top 100 Pass Retune Design

## Goal

Run one final flagship retune for `1996-2016-top300` that upgrades the mixed-era board from `Top 100 = Tune` to `Top 100 = Pass` without sacrificing the now-healthy `Top 10`, `Top 25`, and `Top 50` slices.

This pass should keep `2K` strictly audit-only and should improve the deeper premium draft band rather than rewriting the overall mixed-era model.

## Why This Exists

The latest calibration-assisted audit shows the flagship board is close, but not finished.

Current live outcomes:

- `top10`: `Pass` at `5 / 5`
- `top25`: `Pass` at `15 / 10`
- `top50`: `Pass` at `29 / 21`
- `top100`: `Tune` at `60 / 40`
- full pool: `Pass` at `150 / 150`

That means the remaining trust problem is no longer the top of the board. It is the back half of the premium draft zone, especially the `51-100` range where older-era strength still lingers slightly too long and some modern portable profiles still do not rise enough.

The `44`-player calibration layer is now strong enough to act as a guardrail, but it should still remain evidence rather than ranking input.

## Scope

This pass is intentionally narrow.

In scope:

- retune the mixed-era board-shape logic in [simulation-league-engine.js](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/simulation-league-engine.js:242)
- optimize specifically for `top100` composition improvement
- preserve the existing low-games safeguard
- rerun the flagship calibration-assisted audit after the retune
- update the flagship calibration-assisted notebook with the new verdict

Out of scope:

- direct use of `2K` values in live ranking
- simulation-day or season-engine behavior changes
- authored mixed-era config changes
- per-player overrides
- new mixed-era boards
- UI changes outside whatever existing audit output naturally reflects from the new board

## Product Behavior

This is a board-only retune.

It should affect:

- mixed-era draft ordering
- mixed-era projection ordering
- mixed-era audit composition results

It should not affect:

- underlying season stats
- `simulateLeagueDay`
- universe save structure
- authored calibration content

The board should still feel like the same flagship mixed-era experience, just more trustworthy through the full premium draft band.

## Design Principle

This pass should optimize for **composition first**, with calibration used as a guardrail.

The model goal is:

- get `top100` to `Pass`
- keep `top10`, `top25`, and `top50` healthy
- avoid making the board less explainable against the calibration layer

The model goal is not:

- make the board numerically match `2K`
- chase every large player-level disagreement
- replace one era skew with another

## Retune Strategy

Use a **two-zone extension** of the existing board-shape tuning inside `buildMixedEraRatings()`.

### 1. Extend the older-era interior compression deeper into the premium middle tier

The current `1995-96` interior compression is already helping in `top25` and `top50`, but it appears to fade too early by the time the board reaches `51-100`.

This pass should:

- keep the existing `getOlderEraInteriorScore()` helper
- keep the existing `1995-96`-only application
- preserve protection for the very top of the board
- widen the effective gate range slightly so the compression remains active deeper into the `51-100` band

The intended effect is not a stronger blanket `1995-96` nerf. It is a longer-lasting premium-middle correction for the specific older-era interior / defense cluster that still crowds the board.

### 2. Extend the modern spacing / hybrid lift deeper into the premium middle tier

The current `2015-16` spacing / hybrid lift is directionally correct, but the audit suggests it also fades too early to fully help the modern profiles that still look slightly low in `51-100`.

This pass should:

- keep the existing `getModernSpacingHybridScore()` helper
- keep the existing `2015-16`-only application
- widen the effective gate range slightly so the lift remains active deeper into the `51-100` band
- avoid making the effect much stronger near the sacred top tier

The intended effect is not to make the board modern-dominant. It is to let modern portable profiles stay competitive deeper into the premium-middle zone.

## Exact Model Surface

The intended implementation surface remains [buildMixedEraRatings()](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/simulation-league-engine.js:288).

The preferred first move is to change the **gate shape before the intensity**:

- lower the gate floors a little
- keep ceilings near the existing premium zone
- keep the current compression and lift caps roughly intact at first

Only if the gate-only retune cannot reach `Top 100 = Pass` should the implementation consider a tiny cap change after measurement.

## Guardrails

The retune must satisfy these constraints:

- `2K` remains audit-only
- no gameplay sim changes
- no authored mixed-era data edits
- no player-specific rules
- no new cliffs in low-games handling
- no worsening of the strongest disagreement clusters in an obvious way

If a candidate retune fixes `top100` only by making the board feel stranger at the player level, reject it.

## Verification Target

Judge this pass against the live flagship board first.

Primary success target:

- `top10` remains `Pass`
- `top25` remains `Pass`
- `top50` remains `Pass`
- `top100` upgrades from `Tune` to `Pass`
- full pool remains `150 / 150`

Calibration guardrails:

- the older-era premium interior over-rank cluster does not get worse
- the modern spacing / hybrid under-rank problem in `51-100` does not get worse
- the board remains at least as explainable against the `44`-player calibration sample as it is now

Reject any retune that:

- damages `top10`
- reintroduces premium-tier low-games outliers
- improves `top100` only by creating a new obvious distortion in `top25` or `top50`

## Test Strategy

The implementation should prove this in three layers:

1. update [tools/test-mixed-era-top300-balance.js](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/tools/test-mixed-era-top300-balance.js:1) so `top100` must pass, not merely stay out of fail
2. keep [tools/test-mixed-era-normalization-retune.js](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/tools/test-mixed-era-normalization-retune.js:1) focused on directional board-shape behavior, not exact player ranks
3. rerun the live audit page and update the calibration-assisted notebook in the vault

## Success Criteria

This pass is successful if:

- the flagship board clears all composition slices
- the board still feels like the same flagship mixed-era room
- the calibration layer still reads as a helpful second opinion rather than evidence of a new problem
- the post-retune notebook can honestly record the board as `Pass`, or at minimum as materially closer without hidden tradeoffs

## Files Likely To Change

- [simulation-league-engine.js](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/simulation-league-engine.js:288)
- [tools/test-mixed-era-top300-balance.js](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/tools/test-mixed-era-top300-balance.js:1)
- [tools/test-mixed-era-normalization-retune.js](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/tools/test-mixed-era-normalization-retune.js:1)
- the flagship calibration-assisted notebook in the vault after rerunning the live page

## Recommended Next Step After This Spec

Write an implementation plan for the `Top 100 first` flagship retune, then execute it with:

- one red/green loop around the tighter `top100` balance target
- one live calibration-assisted audit rerun
- one notebook update with the new verdict
