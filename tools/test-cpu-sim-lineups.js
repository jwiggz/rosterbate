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
assert.ok(coreIds.includes(1), 'expected the star guard to stay in the core');
assert.ok(coreIds.includes(5), 'expected the anchor center to stay in the core');
assert.ok(coreIds.includes(3), 'expected the high-upside forward to stay in the core');
assert.ok(coreIds.length >= 3 && coreIds.length <= 4, 'expected the core to stay within the approved dynamic size band');

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
