# Historical Preset 2000-01 Design

Date: 2026-04-22

## Goal

Add one new iconic historical universe preset for `2000-01`, presented as a first-class, fully playable historical season option inside the existing preset flow.

This pass should expand the product catalog with a broadly recognizable season, not change the simulation model or preset architecture.

## Product Intent

The historical/simulation lane is now much stronger:

- historical universes boot cleanly
- CPU lineups and roster maintenance are more believable
- archive/details surfaces are richer and easier to trust

The next content win is giving users another season they immediately want to click.

`2000-01` is the right first expansion preset because it combines:

- instant recognition
- championship-era star power
- clear product identity
- strong separation from the already-emphasized `1995-96` and `2015-16` work

This preset should feel like:

- the Shaq/Kobe Lakers universe
- an early-2000s marquee season
- a first-class historical branch, not just another catalog row

## Scope

### In Scope

- add one new historical season preset for `2000-01`
- make it selectable through the existing historical preset/catalog flow
- provide polished metadata/copy/theme/art configuration
- ensure the preset resolves through the existing loader and opens normally
- ensure archive/details pages treat it like existing first-class presets
- add focused regression coverage for the new preset wiring if needed

### Out of Scope

- adding multiple seasons in one pass
- mixed-era board work
- new simulation rules
- archive filtering redesign
- preset-architecture refactors
- new preset taxonomy beyond what is needed to ship `2000-01`

## Recommended Approach

### Option 1: Mirror The Existing Full-Season Preset Pattern

Add `2000-01` using the same structure already used by the current historical season presets, including pack metadata, catalog entry, and archive/details presentation data.

Pros:

- lowest risk
- follows proven product paths
- easiest to verify

Cons:

- does not generalize the preset system further yet

### Option 2: Lightweight Preset Shell First

Add only a thinner metadata shell for `2000-01`, with less polish or weaker integration.

Pros:

- faster

Cons:

- more likely to feel unfinished
- weaker first impression for the first new expansion season

### Option 3: Refactor The Preset Framework While Adding 2000-01

Use the new season as an excuse to generalize the preset system before adding more seasons.

Pros:

- potentially cleaner long-term

Cons:

- too much scope for the first content expansion season
- higher risk of regressions in already-working preset flows

### Recommendation

Use Option 1.

## Preset Identity

`2000-01` should be framed around broad recognition and marquee appeal.

Recommended direction:

- theme: `dynasty`
- tone: championship-era, star-heavy, early-2000s spotlight
- emphasis: Shaq + Kobe, title-defense aura, iconic Laker-era energy

The preset should read like a season people already know they want to try.

## Presentation Requirements

The new preset should have the same level of presentation care as the existing flagship presets.

### Required Metadata

- season label
- short label
- significance label
- summary
- "why it matters" copy
- art metadata compatible with the current `historic-universe.html` card/details rendering

### Copy Direction

The copy should:

- feel confident and product-facing
- avoid generic "historic season" wording
- sell this as a famous basketball world worth stepping into

It should not:

- read like database metadata
- over-explain basketball history
- sound interchangeable with the existing seasons

## Technical Shape

This should stay inside the current preset/catalog and historical-pack wiring.

Likely touch points include:

- the embedded or resolved historical preset catalog used by the historical season/archive UI
- historical loader/config wiring for the new `2000-01` pack entry
- archive/details fallback/config metadata used by `historic-universe.html`

The implementation should reuse existing season-pack conventions instead of inventing a new preset format.

## UX Expectations

Users should be able to:

- see `2000-01` as a polished preset option
- recognize it immediately as an iconic season
- open it through the normal historical universe flow
- later see it represented correctly in archive/details views

There should be no special-case UX logic that makes `2000-01` feel unlike other season presets.

## Verification

### Data / Loader Verification

- the new preset resolves through the historical pack loader
- pack id / season id wiring is correct
- existing season presets still resolve correctly

### UI / Catalog Verification

- the new preset appears in the expected preset-selection surfaces
- copy, labels, and theme metadata render correctly
- it feels visually and editorially first-class

### Universe Boot Sanity

- the season opens into the historical universe flow successfully
- archive/details pages resolve correctly for saved runs from this preset
- no missing metadata or pack-mapping issues appear

## Success Criteria

This pass is successful if:

- `2000-01` is visible as a first-class preset in the current historical season flow
- it boots successfully into the existing historical universe system
- its copy/theme/art presentation feels polished and distinct
- existing historical season presets continue to work unchanged

## Risks And Guardrails

### Risks

- pack id / metadata mismatch causing the preset to show up but not boot
- thin or generic copy making the new season feel low-value
- accidental preset drift from existing catalog conventions

### Guardrails

- one season only
- no architecture refactor in this pass
- follow the existing preset pattern
- test both catalog appearance and boot flow

## Implementation Notes

This is a content/product expansion pass, not a systems pass.

The implementation should spend risk budget on presentation quality and correct wiring, not on new abstractions.
