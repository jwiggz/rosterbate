# Simulation Accuracy Handoff - 2026-04-28

## Current Goal

Continue tuning the local-league simulation experience, with emphasis on:

- NBA should feel like modern ESPN points
- Outcomes should be more skill-driven
- Truly elite NBA stars should be able to carry hard
- Elite NFL QBs should **not** dominate weekly team output
- Variance preference is **low**

## Important Constraint

Do **not** touch, stage, commit, or push:

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\sim-matchup.html`

That file is a separate untracked prototype feature.

## What Is Already Live

Recent pushed checkpoints include:

- `637aec2` `Harden local league storage fallback`
- `0a4be58` `Harden season handoff storage fallbacks`

The branch also contains earlier local-league shell, naming, archive, and parity work from prior checkpoints.

## Current Local-Only Changes

Tracked local edits:

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-league-engine.js`
- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-league-engine.js`

Untracked local files:

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\simulation-accuracy-audit.js`
- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-accuracy-audit.js`
- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\sim-matchup.html`

Only the first four files above are part of the simulation-accuracy work.

## What Was Fixed In This Accuracy Pass

### 1. NFL zero-total bug

Root cause:

- Real NFL pack players were going through an NBA-style stat derivation path
- That meant real 2014 NFL players with football-shaped stats collapsed to zero fantasy totals

Fix:

- Added an NFL-specific starter simulation path in `simulation-league-engine.js`
- NFL starters now derive output from their explicit fantasy profile instead of fake basketball baselines

### 2. NBA fantasy total inflation

Root cause:

- NBA generated starter output was overshooting sane mixed-era fantasy baselines

Fix:

- Added a modest NBA-only production normalization in `simulation-league-engine.js`
- Underlying fantasy totals now land in a healthier range while preserving low-variance, skill-driven behavior

### 3. NBA visible score inflation

Root cause:

- Rendered NBA scores were mapped from fantasy totals too aggressively, producing unrealistic visible scoreboards

Fix:

- Tightened `convertFantasyTotalToNbaScore(...)`
- Added winner-respecting visible tie-break logic for NBA when rounded displayed scores collide

This preserves ESPN-style fantasy totals underneath while making the visible scoreboard look like real basketball.

## New Audit Harness

Added:

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\simulation-accuracy-audit.js`
- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-accuracy-audit.js`

Purpose:

- Build real auto-drafted NBA and NFL league states from historical packs
- Run repeated simulated league windows
- Measure:
  - team total bands
  - rendered score bands
  - stronger-roster win rate
  - top-star share of team output
  - QB share of NFL team output
  - zero-total rate
  - rendered tie rate

## Current Audit Metrics

Latest direct audit run:

### NBA

- team total mean: `233.5`
- rendered score mean: `112.77`
- strength win rate: `0.67`
- top-star share mean: `0.25`
- zero-team-total rate: `0`
- rendered tie rate: `0`

### NFL

- team total mean: `137.93`
- rendered score mean: `24.72`
- strength win rate: `0.70`
- top-star share mean: `0.20`
- QB share mean: `0.20`
- zero-team-total rate: `0`
- rendered tie rate: `0`

Both sports are currently passing the preference-aware audit.

## Verified Commands

Latest successful verification commands:

```powershell
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-league-engine.js
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-accuracy-audit.js
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\simulation-accuracy-audit.js
git -C "C:\Users\jabro\Desktop\Fantasy Project\rosterbate" diff --check
```

`git diff --check` only reported LF/CRLF warnings, not content problems.

## Suggested Next Priorities

Best next tuning lanes:

1. Superstar carry tuning
   - decide whether `topStarShareMean ~ 0.25` is enough or whether true megastars should carry harder

2. NFL QB share tuning
   - current `qbShareMean ~ 0.20`
   - if desired, flatten QBs a bit more without making weekly output feel random

3. Archetype realism
   - make NBA stars feel more distinct by role
   - make NFL weekly output reflect position personality more clearly

## Suggested Prompt For The Next Chat

Use something close to this:

> We have a local simulation-accuracy pass in progress in `C:\Users\jabro\Desktop\Fantasy Project\rosterbate`. Please read `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\docs\simulation-accuracy-handoff-2026-04-28.md` first and continue from there. Do not touch `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\sim-matchup.html`. The current local accuracy work is in `simulation-league-engine.js`, `tools/test-simulation-league-engine.js`, `tools/simulation-accuracy-audit.js`, and `tools/test-simulation-accuracy-audit.js`. Start by checking git status, re-running the accuracy and engine tests, and then continue tuning superstar carry / realism from the current green audit baseline.

## Suggested Prompt If You Want A More Specific Next Task

> Read `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\docs\simulation-accuracy-handoff-2026-04-28.md`, do not touch `sim-matchup.html`, and continue the simulation-accuracy pass from the current green baseline. Focus next on making elite NBA stars feel a bit more takeover-prone without increasing variance too much, then re-run the audit harness and engine tests.
