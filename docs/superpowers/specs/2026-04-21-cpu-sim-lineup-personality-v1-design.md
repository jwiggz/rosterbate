# CPU Sim Lineup Personality V1 Design

## Goal

Add a first CPU team personality layer for simulation leagues that makes CPU teams feel more distinct in lineup decisions without changing actual simulation output.

This pass should improve:
- lineup tie-break flavor
- star retention behavior
- lineup churn variety
- league readability

This pass should not change:
- simulation engine math
- waiver behavior
- trade behavior
- injury logic
- human-controlled teams

## Scope

This is a lineup-only personality pass.

Personality should affect:
- close-call starter selection
- core preservation behavior
- daily lineup churn tendencies

Personality should not affect:
- actual game simulation output
- team pace or team variance
- player ratings
- roster legality rules
- no-game and injury handling

## Product behavior

Each CPU-managed simulation team should get one `cpuPersonality` value stored in universe state.

Supported first-pass personalities:
- `balanced`
- `star_loyalist`
- `steady_floor`
- `bigs_bias`
- `guards_bias`

### balanced

Default neutral behavior.

Effects:
- behaves close to current baseline
- minimal lineup bias
- minimal extra stickiness

### star_loyalist

Prefers keeping high-upside stars in the lineup when choices are close.

Effects:
- small bonus for high-`overall` / high-`usage` players
- stronger preservation of star core players

### steady_floor

Prefers steadier, more balanced profiles in close calls.

Effects:
- small bonus for all-around profiles
- slightly stronger general lineup stability
- less likely to churn when upgrades are marginal

### bigs_bias

Prefers frontcourt profiles in close lineup decisions.

Effects:
- small bonus for `F/C`
- small bonus for rebounding / defense

### guards_bias

Prefers guard and creator profiles in close lineup decisions.

Effects:
- small bonus for `G`
- small bonus for scoring / playmaking

## Design rules

- personality is a tie-break system, not a second ranking engine
- obvious availability and game-schedule rules always win
- position eligibility always wins
- personality should influence close calls, not force silly starts
- human-managed teams stay unchanged

## Data model

Add `cpuPersonality` to CPU-managed simulation teams in universe state.

Requirements:
- assigned once at universe creation
- deterministic and reproducible
- preserved across save/load
- existing universes missing the field fall back to `balanced`

## Assignment model

Assign personalities deterministically when a new simulation universe is created.

Requirements:
- stable by team id / team index
- league gets a readable distribution of profiles
- teams with especially strong top-end stars are somewhat more likely to get `star_loyalist`

This should create variety without randomness changing every reload.

## Implementation shape

### 1. Personality storage and assignment

Add deterministic personality assignment in the simulation-universe creation path.

Persist `cpuPersonality` on the team state object.

### 2. Lineup helper integration

Extend `cpu-sim-lineups.js` so personality affects:
- candidate scoring
- core-preservation threshold behavior

Base behavior remains:
- build daily lineup
- identify core players
- preserve or replace core starters based on threshold comparisons

Personality behavior layers on top of that.

### 3. Candidate scoring

Keep current schedule/injury/slot logic intact.

Add a small `personalityBias` term to the candidate score:

`slotScore = baseLineupScore + personalityBias`

Bias inputs should use existing signals only:
- position
- `simProfile.ratings.overall`
- `usage`
- `scoring`
- `playmaking`
- `defense`
- `rebounding`

### 4. Core preservation

Extend the stable-threshold behavior by personality:
- `star_loyalist` gets the strongest star-preservation behavior
- `steady_floor` gets steadier general retention
- `balanced` stays near current baseline
- `bigs_bias` / `guards_bias` stay mostly candidate-score oriented, with only light threshold impact if any

## Verification

### Helper tests

Add focused tests proving:
- `star_loyalist` keeps stars in close calls more often
- `steady_floor` favors steadier all-around options in close calls
- `bigs_bias` favors frontcourt options in close calls
- `guards_bias` favors guard/creator options in close calls
- no-game, injury, and slot-eligibility rules still override personality

### Wiring tests

Add or extend tests proving:
- new universes get deterministic `cpuPersonality`
- existing universes without `cpuPersonality` fall back to `balanced`
- season boot / restore keeps personality stable

### Manual sanity

Manual or browser QA should confirm:
- CPU teams show visible lineup-style variety
- star teams feel more star-loyal
- lineup churn patterns differ by personality
- no obviously bad starts appear

## Success criteria

This pass is successful if:
- CPU simulation teams feel more distinct in lineup choices
- star-heavy teams preserve stars more credibly
- some teams lean guards, some lean bigs, and some stay neutral
- no simulation-output logic changes
- no legality or restore regressions are introduced
