# Mixed-Era Composition-First Retune Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retune the flagship `1996-2016-top300` mixed-era board so `top25` and `top50` composition improve first, while keeping `2K` strictly audit-only.

**Architecture:** Keep this pass inside the existing mixed-era rating pipeline in [simulation-league-engine.js](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/simulation-league-engine.js:237). Tighten the balance tests first, then add one two-sided board-shape adjustment: a slightly stronger `1995-96` premium interior compression plus a modest `2015-16` spacing / hybrid lift. Rerun the live calibration-assisted audit and update the existing flagship notebook with the new verdict.

**Tech Stack:** Vanilla JS runtime, CommonJS Node tests, PowerShell localhost verification, Edge headless DOM checks, Markdown vault notes.

---

## File Map

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-league-engine.js`
  Purpose: add the board-only composition-first tuning levers inside `buildMixedEraRatings()`.

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-mixed-era-top300-balance.js`
  Purpose: lock the new flagship composition-first success thresholds.

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-mixed-era-normalization-retune.js`
  Purpose: verify the new board-shape levers behave directionally as intended and do not regress low-games handling.

- `C:\Users\jabro\Documents\Vault\wee\wiki\synthesis\rosterbate-mixed-era-normalization-audit-1996-2016-top300-2026-04-20-calibration-assisted.md`
  Purpose: update the existing calibration-assisted flagship audit notebook after the retune is verified on the live board.

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\mixed-era-audit.html`
  Purpose: no intended code change in this plan; it is the live consumer used for the re-audit.

### Task 1: Tighten The Composition-First Regressions Before Changing The Model

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-mixed-era-top300-balance.js`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-mixed-era-normalization-retune.js`

- [ ] **Step 1: Tighten the flagship balance assertions so the current board fails first**

In [test-mixed-era-top300-balance.js](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/tools/test-mixed-era-top300-balance.js:1), keep the helper structure but tighten the composition thresholds to the new composition-first target:

```js
assert.equal(mustGetCheck('top10').verdict, 'pass');
assertNotFailWithMaxDominantShare('top25', 60);
assertNotFailWithMaxDominantShare('top50', 58);
assertNotFailWithMaxDominantShare('top100', 60);
assert.equal(mustGetCheck('fullPool').verdict, 'pass');
assert.deepStrictEqual(
  audit.rows.filter((row) => row.rank <= 25 && row.gamesPlayed < 25),
  []
);
assert.deepStrictEqual(
  audit.rows.filter((row) => row.rank <= 50 && row.gamesPlayed < 25),
  []
);
```

Do not change the helper names or the final console line.

- [ ] **Step 2: Add a failing directional regression for the two new board-shape levers**

In [test-mixed-era-normalization-retune.js](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/tools/test-mixed-era-normalization-retune.js:1), append this block after the current low-games assertions and before the final `console.log`:

