# Mixed-Era Config, Universe Details, And Audit Design

Date: 2026-04-19

## Goal
Replace the current hardcoded mixed-era prototype with an authored config-driven system under `historical-packs/mixed-era/`, improve saved-universe details for mixed-era runs, add a localhost-first normalization audit view, and verify the full `Mixed Era Draft -> Season -> Start Sim Season -> Run Sim Day -> resume universe` loop.

## Product Direction
This work follows the current RosterBate historical pivot:

- `Draft The Era` is the hero lane.
- mixed-era universes are curated archive content, not hidden dev-only routes
- historical packs remain the factual source pools
- crossover boards are built dynamically from authored definitions plus source-pack-aware normalization
- trust depends on transparent era composition and auditable top-board balance

## Scope

### In scope
- authored mixed-era config files
- a discovery index for those config files
- archive loading that can surface multiple mixed-era entries without JS edits
- config-driven mixed-era draft construction using `sourcePackIds + topPlayersPerPack`
- clearer mixed-era explanation in saved universe details
- a localhost-first mixed-era normalization audit page
- manual verification of the full mixed-era draft to sim to resume loop

### Out of scope
- new inclusion rules beyond `topPlayersPerPack`
- full synthetic mixed-era pack generation
- player-facing audit UI on archive or universe pages
- multi-sport mixed-era support
- commissioner or multiplayer mixed-era changes

## Current Problems
The current implementation works as a first prototype, but it has four structural limitations:

1. Mixed-era pool construction is primarily hardcoded in `rosterbate-draft.html` through `DEFAULT_MIXED_ERA_DRAFT_PACK_IDS` and `MIXED_ERA_TOP_PLAYERS_PER_PACK`.
2. Archive presentation for mixed-era content is mostly wired around a single fallback card rather than a reusable authoring system.
3. `historic-universe.html` does not yet explain source-era composition clearly enough for saved crossover universes.
4. There is no dedicated audit surface for top-board balance, which makes normalization tuning harder and less trustworthy.

## Architecture
The recommended architecture is lightweight authored content plus runtime assembly:

- mixed-era definitions live in `historical-packs/mixed-era/*.json`
- a small `historical-packs/mixed-era/index.json` discovery file lists available entries and their display order
- the app loads those definitions and dynamically builds archive entries
- the draft path resolves one mixed-era config, loads its source packs, and builds the crossover board at runtime
- saved universes preserve enough mixed-era snapshot metadata so downstream pages can explain the crossover universe without recomputing everything
- a localhost-first audit page uses the same board-building logic as the draft path so audit output stays aligned with the real product board

This keeps mixed-era content authorable and reusable without duplicating player data into generated synthetic packs.

## Content Model

### Folder structure
- `historical-packs/mixed-era/index.json`
- `historical-packs/mixed-era/<config-id>.json`

### Discovery index
`index.json` should contain an ordered list of config filenames or ids. The archive uses this index as the source of truth for which mixed-era entries exist and in what order they should appear.

Suggested shape:

```json
{
  "entries": [
    {
      "id": "1996-2016-top100",
      "file": "1996-2016-top100.json"
    }
  ]
}
```

### Mixed-era config schema
Each config file should be a lightweight authored definition, not a materialized pack.

Required fields:
- `packId`
- `sport`
- `seasonLabel`
- `shortLabel`
- `era`
- `sourcePackIds`
- `topPlayersPerPack`
- `availability`
- `statusLabel`
- `significanceLabel`
- `significanceTone`
- `completenessLabel`
- `completenessPercent`
- `tagline`
- `summary`
- `whyItMatters`
- `plannedModes`
- `draftUrl`

Recommended fields:
- `focusTeamName`
- `previewStars`
- `syntheticType`
- `startingSlotCount`
- `auditLabel`
- `art`

Suggested shape:

```json
{
  "packId": "mixed_era_1996_2016_top100_v1",
  "sport": "nba",
  "seasonLabel": "1995-96 + 2015-16 Mixed Era Draft",
  "shortLabel": "95-96 x 15-16",
  "era": "Mixed Era",
  "availability": "playable",
  "statusLabel": "Localhost Lab",
  "significanceLabel": "Time Collision",
  "significanceTone": "spotlight",
  "completenessLabel": "Curated crossover pool",
  "completenessPercent": 74,
  "tagline": "Draft Jordan, Steph, LeBron, Hakeem, Shaq, KD, and Kawhi into one crossover board.",
  "summary": "A curated mixed-era draft pool built from the top players in 1995-96 and 2015-16, ranked with era-normalized mixed-era ratings and designed for custom-team universes first.",
  "whyItMatters": "This is the clearest expression of RosterBate's fantasy promise: not replaying a real roster intact, but drafting across eras to build a universe nobody has seen before.",
  "focusTeamName": "Drafted Universe",
  "sourcePackIds": [
    "nba_1996_full_season_v1",
    "nba_2016_full_season_v1"
  ],
  "topPlayersPerPack": 50,
  "plannedModes": [
    "Draft The Era",
    "Sim Season (After Draft)",
    "Mixed-Era Universes"
  ],
  "previewStars": [
    "Michael Jordan",
    "Stephen Curry",
    "LeBron James"
  ],
  "syntheticType": "mixed_era",
  "startingSlotCount": 10,
  "auditLabel": "1995-96 vs 2015-16 Top 50 Audit",
  "art": {
    "theme": "spotlight",
    "eyebrow": "Mixed Era Lab",
    "headline": "1995-96 x 2015-16",
    "subline": "A curated time-collision board where two full fantasy eras meet."
  }
}
```

