# NFL Simulation Realism Score Shape Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retune NFL weekly simulation so football slot lineups produce more believable score shape and position influence, then align lineup recommendations and shell hints with that model without changing the shared season shell.

**Architecture:** Keep NFL-only score-shape logic inside `simulation-league-engine.js`, where weekly results are already resolved and NFL slot lineups are already honored. Retune `simulation-mode-runtime.js` so NFL suggested lineups use football-aware slot scoring instead of generic overall ranking, and expose richer recommendation messaging through `simulation-season-adapter.js` while keeping legality gating and shell routing unchanged.

**Tech Stack:** Plain JavaScript, Node-based regression tests, shared season shell runtime, historical-pack player data with `mixedEraOverall`, `fp`, and `simulationProfile.mixedEraRatings`

---

## File Map

- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/simulation-league-engine.js`
  Purpose: Add NFL-only matchup component scoring, balanced weekly variance tuning, and football-shaped final score resolution.
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/simulation-mode-runtime.js`
  Purpose: Replace generic NFL starter recommendation ranking with slot-aware football recommendation scoring.
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/simulation-season-adapter.js`
  Purpose: Surface recommendation summaries and slot-level hint copy derived from runtime recommendations.
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-simulation-league-engine.js`
  Purpose: Lock in NFL score shape, QB-weighted influence, and DST/K guardrails.
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-simulation-mode-runtime.js`
  Purpose: Lock in NFL lineup recommendation behavior by slot.
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-simulation-season-adapter.js`
  Purpose: Lock in recommendation summaries and slot-level hint exposure.
- Run: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-nfl-shared-season-shell-weekly-sim.js`
  Purpose: Regression-check the shared NFL shell flow.
- Run: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-shared-season-shell-simulation.js`
  Purpose: Cross-sport shell regression.

### Task 1: Lock In NFL Engine Expectations

**Files:**
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-simulation-league-engine.js`
- Test: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-simulation-league-engine.js`

- [ ] **Step 1: Write the failing engine tests for NFL score-shape and position influence**

Add assertions near the existing NFL coverage in `tools/test-simulation-league-engine.js` that compare a strong-QB lineup against a weak-QB lineup and verify football-sized scores stay in a believable band while K and DST stay lower-impact.

```js
const strongQbRoster = [
  { id: 1, name: 'Elite QB', team: 'DAL', pos: 'QB', designation: 'ACTIVE', fp: 28, mixedEraOverall: 97 },
  { id: 2, name: 'RB One', team: 'DAL', pos: 'RB', designation: 'ACTIVE', fp: 20, mixedEraOverall: 90 },
  { id: 3, name: 'RB Two', team: 'DAL', pos: 'RB', designation: 'ACTIVE', fp: 18, mixedEraOverall: 88 },
  { id: 4, name: 'WR One', team: 'DAL', pos: 'WR', designation: 'ACTIVE', fp: 22, mixedEraOverall: 92 },
  { id: 5, name: 'WR Two', team: 'DAL', pos: 'WR', designation: 'ACTIVE', fp: 19, mixedEraOverall: 89 },
  { id: 6, name: 'TE One', team: 'DAL', pos: 'TE', designation: 'ACTIVE', fp: 15, mixedEraOverall: 84 },
  { id: 7, name: 'Flex WR', team: 'DAL', pos: 'WR', designation: 'ACTIVE', fp: 17, mixedEraOverall: 86 },
  { id: 8, name: 'Kicker', team: 'DAL', pos: 'K', designation: 'ACTIVE', fp: 10, mixedEraOverall: 79 },
  { id: 9, name: 'Dallas DST', team: 'DAL', pos: 'DST', designation: 'ACTIVE', fp: 11, mixedEraOverall: 82 }
];

const weakQbRoster = strongQbRoster.map((player) => (
  player.pos === 'QB'
    ? { ...player, name: 'Weak QB', fp: 12, mixedEraOverall: 72 }
    : { ...player }
));

assert.ok(
  strongQbDayResult.gameLogs[0].homeScore > weakQbDayResult.gameLogs[0].homeScore,
  'nfl weekly scoring should give the stronger qb lineup a clearer offensive edge'
);

assert.ok(
  strongQbDayResult.gameLogs[0].homeScore <= 45 && strongQbDayResult.gameLogs[0].awayScore <= 45,
  'nfl score-shape retune should stay in believable football scoring bands'
);
```

- [ ] **Step 2: Run the engine test to verify it fails before implementation**

Run: `node tools/test-simulation-league-engine.js`

