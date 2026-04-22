# Universe Details Roster Moves V3 Design

## Goal
Make `Universe Details` more useful for saved simulation universes by adding a compact, team-first `Recent Roster Moves` section that explains how the user's roster has changed lately without turning the page into a full transaction history screen.

## Why This Pass
`Universe Details` now already surfaces:

- the latest sim-day story
- a recent-simulation view across the last `3` sim days
- a standings slice around the user's team
- recent universe activity
- the current team-state snapshot

That solved two important trust questions:

- what just happened?
- how have the last few sim days unfolded?

The next trust gap is roster continuity:

- what changed on my roster?
- which moves were real roster moves instead of lineup noise?
- how do those moves explain why my current team looks different now?

This pass fills that gap with a compact history lane that stays team-first and archive-friendly.

## Scope
This pass is still read-only and still compact.

It should:

- add a new `Recent Roster Moves` section to `Universe Details`
- show the latest `5` grouped roster-changing moves for the controlled team
- keep the section newest first
- include only roster-changing moves
- group obvious paired roster actions into one readable entry
- derive everything from existing saved universe state

It should not:

- add lineup-only history
- add a full transaction ledger page
- add new universe-management actions
- add new persistence or transaction IDs
- redesign the page shell
- change simulation or roster-management behavior

## Existing Surface
[historic-universe.html](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/historic-universe.html) already provides:

- a strong archive/details shell
- the current universe hero summary
- latest sim-day storytelling
- recent simulation cards
- current team state
- league snapshot
- recent universe activity

This pass should preserve that structure and add one more team-first supporting section that answers:

- how has my roster changed lately?

## Information Hierarchy
The page should continue reading like a compact archive narrative.

### 1. Hero Summary
No major change.

### 2. Latest Sim Day
No major change.

### 3. Recent Simulation
No major change.

### 4. Recent Roster Moves
This is the new `v3` section.

It should answer:

- what were the latest meaningful roster changes for my team?
- which actions belonged together as one logical roster move?
- what changed independently of the current `3`-day sim window?

It should stay team-first and compact:

- latest `5` grouped moves
- newest first
- roster-changing actions only
- no broader league chatter in this section

### 5. Current Team State
Remains below roster moves as the answer to:

- where does my team stand now after those moves?

## What Counts As A Roster Move
Only roster-changing actions belong in `v3`.

Include:

- adds
- drops
- activations
- IL moves
- commissioner restores or reversals that directly change the roster

Exclude:

- lineup-only swaps
- standings-only movement
- reveal-only story beats
- other teams' activity

## Grouping Model
Grouping should stay narrow and deterministic.

A grouped move should represent one obvious roster-action cluster for the controlled team, such as:

- `Added X, dropped Y`
- `Activated X, moved Y to IL`
- `Activated X`
- `Moved X to IL`
- `Commissioner restored X`

Recommended grouping rule:

- start from the controlled team's roster-changing activity stream
- walk newest first
- merge adjacent items only when they:
  - belong to the same team
  - are roster-changing categories
  - are close in time
  - form an obvious paired action

If the pairing is not obvious:

- keep the item atomic
- do not force a group

This pass should prefer under-grouping to over-grouping.

## Data Sources
This pass should derive roster history from existing saved state.

Primary source:

- `activityLog`

Supporting context:

- controlled team identity from slot + state
- existing reveal/state metadata for optional day/week labels when that data is already cheap to derive

The design assumption is:

- the existing activity stream already contains enough signal for a first team roster-history lane
- no new persistence format is required for `v3`

## View-Model Shape
Extend the existing universe-details view model with a new `recentRosterMoves` array.

Each entry should look conceptually like:

- `title`
- `body`
- `meta`

Recommended examples:

- `Added Brent Barry, dropped Dell Curry`
- `Activated Kevin Johnson, moved Mookie Blaylock to IL`
- `Commissioner restored Alonzo Mourning`

If useful and already easy to derive, `meta` can include:

- `Week X`
- `Day Y`
- move type labels

But the section should still read well without perfect day labeling.

## Architecture
Keep this work inside [historic-universe.html](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/historic-universe.html).

Recommended structure:

- extend the existing universe-details view-model builder
- add a small helper cluster for:
  - filtering controlled-team roster-changing activity
  - grouping adjacent move pairs
  - deriving the latest `5` grouped entries
- render the new section with the same card language already used elsewhere on the page

This pass should not add:

- a new helper module
- a new page
- a new persistence layer

## UI Direction
Place `Recent Roster Moves` directly under `Recent Simulation` in the main left-column stack.

Recommended left-column order:

1. `Latest Sim Day`
2. `Recent Simulation`
3. `Recent Roster Moves`
4. `Current Team State`

This keeps the narrative sequence clear:

- what happened
- how the last few sim days went
- what changed on your roster
- where your team stands now

The section should reuse the current `detail-item` card language rather than introducing a new visual system.

## File-Level Plan
Likely implementation files:

- modify [historic-universe.html](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/historic-universe.html)
  - extend the view-model builder
  - add recent-roster-move derivation helpers
  - render the new section

- modify [tools/test-historical-universe-details.js](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/tools/test-historical-universe-details.js)
  - extend regression coverage for grouped recent-roster-move derivation and rendering

No other page or persistence seam should be required for `v3`.

## Verification

### 1. View-Model Regression
Extend [tools/test-historical-universe-details.js](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/tools/test-historical-universe-details.js) to prove:

- only the controlled team's roster-changing events are considered
- lineup-only noise is excluded
- adjacent add/drop and activate/IL pairs can group into one logical move
- unrelated events stay separate
- only the latest `5` grouped moves are kept
- newest-first order is preserved

### 2. Render Regression
Extend the same test harness so it also proves:

- the new `Recent Roster Moves` section renders
- grouped move copy appears in the expected order
- empty-state copy appears cleanly when no recent roster-change history exists

### 3. Manual Browser QA
Open a saved simulation universe in [historic-universe.html](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/historic-universe.html) and confirm:

- the section reads naturally
- grouped moves feel believable
- the page becomes easier to follow without becoming cluttered

## Success Criteria
This pass is successful if:

- `Universe Details` now explains recent team roster change, not just recent simulation outcome
- the section stays compact and team-first
- grouped moves read naturally
- no new schema or simulation-engine work is required

## Out of Scope
This design intentionally does not include:

- lineup-change history
- full transaction-history browsing
- league-wide move history
- new management actions
- new persistence work
- simulation or roster-management behavior changes
