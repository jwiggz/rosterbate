const assert = require('node:assert/strict');

const {
  buildSimulationPlayIn,
  resolveSimulationPlayIn,
  buildSimulationPlayoffBracket,
  advanceSimulationSeries,
  finalizeSimulationChampion
} = require('../simulation-league-engine.js');

const standings = Array.from({ length: 15 }, (_, index) => ({
  seed: index + 1,
  teamAbbr: `E${index + 1}`,
  conference: 'East',
  w: 60 - index,
  l: 22 + index
}));

const playIn = buildSimulationPlayIn(standings);
assert.deepStrictEqual(playIn.sevenEight.map((entry) => entry.teamAbbr), ['E7', 'E8']);
assert.deepStrictEqual(playIn.nineTen.map((entry) => entry.teamAbbr), ['E9', 'E10']);

const seededField = resolveSimulationPlayIn(playIn, {
  sevenEightWinner: 'E7',
  nineTenWinner: 'E9',
  finalWinner: 'E8'
});
assert.deepStrictEqual(
  seededField.map((entry) => entry.teamAbbr),
  ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8']
);

const bracket = buildSimulationPlayoffBracket({
  east: seededField,
  west: seededField.map((entry) => ({
    ...entry,
    teamAbbr: entry.teamAbbr.replace('E', 'W'),
    conference: 'West'
  }))
});
assert.equal(bracket.east.firstRound.length, 4);
assert.equal(bracket.west.firstRound.length, 4);

const advancedSeries = advanceSimulationSeries(bracket.east.firstRound[0], {
  winner: bracket.east.firstRound[0].higherSeed.teamAbbr,
  games: 5
});
assert.equal(advancedSeries.winnerTeamAbbr, 'E1');
assert.equal(advancedSeries.games, 5);

const champion = finalizeSimulationChampion({
  finals: {
    higherSeed: { teamAbbr: 'E1', seed: 1 },
    lowerSeed: { teamAbbr: 'W1', seed: 1 },
    winnerTeamAbbr: 'E1',
    games: 6
  }
});
assert.deepStrictEqual(champion, {
  championTeamAbbr: 'E1',
  runnerUpTeamAbbr: 'W1',
  finalsGames: 6
});

console.log('simulation postseason test passed');