Expected: FAIL on the new NFL assertions because the current engine still relies on flatter starter translation and looser generic score shaping.

- [ ] **Step 3: Commit the failing test checkpoint**

```bash
git add tools/test-simulation-league-engine.js
git commit -m "test: lock nfl engine score-shape expectations"
```

### Task 2: Implement NFL Weekly Score-Shape Retune

**Files:**
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/simulation-league-engine.js`
- Test: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-simulation-league-engine.js`

- [ ] **Step 1: Add NFL-only component helpers in the engine**

Insert focused helpers near the existing NFL starter-selection utilities so the engine can derive football-shaped lineup components from active starters without changing NBA paths.

```js
function getNflStarterComponentScore(player, slot){
  const profile = player?.simulationProfile?.mixedEraRatings || player?.simProfile?.mixedEraRatings || {};
  const overall = Number(player?.mixedEraOverall || profile?.overall || player?.fp || 0);
  const passing = Number(profile?.passing || overall);
  const rushing = Number(profile?.rushing || overall);
  const receiving = Number(profile?.receiving || overall);
  const decisionMaking = Number(profile?.decisionMaking || overall);

  if(slot === 'QB'){
    return (passing * 0.5) + (decisionMaking * 0.3) + (overall * 0.2);
  }
  if(slot === 'RB1' || slot === 'RB2'){
    return (rushing * 0.55) + (receiving * 0.15) + (overall * 0.3);
  }
  if(slot === 'WR1' || slot === 'WR2'){
    return (receiving * 0.6) + (overall * 0.4);
  }
  if(slot === 'TE'){
    return (receiving * 0.45) + (overall * 0.35) + (decisionMaking * 0.2);
  }
  if(slot === 'FLEX'){
    return (Math.max(rushing, receiving) * 0.45) + (overall * 0.35) + (Math.min(rushing, receiving) * 0.2);
  }
  if(slot === 'K'){
    return overall * 0.35;
  }
  if(slot === 'DST'){
    return overall * 0.45;
  }
  return overall;
}

function buildNflWeeklyTeamProfile(entries){
  const bySlot = Object.fromEntries((entries || []).map((entry) => [entry.slot || entry.positionSlot, entry.player]));
  const qb = getNflStarterComponentScore(bySlot.QB, 'QB');
  const run = getNflStarterComponentScore(bySlot.RB1, 'RB1') + getNflStarterComponentScore(bySlot.RB2, 'RB2');
  const passCatch = getNflStarterComponentScore(bySlot.WR1, 'WR1')
    + getNflStarterComponentScore(bySlot.WR2, 'WR2')
    + getNflStarterComponentScore(bySlot.TE, 'TE')
    + getNflStarterComponentScore(bySlot.FLEX, 'FLEX');
  const specialTeams = getNflStarterComponentScore(bySlot.K, 'K');
  const defense = getNflStarterComponentScore(bySlot.DST, 'DST');
  return { qb, run, passCatch, specialTeams, defense };
}
```

- [ ] **Step 2: Route NFL game scoring through a football-shaped resolver**

Update the NFL scoring branch inside `simulateLeagueDay` or its helper path so NFL uses the new team profile, balanced variance, and lower football score bands while NBA keeps its current behavior.

```js
function resolveNflWeeklyScore(profile, opponentProfile, rng){
  const offense = (profile.qb * 0.34) + (profile.run * 0.18) + (profile.passCatch * 0.28) + (profile.specialTeams * 0.06);
  const resistance = opponentProfile.defense * 0.16;
  const expectation = 17 + ((offense - resistance) / 18);
  const variance = normalish(rng) * 4.2;
  return Math.round(clamp(expectation + variance, 6, 45));
}

const homeProfile = buildNflWeeklyTeamProfile(homeEntries);
const awayProfile = buildNflWeeklyTeamProfile(awayEntries);
const homeScore = resolveNflWeeklyScore(homeProfile, awayProfile, rng);
const awayScore = resolveNflWeeklyScore(awayProfile, homeProfile, rng);
```

- [ ] **Step 3: Keep starter entry metadata rich enough for slot-aware scoring**

If the current NFL starter-entry objects do not carry slot labels, extend that entry shape while preserving existing consumers.

```js
entries.push({
  player,
  starter: true,
  positionSlot: starterSlots[index],
  slot: starterSlots[index]
});
```

- [ ] **Step 4: Run the engine regression test and verify it passes**

Run: `node tools/test-simulation-league-engine.js`

Expected: PASS, including the new NFL assertions plus the existing NBA and NFL regression coverage.

- [ ] **Step 5: Commit the engine implementation**

