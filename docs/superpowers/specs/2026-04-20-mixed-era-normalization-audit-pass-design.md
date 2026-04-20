# Mixed-Era Normalization Audit Pass Design

Date: 2026-04-20

## Goal
Define a repeatable normalization audit pass for authored mixed-era boards so RosterBate can evaluate whether a crossover board is trustworthy enough to keep as-is, tune further, or demote.

The first board this process will be run against is:
- `1996-2016-top300`

But the design is intentionally reusable for future mixed-era configs.

## Why This Exists
The top300 mixed-era board is now playable and merged, but functionality alone is not the real standard.

The real product question is:
- does the board feel fair
- does it respect both eras
- does it stay believable across the whole draft

Mixed-era trust is the next major quality problem after implementation.

That means RosterBate needs:
- a durable evaluation method
- not one-off gut-feel tuning
- not a giant analytics system
- not player-facing debug UI

## Scope

### In scope
- a repeatable evaluation workflow for authored mixed-era boards
- explicit board slices to inspect
- pass / tune / fail thresholds
- a structured output format for audit results
- first-run compatibility with the existing `mixed-era-audit.html` surface

### Out of scope
- implementing new normalization math
- changing the ranking pipeline in this spec
- player-facing trust UI
- multi-sport mixed-era rules
- automated tuning recommendations

## Product Role
The normalization audit pass is an internal product-quality workflow.

It should be:
- small
- repeatable
- understandable
- reusable across mixed-era boards

It should not be:
- a public-facing feature
- a giant dashboard initiative
- a one-off notebook just for `1996-2016-top300`

## Core Audit Structure
Each authored mixed-era board is reviewed using five audit blocks.

### 1. Composition Check
Review source-era split at:
- `top 10`
- `top 25`
- `top 50`
- `top 100`
- full pool

Purpose:
- catch obvious over-dominance at the top
- catch mid-board drift
- confirm the full board still reflects the authored pool shape

### 2. Star Fairness Check
Review a fixed short set of cross-era headline comparisons.

For `1996-2016-top300`, example comparisons include:
- Jordan vs Curry
- Robinson vs modern top bigs
- Hakeem vs modern elite centers
- Pippen vs LeBron / Kawhi tier neighbors

Purpose:
- make sure the top of the board feels believable, not just numerically balanced

This is not about forcing exact rankings.
It is about making sure headline stars land in defensible tiers.

### 3. Tier Integrity Check
Review rank neighborhoods rather than only isolated stars.

Inspect:
- ranks `1-10`
- `11-25`
- `26-50`
- `51-100`
- `101-150`

Purpose:
- prevent one era from quietly owning whole draft zones
- catch structural drift even when the very top looks acceptable

### 4. Raw vs Normalized Sanity Check
Compare:
- `mixedEraOverall`
- projected `fp`
- raw fantasy points per game

Purpose:
- catch over-correction
- catch under-correction
- make sure normalization changes feel directional rather than bizarre

### 5. Draft-Feel Check
Do one short human review of the live draft board.

Questions:
- do the first rounds feel exciting and defensible
- do older-era stars still feel respected
- do modern players still feel viable
- are there weird inflated or collapsed names
- are there draft zones that feel empty or strange

Purpose:
- protect the actual fantasy feel, not just the spreadsheet

## Outcome Model
Each board receives one of three outcomes:

### Pass
- board is trustworthy enough to keep as-is
- no major normalization change needed

### Tune
- board is playable and promising
- but one or more board zones need adjustment before it should be treated as stable

### Fail
- board is not trustworthy enough to serve as a flagship mixed-era experience yet

## Thresholds
The first version of the audit pass should use simple explicit thresholds.

### Composition thresholds

#### Top 10
- `Fail` if one era leads by `4+`
- `Tune` if one era leads by `3`
- otherwise `Pass`

#### Top 25
- `Fail` if one era holds `70%+`
- `Tune` if one era holds `64%+`
- otherwise `Pass`

#### Top 50
- `Fail` if one era holds `66%+`
- `Tune` if one era holds `60%+`
- otherwise `Pass`

#### Top 100
- `Fail` if one era holds `62%+`
- `Tune` if one era holds `58%+`
- otherwise `Pass`

#### Full pool
- should match authored composition exactly unless there is a loading or filtering bug

### Star fairness thresholds
- `Fail` if multiple headline stars from one era feel clearly misplaced by tier, not just by one or two slots
- `Tune` if one or two headline comparisons feel arguable but still defensible
- `Pass` if the top-star conversation feels believable overall

### Tier integrity thresholds
- `Fail` if an entire rank band is visibly captured by one era without clear reason
- `Tune` if a rank band leans noticeably one way but still feels plausible
- `Pass` if each band has believable cross-era representation

### Raw vs normalized sanity thresholds
- `Fail` if normalized rank repeatedly contradicts raw production context in ways that feel impossible
- `Tune` if there are a handful of suspicious over-corrections or under-corrections
- `Pass` if normalization shifts feel directional rather than absurd

### Draft-feel thresholds
- `Fail` if a human reviewer would hesitate to draft from the board because it feels wrong
- `Tune` if the board is fun but has a few obvious "why is he here?" names
- `Pass` if the board feels exciting and credible for a real draft

## Overall Decision Rule
Use these aggregation rules:

- any `Fail` in composition or star fairness should usually make the board overall `Fail`
- mostly `Tune` results should make the board overall `Tune`
- only minor notes across the five blocks should make the board overall `Pass`

This keeps the top of the board appropriately high-stakes.

## Audit Output Format
Each audit run should produce one short structured note.

Required fields:
- board id
- audit date
- authored composition
- composition results for `top 10`, `top 25`, `top 50`, `top 100`, full pool
- headline star comparison notes
- tier integrity notes by rank band
- raw vs normalized sanity notes
- draft-feel verdict
- final outcome:
  - `Pass`
  - `Tune`
  - `Fail`
- next action:
  - `keep as-is`
  - `retune normalization`
  - `adjust authored pool`
  - `demote from primary board`

## Workflow
The first version should stay lightweight.

Recommended workflow:
1. open `mixed-era-audit.html`
2. review the target board
3. fill out the audit note using the repeatable checklist
4. decide `Pass / Tune / Fail`
5. only then decide whether to touch normalization code or authored content

## Storage Recommendation
For the first version, store audit results as human-readable vault notes.

Recommended shape:
- a vault note template for each board audit run

Optional future step:
- a code-side audit summary helper

But that is not required for the first version.

## First Intended Use
The first official use of this audit pass should be:
- run the repeatable normalization audit against `1996-2016-top300`
- produce the first flagship mixed-era board verdict
- then choose the next work item:
  - tune normalization
  - adjust authored pool shape
  - or begin the next mixed-era board

## Success Criteria
- the audit pass is clear enough to run repeatedly
- the thresholds are concrete enough to support real decisions
- the process is lightweight enough to use before every mixed-era expansion
- the first `1996-2016-top300` audit can be completed without inventing a new methodology from scratch
