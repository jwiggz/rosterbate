# Mixed-Era Board Fairness Retune Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retune the flagship `1996-2016-top300` mixed-era board so the draft board becomes fairer in the upper-middle tiers without changing actual simulation gameplay.

**Architecture:** Keep authored mixed-era content, draft/runtime wiring, and `simulateLeagueDay()` untouched. Add explicit pace metadata plus one small board-only `interiorPortabilityScore` inside `buildMixedEraRatings()`, prove the trim with a focused profile regression, then tighten the real-board audit regression and rerun the official notebook.

**Tech Stack:** Vanilla JavaScript, CommonJS Node scripts, static HTML audit page, PowerShell localhost tooling, Markdown vault notes.

---

## File Map

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-league-engine.js`
  Purpose: add pace metadata, add the continuous board-only `interiorPortabilityScore`, keep the existing low-games rule intact, and apply the new compression only to final `mixedEraOverall`.

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-mixed-era-normalization-retune.js`
  Purpose: extend the focused regression so it proves the new interior portability trim applies to `1995-96` board ranking only, preserves low-games behavior, and leaves `2015-16` untouched.

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-mixed-era-top300-balance.js`
  Purpose: prove the real `1996-2016-top300` board gets fairer after the retune while preserving `top10`, keeping low-games outliers out of premium tiers, and keeping the board out of audit-fail territory.

- `C:\Users\jabro\Documents\Vault\wee\wiki\synthesis\rosterbate-mixed-era-normalization-audit-1996-2016-top300-2026-04-20.md`
  Purpose: update the official flagship mixed-era audit notebook with the post-retune result and next-step verdict.

### Task 1: Add The Focused Board-Fairness Regression

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-mixed-era-normalization-retune.js`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-league-engine.js:31-76`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-league-engine.js:237-282`

- [ ] **Step 1: Extend the failing focused regression first**

Replace the body of `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-mixed-era-normalization-retune.js` with this exact test so it covers low-games behavior plus the new board-only portability trim:

