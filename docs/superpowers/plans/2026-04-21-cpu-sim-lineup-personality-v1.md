# CPU Sim Lineup Personality V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a lineup-only CPU personality layer for simulation universes so CPU teams make more distinct starter decisions without changing actual sim output.

**Architecture:** Introduce one small pure helper module for deterministic personality assignment and bias math, then thread the chosen personality through the existing `cpu-sim-lineups.js` scorer and the season-page CPU lineup seam. Persist personalities in a parallel per-team state array because this codebase stores team names and rosters in arrays rather than rich team objects.

**Tech Stack:** Vanilla JavaScript, browser globals, CommonJS-style Node test scripts, PowerShell, VM-based seam tests against `rosterbate-season.html`

---

## File map

- Create: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/cpu-sim-personalities.js`
  - Pure helper for deterministic personality assignment, safe fallback lookup, candidate bias math, and stable-threshold deltas.
- Create: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-cpu-sim-personalities.js`
  - Focused unit-style coverage for deterministic assignment and bias helpers.
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/cpu-sim-lineups.js`
  - Accept a per-team personality and apply small personality-aware bias/stability adjustments while keeping schedule/injury/slot rules dominant.
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-cpu-sim-lineups.js`
  - Extend lineup-helper tests to prove `star_loyalist`, `steady_floor`, `bigs_bias`, and `guards_bias` move close calls in the intended direction.
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/rosterbate-season.html`
  - Load the new helper, assign personalities to simulation universes, restore/fallback missing state, and pass the right personality into `buildCpuManagedStarterIdsForDay`.
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-cpu-sim-lineup-wiring.js`
  - Verify the season page loads the personality helper and passes a resolved personality into the lineup helper with safe `balanced` fallback.
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-universe-slot-storage.js`
  - Verify compact slot persistence keeps `cpuTeamPersonalitiesByTeam` intact across save/load.

### Task 1: Add the pure CPU personality helper

**Files:**
- Create: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/cpu-sim-personalities.js`
- Test: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-cpu-sim-personalities.js`

- [ ] **Step 1: Write the failing helper test file**

```js
const assert = require('node:assert/strict');
const personalities = require('../cpu-sim-personalities.js');

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
  makePlayer(1, 'PG', { overall: 92, usage: 95, scoring: 91, playmaking: 90, defense: 70, rebounding: 55 }),
  makePlayer(2, 'C',  { overall: 83, usage: 70, scoring: 74, playmaking: 50, defense: 86, rebounding: 90 })
];

const neutralRoster = [
  makePlayer(3, 'SG', { overall: 78, usage: 72, scoring: 79, playmaking: 68, defense: 66, rebounding: 52 }),
  makePlayer(4, 'PF', { overall: 79, usage: 68, scoring: 74, playmaking: 58, defense: 79, rebounding: 80 })
];

const assignedA = personalities.buildCpuSimPersonalitiesByTeam({
  teamCount: 6,
  myPos: 0,
  rosters: [starHeavyRoster, neutralRoster, neutralRoster, neutralRoster, neutralRoster, neutralRoster]
});
const assignedB = personalities.buildCpuSimPersonalitiesByTeam({
  teamCount: 6,
  myPos: 0,
  rosters: [starHeavyRoster, neutralRoster, neutralRoster, neutralRoster, neutralRoster, neutralRoster]
});

assert.deepStrictEqual(assignedA, assignedB, 'expected deterministic assignment for the same league state');
assert.equal(assignedA[1], 'star_loyalist', 'expected a star-heavy CPU roster to bias toward star_loyalist');

const big = makePlayer(10, 'C',  { overall: 81, usage: 70, scoring: 74, playmaking: 45, defense: 84, rebounding: 90 });
const guard = makePlayer(11, 'PG', { overall: 81, usage: 73, scoring: 78, playmaking: 85, defense: 60, rebounding: 40 });

assert.ok(
  personalities.getCpuSimPersonalityBias(big, 'bigs_bias') >
  personalities.getCpuSimPersonalityBias(guard, 'bigs_bias'),
  'expected bigs_bias to favor frontcourt profiles'
);
assert.ok(
  personalities.getCpuSimPersonalityBias(guard, 'guards_bias') >
  personalities.getCpuSimPersonalityBias(big, 'guards_bias'),
  'expected guards_bias to favor guard/creator profiles'
);
assert.equal(
  personalities.getCpuSimTeamPersonality(3, null),
  'balanced',
  'expected missing state to fall back to balanced'
);

