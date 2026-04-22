# Universe Details Recent League Trades V4 Design

Date: 2026-04-22

## Goal

Add a compact `Recent League Trades` section to the Historical Universe details page so users can quickly see that the simulation-universe market is active without leaving the archive view.

This pass should make completed CPU trade activity visible, but it should not broaden into a full league ticker or a general transaction feed.

## Product Intent

The page already answers:

- what happened on the latest sim day
- how the last few sim days unfolded
- how the user team's roster changed lately

This pass should add one new answer:

- what the wider league market has done recently

The section is meant to improve trust and readability, not to create a new main narrative lane.

## Scope

### In Scope

- add a `Recent League Trades` section to `historic-universe.html`
- derive the latest 5 completed trade entries from existing saved state
- show entries newest first
- render compact league-first trade cards in the support column
- provide a clean empty state when no completed trades exist yet
- add focused view-model and render regression coverage

### Out of Scope

- waivers, IL moves, lineup-only changes, or broader activity feed work
- team-specific highlighting or relevance ranking
- new persistence schema or extra simulation logging
- CPU trade-market behavior changes
- commentary or inferred explanations for why a trade mattered

## Recommended Approach

### Option 1: Dedicated Recent League Trades Section

Add one new view-model slice derived from `activityLog`, filter to completed trade events, cap it at 5, and render it in a compact right-column section.

Pros:

- directly matches the new CPU trade-market feature
- low risk and easy to reason about
- preserves the page's team-first layout

Cons:

- only covers one category of league activity for now

### Option 2: Fold Trades Into Recent Simulation

Include league trades inside the existing recent simulation cards.

Pros:

- fewer new sections

Cons:

- muddies the meaning of recent sim-day history
- makes team-result cards harder to scan

### Option 3: Broad League Activity Ticker

Create a general league-activity section with trades, waivers, IL moves, and other events.

Pros:

- broader coverage

Cons:

- too noisy for this pass
- too much surface area before the compact trade-only version is validated

### Recommendation

Use Option 1.

## Data Source And View Model

The new section should be fully derived from the existing universe save state.

### Source

- `activityLog`

### Selection Rules

- include only completed trade events
- newest first
- keep only the latest 5
- exclude waivers, IL moves, lineup changes, and other non-trade activity
- if fewer than 5 exist, show only the available entries
- if none exist, show an empty state

### View-Model Addition

Add one new field to the existing universe-details view model:

- `recentLeagueTrades`

Each item should stay simple and presentation-ready, with fields such as:

- `title`
- `text`
- `meta` when day/week or similar source detail is already available

This pass should not add any new storage or log-enrichment requirements.

## UI Placement

Place `Recent League Trades` in the right-hand support column.

### Why This Placement

- the left column is already reserved for the main user/team story
- league trades are supporting context, not the primary narrative
- the right column benefits from a stronger sense of current league motion

### Section Behavior

- compact card list
- consistent with current support-card language
- each card shows the trade itself and only the trade itself
- no inferred rationale or extra analysis copy

Example entries:

- `CPU Team 1 traded Bench Big to CPU Team 2 for Bench Creator`
- `CPU Team 3 traded Wing Stopper to CPU Team 1 for Stretch Four`

## Rendering Rules

The renderer should:

- show the section only as a normal section, even when the list is short
- render cards newest first
- render plain trade text without embellishment
- render a clean empty-state message when there are no completed trades yet

The section should feel archival and readable, not like a noisy transaction feed.

## Testing Strategy

### View-Model Regression

Extend `tools/test-historical-universe-details.js` to prove:

- only completed trade entries are selected
- newest-first ordering is preserved
- only the latest 5 are kept
- non-trade activity is excluded
- empty-state behavior works when there are no trades

### Render Regression

Add assertions that:

- the new `Recent League Trades` section exists in the page markup
- rendered trade text appears in the expected order
- empty-state copy appears when the list is empty

### Manual Sanity

Open a saved simulation universe and confirm:

- the section is easy to scan
- it reads as league context rather than noise
- right-column placement feels supportive rather than distracting

## Success Criteria

This pass is successful if:

- users can see the latest 5 completed league trades from the universe page
- the section stays compact and league-first
- non-trade activity is excluded cleanly
- no new persistence or engine logic is required

## Risks And Guardrails

### Risks

- accidentally broadening the section into a general activity stream
- cluttering the main narrative if placement drifts into the left column
- overformatting entries beyond what the activity log actually supports

### Guardrails

- trade-only for v4
- right-column support placement
- latest 5 only
- no inferred commentary about trade impact

## Implementation Notes

Likely touch points:

- `historic-universe.html`
- `tools/test-historical-universe-details.js`

This should remain a presentation-layer enhancement over existing saved state, not a simulation change.
