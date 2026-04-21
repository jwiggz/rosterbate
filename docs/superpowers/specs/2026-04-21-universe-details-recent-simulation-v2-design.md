# Universe Details Recent Simulation V2 Design

## Goal
Make `Universe Details` more informative for saved simulation universes by adding a compact, team-first `Recent Simulation` section that shows the last `3` sim days and explains recent momentum without turning the page into a full transaction log or second season screen.

## Why This Pass
The first `Universe Details` sim-state pass already improved the page by surfacing:

- the latest sim-day story
- a standings slice around the user's team
- recent activity
- current roster shape

That solved the "what just happened most recently?" problem.

The next trust gap is short-horizon continuity:

- how did the universe get to this point over the last few sim days?
- what happened to my team across those days?
- what meaningful roster activity or league event stood out along the way?

Right now, the page still leans heavily on the single latest sim-day snapshot. This pass makes recent momentum legible without adding new persistence or heavy UI chrome.

## Scope
This pass is still read-only and still team-first.

It should:

- extend the existing `Universe Details` view model with a rolling recent-simulation slice
- show the last `3` sim days, newest first
- lead each day card with the user's team result
- tuck relevant team activity underneath the result
- include one light league-context note per day when available
- reuse existing saved state where possible

It should not:

- add a full transaction history page
- add new management actions
- add a full standings expansion
- add new persistence or event-ledger systems
- redesign the archive hero shell
- turn the page into a second season-management surface

## Existing Surface
[historic-universe.html](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/historic-universe.html) already provides:

- a strong archive/details shell
- the current universe hero summary
- latest sim-day storytelling
- a standings slice
- recent activity
- current team state / roster context

This pass should preserve that structure and add one new supporting section that answers:

- what happened over the last few sim days, not just the latest one?

## Information Hierarchy
The page should stay anchored in the present, then widen to recent context.

### 1. Hero Summary
No major change.

This remains the answer to:

- where is this universe right now?

### 2. Latest Story
No major change.

This remains the answer to:

- what was the latest headline?

### 3. Recent Simulation
This is the new v2 section.

It should answer:

- how did the last `3` sim days go for my team?
- what result came out of each day?
- what roster activity mattered?
- what one league-level thing is worth noticing?

Each day card should be compact and team-first:

- day / week label
- team result first
- short story line second
- team activity third if present
- one league note last if present

### 4. Supporting Context
Roster / standings / metadata sections remain below and keep their current supporting role.

## Data Sources
This pass should reuse existing universe state and derive a recent-history slice from it.

Primary sources:

- `dailyRevealReports`
- `activityLog`
- saved standings / team data already loaded into the page
- current team identity from the saved universe slot / state

The design assumption is:

- recent simulation can be derived from existing reveal + activity state
- no new persistence format is required for v2

If a universe only has one or two recorded sim days:

- render only the available days
- do not fabricate missing cards or placeholder data

## View-Model Shape
Extend the existing universe-details view model with a new `recentSimDays` array.

Each entry should look conceptually like:

- `day`
- `week`
- `teamResult`
- `story`
- `teamActivity`
- `leagueNote`

Recommended selection rules:

### Team Result
- use the user's matchup from that day's reveal report when available
- include opponent, score, and win/loss framing
- if no matchup is present, omit the result line rather than inventing one

### Story
- use reveal report headline / subheadline when available
- otherwise use a short neutral fallback such as `Simulation day completed.`

### Team Activity
- select up to `2` activity-log items tied to the user's team for that day
- prioritize roster-affecting items:
  - waiver adds / drops
  - IL moves
  - activations
- if no relevant activity exists, omit the activity row

### League Note
- select one non-team event from that day when available
- prefer something concrete and readable:
  - notable league score
  - notable CPU move
  - standings movement
- if nothing notable exists, omit the note

## Architecture
Keep this work inside [historic-universe.html](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/historic-universe.html).

Recommended structure:

- extend the existing view-model builder
- add a small helper cluster for recent-sim-day derivation
- keep rendering logic straightforward by mapping `recentSimDays` into cards

The page should not gain a second architecture layer or a separate history subsystem in this pass.

This remains a lightweight derived-state enhancement, not a storage rewrite.

## UI Direction
Place `Recent Simulation` in the main left-column stack:

1. hero summary
2. latest story
3. recent simulation
4. roster / standings / supporting details

This keeps the page narrative clear:

- the hero says where you are now
- the latest story says what just happened
- recent simulation says how the last few days unfolded

The cards should reuse the page's current panel language rather than introducing a new visual system.

Each card should stay compact:

- day / week label
- result line first
- short story line
- activity line if present
- one league note if present

The section should feel denser and more useful, not busier.

## File-Level Plan
Likely implementation files:

- modify [historic-universe.html](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/historic-universe.html)
  - extend the view-model builder
  - add helper logic for recent-simulation card derivation
  - render the new `Recent Simulation` section

- modify [tools/test-historical-universe-details.js](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/tools/test-historical-universe-details.js)
  - extend regression coverage for the new `recentSimDays` slice and rendering expectations

No new storage file, backend seam, or second page should be introduced in v2.

## Verification

### 1. View-Model Regression
Extend [tools/test-historical-universe-details.js](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/tools/test-historical-universe-details.js) to prove:

- the last `3` sim days are selected newest first
- team result is pulled from the reveal-report matchup
- up to `2` team activity items are attached for a day
- one league note is selected when available
- missing data is omitted cleanly rather than fabricated

### 2. Render Regression
Extend the same test harness so it also proves:

- the new `Recent Simulation` section renders
- cards appear only for available recent days
- card ordering stays team-result first

### 3. Manual Browser QA
Open a saved simulation universe in [historic-universe.html](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/historic-universe.html) and confirm:

- the last `3` sim days read naturally
- the cards remain compact
- the page feels more informative, not cluttered
- the surface still reads like `Universe Details`, not a season-management screen

## Success Criteria
This pass is successful if:

- users can understand recent simulation momentum at a glance
- `Universe Details` becomes more useful for ongoing sim universes
- the page stays team-first and compact
- no new persistence or sim-engine work is required

## Out of Scope
This design intentionally does not include:

- full transaction history
- a 5-day or larger timeline
- full standings expansion
- new management buttons
- new universe actions
- persistence or backend changes
- simulation engine changes
