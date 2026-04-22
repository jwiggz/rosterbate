# Historical Preset 1992-93 Design

Date: 2026-04-22

## Goal

Add one new iconic historical universe preset for `1992-93`, presented as a first-class, fully playable historical season option inside the existing preset flow.

This pass should expand the product catalog with a premium early-`1990s` tentpole, not change the simulation model or archive architecture.

## Product Intent

The historical archive now has real playable anchors in:

- `1986-87`
- `1995-96`
- `2000-01`
- `2015-16`

The next content win is adding a clean early-`1990s` marquee season that feels immediately recognizable and clearly different from both the `1986-87` rivalry-prestige lane and the `1995-96` dynasty-apex lane.

`1992-93` is the right next iconic preset because it gives the archive:

- a true early-`1990s` Bulls-centered tentpole
- broad recognition through Jordan's first three-peat era
- a strong Finals counterweight through Barkley and the Suns
- a clean shelf identity that reads as title-era prestige, not just "another Jordan season"

This preset should feel like:

- the season where the first three-peat becomes real
- Jordan title-era gravity as the main hook
- Barkley/Suns as the challenger pillar
- Dream Team afterglow as supporting atmosphere, not the headline

## Scope

### In Scope

- add one new historical season preset for `1992-93`
- make it selectable through the existing historical preset/catalog flow
- build a real `nba_1993_full_season_v1` pack
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
- broader early-`1990s` taxonomy work beyond what is needed to ship `1992-93`

## Recommended Approach

### Option 1: Reuse The Proven Iconic-Preset Expansion Lane With Source Validation First

Follow the same overall workflow as the recent preset expansions:

- real builder
- real pack
- real shelf promotion
- real boot verification

But validate the actual `1992-93` source availability before assuming it should behave like either `2000-01` or `1986-87`.

Pros:

- reuses the now-proven preset expansion lane
- keeps implementation risk focused
- lets real source availability determine whether this should be a higher-fidelity pack or an honest playable foundation

Cons:

- does not yet create a generalized multi-season builder framework

### Option 2: Clone The 2000-01 Builder Directly And Retarget Constants

Copy the `2000-01` builder and only retarget season constants and copy.

Pros:

- faster initially

Cons:

- too brittle if `1992-93` source availability or field shapes differ
- higher risk of silently shipping a structurally valid but semantically weaker pack

### Option 3: Pause And Generalize Historical Pack Building Before Adding 1992-93

Stop content expansion to build a shared multi-season builder framework first.

Pros:

- cleaner long-term architecture

Cons:

- too much scope for the next preset
- delays the next high-value content win

### Recommendation

Use Option 1.

## Preset Identity

`1992-93` should be promoted as a first-three-peat-prestige flagship.

Recommended direction:

- significance: `First Three-Peat Prestige`
- tone: `dynasty`
- focus team: `Chicago Bulls`
- star pillars:
  - `Michael Jordan`
  - `Charles Barkley`
  - `Scottie Pippen`

The primary frame should be:

- first three-peat prestige first
- Jordan title-era gravity second
- Barkley/Suns challenger energy third

This should not read like:

- a generic Bulls nostalgia card
- a Barkley-only Suns spotlight
- a Dream Team epilogue pack with no clear shelf anchor

## Presentation Requirements

The new preset should have the same level of presentation care as the current iconic presets.

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
- frame the season around first-three-peat prestige, not just generic Jordan greatness
- keep the Bulls as the focus team while still making Barkley/Suns feel like a meaningful shelf counterweight
- clearly distinguish the season from:
  - `1986-87`
  - `1995-96`
  - `2000-01`

It should not:

- read like a generic encyclopedia note
- sound interchangeable with the `1995-96` dynasty-apex preset
- overclaim data fidelity if any field must be inferred

## Technical Shape

This should stay inside the current preset/catalog and historical-pack wiring.

Likely touch points include:

- a new `build-historical-pack-1993.*` builder
- `historical-packs/nba_1993_full_season_v1/`
- the embedded or resolved historical preset catalog used by the historical season/archive UI
- historical loader/config wiring for the new `1992-93` pack entry
- archive/details fallback/config metadata used by `historic-universe.html`

The implementation should reuse existing season-pack conventions instead of inventing a new preset format.

## Builder Expectations

The builder should follow the same broad model as the recent iconic-preset expansions, but must treat `1992-93` as its own source-validation problem.

Expected shape:

- schedule/results from the best available historical game source
- roster/team metadata from the current trusted season-source path
- event-derived per-game stat lines where available
- season-level presentation/summary/challenge metadata authored in the builder output

Required early checks:

- the season archive actually contains `1992-93` regular-season rows
- team abbreviation and roster mapping align with the season's real teams
- source parsing yields a full-league player pool rather than a partial or degraded pack
- pack output is not allowed to silently degrade into empty or half-empty content

If any field must be inferred for compatibility:

- disclose it honestly in pack notes
- do not market it as literal historical truth

## UX Expectations

Users should be able to:

- see `1992-93` as a polished playable preset
- understand instantly why it matters
- open it through the normal historical universe flow
- later see it represented correctly in archive/details views

There should be no special-case UX logic that makes `1992-93` feel unlike the other real season presets.

## Verification

### Pack / Build Verification

- the builder runs successfully
- emitted summary shows:
  - correct pack id
  - correct team count
  - positive counts for players, schedule games, player game stats, and season stats
- bundle validation passes cleanly

### Preset / Catalog Verification

- `nba_1993_full_season_v1` becomes playable in:
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

- `1992-93` is visible as a first-class playable preset in the historical season flow
- it boots successfully into the existing historical universe system
- its copy/theme/art presentation feels polished and distinct
- the archive gains a strong early-`1990s` Bulls-centered tentpole
- existing historical season presets continue to work unchanged

## Risks And Guardrails

### Risks

- early-`1990s` source data may not match `2000-01` assumptions cleanly
- the preset could drift too close to `1995-96` if the copy is framed too generically around Jordan
- a weak or partial player-game source could tempt the implementation toward overclaiming fidelity

### Guardrails

- keep `1992-93` shelf identity distinct from `1995-96`
- validate source shape before choosing implementation shortcuts
- prefer honest foundation/disclosure over fake precision
- keep the implementation inside the proven preset-expansion lane
