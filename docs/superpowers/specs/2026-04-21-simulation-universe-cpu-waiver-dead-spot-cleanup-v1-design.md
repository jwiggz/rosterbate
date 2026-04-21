# Simulation-Universe CPU Waiver Dead-Spot Cleanup V1 Design

## Goal
Make simulation-universe CPU teams manage waivers more like believable fantasy managers by keeping starter-legality fixes as the top priority and adding one conservative dead-bench cleanup pass after legality is restored.

## Why This Pass
The CPU stack is now materially stronger in three areas:

- mixed-era ranking is accepted enough to stop being the main blocker
- CPU sim lineups keep a stable core and rebuild legal starters
- CPU personalities create visible lineup variety
- simulation-universe IL and activation behavior is now good enough to keep

The next place simulation universes can still feel fake is roster churn. CPU teams currently know how to fill missing starter slots from waivers, but that seam is still mostly legality-first and does not clean up obvious dead bench spots in a believable, conservative way.

This pass addresses that gap without turning CPU teams into aggressive streamers.

## Scope
This pass applies only to CPU-managed simulation universes.

It should:

- preserve starter-legality-first waiver behavior
- improve waiver candidate scoring for starter fills
- add one conservative dead-spot cleanup pass for obvious bench dead weight
- keep roster continuity stable unless there is a clearly better waiver move

It should not:

- affect human teams
- affect non-simulation universes
- introduce proactive streaming
- churn healthy bench players for marginal upgrades
- add trade logic
- add long-horizon stash logic
- make personality the main driver of waiver moves

## Existing Seam
The current CPU roster-maintenance path in [rosterbate-season.html](C:\Users\jabro\Desktop\Fantasy%20Project\rosterbate\rosterbate-season.html) already has a good top-level seam:

1. CPU roster maintenance enters through `maintainCpuTeamRoster(teamIdx, options)`
2. simulation-universe IL / activation maintenance runs first
3. lineup normalization runs
4. `fillCpuTeamStarterNeedsFromWaivers(teamIdx, options)` repairs missing starter slots

The waiver seam already supports:

- slot-aware add selection through `getBestCpuWaiverCandidateForSlot(slot, day)`
- roster-aware drop selection through `getCpuWaiverDropCandidate(teamIdx, day, targetSlot)`
- actual claim execution through `claimWaiverPlayerForTeam(...)`

This pass should extend that existing shape rather than replacing it.

## Proposed Architecture
Keep everything inside the current season-page CPU maintenance seam and add one new conservative cleanup helper.

Recommended structure inside [rosterbate-season.html](C:\Users\jabro\Desktop\Fantasy%20Project\rosterbate\rosterbate-season.html):

- keep `maintainCpuTeamRoster(...)` as the top-level entry
- keep `fillCpuTeamStarterNeedsFromWaivers(...)` as the starter-legality helper
- add `cleanupCpuDeadRosterSpotsFromWaivers(...)` for conservative dead-bench cleanup
- add small nearby scoring helpers so starter-fill and cleanup logic stay readable

The intended flow becomes:

1. simulation-universe CPU team enters maintenance
2. IL / activation maintenance runs
3. lineup normalization runs
4. starter-needs waiver fill runs
5. dead-spot cleanup runs only after starter legality is restored
6. lineup normalization runs again if a cleanup move was made

This keeps each CPU maintenance layer readable:

- IL / activation decides who is available
- starter-fill waiver logic restores legality
- cleanup logic removes obvious dead bench weight

## Policy

### 1. Starter-Need Fills Stay First
Starter legality remains the first waiver priority.

CPU teams should continue filling missing starter slots before considering any quality-improvement move. This preserves the current legality-first philosophy and avoids introducing optimization behavior before the roster can even field a valid lineup.

### 2. Cleanup Happens Only After Legality Is Restored
CPU teams should only consider cleanup if:

- starter slots are already filled
- the team is CPU-managed
- the universe is a historical simulation universe

If lineup legality is still broken, cleanup does not run.

### 3. Cleanup Is Conservative
This pass should only replace obvious dead bench spots.

It is not a general-purpose best-available optimizer.