## Runtime Responsibilities

### `historic-seasons.html`
Responsibilities:
- load the mixed-era discovery index
- load each mixed-era config listed in the index
- map each config into the same archive-card shape used by the mixed-era prototype
- merge those entries into the historical archive data
- keep the current hardcoded mixed-era fallback as a safety net only when config loading fails

Behavior:
- adding a new config file plus a new `index.json` entry should create a new archive card without JS changes
- mixed-era entries remain draft-first and sim-after-draft in copy and CTA behavior

### `rosterbate-draft.html`
Responsibilities:
- stop using hardcoded pack ids and top-player counts as the primary mixed-era source of truth
- resolve the selected mixed-era config
- load the config's `sourcePackIds`
- build the crossover board using `topPlayersPerPack`
- preserve source-pack-aware player metadata for draft handoff and simulation
- persist a lightweight mixed-era config snapshot into draft/season state

Behavior:
- board composition comes from config-driven source packs
- each source pack contributes its top `N` players by the existing mixed-era rating sort
- combined board order still sorts across the full merged pool by mixed-era overall and secondary fallbacks

### `historic-universe.html`
Responsibilities:
- detect when a saved universe is mixed-era
- read preserved mixed-era snapshot data when available
- fall back to `historicalSourcePackIds` and known config data if the snapshot is partial
- explain source composition and curation rules in user-friendly language

Behavior:
- page should remain a product-facing archive detail surface, not a debug panel
- mixed-era explanation should improve trust without overwhelming the page

### `mixed-era-audit.html`
Responsibilities:
- serve as a localhost-first tuning and trust page
- load the same discovery index and config files as the archive
- resolve one mixed-era config at a time
- build the same crossover board using the same runtime logic as the draft path
- render compact balance and board diagnostics for review

Behavior:
- the audit view must not implement a different ranking pipeline
- if the audit and draft diverge, the design is wrong; they should share the same builder helpers

## Saved State Model
Mixed-era universes should preserve enough information to stay legible after the draft handoff and after later resume.

Recommended saved-state additions:
- `historicalSourcePackIds`
- `mixedEraConfig`
- `mixedEraConfigId`
- `mixedEraTopPlayersPerPack`
- `mixedEraSourceSeasonLabels`

Suggested snapshot shape:

```json
{
  "mixedEraConfigId": "1996-2016-top100",
  "mixedEraTopPlayersPerPack": 50,
  "mixedEraSourceSeasonLabels": [
    "1995-96 NBA Historic Season",
    "2015-16 NBA Historic Season"
  ],
  "mixedEraConfig": {
    "packId": "mixed_era_1996_2016_top100_v1",
    "seasonLabel": "1995-96 + 2015-16 Mixed Era Draft",
    "shortLabel": "95-96 x 15-16",
    "sourcePackIds": [
      "nba_1996_full_season_v1",
      "nba_2016_full_season_v1"
    ],
    "topPlayersPerPack": 50,
    "summary": "A curated mixed-era draft pool built from the top players in 1995-96 and 2015-16.",
    "whyItMatters": "Draft across eras and carry that custom universe into season and sim."
  }
}
```

The full config does not need to be preserved verbatim. A trimmed snapshot is enough so long as downstream pages can explain:
- what this universe is
- which source eras it uses
- what the curation rule was

## Universe Details UX
When `historic-universe.html` detects a mixed-era universe, it should render a mixed-era context block within the existing hero and pack-context structure.

### Required details
- a short explainer such as `Curated crossover universe built from 1995-96 and 2015-16`
- source-era pills using season labels rather than raw pack ids
- pool rule summary such as `Top 50 players from each era`
- existing archive framing and significance styling

### Trust note
When snapshot data exists, add a short trust line such as:

`Era-normalized crossover board built from real historical source packs for draft and sim continuity.`

### Placement
This should extend the current `packContextCopy` and `packContextList` patterns rather than create a separate debug section. The page should still feel like a saved-universe artifact page first.

## Audit UX
The audit page should be intentionally compact and developer-facing.

### Required controls
- config picker for available mixed-era boards
- reload button or auto-load on selection

### Required summary elements
- config label
- source packs
- `topPlayersPerPack`
- pool size
- top-10 source composition
- top-25 source composition
- full-pool source composition

