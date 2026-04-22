---
title: "Archive Browsing / Filtering V1 Design"
type: spec
date: 2026-04-22
status: draft
tags:
  - rosterbate
  - archive
  - historical
  - browsing
  - filtering
  - ux
---

## Summary
Add a first-pass browsing/filtering layer to the historical pack shelf in `historic-seasons.html` so users can narrow the archive intentionally without losing the current premium, card-driven presentation.

This pass is intentionally narrow:
- `historic-seasons.html` only
- historical packs only
- filter chips first
- one active chip per category
- one compact sort control
- URL-persisted state

The goal is to make the archive easier to explore now that the shelf has a real marquee core across:
- `1986-87`
- `1992-93`
- `1995-96`
- `2000-01`
- `2015-16`

## Product Goal
The historical archive should feel like a curated shelf that users can browse with intent, not a static list they have to scan manually.

This feature should help users answer:
- show me playable packs
- show me 1990s packs
- show me dynasty-heavy packs
- show me the shelf in a different order without losing the authored feel

It should not turn the archive into:
- a dense admin-style table
- a search-heavy catalog UI
- a generic filtering app disconnected from the current visual language

## Scope

### In scope
- add a horizontal filter bar above the archive browser in `historic-seasons.html`
- add single-select chip groups for:
  - `Era`
  - `Playability`
  - `Significance`
- add a compact sort control with:
  - `Featured`
  - `Newest Playable`
  - `Era`
- persist active filters/sort in the page URL
- update the visible pack rail immediately as filters/sort change
- keep the selected detail panel synchronized with the filtered result set
- render an empty state when no packs match
- add a `Clear Filters` path back to default browsing

### Out of scope
- saved-universe filtering
- search box / free text search
- multi-select chips within a category
- cross-page archive-state synchronization
- changes to `historic-universe.html`
- generic archive browsing module extraction
- archive redesign or large visual refresh

## Primary Surface
- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\historic-seasons.html`

This page is the archive’s main browsing shelf, so it is the right place to harden the model before spreading it elsewhere.

## User Experience

### Control layout
Add the new controls directly above the existing archive browser shell, between the section intro copy and the archive rail/detail split.

Recommended layout:
- left side:
  - filter chip groups for `Era`, `Playability`, and `Significance`
- right side:
  - compact sort control

The controls should feel like part of the current premium shelf, not a secondary admin panel.

### Filter categories

#### Era
- `All`
- `1980s`
- `1990s`
- `2000s`
- `2010s`

#### Playability
- `All`
- `Playable Now`
- `Preview`

#### Significance
- `All`
- `Dynasty`
- `Prestige`
- `Spotlight`
- `Modern`

Each category is single-select:
- one active value per category
- selecting a different chip replaces the active value
- selecting `All` clears only that category

### Sort control
Supported sort values:
- `Featured`
- `Newest Playable`
- `Era`

The control can be a compact dropdown or pill-triggered menu, but it should stay visually subordinate to the pack cards themselves.

## URL State
Filter and sort state should persist in the page URL.

Recommended shape:
- `?sport=nba&era=1990s&availability=playable&significance=dynasty&sort=featured`

Rules:
- preserve existing relevant params like `sport`
- hydrate control state from the URL on page load
- update the URL immediately as filters/sort change
- invalid values fall back safely to defaults
- omit default values from the URL when practical to keep it readable

Default state:
- `era=all`
- `availability=all`
- `significance=all`
- `sort=featured`

## Sorting Rules

### Featured
Purpose:
- preserve the authored shelf feeling as the primary browse mode

Behavior:
- playable packs first
- then previews
- preserve authored catalog order as much as possible within those groups

This should feel like the “default shelf” view, not a machine-generated reorder.

### Newest Playable
Purpose:
- help users notice the most recently added playable archive packs

Behavior:
- playable packs first
- newest playable additions first
- previews after playable packs

Important:
- “newest” here means newest archive addition, not newest historical season year
- use a lightweight archive rule based on catalog order / shelf order, not historical chronology

### Era
Purpose:
- let users browse the shelf with clear time-period structure

Behavior:
- sort by era in chronological order
- keep authored order within an era where possible

## Selection Behavior
The archive rail and selected detail panel must stay synchronized.

Rules:
- when filters/sort change, recompute the visible pack list
- if the current selected pack is still visible, preserve it
- if the current selected pack is filtered out, auto-select the first visible pack
- if no packs match, clear the active detail state and show an empty state instead

The detail panel should always reflect a visible selected pack, never a filtered-out pack.

## Empty State
If the current filter combination yields zero packs:
- show a compact empty state in the browser/detail area
- explain that no packs match the current filters
- include a `Clear Filters` action

The empty state should feel like a normal archive affordance, not an error state.

## Visual Direction
This pass should preserve the current premium shelf identity in `historic-seasons.html`.

Design rules:
- controls should visually harmonize with existing chips/pills and panel language
- avoid introducing a heavy utility-toolbar look
- keep the pack cards as the main emotional entry point
- the page should still read as a curated archive, not a data product

## Implementation Boundary
Keep the implementation local to `historic-seasons.html`.

Recommended local helper responsibilities:
- parse filter/sort state from URL
- serialize filter/sort state back to URL
- apply filters to the catalog
- apply sort to the filtered result set
- resolve the current selected pack after state changes
- render the control state and empty state

Do not extract a shared cross-page archive-state library in this pass.

## Data Dependencies
The feature should rely on metadata already present in the catalog/fallback entries:
- `era`
- `availability`
- `significanceTone`
- catalog order

If a small helper normalization layer is needed inside `historic-seasons.html` to map:
- `availability` -> `playable` / `preview`
- `significanceTone` -> `dynasty` / `heritage` / `spotlight` / `modern`

that is acceptable, as long as it stays local and deterministic.

## Verification

### 1. View-model / state regression
Add or extend regression coverage to prove:
- URL params hydrate filter/sort state correctly
- filter combinations produce the expected visible pack set
- invalid params fall back cleanly
- filtering out the selected pack reselects the first visible result

### 2. Render / interaction regression
Prove:
- the chip bar and sort control render
- the empty state appears when nothing matches
- `Clear Filters` restores the default shelf
- the selected detail panel always matches the active visible pack

### 3. Manual browser sanity
Confirm in a browser that:
- `historic-seasons.html` works with and without URL params
- clicking chips updates the shelf immediately
- refreshing preserves the state
- the page still feels premium and curated

## Success Criteria
This pass is successful if:
- users can narrow the pack shelf quickly and predictably
- the archive view is bookmarkable/shareable through URL state
- the selected pack/detail behavior stays coherent under filtering
- the controls feel native to the current archive instead of bolted on
- `historic-seasons.html` becomes easier to browse without expanding scope into archive-wide redesign
