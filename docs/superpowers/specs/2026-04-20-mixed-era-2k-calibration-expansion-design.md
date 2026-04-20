---
created: 2026-04-20
title: Mixed-Era 2K Calibration Expansion Design
---

# Mixed-Era 2K Calibration Expansion Design

## Goal

Expand the flagship `1996-2016-top300` audit-only 2K calibration dataset from a small headline-player sample into a broader curated cross-section that can support the next mixed-era normalization decision with better evidence.

## Why This Exists

The first calibration pass proved the audit surface works, but the current dataset is too small to guide the next retune confidently.

Right now the calibration file covers only `11` players, while the remaining board trust problem lives mostly in:

- `11-25`
- `26-50`
- `51-100`

That means the current calibration signal is useful, but still too sparse and too top-heavy to tell whether the remaining disagreement is:

- a broad board-shape problem
- a few specific outliers
- or acceptable stylistic difference

## Scope

This pass is intentionally narrow.

In scope:

- expand the existing `1996-2016-top300` calibration file
- keep the audit system and live ranking behavior unchanged
- rerun the flagship calibration-assisted audit after expansion
- use the stronger calibration coverage to decide the next board-only retune

Out of scope:

- changing `mixedEraOverall`
- changing sim gameplay
- adding a second mixed-era board
- building a generalized calibration framework for all boards
- scraping external sites live at runtime

## Product Behavior

This remains an audit-only calibration system.

The expanded dataset should make the existing calibration summary in [mixed-era-audit.html](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/mixed-era-audit.html:1) meaningfully more useful, but it should not:

- reorder the board
- alter draft behavior
- alter sim behavior
- automatically resolve disagreements

The output is still diagnostic, not authoritative.

## Expansion Target

The recommended target size for the expanded dataset is `44` calibrated players total.

That means:

- keep the current `11`
- add about `33` more curated entries

The point is not to approximate the entire `top100`. The point is to cover enough of the premium board to support the next flagship normalization judgment.

## Sampling Strategy

Use a stratified sample across the live `top100`, not a star-only expansion.

Recommended rank-band split:

- `1-10`: `8` players
- `11-25`: `12` players
- `26-50`: `12` players
- `51-100`: `12` players

Recommended era balance:

- target roughly `22` from `1995-96`
- target roughly `22` from `2015-16`
- allow a small `+/- 2` flex if needed for better archetype coverage

This strategy fits the actual remaining trust problem better than a top-30-only dataset.

## Archetype Coverage

The expanded calibration set should intentionally cover multiple player shapes.

Recommended coverage mix:

- `8-10` primary creators / lead guards
- `10-12` scoring wings / all-around stars
- `8-10` interior stars / anchor bigs
- `6-8` defense-first or rebounding-heavy specialists
- `6-8` spacing or connective bigs / hybrid forwards
- `4-6` secondary guards or complementary scorers

This matters because the current board trust issue is not just about era balance. It is also about whether certain profile types are over-ported or under-ported into the mixed-era board.

## Player Selection Structure

The expansion pass should use three selection buckets.

### 1. Must-Calibrate Anchors

These are the names most likely to shape the flagship board verdict directly.

This bucket includes the current headline set and similar board-defining stars such as:

- `Michael Jordan`
- `LeBron James`
- `Stephen Curry`
- `Hakeem Olajuwon`
- `Kawhi Leonard`
- `Scottie Pippen`
- `Gary Payton`
- `Shawn Kemp`
- `Draymond Green`
- `Klay Thompson`
- `David Robinson`
- `Shaquille O'Neal`
- `Charles Barkley`
- `Kevin Durant`
- `James Harden`
- `Russell Westbrook`
- `Anthony Davis`
- `Chris Paul`

### 2. Pressure-Test Names

These are the players living in the exact bands where the board still feels most arguable.

Examples include:

- `Grant Hill`
- `Jason Kidd`
- `Anfernee Hardaway`
- `Damian Lillard`
- `Paul George`
- `Kyle Lowry`
- `Pau Gasol`
- `Andre Drummond`
- `Karl-Anthony Towns`
- `Jimmy Butler`
- `Giannis Antetokounmpo`
- `Isaiah Thomas`

### 3. Archetype Stress-Test Names

These are the players used to test whether the board is systematically too favorable or too harsh to certain shapes.

Examples:

- older-era interior / defense cluster:
  - `Dikembe Mutombo`
  - `Alonzo Mourning`
  - `Anthony Mason`
  - `Vlade Divac`
  - `Horace Grant`
  - `Clifford Robinson`
- older-era perimeter / scoring / hybrid names:
  - `Mitch Richmond`
  - `Glen Rice`
  - `Reggie Miller`
  - `Detlef Schrempf`
  - `Mookie Blaylock`
- modern-era hybrid / spacing / complementary names:
  - `Marc Gasol`
  - `Al Horford`
  - `Kevin Love`
  - `CJ McCollum`
  - `Gordon Hayward`
  - `Chris Bosh`

The final `44` should be picked from these buckets with a slight bias toward players ranked `11-50`, since that is where the current board still feels least settled.

## Authoring Standard

Keep the data-entry standard light but consistent.

Each added player entry should include:

- `name`
- `historicalPackId`
- `2kOverall`
- `inside`
- `outside`
- `athleticism`
- `playmaking`
- `defense`
- `rebounding`
- optional short `notes` when helpful

Do not require:

- full 2K sub-rating breakdown
- badges
- tendencies
- exhaustive provenance per player

The calibration file should stay authorable and maintainable.

## Quality Rules

Use two simple authoring rules:

1. if the player's exact season/version match is unclear, skip them rather than guess
2. if the board includes duplicate identity rows caused by source text differences, calibrate only one canonical identity unless the source data itself is fixed later

This matters for cases like duplicate encoded names, where adding two calibration rows for the same real player would distort the audit signal.

## Workflow

The intended workflow is:

1. expand [1996-2016-top300.2k.json](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/historical-packs/mixed-era/audit-calibration/1996-2016-top300.2k.json:1) from `11` entries to about `44`
2. rerun [mixed-era-audit.html](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/mixed-era-audit.html:1) for `1996-2016-top300`
3. inspect the new calibration summary and player deltas
4. write a fresh calibration-assisted flagship audit notebook
5. only then decide the next normalization retune

This should be treated as a calibration-expansion-and-reaudit project, not as a retune project.

## Success Criteria

This pass is successful if:

- the calibration file grows to a meaningful premium-tier cross-section
- the calibration summary is no longer dominated by a tiny handful of top stars
- the audit can now say something useful about the board's `11-25`, `26-50`, and `51-100` trust bands
- the next normalization decision can be made using a broader and better-balanced calibration signal

## Files Likely To Change

- [1996-2016-top300.2k.json](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/historical-packs/mixed-era/audit-calibration/1996-2016-top300.2k.json:1)
- one or more `tools/` calibration regressions only if the expanded data motivates stronger assertions
- a new vault audit note after the rerun

## Recommended Next Step After This Spec

Write an implementation plan for the calibration expansion pass, then execute it by:

- authoring the additional calibrated players
- rerunning the audit
- recording the updated flagship verdict

