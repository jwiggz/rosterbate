const assert = require('node:assert/strict');

const {
  getSimulationShell,
  findSimulationTeamByAbbr
} = require('../simulation-mode-config.js');

assert.equal(typeof getSimulationShell, 'function');
assert.equal(typeof findSimulationTeamByAbbr, 'function');

const shell = getSimulationShell();

assert.equal(shell.anchorSeasonId, 'nba_2025_26');
assert.equal(shell.anchorSeasonLabel, '2025-26 NBA');
assert.equal(shell.teams.length, 30);
assert.equal(shell.regularSeasonGamesPerTeam, 82);
assert.deepStrictEqual(shell.playInSeeds, [7, 8, 9, 10]);
assert.equal(shell.finalsStartDate, '2026-06-03');

const lakers = findSimulationTeamByAbbr('LAL');
const magic = findSimulationTeamByAbbr('ORL');

assert.deepStrictEqual(
  { conference: lakers.conference, division: lakers.division },
  { conference: 'West', division: 'Pacific' }
);
assert.deepStrictEqual(
  { conference: magic.conference, division: magic.division },
  { conference: 'East', division: 'Southeast' }
);

shell.teams[0].conference = 'Mutated';
shell.playInSeeds.push(11);

const freshShell = getSimulationShell();

assert.deepStrictEqual(
  {
    conference: freshShell.teams[0].conference,
    playInSeeds: freshShell.playInSeeds
  },
  {
    conference: 'East',
    playInSeeds: [7, 8, 9, 10]
  }
);
assert.equal(findSimulationTeamByAbbr('ZZZ'), null);

console.log('simulation mode config test passed');
