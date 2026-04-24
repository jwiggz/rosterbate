# Simulation Setup Auto-Draft Skip Design

**Date:** 2026-04-23
**Branch:** `shared-season-shell-simulation-backend`
**Status:** Drafted for review

## Goal

Add a setup-page option that lets a user skip the mixed-era simulation draft room entirely and go straight into the shared simulation season shell with a fully auto-generated league.

This is for the NBA mixed-era single-player simulation flow only.

## Product Intent

The current simulation setup path always hands off into the draft room. That is useful when the user wants to manually draft, but it is too slow for users who want to get directly into season management and day-by-day simulation.

This feature adds a second setup-page launch path:

- `Enter Draft`
- `Sim Draft and Start Season`

The new path should:

- keep source season selection
- keep manual franchise selection
- skip the draft room UI completely
- generate the entire league automatically
- land in the shared season shell already used by simulation universes

## User Experience

The simulation setup page keeps the current structure:

- source season selection
- franchise selection
- draft slot selection
- status area

The page gains a second primary action:

- `Enter Draft`
- `Sim Draft and Start Season`

Behavior rules:

- `Franchise` always matters in both flows.
- `Draft Slot` remains visible, but is clearly labeled as manual-draft-only.
- `Enter Draft` preserves the current behavior and opens `rosterbate-draft.html?simulation=nba_mixed_era`.
- `Sim Draft and Start Season` never opens the draft room.

While the auto-draft path is running:

- both buttons are disabled
- setup inputs are locked
- the status area shows progress text

Suggested status sequence:

- `Building mixed-era player pool...`
- `Simulating league draft...`
- `Opening season manager...`

If anything fails, the user stays on setup and sees a useful error message.

## Auto-Draft Rules

The auto-draft path must produce the same completed simulation universe shape as a finished manual simulation draft.

It must not introduce a second save format or special-case season boot path.

The generation flow is:

1. load the selected historical packs
2. build the mixed-era draft context
3. build the simulation universe bootstrap
4. auto-draft all teams from the curated simulation draft pool
5. write the completed simulation state
6. redirect into the shared season shell

Draft rules:

- all `30` NBA teams draft automatically
- the user's selected franchise becomes the controlled franchise in the saved universe
- user draft slot is ignored in this mode
- each team fills to the shell roster size
- undrafted players become the free-agent pool

For v1, auto-draft logic should stay simple and deterministic enough to be reliable:

- use a standard snake draft order across all teams
- use the same general best-available / roster-fit style already used by CPU drafting
- avoid introducing a separate personality or strategy simulation layer

The result should feel like a real finished draft, not a shortcut that bypasses core league construction.

## Data And Handoff

The auto-draft path should end by writing the same `nba_mixed_era_single_player_v1` completed-draft payload that the manual simulation draft currently writes at draft completion.

The saved state must preserve:

- selected source pack ids
- source season labels
- controlled franchise
- full `rostersByTeam`
- leftover free agents
- mixed-era metadata
- simulation mode identity

After save, the user should be redirected into:

- `rosterbate-season.html?sport=nba&simulation=nba_mixed_era`

This keeps the season destination identical to the manual simulation draft completion path.

Historical universe slot persistence can continue to happen later during season boot/persistence as it does now.

## Implementation Shape

This should be a contained enhancement, not a broad draft refactor.

Recommended code shape:

- add a second setup-page button and small setup-page status/locking logic
- add a shared helper that can build a completed simulation universe from setup selections without entering the interactive draft room
- reuse existing simulation bootstrap and completed-draft storage helpers
- reuse or extract existing CPU pick logic only as much as needed to auto-fill all teams

The feature should primarily touch:

- `rosterbate-simulation-setup.html`
- `simulation-mode-runtime.js`
- related simulation setup/runtime tests

It should avoid changing the shared season shell unless strictly necessary.

## Failure Handling

If the auto-draft path fails:

- remain on setup
- show a clear status message
- avoid partial redirect
- avoid leaving corrupted completed-draft state in storage

If pool validation fails because there are not enough players:

- use the same style of guidance as the manual setup path
- tell the user to add more source seasons

## Out Of Scope

This feature does not:

- remove the manual simulation draft room
- make auto-draft honor user draft slot
- add advanced CPU drafting personalities
- change season-shell management behavior
- change multiplayer draft behavior

## Verification Plan

Verification should cover three layers.

### Setup Page

- second CTA is present
- auto path disables controls while running
- status text updates during the flow
- manual path still works unchanged

### Auto-Draft Output

- completed simulation payload is written
- selected franchise is still the controlled team
- all teams receive full rosters
- free-agent pool remains populated
- redirect target is the shared season shell

### Regression

- manual simulation draft still reaches the draft room
- existing shared-shell simulation boot still works
- archive/details behavior continues to work with auto-drafted universes

## Recommendation

Implement this as a setup-page fast path that writes a normal completed simulation universe and reuses the current shared season shell.

That gives users a much faster way to start a mixed-era season without creating a second long-term mode architecture.
