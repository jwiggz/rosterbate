# Simulation-Universe CPU IL Activation V1 Design

## Goal

Improve CPU roster-management realism in simulation universes by making IL handling smarter before lineup selection runs.

This pass should improve:
- CPU use of IL slots for unavailable players
- activation of recovered players from IL
- continuity when a healthy player is stranded on IL behind a full active roster
- day-to-day roster realism in simulation universes

This pass should not change:
- waiver strategy
- drop logic for activations
- lineup scoring rules
- CPU personality assignment
- human-managed team behavior
- non-simulation league behavior

## Scope

This is a simulation-universe-only IL and activation pass.

It should affect:
- CPU-managed teams only
- historical simulation seasons
- drafted universes that have been converted into simulation seasons

It should not affect:
- human teams
- real-season or non-simulation historical universes
- non-simulation solo leagues
- multiplayer leagues

## Product behavior

Upgrade the existing CPU roster-maintenance seam in `maintainCpuTeamRoster(...)` so CPU teams manage IL more credibly before lineups are normalized.

### 1. Move active IL-eligible players into open IL slots

If an active CPU player is IL eligible, move them into IL when there is open IL capacity.

This preserves the current core behavior:
- unavailable players are removed from the active roster
- IL space is used before lineups are rebuilt

### 2. Use conservative activation

Only activate IL players when they are fully healthy.

Rule:
- activate only when `getInjuryStatus(player, week) === null`

Implications:
- `OUT`, `IR`, `IL`, and `SUSP` players stay on IL
- `GTD` players also stay on IL for now

This keeps v1 conservative and avoids unnecessary churn.

### 3. Free-activate when active space exists

If a CPU team has open active roster space, activate the best healthy IL player first.

Selection rule:
- rank healthy IL candidates by current player value using the same simple `fp`-style ordering already used by the current maintainer

This keeps the activation rule readable and consistent with existing CPU roster-maintenance priorities.

### 4. Allow one safe IL swap path when active space is full

If the active roster is full, allow a swap only when both conditions are true:
- there is a healthy IL player ready to return
- there is an active player who is currently IL eligible

Swap rule:
- activate the best healthy IL player
- move the weakest active IL-eligible player back to IL

This fixes the main stranded-player failure case without introducing drops, waiver claims, or broader roster churn.

### 5. Stop when no legal IL move remains

No further action should occur when:
- there are no healthy IL players to activate
- there is no open active slot
- and there is no active IL-eligible player to swap back to IL

Within one maintenance pass, CPU teams may continue making legal IL moves in priority order until that stop condition is reached.

The CPU should not force a move just to empty IL.

## Design rules

- keep this behavior inside the existing CPU roster-maintenance seam
- preserve the current layering:
  - IL maintenance first
  - lineup normalization second
  - waiver-fill maintenance third
- do not add waiver or drop behavior just to activate players
- do not introduce personality-specific IL logic yet
- do not broaden this feature beyond simulation universes

## Implementation shape

### 1. Maintain inside `maintainCpuTeamRoster(...)`

Keep all roster mutation inside the existing function in `rosterbate-season.html`.

Add only small local helpers near that seam if needed for readability.

Continue using existing state:
- `G.rosters[teamIdx]`
- `getIlRoster(teamIdx)`
- `getInjuryStatus(player, week)`
- `getActiveRosterCapacity()`
- `normalizeCpuTeamLineups(teamIdx)`
- `fillCpuTeamStarterNeedsFromWaivers(...)`

### 2. Updated maintenance flow

For each CPU-managed simulation team:

1. inspect the active roster and IL roster for the current simulation day
2. move active IL-eligible players into open IL slots
3. identify fully healthy IL players
4. if active space exists, activate the best healthy IL player
5. if active space is full but an active IL-eligible player exists, perform one safe swap
6. normalize CPU lineups
7. run existing waiver-fill maintenance only if lineup gaps still exist

### 3. Scope gate

The upgraded IL behavior must only run for CPU teams in simulation universes.

Non-simulation leagues should keep current behavior unchanged.

## Verification

### Runtime regression tests

Add focused tests proving:
- active `OUT` / `IR` / `IL` / `SUSP` players get moved to IL when space exists
- healthy IL players activate into open active slots
- `GTD` IL players remain stashed under the conservative rule
- healthy IL players can swap with active IL-eligible players when active space is full
- no swap occurs when there is no legal active IL-eligible player to send back

### Scope and wiring tests

Prove the smarter behavior is limited correctly:
- CPU simulation teams use the upgraded path
- human team IL behavior is unchanged
- non-simulation universes do not accidentally inherit the new logic

### Manual simulation sanity

Run a short simulation-universe boot and inspect at least one recovery scenario:
- a healthy player should no longer stay stranded on IL behind a full active roster when a legal swap exists
- a `GTD` player should not be prematurely activated
- no activation should trigger a waiver claim or drop

## Success criteria

This pass is successful if:
- CPU simulation teams use IL slots more credibly
- fully healthy players return from IL when legal to do so
- stranded healthy IL players can return through safe swaps
- `GTD` players stay stashed under the conservative rule
- no waiver/drop side effects are introduced for activations
- no regressions are introduced for human teams or non-simulation leagues