```js
const assert = require('node:assert/strict');

global.window = globalThis;
require('../simulation-league-engine.js');

const engine = globalThis.RosterBateSimulationEngine;

function makeTotals(perGame, games) {
  return {
    pts: Math.round(perGame.pts * games * 10) / 10,
    reb: Math.round(perGame.reb * games * 10) / 10,
    ast: Math.round(perGame.ast * games * 10) / 10,
    stl: Math.round(perGame.stl * games * 10) / 10,
    blk: Math.round(perGame.blk * games * 10) / 10,
    to: Math.round(perGame.to * games * 10) / 10,
    threes: Math.round(perGame.threes * games * 10) / 10
  };
}

const perGame = {
  min: 37.0,
  pts: 24.2,
  reb: 10.1,
  ast: 4.4,
  stl: 1.6,
  blk: 1.8,
  to: 2.7,
  fgm: 9.1,
  fga: 18.7,
  ftm: 5.0,
  fta: 6.6,
  threes: 0.3
};

const fullSeasonPlayer = {
  name: 'Durable Prototype',
  historicalPackId: 'nba_1996_full_season_v1',
  seasonStats: {
    games: 82,
    perGame,
    totals: makeTotals(perGame, 82)
  }
};

const shortSeasonPlayer = {
  name: 'Short Sample Prototype',
  historicalPackId: 'nba_1996_full_season_v1',
  seasonStats: {
    games: 15,
    perGame,
    totals: makeTotals(perGame, 15)
  }
};

const nearCutoffPlayer = {
  name: 'Near Cutoff Prototype',
  historicalPackId: 'nba_1996_full_season_v1',
  seasonStats: {
    games: 24,
    perGame,
    totals: makeTotals(perGame, 24)
  }
};

const cutoffPlayer = {
  name: 'Cutoff Prototype',
  historicalPackId: 'nba_1996_full_season_v1',
  seasonStats: {
    games: 25,
    perGame,
    totals: makeTotals(perGame, 25)
  }
};

const durableProfile = engine.buildPlayerSimulationProfile(fullSeasonPlayer, {
  packId: 'nba_1996_full_season_v1'
});
const shortProfile = engine.buildPlayerSimulationProfile(shortSeasonPlayer, {
  packId: 'nba_1996_full_season_v1'
});
const nearCutoffProfile = engine.buildPlayerSimulationProfile(nearCutoffPlayer, {
  packId: 'nba_1996_full_season_v1'
});
const cutoffProfile = engine.buildPlayerSimulationProfile(cutoffPlayer, {
  packId: 'nba_1996_full_season_v1'
});

const rawRatings = {
  usage: 87,
  scoring: 89,
  rebounding: 86,
  playmaking: 74,
  defense: 88,
  shooting: 72,
  stamina: 85,
  tempo: 77,
  volatility: 64
};

const interiorBaseline = {
  pts: 24,
  reb: 12.5,
  ast: 2.8,
  stl: 1.1,
  blk: 2.6,
  to: 2.9,
  min: 37,
  fgm: 9.2,
  fga: 18.4,
  ftm: 4.9,
  fta: 6.7,
  threes: 0.2
};

const perimeterBaseline = {
  pts: 24,
  reb: 6.1,
  ast: 5.7,
  stl: 1.4,
  blk: 0.5,
  to: 2.9,
  min: 37,
  fgm: 9.2,
  fga: 18.4,
  ftm: 4.9,
  fta: 6.7,
  threes: 2.1
};

const interior1996 = engine.buildMixedEraRatings(
  rawRatings,
  interiorBaseline,
  3600,
  82,
  'nba_1996_full_season_v1'
);
const perimeter1996 = engine.buildMixedEraRatings(
  rawRatings,
  perimeterBaseline,
  3600,
  82,
  'nba_1996_full_season_v1'
);
const interior2016 = engine.buildMixedEraRatings(
  rawRatings,
  interiorBaseline,
  3600,
  82,
  'nba_2016_full_season_v1'
);

assert.equal(durableProfile.mixedEraContext.lowGamesConfidence, 1);
assert.equal(shortProfile.mixedEraContext.lowGamesConfidence, 0.89);
assert.equal(nearCutoffProfile.mixedEraContext.lowGamesConfidence, 0.99);
assert.equal(cutoffProfile.mixedEraContext.lowGamesConfidence, 1);
assert.ok(
  shortProfile.mixedEraRatings.overall < durableProfile.mixedEraRatings.overall,
  'expected low-games profile to stay below the durable profile'
);

assert.equal(interior1996.context.pace, 91.8);
assert.equal(interior2016.context.pace, 95.8);
assert.ok(
  interior1996.context.interiorPortabilityScore > perimeter1996.context.interiorPortabilityScore,
  `expected interior 1996 profile to carry a larger portability score than perimeter profile, got interior=${interior1996.context.interiorPortabilityScore} perimeter=${perimeter1996.context.interiorPortabilityScore}`
);
assert.ok(
  interior1996.context.interiorPortabilityCompression < 1,
  'expected 1996 interior profile to receive a board-only compression'
);
assert.equal(interior2016.context.interiorPortabilityScore, 0);
assert.equal(interior2016.context.interiorPortabilityCompression, 1);
assert.ok(
  interior1996.ratings.overall < perimeter1996.ratings.overall,
  `expected 1996 interior profile to rank below perimeter profile after portability compression, got interior=${interior1996.ratings.overall} perimeter=${perimeter1996.ratings.overall}`
);
assert.ok(
  interior1996.ratings.overall < interior2016.ratings.overall,
  `expected 1996 interior profile to land below the equivalent 2016 profile after the board-only trim, got 1996=${interior1996.ratings.overall} 2016=${interior2016.ratings.overall}`
);

console.log('mixed-era normalization retune test passed');
```

- [ ] **Step 2: Run the focused regression and verify it fails first**

Run:

```powershell
node .\tools\test-mixed-era-normalization-retune.js
```

Expected: FAIL because `pace`, `interiorPortabilityScore`, and `interiorPortabilityCompression` are not exposed yet and the board-only portability trim does not exist.

- [ ] **Step 3: Add pace metadata and the continuous portability helper**

In `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-league-engine.js`, update the era context blocks and add this helper below `getLowGamesMixedEraConfidence`:

```js
const DEFAULT_ERA_CONTEXT={
  eraLabel:'default',
  fantasyBaseline:38,
  fantasyInflation:1,
  scoringInflation:1,
  playmakingInflation:1,
  spacingInflation:1,
  reboundingInflation:1,
  defenseEventInflation:1,
  tempoInflation:1,
  pace:94,
  dominanceWeight:0.12
};
const PACK_ERA_CONTEXT={
  nba_1996_full_season_v1:{
    eraLabel:'1995-96',
    fantasyBaseline:39.4,
    fantasyInflation:1,
    scoringInflation:1,
    playmakingInflation:1,
    spacingInflation:0.96,
    reboundingInflation:1.01,
    defenseEventInflation:1.02,
    tempoInflation:0.99,
    pace:91.8,
    dominanceWeight:0.065
  },
  nba_2016_full_season_v1:{
    eraLabel:'2015-16',
    fantasyBaseline:38.9,
    fantasyInflation:1.03,
    scoringInflation:1.03,
    playmakingInflation:1.02,
    spacingInflation:1.12,
    reboundingInflation:0.99,
    defenseEventInflation:0.97,
    tempoInflation:1.02,
    pace:95.8,
    dominanceWeight:0.11
  }
};

function buildInteriorPortabilityScore(baseline, eraContext, packId){
  if(String(packId || '').trim() !== 'nba_1996_full_season_v1') return 0;
  const reboundingSignal=clamp((Number(baseline?.reb || 0) - 7.5) / 6.5, 0, 1);
  const blockSignal=clamp((Number(baseline?.blk || 0) - 0.8) / 2.2, 0, 1);
  const stealSignal=clamp((Number(baseline?.stl || 0) - 1.0) / 1.5, 0, 1);
  const threeRelief=clamp(Number(baseline?.threes || 0) / 2.2, 0, 1);
  const assistRelief=clamp((Number(baseline?.ast || 0) - 2.5) / 4.5, 0, 1);
  const spacingPenalty=clamp((1.08 - Number(eraContext?.spacingInflation || 1)) / 0.16, 0, 1);
  return roundHundredth(clamp(
    reboundingSignal * 0.42 +
    blockSignal * 0.28 +
    stealSignal * 0.08 +
    spacingPenalty * 0.22 -
    threeRelief * 0.25 -
    assistRelief * 0.15,
    0,
    1
  ));
}
```

- [ ] **Step 4: Apply the board-only compression in `buildMixedEraRatings()`**

Still in `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-league-engine.js`, update `buildMixedEraRatings()` like this:

```js
function buildMixedEraRatings(rawRatings, baseline, totalFantasyPoints, gp, packId){
  const eraContext=getPackEraContext(packId);
  const fantasyPerGame = gp > 0 && totalFantasyPoints > 0
    ? totalFantasyPoints / gp
    : computeFantasyPoints(baseline);
  const dominance = clamp((fantasyPerGame / Math.max(1, eraContext.fantasyBaseline)) - 1, -0.28, 0.72);
  const dominanceLift = 1 + dominance * Number(eraContext.dominanceWeight || 0.12);
  const lowGamesConfidence=getLowGamesMixedEraConfidence(gp);
  const interiorPortabilityScore=buildInteriorPortabilityScore(baseline, eraContext, packId);
  const interiorPortabilityCompression=roundHundredth(1 - interiorPortabilityScore * 0.025);
  const inverse=function(key, floor, ceiling){
    return clamp(1 / Math.max(0.7, Number(eraContext[key] || 1)), floor, ceiling);
  };
  const shootingContextBoost = clamp(0.88 + inverse('spacingInflation', 0.88, 1.18) * 0.18, 0.92, 1.1);
  const adjusted={
    usage:roundStat(clamp(rawRatings.usage * clamp(inverse('fantasyInflation', 0.94, 1.12) * 0.24 + 0.76, 0.95, 1.08) * dominanceLift, 20, 99)),
    scoring:roundStat(clamp(rawRatings.scoring * inverse('scoringInflation', 0.92, 1.14) * dominanceLift, 20, 99)),
    rebounding:roundStat(clamp(rawRatings.rebounding * inverse('reboundingInflation', 0.94, 1.08) * (1 + dominance * 0.04), 20, 99)),
    playmaking:roundStat(clamp(rawRatings.playmaking * inverse('playmakingInflation', 0.93, 1.12) * (1 + dominance * 0.07), 20, 99)),
    defense:roundStat(clamp(rawRatings.defense * inverse('defenseEventInflation', 0.94, 1.08) * (1 + dominance * 0.05), 20, 99)),
    shooting:roundStat(clamp(rawRatings.shooting * shootingContextBoost * (1 + dominance * 0.05), 20, 99)),
    stamina:roundStat(rawRatings.stamina),
    tempo:roundStat(clamp(rawRatings.tempo * inverse('tempoInflation', 0.94, 1.1), 20, 99)),
    volatility:roundStat(rawRatings.volatility)
  };
  const adjustedOverall=roundStat(
    adjusted.scoring * 0.28 +
    adjusted.rebounding * 0.16 +
    adjusted.playmaking * 0.18 +
    adjusted.defense * 0.15 +
    adjusted.shooting * 0.11 +
    adjusted.stamina * 0.07 +
    adjusted.usage * 0.05
  );
  adjusted.overall=roundStat(adjustedOverall * lowGamesConfidence * interiorPortabilityCompression);
  return {
    ratings:adjusted,
    context:{
      eraLabel:eraContext.eraLabel,
      fantasyBaseline:roundStat(eraContext.fantasyBaseline),
      fantasyPerGame:roundStat(fantasyPerGame),
      fantasyInflation:roundStat(eraContext.fantasyInflation),
      dominance:roundStat(dominance),
      pace:roundHundredth(eraContext.pace),
      lowGamesConfidence:lowGamesConfidence,
      interiorPortabilityScore:interiorPortabilityScore,
      interiorPortabilityCompression:interiorPortabilityCompression,
      normalizationModel:'season_context_plus_light_authored_tuning'
    }
  };
}
```

