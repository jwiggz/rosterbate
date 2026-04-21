# CPU Sim Personality Assignment Spread Retune Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retune deterministic CPU personality assignment so simulation leagues produce a healthier mix of `balanced`, `steady_floor`, `star_loyalist`, `bigs_bias`, and `guards_bias` without changing lineup behavior.

**Architecture:** Keep the season-page wiring and lineup helper untouched, and only retune the classification gates inside `buildCpuSimPersonalitiesByTeam()`. Expand the helper test to cover one deterministic mini-league whose rosters exercise the exact spread we want: one obvious star team, one new `steady_floor` team, one borderline star team that should fall to `guards_bias`, one neutral `balanced` team, one `bigs_bias` team, and one `guards_bias` team.

**Tech Stack:** Vanilla JavaScript, CommonJS-style Node test scripts, PowerShell, existing browser-global helper module loaded by `rosterbate-season.html`

---

## File map

- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-cpu-sim-personalities.js`
  - Replace the narrow assignment fixture with a richer deterministic mini-league that proves the spread retune works and preserves the bias helpers.
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/cpu-sim-personalities.js`
  - Retune only the assignment thresholds in `buildCpuSimPersonalitiesByTeam()` using constants so the helper stays readable and deterministic.
- Verify only: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-cpu-sim-lineups.js`
  - Confirms the assignment retune does not break the already-shipped lineup helper.
- Verify only: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-cpu-sim-lineup-wiring.js`
  - Confirms the season-page seam still routes through the helper safely.
- Verify only: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-drafted-universe-snapshot.js`
  - Confirms historical drafted simulation state still snapshots cleanly.
- Verify only: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-universe-slot-storage.js`
  - Confirms compact slot persistence still preserves `cpuTeamPersonalitiesByTeam`.

### Task 1: Encode the spread-retune targets in the helper test

**Files:**
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-cpu-sim-personalities.js`
- Test: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-cpu-sim-personalities.js`

- [ ] **Step 1: Rewrite the helper fixture to cover the full deterministic spread**

Replace the contents of `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-cpu-sim-personalities.js` with:

