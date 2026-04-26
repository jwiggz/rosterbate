# Simulation Matchup Parity Design

Date: 2026-04-25
Repo: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate`

## Goal

Make simulation `Matchup` feel much closer to the single-player matchup room for both NBA and NFL while keeping simulation-specific cadence and backend rules intact. The page should move beyond a thin `schedule/results` summary and become a richer side-by-side matchup experience with stronger navigation, team-vs-team context, and real shared-shell actions wherever simulation already supports them.

## User Intent

The user wants simulation leagues to feel like real single-player leagues rather than reduced shells. For `Matchup`, that means:

- richer single-player-style composition
- deeper side-by-side lineup detail
- day/week navigation that matches the sport
- matchup-specific actions that are genuinely interactive wherever simulation can support them

The user explicitly prefers deeper functional parity over presentation-only parity.

## Architecture

`C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html` should keep one shared simulation matchup renderer instead of introducing a separate bespoke page again. The renderer should become a proper shared-shell matchup room that reads a richer simulation matchup view model.

`C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-season-adapter.js` should be the primary boundary. It should define what the current matchup is, which navigation targets are valid, how side-by-side team panels are built, and which matchup actions are available. The renderer should not infer sport logic from raw state.

NBA and NFL should differ through data:

- NBA simulation remains day-based
- NFL simulation remains week-based
- both feed the same overall page composition

This keeps the shell shared while preserving simulation cadence and sport-specific slot rules underneath.

## Matchup View Model

The simulation matchup renderer should consume a view model with these top-level concepts:

- `sport`
- `title`
- `subtitle`
- `cycleLabel`
- `hero`
- `navigation`
- `currentMatchup`
- `previousMatchup`
- `recentResults`
- `detailCards`
- `actionCards`
- `teamPanels`
- `lineupSections`

### Hero

The hero block should provide the current matchup framing in a single-player-style format:

- controlled team identity
- opponent identity
- record/context labels
- cycle/day/week label
- current score or projected/revealed state label
- top-line matchup summary copy

### Navigation

Navigation should be adapter-driven.

For NBA:

- valid day chips within the current week or sim window
- current selected day
- ability to move backward/forward within valid bounds

For NFL:

- valid weekly navigation
- selected week state
- no fake daily navigation

The renderer should display only the navigation shape that the adapter says is valid.

### Team Panels

The matchup room should expose a side-by-side view of:

- my team
- opponent

Each panel should be able to include:

- team name / avatar / abbreviation
- record
- revealed or projected score label
- matchup status
- top contributors when available
- short matchup notes

### Lineup Sections

Both teams should provide row-grouped lineup sections so the page can render richer side-by-side detail instead of a flat results list.

NBA rows can stay closer to daily fantasy starter/bench groupings.

NFL rows should use football-friendly slot groupings such as:

- weekly starters
- bench / depth

If revealed player-level results exist, rows may include richer result context. If not, rows should still show usable slot/player/status structure.

### Action Cards

The simulation matchup page should expose actionable cards where support exists, such as:

- open `My Team`
- open `Waivers`
- review schedule/results
- review opponent lineup context

The renderer should consume adapter-provided action metadata instead of hard-coding sport-specific decisions into the page.

## Rendering Strategy

The current simulation matchup renderer in `rosterbate-season.html` should be upgraded from a simple hero plus recent-results card into a fuller matchup-room layout that more closely mirrors single-player structure.

The page should include:

- matchup hero card
- side-by-side matchup summary band or panels
- navigation controls
- matchup action cards
- two-team lineup comparison area
- recent results / context section

This should still live inside the existing shared season shell and respect the shell’s page framing, top bar, and side-panel behavior.

## Interaction Rules

The page should only show controls that are real or intentionally unavailable.

Supported interactions should work immediately:

- navigate valid day/week targets
- open related shared-shell pages
- inspect current matchup context

Unsupported behaviors should not masquerade as live. If something cannot be supported in simulation yet, it should be absent or clearly disabled with explicit copy.

## Sport-Specific Boundaries

This pass does not change simulation rules. It only improves how matchup state is exposed and interacted with through the shared shell.

Out of scope:

- redesigning the underlying schedule generator
- changing NBA or NFL scoring rules
- adding new simulation-only matchup mechanics
- rewriting broader season flow outside the matchup page

In scope:

- richer matchup composition
- adapter-driven matchup data
- side-by-side lineup detail
- valid navigation
- real matchup action routing where already supportable

## Testing

Regression coverage should be extended in:

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js`
- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js`
- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-nfl-shared-season-shell-weekly-sim.js`

The test plan should verify:

- simulation matchup renders richer single-player-style structure
- NBA matchup navigation remains day-based
- NFL matchup navigation remains week-based
- side-by-side team panels and lineup sections render for both sports
- matchup action cards route into supported shared-shell destinations
- existing NFL weekly simulation behavior is not regressed

## Risks

The main risks are:

- overfitting the matchup renderer to NBA assumptions and breaking NFL cadence
- creating decorative interaction that still does nothing on click
- growing a second matchup UI branch instead of keeping the renderer shared

The design guards against those by keeping the adapter as the mode boundary, keeping sport-specific cadence in the data layer, and requiring visible controls to be real wherever possible.

## Success Criteria

This work is successful when:

- simulation `Matchup` no longer feels like a reduced schedule screen
- the page looks and behaves much closer to the single-player matchup room
- NBA and NFL remain sport-correct in navigation and lineup detail
- matchup actions that are shown are genuinely useful in simulation
