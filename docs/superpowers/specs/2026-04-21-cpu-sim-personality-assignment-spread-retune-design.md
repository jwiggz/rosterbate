# CPU Sim Personality Assignment Spread Retune Design

## Goal

Retune the deterministic CPU personality assignment heuristic so historical simulation leagues produce a healthier mix of:
- `balanced`
- `star_loyalist`
- `steady_floor`
- `bigs_bias`
- `guards_bias`

The product problem to solve is:
- the first shipped `v1` personality layer works technically
- but live QA showed too many teams collapsing into `bigs_bias`
- while `balanced` and `steady_floor` are underrepresented

## Scope

This pass only changes personality assignment.

It should affect:
- how `buildCpuSimPersonalitiesByTeam()` classifies rosters
- helper-level tests that validate distribution and deterministic assignment

It should not affect:
- lineup scoring behavior
- stable-threshold behavior
- season boot / restore wiring
- persistence shape
- simulation engine output

## Current QA finding

The QA checkpoint found this live boot sample for a `1995-96` historical sim universe:
- `bigs_bias`: `20`
- `guards_bias`: `4`
- `star_loyalist`: `4`
- `balanced`: `1`

That means the current assignment heuristic is functioning, but overproducing:
- `bigs_bias`

and underproducing:
- `balanced`
- `steady_floor`

## Design rules

- keep the assignment deterministic
- keep the heuristic global and generic
- do not add explicit team overrides
- do not add new personality types
- do not tune lineup behavior in this pass
- prefer clearer gates over post-hoc rebalance hacks

## Recommended approach

Retune the gates in `buildCpuSimPersonalitiesByTeam()` so:
- `star_loyalist` is more selective
- `bigs_bias` requires a stronger frontcourt lead
- `guards_bias` uses the same stronger symmetry on the guard side
- `steady_floor` is easier for balanced all-around rosters to earn
- more teams naturally fall through to `balanced`

## Exact tuning direction

### 1. Tighten `star_loyalist`

Raise the threshold for obviously star-heavy teams.

Current behavior is too permissive for some strong but not truly top-heavy rosters.

Recommended direction:
- raise the `topStarSignal` gate
- tighten the `topOverall + topUsage` fallback gate

Desired result:
- only clearly elite top-heavy rosters become `star_loyalist`

### 2. Tighten `bigs_bias`

Require a larger `bigLean` over `guardLean` margin.

Current behavior lets too many classic rosters trip the frontcourt bias.

Desired result:
- only strongly interior/frontcourt-shaped teams get `bigs_bias`

### 3. Keep `guards_bias` symmetric

Use the same stronger lean-gap logic on the guard side.

Desired result:
- assignment stays readable and balanced
- the model does not become “hard on bigs, easy on guards”

### 4. Loosen `steady_floor`

Make mixed, all-around rosters more likely to land in `steady_floor`.

Recommended direction:
- lower the `averageShape` threshold somewhat
- widen the acceptable `bigLean` / `guardLean` difference band

Desired result:
- teams with solid across-the-board profiles no longer default into `bigs_bias` or a hash fallback as often

### 5. Let `balanced` win more often

Do not add a special rebalance pass.

Instead:
- let stronger gates for `star_loyalist`, `bigs_bias`, and `guards_bias`
- plus a looser `steady_floor`

naturally increase the number of teams that fall through to:
- `balanced`

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

Extend helper tests to prove:
- an obviously star-heavy roster still gets `star_loyalist`
- an obviously big-heavy roster still gets `bigs_bias`
- a clearly mixed all-around roster can now get `steady_floor`
- a neutral roster can now land on `balanced`
- deterministic assignment still holds for the same composition

### Runtime sanity verification

After helper tests pass:
- rerun the current focused CPU personality helper test
- do one short live spot-check similar to the QA pass

Success means the live distribution is directionally healthier:
- `bigs_bias` clearly reduced
- `balanced` clearly increased
- `steady_floor` visible
- `star_loyalist` more selective

This pass does not require a rigid exact final count target.

## Success criteria

This retune is successful if:
- the assignment spread is visibly healthier than the QA checkpoint
- `bigs_bias` is no longer the overwhelming dominant result
- `balanced` appears meaningfully more often
- `steady_floor` is present in live assignment
- `star_loyalist` remains available but rarer
- deterministic assignment is preserved
- no lineup or restore behavior regresses