```bash
git add simulation-league-engine.js tools/test-simulation-league-engine.js
git commit -m "feat: retune nfl weekly simulation score shape"
```

### Task 3: Retune NFL Lineup Recommendations

**Files:**
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-simulation-mode-runtime.js`
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/simulation-mode-runtime.js`
- Test: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-simulation-mode-runtime.js`

- [ ] **Step 1: Write failing runtime tests for slot-aware NFL suggestions**

Add a test case that proves `buildSuggestedSimulationLineup` no longer just picks by `mixedEraOverall`, especially for `QB`, `TE`, and `FLEX`.

```js
const suggested = runtime.buildSuggestedSimulationLineup(state, 'DAL');

assert.equal(suggested.QB, 11, 'qb suggestion should favor the stronger passing profile');
assert.equal(suggested.TE, 16, 'te suggestion should preserve the best dedicated te');
assert.equal(suggested.FLEX, 15, 'flex suggestion should compare rb/wr/te candidates by partial-value football fit');
```

- [ ] **Step 2: Run the runtime test to verify it fails**

Run: `node tools/test-simulation-mode-runtime.js`

Expected: FAIL on the new NFL recommendation assertions because the current recommendation path still sorts by `mixedEraOverall` and `fp`.

- [ ] **Step 3: Add focused NFL recommendation scoring helpers**

Extend `simulation-mode-runtime.js` with NFL-only slot scoring helpers and use them inside `buildSuggestedSimulationLineup` for NFL while keeping NBA unchanged.

```js
function getNflRecommendationScore(player, slot){
  const ratings = player?.simulationProfile?.mixedEraRatings || {};
  const overall = Number(player?.mixedEraOverall || ratings?.overall || player?.fp || 0);
  const passing = Number(ratings?.passing || overall);
  const rushing = Number(ratings?.rushing || overall);
  const receiving = Number(ratings?.receiving || overall);
  const decisionMaking = Number(ratings?.decisionMaking || overall);

  if(slot === 'QB') return (passing * 0.55) + (decisionMaking * 0.25) + (overall * 0.2);
  if(slot === 'RB1' || slot === 'RB2') return (rushing * 0.55) + (receiving * 0.1) + (overall * 0.35);
  if(slot === 'WR1' || slot === 'WR2') return (receiving * 0.6) + (overall * 0.4);
  if(slot === 'TE') return (receiving * 0.45) + (decisionMaking * 0.15) + (overall * 0.4);
  if(slot === 'FLEX') return (Math.max(rushing, receiving) * 0.5) + (overall * 0.5);
  if(slot === 'K' || slot === 'DST') return overall;
  return overall;
}
```

- [ ] **Step 4: Use slot-aware ranking when filling NFL suggestions**

Replace the `.find(...)` path in `buildSuggestedSimulationLineup` with a best-candidate selection per slot.

```js
const candidates = roster.filter((entry) => {
  const playerId = Number(entry?.id);
  return !usedIds.has(playerId)
    && eligiblePositions.includes(getSimulationPlayerPosition(entry))
    && String(entry?.designation || '').trim().toUpperCase() !== 'OUT';
});

const player = candidates.sort((a, b) => (
  getNflRecommendationScore(b, slot) - getNflRecommendationScore(a, slot)
))[0] || null;
```

- [ ] **Step 5: Run the runtime test and verify it passes**

Run: `node tools/test-simulation-mode-runtime.js`

Expected: PASS, including the new NFL slot-suggestion coverage.

- [ ] **Step 6: Commit the runtime recommendation retune**

```bash
git add simulation-mode-runtime.js tools/test-simulation-mode-runtime.js
git commit -m "feat: retune nfl lineup recommendations"
```

### Task 4: Expose Recommendation Hints In The Shared Shell Adapter

**Files:**
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-simulation-season-adapter.js`
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/simulation-season-adapter.js`
- Test: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-simulation-season-adapter.js`

- [ ] **Step 1: Write failing adapter tests for recommendation messaging**

Add assertions around `getControlledRosterSlots` so the adapter exposes a football-aware summary and slot-level hint copy when the suggested starter differs from the current one.

```js
const rosterView = adapter.getControlledRosterSlots(state);

assert.equal(rosterView.recommendationSummary, 'Suggested football-fit upgrades are available.');
assert.equal(rosterView.lineupSlots.QB.recommendationHint, 'Higher passing ceiling');
assert.equal(rosterView.lineupSlots.FLEX.recommendationHint, 'Better FLEX value');
```

- [ ] **Step 2: Run the adapter test to verify it fails**