```js
const classicInteriorMixedEra = engine.buildMixedEraRatings(
  {
    usage: 87,
    scoring: 82,
    rebounding: 93,
    playmaking: 56,
    defense: 90,
    shooting: 49,
    stamina: 85,
    tempo: 71,
    volatility: 58
  },
  {
    pts: 22.1,
    reb: 12.0,
    ast: 2.9,
    stl: 1.0,
    blk: 2.8,
    to: 2.7,
    min: 37.6,
    fgm: 8.5,
    fga: 16.3,
    ftm: 5.1,
    fta: 6.8,
    threes: 0.2
  },
  3936,
  82,
  'nba_1996_full_season_v1'
);

const classicWingMixedEra = engine.buildMixedEraRatings(
  {
    usage: 87,
    scoring: 82,
    rebounding: 71,
    playmaking: 74,
    defense: 83,
    shooting: 73,
    stamina: 85,
    tempo: 75,
    volatility: 58
  },
  {
    pts: 22.1,
    reb: 7.3,
    ast: 5.1,
    stl: 1.7,
    blk: 0.8,
    to: 2.7,
    min: 37.6,
    fgm: 8.5,
    fga: 16.3,
    ftm: 5.1,
    fta: 6.8,
    threes: 1.4
  },
  3936,
  82,
  'nba_1996_full_season_v1'
);

const modernSpacingHybridMixedEra = engine.buildMixedEraRatings(
  {
    usage: 82,
    scoring: 79,
    rebounding: 75,
    playmaking: 77,
    defense: 77,
    shooting: 87,
    stamina: 84,
    tempo: 79,
    volatility: 56
  },
  {
    pts: 19.9,
    reb: 7.9,
    ast: 4.8,
    stl: 1.2,
    blk: 1.4,
    to: 2.3,
    min: 35.0,
    fgm: 7.5,
    fga: 15.2,
    ftm: 3.3,
    fta: 4.0,
    threes: 2.3
  },
  3500,
  82,
  'nba_2016_full_season_v1'
);

const modernInteriorControlMixedEra = engine.buildMixedEraRatings(
  {
    usage: 82,
    scoring: 79,
    rebounding: 75,
    playmaking: 77,
    defense: 77,
    shooting: 75,
    stamina: 84,
    tempo: 79,
    volatility: 56
  },
  {
    pts: 19.9,
    reb: 7.9,
    ast: 4.8,
    stl: 1.2,
    blk: 1.4,
    to: 2.3,
    min: 35.0,
    fgm: 7.5,
    fga: 15.2,
    ftm: 3.3,
    fta: 4.0,
    threes: 0.4
  },
  3500,
  82,
  'nba_2016_full_season_v1'
);

assert.ok(classicInteriorMixedEra.context.olderEraInteriorScore > 0.6);
assert.ok(classicInteriorMixedEra.context.olderEraInteriorCompression < 1);
assert.ok(
  classicWingMixedEra.context.olderEraInteriorCompression >= classicInteriorMixedEra.context.olderEraInteriorCompression
);
assert.ok(
  modernSpacingHybridMixedEra.context.modernSpacingHybridScore >
    modernInteriorControlMixedEra.context.modernSpacingHybridScore
);
assert.ok(modernSpacingHybridMixedEra.context.modernSpacingHybridLift > 1);
assert.ok(
  modernSpacingHybridMixedEra.ratings.overall >
    modernInteriorControlMixedEra.ratings.overall
);
```

This should fail before implementation because the new context fields do not exist yet and the current top300 balance test still misses the tighter thresholds.

- [ ] **Step 3: Run the focused regressions and verify both fail before implementation**

Run:

```powershell
node .\tools\test-mixed-era-top300-balance.js
node .\tools\test-mixed-era-normalization-retune.js
```

Expected:

- `test-mixed-era-top300-balance.js` fails on the tighter `top25` and/or `top50` dominant-share guardrail
- `test-mixed-era-normalization-retune.js` fails because the new context keys and directional assertions are not satisfied yet

### Task 2: Implement The Two-Sided Board-Shape Retune In The Mixed-Era Rating Path

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-league-engine.js`

- [ ] **Step 1: Add small helper functions for the two board-shape scores**

In [simulation-league-engine.js](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/simulation-league-engine.js:237), add these helpers just above `buildMixedEraRatings()`:

```js
function getOlderEraInteriorScore(baseline){
  var rebounding = clamp((baseline.reb - 8) / 5, 0, 1);
  var rimProtection = clamp((baseline.blk - 1.1) / 1.6, 0, 1);
  var defenseEvents = clamp(((baseline.stl + baseline.blk) - 2.6) / 1.8, 0, 1);
  var interiorScoring = clamp((baseline.pts - baseline.threes * 2.5 - 14) / 12, 0, 1);
  var spacingPenalty = clamp((1.4 - baseline.threes) / 1.4, 0, 1);
  var playmakingOffset = clamp((baseline.ast - 4) / 4, 0, 1) * 0.18;
  return roundHundredth(
    clamp(
      rebounding * 0.28 +
      rimProtection * 0.22 +
      defenseEvents * 0.16 +
      interiorScoring * 0.16 +
      spacingPenalty * 0.18 -
      playmakingOffset,
      0,
      1
    )
  );
}

function getModernSpacingHybridScore(baseline){
  var spacing = clamp((baseline.threes - 1.4) / 2.8, 0, 1);
  var playmaking = clamp((baseline.ast - 3.2) / 4.8, 0, 1);
  var scoring = clamp((baseline.pts - 16) / 12, 0, 1);
  var hybridRebounding = clamp((baseline.reb - 5.5) / 4.5, 0, 1);
  var hybridRimValue = clamp((baseline.blk - 0.7) / 1.4, 0, 1);
  return roundHundredth(
    clamp(
      spacing * 0.38 +
      playmaking * 0.22 +
      scoring * 0.20 +
      hybridRebounding * 0.12 +
      hybridRimValue * 0.08,
      0,
      1
    )
  );
}

