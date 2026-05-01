# Trade Builder Modal V1 Design

## Goal

Make the Trade Desk support real package trades without making the main desk feel crowded. The current team cards are useful for browsing partners, but they are too tight for multi-player selection, waiver replacement math, and fairness explanation. V1 moves detailed trade construction into a focused modal opened from a partner card.

## Scope

This design covers simulation/local-league Trade Desk package building for one controlled user team against one selected partner team. It should support balanced and uneven packages up to 5 players per side. It does not add multiplayer negotiation, async sent offers, draft picks, salary cap logic, or trade vetoes.

## User Flow

1. User opens Trade Desk.
2. Partner cards show concise summaries: team record/FP, top asset, roster status, and a `Build Trade` action.
3. User clicks a partner card or `Build Trade`.
4. A modal opens titled `Trade With {Team}`.
5. User selects players in `You Send` and `You Get` columns.
6. The sticky footer updates live with package totals, open roster slots, waiver fill-ins, and a fairness verdict.
7. `Apply Trade` is disabled until both sides have at least one player and no side has more than 5 selected players.
8. Applying the trade updates both rosters, persists the season, shows a clear success message, and returns the user to the Trade Desk.

## UI Structure

The main Trade Desk should stop rendering full inline player selectors for every partner. Each partner card becomes a scannable lane:

- Team identity, record, and revealed FP
- Top asset and best positional strength
- Roster status such as `Board ready`, `Thin at guard`, or `Star-heavy`
- `Build Trade` button

The modal uses the page's current dark control-room style:

- Header: partner name, close button, and `Apply Trade` action near the top-right
- Left column: `You Send`
- Right column: `You Get`
- Each column has a searchable/selectable player list and a selected package rail
- Footer: fairness verdict, package totals, replacement/drop pressure, and secondary `Cancel`

The modal should fit desktop first but remain responsive. On narrow screens, the two columns stack and the footer remains visible.

## Trade Math

Each package computes:

- Raw outgoing FP total
- Raw incoming FP total
- Package size difference
- Open roster slots created by sending more players than received
- Drop pressure created by receiving more players than sent
- Best waiver fill-ins for open roster slots
- Lowest-value likely drops when the user receives extra players

For a `3-for-1`, the model should explain the deal as:

`You get: Player A + 2 waiver fill-ins`

For a `1-for-3`, it should explain:

`You get: Players A/B/C, likely drop: Player D/E`

The fairness verdict uses adjusted package value, not just the selected-player total. This keeps star-for-depth deals honest.

## Validation

The builder should block:

- Empty side trades
- More than 5 players selected on either side
- Duplicate players on both sides
- Trades where selected players cannot be resolved
- Trades that would create impossible roster sizes after drops/replacements

The modal should not silently fail. Invalid states get inline feedback in the footer and the apply button stays disabled.

## Data Flow

The modal should reuse the existing Trade Desk view model and fairness helpers where possible:

- Partner team comes from the Trade Desk partner list.
- User roster and partner roster feed the two selectable lists.
- Existing `evaluateSimulationTradeFairness` and `evaluateOneForOneTradeFairness` should be generalized into package-aware helpers instead of duplicating math in the UI.
- Applying a trade should continue through the same roster mutation and persistence path as current simulation trades.

## Testing

Add focused coverage for:

- Modal opens from a partner card.
- `2-for-1`, `3-for-1`, `1-for-3`, and `5-for-5` previews render adjusted math.
- Apply button stays disabled for invalid selections.
- Applying a package trade updates both rosters and persists after reload.
- Trade Desk still shows partners after reload.

## Non-Goals

- No public offers inbox in V1.
- No CPU acceptance/rejection AI in V1.
- No trade picks or salary/contracts.
- No visual redesign of unrelated pages.

## Open Implementation Notes

Keep the first implementation conservative. The main win is moving package selection out of cramped cards and into a readable modal, then making the fairness read explain waiver fill-ins and drop pressure clearly.
