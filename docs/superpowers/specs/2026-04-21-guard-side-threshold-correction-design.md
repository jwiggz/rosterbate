# Guard-Side Threshold Correction Design

## Goal

Correct the stronger live-boot CPU personality retune so it keeps the gains against `bigs_bias` overproduction and preserves a real `steady_floor` lane, while reducing the new `guards_bias` overcorrection.

The product problem to solve is:
- the stronger pass succeeded in breaking the old `bigs_bias` pileup
- and created a real `steady_floor` category
- but it overcorrected into `guards_bias` dominance on the live `1995-96` boot

## Scope

This pass only changes assignment thresholds.

It should affect:
- how `buildCpuSimPersonalitiesByTeam()` decides `guards_bias`
- live runtime spread in the `1995-96` historical simulation boot

It should not affect:
- the flattened `bigLean` formula from the stronger pass
- the new `steady_floor` lane from the stronger pass
- `guardLean` scoring formula
- `star_loyalist`
- lineup behavior
- season boot / restore wiring
- persistence shape

## Current live blocker

After the stronger pass, the real headless `1995-96` boot produced:
- `steady_floor`: `6`
- `bigs_bias`: `7`
- `guards_bias`: `13`
- `balanced`: `1`
- `star_loyalist`: `2`

That means:
- the original frontcourt overclassification problem is largely solved
- but now too many borderline teams are resolving to `guards_bias`

## Design rules

- keep assignment deterministic
- keep the heuristic global and generic
- do not add new personality types
- do not change lineup behavior in this pass
- preserve the stronger pass’s working pieces
- make the smallest readable correction first

## Recommended approach

Split the current shared lean-gap threshold into:
- a `bigs_bias` threshold
- a stricter `guards_bias` threshold

This keeps the model easy to explain:
- frontcourt-heavy teams still have one threshold
- guard-heavy teams now need a bigger lead to earn `guards_bias`

## Exact tuning direction

### 1. Keep the stronger pass’s working pieces

Do not change:
- the current flatter `bigLean` formula
- the current `steady_floor` thresholds
- `guardLean`
- `star_loyalist`

Desired result:
- preserve the progress already made

### 2. Split the bias thresholds

Replace the single shared lean-gap threshold with two named constants:
- one for `bigs_bias`
- one for `guards_bias`

Recommended direction:
- keep the current stronger-pass threshold for `bigs_bias`
- raise the `guards_bias` threshold above it

Desired result:
- truly guard-heavy teams still get `guards_bias`
- borderline teams stop over-falling into `guards_bias`
- more borderline teams instead land in `steady_floor` or `balanced`

### 3. Make this a threshold correction, not a formula rewrite

Do not trim `guardLean` scoring yet.

Why:
- the stronger pass already changed enough of the classifier shape
- threshold asymmetry is the smallest clean correction
- if that is insufficient, formula changes can come later

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

Keep the existing stronger-pass helper guardrail proving:
- obvious star-heavy roster resolves to `star_loyalist`
- obvious frontcourt-heavy roster resolves to `bigs_bias`
- obvious guard-heavy roster resolves to `guards_bias`
- mixed reliable roster resolves to `steady_floor`
- neutral mixed roster resolves to `balanced`
- deterministic assignment remains stable

### Live runtime verification

After helper tests pass:
- rerun the focused CPU personality helper test
- do one real headless `1995-96` season boot check

Success means the live distribution is healthier than the stronger pass:
- `steady_floor` stays above `0`
- `bigs_bias` stays well below the old `22`
- `guards_bias` drops below `13`
- `balanced` remains present
- `star_loyalist` stays selective

## Success criteria

This correction is successful if:
- the stronger pass’s frontcourt fix is preserved
- `steady_floor` remains a real category
- `guards_bias` is no longer the dominant label
- deterministic assignment is preserved
- lineup behavior, wiring, and restore behavior do not regress
