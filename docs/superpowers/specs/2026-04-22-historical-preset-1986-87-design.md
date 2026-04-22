# Historical Preset 1986-87 Design

Date: 2026-04-22

## Goal

Add one new iconic historical universe preset for `1986-87`, presented as a first-class, fully playable historical season option inside the existing preset flow.

This pass should expand the product catalog with a premium `1980s` tentpole, not change the simulation model or archive architecture.

## Product Intent

The historical archive now has real playable anchors in:

- `1995-96`
- `2000-01`
- `2015-16`

The next content win is widening that shelf into the `1980s` with a preset that feels immediately recognizable and clearly different from the existing dynasty- and breakthrough-era packs.

`1986-87` is the right next iconic preset because it gives the archive:

- a true `1980s` flagship
- broad recognition through Celtics/Lakers prestige
- a clean three-pillar star identity:
  - Magic Johnson
  - Larry Bird
  - Michael Jordan
- a premium rivalry-season angle without collapsing into nostalgia-only framing

This preset should feel like:

- the Lakers-anchored prestige rivalry season
- the Celtics/Lakers Finals era at full gravity
- young Jordan entering the frame and making the player pool bigger than a two-team replay

## Scope

### In Scope

- add one new historical season preset for `1986-87`
- make it selectable through the existing historical preset/catalog flow
- build a real `nba_1987_full_season_v1` pack
- add a season-specific builder for that pack
- provide polished metadata/copy/theme/art configuration
- ensure the preset resolves through the existing loader and opens normally
- ensure archive/details pages treat it like existing first-class presets
- add focused regression coverage for the new preset wiring and trust checks as needed

### Out of Scope

- adding multiple seasons in one pass
- mixed-era board work
- new simulation rules
- archive filtering redesign
- preset-architecture refactors
- broad `1980s` catalog taxonomy work beyond what is needed to ship `1986-87`

## Recommended Approach

### Option 1: Reuse The 2000-01 Expansion Pattern With Season-Specific Validation

Follow the same overall workflow as `2000-01`:

- real builder
- real pack
- real shelf promotion
- real boot verification

But validate the `1986-87` data sources explicitly before assuming the same quirks and field shapes as `2000-01`.

Pros:

- reuses the now-proven preset expansion lane
- keeps implementation risk focused
- acknowledges that older-season source behavior may differ

Cons:

- does not yet create a generalized multi-season builder framework

### Option 2: Clone And Retarget The 2000-01 Builder With Minimal Changes

Copy the `2000-01` builder and only retarget season constants and copy.

Pros:

- faster initially

Cons:

- too brittle for a materially older season
- higher risk of shipping a structurally valid but semantically weak pack

### Option 3: Generalize Historical Pack Building Before Adding 1986-87

Pause content expansion to build a shared multi-season builder framework first.

Pros:

- cleaner long-term architecture

Cons:

- too much scope for the next preset
- delays the next high-value content win

### Recommendation

Use Option 1.

## Preset Identity

`1986-87` should be promoted as a prestige-rivalry flagship.

Recommended direction:

- significance: `Finals Prestige`
- tone: `heritage`
- focus team: `Los Angeles Lakers`
- star trio:
  - `Magic Johnson`
  - `Larry Bird`
  - `Michael Jordan`

The primary frame should be:

- Finals rivalry prestige first
- Showtime and Celtics gravity second
- young Jordan entering the frame as the third pillar

This should not read like:

- a generic `1980s` history pack
- a Lakers-only nostalgia card
- a young-Jordan-only spotlight season

## Presentation Requirements

The new preset should have the same level of presentation care as the current flagship presets.

### Required Metadata

- season label
- short label
- significance label
- summary
- "why it matters" copy
- art metadata compatible with the current `historic-universe.html` card/details rendering
- complete playable-mode URLs:
  - season
  - sim
  - draft
  - reimagined

### Copy Direction

The copy should:

- feel premium and product-facing
- frame the season around rivalry prestige, not only nostalgia
- make the Lakers focus team coherent without flattening Bird and Jordan into background names
- clearly distinguish the season from the existing `1995-96`, `2000-01`, and `2015-16` presets

It should not:

- read like a generic encyclopedia note
- sound interchangeable with the current `1986-87` preview copy
- oversell speculative data quality if any field must be inferred

## Technical Shape

This should stay inside the current preset/catalog and historical-pack wiring.

Likely touch points include:

- a new `build-historical-pack-1987.*` builder
- `historical-packs/nba_1987_full_season_v1/`
- the embedded or resolved historical preset catalog used by the historical season/archive UI
- historical loader/config wiring for the new `1986-87` pack entry
- archive/details fallback/config metadata used by `historic-universe.html`

The implementation should reuse existing season-pack conventions instead of inventing a new preset format.

## Builder Expectations

The builder should follow the same broad model as `2000-01`, but must treat `1986-87` as a separate source-validation problem.

Expected shape:

- schedule/results from the historical game archive
- roster/team metadata from TheBasketballDatabase
- event-derived per-game stat lines where available
- season-level presentation/summary/challenge metadata authored in the builder output

Required early checks:

- season archive actually contains `1986-87` regular-season rows
- team abbreviation map aligns with the season's actual abbreviations
- team page parsing yields real players and totals
- pack output is not allowed to silently degrade into empty or half-empty content

If any field must be inferred for compatibility:

- disclose it honestly in pack notes/audit copy
- do not market it as literal historical truth

## UX Expectations

Users should be able to:

- see `1986-87` as a polished playable preset
- understand instantly why it matters
- open it through the normal historical universe flow
- later see it represented correctly in archive/details views

There should be no special-case UX logic that makes `1986-87` feel unlike the other real season presets.

## Verification

### Pack / Build Verification

- the builder runs successfully
- emitted summary shows:
  - correct pack id
  - correct team count
  - positive counts for players, schedule games, player game stats, and season stats
- bundle validation passes cleanly

### Preset / Catalog Verification

- `nba_1987_full_season_v1` becomes playable in:
  - `historical-packs/catalog.json`
  - `historic-seasons.html`
  - `historic-universe.html`
  - `rosterbate-season.html`
- the exact season/sim/draft/reimagined URLs resolve correctly

### Boot / Trust Verification

- direct season boot works
- direct sim boot works
- focused regression for the new preset passes
- any inferred fields are disclosed in notes instead of hidden behind generic "real data" copy

## Success Criteria

This pass is successful if:

- `1986-87` is visible as a first-class playable preset in the historical season flow
- it boots successfully into the existing historical universe system
- its copy/theme/art presentation feels polished and distinct
- the archive gains a real `1980s` tentpole identity
- existing historical season presets continue to work unchanged

## Risks And Guardrails

### Risks

- older-season source data may not match `2000-01` assumptions cleanly
- a structurally valid pack could still feel weak if inferred fields are overclaimed
- generic preview-era copy could survive into the promoted preset and make it feel under-authored

### Guardrails

- one season only
- no archive refactor in this pass
- reuse the proven `2000-01` expansion lane
- validate source shape before trusting it
- disclose inferred fields honestly

## Implementation Notes

This is a content/product expansion pass, not a systems rewrite.

The implementation should spend risk budget on:

- trustworthy pack generation
- sharp preset identity
- correct playable wiring

not on:

- new abstractions
- archive redesign
- multi-season framework work
