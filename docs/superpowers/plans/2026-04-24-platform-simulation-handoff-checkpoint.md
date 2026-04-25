# Platform Simulation Handoff Checkpoint

Date: 2026-04-24
Branch: `main`
Head: `3bae3171ea891384f54d3104405bf5f130a3b84c`

## Current Product State

### NBA simulation mode

- Separate mixed-era single-player NBA simulation lane is live.
- Fixed league shell is the `2025-26 NBA`.
- All `30` real NBA franchises are used in their real conferences and divisions.
- Rosters are rebuilt through mixed-era draft pools.
- Setup supports:
  - manual draft entry
  - `Sim Draft and Start Season`
- Shared season shell is live for NBA simulation.
- Regular season flows into:
  - play-in
  - playoffs
  - Finals
  - champion / trophy state
- Archive and universe details preserve postseason/champion state.

### Historical mode cleanup

- `real_season` / `Play The Real Season` was removed as a product lane.
- Historical packs remain as source player pools and stat baselines.
- Historical copy was reframed around:
  - historical seasons
  - draft the era
  - simulation universes

### Historic and setup page polish

- `historic-seasons.html` was cleaned up:
  - removed `Team Spotlights`
  - timeline pane typography was normalized
- `rosterbate-simulation-setup.html` was redesigned to match the archive-style product direction.
- Setup page was tightened to fit better in a laptop viewport, with the source season list as the main internal scroller.
- Homepage historic card now switches correctly by sport.

### NFL simulation mode

- NFL simulation setup exists and is live.
- Fixed shell is the `2014 NFL`.
- Real `32` NFL franchises and real conference/division structure are in place.
- Shared season shell supports NFL weekly sim flow.
- Exact `2014 NFL` postseason format is live:
  - `12-team` playoff field
  - `2` byes per conference
  - Wild Card
  - Divisional
  - Conference Championship
  - Super Bowl
- Archive/details preserve NFL postseason/champion state.

### NFL fantasy-slot roster management

- NFL now uses fantasy-slot management inside the shared shell, matching the NBA shell interaction style.
- Active NFL lineup slots are:
  - `QB`
  - `RB1`
  - `RB2`
  - `WR1`
  - `WR2`
  - `TE`
  - `FLEX`
  - `K`
  - `DST`
- User must field a valid lineup before `Sim Week`.
- The shell exposes `Fix Lineup` behavior and routes correctly to the roster tab.
- CPU NFL teams still auto-build legal weekly lineups.
- Legacy reopened NFL saves now normalize into slot-based state before simming.

## Important Product Direction Already Chosen

- NBA and NFL should feel like the same product shell, not separate apps.
- Sport-specific logic should live under the shared season shell.
- NFL roster management should stay fantasy-slot based, not a full football depth chart.
- User control matters:
  - no silent auto-fix for user NFL lineups
  - user can stockpile positions
  - waivers and trades remain open

## Verified State

At the time this checkpoint was written, `main` includes the latest NFL fantasy-slot roster management work and had already passed:

- `node tools/test-simulation-mode-runtime.js`
- `node tools/test-simulation-mode-management.js`
- `node tools/test-simulation-season-adapter.js`
- `node tools/test-shared-season-shell-simulation.js`
- `node tools/test-simulation-league-engine.js`
- `node tools/test-nfl-shared-season-shell-weekly-sim.js`
- `git diff --check`

## Best Next Direction

The strongest next move is:

### NFL simulation realism and roster intelligence

Why this is next:

- the NFL lane now has the full shell, weekly flow, postseason, and lineup management
- the biggest remaining gap is not structure, it is football feel
- now is the right time to improve how the sim behaves, not add more surface area first

Recommended focus areas:

1. Tune NFL weekly simulation around football-specific contributions
   - QB influence
   - RB/WR/TE balance
   - FLEX value
   - K and DST impact
   - stronger matchup realism

2. Improve lineup recommendations and management quality
   - better suggested starters
   - clearer lineup issue messaging
   - stronger roster response after waivers/trades/injuries/byes

3. Improve CPU football management behavior
   - better auto-lineups
   - smarter waiver priorities
   - more believable roster balancing

After that, the next likely expansion is:

- more NFL historical packs / more eras

## Recommended Next Chat Starter

Use this in the next chat:

`Read C:\\Users\\jabro\\Desktop\\Fantasy Project\\rosterbate\\docs\\superpowers\\plans\\2026-04-24-platform-simulation-handoff-checkpoint.md first. We are on main at 3bae317. I want to work on NFL simulation realism and roster intelligence next, starting with football-specific weekly sim tuning and better lineup recommendations while keeping the shared season shell intact.`

## Shorter Alternate Starter

`Open the platform simulation handoff checkpoint in docs/superpowers/plans. We just shipped NFL fantasy-slot roster management. Next I want to improve NFL sim realism, lineup recommendations, and CPU football roster behavior.`

## Resume Notes

- No open feature branch is required right now.
- Repo should be on `main`.
- The next cycle should begin with brainstorming/spec work, not direct implementation.