The CPU should make a cleanup move only when:

- the bench player is clearly non-contributing or structurally bad
- the waiver replacement is clearly more useful

Marginal upgrades should not trigger a claim.

## Dead-Spot Definition
The dead-spot definition should stay intentionally strict.

Valid v1 dead-spot cases:

- bench player is unavailable (`OUT`, `IR`, `IL`, suspended, or equivalent unavailable state) and is not already handled through IL
- bench player has no current game signal and very low current value
- bench player is a weak duplicate on an overfilled bench shape while a clearly better waiver option exists

What should not count as a dead spot yet:

- merely mediocre healthy bench players
- `GTD` or otherwise short-term uncertain players
- normal positional redundancy on a decent bench
- speculative upside stashes

This keeps the CPU from turning into a daily churn machine.

## Scoring Model
This pass should split waiver scoring into two separate paths instead of overloading one rule.

### Starter-Fill Scoring
Starter-fill scoring should continue to prioritize immediate lineup usability:

- can fill the missing slot
- has a game today
- is healthy and available
- has useful current value
- exact-position fit is still a bonus

This path should remain close to the current behavior, just clearer and slightly smarter.

### Dead-Spot Cleanup Scoring
Cleanup scoring should compare:

- the weakest eligible dead-spot bench candidate on the roster
- the best broadly useful waiver replacement

Cleanup add scoring should value:

- healthy and available status
- game today
- current value
- broad slot usefulness

Cleanup should be gated by a real upgrade threshold so that only clear improvements trigger a claim.

In short:

- starter-fill asks: "Can you help today in the missing slot?"
- cleanup asks: "Are you clearly more useful than this dead bench spot?"

## Personality Interaction
CPU personalities should not drive this pass.

If personality is used at all, it should only be a tiny tie-breaker and not a primary decision axis. The goal of v1 is believable roster management, not another full personality system expansion.

## File-Level Plan
Expected implementation files:

- modify [rosterbate-season.html](C:\Users\jabro\Desktop\Fantasy%20Project\rosterbate\rosterbate-season.html)
  - add cleanup helper(s)
  - refine starter-fill scoring helpers if needed
  - wire cleanup into `maintainCpuTeamRoster(...)`

- create [tools/test-cpu-sim-waiver-maintenance.js](C:\Users\jabro\Desktop\Fantasy%20Project\rosterbate\tools\test-cpu-sim-waiver-maintenance.js)
  - focused regression for simulation-universe CPU waiver / cleanup behavior

- possibly update [tools/test-cpu-sim-lineup-wiring.js](C:\Users\jabro\Desktop\Fantasy%20Project\rosterbate\tools\test-cpu-sim-lineup-wiring.js)
  - only if a thin scope/wiring guard is truly needed
  - do not duplicate the dedicated runtime regression

## Verification

### 1. Focused Waiver-Maintenance Regression
Add a dedicated test that proves:

- missing starter slots still trigger waiver fills
- dead bench unavailable players can be replaced by clearly better waiver options
- `GTD` bench players are not treated as dead spots
- healthy mediocre bench players are not churned for tiny upgrades
- no cleanup move happens when the upgrade is not strong enough

### 2. Scope Regression
Prove the smarter cleanup behavior stays simulation-universe-only:

- simulation-universe CPU teams use the cleanup path
- non-simulation CPU teams do not use it
- human teams remain unaffected

### 3. Manual Sim Sanity
Do a short simulation-universe inspection and confirm:

- obvious dead bench spots disappear over time
- CPU rosters do not churn daily
- starter legality still remains intact

## Success Criteria
This pass is successful if:

- CPU teams still restore legal lineups when needed
- CPU teams stop carrying obvious dead bench spots longer than they should
- roster turnover remains conservative
- the behavior is confined to simulation universes
- the feature improves realism without creating streaming-style churn

## Out of Scope
This design deliberately does not solve:

- proactive streaming
- personality-driven waiver strategy
- drop-and-add activation chains
- trade logic
- long-term prospect or upside stash behavior
- full roster optimization when the team is already healthy and legal

Those can follow later if real playtesting still shows a trust gap after this conservative pass.