- [ ] **Step 5: Run the focused regression again and commit**

Run:

```powershell
node .\tools\test-mixed-era-normalization-retune.js
git add simulation-league-engine.js tools/test-mixed-era-normalization-retune.js
git commit -m "fix: trim interior-heavy 1996 mixed-era board bias"
```

Expected:

```text
mixed-era normalization retune test passed
```

### Task 2: Tighten The Real-Board Balance Regression

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-mixed-era-top300-balance.js`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-league-engine.js:43-68`

- [ ] **Step 1: Tighten the real-board audit regression first**

Replace the assertions in `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-mixed-era-top300-balance.js` with this exact block:

```js
function assertMaxDominantShare(id, maxDominantShare) {
  const check = mustGetCheck(id);
  assert.notEqual(check.verdict, 'fail', `expected ${id} composition to stay out of fail range`);
  assert.ok(
    check.dominantShare <= maxDominantShare,
    `expected ${id} dominant share <= ${maxDominantShare}, got ${check.dominantShare}`
  );
}

assert.throws(
  () => mustGetCheck('missing-check'),
  /expected composition check missing-check to exist/
);

assert.equal(mustGetCheck('top10').verdict, 'pass');
assertMaxDominantShare('top25', 60);
assertMaxDominantShare('top50', 58);
assertMaxDominantShare('top100', 58);
assert.equal(mustGetCheck('fullPool').verdict, 'pass');
assert.deepStrictEqual(
  audit.rows.filter((row) => row.rank <= 25 && row.gamesPlayed < 25),
  []
);
assert.deepStrictEqual(
  audit.rows.filter((row) => row.rank <= 50 && row.gamesPlayed < 25),
  []
);
assert.ok(
  audit.rows.some((row) => row.rank <= 10 && row.player === 'Michael Jordan'),
  'expected Michael Jordan to stay in the top 10 after the fairness retune'
);
```

- [ ] **Step 2: Run the real-board regression and verify it fails first**

Run:

```powershell
node .\tools\test-mixed-era-top300-balance.js
```

Expected: FAIL on at least one tightened dominant-share assertion before the new board-only trim lands.

- [ ] **Step 3: Tune the 1995-96 board context until the regression passes**

If Task 1 alone does not satisfy the real-board thresholds, only make small adjustments in `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-league-engine.js` within this exact range:

```js
    nba_1996_full_season_v1:{
      eraLabel:'1995-96',
      fantasyBaseline:39.4,
      fantasyInflation:1,
      scoringInflation:1,
      playmakingInflation:1,
      spacingInflation:0.96,
      reboundingInflation:1.01,
      defenseEventInflation:1.02,
      tempoInflation:0.99,
      pace:91.8,
      dominanceWeight:0.065
    },
```

