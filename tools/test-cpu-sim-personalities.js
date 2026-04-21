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

const steadyRoster = [
  makePlayer(3, 'SG', {
    overall: 79,
    usage: 72,
    scoring: 78,
    playmaking: 70,
    defense: 77,
    rebounding: 56
  }),
  makePlayer(4, 'PF', {
    overall: 80,
    usage: 68,
    scoring: 75,
    playmaking: 61,
    defense: 81,
    rebounding: 79
  })
];

const big = makePlayer(10, 'C', {
  overall: 81,
  usage: 70,
  scoring: 74,
  playmaking: 45,
  defense: 84,
  rebounding: 90
});

const guard = makePlayer(11, 'PG', {
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

const neutralWing = makePlayer(13, 'SF', {
  overall: 77,
  usage: 64,
  scoring: 76,
  playmaking: 63,
  defense: 74,
  rebounding: 58
});

const assignedA = cpuSimPersonalities.buildCpuSimPersonalitiesByTeam({
  teamCount: 6,
  myPos: 0,
  rosters: [starHeavyRoster, starHeavyRoster, steadyRoster, steadyRoster, steadyRoster, steadyRoster]
});
const assignedB = cpuSimPersonalities.buildCpuSimPersonalitiesByTeam({
  teamCount: 6,
  myPos: 0,
  rosters: [starHeavyRoster, starHeavyRoster, steadyRoster, steadyRoster, steadyRoster, steadyRoster]
});

assert.deepStrictEqual(
  assignedA,
  assignedB,
  'expected deterministic assignment for the same league state'
);
assert.equal(
  assignedA[1],
  'star_loyalist',
  'expected a star-heavy CPU roster to bias toward star_loyalist'
);
assert.equal(
  cpuSimPersonalities.getCpuSimTeamPersonality(3, null),
  'balanced',
  'expected missing personality state to fall back to balanced'
);

assert.ok(
  cpuSimPersonalities.getCpuSimPersonalityBias(big, 'bigs_bias') >
    cpuSimPersonalities.getCpuSimPersonalityBias(guard, 'bigs_bias'),
  'expected bigs_bias to favor frontcourt profiles'
);
assert.ok(
  cpuSimPersonalities.getCpuSimPersonalityBias(guard, 'guards_bias') >
    cpuSimPersonalities.getCpuSimPersonalityBias(big, 'guards_bias'),
  'expected guards_bias to favor guard/creator profiles'
);
assert.ok(
  cpuSimPersonalities.getCpuSimPersonalityBias(comboBig, 'bigs_bias') >
    cpuSimPersonalities.getCpuSimPersonalityBias(guard, 'bigs_bias'),
  'expected F/C combo bigs to benefit from big/frontcourt bias'
);

const comboAssignedA = cpuSimPersonalities.buildCpuSimPersonalitiesByTeam({
  teamCount: 2,
  myPos: 0,
  rosters: [starHeavyRoster, [comboBig, neutralWing]]
});
const comboAssignedB = cpuSimPersonalities.buildCpuSimPersonalitiesByTeam({
  teamCount: 2,
  myPos: 0,
  rosters: [starHeavyRoster, [neutralWing, comboBig]]
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
