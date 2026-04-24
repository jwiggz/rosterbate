# Remove Real Season Mode Design

**Date:** 2026-04-23  
**Branch:** `shared-season-shell-simulation-backend`

## Goal

Remove the `real_season` product mode and all user-facing references to `Play The Real Season` while preserving the parts of historical seasons that still matter:

- historical-year player pools
- historical stat baselines
- drafted historical experiences
- mixed-era simulation leagues

The product should no longer imply that users should replay a season using a full intact historical roster such as the `1995-96 Bulls`.

## Product Direction

Historical seasons should remain valuable as source material, not as a standalone "replay the season as-is" mode.

After this change, the historical feature set should be framed around:

- browsing historical seasons
- drafting players from a given era
- using historical years as source pools for simulation
- historical stat baselines informing player strength

It should no longer be framed around:

- `Play The Real Season`
- `Real Season`
- replaying a full historical rostered season
- "the historical league intact" as a live playable mode

## What Must Be Removed

Remove all user-facing and metadata-level references to the playable `real_season` mode, including:

- `Play The Real Season`
- `Real Season`
- `real_season` mode/action declarations
- descriptions that sell replaying the full season as-is

This includes:

- landing/homepage CTAs
- historic-seasons browse UI
- historical pack fixture/action metadata
- dev runner/action surfaces that expose the old mode
- archive labels that still call something `Real Season`

## What Must Be Preserved

Do **not** remove the underlying historical season value that still serves the current product.

Preserve:

- historical season packs
- player pools from those years
- historical per-season stat baselines
- draft/simulation flows built from those years
- saved drafted/simulation universes that already use historical content

The goal is to remove the mode, not discard the data.

## Terminology Change

Where the UI currently says `Real season stats` but actually means "these player baselines came from that historical year," rename it to:

- `Historical season stats`

This wording should be used anywhere the stat-baseline concept survives after `real_season` mode removal.

The rename is important because:

- it keeps the data meaning intact
- it stops implying a literal season replay feature

## Routing And Legacy Behavior

The old mode should shut down gracefully.

### Live entry points

Remove direct entry points into `real_season`.
Replace those surfaces with the remaining valid historical actions, such as:

- `Browse Historic Seasons`
- `Draft The Era`
- simulation entry points where applicable

### Stale links / old URLs

If a URL explicitly requests `real_season`, it should no longer attempt to boot that removed mode.

Instead, it should fall back to the nearest valid historical surface for that season, preferably:

- a historical season detail/browse page

It should not silently auto-launch a different gameplay mode unless that behavior is already well-established elsewhere.

### Saved legacy entries

For old saved objects or archive labels that still carry `real_season` metadata:

- do not present them as a supported playable `Real Season`
- degrade them into neutral historical detail/archive behavior when possible

The app should feel stable even if legacy artifacts exist.

## Surface-Level Changes

### Homepage / landing

Update the historical entry so it no longer says things like:

- `Play The Real Season`
- `relive the real season`

Keep the story focused on:

- historical player pools
- drafting the era
- simulation universes

### Historic seasons browser

Remove:

- `Real Season` nav/CTA language
- card summaries that pitch replaying the real season

Rename:

- `Real season stats` -> `Historical season stats`

### Historical pack presentation / fixtures

Remove:

- `mode: 'real_season'`
- action groups that expose `Play The Real Season`
- subtitles / hero copy that say things like:
  - `Play the real season or draft the era`
  - `Step into 2000-01 with the historical league intact`

Those surfaces should instead frame historical seasons as source universes for draft/sim experiences.

### Archive / slot labels

Remove `Real Season` labels from slot summaries and archive-facing language.

Replace them with neutral historical wording when needed.

### Explanatory copy in simulation/historical surfaces

Where the phrase `real season stats` is used to explain rating or baseline sources rather than the removed mode, rename it to:

- `Historical season stats`

## Technical Shape

This should be handled as a focused removal/refactor rather than a rewrite.

### Primary surfaces likely involved

- `index.html`
- `historic-seasons.html`
- `my-leagues.html`
- `historical-pack-fixtures.js`
- `historical-pack-dev-runner.js`
- `historical-universe-slots.js`
- `historic-universe.html`

### Historical pack metadata likely involved

Checked-in pack metadata and presentation files under:

- `historical-packs/`

This includes manifests and optional presentation/challenge metadata where `real_season` actions are still declared.

### Routing helpers likely involved

Any historical boot/routing code that currently interprets:

- `real_season`
- `season` actions that map to real-season mode

should be updated to degrade into a supported historical surface instead of launching the removed mode.

## Guardrails

To keep this cleanup focused:

- do not remove historical packs
- do not remove drafted historical flows
- do not remove mixed-era simulation
- do not redesign the historical product from scratch
- do not rename unrelated historical concepts beyond the mode/copy cleanup

## Testing Requirements

### Surface verification

Confirm that live UI surfaces no longer show:

- `Play The Real Season`
- `Real Season`

and that they instead present the remaining valid historical actions.

### Metadata verification

Confirm there are no live action declarations still exposing:

- `mode: 'real_season'`

in the runtime historical pack/fixture surfaces that drive the UI.

### Terminology verification

Confirm surviving stat-baseline copy now uses:

- `Historical season stats`

where appropriate.

### Legacy behavior verification

Confirm stale `real_season` links or legacy entry metadata no longer boot a removed mode and instead land on a sensible historical fallback.

### Regression verification

Confirm this cleanup does **not** break:

- browsing historical seasons
- drafting from historical player pools
- mixed-era simulation flows
- historical archive/detail views for supported universes

## Success Criteria

This work is successful when:

- the app no longer presents `real_season` as a playable feature
- historical content still works as source material for drafts and sims
- surviving stat-baseline language uses neutral historical wording
- legacy `real_season` entry paths fail gracefully into supported historical surfaces
