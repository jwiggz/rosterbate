Date: 2026-04-20

# Mixed-Era Normalization Retune Design

## Goal
Retune the flagship mixed-era board normalization so `1996-2016-top300` becomes more trustworthy without changing authored content, underlying historical stats, or the broader mixed-era product flow.

The immediate target is the first official audit result for the board:
- `top10`: `Pass`
- `top25`: `Tune`
- `top50`: `Tune`
- `top100`: `Fail`
- `fullPool`: `Pass`

The retune should reduce `1995-96` overrepresentation in the upper-middle board while preserving the exciting crossover feel that already exists at the top.

## Why This Exists
The first official audit notebook for `1996-2016-top300` established that the mixed-era system is working, but the flagship board is not yet trustworthy enough to treat as stable.

What is already true:
- full-pool authored composition is correct at `150 + 150`
- the board is still exciting and draftable
- the top of the room is not broken

What is not yet good enough:
- `1995-96` owns too much of `top25`, `top50`, and especially `top100`
- the `11-25` tier is visibly captured by `1995-96`
- at least one low-games-played player placement looks too generous for a flagship board

This means the next move should be a normalization retune, not an authored pool change.

## Scope

### In scope
- retuning mixed-era rating behavior for the flagship `1996-2016-top300` board
- softening the current `1995-96` era advantage in mixed-era ranking
- adding one explicit safeguard for players under `25 GP`
- expanding regression coverage so the retune is test-backed
- rerunning the real audit after implementation

### Out of scope
- rewriting underlying historical stats
- changing authored mixed-era config files
- manual player-by-player overrides
- changing mixed-era audit thresholds
- changing player-facing UI
- retuning simulation-day gameplay outside the shared mixed-era rating path
- adding a second mixed-era board

## Recommended Approach
Use a hybrid retune:

1. soften the `nba_1996_full_season_v1` era-context advantage in the mixed-era normalization layer
2. add a confidence penalty for players under `25 GP`

This is better than an era-only adjustment because the audit found both a structural era-tilt problem and a small-sample trust problem.

It is also better than manual content exceptions because it remains reusable for future mixed-era boards.

## Product Behavior
The mixed-era board should continue to be driven by `mixedEraOverall`, but that score should become slightly more conservative in two places:

### 1. `1995-96` era softening
The current `PACK_ERA_CONTEXT` in `simulation-league-engine.js` gives `1995-96` enough lift that the older era takes too much of the top half of the mixed board.

This retune should:
- move the `1995-96` context slightly closer to neutral
- preserve respect for older-era stars
- stop `1995-96` from quietly occupying too much of `11-25`, `26-50`, and `51-100`

The goal is not to reverse the bias and create a modern-era takeover.
The goal is a healthier, more believable mixed board.

### 2. Under-`25 GP` safeguard
Players under `25 GP` should receive an additional mixed-era confidence penalty.

This penalty should:
- apply only to mixed-era ranking behavior
- leave raw season stats intact
- be strong enough to push obvious small-sample outliers out of premium tiers
- avoid turning every short-season player into a non-factor

This should make obvious cases like `15 GP` players less likely to appear in premium draft zones.

## Technical Design

### Main rating path
The retune should stay inside the existing mixed-era rating pipeline in:
- `simulation-league-engine.js`

Specifically:
- keep `mixed-era-runtime.js` sorting on `mixedEraOverall`
- keep the board assembly pipeline unchanged
- change only the rating inputs that determine `mixedEraOverall`

### Era-context changes
Adjust the `PACK_ERA_CONTEXT` values for:
- `nba_1996_full_season_v1`

The exact constants should be chosen conservatively during implementation, but the intended direction is:
- reduce the degree to which `1995-96` is boosted relative to neutral
- keep the board competitive at the top
- avoid introducing a new opposite-era skew

The `nba_2016_full_season_v1` context should remain untouched unless testing proves the retune cannot work otherwise.

### Low-games-played confidence rule
Add a small helper inside the mixed-era rating path that applies only when:
- `gp < 25`

The penalty should:
- reduce mixed-era ranking confidence rather than mutate the historical stat line
- scale with lower games played
- be bounded so it does not completely erase short-season players

This rule should feed into `mixedEraRatings.overall` so the draft board order naturally responds.

## Files

### `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-league-engine.js`
Purpose:
- retune `PACK_ERA_CONTEXT`
- add the under-`25 GP` mixed-era confidence safeguard
- keep the change inside the existing mixed-era rating path

### `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-mixed-era-runtime.js`
Purpose:
- extend runtime coverage if needed for the new under-`25 GP` mixed-era ranking behavior

### `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-mixed-era-audit-view-model.js`
Purpose:
- continue validating audit thresholds and warning behavior after the retune

### additional `tools/` regression file if needed
Purpose:
- compare the real flagship board before and after the retune, or at minimum assert healthier audit outcomes for the actual `1996-2016-top300` board

### `C:\Users\jabro\Documents\Vault\wee\wiki\synthesis\rosterbate-mixed-era-normalization-audit-1996-2016-top300-2026-04-20.md`
Purpose:
- record the post-retune audit verdict honestly after implementation

## Verification Strategy

### 1. Runtime regression coverage
Before changing code, add or update tests that fail first and capture the target behavior:
- sub-`25 GP` players should not receive premium-tier mixed-era placement as easily
- the flagship board audit should improve in the upper slices

### 2. Full mixed-era regression sweep
After implementation, rerun the existing mixed-era suite, including:
- loader
- runtime
- universe summary
- audit view model
- audit page static
- top300 primary wiring

### 3. Real audit rerun
Rebuild the real `1996-2016-top300` board and rerun the audit.

Success should look like:
- `top10` stays `Pass`
- `top100` is no longer `Fail`
- `top25` and `top50` improve or at least do not worsen
- full-pool composition remains `Pass`
- the board still feels exciting and credible

### 4. Manual review
Use the live audit page to inspect:
- top rows
- `11-25`
- `26-50`
- any notable sub-`25 GP` outliers

The retune should not be considered successful purely because a test passes if the board still feels obviously wrong.

## Success Criteria
- the flagship board is healthier in `top25`, `top50`, and especially `top100`
- the board preserves its current crossover excitement at the top
- sub-`25 GP` outliers become less likely to appear in premium tiers
- the retune is implemented as reusable mixed-era rating logic, not content-side exceptions
- the post-retune audit result is better than the current official notebook outcome

## Failure Conditions
This retune should be considered unsuccessful if:
- `top10` gets materially worse
- `top100` still fails with no meaningful improvement
- the board simply flips into a `2015-16` overcorrection
- the only improvement comes from manual or one-off player exceptions
- low-games handling becomes so aggressive that short-season players are no longer credibly usable
