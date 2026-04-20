# Mixed-Era Normalization Retune Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retune the flagship `1996-2016-top300` mixed-era board so it no longer fails the `top100` audit slice, removes sub-`25 GP` premium-tier outliers, and stays exciting at the top.

**Architecture:** Keep the mixed-era board assembly and authored content unchanged. Add one low-games-played confidence multiplier inside `simulation-league-engine.js`, soften the `nba_1996_full_season_v1` era-context constants, then prove the effect with one focused profile regression and one real-board audit regression before rerunning the full mixed-era verification sweep and updating the audit notebook.

**Tech Stack:** Vanilla JavaScript, CommonJS Node scripts, static HTML audit page, PowerShell localhost tooling, Markdown vault notes.

---

## File Map

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-league-engine.js`
  Purpose: retune the `nba_1996_full_season_v1` mixed-era context and add the under-`25 GP` mixed-era confidence penalty without changing raw season stats or the draft/runtime pipeline.

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-mixed-era-normalization-retune.js`
  Purpose: prove a low-games-played player with the same per-game production receives a meaningfully lower `mixedEraOverall` and exposes the new `lowGamesConfidence` metadata.

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-mixed-era-top300-balance.js`
  Purpose: build the real `1996-2016-top300` board from the authored packs and assert the post-retune audit shape: `top10` still passes, `top100` becomes `tune`, `top25`/`top50` improve, and no sub-`25 GP` player remains in `top25`.

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-mixed-era-loader.js`
  Purpose: regression-only rerun; no edits planned.

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-mixed-era-runtime.js`
  Purpose: regression-only rerun; no edits planned.

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-mixed-era-universe-summary.js`
  Purpose: regression-only rerun; no edits planned.

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-mixed-era-audit-view-model.js`
  Purpose: regression-only rerun; no edits planned.

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-mixed-era-audit-page-static.js`
  Purpose: regression-only rerun; no edits planned.

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-mixed-era-top300-primary-wiring.js`
  Purpose: regression-only rerun; no edits planned.

- `C:\Users\jabro\Documents\Vault\wee\wiki\synthesis\rosterbate-mixed-era-normalization-audit-1996-2016-top300-2026-04-20.md`
  Purpose: replace the first official audit result with the post-retune audit result after the code and verification pass land.

### Task 1: Add The Low-Games-Played Regression And Confidence Rule

**Files:**
- Create: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-mixed-era-normalization-retune.js`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-league-engine.js:31-68`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-league-engine.js:226-267`

- [ ] **Step 1: Write the failing low-games-played regression**

Create `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-mixed-era-normalization-retune.js` with this exact content:

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

const durableProfile = engine.buildPlayerSimulationProfile(fullSeasonPlayer, {
  packId: 'nba_1996_full_season_v1'
});
const shortProfile = engine.buildPlayerSimulationProfile(shortSeasonPlayer, {
  packId: 'nba_1996_full_season_v1'
});

assert.equal(durableProfile.mixedEraContext.lowGamesConfidence, 1);
assert.equal(shortProfile.mixedEraContext.lowGamesConfidence, 0.89);
assert.ok(
  shortProfile.mixedEraRatings.overall <= durableProfile.mixedEraRatings.overall - 8,
  `expected low-games profile to trail durable profile by at least 8 points, got durable=${durableProfile.mixedEraRatings.overall} short=${shortProfile.mixedEraRatings.overall}`
);
assert.ok(
  shortProfile.mixedEraRatings.overall < durableProfile.mixedEraRatings.overall,
  'expected low-games profile to have a lower mixedEraOverall'
);

