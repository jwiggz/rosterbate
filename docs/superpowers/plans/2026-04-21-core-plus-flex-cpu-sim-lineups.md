# Core-Plus-Flex CPU Sim Lineups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give CPU-managed historical simulation teams a stable star core plus smarter day-level flex decisions without changing the underlying sim engine.

**Architecture:** Extract CPU sim-lineup policy into a new pure helper module that can be tested directly in Node and consumed from the browser. Then wire `rosterbate-season.html` to use that helper only for CPU-managed historical simulation universes, keeping the existing generic lineup builder as the fallback for every other season type.

**Tech Stack:** Vanilla JavaScript, browser globals, CommonJS-compatible helper exports, static HTML, Node-based regression scripts, PowerShell verification commands.

---

## File Map

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\cpu-sim-lineups.js`
  Purpose: hold pure CPU sim-lineup scoring, core selection, and lineup-building logic that can run in both Node tests and the browser.

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`
  Purpose: load the helper, route CPU-managed historical simulation universes through it, and preserve the existing fallback lineup builder for all other cases.

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-cpu-sim-lineups.js`
  Purpose: direct policy regression for core sizing, higher-upside-star tie preservation, no-game benching, and clear-upgrade replacement.

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-cpu-sim-lineup-wiring.js`
  Purpose: static regression proving the season page loads the helper and calls it from CPU sim-lineup normalization.

### Task 1: Add A Pure CPU Sim-Lineup Helper With Failing Policy Coverage

**Files:**
- Create: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\cpu-sim-lineups.js`
- Create: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-cpu-sim-lineups.js`

- [ ] **Step 1: Write the failing CPU lineup policy regression**

Create `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-cpu-sim-lineups.js` with this exact content:

