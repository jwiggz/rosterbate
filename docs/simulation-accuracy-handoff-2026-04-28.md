# Simulation Accuracy Handoff - 2026-04-28

## Reviewer Summary

This branch turns the local-league simulation pass into a tested, auditable baseline for NBA and NFL mixed-era leagues. It fixes NFL real-pack scoring collapse, tunes NBA/NFL output shape, adds role/position personality metrics, adds historical pack sanity checks, and verifies the season shell can persist and restore simulated league progress.

## Reviewer Scope Note

`sim-matchup.html` is now part of the branch. The earlier prototype exclusion no longer applies. Review it with the season integration changes because the live matchup flow now prepares one official result, reveals it theatrically, commits only the selected matchup, and returns to the season shell without advancing the rest of the day.

## Main Changes

### Engine Accuracy

- Fixed NFL starters that previously collapsed to zero because football-shaped player data was routed through NBA stat derivation.
- Tuned NBA fantasy totals and rendered basketball scores into a lower-variance, more believable range.
- Preserved winner-aware score rendering so rounded NBA display scores do not create false ties.
- Made elite NBA players a bit more takeover-prone without materially widening team-total variance.
- Added NBA role personality for scorers, heliocentric creators, interior bigs, wings, and defensive anchors.
- Added NFL position personality so QB/RB/WR/TE output reads more position-authentic while keeping weekly totals stable.

### Audit Harness

- `tools/simulation-accuracy-audit.js` now supports:
  - `--sport nba|nfl|all`
  - `--season`
  - `--packs`
  - `--json`
  - `--summary`
- Default behavior remains machine-readable NBA+NFL accuracy JSON.
- Sport-specific output avoids noisy zero-filled cross-sport metrics.
- Pack sanity checks catch missing names, bad positions, zero fantasy baselines, and implausible pack means.
- Season realism checks cover win spread, top-vs-bottom roster separation, and playoff-rate separation.

### Season UX And Persistence

- Reveal reports use real simulation franchise names instead of generic `Team N` labels.
- My Team last-matchup summaries now handle completed logs that only contain team indexes.
- Matchup navigation now shows selected completed-day scores instead of unrevealed `--` schedule rows.
- Completed matchup action copy follows the selected opponent instead of the next scheduled opponent.
- `sim-matchup.html` now supports a season-launched live reveal for one selected matchup, including a precomputed official result, halftime/final reveal overlays, player fantasy point animation, mobile-safe controls, and writeback to the historical universe slot.
- The season matchup screen now labels partial live results on multi-game days, for example `1 of 2 Day 1 matchups final`, so a selected final does not imply the whole day has advanced.
- Partial-day matchup pages now expose a direct `Finish Day` action, which simulates the remaining slate and keeps the selected live result from duplicating.
- Simulation league reports now regenerate if a cached report was created before the rest of a partial live day finished, so the modal reflects the full completed slate.
- Browser regression verified local league creation, instant draft completion, day/week simulation, reload persistence, archive detail, and archive restore.

## Useful Commands

Live matchup browser regression:

```powershell
npm.cmd run test:live-matchup
```

Human-readable one-sport pass:

```powershell
node tools/simulation-accuracy-audit.js --sport nba --season --packs --summary
```

Machine-readable default pass:

```powershell
node tools/simulation-accuracy-audit.js
```

Focused tests:

```powershell
node tools/test-simulation-league-engine.js
node tools/test-simulation-season-adapter.js
node tools/test-shared-season-shell-simulation.js
node tools/test-simulation-accuracy-audit.js
node tools/test-historical-universe-slot-storage.js
node tools/test-simulation-draft-boot.js
```

Storage fallback checks:

```powershell
node tools/test-draft-season-storage-fallback.js
node tools/test-admin-league-storage-fallback.js
node tools/test-local-league-storage-fallback.js
```

## Latest Audit Snapshot

Latest `node tools/simulation-accuracy-audit.js` run:

### NBA

- team total mean: `234.34`
- rendered score mean: `112.86`
- strength win rate: `0.67`
- top-star share mean: `0.26`
- top scorer point share mean: `0.28`
- assist leader assist share mean: `0.41`
- rebound leader rebound share mean: `0.34`
- zero-team-total rate: `0`
- rendered tie rate: `0`

### NFL

- team total mean: `137.34`
- rendered score mean: `24.66`
- strength win rate: `0.67`
- top-star share mean: `0.20`
- QB share mean: `0.20`
- RB share mean: `0.11`
- WR share mean: `0.11`
- zero-team-total rate: `0`
- rendered tie rate: `0`

Both sports pass the current guardrails.

## Browser Regression Notes

Verified in the local app at `http://localhost:8080`:

- New NBA simulation league boots from setup through instant draft.
- Day 1 simulation advances standings and reveal reports.
- Reload preserves the same universe URL, standings, PF/PA, and next reveal day.
- Simulating through Day 7 rolls into Week 2 / Day 8.
- Archive browser lists the saved universe as `Atlanta Hawks - Week 2 - Day 8`.
- Archive detail shows the saved record, rank, timeline, and recent sim days.
- Continue Universe reopens the same season state.
- Selected matchup live reveal opens from the season matchup page, commits exactly that game even on a multi-game day, preserves the current day, updates standings for the two teams only, and returns to the season page with `LATEST FINAL` visible.
- On a partial live day, the matchup page shows `Finish Day`, mobile layout stays within a 390px viewport, the remaining slate simulates without duplicating the live game, and the league report regenerates to include the full finished slate.
- No browser console warnings/errors appeared during the pass.

## PR Readiness Baseline

Latest local-only broad pass:

```powershell
npm.cmd run test:live-matchup
node tools/test-simulation-league-engine.js
node tools/test-simulation-season-adapter.js
node tools/test-simulation-season-page.js
node tools/test-shared-season-shell-simulation.js
node tools/test-historic-seasons-archive-browser.js
node tools/test-simulation-accuracy-audit.js
node tools/test-historical-universe-slot-storage.js
node tools/test-simulation-draft-boot.js
node tools/test-draft-season-storage-fallback.js
node tools/test-admin-league-storage-fallback.js
node tools/test-local-league-storage-fallback.js
node tools/simulation-accuracy-audit.js --sport nba --season --packs --summary
node tools/simulation-accuracy-audit.js --sport nfl --season --packs --summary
git diff --check
```

All commands passed locally. `git diff --check` only reported normal Windows CRLF warnings.

## Known Local Files Outside The PR

The worktree may contain untracked local files generated during validation:

- `.server-8080.err.log`
- `.server-8080.log`

They are intentionally not part of this PR. `sim-matchup.html` is tracked and should be reviewed.
