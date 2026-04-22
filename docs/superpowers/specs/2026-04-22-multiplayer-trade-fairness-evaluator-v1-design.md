---
title: "Multiplayer Trade Fairness Evaluator V1 Design"
type: spec
date: 2026-04-22
status: draft
tags:
  - rosterbate
  - multiplayer
  - trades
  - fairness
  - commissioner
  - ux
---

## Summary
Add a first-pass trade fairness evaluator to the multiplayer trade flow in `rosterbate-season.html` so managers and commissioners get a readable advisory signal before deciding on a deal.

This pass is intentionally narrow:
- advisory only
- `1-for-1` trades only
- one overall fairness badge
- `2-4` short reasons
- current value plus light roster context
- inline inside the existing trade desk and commissioner review flow

The goal is to improve trust around trades without turning the product into a rigid auto-veto system.

## Product Goal
The trade desk should help users answer:
- does this deal look reasonably fair right now?
- which side is getting the stronger current return?
- is roster context enough to soften or sharpen the value gap?
- should a commissioner look more closely at this deal?

It should not try to answer:
- who wins this trade three years from now?
- whether a trade must be blocked automatically
- how to fully price package trades or dynasty strategy

This should feel like informed context, not law.

## Scope

### In scope
- evaluate `1-for-1` multiplayer trades only
- show one overall fairness badge
- show `2-4` short reason bullets
- use current player value plus light roster context
- surface the evaluator inline in the trade desk
- surface the same evaluator output in commissioner trade review
- keep the evaluator deterministic and advisory

### Out of scope
- auto-blocking or hard enforcement
- package trades (`2-for-1`, `2-for-2`, etc.)
- dynasty or keeper-heavy future projection
- opponent/schedule-window streaming logic
- simulation-only CPU trade logic
- separate trade analyzer page or modal

## Primary Surface
- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`

This is already where:
- managers compose and inspect trades
- commissioners review pending trade activity

So the evaluator should live where trade decisions already happen instead of adding a parallel tool.

## User Experience

### Trade desk placement
When a user is building or viewing a `1-for-1` offer, show a compact fairness card inline in the existing trade desk flow.

The card should include:
- one fairness badge
- `2-4` short reasons

The evaluator should appear as context near the offer summary, not as a giant new panel that dominates the page.

### Commissioner placement
In the commissioner trade review lane, show the same fairness output for pending `1-for-1` deals.

This gives commissioners:
- a faster first read
- consistent language with what managers see
- better context without creating a different secret scoring system

### Output shape
Use qualitative labels, not exposed decimal scores.

Recommended badge set:
- `Fair`
- `Slight Lean`
- `Uneven`
- `High Risk`

Under the badge, show `2-4` short reasons in plain language.

Example style:
- `Team A gets the stronger current producer`
- `Team B gives up more starter impact than it gains`
- `This deal helps Team B's guard depth`
- `The current value gap remains noticeable`

The UI should stay readable and non-argumentative.

## Evaluation Model

### Core inputs
The evaluator should combine:
- current player value
- starter impact
- light roster context
- depth protection

### Current value
Use the product's existing season-oriented value language wherever possible.

This should represent:
- how useful the player is right now
- not a long-horizon dynasty projection

### Starter impact
Apply a light signal for whether the player materially helps the active lineup rather than only bench depth.

This should help the evaluator distinguish:
- a real lineup piece
- from a more replaceable roster extra

### Light roster context
Use small contextual modifiers for:
- positional need
- positional surplus
- broad lineup usefulness

This should remain intentionally light:
- enough to soften or sharpen a close trade
- not enough to excuse a clearly lopsided value gap

### Depth protection
Apply a small penalty when a team gives up one of very few usable players at a needed slot.

This is meant to catch cases where:
- raw value looks close
- but one side is hollowing out a fragile position group

## Explanation Rules
The explanation layer should translate evaluator output into short natural-language reasons.

Rules:
- maximum `4` bullets
- minimum `2` bullets when an evaluation is shown
- no raw hidden math in the UI
- no fake certainty
- no overlong scouting report language

Reason categories can include:
- current production edge
- starter impact edge
- roster-need fit
- depth risk

## Eligibility Rules
`V1` should only evaluate `1-for-1` trades.

If a deal is not `1-for-1`:
- do not fake a badge
- do not produce misleading reasons
- instead show a simple unsupported-state message such as:
  - `Fairness insights are available for 1-for-1 deals first.`

This keeps the feature honest while leaving a clear path for `v2`.

## Implementation Boundary
Keep the feature local to `rosterbate-season.html`.

Recommended local responsibilities:
- evaluate a `1-for-1` trade
- convert the result into a badge + reasons payload
- render that payload in the trade desk
- render the same payload in commissioner review

Do not extract a new shared valuation framework or new standalone trade-analysis module in this pass.

## Safety and Product Guardrails
This evaluator must remain advisory.

That means:
- managers can still send a deal even if it rates poorly
- commissioners still make the final human call
- the system should guide, not govern

The product tone should be:
- informative
- calm
- readable

Not:
- punitive
- absolute
- pseudo-scientific

## Verification

### 1. Evaluator regression
Add focused coverage to prove:
- near-equal value `1-for-1` trades can rate `Fair`
- clearly lopsided current value trades rate `Uneven` or `High Risk`
- light roster context can change a borderline case
- the evaluator stays deterministic

### 2. Render / wiring regression
Prove:
- the fairness card appears in the trade desk for `1-for-1` offers
- the same output appears in commissioner review
- non-`1-for-1` offers do not pretend to have a fairness result

### 3. Manual product sanity
Confirm in the live trade desk that:
- the badge reads naturally
- the reasons are short and legible
- the feature feels advisory instead of authoritarian
- commissioner review becomes easier to scan

## Success Criteria
This pass is successful if:
- managers get a usable fairness signal before sending a deal
- commissioners get better context when reviewing trades
- the evaluator explains itself with short human-readable reasons
- the feature improves trust without trying to fully automate trade policing
- the system stays narrow and honest by limiting `v1` to `1-for-1` trades