```js
const assert = require('node:assert/strict');
const cpuSimLineups = require('../cpu-sim-lineups.js');

function makePlayer(id, name, pos, ratings, options = {}) {
  return {
    id,
    name,
    pos,
    historicalPackId: 'nba_2016_full_season_v1',
    simProfile: {
      ratings: {
        overall: ratings.overall,
        usage: ratings.usage,
        scoring: ratings.scoring,
        playmaking: ratings.playmaking,
        defense: ratings.defense || 55,
        rebounding: ratings.rebounding || 55
      }
    },
    fp: options.fp ?? ratings.overall
  };
}

const slots = ['PG', 'SG', 'SF', 'PF', 'C'];
const stableThreshold = 160;
const healthyWeek = 3;

function canPlayerFillSlot(player, slot) {
  const pos = String(player?.pos || '').toUpperCase();
  const target = String(slot || '').toUpperCase();
  if (pos === target) return true;
  if (target === 'G') return pos === 'PG' || pos === 'SG';
  if (target === 'F') return pos === 'SF' || pos === 'PF';
  if (target === 'UTIL') return ['PG', 'SG', 'SF', 'PF', 'C'].includes(pos);
  return false;
}

const starGuard = makePlayer(1, 'Star Guard', 'PG', {
  overall: 87, usage: 91, scoring: 88, playmaking: 89
});
const steadyWing = makePlayer(2, 'Steady Wing', 'SG', {
  overall: 78, usage: 72, scoring: 79, playmaking: 67
});
const twoWayForward = makePlayer(3, 'Two-Way Forward', 'SF', {
  overall: 80, usage: 75, scoring: 80, playmaking: 68, defense: 84
});
const stretchBig = makePlayer(4, 'Stretch Big', 'PF', {
  overall: 79, usage: 70, scoring: 77, playmaking: 63, rebounding: 76
});
const anchorCenter = makePlayer(5, 'Anchor Center', 'C', {
  overall: 82, usage: 74, scoring: 76, playmaking: 58, defense: 87, rebounding: 88
});
const benchGuard = makePlayer(6, 'Bench Guard', 'PG', {
  overall: 88, usage: 77, scoring: 78, playmaking: 86
});
const benchForward = makePlayer(7, 'Bench Forward', 'SF', {
  overall: 76, usage: 69, scoring: 75, playmaking: 61
});

const roster = [
  starGuard,
  steadyWing,
  twoWayForward,
  stretchBig,
  anchorCenter,
  benchGuard,
  benchForward
];

const day1Games = new Set([1, 2, 3, 4, 5, 6]);
const day2Games = new Set([2, 3, 4, 5, 6, 7]);
const day3Games = new Set([1, 2, 3, 4, 5, 6, 7]);

function buildLineup(day, injuries = new Map()) {
  return cpuSimLineups.buildCpuSimLineupIds({
    roster,
    slots,
    starterCount: 5,
    day,
    stableThreshold,
    canPlayerFillSlot,
    getGameInfo(player, requestedDay) {
      const set = requestedDay === 1 ? day1Games : requestedDay === 2 ? day2Games : day3Games;
      return set.has(player.id) ? { opponent: 'SIM' } : null;
    },
    getInjuryStatus(player) {
      return injuries.get(player.id) || null;
    },
    weekForDay() {
      return healthyWeek;
    }
  });
}

const coreIds = cpuSimLineups.selectCpuSimCoreStarterIds({
  roster,
  starterCount: 5
});
assert.deepStrictEqual(coreIds, [1, 5, 3], 'expected the lineup core to keep the highest-upside stars');

const day1Lineup = buildLineup(1);
assert.ok(day1Lineup.includes(1), 'expected the star guard to stay in on a close playable day');
assert.ok(day1Lineup.includes(5), 'expected the anchor center to stay in the core');
assert.equal(day1Lineup.length, 5, 'expected a full starter set');

const day2Lineup = buildLineup(2);
assert.ok(!day2Lineup.includes(1), 'expected a core star with no game to sit');
assert.ok(day2Lineup.includes(6), 'expected the playable bench guard to backfill the no-game star');

const day3Lineup = buildLineup(3, new Map([[3, { label: 'OUT' }]]));
assert.ok(!day3Lineup.includes(3), 'expected an unavailable core player to sit');
assert.ok(day3Lineup.includes(7), 'expected a healthy replacement to enter for the unavailable forward');

const clearUpgradeScore = cpuSimLineups.scoreCpuSimLineupCandidate(benchGuard, {
  day: 1,
  slot: 'PG',
  canPlayerFillSlot,
  getGameInfo(player) {
    return day1Games.has(player.id) ? { opponent: 'SIM' } : null;
  },
  getInjuryStatus() {
    return null;
  },
  weekForDay() {
    return healthyWeek;
  }
});
const starScore = cpuSimLineups.scoreCpuSimLineupCandidate(starGuard, {
  day: 1,
  slot: 'PG',
  canPlayerFillSlot,
  getGameInfo(player) {
    return day1Games.has(player.id) ? { opponent: 'SIM' } : null;
  },
  getInjuryStatus() {
    return null;
  },
  weekForDay() {
    return healthyWeek;
  }
});
assert.ok(
  starScore + stableThreshold >= clearUpgradeScore,
  'expected the higher-upside star to survive a close playable tie'
);

console.log('cpu sim lineups policy test passed');
```

- [ ] **Step 2: Run the policy regression and verify it fails first**

Run:

```powershell
node .\tools\test-cpu-sim-lineups.js
```

Expected: FAIL with `Cannot find module '../cpu-sim-lineups.js'`.

- [ ] **Step 3: Implement the pure helper module**

Create `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\cpu-sim-lineups.js` with this exact content:

```js
(function(global){
  'use strict';

  function clamp(value, min, max){
    const num = Number(value);
    if(!Number.isFinite(num)) return min;
    return Math.min(max, Math.max(min, num));
  }

  function roundScore(value){
    const num = Number(value || 0);
    return Number.isFinite(num) ? Math.round(num * 10) / 10 : 0;
  }

  function getRatings(player){
    return player?.simProfile?.ratings || {};
  }

  function getCpuSimCoreScore(player){
    const ratings = getRatings(player);
    return roundScore(
      Number(ratings.overall || 0) * 100 +
      Number(ratings.usage || 0) * 18 +
      Number(ratings.scoring || 0) * 16 +
      Number(ratings.playmaking || 0) * 12 +
      Number(ratings.defense || 0) * 6 +
      Number(ratings.rebounding || 0) * 6
    );
  }

  function resolveCpuSimCoreSize(sortedPlayers, starterCount){
    if(!Array.isArray(sortedPlayers) || !sortedPlayers.length) return 0;
    const limit = Math.min(Number(starterCount || 5), sortedPlayers.length);
    if(limit <= 2) return limit;
    const second = Number(sortedPlayers[1]?.coreScore || 0);
    const third = Number(sortedPlayers[2]?.coreScore || 0);
    const fourth = Number(sortedPlayers[3]?.coreScore || 0);
    if(third > 0 && second > 0 && third < second * 0.88) return Math.min(2, limit);
    if(limit >= 4 && fourth > 0 && third > 0 && fourth >= third * 0.96) return 4;
    return Math.min(3, limit);
  }

  function isUnavailable(status){
    const label = String(status?.label || '').trim().toUpperCase();
    return label === 'OUT' || label === 'IR' || label === 'SUSP';
  }

  function scoreCpuSimLineupCandidate(player, options){
    const opts = options || {};
    const slot = String(opts.slot || 'UTIL').trim().toUpperCase();
    const day = Number(opts.day || 1) || 1;
    const week = typeof opts.weekForDay === 'function' ? opts.weekForDay(day) : 1;
    const injury = typeof opts.getInjuryStatus === 'function' ? opts.getInjuryStatus(player, week) : null;
    const game = typeof opts.getGameInfo === 'function' ? opts.getGameInfo(player, day) : null;
    const exactPos = String(player?.pos || '').trim().toUpperCase() === slot;
    const canFill = typeof opts.canPlayerFillSlot === 'function'
      ? !!opts.canPlayerFillSlot(player, slot)
      : true;
    if(!canFill) return -999999;
    return roundScore(
      getCpuSimCoreScore(player) +
      (game ? 9000 : -9000) +
      (exactPos ? 180 : 60) +
      (isUnavailable(injury) ? -22000 : injury ? -600 : 0)
    );
  }

  function selectCpuSimCoreStarterIds(options){
    const opts = options || {};
    const sorted = (opts.roster || [])
      .filter(Boolean)
      .map(function(player){
        return {
          player: player,
          coreScore: getCpuSimCoreScore(player)
        };
      })
      .sort(function(a, b){
        return b.coreScore - a.coreScore;
      });
    const size = resolveCpuSimCoreSize(sorted, Number(opts.starterCount || 5));
    return sorted.slice(0, size).map(function(entry){
      return Number(entry.player?.id);
    }).filter(Number.isFinite);
  }

  function normalizeStarterIds(lineupIds, starterCount){
    const count = Math.max(0, Number(starterCount || 5));
    const normalized = Array.from({ length: count }, function(_, index){
      return Number(lineupIds?.[index] || 0) || null;
    });
    return normalized.filter(Boolean);
  }

  function buildBaseDailyLineup(options){
    const opts = options || {};
    const slots = Array.isArray(opts.slots) ? opts.slots : [];
    const roster = Array.isArray(opts.roster) ? opts.roster.filter(Boolean) : [];
    const starters = new Array(Math.max(0, Number(opts.starterCount || slots.length || 5))).fill(null);
    const used = new Set();
    const fillOrder = slots.map(function(slot, index){
      return { slot: slot, index: index };
    });
    fillOrder.forEach(function(entry){
      const scored = roster
        .filter(function(player){ return !used.has(Number(player?.id)); })
        .map(function(player){
          return {
            player: player,
            score: scoreCpuSimLineupCandidate(player, {
              day: opts.day,
              slot: entry.slot,
              canPlayerFillSlot: opts.canPlayerFillSlot,
              getGameInfo: opts.getGameInfo,
              getInjuryStatus: opts.getInjuryStatus,
              weekForDay: opts.weekForDay
            })
          };
        })
        .sort(function(a, b){ return b.score - a.score; });
      const winner = scored[0];
      if(winner && winner.score > -999999){
        starters[entry.index] = Number(winner.player.id);
        used.add(Number(winner.player.id));
      }
    });
    return starters;
  }

  function getEligibleStarterSlotIndex(lineupIds, slots, player, canPlayerFillSlot){
    for(let index = 0; index < lineupIds.length; index += 1){
      if(lineupIds[index]) continue;
      if(canPlayerFillSlot(player, slots[index])) return index;
    }
    return -1;
  }

  function buildCpuSimLineupIds(options){
    const opts = options || {};
    const slots = Array.isArray(opts.slots) ? opts.slots : [];
    const roster = Array.isArray(opts.roster) ? opts.roster.filter(Boolean) : [];
    const starterCount = Math.max(0, Number(opts.starterCount || slots.length || 5));
    const stableThreshold = Number(opts.stableThreshold || 160);
    const lineupIds = buildBaseDailyLineup(opts);
    const coreIds = selectCpuSimCoreStarterIds({
      roster: roster,
      starterCount: starterCount
    });

    coreIds.forEach(function(coreId){
      if(lineupIds.includes(coreId)) return;
      const player = roster.find(function(entry){ return Number(entry?.id) === Number(coreId); });
      if(!player) return;
      const injury = typeof opts.getInjuryStatus === 'function'
        ? opts.getInjuryStatus(player, typeof opts.weekForDay === 'function' ? opts.weekForDay(opts.day) : 1)
        : null;
      const game = typeof opts.getGameInfo === 'function' ? opts.getGameInfo(player, opts.day) : null;
      if(!game || isUnavailable(injury)) return;

      let weakestIndex = -1;
      let weakestScore = Number.POSITIVE_INFINITY;
      for(let index = 0; index < lineupIds.length; index += 1){
        const starterId = lineupIds[index];
        const starter = roster.find(function(entry){ return Number(entry?.id) === Number(starterId); });
        if(!starter) continue;
        if(typeof opts.canPlayerFillSlot === 'function' && !opts.canPlayerFillSlot(player, slots[index])) continue;
        const starterScore = scoreCpuSimLineupCandidate(starter, {
          day: opts.day,
          slot: slots[index],
          canPlayerFillSlot: opts.canPlayerFillSlot,
          getGameInfo: opts.getGameInfo,
          getInjuryStatus: opts.getInjuryStatus,
          weekForDay: opts.weekForDay
        });
        if(starterScore < weakestScore){
          weakestScore = starterScore;
          weakestIndex = index;
        }
      }

      if(weakestIndex < 0){
        const emptyIndex = getEligibleStarterSlotIndex(lineupIds, slots, player, opts.canPlayerFillSlot);
        if(emptyIndex >= 0) lineupIds[emptyIndex] = Number(player.id);
        return;
      }

      const coreScore = scoreCpuSimLineupCandidate(player, {
        day: opts.day,
        slot: slots[weakestIndex],
        canPlayerFillSlot: opts.canPlayerFillSlot,
        getGameInfo: opts.getGameInfo,
        getInjuryStatus: opts.getInjuryStatus,
        weekForDay: opts.weekForDay
      });
      if(coreScore + stableThreshold >= weakestScore){
        lineupIds[weakestIndex] = Number(player.id);
      }
    });

    return normalizeStarterIds(lineupIds, starterCount);
  }

  const api = {
    scoreCpuSimLineupCandidate: scoreCpuSimLineupCandidate,
    selectCpuSimCoreStarterIds: selectCpuSimCoreStarterIds,
    buildCpuSimLineupIds: buildCpuSimLineupIds
  };

  global.RosterBateCpuSimLineups = api;
  if(typeof module !== 'undefined' && module.exports){
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
```

