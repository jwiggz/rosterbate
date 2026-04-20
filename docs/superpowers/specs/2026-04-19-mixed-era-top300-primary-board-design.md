# Mixed-Era Top300 Primary Board Design

Date: 2026-04-19

## Goal
Replace the current `top100` mixed-era prototype as the main mixed-era experience with a healthier `top300` authored board so the standard NBA draft lobby becomes immediately playable without special mixed-era league-size behavior.

## Problem
The current primary mixed-era board is:
- top `50` players from `1995-96`
- top `50` players from `2015-16`
- total `100` players

That board is valuable as a prototype, but it is too small for the normal NBA draft room defaults:
- `10` teams
- normal NBA roster depth

This is why the earlier verification surfaced the invalid default:
- `10 teams x 16 roster spots = 160`
- current mixed-era board = `100` players

The core issue is not that the league should necessarily be smaller. The issue is that the current primary mixed-era board is too shallow for the product fantasy you want.

## Decision
The healthier fix is to grow the mixed-era board, not shrink the draft experience.

For the main `1996-2016` crossover lane:
- create a new authored mixed-era identity based on top `150` players from each season
- total pool becomes `300` players
- keep the normal NBA lobby default at `10` teams
- keep normal NBA roster depth unchanged

This restores a naturally valid standard room:
- `10 teams x 16 roster spots = 160`
- `300-player pool`

## Approaches Considered

### 1. Recommended: new authored `top300` identity
Create a new authored mixed-era config such as `1996-2016-top300`, keep `1996-2016-top100` as the original prototype, and make the new larger board the main mixed-era archive entry.

Why this wins:
- preserves honest config identity
- gives the product a healthier full-size draft room
- keeps mixed-era feeling like a normal fantasy mode rather than a constrained special case
- avoids adding mixed-era-only league-size behavior

### 2. Keep `top100` and shrink the default league
This would solve the validation problem, but it would make mixed-era feel artificially constrained and weaker as a hero mode.

### 3. Mutate `top100` into `top300`
This would be simpler in the short term, but it would silently change what an existing config id and pack identity mean. That would make saved-universe and audit history less trustworthy.

## Selected Design

### Authored content
Keep the existing prototype:
- `1996-2016-top100`

Add a new primary board:
- `1996-2016-top300`

The new config should use:
- `sourcePackIds` for `1995-96` and `2015-16`
- `topPlayersPerPack: 150`
- new `packId`
- new `seasonLabel`
- new `auditLabel`
- new archive-facing summary and tagline copy that reflects the bigger full-board experience

The old `top100` board remains a real authored historical checkpoint, not a deleted experiment.

### Archive behavior
The archive should surface the new `top300` board as the main mixed-era entry users encounter first.

The current `top100` config should remain distinct and honest, but it should no longer be the primary mixed-era launch path.

Implementation may do this either by:
- discovery index ordering
- archive filtering/prioritization logic

The preferred outcome is simple:
- the shelf launches the healthier `top300` board by default

### Draft behavior
The draft page should consume the new `top300` config through the existing mixed-era runtime.

No special smaller-league fallback is needed.

Expected behavior:
- normal NBA default league size remains `10`
- normal NBA roster-depth rules remain unchanged
- the mixed-era lobby opens in a valid playable state because the pool is now large enough

### Runtime behavior
The existing mixed-era runtime should continue to do the core work:
- load the authored config
- load the source packs
- curate the top `N` players from each source
- merge and sort the full crossover board
- preserve source-pack-aware metadata for draft handoff, universe details, and simulation

This patch should not introduce a second ranking pipeline or special-case mixed-era lobby behavior.

### Audit behavior
The audit page should be able to load the new `top300` config like any other authored mixed-era entry.

That gives you:
- a larger top-board and mid-board inspection surface
- a better sense of cross-era balance beyond just the very top of the draft

The old `top100` board can still remain useful as a comparison reference if needed later.

## Scope

### In scope
- a new authored mixed-era config for the `top300` board
- discovery/index wiring for the new config
- making the new board the primary mixed-era archive launch path
- verifying that the normal `10-team` NBA lobby is valid again
- rerunning the mixed-era draft-to-sim-to-resume loop against the larger board

### Out of scope
- deleting the older `top100` config
- special mixed-era league-size overrides
- dynamic pool-size-to-league-size calculations
- new warning or recommendation UI about team-size limits
- changing standard NBA draft defaults
- adding additional eras beyond the current two-season crossover

## Files Expected To Change
- `historical-packs/mixed-era/index.json`
- `historical-packs/mixed-era/1996-2016-top300.json`
- likely `historic-seasons.html` if the primary mixed-era launch path needs explicit prioritization
- likely one or more regression tests that currently assume `1996-2016-top100` is the main mixed-era path

## Verification Plan
1. Confirm the new `1996-2016-top300` config resolves through the loader.
2. Confirm the older `1996-2016-top100` config still exists as a separate authored identity.
3. Open the archive and verify the main mixed-era launch path uses the new `top300` entry.
4. Open the mixed-era draft and verify the normal `10-team` NBA default boots into a valid room without immediate slot-count failure.
5. Confirm the audit page loads the new `top300` entry cleanly.
6. Rerun the full browser loop:
   - `Mixed Era Draft -> Season -> Start Sim Season -> Run Sim Day -> resume universe`

## Success Criteria
- the primary mixed-era board is now a `300`-player authored entry
- the mixed-era draft lane feels like a normal full fantasy room at the default `10-team` setup
- the older `top100` board remains available as its own honest authored checkpoint
- standard draft modes remain unchanged
- archive, audit, and saved-universe identity continue to match the actual config used