console.log('mixed-era normalization retune test passed');
```

- [ ] **Step 2: Run the low-games-played regression and verify it fails first**

Run:

```powershell
node .\tools\test-mixed-era-normalization-retune.js
```

Expected: FAIL because `mixedEraContext.lowGamesConfidence` does not exist yet and the low-games sample still ranks too close to the full-season version.

- [ ] **Step 3: Add the low-games-played confidence helper and wire it into `mixedEraOverall`**

In `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-league-engine.js`, add this helper just below `getPackEraContext`:

```js
function getLowGamesMixedEraConfidence(gp){
  const games=clamp(gp, 0, 82);
  if(games >= 25) return 1;
  return roundStat(clamp(0.72 + (games / 25) * 0.28, 0.72, 1));
}
```

Then update `buildMixedEraRatings` to use it:

```js
function buildMixedEraRatings(rawRatings, baseline, totalFantasyPoints, gp, packId){
  const eraContext=getPackEraContext(packId);
  const fantasyPerGame = gp > 0 && totalFantasyPoints > 0
    ? totalFantasyPoints / gp
    : computeFantasyPoints(baseline);
  const dominance = clamp((fantasyPerGame / Math.max(1, eraContext.fantasyBaseline)) - 1, -0.28, 0.72);
  const dominanceLift = 1 + dominance * Number(eraContext.dominanceWeight || 0.12);
  const lowGamesConfidence=getLowGamesMixedEraConfidence(gp);
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
  adjusted.overall=roundStat((
    adjusted.scoring * 0.28 +
    adjusted.rebounding * 0.16 +
    adjusted.playmaking * 0.18 +
    adjusted.defense * 0.15 +
    adjusted.shooting * 0.11 +
    adjusted.stamina * 0.07 +
    adjusted.usage * 0.05
  ) * lowGamesConfidence);
  return {
    ratings:adjusted,
    context:{
      eraLabel:eraContext.eraLabel,
      fantasyBaseline:roundStat(eraContext.fantasyBaseline),
      fantasyPerGame:roundStat(fantasyPerGame),
      fantasyInflation:roundStat(eraContext.fantasyInflation),
      dominance:roundStat(dominance),
      lowGamesConfidence:roundStat(lowGamesConfidence),
      normalizationModel:'season_context_plus_light_authored_tuning'
    }
  };
}
```

- [ ] **Step 4: Run the regression again and verify it passes**

Run:

```powershell
node .\tools\test-mixed-era-normalization-retune.js
```

Expected:

```text
mixed-era normalization retune test passed
```

- [ ] **Step 5: Commit the low-games-played retune**

Run:

```powershell
git add simulation-league-engine.js tools/test-mixed-era-normalization-retune.js
git commit -m "fix: penalize low-games mixed-era outliers"
```

Expected: one commit containing the new confidence helper and its regression.

### Task 2: Add The Real-Board Audit Regression And Retune `1995-96`

**Files:**
- Create: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-mixed-era-top300-balance.js`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-league-engine.js:43-67`

- [ ] **Step 1: Write the failing real-board audit regression**

Create `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-mixed-era-top300-balance.js` with this exact content:

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

global.window = globalThis;
require('../simulation-league-engine.js');
const runtime = require('../mixed-era-runtime.js');

const root = path.resolve(__dirname, '..');

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(root, relPath), 'utf8'));
}

const config = Object.assign(
  { mixedEraConfigId: '1996-2016-top300' },
  readJson('historical-packs/mixed-era/1996-2016-top300.json')
);

const bundles = config.sourcePackIds.map((packId) => ({
  manifest: readJson(`historical-packs/${packId}/manifest.json`),
  season: readJson(`historical-packs/${packId}/season.json`),
  teams: readJson(`historical-packs/${packId}/teams.json`),
  players: readJson(`historical-packs/${packId}/players.json`)
}));

const context = runtime.buildMixedEraDraftContextFromBundles({
  config,
  bundles,
  requestedSport: config.sport,
  buildPlayerSimulationProfile: globalThis.RosterBateSimulationEngine.buildPlayerSimulationProfile
});

const audit = runtime.buildMixedEraAuditViewModel({
  config,
  playerPool: context.playerPool
});

function getCheck(id) {
  return audit.compositionChecks.find((check) => check.id === id);
}

assert.equal(getCheck('top10').verdict, 'pass');
assert.deepStrictEqual(getCheck('top25').composition, {
  nba_1996_full_season_v1: 16,
  nba_2016_full_season_v1: 9
});
assert.equal(getCheck('top25').verdict, 'tune');
assert.deepStrictEqual(getCheck('top50').composition, {
  nba_1996_full_season_v1: 30,
  nba_2016_full_season_v1: 20
});
assert.equal(getCheck('top50').verdict, 'tune');
assert.deepStrictEqual(getCheck('top100').composition, {
  nba_1996_full_season_v1: 60,
  nba_2016_full_season_v1: 40
});
assert.equal(getCheck('top100').verdict, 'tune');
assert.equal(getCheck('fullPool').verdict, 'pass');
assert.deepStrictEqual(
  audit.rows.filter((row) => row.rank <= 25 && row.gamesPlayed < 25),
  []
);

const webber = audit.rows.find((row) => row.player === 'Chris Webber');
assert.ok(webber, 'expected Chris Webber to be present in the mixed-era board');
assert.ok(webber.rank >= 50, `expected Chris Webber to fall out of premium tiers, got rank ${webber.rank}`);

console.log('mixed-era top300 balance test passed');
```