### Required table columns
- rank
- player
- source era
- mixed-era overall
- projected FP
- raw FP
- games played

### Recommended balance indicators
- average mixed-era overall by source pack for top 10
- average mixed-era overall by source pack for top 25
- a lightweight warning when one source pack heavily dominates the top 10

### Explicit non-goals
- not a production product page
- not a full analytics dashboard
- not a replacement for manual draft feel checks

## Error Handling

### Discovery and config loading
- if `historical-packs/mixed-era/index.json` fails to load, keep the current hardcoded mixed-era archive fallback available
- if one config file fails to load or parse, skip that entry and log a clear console warning
- archive rendering must continue when one bad config exists

### Source pack loading
- if a config references a missing source pack, the draft and audit surfaces should show a direct status message naming the missing pack
- do not silently build a partial board from only some source packs unless that behavior is later explicitly designed

### Saved-universe rendering
- if a saved mixed-era universe only has partial config snapshot data, `historic-universe.html` should still render using `historicalSourcePackIds` and fallback catalog/config lookups
- missing optional copy should degrade to plain but truthful defaults

## File Plan
Expected file changes:

- Create: `historical-packs/mixed-era/index.json`
- Create: `historical-packs/mixed-era/1996-2016-top100.json`
- Create: `mixed-era-audit.html`
- Modify: `historic-seasons.html`
- Modify: `rosterbate-draft.html`
- Modify: `historic-universe.html`
- Modify: `historical-universe-slots.js`

Shared-helper rule:
- if implementing `mixed-era-audit.html` would otherwise duplicate the real board-building pipeline from `rosterbate-draft.html`, extract one shared browser-side helper for mixed-era config loading and board assembly
- if that helper is introduced, both the draft path and the audit path must use it as the single board-construction path
- do not create a second independent ranking pipeline for audit-only use

## Manual Verification Plan
This feature requires a real browser acceptance pass, not just code inspection.

### Config-driven authoring
1. Add the initial mixed-era config file and discovery index entry.
2. Confirm the archive shows the mixed-era entry from authored config, not only fallback data.
3. Confirm a second config can be added through files plus index without changing JS.

### Draft path
1. Open the mixed-era archive card.
2. Launch `Draft The Era`.
3. Confirm the board is built from the configured `sourcePackIds`.
4. Confirm each source pack contributes the configured top `N`.
5. Confirm drafted players preserve `historicalSourcePackIds`, mixed-era overall, and mixed-era context.

### Saved universe details
1. Complete a mixed-era draft.
2. Confirm a saved universe slot is created.
3. Open `historic-universe.html`.
4. Confirm the page explains source eras and curation rule clearly.

### Simulation path
1. Continue from the drafted universe into season.
2. Trigger `Start Sim Season`.
3. Run one sim day.
4. Open the sim report.
5. Leave the season.
6. Reopen the saved universe and resume.
7. Confirm identity and mixed-era explanation remain intact after resume.

### Audit path
1. Open `mixed-era-audit.html`.
2. Select the same mixed-era config used in the draft.
3. Confirm the audit top board matches the draft board ordering and source composition.
4. Confirm source-pack balance summaries render correctly.

## Acceptance Criteria
This design is successful when all of the following are true:

- mixed-era archive entries come from authored config files under `historical-packs/mixed-era/`
- new mixed-era entries can be added by adding a config file plus an `index.json` entry, with no JS changes
- the mixed-era draft path uses config-driven source packs and `topPlayersPerPack`
- saved mixed-era universes explain source eras and curation rule clearly in `historic-universe.html`
- the audit page uses the same board construction logic as the draft path
- the full `Mixed Era Draft -> Season -> Start Sim Season -> Run Sim Day -> resume universe` loop works

## Risks And Mitigations

### Risk: board logic duplication
If draft and audit use different code paths, trust will drift quickly.

Mitigation:
- reuse existing draft builder logic directly where possible
- if reuse inside existing files becomes too brittle, move board construction into one shared helper and use that helper from both surfaces

### Risk: malformed config files break archive loading
Mitigation:
- per-config failure isolation
- fallback mixed-era card remains available
- console warnings include the failing config id or filename

### Risk: saved-universe pages depend too heavily on full config re-resolution
Mitigation:
- persist a trimmed config snapshot into saved universe state
- fall back to source pack ids and catalog info when needed

### Risk: audit view becomes too broad
Mitigation:
- keep it localhost-first
- focus on board composition and rating balance only
- avoid building a generalized analytics system in this pass

## Recommendation Summary
Implement mixed-era as config-driven authored content under `historical-packs/mixed-era/`, backed by a small discovery index. Use those definitions to drive archive presentation, draft pool construction, saved-universe explanation, and a localhost-first normalization audit page. Preserve real source packs as the factual data layer, keep crossover logic runtime-built and source-aware, and verify the full mixed-era draft-to-sim loop manually.
