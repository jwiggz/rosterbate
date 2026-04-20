---
created: 2026-04-20
title: Mixed-Era 2K Calibration Audit Design
---

# Mixed-Era 2K Calibration Audit Design

## Goal

Add an audit-only `2KRatings`-style calibration layer for the flagship `1996-2016-top300` mixed-era board so the mixed-era audit can compare RosterBate’s board against a curated game-balance prior without changing live draft ranking or simulation gameplay.

## Why This Exists

The current mixed-era normalization work has reached diminishing returns when tuned purely from internal heuristics.

We now want a second opinion that:

- distinguishes era-specific player versions
- expresses cross-era portability in a game-balance style
- can help flag suspicious over-ranks and under-ranks
- does not replace historical stats as the foundation

`2KRatings` is promising for this role because it already models classic teams and era-specific player versions, but it should be treated as calibration input, not product truth.

## Scope

This first version is intentionally narrow.

In scope:

- only the flagship `1996-2016-top300` board
- one small authored calibration dataset checked into the repo
- audit-model support for optional external calibration values
- audit-page support for mismatch display and summary
- notebook-driven human review using the new calibration signal

Out of scope:

- changing live mixed-era ranking
- changing `mixedEraOverall`
- changing simulation gameplay
- runtime scraping or live external HTTP dependency
- building a generalized calibration system for all future boards

## Product Behavior

This layer is diagnostic only.

It should answer:

- where does our mixed-era board disagree enough with a curated `2K`-style prior that a human should inspect it?

It should not:

- automatically move players up or down
- override existing mixed-era normalization
- make `2KRatings` the ranking engine

## Data Strategy

Use a checked-in authored JSON calibration file, not live scraping.

Reasons:

- reproducible
- offline-friendly
- localhost-safe
- not fragile to external site changes
- easy to curate manually for the players that matter most

## First Dataset

For the first version, create one calibration file for the flagship board only.

The file should include a selected subset of players from `1996-2016-top300`, likely the top `30-50` most important board-shaping names.

Each entry should support:

- player identity
- source pack / era
- optional `2kOverall`
- optional category buckets:
  - `inside`
  - `outside`
  - `athleticism`
  - `playmaking`
  - `defense`
  - `rebounding`
- optional source notes
- optional capture date / provenance text

## Data Matching

Calibration should attach by stable player identity, not fuzzy display-only matching.

Preferred identity fields:

- player name
- historical pack id
- optional historical team / season identifier if needed

The system should tolerate missing calibration gracefully:

- if a player has no calibration entry, nothing breaks
- the player simply shows no calibration fields

## Audit Model Changes

Extend the mixed-era audit view model so calibrated players can expose:

- current mixed-era rank
- current `mixedEraOverall`
- optional `2kOverall`
- optional calibration category buckets
- rank delta vs calibrated subset
- a mismatch status

Recommended mismatch labels:

- `aligned`
- `review`
- `strong_disagreement`

## Mismatch Logic

The first version should keep mismatch logic simple and human-readable.

Use a small rank-delta / tier-delta based heuristic for the calibrated subset:

- minor difference -> `aligned`
- meaningful difference -> `review`
- large difference -> `strong_disagreement`

The exact thresholds can be lightweight in version one, because the main goal is surfacing review candidates rather than pretending to produce a mathematically final verdict.

## Audit Page Changes

Extend the existing [mixed-era-audit.html](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/mixed-era-audit.html:1) page instead of building a new page.

Add a compact calibration section that includes:

- player-level mismatch columns in the calibrated rows
- a summary of biggest over-ranked players vs the calibration prior
- a summary of biggest under-ranked players vs the calibration prior
- a small calibration status count:
  - how many are aligned
  - how many need review
  - how many show strong disagreement

The UI should stay clearly diagnostic, not authoritative.

## Human Workflow

The intended workflow is:

1. open the mixed-era audit page
2. inspect composition slices
3. inspect calibrated disagreements
4. decide whether the trust issue is:
   - composition-wide
   - specific-player driven
   - acceptable stylistic difference
5. record the result in the audit notebook

## Notebook Use

The official flagship audit notebook should gain calibration-aware notes after this feature lands.

That means future audit writeups can explicitly say things like:

- “board composition improved, but player X still strongly disagrees with the `2K`-style prior”
- “the board and calibration prior broadly align at the top, so remaining disagreement is mostly stylistic”

## Architecture

Keep the implementation small and local:

- one authored calibration JSON file
- one runtime loader / attach step in the mixed-era audit model path
- one audit-page display update
- one regression test for the calibration attach logic

Do not spread calibration logic into draft runtime or season runtime.

## Success Criteria

The first version is successful if:

- the flagship audit page can show curated `2K`-style calibration values for selected players
- mismatch signals are easy to read and explain
- no live board ranking changes occur
- no simulation behavior changes occur
- the next normalization decision can be made with better evidence than internal heuristics alone

## Files Likely To Change

- [mixed-era-runtime.js](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/mixed-era-runtime.js:1)
- [mixed-era-audit.html](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/mixed-era-audit.html:1)
- new authored calibration JSON under a mixed-era audit/data path
- one or more `tools/` regressions for calibration attach behavior