- [ ] **Step 2: Run the real-board regression and verify it fails first**

Run:

```powershell
node .\tools\test-mixed-era-top300-balance.js
```

Expected: FAIL on the pre-retune board because it currently produces:
- `top25`: `17 / 8`
- `top50`: `32 / 18`
- `top100`: `62 / 38`
- `Chris Webber` at `rank 15`
- one sub-`25 GP` player still inside `top25`

- [ ] **Step 3: Soften the `1995-96` era-context constants**

In `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-league-engine.js`, replace the `nba_1996_full_season_v1` context with this exact block:

```js
    nba_1996_full_season_v1:{
      eraLabel:'1995-96',
      fantasyBaseline:39.2,
      fantasyInflation:1,
      scoringInflation:1,
      playmakingInflation:1,
      spacingInflation:0.96,
      reboundingInflation:1.01,
      defenseEventInflation:1.02,
      tempoInflation:0.99,
      dominanceWeight:0.07
    },
```

Leave the `nba_2016_full_season_v1` context unchanged.

- [ ] **Step 4: Run the retune regressions and verify they both pass**

Run:

```powershell
node .\tools\test-mixed-era-normalization-retune.js
node .\tools\test-mixed-era-top300-balance.js
```

Expected:

```text
mixed-era normalization retune test passed
mixed-era top300 balance test passed
```

- [ ] **Step 5: Commit the flagship-board retune**

Run:

```powershell
git add simulation-league-engine.js tools/test-mixed-era-top300-balance.js
git commit -m "fix: rebalance flagship mixed-era board"
```

Expected: one commit containing the `1995-96` context softening and the real-board balance regression.

### Task 3: Run The Full Verification Sweep And Update The Audit Notebook

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

- [ ] **Step 2: Start the correct localhost server for the audit page**

Run this in a dedicated terminal window, or start it in the background with `Start-Process`:

```powershell
powershell -ExecutionPolicy Bypass -Command "& 'C:\Users\jabro\Desktop\Fantasy Project\tools\serve-local.ps1' -Port 8082 -RootPath 'C:\Users\jabro\Desktop\Fantasy Project\rosterbate'"
```

Expected: the local server starts successfully. Use `-RootPath`, not `-Root`.

- [ ] **Step 3: Verify the live audit page for the flagship board**

Open:

```text
http://127.0.0.1:8082/mixed-era-audit.html?configId=1996-2016-top300
```

Verify all of these manually:
- selector resolves `1996-2016-top300`
- `top10` still shows `Pass`
- `top25` shows `Tune` with `1996: 16`, `2016: 9`
- `top50` shows `Tune` with `1996: 30`, `2016: 20`
- `top100` shows `Tune` with `1996: 60`, `2016: 40`
- `fullPool` stays `Pass` with `150 / 150`
- no sub-`25 GP` player appears in the first `25` rows
- `Chris Webber` is no longer in the premium tier and sits at or below `rank 50`
- the board still feels exciting and defensible in the first two rounds

