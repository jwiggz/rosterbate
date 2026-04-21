# Universe Details Sim-State V1 Design

## Goal
Make `Universe Details` meaningfully more useful for historical simulation universes by surfacing the latest sim-day story first, followed by light league context, recent universe activity, and the current shape of the user's team.

## Why This Pass
The simulation lane is now materially stronger:

- mixed-era flagship ranking is accepted enough to stop being the main blocker
- CPU simulation lineups are now stable and readable
- CPU lineup personalities are now varied enough to keep
- CPU IL / activation behavior is in place
- conservative simulation-universe-only waiver cleanup is now in place

The next trust gap is not only "is the sim behaving well?" but "can the user see what happened in this universe without digging through season state manually?"

Right now, [historic-universe.html](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/historic-universe.html) already has a strong shell and archive identity, but its state sections still read more like placeholders than a living simulation summary.

This pass fixes that by turning `Universe Details` into a readable "what just happened here?" surface.

## Scope
This first pass is read-only insight only.

It should:

- enrich the existing `Universe Details` page
- lead with the user team's latest sim-day result
- provide a short standings slice around the user team
- surface recent universe activity
- summarize the current shape of the user's roster

It should not:

- add new management actions
- add a dedicated full standings page
- add a separate transactions page
- redesign archive navigation
- introduce backend migration work
- require brand-new long-term persistence unless a hard data gap is discovered

## Existing Surface
[historic-universe.html](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/historic-universe.html) already provides:

- a strong archive-themed hero shell
- basic saved-universe summary cards
- pack-context presentation
- roster-core presentation
- timeline/archive framing

It already reads from:

- the saved universe slot
- current historical universe state
- pack catalog metadata
- mixed-era runtime summary when relevant

This pass should preserve that shell and replace weaker generic summary areas with more meaningful simulation-state storytelling.

## Information Hierarchy
The first pass should use a `top-story + supporting strips` structure.

### 1. Latest Sim Day
This should be the lead section and should be team-first with light league context.

It should answer:

- what happened most recently to my team?
- who did I play?
- did I win or lose?
- what was the fantasy swing or headline?
- how did that affect my current standing context if that data is available?

This should read like a short broadcast-style recap, not a raw state dump.

### 2. League Snapshot
This should be a compact standings slice around the user's team.

It should not attempt to show the full league table in v1.

It should answer:

- where am I now?
- who is right above and below me?
- what does the nearby league context look like?

### 3. Recent Universe Activity
This should surface a short recent-activity strip from already-saved activity/reveal/event state.

Ideal examples:

- CPU waiver moves
- IL / activation moves
- sim-day maintenance or notable universe activity

It should stay brief and scannable rather than becoming a giant transaction log.

### 4. Current Team State
This should summarize the current shape of the user's roster now that the latest sim day is complete.

It should answer:

- who anchors the team now?
- how healthy / available is the current roster?
- what does the team spine look like?

This should complement the existing roster-core section rather than duplicate the entire season page.

## Data Sources
This pass should prefer existing saved simulation data over new persistence.

Primary sources:

- saved historical universe slot metadata
- current historical universe state loaded through the existing universe details page
- latest reveal/report data already produced by sim-day runs
- standings already stored in universe state
- activity log or recent-event structures already written by CPU maintenance and simulation flows
- current roster and availability data

The guiding principle for v1 is:

- surface existing state better
- do not invent a whole new event ledger first

If implementation reveals a hard data gap, that should be called out explicitly rather than papered over with speculative persistence work.

## Architecture
Keep the work inside [historic-universe.html](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/historic-universe.html) for this pass.

Recommended structure:

- keep the current page shell and archive identity
- add one small derived-state layer inside the page script that computes:
  - latest sim-day summary
  - standings slice around the user team
  - recent activity summary
  - team-state summary
- render those summaries into the existing panel layout with minimal new chrome

If the page script becomes too tangled, one small helper file is acceptable, but only if needed. The default plan should assume the work stays inside the current page.

## UI Direction
This should still feel like an archive/details page, not a second season page.

So the tone should be:

- focused
- scannable
- narrative enough to explain what just happened
- compact enough that the user still feels they are in a details/landing surface

The page should answer, in order:

1. what just happened?
2. where do I stand now?
3. what changed in the universe recently?
4. what shape is my team in?

That means the top card should be story-like, and the lower strips should be compact supporting context.

## File-Level Plan
Likely implementation files:

- modify [historic-universe.html](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/historic-universe.html)
  - enrich state-reading and rendering
  - add latest-sim-day, standings-slice, recent-activity, and team-state rendering

- add or modify one focused regression file if needed for page-data rendering
  - exact file can be chosen during implementation once the cleanest seam is identified

No other page should be in scope for v1 unless a truly necessary helper seam is discovered.

## Verification

### 1. Data / Render Regression
Create or extend a focused test harness that proves the page can render:

- latest sim-day headline
- standings slice around the user team
- recent activity items
- current team-state summary

It should also prove the page degrades cleanly if some of those pieces are absent.

### 2. Manual Browser QA
Open at least one saved simulation universe in [historic-universe.html](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/historic-universe.html) and confirm the page now clearly answers:

- what happened last sim day?
- where am I in the league?
- what changed recently?
- what shape is my team in now?

### 3. Product Sanity
Confirm that:

- the page still feels like an archive/details surface
- it does not turn into a second season-management page
- desktop and mobile remain scannable
- the page is not just dumping raw state text

## Success Criteria
This pass is successful if:

- `Universe Details` becomes genuinely useful for simulation universes
- users can understand the most recent state of their universe quickly
- simulation universes feel more legible and alive
- future CPU/system tuning becomes easier because recent state is exposed in the product

## Out of Scope
This design intentionally does not include:

- full standings page expansion
- transaction-management tools
- new archive navigation structures
- new roster-management controls
- backend migration work
- a brand-new persistence/event system

Those can follow later if this first insight pass reveals a hard data or UX gap.
