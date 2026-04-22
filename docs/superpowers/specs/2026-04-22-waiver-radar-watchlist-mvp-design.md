---
title: "Waiver Radar + Watchlist MVP Design"
type: spec
date: 2026-04-22
status: draft
tags:
  - rosterbate
  - waivers
  - watchlist
  - season-page
  - delayed-data
  - ux
---

## Summary
Turn the existing waiver lane in `rosterbate-season.html` into a real decision tool by strengthening `Waiver Radar` and the per-league watchlist flow.

This pass is intentionally narrow:
- season-page first
- per league / per season universe
- sport-agnostic
- roster-fit first
- recent trend as a light signal
- star / unstar + filtered view only
- one short "why this is here" reason line per radar result

The goal is to help managers identify the best adds for their current roster without building a full player-intelligence platform yet.

## Product Goal
The waiver page should help users answer:
- who are the best waiver adds for my current roster right now?
- which free agents should I keep an eye on?
- why is this player being surfaced above the rest of the pool?
- which recent drops or trending players deserve another look?

It should not try to answer:
- who is the best player globally across all leagues?
- how should I manage a cross-league player portfolio?
- what is the full scouting report on every free agent?
- how should I react to truly live, in-game changes?

This should feel like a sharper season-management surface, not a giant research product.

## Scope

### In scope
- improve the waiver page in `rosterbate-season.html`
- keep the watchlist local to the current season / universe
- rank `Waiver Radar` by roster fit first
- include recent trend as a lighter ranking signal
- keep recent drops and watchlisted players strongly surfaced
- show one short reason line on each radar tile
- preserve simple star / unstar watchlist interactions
- preserve `All Players / Watch List` filtered browsing

### Out of scope
- global watchlist storage
- cross-league watchlists
- notes or tags on watchlist entries
- homepage/profile integration
- backend jobs or new player-summary storage
- sport-specific forks in `v1`

## Primary Surface
- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`

This page already contains the right seams:
- `Waiver Radar`
- `Watch List`
- `Recent Drops`
- free-agent board controls

So `v1` should strengthen an existing user loop instead of inventing a new one.

## User Experience

### Waiver Radar
The existing `Waiver Radar` section should become more opinionated and more useful.

Each radar result should show:
- player name
- team / position
- key stats / fantasy value
- watch star
- add action
- one short reason line

Example reason styles:
- `Fills a thin guard spot`
- `Trending up lately`
- `Recently dropped into free agency`
- `Already on your watch list`

The main UX improvement is:
- radar tiles should read like "best adds for *your* team"
- not just "highest fantasy totals left on the wire"

### Watch List
The watchlist should stay intentionally lightweight:
- star / unstar players
- filtered `Watch List` view
- `Watch List Snapshot` on the waiver page

It should not gain:
- notes
- tags
- cross-league persistence

That keeps the MVP fast, obvious, and easy to trust.

### Recent Drops
`Recent Drops` should remain part of the same waiver lane.

In `v1`, recent drops are not a separate system.
They are a strong surfacing signal that helps the user notice:
- newly available names
- possible value that just hit the wire

## Ranking Model

### Core scoring mix
The radar should rank candidates using:
- current value as the base
- roster need as the strongest modifier
- recent trend as a lighter modifier
- watchlist / recent-drop status as strong surfacing boosts

That means the ranking model should answer:
1. is this player useful for this roster?
2. are they showing enough recent life to move up?
3. are they already flagged by the user or the market?

### Current value
Use the current season-page player-value language already exposed in the waiver flow where possible.

This remains the stable base signal.

### Roster fit
Roster fit should be the most important modifier in `v1`.

Use simple, season-page-local signals such as:
- thin position coverage
- weaker bench depth at a position
- open roster or lineup pressure where relevant
- overfilled positions that should not keep getting boosted

This should stay lightweight and understandable.
It does not need to become a full roster simulation engine.

### Recent trend
Recent trend should be a supporting modifier only.

The right behavior is:
- help break close cases
- never overwhelm obvious roster fit

Use already-exposed box-score style signals where possible:
- recent fantasy output
- visible recent stat contribution
- basic "doing more lately than usual" cues

Do not build a heavyweight trend platform in `v1`.

### Watchlist and recent drops
These should act as strong surfacing boosts, not the main scoring engine.

That means:
- a watched player gets easier visibility
- a recent drop gets easier visibility
- but neither should automatically outrank an obviously better-fit candidate in every case

## Explanation Rules
Each radar tile should show exactly one short explanation line.

That line should reflect the strongest reason the player surfaced:
- roster fit
- recent trend
- recent drop
- watchlist status

Rules:
- one line only
- short plain language
- no hidden math
- no pseudo-precision
- no giant explanation blocks

This keeps the radar interpretable without becoming noisy.

## Data / State Boundary
Keep `v1` inside the current season/universe state model.

That means:
- watchlist remains local to the current league / universe
- no new global player-tracking storage
- no backend refresh dependency for the core MVP

Expected state seams remain:
- current roster
- current waiver pool
- current recent drops
- current watchlist array

This is the right first boundary because it keeps the feature:
- honest
- immediately relevant
- low risk to ship

## Implementation Boundary
This pass should center on the existing waiver helpers in `rosterbate-season.html`, especially:
- `getWatchListIds()`
- `toggleWatchList(pid)`
- `getWaiverRadarCandidates(limit)`
- `getWatchedWaiverTargets(limit)`
- `getRecentDroppedWaiverTargets(limit)`
- `getWaiverRowSignals(player)`
- `renderWaiver()`

This is an upgrade to an existing waiver lane, not a totally new subsystem.

## Product Guardrails
This MVP should remain:
- lightweight
- local
- advisory
- fast to scan

It should not become:
- a black-box recommender
- a global player notebook
- a fake real-time product

The product tone should be:
- practical
- trustworthy
- easy to act on

## Verification

### 1. Focused waiver-radar regression
Add or extend focused regression coverage so it proves:
- watchlist star / unstar still works
- `Watch List` filter still works
- radar ranking now prefers roster fit over best-available-alone
- recent trend can break close cases without dominating
- recent drops and watchlisted players still surface strongly
- each radar result has one short reason line

### 2. Render / wiring regression
Verify `renderWaiver()` still paints:
- upgraded radar tiles
- watchlist snapshot
- recent drops
- filtered list behavior
- correct empty states

### 3. Manual season-page sanity
Open the real season page and confirm:
- the radar feels like "best adds for my roster"
- starring / unstarring still feels obvious
- watch filtering still feels fast
- the page remains clean instead of turning into a research dashboard

## Success Criteria
This pass is successful if:
- the waiver page becomes a stronger decision surface
- the watchlist becomes meaningfully useful, not just decorative
- the radar explains itself with one short reason line
- the feature stays lightweight and believable
- the MVP remains local to the current league / universe without overreaching

## Related
- [C:\Users\jabro\Documents\Vault\wee\wiki\synthesis\delayed-data-player-features-strategy.md](C:/Users/jabro/Documents/Vault/wee/wiki/synthesis/delayed-data-player-features-strategy.md)
- [C:\Users\jabro\Documents\Vault\wee\wiki\synthesis\current-priorities.md](C:/Users/jabro/Documents/Vault/wee/wiki/synthesis/current-priorities.md)