- [ ] **Step 4: Run the policy regression again and verify it passes**

Run:

```powershell
node .\tools\test-cpu-sim-lineups.js
```

Expected:

```text
cpu sim lineups policy test passed
```

- [ ] **Step 5: Commit the helper and focused test**

Run:

```powershell
git add cpu-sim-lineups.js tools/test-cpu-sim-lineups.js
git commit -m "feat: add cpu sim lineup helper"
```

Expected: one commit containing the pure helper and its direct policy regression.

### Task 2: Wire Historical Simulation CPU Lineups Through The Helper

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html:1-20`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html:4006-4022`
- Create: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-cpu-sim-lineup-wiring.js`

- [ ] **Step 1: Add a failing static wiring regression**

Create `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-cpu-sim-lineup-wiring.js` with this exact content:

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(
  path.join(__dirname, '..', 'rosterbate-season.html'),
  'utf8'
);

assert.match(
  html,
  /<script src="cpu-sim-lineups\.js"><\/script>/,
  'expected rosterbate-season.html to load cpu-sim-lineups.js'
);

assert.match(
  html,
  /function buildCpuManagedStarterIdsForDay\(teamIdx, roster, day\)/,
  'expected a dedicated CPU starter builder helper'
);

assert.match(
  html,
  /isHistoricalSimulationUniverse\(D\)/,
  'expected historical simulation universes to route through the CPU sim helper'
);

assert.match(
  html,
  /window\.RosterBateCpuSimLineups\.buildCpuSimLineupIds/,
  'expected CPU lineup normalization to call the helper'
);

console.log('cpu sim lineup wiring test passed');
```