- [ ] **Step 4: Update the audit notebook with the post-retune result**

Edit `C:\Users\jabro\Documents\Vault\wee\wiki\synthesis\rosterbate-mixed-era-normalization-audit-1996-2016-top300-2026-04-20.md` so these sections read exactly like this:

```md
## Composition Results
- Top 10: `Pass` - `1996: 6`, `2016: 4` (`60% / 40%`). The top of the board still clears the flagship threshold and remains competitive enough to feel believable.
- Top 25: `Tune` - `1996: 16`, `2016: 9` (`64% / 36%`). This is improved from the first audit and no longer feels as captured by `1995-96`, but it still leans older-era enough to keep the board out of `Pass`.
- Top 50: `Tune` - `1996: 30`, `2016: 20` (`60% / 40%`). The middle premium tier is healthier than before, but still tilted toward `1995-96`.
- Top 100: `Tune` - `1996: 60`, `2016: 40` (`60% / 40%`). The board no longer hard-fails the flagship composition check, which is the biggest trust improvement from this retune.
- Full Pool: `Pass` - `1996: 150`, `2016: 150` (`50% / 50%`). The authored pool shape remains correct, so the retune improved ranking trust without touching content composition.

## Star Fairness Notes
- The top-star conversation is healthier than in the first audit.
- `Michael Jordan` is back inside the top `10`, which removes one of the clearest headline trust breaks from the first pass.
- The top of the board is still big-heavy, especially around the `Hakeem / Robinson / Shaq` cluster, but it no longer feels as hostile to the modern-era anchors.
- Verdict: `Tune`. The stars are more believable than before, but the flagship board still needs one more normalization pass before it can be treated as fully stable.

## Tier Integrity Notes
- 1-10: `Pass` - the top tier still feels exciting and cross-era enough to support the flagship fantasy.
- 11-25: `Tune` - the band is no longer visibly captured the way it was in the first audit, but it still leans `1995-96`.
- 26-50: `Tune` - improved, but still older-era weighted.
- 51-100: `Tune` - improved enough to remove the prior hard fail, but still not neutral.
- 101-150: `Pass` - still healthy and plausibly mixed.

## Raw vs Normalized Sanity Notes
- The most obvious small-sample trust break is gone from the premium tier.
- `Chris Webber` is no longer sitting in the top `15`, which makes the board substantially easier to trust.
- The board still looks directionally believable, but not fully settled.
- Verdict: `Tune`.

## Draft-Feel Verdict
- The room is still exciting and draftable.
- The crossover fantasy remains strong, and the upper-middle rounds feel more credible than before.
- The board is now easier to trust, but still not clean enough to upgrade all the way to `Pass`.
- Verdict: `Tune`.

## Outcome
- `Tune`

Reason:
- The retune removed the `top100` hard fail and pushed the clearest low-games outlier out of the premium tier.
- The board is healthier, but `top25` and `top50` still lean enough toward `1995-96` that the flagship board still wants another pass before it is treated as stable.

## Next Action
- `retune normalization`

Recommended focus for the next pass:
- keep `top10` stable
- keep sub-`25 GP` outliers out of premium tiers
- continue reducing `1995-96` overrepresentation in `11-25`, `26-50`, and `51-100`
- look for one more modest normalization pass before considering the board ready for a final flagship verdict
```

- [ ] **Step 5: Stop the temporary localhost process and leave the repo clean**

If you started the server in the background, stop it explicitly. Then run:

```powershell
git status --short
```

Expected:
- no unexpected repo changes beyond the committed retune work
- the vault note update is complete

No additional repo commit is expected in this task unless manual verification exposes a new code bug that requires a follow-up fix.