Allowed tuning scope:

- `fantasyBaseline`: keep between `39.3` and `39.6`
- `dominanceWeight`: keep between `0.06` and `0.07`
- `interiorPortabilityCompression` cap: keep between `0.02` and `0.03`

Do not touch:

- `nba_2016_full_season_v1`
- the low-games confidence formula
- any game-simulation logic below `buildPlayerSimulationProfile()`

- [ ] **Step 4: Run the two retune regressions together and commit**

Run:

```powershell
node .\tools\test-mixed-era-normalization-retune.js
node .\tools\test-mixed-era-top300-balance.js
git add simulation-league-engine.js tools/test-mixed-era-normalization-retune.js tools/test-mixed-era-top300-balance.js
git commit -m "fix: improve flagship mixed-era board fairness"
```

Expected:

```text
mixed-era normalization retune test passed
mixed-era top300 balance test passed
```

### Task 3: Verify The Full Mixed-Era Suite And Update The Audit Notebook

**Files:**
- Modify: `C:\Users\jabro\Documents\Vault\wee\wiki\synthesis\rosterbate-mixed-era-normalization-audit-1996-2016-top300-2026-04-20.md`

- [ ] **Step 1: Run the full mixed-era regression suite**

Run:

```powershell
node .\tools\test-mixed-era-loader.js
node .\tools\test-mixed-era-runtime.js
node .\tools\test-mixed-era-universe-summary.js
node .\tools\test-mixed-era-audit-view-model.js
node .\tools\test-mixed-era-audit-page-static.js
node .\tools\test-mixed-era-top300-primary-wiring.js
node .\tools\test-mixed-era-normalization-retune.js
node .\tools\test-mixed-era-top300-balance.js
```

Expected:

```text
mixed-era loader smoke test passed
mixed-era runtime test passed
mixed-era universe summary test passed
mixed-era audit view-model test passed
mixed-era audit page static test passed
mixed-era top300 primary wiring test passed
mixed-era normalization retune test passed
mixed-era top300 balance test passed
```

- [ ] **Step 2: Start the local audit server**

Run:

```powershell
powershell -ExecutionPolicy Bypass -Command "& 'C:\Users\jabro\Desktop\Fantasy Project\tools\serve-local.ps1' -Port 8082 -RootPath 'C:\Users\jabro\Desktop\Fantasy Project\rosterbate'"
```

Expected: localhost serves the current `rosterbate` root on port `8082`. If that port is already occupied, rerun on `8083` and use the substituted port number consistently in the remaining steps.

- [ ] **Step 3: Verify the live flagship audit page**

Open:

```text
http://127.0.0.1:8082/mixed-era-audit.html?configId=1996-2016-top300
```

Verify all of these manually:

- `top10` remains `Pass`
- `top25` is no worse than `60 / 40`
- `top50` is no worse than `58 / 42`
- `top100` is no worse than `58 / 42`
- `fullPool` remains `150 / 150`
- no sub-`25 GP` player appears in the first `25` rows
- no sub-`25 GP` player appears in the first `50` rows
- `Michael Jordan` remains in the top `10`
- the first two rounds still feel exciting and defensible

- [ ] **Step 4: Update the official audit notebook with the observed result**

Edit `C:\Users\jabro\Documents\Vault\wee\wiki\synthesis\rosterbate-mixed-era-normalization-audit-1996-2016-top300-2026-04-20.md` and update all of these sections from the live verification in Step 3:

- `Provenance`
- `Composition Results`
- `Star Fairness Notes`
- `Tier Integrity Notes`
- `Raw vs Normalized Sanity Notes`
- `Draft-Feel Verdict`
- `Outcome`
- `Next Action`

Use the actual verified slice counts from the live audit page, not estimates. If the board still lands on `Tune`, record `Tune` clearly.

- [ ] **Step 5: Stop the temporary server and verify repo cleanliness**

Stop the localhost process if it is still running, then run:

```powershell
git status --short
```

Expected:

- no unexpected repo edits beyond the committed retune work
- the vault note is updated
- the implementation branch is ready for the completion workflow