console.log('cpu sim personalities helper test passed');
```

- [ ] **Step 2: Run the helper test to verify it fails**

Run:

```powershell
node .\tools\test-cpu-sim-personalities.js
```

Expected: FAIL with `Cannot find module '../cpu-sim-personalities.js'` or missing exported function errors.

- [ ] **Step 3: Implement the pure helper**

```js
(function(global){
  'use strict';

  const PERSONALITIES = ['balanced', 'star_loyalist', 'steady_floor', 'bigs_bias', 'guards_bias'];

  function getRatings(player){
    return player?.simProfile?.ratings || {};
  }

  function getStarWeight(player){
    const ratings = getRatings(player);
    return Number(ratings.overall || 0) * 100 + Number(ratings.usage || 0) * 45;
  }

  function buildCpuSimPersonalitiesByTeam(options){
    const opts = options || {};
    const teamCount = Math.max(0, Number(opts.teamCount || 0));
    const myPos = Number(opts.myPos || 0);
    const rosters = Array.isArray(opts.rosters) ? opts.rosters : [];
    return Array.from({ length: teamCount }, function(_, teamIdx){
      if(teamIdx === myPos) return 'balanced';
      const roster = Array.isArray(rosters[teamIdx]) ? rosters[teamIdx] : [];
      const topStarWeight = roster.reduce(function(best, player){
        return Math.max(best, getStarWeight(player));
      }, 0);
      if(topStarWeight >= 12500) return 'star_loyalist';
      return PERSONALITIES[(teamIdx % (PERSONALITIES.length - 1)) + 1];
    });
  }

  function getCpuSimTeamPersonality(teamIdx, personalitiesByTeam){
    const value = Array.isArray(personalitiesByTeam) ? personalitiesByTeam[teamIdx] : null;
    return PERSONALITIES.includes(value) ? value : 'balanced';
  }

  function getCpuSimPersonalityBias(player, personality){
    const pos = String(player?.pos || '').trim().toUpperCase();
    const ratings = getRatings(player);
    if(personality === 'star_loyalist'){
      return Number(ratings.overall || 0) * 18 + Number(ratings.usage || 0) * 12;
    }
    if(personality === 'steady_floor'){
      return Number(ratings.defense || 0) * 8 + Number(ratings.rebounding || 0) * 6 + Number(ratings.playmaking || 0) * 6;
    }
    if(personality === 'bigs_bias'){
      return (pos === 'PF' || pos === 'C' ? 220 : 0) + Number(ratings.rebounding || 0) * 10 + Number(ratings.defense || 0) * 8;
    }
    if(personality === 'guards_bias'){
      return (pos === 'PG' || pos === 'SG' ? 220 : 0) + Number(ratings.scoring || 0) * 8 + Number(ratings.playmaking || 0) * 10;
    }
    return 0;
  }

  function getCpuSimStableThresholdDelta(player, personality){
    const ratings = getRatings(player);
    if(personality === 'star_loyalist'){
      return Number(ratings.overall || 0) >= 84 ? 55 : 10;
    }
    if(personality === 'steady_floor'){
      return Number(ratings.defense || 0) >= 75 || Number(ratings.playmaking || 0) >= 72 ? 35 : 15;
    }
    return 0;
  }

  const api = {
    buildCpuSimPersonalitiesByTeam,
    getCpuSimTeamPersonality,
    getCpuSimPersonalityBias,
    getCpuSimStableThresholdDelta
  };

  global.RosterBateCpuSimPersonalities = api;
  if(typeof module !== 'undefined' && module.exports){
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
```

- [ ] **Step 4: Run the helper test to verify it passes**

Run:

```powershell
node .\tools\test-cpu-sim-personalities.js
```

Expected: PASS with `cpu sim personalities helper test passed`.

- [ ] **Step 5: Commit**

```powershell
git add -- cpu-sim-personalities.js tools/test-cpu-sim-personalities.js
git commit -m "feat: add cpu sim personality helper"
```

### Task 2: Thread personality into the lineup helper

**Files:**
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/cpu-sim-lineups.js`
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-cpu-sim-lineups.js`

- [ ] **Step 1: Extend the lineup test with personality-aware close-call coverage**

```js
const personalityApi = require('../cpu-sim-personalities.js');

const personalityBenchBig = makePlayer(8, 'PF', {
  overall: 79, usage: 68, scoring: 73, playmaking: 57, defense: 80, rebounding: 84
});
const personalityBenchGuard = makePlayer(9, 'SG', {
  overall: 79, usage: 72, scoring: 81, playmaking: 78, defense: 62, rebounding: 44
});

const personalityRoster = roster.concat([personalityBenchBig, personalityBenchGuard]);

function buildPersonalityLineup(personality) {
  return cpuSimLineups.buildCpuSimLineupIds({
    roster: personalityRoster,
    slots,
    starterCount: 5,
    day: 3,
    stableThreshold,
    personality,
    canPlayerFillSlot,
    getGameInfo(player) {
      return day3Games.has(player.id) ? { opponent: 'SIM' } : null;
    },
    getInjuryStatus() {
      return null;
    },
    weekForDay() {
      return healthyWeek;
    }
  });
}

const starLoyalistLineup = buildPersonalityLineup('star_loyalist');
assert.ok(starLoyalistLineup.includes(1), 'expected star_loyalist to preserve the star guard in a close playable decision');

assert.ok(
  cpuSimLineups.scoreCpuSimLineupCandidate(personalityBenchBig, {
    day: 3,
    slot: 'PF',
    personality: 'bigs_bias',
    canPlayerFillSlot,
    getGameInfo(player) { return day3Games.has(player.id) ? { opponent: 'SIM' } : null; },
    getInjuryStatus() { return null; },
    weekForDay() { return healthyWeek; }
  }) >
  cpuSimLineups.scoreCpuSimLineupCandidate(personalityBenchGuard, {
    day: 3,
    slot: 'PF',
    personality: 'bigs_bias',
    canPlayerFillSlot,
    getGameInfo(player) { return day3Games.has(player.id) ? { opponent: 'SIM' } : null; },
    getInjuryStatus() { return null; },
    weekForDay() { return healthyWeek; }
  }),
  'expected bigs_bias to break a close call toward the big'
);

assert.ok(
  cpuSimLineups.scoreCpuSimLineupCandidate(personalityBenchGuard, {
    day: 3,
    slot: 'SG',
    personality: 'guards_bias',
    canPlayerFillSlot,
    getGameInfo(player) { return day3Games.has(player.id) ? { opponent: 'SIM' } : null; },
    getInjuryStatus() { return null; },
    weekForDay() { return healthyWeek; }
  }) >
  cpuSimLineups.scoreCpuSimLineupCandidate(personalityBenchBig, {
    day: 3,
    slot: 'SG',
    personality: 'guards_bias',
    canPlayerFillSlot,
    getGameInfo(player) { return day3Games.has(player.id) ? { opponent: 'SIM' } : null; },
    getInjuryStatus() { return null; },
    weekForDay() { return healthyWeek; }
  }),
  'expected guards_bias to break a close call toward the guard'
);
```

- [ ] **Step 2: Run the lineup test to verify it fails**

Run:

```powershell
node .\tools\test-cpu-sim-lineups.js
```

Expected: FAIL because `personality` is ignored and the new assertions do not hold.

- [ ] **Step 3: Implement personality-aware scoring and stability**

```js
  function resolvePersonalityApi(){
    if(global.RosterBateCpuSimPersonalities) return global.RosterBateCpuSimPersonalities;
    if(typeof require === 'function'){
      try{
        return require('./cpu-sim-personalities.js');
      }catch(_err){}
    }
    return null;
  }

  function getPersonalityBias(player, personality){
    const api = resolvePersonalityApi();
    return api && typeof api.getCpuSimPersonalityBias === 'function'
      ? Number(api.getCpuSimPersonalityBias(player, personality) || 0)
      : 0;
  }

  function getStableThresholdDelta(player, personality){
    const api = resolvePersonalityApi();
    return api && typeof api.getCpuSimStableThresholdDelta === 'function'
      ? Number(api.getCpuSimStableThresholdDelta(player, personality) || 0)
      : 0;
  }

  function scoreCpuSimLineupCandidate(player, options){
    const opts = options || {};
    const personality = String(opts.personality || 'balanced').trim().toLowerCase();
    // keep existing game / slot / injury logic
    return roundScore(
      getCpuSimCoreScore(player) +
      getPersonalityBias(player, personality) +
      (game ? 9000 : -9000) +
      (exactPos ? 180 : 60) +
      (isUnavailable(injury) ? -22000 : injury ? -600 : 0)
    );
  }

  function buildCpuSimLineupIds(options){
    const opts = options || {};
    const personality = String(opts.personality || 'balanced').trim().toLowerCase();
    // existing lineup build logic above
    const threshold = stableThreshold + getStableThresholdDelta(player, personality);
    if(coreScore + threshold >= weakestScore){
      lineupIds[weakestIndex] = Number(player.id);
    }
  }
```

- [ ] **Step 4: Run the lineup test to verify it passes**

Run:

```powershell
node .\tools\test-cpu-sim-lineups.js
```

Expected: PASS with `cpu sim lineups policy test passed`.

- [ ] **Step 5: Commit**

```powershell
git add -- cpu-sim-lineups.js tools/test-cpu-sim-lineups.js
git commit -m "feat: add cpu lineup personality scoring"
```

### Task 3: Wire deterministic personalities into season state and persistence

**Files:**
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/rosterbate-season.html`
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-cpu-sim-lineup-wiring.js`
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-universe-slot-storage.js`

- [ ] **Step 1: Add failing season wiring and persistence assertions**

```js
assert.match(html, /<script src="cpu-sim-personalities\.js"><\/script>/);

const getCpuSimTeamPersonalitySource = extractFunctionSource(
  'getCpuSimTeamPersonality(teamIdx)',
  'buildCpuManagedStarterIdsForDay(teamIdx, roster, day)'
);

vm.runInNewContext(
  `${getCpuSimTeamPersonalitySource}\n${buildCpuManagedStarterIdsForDaySource}\n${rebuildLineupsAfterRosterChangeSource}`,
  context
);

context.D.cpuTeamPersonalitiesByTeam = ['balanced', 'guards_bias'];
const cpuManagedResult = context.buildCpuManagedStarterIdsForDay(1, context.G.rosters[0], 4);
assert.deepStrictEqual(cpuManagedResult, ['cpu']);
assert.equal(calls[0].personality, 'guards_bias');

delete context.D.cpuTeamPersonalitiesByTeam;
context.buildCpuManagedStarterIdsForDay(1, context.G.rosters[0], 4);
assert.equal(calls.at(-1).personality, 'balanced', 'expected missing personality state to fall back to balanced');
```

```js
cpuTeamPersonalitiesByTeam: ['balanced', 'star_loyalist', 'steady_floor', 'bigs_bias', 'guards_bias', 'balanced', 'guards_bias', 'bigs_bias', 'steady_floor', 'star_loyalist']
```

```js
assert.deepEqual(
  savedState.cpuTeamPersonalitiesByTeam,
  top300State.cpuTeamPersonalitiesByTeam,
  'expected cpu team personalities to survive compact slot persistence'
);
```

- [ ] **Step 2: Run the wiring and persistence tests to verify they fail**

Run:

```powershell
node .\tools\test-cpu-sim-lineup-wiring.js
node .\tools\test-historical-universe-slot-storage.js
```

Expected: FAIL because the script is not loaded, `personality` is not passed through, and slot storage has no asserted personality data yet.

- [ ] **Step 3: Implement season-page loading, assignment, restore fallback, and pass-through**

```html
<script src="cpu-sim-personalities.js"></script>
<script src="cpu-sim-lineups.js"></script>
```

```js
function ensureCpuSimTeamPersonalities(state){
  const target = state && typeof state === 'object' ? state : D;
  const teamCount = Math.max(
    Number(target?.leagueSize || 0),
    Array.isArray(target?.teams) ? target.teams.length : 0,
    Array.isArray(target?.allRosters) ? target.allRosters.length : 0
  );
  const existing = Array.isArray(target?.cpuTeamPersonalitiesByTeam) ? target.cpuTeamPersonalitiesByTeam.slice(0, teamCount) : [];
  if(existing.length === teamCount && existing.every(Boolean)) return existing;
  const api = window.RosterBateCpuSimPersonalities;
  const assigned = api && typeof api.buildCpuSimPersonalitiesByTeam === 'function'
    ? api.buildCpuSimPersonalitiesByTeam({
        teamCount,
        myPos: Number(target?.myPos || 0),
        rosters: Array.isArray(target?.allRosters) ? target.allRosters : Array.isArray(G?.rosters) ? G.rosters : []
      })
    : Array.from({ length: teamCount }, function(){ return 'balanced'; });
  target.cpuTeamPersonalitiesByTeam = assigned;
  return assigned;
}

function getCpuSimTeamPersonality(teamIdx){
  const api = window.RosterBateCpuSimPersonalities;
  const list = ensureCpuSimTeamPersonalities(D);
  return api && typeof api.getCpuSimTeamPersonality === 'function'
    ? api.getCpuSimTeamPersonality(teamIdx, list)
    : 'balanced';
}
```

```js
function buildCpuManagedStarterIdsForDay(teamIdx, roster, day){
  if(/* existing CPU simulation checks */){
    return window.RosterBateCpuSimLineups.buildCpuSimLineupIds({
      roster,
      slots: SLOT_LABELS,
      starterCount: STARTERS,
      day,
      stableThreshold: 160,
      personality: getCpuSimTeamPersonality(teamIdx),
      canPlayerFillSlot,
      getGameInfo,
      getInjuryStatus,
      weekForDay
    });
  }
  return buildBestLineupIdsForRoster(roster, day);
}
```

```js
  if(isSimulationSeason){
    ensureCpuSimTeamPersonalities(launchData);
  }
```

```js
  if(isHistoricalSimulationUniverse(D)){
    ensureCpuSimTeamPersonalities(D);
  }
```

- [ ] **Step 4: Run the season wiring and persistence tests to verify they pass**

Run:

```powershell
node .\tools\test-cpu-sim-lineup-wiring.js
node .\tools\test-historical-universe-slot-storage.js
```

Expected: PASS with:
- `cpu sim lineup wiring test passed`
- `historical universe slot storage test passed`

- [ ] **Step 5: Commit**

```powershell
git add -- rosterbate-season.html tools/test-cpu-sim-lineup-wiring.js tools/test-historical-universe-slot-storage.js
git commit -m "feat: persist cpu sim personalities in season state"
```

### Task 4: Run the full focused verification and sanity pass

**Files:**
- Test: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-cpu-sim-personalities.js`
- Test: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-cpu-sim-lineups.js`
- Test: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-cpu-sim-lineup-wiring.js`
- Test: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-universe-slot-storage.js`
- Test: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-drafted-universe-snapshot.js`

- [ ] **Step 1: Run the full focused regression set**

Run:

```powershell
node .\tools\test-cpu-sim-personalities.js
node .\tools\test-cpu-sim-lineups.js
node .\tools\test-cpu-sim-lineup-wiring.js
node .\tools\test-historical-universe-slot-storage.js
node .\tools\test-historical-drafted-universe-snapshot.js
```

Expected:
- `cpu sim personalities helper test passed`
- `cpu sim lineups policy test passed`
- `cpu sim lineup wiring test passed`
- `historical universe slot storage test passed`
- `historical drafted-universe snapshot test passed`

- [ ] **Step 2: Do a quick manual localhost sanity pass**

Run:

```powershell
python -m http.server 8082 --bind 127.0.0.1
```

Then verify in a browser:
- load a simulation-season universe
- confirm CPU teams still get legal starters
- inspect at least two CPU teams across a couple days and confirm personalities change borderline lineup choices without creating silly starts

Expected: no console crash, no missing script error, no broken season boot.

- [ ] **Step 3: Commit the verified feature**

```powershell
git add -- cpu-sim-personalities.js cpu-sim-lineups.js rosterbate-season.html tools/test-cpu-sim-personalities.js tools/test-cpu-sim-lineups.js tools/test-cpu-sim-lineup-wiring.js tools/test-historical-universe-slot-storage.js
git commit -m "feat: add cpu sim lineup personalities"
```

## Self-review

- Spec coverage:
  - lineup-only scope: Tasks 2 and 3
  - deterministic assignment + persistence: Tasks 1 and 3
  - helper-level behavior changes: Task 2
  - fallback to `balanced` for older universes: Task 3
  - verification and manual sanity: Task 4
- Placeholder scan:
  - no `TODO`, `TBD`, or “write tests for the above” placeholders remain
- Type consistency:
  - plan consistently uses `cpuTeamPersonalitiesByTeam`, `getCpuSimTeamPersonality`, `getCpuSimPersonalityBias`, and `getCpuSimStableThresholdDelta`
