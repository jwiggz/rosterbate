# Mixed-Era Top 100 Pass Retune Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retune the flagship `1996-2016-top300` mixed-era board so `Top 100` upgrades from `Tune` to `Pass` while preserving the already-good `Top 10`, `Top 25`, and `Top 50` slices.

**Architecture:** Keep this pass inside the existing mixed-era rating pipeline in [simulation-league-engine.js](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/simulation-league-engine.js:288). Tighten the balance regression first, then extend the existing `1995-96` interior compression and `2015-16` spacing / hybrid lift deeper into the `51-100` band by lowering the tier-gate floors before touching intensity caps. Rerun the live calibration-assisted audit and update the existing flagship notebook with the new verdict.

**Tech Stack:** Vanilla JS runtime, CommonJS Node tests, PowerShell localhost verification, Edge headless DOM checks, Markdown vault notes.

---

## File Map

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-league-engine.js`
  Purpose: extend the current board-shape gates deeper into the premium-middle band without changing sim-game behavior.

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-mixed-era-top300-balance.js`
  Purpose: tighten the flagship board regression so `Top 100` must now pass, not merely stay out of fail.

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-mixed-era-normalization-retune.js`
  Purpose: verify the deeper `51-100` gate behavior directionally and preserve the existing low-games protections.

- `C:\Users\jabro\Documents\Vault\wee\wiki\synthesis\rosterbate-mixed-era-normalization-audit-1996-2016-top300-2026-04-20-calibration-assisted.md`
  Purpose: update the existing flagship calibration-assisted notebook after the new live board is verified.

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\mixed-era-audit.html`
  Purpose: no intended code change in this plan; it is the live consumer used for the re-audit.

### Task 1: Tighten The `Top 100` Regressions Before Changing The Model

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-mixed-era-top300-balance.js`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-mixed-era-normalization-retune.js`

- [ ] **Step 1: Tighten the flagship balance test so the current board fails on `Top 100`**

In [tools/test-mixed-era-top300-balance.js](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/tools/test-mixed-era-top300-balance.js:1), replace the current assertion block with:

```js
assert.equal(mustGetCheck('top10').verdict, 'pass');
assertNotFailWithMaxDominantShare('top25', 60);
assertNotFailWithMaxDominantShare('top50', 58);
assert.equal(mustGetCheck('top100').verdict, 'pass');
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

Keep the helper functions and the final `console.log('mixed-era top300 balance test passed');` line exactly as they are.

- [ ] **Step 2: Add a failing directional regression that proves the board-shape gates must now reach into `51-100`**

In [tools/test-mixed-era-normalization-retune.js](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/tools/test-mixed-era-normalization-retune.js:1), keep the current low-games and premium-tier assertions, then append these two mid-tier fixtures and assertions immediately before the final `console.log`:

```js
const classicInteriorMidTierMixedEra = engine.buildMixedEraRatings(
  {
    usage: 60,
    scoring: 60,
    rebounding: 70,
    playmaking: 48,
    defense: 65,
    shooting: 48,
    stamina: 72,
    tempo: 68,
    volatility: 54
  },
  {
    pts: 17.6,
    reb: 10.4,
    ast: 2.1,
    stl: 0.9,
    blk: 2.0,
    to: 2.3,
    min: 32.8,
    fgm: 7.0,
    fga: 14.8,
    ftm: 3.5,
    fta: 4.8,
    threes: 0.1
  },
  2460,
  82,
  'nba_1996_full_season_v1'
);

const modernSpacingHybridMidTierMixedEra = engine.buildMixedEraRatings(
  {
    usage: 54,
    scoring: 54,
    rebounding: 58,
    playmaking: 54,
    defense: 56,
    shooting: 66,
    stamina: 70,
    tempo: 70,
    volatility: 54
  },
  {
    pts: 16.8,
    reb: 6.7,
    ast: 4.2,
    stl: 1.0,
    blk: 1.1,
    to: 2.2,
    min: 31.4,
    fgm: 6.2,
    fga: 13.5,
    ftm: 2.4,
    fta: 3.1,
    threes: 2.0
  },
  2296,
  82,
  'nba_2016_full_season_v1'
);

assert.ok(classicInteriorMidTierMixedEra.context.olderEraInteriorScore > 0.5);
assert.ok(classicInteriorMidTierMixedEra.context.olderEraInteriorCompression < 1);
assert.ok(classicInteriorMidTierMixedEra.context.boardShapeMultiplier < 1);
assert.ok(modernSpacingHybridMidTierMixedEra.context.modernSpacingHybridScore > 0.35);
assert.ok(modernSpacingHybridMidTierMixedEra.context.modernSpacingHybridLift > 1);
assert.ok(modernSpacingHybridMidTierMixedEra.context.boardShapeMultiplier > 1);
```

These fixtures are intentionally set near the current gate floors so the test proves the next pass actually reaches beyond the very top premium slice.

- [ ] **Step 3: Run the focused regressions and confirm both fail before implementation**

Run:

```powershell
node .\tools\test-mixed-era-top300-balance.js
node .\tools\test-mixed-era-normalization-retune.js
```

Expected:

- `test-mixed-era-top300-balance.js` fails because `top100` is still `Tune`
- `test-mixed-era-normalization-retune.js` fails because the new mid-tier fixtures still have neutral board-shape multipliers under the current gate floors

### Task 2: Extend The Existing Board-Shape Gates Deeper Into `51-100`

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-league-engine.js`

- [ ] **Step 1: Lower the tier-gate floors without changing the current compression and lift caps**

In [simulation-league-engine.js](/C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/simulation-league-engine.js:320), replace the current gate lines:

```js
const premiumTierGate = getPremiumTierGate(adjustedOverall, 60, 76);
const middleTierGate = getPremiumTierGate(adjustedOverall, 58, 76);
```

with:

```js
const premiumTierGate = getPremiumTierGate(adjustedOverall, 58, 76);
const middleTierGate = getPremiumTierGate(adjustedOverall, 55, 76);
```

Do not change these lines in the same step:

```js
const olderEraInteriorCompression = packId === 'nba_1996_full_season_v1'
  ? 1 - olderEraInteriorScore * premiumTierGate * 0.035
  : 1;
const modernSpacingHybridLift = packId === 'nba_2016_full_season_v1'
  ? 1 + modernSpacingHybridScore * middleTierGate * 0.015
  : 1;
```

Also keep the current precision behavior intact: preserve full precision internally and continue rounding only in the exposed `context` object.

- [ ] **Step 2: Run the focused regressions after the gate-only retune**

Run:

```powershell
node .\tools\test-mixed-era-top300-balance.js
node .\tools\test-mixed-era-normalization-retune.js
```

Expected:

- `test-mixed-era-normalization-retune.js` passes because the new mid-tier fixtures now receive non-neutral multipliers
- `test-mixed-era-top300-balance.js` either passes outright or fails only on `top100`

- [ ] **Step 3: Apply one measured fallback gate adjustment only if `top100` still fails**

Only if Step 2 still fails on `top100`, replace:

```js
const premiumTierGate = getPremiumTierGate(adjustedOverall, 58, 76);
const middleTierGate = getPremiumTierGate(adjustedOverall, 55, 76);
```

with:

```js
const premiumTierGate = getPremiumTierGate(adjustedOverall, 57, 76);
const middleTierGate = getPremiumTierGate(adjustedOverall, 54, 76);
```

Do not change the `0.035` or `0.015` caps in this fallback step. If this fallback still leaves `top100` failing, stop and re-brainstorm instead of inventing stronger levers inside execution.

- [ ] **Step 4: Re-run the focused regressions and confirm they both pass**

Run the same two commands from Step 2 again.

Expected:

```text
mixed-era top300 balance test passed
mixed-era normalization retune test passed
```

- [ ] **Step 5: Commit the gate retune and updated regressions**

Run:

```powershell
git add simulation-league-engine.js tools/test-mixed-era-top300-balance.js tools/test-mixed-era-normalization-retune.js
git commit -m "feat: retune mixed-era top100 balance"
```

### Task 3: Re-Audit The Flagship Board And Update The Existing Notebook

**Files:**
- Modify: `C:\Users\jabro\Documents\Vault\wee\wiki\synthesis\rosterbate-mixed-era-normalization-audit-1996-2016-top300-2026-04-20-calibration-assisted.md`
- Reference: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\mixed-era-audit.html`

- [ ] **Step 1: Start the localhost audit server from the active checkout root**

From the active checkout root, run:

```powershell
powershell -ExecutionPolicy Bypass -Command "& 'C:\Users\jabro\Desktop\Fantasy Project\tools\serve-local.ps1' -Port 8082 -RootPath (Get-Location).Path"
```

If `8082` is unavailable, rerun the same command with `-Port 8092` and substitute that port in the next steps.

- [ ] **Step 2: Inspect the live `1996-2016-top300` audit page and record the real post-retune outcome**

Open:

```text
http://127.0.0.1:8082/mixed-era-audit.html?configId=1996-2016-top300
```

Record these exact observations from the live page:

- `Top 10`, `Top 25`, `Top 50`, `Top 100`, and `Full Pool` verdicts and era splits
- calibrated and uncalibrated row counts
- the top `5` over-ranked names in the calibration summary
- the top `5` under-ranked names in the calibration summary
- whether the `51-100` band now reads as healthier and more explainable than before

- [ ] **Step 3: Update the existing calibration-assisted notebook in place**

Edit [rosterbate-mixed-era-normalization-audit-1996-2016-top300-2026-04-20-calibration-assisted.md](</C:/Users/jabro/Documents/Vault/wee/wiki/synthesis/rosterbate-mixed-era-normalization-audit-1996-2016-top300-2026-04-20-calibration-assisted.md:1>) in place.

Keep the same frontmatter and section order, then update at least these sections with the live observations:

```md
## Board Context
- Provenance:
- Evidence Source:

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

## Tier Integrity Notes
- 1-10:
- 11-25:
- 26-50:
- 51-100:
- 101-150:

## Outcome
- `Pass` or `Tune`

## Next Action
- record whether the flagship board is now ready to treat as stable, or whether one more retune is still needed
```

Required content:

- update the provenance to the active branch/worktree and current repo head used for the live audit
- explicitly state whether `Top 100` moved from `Tune` to `Pass`
- summarize whether the stronger remaining disagreements are still concentrated in older-era interior profiles, modern spacing/hybrid gaps, or both
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

- [ ] **Step 2: Run one headless DOM check against the live audit page**

Start the same localhost server command from Task 3, then run:

```powershell
& 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' --headless --disable-gpu --virtual-time-budget=10000 --dump-dom 'http://127.0.0.1:8082/mixed-era-audit.html?configId=1996-2016-top300'
```

If you used `8092`, substitute that port.

Expected in the dumped DOM:

- `Calibration Summary`
- `2K OVR`
- `Mismatch`
- `Top 100`

- [ ] **Step 3: Stop the temporary server and confirm the checkout is clean**

Run:

```powershell
git status --short --branch
```

Expected:

- the active branch is ahead of its base by the new retune commit
- there are no unstaged or staged repo changes left