- [ ] **Step 2: Run the wiring regression and verify it fails first**

Run:

```powershell
node .\tools\test-cpu-sim-lineup-wiring.js
```

Expected: FAIL because the season page does not yet load `cpu-sim-lineups.js` or call `buildCpuManagedStarterIdsForDay()`.

- [ ] **Step 3: Wire the helper into the season page with a safe fallback**

In `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`, add the helper script immediately after the simulation engine include:

```html
<script src="simulation-league-engine.js"></script>
<script src="cpu-sim-lineups.js"></script>
<script src="global-nav.js" defer></script>
```

Then add this helper just above `normalizeCpuTeamLineups(teamIdx)`:

```js
function buildCpuManagedStarterIdsForDay(teamIdx, roster, day){
  if(
    isCpuManagedTeam(teamIdx) &&
    isHistoricalSimulationUniverse(D) &&
    window.RosterBateCpuSimLineups &&
    typeof window.RosterBateCpuSimLineups.buildCpuSimLineupIds === 'function'
  ){
    return window.RosterBateCpuSimLineups.buildCpuSimLineupIds({
      roster: roster,
      slots: SLOT_LABELS,
      starterCount: STARTERS,
      day: day,
      stableThreshold: 160,
      canPlayerFillSlot: canPlayerFillSlot,
      getGameInfo: getGameInfo,
      getInjuryStatus: getInjuryStatus,
      weekForDay: weekForDay
    });
  }
  return buildBestLineupIdsForRoster(roster, day);
}
```

Then replace `normalizeCpuTeamLineups(teamIdx)` with:

```js
function normalizeCpuTeamLineups(teamIdx){
  const roster=G.rosters[teamIdx]||[];
  const teamDailyLineups=getDailyLineupStore(teamIdx);
  G.starters[teamIdx]=buildCpuManagedStarterIdsForDay(teamIdx, roster, G.day||1);
  Object.keys(teamDailyLineups||{}).forEach(dayKey=>{
    const day=Number(dayKey);
    if(!Number.isFinite(day) || day < (G.day||1) || isDayRevealed(day)) return;
    teamDailyLineups[day]=buildCpuManagedStarterIdsForDay(teamIdx, roster, day);
  });
}
```

- [ ] **Step 4: Run the focused tests and verify they both pass**

Run:

```powershell
node .\tools\test-cpu-sim-lineups.js
node .\tools\test-cpu-sim-lineup-wiring.js
```

Expected:

```text
cpu sim lineups policy test passed
cpu sim lineup wiring test passed
```

- [ ] **Step 5: Commit the season-page wiring**

Run:

```powershell
git add rosterbate-season.html tools/test-cpu-sim-lineup-wiring.js
git commit -m "feat: wire cpu sim lineups into season flow"
```

Expected: one commit containing the script include, the season-page helper, and the static wiring regression.

### Task 3: Run The Simulation-League Verification Sweep And Manual Check

**Files:**
- Modify: none

- [ ] **Step 1: Run the automated verification sweep**

Run:

```powershell
node .\tools\test-cpu-sim-lineups.js
node .\tools\test-cpu-sim-lineup-wiring.js
node .\tools\test-historical-drafted-universe-snapshot.js
node .\tools\test-historical-universe-slot-storage.js
```

Expected:

```text
cpu sim lineups policy test passed
cpu sim lineup wiring test passed
historical drafted universe snapshot test passed
historical universe slot storage test passed
```

- [ ] **Step 2: Manual localhost simulation-season check**

Run:

```powershell
python -m http.server 8082
```

Then open:

```text
http://localhost:8082/rosterbate-season.html?historical=simulation
```

Manual checklist:
- start or resume a historical simulation universe
- inspect at least one CPU team on two different future days
- verify a playable star remains in the lineup when the bench edge is only marginal
- verify a no-game core star sits and a playable replacement enters
- verify an `OUT` or otherwise unavailable core player sits
- verify lineups still remain legal by slot

- [ ] **Step 3: Commit only if the sweep and manual check are green**

Run:

```powershell
git status --short
```

Expected:

```text
<no output>
```

If the repo is clean and all verification passed, no additional commit is needed here. If you had to make a small follow-up fix during verification, commit it with:

```powershell
git add <fixed-files>
git commit -m "fix: polish cpu sim lineup verification issues"
```
