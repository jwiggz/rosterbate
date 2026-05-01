# Shared Trade Modal Internals - 2026-05-01

## Goal
Keep the local drafted-league trade modal and the simulation-backed trade modal on one package model so fixes land once. The immediate target is internal shared helpers, not a full visual rewrite.

## Current Split
- Local trade flow stores selections in `trP.give` and `trP.get`, resolves players from `G.rosters`, sends pending offers, and lets CPU teams respond.
- Simulation/shared flow reads checked modal inputs, resolves players through adapter view models, applies trades directly through `SEASON_MODE_ADAPTER.applyTrade`, and persists the simulation state.
- Both flows now support the same user concept: select up to 5 players per side, show side totals, explain replacement value for uneven packages, block unfair packages, and preserve string-keyed player IDs.

## Shared Helper Boundary
Create small pure helpers in `rosterbate-season.html` near the existing trade fairness helpers:
- `normalizeTradePackageIds(ids)` preserves stable string IDs, removes blanks, and deduplicates by string key.
- `resolveTradePackagePlayers(ids, roster)` resolves selected IDs against a roster using string-key matching.
- `getTradePackageSideValue(players, valueFn)` totals a side with the correct fantasy-value reader.
- `buildTradePackagePreviewModel({ outgoingIds, incomingIds, outgoingRoster, incomingRoster, valueFn, replacementRead })` returns counts, players, totals, net value, over-limit state, and replacement/drop context.

## Non-Goals
- Do not move modal markup into a separate component yet.
- Do not change trade fairness thresholds.
- Do not change simulation adapter trade persistence.
- Do not stage portrait assets as part of this slice.

## Test Plan
- Extend `tools/test-shared-season-shell-simulation.js` to cover the helper contracts directly.
- Keep the existing local and simulation modal tests passing through the helper-backed paths.
- Browser QA one real drafted league trade application, reload the league URL, and confirm the acquired/sent players persist in the roster and Trade Desk feedback.
