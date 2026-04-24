# NFL Simulation Setup And 2014 Shell Design

## Summary

Add an NFL version of the single-player `Simulation Mode` that mirrors the existing NBA simulation product flow while using a fixed `2014 NFL` shell as the first football anchor season.

The football lane should:

- support the same multi-era source-season selection flow from day one
- use `2014 NFL` as the first fully authored/playable football shell
- keep all `32` real NFL franchises in their real `AFC` / `NFC` conferences and divisions
- rebuild every team through a mixed-era draft or auto-draft
- preserve the same high-level product flow as NBA:
  - setup
  - draft or auto-draft
  - shared season-shell management
  - regular season to playoffs to champion

The immediate design focus is on the architecture and setup flow required to make football simulation possible without overcommitting to a full NFL engine rewrite in the same step.

## Product Goals

The NFL lane should feel like the football counterpart to the current NBA simulation system, not an unrelated side feature.

The core user promise is:

- pick historical NFL seasons
- create a mixed-era football player pool
- choose one real `2014 NFL` franchise to control
- either enter the draft room or auto-generate the league
- then manage that team inside the simulation season shell

The first pack/shell milestone is `2014 NFL`, but the selector architecture must be multi-era from the start so new football seasons can drop into the same lane later.

## Fixed League Shell

The football simulation shell for v1 is:

- `2014 NFL`
- `32` real franchises
- real `AFC` / `NFC`
- real divisions
- regular season structure for that era
- real 2014 playoff qualification rules
- conference championship games
- `Super Bowl`

This shell defines league structure and playoff logic. It does not lock rosters to real 2014 lineups because the mixed-era draft rebuilds every team for simulation mode.

## Mode Shape

The NFL lane should mirror the NBA simulation flow:

1. open simulation setup
2. choose historical source seasons
3. choose controlled franchise
4. optionally choose draft slot for the manual path
5. launch one of two paths:
   - `Enter Draft`
   - `Sim Draft and Start Season`
6. continue into the simulation season shell

The same page and product pattern should be reused where practical. Football should feel like the same RosterBate simulation product adapted to the NFL, not a separate experiment.

## Multi-Era Source Selection

The setup page must support the same multi-era season-selection concept used for NBA from day one, even though `2014 NFL` is the first fully playable football season.

That means:

- football historical pack metadata must support multiple source seasons
- the setup page must allow multiple football source packs to be checked
- the runtime/bootstrap path must assume football can have more than one input season

For the first milestone, the selector may only have one fully playable football season, but the architecture must not be written as a `2014-only` dead end.

## Data Inputs

The first playable football pack should be built from three data layers.

### 1. League Shell Data

Used for:

- 2014 team list
- conferences and divisions
- schedule/playoff structure
- standings context
- playoff qualification rules

Primary sources:

- Pro-Football-Reference `2014 NFL` season pages
- NFL roster/team references where needed

### 2. Historical Player Universe

Used for:

- player identity
- 2014 team affiliation
- position
- season context
- historical stat baselines
- roster membership for the authored pack

Primary sources:

- 2014 season statistical context from authoritative football history sources
- team/roster validation from NFL or equivalent roster sources

### 3. Ratings Layer

Used for:

- player quality baseline
- position-specific strength
- archetype/role shaping for the simulation layer

Primary source:

- [Madden Ratings](https://www.maddenratings.com/)

The football ratings layer should treat `Madden NFL 25 (2014)` as the preferred historical baseline for the first playable football pack.

This is the closest football equivalent to the basketball approach of using historical season context plus simulation-oriented ratings.

## Ratings Philosophy

The sim should not replay 2014 outcomes exactly. Ratings and historical stats should instead define player identity and baseline quality.

For football this matters even more than basketball because:

- positional specialization is stronger
- a single overall number is less informative without trait context
- roster construction depends heavily on role balance

So the football pack should ideally preserve:

- overall rating
- position
- role/archetype when available
- key trait clusters when available

The sim can then translate those into football-specific roster and game modeling later rather than forcing historical season totals to replay exactly.

## Football Roster Shape

Football cannot use the NBA simulation roster assumptions.

For v1, use a trimmed football simulation roster rather than a full 53-man roster. The goal is authentic enough team-building without full franchise-sim complexity.

Recommended v1 football roster shape:

- `QB`
- `RB`
- `WR`
- `WR`
- `TE`
- `FLEX`
- `OL`
- `DL`
- `LB`
- `CB`
- `S`
- `K`
- `DST`

This creates a manageable football draft while still preserving the feel of offense, defense, and special teams.

### Why Not Full 53-Man Rosters

Do not attempt full NFL depth-chart realism in the first pass.

That would immediately require:

- full offensive line starters
- multiple corner/safety packages
- pass rush rotations
- specialists and subpackages
- substantially smarter CPU draft/team-building logic

That is beyond the first football simulation milestone.

## Football Draft Rules

The draft flow should match NBA in spirit:

- all teams draft from the same mixed-era football pool
- the user can manually draft or auto-generate the league
- leftover players become the waiver/free-agent pool

But football drafting must be football-aware. CPU logic should avoid obviously broken roster construction, such as overloading on one position while missing critical role coverage.

For v1, CPU heuristics can be simpler than a full realism model, but they should account for:

- critical roster role coverage
- QB scarcity
- offense/defense balance
- distinct handling for `K` / `DST`

## Season Flow

The NFL lane should preserve the same broad product rhythm as NBA but use a football-native calendar.

### Cadence

Football should use a **week-based cadence**, not the NBA day-by-day cadence.

The season loop should be:

1. review lineup / injuries / waivers / trades
2. view current week slate
3. simulate the week
4. update standings and league storylines
5. repeat

### Postseason

The 2014 NFL postseason should use the real era's structure:

- division winners qualify
- wild cards qualify
- conference playoff brackets advance
- `AFC Championship`
- `NFC Championship`
- `Super Bowl`

There is no NBA-style play-in equivalent.

### Open Management

Consistent with the NBA simulation philosophy already chosen for RosterBate, roster moves should remain open through the playoffs even if that is more gamey than the real NFL transaction calendar.

## Technical Shape

This work should make the simulation system **sport-aware**, not just add ad hoc football code.

### Files That Need Sport-Aware Expansion

#### `simulation-mode-config.js`

Today this is NBA-only. It should evolve into a shell registry that can resolve the active simulation shell by sport/mode.

Starting registry targets:

- `nba_2025_26`
- `nfl_2014`

#### `rosterbate-simulation-setup.html`

The setup page already reads `sport` from query. It should branch by sport for:

- copy
- shell details
- roster-size assumptions
- source-season filtering
- labels and helper text

This should remain a shared setup page rather than immediately splitting into separate NBA/NFL pages.

#### `simulation-mode-runtime.js`

The bootstrap/completed-state logic must tolerate sport-specific:

- team counts
- roster sizes
- standings shapes
- schedule structures
- postseason metadata

#### `simulation-season-adapter.js`

This will eventually need football-aware season behavior:

- weekly simulation rhythm
- football standings and playoff advancement
- Super Bowl champion state

## Rollout Strategy

To keep scope sane, split the football lane into phases.

### Phase 1

- make simulation config/runtime shell-aware for NBA and NFL
- add `2014 NFL` shell metadata
- add the first playable `2014 NFL` historical pack foundation
- make the shared setup page render correctly for football
- support football mixed-era draft/bootstrap generation

Outcome:

- NFL simulation league creation exists
- the system is structurally multi-era for football
- `2014 NFL` is the first real football anchor season

### Phase 2

- football season-shell progression
- weekly simulation flow
- standings and playoff handling
- Super Bowl champion/archive state

Outcome:

- NFL matches the NBA simulation lane at the season-play level

## Initial Source Set

We already have enough data sources to begin the first phase.

Recommended source stack:

- [Madden Ratings](https://www.maddenratings.com/) for player rating baselines, specifically `Madden NFL 25 (2014)` historical values
- [Pro-Football-Reference 2014 season index](https://www.pro-football-reference.com/years/2014/index.htm) for league shell and season context
- [NFL.com 2014 rosters sitemap](https://www.nfl.com/sitemap/html/rosters/2014/) for roster validation by team

Extra sites are not required to start. Additional sources can be added later if we need better historical depth-chart fidelity.

## Guardrails

For this milestone:

- do not build a full 53-man roster engine
- do not promise multi-season NFL pack completeness immediately
- do not rewrite the full simulation system before proving the football shell path
- do keep the architecture multi-era and multi-sport from the start

## Recommendation

The best first football move is:

1. extend the simulation architecture so it can resolve an NFL shell alongside the current NBA shell
2. author the first playable `2014 NFL` pack using historical context plus Madden 25-era ratings
3. make the shared simulation setup flow render correctly for football
4. use that as the foundation for later weekly season-shell and playoff work

This keeps the football lane aligned with the NBA simulation product while staying realistic about the larger amount of sport-specific engine work still ahead.