```js
const assert = require('node:assert/strict');
const cpuSimPersonalities = require('../cpu-sim-personalities.js');

function makePlayer(id, pos, ratings) {
  return {
    id,
    pos,
    simProfile: {
      ratings: {
        overall: ratings.overall,
        usage: ratings.usage,
        scoring: ratings.scoring,
        playmaking: ratings.playmaking,
        defense: ratings.defense,
        rebounding: ratings.rebounding
      }
    }
  };
}

const starHeavyRoster = [
  makePlayer(1, 'PG', {
    overall: 93,
    usage: 95,
    scoring: 92,
    playmaking: 91,
    defense: 70,
    rebounding: 54
  }),
  makePlayer(2, 'C', {
    overall: 82,
    usage: 69,
    scoring: 74,
    playmaking: 50,
    defense: 86,
    rebounding: 91
  })
];

const steadyFloorTargetRoster = [
  makePlayer(11, 'PG', {
    overall: 72,
    usage: 60,
    scoring: 65,
    playmaking: 64,
    defense: 61,
    rebounding: 38
  }),
  makePlayer(12, 'PF', {
    overall: 75,
    usage: 57,
    scoring: 64,
    playmaking: 50,
    defense: 73,
    rebounding: 71
  })
];

const borderlineStarGuardRoster = [
  makePlayer(21, 'PG', {
    overall: 82,
    usage: 77,
    scoring: 81,
    playmaking: 88,
    defense: 61,
    rebounding: 39
  }),
  makePlayer(22, 'SG', {
    overall: 80,
    usage: 74,
    scoring: 79,
    playmaking: 79,
    defense: 63,
    rebounding: 44
  })
];

const balancedTargetRoster = [
  makePlayer(31, 'PG', {
    overall: 70,
    usage: 58,
    scoring: 63,
    playmaking: 62,
    defense: 59,
    rebounding: 36
  }),
  makePlayer(32, 'PF', {
    overall: 73,
    usage: 55,
    scoring: 61,
    playmaking: 47,
    defense: 70,
    rebounding: 68
  })
];

const bigHeavyRoster = [
  makePlayer(41, 'C', {
    overall: 84,
    usage: 68,
    scoring: 73,
    playmaking: 40,
    defense: 87,
    rebounding: 93
  }),
  makePlayer(42, 'PF', {
    overall: 81,
    usage: 63,
    scoring: 70,
    playmaking: 48,
    defense: 82,
    rebounding: 86
  })
];

const guardHeavyRoster = [
  makePlayer(51, 'PG', {
    overall: 76,
    usage: 69,
    scoring: 75,
    playmaking: 81,
    defense: 58,
    rebounding: 38
  }),
  makePlayer(52, 'SG', {
    overall: 75,
    usage: 67,
    scoring: 74,
    playmaking: 76,
    defense: 59,
    rebounding: 41
  })
];

const bigProfile = makePlayer(61, 'C', {
  overall: 81,
  usage: 70,
  scoring: 74,
  playmaking: 45,
  defense: 84,
  rebounding: 90
});

const guardProfile = makePlayer(62, 'PG', {
  overall: 81,
  usage: 73,
  scoring: 79,
  playmaking: 85,
  defense: 61,
  rebounding: 41
});

const comboBig = makePlayer(63, 'F/C', {
  overall: 82,
  usage: 68,
  scoring: 74,
  playmaking: 48,
  defense: 86,
  rebounding: 91
});

const assignedA = cpuSimPersonalities.buildCpuSimPersonalitiesByTeam({
  teamCount: 7,
  myPos: 0,
  rosters: [
    starHeavyRoster,
    starHeavyRoster,
    steadyFloorTargetRoster,
    borderlineStarGuardRoster,
    balancedTargetRoster,
    bigHeavyRoster,
    guardHeavyRoster
  ]
});

const assignedB = cpuSimPersonalities.buildCpuSimPersonalitiesByTeam({
  teamCount: 7,
  myPos: 0,
  rosters: [
    starHeavyRoster,
    starHeavyRoster,
    steadyFloorTargetRoster,
    borderlineStarGuardRoster,
    balancedTargetRoster,
    bigHeavyRoster,
    guardHeavyRoster
  ]
});

assert.deepStrictEqual(
  assignedA,
  assignedB,
  'expected deterministic assignment for the same league state'
);

assert.deepStrictEqual(
  assignedA,
  [
    'balanced',
    'star_loyalist',
    'steady_floor',
    'guards_bias',
    'balanced',
    'bigs_bias',
    'guards_bias'
  ],
  'expected the spread retune fixture to produce a healthier deterministic mix'
);

assert.equal(
  cpuSimPersonalities.getCpuSimTeamPersonality(3, null),
  'balanced',
  'expected missing personality state to fall back to balanced'
);

assert.ok(
  cpuSimPersonalities.getCpuSimPersonalityBias(bigProfile, 'bigs_bias') >
    cpuSimPersonalities.getCpuSimPersonalityBias(guardProfile, 'bigs_bias'),
  'expected bigs_bias to favor frontcourt profiles'
);

assert.ok(
  cpuSimPersonalities.getCpuSimPersonalityBias(guardProfile, 'guards_bias') >
    cpuSimPersonalities.getCpuSimPersonalityBias(bigProfile, 'guards_bias'),
  'expected guards_bias to favor guard/creator profiles'
);

assert.ok(
  cpuSimPersonalities.getCpuSimPersonalityBias(comboBig, 'bigs_bias') >
    cpuSimPersonalities.getCpuSimPersonalityBias(guardProfile, 'bigs_bias'),
  'expected F/C combo bigs to benefit from the frontcourt bias'
);

assert.ok(
  cpuSimPersonalities.getCpuSimStableThresholdDelta(
    makePlayer(71, 'SG', {
      overall: 92,
      usage: 94,
      scoring: 91,
      playmaking: 89,
      defense: 73,
      rebounding: 58
    }),
    'star_loyalist'
  ) >
    cpuSimPersonalities.getCpuSimStableThresholdDelta(
      makePlayer(72, 'SG', {
        overall: 76,
        usage: 70,
        scoring: 74,
        playmaking: 68,
        defense: 70,
        rebounding: 60
      }),
      'star_loyalist'
    ),
  'expected star_loyalist to preserve stars more strongly'
);

console.log('cpu sim personalities helper test passed');
```

- [ ] **Step 2: Run the helper test to verify it fails for the right reason**

Run:

```powershell
node .\tools\test-cpu-sim-personalities.js
```

Expected: FAIL on the new spread assertion because the current helper still returns `guards_bias` for the `steadyFloorTargetRoster` slot and `star_loyalist` for the `borderlineStarGuardRoster` slot.

- [ ] **Step 3: Commit the failing test target**

```powershell
git add -- "C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-cpu-sim-personalities.js"
git commit -m "test: encode cpu personality spread targets"
```

### Task 2: Retune only the deterministic assignment gates

**Files:**
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/cpu-sim-personalities.js`
- Test: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-cpu-sim-personalities.js`

- [ ] **Step 1: Introduce named assignment-threshold constants**

Add these constants just below `NON_STAR_PERSONALITIES` in `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/cpu-sim-personalities.js`:

```js
  const STAR_LOYALIST_SIGNAL_THRESHOLD = 14600;
  const STAR_LOYALIST_OVERALL_THRESHOLD = 91;
  const STAR_LOYALIST_USAGE_THRESHOLD = 89;
  const POSITION_LEAN_GAP_THRESHOLD = 75;
  const STEADY_FLOOR_AVERAGE_SHAPE_THRESHOLD = 238;
  const STEADY_FLOOR_LEAN_GAP_THRESHOLD = 85;
```

- [ ] **Step 2: Retune `buildCpuSimPersonalitiesByTeam()` to use the new gates**

Replace the current classification block inside `buildCpuSimPersonalitiesByTeam()` with:

```js
      if (
        summary.topStarSignal >= STAR_LOYALIST_SIGNAL_THRESHOLD ||
        (
          summary.topOverall >= STAR_LOYALIST_OVERALL_THRESHOLD &&
          summary.topUsage >= STAR_LOYALIST_USAGE_THRESHOLD
        )
      ) {
        return 'star_loyalist';
      }

      if (summary.bigLean >= summary.guardLean + POSITION_LEAN_GAP_THRESHOLD) {
        return 'bigs_bias';
      }

      if (summary.guardLean >= summary.bigLean + POSITION_LEAN_GAP_THRESHOLD) {
        return 'guards_bias';
      }

      const averageShape = summary.playerCount > 0 ? summary.shapeScore / summary.playerCount : 0;
      if (
        averageShape >= STEADY_FLOOR_AVERAGE_SHAPE_THRESHOLD &&
        Math.abs(summary.bigLean - summary.guardLean) <= STEADY_FLOOR_LEAN_GAP_THRESHOLD
      ) {
        return 'steady_floor';
      }

      return chooseBaselinePersonality(teamIdx, summary);
```

This keeps the model single-pass and deterministic while making:
- `star_loyalist` more selective
- `bigs_bias` and `guards_bias` require a stronger lean gap
- `steady_floor` easier for all-around rosters to earn
- `balanced` appear more often through the existing baseline fallback

- [ ] **Step 3: Run the focused helper test to verify the retune passes**

Run:

```powershell
node .\tools\test-cpu-sim-personalities.js
```

Expected: PASS with `cpu sim personalities helper test passed`.

- [ ] **Step 4: Commit the helper retune**

```powershell
git add -- "C:/Users/jabro/Desktop/Fantasy Project/rosterbate/cpu-sim-personalities.js" "C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-cpu-sim-personalities.js"
git commit -m "feat: retune cpu personality assignment spread"
```

### Task 3: Verify no lineup or persistence regressions and spot-check the live spread

**Files:**
- Verify only: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-cpu-sim-lineups.js`
- Verify only: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-cpu-sim-lineup-wiring.js`
- Verify only: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-drafted-universe-snapshot.js`
- Verify only: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-universe-slot-storage.js`

- [ ] **Step 1: Run the focused regression sweep**

Run:

```powershell
node .\tools\test-cpu-sim-personalities.js
node .\tools\test-cpu-sim-lineups.js
node .\tools\test-cpu-sim-lineup-wiring.js
node .\tools\test-historical-drafted-universe-snapshot.js
node .\tools\test-historical-universe-slot-storage.js
```

Expected:
- `cpu sim personalities helper test passed`
- `cpu sim lineups helper test passed`
- `cpu sim lineup wiring seam test passed`
- `historical drafted universe snapshot test passed`
- `historical universe slot storage test passed`

- [ ] **Step 2: Do one live browser spot-check against the season page**

Run:

```powershell
Start-Process powershell -ArgumentList '-NoExit','-Command','Set-Location "C:/Users/jabro/Desktop/Fantasy Project/rosterbate"; python -m http.server 8082'
Start-Process msedge.exe 'http://127.0.0.1:8082/rosterbate-season.html?historical=sim'
```

Then in the browser:
1. Start a `1995-96` historical simulation season.
2. Open DevTools and evaluate `D.cpuTeamPersonalitiesByTeam`.
3. Count the entries manually or with:

```js
D.cpuTeamPersonalitiesByTeam.reduce((counts, value) => {
  counts[value] = (counts[value] || 0) + 1;
  return counts;
}, {})
```

Expected:
- at least one `balanced`
- at least one `steady_floor`
- `bigs_bias` visibly lower than the QA checkpoint’s `20`
- no blank, missing, or invalid personality strings

- [ ] **Step 3: Confirm the worktree is clean after verification**

Run:

```powershell
git status --short --branch
```

Expected: clean branch state with only the two planned commits from Task 1 and Task 2.
