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
  makePlayer(3, 'PG', {
    overall: 72,
    usage: 60,
    scoring: 65,
    playmaking: 64,
    defense: 61,
    rebounding: 38
  }),
  makePlayer(4, 'PF', {
    overall: 75,
    usage: 57,
    scoring: 64,
    playmaking: 50,
    defense: 73,
    rebounding: 71
  })
];

const borderlineStarGuardRoster = [
  makePlayer(5, 'PG', {
    overall: 82,
    usage: 77,
    scoring: 81,
    playmaking: 88,
    defense: 61,
    rebounding: 39
  }),
  makePlayer(6, 'SG', {
    overall: 80,
    usage: 74,
    scoring: 79,
    playmaking: 79,
    defense: 63,
    rebounding: 44
  })
];

const balancedTargetRoster = [
  makePlayer(7, 'PG', {
    overall: 70,
    usage: 58,
    scoring: 63,
    playmaking: 62,
    defense: 59,
    rebounding: 36
  }),
  makePlayer(8, 'PF', {
    overall: 73,
    usage: 55,
    scoring: 61,
    playmaking: 47,
    defense: 70,
    rebounding: 68
  })
];

const bigProfile = makePlayer(10, 'C', {
  overall: 81,
  usage: 70,
  scoring: 74,
  playmaking: 45,
  defense: 84,
  rebounding: 90
});

const guardProfile = makePlayer(11, 'PG', {
  overall: 81,
  usage: 73,
  scoring: 79,
  playmaking: 85,
  defense: 61,
  rebounding: 41
});

const comboBig = makePlayer(12, 'F/C', {
  overall: 82,
  usage: 68,
  scoring: 74,
  playmaking: 48,
  defense: 86,
  rebounding: 91
});

const bigHeavyRoster = [
  bigProfile,
  makePlayer(13, 'PF', {
    overall: 81,
    usage: 63,
    scoring: 70,
    playmaking: 48,
    defense: 82,
    rebounding: 86
  })
];
const guardHeavyRoster = [
  makePlayer(14, 'PG', {
    overall: 76,
    usage: 69,
    scoring: 75,
    playmaking: 81,
    defense: 58,
    rebounding: 38
  }),
  makePlayer(15, 'SG', {
    overall: 75,
    usage: 67,
    scoring: 74,
    playmaking: 76,
    defense: 59,
    rebounding: 41
  })
];

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
  ['balanced', 'star_loyalist', 'steady_floor', 'guards_bias', 'balanced', 'bigs_bias', 'guards_bias'],
  'expected the full deterministic spread across the seven CPU teams'
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
  'expected F/C combo bigs to benefit from big/frontcourt bias'
);
assert.ok(
  cpuSimPersonalities.getCpuSimStableThresholdDelta(makePlayer(12, 'SG', {
    overall: 92,
    usage: 94,
    scoring: 91,
    playmaking: 89,
    defense: 73,
    rebounding: 58
  }), 'star_loyalist') >
    cpuSimPersonalities.getCpuSimStableThresholdDelta(makePlayer(13, 'SG', {
      overall: 76,
      usage: 70,
      scoring: 74,
      playmaking: 68,
      defense: 70,
      rebounding: 60
    }), 'star_loyalist'),
  'expected star_loyalist to preserve stars more strongly'
);

console.log('cpu sim personalities helper test passed');
