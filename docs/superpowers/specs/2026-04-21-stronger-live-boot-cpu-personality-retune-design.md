# Stronger Live-Boot CPU Personality Retune Design

## Goal

Retune deterministic CPU personality assignment strongly enough that the real `1995-96` historical simulation boot no longer collapses overwhelmingly into `bigs_bias`, while making `steady_floor` a real visible category.

The product problem to solve is:
- the first live-boot-driven classifier follow-up was safe
- but it only moved the real boot from `bigs_bias: 22` to `bigs_bias: 21`
- while `steady_floor` remained `0`
- and `balanced` remained stuck at `1`

## Scope

This pass only changes personality assignment.

It should affect:
- how `buildCpuSimPersonalitiesByTeam()` classifies live historical rosters
- helper-level tests that guard the intended category behavior
- live runtime spread in the `1995-96` historical simulation boot

It should not affect:
- lineup scoring behavior
- stable-threshold behavior
- season boot / restore wiring
- persistence shape
- simulation engine output

## Current live blocker

After the narrow classifier-shape pass, the real headless `1995-96` boot still produced:
- `bigs_bias`: `21`
- `guards_bias`: `5`
- `star_loyalist`: `2`
- `balanced`: `1`
- `steady_floor`: `0`

That means:
- `bigs_bias` is still overwhelmingly dominant
- `steady_floor` is still unreachable in practice
- `balanced` is still too rare to create meaningful league variety

## Design rules

- keep assignment deterministic
- keep the heuristic global and generic
- do not add team-specific or era-specific overrides
- do not add new personality types
- do not change lineup behavior in this pass
- use the real `1995-96` boot as the primary truth source

## Recommended approach

Use a stronger two-part classifier retune:

1. materially flatten `bigLean`
2. open a real `steady_floor` lane

This keeps the model simple and honest while addressing the actual live distribution problem.

## Exact tuning direction

### 1. Flatten `bigLean` more aggressively

The first formula softening was not strong enough to move the live boot.

Recommended direction:
- reduce the rebounding contribution again
- reduce the defense contribution again
- keep `overall` in the formula

Desired result:
- true frontcourt-heavy teams still become `bigs_bias`
- mixed classic rosters stop being overread as frontcourt-defined

### 2. Open a real `steady_floor` lane

For this pass, `steady_floor` should become a meaningful category for classic teams instead of remaining overly rare.

Recommended direction:
- lower `STEADY_FLOOR_AVERAGE_SHAPE_THRESHOLD`
- loosen `STEADY_FLOOR_LEAN_GAP_THRESHOLD`

Desired result:
- mixed reliable rosters can actually qualify for `steady_floor`
- `steady_floor` becomes visible in the real `1995-96` boot

### 3. Keep `balanced` present, but not solely responsible for rescue

The first stronger attempt leaned too much on `balanced` as the main fallback.

For this pass:
- `balanced` should still exist
- but `steady_floor` should absorb some of the mixed classic teams that do not feel neutral enough to be plain `balanced`

Desired result:
- both `balanced` and `steady_floor` become real categories
- `bigs_bias` no longer dominates the league

### 4. Leave everything else unchanged

Do not change:
- `guardLean`
- `star_loyalist`
- fallback hashing model
- lineup bias scoring
- stable-threshold behavior
- season wiring or persistence

## Files in scope

Expected code changes:
- `cpu-sim-personalities.js`
- `tools/test-cpu-sim-personalities.js`

Files explicitly out of scope:
- `cpu-sim-lineups.js`
- `rosterbate-season.html`
- persistence / slot storage tests
- simulation engine files

## Verification

### Helper-level verification

Update helper tests to continue proving:
- obvious star-heavy roster resolves to `star_loyalist`
- obvious frontcourt-heavy roster resolves to `bigs_bias`
- obvious guard-heavy roster resolves to `guards_bias`
- mixed reliable roster can resolve to `steady_floor`
- neutral mixed roster can still resolve to `balanced`
- deterministic assignment remains stable

### Live runtime verification

After helper tests pass:
- rerun the focused CPU personality helper test
- do one real headless `1995-96` season boot check

Success means the live distribution is materially healthier:
- `bigs_bias` clearly below `21`
- `steady_floor` clearly above `0`
- `balanced` remains present
- `guards_bias` does not spike into a new dominant skew
- `star_loyalist` stays selective

This pass still does not require exact final counts.

## Success criteria

This stronger follow-up is successful if:
- the live `1995-96` boot is no longer overwhelmingly `bigs_bias`-dominated
- `steady_floor` becomes a real category in live runtime
- `balanced` remains present and useful
- deterministic assignment is preserved
- lineup behavior, wiring, and restore behavior do not regress