Run: `node tools/test-simulation-season-adapter.js`

Expected: FAIL on the new recommendation summary and hint assertions because the adapter currently only exposes `suggestedPlayerId`.

- [ ] **Step 3: Add a small adapter hint builder for NFL slots**

Use a compact adapter helper instead of hard-coding text inline throughout `getControlledRosterSlots`.

```js
function getNflRecommendationHint(slot, currentPlayer, suggestedPlayer){
  if(!suggestedPlayer || !currentPlayer || Number(currentPlayer.id) === Number(suggestedPlayer.id)) return '';
  if(slot === 'QB') return 'Higher passing ceiling';
  if(slot === 'RB1' || slot === 'RB2') return 'Safer RB floor';
  if(slot === 'WR1' || slot === 'WR2') return 'Stronger receiving upside';
  if(slot === 'TE') return 'Better TE stability';
  if(slot === 'FLEX') return 'Better FLEX value';
  if(slot === 'DST') return 'DST downgrade this week';
  return 'Suggested football-fit upgrade';
}
```

- [ ] **Step 4: Attach hint copy and summary text without changing legality gating**

Update the slot mapping in `getControlledRosterSlots` to look up the suggested player object and attach a hint, while keeping `readyLabel`, `validation`, and `getSimulationPrimaryAction` unchanged.

```js
const suggestedPlayer = suggestedPlayerId == null ? null : clone(rosterById.get(suggestedPlayerId) || null);

return [slot, {
  slot,
  playerId: normalizedPlayerId,
  player: normalizedPlayerId == null ? null : clone(rosterById.get(normalizedPlayerId) || null),
  suggestedPlayerId,
  suggestedPlayer,
  recommendationHint: getSimulationSportForState(state) === 'nfl'
    ? getNflRecommendationHint(slot, rosterById.get(normalizedPlayerId), rosterById.get(suggestedPlayerId))
    : ''
}];
```

Also update the summary line:

```js
recommendationSummary: validation.valid
  ? 'Starting lineup is legal.'
  : 'Suggested football-fit upgrades are available.'
```

- [ ] **Step 5: Run the adapter test and verify it passes**

Run: `node tools/test-simulation-season-adapter.js`

Expected: PASS, including the new recommendation messaging assertions.

- [ ] **Step 6: Commit the adapter hint wiring**

```bash
git add simulation-season-adapter.js tools/test-simulation-season-adapter.js
git commit -m "feat: expose nfl recommendation hints in season adapter"
```

### Task 5: Full Regression And Realism Verification

**Files:**
- Run-only: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-simulation-league-engine.js`
- Run-only: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-simulation-mode-runtime.js`
- Run-only: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-simulation-season-adapter.js`
- Run-only: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-shared-season-shell-simulation.js`
- Run-only: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-nfl-shared-season-shell-weekly-sim.js`

- [ ] **Step 1: Run the focused feature tests**

Run:

```bash
node tools/test-simulation-league-engine.js
node tools/test-simulation-mode-runtime.js
node tools/test-simulation-season-adapter.js
```

Expected: PASS for all three commands.

- [ ] **Step 2: Run the shared shell regression coverage**

Run:

```bash
node tools/test-shared-season-shell-simulation.js
node tools/test-nfl-shared-season-shell-weekly-sim.js
```

Expected: PASS for both commands, proving the shared shell and NFL weekly flow stayed intact.

- [ ] **Step 3: Check the working tree for whitespace or patch drift**

Run: `git diff --check`

Expected: no output

- [ ] **Step 4: Commit the verification checkpoint**

```bash
git add simulation-league-engine.js simulation-mode-runtime.js simulation-season-adapter.js tools/test-simulation-league-engine.js tools/test-simulation-mode-runtime.js tools/test-simulation-season-adapter.js
git commit -m "test: verify nfl realism score-shape pass"
```

## Self-Review

- Spec coverage: engine weighting and score-shape tuning are covered in Tasks 1-2; runtime recommendation retune is covered in Task 3; adapter hint wiring is covered in Task 4; regression and realism verification are covered in Task 5.
- Placeholder scan: removed generic “add tests” language and replaced it with exact files, commands, and concrete code snippets for each task.
- Type consistency: the plan uses existing names already present in the codebase such as `buildSuggestedSimulationLineup`, `getControlledRosterSlots`, `suggestedPlayerId`, `simulateLeagueDay`, and the NFL slot names `QB`, `RB1`, `RB2`, `WR1`, `WR2`, `TE`, `FLEX`, `K`, `DST`.
