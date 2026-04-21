# Live-Boot-Driven CPU Personality Follow-Up Design

## Goal

Retune deterministic CPU personality assignment so the real `1995-96` historical simulation boot produces a healthier personality spread without changing lineup behavior.

The product problem to solve is:
- the CPU personality layer is technically wired and stable
- helper tests and synthetic fixtures improved
- but live QA still showed the real `1995-96` boot collapsing too heavily into `bigs_bias`

## Scope

This pass only changes personality assignment.

It should affect:
- how `buildCpuSimPersonalitiesByTeam()` classifies live historical rosters
- helper-level assignment tests that guard the intended spread
- live runtime spread in the `1995-96` historical simulation boot

It should not affect:
- lineup scoring behavior
- stable-threshold behavior
- season boot / restore wiring
- persistence shape
- simulation engine output

## Current live QA finding

The real headless `1995-96` historical simulation boot produced:
- `bigs_bias`: `22`
- `guards_bias`: `4`
- `star_loyalist`: `2`
- `balanced`: `1`
- `steady_floor`: `0`

That means the current assignment helper is functioning, but the live classifier still:
- overproduces `bigs_bias`
- underproduces `balanced`
- never reaches `steady_floor`

## Design rules

- keep assignment deterministic
- keep the heuristic global and generic
- do not add team-specific or era-specific overrides
- do not add new personality types
- do not change lineup behavior in this pass
- use the real `1995-96` live boot as the truth source for whether the retune is directionally better

## Recommended approach

Retune the classifier shape, not just the assignment thresholds.

Specifically:
- soften `bigLean` accumulation so classic teams are not over-read as frontcourt-defined
- leave `guardLean` mostly intact
- lightly widen the `steady_floor` lane
- let more mixed teams naturally fall through to `balanced`

This keeps the model simple and readable while addressing the actual live skew.

## Exact tuning direction

### 1. Soften `bigLean`

The current frontcourt accumulation is too steep for classic rosters.

Recommended direction:
- reduce the rebounding contribution to `bigLean`
- reduce the defense contribution to `bigLean`
- keep some `overall` contribution so truly frontcourt-heavy teams still stand out

Desired result:
- clearly frontcourt-shaped teams still become `bigs_bias`
- moderately frontcourt-leaning classic teams no longer all collapse into the same label

### 2. Leave `guardLean` mostly unchanged

The current live problem is not underproduction of guard signals.

Recommended direction:
- keep the existing guard-side formula unless a tiny symmetry adjustment is clearly needed during implementation

Desired result:
- avoid accidentally flipping the league from `bigs_bias` overuse into `guards_bias` overuse

### 3. Lightly widen `steady_floor`

`steady_floor` should remain selective, not become the new default sink.

Recommended direction:
- lower the `averageShape` threshold somewhat
- loosen the lean-gap tolerance somewhat
- keep `steady_floor` meaningfully rarer than `balanced`

Desired result:
- a few mixed, reliable classic rosters can now earn `steady_floor`
- most borderline teams still resolve to `balanced`, not `steady_floor`

### 4. Let `balanced` become the main relief valve

Do not create a special post-hoc rebalance pass.

Instead:
- soften `bigLean`
- lightly widen `steady_floor`
- leave the existing fallback path intact

Desired result:
- more teams naturally land on `balanced`
- the classifier remains easy to reason about

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

Update helper tests to prove:
- obviously frontcourt-heavy teams still get `bigs_bias`
- neutral or mixed teams can now land on `balanced`
- at least one mixed all-around team can land on `steady_floor`
- deterministic assignment still holds for the same league state

### Live runtime verification

After helper tests pass:
- rerun the focused CPU personality helper test
- do one live headless `1995-96` season boot check

Success means the live distribution is directionally healthier:
- `bigs_bias` clearly reduced from `22`
- `balanced` clearly increased from `1`
- `steady_floor` becomes nonzero
- `guards_bias` does not explode upward
- `star_loyalist` remains selective

This pass does not require a rigid exact final count target.

## Success criteria

This follow-up is successful if:
- the live `1995-96` boot no longer looks overwhelmingly `bigs_bias`-dominated
- `balanced` becomes a real category in the live league
- `steady_floor` appears at least a few times or at minimum becomes nonzero
- deterministic assignment is preserved
- lineup behavior, wiring, and restore behavior do not regress