function getPremiumTierGate(overall, floor, ceiling){
  return roundHundredth(
    clamp((overall - floor) / Math.max(1, ceiling - floor), 0, 1)
  );
}
```

These helpers keep the new logic small, continuous, and board-only.

- [ ] **Step 2: Replace the final mixed-era overall calculation with a two-sided board-shape multiplier**

Inside `buildMixedEraRatings()`, keep the existing category adjustments and `adjustedOverall` calculation, then replace the final `adjusted.overall` assignment and context block with this:

```js
const olderEraInteriorScore = packId === 'nba_1996_full_season_v1'
  ? getOlderEraInteriorScore(baseline)
  : 0;
const modernSpacingHybridScore = packId === 'nba_2016_full_season_v1'
  ? getModernSpacingHybridScore(baseline)
  : 0;
const premiumTierGate = getPremiumTierGate(adjustedOverall, 63, 79);
const middleTierGate = getPremiumTierGate(adjustedOverall, 58, 76);
const olderEraInteriorCompression = packId === 'nba_1996_full_season_v1'
  ? roundHundredth(1 - olderEraInteriorScore * premiumTierGate * 0.03)
  : 1;
const modernSpacingHybridLift = packId === 'nba_2016_full_season_v1'
  ? roundHundredth(1 + modernSpacingHybridScore * middleTierGate * 0.025)
  : 1;
const boardShapeMultiplier = roundHundredth(
  olderEraInteriorCompression * modernSpacingHybridLift
);

adjusted.overall = roundStat(adjustedOverall * boardShapeMultiplier * lowGamesConfidence);
return {
  ratings: adjusted,
  context: {
    eraLabel: eraContext.eraLabel,
    fantasyBaseline: roundStat(eraContext.fantasyBaseline),
    fantasyPerGame: roundStat(fantasyPerGame),
    fantasyInflation: roundStat(eraContext.fantasyInflation),
    dominance: roundStat(dominance),
    lowGamesConfidence: lowGamesConfidence,
    olderEraInteriorScore: olderEraInteriorScore,
    olderEraInteriorCompression: olderEraInteriorCompression,
    modernSpacingHybridScore: modernSpacingHybridScore,
    modernSpacingHybridLift: modernSpacingHybridLift,
    boardShapeMultiplier: boardShapeMultiplier,
    normalizationModel: 'season_context_plus_board_shape_tuning_v1'
  }
};
```

Do not change `simulateLeagueDay()`, `PACK_TUNING`, or the low-games confidence helper in this task.

- [ ] **Step 3: Re-run the focused regressions and adjust only within the approved caps if needed**

Run:

```powershell
node .\tools\test-mixed-era-normalization-retune.js
node .\tools\test-mixed-era-top300-balance.js
```

Expected:

- `mixed-era normalization retune test passed`
- `mixed-era top300 balance test passed`

If the balance test still misses the stricter target, only adjust these caps:

- older-era compression cap: between `0.02` and `0.035`
- modern lift cap: between `0.015` and `0.03`
- premium/middle tier gates: only by moving the floor/ceiling by at most `3` overall points

Do not introduce per-player logic or a direct 2K blend.

- [ ] **Step 4: Commit the board-shape retune after the focused regressions are green**

Run:

```powershell
git add simulation-league-engine.js tools/test-mixed-era-normalization-retune.js tools/test-mixed-era-top300-balance.js
git commit -m "feat: retune mixed-era board shape"
```

### Task 3: Re-Audit The Flagship Board And Update The Calibration-Assisted Notebook

**Files:**
- Modify: `C:\Users\jabro\Documents\Vault\wee\wiki\synthesis\rosterbate-mixed-era-normalization-audit-1996-2016-top300-2026-04-20-calibration-assisted.md`
- Reference: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\mixed-era-audit.html`

- [ ] **Step 1: Start the local audit server from the active worktree**

Run:

```powershell
powershell -ExecutionPolicy Bypass -Command "& 'C:\Users\jabro\Desktop\Fantasy Project\tools\serve-local.ps1' -Port 8082 -RootPath 'C:\Users\jabro\Desktop\Fantasy Project\rosterbate'"
```

If `8082` is already taken, use:

```powershell
powershell -ExecutionPolicy Bypass -Command "& 'C:\Users\jabro\Desktop\Fantasy Project\tools\serve-local.ps1' -Port 8092 -RootPath 'C:\Users\jabro\Desktop\Fantasy Project\rosterbate'"
```

If you are executing from a worktree, substitute the active worktree root in `-RootPath` so the live audit page reflects the retuned files, not stale `main`.

- [ ] **Step 2: Re-open the live flagship board and record the retuned evidence**

Open:

```text
http://127.0.0.1:8082/mixed-era-audit.html?configId=1996-2016-top300
```

If you used `8092`, substitute that port.

Record these exact observations:

- `Top 10`, `Top 25`, `Top 50`, `Top 100`, and `Full Pool` verdicts plus composition counts
- whether `top25` improved from `16 / 9`
- whether `top50` improved from `30 / 20`
- whether `top100` stayed at or better than `60 / 40`
- calibration summary counts (`44` calibrated, `256` uncalibrated should remain unchanged)
- the top `5` over-ranked names and top `5` under-ranked names after the retune
- whether the disagreements now feel more concentrated and explainable than before

- [ ] **Step 3: Update the existing calibration-assisted notebook with the new verdict**

Edit [rosterbate-mixed-era-normalization-audit-1996-2016-top300-2026-04-20-calibration-assisted.md](</C:/Users/jabro/Documents/Vault/wee/wiki/synthesis/rosterbate-mixed-era-normalization-audit-1996-2016-top300-2026-04-20-calibration-assisted.md:1>) in place.

Keep the same section order and frontmatter, then update at least these sections with the live observations:

```md
## Composition Results
- Top 10:
- Top 25:
- Top 50:
- Top 100:
- Full Pool:

## Calibration Summary
- Calibrated Rows:
- Strongest Over-Ranked Signals:
- Strongest Under-Ranked Signals:
- Coverage Notes:

## Outcome
- 

## Next Action
- 
```

Required content:

- make the new composition counts explicit
- state whether the board moved closer to `Pass`
- say whether the modern spacing / hybrid lift improved explainability in `26-100`
- keep `2K` framed as audit evidence, not live ranking input

- [ ] **Step 4: Stop the temporary server after the notebook is saved**

Stop the localhost process started in Step 1 before moving to final verification.

### Task 4: Run The Final Verification Sweep And Confirm Cleanliness

**Files:**
- No additional repo edits intended

- [ ] **Step 1: Run the full mixed-era regression suite from the active checkout**

Run:

```powershell
node .\tools\test-mixed-era-loader.js
node .\tools\test-mixed-era-runtime.js
node .\tools\test-mixed-era-universe-summary.js
node .\tools\test-mixed-era-normalization-retune.js
node .\tools\test-mixed-era-audit-view-model.js
node .\tools\test-mixed-era-audit-page-static.js
node .\tools\test-mixed-era-top300-balance.js
node .\tools\test-mixed-era-top300-primary-wiring.js
```

Expected:

```text
mixed-era loader smoke test passed
mixed-era runtime test passed
mixed-era universe summary test passed
mixed-era normalization retune test passed
mixed-era audit view-model test passed
mixed-era audit page static test passed
mixed-era top300 balance test passed
mixed-era top300 primary wiring test passed
```

- [ ] **Step 2: Restart the local audit server and run one headless DOM verification pass**

Run the same localhost server command from Task 3, then run:

```powershell
& 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' --headless --disable-gpu --virtual-time-budget=10000 --dump-dom 'http://127.0.0.1:8082/mixed-era-audit.html?configId=1996-2016-top300'
```

If you used `8092`, substitute that port.

Expected in the dumped DOM:

- `Calibration Summary`
- `Calibrated</span><strong>44`
- `2K OVR`
- `Mismatch`

- [ ] **Step 3: Stop the temporary server and verify the checkout is clean**

Stop the localhost server, then run:

```powershell
git status --short --branch
```

Expected:

- one clean feature branch or clean worktree checkout
- no uncommitted repo changes
- the updated vault note exists outside the repo and does not dirty git
