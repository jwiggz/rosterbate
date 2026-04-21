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
const personalityRivalGuard = makePlayer(9, 'Personality Rival Guard', 'SG', {
  overall: 90, usage: 92, scoring: 93, playmaking: 92, defense: 66, rebounding: 52
});
const personalityStarGuard = makePlayer(8, 'Personality Star Guard', 'SG', {
  overall: 89, usage: 96, scoring: 94, playmaking: 93, defense: 66, rebounding: 52
});
const personalityPointGuard = makePlayer(10, 'Personality Point Guard', 'PG', {
  overall: 94, usage: 79, scoring: 80, playmaking: 82, defense: 70, rebounding: 60
});
const personalityWing = makePlayer(11, 'Personality Wing', 'SF', {
  overall: 95, usage: 77, scoring: 79, playmaking: 81, defense: 72, rebounding: 60
});
const personalityForward = makePlayer(12, 'Personality Forward', 'PF', {
  overall: 96, usage: 76, scoring: 78, playmaking: 80, defense: 74, rebounding: 66
});
const personalityCenter = makePlayer(13, 'Personality Center', 'C', {
  overall: 96, usage: 75, scoring: 77, playmaking: 78, defense: 80, rebounding: 88
});
const personalityBig = makePlayer(14, 'Personality Big', 'PF', {
  overall: 81, usage: 70, scoring: 74, playmaking: 45, defense: 84, rebounding: 90
});
const personalityGuard = makePlayer(15, 'Personality Guard', 'PG', {
  overall: 81, usage: 70, scoring: 74, playmaking: 45, defense: 84, rebounding: 90
});
const obviousGapStar = makePlayer(16, 'Obvious Gap Star', 'PG', {
  overall: 95, usage: 92, scoring: 94, playmaking: 93, defense: 82, rebounding: 58
});
const obviousGapBackfill = makePlayer(17, 'Obvious Gap Backfill', 'PG', {
  overall: 71, usage: 64, scoring: 65, playmaking: 60, defense: 60, rebounding: 50
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

const personalityRoster = [
  personalityRivalGuard,
  personalityStarGuard,
  personalityPointGuard,
  personalityWing,
  personalityForward,
  personalityCenter
];

const obviousGapRoster = [
  obviousGapStar,
  obviousGapBackfill,
  makePlayer(18, 'Obvious Gap Wing', 'SF', {
    overall: 84, usage: 74, scoring: 82, playmaking: 70, defense: 78, rebounding: 60
  }),
  makePlayer(19, 'Obvious Gap Forward', 'PF', {
    overall: 83, usage: 72, scoring: 79, playmaking: 68, defense: 80, rebounding: 76
  }),
  makePlayer(20, 'Obvious Gap Center', 'C', {
    overall: 86, usage: 70, scoring: 76, playmaking: 60, defense: 84, rebounding: 88
  })
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

function buildBalancedBaseLineup(day, injuries = new Map()) {
  return cpuSimLineups.buildCpuSimLineupIds({
    roster,
    slots,
    starterCount: 5,
    day,
    stableThreshold,
    personality: 'balanced',
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

function buildPersonalityLineupForRoster(rosterInput, personality) {
  return cpuSimLineups.buildCpuSimLineupIds({
    roster: rosterInput,
    slots,
    starterCount: 5,
    day: 1,
    stableThreshold,
    personality,
    canPlayerFillSlot,
    getGameInfo(player, requestedDay) {
      return rosterInput.some(function(entry){ return Number(entry.id) === Number(player?.id); })
        ? { opponent: 'SIM' }
        : null;
    },
    getInjuryStatus() {
      return null;
    },
    weekForDay() {
      return healthyWeek;
    }
  });
}

function scorePersonalityCandidate(player, personality, slot) {
  return cpuSimLineups.scoreCpuSimLineupCandidate(player, {
    day: 1,
    slot,
    personality,
    canPlayerFillSlot,
    getGameInfo(candidatePlayer, requestedDay) {
      return day1Games.has(candidatePlayer.id) ? { opponent: 'SIM' } : null;
    },
    getInjuryStatus() {
      return null;
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

const defaultPersonalityLineup = buildLineup(1);
const balancedBaseLineup = buildBalancedBaseLineup(1);
assert.deepStrictEqual(
  defaultPersonalityLineup,
  balancedBaseLineup,
  'expected balanced personality to match the default lineup behavior'
);

const obviousGapBalancedLineup = buildPersonalityLineupForRoster(obviousGapRoster, 'balanced');
const obviousGapStarLoyalistLineup = buildPersonalityLineupForRoster(obviousGapRoster, 'star_loyalist');
assert.deepStrictEqual(
  obviousGapStarLoyalistLineup,
  obviousGapBalancedLineup,
  'expected personality to leave an obvious gap decision unchanged'
);
assert.ok(
  obviousGapBalancedLineup.includes(16),
  'expected the obvious star to remain in the lineup'
);

const starBalancedScore = scorePersonalityCandidate(personalityStarGuard, 'balanced', 'SG');
const rivalBalancedScore = scorePersonalityCandidate(personalityRivalGuard, 'balanced', 'SG');
const starLoyalistStarScore = scorePersonalityCandidate(personalityStarGuard, 'star_loyalist', 'SG');
const starLoyalistRivalScore = scorePersonalityCandidate(personalityRivalGuard, 'star_loyalist', 'SG');
assert.ok(
  rivalBalancedScore >= starBalancedScore,
  'expected balanced scoring to stay effectively baseline in the close star/rival call'
);
assert.ok(
  starLoyalistStarScore > starLoyalistRivalScore,
  'expected star_loyalist to preserve a star in a close playable decision'
);

const balancedBigScore = scorePersonalityCandidate(personalityBig, 'balanced', 'UTIL');
const balancedGuardScore = scorePersonalityCandidate(personalityGuard, 'balanced', 'UTIL');
const bigBiasScore = scorePersonalityCandidate(personalityBig, 'bigs_bias', 'UTIL');
const guardBiasScore = scorePersonalityCandidate(personalityGuard, 'guards_bias', 'UTIL');

assert.ok(
  Math.abs(balancedBigScore - balancedGuardScore) < 200,
  'expected the big/guard matchup to be a close baseline call'
);
assert.ok(
  bigBiasScore > scorePersonalityCandidate(personalityGuard, 'bigs_bias', 'UTIL'),
  'expected bigs_bias to break a close call toward the big'
);
assert.ok(
  guardBiasScore > scorePersonalityCandidate(personalityBig, 'guards_bias', 'UTIL'),
  'expected guards_bias to break a close call toward the guard'
);

console.log('cpu sim lineups policy test passed');
