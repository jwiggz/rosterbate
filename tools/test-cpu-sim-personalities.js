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
  makePlayer(6633, 'PG', {
    overall: 77,
    usage: 74,
    scoring: 80,
    playmaking: 84,
    defense: 75,
    rebounding: 80
  }),
  makePlayer(6634, 'SF', {
    overall: 77,
    usage: 81,
    scoring: 77,
    playmaking: 78,
    defense: 85,
    rebounding: 73
  }),
  makePlayer(6635, 'PG', {
    overall: 78,
    usage: 79,
    scoring: 77,
    playmaking: 75,
    defense: 77,
    rebounding: 76
  })
];

const borderlineStarGuardRoster = [
  makePlayer(3000, 'PG', {
    overall: 90,
    usage: 91,
    scoring: 82,
    playmaking: 76,
    defense: 71,
    rebounding: 69
  }),
  makePlayer(3001, 'PG', {
    overall: 85,
    usage: 68,
    scoring: 73,
    playmaking: 81,
    defense: 64,
    rebounding: 66
  })
];

const balancedTargetRoster = [
  makePlayer(1867, 'C', {
    overall: 74,
    usage: 67,
    scoring: 66,
    playmaking: 59,
    defense: 59,
    rebounding: 67
  }),
  makePlayer(1868, 'PG', {
    overall: 69,
    usage: 66,
    scoring: 66,
    playmaking: 59,
    defense: 58,
    rebounding: 64
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

const bigHeavyRoster = [bigProfile, comboBig];
const guardHeavyRoster = [
  guardProfile,
  makePlayer(7000, 'SG', {
    overall: 81,
    usage: 74,
    scoring: 83,
    playmaking: 89,
    defense: 63,
    rebounding: 44
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

const comboAssignedA = cpuSimPersonalities.buildCpuSimPersonalitiesByTeam({
  teamCount: 2,
  myPos: 0,
  rosters: [starHeavyRoster, [comboBig, bigProfile]]
});
const comboAssignedB = cpuSimPersonalities.buildCpuSimPersonalitiesByTeam({
  teamCount: 2,
  myPos: 0,
  rosters: [starHeavyRoster, [bigProfile, comboBig]]
});

assert.deepStrictEqual(
  comboAssignedA,
  comboAssignedB,
  'expected roster order not to change deterministic assignment'
);
assert.equal(
  comboAssignedA[1],
  'bigs_bias',
  'expected a combo frontcourt roster to resolve to the bigs bias'
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
