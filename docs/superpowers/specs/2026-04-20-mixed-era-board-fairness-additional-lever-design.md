---
created: 2026-04-20
title: Mixed-Era Board Fairness Additional Lever Design
---

# Mixed-Era Board Fairness Additional Lever Design

## Goal

Unblock the flagship `1996-2016-top300` board-fairness retune by approving one additional narrow normalization lever that is strong enough to improve `top25` and `top100` composition, but still narrow enough to avoid changing actual simulation gameplay.

This is a follow-up decision to the existing board-fairness retune design. The earlier allowed levers proved insufficient to reach the tightened flagship targets inside the approved ranges.

## Why This Exists

The current approved tuning set can improve the board, but it cannot satisfy the tighter fairness thresholds by itself.

Observed blocker:

- `top25` remains stuck at `64`
- `top100` remains stuck at `60`
- `top10` still behaves well
- low-games protection still behaves well

That means the remaining issue is not broad enough to justify another era-wide squeeze, but it is real enough that the current toolset cannot finish the job.

## Approved Additional Lever

Approve exactly one more `1995-96` board-only, profile-sensitive portability lever inside `buildMixedEraRatings()`.

This lever is allowed in addition to:

- the existing low-games safeguard
- the existing interior portability trim
- the approved `1995-96` context tuning ranges

## Scope

In scope:

- one additional `1995-96` board-only multiplier on final `mixedEraOverall`
- exposing the new lever in `mixedEraContext` for audit/debug visibility
- tightening the real-board regression and using the new lever to satisfy it

Out of scope:

- `simulateLeagueDay()` changes
- authored content changes
- per-player overrides
- new levers for `2015-16`
- broad era-wide flattening

## Lever Shape

The additional lever should be:

- profile-sensitive
- board-tier-sensitive
- final-overall-only
- tiny

It should not be a second broad era-wide multiplier.

## Targeted Use

This lever exists to trim the specific `1995-96` profile cluster still crowding:

- `11-25`
- `26-50`
- `51-100`

It should be weak or absent for:

- top-tier crossover stars
- perimeter-friendly profiles
- lower-value back-half pool players

## Implementation Guardrails

The new lever must obey all of these:

1. Apply only to `nba_1996_full_season_v1`
2. Apply only inside `buildMixedEraRatings()`
3. Apply only to final `adjusted.overall`
4. Require a meaningful existing interior portability score
5. Be stronger in the broad premium-but-not-sacred range than at the absolute top
6. Stay small, around another `0.5%` to `1.5%` max effect
7. Expose its value in `mixedEraContext`

## Recommended Model

Use a small **middle-tier portability drag**.

Meaning:

- players with stronger interior portability scores can receive a second tiny trim
- the trim should be modulated by final board strength so it helps most in the upper-middle board
- the trim should weaken near the top so the crossover-star experience survives

This is preferable to:

- another era-wide multiplier
- manual exceptions
- larger interior compression

## Product Intent

This additional lever should:

- preserve `top10`
- improve `top25`
- improve `top50`
- improve `top100`
- preserve the excitement of the flagship board

It should not:

- erase `1995-96`
- materially alter the sim engine
- create visible cliffs in the ranking model

## Verification Target

With the additional lever approved, the implementation should still aim for:

- `top10` remains `Pass`
- `top25 <= 60`
- `top50 <= 58`
- `top100 <= 58`
- `fullPool` remains `Pass`
- no sub-`25 GP` player in `top25`
- no sub-`25 GP` player in `top50`
- `Michael Jordan` remains in `top10`

## Files Likely To Change

- [simulation-league-engine.js](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/simulation-league-engine.js:1)
- [test-mixed-era-top300-balance.js](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/tools/test-mixed-era-top300-balance.js:1)
- [test-mixed-era-normalization-retune.js](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/tools/test-mixed-era-normalization-retune.js:1) if extra context assertions are needed
